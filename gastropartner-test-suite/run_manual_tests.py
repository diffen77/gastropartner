#!/usr/bin/env python3
"""
GastroPartner Manual Test Runner
Enkel skript för att köra tester manuellt utan API
"""

import argparse
import os
import sys
import subprocess
from pathlib import Path

def main():
    print("🍽️ GastroPartner Manual Test Runner")
    print("="*50)
    
    # Interaktiv menu
    print("\nVälj testsvit att köra:")
    print("1. Fullständig testsvit (alla tester)")
    print("2. Smoke tests (snabba kritiska tester)")
    print("3. Ingredienstester")
    print("4. Recepttester") 
    print("5. Maträttstester")
    print("6. Datavalideringstester")
    print("7. Visuella tester")
    print("8. Prestandatester")
    print("0. Avsluta")
    
    choice = input("\nAnge ditt val (0-8): ").strip()
    
    suite_map = {
        "1": "full",
        "2": "smoke", 
        "3": "ingredients",
        "4": "recipes",
        "5": "menu_items",
        "6": "validation",
        "7": "visual",
        "8": "performance"
    }
    
    if choice == "0":
        print("👋 Hejdå!")
        return
    
    if choice not in suite_map:
        print("❌ Ogiltigt val!")
        return
    
    suite = suite_map[choice]
    
    # Välj miljö
    print("\nVälj testmiljö:")
    print("1. Lokal utveckling (local)")
    print("2. Staging") 
    print("3. Produktion")
    
    env_choice = input("\nAnge miljö (1-3, default=1): ").strip() or "1"
    
    env_map = {
        "1": "local",
        "2": "staging", 
        "3": "production"
    }
    
    environment = env_map.get(env_choice, "local")
    
    # Extra alternativ
    print(f"\nKör {suite} tester i {environment} miljö")
    
    headless = input("Kör headless? (Y/n): ").strip().lower()
    headless = headless != 'n'
    
    video = input("Spela in video? (y/N): ").strip().lower() == 'y'
    debug = input("Debug mode? (y/N): ").strip().lower() == 'y'
    
    # Bygg kommando
    cmd = [
        sys.executable,
        "run_tests.py",
        "--env", environment,
        "--suite", suite
    ]
    
    if headless:
        cmd.append("--headless")
    if video:
        cmd.append("--video")
    if debug:
        cmd.append("--debug")
    
    print(f"\n🚀 Startar testkörning...")
    print(f"Kommando: {' '.join(cmd)}")
    print("="*50)
    
    try:
        # Kör testerna
        result = subprocess.run(cmd, cwd=Path(__file__).parent)
        
        if result.returncode == 0:
            print("\n✅ Alla tester slutförda framgångsrikt!")
        else:
            print(f"\n❌ Tester misslyckades (exit code: {result.returncode})")
            
        # Visa rapporter
        reports_dir = Path(__file__).parent / "reports"
        if reports_dir.exists():
            print(f"\n📊 Testrapporter finns i: {reports_dir}")
            
        screenshots_dir = Path(__file__).parent / "screenshots" 
        if screenshots_dir.exists() and list(screenshots_dir.glob("*.png")):
            print(f"📸 Screenshots från misslyckade tester: {screenshots_dir}")
            
    except KeyboardInterrupt:
        print("\n⚠️ Testkörning avbruten av användare")
    except Exception as e:
        print(f"\n💥 Oväntat fel: {e}")

if __name__ == "__main__":
    main()