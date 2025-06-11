import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const { origen, destinos } = await req.json();

    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", origen);
    url.searchParams.set("destinations", destinos);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("units", "metric");
    url.searchParams.set("key", Deno.env.get("GOOGLE_MAPS_API_KEY") || "");

    const response = await fetch(url.toString());
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});