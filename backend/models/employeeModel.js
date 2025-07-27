const pool = require('../config/db.js');

const getAllEmployees = async (connection = pool) => {
  const [rows] = await connection.execute('SELECT * FROM EMPLOYE');
  return rows;
};

const getEmployeeById = async (numEmp, connection = pool) => {
  const [rows] = await connection.execute('SELECT * FROM EMPLOYE WHERE NumEmp = ?', [numEmp]);
  return rows[0];
};

const createEmployee = async (photoId, nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail, 
  travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche, connection = pool) => {
  const columns = ['PhotoID', 'Nom', 'Prénom', 'Poste', 'SalaireMensuel', 'Email', 'HeureDebutTravail', 'HeureFintravail',
  'TravailLundi', 'TravailMardi', 'TravailMercredi', 'TravailJeudi', 'TravailVendredi', 'TravailSamedi', 'TravailDimanche'  ];
  const placeholders = ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?'];
  const values = [photoId, nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail,
  travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche];
  
  const [result] = await connection.execute(
    `INSERT INTO EMPLOYE (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    values
  );
  return result.insertId;
}

const updateEmployee = async (numEmp, photoId, nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail, 
  travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche, connection = pool) => {
  const updates = ['PhotoID = ?', 'Nom = ?', 'Prénom = ?', 'Poste = ?', 'SalaireMensuel = ?', 'Email = ?', 'HeureDebutTravail = ?', 'HeureFintravail = ?', 
  'TravailLundi = ?', 'TravailMardi = ?', 'TravailMercredi = ?', 'TravailJeudi = ?', 'TravailVendredi = ?', 'TravailSamedi = ?', 'TravailDimanche = ?'];
  const values = [photoId, nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail,
    travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche, numEmp];

  const [result] = await connection.execute(
    `UPDATE EMPLOYE SET ${updates.join(', ')} WHERE NumEmp = ?`,
    values
  );
  return result.affectedRows;
};

const deleteEmployee = async (numEmp) => {
  const [result] = await pool.execute('DELETE FROM EMPLOYE WHERE NumEmp = ?', [numEmp]);
  return result.affectedRows;
};

const searchEmployees = async (query) => {
  const [rows] = await pool.execute(
    `SELECT * FROM EMPLOYE WHERE Nom LIKE ? OR Prénom LIKE ?`,
    [`%${query}%`, `%${query}%`]
  );
  return rows;
};

const getEmployeePoste = async (numEmp, connection = pool) => {
  const [rows] = await connection.execute('SELECT Poste FROM EMPLOYE WHERE NumEmp = ?', [numEmp]);
  return rows[0]?.Poste;
};

const getAllEmployeesForPoste = async (poste, connection = pool) => {
  const [rows] = await connection.execute('SELECT * FROM EMPLOYE WHERE Poste = ?', [poste]);
  return rows;
}

module.exports = { getAllEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee, searchEmployees, getEmployeePoste, getAllEmployeesForPoste};