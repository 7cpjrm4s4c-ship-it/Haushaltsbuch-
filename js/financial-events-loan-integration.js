/* Integration zwischen Kredit-Lifecycle und Prognose-Finanzereignissen. Keine DOM-Abhängigkeiten. */
'use strict';

function removeSpecialRepaymentsForLoan(loanId){
  const id=String(loanId||'');
  const events=ForecastStateStore.financialEvents().filter(event=>!(event.type==='specialRepayment'&&String(event.metadata?.loanId||'')===id));
  ForecastStateStore.setFinancialEvents(events);
}

LoanLifecycle.onDeleted(({loanId})=>removeSpecialRepaymentsForLoan(loanId));
