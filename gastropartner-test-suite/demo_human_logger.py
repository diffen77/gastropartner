#!/usr/bin/env python3
"""
Demo av den förbättrade Human Logger
Visa hur tester nu visas på ett mer användarvänligt sätt
"""

import asyncio
import time
from tests.core.human_logger import create_human_logger, TestPhase

async def demo_test_logging():
    """Demonstrera den förbättrade loggningen"""
    
    # Skapa logger
    logger = create_human_logger()
    
    # 1. Starta testsuite
    logger.start_test_suite("Demo Testsvit", "staging", "chromium")
    
    # 2. Setup-fas
    logger.start_phase(TestPhase.SETUP, "Förbereder testmiljö")
    await asyncio.sleep(1)  # Simulera setup-tid
    logger.finish_phase(True, "Webbläsare redo")
    
    # 3. Login-fas
    logger.start_phase(TestPhase.LOGIN, "Loggar in på applikationen")
    await asyncio.sleep(2)  # Simulera login-tid
    logger.authentication_status(True, "test@gastropartner.se")
    logger.finish_phase(True, "Inloggning lyckades")
    
    # 4. Test olika moduler
    modules = [
        ("Ingredienser", True, {"passed_tests": 5, "failed_tests": 0}),
        ("Recept", True, {"passed_tests": 3, "failed_tests": 1}),
        ("Meny", False, {"passed_tests": 2, "failed_tests": 3}),
    ]
    
    for module_name, success, results in modules:
        logger.start_test_module(module_name)
        
        # Test steps
        logger.start_phase(TestPhase.TESTING, f"Kör {module_name.lower()}tester")
        
        if module_name == "Ingredienser":
            logger.test_step("Navigerar till ingredienser", True)
            logger.test_step("Validerar formulär", True)
            logger.test_step("Skapar ny ingrediens", True, "Ingrediens 'Tomat' skapad")
            logger.test_step("Uppdaterar ingrediens", True)
            logger.test_step("Tar bort ingrediens", True)
            
        elif module_name == "Recept":
            logger.test_step("Öppnar receptsida", True)
            logger.test_step("Lägger till ingredienser", True)
            logger.test_step("Sparar recept", True)
            logger.test_step("Beräknar näringsvärden", False, "Kalkylfel upptäckt")
            
        elif module_name == "Meny":
            logger.test_step("Skapar menyobjekt", True)
            logger.test_step("Ställer in pris", True)
            logger.test_step("Validerar allergener", False, "Fel i allergenvalidering")
            logger.test_step("Publicerar meny", False, "Kan inte publicera med fel")
            logger.test_step("Arkiverar objekt", False, "Arkivering misslyckades")
        
        await asyncio.sleep(1)  # Simulera test-tid
        logger.finish_phase(success, f"{results['passed_tests']}/{results['passed_tests'] + results['failed_tests']} tester lyckades")
        logger.finish_test_module(module_name, success, results)
    
    # 5. Visa progress
    logger.section_header("Progress Tracking")
    for i in range(1, 11):
        logger.progress_update(i, 10, f"Processar objekt {i}")
        await asyncio.sleep(0.2)
    
    # 6. Performance metrics
    logger.section_header("Performance Metrics")
    logger.performance_metric("Page Load Time", 850, 1000, True)
    logger.performance_metric("API Response", 1200, 500, False)
    logger.performance_metric("Database Query", 45, 100, True)
    
    # 7. Data validation
    logger.section_header("Data Validation")
    logger.data_validation("Pris", "29.50", "29.50", True)
    logger.data_validation("Allergener", ["gluten", "laktos"], ["gluten"], False)
    
    # 8. Cleanup
    logger.start_phase(TestPhase.CLEANUP, "Städar upp testdata")
    await asyncio.sleep(1)
    logger.finish_phase(True, "Testdata borttaget")
    
    # 9. Avsluta
    logger.finish_test_suite(False, 25.8)  # Misslyckades pga meny-modulen

if __name__ == "__main__":
    print("=== DEMO: Förbättrad Human Logger ===\n")
    asyncio.run(demo_test_logging())
    print("\n=== DEMO SLUTFÖRD ===")
    print("\nFörbättringar:")
    print("• 🎨 Visuella emojis och färger")
    print("• 📊 Tydlig progress-rapportering")
    print("• ⏱️  Tidsmätning för alla faser")
    print("• 📈 Detaljerad statistik")
    print("• 🔍 Steg-för-steg visibility")
    print("• 🌍 Svenska meddelanden")
    print("• 📋 Strukturerad output")