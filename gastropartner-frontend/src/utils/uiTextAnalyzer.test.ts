import { UITextAnalyzer, analyzeCurrentPage } from './uiTextAnalyzer';

// Mock DOM methods
Object.defineProperty(global, 'document', {
  value: {
    querySelectorAll: jest.fn(),
    createElement: jest.fn(),
  },
});

Object.defineProperty(global, 'window', {
  value: {
    innerWidth: 1920,
    innerHeight: 1080,
    location: {
      href: 'https://test.example.com'
    }
  }
});

describe('UITextAnalyzer', () => {
  let analyzer: UITextAnalyzer;
  let mockElement: Partial<HTMLElement>;

  // Helper function to create mock element with specific tag
  const createMockElement = (tagName: string, overrides: Partial<HTMLElement> = {}): Partial<HTMLElement> => {
    const mockRect: DOMRect = {
      x: 10,
      y: 20,
      width: 100,
      height: 30,
      top: 20,
      left: 10,
      bottom: 50,
      right: 110,
      toJSON: () => ({
        x: 10,
        y: 20,
        width: 100,
        height: 30,
        top: 20,
        left: 10,
        bottom: 50,
        right: 110
      })
    };

    return {
      tagName,
      textContent: 'Ange ditt namn',
      getAttribute: jest.fn(),
      hasAttribute: jest.fn(),
      getBoundingClientRect: jest.fn(() => mockRect),
      style: {
        display: '',
        visibility: ''
      } as CSSStyleDeclaration,
      className: '',
      parentElement: null,
      ...overrides
    };
  };

  beforeEach(() => {
    analyzer = new UITextAnalyzer();
    
    // Create a default mock HTML element
    mockElement = createMockElement('LABEL');

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('analyzeElement', () => {
    it('should correctly analyze a Swedish label element', () => {
      // Setup mock element as label
      mockElement.getAttribute = jest.fn((attr) => {
        if (attr === 'for') return 'name-input';
        return null;
      });
      mockElement.hasAttribute = jest.fn((attr) => attr === 'for');

      const result = analyzer.analyzeElement(mockElement as HTMLElement);

      expect(result.text).toBe('Ange ditt namn');
      expect(result.type).toBe('label');
      expect(result.functionality.category).toBe('input');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Swedish language patterns', () => {
      mockElement.textContent = 'Välj din kategori';
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result.functionality.keywords).toContain('välj');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should categorize action buttons correctly', () => {
      mockElement = createMockElement('BUTTON', {
        textContent: 'Spara ändringar'
      });
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result.type).toBe('button');
      expect(result.functionality.category).toBe('action');
      expect(result.functionality.action).toBe('spara');
    });

    it('should identify error messages', () => {
      mockElement = createMockElement('SPAN', {
        className: 'error-message',
        textContent: 'Ogiltigt format på fältet'
      });
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result.type).toBe('error_message');
      expect(result.functionality.category).toBe('validation');
    });

    it('should detect help text elements', () => {
      mockElement = createMockElement('SPAN', {
        className: 'help-text',
        textContent: 'Hjälp med detta fält'
      });
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result.type).toBe('help_text');
      expect(result.functionality.category).toBe('help');
    });

    it('should handle placeholder attributes', () => {
      mockElement = createMockElement('INPUT', {
        getAttribute: jest.fn((attr) => {
          if (attr === 'placeholder') return 'Skriv ditt meddelande här';
          return null;
        }),
        hasAttribute: jest.fn((attr) => attr === 'placeholder'),
        textContent: ''
      });

      const result = analyzer.analyzeElement(mockElement as HTMLElement);

      expect(result.text).toBe('Skriv ditt meddelande här');
      expect(result.type).toBe('placeholder');
    });

    it('should calculate appropriate confidence scores', () => {
      // High confidence case - clear Swedish with multiple keywords
      mockElement.textContent = 'Spara och skicka formuläret';
      
      const highConfResult = analyzer.analyzeElement(mockElement as HTMLElement);
      expect(highConfResult.confidence).toBeGreaterThan(0.7);

      // Low confidence case - very short or unclear text
      mockElement.textContent = 'X';
      
      const lowConfResult = analyzer.analyzeElement(mockElement as HTMLElement);
      expect(lowConfResult.confidence).toBeLessThan(0.5);
    });
  });

  describe('Swedish language detection', () => {
    it('should detect Swedish characters', () => {
      const analyzer = new UITextAnalyzer();
      mockElement.textContent = 'Lägg till ändå';
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should identify Swedish keywords', () => {
      mockElement.textContent = 'eller välj från lista';
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result.functionality.keywords).toEqual(expect.arrayContaining(['eller', 'välj']));
    });
  });

  describe('Element categorization', () => {
    it('should categorize navigation elements', () => {
      mockElement.textContent = 'Tillbaka till startsidan';
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result.functionality.category).toBe('navigation');
    });

    it('should categorize validation elements', () => {
      mockElement.textContent = 'Detta fält är obligatoriskt';
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result.functionality.category).toBe('validation');
    });

    it('should categorize information elements', () => {
      mockElement.textContent = 'Detta visar ditt konto'; // Use neutral text without trigger keywords
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result.functionality.category).toBe('information');
    });
  });

  describe('Error handling', () => {
    it('should handle elements with no text gracefully', () => {
      mockElement.textContent = '';
      mockElement.getAttribute = jest.fn(() => null);
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result.text).toBe('');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle null/undefined attributes', () => {
      mockElement.getAttribute = jest.fn(() => null);
      mockElement.hasAttribute = jest.fn(() => false);
      
      const result = analyzer.analyzeElement(mockElement as HTMLElement);
      
      expect(result).toBeDefined();
      expect(result.attributes).toEqual({});
    });
  });

  describe('Integration tests', () => {
    it('should provide a working analyzeCurrentPage function', () => {
      // Helper to create NodeListOf-like object
      const createNodeList = <T extends Element>(elements: T[]): NodeListOf<T> => {
        const nodeList = {
          ...elements,
          length: elements.length,
          item: (index: number) => elements[index] || null,
          forEach: function(callback: (value: T, key: number, parent: NodeListOf<T>) => void) {
            elements.forEach((element, index) => callback(element, index, this));
          },
          entries: function*() {
            for (let i = 0; i < elements.length; i++) {
              yield [i, elements[i]] as [number, T];
            }
          },
          keys: function*() {
            for (let i = 0; i < elements.length; i++) {
              yield i;
            }
          },
          values: function*() {
            for (let i = 0; i < elements.length; i++) {
              yield elements[i];
            }
          },
          [Symbol.iterator]: function*() {
            for (let i = 0; i < elements.length; i++) {
              yield elements[i];
            }
          }
        } as NodeListOf<T>;
        return nodeList;
      };

      // Mock querySelector to return our test elements for all selectors
      const querySelectorAllMock = jest.fn((selector) => {
        // Return elements only for some selectors to avoid duplication
        if (selector === 'label') {
          return createNodeList([mockElement as HTMLElement]);
        }
        return createNodeList([]);
      });
      global.document.querySelectorAll = querySelectorAllMock;

      const result = analyzeCurrentPage();

      expect(result).toBeDefined();
      expect(result.elements.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(result.insights).toBeDefined();
    });
  });
});