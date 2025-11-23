/**
 * Mention parsing utilities
 * Detects @username mentions in message text
 */

export interface MentionToken {
  raw: string;       // e.g. "@luis"
  username: string;  // e.g. "luis"
  index: number;     // start index in text
  length: number;    // length of mention
}

const MENTION_REGEX = /@([a-zA-Z0-9_.-]+)/g;

/**
 * Extracts all mention tokens from a text string
 * @param text - The text to parse for mentions
 * @returns Array of MentionToken objects
 */
export function extractMentions(text: string): MentionToken[] {
  const mentions: MentionToken[] = [];
  let match: RegExpExecArray | null;

  // Reset regex lastIndex to ensure we start from the beginning
  MENTION_REGEX.lastIndex = 0;

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

