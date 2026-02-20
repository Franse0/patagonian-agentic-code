"""Tipos de datos para ADW (Agent Development Workflow)"""

from typing import Optional, List
from pydantic import BaseModel


class AgentPromptRequest(BaseModel):
    """Solicitud para ejecutar un prompt de Claude Code."""

    prompt: str
    adw_id: str
    agent_name: str = "ops"
    model: str = "sonnet"
    dangerously_skip_permissions: bool = True
    output_file: str


class AgentPromptResponse(BaseModel):
    """Respuesta de la ejecución de un prompt de Claude Code."""

    output: str
    success: bool
    session_id: Optional[str] = None


class AgentTemplateRequest(BaseModel):
    """Solicitud para ejecutar una plantilla de Claude Code (comando slash)."""

    slash_command: str
    args: List[str]
    adw_id: str
    agent_name: str = "ops"
    model: str = "sonnet"


class ClaudeCodeResultMessage(BaseModel):
    """Mensaje de resultado de la ejecución de Claude Code."""

    type: str  # "result"
    result: str
    is_error: bool = False
    session_id: Optional[str] = None


class GitHubIssue(BaseModel):
    """Datos de un issue de GitHub."""

    number: int
    title: str
    body: Optional[str] = None
    state: str
    user: dict
    created_at: str
    updated_at: str
    labels: List[dict] = []
    html_url: str


class WorkflowResult(BaseModel):
    """Resultado de la ejecución de un flujo de trabajo."""

    success: bool
    adw_id: str
    issue_number: int
    message: str
    details: Optional[dict] = None
