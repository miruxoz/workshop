/* =========================================================
   🔗 링크 모음 — 도움 되는 사이트 + 메모 (이 브라우저에만 저장)
   ========================================================= */
(() => {
  const $ = id => document.getElementById(id);
  const KEY = 'links.list';
  let list = store.json(KEY, []) || [];
  let tag = store.get('links.tag', ''), editing = null;
  $('sort').value = store.get('links.sort', 'new');
  const save = () => store.setJson(KEY, list);

  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const fixUrl = u => { u = u.trim(); if (u && !/^[a-z]+:\/\//i.test(u)) u = 'https://' + u; return u; };

  function render() {
    const tags = [...new Set(list.map(x => x.tag).filter(Boolean))].sort();
    if (tag && !tags.includes(tag)) tag = '';
    $('tagList').innerHTML = tags.map(t => `<option value="${esc(t)}">`).join('');
    $('tags').innerHTML = [['', `전부 ${list.length}`], ...tags.map(t => [t, `${t} ${list.filter(x => x.tag === t).length}`])]
      .map(([v, l]) => `<button class="lk-tag ${v === tag ? 'on' : ''}" data-tag="${esc(v)}">${esc(l)}</button>`).join('');
    const q = $('q').value.trim().toLowerCase();
    let items = list.filter(x => (!tag || x.tag === tag) && (!q || [x.title, x.url, x.memo, x.tag].join(' ').toLowerCase().includes(q)));
    const s = $('sort').value;
    items = items.slice().sort((a, b) => s === 'old' ? a.ts - b.ts : s === 'name' ? (a.title || a.url).localeCompare(b.title || b.url, 'ko') : b.ts - a.ts);
    $('count').textContent = `(${list.length})`;
    $('list').innerHTML = items.map(x => {
      const h = host(x.url);
      const icon = h ? `<img class="lk-ic" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=32" alt="" loading="lazy">` : '<span class="lk-ic">📝</span>';
      const title = x.url ? `<a class="lk-title" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || h || x.url)}</a>` : `<span class="lk-title">${esc(x.title || '메모')}</span>`;
      return `<div class="lk-it">${icon}<div class="lk-main">${title}${x.url ? `<span class="lk-url">${esc(x.url)}</span>` : ''}
        ${x.memo ? `<p class="lk-memo">${esc(x.memo)}</p>` : ''}
        <div class="lk-meta">${x.tag ? `<span class="lk-tag">${esc(x.tag)}</span>` : ''}<span>${fmt.dateTime(x.ts)}</span></div></div>
        <div class="lk-btns">${x.url ? `<button data-copy="${x.id}">🔗 복사</button>` : ''}<button data-edit="${x.id}">✎ 고치기</button><button data-del="${x.id}">✕ 지우기</button></div></div>`;
    }).join('') || `<div class="lk-empty">${list.length ? '찾는 링크가 없어요' : '아직 모아둔 링크가 없어요 ♪'}</div>`;
  }

  function clearForm() { ['fUrl', 'fTitle', 'fMemo'].forEach(id => $(id).value = ''); $('fTag').value = tag || ''; editing = null; $('fCancel').hidden = true; $('formTitle').textContent = '✏️ 새 링크'; $('fSave').textContent = '💾 저장'; }
  $('fSave').onclick = () => {
    const url = fixUrl($('fUrl').value), title = $('fTitle').value.trim(), memo = $('fMemo').value.trim(), tg = $('fTag').value.trim();
    if (!url && !title && !memo) { toast('주소나 메모를 적어 주세요'); return; }
    if (editing) { Object.assign(list.find(x => x.id === editing), { url, title, memo, tag: tg }); toast('✎ 고쳤어요'); }
    else {
      list.unshift({ id: Date.now().toString(36), url, title, memo, tag: tg, ts: Date.now() }); toast('💾 저장했어요');
    }
    save(); clearForm(); render();
  };
  $('fCancel').onclick = clearForm;
  $('fUrl').addEventListener('keydown', e => { if (e.key === 'Enter') $('fSave').click(); });
  $('formToggle').onclick = () => { $('formBody').hidden = !$('formBody').hidden; $('formToggle').textContent = $('formBody').hidden ? '펼치기' : '접기'; };

  $('tags').onclick = e => { const b = e.target.closest('[data-tag]'); if (!b) return; tag = b.dataset.tag; store.set('links.tag', tag); render(); };
  $('q').oninput = render;
  $('sort').onchange = () => { store.set('links.sort', $('sort').value); render(); };
  $('list').onclick = async e => {
    const c = e.target.closest('[data-copy]'); if (c) { toast(await copyText(list.find(x => x.id === c.dataset.copy).url) ? '🔗 주소를 복사했어요' : '⚠️ 복사 실패'); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) {
      const x = list.find(y => y.id === ed.dataset.edit); editing = x.id;
      $('fUrl').value = x.url || ''; $('fTitle').value = x.title || ''; $('fTag').value = x.tag || ''; $('fMemo').value = x.memo || '';
      $('formBody').hidden = false; $('formToggle').textContent = '접기'; $('fCancel').hidden = false; $('formTitle').textContent = '✎ 링크 고치기'; $('fSave').textContent = '✔ 고친 내용 저장';
      window.scrollTo({ top: 0, behavior: 'smooth' }); $('fMemo').focus(); return;
    }
    const d = e.target.closest('[data-del]');
    if (d && await Modal.confirm('이 링크를 지울까요?')) { list = list.filter(x => x.id !== d.dataset.del); save(); render(); toast('지웠어요'); }
  };

  // 백업
  $('bExport').onclick = () => {
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `링크모음_${fmt.date(Date.now()).replace(/\./g, '')}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('bImport').onchange = async () => {
    const f = $('bImport').files[0]; $('bImport').value = ''; if (!f) return;
    try {
      const data = JSON.parse(await f.text()); if (!Array.isArray(data)) throw new Error('형식이 달라요');
      const have = new Set(list.map(x => x.id)); const add = data.filter(x => x && x.id && !have.has(x.id));
      list = list.concat(add); save(); render(); toast(`⬆ ${add.length}개를 더했어요`);
    } catch (e) { toast('⚠️ 백업 파일을 못 읽었어요'); }
  };

  clearForm(); render();
})();
