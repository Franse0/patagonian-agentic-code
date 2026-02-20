"""Módulo de agente de Claude Code para ejecutar prompts programáticamente."""

import subprocess
import sys
import os
import json
import re
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path
from dotenv import load_dotenv
from data_types import (
    AgentPromptRequest,
    AgentPromptResponse,
    AgentTemplateRequest,
    ClaudeCodeResultMessage,
)

# Cargar variables de entorno
load_dotenv()

# Obtener ruta del CLI de Claude Code desde las variables de entorno
CLAUDE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")


def check_claude_installed() -> Optional[str]:
    """Verificar si el CLI de Claude Code está instalado. Retornar mensaje de error si no lo está."""
    try:
        result = subprocess.run(
            [CLAUDE_PATH, "--version"], capture_output=True, text=True
        )
        if result.returncode != 0:
            return f"Error: Claude Code CLI is not installed. Expected at: {CLAUDE_PATH}"
    except FileNotFoundError:
        return f"Error: Claude Code CLI is not installed. Expected at: {CLAUDE_PATH}"
    return None


def parse_jsonl_output(output_file: str) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """Parsear archivo de salida JSONL y retornar todos los mensajes y el mensaje de resultado.

    Returns:
        Tupla de (all_messages, result_message) donde result_message es None si no se encuentra
    """
    try:
        with open(output_file, "r", encoding="utf-8") as f:
            # Read all lines and parse each as JSON
            messages = [json.loads(line) for line in f if line.strip()]

            # Find the result message (should be the last one)
            result_message = None
            for message in reversed(messages):
                if message.get("type") == "result":
                    result_message = message
                    break

            return messages, result_message
    except Exception as e:
        print(f"Error parsing JSONL file: {e}", file=sys.stderr)
        return [], None


def convert_jsonl_to_json(jsonl_file: str) -> str:
    """Convertir archivo JSONL a archivo de arreglo JSON.

    Crea un archivo .json con el mismo nombre que el archivo .jsonl,
    conteniendo todos los mensajes como un arreglo JSON.

    Returns:
        Ruta al archivo JSON creado
    """
    # Crear nombre de archivo JSON reemplazando .jsonl con .json
    json_file = jsonl_file.replace('.jsonl', '.json')

    # Parsear el archivo JSONL
    messages, _ = parse_jsonl_output(jsonl_file)

    # Escribir como arreglo JSON
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(messages, f, indent=2)

    print(f"Created JSON file: {json_file}")
    return json_file


def get_claude_env() -> Dict[str, str]:
    """Obtener variables de entorno para la ejecución de Claude Code.

    Retorna un diccionario conteniendo las variables de entorno necesarias
    para que Claude Code funcione correctamente en Windows.
    """
    required_env_vars = {
        # Configuración de Anthropic (requerida)
        "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),

        # Configuración de Claude Code
        "CLAUDE_CODE_PATH": os.getenv("CLAUDE_CODE_PATH", "claude"),
        "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR": os.getenv("CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR", "true"),

        # Variables de entorno básicas que Claude Code podría necesitar (Windows)
        "USERPROFILE": os.getenv("USERPROFILE"),
        "USERNAME": os.getenv("USERNAME"),
        "PATH": os.getenv("PATH"),
        "TEMP": os.getenv("TEMP"),
        "TMP": os.getenv("TMP"),
        "SYSTEMROOT": os.getenv("SYSTEMROOT"),
        "COMSPEC": os.getenv("COMSPEC"),
        "PATHEXT": os.getenv("PATHEXT"),
    }

    # Agregar tokens de GitHub si GITHUB_PAT existe
    github_pat = os.getenv("GITHUB_PAT")
    if github_pat:
        required_env_vars["GITHUB_PAT"] = github_pat
        required_env_vars["GH_TOKEN"] = github_pat  # Claude Code usa GH_TOKEN

    # Filtrar valores None
    return {k: v for k, v in required_env_vars.items() if v is not None}


def save_prompt(prompt: str, adw_id: str, agent_name: str = "ops") -> None:
    """Guardar un prompt en el directorio de logging apropiado."""
    # Extraer comando slash del prompt
    match = re.match(r'^(/\w+)', prompt)
    if not match:
        return

    slash_command = match.group(1)
    # Eliminar barra diagonal inicial para el nombre de archivo
    command_name = slash_command[1:]

    # Crear estructura de directorio en la raíz del proyecto (padre de adws)
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent
    prompt_dir = project_root / "agents" / adw_id / agent_name / "prompts"
    prompt_dir.mkdir(parents=True, exist_ok=True)

    # Guardar prompt a archivo
    prompt_file = prompt_dir / f"{command_name}.txt"
    with open(prompt_file, "w", encoding="utf-8") as f:
        f.write(prompt)

    print(f"Saved prompt to: {prompt_file}")


def prompt_claude_code(request: AgentPromptRequest) -> AgentPromptResponse:
    """Ejecutar Claude Code con la configuración de prompt dada."""

    # Verificar si el CLI de Claude Code está instalado
    error_msg = check_claude_installed()
    if error_msg:
        return AgentPromptResponse(output=error_msg, success=False, session_id=None)

    # Guardar prompt antes de la ejecución
    save_prompt(request.prompt, request.adw_id, request.agent_name)

    # Crear directorio de salida si es necesario
    output_path = Path(request.output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Construir comando - siempre usar formato stream-json y verbose
    cmd = [CLAUDE_PATH, "-p", request.prompt]
    cmd.extend(["--model", request.model])
    cmd.extend(["--output-format", "stream-json"])
    cmd.append("--verbose")

    # Agregar flag de skip permissions peligroso si está habilitado
    if request.dangerously_skip_permissions:
        cmd.append("--dangerously-skip-permissions")

    # Configurar entorno con variables requeridas
    env = get_claude_env()

    try:
        # Ejecutar Claude Code y redirigir salida a archivo
        with open(request.output_file, "w", encoding="utf-8") as f:
            result = subprocess.run(
                cmd,
                stdout=f,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
                shell=False  # Windows: Usar shell=False para mejor seguridad
            )

        if result.returncode == 0:
            print(f"Output saved to: {request.output_file}")

            # Parsear el archivo JSONL
            messages, result_message = parse_jsonl_output(request.output_file)

            # Convertir JSONL a archivo de arreglo JSON
            json_file = convert_jsonl_to_json(request.output_file)

            if result_message:
                # Extraer session_id del mensaje de resultado
                session_id = result_message.get("session_id")

                # Verificar si hubo un error en el resultado
                is_error = result_message.get("is_error", False)
                result_text = result_message.get("result", "")

                return AgentPromptResponse(
                    output=result_text,
                    success=not is_error,
                    session_id=session_id
                )
            else:
                # No se encontró mensaje de resultado, retornar salida cruda
                with open(request.output_file, "r", encoding="utf-8") as f:
                    raw_output = f.read()
                return AgentPromptResponse(
                    output=raw_output,
                    success=True,
                    session_id=None
                )
        else:
            error_msg = f"Claude Code error: {result.stderr}"
            print(error_msg, file=sys.stderr)
            return AgentPromptResponse(output=error_msg, success=False, session_id=None)

    except subprocess.TimeoutExpired:
        error_msg = "Error: Claude Code command timed out"
        print(error_msg, file=sys.stderr)
        return AgentPromptResponse(output=error_msg, success=False, session_id=None)
    except Exception as e:
        error_msg = f"Error executing Claude Code: {e}"
        print(error_msg, file=sys.stderr)
        return AgentPromptResponse(output=error_msg, success=False, session_id=None)


def execute_template(request: AgentTemplateRequest) -> AgentPromptResponse:
    """Ejecutar una plantilla de Claude Code con comando slash y argumentos."""
    # Construir prompt desde comando slash y args
    prompt = f"{request.slash_command} {' '.join(request.args)}"

    # Crear directorio de salida con adw_id en la raíz del proyecto
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent
    output_dir = project_root / "agents" / request.adw_id / request.agent_name
    output_dir.mkdir(parents=True, exist_ok=True)

    # Construir ruta del archivo de salida
    output_file = output_dir / "raw_output.jsonl"

    # Crear solicitud de prompt con parámetros específicos
    prompt_request = AgentPromptRequest(
        prompt=prompt,
        adw_id=request.adw_id,
        agent_name=request.agent_name,
        model=request.model,
        dangerously_skip_permissions=True,
        output_file=str(output_file),
    )

    # Ejecutar y retornar respuesta
    return prompt_claude_code(prompt_request)
