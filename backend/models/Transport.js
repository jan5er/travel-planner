const mongoose = require('mongoose');

const TransportSchema = new mongoose.Schema({
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    fromCityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    toCityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    type: { type: String, enum: ['flight', 'train', 'bus', 'car', 'ferry', 'other'], required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    link: { type: String, trim: true },
    departure: { type: Date },
    arrival: { type: Date },
    files: [{
        url: { type: String, required: true },
        name: { type: String, required: true } 
    }],
    cost: { type: Number, default: 0 },
    splitWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    quantity: { type: Number, default: 1, min: 1 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true },
    isConfirmed: { type: Boolean, default: false },
    isReturn: { type: Boolean, default: false },
}, { timestamps: true });

const Transport = mongoose.model('Transport', TransportSchema);
module.exports = Transport;