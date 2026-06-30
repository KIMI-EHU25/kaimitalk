(function(){
  window.openSafetyNotice = function(){
    document.getElementById('safetyBackdrop').hidden = false;
    populate();
  };
  window.closeSafetyNotice = function(){
    document.getElementById('safetyBackdrop').hidden = true;
  };

  function populate(){
    // Show the user the host they're currently on so they can compare.
    const host = window.location.host || '(未知)';
    document.getElementById('safetyExpectedHost').textContent =
      window.location.protocol + '//' + host;

    // Live connection-status dot.
    const el = document.getElementById('safetyConnStatus');
    const sec = window.location.protocol === 'https:';
    const local = /^(localhost|127\.|10\.|192\.168\.|::1)/.test(window.location.hostname);
    const parts = [];
    parts.push(sec ? '✅ HTTPS 加密' : '⚠️ HTTP 未加密(强烈建议改用 HTTPS)');
    parts.push(local ? '🏠 本地直连'   : '🌐 通过远程访问');
    parts.push(navigator.onLine ? '📶 网络正常' : '❌ 设备离线');
    el.innerHTML = parts.join(' · ');
    el.style.color = sec ? 'var(--good, #4ade80)' : '#fbbf24';

    // Region-specific DNS recommendation.
    loadDnsRecommendation();
  }

  let _dnsLoaded = false;
  async function loadDnsRecommendation(){
    const card  = document.getElementById('safetyDnsCard');
    const pill  = document.getElementById('safetyRegionPill');
    const sub   = document.getElementById('safetyDnsReason');
    const dns1  = document.getElementById('safetyDns1');
    const dns2  = document.getElementById('safetyDns2');
    const lbl1  = document.getElementById('safetyDnsLbl1');
    const lbl2  = document.getElementById('safetyDnsLbl2');

    try {
      const r = await fetch('/api/geo', {credentials:'same-origin'});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();

      const isCN = !!d.is_cn;
      const region = isCN ? '中国大陆' : (d.country || '海外');
      pill.textContent = region;
      pill.className = 'safety-region-pill ' + (isCN ? 'cn' : 'global');

      sub.textContent = d.dns.reason
        + (d.detection === 'fallback' ? '(IP 检测失败,默认按中国大陆配置)' : '');

      lbl1.textContent = '首选 · ' + d.dns.labels.primary;
      lbl2.textContent = '备用 · ' + d.dns.labels.secondary;
      dns1.textContent = d.dns.primary;
      dns2.textContent = d.dns.secondary;
      card.hidden = false;
      _dnsLoaded = true;
    } catch (e){
      // Fall back to the CN recommendation per project spec.
      pill.textContent = '中国大陆(默认)';
      pill.className = 'safety-region-pill cn';
      sub.textContent = '无法连接地理位置服务,默认推荐中国大陆 DNS。';
      lbl1.textContent = '首选 · DNSPod (腾讯)';
      lbl2.textContent = '备用 · AliDNS (阿里)';
      dns1.textContent = '119.29.29.29';
      dns2.textContent = '223.5.5.5';
      card.hidden = false;
    }
  }

  // Copy-to-clipboard for the DNS cards.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.safety-copy');
    if (!btn) return;
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    const text = target.textContent.trim();
    if (!text || text === '—') return;
    (navigator.clipboard ? navigator.clipboard.writeText(text)
                         : Promise.reject('no clipboard'))
      .then(() => {
        const prev = btn.textContent;
        btn.textContent = '已复制';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = prev; btn.classList.remove('copied'); }, 1500);
      })
      .catch(() => {
        // Fallback: select the text so the user can Ctrl+C.
        const range = document.createRange();
        range.selectNode(target);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
      });
  });

  // Close on Esc.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      const b = document.getElementById('safetyBackdrop');
      if (b && !b.hidden) window.closeSafetyNotice();
    }
  });

  /* --------------------------------------------------------------------
   * Lightweight injection canary: if a Chinese ISP injects a <script>
   * into the response, it usually lives in <body> and arrives after our
   * own scripts. We snapshot the expected script set at load time and
   * complain loudly if we ever see a mystery script later on.
   * -------------------------------------------------------------------- */
  function injectionGuard(){
    const allowedHosts = new Set([
      window.location.host,
      'cdn.jsdelivr.net',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
    ]);
    function isSuspicious(src){
      if (!src) return false;
      try {
        const u = new URL(src, window.location.href);
        return !allowedHosts.has(u.host);
      } catch (_) { return false; }
    }
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations){
        for (const n of m.addedNodes){
          if (n.tagName === 'SCRIPT' && isSuspicious(n.src)){
            console.warn('[safety] blocked unexpected script:', n.src);
            n.remove();
            const fab = document.getElementById('safetyBtn');
            if (fab) fab.style.background = '#f87171';
          }
        }
      }
    });
    obs.observe(document.documentElement, {childList:true, subtree:true});
  }
  document.addEventListener('DOMContentLoaded', injectionGuard);
})();
