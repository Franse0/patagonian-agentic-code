# Bug Fix: Panel de chat no tiene scroll y crece en altura indefinidamente

## Bug Description
El panel de chat desktop (`.chat-column`) y el overlay mobile (`#chat-overlay-messages`)
crecen en altura indefinidamente a medida que se agregan mensajes, en lugar de mantener
un tamaño fijo y permitir scroll interno.

**Comportamiento actual:** El panel crece verticalmente con cada mensaje nuevo, deformando
el layout del juego. El scroll interno nunca se activa porque el contenedor siempre tiene
espacio suficiente para expandirse.

**Comportamiento esperado:** El panel tiene altura fija (~4-5 mensajes visibles) y los
mensajes anteriores son accesibles via scroll vertical interno. Al llegar un mensaje nuevo,
el scroll baja automáticamente al último mensaje.

## Steps to Reproduce
1. Abrir el juego en dos pestañas y unirse a la misma sala
2. Llegar a la fase de juego (combat)
3. Enviar 6 o más mensajes en el chat desktop

Result: El panel `.chat-column` crece hacia abajo, empujando los elementos debajo de él.
Expected: El panel mantiene `height: 420px` y los mensajes se desplazan dentro del contenedor.

## Root Cause
En `css/styles.css`:

- **Desktop:** `.chat-column` tiene `min-height: 420px` pero **no tiene `height` ni
  `max-height` fijo**. Su hijo `.chat-messages` tiene `flex: 1` y `overflow-y: auto`,
  pero como el padre puede crecer sin límite, `.chat-messages` también crece
  indefinidamente y `overflow-y: auto` nunca activa el scroll.

- **Mobile:** `#chat-overlay-messages` tiene `min-height: 120px` pero **no tiene
  `max-height`**, por lo que tampoco activa el scroll interno.

El código JS ya implementa el scroll automático al último mensaje:
```js
desktopContainer.scrollTop = desktopContainer.scrollHeight;   // game.js:767
mobileContainer.scrollTop = mobileContainer.scrollHeight;     // game.js:771
```
Solo falta que el contenedor tenga altura fija para que ese código funcione correctamente.

## Solution Approach
Cambiar en `css/styles.css`:

1. En `.chat-column`: reemplazar `min-height: 420px` por `height: 420px`. Con altura fija,
   el hijo `flex: 1` queda contenido en ese espacio y `overflow-y: auto` en `.chat-messages`
   puede activarse cuando el contenido desborda.

2. En `#chat-overlay-messages`: agregar `max-height: 200px` y `overflow-y: auto` para
   contener los mensajes del overlay mobile con scroll.

Este enfoque es el mínimo necesario: solo ajusta las propiedades CSS que bloquean el
comportamiento, sin modificar JS ni estructura HTML.

## Relevant Files
Archivos a modificar para esta corrección de bug:

- **`css/styles.css`** — Único archivo afectado. Contiene las reglas `.chat-column`
  (línea 1022) y `#chat-overlay-messages` (línea 1227) que necesitan ser corregidas.

## Implementation Plan
### Phase 1: Investigation
Verificar el bug identificado en el CSS: confirmar que `.chat-column` usa `min-height`
en lugar de `height`, y que `#chat-overlay-messages` carece de `max-height`.

### Phase 2: Fix Implementation
Aplicar los dos cambios CSS mínimos en `css/styles.css`:
1. `.chat-column`: `min-height: 420px` → `height: 420px`
2. `#chat-overlay-messages`: agregar `max-height: 200px` y `overflow-y: auto`

### Phase 3: Verification
Probar manualmente con servidor local:
- Enviar múltiples mensajes en desktop y verificar scroll interno
- Verificar scroll automático al último mensaje
- Verificar que el layout del juego no se deforma con muchos mensajes
- Verificar comportamiento en mobile overlay

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Verificar causa raíz en CSS
- Leer `css/styles.css` en las líneas 1022-1032 (`.chat-column`)
- Confirmar que dice `min-height: 420px` y no `height: 420px`
- Leer líneas 1227-1229 (`#chat-overlay-messages`)
- Confirmar que no tiene `max-height` ni `overflow-y: auto`

### 2) Corregir `.chat-column` (desktop)
- En `css/styles.css`, línea 1026: cambiar `min-height: 420px` por `height: 420px`
- Verificar que `.chat-messages` (hijo con `flex: 1`) sigue igual — no requiere cambios

### 3) Corregir `#chat-overlay-messages` (mobile)
- En `css/styles.css`, línea 1228: cambiar `min-height: 120px` por `max-height: 200px`
- Agregar `overflow-y: auto` al bloque `#chat-overlay-messages`

### 4) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar que el bug está corregido y
  hay cero regresiones.

## Testing Strategy
### Bug Reproduction Test
Antes del fix: abrir el juego, enviar 8+ mensajes en el chat y observar que `.chat-column`
crece en altura, desplazando el layout.

### Fix Verification
Después del fix:
- El panel desktop se mantiene en 420px de altura con mensajes visibles via scroll
- El scroll baja automáticamente al último mensaje al recibir uno nuevo
- El overlay mobile limita su área de mensajes a 200px con scroll interno

### Regression Testing
- Verificar que el chat con pocos mensajes (1-4) se muestra correctamente sin espacio vacío
  excesivo
- Verificar que el layout de `.game-container` (tableros + chat) no se rompe
- Verificar que el input de envío de mensajes sigue visible y funcional
- Verificar las otras fases del juego (lobby, colocación) no se ven afectadas

## Acceptance Criteria
- El panel de chat desktop muestra aproximadamente 4-5 mensajes y luego permite scroll
- Al llegar un mensaje nuevo, el scroll baja automáticamente al último mensaje
- El panel de chat mobile (overlay) también tiene altura fija con scroll interno
- El layout del juego no se ve afectado por la cantidad de mensajes en el chat
- No se introdujeron regresiones en otras partes del UI

## Validation Commands
Ejecuta cada comando para validar que el bug está corregido con cero regresiones.

- `python -m http.server 8000` — iniciar servidor de desarrollo en `http://localhost:8000`
- Abrir dos pestañas, crear sala, llegar a fase de juego y enviar 8+ mensajes para
  verificar que el scroll funciona en desktop y mobile

## Notes
- El JS de scroll automático (`scrollTop = scrollHeight`) ya está implementado correctamente
  en `game.js:767-771`. Solo necesita que el contenedor tenga altura fija.
- Usar `height` en lugar de `min-height` asegura que el contenedor sea rígido incluso
  cuando tiene pocos mensajes, evitando que el layout "salte" entre alturas.
- Si en el futuro se necesita responsividad, considerar `height: clamp(300px, 40vh, 420px)`.
