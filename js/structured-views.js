/* Gemeinsame Speicherung für variable Ausgaben. Die Ansichten selbst liegen im kompakten Manager. */
'use strict';

function saveStructuredExpense(){
  const amount=Number(document.getElementById('quick-amount')?.value);
  const catId=document.getElementById('quick-cat')?.value;
  const name=document.getElementById('quick-name')?.value.trim()||'';
  if(!Number.isFinite(amount)||amount<=0)return toast('Bitte Betrag eingeben','err');
  if(!catId)return toast('Bitte Kategorie auswählen','err');
  S.buchungen.push({id:uid(),catId,bezeichnung:name,betrag:amount,month:S.month,year:S.year,ts:Date.now()});
  S.ausgabeAmt='';
  S.ausgabeBezeichnung='';
  S.ausgabeCatId=catId;
  persist();
  render();
  toast('Ausgabe gespeichert');
}
