import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Role } from './types.js';
import { env } from '../config/env.js';

export interface AuthUser {
  id: string;
  role: Role;
}

const payloadSchema = z.object({ sub: z.string(), role: z.enum(['ADMIN', 'USER']) });

export const signToken = (user: AuthUser) =>
  jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '8h',
    algorithm: 'HS256',
  });

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    const p = payloadSchema.parse(decoded);
    return { id: p.sub, role: p.role };
  } catch {
    return null;
  }
}
