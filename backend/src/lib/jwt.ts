import jwt from 'jsonwebtoken';
import { env } from './env';

export type JwtPayload = {
  sub: string; // user id
  email: string;
  role: string;
};

export function signToken(payload: JwtPayload, remember: boolean): string {
  const options: jwt.SignOptions = {
    expiresIn: (remember ? env.jwtRememberExpiresIn : env.jwtExpiresIn) as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
