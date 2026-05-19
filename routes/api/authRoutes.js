const express = require('express');
const router = express.Router();
const authController = require('../../controllers/api/authController');
const { authenticate } = require('../../middleware/authMiddleware');
const asyncHandler = require('../../utils/asyncHandler');

router.post('/login', asyncHandler(authController.login));
router.get('/me', authenticate, asyncHandler(authController.getMe));

module.exports = router;
