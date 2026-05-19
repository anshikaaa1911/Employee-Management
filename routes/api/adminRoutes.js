const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/api/adminController');
const { authenticate, allowRoles } = require('../../middleware/authMiddleware');
const asyncHandler = require('../../utils/asyncHandler');

router.use(authenticate, allowRoles('admin'));
router.get('/users', asyncHandler(adminController.userList));
router.get('/audit', asyncHandler(adminController.auditLogs));
router.post('/goals/:id/unlock', asyncHandler(adminController.unlockGoal));
router.put('/users/:id/role', asyncHandler(adminController.updateUserRole));
router.delete('/users/:id', asyncHandler(adminController.deleteUser));

module.exports = router;
