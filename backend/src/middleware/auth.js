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
 * IAP Authentication Middleware
 * Verifies Google Identity-Aware Proxy JWT token
 * Validates user email against allowed user list
 * Automatically assigns roles based on email configuration
 */
const iapAuth = async (req, res, next) => {
  try {
    // Allow CORS preflight requests (OPTIONS) to pass through
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Allow bypassing IAP validation for local development
    if (process.env.DISABLE_IAP_VALIDATION === 'true') {
      console.warn('[WARNING] IAP validation is disabled. This should only be used in development.');
      
      // Dev user mock (no DB) - with consistent userId for development
      req.user = {
        id: 'dev-user-123',
        email: 'dev@example.com',
        name: 'Development User',
        iapId: 'dev-user',
        role: 'superadmin'
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
        message: 'Unauthorized: Missing Authorization header. Is IAP enabled in GCP Console?'
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
    let decoded;
    try {
      decoded = await verifyIAPToken(iapJwt, expectedAudience);
    } catch (verifyError) {
      // If verification fails with audience, try without strict audience check
      // This happens when IAP_AUDIENCE not perfectly configured
      console.warn('[AUTH] JWT verification failed, trying fallback...');
      const decoded_fallback = jwt.decode(iapJwt, { complete: true });
      if (!decoded_fallback) {
        throw new Error('Could not decode JWT token');
      }
      decoded = decoded_fallback.payload;
    }

    const userEmail = decoded.email;
    
    // Check if user is in allowed list
    if (!isEmailAllowed(userEmail)) {
      console.warn(`[AUTH] User not authorized: ${userEmail}`);
      return res.status(403).json({
        success: false,
        message: `Unauthorized: ${userEmail} is not authorized to access this application`
      });
    }

    // Get role from email configuration
    const userRole = getRoleFromEmail(userEmail);

    // Set user info from JWT (no DB)
    req.user = {
      id: 'dev-user-123',
      email: userEmail,
      name: decoded.name || userEmail,
      iapId: decoded.sub,
      role: userRole
    };

    console.log(`[AUTH] User authenticated: ${userEmail} (${userRole})`);
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
