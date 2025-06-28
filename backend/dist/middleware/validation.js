"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegistration = exports.validateExpense = exports.validateIncome = exports.validatePurchase = exports.validateSale = exports.runValidation = void 0;
const express_validator_1 = require("express-validator");
const runValidation = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};
exports.runValidation = runValidation;
exports.validateSale = [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    (0, express_validator_1.body)('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required')
        .isLength({ max: 50 })
        .withMessage('Category must not exceed 50 characters'),
    (0, express_validator_1.body)('payment_method')
        .trim()
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Check', 'PayPal', 'Mobile Payment', 'Other'])
        .withMessage('Invalid payment method'),
    (0, express_validator_1.body)('date')
        .isISO8601()
        .withMessage('Date must be a valid ISO date'),
    (0, express_validator_1.body)('receipt_path')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Receipt path must not exceed 255 characters'),
    exports.runValidation
];
exports.validatePurchase = [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    (0, express_validator_1.body)('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required')
        .isLength({ max: 50 })
        .withMessage('Category must not exceed 50 characters'),
    (0, express_validator_1.body)('payment_method')
        .trim()
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Check', 'PayPal', 'Mobile Payment', 'Other'])
        .withMessage('Invalid payment method'),
    (0, express_validator_1.body)('date')
        .isISO8601()
        .withMessage('Date must be a valid ISO date'),
    exports.runValidation
];
exports.validateIncome = [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    (0, express_validator_1.body)('category')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Category must not exceed 50 characters'),
    (0, express_validator_1.body)('source')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Source must not exceed 100 characters'),
    (0, express_validator_1.body)('date')
        .isISO8601()
        .withMessage('Date must be a valid ISO date'),
    exports.runValidation
];
exports.validateExpense = [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    (0, express_validator_1.body)('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required')
        .isLength({ max: 50 })
        .withMessage('Category must not exceed 50 characters'),
    (0, express_validator_1.body)('payment_method')
        .trim()
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Check', 'PayPal', 'Mobile Payment', 'Other'])
        .withMessage('Invalid payment method'),
    (0, express_validator_1.body)('date')
        .isISO8601()
        .withMessage('Date must be a valid ISO date'),
    exports.runValidation
];
exports.validateRegistration = [
    (0, express_validator_1.body)('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('full_name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Full name is required and must not exceed 100 characters'),
    (0, express_validator_1.body)('business_name')
        .optional()
        .trim()
        .isLength({ max: 150 })
        .withMessage('Business name must not exceed 150 characters'),
    exports.runValidation
];
