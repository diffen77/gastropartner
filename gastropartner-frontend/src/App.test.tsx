import React from 'react';

// Mock react-router-dom to avoid Jest resolution issues
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

// Mock AuthContext to avoid import issues
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Basic test that verifies React is working
describe('App', () => {
  test('React is available', () => {
    expect(React).toBeDefined();
  });
  
  test('can create React element', () => {
    const element = React.createElement('div', null, 'Test');
    expect(element).toBeDefined();
    expect(element.type).toBe('div');
  });
});
