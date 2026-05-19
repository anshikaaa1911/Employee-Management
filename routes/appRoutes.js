const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const appController = require('../controllers/appController');

router.get('/', appController.homePage);
router.get('/dashboard', requireAuth, appController.dashboard);
router.get('/reports', requireAuth, appController.reportPage);
router.get('/download/csv', requireAuth, appController.downloadCsv);
router.get('/download/excel', requireAuth, appController.downloadExcel);

module.exports = router;
