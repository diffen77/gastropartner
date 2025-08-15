#!/usr/bin/env python3
"""
Human-Readable Logger för GastroPartner Test Suite
Gör testloggning mer visuell, mänsklig och användarvänlig
"""

import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional, Union, List
from enum import Enum


class LogLevel(Enum):
    """Log nivåer med visuella indikatorer"""
    DEBUG = ("🔍", "DEBUG", 37)      # Grå
    INFO = ("ℹ️", "INFO", 36)        # Cyan  
    SUCCESS = ("✅", "FRAMGÅNG", 32) # Grön
    WARNING = ("⚠️", "VARNING", 33)  # Gul
    ERROR = ("❌", "FEL", 31)        # Röd
    CRITICAL = ("🚨", "KRITISKT", 91) # Ljusröd


class TestPhase(Enum):
    """Testfaser med visuella indikatorer"""
    SETUP = ("🔧", "Förbereder")
    LOGIN = ("🔐", "Loggar in")
    TESTING = ("🧪", "Testar")
    VALIDATION = ("✔️", "Validerar")
    CLEANUP = ("🧹", "Städar upp")
    FINISHED = ("🎯", "Slutförd")


class HumanLogger:
    """Mänsklig och visuell logger för testresultat"""
    
    def __init__(self, show_timestamps: bool = True, show_colors: bool = True):
        self.show_timestamps = show_timestamps
        self.show_colors = show_colors
        self.current_test = None
        self.test_start_time = None
        self.phase_start_time = None
        self.current_phase = None
        
        # Statistik
        self.stats = {
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'warnings': 0,
            'start_time': None
        }
    
    def _colorize(self, text: str, color_code: int) -> str:
        """Lägg till färg till text om färger är aktiverade"""
        if not self.show_colors:
            return text
        return f"\033[{color_code}m{text}\033[0m"
    
    def _format_timestamp(self) -> str:
        """Formatera timestamp"""
        if not self.show_timestamps:
            return ""
        return f"[{datetime.now().strftime('%H:%M:%S')}] "
    
    def _format_duration(self, start_time: datetime) -> str:
        """Beräkna och formatera varaktighet"""
        if not start_time:
            return ""
        duration = datetime.now() - start_time
        seconds = duration.total_seconds()
        
        if seconds < 60:
            return f"({seconds:.1f}s)"
        elif seconds < 3600:
            return f"({seconds/60:.1f}m)"
        else:
            return f"({seconds/3600:.1f}h)"
    
    def _log(self, level: LogLevel, message: str, **kwargs):
        """Intern loggning med formatering"""
        emoji, level_name, color_code = level.value
        timestamp = self._format_timestamp()
        
        # Formatera huvudmeddelandet
        formatted_level = self._colorize(level_name, color_code)
        main_msg = f"{timestamp}{emoji} {formatted_level}: {message}"
        
        # Lägg till extra information om den finns
        extras = []
        for key, value in kwargs.items():
            if key == 'duration' and isinstance(value, (int, float)):
                extras.append(f"⏱️ {value:.1f}s")
            elif key == 'test_name':
                extras.append(f"📝 {value}")
            elif key == 'url':
                extras.append(f"🌐 {value}")
            elif key == 'expected':
                extras.append(f"Förväntat: {value}")
            elif key == 'actual':
                extras.append(f"Faktiskt: {value}")
            elif key == 'count':
                extras.append(f"Antal: {value}")
            else:
                extras.append(f"{key}: {value}")
        
        if extras:
            main_msg += f" ({', '.join(extras)})"
        
        print(main_msg)
        sys.stdout.flush()
    
    # === GRUNDLÄGGANDE LOGGNINGSMETODER ===
    
    def debug(self, message: str, **kwargs):
        """Debug-meddelande"""
        self._log(LogLevel.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Informationsmeddelande"""
        self._log(LogLevel.INFO, message, **kwargs)
    
    def success(self, message: str, **kwargs):
        """Framgångsmeddelande"""
        self._log(LogLevel.SUCCESS, message, **kwargs)
        
    def warning(self, message: str, **kwargs):
        """Varningsmeddelande"""
        self._log(LogLevel.WARNING, message, **kwargs)
        self.stats['warnings'] += 1
        
    def error(self, message: str, **kwargs):
        """Felmeddelande"""
        self._log(LogLevel.ERROR, message, **kwargs)
        
    def critical(self, message: str, **kwargs):
        """Kritiskt fel"""
        self._log(LogLevel.CRITICAL, message, **kwargs)
    
    # === TESTSPECIFIKA METODER ===
    
    def start_test_suite(self, suite_name: str, environment: str, browser: str):
        """Starta testsuite"""
        self.stats['start_time'] = datetime.now()
        
        print("=" * 80)
        print(f"🚀 STARTAR GASTROPARTNER TESTSUITE")
        print(f"📊 Testsvit: {self._colorize(suite_name, 36)}")
        print(f"🌍 Miljö: {self._colorize(environment, 33)}")
        print(f"🌐 Browser: {self._colorize(browser, 35)}")
        print(f"⏰ Startade: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        sys.stdout.flush()
    
    def finish_test_suite(self, success: bool, duration: Optional[float] = None):
        """Avsluta testsuite"""
        duration_str = ""
        if duration:
            duration_str = f" på {duration:.1f} sekunder"
        elif self.stats['start_time']:
            duration_str = f" {self._format_duration(self.stats['start_time'])}"
            
        print("\n" + "=" * 80)
        if success:
            print(f"🎉 TESTSUITE SLUTFÖRD FRAMGÅNGSRIKT{duration_str}")
            status_color = 32  # Grön
        else:
            print(f"💥 TESTSUITE MISSLYCKADES{duration_str}")
            status_color = 31  # Röd
        
        # Visa statistik
        total_tests = self.stats['tests_passed'] + self.stats['tests_failed']
        if total_tests > 0:
            success_rate = (self.stats['tests_passed'] / total_tests) * 100
            print(f"📈 Resultat:")
            print(f"   ✅ Lyckade: {self._colorize(str(self.stats['tests_passed']), 32)}")
            print(f"   ❌ Misslyckade: {self._colorize(str(self.stats['tests_failed']), 31)}")
            print(f"   ⚠️  Varningar: {self.stats['warnings']}")
            print(f"   📊 Framgång: {self._colorize(f'{success_rate:.1f}%', status_color)}")
        
        print("=" * 80)
        sys.stdout.flush()
    
    def start_test_module(self, module_name: str):
        """Starta testmodul"""
        self.current_test = module_name
        self.test_start_time = datetime.now()
        
        print(f"\n📦 STARTAR MODUL: {self._colorize(module_name.upper(), 36)}")
        print("─" * 60)
        sys.stdout.flush()
    
    def finish_test_module(self, module_name: str, success: bool, details: Dict[str, Any]):
        """Avsluta testmodul"""
        duration_str = ""
        if self.test_start_time:
            duration_str = f" {self._format_duration(self.test_start_time)}"
        
        status_emoji = "✅" if success else "❌"
        status_text = "FRAMGÅNG" if success else "MISSLYCKADES"
        color = 32 if success else 31
        
        print(f"\n{status_emoji} MODUL {self._colorize(module_name.upper(), color)}: {status_text}{duration_str}")
        
        # Visa detaljer
        if details.get('passed_tests', 0) > 0 or details.get('failed_tests', 0) > 0:
            passed = details.get('passed_tests', 0)
            failed = details.get('failed_tests', 0)
            print(f"   └── ✅ {passed} lyckade, ❌ {failed} misslyckade")
        
        # Uppdatera statistik
        self.stats['tests_run'] += 1
        if success:
            self.stats['tests_passed'] += 1
        else:
            self.stats['tests_failed'] += 1
        
        print("─" * 60)
        sys.stdout.flush()
    
    def start_phase(self, phase: TestPhase, description: str = ""):
        """Starta en ny testfas"""
        self.current_phase = phase
        self.phase_start_time = datetime.now()
        
        emoji, phase_name = phase.value
        full_description = f"{phase_name}"
        if description:
            full_description += f": {description}"
            
        print(f"  {emoji} {full_description}...")
        sys.stdout.flush()
    
    def finish_phase(self, success: bool = True, message: str = ""):
        """Avsluta aktuell fas"""
        if not self.current_phase:
            return
            
        duration_str = ""
        if self.phase_start_time:
            duration_str = f" {self._format_duration(self.phase_start_time)}"
        
        status = "✅" if success else "❌"
        final_msg = message if message else ("klar" if success else "misslyckades")
        
        print(f"    └── {status} {final_msg}{duration_str}")
        
        self.current_phase = None
        self.phase_start_time = None
        sys.stdout.flush()
    
    def test_step(self, step_name: str, success: bool = True, details: str = ""):
        """Logga ett teststeg"""
        status = "✅" if success else "❌"
        msg = f"    • {status} {step_name}"
        if details:
            msg += f": {details}"
        
        print(msg)
        sys.stdout.flush()
    
    def authentication_status(self, success: bool, username: str = "", error: str = ""):
        """Specifik loggning för autentisering"""
        if success:
            user_info = f" som {username}" if username else ""
            self.success(f"Inloggning lyckades{user_info}")
        else:
            error_info = f": {error}" if error else ""
            self.error(f"Inloggning misslyckades{error_info}")
    
    def page_navigation(self, url: str, success: bool = True, load_time: Optional[float] = None):
        """Logga sidnavigering"""
        if success:
            extras = {'url': url}
            if load_time:
                extras['duration'] = load_time
            self.info("Navigerade till sida", **extras)
        else:
            self.error(f"Kunde inte navigera till sida", url=url)
    
    def element_interaction(self, action: str, element: str, success: bool = True):
        """Logga elementinteraktioner"""
        if success:
            self.debug(f"{action} på element '{element}'")
        else:
            self.warning(f"Kunde inte {action.lower()} på element '{element}'")
    
    def data_validation(self, field_name: str, expected: Any, actual: Any, success: bool = True):
        """Logga datavalidering"""
        if success:
            self.success(f"Validering lyckades för {field_name}", expected=expected, actual=actual)
        else:
            self.error(f"Validering misslyckades för {field_name}", expected=expected, actual=actual)
    
    def performance_metric(self, metric_name: str, value: float, threshold: float, success: bool = True):
        """Logga prestanda-mätningar"""
        unit = "ms" if "time" in metric_name.lower() else ""
        if success:
            self.success(f"Prestanda OK för {metric_name}: {value}{unit} (max {threshold}{unit})")
        else:
            self.warning(f"Prestanda dålig för {metric_name}: {value}{unit} > {threshold}{unit}")
    
    def screenshot_taken(self, filename: str, reason: str = ""):
        """Logga skärmdumpar"""
        reason_text = f" - {reason}" if reason else ""
        self.info(f"Skärmdump sparad: {filename}{reason_text}")
    
    def progress_update(self, current: int, total: int, message: str = ""):
        """Visa framsteg med progress bar"""
        percentage = (current / total) * 100
        bar_length = 30
        filled_length = int(bar_length * current // total)
        
        bar = '█' * filled_length + '░' * (bar_length - filled_length)
        progress_text = f"📊 Framsteg: [{bar}] {percentage:.1f}% ({current}/{total})"
        
        if message:
            progress_text += f" - {message}"
        
        print(f"\r{progress_text}", end='', flush=True)
        
        if current == total:
            print()  # Ny rad när klar
    
    def section_header(self, title: str):
        """Skapa en tydlig sektionsrubrik"""
        print(f"\n{'─' * 20} {title.upper()} {'─' * 20}")
        sys.stdout.flush()
    
    def waiting(self, message: str, duration: int = 3):
        """Visa väntmeddelande med countdown"""
        for i in range(duration, 0, -1):
            print(f"\r⏳ {message}... ({i}s kvar)", end='', flush=True)
            time.sleep(1)
        print(f"\r✅ {message}... klar!      ")
        sys.stdout.flush()


# Utility funktioner för att göra loggningen enkelt att använda
def create_human_logger(show_colors: bool = None, show_timestamps: bool = None) -> HumanLogger:
    """Skapa en human logger med standardinställningar"""
    
    # Auto-detektera färgsupport om inte specificerat
    if show_colors is None:
        show_colors = sys.stdout.isatty() and sys.platform != 'win32'
    
    # Visa timestamps som standard
    if show_timestamps is None:
        show_timestamps = True
    
    return HumanLogger(show_timestamps=show_timestamps, show_colors=show_colors)


# Globala convenience-funktioner
_default_logger: Optional[HumanLogger] = None

def get_human_logger() -> HumanLogger:
    """Hämta eller skapa standard human logger"""
    global _default_logger
    if _default_logger is None:
        _default_logger = create_human_logger()
    return _default_logger


def set_human_logger(logger: HumanLogger):
    """Sätt standard human logger"""
    global _default_logger
    _default_logger = logger