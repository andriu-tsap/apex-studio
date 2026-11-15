/* APEX booking Web Component. MIT. No framework, tracking or embedded credentials. */
class ApexBookingWidget extends HTMLElement {
  static get observedAttributes() {
    return ['locale', 'site-url'];
  }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }
  render() {
    const locale = ['pl', 'en', 'ua'].includes(this.getAttribute('locale'))
      ? this.getAttribute('locale')
      : 'pl';
    const text = {
      pl: {
        title: 'APEX · Rezerwacja',
        service: 'Usługa',
        date: 'Data',
        button: 'Wybierz termin',
        note: 'Concept / demo project',
        items: ['Detailing', 'Ceramika', 'Folia PPF'],
      },
      en: {
        title: 'APEX · Booking',
        service: 'Service',
        date: 'Date',
        button: 'Choose a slot',
        note: 'Concept / demo project',
        items: ['Detailing', 'Ceramic protection', 'PPF protection'],
      },
      ua: {
        title: 'APEX · Бронювання',
        service: 'Послуга',
        date: 'Дата',
        button: 'Вибрати слот',
        note: 'Concept / demo project',
        items: ['Детейлінг', 'Керамічний захист', 'Плівка PPF'],
      },
    }[locale];
    this.shadowRoot.innerHTML = `<style>:host{display:block;max-width:390px;font:14px Arial,sans-serif;color:#f4f7fb}*{box-sizing:border-box}form{padding:24px;background:#12141a;border:1px solid #30434d;border-radius:14px}h2{font-size:24px;font-weight:400;margin:0 0 22px}label{display:grid;gap:8px;margin-bottom:18px;font-size:12px}input,select,button{width:100%;font:inherit;border-radius:5px;padding:12px}input,select{background:#0a0b0f;color:#f4f7fb;border:1px solid #43525f}button{background:#00f0ff;color:#031418;border:0;font-weight:600;cursor:pointer}small{display:block;color:#a8b3c5;font-size:10px;margin-top:18px}:focus-visible{outline:2px solid #00f0ff;outline-offset:4px}</style><form><h2></h2><label><span class="service-label"></span><select name="service"><option value="detail"></option><option value="ceramic"></option><option value="ppf"></option></select></label><label><span class="date-label"></span><input name="date" type="date" required></label><button type="submit"></button><small></small><p role="alert"></p></form>`;
    const root = this.shadowRoot;
    root.querySelector('h2').textContent = text.title;
    root.querySelector('.service-label').textContent = text.service;
    root.querySelector('.date-label').textContent = text.date;
    root.querySelector('button').textContent = text.button;
    root.querySelector('small').textContent = text.note;
    root
      .querySelectorAll('option')
      .forEach((option, index) => (option.textContent = text.items[index]));
    const day = new Date();
    day.setDate(day.getDate() + 1);
    root.querySelector('input').min = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(day);
    root.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const base = new URL(this.getAttribute('site-url') || 'http://localhost:3000');
        if (
          base.protocol !== 'https:' &&
          !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))
        )
          throw new Error('HTTPS site-url required');
        const input = new FormData(event.currentTarget);
        const data = { service: input.get('service'), date: input.get('date'), locale };
        const custom = new CustomEvent('apex-booking-request', {
          detail: data,
          bubbles: true,
          composed: true,
          cancelable: true,
        });
        if (!this.dispatchEvent(custom)) return;
        const url = new URL(`/${locale}/booking/`, base);
        url.searchParams.set('service', String(data.service));
        url.searchParams.set('date', String(data.date));
        const link = document.createElement('a');
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
      } catch (error) {
        root.querySelector('[role=alert]').textContent =
          error instanceof Error ? error.message : 'Invalid widget settings';
      }
    });
  }
}
if (!customElements.get('apex-booking-widget'))
  customElements.define('apex-booking-widget', ApexBookingWidget);
