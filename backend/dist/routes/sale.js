"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const [rows] = await database_1.pool.execute(`
      SELECT 
        s.id, s.amount AS cost_price, 
        s.description, s.category, s.payment_method, 
        s.date, s.receipt_path, s.created_at, s.updated_at
      FROM sales s
      WHERE s.user_id = ?
      ORDER BY s.date DESC, s.created_at DESC
    `, [userId]);
        res.json({
            success: true,
            data: {
                sales: rows,
                total: rows.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales'
        });
    }
});
router.get('/summary', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const [summaryRows] = await database_1.pool.execute(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(amount), 0) as total_revenue
      FROM sales 
      WHERE user_id = ? AND status = 'completed'
    `, [userId]);
        const summary = summaryRows[0];
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error('Error fetching sales summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales summary'
        });
    }
});
router.get('/available-purchases', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const [rows] = await database_1.pool.execute(`
      SELECT p.*
      FROM purchases p
      ORDER BY p.date DESC, p.created_at DESC
    `);
        res.json({
            success: true,
            data: {
                purchases: rows,
                total: rows.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching available purchases:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available purchases'
        });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const saleId = req.params.id;
        const [rows] = await database_1.pool.execute(`
      SELECT 
        s.id, s.amount AS cost_price, 
        s.description, s.category, s.payment_method, 
        s.date, s.receipt_path, s.created_at, s.updated_at
      FROM sales s
      WHERE s.id = ? AND s.user_id = ?
    `, [saleId, userId]);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }
        res.json({
            success: true,
            data: rows[0]
        });
    }
    catch (error) {
        console.error('Error fetching sale:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sale'
        });
    }
});
router.post('/', auth_1.authenticateToken, validation_1.validateSale, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { amount, description, category, payment_method, date, receipt_path } = req.body;
        const [result] = await database_1.pool.execute(`
      INSERT INTO sales 
      (user_id, amount, description, category, payment_method, date, receipt_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, amount, description, category, payment_method, date, receipt_path]);
        const saleId = result.insertId;
        await database_1.pool.execute(`
      INSERT INTO transactions 
      (user_id, transaction_type, reference_id, reference_table, amount, description, date)
      VALUES (?, 'sale', ?, 'sales', ?, ?, ?)
    `, [userId, saleId, amount, description || 'Sale transaction', date]);
        const [saleRows] = await database_1.pool.execute(`
      SELECT 
        s.id, s.amount AS cost_price, 
        s.description, s.category, s.payment_method, 
        s.date, s.receipt_path, s.created_at, s.updated_at
      FROM sales s
      WHERE s.id = ?
    `, [saleId]);
        res.status(201).json({
            success: true,
            message: 'Sale created successfully',
            data: saleRows[0]
        });
    }
    catch (error) {
        console.error('Error creating sale:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create sale'
        });
    }
});
router.put('/:id', auth_1.authenticateToken, validation_1.validateSale, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const saleId = req.params.id;
        const { amount, description, category, payment_method, date, receipt_path } = req.body;
        const [existingRows] = await database_1.pool.execute('SELECT id FROM sales WHERE id = ? AND user_id = ?', [saleId, userId]);
        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }
        await database_1.pool.execute(`
      UPDATE sales 
      SET amount = ?, description = ?, category = ?, payment_method = ?, 
          date = ?, receipt_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [amount, description, category, payment_method, date, receipt_path, saleId, userId]);
        await database_1.pool.execute(`
      UPDATE transactions 
      SET amount = ?, description = ?, date = ?
      WHERE reference_id = ? AND reference_table = 'sales' AND user_id = ?
    `, [amount, description || 'Sale transaction', date, saleId, userId]);
        const [saleRows] = await database_1.pool.execute(`
      SELECT 
        s.id, s.amount AS cost_price, 
        s.description, s.category, s.payment_method, 
        s.date, s.receipt_path, s.created_at, s.updated_at
    `, [saleId]);
        res.json({
            success: true,
            message: 'Sale updated successfully',
            data: saleRows[0]
        });
    }
    catch (error) {
        console.error('Error updating sale:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update sale'
        });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const saleId = req.params.id;
        const [existingRows] = await database_1.pool.execute('SELECT id FROM sales WHERE id = ? AND user_id = ?', [saleId, userId]);
        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }
        await database_1.pool.execute(`
      DELETE FROM transactions 
      WHERE reference_id = ? AND reference_table = 'sales' AND user_id = ?
    `, [saleId, userId]);
        await database_1.pool.execute('DELETE FROM sales WHERE id = ? AND user_id = ?', [saleId, userId]);
        res.json({
            success: true,
            message: 'Sale deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting sale:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete sale'
        });
    }
});
exports.default = router;
