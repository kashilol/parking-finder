const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const ParkingLot = require('./models/ParkingLot');
const { verifyAdmin, loginAdmin } = require('./middleware/auth');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Stricter rate limit for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.'
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✓ Connected to MongoDB Atlas');
  })
  .catch(err => {
    console.error('✗ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Admin login (public route)
app.post('/api/admin/login', authLimiter, loginAdmin);

// Get all parking lots (public)
app.get('/api/parking-lots', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    
    let query = {};
    
    // If location params provided, use geospatial query
    if (lat && lng && radius) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusMeters = parseInt(radius);
      
      if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusMeters)) {
        return res.status(400).json({ error: 'Invalid location parameters' });
      }
      
      query = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude] // [lng, lat] order
            },
            $maxDistance: radiusMeters
          }
        }
      };
    }
    
    const lots = await ParkingLot.find(query)
      .select('-__v') // Exclude version key
      .lean(); // Return plain JavaScript objects for better performance
    
    console.log(`Fetched ${lots.length} parking lots`);
    res.json(lots);
  } catch (error) {
    console.error('Error fetching parking lots:', error);
    res.status(500).json({ error: 'Failed to fetch parking lots: ' + error.message });
  }
});

// Get single parking lot by ID (public)
app.get('/api/parking-lots/:id', async (req, res) => {
  try {
    const lot = await ParkingLot.findById(req.params.id).select('-__v');
    
    if (!lot) {
      return res.status(404).json({ error: 'Parking lot not found' });
    }
    
    res.json(lot);
  } catch (error) {
    console.error('Error fetching parking lot:', error);
    res.status(500).json({ error: 'Failed to fetch parking lot: ' + error.message });
  }
});

// Create new parking lot (protected)
app.post('/api/parking-lots', verifyAdmin, async (req, res) => {
  try {
    const { latitude, longitude, ...data } = req.body;
    
    // Validate required fields
    if (!data.street_name || !data.address || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required fields: street_name, address, latitude, longitude' 
      });
    }
    
    // Create parking lot with location
    const parkingLot = new ParkingLot({
      ...data,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      last_modified_by: req.admin.role
    });
    
    await parkingLot.save();
    
    console.log(`Created parking lot: ${parkingLot.street_name} (ID: ${parkingLot._id})`);
    res.status(201).json({ 
      id: parkingLot._id,
      message: 'Parking lot created successfully',
      data: parkingLot
    });
  } catch (error) {
    console.error('Error creating parking lot:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({ error: 'Failed to create parking lot: ' + error.message });
  }
});

// Update parking lot (protected)
app.put('/api/parking-lots/:id', verifyAdmin, async (req, res) => {
  try {
    const { latitude, longitude, ...data } = req.body;
    
    // Validate required fields
    if (!data.street_name || !data.address || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required fields: street_name, address, latitude, longitude' 
      });
    }
    
    // Update data
    const updateData = {
      ...data,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      last_modified_by: req.admin.role
    };
    
    const updatedLot = await ParkingLot.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, // Return updated document
        runValidators: true // Run schema validators
      }
    );
    
    if (!updatedLot) {
      return res.status(404).json({ error: 'Parking lot not found' });
    }
    
    console.log(`Updated parking lot: ${updatedLot.street_name} (ID: ${updatedLot._id})`);
    res.json({ 
      id: updatedLot._id,
      message: 'Parking lot updated successfully',
      data: updatedLot
    });
  } catch (error) {
    console.error('Error updating parking lot:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid parking lot ID' });
    }
    
    res.status(500).json({ error: 'Failed to update parking lot: ' + error.message });
  }
});

// Delete parking lot (protected)
app.delete('/api/parking-lots/:id', verifyAdmin, async (req, res) => {
  try {
    const deletedLot = await ParkingLot.findByIdAndDelete(req.params.id);
    
    if (!deletedLot) {
      return res.status(404).json({ error: 'Parking lot not found' });
    }
    
    console.log(`Deleted parking lot: ${deletedLot.street_name} (ID: ${deletedLot._id})`);
    res.json({ 
      id: deletedLot._id,
      message: 'Parking lot deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting parking lot:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid parking lot ID' });
    }
    
    res.status(500).json({ error: 'Failed to delete parking lot: ' + error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error' 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received, shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});
