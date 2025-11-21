import { serve } from "https://deno.land/std/http/server.ts";

const jsonHeaders = {
  "Content-Type": "application/json",
};

serve(async (req) => {
  try {
    const body = await req.json();
    const { telefono, nombreUsuario, nombreComercio, fecha, hora } = body;
    if (!telefono || !nombreUsuario || !nombreComercio || !fecha || !hora) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: jsonHeaders });
    }

    const apiKey = Deno.env.get("TELNYX_API_KEY");
    const fromNumber = Deno.env.get("TELNYX_NUMBER");

    if (!apiKey || !fromNumber) {
      return new Response(JSON.stringify({ error: "Missing Telnyx env vars" }), { status: 500, headers: jsonHeaders });
    }

    const text = `Saludos ${nombreUsuario}! Acabas de redimir tu cUPón en ${nombreComercio} hoy ${fecha} a las ${hora}. Gracias por ser parte del Corillo UP aquí EnPeErre.`;

    const resp = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromNumber,
        to: telefono,
        text,
      }),
    });

    const data = await resp.json();
    return new Response(JSON.stringify(data), { status: 200, headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: jsonHeaders });
  }
});
