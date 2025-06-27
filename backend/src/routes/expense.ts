import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all expense records
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().trim(),
  query('start_date').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('end_date').optional().isISO8601().withMessage('End date must be valid ISO date'),
  query('sort_by').optional().isIn(['date', 'amount', 'created_at']).withMessage('Invalid sort field'),
  query('sort_order').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const category = req.query.category as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const sortBy = req.query.sort_by as string || 'date';
    const sortOrder = req.query.sort_order as string || 'desc';

    // Build WHERE clause
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

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM expenses ${whereClause}`,
      whereParams
    ) as any[];
    const total = countResult[0].total;

    // Get expense records
    const [expenseRecords] = await pool.execute(
      `SELECT 
        id, amount, description, category, payment_method, date, 
        receipt_path, created_at, updated_at
       FROM expenses 
       ${whereClause} 
       ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    ) as any[];

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      data: {
        expenses: expenseRecords,
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
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get expense by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const expenseId = parseInt(req.params.id);

    if (isNaN(expenseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID'
      });
    }

    const [expenseRecords] = await pool.execute(
      `SELECT 
        id, amount, description, category, payment_method, date, 
        receipt_path, created_at, updated_at
       FROM expenses 
       WHERE id = ? AND user_id = ?`,
      [expenseId, userId]
    ) as any[];

    if (expenseRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense record not found'
      });
    }

    res.json({
      success: true,
      data: { expense: expenseRecords[0] }
    });
  } catch (error) {
    console.error('Get expense by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new expense record
router.post('/', [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .trim()
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage('Category is required and cannot exceed 50 characters'),
  body('payment_method')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Payment method cannot exceed 50 characters'),
  body('date')
    .isISO8601()
    .withMessage('Date must be valid ISO date'),
  body('receipt_path')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Receipt path cannot exceed 255 characters')
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
    const { amount, description = null, category, payment_method = 'Cash', date, receipt_path = null } = req.body;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert expense record
      const [expenseResult] = await connection.execute(
        'INSERT INTO expenses (user_id, amount, description, category, payment_method, date, receipt_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, amount, description, category, payment_method, date, receipt_path]
      ) as any[];

      const expenseId = expenseResult.insertId;

      // Get the created expense record
      const [expenseRecords] = await connection.execute(
        'SELECT * FROM expenses WHERE id = ?',
        [expenseId]
      ) as any[];

      const expenseRecord = expenseRecords[0];

      // Record transaction for audit trail
      await connection.execute(
        'INSERT INTO transactions (user_id, transaction_type, reference_id, reference_table, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 'expense', expenseId, 'expenses', amount, `Expense: ${description || category}`, date]
      );

      // Commit transaction
      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Expense record created successfully',
        data: { expense: expenseRecord }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update expense record
router.put('/:id', [
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage('Category cannot be empty and cannot exceed 50 characters'),
  body('payment_method')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Payment method cannot exceed 50 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be valid ISO date'),
  body('receipt_path')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Receipt path cannot exceed 255 characters')
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
    const expenseId = parseInt(req.params.id);

    if (isNaN(expenseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID'
      });
    }

    // Check if expense record exists and belongs to user
    const [existingRecords] = await pool.execute(
      'SELECT id FROM expenses WHERE id = ? AND user_id = ?',
      [expenseId, userId]
    ) as any[];

    if (existingRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense record not found'
      });
    }

    const { amount, description, category, payment_method, date, receipt_path } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

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

    values.push(expenseId);

    // Update expense record
    await pool.execute(
      `UPDATE expenses SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Get updated record
    const [updatedRecords] = await pool.execute(
      'SELECT * FROM expenses WHERE id = ?',
      [expenseId]
    ) as any[];

    res.json({
      success: true,
      message: 'Expense record updated successfully',
      data: { expense: updatedRecords[0] }
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete expense record
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const expenseId = parseInt(req.params.id);

    if (isNaN(expenseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID'
      });
    }

    // Check if expense record exists and belongs to user
    const [existingRecords] = await pool.execute(
      'SELECT id FROM expenses WHERE id = ? AND user_id = ?',
      [expenseId, userId]
    ) as any[];

    if (existingRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense record not found'
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete related transactions
      await connection.execute(
        'DELETE FROM transactions WHERE reference_id = ? AND reference_table = ? AND user_id = ?',
        [expenseId, 'expenses', userId]
      );

      // Delete expense record
      await connection.execute(
        'DELETE FROM expenses WHERE id = ? AND user_id = ?',
        [expenseId, userId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Expense record deleted successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get expense summary/statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Get total expenses, monthly expenses, and category breakdown
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_records,
        SUM(amount) as total_expenses,
        AVG(amount) as average_expense,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
       FROM expenses 
       WHERE user_id = ?`,
      [userId]
    ) as any[];

    // Get monthly expenses for current year
    const [monthlyStats] = await pool.execute(
      `SELECT 
        MONTH(date) as month,
        YEAR(date) as year,
        SUM(amount) as monthly_expenses,
        COUNT(*) as monthly_count
       FROM expenses 
       WHERE user_id = ? AND YEAR(date) = YEAR(CURDATE())
       GROUP BY YEAR(date), MONTH(date)
       ORDER BY month`,
      [userId]
    ) as any[];

    // Get category breakdown
    const [categoryStats] = await pool.execute(
      `SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
       FROM expenses 
       WHERE user_id = ? 
       GROUP BY category
       ORDER BY total_amount DESC`,
      [userId]
    ) as any[];

    // Get payment method breakdown
    const [paymentStats] = await pool.execute(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total_amount
       FROM expenses 
       WHERE user_id = ? 
       GROUP BY payment_method
       ORDER BY total_amount DESC`,
      [userId]
    ) as any[];

    res.json({
      success: true,
      data: {
        summary: stats[0],
        monthly: monthlyStats,
        by_category: categoryStats,
        by_payment_method: paymentStats
      }
    });
  } catch (error) {
    console.error('Expense stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
