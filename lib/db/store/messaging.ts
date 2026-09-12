/**
 * Chat message hub.
 *
 * Two delivery paths so the same call works in both server-rendered and
 * static-exported builds:
 *  1. In-process subscribers via ChannelHub (used by the SSE route).
 *  2. Browser BroadcastChannel — delivers to other tabs and to the same tab
 *     when no server runtime is available (static export).
 */

import type { Row } from './memory';

type MessagePayload = {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Listener = (msg: MessagePayload) => void;

class ChannelHub {
  private channels = new Map<string, Set<Listener>>();

  subscribe(channelId: string, listener: Listener): () => void {
    let set = this.channels.get(channelId);
    if (!set) {
      set = new Set();
      this.channels.set(channelId, set);
    }
    set.add(listener);
    return () => {
      const s = this.channels.get(channelId);
      if (!s) return;
      s.delete(listener);
      if (s.size === 0) this.channels.delete(channelId);
    };
  }

  emit(channelId: string, msg: MessagePayload): void {
    const set = this.channels.get(channelId);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(msg);
      } catch {
        /* swallow listener errors */
      }
    }
  }

  size(channelId: string): number {
    return this.channels.get(channelId)?.size ?? 0;
  }
}

let _hub: ChannelHub | null = null;
export function getMessageHub(): ChannelHub {
  if (!_hub) _hub = new ChannelHub();
  return _hub;
}

const BROADCAST_PREFIX = 'bc.chat.';

function safeBroadcast(channelId: string, msg: MessagePayload): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  try {
    const bc = new BroadcastChannel(`${BROADCAST_PREFIX}${channelId}`);
    bc.postMessage(msg);
    bc.close();
  } catch {
    /* ignore */
  }
}

/**
 * Helper to emit a new message from a `messages` Row.
 */
export function emitMessage(row: Row<'messages'>) {
  const payload: MessagePayload = {
    id: row.id,
    channel_id: row.channel_id,
    sender_id: row.sender_id,
    content: row.content,
    created_at: row.created_at,
  };
  getMessageHub().emit(row.channel_id, payload);
  safeBroadcast(row.channel_id, payload);
}
