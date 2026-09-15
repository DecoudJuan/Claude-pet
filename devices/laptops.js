/*
 * Las notebooks que vienen de fábrica.
 *
 * Cada una es una tapa y un logo. Para sumar una variante de color no hace
 * falta nada más que otro register() con otro id — mirá las dos MacBook de
 * abajo: mismo logo, distinta tapa.
 */
[
  { id: 'macbook',          name: 'MacBook',            lid: '#c9ccd1', badge: 'glow', badgeColor: '#8b9096' },
  { id: 'macbook-space-gray', name: 'MacBook · Space Gray', lid: '#5f646b', badge: 'apple', badgeColor: '#d9dde1' },
  { id: 'macbook-midnight', name: 'MacBook · Midnight', lid: '#2b3442', badge: 'glow', badgeColor: '#c3ccd8' },
  { id: 'macbook-negra',    name: 'MacBook · Negra',    lid: '#16181b', badge: 'glow', badgeColor: '#9aa0a6' },

  { id: 'ideapad',          name: 'IdeaPad',            lid: '#6c737c', badge: 'bar',  badgeColor: '#e2e6ea' },
  { id: 'thinkpad',         name: 'ThinkPad',           lid: '#1a1c1f', badge: 'bar',  badgeColor: '#d1332e' },

  { id: 'hp',               name: 'HP',                 lid: '#2f3944', badge: 'ring', badgeColor: '#b8c4d0' },
  { id: 'hp-gris',          name: 'HP · Gris',          lid: '#9aa3ad', badge: 'ring', badgeColor: '#4a535d' },

  { id: 'samsung',          name: 'Samsung',            lid: '#dfe3e8', badge: 'bar',  badgeColor: '#5b6673' },
  { id: 'dell',             name: 'Dell',               lid: '#232a33', badge: 'ring', badgeColor: '#9dc3e6' },

  { id: 'sin-marca',        name: 'Sin marca',          lid: '#1f252d', badge: 'none' }
].forEach(window.PetDevices.register);
