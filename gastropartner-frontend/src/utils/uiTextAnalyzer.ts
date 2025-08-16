/**
 * UI Text Analyzer - Analyzes and interprets Swedish UI text from DOM elements
 * 
 * This module provides functionality to:
 * - Extract text from various UI elements (labels, placeholders, help text, error messages)
 * - Interpret Swedish text to understand element functionality
 * - Categorize UI elements based on their text content
 * - Extract functional information about what each element does
 */

export interface UIElement {
  element: HTMLElement;
  text: string;
  type: UIElementType;
  functionality: ElementFunctionality;
  confidence: number; // 0-1 scale for interpretation confidence
  position: DOMRect;
  attributes: Record<string, string>;
}

export type UIElementType = 
  | 'label'
  | 'placeholder'
  | 'help_text'
  | 'error_message'
  | 'instruction'
  | 'button'
  | 'heading'
  | 'description'
  | 'validation_message';

export interface ElementFunctionality {
  category: FunctionalCategory;
  action?: string;
  purpose: string;
  keywords: string[];
  relatedFields?: string[];
}

export type FunctionalCategory = 
  | 'input'          // För datainmatning
  | 'navigation'     // För navigering
  | 'action'         // För åtgärder/handlingar
  | 'validation'     // För validering/kontroll
  | 'information'    // För information/beskrivning
  | 'feedback'       // För feedback/meddelanden
  | 'help'           // För hjälp/instruktioner
  | 'grouping'       // För gruppering/organisation
  | 'unknown';

export interface AnalysisResult {
  elements: UIElement[];
  summary: {
    totalElements: number;
    categoryCounts: Record<FunctionalCategory, number>;
    confidence: number;
    language: 'swedish' | 'english' | 'mixed' | 'unknown';
  };
  insights: string[];
}

/**
 * Swedish language patterns and keywords for text analysis
 */
const SWEDISH_PATTERNS = {
  // Input-related keywords
  input: [
    'ange', 'fyll i', 'skriv', 'välj', 'markera', 'klicka', 'mata in',
    'namn', 'e-post', 'lösenord', 'telefon', 'adress', 'kommentar',
    'beskrivning', 'titel', 'meddelande', 'text', 'sök', 'filter'
  ],
  
  // Action-related keywords
  action: [
    'spara', 'skicka', 'lägg till', 'ta bort', 'redigera', 'uppdatera',
    'avbryt', 'bekräfta', 'godkänn', 'neka', 'exportera', 'importera',
    'ladda upp', 'ladda ner', 'kopiera', 'klistra in', 'publicera'
  ],
  
  // Navigation keywords
  navigation: [
    'tillbaka', 'nästa', 'föregående', 'hem', 'meny', 'navigera',
    'gå till', 'bläddra', 'sida', 'steg', 'framåt', 'bakåt'
  ],
  
  // Validation keywords
  validation: [
    'fel', 'felaktigt', 'ogiltigt', 'krävs', 'obligatorisk', 'måste',
    'kontrollera', 'validera', 'verifiera', 'korrekt', 'format'
  ],
  
  // Help/instruction keywords
  help: [
    'hjälp', 'instruktion', 'guide', 'tips', 'exempel', 'förklaring',
    'information', 'beskrivning', 'hur', 'vad', 'varför', 'när'
  ],
  
  // Feedback keywords
  feedback: [
    'lyckades', 'misslyckades', 'sparades', 'skickades', 'bekräftat',
    'framgång', 'fel uppstod', 'varning', 'meddelande', 'status'
  ]
};

/**
 * Common Swedish UI text patterns
 */
const UI_TEXT_PATTERNS = {
  placeholders: [
    /ange\s+\w+/i,          // "ange namn", "ange e-post"
    /skriv\s+\w+/i,         // "skriv meddelande"
    /välj\s+\w+/i,          // "välj kategori"
    /t\.?ex\.?\s+/i,        // "t.ex. exempel"
    /exempel:\s*/i          // "exempel: något"
  ],
  
  required_fields: [
    /\*\s*$/,               // Ending with asterisk
    /\(obligatorisk\)/i,    // "(obligatorisk)"
    /\(krävs\)/i,           // "(krävs)"
    /måste\s+fyllas/i       // "måste fyllas i"
  ],
  
  error_messages: [
    /fel\s+\w+/i,           // "fel format", "fel värde"
    /ogiltigt\s+\w+/i,      // "ogiltigt format"
    /krävs/i,               // "krävs"
    /måste\s+\w+/i          // "måste fyllas i"
  ],
  
  success_messages: [
    /\w+\s+sparades/i,      // "något sparades"
    /\w+\s+skickades/i,     // "något skickades"
    /lyckades/i,            // "lyckades"
    /framgång/i             // "framgång"
  ]
};

export class UITextAnalyzer {
  private swedishKeywords: Set<string>;
  
  constructor() {
    this.swedishKeywords = new Set([
      ...Object.values(SWEDISH_PATTERNS).flat(),
      'och', 'eller', 'är', 'för', 'med', 'på', 'av', 'till', 'från', 'som', 'att'
    ]);
  }

  /**
   * Analyzes all UI text elements on the current page
   */
  public analyzePage(): AnalysisResult {
    const elements = this.extractUIElements();
    const analyzedElements = elements.map(el => this.analyzeElement(el));
    
    return {
      elements: analyzedElements,
      summary: this.generateSummary(analyzedElements),
      insights: this.generateInsights(analyzedElements)
    };
  }

  /**
   * Analyzes a specific DOM element
   */
  public analyzeElement(element: HTMLElement): UIElement {
    const text = this.extractText(element);
    const type = this.determineElementType(element, text);
    const functionality = this.analyzeFunctionality(text, type, element);
    const confidence = this.calculateConfidence(text, type, functionality);
    
    return {
      element,
      text,
      type,
      functionality,
      confidence,
      position: element.getBoundingClientRect(),
      attributes: this.extractRelevantAttributes(element)
    };
  }

  /**
   * Extracts all relevant UI elements from the DOM
   */
  private extractUIElements(): HTMLElement[] {
    const selectors = [
      'label',
      'input[placeholder]',
      'textarea[placeholder]',
      'button',
      'h1, h2, h3, h4, h5, h6',
      '[role="button"]',
      '.help-text, .help, .instruction',
      '.error, .error-message, .validation-error',
      '.success, .success-message',
      '.description, .desc',
      'small',
      'span[title]',
      '[aria-label]',
      '[data-tooltip]'
    ];
    
    const elements: HTMLElement[] = [];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const element = el as HTMLElement;
        if (this.isRelevantElement(element)) {
          elements.push(element);
        }
      });
    });
    
    return elements;
  }

  /**
   * Extracts text from an element, considering various sources
   */
  private extractText(element: HTMLElement): string {
    // Priority order for text extraction
    const textSources = [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('placeholder'),
      element.getAttribute('alt'),
      element.textContent?.trim(),
      element.getAttribute('value')
    ];
    
    for (const text of textSources) {
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    }
    
    return '';
  }

  /**
   * Determines the type of UI element based on DOM structure and text
   */
  private determineElementType(element: HTMLElement, text: string): UIElementType {
    const tagName = element.tagName.toLowerCase();
    const className = element.className.toLowerCase();
    
    // Check for specific element types
    if (element.hasAttribute('placeholder')) {
      return 'placeholder';
    }
    
    if (tagName === 'label') {
      return 'label';
    }
    
    if (tagName === 'button' || element.getAttribute('role') === 'button') {
      return 'button';
    }
    
    if (/^h[1-6]$/.test(tagName)) {
      return 'heading';
    }
    
    // Check class names for specific types
    if (className.includes('error') || className.includes('invalid')) {
      return 'error_message';
    }
    
    if (className.includes('help') || className.includes('instruction')) {
      return 'help_text';
    }
    
    if (className.includes('description') || className.includes('desc')) {
      return 'description';
    }
    
    // Check text patterns
    if (this.matchesPattern(text, UI_TEXT_PATTERNS.error_messages)) {
      return 'validation_message';
    }
    
    if (this.matchesPattern(text, UI_TEXT_PATTERNS.success_messages)) {
      return 'validation_message';
    }
    
    // Default categorization
    return 'instruction';
  }

  /**
   * Analyzes the functionality of an element based on its text content
   */
  private analyzeFunctionality(text: string, type: UIElementType, element: HTMLElement): ElementFunctionality {
    const lowercaseText = text.toLowerCase();
    const keywords = this.extractKeywords(lowercaseText);
    
    // Determine category based on keywords and type
    let category: FunctionalCategory = 'unknown';
    let action: string | undefined;
    let purpose = '';
    
    if (this.containsKeywords(lowercaseText, SWEDISH_PATTERNS.action)) {
      category = 'action';
      action = this.extractAction(lowercaseText);
      purpose = 'Utför en specifik åtgärd eller handling';
    } else if (this.containsKeywords(lowercaseText, SWEDISH_PATTERNS.input)) {
      category = 'input';
      purpose = 'Samlar in data från användaren';
    } else if (this.containsKeywords(lowercaseText, SWEDISH_PATTERNS.navigation)) {
      category = 'navigation';
      purpose = 'Navigerar användaren till en annan vy eller sektion';
    } else if (this.containsKeywords(lowercaseText, SWEDISH_PATTERNS.validation)) {
      category = 'validation';
      purpose = 'Validerar eller kontrollerar användarinput';
    } else if (this.containsKeywords(lowercaseText, SWEDISH_PATTERNS.help)) {
      category = 'help';
      purpose = 'Ger hjälp eller instruktioner till användaren';
    } else if (this.containsKeywords(lowercaseText, SWEDISH_PATTERNS.feedback)) {
      category = 'feedback';
      purpose = 'Ger feedback om systemets status eller användarens åtgärder';
    } else if (type === 'heading') {
      category = 'grouping';
      purpose = 'Organiserar och grupperar relaterat innehåll';
    } else {
      category = 'information';
      purpose = 'Ger information eller beskrivning';
    }
    
    return {
      category,
      action,
      purpose,
      keywords,
      relatedFields: this.findRelatedFields(element)
    };
  }

  /**
   * Calculates confidence score for the analysis
   */
  private calculateConfidence(text: string, type: UIElementType, functionality: ElementFunctionality): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for Swedish language detection
    if (this.isSwedishText(text)) {
      confidence += 0.2;
    }
    
    // Boost confidence for clear element types
    if (['label', 'button', 'placeholder'].includes(type)) {
      confidence += 0.2;
    }
    
    // Boost confidence for recognized patterns
    if (functionality.keywords.length > 0) {
      confidence += Math.min(0.3, functionality.keywords.length * 0.1);
    }
    
    // Reduce confidence for very short or unclear text
    if (text.length < 3) {
      confidence -= 0.3;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Checks if text contains Swedish language patterns
   */
  private isSwedishText(text: string): boolean {
    const lowercaseText = text.toLowerCase();
    const words = lowercaseText.split(/\s+/);
    
    // Check for Swedish-specific characters
    if (/[åäöÅÄÖ]/.test(text)) {
      return true;
    }
    
    // Check for Swedish keywords
    const swedishWordCount = words.filter(word => this.swedishKeywords.has(word)).length;
    return swedishWordCount > 0 && swedishWordCount / words.length > 0.3;
  }

  /**
   * Checks if text contains specific keywords
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Extracts keywords from text
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => this.swedishKeywords.has(word) || word.length > 3);
  }

  /**
   * Extracts action from action-related text
   */
  private extractAction(text: string): string {
    const actionWords = SWEDISH_PATTERNS.action.filter(action => text.includes(action));
    return actionWords[0] || '';
  }

  /**
   * Checks if text matches specific patterns
   */
  private matchesPattern(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Finds related form fields for labels and other elements
   */
  private findRelatedFields(element: HTMLElement): string[] {
    const relatedFields: string[] = [];
    
    // Check for 'for' attribute on labels
    if (element.tagName.toLowerCase() === 'label') {
      const forAttr = element.getAttribute('for');
      if (forAttr) {
        relatedFields.push(forAttr);
      }
    }
    
    // Look for nearby input fields
    const nearbyInputs = element.parentElement?.querySelectorAll('input, textarea, select');
    nearbyInputs?.forEach(input => {
      const id = input.getAttribute('id');
      const name = input.getAttribute('name');
      if (id) relatedFields.push(id);
      if (name) relatedFields.push(name);
    });
    
    return Array.from(new Set(relatedFields)); // Remove duplicates
  }

  /**
   * Checks if an element is relevant for analysis
   */
  private isRelevantElement(element: HTMLElement): boolean {
    const text = this.extractText(element);
    
    // Skip elements with no text
    if (!text || text.length === 0) {
      return false;
    }
    
    // Skip hidden elements
    if (element.style.display === 'none' || element.style.visibility === 'hidden') {
      return false;
    }
    
    // Skip very short text (likely not meaningful)
    if (text.length < 2) {
      return false;
    }
    
    return true;
  }

  /**
   * Extracts relevant attributes from an element
   */
  private extractRelevantAttributes(element: HTMLElement): Record<string, string> {
    const relevantAttrs = ['id', 'name', 'class', 'role', 'aria-label', 'title', 'placeholder', 'type'];
    const attributes: Record<string, string> = {};
    
    relevantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        attributes[attr] = value;
      }
    });
    
    return attributes;
  }

  /**
   * Generates a summary of the analysis
   */
  private generateSummary(elements: UIElement[]): AnalysisResult['summary'] {
    const categoryCounts: Record<FunctionalCategory, number> = {
      input: 0,
      navigation: 0,
      action: 0,
      validation: 0,
      information: 0,
      feedback: 0,
      help: 0,
      grouping: 0,
      unknown: 0
    };
    
    let totalConfidence = 0;
    let swedishCount = 0;
    let englishCount = 0;
    
    elements.forEach(element => {
      categoryCounts[element.functionality.category]++;
      totalConfidence += element.confidence;
      
      if (this.isSwedishText(element.text)) {
        swedishCount++;
      } else if (/^[a-zA-Z\s]+$/.test(element.text)) {
        englishCount++;
      }
    });
    
    const averageConfidence = elements.length > 0 ? totalConfidence / elements.length : 0;
    
    let language: 'swedish' | 'english' | 'mixed' | 'unknown' = 'unknown';
    if (swedishCount > englishCount) {
      language = 'swedish';
    } else if (englishCount > swedishCount) {
      language = 'english';
    } else if (swedishCount > 0 && englishCount > 0) {
      language = 'mixed';
    }
    
    return {
      totalElements: elements.length,
      categoryCounts,
      confidence: averageConfidence,
      language
    };
  }

  /**
   * Generates insights about the analyzed UI
   */
  private generateInsights(elements: UIElement[]): string[] {
    const insights: string[] = [];
    const summary = this.generateSummary(elements);
    
    // Language insights
    if (summary.language === 'swedish') {
      insights.push('Gränssnittet använder huvudsakligen svenska texter');
    } else if (summary.language === 'mixed') {
      insights.push('Gränssnittet blandar svenska och engelska texter');
    }
    
    // Category insights
    const topCategory = Object.entries(summary.categoryCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory && topCategory[1] > 0) {
      const categoryNames: Record<FunctionalCategory, string> = {
        input: 'datainmatning',
        navigation: 'navigering',
        action: 'åtgärder',
        validation: 'validering',
        information: 'information',
        feedback: 'feedback',
        help: 'hjälptexter',
        grouping: 'gruppering',
        unknown: 'okategoriserade'
      };
      
      insights.push(`Mest förekommande elementtyp: ${categoryNames[topCategory[0] as FunctionalCategory]} (${topCategory[1]} element)`);
    }
    
    // Quality insights
    if (summary.confidence < 0.6) {
      insights.push('Låg tolkningssäkerhet - texterna kan vara otydliga eller mångtydiga');
    } else if (summary.confidence > 0.8) {
      insights.push('Hög tolkningssäkerhet - texterna är tydliga och välstrukturerade');
    }
    
    // Validation insights
    const validationCount = summary.categoryCounts.validation;
    const inputCount = summary.categoryCounts.input;
    if (validationCount === 0 && inputCount > 0) {
      insights.push('Inga valideringsmeddelanden hittades trots att det finns inmatningsfält');
    }
    
    // Help text insights
    const helpCount = summary.categoryCounts.help;
    if (helpCount === 0 && inputCount > 3) {
      insights.push('Få eller inga hjälptexter hittades för inmatningsfält');
    }
    
    return insights;
  }
}

// Export a singleton instance for easy use
export const uiTextAnalyzer = new UITextAnalyzer();

// Utility function for quick analysis
export function analyzeCurrentPage(): AnalysisResult {
  return uiTextAnalyzer.analyzePage();
}

// Utility function for analyzing specific elements
export function analyzeElement(element: HTMLElement): UIElement {
  return uiTextAnalyzer.analyzeElement(element);
}