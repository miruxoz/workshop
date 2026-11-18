/* =========================================================
   🗂 보관함 페이지
   · 채팅방 카테고리 → 📖 본편 / 📓 관찰일지 / 💬 OOC
   · 저장한 날짜순(최신 먼저), 날짜별로 묶어서, 한 페이지 10개
   · 👀 보기(글 하나만 보는 페이지) · 📋 복사 · 🗄 서랍으로 · 🗑 삭제
   ========================================================= */
(function () {
  const $ = id => document.getElementById(id);
  const PER_PAGE = 10;
  const TYPES = { all: { icon: '✧', name: '전체' }, main: { icon: '📖', name: '본편' }, journal: { icon: '📓', name: '관찰일지' }, ooc: { icon: '💬', name: 'OOC' } };

  let state = { cat: store.get('vt.cat', 'all'), type: store.get('vt.type', 'all'), page: 1 };
  let posts = [];

  /* =========================================================
     ⚙ 연결 설정
     ========================================================= */
  function renderSettings() {
    const c = Vault.cfg() || {};
    $('cfgOwner').value = c.owner || '';
    $('cfgRepo').value = c.repo || '';
    $('cfgToken').value = c.token ? '••••••••••••' : '';
    const on = Vault.configured();
    $('setMsg').innerHTML = on ? `💚 <b>${esc(c.owner)}/${esc(c.repo)}</b> 에 연결돼 있어요` : '아직 연결되지 않았어요';
    $('setMsg').classList.toggle('bad', !on);
    $('setBody').hidden = on;
    $('setToggle').textContent = on ? '펼치기' : '접기';
  }
  $('setToggle').onclick = () => { $('setBody').hidden = !$('setBody').hidden; $('setToggle').textContent = $('setBody').hidden ? '펼치기' : '접기'; };

  $('cfgSave').onclick = async () => {
    const old = Vault.cfg() || {};
    const tokenIn = $('cfgToken').value.trim();
    const c = {
      owner: $('cfgOwner').value.trim(), repo: $('cfgRepo').value.trim(),
      token: tokenIn && !/^•+$/.test(tokenIn) ? tokenIn : old.token
    };
    if (!c.owner || !c.repo || !c.token) return Modal.alert('아이디, 저장소 이름, 토큰을 모두 적어 주세요');
    $('cfgSave').disabled = true; $('cfgSave').textContent = '⏳ 확인 중…';
    try {
      const r = await Vault.test(c);
      $('setMsg').innerHTML = r.msg; $('setMsg').classList.toggle('bad', !r.ok);
      if (r.ok) {
        Vault.setCfg(c);
        toast('🔗 보관함 연결 완료!');
        renderSettings();
        await Meta.sync();
        load();
      }
    } catch (e) {
      $('setMsg').textContent = '⚠️ ' + e.message; $('setMsg').classList.add('bad');
    }
    $('cfgSave').disabled = false; $('cfgSave').textContent = '🔗 연결 확인하고 저장';
  };

  $('cfgClear').onclick = async () => {
    if (!await Modal.confirm('이 브라우저에서 보관함 연결을 끊을까요?<br><small>깃허브에 저장된 글은 그대로 남아요</small>', { ok: '끊을래요' })) return;
    Vault.clearCfg(); renderSettings(); posts = []; render();
  };

  /* =========================================================
     📇 목록
     ========================================================= */
  async function load() {
    if (!Vault.configured()) { posts = []; render(); return; }
    $('listEmpty').hidden = false; $('listEmpty').textContent = '불러오는 중… ☕';
    try { posts = (await Vault.loadIndex()).posts || []; }
    catch (e) { posts = Vault.cachedIndex().posts || []; toast('⚠️ ' + e.message); }
    render();
  }
  $('reload').onclick = load;

  function render() {
    const cats = Meta.cats();
    const inCat = p => state.cat === 'all' || p.cat === state.cat;
    if (state.cat !== 'all' && !cats.some(c => c.id === state.cat)) state.cat = 'all';

    $('total').textContent = Vault.configured() ? `(${posts.length}개)` : '';
    $('cats').innerHTML = [{ id: 'all', name: '전체' }, ...cats].map(c =>
      `<button class="vt-cat ${c.id === state.cat ? 'on' : ''}" data-cat="${c.id}">${c.id === Meta.defaultCat() ? '★ ' : ''}${esc(c.name)}<b>${posts.filter(p => c.id === 'all' || p.cat === c.id).length}</b></button>`
    ).join('');
    $('types').innerHTML = Object.entries(TYPES).map(([k, t]) =>
      `<button class="dtab ${k === state.type ? 'on' : ''}" data-type="${k}">${t.icon} ${t.name} <b>${posts.filter(p => inCat(p) && (k === 'all' || p.type === k)).length}</b></button>`
    ).join('');

    const list = posts
      .filter(p => inCat(p) && (state.type === 'all' || p.type === state.type))
      .sort((a, b) => b.savedAt - a.savedAt);
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    state.page = Math.min(Math.max(1, state.page), pages);
    const shown = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

    if (!Vault.configured()) { $('listEmpty').hidden = false; $('listEmpty').innerHTML = '보관함이 아직 연결되지 않았어요 ♪<br><small>아래 ⚙ 연결 설정에서 비공개 저장소를 연결해 주세요</small>'; }
    else if (!list.length) { $('listEmpty').hidden = false; $('listEmpty').innerHTML = '여기엔 아직 저장한 글이 없어요 (｡•ᴗ•｡)<br><small>작업대 서랍에서 💾 보관함 을 누르면 저장돼요</small>'; }
    else $('listEmpty').hidden = true;

    // 저장한 날짜별로 묶기
    let html = '', day = '';
    shown.forEach(p => {
      const d = fmt.jpDate(p.savedAt);
      if (d !== day) { if (day) html += '</ol>'; html += `<div class="vt-day">${d}</div><ol class="vt-list">`; day = d; }
      const t = TYPES[p.type] || TYPES.main;
      const s = p.stats || {};
      html += `
        <li class="vt-item" data-id="${p.id}">
          <span class="vt-ic">${t.icon}</span>
          <div class="vt-main">
            <div class="vt-title">${esc(p.title || '제목 없음')}</div>
            <div class="vt-meta">🏷 ${esc(Meta.catName(p.cat))}${p.storyDate ? ` · 📅 ${esc(p.storyDate)}` : ''}${s.chars ? ` · ${s.chars.toLocaleString()}자` : ''}${s.images ? ` · 사진 ${s.images}` : ''}</div>
          </div>
          <div class="vt-btns">
            <button class="btn mini" data-act="view">👀 보기</button>
            <button class="btn mini white" data-act="copy">📋 복사</button>
            <button class="btn mini white" data-act="drawer">🗄 서랍으로</button>
            <button class="btn mini white" data-act="del">🗑</button>
          </div>
        </li>`;
    });
    if (day) html += '</ol>';
    $('list').innerHTML = html;

    // 페이지 번호
    $('pager').innerHTML = list.length <= PER_PAGE ? '' :
      `<button data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>◀</button>` +
      Array.from({ length: pages }, (_, i) => i + 1)
        .filter(n => n === 1 || n === pages || Math.abs(n - state.page) <= 2)
        .map((n, i, arr) => (i && n - arr[i - 1] > 1 ? '<button disabled>…</button>' : '') + `<button data-page="${n}" class="${n === state.page ? 'on' : ''}">${n}</button>`)
        .join('') +
      `<button data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}>▶</button>`;
  }

  $('cats').onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; state.cat = b.dataset.cat; state.page = 1; store.set('vt.cat', state.cat); render(); };
  $('types').onclick = e => { const b = e.target.closest('[data-type]'); if (!b) return; state.type = b.dataset.type; state.page = 1; store.set('vt.type', state.type); render(); };
  $('pager').onclick = e => { const b = e.target.closest('[data-page]'); if (!b || b.disabled) return; state.page = +b.dataset.page; render(); $('listWin').scrollIntoView({ behavior: 'smooth' }); };

  $('list').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('.vt-item').dataset.id;
    const entry = posts.find(p => p.id === id);
    const name = `「${esc(entry.title || '제목 없음')}」`;
    try {
      switch (btn.dataset.act) {
        case 'view': location.href = 'view.html?id=' + encodeURIComponent(id); break;
        case 'copy': {
          btn.textContent = '⏳';
          const post = await Vault.getPost(id);
          const { html } = LogConverter.renderItem(post, post.title);
          toast(await copyText(html) ? `📋 ${entry.title || '제목 없음'} 복사 완료!` : '⚠️ 복사 실패');
          btn.textContent = '📋 복사';
          break;
        }
        case 'drawer': {
          const post = await Vault.getPost(id);
          if (Vault.toDrawer(post)) toast('🗄 서랍으로 꺼냈어요! 작업대에서 볼 수 있어요');
          else Modal.alert(`${name}은(는) 이미 서랍에 있어요`);
          break;
        }
        case 'del':
          if (!await Modal.confirm(`${name}을(를) 보관함에서 <b>완전히</b> 지울까요?<br><small>깃허브에서도 지워져요</small>`, { ok: '지울래요' })) return;
          btn.textContent = '⏳';
          await Vault.deletePost(id);
          posts = Vault.cachedIndex().posts; render();
          toast('🗑 지웠어요');
          break;
      }
    } catch (err) { Modal.alert('⚠️ ' + esc(err.message)); render(); }
  });

  window.addEventListener('meta-changed', render);
  renderSettings();
  load();
})();
