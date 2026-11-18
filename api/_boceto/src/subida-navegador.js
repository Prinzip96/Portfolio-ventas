// Entrada para esbuild: genera public/js/subida.js, que el formulario carga solo al enviar con imágenes.
// Se compila como script normal (window.subidaBlob): Vercel pasa a CommonJS los .js con export de la función y el navegador no puede usarlos.
export { upload } from '@vercel/blob/client';
