from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


APP_DIR_NAME = "LuigisWorld"
CONFIG_FILE_NAME = "config.json"
CONFIG_KEYS = {"app_name", "data_dir", "database_path", "reports_dir", "projects_dir"}
PATH_CONFIG_KEYS = {"data_dir", "database_path", "reports_dir", "projects_dir"}


@dataclass(frozen=True)
class WorldConfig:
    app_name: str
    data_dir: str
    database_path: str
    reports_dir: str
    projects_dir: str


def get_app_data_dir() -> Path:
    base_dir = os.environ.get("LW_HOME")

    if base_dir:
        return Path(base_dir).expanduser().resolve()

    local_app_data = os.environ.get("LOCALAPPDATA")

    if local_app_data:
        return Path(local_app_data) / APP_DIR_NAME

    return Path.home() / f".{APP_DIR_NAME.lower()}"


def get_config_path() -> Path:
    return get_app_data_dir() / CONFIG_FILE_NAME


def default_config() -> WorldConfig:
    data_dir = get_app_data_dir()

    return WorldConfig(
        app_name="Luigi's World",
        data_dir=str(data_dir),
        database_path=str(data_dir / "lw.db"),
        reports_dir=str(data_dir / "reports"),
        projects_dir=str(data_dir / "projects"),
    )


def ensure_app_dirs(config: WorldConfig | None = None) -> None:
    current_config = config or default_config()

    Path(current_config.data_dir).mkdir(parents=True, exist_ok=True)
    Path(current_config.reports_dir).mkdir(parents=True, exist_ok=True)
    Path(current_config.projects_dir).mkdir(parents=True, exist_ok=True)


def load_config() -> WorldConfig:
    config_path = get_config_path()
    fallback = default_config()

    ensure_app_dirs(fallback)

    if not config_path.exists():
        save_config(fallback)
        return fallback

    with config_path.open("r", encoding="utf-8") as file:
        raw_config: dict[str, Any] = json.load(file)

    merged = asdict(fallback) | raw_config
    return WorldConfig(**merged)


def save_config(config: WorldConfig) -> None:
    ensure_app_dirs(config)

    with get_config_path().open("w", encoding="utf-8") as file:
        json.dump(asdict(config), file, indent=2)
        file.write("\n")


def set_config_value(key: str, value: str) -> WorldConfig:
    if key not in CONFIG_KEYS:
        allowed = ", ".join(sorted(CONFIG_KEYS))
        raise ValueError(f"Unknown config key: {key}. Allowed keys: {allowed}")

    config = load_config()
    values = asdict(config)

    if key in PATH_CONFIG_KEYS:
        values[key] = str(Path(value).expanduser().resolve())
    else:
        values[key] = value

    updated = WorldConfig(**values)
    save_config(updated)
    return updated
