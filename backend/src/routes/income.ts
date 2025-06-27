import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all income records
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
      `SELECT COUNT(*) as total FROM income ${whereClause}`,
      whereParams
    ) as any[];
    const total = countResult[0].total;

    // Get income records
    const [incomeRecords] = await pool.execute(
      `SELECT 
        id, amount, description, category, source, date, 
        charity_required, created_at, updated_at
       FROM income 
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
        income: incomeRecords,
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
    console.error('Get income error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get income by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const incomeId = parseInt(req.params.id);

    if (isNaN(incomeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid income ID'
      });
    }

    const [incomeRecords] = await pool.execute(
      `SELECT 
        id, amount, description, category, source, date, 
        charity_required, created_at, updated_at
       FROM income 
       WHERE id = ? AND user_id = ?`,
      [incomeId, userId]
    ) as any[];

    if (incomeRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found'
      });
    }

    res.json({
      success: true,
      data: { income: incomeRecords[0] }
    });
  } catch (error) {
    console.error('Get income by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new income record
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
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('source')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Source cannot exceed 100 characters'),
  body('date')
    .isISO8601()
    .withMessage('Date must be valid ISO date')
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
    const { amount, description, category = 'General', source, date } = req.body;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert income record (charity_required is auto-calculated by the database)
      const [incomeResult] = await connection.execute(
        'INSERT INTO income (user_id, amount, description, category, source, date) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, amount, description, category, source, date]
      ) as any[];

      const incomeId = incomeResult.insertId;

      // Get the created income record with calculated charity_required
      const [incomeRecords] = await connection.execute(
        'SELECT * FROM income WHERE id = ?',
        [incomeId]
      ) as any[];

      const incomeRecord = incomeRecords[0];

      // Create charity record with auto-calculated 6% amount
      const charityAmount = parseFloat(incomeRecord.charity_required);
      await connection.execute(
        'INSERT INTO charity (user_id, income_id, amount_required, description) VALUES (?, ?, ?, ?)',
        [userId, incomeId, charityAmount, `Charity for income: ${description || category}`]
      );

      // Record transaction for audit trail
      await connection.execute(
        'INSERT INTO transactions (user_id, transaction_type, reference_id, reference_table, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 'income', incomeId, 'income', amount, `Income: ${description || category}`, date]
      );

      // Commit transaction
      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Income record created successfully',
        data: {
          income: incomeRecord,
          charity_created: {
            amount_required: charityAmount,
            status: 'pending'
          }
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update income record
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
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('source')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Source cannot exceed 100 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be valid ISO date')
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
    const incomeId = parseInt(req.params.id);

    if (isNaN(incomeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid income ID'
      });
    }

    // Check if income record exists and belongs to user
    const [existingRecords] = await pool.execute(
      'SELECT id, amount FROM income WHERE id = ? AND user_id = ?',
      [incomeId, userId]
    ) as any[];

    if (existingRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found'
      });
    }

    const { amount, description, category, source, date } = req.body;
    const oldAmount = existingRecords[0].amount;

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
    if (source !== undefined) {
      updates.push('source = ?');
      values.push(source);
    }
    if (date !== undefined) {
      updates.push('date = ?');
      values.push(date);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    values.push(incomeId);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update income record
      await connection.execute(
        `UPDATE income SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      // If amount changed, update related charity record
      if (amount !== undefined && amount !== oldAmount) {
        const newCharityAmount = amount * 0.06;
        
        // Update charity amount_required
        await connection.execute(
          'UPDATE charity SET amount_required = ? WHERE income_id = ? AND user_id = ?',
          [newCharityAmount, incomeId, userId]
        );
      }

      // Get updated record
      const [updatedRecords] = await connection.execute(
        'SELECT * FROM income WHERE id = ?',
        [incomeId]
      ) as any[];

      await connection.commit();

      res.json({
        success: true,
        message: 'Income record updated successfully',
        data: { income: updatedRecords[0] }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete income record
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const incomeId = parseInt(req.params.id);

    if (isNaN(incomeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid income ID'
      });
    }

    // Check if income record exists and belongs to user
    const [existingRecords] = await pool.execute(
      'SELECT id FROM income WHERE id = ? AND user_id = ?',
      [incomeId, userId]
    ) as any[];

    if (existingRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found'
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete related charity records
      await connection.execute(
        'DELETE FROM charity WHERE income_id = ? AND user_id = ?',
        [incomeId, userId]
      );

      // Delete related transactions
      await connection.execute(
        'DELETE FROM transactions WHERE reference_id = ? AND reference_table = ? AND user_id = ?',
        [incomeId, 'income', userId]
      );

      // Delete income record
      await connection.execute(
        'DELETE FROM income WHERE id = ? AND user_id = ?',
        [incomeId, userId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Income record deleted successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get income summary/statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Get total income, monthly income, and category breakdown
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_records,
        SUM(amount) as total_income,
        AVG(amount) as average_income,
        SUM(charity_required) as total_charity_required,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
       FROM income 
       WHERE user_id = ?`,
      [userId]
    ) as any[];

    // Get monthly income for current year
    const [monthlyStats] = await pool.execute(
      `SELECT 
        MONTH(date) as month,
        YEAR(date) as year,
        SUM(amount) as monthly_income,
        COUNT(*) as monthly_count
       FROM income 
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
       FROM income 
       WHERE user_id = ? 
       GROUP BY category
       ORDER BY total_amount DESC`,
      [userId]
    ) as any[];

    res.json({
      success: true,
      data: {
        summary: stats[0],
        monthly: monthlyStats,
        by_category: categoryStats
      }
    });
  } catch (error) {
    console.error('Income stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
