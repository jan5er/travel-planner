const User = require('../models/User')
const bcrypt = require('bcrypt')

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.updateMe = async (req, res) => {
    try {
        console.log('updateMe called, user:', req.user)
        console.log('body:', req.body)
        const { name, avatar } = req.body
        const user = await User.findById(req.user._id)
        console.log('found user:', user)

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
}

        if (name !== undefined) user.name = name
        if (avatar !== undefined) user.avatar = avatar

        try {
            await user.save()
            console.log('saved successfully')
        } catch (saveErr) {
            console.error('save error:', saveErr.message)
        }
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            name: user.name,
            avatar: user.avatar
        })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};