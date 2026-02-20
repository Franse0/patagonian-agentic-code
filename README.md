# test-agentic

Un proyecto simple de página web de aterrizaje construido para aprender y demostrar la automatización del **Flujo de Trabajo de Desarrollo con IA (ADW)** con Claude Code.

## 🎯 Propósito

Este proyecto es un sandbox de aprendizaje para implementar flujos de trabajo de desarrollo de software automatizados utilizando agentes de IA. Demuestra cómo:

- ✅ Procesar automáticamente issues de GitHub
- ✅ Generar planes de implementación
- ✅ Ejecutar implementaciones con IA
- ✅ Revisar cambios contra especificaciones
- ✅ Crear pull requests con contexto completo
- ✅ Automatizar el SDLC completo con Claude Code

## 🚀 Inicio Rápido

### Requisitos Previos

1. **Claude Code CLI** - Instalar desde https://docs.anthropic.com/en/docs/claude-code
2. **GitHub CLI** - `winget install --id GitHub.cli` (Windows)
3. **Python 3.10+** con **uv** - `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`
4. **Anthropic API Key** - Obtener desde https://console.anthropic.com/

### Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/your-username/test-agentic.git
   cd test-agentic
   ```

2. **Configurar el entorno:**
   ```bash
   cp .env.sample .env
   # Editar .env con tus valores reales
   ```

3. **Autenticar GitHub:**
   ```bash
   gh auth login
   ```

4. **Probar la configuración:**
   ```bash
   # Probar conexión con GitHub
   python adws/github.py

   # Probar Claude Code
   claude --version
   ```

## 📋 Estructura del Proyecto

```
test-agentic/
├── index.html              # Página de aterrizaje principal
├── css/                    # Hojas de estilo
├── js/                     # JavaScript
├── .claude/
│   └── commands/           # Comandos slash (feature, bug, implement, etc.)
├── adws/                   # Scripts de automatización del flujo de trabajo
│   ├── adw_plan_build.py  # Flujo de trabajo básico (plan + build)
│   ├── adw_plan_build_review.py  # Con revisión
│   └── trigger_webhook.py # Servidor de webhook
├── specs/                  # Planes de implementación
├── BUILD_WITH_AGENTIC_CODE.md  # Guía completa de configuración de ADW
└── CLAUDE.md               # Contexto del proyecto para Claude Code
```

## 🤖 Uso de Flujos de Trabajo ADW

### Opción 1: Activación Manual

Ejecutar flujo de trabajo para un issue específico de GitHub:

```bash
# Flujo de trabajo básico (plan + build + PR)
uv run adws/adw_plan_build.py <issue-number>

# Con revisión (plan + build + review + PR)
uv run adws/adw_plan_build_review.py <issue-number>
```

### Opción 2: Webhook (Automático)

1. **Iniciar servidor de webhook:**
   ```bash
   uv run adws/trigger_webhook.py
   ```

2. **Exponer a internet** (para que GitHub pueda acceder):
   ```bash
   ngrok http 8001
   ```

3. **Configurar webhook de GitHub:**
   - URL: `https://your-ngrok-url.ngrok.io/gh-webhook`
   - Eventos: Issues, Issue comments
   - Content type: `application/json`

4. **Activar flujos de trabajo:**
   - Abrir un nuevo issue → Flujo de trabajo automático
   - Comentar "adw" → Flujo de trabajo básico
   - Comentar "adw review" → Flujo de trabajo con revisión

## 📖 Guía Completa

Ver [BUILD_WITH_AGENTIC_CODE.md](./BUILD_WITH_AGENTIC_CODE.md) para:
- ✅ Configuración paso a paso desde cero
- ✅ Explicación completa de componentes
- ✅ Creación de comandos slash
- ✅ Desarrollo de scripts de flujo de trabajo
- ✅ Guía de solución de problemas
- ✅ Instrucciones de prueba

## 🔧 Desarrollo

### Ver el Sitio Web Localmente

```bash
# Opción 1: Servidor simple de Python
python -m http.server 8000
# Abrir http://localhost:8000

# Opción 2: http-server de Node.js (si está instalado)
npx http-server
# Abrir http://localhost:8080
```

### Crear una Nueva Funcionalidad

1. **Crear un issue en GitHub** describiendo la funcionalidad
2. **Ejecutar el flujo de trabajo ADW:**
   ```bash
   uv run adws/adw_plan_build_review.py <issue-number>
   ```
3. **Revisar el PR** que se crea automáticamente
4. **Hacer merge** cuando esté listo

## 🎓 Ruta de Aprendizaje

Si eres nuevo en ADW (Flujo de Trabajo de Desarrollo Agéntico):

1. **Leer** `BUILD_WITH_AGENTIC_CODE.md` - Guía completa
2. **Explorar** `.claude/commands/` - Ver cómo funcionan los comandos slash
3. **Estudiar** `adws/adw_plan_build.py` - Entender la orquestación del flujo de trabajo
4. **Probar** un issue simple - Crear un issue de prueba y ejecutar el flujo de trabajo
5. **Personalizar** - Adaptar comandos y flujos de trabajo a tus necesidades

## 📚 Conceptos Clave

### ADW ID
Cada ejecución del flujo de trabajo obtiene un ID único de 7 caracteres (ej., `abc1234`). Este ID:
- Rastrea todas las fases del flujo de trabajo
- Crea logs aislados en `agents/{adw_id}/`
- Aparece en commits y PRs
- Permite depuración y reanudación de flujos de trabajo

### Comandos Slash
Plantillas en `.claude/commands/` que Claude Code ejecuta:
- `/classify_issue` - Determina el tipo de issue
- `/feature` - Crea plan de funcionalidad
- `/implement` - Ejecuta el plan
- `/review` - Revisa la implementación
- `/commit` - Crea un commit
- `/pull_request` - Crea un PR

### Flujos de Trabajo
Scripts de Python que orquestan múltiples comandos slash:
- `adw_plan_build.py` - Automatización básica
- `adw_plan_build_review.py` - Con paso de revisión
- Extensible para pipelines personalizados

## 🛠️ Stack Tecnológico

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Sistema ADW:** Python 3.10+, Claude Code, GitHub CLI
- **Automatización:** FastAPI (webhooks), uv (gestor de paquetes de Python)
- **IA:** Claude Sonnet 4.5, Opus 4.6, Haiku 4.5

## 🤝 Contribuciones

¡Este es un proyecto de aprendizaje! Siéntete libre de:
- Crear issues para probar el flujo de trabajo ADW
- Sugerir mejoras a la automatización
- Compartir tus propias implementaciones de ADW
- Reportar bugs o problemas

## 📄 Licencia

Licencia MIT - ¡Siéntete libre de usar esto como plantilla para tus propios proyectos!

## 🔗 Recursos

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Build Guide](./BUILD_WITH_AGENTIC_CODE.md)

---

**Construido con 🤖 Claude Code** - Demostrando flujos de trabajo de desarrollo impulsados por IA
