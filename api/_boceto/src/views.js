'use strict';
// Páginas del servidor con la misma cabecera y pie que estudiojota.es: privacidad, boceto publicado,
// bandeja de pruebas y el panel privado de briefs.
const C = require('./config');
const Br = require('./brief');
const { origenLabel } = require('./mailer');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const B = C.BASE_PATH, W = C.ESTUDIO_WEB;
const fecha = (iso, opts) => new Date(iso).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', ...(opts || { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) });

function nav() {
  return `<header class="nav" id="nav">
  <a class="nav-logo" href="${esc(W)}/">Jaime<sup>®</sup></a>
  <nav class="nav-links" id="navLinks" aria-label="Navegación principal">
    <a href="${esc(W)}/trabajos">Trabajos</a>
    <a href="${esc(W)}/#como-funciona">Cómo funciona</a>
    <a href="${esc(W)}/diseno-web-malaga">Servicios</a>
    <a href="${esc(W)}/#packs">Packs</a>
    <a href="${esc(W)}/#preguntas">Preguntas</a>
    <a href="${esc(W)}/blog">Blog</a>
    <a class="nav-boceto" href="${B}/" aria-current="page">Boceto <span class="nav-tag">gratis</span></a>
  </nav>
  <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="navLinks" aria-label="Abrir menú">
    <span></span><span></span>
  </button>
  <a class="nav-cta" href="mailto:${esc(C.CONTACTO_EMAIL)}">Escríbeme <span class="arr">→</span></a>
</header>`;
}
function footer() {
  return `<footer class="footer">
  <div class="footer-brand"><p class="footer-name">Jaime<sup>®</sup></p><p class="footer-tag">${esc(C.ESTUDIO_TITULAR)} · ${esc(C.ESTUDIO_NOMBRE)} · Diseño web para negocios locales · Málaga</p></div>
  <div class="footer-col"><span class="footer-label">Menú</span><a href="${esc(W)}/trabajos">Trabajos</a><a href="${esc(W)}/#como-funciona">Cómo funciona</a><a href="${esc(W)}/diseno-web-malaga">Diseño web en Málaga</a><a href="${B}/">Pide tu boceto</a></div>
  <div class="footer-col"><span class="footer-label">Contacto</span><a href="mailto:${esc(C.CONTACTO_EMAIL)}">${esc(C.CONTACTO_EMAIL)}</a><a href="https://www.instagram.com/estudiojotaweb/" target="_blank" rel="noopener">Instagram ↗</a></div>
  <div class="footer-col"><span class="footer-label">Legal</span><a href="${esc(W)}/aviso-legal">Aviso legal</a><a href="${B}/privacidad">Privacidad</a></div>
  <p class="footer-year">© 2026 ${esc(C.ESTUDIO_NOMBRE)}</p>
</footer>`;
}
function head(title, noindex) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${noindex ? '<meta name="robots" content="noindex,nofollow">' : ''}<meta name="theme-color" content="#0a0a0a">
<link rel="preload" href="${B}/fonts/instrument-serif-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${B}/css/app.css"><link rel="icon" href="${esc(W)}/favicon.svg" type="image/svg+xml"><link rel="icon" href="${esc(W)}/favicon.ico" sizes="any"></head>`;
}
function page({ title, body, noindex }) {
  return `${head(title, noindex)}<body class="plain"><div class="grain" aria-hidden="true"></div>${nav()}${body}${footer()}</body></html>`;
}

// ---------- Boceto publicado (hecho a mano, subido desde el panel) ----------
function boceto(b) {
  const pub = b.publicado, f = `${B}/b/${esc(pub.token)}`;
  const isHtml = pub.tipo === 'html';
  const d = isHtml ? `<iframe class="view-frame" src="${f}/${esc(pub.escritorio)}" title="Boceto de ${esc(b.negocio.nombre)}" loading="eager"></iframe>` : `<img src="${f}/${esc(pub.escritorio)}" alt="Boceto de ${esc(b.negocio.nombre)} en escritorio">`;
  const m = isHtml ? `<iframe class="view-frame" src="${f}/${esc(pub.escritorio)}" title="Boceto en móvil" loading="lazy"></iframe>` : pub.movil ? `<img src="${f}/${esc(pub.movil)}" alt="Boceto de ${esc(b.negocio.nombre)} en móvil">` : '';
  const first = b.contacto.nombre.split(' ')[0];
  return page({ title: `Boceto · ${b.negocio.nombre} · Jaime®`, noindex: true, body: `<main class="view">
<div class="view-head">
  <div><span class="label lime">Tu boceto, hecho a mano</span><h1 class="section-title">${esc(b.negocio.nombre)}</h1></div>
  ${m ? `<div class="seg" role="tablist" aria-label="Ver en"><button class="on" data-v="d" role="tab" aria-selected="true">Escritorio</button><button data-v="m" role="tab" aria-selected="false">Móvil</button></div>` : ''}
</div>
<div class="view-message">
  <span class="label">Para ${esc(first)}</span>
  <p class="view-msg">Lo he diseñado a partir de lo que me contaste. Es un <em>boceto</em>: los textos y las fotos los cerramos juntos. ¿Qué te parece? Dime lo que te gusta y lo que cambiarías, sin compromiso.</p>
  <div class="view-actions">
    <a class="btn-lime" href="mailto:${esc(C.CONTACTO_EMAIL)}?subject=${encodeURIComponent('Mi boceto: ' + b.negocio.nombre)}">Contestarte <span class="arr">→</span></a>
    <a class="btn-line" href="${esc(W)}/trabajos">Ver otros trabajos <span class="arr">→</span></a>
    <button class="btn-line" type="button" id="fullscreenBtn">Ver en grande <span class="arr">↗</span></button>
  </div>
</div>
<div class="view-stage" id="viewStage">
  <figure class="frame-d" id="vd"><div class="chrome"><span></span><span></span><span></span><b>boceto · ${esc(b.negocio.nombre)}</b></div>${d}</figure>
  ${m ? `<figure class="frame-m" id="vm" hidden><div class="notch"></div>${m}</figure>` : ''}
</div>
</main>
<div class="fullscreen-overlay" id="fullscreenOverlay" hidden>
  <button class="fullscreen-close" type="button" id="fullscreenClose" aria-label="Cerrar vista en grande">✕ Cerrar</button>
  <div class="fullscreen-content" id="fullscreenContent"></div>
</div>
<script>
(function(){
const fsBtn=document.getElementById('fullscreenBtn');
const fsOverlay=document.getElementById('fullscreenOverlay');
const fsClose=document.getElementById('fullscreenClose');
const fsContent=document.getElementById('fullscreenContent');
const vd=document.getElementById('vd');
const vm=document.getElementById('vm');
const viewStage=document.getElementById('viewStage');
let usingNativeFs=false;
${m ? `const segBtns=document.querySelectorAll('.seg button');
segBtns.forEach(b=>b.onclick=()=>{
  segBtns.forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-selected',x===b)});
  vd.hidden=b.dataset.v!=='d';
  vm.hidden=b.dataset.v!=='m';
});` : ''}
function openFullscreen(){
  const activeFrame=vm&&!vm.hidden?vm:vd;
  const iframe=activeFrame.querySelector('.view-frame');
  if(!iframe)return;
  const clone=iframe.cloneNode(true);
  clone.removeAttribute('id');
  fsContent.innerHTML='';
  fsContent.appendChild(clone);
  fsOverlay.removeAttribute('hidden');
  document.body.style.overflow='hidden';
  const reqFs=fsOverlay.requestFullscreen||fsOverlay.webkitRequestFullscreen||fsOverlay.webkitRequestFullScreen;
  if(reqFs){
    try{
      reqFs.call(fsOverlay).then(()=>{
        usingNativeFs=true;
      }).catch(()=>{
        usingNativeFs=false;
      });
    }catch(e){
      usingNativeFs=false;
    }
  }else{
    usingNativeFs=false;
  }
}
function closeFullscreen(){
  if(usingNativeFs){
    const exitFs=document.exitFullscreen||document.webkitExitFullscreen||document.webkitCancelFullScreen;
    if(exitFs){
      try{exitFs.call(document);}catch(e){cleanup();}
    }else{
      cleanup();
    }
  }else{
    cleanup();
  }
}
function cleanup(){
  usingNativeFs=false;
  fsOverlay.setAttribute('hidden','');
  document.body.style.overflow='';
  fsContent.innerHTML='';
}
fsBtn.onclick=openFullscreen;
fsClose.onclick=closeFullscreen;
document.addEventListener('fullscreenchange',()=>{
  if(!document.fullscreenElement&&!document.webkitFullscreenElement){
    cleanup();
  }
});
document.addEventListener('webkitfullscreenchange',()=>{
  if(!document.fullscreenElement&&!document.webkitFullscreenElement){
    cleanup();
  }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!usingNativeFs&&!fsOverlay.hidden){
    closeFullscreen();
  }
});
})();
</script>` });
}

function privacidad() {
  return page({ title: 'Privacidad del boceto · Jaime®', body: `<main class="legal"><span class="label">Legal</span><h1 class="section-title">Privacidad del <em>boceto</em></h1>
<p><b>Quién:</b> ${esc(C.ESTUDIO_TITULAR)} (${esc(C.ESTUDIO_NOMBRE)}). Contacto: <a href="mailto:${esc(C.CONTACTO_EMAIL)}">${esc(C.CONTACTO_EMAIL)}</a>.</p>
<p><b>Qué datos:</b> tu nombre, tu correo, tu teléfono si lo pones, lo que me cuentas de tu negocio y las imágenes que subas (logo y fotos).</p>
<p><b>Para qué:</b> prepararte el boceto, mandártelo y contestarte. Nada más. No se los paso a nadie ni uso tus fotos para otra cosa.</p>
<p><b>Por qué puedo:</b> porque me das tu permiso al marcar la casilla antes de enviar.</p>
<p><b>Dónde:</b> en el servidor donde funciona esta página y en mi correo, donde me llega tu encargo.</p>
<p><b>Cuánto tiempo:</b> mientras hablamos de tu proyecto. Si no seguimos adelante, lo borro todo, imágenes incluidas.</p>
<p><b>Tus derechos:</b> puedes pedirme verlos, corregirlos o borrarlos, o retirar el permiso, escribiéndome a ${esc(C.CONTACTO_EMAIL)}. Si crees que no los trato bien, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
<p><b>Sin cookies:</b> esta página no usa cookies. Solo guarda tus respuestas en tu navegador para que no las pierdas si recargas.</p>
<p><a class="btn-line" href="${B}/">Volver <span class="arr">→</span></a> <a class="btn-line" href="${esc(W)}/privacidad">Privacidad de la web <span class="arr">↗</span></a></p></main>` });
}

function bandeja(mails) {
  return page({ title: 'Bandeja de pruebas', noindex: true, body: `<main class="legal wide"><span class="label lime">Modo prueba</span><h1 class="section-title">Bandeja</h1>
<p>No hay SMTP configurado: los correos no salen, se guardan aquí. Solo existe en local: con <code>SMTP_HOST</code> o con <code>NODE_ENV=production</code> desaparece.</p>
<ul class="mails">${mails.map(m => `<li><a href="${B}/bandeja/${esc(m.id)}"><b>${esc(m.subject)}</b><span>Para: ${esc(m.to)} · ${esc(fecha(m.date))} · ${m.attachments.length} adjuntos</span></a></li>`).join('') || '<li class="muted">Todavía no hay correos.</li>'}</ul></main>` });
}
function mail(m) {
  const url = a => `${B}/bandeja/${esc(m.id)}/adjunto/${esc(a.filename)}`;
  const html = m.html.replace(/cid:([^"]+)/g, (_, cid) => { const a = m.attachments.find(x => x.cid === cid); return a ? url(a) : ''; });
  return page({ title: m.subject, noindex: true, body: `<main class="legal wide"><p><a class="back" href="${B}/bandeja">← Bandeja</a></p>
<dl class="mailhead"><dt>De</dt><dd>${esc(m.from)}</dd><dt>Para</dt><dd>${esc(m.to)}</dd><dt>Responder a</dt><dd>${esc(m.replyTo || '—')}</dd><dt>Asunto</dt><dd>${esc(m.subject)}</dd>
<dt>Adjuntos</dt><dd>${m.attachments.map(a => `<a href="${url(a)}">${esc(a.filename)}</a>`).join(' · ') || 'Ninguno'}</dd></dl>
<iframe class="mailframe" title="Email" sandbox srcdoc="${esc(html)}"></iframe></main>` });
}
function notFound(t, s) {
  return page({ title: t, noindex: true, body: `<main class="legal"><span class="label">404</span><h1 class="section-title">${esc(t)}</h1><p>${esc(s)}</p><p><a class="btn-lime" href="${B}/">Pedir un boceto <span class="arr">→</span></a></p></main>` });
}

// ---------- Panel privado ----------
const A = `${B}/admin`;
function adminPage(title, body) {
  return `${head(title + ' · Panel', true)}<body class="plain admin"><div class="grain" aria-hidden="true"></div>
<header class="nav"><a class="nav-logo" href="${A}/briefs"><span>Jaime<sup>®</sup></span> <span class="nav-sub">Panel de briefs</span></a>
<nav class="nav-links"><a href="${A}/briefs">Briefs</a><a href="${B}/" target="_blank">Formulario ↗</a></nav>
<span class="nav-priv">Privado</span></header>${body}</body></html>`;
}
const pill = e => `<span class="estado e-${esc(e)}">${esc(Br.estadoLabel(e))}</span>`;
const sw = c => `<span class="sws"><i style="background:${esc(c.principal)}"></i><i style="background:${esc(c.acento)}"></i></span>`;

function adminList(briefs, { estado, q, counts }) {
  const tabs = [['', 'Todos', counts.total], ...Br.O.ESTADOS.map(([id, l]) => [id, l, counts[id] || 0])];
  const qs = (e) => { const p = new URLSearchParams(); if (e) p.set('estado', e); if (q) p.set('q', q); const s = p.toString(); return s ? '?' + s : ''; };
  return adminPage('Briefs', `<main class="adm">
<div class="adm-head"><div><span class="label lime">Panel privado</span><h1 class="section-title">Briefs <em>recibidos</em></h1></div>
<div class="adm-actions"><a class="btn-line" href="${A}/export.json${qs(estado)}">Exportar JSON <span class="arr">↓</span></a><a class="btn-lime" href="${A}/export.zip${qs(estado)}">Descargar ZIP <span class="arr">↓</span></a></div></div>
<div class="adm-bar"><nav class="tabs" aria-label="Filtrar por estado">${tabs.map(([id, l, n]) => `<a href="${A}/briefs${qs(id)}"${(estado || '') === id ? ' aria-current="true"' : ''}>${esc(l)} <b>${n}</b></a>`).join('')}</nav>
<form class="search" method="get" action="${A}/briefs">${estado ? `<input type="hidden" name="estado" value="${esc(estado)}">` : ''}<input name="q" value="${esc(q || '')}" placeholder="Buscar negocio, nombre o correo" aria-label="Buscar"></form></div>
<ul class="briefs">${briefs.map(b => `<li><a href="${A}/briefs/${esc(b.id)}">
<span class="b-date">${esc(fecha(b.creado))}</span>
<span class="b-main"><b>${esc(b.negocio.nombre)}</b><small>${esc(Br.tipoLabel(b))} · ${esc(b.negocio.sector || 'Sin sector')} · ${esc(b.negocio.ciudad)}</small></span>
<span class="b-who">${esc(b.contacto.nombre)}<small>${esc(b.contacto.email)}</small></span>
<span class="b-meta">${sw(b.estilo.colores)}<small>${b.archivos.length} img · ${esc(origenLabel(b.origen))}</small></span>
${pill(b.estado)}</a></li>`).join('') || '<li class="empty">No hay briefs aquí todavía.</li>'}</ul>
</main>`);
}

function adminBrief(b, { csrf, flash }) {
  const enlace = Br.enlaceHref(b.negocio.enlace);
  const imgs = b.archivos.map(a => `<figure><a href="${A}/briefs/${esc(b.id)}/archivos/${esc(a.nombre)}" target="_blank"><img src="${A}/briefs/${esc(b.id)}/archivos/${esc(a.nombre)}" alt="${esc(a.original || a.nombre)}" loading="lazy"></a>
<figcaption><b>${a.campo === 'logo' ? 'Logo' : 'Foto'}</b> ${esc(a.original || a.nombre)} · ${Math.max(1, Math.round(a.bytes / 1024))} KB <a href="${A}/briefs/${esc(b.id)}/archivos/${esc(a.nombre)}?descargar=1">Descargar</a></figcaption></figure>`).join('');
  const val = (lab, v) => {
    if (lab === 'Colores') return `${sw(b.estilo.colores)} ${esc(v)}`;
    if (lab === 'Correo') return `<a href="mailto:${esc(v)}">${esc(v)}</a>`;
    if (lab === 'Instagram o web' && enlace) return `<a href="${esc(enlace)}" target="_blank" rel="noopener noreferrer">${esc(v)} ↗</a>`;
    return esc(v).replace(/\n/g, '<br>');
  };
  const pub = b.publicado;
  const link = pub ? `${C.BASE_URL}/b/${pub.token}` : '';
  const first = b.contacto.nombre.split(' ')[0];
  const mailto = pub ? `mailto:${encodeURIComponent(b.contacto.email)}?subject=${encodeURIComponent('Tu boceto para ' + b.negocio.nombre)}&body=${encodeURIComponent(`Hola, ${first}:\n\nAquí tienes el boceto que te he preparado para ${b.negocio.nombre}:\n${link}\n\nLo he hecho a partir de lo que me contaste. Dime qué te gusta y qué cambiarías, y lo afinamos juntos.\n\nUn saludo,\nJaime\n${C.ESTUDIO_NOMBRE} · ${C.ESTUDIO_WEB.replace(/^https?:\/\//, '')}`)}` : '';
  const hidden = `<input type="hidden" name="t" value="${esc(csrf)}">`;
  return adminPage(b.negocio.nombre, `<main class="adm">
<p><a class="back" href="${A}/briefs">← Todos los briefs</a></p>
${flash ? `<p class="flash" role="status">${esc(flash)}</p>` : ''}
<div class="adm-head"><div><span class="label lime">Brief · ${esc(fecha(b.creado, { dateStyle: 'long', timeStyle: 'short' }))} · ${esc(origenLabel(b.origen))}</span><h1 class="section-title">${esc(b.negocio.nombre)}</h1>
<p class="adm-sub">${esc(b.contacto.nombre)} quiere <em>${esc(Br.tipoLabel(b).toLowerCase())}</em> · ${esc(b.negocio.ciudad)}</p></div>
<div class="adm-actions"><a class="btn-line" href="${A}/briefs/${esc(b.id)}/zip">ZIP del brief <span class="arr">↓</span></a></div></div>
<form class="estados" method="post" action="${A}/briefs/${esc(b.id)}/estado">${hidden}<span class="label">Estado</span>
${Br.O.ESTADOS.map(([id, l]) => `<button name="estado" value="${id}" class="estado-btn${b.estado === id ? ' on' : ''}"${b.estado === id ? ' aria-pressed="true"' : ''}>${esc(l)}</button>`).join('')}</form>
<div class="adm-grid"><div class="adm-col">
${Br.secciones(b).map(([t, rows]) => `<section class="card-adm"><h2>${esc(t)}</h2><dl>${rows.map(([l, v]) => `<dt>${esc(l)}</dt><dd>${val(l, v)}</dd>`).join('')}</dl></section>`).join('')}
</div><aside class="adm-col">
<section class="card-adm pub"><h2>Boceto hecho a mano</h2>
${pub ? `<p class="muted">Publicado el ${esc(fecha(pub.fecha))} · ${pub.tipo === 'html' ? 'HTML' : 'imagen'}. Solo lo ve quien tenga el enlace.</p>
<p class="pub-link"><a href="${esc(link)}" target="_blank" id="pubLink">${esc(link)}</a></p>
<div class="pub-actions"><a class="btn-lime" href="${esc(mailto)}" id="prepMail">Preparar correo al cliente <span class="arr">→</span></a>
<form method="post" action="${A}/briefs/${esc(b.id)}/boceto/quitar">${hidden}<button class="btn-line">Despublicar</button></form></div>
<p class="hint">El correo se abre en tu programa de correo, desde tu dirección. No sale nada hasta que tú le das a enviar. Mándalo solo con el OK de Jaime.</p>`
    : '<p class="muted">Cuando el boceto esté listo y Jaime dé el OK, súbelo aquí para tener un enlace privado que mandarle al cliente.</p>'}
<form class="up" method="post" action="${A}/briefs/${esc(b.id)}/boceto" enctype="multipart/form-data">${hidden}
<label class="file"><span>Escritorio · PNG, JPG, WebP o un HTML</span><input type="file" name="escritorio" accept="image/png,image/jpeg,image/webp,text/html,.html" required></label>
<label class="file"><span>Móvil · opcional (con HTML no hace falta)</span><input type="file" name="movil" accept="image/png,image/jpeg,image/webp"></label>
<button class="btn-line">${pub ? 'Sustituir boceto' : 'Publicar boceto'} <span class="arr">↑</span></button></form></section>
<section class="card-adm"><h2>Logo y fotos <small>${b.archivos.length}</small></h2>${imgs ? `<div class="thumbs">${imgs}</div>` : '<p class="muted">No ha subido imágenes.</p>'}</section>
<section class="card-adm"><h2>Notas internas</h2><form method="post" action="${A}/briefs/${esc(b.id)}/notas">${hidden}
<textarea name="notas" rows="5" maxlength="4000" placeholder="Ideas para el boceto, qué dijo Jaime, cuándo se mandó…">${esc(b.notas || '')}</textarea><button class="btn-line">Guardar notas</button></form></section>
<section class="card-adm"><h2>Historial</h2><ol class="hist">${b.historial.slice().reverse().map(h => `<li>${pill(h.estado)} <small>${esc(fecha(h.fecha))}</small></li>`).join('')}</ol></section>
</aside></div></main>`);
}
function adminOff() {
  return adminPage('Panel apagado', `<main class="legal"><span class="label">Panel</span><h1 class="section-title">Panel <em>apagado</em></h1><p>Falta la variable <code>ADMIN_PASSWORD</code>. Ponla y reinicia el servidor.</p></main>`);
}

module.exports = { boceto, privacidad, bandeja, mail, notFound, page, adminList, adminBrief, adminOff };
