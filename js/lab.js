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
  let caret = null;        // 마지막 커서 위치 (이모지 넣기용)
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
    const base = ui.base && isDoc ? `<base data-lab href="${ui.base.replace(/"/g, '%22')}">` : '';
    const head = `${base}<style data-lab>${LAB_CSS}</style><style data-lab>${fontCss}</style>`;
    let src;
    if (isDoc) {
      src = /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>${head}`) : html.replace(/<html([^>]*)>/i, `<html$1><head>${head}</head>`);
    } else {
      src = `<!DOCTYPE html><html><head><meta charset="utf-8">${head}</head><body>${html}</body></html>`;
    }
    // 🔗 주소 모드: css·js 를 매번 새로 읽게 (예전 파일 기억 방지)
    if (ui.base && isDoc) { const t = Date.now(); src = src.replace(/(<(?:link|script)\b[^>]*?\b(?:href|src)=["'])([^"'?#]+\.(?:css|js))(["'])/gi, `$1$2?lab=${t}$3`); }
    sel = null; lastRange = null;
    frame.srcdoc = src;
    if (typeof Pos !== 'undefined' && Pos.unlink) Pos.unlink();
  }

  function serialize() {
    const d = doc(); if (!d || !d.body) return cur;
    const root = (isDoc ? d.documentElement : d.body).cloneNode(true);
    root.querySelectorAll('[data-lab]').forEach(n => n.remove());
    [root, ...root.querySelectorAll('[data-lab-sel],[data-lab-hov],[contenteditable],[spellcheck]')].forEach(n => {
      n.removeAttribute?.('data-lab-sel'); n.removeAttribute?.('data-lab-hov');
      if (n.tagName === 'BODY') { n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck'); }
    });
    if (ui.base) {   // 🔗 주소로 연 페이지: 스크립트가 잠깐 띄운 것들은 코드에 안 남기기
      root.querySelectorAll('.spk, .hrt').forEach(n => n.remove());
      root.querySelectorAll('.win.show, .pop-bg.show, .onlist.show').forEach(n => n.classList.remove('show'));
      root.querySelectorAll('.mi.open').forEach(n => n.classList.remove('open'));
      root.querySelectorAll('#famSel option:not(:first-child)').forEach(n => n.remove());
      root.querySelectorAll('[class=""]').forEach(n => n.removeAttribute('class'));
    }
    root.querySelectorAll('link[href*="?lab="], script[src*="?lab="]').forEach(n => { const a = n.hasAttribute('href') ? 'href' : 'src'; n.setAttribute(a, n.getAttribute(a).replace(/\?lab=\d+$/, '')); });
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
    d.addEventListener('keydown', e => arrowHandler(e));
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
    $('tbar').hidden = ui.mode !== 'text';
    if (!d || !d.body) return;
    if (ui.mode === 'text') { d.body.setAttribute('contenteditable', 'true'); d.body.setAttribute('spellcheck', 'false'); }
    else { d.body.removeAttribute('contenteditable'); d.body.removeAttribute('spellcheck'); hideFloat(); }
    $('tbar').hidden = ui.mode !== 'text'; if (ui.mode !== 'text') $('tbPop').hidden = true;
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
  $('codeApply').onclick = () => { const v = $('codeTa').value.trim(); if (!v) { toast('코드가 비어 있어요'); return; } setHtml(v); store.set('lab.orig', v); toast('✔ 미리보기에 넣었어요'); };
  // 🔗 주소로 열기: 파일을 그 자리에서 연 것처럼 (css·js·그림 경로가 맞게)
  const urlLabel = () => { $('bUrl').textContent = ui.base ? '🔗 ' + decodeURIComponent(ui.base.split('/').pop() || ui.base) : '🔗 주소'; };
  $('bUrl').onclick = async () => {
    const now = ui.base ? ui.base.replace(location.href.replace(/[^/]*$/, ''), '') : 'kyonya/preview.html';
    const r = await Modal.prompt('🔗 주소로 열기', [{ name: 'url', label: '열 파일 주소 (작업대 폴더 기준 · 비우면 주소 모드 끄기)', value: now, placeholder: 'kyonya/preview.html' }], { ok: '열기 ♡' });
    if (!r) return;
    const v = (r.url || '').trim();
    if (!v) { ui.base = ''; saveUi(); urlLabel(); render(cur); toast('주소 모드를 껐어요'); return; }
    let url;
    try { url = new URL(v, location.href); } catch (e) { toast('⚠️ 주소가 이상해요'); return; }
    try {
      const res = await fetch(url.href, { cache: 'no-store' }); if (!res.ok) throw new Error(res.status);
      let html = await res.text();
      html = html.replace(/<!-- Code injected by live-server -->\s*<script[\s\S]*?<\/script>/i, '');   // Live Server 가 끼워 넣는 것 빼기
      ui.base = url.href; saveUi(); urlLabel();
      setHtml(html); store.set('lab.orig', html); toast('🔗 열었어요 · ' + v);
    } catch (e) { toast('⚠️ 못 열었어요 · 주소를 확인해 주세요'); }
  };
  urlLabel();
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
    $('kids').innerHTML = kids.slice(0, 30).map((k, i) => `<button data-k="${i}" draggable="true">${esc(label(k))}</button>`).join('');
    $('kids').onclick = e => { const b = e.target.closest('[data-k]'); if (b) select(kids[+b.dataset.k]); };
    kidsNow = kids;
    const cs = frame.contentWindow.getComputedStyle(sel);
    document.querySelectorAll('.bx-n').forEach(inp => { inp.value = parseFloat(cs.getPropertyValue(inp.dataset.p)) || 0; });
    $('bxSize').textContent = `${Math.round(sel.getBoundingClientRect().width)} × ${Math.round(sel.getBoundingClientRect().height)}`;
    document.querySelectorAll('.lab-props [data-p]').forEach(inp => { inp.value = sel.style.getPropertyValue(inp.dataset.p) || ''; inp.placeholder = cs.getPropertyValue(inp.dataset.p); });
    $('bxStyle').value = (sel.getAttribute('style') || '').replace(/;\s*/g, ';\n').trim();
    if ($('cssDet').open) drawRules();
    drawCur(); drawNd();
  }


  /* ---- ✥ 십자키로 옮기기 ---- */
  let ndStep = 1;
  const trXY = el => { const m = String(el.style.getPropertyValue('translate') || '').match(/(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?/); return m ? [+m[1], +(m[2] || 0)] : [0, 0]; };
  function drawNd() {
    if (!sel) return;
    const fl = sel.style.position === 'absolute';
    $('ndNow').textContent = fl ? `🎈 띄움 · 왼쪽 ${sel.style.left || 0} · 위 ${sel.style.top || 0}`
      : (() => { const [x, y] = trXY(sel); return x || y ? `가로 ${x}px · 세로 ${y}px` : '제자리'; })();
  }
  function nudge(dx, dy) {
    const d = doc(); if (!sel || sel === d.body) { toast('옮길 상자를 골라 주세요'); return; }
    const w = frame.contentWindow;
    if (sel.style.position === 'absolute') {
      const par = sel.parentElement || d.body;
      const lv = sel.style.left || '0px', tv = sel.style.top || '0px';
      if (/%$/.test(lv)) sel.style.setProperty('left', +(parseFloat(lv) + (par.clientWidth ? dx / par.clientWidth * 100 : 0)).toFixed(2) + '%');
      else sel.style.setProperty('left', (parseFloat(lv) || 0) + dx + 'px');
      if (/%$/.test(tv)) sel.style.setProperty('top', +(parseFloat(tv) + (par.clientHeight ? dy / par.clientHeight * 100 : 0)).toFixed(2) + '%');
      else sel.style.setProperty('top', (parseFloat(tv) || 0) + dy + 'px');
    } else {
      // 원래 자리는 그대로 두고 눈에 보이는 위치만 옮겨요 (translate)
      const [ox, oy] = trXY(sel), nx = ox + dx, ny = oy + dy;
      if (nx || ny) sel.style.setProperty('translate', `${nx}px ${ny}px`); else sel.style.removeProperty('translate');
    }
    fitFrame(); commitSoon(); drawNd(); Pos.show();
    $('bxStyle').value = (sel.getAttribute('style') || '').replace(/;\s*/g, ';\n').trim();
  }
  function nudgeReset() {
    if (!sel) return;
    if (sel.style.position === 'absolute') { toast('🎈 띄운 상자는 📐 위치에서 "띄우기"를 꺼 주세요'); return; }
    sel.style.removeProperty('translate');
    commit(); fitFrame(); showBox(); toast('● 제자리로');
  }
  // 누르고 있으면 계속 움직여요
  let ndTimer = null;
  const ndStop = () => { clearTimeout(ndTimer); clearInterval(ndTimer); ndTimer = null; };
  $('ndPad').addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-d]'); if (!b) return; e.preventDefault();
    if (b.dataset.d === 'reset') { nudgeReset(); return; }
    const [x, y] = b.dataset.d.split(',').map(Number);
    nudge(x * ndStep, y * ndStep);
    ndStop(); ndTimer = setTimeout(() => { ndTimer = setInterval(() => nudge(x * ndStep, y * ndStep), 60); }, 380);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => $('ndPad').addEventListener(t, ndStop));
  $('ndStep').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; ndStep = +b.dataset.s; $('ndStep').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  const arrowHandler = e => {
    if (!/^Arrow(Up|Down|Left|Right)$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!sel || ui.mode === 'text' || e.target.closest?.('textarea, input, select, [contenteditable="true"]')) return;
    if (sel === doc()?.body) return;
    e.preventDefault();
    const st = e.shiftKey ? 10 : ndStep;
    nudge(e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0);
  };
  document.addEventListener('keydown', arrowHandler);

  /* ---- ↕ 상자 순서 ---- */
  let kidsNow = [], dragK = -1;
  const isReal = n => n && n.tagName && !n.hasAttribute('data-lab') && !/^(STYLE|SCRIPT|BR)$/.test(n.tagName);
  const sib = (el, dir) => { let n = el[dir]; while (n && !isReal(n)) n = n[dir]; return n; };
  function moved(msg) { commit(); fitFrame(); const el = sel; select(el); toast(msg); }
  $('mvUp').onclick = () => { if (!sel || sel === doc().body) return; const p = sib(sel, 'previousElementSibling'); if (!p) { toast('맨 앞이에요'); return; } p.before(sel); moved('⬆ 한 칸 앞으로'); };
  $('mvDown').onclick = () => { if (!sel || sel === doc().body) return; const n = sib(sel, 'nextElementSibling'); if (!n) { toast('맨 뒤예요'); return; } n.after(sel); moved('⬇ 한 칸 뒤로'); };
  $('mvIn').onclick = () => {
    if (!sel || sel === doc().body) return; const p = sib(sel, 'previousElementSibling');
    if (!p || /^(IMG|INPUT|BR|HR)$/.test(p.tagName)) { toast('바로 앞에 들어갈 상자가 없어요'); return; }
    p.appendChild(sel); moved(`⤵ ${label(p)} 안으로 넣었어요`);
  };
  $('mvOut').onclick = () => {
    if (!sel) return; const par = sel.parentElement;
    if (!par || par === doc().body || par.tagName === 'HTML') { toast('더 밖으로는 못 꺼내요'); return; }
    par.after(sel); moved('⤴ 밖으로 꺼냈어요');
  };
  $('kids').addEventListener('dragstart', e => { const b = e.target.closest('[data-k]'); if (!b) return; dragK = +b.dataset.k; b.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', ''); } catch (er) {} });
  const clearDrop = () => $('kids').querySelectorAll('button').forEach(b => b.classList.remove('drop-a', 'drop-b', 'dragging'));
  $('kids').addEventListener('dragover', e => {
    const b = e.target.closest('[data-k]'); if (!b || dragK < 0) return; e.preventDefault();
    const r = b.getBoundingClientRect(), after = e.clientX > r.left + r.width / 2;
    $('kids').querySelectorAll('button').forEach(x => x.classList.remove('drop-a', 'drop-b')); b.classList.add(after ? 'drop-a' : 'drop-b');
  });
  $('kids').addEventListener('drop', e => {
    const b = e.target.closest('[data-k]'); if (!b || dragK < 0) return; e.preventDefault();
    const from = kidsNow[dragK], to = kidsNow[+b.dataset.k]; const after = b.classList.contains('drop-a'); clearDrop(); dragK = -1;
    if (!from || !to || from === to) return;
    if (after) to.after(from); else to.before(from);
    commit(); fitFrame(); showBox(); toast('↕ 순서를 바꿨어요');
  });
  $('kids').addEventListener('dragend', () => { clearDrop(); dragK = -1; });
  $('cssDet').addEventListener('toggle', () => { if ($('cssDet').open) drawRules(); });

  /* ---- 고른 상자에 걸린 <style> 규칙 찾기 · 고치기 ---- */
  // <style> 글자를 훑어서 { } 덩어리 위치를 찾아요 (주석·@media 안쪽까지)
  function scanBlocks(text) {
    const out = []; const stack = []; let i = 0, selStart = 0;
    while (i < text.length) {
      const c = text[i];
      if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; continue; }
      if (c === '"' || c === "'") { const e = text.indexOf(c, i + 1); i = e < 0 ? text.length : e + 1; continue; }
      if (c === '{') { stack.push({ sel: text.slice(selStart, i), open: i }); selStart = i + 1; }
      else if (c === '}') { const b = stack.pop(); if (b) out.push({ sel: b.sel, open: b.open, close: i, depth: stack.length }); selStart = i + 1; }
      else if (c === ';' && !stack.length) selStart = i + 1;
      i++;
    }
    return out;
  }
  const normSel = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '').replace(/"/g, "'");
  function splitSel(t) { const out = []; let d = 0, cur = ''; for (const ch of t) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); }
  function ruleHits(el, selectorText) {
    return splitSel(selectorText).some(one => {
      const base = one.replace(/::?(before|after|first-letter|first-line|marker|placeholder|selection)\b/g, '').replace(/:(hover|active|focus|focus-within|focus-visible|visited|checked)\b/g, '').trim() || '*';
      try { return el.matches(base); } catch (e) { return false; }
    });
  }
  let ruleList = [];
  function drawRules() {
    const d = doc(); if (!sel || !d) { $('cssRules').innerHTML = ''; return; }
    ruleList = [];
    [...d.querySelectorAll('style')].forEach(st => {
      if (st.hasAttribute('data-lab') || st.hasAttribute('data-fontface')) return;
      const text = st.textContent, blocks = scanBlocks(text);
      const walk = (rules, media) => [...rules].forEach(r => {
        if (r.cssRules && r.media) { walk(r.cssRules, r.media.mediaText); return; }
        if (!r.selectorText || !ruleHits(sel, r.selectorText)) return;
        const want = normSel(r.selectorText);
        const blk = blocks.find(b => normSel(b.sel) === want && !ruleList.some(x => x.st === st && x.open === b.open));
        ruleList.push({ st, selector: r.selectorText, media, open: blk ? blk.open : -1, close: blk ? blk.close : -1, body: blk ? text.slice(blk.open + 1, blk.close) : r.style.cssText, rule: r });
      });
      try { walk(st.sheet.cssRules, ''); } catch (e) {}
    });
    const clean = b => b.replace(/^\s*\n|\s+$/g, '').split('\n').map(l => l.replace(/^\s{2,}/, '  ')).join('\n').trim();
    $('cssRules').innerHTML = ruleList.length ? `<p class="lab-help">⚠️ 아래 CSS는 <b>같은 이름(class)을 쓰는 다른 상자도 같이</b> 바뀌어요. 이 상자만 바꾸고 싶으면 위 style 칸에 적어 주세요.</p>` + ruleList.map((r, i) => `<div class="css-blk">
        <div class="css-h"><b>${esc(r.selector)}</b>${r.media ? `<small>@media ${esc(r.media)}</small>` : ''}</div>
        <textarea class="tx mono" data-ri="${i}" rows="${Math.min(10, Math.max(2, clean(r.body).split(/;|\n/).filter(x => x.trim()).length + 1))}" spellcheck="false">${esc(clean(r.body).replace(/;\s*(?=\S)/g, ';\n'))}</textarea>
        <button class="btn mini white" data-ra="${i}">적용</button></div>`).join('')
      : '<p class="lab-help">이 상자에 걸린 &lt;style&gt; 규칙이 없어요</p>';
  }
  $('cssRules').addEventListener('click', e => {
    const b = e.target.closest('[data-ra]'); if (!b) return;
    const r = ruleList[+b.dataset.ra]; const val = $('cssRules').querySelector(`[data-ri="${b.dataset.ra}"]`).value;
    if (r.open < 0) { try { r.rule.style.cssText = val; } catch (er) {} toast('⚠️ 원본 위치를 못 찾아서 미리보기만 바꿨어요'); return; }
    const text = r.st.textContent;
    r.st.textContent = text.slice(0, r.open + 1) + '\n  ' + val.trim().split('\n').map(l => l.trim()).filter(Boolean).join('\n  ') + '\n' + text.slice(r.close);
    commit(); fitFrame(); drawRules(); toast('✔ CSS 를 고쳤어요 · 마음에 안 들면 ↶');
  });
  // 여백 숫자
  document.querySelectorAll('.bx-n').forEach(inp => {
    const apply = () => {
      if (!sel) return;
      const v = inp.value.trim(); const val = v === '' ? '' : (/^-?\d+(\.\d+)?$/.test(v) ? v + 'px' : v);
      const group = inp.dataset.p.split('-')[0];
      const targets = $('bxLink').checked ? ['top', 'right', 'bottom', 'left'].map(s => `${group}-${s}`) : [inp.dataset.p];
      targets.forEach(p => sel.style.setProperty(p, val));
      if ($('bxLink').checked) document.querySelectorAll(`.bx-n[data-p^="${group}-"]`).forEach(x => { if (x !== inp) x.value = v; });
      fitFrame(); commitSoon(); $('bxStyle').value = (sel.getAttribute('style') || '').replace(/;\s*/g, ';\n').trim();
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
      sel.style.setProperty(inp.dataset.p, v); fitFrame(); commitSoon(); $('bxStyle').value = (sel.getAttribute('style') || '').replace(/;\s*/g, ';\n').trim();
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
  $('bxStyleApply').onclick = () => { if (!sel) return; sel.setAttribute('style', $('bxStyle').value.replace(/\n/g, ' ').trim()); commit(); fitFrame(); showBox(); toast('적용했어요'); };

  /* ---------------- ➕ 요소 넣기 · 📐 위치 ---------------- */
  const Pos = (() => {
    const isFloat = el => !!el && el.style.position === 'absolute';
    const num = v => { const m = String(v || '').match(/^(-?[\d.]+)(px|%)?$/); return m ? { n: +(+m[1]).toFixed(2), u: m[2] || 'px' } : null; };
    // 넣기
    function insert(given) {
      const code = (typeof given === 'string' ? given : $('insCode').value).trim(); if (!code) { toast('넣을 코드를 붙여 넣어 주세요'); return; }
      const d = doc(); if (!d) return;
      let where = $('insWhere').value, base = sel;
      if (!base || base === d.body) { base = d.body; if (where === 'beforebegin') where = 'afterbegin'; if (where === 'afterend') where = 'beforeend'; }
      // 이미지 주소만 붙여 넣으면 <img> 로
      const html = /^https?:\/\/\S+$/i.test(code) && !/[<>"]/.test(code) ? `<img src="${code}" alt="">` : code;
      if (where === 'sticker') return sticker(html, base);
      const tpl = d.createElement('template'); tpl.innerHTML = html;
      const nodes = [...tpl.content.childNodes];
      const first = nodes.find(n => n.nodeType === 1 && n.tagName !== 'STYLE') || nodes.find(n => n.nodeType === 1);
      const frag = tpl.content;
      ({ beforeend: () => base.append(frag), afterbegin: () => base.prepend(frag), beforebegin: () => base.before(frag), afterend: () => base.after(frag) })[where]();
      link(nodes.filter(n => n.nodeType === 1 || n.textContent.trim()));
      commit(); fitFrame(); if (first) select(first); toast('➕ 넣었어요 · 코드를 고치면 바로 바뀌어요');
    }
    // 🌟 스티커로 넣기: 고른 상자 위에 둥실 띄워서, 끌어서 아무 데나
    function sticker(html, base) {
      const d = doc(), w = frame.contentWindow;
      const par = /^(IMG|INPUT|BR|HR|TEXTAREA|SELECT|IFRAME|VIDEO|svg)$/i.test(base.tagName) ? base.parentElement || d.body : base;
      const tpl = d.createElement('template'); tpl.innerHTML = html;
      const els = [...tpl.content.children].filter(n => n.tagName !== 'STYLE'), styles = [...tpl.content.children].filter(n => n.tagName === 'STYLE');
      if (!els.length) { toast('스티커로 넣을 요소가 없어요'); return; }
      let st = els[0];
      if (els.length > 1) { st = d.createElement('div'); els.forEach(n => st.append(n)); }
      if (w.getComputedStyle(par).position === 'static') par.style.setProperty('position', 'relative');
      styles.forEach(n => par.append(n));
      st.style.setProperty('position', 'absolute'); st.style.setProperty('margin', '0'); st.style.setProperty('z-index', '50');
      par.append(st);
      // 지금 보이는 화면 가운데쯤 (고른 상자 안으로)
      const fr = frame.getBoundingClientRect(), pr = par.getBoundingClientRect();
      const vx1 = Math.max(0, -fr.left), vx2 = Math.min(w.innerWidth, innerWidth - fr.left), vy1 = Math.max(0, -fr.top), vy2 = Math.min(w.innerHeight, innerHeight - fr.top);
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const place = () => {
        const sw = st.offsetWidth || 40, sh = st.offsetHeight || 40;
        const cx = clamp((vx1 + vx2) / 2, pr.left + sw / 2, Math.max(pr.left + sw / 2, pr.right - sw / 2)) - pr.left - par.clientLeft - sw / 2;
        const cy = clamp((vy1 + vy2) / 2, pr.top + sh / 2, Math.max(pr.top + sh / 2, pr.bottom - sh / 2)) - pr.top - par.clientTop - sh / 2;
        st.style.setProperty('left', (par.clientWidth ? (cx / par.clientWidth * 100).toFixed(2) : 0) + '%');
        st.style.setProperty('top', Math.round(cy) + 'px');
      };
      // 너무 큰 그림은 스티커 크기로 (그 뒤엔 📦 상자 탭 너비로 조절)
      const fit = () => { if (st.tagName === 'IMG' && !st.style.width && st.naturalWidth > 200) st.style.setProperty('width', '120px'); };
      fit(); place();
      if (st.tagName === 'IMG') st.addEventListener('load', fit, { once: true });
      st.querySelectorAll('img').forEach(im => { if (!im.complete) im.addEventListener('load', () => { place(); commitSoon(); }, { once: true }); });
      if (st.tagName === 'IMG' && !st.complete) st.addEventListener('load', () => { place(); commitSoon(); }, { once: true });
      link([]);
      commit(); fitFrame(); select(st); toast('🌟 스티커로 붙였어요 · 👆상자 모드에서 끌어서 옮겨요');
    }
    // 🔗 넣은 요소 ↔ 코드 칸 연결: 코드를 고치면 미리보기도 바로 바뀌어요
    let linked = [];
    function link(nodes) {
      linked = nodes;
      const els = nodes.filter(n => n.nodeType === 1 && n.tagName !== 'STYLE');
      $('insLink').hidden = !nodes.length;
      $('insLink').innerHTML = nodes.length ? `🔗 연결됨: <b>${esc(els.map(label).slice(0, 3).join(', ') || 'style')}</b>${els.length > 3 ? ` 외 ${els.length - 3}개` : ''} · 위 코드를 고치면 바로 바뀌어요<span class="ins-btns"><button id="insDone" class="ok">✔ 이대로 적용</button><button id="insUnlink">연결만 끊기</button></span>` : '';
      if (nodes.length) {
        $('insUnlink').onclick = () => link([]);
        $('insDone').onclick = () => { clearTimeout(lt); commit(); link([]); $('insCode').value = ''; toast('✔ 적용했어요 · 다음 블럭을 넣어 보세요'); };
      }
    }
    let lt = null;
    // 연결된 상태에서 코드를 "통째로" 새로 붙여 넣으면 → 새 블럭으로 보고 연결을 끊어요 (앞에 넣은 게 안 바뀌게)
    $('insCode').addEventListener('paste', () => {
      const ta = $('insCode');
      if (linked.length && (!ta.value.trim() || (ta.selectionStart === 0 && ta.selectionEnd === ta.value.length))) {
        clearTimeout(lt); commit(); link([]); toast('새 코드라서 앞 블럭은 그대로 두었어요 · ➕ 넣기를 눌러 주세요');
      }
    });
    $('insCode').addEventListener('input', () => {
      if (!linked.length) return;
      clearTimeout(lt);
      lt = setTimeout(() => {
        const alive = linked.filter(n => n.isConnected); if (!alive.length) { link([]); return; }
        const d = doc(); const tpl = d.createElement('template'); tpl.innerHTML = $('insCode').value;
        const nodes = [...tpl.content.childNodes];
        alive[0].before(tpl.content); alive.forEach(n => n.remove());
        const keep = nodes.filter(n => n.nodeType === 1 || n.textContent.trim());
        linked = keep; const first = keep.find(n => n.nodeType === 1 && n.tagName !== 'STYLE');
        fitFrame(); commitSoon(); if (first) select(first); link(keep);
      }, 350);
    });
    $('insGrab').onclick = () => {
      const d = doc(); if (!sel || sel === d.body) { toast('미리보기에서 요소를 먼저 골라 주세요'); return; }
      const c = sel.cloneNode(true); c.removeAttribute('data-lab-sel'); c.querySelectorAll('[data-lab-hov],[data-lab-sel]').forEach(n => { n.removeAttribute('data-lab-hov'); n.removeAttribute('data-lab-sel'); });
      $('insCode').value = c.outerHTML; link([sel]); toast('📥 코드를 가져왔어요 · 고치면 바로 바뀌어요');
    };
    $('insGo').onclick = () => insert();
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
    return { show, down, wasDrag, insert, unlink: () => link([]) };
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
  $('qkWhere').onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; ui.qkWhere = b.dataset.w; saveUi(); drawQkWhere(); drawCur(); };
  const WHERE = { 'background-color': '배경색', color: '글자색', 'border-color': '테두리색', 'box-shadow': '그림자색' };
  // live = 컬러피커를 끄는 중 (되돌리기 기록 없이 미리 칠해 보기)
  function paint(color, live) {
    if (!sel) { toast('상자를 먼저 골라 주세요'); return; }
    const cs = frame.contentWindow.getComputedStyle(sel);
    if (ui.qkWhere === 'background-color' && $('qkBgOnly').checked) sel.style.setProperty('background-image', 'none');
    if (ui.qkWhere === 'border-color' && cs.borderTopStyle === 'none') { sel.style.setProperty('border-style', 'solid'); sel.style.setProperty('border-width', '1px'); }
    if (ui.qkWhere === 'box-shadow') {
      const c0 = cs.boxShadow;
      sel.style.setProperty('box-shadow', !c0 || c0 === 'none' ? `3px 3px 0 ${color}` : c0.replace(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi, color));
    } else sel.style.setProperty(ui.qkWhere, color);
    if (live) { drawCur(); return; }
    CP.set(color); CP.pushHist(); commit(); showBox(); drawQkSw();
    toast(`🎨 ${WHERE[ui.qkWhere]} ${color}`);
  }
  // 고른 상자에 지금 칠해진 색 (없으면 null)
  const toHex6 = (r, g, b) => '#' + [r, g, b].map(x => (+x).toString(16).padStart(2, '0')).join('');
  function curColor(where) {
    if (!sel) return null;
    const cs = frame.contentWindow.getComputedStyle(sel);
    let v;
    if (where === 'background-color') v = cs.backgroundColor;
    else if (where === 'color') v = cs.color;
    else if (where === 'border-color') { if (cs.borderTopStyle === 'none' || !parseFloat(cs.borderTopWidth)) return null; v = cs.borderTopColor; }
    else { if (!cs.boxShadow || cs.boxShadow === 'none') return null; v = (cs.boxShadow.match(/rgba?\([^)]*\)/) || [])[0]; }
    const m = String(v || '').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?/);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : +m[4];
    if (a === 0) return null;
    const hex = toHex6(Math.round(m[1]), Math.round(m[2]), Math.round(m[3]));
    return { hex, a, css: a < 1 ? `rgba(${Math.round(m[1])}, ${Math.round(m[2])}, ${Math.round(m[3])}, ${+a.toFixed(2)})` : hex };
  }
  function drawCur() {
    const c = curColor(ui.qkWhere), sw = $('curSw2');
    sw.classList.toggle('none', !c); sw.style.background = c ? c.css : '';
    if (document.activeElement !== $('qkHex')) { $('qkHex').value = c ? c.css : ''; $('qkHex').placeholder = c ? '#f689b6' : '없음 · 색 코드를 넣어 칠하기'; }
    $('qkPick').value = c ? c.hex : '#ffffff';
    document.querySelectorAll('#qkWhere button').forEach(b => {
      const x = curColor(b.dataset.w);
      b.innerHTML = `<i class="qw-dot${x ? '' : ' none'}" style="${x ? `background:${x.css}` : ''}"></i>${WHERE[b.dataset.w]}`;
    });
    $('qkNow').innerHTML = sel ? '지금 → ' + Object.keys(WHERE).map(w => { const x = curColor(w); return `${WHERE[w]} <b>${x ? esc(x.css) : '없음'}</b>`; }).join(' · ') : '';
  }
  $('qkPick').addEventListener('input', () => paint($('qkPick').value, true));
  $('qkPick').addEventListener('change', () => paint($('qkPick').value));
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
  $('qkHex').addEventListener('input', () => { const v = $('qkHex').value.trim(); if (CP.set(v)) { $('curSw2').classList.remove('none'); $('curSw2').style.background = v.startsWith('#') || v.startsWith('rgb') ? v : '#' + v; } });
  $('qkApply').onclick = () => { const v = $('qkHex').value.trim(); if (v && !CP.set(v)) { toast('색 코드를 확인해 주세요'); return; } paint(CP.hex()); };
  $('qkMode').onclick = e => $('gMode').querySelector(`[data-m="${e.target.closest('[data-m]')?.dataset.m}"]`)?.click();
  $('qkTag').onchange = () => { ui.gTag = $('qkTag').value; saveUi(); Gal.draw(); };
  $('qkGal').addEventListener('click', e => { const it = e.target.closest('[data-gid]'); if (!it) return; const x = Gal.get(it.dataset.gid); if (x) { if (x.mode) { ui.gMode = x.mode; saveUi(); drawGMode(); } applyImg(x, true); } });
  $('qkGal').addEventListener('mouseover', e => { const it = e.target.closest('[data-gid]'); if (!it) return; const x = Gal.get(it.dataset.gid); if (x) { peekOff(); peekOn({ ...x, mode: x.mode || ui.gMode }); } });
  $('qkGal').addEventListener('mouseleave', peekOff);
  $('qkBd').addEventListener('click', e => { const it = e.target.closest('[data-use]'); if (it) BD.use(it.dataset.use); });

  /* ---------------- ✨ 꾸미기 → 🧩 테두리 / 🌟 스티커 ---------------- */
  function showDeco(t) {
    ui.dt = t; saveUi();
    document.querySelectorAll('#decoTabs button').forEach(b => b.classList.toggle('on', b.dataset.dt === t));
    document.querySelectorAll('.deco-pane').forEach(p => p.hidden = p.dataset.dp !== t);
  }
  $('decoTabs').onclick = e => { const b = e.target.closest('[data-dt]'); if (b) showDeco(b.dataset.dt); };

  const ST = (() => {
    let list = store.json('lab.stickers', []) || [];
    let extra = store.json('lab.stTags', []) || [];
    const save = () => store.setJson('lab.stickers', list);
    const code = x => x.html || `<img src="${x.url}"${x.style ? ` style="${x.style}"` : ''}>`;
    const all = () => list.concat(repoStks());
    function draw() {
      const A = all();
      const tags = [...new Set(list.map(x => x.tag).filter(Boolean).concat(extra))].sort((a, b) => a.localeCompare(b, 'ko'));
      if (repoStks().length) tags.push(STK_TAG);
      if (ui.stTag && !tags.includes(ui.stTag)) ui.stTag = '';
      $('stTags').innerHTML = [['', `전부 ${A.length}`], ...tags.map(t => [t, `${t === STK_TAG ? '' : '📁 '}${t} ${A.filter(x => x.tag === t).length}`])]
        .map(([v, l]) => `<button class="lk-tag ${v === (ui.stTag || '') ? 'on' : ''}" data-st="${esc(v)}">${esc(l)}</button>`).join('') + `<button class="lk-tag add" data-st-new>＋ 새 분류</button>`;
      const items = A.filter(x => !ui.stTag || x.tag === ui.stTag);
      $('stGrid').innerHTML = items.map(x => `<div class="st-it${x.repo ? ' repo' : ''}" data-id="${esc(x.id)}">${x.repo ? '<span class="rp">📦</span>' : ''}<div class="st-th" title="${esc(x.name || x.url || '코드')}">${code(x)}</div>
        <div class="g-ft"><span>${esc(x.name || '')}</span>${x.repo ? '' : `<button data-sted="${x.id}">✎</button>`}<button data-stcp="${esc(x.id)}" title="코드 복사">📋</button>${x.repo ? '' : `<button data-stdel="${x.id}">✕</button>`}</div></div>`).join('')
        || '<div class="lab-empty">스티커 주소를 붙여 넣어 보세요 ♪</div>';
    }
    async function add(url) {
      url = url.trim(); if (!/^(https?:)?\/\//.test(url) && !/^data:image/.test(url)) { toast('이미지 주소가 아니에요'); return false; }
      if (list.some(x => x.url === url)) { toast('이미 있어요'); return false; }
      const ok = await new Promise(res => { const im = new Image(); im.onload = () => res(true); im.onerror = () => res(false); im.src = url; setTimeout(() => res(false), 8000); });
      if (!ok) { toast('⚠️ 이미지를 못 불러왔어요'); return false; }
      list.unshift({ id: Date.now().toString(36), url, name: '', tag: ui.stTag === STK_TAG ? '' : (ui.stTag || ''), style: '' }); save(); draw(); toast('🌟 스티커 저장!'); return true;
    }
    $('stUrl').addEventListener('paste', () => setTimeout(async () => { if (await add($('stUrl').value)) $('stUrl').value = ''; }, 0));
    $('stUrl').addEventListener('keydown', async e => { if (e.key === 'Enter' && await add($('stUrl').value)) $('stUrl').value = ''; });
    $('stCode').onclick = async () => {
      const r = await Modal.prompt('📝 코드로 스티커 추가', [
        { name: 'html', label: '코드 (img 여러 개를 묶은 것도 OK)', type: 'textarea', rows: 4, placeholder: '<img src="..." style="filter: saturate(0.4)">' },
        { name: 'name', label: '이름' }, { name: 'tag', label: '분류', value: ui.stTag || '' }]);
      if (!r || !r.html.trim()) return;
      list.unshift({ id: Date.now().toString(36), html: r.html.trim(), name: r.name.trim(), tag: r.tag.trim() }); save(); draw(); toast('🌟 저장!');
    };
    $('stTags').onclick = async e => {
      if (e.target.closest('[data-st-new]')) {
        const r = await Modal.prompt('📁 새 분류', [{ name: 'tag', label: '분류 이름', placeholder: '예: 구분선 / 리본 / 하트' }], { ok: '만들기 ♡' });
        const t = r && r.tag.trim(); if (!t) return; if (!extra.includes(t)) { extra.push(t); store.setJson('lab.stTags', extra); } ui.stTag = t; saveUi(); draw(); return;
      }
      const b = e.target.closest('[data-st]'); if (!b) return; ui.stTag = b.dataset.st; saveUi(); draw();
    };
    $('stGrid').onclick = async e => {
      const get = id => all().find(x => x.id === id);
      const ed = e.target.closest('[data-sted]');
      if (ed) {
        const x = get(ed.dataset.sted);
        const fields = x.html ? [{ name: 'html', label: '코드', type: 'textarea', rows: 4, value: x.html }] : [{ name: 'style', label: '꾸밈 style (예: filter: saturate(0.4))', value: x.style || '' }];
        const r = await Modal.prompt('🌟 스티커 정보', [{ name: 'name', label: '이름', value: x.name || '' }, { name: 'tag', label: '분류', value: x.tag || '' }, ...fields]);
        if (!r) return; x.name = r.name.trim(); x.tag = r.tag.trim(); if (x.html) x.html = r.html.trim(); else x.style = r.style.trim(); save(); draw(); return;
      }
      const cp = e.target.closest('[data-stcp]'); if (cp) { toast(await copyText(code(get(cp.dataset.stcp))) ? '📋 코드 복사!' : '⚠️ 복사 실패'); return; }
      const dl = e.target.closest('[data-stdel]'); if (dl) { if (await Modal.confirm('이 스티커를 뺄까요?')) { list = list.filter(x => x.id !== dl.dataset.stdel); save(); draw(); } return; }
      const it = e.target.closest('.st-th'); if (!it) return;
      Pos.insert(code(get(it.parentElement.dataset.id)));
    };
    // 처음 한 번 기본 스티커 넣기 (같은 주소는 건너뛰어요)
    function seed(items) {
      let n = 0;
      items.forEach(x => { const key = x.url || x.html; if (list.some(y => (y.url || y.html) === key)) return; list.push({ id: Date.now().toString(36) + (n++), name: '', style: '', ...x }); });
      if (n) save();
      draw();
    }
    return { draw, seed };
  })();

  /* ---------------- 기본 테두리 · 기본 스티커 ---------------- */
  const GH = 'https://raw.githubusercontent.com/okayletsgo555/img/main/';
  const PRESET_BORDERS = [
    ['핑크 바탕 흰 레이스', 'https://i.ibb.co/fGPRTPf3/845a1b88f45093126c643cc449063282-2-1.png', 19, 16, true, 'round'],
    ['핑크 레이스', 'https://i.pinimg.com/736x/28/bc/de/28bcde7d693b3af93ffbfd46bdf1b1bf.jpg', 29, 20, false, 'round'],
    ['핑크 바탕 흰 프릴', 'https://i.ibb.co/0pqr6qj7/tumblr-4b6c9c0de67b030673c1e73b3bb9355b-d5e71ae6-1280-3-6-1.png', 33, 16, true, 'round'],
    ['베개', 'https://i.ibb.co/7JhsDvHP/845a1b88f45093126c643cc449063282.png', 30, 16, false, 'round'],
    ['하트 프레임', 'https://i.ibb.co/CKjD0HSw/borderhearts.png', 33, 10, false, 'round'],
    ['흰 바탕 흰 레이스', 'https://i.ibb.co/B2V1n8Nh/tumblr-4b6c9c0de67b030673c1e73b3bb9355b-d5e71ae6-1280-3.png', 30, 18, false, 'round'],
    ['식탁보', 'https://i.ibb.co/7dQ5p0W7/site-lace-alt-2.png', 15, 20, true, 'round'],
    ['그레이 프레임 (회색 올록볼록)', GH + '%EA%B7%B8%EB%A0%88%EC%9D%B4%20%ED%94%84%EB%A0%88%EC%9E%84.png', 8, 7, true, 'round'],
    ['헤더용 프레임 (진함)', 'https://i.postimg.cc/RhJCpKqH/testborder3.png', 15, 9, false, 'round'],
    ['손수건 (옅음)', 'https://i.postimg.cc/jdM6yh46/qoxgh5.png', 8, 9, false, 'round'],
    ['흰 레이스', 'https://cdn.jsdelivr.net/gh/dearcoeur/coeur-assets@main/media/borders/renda-bg.png', 18, 26, false, 'repeat'],
    ['모카 #1', 'https://mocha.crd.co/assets/images/gallery10/11b35e57.png?v=667e73fe', 16, 9, false, 'round'],
    ['모카 #2', 'https://mocha.crd.co/assets/images/gallery06/08abca77.png?v=667e73fe', 18, 9, false, 'round'],
    ['모카 #3', 'https://mocha.crd.co/assets/images/gallery06/1a15c3f7.png?v=667e73fe', 13, 9, false, 'round'],
    ['모카 #4', 'https://mocha.crd.co/assets/images/gallery06/8258070e.png?v=667e73fe', 20, 9, false, 'round'],
    ['모카 #5', 'https://mocha.crd.co/assets/images/gallery06/479c2895.png?v=667e73fe', 12, 9, false, 'round'],
    ['모카 #6', 'https://mocha.crd.co/assets/images/gallery06/3c95f95f.png?v=667e73fe', 12, 9, false, 'round'],
    ['모카 #7', 'https://mocha.crd.co/assets/images/gallery06/37e5b5a5.png?v=667e73fe', 7, 9, false, 'round'],
    ['#8', 'https://i.imgur.com/cKNXWMc.png', 26, 9, false, 'round'],
    ['#9', 'https://i.pinimg.com/736x/f5/0f/15/f50f15556f9389e6ebd39ad69cb55d72.jpg', 26, 9, false, 'round'],
    ['#10 picmix', GH + 'picmix.com_2415834.png', 70, 9, false, 'round'],
    ['#13 FsgoCPW', GH + 'FsgoCPW.png', 8, 7, true, 'round'],
    ['#14 NJa4bp2', GH + 'NJa4bp2.png', 8, 7, true, 'round']
  ].map(([name, url, slice, width, fill, rep]) => ({ name, url, slice: String(slice), width: String(width), out: '0', rep, fill }));
  const D = 'https://decomail.space/dividers/';
  const PRESET_STICKERS = [
    ['grey/22.png', 'filter: saturate(0.4)'], ['pink/500.png', 'filter: saturate(0.4)'], ['pink/625.gif', 'filter: saturate(0.7)'], ['pink/694.png', ''],
    ['red/240.png', 'filter: saturate(0.4)'], ['blue/145.png', 'filter: saturate(0.3)'], ['white/84.gif', ''], ['blue/168.gif', ''], ['blue/287.png', 'filter: saturate(0.5)']
  ].map(([u, style]) => ({ url: D + u, style, tag: '구분선' }))
    .concat([{ tag: '구분선', name: '파란 리본 두 개', html: `<div><img src="${D}blue/212.gif" style="filter: saturate(0.3)"><img src="${D}blue/212.gif" style="filter: saturate(0.3) brightness(1.1)"></div>` }]);

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
  $('fSample').oninput = () => { ui.sample = $('fSample').value; saveUi(); renderFonts(); };
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
    const dragged = ui.mode === 'text' && lastRange && !lastRange.collapsed ? lastRange.toString().replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    const sample = dragged || ui.sample || 'あいう 가나다 ABC';
    const row = f => `<div class="ft-it ${f.family === now ? 'on' : ''}" data-f="${esc(f.family)}"><button class="st ${fav.includes(f.family) ? 'on' : ''}" data-star="${esc(f.family)}" title="즐겨찾기">★</button><span class="nm" title="${esc(f.family + (f.memo ? ' · ' + f.memo : ''))}">${f.family === now ? '✔ ' : ''}${esc(f.family)}</span><span class="sm" style="font-family:'${esc(f.family)}', sans-serif">${esc(sample)}</span></div>`;
    let html = '';
    const favs = all.filter(f => fav.includes(f.family));
    if (favs.length) html += `<div class="ft-g">★ 즐겨찾기</div>` + favs.map(row).join('');
    [...new Set(all.map(f => f.group))].forEach(g => { html += `<div class="ft-g">📁 ${esc(g)}</div>` + all.filter(f => f.group === g).map(row).join(''); });
    $('fList').innerHTML = (dragged ? `<div class="ft-drag">✏️ 드래그한 글자로 미리보는 중 · <b>${esc(dragged)}</b></div>` : '') + (now ? `<div class="ft-now">✔ 지금 폰트: <b style="font-family:'${esc(now)}'">${esc(now)}</b></div>` : '') + (html || '<div class="lab-empty">폰트가 없어요</div>');
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
    if (s && s.rangeCount && d.body.contains(s.getRangeAt(0).startContainer)) caret = s.getRangeAt(0).cloneRange();
    if (!s || !s.rangeCount || s.isCollapsed || !s.toString().trim()) { hideFloat(); if (lastRange) { lastRange = null; if (ui.tab === 'font') renderFonts(); } TB.state(); return; }
    lastRange = s.getRangeAt(0).cloneRange();
    if (ui.tab === 'font') renderFonts();
    TB.state();
    return; // (예전 떠다니는 도구는 위 글자 도구막대로 옮겼어요)
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

  /* ---------------- ✏️ 글자 도구막대 ---------------- */
  const TB = (() => {
    const pop = $('tbPop');
    const MARKS = ['#fff3a8', '#ffd6e6', '#cfeaff', '#d6f5d6', '#e8dcff', '#ffe0c2'];
    const INKS = ['#333333', '#5a4a44', '#f689b6', '#e0434f', '#3f88c4', '#4f9a5c', '#9b7fd1', '#ffffff'];
    let colorNow = store.get('lab.tbColor', '#f689b6'), markNow = store.get('lab.tbMark', '#fff3a8');
    const bars = () => { $('tbColBar').style.background = colorNow; $('tbMarkBar').style.background = markNow; };
    // 폰트 · 크기
    const fillFonts = () => { $('tbFont').innerHTML = '<option value="">폰트</option>' + FontLib.optionsHtml('', []); };
    fillFonts();
    $('tbFont').onchange = () => { const v = $('tbFont').value.replace(/^lib:/, ''); if (v) applyFont(v); $('tbFont').value = ''; };
    $('tbSize').innerHTML += [8, 9, 10, 10.5, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40].map(n => `<option>${n}px</option>`).join('');
    $('tbSize').onchange = () => { if ($('tbSize').value && need()) { wrapSel({ 'font-size': $('tbSize').value }); commit(); } $('tbSize').value = ''; };
    const need = () => { if (lastRange && !lastRange.collapsed) return true; toast('글자를 먼저 드래그해 주세요'); return false; };
    const startEl = () => { const r = lastRange || caret; if (!r) return sel; let n = r.startContainer; if (n.nodeType !== 1) n = n.parentElement; return n; };
    const blockOf = () => {
      const w = frame.contentWindow, d = doc(); let n = startEl();
      while (n && n !== d.body && /^inline/.test(w.getComputedStyle(n).display)) n = n.parentElement;
      return n && n !== d.body ? n : sel;
    };
    function state() {
      const el = startEl(); if (!el || !frame.contentWindow) return;
      const cs = frame.contentWindow.getComputedStyle(el);
      $('tbSize').options[0].textContent = Math.round(parseFloat(cs.fontSize) * 10) / 10 + 'px';
      $('tbFont').options[0].textContent = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim() || '폰트';
    }
    // 팝업
    function openPop(btn, html, onPick) {
      if (!pop.hidden && pop.dataset.for === btn.dataset.tb) { pop.hidden = true; return; }
      pop.innerHTML = html; pop.dataset.for = btn.dataset.tb; pop.hidden = false;
      const r = btn.getBoundingClientRect();
      pop.style.top = (r.bottom + 4) + 'px'; pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8)) + 'px';
      pop.onclick = e => onPick(e);
    }
    document.addEventListener('mousedown', e => { if (!e.target.closest('#tbPop, #tbar')) pop.hidden = true; });
    const swRow = (cols, attr = 'data-c') => cols.map(c => `<button class="sw" ${attr}="${c}" style="background:${c}" title="${c}"></button>`).join('');
    function colorHtml(title, base) {
      const hist = (store.json(K.hist, []) || []).slice(0, 12), pals = store.json(K.pals, []) || [];
      return `<div class="tp-t">${title}</div><div class="lab-sw-list">${swRow(base)}</div>
        ${hist.length ? `<div class="tp-s">🕘 최근</div><div class="lab-sw-list">${swRow(hist)}</div>` : ''}
        ${pals.map(p => `<div class="tp-s">🎀 ${esc(p.name)}</div><div class="lab-sw-list">${swRow(p.colors)}</div>`).join('')}
        <div class="tp-row"><span class="lab-cur-sw" style="background:${CP.hex()}"></span><button class="btn mini white" data-c="${CP.hex()}">🎨 색 탭의 지금 색</button></div>`;
    }
    // 테두리 · 외곽선 모양
    const BOX = { sq: { border: '1px solid currentColor', padding: '0 3px' }, rd: { border: '1px solid currentColor', padding: '0 5px', 'border-radius': '8px' }, dot: { border: '1px dashed currentColor', padding: '0 3px' }, dbl: { border: '3px double currentColor', padding: '0 3px' } };
    function act(k, btn) {
      const d = doc(); if (!d) return;
      const done = () => { commit(); fitFrame(); state(); };
      switch (k) {
        case 'size-': case 'size+': {
          if (!need()) return; const cs = frame.contentWindow.getComputedStyle(startEl());
          wrapSel({ 'font-size': Math.max(6, parseFloat(cs.fontSize) + (k === 'size+' ? 1 : -1)) + 'px' }); done(); break;
        }
        case 'b': if (need()) { wrapSel({ 'font-weight': 'bold' }); done(); } break;
        case 'i': if (need()) { wrapSel({ 'font-style': 'italic' }); done(); } break;
        case 's': if (need()) { wrapSel({ 'text-decoration': 'line-through' }); done(); } break;
        case 'u': if (need()) { wrapSel({ 'text-decoration': 'underline', 'text-underline-offset': '2px' }); done(); } break;
        case 'color':
          openPop(btn, colorHtml('글자색', INKS), e => { const c = e.target.closest('[data-c]'); if (!c) return; colorNow = c.dataset.c; store.set('lab.tbColor', colorNow); bars(); if (need()) { wrapSel({ color: colorNow }); CP.pushHist(colorNow); done(); } pop.hidden = true; });
          break;
        case 'mark':
          openPop(btn, colorHtml('형광펜', MARKS) + `<div class="tp-row"><label class="lab-chk"><input type="checkbox" id="tpFull" ${store.get('lab.tbMarkFull') === '1' ? 'checked' : ''}> 글자 전체 칠하기 (끄면 아래 반만)</label></div>`, e => {
            if (e.target.id === 'tpFull') { store.set('lab.tbMarkFull', e.target.checked ? '1' : '0'); return; }
            const c = e.target.closest('[data-c]'); if (!c) return; markNow = c.dataset.c; store.set('lab.tbMark', markNow); bars();
            if (need()) { wrapSel(store.get('lab.tbMarkFull') === '1' ? { 'background-color': markNow } : { background: `linear-gradient(transparent 55%, ${markNow} 55%)` }); done(); }
            pop.hidden = true;
          });
          break;
        case 'box':
          openPop(btn, `<div class="tp-t">글자 테두리</div><div class="tp-boxes">${Object.keys(BOX).map(t => `<button data-bx="${t}"><span style="${Object.entries(BOX[t]).map(([a, b]) => a + ':' + b).join(';')}">가나</span></button>`).join('')}</div>`, e => {
            const b = e.target.closest('[data-bx]'); if (!b) return; if (need()) { wrapSel(BOX[b.dataset.bx]); done(); } pop.hidden = true;
          });
          break;
        case 'outline':
          openPop(btn, `<div class="tp-t">외곽선 색</div><div class="lab-sw-list">${swRow(['#ffffff', '#fff6fa', '#333333', '#f689b6', CP.hex()])}</div>`, e => {
            const c = e.target.closest('[data-c]'); if (!c) return; const o = c.dataset.c;
            if (need()) { wrapSel({ 'text-shadow': [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([x, y]) => `${x}px ${y}px 0 ${o}`).join(', ') }); done(); }
            pop.hidden = true;
          });
          break;
        case 'ruby': {
          if (!need()) return; const text = lastRange.toString();
          Modal.prompt('ルビ 후리가나 달기', [{ name: 'rt', label: `「${text}」 위에 작게 올릴 글자`, placeholder: '예: かんさつにっき' }], { ok: '달기 ♡' }).then(r => {
            if (!r || !r.rt.trim() || !lastRange) return;
            const ru = d.createElement('ruby'); ru.textContent = text; const rt = d.createElement('rt'); rt.textContent = r.rt.trim(); ru.appendChild(rt);
            lastRange.deleteContents(); lastRange.insertNode(ru); done();
          });
          break;
        }
        case 'al-left': case 'al-center': case 'al-right': case 'al-justify': {
          const b = blockOf(); if (!b) { toast('글자나 상자를 먼저 골라 주세요'); return; }
          const a = k.slice(3);
          b.style.setProperty('text-align', a);
          if (a === 'justify') { b.style.setProperty('word-break', 'break-word'); b.style.setProperty('overflow-wrap', 'anywhere'); }
          done(); break;
        }
        case 'vert': case 'horiz': {
          const v = k === 'vert';
          if (lastRange && !lastRange.collapsed && v) { wrapSel({ display: 'inline-block', 'writing-mode': 'vertical-rl', 'vertical-align': 'top' }); done(); break; }
          const b = blockOf(); if (!b) { toast('글자나 상자를 먼저 골라 주세요'); return; }
          if (v) b.style.setProperty('writing-mode', 'vertical-rl'); else { b.style.removeProperty('writing-mode'); let n = startEl(); while (n && n !== b) { n.style && n.style.removeProperty('writing-mode'); n = n.parentElement; } }
          done(); break;
        }
        case 'ls-': case 'ls+': {
          if (!need()) return; const cs = frame.contentWindow.getComputedStyle(startEl());
          const now = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
          wrapSel({ 'letter-spacing': (Math.round((now + (k === 'ls+' ? .5 : -.5)) * 10) / 10) + 'px' }); done(); break;
        }
        case 'lh':
          openPop(btn, `<div class="tp-t">줄 간격 (글자가 있는 줄 덩어리에)</div><div class="tp-row wrap">${[1.2, 1.4, 1.6, 1.8, 2, 2.4].map(v => `<button class="btn mini white" data-lh="${v}">${v}</button>`).join('')}</div>`, e => {
            const b2 = e.target.closest('[data-lh]'); if (!b2) return; const b = blockOf(); if (b) { b.style.setProperty('line-height', b2.dataset.lh); done(); } pop.hidden = true;
          });
          break;
        case 'emoji': emojiPop(btn); break;
        case 'clear': {
          if (!need()) return; const t = lastRange.toString(); lastRange.deleteContents(); lastRange.insertNode(d.createTextNode(t)); done(); break;
        }
      }
    }
    // 🖼 텍스트 이모지 팔레트
    async function emojiPop(btn) {
      let list = Emoji.cached();
      if (!list.length && typeof Repo !== 'undefined' && Repo.info()) { try { list = await Emoji.refresh(); } catch (e) {} }
      if (!list.length) { toast('등록된 GIF 이모지가 없어요 (🖼 이모지 페이지 참고)'); return; }
      const groups = [...new Set(list.map(x => x.group))];
      let g = store.get('lab.tbEmoG', groups[0]); if (!groups.includes(g)) g = groups[0];
      const recent = store.json('lab.tbEmoRecent', []) || [];
      const grid = gg => list.filter(x => x.group === gg).map(x => `<button class="tp-emo" data-u="${esc(x.url)}" title="${esc(x.name || '')}"><img src="${esc(x.url)}" loading="lazy" alt=""></button>`).join('');
      openPop(btn, `<div class="tp-t">🖼 텍스트 이모지 <small>누르면 커서 자리에 쏙</small></div>
        ${recent.length ? `<div class="tp-s">🕘 최근</div><div class="tp-emos">${recent.map(u => `<button class="tp-emo" data-u="${esc(u)}"><img src="${esc(u)}" alt=""></button>`).join('')}</div>` : ''}
        <select class="tx sel" id="tpEmoG">${groups.map(x => `<option ${x === g ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <div class="tp-emos big" id="tpEmoGrid">${grid(g)}</div>`, e => {
        const b = e.target.closest('[data-u]'); if (!b) return; insertEmoji(b.dataset.u);
        store.setJson('lab.tbEmoRecent', [b.dataset.u, ...recent.filter(u => u !== b.dataset.u)].slice(0, 16));
      });
      $('tpEmoG').onchange = () => { store.set('lab.tbEmoG', $('tpEmoG').value); $('tpEmoGrid').innerHTML = grid($('tpEmoG').value); };
    }
    function insertEmoji(url) {
      const d = doc(); const r = (lastRange && !lastRange.collapsed ? lastRange : caret);
      if (!r || !d.body.contains(r.startContainer)) { toast('글자 사이에 커서를 먼저 놓아 주세요'); return; }
      if (!d.querySelector('style[data-textemoji]') && !/\.text-emoji\s*\{/.test(cur)) {
        const st = d.createElement('style'); st.setAttribute('data-textemoji', '');
        st.textContent = '.text-emoji { display: inline-block !important; float: none !important; clear: none !important; height: 1.2em; width: auto; vertical-align: middle; margin: 0 2px; }';
        (isDoc ? d.head : d.body).prepend(st);
      }
      const img = d.createElement('img'); img.className = 'text-emoji'; img.src = url;
      if (!r.collapsed) r.collapse(false);   // 드래그한 글자는 지우지 않고 그 뒤에 넣어요
      r.insertNode(img); r.setStartAfter(img); r.collapse(true); caret = r.cloneRange();
      const s2 = d.getSelection(); s2.removeAllRanges(); s2.addRange(r);
      commit(); fitFrame();
    }
    $('tbar').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });   // 버튼 눌러도 드래그 유지
    $('tbar').addEventListener('click', e => { const b = e.target.closest('[data-tb]'); if (b) act(b.dataset.tb, b); });
    bars();
    return { state, fillFonts };
  })();

  /* ---------------- 📦 저장소 폴더 사진 (pattern/ · stickers/) ---------------- */
  const RepoImg = (() => {
    const IMG = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;
    const key = f => 'lab.repo.' + f;
    const get = folder => store.json(key(folder), []) || [];
    async function load(folder) {
      if (typeof Repo === 'undefined' || !Repo.info()) return false;
      try {
        const files = (await Repo.list(folder)).filter(f => IMG.test(f.name)).map(f => ({ name: f.name, url: f.url }));
        store.setJson(key(folder), files); return true;
      } catch (e) { console.warn(e); return false; }
    }
    return { get, load };
  })();
  const PAT_TAG = '📦 pattern 폴더', STK_TAG = '📦 stickers 폴더';
  const repoPats = () => RepoImg.get('pattern').map(f => ({ id: 'rp:' + f.name, url: f.url, name: f.name.replace(/\.[^.]+$/, ''), tag: PAT_TAG, mode: 'tile', repo: true }));
  const repoStks = () => RepoImg.get('stickers').map(f => ({ id: 'rs:' + f.name, url: f.url, name: f.name.replace(/\.[^.]+$/, ''), tag: STK_TAG, style: '', repo: true }));

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
      list.unshift({ id: Date.now().toString(36), url, name: '', tag: ui.gTag === PAT_TAG ? '' : (ui.gTag || ''), mode: ui.gMode }); save(); draw(); toast('💾 갤러리에 저장했어요'); return true;
    }
    const all = () => list.concat(repoPats());
    function draw() {
      const A = all();
      const tags = [...new Set(list.map(x => x.tag).filter(Boolean).concat(extraTags))].sort((a, b) => a.localeCompare(b, 'ko'));
      if (repoPats().length) tags.push(PAT_TAG);
      if (ui.gTag && !tags.includes(ui.gTag)) ui.gTag = '';
      $('gTags').innerHTML = [['', `전부 ${A.length}`], ...tags.map(t => [t, `${t === PAT_TAG ? '' : '📁 '}${t} ${A.filter(x => x.tag === t).length}`])]
        .map(([v, l]) => `<button class="lk-tag ${v === ui.gTag ? 'on' : ''}" data-gt="${esc(v)}">${esc(l)}</button>`).join('') + `<button class="lk-tag add" data-gt-new>＋ 새 분류</button>`;
      $('qkTag').innerHTML = `<option value="">📁 전부 (${A.length})</option>` + tags.map(t => `<option value="${esc(t)}" ${t === ui.gTag ? 'selected' : ''}>${t === PAT_TAG ? '' : '📁 '}${esc(t)}</option>`).join('');
      $('gWhere').innerHTML = ui.gTag && ui.gTag !== PAT_TAG ? `새로 저장하면 <b>📁 ${esc(ui.gTag)}</b> 분류에 들어가요` : '분류를 고른 채로 저장하면 그 분류에 들어가요 · ✎ 로 나중에 옮길 수도 있어요';
      const items = A.filter(x => !ui.gTag || x.tag === ui.gTag);
      $('gal').innerHTML = items.map(x => `<div class="g-it${x.repo ? ' repo' : ''}" data-id="${esc(x.id)}" data-mode="${x.mode || 'tile'}">
        <span class="g-badge">${({ tile: '타일', stretch: '늘이기', cover: '덮기', one: '한 장' })[x.mode || 'tile']}</span>${x.repo ? '<span class="g-badge rp">📦</span>' : ''}
        <div class="g-th" style="background-image:url('${esc(x.url)}')" title="${esc(x.name || x.url)}"></div>
        <div class="g-ft"><span>${esc(x.name || '')}</span>${x.repo ? '' : `<button data-ed="${x.id}">✎</button>`}<button data-cp="${esc(x.id)}" title="주소 복사">🔗</button>${x.repo ? '' : `<button data-del="${x.id}">✕</button>`}</div></div>`).join('')
        || '<div class="lab-empty" style="grid-column:1/-1">위 칸에 이미지 주소를 붙여 넣어 보세요 ♪</div>';
      $('qkGal').innerHTML = items.map(x => `<div class="g-it" data-mode="${x.mode || 'tile'}"><div class="g-th" data-gid="${esc(x.id)}" style="background-image:url('${esc(x.url)}')" title="${esc(x.name || x.url)}"></div></div>`).join('')
        || '<div class="lab-help" style="grid-column:1/-1">🖼 이미지 탭에서 주소를 저장하면 여기에 떠요</div>';
    }
    async function newTag() {
      const r = await Modal.prompt('📁 새 분류', [{ name: 'tag', label: '분류 이름', placeholder: '예: 배경 / 타일 / 구분선 / 프레임' }], { ok: '만들기 ♡' });
      const t = r && r.tag.trim(); if (!t) return;
      if (!extraTags.includes(t)) { extraTags.push(t); store.setJson('lab.imgTags', extraTags); }
      ui.gTag = t; saveUi(); draw();
    }
    const get = id => all().find(x => x.id === id);
    async function edit(id) {
      const x = get(id); if (!x || x.repo) return;
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
    function seed(items) {
      let n = 0;
      items.forEach(b => { if (list.some(x => x.url === b.url)) return; list.push({ id: Date.now().toString(36) + (n++), ...b }); });
      if (n) save();
      draw();
    }
    return { draw, prev, seed, use: id => apply(list.find(x => x.id === id)) };
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
      $('cpBig').style.background = hx;
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

  /* ---------------- ✨ 바뀐 것만 ---------------- */
  const Diff = (() => {
    const INLINE = /^(B|I|U|S|STRONG|EM|SPAN|FONT|RUBY|RT|RP|BR|MARK|SMALL|BIG|SUB|SUP|STRIKE|DEL|INS|IMG|A)$/;
    const STATE = /^(on|show|open|active|sel|selected|unread|mine)$/;
    const ign = el => el.hasAttribute('data-lab') || /^(SCRIPT|NOSCRIPT)$/.test(el.tagName) || el.matches('.spk, .hrt');
    const kids = el => [...el.children].filter(c => !ign(c));
    const sig = el => el.tagName + '#' + (el.id || '') + '.' + ([...el.classList].find(c => !STATE.test(c)) || '');
    const norm = t => (t || '').replace(/\s+/g, ' ').trim();
    const ownText = el => norm([...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' '));
    const isFloat = el => /position\s*:\s*absolute/i.test(el.getAttribute('style') || '');
    function lcs(A, B) {
      const n = A.length, m = B.length, T = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i][j] = sig(A[i]) === sig(B[j]) ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
      const out = []; let i = 0, j = 0;
      while (i < n && j < m) { if (sig(A[i]) === sig(B[j])) { out.push([A[i], B[j]]); i++; j++; } else if (T[i + 1][j] >= T[i][j + 1]) i++; else j++; }
      return out;
    }
    // style="" 를 선언 단위로 (url(...;...) 안의 ; 는 그대로)
    function decls(el) {
      const t = el.getAttribute('style') || '', out = new Map(); let buf = '', dep = 0, q = '';
      const push = () => { const k = buf.indexOf(':'); if (k > 0) out.set(buf.slice(0, k).trim().toLowerCase(), buf.slice(k + 1).trim()); buf = ''; };
      for (const ch of t) {
        if (q) { if (ch === q) q = ''; buf += ch; continue; }
        if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
        if (ch === '(') dep++; if (ch === ')') dep--;
        if (ch === ';' && dep <= 0) { push(); continue; }
        buf += ch;
      }
      push(); return out;
    }
    let dummy = null;
    const longhands = (p, v) => { dummy.style.cssText = ''; dummy.style.setProperty(p, v.replace(/\s*!important$/, '')); const l = [...dummy.style]; return l.length ? l : [p]; };
    const cssOf = el => el.ownerDocument.defaultView.getComputedStyle(el);
    function clean(el, outer) {
      const c = el.cloneNode(true);
      [c, ...c.querySelectorAll('*')].forEach(n => { [...n.attributes].forEach(a => { if (/^data-lab|^contenteditable$|^spellcheck$/.test(a.name)) n.removeAttribute(a.name); }); });
      c.querySelectorAll('[data-lab], script.lab').forEach(n => n.remove());
      return (outer ? c.outerHTML : c.innerHTML).trim();
    }
    // 읽기 쉬운 고유 선택자 (원본 문서 기준)
    function selFor(el) {
      const d = el.ownerDocument; if (el === d.body) return 'body';
      const uniq = s => { try { const r = d.querySelectorAll(s); return r.length === 1 && r[0] === el; } catch (e) { return false; } };
      const part = n => {
        if (n.id) return '#' + CSS.escape(n.id);
        const cl = [...n.classList].filter(c => !STATE.test(c) && !/^data-lab/.test(c)).map(c => '.' + CSS.escape(c)).join('');
        return cl || n.tagName.toLowerCase();
      };
      const nth = n => { const par = n.parentElement; if (!par) return part(n); const same = [...par.children].filter(x => part(x) === part(n)); return same.length > 1 ? part(n) + `:nth-child(${[...par.children].indexOf(n) + 1})` : part(n); };
      let me = part(el); if (uniq(me)) return me;
      for (let a = el.parentElement; a && a !== d.documentElement; a = a.parentElement) { const s = part(a) + ' ' + me; if (uniq(s)) return s; }
      me = nth(el); if (uniq(me)) return me;
      for (let a = el.parentElement; a && a !== d.documentElement; a = a.parentElement) { const s = nth(a) + ' ' + me; if (uniq(s)) return s; }
      const chain = []; for (let n = el; n && n !== d.body; n = n.parentElement) { chain.unshift(nth(n)); if (n.id) break; }
      return chain.join(' > ');
    }
    function walk(a, b, R) {
      // 1) 꾸밈 (style)
      const A = decls(a), B = decls(b), list = [];
      let lost = false;
      A.forEach((v, p) => { if (!B.has(p)) lost = true; });
      B.forEach((v, p) => {
        if (A.get(p) === v) return;
        const ca = cssOf(a), cb = cssOf(b);
        if (longhands(p, v).some(l => ca.getPropertyValue(l) !== cb.getPropertyValue(l))) list.push([p, v.replace(/\s*!important$/, '')]);
      });
      if (list.length) R.css.push({ a, b, list });
      if (lost) R.attrs.push({ a, name: 'style', before: a.getAttribute('style') || '', after: b.getAttribute('style') || '' });
      // 2) 다른 속성 (src · href …)
      new Set([...a.getAttributeNames(), ...b.getAttributeNames()]).forEach(n => {
        if (/^(style|class|data-lab.*|contenteditable|spellcheck)$/.test(n)) return;
        if (a.getAttribute(n) !== b.getAttribute(n)) R.attrs.push({ a, name: n, before: a.getAttribute(n), after: b.getAttribute(n) });
      });
      // 3) 안쪽
      const KA = kids(a), KB = kids(b), pairs = lcs(KA, KB);
      const pa = new Set(pairs.map(x => x[0])), pb = new Set(pairs.map(x => x[1]));
      const add = KB.filter(x => !pb.has(x)), rem = KA.filter(x => !pa.has(x));
      const ta = ownText(a), tb = ownText(b);
      const textChanged = ta !== tb && ta.replace(/\d/g, '') !== tb.replace(/\d/g, '');
      if (textChanged || add.some(x => INLINE.test(x.tagName) && !isFloat(x)) || rem.some(x => INLINE.test(x.tagName))) { R.text.push({ a, b }); return; }
      add.forEach(x => { const i = KB.indexOf(x); let prev = null; for (let k = i - 1; k >= 0; k--) { const pr = pairs.find(p => p[1] === KB[k]); if (pr) { prev = pr[0]; break; } } R.added.push({ parent: a, prev, b: x }); });
      rem.forEach(x => R.removed.push(x));
      pairs.forEach(([x, y]) => walk(x, y, R));
    }
    // 원본을 숨은 칸에 그려서 (스크립트까지 돌린 뒤) 비교
    function baseline(html) {
      return new Promise(res => {
        const isD = /<html[\s>]/i.test(html);
        let src = isD ? html : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
        if (ui.base && isD) {
          const t = Date.now(), base = `<base href="${ui.base.replace(/"/g, '%22')}">`;
          src = /<head[^>]*>/i.test(src) ? src.replace(/<head([^>]*)>/i, `<head$1>${base}`) : src.replace(/<html([^>]*)>/i, `<html$1><head>${base}</head>`);
          src = src.replace(/(<(?:link|script)\b[^>]*?\b(?:href|src)=["'])([^"'?#]+\.(?:css|js))(["'])/gi, `$1$2?lab=${t}$3`);
        }
        const f = document.createElement('iframe');
        f.setAttribute('aria-hidden', 'true');
        f.style.cssText = `position:fixed;left:-20000px;top:0;width:${frame.clientWidth || 1200}px;height:${(frame.contentWindow && frame.contentWindow.innerHeight) || 900}px;border:0;opacity:0;pointer-events:none`;
        f.onload = () => setTimeout(() => res(f), 800);
        document.body.append(f); f.srcdoc = src;
      });
    }
    const hasFace = (d, fam) => { for (const sh of d.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const r of rules) if (r.type === 5 && norm(r.style.getPropertyValue('font-family')).replace(/["']/g, '') === fam) return true; } return false; };
    const ta = (v, rows) => `<textarea class="tx chg-code" readonly rows="${rows || Math.min(12, Math.max(2, v.split('\n').length + 1))}">${esc(v)}</textarea>`;

    async function run() {
      const d = doc(); if (!d) return;
      let src = '';
      try {
        if (ui.base) { const r = await fetch(ui.base, { cache: 'no-store' }); if (!r.ok) throw 0; src = (await r.text()).replace(/<!-- Code injected by live-server -->\s*<script[\s\S]*?<\/script>/i, ''); }
        else src = store.get('lab.orig') || '';
      } catch (e) { src = store.get('lab.orig') || ''; }
      if (!src) { Modal.alert('비교할 원본이 없어요<br><small>🔗 주소로 열거나 🧾 코드로 넣은 뒤에 쓸 수 있어요</small>'); return; }
      toast('✨ 원본이랑 비교하는 중…');
      const f = await baseline(src), od = f.contentDocument;
      dummy = od.createElement('div');
      const R = { css: [], text: [], added: [], removed: [], attrs: [] };
      try { walk(od.body, d.body, R); } catch (e) { console.error(e); }
      // css 만들기 + 실제로 먹히는지 원본에 대 보고, 안 먹히면 !important
      R.css.forEach(r => { r.sel = selFor(r.a); r.imp = r.list.map(() => false); });
      const chk = od.createElement('style'); od.head.append(chk);
      const hex = v => v.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*1)?\)/g, (m, r, g, b) => '#' + [r, g, b].map(x => (+x).toString(16).padStart(2, '0')).join(''));
      const write = () => R.css.map(r => `${r.sel}{${r.list.map(([p, v], i) => `${p}:${hex(v)}${r.imp[i] ? ' !important' : ''}`).join(';')}}`).join('\n');
      for (let round = 0; round < 2; round++) {
        chk.textContent = write();
        R.css.forEach(r => { const ca = cssOf(r.a), cb = cssOf(r.b); r.list.forEach(([p, v], i) => { if (longhands(p, v).some(l => ca.getPropertyValue(l) !== cb.getPropertyValue(l))) r.imp[i] = true; }); });
      }
      // 폰트: kyonya.css 에 @font-face 가 없으면 같이
      const fams = new Set();
      const grab = t => (t.match(/font-family\s*:\s*([^;"}]+)/gi) || []).forEach(m => { const fam = norm(m.split(':')[1].split(',')[0]).replace(/&quot;|["']/g, ''); if (fam) fams.add(fam); });
      R.css.forEach(r => r.list.forEach(([p, v]) => { if (p === 'font-family') grab('font-family:' + v); }));
      R.text.forEach(x => grab(x.b.innerHTML)); R.added.forEach(x => grab(x.b.outerHTML));
      const faces = [...fams].map(fm => FontLib.get(fm)).filter(fo => fo && !hasFace(od, fo.family)).map(fo => fo.css);
      const css = (faces.length ? '/* 새로 쓴 폰트 */\n' + faces.join('\n') + '\n' : '') + (R.css.length ? write() : '');
      const srcHas = t => { const k = norm(t).replace(/\s/g, '').slice(0, 14); return !k || src.replace(/\s/g, '').includes(k) || src.replace(/\s/g, '').includes(esc(k)); };
      // 화면
      const sec = [];
      if (css) sec.push(`<div class="chg-sec"><div class="chg-h">🎨 꾸밈 <small>→ kyonya.css 맨 아래에 붙이기</small><button class="btn mini pink" data-cp="0">📋 복사</button></div>${ta(css)}</div>`);
      const blocks = [css];
      if (R.text.length) sec.push(`<div class="chg-sec"><div class="chg-h">✏️ 바뀐 글자 <small>→ preview.html 에서 찾아 바꾸기</small></div>` + R.text.map(x => {
        const before = norm(x.a.textContent).slice(0, 80), after = clean(x.b), i = blocks.push(after) - 1;
        const js = !srcHas(x.a.textContent);
        return `<div class="chg-it"><div class="chg-w">📍 ${esc(selFor(x.a))}${js ? ' <em>⚠ js가 채우는 글자 · kyonya-data.js 에서 고쳐요</em>' : ''}</div><div class="chg-b">전: ${esc(before) || '(비어 있음)'}</div><div class="chg-a">후 <button class="btn mini white" data-cp="${i}">📋</button></div>${ta(after)}</div>`;
      }).join('') + '</div>');
      if (R.added.length) sec.push(`<div class="chg-sec"><div class="chg-h">➕ 새로 넣은 것 <small>→ preview.html 그 자리에 붙이기</small></div>` + R.added.map(x => {
        const code = clean(x.b, true), i = blocks.push(code) - 1;
        const last = !x.b.nextElementSibling || ![...x.b.parentElement.children].slice([...x.b.parentElement.children].indexOf(x.b) + 1).some(n => !ign(n) && !R.added.some(y => y.b === n));
        const ps = x.prev && selFor(x.prev), pt = x.prev && norm(x.prev.textContent).slice(0, 16);
        const where = `<b>${esc(selFor(x.parent))}</b> 안 · ` + (last ? '맨 뒤' : !x.prev ? '맨 앞' : ps.length <= 40 ? `<b>${esc(ps)}</b> 바로 뒤` : pt ? `「${esc(pt)}…」 바로 뒤` : `<b>${esc(ps)}</b> 바로 뒤`);
        return `<div class="chg-it"><div class="chg-w">📍 ${where} <button class="btn mini white" data-cp="${i}">📋</button></div>${ta(code)}</div>`;
      }).join('') + '</div>');
      if (R.attrs.length) sec.push(`<div class="chg-sec"><div class="chg-h">🔧 바뀐 속성 <small>(그림 주소 · 링크 등)</small></div>` + R.attrs.map(x => `<div class="chg-it"><div class="chg-w">📍 ${esc(selFor(x.a))} · <b>${esc(x.name)}</b></div><div class="chg-b">전: ${esc(x.before ?? '(없음)')}</div><div class="chg-b">후: ${esc(x.after ?? '(지움)')}</div></div>`).join('') + '</div>');
      if (R.removed.length) sec.push(`<div class="chg-sec"><div class="chg-h">🗑 지운 것 <small>→ preview.html 에서 지우기</small></div>` + R.removed.map(x => `<div class="chg-it"><div class="chg-w">📍 ${esc(selFor(x))}</div><div class="chg-b">${esc(norm(x.textContent).slice(0, 60)) || esc('<' + x.tagName.toLowerCase() + '>')}</div></div>`).join('') + '</div>');
      f.remove();
      const html = sec.length ? `<p class="md-msg chg-top">원본 <b>${esc(ui.base ? decodeURIComponent(ui.base.split('/').pop()) : '처음 넣은 코드')}</b> 와 비교했어요 · 이미 파일에 옮긴 건 빼고 보여 줘요</p>` + sec.join('')
        : '<p class="md-msg">바뀐 게 없어요 ✨<br><small>이미 파일에 옮긴 것도 여기선 빠져요</small></p>';
      Modal.open({ title: '✨ 바뀐 것만', html, buttons: [{ label: '닫기 ♡', value: true, cls: 'pink', primary: true }] });
      const ov = [...document.querySelectorAll('.md-overlay')].pop(), box = ov.querySelector('.md-box');
      box.classList.add('wide', 'chg-box');
      box.querySelectorAll('[data-cp]').forEach(btn => btn.onclick = async () => {
        const v = blocks[+btn.dataset.cp];
        try { await navigator.clipboard.writeText(v); } catch (e) { const t = document.createElement('textarea'); t.value = v; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
        toast('📋 복사했어요');
      });
      box.querySelectorAll('.chg-code').forEach(t => t.onfocus = () => t.select());
    }
    $('bDiff').onclick = run;
    return { run };
  })();

  /* ---------------- 🎀 전체화면 + 리모컨 ---------------- */
  const FS = (() => {
    const rc = $('rc'), rcB = $('rcB'), dot = $('rcDot'), tools = document.querySelector('.lab-tools');
    const insPane = document.querySelector('.lab-ins [data-pane="ins"]');
    const homes = new Map();
    const park = el => { const m = document.createComment('fs'); el.before(m); homes.set(el, m); };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function place() {
      const p = ui.rcPos;
      if (!p) { rc.style.left = 'auto'; rc.style.right = '24px'; rc.style.top = '24px'; return; }
      rc.style.right = 'auto';
      rc.style.left = clamp(p.x, 0, innerWidth - 120) + 'px';
      rc.style.top = clamp(p.y, 0, innerHeight - 40) + 'px';
    }
    function state() {
      rc.classList.toggle('folded', !!ui.rcFold);
      rc.hidden = !!ui.rcMini; dot.hidden = !ui.rcMini;
    }
    function on() {
      if (homes.size) return;
      document.documentElement.classList.add('lab-fs');
      [document.querySelector('.lab-bar'), $('codeBox'), $('target'), tools].forEach(el => { park(el); rcB.append(el); });
      park(insPane); tools.append(insPane);
      park($('tbar')); document.body.append($('tbar'));
      place(); state(); showTab(ui.tab);
    }
    function off() {
      homes.forEach((m, el) => m.replaceWith(el)); homes.clear();
      document.documentElement.classList.remove('lab-fs');
      rc.hidden = true; dot.hidden = true; insPane.hidden = false;
      if (ui.tab === 'ins') showTab('box');
      setTimeout(fitFrame, 50);
    }
    function set(v) { ui.fs = v; saveUi(); v ? on() : off(); }
    $('bFs').onclick = () => set(true);
    $('rcExit').onclick = () => set(false);
    $('rcFold').onclick = () => { ui.rcFold = !ui.rcFold; saveUi(); state(); };
    $('rcMini').onclick = () => { ui.rcMini = true; saveUi(); state(); };
    dot.onclick = () => { ui.rcMini = false; saveUi(); state(); place(); };
    // 제목줄 잡고 끌기 (미리보기 위를 지나가도 안 끊기게)
    $('rcT').addEventListener('pointerdown', e => {
      if (e.target.closest('button') || e.button !== 0) return;
      const r = rc.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      document.documentElement.classList.add('rc-drag');
      const mv = ev => { ui.rcPos = { x: ev.clientX - dx, y: ev.clientY - dy }; place(); };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); document.documentElement.classList.remove('rc-drag'); saveUi(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); e.preventDefault();
    });
    $('rcT').addEventListener('dblclick', e => { if (!e.target.closest('button')) $('rcFold').click(); });
    addEventListener('resize', () => { if (ui.fs) place(); });
    return { init() { if (ui.tab === 'ins' && !ui.fs) ui.tab = 'box'; if (ui.fs) on(); } };
  })();

  /* ---------------- 시작 ---------------- */
  FS.init();
  showTab(ui.tab); showQk(ui.qk); showDeco(ui.dt || 'border'); ST.draw(); drawQkWhere(); applyW();
  // ☁️ 보관함과 맞춘 뒤, 처음 한 번 기본 테두리·스티커 넣기
  const LS = LabSync.create('lab.json', ['lab.imgs', 'lab.imgTags', 'lab.borders', 'lab.stickers', 'lab.stTags', 'lab.colorHist', 'lab.palettes', 'lab.workPal', 'lab.snips', 'lab.snaps'],
    { onPulled: () => { if (!sessionStorage.getItem('lab.pulled')) { sessionStorage.setItem('lab.pulled', '1'); location.reload(); } } });
  LS.sync($('syncSt')).finally(() => {
    if (store.get('lab.seed.v1') !== '1') { BD.seed(PRESET_BORDERS); ST.seed(PRESET_STICKERS); store.set('lab.seed.v1', '1'); }
  }); drawGMode(); drawSize(); Gal.draw(); BD.draw(); BD.prev(); saveSnaps();
  RepoImg.load('pattern').then(ok => ok && Gal.draw());
  RepoImg.load('stickers').then(ok => ok && ST.draw());
  render(cur); afterChange(); showBox();
  window.addEventListener('beforeunload', () => { clearTimeout(ct); commit(); });
})();
