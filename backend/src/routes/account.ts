import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all accounts
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;

    const [accounts] = await pool.execute(
      `SELECT 
        id, account_type, account_name, balance, bank_name, account_number, 
        created_at, updated_at
       FROM accounts 
       WHERE user_id = ? 
       ORDER BY account_type, account_name`,
      [userId]
    ) as any[];

    // Calculate totals by account type
    const totals = accounts.reduce((acc: any, account: any) => {
      if (!acc[account.account_type]) {
        acc[account.account_type] = 0;
      }
      acc[account.account_type] += parseFloat(account.balance);
      return acc;
    }, {});

    const grandTotal = Object.values(totals).reduce((sum: any, val: any) => sum + val, 0);

    res.json({
      success: true,
      data: {
        accounts,
        totals: {
          ...totals,
          grand_total: grandTotal
        }
      }
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get account by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const accountId = parseInt(req.params.id);

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID'
      });
    }

    const [accounts] = await pool.execute(
      `SELECT 
        id, account_type, account_name, balance, bank_name, account_number, 
        created_at, updated_at
       FROM accounts 
       WHERE id = ? AND user_id = ?`,
      [accountId, userId]
    ) as any[];

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: { account: accounts[0] }
    });
  } catch (error) {
    console.error('Get account by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new account
router.post('/', [
  body('account_type')
    .isIn(['cash', 'bank', 'savings', 'investment'])
    .withMessage('Account type must be cash, bank, savings, or investment'),
  body('account_name')
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Account name is required and cannot exceed 100 characters'),
  body('balance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Balance must be a non-negative number'),
  body('bank_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bank name cannot exceed 100 characters'),
  body('account_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Account number cannot exceed 50 characters')
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
    const { account_type, account_name, balance = 0, bank_name, account_number } = req.body;

    // Check for duplicate account name for the user
    const [existingAccounts] = await pool.execute(
      'SELECT id FROM accounts WHERE user_id = ? AND account_name = ?',
      [userId, account_name]
    ) as any[];

    if (existingAccounts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Account name already exists'
      });
    }

    // Insert account record
    const [accountResult] = await pool.execute(
      'INSERT INTO accounts (user_id, account_type, account_name, balance, bank_name, account_number) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, account_type, account_name, balance, bank_name, account_number]
    ) as any[];

    const accountId = accountResult.insertId;

    // Get the created account record
    const [accountRecords] = await pool.execute(
      'SELECT * FROM accounts WHERE id = ?',
      [accountId]
    ) as any[];

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { account: accountRecords[0] }
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update account
router.put('/:id', [
  body('account_name')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Account name cannot be empty and cannot exceed 100 characters'),
  body('balance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Balance must be a non-negative number'),
  body('bank_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bank name cannot exceed 100 characters'),
  body('account_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Account number cannot exceed 50 characters')
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
    const accountId = parseInt(req.params.id);

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID'
      });
    }

    // Check if account exists and belongs to user
    const [existingAccounts] = await pool.execute(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    ) as any[];

    if (existingAccounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const { account_name, balance, bank_name, account_number } = req.body;

    // Check for duplicate account name if changing name
    if (account_name) {
      const [duplicateAccounts] = await pool.execute(
        'SELECT id FROM accounts WHERE user_id = ? AND account_name = ? AND id != ?',
        [userId, account_name, accountId]
      ) as any[];

      if (duplicateAccounts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Account name already exists'
        });
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (account_name !== undefined) {
      updates.push('account_name = ?');
      values.push(account_name);
    }
    if (balance !== undefined) {
      updates.push('balance = ?');
      values.push(balance);
    }
    if (bank_name !== undefined) {
      updates.push('bank_name = ?');
      values.push(bank_name);
    }
    if (account_number !== undefined) {
      updates.push('account_number = ?');
      values.push(account_number);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    values.push(accountId);

    // Update account record
    await pool.execute(
      `UPDATE accounts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Get updated record
    const [updatedAccounts] = await pool.execute(
      'SELECT * FROM accounts WHERE id = ?',
      [accountId]
    ) as any[];

    res.json({
      success: true,
      message: 'Account updated successfully',
      data: { account: updatedAccounts[0] }
    });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete account
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const accountId = parseInt(req.params.id);

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID'
      });
    }

    // Check if account exists and belongs to user
    const [existingAccounts] = await pool.execute(
      'SELECT id, balance FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    ) as any[];

    if (existingAccounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const account = existingAccounts[0];

    // Check if account has balance
    if (parseFloat(account.balance) !== 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with non-zero balance'
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete related transactions
      await connection.execute(
        'DELETE FROM transactions WHERE account_id = ? AND user_id = ?',
        [accountId, userId]
      );

      // Delete account record
      await connection.execute(
        'DELETE FROM accounts WHERE id = ? AND user_id = ?',
        [accountId, userId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Transfer money between accounts
router.post('/transfer', [
  body('from_account_id')
    .isInt({ min: 1 })
    .withMessage('Valid from account ID is required'),
  body('to_account_id')
    .isInt({ min: 1 })
    .withMessage('Valid to account ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
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
    const { from_account_id, to_account_id, amount, description, date } = req.body;

    if (from_account_id === to_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to the same account'
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check both accounts exist and belong to user
      const [accounts] = await connection.execute(
        'SELECT id, account_name, balance FROM accounts WHERE id IN (?, ?) AND user_id = ?',
        [from_account_id, to_account_id, userId]
      ) as any[];

      if (accounts.length !== 2) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'One or both accounts not found'
        });
      }

      const fromAccount = accounts.find((acc: any) => acc.id === from_account_id);
      const toAccount = accounts.find((acc: any) => acc.id === to_account_id);

      // Check sufficient balance
      if (parseFloat(fromAccount.balance) < parseFloat(amount)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance in source account'
        });
      }

      // Update account balances
      await connection.execute(
        'UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [amount, from_account_id]
      );

      await connection.execute(
        'UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [amount, to_account_id]
      );

      // Record transactions for both accounts
      const transferDescription = description || `Transfer from ${fromAccount.account_name} to ${toAccount.account_name}`;

      // Debit transaction
      await connection.execute(
        'INSERT INTO transactions (user_id, transaction_type, amount, description, account_id, date) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'transfer', -amount, `${transferDescription} (Debit)`, from_account_id, date]
      );

      // Credit transaction
      await connection.execute(
        'INSERT INTO transactions (user_id, transaction_type, amount, description, account_id, date) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'transfer', amount, `${transferDescription} (Credit)`, to_account_id, date]
      );

      // Get updated account balances
      const [updatedAccounts] = await connection.execute(
        'SELECT id, account_name, balance FROM accounts WHERE id IN (?, ?)',
        [from_account_id, to_account_id]
      ) as any[];

      await connection.commit();

      res.json({
        success: true,
        message: 'Transfer completed successfully',
        data: {
          transfer: {
            from_account: updatedAccounts.find((acc: any) => acc.id === from_account_id),
            to_account: updatedAccounts.find((acc: any) => acc.id === to_account_id),
            amount,
            description: transferDescription,
            date
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
    console.error('Transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
