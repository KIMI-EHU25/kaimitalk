(function(){
  const COPY = {
    register: {
      pill:    '✦ 个人资料',
      title:   '设置你的名字',
      sub:     '这是你在应用内的显示名称，之后可在用户菜单中修改。',
      confirm: '完成注册',
      note:    '完成后可立即开始使用',
    },
    edit: {
      pill:    '✦ 修改名称',
      title:   '修改你的名字',
      sub:     '更新你在应用内的显示名称。',
      confirm: '保存',
      note:    '',
    },
  };

  let mode = 'register';

  function showErr(msg){
    const el = document.getElementById('nameErr');
    el.textContent = msg;
    el.hidden = !msg;
  }

  function applyMode(){
    const c = COPY[mode];
    document.getElementById('namePill').textContent = c.pill;
    document.getElementById('nameTitle').textContent = c.title;
    document.getElementById('nameSub').textContent = c.sub;
    document.getElementById('nameConfirmBtn').textContent = c.confirm;
    const note = document.getElementById('nameNote');
    note.textContent = c.note;
    note.hidden = !c.note;
    document.getElementById('nameBackdrop').dataset.mode = mode;
  }

  window.openNameRegister = function(nextMode){
    mode = nextMode === 'edit' ? 'edit' : 'register';
    applyMode();
    document.getElementById('nameBackdrop').hidden = false;
    document.getElementById('appRoot').classList.add('blurred');
    const input = document.getElementById('nameInput');
    const current = (window.AuthState && window.AuthState.user && window.AuthState.user.name) || '';
    input.value = mode === 'edit' ? current : '';
    showErr('');
    setTimeout(() => { input.focus(); input.select(); }, 50);
  };

  window.closeNameRegister = function(){
    if (mode === 'register') return;
    document.getElementById('nameBackdrop').hidden = true;
    if (!document.getElementById('loginBackdrop').hidden) return;
    if (!document.getElementById('phoneBackdrop').hidden) return;
    document.getElementById('appRoot').classList.remove('blurred');
  };

  window._closeNameRegisterAfterSave = function(){
    document.getElementById('nameBackdrop').hidden = true;
    if (!document.getElementById('loginBackdrop').hidden) return;
    if (!document.getElementById('phoneBackdrop').hidden) return;
    document.getElementById('appRoot').classList.remove('blurred');
  };

  window.confirmName = async function(){
    showErr('');
    const name = document.getElementById('nameInput').value.trim();
    if (!name){
      showErr('请输入显示名称');
      return;
    }
    const btn = document.getElementById('nameConfirmBtn');
    const originalLabel = COPY[mode].confirm;
    btn.disabled = true; btn.textContent = '提交中…';
    try {
      const r = await netFetch('/api/user/profile', {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name}),
        credentials: 'same-origin',
      }, '名称保存');
      const data = await r.json();
      if (!r.ok){
        showErr(data.error || '保存失败');
        btn.disabled = false; btn.textContent = originalLabel;
        return;
      }
      window._closeNameRegisterAfterSave();
      await window.refreshSession();
    } catch(_){
      btn.disabled = false; btn.textContent = originalLabel;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('nameInput');
    if (input){
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter'){ e.preventDefault(); window.confirmName(); }
      });
    }
  });
})();
