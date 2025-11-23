/**
 * Local agent directory for AI agents and system users
 * These are identities that don't have Farcaster or ENS but are known to the app
 */

export type IdentitySource = 'farcaster' | 'ens' | 'directory' | 'manual';

export interface AgentIdentity {
  id: string;                 // internal ID
  handle: string;             // e.g. "bankr", "pricebot"
  displayName: string;        // e.g. "Bankr AI"
  walletAddress: string;      // 0x...
  avatarUrl?: string;
  description?: string;
  source: IdentitySource;
}

/**
 * Directory of known AI agents and system users
 * Add real agent data here once you get official addresses from their teams
 */
export const AGENT_DIRECTORY: AgentIdentity[] = [
  // Example entries - replace with real agent data
  // {
  //   id: 'bankr',
  //   handle: 'bankr',
  //   displayName: 'Bankr AI',
  //   walletAddress: '0xBANKR...', // Replace with real address
  //   avatarUrl: 'https://.../bankr.png',
  //   description: 'Onchain portfolio copilot and transaction assistant.',
  //   source: 'directory',
  // },
  // {
  //   id: 'pricebot',
  //   handle: 'pricebot',
  //   displayName: 'Price Bot',
  //   walletAddress: '0xPRICEBOT...', // Replace with real address
  //   source: 'directory',
  // },
];

/**
 * Finds an agent by handle (case-insensitive)
 * @param handle - The handle to search for (without @)
 * @returns AgentIdentity or null if not found
 */
export function findAgentByHandle(handle: string): AgentIdentity | null {
  const normalizedHandle = handle.toLowerCase();
  return (
    AGENT_DIRECTORY.find((agent) => agent.handle.toLowerCase() === normalizedHandle) || null
  );
}

/**
 * Finds an agent by wallet address (case-insensitive)
 * @param address - The wallet address to search for
 * @returns AgentIdentity or null if not found
 */
export function findAgentByAddress(address: string): AgentIdentity | null {
  const normalizedAddress = address.toLowerCase();
  return (
    AGENT_DIRECTORY.find((agent) => agent.walletAddress.toLowerCase() === normalizedAddress) ||
    null
  );
}

/**
 * Gets all agents in the directory
 * @returns Array of all AgentIdentity objects
 */
export function getAllAgents(): AgentIdentity[] {
  return [...AGENT_DIRECTORY];
}

