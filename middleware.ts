import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ambil cookie user_session
  const sessionCookie = request.cookies.get('user_session')?.value;

  let userRole = '';

  if (sessionCookie) {
    try {
      const parsedSession = JSON.parse(decodeURIComponent(sessionCookie));
      userRole = parsedSession.role || '';
    } catch {
      userRole = '';
    }
  }

  // 2. Tentukan halaman yang diproteksi
  const isProtectedArea =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/operator') ||
    pathname.startsWith('/pimpinan');

  // 3. BELUM LOGIN & Akses Protected Area -> Redirect ke /login
  if (isProtectedArea && !userRole) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. SUDAH LOGIN & Buka /login -> Redirect ke Dashboard sesuai Role
  if (pathname === '/login' && userRole) {
    if (userRole.includes('admin')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (userRole.includes('pimpinan')) {
      return NextResponse.redirect(new URL('/pimpinan', request.url));
    }
    if (userRole.includes('operator')) {
      return NextResponse.redirect(new URL('/operator', request.url));
    }
  }

  // 5. BATASI HAK AKSES BERDASARKAN ROLE
  if (userRole) {
    // Tentukan target redirect yang valid jika melempar user
    const targetDashboard = userRole.includes('admin')
      ? '/admin'
      : userRole.includes('pimpinan')
      ? '/pimpinan'
      : userRole.includes('operator')
      ? '/operator'
      : '/login';

    if (pathname.startsWith('/admin') && !userRole.includes('admin')) {
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    if (pathname.startsWith('/operator') && !userRole.includes('operator')) {
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    if (pathname.startsWith('/pimpinan') && !userRole.includes('pimpinan')) {
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/operator/:path*',
    '/pimpinan/:path*',
    '/login',
  ],
};