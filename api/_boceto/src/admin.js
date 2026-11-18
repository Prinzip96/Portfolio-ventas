'use strict';
// Panel privado: /admin/briefs. Contraseña en ADMIN_PASSWORD (autenticación HTTP Basic; el usuario da igual).
const crypto = require('crypto');
const path = require('path');
const express = require('express');
const C = require('./config');
const store = require('./store');
const Br = require('./brief');
const V = require('./views');
const up = require('./upload');
const zip = require('./zip');

const r = express.Router();
const A = `${C.BASE_PATH}/admin`;
const csrf = C.ADMIN_PASSWORD ? crypto.createHmac('sha256', C.ADMIN_PASSWORD).update('csrf:panel').digest('base64url').slice(0, 32) : '';
const same = (a, b) => { const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };

// Freno a quien prueba contraseñas: 20 fallos cada 15 minutos por IP
const fails = new Map();
setInterval(() => { const now = Date.now(); for (const [ip, l] of fails) if (!l.some(t => now - t < 9e5)) fails.delete(ip); }, 60000).unref();

r.use((req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
  if (!C.ADMIN_PASSWORD) return res.status(503).send(V.adminOff());
  const now = Date.now();
  const list = (fails.get(req.ip) || []).filter(t => now - t < 9e5);
  if (list.length >= 20) return res.status(429).type('text').send('Demasiados intentos. Prueba dentro de un rato.');
  const m = /^Basic ([A-Za-z0-9+/=]+)$/.exec(req.get('authorization') || '');
  const pass = m ? Buffer.from(m[1], 'base64').toString('utf8').replace(/^[^:]*:/, '') : null;
  if (pass !== null && same(pass, C.ADMIN_PASSWORD)) return next();
  if (pass !== null) { list.push(now); fails.set(req.ip, list); }
  res.set('WWW-Authenticate', 'Basic realm="Panel de briefs", charset="UTF-8"').status(401).type('text').send('Hace falta la contraseña del panel.');
});
function checkCsrf(req, res, next) {
  const t = (req.body && req.body.t) || '';
  if (!t || !same(t, csrf)) return res.status(403).type('text').send('Formulario caducado. Vuelve atrás y recarga la página.');
  next();
}
const form = express.urlencoded({ extended: false, limit: '32kb' });
const found = async (req, res) => { const b = await store.getBrief(req.params.id); if (!b) res.status(404).send(V.notFound('Este brief no existe', '')); return b; };
const back = (res, id, msg) => res.redirect(303, `${A}/briefs/${id}${msg ? '?ok=' + encodeURIComponent(msg) : ''}`);

async function filtered(q) {
  const estado = Br.O.ESTADOS.some(e => e[0] === q.estado) ? q.estado : '';
  const term = String(q.q || '').trim().toLowerCase().slice(0, 80);
  const all = await store.listBriefs();
  const counts = { total: all.length };
  for (const b of all) counts[b.estado] = (counts[b.estado] || 0) + 1;
  const list = all.filter(b => (!estado || b.estado === estado) && (!term || [b.negocio.nombre, b.contacto.nombre, b.contacto.email, b.negocio.ciudad].join(' ').toLowerCase().includes(term)));
  return { estado, q: term, counts, list };
}

r.get('/', (req, res) => res.redirect(302, `${A}/briefs`));
r.get('/briefs', async (req, res) => {
  const f = await filtered(req.query);
  res.send(V.adminList(f.list, f));
});
r.get('/briefs/:id', async (req, res) => {
  const b = await found(req, res); if (!b) return;
  res.send(V.adminBrief(b, { csrf, flash: String(req.query.ok || '').slice(0, 120) }));
});
r.get('/briefs/:id/archivos/:file', async (req, res) => {
  const buf = await store.readArchivo(await store.getBrief(req.params.id), req.params.file);
  if (!buf) return res.status(404).end();
  res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  if (req.query.descargar) res.attachment(req.params.file);
  res.type(store.tipo(req.params.file)).send(buf);
});
r.post('/briefs/:id/estado', form, checkCsrf, async (req, res) => {
  const e = String(req.body.estado || '');
  if (!Br.O.ESTADOS.some(x => x[0] === e)) return res.status(400).type('text').send('Estado no válido.');
  const b = await store.updateBrief(req.params.id, b => { if (b.estado !== e) { b.estado = e; b.historial.push({ estado: e, fecha: new Date().toISOString() }); } });
  if (!b) return res.status(404).end();
  back(res, b.id, `Estado: ${Br.estadoLabel(e)}`);
});
r.post('/briefs/:id/notas', form, checkCsrf, async (req, res) => {
  const b = await store.updateBrief(req.params.id, b => { b.notas = String(req.body.notas || '').slice(0, 4000); });
  if (!b) return res.status(404).end();
  back(res, b.id, 'Notas guardadas');
});

// Publicar el boceto hecho a mano: una imagen (escritorio y, si se quiere, móvil) o un HTML de un solo archivo.
// En Vercel una petición no puede pasar de 4,5 MB en total, así que ahí el límite es más bajo.
const MAX_BOCETO_MB = C.BLOB ? 4 : 20;
r.post('/briefs/:id/boceto', async (req, res) => {
  const actual = await store.getBrief(req.params.id);
  if (!actual) return res.status(404).end();
  let parsed;
  try { parsed = await up.parse(req, { maxFiles: 2, maxBytes: MAX_BOCETO_MB * 1048576, campos: ['escritorio', 'movil'] }); } catch (e) { return res.status(e.status || 400).type('text').send(e.message); }
  if (!parsed.fields.t || !same(parsed.fields.t, csrf)) return res.status(403).type('text').send('Formulario caducado. Vuelve atrás y recarga la página.');
  const files = [];
  let tipo = 'imagen';
  for (const campo of ['escritorio', 'movil']) {
    const f = parsed.files.find(x => x.campo === campo);
    if (!f) continue;
    const ext = up.detect(f.buf, { html: campo === 'escritorio' });
    if (!ext || ext === 'gif') return res.status(400).type('text').send(`«${f.original}» no vale: tiene que ser PNG, JPG, WebP o HTML.`);
    if (ext === 'html') tipo = 'html';
    files.push({ campo, nombre: `${campo}.${ext}`, buf: f.buf });
  }
  if (!files.some(f => f.campo === 'escritorio')) return res.status(400).type('text').send('Falta el archivo de escritorio.');
  const keep = tipo === 'html' ? files.filter(f => f.campo === 'escritorio') : files;
  await store.saveBoceto(actual, keep);
  const b = await store.updateBrief(req.params.id, b => {
    b.publicado = { token: (b.publicado && b.publicado.token) || store.newToken(), tipo, escritorio: keep[0].nombre, movil: (keep.find(f => f.campo === 'movil') || {}).nombre || null, fecha: new Date().toISOString() };
    if (b.estado === 'nuevo') { b.estado = 'en-curso'; b.historial.push({ estado: 'en-curso', fecha: new Date().toISOString() }); }
  });
  await store.setToken(b.publicado.token, b.id);
  back(res, b.id, 'Boceto publicado. Revisa el enlace antes de mandarlo.');
});
r.post('/briefs/:id/boceto/quitar', form, checkCsrf, async (req, res) => {
  await store.removeBoceto(await store.getBrief(req.params.id));
  const b = await store.updateBrief(req.params.id, b => { b.publicado = null; });
  if (!b) return res.status(404).end();
  back(res, b.id, 'Boceto despublicado: el enlace ya no funciona.');
});

// Exportación
const urlArchivo = (b, a) => `${C.BASE_URL}/admin/briefs/${b.id}/archivos/${a.nombre}`;
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'brief';
const carpeta = b => `${b.creado.slice(0, 10)}-${slug(b.negocio.nombre)}-${b.id}`;
const exportable = b => ({ ...b, archivos: b.archivos.map(a => ({ ...a, url: urlArchivo(b, a) })), boceto_url: b.publicado ? `${C.BASE_URL}/b/${b.publicado.token}` : null });
async function entries(b) {
  const dir = carpeta(b);
  const out = [{ name: `${dir}/brief.json`, data: JSON.stringify(exportable(b), null, 2) }, { name: `${dir}/brief.txt`, data: Br.texto(b) + (b.notas ? `\n\nNOTAS\n${b.notas}` : '') }];
  for (const a of b.archivos) { const buf = await store.readArchivo(b, a.nombre); if (buf) out.push({ name: `${dir}/archivos/${a.nombre}`, data: buf }); }
  if (b.publicado) for (const n of [b.publicado.escritorio, b.publicado.movil].filter(Boolean)) { const buf = await store.readBoceto(b.id, n); if (buf) out.push({ name: `${dir}/boceto/${n}`, data: buf }); }
  return out;
}
const stamp = () => new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' }).replace(/[: ]/g, '-').slice(0, 16);
r.get('/export.json', async (req, res) => {
  const f = await filtered(req.query);
  res.set('Content-Disposition', `attachment; filename="briefs-${stamp()}.json"`).json({ exportado: new Date().toISOString(), total: f.list.length, briefs: f.list.map(exportable) });
});
r.get('/export.zip', async (req, res) => {
  const list = (await filtered(req.query)).list;
  const all = [];
  for (const b of list) all.push(...(await entries(b)));
  zip.send(res, `briefs-${stamp()}.zip`, all);
});
r.get('/briefs/:id/zip', async (req, res) => { const b = await found(req, res); if (b) zip.send(res, `${carpeta(b)}.zip`, await entries(b)); });
r.get('/briefs/:id/json', async (req, res) => { const b = await found(req, res); if (b) res.json(exportable(b)); });

module.exports = r;
