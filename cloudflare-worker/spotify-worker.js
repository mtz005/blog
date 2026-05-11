/**
 * Cloudflare Worker — Spotify Now Playing proxy
 *
 * Deploy at: https://dash.cloudflare.com → Workers & Pages → Create Worker
 * Paste this file, then add secrets in Settings → Variables & Secrets:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   SPOTIFY_REFRESH_TOKEN
 *
 * After deploying, copy your worker URL (e.g. https://spotify-proxy.YOUR_NAME.workers.dev)
 * and set VITE_SPOTIFY_WORKER_URL in the blog's .env (or GitHub Pages secrets).
 */

// Simple in-memory token cache (lives for the duration of this isolate)
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const credentials = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: env.SPOTIFY_REFRESH_TOKEN,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Token fetch failed: ${response.status}`, body);
    throw new Error(`Token fetch failed: ${response.status} — ${body}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Expire 60s before the real expiry to be safe
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export default {
  async fetch(request, env) {
    // CORS headers — restrict to your blog's domain in production
    const allowedOrigins = [
      "https://mtz005.github.io",
      "https://mirkea.com",
      "http://localhost:4321",
      "http://localhost:4322",
      "http://127.0.0.1:4321",
      "http://127.0.0.1:4322",
    ];

    const origin = request.headers.get("Origin") || "";
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
        console.error("Missing secrets:", {
          hasClientId: !!env.SPOTIFY_CLIENT_ID,
          hasClientSecret: !!env.SPOTIFY_CLIENT_SECRET,
          hasRefreshToken: !!env.SPOTIFY_REFRESH_TOKEN,
        });
        return new Response(JSON.stringify({
          error: "Missing secrets",
          hasClientId: !!env.SPOTIFY_CLIENT_ID,
          hasClientSecret: !!env.SPOTIFY_CLIENT_SECRET,
          hasRefreshToken: !!env.SPOTIFY_REFRESH_TOKEN,
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const token = await getAccessToken(env);

      const spotifyRes = await fetch(
        "https://api.spotify.com/v1/me/player/currently-playing",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (spotifyRes.status === 204) {
        return new Response(JSON.stringify({ isPlaying: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!spotifyRes.ok) {
        return new Response(JSON.stringify({ error: `Spotify error: ${spotifyRes.status}` }), {
          status: spotifyRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await spotifyRes.json();

      if (data.currently_playing_type !== "track") {
        return new Response(JSON.stringify({ isPlaying: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ isPlaying: true, ...data }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          // Cache for 5s to avoid hammering Spotify if multiple visitors are on the page
          "Cache-Control": "public, max-age=5",
        },
      });
    } catch (err) {
      console.error("Worker error:", err.message);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
