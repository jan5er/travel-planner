const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateToken = (user) => {
    return jwt.sign({
        id: user._id,
        username: user.username,
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.register = async (req, res) => {
    try {
        const { username, email, password, name } = req.body;

        const existingUser = await User.findOne(
            { $or: [{ username }, { email }] }
        );
        if (existingUser) return res.status(400).json({ message: 'Username or email already taken' });

        const user = await User.create({ username, email, password, name });
        const token = generateToken(user);
        res.status(201).json({ 
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { login, password } = req.body;
        const user = await User.findOne({
            $or: [{ email: login }, { username: login }]
        });

        if (!user) return res.status(400).json({ message: 'Invalid username/email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid username/email or password' });

        const token = generateToken(user);
        res.json({ 
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                avatar: user.avatar
            } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};