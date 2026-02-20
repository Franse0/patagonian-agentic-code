# Documentar Feature

Genera documentación markdown concisa para las características implementadas analizando los cambios de código y las especificaciones.

## Variables

- adw_id: $ARGUMENT (requerido)
- spec_path: $ARGUMENT (opcional - ruta al archivo de especificación)
- documentation_screenshots_dir: $ARGUMENT (opcional - directorio con capturas de pantalla)

## Instructions

### 1. Analizar Cambios

- Ejecuta `git diff origin/main --stat` para ver archivos modificados
- Ejecuta `git diff origin/main --name-only` para lista de archivos
- Para cambios >50 líneas: `git diff origin/main <file>`

### 2. Leer Especificación

Si `spec_path` se proporciona:
- Lee requisitos originales
- Entiende funcionalidad esperada
- Identifica criterios de éxito

### 3. Copiar Screenshots

Si `documentation_screenshots_dir` se proporciona:
- Crea `app_docs/assets/` si no existe
- Copia todos los `*.png` a `app_docs/assets/`
- Preserva nombres originales
- Usa rutas relativas en docs: `assets/nombre.png`

### 4. Generar Documentación

Crea: `app_docs/feature-{adw_id}-{nombre-descriptivo}.md`

**Contenido:**
```md
# <Título Feature>

**ADW ID:** {adw_id}
**Fecha:** {fecha actual}
**Especificación:** {spec_path o "N/A"}

## Resumen

{2-3 oraciones de qué se construyó y por qué}

## Screenshots

![Descripción](assets/screenshot.png)

## Lo Construido

- Componente 1
- Componente 2

## Implementación Técnica

### Archivos Modificados
- `path/file`: cambios realizados

### Cambios Clave
- Cambio técnico 1
- Cambio técnico 2

## Cómo Usar

1. Paso 1
2. Paso 2

## Configuración

{Configuraciones necesarias}

## Pruebas

{Cómo probar}

## Notas

{Contexto adicional}
```

### 5. Output

**IMPORTANTE**: Devuelve ÚNICAMENTE la ruta al archivo creado, sin texto adicional.

Formato: `app_docs/feature-{adw_id}-{nombre}.md`

NO incluyas explicaciones, solo la ruta.
