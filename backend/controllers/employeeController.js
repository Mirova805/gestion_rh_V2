const pool = require('../config/db.js');
const employeeModel = require('../models/employeeModel.js');
const { unifiedEmployeeFunction } = require('../utils/dateUtils.js');

const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await employeeModel.getAllEmployees();
    res.status(200).json(employees);
  } catch (error) {
    next(error); 
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await employeeModel.getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'L\'employé prévu est introuvable.' });
    }
    res.status(200).json(employee);
  } catch (error) {
    next(error); 
  }
};

const validateForm = (req) => {
  const { photoId, nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail,
    travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche } = req.body;
  
  const errors = [];
  
  if (!nom || !prenom || !poste || salaireMensuel == null || !email || !heureDebutTravail || !heureFinTravail) {
    errors.push('Veuillez remplir tous les champs obligatoires.');
  }
  if (heureDebutTravail && heureFinTravail && heureDebutTravail >= heureFinTravail) {
    errors.push("L'horaire de début de service doit strictement précéder l'heure de fin.");
  }
  if (!(travailLundi || travailMardi || travailMercredi || travailJeudi || travailVendredi || travailSamedi || travailDimanche)) {
    errors.push("Veuillez définir les jours de travail de l'employé.");
  }
  if (nom && !/^[a-zA-Z\s]+$/.test(nom)) {
    errors.push('Le nom ne doit contenir de chiffre ni de caractère spécial.');
  }
  if (prenom && !/^[a-zA-Z\s]+$/.test(prenom)) {
    errors.push('Le prénom ne doit contenir de chiffre ni de caractère spécial.');
  }
  if (salaireMensuel && (isNaN(salaireMensuel) || parseInt(salaireMensuel) < 0)) {
    errors.push('Le salaire mensuel doit être un nombre positif.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Le format de l\'email est invalide.');
  }

  if (errors.length > 0) {
    return { errors, data: null };
  }

  return {
    errors: null,
    data: {
      photoId, nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail,
      travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche
    }
  };
};

const createEmployee = async (req, res, next) => { 
  const { errors, data } = validateForm(req);
  if (errors) {
    return res.status(400).json({ message: errors.join(' ') });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const {
      photoId, nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail,
      travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche
    } = data;

    const employeeId = await employeeModel.createEmployee(
      photoId, nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail,
      travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche, connection
    );

    await connection.commit();
    
    res.status(201).json({ message: 'L\'employée a été ajouté avec succès.', numEmp: employeeId });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const updateEmployee = async (req, res, next) => { 
  const { id } = req.params;
  const { errors, data } = validateForm(req);
  if (errors) {
    return res.status(400).json({ message: errors.join(' ') });
  }
  
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const {
      photoId, nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail,
      travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche
    } = data;

    const affectedRows = await employeeModel.updateEmployee(
      id, photoId, nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail,
      travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche, connection
    );

    if (affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'L\'employé à mettre à jour est introuvable - Aucune modification a été effectuée.' });
    }

    await connection.commit();

    res.status(200).json({ message: 'Les données de l\'employé ont été mise à jour avec succès.' });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const deleteEmployee = async (req, res, next) => { 
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const affectedRows = await employeeModel.deleteEmployee(id, connection);

    if (affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'L\'employé à supprimer est introuvable.' });
    }

    await connection.commit();

    res.status(200).json({ message: 'L\'employé a été supprimé avec succès.' });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const searchEmployees = async (req, res, next) => { 
  const { query } = req.query;
  
  try {
    const employees = await employeeModel.searchEmployees(query);

    res.status(200).json(employees);
  } catch (error) {
    next(error); 
  }
};

const getAbsent = async (req, res, next) => {
  try {
    const { date } = req.query;
    const absentEmployees = await unifiedEmployeeFunction({
      mode: 'getAbsentEmployees',
      date
    });

    res.status(200).json(absentEmployees);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee, searchEmployees, getAbsent };