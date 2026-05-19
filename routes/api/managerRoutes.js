const express = require('express');
const router = express.Router();
const managerController = require('../../controllers/api/managerController');
const { authenticate, allowRoles } = require('../../middleware/authMiddleware');
const asyncHandler = require('../../utils/asyncHandler');

router.use(authenticate, allowRoles('manager', 'admin'));
router.get('/team-goals', asyncHandler(managerController.teamGoals));
router.post('/goals/:id/approve', asyncHandler(managerController.approveGoal));
router.post('/goals/:id/reject', asyncHandler(managerController.rejectGoal));
router.put('/goals/:id', asyncHandler(managerController.editGoal));

module.exports = router;
