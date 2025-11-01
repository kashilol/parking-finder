const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Verify JWT token for protected routes
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    
    req.admin = decoded;
    next();
  });
};

// Login handler
const loginAdmin = async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  
  try {
    const isValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { role: 'admin', loginTime: Date.now() }, 
      process.env.JWT_SECRET, 
      { expiresIn: '8h' }
    );
    
    res.json({ 
      token,
      expiresIn: 8 * 60 * 60 // 8 hours in seconds
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = { verifyAdmin, loginAdmin };
