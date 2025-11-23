/**
 * Farcaster identity resolver using Neynar API
 * Maps @username → Farcaster user → verified wallet addresses
 */

export type FarcasterUser = {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  verified_addresses?: {
    eth_addresses?: string[];
    sol_addresses?: string[];
    primary?: {
      eth_address?: string;
      sol_address?: string;
    };
  };
};

/**
 * Resolves a Farcaster username to a user profile with verified addresses
 * @param username - The Farcaster username (without @)
 * @param apiKey - Neynar API key (can be from env or passed directly)
 * @returns FarcasterUser object or null if not found
 */
export async function resolveFarcasterUserByUsername(
  username: string,
  apiKey?: string
): Promise<FarcasterUser | null> {
  const NEYNAR_API_KEY = apiKey || process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

  if (!NEYNAR_API_KEY) {
    console.warn('⚠️ NEYNAR_API_KEY not found. Farcaster resolution will fail.');
    return null;
  }

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/by_username?username=${encodeURIComponent(username)}`,
      {
        headers: {
          accept: 'application/json',
          api_key: NEYNAR_API_KEY,
        },
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        // User not found - this is normal, not an error
        return null;
      }
      console.error(`❌ Neynar API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    
    // Neynar API returns user directly, not wrapped in { user: ... }
    // Check if it's the user object directly or wrapped
    const user = data.user || (data.username ? data : null);
    
    if (!user) {
      return null;
    }

    return user as FarcasterUser;
  } catch (error) {
    console.error('❌ Error resolving Farcaster user:', error);
    return null;
  }
}

/**
 * Gets the primary Ethereum address from a Farcaster user
 * Uses the primary address if available, otherwise falls back to first verified address
 * @param user - FarcasterUser object
 * @returns Ethereum address string or null
 */
export function getPrimaryEthAddress(user: FarcasterUser): string | null {
  // Prefer primary.eth_address if available (official primary address)
  if (user.verified_addresses?.primary?.eth_address) {
    return user.verified_addresses.primary.eth_address;
  }
  // Fallback to first verified address
  return user.verified_addresses?.eth_addresses?.[0] || null;
}

