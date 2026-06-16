(function () {
  var pages = [
    { href: '../index.html',        label: 'Converter' },
    { href: '../pages/how-it-works.html', label: 'How It Works' },
    { href: '../pages/faq.html',    label: 'FAQ' },
    { href: '../pages/banks.html',  label: 'Supported Banks' },
  ];

  function depth() {
    var p = location.pathname;
    return (p.match(/\//g) || []).length;
  }

  function prefix() {
    return location.pathname.includes('/pages/') ? '../' : '';
  }

  function currentFile() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function buildHeader() {
    var cur  = currentFile();
    var pre  = prefix();
    var links = [
      { href: pre + 'index.html',              label: 'Converter' },
      { href: pre + 'pages/how-it-works.html', label: 'How It Works' },
      { href: pre + 'pages/faq.html',          label: 'FAQ' },
      { href: pre + 'pages/banks.html',        label: 'Banks' },
    ].map(function (p) {
      var active = location.pathname.endsWith(p.href.replace(/^\.\.\//, '').replace(/^\//, ''));
      var cls = (cur === p.href.split('/').pop()) ? ' class="active"' : '';
      return '<a href="' + p.href + '"' + cls + '>' + p.label + '</a>';
    }).join('');

    var logoHref = pre + 'index.html';
    return '<header class="site-header">'
      + '<div class="container">'
      + '<a href="' + logoHref + '" class="logo">'
      + '<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="26" height="26" rx="6" fill="#16a34a"/>'
      + '<rect x="5" y="6" width="16" height="3" rx="1.5" fill="white" opacity=".9"/>'
      + '<rect x="5" y="11.5" width="11" height="3" rx="1.5" fill="white" opacity=".7"/>'
      + '<rect x="5" y="17" width="13" height="3" rx="1.5" fill="white" opacity=".5"/>'
      + '<path d="M18 14l3 3-3 3" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>'
      + 'Statement<span class="logo-dot">Excel</span></a>'
      + '<nav class="site-nav">' + links + '</nav>'
      + '</div></header>';
  }

  function buildFooter() {
    var pre = prefix();
    return '<footer class="site-footer">'
      + '<div class="container"><div class="footer-inner">'
      + '<span>&copy; ' + new Date().getFullYear() + ' StatementExcel &mdash; Your files are never uploaded to any server.</span>'
      + '<div class="footer-links">'
      + '<a href="' + pre + 'pages/privacy.html">Privacy</a>'
      + '<a href="' + pre + 'pages/terms.html">Terms</a>'
      + '<a href="' + pre + 'pages/faq.html">FAQ</a>'
      + '</div></div></div></footer>'
      + '<div id="toast-container"></div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var h = document.getElementById('site-header');
    var f = document.getElementById('site-footer');
    if (h) h.outerHTML = buildHeader();
    if (f) f.outerHTML = buildFooter();

    // FAQ accordion
    document.querySelectorAll('.faq-q').forEach(function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('.faq-item');
        item.classList.toggle('open');
      });
    });
  });
})();