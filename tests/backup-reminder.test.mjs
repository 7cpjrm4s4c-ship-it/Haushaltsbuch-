import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [storeSource,managerSource,modulesSource]=await Promise.all(['js/backup-store.js','js/backup-manager.js','css/modules.css'].map(read));
const values=new Map(),localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};
const context={S:{},Object,Array,Set,Map,String,Number,Date,JSON,localStorage};context.globalThis=context;vm.createContext(context);vm.runInContext(storeSource,context,{filename:'js/backup-store.js'});

assert.equal(context.BackupStore.isReminderEnabled(),true,'Backup-Erinnerungen müssen standardmäßig aktiv sein');
assert.equal(context.BackupStore.setReminderEnabled(false),false);
assert.equal(context.BackupStore.isReminderEnabled(),false,'Opt-out muss dauerhaft in den Backup-Metadaten gespeichert werden');
assert.equal(JSON.parse(values.get('hp5_backup_meta')).reminderEnabled,false);
assert.equal(context.BackupStore.setReminderEnabled(true),true);
assert.equal(context.BackupStore.isReminderEnabled(),true,'Nutzer müssen Erinnerungen wieder aktivieren können');

assert.ok(!/\blocalStorage\b/.test(managerSource),'Backup-UI darf die Opt-out-Einstellung nicht direkt persistieren');
assert.match(managerSource,/if\(!store\.isReminderEnabled\(\)\|\|sessionStorage\.getItem\(SESSION_PROMPT_KEY\)\)return/,'Opt-out muss den Start-Hinweis verhindern');
assert.match(managerSource,/if\(!store\.isReminderEnabled\(\)\|\|!store\.isDirty\(\)\)return/,'Opt-out muss auch den automatischen Verlassen-Hinweis verhindern');
assert.match(managerSource,/>Nicht mehr erinnern</);
assert.match(managerSource,/btn btn-ghost backup-reminder-optout/);
assert.ok(managerSource.includes("'Backup-Erinnerung aktivieren'"),'Die Datensicherung muss das Opt-in jederzeit wieder anbieten');
assert.match(modulesSource,/\.backup-reminder-toggle\{width:100%;margin-top:var\(--space-2\)\}/);
assert.match(modulesSource,/\.backup-actions \.btn\.backup-reminder-optout\{color:var\(--t2\)\}/,'Opt-out muss die graue Sekundärfarbe gegen die ältere Backup-Buttonregel behaupten');

console.log('Backup-Erinnerungs-Opt-out erfolgreich geprüft.');
