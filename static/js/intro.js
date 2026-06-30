(function(){
  const STORAGE_KEY = 'kaimi_intro_seen';

  window.openIntro = function(){
    const dont = document.getElementById('introDont');
    if (dont) dont.checked = false;
    document.getElementById('introBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
  };

  /** Close the intro modal.  When `commitDontShow` is true (the "开始使用"
   *  button) we honour the checkbox; otherwise (the × close or Esc) we
   *  always remember that they've seen it so we don't spam on every load. */
  window.closeIntro = function(commitDontShow){
    document.getElementById('introBackdrop').hidden = true;
    document.body.style.overflow = '';
    const dont = document.getElementById('introDont');
    try {
      if (commitDontShow){
        if (dont && dont.checked === false){
          // user actively unchecked, respect that
          localStorage.removeItem(STORAGE_KEY);
        } else {
          localStorage.setItem(STORAGE_KEY, '1');
        }
      } else {
        // Soft close (× or Esc): still mark seen so it doesn't reappear.
        localStorage.setItem(STORAGE_KEY, '1');
      }
    } catch(_) { /* localStorage might be blocked — silently ignore */ }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      const b = document.getElementById('introBackdrop');
      if (b && !b.hidden) window.closeIntro();
    }
  });

  // Show on first load.
  document.addEventListener('DOMContentLoaded', () => {
    let seen = false;
    try { seen = localStorage.getItem(STORAGE_KEY) === '1'; }
    catch(_) {}
    if (!seen){
      // Tiny delay so it doesn't fight the auth gate for focus.
      setTimeout(() => window.openIntro(), 500);
    }
  });
})();
