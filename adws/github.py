#!/usr/bin/env python3
# /// script
# dependencies = ["requests", "python-dotenv"]
# ///

"""Operaciones de API de GitHub para flujos de trabajo ADW."""

import os
import sys
import shutil
import subprocess
from typing import Optional, Dict, Any, List
from pathlib import Path
from dotenv import load_dotenv
import requests

load_dotenv()

# Obtener configuración de GitHub
GITHUB_REPO_OWNER = os.getenv("GITHUB_REPO_OWNER", "")
GITHUB_REPO_NAME = os.getenv("GITHUB_REPO_NAME", "")
GITHUB_PAT = os.getenv("GITHUB_PAT", "")

# API base URL
GITHUB_API_BASE = "https://api.github.com"


def get_repo_info() -> tuple[str, str]:
    """
    Obtener propietario y nombre de repositorio desde variables de entorno.

    Returns:
        tuple: (owner, repo_name)

    Raises:
        ValueError: Si las variables no están configuradas
    """
    if not GITHUB_REPO_OWNER:
        raise ValueError("GITHUB_REPO_OWNER not configured in .env")
    if not GITHUB_REPO_NAME:
        raise ValueError("GITHUB_REPO_NAME not configured in .env")

    return GITHUB_REPO_OWNER, GITHUB_REPO_NAME


def get_headers() -> Dict[str, str]:
    """
    Obtener headers para requests de GitHub API.

    Returns:
        dict: Headers con autenticación si PAT está disponible
    """
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    if GITHUB_PAT:
        headers["Authorization"] = f"Bearer {GITHUB_PAT}"

    return headers


def make_github_request(method: str, endpoint: str, **kwargs) -> requests.Response:
    """
    Hacer request a la API de GitHub.

    Args:
        method: Método HTTP (GET, POST, PATCH, etc.)
        endpoint: Endpoint de la API (sin el base URL)
        **kwargs: Argumentos adicionales para requests

    Returns:
        requests.Response: Respuesta de la API

    Raises:
        RuntimeError: Si el request falla
    """
    url = f"{GITHUB_API_BASE}{endpoint}"
    headers = get_headers()

    # Merge headers si se pasaron en kwargs
    if 'headers' in kwargs:
        headers.update(kwargs['headers'])
        del kwargs['headers']

    response = requests.request(method, url, headers=headers, **kwargs)

    if not response.ok:
        error_msg = f"GitHub API request failed: {response.status_code}"
        try:
            error_data = response.json()
            if 'message' in error_data:
                error_msg += f" - {error_data['message']}"
        except:
            error_msg += f" - {response.text}"
        raise RuntimeError(error_msg)

    return response


def get_issue_details(issue_number: int) -> Dict[str, Any]:
    """
    Obtener detalles del issue desde GitHub.

    Args:
        issue_number: Número de issue a obtener

    Returns:
        dict: Datos del issue incluyendo título, cuerpo, etiquetas, etc.

    Raises:
        RuntimeError: Si la obtención falla
    """
    owner, repo = get_repo_info()

    endpoint = f"/repos/{owner}/{repo}/issues/{issue_number}"
    response = make_github_request("GET", endpoint)

    issue_data = response.json()

    # Transformar al formato esperado
    return {
        "number": issue_data["number"],
        "title": issue_data["title"],
        "body": issue_data.get("body", ""),
        "state": issue_data["state"],
        "author": {"login": issue_data["user"]["login"]},
        "createdAt": issue_data["created_at"],
        "updatedAt": issue_data["updated_at"],
        "labels": [{"name": label["name"]} for label in issue_data.get("labels", [])],
        "url": issue_data["html_url"]
    }


def post_comment(issue_number: int, comment: str) -> None:
    """
    Publicar un comentario en un issue de GitHub.

    Args:
        issue_number: Número de issue en el que comentar
        comment: Texto del comentario a publicar

    Raises:
        RuntimeError: Si la publicación falla
    """
    owner, repo = get_repo_info()

    endpoint = f"/repos/{owner}/{repo}/issues/{issue_number}/comments"
    make_github_request("POST", endpoint, json={"body": comment})

    print(f"Posted comment on issue #{issue_number}")


def create_pull_request(branch: str, title: str, body: str, base: str = "main") -> Dict[str, Any]:
    """
    Crear un pull request.

    Args:
        branch: Nombre de rama (rama origen)
        title: Título del PR
        body: Descripción del PR
        base: Rama destino (por defecto: main)

    Returns:
        dict: Datos del PR incluyendo número, url, etc.

    Raises:
        RuntimeError: Si la creación del PR falla
    """
    owner, repo = get_repo_info()

    endpoint = f"/repos/{owner}/{repo}/pulls"

    data = {
        "title": title,
        "body": body,
        "head": branch,
        "base": base
    }

    response = make_github_request("POST", endpoint, json=data)
    pr_data = response.json()

    result = {
        "number": pr_data["number"],
        "url": pr_data["html_url"],
        "title": pr_data["title"]
    }

    print(f"Created PR #{result['number']}: {result['url']}")

    return result


def get_pr_for_branch(branch: str) -> Optional[Dict[str, Any]]:
    """
    Encontrar PR para una rama dada.

    Args:
        branch: Nombre de rama a buscar

    Returns:
        dict: Datos del PR si se encuentra, None en caso contrario
    """
    owner, repo = get_repo_info()

    endpoint = f"/repos/{owner}/{repo}/pulls"

    try:
        response = make_github_request("GET", endpoint, params={
            "head": f"{owner}:{branch}",
            "state": "open",
            "per_page": 1
        })

        prs = response.json()

        if not prs:
            return None

        pr = prs[0]
        return {
            "number": pr["number"],
            "url": pr["html_url"],
            "title": pr["title"],
            "state": pr["state"]
        }

    except RuntimeError:
        return None


def update_pull_request(pr_number: int, title: Optional[str] = None, body: Optional[str] = None) -> None:
    """
    Actualizar un pull request existente.

    Args:
        pr_number: Número de PR a actualizar
        title: Nuevo título (opcional)
        body: Nuevo cuerpo (opcional)

    Raises:
        RuntimeError: Si la actualización falla
    """
    owner, repo = get_repo_info()

    endpoint = f"/repos/{owner}/{repo}/pulls/{pr_number}"

    data = {}
    if title:
        data["title"] = title
    if body:
        data["body"] = body

    if not data:
        return

    make_github_request("PATCH", endpoint, json=data)

    print(f"Updated PR #{pr_number}")


def close_issue(issue_number: int, comment: Optional[str] = None) -> None:
    """
    Cerrar un issue de GitHub.

    Args:
        issue_number: Número de issue a cerrar
        comment: Comentario opcional a publicar antes de cerrar

    Raises:
        RuntimeError: Si el cierre falla
    """
    if comment:
        post_comment(issue_number, comment)

    owner, repo = get_repo_info()

    endpoint = f"/repos/{owner}/{repo}/issues/{issue_number}"
    make_github_request("PATCH", endpoint, json={"state": "closed"})

    print(f"Closed issue #{issue_number}")


def add_label(issue_number: int, label: str) -> None:
    """
    Agregar una etiqueta a un issue.

    Args:
        issue_number: Número de issue
        label: Etiqueta a agregar

    Raises:
        RuntimeError: Si agregar la etiqueta falla
    """
    owner, repo = get_repo_info()

    endpoint = f"/repos/{owner}/{repo}/issues/{issue_number}/labels"
    make_github_request("POST", endpoint, json={"labels": [label]})

    print(f"Added label '{label}' to issue #{issue_number}")


def commit_screenshots_to_repo(
    adw_id: str,
    screenshots_source_dir: Path,
    branch_name: str
) -> Optional[List[str]]:
    """
    Copiar screenshots del directorio de agentes al repositorio y hacer commit.

    Args:
        adw_id: ID del workflow ADW
        screenshots_source_dir: Directorio fuente con screenshots (agents/{adw_id}/reviewer/review_img/)
        branch_name: Nombre de la rama actual

    Returns:
        Lista de rutas relativas de screenshots comprometidos, o None si no hay screenshots
    """
    # Verificar si el directorio fuente existe y tiene archivos PNG
    if not screenshots_source_dir.exists():
        print(f"No screenshots directory found at {screenshots_source_dir}")
        return None

    screenshot_files = list(screenshots_source_dir.glob("*.png"))
    if not screenshot_files:
        print(f"No PNG screenshots found in {screenshots_source_dir}")
        return None

    # Crear directorio de destino en .github/adw-screenshots/{adw_id}/
    project_root = screenshots_source_dir.parent.parent.parent.parent  # agents/{adw_id}/reviewer/review_img -> project root
    dest_dir = project_root / ".github" / "adw-screenshots" / adw_id
    dest_dir.mkdir(parents=True, exist_ok=True)

    print(f"Copying {len(screenshot_files)} screenshots to {dest_dir}")

    # Copiar cada screenshot
    screenshot_paths = []
    for screenshot_file in screenshot_files:
        dest_file = dest_dir / screenshot_file.name
        shutil.copy2(screenshot_file, dest_file)
        relative_path = str(dest_file.relative_to(project_root)).replace("\\", "/")
        screenshot_paths.append(relative_path)

    # Hacer commit de los screenshots
    try:
        subprocess.run(
            ["git", "add", str(dest_dir)],
            cwd=str(project_root),
            check=True,
            capture_output=True,
            encoding='utf-8'
        )

        commit_message = f"chore: add review screenshots for {branch_name}\n\n{len(screenshot_paths)} screenshots from ADW review phase.\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

        subprocess.run(
            ["git", "commit", "-m", commit_message],
            cwd=str(project_root),
            check=True,
            capture_output=True,
            encoding='utf-8'
        )

        print(f"Committed {len(screenshot_paths)} screenshots to repository")
        return screenshot_paths

    except subprocess.CalledProcessError as e:
        error_output = e.stderr if e.stderr else str(e)
        print(f"Failed to commit screenshots: {error_output}")
        return None


def post_pr_comment_with_screenshots(
    pr_number: int,
    screenshot_paths: List[str],
    branch_name: str,
    review_data: Optional[Dict[str, Any]] = None
) -> None:
    """
    Publicar comentario en PR con screenshots embebidos.

    Args:
        pr_number: Número de PR
        screenshot_paths: Lista de rutas relativas de screenshots en el repo
        branch_name: Nombre de la rama
        review_data: Datos de revisión opcionales (para incluir summary e issues)
    """
    owner, repo = get_repo_info()

    # Construir comentario markdown
    comment_parts = ["## Review Screenshots"]
    comment_parts.append("")

    # Agregar resumen de revisión si está disponible
    if review_data:
        if review_data.get('review_summary'):
            comment_parts.append("### Summary")
            comment_parts.append(review_data['review_summary'])
            comment_parts.append("")

        # Agregar issues encontrados
        if review_data.get('review_issues'):
            comment_parts.append("### Issues Found")
            comment_parts.append("")
            for issue_item in review_data['review_issues']:
                severity_emoji = {
                    'blocker': '🔴',
                    'tech_debt': '🟡',
                    'skippable': '🟢'
                }.get(issue_item.get('issue_severity', ''), '⚪')
                severity = issue_item.get('issue_severity', 'unknown').upper()
                description = issue_item.get('issue_description', 'No description')
                comment_parts.append(f"{severity_emoji} **{severity}**: {description}")
            comment_parts.append("")

    # Agregar screenshots con URLs de raw.githubusercontent.com
    comment_parts.append("### Screenshots")
    comment_parts.append("")

    for screenshot_path in screenshot_paths:
        # Extraer caption desde el nombre del archivo (ej: "01_desktop_nav.png" -> "Desktop Nav")
        filename = Path(screenshot_path).stem  # Sin extensión
        # Remover prefijo numérico si existe (01_, 02_, etc.)
        caption = filename
        if len(filename) > 2 and filename[:2].isdigit() and filename[2] == '_':
            caption = filename[3:]  # Remover "01_"

        # Convertir underscores a espacios y capitalizar
        caption = caption.replace('_', ' ').title()

        # Construir URL raw de GitHub
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch_name}/{screenshot_path}"

        # Agregar imagen con caption
        comment_parts.append(f"**{caption}**")
        comment_parts.append(f"![{caption}]({raw_url})")
        comment_parts.append("")

    comment_body = "\n".join(comment_parts)

    # Publicar comentario
    post_comment(pr_number, comment_body)
    print(f"Posted screenshot comment on PR #{pr_number}")


if __name__ == "__main__":
    # Probar la integración con GitHub
    print("Testing GitHub integration...")

    try:
        owner, repo = get_repo_info()
        print(f"[OK] Repository: {owner}/{repo}")

        # Verificar que PAT esté configurado
        if not GITHUB_PAT:
            print("[WARN] GITHUB_PAT not configured, API requests may be rate-limited")
        else:
            print("[OK] GitHub PAT is configured")

        # Probar autenticación
        response = make_github_request("GET", "/user")
        user_data = response.json()
        print(f"[OK] Authenticated as: {user_data['login']}")

        # Probar acceso al repositorio
        response = make_github_request("GET", f"/repos/{owner}/{repo}")
        print("[OK] Repository access confirmed")

        print("\nAll tests passed!")

    except Exception as e:
        print(f"[ERROR] {e}")
        sys.exit(1)
