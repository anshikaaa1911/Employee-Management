const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/api/reportController');
const { authenticate } = require('../../middleware/authMiddleware');
const asyncHandler = require('../../utils/asyncHandler');

router.use(authenticate);
router.get('/csv', asyncHandler(reportController.downloadCsv));
router.get('/excel', asyncHandler(reportController.downloadExcel));

module.exports = router;
