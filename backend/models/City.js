const mongoose = require('mongoose')

const citySchema = new mongoose.Schema({
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    name: { type: String, required: true, trim: true },
    country: { type: String, trim: true },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number },
    },
    order: { type: Number, required: true },
    color: { type: String, default: '' },
    dateFrom: { type: Date },
    dateTo: { type: Date },
}, { timestamps: true });

const City = mongoose.model('City', citySchema);
module.exports = City