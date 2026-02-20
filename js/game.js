/* game.js — Main game controller for Batalla Naval */

(function () {
  'use strict';

  var fleetState = null;

  function onReady() {
    fleetState = Placement.getFleetState();

    var placementPhase = document.getElementById('placement-phase');
    if (placementPhase) placementPhase.hidden = true;

    var status = document.getElementById('game-status');
    if (status) status.textContent = 'Barcos colocados. Esperando oponente...';
  }

  function getFleetState() {
    return fleetState;
  }

  document.addEventListener('DOMContentLoaded', function () {
    Placement.init({
      onAllPlaced: function (allPlaced) {
        var status = document.getElementById('game-status');
        if (status) {
          status.textContent = allPlaced
            ? 'Todos los barcos colocados. Presioná "Listo" para continuar.'
            : 'Colocá tus barcos para comenzar';
        }
      },
    });

    var btnReady = document.getElementById('btn-ready');
    if (btnReady) {
      btnReady.addEventListener('click', onReady);
    }
  });

  // Expose for future phases
  window.Game = {
    getFleetState: getFleetState,
  };
})();
