#!/usr/bin/env -S uv run
# /// script
# dependencies = ["fastapi", "uvicorn", "python-dotenv"]
# ///

"""
GitHub Webhook Trigger - AI Developer Workflow (ADW)

Endpoint webhook de FastAPI que recibe eventos de issues de GitHub y activa flujos de trabajo ADW.
Responde inmediatamente para cumplir con el timeout de 10 segundos de GitHub lanzando flujos de trabajo
en segundo plano.

Uso: uv run trigger_webhook.py

Requisitos de Entorno:
- PORT: Puerto del servidor (por defecto: 8001)
- GITHUB_REPO_URL: URL del repositorio de GitHub
- ANTHROPIC_API_KEY: Clave API de Claude
- GITHUB_WEBHOOK_SECRET: (opcional) Secreto para validar webhooks
"""

import os
import subprocess
import sys
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from dotenv import load_dotenv
import uvicorn

# Agregar directorio adws al path
sys.path.insert(0, str(Path(__file__).parent))
from utils import make_adw_id

# Cargar variables de entorno
load_dotenv()

# Configuración
PORT = int(os.getenv("PORT", "8001"))
WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")

# Crear aplicación FastAPI
app = FastAPI(
    title="ADW Webhook Trigger",
    description="GitHub webhook endpoint for AI Development Workflow automation"
)

print(f"Starting ADW Webhook Trigger on port {PORT}")


@app.get("/")
async def root():
    """Endpoint raíz con información del servicio."""
    return {
        "service": "ADW Webhook Trigger",
        "status": "running",
        "endpoints": {
            "webhook": "POST /gh-webhook",
            "health": "GET /health"
        }
    }


@app.get("/health")
async def health():
    """Endpoint de verificación de salud."""
    try:
        # Verificar que el entorno esté configurado
        missing_vars = []
        if not os.getenv("ANTHROPIC_API_KEY"):
            missing_vars.append("ANTHROPIC_API_KEY")
        if not os.getenv("GITHUB_REPO_URL"):
            missing_vars.append("GITHUB_REPO_URL")

        if missing_vars:
            return {
                "status": "unhealthy",
                "service": "adw-webhook-trigger",
                "error": f"Missing environment variables: {', '.join(missing_vars)}"
            }

        return {
            "status": "healthy",
            "service": "adw-webhook-trigger",
            "port": PORT,
            "configured": {
                "anthropic_api": bool(os.getenv("ANTHROPIC_API_KEY")),
                "github_repo": bool(os.getenv("GITHUB_REPO_URL")),
                "webhook_secret": bool(WEBHOOK_SECRET)
            }
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "adw-webhook-trigger",
            "error": str(e)
        }


@app.post("/gh-webhook")
async def github_webhook(request: Request):
    """Manejar eventos de webhook de GitHub."""
    try:
        # Obtener tipo de evento desde el header
        event_type = request.headers.get("X-GitHub-Event", "")
        print(f"Received webhook request - Event type: '{event_type}'")

        # Leer el body raw para debugging
        body = await request.body()
        print(f"Body length: {len(body)} bytes")

        if not body:
            print("ERROR: Empty body received")
            if event_type == "ping":
                print("Received GitHub ping event - webhook is configured correctly!")
                return {
                    "status": "ok",
                    "message": "Webhook endpoint is active",
                    "event": "ping"
                }
            return {
                "status": "error",
                "message": "Empty payload"
            }

        # Intentar parsear el payload
        import json as json_module
        from urllib.parse import parse_qs

        payload = None

        # Verificar si es form-encoded (empieza con "payload=")
        if body.startswith(b'payload='):
            print("Detected form-encoded payload, decoding...")
            try:
                # Decodificar form data
                parsed = parse_qs(body.decode('utf-8'))
                if 'payload' in parsed:
                    payload = json_module.loads(parsed['payload'][0])
                    print("Successfully decoded form-encoded payload")
            except Exception as e:
                print(f"Failed to decode form-encoded payload: {e}")
        else:
            # Intentar como JSON directo
            try:
                payload = json_module.loads(body.decode('utf-8'))
                print("Successfully parsed JSON payload")
            except Exception as json_error:
                print(f"Failed to parse JSON payload: {json_error}")
                print(f"Body preview: {body[:200]}")

        # Si no se pudo parsear el payload
        if payload is None:
            # Manejar ping events de GitHub
            if event_type == "ping":
                print("Received GitHub ping event - webhook is configured correctly!")
                return {
                    "status": "ok",
                    "message": "Webhook endpoint is active",
                    "event": "ping"
                }
            # Si no es ping, devolver error pero con status 200 para evitar reintentos
            print(f"ERROR: Cannot process webhook - could not parse payload")
            return {
                "status": "error",
                "message": "Invalid payload format"
            }

        # Extraer detalles del evento
        action = payload.get("action", "")
        issue = payload.get("issue", {})
        issue_number = issue.get("number")

        print(f"Received webhook: event={event_type}, action={action}, issue_number={issue_number}")

        should_trigger = False
        trigger_reason = ""
        workflow_script = "adw_plan_build_review_document.py"  # Flujo completo por defecto

        # Verificar si es un evento de issue abierto
        if event_type == "issues" and action == "opened" and issue_number:
            should_trigger = True
            trigger_reason = "New issue opened"

        # Verificar si es un comentario de issue con texto 'adw'
        elif event_type == "issue_comment" and action == "created" and issue_number:
            comment = payload.get("comment", {})
            comment_body = comment.get("body", "").strip().lower()

            print(f"Comment body: '{comment_body}'")

            if comment_body == "adw" or comment_body == "adw review" or comment_body == "adw full" or comment_body == "adw document":
                should_trigger = True
                trigger_reason = f"Comment with '{comment_body}' command"
                workflow_script = "adw_plan_build_review_document.py"

        if should_trigger:
            # Generar ID de ADW para este flujo de trabajo
            adw_id = make_adw_id()

            # Construir comando para ejecutar script de workflow
            script_dir = Path(__file__).parent
            project_root = script_dir.parent
            workflow_path = script_dir / workflow_script

            cmd = ["uv", "run", str(workflow_path), str(issue_number), adw_id]

            print(f"Launching background process: {' '.join(cmd)} (reason: {trigger_reason})")

            # Lanzar en segundo plano usando Popen
            # Ejecutar desde la raíz del proyecto
            process = subprocess.Popen(
                cmd,
                cwd=str(project_root),
                env=os.environ.copy(),
                # En Windows, esto ayuda a separar el proceso
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )

            print(f"Background process started for issue #{issue_number} with ADW ID: {adw_id}")
            print(f"Logs will be written to: agents/{adw_id}/*/execution.log")

            # Retornar inmediatamente
            return {
                "status": "accepted",
                "issue": issue_number,
                "adw_id": adw_id,
                "workflow": workflow_script,
                "message": f"ADW workflow triggered for issue #{issue_number}",
                "reason": trigger_reason,
                "logs": f"agents/{adw_id}/"
            }
        else:
            print(f"Ignoring webhook: event={event_type}, action={action}, issue_number={issue_number}")
            return {
                "status": "ignored",
                "reason": f"Not a triggering event (event={event_type}, action={action})"
            }

    except Exception as e:
        print(f"Error processing webhook: {e}")
        # Always return 200 to GitHub to prevent retries
        return {
            "status": "error",
            "message": "Internal error processing webhook"
        }


if __name__ == "__main__":
    print(f"Starting server on http://0.0.0.0:{PORT}")
    print(f"Webhook endpoint: POST /gh-webhook")
    print(f"Health check: GET /health")
    print(f"\nTo expose this server to GitHub:")
    print(f"  1. Use ngrok: ngrok http {PORT}")
    print(f"  2. Configure webhook in GitHub with the ngrok URL")
    print(f"  3. Set events: Issues, Issue comments")

    uvicorn.run(app, host="0.0.0.0", port=PORT)
