/* Integration zwischen Kredit-Lifecycle und Prognose-Finanzereignissen. Keine DOM-Abhängigkeiten. */
'use strict';

function removeSpecialRepaymentsForLoan(loanId){
  const id=String(loanId||'');
  S.financialEvents=(S.financialEvents||[]).filter(event=>!(event.type==='specialRepayment'&&String(event.metadata?.loanId||'')===id));
}

LoanLifecycle.onDeleted(({loanId})=>removeSpecialRepaymentsForLoan(loanId));
