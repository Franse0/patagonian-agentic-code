# Feature: Botón para Abandonar la Partida

## Feature Description
Agregar un botón "Abandonar partida" visible durante las fases de colocación de barcos y combate. Al presionarlo, se muestra un diálogo de confirmación nativo del navegador. Si el jugador confirma, la sesión se limpia y la página se recarga, llevándolo de vuelta al lobby. Si cancela, la partida continúa normalmente sin interrupciones.

## User Story
As a jugador activo en una partida
I want poder abandonar la partida en cualquier momento durante la colocación o el combate
So that pueda volver al lobby sin quedar atrapado en el juego si el oponente se va o simplemente quiero salir

## Problem Statement
Una vez que ambos jugadores están conectados y el `#game-container` es visible, no existe ningún botón para salir de la partida en curso. El único "Salir" disponible está en la pantalla de fin de juego (`#end-screen`), inaccesible mientras el juego está activo. Esto obliga al jugador a cerrar o recargar el navegador manualmente.

## Solution Approach
Agregar un botón `#btn-abandon` dentro de `#game-container` en `index.html`. Al estar dentro del contenedor principal del juego, hereda la visibilidad del mismo: aparece cuando `#game-container` es visible (colocación y combate) y desaparece automáticamente cuando se oculta (lobby, pantalla de inicio, fin de partida). El handler en `game.js` usa `window.confirm()` para pedir confirmación y, si el usuario acepta, limpia la sesión con `clearSession()` y recarga la página con `window.location.reload()`.

## Relevant Files

- **`index.html`** — Agregar el elemento `<button id="btn-abandon">` dentro de `#game-container`, junto al `#btn-toggle-board` existente.
- **`js/game.js`** — Agregar el event listener para `#btn-abandon`. Reutilizar la función `clearSession()` ya importada desde `./session.js`. No requiere lógica adicional en Firebase.
- **`css/styles.css`** — Agregar estilos para `#btn-abandon`, usando la paleta existente con color de acción secundaria/peligro para diferenciarlo de los demás botones.

## Implementation Plan

### Phase 1: Foundation
Colocar el botón en el HTML dentro de `#game-container`, sin atributo `hidden`, para que su visibilidad quede acoplada a la del contenedor. Definir los estilos CSS siguiendo las convenciones del proyecto (`#btn-toggle-board` como referencia).

### Phase 2: Core Implementation
Conectar el event listener en `game.js`, reutilizando `clearSession()` ya importado. El flujo: `window.confirm()` → si acepta → `clearSession()` → `window.location.reload()`.

### Phase 3: Integration
Verificar que el botón no interfiere con las transiciones de fases existentes:
- Fase **waiting/lobby** → `#game-container` está oculto → botón no visible. ✓
- Fase **placing** → `#game-container` visible → botón visible. ✓
- Fase **playing** → `#game-container` visible → botón visible. ✓
- Fase **finished** → `hideScreen(gameContainer)` oculta el contenedor → botón desaparece. ✓

## Step-by-Step Tasks

### 1) Agregar el botón en `index.html`
- Abrir `index.html` y ubicar `<main id="game-container" hidden>`.
- Agregar `<button id="btn-abandon">` inmediatamente después del `#btn-toggle-board` existente, sin atributo `hidden`.
- Texto del botón: "Abandonar partida". Agregar `type="button"` y `aria-label` descriptivo.

```html
<button id="btn-abandon" type="button"
        aria-label="Abandonar la partida actual y volver al lobby">
  Abandonar partida
</button>
```

### 2) Agregar estilos en `css/styles.css`
- Localizar la sección `/* === Board toggle button === */` y agregar el estilo de `#btn-abandon` a continuación.
- Usar `display: inline-flex`, `padding` y `font-size` consistentes con `#btn-toggle-board`.
- Color de fondo con tono de acción secundaria (variante oscura/danger): diferenciar del primario azul.

```css
#btn-abandon {
  display: inline-flex;
  padding: 0.5rem 1.1rem;
  font-size: 0.9rem;
  font-weight: 600;
  background: var(--color-btn-bg);
  color: var(--color-heading);
  border: 2px solid #b03030;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

#btn-abandon:hover {
  background: #b03030;
  border-color: #b03030;
  color: #fff;
}
```

### 3) Agregar event listener en `js/game.js`
- Ubicar en `game.js` la sección de inicialización donde se registran otros listeners de botones (cerca de `btn-exit`, `btn-rematch`, `btn-toggle-board`).
- Agregar el handler para `#btn-abandon`:

```js
var btnAbandon = document.getElementById('btn-abandon');
if (btnAbandon) {
  btnAbandon.addEventListener('click', function () {
    var confirmed = window.confirm('¿Seguro que querés abandonar la partida?');
    if (confirmed) {
      clearSession();
      window.location.reload();
    }
  });
}
```

- `clearSession` ya está importado desde `./session.js` en la parte superior del archivo.

### 4) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy

### Manual Testing
1. **Flujo cancelar:** Crear sala → conectar dos jugadores → fase de colocación → presionar "Abandonar partida" → click en Cancelar → la partida sigue sin interrupciones.
2. **Flujo confirmar (desde colocación):** Crear sala → conectar dos jugadores → fase de colocación → presionar "Abandonar partida" → click en Aceptar → la página se recarga → aparece la pantalla de inicio (lobby).
3. **Flujo confirmar (desde combate):** Continuar la partida hasta la fase de combate → presionar "Abandonar partida" → confirmar → recarga al lobby.
4. **No visible en lobby:** Verificar que el botón NO aparece mientras se está en la pantalla de inicio o en el lobby antes de que el oponente se conecte.
5. **No visible en fin de partida:** Terminar una partida normalmente → verificar que el botón "Abandonar partida" NO aparece en la pantalla de victoria/derrota.
6. **Sesión limpiada:** Tras confirmar el abandono, verificar en DevTools → Application → sessionStorage (o localStorage según implementación) que los datos de sesión fueron eliminados.

### Automated Tests
No aplica (el proyecto no tiene suite de tests automatizados).

### Edge Cases
- **Doble click:** El `window.confirm()` es bloqueante; no se puede hacer doble click.
- **Mobile:** El diálogo nativo del navegador es responsivo por defecto.
- **Teclado:** El botón es enfocable y activable con Enter/Space, sin cambios adicionales.
- **Oponente queda colgado:** Al recargar, el jugador pierde su sesión. El oponente verá la desconexión por el listener `onDisconnect` de Firebase existente, que ya maneja este caso.

## Acceptance Criteria
- El botón "Abandonar partida" es visible durante la fase de colocación de barcos (cuando `#game-container` es visible).
- El botón "Abandonar partida" es visible durante la fase de combate.
- El botón NO es visible en la pantalla de inicio, en el lobby, ni en la pantalla de fin de partida.
- Al presionar el botón, aparece un `window.confirm()` con el mensaje "¿Seguro que querés abandonar la partida?".
- Si el jugador cancela, el diálogo se cierra y la partida continúa sin ningún cambio.
- Si el jugador confirma, la sesión se limpia (`clearSession()`) y la página se recarga (`window.location.reload()`), mostrando la pantalla de inicio.

## Validation Commands
- `python -m http.server 8000` — Iniciar servidor de desarrollo para verificar manualmente en `http://localhost:8000`.

## Notes
- No se requiere notificar al oponente en Firebase sobre el abandono: el listener `onDisconnect` existente ya propaga la desconexión.
- El botón hereda su visibilidad del `#game-container` padre sin necesidad de lógica extra de show/hide en el código JS.
- El diseño es minimalista (sin modal custom, sin librerías) siguiendo la convención del proyecto de usar APIs nativas.
- Si en el futuro se desea notificar al oponente con un mensaje como "Tu oponente abandonó la partida", se podría agregar una llamada a Firebase antes del `reload()`, pero queda fuera del alcance de este issue.
