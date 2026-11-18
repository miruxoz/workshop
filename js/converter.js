/* =========================================================
   🎀 변환기 — 백업 명령어로 복사한 로그 → 티스토리용 HTML
   ---------------------------------------------------------
   입력 형식 ('답변 수정' 형식 = 백업 명령어 v2·v3 결과)
     [ T66 | 날짜 | 시간 | 날씨 | 장소 | ♀️ | 🔵 ]   ← 헤더
     ``` 상태창 ```                                   ← 코드블록
     ![레이::슬픔](주소)                               ← 사진
     *지문*                                           ← 지문
     `속마음`                                         ← 속마음
     이쿠토｜「일본어」 + 줄바꿈 + (번역)                ← 대사

   사용법:  LogConverter.convert(텍스트, { title: '에피소드 제목' })
           → { html, stats }
   ========================================================= */
(function () {

  /* ---------- 자잘한 도구 ---------- */

  // HTML 특수문자 바꾸기 (로그에 < > 가 있어도 깨지지 않게)
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // 한 줄 안의 꾸밈 기호 처리
  //   **굵게** → <b>   `속마음` → 작은 글씨   *지문* 기호는 지우기 (지문 색은 줄 단위로 입힘)
  const inline = s => esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<span class="cl-thought">$1</span>')
    .replace(/\*/g, '');

  const IMG_RE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
  // 사진 이름(alt)에 이 단어가 있으면 사진을 빼요 (본문 글자는 안 건드려요)
  const NSFW_WORDS = ['성기 삽입 정상위', '성기 삽입 후배위', '유혹'];
  // 백업 명령어 v4 의 메시지 경계 표시 줄 (결과물에선 지움)
  const MARK_RE = /^♡━+\s*(AI|ME)\s*━+♡$/;
  // 헤더: [ ... | ... | ... ] 처럼 대괄호 안에 | 가 2개 이상
  const HEADER_RE = /^\[[^\]]*\|[^\]]*\|[^\]]*\]$/;

  /* =========================================================
     1. 글을 조각(토큰)으로 나누기
     header: 헤더 한 줄 / fence: ``` 코드블록 / para: 빈 줄로 나뉜 문단
     ========================================================= */
  function tokenize(text) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const tokens = [];
    let para = [];
    const flush = () => { if (para.length) tokens.push({ type: 'para', lines: para }); para = []; };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('```')) {                 // 코드블록 시작
        flush();
        const label = line.slice(3).trim();         // ```♡ レポート ♡ 같은 라벨 (버림)
        const body = [];
        for (i++; i < lines.length && !lines[i].trim().startsWith('```'); i++) body.push(lines[i]);
        tokens.push({ type: 'fence', label, lines: body });
        continue;
      }
      if (MARK_RE.test(line)) { flush(); continue; }
      if (HEADER_RE.test(line)) { flush(); tokens.push({ type: 'header', line }); continue; }
      if (!line) { flush(); continue; }
      para.push(line);
    }
    flush();
    return tokens;
  }

  /* =========================================================
     2. 조각들을 '세트'(상태창 1개 + 본문)로 묶기
     ========================================================= */
  function group(tokens) {
    const sets = [];
    let cur = null;
    const fresh = () => (cur = { header: null, fence: null, body: [] }, sets.push(cur), cur);

    tokens.forEach(t => {
      if (t.type === 'header') { fresh().header = t.line; return; }
      if (t.type === 'fence') {
        // 헤더 바로 뒤의 코드블록 = 상태창 / 그 밖엔 새 세트의 상태창으로
        if (!cur || cur.fence || cur.body.length) fresh();
        cur.fence = t.lines;
        return;
      }
      if (!cur) fresh();
      cur.body.push(t.lines);
    });
    return sets;
  }

  /* =========================================================
     3. 상태창 — ① 글자 → 정보(data)로 정리  ② 정보 → HTML
        ② 는 '틀 파일'(templates/*.html)이 골라져 있으면 그걸로, 아니면 기본 디자인으로
     ========================================================= */
  function parseHeader(line) {
    const parts = line.replace(/^\[|\]$/g, '').split('|').map(p => p.trim());
    const h = { turn: '', date: '', time: '', weather: '', location: '' };
    if (/^T\d+/i.test(parts[0] || '')) h.turn = parts.shift();
    // 순서: 날짜 | 시간 | 날씨 | 장소  — 장소 뒤의 칸(♀️ | 🔵 등)은 전부 버림
    [h.date, h.time, h.weather, h.location] = [parts[0] || '', parts[1] || '', parts[2] || '', parts[3] || ''];
    h.date = h.date.replace(/\s*\(/, ' (');        // 2014.02.03(월) → 2014.02.03 (월)
    return h;
  }

  function parseStatus(lines) {
    const s = { chips: [], members: [], mission: '', tmi: '', talk: null, notes: [] };
    lines.map(l => l.trim()).filter(Boolean).forEach(line => {
      if (/^[─━—–-]+$/.test(line)) return;                       // 구분선
      if (/^♡\s*レポート\s*♡$/.test(line)) return;               // 라벨이 안에 들어온 경우
      if (line.startsWith('🚩')) { s.mission = line.replace(/^🚩\s*/, ''); return; }
      if (line.startsWith('📢')) { s.tmi = line.replace(/^📢\s*/, ''); return; }
      if (line.startsWith('🗣️') || line.startsWith('🗣')) {
        const t = line.replace(/^🗣️?\s*/, '');
        const q = t.search(/[「『"]/);
        s.talk = q > 0 ? { who: t.slice(0, q).trim(), say: t.slice(q).trim() } : { who: '', say: t };
        return;
      }
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2 && parts[0].includes(':')) { s.chips.push(parts); return; }   // 📖 시점: 레이 | 일정: …
      if (parts.length >= 3) {                                                              // 이름 | 태그 | 태그 | 행동
        s.members.push({ name: parts[0], tags: parts.slice(1, -1), action: parts[parts.length - 1] });
        return;
      }
      s.notes.push(line);
    });
    return s;
  }

  // 💌 INTERVIEW 덩어리 → [{ q, who, ja, ko }]
  function parseInterview(lines) {
    const out = []; let cur = null;
    lines.forEach(raw => {
      const l = raw.trim();
      if (!l || /^💌/.test(l)) return;
      let m;
      if ((m = l.match(/^Q[.．:：]\s*(.*)$/i))) { cur = { q: m[1], who: '', ja: '', ko: '' }; out.push(cur); return; }
      if ((m = l.match(/^A[.．:：]\s*(.*)$/i))) {
        if (!cur) { cur = { q: '', who: '', ja: '', ko: '' }; out.push(cur); }
        let a = m[1];
        const bar = a.search(/[｜|]/);
        if (bar > 0 && bar < a.indexOf('「') || (bar > 0 && a.indexOf('「') < 0)) { cur.who = a.slice(0, bar).trim(); a = a.slice(bar + 1).trim(); }
        const ko = a.match(/[(（]([^()（）]*)[)）]\s*$/);
        if (ko) { cur.ko = ko[1]; a = a.slice(0, ko.index).trim(); }
        cur.ja = a;
        return;
      }
      if (cur && /^[(（]/.test(l)) { cur.ko = l.replace(/^[(（]|[)）]$/g, ''); return; }   // 번역이 다음 줄에 온 경우
      if (cur) cur.ja = (cur.ja ? cur.ja + ' ' : '') + l;
    });
    return out;
  }

  // 틀 파일에서 쓰는 정보 (전부 HTML로 안전하게 바꿔둔 값)
  function statusData(set) {
    const h = set.header ? parseHeader(set.header) : {};
    const s = set.fence ? parseStatus(set.fence) : { chips: [], members: [], notes: [] };
    const f = {};
    const chips = [];
    s.chips.flat().forEach(c => {
      const i = c.indexOf(':');
      const label = c.slice(0, i).replace(/^[^\p{L}\p{N}]+/u, '').trim();   // 앞의 이모지 떼고 '시점'
      const value = c.slice(i + 1).trim();
      chips.push({ text: esc(c), label: esc(label), icon: esc(c.slice(0, i).replace(label, '').trim()), value: esc(value) });
      if (label) f[label] = esc(value);
    });
    const iv = set.interview || [];
    // 날짜 → 일본식 (2014年 2月 3日(月))
    const WD = { '월': '月', '화': '火', '수': '水', '목': '木', '금': '金', '토': '土', '일': '日' };
    const dm = (h.date || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\s*\(([^)]*)\))?/);
    const wd = dm && dm[4] ? (WD[dm[4].trim()[0]] || dm[4].trim()) : '';
    const dateJa = dm ? `${dm[1]}年 ${+dm[2]}月 ${+dm[3]}日` + (wd ? `(${wd})` : '') : esc(h.date || '');
    return {
      dateJa: esc(dateJa), year: dm ? dm[1] : '', month: dm ? String(+dm[2]) : '', day: dm ? String(+dm[3]) : '', wd: esc(wd),
      uid: 'k' + Math.random().toString(36).slice(2, 8),
      turn: esc(h.turn || ''), date: esc(h.date || ''), time: esc(h.time || ''), weather: esc(h.weather || ''), location: esc(h.location || ''),
      chips, f, chipRows: s.chips.map(r => ({ chips: r.map(esc) })),
      members: s.members.map(m => ({ name: esc(m.name), initial: esc([...m.name][0] || ''), tags: m.tags.map(esc), action: inline(m.action) })),
      mission: s.mission ? inline(s.mission) : '', tmi: s.tmi ? inline(s.tmi) : '',
      talk: s.talk ? { who: esc(s.talk.who), say: inline(s.talk.say) } : null,
      notes: (s.notes || []).map(inline),
      interview: iv.map(x => ({ q: inline(x.q), who: esc(x.who), ja: inline(x.ja), ko: inline(x.ko) })),
      hasHeader: !!set.header, hasMembers: s.members.length > 0,
      hasExtra: !!(s.tmi || s.talk || iv.length || (s.notes || []).length)
    };
  }

  // 기본 디자인 (틀 파일을 고르지 않았을 때)
  function buildStatusDefault(d) {
    const out = ['<div class="cs-wrap"><div class="cs"><div class="cs-in">'];
    if (d.hasHeader) {
      out.push('<div class="cs-head"><div class="cs-head-l">' +
        (d.turn ? `<span class="cs-slot">${d.turn}</span>` : '') +
        `<span class="cs-date">${[d.date, d.time].filter(Boolean).join(' ')}</span></div>` +
        `<span class="cs-weather">${d.weather}</span></div>`);
      if (d.location) out.push(`<div class="cs-loc">📍 ${d.location}</div>`);
    }
    if (d.chipRows.length) {
      out.push('<div class="cs-chips">' + d.chipRows.map(r =>
        '<div class="cs-chip-row">' + r.chips.map(c => `<span class="cs-chip">${c}</span>`).join('') + '</div>').join('') + '</div>');
    }
    if (d.mission) out.push(`<div class="cs-mission"><div class="cs-mission-t">🚩 MISSION</div><div class="cs-mission-d">${d.mission}</div></div>`);
    if (d.members.length) {
      out.push('<hr class="cs-hr"><div class="cs-members">' + d.members.map(m =>
        '<div class="cs-card"><div class="cs-card-top">' + `<span class="cs-name">${m.name}</span>` +
        m.tags.map(t => `<span class="cs-tag">${t}</span>`).join('') +
        `</div><div class="cs-act">${m.action}</div></div>`).join('') + '</div>');
    }
    if (d.hasExtra) out.push('<hr class="cs-hr">');
    if (d.tmi) out.push(`<div class="cs-announce">📢 ${d.tmi}</div>`);
    if (d.talk) out.push('<div class="cs-talk">' + (d.talk.who ? `<div class="cs-talk-who">🗣️ ${d.talk.who}</div>` : '') + `<div class="cs-bubble">${d.talk.say}</div></div>`);
    if (d.interview.length) {
      out.push('<div class="cs-qa"><div class="cs-qa-h">💌 INTERVIEW</div>' + d.interview.map(x =>
        `<div class="cs-qa-q"><b>Q.</b> ${x.q}</div><div class="cs-qa-a"><b>A.</b> ${x.who ? x.who + '｜' : ''}${x.ja}${x.ko ? `<br><span class="cs-qa-ko">(${x.ko})</span>` : ''}</div>`).join('') + '</div>');
    }
    d.notes.forEach(n => out.push(`<div class="cs-note">${n}</div>`));
    out.push('</div></div></div>');
    return out.join('\n');
  }

  /* =========================================================
     🧩 틀 파일 렌더러 (아주 작은 머스태시 문법)
       {{turn}}            값 넣기 (값은 이미 안전한 HTML)
       {{f.시점}}           점(.)으로 안쪽 값
       {{#members}}…{{/members}}   목록이면 반복, 값이 있으면 한 번, 없으면 생략
       {{^members}}…{{/members}}   값이 없을 때만
       {{.}}               반복 중인 값 자체 (예: 감정 태그)
     ========================================================= */
  function renderTpl(tpl, ctx) {
    const look = (stack, key) => {
      if (key === '.') return stack[stack.length - 1];
      for (let i = stack.length - 1; i >= 0; i--) {
        let v = stack[i];
        const ok = key.split('.').every(k => { if (v != null && typeof v === 'object' && k in v) { v = v[k]; return true; } return false; });
        if (ok) return v;
      }
      return '';
    };
    const run = (str, stack) => str
      .replace(/{{([#^])\s*([^}\s]+)\s*}}([\s\S]*?){{\/\s*\2\s*}}/g, (_, kind, key, inner) => {
        const v = look(stack, key);
        const empty = !v || (Array.isArray(v) && !v.length);
        if (kind === '^') return empty ? run(inner, stack) : '';
        if (empty) return '';
        if (Array.isArray(v)) return v.map(x => run(inner, stack.concat([x]))).join('');
        return run(inner, typeof v === 'object' ? stack.concat([v]) : stack);
      })
      .replace(/{{\s*([^#^/}][^}]*?)\s*}}/g, (_, key) => { const v = look(stack, key); return v == null || typeof v === 'object' ? '' : String(v); });
    return run(tpl, [ctx]);
  }

  // 지금 골라진 틀 (templates.js 가 localStorage 'tpl.cur' 에 넣어둠) → { name, markup, css }
  function currentTpl() {
    try { const t = JSON.parse(localStorage.getItem('tpl.cur')); return t && t.markup ? t : null; } catch (e) { return null; }
  }

  function buildStatus(set, tpl) {
    const d = statusData(set);
    return tpl ? renderTpl(tpl.markup, d) : buildStatusDefault(d);
  }

  /* =========================================================
     4. 본문 만들기
     ========================================================= */
  function classify(lines) {
    const text = lines.join('\n').trim();
    if (/^\*[^*][\s\S]*\*$/.test(text)) return 'narr';                 // *지문*
    if (/^`[^`][\s\S]*`$/.test(text)) return 'thought';                // `속마음`
    if (/[「『｜]/.test(text)) return 'talk';                            // 대사
    if (/^\*/.test(text)) return 'narr';                                // *지문* 뒤에 다른 글이 붙은 경우
    return 'talk';
  }

  // 본문에서 💌 INTERVIEW 덩어리를 떼어내기 (→ 상태창으로)
  function takeInterview(set) {
    const keep = [];
    let iv = null;
    set.body.forEach(lines => {
      const i = lines.findIndex(l => /^💌\s*INTERVIEW/i.test(l.trim()));
      if (i < 0 && !(iv && /^[QA][.．:：]/i.test((lines[0] || '').trim()))) { keep.push(lines); return; }
      if (i > 0) keep.push(lines.slice(0, i));
      iv = (iv || []).concat(lines.slice(Math.max(i, 0)));
    });
    set.body = keep;
    if (iv) set.interview = parseInterview(iv);
  }

  function buildBody(paras, stats) {
    const blocks = [];

    paras.forEach(lines => {
      // 문단 안에 사진 줄이 섞여 있으면 사진은 따로 떼기
      let buf = [];
      const pushText = () => {
        if (!buf.length) return;
        const first = buf[0];
        const prev = blocks[blocks.length - 1];
        // (번역) 으로 시작하는 문단은 바로 앞 대사에 붙이기
        if (/^[(（]/.test(first) && prev && prev.type === 'talk') prev.lines.push(...buf);
        else blocks.push({ type: classify(buf), lines: buf });
        buf = [];
      };
      lines.forEach(l => {
        const m = l.match(IMG_RE);
        if (m) { pushText(); if (!NSFW_WORDS.some(w => m[1].includes(w))) blocks.push({ type: 'img', alt: m[1], src: m[2] }); }
        else buf.push(l);
      });
      pushText();
    });

    return blocks.map(b => {
      if (b.type === 'img') {
        stats.images++;
        return `<div class="cl-img"><img src="${esc(b.src)}" alt="${esc(b.alt)}"></div>`;
      }
      const html = b.lines.map(inline).join('<br>');
      const cls = b.type === 'thought' ? 'cl-thought-line' : 'cl-' + b.type;
      return `<div class="${cls}">${html}</div>`;
    }).join('\n');
  }

  /* =========================================================
     5. 전체 변환
     ========================================================= */
  // 세트 사이 구분선 (티스토리 구분선 6번 스타일)
  const DIVIDER = '<div class="cl-sep"><hr contenteditable="false" data-ke-type="horizontalRule" data-ke-style="style6" /></div>';

  const styleBlock = css => css ? '\n\n<style>\n' + css + '\n</style>' : '';

  function convert(text, opts = {}) {
    const stats = { sets: 0, status: 0, images: 0 };
    const tpl = opts.tpl === undefined ? currentTpl() : opts.tpl;
    const sets = group(tokenize(text || ''));

    const parts = sets.map(set => {
      takeInterview(set);
      const hasStatus = set.header || set.fence || set.interview;
      if (hasStatus) stats.status++;
      stats.sets++;
      return [
        hasStatus ? buildStatus(set, tpl) : '',
        set.body.length ? buildBody(set.body, stats) : ''
      ].filter(Boolean).join('\n');
    });

    const title = (opts.title || '').trim();
    const body =
      '<div class="cl-log">\n' +
      (title ? `<div class="cl-title"><span>♡</span> ${esc(title)} <span>♡</span></div>\n` : '') +
      parts.join('\n' + DIVIDER + '\n') +
      '\n</div>';

    const css = [(window.LOG_CSS || '').trim(), tpl && tpl.css ? tpl.css.trim() : ''].filter(Boolean).join('\n\n');
    return { body, css, html: body + styleBlock(css), stats };
  }

  // 편집 표시(📸 발췌·🔖 책갈피)는 빼고 내보내기
  function cleanEdited(body) {
    const d = document.createElement('div');
    d.innerHTML = body;
    d.querySelectorAll('.xp').forEach(x => { x.replaceWith(...x.childNodes); });
    d.querySelectorAll('.bm, [contenteditable]').forEach(x => { x.classList.remove('bm'); if (x.getAttribute('contenteditable') === 'true') x.removeAttribute('contenteditable'); });
    d.querySelectorAll('[class=""]').forEach(x => x.removeAttribute('class'));
    return d.innerHTML;
  }

  // 서랍 글 하나 → 완성 HTML (편집한 적 있으면 편집본, 아니면 새로 변환)
  function renderItem(it, title) {
    if (it.edited) {
      const body = cleanEdited(it.edited);
      const css = it.editedCss != null ? it.editedCss : (window.LOG_CSS || '').trim();
      return { body, css, html: body + styleBlock(css), stats: { images: (body.match(/<img(?![^>]*text-emoji)/g) || []).length, status: (body.match(/class="cs-wrap"|data-status/g) || []).length } };
    }
    return convert(it.text, { title });
  }

  // 글 안의 상태창들 → statusData 목록 (📸 상태창 발췌용)
  function statusList(text) {
    return group(tokenize(text || '')).map(set => {
      takeInterview(set);
      return set.header || set.fence || set.interview ? statusData(set) : null;
    }).filter(Boolean);
  }

  window.LogConverter = { convert, renderItem, renderTpl, statusData: set => statusData(set), statusList, currentTpl,
    // 상태창 하나만 HTML로 (📸 상태창 발췌 · 틀 디자인용)
    statusHtml: (d, tpl) => tpl ? renderTpl(tpl.markup, d) : buildStatusDefault(d) };
})();
