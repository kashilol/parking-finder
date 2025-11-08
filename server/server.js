const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();


const app = express();


// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:8080', 'http://localhost:5173', 'https://parking-finder-five.vercel.app'];


app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-admin-password'],
  credentials: true
}));


app.use(express.json());


// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✓ Connected to MongoDB Atlas'))
  .catch((err) => console.error('✗ MongoDB connection error:', err.message));


// Parking Lot Schema
const parkingLotSchema = new mongoose.Schema({
  street_name: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  latitude: Number,
  longitude: Number,
  operating_hours: { type: String, default: '24/7' },
  total_spots: { type: Number, default: 0 },
  ownership_type: {
    type: String,
    enum: ['Public', 'Private'],
    default: 'Public'
  },
  pricing_strategy: { type: String, default: 'hourly_blocks' },
  pricing_rules: [
    {
      type: { type: String },
      first_block_duration: Number,
      first_block_price: Number,
      app_first_block_price: Number,
      additional_block_duration: Number,
      additional_block_price: Number,
      max_daily_price: Number,
      single_entrance_price: Number,
      resident_discount: Number,
      disabled_discount: Number
    }
  ],
  notes: String,
  last_modified: { type: Date, default: Date.now },
  last_modified_by: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


// Create geospatial index for location-based queries
parkingLotSchema.index({ 'location.coordinates': '2dsphere' });


const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);


// Routes


// Get all parking lots
app.get('/api/parking-lots', async (req, res) => {
  try {
    const lots = await ParkingLot.find();
    console.log('Fetched parking lots:', lots.length);
    res.json(lots);
  } catch (err) {
    console.error('Error fetching parking lots:', err.message);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});


// Search parking lots by location
app.post('/api/parking-lots/search', async (req, res) => {
  try {
    const { lat, lon, radius = 5000 } = req.body;


    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }


    const lots = await ParkingLot.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: radius
        }
      }
    });


    res.json(lots);
  } catch (err) {
    console.error('Error searching parking lots:', err.message);
    res.status(500).json({ error: 'Search error: ' + err.message });
  }
});


// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;


    if (!password || password !== adminPasswordHash) {
      return res.status(401).json({ error: 'Invalid password' });
    }


    res.json({ success: true, token: 'admin-token' });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login error: ' + err.message });
  }
});


// Add parking lot (Admin only)
app.post('/api/parking-lots', async (req, res) => {
  try {
    const adminPassword = req.headers['x-admin-password'];
    
    if (adminPassword !== process.env.ADMIN_PASSWORD_HASH) {
      return res.status(401).json({ error: 'Unauthorized' });
    }


    const {
      street_name, address, latitude, longitude, operating_hours = '24/7',
      total_spots = 0, ownership_type, pricing_strategy, pricing_rules, notes
    } = req.body;


    if (!street_name || !address || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }


    const newLot = new ParkingLot({
      street_name,
      address,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      latitude,
      longitude,
      operating_hours,
      total_spots,
      ownership_type: ownership_type || 'Public',
      pricing_strategy: pricing_strategy || 'hourly_blocks',
      pricing_rules: pricing_rules || [],
      notes,
      last_modified_by: 'admin'
    });


    await newLot.save();
    console.log(`Parking lot added with ID: ${newLot._id}`);
    res.json({ id: newLot._id });
  } catch (err) {
    console.error('Error adding parking lot:', err.message);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});


// Update parking lot (Admin only)
app.put('/api/parking-lots/:id', async (req, res) => {
  try {
    const adminPassword = req.headers['x-admin-password'];
    
    if (adminPassword !== process.env.ADMIN_PASSWORD_HASH) {
      return res.status(401).json({ error: 'Unauthorized' });
    }


    const { id } = req.params;
    const updates = req.body;
    updates.last_modified = new Date();
    updates.last_modified_by = 'admin';


    // Handle location coordinates
    if (updates.latitude && updates.longitude) {
      updates.location = {
        type: 'Point',
        coordinates: [updates.longitude, updates.latitude]
      };
    }


    const updatedLot = await ParkingLot.findByIdAndUpdate(id, updates, { new: true });


    if (!updatedLot) {
      return res.status(404).json({ error: 'Parking lot not found' });
    }


    console.log(`Parking lot updated with ID: ${id}`);
    res.json(updatedLot);
  } catch (err) {
    console.error('Error updating parking lot:', err.message);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});


// Delete parking lot (Admin only)
app.delete('/api/parking-lots/:id', async (req, res) => {
  try {
    const adminPassword = req.headers['x-admin-password'];
    
    if (adminPassword !== process.env.ADMIN_PASSWORD_HASH) {
      return res.status(401).json({ error: 'Unauthorized' });
    }


    const { id } = req.params;
    const deletedLot = await ParkingLot.findByIdAndDelete(id);


    if (!deletedLot) {
      return res.status(404).json({ error: 'Parking lot not found' });
    }


    console.log(`Parking lot deleted with ID: ${id}`);
    res.json({ id });
  } catch (err) {
    console.error('Error deleting parking lot:', err.message);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});


// Proxy Geoapify autocomplete requests
app.post('/api/geocode/autocomplete', async (req, res) => {
  try {
    const { text, limit = 6, lang = 'en' } = req.body;
    const lat = 32.0853;
    const lon = 34.7818;
    
    // Filter to Tel Aviv - Israel only
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&limit=${limit}&lang=${lang}&apiKey=${process.env.GEOAPIFY_API_KEY}&filter=rect:34.7413,32.0404,34.8516,32.1502&bias=proximity:${lon},${lat}`;

    const response = await fetch(url);
    const data = await response.json();
    
    // Format the results to be cleaner
    const formattedData = {
      ...data,
      features: data.features.map(feature => {
        const props = feature.properties;
        
        // Build a clean name
        let name = props.street || props.name || props.address_line1 || '';
        let subtext = 'Tel Aviv, Israel';
        
        // Add house number if available
        if (props.housenumber) {
          name = `${name} ${props.housenumber}`;
        }
        
        // Add district/neighborhood if available
        if (props.district || props.suburb) {
          subtext = `${props.district || props.suburb}, Tel Aviv`;
        }
        
        return {
          ...feature,
          properties: {
            ...props,
            formatted: name,
            subtext: subtext
          }
        };
      })
    };
    
    res.json(formattedData);
  } catch (err) {
    console.error('Geoapify autocomplete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});



// Proxy Geoapify search requests
app.post('/api/geocode/search', async (req, res) => {
  try {
    const { text, lang = 'en' } = req.body;

    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text)}&limit=1&lang=${lang}&apiKey=${process.env.GEOAPIFY_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Geoapify search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});


process.on('SIGINT', () => {
  console.log('Closing database connection');
  mongoose.connection.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});
