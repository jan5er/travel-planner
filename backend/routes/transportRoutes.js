const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
    getTransports, 
    createTransport, 
    updateTransport, 
    deleteTransport, 
    toggleConfirmed 
} = require('../controllers/transportController');

// Protect all transport routes
router.use(auth);

// --- Global / Trip-Level Routes ---
// This handles GET /transports/trip (using query string ?tripId=XYZ)
// and POST /transports/trip
router.route('/trip')
    .get(getTransports)
    .post(createTransport);

// --- Specific Document Instance Routes ---
router.route('/:transportId')
    .patch(updateTransport)
    .delete(deleteTransport);

router.post('/:transportId/toggle-confirmed', toggleConfirmed);

// --- City-Context Routes ---
// Placed at the bottom so explicit strings like "trip" don't get caught by ":cityId"
router.route('/:cityId')
    .get(getTransports)
    .post(createTransport);

module.exports = router;