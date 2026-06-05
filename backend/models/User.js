const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: 'images/default-avatar.png'
    }
}, { timestamps: true }); // s tem avtomatsko dodamo createdAt in updatedAt polja

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    if (!this.name) this.name = this.username; // Če name ni podan, nastavi na username
    this.password = await bcrypt.hash(this.password, 10);
});

const User = mongoose.model('User', userSchema);
module.exports = User;