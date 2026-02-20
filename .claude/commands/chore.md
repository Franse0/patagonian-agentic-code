# Planificación de Chore

Crea un nuevo plan en `specs/*.md` para el `Chore` (mantenimiento/refactorización/limpieza) usando exactamente el `Plan Format` indicado a continuación. Sigue las `Instructions`.

## Instructions

- IMPORTANTE: Estás escribiendo un **plan** para trabajo de mantenimiento. **No lo implementes aquí**, solo planifica.
- El `Chore` describe tareas de mantenimiento sin cambios visibles para el usuario.
- Crea el plan dentro de `specs/*.md`. Elige un nombre de archivo claro (ej., `specs/chore-refactor-css-structure.md`).
- Reemplaza **todos** los `<placeholders>` en el formato.
- Antes de planificar, investiga el código base para entender el estado actual.
- Diseña para mejorar la mantenibilidad sin cambiar la funcionalidad.
- El último paso del plan siempre debe ser ejecutar los `Validation Commands`.

## Plan Format

```md
# Chore: <chore title>

## Chore Description
<describe el trabajo de mantenimiento: qué se limpiará/refactorizará/actualizará>

## Motivation
<explica por qué este trabajo es necesario: deuda técnica, calidad de código, mantenibilidad>

## Current State
<describe la situación actual y por qué necesita mejora>

## Desired State
<describe el estado objetivo después de que el chore esté completo>

## Relevant Files
Archivos a modificar para este chore:

<lista archivos relevantes y explica por qué en viñetas>

## Implementation Plan
### Phase 1: Analysis
<analiza el código actual, identifica patrones, documenta decisiones>

### Phase 2: Refactoring
<implementa el trabajo de refactorización/limpieza>

### Phase 3: Verification
<verifica que la funcionalidad no cambió y la calidad del código mejoró>

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) <step title>
- <tarea concreta>
- <tarea concreta>
- <verificación>

### 2) <step title>
- <tarea concreta>
- <tarea concreta>
- <verificación>

### N) Final Validation
- Ejecuta todos los `Validation Commands` para asegurar que no hay regresiones.

## Testing Strategy
### Regression Testing
<verifica que toda la funcionalidad todavía funciona exactamente igual>

### Code Quality
<verifica mejoras en calidad de código, mantenibilidad o rendimiento>

## Acceptance Criteria
- <Sin cambios funcionales en el comportamiento visible al usuario>
- <Calidad de código/mantenibilidad mejorada>
- <Todas las pruebas pasan>

## Validation Commands
Ejecuta cada comando para validar que el chore está completo con cero regresiones.

- `<command to start dev server>`
- `<command to run tests if applicable>`
- `<command to validate code quality if applicable>`

## Notes
<notas opcionales: decisiones, compromisos, trabajo futuro>
```

## Chore

$ARGUMENTS

## Report

Resume el trabajo realizado en una breve lista de viñetas.

Incluye la ruta del plan que creaste en specs/*.md.
