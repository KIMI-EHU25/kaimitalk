(function(){
  let iti = null;
  let resendInt = null;
  let resendLeft = 0;
  let mode = 'register'; // 'register' | 'login'

  const ROUTES = {
    register: { send: '/phone/send',       verify: '/phone/verify' },
    login:    { send: '/phone/login/send', verify: '/phone/login/verify' },
  };

  const COPY = {
    register: {
      pill: '✦ 最后一步',
      title: '绑定手机号',
      sub: '为保护账号安全，绑定后方可进入应用，此步骤无法跳过。',
      confirm: '确认绑定',
    },
    login: {
      pill: '✦ 手机号登录',
      title: '使用手机号登录',
      sub: '输入你的手机号，我们会发送一次性验证码。若是首次登录将自动创建账号。',
      confirm: '登录',
    },
  };

  function applyMode(){
    const c = COPY[mode];
    document.getElementById('phonePill').textContent = c.pill;
    document.getElementById('phoneTitle').textContent = c.title;
    document.getElementById('phoneSub').textContent = c.sub;
    document.getElementById('confirmBtn').textContent = c.confirm;
    document.getElementById('phoneBackdrop').dataset.mode = mode;
  }

  function ensureIti(){
    if (iti) return iti;
    const input = document.getElementById('phoneInput');
    iti = window.intlTelInput(input, {
      initialCountry: 'cn',
      preferredCountries: ['cn','us','hk','tw','sg','gb'],
      separateDialCode: true,
      useFullscreenPopup: false,
      countrySearch: true,
      fixDropdownWidth: false,
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.10/build/js/utils.js',
    });
    return iti;
  }

  function showErr(msg){
    const el = document.getElementById('phoneErr');
    el.textContent = msg;
    el.hidden = !msg;
  }

  function startResendTimer(){
    resendLeft = 60;
    const link = document.getElementById('resendLink');
    const label = document.getElementById('resendTimer');
    link.setAttribute('aria-disabled', 'true');
    label.textContent = `验证码已发送，剩余 ${resendLeft} 秒`;
    clearInterval(resendInt);
    resendInt = setInterval(() => {
      resendLeft--;
      if (resendLeft <= 0){
        clearInterval(resendInt);
        label.textContent = '验证码已过期';
        link.removeAttribute('aria-disabled');
      } else {
        label.textContent = `验证码已发送，剩余 ${resendLeft} 秒`;
      }
    }, 1000);
  }

  function currentPayload(){
    ensureIti();
    const cc = '+' + iti.getSelectedCountryData().dialCode;
    let national = '';
    try {
      national = iti.getNumber(window.intlTelInput.utils
        ? window.intlTelInput.utils.numberFormat.E164 : 0).replace(cc, '');
    } catch(_){
      national = document.getElementById('phoneInput').value.replace(/\D/g,'');
    }
    return { country_code: cc, phone: national };
  }

  function readOtp(){
    return Array.from(document.querySelectorAll('#otpRow .otp-cell'))
      .map(c => c.value.trim()).join('');
  }

  function resetForm(){
    document.getElementById('otpSection').hidden = true;
    document.getElementById('sendOtpBtn').disabled = false;
    document.getElementById('sendOtpBtn').textContent = '发送验证码';
    document.getElementById('confirmBtn').disabled = false;
    document.querySelectorAll('#otpRow .otp-cell').forEach(c => {
      c.value = ''; c.classList.remove('filled');
    });
    showErr('');
    clearInterval(resendInt);
  }

  window.openPhone = function(){
    mode = 'register';
    applyMode();
    resetForm();
    document.getElementById('phoneBackdrop').hidden = false;
    document.getElementById('appRoot').classList.add('blurred');
    ensureIti();
  };

  window.openPhoneLogin = function(){
    mode = 'login';
    applyMode();
    resetForm();
    document.getElementById('loginBackdrop').hidden = true;
    document.getElementById('phoneBackdrop').hidden = false;
    document.getElementById('appRoot').classList.add('blurred');
    ensureIti();
  };

  window.closePhone = function(){
    document.getElementById('phoneBackdrop').hidden = true;
    if (!document.getElementById('loginBackdrop').hidden) return;
    if (!document.getElementById('nameBackdrop').hidden) return;
    document.getElementById('appRoot').classList.remove('blurred');
  };

  window.cancelPhone = function(){
    if (mode !== 'login') return;
    clearInterval(resendInt);
    document.getElementById('phoneBackdrop').hidden = true;
    document.getElementById('loginBackdrop').hidden = false;
  };

  window.sendOtp = async function(){
    showErr('');
    ensureIti();
    if (!iti.isValidNumber()){
      showErr('手机号格式不正确，请检查');
      return;
    }
    const payload = currentPayload();
    const btn = document.getElementById('sendOtpBtn');
    btn.disabled = true; btn.textContent = '发送中…';
    try {
      const r = await netFetch(ROUTES[mode].send, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      }, '短信发送');
      const data = await r.json();
      if (!r.ok){
        showErr(data.error || '发送失败');
        btn.disabled = false; btn.textContent = '发送验证码';
        return;
      }
      document.getElementById('otpSection').hidden = false;
      startResendTimer();
      btn.textContent = '验证码已发送';
      if (data.dev_code){
        showErr(`开发模式：验证码 ${data.dev_code}`);
      }
    } catch(_){
      btn.disabled = false; btn.textContent = '发送验证码';
    }
  };

  window.resendOtp = function(){
    const link = document.getElementById('resendLink');
    if (link.getAttribute('aria-disabled') === 'true') return;
    window.sendOtp();
  };

  window.confirmOtp = async function(){
    showErr('');
    const code = readOtp();
    if (code.length !== 6){
      showErr('请输入 6 位验证码');
      return;
    }
    const payload = { ...currentPayload(), code };
    const btn = document.getElementById('confirmBtn');
    btn.disabled = true; btn.textContent = '验证中…';
    try {
      const r = await netFetch(ROUTES[mode].verify, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      }, '验证码校验');
      const data = await r.json();
      if (!r.ok){
        showErr(data.error || '验证失败');
        btn.disabled = false; btn.textContent = COPY[mode].confirm;
        return;
      }
      clearInterval(resendInt);
      window.closePhone();
      await window.refreshSession();
    } catch(_){
      btn.disabled = false; btn.textContent = COPY[mode].confirm;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const cells = document.querySelectorAll('#otpRow .otp-cell');
    cells.forEach((cell, idx) => {
      cell.addEventListener('input', () => {
        cell.value = cell.value.replace(/\D/g,'').slice(0,1);
        cell.classList.toggle('filled', !!cell.value);
        if (cell.value && cells[idx+1]) cells[idx+1].focus();
      });
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !cell.value && cells[idx-1]) cells[idx-1].focus();
      });
      cell.addEventListener('paste', (e) => {
        const txt = (e.clipboardData.getData('text') || '').replace(/\D/g,'').slice(0,6);
        if (!txt) return;
        e.preventDefault();
        cells.forEach((c,i) => {
          c.value = txt[i] || '';
          c.classList.toggle('filled', !!c.value);
        });
        cells[Math.min(txt.length, cells.length-1)].focus();
      });
    });
  });
})();
