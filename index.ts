

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(
  "jrodrigo.gallegos@gmail.com", 
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const registroNuevo = payload.record;

    if (!registroNuevo || !registroNuevo.area) {
      return new Response(JSON.stringify({ ok: false, motivo: "sin area" }), { status: 400 });
    }

    const { data: suscripciones, error } = await supabaseAdmin
      .from("push_suscripciones")
      .select("id, suscripcion")
      .eq("area", registroNuevo.area);

    if (error) throw error;

    const mensaje = JSON.stringify({
      titulo: `Nuevo registro — ${registroNuevo.area}`,
      cuerpo: `Documento ${registroNuevo.nombre} acaba de registrarse.`
    });

    const resultados = await Promise.allSettled(
      (suscripciones ?? []).map((fila) =>
        webpush.sendNotification(fila.suscripcion, mensaje)
      )
    );

    return new Response(JSON.stringify({ ok: true, enviados: resultados.length }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});