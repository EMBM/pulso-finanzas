import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createClient, type Session, type User } from '@supabase/supabase-js';
import { Cloud, CloudOff, KeyRound, Mail, Lock, LogOut, ShieldCheck, UserRound, RefreshCw, Download } from 'lucide-react';

export type FinanceData = {
  salary: number; goal: number; dark: boolean;
  categories: { id: string; name: string; color: string; budget: number }[];
  transactions: { id: string; date: string; type: 'expense' | 'income'; category: string; amount: number; title: string; note: string; recurringId?: string }[];
  fixed: { id: string; name: string; category: string; amount: number; day: number; active: boolean; start: string }[];
  plannedIncomes?: { id: string; title: string; amount: number; date: string; note: string; actualTransactionId?: string }[];
};
export type AccountInfo = {
  userId: string;
  email: string;
  syncStatus: 'guardando' | 'sincronizado' | 'error';
  syncError: string;
  onSyncNow: () => Promise<void>;
  onLogout: () => Promise<void>;
};

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';
export const hasCloudConfig = Boolean(url && publishableKey);
const client = hasCloudConfig ? createClient(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
}) : null;
const redirectTo = () => window.location.origin + import.meta.env.BASE_URL;

function readableError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(raw)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(raw)) return 'Confirma tu correo mediante el enlace recibido antes de entrar.';
  if (/already registered/i.test(raw)) return 'Este correo ya tiene una cuenta. Inicia sesión.';
  if (/password should be at least/i.test(raw)) return 'La contraseña es demasiado corta.';
  return raw;
}
function isFinanceData(data: unknown): data is FinanceData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<FinanceData>;
  return Array.isArray(d.categories) && Array.isArray(d.transactions) && Array.isArray(d.fixed) &&
    typeof d.salary === 'number' && typeof d.goal === 'number';
}
function meaningful(data: FinanceData): boolean {
  return data.salary !== 0 || data.goal !== 0 || data.transactions.length > 0 ||
    data.fixed.length > 0 || (data.plannedIncomes?.length ?? 0) > 0 ||
    data.categories.some(c => c.budget !== 0);
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) return;
    setError(''); setMessage(''); setBusy(true);
    try {
      if (mode === 'login') {
        const { error: e } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
      } else if (mode === 'register') {
        if (password.length < 10) throw new Error('Usa una contraseña de al menos 10 caracteres.');
        const { data, error: e } = await client.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: redirectTo(), data: { display_name: displayName.trim().slice(0, 60) } }
        });
        if (e) throw e;
        setMessage(data.session ? 'Cuenta creada. Ya puedes usar Pulso.' : 'Revisa tu correo y confirma la cuenta. Después podrás iniciar sesión.');
      } else {
        const { error: e } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo() });
        if (e) throw e;
        setMessage('Si existe una cuenta con ese correo, recibirás instrucciones para cambiar la contraseña.');
      }
    } catch (e) { setError(readableError(e)); }
    finally { setBusy(false); }
  };
  return <main className="auth-page"><section className="auth-card">
    <div className="auth-logo"><ShieldCheck size={25}/> <strong>Pulso Finanzas</strong></div>
    <h1>{mode === 'login' ? 'Bienvenido de nuevo' : mode === 'register' ? 'Crea tu cuenta' : 'Recupera el acceso'}</h1>
    <p className="muted">{mode === 'login' ? 'Accede con tu correo (usuario) y contraseña para consultar tus finanzas.' :
      mode === 'register' ? 'Tus movimientos se sincronizarán de forma privada entre tus dispositivos.' :
      'Te enviaremos un enlace de recuperación a tu correo.'}</p>
    <form className="auth-form" onSubmit={submit}>
      {mode === 'register' && <label>Nombre de usuario (visible)<div className="auth-input"><UserRound size={17}/><input maxLength={60} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Tu nombre"/></div></label>}
      <label>Correo electrónico (usuario)<div className="auth-input"><Mail size={17}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com"/></div></label>
      {mode !== 'forgot' && <label>Contraseña<div className="auth-input"><Lock size={17}/><input required type="password" autoComplete={mode === 'login' ? 'current-password':'new-password'} minLength={mode==='register'?10:1} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode === 'register' ? 'Mínimo 10 caracteres' : 'Tu contraseña'}/></div></label>}
      {error && <div className="auth-error" role="alert">{error}</div>}
      {message && <div className="auth-message" role="status">{message}</div>}
      <button className="primary auth-submit" disabled={busy}>{busy ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}</button>
    </form>
    <div className="auth-links">
      {mode !== 'login' && <button onClick={()=>{setMode('login');setError('');setMessage('')}}>Volver a iniciar sesión</button>}
      {mode === 'login' && <><button onClick={()=>{setMode('register');setError('');setMessage('')}}>Crear una cuenta</button><button onClick={()=>{setMode('forgot');setError('');setMessage('')}}>Olvidé mi contraseña</button></>}
    </div>
    <div className="auth-disclaimer"><ShieldCheck size={16}/> Datos protegidos por autenticación y políticas de acceso por usuario.</div>
  </section></main>;
}
function PasswordRecovery({ done }: { done: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) return;
    if (password.length < 10 || password !== confirm) { setError('Usa al menos 10 caracteres y verifica que ambas contraseñas coincidan.'); return; }
    setBusy(true); setError('');
    const { error: e } = await client.auth.updateUser({ password });
    setBusy(false);
    if (e) setError(readableError(e)); else done();
  };
  return <main className="auth-page"><section className="auth-card"><div className="auth-logo"><KeyRound/> Pulso Finanzas</div>
    <h1>Establecer contraseña nueva</h1><p className="muted">Elige una contraseña segura para tu cuenta.</p>
    <form className="auth-form" onSubmit={submit}>
      <label>Contraseña nueva<input type="password" required minLength={10} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <label>Confirmar contraseña<input type="password" required minLength={10} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
      {error && <div className="auth-error">{error}</div>}<button className="primary auth-submit" disabled={busy}>{busy?'Actualizando...':'Guardar nueva contraseña'}</button>
    </form>
  </section></main>;
}

type CloudProps = {
  blankData: FinanceData;
  readLocal: () => FinanceData;
  localKey: string;
  renderDashboard: (initialData: FinanceData, onChanged: (d: FinanceData) => void, account: AccountInfo) => ReactNode;
};
export function CloudAccount(props: CloudProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!client) return;
    let mounted = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      setSession(next);
      setReady(true);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    void client.auth.getSession().then(({ data }) => {
      if (mounted) { setSession(data.session); setReady(true); }
    }).catch(() => { if (mounted) setReady(true); });
    return () => { mounted=false; subscription.unsubscribe(); };
  }, []);
  if (!ready) return <main className="auth-page"><p className="muted">Comprobando sesión...</p></main>;
  if (recovery && session) return <PasswordRecovery done={()=>setRecovery(false)}/>;
  if (!session) return <AuthScreen/>;
  return <CloudFinance key={session.user.id} user={session.user} {...props}/>;
}

function CloudFinance({user,blankData,readLocal,localKey,renderDashboard}: CloudProps & {user:User}) {
  const [remote, setRemote] = useState<FinanceData|null>(null);
  const [migration, setMigration] = useState<FinanceData|null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [syncStatus,setSyncStatus] = useState<AccountInfo['syncStatus']>('sincronizado');
  const [syncError,setSyncError] = useState('');
  const pending = useRef<FinanceData|null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const writing = useRef(false);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current=false; if(timer.current) clearTimeout(timer.current); }; }, []);

  const loadCloud = useCallback(async () => {
    if (!client) return;
    setLoading(true);setLoadError('');
    const { data, error } = await client.from('finance_data').select('payload').eq('user_id',user.id).maybeSingle();
    if (!mounted.current) return;
    if (error) { setLoadError(readableError(error)); setLoading(false); return; }
    if (data?.payload) {
      if (!isFinanceData(data.payload)) { setLoadError('Los datos guardados en la nube no tienen el formato esperado. No se sobrescribirán.'); setLoading(false); return; }
      setRemote(data.payload);
    } else {
      const local=readLocal();
      if (isFinanceData(local)&&meaningful(local)) setMigration(local);
      else setRemote(blankData);
    }
    setLoading(false);
  }, [user.id, readLocal, blankData]);
  useEffect(()=>{void loadCloud()},[loadCloud]);

  const flush = useCallback(async () => {
    if (!client || writing.current || !pending.current) return;
    writing.current=true;
    while (pending.current) {
      const snapshot=pending.current;
      pending.current=null;
      const {error} = await client.from('finance_data').upsert({
        user_id:user.id,payload:snapshot,updated_at:new Date().toISOString()
      }, {onConflict:'user_id'});
      if(error){
        pending.current = pending.current || snapshot;
        if(mounted.current){setSyncStatus('error');setSyncError(readableError(error))}
        break;
      }
    }
    writing.current=false;
    if(mounted.current && !pending.current){setSyncStatus('sincronizado');setSyncError('');}
  },[user.id]);

  const changed = useCallback((d:FinanceData)=>{
    pending.current = d;
    setSyncStatus('guardando');setSyncError('');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(()=>{void flush()},650);
  },[flush]);
  const onSyncNow=useCallback(async()=>{
    if(timer.current) clearTimeout(timer.current);
    await flush();
  },[flush]);
  const onLogout=useCallback(async()=>{
    if(timer.current) clearTimeout(timer.current);
    await flush();
    // Esperar la petición en curso antes de cerrar la sesión (RLS necesita su JWT).
    while(writing.current) await new Promise<void>(resolve=>setTimeout(resolve,75));
    if(pending.current) await flush();
    while(writing.current) await new Promise<void>(resolve=>setTimeout(resolve,75));
    if(pending.current){
      setSyncStatus('error');
      setSyncError('No se pudieron sincronizar tus últimos cambios. Reintenta antes de cerrar sesión.');
      return;
    }
    await client?.auth.signOut();
  },[flush]);

  const importLocal=async()=>{
    if(!client||!migration) return;
    setLoading(true);setLoadError('');
    const {error}=await client.from('finance_data').upsert({
      user_id:user.id,payload:migration,updated_at:new Date().toISOString()
    }, {onConflict:'user_id'});
    if(error){setLoadError(readableError(error));setLoading(false);return;}
    localStorage.removeItem(localKey);
    setRemote(migration);setMigration(null);setLoading(false);
  };
  const useBlank=()=>{setMigration(null);setRemote(blankData);};
  const backupLocal=()=>{if(!migration)return;const b=new Blob([JSON.stringify(migration,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='pulso-respaldo-local.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
  if(loading) return <main className="auth-page"><p className="muted">Cargando tus finanzas de forma segura...</p></main>;
  if(loadError) return <main className="auth-page"><section className="auth-card"><CloudOff size={30}/><h1>No se pudo conectar</h1><p className="auth-error">{loadError}</p><p className="muted">Verifica que ejecutaste el SQL de supabase/schema.sql y que tu proyecto está activo. No se han sobrescrito tus datos.</p><div className="auth-links"><button onClick={()=>void loadCloud()}>Reintentar</button><button onClick={()=>void client?.auth.signOut()}>Cerrar sesión</button></div></section></main>;
  if(migration) return <main className="auth-page"><section className="auth-card migration"><div className="auth-logo"><Cloud size={25}/> Pulso Finanzas</div><h1>Encontramos tus datos locales</h1>
    <p>Hay movimientos o ajustes guardados en este navegador. ¿Quieres importarlos a tu cuenta <strong>{user.email}</strong>?</p>
    <p className="muted">Si importas, se guardarán en la nube y borraremos la copia local antigua de este navegador. Si empiezas vacío, la copia local quedará en el navegador y podrás respaldarla.</p>
    <button className="primary auth-submit" onClick={()=>void importLocal()}>Importar mis datos a la nube</button>
    <button className="ghost auth-submit" onClick={backupLocal}><Download size={17}/> Descargar respaldo antes de continuar</button>
    <button className="ghost auth-submit" onClick={useBlank}>Empezar con una cuenta vacía</button>
  </section></main>;
  if(!remote) return null;
  const info:AccountInfo={userId:user.id,email:user.email||'Cuenta',syncStatus,syncError,onSyncNow,onLogout};
  return <>{renderDashboard(remote,changed,info)}</>;
}
