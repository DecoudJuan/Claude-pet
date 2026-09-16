/*
 * El murciélago, envuelto como avatar del pet.
 *
 * draw.js ya devuelve setState / look / poke / destroy — se lo da core/rig.js —
 * así que acá no hay más que declararlo y pasarle las opciones.
 */
window.PetAvatars.register({
  id: 'murcielago',
  name: 'Murciélago',
  palettes: [
    { id: 'colour', name: 'Nocturno' },
    { id: 'frutero', name: 'Frutero' },
    { id: 'albino', name: 'Albino' }
  ],
  mount: function (host, opts) {
    return window.BatMascot.mount(host, opts);
  }
});
