
(function(){
  if (window.__STATKISS_CODEBLOCK_OPTION__) return;
  window.__STATKISS_CODEBLOCK_OPTION__ = true;
  window.STATKISS_ENABLE_CODEBLOCK = true;
  function apply(){
    try {
      if (typeof window.__statkissApplyCodeblockOption === 'function') {
        window.__statkissApplyCodeblockOption(window.localRichEditor || null);
      }
    } catch (e) { try { console.warn('[LocalRichEditor] codeblock option apply failed', e); } catch (_) {} }
  }
  apply();
  ['mountStatkissContentEditor','mountEmbeddedContentEditor','initStatkissContentEditor','initEmbeddedContentEditor','autoMountStatkissContentEditor'].forEach(function(name){
    var fn = window[name];
    if (typeof fn !== 'function' || fn.__statkissCodeOptionWrap) return;
    var wrapped = function(){
      var result = fn.apply(this, arguments);
      if (result && typeof result.then === 'function') return result.then(function(editor){ apply(); return editor; });
      apply();
      return result;
    };
    wrapped.__statkissCodeOptionWrap = true;
    window[name] = wrapped;
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
})();
