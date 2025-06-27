import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all loans
router.get('/', [
  query('status').optional().isIn(['active', 'paid', 'defaulted']).withMessage('Invalid status'),
  query('loan_type').optional().isIn(['personal', 'business', 'mortgage', 'auto', 'other']).withMessage('Invalid loan type')
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
    const status = req.query.status as string;
    const loanType = req.query.loan_type as string;

    // Build WHERE clause
    let whereClause = 'WHERE user_id = ?';
    const whereParams = [userId];

    if (status) {
      whereClause += ' AND status = ?';
      whereParams.push(status);
    }

    if (loanType) {
      whereClause += ' AND loan_type = ?';
      whereParams.push(loanType);
    }

    const [loans] = await pool.execute(
      `SELECT 
        id, loan_type, lender_name, principal_amount, current_balance, 
        interest_rate, monthly_payment, start_date, due_date, status, 
        created_at, updated_at
       FROM loans 
       ${whereClause} 
       ORDER BY status, start_date DESC`,
      whereParams
    ) as any[];

    // Calculate totals
    const totals = loans.reduce((acc: any, loan: any) => {
      acc.total_principal += parseFloat(loan.principal_amount);
      acc.total_current_balance += parseFloat(loan.current_balance);
      if (loan.status === 'active') {
        acc.active_balance += parseFloat(loan.current_balance);
      }
      return acc;
    }, { total_principal: 0, total_current_balance: 0, active_balance: 0 });

    res.json({
      success: true,
      data: {
        loans,
        totals
      }
    });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get loan by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const loanId = parseInt(req.params.id);

    if (isNaN(loanId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid loan ID'
      });
    }

    const [loans] = await pool.execute(
      `SELECT 
        id, loan_type, lender_name, principal_amount, current_balance, 
        interest_rate, monthly_payment, start_date, due_date, status, 
        created_at, updated_at
       FROM loans 
       WHERE id = ? AND user_id = ?`,
      [loanId, userId]
    ) as any[];

    if (loans.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    res.json({
      success: true,
      data: { loan: loans[0] }
    });
  } catch (error) {
    console.error('Get loan by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new loan
router.post('/', [
  body('loan_type')
    .isIn(['personal', 'business', 'mortgage', 'auto', 'other'])
    .withMessage('Loan type must be personal, business, mortgage, auto, or other'),
  body('lender_name')
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Lender name is required and cannot exceed 100 characters'),
  body('principal_amount')
    .isFloat({ min: 0.01 })
    .withMessage('Principal amount must be a positive number'),
  body('current_balance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current balance must be a non-negative number'),
  body('interest_rate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Interest rate must be between 0 and 100'),
  body('monthly_payment')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly payment must be a non-negative number'),
  body('start_date')
    .isISO8601()
    .withMessage('Start date must be valid ISO date'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be valid ISO date')
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
    const { 
      loan_type, 
      lender_name, 
      principal_amount, 
      current_balance = principal_amount, 
      interest_rate, 
      monthly_payment, 
      start_date, 
      due_date 
    } = req.body;

    // Insert loan record
    const [loanResult] = await pool.execute(
      `INSERT INTO loans 
       (user_id, loan_type, lender_name, principal_amount, current_balance, 
        interest_rate, monthly_payment, start_date, due_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, loan_type, lender_name, principal_amount, current_balance, 
       interest_rate, monthly_payment, start_date, due_date]
    ) as any[];

    const loanId = loanResult.insertId;

    // Get the created loan record
    const [loanRecords] = await pool.execute(
      'SELECT * FROM loans WHERE id = ?',
      [loanId]
    ) as any[];

    res.status(201).json({
      success: true,
      message: 'Loan record created successfully',
      data: { loan: loanRecords[0] }
    });
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update loan
router.put('/:id', [
  body('lender_name')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Lender name cannot be empty and cannot exceed 100 characters'),
  body('current_balance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current balance must be a non-negative number'),
  body('interest_rate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Interest rate must be between 0 and 100'),
  body('monthly_payment')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly payment must be a non-negative number'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be valid ISO date'),
  body('status')
    .optional()
    .isIn(['active', 'paid', 'defaulted'])
    .withMessage('Status must be active, paid, or defaulted')
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
    const loanId = parseInt(req.params.id);

    if (isNaN(loanId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid loan ID'
      });
    }

    // Check if loan exists and belongs to user
    const [existingLoans] = await pool.execute(
      'SELECT id FROM loans WHERE id = ? AND user_id = ?',
      [loanId, userId]
    ) as any[];

    if (existingLoans.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    const { lender_name, current_balance, interest_rate, monthly_payment, due_date, status } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (lender_name !== undefined) {
      updates.push('lender_name = ?');
      values.push(lender_name);
    }
    if (current_balance !== undefined) {
      updates.push('current_balance = ?');
      values.push(current_balance);
    }
    if (interest_rate !== undefined) {
      updates.push('interest_rate = ?');
      values.push(interest_rate);
    }
    if (monthly_payment !== undefined) {
      updates.push('monthly_payment = ?');
      values.push(monthly_payment);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    values.push(loanId);

    // Update loan record
    await pool.execute(
      `UPDATE loans SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Get updated record
    const [updatedLoans] = await pool.execute(
      'SELECT * FROM loans WHERE id = ?',
      [loanId]
    ) as any[];

    res.json({
      success: true,
      message: 'Loan updated successfully',
      data: { loan: updatedLoans[0] }
    });
  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Record loan payment
router.post('/:id/payment', [
  body('payment_amount')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be a positive number'),
  body('payment_date')
    .isISO8601()
    .withMessage('Payment date must be valid ISO date'),
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
    const loanId = parseInt(req.params.id);
    const { payment_amount, payment_date, description } = req.body;

    if (isNaN(loanId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid loan ID'
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get loan record
      const [loans] = await connection.execute(
        'SELECT id, lender_name, current_balance, status FROM loans WHERE id = ? AND user_id = ?',
        [loanId, userId]
      ) as any[];

      if (loans.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Loan not found'
        });
      }

      const loan = loans[0];

      if (loan.status !== 'active') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot make payments on inactive loans'
        });
      }

      // Validate payment amount
      if (parseFloat(payment_amount) > parseFloat(loan.current_balance)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Payment amount cannot exceed current balance of ${loan.current_balance}`
        });
      }

      // Calculate new balance
      const newBalance = parseFloat(loan.current_balance) - parseFloat(payment_amount);
      const newStatus = newBalance <= 0 ? 'paid' : 'active';

      // Update loan balance and status
      await connection.execute(
        'UPDATE loans SET current_balance = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newBalance, newStatus, loanId]
      );

      // Record transaction for audit trail
      await connection.execute(
        'INSERT INTO transactions (user_id, transaction_type, reference_id, reference_table, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 'loan_payment', loanId, 'loans', payment_amount, description || `Loan payment to ${loan.lender_name}`, payment_date]
      );

      // Get updated loan record
      const [updatedLoans] = await connection.execute(
        'SELECT * FROM loans WHERE id = ?',
        [loanId]
      ) as any[];

      await connection.commit();

      res.json({
        success: true,
        message: 'Loan payment recorded successfully',
        data: { 
          loan: updatedLoans[0],
          payment: {
            amount: payment_amount,
            date: payment_date,
            description: description || `Loan payment to ${loan.lender_name}`,
            new_balance: newBalance,
            status: newStatus
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
    console.error('Record loan payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete loan
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const loanId = parseInt(req.params.id);

    if (isNaN(loanId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid loan ID'
      });
    }

    // Check if loan exists and belongs to user
    const [existingLoans] = await pool.execute(
      'SELECT id, status FROM loans WHERE id = ? AND user_id = ?',
      [loanId, userId]
    ) as any[];

    if (existingLoans.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete related transactions
      await connection.execute(
        'DELETE FROM transactions WHERE reference_id = ? AND reference_table = ? AND user_id = ?',
        [loanId, 'loans', userId]
      );

      // Delete loan record
      await connection.execute(
        'DELETE FROM loans WHERE id = ? AND user_id = ?',
        [loanId, userId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Loan record deleted successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get loan statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Get loan summary statistics
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_loans,
        SUM(principal_amount) as total_principal,
        SUM(current_balance) as total_current_balance,
        SUM(CASE WHEN status = 'active' THEN current_balance ELSE 0 END) as active_balance,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_loans,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_loans,
        AVG(CASE WHEN status = 'active' THEN interest_rate END) as avg_interest_rate
       FROM loans 
       WHERE user_id = ?`,
      [userId]
    ) as any[];

    // Get loans by type
    const [typeStats] = await pool.execute(
      `SELECT 
        loan_type,
        COUNT(*) as count,
        SUM(principal_amount) as total_principal,
        SUM(current_balance) as total_balance
       FROM loans 
       WHERE user_id = ? 
       GROUP BY loan_type
       ORDER BY total_balance DESC`,
      [userId]
    ) as any[];

    // Get recent loan activities (payments)
    const [recentPayments] = await pool.execute(
      `SELECT 
        t.amount, t.description, t.date, t.created_at,
        l.lender_name, l.loan_type
       FROM transactions t
       JOIN loans l ON t.reference_id = l.id
       WHERE t.user_id = ? AND t.transaction_type = 'loan_payment'
       ORDER BY t.created_at DESC
       LIMIT 10`,
      [userId]
    ) as any[];

    res.json({
      success: true,
      data: {
        summary: stats[0],
        by_type: typeStats,
        recent_payments: recentPayments
      }
    });
  } catch (error) {
    console.error('Loan stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
