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

const parkingLots = [
  {
    street_name: 'HaYarkon St',
    address: 'HaYarkon St 181, Tel Aviv, Israel',
    latitude: 32.0866,
    longitude: 34.7738,
    operating_hours: '24/7',
    total_spots: 300,
    ownership_type: 'Public',
    pricing_rules: [
      {
        type: 'standard',
        free_minutes: 30,
        first_block_duration: 60,
        first_block_price: 10.0,
        additional_block_duration: 15,
        additional_block_price: 2.5,
        minimum_price: 0.0,
        max_daily_price: 60.0,
        single_entrance_price: null,
        app_first_block_price: 9.0,
        app_additional_block_price: 2.25,
        app_max_daily_price: 54.0
      },
      {
        type: 'day',
        day: 'sunday',
        price: 50.0,
        night_start: '20:00',
        night_end: '08:00',
        night_price: 30.0,
        day_price: 50.0,
        app_price: 45.0,
        app_night_price: 27.0,
        app_day_price: 45.0
      },
      {
        type: 'day',
        day: 'monday',
        price: 50.0,
        night_start: '20:00',
        night_end: '08:00',
        night_price: 30.0,
        day_price: 50.0,
        app_price: 45.0,
        app_night_price: 27.0,
        app_day_price: 45.0
      },
      {
        type: 'day',
        day: 'tuesday',
        price: 50.0,
        night_start: '20:00',
        night_end: '08:00',
        night_price: 30.0,
        day_price: 50.0,
        app_price: 45.0,
        app_night_price: 27.0,
        app_day_price: 45.0
      },
      {
        type: 'day',
        day: 'wednesday',
        price: 50.0,
        night_start: '20:00',
        night_end: '08:00',
        night_price: 30.0,
        day_price: 50.0,
        app_price: 45.0,
        app_night_price: 27.0,
        app_day_price: 45.0
      },
      {
        type: 'day',
        day: 'thursday',
        price: 50.0,
        night_start: '20:00',
        night_end: '08:00',
        night_price: 30.0,
        day_price: 50.0,
        app_price: 45.0,
        app_night_price: 27.0,
        app_day_price: 45.0
      },
      {
        type: 'day',
        day: 'friday',
        price: 50.0,
        night_start: '20:00',
        night_end: '08:00',
        night_price: 30.0,
        day_price: 50.0,
        app_price: 45.0,
        app_night_price: 27.0,
        app_day_price: 45.0
      },
      {
        type: 'day',
        day: 'saturday',
        price: 50.0,
        night_start: '20:00',
        night_end: '08:00',
        night_price: 30.0,
        day_price: 50.0,
        app_price: 45.0,
        app_night_price: 27.0,
        app_day_price: 45.0
      },
      {
        type: 'free_windows',
        free_intervals: []
      },
      {
        type: 'special',
        resident_discount: 0.2,
        disabled_discount: 0.15,
        app_discount: 0.1,
        custom_tags: []
      }
    ],
    notes: 'Popular lot near the beach, high demand during evenings.',
    last_modified: '2025-08-06T17:00:00Z',
    last_modified_by: 'admin'
  },
  {
    street_name: 'Dizengoff St',
    address: 'Dizengoff St 89, Tel Aviv, Israel',
    latitude: 32.0779,
    longitude: 34.7740,
    operating_hours: '06:00-22:00',
    total_spots: 150,
    ownership_type: 'Private',
    pricing_rules: [
      {
        type: 'standard',
        free_minutes: 0,
        first_block_duration: 60,
        first_block_price: 12.0,
        additional_block_duration: 15,
        additional_block_price: 3.0,
        minimum_price: 0.0,
        max_daily_price: 80.0,
        single_entrance_price: null,
        app_first_block_price: 10.2,
        app_additional_block_price: 2.55,
        app_max_daily_price: 68.0
      },
      {
        type: 'day',
        day: 'sunday',
        price: 60.0,
        night_start: '20:00',
        night_end: '22:00',
        night_price: 40.0,
        day_price: 60.0,
        app_price: 51.0,
        app_night_price: 34.0,
        app_day_price: 51.0
      },
      {
        type: 'day',
        day: 'monday',
        price: 60.0,
        night_start: '20:00',
        night_end: '22:00',
        night_price: 40.0,
        day_price: 60.0,
        app_price: 51.0,
        app_night_price: 34.0,
        app_day_price: 51.0
      },
      {
        type: 'day',
        day: 'tuesday',
        price: 60.0,
        night_start: '20:00',
        night_end: '22:00',
        night_price: 40.0,
        day_price: 60.0,
        app_price: 51.0,
        app_night_price: 34.0,
        app_day_price: 51.0
      },
      {
        type: 'day',
        day: 'wednesday',
        price: 60.0,
        night_start: '20:00',
        night_end: '22:00',
        night_price: 40.0,
        day_price: 60.0,
        app_price: 51.0,
        app_night_price: 34.0,
        app_day_price: 51.0
      },
      {
        type: 'day',
        day: 'thursday',
        price: 60.0,
        night_start: '20:00',
        night_end: '22:00',
        night_price: 40.0,
        day_price: 60.0,
        app_price: 51.0,
        app_night_price: 34.0,
        app_day_price: 51.0
      },
      {
        type: 'day',
        day: 'friday',
        price: 60.0,
        night_start: '20:00',
        night_end: '22:00',
        night_price: 40.0,
        day_price: 60.0,
        app_price: 51.0,
        app_night_price: 34.0,
        app_day_price: 51.0
      },
      {
        type: 'day',
        day: 'saturday',
        price: 60.0,
        night_start: '20:00',
        night_end: '22:00',
        night_price: 40.0,
        day_price: 60.0,
        app_price: 51.0,
        app_night_price: 34.0,
        app_day_price: 51.0
      },
      {
        type: 'free_windows',
        free_intervals: []
      },
      {
        type: 'special',
        resident_discount: 0.1,
        disabled_discount: 0.1,
        app_discount: 0.15,
        custom_tags: []
      }
    ],
    notes: 'Convenient for Dizengoff Square shopping and dining.',
    last_modified: '2025-08-06T17:00:00Z',
    last_modified_by: 'admin'
  }
];

db.serialize(() => {
  // Create the parking_lots table
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
      console.error('Error creating parking_lots table:', err.message);
      db.close();
      process.exit(1);
    }
    console.log('parking_lots table created or already exists');

    // Clear existing data to remove old entries
    db.run(`DELETE FROM parking_lots;`, (err) => {
      if (err) {
        console.error('Error clearing parking_lots table:', err.message);
      } else {
        console.log('Cleared existing data in parking_lots');
      }

      // Insert parking lots
      const insertStmt = db.prepare(`
        INSERT INTO parking_lots (
          street_name, address, latitude, longitude, operating_hours,
          total_spots, ownership_type, pricing_rules, notes, last_modified, last_modified_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let completedInserts = 0;
      const totalInserts = parkingLots.length;

      parkingLots.forEach((lot) => {
        insertStmt.run(
          lot.street_name,
          lot.address,
          lot.latitude,
          lot.longitude,
          lot.operating_hours,
          lot.total_spots,
          lot.ownership_type,
          JSON.stringify(lot.pricing_rules),
          lot.notes,
          lot.last_modified,
          lot.last_modified_by,
          (err) => {
            if (err) {
              console.error(`Error inserting ${lot.street_name}:`, err.message);
            } else {
              console.log(`Successfully inserted ${lot.street_name}`);
            }
            completedInserts++;
            if (completedInserts === totalInserts) {
              insertStmt.finalize((err) => {
                if (err) {
                  console.error('Error finalizing statement:', err.message);
                } else {
                  console.log('All parking lots inserted successfully');
                }
                db.close((err) => {
                  if (err) {
                    console.error('Error closing database:', err.message);
                  } else {
                    console.log('Database connection closed');
                  }
                });
              });
            }
          }
        );
      });
    });
  });
});