const express = require('express');
const router = express.Router();
const goalController = require('../../controllers/api/goalController');
const { authenticate, allowRoles } = require('../../middleware/authMiddleware');
const asyncHandler = require('../../utils/asyncHandler');

router.use(authenticate);
router.get('/', allowRoles('employee'), asyncHandler(goalController.listGoals));
router.post('/', allowRoles('employee'), asyncHandler(goalController.createGoal));
router.put('/:id', allowRoles('employee'), asyncHandler(goalController.updateGoal));
router.post('/:id/submit', allowRoles('employee'), asyncHandler(goalController.submitGoal));
router.post('/:id/achievement', allowRoles('employee'), asyncHandler(goalController.updateAchievement));

module.exports = router;
