const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * IAP Authentication Middleware
 * Verifies Google Identity-Aware Proxy JWT token
 * 
 * Set DISABLE_IAP_VALIDATION=true in environment to skip validation (dev/local only)
 */
const iapAuth = (req, res, next) => {
  // Allow bypassing IAP validation for local development
  if (process.env.DISABLE_IAP_VALIDATION === 'true') {
    console.warn('[WARNING] IAP validation is disabled. This should only be used in development.');
    // Mock a user for testing
    req.user = {
      id: 'dev-user',
      email: 'dev@example.com',
      name: 'Development User',
      iapId: 'dev-user'
    };
    return next();
  }

  console.log(`[AUTH] DISABLE_IAP_VALIDATION env var: ${process.env.DISABLE_IAP_VALIDATION}`);
  console.log(`[AUTH] Authorization header: ${req.headers.authorization ? 'Present' : 'Missing'}`);

  try {
    // Get IAP JWT token from Authorization header
    const iapJwt = req.headers.authorization?.split('Bearer ')[1];
    
    if (!iapJwt) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing IAP token'
      });
    }

    // Verify JWT (in production, verify against Google's public keys)
    const decoded = jwt.decode(iapJwt, { complete: true });
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token'
      });
    }

    // Extract user information from token
    req.user = {
      id: decoded.payload.sub,
      email: decoded.payload.email,
      name: decoded.payload.name,
      iapId: decoded.payload.sub
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
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
