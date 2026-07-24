import './globals.css';
import { getSession } from '@/lib/auth';
import Nav from '@/components/Nav';

export const metadata = {
  title: 'Fillpack USA — Quoting',
  description: 'Customer quoting for Fillpack USA contract manufacturing',
};

export default async function RootLayout({ children }) {
  const session = await getSession();
  return (
    <html lang="en">
      <body>
        {session ? <Nav userEmail={session.email} /> : null}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
