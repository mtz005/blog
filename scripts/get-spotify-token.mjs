#!/usr/bin/env node
/**
 * One-time script to obtain a Spotify refresh token.
 * Run: node scripts/get-spotify-token.mjs
 * Then copy the printed refresh token into your .env file.
 */

import http from "http";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env manually (no dotenv dependency needed)
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const CLIENT_ID = env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = "http://127.0.0.1:3000/callback";
const SCOPE = "user-read-currently-playing user-read-playback-state";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "ERROR: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env"
  );
  process.exit(1);
}

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPE,
    redirect_uri: REDIRECT_URI,
  });

console.log("\n=== Spotify Refresh Token Setup ===\n");
console.log("1. Open this URL in your browser:\n");
console.log("   " + authUrl);
console.log("\n2. Authorize the app, then wait...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:3000");
  if (url.pathname !== "/callback") {
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.end(`<h1>Error: ${error}</h1>`);
    console.error("Authorization error:", error);
    server.close();
    return;
  }

  if (!code) {
    res.end("<h1>No code received</h1>");
    server.close();
    return;
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await tokenRes.json();

    if (data.error) {
      res.end(`<h1>Token error: ${data.error_description}</h1>`);
      console.error("Token error:", data);
      server.close();
      return;
    }

    res.end(
      "<h1>Success! You can close this tab and check your terminal.</h1>"
    );

    console.log("\n=== SUCCESS ===\n");
    console.log("Add this to your .env file:\n");
    console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`);
    console.log("\n(Access token for immediate testing):");
    console.log(`SPOTIFY_ACCESS_TOKEN=${data.access_token}`);
    console.log("\nDone! You only need to run this script once.\n");
  } catch (err) {
    res.end(`<h1>Fetch error: ${err.message}</h1>`);
    console.error(err);
  } finally {
    server.close();
  }
});

server.listen(3000, "127.0.0.1", () => {
  console.log("Waiting for Spotify callback on http://localhost:3000...\n");
});
