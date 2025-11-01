const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['standard', 'day', 'special', 'free_windows'], 
    required: true 
  },
  // Standard pricing fields
  first_block_duration: Number,
  first_block_price: Number,
  additional_block_duration: Number,
  additional_block_price: Number,
  minimum_price: Number,
  max_daily_price: Number,
  single_entrance_price: Number,
  app_first_block_price: Number,
  app_additional_block_price: Number,
  app_max_daily_price: Number,
  
  // Day-specific fields
  day: String,
  price: Number,
  night_start: String,
  night_end: String,
  night_price: Number,
  day_price: Number,
  app_price: Number,
  app_night_price: Number,
  app_day_price: Number,
  reset_time: String,
  
  // Special pricing fields
  resident_discount: Number,
  disabled_discount: Number,
  app_discount: Number,
  custom_tags: [{
    tag: String,
    discount: Number
  }],
  
  // Free windows
  free_intervals: [String]
}, { _id: false });

const parkingLotSchema = new mongoose.Schema({
  street_name: { 
    type: String, 
    required: true, 
    trim: true,
    index: true 
  },
  address: { 
    type: String, 
    required: true,
    trim: true 
  },
  location: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], 
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates'
      }
    }
  },
  operating_hours: { 
    type: String, 
    default: '24/7' 
  },
  total_spots: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  ownership_type: { 
    type: String, 
    enum: ['Public', 'Private'],
    default: 'Public'
  },
  pricing_strategy: {
    type: String,
    enum: ['hourly_blocks', 'minute_blocks', 'flat_daily', 'progressive'],
    default: 'hourly_blocks'
  },
  pricing_rules: [pricingRuleSchema],
  notes: String,
  last_modified_by: {
    type: String,
    default: 'admin'
  }
}, { 
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Create geospatial index for location-based queries
parkingLotSchema.index({ location: '2dsphere' });

// Virtual field to get latitude
parkingLotSchema.virtual('latitude').get(function() {
  return this.location.coordinates[1];
});

// Virtual field to get longitude
parkingLotSchema.virtual('longitude').get(function() {
  return this.location.coordinates[0];
});

// Ensure virtuals are included in JSON
parkingLotSchema.set('toJSON', { virtuals: true });
parkingLotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ParkingLot', parkingLotSchema);
