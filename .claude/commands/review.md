# Review Implementation

Revisa el trabajo realizado contra un archivo de especificación (specs/*.md) para asegurar que las funcionalidades implementadas coincidan con los requisitos. Captura capturas de pantalla de la funcionalidad crítica.

## Variables

- adw_id: $ARGUMENT
- spec_file: $ARGUMENT
- agent_name: $ARGUMENT si se proporciona, de lo contrario usa 'review_agent'
- review_image_dir: `<absolute path to project>/agents/<adw_id>/<agent_name>/review_img/`

## Instructions

- Verifica la rama git actual usando `git branch` para entender el contexto
- Ejecuta `git diff origin/main` para ver todos los cambios realizados en la rama actual
- Lee el archivo spec para entender los requisitos
- **IMPORTANTE**: Valida abriendo el sitio web y capturando las features implementadas

### Guías para Capturas de Pantalla

- **Apunta a 1-5 capturas de pantalla** mostrando la funcionalidad nueva, no pantallas genéricas
- Numera en orden: `01_<nombre_descriptivo>.png`, `02_<nombre_descriptivo>.png`, etc.
- Guarda el script de captura en `review_image_dir/capture.py` (nunca en la raíz del proyecto)
- **CRÍTICO**: Si la feature requiere un estado de juego previo que no se puede alcanzar naturalmente (ej: pantalla de victoria, fin de partida, estado de combate), **usa JavaScript vía Selenium para simular ese estado**:
  - Ejemplo: `driver.execute_script("document.getElementById('end-screen').hidden = false")`
  - Ejemplo: `driver.execute_script("window.Game && window.Game.showEndScreen && window.Game.showEndScreen('player1')")`
  - Manipula el DOM directamente para mostrar la UI que estás revisando
  - **NO te conformes con solo capturar el lobby o la pantalla inicial si la feature es otra cosa**

### Severidad de Problemas

- `skippable` - no bloqueante, puede lanzarse
- `tech_debt` - no bloqueante, crea deuda técnica
- `blocker` - debe corregirse, daña la UX o no funciona según lo esperado

## How to Open Website

**IMPORTANTE**: Este es un sitio HTML estático servido con Python HTTP server en `http://localhost:8000`.

Crea un script Python con Selenium/Playwright en `review_image_dir/capture.py`:

```python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time, os

os.makedirs('review_img', exist_ok=True)

chrome_options = Options()
chrome_options.add_argument('--no-first-run')
chrome_options.add_argument('--no-default-browser-check')

driver = webdriver.Chrome(options=chrome_options)
driver.get('http://localhost:8000')
time.sleep(2)

# Para simular estados: usa execute_script
# driver.execute_script("document.getElementById('end-screen').hidden = false")

driver.save_screenshot('review_img/01_feature.png')
driver.quit()
```

**NUNCA uses `start index.html` o `start chrome` — siempre navega a localhost:8000 programáticamente**

## FORMATO DE SALIDA — CRÍTICO

Tu respuesta final debe ser **ÚNICAMENTE** el objeto JSON.

REGLAS ABSOLUTAS:
- Empieza tu respuesta con `{` — sin NADA antes
- Termina tu respuesta con `}` — sin NADA después
- SIN texto introductorio, SIN markdown, SIN bloques de código, SIN triple backtick
- SIN "## Review Results", SIN "Here is the JSON", SIN explicaciones

Si incluís cualquier texto fuera del JSON, el sistema crashea y el workflow falla.

## Output Structure

El JSON debe tener exactamente esta estructura:

{
    "success": true,
    "review_summary": "2-4 oraciones describiendo qué se construyó y si coincide con el spec.",
    "review_issues": [
        {
            "review_issue_number": 1,
            "screenshot_path": "C:/ruta/absoluta/al/screenshot.png",
            "issue_description": "descripción del problema",
            "issue_resolution": "cómo resolverlo",
            "issue_severity": "skippable"
        }
    ],
    "screenshots": [
        "C:/ruta/absoluta/01_feature.png",
        "C:/ruta/absoluta/02_feature.png"
    ]
}

## Ejemplo de salida correcta

{"success":true,"review_summary":"The victory screen was implemented correctly. The checkVictoryCondition function works as expected. All spec requirements met.","review_issues":[],"screenshots":["C:/Users/Francisco/Desktop/test-agentic2/agents/abc1234/review_agent/review_img/01_victory_screen.png"]}

## Ejemplo de salida INCORRECTA (nunca hagas esto)

INCORRECTO — tiene texto antes del JSON:
  ## Review Results
  {"success": true, ...}

INCORRECTO — tiene triple backtick:
  ```json
  {"success": true, ...}
  ```
