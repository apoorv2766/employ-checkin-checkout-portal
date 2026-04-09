import type { Request, Response, NextFunction } from 'express';
import Shift from '../models/Shift.model';

export async function listShiftsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shifts = await Shift.find({ isActive: true })
      .select('_id name startTime endTime gracePeriodMinutes workingDays timezone')
      .lean()
      .exec();

    res.json({ data: shifts });
  } catch (err) {
    next(err);
  }
}
