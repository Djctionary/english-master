import { NextRequest, NextResponse } from "next/server";
import {
  initDatabase,
  getUserByUsername,
  createUser,
  getUserCount,
  getUserById,
} from "@/lib/sentence-store";
import {
  hashPassword,
  verifyPassword,
  setAuthCookie,
  clearAuthCookie,
  getAuthFromCookie,
} from "@/lib/auth";

const MAX_USERS = 100;

// POST /api/auth — { action: "register" | "login" | "logout" }
export async function POST(request: NextRequest) {
  try {
    await initDatabase();

    let body: { action?: string; username?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { action } = body;

    // ── Logout ──
    if (action === "logout") {
      await clearAuthCookie();
      return NextResponse.json({ ok: true });
    }

    // ── Validate inputs ──
    const username = body.username?.trim().toLowerCase();
    const password = body.password;

    if (!username || typeof username !== "string" || username.length < 1) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }
    if (username.length > 30) {
      return NextResponse.json({ error: "Username must be 30 characters or less" }, { status: 400 });
    }
    if (!/^[a-z0-9_-]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, hyphens, and underscores" }, { status: 400 });
    }

    // ── Register ──
    if (action === "register") {
      const count = await getUserCount();
      if (count >= MAX_USERS) {
        return NextResponse.json(
          { error: "Registration closed — all 100 spots have been taken" },
          { status: 403 }
        );
      }

      const existing = await getUserByUsername(username);
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }

      const passwordHash = await hashPassword(password);
      const user = await createUser(username, passwordHash);

      await setAuthCookie({ userId: user.id, username: user.username });
      return NextResponse.json({ user: { id: user.id, username: user.username } }, { status: 201 });
    }

    // ── Login ──
    if (action === "login") {
      const user = await getUserByUsername(username);
      if (!user) {
        return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
      }

      await setAuthCookie({ userId: user.id, username: user.username });
      return NextResponse.json({ user: { id: user.id, username: user.username } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/auth — get current user + stats
export async function GET() {
  try {
    await initDatabase();

    const auth = await getAuthFromCookie();
    const count = await getUserCount();
    if (!auth) {
      return NextResponse.json({ user: null, spotsRemaining: MAX_USERS - count });
    }

    const user = await getUserById(auth.userId);
    if (!user) {
      await clearAuthCookie();
      return NextResponse.json({ user: null, spotsRemaining: MAX_USERS - count });
    }

    return NextResponse.json({
      user: { id: user.id, username: user.username },
      spotsRemaining: MAX_USERS - count,
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
