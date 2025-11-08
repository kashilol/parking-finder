const bcrypt = require('bcryptjs');

const password = 'Admin123'; // Replace with your desired new password
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) throw err;
  console.log('New bcrypt hash:', hash);
});
