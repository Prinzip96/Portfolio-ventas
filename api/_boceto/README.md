# Pide tu boceto · Estudio Jota

> **Publicado en `www.estudiojota.es/boceto`, dentro del proyecto de Vercel de la web.** La función `api/boceto.js` sirve esta app; las *rewrites* de `vercel.json` le mandan `/boceto` y `/boceto/*`. Los briefs, las imágenes y los bocetos se guardan en un Blob privado de Vercel (`BLOB_READ_WRITE_TOKEN`); en local, sin Blob, en `DATA_DIR`. Los correos salen por el SMTP de Resend con `RESEND_API_KEY`. En Vercel el recuento de pasos solo queda en los logs de la función, y el boceto que se sube desde el panel admite como mucho 4 MB por archivo.

Formulario para captar clientes con la cara de estudiojota.es. El visitante cuenta lo que quiere en 6 pasos y **el boceto se diseña a mano** después:

1. **Qué necesita**: web en WordPress, web a medida (código) o app web.
2. **Negocio**: nombre, sector, ciudad, Instagram o web actual (si tiene).
3. **Colores y estilo**: paleta o colores propios, fondo, letra, estilo, cómo quiere que se sienta (hasta 3) y referencias.
4. **Secciones y objetivo**: secciones, otras que quiera, qué quiere conseguir y más detalles.
5. **Logo y fotos** (opcional): 1 logo + hasta 4 fotos, solo imágenes, comprobadas en el servidor.
6. **Contacto** + casilla de privacidad.

Mientras responde ve una **muestra rápida** con sus colores y su estilo (en escritorio y móvil), con un aviso fijo: «Es solo una muestra… Tu boceto de verdad lo diseño yo, a mano, y te llega en menos de 24 h».

## El flujo

```
Cliente rellena el brief
   → se guarda en DATA_DIR (JSON + imágenes)
   → aviso por correo a BRIEF_EMAIL con el brief completo y las imágenes adjuntas
   → (opcional, apagado por defecto) correo «tengo tu encargo» al cliente, sin boceto
Asistente abre el brief en /admin/briefs → «Boceto en curso» → diseña el boceto a mano
   → lo sube al panel (PNG/JPG/WebP o un HTML) → enlace privado /b/<token>
Jaime revisa y da el OK
   → «Preparar correo al cliente» abre un borrador en el programa de correo, desde su dirección
   → se envía a mano → «Enviado» → cuando contesta, «Respondido»
```

Ningún correo al cliente lleva boceto automáticamente. El boceto sale solo cuando una persona lo envía.

## Arrancar en local

Requisitos: Node 20 o superior.

```bash
npm install
ADMIN_PASSWORD=una-clave-larga npm start                    # http://localhost:3000
# o como irá en la web:
BASE_PATH=/boceto ADMIN_PASSWORD=una-clave-larga npm start  # http://localhost:3000/boceto
```

- Formulario: `/` (o `/boceto`)
- Panel privado: `/admin/briefs` (usuario: cualquiera; contraseña: `ADMIN_PASSWORD`)
- Bandeja de pruebas (correos que «se habrían enviado»): `/bandeja`
- Boceto publicado: `/b/<token>` (el enlace que da el panel)
- Privacidad: `/privacidad`

Sin SMTP configurado **no sale ningún correo de verdad**: se guardan en `data/bandeja/` y, en local, se ven en `/bandeja` (con `NODE_ENV=production` esa página no existe).

Otros comandos:

```bash
npm run dev     # se reinicia al cambiar código
npm test        # prueba completa con navegador (bajo /boceto): 6 pasos con imágenes, aviso, panel, publicar,
                # exportar, móvil, embudo y acuse; capturas en shots/ y vídeo demo.mp4
npm run stats   # embudo de los últimos 30 días: visitas por paso, envíos y origen
```

Para `npm test` hace falta el navegador de Playwright la primera vez: `npx playwright install chromium`. La prueba usa carpetas temporales; no toca `data/`.

## Panel privado (`/admin/briefs`)

- **Lista** con filtro por estado (Nuevo, Boceto en curso, Enviado, Respondido), búsqueda y recuento.
- **Ficha** de cada brief: todo lo que contó, colores, enlaces, imágenes (ver y descargar), estado con historial y notas internas.
- **Boceto hecho a mano**: se sube una imagen de escritorio (y si se quiere, otra de móvil) o un HTML de un solo archivo. Da un enlace privado `/b/<token>` (aleatorio, no se indexa) y el botón «Preparar correo al cliente», que abre un `mailto:` con el texto y el enlace: no envía nada. Se puede sustituir (el enlace no cambia) o despublicar.
- **Exportar**: `GET /admin/export.json` (todos o `?estado=nuevo`), `GET /admin/export.zip` (cada brief en su carpeta: `brief.json`, `brief.txt`, `archivos/`, `boceto/`), y por brief `GET /admin/briefs/<id>/zip` y `/json`. Con `curl -u x:$ADMIN_PASSWORD …` se descargan desde la terminal.

Seguridad: contraseña por HTTP Basic (comparación en tiempo constante, 20 fallos cada 15 min por IP), token en todos los formularios del panel, `no-store` y `noindex`. El HTML de un boceto se sirve con `Content-Security-Policy: sandbox`, así que no puede leer nada del panel. **Usar siempre por HTTPS** (Vercel lo da).

## Cómo funciona

| Pieza | Archivo |
|---|---|
| Formulario (6 pasos, muestra en directo, subida de imágenes con progreso, guardado en el navegador por si recarga) | `public/index.html`, `public/js/app.js`, `public/css/app.css` |
| Muestra rápida (SVG en el navegador con los colores y el estilo elegidos) | `public/js/mockup.js` |
| Opciones compartidas (ambientes, objetivos, estados) | `public/js/opciones.js` |
| Servidor: valida, guarda y avisa | `src/server.js` |
| Validación del brief y textos para leerlo | `src/brief.js` |
| Subidas: límites y comprobación de que cada archivo es una imagen de verdad (por sus primeros bytes) | `src/upload.js` |
| Panel privado y exportación | `src/admin.js`, `src/zip.js` |
| Correos (aviso y acuse opcional) | `src/mailer.js` |
| Páginas del servidor (panel, boceto publicado, privacidad, bandeja) | `src/views.js` |
| Disco: `data/briefs/<id>/brief.json`, `archivos/`, `boceto/`; `data/bandeja/`; `data/stats.json` | `src/store.js` |

Imágenes que acepta: JPG, PNG y WebP (el logo también en SVG), hasta `MAX_MB` cada una, 1 logo + 4 fotos. Se comprueba en el navegador y otra vez en el servidor mirando el contenido, no la extensión. Las fotos HEIC de iPhone se rechazan con un mensaje para exportarlas como JPG.

Origen de la visita: si se entra con `?o=bio`, `?o=reel`, `?o=dm`… se guarda en el brief, sale en el aviso, en el panel y en `npm run stats`. El recuento de pasos es anónimo (sin cookies ni datos personales).

Protección básica: casilla de privacidad obligatoria, campo trampa anti-bots, `LIMITE_ENVIOS` por IP cada 15 minutos y validación de todo en el servidor.

## Variables de entorno

Ver `.env.example`.

| Variable | Para qué |
|---|---|
| `BRIEF_EMAIL` | **A dónde llega el aviso de cada brief.** Vacío a propósito (pendiente de decidir: `hola@estudiojota.es` o una bandeja aparte). Con SMTP, el servidor no arranca sin él. |
| `ADMIN_PASSWORD` | Contraseña del panel. Sin ella, el panel está apagado. En producción, mínimo 12 caracteres. |
| `ACUSE_CLIENTE` | `true` para mandar al cliente el correo «tengo tu encargo» (sin boceto). Apagado por defecto. |
| `PLAZO` | Texto del plazo que se promete. Por defecto «en menos de 24 h». |
| `MAX_MB`, `LIMITE_ENVIOS` | Tamaño máximo por imagen (8 MB) y envíos por IP cada 15 minutos (6). |
| `BASE_PATH`, `BASE_URL` | Ruta (`/boceto`) y URL pública completa (`https://www.estudiojota.es/boceto`). |
| `CONTACTO_EMAIL` | Email del botón «Escríbeme» y del «responder» del acuse (por defecto `hola@estudiojota.es`, el de la web). |
| `DATA_DIR` | Carpeta de datos. En el hosting tiene que ser un disco persistente. |
| `SMTP_*` | Correo real. Sin `SMTP_HOST` → modo prueba y `/bandeja` activa. Con `SMTP_HOST`, `/bandeja` desaparece. |
| `ESTUDIO_NOMBRE`, `ESTUDIO_TITULAR`, `ESTUDIO_WEB` | Textos de los correos y de la privacidad. |

`ESTUDIO_EMAIL` (de la versión anterior) sigue valiendo como sustituto de `BRIEF_EMAIL`.

## Publicarlo

Va dentro del proyecto `portfolio-ventas` de Vercel: cada push a `main` lo publica junto con la web. Variables en Vercel: `ADMIN_PASSWORD`, `RESEND_API_KEY` y el Blob privado conectado (`BLOB_READ_WRITE_TOKEN`). El resto de valores por defecto (`BASE_PATH`, `BRIEF_EMAIL`, `PLAZO`, `ACUSE_CLIENTE`, remitente) está en `api/boceto.js` y se puede cambiar con una variable del mismo nombre.

## Fuentes

Las fuentes (Inter, Instrument Serif, Plus Jakarta Sans, Playfair Display, Bricolage Grotesque y Fraunces, todas con licencia OFL) están en `public/fonts` en WOFF2, recortadas a caracteres latinos. Se sirven desde el propio servidor; no se carga nada de Google. `scripts/build-fonts.py` las regenera.
