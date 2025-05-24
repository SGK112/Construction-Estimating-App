/**
 * Authentication Module for Construction Estimator Platform
 * 
 * This module provides comprehensive user authentication and account management
 * with support for secure login, registration, password reset, and session management.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class AuthenticationModule {
  constructor(options = {}) {
    // Configuration
    this.config = {
      jwtSecret: options.jwtSecret || 'your-secret-key-should-be-environment-variable',
      jwtExpiresIn: options.jwtExpiresIn || '24h',
      bcryptSaltRounds: options.bcryptSaltRounds || 10,
      passwordMinLength: options.passwordMinLength || 8,
      passwordRequireUppercase: options.passwordRequireUppercase !== false,
      passwordRequireLowercase: options.passwordRequireLowercase !== false,
      passwordRequireNumbers: options.passwordRequireNumbers !== false,
      passwordRequireSpecial: options.passwordRequireSpecial !== false,
      tokenExpirationTime: options.tokenExpirationTime || 24 * 60 * 60 * 1000, // 24 hours
      maxLoginAttempts: options.maxLoginAttempts || 5,
      lockoutDuration: options.lockoutDuration || 30 * 60 * 1000, // 30 minutes
      sessionDuration: options.sessionDuration || 24 * 60 * 60 * 1000, // 24 hours
      enableTwoFactor: options.enableTwoFactor || false,
      enableOAuth: options.enableOAuth || false,
      oauthProviders: options.oauthProviders || []
    };
    
    // User storage (in a real app, this would be a database)
    this.users = [];
    
    // Session storage (in a real app, this would be Redis or similar)
    this.sessions = new Map();
    
    // Token storage for password reset, email verification, etc.
    this.tokens = new Map();
    
    // Failed login attempts tracking
    this.loginAttempts = new Map();
    
    // Initialize event listeners
    this.eventListeners = {
      'user:registered': [],
      'user:login': [],
      'user:logout': [],
      'user:password:reset': [],
      'user:password:changed': [],
      'user:profile:updated': [],
      'user:verified': [],
      'user:locked': [],
      'user:unlocked': [],
      'session:created': [],
      'session:expired': [],
      'token:created': [],
      'token:used': [],
      'token:expired': []
    };
  }
  
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} Registration result
   */
  async registerUser(userData) {
    // Validate required fields
    if (!userData.email || !userData.password) {
      throw new Error('Email and password are required');
    }
    
    // Validate email format
    if (!this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }
    
    // Check if email already exists
    if (this.users.some(user => user.email === userData.email)) {
      throw new Error('Email already registered');
    }
    
    // Validate password strength
    const passwordValidation = this.validatePasswordStrength(userData.password);
    if (!passwordValidation.valid) {
      throw new Error(`Password does not meet requirements: ${passwordValidation.message}`);
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, this.config.bcryptSaltRounds);
    
    // Create user object
    const newUser = {
      id: this.generateId(),
      email: userData.email,
      passwordHash,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phone: userData.phone || '',
      role: userData.role || 'customer',
      verified: false,
      active: true,
      locked: false,
      loginAttempts: 0,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: userData.metadata || {}
    };
    
    // Add user to storage
    this.users.push(newUser);
    
    // Create verification token if email verification is required
    let verificationToken = null;
    if (userData.requireVerification) {
      verificationToken = this.createToken('verification', newUser.id);
    }
    
    // Emit user registered event
    this.emitEvent('user:registered', {
      userId: newUser.id,
      email: newUser.email,
      timestamp: new Date().toISOString()
    });
    
    // Return user data (without sensitive information)
    return {
      success: true,
      user: this.sanitizeUser(newUser),
      verificationToken
    };
  }
  
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} Login result with JWT token
   */
  async loginUser(email, password) {
    // Find user by email
    const user = this.users.find(u => u.email === email);
    
    // Check if user exists
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Check if user is locked
    if (user.locked) {
      const lockoutTime = this.loginAttempts.get(user.id) || 0;
      const currentTime = Date.now();
      
      if (currentTime - lockoutTime < this.config.lockoutDuration) {
        throw new Error('Account is locked due to too many failed login attempts');
      } else {
        // Unlock account if lockout duration has passed
        user.locked = false;
        user.loginAttempts = 0;
        this.loginAttempts.delete(user.id);
        
        // Emit user unlocked event
        this.emitEvent('user:unlocked', {
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Check if user is active
    if (!user.active) {
      throw new Error('Account is inactive');
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordMatch) {
      // Increment failed login attempts
      user.loginAttempts += 1;
      
      // Lock account if max attempts reached
      if (user.loginAttempts >= this.config.maxLoginAttempts) {
        user.locked = true;
        this.loginAttempts.set(user.id, Date.now());
        
        // Emit user locked event
        this.emitEvent('user:locked', {
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString()
        });
        
        throw new Error('Account locked due to too many failed login attempts');
      }
      
      throw new Error('Invalid email or password');
    }
    
    // Reset login attempts on successful login
    user.loginAttempts = 0;
    
    // Update last login timestamp
    user.lastLogin = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    
    // Generate JWT token
    const token = this.generateJWT(user);
    
    // Create session
    const sessionId = this.createSession(user.id);
    
    // Emit user login event
    this.emitEvent('user:login', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });
    
    // Return user data and token
    return {
      success: true,
      user: this.sanitizeUser(user),
      token,
      sessionId
    };
  }
  
  /**
   * Logout user
   * @param {string} sessionId - Session ID
   * @returns {boolean} Logout success
   */
  logoutUser(sessionId) {
    // Check if session exists
    if (!this.sessions.has(sessionId)) {
      return false;
    }
    
    // Get user ID from session
    const { userId } = this.sessions.get(sessionId);
    
    // Delete session
    this.sessions.delete(sessionId);
    
    // Emit user logout event
    this.emitEvent('user:logout', {
      userId,
      sessionId,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }
  
  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, this.config.jwtSecret);
      
      // Find user
      const user = this.users.find(u => u.id === decoded.userId);
      
      // Check if user exists and is active
      if (!user || !user.active) {
        throw new Error('Invalid token');
      }
      
      return {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        exp: decoded.exp
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object} User data
   */
  getUserById(userId) {
    const user = this.users.find(u => u.id === userId);
    
    if (!user) {
      return null;
    }
    
    return this.sanitizeUser(user);
  }
  
  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Object} Updated user data
   */
  updateUserProfile(userId, userData) {
    // Find user
    const userIndex = this.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    const user = this.users[userIndex];
    
    // Update allowed fields
    const allowedFields = ['firstName', 'lastName', 'phone', 'metadata'];
    
    allowedFields.forEach(field => {
      if (userData[field] !== undefined) {
        user[field] = userData[field];
      }
    });
    
    // Update timestamp
    user.updatedAt = new Date().toISOString();
    
    // Save updated user
    this.users[userIndex] = user;
    
    // Emit profile updated event
    this.emitEvent('user:profile:updated', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });
    
    return this.sanitizeUser(user);
  }
  
  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} Password change success
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Find user
    const userIndex = this.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    const user = this.users[userIndex];
    
    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!passwordMatch) {
      throw new Error('Current password is incorrect');
    }
    
    // Validate new password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`Password does not meet requirements: ${passwordValidation.message}`);
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.config.bcryptSaltRounds);
    
    // Update password
    user.passwordHash = passwordHash;
    user.updatedAt = new Date().toISOString();
    
    // Save updated user
    this.users[userIndex] = user;
    
    // Invalidate all sessions for this user
    this.invalidateUserSessions(userId);
    
    // Emit password changed event
    this.emitEvent('user:password:changed', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }
  
  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Object} Password reset token
   */
  requestPasswordReset(email) {
    // Find user by email
    const user = this.users.find(u => u.email === email);
    
    // Check if user exists
    if (!user) {
      // For security reasons, don't reveal if email exists or not
      return {
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      };
    }
    
    // Create password reset token
    const token = this.createToken('password-reset', user.id);
    
    // Emit token created event
    this.emitEvent('token:created', {
      userId: user.id,
      email: user.email,
      tokenType: 'password-reset',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      token,
      message: 'If your email is registered, you will receive a password reset link'
    };
  }
  
  /**
   * Reset password with token
   * @param {string} token - Password reset token
   * @param {string} newPassword - New password
   * @returns {boolean} Password reset success
   */
  async resetPassword(token, newPassword) {
    // Verify token
    const tokenData = this.verifyCustomToken(token);
    
    if (!tokenData.valid || tokenData.type !== 'password-reset') {
      throw new Error('Invalid or expired token');
    }
    
    // Find user
    const userIndex = this.users.findIndex(u => u.id === tokenData.userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Validate new password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`Password does not meet requirements: ${passwordValidation.message}`);
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.config.bcryptSaltRounds);
    
    // Update password
    const user = this.users[userIndex];
    user.passwordHash = passwordHash;
    user.updatedAt = new Date().toISOString();
    
    // Reset login attempts and unlock account
    user.loginAttempts = 0;
    user.locked = false;
    this.loginAttempts.delete(user.id);
    
    // Save updated user
    this.users[userIndex] = user;
    
    // Invalidate token
    this.invalidateToken(token);
    
    // Invalidate all sessions for this user
    this.invalidateUserSessions(user.id);
    
    // Emit password reset event
    this.emitEvent('user:password:reset', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }
  
  /**
   * Verify user email
   * @param {string} token - Email verification token
   * @returns {boolean} Email verification success
   */
  verifyEmail(token) {
    // Verify token
    const tokenData = this.verifyCustomToken(token);
    
    if (!tokenData.valid || tokenData.type !== 'verification') {
      throw new Error('Invalid or expired token');
    }
    
    // Find user
    const userIndex = this.users.findIndex(u => u.id === tokenData.userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Update user verification status
    const user = this.users[userIndex];
    user.verified = true;
    user.updatedAt = new Date().toISOString();
    
    // Save updated user
    this.users[userIndex] = user;
    
    // Invalidate token
    this.invalidateToken(token);
    
    // Emit user verified event
    this.emitEvent('user:verified', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }
  
  /**
   * Create a session for a user
   * @param {string} userId - User ID
   * @returns {string} Session ID
   */
  createSession(userId) {
    // Generate session ID
    const sessionId = this.generateId();
    
    // Create session object
    const session = {
      id: sessionId,
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionDuration
    };
    
    // Store session
    this.sessions.set(sessionId, session);
    
    // Emit session created event
    this.emitEvent('session:created', {
      sessionId,
      userId,
      timestamp: new Date().toISOString()
    });
    
    return sessionId;
  }
  
  /**
   * Verify session
   * @param {string} sessionId - Session ID
   * @returns {Object} Session verification result
   */
  verifySession(sessionId) {
    // Check if session exists
    if (!this.sessions.has(sessionId)) {
      return {
        valid: false,
        error: 'Session not found'
      };
    }
    
    // Get session
    const session = this.sessions.get(sessionId);
    
    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      // Delete expired session
      this.sessions.delete(sessionId);
      
      // Emit session expired event
      this.emitEvent('session:expired', {
        sessionId,
        userId: session.userId,
        timestamp: new Date().toISOString()
      });
      
      return {
        valid: false,
        error: 'Session expired'
      };
    }
    
    // Find user
    const user = this.users.find(u => u.id === session.userId);
    
    // Check if user exists and is active
    if (!user || !user.active) {
      return {
        valid: false,
        error: 'User not found or inactive'
      };
    }
    
    return {
      valid: true,
      userId: session.userId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    };
  }
  
  /**
   * Extend session expiration
   * @param {string} sessionId - Session ID
   * @returns {boolean} Session extension success
   */
  extendSession(sessionId) {
    // Check if session exists
    if (!this.sessions.has(sessionId)) {
      return false;
    }
    
    // Get session
    const session = this.sessions.get(sessionId);
    
    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      // Delete expired session
      this.sessions.delete(sessionId);
      return false;
    }
    
    // Extend session expiration
    session.expiresAt = Date.now() + this.config.sessionDuration;
    
    // Update session
    this.sessions.set(sessionId, session);
    
    return true;
  }
  
  /**
   * Invalidate all sessions for a user
   * @param {string} userId - User ID
   * @returns {number} Number of invalidated sessions
   */
  invalidateUserSessions(userId) {
    let count = 0;
    
    // Find and delete all sessions for the user
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        count++;
        
        // Emit session expired event
        this.emitEvent('session:expired', {
          sessionId,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return count;
  }
  
  /**
   * Create a custom token (for password reset, email verification, etc.)
   * @param {string} type - Token type
   * @param {string} userId - User ID
   * @param {Object} data - Additional data to store with token
   * @returns {string} Token
   */
  createToken(type, userId, data = {}) {
    // Generate token
    const tokenValue = crypto.randomBytes(32).toString('hex');
    
    // Create token object
    const token = {
      value: tokenValue,
      type,
      userId,
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.tokenExpirationTime
    };
    
    // Store token
    this.tokens.set(tokenValue, token);
    
    return tokenValue;
  }
  
  /**
   * Verify custom token
   * @param {string} tokenValue - Token value
   * @returns {Object} Token verification result
   */
  verifyCustomToken(tokenValue) {
    // Check if token exists
    if (!this.tokens.has(tokenValue)) {
      return {
        valid: false,
        error: 'Token not found'
      };
    }
    
    // Get token
    const token = this.tokens.get(tokenValue);
    
    // Check if token is expired
    if (token.expiresAt < Date.now()) {
      // Delete expired token
      this.tokens.delete(tokenValue);
      
      // Emit token expired event
      this.emitEvent('token:expired', {
        tokenType: token.type,
        userId: token.userId,
        timestamp: new Date().toISOString()
      });
      
      return {
        valid: false,
        error: 'Token expired'
      };
    }
    
    return {
      valid: true,
      type: token.type,
      userId: token.userId,
      data: token.data,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt
    };
  }
  
  /**
   * Invalidate token
   * @param {string} tokenValue - Token value
   * @returns {boolean} Token invalidation success
   */
  invalidateToken(tokenValue) {
    // Check if token exists
    if (!this.tokens.has(tokenValue)) {
      return false;
    }
    
    // Get token data before deletion
    const token = this.tokens.get(tokenValue);
    
    // Delete token
    this.tokens.delete(tokenValue);
    
    // Emit token used event
    this.emitEvent('token:used', {
      tokenType: token.type,
      userId: token.userId,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }
  
  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateJWT(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn
    });
  }
  
  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePasswordStrength(password) {
    // Check minimum length
    if (password.length < this.config.passwordMinLength) {
      return {
        valid: false,
        message: `Password must be at least ${this.config.passwordMinLength} characters long`
      };
    }
    
    // Check for uppercase letters
    if (this.config.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one uppercase letter'
      };
    }
    
    // Check for lowercase letters
    if (this.config.passwordRequireLowercase && !/[a-z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one lowercase letter'
      };
    }
    
    // Check for numbers
    if (this.config.passwordRequireNumbers && !/[0-9]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one number'
      };
    }
    
    // Check for special characters
    if (this.config.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one special character'
      };
    }
    
    return {
      valid: true
    };
  }
  
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Validation result
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * Remove sensitive information from user object
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    // Create a copy of the user object
    const sanitizedUser = { ...user };
    
    // Remove sensitive fields
    delete sanitizedUser.passwordHash;
    delete sanitizedUser.loginAttempts;
    
    return sanitizedUser;
  }
  
  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  addEventListener(event, listener) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push(listener);
  }
  
  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  removeEventListener(event, listener) {
    if (!this.eventListeners[event]) {
      return;
    }
    
    this.eventListeners[event] = this.eventListeners[event].filter(l => l !== listener);
  }
  
  /**
   * Emit event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitEvent(event, data) {
    if (!this.eventListeners[event]) {
      return;
    }
    
    this.eventListeners[event].forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`Error in event listener for ${event}:`, e);
      }
    });
  }
  
  /**
   * Get all users (admin function)
   * @returns {Array} Array of sanitized user objects
   */
  getAllUsers() {
    return this.users.map(user => this.sanitizeUser(user));
  }
  
  /**
   * Update user role (admin function)
   * @param {string} userId - User ID
   * @param {string} role - New role
   * @returns {Object} Updated user data
   */
  updateUserRole(userId, role) {
    // Find user
    const userIndex = this.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Validate role
    const validRoles = ['customer', 'admin', 'vendor'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}`);
    }
    
    // Update role
    const user = this.users[userIndex];
    user.role = role;
    user.updatedAt = new Date().toISOString();
    
    // Save updated user
    this.users[userIndex] = user;
    
    return this.sanitizeUser(user);
  }
  
  /**
   * Activate or deactivate user (admin function)
   * @param {string} userId - User ID
   * @param {boolean} active - Active status
   * @returns {Object} Updated user data
   */
  setUserActiveStatus(userId, active) {
    // Find user
    const userIndex = this.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Update active status
    const user = this.users[userIndex];
    user.active = !!active;
    user.updatedAt = new Date().toISOString();
    
    // If deactivating, invalidate all sessions
    if (!active) {
      this.invalidateUserSessions(userId);
    }
    
    // Save updated user
    this.users[userIndex] = user;
    
    return this.sanitizeUser(user);
  }
  
  /**
   * Delete user (admin function)
   * @param {string} userId - User ID
   * @returns {boolean} Deletion success
   */
  deleteUser(userId) {
    // Find user
    const userIndex = this.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Get user email for event
    const userEmail = this.users[userIndex].email;
    
    // Remove user
    this.users.splice(userIndex, 1);
    
    // Invalidate all sessions
    this.invalidateUserSessions(userId);
    
    // Invalidate all tokens
    for (const [tokenValue, token] of this.tokens.entries()) {
      if (token.userId === userId) {
        this.tokens.delete(tokenValue);
      }
    }
    
    // Emit user deleted event (custom event not in the standard list)
    this.emitEvent('user:deleted', {
      userId,
      email: userEmail,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }
}

// Example usage:
/*
const authModule = new AuthenticationModule({
  jwtSecret: 'your-secret-key',
  jwtExpiresIn: '24h'
});

// Register event listeners
authModule.addEventListener('user:registered', (data) => {
  console.log(`User registered: ${data.email}`);
});

authModule.addEventListener('user:login', (data) => {
  console.log(`User logged in: ${data.email}`);
});

// Register a user
const registration = await authModule.registerUser({
  email: 'user@example.com',
  password: 'SecureP@ssw0rd',
  firstName: 'John',
  lastName: 'Doe'
});

// Login
const login = await authModule.loginUser('user@example.com', 'SecureP@ssw0rd');
const token = login.token;

// Verify token
const tokenVerification = authModule.verifyToken(token);
*/

// Export the module
module.exports = AuthenticationModule;
