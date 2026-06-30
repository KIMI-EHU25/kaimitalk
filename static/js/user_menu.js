(function(){
  function initialsOf(name){
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1){
      const ch = parts[0];
      return ch.length >= 2 ? ch.slice(0,2).toUpperCase() : ch.toUpperCase();
    }
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }

  function render(user){
    const wrap = document.getElementById('userMenu');
    if (!user){ wrap.hidden = true; return; }
    wrap.hidden = false;
    document.getElementById('userName').textContent = user.name || '(未命名)';
    document.getElementById('userPlan').textContent = 'Free';
    document.getElementById('userAvatar').textContent = initialsOf(user.name);
  }

  window.renderUserMenu = render;

  function togglePop(force){
    const pop = document.getElementById('userPop');
    const trigger = document.getElementById('userTrigger');
    const open = force !== undefined ? force : pop.hidden;
    pop.hidden = !open;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('userTrigger');
    trigger.addEventListener('click', (e) => { e.stopPropagation(); togglePop(); });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#userMenu')) togglePop(false);
    });

    document.querySelectorAll('#userPop .user-row').forEach(btn => {
      btn.addEventListener('click', async () => {
        const act = btn.dataset.act;
        togglePop(false);
        if (act === 'rename'){
          window.openNameRegister('edit');
        } else if (act === 'intro'){
          if (typeof window.openIntro === 'function') window.openIntro();
        } else if (act === 'logout'){
          await netFetch('/auth/logout', {method:'POST', credentials:'same-origin'}, '退出登录');
          window.location.reload();
        }
      });
    });
  });
})();
