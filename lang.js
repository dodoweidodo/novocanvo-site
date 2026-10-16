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
