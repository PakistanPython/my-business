import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation middleware runner
export const runValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Sale validation rules
export const validateSale = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),
  
  body('payment_method')
    .trim()
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Check', 'PayPal', 'Mobile Payment', 'Other'])
    .withMessage('Invalid payment method'),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO date'),
  
  body('receipt_path')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Receipt path must not exceed 255 characters'),
  
  runValidation
];

// Purchase validation rules (if not already exists)
export const validatePurchase = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),
  
  body('payment_method')
    .trim()
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Check', 'PayPal', 'Mobile Payment', 'Other'])
    .withMessage('Invalid payment method'),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO date'),
  
  runValidation
];

// Income validation rules
export const validateIncome = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),
  
  body('source')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Source must not exceed 100 characters'),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO date'),
  
  runValidation
];

// Expense validation rules
export const validateExpense = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),
  
  body('payment_method')
    .trim()
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Check', 'PayPal', 'Mobile Payment', 'Other'])
    .withMessage('Invalid payment method'),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO date'),
  
  runValidation
];

// User registration validation
export const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('full_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name is required and must not exceed 100 characters'),
  
  body('business_name')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Business name must not exceed 150 characters'),
  
  runValidation
];
