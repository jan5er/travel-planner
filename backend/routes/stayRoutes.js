const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth')
const { createStay, getStays, updateStay, deleteStay, toggleSelectStay, addNote, deleteNote } = require('../controllers/stayController');

router.use(auth);

router.post('/:cityId', createStay);
router.get('/:cityId', getStays);
router.patch('/:stayId', updateStay);
router.delete('/:stayId', deleteStay);
router.post('/:stayId/toggle-select', toggleSelectStay);

router.post('/:stayId/notes', addNote)
router.delete('/:stayId/notes/:noteId', deleteNote)

module.exports = router;