/**
 * One-time OAuth2 authorization server for Whoop.
 *
 * Run this once: `bun packages/shared/src/whoop/auth-server.ts`
 * Opens browser -> user authorizes -> captures refresh token -> stores in 1Password.
 */

import { execSync } from "child_process";

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const REDIRECT_URI = "http://localhost:3000/callback";
const SCOPES =
  "read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement offline";

function getCredentials() {
  const clientId = execSync(
    "op read 'op://development/WHOOP Developer API/Client ID'",
    { encoding: "utf-8" },
  ).trim();
  const clientSecret = execSync(
    "op read 'op://development/WHOOP Developer API/credential'",
    { encoding: "utf-8" },
  ).trim();
  return { clientId, clientSecret };
}

async function main() {
  const { clientId, clientSecret } = getCredentials();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    state: crypto.randomUUID(),
  });

  const authUrl = `${WHOOP_AUTH_URL}?${params}`;
  console.log("\nOpening browser for Whoop authorization...\n");
  console.log(`If browser doesn't open, visit:\n${authUrl}\n`);
  execSync(`open "${authUrl}"`);

  const server = Bun.serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname !== "/callback") {
        return new Response("Not found", { status: 404 });
      }

      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing authorization code", { status: 400 });
      }

      const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        console.error("Token exchange failed:", err);
        return new Response(`Token exchange failed: ${err}`, { status: 500 });
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      console.log("Got access token!");
      console.log(`  Access token expires in: ${tokens.expires_in}s`);
      console.log(`  Refresh token: ${tokens.refresh_token.slice(0, 10)}...`);

      // Write tokens to temp file for immediate testing
      const tokenData = JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + tokens.expires_in * 1000,
      });
      const { writeFileSync } = await import("fs");
      writeFileSync("/tmp/whoop-tokens.json", tokenData);
      console.log("  Tokens written to /tmp/whoop-tokens.json");

      // Store refresh token in 1Password
      try {
        execSync(
          `op item edit "WHOOP Developer API" --vault development 'Refresh Token[concealed]=${tokens.refresh_token}'`,
          { encoding: "utf-8" },
        );
        console.log("Refresh token saved to 1Password");
      } catch {
        console.error(
          "Could not save to 1Password, printing token instead:",
        );
        console.log(`  WHOOP_REFRESH_TOKEN=${tokens.refresh_token}`);
      }

      setTimeout(() => {
        server.stop();
        process.exit(0);
      }, 1000);

      return new Response(
        "<html><body><h1>Whoop authorized!</h1><p>You can close this tab.</p></body></html>",
        { headers: { "Content-Type": "text/html" } },
      );
    },
  });

  console.log(
    `Waiting for callback on http://localhost:3000/callback\n`,
  );
}

if (import.meta.main) {
  main().catch(console.error);
}
