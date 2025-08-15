"""
Konfigurationshantering för GastroPartner Test Suite
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
import structlog


class TestConfig:
    """Hantera testkonfiguration för olika miljöer"""

    def __init__(self, config_path: Path, environment: str):
        self.config_path = config_path
        self.environment = environment
        self.config_data: Dict[str, Any] = {}
        self.logger = structlog.get_logger()

    async def load(self) -> None:
        """Ladda konfiguration från fil"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config_data = json.load(f)
            
            # Validera att miljön existerar
            if self.environment not in self.config_data.get("environments", {}):
                raise ValueError(f"Miljö '{self.environment}' finns inte i konfigurationen")
                
            self.logger.info(
                "Konfiguration laddad",
                environment=self.environment,
                config_file=str(self.config_path)
            )
            
        except FileNotFoundError:
            raise FileNotFoundError(f"Konfigurationsfil kunde inte hittas: {self.config_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Ogiltig JSON i konfigurationsfil: {e}")

    def get_environment(self) -> Dict[str, Any]:
        """Hämta miljöspecifik konfiguration"""
        return self.config_data["environments"][self.environment]

    def get_test_accounts(self) -> Dict[str, Any]:
        """Hämta testkonton"""
        return self.config_data.get("test_accounts", {})

    def get_browser_settings(self) -> Dict[str, Any]:
        """Hämta browserinställningar"""
        return self.config_data.get("browser_settings", {})

    def get_timeouts(self) -> Dict[str, int]:
        """Hämta timeout-inställningar"""
        base_timeouts = self.config_data.get("test_timeouts", {})
        multiplier = self.get_environment().get("timeout_multiplier", 1.0)
        
        return {
            key: int(value * multiplier)
            for key, value in base_timeouts.items()
        }

    def get_data_limits(self) -> Dict[str, int]:
        """Hämta datagränser för testdata"""
        return self.config_data.get("test_data_limits", {})

    def get_notification_settings(self) -> Dict[str, Any]:
        """Hämta notifieringsinställningar"""
        return self.config_data.get("notification_settings", {})

    def get_setting(self, key: str, default: Any = None) -> Any:
        """Hämta specifik inställning med fallback till default"""
        # Först kolla miljöspecifika inställningar
        env_config = self.get_environment()
        if key in env_config:
            return env_config[key]
        
        # Sedan kolla globala inställningar
        return self.config_data.get(key, default)

    def is_development_mode(self) -> bool:
        """Kontrollera om vi kör i utvecklingsläge"""
        return self.get_environment().get("development_mode", False)

    def is_read_only_mode(self) -> bool:
        """Kontrollera om vi kör i read-only läge (production)"""
        return self.get_environment().get("read_only_mode", False)

    def should_cleanup_test_data(self) -> bool:
        """Kontrollera om testdata ska rensas efter körning"""
        return self.get_environment().get("test_data_cleanup", True)

    def get_screenshot_settings(self) -> Dict[str, Any]:
        """Hämta skärmdumpsinställningar"""
        env = self.get_environment()
        return {
            "on_failure": env.get("screenshot_on_failure", True),
            "on_success": env.get("screenshot_on_success", False),
            "full_page": env.get("full_page_screenshots", True),
            "quality": env.get("screenshot_quality", 90)
        }

    def get_video_settings(self) -> Dict[str, Any]:
        """Hämta videoinspelningsinställningar"""
        env = self.get_environment()
        return {
            "enabled": env.get("video_recording", False),
            "dir": "videos",
            "size": {"width": 1920, "height": 1080}
        }

    def get_test_data_config(self) -> Dict[str, Any]:
        """Hämta testdata-konfiguration"""
        try:
            test_data_path = Path("config/test_data.json")
            with open(test_data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            self.logger.warning("Testdata-fil kunde inte hittas", path=str(test_data_path))
            return {}
        except json.JSONDecodeError as e:
            self.logger.error("Fel vid läsning av testdata", error=str(e))
            return {}

    def get_api_base_url(self) -> str:
        """Hämta bas-URL för API"""
        return self.get_environment()["backend_url"]

    def get_frontend_base_url(self) -> str:
        """Hämta bas-URL för frontend"""
        return self.get_environment()["frontend_url"]

    def get_database_config(self) -> Optional[Dict[str, Any]]:
        """Hämta databaskonfiguration för direkta valideringar"""
        return self.config_data.get("database_config")

    def should_run_performance_tests(self) -> bool:
        """Kontrollera om prestandatester ska köras"""
        return self.get_setting("run_performance_tests", True)

    def should_run_visual_tests(self) -> bool:
        """Kontrollera om visuella tester ska köras"""
        return self.get_setting("run_visual_tests", True)

    def get_parallel_workers(self) -> int:
        """Hämta antal parallella arbetare"""
        return self.get_setting("parallel_workers", 1)

    def __str__(self) -> str:
        return f"TestConfig(environment={self.environment}, config_path={self.config_path})"

    def __repr__(self) -> str:
        return self.__str__()