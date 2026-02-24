# Issues - Batalla Naval Multijugador

---

## Issue 1 — Base HTML + Tableros

**Título:** `feat: estructura HTML base y tableros de juego`

**Cuerpo:**
```
Crear la estructura HTML/CSS base del juego de Batalla Naval.

## Descripción
Implementar la página principal con los dos tableros de juego (10x10),
el layout general y los estilos CSS base. Esta es la fundación visual
sobre la que se construirán todas las demás funcionalidades.

## Criterios de Aceptación
- Página `index.html` con layout de dos columnas (jugador local y jugador enemigo)
- Dos grillas de 10x10 celdas (filas A-J, columnas 1-10)
- Etiquetas de filas y columnas visibles en ambas grillas
- Panel de estado del juego (turno actual, mensajes)
- Diseño responsivo, funciona en desktop y mobile
- Paleta de colores: tema naval (azules, grises oscuros)
- Títulos "Tu tablero" y "Tablero enemigo"

## Notas Técnicas
- HTML5 semántico, CSS vanilla, JS vanilla
- Sin frameworks ni librerías externas por ahora
- Las celdas deben tener IDs únicos del tipo: `cell-A1`, `cell-B5`, etc.
- CSS custom properties para colores del tema
```

---

## Issue 2 — Colocación de Barcos

**Título:** `feat: fase de colocación de barcos`

**Cuerpo:**
```
Implementar la fase de colocación de barcos antes de iniciar la partida.

## Descripción
Permitir al jugador colocar sus 5 barcos en su tablero antes de que
comience el juego. Los barcos se colocan haciendo click en las celdas
del tablero propio.

## Criterios de Aceptación
- 5 barcos con los tamaños estándar:
  - Portaaviones (5 celdas)
  - Acorazado (4 celdas)
  - Crucero (3 celdas)
  - Submarino (3 celdas)
  - Destructor (2 celdas)
- Panel lateral que muestra los barcos disponibles para colocar
- Click en celda inicial + orientación (horizontal/vertical) con botón toggle
- Preview visual al hacer hover sobre las celdas donde se colocará el barco
- Validación: no superposición, no fuera del tablero
- Botón "Listo" habilitado solo cuando todos los barcos están colocados
- Botón "Aleatorio" para colocación automática
- Los barcos colocados se visualizan con color distinto en el tablero

## Notas Técnicas
- La lógica de validación debe ser una función pura reutilizable
- Guardar posiciones de barcos en objeto JS (se sincronizará con Firebase luego)
```

---

## Issue 3 — Firebase + Sistema de Salas

**Título:** `feat: integración Firebase y sistema de salas`

**Cuerpo:**
```
Integrar Firebase Realtime Database y crear el sistema de salas para
que dos jugadores puedan conectarse a una misma partida.

## Descripción
Un jugador crea una sala y recibe un código de 6 caracteres. El segundo
jugador ingresa ese código para unirse. Una vez que ambos están
conectados, la partida puede comenzar.

## Criterios de Aceptación
- Pantalla inicial con dos opciones: "Crear partida" y "Unirse a partida"
- Al crear: genera código de sala único (6 caracteres), lo muestra en pantalla
- Al unirse: campo para ingresar el código de sala
- Indicador de "Esperando oponente..." mientras el segundo jugador no se conecta
- Una vez conectados ambos: mostrar "¡Oponente encontrado! Colocá tus barcos"
- Estructura de datos en Firebase:
  ```
  rooms/{roomId}/
    status: "waiting" | "placing" | "playing" | "finished"
    player1: { id, ready, ships }
    player2: { id, ready, ships }
    currentTurn: "player1" | "player2"
    attacks: []
  ```
- Detectar si un jugador se desconecta y mostrar mensaje

## Notas Técnicas
- Usar Firebase SDK v9 (modular) via CDN
- Las credenciales de Firebase van en un archivo `js/firebase-config.js`
- `firebase-config.js` debe estar en `.gitignore`
- Proveer un `firebase-config.example.js` con la estructura sin credenciales
```

---

## Issue 4 — Sincronización de Estado en Tiempo Real

**Título:** `feat: sincronización de estado en tiempo real via Firebase`

**Cuerpo:**
```
Sincronizar el estado del juego entre ambos jugadores en tiempo real
usando Firebase Realtime Database.

## Descripción
Cuando el jugador local realiza una acción (colocar barcos, marcar
"listo"), el estado debe actualizarse en Firebase y reflejarse
automáticamente en el navegador del oponente.

## Criterios de Aceptación
- Al terminar de colocar barcos y presionar "Listo", sincronizar con Firebase
- Cuando ambos jugadores están listos, la partida inicia automáticamente
- El estado `currentTurn` en Firebase determina de quién es el turno
- Cada cliente escucha cambios en Firebase con `onValue` y actualiza la UI
- Indicador visual claro de "Tu turno" vs "Turno del oponente"
- Los ataques recibidos se reflejan en tiempo real en el tablero propio

## Notas Técnicas
- Usar listeners de Firebase (`onValue`, `onDisconnect`)
- Separar la lógica de Firebase en `js/firebase-game.js`
- El tablero propio solo muestra los barcos del jugador local (nunca los del enemigo)
```

---

## Issue 5 — Mecánica de Ataque y Turnos

**Título:** `feat: mecánica de ataque y gestión de turnos`

**Cuerpo:**
```
Implementar la mecánica de ataque: el jugador activo hace click en el
tablero enemigo para atacar, luego pasa el turno.

## Descripción
Durante la fase de juego, el jugador activo puede hacer click en
cualquier celda no atacada del tablero enemigo. El ataque se registra
en Firebase, se evalúa el resultado y se pasa el turno.

## Criterios de Aceptación
- Solo el jugador activo (`currentTurn`) puede hacer click en el tablero enemigo
- Celdas ya atacadas no son clickeables (cursor bloqueado)
- Al hacer click: registrar ataque en Firebase inmediatamente
- Feedback visual instantáneo: la celda atacada se marca provisionalmente
- Después del ataque, el turno pasa automáticamente al oponente
- Indicador de turno actualizado en tiempo real para ambos jugadores
- Historial de ataques visible (últimos 5 movimientos)

## Notas Técnicas
- El array `attacks` en Firebase acumula todos los ataques: `{ cell, player, result }`
- La evaluación de hit/miss se calcula en el cliente con los datos locales
```

---

## Issue 6 — Detección de Impactos y Misses

**Título:** `feat: detección de impactos y fallos con feedback visual`

**Cuerpo:**
```
Implementar la detección de impactos (hit) y fallos (miss) al atacar,
con feedback visual diferenciado en ambos tableros.

## Descripción
Cuando se registra un ataque en Firebase, cada cliente evalúa si fue
hit o miss comparando la celda atacada con las posiciones de los barcos.
El resultado se refleja visualmente en ambos tableros.

## Criterios de Aceptación
- Hit: celda marcada con 🔴 o color rojo en el tablero enemigo
- Miss: celda marcada con ⚪ o color gris en el tablero enemigo
- En el tablero propio: hits del enemigo se muestran en rojo, misses en gris
- Cuando un barco es completamente hundido: animación o indicador especial
- Mensaje en el panel de estado: "¡Impacto!" o "Agua..." según resultado
- Sonido opcional (hit vs miss) si el navegador lo permite
- Los barcos hundidos del oponente se revelan visualmente

## Notas Técnicas
- Función `evaluateAttack(cell, ships)` que retorna `{ result: 'hit'|'miss', shipSunk: boolean, shipName: string|null }`
- Esta lógica es puramente local, no necesita ir a Firebase
```

---

## Issue 7 — Condición de Victoria

**Título:** `feat: detección de condición de victoria y fin de partida`

**Cuerpo:**
```
Detectar cuándo un jugador ha hundido todos los barcos del oponente
y finalizar la partida.

## Descripción
Después de cada ataque exitoso, verificar si todos los barcos del
oponente han sido hundidos. Si es así, actualizar el estado en
Firebase a "finished" con el ganador.

## Criterios de Aceptación
- Después de cada hit, verificar si todos los barcos del oponente están hundidos
- Si se cumplen las condiciones: actualizar `rooms/{roomId}/status` a "finished" y setear `winner`
- Ambos clientes detectan el cambio y muestran la pantalla de fin de juego
- La pantalla muestra: "¡Ganaste! 🏆" o "Perdiste... 💀" según corresponda
- Mostrar estadísticas finales: cantidad de ataques, precisión, tiempo de partida
- Botón "Revancha" que reinicia la sala para una nueva partida
- Botón "Salir" que vuelve a la pantalla inicial

## Notas Técnicas
- Función `checkWinCondition(attacks, ships)` que retorna boolean
- El estado "finished" en Firebase debe ser detectado por ambos clientes simultáneamente
```

---

## Issue 8 — Pantalla de Inicio y UX General

**Título:** `feat: pantalla de inicio y mejoras generales de UX`

**Cuerpo:**
```
Crear una pantalla de inicio atractiva y pulir la experiencia general
del juego con transiciones entre fases y mensajes claros.

## Descripción
Mejorar la experiencia del usuario con una pantalla de inicio que
explique el juego, transiciones suaves entre las fases (lobby →
colocación → juego → fin) y mensajes de estado claros en todo momento.

## Criterios de Aceptación
- Pantalla de inicio con título "Batalla Naval", descripción breve y botones de acción
- Transiciones suaves entre fases del juego (fade in/out)
- Mensajes de estado siempre visibles: qué fase es, de quién es el turno
- Modal de reglas del juego (botón "?" en la esquina)
- Indicador de conexión: punto verde/rojo según estado de Firebase
- Nombre del jugador: input al inicio para personalizar ("Jugador 1" por defecto)
- Loading spinner mientras se conecta a Firebase

## Notas Técnicas
- Las transiciones entre fases se manejan mostrando/ocultando secciones con CSS
- Evitar recargar la página entre fases, todo es SPA en un solo `index.html`
```

---

## Issue 9 — Animaciones y Polish Visual

**Título:** `feat: animaciones y polish visual`

**Cuerpo:**
```
Agregar animaciones y detalles visuales que hagan el juego más
entretenido y profesional.

## Descripción
Incorporar animaciones CSS y efectos visuales para los momentos clave
del juego: hits, misses, hundimiento de barcos y victoria.

## Criterios de Aceptación
- Animación de explosión (CSS) al hacer un hit
- Animación de splash/ola al hacer un miss
- Animación especial cuando se hunde un barco completo
- Efecto de shake en el tablero al recibir un hit
- Animación de victoria (confetti o similar) al ganar
- Hover effects en las celdas clickeables durante el turno activo
- Transición suave al revelar barcos hundidos del oponente
- Todo funciona sin librerías externas (CSS puro)

## Notas Técnicas
- Usar CSS animations y keyframes
- Las animaciones no deben bloquear la interacción del usuario
- Respetar `prefers-reduced-motion` para accesibilidad
```

---

## Issue 10 — Panel de Estado de Flota

**Título:** `feat: panel de estado de flota durante el combate`

**Cuerpo:**
```
Mostrar en tiempo real el estado de los barcos de ambos jugadores durante el combate.

## Descripción
Durante la fase de combate, cada jugador debe poder ver qué barcos suyos
siguen a flote y cuáles fueron hundidos por el oponente, y también qué
barcos del enemigo ya hundió. El panel se actualiza automáticamente con
cada ataque.

## Criterios de Aceptación
- Panel "Tu Flota" debajo del tablero propio con los 5 barcos listados
- Panel "Flota Enemiga" debajo del tablero enemigo con los 5 barcos listados
- Estado visual de cada barco:
  - 🟢 Verde / ícono intacto → barco a flote
  - 🔴 Rojo / tachado → barco hundido
- El panel "Tu Flota" se actualiza cuando el enemigo hunde uno de tus barcos
- El panel "Flota Enemiga" se actualiza cuando vos hundís un barco enemigo
- Al hundir un barco enemigo, mostrar mensaje: "¡Hundiste el [nombre del barco]!"
- Los paneles solo son visibles durante la fase de combate (no en lobby ni colocación)
- Nombre de cada barco mostrado: Portaaviones, Acorazado, Crucero, Submarino, Destructor

## Notas Técnicas
- Leer el estado de barcos hundidos desde los ataques registrados en Firebase
- Función `getSunkShips(attacks, ships)` que retorna array de shipIds hundidos
- Actualizar los paneles desde el listener `onAttacksChange` en `firebase-game.js`
- Los paneles deben ser capturables por el reviewer simulando via JS:
  `driver.execute_script("document.getElementById('fleet-status').hidden = false")`

---

## Issue 11 — Spinner de Cargando Permanente al Unirse

**Título:** `bug: spinner de cargando permanente al unirse a sala`

**Cuerpo:**
```
Cuando un jugador se une a una partida existente, el spinner de "Conectando..."
permanece visible en pantalla indefinidamente, bloqueando la UI del juego.

## Descripción
Al unirse a una sala con el código, el spinner de carga se muestra pero nunca
se oculta antes de la transición a la pantalla de juego. Esto deja al jugador
con el mensaje "Conectando..." superpuesto sobre el tablero de juego.

## Pasos para Reproducir
1. Jugador 1 crea una sala y obtiene el código
2. Jugador 2 ingresa el código y presiona "Unirse"
3. El spinner "Conectando..." aparece
4. La transición al juego ocurre, pero el spinner permanece visible

## Comportamiento Esperado
El spinner debe ocultarse antes de mostrar la pantalla de juego, igual que
en el flujo de "Crear sala".

## Criterios de Aceptación
- El spinner se oculta correctamente al unirse a una sala
- La transición al juego es limpia sin elementos superpuestos
- El flujo de "unirse" es consistente con el de "crear sala"

## Notas Técnicas
- Archivo afectado: `js/game.js` línea ~590
- La función `hideSpinner()` debe llamarse antes de `handleBothConnected()`
``````
