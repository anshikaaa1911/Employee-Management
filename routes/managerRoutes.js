const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const managerController = require('../controllers/managerController');

router.get('/team-goals', requireAuth, allowRoles('manager'), managerController.teamGoals);
router.get('/goals/:id/review', requireAuth, allowRoles('manager'), managerController.reviewGoalPage);
router.post('/goals/:id/approve', requireAuth, allowRoles('manager'), managerController.approveGoal);
router.post('/goals/:id/reject', requireAuth, allowRoles('manager'), managerController.rejectGoal);
router.post('/goals/:id/edit', requireAuth, allowRoles('manager'), managerController.editGoal);

module.exports = router;
