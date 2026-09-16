/*
 * El gato, envuelto como avatar del pet.
 *
 * draw.js ya devuelve setState / look / poke / destroy — se lo da core/rig.js —
 * así que acá no hay más que declararlo y pasarle las opciones.
 */
window.PetAvatars.register({
  id: 'gato',
  name: 'Gato',
  palettes: [
    { id: 'colour', name: 'Atigrado' },
    { id: 'negro', name: 'Negro' },
    { id: 'siames', name: 'Siamés' }
  ],
  mount: function (host, opts) {
    return window.CatMascot.mount(host, opts);
  }
});
