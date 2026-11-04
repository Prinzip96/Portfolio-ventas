/**
 * Inyecta partials/site-footer.html en todos los HTML con marcadores
 * <!--site-footer:start--> … <!--site-footer:end-->
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const partial = fs.readFileSync(path.join(root, "partials", "site-footer.html"), "utf8").trim();
const start = "<!--site-footer:start-->";
const end = "<!--site-footer:end-->";
const block = `${start}\n${partial}\n${end}`;

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

let n = 0;
for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes(start) || !html.includes(end)) continue;
  const next = html.replace(
    new RegExp(`${start}[\\s\\S]*?${end}`),
    () => block
  );
  if (next !== html) {
    fs.writeFileSync(file, next);
    n += 1;
    console.log("footer →", path.relative(root, file));
  }
}

console.log(`Footer inyectado en ${n} archivo(s).`);
