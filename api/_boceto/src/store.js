'use strict';
// Guardado sin base de datos. En Vercel va a un Blob privado; en local, a DATA_DIR. Mismas claves en los dos:
//   briefs/<id>/brief.json        el brief completo y su estado
//   briefs/<id>/archivos/...      logo y fotos que subió el cliente (en Vercel suben directas a subidas/...)
//   briefs/<id>/boceto/...        el boceto hecho a mano, publicado en /b/<token>
//   tokens/<token>.json           a qué brief apunta cada enlace /b/<token>
//   bandeja/*.json                correos de prueba (solo en local, sin SMTP)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('./config');

const ID = /^[A-Za-z0-9_-]{12}$/;
const TOKEN = /^[A-Za-z0-9_-]{16}$/;
const FILE = /^[a-z0-9-]{1,40}\.(jpg|png|webp|gif|svg|html)$/;
const SUBIDA = /^subidas\/[A-Za-z0-9_-]{16}\/(logo|foto)(-[A-Za-z0-9]+)?\.(jpg|png|webp|svg)$/;
const newId = () => crypto.randomBytes(9).toString('base64url');
const newToken = () => crypto.randomBytes(12).toString('base64url');

const disk = {
  file: key => path.join(C.DATA_DIR, ...key.split('/')),
  async put(key, buf) {
    const f = disk.file(key);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    const tmp = f + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, f);
  },
  async get(key) { try { return fs.readFileSync(disk.file(key)); } catch { return null; } },
  async del(keys) { for (const k of keys) fs.rmSync(disk.file(k), { force: true }); },
  async list(prefix) {
    const out = [];
    const walk = (dir, rel) => {
      let names = [];
      try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const d of names) {
        const k = rel ? `${rel}/${d.name}` : d.name;
        if (d.isDirectory()) walk(path.join(dir, d.name), k); else if (!d.name.endsWith('.tmp')) out.push(k);
      }
    };
    walk(disk.file(prefix.replace(/\/$/, '')), prefix.replace(/\/$/, ''));
    return out;
  }
};

let blobSdk = null;
const sdk = () => (blobSdk = blobSdk || require('@vercel/blob'));
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}
const blob = {
  async put(key, buf, type) {
    await sdk().put(key, buf, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: type, cacheControlMaxAge: 60 });
  },
  async get(key) {
    const r = await sdk().get(key, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return streamToBuffer(r.stream);
  },
  async del(keys) { if (keys.length) await sdk().del(keys); },
  async list(prefix) {
    const out = [];
    let cursor;
    do {
      const r = await sdk().list({ prefix, cursor, limit: 1000 });
      for (const b of r.blobs) out.push(b.pathname);
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    return out;
  }
};
const S = C.BLOB ? blob : disk;

const TIPOS = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', html: 'text/html; charset=utf-8', json: 'application/json' };
const tipo = name => TIPOS[String(name).split('.').pop()] || 'application/octet-stream';
const json = data => Buffer.from(JSON.stringify(data, null, 2));
const k = (id, ...rest) => ['briefs', id, ...rest].join('/');

async function saveBrief(brief, files) {
  for (const f of files) if (!f.clave) await S.put(k(brief.id, 'archivos', f.nombre), f.buf, tipo(f.nombre));
  await S.put(k(brief.id, 'brief.json'), json(brief), TIPOS.json);
}
async function getBrief(id) {
  if (!ID.test(id)) return null;
  const buf = await S.get(k(id, 'brief.json'));
  try { return buf ? JSON.parse(buf.toString('utf8')) : null; } catch { return null; }
}
async function listBriefs() {
  const ids = (await S.list('briefs/')).map(p => p.split('/')).filter(p => p.length === 3 && p[2] === 'brief.json' && ID.test(p[1])).map(p => p[1]);
  const all = await Promise.all(ids.map(getBrief));
  return all.filter(Boolean).sort((a, b) => (a.creado < b.creado ? 1 : -1));
}
async function updateBrief(id, fn) {
  const b = await getBrief(id);
  if (!b) return null;
  fn(b);
  await S.put(k(id, 'brief.json'), json(b), TIPOS.json);
  return b;
}

// Archivo subido por el cliente
async function readArchivo(b, name) {
  if (!b || !FILE.test(name)) return null;
  const a = (b.archivos || []).find(x => x.nombre === name);
  if (!a) return null;
  return S.get(a.clave || k(b.id, 'archivos', name));
}
// Subida directa del navegador a Blob, antes de mandar el brief
async function readSubida(pathname) { return SUBIDA.test(pathname) ? S.get(pathname) : null; }
async function delSubidas(pathnames) { await S.del(pathnames.filter(p => SUBIDA.test(p))); }

// Boceto hecho a mano y publicado
async function saveBoceto(b, files) {
  const viejos = b.publicado ? [b.publicado.escritorio, b.publicado.movil].filter(n => n && !files.some(f => f.nombre === n)) : [];
  for (const f of files) await S.put(k(b.id, 'boceto', f.nombre), f.buf, tipo(f.nombre));
  if (viejos.length) await S.del(viejos.map(n => k(b.id, 'boceto', n)));
}
async function removeBoceto(b) {
  if (!b || !b.publicado) return;
  await S.del([b.publicado.escritorio, b.publicado.movil].filter(Boolean).map(n => k(b.id, 'boceto', n)));
  await S.del([`tokens/${b.publicado.token}.json`]);
}
async function setToken(token, id) { await S.put(`tokens/${token}.json`, json({ id }), TIPOS.json); }
async function findByToken(token) {
  if (!TOKEN.test(token)) return null;
  const buf = await S.get(`tokens/${token}.json`);
  let id = null;
  try { id = buf && JSON.parse(buf.toString('utf8')).id; } catch { id = null; }
  const b = id && (await getBrief(id));
  return b && b.publicado && b.publicado.token === token ? b : null;
}
async function readBoceto(id, name) { return ID.test(id) && FILE.test(name) ? S.get(k(id, 'boceto', name)) : null; }

// Bandeja de pruebas (cuando no hay SMTP)
async function saveMail(m) {
  const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  await S.put(`bandeja/${id}.json`, json({ id, date: new Date().toISOString(), ...m }), TIPOS.json);
  return id;
}
async function getMail(id) {
  if (!/^[a-z0-9]+$/.test(id)) return null;
  const buf = await S.get(`bandeja/${id}.json`);
  try { return buf ? JSON.parse(buf.toString('utf8')) : null; } catch { return null; }
}
async function listMail() {
  const ids = (await S.list('bandeja/')).filter(p => p.endsWith('.json')).map(p => p.split('/').pop().slice(0, -5));
  return (await Promise.all(ids.map(getMail))).filter(Boolean).sort((a, b) => (a.date < b.date ? 1 : -1));
}

module.exports = { ID, TOKEN, SUBIDA, newId, newToken, tipo, saveBrief, getBrief, listBriefs, updateBrief, readArchivo, readSubida, delSubidas, saveBoceto, removeBoceto, setToken, findByToken, readBoceto, saveMail, listMail, getMail };
