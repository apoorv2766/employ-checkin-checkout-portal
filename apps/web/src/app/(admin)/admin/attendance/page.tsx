'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, subDays } from 'date-fns';
import { useAllAttendance, useCorrectAttendance } from '@/lib/hooks/useAttendance';
import { statusBadgeClass, statusLabel, formatTime } from '@/lib/utils/formatters';

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Marketing', 'Operations',
  'HR', 'Finance', 'Sales', 'Support',
];

const STATUSES = ['present', 'absent', 'late', 'on-leave', 'half-day'];

// ── Correction modal schema ───────────────────────────────────────────────────
const correctionSchema = z.object({
  checkIn: z.string().min(1, 'Required'),
  checkOut: z.string().optional(),
  reason: z.string().min(3, 'Reason is required'),
});
type CorrectionForm = z.infer<typeof correctionSchema>;

type AttendanceRecord = Record<string, unknown>;

function CorrectionModal({
  record,
  onClose,
}: {
  record: AttendanceRecord;
  onClose: () => void;
}) {
  const correct = useCorrectAttendance();
  const [apiError, setApiError] = useState('');

  const checkInData = record['checkIn'] as { time?: string } | undefined;
  const checkOutData = record['checkOut'] as { time?: string } | undefined;

  const toDatetimeLocal = (iso?: string) => {
    if (!iso) return '';
    return iso.slice(0, 16); // 'YYYY-MM-DDTHH:mm'
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CorrectionForm>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      checkIn: toDatetimeLocal(checkInData?.['time']),
      checkOut: toDatetimeLocal(checkOutData?.['time']),
      reason: '',
    },
  });

  const onSubmit = async (data: CorrectionForm) => {
    setApiError('');
    try {
      await correct.mutateAsync({
        id: record['_id'] as string,
        checkIn: data.checkIn ? new Date(data.checkIn).toISOString() : undefined,
        checkOut: data.checkOut ? new Date(data.checkOut).toISOString() : undefined,
        reason: data.reason,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save correction';
      setApiError(msg);
    }
  };

  const emp = record['employee'] as Record<string, string> | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">Manual Correction</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {emp?.['firstName']} {emp?.['lastName']} — {record['date'] as string}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {apiError && (
            <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Check In Time</label>
            <input
              {...register('checkIn')}
              type="datetime-local"
              className="input mt-1"
            />
            {errors.checkIn && (
              <p className="mt-1 text-xs text-red-600">{errors.checkIn.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Check Out Time <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('checkOut')}
              type="datetime-local"
              className="input mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Reason *</label>
            <textarea
              {...register('reason')}
              rows={3}
              className="input mt-1 resize-none"
              placeholder="Explain the reason for this correction…"
            />
            {errors.reason && (
              <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Saving…' : 'Save Correction'}</span>
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminAttendancePage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);

  const { data, isLoading } = useAllAttendance({
    dateFrom,
    dateTo,
    department: department || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });

  const records: AttendanceRecord[] = (data?.data as AttendanceRecord[]) ?? [];
  const pagination = data?.pagination as { total: number; totalPages: number } | undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Attendance Log</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="input"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="input"
          />
        </div>
        <select
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
          className="input w-40"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input w-36"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Check In</th>
                <th className="px-4 py-3 text-left">Check Out</th>
                <th className="px-4 py-3 text-left">Total Hrs</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const emp = r['employee'] as Record<string, string> | undefined;
                  const checkInData = r['checkIn'] as Record<string, string> | undefined;
                  const checkOutData = r['checkOut'] as Record<string, string> | undefined;
                  const timezone = (emp?.['timezone'] as string | undefined) ?? 'UTC';
                  return (
                    <tr key={r['_id'] as string} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {emp?.['firstName']} {emp?.['lastName']}
                        </div>
                        <div className="text-xs text-gray-400">{emp?.['department']}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r['date'] as string}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {checkInData?.['time'] ? formatTime(checkInData['time'], timezone) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {checkOutData?.['time'] ? formatTime(checkOutData['time'], timezone) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {typeof r['totalHours'] === 'number'
                          ? `${(r['totalHours'] as number).toFixed(1)}h`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusBadgeClass(r['status'] as string)}>
                          {statusLabel(r['status'] as string)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setCorrecting(r)}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              {pagination.total} records — page {page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
              >
                <span>Prev</span>
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
              >
                <span>Next</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {correcting && (
        <CorrectionModal record={correcting} onClose={() => setCorrecting(null)} />
      )}
    </div>
  );
}
