import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders GastroPartner main title', () => {
  render(<App />);
  const titleElement = screen.getByText('🍽️ GastroPartner');
  expect(titleElement).toBeInTheDocument();
});

test('renders hello world message', () => {
  render(<App />);
  const messageElement = screen.getByText(/hello world från gastropartner/i);
  expect(messageElement).toBeInTheDocument();
});

test('renders system status section', () => {
  render(<App />);
  const statusElement = screen.getByText(/system status/i);
  expect(statusElement).toBeInTheDocument();
});
