/*
 * El pingüino, envuelto como avatar del pet.
 *
 * Es sólo el adaptador: penguin-mascot.js ya devuelve setState / look / poke /
 * destroy, así que acá no hay más que declararlo y pasarle las opciones.
 * Un avatar que no cumpla el contrato se adapta en su propio archivo, igual
 * que este, sin tocar el pet.
 */
window.PetAvatars.register({
  id: 'pinguino',
  name: 'Pingüino',
  palettes: [
    { id: 'colour', name: 'Colour' },
    { id: 'riso', name: 'Riso' },
    { id: 'menta', name: 'Menta' }
  ],
  mount: function (host, opts) {
    return window.PenguinMascot.mount(host, opts);
  }
});
