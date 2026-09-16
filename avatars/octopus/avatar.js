/*
 * El pulpo, envuelto como avatar del pet.
 *
 * draw.js ya devuelve setState / look / poke / destroy — se lo da core/rig.js —
 * así que acá no hay más que declararlo y pasarle las opciones.
 */
window.PetAvatars.register({
  id: 'pulpo',
  name: 'Pulpo',
  palettes: [
    { id: 'colour', name: 'Violeta' },
    { id: 'coral', name: 'Coral' },
    { id: 'abisal', name: 'Abisal' }
  ],
  mount: function (host, opts) {
    return window.OctopusMascot.mount(host, opts);
  }
});
