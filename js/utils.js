// Toast
window.showToast = function (msg, type) {
  var tc = document.getElementById('toast-container');
  if (!tc) return;
  var t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(function () { t.remove(); }, 3500);
};

// Format bytes
window.fmtBytes = function (b) {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
};

// Format currency
window.fmtCurrency = function (n) {
  if (n === null || n === undefined || n === '') return '';
  var num = parseFloat(String(n).replace(/[^0-9.\-]/g, ''));
  if (isNaN(num)) return String(n);
  return (num >= 0 ? '' : '-') + '$' + Math.abs(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Generate Excel (CSV compatible .xlsx via simple CSV blob)
window.downloadCSV = function (rows, filename) {
  var header = ['Date', 'Description', 'Amount', 'Balance', 'Type', 'Category'];
  var lines  = [header];
  rows.forEach(function (r) {
    lines.push([
      r.date || '',
      '"' + (r.description || '').replace(/"/g, '""') + '"',
      r.amount || '',
      r.balance || '',
      r.type || '',
      r.category || '',
    ]);
  });
  var csv  = lines.map(function (l) { return l.join(','); }).join('\r\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename || 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  window.showToast('Download started!', 'success');
};

// Download JSON
window.downloadJSON = function (data, filename) {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = filename || 'transactions.json';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  window.showToast('JSON downloaded!', 'success');
};

// Read file as text (for PDF text extraction fallback)
window.readFileText = function (file) {
  return new Promise(function (res, rej) {
    var fr = new FileReader();
    fr.onload = function (e) { res(e.target.result); };
    fr.onerror = rej;
    fr.readAsText(file);
  });
};

// Read file as base64
window.readFileBase64 = function (file) {
  return new Promise(function (res, rej) {
    var fr = new FileReader();
    fr.onload = function (e) { res(e.target.result.split(',')[1]); };
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
};