const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

router.post('/generate/:appointmentId', auth, qrController.generateQR);
router.get('/appointment/:appointmentId', auth, qrController.getQRByAppointment);
router.get('/info/:qrId', qrController.getQRInfo);
router.post('/pickup/:qrId', adminAuth, qrController.markQRAsPickedUp);
router.get('/user', auth, qrController.getUserQRs);

module.exports = router;
