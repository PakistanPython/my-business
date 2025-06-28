import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    console.log('--- Entering authenticateToken middleware ---');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('--- No token provided ---');
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    console.log('--- Token authenticated, proceeding ---');
    next();
  } catch (error) {
    console.error('--- Authentication error:', error);
    // Ensure a non-404 status is returned on authentication failure
    if (res.headersSent) { // Prevent "Cannot set headers after they are sent to the client"
      return;
    }
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};
