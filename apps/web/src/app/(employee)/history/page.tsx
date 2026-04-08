'use client';

import { useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { useAuthStore } from '@/lib/store/auth.store';
import { useAttendanceHistory } from '@/lib/hooks/useAttendance';
import { statusBadgeClass, statusLabel, formatTime, formatHours } from '@/lib/utils/formatters';

const STATUS_DOT: Record<string, string> = {
  present: 'bg-green-500',
  late: 'bg-amber-500',
  absent: 'bg-red-500',
  'on-leave': 'bg-blue-500',
  'half-day': 'bg-orange-500',
};

export default function HistoryPage() {
  const user = useAuthStore((s) => s.user);
  const timezone = user?.timezone ?? 'UTC';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  // Calendar month navigation
  const [calMonth, setCalMonth] = useState(new Date());

  const monthFrom = format(startOfMonth(calMonth), 'yyyy-MM-dd');
  const monthTo = format(endOfMonth(calMonth), 'yyyy-MM-dd');

  // Calendar uses all records for the month (no pagination)
  const { data: calData } = useAttendanceHistory({ from: monthFrom, to: monthTo, limit: 100 });
  const calRecords = (calData?.data as Record<string, unknown>[]) ?? [];
  const byDate = new Map(calRecords.map((r) => [r['date'] as string, r['status'] as string]));

  // Table (paginated, filtered)
  const { data: tableData, isLoading } = useAttendanceHistory({
    page,
    limit: 15,
    ...(statusFilter ? { status: statusFilter } : {}),
  });
  const records = (tableData?.data as Record<string, unknown>[]) ?? [];
  const pagination = tableData?.pagination as { page: number; limit: number; total: number } | undefined;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  // Build calendar day grid
  const days = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const firstDow = getDay(days[0]!); // 0=Sun

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Attendance History</h1>

      {/* Calendar */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
            onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
          >
            <span>← Prev</span>
          </button>
          <h2 className="font-semibold text-gray-900">{format(calMonth, 'MMMM yyyy')}</h2>
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
            onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
          >
            <span>Next →</span>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1 font-medium">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* empty cells before first day */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const ds = format(day, 'yyyy-MM-dd');
            const status = byDate.get(ds);
            const isToday = ds === format(new Date(), 'yyyy-MM-dd');
            return (
              <div
                key={ds}
                className={`relative flex flex-col items-center rounded-lg py-2 text-xs ${
                  isToday ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <span className={`font-medium ${isToday ? 'text-primary-600' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </span>
                {status && (
                  <span
                    className={`mt-1 h-2 w-2 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-300'}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
          {Object.entries(STATUS_DOT).map(([s, cls]) => (
            <span key={s} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${cls}`} />
              {statusLabel(s)}
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Records</h2>
          <select
            className="input w-auto text-sm"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="half-day">Half Day</option>
            <option value="on-leave">On Leave</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Check In</th>
                <th className="px-4 py-3 text-left">Check Out</th>
                <th className="px-4 py-3 text-left">Hours</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : records.map((r) => {
                    const checkInData = r['checkIn'] as Record<string, string> | undefined;
                    const checkOutData = r['checkOut'] as Record<string, string> | undefined;
                    return (
                      <tr key={r['_id'] as string} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {format(parseISO(r['date'] as string), 'EEE, MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {checkInData?.['time'] ? formatTime(checkInData['time'], timezone) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {checkOutData?.['time'] ? formatTime(checkOutData['time'], timezone) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatHours(r['totalHours'] as number | undefined)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusBadgeClass(r['status'] as string)}>
                            {statusLabel(r['status'] as string)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Page {pagination?.page} of {totalPages} ({pagination?.total} records)
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary px-3 py-1.5 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <span>Prev</span>
              </button>
              <button
                className="btn-secondary px-3 py-1.5 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <span>Next</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
