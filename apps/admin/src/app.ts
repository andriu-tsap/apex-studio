import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { defaultConfig, estimateLocal, money, type Booking } from '@apex/types';
type Client = {
  id: string;
  name: string;
  email: string;
  role?: string;
  _count?: { bookings: number };
};
type Revenue = { month: string; revenue: number; bookings: number; running: number };
@Component({
  selector: 'apex-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  templateUrl: './app.html',
})
export class AppComponent implements OnInit {
  mode = signal<'login' | 'demo' | 'live'>('login');
  role = signal('admin');
  locale = signal<'pl' | 'en' | 'ua'>('pl');
  tab = signal('calendar');
  bookings = signal<Booking[]>([]);
  clients = signal<Client[]>([]);
  reports = signal<Revenue[]>([]);
  error = signal('');
  busy = signal(false);
  search = signal('');
  page = signal(0);
  total = signal(0);
  sort = signal('name');
  direction = signal<'asc' | 'desc'>('asc');
  email = '';
  password = '';
  api = 'http://localhost:4000';
  token = '';
  columns = ['name', 'email', 'bookings', 'role'];
  times = ['10:00', '12:00', '14:00'];
  words = {
    pl: {
      title: 'Panel studia',
      demo: 'Dane demonstracyjne',
      login: 'Zaloguj',
      demoLogin: 'Wejdź jako demo-admin',
      calendar: 'Kalendarz',
      clients: 'Klienci',
      reports: 'Raporty',
      logout: 'Wyloguj',
      export: 'Eksport Excel',
      search: 'Szukaj klienta',
      role: 'Rola',
      name: 'Imię',
      empty: 'Wolny termin',
      revenue: 'Przychód',
      bookings: 'Rezerwacje',
      save: 'Zapisz',
      email: 'E-mail',
      password: 'Hasło',
      status: 'Status',
      note: 'Concept / demo project · role demo nie nadaje dostępu do serwera',
    },
    en: {
      title: 'Studio workspace',
      demo: 'Demo data',
      login: 'Sign in',
      demoLogin: 'Enter as demo admin',
      calendar: 'Calendar',
      clients: 'Customers',
      reports: 'Reports',
      logout: 'Sign out',
      export: 'Export Excel',
      search: 'Find a customer',
      role: 'Role',
      name: 'Name',
      empty: 'Available slot',
      revenue: 'Revenue',
      bookings: 'Bookings',
      save: 'Save',
      email: 'Email',
      password: 'Password',
      status: 'Status',
      note: 'Concept / demo project · demo roles do not grant server access',
    },
    ua: {
      title: 'Кабінет студії',
      demo: 'Демонстраційні дані',
      login: 'Увійти',
      demoLogin: 'Увійти як демоадмін',
      calendar: 'Календар',
      clients: 'Клієнти',
      reports: 'Звіти',
      logout: 'Вийти',
      export: 'Експорт Excel',
      search: 'Знайти клієнта',
      role: 'Роль',
      name: 'Ім’я',
      empty: 'Вільний слот',
      revenue: 'Дохід',
      bookings: 'Бронювання',
      save: 'Зберегти',
      email: 'Ел. пошта',
      password: 'Пароль',
      status: 'Статус',
      note: 'Concept / demo project · деморолі не дають доступу до сервера',
    },
  };
  t(key: keyof typeof this.words.pl) {
    return this.words[this.locale()][key];
  }
  days = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Warsaw',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    }),
  );
  cells = computed(() =>
    this.days().flatMap((date) =>
      this.times.map((time) => ({ id: `${date}|${time}`, date, time })),
    ),
  );
  visibleClients = computed(() => {
    if (this.mode() === 'live') return this.clients();
    const q = this.search().toLowerCase();
    const all = this.clients()
      .filter((c) => (c.name + ' ' + c.email).toLowerCase().includes(q))
      .sort((a, b) => {
        const av = this.sort() === 'email' ? a.email : a.name;
        const bv = this.sort() === 'email' ? b.email : b.name;
        return av.localeCompare(bv) * (this.direction() === 'asc' ? 1 : -1);
      });
    return all.slice(this.page() * 10, (this.page() + 1) * 10);
  });
  clientCount = computed(() =>
    this.mode() === 'live'
      ? this.total()
      : this.clients().filter((c) =>
          (c.name + ' ' + c.email).toLowerCase().includes(this.search().toLowerCase()),
        ).length,
  );
  totalRevenue = computed(() => this.reports().reduce((sum, r) => sum + r.revenue, 0));
  maxRevenue = computed(() => Math.max(1, ...this.reports().map((r) => r.revenue)));
  currency = (value: number) => money(value, this.locale());
  async ngOnInit() {
    try {
      const config = (await fetch('config.json').then((r) => r.json())) as { api: string };
      this.api = config.api;
      const response = await fetch(this.api + '/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        const session = (await response.json()) as { accessToken: string; user: { role: string } };
        if (['admin', 'manager'].includes(session.user.role)) {
          this.token = session.accessToken;
          this.role.set(session.user.role);
          this.mode.set('live');
          await this.load();
        }
      }
    } catch {
      /* Demo sign-in stays available offline. */
    }
  }
  async request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    let response = await fetch(this.api + path, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.token,
        ...options.headers,
      },
    });
    if (response.status === 401 && retry) {
      const refresh = await fetch(this.api + '/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (refresh.ok) {
        const session = (await refresh.json()) as { accessToken: string };
        this.token = session.accessToken;
        return this.request<T>(path, options, false);
      }
    }
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error || 'Request failed');
    }
    return response.json() as Promise<T>;
  }
  async login() {
    this.busy.set(true);
    this.error.set('');
    try {
      const response = await fetch(this.api + '/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password }),
      });
      const session = (await response.json()) as {
        accessToken: string;
        user?: { role: string };
        error?: string;
      };
      if (!response.ok || !session.user || !['admin', 'manager'].includes(session.user.role))
        throw new Error(session.error || 'Staff access required');
      this.token = session.accessToken;
      this.password = '';
      this.role.set(session.user.role);
      this.mode.set('live');
      await this.load();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      this.busy.set(false);
    }
  }
  demo() {
    this.mode.set('demo');
    this.role.set('admin');
    this.error.set('');
    const demo: Booking[] = Array.from({ length: 12 }, (_, i) => ({
      id: `demo-${i}`,
      name: `Demo client ${i + 1}`,
      email: `demo${i + 1}@example.invalid`,
      service: i % 2 ? 'detail' : 'ceramic',
      size: 'coupe',
      extra: false,
      date: this.days()[i % 7],
      time: this.times[Math.floor(i / 7)],
      config: defaultConfig,
      amount: estimateLocal({ service: i % 2 ? 'detail' : 'ceramic', size: 'coupe', extra: false })
        .amount,
      status: i < 4 ? 'completed' : 'confirmed',
      mode: 'demo',
      createdAt: new Date().toISOString(),
    }));
    try {
      const saved = localStorage.getItem('apex-crm-demo');
      if (saved) {
        const parsed = JSON.parse(saved) as Booking[];
        if (
          Array.isArray(parsed) &&
          parsed.every((b) => b.mode === 'demo' && typeof b.id === 'string')
        )
          this.bookings.set(parsed);
        else this.bookings.set(demo);
      } else this.bookings.set(demo);
    } catch {
      this.bookings.set(demo);
    }
    this.clients.set(
      Array.from({ length: 24 }, (_, i) => ({
        id: `demo-client-${i}`,
        name: `Demo client ${i + 1}`,
        email: `demo${i + 1}@example.invalid`,
        role: 'customer',
        _count: { bookings: i % 4 },
      })),
    );
    this.demoReports();
  }
  demoReports() {
    const months = new Map<string, Revenue>();
    for (const b of this.bookings()) {
      if (b.status === 'cancelled') continue;
      const key = b.date.slice(0, 7);
      const row = months.get(key) || { month: key, revenue: 0, bookings: 0, running: 0 };
      row.bookings++;
      if (b.status === 'completed') row.revenue += b.amount;
      months.set(key, row);
    }
    let running = 0;
    this.reports.set(
      [...months.values()]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((row) => ({ ...row, running: (running += row.revenue) })),
    );
  }
  persist() {
    try {
      localStorage.setItem('apex-crm-demo', JSON.stringify(this.bookings()));
    } catch {
      this.error.set('Storage unavailable');
    }
    this.demoReports();
  }
  async load() {
    try {
      const [bookings, reports] = await Promise.all([
        this.request<Booking[]>('/admin/bookings'),
        this.request<Revenue[]>('/admin/reports'),
      ]);
      this.bookings.set(bookings);
      this.reports.set(reports);
      await this.loadClients();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Load failed');
    }
  }
  async loadClients() {
    if (this.mode() !== 'live') return;
    const data = await this.request<{ rows: Client[]; total: number }>(
      `/admin/clients?search=${encodeURIComponent(this.search())}&page=${this.page() + 1}&sort=${this.sort()}&direction=${this.direction()}`,
    );
    this.clients.set(data.rows);
    this.total.set(data.total);
  }
  filter(value: string) {
    this.search.set(value);
    this.page.set(0);
    this.loadClients().catch((e) => this.error.set(String(e)));
  }
  sortChanged(event: Sort) {
    this.sort.set(event.active);
    this.direction.set(event.direction || 'asc');
    this.loadClients().catch((e) => this.error.set(String(e)));
  }
  pageChanged(event: PageEvent) {
    this.page.set(event.pageIndex);
    this.loadClients().catch((e) => this.error.set(String(e)));
  }
  at(date: string, time: string) {
    return this.bookings().filter(
      (b) => b.date === date && b.time === time && b.status !== 'cancelled',
    );
  }
  async drop(event: CdkDragDrop<string>, date: string, time: string) {
    const booking = event.item.data as Booking;
    if (this.at(date, time).some((b) => b.id !== booking.id)) {
      this.error.set('Slot occupied');
      return;
    }
    await this.update(booking.id, { date, time });
  }
  async update(id: string, change: Partial<Booking>) {
    this.error.set('');
    try {
      if (this.mode() === 'live') {
        await this.request('/admin/bookings/' + id, {
          method: 'PATCH',
          body: JSON.stringify(change),
        });
        await this.load();
      } else {
        this.bookings.update((rows) =>
          rows.map((row) => (row.id === id ? { ...row, ...change } : row)),
        );
        this.persist();
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Update failed');
    }
  }
  async changeRole(id: string) {
    if (this.role() !== 'admin') return;
    try {
      if (this.mode() === 'live') {
        await this.request('/admin/users/' + id + '/role', {
          method: 'PATCH',
          body: JSON.stringify({ role: 'manager' }),
        });
        await this.loadClients();
      } else
        this.clients.update((rows) =>
          rows.map((row) =>
            row.id === id ? { ...row, role: row.role === 'manager' ? 'customer' : 'manager' } : row,
          ),
        );
    } catch (error) {
      this.error.set(String(error));
    }
  }
  async export() {
    this.error.set('');
    try {
      let blob: Blob;
      if (this.mode() === 'live') {
        await this.request('/auth/me');
        const response = await fetch(this.api + '/admin/export', {
          headers: { Authorization: 'Bearer ' + this.token },
        });
        if (!response.ok) throw new Error('Excel service unavailable');
        blob = await response.blob();
      } else {
        const ExcelJS = await import('exceljs');
        const book = new ExcelJS.default.Workbook();
        const sheet = book.addWorksheet('Demo revenue');
        sheet.addRow(['Month', 'Revenue PLN', 'Bookings', 'Running PLN']);
        this.reports().forEach((r) =>
          sheet.addRow([r.month, r.revenue / 100, r.bookings, r.running / 100]),
        );
        sheet.addRow(['Concept / demo data']);
        const data = await book.xlsx.writeBuffer();
        blob = new Blob([new Uint8Array(data)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'apex-report.xlsx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      this.error.set(String(error));
    }
  }
  async logout() {
    if (this.mode() === 'live')
      await fetch(this.api + '/auth/logout', { method: 'POST', credentials: 'include' }).catch(
        () => undefined,
      );
    this.token = '';
    this.mode.set('login');
    this.bookings.set([]);
    this.clients.set([]);
  }
}
