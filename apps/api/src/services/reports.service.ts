import { AttendanceRecord, User } from '../models';
import { AppError, ErrorCode } from '../utils/AppError';
import type { Types } from 'mongoose';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeMonthlySummary {
  employeeId: string;
  employeeRef: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  totalHours: number;
}

export interface DepartmentSummary {
  department: string;
  totalEmployees: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number; // present / (present + absent) * 100, rounded to 1dp
}

// ─── Monthly report ───────────────────────────────────────────────────────────

export async function getMonthlyReport(
  month: string,
  department?: string,
  employeeId?: string,
): Promise<EmployeeMonthlySummary[]> {
  const [year, mo] = month.split('-').map(Number) as [number, number];
  const lastDay = new Date(year, mo, 0).getDate();
  const from = `${month}-01`;
  const to = `${month}-${String(lastDay).padStart(2, '0')}`;

  // Build employee filter
  const userFilter: Record<string, unknown> = { isActive: true };
  if (department) userFilter['department'] = department;
  if (employeeId) {
    const user = await User.findOne({ employeeId }).select('_id');
    if (!user) return [];
    userFilter['_id'] = user._id;
  }

  const employees = await User.find(userFilter).select(
    '_id employeeId firstName lastName email department',
  );

  if (employees.length === 0) return [];

  const employeeIds = employees.map((e) => e._id);

  // Aggregate all records for the month in one query
  const records = await AttendanceRecord.find({
    employee: { $in: employeeIds },
    date: { $gte: from, $lte: to },
  }).select('employee status totalHours');

  // Group by employee ObjectId string
  const byEmployee = new Map<string, typeof records>();
  for (const r of records) {
    const eid = (r.employee as Types.ObjectId).toString();
    if (!byEmployee.has(eid)) byEmployee.set(eid, []);
    byEmployee.get(eid)!.push(r);
  }

  return employees.map((emp) => {
    const empRecords = byEmployee.get(emp._id.toString()) ?? [];
    const summary: EmployeeMonthlySummary = {
      employeeId: emp.employeeId,
      employeeRef: emp._id.toString(),
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      department: emp.department,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      totalHours: 0,
    };
    for (const r of empRecords) {
      if (r.status === 'present') summary.present += 1;
      else if (r.status === 'absent') summary.absent += 1;
      else if (r.status === 'late') summary.late += 1;
      else if (r.status === 'half-day') summary.halfDay += 1;
      else if (r.status === 'on-leave') summary.onLeave += 1;
      summary.totalHours += r.totalHours ?? 0;
    }
    summary.totalHours = Math.round(summary.totalHours * 100) / 100;
    return summary;
  });
}

// ─── Department attendance rate ───────────────────────────────────────────────

export async function getDepartmentReport(
  from: string,
  to: string,
): Promise<DepartmentSummary[]> {
  // Get all distinct active departments
  const departments = (await User.distinct('department', { isActive: true })) as string[];

  const results: DepartmentSummary[] = [];

  for (const dept of departments) {
    const userIds = (await User.find({ department: dept, isActive: true }).distinct(
      '_id',
    )) as Types.ObjectId[];

    if (userIds.length === 0) continue;

    const records = await AttendanceRecord.find({
      employee: { $in: userIds },
      date: { $gte: from, $lte: to },
    }).select('status');

    let presentDays = 0;
    let absentDays = 0;

    for (const r of records) {
      if (r.status === 'present' || r.status === 'late') presentDays += 1;
      else if (r.status === 'absent') absentDays += 1;
    }

    const total = presentDays + absentDays;
    results.push({
      department: dept,
      totalEmployees: userIds.length,
      presentDays,
      absentDays,
      attendanceRate: total > 0 ? Math.round((presentDays / total) * 1000) / 10 : 0,
    });
  }

  return results.sort((a, b) => b.attendanceRate - a.attendanceRate);
}

// ─── CSV export ───────────────────────────────────────────────────────────────

/** Escape a value for RFC-4180 CSV (wrap in quotes, escape internal quotes). */
function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(',');
}

export async function generateCsvExport(
  from: string,
  to: string,
  department?: string,
): Promise<string> {
  const userFilter: Record<string, unknown> = { isActive: true };
  if (department) userFilter['department'] = department;

  const employees = await User.find(userFilter).select(
    '_id employeeId firstName lastName email department',
  );
  if (employees.length === 0) {
    return 'No data';
  }

  const employeeIds = employees.map((e) => e._id);
  const records = await AttendanceRecord.find({
    employee: { $in: employeeIds },
    date: { $gte: from, $lte: to },
  })
    .sort({ date: 1 })
    .lean();

  // Build lookup: employeeId (ObjectId string) → employee row
  const empMap = new Map(employees.map((e) => [e._id.toString(), e]));

  const header = csvRow([
    'Employee ID',
    'First Name',
    'Last Name',
    'Email',
    'Department',
    'Date',
    'Status',
    'Check In (UTC)',
    'Check Out (UTC)',
    'Total Hours',
    'Is Late',
    'Late By (min)',
    'Manually Edited',
    'Edit Reason',
  ]);

  const rows = records.map((r) => {
    const emp = empMap.get((r.employee as Types.ObjectId).toString());
    return csvRow([
      emp?.employeeId ?? '',
      emp?.firstName ?? '',
      emp?.lastName ?? '',
      emp?.email ?? '',
      emp?.department ?? '',
      r.date,
      r.status,
      r.checkIn.time.toISOString(),
      r.checkOut?.time.toISOString() ?? '',
      r.totalHours ?? '',
      r.isLate ? 'Yes' : 'No',
      r.lateByMinutes ?? '',
      r.isManuallyEdited ? 'Yes' : 'No',
      r.editReason ?? '',
    ]);
  });

  return [header, ...rows].join('\r\n');
}
