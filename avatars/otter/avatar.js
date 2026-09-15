/*
 * La nutria, envuelta como avatar del pet.
 *
 * Igual que el pingüino, esto es sólo el adaptador: draw.js ya devuelve
 * setState / look / poke / destroy, así que acá no hay más que declararla y
 * pasarle las opciones.
 */
window.PetAvatars.register({
  id: 'nutria',
  name: 'Nutria',
  palettes: [
    { id: 'colour', name: 'Río' },
    { id: 'marina', name: 'Marina' },
    { id: 'kelp', name: 'Kelp' }
  ],
  mount: function (host, opts) {
    return window.OtterMascot.mount(host, opts);
  }
});
