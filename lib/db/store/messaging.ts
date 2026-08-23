/**
 * In-process pub/sub for chat messages.
 *
 * Master plan: production uses Supabase Realtime / websockets. For the demo,
 * we run a tiny in-memory EventEmitter that fan-outs to all connected
 * SSE clients per channel.
 *
 * Subscribers are per-channel. createMessageAction emits to the channel;
 * the SSE route handler subscribes per request and writes to the stream.
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
      try { fn(msg); } catch { /* swallow listener errors */ }
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

/**
 * Helper to emit a new message from a `messages` Row.
 */
export function emitMessage(row: Row<'messages'>) {
  getMessageHub().emit(row.channel_id, {
    id: row.id,
    channel_id: row.channel_id,
    sender_id: row.sender_id,
    content: row.content,
    created_at: row.created_at,
  });
}
