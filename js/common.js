/* =========================================================
   🎀 공통 도구 (모든 페이지에서 같이 써요)
   ========================================================= */

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 클립보드에 복사 (안 되면 옛날 방식으로 한 번 더 시도)
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}

// 화면 아래에 잠깐 뜨는 알림
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

// 이 브라우저 안에만 저장하기 (localStorage). 저장이 막힌 환경에서도 에러 안 나게
const store = {
  get(key, fallback = '') { try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) {} },
  json(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (e) { return fallback; } },
  setJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { toast('⚠️ 저장 공간이 꽉 찼어요!'); return false; } }
};

// 날짜 표시 도우미
const fmt = {
  date(ts) { const d = new Date(ts); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; },
  jpDate(ts) { const d = new Date(ts); return `${d.getFullYear()}年 ${String(d.getMonth() + 1).padStart(2, '0')}月 ${String(d.getDate()).padStart(2, '0')}日`; },
  ago(ts) {
    const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000);
    return days <= 0 ? '오늘' : days === 1 ? '어제' : `${days}일 전`;
  }
};

/* =========================================================
   💌 모달 팝업 (브라우저 기본 팝업 대신 쓰는 사이트 안 팝업)
   Modal.confirm('지울까요?')            → true / false
   Modal.prompt('제목', [{ name, label, value, placeholder, type }]) → { name: 값 } 또는 null
   Modal.choose('제목', [{ value, label }], 현재값) → 고른 value 또는 null
   ========================================================= */
const Modal = (() => {
  function open({ title = '♡ SYSTEM MESSAGE ♡', html = '', buttons = [{ label: 'OK', value: true }], focus }) {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'md-overlay';
      ov.innerHTML = `
        <div class="md-box" role="dialog" aria-modal="true">
          <div class="md-t"><span>${esc(title)}</span><button class="md-x" aria-label="닫기">✕</button></div>
          <div class="md-b">${html}</div>
          <div class="md-f">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>
        </div>`;
      document.body.appendChild(ov);
      const box = ov.querySelector('.md-box');
      const close = v => { ov.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = e => {
        if (e.key === 'Escape') close(null);
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); const b = buttons.findIndex(x => x.primary); close(collect(b >= 0 ? b : buttons.length - 1)); }
      };
      const collect = i => {
        const b = buttons[i];
        if (!b || b.value === null) return null;
        if (b.value !== 'form') return b.value;
        const out = {};
        box.querySelectorAll('[name]').forEach(el => out[el.name] = el.type === 'radio' ? (el.checked ? el.value : out[el.name]) : el.value);
        return out;
      };
      ov.addEventListener('mousedown', e => { if (e.target === ov) close(null); });
      ov.querySelector('.md-x').onclick = () => close(null);
      ov.querySelectorAll('.md-f button').forEach(btn => btn.onclick = () => close(collect(+btn.dataset.i)));
      document.addEventListener('keydown', onKey);
      setTimeout(() => (box.querySelector(focus || 'input, textarea, select') || box.querySelector('.md-f .btn:last-child'))?.focus(), 30);
    });
  }

  return {
    open,
    alert: (msg, title) => open({ title, html: `<p class="md-msg">${msg}</p>`, buttons: [{ label: 'OK ♡', value: true, cls: 'pink', primary: true }] }),
    confirm: (msg, { ok = '네 ♡', cancel = '아니요', title } = {}) => open({
      title, html: `<p class="md-msg">${msg}</p>`,
      buttons: [{ label: cancel, value: false, cls: 'white' }, { label: ok, value: true, cls: 'pink', primary: true }]
    }).then(v => v === true),
    prompt: (title, fields, { ok = '저장 ♡', msg = '' } = {}) => open({
      title,
      html: (msg ? `<p class="md-msg">${msg}</p>` : '') + fields.map(f => `
        <label class="md-field"><span>${esc(f.label || '')}</span>
          ${f.type === 'textarea'
            ? `<textarea class="tx" name="${f.name}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || '')}">${esc(f.value || '')}</textarea>`
            : `<input class="tx" name="${f.name}" type="${f.type || 'text'}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}" autocomplete="off">`}
        </label>`).join(''),
      buttons: [{ label: '취소', value: null, cls: 'white' }, { label: ok, value: 'form', cls: 'pink', primary: true }]
    }),
    choose: (title, options, current, { ok = '선택 ♡', msg = '' } = {}) => open({
      title,
      html: (msg ? `<p class="md-msg">${msg}</p>` : '') + '<div class="md-choices">' + options.map(o => `
        <label class="md-choice"><input type="radio" name="pick" value="${esc(o.value)}" ${o.value === current ? 'checked' : ''}><span>${esc(o.label)}</span></label>`).join('') + '</div>',
      buttons: [{ label: '취소', value: null, cls: 'white' }, { label: ok, value: 'form', cls: 'pink', primary: true }],
      focus: 'input:checked'
    }).then(v => v && v.pick !== undefined ? v.pick : null)
  };
})();

/* ---------- 페이지 번호 버튼 (◀ 1 … 4 5 6 … 20 ▶) ---------- */
function pagerHtml(page, pages) {
  if (pages <= 1) return '';
  return `<button data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>◀</button>` +
    Array.from({ length: pages }, (_, i) => i + 1)
      .filter(n => n === 1 || n === pages || Math.abs(n - page) <= 2)
      .map((n, i, arr) => (i && n - arr[i - 1] > 1 ? '<button disabled>…</button>' : '') + `<button data-page="${n}" class="${n === page ? 'on' : ''}">${n}</button>`)
      .join('') +
    `<button data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>▶</button>`;
}
