'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/endpoints';
import { formatHours } from '@/lib/utils/formatters';

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Marketing', 'Operations',
  'HR', 'Finance', 'Sales', 'Support',
];

type MonthlyRow = {
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  halfDay: number;
  totalHours: number;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [department, setDepartment] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'monthly', month, department],
    queryFn: async () => {
      const res = await reportsApi.monthly({
        month,
        department: department || undefined,
      });
      return res.data as { data: MonthlyRow[] };
    },
  });

  const rows = data?.data ?? [];

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await reportsApi.exportCsv({
        month,
        department: department || undefined,
      });
      const blob = res.data as Blob;
      downloadBlob(blob, `attendance-${month}${department ? `-${department}` : ''}.csv`);
    } catch {
      // silent — browser will show network error if needed
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button
          onClick={handleExportCsv}
          disabled={exporting || rows.length === 0}
          className="btn-secondary disabled:opacity-50"
        >
          <span>{exporting ? 'Exporting…' : 'Export CSV'}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-month" className="text-xs font-medium text-gray-500">Month</label>
          <input
            id="filter-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input w-full"
          />
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="input w-full sm:w-44"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
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
              </div>
            ))
          ) : rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">No data for the selected period.</p>
          ) : (
            rows.map((row, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={idx} className="p-4 space-y-2 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{row.firstName} {row.lastName}</p>
                  <p className="text-xs text-gray-400">{row.employeeId} · {row.department}</p>
                </div>
                <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
                  <div><dt className="text-gray-400">Present</dt><dd className="font-medium text-green-700">{row.present}</dd></div>
                  <div><dt className="text-gray-400">Late</dt><dd className="font-medium text-amber-700">{row.late}</dd></div>
                  <div><dt className="text-gray-400">Absent</dt><dd className="font-medium text-red-700">{row.absent}</dd></div>
                  <div><dt className="text-gray-400">On Leave</dt><dd className="font-medium text-blue-700">{row.onLeave}</dd></div>
                  <div><dt className="text-gray-400">Half Day</dt><dd className="font-medium text-orange-700">{row.halfDay}</dd></div>
                  <div><dt className="text-gray-400">Total Hrs</dt><dd className="font-medium text-gray-700">{formatHours(row.totalHours)}</dd></div>
                </dl>
              </div>
            ))
          )}
          {rows.length > 0 && (
            <div className="bg-gray-50 p-4 text-xs font-semibold text-gray-700">
              <p className="mb-2">Totals</p>
              <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                <div><dt className="text-gray-400 font-normal">Present</dt><dd className="text-green-700">{rows.reduce((s, r) => s + r.present, 0)}</dd></div>
                <div><dt className="text-gray-400 font-normal">Late</dt><dd className="text-amber-700">{rows.reduce((s, r) => s + r.late, 0)}</dd></div>
                <div><dt className="text-gray-400 font-normal">Absent</dt><dd className="text-red-700">{rows.reduce((s, r) => s + r.absent, 0)}</dd></div>
                <div><dt className="text-gray-400 font-normal">On Leave</dt><dd className="text-blue-700">{rows.reduce((s, r) => s + r.onLeave, 0)}</dd></div>
                <div><dt className="text-gray-400 font-normal">Half Day</dt><dd className="text-orange-700">{rows.reduce((s, r) => s + r.halfDay, 0)}</dd></div>
                <div><dt className="text-gray-400 font-normal">Total Hrs</dt><dd className="text-gray-700">{formatHours(rows.reduce((s, r) => s + r.totalHours, 0))}</dd></div>
              </dl>
            </div>
          )}
        </div>

        {/* ── Desktop table (hidden below sm) ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-right">Present</th>
                <th className="px-4 py-3 text-right">Late</th>
                <th className="px-4 py-3 text-right">Absent</th>
                <th className="px-4 py-3 text-right">On Leave</th>
                <th className="px-4 py-3 text-right">Half Day</th>
                <th className="px-4 py-3 text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No data for the selected period.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.firstName} {row.lastName}
                      <div className="text-xs text-gray-400">{row.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.department}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">
                      {row.present}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700">{row.late}</td>
                    <td className="px-4 py-3 text-right text-red-700">{row.absent}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{row.onLeave}</td>
                    <td className="px-4 py-3 text-right text-orange-700">{row.halfDay}</td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">
                      {formatHours(row.totalHours)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-gray-50 text-xs font-semibold text-gray-700">
                <tr>
                  <td colSpan={2} className="px-4 py-3">Totals</td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {rows.reduce((s, r) => s + r.present, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-700">
                    {rows.reduce((s, r) => s + r.late, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-700">
                    {rows.reduce((s, r) => s + r.absent, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    {rows.reduce((s, r) => s + r.onLeave, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-700">
                    {rows.reduce((s, r) => s + r.halfDay, 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatHours(rows.reduce((s, r) => s + r.totalHours, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
