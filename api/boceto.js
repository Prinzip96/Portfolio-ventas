// Formulario de boceto en www.estudiojota.es/boceto (las rewrites de vercel.json mandan aquí /boceto y /boceto/*).
// Lo que no es secreto lleva aquí su valor por defecto; ADMIN_PASSWORD y las claves van solo en variables de entorno.
const D = {
  BASE_PATH: '/boceto',
  BASE_URL: 'https://www.estudiojota.es/boceto',
  BRIEF_EMAIL: 'hola@estudiojota.es',
  SMTP_FROM: 'Jaime · Estudio Jota <hola@estudiojota.es>',
  PLAZO: 'en menos de 48 h',
  ACUSE_CLIENTE: 'true'
};
for (const [k, v] of Object.entries(D)) if (!process.env[k]) process.env[k] = v;

const app = require('./_boceto/src/server');

module.exports = (req, res) => {
  if (req.url.startsWith('/api/boceto')) req.url = '/boceto' + req.url.slice('/api/boceto'.length);
  return app(req, res);
};
