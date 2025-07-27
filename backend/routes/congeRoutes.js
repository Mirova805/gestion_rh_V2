const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator'); 
const { addConge, getAllConges, getCongeById, searchConges, updateConge, updateStatus, getRemainingLeaveDays} = require('../controllers/congeController.js');
const { protect, authorize } = require('../middlewares/authMiddleware.js');
const { validateRequest } = require('../middlewares/validationMiddleware.js');

const congeValidation = [
  body('numEmp').isInt().withMessage('Le numéro d\'employé est invalide.'),
  body('motif').trim().notEmpty().withMessage('Le motif est requis.'),
  body('debutConge').isISO8601().toDate().withMessage('La date de début est invalide.'),
  body('dateRetour')
    .optional()
    .isISO8601().toDate().withMessage('La date de fin est invalide.')
    .custom((value, { req }) => {
      if (value && new Date(value) < new Date(req.body.dateDebut)) {
        throw new Error('La date de début de congé doit précéder la date de retour');
      }
      return true;
    }),
  body('congeInfo').optional().isIn(['En attente', 'Validé', 'Refusé', 'En Cours', 'Terminé']).withMessage('Le statut du congé est invalide.')
];

router.route('/')
  .post(protect, authorize(['user', 'superuser', 'admin']), congeValidation, validateRequest, addConge)
  .get(protect, authorize(['user', 'superuser', 'admin']), getAllConges)
  
router.get('/by-date-range', protect, authorize(['superuser', 'admin']), [
  query('startDate')
    .isISO8601().toDate().withMessage('La date de début est invalide.')
    .custom((value, { req }) => {
      if (req.query.endDate && new Date(value) > new Date(req.query.endDate)) {
        throw new Error('La date de début de congé doit précéder la date de retour');
      }
      return true;
    }),
  query('endDate')
    .isISO8601().toDate().withMessage('La date de fin est invalide.')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('La date de début de congé doit précéder la date de retour');
      }
      return true;
    }),
], searchConges);  

router.route('/:id') 
  .get(protect, authorize(['user', 'superuser', 'admin']), getCongeById)
  .put(protect, authorize(['superuser', 'admin']), congeValidation, validateRequest, updateConge) 

router.put('/:id/status', protect, authorize(['superuser', 'admin']), [
  body('congeInfo').isIn(['En attente', 'Validé', 'Refusé', 'En Cours', 'Terminé']).withMessage('Le statut du congé est invalide.')
], updateStatus);

router.get('/remaining-days/:numEmp', protect, authorize(['superuser', 'admin']), [
  query('year').optional().isInt().withMessage('L\'année saisi est invalide.')
], getRemainingLeaveDays);

module.exports = router;