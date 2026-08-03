(function(){
  const DAY = 86400000;
  const WEEKS = 53;

  function dayKey(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  /** Build a Set of local day-keys the user actually had activity on,
   *  from real session timestamps (created_at / updated_at). No fake
   *  or synthetic entries — days with zero sessions stay empty. */
  function collectActiveDays(){
    const counts = new Map();
    const sessions = (window.Sessions && window.Sessions.list) || [];
    sessions.forEach(meta => {
      [meta.created_at, meta.updated_at].forEach(ts => {
        if (!ts) return;
        const d = new Date(ts * 1000);
        const key = dayKey(d);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
    return counts;
  }

  function levelFor(count){
    if (!count) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 3;
    return 4;
  }

  function computeStreaks(counts, today){
    let cur = 0, max = 0, run = 0;
    // Longest streak: scan every day with activity in ascending order.
    const days = [...counts.keys()].sort();
    let prev = null;
    days.forEach(key => {
      if (prev !== null){
        const prevDate = new Date(prev + 'T00:00:00');
        const gapDays = Math.round((new Date(key + 'T00:00:00') - prevDate) / DAY);
        run = gapDays === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      if (run > max) max = run;
      prev = key;
    });
    // Current streak: walk backward from today while each day is active.
    let cursor = new Date(today);
    while (counts.has(dayKey(cursor))){
      cur++;
      cursor = new Date(cursor.getTime() - DAY);
    }
    return { cur, max };
  }

  function render(){
    const grid = document.getElementById('activityGrid');
    const empty = document.getElementById('activityEmpty');
    if (!grid) return;
    grid.innerHTML = '';

    const counts = collectActiveDays();
    const today = new Date();
    today.setHours(0,0,0,0);

    if (!counts.size){
      empty.hidden = false;
    } else {
      empty.hidden = true;
    }

    // Align the grid so the last column ends on today, GitHub-style.
    const totalDays = WEEKS * 7;
    const start = new Date(today.getTime() - (totalDays - 1) * DAY);
    // Shift back to the most recent Sunday on/before `start` so weeks line up.
    start.setDate(start.getDate() - start.getDay());

    const months = new Set();
    for (let i = 0; i < totalDays; i++){
      const d = new Date(start.getTime() + i * DAY);
      if (d > today) break;
      const key = dayKey(d);
      const count = counts.get(key) || 0;
      if (count) months.add(`${d.getFullYear()}-${d.getMonth()}`);
      const cell = document.createElement('div');
      cell.className = 'activity-cell';
      cell.dataset.level = String(levelFor(count));
      cell.title = `${key}${count ? ` · ${count} 次使用` : ''}`;
      grid.appendChild(cell);
    }

    const { cur, max } = computeStreaks(counts, today);
    document.getElementById('actTotalDays').textContent = String(counts.size);
    document.getElementById('actCurStreak').textContent = String(cur);
    document.getElementById('actMaxStreak').textContent = String(max);
    document.getElementById('actMonths').textContent = String(months.size);
  }

  window.openActivity = function(){
    render();
    document.getElementById('activityBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
  };

  window.closeActivity = function(){
    document.getElementById('activityBackdrop').hidden = true;
    document.body.style.overflow = '';
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      const b = document.getElementById('activityBackdrop');
      if (b && !b.hidden) window.closeActivity();
    }
  });
})();
