"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const auth_1 = __importDefault(require("./routes/auth"));
const income_1 = __importDefault(require("./routes/income"));
const expense_1 = __importDefault(require("./routes/expense"));
const charity_1 = __importDefault(require("./routes/charity"));
const account_1 = __importDefault(require("./routes/account"));
const loan_1 = __importDefault(require("./routes/loan"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const category_1 = __importDefault(require("./routes/category"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, compression_1.default)());
if (process.env.NODE_ENV !== 'production') {
    app.use((0, morgan_1.default)('dev'));
}
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/income', income_1.default);
app.use('/api/expenses', expense_1.default);
app.use('/api/charity', charity_1.default);
app.use('/api/accounts', account_1.default);
app.use('/api/loans', loan_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/categories', category_1.default);
app.get('/', (req, res) => {
    res.json({
        message: 'My Business Management System API',
        version: '1.0.0',
        endpoints: [
            'GET /health - Health check',
            'POST /api/auth/register - Register user',
            'POST /api/auth/login - Login user',
            'GET /api/dashboard/summary - Dashboard summary',
            'GET /api/income - Get income records',
            'POST /api/income - Create income record',
            'GET /api/expenses - Get expense records',
            'POST /api/expenses - Create expense record',
            'GET /api/charity - Get charity records',
            'POST /api/charity/payment - Record charity payment'
        ]
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
    });
});
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.details
        });
    }
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized access'
        });
    }
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});
const startServer = async () => {
    try {
        await (0, database_1.testConnection)();
        await (0, database_1.initializeDatabase)();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}`);
            console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});
startServer();
exports.default = app;
