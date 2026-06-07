const { Trip, MEMBER_COLORS } = require('../models/Trip.js');
const User = require('../models/User')
const crypto = require('crypto')
const mongoose = require('mongoose')

exports.createTrip = async (req, res) => {
    // console.log('req.user:', req.user)
    try {
        const { title, description, startDate, endDate } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        const color = Trip.getRandomUniqueColor([]);
        const trip = await Trip.create({
            title,
            createdBy: req.user._id,
            members: [{ user: req.user._id, color }],
            description,
            startDate,
            endDate
        });
        console.log('Created trip:', trip);
        res.status(201).json(trip);
    } catch (err) {
        console.error('Error creating trip:', err)
        res.status(500).json({ message: 'Server error' })
    }
}

exports.getTrips = async (req, res) => {
    try {
        const trips = await Trip.find({ 
            $or: [{ createdBy: req.user._id }, { 'members.user': req.user._id }] // Najdemo vsa potovanje, kjer je uporabnik ali owner ali pa member
        })
        .populate('createdBy', 'username name avatar')
        .populate('members.user', 'username name avatar')
        .sort({ startDate: 1 }) // Najprej potovanja, ki se začnejo najprej

        res.json(trips);
    } catch (err) {
        console.error('Error fetching trips:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.getTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
            .populate('createdBy', 'username name avatar')
            .populate('members.user', 'username name avatar')
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user._id.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        res.json(trip);
    } catch (err) {
        console.error('Error fetching trip:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.updateTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const allowedEdits = ['title', 'description', 'coverImage', 'startDate', 'endDate'];
        allowedEdits.forEach(field => {
            if (req.body[field] !== undefined) {
                trip[field] = req.body[field];
            }
        });

        await trip.save()
        await trip.populate('members.user', 'username name avatar')
        await trip.populate('createdBy', 'username name avatar')
        res.json(trip);
    } catch (err) {
        console.error('Error updating trip:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.addMember = async (req, res) => {
    try {
        const { usernameOrEmail } = req.body
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const userToAdd = await User.findOne({
            $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }]
        });
        if (!userToAdd) return res.status(404).json({ message: 'User not found' });
        
        const alreadyMember = trip.members.some(m => m.user.toString() === userToAdd._id.toString());
        if (alreadyMember) return res.status(400).json({ message: 'User is already a member' });

        const color = Trip.getRandomUniqueColor(trip.members);
        trip.members.push({ user: userToAdd._id, color });
        await trip.save();
        await trip.populate('members.user', 'username name avatar');
        res.json(trip);
    } catch (err) {
        console.error('Error adding member:', err);
        res.status(500).json({ message: 'Server error' });
    } 
}

exports.removeMember = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        if (req.params.memberId === trip.createdBy.toString()) {
            return res.status(400).json({ message: 'Cannot remove the trip creator' });
        }

        trip.members = trip.members.filter(m => m.user.toString() !== req.params.memberId);
        await trip.save();
        res.json(trip);
    } catch (err) {
        console.error('Error removing member:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.generateInvite = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        trip.inviteCode = crypto.randomBytes(8).toString('hex');
        await trip.save();
        res.json({ inviteCode: trip.inviteCode });
    } catch (err) {
        console.error('Error generating invite code:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.deleteTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        await trip.deleteOne();
        res.json({ message: 'Trip deleted' });
    } catch (err) {
        console.error('Error deleting trip:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.joinByInvite = async (req, res) => {
    try {
        const trip = await Trip.findOne({ inviteCode: req.params.code });
        if (!trip) return res.status(404).json({ message: 'Invalid invite code' });

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (isMember) return res.status(400).json({ message: 'Already a member of this trip' });

        const color = Trip.getRandomUniqueColor(trip.members);
        trip.members.push({ user: req.user._id, color });
        await trip.save();

        await trip.populate('members.user', 'username name avatar');
        res.json(trip);
    } catch (err) {
        console.error('Error joining by invite code:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.updateMemberColor = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
        if (!trip) return res.status(404).json({ message: 'Trip not found' })

        const member = trip.members.find(m => m.user.toString() === req.params.userId)
        if (!member) return res.status(404).json({ message: 'Member not found' })

        member.color = req.body.color
        await trip.save()
        await trip.populate('members.user', 'username name avatar')
        res.json(trip)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.addNote = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
        if (!trip) return res.status(404).json({ message: 'Trip not found' })

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' })

        const { title, content } = req.body
        if (!title) return res.status(400).json({ message: 'Title is required' })

        trip.notes.push({ title, content, addedBy: req.user._id })
        await trip.save()
        const newNote = trip.notes[trip.notes.length - 1]
        await trip.populate('notes.addedBy', 'username name avatar')
        res.json(newNote)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.deleteNote = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
        if (!trip) return res.status(404).json({ message: 'Trip not found' })

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' })

        const note = trip.notes.id(req.params.noteId)
        if (!note) return res.status(404).json({ message: 'Note not found' })

        trip.notes.pull({ _id: req.params.noteId })
        await trip.save()
        res.json({ message: 'Note deleted' })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.updateNote = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
        if (!trip) return res.status(404).json({ message: 'Trip not found' })

        const isMember = trip.members.some(m => m.user.toString() === req.user._id);
        if (!isMember) return res.status(403).json({ message: 'Not authorized' })

        const note = trip.notes.id(req.params.noteId)
        if (!note) return res.status(404).json({ message: 'Note not found' })

        const { title, content } = req.body
        if (title !== undefined) note.title = title
        if (content !== undefined) note.content = content
        await trip.save()
        await trip.populate('notes.addedBy', 'username name avatar')
        res.json(note)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

exports.getExpenses = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
        if (!trip) return res.status(404).json({ message: 'Trip not found' })

        const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) return res.status(403).json({ message: 'Not authorized' })

        const Stay = require('../models/Stay')
        const Transport = require('../models/Transport')
        const Attraction = require('../models/Attraction')

        const cities = await require('../models/City').find({ tripId: req.params.id })

        const [stays, transports, attractions] = await Promise.all([
            Stay.find({ tripId: req.params.id, isSelected: true }),
            Transport.find({ tripId: req.params.id, isConfirmed: true }),
            Attraction.find({ tripId: req.params.id })
        ])

        const perCity = {}
        cities.forEach(city => {
            perCity[city._id] = {
                name: city.name,
                stays: 0, transport: 0, attractions: 0, misc: 0,
                total: 0, 
                perPerson: {},
                perPersonByCategory: {}
            }
        })

        const perCategoryPerPerson = {
            stays: {}, transport: {}, attractions: {}, misc: {}
        }

        const addExpense = (cityId, category, cost, splitWith) => {
            const key = cityId?.toString()
            if (!perCity[key]) return
            perCity[key][category] += cost
            perCity[key].total += cost
            if (splitWith?.length) {
                const share = cost / splitWith.length
                splitWith.forEach(uid => {
                    const uidStr = uid.toString()

                    // total per person per city
                    perCity[key].perPerson[uidStr] = (perCity[key].perPerson[uidStr] || 0) + share

                    // per category per person per city
                    if (!perCity[key].perPersonByCategory[category]) {
                        perCity[key].perPersonByCategory[category] = {}
                    }
                    perCity[key].perPersonByCategory[category][uidStr] = 
                        (perCity[key].perPersonByCategory[category][uidStr] || 0) + share

                    // global per category per person
                    perCategoryPerPerson[category][uidStr] = 
                        (perCategoryPerPerson[category][uidStr] || 0) + share
                })
            }
        }

        stays.forEach(s => {
            const cost = s.cost || 0
            addExpense(s.cityId, 'stays', cost, s.splitWith)
        })

        transports.forEach(t => {
            const cost = t.cost || 0
            addExpense(t.cityId, 'transport', cost, t.splitWith)
        })

        attractions.forEach(a => {
            const cost = a.cost || 0
            addExpense(a.cityId, 'attractions', cost, a.splitWith)
        })

        const total = {
            stays: 0, transport: 0, attractions: 0, misc: 0, grand: 0
        }
        Object.values(perCity).forEach(c => {
            total.stays += c.stays
            total.transport += c.transport
            total.attractions += c.attractions
            total.misc += c.misc
            total.grand += c.total
        })

        res.json({ perCity, total, perCategoryPerPerson })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}