export const sections = [
  'booking',
  'shop',
  'account',
  'journal',
  'projects',
  'under-the-hood',
] as const;
export type Section = (typeof sections)[number];
