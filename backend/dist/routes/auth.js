"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const jwt_1 = require("../utils/jwt");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/register', [
    (0, express_validator_1.body)('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('full_name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const { username, email, password, full_name } = req.body;
        const [existingUsers] = await database_1.pool.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        const saltRounds = 12;
        const password_hash = await bcryptjs_1.default.hash(password, saltRounds);
        const [result] = await database_1.pool.execute('INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)', [username, email, password_hash, full_name]);
        const userId = result.insertId;
        const token = (0, jwt_1.generateToken)({
            userId,
            username,
            email
        });
        const defaultCategories = [
            { name: 'Salary', type: 'income', color: '#10B981', icon: 'briefcase' },
            { name: 'Business', type: 'income', color: '#3B82F6', icon: 'building' },
            { name: 'Investment', type: 'income', color: '#8B5CF6', icon: 'trending-up' },
            { name: 'Freelance', type: 'income', color: '#F59E0B', icon: 'laptop' },
            { name: 'Other Income', type: 'income', color: '#6B7280', icon: 'plus-circle' },
            { name: 'Food & Dining', type: 'expense', color: '#EF4444', icon: 'utensils' },
            { name: 'Transportation', type: 'expense', color: '#F97316', icon: 'car' },
            { name: 'Shopping', type: 'expense', color: '#EC4899', icon: 'shopping-bag' },
            { name: 'Entertainment', type: 'expense', color: '#8B5CF6', icon: 'film' },
            { name: 'Bills & Utilities', type: 'expense', color: '#06B6D4', icon: 'receipt' },
            { name: 'Healthcare', type: 'expense', color: '#10B981', icon: 'heart' },
            { name: 'Education', type: 'expense', color: '#3B82F6', icon: 'book' },
            { name: 'Other Expenses', type: 'expense', color: '#6B7280', icon: 'minus-circle' },
            { name: 'Inventory', type: 'purchase', color: '#059669', icon: 'package' },
            { name: 'Raw Materials', type: 'purchase', color: '#DC2626', icon: 'layers' },
            { name: 'Equipment', type: 'purchase', color: '#7C3AED', icon: 'tool' },
            { name: 'Office Supplies', type: 'purchase', color: '#0891B2', icon: 'clipboard' },
            { name: 'Technology', type: 'purchase', color: '#EA580C', icon: 'monitor' },
            { name: 'Other Purchases', type: 'purchase', color: '#6B7280', icon: 'shopping-cart' },
            { name: 'Product Sales', type: 'sale', color: '#16A34A', icon: 'shopping-bag' },
            { name: 'Service Sales', type: 'sale', color: '#2563EB', icon: 'briefcase' },
            { name: 'Digital Sales', type: 'sale', color: '#9333EA', icon: 'smartphone' },
            { name: 'Wholesale', type: 'sale', color: '#DC2626', icon: 'truck' },
            { name: 'Retail', type: 'sale', color: '#059669', icon: 'store' },
            { name: 'Other Sales', type: 'sale', color: '#6B7280', icon: 'tag' }
        ];
        for (const category of defaultCategories) {
            await database_1.pool.execute('INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)', [userId, category.name, category.type, category.color, category.icon]);
        }
        await database_1.pool.execute('INSERT INTO accounts (user_id, account_type, account_name, balance) VALUES (?, ?, ?, ?)', [userId, 'cash', 'Cash in Hand', 0.00]);
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
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during registration'
        });
    }
});
router.post('/login', [
    (0, express_validator_1.body)('login')
        .trim()
        .notEmpty()
        .withMessage('Username or email is required'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const { login, password } = req.body;
        const [users] = await database_1.pool.execute('SELECT id, username, email, password_hash, full_name FROM users WHERE username = ? OR email = ?', [login, login]);
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        const user = users[0];
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        const token = (0, jwt_1.generateToken)({
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
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login'
        });
    }
});
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [users] = await database_1.pool.execute('SELECT id, username, email, full_name, created_at FROM users WHERE id = ?', [userId]);
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
    }
    catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.put('/profile', [
    auth_1.authenticateToken,
    (0, express_validator_1.body)('full_name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const userId = req.user.userId;
        const { full_name, email } = req.body;
        const updates = [];
        const values = [];
        if (full_name) {
            updates.push('full_name = ?');
            values.push(full_name);
        }
        if (email) {
            const [existingUsers] = await database_1.pool.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
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
        await database_1.pool.execute(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
        const [users] = await database_1.pool.execute('SELECT id, username, email, full_name FROM users WHERE id = ?', [userId]);
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user: users[0] }
        });
    }
    catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.default = router;
