# Bug Fix: Spinner permanente al unirse a sala

## Bug Description
Cuando un jugador se une a una partida existente usando el código de sala, el spinner "Conectando..." se muestra correctamente pero **nunca se oculta** antes de transicionar al juego. Esto deja el spinner superpuesto sobre la pantalla de juego indefinidamente.

El flujo de "Crear sala" sí llama `hideSpinner()` correctamente antes de avanzar. El flujo de "Unirse" omite esta llamada en el camino feliz (éxito), aunque sí la llama en el `catch` (error).

## Steps to Reproduce
1. Jugador 1 crea una sala y obtiene el código de sala
2. Jugador 2 abre el juego, navega al lobby e ingresa el código
3. Jugador 2 presiona "Unirse"
4. El spinner "Conectando..." aparece
5. La transición al `game-container` ocurre (`handleBothConnected()`)

Result: El spinner permanece visible superpuesto sobre el tablero de juego.
Expected: El spinner se oculta antes de mostrar la pantalla de juego, igual que en el flujo de "Crear sala".

## Root Cause
En `js/game.js`, el handler del formulario `join-form` (línea ~577) llama a `showSpinner()` al iniciar la unión, pero en el bloque `try` nunca llama a `hideSpinner()` antes de `handleBothConnected()`:

```js
// js/game.js línea ~584-590
showSpinner();
try {
  var result = await FirebaseGame.joinRoom(code, playerId);
  window.Game.roomId = result.roomId;
  window.Game.playerKey = result.playerKey;
  handleBothConnected();  // ← hideSpinner() nunca fue llamado aquí
} catch (e) {
  hideSpinner();          // ← solo se llama en error
  setLobbyStatus(e.message, true);
}
```

Contraste con el flujo de "Crear sala" (línea ~545-552) que sí llama `hideSpinner()` en el éxito:

```js
showSpinner();
var result = await FirebaseGame.createRoom(playerId);
// ...
hideSpinner();  // ← correcto
```

## Solution Approach
Agregar `hideSpinner()` en el camino de éxito del handler de `join-form`, inmediatamente antes de `handleBothConnected()`. Esto hace que el flujo de "unirse" sea simétrico al de "crear sala" y elimina el spinner antes de la transición de pantalla.

## Relevant Files
Archivos a modificar para esta corrección de bug:

- **`js/game.js`** (líneas ~577-595) — Contiene el handler del formulario de unión donde falta la llamada a `hideSpinner()` en el camino de éxito.

## Implementation Plan
### Phase 1: Investigation
- Confirmar la causa raíz localizando el handler de `join-form` en `js/game.js`
- Verificar que `hideSpinner()` se llama correctamente en el flujo de "Crear sala" como referencia
- Confirmar que `hideSpinner()` ya existe y funciona (líneas ~88-101)

### Phase 2: Fix Implementation
- Agregar `hideSpinner()` antes de `handleBothConnected()` en el bloque `try` del handler de `join-form`

### Phase 3: Verification
- Correr el servidor de desarrollo local
- Reproducir el escenario: Jugador 1 crea sala, Jugador 2 se une
- Verificar que el spinner desaparece al transicionar al juego
- Verificar que el flujo de "Crear sala" sigue funcionando correctamente (sin regresión)
- Verificar que el error handling (código inválido) sigue mostrando el error correctamente

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Localizar y verificar la causa raíz
- Abrir `js/game.js` y navegar al handler de `joinForm` (línea ~576)
- Confirmar que el bloque `try` llama `showSpinner()` pero no `hideSpinner()` en éxito
- Verificar que el handler de `btnCreate` (línea ~543) sí llama `hideSpinner()` como referencia correcta

### 2) Aplicar el fix
- En `js/game.js`, dentro del handler de `join-form`, agregar `hideSpinner();` inmediatamente antes de `handleBothConnected()`:

```js
// Antes (incorrecto):
var result = await FirebaseGame.joinRoom(code, playerId);
window.Game.roomId = result.roomId;
window.Game.playerKey = result.playerKey;
handleBothConnected();

// Después (correcto):
var result = await FirebaseGame.joinRoom(code, playerId);
window.Game.roomId = result.roomId;
window.Game.playerKey = result.playerKey;
hideSpinner();
handleBothConnected();
```

### 3) Verificar que el camino de error no se afecta
- El bloque `catch` ya llama `hideSpinner()` — no debe modificarse
- Confirmar que si el código de sala no existe, el error se muestra correctamente

### 4) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar que el bug está corregido y hay cero regresiones.

## Testing Strategy
### Bug Reproduction Test
1. Abrir dos pestañas del navegador apuntando a `http://localhost:8000`
2. Pestaña 1: Crear sala → copiar código
3. Pestaña 2: Ingresar código → presionar "Unirse"
4. **Antes del fix**: el spinner permanece visible sobre el tablero
5. **Después del fix**: el spinner desaparece correctamente al entrar al juego

### Fix Verification
- Después de aplicar el fix, repetir los pasos del punto anterior
- Confirmar que el spinner NO aparece en la pantalla de juego (tablero visible y limpio)
- Confirmar que ambos jugadores ven el tablero sin elementos superpuestos

### Regression Testing
- Verificar flujo "Crear sala": spinner debe aparecer y desaparecer correctamente (sin cambios)
- Verificar flujo "Unirse con código inválido": debe mostrar mensaje de error (sin cambios)
- Verificar que la transición de lobby → juego funciona para ambos jugadores

## Acceptance Criteria
- El spinner se oculta correctamente al unirse a una sala (camino de éxito)
- La transición al juego es limpia sin elementos superpuestos
- El flujo de "unirse" es consistente con el de "crear sala"
- El manejo de errores (código inválido) sigue funcionando correctamente
- No se introdujeron regresiones en ningún otro flujo

## Validation Commands
- `python -m http.server 8000`

## Notes
- La corrección es mínima (una línea): solo agregar `hideSpinner()` antes de `handleBothConnected()` en el handler de join.
- No es necesario modificar `hideSpinner()` en sí, ya que la función funciona correctamente — solo falta la llamada.
- El spinner está definido en `index.html` línea 39 (`#loading-spinner`) con `hidden` por defecto; `showSpinner()` lo hace visible y oculta los controles del lobby.
