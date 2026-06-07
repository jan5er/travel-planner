const { Trip, MEMBER_COLORS } = require('../models/Trip');
const City = require('../models/City');
const Transport = require('../models/Transport');

exports.getTransports = async (req, res) => {
    try {
        const city = await City.findById(req.params.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) return res.status(403).json({ message: 'Not authorized' })

        const transports = await Transport.find({
            $or: [{ cityId: req.params.cityId }, { toCityId: req.params.cityId }] // Vsi transporti, ki vključujejo to mesto (vhod IN izhod)
        }).populate('addedBy', 'name username avatar').populate('splitWith', 'name username avatar');
        res.json(transports);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

exports.createTransport = async (req, res) => {
    try {
        const city = await City.findById(req.params.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const { type, toCityId, fromCityId, from, to, link, departure, arrival, cost, splitWith, quantity, note, isReturn } = req.body;
        if (!type || !from || !to) {
            return res.status(400).json({ message: 'Type, from, and to fields are required' });
        }
        const transport = new Transport({
            tripId: city.tripId,
            cityId: req.params.cityId,
            toCityId: req.body.toCityId,
            fromCityId: req.body.fromCityId,
            type,
            from,
            to,
            link,
            departure,
            arrival,
            cost,
            splitWith,
            quantity,
            note,
            isReturn: req.body.isReturn || false,
            addedBy: req.user._id
        });
        await transport.save()
        await transport.populate('addedBy', 'name username avatar')
        await transport.populate('splitWith', 'name username avatar')

        res.status(201).json(transport);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

exports.updateTransport = async (req, res) => {
    try {
        const transport = await Transport.findById(req.params.transportId);
        if (!transport) return res.status(404).json({ message: 'Transport not found' });

        const city = await City.findById(transport.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });
        const allowed = ['type', 'from', 'to', 'toCityId', 'fromCityId', 'link', 'departure', 'arrival', 'cost', 'splitWith', 'quantity', 'note', 'isConfirmed', 'isReturn']
        allowed.forEach(field => {
            if (req.body[field] !== undefined) transport[field] = req.body[field]
        });
        
        await transport.save()
        await transport.populate('addedBy', 'name username avatar')
        await transport.populate('splitWith', 'name username avatar')

        res.json(transport);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

exports.deleteTransport = async (req, res) => {
    try {
        const transport = await Transport.findById(req.params.transportId);
        if (!transport) return res.status(404).json({ message: 'Transport not found' });

        const city = await City.findById(transport.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        await Transport.deleteOne({ _id: req.params.transportId });
        res.json({ message: 'Transport deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

exports.toggleConfirmed = async (req, res) => {
    try {
        const transport = await Transport.findById(req.params.transportId);
        if (!transport) return res.status(404).json({ message: 'Transport not found' });

        const city = await City.findById(transport.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        transport.isConfirmed = !transport.isConfirmed
        await transport.save()
        await transport.populate('addedBy', 'name username avatar')
        await transport.populate('splitWith', 'name username avatar')
        res.json(transport);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}
