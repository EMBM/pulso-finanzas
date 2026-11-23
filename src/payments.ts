export type PaymentStatus = 'pending' | 'paid';
export type PaymentTracking = {
  type: 'expense' | 'income';
  date: string;
  status?: PaymentStatus;
  paidAt?: string;
  installmentNumber?: number;
  installmentsTotal?: number;
  remindDaysBefore?: number;
};
// Legacy transactions without status were recorded as completed in earlier versions.
export const isPaid = (t: PaymentTracking) => t.status !== 'pending';
export const isPending = (t: PaymentTracking) => t.status === 'pending';
export const actualDate = (t: PaymentTracking) => t.paidAt || t.date;
export function daysToDue(ymd: string, base: string): number {
  const parsed=(s:string) => {
    const [y,m,d]=s.split('-').map(Number);
    return Date.UTC(y,m-1,d);
  };
  return Math.round((parsed(ymd)-parsed(base))/86400000);
}
export function dueDescription(ymd: string, base: string): string {
  const days=daysToDue(ymd,base);
  if(days<0)return 'Vencido hace '+Math.abs(days)+' día'+(days===-1?'':'s');
  if(days===0)return 'Vence hoy';
  if(days===1)return 'Vence mañana';
  return 'Vence en '+days+' días';
}
