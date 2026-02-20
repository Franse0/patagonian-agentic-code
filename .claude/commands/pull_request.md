# Create Pull Request

Crea un pull request con contexto completo de todos los commits en la rama actual.

## Instructions

1. **Entiende el contexto de la rama** - Ejecuta estos comandos en paralelo:
   - `git status` - ver archivos sin seguimiento
   - `git diff` - ver cambios staged/unstaged
   - Verifica si la rama rastrea el remoto y está actualizada
   - `git log --oneline origin/main..HEAD` - ver todos los commits en esta rama
   - `git diff origin/main...HEAD` - ver el diff completo desde que la rama divergió

2. **Redacta el título y descripción del PR**:
   - Título: Corto (menos de 70 caracteres), descripción clara
   - Descripción: Analiza TODOS los commits (no solo el último) para resumir el trabajo

3. **Crea rama y haz push si es necesario** (ejecutar en paralelo):
   - Crea nueva rama si es necesario
   - Haz push al remoto con flag `-u` si es necesario
   - Crea PR usando `gh pr create` con formato heredoc

## PR Description Format

```markdown
## Summary
- <punto 1>
- <punto 2>
- <punto 3>

## Changes
<descripción breve de qué se cambió y por qué>

## Testing
<cómo probar los cambios>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## GitHub CLI Command

```bash
gh pr create --base main --no-draft --title "PR title here" --body "$(cat <<'EOF'
## Summary
- Implemented responsive navigation menu
- Added mobile hamburger menu with smooth animations
- Ensured accessibility with keyboard navigation

## Changes
Created a mobile-friendly navigation system that adapts to different screen sizes. The menu collapses into a hamburger icon on mobile devices and expands smoothly when clicked.

## Testing
- Open the site on desktop and mobile
- Click the hamburger menu on mobile
- Test keyboard navigation (Tab, Enter, Escape)
- Verify smooth animations and transitions

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Important Notes

- NO uses las herramientas TodoWrite o Task
- Devuelve la URL del PR cuando termines
- El título debe estar orientado a la acción (ej., "Add responsive navigation" no "Responsive navigation")
- Mira TODOS los commits en la rama, no solo el último
- **SIEMPRE usa `--base main --no-draft`** en el comando `gh pr create` — nunca omitas estos flags

## Report

Después de crear el PR:
- Muestra el número y URL del PR
- Confirma que el PR se creó exitosamente
