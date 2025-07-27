const pool = require('../config/db.js');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel.js');
const employeeModel = require('../models/employeeModel.js');

const generateToken = (id, role, numEmp = null, nomUtil = null) => { 
  return jwt.sign({ id, role, numEmp, nomUtil }, process.env.JWT_SECRET, { expiresIn: '1h' }); 
};

const loginUser = async (req, res, next) => { 
  const { nomUtil, motDePasse } = req.body;

  try {
    const user = await userModel.findUserByUsername(nomUtil);
    if (!user) {
      return res.status(400).json({ message: 'Identifiants invalides.' });
    }

    const isMatch = await userModel.comparePassword(motDePasse, user.MotDePasse);
    if (!isMatch) {
      return res.status(400).json({ message: 'Identifiants invalides.' });
    }

    res.json({
      NumUtil: user.NumUtil,
      NomUtil: user.NomUtil,
      TitreUtil: user.TitreUtil,
      NumEmp: user.NumEmp,
      token: generateToken(user.NumUtil, user.TitreUtil, user.NumEmp, user.NomUtil), 
    });
  } catch (error) {
    next(error); 
  }
};

const registerUser = async (req, res, next) => { 
  const { nomUtil, motDePasse, titreUtil, numEmp } = req.body;
  
  if (!nomUtil || !motDePasse || !titreUtil) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
  }
  if (motDePasse.length < 6) {
    return res.status(400).json({message : 'Le mot de passe doit contenir au moins 6 caractères.'});
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const userExists = await userModel.findUserByUsername(nomUtil, connection);
    if (userExists) {
      connection.rollback();
      return res.status(400).json({ message: 'Ce nom d\'utilisateur n\'est plus disponible.' });
    }

    const currentUserRole = req.user ? req.user.role : null;

    if (titreUtil === 'superuser' && currentUserRole !== 'admin') {
      return res.status(403).json({ message: 'Seul un administrateur peut créer un superutilisateur.' });
    }
    if (titreUtil === 'user' && !['admin', 'superuser'].includes(currentUserRole)) {
      return res.status(403).json({ message: 'Seul un administrateur ou un superutilisateur peut créer un utilisateur.' });
    }

    let employeeIdToLink = null;
    if (titreUtil === 'user') {
      if (!numEmp) {
        return res.status(400).json({ message: 'Le numéro d\'employé est requis pour un utilisateur de type "user".' });
      }
      const employee = await employeeModel.getEmployeeById(numEmp, connection);
      if (!employee) {
        await connection.rollback();
        return res.status(400).json({ message: 'Le numéro employé associé est introuvable ou n\'existe pas.' });
      }
      const existingUserLinkedToEmp = await userModel.findUserByNumEmp(numEmp, connection);
      if (existingUserLinkedToEmp) {
        await connection.rollback();
        return res.status(400).json({ message: 'Cet employé a déjà un compte utilisateur.' });
      }
      employeeIdToLink = numEmp;
    }

    const userId = await userModel.createUser(nomUtil, motDePasse, titreUtil, employeeIdToLink, connection);
    
    await connection.commit();

    res.status(201).json({ message: 'Le compte d\'utilisateur a été créé avec succès.', userId });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await userModel.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const affectedRows = await userModel.deleteUser(id, connection);
    if (affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Le compte d\'utilisateur à supprimer est introuvable.' });
    }

    await connection.commit();
    res.status(200).json({ message: 'Le compte d\'utilisateur a été supprimé avec succès.' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    if (connection) await connection.release();
  }
};

const searchUsers = async (req, res, next) => {
  const { query } = req.query;  

  try {
    const users = await userModel.searchUsers(query);

    res.status(200).json(users);
  } catch (error) {
    next(error); 
  }
}

module.exports = { loginUser, registerUser, getAllUsers, deleteUser, searchUsers };