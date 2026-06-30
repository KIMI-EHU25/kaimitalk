(function(){
  const Sessions = {
    list: [],
    currentSid: null,
    ctxTargetSid: null,
  };
  window.Sessions = Sessions;

  function fmtWhen(ts){
    if (!ts) return '刚刚';
    const d = new Date(ts * 1000);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    if (sameDay) return `今天 ${hh}:${mm}`;
    const yest = new Date(now); yest.setDate(now.getDate()-1);
    if (d.toDateString() === yest.toDateString()) return `昨天 ${hh}:${mm}`;
    return `${d.getMonth()+1}/${d.getDate()} ${hh}:${mm}`;
  }

  function renderItem(meta){
    const cls = 'hist-item' + (meta.id === Sessions.currentSid ? ' cur' : '') + (meta.archived ? ' archived' : '');
    return `<div class="${cls}" data-sid="${meta.id}">
      <div class="hist-content">
        <div class="hist-prev">${escapeHtml(meta.title)}</div>
        <div class="hist-when">${fmtWhen(meta.updated_at)}</div>
      </div>
    </div>`;
  }

  function escapeHtml(s){
    return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  function renderAll(){
    const list = document.getElementById('histList');
    if (!Sessions.list.length){
      list.innerHTML = `<div class="hist-item cur" data-sid="local-current">
        <div class="hist-content">
          <div class="hist-prev">新对话</div>
          <div class="hist-when">刚刚</div>
        </div>
      </div>`;
      document.getElementById('histCnt').textContent = '1';
      return;
    }
    list.innerHTML = Sessions.list.map(renderItem).join('');
    document.getElementById('histCnt').textContent = String(Sessions.list.length);
  }

  Sessions.refresh = async function(){
    if (!window.AuthState || !window.AuthState.user){
      Sessions.list = [];
      renderAll();
      return;
    }
    try {
      const r = await netFetch('/api/sessions', {credentials:'same-origin'}, '历史记录');
      if (!r.ok) return;
      const data = await r.json();
      Sessions.list = data.sessions || [];
      if (!Sessions.currentSid && Sessions.list.length){
        Sessions.currentSid = Sessions.list[0].id;
      }
      renderAll();
    } catch(_){}
  };

  Sessions.create = async function(){
    if (!window.AuthState || !window.AuthState.user){
      // Anonymous users get the placeholder local session.
      Sessions.currentSid = null;
      renderAll();
      return;
    }
    try {
      const r = await netFetch('/api/sessions', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({title:'新对话'}),
        credentials:'same-origin',
      }, '新建对话');
      if (!r.ok) return;
      const meta = await r.json();
      Sessions.list.unshift(meta);
      Sessions.currentSid = meta.id;
      renderAll();
    } catch(_){}
  };

  async function patchSession(sid, fields){
    const r = await netFetch(`/api/sessions/${sid}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(fields), credentials:'same-origin',
    }, '更新对话');
    if (!r.ok) return null;
    const updated = await r.json();
    const idx = Sessions.list.findIndex(m => m.id === sid);
    if (idx >= 0){
      if (updated.archived) Sessions.list.splice(idx, 1);
      else Sessions.list[idx] = updated;
    }
    renderAll();
    return updated;
  }

  async function deleteSession(sid){
    const r = await netFetch(`/api/sessions/${sid}`, {
      method:'DELETE', credentials:'same-origin',
    }, '删除对话');
    if (!r.ok) return;
    Sessions.list = Sessions.list.filter(m => m.id !== sid);
    if (Sessions.currentSid === sid) Sessions.currentSid = (Sessions.list[0]||{}).id || null;
    renderAll();
  }

  function startInlineRename(sid){
    const item = document.querySelector(`.hist-item[data-sid="${sid}"] .hist-prev`);
    if (!item) return;
    const orig = item.textContent;
    item.contentEditable = 'true';
    item.focus();
    document.execCommand && document.execCommand('selectAll', false, null);
    const finish = async (commit) => {
      item.contentEditable = 'false';
      item.removeEventListener('blur', onBlur);
      item.removeEventListener('keydown', onKey);
      const next = item.textContent.trim();
      if (commit && next && next !== orig){
        await patchSession(sid, {title: next});
      } else {
        item.textContent = orig;
      }
    };
    const onBlur = () => finish(true);
    const onKey = (e) => {
      if (e.key === 'Enter'){ e.preventDefault(); item.blur(); }
      else if (e.key === 'Escape'){ e.preventDefault(); item.textContent = orig; item.blur(); }
    };
    item.addEventListener('blur', onBlur);
    item.addEventListener('keydown', onKey);
  }

  /* Context menu plumbing */
  function showCtx(x, y, sid){
    Sessions.ctxTargetSid = sid;
    const m = document.getElementById('ctxMenu');
    m.hidden = false;
    const w = m.offsetWidth, h = m.offsetHeight;
    const px = Math.min(x, window.innerWidth - w - 8);
    const py = Math.min(y, window.innerHeight - h - 8);
    m.style.left = px + 'px';
    m.style.top = py + 'px';
  }
  function hideCtx(){
    document.getElementById('ctxMenu').hidden = true;
    Sessions.ctxTargetSid = null;
  }

  document.addEventListener('contextmenu', (e) => {
    const item = e.target.closest('.hist-item');
    if (!item) return;
    const sid = item.dataset.sid;
    if (!sid || sid === 'local-current') return;
    e.preventDefault();
    showCtx(e.clientX, e.clientY, sid);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ctxMenu')) hideCtx();
  });
  document.addEventListener('scroll', hideCtx, true);
  window.addEventListener('resize', hideCtx);

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#ctxMenu .ctx-row').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = Sessions.ctxTargetSid;
        const act = btn.dataset.act;
        hideCtx();
        if (!sid) return;
        if (act === 'rename') startInlineRename(sid);
        else if (act === 'archive') await patchSession(sid, {archived: true});
        else if (act === 'delete'){
          if (confirm('确定删除该对话？此操作无法撤销。')) await deleteSession(sid);
        }
      });
    });

    // Keyboard shortcuts when ctx menu open
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('ctxMenu').hidden) return;
      const k = e.key.toLowerCase();
      const map = {r:'rename', a:'archive', d:'delete'};
      if (map[k]){
        e.preventDefault();
        document.querySelector(`#ctxMenu .ctx-row[data-act="${map[k]}"]`).click();
      } else if (e.key === 'Escape'){
        hideCtx();
      }
    });

    // Click on a history item -> select it AND load its content
    document.getElementById('histList').addEventListener('click', (e) => {
      const item = e.target.closest('.hist-item');
      if (!item) return;
      const sid = item.dataset.sid;
      if (!sid || sid === 'local-current') return;
      Sessions.currentSid = sid;
      renderAll();
      loadSessionContent(sid);
    });
  });

  async function loadSessionContent(sid){
    try {
      const r = await netFetch(`/api/sessions/${sid}/content`, {credentials:'same-origin'}, '历史内容');
      if (!r.ok) return;
      const data = await r.json();
      const ta = document.getElementById('mainTa');
      const rc = document.getElementById('resultCard');
      const resText = document.getElementById('resText');
      const resDur = document.getElementById('resDur');
      const resLang = document.getElementById('resLang');

      // Repopulate the input box with the original source text.
      if (ta) ta.value = data.original_text || '';

      if (data.chinese_text){
        resText.textContent = data.chinese_text;
        const lang = (data.meta && data.meta.lang_from) || '—';
        resLang.textContent = lang + ' → zh-CN';
        const dur = (data.meta && data.meta.duration_ms) || 0;
        resDur.textContent = dur ? (dur/1000).toFixed(1) + 's' : '—';

        const audioBar = document.querySelector('#resultCard .audio-bar');
        if (data.audio_url){
          audioBar.style.display = '';
          if (typeof window.bindAudio === 'function'){
            window.bindAudio(data.audio_url + '?t=' + Date.now());
          }
        } else {
          audioBar.style.display = 'none';
        }
        rc.classList.add('show');
      } else {
        rc.classList.remove('show');
      }
    } catch(_){}
  }
  Sessions.loadContent = loadSessionContent;
})();
