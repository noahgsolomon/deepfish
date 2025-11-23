import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

type ClientSource = "desktop" | "website" | "api";

export const createContext = async (req?: Request) => {
  const headers = req?.headers ?? new Headers();

  // 1️⃣  Desktop / API token auth ------------------------------------
  let userFromToken: typeof users.$inferSelect | null = null;
  let source: ClientSource = "website";

  const authHeader = headers.get("x-api-key") ?? "";
  if (authHeader) {
    const token = authHeader.trim();
    if (token) {
      const row = await db.query.users.findFirst({
        where: eq(users.apiKey, token),
      });
      userFromToken = row ?? null;
      source = "api";
    }
  }

  // 2️⃣  Build context ------------------------------------------------
  return {
    db,
    headers,
    user: userFromToken, // may be null, Clerk fallback happens in middleware
    source,
    req,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
