import { createClient } from '@supabase/supabase-js';
import { describeDue, selectReminders } from './reminder-core.mjs';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL } = process.env;
const vars = { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL };
const missing = Object.entries(vars).filter(([,value]) => !value).map(([name]) => name);
if (missing.length) {
  console.error('Recordatorios NO enviados: faltan secretos en GitHub Actions: ' + missing.join(', '));
  process.exit(1);
}
const dateParts = new Intl.DateTimeFormat('es-CO', {
  timeZone:'America/Bogota', year:'numeric', month:'2-digit', day:'2-digit'
}).formatToParts(new Date());
const part = (key) => dateParts.find(p => p.type === key)?.value;
const today = [part('year'),part('month'),part('day')].join('-');
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  throw new Error('No se pudo calcular la fecha colombiana para los recordatorios.');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession:false, autoRefreshToken:false }
});
const money = (n) => new Intl.NumberFormat('es-CO', {
  style:'currency', currency:'COP', maximumFractionDigits:0
}).format(n);

let considered=0, delivered=0, skipped=0, failures=0;
for (let offset=0; ; offset+=100) {
  const { data: accounts, error: readError } = await supabase.from('finance_data')
    .select('user_id,payload').range(offset,offset+99);
  if (readError) throw new Error('Error de lectura de perfiles financieros en Supabase');
  if (!accounts?.length) break;
  for (const account of accounts) {
    const reminders = selectReminders(account.payload, today);
    if (!reminders.length) continue;
    considered++;
    const {data: authResult, error: userError} = await supabase.auth.admin.getUserById(account.user_id);
    const user = authResult?.user;
    if (userError || !user?.email || !user.email_confirmed_at) {
      skipped++;
      continue;
    }
    // Atomic daily claim: no duplicate email when the workflow is rerun.
    const {error: claimError} = await supabase.from('reminder_deliveries')
      .insert({user_id:account.user_id,send_date:today,status:'sending'});
    if (claimError?.code === '23505') { skipped++; continue; }
    if (claimError) { failures++; continue; }
    const subject = 'Pulso Finanzas: ' + reminders.length + ' pago(s) por revisar';
    const lines = [
      'Estos cobros están registrados como PENDIENTES en Pulso Finanzas.',
      'No se marcaron automáticamente como pagados.',
      '',
      ...reminders.map(r => {
        const term = r.installmentsTotal
          ? ' | Cuota ' + r.installmentNumber + '/' + r.installmentsTotal : '';
        return '- ' + r.title + ': ' + money(r.amount) + ' | ' + r.date
          + ' (' + describeDue(r.days) + ')' + term;
      }),
      '',
      'Revisa o corrige tus fechas en https://embm.github.io/pulso-finanzas/',
      'Para dejar de recibir correos, entra a Configuración > Recordatorios de pagos y desactívalos.'
    ];
    let sent=false;
    try {
      const response=await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers: {
          'Authorization':'Bearer '+RESEND_API_KEY,
          'Content-Type':'application/json',
          'Idempotency-Key':'pulso-'+account.user_id+'-'+today
        },
        body:JSON.stringify({
          from:RESEND_FROM_EMAIL,
          to:[user.email],
          subject,
          text:lines.join('\n')
        })
      });
      sent=response.ok;
      if (!sent) console.error('Resend devolvió HTTP '+response.status+' para un envío; revisar configuración del remitente.');
    } catch {
      console.error('Error de red al solicitar envío de correo a Resend.');
    }
    if (sent) {
      const {error:updateError}=await supabase.from('reminder_deliveries')
        .update({status:'sent',sent_at:new Date().toISOString()})
        .eq('user_id',account.user_id).eq('send_date',today);
      if (updateError) console.warn('Correo enviado pero no pudo actualizarse el estado de entrega en la tabla.');
      delivered++;
    } else {
      await supabase.from('reminder_deliveries').delete()
        .eq('user_id',account.user_id).eq('send_date',today).eq('status','sending');
      failures++;
    }
  }
  if (accounts.length<100) break;
}
console.log(JSON.stringify({date:today,accounts_with_due_bills:considered,emails_requested:delivered,skipped,failures}));
if (failures) process.exitCode=1;
