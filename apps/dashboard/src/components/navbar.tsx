import Link from "next/link";

export function Navbar() {
  return (
    <nav className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[var(--emerald)]">
            <path d="M10 1L2 5v10l8 4 8-4V5l-8-4z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M10 9v6M7 7.5l3 1.5 3-1.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Token Warden
        </Link>
        <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
          <Link href="/" className="transition-colors hover:text-[var(--foreground)]">Dashboard</Link>
          <Link href="/alerts" className="transition-colors hover:text-[var(--foreground)]">Alerts</Link>
          <Link href="/setup" className="transition-colors hover:text-[var(--foreground)]">Setup</Link>
        </div>
      </div>
    </nav>
  );
}
