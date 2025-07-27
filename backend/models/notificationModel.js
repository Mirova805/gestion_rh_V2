const pool = require('../config/db.js');
const moment = require('moment'); 

const getAllNotifications = async () => {
  const [rows] = await pool.execute('SELECT n.*, e.Nom, e.Prénom FROM NOTIFICATIONS n LEFT JOIN EMPLOYE e ON n.NumEmpCible = e.NumEmp ORDER BY DateNotif DESC');
  return rows;
};

const getNotificationsForUser = async (numEmpCible, connection = pool) => {
    const [rows] = await connection.execute(
    `SELECT * FROM NOTIFICATIONS WHERE NumEmpCible = ? ORDER BY DateNotif DESC`,
    [numEmpCible]
  ); 
  return rows;
};

const getNotificationByCongeId = async (numConge, connection = pool) => {
  const [rows] = await connection.execute(
    `SELECT * FROM NOTIFICATIONS 
     WHERE Message LIKE ? 
     AND TypeNotif = 'Demande de Congé'
     ORDER BY DateNotif DESC LIMIT 1`,
    [`%ID Congé: ${numConge}%`]
  );
  return rows[0];
};

const createNotification = async (numEmpCible, titre, message, typeNotif, connection = pool) => {
  const [result] = await connection.execute(
    'INSERT INTO NOTIFICATIONS (NumEmpCible, Titre, Message, TypeNotif) VALUES (?, ?, ?, ?)',
    [numEmpCible, titre, message, typeNotif]
  );
  return result.insertId;
};

const updateCongeNotification = async (notifId, numEmpCible, titre, message, updatedBy = null, updatedByRole = null, connection = pool) => {
  const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');
  const [result] = await connection.execute(
    `UPDATE NOTIFICATIONS 
     SET NumEmpCible = ?, Titre = ?, Message = ?, UpdatedBy = ?, UpdatedByRole = ?, UpdatedAt = ? 
     WHERE NotifID = ?`,
    [numEmpCible, titre, message, updatedBy, updatedByRole, updatedAt, notifId]
  );
  return result.affectedRows;
};

const hasBeenNotifiedForAbsence = async (numEmpCible, date) => {
  const [rows] = await pool.execute(
    `SELECT NotifID FROM NOTIFICATIONS 
     WHERE NumEmpCible = ? 
     AND TypeNotif = 'Absence' 
     AND DATE(DateNotif) = ? 
     AND Notified = TRUE`,
    [numEmpCible, date]
  );
  return rows.length > 0;
};

const updateNotificationStatus = async (notifId, statut, updatedBy = null, updatedByRole = null) => {
  const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');
  const [result] = await pool.execute(
    'UPDATE NOTIFICATIONS SET Statut = ?, UpdatedBy = ?, UpdatedByRole = ?, UpdatedAt = ? WHERE NotifID = ?',
    [statut, updatedBy, updatedByRole, updatedAt, notifId]
  );
  return result.affectedRows;
};

const markNotificationAsNotified = async (notifId, connection = pool) => {
  const [result] = await connection.execute(
    'UPDATE NOTIFICATIONS SET Notified = TRUE WHERE NotifID = ?',
    [notifId]
  );
  return result.affectedRows;
};

module.exports = { getAllNotifications, getNotificationsForUser, getNotificationByCongeId, createNotification, updateCongeNotification, 
hasBeenNotifiedForAbsence, updateNotificationStatus, markNotificationAsNotified };