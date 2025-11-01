const fs = require('fs');
const axios = require('axios');

const lots = JSON.parse(fs.readFileSync('seeds/initialParkingLots.json', 'utf8'));

async function seedDatabase() {
  for (const lot of lots) {
    try {
      await axios.post('http://localhost:3000/parking-lots', lot, {
        headers: { 'Content-Type': 'application/json', 'x-admin-password': 'admin123' }
      });
      console.log(`Added ${lot.street_name}`);
    } catch (error) {
      console.error(`Failed to add ${lot.street_name}:`, error.message);
    }
  }
}

seedDatabase();