/* Opciones del brief que comparten el navegador y el servidor */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Opciones = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const AMBIENTES = ['Elegante', 'Cercano', 'Moderno', 'Natural', 'Atrevido', 'Minimalista', 'Clásico', 'Alegre'];
  const OBJETIVOS = [
    ['reservas', 'Que me reserven o pidan cita'],
    ['contacto', 'Que me llamen o escriban más'],
    ['google', 'Que me encuentren en Google'],
    ['vender', 'Vender online'],
    ['trabajo', 'Enseñar mi trabajo'],
    ['imagen', 'Dar una imagen más profesional'],
    ['gestion', 'Ahorrar tiempo en el día a día']
  ];
  const ESTADOS = [['nuevo', 'Nuevo'], ['en-curso', 'Boceto en curso'], ['enviado', 'Enviado'], ['respondido', 'Respondido']];
  const MAX_AMBIENTES = 3;
  const MAX_FOTOS = 4; // + 1 logo = 5 imágenes
  return { AMBIENTES, OBJETIVOS, ESTADOS, MAX_AMBIENTES, MAX_FOTOS };
});
