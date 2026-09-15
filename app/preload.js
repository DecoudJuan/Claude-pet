'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  onCursor: function (cb) { ipcRenderer.on('cursor', function (_e, d) { cb(d); }); },
  onState: function (cb) { ipcRenderer.on('state', function (_e, d) { cb(d); }); },
  onConf: function (cb) { ipcRenderer.on('conf', function (_e, d) { cb(d); }); },
  onSide: function (cb) { ipcRenderer.on('side', function (_e, d) { cb(d); }); },
  // El proceso principal avisa que se va y espera a que el «Bye!» se vea.
  onFarewell: function (cb) { ipcRenderer.on('farewell', function () { cb(); }); },
  dragStart: function () { ipcRenderer.send('drag-start'); },
  dragEnd: function () { ipcRenderer.send('drag-end'); },
  menu: function () { ipcRenderer.send('menu'); },
  setSize: function (key) { ipcRenderer.send('set-size', key); },
  setAvatar: function (pick) { ipcRenderer.send('set-avatar', pick); },
  setInteractive: function (on) { ipcRenderer.send('interactive', on); },
  close: function () { ipcRenderer.send('close-pet'); }
});
