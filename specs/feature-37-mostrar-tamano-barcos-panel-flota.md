# Feature: Mostrar tamaño de barcos en el panel de flota

## Feature Description
Durante la fase de combate, el panel de flota muestra los nombres de los barcos de ambos
jugadores, pero no indica cuántas celdas ocupa cada uno. Esta feature agrega una indicación
visual del tamaño (número de celdas) en cada ítem del panel de flota, tanto en "Tu Flota"
como en "Flota Enemiga", usando mini-bloques visuales similares a los que ya existen en la
fase de colocación. Al hundir un barco, los mini-bloques cambian de color azul a rojo
acompañando el texto tachado.

## User Story
As a jugador en combate
I want ver el tamaño de cada barco en el panel de flota
So that pueda identificar rápidamente cuántas celdas le quedan por atacar de cada barco enemigo y evaluar el riesgo para mi propia flota

## Problem Statement
El panel de flota durante el combate muestra solo el nombre del barco y un indicador de
estado (vivo/hundido). Sin saber el tamaño de cada barco, el jugador tiene que recordar de
memoria cuántas celdas tiene el "Crucero" vs el "Submarino" (ambos de 3), o si el
"Destructor" tiene 2 o 3 celdas. Esto añade carga cognitiva innecesaria y quita claridad
estratégica.

## Solution Approach
1. Agregar la propiedad `size` al array `SHIPS` en `game.js` para que cada barco conozca
   su número de celdas.
2. Modificar `renderFleetPanel` para que, al construir cada `<li>`, añada mini-bloques
   visuales (`fleet-item-block`) que representen el tamaño del barco, junto al nombre.
3. Agregar estilos CSS para los mini-bloques en el panel de flota, reutilizando el mismo
   lenguaje visual de `.ship-cell-block` de la fase de colocación pero adaptado al tamaño
   compacto del panel.

## Relevant Files

- `js/game.js` — Contiene el array `SHIPS` (línea ~31) y la función `renderFleetPanel`
  (línea ~150). Aquí se agrega `size` a `SHIPS` y se modifica el renderizado del panel
  para incluir los mini-bloques.
- `css/styles.css` — Contiene los estilos del panel de flota (`.fleet-item`, `.fleet-list`,
  etc., líneas ~354-436). Aquí se agregan estilos para los mini-bloques de tamaño.

## Implementation Plan

### Phase 1: Foundation — Datos de tamaño
Agregar la propiedad `size` a cada objeto del array `SHIPS` en `game.js`, asegurando que
todos los componentes que iteran sobre `SHIPS` tengan acceso al tamaño del barco.

### Phase 2: Core Implementation — Renderizado y estilos
Modificar `renderFleetPanel` para que construya cada ítem con el nombre del barco y una
serie de mini-bloques proporcional al `size`. Agregar las clases CSS necesarias para
estilizar los mini-bloques en el contexto compacto del panel de flota.

### Phase 3: Integration
Verificar que el estado visual de hundido (`.fleet-item--sunk`) aplique correctamente sobre
los ítems con mini-bloques, y que la apariencia sea legible tanto en escritorio como en
pantallas pequeñas.

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Agregar propiedad `size` al array `SHIPS` en `js/game.js`
- Localizar el array `SHIPS` (línea ~31)
- Agregar `size` a cada objeto del array con los valores estándar del juego:
  - `carrier`: 5, `battleship`: 4, `cruiser`: 3, `submarine`: 3, `destroyer`: 2
- Verificar que ningún otro código existente sea afectado

### 2) Modificar `renderFleetPanel` en `js/game.js` para mostrar mini-bloques
- En la función `renderFleetPanel` (línea ~150), reemplazar la asignación simple de
  `li.textContent` por construcción manual de elementos hijos:
  - Un `<span class="fleet-item-name">` con el nombre del barco
  - Un `<span class="fleet-item-blocks">` con `ship.size` elementos
    `<span class="fleet-item-block"></span>` dentro
- Usar `createElement` y `appendChild` para construir los elementos sin innerHTML
- Verificar que la clase `fleet-item--sunk` siga aplicándose correctamente al `<li>`

### 3) Agregar estilos CSS para los mini-bloques en `css/styles.css`
- Dentro del bloque `/* === Fleet status panels === */` (línea ~354), agregar después de
  `.fleet-item--sunk::before`:

```css
.fleet-item-name {
  flex: 0 0 auto;
}

.fleet-item-blocks {
  display: flex;
  gap: 2px;
  align-items: center;
  margin-left: auto;
}

.fleet-item-block {
  width: 8px;
  height: 8px;
  background: #4a90d9;
  border-radius: 1px;
  flex-shrink: 0;
}

.fleet-item--sunk .fleet-item-block {
  background: var(--color-hit);
  opacity: 0.7;
}
```

### 4) Final Validation
- Abrir `http://localhost:8000` con dos ventanas y jugar hasta la fase de combate
- Verificar que cada barco en ambos paneles de flota muestra su nombre + mini-bloques
- Verificar que los mini-bloques reflejan el tamaño correcto (5 para Portaaviones, 2 para
  Destructor, etc.)
- Verificar que al hundir un barco, los mini-bloques cambian de color azul a rojo junto
  al nombre tachado
- Ejecutar todos los `Validation Commands`

## Testing Strategy

### Manual Testing
1. Iniciar servidor con `python -m http.server 8000`
2. Abrir dos pestañas en `http://localhost:8000`
3. Crear sala en pestaña A, unirse en pestaña B
4. Colocar todos los barcos en ambas pestañas y presionar "Listo"
5. Al iniciar el combate, verificar en ambas pestañas:
   - El panel "Tu Flota" muestra los 5 barcos con nombre + mini-bloques de tamaño correcto
   - El panel "Flota Enemiga" muestra los 5 barcos con nombre + mini-bloques de tamaño correcto
6. Hundir el Destructor (2 celdas) y verificar que sus 2 mini-bloques cambian a rojo con
   el nombre tachado

### Automated Tests
No hay suite de tests automatizados en el proyecto. Las verificaciones son manuales.

### Edge Cases
- **Barcos hundidos**: Los mini-bloques deben adoptar el color de hundido junto con el
  texto tachado (manejado por `.fleet-item--sunk .fleet-item-block`)
- **Pantallas pequeñas (móvil)**: El panel de flota cambia a `flex-direction: column` en
  mobile. Los mini-bloques de 8px son suficientemente pequeños para no desbordar en
  pantallas estrechas
- **Crucero y Submarino (ambos de 3 celdas)**: Aunque tienen el mismo tamaño, sus nombres
  los diferencian; los mini-bloques refuerzan que tienen el mismo tamaño
- **Re-renders de Firebase**: `renderFleetPanel` limpia `innerHTML` y reconstruye desde
  cero en cada llamada, por lo que los mini-bloques se reconstruyen correctamente sin
  duplicar elementos

## Acceptance Criteria
- Cada barco en el panel "Tu Flota" muestra su nombre y mini-bloques proporcionales a su
  tamaño (5 bloques para Portaaviones, 4 para Acorazado, 3 para Crucero/Submarino, 2 para
  Destructor)
- Cada barco en el panel "Flota Enemiga" muestra el mismo formato nombre + mini-bloques
- Al hundir un barco, los mini-bloques del ítem correspondiente cambian de color azul a
  rojo (junto con el texto tachado)
- Los mini-bloques no desbordan el panel en pantallas de 320px de ancho mínimo
- El renderizado es idempotente: múltiples llamadas a `renderFleetPanel` producen el mismo
  resultado visual sin duplicar elementos

## Validation Commands
- `python -m http.server 8000` — iniciar servidor local y probar en `http://localhost:8000`

## Notes
- Los mini-bloques (`fleet-item-block`) reutilizan el lenguaje visual de `.ship-cell-block`
  de la fase de colocación, con tamaño reducido (8×8px) para adaptarse al panel compacto.
- Se usa `margin-left: auto` en `.fleet-item-blocks` para alinear los bloques a la derecha
  del ítem, dejando el nombre a la izquierda. Aprovecha el `display: flex` ya existente
  en `.fleet-item`.
- No se modifica el HTML estático de `index.html` ya que el panel de flota se renderiza
  completamente por JS (`renderFleetPanel`).
