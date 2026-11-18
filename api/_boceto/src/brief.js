'use strict';
// Validación del brief que llega del formulario y textos para leerlo (emails, panel, exportación).
const Mockup = require('../public/js/mockup.js');
const O = require('../public/js/opciones.js');

const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, n);
const line = (s, n) => clean(s, n).replace(/\s+/g, ' ');
const EMAIL = /^[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[a-z]{2,}$/i;
const arr = v => (Array.isArray(v) ? v : []);

function normalize(body) {
  body = body || {};
  const b = body.brief || {};
  const cfg = Mockup.normalize(b); // tipo, nombre, sector, colores, fuente, estilo, secciones
  const k = body.contacto || {};
  return {
    proyecto: { tipo: cfg.tipo },
    negocio: { nombre: cfg.nombre, sector: cfg.sector, ciudad: line(b.ciudad, 60), enlace: line(b.enlace, 200) },
    estilo: {
      paleta: line(b.paleta, 20),
      colores: cfg.colores,
      fuente: cfg.fuente,
      estilo: cfg.estilo,
      ambiente: O.AMBIENTES.filter(a => arr(b.ambiente).includes(a)).slice(0, O.MAX_AMBIENTES),
      referencias: clean(b.referencias, 1000)
    },
    contenido: {
      secciones: cfg.secciones,
      otras: line(b.otras, 200),
      objetivos: O.OBJETIVOS.map(o => o[0]).filter(o => arr(b.objetivos).includes(o)),
      detalle: clean(b.detalle, 1500)
    },
    contacto: { nombre: line(k.nombre, 80), email: line(k.email, 120).toLowerCase(), telefono: line(k.telefono, 30), mensaje: clean(k.mensaje, 1000) }
  };
}
function validate(n, privacidad) {
  const e = {};
  if (!n.negocio.nombre) e.negocio = 'Falta el nombre del negocio.';
  if (n.negocio.ciudad.length < 2) e.ciudad = 'Falta la ciudad o el pueblo.';
  if (n.contacto.nombre.length < 2) e.nombre = 'Escribe tu nombre.';
  if (!EMAIL.test(n.contacto.email)) e.email = 'Revisa el correo.';
  if (n.contacto.telefono && !/^[+\d][\d\s().-]{5,}$/.test(n.contacto.telefono)) e.telefono = 'Revisa el teléfono.';
  if (privacidad !== true) e.privacidad = 'Tienes que aceptar la política de privacidad.';
  return e;
}

// Enlace seguro a Instagram o a la web que nos dieron (solo http/https)
function enlaceHref(s) {
  s = String(s || '').trim();
  if (!s) return '';
  const ig = s.match(/^@?([A-Za-z0-9._]{2,30})$/);
  if (ig && (s.startsWith('@') || !s.includes('.'))) return `https://www.instagram.com/${ig[1]}/`;
  if (/^https?:\/\/[^\s<>"]+$/i.test(s)) return s;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s<>"]*)?$/i.test(s)) return 'https://' + s;
  return '';
}

const estadoLabel = id => (O.ESTADOS.find(e => e[0] === id) || [id, id])[1];
const objetivoLabel = id => (O.OBJETIVOS.find(o => o[0] === id) || [id, id])[1];

// Filas legibles del brief: [titulo, [[etiqueta, valor]]]
function secciones(b) {
  const r = Mockup.resumen({ tipo: b.proyecto.tipo, nombre: b.negocio.nombre, sector: b.negocio.sector, colores: b.estilo.colores, fuente: b.estilo.fuente, estilo: b.estilo.estilo, secciones: b.contenido.secciones });
  const fondo = Mockup.FONDOS[b.estilo.colores.fondo] || b.estilo.colores.fondo;
  return [
    ['Proyecto', [['Qué', r.tipo]]],
    ['Negocio', [['Nombre', b.negocio.nombre], ['Sector', b.negocio.sector || '—'], ['Ciudad', b.negocio.ciudad || '—'], ['Instagram o web', b.negocio.enlace || '—']]],
    ['Colores y estilo', [['Colores', `${b.estilo.colores.principal.toUpperCase()} · ${b.estilo.colores.acento.toUpperCase()} · fondo ${String(fondo).toLowerCase()}`], ['Letra', r.tipografia], ['Estilo', r.estilo], ['Ambiente', b.estilo.ambiente.join(', ') || '—'], ['Referencias', b.estilo.referencias || '—']]],
    ['Contenido', [['Secciones', ['Portada', ...(r.secciones === 'Solo portada' ? [] : [r.secciones])].join(', ') + (b.contenido.otras ? `, ${b.contenido.otras}` : '')], ['Quiere conseguir', b.contenido.objetivos.map(objetivoLabel).join(', ') || '—'], ['Más detalles', b.contenido.detalle || '—']]],
    ['Contacto', [['Nombre', b.contacto.nombre], ['Correo', b.contacto.email], ['Teléfono', b.contacto.telefono || '—'], ...(b.contacto.mensaje ? [['Mensaje', b.contacto.mensaje]] : [])]]
  ];
}
function tipoLabel(b) { return Mockup.TIPOS[b.proyecto.tipo] ? Mockup.TIPOS[b.proyecto.tipo].label : b.proyecto.tipo; }
function texto(b) {
  return secciones(b).map(([t, rows]) => `${t.toUpperCase()}\n` + rows.map(([k, v]) => `  ${k}: ${v}`).join('\n')).join('\n\n');
}
module.exports = { normalize, validate, enlaceHref, secciones, texto, tipoLabel, estadoLabel, objetivoLabel, O };
