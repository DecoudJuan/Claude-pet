/*
 * La ratita, envuelto como avatar del pet.
 *
 * draw.js ya devuelve setState / look / poke / destroy — se lo da core/rig.js —
 * así que acá no hay más que declararlo y pasarle las opciones.
 */
window.PetAvatars.register({
  id: 'ratita',
  name: 'Ratita',
  palettes: [
    { id: 'colour', name: 'Gris' },
    { id: 'blanca', name: 'Blanca' },
    { id: 'campo', name: 'De campo' }
  ],
  mount: function (host, opts) {
    return window.RatMascot.mount(host, opts);
  }
});
