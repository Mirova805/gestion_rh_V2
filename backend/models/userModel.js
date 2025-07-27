const pool = require('../config/db.js');
const bcrypt = require('bcryptjs');

const findUserByUsername = async (nomUtil, connection = pool) => {
  const [rows] = await connection.execute('SELECT * FROM UTILISATEUR WHERE NomUtil = ?', [nomUtil]);
  return rows[0];
};

const findUserById = async (numUtil) => {
  const [rows] = await pool.execute('SELECT * FROM UTILISATEUR WHERE NumUtil = ?', [numUtil]);
  return rows[0];
};

const findUserByNumEmp = async (numEmp, connection = pool) => {
  const [rows] = await connection.execute('SELECT * FROM UTILISATEUR WHERE NumEmp = ?', [numEmp]);
  return rows[0];
};

const comparePassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

const createUser = async (nomUtil, motDePasse, titreUtil, numEmp = null, connection = pool) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(motDePasse, salt);
  const [result] = await connection.execute(
    'INSERT INTO UTILISATEUR (NomUtil, MotDePasse, TitreUtil, NumEmp) VALUES (?, ?, ?, ?)',
    [nomUtil, hashedPassword, titreUtil, numEmp]
  );
  return result.insertId;
};

const getAllUsers = async () => {
  const [rows] = await pool.execute('SELECT NumUtil, NomUtil, TitreUtil, NumEmp FROM UTILISATEUR');
  return rows;
};

const deleteUser = async (numUtil, connection = pool) => {
  const [result] = await connection.execute('DELETE FROM UTILISATEUR WHERE NumUtil = ?', [numUtil]);
  return result.affectedRows;
};

const searchUsers = async (query) => {
  const [rows] = await pool.execute(
    'SELECT * FROM UTILISATEUR WHERE NomUtil LIKE ?',
    [`%${query}%`]
  );
  return rows;
}

module.exports = { findUserByUsername, findUserById, findUserByNumEmp, comparePassword, createUser, getAllUsers, deleteUser, searchUsers };