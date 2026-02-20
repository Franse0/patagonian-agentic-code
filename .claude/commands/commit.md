# Commit Changes

Crea un mensaje de commit bien formateado y realiza commit de todos los cambios con la atribución apropiada a Claude.

## Instructions

1. Revisa todos los cambios con:
   - `git status` - ver archivos sin seguimiento
   - `git diff` - ver cambios staged y unstaged
   - `git log --oneline -5` - ver commits recientes para referencia de estilo

2. Analiza los cambios y redacta el mensaje de commit:
   - Identifica el tipo: nueva funcionalidad, corrección de bug, refactorización, documentación, etc.
   - Escribe de forma concisa (1-2 oraciones) enfocándote en el "por qué" no en el "qué"
   - Asegura que el mensaje refleje con precisión los cambios y su propósito

3. Agrega archivos relevantes al staging y crea el commit:
   - Agrega archivos sin seguimiento relevantes
   - Crea commit con mensaje que termine con:
     ```
     Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
     ```

4. Ejecuta `git status` después del commit para verificar éxito

## Important Notes

- NUNCA omitas hooks (--no-verify, --no-gpg-sign) a menos que se solicite explícitamente
- NO hagas push a menos que el usuario lo pida explícitamente
- Si el pre-commit hook falla, corrige el problema y crea un NUEVO commit (no uses amend)
- Prefiere agregar archivos específicos por nombre en lugar de `git add -A` o `git add .`
- No hagas commit de archivos con secretos (.env, credentials)

## Git Safety

- NUNCA ejecutes comandos git destructivos (push --force, reset --hard, checkout ., restore ., clean -f, branch -D) a menos que se solicite explícitamente
- NUNCA hagas force push a main/master
- Siempre crea NUEVOS commits en lugar de hacer amend
- Cuando el hook falle, corrige y haz commit de nuevo (no uses --amend)

## Commit Message Format

Usa heredoc para el formato apropiado:

```bash
git commit -m "$(cat <<'EOF'
<type>: <descripción corta>

<descripción más larga opcional si es necesaria>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

## Examples

**Feature:**
```
feat: add responsive navigation menu

Implemented mobile-friendly navigation with hamburger menu and smooth transitions.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Bug Fix:**
```
fix: correct form validation error on submit

Fixed issue where empty form fields weren't being validated properly.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Chore:**
```
chore: refactor CSS structure for maintainability

Reorganized stylesheets into modular components for better code organization.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Report

Después del commit:
- Confirma que el commit se creó exitosamente
- Muestra el hash y mensaje del commit
- Muestra el estado actual de git
