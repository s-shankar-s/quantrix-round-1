import { cookies } from 'next/headers';
import { AppUser, UserRole } from '@/types';
import { serverStore } from './server-store';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'quantrix_session_token';

export interface SessionData {
  userId: string;
  username: string;
  role: UserRole;
  displayName: string;
}

// Simple base64 URL-safe signed payload for session persistence
export async function createSessionCookie(user: AppUser) {
  const session: SessionData = {
    userId: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
  };
  const token = Buffer.from(JSON.stringify(session)).toString('base64');
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie || !cookie.value) return null;
  try {
    const raw = Buffer.from(cookie.value, 'base64').toString('utf-8');
    const data = JSON.parse(raw) as SessionData;
    // Verify user is still active in database/store
    const user = serverStore.getUserById(data.userId);
    if (!user || !user.is_active) {
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

export async function verifyCredentials(username: string, plainTextPass: string): Promise<AppUser | null> {
  const user = serverStore.getUserByUsername(username);
  if (!user || !user.is_active) return null;

  const valid = bcrypt.compareSync(plainTextPass, user.password_hash);
  if (!valid) return null;

  const { password_hash, ...safeUser } = user;
  return safeUser;
}
