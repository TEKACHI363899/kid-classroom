// supabase/functions/livekit-token/index.ts
// Secure Deno Edge Function to generate LiveKit room connection tokens.
// Deploys to Supabase: supabase functions deploy livekit-token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { roomCode, userId, userName } = await req.json();

    if (!roomCode || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing roomCode or userId parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: "LiveKit server credentials are not configured on Edge Function environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // LiveKit Token Claims
    const payload = {
      iss: apiKey,
      sub: userId,
      nbf: getNumericDate(0),
      exp: getNumericDate(60 * 60 * 2), // Token valid for 2 hours
      video: {
        room: roomCode,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
      metadata: JSON.stringify({ userName }),
    };

    // Sign the JWT Token using API_SECRET key
    const keyBuffer = new TextEncoder().encode(apiSecret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const token = await create({ alg: "HS256", typ: "JWT" }, payload, key);
    const livekitUrl = Deno.env.get("LIVEKIT_URL") || "wss://demo.livekit.cloud";

    return new Response(
      JSON.stringify({ token, livekitUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
