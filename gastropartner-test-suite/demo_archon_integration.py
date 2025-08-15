#!/usr/bin/env python3
"""
Demo av Archon Integration för Critical Bug Task Creation
Visar komplett workflow från testfel till Archon task
"""

import json
import time
from datetime import datetime
from pathlib import Path

def create_demo_test_failure():
    """Skapa demo test failure data för att visa integrationen"""
    return {
        'module': 'ingredients',
        'success': False,
        'error': 'AssertionError: Expected ingredient to be saved but got validation error: "Name is required"',
        'total_tests': 5,
        'passed_tests': 3,
        'failed_tests': 2,
        'details': {
            'test_name': 'test_add_new_ingredient',
            'error_trace': [
                'File "tests/e2e/ingredients_test.py", line 45, in test_add_new_ingredient',
                '    assert result.success == True',
                'AssertionError: Expected ingredient to be saved but got validation error'
            ],
            'screenshot': 'screenshots/ingredients_test_failed_20250815_195200.png',
            'url': 'http://localhost:3000/ingredients',
            'action': 'Fill ingredient form and click save',
            'expected': 'Ingredient should be saved successfully',
            'actual': 'Validation error: "Name is required"'
        },
        'environment': 'local',
        'browser': 'chromium',
        'timestamp': datetime.now().isoformat()
    }

def demo_task_data_generation():
    """Demonstrera hur task data genereras från test failure"""
    print("🔍 STEG 1: Generera task data från test failure")
    print("=" * 50)
    
    test_failure = create_demo_test_failure()
    
    print("Test failure data:")
    print(json.dumps(test_failure, indent=2))
    print()
    
    # Simulera samma logik som finns i JavaScript integrationen
    def extract_test_failure_data(module_result, module_name, session_id):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        reproduction_steps = [
            f"1. Navigera till {module_name} sidan",
            f"2. Försök lägga till/redigera {module_name}",
            f"3. Utför handlingen: {module_result['details']['action']}",
            f"4. Observera fel: {module_result['error']}"
        ]
        
        title = f"CRITICAL BUG: {module_name.title()} - {module_result['error'][:50]}..."
        
        description = f"""## 🚨 Critical Bug Report från Automatiska Tester

### Problembeskrivning
{module_result['error']}

### Återskapa Problemet
{chr(10).join(reproduction_steps)}

### Tekniska Detaljer
- **Testmodul**: {module_name}
- **Testnamn**: {module_result['details']['test_name']}
- **Miljö**: {module_result['environment']}
- **Webbläsare**: {module_result['browser']}
- **Tidsstämpel**: {module_result['timestamp']}
- **Session ID**: {session_id}
- **Screenshot**: {module_result['details']['screenshot']}

### Prioritet
🔴 **CRITICAL** - Detta fel upptäcktes av automatiska tester och behöver åtgärdas omedelbart.

### Acceptanskriterier
- [ ] Felet är identifierat och rotorsaken fastställd
- [ ] Korrekt lösning implementerad
- [ ] Manuella tester bekräftar att problemet är löst
- [ ] Automatiska tester passerar utan fel
- [ ] Ingen regression introducerats

### Ytterligare Information
- **Test Suite**: GastroPartner Test Suite
- **Testresultat**: {module_result['failed_tests']}/{module_result['total_tests']} tester misslyckades
- **Förväntad**: {module_result['details']['expected']}
- **Faktisk**: {module_result['details']['actual']}
"""
        
        return {
            'title': title,
            'description': description.strip(),
            'assignee': 'AI IDE Agent',
            'task_order': 100,
            'feature': 'critical-bug-fix',
            'sources': [
                {
                    'url': module_result['details']['screenshot'],
                    'type': 'screenshot',
                    'relevance': 'Visual bevis på felet'
                },
                {
                    'url': 'test-report.html',
                    'type': 'test_report',
                    'relevance': f'Testrapport som visar {module_name} fel'
                }
            ],
            'code_examples': [
                {
                    'file': f'tests/e2e/{module_name}_test.py',
                    'function': module_result['details']['test_name'],
                    'purpose': 'Test som misslyckades och upptäckte buggen'
                }
            ]
        }
    
    task_data = extract_test_failure_data(test_failure, 'ingredients', 'test_session_123')
    
    print("Genererad Archon task data:")
    print(json.dumps(task_data, indent=2, ensure_ascii=False))
    
    return task_data

def demo_api_call(task_data):
    """Demonstrera API call till Archon endpoint"""
    print("\n🚀 STEG 2: Simulera API call till Archon endpoint")
    print("=" * 50)
    
    api_endpoint = "http://localhost:5001/api/archon/tasks"
    
    # Simulera API request
    api_request = {
        'action': 'create',
        'project_id': 'e1e5d90c-616d-4c46-86d2-a77dd121a197',
        **task_data
    }
    
    print(f"POST {api_endpoint}")
    print("Request body:")
    print(json.dumps(api_request, indent=2, ensure_ascii=False)[:500] + "...")
    
    # Simulera framgångsrik respons
    mock_response = {
        'success': True,
        'task': {
            'id': 'task-uuid-12345',
            'title': task_data['title'],
            'status': 'todo',
            'priority': 'critical',
            'assignee': task_data['assignee'],
            'task_order': task_data['task_order'],
            'feature': task_data['feature'],
            'project_id': 'e1e5d90c-616d-4c46-86d2-a77dd121a197',
            'created_at': datetime.now().isoformat(),
            'source_count': len(task_data['sources']),
            'code_examples_count': len(task_data['code_examples']),
            'tags': ['critical-bug', 'automated-test', 'test-failure'],
            'estimated_hours': 4,
            'created_via': 'test-suite-integration'
        }
    }
    
    print("\nMock API Response:")
    print(json.dumps(mock_response, indent=2, ensure_ascii=False))
    
    return mock_response

def demo_ui_interaction():
    """Demonstrera UI interaktion och notifiering"""
    print("\n💫 STEG 3: UI Interaktion och notifiering")
    print("=" * 50)
    
    print("1. Användare öppnar testrapport i webbläsare")
    print("2. Ser misslyckad test med röd status badge")
    print("3. Klickar på '🚨 Skapa Critical Bug Task' knappen")
    print("4. Knappen visar loading state: '⏳ Skapar task...'")
    print("5. API call görs till backend")
    print("6. Framgångsrik respons returneras")
    print("7. Grön notifiering visas:")
    print()
    print("   ┌─────────────────────────────────────────┐")
    print("   │ ✅ Task skapad i Archon                 │")
    print("   │                                         │")
    print("   │ Task ID: task-uuid-12345                │")
    print("   │ Titel: CRITICAL BUG: Ingredients...     │")
    print("   │                                         │")
    print("   │ Tasken har skapats med hög prioritet    │")
    print("   │ och tilldelats för omedelbar åtgärd.    │")
    print("   └─────────────────────────────────────────┘")
    print()
    print("8. Knappen visar framgång: '✅ Task Skapad'")
    print("9. Efter 3 sekunder återställs knappen")

def demo_workflow_summary():
    """Sammanfatta hela workflowet"""
    print("\n📋 KOMPLETT WORKFLOW SAMMANFATTNING")
    print("=" * 50)
    
    workflow_steps = [
        "1. 🧪 Test Suite kör automatiska tester",
        "2. ❌ Test misslyckas och genererar rapport",
        "3. 📄 HTML rapport skapas med testresultat",
        "4. 👤 Användare öppnar rapport i webbläsare",
        "5. 🚨 Klickar 'Skapa Critical Bug Task' knappen",
        "6. 📊 JavaScript extraherar test failure data",
        "7. 🔄 API call görs till Flask backend",
        "8. 🏗️ Backend skapar strukturerad task data",
        "9. 📡 Task skickas till Archon MCP server",
        "10. ✅ Archon skapar task med hög prioritet",
        "11. 💬 Användare får bekräftelse notifiering",
        "12. 🔧 Developer kan nu åtgärda buggen"
    ]
    
    for step in workflow_steps:
        print(step)
        time.sleep(0.1)  # Liten delay för visuell effekt
    
    print("\n🎯 FÖRDELAR MED DENNA INTEGRATION:")
    print("- ⚡ Snabb feedback från automatiska tester till development team")
    print("- 📝 Detaljerade återskapa-instruktioner för varje bug")
    print("- 🏷️ Automatisk tagging och prioritering")
    print("- 📊 Komplett kontext och teknisk information")
    print("- 🔄 Smidig integration mellan test suite och project management")
    print("- 🚀 Snabbare bug resolution genom bättre dokumentation")

def main():
    """Kör komplett demo"""
    print("🎬 DEMO: Archon Integration för Critical Bug Tasks")
    print("=" * 60)
    print()
    
    # Steg 1: Generera task data
    task_data = demo_task_data_generation()
    
    # Steg 2: Simulera API call  
    api_response = demo_api_call(task_data)
    
    # Steg 3: Visa UI interaktion
    demo_ui_interaction()
    
    # Steg 4: Sammanfatta workflow
    demo_workflow_summary()
    
    print(f"\n✅ Demo slutförd! Integration är redo att användas.")
    print("\nFör att köra live integration:")
    print("1. Starta test API server: python3 test_api_server.py")
    print("2. Kör tester: python3 run_tests.py") 
    print("3. Öppna en testrapport med misslyckade tester")
    print("4. Klicka på '🚨 Skapa Critical Bug Task' knappen")

if __name__ == '__main__':
    main()