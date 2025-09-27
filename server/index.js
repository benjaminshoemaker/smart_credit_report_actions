const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = 8787;

// CORS: allow UI origin
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173', // Vite default
    ],
  })
);

// Multer setup: memory storage for quick parse
const upload = multer({ storage: multer.memoryStorage() });

// Helpers
function parseCurrency(numStr) {
  if (!numStr) return 0;
  const cleaned = String(numStr).replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function toFixed2(n) {
  return Math.round(n * 100) / 100;
}

// Try to detect issuer from surrounding text
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

  const windowSize = 1200; // chars before match to scan
  const start = Math.max(0, idx - windowSize);
  const slice = text.slice(start, idx);
  const lines = slice.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).reverse();

  // 1) Look for explicit known issuer names
  for (const line of lines) {
    for (const issuer of knownIssuers) {
      const re = new RegExp(issuer.replace(/[-/\\^$*+?.()|[\]{}]/g, r => `\\${r}`), 'i');
      if (re.test(line)) return issuer;
    }
  }

  // 2) Heuristic: nearest preceding all-caps line with card/bank hints
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

  // Find each Revolving account section
  const re = /Account Type\s+Revolving([\s\S]*?)(?=Account Type\s+|$)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const section = m[0];
    // Balance and Credit Limit within the section
    const balMatch = /Balance\s*\$([\d,]+)/i.exec(section);
    const limMatch = /Credit\s*limit\s*of\s*\$([\d,]+)/i.exec(section);
    const balance = parseCurrency(balMatch && balMatch[1]);
    const creditLimit = parseCurrency(limMatch && limMatch[1]);
    if (!balance && !creditLimit) continue;

    const issuer = findNearestIssuer(text, m.index);
    accounts.push({ issuer, balance, creditLimit });
  }

  // Fallback: global scan if sectioned regex missed entries
  if (accounts.length === 0) {
    const altRe = /Account Type\s+Revolving[\s\S]*?Balance\s*\$([\d,]+)[\s\S]*?Credit\s*limit\s*of\s*\$([\d,]+)/gi;
    let mm;
    while ((mm = altRe.exec(text)) !== null) {
      const issuer = findNearestIssuer(text, mm.index);
      const balance = parseCurrency(mm[1]);
      const creditLimit = parseCurrency(mm[2]);
      accounts.push({ issuer, balance, creditLimit });
    }
  }

  // Add per-card utilization and filter invalids
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

  // 1) Pay down to get under 30% overall
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

  // 2) CLI requests on moderate-util cards
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

  // 3) Balance transfer if any card > 80%
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

  // 4) Consolidate small balances
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

  // 5) Micro paydown to next bucket on the most utilized card
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

  // Ensure between 3–6 actions
  return actions.slice(0, 6);
}

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Missing file upload (field name "file").' });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData && pdfData.text ? pdfData.text : '';
    if (!text.trim()) {
      return res.status(400).json({ error: 'Unable to extract text from PDF.' });
    }

    const accounts = parseAccountsFromText(text);
    if (!accounts.length) {
      return res.status(400).json({ error: 'No revolving accounts found in the document.' });
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

    return res.json({ accounts, totals, actions });
  } catch (err) {
    const message = err && err.message ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});
