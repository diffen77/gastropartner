// Basic smoke test to verify test environment works
describe('App Environment', () => {
  test('test environment is working', () => {
    expect(1 + 1).toBe(2);
  });
  
  test('can import modules', () => {
    expect(typeof jest).toBe('object');
    expect(typeof describe).toBe('function');
    expect(typeof test).toBe('function');
    expect(typeof expect).toBe('function');
  });
});
