// En móvil / reduced-motion: sin Three.js.
// En escritorio: 3D diferido. Wave solo en escritorio (también usa Three).
const stage = document.getElementById("stage");
const canvas = document.getElementById("gl");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 760px)").matches;
const light = reduce || mobile;

function flattenStage() {
  document.documentElement.classList.add("j-flat");
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
}

window.__ready = Promise.resolve();

if (light) {
  flattenStage();
  bootRest();
} else {
  const run = () => {
    load3D().catch(flattenStage).finally(bootRest);
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(run, { timeout: 1600 });
  } else {
    setTimeout(run, 350);
  }
}
