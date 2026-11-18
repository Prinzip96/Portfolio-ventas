'use strict';
// Correos automáticos. Solo dos, y ninguno lleva boceto:
//  1. Aviso del brief nuevo a BRIEF_EMAIL, con todo el brief y las imágenes adjuntas. Siempre.
//  2. «Tengo tu encargo» al cliente. Solo si ACUSE_CLIENTE=true (apagado por defecto).
// El boceto lo manda Jaime a mano desde su correo cuando da el OK.
const nodemailer = require('nodemailer');
const C = require('./config');
const store = require('./store');
const B = require('./brief');

let transport = null;
const env = process.env;
if (env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: String(env.SMTP_SECURE || '') === 'true' || Number(env.SMTP_PORT) === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });
} else if (env.RESEND_API_KEY) {
  transport = nodemailer.createTransport({ host: 'smtp.resend.com', port: 465, secure: true, auth: { user: 'resend', pass: env.RESEND_API_KEY } });
}
const FROM = env.SMTP_FROM || `"Jaime · ${C.ESTUDIO_NOMBRE}" <${env.SMTP_HOST ? env.SMTP_USER || 'bocetos@localhost' : C.CONTACTO_EMAIL}>`;

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const K = { bg: '#0a0a0a', soft: '#101011', fg: '#f4f2ee', mut: '#8b8b86', line: '#262624', lime: '#bcff4d' };
const SERIF = `'Instrument Serif',Georgia,'Times New Roman',serif`;
const SANS = `Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

function layout(title, body, foot) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(title)}</title></head>
<body style="margin:0;background:${K.bg};font-family:${SANS};color:${K.fg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${K.bg};padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px">
<tr><td style="padding:4px 4px 22px"><a href="${esc(C.ESTUDIO_WEB)}" style="color:${K.fg};text-decoration:none;font-family:${SERIF};font-size:26px;letter-spacing:-.2px">Jaime<sup style="font-size:12px">®</sup></a></td></tr>
<tr><td style="background:${K.soft};border:1px solid ${K.line};border-radius:16px;padding:32px 28px 12px;font-size:16px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:20px 4px 8px;font-size:12px;line-height:1.6;color:${K.mut}">${foot}</td></tr>
</table></td></tr></table></body></html>`;
}
const tag = t => `<p style="margin:0 0 10px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${K.lime}">${esc(t)}</p>`;
const h = html => `<p style="margin:0 0 14px;font-family:${SERIF};font-size:34px;line-height:1.08;letter-spacing:-.3px;color:${K.fg}">${html}</p>`;
const em = t => `<em style="font-style:italic;color:${K.lime}">${esc(t)}</em>`;
const p = html => `<p style="margin:0 0 16px;color:${K.mut}">${html}</p>`;
const btn = (href, label) => `<p style="margin:22px 0 22px"><a href="${esc(href)}" style="display:inline-block;background:${K.lime};color:#0a0a0a;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:600;font-size:15px">${esc(label)} &rarr;</a></p>`;
function table(title, rows) {
  return `<p style="margin:26px 0 0;font-family:${SERIF};font-size:22px;color:${K.fg}">${esc(title)}</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 6px;border-top:1px solid ${K.line}">${rows.map(([k, v]) =>
    `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid ${K.line};color:${K.mut};width:130px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;vertical-align:top">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid ${K.line};color:${K.fg};font-size:15px">${v}</td></tr>`).join('')}</table>`;
}
const dot = x => `<span style="display:inline-block;width:14px;height:14px;border-radius:7px;background:${esc(x)};border:1px solid #3a3a37;vertical-align:-2px;margin-right:6px"></span>`;
const ORIGENES = { bio: 'Bio de Instagram', reel: 'Reel', historia: 'Historia de Instagram', dm: 'Mensaje directo', web: 'La web', directo: 'Directo (sin origen)' };
const origenLabel = o => ORIGENES[o] || o;
const fecha = iso => new Date(iso).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'long', timeStyle: 'short' });

// bufs: { nombre: Buffer } con las imágenes que acaba de subir el cliente
function adjuntos(b, bufs) {
  return b.archivos.filter(a => bufs && bufs[a.nombre]).map((a, i) => ({ filename: a.nombre, content: bufs[a.nombre], cid: a.nombre.endsWith('.svg') ? undefined : `img${i}@brief`, nombre: a.nombre }));
}

function aviso(b, bufs) {
  const k = b.contacto, admin = `${C.BASE_URL}/admin/briefs/${b.id}`;
  const tel = k.telefono ? k.telefono.replace(/[^\d+]/g, '') : '';
  const wa = tel ? (tel.startsWith('+') ? tel.slice(1) : tel.length === 9 ? '34' + tel : tel) : '';
  const a = `color:${K.fg}`;
  const atts = adjuntos(b, bufs);
  const val = (lab, v) => {
    if (lab === 'Colores') return `${dot(b.estilo.colores.principal)}${dot(b.estilo.colores.acento)} ${esc(v)}`;
    if (lab === 'Correo') return `<a href="mailto:${esc(v)}" style="${a}">${esc(v)}</a>`;
    if (lab === 'Teléfono' && tel) return `<a href="tel:${esc(tel)}" style="${a}">${esc(v)}</a> · <a href="https://wa.me/${esc(wa)}" style="color:${K.lime}">WhatsApp</a>`;
    if (lab === 'Instagram o web' && B.enlaceHref(v)) return `<a href="${esc(B.enlaceHref(v))}" style="color:${K.lime}">${esc(v)}</a>`;
    return esc(v).replace(/\n/g, '<br>');
  };
  const thumbs = atts.length
    ? `<p style="margin:26px 0 8px;font-family:${SERIF};font-size:22px;color:${K.fg}">Logo y fotos (${atts.length})</p>` + atts.map(x => (x.cid
      ? `<img src="cid:${x.cid}" alt="${esc(x.nombre)}" width="180" style="display:inline-block;width:180px;max-width:46%;height:auto;margin:0 8px 8px 0;border-radius:10px;border:1px solid ${K.line};vertical-align:top">`
      : `<span style="display:inline-block;margin:0 8px 8px 0;padding:8px 12px;border:1px solid ${K.line};border-radius:10px;color:${K.fg};font-size:13px">${esc(x.nombre)} (adjunto)</span>`)).join('')
    : p('No ha subido logo ni fotos.');
  return {
    to: C.BRIEF_EMAIL || 'BRIEF_EMAIL-sin-configurar@example.invalid',
    replyTo: k.email,
    subject: `Nuevo brief: ${b.negocio.nombre} · ${B.tipoLabel(b)} · ${b.negocio.ciudad}`,
    html: layout('Nuevo brief', `${tag('Nuevo brief · ' + origenLabel(b.origen))}${h(`${esc(k.nombre)} quiere ${em(B.tipoLabel(b).toLowerCase())}`)}
${p(`Para <span style="color:${K.fg}">${esc(b.negocio.nombre)}</span>, en ${esc(b.negocio.ciudad)}. Le he dicho que tendrá su boceto ${esc(C.PLAZO)}. El boceto no sale hasta que Jaime dé el OK.`)}
${btn(admin, 'Abrir en el panel')}
${B.secciones(b).map(([t, rows]) => table(t, rows.map(([l, v]) => [l, val(l, v)]))).join('')}
${table('Origen', [['Origen', esc(origenLabel(b.origen))], ['Recibido', esc(fecha(b.creado)) + ' (hora de Madrid)']])}
${thumbs}`, `Brief ${esc(b.id)} · Privacidad aceptada el ${esc(fecha(b.privacidad.fecha))}. Si contestas a este correo, le escribes al cliente: mejor que lo haga Jaime.`),
    text: `Nuevo brief de ${k.nombre} (${origenLabel(b.origen)})\nPanel: ${admin}\n\n${B.texto(b)}\n\nArchivos: ${b.archivos.map(x => x.nombre).join(', ') || 'ninguno'}`,
    attachments: atts.map(x => ({ filename: x.filename, content: x.content, cid: x.cid }))
  };
}

function acuse(b) {
  const first = b.contacto.nombre.split(' ')[0];
  const web = C.ESTUDIO_WEB.replace(/^https?:\/\/(www\.)?/, '');
  return {
    to: b.contacto.email,
    replyTo: C.CONTACTO_EMAIL,
    subject: `Tengo tu encargo para ${b.negocio.nombre}`,
    html: layout('Tengo tu encargo', `${tag('Recibido')}${h(`Hola, ${esc(first)}. Ya tengo tu ${em('encargo')}.`)}
${p(`Me ha llegado todo lo que me has contado sobre <span style="color:${K.fg}">${esc(b.negocio.nombre)}</span>${b.archivos.length ? ', con tus imágenes' : ''}. Te preparo el boceto a mano y te lo mando ${esc(C.PLAZO)}.`)}
${p('Si se te ocurre algo más, contesta a este correo y lo tengo en cuenta.')}
<p style="margin:0 0 20px;font-family:${SERIF};font-size:22px;color:${K.fg}">— Jaime</p>`,
    `Te escribo porque has pedido un boceto en ${esc(web)}. ${esc(C.ESTUDIO_TITULAR)} · ${esc(C.ESTUDIO_NOMBRE)} · Málaga. Si quieres que borre tus datos, contesta a este correo. <a href="${esc(C.BASE_URL)}/privacidad" style="color:${K.mut}">Privacidad</a>.`),
    text: `Hola, ${first}. Ya tengo tu encargo.\n\nMe ha llegado todo lo que me has contado sobre ${b.negocio.nombre}. Te preparo el boceto a mano y te lo mando ${C.PLAZO}.\n\nSi se te ocurre algo más, contesta a este correo.\n\n— Jaime\n${C.ESTUDIO_NOMBRE} · ${web}`,
    attachments: []
  };
}

async function deliver(kind, b, m) {
  if (!transport) {
    await store.saveMail({ kind, brief: b.id, from: FROM, to: m.to, replyTo: m.replyTo, subject: m.subject, html: m.html, text: m.text, attachments: m.attachments.map(a => ({ filename: a.filename, cid: a.cid })) });
    console.log(`[email · modo prueba] → ${m.to} | ${m.subject}`);
    return { kind, ok: true, test: true };
  }
  try {
    await transport.sendMail({ from: FROM, ...m });
    return { kind, ok: true };
  } catch (e) {
    console.error(`[email] error enviando ${kind}:`, e.message);
    return { kind, ok: false, error: e.message };
  }
}

async function sendBrief(b, bufs) {
  const out = [await deliver('aviso', b, aviso(b, bufs))];
  if (C.ACUSE_CLIENTE) out.push(await deliver('acuse', b, acuse(b)));
  return out;
}

module.exports = { sendBrief, aviso, acuse, origenLabel, ORIGENES };
