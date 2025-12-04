/**
 * User Role Configuration
 * Defines which email addresses get which roles
 */

const USER_ROLES = {
  superadmin: [
    'ahamedbeema1989@gmail.com'  // Can manage all users and system
  ],
  admin: [
    'muskansharma2598@gmail.com'  // Can manage users
  ],
  user: [
    'amrithachand@gmail.com'      // Regular user
  ]
};

/**
 * Get user role from email
 */
function getRoleFromEmail(email) {
  if (!email) return 'user';
  
  // Check superadmin
  if (USER_ROLES.superadmin.includes(email)) {
    return 'superadmin';
  }
  
  // Check admin
  if (USER_ROLES.admin.includes(email)) {
    return 'admin';
  }
  
  // Check user
  if (USER_ROLES.user.includes(email)) {
    return 'user';
  }
  
  // Default: user (unless not in any list, then deny or user?)
  return 'user';
}

/**
 * Check if email is allowed to access the system
 */
function isEmailAllowed(email) {
  if (!email) return false;
  
  const allAllowedEmails = [
    ...USER_ROLES.superadmin,
    ...USER_ROLES.admin,
    ...USER_ROLES.user
  ];
  
  return allAllowedEmails.includes(email);
}

module.exports = {
  USER_ROLES,
  getRoleFromEmail,
  isEmailAllowed
};
