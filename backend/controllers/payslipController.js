const path = require('path');
const moment = require('moment');
const employeeModel = require('../models/employeeModel.js');
const { calculateMonthlySalary, generatePayslipPDF } = require('../utils/pdfService.js');

const calculateAndGeneratePayslip = async (req, res, next) => { 
  const { numEmp, month, year } = req.body;

  if (!numEmp || !month || !year) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
  }

  try {
    const employee = employeeModel.getEmployeeById(numEmp);
    if (!employee) {
      return res.status(404).json({ message: 'L\'employé prévu est introuvable.' });
    }
    if (moment(employee.dateEmbauche).format('YYYY-MM') > moment(`${year}-${month}`).format('YYYY-MM')) {
      return res.status(400).json({ message: 'L\'employé n\'a pas encore été embauché à cette date.' });
    }

    const salaryDetails = await calculateMonthlySalary(numEmp, month, year);
    const filePath = await generatePayslipPDF(salaryDetails);

    res.status(200).json({
      message: 'Le fiche de paie a été généré avec succès.',
      filePath: path.basename(filePath),
    });
  } catch (error) {
    next(error); 
  }
};

module.exports = { calculateAndGeneratePayslip };