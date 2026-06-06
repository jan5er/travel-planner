const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { addCity, updateCity, deleteCity, getCities, reorderCities } = require('../controllers/cityController');

router.use(auth);

router.post('/:tripId/cities', addCity);
router.get('/:tripId/cities', getCities);
router.patch('/cities/:cityId', updateCity);
router.delete('/cities/:cityId', deleteCity);
router.patch('/:tripId/cities/reorder', reorderCities);

module.exports = router;