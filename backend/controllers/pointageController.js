const pool = require('../config/db.js');
const moment = require('moment');
const pointageModel = require('../models/pointageModel.js');
const employeeModel = require('../models/employeeModel.js');
const congeModel = require('../models/congeModel.js');
const configModel = require('../models/configModel.js');
const { calculateTimeDifference, unifiedEmployeeFunction } = require('../utils/dateUtils.js');

const getAllPointages = async (req, res, next) => {
  try {
    let pointages;
    if (req.user.role === 'user') {
      pointages = await pointageModel.getPointagesByEmployee(req.user.numEmp);
    } else {
      pointages = await pointageModel.getAllPointages();
    }
    res.status(200).json(pointages);
  } catch (error) {
    next(error);
  }
};

const getPointageById = async (req, res, next) => {
  try {
    const pointage = await pointageModel.getPointageById(req.params.id);
    if (!pointage) {
      return res.status(404).json({ message: 'Le pointage prévu est introuvable ou inexistant.' });
    }
    res.status(200).json(pointage);
  } catch (error) {
    next(error);
  }
};

const getLastPointageForEmployee = async (req, res, next) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const pointage = await pointageModel.getLastPointageForEmployeeToday(req.params.numEmp, today);
    
    res.status(200).json(pointage);
  } catch (error) {
    next(error); 
  } 
};

const validatePointage = async (numEmp, pointageInfo, user, isUpdate = false, existingPointage = null) => {
  if (!numEmp || !pointageInfo) {
    return { isValid: false, message: 'Veuillez remplir tous les champs obligatoires.' };
  }

  const employee = await employeeModel.getEmployeeById(numEmp);
  if (!employee) {
    return { isValid: false, message: "Le numéro d'employé à ajouter dans le pointage est introuvable ou inexistant." };
  }

  if (user.role === 'user' && user.numEmp !== parseInt(numEmp)) {
    return { isValid: false, message: 'Vous ne pouvez pointer que pour vous-même.' };
  }

  const isExpectedWorkingDay = await unifiedEmployeeFunction({
    mode: 'isExpectedWorkingDay',
    date: moment().format('YYYY-MM-DD'), 
    employeeNumEmp: numEmp,
  });

  if (!isExpectedWorkingDay) {
    return { isValid: false, message: "Aucun pointage n'est prévu pour aujourd'hui." };
  }

  const today = moment().format('YYYY-MM-DD');
  const haveConge = await congeModel.getActiveCongeForEmployee(numEmp, today);
  if (haveConge) {
    const message = user.role === 'user' ? 'Vous êtes' : 'Cet employé est';
    return { isValid: false, message: `${message} actuellement en congé et n'a pas besoin de pointer.` };
  }

  let dayPointages = await pointageModel.getAllPointagesOfEmployee(numEmp, today);
  
  if (isUpdate && existingPointage) {
    dayPointages = dayPointages.filter(p => p.PointageID !== existingPointage.PointageID);
  }

  const lastPointage = dayPointages.length > 0 ? dayPointages[dayPointages.length - 1] : null;
  const lastPointageInfo = lastPointage ? lastPointage.PointageInfo : null;

  const allowedTransitions = {
    'Pointage au travail': [null],
    'Sorti': ['Pointage au travail', 'Retour de pause'],
    'Retour de pause': ['Sorti'],
    'Fin de la journée': ['Pointage au travail', 'Retour de pause'],
  };

  const validActions = Object.keys(allowedTransitions);
  const normalizedLastPointage = lastPointageInfo ?? null;

  const isInvalidWorkflow =
    !validActions.includes(pointageInfo) ||
    !allowedTransitions[pointageInfo].includes(normalizedLastPointage);

  if (isInvalidWorkflow) {
    const lastPointageDisplay = lastPointageInfo || 'Aucun';
    let message;

    if (!lastPointageInfo) {
      message = 'Pointer d\'abord l\'arrivée au travail.';
    } else if (lastPointageInfo === 'Fin de la journée') {
      message = '"Fin de la journée" était le dernier pointage. Aucun ajout n\'est plus disponible pour aujourd\'hui.';
    } else {
      message = `Sélectionner une action valide. Le dernier pointage ajouté est: ${lastPointageDisplay}.`;
    }

    return { valid: false, message };
  }

  return { 
    isValid: true,
    today,
    employee,
    dayPointages,
    lastPointage
  };
};

const addPointage = async (req, res, next) => {
  const { numEmp, pointageInfo } = req.body;

  const validation = await validatePointage(numEmp, pointageInfo, req.user);
  if (!validation.isValid) {
    return res.status(400).json({ message: validation.message });
  }

  const { today, employee } = validation;
  const dateHeurePointage = moment().format('YYYY-MM-DD HH:mm:ss');
  let heureRetard = null;
  let heureDebutTravail = null;

  const config = await configModel.getConfigsForEmployeeAndDate(numEmp, today);
  if (config.length > 0) {
    heureDebutTravail = config[0].HeureDebut;
  } else {
    heureDebutTravail = employee.HeureDebutTravail;
  } 

  if (pointageInfo === 'Pointage au travail' && moment(employee.DateEmbauche) !== today) {
    const currentPointageTime = moment(dateHeurePointage).format('HH:mm:ss');
    heureRetard = calculateTimeDifference(heureDebutTravail, currentPointageTime);
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const pointageId = await pointageModel.createPointage(numEmp, dateHeurePointage, heureRetard, pointageInfo, connection);

    await connection.commit();

    res.status(201).json({ message: 'Le pointage a été enregistré avec succès.', numPointage: pointageId });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const deletePointage = async (req, res, next) => { 
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const affectedRows = await pointageModel.deletePointage(req.params.id, connection);
    if (affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Le pointage à supprimer est introuvable.' });
    }

    await connection.commit();

    res.status(200).json({ message: 'Le pointage a été supprimé avec succès.' });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

module.exports = { getAllPointages, getPointageById, getLastPointageForEmployee, addPointage, deletePointage };