import { useEffect, useMemo, useRef, useState } from 'react';
import { CloudAccount, hasCloudConfig, type AccountInfo } from './cloud';
import { actualDate, daysToDue, dueDescription, isPaid, isPending, type PaymentStatus } from './payments';
import type { FormEvent } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Wallet, LayoutDashboard, ReceiptText, ChartNoAxesCombined, Target, Repeat2, Settings, Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Download, Upload, Sun, Moon, CalendarClock, CheckCircle2, Bell, Clock3 } from 'lucide-react';

type Kind = 'expense'|'income';
type Transaction = {
 id:string;date:string;type:Kind;category:string;amount:number;title:string;note:string;
 recurringId?:string;status?:PaymentStatus;paidAt?:string;
 installmentNumber?:number;installmentsTotal?:number;remindDaysBefore?:number;
};
type Category = {id:string;name:string;color:string;budget:number};
type Fixed = {id:string;name:string;category:string;amount:number;day:number;active:boolean;start:string};
type PlannedIncome = {id:string;title:string;amount:number;date:string;note:string;actualTransactionId?:string};
type Data = {
 salary:number;goal:number;dark:boolean;categories:Category[];transactions:Transaction[];fixed:Fixed[];
 plannedIncomes?:PlannedIncome[];
 reminderSettings?:{emailEnabled:boolean;daysBefore:number};
};
type Tab = 'dashboard'|'transactions'|'planned'|'analytics'|'budgets'|'fixed'|'settings';
const initial:Data = {salary:0,goal:0,dark:false,transactions:[],fixed:[],plannedIncomes:[],reminderSettings:{emailEnabled:false,daysBefore:3},categories:[
{id:'hogar',name:'Hogar',color:'#8b82f6',budget:0},{id:'mercado',name:'Mercado',color:'#20ad9a',budget:0},
{id:'comida',name:'Comida',color:'#f6a249',budget:0},{id:'transporte',name:'Transporte',color:'#6ca8f4',budget:0},
{id:'ocio',name:'Ocio',color:'#ee7eae',budget:0},{id:'salud',name:'Salud y gimnasio',color:'#63c599',budget:0},
{id:'servicios',name:'Servicios',color:'#bd98eb',budget:0},{id:'otros',name:'Otros',color:'#9aa9c1',budget:0}]};
const key='pulso-finanzas-v2';
const today=()=>new Date().toLocaleDateString('en-CA');
const monthNow=()=>today().slice(0,7);
const money=(n:number)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
const n=(x:unknown)=>Math.max(0,Math.round(Number(x)||0));
const id=()=>crypto.randomUUID();
const moveMonth=(month:string,offset:number)=>{const [y,m]=month.split('-').map(Number);const d=new Date(y,m-1+offset,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const friendlyMonth=(m:string)=>new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric'}).format(new Date(m+'-01T12:00:00'));
const load=():Data=>{try{const d=JSON.parse(localStorage.getItem(key)||'null');return d&&Array.isArray(d.transactions)&&Array.isArray(d.categories)&&Array.isArray(d.fixed)?d:initial}catch{return initial}};
const tabs:{id:Tab;label:string;icon:typeof Wallet}[]=[
{id:'dashboard',label:'Resumen',icon:LayoutDashboard},{id:'transactions',label:'Movimientos',icon:ReceiptText},
{id:'planned',label:'Ingresos previstos',icon:CalendarClock},
{id:'analytics',label:'Analítica',icon:ChartNoAxesCombined},{id:'budgets',label:'Presupuestos',icon:Target},
{id:'fixed',label:'Gastos fijos',icon:Repeat2},{id:'settings',label:'Configuración',icon:Settings}];
function download(name:string,text:string,mime:string){const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),300);}
const Stat=({title,value,desc}:{title:string;value:number;desc:string})=><div className="card stat"><span className="muted">{title}</span><strong>{money(value)}</strong><small className="muted">{desc}</small></div>;
export default function App(){
 if(hasCloudConfig) return <CloudAccount blankData={initial} readLocal={load} localKey={key}
   renderDashboard={(cloudData, onChanged, account) =>
     <FinanceDashboard initialData={cloudData} persistData={onChanged} account={account}/>}/>;
 return <FinanceDashboard/>;
}
function FinanceDashboard({initialData,persistData,account}: {
 initialData?:Data;
 persistData?:(d:Data)=>void;
 account?:AccountInfo;
}){
 const [data,setData]=useState<Data>(()=>initialData??load());
 const initialized=useRef(false);
 const [tab,setTab]=useState<Tab>('dashboard');
 const [month,setMonth]=useState(monthNow());
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<'all'|Kind>('all');
 const [edit,setEdit]=useState<string|null>(null);
 const [modal,setModal]=useState(false);
 const [kind,setKind]=useState<Kind>('expense');
 const [title,setTitle]=useState('');
 const [amount,setAmount]=useState('');
 const [date,setDate]=useState(today());
 const [category,setCategory]=useState('hogar');
 const [note,setNote]=useState('');
 const [txStatus,setTxStatus]=useState<PaymentStatus>('pending');
 const [txInstallmentNumber,setTxInstallmentNumber]=useState('1');
 const [txInstallmentsTotal,setTxInstallmentsTotal]=useState('');

 const [fixedEdit,setFixedEdit]=useState<string|null>(null);
 const [fixedOpen,setFixedOpen]=useState(false);
 const [fixedName,setFixedName]=useState('');
 const [fixedAmount,setFixedAmount]=useState('');
 const [fixedDay,setFixedDay]=useState(1);
 const [fixedCategory,setFixedCategory]=useState('hogar');
 const [forecastOpen,setForecastOpen]=useState(false);
 const [forecastEdit,setForecastEdit]=useState<string|null>(null);
 const [forecastTitle,setForecastTitle]=useState('');
 const [forecastAmount,setForecastAmount]=useState('');
 const [forecastDate,setForecastDate]=useState('2026-12-20');
 const [forecastNote,setForecastNote]=useState('');
 useEffect(()=>{
   if(!initialized.current){initialized.current=true;return;}
   if(persistData) persistData(data);
   else localStorage.setItem(key,JSON.stringify(data));
 },[data,persistData]);
 useEffect(()=>{document.documentElement.dataset.theme=data.dark?'dark':'light'},[data.dark]);
 const rows=useMemo(()=>data.transactions.filter(t=>t.date.startsWith(month)),[data.transactions,month]);
 const paidRows=useMemo(()=>data.transactions.filter(t=>isPaid(t)&&actualDate(t).startsWith(month)),[data.transactions,month]);
 const income=data.salary+paidRows.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
 const spent=paidRows.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
 const pending=rows.filter(t=>t.type==='expense'&&isPending(t)).reduce((s,t)=>s+t.amount,0);
 const outstandingCount=rows.filter(t=>t.type==='expense'&&isPending(t)).length;
 const balance=income-spent;
 const balanceAfterBills=balance-pending;
 const forecastMonth=(data.plannedIncomes??[]).filter(p=>p.date.slice(0,7)===month).sort((a,b)=>a.date.localeCompare(b.date));
 const receivedForecast=(p:PlannedIncome)=>Boolean(p.actualTransactionId&&data.transactions.some(t=>t.id===p.actualTransactionId));
 const pendingForecast=forecastMonth.filter(p=>!receivedForecast(p));
 const pendingForecastSum=pendingForecast.reduce((sum,p)=>sum+p.amount,0);
 const grouped=data.categories.map(c=>({...c,spent:paidRows.filter(t=>t.type==='expense'&&t.category===c.id).reduce((a,t)=>a+t.amount,0)}));
 const groupedSpent=grouped.filter(g=>g.spent>0);
 const byDate=Array.from({length:new Date(+month.slice(0,4),+month.slice(5),0).getDate()},(_,i)=>{const d=month+'-'+String(i+1).padStart(2,'0');return {day:String(i+1),value:paidRows.filter(t=>t.type==='expense'&&actualDate(t)===d).reduce((s,t)=>s+t.amount,0)}});
 const weekly=Array.from({length:5},(_,i)=>({day:'S'+(i+1),value:byDate.slice(i*7,i*7+7).reduce((s,r)=>s+r.value,0)}));
 const yearly=Array.from({length:12},(_,i)=>{const mo=moveMonth(month,i-11);return {day:mo.slice(2),value:data.transactions.filter(t=>t.type==='expense'&&isPaid(t)&&actualDate(t).startsWith(mo)).reduce((s,t)=>s+t.amount,0)}});
 const [period,setPeriod]=useState<'daily'|'weekly'|'monthly'>('daily');
 const chartData=period==='daily'?byDate:period==='weekly'?weekly:yearly;
 const txFiltered=rows.filter(t=>(filter==='all'||t.type===filter)&&(t.title+' '+t.note).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
 const categoryName=(c:string)=>data.categories.find(x=>x.id===c)?.name||'Otros';
 const startTx=(t?:Transaction)=>{
  setEdit(t?.id||null);setKind(t?.type||'expense');setTitle(t?.title||'');setAmount(t?String(t.amount):'');
  setDate(t?.date|| (month===monthNow()?today():month+'-01'));
  setCategory(t?.category||data.categories[0]?.id||'otros');setNote(t?.note||'');
  setTxStatus(t?(isPending(t)?'pending':'paid'):'pending');
  setTxInstallmentNumber(String(t?.installmentNumber||1));setTxInstallmentsTotal(t?.installmentsTotal?String(t.installmentsTotal):'');
  setModal(true);
 };
 const saveTx=(e:FormEvent)=>{
  e.preventDefault();if(!title.trim()||n(amount)<=0)return;
  const previous=data.transactions.find(t=>t.id===edit);
  const status:PaymentStatus=kind==='income'?'paid':txStatus;
  const total=txInstallmentsTotal?n(txInstallmentsTotal):0;
  const current=total?Math.max(1,n(txInstallmentNumber)):0;
  if(total>120||current>total){alert('El número de cuota debe estar entre 1 y el total (máximo 120).');return;}
  const t:Transaction={
    id:edit||id(),title:title.trim(),amount:n(amount),date,type:kind,category,note,status,
    ...(status==='paid'?{paidAt:previous?.paidAt||today()}:{ }),
    ...(previous?.recurringId?{recurringId:previous.recurringId}:{}),
    ...(total?{installmentNumber:current,installmentsTotal:total}:{}),
  };
  setData(d=>({...d,transactions:[...d.transactions.filter(x=>x.id!==edit),t]}));setModal(false);
 };
 const markPaid=(txid:string)=>{
  const found=data.transactions.find(t=>t.id===txid);
  if(!found||isPaid(found))return;
  if(!confirm('¿Confirmas que YA PAGASTE '+money(found.amount)+' por '+found.title+'?'))return;
  setData(d=>({...d,transactions:d.transactions.map(t=>t.id===txid?{...t,status:'paid',paidAt:today()}:t)}));
 };
 const markPending=(txid:string)=>{
  if(!confirm('¿Volver a dejar este movimiento como pendiente?'))return;
  setData(d=>({...d,transactions:d.transactions.map(t=>t.id===txid?{...t,status:'pending',paidAt:undefined}:t)}));
 };
 const removeTx=(txid:string)=>{if(confirm('¿Eliminar este movimiento?'))setData(d=>({...d,transactions:d.transactions.filter(t=>t.id!==txid)}))};
 const startFixed=(f?:Fixed)=>{setFixedEdit(f?.id||null);setFixedName(f?.name||'');setFixedAmount(f?String(f.amount):'');setFixedDay(f?.day||1);setFixedCategory(f?.category||data.categories[0]?.id||'otros');setFixedOpen(true)};
 const saveFixed=(e:FormEvent)=>{e.preventDefault();if(!fixedName.trim()||n(fixedAmount)<=0)return;const old=data.fixed.find(f=>f.id===fixedEdit);const f:Fixed={id:fixedEdit||id(),name:fixedName.trim(),amount:n(fixedAmount),day:Math.min(31,Math.max(1,Math.round(fixedDay))),category:fixedCategory,active:old?.active??true,start:old?.start||month};setData(d=>({...d,fixed:[...d.fixed.filter(x=>x.id!==fixedEdit),f]}));setFixedOpen(false)};
 const markFixed=(f:Fixed)=>{
  if(data.transactions.some(t=>t.recurringId===f.id&&t.date.startsWith(month)))return;
  const max=new Date(+month.slice(0,4),+month.slice(5),0).getDate();
  setData(d=>({...d,transactions:[...d.transactions,{
    id:id(),date:month+'-'+String(Math.min(f.day,max)).padStart(2,'0'),
    type:'expense',category:f.category,amount:f.amount,title:f.name,note:'Gasto fijo',
    recurringId:f.id,status:'pending'
  }]}));
};
 const startForecast=(p?:PlannedIncome)=>{
   setForecastEdit(p?.id??null);
   setForecastTitle(p?.title??'');
   setForecastAmount(p?String(p.amount):'');
   setForecastDate(p?.date??(month===monthNow()?today():month+'-20'));
   setForecastNote(p?.note??'');
   setForecastOpen(true);
 };
 const saveForecast=(event:FormEvent)=>{
   event.preventDefault();
   if(!forecastTitle.trim()||n(forecastAmount)<1||!/^\\d{4}-\\d{2}-\\d{2}$/.test(forecastDate))return;
   const current=(data.plannedIncomes??[]).find(x=>x.id===forecastEdit);
   const planned:PlannedIncome={id:forecastEdit??id(),title:forecastTitle.trim(),amount:n(forecastAmount),date:forecastDate,note:forecastNote,...(current?.actualTransactionId?{actualTransactionId:current.actualTransactionId}:{})};
   setData(d=>({...d,plannedIncomes:[...(d.plannedIncomes??[]).filter(x=>x.id!==forecastEdit),planned]}));
   setForecastOpen(false);
 };
 const removeForecast=(idToRemove:string)=>{
   if(!confirm('¿Eliminar esta previsión? Si ya fue recibida, el movimiento real se conservará.'))return;
   setData(d=>({...d,plannedIncomes:(d.plannedIncomes??[]).filter(x=>x.id!==idToRemove)}));
 };
 const confirmForecast=(p:PlannedIncome)=>{
   if(receivedForecast(p))return;
   const entered=prompt('¿Cuánto dinero recibiste realmente (COP)?',String(p.amount));
   if(entered===null)return;
   const receivedAmount=n(entered);
   if(receivedAmount<1){alert('Escribe un valor superior a cero.');return;}
   if(!confirm('¿Confirmar el ingreso de '+money(receivedAmount)+'? Se registrará como movimiento REAL con fecha de hoy, no antes.'))return;
   setData(d=>{
     const found=(d.plannedIncomes??[]).find(x=>x.id===p.id);
     if(!found|| (found.actualTransactionId&&d.transactions.some(t=>t.id===found.actualTransactionId)))return d;
     const actualId=id();
     const tx:Transaction={id:actualId,date:today(),paidAt:today(),status:'paid',type:'income',category:'otros',amount:receivedAmount,title:found.title,note:found.note||'Confirmación de ingreso previsto'};
     return {...d,transactions:[...d.transactions,tx],plannedIncomes:(d.plannedIncomes??[]).map(x=>x.id===p.id?{...x,actualTransactionId:actualId}:x)};
   });
 };
 const csv=()=>{const escape=(s:unknown)=>{const value=String(s??'');const v=/^[=+@\-]/.test(value)?"'"+value:value;return '"'+v.replaceAll('"','""')+'"'};const lines=[['Fecha prevista','Tipo','Descripción','Categoría','Monto COP','Nota','Estado','Fecha de pago','Cuota actual','Total cuotas'],...data.transactions.map(t=>[t.date,t.type==='expense'?'Gasto':'Ingreso',t.title,categoryName(t.category),t.amount,t.note,isPending(t)?'Pendiente':'Pagado',isPending(t)?'':actualDate(t),t.installmentNumber??'',t.installmentsTotal??''])];download('pulso-movimientos.csv','\uFEFF'+lines.map(r=>r.map(escape).join(',')).join('\r\n'),'text/csv;charset=utf-8')};
 const importJSON=async(file?:File)=>{if(!file)return;try{const x=JSON.parse(await file.text()) as Data;if(!Array.isArray(x.transactions)||!Array.isArray(x.categories)||!Array.isArray(x.fixed)||!confirm('¿Reemplazar tus datos actuales con este respaldo?'))return;setData(x);alert('Respaldo importado')}catch{alert('Archivo JSON inválido')}};
 return <div className="shell"><aside className="sidebar"><div className="brand"><div className="brand-icon"><Wallet size={24}/></div><div><strong>Pulso</strong><small>Finanzas personales</small></div></div><nav>{tabs.map(x=><button key={x.id} className={tab===x.id?'nav active':'nav'} onClick={()=>setTab(x.id)}><x.icon size={19}/>{x.label}</button>)}</nav><div className="sidebar-foot">Organiza tu dinero, a tu ritmo.<br/>COP · Colombia</div></aside>
 <main className="content"><header className="top"><div><span className="eyebrow">TU DINERO, BAJO CONTROL</span><h1>{tabs.find(t=>t.id===tab)?.label}</h1></div><div className="top-actions"><button className="icon-button" aria-label="Cambiar tema" onClick={()=>setData(d=>({...d,dark:!d.dark}))}>{data.dark?<Sun size={19}/>:<Moon size={19}/>}</button><button className="primary" onClick={()=>startTx()}><Plus size={18}/> Nuevo movimiento</button></div></header>
 {account?<div className="account-bar">
   <div className="account-identity"><span className="account-dot">●</span><span><strong>Cuenta protegida</strong><small>{account.email}</small></span></div>
   <div className="account-actions">
    <span className={'sync-badge '+account.syncStatus} aria-live="polite">
      {account.syncStatus==='sincronizado'?'✓ Sincronizado':account.syncStatus==='guardando'?'↻ Guardando...':'⚠ Error de sincronización'}
    </span>
    {account.syncStatus==='error'&&<span className="sync-error" title={account.syncError}>{account.syncError}</span>}
    <button className="ghost small" onClick={()=>void account.onSyncNow()}>Sincronizar</button>
    <button className="ghost small" onClick={()=>void account.onLogout()}>Cerrar sesión</button>
   </div>
 </div>:<div className="local-alert" role="status"><strong>Modo local — sin inicio de sesión.</strong> Tus datos solo están en este navegador y no están protegidos por una cuenta. Para activar acceso privado y sincronización, configura Supabase según el README.</div>}
 <section className="monthbar"><button aria-label="Mes anterior" className="icon-button" onClick={()=>setMonth(moveMonth(month,-1))}><ChevronLeft/></button><strong>{friendlyMonth(month)}</strong><button aria-label="Mes siguiente" className="icon-button" onClick={()=>setMonth(moveMonth(month,1))}><ChevronRight/></button><button className="ghost" onClick={()=>setMonth(monthNow())}>Este mes</button></section>
 {tab==='dashboard'&&<><div className="stats"><Stat title="Ingresos estimados" value={income} desc="Salario + ingresos extra"/><Stat title="Gastos registrados" value={spent} desc={rows.filter(t=>t.type==='expense').length+' movimientos'}/><Stat title="Saldo proyectado" value={balance} desc="Ingresos menos gastos"/><Stat title="Meta de ahorro" value={data.goal} desc={balance>=data.goal?'Meta cubierta con el saldo actual':'Aún por alcanzar'}/></div>
 <div className="forecast-teaser">
  <div><span className="muted">Ingresos previstos pendientes este mes</span><strong>{money(pendingForecastSum)}</strong><small className="muted">No incluidos en el saldo · Saldo potencial: {money(balance+pendingForecastSum)}</small></div>
  <button className="ghost" onClick={()=>setTab('planned')}>Administrar previsiones</button>
 </div>
 <div className="columns"><div className="card"><div className="card-head"><h2>Tendencia de gastos</h2><button className="link" onClick={()=>setTab('analytics')}>Ver analítica</button></div><Chart data={byDate}/></div><div className="card"><h2>Distribución por categoría</h2><Donut data={groupedSpent}/></div></div><div className="card"><div className="card-head"><h2>Últimos movimientos</h2><button className="link" onClick={()=>setTab('transactions')}>Ver todos</button></div><Transactions rows={txFiltered.slice(0,6)} categoryName={categoryName} startTx={startTx} removeTx={removeTx}/></div></>}
 {tab==='planned'&&<div className="card">
  <div className="card-head wrap"><div><h2>Ingresos previstos de {friendlyMonth(month)}</h2><p className="muted">Registra primas, bonificaciones y pagos que todavía no has recibido.</p></div>
   <button className="primary" onClick={()=>startForecast()}><Plus size={16}/> Añadir previsión</button>
  </div>
  <div className="forecast-summary">
   <div><span className="muted">Pendiente por recibir</span><strong>{money(pendingForecastSum)}</strong></div>
   <div><span className="muted">Saldo actual estimado</span><strong>{money(balance)}</strong></div>
   <div><span className="muted">Saldo si se recibe todo</span><strong>{money(balance+pendingForecastSum)}</strong></div>
  </div>
  <p className="forecast-note">Los ingresos pendientes <strong>no se suman a tu saldo</strong> ni a tus ingresos registrados. Solo se incorporan cuando confirmas que recibiste el dinero.</p>
  {forecastMonth.length===0?<p className="empty">Aún no tienes ingresos previstos en este mes.</p>:
   <div className="list">{forecastMonth.map(p=>{const received=receivedForecast(p);return <div className="transaction" key={p.id}>
     <div className="avatar"><CalendarClock size={19}/></div>
     <div className="transaction-info"><strong>{p.title}</strong><small>{p.date} · {received?'Recibido y registrado':'Pendiente'}{p.note?' · '+p.note:''}</small></div>
     <strong>{money(p.amount)}</strong>
     <div className="row-buttons">
       {received?<span className="forecast-received"><CheckCircle2 size={15}/> Recibido</span>:<button className="ghost small" onClick={()=>confirmForecast(p)}>Confirmar recibido</button>}
       <button className="icon-button" aria-label={'Editar '+p.title} onClick={()=>startForecast(p)}><Pencil size={15}/></button>
       <button className="icon-button" aria-label={'Eliminar '+p.title} onClick={()=>removeForecast(p.id)}><Trash2 size={15}/></button>
     </div>
   </div>})}</div>}
 </div>}
 {tab==='transactions'&&<div className="card"><div className="card-head wrap"><h2>Movimientos del mes</h2><div className="filters"><input placeholder="Buscar movimientos..." aria-label="Buscar" value={query} onChange={e=>setQuery(e.target.value)}/><select value={filter} aria-label="Filtrar tipo" onChange={e=>setFilter(e.target.value as 'all'|Kind)}><option value="all">Todos</option><option value="expense">Gastos</option><option value="income">Ingresos</option></select><button className="ghost" onClick={csv}><Download size={16}/> CSV</button></div></div><Transactions rows={txFiltered} categoryName={categoryName} startTx={startTx} removeTx={removeTx}/></div>}
 {tab==='analytics'&&<><div className="stats"><Stat title="Ingresos" value={income} desc="Este periodo"/><Stat title="Gastos" value={spent} desc="Este periodo"/><Stat title="Balance" value={balance} desc="Disponible estimado"/></div><div className="columns"><div className="card"><div className="card-head wrap"><h2>Evolución de tus gastos</h2><div className="segmented">{([['daily','Días'],['weekly','Semanas'],['monthly','Meses']] as const).map(([p,label])=><button key={p} className={period===p?'selected':''} onClick={()=>setPeriod(p)}>{label}</button>)}</div></div><Chart data={chartData}/></div><div className="card"><h2>Por categoría</h2><Donut data={groupedSpent}/></div></div><div className="card"><h2>Detalle de categorías</h2>{grouped.map(g=><div className="budget-row" key={g.id}><div className="budget-top"><strong><i className="dot" style={{background:g.color}}/>{g.name}</strong><span>{money(g.spent)}</span></div><div className="track"><div style={{width:spent?Math.min(100,g.spent/spent*100)+'%':'0%',background:g.color}}/></div></div>)}</div></>}
 {tab==='budgets'&&<div className="card"><div className="card-head"><h2>Presupuestos personalizados</h2><span className="muted">Edita el límite mensual de cada categoría</span></div>{grouped.map(g=><div className="budget-row" key={g.id}><div className="budget-top"><strong><i className="dot" style={{background:g.color}}/>{g.name}</strong><span>{money(g.spent)} / {money(g.budget)}</span></div><div className="budget-bottom"><div className="track"><div style={{width:g.budget?Math.min(100,g.spent/g.budget*100)+'%':'0%',background:g.budget>0&&g.spent>g.budget?'#e76b82':g.color}}/></div><label>Límite COP <input type="number" min="0" value={g.budget} onChange={e=>setData(d=>({...d,categories:d.categories.map(c=>c.id===g.id?{...c,budget:n(e.target.value)}:c)}))}/></label></div>{g.budget>0&&g.spent>g.budget&&<small className="danger">Presupuesto superado en {money(g.spent-g.budget)}</small>}</div>)}<button className="ghost" onClick={()=>{const name=prompt('Nombre de la nueva categoría');if(name?.trim())setData(d=>({...d,categories:[...d.categories,{id:id(),name:name.trim().slice(0,40),color:'#8b82f6',budget:0}]}))}}><Plus size={16}/> Nueva categoría</button></div>}
 {tab==='fixed'&&<div className="card"><div className="card-head"><div><h2>Gastos fijos mensuales</h2><p className="muted">Registra pagos sin duplicarlos</p></div><button className="primary" onClick={()=>startFixed()}><Plus size={16}/> Crear gasto fijo</button></div>{data.fixed.length===0?<p className="empty">Aún no tienes gastos recurrentes. Agrega arriendo, servicios, gimnasio u otros.</p>:<div className="list">{data.fixed.map(f=>{const paid=data.transactions.some(t=>t.recurringId===f.id&&t.date.startsWith(month));return <div className="transaction" key={f.id}><div className="avatar">🔁</div><div className="transaction-info"><strong>{f.name}</strong><small>{categoryName(f.category)} · Día {f.day} · {f.active?'Activo':'Pausado'}</small></div><strong>{money(f.amount)}</strong><div className="row-buttons"><button className="ghost small" disabled={!f.active||paid||f.start>month} onClick={()=>markFixed(f)}>{paid?'Pagado':'Registrar pago'}</button><button className="icon-button" title="Editar" onClick={()=>startFixed(f)}><Pencil size={15}/></button><button className="icon-button" title="Pausar o activar" onClick={()=>setData(d=>({...d,fixed:d.fixed.map(x=>x.id===f.id?{...x,active:!x.active}:x)}))}>{f.active?'⏸':'▶'}</button><button className="icon-button" title="Eliminar" onClick={()=>{if(confirm('¿Eliminar el gasto fijo?'))setData(d=>({...d,fixed:d.fixed.filter(x=>x.id!==f.id)}))}}><Trash2 size={15}/></button></div></div>})}</div>}</div>}
 {tab==='settings'&&<div className="columns settings-grid"><div className="card"><h2>Ingresos y ahorro</h2><label className="field">Salario mensual (COP)<input type="number" min="0" value={data.salary} onChange={e=>setData(d=>({...d,salary:n(e.target.value)}))}/></label><label className="field">Meta de ahorro mensual (COP)<input type="number" min="0" value={data.goal} onChange={e=>setData(d=>({...d,goal:n(e.target.value)}))}/></label><p className="muted">Tu salario se usa como ingreso estimado cada mes. Los ingresos adicionales se registran como movimientos.</p></div><div className="card"><h2>Respaldo y privacidad</h2><p className="muted">Esta versión guarda tus datos en este navegador. No cambies de dispositivo sin exportar un respaldo.</p><div className="stack"><button className="ghost" onClick={()=>download('pulso-respaldo.json',JSON.stringify(data,null,2),'application/json')}><Download size={17}/> Exportar JSON</button><button className="ghost" onClick={csv}><Download size={17}/> Exportar CSV</button><label className="ghost upload"><Upload size={17}/> Importar JSON<input type="file" accept=".json,application/json" onChange={e=>{void importJSON(e.target.files?.[0]);e.target.value=''}}/></label></div></div><div className="card"><h2>Personalización</h2><label className="toggle"><input type="checkbox" checked={data.dark} onChange={e=>setData(d=>({...d,dark:e.target.checked}))}/> Modo oscuro</label><p className="muted">Moneda: peso colombiano (COP).</p></div></div>}
 </main><div className="mobile-nav">{tabs.map(t=><button aria-label={t.label} className={tab===t.id?'active':''} key={t.id} onClick={()=>setTab(t.id)}><t.icon size={19}/><span>{t.label}</span></button>)}</div>
 {modal&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><div className="dialog"><div className="card-head"><h2>{edit?'Editar movimiento':'Nuevo movimiento'}</h2><button className="icon-button" onClick={()=>setModal(false)}>✕</button></div><form onSubmit={saveTx} className="form"><div className="segmented"><button type="button" className={kind==='expense'?'selected':''} onClick={()=>setKind('expense')}>Gasto</button><button type="button" className={kind==='income'?'selected':''} onClick={()=>setKind('income')}>Ingreso extra</button></div><label>Descripción<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. Mercado, almuerzo..."/></label><label>Valor COP<input required type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Fecha<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Categoría<select value={category} onChange={e=>setCategory(e.target.value)}>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Nota (opcional)<input maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label><div className="form-actions"><button className="ghost" type="button" onClick={()=>setModal(false)}>Cancelar</button><button className="primary" type="submit">Guardar movimiento</button></div></form></div></div>}
 {forecastOpen&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setForecastOpen(false)}}>
  <div className="dialog"><div className="card-head"><h2>{forecastEdit?'Editar ingreso previsto':'Nuevo ingreso previsto'}</h2><button className="icon-button" onClick={()=>setForecastOpen(false)}>✕</button></div>
   <form className="form" onSubmit={saveForecast}>
    <label>Concepto<input required maxLength={120} value={forecastTitle} onChange={e=>setForecastTitle(e.target.value)} placeholder="Ej. Prima de diciembre"/></label>
    <label>Valor esperado o mínimo (COP)<input required type="number" min="1" value={forecastAmount} onChange={e=>setForecastAmount(e.target.value)}/></label>
    <label>Fecha estimada<input required type="date" value={forecastDate} onChange={e=>setForecastDate(e.target.value)}/></label>
    <label>Nota (opcional)<input maxLength={250} value={forecastNote} onChange={e=>setForecastNote(e.target.value)}/></label>
    <p className="muted">Este dinero todavía no cuenta como ingreso recibido. Podrás registrar el importe real cuando lo recibas.</p>
    <div className="form-actions"><button className="ghost" type="button" onClick={()=>setForecastOpen(false)}>Cancelar</button><button className="primary" type="submit">Guardar previsión</button></div>
   </form>
  </div>
 </div>}
 {fixedOpen&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setFixedOpen(false)}}><div className="dialog"><div className="card-head"><h2>{fixedEdit?'Editar gasto fijo':'Nuevo gasto fijo'}</h2><button className="icon-button" onClick={()=>setFixedOpen(false)}>✕</button></div><form className="form" onSubmit={saveFixed}><label>Descripción<input required value={fixedName} maxLength={120} onChange={e=>setFixedName(e.target.value)}/></label><label>Monto COP<input type="number" required min="1" value={fixedAmount} onChange={e=>setFixedAmount(e.target.value)}/></label><label>Día del mes<input type="number" min="1" max="31" value={fixedDay} onChange={e=>setFixedDay(Number(e.target.value))}/></label><label>Categoría<select value={fixedCategory} onChange={e=>setFixedCategory(e.target.value)}>{data.categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><div className="form-actions"><button type="button" className="ghost" onClick={()=>setFixedOpen(false)}>Cancelar</button><button type="submit" className="primary">Guardar</button></div></form></div></div>}
 </div>
}
function Chart({data}:{data:{day:string;value:number}[]}){return <div className="chart">{data.every(x=>!x.value)?<p className="empty">Registra tus primeros gastos para ver la tendencia.</p>:<ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:12,right:12,left:0,bottom:0}}><defs><linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8477f1" stopOpacity={.32}/><stop offset="100%" stopColor="#8477f1" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#b6bdcc" opacity={.3}/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#8f99ac'}} interval="preserveStartEnd"/><YAxis width={45} tickLine={false} axisLine={false} tick={{fontSize:10,fill:'#8f99ac'}} tickFormatter={v=>v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?Math.round(v/1000)+'k':String(v)}/><Tooltip formatter={v=>money(Number(v))}/><Area dataKey="value" stroke="#8477f1" strokeWidth={3} fill="url(#gradient)" type="monotone"/></AreaChart></ResponsiveContainer>}</div>}
function Donut({data}:{data:{id:string;name:string;color:string;spent:number}[]}){return data.length===0?<p className="empty">Aquí verás tus gastos por categoría.</p>:<><div className="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="spent" nameKey="name" innerRadius={65} outerRadius={88} stroke="none" paddingAngle={2}>{data.map(d=><Cell fill={d.color} key={d.id}/>)}</Pie><Tooltip formatter={v=>money(Number(v))}/></PieChart></ResponsiveContainer></div><div className="legend">{data.map(d=><div key={d.id}><span><i className="dot" style={{background:d.color}}/>{d.name}</span><strong>{money(d.spent)}</strong></div>)}</div></>}
function Transactions({rows,categoryName,startTx,removeTx}:{rows:Transaction[];categoryName:(x:string)=>string;startTx:(x:Transaction)=>void;removeTx:(x:string)=>void}){return rows.length===0?<p className="empty">Todavía no hay movimientos para mostrar.</p>:<div className="list">{rows.map(t=><div className="transaction" key={t.id}><div className="avatar">{t.type==='income'?'↗':'↙'}</div><div className="transaction-info"><strong>{t.title}</strong><small>{t.date} · {t.type==='income'?'Ingreso':categoryName(t.category)}{t.recurringId?' · Fijo':''}</small></div><strong className={t.type==='income'?'positive':'negative'}>{t.type==='income'?'+':'−'}{money(t.amount)}</strong><div className="row-buttons"><button className="icon-button" title="Editar" onClick={()=>startTx(t)}><Pencil size={16}/></button><button className="icon-button" title="Eliminar" onClick={()=>removeTx(t.id)}><Trash2 size={16}/></button></div></div>)}</div>}
