const pool = require('../config/db.js');

const getAllConges = async () => {
  const [rows] = await pool.execute('SELECT c.*, e.Nom, e.Prénom FROM CONGE c JOIN EMPLOYE e ON c.NumEmp = e.NumEmp ORDER BY c.DateDemande DESC');
  return rows;
};

const getCongeById = async (numConge, connection = pool) => {
  const [rows] = await connection.execute('SELECT c.*, e.Nom, e.Prénom FROM CONGE c JOIN EMPLOYE e ON c.NumEmp = e.NumEmp WHERE NumConge = ?', [numConge]);
  return rows[0];
};

const getEmployeeConges = async (numEmp) => {
  const [rows] = await pool.execute(`SELECT c.*, e.Nom, e.Prénom FROM CONGE c JOIN EMPLOYE e ON c.NumEmp = e.NumEmp WHERE c.NumEmp = ? ORDER BY c.DateDemande DESC`, [numEmp]);
  return rows;
};

const getCongesBetweenDates = async (startDate, endDate) => {
  const [rows] = await pool.execute(`
    SELECT c.*, e.Nom, e.Prénom
    FROM CONGE c
    JOIN EMPLOYE e ON c.NumEmp = e.NumEmp
    WHERE (c.DebutConge <= ? AND c.DateRetour >= ?)
    ORDER BY c.DebutConge ASC
  `, [endDate, startDate]);
  return rows;
};

const getActiveCongeForEmployee = async (numEmp, date) => {
  const [rows] = await pool.execute(
    `SELECT * FROM CONGE WHERE NumEmp = ? AND ? BETWEEN DebutConge AND DateRetour AND CongeInfo IN ('Validé', 'En Cours')`,
    [numEmp, date]
  );
  return rows[0];
};

const getCongesBetweenDatesForEmployee = async (numEmp, startDate, endDate, connection = pool) => {
  const [rows] = await connection.execute(`
    SELECT c.*, e.Nom, e.Prénom
    FROM CONGE c
    JOIN EMPLOYE e ON c.NumEmp = e.NumEmp
    WHERE c.NumEmp = ? AND (c.DebutConge <= ? AND c.DateRetour >= ?)
    ORDER BY c.DebutConge ASC
  `, [numEmp, endDate, startDate]);
  return rows;
};

const getTotalCongesTaken = async (numEmp, year) => {
  const [rows] = await pool.execute(
    `SELECT SUM(Nbrjr) as totalDays FROM CONGE WHERE NumEmp = ? AND YEAR(DebutConge) = ? AND CongeInfo IN ('Validé', 'En Cours', 'Terminé')`, 
    [numEmp, year]
  );
  return rows[0].totalDays || 0;
};

const createConge = async (numEmp, motif, nbrjr, debutConge, dateRetour, connection = pool) => {
  const [result] = await connection.execute(
    'INSERT INTO CONGE (NumEmp, Motif, Nbrjr, DebutConge, DateRetour) VALUES (?, ?, ?, ?, ?)',
    [numEmp, motif, nbrjr, debutConge, dateRetour]
  );
  return result.insertId;
};

const updateConge = async (numConge, motif, nbrjr, debutConge, dateRetour, congeInfo) => {
  const finalNbrjr = nbrjr !== undefined && nbrjr !== null ? nbrjr : 0;
  const [result] = await pool.execute(
    'UPDATE CONGE SET Motif = ?, Nbrjr = ?, DebutConge = ?, DateRetour = ?, CongeInfo = ? WHERE NumConge = ?',
    [motif, finalNbrjr, debutConge, dateRetour, congeInfo, numConge]
  );
  return result.affectedRows;
};

const updateCongeStatus = async (numConge, congeInfo, connection = pool) => {
  const [result] = await connection.execute(
    'UPDATE CONGE SET CongeInfo = ? WHERE NumConge = ?',
    [congeInfo, numConge]
  );
  return result.affectedRows;
};

const updateCongeDetails = async (numConge, motif, nbrjr, debutConge, dateRetour, connection = pool) => {
  const finalNbrjr = nbrjr !== undefined && nbrjr !== null ? nbrjr : 0;
  const [result] = await connection.execute(
    'UPDATE CONGE SET Motif = ?, Nbrjr = ?, DebutConge = ?, DateRetour = ? WHERE NumConge = ?',
    [motif, finalNbrjr, debutConge, dateRetour, numConge]
  );
  return result.affectedRows;
};

const updateCongeEmployee = async (numConge, numEmp) => {
  const [result] = await pool.execute(
    'UPDATE CONGE SET NumEmp = ? WHERE NumConge = ?',
    [numEmp, numConge]
  );
  return result.affectedRows;
};

module.exports = { getAllConges, getCongeById, getEmployeeConges, getCongesBetweenDates, getActiveCongeForEmployee, getCongesBetweenDatesForEmployee,
getTotalCongesTaken, createConge, updateConge, updateCongeStatus, updateCongeDetails, updateCongeEmployee };