const pool = require('../config/db.js');

const getAllPointages = async () => {
  const [rows] = await pool.execute('SELECT p.*, e.Nom, e.Prénom FROM POINTAGE p JOIN EMPLOYE e ON p.NumEmp = e.NumEmp ORDER BY p.DateHeurePointage DESC');
  return rows;
};

const getPointagesByEmployee = async (numEmp) => {
  const [rows] = await pool.execute(
    `SELECT p.*, e.Nom, e.Prénom FROM POINTAGE p JOIN EMPLOYE e ON p.NumEmp = e.NumEmp WHERE p.NumEmp = ? ORDER BY p.DateHeurePointage DESC`, [numEmp]);
  return rows;
};

const getPointageById = async (numPointage) => {
  const [rows] = await pool.execute('SELECT * FROM POINTAGE WHERE NumPointage = ?', [numPointage]);
  return rows[0];
};

const getLastPointageForEmployeeToday = async (numEmp, date) => {
  const [rows] = await pool.execute(
    `SELECT * FROM POINTAGE WHERE NumEmp = ? AND DATE(DateHeurePointage) = ? ORDER BY DateHeurePointage DESC LIMIT 1`,
    [numEmp, date]
  );
  return rows[0];
};

const createPointage = async (numEmp, dateHeurePointage, heureRetard, pointageInfo, connection = pool) => {
  const [result] = await connection.execute(
    'INSERT INTO POINTAGE (NumEmp, DateHeurePointage, HeureRetard, PointageInfo) VALUES (?, ?, ?, ?)',
    [numEmp, dateHeurePointage, heureRetard, pointageInfo]
  );
  return result.insertId;
};

const deletePointage = async (numPointage, connection = pool) => {
  const [result] = await connection.execute('DELETE FROM POINTAGE WHERE NumPointage = ?', [numPointage]);
  return result.affectedRows;
};

const getTotalDelaysForEmployee = async (numEmp, startDate, endDate) => {
  const [rows] = await pool.execute(
    `SELECT SUM(TIME_TO_SEC(HeureRetard)) as totalSeconds
     FROM POINTAGE
     WHERE NumEmp = ? AND PointageInfo = 'Pointage au travail' AND HeureRetard IS NOT NULL
     AND DateHeurePointage BETWEEN ? AND ?`,
    [numEmp, startDate, endDate]
  );
  return rows[0].totalSeconds || 0;
};

const getAbsenceCountForEmployee = async (numEmp, startDate, endDate) => {
    const [rows] = await pool.execute(
        `SELECT COUNT(DISTINCT DATE(DateHeurePointage)) as daysWorked
         FROM POINTAGE
         WHERE NumEmp = ? AND PointageInfo = 'Pointage au travail'
         AND DateHeurePointage BETWEEN ? AND ?`,
        [numEmp, startDate, endDate]
    );
    const daysWorked = rows[0].daysWorked;

    const totalWorkingDaysInPeriod = moment(endDate).diff(moment(startDate), 'days') + 1;
    const assumedWorkingDays = Math.min(totalWorkingDaysInPeriod, 20); 

    return Math.max(0, assumedWorkingDays - daysWorked);
};

const getPointagesByEmployeeAndDateRange = async (numEmp, startDate, endDate) => {
  const [rows] = await pool.execute(
    `SELECT * FROM POINTAGE WHERE NumEmp = ? AND DateHeurePointage BETWEEN ? AND ? ORDER BY DateHeurePointage ASC`,
    [numEmp, startDate, endDate]
  );
  return rows;
};

const getAllPointagesOfEmployee = async (numEmp, date) => {
  const [rows] = await pool.execute(
    `SELECT * FROM POINTAGE WHERE NumEmp = ? AND DATE(DateHeurePointage) = ?`,
    [numEmp, date]
  );
  return rows;
};

module.exports = { getAllPointages, getPointagesByEmployee, getPointageById, getLastPointageForEmployeeToday, createPointage,
deletePointage, getTotalDelaysForEmployee, getAbsenceCountForEmployee, getPointagesByEmployeeAndDateRange, getAllPointagesOfEmployee };