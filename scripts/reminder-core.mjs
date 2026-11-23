// Pure reminder selection logic (no credentials, no database calls).
export function dateDiffDays(dueDate, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dueDate))) return NaN;
  const utc = (s) => {
    const [year, month, day] = s.split('-').map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    return new Date(timestamp).toISOString().slice(0, 10) === s ? timestamp : NaN;
  };
  return Math.round((utc(dueDate) - utc(today)) / 86400000);
}
export function selectReminders(payload, today) {
  if (payload?.reminderSettings?.emailEnabled !== true) return [];
  const advance = [1, 2, 3, 5, 7].includes(Number(payload?.reminderSettings?.daysBefore))
    ? Number(payload.reminderSettings.daysBefore)
    : 3;
  const reminders = [];
  for (const tx of Array.isArray(payload?.transactions) ? payload.transactions : []) {
    if (tx?.type !== 'expense' || tx.status !== 'pending' || tx.dueDateConfirmed !== true || !Number.isFinite(Number(tx.amount)) || Number(tx.amount) <= 0) continue;
    const remaining = dateDiffDays(tx.date, today);
    if (![advance, 1, 0, -1].includes(remaining)) continue;
    const name = String(tx.title || 'Pago pendiente').replace(/[\r\n]+/g, ' ').slice(0, 100);
    reminders.push({
      title: name,
      date: tx.date,
      amount: Math.round(Number(tx.amount)),
      days: remaining,
      installmentNumber: Number(tx.installmentNumber) || null,
      installmentsTotal: Number(tx.installmentsTotal) || null,
    });
    if (reminders.length === 30) break; // upper limit per account
  }
  return reminders;
}
export function describeDue(days) {
  if (days < 0) return 'VENCIDO hace ' + Math.abs(days) + ' día(s)';
  if (days === 0) return 'vence HOY';
  if (days === 1) return 'vence MAÑANA';
  return 'vence en ' + days + ' días';
}
