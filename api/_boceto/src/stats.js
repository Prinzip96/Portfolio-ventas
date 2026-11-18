'use strict';
// Recuento anónimo del embudo: cuántas veces se llega a cada paso y cuántos envíos, por día y origen.
// Sin cookies, sin IP, sin datos personales. En local se guarda en DATA_DIR/stats.json.
// En Vercel cada escritura en Blob gasta del cupo mensual, así que solo queda en los logs de la función.
const fs = require('fs');
const path = require('path');
const C = require('./config');
const FILE = path.join(C.DATA_DIR, 'stats.json');
const ORIGEN = /^[a-z0-9_-]{1,24}$/;
function origen(o) { o = String(o || '').toLowerCase(); return ORIGEN.test(o) ? o : 'directo'; }

let hit;
if (C.BLOB) {
  hit = (event, o) => console.log(`[embudo] ${event} · ${origen(o)}`);
} else {
  let data = {};
  try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { data = {}; }
  let dirty = false;
  hit = (event, o) => {
    const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
    const k = origen(o);
    data[day] = data[day] || {};
    data[day][k] = data[day][k] || {};
    data[day][k][event] = (data[day][k][event] || 0) + 1;
    dirty = true;
  };
  const write = () => { fs.mkdirSync(C.DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(data)); };
  setInterval(() => { if (dirty) { dirty = false; try { write(); } catch {} } }, 5000).unref();
  const flush = () => { if (dirty) { dirty = false; try { write(); } catch {} } };
  process.on('exit', flush);
  for (const sig of ['SIGTERM', 'SIGINT']) process.once(sig, () => { flush(); process.exit(0); });
}
module.exports = { hit, origen, FILE };
