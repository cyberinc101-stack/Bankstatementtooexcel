/* StatementExcel — local parsing engine v1.1 (no API required)
 * PDF.js text extraction -> line reconstruction -> heuristic transaction detection.
 * Runs 100% in the browser. The file never leaves the user's device.
 *
 * v1.1 fixes:
 *  - AMOUNT_RE: removed /g flag from module-level re; use a fresh exec loop per line
 *  - Date carryover: a line with a date but no amount seeds pendingDate; next line
 *    that has an amount + no date picks it up (handles col-separated table layouts)
 *  - Looser description cleanup: strip only the matched date string, not all date-likes
 *  - HEADER_NOISE extended to skip more boilerplate rows
 *  - round2 guards against NaN from bad parses
 */
(function (global) {
  'use strict';

  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  var MONTHS = {
    jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12
  };

  // ── PDF -> text lines with position ────────────────────────────────
  function extractLines(file) {
    return file.arrayBuffer().then(function (buf) {
      return pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (pdf) {
      var pages = [];
      for (var i = 1; i <= pdf.numPages; i++) pages.push(extractPageLines(pdf, i));
      return Promise.all(pages);
    }).then(function (pages) {
      var lines = [];
      pages.forEach(function (p) { lines = lines.concat(p); });
      return lines;
    });
  }

  function extractPageLines(pdf, pageNum) {
    return pdf.getPage(pageNum).then(function (page) {
      return page.getTextContent().then(function (tc) {
        var items = tc.items
          .map(function (it) {
            return { text: it.str, x: it.transform[4], y: it.transform[5] };
          })
          .filter(function (it) { return it.text && it.text.trim().length; });

        items.sort(function (a, b) { return b.y - a.y || a.x - b.x; });

        var rows = [];
        var TOL = 2.5;
        items.forEach(function (it) {
          var row = null;
          for (var i = 0; i < rows.length; i++) {
            if (Math.abs(rows[i].y - it.y) <= TOL) { row = rows[i]; break; }
          }
          if (!row) { row = { y: it.y, items: [] }; rows.push(row); }
          row.items.push(it);
        });

        return rows.map(function (r) {
          r.items.sort(function (a, b) { return a.x - b.x; });
          return {
            page: pageNum,
            text: r.items.map(function (i) { return i.text; }).join(' ').replace(/\s+/g, ' ').trim()
          };
        }).filter(function (r) { return r.text.length; });
      });
    });
  }

  // ── Date detection ──────────────────────────────────────────────────
  var DATE_RES = [
    { re: /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,                                    order: 'YMD'     },
    { re: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/,                              order: 'AMB'     },
    { re: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{2,4})\b/i, order: 'D_MON_Y' },
    { re: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{2,4})\b/i, order: 'MON_D_Y' },
    // Short forms: "01 Jan" or "Jan 01" without year — carries implicit year from context
    { re: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i,      order: 'D_MON'   },
    { re: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b/i,  order: 'MON_D'   },
  ];

  function findDate(text, opts) {
    for (var i = 0; i < DATE_RES.length; i++) {
      var m = text.match(DATE_RES[i].re);
      if (m) {
        var iso = normalizeDate(m, DATE_RES[i].order, opts);
        if (iso) return { match: m[0], iso: iso };
      }
    }
    return null;
  }

  function normalizeDate(m, order, opts) {
    var d, mo, y;
    var nowYear = new Date().getFullYear();

    if (order === 'YMD') {
      y = +m[1]; mo = +m[2]; d = +m[3];
    } else if (order === 'AMB') {
      var a = +m[1], b = +m[2]; y = +m[3];
      if (y < 100) y += (y < 50 ? 2000 : 1900);
      if (a > 12)      { d = a; mo = b; }
      else if (b > 12) { mo = a; d = b; }
      else if (opts && opts.dayFirst === false) { mo = a; d = b; }
      else             { d = a; mo = b; }
    } else if (order === 'D_MON_Y') {
      d = +m[1]; mo = MONTHS[m[2].slice(0,3).toLowerCase()]; y = +m[3];
      if (y < 100) y += (y < 50 ? 2000 : 1900);
    } else if (order === 'MON_D_Y') {
      mo = MONTHS[m[1].slice(0,3).toLowerCase()]; d = +m[2]; y = +m[3];
      if (y < 100) y += (y < 50 ? 2000 : 1900);
    } else if (order === 'D_MON') {
      // No year — use current year (or previous if month is in the future)
      d = +m[1]; mo = MONTHS[m[2].slice(0,3).toLowerCase()]; y = nowYear;
      if (mo > new Date().getMonth() + 2) y = nowYear - 1; // rough heuristic
    } else if (order === 'MON_D') {
      mo = MONTHS[m[1].slice(0,3).toLowerCase()]; d = +m[2]; y = nowYear;
      if (mo > new Date().getMonth() + 2) y = nowYear - 1;
    }

    if (!d || !mo || !y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return y + '-' + pad(mo) + '-' + pad(d);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // ── Amount detection ────────────────────────────────────────────────
  // NOTE: do NOT use /g flag here — we build a fresh RegExp per call via findAmounts()
  // to avoid the stateful lastIndex bug with global regexes and .match()
  var AMOUNT_PAT = /\(?\s*-?\$?\s*(?:\d{1,3}(?:,\d{3})+|\d{1,9})\.\d{2}\)?\s*(?:CR|DR)?\s*-?/i;

  function findAmounts(text) {
    // Build a fresh global regex each call — avoids lastIndex state issues
    var re = new RegExp(AMOUNT_PAT.source, 'gi');
    var results = [];
    var m;
    while ((m = re.exec(text)) !== null) {
      var parsed = parseAmountToken(m[0]);
      if (parsed !== null) results.push(parsed);
    }
    return results;
  }

  function parseAmountToken(tok) {
    var isNeg = /\(/.test(tok) || /^\s*-/.test(tok) || /-\s*$/.test(tok) || /\bDR\b/i.test(tok);
    var isCR  = /\bCR\b/i.test(tok);
    // Strip everything except digits and dot
    var num = tok.replace(/[^\d.]/g, '');
    if (!num) return null;
    var val = parseFloat(num);
    if (isNaN(val)) return null;
    if (isNeg && !isCR) val = -Math.abs(val);
    return { raw: tok.trim(), value: val };
  }

  // ── Currency detection (whole document) ────────────────────────────
  function detectCurrency(allText) {
    if (/\bNZD\b|NZ\$|New Zealand dollar/i.test(allText)) return 'NZD';
    if (/\bGBP\b|£|British pound/i.test(allText))          return 'GBP';
    if (/\bAUD\b|AU\$|Australian dollar/i.test(allText))   return 'AUD';
    if (/\bEUR\b|€|Euro/i.test(allText))                   return 'EUR';
    if (/\bCAD\b|CA\$/i.test(allText))                     return 'CAD';
    if (/\bSGD\b|S\$/i.test(allText))                      return 'SGD';
    return 'USD';
  }

  // ── Category keywords ──────────────────────────────────────────────
  var CATEGORY_RULES = [
    { cat: 'Salary',        re: /\b(salary|payroll|wages|pay ?day|direct debit pay)\b/i },
    { cat: 'Income',        re: /\b(refund|reimbursement|dividend|interest paid|interest earned|tax return)\b/i },
    { cat: 'Transfer',      re: /\b(transfer|internal xfer|a\/c transfer|funds transfer|account transfer)\b/i },
    { cat: 'Groceries',     re: /\b(supermarket|grocer|woolworths|countdown|pak\s?n\s?save|new world|fresh choice|tesco|kroger|walmart|aldi|trader joe|coles|iga)\b/i },
    { cat: 'Dining',        re: /\b(restaurant|cafe|coffee|starbucks|mcdonald|kfc|burger king|uber\s?eats|doordash|grubhub|menulog|deliveroo)\b/i },
    { cat: 'Shopping',      re: /\b(amazon|ebay|target store|department store|the warehouse|kmart|noel leeming)\b/i },
    { cat: 'Utilities',     re: /\b(power\s?co|electric|water board|broadband|telecom|mobile plan|phone bill|spark|vodafone|2degrees|contact energy|genesis|meridian)\b/i },
    { cat: 'Entertainment', re: /\b(netflix|spotify|disney\+|cinema|hoyts|event cinema|steam|playstation|xbox|youtube premium)\b/i },
    { cat: 'Fees',          re: /\b(fee|overdraft|penalty charge|account keeping|service charge|atm fee)\b/i },
    { cat: 'Loan',          re: /\b(loan repayment|mortgage|hire purchase|hp repay)\b/i },
    { cat: 'Petrol',        re: /\b(bp|shell|z energy|mobil|caltex|gull|petrol|fuel)\b/i },
    { cat: 'Health',        re: /\b(pharmacy|chemist|doctor|medical|hospital|dentist|optometrist)\b/i },
  ];

  function categorize(desc) {
    for (var i = 0; i < CATEGORY_RULES.length; i++) {
      if (CATEGORY_RULES[i].re.test(desc)) return CATEGORY_RULES[i].cat;
    }
    return 'Other';
  }

  // ── Lines -> transactions ────────────────────────────────────────────
  var HEADER_NOISE = /\b(opening balance|closing balance|brought forward|carried forward|page \d+|statement period|account number|account name|sort code|bsb|iban|swift|bank code|available balance|current balance|transaction date|value date|narrative|particulars|code|reference|withdrawals|deposits|debit|credit|balance|description)\b/i;

  function linesToTransactions(lines, opts) {
    var txns = [];
    var last = null;
    var pendingDate = null; // date found on a line that had no amount — carry to next line

    lines.forEach(function (line) {
      var text = line.text;

      // Skip obvious header/footer noise lines
      if (HEADER_NOISE.test(text) && text.split(/\s+/).length < 5) return;

      var dateInfo = findDate(text, opts);
      var amounts  = findAmounts(text);

      if (dateInfo && amounts.length) {
        // Full transaction row: date + amount(s) on same line
        var desc = buildDesc(text, dateInfo.match);
        txns.push(buildTxn(dateInfo.iso, desc, amounts));
        last = txns[txns.length - 1];
        pendingDate = null;

      } else if (dateInfo && !amounts.length) {
        // Date without amount — this line might be:
        //   (a) a header row  →  skip (HEADER_NOISE already handles most)
        //   (b) a partial row where the amount is on the next line (rare but real)
        // Store the date; if next line has amounts, we'll stitch them together.
        pendingDate = { iso: dateInfo.iso, match: dateInfo.match, rawLine: text };

      } else if (!dateInfo && amounts.length && pendingDate) {
        // Amount line that follows a date-only line — stitch them
        var descA = buildDesc(pendingDate.rawLine, pendingDate.match);
        var descB = text.replace(new RegExp(AMOUNT_PAT.source, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
        var combined = (descA + ' ' + descB).trim();
        txns.push(buildTxn(pendingDate.iso, combined, amounts));
        last = txns[txns.length - 1];
        pendingDate = null;

      } else if (!dateInfo && !amounts.length && last && text.length < 120 && !HEADER_NOISE.test(text)) {
        // Continuation description line — append to previous transaction
        last.description = (last.description + ' ' + text).replace(/\s{2,}/g, ' ').trim();

      } else {
        // Nothing matched — reset pendingDate to avoid false stitches
        if (!dateInfo) pendingDate = null;
      }
    });

    return txns;
  }

  function buildDesc(text, dateMatch) {
    // Remove only the matched date string, not all date-like patterns
    var escaped = dateMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var cleaned = text
      .replace(new RegExp(escaped), '')
      .replace(new RegExp(AMOUNT_PAT.source, 'gi'), '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return cleaned;
  }

  function buildTxn(dateIso, desc, amounts) {
    var amount, balance = null, confidence = 'high';

    if (amounts.length === 1) {
      amount = amounts[0].value;
    } else if (amounts.length === 2) {
      // Could be: [amount, balance]  OR  [debit, credit] (one will be 0 or missing)
      // Heuristic: if one is 0, treat as debit/credit split; otherwise [0]=amount, [1]=balance
      var a0 = amounts[0].value, a1 = amounts[1].value;
      if (a0 === 0) { amount = a1; }
      else if (a1 === 0) { amount = a0; }
      else { amount = a0; balance = a1; }
    } else if (amounts.length >= 3) {
      // 3-column table: debit | credit | balance  (one of debit/credit will be 0)
      var debit  = amounts[0].value;
      var credit = amounts[1].value;
      balance    = amounts[amounts.length - 1].value;
      if (debit === 0 && credit !== 0)       { amount = credit; }
      else if (credit === 0 && debit !== 0)  { amount = -Math.abs(debit); }
      else {
        // Both non-zero — sum all but last (running balance); flag low confidence
        amount = amounts.slice(0, -1).reduce(function (s, a) { return s + a.value; }, 0);
        confidence = 'low';
      }
    } else {
      amount = 0;
      confidence = 'low';
    }

    // Extract reference number from description
    var refMatch = desc.match(/\b(?:REF|TXN|ID)[:#]?\s*([A-Z0-9\-]{4,})\b/i) ||
                   desc.match(/#(\d{4,})\b/);
    var ref = null;
    if (refMatch) { ref = refMatch[1]; desc = desc.replace(refMatch[0], '').trim(); }

    desc = desc.replace(/\s{2,}/g, ' ').trim() || '(no description)';

    return {
      date:        dateIso,
      ref:         ref,
      description: desc,
      currency:    null,  // filled in by caller
      amount:      round2(amount),
      balance:     balance != null ? round2(balance) : null,
      type:        amount < 0 ? 'debit' : 'credit',
      category:    categorize(desc),
      _confidence: confidence
    };
  }

  function round2(n) {
    if (typeof n !== 'number' || isNaN(n)) return 0;
    return Math.round(n * 100) / 100;
  }

  // ── Public API ────────────────────────────────────────────────────
  function parsePDF(file, opts) {
    return extractLines(file).then(function (lines) {
      var allText = lines.map(function (l) { return l.text; }).join(' ');
      var currency = detectCurrency(allText);
      var txns = linesToTransactions(lines, opts || {});
      txns.forEach(function (t) { t.currency = currency; });
      return txns;
    });
  }

  function parseText(rawText, opts) {
    var lines = rawText
      .split(/\r?\n/)
      .map(function (l) { return { text: l.trim() }; })
      .filter(function (l) { return l.text.length; });
    var currency = detectCurrency(rawText);
    var txns = linesToTransactions(lines, opts || {});
    txns.forEach(function (t) { t.currency = currency; });
    return txns;
  }

  global.ParserEngine = { parsePDF: parsePDF, parseText: parseText };

})(window);
