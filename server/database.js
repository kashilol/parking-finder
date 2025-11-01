const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../parking.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err);
  } else {
    console.log('Connected to SQLite database.');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS parking_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      street_name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      operating_hours TEXT DEFAULT '24/7',
      total_spots INTEGER DEFAULT 0,
      ownership_type TEXT CHECK(ownership_type IN ('Private', 'Public')),
      pricing_rules TEXT,
      notes TEXT,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_modified_by TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating parking_lots table:', err);
    } else {
      console.log('parking_lots table created or already exists.');
    }
  });
});

module.exports = db;