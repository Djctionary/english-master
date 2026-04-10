import { NextRequest } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";

/**
 * Extract the authenticated user ID from the request.
 * First tries the x-user-id header (set by middleware),
 * then falls back to reading the cookie directly.
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
  const headerUserId = request.headers.get("x-user-id");
  if (headerUserId) {
    const id = parseInt(headerUserId, 10);
    if (!isNaN(id)) return id;
  }

  const auth = await getAuthFromCookie();
  return auth?.userId ?? null;
}
