const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const adminController = require('../controllers/adminController');

router.get('/users', requireAuth, allowRoles('admin'), adminController.userList);
router.get('/audit', requireAuth, allowRoles('admin'), adminController.auditLogs);
router.post('/goals/:id/unlock', requireAuth, allowRoles('admin'), adminController.unlockGoal);
router.post('/users/:id/delete', requireAuth, allowRoles('admin'), adminController.deleteUser);
router.post('/users/:id/role', requireAuth, allowRoles('admin'), adminController.updateUserRole);

module.exports = router;
