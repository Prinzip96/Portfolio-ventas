/** Añade favicon.ico, apple-touch-icon y twitter:image donde falten */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const skip = new Set(["node_modules", ".git", "partials"]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (skip.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith(".html")) out.push(full);
  }
  return out;
}

function iconBase(file) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (rel === "index.html" || /^(aviso-legal|privacidad|cookies|404)\.html$/i.test(rel)) {
    return "./";
  }
  return "/";
}

for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  const base = iconBase(file);
  let changed = false;

  if (!html.includes("apple-touch-icon")) {
    const icons =
      `  <link rel="icon" href="${base}favicon.ico" sizes="any" />\n` +
      `  <link rel="apple-touch-icon" href="${base}apple-touch-icon.png" />`;
    if (/favicon\.svg/.test(html)) {
      html = html.replace(/(<link[^>]*favicon\.svg[^>]*>)/, `$1\n${icons}`);
      changed = true;
    } else if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${icons}\n</head>`);
      changed = true;
    }
  }

  if (
    /og:image/.test(html) &&
    /twitter:card/.test(html) &&
    !/twitter:image/.test(html)
  ) {
    html = html.replace(
      /(<meta\s+name="twitter:card"[^>]*>)/i,
      `$1\n  <meta name="twitter:image" content="https://www.estudiojota.es/assets/og.jpg" />`
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, html);
    console.log("patched", path.relative(root, file));
  }
}
