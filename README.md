# Web de venta · Estudio Jota

Sitio de captación para diseño web (negocios locales). Contacto por **correo** (`jaimesnchz9966@gmail.com`).

Repo: [Prinzip96/Portfolio-ventas](https://github.com/Prinzip96/Portfolio-ventas)

## Local

```bash
npm install
npm run build
npm run serve
```

Abre `http://localhost:8080`.

## Deploy (Vercel · plan Hobby gratis)

1. Importa el repo en [vercel.com/new](https://vercel.com/new).
2. Framework Preset: **Other**
3. Build Command: `npm run build`
4. Output Directory: `.`
5. Deploy

Tras el primer deploy, copia la URL `*.vercel.app` y sustitúyela en:
- `index.html` (canonical, og:*, JSON-LD)
- `sitemap.xml`
- `robots.txt`

Luego en [Google Search Console](https://search.google.com/search-console) añade la propiedad y envía el sitemap.

## Dominio propio (cuando lo tengas)

En Vercel → Project → Settings → Domains. Actualiza otra vez canonical / sitemap / OG a `https://tudominio.com`.
