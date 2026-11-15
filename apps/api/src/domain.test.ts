import { describe, it, expect } from 'vitest';
import { slotDate, localSlot, validFutureSlot } from './domain';
describe('Warsaw booking availability', () => {
  it('uses winter and summer offsets rather than a fixed UTC offset', () => {
    expect(slotDate('2027-01-10', '10:00').toISOString()).toBe('2027-01-10T09:00:00.000Z');
    expect(slotDate('2027-07-10', '10:00').toISOString()).toBe('2027-07-10T08:00:00.000Z');
  });
  it('round trips local business time', () => {
    expect(localSlot(slotDate('2027-03-28', '12:00'))).toEqual({
      date: '2027-03-28',
      time: '12:00',
    });
  });
  it('rejects nonexistent calendar dates and old slots', () => {
    expect(validFutureSlot('2027-02-31', '10:00', new Date('2027-02-01').getTime())).toBe(false);
    expect(validFutureSlot('2020-01-01', '10:00')).toBe(false);
    expect(validFutureSlot('2027-13-01', '10:00')).toBe(false);
  });
});
