/**
 * ENS (Ethereum Name Service) resolver
 * Maps .eth names → Ethereum wallet addresses
 */

import { createPublicClient, http, type Address } from 'viem';
import { mainnet } from 'viem/chains';

/**
 * Creates a public client for ENS resolution
 * Uses mainnet RPC (ENS only works on mainnet)
 */
function createEnsClient(rpcUrl?: string) {
  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl || process.env.ETH_RPC_URL || process.env.NEXT_PUBLIC_ETH_RPC_URL),
  });
}

/**
 * Resolves an ENS name to an Ethereum address
 * @param name - ENS name (e.g., "vitalik.eth" or "bankr.eth")
 * @param rpcUrl - Optional custom RPC URL (defaults to env vars or public RPC)
 * @returns Ethereum address or null if not found/invalid
 */
export async function resolveEnsNameToAddress(
  name: string,
  rpcUrl?: string
): Promise<string | null> {
  // Ensure name ends with .eth (or add it if missing)
  const normalizedName = name.endsWith('.eth') ? name : `${name}.eth`;

  try {
    const client = createEnsClient(rpcUrl);
    const address = await client.getEnsAddress({
      name: normalizedName as `${string}.eth`,
    });

    return address || null;
  } catch (error) {
    console.error('❌ Error resolving ENS name:', error);
    return null;
  }
}

/**
 * Resolves an ENS name and returns additional metadata
 * @param name - ENS name (e.g., "vitalik.eth")
 * @param rpcUrl - Optional custom RPC URL
 * @returns Object with address and name, or null
 */
export async function resolveEnsName(
  name: string,
  rpcUrl?: string
): Promise<{ address: Address; name: string } | null> {
  const address = await resolveEnsNameToAddress(name, rpcUrl);
  
  if (!address) {
    return null;
  }

  return {
    address: address as Address,
    name: name.endsWith('.eth') ? name : `${name}.eth`,
  };
}

