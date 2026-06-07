const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createAttraction, updateAttraction, deleteAttraction, getAttractions, toggleVote, toggleVisited } = require('../controllers/attractionController');

router.use(auth);

router.post('/:cityId', createAttraction)
router.get('/:cityId', getAttractions)
router.patch('/:attractionId', updateAttraction)
router.delete('/:attractionId', deleteAttraction)
router.post('/:attractionId/toggle-vote', toggleVote)
router.post('/:attractionId/toggle-visited', toggleVisited)

module.exports = router;