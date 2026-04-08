'use client';

import { useEffect, useState } from 'react';
import { useToastStore, type Toast, type ToastType } from '@/lib/store/toast.store';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error:   'bg-red-50 border-red-400 text-red-800',
  warning: 'bg-amber-50 border-amber-400 text-amber-800',
  info:    'bg-blue-50 border-blue-400 text-blue-800',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'bg-green-100 text-green-600',
  error:   'bg-red-100 text-red-600',
  warning: 'bg-amber-100 text-amber-600',
  info:    'bg-blue-100 text-blue-600',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation on mount
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onRemove, 300); // wait for exit animation
  };

  return (
    <div
      className={`
        flex items-start gap-3 w-80 rounded-lg border px-4 py-3 shadow-lg
        transition-all duration-300
        ${STYLES[toast.type]}
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
      role="alert"
    >
      <span
        className={`flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${ICON_STYLES[toast.type]}`}
      >
        {ICONS[toast.type]}
      </span>
      <p className="flex-1 text-sm leading-5 font-medium pt-0.5">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
