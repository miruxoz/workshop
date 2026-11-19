/* =========================================================
   🗄 서랍 — 글을 에피소드(글 하나) 단위로 나눠 담아두는 곳
   ---------------------------------------------------------
   · 서랍 3칸: 📖 본편 / 📓 관찰일지 / 💬 OOC
   · ✂ 여기까지!  : 붙여넣기 칸의 처음 ~ 커서가 있는 줄 끝까지를 본편 서랍에 담기
   · 📦 전부 담기  : 남은 글 전체를 본편 서랍에 담기
   · 로그를 붙여넣으면 관찰일지·OOC는 자동으로 각자 서랍에 들어가요 (workbench.js)
   · 같은 채팅방·같은 서랍·같은 제목이면 ①②③ 번호가 자동으로 붙어요
   · 서랍에는 '변환 전 글'을 보관하고, 복사할 때 변환해요
   · 이 브라우저(localStorage 'wb.drawer')에 저장 / 💾 누르면 깃허브 보관함에 저장
   ========================================================= */
const Drawer = (() => {
  const $ = id => document.getElementById(id);
  const KEY = 'wb.drawer';
  const TYPES = {
    main:    { icon: '📖', name: '본편' },
    journal: { icon: '📓', name: '관찰일지' },
    ooc:     { icon: '💬', name: 'OOC' }
  };
  const input = $('input'), title = $('title');

  let items = store.json(KEY, []);
  items.forEach(it => { it.type = it.type || 'main'; it.cat = it.cat || Meta.defaultCat(); });
  let tab = store.get('wb.drawerTab', 'main');

  const save = () => store.setJson(KEY, items);
  const CIRCLE = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  const circ = n => CIRCLE[n - 1] || `(${n})`;
  const sameGroup = (a, b) => a.cat === b.cat && a.type === b.type && a.base.trim() === b.base.trim();
  const nextNo = it => items.filter(x => x !== it && sameGroup(x, it)).reduce((m, x) => Math.max(m, x.no), 0) + 1;

  // 화면에 보일 제목: 같은 묶음이 2개 이상이면 번호 붙이기
  const fullTitle = it => {
    const base = it.base.trim();
    if (!base) return '';
    return items.filter(x => sameGroup(x, it)).length > 1 ? `${base} ${circ(it.no)}` : base;
  };

  // 글 요약: 상태창 수, 사진 수, 글자 수, 처음·끝 문장
  const summary = text => {
    const noFence = text.replace(/```[\s\S]*?```/g, '');
    const lines = noFence.split('\n').map(l => l.trim())
      .filter(l => l && !l.startsWith('![') && !/^\[.*\|.*\]$/.test(l) && !/^[─━]+$/.test(l));
    const clean = l => l.replace(/[*`=~]/g, '');
    return {
      status: (text.match(/^\s*\[[^\]]*\|[^\]]*\|[^\]]*\]\s*$/gm) || []).length,
      images: (text.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length,
      chars: text.replace(/\s/g, '').length,
      first: clean(lines[0] || ''),
      last: clean(lines[lines.length - 1] || '')
    };
  };

  // 담은 시각 (예전 글은 id 안의 시각으로)
  const addedAt = it => it.addedAt || parseInt(String(it.id).slice(0, -4), 36) || Date.now();

  /* ---------- 담기 ---------- */
  // obj: { text, base, type, cat, request, storyDate }
  function add(obj) {
    const it = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      base: (obj.base || '').trim(), no: 1, text: obj.text, type: obj.type || 'main',
      cat: obj.cat || Workbench.currentCat(), request: obj.request || '',
      storyDate: obj.storyDate || (obj.type === 'main' || !obj.type ? Classifier.headerDate(obj.text) : ''),
      done: false, bookmark: null, vaultAt: 0, addedAt: Date.now()
    };
    it.no = nextNo(it);
    items.push(it);
    return it.id;
  }
  function addMany(list) { const ids = list.map(add); save(); render(); return ids; }
  function removeIds(ids) { items = items.filter(x => !ids.includes(x.id)); save(); render(); }

  function setInput(value) {
    input.value = value;
    input.dispatchEvent(new Event('wb-changed'));
    Workbench.refresh();
  }

  $('cutBtn').onclick = () => {
    const v = input.value;
    if (!v.trim()) return toast('붙여넣은 로그가 없어요 (｡•́︿•̀｡)');
    let pos = input.selectionEnd;                      // 커서가 있는 줄의 끝까지 (문장 중간이 잘리지 않게)
    const nl = v.indexOf('\n', pos);
    pos = nl === -1 ? v.length : nl;
    const part = v.slice(0, pos).trim();
    if (!part) return toast('✂ 나누고 싶은 곳에 커서를 두고 눌러 주세요');
    add({ text: part, base: title.value, type: 'main' }); save(); showTab('main');
    setInput(v.slice(pos).replace(/^\s+/, ''));
    input.focus(); input.setSelectionRange(0, 0); input.scrollTop = 0;
    toast('🗄 본편 서랍에 담았어요!');
  };

  $('cutAllBtn').onclick = () => {
    if (!input.value.trim()) return toast('남은 로그가 없어요 (｡•́︿•̀｡)');
    add({ text: input.value.trim(), base: title.value, type: 'main' }); save(); showTab('main');
    setInput('');
    toast('📦 전부 본편 서랍에 담았어요!');
  };

  /* ---------- 서랍 그리기 ---------- */
  function showTab(t) { tab = t; store.set('wb.drawerTab', t); render(); }

  function render() {
    // 탭
    $('drawerTabs').innerHTML = Object.entries(TYPES).map(([k, t]) => {
      const n = items.filter(x => x.type === k).length;
      const left = items.filter(x => x.type === k && !x.done).length;
      return `<button class="dtab ${k === tab ? 'on' : ''}" data-tab="${k}">${t.icon} ${t.name} <b>${n}</b>${left && left !== n ? `<small>(안 올림 ${left})</small>` : ''}</button>`;
    }).join('');

    const list = items.filter(x => x.type === tab);
    $('drawerEmpty').hidden = list.length > 0;
    $('drawerEmpty').innerHTML = tab === 'main'
      ? '본편 서랍이 비어 있어요 ♪<br><small>위에서 ✂ 여기까지! 를 누르면 커서까지의 글이 여기에 담겨요</small>'
      : `${TYPES[tab].name} 서랍이 비어 있어요 ♪<br><small>로그를 붙여넣으면 ${TYPES[tab].name}은(는) 자동으로 여기에 담겨요</small>`;

    $('drawer').innerHTML = list.map((it, i) => {
      const s = summary(it.text);
      const ft = fullTitle(it);
      return `
      <li class="dw ${it.done ? 'done' : ''}" data-id="${it.id}">
        <div class="dw-no">${String(i + 1).padStart(2, '0')}</div>
        <div class="dw-main">
          <div class="dw-top">
            <button class="dw-cat" data-act="cat" title="채팅방 바꾸기">🏷 ${esc(Meta.catName(it.cat))}</button>
            <input class="dw-title" value="${esc(it.base)}" placeholder="(제목 없음)" title="제목 고치기">
            <span class="dw-num">${ft && ft !== it.base.trim() ? circ(it.no) : ''}</span>
            ${it.done ? '<span class="dw-stamp">UP♡</span>' : ''}
            ${it.vaultAt ? `<span class="dw-saved" title="보관함 저장: ${fmt.date(it.vaultAt)}">💾</span>` : ''}
            ${it.bookmark != null ? '<span class="dw-saved" title="책갈피">🔖</span>' : ''}
            ${it.edited ? '<span class="dw-saved" title="편집함">✏</span>' : ''}
          </div>
          <div class="dw-meta"><span class="dw-added" title="서랍에 담은 시각">🕰 ${fmt.dateTime(addedAt(it))} 담음</span> · ${it.storyDate ? `📅 ${esc(it.storyDate)} · ` : ''}${it.type === 'main' ? `상태창 <b>${s.status}</b> · ` : ''}사진 <b>${s.images}</b> · <b>${s.chars.toLocaleString()}</b>자</div>
          ${it.request ? `<div class="dw-req"><span>내 요청</span>${esc(it.request.replace(/\s+/g, ' ').slice(0, 80))}${it.request.length > 80 ? '…' : ''}</div>` : ''}
          <div class="dw-peek"><span>처음</span>${esc(s.first.slice(0, 46))}${s.first.length > 46 ? '…' : ''}</div>
          <div class="dw-peek"><span>끝</span>${esc(s.last.slice(-46))}</div>
        </div>
        <div class="dw-btns">
          <button class="btn mini pink" data-act="edit">✎ 편집</button>
          <button class="btn mini" data-act="copy">📋 복사</button>
          <button class="btn mini white" data-act="view">👀 보기</button>
          <button class="btn mini white" data-act="vault">💾 보관함</button>
          <button class="btn mini white" data-act="done">${it.done ? '↺ 안 올림' : '✓ 올렸어요'}</button>
          ${it.type === 'main'
            ? '<button class="btn mini white" data-act="back" title="붙여넣기 칸 맨 위로">↩ 되돌리기</button>'
            : '<button class="btn mini white" data-act="move" title="다른 서랍으로">🔀 옮기기</button>'}
          <button class="btn mini white" data-act="del">🗑 지우기</button>
        </div>
      </li>`;
    }).join('');
    window.dispatchEvent(new Event('drawer-changed'));
  }

  $('drawerTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });

  /* ---------- 글 하나 → 보관함용 정보 ---------- */
  const toPost = it => ({
    id: it.id, title: fullTitle(it), cat: it.cat, type: it.type, text: it.text, request: it.request,
    edited: it.edited || '', editedCss: it.editedCss, bookmark: it.bookmark,
    storyDate: it.storyDate, savedAt: Date.now(), stats: (({ status, images, chars }) => ({ status, images, chars }))(summary(it.text))
  });

  /* ---------- 서랍 안 버튼들 ---------- */
  $('drawer').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const it = items.find(x => x.id === btn.closest('.dw').dataset.id);
    if (!it) return;
    const name = `「${fullTitle(it) || '제목 없음'}」`;

    switch (btn.dataset.act) {
      case 'copy': {
        const { html } = LogConverter.renderItem(it, fullTitle(it));
        toast(await copyText(html) ? `📋 ${name} 복사 완료!` : '⚠️ 복사가 안 됐어요');
        break;
      }
      case 'view':
        if (it.edited) Steps.go(3, it.id);
        else Workbench.show(it.text, fullTitle(it), `${TYPES[it.type].icon} ${fullTitle(it) || '제목 없음'}`);
        break;
      case 'edit':
        Steps.go(2, it.id);
        break;
      case 'done':
        it.done = !it.done; save(); render();
        break;
      case 'cat': {
        const pick = await Modal.choose('🏷 채팅방 고르기', Meta.cats().map(c => ({ value: c.id, label: c.name })), it.cat);
        if (!pick || pick === it.cat) return;
        if (!await Modal.confirm(`${name}의 카테고리를<br><b>${esc(Meta.catName(it.cat))}</b> → <b>${esc(Meta.catName(pick))}</b><br>(으)로 변경하시겠어요?`)) return;
        it.cat = pick; it.no = nextNo(it); save(); render();
        toast('🏷 카테고리를 바꿨어요');
        break;
      }
      case 'move': {
        const pick = await Modal.choose('🔀 어느 서랍으로 옮길까요?', Object.entries(TYPES).map(([k, t]) => ({ value: k, label: `${t.icon} ${t.name}` })), it.type);
        if (!pick || pick === it.type) return;
        it.type = pick; it.no = nextNo(it); save(); render();
        toast(`🔀 ${TYPES[pick].name} 서랍으로 옮겼어요`);
        break;
      }
      case 'back':
        if (!await Modal.confirm(`${name}을(를)<br>붙여넣기 칸 맨 위로 되돌릴까요?`)) return;
        setInput(it.text + (input.value.trim() ? '\n\n' + input.value : ''));
        items = items.filter(x => x !== it); save(); render();
        toast('↩ 붙여넣기 칸으로 되돌렸어요');
        break;
      case 'del':
        if (!await Modal.confirm(`${name}을(를) 서랍에서 지울까요?` + (it.vaultAt ? '<br><small>(보관함에 저장된 건 그대로 남아요)</small>' : ''), { ok: '지울래요' })) return;
        items = items.filter(x => x !== it); save(); render();
        break;
      case 'vault': {
        btn.disabled = true; btn.textContent = '⏳ 저장 중…';
        try { if (await saveToVault(it)) toast(`💾 ${name} 보관함에 저장했어요!`); }
        catch (err) { Modal.alert('⚠️ 보관함 저장 실패<br><small>' + esc(err.message) + '</small>'); render(); }
        break;
      }
    }
  });

  // 제목 고치기
  $('drawer').addEventListener('change', e => {
    if (!e.target.classList.contains('dw-title')) return;
    const it = items.find(x => x.id === e.target.closest('.dw').dataset.id);
    if (!it) return;
    const base = e.target.value.trim();
    if (base !== it.base) { it.base = base; it.no = nextNo(it); save(); render(); }
  });

  // 올린 글 정리
  $('drawerClear').onclick = async () => {
    const n = items.filter(x => x.done).length;
    if (!n) return toast('✓ 올렸어요 표시한 글이 없어요');
    if (!await Modal.confirm(`올린 글 ${n}개를 서랍에서 지울까요?`, { ok: '정리할래요' })) return;
    items = items.filter(x => !x.done); save(); render();
  };

  window.addEventListener('meta-changed', render);
  render();

  // 다른 곳(편집기·복사 단계)에서 쓰는 도구
  async function saveToVault(it) {
    if (!Vault.configured()) {
      if (await Modal.confirm('깃허브 보관함이 아직 연결되지 않았어요.<br>보관함 페이지에서 연결할까요?', { ok: '연결하러 가기' })) location.href = 'vault.html';
      return false;
    }
    await Vault.savePost(toPost(it));
    it.vaultAt = Date.now(); save(); render();
    return true;
  }

  return {
    addMany, removeIds, showTab, fullTitle, saveToVault,
    all: () => items,
    get: id => items.find(x => x.id === id),
    persist() { save(); render(); },
    quietSave() { save(); },
    moveCat(from, to) { items.forEach(x => { if (x.cat === from) { x.cat = to; } }); items.forEach(x => x.no = x.no || 1); save(); render(); },
    bookmarked: () => items.filter(x => x.bookmark != null),
    TYPES
  };
})();
