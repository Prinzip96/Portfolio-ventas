'use strict';
// Resumen del embudo. Uso: npm run stats [-- días]   (por defecto, últimos 30 días)
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const days = Number(process.argv[2] || 30);
let data = {};
try { data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'stats.json'), 'utf8')); } catch { console.log('Todavía no hay datos.'); process.exit(0); }
const since = new Date(Date.now() - days * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
const EV = ['paso1', 'paso2', 'paso3', 'paso4', 'paso5', 'paso6', 'enviado'];
const tot = {};
for (const [day, byO] of Object.entries(data)) if (day >= since) for (const [o, ev] of Object.entries(byO)) { tot[o] = tot[o] || {}; for (const e of EV) tot[o][e] = (tot[o][e] || 0) + (ev[e] || 0); }
const all = {}; for (const ev of Object.values(tot)) for (const e of EV) all[e] = (all[e] || 0) + ev[e];
const row = (name, ev) => `${name.padEnd(12)} ${EV.map(e => String(ev[e] || 0).padStart(8)).join('')}   ${ev.paso1 ? ((100 * (ev.enviado || 0)) / ev.paso1).toFixed(1) + ' %' : '—'}`;
console.log(`Últimos ${days} días\n${'origen'.padEnd(12)} ${EV.map(e => e.padStart(8)).join('')}   envío/visita`);
for (const [o, ev] of Object.entries(tot).sort((a, b) => b[1].paso1 - a[1].paso1)) console.log(row(o, ev));
console.log(row('TOTAL', all));
