(function () {
  var KEY = 'memoras-site-cor';
  var root = document.documentElement;
  function apply(t) {
    if (t && t !== 'turquesa') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    var btns = document.querySelectorAll('[data-set-theme]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-set-theme') === (t || 'turquesa')));
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  apply(saved);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-set-theme]');
    if (!b) return;
    var t = b.getAttribute('data-set-theme');
    apply(t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
  });
  var y = document.querySelectorAll('[data-year]');
  for (var j = 0; j < y.length; j++) y[j].textContent = new Date().getFullYear();
})();
