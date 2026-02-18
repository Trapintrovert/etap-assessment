import { normalizePhone } from '../../src/utils/phone.utils';

describe('normalizePhone', () => {
  it('should convert 0-prefix to +234', () => {
    expect(normalizePhone('08012345678')).toBe('+2348012345678');
  });

  it('should keep +234 prefix unchanged', () => {
    expect(normalizePhone('+2348012345678')).toBe('+2348012345678');
  });

  it('should trim whitespace', () => {
    expect(normalizePhone('  08012345678  ')).toBe('+2348012345678');
  });

  it('should handle +234 with leading spaces', () => {
    expect(normalizePhone('  +2348012345678')).toBe('+2348012345678');
  });
});
