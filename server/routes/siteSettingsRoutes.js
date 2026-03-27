const express = require('express');
const router = express.Router();
const siteSettingsController = require('../controllers/siteSettingsController');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Público
router.get('/', siteSettingsController.getSettings);

// Admin
router.put('/', auth, adminAuth, siteSettingsController.updateSettings);

module.exports = router;
