// En móvil / reduced-motion: J estática y sin Three.js.
// En escritorio: póster estático → 3D diferido. Wave solo en escritorio (también usa Three).
const stage = document.getElementById("stage");
const canvas = document.getElementById("gl");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 760px)").matches;
const light = reduce || mobile;

function showStaticJ() {
  if (!stage || stage.querySelector(".j-static-img")) return;
  document.documentElement.classList.add("j-static");
  if (canvas) canvas.hidden = true;
  const pic = document.createElement("picture");
  pic.className = "j-static-img";
  pic.setAttribute("aria-hidden", "true");
  pic.innerHTML =
    '<source srcset="./assets/j06.webp" type="image/webp" />' +
    '<img src="./assets/j06.png" alt="" width="1024" height="1024" decoding="async" />';
  const hero = document.getElementById("top");
  stage.insertBefore(pic, hero || stage.firstChild);
  window.__ready = Promise.resolve();
}

function clearStaticJ() {
  stage?.querySelector(".j-static-img")?.remove();
  if (canvas) canvas.hidden = false;
  document.documentElement.classList.remove("j-static");
}

function loadRest() {
  if (!light) import("./portfolio/wave.js");
  import("./portfolio/dither.js");
}

function bootRest() {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(loadRest, { timeout: 2500 });
  } else {
    setTimeout(loadRest, 800);
  }
}

async function load3D() {
  await import("./mezcla.js");
  if (window.__ready?.then) {
    await window.__ready.catch(() => {});
  }
  clearStaticJ();
}

showStaticJ();

if (light) {
  bootRest();
} else {
  const run = () => {
    load3D().catch(() => {}).finally(bootRest);
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(run, { timeout: 1600 });
  } else {
    setTimeout(run, 350);
  }
}
