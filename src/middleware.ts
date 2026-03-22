import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const locales = ['fr', 'en', 'pt'];
const defaultLocale = 'fr';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the pathname is missing a locale
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    // Redirect to default locale
    return NextResponse.redirect(
      new URL(`/${defaultLocale}${pathname}`, request.url)
    );
  }
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (manifest file)
     * - *.png, *.jpg, *.jpeg, *.gif, *.svg, *.webp (image files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|gif|svg|webp|json)).*)',
  ],
};
