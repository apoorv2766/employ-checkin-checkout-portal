'use client';

import { useState } from 'react';
import { useAllAttendance } from '@/lib/hooks/useAttendance';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { statusBadgeClass, statusLabel, formatTime } from '@/lib/utils/formatters';
import { useAuthStore } from '@/lib/store/auth.store';
import { PageSpinner } from '@/components/ui/GlobalLoader';
import { format } from 'date-fns';
import { Loader } from '@/components/ui/Loader';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const adminTimezone = useAuthStore((s) => s.user?.timezone ?? 'UTC');
  const [viewingLocation, setViewingLocation] = useState<Record<string, unknown> | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);

  const { data: todayData, isLoading: loadingToday } = useAllAttendance({ date: today, limit: 100 });
  const todayRecords = (todayData?.data as Record<string, unknown>[]) ?? [];

  const { data: empData, isLoading: loadingEmp } = useEmployees({ isActive: 1, limit: 1 });
  const totalEmployees = (empData?.pagination as { total?: number } | undefined)?.total ?? 0;

  if (loadingToday || loadingEmp) return <PageSpinner />;

  const counts = { present: 0, absent: 0, late: 0, 'on-leave': 0, 'half-day': 0 };
  for (const r of todayRecords) {
    const s = r['status'] as string;
    if (s in counts) counts[s as keyof typeof counts] += 1;
  }

  const checkedIn = todayRecords.filter((r) => !(r['checkOut'] as unknown));

  // Reset iframeLoading when opening a new location modal
  const handleViewLocation = (r: Record<string, unknown>) => {
    setIframeLoading(true);
    setViewingLocation(r);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Present" value={counts.present + counts.late} color="text-green-600" />
        <StatCard label="Absent" value={counts.absent} color="text-red-600" />
        <StatCard label="Late" value={counts.late} color="text-amber-600" />
        <StatCard label="On Leave" value={counts['on-leave']} color="text-blue-600" />
      </div>

      {/* Currently checked in */}
      <div className="card">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="font-semibold text-gray-900">
            Currently Checked In ({checkedIn.length})
          </h2>
        </div>
        {/* ── Mobile cards (hidden on sm+) ── */}
        <div className="sm:hidden divide-y divide-gray-100">
          {checkedIn.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No one currently checked in.</p>
          ) : (
            checkedIn.map((r) => {
              const emp = r['employee'] as Record<string, string> | undefined;
              const checkInData = r['checkIn'] as Record<string, unknown> | undefined;
              const timezone = (emp?.['timezone'] as string | undefined) ?? adminTimezone;
              const loc = checkInData?.['location'] as { lat: number; lng: number } | undefined;
              return (
                <div key={r['_id'] as string} className="p-4 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{emp?.['firstName']} {emp?.['lastName']}</p>
                      <p className="text-xs text-gray-400">{emp?.['employeeId']} · {emp?.['department']}</p>
                    </div>
                    <span className={statusBadgeClass(r['status'] as string)}>
                      {statusLabel(r['status'] as string)}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div><dt className="text-gray-400">Check In</dt><dd className="font-medium text-gray-700">{checkInData?.['time'] ? formatTime(checkInData['time'] as string, timezone) : '—'}</dd></div>
                    <div>
                      <dt className="text-gray-400">Location</dt>
                      <dd>
                        <button
                          onClick={() => handleViewLocation(r)}
                          title={loc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : 'No location'}
                          className={`transition-colors ${loc ? 'text-primary-600 hover:text-primary-800' : 'text-gray-300 cursor-default'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </dd>
                    </div>
                  </dl>
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
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Check In</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {checkedIn.length === 0 ? (
                  <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                    No one currently checked in.
                  </td>
                </tr>
              ) : (
                checkedIn.map((r) => {
                  const emp = r['employee'] as Record<string, string> | undefined;
                  const checkInData = r['checkIn'] as Record<string, unknown> | undefined;
                  const timezone = (emp?.['timezone'] as string | undefined) ?? adminTimezone;
                  const loc = checkInData?.['location'] as { lat: number; lng: number } | undefined;
                  return (
                    <tr key={r['_id'] as string} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {emp?.['firstName']} {emp?.['lastName']}
                        <span className="ml-2 text-xs text-gray-400">{emp?.['employeeId']}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{emp?.['department']}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {checkInData?.['time'] ? formatTime(checkInData['time'] as string, timezone) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusBadgeClass(r['status'] as string)}>
                          {statusLabel(r['status'] as string)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleViewLocation(r)}
                          title={loc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : 'No location'}
                          className={`transition-colors ${
                            loc ? 'text-primary-600 hover:text-primary-800' : 'text-gray-300 cursor-default'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location modal — reuses the same modal pattern as the attendance page */}
      {viewingLocation && (() => {
        const checkInData = viewingLocation['checkIn'] as Record<string, unknown> | undefined;
        const loc = checkInData?.['location'] as { lat: number; lng: number } | undefined;
        const emp = viewingLocation['employee'] as Record<string, string> | undefined;
        const mapsUrl = loc ? `https://maps.google.com/?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}` : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button
              type="button"
              aria-label="Close"
              className="fixed inset-0 bg-black/30 cursor-default"
              onClick={() => setViewingLocation(null)}
            />
            <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Check-in Location</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {emp?.['firstName']} {emp?.['lastName']} — {viewingLocation['date'] as string}
                  </p>
                </div>
                <button
                  onClick={() => setViewingLocation(null)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {loc ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-lg border border-gray-200 relative">
                    {iframeLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                        <Loader label="Loading map..." />
                      </div>
                    )}
                    <iframe
                      title="Check-in location map"
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://maps.google.com/maps?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}&z=15&output=embed`}
                      onLoad={() => setIframeLoading(false)}
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
      })()}
    </div>
  );
}
