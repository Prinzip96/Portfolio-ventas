'use strict';
// Lectura de formularios con archivos (multipart) con límites, y comprobación de que cada archivo
// es de verdad una imagen mirando sus primeros bytes (no la extensión ni lo que diga el navegador).
const Busboy = require('busboy');

function detect(buf, { svg, html } = {}) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.slice(0, 6).toString('latin1'))) return 'gif';
  const head = buf.slice(0, 2048).toString('utf8').replace(/^\uFEFF/, '').trimStart().toLowerCase();
  if (svg && /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg[\s>]/.test(head)) return 'svg';
  if (html && /^(<!--[\s\S]*?-->\s*)*(<!doctype html|<html[\s>])/.test(head)) return 'html';
  return null;
}

class UploadError extends Error { constructor(msg, status) { super(msg); this.status = status || 400; } }

// Devuelve { fields, files: [{ campo, original, buf }] }
function parse(req, { maxFiles, maxBytes, fieldSize = 64 * 1024, campos }) {
  return new Promise((resolve, reject) => {
    let bb;
    try {
      bb = Busboy({ headers: req.headers, limits: { files: maxFiles, fileSize: maxBytes, fields: 20, fieldSize, parts: maxFiles + 20 } });
    } catch (e) { return reject(new UploadError('Formulario no válido.')); }
    const fields = {}, files = [];
    let error = null;
    bb.on('field', (k, v, info) => { if (info.valueTruncated) error = error || new UploadError('Hay un texto demasiado largo.'); fields[k] = v; });
    bb.on('file', (campo, stream, info) => {
      if (!campos.includes(campo)) { stream.resume(); return; }
      const chunks = [];
      stream.on('data', c => chunks.push(c));
      stream.on('limit', () => { error = error || new UploadError(`«${String(info.filename || 'la imagen').slice(0, 60)}» pesa más de ${Math.round(maxBytes / 1048576)} MB.`, 413); });
      stream.on('close', () => { const buf = Buffer.concat(chunks); if (buf.length) files.push({ campo, original: String(info.filename || '').slice(0, 120), buf }); });
    });
    bb.on('filesLimit', () => { error = error || new UploadError(`Como mucho ${maxFiles} imágenes.`, 413); });
    bb.on('partsLimit', () => { error = error || new UploadError('Formulario demasiado grande.', 413); });
    bb.on('error', () => reject(new UploadError('No se ha podido leer el envío.')));
    bb.on('close', () => (error ? reject(error) : resolve({ fields, files })));
    req.pipe(bb);
  });
}

module.exports = { parse, detect, UploadError };
