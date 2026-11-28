/* =========================================================
   📺 2ch 페이지 (2ch.html)
   ---------------------------------------------------------
   · 붙여넣은 스레 → 미리보기 (kyonya/kyonya-2ch.js 와 같은 모양)
   · 📒 스레 장부: 카테고리 탭별로 제목·마지막 레스·한줄 요약 기록
       localStorage '2ch.ledger'  +  보관함 2ch/ledger.json (비공개 깃허브)
   · 💌 OOC: 장부에서 고른 스레로 괄호 자동 채우기
   ========================================================= */
(() => {
  const $ = id => document.getElementById(id);
  const CATS = Ch2.CATS;
  const LKEY = '2ch.ledger', VPATH = '2ch/ledger.json';
  const keyOf = t => String(t || '').replace(/\s+/g, '').toLowerCase();
  const catOf = id => CATS.find(c => c.id === id);

  /* ---------- 장부 { threads: { key: {cat,title,last,summary,updated,del} } } ---------- */
  let L = store.json(LKEY, null) || { threads: {} };
  const live = () => Object.entries(L.threads).filter(([, t]) => !t.del);
  function merge(a, b) {   // 같은 스레는 더 최근에 고친 쪽으로
    const out = { threads: { ...((a && a.threads) || {}) } };
    Object.entries((b && b.threads) || {}).forEach(([k, t]) => { const o = out.threads[k]; if (!o || (t.updated || 0) >= (o.updated || 0)) out.threads[k] = t; });
    return out;
  }
  function saveLocal() { store.setJson(LKEY, L); }

  /* ---------- 보관함 동기화 ---------- */
  let syncT = null, syncing = false;
  function syncMsg(m) { $('lgSync').textContent = m; }
  function queueSync() {
    if (!Vault.configured()) { syncMsg('💾 보관함 연결 안 됨 (이 브라우저에만 저장)'); return; }
    syncMsg('⏳ 보관함에 저장 대기…');
    clearTimeout(syncT); syncT = setTimeout(push, 1500);
  }
  async function push() {
    if (syncing) { queueSync(); return; }
    syncing = true; syncMsg('⏳ 보관함에 저장 중…');
    try {
      const next = await Vault.update(VPATH, cur => merge(cur, L), '📺 2ch 장부', { threads: {} });
      L = merge(L, next); saveLocal(); renderLedger();
      syncMsg('☁ 보관함 저장됨 ' + fmt.dateTime(Date.now()).slice(11));
    } catch (e) { syncMsg('⚠️ 보관함 저장 실패: ' + e.message); }
    syncing = false;
  }
  async function pull(say) {
    if (!Vault.configured()) { syncMsg('💾 보관함 연결 안 됨 (이 브라우저에만 저장)'); if (say) toast('보관함이 아직 연결되지 않았어요'); return; }
    syncMsg('⏳ 보관함에서 불러오는 중…');
    try {
      const r = await Vault.getJson(VPATH);
      const before = JSON.stringify(L);
      if (r) L = merge(L, r.data);
      saveLocal(); renderLedger();
      syncMsg('☁ 보관함과 맞춤 ' + fmt.dateTime(Date.now()).slice(11));
      if (!r || JSON.stringify(r.data) !== JSON.stringify(L)) queueSync();   // 이 브라우저에만 있던 것도 올리기
      if (say) toast(before === JSON.stringify(L) ? '이미 최신이에요 ♪' : '☁ 보관함 장부를 불러왔어요');
    } catch (e) { syncMsg('⚠️ 불러오기 실패: ' + e.message); }
  }

  /* ---------- 붙여넣기 → 미리보기 / 장부 기록 ---------- */
  const inEl = $('c2In');
  const cleanText = () => inEl.value.replace(/\r/g, '').split('\n').filter(l => !/^\s*```/.test(l)).join('\n').trim();
  function preview() {
    store.set('2ch.input', inEl.value);
    const th = Ch2.parse(inEl.value);
    $('c2Prev').innerHTML = th.length ? Ch2.render(th, { summary: true }) : '<div class="empty">왼쪽에 스레를 붙여넣어 주세요 (｀・ω・´)</div>';
    return th;
  }
  function record(say) {
    const th = Ch2.parse(inEl.value).filter(t => t.title && t.res.length);
    if (!th.length) { if (say) toast('스레 제목([스레])이랑 레스가 있어야 기록돼요'); return; }
    const msg = th.map(t => {
      const k = keyOf(t.title), o = L.threads[k] && !L.threads[k].del ? L.threads[k] : null;
      L.threads[k] = {
        cat: t.catId || (o && o.cat) || '', title: t.title,
        last: Math.max(t.last, o ? o.last : 0),
        summary: t.summary || (o ? o.summary : ''),
        updated: Date.now()
      };
      const c = catOf(L.threads[k].cat);
      return `${o ? '🔁 이어서 갱신' : '🆕 새로 기록'} · ${c ? c.emo + ' ' + c.label : '📦 미분류'} · 「${esc(t.title)}」 #${L.threads[k].last}`;
    });
    saveLocal(); queueSync();
    tab = L.threads[keyOf(th[0].title)].cat || 'none';
    pickKey = keyOf(th[0].title);
    renderLedger();
    $('c2Got').innerHTML = '📒 ' + msg.join('<br>📒 ');
    if (say) toast('📒 장부에 기록했어요!');
  }
  let pT;
  inEl.addEventListener('input', () => { clearTimeout(pT); pT = setTimeout(preview, 250); });
  inEl.addEventListener('paste', () => setTimeout(() => { preview(); record(true); }, 30));
  $('c2Rec').addEventListener('click', () => { preview(); record(true); });
  $('c2Clear').addEventListener('click', () => { inEl.value = ''; $('c2Got').innerHTML = ''; preview(); });

  $('c2Post').addEventListener('click', async () => {
    const t = cleanText();
    if (!Ch2.parse(t).length) return toast('아직 스레가 없어요');
    toast(await copyText('<pre class="ch2">' + esc(t) + '</pre>') ? '📋 게시용 복사 완료! HTML 모드에 붙여넣어 주세요' : '복사 실패…');
  });
  $('c2Title').addEventListener('click', async () => {
    const th = Ch2.parse(inEl.value)[0];
    if (!th || !th.title) return toast('아직 스레 제목이 없어요');
    const m = th.res[0] && th.res[0].date.match(/\d{4}\/(\d{1,2})\/(\d{1,2})/);
    const title = (m ? `{${+m[1]}/${+m[2]}} ` : '') + th.title + ` (${th.last})`;
    toast(await copyText(title) ? '📋 ' + title : '복사 실패…');
  });

  /* ---------- 📒 장부 화면 ---------- */
  let tab = store.get('2ch.tab', 'all'), pickKey = null;
  function renderLedger() {
    const all = live();
    const count = id => all.filter(([, t]) => (id === 'all' ? true : id === 'none' ? !catOf(t.cat) : t.cat === id)).length;
    const tabs = [{ id: 'all', emo: '🗂', label: '전체' }].concat(CATS, count('none') ? [{ id: 'none', emo: '📦', label: '미분류' }] : []);
    if (!tabs.some(t => t.id === tab)) tab = 'all';
    $('lgTabs').innerHTML = tabs.map(t => `<span class="lg-tab${t.id === tab ? ' on' : ''}" data-tab="${t.id}">${t.emo} ${esc(t.label.replace(/\(.*\)/, ''))} <small>${count(t.id) || ''}</small></span>`).join('');
    $('lgNew').disabled = tab === 'all' || tab === 'none';
    const rows = all.filter(([, t]) => tab === 'all' || (tab === 'none' ? !catOf(t.cat) : t.cat === tab)).sort((a, b) => b[1].updated - a[1].updated);
    $('lgList').innerHTML = rows.length ? rows.map(([k, t]) => {
      const c = catOf(t.cat), full = t.last >= 1000;
      return `<li class="lg-it${k === pickKey ? ' pick' : ''}" data-k="${esc(k)}">
        <div class="lg-main">
          <div class="lg-top"><span class="lg-cat" data-act="cat" title="카테고리 바꾸기">${c ? c.emo + ' ' + esc(c.label.replace(/\(.*\)/, '')) : '📦 미분류'}</span>
            <span class="lg-title" title="${esc(t.title)}">${esc(t.title)}</span><span class="lg-no${full ? ' full' : ''}">#${t.last}</span></div>
          <textarea class="lg-sum" data-act="sum" rows="1" placeholder="(한줄 요약 없음 · 눌러서 적기)">${esc(t.summary || '')}</textarea>
          <div class="lg-meta">마지막 기록 ${fmt.dateTime(t.updated)}</div>
        </div>
        <div class="lg-btns">
          ${full ? `<button class="btn pink" data-act="part">➡ ${esc(nextPart(t.title).part)}로</button>` : `<button class="btn pink" data-act="cont">✍ 이어 쓰기</button>`}
          <button class="btn white" data-act="del">🗑 지우기</button>
        </div></li>`;
    }).join('') : `<li class="empty">${tab === 'all' ? '아직 기록된 스레가 없어요' : '이 탭엔 아직 스레가 없어요 · 「✨ 새 스레」로 시작해 보세요'}</li>`;
  }
  function nextPart(title) {
    const m = title.match(/Part\.?\s*(\d+)/i);
    const n = m ? +m[1] + 1 : 2;
    return { part: 'Part.' + n, title: m ? title.replace(m[0], 'Part.' + n) : title + ' Part.2' };
  }
  $('lgTabs').addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (!t) return; tab = t.dataset.tab; store.set('2ch.tab', tab); renderLedger(); });
  $('lgList').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'), li = e.target.closest('[data-k]'); if (!b || !li) return;
    const k = li.dataset.k, t = L.threads[k], act = b.dataset.act;
    if (act === 'cont') { pickKey = k; fillOoc({ cat: catLabel(t.cat), title: t.title, last: t.last, summary: t.summary }, '✍ 이어 쓰기 · ' + t.title); renderLedger(); }
    if (act === 'part') { pickKey = k; const np = nextPart(t.title); fillOoc({ cat: catLabel(t.cat), title: np.title, last: '', summary: t.summary }, '➡ ' + np.part + ' 새 스레 · ' + np.title); renderLedger(); }
    if (act === 'del') {
      if (!(await Modal.confirm(`「${esc(t.title)}」을(를) 장부에서 지울까요?<br><small>보관함 장부에서도 지워져요</small>`, { ok: '지우기', cancel: '그만' }))) return;
      L.threads[k] = { ...t, del: true, updated: Date.now() }; saveLocal(); queueSync(); renderLedger();
    }
    if (act === 'cat') {
      const r = await Modal.choose('📂 카테고리 옮기기', CATS.map(c => ({ value: c.id, label: c.emo + ' ' + c.label })), t.cat, { ok: '옮기기 ♡' });
      const pick = r && r.pick; if (!pick) return;
      L.threads[k] = { ...t, cat: pick, updated: Date.now() }; saveLocal(); queueSync(); renderLedger();
    }
  });
  $('lgList').addEventListener('change', e => {
    const s = e.target.closest('[data-act="sum"]'), li = e.target.closest('[data-k]'); if (!s || !li) return;
    const k = li.dataset.k; L.threads[k] = { ...L.threads[k], summary: s.value.trim(), updated: Date.now() };
    saveLocal(); queueSync(); toast('요약을 고쳤어요 ✏️');
    if (pickKey === k) $('lgList').querySelector(`[data-k="${CSS.escape(k)}"] [data-act="cont"]`)?.click();
  });
  $('lgNew').addEventListener('click', () => { const c = catOf(tab); if (!c) return; pickKey = null; fillOoc({ cat: c.label }, '✨ 새 스레 · ' + c.emo + ' ' + c.label); renderLedger(); });
  $('lgAuto').addEventListener('click', () => { pickKey = null; fillOoc({}, '🎲 AI한테 맡기기'); renderLedger(); });
  $('lgPull').addEventListener('click', () => pull(true));

  /* ---------- 💌 OOC ---------- */
  const catLabel = id => (catOf(id) || {}).label || '';
  function fillOoc(v, mode) {
    $('oocOut').value = (window.CH2_OOC || '')
      .replace('{cat}', v.cat || '').replace('{title}', v.title || '')
      .replace('{last}', v.last === 0 || v.last ? String(v.last) : '').replace('{summary}', v.summary || '');
    $('oocMode').textContent = mode ? '· ' + mode : '';
    store.set('2ch.ooc', $('oocOut').value); store.set('2ch.oocMode', $('oocMode').textContent);
    if (mode) $('oocOut').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('oocOut').addEventListener('input', () => store.set('2ch.ooc', $('oocOut').value));
  $('oocCopy').addEventListener('click', async () => toast(await copyText($('oocOut').value) ? '📋 OOC 복사했어요 ♡' : '복사 실패…'));

  /* ---------- 시작 ---------- */
  inEl.value = store.get('2ch.input', '');
  preview();
  renderLedger();
  const savedOoc = store.get('2ch.ooc', '');
  if (savedOoc) { $('oocOut').value = savedOoc; $('oocMode').textContent = store.get('2ch.oocMode', ''); } else fillOoc({}, '');
  pull(false);
})();
