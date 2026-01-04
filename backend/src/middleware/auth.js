const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();
const { getRoleFromEmail, isEmailAllowed } = require('../config/users');

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
 * IAP Authentication Middleware - SIMPLIFIED FOR GCP IAP
 * When IAP is enabled in GCP, it automatically validates the JWT before it reaches your app
 * We just need to extract user info from the JWT payload
 */
const iapAuth = async (req, res, next) => {
  try {
    // Allow CORS preflight requests (OPTIONS) to pass through
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Allow bypassing IAP validation for local development
    if (process.env.DISABLE_IAP_VALIDATION === 'true') {
      req.user = {
        id: 'dev-user-123',
        email: 'dev@example.com',
        name: 'Development User',
        iapId: 'dev-user',
        role: 'superadmin'
      };
      return next();
    }

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

    // Decode JWT (GCP IAP has already validated it)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(iapJwt, { complete: true });
    
    if (!decoded || !decoded.payload) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid JWT'
      });
    }

    const payload = decoded.payload;
    const userEmail = payload.email || payload.sub;
    
    // Check if user is in allowed list
    if (!isEmailAllowed(userEmail)) {
      return res.status(403).json({
        success: false,
        message: `Unauthorized: ${userEmail} is not authorized`
      });
    }

    // Get role from email configuration
    const userRole = getRoleFromEmail(userEmail);

    // Set user info from JWT
    req.user = {
      id: payload.sub || 'unknown',
      email: userEmail,
      name: payload.name || userEmail,
      iapId: payload.sub,
      role: userRole
    };

    console.log(`[AUTH] User: ${userEmail} (${userRole})`);
    next();
  } catch (error) {
    console.error('[AUTH] Error:', error.message);
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
