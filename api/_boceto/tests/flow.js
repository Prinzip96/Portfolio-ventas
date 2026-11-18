'use strict';
// Prueba de punta a punta con navegador: los 6 pasos del brief (con logo y fotos), la recepción,
// el aviso por correo, el panel privado (estado, publicar boceto, exportar) y la página del boceto publicado.
// Genera capturas en shots/ y el vídeo demo.mp4. Uso: npm test  (la primera vez: npx playwright install chromium)
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const FX = path.join(__dirname, 'fixtures');
const DATA = fs.mkdtempSync('/tmp/boceto-test-');
const VID = fs.mkdtempSync('/tmp/boceto-video-');
const TMP = fs.mkdtempSync('/tmp/boceto-tmp-');
const PORT = 3411, BASE_PATH = '/boceto', BASE = `http://localhost:${PORT}${BASE_PATH}`; // tal y como irá en www.estudiojota.es/boceto
const BRIEF_EMAIL = 'bandeja-de-briefs@ejemplo.test'; // marcador: en producción va en BRIEF_EMAIL
const PASS = 'clave-de-prueba-del-panel';
const AUTH = 'Basic ' + Buffer.from('jaime:' + PASS).toString('base64');
fs.mkdirSync(SHOTS, { recursive: true });
for (const f of fs.readdirSync(SHOTS)) if (!f.startsWith('00')) fs.unlinkSync(path.join(SHOTS, f));

const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
function watch(page, label) {
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(`[${label}] console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`[${label}] ${e.message}`));
  page.on('response', r => { if (r.url().includes('/api/briefs')) r.text().then(t => console.log('  API', r.status(), t.slice(0, 160))).catch(() => {}); if (r.status() >= 400 && !r.url().includes('/api/')) problems.push(`[${label}] HTTP ${r.status()} ${r.url()}`); });
}
async function shot(page, name, opts) {
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (ov > 0) problems.push(`[${name}] desborda ${ov}px en horizontal`);
  await page.screenshot({ path: path.join(SHOTS, name), ...(opts || {}) });
  console.log('  captura', name);
}
async function type(page, sel, text, delay) { await page.locator(sel).pressSequentially(text, { delay: delay || 45 }); }
function start(port, extra) {
  const p = spawn(process.execPath, ['src/server.js'], { cwd: ROOT, env: { ...process.env, PORT: port, BASE_PATH, DATA_DIR: extra.DATA_DIR || DATA, BRIEF_EMAIL, ADMIN_PASSWORD: PASS, SMTP_HOST: '', NODE_ENV: 'development', MAX_MB: '2', LIMITE_ENVIOS: '50', ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
  p.log = ''; p.stdout.on('data', d => (p.log += d)); p.stderr.on('data', d => (p.log += d));
  return p;
}
async function ready(p) { for (let i = 0; i < 60 && !p.log.includes('en marcha'); i++) await wait(100); assert(p.log.includes('en marcha'), 'El servidor no arranca:\n' + p.log); }
const DATOS = (extra) => JSON.stringify({ brief: { tipo: 'wordpress', nombre: 'Prueba', ciudad: 'Málaga' }, contacto: { nombre: 'Ana', email: 'ana@example.com' }, privacidad: true, ...(extra || {}) });
function form(datos, files) {
  const fd = new FormData();
  fd.append('datos', datos);
  for (const [campo, name, buf] of files || []) fd.append(campo, new Blob([buf]), name);
  return fd;
}
const fx = n => fs.readFileSync(path.join(FX, n));

(async () => {
  const server = start(PORT, {});
  await ready(server);
  const browser = await chromium.launch();
  try {
    // ---------- API: validaciones ----------
    const post = fd => fetch(BASE + '/api/briefs', { method: 'POST', body: fd });
    let r = await post(form(DATOS({ privacidad: false })));
    assert.strictEqual(r.status, 400, 'Sin aceptar privacidad debe fallar'); assert((await r.json()).errors.privacidad);
    r = await post(form(DATOS({ contacto: { nombre: 'Ana', email: 'no-es-email' } })));
    assert.strictEqual(r.status, 400); assert((await r.json()).errors.email);
    r = await post(form(JSON.stringify({ brief: { nombre: 'X' }, contacto: { nombre: 'Ana', email: 'a@b.es' }, privacidad: true })));
    assert((await r.json()).errors.ciudad, 'La ciudad es obligatoria');
    r = await post(form(DATOS({ web: 'http://spam' })));
    assert.deepStrictEqual(await r.json(), { ok: true }, 'El campo trampa responde ok sin guardar');
    r = await post(form(DATOS(), [['fotos', 'foto.jpg', fx('no-es-imagen.jpg')]]));
    assert.strictEqual(r.status, 400); assert(/no es una imagen/.test((await r.json()).error), 'Debe rechazar archivos que no son imagen');
    r = await post(form(DATOS(), [['fotos', 'logo.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')]]));
    assert.strictEqual(r.status, 400, 'SVG solo vale como logo');
    r = await post(form(DATOS(), [['fotos', 'grande.jpg', Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(2.2 * 1048576)])]]));
    assert.strictEqual(r.status, 413, 'Debe rechazar imágenes de más de MAX_MB'); assert(/pesa más de 2 MB/.test((await r.json()).error));
    r = await post(form(DATOS(), Array.from({ length: 6 }, (_, i) => ['fotos', `f${i}.jpg`, fx('barra.jpg')])));
    assert.strictEqual(r.status, 413, 'Más de 5 imágenes debe fallar');
    r = await post(form(DATOS(), Array.from({ length: 5 }, (_, i) => ['fotos', `f${i}.jpg`, fx('barra.jpg')])));
    assert.strictEqual(r.status, 400, 'Más de 4 fotos debe fallar'); assert(/4 fotos/.test((await r.json()).error));
    assert.strictEqual(fs.readdirSync(path.join(DATA, 'briefs')).length, 0, 'Ningún envío fallido debe guardarse');
    // panel
    assert.strictEqual((await fetch(BASE + '/admin/briefs')).status, 401, 'El panel pide contraseña');
    assert.strictEqual((await fetch(BASE + '/admin/briefs', { headers: { Authorization: 'Basic ' + Buffer.from('x:mala').toString('base64') } })).status, 401);
    assert.strictEqual((await fetch(BASE + '/admin/export.zip')).status, 401, 'La exportación pide contraseña');
    console.log('✓ validaciones de la API y del panel');

    // ---------- Escritorio, con vídeo ----------
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'es-ES', httpCredentials: { username: 'jaime', password: PASS }, recordVideo: { dir: VID, size: { width: 1440, height: 900 } } });
    const page = await ctx.newPage(); watch(page, 'escritorio');
    const t0 = Date.now();
    await page.goto(BASE + '?o=bio'); await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.waitForSelector('#pd svg'); await page.hover('.pick >> nth=0'); await page.evaluate(() => (document.querySelector('#f').scrollTop = 0)); await wait(1500);
    await shot(page, '01-paso1-tipo-escritorio.png');
    await page.click('.pick:has-text("Web a medida")'); await wait(700);
    await page.click('#next'); await wait(400);
    await page.click('#next'); await wait(400); // sin nombre ni ciudad → error
    assert(/nombre de tu negocio/.test(await page.textContent('#err-negocio')) && /Ciudad/.test(await page.textContent('#err-ciudad')), 'El paso 2 pide nombre y ciudad');
    await type(page, '#nombre', 'Marisquería El Varadero', 38); await wait(200);
    await page.click('#chips >> text=Restaurante'); await wait(500);
    await type(page, '#ciudad', 'Málaga', 40);
    await type(page, '#enlace', '@elvaradero', 30); await wait(500);
    await page.click('#next'); await wait(600);
    await page.click('.pal:has-text("Terracota")'); await wait(700);
    await page.click('.card:has-text("Elegante")'); await wait(700);
    await page.locator('#ambiente').scrollIntoViewIfNeeded();
    for (const a of ['Cercano', 'Natural', 'Clásico']) { await page.click(`#ambiente label:has-text("${a}")`); await wait(250); }
    assert(await page.isDisabled('#ambiente input[value="Alegre"]'), 'Como mucho 3 ambientes');
    await type(page, '#referencias', 'Me gusta lo limpio, con fotos grandes del producto.', 12); await wait(400);
    await shot(page, '03-paso3-colores-estilo-escritorio.png');
    // mano: captura de la muestra para usarla luego como «boceto hecho a mano» en el panel
    await page.locator('#pd').screenshot({ path: path.join(TMP, 'boceto-escritorio.png') });
    await page.click('#next'); await wait(500);
    await page.click('.sec:has-text("Opiniones")'); await wait(400);
    await page.click('.sec:has-text("Ubicación")'); await wait(400);
    await page.click('.sec:has-text("Sobre nosotros")'); await wait(400);
    await type(page, '#otras', 'Carta en inglés', 25);
    await page.locator('#objetivos').scrollIntoViewIfNeeded();
    await page.click('#objetivos label:has-text("reserven")'); await wait(250);
    await page.click('#objetivos label:has-text("Google")'); await wait(250);
    await type(page, '#detalle', 'Ahora las reservas llegan solo por teléfono y se pierden muchas.', 10); await wait(400);
    await shot(page, '04-paso4-secciones-objetivo-escritorio.png');
    await page.click('#next'); await wait(500);
    assert.strictEqual(await page.textContent('#nextLabel'), 'Seguir sin imágenes');
    await page.setInputFiles('#logo', path.join(FX, 'logo-varadero.png')); await wait(500);
    await page.setInputFiles('#fotos', [path.join(FX, 'local-terraza.jpg'), path.join(FX, 'plato-arroz.jpg'), path.join(FX, 'barra.jpg')]); await wait(500);
    await page.setInputFiles('#fotos', path.join(FX, 'no-es-imagen.jpg')); await wait(300);
    assert(/no es una imagen/.test(await page.textContent('#err-archivos')), 'El navegador rechaza lo que no es imagen');
    assert.strictEqual((await page.$$('#fotoList li')).length, 3); assert.strictEqual((await page.$$('#logoList li')).length, 1);
    await wait(600);
    await shot(page, '05-paso5-logo-fotos-escritorio.png');
    await page.click('#next'); await wait(500);
    await type(page, '#cnombre', 'Lola Martín', 30);
    await type(page, '#cemail', 'lola@example.com', 20);
    await type(page, '#ctel', '600 000 000', 20);
    await page.click('#send'); await wait(400);
    assert(/Marca la casilla/.test(await page.textContent('#err-privacidad')), 'Debe pedir aceptar la privacidad');
    await page.check('#priv'); await wait(300);
    await shot(page, '06-paso6-datos-escritorio.png');
    await page.click('#send');
    await page.waitForSelector('#done:not([hidden])'); await wait(1500);
    assert(/a mano/.test(await page.textContent('#done .q')) && /24 h/.test(await page.textContent('#done .sum')));
    await shot(page, '07-recibido-escritorio.png');
    console.log(`✓ brief completo en ${(Date.now() - t0) / 1000}s`);

    // el brief está en disco, con sus imágenes
    const ids = fs.readdirSync(path.join(DATA, 'briefs'));
    assert.strictEqual(ids.length, 1);
    const id = ids[0];
    const brief = JSON.parse(fs.readFileSync(path.join(DATA, 'briefs', id, 'brief.json'), 'utf8'));
    assert.strictEqual(brief.estado, 'nuevo'); assert.strictEqual(brief.origen, 'bio');
    assert.strictEqual(brief.proyecto.tipo, 'medida'); assert.strictEqual(brief.negocio.ciudad, 'Málaga'); assert.strictEqual(brief.negocio.enlace, '@elvaradero');
    assert.deepStrictEqual(brief.estilo.ambiente, ['Cercano', 'Natural', 'Clásico']);
    assert.deepStrictEqual(brief.contenido.objetivos, ['reservas', 'google']);
    assert.deepStrictEqual(brief.contenido.secciones, ['servicios', 'sobre', 'reservas', 'galeria', 'opiniones', 'mapa', 'contacto']);
    assert.strictEqual(brief.estilo.colores.principal, '#b4532a');
    assert.deepStrictEqual(brief.archivos.map(a => a.nombre), ['logo.png', 'foto-1.jpg', 'foto-2.jpg', 'foto-3.jpg']);
    for (const a of brief.archivos) assert(fs.readFileSync(path.join(DATA, 'briefs', id, 'archivos', a.nombre)).equals(fx(a.original)), 'Archivo guardado distinto: ' + a.nombre);
    console.log('✓ brief guardado en DATA_DIR con logo y 3 fotos');

    // ---------- Correo: solo el aviso, nada al cliente ----------
    await page.goto(BASE + '/bandeja'); await wait(300);
    const mails = await page.$$eval('.mails a', as => as.map(a => ({ href: a.getAttribute('href'), t: a.textContent })));
    assert.strictEqual(mails.length, 1, 'Solo debe salir el aviso (acuse apagado por defecto)');
    assert(mails[0].t.includes('Para: ' + BRIEF_EMAIL) && mails[0].t.includes('Nuevo brief: Marisquería El Varadero'));
    const aviso = JSON.parse(fs.readFileSync(path.join(DATA, 'bandeja', mails[0].href.split('/').pop() + '.json'), 'utf8'));
    assert.strictEqual(aviso.attachments.length, 4, 'El aviso lleva logo y fotos adjuntos');
    assert.strictEqual(aviso.replyTo, 'lola@example.com');
    for (const s of ['Bio de Instagram', 'Cercano, Natural, Clásico', 'Que me reserven o pidan cita', 'Carta en inglés', 'Me gusta lo limpio', `/admin/briefs/${id}`]) assert(aviso.html.includes(s), 'Falta en el aviso: ' + s);
    assert(!/€|precio|\bIA\b|inteligencia artificial/i.test(aviso.html + aviso.text), 'Sin precios ni IA en los correos');
    await page.goto(`http://localhost:${PORT}` + mails[0].href); await page.waitForLoadState('load'); await wait(900);
    await shot(page, '08-email-aviso-brief.png', { fullPage: true, clip: { x: 0, y: 0, width: 1440, height: 3000 } });
    console.log('✓ aviso con el brief completo y 4 adjuntos; ningún correo al cliente');

    // ---------- Panel ----------
    await page.goto(BASE + '/admin/briefs'); await wait(900);
    assert((await page.textContent('.briefs')).includes('Marisquería El Varadero'));
    await page.hover('.briefs a'); await wait(500);
    await shot(page, '09-admin-lista.png');
    await page.click('.briefs a'); await page.waitForLoadState('load'); await wait(900);
    assert.strictEqual(await page.$$eval('.thumbs img', imgs => imgs.filter(i => i.naturalWidth > 0).length), 4, 'Las 4 imágenes se ven en el panel');
    await shot(page, '10-admin-brief.png', { fullPage: true, clip: { x: 0, y: 0, width: 1440, height: 1500 } });
    await page.click('.estado-btn:has-text("Boceto en curso")'); await page.waitForLoadState('load'); await wait(600);
    assert(/Estado: Boceto en curso/.test(await page.textContent('.flash')));
    await page.locator('.pub').scrollIntoViewIfNeeded(); await wait(400);
    await page.setInputFiles('input[name=escritorio]', path.join(TMP, 'boceto-escritorio.png')); await wait(500);
    await page.click('.up button'); await page.waitForLoadState('load'); await wait(700);
    const link = await page.getAttribute('#pubLink', 'href');
    assert(/\/boceto\/b\/[A-Za-z0-9_-]{16}$/.test(link), 'Enlace del boceto: ' + link);
    const mailto = await page.getAttribute('#prepMail', 'href');
    assert(mailto.startsWith('mailto:lola%40example.com?subject=') && decodeURIComponent(mailto).includes(link), 'El correo preparado lleva el enlace');
    await page.locator('.pub').scrollIntoViewIfNeeded(); await wait(500);
    await shot(page, '10b-admin-brief-boceto-publicado.png');
    await page.click('.estado-btn:has-text("Enviado")'); await page.waitForLoadState('load'); await wait(400);
    const tok = link.split('/').pop();
    await page.goto(`http://localhost:${PORT}${BASE_PATH}/b/${tok}`); await page.waitForLoadState('load'); await wait(1400);
    await shot(page, '11-boceto-publicado.png');
    await ctx.close();
    console.log('✓ panel: estado, boceto publicado en /b/<token> y correo preparado (sin enviar)');

    // exportación y seguridad del panel
    const H = { headers: { Authorization: AUTH } };
    const ex = await (await fetch(BASE + '/admin/export.json', H)).json();
    assert.strictEqual(ex.total, 1); assert.strictEqual(ex.briefs[0].estado, 'enviado'); assert.strictEqual(ex.briefs[0].archivos.length, 4); assert(ex.briefs[0].boceto_url.endsWith(tok));
    assert.deepStrictEqual(ex.briefs[0].historial.map(h => h.estado), ['nuevo', 'en-curso', 'enviado']);
    fs.writeFileSync(path.join(TMP, 'e.zip'), Buffer.from(await (await fetch(BASE + '/admin/export.zip', H)).arrayBuffer()));
    const z = execFileSync('unzip', ['-t', path.join(TMP, 'e.zip')]).toString();
    assert(/No errors/.test(z) && /archivos\/logo\.png/.test(z) && /boceto\/escritorio\.png/.test(z) && /brief\.json/.test(z), 'ZIP: ' + z);
    let rr = await fetch(`${BASE}/admin/briefs/${id}/estado`, { method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'estado=nuevo' });
    assert.strictEqual(rr.status, 403, 'Sin token de formulario no se cambia el estado');
    rr = await fetch(`${BASE}/b/${tok}/escritorio.png`);
    assert.strictEqual(rr.status, 200); assert(/sandbox/.test(rr.headers.get('content-security-policy')));
    assert.strictEqual((await fetch(`${BASE}/b/AAAAAAAAAAAAAAAA`)).status, 404);
    console.log('✓ exportación JSON y ZIP, token de formulario y boceto aislado');

    // ---------- Móvil ----------
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-ES' });
    const mp = await mctx.newPage(); watch(mp, 'móvil');
    await mp.goto(BASE + '/'); await mp.evaluate(() => localStorage.clear()); await mp.reload(); await mp.waitForSelector('#pm svg');
    await mp.click('.pick:has-text("App web")'); await mp.click('#next'); await wait(300);
    await mp.fill('#nombre', 'Clínica Dental Sonrisa'); await mp.click('#chips >> text=Clínica'); await mp.fill('#ciudad', 'Marbella'); await wait(500);
    await mp.evaluate(() => window.scrollTo(0, 0)); await wait(300);
    await shot(mp, '02-paso2-negocio-movil.png');
    await mp.click('#next'); await mp.click('.pal:has-text("Lavanda")'); await mp.click('#ambiente label:has-text("Moderno")');
    await mp.click('#next'); await mp.click('#objetivos label:has-text("Ahorrar")');
    await mp.click('#next'); await wait(300);
    await mp.setInputFiles('#fotos', [path.join(FX, 'barra.jpg')]); await wait(400);
    await mp.evaluate(() => window.scrollTo(0, 0)); await wait(300);
    await shot(mp, '05b-paso5-fotos-movil.png');
    await mp.click('#next'); await wait(300);
    await mp.fill('#cnombre', 'Carmen Ruiz'); await mp.fill('#cemail', 'carmen@example.com'); await mp.check('#priv');
    await mp.click('#send'); await mp.waitForSelector('#done:not([hidden])'); await wait(800);
    await shot(mp, '07b-recibido-movil.png');
    await mctx.close();
    console.log('✓ brief en móvil (app web, 1 foto)');

    // boceto en HTML publicado desde el panel (sin navegador)
    const carmen = fs.readdirSync(path.join(DATA, 'briefs')).find(x => x !== id);
    const html = await (await fetch(`${BASE}/admin/briefs/${carmen}`, H)).text();
    const t = html.match(/name="t" value="([^"]+)"/)[1];
    const fd = new FormData(); fd.append('t', t); fd.append('escritorio', new Blob(['<!doctype html><html><body><h1>Boceto</h1></body></html>']), 'boceto.html');
    rr = await fetch(`${BASE}/admin/briefs/${carmen}/boceto`, { method: 'POST', headers: { Authorization: AUTH }, body: fd, redirect: 'manual' });
    assert.strictEqual(rr.status, 303);
    const cb = JSON.parse(fs.readFileSync(path.join(DATA, 'briefs', carmen, 'brief.json'), 'utf8'));
    assert.strictEqual(cb.publicado.tipo, 'html'); assert.strictEqual(cb.estado, 'en-curso');
    const pg = await (await fetch(`${BASE}/b/${cb.publicado.token}`)).text();
    assert(pg.includes('<iframe class="view-frame"'));
    rr = await fetch(`${BASE}/b/${cb.publicado.token}/escritorio.html`);
    assert(/sandbox allow-scripts/.test(rr.headers.get('content-security-policy')), 'El HTML del boceto va aislado');
    console.log('✓ boceto en HTML publicado y aislado');

    // ---------- Embudo anónimo ----------
    server.kill('SIGTERM'); await wait(600);
    const stats = JSON.parse(fs.readFileSync(path.join(DATA, 'stats.json'), 'utf8'));
    const day = Object.values(stats)[0];
    assert(day.bio && day.bio.paso1 >= 1 && day.bio.paso6 >= 1 && day.bio.enviado === 1, 'Faltan pasos del embudo: ' + JSON.stringify(stats));
    console.log('✓ embudo anónimo registrado:', JSON.stringify(stats));

    // ---------- Acuse al cliente (solo con ACUSE_CLIENTE=true) ----------
    const D2 = fs.mkdtempSync('/tmp/boceto-acuse-');
    const s2 = start(PORT + 1, { DATA_DIR: D2, ACUSE_CLIENTE: 'true' }); await ready(s2);
    r = await fetch(`http://localhost:${PORT + 1}${BASE_PATH}/api/briefs`, { method: 'POST', body: form(DATOS(), [['logo', 'logo.png', fx('logo-varadero.png')]]) });
    assert((await r.json()).ok);
    const m2 = fs.readdirSync(path.join(D2, 'bandeja')).map(f => JSON.parse(fs.readFileSync(path.join(D2, 'bandeja', f), 'utf8')));
    const acuse = m2.find(m => m.kind === 'acuse');
    assert(acuse && acuse.to === 'ana@example.com' && acuse.attachments.length === 0 && !acuse.html.includes('/b/') && /a mano/.test(acuse.text), 'El acuse no lleva boceto');
    s2.kill();
    console.log('✓ acuse «tengo tu encargo» solo con ACUSE_CLIENTE=true, sin boceto');

    // ---------- Vídeo → mp4 ----------
    const webm = fs.readdirSync(VID).find(f => f.endsWith('.webm'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.8', '-i', path.join(VID, webm), '-vf', 'scale=1440:-2,fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', path.join(ROOT, 'demo.mp4')]);
    console.log('✓ vídeo demo.mp4');
  } finally {
    await browser.close();
    server.kill();
  }
  if (problems.length) { console.log('\nAvisos:\n' + problems.join('\n')); process.exitCode = 1; }
  else console.log('\nTodo bien. Sin errores de consola ni desbordes.');
})().catch(e => { console.error(e); process.exit(1); });
