'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/quotes', label: 'Quotes' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/ingredients', label: 'Ingredients' },
  { href: '/packaging', label: 'Packaging' },
];

export default function Nav({ userEmail }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          FILLPACK <span className="text-brand">USA</span>
        </Link>
        <nav className="flex gap-1 text-sm">
          {links.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded px-3 py-1.5 transition-colors ${
                  active ? 'bg-brand text-white' : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-300">
          <span>{userEmail}</span>
          <button onClick={logout} className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
