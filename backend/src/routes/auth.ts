import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { generateToken } from '../utils/jwt';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Register user
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password, full_name } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    ) as any[];

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [username, email, password_hash, full_name]
    ) as any[];

    const userId = result.insertId;

    // Generate JWT token
    const token = generateToken({
      userId,
      username,
      email
    });

    // Create default categories for the user
    const defaultCategories = [
      // Income categories
      { name: 'Salary', type: 'income', color: '#10B981', icon: 'briefcase' },
      { name: 'Business', type: 'income', color: '#3B82F6', icon: 'building' },
      { name: 'Investment', type: 'income', color: '#8B5CF6', icon: 'trending-up' },
      { name: 'Freelance', type: 'income', color: '#F59E0B', icon: 'laptop' },
      { name: 'Other Income', type: 'income', color: '#6B7280', icon: 'plus-circle' },
      
      // Expense categories
      { name: 'Food & Dining', type: 'expense', color: '#EF4444', icon: 'utensils' },
      { name: 'Transportation', type: 'expense', color: '#F97316', icon: 'car' },
      { name: 'Shopping', type: 'expense', color: '#EC4899', icon: 'shopping-bag' },
      { name: 'Entertainment', type: 'expense', color: '#8B5CF6', icon: 'film' },
      { name: 'Bills & Utilities', type: 'expense', color: '#06B6D4', icon: 'receipt' },
      { name: 'Healthcare', type: 'expense', color: '#10B981', icon: 'heart' },
      { name: 'Education', type: 'expense', color: '#3B82F6', icon: 'book' },
      { name: 'Other Expenses', type: 'expense', color: '#6B7280', icon: 'minus-circle' },
      
      // Purchase categories
      { name: 'Inventory', type: 'purchase', color: '#059669', icon: 'package' },
      { name: 'Raw Materials', type: 'purchase', color: '#DC2626', icon: 'layers' },
      { name: 'Equipment', type: 'purchase', color: '#7C3AED', icon: 'tool' },
      { name: 'Office Supplies', type: 'purchase', color: '#0891B2', icon: 'clipboard' },
      { name: 'Technology', type: 'purchase', color: '#EA580C', icon: 'monitor' },
      { name: 'Other Purchases', type: 'purchase', color: '#6B7280', icon: 'shopping-cart' },
      
      // Sale categories
      { name: 'Product Sales', type: 'sale', color: '#16A34A', icon: 'shopping-bag' },
      { name: 'Service Sales', type: 'sale', color: '#2563EB', icon: 'briefcase' },
      { name: 'Digital Sales', type: 'sale', color: '#9333EA', icon: 'smartphone' },
      { name: 'Wholesale', type: 'sale', color: '#DC2626', icon: 'truck' },
      { name: 'Retail', type: 'sale', color: '#059669', icon: 'store' },
      { name: 'Other Sales', type: 'sale', color: '#6B7280', icon: 'tag' }
    ];

    for (const category of defaultCategories) {
      await pool.execute(
        'INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)',
        [userId, category.name, category.type, category.color, category.icon]
      );
    }

    // Create default cash account
    await pool.execute(
      'INSERT INTO accounts (user_id, account_type, account_name, balance) VALUES (?, ?, ?, ?)',
      [userId, 'cash', 'Cash in Hand', 0.00]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: userId,
          username,
          email,
          full_name
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

// Login user
router.post('/login', [
  body('login')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { login, password } = req.body;

    // Find user by username or email
    const [users] = await pool.execute(
      'SELECT id, username, email, password_hash, full_name FROM users WHERE username = ? OR email = ?',
      [login, login]
    ) as any[];

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const [users] = await pool.execute(
      'SELECT id, username, email, full_name, created_at FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: users[0] }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', [
  authenticateToken,
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user!.userId;
    const { full_name, email } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (full_name) {
      updates.push('full_name = ?');
      values.push(full_name);
    }

    if (email) {
      // Check if email is already taken by another user
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      ) as any[];

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use'
        });
      }

      updates.push('email = ?');
      values.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    values.push(userId);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Get updated user data
    const [users] = await pool.execute(
      'SELECT id, username, email, full_name FROM users WHERE id = ?',
      [userId]
    ) as any[];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: users[0] }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
