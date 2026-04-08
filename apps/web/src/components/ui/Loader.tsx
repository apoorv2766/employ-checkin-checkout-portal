/**
 * Loader — custom animated loader (uiverse.io / alexruix).
 *
 * Variants:
 *   <Loader />              — bare 80×50 animation, centered in its container
 *   <Loader page />         — full-page centered overlay (replaces PageSpinner)
 *   <Loader label="..." />  — override the "loading" text
 */

interface LoaderProps {
  /** Stretch to fill the viewport height and center the loader */
  page?: boolean;
  /** Override the animated label text */
  label?: string;
}

export function Loader({ page = false, label = 'loading' }: LoaderProps) {
  const inner = (
    <div className="loader" aria-label={label} role="status">
      <span className="loader-text">{label}</span>
      <span className="loader-ball" />
    </div>
  );

  if (page) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        {inner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-4">
      {inner}
    </div>
  );
}
