import { Document } from '@/components/document';
export { metadata, viewport } from '@/components/document';
export default function DefaultLayout({ children }: { children: React.ReactNode }) {
  return <Document language="pl">{children}</Document>;
}
