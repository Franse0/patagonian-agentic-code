"""
Funciones de utilidad para ADW (Agent Development Workflow)
"""

import os
import logging
import random
import string
from datetime import datetime
from pathlib import Path


def make_adw_id() -> str:
    """
    Generar un ID único de ADW (Agent Development Workflow).
    Formato: 7 caracteres alfanuméricos aleatorios (ej., 'a3f9k2m')

    Returns:
        str: ID de ADW único
    """
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choices(chars, k=7))


def setup_logger(adw_id: str, agent_name: str) -> logging.Logger:
    """
    Configurar un logger para un agente ADW que escribe en:
    agents/{adw_id}/{agent_name}/execution.log

    Args:
        adw_id: El ID del flujo de trabajo ADW
        agent_name: Nombre del agente (ej., 'adw_plan_build', 'ops')

    Returns:
        logging.Logger: Instancia de logger configurada
    """
    # Determinar la raíz del proyecto (padre del directorio adws/)
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent

    # Crear directorio de logs
    log_dir = project_root / "agents" / adw_id / agent_name
    log_dir.mkdir(parents=True, exist_ok=True)

    # Crear ruta del archivo de log
    log_file = log_dir / "execution.log"

    # Crear logger
    logger_name = f"{adw_id}_{agent_name}"
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.INFO)

    # Eliminar handlers existentes para evitar duplicados
    logger.handlers.clear()

    # Handler de archivo
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.INFO)

    # Handler de consola
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)

    # Formato
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    # Agregar handlers
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger
