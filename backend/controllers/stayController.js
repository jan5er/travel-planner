const Stay = require('../models/Stay')
const City = require('../models/City')
const { Trip, MEMBER_COLORS } = require('../models/Trip.js');
const User = require('../models/User')

exports.createStay = async (req, res) => {
    try {
        const { cityId } = req.params;
        const { tripId, name, address, coordinates, checkIn, checkOut, cost, splitWith, quantity, bookingUrl } = req.body;
        if (!tripId || !cityId || !name) {
            return res.status(400).json({ message: 'Trip ID, City ID, and Stay name are required' });
        }

        const city = await City.findById(req.params.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const stay = await Stay.create({
            tripId,
            cityId,
            name,
            address,
            coordinates,
            checkIn: checkIn || undefined,
            checkOut: checkOut || undefined,
            cost: cost || 0,
            splitWith: splitWith || [],
            addedBy: req.user._id,
            quantity: quantity || 1,
            bookingUrl: bookingUrl || '',
            notes: []
        });

        await stay.populate([
            { path: 'addedBy', select: 'name username avatar' },
            { path: 'splitWith', select: 'name username avatar' },
            { path: 'notes.user', select: 'name username avatar' }
        ]);

        res.status(201).json(stay);

    } catch (err) {
        console.error('[DEBUG] createStay error:', err);
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.getStays = async (req, res) => {
    console.log('CONTROLLER HIT', req.params.cityId);

    try {
        const stays = await Stay.find({ cityId: req.params.cityId })
            .populate('addedBy', 'name username avatar')
            .populate('splitWith', 'name username avatar')
            .populate('notes.user', 'name username avatar')
            .sort({ createdAt: -1 })

        // console.log('Found stays:', stays.length);
        await Stay.populate(stays, { path: 'addedBy', select: 'name username avatar' });
    
        res.json(stays);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Server error',
            error: err.message
        });
    }
};

exports.updateStay = async (req, res) => {
    try {
        const stay = await Stay.findById(req.params.stayId);
        if (!stay) return res.status(404).json({ message: 'Stay not found' });

        const city = await City.findById(stay.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const { name, address, coordinates, checkIn, checkOut, cost, splitWith, quantity, bookingUrl } = req.body;
        if (name !== undefined) stay.name = name;
        if (address !== undefined) stay.address = address;
        if (coordinates !== undefined) stay.coordinates = coordinates;
        if (checkIn !== undefined) stay.checkIn = checkIn || undefined;
        if (checkOut !== undefined) stay.checkOut = checkOut || undefined;
        if (cost !== undefined) stay.cost = cost || 0;
        if (splitWith !== undefined) stay.splitWith = splitWith || [];
        if (quantity !== undefined) stay.quantity = quantity;
        if (bookingUrl !== undefined) stay.bookingUrl = bookingUrl || '';

        await stay.save();
        await stay.populate([
            { path: 'addedBy', select: 'name username avatar' },
            { path: 'splitWith', select: 'name username avatar' },
            { path: 'notes.user', select: 'name username avatar' }
        ]);
        res.json(stay);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.deleteStay = async (req, res) => {
    try {
        const stay = await Stay.findById(req.params.stayId);
        if (!stay) return res.status(404).json({ message: 'Stay not found' });

        const city = await City.findById(stay.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        await stay.deleteOne()
        res.json({ message: 'Stay deleted' })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.toggleSelectStay = async (req, res) => {
    try {
        const stay = await Stay.findById(req.params.stayId);
        if (!stay) return res.status(404).json({ message: 'Stay not found' });

        const city = await City.findById(stay.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        stay.isSelected = !stay.isSelected;
        await stay.save()
        await stay.populate('addedBy', 'name username avatar')
        await stay.populate('splitWith', 'name username avatar')
        await stay.populate('notes.user', 'name username avatar')
        res.json(stay);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.addNote = async (req, res) => {
    try {
        const { text } = req.body
        if (!text || text.trim() === '') return res.status(400).json({ message: 'Note text is required' })

        const stay = await Stay.findById(req.params.stayId)
        if (!stay) return res.status(404).json({ message: 'Stay not found' })

        stay.notes.push({ user: req.user._id, text: text.trim() })
        await stay.save()
        await stay.populate([
            { path: 'addedBy', select: 'name username avatar' },
            { path: 'splitWith', select: 'name username avatar' },
            { path: 'notes.user', select: 'name username avatar' }
        ])
        res.json(stay)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.deleteNote = async (req, res) => {
    try {
        const stay = await Stay.findById(req.params.stayId)
        if (!stay) return res.status(404).json({ message: 'Stay not found' })

        stay.notes.pull({ _id: req.params.noteId })
        await stay.save()
        res.json({ message: 'Note deleted' })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}
