(function(){
  let lastAction = null;

  function showToast(title, msg){
    const t = document.getElementById('netToast');
    document.getElementById('netToastTitle').textContent = title;
    document.getElementById('netToastMsg').textContent = msg;
    t.hidden = false;
  }
  function hideToast(){ document.getElementById('netToast').hidden = true; }

  window.dismissNetToast = hideToast;
  window.retryLastAction = function(){
    hideToast();
    if (typeof lastAction === 'function') lastAction();
  };

  window.netFetch = async function(url, opts, label){
    lastAction = () => window.netFetch(url, opts, label);
    try {
      const r = await fetch(url, opts);
      if (!r.ok && r.status >= 500){
        showToast('服务暂时不可用', `${label || '请求'} 失败 (${r.status})，请稍后重试。`);
      }
      return r;
    } catch (err){
      showToast('网络连接中断', '请求处理途中连接断开，结果未能返回，请检查网络后重试。');
      throw err;
    }
  };

  window.addEventListener('offline', () =>
    showToast('网络已断开', '检测到当前设备处于离线状态。'));
  window.addEventListener('online', hideToast);
})();
