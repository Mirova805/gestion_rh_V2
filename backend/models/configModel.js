const pool = require('../config/db.js');

const getAllConfigs = async () => {
  const [rows] = await pool.execute('SELECT * FROM CONFIG');
  return rows;
};

const getConfigById = async (configId) => {
  const [rows] = await pool.execute('SELECT * FROM CONFIG WHERE ConfigID = ?', [configId]);
  return rows[0];
};

const createConfig = async (poste, numEmp, dateDebut, dateFin, heureDebut, heureFin, connection = pool) => {
  const [result] = await connection.execute(
    'INSERT INTO CONFIG (Poste, NumEmp, DateDebut, DateFin, HeureDebut, HeureFin) VALUES (?, ?, ?, ?, ?, ?)',
    [poste, numEmp, dateDebut, dateFin, heureDebut, heureFin]
  );
  return result.insertId;
};

const updateConfig = async (configId, poste, numEmp, dateDebut, dateFin, heureDebut, heureFin, connection = pool) => {
  const [result] = await connection.execute(
    'UPDATE CONFIG SET Poste = ?, NumEmp = ?, DateDebut = ?, DateFin = ?, HeureDebut = ?, HeureFin = ? WHERE ConfigID = ?',
    [poste, numEmp, dateDebut, dateFin, heureDebut, heureFin, configId]
  );
  return result.affectedRows;
};

const deleteConfig = async (configId) => {
  const [result] = await pool.execute('DELETE FROM CONFIG WHERE ConfigID = ?', [configId]);
  return result.affectedRows;
};

const getConfigsByDateRange = async (endDate, startDate) => {
  const [rows] = await pool.execute(
      `SELECT * FROM CONFIG 
       WHERE (DateDebut <= ? AND DateFin >= ?)
       ORDER BY DateDebut ASC`,
      [endDate, startDate]
    );
  return rows;
};

const getConfigsForEmployeeAndDate = async (numEmp, date) => {
  const [rows] = await pool.execute(
    `SELECT * FROM CONFIG 
     WHERE (? BETWEEN DateDebut AND DateFin)
     AND (NumEmp = ? OR Poste = (SELECT Poste FROM EMPLOYE WHERE NumEmp = ?) OR (NumEmp IS NULL AND Poste IS NULL))
     ORDER BY 
        CASE 
            WHEN NumEmp = ? THEN 1 
            WHEN Poste = (SELECT Poste FROM EMPLOYE WHERE NumEmp = ?) THEN 2 
            ELSE 3 
        END
     LIMIT 1`, 
    [date, numEmp, numEmp, numEmp, numEmp]
  );
  return rows;
};

module.exports = { getAllConfigs, getConfigById, createConfig, updateConfig, deleteConfig, getConfigsByDateRange, getConfigsForEmployeeAndDate };