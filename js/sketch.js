/* =========================================================
   📒 스케치북 (sketch.html) — 쿄냐통신 아이디어 정리
   ---------------------------------------------------------
   · 카드마다 우선도(⭐ 먼저 · 🕐 나중 · ✕ 빼기) · 진행 · 메모
   · 이 브라우저에 자동 저장 (localStorage 'sketch.data')
   · ☁ 버튼: 비공개 보관함 저장소의 sketch.json 으로 올리기·받기
   · 처음 기본 목록은 아래 DEFAULT_ITEMS (지금까지 이야기한 것)
   ========================================================= */
(() => {
  const KEY = 'sketch.data';

  const GROUPS = [
    { id: 'home',   name: '🏠 포털 홈', sub: '첫 화면에 들어갈 것' },
    { id: 'svc',    name: '🧩 서비스', sub: '카테고리 · 페이지 · 게시판' },
    { id: 'branch', name: '🏪 분점 · 러브로그', sub: '교환일기 쪽' },
    { id: 'tech',   name: '🛠 만들 때 메모', sub: '기능 · 정할 것' },
  ];
  const PRI = [
    { v: 'star',  label: '⭐ 먼저' },
    { v: 'later', label: '🕐 나중' },
    { v: 'drop',  label: '✕ 빼기' },
  ];
  const STATUS = ['💭 아이디어', '✏️ 시안', '🔨 만드는 중', '✅ 완성'];

  // where: 어디에 (홈 · 카테고리 · 페이지 · 스킨 · 방명록 …) / src: 내용 출처 (OOC · 직접 · 자동 …)
  const D = (group, icon, name, like, where, src, desc, pri = '', memo = '') =>
    ({ group, icon, name, like, where, src, desc, pri, memo, status: 0 });
  const DEFAULT_ITEMS = [
    // 🏠 포털 홈
    D('home', '🎀', '헤더', '미스타다 · 후미코뮤', '홈 · 스킨', '직접', '로고 「쿄냐통신」 + 알약 메뉴 줄 + 리본 장식 + 갱신 내역 스크롤 박스', 'star'),
    D('home', '🔍', '검색창', '미스타다 「인기 알바생 검색」', '스킨', '티스토리 기능', '헤더 안에 진짜로 검색되는 검색창', 'star'),
    D('home', '⏱', '이용 시간 D+', 'PC방 사용 시간', '스킨', 'JS 자동', '「쿄헤이 님과 세이 님의 이용 시간 D+102 · 연장 중♡」 말풍선', 'star'),
    D('home', '📜', '갱신 내역', '', '헤더 스크롤 박스', '직접', '헤더 안 스크롤 박스. 글이 아닌 소식(벌칙 +1 등)도 적을 수 있게', 'star'),
    D('home', '📰', '쿄냐통신 새 소식', '', '홈', '자동 (최신글)', '새로 올라온 글이 저절로 뜨는 목록', 'star'),
    D('home', '📢', '흐르는 띠', '포털 속보 자막', '홈 맨 위', 'JS · OOC', '「속보 ▶ …」 + 최신 글 제목 + 경기 문자중계를 섞어서 흘리기', '', '문자중계는 여기 끼워넣기'),
    D('home', '🔐', '로그인 상자 + 인기 검색어', '옛 포털 왼쪽 위', '홈', '직접', '아이디·비번 칸(장식, 로그인 버튼은 진짜 티스토리 로그인) + 「실시간 인기 검색어 1. 쿄헤이 질투…」'),
    D('home', '📣', '오늘의 알림 (お知らせ)', '', '홈', '직접', '교환일기 현황: 오늘 당번, 썼다/읽었다', 'star'),
    D('home', '🚨', '신고 게시판', '', '홈', '직접', '경고·벌칙 (점수판 + 기록)', 'star'),
    D('home', '📋', '이용 약관', '', '홈', '직접', '교환일기 룰 (제1조 일기는 번갈아 쓴다…)', 'star'),
    D('home', '📺', '광고 배너', '후미코뮤 광고', '홈', '직접', '가짜 광고 2~3개 (블루윙스 팬클럽 모집, 딸기 쇼트케이크 반값…)', 'star', '광고 마음에 듦!!'),
    D('home', '🪟', '팝업 광고', '', '홈', 'JS', '떠 있는 가짜 팝업 「축하합니다! 당첨!」 · ✕ + 오늘 하루 안 보기'),
    D('home', '🔢', '방문자 카운터', '키리반', '홈', '티스토리 기능', '「당신은 000128번째 손님」'),
    D('home', '📅', '달력', '', '홈', '티스토리 기능', '경기 · 데이트 일정'),
    D('home', '🎵', 'BGM', '', '홈', '직접', '「♪ 지금 나오는 노래」'),
    D('home', '🔮', '오늘의 운세', '', '홈', 'JS', '들어올 때마다 바뀌는 쿄헤이 운세', '', '전에 만든 거 있음 → 다시 넣기'),
    D('home', '🔗', '링크 배너 줄', '88×31 버튼', '홈 맨 아래', '직접', '배너 교환 + Copyright 줄 (티스토리에서도 배너 교환 가능)', 'star'),

    // 🧩 서비스
    D('svc', '🧵', '쿄냐 게시판', '2ch 스레드', '카테고리', 'OOC', '글 하나 = 스레드. 친구 댓글도 레스 번호 이어서 (名無しさん@쿄냐통신)'),
    D('svc', '📰', '쿄냐뉴스', '2000년대 포털 뉴스', '카테고리', 'OOC', '인터넷 뉴스 기사 스크랩 모양 (○○일보 제공, 관련 기사…)'),
    D('svc', '📒', '쿄냐수첩', '시스템 수첩', '카테고리 + 모아보기 페이지', 'OOC', '관찰일지 · 쿄헤이의 스케줄러 · 가계부를 한 화면에 모아 보기'),
    D('svc', '🩺', '건강수첩', '병원 진료 수첩', '페이지', '자동 (관찰일지에서 추출)', '관찰일지의 진단서(카르테)만 모은 페이지'),
    D('svc', '⚾', '선수 명감', 'NPB 공식 선수 페이지', '페이지', '직접', '블루윙스 선수 전체 프로필 + 관계도'),
    D('svc', '📔', '세이의 일기', '옛날 블로그 서비스', '카테고리', 'OOC', '블로그 속 블로그. 목록 없이 일기장처럼 바로 펼쳐짐. 「쿄헤이로 추정되는 누군가」의 댓글까지'),
    D('svc', '💬', '메신저 · 메일함', 'MSN 메신저 · 휴대폰 메일함', '카테고리', 'OOC', '쿄헤이가 보낸 메일, 임시보관함, 메신저 대화창'),
    D('svc', '📧', '메일 매거진', '주간 메일 뉴스레터', '카테고리', 'OOC', '쿄헤이 발행 「주간 세이 통신」', '', '들어갈 것 후보: 이번 주 세이 근황 · 이번 주 명대사 · 독자 Q&A · 연재 칼럼 「세이 관찰 꿀팁」 · 경기 일정 · 가짜 쿠폰 · 편집 후기 · 다음 호 예고'),
    D('svc', '📖', '쿄냐위키', '옛 위키 사이트', '페이지 · 카테고리', '직접 + 자동', '세이어 사전, 명대사, 용어집. 관찰일지 사전 칸 자동으로 모으기도', '', '좋아!!'),
    D('svc', '🏆', '랭킹 사이트', '옛 랭킹 사이트', '카테고리', 'OOC · 직접', '아무 주제로나 랭킹 (명대사 랭킹, 벌칙 랭킹…)'),
    D('svc', '📸', '사진 갤러리', '프리쿠라 수첩', '카테고리', '사진', '', '', '올릴 사진은 아직 없음 ㅋㅋ'),
    D('svc', '🛒', '쿄냐 쇼핑', '가짜 쇼핑몰', '카테고리', 'OOC', '세이 장바구니, 커플 굿즈, 블루윙스 굿즈 · 가계부와 연결', 'later', '이미지가 많이 필요해서 나중에'),
    D('svc', '🎮', '놀이터', '2000년대 플래시 게임 사이트', '페이지', '직접 (깃허브에 만들어 붙이기)', '다마고치 키우기, 선택지 게임, 보드게임'),
    D('svc', '🗂', '로그 보관소', '', '카테고리', '작업대 백업', '로그 전체 백업. 긴 로그 읽기 편하게'),
    D('svc', '📌', '즐겨찾기 로그', '메모 게시판', '카테고리', '작업대 백업', '자주 꺼내 보고 싶은 로그만 모음'),
    D('svc', '📮', '고객센터', '포털 1:1 문의 · Q&A', '방명록', '방문자', '방명록을 문의 게시판처럼. 친구들이 글 남기는 곳'),
    D('svc', '⚾', '경기 문자중계', '야구 포털 텍스트 중계', '흐르는 띠 · 카테고리?', 'OOC', '「7회말 쿄헤이 타석… 관중석 세이를 보고 웃음」', '', '흐르는 띠에 끼워넣어도 될 듯'),
    D('svc', '📻', '쿄냐 FM', '라디오 사연 코너', '카테고리', 'OOC', '세이·선수들이 보낸 사연을 쿄헤이가 읽음'),
    D('svc', '🗓', '연표', '', '페이지', '직접', '2014년부터 사건 타임라인'),

    // 🏪 분점
    D('branch', '🏪', '쿄냐통신 분점', '', '러브로그', '', '교환일기 OOC 등 특정 로그. 같은 로고·색으로 「쿄냐통신 ○○지점」 · 본점과 배너로 연결', 'later'),
    D('branch', '🗳', '오늘의 투표', '', '러브로그 발도장 위젯', '방문자', '「가장 멋진 동물은? ○ 강아지 ○ 고양이 ○ 공룡」 진짜로 표가 쌓임 · 본점 광고에 「투표는 분점에서!」', 'later'),

    // 🛠 만들 때 메모
    D('tech', '🧭', '포털 + 서비스 구조', '', '전체', '', '홈 = 포털 첫 화면, 카테고리 하나 = 쿄냐통신 안의 서비스 하나 (서비스마다 생김새가 다름)', 'star'),
    D('tech', '📱', '반응형', '', '전체', '', 'PC · 폰 둘 다 처음부터', 'star'),
    D('tech', '🔁', 'OOC → 일지 변환기 틀', '', '작업대', '', '뉴스·2ch·가계부·스케줄러 … OOC마다 journals/ 틀을 하나씩 추가해서 같은 흐름으로', 'star'),
    D('tech', '🔒', '보호글은 모아보기 못 함', '', '', '', '비밀번호 건 글은 모아보기 페이지가 내용을 못 읽음 → 모을 글은 공개로'),
    D('tech', '🧱', '스킨 나눠 만들기', '', '스킨', '', '포털 홈 + 공통 틀(메뉴·헤더·글 화면) 먼저 → 서비스는 하나씩 붙이기. 서비스별 CSS·JS는 따로 파일로'),
  ];

  /* ---------- 저장 ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fresh = () => ({ v: 1, items: DEFAULT_ITEMS.map(x => ({ ...x, id: uid() })), notes: '', updated: Date.now() });
  let data = store.json(KEY, null) || fresh();
  let filter = store.get('sketch.filter', 'all');
  let folded = store.json('sketch.fold', {});
  let editing = null;
  let saveTimer;
  const save = () => {
    data.updated = Date.now();
    store.setJson(KEY, data);
    $('skSaved').textContent = '저장됨 ' + new Date().toTimeString().slice(0, 5) + ' ♡';
  };
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); };
  const $ = id => document.getElementById(id);

  /* ---------- 그리기 ---------- */
  function renderSum() {
    const c = { star: 0, later: 0, drop: 0, '': 0 };
    data.items.forEach(x => c[x.pri || '']++);
    const done = data.items.filter(x => x.status === 3).length;
    $('skSum').innerHTML =
      `<span>전체<b>${data.items.length}</b></span><span>⭐ 먼저<b>${c.star}</b></span><span>🕐 나중<b>${c.later}</b></span>` +
      `<span>❔ 미정<b>${c['']}</b></span><span>✕ 빼기<b>${c.drop}</b></span><span>✅ 완성<b>${done}</b></span>`;
    const F = [['all', '전체'], ['star', '⭐ 먼저'], ['later', '🕐 나중'], ['none', '❔ 미정'], ['drop', '✕ 빼기']];
    $('skFilter').innerHTML = F.map(([v, l]) => `<button data-f="${v}" class="${filter === v ? 'on' : ''}">${l}</button>`).join('');
  }

  function match(x) {
    if (filter === 'none' && x.pri) return false;
    if (!['all', 'none'].includes(filter) && x.pri !== filter) return false;
    const q = $('skSearch').value.trim().toLowerCase();
    if (q && ![x.name, x.like, x.where, x.src, x.desc, x.memo].join(' ').toLowerCase().includes(q)) return false;
    return true;
  }

  function card(x) {
    if (editing === x.id) return editCard(x);
    const tags = [x.like && `<i>${esc(x.like)}</i>`, x.where && `<i class="w">📍 ${esc(x.where)}</i>`, x.src && `<i class="s">✎ ${esc(x.src)}</i>`].filter(Boolean).join('');
    return `<div class="sk-card" data-id="${x.id}" data-pri="${x.pri || ''}">
      <div class="sk-head"><span class="sk-ic">${esc(x.icon || '💡')}</span><span class="sk-name">${esc(x.name)}</span>
        <button class="sk-edit" data-a="edit" title="고치기">✎</button><button class="sk-del" data-a="del" title="지우기">🗑</button></div>
      ${tags ? `<div class="sk-tags">${tags}</div>` : ''}
      ${x.desc ? `<div class="sk-desc">${esc(x.desc)}</div>` : ''}
      <div class="sk-ctl">
        <div class="sk-pri">${PRI.map(p => `<button data-a="pri" data-v="${p.v}" class="${x.pri === p.v ? 'on' : ''}">${p.label}</button>`).join('')}</div>
        <select class="sk-st" data-a="st">${STATUS.map((s, i) => `<option value="${i}"${x.status === i ? ' selected' : ''}>${s}</option>`).join('')}</select>
      </div>
      <textarea class="sk-memo" data-a="memo" rows="1" placeholder="메모…">${esc(x.memo || '')}</textarea>
    </div>`;
  }

  function editCard(x) {
    const f = (k, ph) => `<input class="tx" data-k="${k}" value="${esc(x[k] || '')}" placeholder="${ph}">`;
    return `<div class="sk-card" data-id="${x.id}"><div class="sk-form">
      <span>아이콘</span>${f('icon', '💡')}
      <span>이름</span>${f('name', '아이디어 이름')}
      <span>묶음</span><select class="tx" data-k="group">${GROUPS.map(g => `<option value="${g.id}"${x.group === g.id ? ' selected' : ''}>${g.name}</option>`).join('')}</select>
      <span>흉내</span>${f('like', '어떤 사이트 느낌?')}
      <span>어디에</span>${f('where', '홈 · 카테고리 · 페이지…')}
      <span>출처</span>${f('src', 'OOC · 직접 · 자동…')}
      <span>설명</span><textarea class="tx" data-k="desc" placeholder="자세히">${esc(x.desc || '')}</textarea>
      <div class="full"><button class="btn mini white" data-a="cancel">취소</button><button class="btn mini pink" data-a="ok">저장 ♡</button></div>
    </div></div>`;
  }

  function render() {
    renderSum();
    $('skGroups').innerHTML = GROUPS.map(g => {
      const all = data.items.filter(x => x.group === g.id);
      const list = all.filter(x => match(x) || editing === x.id);
      return `<section class="win sk-group${folded[g.id] ? ' fold' : ''}" data-g="${g.id}">
        <div class="win-t ${g.id === 'home' || g.id === 'branch' ? 'pink' : ''}"><span>${g.name}<small>${g.sub} · ${all.length}개</small></span><span>${folded[g.id] ? '▸' : '▾'}</span></div>
        <div class="win-b">${list.length ? `<div class="sk-grid">${list.map(card).join('')}</div>` : '<div class="sk-empty">여기에 맞는 카드가 없어요</div>'}</div>
      </section>`;
    }).join('');
    document.querySelectorAll('.sk-memo').forEach(grow);
  }
  const grow = t => { t.style.height = 'auto'; t.style.height = Math.max(30, t.scrollHeight + 2) + 'px'; };
  const item = el => data.items.find(x => x.id === el.closest('.sk-card').dataset.id);

  /* ---------- 동작 ---------- */
  $('skFilter').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    filter = b.dataset.f; store.set('sketch.filter', filter); render();
  });
  $('skSearch').addEventListener('input', () => render());

  $('skGroups').addEventListener('click', async e => {
    const head = e.target.closest('.sk-group > .win-t');
    if (head) { const g = head.parentElement.dataset.g; folded[g] = !folded[g]; store.setJson('sketch.fold', folded); render(); return; }
    const b = e.target.closest('[data-a]'); if (!b || b.tagName === 'TEXTAREA' || b.tagName === 'SELECT') return;
    const x = item(b);
    if (b.dataset.a === 'pri') { x.pri = x.pri === b.dataset.v ? '' : b.dataset.v; save(); render(); }
    else if (b.dataset.a === 'edit') { editing = x.id; render(); }
    else if (b.dataset.a === 'cancel') { if (x._new) data.items = data.items.filter(y => y !== x); editing = null; render(); }
    else if (b.dataset.a === 'ok') {
      b.closest('.sk-card').querySelectorAll('[data-k]').forEach(f => { x[f.dataset.k] = f.value.trim(); });
      if (!x.name) return toast('이름을 적어 주세요');
      delete x._new; editing = null; save(); render();
    }
    else if (b.dataset.a === 'del') {
      if (await Modal.confirm(`「${esc(x.name)}」 카드를 지울까요?<br><small>메모도 같이 지워져요</small>`, { ok: '지우기' })) {
        data.items = data.items.filter(y => y !== x); save(); render();
      }
    }
  });
  $('skGroups').addEventListener('input', e => {
    if (e.target.dataset.a === 'memo') { item(e.target).memo = e.target.value; grow(e.target); saveSoon(); }
  });
  $('skGroups').addEventListener('change', e => {
    if (e.target.dataset.a === 'st') { item(e.target).status = +e.target.value; save(); renderSum(); }
  });

  $('skAdd').addEventListener('click', () => {
    const g = GROUPS.find(g => !folded[g.id]) || GROUPS[0];
    const x = { id: uid(), group: g.id, icon: '💡', name: '', like: '', where: '', src: '', desc: '', pri: '', memo: '', status: 0, _new: true };
    data.items.unshift(x); editing = x.id; filter = 'all'; $('skSearch').value = '';
    folded[g.id] = false; render();
    const inp = document.querySelector(`.sk-card[data-id="${x.id}"] [data-k="name"]`);
    if (inp) { inp.scrollIntoView({ block: 'center' }); inp.focus(); }
  });

  $('skFoldAll').addEventListener('click', () => {
    const anyOpen = GROUPS.some(g => !folded[g.id]);
    GROUPS.forEach(g => folded[g.id] = anyOpen); store.setJson('sketch.fold', folded); render();
  });

  $('skNotes').value = data.notes || '';
  $('skNotes').addEventListener('input', () => { data.notes = $('skNotes').value; saveSoon(); });

  /* 파일로 내보내기 · 가져오기 */
  $('skExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `sketchbook-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('skImport').addEventListener('click', () => $('skFile').click());
  $('skFile').addEventListener('change', async () => {
    const f = $('skFile').files[0]; $('skFile').value = '';
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || !Array.isArray(d.items)) throw new Error('스케치북 파일이 아니에요');
      if (!(await Modal.confirm('지금 스케치북을 이 파일로 바꿀까요?', { ok: '바꾸기' }))) return;
      data = d; $('skNotes').value = data.notes || ''; save(); render(); toast('가져왔어요 ♡');
    } catch (e) { Modal.alert('⚠️ 못 읽었어요<br><small>' + esc(e.message) + '</small>'); }
  });

  /* ☁ 비공개 보관함 (sketch.json) */
  const needVault = async () => {
    if (Vault.configured()) return true;
    if (await Modal.confirm('깃허브 보관함이 아직 연결되지 않았어요.<br>보관함 페이지에서 연결할까요?', { ok: '연결하러 가기' })) location.href = 'vault.html';
    return false;
  };
  $('skPush').addEventListener('click', async () => {
    if (!(await needVault())) return;
    const b = $('skPush'); b.disabled = true;
    try {
      const cur = await Vault.getJson('sketch.json');
      if (cur && cur.data && cur.data.updated > data.updated &&
          !(await Modal.confirm('보관함 쪽이 더 최근에 저장됐어요.<br>그래도 지금 것으로 덮어쓸까요?', { ok: '덮어쓰기' }))) { b.disabled = false; return; }
      await Vault.putJson('sketch.json', data, cur && cur.sha, 'sketchbook');
      toast('☁ 보관함에 저장했어요 ♡');
    } catch (e) { Modal.alert('⚠️ 저장 못 했어요<br><small>' + esc(e.message) + '</small>'); }
    b.disabled = false;
  });
  $('skPull').addEventListener('click', async () => {
    if (!(await needVault())) return;
    try {
      const cur = await Vault.getJson('sketch.json');
      if (!cur) return Modal.alert('보관함에 아직 저장된 스케치북이 없어요');
      const when = new Date(cur.data.updated || 0).toLocaleString('ko-KR');
      if (!(await Modal.confirm(`보관함 스케치북(${esc(when)})으로 바꿀까요?<br><small>지금 이 브라우저의 내용은 덮어써져요</small>`, { ok: '불러오기' }))) return;
      data = cur.data; $('skNotes').value = data.notes || ''; save(); render(); toast('☁ 불러왔어요 ♡');
    } catch (e) { Modal.alert('⚠️ 불러오지 못했어요<br><small>' + esc(e.message) + '</small>'); }
  });

  render();
})();
