/* Formulario de boceto (brief) · lógica de la página */
(function () {
  'use strict';
  const M = window.Mockup, O = window.Opciones;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const KEY = 'creador-boceto:v2';
  const TOTAL = 6;
  const BASE = document.documentElement.dataset.base || '';
  const MAX_MB = Number(document.documentElement.dataset.maxmb || 8);
  const BLOB = document.documentElement.dataset.subida === 'blob';
  const VERSION = document.currentScript ? new URL(document.currentScript.src).search : '';
  const pad = n => String(n).padStart(2, '0');
  const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Origen de la visita (?o=bio, ?o=reel, ?o=dm…). Se guarda en la sesión y viaja con el brief.
  const ORIGEN = (() => {
    const q = new URLSearchParams(location.search);
    const o = (q.get('o') || q.get('utm_source') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
    try { if (o) sessionStorage.setItem('boceto:o', o); return o || sessionStorage.getItem('boceto:o') || ''; } catch (e) { return o; }
  })();
  const NOTES = { 1: 'tus colores, aquí ↓', 2: 'tu nombre, arriba ↓', 3: '← así, más o menos', 4: 'tus secciones ↓', 5: 'tus fotos, en el boceto final', 6: 'el de verdad lo hago a mano' };

  const DEF = { tipo: 'wordpress', nombre: '', sector: '', ciudad: '', enlace: '', paleta: 'mar', colores: { principal: '#0f4c5c', acento: '#f28c38', fondo: 'claro' }, fuente: 'moderna', estilo: 'limpio', ambiente: [], referencias: '', secciones: ['servicios', 'reservas', 'galeria', 'contacto'], otras: '', objetivos: [], detalle: '' };
  const DEF_SECCIONES_WEB = ['servicios', 'reservas', 'galeria', 'contacto'];
  const DEF_SECCIONES_APP = ['autenticacion', 'perfil', 'reservas', 'catalogo'];
  const fresh = () => JSON.parse(JSON.stringify(DEF));
  let st = fresh();
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.colores) st = Object.assign(st, s); } catch (e) { /* sin guardado */ }
  const files = { logo: null, fotos: [] };
  let step = 1, device = 'desktop', sending = false;

  const SEC_DESC = {
    servicios: 'Lo que ofreces, con foto y una línea.',
    sobre: 'Quién está detrás y por qué confiar.',
    reservas: 'Que te reserven sin llamar.',
    galeria: 'Fotos del local, del equipo o del trabajo.',
    opiniones: 'Lo que dicen tus clientes de verdad.',
    mapa: 'Dónde estás y cómo llegar.',
    contacto: 'Formulario, teléfono y horario.'
  };
  const SEC_DESC_APP = {
    autenticacion: 'Iniciar sesión, registro y recuperar contraseña.',
    perfil: 'Ver y editar los datos del usuario.',
    reservas: 'Reservar citas o mesas desde la app.',
    pagos: 'Pagar con tarjeta o Bizum.',
    notificaciones: 'Avisos push para no perderse nada.',
    catalogo: 'Carta, productos o servicios.',
    pedidos: 'Hacer pedidos y ver su estado.',
    chat: 'Mensajes directos con el negocio.',
    fidelizacion: 'Puntos, descuentos o tarjeta digital.',
    ubicacion: 'Ver en el mapa y cómo llegar.',
    panel: 'Estadísticas y gestión del negocio.'
  };

  // ---------- Construir controles ----------
  $('#palettes').innerHTML = M.PALETAS.map(p => `<label class="pal" title="${p.label}"><input type="radio" name="paleta" value="${p.id}"><span class="sw"><i style="background:${p.principal}"></i><i style="background:${p.acento}"></i><i style="background:${p.fondo === 'oscuro' ? '#111315' : p.fondo === 'crema' ? '#f6f1e7' : '#ffffff'}"></i></span><span class="n">${p.label}</span></label>`).join('');
  $('#fonts').innerHTML = Object.entries(M.FUENTES).map(([k, f]) => `<label class="card"><input type="radio" name="fuente" value="${k}"><span class="aa" style="font-family:'${f.head}';font-weight:${f.hw}">Aa</span><b>${f.label}</b><small>${f.head}</small></label>`).join('');
  $('#styles').innerHTML = Object.entries(M.ESTILOS).map(([k, s]) => `<label class="card"><input type="radio" name="estilo" value="${k}"><span class="shape" style="border-radius:${k === 'redondeado' ? '12px' : k === 'limpio' ? '5px' : '0'}${k === 'editorial' ? ';border-left:0;border-right:0' : ''}"></span><b>${s.label}</b><small>${s.desc}</small></label>`).join('');
  $('#ambiente').innerHTML = O.AMBIENTES.map(a => `<label><input type="checkbox" name="ambiente" value="${a}"><span>${a}</span></label>`).join('');
  $('#objetivos').innerHTML = O.OBJETIVOS.map(([id, l]) => `<label><input type="checkbox" name="objetivo" value="${id}"><span>${l}</span></label>`).join('');
  function buildSections() {
    const box = $('#sections');
    const isApp = st.tipo === 'app';
    const SECS = isApp ? M.SECCIONES_APP : M.SECCIONES;
    const DESCS = isApp ? SEC_DESC_APP : SEC_DESC;
    box.innerHTML = '<legend class="sr">Secciones</legend>' + SECS.map(id => {
      const desc = id === 'servicios' && !isApp ? DESCS.servicios.replace('Lo que ofreces', M.perfil(st.sector).servicios === 'Carta' ? 'Tus platos' : 'Lo que ofreces') : DESCS[id];
      return `<label class="sec"><input type="checkbox" name="sec" value="${id}"${st.secciones.includes(id) ? ' checked' : ''}><span class="txt"><b>${M.seccionLabel(id, st.sector)}</b><small>${desc}</small></span><span class="switch" aria-hidden="true"></span></label>`;
    }).join('');
  }

  // ---------- Estado → controles ----------
  function syncControls() {
    $$('input[name=tipo]').forEach(i => (i.checked = i.value === st.tipo));
    ['nombre', 'sector', 'ciudad', 'enlace', 'referencias', 'otras', 'detalle'].forEach(k => ($('#' + k).value = st[k] || ''));
    $$('input[name=paleta]').forEach(i => (i.checked = i.value === st.paleta));
    $('#c1').value = st.colores.principal; $('#c2').value = st.colores.acento;
    $$('input[name=fuente]').forEach(i => (i.checked = i.value === st.fuente));
    $$('input[name=estilo]').forEach(i => (i.checked = i.value === st.estilo));
    $$('input[name=ambiente]').forEach(i => (i.checked = st.ambiente.includes(i.value)));
    $$('input[name=objetivo]').forEach(i => (i.checked = st.objetivos.includes(i.value)));
    buildSections();
    syncSmall();
  }
  function syncSmall() {
    $('#c1t').textContent = st.colores.principal.toUpperCase();
    $('#c2t').textContent = st.colores.acento.toUpperCase();
    $$('#fondo button').forEach(b => { const on = b.dataset.v === st.colores.fondo; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    $$('#chips button').forEach(b => b.classList.toggle('on', b.textContent.toLowerCase() === st.sector.toLowerCase()));
    $('#contrastHint').hidden = !(M.contrast(st.colores.principal, M.on(st.colores.principal)) < 3);
    const full = st.ambiente.length >= O.MAX_AMBIENTES;
    $$('input[name=ambiente]').forEach(i => (i.disabled = full && !i.checked));
  }

  // ---------- Muestra ----------
  let raf = 0;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* lleno o bloqueado */ } }
  function draw() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const cfg = M.normalize(st);
      $('#pd').innerHTML = M.render(cfg, 'desktop').svg;
      $('#pm').innerHTML = M.render(cfg, 'mobile').svg;
      $('.frame-m').style.background = M.topColor(cfg);
      const slug = (st.nombre || 'tunegocio').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 28) || 'tunegocio';
      $('#url').textContent = slug + '.es';
      save();
    });
  }
  function setDevice(d) {
    device = d;
    $('#screens').dataset.device = d;
    $$('.stage-bar .seg button').forEach(b => { const on = d === 'both' || b.dataset.device === d; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  }
  $$('.stage-bar .seg button').forEach(b => b.addEventListener('click', () => setDevice(b.dataset.device)));

  // ---------- Controles → estado ----------
  const form = $('#f');
  const TEXT = ['nombre', 'sector', 'ciudad', 'enlace', 'referencias', 'otras', 'detalle'];
  form.addEventListener('input', e => {
    const t = e.target;
    if (t.name === 'tipo') {
      const oldTipo = st.tipo;
      st.tipo = t.value;
      if (oldTipo !== t.value) {
        st.secciones = (t.value === 'app') ? DEF_SECCIONES_APP : DEF_SECCIONES_WEB;
        buildSections();
      }
    }
    else if (TEXT.includes(t.id)) {
      st[t.id] = t.value;
      if (t.id === 'nombre') clearErr('negocio', t);
      if (t.id === 'ciudad') clearErr('ciudad', t);
      if (t.id === 'sector') buildSectionsLater();
      if (!['nombre', 'sector'].includes(t.id)) { save(); return; }
    }
    else if (t.name === 'paleta') { const p = M.PALETAS.find(x => x.id === t.value); st.paleta = p.id; st.colores = { principal: p.principal, acento: p.acento, fondo: p.fondo }; $('#c1').value = p.principal; $('#c2').value = p.acento; }
    else if (t.id === 'c1' || t.id === 'c2') { st.colores[t.id === 'c1' ? 'principal' : 'acento'] = t.value; st.paleta = ''; $$('input[name=paleta]').forEach(i => (i.checked = false)); }
    else if (t.name === 'fuente') st.fuente = t.value;
    else if (t.name === 'estilo') st.estilo = t.value;
    else if (t.name === 'ambiente') st.ambiente = $$('input[name=ambiente]:checked').map(i => i.value).slice(0, O.MAX_AMBIENTES);
    else if (t.name === 'objetivo') { st.objetivos = $$('input[name=objetivo]:checked').map(i => i.value); save(); return; }
    else if (t.name === 'sec') st.secciones = $$('input[name=sec]:checked').map(i => i.value);
    else if (['cnombre', 'cemail', 'ctel'].includes(t.id)) { clearErr({ cnombre: 'nombre', cemail: 'email', ctel: 'telefono' }[t.id], t); return; }
    else if (t.id === 'priv') { clearErr('privacidad'); return; }
    else return;
    syncSmall(); draw();
  });
  let secT = 0;
  function buildSectionsLater() { clearTimeout(secT); secT = setTimeout(buildSections, 150); }
  $('#chips').addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    st.sector = e.target.textContent; $('#sector').value = st.sector; buildSections(); syncSmall(); draw();
  });
  $$('#fondo button').forEach(b => b.addEventListener('click', () => { st.colores.fondo = b.dataset.v; st.paleta = ''; $$('input[name=paleta]').forEach(i => (i.checked = false)); syncSmall(); draw(); }));

  // ---------- Logo y fotos ----------
  const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  function checkFile(f, logo) {
    const isSvg = f.type === 'image/svg+xml' || /\.svg$/i.test(f.name);
    if (/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name)) return `«${f.name}» está en HEIC (iPhone). Expórtala como JPG y vuelve a probar.`;
    if (!(OK_TYPES.includes(f.type) || (logo && isSvg))) return `«${f.name}» no es una imagen que pueda usar. Usa JPG, PNG o WebP${logo ? ' (o SVG)' : ''}.`;
    if (f.size > MAX_MB * 1048576) return `«${f.name}» pesa más de ${MAX_MB} MB.`;
    return '';
  }
  const urls = new Map();
  const url = f => { if (!urls.has(f)) urls.set(f, URL.createObjectURL(f)); return urls.get(f); };
  const kb = n => (n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  function drawFiles() {
    const item = (f, k, i) => `<li><img src="${url(f)}" alt=""><span><b>${esc(f.name)}</b><small>${kb(f.size)}</small></span><button type="button" data-k="${k}" data-i="${i}" aria-label="Quitar ${esc(f.name)}">Quitar</button></li>`;
    $('#logoList').innerHTML = files.logo ? item(files.logo, 'logo', 0) : '';
    $('#fotoList').innerHTML = files.fotos.map((f, i) => item(f, 'fotos', i)).join('');
    $('#dropLogo').classList.toggle('has', !!files.logo);
    $('#dropFotos').classList.toggle('full', files.fotos.length >= O.MAX_FOTOS);
    $('#dropFotos .drop-b').textContent = files.fotos.length ? (files.fotos.length >= O.MAX_FOTOS ? 'Ya tienes 4' : 'Añadir más') : 'Elegir fotos';
    $('#dropLogo .drop-b').textContent = files.logo ? 'Cambiar logo' : 'Elegir archivo';
  }
  // Mira los primeros bytes: que sea de verdad una imagen, diga lo que diga la extensión
  async function sniff(f) {
    try {
      const b = new Uint8Array(await f.slice(0, 512).arrayBuffer());
      const s = String.fromCharCode.apply(null, b.slice(0, 12));
      if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
      if (s.startsWith('\x89PNG')) return true;
      if (s.startsWith('RIFF') && s.slice(8, 12) === 'WEBP') return true;
      return /<svg[\s>]/i.test(new TextDecoder().decode(b));
    } catch (e) { return true; } // si no se puede leer, decide el servidor
  }
  async function addFiles(list, logo) {
    clearErr('archivos');
    const errs = [];
    for (const f of list) {
      const e = checkFile(f, logo) || ((await sniff(f)) ? '' : `«${f.name}» no es una imagen que pueda usar. Usa JPG, PNG o WebP${logo ? ' (o SVG)' : ''}.`);
      if (e) { errs.push(e); continue; }
      if (logo) files.logo = f;
      else if (files.fotos.length < O.MAX_FOTOS) files.fotos.push(f);
      else { errs.push(`Como mucho ${O.MAX_FOTOS} fotos. Quita alguna si quieres cambiarla.`); break; }
    }
    if (errs.length) showErr('archivos', errs.join(' '));
    drawFiles();
  }
  $('#logo').addEventListener('change', e => { addFiles(Array.from(e.target.files).slice(0, 1), true); e.target.value = ''; });
  $('#fotos').addEventListener('change', e => { addFiles(Array.from(e.target.files), false); e.target.value = ''; });
  [['#dropLogo', true], ['#dropFotos', false]].forEach(([sel, logo]) => {
    const z = $(sel);
    ['dragenter', 'dragover'].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.remove('over'); }));
    z.addEventListener('drop', e => addFiles(Array.from(e.dataTransfer.files).slice(0, logo ? 1 : O.MAX_FOTOS), logo));
  });
  $('#f').addEventListener('click', e => {
    const b = e.target.closest('.thumbs-up button'); if (!b) return;
    if (b.dataset.k === 'logo') files.logo = null; else files.fotos.splice(Number(b.dataset.i), 1);
    drawFiles();
  });

  // ---------- Pasos ----------
  const seen = {};
  function track(n) {
    if (seen[n]) return; seen[n] = true;
    try { const k = 'boceto:paso' + n; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { /* sin sessionStorage */ }
    try { fetch(BASE + '/api/paso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paso: n, origen: ORIGEN }), keepalive: true }).catch(() => {}); } catch (e) { /* sin red */ }
  }
  let noteT = 0;
  function note(n) {
    const el = $('#note'); if (!el) return;
    el.classList.add('swap'); clearTimeout(noteT);
    noteT = setTimeout(() => { el.textContent = NOTES[n] || ''; el.classList.remove('swap'); }, 250);
  }
  const small = () => window.matchMedia('(max-width: 960px)').matches;
  function go(n) {
    step = Math.max(1, Math.min(TOTAL, n));
    $$('.step').forEach(s => (s.hidden = Number(s.dataset.step) !== step));
    $('#stepCount').textContent = `${pad(step)} / ${pad(TOTAL)}`;
    $('#bar').style.width = $('#hair').style.width = (step / TOTAL) * 100 + '%';
    $('#back').style.visibility = step === 1 ? 'hidden' : 'visible';
    $('#nav-steps').hidden = step === TOTAL;
    $('#nextLabel').textContent = step === 1 ? 'Empezar' : step === 5 ? (files.logo || files.fotos.length ? 'Siguiente' : 'Seguir sin imágenes') : 'Siguiente';
    document.body.dataset.step = step;
    note(step); track(step);
    if (step === TOTAL) recap();
    const sc = small() ? null : $('#f');
    if (sc) sc.scrollTop = 0; else window.scrollTo({ top: 0, behavior: 'smooth' });
    const h = $(`.step[data-step="${step}"] .q`);
    if (h && document.activeElement && ['next', 'back'].includes(document.activeElement.id)) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  // al elegir imágenes cambia el texto del botón del paso 5
  new MutationObserver(() => { if (step === 5) $('#nextLabel').textContent = files.logo || files.fotos.length ? 'Siguiente' : 'Seguir sin imágenes'; }).observe($('#fotoList'), { childList: true });
  new MutationObserver(() => { if (step === 5) $('#nextLabel').textContent = files.logo || files.fotos.length ? 'Siguiente' : 'Seguir sin imágenes'; }).observe($('#logoList'), { childList: true });
  $('#next').addEventListener('click', () => {
    if (step === 2) {
      let bad = null;
      if (!st.nombre.trim()) { showErr('negocio', 'Escribe el nombre de tu negocio.', $('#nombre')); bad = $('#nombre'); }
      if (st.ciudad.trim().length < 2) { showErr('ciudad', '¿Dónde está? Ciudad o pueblo.', $('#ciudad')); bad = bad || $('#ciudad'); }
      if (bad) { bad.focus(); return; }
    }
    go(step + 1);
  });
  $('#back').addEventListener('click', () => go(step - 1));
  ['nombre', 'sector', 'ciudad', 'enlace', 'otras'].forEach(id => $('#' + id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#next').click(); } }));

  function recap() {
    const r = M.resumen(st), n = st.secciones.length;
    const tipo = { wordpress: 'una web en WordPress', medida: 'una web a medida', app: 'una app web' }[st.tipo];
    const img = (files.logo ? 1 : 0) + files.fotos.length;
    const amb = st.ambiente.length ? st.ambiente.map(a => a.toLowerCase()).join(', ') : r.estilo.toLowerCase();
    $('#recap').innerHTML = `Quieres <button type="button" data-go="1">${tipo}</button> para <button type="button" data-go="2">${esc(r.negocio)}</button>${st.ciudad ? ` en ${esc(st.ciudad)}` : ''}, con un aire <button type="button" data-go="3">${esc(amb)}</button>, <button type="button" data-go="4">${n ? n + (n === 1 ? ' sección' : ' secciones') : 'solo la portada'}</button> y <button type="button" data-go="5">${img ? img + (img === 1 ? ' imagen' : ' imágenes') : 'sin imágenes'}</button>. Toca cualquier cosa para cambiarla.`;
  }
  $('#recap').addEventListener('click', e => { const b = e.target.closest('button'); if (b) go(Number(b.dataset.go)); });

  // ---------- Errores ----------
  function showErr(k, msg, input) { const el = $('#err-' + k); if (el) el.textContent = msg; if (input) input.setAttribute('aria-invalid', 'true'); }
  function clearErr(k, input) { const el = $('#err-' + k); if (el) el.textContent = ''; if (input) input.removeAttribute('aria-invalid'); }

  // ---------- Enviar ----------
  function upload(fd, onProgress) {
    return new Promise(resolve => {
      const x = new XMLHttpRequest();
      x.open('POST', BASE + '/api/briefs');
      x.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch (e) { /* vacío */ } resolve({ status: x.status, j }); };
      x.onerror = x.ontimeout = () => resolve({ status: 0, j: {} });
      x.timeout = 120000;
      x.send(fd);
    });
  }
  // En Vercel: cada imagen va directa al almacenamiento privado y el brief viaja como JSON con sus rutas.
  // Si el envío falla por un dato mal puesto, las imágenes ya subidas se reutilizan.
  const subidas = new Map();
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
  let subidaLista = null;
  function cargarSubida() {
    return subidaLista || (subidaLista = new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = BASE + '/js/subida.js' + VERSION;
      s.onload = () => window.subidaBlob ? ok(window.subidaBlob) : mal(new Error('subida'));
      s.onerror = () => { subidaLista = null; mal(new Error('subida')); };
      document.head.appendChild(s);
    }));
  }
  async function subirImagenes(onProgress) {
    const lista = [...(files.logo ? [['logo', files.logo]] : []), ...files.fotos.map(f => ['fotos', f])];
    if (!lista.length) return [];
    const { upload } = await cargarSubida();
    const total = lista.reduce((n, [, f]) => n + f.size, 0) || 1;
    const carpeta = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[b & 63]).join('').slice(0, 16);
    let hecho = 0;
    const out = [];
    for (const [campo, f] of lista) {
      let pathname = subidas.get(f);
      if (!pathname) {
        const ext = EXT[f.type] || (/\.svg$/i.test(f.name) ? 'svg' : 'jpg');
        const r = await upload(`subidas/${carpeta}/${campo === 'logo' ? 'logo' : 'foto'}.${ext}`, f, {
          access: 'private', handleUploadUrl: BASE + '/api/subida', contentType: f.type || (ext === 'svg' ? 'image/svg+xml' : undefined),
          onUploadProgress: e => onProgress((hecho + e.loaded) / total)
        });
        pathname = r.pathname; subidas.set(f, pathname);
      }
      hecho += f.size; onProgress(hecho / total);
      out.push({ campo, pathname, original: f.name });
    }
    return out;
  }
  async function enviarJson(datos, onProgress) {
    let lista;
    try { lista = await subirImagenes(onProgress); } catch (e) { return { status: 0, j: { error: 'No he podido subir las imágenes. Revisa tu conexión e inténtalo otra vez.' } }; }
    try {
      const r = await fetch(BASE + '/api/briefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...datos, subidas: lista }) });
      let j = {}; try { j = await r.json(); } catch (e) { /* vacío */ }
      return { status: r.status, j };
    } catch (e) { return { status: 0, j: {} }; }
  }
  const label = t => { $('#send span').textContent = t; };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    if (step !== TOTAL) { $('#next').click(); return; }
    const contacto = { nombre: $('#cnombre').value.trim(), email: $('#cemail').value.trim(), telefono: $('#ctel').value.trim() };
    let bad = null;
    ['nombre', 'email', 'telefono', 'privacidad', 'general'].forEach(k => clearErr(k));
    $$('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
    if (contacto.nombre.length < 2) { showErr('nombre', 'Escribe tu nombre.', $('#cnombre')); bad = bad || $('#cnombre'); }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(contacto.email)) { showErr('email', 'Revisa el correo: ahí te llega el boceto.', $('#cemail')); bad = bad || $('#cemail'); }
    if (!$('#priv').checked) { showErr('privacidad', 'Marca la casilla para poder escribirte.'); bad = bad || $('#priv'); }
    if (!st.nombre.trim() || st.ciudad.trim().length < 2) { go(2); $('#next').click(); return; }
    if (bad) { bad.focus(); return; }
    sending = true;
    const btn = $('#send'); btn.disabled = true; label('Enviando…');
    const datos = { brief: st, contacto, privacidad: true, web: form.web.value, origen: ORIGEN };
    const hasFiles = !!(files.logo || files.fotos.length);
    const progreso = p => { if (hasFiles) label(p < 1 ? `Subiendo imágenes… ${Math.round(p * 100)} %` : 'Enviando…'); };
    let fd = null;
    if (!BLOB) {
      fd = new FormData();
      fd.append('datos', JSON.stringify(datos));
      if (files.logo) fd.append('logo', files.logo, files.logo.name);
      files.fotos.forEach(f => fd.append('fotos', f, f.name));
    }
    try {
      const { status, j } = BLOB ? await enviarJson(datos, progreso) : await upload(fd, progreso);
      if (status !== 200 || !j.ok) {
        if (j.errors) {
          const map = { nombre: '#cnombre', email: '#cemail', telefono: '#ctel' };
          Object.entries(j.errors).forEach(([k, v]) => showErr(['negocio', 'ciudad'].includes(k) ? 'general' : k, v, map[k] ? $(map[k]) : null));
        } else showErr('general', j.error || 'No se ha podido enviar. Revisa tu conexión e inténtalo otra vez.');
        return;
      }
      $('#doneEmail').textContent = contacto.email;
      form.hidden = true; $('#nav-steps').hidden = true; $('#done').hidden = false; $('#back').style.visibility = 'hidden';
      $('#stepCount').textContent = 'Recibido';
      $('#note').textContent = 'recibido, me pongo con ello';
      $('#bar').style.width = $('#hair').style.width = '100%';
      document.body.dataset.step = 'done';
      try { localStorage.removeItem(KEY); } catch (err) { /* nada */ }
      $('#done .q').setAttribute('tabindex', '-1'); $('#done .q').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      sending = false; btn.disabled = false; label('Pedir mi boceto');
    }
  });
  $('#again').addEventListener('click', () => {
    st = fresh(); files.logo = null; files.fotos = []; drawFiles();
    form.reset(); syncControls(); draw();
    form.hidden = false; $('#done').hidden = true; go(1);
  });

  // Brillo que sigue al ratón en las tarjetas (como en la web)
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.pick, .card, .drop-zone');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--px', ((e.clientX - r.left) / r.width) * 100 + '%');
    c.style.setProperty('--py', ((e.clientY - r.top) / r.height) * 100 + '%');
  });

  syncControls(); drawFiles(); draw(); go(1); if (small()) setDevice('mobile');
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  window.__boceto = { state: () => st, files: () => files, go, setDevice };
})();
