'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/*
 * Lo único que la página ve del proceso principal. No se expone `ipcRenderer`:
 * se exponen funciones sueltas, así que la página no puede emitir un mensaje
 * arbitrario, sólo los que están acá declarados.
 *
 * Nada de esto abre una puerta nueva al sistema: instalar los hooks, copiar el
 * bloque y abrir la página de releases los HACE el proceso principal, que ya
 * podía hacerlos. La página sólo pide.
 */
contextBridge.exposeInMainWorld('pet', {
  onCursor: function (cb) { ipcRenderer.on('cursor', function (_e, d) { cb(d); }); },
  onState: function (cb) { ipcRenderer.on('state', function (_e, d) { cb(d); }); },
  onConf: function (cb) { ipcRenderer.on('conf', function (_e, d) { cb(d); }); },
  onSide: function (cb) { ipcRenderer.on('side', function (_e, d) { cb(d); }); },
  // El proceso principal avisa que se va y espera a que el «Bye!» se vea.
  onFarewell: function (cb) { ipcRenderer.on('farewell', function () { cb(); }); },
  // Si los hooks están puestos o falta ese paso, y cómo salió instalarlos.
  onSetup: function (cb) { ipcRenderer.on('setup', function (_e, d) { cb(d); }); },
  // Salió una versión nueva. Sólo llega si el chequeo está activado.
  onUpdate: function (cb) { ipcRenderer.on('update', function (_e, d) { cb(d); }); },
  // El chequeo se prende y se apaga desde dos lados —el check del panel y el
  // menú del botón derecho—, así que el que no lo tocó tiene que enterarse.
  onUpdatesPref: function (cb) { ipcRenderer.on('updates-pref', function (_e, d) { cb(d); }); },
  dragStart: function () { ipcRenderer.send('drag-start'); },
  dragEnd: function () { ipcRenderer.send('drag-end'); },
  menu: function () { ipcRenderer.send('menu'); },
  setSize: function (key) { ipcRenderer.send('set-size', key); },
  setAvatar: function (pick) { ipcRenderer.send('set-avatar', pick); },
  setInteractive: function (on) { ipcRenderer.send('interactive', on); },
  installHooks: function () { ipcRenderer.send('install-hooks'); },
  copyHooks: function () { ipcRenderer.send('copy-hooks'); },
  revealSettings: function () { ipcRenderer.send('reveal-settings'); },
  setUpdates: function (on) { ipcRenderer.send('set-updates', !!on); },
  openReleases: function (url) { ipcRenderer.send('open-releases', url); },
  close: function () { ipcRenderer.send('close-pet'); }
});
