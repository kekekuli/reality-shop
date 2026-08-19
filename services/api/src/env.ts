import { z } from "zod";

// Split by consequence, not convenience: a knob whose wrong value is
// merely wrong gets a default; a secret or an address whose wrong value
// is silently insecure — or quietly points at someone else's system —
// must be supplied.
const schema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  // No fallback on purpose: a default signing key is one that everyone
  // who has read the repo can forge tokens with.
  JWT_SECRET: z.string().min(32),

  // Seconds — the unit both JWT `expiresIn` and a cookie's Max-Age
  // want. Giving the access cookie the access token's own lifetime is
  // what lets the browser drop it on expiry, which is the web client's
  // signal to refresh.
  ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 24 * 60 * 60),

  PORT: z.coerce.number().int().positive().default(7676),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// `FOO=` in a .env file means "unset", not "empty string" — without
// this it would satisfy a required field and skip a default.
const raw = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  throw new Error(
    `Invalid environment:\n${z.prettifyError(parsed.error)}\n` +
      `See services/api/.env.example.`,
  );
}

// Validated at import, and `main.ts` imports it right after
// `dotenv/config` — so a misconfigured service dies at boot with a
// readable message, instead of at whichever request first needs the
// value. Nothing else in the service reads `process.env` directly.
export const env = parsed.data;
