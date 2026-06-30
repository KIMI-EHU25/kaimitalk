(function(){
  const State = {
    user: null,
    needsPhone: false,
    needsName: false,
    pendingAction: null,
  };
  window.AuthState = State;

  function blurMain(on){
    document.getElementById('appRoot').classList.toggle('blurred', on);
  }

  window.openLogin = function(pendingAction){
    State.pendingAction = pendingAction || null;
    document.getElementById('loginBackdrop').hidden = false;
    blurMain(true);
  };

  window.closeLogin = function(){
    document.getElementById('loginBackdrop').hidden = true;
    if (document.getElementById('phoneBackdrop').hidden &&
        document.getElementById('nameBackdrop').hidden){
      blurMain(false);
    }
  };

  window.loginWith = function(provider){
    window.location.href = `/auth/${provider}/login`;
  };

  /* Visitor (username-only) login flow */
  window.openVisitorLogin = function(){
    document.getElementById('loginChoices').hidden = true;
    document.getElementById('visitorPane').hidden = false;
    const inp = document.getElementById('visitorNameInput');
    inp.value = '';
    document.getElementById('visitorErr').hidden = true;
    setTimeout(() => inp.focus(), 50);
  };

  window.closeVisitorLogin = function(){
    document.getElementById('visitorPane').hidden = true;
    document.getElementById('loginChoices').hidden = false;
  };

  window.submitVisitorLogin = async function(){
    const inp = document.getElementById('visitorNameInput');
    const err = document.getElementById('visitorErr');
    const btn = document.getElementById('visitorConfirmBtn');
    const name = (inp.value || '').trim();
    err.hidden = true;
    if (!name){
      err.textContent = '请输入用户名'; err.hidden = false; return;
    }
    btn.disabled = true; btn.textContent = '提交中…';
    let httpStatus = 0;
    try {
      const r = await fetch('/auth/visitor', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({username: name}),
        credentials:'same-origin',
      });
      httpStatus = r.status;
      const data = await r.json().catch(() => ({}));
      if (!r.ok){
        err.textContent = (data.error || '登录失败') + ' (HTTP ' + r.status + ')';
        err.hidden = false;
        btn.disabled = false; btn.textContent = '进入';
        return;
      }
      btn.textContent = '进入';
      window.closeVisitorLogin();
      window.closeLogin();
      const u = await window.refreshSession();
      if (!u){
        // Cookie didn't stick — almost always JWT_COOKIE_SECURE=1 on HTTP,
        // or third-party-cookie blocking by the browser.
        err.textContent = '登录成功但浏览器拒绝保存登录凭证。\n'
                        + '请确认网站使用 HTTPS 访问,或在 .env 中将 JWT_COOKIE_SECURE 设为 0。';
        err.hidden = false;
        btn.disabled = false; btn.textContent = '进入';
        window.openVisitorLogin();
      }
    } catch (e){
      // Network failure (DNS hijack, blocked tunnel, offline, etc.)
      const msg = (e && e.message) ? e.message : e;
      err.textContent = '网络异常: ' + msg
                      + (httpStatus ? ' (HTTP ' + httpStatus + ')' : '')
                      + '\n如果在中国大陆且通过隧道访问,可能是 DNS 被劫持。'
                      + '请尝试切换网络或使用 1.1.1.1 / 8.8.8.8 DNS。';
      err.hidden = false;
      btn.disabled = false; btn.textContent = '进入';
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('visitorNameInput');
    if (inp){
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter'){ e.preventDefault(); window.submitVisitorLogin(); }
      });
    }
  });

  window.refreshSession = async function(){
    const r = await netFetch('/api/me', {credentials:'same-origin'}, '会话');
    const data = await r.json();
    State.user      = data.authenticated ? data.user : null;
    State.needsPhone = !!(State.user && State.user.needs_phone);
    State.needsName  = !!(State.user && State.user.needs_name);
    if (window.renderUserMenu) window.renderUserMenu(State.user);
    applyAuthGate();
    if (window.Sessions) window.Sessions.refresh();
    return State.user;
  };

  function applyAuthGate(){
    if (!State.user){
      return; // not logged in; main menu just sits there until 朗读 is clicked
    }
    // logged in — close login modal if open
    window.closeLogin();

    if (State.needsPhone){
      window.openPhone();
      return;
    }
    if (State.needsName){
      window.closePhone && window.closePhone();
      window.openNameRegister();
      return;
    }
    // fully onboarded
    window.closePhone && window.closePhone();
    window.closeNameRegister && window.closeNameRegister();
    if (typeof State.pendingAction === 'function'){
      const fn = State.pendingAction;
      State.pendingAction = null;
      fn();
    }
  }

  window.requireAuth = function(action){
    if (State.user && !State.needsPhone && !State.needsName){
      action();
      return;
    }
    State.pendingAction = action;
    if (!State.user){ window.openLogin(action); return; }
    if (State.needsPhone){ window.openPhone(); return; }
    if (State.needsName){ window.openNameRegister(); return; }
  };

  document.addEventListener('DOMContentLoaded', refreshSession);
})();
