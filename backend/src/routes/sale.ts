import express from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { validateSale } from '../middleware/validation';

const router = express.Router();

// Get all sales for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    const [rows] = await pool.execute(`
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
        total: (rows as any[]).length
      }
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales'
    });
  }
});

// Get sales summary for dashboard
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    const [summaryRows] = await pool.execute(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(amount), 0) as total_revenue
      FROM sales 
      WHERE user_id = ? AND status = 'completed'
    `, [userId]);

    const summary = (summaryRows as any[])[0];

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales summary'
    });
  }
});

// Get available purchases for sale (purchases not yet sold)
router.get('/available-purchases', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    const [rows] = await pool.execute(`
      SELECT p.*
      FROM purchases p
      ORDER BY p.date DESC, p.created_at DESC
    `);

    res.json({
      success: true,
      data: {
        purchases: rows,
        total: (rows as any[]).length
      }
    });
  } catch (error) {
    console.error('Error fetching available purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available purchases'
    });
  }
});

// Get single sale by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const saleId = req.params.id;

    const [rows] = await pool.execute(`
      SELECT 
        s.id, s.amount AS cost_price, 
        s.description, s.category, s.payment_method, 
        s.date, s.receipt_path, s.created_at, s.updated_at
      FROM sales s
      WHERE s.id = ? AND s.user_id = ?
    `, [saleId, userId]);

    if ((rows as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: (rows as any[])[0]
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sale'
    });
  }
});

// Create new sale
router.post('/', authenticateToken, validateSale, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const {
      amount,
      description,
      category,
      payment_method,
      date,
      receipt_path
    } = req.body;

    const [result] = await pool.execute(`
      INSERT INTO sales 
      (user_id, amount, description, category, payment_method, date, receipt_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, amount, description, category, payment_method, date, receipt_path]);

    const saleId = (result as any).insertId;

    // Create transaction record
    await pool.execute(`
      INSERT INTO transactions 
      (user_id, transaction_type, reference_id, reference_table, amount, description, date)
      VALUES (?, 'sale', ?, 'sales', ?, ?, ?)
    `, [userId, saleId, amount, description || 'Sale transaction', date]);

    // Get the created sale
    const [saleRows] = await pool.execute(`
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
      data: (saleRows as any[])[0]
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sale'
    });
  }
});

// Update sale
router.put('/:id', authenticateToken, validateSale, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const saleId = req.params.id;
    const {
      amount,
      description,
      category,
      payment_method,
      date,
      receipt_path
    } = req.body;

    // Check if sale exists and belongs to user
    const [existingRows] = await pool.execute(
      'SELECT id FROM sales WHERE id = ? AND user_id = ?',
      [saleId, userId]
    );

    if ((existingRows as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    await pool.execute(`
      UPDATE sales 
      SET amount = ?, description = ?, category = ?, payment_method = ?, 
          date = ?, receipt_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [amount, description, category, payment_method, date, receipt_path, saleId, userId]);

    // Update transaction record
    await pool.execute(`
      UPDATE transactions 
      SET amount = ?, description = ?, date = ?
      WHERE reference_id = ? AND reference_table = 'sales' AND user_id = ?
    `, [amount, description || 'Sale transaction', date, saleId, userId]);

    // Get updated sale
    const [saleRows] = await pool.execute(`
      SELECT 
        s.id, s.amount AS cost_price, 
        s.description, s.category, s.payment_method, 
        s.date, s.receipt_path, s.created_at, s.updated_at
    `, [saleId]);

    res.json({
      success: true,
      message: 'Sale updated successfully',
      data: (saleRows as any[])[0]
    });
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sale'
    });
  }
});

// Delete sale
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const saleId = req.params.id;

    // Check if sale exists and belongs to user
    const [existingRows] = await pool.execute(
      'SELECT id FROM sales WHERE id = ? AND user_id = ?',
      [saleId, userId]
    );

    if ((existingRows as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Delete transaction record first
    await pool.execute(`
      DELETE FROM transactions 
      WHERE reference_id = ? AND reference_table = 'sales' AND user_id = ?
    `, [saleId, userId]);

    // Delete sale
    await pool.execute(
      'DELETE FROM sales WHERE id = ? AND user_id = ?',
      [saleId, userId]
    );

    res.json({
      success: true,
      message: 'Sale deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sale'
    });
  }
});

export default router;
