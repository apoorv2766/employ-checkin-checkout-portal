import cron from 'node-cron';
import AttendanceRecord from '../models/AttendanceRecord.model';
import AuditLog from '../models/AuditLog.model';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Auto-closes any AttendanceRecord that still has no checkOut at 23:59 each day.
 * Sets status to 'half-day' (< 4h) or keeps 'present'/'late' and marks needsReview.
 */
export function registerAutoCloseCron(): void {
  // Runs at 23:59 every day
  cron.schedule('59 23 * * *', async () => {
    const today = formatInTimeZone(new Date(), 'UTC', 'yyyy-MM-dd');
    console.info(`[cron] autoClose running for date=${today}`);

    try {
      const openRecords = await AttendanceRecord.find({
        date: today,
        'checkOut.time': null,
      }).lean();

      if (openRecords.length === 0) {
        console.info('[cron] autoClose: no open records');
        return;
      }

      const closedAt = new Date();

      for (const record of openRecords) {
        const checkInTime = (record.checkIn as { time: Date } | undefined)?.time;
        const totalHours = checkInTime
          ? (closedAt.getTime() - new Date(checkInTime).getTime()) / 3_600_000
          : 0;

        const autoStatus = totalHours < 4 ? 'half-day' : record.status ?? 'present';

        const before = {
          checkOut: null,
          status: record.status,
          totalHours: record.totalHours ?? null,
        };

        const after = {
          checkOut: { time: closedAt, method: 'auto' },
          status: autoStatus,
          totalHours: Math.round(totalHours * 100) / 100,
          notes: 'Auto-closed by system at 23:59',
          needsReview: true,
        };

        await AttendanceRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              'checkOut.time': closedAt,
              'checkOut.method': 'auto',
              status: autoStatus,
              totalHours: Math.round(totalHours * 100) / 100,
              notes: 'Auto-closed by system at 23:59',
              needsReview: true,
            },
          },
        );

        await AuditLog.create({
          actor: null,
          action: 'attendance.autoClose',
          resource: 'AttendanceRecord',
          resourceId: record._id,
          before,
          after,
          ipAddress: 'system',
        });
      }

      console.info(`[cron] autoClose: closed ${openRecords.length} record(s)`);
    } catch (err) {
      console.error('[cron] autoClose error:', err);
    }
  });

  console.info('[cron] autoClose registered (runs at 23:59 daily)');
}
