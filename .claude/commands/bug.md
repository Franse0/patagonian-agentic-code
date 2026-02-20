# Planificación de Corrección de Bug

Crea un nuevo plan en `specs/*.md` para corregir el `Bug` usando exactamente el `Plan Format` indicado a continuación. Sigue las `Instructions` y usa `Relevant Files` para enfocar el trabajo apropiadamente.

## Instructions

- IMPORTANTE: Estás escribiendo un **plan** para corregir un bug. **No lo corrijas aquí**, solo planifica.
- El `Bug` describe qué está roto y cómo debería funcionar correctamente.
- Crea el plan dentro de `specs/*.md`. Elige un nombre de archivo claro basado en el bug (ej., `specs/bug-form-validation-error.md`).
- Reemplaza **todos** los `<placeholders>` en el formato.
- Antes de planificar, investiga el código base para entender la causa raíz.
- Diseña una corrección apropiada, no un workaround.
- El último paso del plan siempre debe ser ejecutar los `Validation Commands`.

## Relevant Files (guía para proyectos web)

Enfócate en estas áreas (ajusta las rutas reales al repositorio):
- `README.md` / `docs/**` - visión general, configuración, convenciones
- `index.html` / `*.html` - estructura HTML
- `css/**` / `styles/**` - hojas de estilo
- `js/**` / `scripts/**` - funcionalidad JavaScript
- `tests/**` - pruebas (agregar prueba para regresión)
- `package.json` - dependencias

## Plan Format

```md
# Bug Fix: <bug title>

## Bug Description
<describe el bug en detalle: qué está roto, comportamiento esperado vs comportamiento actual>

## Steps to Reproduce
1. <paso 1>
2. <paso 2>
3. <paso 3>
Result: <qué ocurre (incorrecto)>
Expected: <qué debería ocurrir (correcto)>

## Root Cause
<identifica la causa raíz del bug después de la investigación>

## Solution Approach
<describe cómo lo corregirás y por qué este enfoque resuelve la causa raíz>

## Relevant Files
Archivos a modificar para esta corrección de bug:

<lista archivos relevantes y explica por qué en viñetas>

## Implementation Plan
### Phase 1: Investigation
<verifica el bug, reprodúcelo, entiende la causa raíz>

### Phase 2: Fix Implementation
<implementa la corrección para abordar la causa raíz>

### Phase 3: Verification
<prueba que el bug está corregido y no se introdujeron regresiones>

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
- Ejecuta todos los `Validation Commands` para asegurar que el bug está corregido y hay cero regresiones.

## Testing Strategy
### Bug Reproduction Test
<prueba que reproduce el bug antes de la corrección>

### Fix Verification
<verifica que el bug está corregido después de los cambios>

### Regression Testing
<asegura que ninguna otra funcionalidad se rompió>

## Acceptance Criteria
- <El bug está corregido y el comportamiento esperado está restaurado>
- <No se introdujeron regresiones>
- <Se agregó prueba para prevenir regresión>

## Validation Commands
Ejecuta cada comando para validar que el bug está corregido con cero regresiones.

- `<command to start dev server>`
- `<command to run tests if applicable>`
- `<command to validate HTML/CSS if applicable>`

## Notes
<notas opcionales: decisiones, compromisos, mejoras futuras>
```

## Bug

$ARGUMENTS

## Report

Resume el trabajo realizado en una breve lista de viñetas.

Incluye la ruta del plan que creaste en specs/*.md.
