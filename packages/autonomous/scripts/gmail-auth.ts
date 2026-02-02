#!/usr/bin/env bun
/**
 * One-time Gmail OAuth setup script
 * Run this once to get the refresh token, then add to .env
 */

import { google } from "googleapis";
import { createInterface } from "readline";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in .env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "http://localhost:3000/oauth2callback" // Redirect URI for desktop apps
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  prompt: "consent", // Force refresh token generation
});

console.log("\n📧 Gmail OAuth Setup\n");
console.log("1. Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n2. Sign in and authorize the app");
console.log("3. You'll be redirected to a page that won't load (that's OK!)");
console.log("4. Copy the 'code' parameter from the URL");
console.log("   Example: http://localhost:3000/oauth2callback?code=4/0ABC...&scope=...");
console.log("   Copy everything after 'code=' until the '&'\n");

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Paste the code here: ", async (code) => {
  rl.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log("\n✅ Success! Add this to your .env:\n");
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\n");

    if (!tokens.refresh_token) {
      console.log("⚠️  No refresh token received. Try revoking app access at:");
      console.log("   https://myaccount.google.com/permissions");
      console.log("   Then run this script again.");
    }
  } catch (err) {
    console.error("\n❌ Error getting tokens:", err);
  }
});
