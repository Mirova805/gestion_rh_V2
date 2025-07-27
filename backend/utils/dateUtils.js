const moment = require('moment');
const employeeModel = require('../models/employeeModel');
const configModel = require('../models/configModel');
const pointageModel = require('../models/pointageModel');
const congeModel = require('../models/congeModel');

const calculateTimeDifference = (startTime, endTime) => {
  const start = moment(startTime, 'HH:mm:ss');
  const end = moment(endTime, 'HH:mm:ss');

  if (end.isBefore(start)) {
    return null;
  }

  const duration = moment.duration(end.diff(start));
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const unifiedEmployeeFunction = async (params) => {
  const { mode, date, startDate, endDate, employeeNumEmp, req, res, next } = params;
  
  try {    
    const getExpectedWorkingDay = async (employee, targetDate) => {
      const formattedDate = targetDate.format('YYYY-MM-DD');
      const configs = await configModel.getConfigsForEmployeeAndDate(employee.NumEmp, formattedDate);
      const specificConfig = configs[0];

      if (specificConfig) {
        return true;
      } else {
        const employeeWorkingDays = {
          'Monday': employee.TravailLundi,
          'Tuesday': employee.TravailMardi,
          'Wednesday': employee.TravailMercredi,
          'Thursday': employee.TravailJeudi,
          'Friday': employee.TravailVendredi,
          'Saturday': employee.TravailSamedi,
          'Sunday': employee.TravailDimanche,
        };
        const englishDayOfWeek = targetDate.format('dddd');
        return employeeWorkingDays[englishDayOfWeek];
      }
    };

    if (mode === 'isExpectedWorkingDay') {
      const targetDate = moment(date).startOf('day');
      const employee = await employeeModel.getEmployeeById(employeeNumEmp);
      
      if (!employee) {
        throw new Error('L\'employé prévu est introuvable.');
      }

      if (targetDate.isSameOrBefore(moment(employee.DateEmbauche).startOf('day'))) {
        throw new Error('Aucun pointage n\'est prévu pour aujourd\'hui.');
      }

      return await getExpectedWorkingDay(employee, targetDate);
    }

    else if (mode === 'getAbsentEmployees') {
      const targetDate = moment(date).startOf('day');
      const allEmployees = await employeeModel.getAllEmployees();
      const absentEmployees = [];

      for (const employee of allEmployees) {
        if (targetDate.isSameOrBefore(moment(employee.DateEmbauche).startOf('day'))) {
          continue;
        }

        const isExpectedWorkingDay = await getExpectedWorkingDay(employee, targetDate);
        const formattedDate = targetDate.format('YYYY-MM-DD');
        const pointagesToday = await pointageModel.getAllPointagesOfEmployee(employee.NumEmp, formattedDate);
        const hasPunchedIn = pointagesToday.length > 0;
        const isOnLeave = await congeModel.getActiveCongeForEmployee(employee.NumEmp, formattedDate);

        if (isExpectedWorkingDay && !hasPunchedIn && !isOnLeave) {
          absentEmployees.push(employee);
        }
      }

      return absentEmployees;
    }

    else if (mode === 'calculateWorkingDays') {
      let count = 0;
      let currentDate = moment(startDate);
      const end = moment(endDate);

      const employee = await employeeModel.getEmployeeById(employeeNumEmp);
      if (!employee) {
        throw new Error('L\'employé prévu est introuvable.');
      }

      const hiringDate = moment(employee.DateEmbauche).startOf('day');

      while (currentDate.isSameOrBefore(end, 'day')) {
        if (currentDate.isSameOrBefore(hiringDate)) {
          currentDate.add(1, 'day');
          continue;
        }

        const isOnLeave = await congeModel.getActiveCongeForEmployee(employeeNumEmp, currentDate);
        if (isOnLeave) {
          currentDate.add(1, 'day');
          continue;
        }

        const isExpectedWorkingDay = await getExpectedWorkingDay(employee, currentDate);
        if (isExpectedWorkingDay) {
          count++;
        }
        currentDate.add(1, 'day');
      }
      return count - 1;
    }

    else if (mode === 'getEmployeeProfileForNotification') {
      const { numEmp } = req.params;
      const daysRange = 60;

      const employee = await employeeModel.getEmployeeById(numEmp);
      if (!employee) {
        return res.status(404).json({ message: 'Le profil de l\'employé prévu est introuvable.' });
      }

      const endDate = moment();
      const startDate = moment.max(moment(employee.DateEmbauche), moment().subtract(daysRange, 'days'));

      const pointages = await pointageModel.getPointagesByEmployeeAndDateRange(
        numEmp,
        startDate.format('YYYY-MM-DD HH:mm:ss'),
        endDate.format('YYYY-MM-DD HH:mm:ss')
      );

      let totalAbsences = 0;
      let totalRetards = 0;
      const absencesList = [];
      const retardsList = [];

      const workingDaysInPeriod = [];
      let currentDay = moment(startDate);

      while (currentDay.isBefore(endDate, 'day')) {
        const isExpectedWorkingDay = await getExpectedWorkingDay(employee, currentDay);
        if (isExpectedWorkingDay && currentDay.isAfter(moment(employee.DateEmbauche), 'day')) {
          workingDaysInPeriod.push(currentDay.format('YYYY-MM-DD'));
        }
        currentDay.add(1, 'day');
      }

      const daysWithPunchIn = new Set(
        pointages
          .filter(p => p.PointageInfo === 'Pointage au travail')
          .map(p => moment(p.DateHeurePointage).format('YYYY-MM-DD'))
      );

      for (const day of workingDaysInPeriod) {
        const isOnLeave = await congeModel.getActiveCongeForEmployee(numEmp, day);
        if (!daysWithPunchIn.has(day) && !isOnLeave) {
          totalAbsences++;
          absencesList.push(day);
        }
      }

      const dailyDelays = {};
      pointages.forEach(p => {
        if (p.PointageInfo === 'Pointage au travail' && p.HeureRetard) {
          const [h, m, s] = p.HeureRetard.split(':').map(Number);
          const totalMinutes = h * 60 + m;
          if (totalMinutes > 60) {
            const date = moment(p.DateHeurePointage).format('YYYY-MM-DD');
            dailyDelays[date] = (dailyDelays[date] || 0) + 1;
          }
        }
      });

      for (const date in dailyDelays) {
        if (dailyDelays[date] >= 3) {
          totalRetards++;
          retardsList.push(date);
        }
      }

      return res.status(200).json({
        PhotoID: employee.PhotoID,
        DateEmbauche: employee.DateEmbauche,
        NumEmp: employee.NumEmp,
        Nom: employee.Nom,
        Prénom: employee.Prénom,
        Poste: employee.Poste,
        totalAbsences,
        totalRetards,
        absencesList,
        retardsList
      });
    }

    else if (mode === 'calculateMonthlySalary') {
      const { numEmp, month, year } = params;
      
      const employee = await employeeModel.getEmployeeById(numEmp);
      if (!employee) {
        throw new Error('L\'employé prévu est introuvable.');
      }

      let netSalary = employee.SalaireMensuel;
      let deductions = [];

      const startOfMonth = moment({ year, month: month - 1, day: 1 }).startOf('day');
      const endOfMonth = moment({ year, month: month - 1, day: 1 }).endOf('month').endOf('day');

      const employeePointages = await pointageModel.getPointagesByEmployeeAndDateRange(
        numEmp, 
        startOfMonth.format('YYYY-MM-DD HH:mm:ss'), 
        endOfMonth.format('YYYY-MM-DD HH:mm:ss')
      );

      let absencesCount = 0;
      const workingDaysInMonth = [];

      let currentDay = moment(startOfMonth);
      const hiringDate = moment(employee.DateEmbauche).startOf('day');
      const today = moment().startOf('day');

      while (currentDay.isSameOrBefore(endOfMonth, 'day')) {
        if (currentDay.isSameOrBefore(hiringDate)) {
          currentDay.add(1, 'day');
          continue;
        }

        if (currentDay.isSameOrAfter(today)) {
          currentDay.add(1, 'day');
          continue;
        }
        
        const formattedDate = currentDay.format('YYYY-MM-DD');
        const isOnLeave = await congeModel.getActiveCongeForEmployee(numEmp, formattedDate);
        if (isOnLeave) {
          currentDay.add(1, 'day');
          continue;
        }

        const isExpectedWorkingDay = await getExpectedWorkingDay(employee, currentDay);
        if (isExpectedWorkingDay) {
          workingDaysInMonth.push(formattedDate);
        }
        currentDay.add(1, 'day');
      }

      const daysWithPunchIn = new Set(
        employeePointages
          .filter(p => {
            const pointageMoment = moment(p.DateHeurePointage);
            
            if (pointageMoment.isSame(today, 'day')) return false;
            if (pointageMoment.isAfter(today)) return false;
            
            return p.PointageInfo === 'Pointage au travail';
          })
          .map(p => moment(p.DateHeurePointage).format('YYYY-MM-DD'))
      );

      for (const day of workingDaysInMonth) {
        if (!daysWithPunchIn.has(day)) {
          absencesCount++;
        }
      }

      let delaysOver1HourCount = 0;
      let totalDelayPenalty = 0; 

      employeePointages.forEach(p => {
        if (p.PointageInfo === 'Pointage au travail' && p.HeureRetard) {
          const [h, m] = p.HeureRetard.split(':').map(Number);
          const totalMinutes = h * 60 + m;
          
          if (totalMinutes > 60) {
            delaysOver1HourCount++;
            const hoursDelayed = Math.floor(totalMinutes / 60);
            const penalty = 3000 + (hoursDelayed - 1) * 1500;
            totalDelayPenalty += penalty;
          }}});

      let totalDeductionsAmount = 0;

      if (absencesCount > 0) {
        const deductionAmount = absencesCount * 10000;
        netSalary -= deductionAmount;
        totalDeductionsAmount += deductionAmount;
        deductions.push({ 
          type: 'Absences', 
          count: absencesCount, 
          amount: deductionAmount
        });
      }

      if (delaysOver1HourCount > 0) {
        netSalary -= totalDelayPenalty;
        totalDeductionsAmount += totalDelayPenalty;
        deductions.push({ 
            type: 'Retards', 
            count: delaysOver1HourCount, 
            amount: totalDelayPenalty,
            penalty: '3000 + 1500 par heure supplémentaire'
        });
      }

      const employeeWorkingHours = {
        start: moment(employee.HeureDebutTravail, 'HH:mm:ss'),
        end: moment(employee.HeureFintravail, 'HH:mm:ss')
      };

      let sortiePenaltyCount = 0;
      const datesWithSortie = new Set();

      employeePointages.forEach((p, index, arr) => {
        const pointageDate = moment(p.DateHeurePointage).format('YYYY-MM-DD');
        if (p.PointageInfo === 'Sorti' && !datesWithSortie.has(pointageDate)) {
          const nextPointage = arr.slice(index + 1).find(np => 
            moment(np.DateHeurePointage).format('YYYY-MM-DD') === pointageDate
          );

          if (!nextPointage || 
              (nextPointage.PointageInfo !== 'Retour de pause' && 
              nextPointage.PointageInfo !== 'Fin de la journée')) {
            const sortieTime = moment(p.DateHeurePointage);
            const diffHours = sortieTime.diff(employeeWorkingHours.end, 'hours');
            if (diffHours > 3) {
              sortiePenaltyCount++;
              datesWithSortie.add(pointageDate);
            }
          }
        }
      });

      if (sortiePenaltyCount > 0) {
        const deductionAmount = sortiePenaltyCount * 7000;
        netSalary -= deductionAmount;
        totalDeductionsAmount += deductionAmount;
        deductions.push({ 
          type: 'Sortie non justifiée', 
          count: sortiePenaltyCount, 
          amount: deductionAmount
        });
      }

      return {
        employee,
        month,
        year,
        baseSalary: employee.SalaireMensuel,
        netSalary,
        totalDeductionsAmount,
        deductions,
        absencesCount,
        delaysOver1HourCount,
        sortiePenaltyCount,
      };
    } else {
      throw new Error('Action \'utils\' non reconnu');
    }
  } catch (error) {
    if (mode === 'getEmployeeProfileForNotification') {
      next(error);
    } else {
      console.error(`Une erreur est survenue: ${error}`);
      throw error;
    }
  }
};

module.exports = { calculateTimeDifference, unifiedEmployeeFunction };