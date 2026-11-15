import { describe, expect, it } from 'vitest';
import { messages } from './messages';
import { htmlLanguages, isLocale, locales } from './config';
describe('localized static routes', () => {
  it('maps the Ukrainian URL to the correct HTML language tag', () => {
    expect(isLocale('ua')).toBe(true);
    expect(htmlLanguages.ua).toBe('uk');
    expect(isLocale('fr')).toBe(false);
  });
  it.each(locales)('provides complete, nonempty %s content', (locale) => {
    expect(Object.keys(messages[locale]).sort()).toEqual(Object.keys(messages.pl).sort());
    expect(Object.values(messages[locale]).every((text) => text.trim().length > 0)).toBe(true);
  });
});
