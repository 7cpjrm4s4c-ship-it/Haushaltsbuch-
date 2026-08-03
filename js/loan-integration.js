'use strict';

(() => {
  const LINK_SOURCE = 'loan';

  function normalizeName(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();
  }

  function findLinkedCategory(loan) {
    return S.cats.find(cat => cat.loanId === loan.id)
      || S.cats.find(cat => cat.t === 'K' && normalizeName(cat.p) === normalizeName(loan.n));
  }

  function syncLoanCategory(loan) {
    let cat = findLinkedCategory(loan);
    if (!cat) {
      cat = {
        id: uid(),
        g: 'Kredite',
        p: loan.n,
        d: Number(loan.m) || 0,
        t: 'K',
        loanId: loan.id,
        source: LINK_SOURCE,
      };
      S.cats.push(cat);
    } else {
      cat.g = 'Kredite';
      cat.p = loan.n;
      cat.d = Number(loan.m) || 0;
      cat.t = 'K';
      cat.loanId = loan.id;
      cat.source = LINK_SOURCE;
    }
    return cat;
  }

  function syncAllLoans() {
    const activeIds = new Set(S.kredite.map(loan => loan.id));
    S.kredite.forEach(syncLoanCategory);
    S.cats = S.cats.filter(cat => cat.source !== LINK_SOURCE || activeIds.has(cat.loanId));
  }

  function removeLoanCategory(loanId) {
    S.cats = S.cats.filter(cat => cat.loanId !== loanId);
  }

  function amortize(principal, annualRate, monthlyPayment) {
    let balance = Math.max(0, Number(principal) || 0);
    const payment = Math.max(0, Number(monthlyPayment) || 0);
    const monthlyRate = Math.max(0, Number(annualRate) || 0) / 1200;
    let months = 0;
    let interest = 0;

    if (balance <= 0) return { months: 0, interest: 0, total: 0 };
    if (payment <= 0 || (monthlyRate > 0 && payment <= balance * monthlyRate)) return null;

    while (balance > 0.005 && months < 1200) {
      const monthInterest = balance * monthlyRate;
      interest += monthInterest;
      balance = Math.max(0, balance + monthInterest - payment);
      months += 1;
    }

    if (months >= 1200) return null;
    return { months, interest, total: principal + interest };
  }

  function monthLabel(offset) {
    const date = new Date(S.year, S.month + Number(offset), 1);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }

  window.calculateSpecialRepayment = function calculateSpecialRepayment() {
    const loanId = document.getElementById('specialLoan')?.value;
    const amount = Math.max(0, Number(document.getElementById('specialAmount')?.value) || 0);
    const loan = S.kredite.find(item => item.id === loanId);
    const result = document.getElementById('specialResult');
    if (!loan || !result) return;

    const baseline = amortize(loan.r, loan.z, loan.m);
    const reducedPrincipal = Math.max(0, Number(loan.r) - amount);
    const withPayment = amortize(reducedPrincipal, loan.z, loan.m);

    if (!baseline || !withPayment) {
      result.innerHTML = '<div class="loan-calc-error">Die Monatsrate reicht bei diesem Zinssatz nicht für eine vollständige Tilgung aus.</div>';
      return;
    }

    const savedMonths = Math.max(0, baseline.months - withPayment.months);
    const savedInterest = Math.max(0, baseline.interest - withPayment.interest);
    result.innerHTML = `
      <div class="loan-calc-grid">
        <div><span>Neue Restschuld</span><strong>${fmt(reducedPrincipal)}</strong></div>
        <div><span>Laufzeitverkürzung</span><strong>${savedMonths} Monate</strong></div>
        <div><span>Zinsersparnis</span><strong>${fmt(savedInterest)}</strong></div>
        <div><span>Neues Enddatum</span><strong>${monthLabel(withPayment.months)}</strong></div>
      </div>
      <div class="loan-calc-compare">
        <div><span>Ohne Sondertilgung</span><b>${baseline.months} Monate · ${fmt(baseline.interest)} Zinsen</b></div>
        <div><span>Mit Sondertilgung</span><b>${withPayment.months} Monate · ${fmt(withPayment.interest)} Zinsen</b></div>
      </div>`;
  };

  function calculatorMarkup() {
    if (!S.kredite.length) return '';
    const options = S.kredite.map(loan => `<option value="${esc(loan.id)}">${esc(loan.n)}</option>`).join('');
    return `
      <section class="loan-calc-card">
        <div class="loan-calc-title">Sondertilgung berechnen</div>
        <div class="loan-calc-sub">Auswirkung auf Laufzeit und Zinsen</div>
        <div class="loan-calc-fields">
          <label>Kredit<select class="inp" id="specialLoan">${options}</select></label>
          <label>Sondertilgung (€)<input class="inp" id="specialAmount" type="number" min="0" step="50" inputmode="decimal" value="500"></label>
        </div>
        <button class="btn btn-primary btn-full" onclick="calculateSpecialRepayment()">Berechnen</button>
        <div id="specialResult"></div>
      </section>`;
  }

  const originalLoad = load;
  load = function integratedLoad() {
    originalLoad();
    syncAllLoans();
    persist();
  };

  const originalView = vKredite;
  vKredite = function integratedLoanView() {
    return originalView() + calculatorMarkup();
  };

  const originalSaveNew = saveNewKredit;
  saveNewKredit = function integratedSaveNewLoan() {
    const before = new Set(S.kredite.map(loan => loan.id));
    originalSaveNew();
    S.kredite.filter(loan => !before.has(loan.id)).forEach(syncLoanCategory);
    persist();
    render();
  };

  const originalSaveEdit = saveEditKredit;
  saveEditKredit = function integratedSaveEditLoan(loanId) {
    originalSaveEdit(loanId);
    const loan = S.kredite.find(item => item.id === loanId);
    if (loan) syncLoanCategory(loan);
    persist();
    render();
  };

  const originalDelete = delKredit;
  delKredit = function integratedDeleteLoan(loanId) {
    const existed = S.kredite.some(item => item.id === loanId);
    originalDelete(loanId);
    if (existed && !S.kredite.some(item => item.id === loanId)) {
      removeLoanCategory(loanId);
      persist();
      render();
    }
  };
})();
