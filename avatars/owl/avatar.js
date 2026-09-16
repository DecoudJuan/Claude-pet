/*
 * El búho, envuelto como avatar del pet.
 *
 * draw.js ya devuelve setState / look / poke / destroy — se lo da core/rig.js —
 * así que acá no hay más que declararlo y pasarle las opciones.
 */
window.PetAvatars.register({
  id: 'buho',
  name: 'Búho',
  palettes: [
    { id: 'colour', name: 'Nocturno' },
    { id: 'nevado', name: 'Nevado' },
    { id: 'leonado', name: 'Leonado' }
  ],
  mount: function (host, opts) {
    return window.OwlMascot.mount(host, opts);
  }
});
