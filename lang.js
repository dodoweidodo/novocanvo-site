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

/* ---------- 产品页关键词条：一次只开一个；点开的格子原地浮起一张独立卡片 ----------
   卡片是一整个盒子（标题 + 解释），所以不存在"格子与展开之间的缝/宽度不一"；
   格子本身留在网格里不动 → 行不被撑高、网格不重排、下面那节也不会被顶一下。
   打开动作**完全由 click 接管**（先藏格子文字 → 再置 open → 最后建卡片），
   这样浏览器不会先按"native details 打开"排一次版；动画每次都由头播一遍（切换也一样）。 */
(function () {
  var kw = document.querySelector('.kw');
  if (!kw) return;
  var boxes = [].slice.call(kw.querySelectorAll('details'));
  if (!boxes.length) return;

  var card = document.createElement('div');
  card.className = 'kwcard';
  card.hidden = true;
  kw.appendChild(card);
  var cur = null, built = null, hideT = null;

  function kwOffset() {                 /* 绝对定位的参照是 .kw 的 padding box，要扣掉它自己的边框 */
    var cs = getComputedStyle(kw);
    return { l: parseFloat(cs.borderLeftWidth) || 0, t: parseFloat(cs.borderTopWidth) || 0 };
  }
  function rectIn(el) {
    var a = el.getBoundingClientRect(), b = kw.getBoundingClientRect(), o = kwOffset();
    return { left: a.left - b.left - o.l, top: a.top - b.top - o.t, width: a.width,
             bottom: a.bottom - b.top - o.t };
  }
  function lastRow(d) {
    var top = Math.round(d.getBoundingClientRect().top);
    for (var i = 0; i < boxes.length; i++)
      if (Math.round(boxes[i].getBoundingClientRect().top) > top + 2) return false;
    return true;
  }
  function build(d) {
    var s = d.querySelector('summary'), p = d.querySelector('p');
    card.innerHTML = '<div class="kwhead">' + (s ? s.innerHTML : '') + '</div>' + (p ? p.outerHTML : '');
    var cell = rectIn(d);
    card.style.left = cell.left + 'px';
    card.style.width = cell.width + 'px';
    card.style.top = cell.top + 'px';
    card.style.bottom = 'auto';
    card.classList.remove('up');
    if (!lastRow(d)) return;                     /* 非最后一行：永远朝下 */
    var sec = kw.closest('section') || document.body;
    var limit = sec.getBoundingClientRect().bottom - 22;
    if (d.getBoundingClientRect().bottom + card.getBoundingClientRect().height > limit) {
      card.classList.add('up');                  /* 底边贴着格子下沿朝上长 → 卡片内部仍是"标题在上" */
      card.style.top = 'auto';
      card.style.bottom = (kw.clientHeight - cell.bottom) + 'px';
    }
  }
  function show(d) {                             /* 藏字 → 建卡 → 定位 → 从头播动画 */
    clearTimeout(hideT);
    if (cur && cur !== d && !cur.open) cur.classList.remove('open-kw');
    cur = d;
    d.classList.add('open-kw');
    card.hidden = false;
    card.classList.add('in');
    build(d);
    built = d;
    card.style.animation = 'none';                /* 切换时也重放"浮起"动画，不要生硬地换内容 */
    void card.offsetWidth;
    card.style.animation = '';
  }
  function close() {
    if (!cur) return;
    var d = cur;
    cur = null; built = null;
    d.classList.remove('open-kw');
    if (d.open) d.open = false;
    card.classList.remove('in');
    clearTimeout(hideT);
    hideT = setTimeout(function () { card.hidden = true; }, 180);
  }
  boxes.forEach(function (d) {
    var sm = d.querySelector('summary');
    if (sm) sm.addEventListener('click', function (e) {
      if (d.open) return;                        /* 关闭走原生行为，由 toggle 统一收尾 */
      e.preventDefault();                        /* 打开全交给这里：先藏文字，布局不会被顶一下 */
      show(d);
      d.open = true;
    });
    d.addEventListener('beforetoggle', function (e) {   /* 键盘等其它打开路径的兜底 */
      if (e.newState === 'open') d.classList.add('open-kw');
    });
    d.addEventListener('toggle', function () {
      if (d.open) { if (built !== d) show(d); }
      else if (cur === d) close();
      else d.classList.remove('open-kw');
    });
  });
  card.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) close();
  });
  window.addEventListener('resize', function () { if (cur) build(cur); });
})();
