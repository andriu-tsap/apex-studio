import { z } from 'zod';
export const services = [
  { id: 'detail', name: { pl: 'Detailing', en: 'Detailing', ua: 'Детейлінг' }, base: 65000 },
  {
    id: 'ceramic',
    name: { pl: 'Powłoka ceramiczna', en: 'Ceramic protection', ua: 'Керамічний захист' },
    base: 180000,
  },
  {
    id: 'ppf',
    name: { pl: 'Folia PPF', en: 'PPF protection', ua: 'Захисна плівка PPF' },
    base: 420000,
  },
] as const;
export const configSchema = z.object({
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  wheels: z.enum(['silver', 'black']),
  caliper: z.string().regex(/^#[0-9a-f]{6}$/i),
  tint: z.enum(['light', 'dark']),
  preset: z.enum(['street', 'track', 'stealth', 'custom']),
});
export type CarConfiguration = z.infer<typeof configSchema>;
export const defaultConfig: CarConfiguration = {
  color: '#dfe7ec',
  wheels: 'silver',
  caliper: '#ff425f',
  tint: 'light',
  preset: 'street',
};
export const estimateSchema = z.object({
  service: z.enum(['detail', 'ceramic', 'ppf']),
  size: z.enum(['coupe', 'sedan', 'suv']),
  extra: z.boolean().default(false),
});
export type EstimateInput = z.infer<typeof estimateSchema>;
export function estimateLocal(input: EstimateInput) {
  const service = services.find((s) => s.id === input.service);
  if (!service) throw new Error('Unknown service');
  return {
    amount:
      Math.round((service.base * { coupe: 100, sedan: 115, suv: 130 }[input.size]) / 100) +
      (input.extra ? 20000 : 0),
    currency: 'PLN' as const,
    version: '2026-01',
    source: 'local' as const,
  };
}
export const bookingSchema = estimateSchema.extend({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  date: z.iso.date(),
  time: z.enum(['10:00', '12:00', '14:00']),
  config: configSchema,
  consent: z.literal(true),
});
export type BookingInput = z.infer<typeof bookingSchema>;
export type BookingStatus =
  'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'queued' | 'conflict';
export type Booking = {
  id: string;
  name: string;
  email: string;
  service: EstimateInput['service'];
  size: EstimateInput['size'];
  extra: boolean;
  date: string;
  time: string;
  config: CarConfiguration;
  amount: number;
  status: BookingStatus;
  mode: 'demo' | 'live';
  createdAt: string;
};
export const products = [
  {
    id: 'wash',
    name: { pl: 'Szampon pH neutral', en: 'pH-neutral wash', ua: 'pH-нейтральний шампунь' },
    category: 'care',
    price: 7900,
    color: '#00c9d8',
  },
  {
    id: 'seal',
    name: { pl: 'Sealant ceramiczny', en: 'Ceramic sealant', ua: 'Керамічний силант' },
    category: 'care',
    price: 14900,
    color: '#ff2e88',
  },
  {
    id: 'towel',
    name: { pl: 'Ręcznik z mikrofibry', en: 'Microfibre towel', ua: 'Рушник із мікрофібри' },
    category: 'accessories',
    price: 4900,
    color: '#a8b3c5',
  },
  {
    id: 'brush',
    name: {
      pl: 'Pędzle detailingowe',
      en: 'Detailing brush set',
      ua: 'Набір щіток для детейлінгу',
    },
    category: 'accessories',
    price: 8900,
    color: '#b6ff3b',
  },
] as const;
export const cartSchema = z
  .array(
    z.object({
      id: z.enum(['wash', 'seal', 'towel', 'brush']),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .max(4)
  .refine((items) => new Set(items.map((i) => i.id)).size === items.length, 'Duplicate products');
export type Cart = z.infer<typeof cartSchema>;
export function cartTotal(items: Cart) {
  return items.reduce(
    (sum, item) => sum + (products.find((p) => p.id === item.id)?.price ?? 0) * item.quantity,
    0,
  );
}
export function money(amount: number, locale = 'pl') {
  return new Intl.NumberFormat(locale === 'ua' ? 'uk' : locale, {
    style: 'currency',
    currency: 'PLN',
  }).format(amount / 100);
}
export const faq = [
  {
    keys: ['ppf', 'плів', 'foli'],
    pl: 'PPF chroni lakier przed drobnymi uszkodzeniami. Wybierz PPF w formularzu, aby zobaczyć koszt demonstracyjny.',
    en: 'PPF helps protect the paint. Select PPF in the booking form for a demo estimate.',
    ua: 'PPF допомагає захистити лак. Вибери PPF у формі для демонстраційного кошторису.',
  },
  {
    keys: ['ceram', 'керам'],
    pl: 'Powłoka ceramiczna ułatwia pielęgnację. Przykładowa cena od 1 800 PLN.',
    en: 'Ceramic protection makes maintenance easier. Illustrative pricing starts at PLN 1,800.',
    ua: 'Керамічний захист полегшує догляд. Приклад ціни — від 1 800 PLN.',
  },
  {
    keys: ['slot', 'termin', 'book', 'запис', 'брон', 'віль'],
    pl: 'Dostępność sprawdzisz w formularzu rezerwacji. Terminy demonstracyjne nie są prawdziwą rezerwacją.',
    en: 'Check availability in the booking form. Demo slots are not real appointments.',
    ua: 'Доступні слоти є у формі бронювання. Демослоти не є реальними записами.',
  },
] as const;
