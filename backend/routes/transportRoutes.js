const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth')
const { getTransports, createTransport, updateTransport, deleteTransport, toggleConfirmed } = require('../controllers/transportController');

router.use(auth);

router.get('/:cityId', getTransports);
router.post('/:cityId', createTransport);
router.patch('/:transportId', updateTransport);
router.delete('/:transportId', deleteTransport);
router.post('/:transportId/toggle-confirmed', toggleConfirmed);

module.exports = router;