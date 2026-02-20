# CLAUDE.md

Este archivo proporciona orientación a Claude Code al trabajar con código en este repositorio.

## Descripción del Proyecto

**Batalla Naval Multijugador** es un juego de batalla naval para dos jugadores en tiempo real, construido con HTML/CSS/JS vanilla y Firebase Realtime Database. Dos jugadores se conectan a una sala compartida, colocan sus barcos y se turnan para atacarse hasta que uno hunde toda la flota del otro.

## Stack Tecnológico

- **HTML5** - Marcado semántico
- **CSS3** - Estilos vanilla, animaciones CSS
- **JavaScript ES6+** - Lógica del juego, sin frameworks
- **Firebase Realtime Database** - Sincronización en tiempo real entre jugadores
- **No hay proceso de compilación** - Archivos estáticos servidos directamente

## Estructura del Proyecto

```
batalla-naval/
├── index.html              # Página principal del juego (SPA)
├── css/
│   └── styles.css          # Estilos principales
├── js/
│   ├── firebase-config.js  # Credenciales Firebase (en .gitignore, NO commitear)
│   ├── firebase-config.example.js  # Template sin credenciales (commiteable)
│   ├── firebase-game.js    # Lógica de Firebase (salas, sync, listeners)
│   ├── game.js             # Lógica principal del juego
│   └── ui.js               # Manipulación del DOM y UI
├── .claude/
│   └── commands/           # Comandos slash para ADW
├── adws/                   # Scripts de automatización ADW
├── specs/                  # Planes de implementación
└── CLAUDE.md               # Este archivo
```

## Firebase - Configuración

**IMPORTANTE**: `js/firebase-config.js` ya existe con las credenciales reales y está en `.gitignore`. NO crear ni sobreescribir este archivo.

El archivo exporta:
```js
export const db = getDatabase(app);
```

Para usar Firebase en cualquier módulo JS:
```js
import { db } from './firebase-config.js';
import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
```

### Estructura de datos en Firebase

```
rooms/{roomId}/
  status: "waiting" | "placing" | "playing" | "finished"
  player1: { id, ready, ships: {} }
  player2: { id, ready, ships: {} }
  currentTurn: "player1" | "player2"
  winner: "player1" | "player2" | null
  attacks: [ { cell, playerId, result } ]
```

## Fases del Juego

1. **Lobby** - Crear sala (genera código 6 chars) o unirse con código
2. **Colocación** - Cada jugador coloca sus 5 barcos en su tablero
3. **Combate** - Turnos alternados, atacar tablero enemigo
4. **Fin** - Pantalla de victoria/derrota, opción revancha

## Barcos Estándar

| Barco | Tamaño |
|---|---|
| Portaaviones | 5 celdas |
| Acorazado | 4 celdas |
| Crucero | 3 celdas |
| Submarino | 3 celdas |
| Destructor | 2 celdas |

## Tablero

- Grilla 10x10
- Filas: A-J
- Columnas: 1-10
- IDs de celda: `cell-A1`, `cell-B5`, etc.

## Comandos de Desarrollo

```bash
# Servidor local
python -m http.server 8000

# Ejecutar workflow ADW para un issue
uv run adws/adw_plan_build_review_document.py <issue-number>

# Iniciar webhook
uv run adws/trigger_webhook.py
```

## Principios de Arquitectura

- **SPA en un solo index.html** - No recargar página entre fases, mostrar/ocultar secciones
- **Separación de responsabilidades**:
  - `firebase-game.js` maneja toda la comunicación con Firebase
  - `game.js` contiene la lógica pura del juego (sin Firebase)
  - `ui.js` maneja el DOM y eventos del usuario
- **Módulos ES6** - Usar `import/export` entre archivos JS
- **Sin librerías externas** - Solo Firebase SDK via CDN
- **Firebase SDK v9 modular** via CDN: `https://www.gstatic.com/firebasejs/10.7.1/`

## ADW - Agent Development Workflow

```bash
# Workflow completo para un issue
uv run adws/adw_plan_build_review_document.py <issue-number>
```

### Al Planificar

- El plan va en `specs/feature-*.md` o `specs/bug-*.md`
- Respetar la separación de archivos JS definida arriba
- No tocar `js/firebase-config.js`
- El servidor de desarrollo corre en `http://localhost:8000`

### Al Implementar

- Leer el plan completo antes de comenzar
- Respetar la estructura de archivos del proyecto
- Los módulos JS deben usar `type="module"` en el HTML
- Para revisar: servidor debe estar corriendo en `localhost:8000`
