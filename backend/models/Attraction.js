const mongoose = require('mongoose');

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