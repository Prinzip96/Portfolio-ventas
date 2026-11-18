'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const C = require('./config');
const store = require('./store');
const stats = require('./stats');
const mailer = require('./mailer');
const Br = require('./brief');
const up = require('./upload');
const V = require('./views');

if (C.SMTP_ON && !C.BRIEF_EMAIL) {
  console.error('Falta BRIEF_EMAIL: con SMTP activado hay que decir a qué correo llegan los briefs.');
  process.exit(1);
}
if (C.PROD && C.ADMIN_PASSWORD && C.ADMIN_PASSWORD.length < 12) {
  console.error('ADMIN_PASSWORD es demasiado corta: usa al menos 12 caracteres.');
  process.exit(1);
}

const PUBLIC = path.join(__dirname, '..', 'public');
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' });
  next();
});

const r = express.Router();
const B = C.BASE_PATH;

// Los estáticos se cachean un día: la versión en la URL obliga a pedirlos de nuevo en cada despliegue
const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())).slice(0, 8);

// Página del formulario: el HTML lleva la ruta base, el email de contacto, el plazo y los límites
const indexHtml = () => fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8')
  .replace(/__BASE__/g, B).replace(/__V__/g, VERSION).replace(/__CONTACTO__/g, C.CONTACTO_EMAIL).replace(/__WEB__/g, C.ESTUDIO_WEB)
  .replace(/__PLAZO__/g, C.PLAZO).replace(/__MAX_MB__/g, String(C.MAX_MB)).replace(/__SUBIDA__/g, C.BLOB ? 'blob' : 'form');
let cachedIndex = null;
r.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store').type('html').send(C.PROD ? (cachedIndex = cachedIndex || indexHtml()) : indexHtml());
});
r.get('/index.html', (req, res) => res.redirect(301, B || '/'));
r.use(express.static(PUBLIC, { maxAge: C.PROD ? '1d' : 0, index: false }));
r.use('/admin', require('./admin'));
r.use(express.json({ limit: '64kb' }));

// Límite sencillo por IP: LIMITE_ENVIOS envíos cada 15 minutos (6 por defecto)
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 15 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > C.LIMITE_ENVIOS;
}
setInterval(() => { const now = Date.now(); for (const [ip, l] of hits) if (!l.some(t => now - t < 15 * 60 * 1000)) hits.delete(ip); }, 60000).unref();

// Embudo anónimo: el navegador avisa cuando se llega a cada paso
r.post('/api/paso', (req, res) => {
  const n = Number((req.body || {}).paso);
  if (n >= 1 && n <= 6) stats.hit('paso' + n, (req.body || {}).origen);
  res.status(204).end();
});

// En Vercel las imágenes no caben en la petición (4,5 MB): el navegador las sube directas al Blob privado
// con un permiso de un solo uso que da esta ruta, y luego manda el brief con sus rutas.
const subidas = new Map();
r.post('/api/subida', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!C.BLOB) return res.status(404).json({ error: 'No disponible.' });
  const body = req.body || {};
  if (body.type !== 'blob.generate-client-token') return res.status(400).json({ error: 'Petición no válida.' });
  const now = Date.now();
  const list = (subidas.get(req.ip) || []).filter(t => now - t < 15 * 60 * 1000);
  if (list.length >= C.LIMITE_ENVIOS * C.MAX_ARCHIVOS) return res.status(429).json({ error: 'Demasiadas subidas seguidas. Prueba otra vez en unos minutos.' });
  list.push(now); subidas.set(req.ip, list);
  try {
    const { handleUpload } = require('@vercel/blob/client');
    const out = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async pathname => {
        const m = /^subidas\/[A-Za-z0-9_-]{16}\/(logo|foto)\.(jpg|png|webp|svg)$/.exec(pathname);
        if (!m || (m[2] === 'svg' && m[1] !== 'logo')) throw new Error('Ruta no válida.');
        const tipos = ['image/jpeg', 'image/png', 'image/webp'];
        return { allowedContentTypes: m[1] === 'logo' ? [...tipos, 'image/svg+xml'] : tipos, maximumSizeInBytes: C.MAX_MB * 1048576, addRandomSuffix: true, validUntil: Date.now() + 10 * 60 * 1000 };
      }
    });
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message || 'No se ha podido preparar la subida.' });
  }
});

// Lee las imágenes que el navegador subió a Blob: [{ campo, pathname, original }]
async function leerSubidas(lista) {
  if (!Array.isArray(lista)) return [];
  if (lista.length > C.MAX_ARCHIVOS) throw new up.UploadError(`Como mucho ${C.MAX_ARCHIVOS} imágenes.`, 413);
  const out = [];
  for (const s of lista) {
    const pathname = String((s && s.pathname) || '');
    const campo = s && s.campo === 'logo' ? 'logo' : 'fotos';
    const m = store.SUBIDA.exec(pathname);
    if (!m || (m[1] === 'logo') !== (campo === 'logo')) throw new up.UploadError('Una de las imágenes no ha llegado bien. Vuelve a elegirla.');
    const buf = await store.readSubida(pathname);
    if (!buf) throw new up.UploadError('Una de las imágenes no ha llegado bien. Vuelve a elegirla.');
    const original = String((s && s.original) || '').slice(0, 120);
    if (buf.length > C.MAX_MB * 1048576) throw new up.UploadError(`«${original.slice(0, 60) || 'la imagen'}» pesa más de ${C.MAX_MB} MB.`, 413);
    out.push({ campo, original, buf, clave: pathname });
  }
  return out;
}

// Recepción del brief: datos en «datos» (JSON) + imágenes en «logo» (1) y «fotos» (hasta 4).
// En Vercel llega como JSON con «subidas» (las rutas en Blob) en vez de los archivos.
r.post('/api/briefs', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  let body, files = [];
  const multipart = req.is('multipart/form-data');
  if (multipart) {
    try {
      const parsed = await up.parse(req, { maxFiles: C.MAX_ARCHIVOS, maxBytes: C.MAX_MB * 1048576, campos: ['logo', 'fotos'] });
      body = JSON.parse(parsed.fields.datos || '{}');
      files = parsed.files;
    } catch (e) {
      return res.status(e.status || 400).json({ ok: false, error: e instanceof SyntaxError ? 'Datos no válidos.' : e.message });
    }
  } else body = req.body || {};
  if (body.web) return res.json({ ok: true }); // campo trampa para bots
  if (limited(req.ip)) return res.status(429).json({ ok: false, error: 'Has enviado varias veces seguidas. Prueba otra vez en unos minutos.' });

  const n = Br.normalize(body);
  const errors = Br.validate(n, body.privacidad);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });

  if (!multipart && Array.isArray(body.subidas) && body.subidas.length) {
    if (!C.BLOB) return res.status(400).json({ ok: false, error: 'Envío no válido.' });
    try { files = await leerSubidas(body.subidas); } catch (e) {
      if (e instanceof up.UploadError) return res.status(e.status).json({ ok: false, error: e.message });
      throw e;
    }
  }
  const descartar = async () => { const claves = files.map(f => f.clave).filter(Boolean); if (claves.length) await store.delSubidas(claves).catch(() => {}); };

  const logos = files.filter(f => f.campo === 'logo'), fotos = files.filter(f => f.campo === 'fotos');
  if (logos.length > 1) { await descartar(); return res.status(400).json({ ok: false, error: 'Solo un logo.' }); }
  if (fotos.length > Br.O.MAX_FOTOS) { await descartar(); return res.status(400).json({ ok: false, error: `Como mucho ${Br.O.MAX_FOTOS} fotos.` }); }
  const archivos = [];
  for (const [i, f] of [...logos, ...fotos].entries()) {
    const ext = up.detect(f.buf, { svg: f.campo === 'logo' });
    if (!ext) { await descartar(); return res.status(400).json({ ok: false, error: `«${f.original || 'Un archivo'}» no es una imagen que pueda abrir. Usa JPG, PNG o WebP${f.campo === 'logo' ? ' (o SVG para el logo)' : ''}.` }); }
    const nombre = f.campo === 'logo' ? `logo.${ext}` : `foto-${i + 1 - logos.length}.${ext}`;
    archivos.push({ campo: f.campo === 'logo' ? 'logo' : 'foto', nombre, original: f.original.replace(/[^\p{L}\p{N} ._()-]/gu, '').slice(0, 80), bytes: f.buf.length, ...(f.clave ? { clave: f.clave } : {}), buf: f.buf });
  }

  const ahora = new Date().toISOString();
  const brief = {
    id: store.newId(), creado: ahora, origen: stats.origen(body.origen), estado: 'nuevo', historial: [{ estado: 'nuevo', fecha: ahora }], notas: '',
    ...n,
    archivos: archivos.map(({ buf, ...a }) => a),
    privacidad: { aceptada: true, fecha: ahora },
    publicado: null
  };
  try {
    await store.saveBrief(brief, archivos);
  } catch (e) {
    console.error('[brief] error al guardar', e.message);
    return res.status(500).json({ ok: false, error: 'No he podido guardar tu encargo. Inténtalo otra vez.' });
  }
  stats.hit('enviado', brief.origen);
  await mailer.sendBrief(brief, Object.fromEntries(archivos.map(a => [a.nombre, a.buf])));
  res.json({ ok: true });
});

// Boceto hecho a mano y publicado desde el panel
r.get('/b/:token', async (req, res) => {
  const b = await store.findByToken(req.params.token);
  res.set({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' });
  if (!b) return res.status(404).send(V.notFound('Este boceto no existe', 'Puede que el enlace esté mal copiado o que ya no esté publicado.'));
  res.send(V.boceto(b));
});
r.get('/b/:token/:file', async (req, res) => {
  const b = await store.findByToken(req.params.token);
  const ok = b && [b.publicado.escritorio, b.publicado.movil].includes(req.params.file);
  const buf = ok && (await store.readBoceto(b.id, req.params.file));
  if (!buf) return res.status(404).end();
  // El HTML del boceto va aislado: no puede leer nada del resto del sitio ni del panel
  res.set({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Security-Policy': 'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox' });
  res.type(store.tipo(req.params.file)).send(buf);
});

r.get('/privacidad', (req, res) => res.send(V.privacidad()));

// Bandeja de pruebas: solo en local (sin SMTP y fuera de producción). Nunca se publica.
if (!C.SMTP_ON && !C.PROD) {
  r.get('/bandeja', async (req, res) => res.set('Cache-Control', 'no-store').send(V.bandeja(await store.listMail())));
  r.get('/bandeja/:id', async (req, res) => {
    const m = await store.getMail(req.params.id);
    if (!m) return res.status(404).send(V.notFound('Este email no existe', ''));
    res.set('Cache-Control', 'no-store').send(V.mail(m));
  });
  r.get('/bandeja/:id/adjunto/:file', async (req, res) => {
    const m = await store.getMail(req.params.id);
    const buf = m && m.attachments.some(a => a.filename === req.params.file) && (await store.readArchivo(await store.getBrief(m.brief), req.params.file));
    if (!buf) return res.status(404).end();
    res.set({ 'Cache-Control': 'no-store', 'Content-Security-Policy': 'sandbox' }).type(store.tipo(req.params.file)).send(buf);
  });
}
r.get('/salud', (req, res) => res.json({ ok: true }));

app.use(B || '/', r);
if (B) app.get('/', (req, res) => res.redirect(302, B));
app.use((req, res) => res.status(404).send(V.notFound('Esta página no existe', '')));
app.use((err, req, res, next) => { console.error('[error]', err.message); res.status(err.status || 500).type('text').send(err.status === 413 ? 'Demasiado grande.' : 'Algo ha fallado.'); });

if (require.main === module) {
  app.listen(C.PORT, () => {
    console.log(`Formulario de bocetos en marcha: http://localhost:${C.PORT}${B}  (emails ${C.SMTP_ON ? 'por SMTP' : C.PROD ? 'sin SMTP: no salen' : `en modo prueba → http://localhost:${C.PORT}${B}/bandeja`})`);
    console.log(C.ADMIN_PASSWORD ? `Panel: http://localhost:${C.PORT}${B}/admin/briefs` : 'Aviso: falta ADMIN_PASSWORD, el panel /admin está apagado.');
    if (C.PROD && !C.SMTP_ON) console.log('Aviso: en producción sin SMTP los avisos no salen (se guardan en DATA_DIR/bandeja) y la bandeja web está apagada.');
    if (!C.BRIEF_EMAIL) console.log('Aviso: falta BRIEF_EMAIL (a dónde llegan los briefs). En modo prueba se usa un destinatario de ejemplo.');
    console.log(`Correo «tengo tu encargo» al cliente: ${C.ACUSE_CLIENTE ? 'encendido' : 'apagado'} (ACUSE_CLIENTE).`);
  });
}
module.exports = app;
