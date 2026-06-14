const mongoose = require('mongoose')

const miscSchema = new mongoose.Schema({
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    name: { type: String, required: true, trim: true },
    category: { 
        type: String, 
        enum: ['food', 'drinks', 'shopping', 'city transport', 'activity', 'other'], 
        default: 'other', 
        required: true 
    },
    description: { type: String, trim: true },
    cost: { type: Number, default: 0 },
    splitWith: [{ type: mongoose.Schema.Types.ObjectId }],
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date }
}, { timestamps: true })

const Misc = mongoose.model('Misc', miscSchema)
module.exports = Misc