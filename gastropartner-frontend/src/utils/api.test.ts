import { ApiClient } from './api';

describe('ApiClient', () => {
  test('can create ApiClient instance', () => {
    const client = new ApiClient('http://localhost:8000');
    expect(client).toBeDefined();
  });
  
  test('ApiClient has get method', () => {
    const client = new ApiClient('http://localhost:8000');
    expect(typeof client.get).toBe('function');
  });
  
  test('ApiClient has post method', () => {
    const client = new ApiClient('http://localhost:8000');
    expect(typeof client.post).toBe('function');
  });
});