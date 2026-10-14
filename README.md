# Web de venta · Estudio Jota

Sitio de captación para diseño web (negocios locales).  
Dominio: [estudiojota.es](https://www.estudiojota.es) · Contacto: `jaimesnchz9966@gmail.com`

Repo: [Prinzip96/Portfolio-ventas](https://github.com/Prinzip96/Portfolio-ventas)

## Local

```bash
npm install
npm run build
npm run serve
```

Abre `http://localhost:8080`.

## Deploy (Vercel · Hobby)

1. Importa el repo en [vercel.com/new](https://vercel.com/new).
2. Framework Preset: **Other**
3. Build Command: `npm run build`
4. Output Directory: `.`
5. Dominio: `estudiojota.es` + `www` en Settings → Domains

Canonical, OG, sitemap y robots ya apuntan a `https://www.estudiojota.es`.

## Legal

- `/aviso-legal.html`
- `/privacidad.html`
- `/cookies.html`

Banner de cookies + captcha matemático en el formulario (además de honeypot). FormSubmit sigue con `_captcha: false` porque el anti-bot lo hacemos nosotros.

## Indexar en Google

1. Entra en [Google Search Console](https://search.google.com/search-console).
2. Añade la propiedad **Dominio** `estudiojota.es` (DNS TXT) o **Prefijo URL** `https://www.estudiojota.es`.
3. Cuando esté verificada, pega el meta en `index.html` (hay un comentario en el `<head>`).
4. Sitemaps → añade `https://www.estudiojota.es/sitemap.xml`.
5. Inspección de URL → `https://www.estudiojota.es/` → **Solicitar indexación**.

Opcional: [Bing Webmaster Tools](https://www.bing.com/webmasters) con el mismo sitemap.
