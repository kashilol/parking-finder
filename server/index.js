const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-admin-password']
}));
app.use(express.json());

const db = new sqlite3.Database('../Task-Manager/parking.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
    return;
  }
  console.log('Connected to SQLite database.');
  
  // Create parking_lots table with new schema
  db.run(`CREATE TABLE IF NOT EXISTS parking_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    street_name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    operating_hours TEXT DEFAULT '24/7',
    total_spots INTEGER DEFAULT 0,
    ownership_type TEXT CHECK(ownership_type IN ('Private', 'Public')),
    pricing_rules TEXT, -- Store as JSON
    notes TEXT,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_by TEXT
  )`, (err) => {
    if (err) {
      console.error('Error creating parking_lots table:', err.message);
    } else {
      console.log('parking_lots table created or already exists.');
    }
  });

  // Check if migration is needed (i.e., if pricing_rules column doesn't exist)
  db.all("PRAGMA table_info(parking_lots)", [], (err, columns) => {
    if (err) {
      console.error('Error checking table schema:', err.message);
      return;
    }
    const columnNames = columns.map(col => col.name);
    if (!columnNames.includes('pricing_rules')) {
      console.log('Adding pricing_rules column and migrating data...');
      db.serialize(() => {
        // Add pricing_rules column
        db.run('ALTER TABLE parking_lots ADD COLUMN pricing_rules TEXT', err => {
          if (err) console.error('Error adding pricing_rules column:', err.message);
        });

        // Migrate existing data
        db.all('SELECT * FROM parking_lots', [], (err, rows) => {
          if (err) {
            console.error('Error fetching rows for migration:', err.message);
            return;
          }
          rows.forEach(row => {
            const pricing_rules = [
              {
                type: 'standard',
                free_minutes: row.free_minutes || 0,
                first_block_duration: 60,
                first_block_price: row.price_first_hour || 0,
                additional_block_duration: 60,
                additional_block_price: row.price_additional_hour || 0,
                max_daily_price: row.max_daily_price || null,
                single_entrance_price: null,
                app_first_block_price: row.price_first_hour || 0,
                app_additional_block_price: row.price_additional_hour || 0,
                app_max_daily_price: row.max_daily_price || null,
              },
              ...['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => ({
                type: 'day',
                day,
                price: 0,
                night_start: row.night_parking_start || '20:00',
                night_end: row.night_parking_end || '08:00',
                night_price: 0,
                day_price: 0,
                app_price: 0,
                app_night_price: 0,
                app_day_price: 0,
              })),
              {
                type: 'free_windows',
                free_intervals: row.free_parking_days ? row.free_parking_days.split(',') : [],
              },
              {
                type: 'special',
                resident_discount: row.tel_aviv_resident_price ? 1 - (row.tel_aviv_resident_price / row.price_first_hour) : 0,
                disabled_discount: row.disabled_price ? 1 - (row.disabled_price / row.price_first_hour) : 0,
                app_discount: 0,
                custom_tags: row.tags ? row.tags.split(',').map(tag => ({ tag: tag.trim(), discount: 0 })) : [],
              },
            ];
            db.run(
              `UPDATE parking_lots SET pricing_rules = ?, notes = ?, last_modified = ?, last_modified_by = ? WHERE id = ?`,
              [JSON.stringify(pricing_rules), row.notes || '', row.last_updated || new Date().toISOString(), 'migration', row.id],
              err => {
                if (err) console.error('Error updating row during migration:', err.message);
              }
            );
          });
        });
      });
    } else {
      console.log('No migration needed: pricing_rules column exists.');
    }
  });
});

app.get('/parking-lots', (req, res) => {
  db.all('SELECT * FROM parking_lots', [], (err, rows) => {
    if (err) {
      console.error('Error fetching parking lots:', err.message);
      res.status(500).json({ error: 'Database error: ' + err.message });
      return;
    }
    const parsedRows = rows.map(row => ({
      ...row,
      pricing_rules: row.pricing_rules ? JSON.parse(row.pricing_rules) : null,
    }));
    console.log('Fetched parking lots:', parsedRows);
    res.json(parsedRows);
  });
});

app.post('/parking-lots', (req, res) => {
  const adminPassword = req.headers['x-admin-password'];
  if (adminPassword !== 'admin123') {
    console.error('Unauthorized attempt to add parking lot');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    street_name, address, latitude, longitude, operating_hours = '24/7',
    total_spots = 0, ownership_type, pricing_rules, notes, last_modified, last_modified_by
  } = req.body;

  if (!street_name || !address || latitude == null || longitude == null) {
    console.error('Missing required fields:', { street_name, address, latitude, longitude });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedOwnershipType = ownership_type ?
    ownership_type.charAt(0).toUpperCase() + ownership_type.slice(1).toLowerCase() : null;
  if (normalizedOwnershipType && !['Private', 'Public'].includes(normalizedOwnershipType)) {
    console.error('Invalid ownership_type:', ownership_type);
    return res.status(400).json({ error: 'Invalid ownership_type: must be Private or Public' });
  }

  const sql = `INSERT INTO parking_lots (
    street_name, address, latitude, longitude, operating_hours,
    total_spots, ownership_type, pricing_rules, notes, last_modified, last_modified_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    street_name, address, latitude, longitude, operating_hours,
    total_spots, normalizedOwnershipType, pricing_rules ? JSON.stringify(pricing_rules) : null,
    notes, last_modified || new Date().toISOString(), last_modified_by || 'admin'
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error inserting parking lot:', err.message, 'Params:', params);
      res.status(500).json({ error: 'Database error: ' + err.message });
      return;
    }
    console.log(`Parking lot added with ID: ${this.lastID}`);
    res.json({ id: this.lastID });
  });
});

app.put('/parking-lots/:id', (req, res) => {
  const adminPassword = req.headers['x-admin-password'];
  if (adminPassword !== 'admin123') {
    console.error('Unauthorized attempt to edit parking lot');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const {
    street_name, address, latitude, longitude, operating_hours = '24/7',
    total_spots = 0, ownership_type, pricing_rules, notes, last_modified, last_modified_by
  } = req.body;

  if (!street_name || !address || latitude == null || longitude == null) {
    console.error('Missing required fields for update:', { street_name, address, latitude, longitude });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedOwnershipType = ownership_type ?
    ownership_type.charAt(0).toUpperCase() + ownership_type.slice(1).toLowerCase() : null;
  if (normalizedOwnershipType && !['Private', 'Public'].includes(normalizedOwnershipType)) {
    console.error('Invalid ownership_type:', ownership_type);
    return res.status(400).json({ error: 'Invalid ownership_type: must be Private or Public' });
  }

  const sql = `UPDATE parking_lots SET
    street_name = ?, address = ?, latitude = ?, longitude = ?, operating_hours = ?,
    total_spots = ?, ownership_type = ?, pricing_rules = ?, notes = ?,
    last_modified = ?, last_modified_by = ?
    WHERE id = ?`;

  const params = [
    street_name, address, latitude, longitude, operating_hours,
    total_spots, normalizedOwnershipType, pricing_rules ? JSON.stringify(pricing_rules) : null,
    notes, last_modified || new Date().toISOString(), last_modified_by || 'admin', id
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error updating parking lot:', err.message, 'Params:', params);
      res.status(500).json({ error: 'Database error: ' + err.message });
      return;
    }
    if (this.changes === 0) {
      console.error('No parking lot found with ID:', id);
      res.status(404).json({ error: 'Parking lot not found' });
      return;
    }
    console.log(`Parking lot updated with ID: ${id}`);
    res.json({ id });
  });
});

app.delete('/parking-lots/:id', (req, res) => {
  const adminPassword = req.headers['x-admin-password'];
  if (adminPassword !== 'admin123') {
    console.error('Unauthorized attempt to delete parking lot');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  db.run('DELETE FROM parking_lots WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting parking lot:', err.message);
      res.status(500).json({ error: 'Database error: ' + err.message });
      return;
    }
    if (this.changes === 0) {
      console.error('No parking lot found with ID:', id);
      res.status(404).json({ error: 'Parking lot not found' });
      return;
    }
    console.log(`Parking lot deleted with ID: ${id}`);
    res.json({ id });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('Closing database connection');
  db.close((err) => {
    if (err) console.error('Error closing database:', err.message);
    console.log('Database connection closed');
    process.exit(0);
  });
});