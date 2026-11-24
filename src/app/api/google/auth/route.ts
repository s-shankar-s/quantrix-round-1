import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getGoogleAuthUrl, exchangeCodeForTokens } from '@/lib/google-sheets';
import { serverStore } from '@/lib/server-store';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Admin required' }, { status: 403 });
  }

  try {
    const authUrl = getGoogleAuthUrl();
    return NextResponse.json({ success: true, authUrl });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Admin required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { code } = body;
    if (!code) {
      return NextResponse.json({ success: false, message: 'Missing authorization code' }, { status: 400 });
    }

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

    serverStore.logAuditAction(session.userId, 'admin', 'GOOGLE_ACCOUNT_CONNECTED', 'google_sheets', undefined, {
      email: tokens.owner_email,
    });

    return NextResponse.json({ success: true, email: tokens.owner_email });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
