import type { IncomingHttpHeaders } from "node:http";
import { Liveblocks } from "@liveblocks/node";
import type { AccessRole } from "../src/types";
import { verifyGoogleCredential } from "./syncBackend";

interface LiveblocksAuthRequest {
  method: string;
  headers: IncomingHttpHeaders;
  body?: unknown;
}

interface LiveblocksAuthResult {
  status: number;
  body: unknown;
}

interface RequestedUser {
  name?: string;
  email?: string;
  picture?: string;
  role?: AccessRole;
}

const DEFAULT_ROOM = "tavern-cook-book:main";

export function getLiveblocksHealth() {
  return {
    ok: Boolean(liveblocksSecret()),
    configured: Boolean(liveblocksSecret()),
    room: liveblocksRoomId()
  };
}

export async function handleLiveblocksAuthRequest(request: LiveblocksAuthRequest): Promise<LiveblocksAuthResult> {
  if (request.method === "GET") {
    return json(200, getLiveblocksHealth());
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const auth = await verifyGoogleCredential(request.headers);
  if (!auth.ok) {
    return json(auth.status, { error: auth.error });
  }

  if (!liveblocksSecret()) {
    return json(503, {
      error: "Realtime collaboration is not configured. Set LIVEBLOCKS_SECRET_KEY in Vercel.",
      configured: false
    });
  }

  const body = request.body && typeof request.body === "object" ? request.body as Record<string, unknown> : {};
  const room = normalizeRoom(String(body.room || liveblocksRoomId()));
  const requestedUser = normalizeRequestedUser(body.user);

  if (requestedUser.email && requestedUser.email.toLowerCase() !== auth.email) {
    return json(403, { error: "Realtime user email does not match the signed-in Google account." });
  }

  const role = requestedUser.role || "viewer";
  const liveblocks = new Liveblocks({ secret: liveblocksSecret() });
  const session = liveblocks.prepareSession(auth.email, {
    userInfo: {
      name: requestedUser.name || auth.email,
      email: auth.email,
      picture: requestedUser.picture || "",
      role
    }
  });

  session.allow(room, role === "viewer" ? session.READ_ACCESS : session.FULL_ACCESS);
  const result = await session.authorize();
  return json(result.status, JSON.parse(result.body));
}

function normalizeRoom(room: string) {
  const trimmed = room.trim();
  if (!trimmed || trimmed === "undefined") return liveblocksRoomId();
  if (trimmed !== liveblocksRoomId()) return liveblocksRoomId();
  return trimmed;
}

function normalizeRequestedUser(value: unknown): RequestedUser {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const role = raw.role === "admin" || raw.role === "editor" || raw.role === "viewer" ? raw.role : undefined;
  return {
    name: typeof raw.name === "string" ? raw.name : "",
    email: typeof raw.email === "string" ? raw.email : "",
    picture: typeof raw.picture === "string" ? raw.picture : "",
    role
  };
}

function liveblocksSecret() {
  return (process.env.LIVEBLOCKS_SECRET_KEY || "").trim();
}

function liveblocksRoomId() {
  return (process.env.LIVEBLOCKS_ROOM_ID || process.env.VITE_TAVERN_REALTIME_ROOM_ID || DEFAULT_ROOM).trim();
}

function json(status: number, body: unknown): LiveblocksAuthResult {
  return { status, body };
}
