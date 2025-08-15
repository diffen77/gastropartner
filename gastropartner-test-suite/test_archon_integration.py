#!/usr/bin/env python3
"""
Test för Archon integration
Testar att critical bug task creation fungerar
"""

import json
import requests
from pathlib import Path

def test_archon_api_endpoint():
    """Testar API endpoint för Archon task creation"""
    api_url = 'http://localhost:5001/api/archon/tasks'
    
    # Simulera en misslyckad test från test suite
    test_data = {
        'action': 'create',
        'project_id': 'e1e5d90c-616d-4c46-86d2-a77dd121a197',
        'title': 'CRITICAL BUG: Ingredients - Login failed with valid credentials',
        'description': '''## 🚨 Critical Bug Report från Automatiska Tester

### Problembeskrivning
Login failed with valid credentials. Expected to be redirected to dashboard but remained on login page.

### Återskapa Problemet
1. Navigera till ingredienssidan
2. Gå till ingredienssidan och försök lägga till/redigera ingrediens
3. Utför handlingen: Click login button
4. Observera fel: Login failed with valid credentials

### Tekniska Detaljer
- **Testmodul**: ingredients
- **Testnamn**: test_add_ingredient
- **Miljö**: local
- **Webbläsare**: chromium
- **Tidsstämpel**: 2025-08-15T19:52:00.000Z
- **Session ID**: test_session_123

### Prioritet
🔴 **CRITICAL** - Detta fel upptäcktes av automatiska tester och behöver åtgärdas omedelbart.

### Acceptanskriterier
- [ ] Felet är identifierat och rotorsaken fastställd
- [ ] Korrekt lösning implementerad
- [ ] Manuella tester bekräftar att problemet är löst
- [ ] Automatiska tester passerar utan fel
- [ ] Ingen regression introducerats
''',
        'assignee': 'AI IDE Agent',
        'task_order': 100,
        'feature': 'critical-bug-fix',
        'sources': [
            {
                'url': 'test-report.html',
                'type': 'test_report',
                'relevance': 'Fullständig testrapport med alla detaljer'
            }
        ],
        'code_examples': [
            {
                'file': 'tests/e2e/ingredients_test.py',
                'function': 'test_add_ingredient',
                'purpose': 'Test som misslyckades och upptäckte buggen'
            }
        ]
    }
    
    try:
        print("Testar Archon API endpoint...")
        response = requests.post(api_url, json=test_data, timeout=10)
        
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ Test FRAMGÅNGSRIK - Critical bug task skapad!")
                print(f"Task ID: {result['task']['id']}")
                print(f"Task title: {result['task']['title']}")
                return True
            else:
                print(f"❌ API returnerade fel: {result.get('error')}")
                return False
        else:
            print(f"❌ HTTP fel: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Kunde inte ansluta till API servern. Är den igång på port 5001?")
        return False
    except Exception as e:
        print(f"❌ Oväntat fel: {e}")
        return False

def check_static_files():
    """Kontrollera att statiska filer existerar"""
    static_dir = Path(__file__).parent / 'static'
    archon_js = static_dir / 'archon-integration.js'
    
    if archon_js.exists():
        print("✅ Archon integration JavaScript fil existerar")
        return True
    else:
        print("❌ Archon integration JavaScript fil saknas")
        return False

def main():
    """Kör alla tester"""
    print("🧪 Testar Archon integration för critical bug tasks\n")
    
    # Test 1: Kontrollera statiska filer
    print("Test 1: Kontrollerar statiska filer...")
    static_ok = check_static_files()
    print()
    
    # Test 2: Testa API endpoint
    print("Test 2: Testar API endpoint...")
    api_ok = test_archon_api_endpoint()
    print()
    
    # Resultat
    if static_ok and api_ok:
        print("🎉 Alla tester PASSERADE! Archon integration är redo att användas.")
        print("\nNästa steg:")
        print("1. Starta test API servern: python test_api_server.py")
        print("2. Kör tester för att generera testrapporter")
        print("3. Öppna testrapporten och klicka på 'Skapa Critical Bug Task' för misslyckade tester")
        return True
    else:
        print("❌ Några tester MISSLYCKADES. Se ovanstående meddelanden för detaljer.")
        return False

if __name__ == '__main__':
    main()