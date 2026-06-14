const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/api/teamController');
const { authenticate, allowRoles } = require('../../middleware/authMiddleware');
const asyncHandler = require('../../utils/asyncHandler');

router.use(authenticate);

router.get('/overview', asyncHandler(teamController.overview));
router.post('/join-requests', allowRoles('employee'), asyncHandler(teamController.requestJoin));
router.put('/join-requests/:id', allowRoles('manager', 'admin'), asyncHandler(teamController.reviewJoinRequest));
router.put('/notifications/read', asyncHandler(teamController.markNotificationsRead));

router.post('/', allowRoles('manager', 'admin'), asyncHandler(teamController.createTeam));
router.put('/:id', allowRoles('manager', 'admin'), asyncHandler(teamController.updateTeam));
router.delete('/:id', allowRoles('manager', 'admin'), asyncHandler(teamController.deleteTeam));
router.post('/:id/members', allowRoles('manager', 'admin'), asyncHandler(teamController.addMember));
router.delete('/:id/members/:employeeId', allowRoles('manager', 'admin'), asyncHandler(teamController.removeMember));

module.exports = router;
