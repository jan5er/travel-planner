const City = require('../models/City');
const { Trip } = require('../models/Trip');

exports.addCity = async (req, res) => {
    try {
        const { name, country, coordinates, dateFrom, dateTo } = req.body
        if (!name) return res.status(400).json({ message: 'City name is required' });
        
        const trip = await Trip.findById(req.params.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const cityCount = await City.countDocuments({ tripId: req.params.tripId });

        const city = await City.create({
            tripId: req.params.tripId,
            name,
            country,
            coordinates,
            order: cityCount,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined
        });
        res.status(201).json(city);
    } catch (err) {
        console.error('Error adding city:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.getCities = async (req, res) => {
    try {
        const cities = await City.find({ tripId: req.params.tripId }).sort({ order: 1 });
        res.json(cities);
    } catch (err) {
        console.error('Error fetching cities:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.updateCity = async (req, res) => {
    try {
        const city = await City.findById(req.params.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const { name, country, coordinates, dateFrom, dateTo } = req.body
        if (name !== undefined) city.name = name;
        if (country !== undefined) city.country = country;
        if (coordinates !== undefined) city.coordinates = coordinates;
        if (dateFrom !== undefined) city.dateFrom = dateFrom || undefined;
        if (dateTo !== undefined) city.dateTo = dateTo || undefined;

        await city.save();
        res.json(city);
    } catch (err) {
        console.error('Error updating city:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.deleteCity = async (req, res) => {
    try {
        const city = await City.findById(req.params.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        await city.deleteOne();
        res.json({ message: 'City deleted' });
    } catch (err) {
        console.error('Error deleting city:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.reorderCities = async (req, res) => {
    try {
        await Promise.all(req.body.map(c =>
            City.findByIdAndUpdate(c._id, { order: c.order })
        ))
        res.json({ message: 'Cities reordered' })
    } catch (err) {
        console.error('Error reordering cities:', err)
        res.status(500).json({ message: 'Server error' })
    }
}