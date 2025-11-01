const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'parking.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    return;
  }
  console.log('Connected to parking.db');
});

db.serialize(() => {
  // List all tables
  db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
    if (err) {
      console.error('Error listing tables:', err.message);
      db.close();
      return;
    }
    console.log('Tables in database:', tables.map(t => t.name));

    // Check schema of parking_lots table
    db.all("PRAGMA table_info(parking_lots);", (err, columns) => {
      if (err) {
        console.error('Error getting table schema:', err.message);
      } else {
        console.log('Columns in parking_lots:', columns);
      }

      // Check contents of parking_lots
      db.all("SELECT * FROM parking_lots;", (err, rows) => {
        if (err) {
          console.error('Error selecting from parking_lots:', err.message);
        } else {
          console.log('Rows in parking_lots:', rows);
        }
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('Database connection closed');
          }
        });
      });
    });
  });
});