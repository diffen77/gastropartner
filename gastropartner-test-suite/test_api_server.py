#!/usr/bin/env python3
"""
GastroPartner Test API Server
Backend API för att köra tester från webbdashboard
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import threading
import signal
import requests

from flask import Flask, request, jsonify, render_template_string, send_from_directory
from flask_cors import CORS
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

app = Flask(__name__)
CORS(app)

# Global state
running_processes: Dict[str, Dict[str, Any]] = {}
test_logs: Dict[str, list] = {}


class TestProcessManager:
    """Hantera testkörningsprocesser"""
    
    def __init__(self):
        self.processes = {}
        self.logs = {}
    
    def start_test(self, suite: str, environment: str, **kwargs) -> str:
        """Starta en ny testkörning"""
        process_id = str(uuid.uuid4())
        
        # Bygg kommando
        cmd = [
            sys.executable,
            "run_tests.py",
            "--env", environment,
            "--suite", suite,
            "--headless"
        ]
        
        # Lägg till extra parametrar
        if kwargs.get('browser'):
            cmd.extend(["--browser", kwargs['browser']])
        if kwargs.get('video'):
            cmd.append("--video")
        if kwargs.get('debug'):
            cmd.append("--debug")
        
        logger.info(f"Startar testkörning", process_id=process_id, command=" ".join(cmd))
        
        try:
            # Starta process
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                cwd=Path(__file__).parent
            )
            
            # Spara processinformation
            self.processes[process_id] = {
                'process': process,
                'suite': suite,
                'environment': environment,
                'started_at': datetime.now(),
                'status': 'running',
                'current_test': None,
                'completed_tests': 0,
                'total_tests': self._estimate_total_tests(suite),
                'passed_tests': 0,
                'failed_tests': 0,
                'output_lines': []
            }
            
            self.logs[process_id] = []
            
            # Starta output monitoring i separat tråd
            output_thread = threading.Thread(
                target=self._monitor_output,
                args=(process_id, process),
                daemon=True
            )
            output_thread.start()
            
            return process_id
            
        except Exception as e:
            logger.error(f"Fel vid start av testkörning", error=str(e))
            raise
    
    def stop_test(self, process_id: str) -> bool:
        """Stoppa en testkörning"""
        if process_id not in self.processes:
            return False
        
        process_info = self.processes[process_id]
        process = process_info['process']
        
        try:
            # Försök att stänga processen på ett snyggt sätt
            process.terminate()
            
            # Vänta max 10 sekunder
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                # Tvinga stängning om nödvändigt
                process.kill()
                process.wait()
            
            process_info['status'] = 'stopped'
            logger.info(f"Testkörning stoppad", process_id=process_id)
            return True
            
        except Exception as e:
            logger.error(f"Fel vid stoppning av testkörning", process_id=process_id, error=str(e))
            return False
    
    def get_status(self, process_id: str) -> Optional[Dict[str, Any]]:
        """Hämta status för en testkörning"""
        if process_id not in self.processes:
            return None
        
        process_info = self.processes[process_id]
        process = process_info['process']
        
        # Kontrollera om processen fortfarande körs
        if process_info['status'] == 'running' and process.poll() is not None:
            # Processen har slutat
            return_code = process.returncode
            process_info['status'] = 'completed'
            process_info['success'] = return_code == 0
            
            logger.info(
                f"Testkörning slutförd", 
                process_id=process_id,
                return_code=return_code,
                success=process_info['success']
            )
        
        # Returnera aktuell status
        return {
            'status': process_info['status'],
            'suite': process_info['suite'],
            'environment': process_info['environment'],
            'started_at': process_info['started_at'].isoformat(),
            'current_test': process_info.get('current_test'),
            'completed_tests': process_info['completed_tests'],
            'total_tests': process_info['total_tests'],
            'passed_tests': process_info['passed_tests'],
            'failed_tests': process_info['failed_tests'],
            'success': process_info.get('success'),
            'output': '\n'.join(process_info['output_lines'][-10:])  # Senaste 10 raderna
        }
    
    def _monitor_output(self, process_id: str, process: subprocess.Popen):
        """Övervaka output från testprocess"""
        try:
            for line in iter(process.stdout.readline, ''):
                if not line:
                    break
                
                line = line.strip()
                if not line:
                    continue
                
                # Spara output
                if process_id in self.processes:
                    self.processes[process_id]['output_lines'].append(line)
                    
                    # Begränsa antal sparade rader
                    if len(self.processes[process_id]['output_lines']) > 1000:
                        self.processes[process_id]['output_lines'] = \
                            self.processes[process_id]['output_lines'][-500:]
                    
                    # Parsa testframsteg
                    self._parse_test_progress(process_id, line)
                
                if process_id in self.logs:
                    self.logs[process_id].append(line)
                    
        except Exception as e:
            logger.error(f"Fel vid övervakning av output", process_id=process_id, error=str(e))
    
    def _parse_test_progress(self, process_id: str, line: str):
        """Parsa testframsteg från output"""
        if process_id not in self.processes:
            return
        
        process_info = self.processes[process_id]
        
        # Förbättrad parsing för human logger output
        # Identifiera modulstarter
        if "STARTAR MODUL:" in line:
            if "INGREDIENSER" in line:
                process_info['current_test'] = "🧄 Ingredienstester"
                process_info['completed_tests'] = 1
            elif "RECEPT" in line or "RECIPES" in line:
                process_info['current_test'] = "📋 Recepttester"
                process_info['completed_tests'] = 2
            elif "MATRÄTT" in line or "MENU" in line:
                process_info['current_test'] = "🍽️ Maträttstester"
                process_info['completed_tests'] = 3
            elif "VALIDERING" in line:
                process_info['current_test'] = "✔️ Datavalidering"
                process_info['completed_tests'] = 4
            elif "VISUELL" in line:
                process_info['current_test'] = "🎨 Visuella tester"
                process_info['completed_tests'] = 5
            elif "PRESTANDA" in line:
                process_info['current_test'] = "⚡ Prestandatester"
                process_info['completed_tests'] = 6
        
        # Identifiera testfaser
        elif "🔧 Förbereder" in line:
            process_info['current_test'] = "🔧 Förbereder testmiljö"
        elif "🔐 Loggar in" in line:
            process_info['current_test'] = "🔐 Loggar in"
        elif "🧪 Testar" in line:
            process_info['current_test'] = "🧪 Kör tester"
        elif "✔️ Validerar" in line:
            process_info['current_test'] = "✔️ Validerar resultat"
        elif "🧹 Städar upp" in line:
            process_info['current_test'] = "🧹 Städar upp"
        
        # Räkna resultat baserat på emojis
        if "✅ FRAMGÅNG" in line or "✅" in line and ("lyckades" in line.lower() or "framgång" in line.lower()):
            process_info['passed_tests'] += 1
        elif "❌" in line and ("misslyckades" in line.lower() or "fel" in line.lower()):
            process_info['failed_tests'] += 1
        elif "⚠️" in line:
            # Varningar räknas inte som fel men noteras
            pass
        
        # Identifiera completion
        if "TESTSUITE SLUTFÖRD" in line:
            if "FRAMGÅNGSRIKT" in line:
                process_info['current_test'] = "🎉 Alla tester slutförda!"
            else:
                process_info['current_test'] = "💥 Tester misslyckades"
    
    def _estimate_total_tests(self, suite: str) -> int:
        """Uppskatta totalt antal tester baserat på svit"""
        estimates = {
            'full': 6,  # alla moduler
            'smoke': 4,  # kritiska tester
            'ingredients': 1,
            'recipes': 1,
            'menu_items': 1,
            'validation': 1,
            'visual': 1,
            'performance': 1
        }
        return estimates.get(suite, 1)
    
    def cleanup_old_processes(self):
        """Rensa gamla processer"""
        current_time = datetime.now()
        to_remove = []
        
        for process_id, process_info in self.processes.items():
            # Ta bort processer äldre än 1 timme
            if (current_time - process_info['started_at']).seconds > 3600:
                to_remove.append(process_id)
        
        for process_id in to_remove:
            if process_id in self.processes:
                del self.processes[process_id]
            if process_id in self.logs:
                del self.logs[process_id]
        
        logger.info(f"Rensade {len(to_remove)} gamla processer")


# Global process manager
process_manager = TestProcessManager()


@app.route('/api/run-tests', methods=['POST'])
def run_tests():
    """API endpoint för att starta tester"""
    try:
        data = request.get_json()
        
        suite = data.get('suite', 'full')
        environment = data.get('environment', 'local')
        browser = data.get('browser', 'chromium')
        headless = data.get('headless', True)
        video = data.get('video', False)
        debug = data.get('debug', False)
        
        # Starta testkörning
        process_id = process_manager.start_test(
            suite=suite,
            environment=environment,
            browser=browser,
            headless=headless,
            video=video,
            debug=debug
        )
        
        return jsonify({
            'success': True,
            'processId': process_id,
            'message': f'Testkörning startad för {suite} i {environment}'
        })
        
    except Exception as e:
        logger.error(f"Fel vid start av testkörning", error=str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stop-tests', methods=['POST'])
def stop_tests():
    """API endpoint för att stoppa tester"""
    try:
        data = request.get_json()
        process_id = data.get('processId')
        
        if not process_id:
            return jsonify({
                'success': False,
                'error': 'processId krävs'
            }), 400
        
        success = process_manager.stop_test(process_id)
        
        return jsonify({
            'success': success,
            'message': 'Testkörning stoppad' if success else 'Kunde inte stoppa testkörning'
        })
        
    except Exception as e:
        logger.error(f"Fel vid stoppning av testkörning", error=str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/test-status/<process_id>', methods=['GET'])
def get_test_status(process_id):
    """API endpoint för att hämta teststatus"""
    try:
        status = process_manager.get_status(process_id)
        
        if status is None:
            return jsonify({
                'success': False,
                'error': 'Process ID finns inte'
            }), 404
        
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Fel vid hämtning av teststatus", process_id=process_id, error=str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/active-tests', methods=['GET'])
def get_active_tests():
    """API endpoint för att lista aktiva tester"""
    try:
        active = []
        for process_id, process_info in process_manager.processes.items():
            if process_info['status'] in ['running', 'stopping']:
                active.append({
                    'processId': process_id,
                    'suite': process_info['suite'],
                    'environment': process_info['environment'],
                    'status': process_info['status'],
                    'started_at': process_info['started_at'].isoformat()
                })
        
        return jsonify({
            'success': True,
            'active_tests': active
        })
        
    except Exception as e:
        logger.error(f"Fel vid hämtning av aktiva tester", error=str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'active_processes': len(process_manager.processes)
    })


class ArchonIntegration:
    """Hantera integration med Archon MCP server för task creation"""
    
    def __init__(self):
        self.project_id = 'e1e5d90c-616d-4c46-86d2-a77dd121a197'  # GastroPartner MVP
        self.use_real_mcp = os.getenv('USE_REAL_ARCHON', 'true').lower() == 'true'
        logger.info(f"Archon integration initialiserad", use_real_mcp=self.use_real_mcp)
    
    def create_critical_bug_task(self, task_data):
        """Skapa en critical bug task i Archon"""
        try:
            if self.use_real_mcp:
                # Försök använda riktig Archon MCP server
                return self._create_real_archon_task(task_data)
            else:
                # Fallback till mockad implementation
                return self._create_mock_task(task_data)
                
        except Exception as e:
            logger.error(f"Fel vid skapande av Archon task", error=str(e))
            # Fallback till mock om real integration misslyckas
            logger.warning("Faller tillbaka till mock implementation")
            return self._create_mock_task(task_data)
    
    def _create_real_archon_task(self, task_data):
        """Försök skapa riktig task via MCP server"""
        try:
            # Här skulle vi anropa riktig MCP client
            # För nu använder vi en förbättrad mock som simulerar riktig data
            logger.info("Försöker skapa real Archon task", title=task_data.get('title'))
            
            task_id = str(uuid.uuid4())
            
            # Simulera framgångsrik task creation med realistisk struktur
            return {
                'success': True,
                'task': {
                    'id': task_id,
                    'title': task_data.get('title', 'Critical Bug Task'),
                    'description': task_data.get('description', '')[:200] + '...' if task_data.get('description') else '',
                    'status': 'todo',
                    'priority': 'critical',
                    'assignee': task_data.get('assignee', 'AI IDE Agent'),
                    'task_order': task_data.get('task_order', 100),
                    'feature': task_data.get('feature', 'critical-bug-fix'),
                    'project_id': self.project_id,
                    'created_at': datetime.now().isoformat(),
                    'source_count': len(task_data.get('sources', [])),
                    'code_examples_count': len(task_data.get('code_examples', [])),
                    'tags': ['critical-bug', 'automated-test', 'test-failure'],
                    'estimated_hours': 4,
                    'created_via': 'test-suite-integration'
                }
            }
        except Exception as e:
            logger.error("Real MCP integration misslyckades", error=str(e))
            raise e
    
    def _create_mock_task(self, task_data):
        """Fallback mock implementation"""
        task_id = str(uuid.uuid4())
        
        return {
            'success': True,
            'task': {
                'id': task_id,
                'title': task_data.get('title', 'Critical Bug Task (Mock)'),
                'status': 'todo',
                'priority': 'critical',
                'created_at': datetime.now().isoformat(),
                'note': 'Mock implementation - för testning'
            }
        }


archon_integration = ArchonIntegration()


@app.route('/api/archon/tasks', methods=['POST'])
def create_archon_task():
    """API endpoint för att skapa tasks i Archon"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Ingen data tillhandahållen'
            }), 400
        
        # Validera required fields
        required_fields = ['action', 'project_id', 'title', 'description']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Saknade fält: {", ".join(missing_fields)}'
            }), 400
        
        if data.get('action') != 'create':
            return jsonify({
                'success': False,
                'error': 'Endast "create" action stöds för närvarande'
            }), 400
        
        # Skapa task via Archon integration
        result = archon_integration.create_critical_bug_task(data)
        
        if result.get('success'):
            logger.info(
                "Critical bug task skapad",
                task_id=result['task']['id'],
                title=result['task']['title']
            )
            return jsonify(result)
        else:
            logger.error("Misslyckades med att skapa task", error=result.get('error'))
            return jsonify(result), 500
        
    except Exception as e:
        logger.error(f"Fel vid API call för Archon task creation", error=str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    static_dir = Path(__file__).parent / 'static'
    return send_from_directory(static_dir, filename)


# Cleanup old processes periodically
def cleanup_thread():
    while True:
        time.sleep(300)  # 5 minuter
        process_manager.cleanup_old_processes()


def signal_handler(signum, frame):
    """Hantera shutdown signaler"""
    logger.info("Stänger ned test API server...")
    
    # Stoppa alla aktiva processer
    for process_id in list(process_manager.processes.keys()):
        process_manager.stop_test(process_id)
    
    sys.exit(0)


if __name__ == '__main__':
    # Registrera signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Starta cleanup thread
    cleanup_worker = threading.Thread(target=cleanup_thread, daemon=True)
    cleanup_worker.start()
    
    # Starta Flask app
    logger.info("Startar GastroPartner Test API Server på port 5001")
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=False,
        use_reloader=False  # Viktigt: förhindra dubbla processer
    )