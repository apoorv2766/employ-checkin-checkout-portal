'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeactivateEmployee,
  useUnlockAccount,
} from '@/lib/hooks/useEmployees';
import { shiftsApi } from '@/lib/api/endpoints';

// ── Zod schema ──────────────────────────────────────────────────────────────
const employeeSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars').optional().or(z.literal('')),
  employeeId: z.string().min(1, 'Required'),
  department: z.string().min(1, 'Required'),
  designation: z.string().min(1, 'Required'),
  role: z.enum(['employee', 'manager', 'admin']),
  shift: z.string().min(1, 'Required'),
  timezone: z.string().min(1, 'Required'),
});
type EmployeeForm = z.infer<typeof employeeSchema>;

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Operations',
  'HR',
  'Finance',
  'Sales',
  'Support',
];

type Employee = Record<string, unknown>;

const SKELETON_ROW_IDS = ['sk-0', 'sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'];
const SKELETON_CELL_IDS = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

function getSubmitLabel(isSubmitting: boolean, isEdit: boolean): string {
  if (isSubmitting) return 'Saving\u2026';
  return isEdit ? 'Save Changes' : 'Create Employee';
}

// ── Drawer ───────────────────────────────────────────────────────────────────
function EmployeeDrawer({
  employee,
  onClose,
}: Readonly<{
  employee: Employee | null;
  onClose: () => void;
}>) {
  const isEdit = !!employee;
  const create = useCreateEmployee();
  const update = useUpdateEmployee();

  const { data: shiftsData } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list().then((r) => r.data),
  });
  type ShiftOption = { _id: string; name: string; startTime: string; endTime: string };
  const shifts: ShiftOption[] = (shiftsData as { data?: ShiftOption[] })?.data ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: isEdit
      ? {
          firstName: (employee?.['firstName'] as string) ?? '',
          lastName: (employee?.['lastName'] as string) ?? '',
          email: (employee?.['email'] as string) ?? '',
          employeeId: (employee?.['employeeId'] as string) ?? '',
          department: (employee?.['department'] as string) ?? '',
          designation: (employee?.['designation'] as string) ?? '',
          role: ((employee?.['role'] as string) ?? 'employee') as 'employee' | 'manager' | 'admin',
          shift:
            (
              (employee?.['shift'] as { _id?: string } | string | undefined)
            ) != null
              ? typeof employee?.['shift'] === 'object'
                ? ((employee?.['shift'] as { _id?: string })?._id ?? '')
                : (employee?.['shift'] as string)
              : '',
          timezone: (employee?.['timezone'] as string) ?? 'UTC',
          password: '',
        }
      : {
          role: 'employee',
          timezone: 'Asia/Kolkata',
          firstName: '',
          lastName: '',
          email: '',
          employeeId: '',
          department: '',
          designation: '',
          shift: '',
          password: '',
        },
  });

  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: EmployeeForm) => {
    setApiError('');
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      if (isEdit && employee !== null) {
        await update.mutateAsync({ id: employee['_id'] as string, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong';
      setApiError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close drawer"
        className="fixed inset-0 bg-black/30 cursor-default"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Employee' : 'New Employee'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {apiError && (
            <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
              <input id="firstName" {...register('firstName')} className="input mt-1" />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
              <input id="lastName" {...register('lastName')} className="input mt-1" />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="emp-email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="emp-email"
              {...register('email')}
              type="email"
              autoComplete="off"
              className="input mt-1"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {!isEdit && (
            <div>
              <label htmlFor="emp-password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative mt-1">
                <input
                  id="emp-password"
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onDoubleClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 select-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.223-3.592M6.53 6.53A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.965 9.965 0 01-4.073 5.272M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">Employee ID</label>
            <input id="employeeId" {...register('employeeId')} className="input mt-1" />
            {errors.employeeId && (
              <p className="mt-1 text-xs text-red-600">{errors.employeeId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
            <select id="department" {...register('department')} className="input mt-1">
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {errors.department && (
              <p className="mt-1 text-xs text-red-600">{errors.department.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="designation" className="block text-sm font-medium text-gray-700">Designation</label>
            <input id="designation" {...register('designation')} className="input mt-1" placeholder="e.g. Software Engineer" />
            {errors.designation && (
              <p className="mt-1 text-xs text-red-600">{errors.designation.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="shift" className="block text-sm font-medium text-gray-700">Shift</label>
            <select id="shift" {...register('shift')} className="input mt-1">
              <option value="">Select shift</option>
              {shifts.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.startTime}–{s.endTime})
                </option>
              ))}
            </select>
            {errors.shift && (
              <p className="mt-1 text-xs text-red-600">{errors.shift.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
            <select id="role" {...register('role')} className="input mt-1">
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">Timezone</label>
            <input id="timezone" {...register('timezone')} className="input mt-1" placeholder="Asia/Kolkata" />
            {errors.timezone && (
              <p className="mt-1 text-xs text-red-600">{errors.timezone.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              <span>{getSubmitLabel(isSubmitting, isEdit)}</span>
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
export default function AdminEmployeesPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [isActive, setIsActive] = useState<'1' | '0' | ''>('1');
  const [page, setPage] = useState(1);
  const [drawerEmployee, setDrawerEmployee] = useState<Employee | null | undefined>(undefined); // undefined = closed
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);

  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading } = useEmployees({
    search: search || undefined,
    department: department || undefined,
    isActive: isActive === '' ? undefined : Number(isActive),
    page,
    limit: 15,
  });

  const employees: Employee[] = (data?.data as Employee[]) ?? [];
  const pagination = data?.pagination as { total: number; totalPages: number } | undefined;

  const deactivate = useDeactivateEmployee();
  const unlock = useUnlockAccount();
  const [deactivateError, setDeactivateError] = useState('');

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivateError('');
    try {
      await deactivate.mutateAsync(deactivateTarget['_id'] as string);
      setDeactivateTarget(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to deactivate';
      setDeactivateError(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <button className="btn-primary" onClick={() => setDrawerEmployee(null)}>
          <span>+ New Employee</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, email, ID…"
          className="input w-56"
        />
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
          value={isActive}
          onChange={(e) => { setIsActive(e.target.value as '1' | '0' | ''); setPage(1); }}
          className="input w-32"
        >
          <option value="1">Active</option>
          <option value="0">Inactive</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Employee ID</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Position</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                if (isLoading) {
                  return SKELETON_ROW_IDS.map((rowId) => (
                    <tr key={rowId} className="animate-pulse">
                      {SKELETON_CELL_IDS.map((cellId) => (
                        <td key={`${rowId}-${cellId}`} className="px-4 py-3">
                          <div className="h-4 rounded bg-gray-200" />
                        </td>
                      ))}
                    </tr>
                  ));
                }
                if (employees.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        No employees found.
                      </td>
                    </tr>
                  );
                }
                return (
                  employees.map((emp) => (
                  <tr key={emp['_id'] as string} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {emp['firstName'] as string} {emp['lastName'] as string}
                      <div className="text-xs text-gray-400">{emp['email'] as string}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{emp['employeeId'] as string}</td>
                    <td className="px-4 py-3 text-gray-600">{emp['department'] as string}</td>
                    <td className="px-4 py-3 text-gray-600">{emp['designation'] as string}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{emp['role'] as string}</td>
                    <td className="px-4 py-3">
                      {emp['isActive'] ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDrawerEmployee(emp)}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Edit
                        </button>
                        {(emp['isActive'] as boolean) && emp['_id'] !== currentUser?._id && (
                          <>
                            {(emp['isLocked'] as boolean) && (
                              <button
                                onClick={() => unlock.mutate(emp['_id'] as string)}
                                disabled={unlock.isPending}
                                className="text-xs text-amber-600 hover:underline disabled:opacity-50"
                              >
                                Unlock
                              </button>
                            )}
                            <button
                              onClick={() => setDeactivateTarget(emp)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              {pagination.total} employees — page {page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
              >
                <span>← Prev</span>
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
              >
                <span>Next →</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerEmployee !== undefined && (
        <EmployeeDrawer
          employee={drawerEmployee}
          onClose={() => setDrawerEmployee(undefined)}
        />
      )}

      {/* Deactivate confirm */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close dialog"
            className="fixed inset-0 bg-black/30 cursor-default"
            onClick={() => setDeactivateTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold text-gray-900">Deactivate Employee</h3>
            <p className="mt-2 text-sm text-gray-600">
              {'Are you sure you want to deactivate '}
              <span className="font-medium">
                {`${deactivateTarget['firstName'] as string} ${deactivateTarget['lastName'] as string}`}
              </span>
              {'? They will no longer be able to log in.'}
            </p>
            {deactivateError && (
              <p className="mt-2 text-sm text-red-600">{deactivateError}</p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDeactivate}
                disabled={deactivate.isPending}
                className="btn-primary btn-danger flex-1 disabled:opacity-60"
              >
                <span>{deactivate.isPending ? 'Deactivating…' : 'Deactivate'}</span>
              </button>
              <button
                onClick={() => setDeactivateTarget(null)}
                className="btn-secondary flex-1"
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
