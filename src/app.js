// Hero 3D primero; wave y dither se cargan en idle para no bloquear el primer pintado.
import './mezcla.js';

const loadRest = () => {
  import('./portfolio/wave.js');
  import('./portfolio/dither.js');
};

if ('requestIdleCallback' in window) {
  requestIdleCallback(loadRest, { timeout: 2500 });
} else {
  setTimeout(loadRest, 800);
}
