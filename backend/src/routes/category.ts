import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all categories
router.get('/', [
  query('type').optional().isIn(['income', 'expense', 'purchase']).withMessage('Type must be income, expense, or purchase')
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
    const type = req.query.type as string;

    let whereClause = 'WHERE user_id = ?';
    const whereParams = [userId];

    if (type) {
      whereClause += ' AND type = ?';
      whereParams.push(type);
    }

    console.log('Category API - whereClause:', whereClause);
    console.log('Category API - whereParams:', whereParams);

    const [categories] = await pool.execute(
      `SELECT id, name, type, color, icon, created_at 
       FROM categories 
       ${whereClause} 
       ORDER BY type, name`,
      whereParams
    ) as any[];

    console.log('Category API - Fetched categories:', categories);

    // Group categories by type
    const groupedCategories = categories.reduce((acc: any, category: any) => {
      if (!acc[category.type]) {
        acc[category.type] = [];
      }
      acc[category.type].push(category);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        categories: categories,
        grouped: groupedCategories
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const [categories] = await pool.execute(
      'SELECT id, name, type, color, icon, created_at FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    ) as any[];

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: { category: categories[0] }
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new category
router.post('/', [
  body('name')
    .trim()
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage('Category name is required and cannot exceed 50 characters'),
  body('type')
    .isIn(['income', 'expense', 'purchase'])
    .withMessage('Type must be income, expense, or purchase'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon cannot exceed 50 characters')
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
    const { name, type, color = '#3B82F6', icon = 'circle' } = req.body;

    // Check for duplicate category name and type for the user
    const [existingCategories] = await pool.execute(
      'SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?',
      [userId, name, type]
    ) as any[];

    if (existingCategories.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name and type already exists'
      });
    }

    // Insert category record
    const [categoryResult] = await pool.execute(
      'INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)',
      [userId, name, type, color, icon]
    ) as any[];

    const categoryId = categoryResult.insertId;

    // Get the created category record
    const [categoryRecords] = await pool.execute(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    ) as any[];

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category: categoryRecords[0] }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update category
router.put('/:id', [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage('Category name cannot be empty and cannot exceed 50 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon cannot exceed 50 characters')
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
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    // Check if category exists and belongs to user
    const [existingCategories] = await pool.execute(
      'SELECT id, name, type FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    ) as any[];

    if (existingCategories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const existingCategory = existingCategories[0];
    const { name, color, icon } = req.body;

    // Check for duplicate category name if changing name
    if (name && name !== existingCategory.name) {
      const [duplicateCategories] = await pool.execute(
        'SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ? AND id != ?',
        [userId, name, existingCategory.type, categoryId]
      ) as any[];

      if (duplicateCategories.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Category with this name and type already exists'
        });
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      values.push(icon);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    values.push(categoryId);

    // Update category record
    await pool.execute(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated record
    const [updatedCategories] = await pool.execute(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    ) as any[];

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category: updatedCategories[0] }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    // Check if category exists and belongs to user
    const [existingCategories] = await pool.execute(
      'SELECT id, name, type FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    ) as any[];

    if (existingCategories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const category = existingCategories[0];

    // Check if category is being used in income or expenses
    const [incomeUsage] = await pool.execute(
      'SELECT COUNT(*) as count FROM income WHERE user_id = ? AND category = ?',
      [userId, category.name]
    ) as any[];

    const [expenseUsage] = await pool.execute(
      'SELECT COUNT(*) as count FROM expenses WHERE user_id = ? AND category = ?',
      [userId, category.name]
    ) as any[];

    const [purchaseUsage] = await pool.execute(
      'SELECT COUNT(*) as count FROM purchases WHERE user_id = ? AND category = ?',
      [userId, category.name]
    ) as any[];

    if (incomeUsage[0].count > 0 || expenseUsage[0].count > 0 || purchaseUsage[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that is being used in transactions',
        data: {
          income_count: incomeUsage[0].count,
          expense_count: expenseUsage[0].count,
          purchase_count: purchaseUsage[0].count
        }
      });
    }

    // Delete category record
    await pool.execute(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get category usage statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    // Get category info
    const [categories] = await pool.execute(
      'SELECT id, name, type FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    ) as any[];

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const category = categories[0];

    // Get usage statistics based on category type
    let usageStats;
    if (category.type === 'income') {
      const [stats] = await pool.execute(
        `SELECT 
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount,
          MIN(date) as earliest_date,
          MAX(date) as latest_date
         FROM income 
         WHERE user_id = ? AND category = ?`,
        [userId, category.name]
      ) as any[];
      usageStats = stats[0];
    } else {
      const [stats] = await pool.execute(
        `SELECT 
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount,
          MIN(date) as earliest_date,
          MAX(date) as latest_date
         FROM expenses 
         WHERE user_id = ? AND category = ?`,
        [userId, category.name]
      ) as any[];
      usageStats = stats[0];
    }

    // Get monthly breakdown for current year
    const table = category.type === 'income' ? 'income' : 'expenses';
    const [monthlyStats] = await pool.execute(
      `SELECT 
        MONTH(date) as month,
        MONTHNAME(date) as month_name,
        SUM(amount) as monthly_amount,
        COUNT(*) as monthly_count
       FROM ${table} 
       WHERE user_id = ? AND category = ? AND YEAR(date) = YEAR(CURDATE())
       GROUP BY MONTH(date), MONTHNAME(date)
       ORDER BY MONTH(date)`,
      [userId, category.name]
    ) as any[];

    res.json({
      success: true,
      data: {
        category,
        usage_stats: usageStats,
        monthly_breakdown: monthlyStats
      }
    });
  } catch (error) {
    console.error('Category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all categories with usage counts
router.get('/usage/summary', async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Get categories with usage counts
    const [categoriesWithUsage] = await pool.execute(
      `SELECT 
        c.id,
        c.name,
        c.type,
        c.color,
        c.icon,
        c.created_at,
        COALESCE(usage.transaction_count, 0) as transaction_count,
        COALESCE(usage.total_amount, 0) as total_amount
       FROM categories c
       LEFT JOIN (
         SELECT 
           category,
           'income' as type,
           COUNT(*) as transaction_count,
           SUM(amount) as total_amount
         FROM income 
         WHERE user_id = ?
         GROUP BY category
         
         UNION ALL
         
         SELECT 
           category,
           'expense' as type,
           COUNT(*) as transaction_count,
           SUM(amount) as total_amount
         FROM expenses 
         WHERE user_id = ?
         GROUP BY category

         UNION ALL

         SELECT
           category,
           'purchase' as type,
           COUNT(*) as transaction_count,
           SUM(amount) as total_amount
         FROM purchases
         WHERE user_id = ?
         GROUP BY category
       ) usage ON c.name = usage.category AND c.type = usage.type
       WHERE c.user_id = ?
       ORDER BY c.type, usage.total_amount DESC, c.name`,
      [userId, userId, userId, userId]
    ) as any[];

    res.json({
      success: true,
      data: { categories: categoriesWithUsage }
    });
  } catch (error) {
    console.error('Category usage summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
