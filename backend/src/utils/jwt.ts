import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(
    payload, 
    JWT_SECRET as any, 
    {
      expiresIn: JWT_EXPIRES_IN as any,
      issuer: 'my-business-api',
      audience: 'my-business-app'
    }
  );
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'my-business-api',
      audience: 'my-business-app'
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const refreshToken = (token: string): string => {
  try {
    const decoded = verifyToken(token);
    // Create new token with same payload
    return generateToken({
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email
    });
  } catch (error) {
    throw new Error('Unable to refresh token');
  }
};
