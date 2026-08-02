'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/quotes', label: 'Quotes' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/ingredients', label: 'Ingredients' },
  { href: '/packaging', label: 'Packaging' },
  { href: '/chat', label: 'Assistant' },
];

export default function Nav({ userEmail }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // A left-over open drawer after navigating would cover the new page.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 bg-navy text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="-my-1 py-1 text-lg font-bold tracking-tight">
          FILLPACK <span className="text-brand">USA</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden gap-1 text-sm lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded px-3 py-1.5 transition-colors ${
                isActive(l.href) ? 'bg-brand text-white' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 text-xs text-gray-300 lg:flex">
          <span>{userEmail}</span>
          <button onClick={logout} className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
            Sign out
          </button>
        </div>

        {/* Mobile */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded hover:bg-white/10 lg:hidden"
        >
          <span className="relative block h-4 w-6">
            <span className={`absolute left-0 block h-0.5 w-6 bg-white transition-all ${open ? 'top-2 rotate-45' : 'top-0'}`} />
            <span className={`absolute left-0 top-2 block h-0.5 w-6 bg-white transition-opacity ${open ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`absolute left-0 block h-0.5 w-6 bg-white transition-all ${open ? 'top-2 -rotate-45' : 'top-4'}`} />
          </span>
        </button>
      </div>

      {open && (
        <>
          <button
            aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)}
            className="fixed inset-0 top-0 -z-10 bg-black/40 lg:hidden"
          />
          <nav className="border-t border-white/10 bg-navy px-4 pb-4 lg:hidden">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`block rounded px-3 py-3 text-base ${
                  isActive(l.href) ? 'bg-brand font-semibold text-white' : 'text-gray-200 hover:bg-white/10'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-gray-400">
              <span className="break-anywhere pr-3">{userEmail}</span>
              <button onClick={logout} className="shrink-0 rounded border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10">
                Sign out
              </button>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
