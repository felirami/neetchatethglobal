/**
 * Resolution pipeline for mentions
 * Combines Farcaster → ENS → Directory → Fallback
 */

import { extractMentions, type MentionToken } from '../mentions';
import { resolveFarcasterUserByUsername, getPrimaryEthAddress, type FarcasterUser } from './farcaster';
import { resolveEnsNameToAddress } from './ens';
import { findAgentByHandle, type AgentIdentity } from './agents';
import type { IdentitySource } from './agents';

export interface ResolvedIdentity {
  handle: string;        // what user typed without "@"
  displayLabel: string;  // best label to show in UI
  walletAddress?: string;
  avatarUrl?: string;
  source: IdentitySource;
  extra?: Record<string, any>; // e.g. Farcaster fid, agent description
}

/**
 * Resolves a single mention username to an identity
 * For mentions (@username.eth), only checks Farcaster (not ENS)
 * For direct ENS lookups (username.eth without @), checks ENS
 * 
 * @param username - The username to resolve (without @)
 * @param options - Optional configuration
 * @param isMention - If true, this came from a mention (@username), so .eth endings are Farcaster usernames, not ENS
 * @returns ResolvedIdentity or null if not found
 */
export async function resolveMention(
  username: string,
  options?: {
    useApiRoutes?: boolean; // If true, uses API routes instead of direct calls
    neynarApiKey?: string;  // Optional API key for Farcaster
    ethRpcUrl?: string;      // Optional RPC URL for ENS
    isMention?: boolean;     // If true, username came from @mention (so .eth is Farcaster, not ENS)
  }
): Promise<ResolvedIdentity | null> {
  const { useApiRoutes = false, neynarApiKey, ethRpcUrl, isMention = true } = options || {};

  // If it's NOT a mention and ends with .eth, skip Farcaster and go straight to ENS
  // If someone types "felirami.eth" (without @), it's an ENS lookup only
  if (!isMention && username.endsWith('.eth')) {
    // ENS lookup only - skip Farcaster entirely
    let address: string | null = null;

    if (useApiRoutes) {
      try {
        const res = await fetch(`/api/ens?name=${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          address = data.address || null;
        }
      } catch (error) {
        console.error('❌ Error calling ENS API route:', error);
      }
    } else {
      address = await resolveEnsNameToAddress(username, ethRpcUrl);
    }

    if (address) {
      return {
        handle: username,
        displayLabel: username,
        walletAddress: address,
        source: 'ens',
      };
    }
    // If ENS lookup failed, return null (don't try Farcaster)
    return null;
  }

  // 1. Farcaster (for mentions, including @username.eth)
  // If it's a mention (@username.eth), the .eth is part of the Farcaster username, not ENS
  let fcUser: FarcasterUser | null = null;

  if (useApiRoutes) {
    try {
      const res = await fetch(`/api/farcaster?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        fcUser = data.user || null;
      }
    } catch (error) {
      console.error('❌ Error calling Farcaster API route:', error);
    }
  } else {
    fcUser = await resolveFarcasterUserByUsername(username, neynarApiKey);
  }

  if (fcUser) {
    const ethAddr = getPrimaryEthAddress(fcUser);
    return {
      handle: username,
      displayLabel: fcUser.display_name || `@${username}`,
      walletAddress: ethAddr || undefined,
      avatarUrl: fcUser.pfp_url,
      source: 'farcaster',
      extra: { fid: fcUser.fid },
    };
  }

  // 3. Local agent directory
  const agent = findAgentByHandle(username);
  if (agent) {
    return {
      handle: agent.handle,
      displayLabel: agent.displayName,
      walletAddress: agent.walletAddress,
      avatarUrl: agent.avatarUrl,
      source: 'directory',
      extra: { description: agent.description },
    };
  }

  // 4. Fallback – unresolved
  return null;
}

/**
 * Resolves all mentions in a text string
 * 
 * @param text - The text containing mentions
 * @param options - Optional configuration (same as resolveMention)
 * @returns Array of objects with mention token and resolved identity
 */
export async function resolveMentionsInText(
  text: string,
  options?: {
    useApiRoutes?: boolean;
    neynarApiKey?: string;
    ethRpcUrl?: string;
  }
): Promise<Array<{ mention: MentionToken; identity: ResolvedIdentity | null }>> {
  const mentions = extractMentions(text);

  // Resolve all mentions in parallel
  const results = await Promise.all(
    mentions.map(async (mention) => ({
      mention,
      identity: await resolveMention(mention.username, options),
    }))
  );

  return results;
}

/**
 * Resolves multiple usernames in parallel
 * Useful for batch resolution
 * 
 * @param usernames - Array of usernames to resolve
 * @param options - Optional configuration
 * @returns Map of username → ResolvedIdentity | null
 */
export async function resolveMentionsBatch(
  usernames: string[],
  options?: {
    useApiRoutes?: boolean;
    neynarApiKey?: string;
    ethRpcUrl?: string;
  }
): Promise<Map<string, ResolvedIdentity | null>> {
  const results = await Promise.all(
    usernames.map(async (username) => {
      const identity = await resolveMention(username, options);
      return [username, identity] as [string, ResolvedIdentity | null];
    })
  );

  return new Map(results);
}

