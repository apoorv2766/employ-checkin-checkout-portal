import type { Types } from 'mongoose';
import type { UserRole } from '@attendance-portal/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: Types.ObjectId;
        role: UserRole;
        email: string;
      };
    }
  }
}

export {};
