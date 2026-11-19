/* =========================================================
   ⌨ 명령어 모음
   · 기본 명령어(data/default-commands.js) + 내 명령어(Meta → 보관함과 동기화)
   · 명령어 안의 {{STOP}} 은 복사할 때 고른 채팅방의 STOP 문장으로 바뀌어요
   · ⤓ 내보내기 / ⤒ 가져오기 (JSON 파일)
   ========================================================= */
(function () {
  const $ = id => document.getElementById(id);
  const defaults = window.DEFAULT_COMMANDS || [];
  let cat = store.get('cmd.cat', '') || Meta.defaultCat();
  const PER_PAGE = 10;
  let page = 1;

  /* ---------- 📌 STOP ---------- */
  function renderStop() {
    if (!Meta.cats().some(c => c.id === cat)) cat = Meta.defaultCat();
    $('stopCat').innerHTML = Meta.cats().map(c => `<option value="${c.id}" ${c.id === cat ? 'selected' : ''}>${c.id === Meta.defaultCat() ? '★ ' : ''}${esc(c.name)}</option>`).join('');
    const s = Meta.stop(cat);
    if (document.activeElement !== $('stopText')) $('stopText').value = s ? s.text : '';
    $('stopDate').textContent = s ? `마지막 저장 ${fmt.date(s.date)} (${fmt.ago(s.date)})` : '';
  }
  $('stopCat').onchange = () => { cat = $('stopCat').value; store.set('cmd.cat', cat); renderStop(); render(); };
  $('stopSave').onclick = () => {
    const t = $('stopText').value.trim();
    if (!t) return toast('STOP 문장을 붙여넣어 주세요');
    Meta.setStop(cat, t); toast('📌 STOP 문장을 저장했어요!');
  };
  $('stopClear').onclick = async () => {
    if (!await Modal.confirm('STOP 문장을 비울까요?<br><small>비우면 다음 백업 때 처음부터 전부 불러와요</small>', { ok: '비울래요' })) return;
    Meta.setStop(cat, ''); $('stopText').value = ''; toast('STOP 문장을 비웠어요');
  };

  /* ---------- 목록 ---------- */
  const mine = () => Meta.commands();
  const uid = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const withStop = code => {
    const s = Meta.stop(cat);
    return code.replace(/{{STOP}}/g, s && s.text ? JSON.stringify(s.text).slice(1, -1) : '');
  };

  function card(c, isDefault) {
    const hasStop = /{{STOP}}/.test(c.code);
    const s = Meta.stop(cat);
    return `
      <div class="cmd" data-id="${esc(c.id)}" data-def="${isDefault ? 1 : 0}">
        <div class="cmd-t">
          <button class="cmd-fav ${Meta.favCmds().includes(c.id) ? 'on' : ''}" data-act="fav" title="즐겨찾기 (맨 위에 고정)">${Meta.favCmds().includes(c.id) ? '★' : '☆'}</button>
          <b>${esc(c.title || '이름 없음')}</b>
          <span class="cmd-badge ${isDefault ? '' : 'my'}">${isDefault ? '기본' : '내 것'}</span>
          ${(c.tags || []).map(t => `<span class="cmd-badge">#${esc(t)}</span>`).join('')}
        </div>
        ${c.desc ? `<div class="cmd-d">${esc(c.desc)}</div>` : ''}
        <div class="cmd-b">
          ${hasStop ? `<div class="cmd-stop">📌 STOP: <b>${s && s.text ? esc(s.text) : '(비어 있음 → 처음부터 전부)'}</b> <small>— 「${esc(Meta.catName(cat))}」</small></div>` : ''}
          <pre class="cmd-code folded" title="눌러서 펼치기">${esc(c.code)}</pre>
          <div class="row">
            <button class="btn pink" data-act="copy">📋 복사${hasStop ? ' (STOP 넣어서)' : ''}</button>
            ${isDefault
              ? '<button class="btn white" data-act="dup" style="flex:none">⧉ 복제해서 고치기</button>'
              : '<button class="btn white" data-act="edit" style="flex:none">✎ 수정</button><button class="btn white" data-act="del" style="flex:none">🗑</button>'}
          </div>
        </div>
      </div>`;
  }

  function render() {
    const q = $('q').value.trim().toLowerCase();
    const hit = c => !q || [c.title, c.desc, ...(c.tags || [])].join(' ').toLowerCase().includes(q);
    const fav = Meta.favCmds();
    let all = defaults.map(c => ({ c, def: true })).concat(mine().map(c => ({ c, def: false }))).filter(x => hit(x.c));
    // ★ 즐겨찾기는 맨 위에 (즐겨찾기한 순서대로)
    all = all.filter(x => fav.includes(x.c.id)).sort((a, b) => fav.indexOf(a.c.id) - fav.indexOf(b.c.id))
      .concat(all.filter(x => !fav.includes(x.c.id)));
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    if (page > pages) page = pages;
    const html = all.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(x => card(x.c, x.def)).join('');
    $('list').innerHTML = html || '<div class="empty">찾는 명령어가 없어요 (｡•́︿•̀｡)</div>';
    $('pager').innerHTML = pagerHtml(page, pages);
  }
  $('q').oninput = () => { page = 1; render(); };
  $('pager').onclick = e => {
    const b = e.target.closest('[data-page]'); if (!b || b.disabled) return;
    page = +b.dataset.page; render(); $('q').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  async function editDialog(c, title) {
    const r = await Modal.prompt(title, [
      { name: 'title', label: '이름', value: c.title || '' },
      { name: 'tags', label: '태그 (쉼표로 구분)', value: (c.tags || []).join(', ') },
      { name: 'desc', label: '설명', type: 'textarea', rows: 2, value: c.desc || '' },
      { name: 'code', label: '명령어 ( {{STOP}} 을 넣으면 복사할 때 STOP 문장으로 바뀌어요 )', type: 'textarea', rows: 10, value: c.code || '' }
    ]);
    if (!r || !r.code.trim()) return null;
    return { id: c.id || uid(), title: r.title.trim() || '이름 없음', tags: r.tags.split(',').map(t => t.trim()).filter(Boolean), desc: r.desc.trim(), code: r.code };
  }

  $('addBtn').onclick = async () => {
    const c = await editDialog({}, '＋ 내 명령어 추가');
    if (!c) return;
    Meta.setCommands(mine().concat(c)); toast('＋ 명령어를 추가했어요');
  };

  $('list').addEventListener('click', async e => {
    const pre = e.target.closest('.cmd-code');
    if (pre) { pre.classList.toggle('folded'); return; }
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const box = btn.closest('.cmd');
    const isDef = box.dataset.def === '1';
    const c = (isDef ? defaults : mine()).find(x => x.id === box.dataset.id);
    if (!c) return;
    switch (btn.dataset.act) {
      case 'fav':
        Meta.toggleFavCmd(c.id);
        toast(Meta.favCmds().includes(c.id) ? '★ 맨 위에 고정했어요' : '☆ 고정을 풀었어요');
        render();
        break;
      case 'copy':
        toast(await copyText(withStop(c.code)) ? '📋 복사 완료! 크랙 콘솔에 붙여넣으세요 ♪' : '⚠️ 복사 실패');
        break;
      case 'dup': {
        const n = await editDialog({ ...c, id: '', title: c.title + ' (내 버전)' }, '⧉ 복제해서 고치기');
        if (n) { Meta.setCommands(mine().concat(n)); toast('⧉ 내 명령어로 복제했어요'); }
        break;
      }
      case 'edit': {
        const n = await editDialog(c, '✎ 명령어 수정');
        if (n) { Meta.setCommands(mine().map(x => x.id === c.id ? n : x)); toast('✎ 수정했어요'); }
        break;
      }
      case 'del':
        if (await Modal.confirm(`「${esc(c.title)}」을(를) 지울까요?`, { ok: '지울래요' })) {
          Meta.setCommands(mine().filter(x => x.id !== c.id));
          if (Meta.favCmds().includes(c.id)) Meta.toggleFavCmd(c.id);
        }
        break;
    }
  });

  /* ---------- 내보내기·가져오기 ---------- */
  $('exportBtn').onclick = () => {
    if (!mine().length) return toast('내 명령어가 아직 없어요');
    const blob = new Blob([JSON.stringify({ commands: mine() }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `내명령어_${fmt.date(Date.now())}.json`; a.click();
  };
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async () => {
    const f = $('importFile').files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const list = (data.commands || data).filter(c => c && c.code);
      const ids = new Set(mine().map(c => c.id));
      const add = list.map(c => ids.has(c.id) ? { ...c, id: uid() } : c);
      Meta.setCommands(mine().concat(add)); toast(`⤒ ${add.length}개를 가져왔어요`);
    } catch (e) { Modal.alert('⚠️ 파일을 읽지 못했어요'); }
    $('importFile').value = '';
  };

  window.addEventListener('meta-changed', () => { renderStop(); render(); });
  renderStop(); render();
})();
