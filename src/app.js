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
  let loaded = false;
  const run = () => {
    if (loaded) return;
    loaded = true;
    load3D().catch(flattenStage).finally(bootRest);
  };
  
  // Esperar a la primera interacción significativa (scroll, click, touch) o timeout largo
  const onInteract = () => {
    removeEventListener("scroll", onInteract, { passive: true });
    removeEventListener("click", onInteract);
    removeEventListener("touchstart", onInteract, { passive: true });
    run();
  };
  
  addEventListener("scroll", onInteract, { passive: true });
  addEventListener("click", onInteract);
  addEventListener("touchstart", onInteract, { passive: true });
  
  // Fallback: cargar después de 3s si no hay interacción
  if ("requestIdleCallback" in window) {
    requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 3000);
  }
}
