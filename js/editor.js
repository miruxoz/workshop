/* =========================================================
   ✎ 작업대 ②③④ 단계 — 편집 · 미리보기 · 복사
   ---------------------------------------------------------
   · 서랍 글 하나를 골라서 완성 모습 위에서 바로 손봐요
   · 👆 보기 / ✏ 글 고치기 / 🖍 형광펜(3색, 드래그하면 바로) / 🧽 지우개 / 📸 발췌 펜 / 🔖 책갈피
   · 📝 메모 넣기(글에 보이는 노란 메모지) / 🖼 GIF 이모지 넣기
   · 고친 내용은 서랍 글에 자동 저장 (it.edited) → 복사·보관함에 그대로
   ========================================================= */
const Steps = (() => {
  const $ = id => document.getElementById(id);
  const COLORS = ['#fdf7fa', '#fff6fe', '#eaf3fb'];         // 형광펜 색 (예전 형광펜 변환기와 같아요)
  let step = 1, curId = store.get('wb.pick', ''), mode = 'read';
  let color = store.get('ed.color', COLORS[0]);

  const cur = () => (curId ? Drawer.get(curId) : null);
  const titleOf = it => Drawer.fullTitle(it) || '제목 없음';

  /* =========================================================
     단계 전환
     ========================================================= */
  function go(n, id) {
    if (id) { curId = id; store.set('wb.pick', id); }
    step = n;
    document.querySelectorAll('#steps .step').forEach(b => b.classList.toggle('on', +b.dataset.step === n));
    [1, 2, 3, 4].forEach(i => $('step' + i).hidden = i !== n);
    $('pickBar').hidden = n === 1;
    renderPick();
    if (n === 2) loadEditor();
    if (n === 3) renderPreview();
    if (n === 4) renderCopy();
    window.scrollTo({ top: $('steps').offsetTop - 8, behavior: 'smooth' });
  }
  $('steps').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) go(+b.dataset.step); });

  function renderPick() {
    const items = Drawer.all();
    if (curId && !items.some(x => x.id === curId)) curId = '';
    $('pickSel').innerHTML = '<option value="">— 서랍에서 고르기 —</option>' + items.map(it =>
      `<option value="${it.id}" ${it.id === curId ? 'selected' : ''}>${Drawer.TYPES[it.type].icon} ${esc(titleOf(it))}${it.edited ? ' ✏' : ''}${it.bookmark != null ? ' 🔖' : ''}${it.done ? ' (올림)' : ''}</option>`).join('');
  }
  $('pickSel').onchange = () => { curId = $('pickSel').value; store.set('wb.pick', curId); go(step); };
  window.addEventListener('drawer-changed', () => { if (step !== 1) renderPick(); });

  /* =========================================================
     ✎ 편집기
     ========================================================= */
  const body = $('edBody');
  let css = '';

  // 페이지에 로그 서식 넣기 (편집 화면에서도 완성 모습으로 보이게)
  const styleEl = document.createElement('style'); document.head.appendChild(styleEl);
  const HL_CSS = `
    .ed-body { --c--palepink: #fdf7fa; --c-gray: #555; }
    .ed-body .hl-comment { padding: 1px 3px; border-radius: 2px; cursor: pointer; position: relative; }
    .ed-body .hl-popup { position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); background: var(--c--palepink); border: 1px solid #cdcdcd; border-radius: 8px; padding: 6px 10px; font-size: 10px; color: var(--c-gray); box-shadow: 2px 2px 0 rgba(0,0,0,.1); display: none; z-index: 100; font-weight: normal; white-space: pre-wrap; word-break: keep-all; width: max-content; min-width: 120px; max-width: 300px; line-height: 1.5; }
    .ed-body .hl-comment:hover .hl-popup { display: block; }`;

  function loadEditor() {
    const it = cur();
    $('edEmpty').hidden = !!it; body.parentElement.hidden = !it; $('edTools').hidden = !it;
    $('edState').textContent = it ? `— ${titleOf(it)}${it.edited ? ' · 고친 적 있음' : ''}` : '';
    if (!it) { body.innerHTML = ''; return; }
    if (it.edited) { body.innerHTML = it.edited; css = it.editedCss != null ? it.editedCss : (window.LOG_CSS || ''); }
    else { const r = LogConverter.renderItem(it, Drawer.fullTitle(it)); body.innerHTML = r.body; css = r.css; }
    styleEl.textContent = css + HL_CSS;
    // 책갈피 표시
    body.querySelectorAll('.bm').forEach(x => x.classList.remove('bm'));
    const blocks = blockList();
    if (it.bookmark != null && blocks[it.bookmark]) blocks[it.bookmark].classList.add('bm');
    setMode(mode);
  }

  // 책갈피를 꽂을 수 있는 덩어리들 (본문 문단·상태창·사진·메모)
  const root = () => body.querySelector('.cl-log') || body;
  const blockList = () => [...root().children];
  const blockOf = node => { let n = node && (node.nodeType === 1 ? node : node.parentElement); while (n && n.parentElement !== root()) n = n.parentElement; return n && n.parentElement === root() ? n : null; };

  let saveTimer;
  function save(now) {
    clearTimeout(saveTimer);
    const doit = () => {
      const it = cur(); if (!it) return;
      root().removeAttribute('contenteditable');
      it.edited = body.innerHTML; it.editedCss = css;
      if (mode === 'type') root().setAttribute('contenteditable', 'true');
      Drawer.quietSave();
      $('edState').textContent = `— ${titleOf(it)} · 저장됨 ♡`;
    };
    if (now) doit(); else saveTimer = setTimeout(doit, 500);
  }

  /* ---------- 모드 ---------- */
  function setMode(m) {
    mode = m;
    document.querySelectorAll('#edTools .ed-mode').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    document.querySelectorAll('#edTools .ed-sub').forEach(s => s.hidden = s.dataset.for !== m);
    body.dataset.mode = m;
    if (root() !== body || body.firstElementChild) {
      if (m === 'type') root().setAttribute('contenteditable', 'true'); else root().removeAttribute('contenteditable');
    }
  }
  document.querySelectorAll('#edTools .ed-mode').forEach(b => b.onclick = () => setMode(b.dataset.mode));

  $('edColors').innerHTML = COLORS.map(c => `<button class="ed-color" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('');
  const paintColors = () => document.querySelectorAll('.ed-color').forEach(b => b.classList.toggle('on', b.dataset.c === color));
  $('edColors').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; color = b.dataset.c; store.set('ed.color', color); paintColors(); };
  paintColors();

  /* ---------- 선택 영역 감싸기 (형광펜·발췌) ---------- */
  const isHL = el => el && el.tagName === 'SPAN' && (el.classList.contains('hl-comment') || /background-color/i.test(el.getAttribute('style') || '')) && !el.classList.contains('xp');
  const unwrap = el => { el.querySelectorAll(':scope > .hl-popup').forEach(p => p.remove()); el.replaceWith(...el.childNodes); };

  function selRange() {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return null;
    const r = sel.getRangeAt(0);
    return body.contains(r.commonAncestorContainer) ? r : null;
  }
  function textNodes(range) {
    const rootNode = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
    const w = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode: n => range.intersectsNode(n) && n.nodeValue.trim() && !n.parentElement.closest('.hl-popup') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const out = []; while (w.nextNode()) out.push(w.currentNode); return out;
  }
  function wrap(range, make) {
    const nodes = textNodes(range);
    nodes.forEach(n => {
      let s = 0, e = n.nodeValue.length;
      if (n === range.startContainer) s = range.startOffset;
      if (n === range.endContainer) e = range.endOffset;
      if (s >= e) return;
      let t = n;
      if (e < t.nodeValue.length) t.splitText(e);
      if (s > 0) t = t.splitText(s);
      const w = make(); t.parentNode.insertBefore(w, t); w.appendChild(t);
    });
    window.getSelection().removeAllRanges();
    return nodes.length;
  }

  let xpSeq = Date.now();
  function paint() {
    const r = selRange(); if (!r) return false;
    const n = wrap(r, () => { const s = document.createElement('span'); s.setAttribute('style', `background-color: ${color};`); return s; });
    if (n) save();
    return n > 0;
  }
  function markXp() {
    const r = selRange(); if (!r) return false;
    const id = ++xpSeq;
    const n = wrap(r, () => { const s = document.createElement('span'); s.className = 'xp'; s.dataset.xp = id; return s; });
    if (n) save();
    return n > 0;
  }
  function erase() {
    const r = selRange(); if (!r) return false;
    const hits = [...body.querySelectorAll('span')].filter(s => (isHL(s) || s.classList.contains('xp')) && r.intersectsNode(s));
    hits.forEach(unwrap); window.getSelection().removeAllRanges();
    if (hits.length) save();
    return hits.length > 0;
  }

  // 드래그가 끝나면 바로 (폰은 손을 뗀 뒤 잠깐 기다렸다가)
  const afterSelect = () => {
    if (mode === 'pen') paint();
    else if (mode === 'xp') markXp();
    else if (mode === 'erase') erase();
  };
  body.addEventListener('mouseup', () => setTimeout(afterSelect, 0));
  body.addEventListener('touchend', () => setTimeout(afterSelect, 450));
  $('edApply').onclick = () => { if (!paint()) toast('칠할 곳을 먼저 드래그해 주세요'); };
  $('edApplyXp').onclick = () => { if (!markXp()) toast('발췌할 곳을 먼저 드래그해 주세요'); };
  // 버튼을 눌러도 선택이 풀리지 않게
  ['edApply', 'edApplyXp'].forEach(id => $(id).addEventListener('mousedown', e => e.preventDefault()));

  /* ---------- 누르기 (코멘트·지우개·책갈피) ---------- */
  body.addEventListener('click', async e => {
    if (mode === 'type') return;
    if (!window.getSelection().isCollapsed) return;
    const hl = e.target.closest('span');
    if (mode === 'erase') {
      const t = hl && (isHL(hl) ? hl : hl.closest('.xp') || (isHL(hl.parentElement) ? hl.parentElement : null));
      if (t) { unwrap(t); save(); }
      return;
    }
    if (mode === 'bm') {
      const b = blockOf(e.target); if (!b) return;
      const it = cur(); const idx = blockList().indexOf(b);
      blockList().forEach(x => x.classList.remove('bm'));
      if (it.bookmark === idx) it.bookmark = null; else { it.bookmark = idx; b.classList.add('bm'); }
      save(true); Drawer.persist();
      toast(it.bookmark == null ? '🔖 책갈피를 뺐어요' : '🔖 여기까지! 책갈피를 꽂았어요');
      return;
    }
    if (mode === 'pen') {
      const target = hl && (isHL(hl) ? hl : (hl.classList.contains('hl-popup') ? hl.parentElement : null));
      if (!target) return;
      const old = target.querySelector(':scope > .hl-popup');
      const r = await Modal.prompt('💬 형광펜 코멘트', [{ name: 'c', label: '누르면 뜨는 말풍선 (비우면 코멘트 없이 형광펜만)', type: 'textarea', rows: 3, value: old ? old.textContent : '' }]);
      if (!r) return;
      if (old) old.remove();
      const c = r.c.trim();
      if (c) {
        target.classList.add('hl-comment');
        const p = document.createElement('span'); p.className = 'hl-popup'; p.textContent = c; target.appendChild(p);
      } else target.classList.remove('hl-comment');
      if (!target.className) target.removeAttribute('class');
      save(); toast(c ? '💬 코멘트를 달았어요' : '💬 코멘트를 뺐어요');
    }
  });

  /* ---------- 글 고치기 ---------- */
  body.addEventListener('input', () => { if (mode === 'type') save(); });
  body.addEventListener('paste', e => {   // 붙여넣기는 글자만
    if (mode !== 'type') return;
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
  });
  body.addEventListener('keydown', e => { if (mode !== 'type' && !e.ctrlKey && !e.metaKey && e.key.length === 1) e.preventDefault(); });

  /* ---------- 📝 메모 · 🖼 이모지 · 🔖 이동 · ↺ ---------- */
  let lastCaretBlock = null;
  document.addEventListener('selectionchange', () => {
    const s = window.getSelection();
    if (s.rangeCount && body.contains(s.anchorNode)) lastCaretBlock = blockOf(s.anchorNode);
  });

  $('edMemo').onclick = async () => {
    if (!cur()) return;
    const r = await Modal.prompt('📝 메모 넣기', [{ name: 't', label: '글에 노란 메모지로 보여요', type: 'textarea', rows: 4 }],
      { msg: '<small>마지막으로 누른 곳 바로 아래에 들어가요 (없으면 맨 끝)</small>', ok: '넣기 ♡' });
    if (!r || !r.t.trim()) return;
    const m = document.createElement('div'); m.className = 'cl-memo';
    m.innerHTML = esc(r.t.trim()).replace(/\n/g, '<br>');
    const after = (lastCaretBlock && root().contains(lastCaretBlock)) ? lastCaretBlock : null;
    if (after) after.after(m); else root().appendChild(m);
    m.scrollIntoView({ behavior: 'smooth', block: 'center' });
    save(true); toast('📝 메모를 넣었어요 (지우려면 ✏ 글 고치기에서 지우면 돼요)');
  };

  $('edEmoji').addEventListener('mousedown', e => e.preventDefault());
  $('edEmoji').onclick = async () => {
    const s = window.getSelection();
    const range = s.rangeCount && body.contains(s.anchorNode) ? s.getRangeAt(0).cloneRange() : null;
    const url = await EmojiPicker.pick();
    if (!url) return;
    const img = document.createElement('img'); img.className = 'text-emoji'; img.src = url;
    if (range) { range.collapse(false); range.insertNode(img); } else (lastCaretBlock || root()).appendChild(img);
    save(true);
  };

  $('edGoBm').onclick = () => {
    const b = body.querySelector('.bm');
    if (!b) return toast('🔖 꽂힌 책갈피가 없어요');
    b.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  $('edReset').onclick = async () => {
    const it = cur(); if (!it || !it.edited) return toast('고친 내용이 없어요');
    if (!await Modal.confirm('고친 내용(형광펜·메모·오타 수정)을 전부 지우고<br>처음 변환한 모습으로 되돌릴까요?', { ok: '되돌릴래요' })) return;
    delete it.edited; delete it.editedCss; it.bookmark = null; Drawer.persist(); loadEditor(); toast('↺ 원래대로 되돌렸어요');
  };

  $('edMakeXp').onclick = () => { save(true); Excerpt.open(cur()); };

  /* =========================================================
     👀 ③ 미리보기
     ========================================================= */
  let pvW = +store.get('pv.w', '375');
  const PV_HEAD = `<meta charset="UTF-8"><style>
    @font-face { font-family: 'MonaTarget'; src: url('https://cdn.jsdelivr.net/gh/MonadABXY/mona-font@main/web/Mona12.woff2') format('woff2');
      unicode-range: U+3040-309F, U+30A0-30FF, U+4E00-9FFF, U+3000-303F, U+FF00-FFEF, U+1F300-1F9FF, U+2600-26FF, U+2700-27BF; }
    @font-face { font-family: "Mona12"; src: url("https://cdn.jsdelivr.net/gh/MonadABXY/mona-font@main/web/Mona12.woff2") format("woff2"); }
    :root { --c--palepink: #fdf7fa; --c-gray: #555; }
    html, body { margin: 0; } body { padding: 16px 18px 26px; background: #fff; color: #555; font-family: 'MonaTarget', 'Mona12', sans-serif; font-size: 13px; line-height: 1.8; word-break: keep-all; }
    img { max-width: 100%; }
    .hl-comment { padding: 1px 3px; border-radius: 2px; position: relative; } .hl-popup { display: none; }
  </style>`;
  function renderPreview() {
    const it = cur();
    $('pvEmpty').hidden = !!it; $('pvFrame').parentElement.hidden = !it;
    if (!it) return;
    const { html } = LogConverter.renderItem(it, Drawer.fullTitle(it));
    const f = $('pvFrame');
    f.style.maxWidth = pvW + 'px';
    f.onload = () => { const fit = () => { try { f.style.height = f.contentDocument.documentElement.scrollHeight + 'px'; } catch (e) {} }; fit(); f.contentDocument.querySelectorAll('img').forEach(i => i.addEventListener('load', fit)); setTimeout(fit, 600); };
    f.srcdoc = `<!DOCTYPE html><html><head>${PV_HEAD}</head><body>${html}</body></html>`;
    document.querySelectorAll('#step3 [data-w]').forEach(b => b.classList.toggle('on', +b.dataset.w === pvW));
  }
  document.querySelectorAll('#step3 [data-w]').forEach(b => b.onclick = () => { pvW = +b.dataset.w; store.set('pv.w', pvW); renderPreview(); });

  /* =========================================================
     📋 ④ 복사
     ========================================================= */
  function renderCopy() {
    const it = cur();
    $('cpEmpty').hidden = !!it; $('cpBox').hidden = !it;
    if (!it) return;
    const { html, stats } = LogConverter.renderItem(it, Drawer.fullTitle(it));
    $('cpCode').value = html;
    const tmp = document.createElement('div'); tmp.innerHTML = it.edited || '';
    const hl = tmp.querySelectorAll('span[style*="background-color"]').length, cm = tmp.querySelectorAll('.hl-comment').length, xp = new Set([...tmp.querySelectorAll('.xp')].map(x => x.dataset.xp)).size;
    $('cpStats').innerHTML = `<span>${Drawer.TYPES[it.type].icon} ${esc(titleOf(it))}</span><span>사진<b>${stats.images || 0}</b></span><span>형광펜<b>${hl}</b>· 코멘트<b>${cm}</b></span><span>발췌<b>${xp}</b></span>` +
      (it.done ? '<span>UP♡ 올림</span>' : '') + (it.vaultAt ? `<span>💾 ${fmt.date(it.vaultAt).slice(5)}</span>` : '');
    $('cpDone').textContent = it.done ? '↺ 안 올림으로' : '✓ 올렸어요';
  }
  $('cpCopy').onclick = async () => { const it = cur(); if (!it) return; toast(await copyText(LogConverter.renderItem(it, Drawer.fullTitle(it)).html) ? '📋 복사 완료! 티스토리 HTML 모드에 붙여넣으세요 ♪' : '⚠️ 복사 실패'); };
  $('cpDone').onclick = () => { const it = cur(); if (!it) return; it.done = !it.done; Drawer.persist(); renderCopy(); toast(it.done ? '✓ UP♡ 도장 꾹!' : '↺ 안 올림으로 바꿨어요'); };
  $('cpVault').onclick = async () => {
    const it = cur(); if (!it) return;
    $('cpVault').disabled = true; $('cpVault').textContent = '⏳ 저장 중…';
    try { if (await Drawer.saveToVault(it)) toast('💾 보관함에 저장했어요!'); } catch (e) { Modal.alert('⚠️ ' + esc(e.message)); }
    $('cpVault').disabled = false; $('cpVault').textContent = '💾 보관함에 저장'; renderCopy();
  };
  $('cpXp').onclick = () => Excerpt.open(cur());

  // 위젯의 📸 발췌 바로가기 (index.html#excerpt)
  if (location.hash === '#excerpt') setTimeout(() => { go(2); setMode('xp'); }, 50);
  if (location.hash === '#bookmark') setTimeout(() => { go(2); setTimeout(() => $('edGoBm').click(), 200); }, 50);

  return { go, current: cur, setMode };
})();

/* =========================================================
   🖼 GIF 이모지 고르기 창 (편집기에서 사용)
   ========================================================= */
const EmojiPicker = {
  async pick() {
    let list = Emoji.cached();
    if (!list.length && Repo.info()) { try { list = await Emoji.refresh(); } catch (e) {} }
    if (!list.length) { Modal.alert('🖼 등록된 GIF 이모지가 없어요<br><small>저장소의 emoji/ 폴더에 txt 파일을 넣어 주세요 (🖼 이모지 페이지 참고)</small>'); return null; }
    const groups = [...new Set(list.map(x => x.group))];
    return new Promise(resolve => {
      Modal.open({
        title: '🖼 GIF 이모지 고르기',
        html: `<input class="tx" id="epQ" placeholder="이름으로 찾기">` +
          groups.map(g => `<div class="ep-g"><small>${esc(g)}</small><div class="ep-grid">` +
            list.filter(x => x.group === g).map(x => `<button class="ep-it" data-url="${esc(x.url)}" title="${esc(x.name)}"><img src="${esc(x.url)}" alt="" loading="lazy"></button>`).join('') + '</div></div>').join(''),
        buttons: [{ label: '닫기', value: null, cls: 'white' }]
      }).then(() => resolve(picked));
      let picked = null;
      const box = document.querySelector('.md-overlay:last-child');
      box.querySelector('.md-box').classList.add('wide');
      box.addEventListener('click', e => {
        const b = e.target.closest('.ep-it'); if (!b) return;
        picked = b.dataset.url; box.querySelector('.md-f .btn').click();
      });
      box.querySelector('#epQ').addEventListener('input', e => {
        const q = e.target.value.trim();
        box.querySelectorAll('.ep-it').forEach(b => b.hidden = q && !b.title.includes(q));
      });
    });
  }
};
