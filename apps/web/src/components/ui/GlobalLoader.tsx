'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Loader } from './Loader';

/**
 * Thin progress bar at the very top of the viewport.
 * Appears whenever any React Query fetch or mutation is in flight.
 */
export function GlobalLoader() {
  const fetching  = useIsFetching();
  const mutating  = useIsMutating();
  const isLoading = fetching > 0 || mutating > 0;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-[10000] h-0.5
        transition-opacity duration-300
        ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
      role="progressbar"
      aria-hidden={!isLoading}
    >
      <div className="h-full w-full bg-primary-100 overflow-hidden">
        <div
          className={`
            h-full bg-primary-500
            ${isLoading ? 'animate-loader-bar' : ''}
          `}
        />
      </div>
    </div>
  );
}

/**
 * Inline spinner — kept for the Navbar photo-upload overlay (tiny context).
 */
export function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8';
  return (
    <svg
      className={`${dims} animate-spin text-current`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/**
 * Full-page centered loader — uses the custom Loader animation.
 */
export function PageSpinner() {
  return <Loader page />;
}
