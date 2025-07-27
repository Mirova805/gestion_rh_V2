const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { createConfig, getAllConfigs, searchConfigs,getConfigById, updateConfig, deleteConfig } = require('../controllers/configController.js');
const { protect, authorize } = require('../middlewares/authMiddleware.js');
const { validateRequest } = require('../middlewares/validationMiddleware.js'); 

const configValidation = [
  body('dateDebut').isISO8601().toDate().withMessage('La date de début saisie est invalide.'),
  body('dateFin')
    .optional()
    .isISO8601().toDate().withMessage('La date de fin saisie est invalide.')
    .custom((value, { req }) => {
      if (value && new Date(value) < new Date(req.body.dateDebut)) {
        throw new Error('La date de début du plan doit précéder la date de fin');
      }
      return true;
    }),
  body('heureDebut').matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
  .withMessage('L\'heure de début est invalide (format HH:mm:ss).')
  .custom((value, { req }) => {
    if (req.body.heureFin && value >= req.body.heureFin) {
      throw new Error('L\'heure de début doit être strictement inférieure à l\'heure de fin');
    }
    return true;
  }),
  body('heureFin').matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).withMessage('L\'heure de fin saisi est invalide.'),
  body('poste').optional({ nullable: true }).trim().isString().withMessage('Le poste saisi est invalide.'),
  body('numEmp').optional({ nullable: true }).isInt().withMessage('Le numéro d\'employé saisi est invalide.')
    .custom((value, { req }) => {
      if (value && req.body.poste) {
        throw new Error('Vous ne pouvez pas spécifier à la fois un poste et un employé.');
      }
      return true;
    }),
  body('notifyTarget').optional().isIn(['none', 'all', 'poste', 'selected']).withMessage('Cible de notification invalide.'),
  body('selectedEmployees').optional().isArray().withMessage('Les employés sélectionnés sont invalides.')
];

router.route('/')
  .post(protect, authorize(['admin']), configValidation, validateRequest, createConfig)
  .get(protect, authorize(['user', 'superuser', 'admin']), getAllConfigs);

router.get('/by-date-range', protect, authorize(['user', 'superuser', 'admin']), [
  query('startDate')
    .isISO8601().toDate().withMessage('La date de début saisie est invalide.')
    .custom((value, { req }) => {
      if (req.query.endDate && new Date(value) > new Date(req.query.endDate)) {
        throw new Error('La date de début du plan doit précéder la date de fin');
      }
      return true;
    }),
  query('endDate')
    .isISO8601().toDate().withMessage('La date de fin est invalide.')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('La date de début du plan doit précéder la date de fin');
      }
      return true;
    }),
], searchConfigs);

router.route('/:id')
  .get(protect, authorize(['admin', 'superuser']), getConfigById)
  .put(protect, authorize(['admin']), configValidation, validateRequest, updateConfig)
  .delete(protect, authorize(['admin']), deleteConfig);

module.exports = router;