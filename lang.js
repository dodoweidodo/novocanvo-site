/* NOVOCANVO — 语言切换（EN / 中文）
   机制：任何带 data-zh 的元素，切换时用 data-zh 的值替换内容；
   原英文内容在首次切换时存进 data-en，切回来用。
   —— 所有文案都写在本站自己的 HTML 属性里（无用户输入、无外部数据），
      用 innerHTML 只是为了保留 <br> 之类的内部标签，无 XSS 面。 */
(function () {
  var KEY = 'ncv_lang';

  function param() { try { return new URLSearchParams(location.search).get('lang'); } catch (e) { return null; } }
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  function apply(lang) {
    document.querySelectorAll('[data-zh]').forEach(function (el) {
      if (!el.dataset.en) el.dataset.en = el.innerHTML;
      el.innerHTML = (lang === 'zh') ? el.dataset.zh : el.dataset.en;
    });
    document.documentElement.lang = (lang === 'zh') ? 'zh-CN' : 'en';
    document.documentElement.setAttribute('data-lang', lang);
    document.querySelectorAll('.langbtn [data-l]').forEach(function (s) {
      s.classList.toggle('on', s.getAttribute('data-l') === lang);
    });
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    if (window.refreshThemeLabel) window.refreshThemeLabel();
  }

  window.toggleLang = function () {
    var cur = document.documentElement.getAttribute('data-lang') || 'en';
    apply(cur === 'zh' ? 'en' : 'zh');
  };

  /* 移动端抽屉 */
  window.toggleMenu = function () {
    var d = document.getElementById('drawer'), sc = document.getElementById('scrim');
    if (!d) return;
    var open = d.classList.toggle('open');
    if (sc) sc.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    d.setAttribute('aria-hidden', open ? 'false' : 'true');
  };
  function closeMenu() {
    if (location.hash === '#drawer') { location.hash = ''; }
    var d = document.getElementById('drawer');
    if (d && d.classList.contains('open')) window.toggleMenu();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('.drawer-nav a') : null;
    if (a) closeMenu();
  });

  var onCnHost = location.hostname.indexOf('cn.') === 0;
  var initial = param() || stored() || (onCnHost ? 'zh' : 'en');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(initial); });
  } else {
    apply(initial);
  }
})();

/* ---------- 版本分流（语言 + IP 双判据）----------
   规则：中文浏览器 且 IP 在中国 → 跳 cn 版；
        其余（含海外中文用户）留在主站（欧美更快）。
   只在主站生效；手动选过语言就不再跳；geo 接口 300ms 超时或失败则不跳（安全兜底）。 */
(function () {
  var CN = 'cn.novocanvo.com';
  var host = location.hostname.replace(/^www\./, '');
  if (host === CN || host.indexOf('cn.') === 0) return;
  try { if (localStorage.getItem('ncv_lang')) return; } catch (e) {}
  var zh = /^zh/i.test(navigator.language || '') ||
           (navigator.languages || []).join(',').toLowerCase().indexOf('zh') >= 0;
  if (!zh) return;
  var done = false;
  function go() {
    if (done) return; done = true;
    location.replace('https://' + CN + location.pathname + location.search + location.hash);
  }
  var ctl = ('AbortController' in window) ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 300);
  fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
    .then(function (r) { return r.text(); })
    .then(function (t) { clearTimeout(timer); var m = /loc=([A-Z]{2})/.exec(t); if (m && m[1] === 'CN') go(); })
    .catch(function () { clearTimeout(timer); });
})();

/* ---------- 产品页关键词条：一次只开一个；底行的解释朝上浮起 ----------
   现代浏览器靠 <details name> 原生互斥，这段是兜底 + 定位。 */
(function () {
  var boxes = document.querySelectorAll('.kw details');
  if (!boxes.length) return;
  function closeOthers(cur) {
    for (var i = 0; i < boxes.length; i++) if (boxes[i] !== cur && boxes[i].open) boxes[i].open = false;
  }
  function lastRow(cur) {                       /* 这一格是不是网格的最后一行 */
    var top = Math.round(cur.getBoundingClientRect().top);
    for (var i = 0; i < boxes.length; i++)
      if (Math.round(boxes[i].getBoundingClientRect().top) > top + 2) return false;
    return true;
  }
  function place(cur) {
    var panel = cur.querySelector('p');
    if (!panel) return;
    cur.classList.remove('up');
    if (!lastRow(cur)) return;                  /* 只有最后一行才考虑朝上开（否则会盖住上方标题） */
    var sec = cur.closest('section') || document.body;
    var limit = sec.getBoundingClientRect().bottom - 22;      /* 纸片下沿留一点余量 */
    if (cur.getBoundingClientRect().bottom + panel.offsetHeight > limit) cur.classList.add('up');
  }
  for (var i = 0; i < boxes.length; i++) {
    (function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) { d.classList.remove('up'); return; }
        closeOthers(d);
        place(d);
      });
      var panel = d.querySelector('p');                        /* 点解释文字＝关闭 */
      if (panel) panel.addEventListener('click', function () { d.open = false; });
    })(boxes[i]);
  }
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      for (var i = 0; i < boxes.length; i++) if (boxes[i].open) place(boxes[i]);
    }, 150);
  });
})();
