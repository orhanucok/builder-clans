/**
 * Server-Sent Events stream for a single channel.
 *
 * GET /api/chat/[channelId]/events
 *   → text/event-stream
 *   → "data: {...}\n\n" per message
 *
 * The connection stays open until the client disconnects. The client uses
 * `EventSource(...)` in the browser and `new ReadableStream` consumers on
 * the server side.
 */

import { NextRequest } from 'next/server';
import { ensureSeeded, db } from '@/lib/db/store';
import { getMessageHub } from '@/lib/db/store/messaging';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { channelId: string } },
) {
  // Auth via the demo session cookie directly off the request — `cookies()`
  // can be flaky in some Next 14 streaming responses, and the EventSource
  // client doesn't expose custom headers easily.
  await ensureSeeded();
  const { getAuthStore } = await import('@/lib/db/store');
  const auth = getAuthStore();
  const sessionToken = req.cookies.get('bc_demo_session')?.value;
  const userId = req.cookies.get('bc_demo_user')?.value;
  const me = (sessionToken && userId && auth.getById(userId) && auth.getUserBySession(sessionToken)?.id === userId)
    ? { id: userId, email: auth.getById(userId)!.email }
    : null;
  if (!me) {
    return new Response('Not signed in', { status: 401 });
  }
  const channel = db.channels.get(params.channelId);
  if (!channel) {
    return new Response('Channel not found', { status: 404 });
  }

  // Authorize: user must be a member of the project (for project channels)
  // or a member of the trial (for trial channels). Fall through: if we
  // can't decide, allow the connection.
  if (channel.project_id) {
    const member = db.project_members.findOne(
      (m) => (m as { project_id: string }).project_id === channel.project_id
        && (m as { user_id: string }).user_id === me.id
        && (m as { status: string }).status === 'ACTIVE',
    );
    if (!member) {
      // Public project? Allow read.
      const project = db.projects.get(channel.project_id);
      if (!project || project.visibility !== 'PUBLIC') {
        return new Response('Forbidden', { status: 403 });
      }
    }
  }
  if (channel.trial_id) {
    const member = db.trial_members.findOne(
      (m) => (m as { trial_id: string }).trial_id === channel.trial_id
        && (m as { user_id: string }).user_id === me.id,
    );
    if (!member) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const encoder = new TextEncoder();
  const hub = getMessageHub();
  const channelId = channel.id;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      }

      // Greet the client so the connection feels instant
      send('ready', { channelId, at: new Date().toISOString() });

      // Subscribe to new messages
      const unsubscribe = hub.subscribe(channelId, (msg) => {
        send('message', msg);
      });

      // Heartbeat every 25s (some proxies drop idle connections)
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: keep-alive ${Date.now()}\n\n`));
        } catch {
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 25_000);

      // Clean up on close
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      };
      // The ReadableStream cancel callback is the right place, but we also
      // close on process exit; the controller will throw if already closed.
      // Note: Next.js will call .cancel() on disconnect.
      // @ts-expect-error - Node's ReadableStream cancel is optional
      controller.signal?.addEventListener?.('abort', cleanup);
    },
    cancel() {
      // no-op; cleanup happens in start()
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
