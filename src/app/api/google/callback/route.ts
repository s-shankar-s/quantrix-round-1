import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-sheets';
import { serverStore } from '@/lib/server-store';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/admin?tab=sheets&error=' + encodeURIComponent(error || 'missing_code'), req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token;
    if (tokens.refresh_token) {
      process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
    }
    process.env.GOOGLE_TOKEN_EXPIRY = tokens.expiry_date.toString();

    serverStore.updateSheetsConfig({
      is_connected: true,
      owner_email: tokens.owner_email,
      token_expiry: new Date(tokens.expiry_date).toISOString(),
    });

    serverStore.logAuditAction('admin', 'admin', 'GOOGLE_ACCOUNT_CONNECTED', 'google_sheets', undefined, {
      email: tokens.owner_email,
    });

    return NextResponse.redirect(new URL('/admin?tab=sheets&success=connected', req.url));
  } catch (err: any) {
    return NextResponse.redirect(new URL('/admin?tab=sheets&error=' + encodeURIComponent(err.message || 'auth_failed'), req.url));
  }
}
