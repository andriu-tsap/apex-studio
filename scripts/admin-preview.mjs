process.env.PORT = process.env.PORT || '4200';
process.env.PREVIEW_DIR = 'preview-admin';
process.env.SPA_FALLBACK = '1';
await import('./preview.mjs');
