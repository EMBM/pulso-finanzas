import test from 'node:test';
import assert from 'node:assert/strict';
import {dateDiffDays, selectReminders, describeDue} from '../scripts/reminder-core.mjs';
const bill={id:'a',type:'expense',status:'pending',title:'Tarjeta Nu',amount:442128,date:'2026-12-01'};
test('future due dates use Colombia calendar days, not browser timezone',()=>{
 assert.equal(dateDiffDays('2026-12-01','2026-11-28'),3);
 assert.equal(dateDiffDays('2026-11-30','2026-12-01'),-1);
 assert.equal(describeDue(0),'vence HOY');
});
test('opt-in is mandatory and paid transactions never generate emails',()=>{
 assert.deepEqual(selectReminders({transactions:[bill]},'2026-11-28'),[]);
 assert.deepEqual(selectReminders({reminderSettings:{emailEnabled:true,daysBefore:3},transactions:[{...bill,status:'paid'}]},'2026-11-28'),[]);
});
test('alerts 3 days before, 1 day before, on date and one day late',()=>{
 const payload={reminderSettings:{emailEnabled:true,daysBefore:3},transactions:[bill]};
 assert.equal(selectReminders(payload,'2026-11-28').length,1);
 assert.equal(selectReminders(payload,'2026-11-29').length,0);
 assert.equal(selectReminders(payload,'2026-11-30').length,1);
 assert.equal(selectReminders(payload,'2026-12-01').length,1);
 assert.equal(selectReminders(payload,'2026-12-02').length,1);
 assert.equal(selectReminders(payload,'2026-12-03').length,0);
});
test('invalid, income and no due date never generates reminder',()=>{
 const payload={reminderSettings:{emailEnabled:true,daysBefore:1},transactions:[
  {...bill,type:'income'}, {...bill,date:'not-a-date'},{...bill,amount:0}]};
 assert.deepEqual(selectReminders(payload,'2026-11-30'),[]);
});
