/* =========================================================
   🎀 작업대 — ① 붙여넣기·변환 화면 동작
   · 채팅방 카테고리 고르기 (★ 기본 / ＋ 추가 / ✎ 이름 바꾸기)
   · 붙여넣으면 자동 분류 (관찰일지·OOC → 서랍, 요약본 삭제) + 되돌리기
   · 변환 결과 미리보기 / HTML 복사
   ========================================================= */
const Workbench = (() => {
  const $ = id => document.getElementById(id);
  const input = $('input'), title = $('title'), catSel = $('catSel');

  /* =========================================================
     🏷 채팅방 카테고리
     ========================================================= */
  let currentCat = store.get('wb.cat', '') || Meta.defaultCat();

  function renderCats() {
    const cats = Meta.cats();
    if (!cats.some(c => c.id === currentCat)) currentCat = Meta.defaultCat();
    catSel.innerHTML = cats.map(c => `<option value="${c.id}" ${c.id === currentCat ? 'selected' : ''}>${c.id === Meta.defaultCat() ? '★ ' : ''}${esc(c.name)}</option>`).join('');
    const isDef = currentCat === Meta.defaultCat();
    $('catDefault').textContent = isDef ? '★ 기본' : '☆ 기본으로';
    $('catDefault').disabled = isDef;
  }
  catSel.onchange = () => { currentCat = catSel.value; store.set('wb.cat', currentCat); renderCats(); };

  $('catAdd').onclick = async () => {
    const r = await Modal.prompt('＋ 새 채팅방 카테고리', [{ name: 'name', label: '이름', placeholder: '예: 블루윙스' }], { ok: '추가 ♡' });
    if (!r || !r.name.trim()) return;
    currentCat = Meta.addCat(r.name.trim()); store.set('wb.cat', currentCat);
    renderCats(); toast('🏷 카테고리를 추가했어요');
  };
  $('catRename').onclick = async () => {
    const r = await Modal.prompt('✎ 채팅방 이름 바꾸기', [{ name: 'name', label: '새 이름', value: Meta.catName(currentCat) }]);
    if (!r || !r.name.trim()) return;
    Meta.renameCat(currentCat, r.name.trim()); toast('✎ 이름을 바꿨어요');
  };
  $('catDefault').onclick = async () => {
    if (!await Modal.confirm(`<b>${esc(Meta.catName(currentCat))}</b>을(를)<br>기본 카테고리로 할까요?<br><small>새로 담는 글과 현황 위젯에 쓰여요</small>`)) return;
    Meta.setDefault(currentCat); toast('★ 기본 카테고리로 정했어요');
  };
  $('catDel').onclick = async () => {
    if (Meta.cats().length < 2) return Modal.alert('카테고리가 하나뿐이라 지울 수 없어요');
    const name = Meta.catName(currentCat);
    const n = Drawer.all().filter(x => x.cat === currentCat).length;
    if (!await Modal.confirm(`<b>${esc(name)}</b> 카테고리를 지울까요?` + (n ? `<br><small>서랍 글 ${n}개는 ★ 기본 카테고리로 옮겨져요</small>` : ''), { ok: '지울래요' })) return;
    const old = currentCat;
    Meta.removeCat(old);
    Drawer.moveCat(old, Meta.defaultCat());
    currentCat = Meta.defaultCat(); store.set('wb.cat', currentCat);
    renderCats(); toast('🗑 카테고리를 지웠어요');
  };
  window.addEventListener('meta-changed', renderCats);
  renderCats();

  /* =========================================================
     🎨 상태창 틀 고르기 (templates/ 폴더의 html)
     ========================================================= */
  const tplSel = $('tplSel');
  function renderTpls() {
    const cur = Templates.current();
    tplSel.innerHTML = '<option value="">기본 디자인</option>' +
      Templates.cached().map(t => `<option value="${esc(t.file)}" ${cur && cur.file === t.file ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  }
  tplSel.onchange = () => { Templates.select(tplSel.value); run(false); toast('🎨 상태창 디자인을 바꿨어요'); };
  async function reloadTpls(showToast) {
    try { const list = await Templates.refresh(); renderTpls(); if (showToast) toast(`🎨 틀 ${list.length}개를 읽었어요`); }
    catch (e) { if (showToast) Modal.alert('🎨 ' + esc(e.message)); }
  }
  $('tplReload').onclick = () => reloadTpls(true);
  renderTpls();
  if (Repo.info()) reloadTpls(false).then(() => run(false));

  /* =========================================================
     👀 미리보기 (티스토리 스킨 본문과 비슷하게)
     ========================================================= */
  const PREVIEW_HEAD = `
<meta charset="UTF-8">
<style>
  @font-face { font-family: 'MonaTarget'; src: url('https://cdn.jsdelivr.net/gh/MonadABXY/mona-font@main/web/Mona12.woff2') format('woff2');
    unicode-range: U+3040-309F, U+30A0-30FF, U+4E00-9FFF, U+3000-303F, U+FF00-FFEF, U+1F300-1F9FF, U+2600-26FF, U+2700-27BF; }
  @font-face { font-family: "Mona12"; src: url("https://cdn.jsdelivr.net/gh/MonadABXY/mona-font@main/web/Mona12.woff2") format("woff2"); }
  :root { --c--palepink: #fdf7fa; --c-gray: #555; }
  html, body { margin: 0; }
  body { padding: 18px 22px 28px; background: #fff; color: #555; font-family: 'MonaTarget', 'Mona12', sans-serif; font-size: 13px; line-height: 1.8; word-break: keep-all; }
  img { max-width: 100%; }
</style>`;

  function showPreview(html) {
    const frame = $('preview');
    frame.onload = () => {
      const fit = () => { try { frame.style.height = frame.contentDocument.documentElement.scrollHeight + 'px'; } catch (e) {} };
      fit();
      frame.contentDocument.querySelectorAll('img').forEach(img => img.addEventListener('load', fit));
      setTimeout(fit, 600);
    };
    frame.srcdoc = `<!DOCTYPE html><html><head>${PREVIEW_HEAD}</head><body>${html}</body></html>`;
  }

  /* ---------- 변환 ---------- */
  let lastHtml = '';
  function show(text, ttl, label, showToast) {
    if (!text.trim()) {
      if (showToast) toast('붙여넣은 로그가 없어요 (｡•́︿•̀｡)');
      $('result').hidden = true; $('empty').hidden = false; $('resultHint').textContent = ''; $('resultLabel').textContent = '';
      return;
    }
    const { html, stats } = LogConverter.convert(text, { title: ttl });
    lastHtml = html;
    $('resultLabel').textContent = label ? ' — ' + label : '';
    $('stats').innerHTML =
      `<span>상태창<b>${stats.status}</b>개</span>` +
      `<span>사진<b>${stats.images}</b>장</span>` +
      `<span>HTML<b>${html.split('\n').length}</b>줄</span>`;
    $('output').value = html;
    showPreview(html);
    $('empty').hidden = true; $('result').hidden = false;
    $('resultHint').textContent = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + ' 변환';
    if (showToast) toast('✨ 변환 완료!');
  }
  const run = showToast => show(input.value, title.value, '', showToast);

  /* =========================================================
     🔍 자동 분류 (붙여넣을 때)
     ========================================================= */
  let undo = null;   // { input, ids }

  function autoClassify() {
    const r = Classifier.run(input.value);
    if (!r) return false;                       // 경계 표시가 없는 글 (예전 형식) → 그대로 둠
    const before = input.value;
    const name = t => (t.request || '').replace(/[📔\s]+/g, ' ').trim();
    const ids = Drawer.addMany([
      ...r.journals.map(j => ({ text: j.text, request: j.request, type: 'journal', storyDate: j.storyDate, base: '관찰일지' + (j.storyDate ? ' ' + j.storyDate : '') })),
      ...r.oocs.map(o => ({ text: o.text, request: o.request, type: 'ooc', base: 'OOC' + (name(o) ? ' · ' + name(o).slice(0, 16) : '') }))
    ]);
    input.value = r.main;
    input.dispatchEvent(new Event('wb-changed'));
    undo = { input: before, ids };

    const parts = [`📖 본편 <b>${r.mainCount}</b>개는 여기 남았어요`];
    if (r.journals.length) parts.push(`📓 관찰일지 <b>${r.journals.length}</b>개`);
    if (r.oocs.length) parts.push(`💬 OOC <b>${r.oocs.length}</b>개 → 서랍`);
    if (r.removed) parts.push(`🗑 요약본 <b>${r.removed}</b>개 삭제`);
    $('classifyBar').innerHTML = `<span>🔍 자동 분류: ${parts.join(' · ')}</span><button class="btn mini white" id="undoBtn">↩ 되돌리기</button>`;
    $('classifyBar').hidden = false;
    $('undoBtn').onclick = () => {
      if (!undo) return;
      Drawer.removeIds(undo.ids);
      input.value = undo.input; input.dispatchEvent(new Event('wb-changed'));
      undo = null; $('classifyBar').hidden = true;
      run(false); toast('↩ 분류 전으로 되돌렸어요');
    };
    if (r.journals.length || r.oocs.length) Drawer.showTab(r.journals.length ? 'journal' : 'ooc');
    return true;
  }

  input.addEventListener('paste', () => setTimeout(() => { if (autoClassify()) run(false); }, 0));

  /* ---------- 버튼 ---------- */
  $('convertBtn').onclick = () => { autoClassify(); run(true); };
  $('clearBtn').onclick = async () => {
    if (input.value && !await Modal.confirm('붙여넣은 로그를 지울까요?', { ok: '지울래요' })) return;
    input.value = ''; title.value = '';
    store.remove('wb.input'); store.remove('wb.title');
    $('classifyBar').hidden = true; undo = null;
    run(false);
  };
  $('copyBtn').onclick = async () => {
    if (!lastHtml) return;
    toast(await copyText(lastHtml) ? '📋 복사 완료! 티스토리 HTML 모드에 붙여넣으세요 ♪' : '⚠️ 복사가 안 됐어요. HTML 코드 탭에서 직접 복사해 주세요');
  };
  document.querySelectorAll('.subtab').forEach(tab => tab.onclick = () => {
    document.querySelectorAll('.subtab').forEach(t => t.classList.toggle('on', t === tab));
    document.querySelectorAll('.subpane').forEach(p => p.hidden = p.id !== tab.dataset.pane);
  });

  /* ---------- 새로고침해도 남아 있게 저장 ---------- */
  input.value = store.get('wb.input');
  title.value = store.get('wb.title');
  let saveTimer;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { store.set('wb.input', input.value); store.set('wb.title', title.value); }, 300); };
  input.addEventListener('input', save);
  title.addEventListener('input', save);
  input.addEventListener('wb-changed', () => store.set('wb.input', input.value));

  setTimeout(() => { if (input.value.trim()) run(false); }, 0);

  return {
    show(text, ttl, label) { show(text, ttl, label, false); $('resultWin').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    refresh() { run(false); },
    currentCat: () => currentCat
  };
})();
