#!/usr/bin/env python3
"""
Enkla validering av Archon integration implementation
Kontrollerar att alla filer existerar och ser korrekta ut
"""

import json
from pathlib import Path

def validate_static_files():
    """Validera att alla statiska filer existerar"""
    print("🔍 Kontrollerar statiska filer...")
    
    static_dir = Path(__file__).parent / 'static'
    archon_js = static_dir / 'archon-integration.js'
    
    if not static_dir.exists():
        print("❌ Static mapp saknas")
        return False
    
    if not archon_js.exists():
        print("❌ archon-integration.js saknas")
        return False
    
    # Kontrollera att filen innehåller viktiga funktioner
    content = archon_js.read_text()
    required_functions = [
        'ArchonIntegration',
        'createCriticalBugTask',
        'extractTestFailureData',
        'prepareBugTaskData'
    ]
    
    missing_functions = []
    for func in required_functions:
        if func not in content:
            missing_functions.append(func)
    
    if missing_functions:
        print(f"❌ Saknade funktioner i archon-integration.js: {missing_functions}")
        return False
    
    print("✅ Alla statiska filer existerar och ser korrekta ut")
    return True

def validate_api_server_changes():
    """Validera att API servern har uppdaterats korrekt"""
    print("🔍 Kontrollerar API server ändringar...")
    
    api_server_file = Path(__file__).parent / 'test_api_server.py'
    
    if not api_server_file.exists():
        print("❌ test_api_server.py saknas")
        return False
    
    content = api_server_file.read_text()
    
    # Kontrollera viktiga tillägg
    required_components = [
        'ArchonIntegration',
        '/api/archon/tasks',
        'create_archon_task',
        'send_from_directory',
        '/static/<path:filename>'
    ]
    
    missing_components = []
    for component in required_components:
        if component not in content:
            missing_components.append(component)
    
    if missing_components:
        print(f"❌ Saknade komponenter i test_api_server.py: {missing_components}")
        return False
    
    print("✅ API server har alla nödvändiga ändringar")
    return True

def validate_reporter_changes():
    """Validera att reporter har uppdaterats för att inkludera knappen"""
    print("🔍 Kontrollerar reporter ändringar...")
    
    reporter_file = Path(__file__).parent / 'tests' / 'core' / 'reporter.py'
    
    if not reporter_file.exists():
        print("❌ tests/core/reporter.py saknas")
        return False
    
    content = reporter_file.read_text()
    
    # Kontrollera viktiga tillägg
    required_components = [
        'create-bug-task-btn',
        'createCriticalBugTask',
        'archon-integration.js',
        '🚨 Skapa Critical Bug Task'
    ]
    
    missing_components = []
    for component in required_components:
        if component not in content:
            missing_components.append(component)
    
    if missing_components:
        print(f"❌ Saknade komponenter i reporter.py: {missing_components}")
        return False
    
    print("✅ Reporter har alla nödvändiga ändringar")
    return True

def print_usage_instructions():
    """Visa instruktioner för hur man använder integrations"""
    print("\n📋 INSTRUKTIONER FÖR ANVÄNDNING:")
    print("=" * 50)
    print("\n1. STARTA TEST API SERVERN:")
    print("   cd /Users/diffen/Documents/Code/gastropartner/gastropartner-test-suite")
    print("   python3 test_api_server.py")
    print("   (Servern startar på port 5001)")
    
    print("\n2. KÖR TESTER FÖR ATT GENERERA RAPPORTER:")
    print("   python3 run_tests.py")
    print("   (Detta skapar HTML testrapporter i reports/ mappen)")
    
    print("\n3. ÖPPNA TESTRAPPORT OCH ANVÄND KNAPPEN:")
    print("   - Navigera till reports/ mappen")
    print("   - Öppna någon HTML rapport med misslyckade tester")
    print("   - Klicka på '🚨 Skapa Critical Bug Task' bredvid misslyckade tester")
    print("   - Knappen kommer skapa en task i Archon med alla detaljer")
    
    print("\n4. KONTROLLERA RESULTATET:")
    print("   - Du får en notifiering om task skapades framgångsrikt")
    print("   - Task ID och titel visas")
    print("   - Alla problemdetaljer och återskapa-instruktioner inkluderas")
    
    print("\n🔧 TEKNISKA DETALJER:")
    print("- API endpoint: http://localhost:5001/api/archon/tasks")
    print("- Statiska filer: http://localhost:5001/static/archon-integration.js")
    print("- Project ID: e1e5d90c-616d-4c46-86d2-a77dd121a197")
    print("- Feature: critical-bug-fix")
    print("- Priority: High (task_order=100)")

def main():
    """Kör alla valideringar"""
    print("🧪 VALIDERING AV ARCHON INTEGRATION")
    print("=" * 40)
    
    validations = [
        validate_static_files,
        validate_api_server_changes, 
        validate_reporter_changes
    ]
    
    success_count = 0
    
    for validation in validations:
        try:
            if validation():
                success_count += 1
            print()
        except Exception as e:
            print(f"❌ Fel under validering: {e}")
            print()
    
    print("RESULTAT:")
    print("=" * 20)
    
    if success_count == len(validations):
        print("🎉 ALLA VALIDERINGAR PASSERADE!")
        print("\nArchon integration är korrekt implementerad och redo att användas.")
        print_usage_instructions()
        return True
    else:
        print(f"❌ {len(validations) - success_count} av {len(validations)} valideringar misslyckades")
        print("\nFixa ovanstående problem innan du använder integrationen.")
        return False

if __name__ == '__main__':
    main()