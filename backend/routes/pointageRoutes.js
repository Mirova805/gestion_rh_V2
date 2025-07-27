const express = require('express');
const router = express.Router();
const { body } = require('express-validator'); 
const { addPointage, getAllPointages, getPointageById, deletePointage, getLastPointageForEmployee } = require('../controllers/pointageController.js');
const { protect, authorize } = require('../middlewares/authMiddleware.js');
const { validateRequest }= require('../middlewares/validationMiddleware.js');

const pointageValidation = [
  body('numEmp').isInt().withMessage('Le numéro d\'employé saisi est invalide.'),
  body('pointageInfo').isIn(['Pointage au travail', 'Sorti', 'Retour de pause', 'Fin de la journée']).withMessage('Le pointage saisi est invalide.')
];

router.route('/')
  .post(protect, authorize(['user', 'superuser', 'admin']), pointageValidation, validateRequest, addPointage) 
  .get(protect, authorize(['user', 'superuser', 'admin']), getAllPointages);

router.route('/:id') 
  .get(protect, authorize(['superuser', 'admin']), getPointageById) 
  .delete(protect, authorize(['superuser', 'admin']), deletePointage);

router.route('/employee/:numEmp/last')
  .get(protect, authorize(['user', 'superuser', 'admin']), getLastPointageForEmployee);

module.exports = router;