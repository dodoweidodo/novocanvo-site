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

  var initial = param() || stored() || 'en';
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(initial); });
  } else {
    apply(initial);
  }
})();
