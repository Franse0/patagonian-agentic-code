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

---

## Issue 12 — Turno Continuo al Impactar un Barco

**Título:** `turno continúa al impactar, solo pasa al fallar`

**Cuerpo:**
```
Actualmente el turno pasa al oponente después de cada ataque, sin importar el resultado.
El comportamiento correcto es que si el ataque es un impacto (hit), el jugador
conserva el turno y puede seguir atacando.

## Descripción
En la mecánica clásica de Batalla Naval, acertar un disparo premia al jugador
con un turno adicional. El turno solo se cede al oponente cuando el ataque
cae en agua (miss).

## Criterios de Aceptación
- Si el ataque resulta en hit, el turno sigue siendo del jugador activo
- Si el ataque resulta en miss, el turno pasa al oponente
- El indicador de turno ("Tu turno" / "Turno del oponente") refleja el estado correcto en ambos clientes
- El tablero enemigo permanece clickeable para el jugador activo mientras siga su turno
- Mensaje de feedback diferenciado: "¡Impacto! Seguís atacando." vs "Agua... turno del oponente."

## Notas Técnicas
- La lógica de cambio de turno está en `js/firebase-game.js` (función que actualiza `currentTurn`)
- Solo se debe actualizar `currentTurn` en Firebase cuando el resultado es `miss`
- Los listeners de `onValue` ya propagan el cambio a ambos clientes automáticamente
```

---

## Issue 13 — Barco Hundido se Tacha Visualmente en el Tablero

**Título:** `marcar visualmente barcos hundidos en el tablero`

**Cuerpo:**
```
Cuando un barco es completamente hundido, sus celdas no se distinguen
visualmente de un hit normal. Se necesita un indicador claro en el tablero
que marque el barco como hundido.

## Descripción
Al hundir un barco completo, todas las celdas que ocupaba deben recibir
un estilo especial (por ejemplo, una línea tachada, un ícono diferente o un
color distinto al rojo de hit simple) para que el jugador pueda identificar
de un vistazo qué barcos ya terminó de atacar.

## Criterios de Aceptación
- Al hundir un barco, todas sus celdas se marcan con un estilo "hundido" distinto al hit normal
- El estilo "hundido" aplica tanto en el tablero enemigo (atacante) como en el tablero propio (defensor)
- El marcado es persistente: se mantiene si el listener de Firebase vuelve a procesar los ataques
- Las celdas hundidas siguen siendo no-clickeables
- El estilo es visualmente distinguible del hit simple (ej. clase CSS `cell-sunk` con ícono de barco tachado o color diferente)

## Notas Técnicas
- Usar la función existente `getSunkShips(attacks, ships)` para obtener los barcos hundidos
- Agregar clase CSS `cell-sunk` a las celdas correspondientes al procesar cada ataque
- Actualizar el renderizado en `js/ui.js` donde se pintan los resultados de ataques
```

---

## Issue 14 — Tamaño de Barco en Panel de Flota

**Título:** `mostrar tamaño de cada barco en el panel de flota`

**Cuerpo:**
```
El panel de flota (inferior) muestra el nombre de cada barco pero no su tamaño,
lo que dificulta saber cuántas celdas ocupa cada uno sin memorizar las reglas.

## Descripción
Agregar junto al nombre de cada barco una representación visual de su tamaño
usando cuadraditos (ej. "Acorazado ■■■■"), de modo que el jugador pueda
identificar de un vistazo cuántas celdas debe impactar para hundirlo.

## Criterios de Aceptación
- Cada barco en el panel "Tu Flota" y "Flota Enemiga" muestra su tamaño en bloques: ■ por cada celda
- Ejemplo esperado: "Portaaviones ■■■■■", "Acorazado ■■■■", "Crucero ■■■", "Submarino ■■■", "Destructor ■■"
- Los bloques de barcos hundidos se muestran con el estilo "hundido" correspondiente
- El cambio es puramente visual (HTML/CSS), sin modificar la lógica del juego

## Notas Técnicas
- Modificar la generación del panel de flota en `js/ui.js`
- Usar el carácter ■ (U+25A0) o spans con clase CSS para los bloques de tamaño
- El tamaño de cada barco ya está definido en la configuración de barcos de `js/game.js`
```

---

## Issue 15 — Botón para Ocultar/Mostrar Tu Tablero

**Título:** `botón para ocultar y mostrar el tablero propio`

**Cuerpo:**
```
En entornos donde otros pueden ver el monitor (ej. oficina), el jugador necesita
poder ocultar su tablero rápidamente para no revelar la posición de sus barcos
al oponente que esté mirando la pantalla.

## Descripción
Agregar un botón toggle junto al tablero propio que alterne entre ocultar y
mostrar el contenido del tablero del jugador local. Al ocultarlo, las celdas
y barcos no deben ser visibles, pero la estructura del tablero puede mantenerse
para no romper el layout.

## Criterios de Aceptación
- Botón visible junto al título "Tu tablero" durante la fase de combate
- Al presionar el botón, el tablero propio se oculta (celdas no visibles)
- El mismo botón permite volver a mostrar el tablero
- El texto/ícono del botón cambia según el estado: ej. "Ocultar tablero" / "Mostrar tablero"
- Ocultar el tablero no interrumpe la partida ni los listeners de Firebase
- El estado oculto/visible es solo local, no se sincroniza con el oponente

## Notas Técnicas
- Agregar clase CSS `board-hidden` al contenedor del tablero propio para ocultar el contenido
- El botón toggle puede estar en `js/ui.js` o directamente en `index.html`
- No afectar el tablero enemigo ni la lógica del juego
```

---

## Issue 16 — Botón Revancha No Funciona

**Título:** `bug: el botón revancha no reinicia la partida en la misma sala`

**Cuerpo:**
```
Al terminar una partida, el botón "Revancha" recarga la página igual que "Salir",
enviando a ambos jugadores de vuelta al lobby por separado en vez de reiniciar
la partida en la misma sala.

## Descripción
Al finalizar el juego, la pantalla de fin muestra dos botones: "Revancha" y "Salir".
El botón "Revancha" actualmente ejecuta `window.location.reload()`, lo que es
idéntico a "Salir": el jugador vuelve al lobby solo y pierde la conexión con
su oponente. La revancha real debe reiniciar el estado de la sala en Firebase
para que ambos jugadores puedan colocar sus barcos de nuevo sin salir de la sala.

## Criterios de Aceptación
- Al presionar "Revancha", el estado de la sala en Firebase se reinicia:
  - `status` vuelve a `"placing"`
  - `attacks` se vacía
  - `winner` se pone en `null`
  - `currentTurn` se pone en `null`
  - `player1.ready` y `player2.ready` vuelven a `false`
  - Los ships de ambos jugadores se limpian para permitir nueva colocación
- Ambos clientes detectan el cambio de estado y transicionan a la fase de colocación
- El jugador que presionó "Revancha" ve el tablero de colocación inmediatamente
- El oponente también transiciona automáticamente a la fase de colocación
- El botón "Salir" mantiene su comportamiento actual (recarga la página)
- Si solo un jugador presiona "Revancha" y el otro ya salió, la sala queda en estado `"placing"` sin consecuencias

## Notas Técnicas
- Agregar función `resetRoom(roomId)` en `js/firebase-game.js` que resetee los campos indicados
- El listener `onStatusChange` en `js/game.js` ya propaga cambios de estado; extenderlo para manejar la transición de `"finished"` a `"placing"`
- La transición de vuelta a colocación debe limpiar el DOM del tablero propio (quitar ships colocados) y resetear `fleetState`
- El botón "Revancha" llama a `resetRoom` en vez de `window.location.reload()`
- Solo el jugador que presiona "Revancha" ejecuta el reset en Firebase; el oponente lo detecta vía listener
```

---

## Issue 17 — Persistencia de Sesión ante Refresh

**Título:** `feat: persistir sesión de juego para reconectar tras un refresh`

**Cuerpo:**
```
Si un jugador recarga la página accidentalmente durante una partida, pierde
toda la información de sesión (roomId, playerKey, playerId) y no puede volver
al juego en curso. La partida queda en estado inconsistente para ambos jugadores.

## Descripción
Actualmente `playerId`, `window.Game.roomId` y `window.Game.playerKey` viven
únicamente en memoria. Al recargar la página, se generan nuevos valores y el
jugador queda desconectado de su sala sin forma de volver. El oponente ve
que el jugador se desconectó y la partida queda bloqueada.

La solución es guardar los datos de sesión en `sessionStorage` al conectarse a
una sala y, al cargar la página, verificar si existe una sesión guardada para
intentar reconectar automáticamente.

## Criterios de Aceptación
- Al crear o unirse a una sala, guardar en `sessionStorage`:
  - `battleship_roomId`
  - `battleship_playerKey` (`"player1"` o `"player2"`)
  - `battleship_playerId`
- Al cargar la página, si existen esos valores en `sessionStorage`:
  - Intentar reconectar a la sala leyendo su estado actual en Firebase
  - Si la sala existe y su `status` es `"placing"` o `"playing"`, saltear el lobby y llevar al jugador directamente a la fase correcta
  - Si la sala no existe, tiene `status: "finished"` o `"waiting"`, limpiar `sessionStorage` y mostrar el lobby normalmente
- La reconexión restaura el estado visual correcto según la fase:
  - `"placing"`: mostrar tablero de colocación (con los barcos ya colocados si el jugador ya estaba listo)
  - `"playing"`: mostrar el tablero de combate con todos los ataques aplicados
- Al salir explícitamente (botón "Salir") limpiar `sessionStorage`
- Usar `sessionStorage` (no `localStorage`) para que la sesión no persista entre pestañas distintas

## Notas Técnicas
- La lógica de reconexión va en `js/game.js`, antes de registrar los listeners del lobby
- Usar `FirebaseGame.listenRoom` con los callbacks normales una vez reconectado
- Si el jugador ya había marcado "Listo" (`playerKey.ready === true` en Firebase), restaurar `fleetState` desde `roomData[playerKey].ships` y saltar directo a esperar al oponente o al combate
- `playerId` debe leerse desde `sessionStorage` en vez de generarse de nuevo, para que Firebase identifique al jugador correctamente si se usan reglas de seguridad basadas en el ID
```

---

## Issue 18 — Chat entre Jugadores

**Título:** `feat: chat de texto en tiempo real entre jugadores`

**Cuerpo:**
```
Agregar un chat de texto simple para que los dos jugadores puedan comunicarse
durante la partida, disponible desde que ambos se conectan hasta que uno
presiona "Salir" o "Revancha".

## Descripción
Una vez que ambos jugadores están en la misma sala (desde la fase de colocación
en adelante), deben poder enviarse mensajes de texto en tiempo real. Los mensajes
se sincronizan via Firebase y se identifican como "Vos" (jugador local) o
"Rival" (oponente). El chat se limpia al iniciar una revancha o al salir.

## Criterios de Aceptación
- El chat es visible desde que ambos jugadores están conectados (fase de colocación en adelante)
- Solo texto libre, sin mensajes predefinidos
- Cada mensaje se identifica con "Vos" o "Rival" según el remitente
- Los mensajes se sincronizan en tiempo real entre ambos jugadores via Firebase
- **Desktop**: panel de chat siempre visible a la derecha del tablero enemigo, como tercera columna
- **Mobile**: botón flotante en la esquina inferior derecha con badge numérico de mensajes no leídos; al tocarlo se abre un panel de chat
- El badge desaparece al abrir el chat
- Los mensajes desaparecen al presionar "Revancha" (se limpian en Firebase junto al resto del estado)
- Los mensajes desaparecen al presionar "Salir" (recarga de página)
- No hay sonido de notificación, solo badge visual en mobile

## Notas Técnicas
- Estructura de datos en Firebase usando `push()` para evitar race conditions:
  ```
  rooms/{roomId}/messages/{pushKey}: {
    playerKey: "player1" | "player2",
    text: "hola!",
    timestamp: 1234567890
  }
  ```
- Agregar listener `onValue` para `rooms/{roomId}/messages` en `js/firebase-game.js`
- Agregar función `sendMessage(roomId, playerKey, text)` en `js/firebase-game.js` usando `push()`
- En `resetRoom()`, agregar `updates[rooms/${roomId}/messages] = null` para limpiar mensajes en la revancha
- La UI del chat va en `js/ui.js` o directamente en `index.html`
- En desktop, el panel de chat se agrega como tercera columna en el layout del `game-container`
- En mobile, el botón flotante usa `position: fixed; bottom: 1rem; right: 1rem`
- El contador de no leídos se incrementa con cada mensaje entrante cuando el panel está cerrado (solo mobile)
```

---

## Issue 19 — Botón para Abandonar la Partida

**Título:** `feat: botón para abandonar la partida en cualquier momento`

**Cuerpo:**
```
Una vez que ambos jugadores están conectados, no existe forma de salir de la
partida sin cerrar el navegador. Si el oponente se desconecta o el jugador
simplemente quiere salir, queda atrapado en el juego sin poder volver al lobby.

## Descripción
Agregar un botón "Abandonar partida" visible durante la fase de colocación de
barcos y durante el combate. Al presionarlo, se muestra un diálogo de
confirmación. Si el jugador confirma, la página se recarga y vuelve al lobby.

## Criterios de Aceptación
- Botón visible desde que ambos jugadores están conectados (fase de colocación en adelante)
- El botón también está visible durante el combate
- Al presionar el botón, aparece un diálogo de confirmación: "¿Seguro que querés abandonar la partida?"
- Si el jugador confirma, la página se recarga (vuelve al lobby)
- Si el jugador cancela, el diálogo se cierra y la partida continúa normalmente
- El botón no es visible en el lobby ni en la pantalla de fin de partida

## Notas Técnicas
- Usar `window.confirm()` para el diálogo de confirmación (nativo del navegador, sin librerías)
- Si confirma: `window.location.reload()`
- El botón puede ir en el header o en una posición fija visible en ambas fases
- Agregar el botón en `index.html` dentro del `game-container` para que esté disponible en colocación y combate
- El botón se muestra cuando `game-container` es visible y se oculta cuando no lo es
```

---

## Issue 20 — Botón Abandonar Ocupa Demasiado Espacio

**Título:** `bug: botón abandonar partida es demasiado grande y rompe el layout`

**Cuerpo:**
```
El botón "Abandonar partida" aparece demasiado grande en pantalla, ocupando
un ancho excesivo y rompiendo el layout del juego.

## Descripción
El botón `#btn-abandon` está colocado directamente como hijo del flex container
`#game-container` sin posicionamiento específico. Al ser un elemento flex sin
restricción de ancho, se estira tomando todo el espacio disponible en lugar
de aparecer como un botón compacto en una esquina discreta.

## Comportamiento Esperado
El botón debe ser pequeño y discreto, posicionado en una esquina del
`game-container` sin interferir con el layout de los tableros y paneles.
Una buena ubicación es la esquina superior derecha, con tamaño similar
al botón de ocultar tablero.

## Criterios de Aceptación
- El botón no rompe ni distorsiona el layout del juego
- El botón es visualmente pequeño y discreto
- El layout de tableros y paneles no se ve afectado por el botón

## Notas Técnicas
- El botón está en `index.html` como hijo directo de `#game-container` (flex container)
- Solución: usar `position: absolute` o `position: fixed` para sacarlo del flujo flex,
  o envolverlo en un contenedor posicionado en la esquina superior derecha
- Alternativamente, alinearlo junto al botón `#btn-toggle-board` existente que ya
  tiene estilos compactos correctos
- Archivo CSS afectado: `css/styles.css`, regla `#btn-abandon`
```

---

## Issue 21 — Chat sin Scroll, Crece Infinitamente

**Título:** `bug: panel de chat no tiene scroll y crece en altura indefinidamente`

**Cuerpo:**
```
El panel de chat no permite hacer scroll. A medida que se agregan mensajes,
el panel crece en altura indefinidamente en vez de mantener un tamaño fijo
y permitir desplazarse por los mensajes anteriores.

## Descripción
`.chat-column` tiene `min-height: 420px` pero no tiene `height` ni `max-height`
fijo. Como resultado, `.chat-messages` (que tiene `flex: 1`) se expande sin
límite y `overflow-y: auto` nunca se activa porque el contenedor siempre
tiene espacio suficiente para crecer.

El mismo problema ocurre en mobile: `#chat-overlay-messages` tiene
`min-height: 120px` pero tampoco tiene `max-height`.

## Criterios de Aceptación
- El panel de chat desktop muestra aproximadamente 4-5 mensajes y luego permite scroll
- Al llegar un mensaje nuevo, el scroll baja automáticamente al último mensaje
- El panel de chat mobile (overlay) también tiene altura fija con scroll interno
- El layout del juego no se ve afectado por la cantidad de mensajes en el chat

## Notas Técnicas
- Archivo afectado: `css/styles.css`
- Fix en `.chat-column`: cambiar `min-height: 420px` por `height: 420px` para que
  el hijo `flex: 1` quede contenido y `overflow-y: auto` se active
- Fix en `#chat-overlay-messages`: agregar `max-height` (ej. `max-height: 200px`)
  con `overflow-y: auto`
- El scroll automático al último mensaje ya está implementado en JS con
  `scrollTop = scrollHeight`; solo necesita que el contenedor tenga altura fija
```
