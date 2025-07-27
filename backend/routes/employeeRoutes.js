const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator'); 
const { searchEmployees, getAbsent, createEmployee, getAllEmployees, getEmployeeById, updateEmployee, deleteEmployee } = require('../controllers/employeeController.js');
const { protect, authorize } = require('../middlewares/authMiddleware.js');
const { validateRequest } = require('../middlewares/validationMiddleware.js');

const employeeValidation = [
  body('nom').trim().notEmpty().withMessage('Le nom est requis.').matches(/^[a-zA-Z\s]+$/).withMessage('Le nom ne doit pas contenir de chiffre ni de caractère spécial.'),
  body('prenom').trim().notEmpty().withMessage('Le prénom est requis.').matches(/^[a-zA-Z\s]+$/).withMessage('Le prénom ne doit pas contenir de chiffre ni de catactère spécial.'),
  body('poste').trim().notEmpty().withMessage('Le poste est requis.'),
  body('salaireMensuel').isInt({ min: 0 }).withMessage('Le salaire mensuel saisi est invalide.'),
  body('email').isEmail().withMessage('Le format de l\'email est invalide.'),
  body('heureDebutTravail')
  .optional({ checkFalsy: true })
  .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
  .withMessage('L\'heure de début de travail est invalide.')
  .custom((value, { req }) => {
    if (req.body.heureFinTravail && value >= req.body.heureFinTravail) {
      throw new Error('L\'heure de début de travail doit être strictement inférieure à l\'heure de fin');
    }
    return true;
  }),
  body('heureFinTravail')
    .optional({ checkFalsy: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage('L\'heure de fin de travail est invalide.'),
  body('travailLundi').isBoolean().withMessage('Les jours de travail saisis sont invalides.'),
  body('travailMardi').isBoolean().withMessage('Les jours de travail saisis sont invalides.'),
  body('travailMercredi').isBoolean().withMessage('Les jours de travail saisis sont invalides.'),
  body('travailJeudi').isBoolean().withMessage('Les jours de travail saisis sont invalides.'),
  body('travailVendredi').isBoolean().withMessage('Les jours de travail saisis sont invalides.'),
  body('travailSamedi').isBoolean().withMessage('Les jours de travail saisis sont invalides.'),
  body('travailDimanche').isBoolean().withMessage('Les jours de travail saisis sont invalides.'),
];

router.get('/search', protect, authorize(['admin', 'superuser']), [
  query('query').trim().notEmpty().withMessage('Le terme de recherche est requis.')
], searchEmployees);

router.get('/absent', protect, authorize(['admin', 'superuser']), [
  query('date').isISO8601().toDate().withMessage('La date saisie est invalide.')
], getAbsent);

router.route('/')
  .post(protect, authorize(['admin', 'superuser']), employeeValidation, validateRequest, createEmployee)
  .get(protect, authorize(['admin', 'superuser']), getAllEmployees);

router.route('/:id')
  .get(protect, authorize(['admin', 'superuser']), getEmployeeById)
  .put(protect, authorize(['admin', 'superuser']), employeeValidation, validateRequest, updateEmployee)
  .delete(protect, authorize(['admin']), deleteEmployee); 

module.exports = router;