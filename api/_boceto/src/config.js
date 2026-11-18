'use strict';
const path = require('path');
const env = process.env;
const PROD = env.NODE_ENV === 'production';
const PORT = Number(env.PORT || 3000);
const BASE_PATH = (env.BASE_PATH || '').replace(/\/+$/, '').replace(/^(?!\/|$)/, '/');
const on = v => /^(1|true|si|sí|yes)$/i.test(String(v || '').trim());
module.exports = {
  PROD,
  PORT,
  // Ruta bajo la que vive la app, p. ej. /boceto si se sirve en www.estudiojota.es/boceto (vacío = en la raíz)
  BASE_PATH,
  BASE_URL: (env.BASE_URL || `http://localhost:${PORT}${BASE_PATH}`).replace(/\/$/, ''),
  DATA_DIR: path.resolve(env.DATA_DIR || path.join(__dirname, '..', 'data')),
  // A dónde llega el aviso de cada brief nuevo (la bandeja de quien diseña los bocetos). Sin valor por defecto real.
  BRIEF_EMAIL: env.BRIEF_EMAIL || env.ESTUDIO_EMAIL || '',
  // Contraseña del panel /admin/briefs. Sin ella, el panel está apagado.
  ADMIN_PASSWORD: env.ADMIN_PASSWORD || '',
  // Correo automático «tengo tu encargo» al cliente. Apagado si no se pone ACUSE_CLIENTE=true. Nunca lleva boceto.
  ACUSE_CLIENTE: on(env.ACUSE_CLIENTE),
  // Plazo que se promete en la confirmación
  PLAZO: env.PLAZO || 'en menos de 24 h',
  // Subidas: máximo de imágenes y de MB por imagen
  MAX_ARCHIVOS: 5,
  MAX_MB: Number(env.MAX_MB || 8),
  // Envíos por IP cada 15 minutos
  LIMITE_ENVIOS: Number(env.LIMITE_ENVIOS || 6),
  ESTUDIO_NOMBRE: env.ESTUDIO_NOMBRE || 'Estudio Jota',
  ESTUDIO_TITULAR: env.ESTUDIO_TITULAR || 'Jaime Sánchez',
  ESTUDIO_WEB: (env.ESTUDIO_WEB || 'https://www.estudiojota.es').replace(/\/$/, ''),
  // Email público de contacto del botón «Escríbeme» (el mismo que usa la web)
  CONTACTO_EMAIL: env.CONTACTO_EMAIL || 'hola@estudiojota.es',
  // Correo real por SMTP propio o, si no hay, por el SMTP de Resend con RESEND_API_KEY
  SMTP_ON: Boolean(env.SMTP_HOST || env.RESEND_API_KEY),
  // Con un Blob de Vercel conectado se guarda ahí; si no, en DATA_DIR
  BLOB: Boolean(env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID)
};
