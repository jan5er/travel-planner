const mongoose = require('mongoose')

const MEMBER_COLORS = [
    '#4f8ef7',
    '#f7774f', 
    '#4fcc8e',
    '#cc4fcc',
    '#f7d14f',
    '#4fccc4',
    '#f74f7a',
    '#a0f74f',
    '#4f7af7',
    '#ee3838ff',
]

const memberSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    color: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

const tripSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    coverImage: { type: String, trim: true, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
    inviteCode: { type: String, unique: true, sparse: true },
    notes: [noteSchema],
}, { timestamps: true });

tripSchema.statics.getRandomUniqueColor = function(members) {
    const usedColors = members.map(m => m.color);
    const availableColors = MEMBER_COLORS.filter(color => !usedColors.includes(color));

    if (availableColors.length === 0) {
        return MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)];
    } 
    return availableColors[Math.floor(Math.random() * availableColors.length)];
}

const Trip = mongoose.model('Trip', tripSchema);
module.exports = { Trip, MEMBER_COLORS }