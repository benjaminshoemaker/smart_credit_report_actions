const pdfParse = require('pdf-parse');

function parseCurrency(numStr) {
  if (!numStr) return 0;
  const cleaned = String(numStr).replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function toFixed2(n) {
  return Math.round(n * 100) / 100;
}

function findNearestIssuer(text, idx) {
  const knownIssuers = [
    'AMERICAN EXPRESS',
    'JPMCB CARD SERVICES',
    'JPMCB',
    'CHASE',
    'DISCOVER',
    'CAPITAL ONE',
    'CITI',
    'CITIBANK',
    'BANK OF AMERICA',
    'WELLS FARGO',
    'BARCLAYS',
    'SYNCHRONY',
    'U.S. BANK',
    'US BANK',
    'USAA',
    'NAVY FEDERAL',
    'PENTAGON FEDERAL',
    'ELAN FINANCIAL SERVICES',
  ];

  const windowSize = 1200;
  const start = Math.max(0, idx - windowSize);
  const slice = text.slice(start, idx);
  const lines = slice.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).reverse();

  for (const line of lines) {
    for (const issuer of knownIssuers) {
      const re = new RegExp(issuer.replace(/[-/\\^$*+?.()|[\]{}]/g, (r) => `\\${r}`), 'i');
      if (re.test(line)) return issuer;
    }
  }

  for (const line of lines) {
    const condensed = line.replace(/\s+/g, ' ').trim();
    const isAllCaps = condensed && condensed === condensed.toUpperCase();
    const hasHint = /(CARD|BANK|VISA|MASTERCARD|AMEX|AMERICAN EXPRESS|DISCOVER)/i.test(condensed);
    if (isAllCaps || hasHint) return condensed.slice(0, 80);
  }

  return 'UNKNOWN';
}

function parseAccountsFromText(text) {
  const accounts = [];

  // Normalize a bit for robust matching while keeping original text for issuer scan
  const t = text;

  // Helper to search a section for balance and limit with multiple label variants
  const findAmounts = (section) => {
    const balanceReList = [
      /(?:Current\s+)?Balance\s*:?:?\s*\$\s*([\d,.]+)/i,
      /Recent\s*Balance\s*:?:?\s*\$\s*([\d,.]+)/i,
      /Balance\s*\$\s*([\d,.]+)/i,
    ];
    const limitReList = [
      /Credit\s*Limit(?:\/Original\s*Amount)?\s*:?:?\s*\$\s*([\d,.]+)/i,
      /Credit\s*limit\s*of\s*\$\s*([\d,.]+)/i,
      /High\s*Credit\s*:?:?\s*\$\s*([\d,.]+)/i,
      /Original\s*Amount\s*:?:?\s*\$\s*([\d,.]+)/i,
    ];
    let balance = 0;
    for (const re of balanceReList) {
      const m = re.exec(section);
      if (m) {
        balance = parseCurrency(m[1]);
        break;
      }
    }
    let creditLimit = 0;
    for (const re of limitReList) {
      const m = re.exec(section);
      if (m) {
        creditLimit = parseCurrency(m[1]);
        break;
      }
    }
    return { balance, creditLimit };
  };

  // Primary: sections that declare Account Type: Revolving (with optional colon)
  const sectionRes = [
    /Account\s*Type\s*:?:?\s*Revolving([\s\S]*?)(?=Account\s*Type\s*:?:?\s*|$)/gi,
    // Some reports show Terms: Revolving
    /Terms\s*:?:?\s*Revolving([\s\S]*?)(?=Account\s*Type\s*:?:?|Terms\s*:?:?|$)/gi,
  ];

  for (const re of sectionRes) {
    let m;
    while ((m = re.exec(t)) !== null) {
      const section = m[0];
      const { balance, creditLimit } = findAmounts(section);
      if (!balance && !creditLimit) continue;
      const issuer = findNearestIssuer(t, m.index);
      accounts.push({ issuer, balance, creditLimit });
    }
  }

  // Fallback: global scan near any 'Revolving' mention
  if (accounts.length === 0) {
    const aroundRevolving = /([\s\S]{0,400}Revolving[\s\S]{0,600})/gi;
    let mm;
    while ((mm = aroundRevolving.exec(t)) !== null) {
      const section = mm[1];
      const { balance, creditLimit } = findAmounts(section);
      if (!balance && !creditLimit) continue;
      const issuer = findNearestIssuer(t, mm.index);
      accounts.push({ issuer, balance, creditLimit });
    }
  }

  return accounts
    .map((a) => ({
      issuer: a.issuer || 'UNKNOWN',
      balance: a.balance || 0,
      creditLimit: a.creditLimit || 0,
      perCardUtilization: a.creditLimit > 0 ? toFixed2(a.balance / a.creditLimit) : 0,
    }))
    .filter((a) => a.balance > 0 || a.creditLimit > 0);
}

function buildActions(accounts, totals) {
  const actions = [];
  const { totalBalances, totalLimits, overallUtilization } = totals;

  if (totalLimits > 0 && overallUtilization > 0.3) {
    const targetBalance = 0.3 * totalLimits;
    const pay = Math.max(0, totalBalances - targetBalance);
    const payRounded = Math.ceil(pay / 10) * 10;
    actions.push({
      id: 'paydown-30',
      title: `Pay $${payRounded.toLocaleString()} to get under 30% overall`,
      rationale: 'Lower utilization quickly boosts score sensitivity ranges.',
      impact: 'high',
      estSavingsMonthly: Math.round(payRounded * 0.02),
      steps: [
        'Prioritize highest utilization cards first.',
        'Make payments before statement cut dates.',
        'Verify balances update on next reports.',
      ],
    });
  }

  const moderate = accounts.filter((a) => a.creditLimit > 0 && a.perCardUtilization >= 0.3 && a.perCardUtilization <= 0.8);
  if (moderate.length) {
    const names = moderate.slice(0, 4).map((a) => a.issuer).join(', ');
    actions.push({
      id: 'cli-moderate',
      title: 'Request credit line increases on select cards',
      rationale: 'Raising limits lowers utilization without new debt.',
      impact: 'medium',
      estSavingsMonthly: 0,
      steps: [
        `Start with: ${names || 'primary cards'}.`,
        'Request soft-pull CLIs if possible; avoid hard inquiries.',
        'Target 3–5x monthly spend as limit.',
      ],
    });
  }

  const over80 = accounts.filter((a) => a.perCardUtilization > 0.8);
  if (over80.length) {
    const top = over80.sort((a, b) => b.perCardUtilization - a.perCardUtilization)[0];
    actions.push({
      id: 'balance-transfer',
      title: `Consider balance transfer from ${top.issuer}`,
      rationale: '0% intro APR offers can cut interest and utilization.',
      impact: 'high',
      estSavingsMonthly: Math.round(Math.min(top.balance, 2000) * 0.02),
      steps: [
        'Compare 0% APR cards with low transfer fees (≤3%).',
        'Transfer enough to reduce util below 50% on the source card.',
        'Pay off during promo to avoid deferred interest.',
      ],
    });
  }

  const smallBalances = accounts.filter((a) => a.balance > 0 && a.balance <= 200);
  if (smallBalances.length >= 2) {
    const count = smallBalances.length;
    actions.push({
      id: 'consolidate-small',
      title: `Consolidate ${count} small balances to one card`,
      rationale: 'Fewer cards reporting balances can improve score factors.',
      impact: 'medium',
      estSavingsMonthly: count * 5,
      steps: [
        'Select one low-utilization card to report the consolidated balance.',
        'Pay off other small balances before statement cuts.',
        'Keep total utilization under 30% on the destination card.',
      ],
    });
  }

  const withLimit = accounts.filter((a) => a.creditLimit > 0);
  if (withLimit.length) {
    const top = withLimit.sort((a, b) => b.perCardUtilization - a.perCardUtilization)[0];
    const thresholds = [0.8, 0.5, 0.3, 0.1];
    const next = thresholds.find((t) => top.perCardUtilization > t);
    if (next) {
      const targetBal = Math.floor(top.creditLimit * next);
      const pay = Math.max(0, top.balance - targetBal);
      const payRounded = Math.ceil(pay / 10) * 10;
      actions.push({
        id: 'paydown-bucket',
        title: `Pay $${payRounded.toLocaleString()} on ${top.issuer} to drop below ${(next * 100).toFixed(0)}%`,
        rationale: 'Crossing utilization tiers can yield quick score gains.',
        impact: 'medium',
        estSavingsMonthly: Math.round(payRounded * 0.02),
        steps: [
          'Schedule payment 3–5 days before statement close.',
          'Confirm new balance posts before the reporting date.',
        ],
      });
    }
  }

  return actions.slice(0, 6);
}

function analyzeText(text) {
  if (!text || !text.trim()) {
    throw new Error('Unable to extract text from PDF.');
  }
  const accounts = parseAccountsFromText(text);
  if (!accounts.length) {
    throw new Error('No revolving accounts found in the document.');
  }
  const totalBalances = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalLimits = accounts.reduce((s, a) => s + (a.creditLimit || 0), 0);
  const overallUtilization = totalLimits > 0 ? toFixed2(totalBalances / totalLimits) : 0;
  const totals = {
    overallUtilization,
    totalBalances: toFixed2(totalBalances),
    totalLimits: toFixed2(totalLimits),
  };
  const actions = buildActions(accounts, totals);
  return { accounts, totals, actions };
}

async function analyzeBuffer(buffer) {
  const pdfData = await pdfParse(buffer);
  const text = pdfData && pdfData.text ? pdfData.text : '';
  return analyzeText(text);
}

module.exports = {
  analyzeBuffer,
  analyzeText,
};
