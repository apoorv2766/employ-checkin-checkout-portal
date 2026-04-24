'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth.store';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeactivateEmployee,
  useReactivateEmployee,
  useUnlockAccount,
  useAdminChangePassword,
} from '@/lib/hooks/useEmployees';
import { shiftsApi } from '@/lib/api/endpoints';

// ── Zod schema ──────────────────────────────────────────────────────────────
const employeeSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars').optional().or(z.literal('')),
  employeeId: z.string().optional(),
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

// ── Change Password Dialog ────────────────────────────────────────────────────
const changePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string().min(1, 'Required'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

function ChangePasswordDialog({
  employee,
  onClose,
}: Readonly<{ employee: Employee; onClose: () => void }>) {
  const changePassword = useAdminChangePassword();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 220); };

  const onSubmit = async (data: ChangePasswordForm) => {
    await changePassword.mutateAsync({ id: employee['_id'] as string, newPassword: data.newPassword });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close dialog"
        className={`fixed inset-0 cursor-default transition-opacity duration-220 ${visible ? 'bg-black/30' : 'bg-black/0'}`}
        onClick={handleClose}
      />
      <div className={`relative mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl sm:mx-auto transition-all duration-220 ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}>
        <h3 className="font-semibold text-gray-900">Change Password</h3>
        <p className="mt-1 text-sm text-gray-500">
          Set a new password for{' '}
          <span className="font-medium text-gray-700">
            {`${employee['firstName'] as string} ${employee['lastName'] as string}`}
          </span>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label htmlFor="cp-new" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative mt-1">
              <input
                id="cp-new"
                {...register('newPassword')}
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                className="input pr-10"
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                onClick={() => setShowNew((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              >
                {showNew ? (
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
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="cp-confirm" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="relative mt-1">
              <input
                id="cp-confirm"
                {...register('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className="input pr-10"
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? (
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
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || changePassword.isPending}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              <span>{isSubmitting || changePassword.isPending ? 'Saving\u2026' : 'Change Password'}</span>
            </button>
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };

  const onSubmit = async (data: EmployeeForm) => {
    setApiError('');
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      console.log('Submitting employee:', payload);
      if (isEdit && employee !== null) {
        await update.mutateAsync({ id: employee['_id'] as string, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Error creating/updating employee:', err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong';
      setApiError(msg);
      alert(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close drawer"
        className={`fixed inset-0 cursor-default transition-opacity duration-300 ${visible ? 'bg-black/30' : 'bg-black/0'}`}
        onClick={handleClose}
      />
      {/* Panel */}
      <div className={`relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}>
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
                  onClick={() => setShowPassword((v) => !v)}
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
              {isEdit && (
                <>
                  <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">Employee ID</label>
                  <input
                    id="employeeId"
                    {...register('employeeId')}
                    className="input mt-1 bg-gray-100 cursor-not-allowed"
                    readOnly
                    tabIndex={-1}
                  />
                </>
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
              className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <span>{getSubmitLabel(isSubmitting, isEdit)}</span>
            </button>
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Deactivate confirm dialog ─────────────────────────────────────────────────
function DeactivateDialog({
  employee,
  onClose,
  onConfirm,
  isPending,
  error,
}: Readonly<{
  employee: Employee;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  error?: string;
}>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 220); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close dialog"
        className={`fixed inset-0 cursor-default transition-opacity duration-220 ${visible ? 'bg-black/30' : 'bg-black/0'}`}
        onClick={handleClose}
      />
      <div className={`relative mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl sm:mx-auto transition-all duration-220 ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}>
        <h3 className="font-semibold text-gray-900">Deactivate Employee</h3>
        <p className="mt-2 text-sm text-gray-600">
          {'Are you sure you want to deactivate '}
          <span className="font-medium">
            {`${employee['firstName'] as string} ${employee['lastName'] as string}`}
          </span>
          {'? They will no longer be able to log in.'}
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn-primary btn-danger flex-1 disabled:opacity-60"
          >
            <span>{isPending ? 'Deactivating\u2026' : 'Deactivate'}</span>
          </button>
          <button onClick={handleClose} className="btn-secondary flex-1">
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminEmployeesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [department, setDepartment] = useState('');
  const [isActive, setIsActive] = useState<'1' | '0' | ''>('1');
  const [page, setPage] = useState(1);
  const [drawerEmployee, setDrawerEmployee] = useState<Employee | null | undefined>(undefined); // undefined = closed
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);
  const [changePasswordTarget, setChangePasswordTarget] = useState<Employee | null>(null);

  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading, isFetching } = useEmployees({
    search: debouncedSearch || undefined,
    department: department || undefined,
    isActive: isActive === '' ? undefined : Number(isActive),
    page,
    limit: 15,
  });

  const employees: Employee[] = (data?.data as Employee[]) ?? [];
  const pagination = data?.pagination as { total: number; totalPages: number } | undefined;

  const deactivate = useDeactivateEmployee();
  const reactivate = useReactivateEmployee();
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <button className="btn-primary" onClick={() => setDrawerEmployee(null)}>
          <span>+ New Employee</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, email, ID…"
          className="input w-full sm:w-56"
        />
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
          value={isActive}
          onChange={(e) => { setIsActive(e.target.value as '1' | '0' | ''); setPage(1); }}
          className="input w-full sm:w-32"
        >
          <option value="1">Active</option>
          <option value="0">Inactive</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Table */}
      <div className={`card overflow-hidden transition-opacity duration-200 ${isFetching && !isLoading ? 'opacity-60' : 'opacity-100'}`}>
        {/* ── Mobile cards (hidden on sm+) ── */}
        <div className="sm:hidden divide-y divide-gray-100">
          {(() => {
            if (isLoading) {
              return SKELETON_ROW_IDS.map((rowId) => (
                <div key={rowId} className="animate-pulse space-y-2 p-4">
                  <div className="h-4 w-1/2 rounded bg-gray-200" />
                  <div className="h-3 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-2/3 rounded bg-gray-200" />
                </div>
              ));
            }
            if (employees.length === 0) {
              return <p className="px-4 py-8 text-center text-gray-400">No employees found.</p>;
            }
            return employees.map((emp) => (
              <div key={emp['_id'] as string} className="p-4 space-y-2 text-sm">
                {/* Name + status row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {emp['firstName'] as string} {emp['lastName'] as string}
                    </p>
                    <p className="text-xs text-gray-400">{emp['email'] as string}</p>
                  </div>
                  {emp['isActive'] ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 shrink-0">Active</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 shrink-0">Inactive</span>
                  )}
                </div>
                {/* Field grid */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div><dt className="text-gray-400">Employee ID</dt><dd className="font-medium text-gray-700">{emp['employeeId'] as string}</dd></div>
                  <div><dt className="text-gray-400">Department</dt><dd className="font-medium text-gray-700">{emp['department'] as string}</dd></div>
                  <div><dt className="text-gray-400">Position</dt><dd className="font-medium text-gray-700">{emp['designation'] as string}</dd></div>
                  <div><dt className="text-gray-400">Role</dt><dd className="font-medium capitalize text-gray-700">{emp['role'] as string}</dd></div>
                </dl>
                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    onClick={() => setDrawerEmployee(emp)}
                    disabled={!(emp['isActive'] as boolean)}
                    className="text-xs text-primary-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  {(emp['isActive'] as boolean) && emp['_id'] !== currentUser?._id && (
                    <>
                      {(emp['isLocked'] as boolean) && (
                        <button onClick={() => unlock.mutate(emp['_id'] as string)} disabled={unlock.isPending} className="text-xs text-amber-600 hover:underline disabled:opacity-50">Unlock</button>
                      )}
                      <button onClick={() => setChangePasswordTarget(emp)} className="text-xs text-blue-600 hover:underline">Change Password</button>
                      <button onClick={() => setDeactivateTarget(emp)} className="text-xs text-red-600 hover:underline">Deactivate</button>
                    </>
                  )}
                  {!(emp['isActive'] as boolean) && (
                    <button
                      onClick={() => reactivate.mutate(emp['_id'] as string)}
                      disabled={reactivate.isPending}
                      className="text-xs text-green-600 hover:underline disabled:opacity-50"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* ── Desktop table (hidden below sm) ── */}
        <div className="hidden sm:block overflow-x-auto">
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
                          disabled={!(emp['isActive'] as boolean)}
                          className="text-xs text-primary-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
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
                              onClick={() => setChangePasswordTarget(emp)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Change Password
                            </button>
                            <button
                              onClick={() => setDeactivateTarget(emp)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                        {!(emp['isActive'] as boolean) && (
                          <button
                            onClick={() => reactivate.mutate(emp['_id'] as string)}
                            disabled={reactivate.isPending}
                            className="text-xs text-green-600 hover:underline disabled:opacity-50"
                          >
                            Reactivate
                          </button>
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

      {/* Change Password Dialog */}
      {changePasswordTarget && (
        <ChangePasswordDialog
          employee={changePasswordTarget}
          onClose={() => setChangePasswordTarget(null)}
        />
      )}

      {/* Deactivate confirm */}
      {deactivateTarget && (
        <DeactivateDialog
          employee={deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={handleDeactivate}
          isPending={deactivate.isPending}
          error={deactivateError}
        />
      )}
    </div>
  );
}
