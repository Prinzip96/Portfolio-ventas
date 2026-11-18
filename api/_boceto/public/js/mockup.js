/* Render del boceto en SVG. El mismo código se usa en el navegador (vista previa en directo)
   y en el servidor (PNG para el email), así que lo que ve el cliente es lo que le llega. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Mockup = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Opciones ----------
  const TIPOS = {
    wordpress: { label: 'Web en WordPress', short: 'WordPress', desc: 'Tu web lista y fácil de actualizar tú mismo.' },
    medida: { label: 'Web a medida', short: 'Web a medida', desc: 'Diseño y código propios, rápida y sin plantillas.' },
    app: { label: 'App web', short: 'App web', desc: 'Una herramienta para tu negocio: reservas, clientes, gestión.' }
  };
  const FUENTES = {
    moderna: { label: 'Moderna', head: 'Plus Jakarta Sans', hw: 700, body: 'Plus Jakarta Sans', bb: 700, k: 1.04 },
    elegante: { label: 'Elegante', head: 'Playfair Display', hw: 700, body: 'Inter', bb: 600, k: 1.0 },
    caracter: { label: 'Con carácter', head: 'Bricolage Grotesque', hw: 700, body: 'Inter', bb: 600, k: 0.97 },
    clasica: { label: 'Clásica', head: 'Fraunces', hw: 600, body: 'Inter', bb: 600, k: 1.02 }
  };
  const ESTILOS = {
    limpio: { label: 'Limpio', desc: 'Ordenado y directo', r: 8, br: 8 },
    redondeado: { label: 'Cercano', desc: 'Formas suaves y amables', r: 22, br: 999 },
    editorial: { label: 'Editorial', desc: 'Letra grande, como una revista', r: 0, br: 0 }
  };
  const FONDOS = { claro: 'Claro', crema: 'Crema', oscuro: 'Oscuro' };
  const PALETAS = [
    { id: 'mar', label: 'Mar', principal: '#0f4c5c', acento: '#f28c38', fondo: 'claro' },
    { id: 'terracota', label: 'Terracota', principal: '#b4532a', acento: '#f2c14e', fondo: 'crema' },
    { id: 'oliva', label: 'Oliva', principal: '#4b5d23', acento: '#d9a441', fondo: 'crema' },
    { id: 'coral', label: 'Coral', principal: '#e2574c', acento: '#2b2d42', fondo: 'claro' },
    { id: 'lavanda', label: 'Lavanda', principal: '#5b3fa8', acento: '#ffb4a2', fondo: 'claro' },
    { id: 'bosque', label: 'Bosque', principal: '#1f4d3a', acento: '#b9dc8c', fondo: 'claro' },
    { id: 'noche', label: 'Noche', principal: '#d4a72c', acento: '#7fb7be', fondo: 'oscuro' },
    { id: 'fucsia', label: 'Fucsia', principal: '#c2255c', acento: '#ffd43b', fondo: 'claro' }
  ];
  const SECCIONES = ['servicios', 'sobre', 'reservas', 'galeria', 'opiniones', 'mapa', 'contacto'];

  const PERFILES = [
    { id: 'rest', re: /(restaur|bar\b|bares|tasca|marisq|chiringu|pizz|asador|tabern|gastro|cocina|bodeg[oó]n|tapas|arrocer|cervecer|vinoteca|burger|hamburgues|sushi|brasa)/i,
      servicios: 'Carta', items: ['Entrantes', 'Principales', 'Postres'], cta: 'Reservar mesa', resNav: 'Reservas', resTitle: 'Reserva tu mesa',
      campos: [['Fecha', 'Sáb 21'], ['Hora', '21:00'], ['Personas', '2 personas']], tagline: 'Cocina de temporada, producto de aquí y mesa para todos.',
      kpis: [['Reservas hoy', '24'], ['Comensales', '68'], ['Mesas libres', '7']] },
    { id: 'salud', re: /(cl[ií]nic|dental|dentist|m[eé]dic|psic[oó]log|nutrici|veterin|podolog|[oó]ptica|osteop|logoped|farmac)/i,
      servicios: 'Tratamientos', items: ['Primera visita', 'Tratamientos', 'Revisiones'], cta: 'Pedir cita', resNav: 'Citas', resTitle: 'Pide tu cita',
      campos: [['Día', 'Lun 23'], ['Hora', '10:30'], ['Motivo', 'Primera visita']], tagline: 'Te cuidamos de cerca, con calma y sin esperas.',
      kpis: [['Citas hoy', '18'], ['Pacientes nuevos', '4'], ['Huecos libres', '6']] },
    { id: 'belleza', re: /(peluquer|est[eé]tic|u[ñn]as|spa\b|masaj|belleza|manicur|depila|maquilla|sal[oó]n)/i,
      servicios: 'Servicios', items: ['Corte y color', 'Tratamientos', 'Eventos'], cta: 'Reservar cita', resNav: 'Citas', resTitle: 'Reserva tu cita',
      campos: [['Día', 'Vie 20'], ['Hora', '17:00'], ['Servicio', 'Corte y color']], tagline: 'Tu momento, con profesionales que te escuchan.',
      kpis: [['Citas hoy', '15'], ['Clientes nuevos', '3'], ['Huecos libres', '5']] },
    { id: 'deporte', re: /(gimnas|gym|crossfit|pilates|entrenad|club|p[aá]del|tenis|box|artes marciales|danza|baile|nataci)/i,
      servicios: 'Clases', items: ['Entrenamiento', 'Clases dirigidas', 'Horarios'], cta: 'Prueba una clase', resNav: 'Clases', resTitle: 'Reserva tu clase',
      campos: [['Día', 'Mar 24'], ['Hora', '19:00'], ['Clase', 'Funcional']], tagline: 'Entrena a tu ritmo, con gente que te motiva.',
      kpis: [['Clases hoy', '9'], ['Socios activos', '212'], ['Plazas libres', '14']] },
    { id: 'pro', re: /(abogad|asesor|gestor|consult|arquitect|notar|seguro|inmobiliar|agencia|contab|ingenier|despacho|reformas|construc|fontaner|electric|carpinter|limpieza|mudanz|taller)/i,
      servicios: 'Servicios', items: ['Asesoramiento', 'Gestión', 'Seguimiento'], cta: 'Pedir información', resNav: 'Citas', resTitle: 'Agenda una llamada',
      campos: [['Día', 'Mié 25'], ['Hora', '12:00'], ['Asunto', 'Consulta']], tagline: 'Te lo explicamos claro y nos ocupamos de todo.',
      kpis: [['Consultas nuevas', '8'], ['Clientes activos', '46'], ['Tareas hoy', '11']] },
    { id: 'tienda', re: /(tienda|moda|boutique|bodega|vinos|librer|joyer|regalo|deco|muebles|cer[aá]mica|artesan|zapater|juguet|papeler|ropa)/i,
      servicios: 'Productos', items: ['Novedades', 'Colecciones', 'Más vendidos'], cta: 'Ver productos', resNav: 'Encargos', resTitle: 'Haz tu encargo',
      campos: [['Recogida', 'Jue 26'], ['Hora', '18:00'], ['Producto', 'Elige uno']], tagline: 'Piezas elegidas una a una. Llévatelas hoy.',
      kpis: [['Pedidos hoy', '13'], ['Encargos', '5'], ['Visitas', '640']] },
    { id: 'aloj', re: /(hotel|hostal|apartament|casa rural|camping|alojamiento|albergue|villa|caba[ñn]a)/i,
      servicios: 'Habitaciones', items: ['Doble', 'Suite', 'Familiar'], cta: 'Reservar estancia', resNav: 'Reservas', resTitle: 'Reserva tu estancia',
      campos: [['Llegada', 'Vie 20'], ['Salida', 'Dom 22'], ['Huéspedes', '2 adultos']], tagline: 'Descansa cerca de todo, como en casa.',
      kpis: [['Llegadas hoy', '6'], ['Ocupación', '82 %'], ['Salidas', '4']] }
  ];
  const PERFIL_BASE = { id: 'base', servicios: 'Servicios', items: ['Lo que hacemos', 'Cómo trabajamos', 'Por qué nosotros'], cta: 'Contactar',
    resNav: 'Citas', resTitle: 'Pide tu cita', campos: [['Día', 'Lun 23'], ['Hora', '11:00'], ['Motivo', 'Consulta']],
    tagline: 'Lo hacemos bien y te lo ponemos fácil.', kpis: [['Citas hoy', '12'], ['Mensajes nuevos', '5'], ['Clientes este mes', '86']] };

  function perfil(sector) { const s = String(sector || ''); return PERFILES.find(p => p.re.test(s)) || PERFIL_BASE; }

  function seccionLabel(id, sector) {
    const p = perfil(sector);
    return { servicios: p.servicios, sobre: 'Sobre nosotros', reservas: p.resNav, galeria: 'Galería', opiniones: 'Opiniones', mapa: 'Ubicación', contacto: 'Contacto' }[id];
  }

  // ---------- Normalizar (también valida lo que llega al servidor) ----------
  const HEX = /^#[0-9a-f]{6}$/i;
  const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  function normalize(c) {
    c = c || {};
    const col = c.colores || {};
    const out = {
      tipo: TIPOS[c.tipo] ? c.tipo : 'wordpress',
      nombre: clean(c.nombre, 40),
      sector: clean(c.sector, 40),
      colores: {
        principal: HEX.test(col.principal) ? col.principal.toLowerCase() : PALETAS[0].principal,
        acento: HEX.test(col.acento) ? col.acento.toLowerCase() : PALETAS[0].acento,
        fondo: FONDOS[col.fondo] ? col.fondo : 'claro'
      },
      fuente: FUENTES[c.fuente] ? c.fuente : 'moderna',
      estilo: ESTILOS[c.estilo] ? c.estilo : 'limpio',
      secciones: SECCIONES.filter(s => Array.isArray(c.secciones) && c.secciones.includes(s))
    };
    return out;
  }

  // ---------- Color ----------
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const on = c => (contrast(c, '#ffffff') >= contrast(c, '#141414') ? '#ffffff' : '#141414');
  function readable(c, bg, toward, min) { let out = c; for (let i = 1; i <= 8 && contrast(out, bg) < (min || 3); i++) out = mix(c, toward, i * 0.12); return out; }

  function theme(cfg) {
    const { principal, acento, fondo } = cfg.colores;
    const dark = fondo === 'oscuro';
    const bg = fondo === 'oscuro' ? '#111315' : fondo === 'crema' ? '#f6f1e7' : '#ffffff';
    const text = dark ? '#f1eee8' : fondo === 'crema' ? '#221d17' : '#16181d';
    return {
      dark, bg, text, principal, acento,
      onP: on(principal), onA: on(acento),
      ink: readable(principal, bg, text, 3),        // principal legible sobre el fondo
      inkA: readable(acento, bg, text, 2.6),
      muted: mix(text, bg, 0.42),
      bar: mix(text, bg, dark ? 0.8 : 0.86),        // líneas de texto de relleno
      line: mix(text, bg, dark ? 0.84 : 0.9),
      surf: dark ? mix(bg, '#ffffff', 0.05) : fondo === 'crema' ? '#fffcf6' : '#ffffff',
      alt: mix(bg, principal, dark ? 0.12 : 0.06),
      foot: dark ? '#0a0b0c' : mix(principal, '#0b0c0e', 0.72)
    };
  }

  // ---------- Texto ----------
  function tw(s, size, k) {
    let w = 0;
    for (const ch of String(s)) {
      if (ch === ' ') w += 0.27;
      else if (/[iljtfrI.,:;'!|·]/.test(ch)) w += 0.3;
      else if (/[mwMW@]/.test(ch)) w += 0.86;
      else if (/[A-ZÁÉÍÓÚÑÜ0-9]/.test(ch)) w += 0.66;
      else w += 0.54;
    }
    return w * size * (k || 1);
  }
  function wrap(s, size, max, k, maxLines) {
    const words = String(s).split(' '); const lines = []; let cur = '';
    for (const wd of words) {
      const t = cur ? cur + ' ' + wd : wd;
      if (tw(t, size, k) <= max || !cur) cur = t; else { lines.push(cur); cur = wd; }
    }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) { const keep = lines.slice(0, maxLines); keep[maxLines - 1] = keep[maxLines - 1].replace(/\s*\S*$/, '') + '…'; return keep; }
    return lines;
  }
  function fit(s, max, lo, hi, k, maxLines) {
    for (let sz = hi; sz >= lo; sz -= 2) {
      const ls = wrap(s, sz, max, k);
      if (ls.length <= maxLines && ls.every(l => tw(l, sz, k) <= max)) return { size: sz, lines: ls };
    }
    return { size: lo, lines: wrap(s, lo, max, k, maxLines) };
  }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  // ---------- Render ----------
  let uid = 0;
  function render(input, device) {
    const cfg = normalize(input);
    const mob = device === 'mobile';
    const T = theme(cfg), F = FUENTES[cfg.fuente], S = ESTILOS[cfg.estilo], P = perfil(cfg.sector);
    const id = 'm' + (++uid).toString(36) + (mob ? 'm' : 'd');
    const name = cfg.nombre || 'Tu negocio';
    const sector = cfg.sector || '';
    const W = mob ? 390 : 1280, pad = mob ? 22 : 80, CW = W - pad * 2;
    const HF = `'${F.head}', serif`, BF = `'${F.body}', sans-serif`;
    const out = []; const defs = [];
    const R = S.r, BR = S.br, edit = cfg.estilo === 'editorial', soft = cfg.estilo === 'redondeado';
    let gi = 0;

    // primitivas
    const rect = (x, y, w, h, fill, r, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(r || 0, h / 2, w / 2)}" fill="${fill}"${extra || ''}/>`;
    const text = (x, y, s, o) => {
      o = o || {};
      return `<text x="${x}" y="${y}" font-family="${o.head ? HF : BF}" font-size="${o.size || 16}" font-weight="${o.weight || (o.head ? F.hw : 400)}" fill="${o.fill || T.text}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${esc(s)}</text>`;
    };
    const bars = (x, y, w, n, h, gap, color, lastFrac) => { let s = ''; for (let i = 0; i < n; i++) s += rect(x, y + i * gap, i === n - 1 ? Math.round(w * (lastFrac || 0.62)) : w, h || 8, color || T.bar, 4); return s; };
    const button = (x, y, label, o) => {
      o = o || {};
      const size = o.size || (mob ? 15 : 16), h = o.h || (mob ? 48 : 52);
      const w = o.w || Math.round(tw(label, size, 1.05) + (mob ? 40 : 52));
      const fill = o.fill || T.principal, fg = o.fg || on(fill);
      let s = o.outline ? rect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, 'none', BR, ` stroke="${o.stroke || T.text}" stroke-width="1.5"`) : rect(x, y, w, h, fill, BR);
      s += text(x + w / 2, y + h / 2 + size * 0.36, label, { size, weight: F.bb, fill: o.outline ? (o.stroke || T.text) : fg, anchor: 'middle' });
      return { s, w, h };
    };
    const star = (cx, cy, r, fill) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1); } return `<path d="${d}Z" fill="${fill}"/>`; };
    // Hueco para foto: formas geométricas con los colores del cliente (no son fotos ni imágenes generadas)
    const photo = (x, y, w, h, seed, label, r) => {
      const k = id + 'p' + (gi++); r = r == null ? R : r;
      const a = T.principal, b = mix(T.principal, T.acento, 0.55);
      defs.push(`<linearGradient id="${k}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><clipPath id="${k}c">${rect(x, y, w, h, '#000', r)}</clipPath>`);
      const v = seed % 4, m = Math.min(w, h); let sh = '';
      if (v === 0) sh = `<circle cx="${x + w * 0.74}" cy="${y + h * 0.78}" r="${m * 0.52}" fill="${T.acento}" opacity=".9"/><circle cx="${x + w * 0.24}" cy="${y + h * 0.26}" r="${m * 0.12}" fill="${T.onP}" opacity=".22"/>`;
      else if (v === 1) sh = [0.62, 0.46, 0.3].map((t, i) => `<circle cx="${x + w * 0.3}" cy="${y + h}" r="${m * t}" fill="none" stroke="${T.acento}" stroke-width="${m * 0.07}" opacity="${0.9 - i * 0.2}"/>`).join('');
      else if (v === 2) sh = `<rect x="${x + w * 0.42}" y="${y - h * 0.2}" width="${m * 0.5}" height="${h * 1.6}" fill="${T.acento}" opacity=".85" transform="rotate(28 ${x + w * 0.6} ${y + h / 2})"/><rect x="${x + w * 0.08}" y="${y + h * 0.6}" width="${w * 0.2}" height="${w * 0.2}" fill="${T.onP}" opacity=".18" transform="rotate(12 ${x + w * 0.18} ${y + h * 0.7})"/>`;
      else sh = `<circle cx="${x + w / 2}" cy="${y + h * 1.02}" r="${m * 0.46}" fill="${T.acento}"/><rect x="${x}" y="${y + h * 0.82}" width="${w}" height="${h * 0.2}" fill="${mix(T.principal, '#000000', 0.25)}" opacity=".55"/>`;
      let s = `<g clip-path="url(#${k}c)">${rect(x, y, w, h, `url(#${k}g)`, 0)}${sh}</g>`;
      if (label !== false && w > 90) {
        const lb = label || 'Foto', fs = mob ? 10 : 11, lw = tw(lb, fs, 1.05) + 18;
        s += rect(x + 12, y + h - 12 - 22, lw, 22, 'rgba(255,255,255,.88)', 11) + text(x + 12 + lw / 2, y + h - 12 - 7, lb, { size: fs, weight: F.bb, fill: '#222', anchor: 'middle' });
      }
      return s;
    };
    const eyebrow = (x, y, s, o) => {
      o = o || {};
      if (edit) return text(x, y, s.toUpperCase(), { size: mob ? 11 : 12, weight: F.bb, fill: o.fill || T.ink, ls: 2.2, anchor: o.anchor });
      const fs = mob ? 12 : 13;
      if (soft) { const w = tw(s, fs, 1.06) + 24, xx = o.anchor === 'middle' ? x - w / 2 : x; return rect(xx, y - 17, w, 26, o.pill || T.acento, 13) + text(xx + w / 2, y, s, { size: fs, weight: F.bb, fill: on(o.pill || T.acento), anchor: 'middle' }); }
      const xx = o.anchor === 'middle' ? x - (tw(s, fs, 1.06) + 30) / 2 : x;
      return rect(xx, y - 6, 20, 3, o.fill || T.inkA, 0) + text(xx + 30, y, s, { size: fs, weight: F.bb, fill: o.fill || T.ink, ls: 0.4 });
    };
    // Título de sección. Devuelve el alto ocupado.
    let num = 0;
    const heading = (x, y, eb, title, o) => {
      o = o || {}; num++;
      const size = mob ? 28 : 42, k = F.k;
      const ls = wrap(title, size, o.max || (mob ? CW : 640), k, 2);
      let s = eyebrow(x, y, edit ? `${String(num).padStart(2, '0')} — ${eb}` : eb, { anchor: o.anchor, fill: o.ebFill, pill: o.pill });
      ls.forEach((l, i) => { s += text(x, y + (mob ? 40 : 56) + i * size * 1.12, l, { head: true, size, fill: o.fill || T.text, anchor: o.anchor }); });
      out.push(s);
      return (mob ? 40 : 56) + (ls.length - 1) * size * 1.12 + (mob ? 28 : 44);
    };

    const sel = cfg.secciones;
    const labels = sel.map(s => seccionLabel(s, sector));
    let y = 0;

    if (cfg.tipo === 'app') return renderApp();

    // ===== Barra de navegación =====
    const navH = mob ? 64 : 84;
    out.push(rect(0, 0, W, navH, T.bg, 0));
    {
      const ls = fit(name, mob ? 220 : 320, mob ? 15 : 17, mob ? 21 : 24, F.k, 1);
      out.push(text(pad, navH / 2 + ls.size * 0.35, ls.lines[0], { head: true, size: ls.size }));
      if (mob) {
        for (let i = 0; i < 3; i++) out.push(rect(W - pad - 24, navH / 2 - 8 + i * 7, 24, 2.5, T.text, 1));
      } else {
        const b = button(0, 0, P.cta, { h: 44, size: 15 });
        const bx = W - pad - b.w;
        out.push(button(bx, (navH - 44) / 2, P.cta, { h: 44, size: 15 }).s);
        let mx = bx - 36;
        const menu = labels.slice(0, 5).reverse();
        for (const l of menu) { const w = tw(l, 15, 1); if (mx - w < pad + 360) break; out.push(text(mx, navH / 2 + 5, l, { size: 15, fill: T.muted, anchor: 'end' })); mx -= w + 32; }
      }
      if (edit) out.push(rect(pad, navH - 1, CW, 1, T.text, 0));
    }
    y = navH;

    // ===== Portada =====
    const eb = sector ? cap(sector) : 'Bienvenidos';
    if (edit) {
      y += mob ? 40 : 76;
      const cx = W / 2;
      out.push(eyebrow(cx, y, eb, { anchor: 'middle' }));
      const f = fit(name, mob ? CW : 1040, mob ? 30 : 56, mob ? 54 : 112, F.k, mob ? 3 : 2);
      let ty = y + (mob ? 22 : 30) + f.size * 0.9;
      f.lines.forEach((l, i) => out.push(text(cx, ty + i * f.size * 1.02, l, { head: true, size: f.size, anchor: 'middle' })));
      ty += (f.lines.length - 1) * f.size * 1.02 + (mob ? 34 : 50);
      wrap(P.tagline, mob ? 17 : 21, mob ? CW : 620, 1).forEach((l, i) => out.push(text(cx, ty + i * (mob ? 25 : 31), l, { size: mob ? 17 : 21, fill: T.muted, anchor: 'middle' })));
      ty += (wrap(P.tagline, mob ? 17 : 21, mob ? CW : 620, 1).length - 1) * (mob ? 25 : 31) + (mob ? 30 : 40);
      const b = button(0, 0, P.cta);
      out.push(button(cx - b.w / 2, ty, P.cta).s);
      ty += b.h + (mob ? 36 : 56);
      const ph = mob ? 220 : 380;
      out.push(photo(pad, ty, CW, ph, 3, 'Foto principal'));
      y = ty + ph;
    } else if (mob) {
      y += 34;
      out.push(eyebrow(pad, y, eb));
      const f = fit(name, CW, 30, 46, F.k, 3);
      let ty = y + 22 + f.size * 0.92;
      f.lines.forEach((l, i) => out.push(text(pad, ty + i * f.size * 1.06, l, { head: true, size: f.size })));
      ty += (f.lines.length - 1) * f.size * 1.06 + 32;
      const tl = wrap(P.tagline, 17, CW, 1);
      tl.forEach((l, i) => out.push(text(pad, ty + i * 25, l, { size: 17, fill: T.muted })));
      ty += (tl.length - 1) * 25 + 28;
      out.push(button(pad, ty, P.cta, { w: CW }).s);
      ty += 48 + 28;
      if (soft) out.push(`<circle cx="${W - 40}" cy="${ty + 30}" r="70" fill="${T.acento}" opacity=".9"/>`);
      out.push(photo(pad, ty, CW, 250, 0, 'Foto principal'));
      y = ty + 250;
    } else {
      const top = y + 70, colW = 540;
      out.push(eyebrow(pad, top + 30, eb));
      const f = fit(name, colW, 44, 80, F.k, 2);
      let ty = top + 30 + 30 + f.size * 0.9;
      f.lines.forEach((l, i) => out.push(text(pad, ty + i * f.size * 1.04, l, { head: true, size: f.size })));
      ty += (f.lines.length - 1) * f.size * 1.04 + 46;
      const tl = wrap(P.tagline, 21, 470, 1);
      tl.forEach((l, i) => out.push(text(pad, ty + i * 31, l, { size: 21, fill: T.muted })));
      ty += (tl.length - 1) * 31 + 40;
      const b1 = button(pad, ty, P.cta); out.push(b1.s);
      if (sel.includes('servicios')) out.push(button(pad + b1.w + 14, ty, 'Ver ' + P.servicios.toLowerCase(), { outline: true }).s);
      const px = 680, pw = W - pad - px, ph = 470;
      if (soft) out.push(`<circle cx="${px + 20}" cy="${top + ph - 10}" r="90" fill="${T.acento}"/>`);
      out.push(photo(px, top, pw, ph, 0, 'Foto principal', soft ? 32 : R));
      y = Math.max(top + ph, ty + 52);
    }

    // ===== Secciones =====
    const gapS = mob ? 72 : 120;
    const S_ = {
      servicios() {
        y += gapS;
        y += heading(pad, y, P.servicios, cfg.estilo === 'editorial' ? `Lo mejor de ${name}` : `Nuestra ${P.servicios.toLowerCase() === 'carta' ? 'carta' : 'oferta'}`.replace('Nuestra oferta', P.servicios === 'Productos' ? 'Lo que encontrarás' : 'Lo que hacemos'));
        if (mob) {
          P.items.forEach((it, i) => {
            const cy = y + i * 128;
            if (soft) out.push(rect(pad, cy, CW, 112, T.surf, R, ` stroke="${T.line}"`));
            const ins = soft ? 8 : 0;
            out.push(photo(pad + ins, cy + ins, 112 - ins * 2, 112 - ins * 2, i + 1, false, soft ? R - 6 : R));
            const tx = pad + 128;
            out.push(text(tx, cy + 34, it, { head: true, size: 19 }));
            out.push(bars(tx, cy + 50, CW - 128 - 18, 2, 7, 14, T.bar, 0.6));
            out.push(text(tx, cy + 94, 'Ver más →', { size: 13, weight: F.bb, fill: T.ink }));
            if (!soft) out.push(rect(pad, cy + 112 + 8, CW, 1, T.line, 0));
          });
          y += P.items.length * 128 - 16;
          return;
        }
        const cols = 3, gap = 32, cw = (CW - gap * (cols - 1)) / cols, ih = 230;
        P.items.forEach((it, i) => {
          const cx = pad + (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (ih + 128);
          if (soft) out.push(rect(cx, cy, cw, ih + 112, T.surf, R, ` stroke="${T.line}"`));
          const inset = soft ? 10 : 0;
          out.push(photo(cx + inset, cy + inset, cw - inset * 2, ih - inset, i + 1, false, soft ? R - 6 : R));
          const tx = cx + (soft ? 20 : 0);
          out.push(text(tx, cy + ih + 38, it, { head: true, size: mob ? 21 : 24 }));
          out.push(bars(tx, cy + ih + 56, cw - (soft ? 40 : 0) - 20, 2, 8, 16, T.bar, 0.55));
          out.push(text(tx, cy + ih + 104, 'Ver más →', { size: 14, weight: F.bb, fill: T.ink }));
        });
        y += Math.ceil(P.items.length / cols) * (ih + 128) - 10;
      },
      sobre() {
        y += gapS;
        const ih = mob ? 240 : 420;
        if (mob) {
          y += heading(pad, y, 'Sobre nosotros', `Detrás de ${name}`);
          out.push(bars(pad, y - 6, CW, 4, 9, 20, T.bar, 0.5)); y += 4 * 20 + 14;
          out.push(photo(pad, y, CW, ih, 2, 'Tu equipo o tu local'));
          y += ih;
        } else {
          out.push(photo(pad, y, 520, ih, 2, 'Tu equipo o tu local'));
          const x = pad + 600;
          const hh = heading(x, y + 80, 'Sobre nosotros', `Detrás de ${name}`, { max: 520 });
          let ty = y + 80 + hh;
          out.push(bars(x, ty - 8, 480, 4, 9, 22, T.bar, 0.5)); ty += 4 * 22 + 24;
          out.push(text(x, ty + 20, 'Conócenos →', { size: 15, weight: F.bb, fill: T.ink }));
          y += ih;
        }
      },
      reservas() {
        y += gapS;
        const bandH = mob ? 470 : 360, top = y;
        const bandX = soft ? pad : 0, bandW = soft ? CW : W;
        out.push(rect(bandX, top, bandW, bandH, T.principal, soft ? R + 8 : 0));
        if (!mob) { const kc = id + 'rb'; defs.push(`<clipPath id="${kc}">${rect(bandX, top, bandW, bandH, '#000', soft ? R + 8 : 0)}</clipPath>`); out.push(`<g clip-path="url(#${kc})"><circle cx="${bandX + bandW - 60}" cy="${top + 40}" r="160" fill="${T.acento}" opacity=".2"/></g>`); }
        const ix = soft ? pad + (mob ? 22 : 56) : pad;
        const savedNum = num;
        heading(ix, top + (mob ? 56 : 92), P.resNav, P.resTitle, { fill: T.onP, ebFill: T.onP, pill: T.acento, max: mob ? CW - 44 : 420 });
        num = savedNum + 1;
        out.push(text(ix, top + (mob ? 150 : 210), 'Elige día y hora. Te confirmamos al momento.', { size: mob ? 15 : 17, fill: mix(T.onP, T.principal, 0.25) }));
        const cw2 = mob ? (soft ? CW - 44 : CW) : 560, cx = mob ? ix : W - pad - (soft ? 56 : 0) - cw2, cy = top + (mob ? 186 : 60), ch = mob ? 250 : 240;
        out.push(rect(cx, cy, cw2, ch, T.bg, R));
        const fw = mob ? cw2 - 40 : (cw2 - 40 - 24) / 3;
        P.campos.forEach(([lab, val], i) => {
          const fx = mob ? cx + 20 : cx + 20 + i * (fw + 12), fy = mob ? cy + 20 + i * 0 : cy + 30;
          if (mob) {
            const rowY = cy + 22 + i * 52;
            out.push(text(cx + 20, rowY + 14, lab, { size: 12, fill: T.muted, weight: F.bb }));
            out.push(text(cx + cw2 - 20, rowY + 14, val, { size: 15, weight: F.bb, anchor: 'end' }));
            out.push(rect(cx + 20, rowY + 32, cw2 - 40, 1, T.line, 0));
          } else {
            out.push(text(fx, fy + 6, lab, { size: 12, fill: T.muted, weight: F.bb }));
            out.push(rect(fx, fy + 18, fw, 56, T.surf, Math.min(R, 12), ` stroke="${T.line}"`));
            out.push(text(fx + 14, fy + 52, val, { size: 15, weight: F.bb }));
          }
        });
        const bl = P.cta === 'Reservar mesa' || /^Reserva/.test(P.cta) ? 'Confirmar reserva' : 'Confirmar';
        out.push(button(cx + 20, cy + ch - (mob ? 72 : 96), bl, { w: cw2 - 40, fill: T.text, fg: T.bg }).s);
        y = top + bandH;
      },
      galeria() {
        y += gapS;
        y += heading(pad, y, 'Galería', mob ? 'Así es por dentro' : 'Así es por dentro, sin filtros');
        const g = mob ? 10 : 16;
        if (mob) {
          const cw = (CW - g) / 2, h = 150;
          out.push(photo(pad, y, CW, 200, 3, false));
          for (let i = 0; i < 4; i++) out.push(photo(pad + (i % 2) * (cw + g), y + 200 + g + Math.floor(i / 2) * (h + g), cw, h, i, false));
          y += 200 + g + 2 * h + g;
        } else {
          const cw = (CW - 3 * g) / 4, h = 220;
          out.push(photo(pad, y, cw, h * 2 + g, 0, false));
          for (let i = 0; i < 6; i++) out.push(photo(pad + (1 + (i % 3)) * (cw + g), y + Math.floor(i / 3) * (h + g), cw, h, i + 1, false));
          y += 2 * h + g;
        }
      },
      opiniones() {
        y += gapS;
        y += heading(pad, y, 'Opiniones', 'Lo que dicen de nosotros');
        const cols = mob ? 1 : 3, gap = mob ? 14 : 24, cw = (CW - gap * (cols - 1)) / cols, ch = mob ? 150 : 200;
        const n = mob ? 2 : 3;
        for (let i = 0; i < n; i++) {
          const cx = pad + (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (ch + gap);
          out.push(rect(cx, cy, cw, ch, edit ? T.bg : T.surf, R, ` stroke="${T.line}"`));
          for (let s = 0; s < 5; s++) out.push(star(cx + 30 + s * 22, cy + 34, 8.5, T.inkA === T.acento ? T.acento : T.ink));
          out.push(bars(cx + 24, cy + 64, cw - 48, mob ? 2 : 3, 8, 18, T.bar, 0.7));
          out.push(rect(cx + 24, cy + ch - 38, 16, 16, T.acento, 8));
          out.push(rect(cx + 50, cy + ch - 34, 90, 8, mix(T.text, T.bg, 0.7), 4));
        }
        y += Math.ceil(n / cols) * (ch + gap) - gap;
      },
      mapa() {
        y += gapS;
        y += heading(pad, y, 'Ubicación', 'Dónde estamos');
        const mh = mob ? 300 : 400, k = id + 'map';
        defs.push(`<clipPath id="${k}">${rect(pad, y, CW, mh, '#000', R)}</clipPath>`);
        const land = T.dark ? mix(T.bg, '#ffffff', 0.08) : mix(T.bg, T.text, 0.05), road = T.dark ? mix(T.bg, '#ffffff', 0.16) : '#ffffff';
        let m = rect(pad, y, CW, mh, land, 0);
        m += `<path d="M${pad} ${y + mh * 0.78} C ${pad + CW * 0.3} ${y + mh * 0.62}, ${pad + CW * 0.6} ${y + mh * 0.98}, ${pad + CW} ${y + mh * 0.8} L ${pad + CW} ${y + mh} L ${pad} ${y + mh} Z" fill="${mix(T.acento, T.bg, 0.65)}"/>`;
        m += rect(pad + CW * 0.08, y + mh * 0.12, CW * 0.18, mh * 0.26, mix(T.principal, T.bg, 0.82), 6);
        [[0.18, 18], [0.47, 12], [0.7, 10]].forEach(([t, w]) => { m += rect(pad, y + mh * t, CW, w, road, 0); });
        [[0.12, 10], [0.36, 16], [0.62, 10], [0.86, 12]].forEach(([t, w]) => { m += rect(pad + CW * t, y, w, mh, road, 0); });
        m += `<rect x="${pad + CW * 0.2}" y="${y - 40}" width="14" height="${mh * 1.4}" fill="${road}" transform="rotate(-32 ${pad + CW * 0.5} ${y + mh / 2})"/>`;
        const pxp = mob ? pad + CW * 0.66 : pad + CW * 0.62, pyp = y + mh * (mob ? 0.42 : 0.4);
        m += `<circle cx="${pxp}" cy="${pyp + 26}" r="14" fill="#000" opacity=".12"/><path d="M${pxp} ${pyp + 26} C ${pxp - 6} ${pyp + 10}, ${pxp - 20} ${pyp + 2}, ${pxp - 20} ${pyp - 12} A 20 20 0 1 1 ${pxp + 20} ${pyp - 12} C ${pxp + 20} ${pyp + 2}, ${pxp + 6} ${pyp + 10}, ${pxp} ${pyp + 26} Z" fill="${T.principal}"/><circle cx="${pxp}" cy="${pyp - 12}" r="7" fill="${T.onP}"/>`;
        out.push(`<g clip-path="url(#${k})">${m}</g>`);
        const cw = mob ? CW - 32 : 340, cx = pad + (mob ? 16 : 32), cy = mob ? y + mh - 150 : y + 32;
        out.push(rect(cx, cy, cw, mob ? 134 : 200, T.surf, Math.max(R, 4), ` stroke="${T.line}"`));
        const nn = wrap(name, 20, cw - 48, F.k, 1)[0];
        out.push(text(cx + 24, cy + 42, nn, { head: true, size: 20 }));
        out.push(bars(cx + 24, cy + 60, cw - 70, 2, 8, 16, T.bar, 0.6));
        if (!mob) out.push(button(cx + 24, cy + 118, 'Cómo llegar', { h: 46, size: 15 }).s);
        y += mh;
      },
      contacto() {
        y += gapS;
        if (mob) {
          y += heading(pad, y, 'Contacto', 'Hablemos');
        } else {
          heading(pad, y, 'Contacto', 'Hablemos');
        }
        const fx = mob ? pad : pad + 560, fw = mob ? CW : CW - 560, fy = mob ? y : y - 10;
        if (!mob) {
          out.push(text(pad, y + 130, 'Escríbenos y te respondemos pronto.', { size: 19, fill: T.muted }));
          ['Teléfono', 'Email', 'Horario'].forEach((l, i) => {
            const ry = y + 190 + i * 64;
            out.push(rect(pad, ry, 44, 44, T.alt, Math.min(R, 22)));
            out.push(rect(pad + 15, ry + 15, 14, 14, T.ink, edit ? 0 : 4));
            out.push(text(pad + 62, ry + 18, l, { size: 13, fill: T.muted, weight: F.bb }));
            out.push(rect(pad + 62, ry + 28, 160, 8, T.bar, 4));
          });
        }
        const fields = [['Nombre', 52], ['Email', 52], ['Mensaje', 110]];
        let ry = fy;
        out.push(rect(fx, fy, fw, (mob ? 40 : 56) * 2 + 52 * 2 + 110 + 3 * 34 + 52, edit ? T.bg : T.surf, R, ` stroke="${T.line}"`));
        ry += mob ? 32 : 40;
        fields.forEach(([l, h]) => {
          out.push(text(fx + (mob ? 20 : 32), ry, l, { size: 13, weight: F.bb, fill: T.muted }));
          out.push(rect(fx + (mob ? 20 : 32), ry + 10, fw - (mob ? 40 : 64), h, T.bg, Math.min(R, 10), ` stroke="${T.line}"`));
          ry += h + 34;
        });
        out.push(button(fx + (mob ? 20 : 32), ry - 6, 'Enviar mensaje', { w: fw - (mob ? 40 : 64) }).s);
        y = fy + (mob ? 40 : 56) * 2 + 52 * 2 + 110 + 3 * 34 + 52;
      }
    };
    for (const s of sel) S_[s]();

    // ===== Pie =====
    y += gapS;
    const fh = mob ? 200 : 220;
    const fg = '#f2efe9', fm = 'rgba(242,239,233,.28)';
    out.push(rect(0, y, W, fh, T.foot, 0));
    const fn = fit(name, mob ? CW : 400, 18, mob ? 24 : 30, F.k, 1);
    out.push(text(pad, y + (mob ? 56 : 70), fn.lines[0], { head: true, size: fn.size, fill: fg }));
    if (mob) out.push(bars(pad, y + 80, 200, 2, 7, 16, fm, 0.6));
    else for (let i = 0; i < 3; i++) out.push(bars(W - pad - 560 + i * 200, y + 56, 120, 3, 7, 18, fm, 0.7));
    out.push(rect(pad, y + fh - 58, CW, 1, 'rgba(242,239,233,.14)', 0));
    out.push(text(pad, y + fh - 26, `© 2026 ${name}`, { size: 13, fill: 'rgba(242,239,233,.6)' }));
    y += fh;

    return finish(W, Math.ceil(y));

    // ===== App web =====
    function renderApp() {
      const appSel = sel.length ? sel : ['reservas'];
      const mods = appSel.map(s => ({ id: s, label: { servicios: P.servicios, sobre: 'Perfil del negocio', reservas: P.resNav, galeria: 'Fotos', opiniones: 'Opiniones', mapa: 'Ubicación', contacto: 'Mensajes' }[s] }));
      const sideDark = cfg.estilo !== 'limpio';
      const sideBg = cfg.estilo === 'redondeado' ? T.principal : cfg.estilo === 'editorial' ? (T.dark ? '#0a0b0c' : T.text) : T.surf;
      const sideFg = cfg.estilo === 'limpio' ? T.text : on(sideBg);
      const appBg = T.dark ? T.bg : mix(T.bg, T.text, 0.035);
      const initials = name.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'TN';
      let yy;
      const card = (x, y2, w, h) => out.push(rect(x, y2, w, h, T.surf, Math.min(Math.max(R, 4), 18), ` stroke="${T.line}"`));
      const chip = (x, y2, l, fill) => { const w = tw(l, 11, 1.1) + 18; out.push(rect(x - w, y2, w, 22, fill, 11) + text(x - w / 2, y2 + 15, l, { size: 11, weight: F.bb, fill: on(fill), anchor: 'middle' })); };
      function modBody(m, x, y2, w, h) {
        const rows = mob ? 3 : 4;
        if (m.id === 'reservas') {
          const times = ['13:30', '14:00', '20:30', '21:00'];
          for (let i = 0; i < rows; i++) {
            const ry = y2 + i * 44;
            out.push(rect(x, ry, 58, 30, T.alt, 8) + text(x + 29, ry + 20, times[i], { size: 13, weight: F.bb, anchor: 'middle', fill: T.ink }));
            out.push(rect(x + 72, ry + 7, w * 0.36, 8, T.bar, 4) + rect(x + 72, ry + 20, w * 0.2, 6, T.line, 3));
            chip(x + w, ry + 4, i === 1 ? 'Pendiente' : 'Confirmada', i === 1 ? T.acento : mix(T.principal, T.bg, 0.15));
          }
        } else if (m.id === 'servicios') {
          P.items.slice(0, rows).forEach((it, i) => {
            const ry = y2 + i * 46;
            out.push(photo(x, ry, 34, 34, i + 1, false, 8));
            out.push(text(x + 48, ry + 22, it, { size: 14, weight: F.bb }));
            out.push(rect(x + w - 40, ry + 7, 40, 22, i === 2 ? T.line : T.principal, 11) + `<circle cx="${i === 2 ? x + w - 29 : x + w - 11}" cy="${ry + 18}" r="8" fill="#fff"/>`);
          });
        } else if (m.id === 'galeria') {
          const c = mob ? 3 : 4, g = 8, tw2 = (w - g * (c - 1)) / c, th = (h - g) / 2;
          for (let i = 0; i < c * 2; i++) out.push(photo(x + (i % c) * (tw2 + g), y2 + Math.floor(i / c) * (th + g), tw2, th, i, false, 8));
        } else if (m.id === 'opiniones') {
          for (let i = 0; i < 3; i++) { const ry = y2 + i * 54; for (let s = 0; s < 5; s++) out.push(star(x + 8 + s * 17, ry + 8, 6.5, T.acento)); out.push(bars(x, ry + 24, w * 0.9, 2, 7, 13, T.bar, 0.6)); }
        } else if (m.id === 'mapa') {
          const k2 = id + 'am'; defs.push(`<clipPath id="${k2}">${rect(x, y2, w, h, '#000', 10)}</clipPath>`);
          let s = rect(x, y2, w, h, mix(T.bg, T.text, 0.06), 0);
          [0.3, 0.65].forEach(t => { s += rect(x, y2 + h * t, w, 10, T.dark ? mix(T.bg, '#fff', .15) : '#fff', 0); s += rect(x + w * t, y2, 10, h, T.dark ? mix(T.bg, '#fff', .15) : '#fff', 0); });
          s += `<circle cx="${x + w * 0.5}" cy="${y2 + h * 0.48}" r="12" fill="${T.principal}"/><circle cx="${x + w * 0.5}" cy="${y2 + h * 0.48}" r="4" fill="${T.onP}"/>`;
          out.push(`<g clip-path="url(#${k2})">${s}</g>`);
        } else if (m.id === 'contacto') {
          for (let i = 0; i < rows; i++) { const ry = y2 + i * 44; out.push(`<circle cx="${x + 16}" cy="${ry + 16}" r="16" fill="${T.alt}"/>` + rect(x + 9, ry + 11, 14, 10, T.ink, 2)); out.push(rect(x + 44, ry + 6, w * 0.4, 8, T.bar, 4) + rect(x + 44, ry + 20, w * 0.6, 6, T.line, 3)); if (i < 2) chip(x + w, ry + 4, 'Nuevo', T.acento); }
        } else if (m.id === 'sobre') {
          out.push(rect(x, y2, 64, 64, T.principal, Math.min(R, 16)) + text(x + 32, y2 + 41, initials, { head: true, size: 24, fill: T.onP, anchor: 'middle' }));
          out.push(text(x + 80, y2 + 26, wrap(name, 17, w - 90, F.k, 1)[0], { head: true, size: 17 }));
          out.push(bars(x + 80, y2 + 40, w - 100, 2, 7, 14, T.bar, 0.5));
          out.push(bars(x, y2 + 92, w, 3, 8, 18, T.line, 0.7));
        }
      }
      if (!mob) {
        const SW = 248, H = Math.max(820, 0);
        out.push(rect(0, 0, W, 4000, appBg, 0));
        const mainX = SW + 40, mainW = W - mainX - 40;
        // Contenido principal
        out.push(rect(SW, 0, W - SW, 76, T.dark ? T.bg : T.surf, 0) + rect(SW, 75, W - SW, 1, T.line, 0));
        out.push(rect(mainX, 18, 360, 40, appBg, 20) + `<circle cx="${mainX + 22}" cy="38" r="6" fill="none" stroke="${T.muted}" stroke-width="2"/>` + text(mainX + 40, 43, 'Buscar…', { size: 14, fill: T.muted }));
        out.push(`<circle cx="${W - 64}" cy="38" r="20" fill="${T.acento}"/>` + text(W - 64, 43, initials, { size: 13, weight: F.bb, fill: T.onA, anchor: 'middle' }));
        out.push(rect(W - 124, 28, 20, 20, 'none', 6, ` stroke="${T.muted}" stroke-width="2"`));
        yy = 128;
        out.push(text(mainX, yy, `Hola, equipo de ${wrap(name, 30, mainW - 260, F.k, 1)[0]}`, { head: true, size: 30 }));
        out.push(text(mainX, yy + 30, 'Esto es lo que tienes hoy.', { size: 15, fill: T.muted }));
        yy += 64;
        const kw = (mainW - 2 * 20) / 3;
        P.kpis.forEach(([l, v], i) => {
          const kx = mainX + i * (kw + 20);
          card(kx, yy, kw, 118);
          out.push(text(kx + 24, yy + 36, l, { size: 13, weight: F.bb, fill: T.muted }));
          out.push(text(kx + 24, yy + 84, v, { head: true, size: 38, fill: i === 0 ? T.ink : T.text }));
          for (let b = 0; b < 7; b++) { const bh = [18, 30, 22, 40, 34, 48, 38][(b + i * 2) % 7]; out.push(rect(kx + kw - 24 - (7 - b) * 14, yy + 92 - bh, 9, bh, b === 6 ? T.principal : mix(T.principal, T.surf, 0.7), 3)); }
        });
        yy += 118 + 24;
        const mw = (mainW - 20) / 2, mh = 268;
        mods.forEach((m, i) => {
          const mx = mainX + (i % 2) * (mw + 20), my = yy + Math.floor(i / 2) * (mh + 20);
          card(mx, my, mw, mh);
          out.push(text(mx + 24, my + 38, m.label, { head: true, size: 19 }));
          out.push(text(mx + mw - 24, my + 38, 'Ver todo', { size: 13, weight: F.bb, fill: T.ink, anchor: 'end' }));
          modBody(m, mx + 24, my + 66, mw - 48, mh - 92);
        });
        yy += Math.ceil(mods.length / 2) * (mh + 20) + 20;
        const total = Math.max(H, yy);
        // Barra lateral
        out.push(rect(0, 0, SW, total, sideBg, 0));
        if (cfg.estilo === 'limpio') out.push(rect(SW - 1, 0, 1, total, T.line, 0));
        out.push(rect(24, 22, 34, 34, cfg.estilo === 'redondeado' ? T.acento : T.principal, Math.min(R, 10)) + text(41, 45, initials[0], { head: true, size: 18, fill: on(cfg.estilo === 'redondeado' ? T.acento : T.principal), anchor: 'middle' }));
        out.push(text(70, 45, wrap(name, 16, SW - 90, F.k, 1)[0], { head: true, size: 16, fill: sideFg }));
        const items = [{ label: 'Inicio' }].concat(mods, [{ label: 'Ajustes' }]);
        items.forEach((it, i) => {
          const iy = 100 + i * 48;
          if (i === 0) out.push(rect(16, iy - 2, SW - 32, 42, cfg.estilo === 'limpio' ? T.alt : 'rgba(255,255,255,.14)', Math.min(Math.max(R, 6), 21)));
          out.push(rect(32, iy + 13, 16, 16, i === 0 ? (cfg.estilo === 'limpio' ? T.ink : sideFg) : (cfg.estilo === 'limpio' ? T.bar : 'rgba(255,255,255,.35)'), edit ? 0 : 5));
          out.push(text(62, iy + 26, it.label, { size: 15, weight: i === 0 ? F.bb : 400, fill: i === 0 ? sideFg : (cfg.estilo === 'limpio' ? T.muted : 'rgba(255,255,255,.75)') }));
        });
        return finish(W, Math.ceil(total));
      }
      // App en móvil
      out.push(rect(0, 0, W, 4000, appBg, 0));
      out.push(rect(0, 0, W, 64, cfg.estilo === 'limpio' ? T.surf : sideBg, 0));
      const tf = cfg.estilo === 'limpio' ? T.text : sideFg;
      out.push(text(pad, 40, wrap(name, 18, 260, F.k, 1)[0], { head: true, size: 18, fill: tf }));
      out.push(`<circle cx="${W - pad - 16}" cy="32" r="16" fill="${T.acento}"/>` + text(W - pad - 16, 37, initials, { size: 11, weight: F.bb, fill: T.onA, anchor: 'middle' }));
      yy = 104;
      out.push(text(pad, yy, 'Hola de nuevo', { head: true, size: 26 }));
      out.push(text(pad, yy + 26, 'Esto es lo que tienes hoy.', { size: 14, fill: T.muted }));
      yy += 48;
      const kw = (CW - 16) / 3;
      P.kpis.forEach(([l, v], i) => { const kx = pad + i * (kw + 8); card(kx, yy, kw, 92); out.push(text(kx + 12, yy + 48, v, { head: true, size: 26, fill: i === 0 ? T.ink : T.text })); wrap(l, 11, kw - 20, 1, 2).forEach((ln, j) => out.push(text(kx + 12, yy + 68 + j * 13, ln, { size: 11, fill: T.muted, weight: F.bb }))); });
      yy += 92 + 18;
      mods.forEach(m => {
        const mh = m.id === 'galeria' ? 230 : m.id === 'sobre' ? 210 : m.id === 'opiniones' ? 222 : m.id === 'mapa' ? 220 : 204;
        card(pad, yy, CW, mh);
        out.push(text(pad + 18, yy + 34, m.label, { head: true, size: 17 }));
        out.push(text(pad + CW - 18, yy + 34, 'Ver todo', { size: 12, weight: F.bb, fill: T.ink, anchor: 'end' }));
        modBody(m, pad + 18, yy + 56, CW - 36, mh - 74);
        yy += mh + 14;
      });
      yy += 70;
      // Barra inferior
      out.push(rect(0, yy - 70, W, 70, T.surf, 0) + rect(0, yy - 70, W, 1, T.line, 0));
      const tabs = [{ label: 'Inicio' }].concat(mods.slice(0, 3));
      const tW = W / tabs.length;
      tabs.forEach((t, i) => {
        const tx = tW * i + tW / 2;
        out.push(rect(tx - 9, yy - 56, 18, 18, i === 0 ? T.principal : T.bar, edit ? 0 : 5));
        out.push(text(tx, yy - 20, t.label.split(' ')[0], { size: 11, weight: i === 0 ? F.bb : 400, fill: i === 0 ? T.ink : T.muted, anchor: 'middle' }));
      });
      return finish(W, Math.ceil(yy));
    }

    function finish(w, h) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Boceto de ${esc(name)}"><defs>${defs.join('')}</defs><rect width="${w}" height="${h}" fill="${T.bg}"/>${out.join('')}</svg>`;
      return { svg, width: w, height: h };
    }
  }

  // Color de la parte de arriba del boceto en móvil (para pintar la barra de estado del marco del teléfono)
  function topColor(input) {
    const c = normalize(input), T = theme(c);
    if (c.tipo !== 'app') return T.bg;
    if (c.estilo === 'limpio') return T.surf;
    return c.estilo === 'redondeado' ? T.principal : (T.dark ? '#0a0b0c' : T.text);
  }

  function resumen(input) {
    const c = normalize(input);
    return {
      tipo: TIPOS[c.tipo].label,
      negocio: c.nombre || '—',
      sector: c.sector || '—',
      colores: `${c.colores.principal.toUpperCase()} y ${c.colores.acento.toUpperCase()}, fondo ${FONDOS[c.colores.fondo].toLowerCase()}`,
      tipografia: FUENTES[c.fuente].label,
      estilo: ESTILOS[c.estilo].label,
      secciones: c.secciones.length ? c.secciones.map(s => seccionLabel(s, c.sector)).join(', ') : 'Solo portada'
    };
  }

  return { topColor, TIPOS, FUENTES, ESTILOS, FONDOS, PALETAS, SECCIONES, perfil, seccionLabel, normalize, render, resumen, contrast, on };
});
