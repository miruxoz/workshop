/* =========================================================
   🎀 크랙 로그 백업 v4
   ---------------------------------------------------------
   크랙 채팅방에서 F12 → 콘솔에 붙여넣고 Enter!
   지난 백업 이후의 AI 답변만 시간 순서대로 복사돼요.

   ✨ 복사 형식 ('답변 수정'을 눌렀을 때와 같아요)
     · 지문    → *지문*
     · 속마음  → `속마음`
     · 사진    → ![캐릭터명::감정](사진 주소)
     · 상태창  → ``` 코드블록 ```

   ✨ 화면 오른쪽 아래에 조작 패널이 떠요
     · ⏸ 일시정지 / ▶ 계속 / ✋ 여기까지 복사
     · 📋 로그 복사 (자동 복사가 안 됐을 때)
     · 📌 다음 STOP 문장 복사

   ✨ v4
     · 메시지마다 경계 표시 줄(♡━━━━ AI ━━━━♡ / ♡━━━━ ME ━━━━♡)이 붙어요
       → 사이트가 이걸 보고 본편·관찰일지·OOC·요약본을 자동으로 나눠요 (표시 줄은 사이트에서 지워져요)
     · 내 메시지도 같이 복사해요 (OOC 요청문 보관용 — 본편용은 사이트가 알아서 버려요)
     · NSFW 사진은 아예 빼고 복사해요 (아래 NSFW_WORDS)
   ========================================================= */
(async () => {
  // ▼ 지난 백업 때 받은 '다음 STOP 문장'. 처음부터 전부 백업하려면 "" 로 비워두기
  const STOP = "";
  // ▼ 맨 위에서 이 시간(초) 동안 새 메시지가 안 뜨면 '맨 처음'으로 판단. 중간에 멈추면 늘려 주세요
  const MAX_WAIT = 20;
  // ▼ 사진 이름(캐릭터::감정)에 이 단어가 들어가면 그 사진은 빼고 복사해요. 본문 글자는 안 건드려요
  const NSFW_WORDS = ['성기 삽입 정상위', '성기 삽입 후배위', '유혹'];

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* =========================================================
     🎀 조작 패널 만들기
     ========================================================= */
  document.getElementById('crack-backup-panel')?.remove();   // 전에 띄운 패널이 있으면 지우기

  // 폰트는 페이지에 등록 (패널 안에서 쓰려고)
  if (!document.getElementById('crack-backup-fonts')) {
    const f = document.createElement('style');
    f.id = 'crack-backup-fonts';
    f.textContent = `
      @font-face { font-family: "Mona12"; src: url("https://cdn.jsdelivr.net/gh/MonadABXY/mona-font@main/web/Mona12.woff2") format("woff2"); }
      @font-face { font-family: "ThinMulmaru"; src: url('https://cdn.jsdelivr.net/gh/Project-Noonnu/2607161321@thinmulmaru/thinmulmaru/ThinMulmaru.woff2') format('woff2'); font-weight: 400; font-display: swap; }`;
    document.head.appendChild(f);
  }

  const host = document.createElement('div');
  host.id = 'crack-backup-panel';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });   // 크랙 화면 디자인과 섞이지 않게 분리
  root.innerHTML = `
  <style>
    /* ===== 색·폰트 (여기만 고치면 전체가 바뀌어요) ===== */
    :host { --ink: #333; --line: #333; --pink: #e07fa3; --pink-bg: #fbeef5; --blue: #5b9bd0; --blue-bg: #d9e9f5; --gray: #999; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .text-emoji { display: inline-block !important; float: none !important; clear: none !important; height: 1.2em; width: auto; vertical-align: middle; margin: 0 2px; }

    .pn { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 230px;
          font-family: 'ThinMulmaru', sans-serif; font-size: 12px; line-height: 1.6; color: var(--ink);
          background: #fff; border: 3px double var(--line); box-shadow: 4px 4px 0 var(--blue-bg); text-align: center; }
    .tt { display: flex; align-items: center; justify-content: space-between; padding: 3px 4px 3px 8px;
          font-family: 'Mona12', sans-serif; font-size: 12px; letter-spacing: .1em;
          background: repeating-linear-gradient(90deg, var(--pink-bg) 0 6px, #fff 6px 12px);
          border-bottom: 3px double var(--line);
          text-shadow: 1px 0 #fff,-1px 0 #fff,0 1px #fff,0 -1px #fff,1px 1px #fff,-1px -1px #fff,1px -1px #fff,-1px 1px #fff; }
    .tt b { font-weight: 400; }
    .x { font: inherit; font-size: 10px; width: 18px; height: 18px; cursor: pointer; background: #fff; color: var(--ink);
         border: 1px solid var(--line); box-shadow: inset -2px -2px 0 #ccc, inset 2px 2px 0 #fff; }
    .bd { padding: 8px; display: flex; flex-direction: column; gap: 6px; }

    .st { display: flex; align-items: center; justify-content: center; gap: 6px; }
    .dot { width: 7px; height: 7px; background: var(--pink); animation: blink 1s steps(2) infinite; }
    .st.paused .dot { background: var(--gray); animation: none; }
    .st.done .dot { background: var(--blue); animation: none; }
    @keyframes blink { 50% { opacity: .2; } }
    .cnt { font-family: 'Mona12', sans-serif; font-size: 11px; color: var(--gray); }
    .cnt b { font-weight: 400; font-size: 16px; color: var(--pink); margin: 0 2px; }

    .row { display: flex; gap: 6px; }
    button.btn { flex: 1; font: inherit; font-size: 12px; padding: 4px 2px; cursor: pointer; color: var(--ink);
                 background: var(--blue-bg); border: 1px solid var(--line);
                 box-shadow: inset -2px -2px 0 rgba(0,0,0,.15), inset 2px 2px 0 #fff; }
    button.btn:active { box-shadow: inset 2px 2px 0 rgba(0,0,0,.15), inset -2px -2px 0 #fff; transform: translateY(1px); }
    button.pink { background: var(--pink-bg); }
    button.big { font-size: 13px; padding: 6px 2px; }
    button.wiggle { animation: wiggle .6s steps(2) infinite; }
    @keyframes wiggle { 50% { transform: translateY(-2px); } }

    .res { font-size: 11px; padding: 4px; background: var(--pink-bg); border: 1px dotted var(--line); }
    .stopbox { text-align: left; border: 1px solid var(--line); }
    .stopbox small { display: block; font-family: 'Mona12', sans-serif; font-size: 10px; padding: 0 6px; background: var(--blue-bg); border-bottom: 1px solid var(--line); }
    .stopbox code { display: block; font-family: inherit; font-size: 11px; padding: 3px 6px; word-break: break-all; }
    [hidden] { display: none !important; }
  </style>

  <div class="pn">
    <div class="tt"><b>♡ ろぐ ばっくあっぷ ♡</b><button class="x" id="close" title="닫기">✕</button></div>
    <div class="bd">
      <div class="st" id="st"><span class="dot"></span><span id="msg">위로 불러오는 중…</span></div>
      <div class="cnt">메시지<b id="n">0</b>개</div>

      <div class="row" id="run">
        <button class="btn" id="pause">⏸ 일시정지</button>
        <button class="btn pink" id="stop">✋ 여기까지</button>
      </div>

      <div id="done" hidden>
        <div class="bd" style="padding:0">
          <div class="res" id="res"></div>
          <button class="btn big pink" id="copyLog">📋 로그 복사</button>
          <div class="stopbox"><small>📌 다음 STOP 문장</small><code id="next"></code></div>
          <button class="btn" id="copyStop">📌 STOP 문장 복사</button>
        </div>
      </div>
    </div>
  </div>`;

  const $ = id => root.getElementById(id);
  const ui = {
    status(text, mode) { $('msg').textContent = text; $('st').className = 'st ' + (mode || ''); },
    count(n) { $('n').textContent = n; }
  };

  // 버튼 눌러서 복사 (브라우저가 막지 않는 방식)
  const clip = async text => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  };
  const flash = (btn, ok) => {
    const old = btn.dataset.label || (btn.dataset.label = btn.textContent);
    btn.classList.remove('wiggle');
    btn.textContent = ok ? '✨ 복사 완료!' : '⚠️ 복사 실패…';
    setTimeout(() => btn.textContent = old, 1500);
  };

  // 조작 상태 (콘솔에서 __stop = true 로 멈추는 것도 계속 가능)
  const ctl = { pause: false, stop: false };
  window.__stop = false;
  $('close').onclick = () => { ctl.stop = true; host.remove(); };
  $('stop').onclick = () => { ctl.stop = true; };
  $('pause').onclick = () => {
    ctl.pause = !ctl.pause;
    $('pause').textContent = ctl.pause ? '▶ 계속' : '⏸ 일시정지';
    ui.status(ctl.pause ? '일시정지 중' : '위로 불러오는 중…', ctl.pause ? 'paused' : '');
  };

  try {
    /* =========================================================
       1. 채팅 스크롤 박스 찾기
       ========================================================= */
    const box = [...document.querySelectorAll('*')]
      .filter(el => el.scrollHeight > el.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || document.scrollingElement;

    /* =========================================================
       2. 위로 자동 스크롤
       크랙은 맨 위에 닿으면 이전 대화를 조금씩 늦게 불러와요.
       맨 위에서 살짝 내렸다 올리기를 반복하며 기다리고,
       MAX_WAIT초 동안 새 메시지가 안 뜨면 '맨 처음'으로 판단해요.
       ========================================================= */
    const count = () => document.querySelectorAll('[data-message-group-id]').length;
    let lastCount = count(), idleSince = Date.now();
    ui.count(lastCount);

    while (true) {
      if (STOP && box.innerText.includes(STOP)) { ui.status('멈출 문장 발견!'); break; }
      if (ctl.stop || window.__stop) { ui.status('여기까지 복사할게요'); break; }

      // 일시정지 중엔 가만히 기다리기 (기다린 시간은 안 셈)
      if (ctl.pause) { await sleep(200); idleSince = Date.now(); continue; }

      const atTop = box.scrollTop <= 5;
      if (atTop) {
        box.scrollTop = 300;     // 맨 위: 살짝 내렸다가
        await sleep(150);
        box.scrollTop = 0;       // 다시 올려서 '이전 대화 불러오기' 깨우기
      } else {
        box.scrollBy(0, -3000);
      }
      window.scrollBy(0, -3000);
      await sleep(700);

      const c = count();
      if (c > lastCount) {
        lastCount = c; idleSince = Date.now(); ui.count(c);
        ui.status('위로 불러오는 중…');
      } else if (!atTop) {
        idleSince = Date.now();
      } else {
        const left = MAX_WAIT - Math.floor((Date.now() - idleSince) / 1000);
        if (left <= 0) { ui.status('맨 처음까지 불러왔어요'); break; }
        if (left <= MAX_WAIT - 3) ui.status(`더 불러올 게 있나 확인 중… ${left}`);
      }
    }
    $('run').hidden = true;

    /* =========================================================
       3. 화면(HTML) → '답변 수정' 형식 글자로 바꾸는 도구들
       ========================================================= */
    const SKIP = 'svg, button, style, script, noscript, [data-search-ignore]';   // 통째로 건너뛸 것
    const BLOCK = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'FIGURE', 'UL', 'OL', 'TABLE', 'TR']);   // 한 덩어리로 볼 것

    // *지문* 처럼 기호로 감싸기 (앞뒤 공백은 기호 바깥으로)
    const wrap = (s, mark) => {
      const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return m[2] ? m[1] + mark + m[2] + mark + m[3] : s;
    };

    // 사진의 진짜 주소 찾기
    const imgSrc = img => {
      let src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) {
        src = img.dataset.src || (img.getAttribute('srcset') || '').split(/\s+/)[0] || img.currentSrc || src;
      }
      try {
        const u = new URL(src, location.href);
        const inner = u.searchParams.get('url');   // /_next/image?url=진짜주소 형태
        return (u.pathname.includes('_next/image') && inner) ? new URL(inner, location.href).href : u.href;
      } catch (e) { return src; }
    };

    // 상태창 코드블록 글자를 줄 단위로
    const codeText = pre => {
      const lines = [...pre.querySelectorAll('span.line')];
      return (lines.length ? lines.map(l => l.textContent).join('\n') : pre.textContent).replace(/\n+$/, '');
    };

    let skippedImg = 0;
    // 요소 하나를 글자로 바꾸기 (안쪽 요소들도 차례로)
    const conv = node => {
      if (node.nodeType === 3) return node.nodeValue;
      if (node.nodeType !== 1 || node.matches(SKIP)) return '';
      const tag = node.tagName;
      const kids = () => [...node.childNodes].map(conv).join('');

      switch (tag) {
        case 'BR':     return '\n';
        case 'IMG': {
          const alt = node.alt || '';
          if (NSFW_WORDS.some(w => alt.includes(w))) { skippedImg++; return ''; }   // NSFW 사진은 빼기
          return `\n\n![${alt}](${imgSrc(node)})\n\n`;
        }
        case 'PRE':    return '\n\n```\n' + codeText(node) + '\n```\n\n';
        case 'CODE':   return wrap(node.textContent, '`');   // 속마음
        case 'EM':
        case 'I':      return wrap(kids(), '*');             // 지문
        case 'STRONG':
        case 'B':      return wrap(kids(), '**');
        case 'DEL':
        case 'S':      return wrap(kids(), '~~');
        case 'HR':     return '\n\n---\n\n';
        case 'LI': {
          const ol = node.parentElement && node.parentElement.tagName === 'OL';
          const n = [...node.parentElement.children].indexOf(node) + 1;
          return '\n' + (ol ? n + '. ' : '- ') + kids().trim() + '\n';
        }
        case 'BLOCKQUOTE':
          return '\n\n' + kids().trim().split('\n').map(l => '> ' + l).join('\n') + '\n\n';
      }
      if (/^H[1-6]$/.test(tag)) return '\n\n' + '#'.repeat(+tag[1]) + ' ' + kids().trim() + '\n\n';

      const s = kids();
      return BLOCK.has(tag) ? '\n\n' + s + '\n\n' : s;
    };

    // 빈 줄·공백 정리 (상태창 코드블록 안쪽은 그대로)
    const tidy = s => s.split(/(```[\s\S]*?```)/).map((part, i) => i % 2 ? part : part
        .replace(/[ \t]+$/gm, '')
        .replace(/^[ \t]+/gm, '')
      ).join('')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    /* =========================================================
       4. 메시지 모으기 (화면 위→아래 순서)
       plain: STOP 문장 찾기용 / md: 실제로 복사할 내용
       ========================================================= */
    ui.status('정리하는 중…');
    await sleep(50);
    const hidden = [...document.querySelectorAll('[data-search-ignore]')];
    hidden.forEach(e => e.style.display = 'none');
    let msgs = [...document.querySelectorAll('[data-message-group-id]')]
      .map(g => {
        const body = g.querySelector('.wrtn-markdown') || g;
        return {
          top: g.getBoundingClientRect().top,
          me: !!g.querySelector('.border-y'),
          plain: body.innerText.replace(/\n{3,}/g, '\n\n').trim(),
          md: tidy(conv(body))
        };
      })
      .filter(m => m.plain || m.md)
      .sort((a, b) => a.top - b.top);
    hidden.forEach(e => e.style.display = '');

    if (!msgs.length) throw new Error('메시지를 못 찾았어요. 채팅방 화면이 맞나요?');

    /* =========================================================
       5. 멈출 문장 이후만 남기기
       ========================================================= */
    let rest = msgs, warn = '';
    if (STOP) {
      const i = msgs.findLastIndex(m => m.plain.includes(STOP));
      if (i >= 0) rest = msgs.slice(i + 1);
      else warn = '⚠️ 멈출 문장을 못 찾아서 불러온 전체를 담았어요<br>';
    }
    const out = rest.filter(m => m.md);
    const aiCount = out.filter(m => !m.me).length;

    /* =========================================================
       6. 다음 백업 때 쓸 STOP 문장 (내 메시지 포함, 가장 마지막 메시지 기준)
       ========================================================= */
    const last = msgs[msgs.length - 1].plain;
    const lines = last.split('\n').filter(l => l.trim().length >= 10);
    const next = (lines[lines.length - 1] || last).trim().slice(0, 30);
    window.__next = next;
    $('next').textContent = next;
    $('copyStop').onclick = async e => flash(e.currentTarget, await clip(next));
    console.log('📌 다음 백업 때 STOP에 넣을 문장:', next);

    $('done').hidden = false;

    if (!aiCount) {
      ui.status('새로 백업할 내용이 없어요', 'done');
      $('res').innerHTML = warn + '새 메시지가 없어요 (｡•́︿•̀｡)';
      $('copyLog').hidden = true;
      return;
    }

    /* =========================================================
       7. 복사
       ========================================================= */
    // 메시지마다 경계 표시 줄 붙이기
    const text = out.map(m => `♡━━━━ ${m.me ? 'ME' : 'AI'} ━━━━♡\n${m.md}`).join('\n\n');
    window.__log = text;
    const imgCount = (text.match(/!\[[^\]]*\]\(/g) || []).length;
    const lineCount = text.split('\n').length;
    $('res').innerHTML = `${warn}AI 메시지 <b>${aiCount}</b>개 · 사진 <b>${imgCount}</b>장 · <b>${lineCount}</b>줄` +
      (skippedImg ? `<br><small>NSFW 사진 ${skippedImg}장은 뺐어요</small>` : '');
    $('copyLog').onclick = async e => flash(e.currentTarget, await clip(text));

    let auto = false;
    try { copy(text); auto = true; } catch (e) {}
    if (auto) {
      ui.status('복사 완료! ♪', 'done');
      console.log(`📋 AI 메시지 ${aiCount}개 (사진 ${imgCount}장) 복사 완료! 사이트 작업대에 붙여넣으면 돼요 ♪`);
    } else {
      ui.status('📋 버튼을 눌러 복사해 주세요', 'done');
      $('copyLog').textContent = '👆 눌러서 로그 복사';
      $('copyLog').dataset.label = '📋 로그 복사';
      $('copyLog').classList.add('wiggle');
    }
  } catch (err) {
    console.error(err);
    ui.status('⚠️ ' + err.message, 'paused');
    $('run').hidden = true;
  }
})();
