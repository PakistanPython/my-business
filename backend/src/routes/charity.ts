import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all charity records
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'partial', 'paid']).withMessage('Invalid status'),
  query('start_date').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('end_date').optional().isISO8601().withMessage('End date must be valid ISO date'),
  query('sort_by').optional().isIn(['created_at', 'amount_required', 'amount_remaining']).withMessage('Invalid sort field'),
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
    const status = req.query.status as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const sortBy = req.query.sort_by as string || 'created_at';
    const sortOrder = req.query.sort_order as string || 'desc';

    // Build WHERE clause
    let whereClause = 'WHERE c.user_id = ?';
    const whereParams = [userId];

    if (status) {
      whereClause += ' AND c.status = ?';
      whereParams.push(status);
    }

    if (startDate) {
      whereClause += ' AND c.created_at >= ?';
      whereParams.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND c.created_at <= ?';
      whereParams.push(endDate);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM charity c ${whereClause}`,
      whereParams
    ) as any[];
    const total = countResult[0].total;

    // Get charity records with related income information
    const [charityRecords] = await pool.execute(
      `SELECT 
        c.id, c.income_id, c.amount_required, c.amount_paid, c.amount_remaining,
        c.status, c.payment_date, c.description, c.recipient, c.created_at, c.updated_at,
        i.amount as income_amount, i.description as income_description, i.date as income_date
       FROM charity c 
       LEFT JOIN income i ON c.income_id = i.id
       ${whereClause} 
       ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}
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
        charity: charityRecords,
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
    console.error('Get charity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get charity by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const charityId = parseInt(req.params.id);

    if (isNaN(charityId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid charity ID'
      });
    }

    const [charityRecords] = await pool.execute(
      `SELECT 
        c.id, c.income_id, c.amount_required, c.amount_paid, c.amount_remaining,
        c.status, c.payment_date, c.description, c.recipient, c.created_at, c.updated_at,
        i.amount as income_amount, i.description as income_description, i.date as income_date
       FROM charity c 
       LEFT JOIN income i ON c.income_id = i.id
       WHERE c.id = ? AND c.user_id = ?`,
      [charityId, userId]
    ) as any[];

    if (charityRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Charity record not found'
      });
    }

    res.json({
      success: true,
      data: { charity: charityRecords[0] }
    });
  } catch (error) {
    console.error('Get charity by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Record charity payment
router.post('/payment', [
  body('charity_id')
    .isInt({ min: 1 })
    .withMessage('Valid charity ID is required'),
  body('payment_amount')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be a positive number'),
  body('payment_date')
    .isISO8601()
    .withMessage('Payment date must be valid ISO date'),
  body('recipient')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Recipient cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
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
    const { charity_id, payment_amount, payment_date, recipient, description } = req.body;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get charity record
      const [charityRecords] = await connection.execute(
        'SELECT id, amount_required, amount_paid, amount_remaining, status FROM charity WHERE id = ? AND user_id = ?',
        [charity_id, userId]
      ) as any[];

      if (charityRecords.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Charity record not found'
        });
      }

      const charity = charityRecords[0];

      // Validate payment amount
      if (payment_amount > charity.amount_remaining) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Payment amount cannot exceed remaining balance of ${charity.amount_remaining}`
        });
      }

      // Calculate new amounts
      const newAmountPaid = parseFloat(charity.amount_paid) + parseFloat(payment_amount);
      const newAmountRemaining = parseFloat(charity.amount_required) - newAmountPaid;

      // Determine new status
      let newStatus = 'partial';
      if (newAmountRemaining <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid === 0) {
        newStatus = 'pending';
      }

      // Update charity record
      await connection.execute(
        `UPDATE charity SET 
          amount_paid = ?, 
          status = ?, 
          payment_date = ?,
          recipient = COALESCE(?, recipient),
          description = COALESCE(?, description),
          updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newAmountPaid, newStatus, payment_date, recipient, description, charity_id]
      );

      // Record transaction for audit trail
      await connection.execute(
        'INSERT INTO transactions (user_id, transaction_type, reference_id, reference_table, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 'charity', charity_id, 'charity', payment_amount, `Charity payment: ${description || 'Charity contribution'}`, payment_date]
      );

      // Get updated charity record
      const [updatedRecords] = await connection.execute(
        `SELECT 
          c.id, c.income_id, c.amount_required, c.amount_paid, c.amount_remaining,
          c.status, c.payment_date, c.description, c.recipient, c.created_at, c.updated_at,
          i.amount as income_amount, i.description as income_description, i.date as income_date
         FROM charity c 
         LEFT JOIN income i ON c.income_id = i.id
         WHERE c.id = ?`,
        [charity_id]
      ) as any[];

      await connection.commit();

      res.json({
        success: true,
        message: 'Charity payment recorded successfully',
        data: { 
          charity: updatedRecords[0],
          payment: {
            amount: payment_amount,
            date: payment_date,
            recipient,
            description
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
    console.error('Record charity payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create manual charity entry (not tied to income)
router.post('/', [
  body('amount_required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount required must be a positive number'),
  body('description')
    .trim()
    .notEmpty()
    .isLength({ max: 500 })
    .withMessage('Description is required and cannot exceed 500 characters'),
  body('recipient')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Recipient cannot exceed 100 characters')
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
    const { amount_required, description, recipient } = req.body;

    // Insert charity record
    const [charityResult] = await pool.execute(
      'INSERT INTO charity (user_id, amount_required, description, recipient) VALUES (?, ?, ?, ?)',
      [userId, amount_required, description, recipient]
    ) as any[];

    const charityId = charityResult.insertId;

    // Get the created charity record
    const [charityRecords] = await pool.execute(
      'SELECT * FROM charity WHERE id = ?',
      [charityId]
    ) as any[];

    res.status(201).json({
      success: true,
      message: 'Manual charity record created successfully',
      data: { charity: charityRecords[0] }
    });
  } catch (error) {
    console.error('Create manual charity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update charity record
router.put('/:id', [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('recipient')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Recipient cannot exceed 100 characters')
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
    const charityId = parseInt(req.params.id);

    if (isNaN(charityId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid charity ID'
      });
    }

    // Check if charity record exists and belongs to user
    const [existingRecords] = await pool.execute(
      'SELECT id FROM charity WHERE id = ? AND user_id = ?',
      [charityId, userId]
    ) as any[];

    if (existingRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Charity record not found'
      });
    }

    const { description, recipient } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (recipient !== undefined) {
      updates.push('recipient = ?');
      values.push(recipient);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    values.push(charityId);

    // Update charity record
    await pool.execute(
      `UPDATE charity SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Get updated record
    const [updatedRecords] = await pool.execute(
      `SELECT 
        c.id, c.income_id, c.amount_required, c.amount_paid, c.amount_remaining,
        c.status, c.payment_date, c.description, c.recipient, c.created_at, c.updated_at,
        i.amount as income_amount, i.description as income_description, i.date as income_date
       FROM charity c 
       LEFT JOIN income i ON c.income_id = i.id
       WHERE c.id = ?`,
      [charityId]
    ) as any[];

    res.json({
      success: true,
      message: 'Charity record updated successfully',
      data: { charity: updatedRecords[0] }
    });
  } catch (error) {
    console.error('Update charity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete charity record
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const charityId = parseInt(req.params.id);

    if (isNaN(charityId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid charity ID'
      });
    }

    // Check if charity record exists and belongs to user
    const [existingRecords] = await pool.execute(
      'SELECT id, income_id FROM charity WHERE id = ? AND user_id = ?',
      [charityId, userId]
    ) as any[];

    if (existingRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Charity record not found'
      });
    }

    const charity = existingRecords[0];

    // Check if this is an auto-generated charity (tied to income)
    if (charity.income_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete auto-generated charity records. Delete the related income record instead.'
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete related transactions
      await connection.execute(
        'DELETE FROM transactions WHERE reference_id = ? AND reference_table = ? AND user_id = ?',
        [charityId, 'charity', userId]
      );

      // Delete charity record
      await connection.execute(
        'DELETE FROM charity WHERE id = ? AND user_id = ?',
        [charityId, userId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Charity record deleted successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete charity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get charity summary/statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Get charity summary statistics
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_records,
        SUM(amount_required) as total_required,
        SUM(amount_paid) as total_paid,
        SUM(amount_remaining) as total_remaining,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial_count,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count
       FROM charity 
       WHERE user_id = ?`,
      [userId]
    ) as any[];

    // Get monthly charity payments for current year
    const [monthlyStats] = await pool.execute(
      `SELECT 
        MONTH(payment_date) as month,
        YEAR(payment_date) as year,
        SUM(amount_paid) as monthly_payments,
        COUNT(*) as monthly_count
       FROM charity 
       WHERE user_id = ? AND payment_date IS NOT NULL AND YEAR(payment_date) = YEAR(CURDATE())
       GROUP BY YEAR(payment_date), MONTH(payment_date)
       ORDER BY month`,
      [userId]
    ) as any[];

    // Get recent charity activities
    const [recentActivities] = await pool.execute(
      `SELECT 
        c.id, c.amount_required, c.amount_paid, c.amount_remaining, c.status,
        c.description, c.payment_date, c.created_at,
        i.description as income_description
       FROM charity c
       LEFT JOIN income i ON c.income_id = i.id
       WHERE c.user_id = ?
       ORDER BY c.updated_at DESC
       LIMIT 10`,
      [userId]
    ) as any[];

    res.json({
      success: true,
      data: {
        summary: stats[0],
        monthly_payments: monthlyStats,
        recent_activities: recentActivities
      }
    });
  } catch (error) {
    console.error('Charity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
