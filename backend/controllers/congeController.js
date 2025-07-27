const pool = require('../config/db.js');
const moment = require('moment');
const congeModel = require('../models/congeModel.js');
const employeeModel = require('../models/employeeModel.js');
const notificationModel = require('../models/notificationModel.js');
const { sendEmail } = require('../utils/emailService.js');
const { unifiedEmployeeFunction } = require('../utils/dateUtils.js');

const validateCongeInputs = async (numEmp, motif, debutConge, dateRetour) => {
  const today = moment().format('YYYY-MM-DD');
  if (!numEmp || !motif || !debutConge || !dateRetour) {
    return { isValid: false, message: 'Veuillez remplir tous les champs obligatoires.' };
  }

  if (new Date(debutConge) >= new Date(dateRetour)) {
    return { isValid: false, message: 'Veuillez sélectionner une période valide.' };
  }

  if (moment(debutConge).isSameOrBefore(today)) {
    return { isValid: false, message: 'La date de début de congé ne doit strictement précéder aujourd\'hui.' };
  }

  const employee = await employeeModel.getEmployeeById(numEmp);
  if (!employee) {
    return { isValid: false, message: "Le numéro d'employé prévu est introuvable ou inexistant." };
  }

  const nbrjr = parseInt(await unifiedEmployeeFunction({
    mode: 'calculateWorkingDays',
    startDate: debutConge,
    endDate: dateRetour,
    employeeNumEmp: numEmp
  }));

  if (nbrjr <= 0) {
    return { isValid: false, message: 'La période de congé ne contient aucun jour ouvrable.' };
  }

  const currentYear = moment().year();
  const totalCongesThisYear = parseInt(await congeModel.getTotalCongesTaken(numEmp, currentYear));
  if (totalCongesThisYear + nbrjr > 30) {
    return { 
      isValid: false, 
      message: `La limite de 30 jour(s) de congés pour l'année en cours est insuffisant pour cette demande. Jour(s) restants: ${30 - totalCongesThisYear}.`
    };
  }

  const existingConges = await congeModel.getEmployeeConges(numEmp);
  const isAlreadyOnLeave = existingConges.some(conge => {
    const existingDebut = moment(conge.DebutConge);
    const existingRetour = moment(conge.DateRetour);
    const newDebut = moment(debutConge);
    const newRetour = moment(dateRetour);

    const isValidCongeInfo = conge.CongeInfo === 'Validé' || conge.CongeInfo === 'En Cours' || conge.CongeInfo === 'Terminé';

    return (
      newDebut.isBefore(existingRetour) && newRetour.isAfter(existingDebut) && isValidCongeInfo
    );
  });

  if (isAlreadyOnLeave) {
    return { isValid: false, message: 'Cet employé a déjà un congé validé qui chevauche cette période.' };
  }

  return { isValid: true, nbrjr };
};

const processCongeNotifications = async (employee, conge, actionType, connection, user = null) => {
  let emailSent = false;
  
  if (employee && employee.Email) {
    const subject = actionType === 'status' 
      ? `Votre demande de congé a été ${conge.CongeInfo}`
      : actionType === 'update'
      ? 'Mise à jour de votre demande de congé'
      : 'Nouvelle demande de congé';
    
    const text = actionType === 'status'
      ? `Bonjour ${employee.Nom} ${employee.Prénom}, Nous vous informons que votre demande de congé, prévue du ${moment(conge.DebutConge).format('DD/MM/YYYY')} au ${moment(conge.DateRetour).format('DD/MM/YYYY')}, a été ${conge.CongeInfo}. Cordialement, L'équipe RH`
      : `L'employé ${employee.Nom} ${employee.Prénom} a ${actionType === 'update' ? 'mis à jour sa' : 'demandé un'} congé de ${conge.Nbrjr} jour(s) du ${moment(conge.DebutConge).format('DD/MM/YYYY')} au ${moment(conge.DateRetour).format('DD/MM/YYYY')}. Motif: ${conge.Motif} - ID Congé: ${conge.NumConge}`;
    
    const html = actionType === 'status'
      ? `<p>Bonjour ${employee.Nom} ${employee.Prénom},</p><p>Nous vous informons que votre demande de congé, prévue du <b>${moment(conge.DebutConge).format('DD/MM/YYYY')}</b> au <b>${moment(conge.DateRetour).format('DD/MM/YYYY')}</b> a été <b>${conge.CongeInfo}</b>.</p><p>Cordialement,<br/>L'équipe RH</p>`
      : `<p>L'employé ${employee.Nom} ${employee.Prénom} a ${actionType === 'update' ? 'mis à jour sa' : 'demandé un'} congé de ${conge.Nbrjr} jour(s) du <b>${moment(conge.DebutConge).format('DD/MM/YYYY')}</b> au <b>${moment(conge.DateRetour).format('DD/MM/YYYY')}</b>. Motif: ${conge.Motif} - ID Congé: ${conge.NumConge}</p>`;
    
    emailSent = await sendEmail(employee.Email, subject, text, html);
  }

  const notificationType = actionType === 'status' ? 'Statut Congé' : 'Demande de Congé';
  
  let notificationText;
  if (actionType === 'status') {
    notificationText = `${employee.Nom} ${employee.Prénom}, Nous vous informons que votre demande de congé, prévue du ${moment(conge.DebutConge).format('DD/MM/YYYY')} au ${moment(conge.DateRetour).format('DD/MM/YYYY')}, a été ${conge.CongeInfo}.`;
  } else {
    notificationText = `${employee.Nom} ${employee.Prénom} a ${actionType === 'update' ? 'mis à jour sa congé à' : 'demandé un congé de'} ${conge.Nbrjr} jour(s): du ${moment(conge.DebutConge).format('DD/MM/YYYY')} au ${moment(conge.DateRetour).format('DD/MM/YYYY')}. Motif: ${conge.Motif} - ID Congé: ${conge.NumConge}`;
  }

  if (actionType === 'update') {
    const existingNotification = await notificationModel.getNotificationByCongeId(conge.NumConge, connection);
    
    if (existingNotification) {
      await notificationModel.updateCongeNotification(
        existingNotification.NotifID,
        employee.NumEmp,
        'Demande de congé (Mise à jour)',
        notificationText.replace(/\n/g, ' '),
        user?.NomUtil || null,
        user?.TitreUtil || null,
        connection
      );
    } else {
      await notificationModel.createNotification(
        employee.NumEmp,
        'Demande de congé (Mise à jour)',
        notificationText.replace(/\n/g, ' '),
        notificationType,
        connection
      );
    }
  } else {
    await notificationModel.createNotification(
      employee.NumEmp,
      actionType === 'status' ? `Votre demande de congé a été ${conge.CongeInfo}` : 'Nouvelle demande de congé',
      notificationText.replace(/\n/g, ' '),
      notificationType,
      connection
    );
  }

  return emailSent;
};

const getAllConges = async (req, res, next) => {
  try {
    let conges;
    if (req.user.role === 'user') {
      conges = await congeModel.getEmployeeConges(req.user.numEmp);
    } else {
      conges = await congeModel.getAllConges();
    }

    const updatedConges = await Promise.all(conges.map(async (conge) => {
      let currentCongeInfo = conge.CongeInfo;
      const today = moment().startOf('day');
      const debut = moment(conge.DebutConge).startOf('day');
      const retour = moment(conge.DateRetour).startOf('day');

      if (currentCongeInfo === 'Validé') {
        if (today.isBetween(debut, retour, null, '[]')) {
          currentCongeInfo = 'En Cours';
        } else if (today.isAfter(retour)) {
          currentCongeInfo = 'Terminé';
        }
        if (currentCongeInfo !== conge.CongeInfo) {
          await congeModel.updateConge(conge.NumConge, conge.Motif, conge.Nbrjr, conge.DebutConge, conge.DateRetour, currentCongeInfo);
        }
      }
      return { ...conge, CongeInfo: currentCongeInfo };
    }));

    res.status(200).json(updatedConges);
  } catch (error) {
    next(error);
  }
};

const getCongeById = async (req, res, next) => {
  try {
    const conge = await congeModel.getCongeById(req.params.id);
    if (!conge) {
      return res.status(404).json({ message: 'Le congé prévu est introuvable.' });
    }
    const formattedConge = {
      ...conge,
      DebutConge: moment(conge.DebutConge),
      DateRetour: moment(conge.DateRetour),
      DateDemande: moment(conge.DateDemande).format('YYYY-MM-DD HH:mm:ss')
    };
    res.status(200).json(formattedConge);
  } catch (error) {
    next(error);
  }
};

const addConge = async (req, res, next) => {  
  const { numEmp, motif, debutConge, dateRetour } = req.body;

  if (req.user.role === 'user' && req.user.numEmp !== parseInt(numEmp)) {
    return res.status(403).json({ message: 'Vous ne pouvez demander un congé que pour vous-même.' });
  }

  const finalDateRetour = dateRetour || debutConge;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const validation = await validateCongeInputs(numEmp, motif, debutConge, finalDateRetour);
    if (!validation.isValid) {
      await connection.rollback();
      return res.status(400).json({ message: validation.message });
    }

    const employee = await employeeModel.getEmployeeById(numEmp, connection);
    const congeId = await congeModel.createConge(numEmp, motif, validation.nbrjr, debutConge, finalDateRetour, connection);

    await processCongeNotifications(
      employee,
      { NumConge: congeId, Motif: motif, Nbrjr: validation.nbrjr, DebutConge: debutConge, DateRetour: finalDateRetour },
      'create',
      connection,
      req.user
    );

    await connection.commit();
    res.status(201).json({ message: 'La demande de congé a été soumise avec succès.' });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const updateConge = async (req, res, next) => {
  const { motif, debutConge, dateRetour, numEmp } = req.body;
  const { id } = req.params;

  const finalDateRetour = dateRetour || debutConge;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const existingConge = await congeModel.getCongeById(id, connection);
    if (!existingConge) {
      await connection.rollback();
      return res.status(404).json({ message: 'Le congé à mettre à jour est introuvable.' });
    }

    if (moment(debutConge).isBefore(moment().startOf('day'))) {
      await connection.rollback();
      return res.status(400).json({ message: 'La date de début de congé ne doit précéder aujourd\'hui' });
    }

    const validation = await validateCongeInputs(numEmp, motif, debutConge, finalDateRetour);
    if (!validation.isValid) {
      await connection.rollback();
      return res.status(400).json({ message: validation.message });
    }

    const affectedRows = await congeModel.updateCongeDetails(id, motif, validation.nbrjr, debutConge, finalDateRetour, connection);
    if (affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Le congé à mettre à jour est introuvable - Aucune modification a été effectuée.' });
    }

    await congeModel.updateCongeEmployee(id, numEmp, connection);

    const newEmployee = await employeeModel.getEmployeeById(numEmp, connection);
    await processCongeNotifications(
      newEmployee,
      { ...existingConge, Motif: motif, Nbrjr: validation.nbrjr, DebutConge: debutConge, DateRetour: finalDateRetour, CongeInfo: existingConge.CongeInfo },
      'update',
      connection,
      req.user
    );

    await connection.commit();
    return res.status(200).json({ message: 'Les données du congé ont été mises à jour avec succès.'});
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const updateStatus = async (req, res, next) => {
  const { congeInfo } = req.body;
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (!['admin', 'superuser'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à changer le statut d\'un congé.' });
    }

    const existingConge = await congeModel.getCongeById(id, connection);
    if (!existingConge) {
      await connection.rollback();
      return res.status(404).json({ message: 'Le congé à mettre à jour est introuvable.' });
    }

    if (existingConge.CongeInfo !== 'En attente') {
      await connection.rollback();
      return res.status(400).json({ message: 'Le statut d\'un congé ne peut être modifié que s\'il est "En attente".' });
    }

    const affectedRows = await congeModel.updateCongeStatus(id, congeInfo, connection);
    if (affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Le congé à mettre à jour est introuvable - Aucune modification a été effectuée.' });
    }

    const employee = await employeeModel.getEmployeeById(existingConge.NumEmp, connection);
    const emailSent = await processCongeNotifications(
      employee,
      { ...existingConge, CongeInfo: congeInfo },
      'status',
      connection,
      req.user
    );

    await connection.commit();
    return res.status(200).json({
      message: `Le statut du congé a été mis à jour avec succès.`,
      emailSent
    });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const searchConges = async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ message: 'La date de début de congé doit précéder la date de retour' });
  }

  try {
    let conges;
    if (req.user.role === 'user') {
      conges = await congeModel.getCongesBetweenDatesForEmployee(req.user.numEmp, startDate, endDate);
    } else {
      conges = await congeModel.getCongesBetweenDates(startDate, endDate);
    }
    res.status(200).json(conges);
  } catch (error) {
    next(error);
  }
};

const getRemainingLeaveDays = async (req, res, next) => {
  const { numEmp } = req.params;
  const year = req.query.year || moment().year();
  try {
    const totalTaken = await congeModel.getTotalCongesTaken(numEmp, year);
    const remaining = 30 - totalTaken;
    res.status(200).json({ numEmp, year, totalTaken, remaining });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllConges, getCongeById, addConge, updateConge, updateStatus, searchConges, getRemainingLeaveDays };