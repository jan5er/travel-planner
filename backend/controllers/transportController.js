const { Trip, MEMBER_COLORS } = require('../models/Trip');
const City = require('../models/City');
const Transport = require('../models/Transport');

exports.getTransports = async (req, res) => {
    try {
        const { cityId } = req.params;
        let query = {};

        if (cityId && cityId !== 'trip') {
            const city = await City.findById(cityId);
            if (!city) return res.status(404).json({ message: 'City not found' });

            const trip = await Trip.findById(city.tripId);
            if (!trip) return res.status(404).json({ message: 'Trip not found' });

            const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
            if (!isMember) return res.status(403).json({ message: 'Not authorized' });

            // Transports belonging specifically to this city card context (either entry or exit)
            query = { $or: [{ cityId: cityId }, { toCityId: cityId }] };
        } else {
            // Global trip fallback if you want to fetch all transports for an entire trip page
            const { tripId } = req.query; 
            if (!tripId) return res.status(400).json({ message: 'Trip ID is required for global transports fetch' });

            const trip = await Trip.findById(tripId);
            if (!trip) return res.status(404).json({ message: 'Trip not found' });

            const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
            if (!isMember) return res.status(403).json({ message: 'Not authorized' });

            query = { tripId: tripId };
        }

        const transports = await Transport.find(query)
            .populate('addedBy', 'name username avatar')
            .populate('splitWith', 'name username avatar');
            
        res.json(transports);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

exports.createTransport = async (req, res) => {
    try {
        const { cityId } = req.params;
        let finalTripId = req.body.tripId;
        let finalCityId = null;

        // If it's a specific city view, validate and pull tripId from the City document
        if (cityId && cityId !== 'trip') {
            const city = await City.findById(cityId);
            if (!city) return res.status(404).json({ message: 'City not found' });
            finalTripId = city.tripId;
            finalCityId = cityId;
        }

        if (!finalTripId) {
            return res.status(400).json({ message: 'Trip ID is required' });
        }

        const trip = await Trip.findById(finalTripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const { 
            type, toCityId, fromCityId, from, to, link, departure, arrival, 
            cost, splitWith, quantity, note, isReturn, fromCoordinates, toCoordinates 
        } = req.body;

        if (!type || !from || !to) {
            return res.status(400).json({ message: 'Type, from, and to fields are required' });
        }

        const transport = new Transport({
            tripId: finalTripId,
            cityId: finalCityId, // Stores ObjectId or remains null if created on generic trip view
            toCityId: toCityId || null,
            fromCityId: fromCityId || null,
            fromCoordinates: fromCoordinates || null, // Handles custom geocoded coordinates
            toCoordinates: toCoordinates || null,     // Handles custom geocoded coordinates
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
            isReturn: isReturn || false,
            addedBy: req.user._id
        });

        await transport.save();
        await transport.populate('addedBy', 'name username avatar');
        await transport.populate('splitWith', 'name username avatar');

        res.status(201).json(transport);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

exports.updateTransport = async (req, res) => {
    try {
        const transport = await Transport.findById(req.params.transportId);
        if (!transport) return res.status(404).json({ message: 'Transport not found' });

        // Authorization bypass check via Parent Trip instead of City
        const trip = await Trip.findById(transport.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const allowed = [
            'type', 'from', 'to', 'toCityId', 'fromCityId', 'fromCoordinates', 'toCoordinates',
            'link', 'departure', 'arrival', 'cost', 'splitWith', 'quantity', 'note', 'isConfirmed', 'isReturn'
        ];

        allowed.forEach(field => {
            if (req.body[field] !== undefined) transport[field] = req.body[field];
        });
        
        await transport.save();
        await transport.populate('addedBy', 'name username avatar');
        await transport.populate('splitWith', 'name username avatar');

        res.json(transport);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

exports.deleteTransport = async (req, res) => {
    try {
        const transport = await Transport.findById(req.params.transportId);
        if (!transport) return res.status(404).json({ message: 'Transport not found' });

        const trip = await Trip.findById(transport.tripId);
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

        const trip = await Trip.findById(transport.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        transport.isConfirmed = !transport.isConfirmed;
        await transport.save();
        await transport.populate('addedBy', 'name username avatar');
        await transport.populate('splitWith', 'name username avatar');
        
        res.json(transport);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}