/*
 * El hámster, envuelto como avatar del pet.
 *
 * draw.js ya devuelve setState / look / poke / destroy — se lo da core/rig.js —
 * así que acá no hay más que declararlo y pasarle las opciones.
 */
window.PetAvatars.register({
  id: 'hamster',
  name: 'Hámster',
  palettes: [
    { id: 'colour', name: 'Dorado' },
    { id: 'gris', name: 'Gris' },
    { id: 'blanco', name: 'Blanco' }
  ],
  mount: function (host, opts) {
    return window.HamsterMascot.mount(host, opts);
  }
});
