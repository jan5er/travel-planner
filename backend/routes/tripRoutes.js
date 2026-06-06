const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const {
    createTrip, getTrips, getTrip, updateTrip, deleteTrip, addMember, removeMember, generateInvite, joinByInvite
} = require('../controllers/tripController')

router.use(auth); // Dejansko moramo biti za vse te route prijavljeni tako da lahko dodamo samo en auth middleware na vrh v use

router.post('/', createTrip)
router.get('/', getTrips)
router.get('/:id', getTrip)
router.patch('/:id', updateTrip)
router.delete('/:id', deleteTrip)
router.post('/:id/members', addMember)
router.delete('/:id/members/:userId', removeMember)
router.post('/:id/invite', generateInvite)
router.get('/invite/:code', joinByInvite)

module.exports = router