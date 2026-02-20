# Generar Nombre de Branch

Genera un nombre de branch de Git basado en el tipo de trabajo y un título corto. Mantenlo simple y consistente.

## Formato

`<tipo>-<numero>-<titulo-corto>`

- `<tipo>`: `feature` | `bug` | `chore`
- `<numero>`: número del issue/tarea (si no hay, usar `0000`)
- `<titulo-corto>`: 3 a 6 palabras, en minúsculas, sin caracteres especiales, separadas por guiones

## Reglas

- Todo en minúsculas
- Reemplazar espacios con `-`
- Quitar tildes y caracteres especiales
- Sin puntos, comas, paréntesis ni símbolos
- Si queda muy largo, acortar manteniendo el significado

## Ejemplos

- `feature-0123-menu-navegacion-responsive`
- `bug-0048-error-validacion-formulario`
- `chore-0000-refactorizar-estructura-css`

## Pasos en Git

1) Asegurarse de estar en `main` y actualizado:
- `git checkout main`
- `git pull`

2) Crear el branch:
- `git checkout -b <nombre-branch>`

## Input
$ARGUMENTS

## Output

**IMPORTANTE**: Devuelve ÚNICAMENTE el nombre del branch, sin texto adicional, sin formato markdown, sin backticks, sin explicaciones.

Formato de salida:
```
<tipo>-<numero>-<titulo-corto>
```

NO incluyas:
- Texto explicativo ("Based on...", "Here's the branch name:", etc.)
- Bloques de código con ```
- Saltos de línea adicionales
- Puntuación extra

SOLO el nombre del branch en una línea.
