const Misc = require('../models/Misc');
const { Trip } = require('../models/Trip');
const City = require('../models/City');

exports.getMiscs = async (req, res) => {
    try {
        const city = await City.findById(req.params.cityId)
        if (!city) return res.status(404).json({ message: 'City not found' })

        const trip = await Trip.findById(city.tripId)
        if (!trip) return res.status(404).json({ message: 'Trip not found' })

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) return res.status(403).json({ message: 'Not authorized' })

        const miscs = await Misc.find({ cityId: req.params.cityId })
            .populate('addedBy', 'name username avatar')
            .populate('splitWith', 'name username avatar')
            .sort({ date: -1, createdAt: -1 })

        res.json(miscs)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.addMisc = async (req, res) => {
    try {
        const { name, category, description, cost, splitWith, date } = req.body;
        if (!name) return res.status(400).json({ message: 'Misc name is required' });

        const city = await City.findById(req.params.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const misc = new Misc({
            tripId: city.tripId,
            cityId: req.params.cityId,
            name,
            category: category || 'other',
            description,
            cost: cost || 0,
            splitWith: splitWith || [],
            addedBy: req.user._id,
            date: date || undefined
        });

        await misc.save();
        await misc.populate('addedBy', 'name username avatar');
        await misc.populate('splitWith', 'name username avatar');

        res.status(201).json(misc);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

exports.updateMisc = async (req, res) => {
    try {
        const misc = await Misc.findById(req.params.miscId)
        if (!misc) return res.status(404).json({ message: 'Misc not found' })

        const city = await City.findById(misc.cityId)
        if (!city) return res.status(404).json({ message: 'City not found' })

        const trip = await Trip.findById(city.tripId)
        if (!trip) return res.status(404).json({ message: 'Trip not found' })

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) return res.status(403).json({ message: 'Not authorized' })

        const allowed = ['name', 'category', 'description', 'cost', 'splitWith', 'date']
        allowed.forEach(field => {
            if (req.body[field] !== undefined) misc[field] = req.body[field]
        })

        await misc.save()
        await misc.populate('addedBy', 'name username avatar')
        await misc.populate('splitWith', 'name username avatar')
        res.json(misc)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.deleteMisc = async (req, res) => {
    try {
        const misc = await Misc.findById(req.params.miscId)
        if (!misc) return res.status(404).json({ message: 'Misc not found' })

        const city = await City.findById(misc.cityId)
        if (!city) return res.status(404).json({ message: 'City not found' })

        const trip = await Trip.findById(city.tripId)
        if (!trip) return res.status(404).json({ message: 'Trip not found' })

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) return res.status(403).json({ message: 'Not authorized' })

        await misc.deleteOne()
        res.json({ message: 'Misc deleted' })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}