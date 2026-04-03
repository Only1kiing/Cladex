import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// Active SSE connections per user
const connections = new Map<string, Set<Response>>();

/**
 * Push an event to all connected clients for a user.
 * Call this from anywhere in the backend:
 *   import { pushEvent } from "./routes/events";
 *   pushEvent(userId, "trade", { symbol: "BTC/USDT", ... });
 */
export function pushEvent(userId: string, event: string, data: unknown): void {
  const userConns = connections.get(userId);
  if (!userConns || userConns.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of userConns) {
    try {
      res.write(payload);
    } catch {
      userConns.delete(res);
    }
  }
}

/**
 * Broadcast to all connected users (for system-wide events).
 */
export function broadcastEvent(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const [, userConns] of connections) {
    for (const res of userConns) {
      try {
        res.write(payload);
      } catch {
        userConns.delete(res);
      }
    }
  }
}

// GET /api/events/stream — SSE endpoint
router.get("/stream", (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // nginx support
  });

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  // Register connection
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(res);

  // Heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    const userConns = connections.get(userId);
    if (userConns) {
      userConns.delete(res);
      if (userConns.size === 0) connections.delete(userId);
    }
  });
});

export default router;
