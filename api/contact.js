const { Resend } = require("resend");

const TO = "hola@estudiojota.es";
const FROM = "Estudio Jota <hola@estudiojota.es>";
const MAX = { name: 80, email: 120, message: 2000, field: 120 };
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;

/** @type {Map<string, number[]>} */
const hits = new Map();

function clean(v, max) {
  return String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", "POST, OPTIONS");
    return res.end();
  }
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Método no permitido." });
  }

  const ip = clientIp(req);
  if (tooMany(ip)) {
    return json(res, 429, {
      ok: false,
      error: "Demasiados envíos. Espera un rato e inténtalo de nuevo.",
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return json(res, 400, { ok: false, error: "Datos no válidos." });
    }
  }
  body = body && typeof body === "object" ? body : {};

  // Honeypot: si un bot lo rellena, fingimos éxito
  if (clean(body._gotcha || body.honey, 200)) {
    return json(res, 200, { ok: true });
  }

  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email).toLowerCase();
  const message = clean(body.message, MAX.message);
  const necesito = clean(body.necesito, MAX.field);
  const uso = clean(body.uso, MAX.field);
  const plazos = clean(body.plazos, MAX.field);

  if (name.length < 2) {
    return json(res, 400, { ok: false, error: "Escribe tu nombre." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
    return json(res, 400, { ok: false, error: "Revisa el correo." });
  }
  if (!necesito || !uso || !plazos) {
    return json(res, 400, {
      ok: false,
      error: "Faltan las opciones del cuestionario.",
    });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("Falta RESEND_API_KEY");
    return json(res, 500, {
      ok: false,
      error: "El envío no está configurado. Escríbeme a hola@estudiojota.es.",
    });
  }

  const text = [
    `Nuevo mensaje desde estudiojota.es`,
    ``,
    `Nombre: ${name}`,
    `Correo: ${email}`,
    ``,
    `Necesito: ${necesito}`,
    `Uso: ${uso}`,
    `Plazos: ${plazos}`,
    message ? `\nMás info:\n${message}` : "",
    ``,
    `— Responder a ${email}`,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: FROM,
      to: [TO],
      replyTo: email,
      subject: `Estudio Jota — ${name}: ${necesito}`,
      text,
    });
    if (error) {
      console.error("Resend error:", error);
      return json(res, 502, {
        ok: false,
        error: "No se pudo enviar. Prueba otra vez o escribe a hola@estudiojota.es.",
      });
    }
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error("Contact send failed:", err);
    return json(res, 500, {
      ok: false,
      error: "No se pudo enviar. Prueba otra vez o escribe a hola@estudiojota.es.",
    });
  }
};
