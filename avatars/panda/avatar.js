/*
 * El panda, envuelto como avatar del pet.
 *
 * Igual que el pingüino, esto es sólo el adaptador: draw.js ya devuelve
 * setState / look / poke / destroy, así que acá no hay más que declararla y
 * pasarle las opciones.
 */
window.PetAvatars.register({
  id: 'panda',
  name: 'Panda',
  accessories: [
    { id: 'none', name: 'Ninguno' },
    { id: 'airpods', name: 'AirPods' },
    { id: 'glasses', name: 'Anteojos' },
    { id: 'both', name: 'Ambos' }
  ],
  mount: function (host, opts) {
    return window.PandaMascot.mount(host, opts);
  }
});
