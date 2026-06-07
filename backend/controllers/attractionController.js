const Attraction = require('../models/Attraction');
const City = require('../models/City');
const { Trip } = require('../models/Trip');

/*
const attractionSchema = new mongoose.Schema({
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { enum: ['food', 'museum', 'landmark', 'nature', 'entertainment', 'shopping', 'other'], type: String, default: 'other', required: true },
    cost: { type: Number, default: 0 },
    link: { type: String, trim: true },

    address: { type: String, trim: true },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number },
    },

    suggestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    splitWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    visited: { type: Boolean, default: false },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true });
*/

exports.createAttraction = async (req, res) => {
    try {
        const { cityId } = req.params;
        const { name, description, category, cost, link, address, coordinates, splitWith } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        const city = await City.findById(cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const attraction = new Attraction({
            tripId: city.tripId,
            cityId,
            name,
            description: description || '',
            category: category || 'other',
            cost: cost || 0,
            link: link || '',
            address: address || '',
            coordinates: coordinates?.lat && coordinates?.lng ? coordinates : undefined,
            suggestedBy: req.user._id,
            splitWith: splitWith || [],
            votes: [],
            visited: false
        });

        await attraction.save();
        await attraction.populate('suggestedBy', 'name username avatar');
        await attraction.populate('splitWith', 'name username avatar');
        await attraction.populate('votes', 'name username avatar');
        res.status(201).json(attraction);

    } catch (error) {
        console.error('Error creating attraction:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.getAttractions = async (req, res) => {
    try {
        console.log('[DEBUG] getAttractions hit', req.params)
        const { cityId } = req.params;
        console.log('[DEBUG] Fetching attractions for cityId:', cityId)
        const city = await City.findById(cityId);
        console.log('[DEBUG] Found city:', city)
        if (!city) return res.status(404).json({ message: 'City not found' });
        
        const trip = await Trip.findById(city.tripId);
        console.log('[DEBUG] Found trip:', trip)

        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        console.log('[DEBUG] User is member:', isMember)
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const attractions = await Attraction.find({ cityId })
            .populate('suggestedBy', 'name username avatar')
            .populate('splitWith', 'name username avatar')
            .populate('votes', 'name username avatar')
            .sort({ createdAt: -1 });

        console.log('[DEBUG] Found attractions:', attractions.length);

        res.json(attractions);
    } catch (err) {
        console.error('[DEBUG] Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.deleteAttraction = async (req, res) => {
    try {
        const attraction = await Attraction.findById(req.params.attractionId);
        if (!attraction) return res.status(404).json({ message: 'Attraction not found' });

        const city = await City.findById(attraction.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        await attraction.deleteOne();
        res.json({ message: 'Attraction deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message});
    }
}

exports.updateAttraction = async (req, res) => {
    try {
        const attraction = await Attraction.findById(req.params.attractionId);
        if (!attraction) return res.status(404).json({ message: 'Attraction not found' });

        const city = await City.findById(attraction.cityId);
        if (!city) return res.status(404).json({ message: 'City not found' });

        const trip = await Trip.findById(city.tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });
        const allowed = ['name', 'description', 'category', 'cost', 'link', 'address', 'coordinates', 'splitWith', 'visited'];

        allowed.forEach(field => {
            if (req.body[field] !== undefined) attraction[field] = req.body[field];
        });

        await attraction.save();
        await attraction.populate('suggestedBy', 'name username avatar');
        await attraction.populate('splitWith', 'name username avatar');
        await attraction.populate('votes', 'name username avatar');
        res.json(attraction);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

exports.toggleVote = async (req, res) => {
    try {
        const attraction = await Attraction.findById(req.params.attractionId)
        if (!attraction) return res.status(404).json({ message: 'Attraction not found' })

        const city = await City.findById(attraction.cityId)
        const trip = await Trip.findById(city.tripId)
        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) return res.status(403).json({ message: 'Not authorized' })

        if (attraction.votes.map(v => v.toString()).includes(req.user._id.toString())) {
            attraction.votes.pull(req.user._id)
        } else {
            attraction.votes.push(req.user._id)
        }

        await attraction.save()
        await attraction.populate('suggestedBy', 'name username avatar')
        await attraction.populate('splitWith', 'name username avatar')
        await attraction.populate('votes', 'name username avatar')
        res.json(attraction)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.toggleVisited = async (req, res) => {
    try {
        const attraction = await Attraction.findById(req.params.attractionId)
        if (!attraction) return res.status(404).json({ message: 'Attraction not found' })

        const city = await City.findById(attraction.cityId)
        if (!city) return res.status(404).json({ message: 'City not found' })

        const trip = await Trip.findById(city.tripId)
        if (!trip) return res.status(404).json({ message: 'Trip not found' })

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) return res.status(403).json({ message: 'Not authorized' })

        attraction.visited = !attraction.visited
        await attraction.save()
        await attraction.populate('suggestedBy', 'name username avatar')
        await attraction.populate('splitWith', 'name username avatar')
        await attraction.populate('votes', 'name username avatar')
        res.json(attraction)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

