const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

// Cache for Google's public keys
let googlePublicKeys = null;
let keysExpiry = 0;

/**
 * Fetch Google's public keys for JWT verification
 */
async function getGooglePublicKeys() {
  const now = Date.now();
  
  // Use cache if not expired
  if (googlePublicKeys && keysExpiry > now) {
    return googlePublicKeys;
  }

  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v1/certs');
    googlePublicKeys = response.data;
    // Cache for 1 hour
    keysExpiry = now + (60 * 60 * 1000);
    return googlePublicKeys;
  } catch (error) {
    console.error('Failed to fetch Google public keys:', error.message);
    throw error;
  }
}

/**
 * Verify IAP JWT token
 */
async function verifyIAPToken(token, expectedAudience) {
  try {
    // Decode without verification first to get the header
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded) {
      throw new Error('Invalid token format');
    }

    // Get Google's public keys
    const keys = await getGooglePublicKeys();
    const keyId = decoded.header.kid;
    
    if (!keys[keyId]) {
      throw new Error(`Key ID ${keyId} not found in Google public keys`);
    }

    const publicKey = keys[keyId];

    // Verify the token
    const verified = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      audience: expectedAudience
    });

    return verified;
  } catch (error) {
    console.error('IAP token verification failed:', error.message);
    throw error;
  }
}

/**
 * IAP Authentication Middleware
 * Verifies Google Identity-Aware Proxy JWT token
 * 
 * Set DISABLE_IAP_VALIDATION=true in environment to skip validation (dev/local only)
 */
const iapAuth = async (req, res, next) => {
  try {
    // Allow bypassing IAP validation for local development
    if (process.env.DISABLE_IAP_VALIDATION === 'true') {
      console.warn('[WARNING] IAP validation is disabled. This should only be used in development.');
      
      // Create/upsert user in database
      const User = require('../models/User');
      const [user] = await User.findOrCreate({
        where: { iapId: 'dev-user' },
        defaults: {
          id: 'dev-user',
          email: 'dev@example.com',
          name: 'Development User',
          iapId: 'dev-user',
          role: 'user'
        }
      });
      
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        iapId: user.iapId,
        role: user.role || 'user'
      };
      return next();
    }

    console.log(`[AUTH] IAP validation enabled`);
    console.log(`[AUTH] Authorization header: ${req.headers.authorization ? 'Present' : 'Missing'}`);

    // Get IAP JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing Authorization header'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid Authorization header format'
      });
    }

    const iapJwt = parts[1];

    // Get the expected audience (Cloud Run service URL or project ID)
    const expectedAudience = process.env.IAP_AUDIENCE || `/projects/${process.env.GCP_PROJECT_ID}/global/backendServices/YOUR_SERVICE_ID`;
    
    // Verify the JWT token
    const decoded = await verifyIAPToken(iapJwt, expectedAudience);

    // Create/upsert user in database
    const User = require('../models/User');
    const [user] = await User.findOrCreate({
      where: { iapId: decoded.sub },
      defaults: {
        email: decoded.email || 'no-email@example.com',
        name: decoded.name || decoded.email || 'Unknown User',
        iapId: decoded.sub,
        role: 'user'
      }
    });

    // Extract user information from token
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      iapId: user.iapId,
      role: user.role || 'user'
    };

    console.log(`[AUTH] User authenticated: ${user.email}`);
    next();
  } catch (error) {
    console.error('[AUTH] Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: ' + error.message
    });
  }
};

/**
 * Role-based Authorization Middleware
 */
const authorize = (requiredRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not found'
      });
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = {
  iapAuth,
  authorize
};
