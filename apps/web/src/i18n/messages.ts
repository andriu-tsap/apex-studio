import pl from './pl.json';
import en from './en.json';
import ua from './ua.json';
import type { Locale } from './config';
export const messages = { pl, en, ua } satisfies Record<Locale, typeof pl>;
