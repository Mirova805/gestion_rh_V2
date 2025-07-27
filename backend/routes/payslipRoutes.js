const express = require('express');
const router = express.Router();
const { body } = require('express-validator'); 
const { calculateAndGeneratePayslip } = require('../controllers/payslipController.js');
const { protect, authorize } = require('../middlewares/authMiddleware.js');

router.post('/generate-payslip', protect, authorize(['admin', 'superuser']), [
  body('numEmp').isInt().withMessage('Le numéro d\'employé saisi est invalide.'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Le mois saisi est invalide.'),
  body('year').isInt({ min: 1900, max: 2100 }).withMessage('L\'année saisi est invalide.')
], calculateAndGeneratePayslip);

module.exports = router;