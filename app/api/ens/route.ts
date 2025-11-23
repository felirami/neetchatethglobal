/**
 * Next.js API route for ENS resolution
 * Resolves .eth names to Ethereum addresses
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveEnsNameToAddress } from '@/lib/identity/ens';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json(
      { error: 'Name parameter is required' },
      { status: 400 }
    );
  }

  // Optional: allow custom RPC URL via query param (for testing)
  const rpcUrl = searchParams.get('rpcUrl') || undefined;

  const address = await resolveEnsNameToAddress(name, rpcUrl);

  if (!address) {
    return NextResponse.json(
      { error: 'ENS name not found or invalid' },
      { status: 404 }
    );
  }

  return NextResponse.json({ 
    name: name.endsWith('.eth') ? name : `${name}.eth`,
    address 
  });
}

