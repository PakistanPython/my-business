"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('category').optional().trim(),
    (0, express_validator_1.query)('start_date').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    (0, express_validator_1.query)('end_date').optional().isISO8601().withMessage('End date must be valid ISO date'),
    (0, express_validator_1.query)('sort_by').optional().isIn(['date', 'amount', 'created_at']).withMessage('Invalid sort field'),
    (0, express_validator_1.query)('sort_order').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const category = req.query.category;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        const sortBy = req.query.sort_by || 'date';
        const sortOrder = req.query.sort_order || 'desc';
        let whereClause = 'WHERE user_id = ?';
        const whereParams = [userId];
        if (category) {
            whereClause += ' AND category = ?';
            whereParams.push(category);
        }
        if (startDate) {
            whereClause += ' AND date >= ?';
            whereParams.push(startDate);
        }
        if (endDate) {
            whereClause += ' AND date <= ?';
            whereParams.push(endDate);
        }
        const [countResult] = await database_1.pool.execute(`SELECT COUNT(*) as total FROM purchases ${whereClause}`, whereParams);
        const total = countResult[0].total;
        const [purchaseRecords] = await database_1.pool.execute(`SELECT 
        id, amount, description, category, payment_method, date, 
        receipt_path, created_at, updated_at
       FROM purchases 
       ${whereClause} 
       ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
       LIMIT ? OFFSET ?`, [...whereParams, limit, offset]);
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;
        res.json({
            success: true,
            data: {
                purchases: purchaseRecords,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalRecords: total,
                    limit,
                    hasNext,
                    hasPrev
                }
            }
        });
    }
    catch (error) {
        console.error('Get purchases error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const purchaseId = parseInt(req.params.id);
        if (isNaN(purchaseId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purchase ID'
            });
        }
        const [purchaseRecords] = await database_1.pool.execute(`SELECT 
        id, amount, description, category, payment_method, date, 
        receipt_path, created_at, updated_at
       FROM purchases 
       WHERE id = ? AND user_id = ?`, [purchaseId, userId]);
        if (purchaseRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Purchase record not found'
            });
        }
        res.json({
            success: true,
            data: { purchase: purchaseRecords[0] }
        });
    }
    catch (error) {
        console.error('Get purchase by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.post('/', [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    (0, express_validator_1.body)('category')
        .trim()
        .notEmpty()
        .isLength({ max: 50 })
        .withMessage('Category is required and cannot exceed 50 characters'),
    (0, express_validator_1.body)('payment_method')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Payment method cannot exceed 50 characters'),
    (0, express_validator_1.body)('date')
        .isISO8601()
        .withMessage('Date must be valid ISO date'),
    (0, express_validator_1.body)('receipt_path')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Receipt path cannot exceed 255 characters')
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
        const { amount, description = null, category, payment_method = 'Cash', date, receipt_path = null } = req.body;
        const connection = await database_1.pool.getConnection();
        await connection.beginTransaction();
        try {
            const [purchaseResult] = await connection.execute('INSERT INTO purchases (user_id, amount, description, category, payment_method, date, receipt_path) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, amount, description, category, payment_method, date, receipt_path]);
            const purchaseId = purchaseResult.insertId;
            const [purchaseRecords] = await connection.execute('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
            const purchaseRecord = purchaseRecords[0];
            await connection.execute('INSERT INTO transactions (user_id, transaction_type, reference_id, reference_table, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, 'purchase', purchaseId, 'purchases', amount, `Purchase: ${description || category}`, date]);
            await connection.commit();
            res.status(201).json({
                success: true,
                message: 'Purchase record created successfully',
                data: { purchase: purchaseRecord }
            });
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        console.error('Create purchase error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.put('/:id', [
    (0, express_validator_1.body)('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    (0, express_validator_1.body)('category')
        .optional()
        .trim()
        .notEmpty()
        .isLength({ max: 50 })
        .withMessage('Category cannot be empty and cannot exceed 50 characters'),
    (0, express_validator_1.body)('payment_method')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Payment method cannot exceed 50 characters'),
    (0, express_validator_1.body)('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be valid ISO date'),
    (0, express_validator_1.body)('receipt_path')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Receipt path cannot exceed 255 characters')
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
        const purchaseId = parseInt(req.params.id);
        if (isNaN(purchaseId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purchase ID'
            });
        }
        const [existingRecords] = await database_1.pool.execute('SELECT id FROM purchases WHERE id = ? AND user_id = ?', [purchaseId, userId]);
        if (existingRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Purchase record not found'
            });
        }
        const { amount, description, category, payment_method, date, receipt_path } = req.body;
        const updates = [];
        const values = [];
        if (amount !== undefined) {
            updates.push('amount = ?');
            values.push(amount);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            values.push(category);
        }
        if (payment_method !== undefined) {
            updates.push('payment_method = ?');
            values.push(payment_method);
        }
        if (date !== undefined) {
            updates.push('date = ?');
            values.push(date);
        }
        if (receipt_path !== undefined) {
            updates.push('receipt_path = ?');
            values.push(receipt_path);
        }
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }
        values.push(purchaseId);
        await database_1.pool.execute(`UPDATE purchases SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
        const [updatedRecords] = await database_1.pool.execute('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
        res.json({
            success: true,
            message: 'Purchase record updated successfully',
            data: { purchase: updatedRecords[0] }
        });
    }
    catch (error) {
        console.error('Update purchase error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const purchaseId = parseInt(req.params.id);
        if (isNaN(purchaseId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purchase ID'
            });
        }
        const [existingRecords] = await database_1.pool.execute('SELECT id FROM purchases WHERE id = ? AND user_id = ?', [purchaseId, userId]);
        if (existingRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Purchase record not found'
            });
        }
        const connection = await database_1.pool.getConnection();
        await connection.beginTransaction();
        try {
            await connection.execute('DELETE FROM transactions WHERE reference_id = ? AND reference_table = ? AND user_id = ?', [purchaseId, 'purchases', userId]);
            await connection.execute('DELETE FROM purchases WHERE id = ? AND user_id = ?', [purchaseId, userId]);
            await connection.commit();
            res.json({
                success: true,
                message: 'Purchase record deleted successfully'
            });
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        console.error('Delete purchase error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.get('/stats/summary', async (req, res) => {
    try {
        const userId = req.user.userId;
        const [stats] = await database_1.pool.execute(`SELECT 
        COUNT(*) as total_records,
        SUM(amount) as total_purchases,
        AVG(amount) as average_purchase,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
       FROM purchases 
       WHERE user_id = ?`, [userId]);
        const [monthlyStats] = await database_1.pool.execute(`SELECT 
        MONTH(date) as month,
        YEAR(date) as year,
        SUM(amount) as monthly_purchases,
        COUNT(*) as monthly_count
       FROM purchases 
       WHERE user_id = ? AND YEAR(date) = YEAR(CURDATE())
       GROUP BY YEAR(date), MONTH(date)
       ORDER BY month`, [userId]);
        const [categoryStats] = await database_1.pool.execute(`SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
       FROM purchases 
       WHERE user_id = ? 
       GROUP BY category
       ORDER BY total_amount DESC`, [userId]);
        const [paymentStats] = await database_1.pool.execute(`SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total_amount
       FROM purchases 
       WHERE user_id = ? 
       GROUP BY payment_method
       ORDER BY total_amount DESC`, [userId]);
        res.json({
            success: true,
            data: {
                summary: stats[0],
                monthly: monthlyStats,
                by_category: categoryStats,
                by_payment_method: paymentStats
            }
        });
    }
    catch (error) {
        console.error('Purchase stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.default = router;
