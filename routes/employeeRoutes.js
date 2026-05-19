const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const employeeController = require('../controllers/employeeController');

router.get('/goals', requireAuth, allowRoles('employee'), employeeController.goalsList);
router.get('/goals/new', requireAuth, allowRoles('employee'), employeeController.newGoalPage);
router.post('/goals/new', requireAuth, allowRoles('employee'), employeeController.createGoal);
router.get('/goals/:id/edit', requireAuth, allowRoles('employee'), employeeController.editGoalPage);
router.post('/goals/:id/edit', requireAuth, allowRoles('employee'), employeeController.updateGoal);
router.post('/goals/:id/submit', requireAuth, allowRoles('employee'), employeeController.submitGoal);
router.post('/goals/:id/achievement', requireAuth, allowRoles('employee'), employeeController.updateAchievement);

module.exports = router;
