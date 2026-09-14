import { slugify } from './slug';

describe('slugify', () => {
  it('normaliza nombres para URLs', () => {
    expect(slugify(' Anillos de Oro 18 kt ')).toBe('anillos-de-oro-18-kt');
  });
});
