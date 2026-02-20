# Planificación de Funcionalidad

Crea un nuevo plan en `specs/*.md` para implementar la `Feature` (nueva funcionalidad) usando exactamente el `Plan Format` indicado a continuación. Sigue las `Instructions` y usa `Relevant Files` para enfocar el trabajo apropiadamente.

## Instructions

- IMPORTANTE: Estás escribiendo un **plan** para implementar una nueva funcionalidad. **No la implementes aquí**, solo planifica.
- La `Feature` describe lo que se construirá y el valor que proporciona (ej., "Menú de navegación responsive", "Formulario de contacto con validación", etc.).
- Crea el plan dentro de `specs/*.md`. Elige un nombre de archivo claro basado en la funcionalidad (ej., `specs/feature-responsive-navigation.md`).
- Reemplaza **todos** los `<placeholders>` en el formato.
- Antes de planificar, investiga el código base para entender patrones, arquitectura y convenciones.
- Diseña para mantenibilidad y extensibilidad (módulos separados, responsabilidades claras).
- Si necesitas una nueva biblioteca, documéntalo en `Notes`.
- No reinventes la rueda: sigue las convenciones existentes del proyecto.
- El último paso del plan siempre debe ser ejecutar los `Validation Commands`.

## Relevant Files (guía para proyectos web)

Enfócate en estas áreas (ajusta las rutas reales al repositorio):
- `README.md` / `docs/**` - visión general, configuración, convenciones y decisiones
- `index.html` / `*.html` - estructura y contenido HTML
- `css/**` / `styles/**` - hojas de estilo y sistema de diseño
- `js/**` / `scripts/**` - funcionalidad JavaScript
- `assets/**` / `images/**` - recursos estáticos
- `components/**` - componentes reutilizables (si usas framework)
- `tests/**` - pruebas unitarias e integración
- `package.json` / `dependencies` - dependencias del proyecto

Ignora el resto del repositorio a menos que sea estrictamente necesario.

## Plan Format

```md
# Feature: <feature name>

## Feature Description
<describe la funcionalidad en detalle, propósito, alcance y valor para el usuario final>

## User Story
As a <tipo de usuario: visitor / user / admin / system>
I want <acción/objetivo>
So that <beneficio/valor>

## Problem Statement
<define claramente el problema u oportunidad que esta funcionalidad resuelve>

## Solution Approach
<describe el enfoque propuesto y por qué resuelve el problema>

## Relevant Files
Usa estos archivos para implementar la funcionalidad:

<lista archivos relevantes y explica por qué en viñetas. Si hay archivos nuevos, agrega una sección h3 "New Files".>

### New Files
- `<path/new_file>` - <por qué existe>

## Implementation Plan
### Phase 1: Foundation
<trabajo fundamental: estructura, andamiaje, componentes base, utilidades, etc.>

### Phase 2: Core Implementation
<lógica principal de la funcionalidad: estructura HTML, estilos CSS, funcionalidad JavaScript>

### Phase 3: Integration
<cómo se integra con el código existente: navegación, eventos, comportamiento responsive, accesibilidad>

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) <step title>
- <tarea concreta>
- <tarea concreta>
- <prueba o verificación asociada>

### 2) <step title>
- <tarea concreta>
- <tarea concreta>
- <prueba o verificación asociada>

### N) Final Validation
- Ejecuta todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy
### Manual Testing
<pruebas manuales para verificación visual y funcional>

### Automated Tests
<pruebas automatizadas si aplica: pruebas unitarias, pruebas de integración>

### Edge Cases
- <dispositivos móviles / pantallas pequeñas>
- <compatibilidad de navegadores>
- <accesibilidad (navegación por teclado, lectores de pantalla)>
- <red lenta / recursos grandes>
- <casos extremos de validación de formularios>

## Acceptance Criteria
- <criterio medible 1>
- <criterio medible 2>
- <criterio medible 3>

## Validation Commands
Ejecuta cada comando para validar que la funcionalidad funciona correctamente con cero regresiones.

- `<command to start dev server>`
- `<command to run tests if applicable>`
- `<command to validate HTML/CSS if applicable>`
- `<command for linting/formatting if applicable>`

## Notes
<notas opcionales: decisiones, compromisos, bibliotecas agregadas, mejoras futuras>
```

## Feature

$ARGUMENTS

## Report

Resume el trabajo realizado en una breve lista de viñetas.

Incluye la ruta del plan que creaste en specs/*.md.
