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

/* ---------- 索取样品卡：弹窗（静态站没有后端，提交走邮件客户端；字段按用户要求）----------
   触发：任何带 data-swatch 的元素（用事件委托，因为语言切换会重建 innerHTML） */
(function () {
  var COUNTRIES = [
    "United States|美国","Canada|加拿大","United Kingdom|英国","Ireland|爱尔兰","Germany|德国",
    "France|法国","Netherlands|荷兰","Belgium|比利时","Luxembourg|卢森堡","Spain|西班牙",
    "Portugal|葡萄牙","Italy|意大利","Switzerland|瑞士","Austria|奥地利","Sweden|瑞典",
    "Norway|挪威","Denmark|丹麦","Finland|芬兰","Iceland|冰岛","Poland|波兰","Czechia|捷克",
    "Slovakia|斯洛伐克","Hungary|匈牙利","Romania|罗马尼亚","Bulgaria|保加利亚","Greece|希腊",
    "Croatia|克罗地亚","Serbia|塞尔维亚","Slovenia|斯洛文尼亚","Estonia|爱沙尼亚",
    "Latvia|拉脱维亚","Lithuania|立陶宛","Türkiye|土耳其","Israel|以色列",
    "United Arab Emirates|阿联酋","Saudi Arabia|沙特阿拉伯","Qatar|卡塔尔","Kuwait|科威特",
    "Oman|阿曼","Jordan|约旦","Lebanon|黎巴嫩","Egypt|埃及","Morocco|摩洛哥","Tunisia|突尼斯",
    "South Africa|南非","Nigeria|尼日利亚","Kenya|肯尼亚","Ghana|加纳","Ethiopia|埃塞俄比亚",
    "China|中国","Hong Kong SAR|中国香港","Macao SAR|中国澳门","Taiwan|中国台湾","Japan|日本",
    "South Korea|韩国","Singapore|新加坡","Malaysia|马来西亚","Thailand|泰国","Vietnam|越南",
    "Philippines|菲律宾","Indonesia|印度尼西亚","India|印度","Pakistan|巴基斯坦",
    "Bangladesh|孟加拉国","Sri Lanka|斯里兰卡","Nepal|尼泊尔","Kazakhstan|哈萨克斯坦",
    "Uzbekistan|乌兹别克斯坦","Australia|澳大利亚","New Zealand|新西兰","Mexico|墨西哥",
    "Brazil|巴西","Argentina|阿根廷","Chile|智利","Colombia|哥伦比亚","Peru|秘鲁",
    "Uruguay|乌拉圭","Ecuador|厄瓜多尔","Bolivia|玻利维亚","Paraguay|巴拉圭","Costa Rica|哥斯达黎加",
    "Panama|巴拿马","Guatemala|危地马拉","Dominican Republic|多米尼加","Russia|俄罗斯",
    "Ukraine|乌克兰","Belarus|白俄罗斯","Moldova|摩尔多瓦","Georgia|格鲁吉亚"
  ];
  var T = {
    en: {
      title: "Request a swatch card",
      lede: "An A5 swatch card, sent by courier. Tell us where it should go and how to reach you.",
      name: "Name", company: "Company (optional)", job: "Job title (optional)",
      website: "Company website (optional)", country: "Country / region",
      pick: "Select a country", address: "Full delivery address",
      reach: "How can we reach you — any one is enough",
      email: "Email", whatsapp: "WhatsApp", wechat: "WeChat", phone: "Phone",
      interest: "Grades or widths of interest (optional)", notes: "Notes (optional)",
      note: "Used only to send the sample and to reply to you. Not shared.",
      send: "Prepare the request", cancel: "Cancel",
      alt: "Or write to <a href=\"mailto:sales@novocanvo.com\">sales@novocanvo.com</a>",
      errReq: "Please fill in name, country and delivery address.",
      errNeed: "Leave at least one way to reach you.",
      done: "A draft has been handed to your mail app. If it did not open, send the same details to sales@novocanvo.com.",
      other: "Other", subject: "Swatch card request"
    },
    zh: {
      title: "索取样品卡",
      lede: "A5 样品卡，快递寄出。请写明寄送地址与联系方式。",
      name: "姓名", company: "公司（选填）", job: "职位（选填）",
      website: "公司网站（选填）", country: "国家 / 地区",
      pick: "请选择国家或地区", address: "详细收货地址",
      reach: "联系方式——留一个即可",
      email: "邮箱", whatsapp: "WhatsApp", wechat: "微信", phone: "电话",
      interest: "感兴趣的款号或幅宽（选填）", notes: "备注（选填）",
      note: "资料仅用于寄样与回复，不对外提供。",
      send: "生成请求", cancel: "取消",
      alt: "或直接发邮件到 <a href=\"mailto:sales@novocanvo.com\">sales@novocanvo.com</a>",
      errReq: "请填写姓名、国家/地区与收货地址。",
      errNeed: "请至少留一种联系方式。",
      done: "已交给邮件客户端。若没有自动打开，请把同样内容发到 sales@novocanvo.com。",
      other: "其他", subject: "索取样品卡"
    }
  };
  var box = null, lastTrigger = null;

  function lang() { return (document.documentElement.getAttribute('data-lang') === 'zh') ? 'zh' : 'en'; }

  function countryOptions(zh) {
    var out = '<option value="">' + T[zh].pick + '</option>';
    COUNTRIES.forEach(function (c) {
      var p = c.split('|');
      var label = (zh === 'zh' ? p[1] + '　' + p[0] : p[0]);
      out += '<option value="' + p[0] + '">' + label + '</option>';
    });
    out += '<option value="Other">' + T[zh].other + '</option>';
    return out;
  }

  function build(zh) {
    var t = T[zh];
    return '<div class="sw-scrim" data-sw-close></div>' +
      '<div class="sw-card" role="dialog" aria-modal="true" aria-label="' + t.title + '">' +
        '<div class="sw-head"><h3>' + t.title + '</h3>' +
          '<button class="sw-x" type="button" data-sw-close aria-label="Close">✕</button></div>' +
        '<p class="sw-lede">' + t.lede + '</p>' +
        '<form class="sw-form" novalidate>' +
          '<div class="sw-row">' +
            '<label class="sw-field"><span>' + t.name + '</span><input name="name" autocomplete="name"></label>' +
            '<label class="sw-field"><span>' + t.company + '</span><input name="company" autocomplete="organization"></label>' +
          '</div>' +
          '<div class="sw-row">' +
            '<label class="sw-field"><span>' + t.job + '</span><input name="jobtitle" autocomplete="organization-title"></label>' +
            '<label class="sw-field"><span>' + t.website + '</span><input name="website" inputmode="url"></label>' +
          '</div>' +
          '<label class="sw-field"><span>' + t.country + '</span><select name="country">' + countryOptions(zh) + '</select></label>' +
          '<label class="sw-field"><span>' + t.address + '</span><textarea name="address" rows="3"></textarea></label>' +
          '<p class="sw-sub">' + t.reach + '</p>' +
          '<div class="sw-row">' +
            '<label class="sw-field"><span>' + t.email + '</span><input name="email" type="email" autocomplete="email"></label>' +
            '<label class="sw-field"><span>' + t.whatsapp + '</span><input name="whatsapp"></label>' +
          '</div>' +
          '<div class="sw-row">' +
            '<label class="sw-field"><span>' + t.wechat + '</span><input name="wechat"></label>' +
            '<label class="sw-field"><span>' + t.phone + '</span><input name="phone" autocomplete="tel"></label>' +
          '</div>' +
          '<label class="sw-field"><span>' + t.interest + '</span><input name="interest"></label>' +
          '<label class="sw-field"><span>' + t.notes + '</span><textarea name="notes" rows="2"></textarea></label>' +
          '<p class="sw-note">' + t.note + '</p>' +
          '<p class="sw-err" hidden></p>' +
          '<div class="sw-actions">' +
            '<button class="sw-btn" type="submit">' + t.send + '</button>' +
            '<button class="sw-btn ghost" type="button" data-sw-close>' + t.cancel + '</button>' +
          '</div>' +
          '<p class="sw-alt">' + t.alt + '</p>' +
        '</form>' +
      '</div>';
  }

  function openModal() {
    var zh = lang();
    if (!box) {
      box = document.createElement('div');
      box.className = 'sw-modal';
      box.hidden = true;
      document.body.appendChild(box);
      box.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('[data-sw-close]')) closeModal();
      });
      box.addEventListener('submit', function (e) { if (e.target.tagName === 'FORM') { e.preventDefault(); submit(e.target); } });
    }
    box.innerHTML = build(zh);
    box.hidden = false;
    document.body.classList.add('sw-open');
    var first = box.querySelector('input,select,textarea');
    if (first) first.focus();
  }

  function closeModal() {
    if (!box || box.hidden) return;
    box.hidden = true;
    box.innerHTML = '';
    document.body.classList.remove('sw-open');
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
  }

  function val(f, n) { var el = f.elements[n]; return el ? String(el.value || '').trim() : ''; }

  function submit(f) {
    var zh = lang(), t = T[zh], err = box.querySelector('.sw-err');
    var need = ['name', 'country', 'address'].filter(function (n) { return !val(f, n); });
    if (need.length) { err.textContent = t.errReq; err.hidden = false; return; }
    var ways = ['email', 'whatsapp', 'wechat', 'phone'].filter(function (n) { return val(f, n); });
    if (!ways.length) { err.textContent = t.errNeed; err.hidden = false; return; }
    err.hidden = true;
    var lines = [
      (zh === 'zh' ? '姓名' : 'Name') + ': ' + val(f, 'name'),
      (zh === 'zh' ? '公司' : 'Company') + ': ' + (val(f, 'company') || '-'),
      (zh === 'zh' ? '职位' : 'Job title') + ': ' + (val(f, 'jobtitle') || '-'),
      (zh === 'zh' ? '公司网站' : 'Website') + ': ' + (val(f, 'website') || '-'),
      (zh === 'zh' ? '国家/地区' : 'Country') + ': ' + val(f, 'country'),
      (zh === 'zh' ? '收货地址' : 'Delivery address') + ': ' + val(f, 'address'),
      '',
      'Email: ' + (val(f, 'email') || '-'),
      'WhatsApp: ' + (val(f, 'whatsapp') || '-'),
      (zh === 'zh' ? '微信' : 'WeChat') + ': ' + (val(f, 'wechat') || '-'),
      (zh === 'zh' ? '电话' : 'Phone') + ': ' + (val(f, 'phone') || '-'),
      '',
      (zh === 'zh' ? '感兴趣' : 'Interested in') + ': ' + (val(f, 'interest') || '-'),
      (zh === 'zh' ? '备注' : 'Notes') + ': ' + (val(f, 'notes') || '-')
    ];
    var href = 'mailto:sales@novocanvo.com?subject=' +
      encodeURIComponent(t.subject + ' — ' + val(f, 'country')) +
      '&body=' + encodeURIComponent(lines.join('\n'));
    box.setAttribute('data-last-mailto', href);   /* 便于机检：记录最后生成的 mailto */
    window.location.href = href;
    var note = box.querySelector('.sw-note');
    note.textContent = t.done;
    note.style.color = '#1b1c1d';
  }

  document.addEventListener('click', function (e) {
    var trg = e.target && e.target.closest ? e.target.closest('[data-swatch]') : null;
    if (!trg) return;
    e.preventDefault();
    lastTrigger = trg;
    openModal();
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.keyCode === 27) && box && !box.hidden) closeModal();
  });
})();
