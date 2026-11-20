/* =========================================================
   🎨 꾸미기 실험실
   ---------------------------------------------------------
   · 미리보기(iframe) 안의 화면이 곧 원본이에요.
     상자를 고치면 → 화면을 다시 코드로 읽어서 저장해요.
   · "목록"에서 고르는 일괄 바꾸기는 코드 글자를 통째로 바꾼 뒤 다시 그려요.
   · 저장은 전부 이 브라우저(localStorage)에만.
   ========================================================= */
(() => {
  const $ = id => document.getElementById(id);
  const K = { cur: 'lab.cur', imgs: 'lab.imgs', borders: 'lab.borders', hist: 'lab.colorHist', pals: 'lab.palettes', work: 'lab.workPal', snaps: 'lab.snaps', ui: 'lab.ui' };
  const ui = Object.assign({ qk: 'color', qkWhere: 'background-color', tab: 'box', mode: 'pick', w: 'pc', gMode: 'tile', gSize: 0, gTag: '', sample: 'せい♡観察日記 세이 관찰일지 ABC 123' }, store.json(K.ui, {}) || {});
  const saveUi = () => store.setJson(K.ui, ui);

  const SAMPLE = `<style>
.demo { max-width: 420px; margin: 20px auto; padding: 16px 18px; font-family: 'Mona12', sans-serif; color: #5a4a44;
  background: #fff; border: 1px solid #c9a48f; }
.demo h2 { margin: 0 0 8px; font-size: 16px; color: #f689b6; }
.demo p { margin: 0; font-size: 12px; line-height: 1.8; }
</style>
<div class="demo">
  <h2>♡ 꾸미기 실험실 ♡</h2>
  <p>위의 <b>🧾 코드</b>를 눌러 상태창·관찰일지 html 을 붙여 넣어 보세요.<br>상자를 누르면 여백·배경·테두리를 바로 바꿀 수 있어요.</p>
</div>`;

  /* ---------------- 상태 ---------------- */
  let cur = store.get(K.cur, '') || SAMPLE;
  let isDoc = /<html[\s>]/i.test(cur);
  const undo = [], redo = [];
  let sel = null;          // 미리보기에서 고른 상자
  let lastRange = null;    // 미리보기에서 드래그한 글자 범위
  let rep = null;          // 목록에서 고른 "바꿀 대상" { type: 'color'|'img'|'font', value }
  const frame = $('frame');
  const doc = () => frame.contentDocument;

  /* ---------------- 그리기 · 읽기 ---------------- */
  const LAB_CSS = `[data-lab-hov]{outline:1px dashed #5b9bd0 !important;outline-offset:2px !important}
[data-lab-sel]{outline:2px solid #f689b6 !important;outline-offset:4px !important}
body[contenteditable]{outline:none}`;

  function render(html) {
    isDoc = /<html[\s>]/i.test(html);
    const fontCss = FontLib.cached().map(f => f.css).join('\n');
    const head = `<style data-lab>${LAB_CSS}</style><style data-lab>${fontCss}</style>`;
    let src;
    if (isDoc) {
      src = /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>${head}`) : html.replace(/<html([^>]*)>/i, `<html$1><head>${head}</head>`);
    } else {
      src = `<!DOCTYPE html><html><head><meta charset="utf-8">${head}</head><body>${html}</body></html>`;
    }
    sel = null; lastRange = null;
    frame.srcdoc = src;
  }

  function serialize() {
    const d = doc(); if (!d || !d.body) return cur;
    const root = (isDoc ? d.documentElement : d.body).cloneNode(true);
    root.querySelectorAll('[data-lab]').forEach(n => n.remove());
    [root, ...root.querySelectorAll('[data-lab-sel],[data-lab-hov],[contenteditable],[spellcheck]')].forEach(n => {
      n.removeAttribute?.('data-lab-sel'); n.removeAttribute?.('data-lab-hov');
      if (n.tagName === 'BODY') { n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck'); }
    });
    root.querySelectorAll('[style=""]').forEach(n => n.removeAttribute('style'));
    if (isDoc) return '<!DOCTYPE html>\n' + root.outerHTML;
    return root.innerHTML.replace(/^\s+|\s+$/g, '');
  }

  // 화면을 고친 뒤 부르기 → 코드에 반영 + 되돌리기 기록
  function commit() {
    const html = serialize();
    if (html === cur) return;
    undo.push(cur); if (undo.length > 80) undo.shift(); redo.length = 0;
    cur = html; store.set(K.cur, cur); afterChange();
  }
  let ct = null;
  const commitSoon = () => { clearTimeout(ct); ct = setTimeout(commit, 500); };

  // 코드 글자를 통째로 바꿀 때
  function setHtml(html, { record = true } = {}) {
    if (record && html !== cur) { undo.push(cur); if (undo.length > 80) undo.shift(); redo.length = 0; }
    cur = html; store.set(K.cur, cur); render(cur); afterChange();
  }
  function afterChange() {
    $('bUndo').disabled = !undo.length; $('bRedo').disabled = !redo.length;
    if (!$('codeBox').hidden) $('codeTa').value = cur;
    scanList();
  }

  $('bUndo').onclick = () => { if (!undo.length) return; clearTimeout(ct); commit(); if (!undo.length) return; redo.push(cur); cur = undo.pop(); store.set(K.cur, cur); render(cur); afterChange(); toast('↶ 되돌렸어요'); };
  $('bRedo').onclick = () => { if (!redo.length) return; undo.push(cur); cur = redo.pop(); store.set(K.cur, cur); render(cur); afterChange(); toast('↷ 다시 했어요'); };
  const keyHandler = e => {
    if (!(e.ctrlKey || e.metaKey) || e.target.closest?.('textarea, input:not([type=range]), select')) return;
    const k = e.key.toLowerCase();
    if (k === 'a' && sel) { e.preventDefault(); selectAllIn(sel); return; }
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); $('bUndo').click(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); $('bRedo').click(); }
  };
  document.addEventListener('keydown', keyHandler);

  /* ---------------- 미리보기 준비 ---------------- */
  frame.addEventListener('load', () => {
    const d = doc(); if (!d) return;
    fitFrame();
    try { new ResizeObserver(fitFrame).observe(d.documentElement); } catch (e) {}
    d.addEventListener('mouseover', e => { if (ui.mode !== 'pick') return; d.querySelectorAll('[data-lab-hov]').forEach(n => n.removeAttribute('data-lab-hov')); if (e.target !== d.body && e.target !== d.documentElement) e.target.setAttribute('data-lab-hov', ''); });
    d.addEventListener('mouseout', e => e.target.removeAttribute?.('data-lab-hov'));
    d.addEventListener('pointerdown', e => Pos.down(e), true);
    d.addEventListener('click', e => {
      if (Pos.wasDrag()) { e.preventDefault(); e.stopPropagation(); return; }
      if (ui.mode === 'view') return;
      if (ui.mode === 'pick') { e.preventDefault(); e.stopPropagation(); }
      const t = e.target.nodeType === 1 ? e.target : e.target.parentElement;
      if (ui.mode === 'pick' || t !== d.body) select(t === d.documentElement ? d.body : t);
    }, true);
    d.addEventListener('input', commitSoon);
    d.addEventListener('keydown', keyHandler);
    d.addEventListener('selectionchange', onSel);
    d.addEventListener('mouseup', () => setTimeout(onSel, 0));
    d.addEventListener('scroll', () => hideFloat());
    applyMode();
  });
  function fitFrame() {
    const d = doc(); if (!d || !d.documentElement) return;
    const h = Math.max(d.documentElement.scrollHeight, d.body ? d.body.scrollHeight : 0, 200);
    frame.style.height = h + 'px';
  }

  /* ---------------- 모드 · 폭 ---------------- */
  function applyMode() {
    const d = doc();
    document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === ui.mode));
    if (!d || !d.body) return;
    if (ui.mode === 'text') { d.body.setAttribute('contenteditable', 'true'); d.body.setAttribute('spellcheck', 'false'); }
    else { d.body.removeAttribute('contenteditable'); d.body.removeAttribute('spellcheck'); hideFloat(); }
    d.querySelectorAll('[data-lab-hov]').forEach(n => n.removeAttribute('data-lab-hov'));
  }
  $('modeSeg').onclick = e => { const b = e.target.closest('[data-mode]'); if (!b) return; ui.mode = b.dataset.mode; saveUi(); applyMode(); };
  function applyW() {
    $('frameWrap').classList.toggle('phone', ui.w === 'phone');
    document.querySelectorAll('#wSeg button').forEach(b => b.classList.toggle('on', b.dataset.w === ui.w));
    setTimeout(fitFrame, 250);
  }
  $('wSeg').onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; ui.w = b.dataset.w; saveUi(); applyW(); };

  /* ---------------- 코드 칸 ---------------- */
  $('bCode').onclick = () => { const box = $('codeBox'); box.hidden = !box.hidden; if (!box.hidden) { $('codeTa').value = cur; $('codeTa').focus(); } };
  $('codeClose').onclick = () => { $('codeBox').hidden = true; };
  $('codeApply').onclick = () => { const v = $('codeTa').value.trim(); if (!v) { toast('코드가 비어 있어요'); return; } setHtml(v); toast('✔ 미리보기에 넣었어요'); };
  $('bCopy').onclick = async () => { clearTimeout(ct); commit(); toast(await copyText(withFontFaces(cur)) ? '📋 코드를 복사했어요!' : '⚠️ 복사 실패'); };

  // 폰트 라이브러리 폰트를 썼으면 @font-face 를 같이 붙여요
  function withFontFaces(html) { return html; } // (폰트를 고를 때 바로 <style data-fontface> 를 넣어둬서 여기선 그대로)
  function ensureFontFace(family) {
    const f = FontLib.get(family); const d = doc(); if (!f || !d) return;
    const holder = isDoc ? d.head : d.body;
    if (d.querySelector(`style[data-fontface="${CSS.escape(family)}"]`)) return;
    const st = d.createElement('style'); st.setAttribute('data-fontface', family); st.textContent = f.css;
    holder.insertBefore(st, holder.firstChild);
  }

  /* ---------------- 상자 고르기 ---------------- */
  const label = el => {
    if (!el || !el.tagName) return '';
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = [...el.classList].filter(c => !/^data-lab/.test(c)).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    return s;
  };
  function select(el) {
    const d = doc(); if (!d) return;
    d.querySelectorAll('[data-lab-sel]').forEach(n => n.removeAttribute('data-lab-sel'));
    sel = el && el.isConnected ? el : null;
    if (sel && sel !== d.body) sel.setAttribute('data-lab-sel', '');
    showBox();
  }
  function showBox() {
    const has = !!sel;
    Pos.show();
    $('boxEmpty').hidden = has; $('boxBody').hidden = !has;
    $('target').innerHTML = has ? `👆 고른 상자: <b>${esc(label(sel))}</b>` : '👆 미리보기에서 상자를 눌러 고르세요';
    goals();
    if (ui.tab === 'font') renderFonts();
    if (!has) return;
    const chain = []; let n = sel; while (n && n.tagName && n.tagName !== 'HTML') { chain.unshift(n); n = n.parentElement; }
    $('crumb').innerHTML = chain.map((x, i) => `${i ? '<i>›</i>' : ''}<button data-i="${i}" class="${x === sel ? 'on' : ''}">${esc(label(x))}</button>`).join('');
    $('crumb').onclick = e => { const b = e.target.closest('[data-i]'); if (b) select(chain[+b.dataset.i]); };
    const kids = [...sel.children].filter(k => !k.hasAttribute('data-lab') && !/^(STYLE|SCRIPT|BR)$/.test(k.tagName));
    $('kids').innerHTML = kids.slice(0, 30).map((k, i) => `<button data-k="${i}">${esc(label(k))}</button>`).join('');
    $('kids').onclick = e => { const b = e.target.closest('[data-k]'); if (b) select(kids[+b.dataset.k]); };
    const cs = frame.contentWindow.getComputedStyle(sel);
    document.querySelectorAll('.bx-n').forEach(inp => { inp.value = parseFloat(cs.getPropertyValue(inp.dataset.p)) || 0; });
    $('bxSize').textContent = `${Math.round(sel.getBoundingClientRect().width)} × ${Math.round(sel.getBoundingClientRect().height)}`;
    document.querySelectorAll('.lab-props [data-p]').forEach(inp => { inp.value = sel.style.getPropertyValue(inp.dataset.p) || ''; inp.placeholder = cs.getPropertyValue(inp.dataset.p); });
    $('bxStyle').value = sel.getAttribute('style') || '';
  }
  // 여백 숫자
  document.querySelectorAll('.bx-n').forEach(inp => {
    const apply = () => {
      if (!sel) return;
      const v = inp.value.trim(); const val = v === '' ? '' : (/^-?\d+(\.\d+)?$/.test(v) ? v + 'px' : v);
      const group = inp.dataset.p.split('-')[0];
      const targets = $('bxLink').checked ? ['top', 'right', 'bottom', 'left'].map(s => `${group}-${s}`) : [inp.dataset.p];
      targets.forEach(p => sel.style.setProperty(p, val));
      if ($('bxLink').checked) document.querySelectorAll(`.bx-n[data-p^="${group}-"]`).forEach(x => { if (x !== inp) x.value = v; });
      fitFrame(); commitSoon(); $('bxStyle').value = sel.getAttribute('style') || '';
    };
    inp.addEventListener('input', apply);
    inp.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault(); inp.value = (parseFloat(inp.value) || 0) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1); apply();
    });
    inp.addEventListener('wheel', e => { if (document.activeElement !== inp) return; e.preventDefault(); inp.value = (parseFloat(inp.value) || 0) + (e.deltaY < 0 ? 1 : -1); apply(); }, { passive: false });
  });
  document.querySelectorAll('.lab-props [data-p]').forEach(inp => {
    if (inp.closest('.lab-pane[data-pane="border"]')) return;
    inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (!sel) return;
      let v = inp.value.trim();
      if (/^-?\d+(\.\d+)?$/.test(v) && !['line-height'].includes(inp.dataset.p)) v += 'px';
      sel.style.setProperty(inp.dataset.p, v); fitFrame(); commitSoon(); $('bxStyle').value = sel.getAttribute('style') || '';
    });
  });
  document.querySelectorAll('[data-colorto]').forEach(b => b.onclick = () => {
    if (!sel) { toast('상자를 먼저 골라 주세요'); return; }
    sel.style.setProperty(b.dataset.colorto, CP.hex()); CP.pushHist(); commit(); showBox(); toast('🎨 칠했어요');
  });
  $('bxNoBg').onclick = () => { if (!sel) return; sel.style.setProperty('background-image', 'none'); commit(); showBox(); };
  $('bxNoBorder').onclick = () => { if (!sel) return; sel.style.setProperty('border-image', 'none'); commit(); showBox(); };
  $('bxDel').onclick = async () => {
    const d = doc(); if (!sel || sel === d.body) { toast('지울 상자를 골라 주세요'); return; }
    if (!(await Modal.confirm(`<b>${esc(label(sel))}</b> 상자를 통째로 지울까요?<br><small>↶ 로 되돌릴 수 있어요</small>`))) return;
    const parent = sel.parentElement; sel.remove(); commit(); fitFrame(); select(parent); toast('🗑 지웠어요');
  };
  $('bxDup').onclick = () => {
    const d = doc(); if (!sel || sel === d.body) { toast('복제할 상자를 골라 주세요'); return; }
    const c = sel.cloneNode(true); c.removeAttribute('data-lab-sel'); c.removeAttribute('data-lab-hov');
    sel.after(c); commit(); fitFrame(); select(c); toast('📄 복제했어요');
  };
  $('bxStyleApply').onclick = () => { if (!sel) return; sel.setAttribute('style', $('bxStyle').value); commit(); fitFrame(); toast('적용했어요'); };

  /* ---------------- ➕ 요소 넣기 · 📐 위치 ---------------- */
  const Pos = (() => {
    const isFloat = el => !!el && el.style.position === 'absolute';
    const num = v => { const m = String(v || '').match(/^(-?[\d.]+)(px|%)?$/); return m ? { n: +(+m[1]).toFixed(2), u: m[2] || 'px' } : null; };
    // 넣기
    function insert() {
      const code = $('insCode').value.trim(); if (!code) { toast('넣을 코드를 붙여 넣어 주세요'); return; }
      const d = doc(); if (!d) return;
      let where = $('insWhere').value, base = sel;
      if (!base || base === d.body) { base = d.body; if (where === 'beforebegin') where = 'afterbegin'; if (where === 'afterend') where = 'beforeend'; }
      const tpl = d.createElement('template'); tpl.innerHTML = code;
      const first = [...tpl.content.childNodes].find(n => n.nodeType === 1);
      const frag = tpl.content;
      ({ beforeend: () => base.append(frag), afterbegin: () => base.prepend(frag), beforebegin: () => base.before(frag), afterend: () => base.after(frag) })[where]();
      commit(); fitFrame(); if (first) select(first); toast('➕ 넣었어요 · 아래에서 위치를 잡아 보세요');
    }
    $('insGo').onclick = insert;
    // 자주 쓰는 요소
    let snips = store.json('lab.snips', []) || [];
    const drawSnips = () => { $('insSnips').innerHTML = snips.map((x, i) => `<span class="ins-snip"><button data-si="${i}" title="${esc(x.code.slice(0, 120))}">${esc(x.name)}</button><button data-sd="${i}">✕</button></span>`).join(''); };
    $('insSave').onclick = async () => {
      const code = $('insCode').value.trim(); if (!code) { toast('저장할 코드를 먼저 붙여 넣어 주세요'); return; }
      const r = await Modal.prompt('💾 자주 쓰는 요소', [{ name: 'name', label: '이름', placeholder: '예: 분홍 리본 버튼' }]); if (!r) return;
      snips.unshift({ name: r.name.trim() || '요소', code }); store.setJson('lab.snips', snips); drawSnips(); toast('💾 저장했어요');
    };
    $('insSnips').onclick = async e => {
      const a = e.target.closest('[data-si]'); if (a) { $('insCode').value = snips[+a.dataset.si].code; return; }
      const dl = e.target.closest('[data-sd]'); if (dl && await Modal.confirm('이 요소를 목록에서 뺄까요?')) { snips.splice(+dl.dataset.sd, 1); store.setJson('lab.snips', snips); drawSnips(); }
    };
    drawSnips();

    // 위치 칸 보여주기
    function show() {
      const d = doc(); const ok = !!sel && d && sel !== d.body;
      $('posEmpty').hidden = ok; $('posBody').hidden = !ok; if (!ok) return;
      const fl = isFloat(sel); $('posFloat').checked = fl; $('posFree').hidden = !fl;
      const ml = sel.style.marginLeft, mr = sel.style.marginRight;
      const a = ml === 'auto' && mr === 'auto' ? 'center' : ml === 'auto' ? 'right' : mr === 'auto' ? 'left' : '';
      document.querySelectorAll('#posAlign button').forEach(b => b.classList.toggle('on', !fl && b.dataset.a === a));
      if (fl) {
        const x = num(sel.style.left), y = num(sel.style.top);
        $('posX').value = x ? x.n : 0; $('posXu').value = x ? x.u : '%';
        $('posY').value = y ? y.n : 0; $('posYu').value = y ? y.u : 'px';
        $('posZ').value = sel.style.zIndex || '';
      }
    }
    const parentOf = el => el.parentElement || doc().body;
    function unfloat(el) { ['position', 'left', 'top', 'right', 'bottom', 'transform'].forEach(p => el.style.removeProperty(p)); }
    $('posAlign').onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b || !sel) return;
      unfloat(sel);
      const cs = frame.contentWindow.getComputedStyle(sel);
      if (/^inline/.test(cs.display)) sel.style.setProperty('display', 'block');
      if (!sel.style.width) sel.style.setProperty('width', 'fit-content');
      const [l, r] = { left: ['0', 'auto'], center: ['auto', 'auto'], right: ['auto', '0'] }[b.dataset.a];
      sel.style.setProperty('margin-left', l); sel.style.setProperty('margin-right', r);
      commit(); fitFrame(); showBox();
    };
    $('posFloat').onchange = () => {
      if (!sel) return;
      if ($('posFloat').checked) {
        const par = parentOf(sel), w = frame.contentWindow;
        if (w.getComputedStyle(par).position === 'static') par.style.setProperty('position', 'relative');
        const r = sel.getBoundingClientRect(), pr = par.getBoundingClientRect();
        const x = r.left - pr.left - par.clientLeft, y = r.top - pr.top - par.clientTop;
        sel.style.setProperty('margin', '0'); sel.style.setProperty('position', 'absolute');
        sel.style.setProperty('left', (par.clientWidth ? (x / par.clientWidth * 100).toFixed(2) : 0) + '%');
        sel.style.setProperty('top', Math.round(y) + 'px');
        if (!sel.style.zIndex) sel.style.setProperty('z-index', '5');
        toast('🎈 띄웠어요 · 끌어서 옮겨 보세요');
      } else { unfloat(sel); sel.style.removeProperty('z-index'); }
      commit(); fitFrame(); showBox();
    };
    function setXY() {
      if (!isFloat(sel)) return;
      sel.style.setProperty('left', (+$('posX').value || 0) + $('posXu').value);
      sel.style.setProperty('top', (+$('posY').value || 0) + $('posYu').value);
      commitSoon();
    }
    ['posX', 'posY'].forEach(id => {
      $(id).addEventListener('input', setXY);
      $(id).addEventListener('keydown', e => { if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); $(id).value = +((+$(id).value || 0) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)).toFixed(2); setXY(); });
    });
    // 단위를 바꾸면 같은 자리를 새 단위로 다시 계산
    ['posXu', 'posYu'].forEach(id => $(id).onchange = () => {
      if (!isFloat(sel)) return;
      const par = parentOf(sel), cs = frame.contentWindow.getComputedStyle(sel);
      const isX = id === 'posXu', px = parseFloat(isX ? cs.left : cs.top), size = isX ? par.clientWidth : par.clientHeight;
      $(isX ? 'posX' : 'posY').value = $(id).value === '%' ? (size ? +(px / size * 100).toFixed(2) : 0) : Math.round(px);
      setXY();
    });
    $('posZ').oninput = () => { if (!sel) return; sel.style.setProperty('z-index', $('posZ').value.trim()); commitSoon(); };
    $('posUp').onclick = () => { $('posZ').value = (parseInt($('posZ').value) || 0) + 1; $('posZ').oninput(); };
    $('posDown').onclick = () => { $('posZ').value = (parseInt($('posZ').value) || 0) - 1; $('posZ').oninput(); };
    $('posGrid').onclick = e => {
      const b = e.target.closest('[data-g]'); if (!b || !sel) return;
      if (!isFloat(sel)) { $('posFloat').checked = true; $('posFloat').onchange(); }
      const [gx, gy] = b.dataset.g.split(',').map(Number);
      sel.style.setProperty('left', gx + '%'); sel.style.setProperty('top', gy + '%');
      sel.style.setProperty('transform', gx || gy ? `translate(-${gx}%, -${gy}%)` : 'none');
      if (!gx && !gy) sel.style.removeProperty('transform');
      commit(); showBox();
    };

    // 끌어서 옮기기
    let drag = null, dragged = false;
    function down(e) {
      if (ui.mode !== 'pick' || !isFloat(sel) || !sel.contains(e.target) || e.button !== 0) return;
      e.preventDefault();
      const cs = frame.contentWindow.getComputedStyle(sel), par = parentOf(sel);
      drag = { x: e.clientX, y: e.clientY, l: parseFloat(cs.left) || 0, t: parseFloat(cs.top) || 0, W: par.clientWidth, H: par.clientHeight, moved: false };
      const d = doc();
      const move = ev => {
        const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 3) return; drag.moved = true;
        const L = drag.l + dx, T = drag.t + dy;
        sel.style.setProperty('left', $('posXu').value === '%' && drag.W ? (L / drag.W * 100).toFixed(2) + '%' : Math.round(L) + 'px');
        sel.style.setProperty('top', $('posYu').value === '%' && drag.H ? (T / drag.H * 100).toFixed(2) + '%' : Math.round(T) + 'px');
        show();
      };
      const up = () => { d.removeEventListener('pointermove', move); d.removeEventListener('pointerup', up); if (drag.moved) { dragged = true; commit(); fitFrame(); } drag = null; };
      d.addEventListener('pointermove', move); d.addEventListener('pointerup', up);
    }
    const wasDrag = () => { const v = dragged; dragged = false; return v; };
    return { show, down, wasDrag };
  })();

  /* ---------------- 📦 상자 안 "바로 꾸미기" ---------------- */
  function showQk(t) {
    ui.qk = t; saveUi();
    document.querySelectorAll('#qkTabs button').forEach(b => b.classList.toggle('on', b.dataset.qk === t));
    document.querySelectorAll('.qk-pane').forEach(p => p.hidden = p.dataset.qkp !== t);
    if (t === 'color') drawQkSw();
  }
  $('qkTabs').onclick = e => { const b = e.target.closest('[data-qk]'); if (b) showQk(b.dataset.qk); };
  const drawQkWhere = () => document.querySelectorAll('#qkWhere button').forEach(b => b.classList.toggle('on', b.dataset.w === ui.qkWhere));
  $('qkWhere').onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; ui.qkWhere = b.dataset.w; saveUi(); drawQkWhere(); };
  function paint(color) {
    if (!sel) { toast('상자를 먼저 골라 주세요'); return; }
    if (ui.qkWhere === 'background-color' && $('qkBgOnly').checked) sel.style.setProperty('background-image', 'none');
    if (ui.qkWhere === 'border-color') { const cs = frame.contentWindow.getComputedStyle(sel); if (cs.borderTopStyle === 'none') { sel.style.setProperty('border-style', 'solid'); sel.style.setProperty('border-width', '1px'); } }
    sel.style.setProperty(ui.qkWhere, color); CP.set(color); CP.pushHist(); commit(); showBox(); drawQkSw();
    toast(`🎨 ${({ 'background-color': '배경색', color: '글자색', 'border-color': '테두리색' })[ui.qkWhere]} ${color}`);
  }
  function drawQkSw() {
    const used = [...new Set((cur.replace(/<style data-fontface[^>]*>[\s\S]*?<\/style>/gi, '').match(COLOR_RE) || []).map(c => c.toLowerCase().replace(/\s+/g, '')))].slice(0, 24);
    const hist = store.json(K.hist, []) || [], pals = store.json(K.pals, []) || [];
    const sw = c => `<button class="sw" data-q="${esc(c)}" title="${esc(c)}" style="background:${esc(c)}"></button>`;
    let html = '';
    if (hist.length) html += `<div class="qk-g">🕘 최근</div>` + hist.slice(0, 16).map(sw).join('');
    pals.forEach(p => { html += `<div class="qk-g">🎀 ${esc(p.name)}</div>` + p.colors.map(sw).join(''); });
    if (used.length) html += `<div class="qk-g">📄 이 코드에 쓰인 색</div>` + used.map(sw).join('');
    $('qkSw').innerHTML = html || '<span class="lab-help">🎨 색 탭에서 색을 고르거나 아래 칸에 코드를 넣어 보세요</span>';
  }
  $('qkSw').onclick = e => { const b = e.target.closest('[data-q]'); if (b) paint(b.dataset.q); };
  $('qkHex').addEventListener('keydown', e => { if (e.key === 'Enter') $('qkApply').click(); });
  $('qkHex').addEventListener('input', () => CP.set($('qkHex').value));
  $('qkApply').onclick = () => { const v = $('qkHex').value.trim(); if (v && !CP.set(v)) { toast('색 코드를 확인해 주세요'); return; } paint(CP.hex()); };
  $('curSw2').onclick = () => showTab('color');
  $('qkMode').onclick = e => $('gMode').querySelector(`[data-m="${e.target.closest('[data-m]')?.dataset.m}"]`)?.click();
  $('qkTag').onchange = () => { ui.gTag = $('qkTag').value; saveUi(); Gal.draw(); };
  $('qkGal').addEventListener('click', e => { const it = e.target.closest('[data-gid]'); if (!it) return; const x = Gal.get(it.dataset.gid); if (x) { if (x.mode) { ui.gMode = x.mode; saveUi(); drawGMode(); } applyImg(x, true); } });
  $('qkGal').addEventListener('mouseover', e => { const it = e.target.closest('[data-gid]'); if (!it) return; const x = Gal.get(it.dataset.gid); if (x) { peekOff(); peekOn({ ...x, mode: x.mode || ui.gMode }); } });
  $('qkGal').addEventListener('mouseleave', peekOff);
  $('qkBd').addEventListener('click', e => { const it = e.target.closest('[data-use]'); if (it) BD.use(it.dataset.use); });

  /* ---------------- 탭 ---------------- */
  function showTab(t) {
    ui.tab = t; saveUi();
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    document.querySelectorAll('.lab-tools .lab-pane').forEach(p => p.hidden = p.dataset.pane !== t);
    if (t === 'font') renderFonts();
  }
  $('tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); };

  // 각 탭 위에 "지금 무엇에 적용되는지" 안내
  function goals() {
    const box = sel ? `고른 상자 <b>${esc(label(sel))}</b>` : '<b>상자를 아직 안 골랐어요</b>';
    const repHtml = (type, what) => rep && rep.type === type ? `<div class="lab-goal rep">🔁 <b>바꾸기 대상</b> ${what} → 고르면 <b>쓰인 곳 전부</b> 바뀌어요 <button data-unrep>그만</button></div>` : '';
    $('imgGoal').innerHTML = repHtml('img', `<span>${esc(rep?.value || '').slice(0, 60)}</span>`) || `<div class="lab-goal">🎯 ${box}의 배경 이미지로 들어가요</div>`;
    $('fontGoal').innerHTML = repHtml('font', `<span>${esc(rep?.value || '')}</span>`) || `<div class="lab-goal">🎯 ✏️글자 모드에서 드래그한 글자가 있으면 그 글자에, 없으면 ${box}에 들어가요</div>`;
    $('colorGoal').innerHTML = repHtml('color', `<span class="lab-cur-sw" style="display:inline-block;vertical-align:middle;background:${esc(rep?.value || '')}"></span> ${esc(rep?.value || '')} <button data-repapply>지금 색으로 전부 바꾸기</button>`);
    $('bdGoal').innerHTML = `<div class="lab-goal">🎯 ${box}에 입혀요</div>`;
    document.querySelectorAll('[data-unrep]').forEach(b => b.onclick = () => { rep = null; goals(); scanList(); });
    document.querySelectorAll('[data-repapply]').forEach(b => b.onclick = () => replaceAll('color', rep.value, CP.hex()));
  }

  /* ---------------- 🔍 목록 (색·이미지·폰트 모으기) ---------------- */
  const COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g;
  const IMG_RE = /url\(\s*(['"]?)([^'")]+?)\1\s*\)|<img[^>]+src\s*=\s*(['"])([^'"]+)\3/gi;
  const FONT_RE = /font-family\s*:\s*([^;}<]+)/gi;
  function scanList() {
    const text = cur.replace(/<style data-fontface[^>]*>[\s\S]*?<\/style>/gi, '');
    const cMap = new Map();
    (text.match(COLOR_RE) || []).forEach(c => { const k = c.toLowerCase().replace(/\s+/g, ''); cMap.set(k, (cMap.get(k) || 0) + 1); });
    const iMap = new Map(); let m; IMG_RE.lastIndex = 0;
    while ((m = IMG_RE.exec(text))) { const u = (m[2] || m[4] || '').trim(); if (u && !/^data:/.test(u)) iMap.set(u, (iMap.get(u) || 0) + 1); else if (u) iMap.set(u, (iMap.get(u) || 0) + 1); }
    const fMap = new Map(); FONT_RE.lastIndex = 0;
    while ((m = FONT_RE.exec(text))) { const first = m[1].split(',')[0].trim().replace(/^['"]|['"]$/g, '').replace(/&quot;/g, ''); if (first && !/^(inherit|initial|unset)$/i.test(first)) fMap.set(first, (fMap.get(first) || 0) + 1); }
    $('lcN').textContent = cMap.size + '개'; $('liN').textContent = iMap.size + '개'; $('lfN').textContent = fMap.size + '개';
    $('lColors').innerHTML = [...cMap].sort((a, b) => b[1] - a[1]).map(([c, n]) => `<button class="sw ${rep?.type === 'color' && rep.value === c ? 'on' : ''}" data-c="${esc(c)}" title="${esc(c)} · ${n}곳" style="background:${esc(c)}"><small>${n}</small></button>`).join('') || '<span class="lab-help">없어요</span>';
    $('lImgs').innerHTML = [...iMap].map(([u, n]) => `<div class="li-it ${rep?.type === 'img' && rep.value === u ? 'on' : ''}" data-u="${esc(u)}" title="${esc(u)}" style="background-image:url('${esc(u)}')"><small>${n}곳</small><button class="sv" data-save="${esc(u)}" title="갤러리에 저장">💾</button></div>`).join('') || '<span class="lab-help">없어요</span>';
    $('lFonts').innerHTML = [...fMap].map(([f, n]) => `<button class="lf-it ${rep?.type === 'font' && rep.value === f ? 'on' : ''}" data-f="${esc(f)}" style="font-family:'${esc(f)}'"><span>${esc(f)}</span><small>${n}곳</small></button>`).join('') || '<span class="lab-help">없어요</span>';
  }
  $('lColors').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; rep = { type: 'color', value: b.dataset.c }; CP.set(b.dataset.c); scanList(); goals(); showTab('color'); };
  $('lImgs').onclick = e => {
    const s = e.target.closest('[data-save]'); if (s) { e.stopPropagation(); Gal.add(s.dataset.save); return; }
    const b = e.target.closest('[data-u]'); if (!b) return; rep = { type: 'img', value: b.dataset.u }; scanList(); goals(); showTab('img');
  };
  $('lFonts').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; rep = { type: 'font', value: b.dataset.f }; scanList(); goals(); showTab('font'); };

  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function replaceAll(type, from, to) {
    clearTimeout(ct); commit();
    let html = cur, n = 0;
    if (type === 'color') {
      const loose = from.startsWith('rgb') ? new RegExp(reEsc(from).replace(/,/g, '\\s*,\\s*').replace(/\\\(/, '\\(\\s*').replace(/\\\)$/, '\\s*\\)'), 'gi') : new RegExp(reEsc(from) + '(?![0-9a-fA-F])', 'gi');
      html = html.replace(loose, () => { n++; return to; });
    } else if (type === 'img') {
      html = html.split(from).join(to); n = cur.split(from).length - 1;
    } else if (type === 'font') {
      html = html.replace(/(font-family\s*:\s*)([^;}<]+)/gi, (all, a, list) => {
        const parts = list.split(','); const first = parts[0].trim().replace(/^['"]|['"]$/g, '').replace(/&quot;/g, '');
        if (first !== from) return all;
        n++; parts[0] = ` '${to}'`; return a + parts.join(',').trim();
      });
    }
    if (!n) { toast('바꿀 곳을 못 찾았어요'); return; }
    rep = type === 'font' ? { type, value: to } : { type, value: type === 'color' ? to.toLowerCase() : to };
    setHtml(html);
    if (type === 'font') setTimeout(() => { ensureFontFace(to); commit(); }, 300);
    toast(`🔁 ${n}곳을 바꿨어요`);
  }

  /* ---------------- 🔤 폰트 ---------------- */
  $('fSample').value = ui.sample;
  $('fSample').oninput = () => { ui.sample = $('fSample').value; saveUi(); document.querySelectorAll('.ft-it .sm').forEach(s => s.textContent = ui.sample || 'あいう 가나다 ABC'); };
  $('fQ').oninput = renderFonts;
  $('fReload').onclick = async () => {
    if (typeof Repo === 'undefined' || !Repo.info()) { toast('깃허브 페이지 주소에서만 다시 읽을 수 있어요'); return; }
    try { await FontLib.refresh(); renderFonts(); toast('🔄 폰트를 다시 읽었어요'); } catch (e) { toast('⚠️ ' + e.message); }
  };
  // 지금 적용된 폰트 (드래그한 글자 → 고른 상자 순)
  function curFont() {
    let el = null;
    if (ui.mode === 'text' && lastRange && !lastRange.collapsed) { el = lastRange.commonAncestorContainer; if (el.nodeType !== 1) el = el.parentElement; }
    el = el || sel; if (!el || !frame.contentWindow) return '';
    return frame.contentWindow.getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  }
  function renderFonts() {
    const q = $('fQ').value.trim().toLowerCase();
    const now = curFont();
    const all = FontLib.cached().filter(f => !q || (f.family + ' ' + (f.memo || '')).toLowerCase().includes(q));
    const fav = FontLib.favs();
    const row = f => `<div class="ft-it ${f.family === now ? 'on' : ''}" data-f="${esc(f.family)}"><button class="st ${fav.includes(f.family) ? 'on' : ''}" data-star="${esc(f.family)}" title="즐겨찾기">★</button><span class="nm" title="${esc(f.family + (f.memo ? ' · ' + f.memo : ''))}">${f.family === now ? '✔ ' : ''}${esc(f.family)}</span><span class="sm" style="font-family:'${esc(f.family)}', sans-serif">${esc(ui.sample || 'あいう 가나다 ABC')}</span></div>`;
    let html = '';
    const favs = all.filter(f => fav.includes(f.family));
    if (favs.length) html += `<div class="ft-g">★ 즐겨찾기</div>` + favs.map(row).join('');
    [...new Set(all.map(f => f.group))].forEach(g => { html += `<div class="ft-g">📁 ${esc(g)}</div>` + all.filter(f => f.group === g).map(row).join(''); });
    $('fList').innerHTML = (now ? `<div class="ft-now">✔ 지금 폰트: <b style="font-family:'${esc(now)}'">${esc(now)}</b></div>` : '') + (html || '<div class="lab-empty">폰트가 없어요</div>');
  }
  $('fList').onclick = e => {
    const st = e.target.closest('[data-star]'); if (st) { FontLib.toggleFav(st.dataset.star); renderFonts(); return; }
    const it = e.target.closest('[data-f]'); if (!it) return;
    applyFont(it.dataset.f);
  };
  function applyFont(family) {
    if (rep && rep.type === 'font') { replaceAll('font', rep.value, family); return; }
    if (wrapSel({ 'font-family': `'${family}'` })) { ensureFontFace(family); commit(); toast(`🔤 드래그한 글자에 ${family}`); renderFonts(); return; }
    if (!sel) { toast('상자를 고르거나 ✏️글자 모드에서 글자를 드래그해 주세요'); return; }
    sel.style.setProperty('font-family', `'${family}'`); ensureFontFace(family); commit(); fitFrame(); toast(`🔤 ${family}`); renderFonts();
  }

  /* ---------------- ✏️ 드래그한 글자 ---------------- */
  function onSel() {
    if (ui.mode !== 'text') return;
    const d = doc(); const s = d && d.getSelection();
    if (!s || !s.rangeCount || s.isCollapsed || !s.toString().trim()) { hideFloat(); return; }
    lastRange = s.getRangeAt(0).cloneRange();
    if (ui.tab === 'font') renderFonts();
    const r = lastRange.getBoundingClientRect(), fr = frame.getBoundingClientRect();
    const fl = $('float'); fl.hidden = false;
    const top = fr.top + r.top - fl.offsetHeight - 8, left = Math.min(Math.max(8, fr.left + r.left), window.innerWidth - fl.offsetWidth - 8);
    fl.style.top = Math.max(8, top < 8 ? fr.top + r.bottom + 8 : top) + 'px'; fl.style.left = left + 'px';
  }
  function hideFloat() { $('float').hidden = true; }
  // 고른 상자 안의 글자만 전부 선택 (Ctrl+A)
  function selectAllIn(el) {
    const d = doc(); if (!d || !el) return;
    if (ui.mode !== 'text') { ui.mode = 'text'; saveUi(); applyMode(); }
    const r = d.createRange(); r.selectNodeContents(el);
    const s = d.getSelection(); s.removeAllRanges(); s.addRange(r);
    frame.contentWindow.focus();
    setTimeout(onSel, 0);
    toast('✏️ 상자 안 글자를 전부 골랐어요');
  }
  function wrapSel(styles) {
    const d = doc(); if (!d || ui.mode !== 'text' || !lastRange || lastRange.collapsed) return false;
    if (!d.body.contains(lastRange.commonAncestorContainer)) return false;
    const span = d.createElement('span');
    Object.entries(styles).forEach(([k, v]) => span.style.setProperty(k, v));
    try { span.appendChild(lastRange.extractContents()); lastRange.insertNode(span); }
    catch (e) { return false; }
    const s = d.getSelection(); s.removeAllRanges(); const r = d.createRange(); r.selectNodeContents(span); s.addRange(r); lastRange = r.cloneRange();
    fitFrame();
    return true;
  }
  $('flFont').innerHTML = '<option value="">폰트</option>' + FontLib.optionsHtml('', []);
  $('flFont').onchange = () => { const v = $('flFont').value.replace(/^lib:/, ''); if (v) applyFont(v); $('flFont').value = ''; };
  $('flSize').innerHTML += [9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32].map(n => `<option>${n}px</option>`).join('');
  $('flSize').onchange = () => { if ($('flSize').value && wrapSel({ 'font-size': $('flSize').value })) commit(); $('flSize').value = ''; };
  $('flColor').onclick = () => { if (wrapSel({ color: CP.hex() })) { CP.pushHist(); commit(); } };
  $('flBold').onclick = () => { if (wrapSel({ 'font-weight': 'bold' })) commit(); };
  $('flClear').onclick = () => {
    const d = doc(); if (!lastRange) return;
    const text = lastRange.toString(); lastRange.deleteContents(); lastRange.insertNode(d.createTextNode(text)); commit(); hideFloat();
  };
  $('cpSel').onclick = () => { if (wrapSel({ color: CP.hex() })) { CP.pushHist(); commit(); toast('🎨 칠했어요'); } else toast('✏️ 글자 모드에서 글자를 먼저 드래그해 주세요'); };
  document.addEventListener('mousedown', e => { if (!e.target.closest('#float')) hideFloat(); });

  /* ---------------- 🖼 이미지 갤러리 ---------------- */
  const Gal = (() => {
    let list = store.json(K.imgs, []) || [];
    let extraTags = store.json('lab.imgTags', []) || [];
    const save = () => store.setJson(K.imgs, list);
    const check = url => new Promise(res => { const im = new Image(); im.onload = () => res(true); im.onerror = () => res(false); im.src = url; setTimeout(() => res(false), 8000); });
    async function add(url, { quiet } = {}) {
      url = url.trim(); if (!/^(https?:)?\/\//.test(url) && !/^data:image/.test(url)) { if (!quiet) toast('이미지 주소가 아니에요'); return false; }
      if (list.some(x => x.url === url)) { if (!quiet) toast('이미 저장돼 있어요'); return false; }
      if (!(await check(url))) { toast('⚠️ 이미지를 못 불러왔어요 (주소 확인!)'); return false; }
      list.unshift({ id: Date.now().toString(36), url, name: '', tag: ui.gTag || '', mode: ui.gMode }); save(); draw(); toast('💾 갤러리에 저장했어요'); return true;
    }
    function draw() {
      const tags = [...new Set(list.map(x => x.tag).filter(Boolean).concat(extraTags))].sort((a, b) => a.localeCompare(b, 'ko'));
      if (ui.gTag && !tags.includes(ui.gTag)) ui.gTag = '';
      $('gTags').innerHTML = [['', `전부 ${list.length}`], ...tags.map(t => [t, `📁 ${t} ${list.filter(x => x.tag === t).length}`])]
        .map(([v, l]) => `<button class="lk-tag ${v === ui.gTag ? 'on' : ''}" data-gt="${esc(v)}">${esc(l)}</button>`).join('') + `<button class="lk-tag add" data-gt-new>＋ 새 분류</button>`;
      $('qkTag').innerHTML = `<option value="">📁 전부 (${list.length})</option>` + tags.map(t => `<option value="${esc(t)}" ${t === ui.gTag ? 'selected' : ''}>📁 ${esc(t)}</option>`).join('');
      $('gWhere').innerHTML = ui.gTag ? `새로 저장하면 <b>📁 ${esc(ui.gTag)}</b> 분류에 들어가요` : '분류를 고른 채로 저장하면 그 분류에 들어가요 · ✎ 로 나중에 옮길 수도 있어요';
      const items = list.filter(x => !ui.gTag || x.tag === ui.gTag);
      $('gal').innerHTML = items.map(x => `<div class="g-it" data-id="${x.id}" data-mode="${x.mode || 'tile'}">
        <span class="g-badge">${({ tile: '타일', stretch: '늘이기', cover: '덮기', one: '한 장' })[x.mode || 'tile']}</span>
        <div class="g-th" style="background-image:url('${esc(x.url)}')" title="${esc(x.url)}"></div>
        <div class="g-ft"><span>${esc(x.name || '')}</span><button data-ed="${x.id}">✎</button><button data-cp="${x.id}" title="주소 복사">🔗</button><button data-del="${x.id}">✕</button></div></div>`).join('')
        || '<div class="lab-empty" style="grid-column:1/-1">위 칸에 이미지 주소를 붙여 넣어 보세요 ♪</div>';
      $('qkGal').innerHTML = items.map(x => `<div class="g-it" data-mode="${x.mode || 'tile'}"><div class="g-th" data-gid="${x.id}" style="background-image:url('${esc(x.url)}')" title="${esc(x.name || x.url)}"></div></div>`).join('')
        || '<div class="lab-help" style="grid-column:1/-1">🖼 이미지 탭에서 주소를 저장하면 여기에 떠요</div>';
    }
    async function newTag() {
      const r = await Modal.prompt('📁 새 분류', [{ name: 'tag', label: '분류 이름', placeholder: '예: 배경 / 타일 / 구분선 / 프레임' }], { ok: '만들기 ♡' });
      const t = r && r.tag.trim(); if (!t) return;
      if (!extraTags.includes(t)) { extraTags.push(t); store.setJson('lab.imgTags', extraTags); }
      ui.gTag = t; saveUi(); draw();
    }
    const get = id => list.find(x => x.id === id);
    async function edit(id) {
      const x = get(id); if (!x) return;
      const r = await Modal.prompt('🖼 이미지 정보', [
        { name: 'name', label: '이름', value: x.name },
        { name: 'tag', label: '분류 (같은 이름끼리 묶여요)', value: x.tag, placeholder: '예: 배경 / 타일 / 구분선' },
        { name: 'mode', label: '기본 넣는 방식: tile(타일) / stretch(늘이기) / cover(덮기) / one(한 장)', value: x.mode || 'tile' }
      ]);
      if (!r) return;
      x.name = r.name.trim(); x.tag = r.tag.trim(); x.mode = ['tile', 'stretch', 'cover', 'one'].includes(r.mode.trim()) ? r.mode.trim() : x.mode; save(); draw();
    }
    async function del(id) { if (!(await Modal.confirm('이 이미지를 갤러리에서 뺄까요?'))) return; list = list.filter(x => x.id !== id); save(); draw(); }
    return { add, draw, get, edit, del, newTag };
  })();

  function bgStyles(url, mode) {
    const size = +ui.gSize;
    switch (mode) {
      case 'stretch': return { 'background-image': `url('${url}')`, 'background-repeat': 'no-repeat', 'background-size': '100% 100%', 'background-position': 'center' };
      case 'cover': return { 'background-image': `url('${url}')`, 'background-repeat': 'no-repeat', 'background-size': 'cover', 'background-position': 'center' };
      case 'one': return { 'background-image': `url('${url}')`, 'background-repeat': 'no-repeat', 'background-size': size ? size + 'px auto' : 'auto', 'background-position': 'center' };
      default: return { 'background-image': `url('${url}')`, 'background-repeat': 'repeat', 'background-size': size ? size + 'px auto' : 'auto', 'background-position': '0 0' };
    }
  }
  let peek = null; // 마우스 올렸을 때 잠깐 입혀보기
  function peekOn(x) {
    if (!sel || matchMedia('(hover: none)').matches) return;
    if (!peek) peek = { el: sel, style: sel.getAttribute('style') };
    Object.entries(bgStyles(x.url, x.mode || ui.gMode)).forEach(([k, v]) => sel.style.setProperty(k, v));
  }
  function peekOff() { if (!peek) return; if (peek.style === null) peek.el.removeAttribute('style'); else peek.el.setAttribute('style', peek.style); peek = null; }
  function applyImg(x, toBox) {
    peekOff();
    if (!toBox && rep && rep.type === 'img') { replaceAll('img', rep.value, x.url); return; }
    if (!sel) { toast('상자를 먼저 골라 주세요 (또는 🔍목록에서 바꿀 이미지를 고르기)'); return; }
    Object.entries(bgStyles(x.url, ui.gMode)).forEach(([k, v]) => sel.style.setProperty(k, v));
    commit(); showBox(); toast('🖼 입혔어요 · 마음에 안 들면 ↶');
  }
  const gUrl = $('gUrl');
  gUrl.addEventListener('paste', () => setTimeout(async () => { if (await Gal.add(gUrl.value)) gUrl.value = ''; }, 0));
  gUrl.addEventListener('keydown', async e => { if (e.key === 'Enter') { if (await Gal.add(gUrl.value)) gUrl.value = ''; } });
  $('gal').addEventListener('click', e => {
    const ed = e.target.closest('[data-ed]'); if (ed) { Gal.edit(ed.dataset.ed); return; }
    const dl = e.target.closest('[data-del]'); if (dl) { Gal.del(dl.dataset.del); return; }
    const cp = e.target.closest('[data-cp]'); if (cp) { copyText(Gal.get(cp.dataset.cp).url).then(ok => toast(ok ? '🔗 주소를 복사했어요' : '⚠️ 복사 실패')); return; }
    const it = e.target.closest('.g-th'); if (!it) return;
    const x = Gal.get(it.parentElement.dataset.id); if (!x) return;
    ui.gMode = x.mode || ui.gMode; saveUi(); drawGMode(); applyImg(x);
  });
  $('gal').addEventListener('mouseover', e => { const it = e.target.closest('.g-th'); if (!it) return; const x = Gal.get(it.parentElement.dataset.id); if (x) { peekOff(); peekOn({ ...x, mode: x.mode || ui.gMode }); } });
  $('gal').addEventListener('mouseleave', peekOff);
  $('gal').addEventListener('mouseout', e => { if (!e.relatedTarget || !e.relatedTarget.closest?.('.g-th')) peekOff(); });
  function drawGMode() { document.querySelectorAll('#gMode button, #qkMode button').forEach(b => b.classList.toggle('on', b.dataset.m === ui.gMode)); }
  $('gMode').onclick = e => {
    const b = e.target.closest('[data-m]'); if (!b) return; ui.gMode = b.dataset.m; saveUi(); drawGMode();
    if (sel) { const bi = sel.style.getPropertyValue('background-image'); const u = (bi.match(/url\(["']?([^"')]+)/) || [])[1]; if (u) { Object.entries(bgStyles(u, ui.gMode)).forEach(([k, v]) => sel.style.setProperty(k, v)); commit(); } }
  };
  const drawSize = () => { $('gSize').value = ui.gSize; $('gSizeV').textContent = +ui.gSize ? ui.gSize + 'px' : '원래대로'; };
  $('gSize').oninput = () => {
    ui.gSize = +$('gSize').value; saveUi(); drawSize();
    if (sel && /url\(/.test(sel.style.getPropertyValue('background-image')) && (ui.gMode === 'tile' || ui.gMode === 'one')) { sel.style.setProperty('background-size', ui.gSize ? ui.gSize + 'px auto' : 'auto'); commitSoon(); }
  };
  $('gTags').onclick = e => {
    if (e.target.closest('[data-gt-new]')) { Gal.newTag(); return; }
    const b = e.target.closest('[data-gt]'); if (!b) return; ui.gTag = b.dataset.gt; saveUi(); Gal.draw();
  };

  /* ---------------- 🧩 테두리 모음 ---------------- */
  const BD = (() => {
    let list = store.json(K.borders, []) || [];
    const save = () => store.setJson(K.borders, list);
    const form = () => ({ url: $('bdUrl').value.trim(), slice: $('bdSlice').value.trim() || '8', width: $('bdWidth').value.trim() || '8', out: $('bdOut').value.trim() || '0', rep: $('bdRep').value, fill: $('bdFill').checked });
    const toForm = b => { $('bdUrl').value = b.url; $('bdSlice').value = b.slice; $('bdWidth').value = b.width; $('bdOut').value = b.out; $('bdRep').value = b.rep; $('bdFill').checked = !!b.fill; prev(); };
    const px = v => /^\d+(\.\d+)?$/.test(String(v)) ? v + 'px' : v;
    const styles = b => ({
      'border-style': 'solid', 'border-width': px(b.width), 'border-color': 'transparent',
      'border-image-source': b.url ? `url('${b.url}')` : 'none', 'border-image-slice': b.slice + (b.fill ? ' fill' : ''),
      'border-image-width': px(b.width), 'border-image-outset': px(b.out), 'border-image-repeat': b.rep
    });
    const css = b => Object.entries(styles(b)).map(([k, v]) => `${k}:${v}`).join(';');
    function prev() { $('bdPrev').setAttribute('style', css(form())); }
    function draw() {
      $('bdList').innerHTML = list.map(b => `<div class="bd-it"><div class="bd-th" data-use="${b.id}" style="${esc(css(b))}">${esc(b.name || '')}</div>
        <div class="bd-ft"><span>${esc(b.name || '이름 없음')}</span><button data-load="${b.id}" title="위 칸으로 불러오기">✎</button><button data-copy="${b.id}" title="CSS 복사">📋</button><button data-del="${b.id}">✕</button></div></div>`).join('')
        || '<div class="lab-help" style="grid-column:1/-1">아직 없어요 · 위에서 만들고 💾 저장</div>';
      $('qkBd').innerHTML = list.map(b => `<div class="bd-it"><div class="bd-th" data-use="${b.id}" style="${esc(css(b))}">${esc(b.name || '')}</div></div>`).join('')
        || '<div class="lab-help" style="grid-column:1/-1">🧩 테두리 탭에서 저장하면 여기에 떠요</div>';
    }
    function apply(b) {
      if (!sel) { toast('상자를 먼저 골라 주세요'); return; }
      sel.style.removeProperty('border-image'); Object.entries(styles(b)).forEach(([k, v]) => sel.style.setProperty(k, v));
      commit(); fitFrame(); showBox(); toast('🧩 입혔어요');
    }
    ['bdUrl', 'bdSlice', 'bdWidth', 'bdOut', 'bdRep', 'bdFill'].forEach(id => $(id).addEventListener('input', prev));
    $('bdApply').onclick = () => apply(form());
    $('bdSave').onclick = async () => {
      const b = form(); if (!b.url) { toast('이미지 주소를 넣어 주세요'); return; }
      const r = await Modal.prompt('🧩 테두리 저장', [{ name: 'name', label: '이름', placeholder: '예: 회색 구름 프레임' }]); if (!r) return;
      list.unshift({ id: Date.now().toString(36), name: r.name.trim(), ...b }); save(); draw(); toast('💾 저장했어요');
    };
    $('bdFrom').onclick = () => {
      if (!sel) { toast('상자를 먼저 골라 주세요'); return; }
      const cs = frame.contentWindow.getComputedStyle(sel);
      const src = cs.borderImageSource; const u = (src.match(/url\(["']?([^"')]+)/) || [])[1];
      if (!u) { toast('이 상자엔 테두리 이미지가 없어요'); return; }
      toForm({ url: u, slice: cs.borderImageSlice.replace(/\s*fill/, ''), fill: /fill/.test(cs.borderImageSlice), width: parseFloat(cs.borderTopWidth) || cs.borderImageWidth, out: cs.borderImageOutset, rep: cs.borderImageRepeat.split(' ')[0] });
      toast('가져왔어요 · 💾 로 저장하세요');
    };
    $('bdPaste').onclick = async () => {
      const r = await Modal.prompt('🧩 코드로 붙여넣기', [{ name: 'css', label: 'border / border-image 가 들어간 CSS', type: 'textarea', rows: 4, placeholder: 'border: 7px solid #d9d4d6;\nborder-image: url(...) 8 fill round;' }], { ok: '읽기 ♡' });
      if (!r) return;
      const t = document.createElement('div'); t.style.cssText = r.css.replace(/[{}]/g, '');
      const u = (t.style.borderImageSource.match(/url\(["']?([^"')]+)/) || [])[1];
      if (!u) { toast('border-image 주소를 못 찾았어요'); return; }
      toForm({ url: u, slice: (t.style.borderImageSlice || '8').replace(/\s*fill/, ''), fill: /fill/.test(t.style.borderImageSlice), width: parseFloat(t.style.borderImageWidth) || parseFloat(t.style.borderTopWidth) || 8, out: t.style.borderImageOutset || '0', rep: (t.style.borderImageRepeat || 'round').split(' ')[0] });
      toast('읽었어요 · 💾 로 저장하세요');
    };
    $('bdList').onclick = async e => {
      const u = e.target.closest('[data-use]'); if (u) { apply(list.find(x => x.id === u.dataset.use)); return; }
      const l = e.target.closest('[data-load]'); if (l) { toForm(list.find(x => x.id === l.dataset.load)); return; }
      const c = e.target.closest('[data-copy]'); if (c) { const b = list.find(x => x.id === c.dataset.copy); toast(await copyText(css(b).replace(/;/g, ';\n') + ';') ? '📋 CSS 복사!' : '⚠️ 복사 실패'); return; }
      const d = e.target.closest('[data-del]'); if (d && await Modal.confirm('이 테두리를 지울까요?')) { list = list.filter(x => x.id !== d.dataset.del); save(); draw(); }
    };
    return { draw, prev, use: id => apply(list.find(x => x.id === id)) };
  })();

  /* ---------------- 🎨 컬러피커 ---------------- */
  const CP = (() => {
    let h = 330, s = 45, v = 96; // HSV
    let exact = null; // HEX/RGB 로 직접 넣은 색은 그대로 (HSV 반올림 오차 방지)
    const hsv2rgb = (h, s, v) => { s /= 100; v /= 100; const f = n => { const k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))); }; return [f(5), f(3), f(1)]; };
    const rgb2hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let hh = 0;
      if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh = Math.round(hh * 60); if (hh < 0) hh += 360;
      return [hh, mx ? Math.round(d / mx * 100) : 0, Math.round(mx * 100)]; };
    const toHex = ([r, g, b]) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    const parse = str => {
      str = String(str).trim();
      let m = str.match(/^#?([0-9a-f]{3,8})$/i);
      if (m) { let x = m[1]; if (x.length <= 4) x = x.slice(0, 3).split('').map(c => c + c).join(''); x = x.slice(0, 6); if (x.length === 6) return [0, 2, 4].map(i => parseInt(x.substr(i, 2), 16)); }
      m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i); if (m) return [+m[1], +m[2], +m[3]];
      return null;
    };
    const rgb = () => exact || hsv2rgb(h, s, v); const hex = () => toHex(rgb());
    const sv = $('cpSv'), g = sv.getContext('2d');
    function paintSv() {
      const W = sv.width, H = sv.height;
      g.fillStyle = `hsl(${h},100%,50%)`; g.fillRect(0, 0, W, H);
      let gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const x = s / 100 * W, y = (1 - v / 100) * H;
      g.lineWidth = 2; g.strokeStyle = v > 55 && s < 50 ? '#333' : '#fff'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.stroke();
    }
    function update({ from } = {}) {
      paintSv();
      const c = rgb(), hx = toHex(c);
      $('cpH').value = h; $('cpS').value = s; $('cpV').value = v;
      $('cpS').style.background = `linear-gradient(90deg, ${toHex(hsv2rgb(h, 0, v))}, ${toHex(hsv2rgb(h, 100, v))})`;
      $('cpV').style.background = `linear-gradient(90deg, #000, ${toHex(hsv2rgb(h, s, 100))})`;
      if (from !== 'hex') $('cpHex').value = hx;
      if (from !== 'rgb') { $('cpR').value = c[0]; $('cpG').value = c[1]; $('cpB').value = c[2]; }
      $('cpBig').style.background = hx; $('curSw2').style.background = hx;
      if (document.activeElement !== $('qkHex')) $('qkHex').value = hx;
      store.set('lab.cpCur', hx);
    }
    function set(str, opt) { const c = parse(str); if (!c) return false; [h, s, v] = rgb2hsv(...c); exact = c; update(opt); return true; }
    // 네모 판 끌기
    const svPick = e => { exact = null; const r = sv.getBoundingClientRect(); s = Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 100); v = Math.round((1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))) * 100); update(); };
    sv.addEventListener('pointerdown', e => { sv.setPointerCapture(e.pointerId); svPick(e); sv.onpointermove = svPick; });
    sv.addEventListener('pointerup', () => { sv.onpointermove = null; });
    $('cpH').oninput = () => { exact = null; h = +$('cpH').value; update(); };
    $('cpS').oninput = () => { exact = null; s = +$('cpS').value; update(); };
    $('cpV').oninput = () => { exact = null; v = +$('cpV').value; update(); };
    $('cpHex').oninput = () => set($('cpHex').value, { from: 'hex' });
    ['cpR', 'cpG', 'cpB'].forEach(id => $(id).oninput = () => { const c = ['cpR', 'cpG', 'cpB'].map(i => Math.max(0, Math.min(255, +$(i).value || 0))); [h, s, v] = rgb2hsv(...c); exact = c; update({ from: 'rgb' }); });

    // 기록 · 팔레트
    let hist = store.json(K.hist, []) || [], work = store.json(K.work, []) || [], pals = store.json(K.pals, []) || [];
    const sw = (c, attr = '') => `<button class="sw" data-sw="${c}" ${attr} title="${c}" style="background:${c}"></button>`;
    function drawHist() { $('cpHist').innerHTML = hist.map(c => sw(c)).join('') || '<span class="lab-help">색을 복사하거나 칠하면 여기에 남아요</span>'; }
    function drawWork() { $('cpWork').innerHTML = work.map((c, i) => sw(c, `data-wi="${i}"`)).join(''); }
    function drawPals() {
      $('cpPals').innerHTML = pals.map((p, i) => `<div class="cp-pal"><b title="${esc(p.name)}">${esc(p.name)}</b><div class="lab-sw-list">${p.colors.map(c => sw(c)).join('')}</div><button class="lab-x" data-pcopy="${i}" title="코드 복사">📋</button><button class="lab-x" data-pdel="${i}">✕</button></div>`).join('');
    }
    function pushHist(c = hex()) { hist = [c, ...hist.filter(x => x !== c)].slice(0, 30); store.setJson(K.hist, hist); drawHist(); }
    document.querySelector('[data-pane="color"]').addEventListener('click', async e => {
      const pc = e.target.closest('[data-pcopy]'); if (pc) { toast(await copyText(pals[+pc.dataset.pcopy].colors.join(' ')) ? '📋 팔레트 복사!' : '⚠️'); return; }
      const pd = e.target.closest('[data-pdel]'); if (pd) { if (await Modal.confirm('이 팔레트를 지울까요?')) { pals.splice(+pd.dataset.pdel, 1); store.setJson(K.pals, pals); drawPals(); } return; }
      const w = e.target.closest('[data-wi]'); if (w && e.altKey) { work.splice(+w.dataset.wi, 1); store.setJson(K.work, work); drawWork(); return; }
      const b = e.target.closest('[data-sw]'); if (b) set(b.dataset.sw);
    });
    $('cpWork').addEventListener('contextmenu', e => { const w = e.target.closest('[data-wi]'); if (!w) return; e.preventDefault(); work.splice(+w.dataset.wi, 1); store.setJson(K.work, work); drawWork(); });
    $('cpWorkAdd').onclick = () => { const c = hex(); if (!work.includes(c)) work.push(c); store.setJson(K.work, work); drawWork(); };
    $('cpWorkSave').onclick = async () => {
      if (!work.length) { toast('＋로 색을 먼저 담아 주세요'); return; }
      const r = await Modal.prompt('🎀 팔레트 저장', [{ name: 'name', label: '이름', placeholder: '예: 관찰일지 핑크 세트' }]); if (!r) return;
      pals.unshift({ name: r.name.trim() || '팔레트', colors: work.slice() }); work = []; store.setJson(K.pals, pals); store.setJson(K.work, work); drawPals(); drawWork(); toast('💾 저장했어요');
    };
    $('cpHistClear').onclick = async () => { if (await Modal.confirm('최근 색 기록을 지울까요?')) { hist = []; store.setJson(K.hist, hist); drawHist(); } };
    $('cpCopy').onclick = async () => { pushHist(); toast(await copyText(hex()) ? `📋 ${hex()} 복사!` : '⚠️ 복사 실패'); };
    $('cpCopyRgb').onclick = async () => { pushHist(); const c = rgb(); toast(await copyText(`rgb(${c.join(', ')})`) ? '📋 rgb 복사!' : '⚠️ 복사 실패'); };
    if (window.EyeDropper) {
      $('cpScreen').hidden = false;
      $('cpScreen').onclick = async () => { try { const r = await new EyeDropper().open(); set(r.sRGBHex); pushHist(); } catch (e) {} };
    }

    // 이미지에서 뽑기
    const drop = $('cpDrop'), ic = $('cpImg'), ig = ic.getContext('2d', { willReadFrequently: true });
    async function loadImg(blob) {
      try {
        const bmp = await createImageBitmap(blob);
        const maxW = 600, sc = Math.min(1, maxW / bmp.width);
        ic.width = Math.round(bmp.width * sc); ic.height = Math.round(bmp.height * sc);
        ig.imageSmoothingEnabled = false; ig.drawImage(bmp, 0, 0, ic.width, ic.height);
        ic.hidden = false; drop.classList.add('has'); toast('💧 이미지 위를 눌러서 색을 뽑으세요');
      } catch (e) { toast('⚠️ 이미지를 못 읽었어요'); }
    }
    const pixel = e => { const r = ic.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / r.width * ic.width), y = Math.floor((e.clientY - r.top) / r.height * ic.height); const d = ig.getImageData(Math.max(0, Math.min(ic.width - 1, x)), Math.max(0, Math.min(ic.height - 1, y)), 1, 1).data; return toHex([d[0], d[1], d[2]]); };
    let hovering = null;
    ic.addEventListener('pointermove', e => { if (!hovering) hovering = hex(); $('cpBig').style.background = pixel(e); });
    ic.addEventListener('pointerleave', () => { if (hovering) { $('cpBig').style.background = hovering; hovering = null; } });
    ic.addEventListener('click', e => { hovering = null; set(pixel(e)); pushHist(); toast(`💧 ${hex()}`); });
    drop.addEventListener('paste', e => { const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); loadImg(it.getAsFile()); } });
    document.addEventListener('paste', e => {
      if (ui.tab !== 'color' || e.target.closest('input, textarea')) return;
      const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); loadImg(it.getAsFile()); }
    });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag'); const f = [...e.dataTransfer.files].find(f => f.type.startsWith('image/')); if (f) loadImg(f); });
    $('cpFile').onchange = () => { const f = $('cpFile').files[0]; if (f) loadImg(f); $('cpFile').value = ''; };
    $('cpImgClear').onclick = () => { ic.hidden = true; drop.classList.remove('has'); $('cpPalOut').innerHTML = ''; };
    // 팔레트 뽑기: 비슷한 색끼리 묶어서 많이 나온 순서
    $('cpPal').onclick = () => {
      if (ic.hidden) { toast('이미지를 먼저 붙여 넣어 주세요'); return; }
      const d = ig.getImageData(0, 0, ic.width, ic.height).data, bins = new Map();
      const step = Math.max(1, Math.floor(d.length / 4 / 40000));
      for (let i = 0; i < d.length; i += 4 * step) {
        if (d[i + 3] < 128) continue;
        const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4);
        const b = bins.get(k) || [0, 0, 0, 0]; b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; bins.set(k, b);
      }
      const cand = [...bins.values()].sort((a, b) => b[3] - a[3]).map(b => [b[0] / b[3], b[1] / b[3], b[2] / b[3]].map(Math.round));
      const out = [];
      for (const c of cand) { if (out.every(o => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) > 42)) out.push(c); if (out.length >= 8) break; }
      $('cpPalOut').innerHTML = out.map(c => sw(toHex(c))).join('');
    };

    const saved = store.get('lab.cpCur', ''); if (saved) { const c = parse(saved); if (c) { [h, s, v] = rgb2hsv(...c); exact = c; } }
    update(); drawHist(); drawWork(); drawPals();
    return { hex, set, pushHist };
  })();

  /* ---------------- 📸 스냅샷 ---------------- */
  let snaps = store.json(K.snaps, []) || [];
  const saveSnaps = () => { store.setJson(K.snaps, snaps); $('snapN').textContent = snaps.length ? `(${snaps.length})` : ''; };
  $('bSnap').onclick = async () => {
    clearTimeout(ct); commit();
    const def = String.fromCharCode(65 + (snaps.length % 26)) + '안';
    const r = await Modal.prompt('📸 지금 모습 찍어두기', [{ name: 'name', label: '이름', value: def }], { ok: '찍기 ♡' }); if (!r) return;
    snaps.unshift({ id: Date.now().toString(36), name: r.name.trim() || def, html: cur, ts: Date.now() });
    if (snaps.length > 20) snaps.length = 20;
    saveSnaps(); toast('📸 찍었어요!');
  };
  $('bSnaps').onclick = async () => {
    if (!snaps.length) { toast('아직 찍은 게 없어요 · 📸 찍기 먼저!'); return; }
    const html = `<div class="md-choices">${snaps.map(s => `<div class="snap-it"><b>${esc(s.name)}</b><small>${fmt.dateTime(s.ts)}</small>
      <button data-sa="cmp" data-id="${s.id}">비교</button><button data-sa="load" data-id="${s.id}">불러오기</button><button data-sa="del" data-id="${s.id}">✕</button></div>`).join('')}</div>`;
    const p = Modal.open({ title: '🗂 스냅샷', html, buttons: [{ label: '닫기', value: null, cls: 'white', primary: true }] });
    {
      const ovs = document.querySelectorAll('.md-overlay'); const box = ovs[ovs.length - 1]?.querySelector('.md-box');
      box.addEventListener('click', async e => {
        const b = e.target.closest('[data-sa]'); if (!b) return;
        const s = snaps.find(x => x.id === b.dataset.id); if (!s) return;
        if (b.dataset.sa === 'del') { snaps = snaps.filter(x => x !== s); saveSnaps(); b.closest('.snap-it').remove(); return; }
        box.closest('.md-overlay').querySelector('.md-f .btn')?.click();
        if (b.dataset.sa === 'load') { setHtml(s.html); toast(`↩ ${s.name} 를 불러왔어요 (↶ 로 되돌릴 수 있어요)`); }
        if (b.dataset.sa === 'cmp') openCmp(s);
      });
    }
    await p;
  };
  function wrapDoc(html) { return /<html[\s>]/i.test(html) ? html : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${FontLib.cached().map(f => f.css).join('\n')}</style></head><body>${html}</body></html>`; }
  function openCmp(s) {
    clearTimeout(ct); commit();
    $('cmpTitle').textContent = `👀 ${s.name} ↔ 지금`; $('cmpA').textContent = `📸 ${s.name} · ${fmt.dateTime(s.ts)}`;
    $('cmpFa').srcdoc = wrapDoc(s.html); $('cmpFb').srcdoc = wrapDoc(cur);
    $('cmp').hidden = false;
  }
  $('cmpClose').onclick = () => { $('cmp').hidden = true; };

  /* ---------------- 시작 ---------------- */
  showTab(ui.tab); showQk(ui.qk); drawQkWhere(); applyW(); drawGMode(); drawSize(); Gal.draw(); BD.draw(); BD.prev(); saveSnaps();
  render(cur); afterChange(); showBox();
  window.addEventListener('beforeunload', () => { clearTimeout(ct); commit(); });
})();
