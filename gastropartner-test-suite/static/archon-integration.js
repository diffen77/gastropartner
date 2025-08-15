/**
 * Debug Information Display för GastroPartner Test Suite
 * Visar detaljerad information för att skapa Archon-ärenden manuellt
 */

class DebugInfoDisplay {
    constructor() {
        this.currentModal = null;
    }

    /**
     * Visa debug information för en misslyckad testmodul
     */
    showDebugInfo(moduleName, buttonElement) {
        const debugDataElement = buttonElement.nextElementSibling;
        const moduleData = debugDataElement.dataset.result;
        const sessionId = debugDataElement.dataset.session;
        const environment = debugDataElement.dataset.environment;
        const timestamp = debugDataElement.dataset.timestamp;
        
        let moduleResult;
        try {
            moduleResult = JSON.parse(moduleData);
        } catch (e) {
            console.error('Kunde inte parse module data:', e);
            return;
        }

        const debugInfo = this.generateDebugInfo(moduleName, moduleResult, sessionId, environment, timestamp);
        this.showModal(debugInfo);
    }

    /**
     * Generera strukturerad debug information
     */
    generateDebugInfo(moduleName, moduleResult, sessionId, environment, timestamp) {
        const currentTime = new Date().toLocaleString('sv-SE');
        
        // Grundläggande problembeskrivning
        const problemDescription = this.generateProblemDescription(moduleName, moduleResult);
        
        // Teknisk kontext
        const technicalContext = this.generateTechnicalContext(moduleName, moduleResult, sessionId, environment, timestamp);
        
        // Reproduktionssteg
        const reproductionSteps = this.generateReproductionSteps(moduleName, moduleResult);
        
        // Acceptanskriterier
        const acceptanceCriteria = this.generateAcceptanceCriteria(moduleName, moduleResult);
        
        // Fullständig Archon-ärendebeskrivning
        const fullArchonDescription = this.generateFullArchonDescription(
            moduleName, moduleResult, problemDescription, technicalContext, 
            reproductionSteps, acceptanceCriteria
        );

        return {
            moduleName,
            problemDescription,
            technicalContext,
            reproductionSteps,
            acceptanceCriteria,
            fullArchonDescription,
            rawTestData: JSON.stringify(moduleResult, null, 2)
        };
    }

    /**
     * Generera problembeskrivning
     */
    generateProblemDescription(moduleName, moduleResult) {
        const moduleDisplayName = this.getModuleDisplayName(moduleName);
        let description = `**KRITISKT FEL i ${moduleDisplayName}-modulen**\n\n`;
        
        if (moduleResult.error) {
            description += `**Huvudfel:** ${moduleResult.error}\n\n`;
        }

        const stats = {
            total: moduleResult.total_tests || 0,
            passed: moduleResult.passed_tests || 0,
            failed: moduleResult.failed_tests || 0
        };

        if (stats.total > 0) {
            description += `**Teststatistik:** ${stats.failed}/${stats.total} tester misslyckades (${stats.passed} lyckades)\n\n`;
        }

        // Specifika testfel om tillgängliga
        if (moduleResult.details && Array.isArray(moduleResult.details)) {
            const failedTests = moduleResult.details.filter(test => !test.success);
            if (failedTests.length > 0) {
                description += `**Misslyckade tester:**\n`;
                failedTests.forEach(test => {
                    description += `- ${test.test_name || 'Unnamed test'}: ${test.details?.error || test.error || 'Okänt fel'}\n`;
                });
                description += '\n';
            }
        }

        return description;
    }

    /**
     * Generera teknisk kontext
     */
    generateTechnicalContext(moduleName, moduleResult, sessionId, environment, timestamp) {
        return {
            'Test Session ID': sessionId,
            'Miljö': environment,
            'Tidsstämpel': timestamp,
            'Testmodul': moduleName,
            'Total tester': moduleResult.total_tests || 0,
            'Misslyckade tester': moduleResult.failed_tests || 0,
            'Webbläsare': 'Playwright Chromium',
            'Test Suite': 'GastroPartner E2E Test Suite',
            'Fel typ': this.categorizeError(moduleResult.error),
            'Allvarlighetsgrad': 'CRITICAL - Automatiskt upptäckt'
        };
    }

    /**
     * Generera reproduktionssteg
     */
    generateReproductionSteps(moduleName, moduleResult) {
        const steps = [
            '**Förutsättningar:**',
            '- GastroPartner applikation körs lokalt',
            '- Testdatabas är uppsatt och tillgänglig',
            '- Webbläsare (Chrome/Chromium) installerad',
            '',
            '**Återskapa felet:**'
        ];

        // Modul-specifika steg
        const moduleSteps = this.getModuleSpecificSteps(moduleName);
        steps.push(...moduleSteps);

        // Fel-specifika steg om timeout
        if (moduleResult.error && moduleResult.error.includes('Timeout')) {
            steps.push('', '**OBS:** Felet är en timeout - kontrollera:');
            steps.push('- Svarstider från backend/databas');
            steps.push('- Nätverksanslutning och latens');
            steps.push('- Prestanda i den specifika modulen');
        }

        return steps.join('\n');
    }

    /**
     * Få modul-specifika reproduktionssteg
     */
    getModuleSpecificSteps(moduleName) {
        const stepMap = {
            'authentication': [
                '1. Öppna webbläsare och gå till http://localhost:3000',
                '2. Klicka på "Logga in"-knappen',
                '3. Fyll i testanvändarens inloggningsuppgifter',
                '4. Tryck "Logga in" och observera felet'
            ],
            'ingredients': [
                '1. Logga in i applikationen',
                '2. Navigera till "Ingredienser"-sidan',
                '3. Försök lägga till en ny ingrediens',
                '4. Fyll i formuläret och spara',
                '5. Observera felet som uppstår'
            ],
            'recipes': [
                '1. Logga in i applikationen', 
                '2. Gå till "Recept"-sidan',
                '3. Försök skapa ett nytt recept',
                '4. Lägg till ingredienser och instruktioner',
                '5. Observera felet vid sparande'
            ],
            'menu_items': [
                '1. Logga in i applikationen',
                '2. Navigera till "Maträtter"-sidan', 
                '3. Försök skapa en ny maträtt',
                '4. Fyll i detaljer som pris och beskrivning',
                '5. Observera felet som uppstår'
            ],
            'data_validation': [
                '1. Öppna applikationen och logga in',
                '2. Gå till en sida med datavalidering (Ingredienser/Recept/Maträtter)',
                '3. Mata in testdata enligt testspecifikationer',
                '4. Kontrollera att kalkylationer och validering fungerar korrekt',
                '5. Observera eventuella felaktigheter'
            ],
            'visual': [
                '1. Öppna applikationen i webbläsare',
                '2. Navigera genom de olika sidorna',
                '3. Kontrollera layout, responsive design och visuella element',
                '4. Observera visuella fel eller layoutproblem'
            ]
        };

        return stepMap[moduleName] || [
            '1. Öppna GastroPartner applikationen',
            '2. Navigera till den relevanta sektionen',
            '3. Utför den åtgärd som testar gör',
            '4. Observera felet som beskrivs ovan'
        ];
    }

    /**
     * Generera acceptanskriterier
     */
    generateAcceptanceCriteria(moduleName, moduleResult) {
        const criteria = [
            '**Grundläggande acceptanskriterier:**',
            '- [ ] Rotorsaken till felet är identifierad',
            '- [ ] Korrigerande åtgärd implementerad',
            '- [ ] Manuell testning bekräftar att problemet är löst',
            '- [ ] Automatiska tester passerar utan fel',
            '- [ ] Ingen regression introducerats i relaterade funktioner',
            ''
        ];

        // Modul-specifika kriterier
        const moduleSpecific = this.getModuleSpecificCriteria(moduleName, moduleResult);
        if (moduleSpecific.length > 0) {
            criteria.push('**Modul-specifika kriterier:**');
            criteria.push(...moduleSpecific);
            criteria.push('');
        }

        // Prestanda-specifika kriterier om timeout
        if (moduleResult.error && moduleResult.error.includes('Timeout')) {
            criteria.push('**Prestanda-kriterier:**');
            criteria.push('- [ ] Svarstid under 5 sekunder för normala operationer');
            criteria.push('- [ ] Inga timeout-fel under normal belastning');
            criteria.push('- [ ] Laddningstider optimerade');
        }

        return criteria.join('\n');
    }

    /**
     * Få modul-specifika acceptanskriterier
     */
    getModuleSpecificCriteria(moduleName, moduleResult) {
        const criteriaMap = {
            'authentication': [
                '- [ ] Användare kan logga in med giltiga uppgifter',
                '- [ ] Felmeddelanden visas för ogiltiga uppgifter',
                '- [ ] Session hanteras korrekt',
                '- [ ] Utloggning fungerar som förväntat'
            ],
            'ingredients': [
                '- [ ] Ingredienser kan skapas, redigeras och tas bort',
                '- [ ] Validering av ingrediensdata fungerar',
                '- [ ] Lista över ingredienser visas korrekt',
                '- [ ] Sökfunktion fungerar för ingredienser'
            ],
            'recipes': [
                '- [ ] Recept kan skapas med ingredienser',
                '- [ ] Redigering av recept fungerar',
                '- [ ] Kostnadskalkylationer är korrekta',
                '- [ ] Receptlista och visning fungerar'
            ],
            'menu_items': [
                '- [ ] Maträtter kan skapas och redigeras',
                '- [ ] Prissättning och marginaler beräknas korrekt',
                '- [ ] Koppling till recept fungerar',
                '- [ ] Menydisplay fungerar korrekt'
            ],
            'data_validation': [
                '- [ ] Alla numeriska kalkyleringar är korrekta',
                '- [ ] Valideringsregler tillämpas konsekvent',
                '- [ ] Edge cases hanteras korrekt',
                '- [ ] Felmeddelanden är informativa'
            ],
            'visual': [
                '- [ ] Layout är konsekvent på alla skärmstorlekar',
                '- [ ] Färger och typografi följer designsystem',
                '- [ ] Navigering är intuitiv',
                '- [ ] Responsiv design fungerar korrekt'
            ]
        };

        return criteriaMap[moduleName] || [];
    }

    /**
     * Generera fullständig Archon-ärendebeskrivning
     */
    generateFullArchonDescription(moduleName, moduleResult, problemDescription, technicalContext, reproductionSteps, acceptanceCriteria) {
        const title = `CRITICAL BUG: ${this.getModuleDisplayName(moduleName)} - ${this.getErrorSummary(moduleResult)}`;
        
        let description = `# 🚨 Kritiskt Fel - ${this.getModuleDisplayName(moduleName)} Modul\n\n`;
        description += `${problemDescription}\n`;
        description += `## 🔧 Reproduktion\n\n${reproductionSteps}\n\n`;
        description += `## 📋 Teknisk Information\n\n`;
        
        Object.entries(technicalContext).forEach(([key, value]) => {
            description += `- **${key}:** ${value}\n`;
        });
        
        description += `\n## ✅ Acceptanskriterier\n\n${acceptanceCriteria}\n\n`;
        description += `## 🎯 Prioritet\n\n🔴 **CRITICAL** - Detta fel upptäcktes av automatiska tester och blockerar funktionalitet.\n\n`;
        description += `## 📝 Ytterligare Information\n\n`;
        description += `- **Rapportlänk:** Se fullständig testrapport för mer detaljer\n`;
        description += `- **Test Suite:** GastroPartner E2E Automated Testing\n`;
        description += `- **Upptäckt:** Automatiskt via kontinuerlig testning\n`;

        return {
            title: title,
            description: description,
            assignee: 'AI IDE Agent',
            priority: 'Critical',
            feature: `${moduleName}-bug-fix`,
            labels: ['bug', 'critical', 'automated-testing', moduleName]
        };
    }

    /**
     * Visa modal med debug information
     */
    showModal(debugInfo) {
        // Stäng existerande modal om det finns någon
        if (this.currentModal) {
            this.currentModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'debug-modal';
        modal.innerHTML = `
            <div class="debug-modal-content">
                <div class="debug-modal-header">
                    <h3>🐛 Debug Information - ${debugInfo.moduleName}</h3>
                    <button class="debug-modal-close" onclick="this.closest('.debug-modal').remove()">&times;</button>
                </div>
                
                <div class="debug-grid">
                    <div class="debug-section">
                        <h4>📋 Problembeskrivning</h4>
                        <div class="debug-code-block">${debugInfo.problemDescription}</div>
                        <button class="copy-btn" onclick="copyToClipboard('${this.escapeForAttribute(debugInfo.problemDescription)}')">📋 Kopiera</button>
                    </div>
                    
                    <div class="debug-section">
                        <h4>⚙️ Teknisk Kontext</h4>
                        <div class="debug-code-block">${this.formatTechnicalContext(debugInfo.technicalContext)}</div>
                        <button class="copy-btn" onclick="copyToClipboard('${this.escapeForAttribute(this.formatTechnicalContext(debugInfo.technicalContext))}')">📋 Kopiera</button>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>🔄 Reproduktionssteg</h4>
                    <div class="debug-code-block">${debugInfo.reproductionSteps}</div>
                    <button class="copy-btn" onclick="copyToClipboard('${this.escapeForAttribute(debugInfo.reproductionSteps)}')">📋 Kopiera</button>
                </div>
                
                <div class="debug-section">
                    <h4>✅ Acceptanskriterier</h4>
                    <div class="debug-code-block">${debugInfo.acceptanceCriteria}</div>
                    <button class="copy-btn" onclick="copyToClipboard('${this.escapeForAttribute(debugInfo.acceptanceCriteria)}')">📋 Kopiera</button>
                </div>
                
                <div class="debug-section">
                    <h4>📄 Fullständig Archon-ärendebeskrivning</h4>
                    <div class="debug-code-block">${debugInfo.fullArchonDescription.description}</div>
                    <button class="copy-btn" onclick="copyToClipboard('${this.escapeForAttribute(debugInfo.fullArchonDescription.description)}')">📋 Kopiera Hela Beskrivningen</button>
                </div>
                
                <div class="debug-section">
                    <h4>🔍 Rådata från test</h4>
                    <div class="debug-code-block">${debugInfo.rawTestData}</div>
                    <button class="copy-btn" onclick="copyToClipboard('${this.escapeForAttribute(debugInfo.rawTestData)}')">📋 Kopiera Rådata</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.currentModal = modal;

        // Stäng modal med Escape-tangent
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.currentModal.remove();
                this.currentModal = null;
            }
        });

        // Stäng modal med klick utanför
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                this.currentModal = null;
            }
        });
    }

    /**
     * Hjälpfunktioner
     */
    getModuleDisplayName(moduleName) {
        const nameMap = {
            'authentication': 'Autentisering',
            'ingredients': 'Ingredienser', 
            'recipes': 'Recept',
            'menu_items': 'Maträtter',
            'data_validation': 'Datavalidering',
            'visual': 'Visuell Design'
        };
        return nameMap[moduleName] || moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    }

    getErrorSummary(moduleResult) {
        if (moduleResult.error) {
            return moduleResult.error.length > 50 
                ? moduleResult.error.substring(0, 50) + '...'
                : moduleResult.error;
        }
        return 'Testfel upptäckt';
    }

    categorizeError(error) {
        if (!error) return 'Okänt fel';
        if (error.includes('Timeout')) return 'Timeout/Prestanda';
        if (error.includes('Element not found')) return 'UI/Element';
        if (error.includes('Network')) return 'Nätverksfel';
        if (error.includes('Database')) return 'Databasfel';
        return 'Allmänt fel';
    }

    formatTechnicalContext(context) {
        return Object.entries(context)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
    }

    escapeForAttribute(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }
}

// Global funktioner
function showDebugInfo(moduleName, buttonElement) {
    const debugDisplay = new DebugInfoDisplay();
    debugDisplay.showDebugInfo(moduleName, buttonElement);
}

function copyToClipboard(text) {
    // Unescape text
    const unescapedText = text.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n');
    
    navigator.clipboard.writeText(unescapedText).then(() => {
        // Visa kort bekräftelse
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✅ Kopierat!';
        button.style.background = '#28a745';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '#34a853';
        }, 2000);
    }).catch(err => {
        console.error('Kunde inte kopiera till clipboard:', err);
        // Fallback för äldre webbläsare
        const textArea = document.createElement('textarea');
        textArea.value = unescapedText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✅ Kopierat!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}

// Exportera för global användning
window.DebugInfoDisplay = DebugInfoDisplay;
window.showDebugInfo = showDebugInfo;
window.copyToClipboard = copyToClipboard;