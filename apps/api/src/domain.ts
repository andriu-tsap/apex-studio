export function slotDate(date: string, time: string) {
  const tentative = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(tentative.getTime())) throw new Error('Invalid date');
  const part =
    new Intl.DateTimeFormat('en', { timeZone: 'Europe/Warsaw', timeZoneName: 'shortOffset' })
      .formatToParts(tentative)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1';
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part);
  const minutes = match
    ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? 0))
    : 0;
  return new Date(tentative.getTime() - minutes * 60000);
}
export function localSlot(slot: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(slot);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}
export function validFutureSlot(date: string, time: string, now = Date.now()) {
  try {
    const slot = slotDate(date, time);
    const back = localSlot(slot);
    return (
      back.date === date &&
      back.time === time &&
      slot.getTime() > now + 3600000 &&
      slot.getTime() < now + 90 * 86400000
    );
  } catch {
    return false;
  }
}
