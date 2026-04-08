'use client';

import { useAllAttendance } from '@/lib/hooks/useAttendance';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { statusBadgeClass, statusLabel, formatTime } from '@/lib/utils/formatters';
import { PageSpinner } from '@/components/ui/GlobalLoader';
import { format } from 'date-fns';

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
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Check In</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {checkedIn.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                    No one currently checked in.
                  </td>
                </tr>
              ) : (
                checkedIn.map((r) => {
                  const emp = r['employee'] as Record<string, string> | undefined;
                  const checkInData = r['checkIn'] as Record<string, string> | undefined;
                  return (
                    <tr key={r['_id'] as string} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {emp?.['firstName']} {emp?.['lastName']}
                        <span className="ml-2 text-xs text-gray-400">{emp?.['employeeId']}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{emp?.['department']}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {checkInData?.['time'] ? formatTime(checkInData['time']) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusBadgeClass(r['status'] as string)}>
                          {statusLabel(r['status'] as string)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
