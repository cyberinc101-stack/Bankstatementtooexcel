/* StatementExcel — core converter v3.1
 * PDF → Claude API → JSON → Layout picker → CSV/Excel download
 */
(function () {
  'use strict';

  var state = {
    file:         null,
    transactions: [],
    apiKey:       '',
    processing:   false,
    layout:       'standard',
    columns: {
      ref:          true,
      currency:     true,
      balance:      true,
      type:         true,
      category:     true,
      totalsRow:    true,
      columnTotals: true,
    },
    amountDisplay: 'single',   // 'single' | 'split' | 'absolute'
    totalsDisplay: 'footer',   // 'footer' | 'stats' | 'both'
  };

  // ── DOM refs ──────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  var els = {};

  function init() {
    els.dropzone      = $('dropzone');
    els.fileInput     = $('file-input');
    els.fileBadge     = $('file-badge');
    els.badgeName     = $('badge-name');
    els.badgeSize     = $('badge-size');
    els.badgeRemove   = $('badge-remove');
    els.convertBtn    = $('convert-btn');
    els.clearBtn      = $('clear-btn');
    els.progressWrap  = $('progress-wrap');
    els.progressBar   = $('progress-bar');
    els.statusMsg     = $('status-msg');
    els.resultPanel   = $('result-panel');
    els.resultCount   = $('result-count');
    els.resultBody    = $('result-body');
    els.dlCsv         = $('dl-csv');
    els.dlJson        = $('dl-json');
    els.dlExcel       = $('dl-excel');
    els.apiInput      = $('api-key-input');
    els.sumIncome     = $('sum-income');
    els.sumExpenses   = $('sum-expenses');
    els.sumNet        = $('sum-net');
    els.sumCount      = $('sum-count');
    els.layoutSection = $('layout-section');
    els.previewInfo   = $('preview-info');

    bindEvents();
    loadApiKey();
    bindLayoutPicker();
    bindColumnCustomizer();
  }

  // ── LAYOUT PICKER ─────────────────────────────────
  function bindLayoutPicker() {
    document.querySelectorAll('.layout-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.layout-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.layout = btn.dataset.layout;
        // Update preview label
        var nameEl = $('preview-layout-name');
        if (nameEl) nameEl.textContent = btn.querySelector('.lb-name').textContent;
        // Apply presets
        applyLayoutPreset(state.layout);
        if (state.transactions.length) renderResults(state.transactions);
      });
    });
  }

  function applyLayoutPreset(layout) {
    var presets = {
      standard:   { ref:true,  currency:true,  balance:true,  type:true,  category:true,  totalsRow:true,  columnTotals:true,  amount:'single',   totals:'footer' },
      split:      { ref:true,  currency:true,  balance:true,  type:false, category:true,  totalsRow:true,  columnTotals:true,  amount:'split',    totals:'both'   },
      accountant: { ref:true,  currency:false, balance:true,  type:false, category:false, totalsRow:true,  columnTotals:true,  amount:'absolute', totals:'both'   },
      minimal:    { ref:false, currency:false, balance:false, type:false, category:false, totalsRow:false, columnTotals:false, amount:'single',   totals:'stats'  },
    };
    var p = presets[layout];
    if (!p) return;

    ['ref','currency','balance','type','category','totalsRow','columnTotals'].forEach(function(k) {
      var el = $('col-' + k);
      if (el && p[k] !== undefined) {
        el.checked = p[k];
        state.columns[k] = p[k];
      }
    });

    var ar = document.querySelector('input[name="amountDisplay"][value="' + p.amount + '"]');
    if (ar) { ar.checked = true; state.amountDisplay = p.amount; }

    var tr = document.querySelector('input[name="totalsDisplay"][value="' + p.totals + '"]');
    if (tr) { tr.checked = true; state.totalsDisplay = p.totals; }
  }

  // ── COLUMN CUSTOMIZER ─────────────────────────────
  function bindColumnCustomizer() {
    ['ref','currency','balance','type','category','totalsRow','columnTotals'].forEach(function (key) {
      var el = $('col-' + key);
      if (el) {
        el.checked = state.columns[key];
        el.addEventListener('change', function () {
          state.columns[key] = el.checked;
          if (state.transactions.length) renderResults(state.transactions);
        });
      }
    });

    document.querySelectorAll('input[name="amountDisplay"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (r.checked) {
          state.amountDisplay = r.value;
          if (state.transactions.length) renderResults(state.transactions);
        }
      });
    });

    document.querySelectorAll('input[name="totalsDisplay"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (r.checked) {
          state.totalsDisplay = r.value;
          if (state.transactions.length) renderResults(state.transactions);
        }
      });
    });
  }

  // ── FILE EVENTS ───────────────────────────────────
  function bindEvents() {
    if (els.dropzone) {
      els.dropzone.addEventListener('dragover', function (e) { e.preventDefault(); els.dropzone.classList.add('over'); });
      els.dropzone.addEventListener('dragleave', function () { els.dropzone.classList.remove('over'); });
      els.dropzone.addEventListener('drop', function (e) {
        e.preventDefault(); els.dropzone.classList.remove('over');
        var f = e.dataTransfer.files[0]; if (f) setFile(f);
      });
      // Click-to-browse
      els.dropzone.addEventListener('click', function (e) {
        if (e.target !== els.fileInput) els.fileInput && els.fileInput.click();
      });
    }
    if (els.fileInput) {
      els.fileInput.addEventListener('change', function () {
        if (els.fileInput.files[0]) setFile(els.fileInput.files[0]);
        els.fileInput.value = '';
      });
    }
    if (els.badgeRemove) els.badgeRemove.addEventListener('click', clearFile);
    if (els.clearBtn)    els.clearBtn.addEventListener('click', clearAll);
    if (els.convertBtn)  els.convertBtn.addEventListener('click', startConvert);
    if (els.dlCsv)   els.dlCsv.addEventListener('click',   function () { downloadBuiltCSV(getBaseName() + '.csv'); });
    if (els.dlJson)  els.dlJson.addEventListener('click',  function () { window.downloadJSON(state.transactions, getBaseName() + '.json'); });
    if (els.dlExcel) els.dlExcel.addEventListener('click', function () { downloadBuiltCSV(getBaseName() + '.csv'); });
    if (els.apiInput) {
      els.apiInput.addEventListener('input', function () { state.apiKey = els.apiInput.value.trim(); saveApiKey(); });
    }
  }

  function getBaseName() { return state.file ? state.file.name.replace(/\.pdf$/i, '') : 'transactions'; }

  function isPdfFile(f) {
    return f.type === 'application/pdf' || f.type === 'application/octet-stream' || f.name.toLowerCase().endsWith('.pdf');
  }

  function setFile(f) {
    var ok = isPdfFile(f) || f.type.startsWith('text/') || f.name.toLowerCase().endsWith('.txt');
    if (!ok) { window.showToast('Please upload a PDF or text file', 'error'); return; }
    state.file = f;
    if (els.badgeName) els.badgeName.textContent = f.name;
    if (els.badgeSize) els.badgeSize.textContent = window.fmtBytes(f.size);
    if (els.fileBadge) els.fileBadge.style.display = 'flex';
    if (els.dropzone)  els.dropzone.style.display  = 'none';
    if (els.convertBtn) els.convertBtn.disabled = false;
    hideResult();
  }

  function clearFile() {
    state.file = null;
    if (els.fileBadge) els.fileBadge.style.display = 'none';
    if (els.dropzone)  els.dropzone.style.display  = '';
    if (els.convertBtn) els.convertBtn.disabled = true;
  }

  function clearAll() {
    clearFile();
    state.transactions = [];
    hideResult();
    setProgress(0, '');
    if (els.layoutSection) els.layoutSection.style.display = 'none';
  }

  function hideResult() {
    if (els.resultPanel) els.resultPanel.style.display = 'none';
    if (els.progressWrap) els.progressWrap.style.display = 'none';
  }

  function setProgress(pct, msg) {
    if (els.progressWrap) els.progressWrap.style.display = pct > 0 ? '' : 'none';
    if (els.progressBar)  els.progressBar.style.width = pct + '%';
    if (els.statusMsg)    els.statusMsg.textContent = msg || '';
  }

  function loadApiKey() {
    try { var k = localStorage.getItem('bc_api_key'); if (k && els.apiInput) { els.apiInput.value = k; state.apiKey = k; } } catch(e) {}
  }
  function saveApiKey() {
    try { localStorage.setItem('bc_api_key', state.apiKey); } catch(e) {}
  }

  // ── CONVERT ───────────────────────────────────────
  function startConvert() {
    if (!state.file) { window.showToast('Please upload a file first', 'error'); return; }
    var key = state.apiKey || (els.apiInput ? els.apiInput.value.trim() : '');
    if (!key) { window.showToast('Please enter your Claude API key', 'error'); els.apiInput && els.apiInput.focus(); return; }
    if (!key.startsWith('sk-ant-')) { window.showToast('API key should start with sk-ant-…', 'error'); els.apiInput && els.apiInput.focus(); return; }
    state.apiKey = key; saveApiKey();
    state.processing = true;
    if (els.convertBtn) els.convertBtn.disabled = true;
    if (els.clearBtn)   els.clearBtn.disabled = true;
    hideResult();
    if (els.layoutSection) els.layoutSection.style.display = 'none';
    setProgress(10, 'Reading file…');

    readFile(state.file).then(function (content) {
      setProgress(30, 'Sending to Claude AI for parsing…');
      return callClaudeAPI(key, content, state.file);
    }).then(function (transactions) {
      state.transactions = transactions;
      setProgress(95, 'Building results…');
      if (els.layoutSection) els.layoutSection.style.display = '';
      renderResults(transactions);
      setProgress(100, 'Done!');
      setTimeout(function () { setProgress(0, ''); }, 1500);
      window.showToast('Extracted ' + transactions.length + ' transactions!', 'success');
    }).catch(function (err) {
      setProgress(0, '');
      var msg = err.message || 'Conversion failed';
      window.showToast(msg, 'error');
      if (els.statusMsg) els.statusMsg.textContent = '⚠ ' + msg;
      if (els.progressWrap) els.progressWrap.style.display = '';
      if (els.progressBar)  els.progressBar.style.width = '0%';
      console.error(err);
    }).finally(function () {
      state.processing = false;
      if (els.convertBtn) els.convertBtn.disabled = false;
      if (els.clearBtn)   els.clearBtn.disabled = false;
    });
  }

  function readFile(file) {
    if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) {
      return window.readFileText(file);
    }
    return window.readFileBase64(file);
  }

  function callClaudeAPI(apiKey, content, file) {
    var isText = file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt');

    var systemPrompt = 'You are a bank statement parser. Extract ALL transactions from the provided bank statement. '
      + 'Return ONLY a valid JSON array — no explanation, no markdown, no preamble, no trailing text. '
      + 'Each object must have: '
      + 'date (string, e.g. "2024-01-15"), '
      + 'ref (string or null — reference/transaction ID if present), '
      + 'description (string), '
      + 'currency (string, e.g. "USD", "NZD", "GBP" — detect from statement), '
      + 'amount (number — negative for debits/withdrawals, positive for credits/deposits), '
      + 'balance (number or null — running balance after transaction if shown), '
      + 'type ("debit" or "credit"), '
      + 'category (string: best guess — "Groceries", "Transfer", "Salary", "Utilities", "Entertainment", "Dining", "Shopping", "Fees", "Income", "Loan", "Other"). '
      + 'Include every transaction. Do not skip any. Return [] if no transactions found. '
      + 'Output ONLY the JSON array, starting with [ and ending with ].';

    var userContent;
    if (isText) {
      userContent = 'Extract all transactions from this bank statement as a JSON array:\n\n' + content;
    } else {
      userContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: content } },
        { type: 'text', text: 'Extract all transactions from this bank statement as a JSON array as instructed in the system prompt.' }
      ];
    }

    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (e) {
          var msg = (e.error && e.error.message) || ('API error ' + res.status);
          if (res.status === 401) msg = 'Invalid API key. Check your key at console.anthropic.com.';
          if (res.status === 429) msg = 'Rate limit or no credits. Check your Anthropic account.';
          if (res.status === 413) msg = 'PDF too large. Try splitting into smaller files or single-month statements.';
          throw new Error(msg);
        });
      }
      return res.json();
    }).then(function (data) {
      if (data.stop_reason === 'max_tokens') {
        window.showToast('⚠ Response was truncated — statement may be very long. Results may be partial.', 'error');
      }
      var text = '';
      if (data.content && data.content[0]) text = data.content[0].text || '';
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      var start = text.indexOf('[');
      var end   = text.lastIndexOf(']');
      if (start !== -1 && end !== -1) text = text.substring(start, end + 1);
      try {
        var parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('Expected array');
        if (parsed.length === 0) {
          throw new Error('No transactions found. Your PDF may be image-based (scanned). Try a text-based e-statement downloaded from your bank portal.');
        }
        return parsed;
      } catch(e) {
        if (e.message.includes('No transactions')) throw e;
        throw new Error('Could not parse AI response. The statement may be scanned/image-based. Try a text-based PDF from your bank portal.');
      }
    });
  }

  // ── RENDER RESULTS ────────────────────────────────
  function renderResults(rows) {
    if (!els.resultPanel) return;
    els.resultPanel.style.display = '';
    if (els.resultCount) els.resultCount.textContent = rows.length + ' transaction' + (rows.length !== 1 ? 's' : '') + ' found';
    if (els.previewInfo) els.previewInfo.textContent = getBaseName() + ' · preview (first 8 rows) — download for all ' + rows.length;

    var showRef      = state.columns.ref;
    var showCurrency = state.columns.currency;
    var showBalance  = state.columns.balance;
    var showType     = state.columns.type;
    var showCategory = state.columns.category;
    var showTotals   = state.columns.totalsRow;
    var amtMode      = state.amountDisplay;

    // Build thead
    var thead = '<tr>';
    thead += '<th>Date</th>';
    if (showRef) thead += '<th>Ref</th>';
    thead += '<th>Description</th>';
    if (showCurrency) thead += '<th>Currency</th>';
    if (amtMode === 'split') {
      thead += '<th>Withdrawals</th><th>Deposits</th>';
    } else {
      thead += '<th>Amount</th>';
    }
    if (showBalance) thead += '<th>Balance</th>';
    if (showType) thead += '<th>Type</th>';
    if (showCategory) thead += '<th>Category</th>';
    thead += '</tr>';

    var catColors = {
      'Salary':'#16a34a','Income':'#16a34a','Transfer':'#d97706','Groceries':'#2563eb',
      'Dining':'#7c3aed','Shopping':'#db2777','Utilities':'#0891b2','Entertainment':'#dc2626',
      'Fees':'#9ca3af','Loan':'#b45309','Other':'#6b7280',
    };
    function catBadge(cat) {
      if (!cat) return '';
      var color = catColors[cat] || '#6b7280';
      return '<span style="background:' + color + '18;color:' + color + ';border:1px solid ' + color + '44;border-radius:4px;padding:2px 7px;font-size:.75rem;font-weight:600;white-space:nowrap">' + escHtml(cat) + '</span>';
    }

    if (els.resultBody) {
      var preview = rows.slice(0, 8);
      els.resultBody.innerHTML = '';

      var theadEl = els.resultBody.closest('table') && els.resultBody.closest('table').querySelector('thead');
      if (theadEl) theadEl.innerHTML = thead;

      preview.forEach(function (r) {
        var amt = parseFloat(r.amount) || 0;
        var row = '<tr>';
        row += '<td>' + escHtml(r.date || '') + '</td>';
        if (showRef) row += '<td style="color:var(--text-muted);font-size:.8rem">' + escHtml(r.ref || '') + '</td>';
        row += '<td>' + escHtml(r.description || '') + '</td>';
        if (showCurrency) row += '<td style="color:var(--text-muted)">' + escHtml(r.currency || '') + '</td>';

        if (amtMode === 'split') {
          var withdrawal = amt < 0 ? '<span class="amount-negative">' + window.fmtCurrency(Math.abs(amt)) + '</span>' : '';
          var deposit    = amt >= 0 ? '<span class="amount-positive">+' + window.fmtCurrency(amt) + '</span>' : '';
          row += '<td>' + withdrawal + '</td><td>' + deposit + '</td>';
        } else if (amtMode === 'absolute') {
          var typeLabel = amt < 0 ? 'DR' : 'CR';
          row += '<td><span class="' + (amt<0?'amount-negative':'amount-positive') + '">' + window.fmtCurrency(Math.abs(amt)) + '</span> <span style="font-size:.75rem;color:var(--text-muted)">' + typeLabel + '</span></td>';
        } else {
          var amtStr = (amt >= 0 ? '<span class="amount-positive">+' : '<span class="amount-negative">') + window.fmtCurrency(amt) + '</span>';
          row += '<td>' + amtStr + '</td>';
        }

        if (showBalance) row += '<td>' + (r.balance != null ? window.fmtCurrency(r.balance) : '') + '</td>';
        if (showType)    row += '<td style="color:var(--text-muted);font-size:.82rem">' + escHtml(r.type || '') + '</td>';
        if (showCategory) row += '<td>' + catBadge(r.category) + '</td>';
        row += '</tr>';
        els.resultBody.innerHTML += row;
      });

      // Footer totals rows
      var showColumnTotals = state.columns.columnTotals;
      if (showTotals && (state.totalsDisplay === 'footer' || state.totalsDisplay === 'both')) {
        var colCount = 2;
        if (showRef) colCount++;
        if (showCurrency) colCount++;
        if (amtMode === 'split') colCount += 2; else colCount++;
        if (showBalance) colCount++;
        if (showType) colCount++;
        if (showCategory) colCount++;

        var baseStyle = 'font-weight:700;background:var(--bg)';
        var labelStyle = 'text-align:right;color:var(--text-secondary);font-size:.85rem';

        var allIncome = 0, allExpenses = 0;
        rows.forEach(function(r) { var a = parseFloat(r.amount)||0; if(a>0) allIncome+=a; else allExpenses+=Math.abs(a); });

        if (showColumnTotals && amtMode === 'split') {
          els.resultBody.innerHTML +=
            '<tr style="' + baseStyle + '">'
            + '<td colspan="' + (colCount - 2) + '" style="' + labelStyle + '">TOTAL EXPENSES</td>'
            + '<td><span class="amount-negative">' + window.fmtCurrency(allExpenses) + '</span></td>'
            + '<td></td>'
            + '</tr>'
            + '<tr style="' + baseStyle + '">'
            + '<td colspan="' + (colCount - 2) + '" style="' + labelStyle + '">TOTAL DEPOSITS</td>'
            + '<td></td>'
            + '<td><span class="amount-positive">+' + window.fmtCurrency(allIncome) + '</span></td>'
            + '</tr>';
        } else if (showColumnTotals) {
          els.resultBody.innerHTML +=
            '<tr style="' + baseStyle + '">'
            + '<td colspan="' + (colCount - 1) + '" style="' + labelStyle + '">TOTAL EXPENSES</td>'
            + '<td><span class="amount-negative">' + window.fmtCurrency(allExpenses) + '</span></td>'
            + '</tr>'
            + '<tr style="' + baseStyle + '">'
            + '<td colspan="' + (colCount - 1) + '" style="' + labelStyle + '">TOTAL DEPOSITS</td>'
            + '<td><span class="amount-positive">+' + window.fmtCurrency(allIncome) + '</span></td>'
            + '</tr>';
        } else {
          var net = allIncome - allExpenses;
          var netStr = '<span class="' + (net>=0?'amount-positive':'amount-negative') + '">' + (net>=0?'+':'') + window.fmtCurrency(net) + '</span>';
          els.resultBody.innerHTML += '<tr style="' + baseStyle + '">'
            + '<td colspan="' + (colCount - 1) + '" style="' + labelStyle + '">TOTAL NET</td>'
            + '<td>' + netStr + '</td>'
            + '</tr>';
        }
      }
    }

    // Summary stats bar
    var showStats = state.totalsDisplay === 'stats' || state.totalsDisplay === 'both';
    var statsBar = $('summary-bar');
    if (statsBar) statsBar.style.display = showStats ? 'flex' : 'none';

    var totalIncome = 0, totalExpenses = 0;
    rows.forEach(function(r) { var a = parseFloat(r.amount)||0; if(a>0) totalIncome+=a; else totalExpenses+=Math.abs(a); });

    if (els.sumIncome)   els.sumIncome.textContent   = window.fmtCurrency(totalIncome);
    if (els.sumExpenses) els.sumExpenses.textContent = window.fmtCurrency(totalExpenses);
    if (els.sumNet)      els.sumNet.textContent      = window.fmtCurrency(totalIncome - totalExpenses);
    if (els.sumCount)    els.sumCount.textContent    = rows.length;
    if (els.sumNet) els.sumNet.className = 'sum-value ' + ((totalIncome - totalExpenses) >= 0 ? 'pos' : 'neg');
  }

  // ── CSV DOWNLOAD (layout-aware) ────────────────────
  function downloadBuiltCSV(filename) {
    var rows = state.transactions;
    var showRef          = state.columns.ref;
    var showCurrency     = state.columns.currency;
    var showBalance      = state.columns.balance;
    var showType         = state.columns.type;
    var showCategory     = state.columns.category;
    var showTotals       = state.columns.totalsRow;
    var showColumnTotals = state.columns.columnTotals;
    var amtMode          = state.amountDisplay;

    var header = ['Date'];
    if (showRef)      header.push('Ref');
    header.push('Description');
    if (showCurrency) header.push('Currency');
    if (amtMode === 'split') { header.push('Withdrawals'); header.push('Deposits'); }
    else if (amtMode === 'absolute') { header.push('Amount'); header.push('DR/CR'); }
    else header.push('Amount');
    if (showBalance)  header.push('Balance');
    if (showType)     header.push('Type');
    if (showCategory) header.push('Category');

    var lines = [header];
    var totalIncome = 0, totalExpenses = 0;

    rows.forEach(function (r) {
      var amt = parseFloat(r.amount) || 0;
      if (amt > 0) totalIncome += amt; else totalExpenses += Math.abs(amt);
      var row = [r.date || ''];
      if (showRef) row.push(r.ref || '');
      row.push('"' + (r.description || '').replace(/"/g,'""') + '"');
      if (showCurrency) row.push(r.currency || '');
      if (amtMode === 'split') {
        row.push(amt < 0 ? Math.abs(amt).toFixed(2) : '');
        row.push(amt >= 0 ? amt.toFixed(2) : '');
      } else if (amtMode === 'absolute') {
        row.push(Math.abs(amt).toFixed(2));
        row.push(amt < 0 ? 'DR' : 'CR');
      } else {
        row.push(amt.toFixed(2));
      }
      if (showBalance)  row.push(r.balance != null ? r.balance : '');
      if (showType)     row.push(r.type || '');
      if (showCategory) row.push(r.category || '');
      lines.push(row);
    });

    if (showTotals) {
      var amtIdx = 1;
      if (showRef) amtIdx++;
      amtIdx++;
      if (showCurrency) amtIdx++;

      if (showColumnTotals && amtMode === 'split') {
        var expRow = new Array(header.length).fill('');
        expRow[0] = 'TOTAL EXPENSES'; expRow[amtIdx] = totalExpenses.toFixed(2);
        lines.push(expRow);
        var depRow = new Array(header.length).fill('');
        depRow[0] = 'TOTAL DEPOSITS'; depRow[amtIdx + 1] = totalIncome.toFixed(2);
        lines.push(depRow);
      } else if (showColumnTotals) {
        var expRow2 = new Array(header.length).fill('');
        expRow2[0] = 'TOTAL EXPENSES'; expRow2[amtIdx] = totalExpenses.toFixed(2);
        lines.push(expRow2);
        var depRow2 = new Array(header.length).fill('');
        depRow2[0] = 'TOTAL DEPOSITS'; depRow2[amtIdx] = totalIncome.toFixed(2);
        lines.push(depRow2);
      } else {
        var totalsRow = new Array(header.length).fill('');
        totalsRow[0] = 'TOTAL NET';
        if (amtMode === 'split') {
          totalsRow[amtIdx]     = totalExpenses.toFixed(2);
          totalsRow[amtIdx + 1] = totalIncome.toFixed(2);
        } else {
          totalsRow[amtIdx] = (totalIncome - totalExpenses).toFixed(2);
        }
        lines.push(totalsRow);
      }
    }

    var csv  = lines.map(function (l) { return l.join(','); }).join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
    window.showToast('Download started!', 'success');
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
