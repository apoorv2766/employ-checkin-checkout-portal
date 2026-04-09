'use client';

import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { authApi, employeesApi } from '@/lib/api/endpoints';
import { toast } from '@/lib/store/toast.store';

const employeeNav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/history', label: 'My History' },
];

const adminNav = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/employees', label: 'Employees' },
  { href: '/admin/attendance', label: 'Attendance' },
  { href: '/admin/reports', label: 'Reports' },
];

function getInitials(firstName?: string, lastName?: string) {
  return `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}`;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth, setUser } = useAuthStore();

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const nav = isAdmin ? adminNav : employeeNav;

  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await authApi.logout();
      toast.info('You have been logged out');
    } finally {
      clearAuth();
      router.replace('/login');
    }
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be smaller than 2 MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        setUploading(true);
        try {
          await employeesApi.uploadPhoto(dataUrl);
          setUser({ profilePhoto: dataUrl });
          toast.success('Profile photo updated');
        } catch {
          toast.error('Failed to update photo');
        } finally {
          setUploading(false);
          // Reset so same file can be re-selected
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    },
    [setUser],
  );

  const initials = getInitials(user?.firstName, user?.lastName);
  let roleLabel = 'Employee';
  if (user?.role === 'admin') roleLabel = 'Admin';
  else if (user?.role === 'manager') roleLabel = 'Manager';

  return (
    <nav className="border-b border-gray-200 bg-white">
      {/* ── main row ──────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left — logo + links */}
        <div className="flex items-center gap-6">
          <span className="font-bold text-primary-600 text-lg">Attendance</span>
          <div className="hidden sm:flex items-center gap-1">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right — hamburger (mobile only) + avatar dropdown */}
        <div className="flex items-center gap-2">
          {/* Hamburger button — only visible below sm breakpoint */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="sm:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Avatar with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-full"
              aria-label="Open user menu"
            >
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-primary-200"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white ring-2 ring-primary-200 select-none">
                  {initials}
                </span>
              )}
            </button>

            {/* Dropdown panel */}
            {open && (
              <div
                className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl border border-gray-100 bg-white shadow-lg ring-1 ring-black/5 z-50 transition-all duration-200 ease-out opacity-100 translate-y-0"
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? 'translateY(0)' : 'translateY(-8px)',
                  pointerEvents: open ? 'auto' : 'none',
                }}
              >
                {/* Header */}
                <div className="flex flex-col items-center gap-2 px-5 py-5 border-b border-gray-100">
                  <div className="relative group">
                    {user?.profilePhoto ? (
                      <img
                        src={user.profilePhoto}
                        alt={`${user?.firstName} ${user?.lastName}`}
                        className="h-16 w-16 rounded-full object-cover ring-2 ring-primary-200"
                      />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white ring-2 ring-primary-200 select-none">
                        {initials}
                      </span>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-wait"
                      title="Change photo"
                    >
                      {uploading ? (
                        <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="text-center">
                    <p className="font-semibold text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <span className="inline-block mt-0.5 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <ul className="px-4 py-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2 text-gray-600">
                    <span className="w-24 flex-shrink-0 font-medium text-gray-400">Employee ID</span>
                    <span className="font-mono text-gray-800">{user?.employeeId}</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600">
                    <span className="w-24 flex-shrink-0 font-medium text-gray-400">Email</span>
                    <span className="break-all text-gray-800">{user?.email}</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600">
                    <span className="w-24 flex-shrink-0 font-medium text-gray-400">Department</span>
                    <span className="text-gray-800">{user?.department}</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600">
                    <span className="w-24 flex-shrink-0 font-medium text-gray-400">Designation</span>
                    <span className="text-gray-800">{user?.designation}</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600">
                    <span className="w-24 flex-shrink-0 font-medium text-gray-400">Timezone</span>
                    <span className="text-gray-800">{user?.timezone}</span>
                  </li>
                </ul>

                {/* Sign out */}
                <div className="border-t border-gray-100 px-4 py-3">
                  <button
                    onClick={handleLogout}
                    className="w-full rounded-lg py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── mobile menu — always in DOM so CSS transitions work ──── */}
      <div
        className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-gray-100 px-4 pb-3 pt-2">
          {nav.map(({ href, label }, index) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{ transitionDelay: menuOpen ? `${index * 60}ms` : '0ms' }}
              className={`block rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
              } ${
                pathname === href || pathname.startsWith(href + '/')
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
