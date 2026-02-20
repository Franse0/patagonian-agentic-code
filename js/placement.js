/* placement.js — Ship placement module for Batalla Naval */

window.Placement = (function () {
  'use strict';

  // --- Ship definitions ---
  const SHIPS = [
    { id: 'carrier', name: 'Portaaviones', size: 5 },
    { id: 'battleship', name: 'Acorazado', size: 4 },
    { id: 'cruiser', name: 'Crucero', size: 3 },
    { id: 'submarine', name: 'Submarino', size: 3 },
    { id: 'destroyer', name: 'Destructor', size: 2 },
  ];

  const ROWS = 'ABCDEFGHIJ';
  const COLS = 10;

  // --- State ---
  let orientation = 'H'; // 'H' or 'V'
  let selectedShipId = null;
  let placedShips = {}; // { [shipId]: cellIds[] }

  // --- DOM references (set during init) ---
  let boardEl = null;
  let onAllPlacedCallback = null;

  // --- Utility functions ---

  function cellIdToCoords(cellId) {
    // "cell-A1" → { row: 0, col: 0 }
    var match = cellId.match(/^cell-([A-J])(\d+)$/);
    if (!match) return null;
    var row = ROWS.indexOf(match[1]);
    var col = parseInt(match[2], 10) - 1;
    if (row < 0 || col < 0 || col >= COLS) return null;
    return { row: row, col: col };
  }

  function coordsToCellId(row, col) {
    if (row < 0 || row >= ROWS.length || col < 0 || col >= COLS) return null;
    return 'cell-' + ROWS[row] + (col + 1);
  }

  function getShipCells(startCellId, size, orient) {
    var coords = cellIdToCoords(startCellId);
    if (!coords) return null;
    var cells = [];
    for (var i = 0; i < size; i++) {
      var r = coords.row + (orient === 'V' ? i : 0);
      var c = coords.col + (orient === 'H' ? i : 0);
      var id = coordsToCellId(r, c);
      if (!id) return null; // out of bounds
      cells.push(id);
    }
    return cells;
  }

  // --- Validation ---

  function getOccupiedCells() {
    var occupied = {};
    Object.keys(placedShips).forEach(function (sid) {
      placedShips[sid].forEach(function (cid) {
        occupied[cid] = sid;
      });
    });
    return occupied;
  }

  function isValidPlacement(cellIds, excludeShipId) {
    if (!cellIds) return false;
    var occupied = getOccupiedCells();
    for (var i = 0; i < cellIds.length; i++) {
      var cid = cellIds[i];
      // Check if cell is within the board
      if (!cellIdToCoords(cid)) return false;
      // Check overlap (excluding the ship being moved, if any)
      if (occupied[cid] && occupied[cid] !== excludeShipId) return false;
    }
    return true;
  }

  // --- Ship placement ---

  function getShipById(shipId) {
    for (var i = 0; i < SHIPS.length; i++) {
      if (SHIPS[i].id === shipId) return SHIPS[i];
    }
    return null;
  }

  function placeShip(shipId, startCellId) {
    var ship = getShipById(shipId);
    if (!ship) return false;
    var cells = getShipCells(startCellId, ship.size, orientation);
    if (!isValidPlacement(cells, shipId)) return false;

    // Remove previous placement of this ship if any
    if (placedShips[shipId]) {
      removeCellClasses(placedShips[shipId], 'cell--ship');
    }

    placedShips[shipId] = cells;

    // Update board cells
    cells.forEach(function (cid) {
      var el = document.getElementById(cid);
      if (el) el.classList.add('cell--ship');
    });

    // Update ship panel
    var panel = document.querySelector('.ship-item[data-ship-id="' + shipId + '"]');
    if (panel) panel.classList.add('ship-item--placed');

    updateReadyButton();
    return true;
  }

  function removeShip(shipId) {
    if (!placedShips[shipId]) return;
    removeCellClasses(placedShips[shipId], 'cell--ship');
    delete placedShips[shipId];

    var panel = document.querySelector('.ship-item[data-ship-id="' + shipId + '"]');
    if (panel) panel.classList.remove('ship-item--placed');

    updateReadyButton();
  }

  function removeCellClasses(cellIds, className) {
    cellIds.forEach(function (cid) {
      var el = document.getElementById(cid);
      if (el) el.classList.remove(className);
    });
  }

  // --- Preview hover ---

  function clearPreview() {
    if (!boardEl) return;
    var previews = boardEl.querySelectorAll('.cell--preview, .cell--invalid');
    previews.forEach(function (el) {
      el.classList.remove('cell--preview', 'cell--invalid');
    });
  }

  function showPreview(startCellId) {
    clearPreview();
    if (!selectedShipId) return;
    var ship = getShipById(selectedShipId);
    if (!ship) return;
    var cells = getShipCells(startCellId, ship.size, orientation);
    if (!cells) {
      // Show invalid on the hovered cell at minimum
      var el = document.getElementById(startCellId);
      if (el) el.classList.add('cell--invalid');
      return;
    }
    var valid = isValidPlacement(cells, selectedShipId);
    var cls = valid ? 'cell--preview' : 'cell--invalid';
    cells.forEach(function (cid) {
      var el = document.getElementById(cid);
      if (el) el.classList.add(cls);
    });
  }

  // --- Random placement ---

  function clearAllPlacements() {
    Object.keys(placedShips).forEach(function (sid) {
      removeShip(sid);
    });
    selectedShipId = null;
    updateShipSelection();
  }

  function randomPlacement() {
    clearAllPlacements();

    var maxRetries = 5;
    for (var attempt = 0; attempt < maxRetries; attempt++) {
      // Reset for this attempt
      Object.keys(placedShips).forEach(function (sid) {
        removeCellClasses(placedShips[sid], 'cell--ship');
      });
      placedShips = {};

      var success = true;
      // Place ships from largest to smallest
      var sorted = SHIPS.slice().sort(function (a, b) { return b.size - a.size; });

      for (var s = 0; s < sorted.length; s++) {
        var ship = sorted[s];
        var placed = false;
        for (var t = 0; t < 200; t++) {
          var orient = Math.random() < 0.5 ? 'H' : 'V';
          var row = Math.floor(Math.random() * ROWS.length);
          var col = Math.floor(Math.random() * COLS);
          var startCell = coordsToCellId(row, col);
          var cells = getShipCells(startCell, ship.size, orient);
          if (cells && isValidPlacement(cells, null)) {
            placedShips[ship.id] = cells;
            placed = true;
            break;
          }
        }
        if (!placed) {
          success = false;
          break;
        }
      }

      if (success) {
        // Apply UI updates for all placed ships
        Object.keys(placedShips).forEach(function (sid) {
          placedShips[sid].forEach(function (cid) {
            var el = document.getElementById(cid);
            if (el) el.classList.add('cell--ship');
          });
          var panel = document.querySelector('.ship-item[data-ship-id="' + sid + '"]');
          if (panel) panel.classList.add('ship-item--placed');
        });
        selectedShipId = null;
        updateShipSelection();
        updateReadyButton();
        return true;
      }
    }
    return false;
  }

  // --- Ready button ---

  function updateReadyButton() {
    var btn = document.getElementById('btn-ready');
    if (!btn) return;
    var allPlaced = Object.keys(placedShips).length === SHIPS.length;
    btn.disabled = !allPlaced;
    if (onAllPlacedCallback) onAllPlacedCallback(allPlaced);
  }

  // --- Fleet state export ---

  function getFleetState() {
    var state = {};
    Object.keys(placedShips).forEach(function (sid) {
      state[sid] = placedShips[sid].slice();
    });
    return state;
  }

  // --- Ship selection UI ---

  function updateShipSelection() {
    var items = document.querySelectorAll('.ship-item');
    items.forEach(function (item) {
      if (item.dataset.shipId === selectedShipId) {
        item.classList.add('ship-item--active');
      } else {
        item.classList.remove('ship-item--active');
      }
    });
  }

  // --- Board generation ---

  function generateBoard(boardElement, isPlayerBoard) {
    boardElement.innerHTML = '';

    // Corner cell (empty)
    var corner = document.createElement('div');
    corner.className = 'board-label board-corner';
    boardElement.appendChild(corner);

    // Column headers
    for (var c = 1; c <= COLS; c++) {
      var colLabel = document.createElement('div');
      colLabel.className = 'board-label board-col-label';
      colLabel.textContent = c;
      boardElement.appendChild(colLabel);
    }

    // Rows
    for (var r = 0; r < ROWS.length; r++) {
      // Row label
      var rowLabel = document.createElement('div');
      rowLabel.className = 'board-label board-row-label';
      rowLabel.textContent = ROWS[r];
      boardElement.appendChild(rowLabel);

      // Cells
      for (var c = 0; c < COLS; c++) {
        var cell = document.createElement('div');
        var cellId = coordsToCellId(r, c);
        cell.id = (isPlayerBoard ? '' : 'enemy-') + cellId;
        if (isPlayerBoard) cell.id = cellId;
        else cell.id = 'enemy-' + cellId;
        cell.className = 'cell';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', 'Celda ' + ROWS[r] + (c + 1));
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (isPlayerBoard) {
          cell.setAttribute('tabindex', '0');
        }

        boardElement.appendChild(cell);
      }
    }
  }

  // --- Event binding ---

  function bindEvents() {
    // Ship selection from panel
    var shipItems = document.querySelectorAll('.ship-item');
    shipItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var sid = item.dataset.shipId;
        // If already placed, remove it for recolocation
        if (placedShips[sid]) {
          removeShip(sid);
        }
        selectedShipId = sid;
        updateShipSelection();
      });

    });

    // Orientation toggle
    var btnOrientation = document.getElementById('btn-orientation');
    if (btnOrientation) {
      btnOrientation.addEventListener('click', function () {
        orientation = orientation === 'H' ? 'V' : 'H';
        btnOrientation.textContent = orientation;
        btnOrientation.setAttribute('aria-label', 'Orientación: ' + (orientation === 'H' ? 'Horizontal' : 'Vertical'));
        btnOrientation.setAttribute('aria-pressed', orientation === 'V' ? 'true' : 'false');
      });
    }

    // Random button
    var btnRandom = document.getElementById('btn-random');
    if (btnRandom) {
      btnRandom.addEventListener('click', function () {
        randomPlacement();
      });
    }

    // Board hover and click
    if (boardEl) {
      boardEl.addEventListener('mouseover', function (e) {
        var cell = e.target.closest('.cell');
        if (!cell || !selectedShipId) return;
        showPreview(cell.id);
      });

      boardEl.addEventListener('mouseout', function (e) {
        var cell = e.target.closest('.cell');
        if (!cell) return;
        clearPreview();
      });

      boardEl.addEventListener('click', function (e) {
        var cell = e.target.closest('.cell');
        if (!cell || !selectedShipId) return;
        var success = placeShip(selectedShipId, cell.id);
        if (success) {
          clearPreview();
          selectedShipId = null;
          updateShipSelection();
        }
      });

      // Keyboard support for cells
      boardEl.addEventListener('keydown', function (e) {
        var cell = e.target.closest('.cell');
        if (!cell || !selectedShipId) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var success = placeShip(selectedShipId, cell.id);
          if (success) {
            clearPreview();
            selectedShipId = null;
            updateShipSelection();
          }
        }
      });
    }
  }

  // --- Init ---

  function init(options) {
    options = options || {};
    boardEl = document.getElementById('player-board');
    var enemyBoard = document.getElementById('enemy-board');
    onAllPlacedCallback = options.onAllPlaced || null;

    if (boardEl) generateBoard(boardEl, true);
    if (enemyBoard) generateBoard(enemyBoard, false);

    placedShips = {};
    selectedShipId = null;
    orientation = 'H';

    bindEvents();
    updateReadyButton();
  }

  // --- Public API ---
  return {
    SHIPS: SHIPS,
    init: init,
    getFleetState: getFleetState,
    randomPlacement: randomPlacement,
    clearAllPlacements: clearAllPlacements,
    // Exposed for testing
    cellIdToCoords: cellIdToCoords,
    coordsToCellId: coordsToCellId,
    getShipCells: getShipCells,
    isValidPlacement: isValidPlacement,
  };
})();
