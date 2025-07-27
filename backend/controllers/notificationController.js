const pool = require('../config/db.js');
const moment = require('moment');
const notificationModel = require('../models/notificationModel.js');
const employeeModel = require('../models/employeeModel.js');
const { sendEmail } = require('../utils/emailService.js');
const { unifiedEmployeeFunction } = require('../utils/dateUtils.js');

const getAllNotifications = async (req, res, next) => { 
  try {
    const notifications = await notificationModel.getAllNotifications();
    res.status(200).json(notifications);
  } catch (error) {
    next(error); 
  }
};

const getNotificationsForCurrentUser  = async (req, res, next) => { 
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const notifications = await notificationModel.getNotificationsForUser(req.user.numEmp, connection);

    await connection.commit();
    res.status(200).json(notifications);
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const updateNotificationStatus = async (req, res, next) => { 
  const { id } = req.params;
  const { statut, updatedBy, updatedByRole } = req.body; 
  
  try {
    const affectedRows = await notificationModel.updateNotificationStatus(id, statut, updatedBy, updatedByRole);
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Le notification à mettre à jour est introuvable.' });
    }
    res.status(200).json({ message: 'Le notification est marqué comme \'lu\'.' });
  } catch (error) {
    next(error); 
  }
};

const getEmployeeProfileForNotification = async (req, res, next) => {
  try {
    const employeePorfile = await unifiedEmployeeFunction({
      mode: 'getEmployeeProfileForNotification',
      req,
      res,
      next
    });
    return res.status(200).json(employeePorfile);
  } catch (error) {
    next(error);
  }
};

const hasBeenNotifiedForAbsenceCheck = async (req, res, next) => {
  const { numEmp, date } = req.params;
  try {
    const notified = await notificationModel.hasBeenNotifiedForAbsence(numEmp, date);
    res.status(200).json({ notified });
  } catch (error) {
    next(error);
  }
};

const sendAbsentEmployeeEmails = async (req, res, next) => { 
  const { date, numEmp } = req.body; 

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let absentEmployees = [];
    if (numEmp){
      for (const targetNumEmp of numEmp) {
      const employee = await employeeModel.getEmployeeById(targetNumEmp, connection);
        if (employee) {
          const isAbsent = await unifiedEmployeeFunction({
            mode: 'getAbsentEmployees',
            date
          })
          if (isAbsent.some(emp => emp.NumEmp === targetNumEmp)) {
            absentEmployees.push(employee);
          }
        }}   
    } else { 
      const absentEmployees = await unifiedEmployeeFunction({
        mode: 'getAbsentEmployees',
        date
      })}

    if (absentEmployees.length === 0) {
      return res.status(200).json({ message: 'Tous les employés à notifier ont déjà été notifié. Aucun email n\'a été envoyé.' });
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const emp of absentEmployees) {
      if (emp.Email) {
        const subject = `Notification d'absence`;
        const text = `Bonjour ${emp.Nom} ${emp.Prénom},\n\nNous avons constaté votre absence pour la journée du ${moment(date).format('DD/MM/YYYY')}. Veuillez nous contacter si cela est une erreur ou pour justifier votre absence.\n\nCordialement,\nL'équipe RH`;
        const html = `<p>Bonjour ${emp.Nom} ${emp.Prénom},</p><p>Nous avons constaté votre absence pour la journée du <b>${moment(date).format('DD/MM/YYYY')}</b>. Veuillez nous contacter si cela est une erreur ou pour justifier votre absence.</p><p>Cordialement,<br/>L'équipe RH</p>`;
        const emailSuccess = await sendEmail(emp.Email, subject, text, html);

        if (emailSuccess) {
          emailsSent++;
          const notifId = await notificationModel.createNotification(
            emp.NumEmp,
            'Notification d\'absence',
            `${emp.Nom} ${emp.Prénom}, vous avez été marqué comme absent pour le ${moment(date).format('DD/MM/YYYY')}. Veuillez fournir des justificatifs`,
            'Absence', connection
          );
          await notificationModel.markNotificationAsNotified(notifId, connection);
        } else {
          emailsFailed++;
        }
      }
    }
    
    await connection.commit();

    const message = (emailsSent === 1 && emailsFailed === 0) ? 
    `Le notification d'absence a réussi. Un email a été envoyé.` : 
    `Les notifications d'absence ont réussi. ${emailsSent} emails envoyés. ${emailsFailed} échec(s).`

    res.status(200).json({ 
      message: `${message}`,
      emailsSent,
      emailsFailed
    });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

module.exports = { getAllNotifications, getNotificationsForCurrentUser, updateNotificationStatus, getEmployeeProfileForNotification, 
hasBeenNotifiedForAbsenceCheck, sendAbsentEmployeeEmails };