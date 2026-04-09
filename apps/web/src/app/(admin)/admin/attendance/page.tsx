'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, subDays } from 'date-fns';
import { useAllAttendance, useCorrectAttendance } from '@/lib/hooks/useAttendance';
import { statusBadgeClass, statusLabel, formatTime, formatHours } from '@/lib/utils/formatters';
import { useAuthStore } from '@/lib/store/auth.store';

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
      <div className="relative mx-4 w-full max-w-md rounded-xl bg-white shadow-xl sm:mx-auto">
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

// ── Location modal ────────────────────────────────────────────────────────────
function LocationModal({
  record,
  onClose,
}: Readonly<{ record: AttendanceRecord; onClose: () => void }>) {
  const checkInData = record['checkIn'] as Record<string, unknown> | undefined;
  const loc = checkInData?.['location'] as { lat: number; lng: number } | undefined;
  const emp = record['employee'] as Record<string, string> | undefined;

  const mapsUrl = loc
    ? `https://maps.google.com/?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 bg-black/30 cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Check-in Location</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {emp?.['firstName']} {emp?.['lastName']} — {record['date'] as string}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {loc ? (
          <div className="space-y-4">

            {/* Embedded static map preview via Google Maps embed */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <iframe
                title="Check-in location map"
                width="100%"
                height="200"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}&z=15&output=embed`}
              />
            </div>

            <a
              href={mapsUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex w-full items-center justify-center gap-2 text-sm"
            >
              <span>Open in Google Maps</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-medium">No location data</p>
            <p className="text-xs mt-1">Employee did not share location at check-in.</p>
          </div>
        )}
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
  const [viewingLocation, setViewingLocation] = useState<AttendanceRecord | null>(null);

  const adminTimezone = useAuthStore((s) => s.user?.timezone ?? 'UTC');

  const { data, isLoading } = useAllAttendance({
    from: dateFrom,
    to: dateTo,
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
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-from" className="text-xs font-medium text-gray-500">From</label>
          <input
            id="filter-from"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="input w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-to" className="text-xs font-medium text-gray-500">To</label>
          <input
            id="filter-to"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="input w-full"
          />
        </div>
        <select
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
          className="input w-full sm:w-40"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input w-full sm:w-36"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* ── Mobile cards (hidden on sm+) ── */}
        <div className="sm:hidden divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="animate-pulse space-y-2 p-4">
                <div className="h-4 w-1/2 rounded bg-gray-200" />
                <div className="h-3 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-2/3 rounded bg-gray-200" />
              </div>
            ))
          ) : records.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">No records found.</p>
          ) : (
            records.map((r) => {
              const emp = r['employee'] as Record<string, string> | undefined;
              const checkInData = r['checkIn'] as Record<string, string> | undefined;
              const checkOutData = r['checkOut'] as Record<string, string> | undefined;
              const timezone = (emp?.['timezone'] as string | undefined) ?? adminTimezone;
              return (
                <div key={r['_id'] as string} className="p-4 space-y-2 text-sm">
                  {/* Name + badge row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {emp?.['firstName']} {emp?.['lastName']}
                      </p>
                      <p className="text-xs text-gray-400">{emp?.['department']}</p>
                    </div>
                    <span className={statusBadgeClass(r['status'] as string)}>
                      {statusLabel(r['status'] as string)}
                    </span>
                  </div>
                  {/* Field grid */}
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div><dt className="text-gray-400">Date</dt><dd className="font-medium text-gray-700">{r['date'] as string}</dd></div>
                    <div><dt className="text-gray-400">Check In</dt><dd className="font-medium text-gray-700">{checkInData?.['time'] ? formatTime(checkInData['time'], timezone) : '—'}</dd></div>
                    <div><dt className="text-gray-400">Check Out</dt><dd className="font-medium text-gray-700">{checkOutData?.['time'] ? formatTime(checkOutData['time'], timezone) : '—'}</dd></div>
                    <div><dt className="text-gray-400">Total Hours</dt><dd className="font-medium text-gray-700">{formatHours(r['totalHours'] as number | undefined)}</dd></div>
                  </dl>
                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => setViewingLocation(r)}
                      title="View check-in location"
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button onClick={() => setCorrecting(r)} className="text-xs text-primary-600 hover:underline">Edit</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Desktop table (hidden below sm) ── */}
        <div className="hidden sm:block overflow-x-auto">
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
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      // eslint-disable-next-line react/no-array-index-key
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
                  const timezone = (emp?.['timezone'] as string | undefined) ?? adminTimezone;
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
                        {formatHours(r['totalHours'] as number | undefined)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusBadgeClass(r['status'] as string)}>
                          {statusLabel(r['status'] as string)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setViewingLocation(r)}
                            title="View check-in location"
                            className="text-gray-400 hover:text-primary-600 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setCorrecting(r)}
                            className="text-xs text-primary-600 hover:underline"
                          >
                            Edit
                          </button>
                        </div>
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

      {viewingLocation && (
        <LocationModal record={viewingLocation} onClose={() => setViewingLocation(null)} />
      )}
    </div>
  );
}
