#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""
ADW Plan + Build + Review + Document Workflow

Orquesta las fases completas de SDLC para issues de GitHub.

Uso: uv run adw_plan_build_review_document.py <issue-number> [adw-id]

Flujo de trabajo:
1. Obtener issue desde GitHub
2. Clasificar tipo de issue (/feature, /bug, o /chore)
3. Generar nombre de rama
4. Crear y cambiar a la rama
5. Generar plan (basado en el tipo de issue)
6. Implementar plan
7. Revisar implementación contra especificación (con screenshots)
8. Generar documentación (usando screenshots de revisión)
9. Hacer commit de cambios (código + documentación)
10. Crear pull request con revisión y documentación

Ejemplo:
    uv run adws/adw_plan_build_review_document.py 123
    uv run adws/adw_plan_build_review_document.py 123 abc1234
"""

import sys
import os
import json
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Agregar directorio adws al path para imports
sys.path.insert(0, str(Path(__file__).parent))

from utils import make_adw_id, setup_logger
from agent import execute_template
from github import (
    get_issue_details,
    post_comment,
    commit_screenshots_to_repo,
    post_pr_comment_with_screenshots
)
from data_types import AgentTemplateRequest, WorkflowResult

load_dotenv()


def main():
    """Ejecución principal del flujo de trabajo."""
    if len(sys.argv) < 2:
        print("Usage: uv run adw_plan_build_review_document.py <issue-number> [adw-id]")
        print("\nExecutes complete SDLC workflow:")
        print("  1. Classify issue")
        print("  2. Generate branch name")
        print("  3. Create plan")
        print("  4. Implement plan")
        print("  5. Review implementation (with screenshots)")
        print("  6. Generate documentation")
        print("  7. Commit changes")
        print("  8. Create PR")
        sys.exit(1)

    issue_number = int(sys.argv[1])
    adw_id = sys.argv[2] if len(sys.argv) > 2 else make_adw_id()

    # Configurar logging
    logger = setup_logger(adw_id, "adw_plan_build_review_document")
    logger.info(f"Starting ADW Plan + Build + Review + Document workflow for issue #{issue_number}")
    logger.info(f"ADW ID: {adw_id}")

    try:
        # Paso 1: Obtener detalles del issue
        logger.info("Step 1: Fetching issue details from GitHub")
        issue = get_issue_details(issue_number)
        logger.info(f"Issue title: {issue['title']}")

        # Publicar comentario inicial
        post_comment(
            issue_number,
            f"🤖 **ADW Workflow Started** (ID: `{adw_id}`)\n\nStarting complete SDLC workflow (plan → build → review → document → PR)..."
        )

        # Paso 2: Clasificar issue
        logger.info("Step 2: Classifying issue type")
        classify_result = execute_template(AgentTemplateRequest(
            slash_command="/classify_issue",
            args=[str(issue_number)],
            adw_id=adw_id,
            agent_name="classifier",
            model="sonnet"
        ))

        if not classify_result.success:
            raise RuntimeError(f"Classification failed: {classify_result.output}")

        # Extraer solo el comando de la salida (buscar /feature, /bug, /chore, o 0)
        issue_type_raw = classify_result.output.strip()
        issue_type = None
        for line in issue_type_raw.split('\n'):
            line = line.strip()
            if line in ['/feature', '/bug', '/chore', '0']:
                issue_type = line
                break

        if not issue_type:
            # Fallback: buscar cualquier línea que empiece con /
            for line in issue_type_raw.split('\n'):
                line = line.strip()
                if line.startswith('/'):
                    issue_type = line
                    break

        if not issue_type:
            issue_type = issue_type_raw

        logger.info(f"Issue classified as: {issue_type}")

        if issue_type == "0":
            logger.warning("Issue could not be classified")
            post_comment(
                issue_number,
                f"⚠️ **Classification Failed** (ADW ID: `{adw_id}`)\n\nCould not automatically classify this issue. Please add more details or manually label it."
            )
            sys.exit(1)

        post_comment(
            issue_number,
            f"🔍 **Step 2: Issue Classified** (ADW ID: `{adw_id}`)\n\nIssue type: `{issue_type}`\n\nGenerating branch name..."
        )

        # Paso 3: Generar nombre de rama
        logger.info("Step 3: Generating branch name")
        branch_result = execute_template(AgentTemplateRequest(
            slash_command="/generate_branch_name",
            args=[str(issue_number), issue['title']],
            adw_id=adw_id,
            agent_name="branch_generator",
            model="haiku"
        ))

        if not branch_result.success:
            raise RuntimeError(f"Branch name generation failed: {branch_result.output}")

        # Extraer solo el nombre de rama (última línea no vacía, o línea con patrón de rama)
        branch_name_raw = branch_result.output.strip()
        branch_name = None
        for line in reversed(branch_name_raw.split('\n')):
            line = line.strip().strip('`')
            if line and '-' in line and not line.startswith('Based on'):
                branch_name = line
                break

        if not branch_name:
            branch_name = branch_name_raw.split('\n')[-1].strip().strip('`')

        logger.info(f"Branch name: {branch_name}")

        # Crear y cambiar a la nueva rama
        logger.info(f"Creating and switching to branch: {branch_name}")
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=str(Path(__file__).parent.parent),
            check=True,
            capture_output=True
        )
        logger.info(f"Switched to new branch: {branch_name}")

        post_comment(
            issue_number,
            f"🌿 **Step 3: Branch Created** (ADW ID: `{adw_id}`)\n\nBranch `{branch_name}` created and active.\n\nCreating implementation plan..."
        )

        # Paso 4: Crear plan
        logger.info(f"Step 4: Creating plan using {issue_type}")
        plan_result = execute_template(AgentTemplateRequest(
            slash_command=issue_type,
            args=[str(issue_number)],
            adw_id=adw_id,
            agent_name="planner",
            model="sonnet"
        ))

        if not plan_result.success:
            raise RuntimeError(f"Planning failed: {plan_result.output}")

        logger.info("Plan created successfully")

        # Extraer ruta del archivo de plan desde la salida
        plan_file = None
        for line in plan_result.output.split('\n'):
            if 'specs/' in line and '.md' in line:
                parts = line.split('specs/')
                if len(parts) > 1:
                    plan_file = f"specs/{parts[1].split()[0].rstrip('`').rstrip('.')}"
                    break

        if not plan_file:
            project_root = Path(__file__).parent.parent
            specs_dir = project_root / "specs"
            if specs_dir.exists():
                plan_files = list(specs_dir.glob(f"*{issue_number}*.md"))
                if plan_files:
                    plan_file = str(plan_files[0].relative_to(project_root))

        if plan_file:
            logger.info(f"Plan file: {plan_file}")
        else:
            logger.warning("Could not determine plan file path")
            plan_file = f"specs/{issue_type.strip('/')}-{issue_number}-plan.md"

        post_comment(
            issue_number,
            f"📋 **Step 4: Plan Created** (ADW ID: `{adw_id}`)\n\nImplementation plan: `{plan_file}`\n\nStarting implementation..."
        )

        # Paso 5: Implementar plan
        logger.info("Step 5: Implementing plan")
        implement_result = execute_template(AgentTemplateRequest(
            slash_command="/implement",
            args=[plan_file],
            adw_id=adw_id,
            agent_name="implementor",
            model="opus"
        ))

        if not implement_result.success:
            logger.error(f"Implementation failed: {implement_result.output}")
            post_comment(
                issue_number,
                f"❌ **Implementation Failed** (ADW ID: `{adw_id}`)\n\nImplementation encountered errors. Check logs for details."
            )
            sys.exit(1)

        logger.info("Implementation completed successfully")

        post_comment(
            issue_number,
            f"⚙️ **Step 5: Implementation Complete** (ADW ID: `{adw_id}`)\n\nCode implemented successfully. Starting review against spec..."
        )

        # Paso 6: Revisar implementación
        logger.info("Step 6: Reviewing implementation against spec")
        review_result = execute_template(AgentTemplateRequest(
            slash_command="/review",
            args=[adw_id, plan_file],
            adw_id=adw_id,
            agent_name="reviewer",
            model="sonnet"
        ))

        review_success = review_result.success
        review_data = None

        if review_success:
            try:
                # Intentar parsear salida JSON
                review_data = json.loads(review_result.output)
                logger.info(f"Review completed: {'SUCCESS' if review_data.get('success') else 'FAILED'}")
                logger.info(f"Review summary: {review_data.get('review_summary', 'N/A')}")

                # Registrar issues si los hay
                if review_data.get('review_issues'):
                    logger.info(f"Review found {len(review_data['review_issues'])} issues")
                    for issue_item in review_data['review_issues']:
                        logger.info(f"  - [{issue_item['issue_severity']}] {issue_item['issue_description']}")

                # Registrar screenshots
                if review_data.get('screenshots'):
                    logger.info(f"Review captured {len(review_data['screenshots'])} screenshots")
            except json.JSONDecodeError:
                logger.warning("Could not parse review output as JSON")
                review_data = None

        if review_data:
            review_comment_parts = [
                f"🔎 **Step 6: Review Complete** (ADW ID: `{adw_id}`)",
                "",
                review_data.get('review_summary', 'Review completed'),
                ""
            ]
            if review_data.get('review_issues'):
                review_comment_parts.append("**Issues Found:**")
                for issue_item in review_data['review_issues']:
                    severity_emoji = {
                        'blocker': '🔴',
                        'tech_debt': '🟡',
                        'skippable': '🟢'
                    }.get(issue_item['issue_severity'], '⚪')
                    review_comment_parts.append(
                        f"{severity_emoji} **{issue_item['issue_severity'].upper()}**: {issue_item['issue_description']}"
                    )
            else:
                review_comment_parts.append("✅ No issues found.")
            post_comment(issue_number, "\n".join(review_comment_parts))
        else:
            post_comment(
                issue_number,
                f"🔎 **Step 6: Review Complete** (ADW ID: `{adw_id}`)\n\nReview finished. Generating documentation..."
            )

        # Paso 7: Generar documentación
        logger.info("Step 7: Generating documentation")

        # Determinar directorio de screenshots de revisión
        # Intentar ambas ubicaciones posibles (reviewer o review_agent)
        project_root = Path(__file__).parent.parent
        screenshots_dir = project_root / "agents" / adw_id / "reviewer" / "review_img"
        if not screenshots_dir.exists():
            screenshots_dir = project_root / "agents" / adw_id / "review_agent" / "review_img"

        # Crear directorio app_docs si no existe
        app_docs_dir = project_root / "app_docs"
        app_docs_dir.mkdir(exist_ok=True)

        # Ejecutar comando de documentación
        doc_args = [adw_id, plan_file]
        if screenshots_dir.exists():
            doc_args.append(str(screenshots_dir))
            logger.info(f"Using screenshots from: {screenshots_dir}")

        document_result = execute_template(AgentTemplateRequest(
            slash_command="/document",
            args=doc_args,
            adw_id=adw_id,
            agent_name="documenter",
            model="sonnet"
        ))

        doc_file = None
        if document_result.success:
            # El comando /document retorna la ruta del archivo creado
            doc_file = document_result.output.strip()
            logger.info(f"Documentation created: {doc_file}")
            post_comment(
                issue_number,
                f"📄 **Step 7: Documentation Generated** (ADW ID: `{adw_id}`)\n\nDocumentation created: `{doc_file}`\n\nCommitting all changes..."
            )
        else:
            logger.warning(f"Documentation generation had issues: {document_result.output}")
            post_comment(
                issue_number,
                f"⚠️ **Step 7: Documentation Warning** (ADW ID: `{adw_id}`)\n\nDocumentation generation had issues but workflow will continue."
            )

        # Paso 8: Hacer commit de cambios (código + documentación)
        logger.info("Step 8: Committing changes")
        commit_result = execute_template(AgentTemplateRequest(
            slash_command="/commit",
            args=[],
            adw_id=adw_id,
            agent_name="committer",
            model="haiku"
        ))

        if not commit_result.success:
            logger.error(f"Commit failed: {commit_result.output}")
            post_comment(
                issue_number,
                f"⚠️ **Commit Issues** (ADW ID: `{adw_id}`)\n\nChanges implemented but commit had issues. Manual intervention may be needed."
            )
        else:
            post_comment(
                issue_number,
                f"💾 **Step 8: Changes Committed** (ADW ID: `{adw_id}`)\n\nAll changes committed and pushing to remote..."
            )

        logger.info("Changes committed")

        # Push de la rama al remote
        logger.info(f"Pushing branch {branch_name} to remote")
        subprocess.run(
            ["git", "push", "-u", "origin", branch_name],
            cwd=str(Path(__file__).parent.parent),
            check=True,
            capture_output=True
        )
        logger.info(f"Branch {branch_name} pushed to remote")

        # Paso 8.5: Commit screenshots to repository
        logger.info("Step 8.5: Committing review screenshots to repository")
        screenshot_paths = None
        if screenshots_dir.exists():
            try:
                screenshot_paths = commit_screenshots_to_repo(
                    adw_id=adw_id,
                    screenshots_source_dir=screenshots_dir,
                    branch_name=branch_name
                )
                if screenshot_paths:
                    logger.info(f"Committed {len(screenshot_paths)} screenshots to repository")
                    # Push screenshots commit
                    subprocess.run(
                        ["git", "push"],
                        cwd=str(Path(__file__).parent.parent),
                        check=True,
                        capture_output=True
                    )
                    logger.info("Screenshots pushed to remote")
                else:
                    logger.info("No screenshots to commit")
            except Exception as e:
                logger.warning(f"Failed to commit screenshots: {e}")
                screenshot_paths = None
        else:
            logger.info("No screenshots directory found, skipping screenshot commit")

        # Paso 9: Crear pull request
        logger.info("Step 9: Creating pull request")
        pr_result = execute_template(AgentTemplateRequest(
            slash_command="/pull_request",
            args=[],
            adw_id=adw_id,
            agent_name="pr_creator",
            model="sonnet"
        ))

        if not pr_result.success:
            logger.error(f"PR creation failed: {pr_result.output}")
            post_comment(
                issue_number,
                f"⚠️ **PR Creation Failed** (ADW ID: `{adw_id}`)\n\nChanges committed but PR creation failed. You may need to create it manually."
            )

        # Paso 9.5: Post PR comment with screenshots
        if pr_result.success and screenshot_paths:
            logger.info("Step 9.5: Posting PR comment with screenshots")
            try:
                import time
                from github import get_pr_for_branch
                # Esperar 3 segundos para que GitHub indexe el PR
                time.sleep(3)
                pr_info = get_pr_for_branch(branch_name)

                if pr_info:
                    post_pr_comment_with_screenshots(
                        pr_number=pr_info['number'],
                        screenshot_paths=screenshot_paths,
                        branch_name=branch_name,
                        review_data=review_data
                    )
                    logger.info(f"Posted screenshot comment on PR #{pr_info['number']}")
                else:
                    logger.warning("Could not find PR to post screenshot comment")
            except Exception as e:
                logger.warning(f"Failed to post PR screenshot comment: {e}")

        # Construir comentario final con resultados completos
        comment_parts = [
            f"✅ **Workflow Complete** (ADW ID: `{adw_id}`)",
            "",
            f"- Issue classified as: `{issue_type}`",
            f"- Branch created: `{branch_name}`",
            f"- Plan: `{plan_file}`",
            f"- Changes implemented and committed",
            ""
        ]

        # Agregar resultados de revisión
        if review_data:
            comment_parts.append("## 📋 Review Results")
            comment_parts.append("")
            comment_parts.append(review_data.get('review_summary', 'Review completed'))
            comment_parts.append("")

            if review_data.get('review_issues'):
                comment_parts.append("### Issues Found")
                for issue_item in review_data['review_issues']:
                    severity_emoji = {
                        'blocker': '🔴',
                        'tech_debt': '🟡',
                        'skippable': '🟢'
                    }.get(issue_item['issue_severity'], '⚪')
                    comment_parts.append(
                        f"{severity_emoji} **{issue_item['issue_severity'].upper()}**: {issue_item['issue_description']}"
                    )
                comment_parts.append("")

            if review_data.get('screenshots') or screenshot_paths:
                comment_parts.append(f"### 📸 Screenshots")
                if screenshot_paths:
                    comment_parts.append(f"{len(screenshot_paths)} screenshots uploaded to PR")
                else:
                    comment_parts.append(f"{len(review_data.get('screenshots', []))} screenshots captured during review")
                comment_parts.append("")

        # Agregar información de documentación
        if doc_file:
            comment_parts.append("## 📄 Documentation")
            comment_parts.append("")
            comment_parts.append(f"- Documentation generated: `{doc_file}`")
            comment_parts.append("")

        comment_parts.append("- Pull request created")
        comment_parts.append("")
        comment_parts.append("Please review the PR and merge when ready!")

        final_comment = "\n".join(comment_parts)
        post_comment(issue_number, final_comment)

        logger.info("Workflow completed successfully!")

    except Exception as e:
        logger.error(f"Workflow failed with error: {e}", exc_info=True)
        post_comment(
            issue_number,
            f"❌ **Workflow Failed** (ADW ID: `{adw_id}`)\n\n"
            f"Error: {str(e)}\n\n"
            f"Check logs at `agents/{adw_id}/adw_plan_build_review_document/execution.log` for details."
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
