/* Main-menu UI logic, lifted from kaimi_reader_v6 with auth gating wired in. */

function toggleSB(){
  document.getElementById('sidebar').classList.toggle('mob-open');
  document.getElementById('overlay').classList.toggle('show');
}

let voiceMode = false, files = [], uploadOpen = false, voiceCount = 0, recBarCount = 1;

/* -----------------------------------------------------------------------
   TTS voice picker
   -----------------------------------------------------------------------
   `currentTts` is the engine id that flows into FormData as `tts_engine`.
   Persisted in localStorage so the user's preferred voice survives reload. */
const TTS_LABELS = {
  xiaokai:           '小楷',
  xiaokai_senior_zh: '小楷的学姐',
  xiaokai_senior_en: '小楷的白人学姐',
};
const TTS_LANG_BADGE = {
  xiaokai:           'zh-CN',
  xiaokai_senior_zh: 'zh-CN',
  xiaokai_senior_en: 'en',
};
const TTS_STORAGE_KEY = 'kaimi_tts_engine';
// Default to the self-hosted 楷米阅读 voice (小楷的学姐).  This keeps the
// whole audio pipeline on our own server — no side-channel cloud call —
// which matters for users behind strict firewalls whose connection works
// fine but where an extra outbound request would stall the job.
let currentTts = 'xiaokai_senior_zh';
try {
  const stored = localStorage.getItem(TTS_STORAGE_KEY);
  // Migrate users whose browser still has the old cloud default from a
  // previous visit — silently upgrade them to the self-hosted voice.
  // Anyone who explicitly picked another voice keeps their choice.
  if (stored && TTS_LABELS[stored] && stored !== 'xiaokai') currentTts = stored;
} catch(_) {}

function setTtsEngine(eng){
  if (!TTS_LABELS[eng]) return;
  currentTts = eng;
  try { localStorage.setItem(TTS_STORAGE_KEY, eng); } catch(_) {}
  const lbl = document.getElementById('ttsLabel');
  if (lbl) lbl.textContent = TTS_LABELS[eng];
  document.querySelectorAll('#ttsPop .tts-row').forEach(r => {
    r.classList.toggle('selected', r.dataset.engine === eng);
  });
}

function toggleTtsPop(force){
  const pop = document.getElementById('ttsPop');
  const trig = document.getElementById('ttsTrigger');
  if (!pop || !trig) return;
  const open = force !== undefined ? force : pop.hidden;
  pop.hidden = !open;
  trig.setAttribute('aria-expanded', open ? 'true' : 'false');
}

document.addEventListener('DOMContentLoaded', () => {
  // Restore previous selection on load
  setTtsEngine(currentTts);

  const trig = document.getElementById('ttsTrigger');
  if (trig){
    trig.addEventListener('click', (e) => { e.stopPropagation(); toggleTtsPop(); });
  }
  document.querySelectorAll('#ttsPop .tts-row').forEach(r => {
    r.addEventListener('click', (e) => {
      e.stopPropagation();
      setTtsEngine(r.dataset.engine);
      toggleTtsPop(false);
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ttsPicker')) toggleTtsPop(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleTtsPop(false);
  });
});

function fileMeta(type){
  const doc = {cls:'ico-doc',svg:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'};
  const img = {cls:'ico-img',svg:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'};
  const aud = {cls:'ico-audio',svg:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'};
  const voc = {cls:'ico-voice',svg:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>'};
  return {docx:doc,doc:doc,img,image:img,audio:aud,voice:voc}[type] || doc;
}

function renderSeq(){
  const list = document.getElementById('seqList');
  const sec = document.getElementById('seqSection');
  if (!files.length){ sec.classList.remove('show'); return; }
  sec.classList.add('show');
  list.innerHTML = files.map((f,i) => {
    const m = fileMeta(f.type);
    return `<div class="seq-item" draggable="true" data-idx="${i}">
      <span class="drag-handle">⠿</span>
      <span class="seq-num">${i+1}</span>
      <div class="seq-file-ico ${m.cls}">${m.svg}</div>
      <span class="seq-name">${f.name}</span>
      <span class="seq-type">${f.ext}</span>
      <button class="seq-del" onclick="removeFile(${i})">×</button>
    </div>`;
  }).join('');
  list.querySelectorAll('.seq-item').forEach(setupDrag);
}

function removeFile(i){ files.splice(i,1); renderSeq(); if(!files.length) forceText(); }

function setupDrag(el){
  el.addEventListener('dragstart', () => el.classList.add('dragging'));
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    document.querySelectorAll('.seq-item').forEach(c => c.classList.remove('drag-over'));
    const items = [...document.querySelectorAll('#seqList .seq-item')];
    const nf = items.map(e => files[parseInt(e.dataset.idx)]);
    files.length = 0; files.push(...nf); renderSeq();
  });
  el.addEventListener('dragover', e => {
    e.preventDefault();
    document.querySelectorAll('.seq-item').forEach(c => c.classList.remove('drag-over'));
    el.classList.add('drag-over');
  });
  el.addEventListener('drop', e => {
    e.preventDefault();
    const drag = document.querySelector('.seq-item.dragging');
    if (drag && drag !== el){
      const list = document.getElementById('seqList');
      const all = [...list.querySelectorAll('.seq-item')];
      if (all.indexOf(drag) < all.indexOf(el)) list.insertBefore(drag, el.nextSibling);
      else list.insertBefore(drag, el);
    }
    el.classList.remove('drag-over');
  });
}

function addFile(name, type, fileObj){
  const extFromName = name && name.includes('.') ? name.split('.').pop().toUpperCase() : null;
  const extMap = {docx:'DOCX',img:'IMG',audio:'AUDIO',voice:'录音'};
  const ext = extFromName || extMap[type] || type.toUpperCase();
  files.push({name, type, ext, file: fileObj || null});
  renderSeq();
  uploadOpen = false;
  document.getElementById('uploadWrap').classList.remove('open');
  document.getElementById('plusBtn').classList.remove('open');
  if (!voiceMode) activateVoiceMode();
}

function pickFile(ev, type){
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  addFile(f.name, type, f);
  ev.target.value = '';
}

function toggleUpload(){
  uploadOpen = !uploadOpen;
  document.getElementById('uploadWrap').classList.toggle('open', uploadOpen);
  document.getElementById('plusBtn').classList.toggle('open', uploadOpen);
}

function activateVoiceMode(){
  voiceMode = true;
  document.getElementById('mtText').classList.remove('on');
  document.getElementById('mtVoice').classList.add('on');
  document.getElementById('mainTa').classList.add('faded');
  setTimeout(() => document.getElementById('voicePane').classList.add('visible'), 180);
}

function switchVoice(){ if (!voiceMode) activateVoiceMode(); }

function forceText(){
  voiceMode = false;
  document.getElementById('mtText').classList.add('on');
  document.getElementById('mtVoice').classList.remove('on');
  document.getElementById('voicePane').classList.remove('visible');
  setTimeout(() => document.getElementById('mainTa').classList.remove('faded'), 180);
  document.querySelectorAll('.rec-bar').forEach(b => { if(b._interval){ clearInterval(b._interval); b._interval = null; } });
  recBarCount = 1; voiceCount = 0;
  document.getElementById('voiceBars').innerHTML =
    `<button class="rec-bar" onclick="toggleRec(this)">
      <div class="pdot"></div>
      <span style="font-size:14px">🎙</span>
      <span class="idle-lbl">录音段落 1 — 点击开始</span>
      <span class="rtimer">00:00</span>
    </button>`;
  files = []; renderSeq();
}

function finalizeRec(btn){
  clearInterval(btn._interval);
  btn._interval = null;
  const bars = document.getElementById('voiceBars');
  btn.remove();
  recBarCount++;
  const el = document.createElement('button');
  el.className = 'rec-bar';
  el.setAttribute('onclick','toggleRec(this)');
  el.innerHTML = `<div class="pdot"></div>
    <span style="font-size:14px">🎙</span>
    <span class="idle-lbl">录音段落 ${recBarCount} — 点击开始</span>
    <span class="rtimer">00:00</span>`;
  bars.appendChild(el);
}

async function toggleRec(btn){
  if (btn.classList.contains('rec')){
    if (btn._recorder && btn._recorder.state === 'recording'){
      btn._recorder.stop();
    } else {
      finalizeRec(btn);
    }
    return;
  }

  if (!navigator.mediaDevices || !window.MediaRecorder){
    alert('当前浏览器不支持录音');
    return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio: true});
  } catch (e){
    alert('无法访问麦克风：' + (e.message || e.name));
    return;
  }

  const mimes = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'];
  const mime = mimes.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  const recorder = mime ? new MediaRecorder(stream, {mimeType: mime}) : new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    voiceCount++;
    const type = recorder.mimeType || 'audio/webm';
    const ext = type.includes('mp4') ? 'm4a' : (type.includes('ogg') ? 'ogg' : 'webm');
    const name = `语音${voiceCount}.${ext}`;
    const blob = new Blob(chunks, {type});
    const file = new File([blob], name, {type});
    addFile(name, 'voice', file);
    finalizeRec(btn);
  };

  btn._recorder = recorder;
  recorder.start();
  btn.classList.add('rec');
  let sec = 0;
  const timer = btn.querySelector('.rtimer');
  timer.style.display = 'block';
  btn._interval = setInterval(() => {
    sec++;
    timer.textContent =
      String(Math.floor(sec/60)).padStart(2,'0') + ':' +
      String(sec%60).padStart(2,'0');
  }, 1000);
}

/* The auth gate lives here: clicking 朗读 prompts login if needed. */
function startProcess(){
  window.requireAuth(runProcess);
}

function fmtTime(sec){
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

window.bindAudio = bindAudio;
function bindAudio(url){
  let audio = document.getElementById('resultAudio');
  if (!audio){
    audio = document.createElement('audio');
    audio.id = 'resultAudio';
    audio.preload = 'metadata';
    document.body.appendChild(audio);
  }
  audio.src = url;

  const playIco = document.querySelector('#resultCard .play-ico');
  const track = document.querySelector('#resultCard .aud-track');
  const fill = document.querySelector('#resultCard .aud-fill');
  const timeLbl = document.querySelector('#resultCard .aud-time');

  playIco.onclick = (e) => { e.stopPropagation(); audio.paused ? audio.play() : audio.pause(); };
  track.onclick = (e) => {
    const r = track.getBoundingClientRect();
    const pct = (e.clientX - r.left) / r.width;
    if (audio.duration) audio.currentTime = pct * audio.duration;
  };
  audio.onplay = () => { playIco.textContent = '❚❚'; };
  audio.onpause = () => { playIco.textContent = '▶'; };
  audio.onended = () => { playIco.textContent = '▶'; fill.style.width = '0%'; };
  audio.ontimeupdate = () => {
    const dur = audio.duration || 0;
    const cur = audio.currentTime || 0;
    fill.style.width = (dur ? (cur / dur * 100) : 0) + '%';
    timeLbl.textContent = fmtTime(cur) + ' / ' + fmtTime(dur);
  };
  audio.onloadedmetadata = () => {
    timeLbl.textContent = '0:00 / ' + fmtTime(audio.duration || 0);
  };
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function pollJob(statusUrl, onProgress){
  // Poll the worker until done.  Total wall-time has no cap (we just keep
  // making fresh 5-second requests), but each individual HTTP request is
  // tiny, so Cloudflare never times out.
  while (true){
    const r = await fetch(statusUrl, {credentials:'same-origin'});
    if (!r.ok){
      throw new Error('HTTP ' + r.status);
    }
    const data = await r.json();
    if (onProgress) onProgress(data);
    if (data.status === 'done'){
      // Worker can also indicate a soft failure via {ok:false, error}.
      if (data.result && data.result.ok === false){
        throw new Error(data.result.error || '处理失败');
      }
      return data.result;
    }
    if (data.status === 'error') throw new Error(data.error || '处理失败');
    await sleep(1500);
  }
}

async function runProcess(){
  const btn = document.getElementById('sendBtn');
  const lb = document.getElementById('loadingBar');
  const rc = document.getElementById('resultCard');
  const ta = document.getElementById('mainTa');
  const resText = document.getElementById('resText');
  rc.classList.remove('show');
  // Clear any stale audio from a previous run so the player bar doesn't
  // dangle while we're still translating the new input.
  clearResultAudio();
  btn.disabled = true; btn.textContent = '处理中…';
  lb.classList.add('show');

  const t0 = performance.now();
  try {
    const fd = new FormData();
    const text = (ta.value || '').trim();
    if (text) fd.append('text', text);
    files.forEach(f => { if (f.file) fd.append('files', f.file, f.name); });
    const sid = (window.Sessions && window.Sessions.currentSid) || '';
    if (sid) fd.append('sid', sid);
    // Voice / target-language picker.  Server validates against an allowlist.
    fd.append('tts_engine', currentTts || 'xiaokai_senior_zh');

    // 1. Submit the job. This returns within milliseconds with a job_id.
    const fetcher = window.netFetch || fetch;
    const submitRes = await fetcher('/api/translate', {
      method: 'POST',
      body: fd,
      credentials: 'same-origin',
    }, '朗读提交');
    if (!submitRes.ok){
      const err = await submitRes.json().catch(() => ({}));
      throw new Error(err.error || ('HTTP ' + submitRes.status));
    }
    const submitData = await submitRes.json();

    // Show a progress card right away so the user knows something's happening.
    document.getElementById('resDur').textContent = '...';
    document.getElementById('resLang').textContent = '处理中';
    resText.textContent = '正在翻译,请稍候...';
    rc.classList.add('show');

    // 2. Poll until the worker says done.
    const result = await pollJob(submitData.status_url, (state) => {
      btn.textContent = labelForStage(state);
      if (state.partial){
        resText.textContent = state.partial;
      }
    });

    // 3. Render the final result.
    const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
    document.getElementById('resDur').textContent = elapsed + 's';
    const tgt = result.target_lang || TTS_LANG_BADGE[currentTts] || 'zh-CN';
    document.getElementById('resLang').textContent = (result.src_lang || '—') + ' → ' + tgt;
    resText.textContent = result.chinese_text || '';

    const audioBar = document.querySelector('#resultCard .audio-bar');
    if (result.audio_url){
      audioBar.style.display = '';
      bindAudio(result.audio_url + '?t=' + Date.now());
    } else {
      audioBar.style.display = 'none';
    }

    rc.scrollIntoView({behavior:'smooth', block:'nearest'});

    if (window.Sessions){
      if (result.session_id) window.Sessions.currentSid = result.session_id;
      window.Sessions.refresh && window.Sessions.refresh();
    }
  } catch (e){
    resText.textContent = '处理失败：' + (e.message || e);
    document.querySelector('#resultCard .audio-bar').style.display = 'none';
    document.getElementById('resDur').textContent = '—';
    document.getElementById('resLang').textContent = '错误';
    rc.classList.add('show');
  } finally {
    lb.classList.remove('show');
    btn.disabled = false;
    btn.textContent = '朗读 ↗';
  }
}

function labelForStage(state){
  const stage = (state && state.progress && state.progress.stage) || '';
  const done = (state && state.progress && state.progress.done) || 0;
  const total = (state && state.progress && state.progress.total) || 0;
  if (stage.startsWith('translating')){
    return total ? `翻译中 ${done}/${total}` : '翻译中…';
  }
  if (stage.startsWith('processing file')){
    return `读取文件 ${done + 1}/${total}`;
  }
  if (stage === 'synthesizing audio')   return '生成语音…';
  if (stage === 'starting' || stage === 'queued') return '排队中…';
  return '处理中…';
}

// Clear any audio carried over from a previous run. The <audio> element is
// a singleton attached to document.body (see bindAudio), so without this it
// keeps the prior conversation's voice bound until new audio loads.
function clearResultAudio(){
  const old = document.getElementById('resultAudio');
  if (old){
    try { old.pause(); } catch(_){}
    old.removeAttribute('src');
    try { old.load(); } catch(_){}
  }
  const bar = document.querySelector('#resultCard .audio-bar');
  if (bar){
    bar.style.display = 'none';
    const fill = bar.querySelector('.aud-fill');
    if (fill) fill.style.width = '0%';
    const t = bar.querySelector('.aud-time');
    if (t) t.textContent = '0:00 / 0:00';
    const ico = bar.querySelector('.play-ico');
    if (ico) ico.textContent = '▶';
  }
}

function newChat(){
  forceText();
  document.getElementById('mainTa').value = '';
  document.getElementById('resultCard').classList.remove('show');
  clearResultAudio();
  if (window.Sessions) window.Sessions.create();
  const logo = document.querySelector('.brand-logo');
  logo.classList.add('new-chat-flash');
  setTimeout(() => logo.classList.remove('new-chat-flash'), 500);
  document.getElementById('mainScroll').scrollTo({top:0, behavior:'smooth'});
}
