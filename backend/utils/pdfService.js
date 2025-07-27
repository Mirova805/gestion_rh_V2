const moment = require('moment');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { unifiedEmployeeFunction } = require('../utils/dateUtils.js');
const numeral = require('numeral');
require('numeral/locales/fr');
numeral.locale('fr');

const numberToLetter = (number) => {
  if (number === 0) return 'zéro';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  let result = '';

  const chunks = {
    'million': 1000000,
    'mille': 1000,
    '': 1
  };

  for (const [word, divisor] of Object.entries(chunks)) {
    if (number >= divisor) {
      const part = Math.floor(number / divisor);
      number %= divisor;

      if (part > 0) {
        if (divisor === 1000 && part === 1) {
          result += 'mille ';
          continue;
        }

        const hundreds = Math.floor(part / 100);
        const remainder = part % 100;

        if (hundreds > 0) {
          result += (hundreds > 1 ? units[hundreds] + ' ' : '') + 'cent';
          if (hundreds > 1 && remainder === 0) {
            result += 's';
          }
          result += ' ';
        }

        if (remainder > 0) {
          if (remainder < 10) {
            result += units[remainder] + ' ';
          } else if (remainder < 20) {
            result += teens[remainder - 10] + ' ';
          } else {
            const ten = Math.floor(remainder / 10);
            const unit = remainder % 10;

            result += tens[ten];

            if (unit === 1 && ten !== 8) {
              result += '-et-' + units[unit];
            } else if (unit > 0) {
              result += '-' + units[unit];
            }
            result += ' ';
          }
        }

        if (word !== '') {
          result += word;
          if (part > 1 && word === 'million') result += 's';
          result += ' ';
        }
      }
    }
  }

  result = result.trim().replace(/\s+/g, ' ');
  result = result.replace('vingt-un', 'vingt-et-un').replace('soixante-onze', 'soixante-et-onze').replace('quatre-vingt-un', 'quatre-vingt-et-un')
  .replace('quatre-vingt-onze', 'quatre-vingt-onze');

  return result;
};

const calculateMonthlySalary = async (numEmp, month, year) => {
  try {
    const result = await unifiedEmployeeFunction({
      mode: 'calculateMonthlySalary',
      numEmp: numEmp,
      month: month,
      year: year
    });

    return result;
  } catch (error) {
    throw new Error (error); 
  } 
};

const monthInFrench = (m) => {
  const FRENCH_MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return FRENCH_MONTHS[m - 1];
}

const generatePayslipPDF = async (salaryDetails) => {
  const doc = new PDFDocument();
  const filePath = `./payslips/ficheDePaie_Employé${salaryDetails.employee.NumEmp}_${monthInFrench(moment().month(salaryDetails.month - 1).format('M'))}${salaryDetails.year}.pdf`;
  
  if (!fs.existsSync('./payslips')) {
    fs.mkdirSync('./payslips');
  }

  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(25).text('Fiche de paie', { align: 'center' });
  doc.fontSize(12).text(`Mois: ${monthInFrench(moment().month(salaryDetails.month - 1).format('M'))} ${salaryDetails.year}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(15).text('Informations sur l\'employé:', { underline: true });
  doc.fontSize(12)
    .text(`Nom: ${salaryDetails.employee.Nom} ${salaryDetails.employee.Prénom}`)
    .text(`Poste: ${salaryDetails.employee.Poste}`)
    .text(`Numéro Employé: ${salaryDetails.employee.NumEmp}`)
    .moveDown();

  doc.fontSize(15).text('Performances:', { underline: true });
  doc.fontSize(12)
    .text(`Absences: ${salaryDetails.absencesCount} jour(s)`)
    .text(`Retards notifiables: ${salaryDetails.delaysOver1HourCount}`)
    .text(`Sorties non justifiées: ${salaryDetails.sortiePenaltyCount} fois`)
    .moveDown();

  doc.fontSize(15).text('Salaire:', { underline: true });
  doc.fontSize(12)
    .text(`Salaire de base: ${numeral(salaryDetails.baseSalary).format('0,0')} Ar`)
    .text(`Déduction: ${numeral(salaryDetails.totalDeductionsAmount).format('0,0')} Ar`)
    .text(`Salaire net: ${numeral(salaryDetails.netSalary).format('0,0')} Ar (${numberToLetter(salaryDetails.netSalary)} Ariary)`)
    .moveDown();

  doc.end();
  return filePath;
};

module.exports = { calculateMonthlySalary, generatePayslipPDF };