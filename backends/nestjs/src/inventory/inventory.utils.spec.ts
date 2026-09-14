import { formatDocumentNumber } from './inventory.utils';

describe('formatDocumentNumber', () => {
  it('aplica prefijo y padding', () => {
    expect(formatDocumentNumber('V-', 42n, 6)).toBe('V-000042');
  });
});
