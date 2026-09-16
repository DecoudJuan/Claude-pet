/*
 * El cangrejo, envuelto como avatar del pet.
 *
 * Igual que el resto: draw.js ya devuelve setState / look / poke / destroy, así
 * que acá no hay más que declararlo y pasarle las opciones.
 */
window.PetAvatars.register({
  id: 'cangrejo',
  name: 'Cangrejo',
  palettes: [
    { id: 'colour', name: 'Claude' },
    { id: 'coral', name: 'Coral' },
    { id: 'roca', name: 'Roca' }
  ],
  mount: function (host, opts) {
    return window.CrabMascot.mount(host, opts);
  }
});
