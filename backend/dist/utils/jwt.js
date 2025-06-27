"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'my-business-api',
        audience: 'my-business-app'
    });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET, {
            issuer: 'my-business-api',
            audience: 'my-business-app'
        });
        return decoded;
    }
    catch (error) {
        throw new Error('Invalid or expired token');
    }
};
exports.verifyToken = verifyToken;
const refreshToken = (token) => {
    try {
        const decoded = (0, exports.verifyToken)(token);
        return (0, exports.generateToken)({
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email
        });
    }
    catch (error) {
        throw new Error('Unable to refresh token');
    }
};
exports.refreshToken = refreshToken;
