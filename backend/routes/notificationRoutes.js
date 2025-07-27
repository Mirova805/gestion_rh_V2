const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getAllNotifications, getNotificationsForCurrentUser, updateNotificationStatus, getEmployeeProfileForNotification, sendAbsentEmployeeEmails, 
hasBeenNotifiedForAbsenceCheck } = require('../controllers/notificationController.js');
const { protect, authorize } = require('../middlewares/authMiddleware.js'); 

router.route('/')
  .get(protect, authorize(['superuser', 'admin']), getAllNotifications);

router.get('/me', protect, authorize(['user']), getNotificationsForCurrentUser);

router.route('/:id')
  .put(protect, authorize(['user', 'superuser', 'admin']), [
  body('statut').isIn(['Non lu', 'Lu']).withMessage('Le statut de notificaition est invalide.')
  ], updateNotificationStatus)

router.get('/employee-profile/:numEmp', protect, authorize(['superuser', 'admin']), getEmployeeProfileForNotification);

router.post('/send-absent-emails', protect, authorize(['admin']), [
  body('date').isISO8601().toDate(),
  body('numEmp')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return value.every(Number.isInteger);
    })
    .withMessage('Les numéros employés séléctionnées sont invalides.'),
], sendAbsentEmployeeEmails);

router.get('/check-absence-notification/:numEmp/:date', protect, authorize(['admin', 'superuser']), hasBeenNotifiedForAbsenceCheck);

module.exports = router;