/* =========================================================
   🎀 현황 위젯 — 모든 페이지 구석에 떠 있는 작은 창
   ---------------------------------------------------------
   · 제목 줄을 잡고 끌면 위치가 바뀌어요 (위치는 기억해요) / － 로 접기
   · 📅 마지막 백업일 = ★ 기본 채팅방의 STOP 문장을 저장한 날
   · 📌 STOP 문장 (복사 / ✎ 새 문장 저장)
   · 🗂 보관함 글 수 · 🔖 책갈피 꽂힌(미완료) 글 수
   · 🔗 바로가기 (📸 발췌 + 직접 추가한 링크) · 📝 메모 (보관함에 같이 저장)
   ========================================================= */
(function () {
  const POS_KEY = 'widget.pos', FOLD_KEY = 'widget.fold';

  const el = document.createElement('div');
  el.className = 'wg';
  el.innerHTML = `
    <div class="wg-t" id="wgHandle"><span>♡ げんじょう ♡</span><button id="wgFold" title="접기·펴기">－</button></div>
    <div class="wg-b">
      <div class="wg-row"><span class="k">📅 마지막 백업</span><span class="v" id="wgLast"></span></div>
      <div class="wg-row"><span class="k">🏷 진행 중</span><span class="v" id="wgCat"></span></div>
      <div class="wg-box">
        <small>📌 STOP 문장 <span><button id="wgStopCopy">복사</button> <button id="wgStopEdit">✎ 새로</button></span></small>
        <span class="wg-stop" id="wgStop"></span>
      </div>
      <div class="wg-nums">
        <div class="wg-num" id="wgVault" title="보관함 열기"><b>-</b>🗂 보관함</div>
        <div class="wg-num" id="wgMarks" title="책갈피 꽂힌 글 보기"><b>0</b>🔖 미완료</div>
      </div>
      <div class="wg-box">
        <small>🔗 바로가기</small>
        <div class="wg-links" id="wgLinks"></div>
      </div>
      <div class="wg-box">
        <small>📝 메모 <span id="wgMemoState"></span></small>
        <textarea class="wg-memo" id="wgMemo" placeholder="아무거나 적어두세요 ♪"></textarea>
      </div>
    </div>`;
  document.body.appendChild(el);
  const $ = id => el.querySelector('#' + id);

  /* ---------- 📱 폰: 왼쪽 위 아이콘을 누르면 위젯이 떠요 ----------
     · 아이콘은 페이지와 같이 스크롤돼요 (내리면 안 보여요)
     · ✕ 나 바깥을 누르면 닫혀요 */
  const mobile = window.matchMedia('(max-width: 600px)');
  const icon = document.createElement('button');
  icon.className = 'wg-icon'; icon.type = 'button'; icon.title = '현황 위젯';
  icon.textContent = '🎀';
  document.body.appendChild(icon);
  icon.onclick = e => { e.stopPropagation(); el.classList.toggle('m-open'); };
  document.addEventListener('pointerdown', e => {
    if (mobile.matches && el.classList.contains('m-open') && !el.contains(e.target) && !icon.contains(e.target)) el.classList.remove('m-open');
  });

  /* ---------- 위치 (드래그) ---------- */
  const clamp = () => {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(0, r.left), window.innerWidth - r.width);
    const y = Math.min(Math.max(0, r.top), window.innerHeight - 30);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  };
  const placeDefault = () => {   // 기본 위치: 오른쪽 아래
    el.style.left = (window.innerWidth - el.offsetWidth - 16) + 'px';
    el.style.top = Math.max(0, window.innerHeight - el.offsetHeight - 16) + 'px';
  };
  const savedPos = store.json(POS_KEY, null);
  const foldSaved = store.get(FOLD_KEY, '');
  if (foldSaved === '1' || (foldSaved === '' && window.innerWidth < 600)) {   // 폰에선 처음엔 접힌 채로
    el.classList.add('folded'); $('wgFold').textContent = '＋';
  }
  if (savedPos) { el.style.left = savedPos.x + 'px'; el.style.top = savedPos.y + 'px'; requestAnimationFrame(clamp); }
  else requestAnimationFrame(placeDefault);
  window.addEventListener('resize', clamp);

  let drag = null;
  $('wgHandle').addEventListener('pointerdown', e => {
    if (e.target.closest('button') || mobile.matches) return;
    const r = el.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    el.classList.add('dragging');
    $('wgHandle').setPointerCapture(e.pointerId);
  });
  $('wgHandle').addEventListener('pointermove', e => {
    if (!drag) return;
    el.style.left = (e.clientX - drag.dx) + 'px'; el.style.top = (e.clientY - drag.dy) + 'px';
    clamp();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null; el.classList.remove('dragging');
    store.setJson(POS_KEY, { x: parseInt(el.style.left), y: parseInt(el.style.top) });
  };
  $('wgHandle').addEventListener('pointerup', endDrag);
  $('wgHandle').addEventListener('pointercancel', endDrag);
  $('wgHandle').addEventListener('dblclick', () => { store.remove(POS_KEY); placeDefault(); });   // 두 번 누르면 기본 위치로

  $('wgFold').onclick = () => {
    if (mobile.matches) { el.classList.remove('m-open'); return; }   // 폰: 닫기
    const f = el.classList.toggle('folded');
    $('wgFold').textContent = f ? '＋' : '－';
    store.set(FOLD_KEY, f ? '1' : '0');
    clamp();
  };

  /* ---------- 내용 채우기 ---------- */
  const drawerItems = () => (window.Drawer ? Drawer.all() : store.json('wb.drawer', []));

  function render() {
    const cat = Meta.defaultCat();
    const stop = Meta.stop(cat);
    $('wgLast').innerHTML = stop ? `${fmt.date(stop.date).slice(5)} <small>(${fmt.ago(stop.date)})</small>` : '<small>아직 없어요</small>';
    $('wgCat').textContent = '★ ' + Meta.catName(cat);
    $('wgStop').textContent = stop && stop.text ? stop.text : (stop ? '(비어 있음 → 처음부터 백업)' : '✎ 새로 를 눌러 STOP 문장을 저장하세요');
    $('wgStop').classList.toggle('none', !(stop && stop.text));

    $('wgVault').querySelector('b').textContent = Vault.configured() ? Vault.cachedIndex().posts.length : '-';
    $('wgMarks').querySelector('b').textContent = drawerItems().filter(x => x.bookmark != null).length;

    const links = Meta.get().links;
    $('wgLinks').innerHTML =
      `<span class="wg-link"><a href="#" data-act="excerpt">📸 발췌</a><button tabindex="-1" style="visibility:hidden">✕</button></span>` +
      links.map(l => `<span class="wg-link"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a><button data-del="${l.id}" title="지우기">✕</button></span>`).join('') +
      `<span class="wg-link add" data-act="add">＋ 링크</span>`;

    const memo = $('wgMemo');
    if (document.activeElement !== memo) memo.value = Meta.get().memo || '';
  }

  /* ---------- 버튼 ---------- */
  $('wgStopCopy').onclick = async () => {
    const s = Meta.stop(Meta.defaultCat());
    if (!s) return toast('저장된 STOP 문장이 없어요');
    toast(await copyText(s.text) ? '📌 STOP 문장 복사 완료!' : '⚠️ 복사 실패');
  };
  $('wgStopEdit').onclick = async () => {
    const r = await Modal.prompt('📌 새 STOP 문장 저장', [
      { name: 'text', label: '백업 패널의 「다음 STOP 문장」을 붙여넣어 주세요', type: 'textarea', rows: 3 }
    ], { msg: `<b>${esc(Meta.catName(Meta.defaultCat()))}</b> 채팅방<br><small>저장한 날이 '마지막 백업일'이 돼요</small>` });
    if (!r || !r.text.trim()) return;
    Meta.setStop(Meta.defaultCat(), r.text.trim());
    toast('📌 STOP 문장을 저장했어요!');
  };
  $('wgVault').onclick = () => { location.href = 'vault.html'; };
  $('wgMarks').onclick = async () => {
    const marks = drawerItems().filter(x => x.bookmark != null);
    if (!marks.length) return Modal.alert('🔖 책갈피 꽂힌 글이 없어요<br><small>② 편집에서 🔖 책갈피 로 꽂을 수 있어요</small>');
    const pick = await Modal.choose('🔖 미완료 글 (책갈피)', marks.map(m => ({ value: m.id, label: `🔖 ${m.base || '제목 없음'}` })), marks[0].id, { ok: '이어서 편집 ♡' });
    if (!pick) return;
    if (window.Steps) { Steps.go(2, pick); setTimeout(() => document.getElementById('edGoBm').click(), 200); }
    else { store.set('wb.pick', pick); location.href = 'index.html#bookmark'; }
  };
  $('wgLinks').addEventListener('click', async e => {
    const del = e.target.closest('[data-del]');
    if (del) {
      const l = Meta.get().links.find(x => x.id === del.dataset.del);
      if (l && await Modal.confirm(`「${esc(l.name)}」 링크를 지울까요?`, { ok: '지울래요' })) Meta.removeLink(l.id);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    e.preventDefault();
    if (act.dataset.act === 'excerpt') {
      if (window.Steps) { Steps.go(2); Steps.setMode('xp'); toast('📸 발췌 펜으로 문장을 드래그하세요'); }
      else location.href = 'index.html#excerpt';
      return;
    }
    if (act.dataset.act === 'add') {
      const r = await Modal.prompt('🔗 바로가기 추가', [
        { name: 'name', label: '이름', placeholder: '예: 내 티스토리' },
        { name: 'url', label: '주소', placeholder: 'https://' }
      ], { ok: '추가 ♡' });
      if (!r || !r.name.trim() || !r.url.trim()) return;
      let url = r.url.trim();
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      Meta.addLink(r.name.trim(), url);
    }
  });

  let memoTimer;
  $('wgMemo').addEventListener('input', () => {
    $('wgMemoState').textContent = '…';
    clearTimeout(memoTimer);
    memoTimer = setTimeout(() => { Meta.setMemo($('wgMemo').value); $('wgMemoState').textContent = '저장됨 ♡'; }, 800);
  });

  ['meta-changed', 'vault-changed', 'drawer-changed', 'storage'].forEach(ev => window.addEventListener(ev, render));
  render();
  Meta.sync();   // 깃허브 보관함의 설정(카테고리·STOP·링크·메모)과 맞추기
  if (Vault.configured() && !/vault\.html/.test(location.pathname)) Vault.loadIndex().catch(() => {});
})();
