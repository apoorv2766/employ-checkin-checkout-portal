'use client';

import { useState } from 'react';
import { statusBadgeClass, statusLabel, formatTime, formatHours } from '@/lib/utils/formatters';
import { useAuthStore } from '@/lib/store/auth.store';
import { useTodayAttendance, useCheckIn, useCheckOut, useAttendanceHistory } from '@/lib/hooks/useAttendance';
import { format, subDays, parseISO } from 'date-fns';
import { Loader } from '@/components/ui/Loader';
import { toast } from '@/lib/store/toast.store';

// ─── Grab GPS coordinates from the browser ────────────────────────────────────
function getLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),          // denied or unavailable → resolve null, don't block check-in
      { timeout: 8000, maximumAge: 0 },
    );
  });
}

// ─── Check-in / Check-out card ────────────────────────────────────────────────

function CheckInCard() {
  const user = useAuthStore((s) => s.user);
  const { data: today, isLoading } = useTodayAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [locating, setLocating] = useState(false);

  const timezone = user?.timezone ?? 'UTC';
  const hasCheckedIn = !!today;
  const hasCheckedOut = !!(today as Record<string, unknown> | null)?.['checkOut'];

  const handleCheckIn = async () => {
    setLocating(true);
    const location = await getLocation();
    setLocating(false);
    if (!location) {
      toast.warning('Location unavailable — checking in without GPS coordinates.');
    }
    checkIn.mutate({ method: 'web', ...(location ? { location } : {}) });
  };

  const handleCheckOut = () => {
    checkOut.mutate({ method: 'web' });
  };

  if (isLoading) {
    return <div className="card p-6 flex items-center justify-center"><Loader /></div>;
  }

  const todayRecord = today as Record<string, unknown> | null;
  const checkInData = todayRecord?.['checkIn'] as Record<string, string> | undefined;
  const checkOutData = todayRecord?.['checkOut'] as Record<string, string> | undefined;
  const totalHours = todayRecord?.['totalHours'] as number | undefined;
  const status = todayRecord?.['status'] as string | undefined;

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Today's Attendance</h2>
        {status && (
          <span className={statusBadgeClass(status)}>{statusLabel(status)}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div>
          <p className="text-xs text-gray-500 mb-1">Check In</p>
          <p className="font-semibold text-gray-900">
            {checkInData?.['time'] ? formatTime(checkInData['time'], timezone) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Check Out</p>
          <p className="font-semibold text-gray-900">
            {checkOutData?.['time'] ? formatTime(checkOutData['time'], timezone) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Hours</p>
          <p className="font-semibold text-gray-900">{formatHours(totalHours)}</p>
        </div>
      </div>

      {!hasCheckedIn && (
        <button
          className="btn-primary w-full py-3 text-base"
          onClick={() => { void handleCheckIn(); }}
          disabled={checkIn.isPending || locating}
        >
          {/* eslint-disable-next-line no-nested-ternary */}
          {locating ? 'Getting location…' : checkIn.isPending ? 'Checking in…' : '✓ Check In'}
        </button>
      )}
      {hasCheckedIn && !hasCheckedOut && (
        <button
          className="w-full rounded-lg bg-red-500 py-3 text-base font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
          onClick={handleCheckOut}
          disabled={checkOut.isPending}
        >
          {checkOut.isPending ? 'Checking out…' : '✗ Check Out'}
        </button>
      )}
      {hasCheckedIn && hasCheckedOut && (
        <p className="text-center text-sm text-gray-500">
          Session complete for today. See you tomorrow!
        </p>
      )}

      {(checkIn.isError || checkOut.isError) && (
        <p className="mt-3 text-center text-xs text-red-600">
          {(
            (checkIn.error ?? checkOut.error) as {
              response?: { data?: { error?: { message?: string } } };
            }
          )?.response?.data?.error?.message ?? 'An error occurred'}
        </p>
      )}
    </div>
  );
}

// ─── Weekly strip ─────────────────────────────────────────────────────────────

function WeeklyStrip() {
  const today = new Date();

  // Find Monday of the current ISO week
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = subDays(today, -diffToMonday);
  // Mon → Fri (5 days)
  const days = Array.from({ length: 5 }, (_, i) => subDays(monday, -i));

  const from = format(days[0], 'yyyy-MM-dd');
  const to = format(days[4], 'yyyy-MM-dd');

  const { data } = useAttendanceHistory({ from, to, limit: 10 });
  const records = (data?.data as Record<string, unknown>[]) ?? [];

  const byDate = new Map(records.map((r) => [r['date'] as string, r['status'] as string]));

  const dotColor: Record<string, string> = {
    present: 'bg-green-500',
    late: 'bg-amber-500',
    absent: 'bg-red-500',
    'on-leave': 'bg-blue-500',
    'half-day': 'bg-orange-500',
  };

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">This Week</h2>
      <div className="flex items-center justify-between">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const status = byDate.get(dateStr);
          const isToday = dateStr === format(today, 'yyyy-MM-dd');
          return (
            <div key={dateStr} className="flex flex-col items-center gap-2">
              <span className={`text-xs font-medium ${isToday ? 'text-primary-600' : 'text-gray-500'}`}>
                {format(day, 'EEE')}
              </span>
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  status ? (dotColor[status] ?? 'bg-gray-200') : 'bg-gray-100'
                }`}
              >
                {isToday && !status && (
                  <span className="text-xs font-bold text-gray-400">•</span>
                )}
              </div>
              <span className={`text-xs ${isToday ? 'font-bold text-primary-600' : 'text-gray-400'}`}>
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recent activity ──────────────────────────────────────────────────────────

function RecentActivity() {
  const user = useAuthStore((s) => s.user);
  const timezone = user?.timezone ?? 'UTC';
  const { data } = useAttendanceHistory({ limit: 5 });
  const records = (data?.data as Record<string, unknown>[]) ?? [];

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
      {records.length === 0 ? (
        <p className="text-sm text-gray-400">No records yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {records.map((r) => {
            const checkInData = r['checkIn'] as Record<string, string> | undefined;
            const checkOutData = r['checkOut'] as Record<string, string> | undefined;
            return (
              <div key={r['_id'] as string} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {format(parseISO(r['date'] as string), 'EEE, MMM d')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {checkInData?.['time'] ? formatTime(checkInData['time'], timezone) : '—'} →{' '}
                    {checkOutData?.['time'] ? formatTime(checkOutData['time'], timezone) : 'open'}
                  </p>
                </div>
                <span className={statusBadgeClass(r['status'] as string)}>
                  {statusLabel(r['status'] as string)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {user?.firstName ?? 'there'}!
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CheckInCard />
        <WeeklyStrip />
      </div>

      <RecentActivity />
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
