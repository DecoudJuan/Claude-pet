/*
 * El topo, envuelto como avatar del pet.
 *
 * draw.js ya devuelve setState / look / poke / destroy — se lo da core/rig.js —
 * así que acá no hay más que declararlo y pasarle las opciones.
 */
window.PetAvatars.register({
  id: 'topo',
  name: 'Topo',
  palettes: [
    { id: 'colour', name: 'Terciopelo' },
    { id: 'tierra', name: 'Tierra' },
    { id: 'albino', name: 'Albino' }
  ],
  mount: function (host, opts) {
    return window.MoleMascot.mount(host, opts);
  }
});
