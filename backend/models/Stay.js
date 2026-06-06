const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
}, { timestamps: true });

const staySchema = new mongoose.Schema({
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    name: { type: String, required: true, trim: true },
    bookingUrl: { type: String, trim: true },
    address: { type: String, trim: true },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    checkIn: { type: Date },
    checkOut: { type: Date },
    cost: { type: Number, default: 0 },
    splitWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isSelected: { type: Boolean, default: false },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    notes: [noteSchema]
}, { timestamps: true })

const Stay = mongoose.model('Stay', staySchema)
module.exports = Stay