/** Sustituye <footer>…</footer> por marcadores y añade site-footer.css */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const skip = new Set(["node_modules", ".git", "partials"]);
const start = "<!--site-footer:start-->";
const end = "<!--site-footer:end-->";
const placeholder = `${start}\n${end}`;
const re = /<footer\b[\s\S]*?<\/footer>/i;

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

function cssHref(file) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (rel === "index.html" || /^(aviso-legal|privacidad|cookies)\.html$/i.test(rel)) {
    return "./css/site-footer.css";
  }
  return "/css/site-footer.css";
}

for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  if (!re.test(html) && !html.includes(start)) {
    console.log("skip", path.relative(root, file));
    continue;
  }
  if (!html.includes(start)) {
    html = html.replace(re, placeholder);
  }
  if (!html.includes("site-footer.css")) {
    const href = cssHref(file);
    const link = `  <link rel="stylesheet" href="${href}" />`;
    if (/href=["'][^"']*fonts\.css["']/.test(html)) {
      html = html.replace(/(<link[^>]*fonts\.css[^>]*>)/, `$1\n${link}`);
    } else if (/href=["'][^"']*styles\.css["']/.test(html)) {
      html = html.replace(/(<link[^>]*styles\.css[^>]*>)/, `$1\n${link}`);
    } else {
      html = html.replace(/<\/head>/i, `${link}\n</head>`);
    }
  }
  fs.writeFileSync(file, html);
  console.log("ok", path.relative(root, file));
}
