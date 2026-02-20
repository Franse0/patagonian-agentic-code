# Review Implementation

Revisa el trabajo realizado contra un archivo de especificación (specs/*.md) para asegurar que las funcionalidades implementadas coincidan con los requisitos. Captura capturas de pantalla de la funcionalidad crítica según se documenta en la sección Instructions.

## Variables

- adw_id: $ARGUMENT
- spec_file: $ARGUMENT
- agent_name: $ARGUMENT si se proporciona, de lo contrario usa 'review_agent'
- review_image_dir: `<absolute path to project>/agents/<adw_id>/<agent_name>/review_img/`

## Instructions

- Verifica la rama git actual usando `git branch` para entender el contexto
- Ejecuta `git diff origin/main` para ver todos los cambios realizados en la rama actual
- Encuentra el archivo spec buscando archivos specs/*.md que coincidan con la rama actual
- Lee el archivo spec identificado para entender los requisitos
- **IMPORTANTE**: Para proyectos web, valida abriendo el sitio web:
  - Abre el sitio web en un navegador (usa servidor de desarrollo si es necesario)
  - Navega por las funcionalidades implementadas
  - Toma capturas de pantalla específicas para mostrar la funcionalidad
  - Verifica que la implementación coincida con los requisitos del spec
  - **Guías para Capturas de Pantalla**:
    - Captura prueba visual de las funcionalidades que funcionan
    - Navega a la aplicación y captura capturas de pantalla solo de rutas críticas basadas en el spec
    - Compara los cambios implementados con los requisitos del spec para verificar corrección
    - No captures todo el proceso, solo puntos críticos
    - **Apunta a 1-5 capturas de pantalla** para mostrar que la funcionalidad funciona según lo especificado
    - Si hay un problema de revisión, toma una captura de pantalla y agrégala al array `review_issues`
    - Numera las capturas de pantalla en orden: `01_<descriptive_name>.png`, `02_<descriptive_name>.png`, etc.
    - **Asegúrate de capturar el punto crítico de la nueva funcionalidad**
    - **Copia todas las capturas de pantalla a `review_image_dir`**
    - **Almacena las capturas de pantalla en `review_image_dir` usando rutas absolutas completas**
    - Enfócate solo en rutas de funcionalidad crítica
    - Usa nombres de archivo descriptivos que indiquen qué parte del cambio se verificó
- **IMPORTANTE**: Guías de Severidad de Problemas
  - Piensa cuidadosamente sobre el impacto en la funcionalidad y el usuario
  - Guías:
    - `skippable` - no bloqueante, puede lanzarse pero sigue siendo un problema
    - `tech_debt` - no bloqueante, crea deuda técnica para el futuro
    - `blocker` - debe abordarse inmediatamente, daña la UX o no funcionará según lo esperado
- **CRÍTICO - FORMATO DE SALIDA**: Tu ÚNICA respuesta final debe ser el objeto JSON puro
  - NADA antes del `{` de apertura
  - NADA después del `}` de cierre
  - Sin texto introductorio, sin resumen, sin markdown, sin bloques de código, sin triple backtick
  - Si escribís CUALQUIER cosa que no sea el JSON, el sistema falla completamente
  - Ejemplo de lo que NO debes hacer: "## Review Results..." o "```json..."
  - Ejemplo correcto: empieza directamente con `{` y termina con `}`
- Piensa cuidadosamente mientras trabajas en la revisión. Enfócate en la funcionalidad crítica y la experiencia del usuario.

## How to Open Website

**IMPORTANTE para este proyecto**: Este es un sitio HTML estático que se sirve con Python HTTP server en localhost:8000.

**Pasos para capturar screenshots:**

1. **Verificar que el servidor esté corriendo**: El servidor debe estar en `http://localhost:8000` (NO abrir archivos HTML directamente)

2. **Usar herramienta de screenshots**: Crea un script Python con Selenium/Playwright:
   - **IMPORTANTE**: Guarda el script en `review_image_dir/capture.py` (nunca en la raíz del proyecto)
   - Navega a `http://localhost:8000` o rutas específicas
   - Espera a que la página cargue completamente
   - Toma screenshots programáticamente
   - Guarda screenshots en `review_image_dir`

3. **Ejemplo de script de captura**:
```python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time

# Configurar Chrome sin pantalla de bienvenida
chrome_options = Options()
chrome_options.add_argument('--no-first-run')
chrome_options.add_argument('--no-default-browser-check')
chrome_options.add_argument('--disable-popup-blocking')

driver = webdriver.Chrome(options=chrome_options)

# Navegar y capturar
driver.get('http://localhost:8000')
time.sleep(2)  # Esperar carga
driver.save_screenshot('review_img/01_screenshot.png')

driver.quit()
```

**NUNCA uses `start index.html` o `start chrome` - siempre navega a localhost:8000 programáticamente**

## Report

- **IMPORTANTE**: Devuelve resultados exclusivamente como un objeto JSON basado en `Output Structure` a continuación
- `success` debe ser `true` si NO hay problemas BLOQUEANTES (la implementación coincide con el spec para funcionalidad crítica)
- `success` debe ser `false` SOLO si hay problemas BLOQUEANTES que previenen el lanzamiento
- `review_issues` puede contener problemas de cualquier severidad (skippable, tech_debt o blocker)
- `screenshots` SIEMPRE debe contener rutas mostrando la nueva funcionalidad, independientemente del estado de éxito. Usa rutas absolutas completas.
- Esto permite que agentes subsecuentes identifiquen y resuelvan rápidamente errores bloqueantes mientras documentan todos los problemas

## Output Structure

```json
{
    "success": "boolean - true si NO hay problemas BLOQUEANTES (puede tener skippable/tech_debt), false si existen problemas BLOQUEANTES",
    "review_summary": "string - 2-4 oraciones describiendo qué se construyó y si coincide con el spec. Escrito como reporte de standup. Ejemplo: 'The responsive navigation menu has been implemented with hamburger icon for mobile and smooth transitions. The implementation matches spec requirements for mobile-first design and accessibility. Minor CSS improvements could be made but all core functionality works as specified.'",
    "review_issues": [
        {
            "review_issue_number": "number - número de problema basado en índice",
            "screenshot_path": "string - /absolute/path/to/screenshot_showing_issue.png",
            "issue_description": "string - descripción del problema",
            "issue_resolution": "string - descripción de la resolución",
            "issue_severity": "string - severidad: 'skippable', 'tech_debt', 'blocker'"
        }
    ],
    "screenshots": [
        "string - /absolute/path/to/screenshot_01.png",
        "string - /absolute/path/to/screenshot_02.png"
    ]
}
```

## Examples

**Successful Review (no blocking issues):**
```json
{
    "success": true,
    "review_summary": "The contact form has been implemented with client-side validation and responsive design. Email format validation, required field checks, and error messages all work correctly. The form adapts properly to mobile screens and provides clear user feedback. All spec requirements have been met.",
    "review_issues": [
        {
            "review_issue_number": 1,
            "screenshot_path": "C:/Users/Francisco/Desktop/test-agentic/agents/abc1234/reviewer/review_img/03_submit_button_style.png",
            "issue_description": "Submit button hover state could be more prominent",
            "issue_resolution": "Consider adding a more visible hover effect to improve UX",
            "issue_severity": "skippable"
        }
    ],
    "screenshots": [
        "C:/Users/Francisco/Desktop/test-agentic/agents/abc1234/reviewer/review_img/01_contact_form_desktop.png",
        "C:/Users/Francisco/Desktop/test-agentic/agents/abc1234/reviewer/review_img/02_validation_errors.png",
        "C:/Users/Francisco/Desktop/test-agentic/agents/abc1234/reviewer/review_img/03_mobile_view.png"
    ]
}
```

**Failed Review (blocking issues):**
```json
{
    "success": false,
    "review_summary": "The navigation menu implementation has critical issues. While the desktop version works correctly, the mobile hamburger menu does not open when clicked. This is a blocker as mobile navigation is completely non-functional.",
    "review_issues": [
        {
            "review_issue_number": 1,
            "screenshot_path": "C:/Users/Francisco/Desktop/test-agentic/agents/xyz7890/reviewer/review_img/02_mobile_menu_broken.png",
            "issue_description": "Mobile hamburger menu does not open when clicked - JavaScript click handler not working",
            "issue_resolution": "Fix the click event listener in navigation.js and ensure menu toggle function is properly bound",
            "issue_severity": "blocker"
        }
    ],
    "screenshots": [
        "C:/Users/Francisco/Desktop/test-agentic/agents/xyz7890/reviewer/review_img/01_desktop_nav_working.png",
        "C:/Users/Francisco/Desktop/test-agentic/agents/xyz7890/reviewer/review_img/02_mobile_menu_broken.png"
    ]
}
```
