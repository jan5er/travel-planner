require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const tripRoutes = require('./routes/tripRoutes');
const cityRoutes = require('./routes/cityRoutes')
const userRoutes = require('./routes/userRoutes')

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/trips', tripRoutes);
app.use('/api/trips', cityRoutes);
app.use('/api/users', userRoutes);

mongoose.connect(process.env.MONGO_URI, { dbName: 'travelplanner' })
    .then(() => console.log('Connected to the database'))
    .catch((error) => console.error('Error connecting to the database:', error));

mongoose.connection.on('connected', () => console.log('Mongoose connected'))
mongoose.connection.on('error', (err) => console.log('Mongoose error:', err))
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'))

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));