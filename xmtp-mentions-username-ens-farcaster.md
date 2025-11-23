# XMTP `@username` / ENS / Farcaster Mentions – Implementation Guide

This doc explains how to implement `@username` mentions in an XMTP chat app, **outside** the XMTP protocol layer.

XMTP itself only knows about **wallet addresses + identity signatures**. Usernames, ENS names, Farcaster handles, and AI agent names all live in **your app’s identity layer**, not in XMTP.

You can use this doc as a blueprint inside Cursor to build:

- A **mention parser** (detect `@something` in message text)
- A **resolver pipeline** (map `@something` → wallet address + metadata)
- A **directory** for AI agents / system users
- A **UI rendering model** (how to show mentions and profiles)

---

## 1. High-level architecture

### 1.1 What XMTP gives you

From `@xmtp/xmtp-js` (or similar SDK) you get:

- A `Client` bound to a signer (wallet)
- Conversation objects
- Messages with `content` (usually string / text / JSON)

XMTP **does not** provide:

- `username`
- `handle`
- `displayName`
- `avatar`
- `bio`
- `mention metadata`

So **all of this** is handled in your app.

### 1.2 Identity / mention pipeline

Typical flow when a user sends a message:

1. User types: `gm @luis @bankr.eth @someagent`
2. Client-side code parses text and extracts mention tokens.
3. For each token, you try to resolve it via:
   1. **Farcaster** (Neynar API → wallet addresses)
   2. **ENS** (resolve name → address)
   3. **Local agent directory / contacts**
4. You store the resolved info locally (cache) in your app state or DB.
5. You send **plain text** via XMTP, but your app remembers which substrings correspond to which identities.
6. When rendering messages, you:
   - Highlight `@something`
   - Attach user or agent profile data (wallet, avatar, etc.)

---

## 2. APIs and dependencies you’ll need

You can adapt these for your stack, but a typical TypeScript / Next.js + XMTP app will use:

### 2.1 XMTP

- **Package**: `@xmtp/xmtp-js`
- Docs: https://xmtp.org or npm page

Basic setup example (TypeScript):

```ts
import { Client } from "@xmtp/xmtp-js";
import { Wallet } from "ethers";

async function createXmtpClient() {
  const wallet = Wallet.createRandom(); // replace with real signer
  const xmtp = await Client.create(wallet, {
    env: "production", // or "dev", "local"
  });
  return xmtp;
}
```

You are **not** changing anything in XMTP for mentions; you only parse/render in your app.

---

### 2.2 Farcaster (for `@username` → wallets)

Use **Neynar** (recommended) or another Farcaster API provider.

- **Site**: https://neynar.com
- **You need**: Neynar API key
- **Use case**: map `@username` → Farcaster user → verified wallets.

Key endpoint (high level):

- Search users by username or handle
- Get **verified addresses** per user

Once you have the API key, you’ll:

- Store it in `.env` (e.g., `NEYNAR_API_KEY=...`)
- Call a Neynar endpoint from your server or backend function.

Example (server-side TypeScript pseudocode):

```ts
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;

type FarcasterUser = {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  verified_addresses?: {
    eth_addresses?: string[];
    sol_addresses?: string[];
  };
};

export async function resolveFarcasterUserByUsername(username: string): Promise<FarcasterUser | null> {
  const res = await fetch(`https://api.neynar.com/v2/farcaster/user-by-username?username=${encodeURIComponent(username)}`, {
    headers: {
      "accept": "application/json",
      "api_key": NEYNAR_API_KEY,
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.user) return null;
  return data.user as FarcasterUser;
}
```

You’ll then choose one of the user’s `verified_addresses.eth_addresses[0]` as the primary wallet for XMTP identity.

> **Note:** The exact URL and response shape may vary by Neynar version – check their docs and adjust the path/fields as needed.

---

### 2.3 ENS (for `.eth` names)

Use `ethers` or `viem` to resolve ENS names.

#### Option A – ethers v6

- **Package**: `ethers`
- ENS provider connected to mainnet or another chain with ENS support.

```ts
import { JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider(process.env.ETH_RPC_URL);

export async function resolveEnsNameToAddress(name: string): Promise<string | null> {
  try {
    const addr = await provider.resolveName(name);
    return addr ?? null;
  } catch (e) {
    console.error("ENS resolve error", e);
    return null;
  }
}
```

You’ll need:

- `ETH_RPC_URL` pointing to an RPC with ENS support (e.g., mainnet Infura/Alchemy/etc.).

#### Option B – viem

If you already use viem:

- **Packages**: `viem`, `viem/chains`
- Use `publicClient.getEnsAddress({ name })`

---

### 2.4 Local agent directory (your own JSON / DB)

For AI agents and internal system users, there is no Farcaster or ENS sometimes. You control these directly.

Define a schema like:

```ts
export type IdentitySource = "farcaster" | "ens" | "directory" | "manual";

export interface AgentIdentity {
  id: string;                 // internal ID
  handle: string;             // e.g. "bankr", "pricebot"
  displayName: string;        // e.g. "Bankr AI"
  walletAddress: string;      // 0x...
  avatarUrl?: string;
  description?: string;
  source: IdentitySource;
}
```

And a static JSON / DB seed:

```ts
export const AGENT_DIRECTORY: AgentIdentity[] = [
  {
    id: "bankr",
    handle: "bankr",
    displayName: "Bankr AI",
    walletAddress: "0xBANKR...",
    avatarUrl: "https://.../bankr.png",
    description: "Onchain portfolio copilot and transaction assistant.",
    source: "directory",
  },
  {
    id: "pricebot",
    handle: "pricebot",
    displayName: "Price Bot",
    walletAddress: "0xPRICEBOT...",
    source: "directory",
  },
];
```

*(You can fill real agent data once you get official addresses from their teams.)*

---

## 3. Mention parsing (`@something` detection)

Mentions are parsed purely in text. A simple strategy:

- Recognize tokens that start with `@`
- Allow characters: letters, numbers, `_`, `.`, `-`
- Optionally support `@name.eth` explicitly as ENS

Example parser (front-end or shared TS):

```ts
export interface MentionToken {
  raw: string;       // e.g. "@luis"
  username: string;  // e.g. "luis"
  index: number;     // start index in text
  length: number;    // length of mention
}

const MENTION_REGEX = /@([a-zA-Z0-9_.-]+)/g;

export function extractMentions(text: string): MentionToken[] {
  const mentions: MentionToken[] = [];
  let match: RegExpExecArray | null;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const raw = match[0];
    const username = match[1];
    mentions.push({
      raw,
      username,
      index: match.index,
      length: raw.length,
    });
  }

  return mentions;
}
```

Usage example:

```ts
const text = "gm @luis @bankr.eth how are you?";
const mentions = extractMentions(text);
// [
//   { raw: "@luis", username: "luis", ... },
//   { raw: "@bankr.eth", username: "bankr.eth", ... }
// ]
```

---

## 4. Resolution pipeline (Farcaster → ENS → directory)

Once you have `MentionToken[]`, you try resolving each token to an identity.

Recommended order:

1. **Farcaster** (for plain `@username`)
2. **ENS** (for names ending with `.eth`)
3. **Local directory** (for agents / system users)
4. **Fallback** (unresolved; just show raw text)

### 4.1 Identity model

```ts
export interface ResolvedIdentity {
  handle: string;        // what user typed without "@"
  displayLabel: string;  // best label to show in UI
  walletAddress?: string;
  avatarUrl?: string;
  source: IdentitySource;
  extra?: Record<string, any>; // e.g. Farcaster info
}
```

### 4.2 Resolver function (high-level)

```ts
import { resolveFarcasterUserByUsername } from "./farcaster";
import { resolveEnsNameToAddress } from "./ens";
import { AGENT_DIRECTORY } from "./agents";

export async function resolveMention(username: string): Promise<ResolvedIdentity | null> {
  // 1. ENS – if looks like ENS
  const isEns = username.endsWith(".eth");

  if (isEns) {
    const addr = await resolveEnsNameToAddress(username);
    if (addr) {
      return {
        handle: username,
        displayLabel: username,
        walletAddress: addr,
        source: "ens",
      };
    }
  }

  // 2. Farcaster
  const fcUser = await resolveFarcasterUserByUsername(username);
  if (fcUser) {
    const ethAddr = fcUser.verified_addresses?.eth_addresses?.[0];
    return {
      handle: username,
      displayLabel: fcUser.display_name || `@${username}`,
      walletAddress: ethAddr,
      avatarUrl: fcUser.pfp_url,
      source: "farcaster",
      extra: { fid: fcUser.fid },
    };
  }

  // 3. Local agent directory
  const agent = AGENT_DIRECTORY.find((a) => a.handle.toLowerCase() === username.toLowerCase());
  if (agent) {
    return {
      handle: agent.handle,
      displayLabel: agent.displayName,
      walletAddress: agent.walletAddress,
      avatarUrl: agent.avatarUrl,
      source: "directory",
      extra: { description: agent.description },
    };
  }

  // 4. Fallback – unresolved
  return null;
}
```

### 4.3 Resolving all mentions in a message

```ts
export async function resolveMentionsInText(text: string) {
  const mentions = extractMentions(text);

  const results = await Promise.all(
    mentions.map(async (m) => ({
      mention: m,
      identity: await resolveMention(m.username),
    })),
  );

  return results;
}
```

You can call this:

- On **send** (to update local metadata)
- On **receive** (to annotate messages with identities)

To avoid excessive API calls, implement:

- A **cache** in memory (e.g. Map)
- A **persistent cache** (DB / KV / Redis) for known handles

---

## 5. Storing mention metadata (client / server)

Because XMTP only carries text, you’ll want a way to remember which mentions map to which identities when rendering.

Options:

1. **Client-only cache**
   - Good for simple apps
   - Use React context, Zustand, or a store to cache `handle → ResolvedIdentity`

2. **Server / backend storage**
   - Good if multiple clients connect to the same XMTP identity
   - Store identities in DB tables:
     - `identities` (wallet, ENS, Farcaster fid, avatar)
     - `handles` (handle string → identity_id, source)

Example DB schema idea (Postgres):

```sql
create table identities (
  id serial primary key,
  wallet_address text unique,
  ens_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table handles (
  id serial primary key,
  handle text not null,
  source text not null, -- 'farcaster' | 'ens' | 'directory'
  identity_id int references identities(id),
  metadata jsonb default '{}'::jsonb,
  unique (handle, source)
);
```

When parsing/resolving a mention:

- Check if `handle` exists in `handles`
- If not, resolve and insert

---

## 6. Rendering mentions in the UI

In React / Next.js, you can:

1. Split message text around mention tokens.
2. Wrap mention spans with clickable components.
3. Use your identity cache to show correct name + avatar.

Example (simplified):

```tsx
import React from "react";
import { extractMentions } from "./mentions";
import { useIdentityStore } from "./identityStore";

interface Props {
  text: string;
}

export function MessageWithMentions({ text }: Props) {
  const mentions = extractMentions(text);
  const { getIdentityByHandle } = useIdentityStore();

  if (mentions.length === 0) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  mentions.forEach((m, idx) => {
    const before = text.slice(lastIndex, m.index);
    if (before) parts.push(<span key={`before-${idx}`}>{before}</span>);

    const identity = getIdentityByHandle(m.username);
    const label = identity?.displayLabel ?? m.raw;

    parts.push(
      <span
        key={`mention-${idx}`}
        className="text-blue-500 cursor-pointer hover:underline"
        onClick={() => {
          // open profile modal, start DM, etc.
          console.log("Clicked mention", identity);
        }}
      >
        {label}
      </span>,
    );

    lastIndex = m.index + m.length;
  });

  const after = text.slice(lastIndex);
  if (after) parts.push(<span key="after">{after}</span>);

  return <>{parts}</>;
}
```

> Note: this is **pure UI**. XMTP still only sees the raw `text` message string.

---

## 7. Sending messages with mentions over XMTP

This part is straightforward.

When user hits “send”:

1. You get the `text` from input.
2. (Optional) run `resolveMentionsInText(text)` to warm up cache.
3. Send over XMTP as **plain text**:

```ts
await conversation.send(text);
```

Optionally you can:

- Wrap message content in a JSON envelope that includes metadata, but this is **your format**, not XMTP’s:

```ts
type ChatMessageContent = {
  type: "text";
  text: string;
  mentions?: {
    handle: string;
    resolvedWallet?: string;
  }[];
};

const content: ChatMessageContent = {
  type: "text",
  text,
  mentions: resolvedMentions.map(({ mention, identity }) => ({
    handle: mention.username,
    resolvedWallet: identity?.walletAddress,
  })),
};

await conversation.send(content);
```

On receive, you’d:

- Check if `content` is an object with `mentions`
- Use that as a hint to avoid re-resolving

This is **optional** and requires your own decoding logic.

---

## 8. Summary checklist

To implement `@username` / ENS / agent mentions in your XMTP app, you need:

- [ ] **Mention parser** (regex-based) to extract `@something`
- [ ] **Farcaster resolver** using Neynar (username → wallet + avatar)
- [ ] **ENS resolver** using `ethers` or `viem`
- [ ] **Local agent directory** JSON → wallet addresses
- [ ] **Resolution pipeline** (Farcaster → ENS → directory → fallback)
- [ ] **Cache / DB** for identities + handles
- [ ] **React rendering logic** to display mentions as clickable spans
- [ ] **Optional** JSON envelope format for messages with mentions

### Environment variables you’ll likely have

```bash
# XMTP / app
NEXT_PUBLIC_XMTP_ENV=production

# Farcaster / Neynar
NEYNAR_API_KEY=your_neynar_api_key_here

# ENS / Ethereum RPC
ETH_RPC_URL=https://mainnet.infura.io/v3/your_key_here
```

---

## 9. Next steps you can implement in Cursor

1. Create files in your repo:

   - `lib/mentions.ts` — parser + `extractMentions`
   - `lib/identity/farcaster.ts` — Neynar resolver
   - `lib/identity/ens.ts` — ENS resolver
   - `lib/identity/agents.ts` — local `AGENT_DIRECTORY`
   - `lib/identity/resolve.ts` — `resolveMention` + `resolveMentionsInText`
   - `components/MessageWithMentions.tsx` — React renderer

2. Add `NEYNAR_API_KEY` and `ETH_RPC_URL` to `.env.local`.
3. Wire the resolver into your message send / receive pipeline.
4. Slowly expand your **agent directory** with real XMTP AI agents and system bots.

This approach keeps XMTP usage **clean and protocol-compliant**, while giving you a modern identity layer with `@handles`, ENS, and Farcaster integration.
