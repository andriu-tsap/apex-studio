export default function NotFound() {
  return (
    <main className="not-found shell">
      <p className="eyebrow">APEX STUDIO / 404</p>
      <h1>Page not found</h1>
      <a
        className="button button-primary"
        href={(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/pl/'}
      >
        PL
      </a>{' '}
      <a
        className="button button-outline"
        href={(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/en/'}
      >
        EN
      </a>{' '}
      <a
        className="button button-outline"
        href={(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/ua/'}
      >
        UA
      </a>
    </main>
  );
}
