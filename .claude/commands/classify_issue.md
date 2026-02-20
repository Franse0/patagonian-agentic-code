# Clasificar Issue

Lee la descripción de una tarea/issue y devuelve qué tipo de trabajo es para seleccionar el comando correcto.

## Tipos Posibles

- `/feature` → funcionalidad nueva o mejora visible para el usuario
- `/bug` → algo que funciona mal actualmente (error, comportamiento incorrecto, regresión)
- `/chore` → mantenimiento/refactorización/limpieza, sin cambio funcional esperado para el usuario final
- `0` → no se puede clasificar con seguridad

## Reglas Simples

- Si habla de "agregar/permitir/implementar" algo nuevo → `/feature`
- Si habla de "error/falla/no funciona/incorrecto" → `/bug`
- Si habla de "refactor/limpiar/organizar/actualizar dependencias" → `/chore`
- Si es ambiguo o mezcla demasiado → `0`

## Input
$ARGUMENTS

## Output

**CRÍTICO**: Devuelve ÚNICAMENTE uno de estos 4 valores exactos, sin nada más:

- `/feature`
- `/bug`
- `/chore`
- `0`

NO incluyas:
- Explicaciones ("Based on...", "This is a...", etc.)
- Texto adicional
- Formato markdown
- Backticks alrededor del comando
- Saltos de línea extras

SOLO el comando, nada más. Ejemplo de salida correcta:

/bug
