const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { registerUser, loginUser, searchUsers, getAllUsers, deleteUser } = require('../controllers/userController.js');
const { protect, authorize } = require('../middlewares/authMiddleware.js');
const { validateRequest } = require('../middlewares/validationMiddleware.js');

const registerValidation = [
    body('nomUtil').trim().notEmpty().withMessage('Le nom d\'utilisateur est requis.'),
    body('motDePasse').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères.'),
    body('titreUtil').isIn(['user', 'superuser', 'admin']).withMessage('Le titre d\'utilisateur saisi est invalide.'),
    body('numEmp').optional().isInt().withMessage('Le numéro d\'employé saisie est invalide.')
];

const loginValidation = [
    body('nomUtil').trim().notEmpty().withMessage('Le nom d\'utilisateur est requis.'),
    body('motDePasse').notEmpty().withMessage('Le mot de passe est requis.')
];

router.post('/register', protect, authorize(['admin', 'superuser']), registerValidation, validateRequest, registerUser);

router.post('/login', loginValidation, loginUser);

router.get('/search', protect, authorize(['admin', 'superuser']), [
  query('query').trim().notEmpty().withMessage('Le terme de recherche est requis.')
], searchUsers);

router.route('/')
  .get(protect, authorize(['admin']), getAllUsers);

router.route('/:id')
  .delete(protect, authorize(['admin']), deleteUser);

module.exports = router;