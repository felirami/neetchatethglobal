/**
 * Next.js API route for Farcaster resolution
 * Keeps API key secure on server-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveFarcasterUserByUsername } from '@/lib/identity/farcaster';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { error: 'Username parameter is required' },
      { status: 400 }
    );
  }

  // API key is read from server-side env (NEYNAR_API_KEY)
  const user = await resolveFarcasterUserByUsername(username);

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ user });
}

