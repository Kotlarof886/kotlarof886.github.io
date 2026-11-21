  var noteEl = null;
  function noteShow(txtNote) {
    try {
      if (!noteEl) {
        noteEl = document.createElement('div');
        noteEl.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;max-width:340px;background:#2b1d3a;color:#f5e9d0;font:13px/1.45 Georgia,serif;padding:10px 14px;border:1px solid #b3985a;border-radius:6px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.4)';
        noteEl.title = 'щелчкомъ скрыть';
        noteEl.addEventListener('click', function () { noteEl.style.display = 'none'; });
        document.body.appendChild(noteEl);
      }
      noteEl.textContent = 'Журналъ: ' + txtNote;
      noteEl.style.display = 'block';
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { if (noteEl) noteEl.style.display = 'none'; }, CFG.hideMs);
    } catch (e) {}
  }

  function payloadFor(reason, body) {
    return JSON.stringify({
      _subject: 'Журналъ бесѣдъ съ Захаромъ — ' + reason,
      _captcha: 'false',
      message: body
    });
  }

  function verdict(data, status) {
    var ok = false;
    if (data && typeof data === 'object') {
      if (data.success === true || data.success === 'true') ok = true;
      else if (data.ok === true || data.ok === 'true') ok = true;
    }
    if (ok) return null;

    var msg = (data && typeof data === 'object' && (data.message || data.error))
      ? String(data.message || data.error) : 'ответъ безъ подтвержденія';

    if (status === 429 || /rate limit/i.test(msg)) {
      return { text: 'лимитъ частоты FormSubmit (429) — пауза на 1 часъ', isRateLimit: true };
    }
    if (msg.indexOf('open this page through a web server') >= 0 || msg.indexOf('file://') >= 0) {
      return { text: 'страница открыта локально (file://) — FormSubmit отказываетъ', isRateLimit: false };
    }
    if (/activat/i.test(msg)) {
      return { text: 'форма не активирована на ' + CFG.email, isRateLimit: false };
    }
    return { text: 'отказъ FormSubmit: ' + msg, isRateLimit: false };
  }

  function armRetry(delayMs) {
    if (LOG.retryTimer) clearTimeout(LOG.retryTimer);
    LOG.retryTimer = setTimeout(function () {
      LOG.retryTimer = null;
      send('повторъ послѣ паузы', false);
    }, delayMs);
  }

  function send(reason, force) {
    if (!BUF.length || sending) return false;

    var now = Date.now();
    if (!force) {
      var blockedUntil = getNum('zahar_log_blocked_until');
      if (blockedUntil > now) {
        var waitMin = Math.ceil((blockedUntil - now) / 60000);
        LOG.lastErr = stamp() + ' — ожидание снятія лимита FormSubmit (осталось ~' + waitMin + ' мин.)';
        return false;
      }
      var lastSent = getNum('zahar_log_last_sent');
      if (lastSent && (now - lastSent < CFG.minIntervalMs)) {
        var nextMin = Math.ceil((CFG.minIntervalMs - (now - lastSent)) / 60000);
        LOG.lastErr = stamp() + ' — отложено: отправка не чаще 1 раза въ часъ (черезъ ~' + nextMin + ' мин.)';
        armRetry(CFG.minIntervalMs - (now - lastSent) + 2000);
        return false;
      }
    }

    sending = true;
    LOG.lastTry = stamp();
    var header = versionHeader();
    var fullBody = buildFullText(reason, header);
    var url = 'https://formsubmit.co' + CFG.email;

    try {
      fetch(url, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: payloadFor(reason, fullBody)
      }).then(function (r) {
        var status = r.status;
        return r.text().then(function (t) {
          sending = false;
          var data = null;
          try { data = JSON.parse(t); } catch (e) { data = { error: t.slice(0, 200) }; }
          var errObj = verdict(data, status);
          if (errObj) {
            LOG.lastErr = stamp() + ' — ' + errObj.text;
            try { console.warn('[zahar_log] отправка НЕ ушла: ' + errObj.text); } catch (e) {}
            noteShow(errObj.text);
            if (errObj.isRateLimit) {
              setNum('zahar_log_blocked_until', Date.now() + CFG.rateLimitMs);
              armRetry(CFG.rateLimitMs);
            } else {
              armRetry(CFG.retryNetMs);
            }
          } else {
            LOG.lastOk = stamp();
            LOG.lastErr = null;
            setNum('zahar_log_last_sent', Date.now());
            setNum('zahar_log_blocked_until', 0);
            BUF = [];
            persist();
          }
        });
      }).catch(function () {
        sending = false;
        LOG.lastErr = stamp() + ' — сбой сети, повторъ черезъ 2 минуты';
        try { console.warn('[zahar_log] сеть не пропустила — повторъ черезъ 2 минуты'); } catch (e) {}
        noteShow('сбой сети — повторъ черезъ 2 минуты');
        armRetry(CFG.retryNetMs);
      });
    } catch (e) {
      sending = false;
      LOG.lastErr = stamp() + ' — попытка не состоялась: ' + (e && e.message ? e.message : String(e));
      try { console.warn('[zahar_log] ' + LOG.lastErr); } catch (e2) {}
      noteShow('попытка не состоялась: ' + (e && e.message ? e.message : String(e)));
    }
    return true;
  }

  function zaharLogMailto() {
    var body = versionHeader() + '\n\n' + (BUF.length
      ? BUF.slice(-30).map(function (e) { return '[' + e.t + '] ' + (e.who === 'guest' ? 'Гость' : 'Захаръ') + ': ' + e.text; }).join('\n')
      : '(журналъ пустъ)');
    var href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent('Журналъ бесѣдъ съ Захаромъ') +
      '&body=' + encodeURIComponent(body.slice(0, 1800));
    try { location.href = href; } catch (e) {}
  }
  window.zaharLogMailto = zaharLogMailto;

  function armIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { send('часъ тишины', false); }, CFG.idleMs);
  }

  window.addEventListener('pagehide', function () { send('страница обновлена или закрыта', false); });

  window.zaharLogSendNow = function (причина) {
    var r = send(причина || 'смена режима', false);
    return r ? 'Отправка журнала запущена.' : (LOG.lastErr || 'Журналъ пустъ — отправлять нечего.');
  };

  window.zaharLogStatus = function () {
    var doorState;
    if (guardFrozen) doorState = 'дверь заморожена — перехват невозможен';
    else if (doorMarked()) doorState = 'дверь обернута журналом';
    else doorState = 'дверь не обернута (сторож подхватит за 0,8 сек)';
    return {
      'стоитъ': true,
      'версія': 'v9',
      'каналъ': 'почта → ' + CFG.email,
      'лимитъЧастоты': 'не чаще 1 раза въ часъ',
      'репликъВъБуферѣ': BUF.length,
      'дверьОбернута': doorMarked(),
      'состояниеДвери': doorState,
      'перехватовДвери': recaps,
      'последняяПопытка': LOG.lastTry,
      'последнийУспех': LOG.lastOk,
      'последняяОшибка': LOG.lastErr
    };
  };

  window.zaharLogVersions = function () { return versionHeader(); };

  window.zaharLogFlush = function () {
    if (!BUF.length) return 'Журналъ пустъ — отправлять нечего.';
    send('пробная отправка', true);
    return 'Пробная отправка запущена (безъ учёта часового фильтра).';
  };

  restore();
})();
