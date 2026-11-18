/* =========================================================
   📸 발췌 스튜디오 (트위터용 발췌 이미지)
   ---------------------------------------------------------
   · 📝 본문 발췌 : ② 편집에서 📸 발췌 펜으로 표시한 문장을 불러와요
   · 🎀 상태창 발췌 : 상태창 내용을 골라서 한 장으로
   · 팝업 안 에디터에서 글 고치기 · 형광펜 · 줄 종류(대사/지문/속마음) 바꾸기
   · 글꼴 · 크기 · 비율(세로 3:4 / 정사각 1:1 / 가로 16:9 / 세로 자동)
   · 배경은 흰색 하나, 장식 없음
   · 대사는 진하게, 지문은 연하게
   ========================================================= */
const Excerpt = (() => {
  const SIZES = {
    tall:   { w: 1080, h: 1440, label: '세로 3:4' },
    square: { w: 1080, h: 1080, label: '정사각 1:1' },
    wide:   { w: 1600, h: 900,  label: '가로 16:9' },
    auto:   { w: 1080, h: 0,    label: '세로 자동 ↕' }      // 글 길이만큼 늘어나요
  };
  // 이모지는 기기 기본 이모지로 (SysEmoji = log-style.js 의 @font-face, 이모지 글자에만 적용)
  const EMOJI = '"SysEmoji"';
  (() => {
    if (document.getElementById('xsEmojiFace')) return;
    const m = (window.LOG_CSS || '').match(/@font-face\s*{[^}]*SysEmoji[^}]*}/);
    if (!m) return;
    const st = document.createElement('style'); st.id = 'xsEmojiFace'; st.textContent = m[0];
    document.head.appendChild(st);
  })();
  const FONTS = {
    mona:  { label: 'Mona12',     css: '"Mona12"' },
    thin:  { label: '얇은물마루', css: '"ThinMulmaru"' },
    umdot: { label: 'Umdot12',    css: '"Umdot12"' },
    sans:  { label: '기본 고딕',  css: 'sans-serif' },
    serif: { label: '기본 명조',  css: 'serif' }
  };
  const FS = [24, 30, 36, 42, 48];
  // 형광펜 색 = ② 편집 형광펜과 같은 3색
  const HL = ['#fdf7fa', '#fff6fe', '#eaf3fb'];
  // 줄 종류별 글자 모양
  const KIND = {
    talk:    { color: '#222' },
    narr:    { color: '#8c8c8c' },
    thought: { color: '#a3a3a3', scale: .9 },
    h:       { color: '#b0b0b0', scale: .72, center: true },   // 상태창 소제목
    kv:      { color: '#333' }                                  // 라벨 : 값
  };
  const K_LABEL = { talk: '💬 대사', narr: '🍃 지문', thought: '💭 속마음', h: '🏷 소제목', kv: '📋 라벨:값' };

  /* =========================================================
     1. 본문 발췌 모으기 (줄바꿈·형광펜·대사/지문 구분 살려서)
     ========================================================= */
  const hex = c => {
    if (!c) return '';
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('') : c.trim().toLowerCase();
  };
  const kindOf = el => {
    const b = el.closest('.cl-talk, .cl-narr, .cl-thought-line, .cl-thought');
    if (!b) return 'narr';                       // 상태창 안 글자 등
    if (b.classList.contains('cl-talk')) return 'talk';
    if (b.classList.contains('cl-narr')) return 'narr';
    return 'thought';
  };
  const blockOf = el => el.closest('.cl-talk, .cl-narr, .cl-thought-line, li, td, p, div') || el;
  const hlOf = (el, stop) => {
    for (let e = el; e && e !== stop; e = e.parentElement) {
      if (e.classList && e.classList.contains('xp')) continue;
      const bg = e.style && e.style.backgroundColor;
      if (bg) return hex(bg);
    }
    return '';
  };

  // → [ [문단, 문단…], [문단…] ]  (발췌 덩어리별)   문단 = { k, runs:[{t, hl} | {br:1}] }
  function collect(it) {
    const d = document.createElement('div'); d.innerHTML = it.edited || '';
    const groups = new Map();      // xp번호 → { paras, lastBlock, br }
    let brs = 0;
    const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    while (w.nextNode()) {
      const n = w.currentNode;
      if (n.nodeType === 1) { if (n.tagName === 'BR') brs++; continue; }
      const xp = n.parentElement && n.parentElement.closest('.xp');
      if (!xp || n.parentElement.closest('.hl-popup')) continue;
      const t = n.nodeValue.replace(/\s+/g, ' ');
      if (!t.trim()) continue;
      const id = xp.dataset.xp;
      if (!groups.has(id)) groups.set(id, { paras: [], lastBlock: null, br: brs });
      const g = groups.get(id);
      const block = blockOf(xp);
      if (block !== g.lastBlock) g.paras.push({ k: kindOf(xp), runs: [] });
      else if (brs > g.br) g.paras[g.paras.length - 1].runs.push({ br: 1 });
      g.paras[g.paras.length - 1].runs.push({ t, hl: hlOf(n.parentElement, block) });
      g.lastBlock = block; g.br = brs;
    }
    return [...groups.values()].map(g => g.paras.map(p => {
      // 줄 처음·끝 공백 정리
      const r = p.runs;
      for (let i = 0; i < r.length; i++) if (r[i].t != null && (i === 0 || r[i - 1].br)) r[i].t = r[i].t.replace(/^\s+/, '');
      for (let i = 0; i < r.length; i++) if (r[i].t != null && (i === r.length - 1 || r[i + 1].br)) r[i].t = r[i].t.replace(/\s+$/, '');
      p.runs = r.filter(x => x.br || x.t);
      return p;
    }).filter(p => p.runs.length));
  }

  /* =========================================================
     2. 상태창 → 문단
     ========================================================= */
  const txt = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); };
  const P = (k, t) => ({ k, runs: String(t).split('\n').flatMap((s, i) => i ? [{ br: 1 }, { t: s }] : [{ t: s }]).filter(x => x.br || x.t) });
  const SECTIONS = [
    ['info', 'じょうほう'], ['chips', 'ステータス'], ['members', 'メンバー'], ['mission', 'ミッション'],
    ['tmi', 'TMI'], ['talk', 'ひとこと'], ['qa', 'Q&A']
  ];
  function statusParas(d, on) {
    const out = [];
    const sec = (key, title, paras) => { if (!on[key] || !paras.length) return; out.push(P('h', title), ...paras); };
    sec('info', 'じょうほう', [
      ['턴', d.turn], ['날짜', txt(d.date)], ['시간', txt(d.time)], ['날씨', txt(d.weather)], ['장소', txt(d.location)]
    ].filter(x => x[1]).map(([l, v]) => P('kv', `${l} : ${v}`)));
    sec('chips', 'ステータス', d.chips.map(c => P('kv', c.label ? `${txt(c.label)} : ${txt(c.value)}` : txt(c.text))));
    sec('members', 'メンバー', d.members.flatMap(m => [
      P('kv', `${txt(m.name)} : ${m.tags.map(txt).join(' · ')}`),
      ...(m.action ? [P('narr', txt(m.action))] : [])
    ]));
    sec('mission', 'ミッション', d.mission ? [P('kv', txt(d.mission))] : []);
    sec('tmi', '内緒だよ', d.tmi ? [P('narr', txt(d.tmi))] : []);
    sec('talk', 'ひとこと', d.talk ? [P('talk', `${txt(d.talk.who)}｜${txt(d.talk.say)}`)] : []);
    sec('qa', 'おしえて！', (d.interview || []).flatMap(q => [
      P('kv', `Q : ${txt(q.q)}`),
      P('talk', `${q.who ? txt(q.who) + '｜' : ''}「${txt(q.ja).replace(/^「|」$/g, '')}」` + (q.ko ? `\n(${txt(q.ko)})` : ''))
    ]));
    return out;
  }

  /* =========================================================
     3. 문단 ↔ 편집기 HTML
     ========================================================= */
  const escT = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const runsHtml = runs => runs.map(r => r.br ? '<br>' : r.hl ? `<span data-hl="${r.hl}" style="background:${r.hl}">${escT(r.t)}</span>` : escT(r.t)).join('');
  const toHtml = paras => paras.map(p => p.k === 'sep' ? '<p data-k="sep">♡</p>' : `<p data-k="${p.k}">${runsHtml(p.runs) || '<br>'}</p>`).join('');
  const groupsHtml = groups => groups.map(toHtml).join('<p data-k="sep">♡</p>');

  function readEditor(ed) {
    const paras = [];
    let cur = null;
    const flush = () => { if (cur) { paras.push(cur); cur = null; } };
    const walkInline = (node, p) => {
      node.childNodes.forEach(c => {
        if (c.nodeType === 3) { if (c.nodeValue) p.runs.push({ t: c.nodeValue.replace(/[\r\n]+/g, ' '), hl: (c.parentElement.closest('[data-hl]') || {}).dataset?.hl || '' }); }
        else if (c.tagName === 'BR') p.runs.push({ br: 1 });
        else if (/^(P|DIV)$/.test(c.tagName)) { if (p.runs.length) p.runs.push({ br: 1 }); walkInline(c, p); }
        else walkInline(c, p);
      });
    };
    ed.childNodes.forEach(c => {
      if (c.nodeType === 1 && /^(P|DIV)$/.test(c.tagName)) {
        flush();
        const p = { k: c.dataset.k || 'narr', runs: [] };
        walkInline(c, p); paras.push(p);
      } else {
        if (!cur) cur = { k: 'narr', runs: [] };
        if (c.nodeType === 3) cur.runs.push({ t: c.nodeValue, hl: '' });
        else if (c.tagName === 'BR') cur.runs.push({ br: 1 });
        else walkInline(c, cur);
      }
    });
    flush();
    return paras.filter(Boolean).map(p => {
      while (p.runs.length && p.runs[p.runs.length - 1].br) p.runs.pop();     // 끝의 빈 줄
      return p;
    }).filter(p => p.k === 'sep' || p.runs.some(r => r.t && r.t.trim()));
  }

  /* =========================================================
     4. 그리기
     ========================================================= */
  async function fontsReady(fam) {
    try { await Promise.all([document.fonts.load(`40px ${fam}`, '가あA'), document.fonts.load(`40px ${EMOJI}`, '😊')]); } catch (e) {}
  }
  const ATOM = /\s+|[　-ヿ㐀-鿿豈-﫿＀-￯]|[^\s　-ヿ㐀-鿿豈-﫿＀-￯]+/g;
  const NO_START = /^[、。，．,.!?！？」』）)〉》】…ー〜~]$/;

  // 문단들을 줄 단위로 배치 → { lines:[{segs, h, gapBefore}] , height }
  function layout(ctx, paras, maxW, fs, fam) {
    const lh = Math.round(fs * 1.75);
    const out = [];
    paras.forEach((p, pi) => {
      const gapBefore = pi === 0 ? 0 : Math.round(fs * (p.k === 'h' || p.k === 'sep' || (paras[pi - 1] && paras[pi - 1].k === 'sep') ? 1.1 : .55));
      if (p.k === 'sep') { out.push({ sep: true, h: Math.round(fs * 1.2), gapBefore }); return; }
      const st = KIND[p.k] || KIND.narr;
      const size = Math.round(fs * (st.scale || 1));
      const font = `${size}px ${EMOJI}, ${fam}, sans-serif`;
      ctx.font = font;
      // 라벨:값 줄 → 라벨 부분을 흐리게
      let runs = p.runs;
      if (p.k === 'kv') {
        runs = []; let done = false;
        p.runs.forEach(r => {
          if (done || r.br || !/[:：]/.test(r.t)) { runs.push(r); return; }
          const i = r.t.search(/[:：]/);
          runs.push({ ...r, t: r.t.slice(0, i + 1), lab: true }, { ...r, t: r.t.slice(i + 1) }); done = true;
        });
      }
      let line = { segs: [], w: 0, gapBefore, center: !!st.center, head: p.k === 'h', h: Math.round(lh * (st.scale || 1)) };
      const trim = () => { while (line.segs.length && line.segs[line.segs.length - 1].t === ' ') line.w -= line.segs.pop().w; };
      const push = () => { trim(); out.push(line); line = { segs: [], w: 0, gapBefore: 0, center: !!st.center, head: p.k === 'h', h: Math.round(lh * (st.scale || 1)) }; };
      runs.forEach(r => {
        if (r.br) { line.last = true; push(); return; }
        (r.t.match(ATOM) || []).forEach(a => {
          const style = { color: r.lab ? '#9a9a9a' : st.color, hl: r.hl, font };
          const aw = ctx.measureText(a).width;
          if (/^\s+$/.test(a)) { if (line.segs.length) { line.segs.push({ t: ' ', w: ctx.measureText(' ').width, ...style }); line.w += line.segs[line.segs.length - 1].w; } return; }
          if (line.w + aw > maxW && line.segs.length) {
            // 。」! 같은 글자는 줄 맨 앞에 안 오게 → 앞 글자와 같이 다음 줄로
            let carry = [];
            if (NO_START.test(a)) {
              trim();
              if (line.segs.length > 1) carry = [line.segs.pop()];
              carry.forEach(c => line.w -= c.w);
            }
            push();
            carry.forEach(c => { line.segs.push(c); line.w += c.w; });
          }
          // 한 덩어리가 한 줄보다 길면 글자 단위로 자르기
          if (aw > maxW) {
            let piece = '';
            for (const ch of a) {
              if (ctx.measureText(piece + ch).width + line.w > maxW && (piece || line.segs.length)) {
                if (piece) { const pw = ctx.measureText(piece).width; line.segs.push({ t: piece, w: pw, ...style }); line.w += pw; }
                push(); piece = '';
              }
              piece += ch;
            }
            if (piece) { const pw = ctx.measureText(piece).width; line.segs.push({ t: piece, w: pw, ...style }); line.w += pw; }
          } else { line.segs.push({ t: a, w: aw, ...style }); line.w += aw; }
        });
      });
      trim();
      line.last = true;
      if (line.segs.length) out.push(line);
    });
    const height = out.reduce((s, l) => s + l.gapBefore + l.h, 0);
    return { lines: out, height };
  }

  function drawLines(g, lines, x0, y0, maxW, fs, align) {
    let y = y0;
    lines.forEach(l => {
      y += l.gapBefore;
      const mid = y + l.h / 2;
      if (l.sep) {
        g.fillStyle = '#d0d0d0'; g.font = `${Math.round(fs * .7)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('·   ·   ♡   ·   ·', x0 + maxW / 2, mid);
        y += l.h; return;
      }
      // 글자 조각마다 x 위치 (양쪽 맞춤이면 남는 공간을 띄어쓰기에 나눠 주기)
      const extra = Math.max(0, maxW - l.w);
      let perSpace = 0, perGap = 0;
      if (align === 'justify' && !l.last && !l.center && extra > 0) {
        const spaces = l.segs.filter(s => s.t === ' ').length;
        if (spaces) perSpace = extra / spaces;
        else if (l.segs.length > 1 && extra / (l.segs.length - 1) < fs) perGap = extra / (l.segs.length - 1);
      }
      const xs = []; let x = l.center ? x0 + extra / 2 : x0;
      l.segs.forEach(s => { xs.push(x); x += s.w + (s.t === ' ' ? perSpace : 0) + perGap; });
      g.textAlign = 'left'; g.textBaseline = 'middle';
      // 형광펜 먼저 (옆 글자와 이어지게)
      l.segs.forEach((s, i) => {
        if (!s.hl) return;
        const sz = parseInt(s.font), x2 = i < l.segs.length - 1 && l.segs[i + 1].hl ? xs[i + 1] : xs[i] + s.w;
        g.fillStyle = s.hl; g.fillRect(Math.floor(xs[i]) - 1, Math.round(mid - sz * .62), Math.ceil(x2 - xs[i]) + 2, Math.round(sz * 1.24));
      });
      l.segs.forEach((s, i) => { g.font = s.font; g.fillStyle = s.color; g.fillText(s.t, xs[i], mid); });
      y += l.h;
    });
  }

  // 여백 (참고 이미지처럼 넉넉하게 · 글자 크기와 상관없이 고정)
  function margins(size) {
    const sz = SIZES[size];
    const padX = Math.round(sz.w * (size === 'wide' ? .08 : .085));
    const padY = sz.h ? Math.round(Math.max(padX, sz.h * .12)) : Math.round(padX * 1.3);
    return { padX, padY };
  }

  async function render(paras, opt) {
    const fam = FONTS[opt.font].css;
    await fontsReady(fam);
    const sz = SIZES[opt.size];
    const W = sz.w;
    const { padX, padY } = margins(opt.size);
    const maxW = W - padX * 2;
    const meas = document.createElement('canvas').getContext('2d');

    // 고정 비율 + 한 장 맞추기 → 들어갈 때까지 글자 줄이기
    let fs = opt.fs, lay = layout(meas, paras, maxW, fs, fam);
    if (sz.h && opt.fit) {
      const room = sz.h - padY * 2;
      for (const f of FS.filter(f => f < opt.fs).reverse()) {
        if (lay.height <= room) break;
        fs = f; lay = layout(meas, paras, maxW, fs, fam);
      }
    }

    // 페이지 나누기
    const H = sz.h || Math.max(Math.round(W * .45), lay.height + padY * 2);
    const room = H - padY * 2;
    const pages = [[]]; let used = 0;
    lay.lines.forEach((l, i) => {
      const nx = lay.lines[i + 1];
      const h = l.gapBefore + l.h + (l.head && nx ? nx.gapBefore + nx.h : 0);    // 소제목은 다음 줄과 같이
      if (sz.h && used + h > room && pages[pages.length - 1].length) { pages.push([]); used = 0; l = { ...l, gapBefore: 0 }; }
      if (l.sep && !pages[pages.length - 1].length) return;           // 쪽 맨 위 구분선은 생략
      pages[pages.length - 1].push(l); used += l.gapBefore + l.h;
    });

    const canvases = pages.map((pl, i) => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      const h = pl.reduce((s, l) => s + l.gapBefore + l.h, 0);
      const top = padY + Math.max(0, (room - h) / 2);          // 세로 가운데
      drawLines(g, pl, padX, top, maxW, fs, opt.align);
      if (pages.length > 1) {
        g.fillStyle = '#c4c4c4'; g.font = `${Math.round(fs * .6)}px ${fam}, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillText(`${i + 1} / ${pages.length}`, W - padX, H - padY / 2);
      }
      return cv;
    });
    return { canvases, fs };
  }

  /* =========================================================
     4-2. 🎨 상태창을 틀 디자인 그대로 이미지로
     ---------------------------------------------------------
     HTML → SVG(foreignObject) → 캔버스
     · 글꼴·테두리 그림·GIF는 미리 받아서 data: 주소로 넣어요 (안 그러면 이미지에서 빠져요)
     · github.com/…/blob/…?raw=true 주소는 raw.githubusercontent.com 으로 바꿔서 받아요
     ========================================================= */
  const SITE_FONTS = `
@font-face { font-family: "Mona12"; src: url("https://cdn.jsdelivr.net/gh/MonadABXY/mona-font@main/web/Mona12.woff2") format("woff2"); }
@font-face { font-family: "ThinMulmaru"; src: url("https://cdn.jsdelivr.net/gh/Project-Noonnu/2607161321@thinmulmaru/thinmulmaru/ThinMulmaru.woff2") format("woff2"); }
@font-face { font-family: "Umdot12"; src: url("https://cdn.jsdelivr.net/gh/MonadABXY/umdot-font@main/woff2/Umdot12.woff2") format("woff2"); }`;
  const rawGh = u => u.replace(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^?#]+)(?:\?raw=true)?$/, 'https://raw.githubusercontent.com/$1/$2/$3');
  const dataCache = new Map();
  function toData(url) {
    if (/^data:/.test(url)) return Promise.resolve(url);
    if (!dataCache.has(url)) dataCache.set(url, (async () => {
      try {
        const r = await fetch(rawGh(url), { mode: 'cors' });
        if (!r.ok) throw new Error(r.status);
        const b = await r.blob();
        return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(b); });
      } catch (e) { return null; }
    })());
    return dataCache.get(url);
  }
  const URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  async function inlineCss(css) {
    const urls = [...new Set([...css.matchAll(URL_RE)].map(m => m[2].trim()).filter(u => /^https?:/.test(u)))];
    const map = {};
    await Promise.all(urls.map(async u => { map[u] = await toData(u); }));
    return css.replace(URL_RE, (m, q, u) => map[u.trim()] ? `url("${map[u.trim()]}")` : m);
  }

  // 고른 칸만 남기기
  function pickSections(d, on) {
    const x = { ...d };
    if (!on.info) Object.assign(x, { turn: '', date: '', time: '', weather: '', location: '', dateJa: '', year: '', month: '', day: '', wd: '', hasHeader: false });
    if (!on.chips) Object.assign(x, { chips: [], f: {}, chipRows: [] });
    if (!on.members) Object.assign(x, { members: [], hasMembers: false });
    if (!on.mission) x.mission = '';
    if (!on.tmi) x.tmi = '';
    if (!on.talk) x.talk = null;
    if (!on.qa) x.interview = [];
    x.hasExtra = !!(x.tmi || x.talk || x.interview.length || (x.notes || []).length);
    return x;
  }

  async function renderTplStatus(d, tpl, opt) {
    const cssW = opt.cssW;
    const css = await inlineCss([SITE_FONTS, window.LOG_CSS || '', tpl ? tpl.css || '' : ''].join('\n'));
    const holder = document.createElement('div');
    holder.innerHTML = LogConverter.statusHtml(d, tpl);
    holder.querySelectorAll('details').forEach(x => x.setAttribute('open', ''));   // 접힌 おまけ 는 펼쳐서
    await Promise.all([...holder.querySelectorAll('img[src]')].map(async im => {
      const v = await toData(im.getAttribute('src'));
      if (v) im.setAttribute('src', v); else im.remove();
    }));

    // 숨은 칸에서 실제 높이 재기
    const ifr = document.createElement('iframe');
    ifr.style.cssText = `position:fixed;left:-99999px;top:0;width:${cssW}px;height:200px;border:0;visibility:hidden;`;
    document.body.appendChild(ifr);
    const doc = ifr.contentDocument;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style><style>html,body{margin:0;background:#fff;}</style></head><body>` +
      `<div class="cl-log" id="xsRoot" style="width:${cssW}px;margin:0;padding:0;box-sizing:border-box;display:flow-root;background:#fff;">${holder.innerHTML}</div></body></html>`);
    doc.close();
    try { await doc.fonts.ready; } catch (e) {}
    await Promise.all([...doc.images].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    await new Promise(r => setTimeout(r, 60));
    const root = doc.getElementById('xsRoot');
    const h = Math.ceil(root.getBoundingClientRect().height) || 10;
    const xhtml = new XMLSerializer().serializeToString(root);
    ifr.remove();

    // 바깥 캔버스 크기와 배율
    const sz = SIZES[opt.size];
    const { padX, padY } = margins(opt.size);
    const W = sz.w;
    let scale = (W - padX * 2) / cssW;
    if (sz.h) scale = Math.min(scale, (sz.h - padY * 2) / h);
    const H = sz.h || Math.round(h * scale + padY * 2);
    const dw = Math.round(cssW * scale), dh = Math.round(h * scale);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dw}" height="${dh}" viewBox="0 0 ${cssW} ${h}">` +
      `<foreignObject x="0" y="0" width="${cssW}" height="${h}">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${cssW}px;background:#fff;"><style><![CDATA[${css.replace(/]]>/g, '')}\nhtml,body{margin:0}]]></style>${xhtml}</div>` +
      `</foreignObject></svg>`;
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im); im.onerror = () => rej(new Error('svg'));
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.drawImage(img, Math.round((W - dw) / 2), Math.round((H - dh) / 2), dw, dh);
    return { canvases: [cv], fs: opt.fs, small: sz.h && scale < (W - padX * 2) / cssW * .75 };
  }

  /* =========================================================
     5. 스튜디오 창
     ========================================================= */
  async function open(it, { mode } = {}) {
    if (!it) return toast('작업할 글을 먼저 골라 주세요');
    const groups = collect(it);
    const stList = LogConverter.statusList ? LogConverter.statusList(it.text || '') : [];
    const opt = {
      size: store.get('xp.size', 'tall'), font: store.get('xp.font', 'mona'),
      fs: +store.get('xp.fs', 36), fit: store.get('xp.fit', '1') === '1',
      align: store.get('xp.align', 'left'),
      stStyle: store.get('xp.stStyle', 'tpl'),                       // 상태창: tpl = 틀 디자인 그대로 / text = 글자만
      cssW: +store.get('xp.cssW', 420),
      tplFile: store.get('xp.tpl', (typeof Templates !== 'undefined' && Templates.current() || {}).file || '')
    };
    const TPLS = typeof Templates !== 'undefined' ? Templates.cached() : [];
    const tplObj = () => TPLS.find(t => t.file === opt.tplFile) || null;
    if (!SIZES[opt.size]) opt.size = 'tall';
    if (!FONTS[opt.font]) opt.font = 'mona';
    const secOn = Object.assign(Object.fromEntries(SECTIONS.map(s => [s[0], true])), store.json('xp.sec', {}));
    let stIdx = 0;
    const startMode = mode || (groups.length || it.xpDraft?.body || !stList.length ? 'body' : 'status');
    mode = null;
    // 고친 내용은 글마다 기억 (it.xpDraft)
    const draft = it.xpDraft || {};
    const html = { body: draft.body || groupsHtml(groups), status: draft.status || (stList.length ? toHtml(statusParas(stList[0], secOn)) : '') };
    let canvases = [];

    const ov = document.createElement('div');
    ov.className = 'xs-ov';
    ov.innerHTML = `
      <div class="xs-box" role="dialog" aria-modal="true">
        <div class="md-t"><span>📸 발췌 스튜디오</span><button class="md-x" aria-label="닫기">✕</button></div>
        <div class="xs-tabs">
          <button class="subtab" data-mode="body">📝 본문 발췌</button>
          <button class="subtab" data-mode="status">🎀 상태창 발췌</button>
        </div>
        <div class="xs-main">
          <div class="xs-left">
            <div class="xs-row"><span class="xs-lb">비율</span>
              ${Object.entries(SIZES).map(([k, v]) => `<label class="xs-chip"><input type="radio" name="xsSize" value="${k}" ${k === opt.size ? 'checked' : ''}><span>${v.label}</span></label>`).join('')}
            </div>
            <div class="xs-row xs-st">
              <span class="xs-lb">상태창</span>
              <select class="tx sel" id="xsSt">${stList.map((d, i) => `<option value="${i}">#${i + 1} ${esc(txt([d.turn, d.date].filter(Boolean).join(' ')) || '상태창')}</option>`).join('')}</select>
              <label class="xs-chip"><input type="radio" name="xsStStyle" value="tpl" ${opt.stStyle === 'tpl' ? 'checked' : ''}><span>🎨 틀 디자인</span></label>
              <label class="xs-chip"><input type="radio" name="xsStStyle" value="text" ${opt.stStyle === 'text' ? 'checked' : ''}><span>📝 글자만</span></label>
            </div>
            <div class="xs-row xs-st xs-tplonly"><span class="xs-lb">틀</span>
              <select class="tx sel" id="xsTpl"><option value="">기본 상태창</option>${TPLS.map(t => `<option value="${esc(t.file)}" ${t.file === opt.tplFile ? 'selected' : ''}>${esc(t.name || t.file)}</option>`).join('')}</select>
              <select class="tx sel xs-fs" id="xsCssW" title="상태창 너비 (좁을수록 크게 나와요)">${[340, 420, 520, 660].map(w => `<option value="${w}" ${w === opt.cssW ? 'selected' : ''}>폭 ${w}</option>`).join('')}</select>
            </div>
            <div class="xs-row xs-st"><div class="xs-secs">${SECTIONS.map(([k, l]) => `<label class="xs-check"><input type="checkbox" data-sec="${k}" ${secOn[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
            <div class="xs-row xs-txt"><span class="xs-lb">글꼴</span>
              <select class="tx sel" id="xsFont">${Object.entries(FONTS).map(([k, v]) => `<option value="${k}" ${k === opt.font ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
              <select class="tx sel xs-fs" id="xsFs">${FS.map(f => `<option value="${f}" ${f === opt.fs ? 'selected' : ''}>${f}px</option>`).join('')}</select>
              <label class="xs-check" id="xsFitL"><input type="checkbox" id="xsFit" ${opt.fit ? 'checked' : ''}> 한 장에 맞추기</label>
            </div>
            <div class="xs-row xs-txt"><span class="xs-lb">정렬</span>
              <label class="xs-chip"><input type="radio" name="xsAlign" value="left" ${opt.align !== 'justify' ? 'checked' : ''}><span>⫷ 왼쪽 정렬</span></label>
              <label class="xs-chip"><input type="radio" name="xsAlign" value="justify" ${opt.align === 'justify' ? 'checked' : ''}><span>☰ 양쪽 맞춤</span></label>
            </div>
            <div class="xs-row xs-txt"><span class="xs-lb">형광펜</span>
              <span class="ed-colors">${HL.map(c => `<button class="ed-color" data-hl="${c}" style="background:${c}" title="드래그한 곳 칠하기"></button>`).join('')}</span>
              <button class="ed-mode" data-hl="">🧽 지우기</button>
            </div>
            <div class="xs-row xs-txt"><span class="xs-lb">줄 종류</span>
              ${['talk', 'narr', 'thought', 'h', 'kv'].map(k => `<button class="ed-mode xs-k" data-k="${k}">${K_LABEL[k]}</button>`).join('')}
              <button class="ed-mode" data-sep="1">♡ 구분선</button>
            </div>
 <div class="xs-ed xs-txt" id="xsEd" contenteditable="true" spellcheck="false"></div>
            <div class="xs-help" id="xsHelp"></div>
          </div>
          <div class="xs-right">
            <div class="xs-info" id="xsInfo">그리는 중… ✏</div>
            <div class="xs-prev" id="xsPrev"></div>
          </div>
        </div>
        <div class="md-f">
          <button class="btn white" data-act="reload">↺ 처음부터</button>
          <button class="btn white" data-act="close">닫기</button>
          <button class="btn" data-act="copy">📋 이미지 복사</button>
          <button class="btn pink" data-act="save">💾 PNG 저장</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const $ = s => ov.querySelector(s);
    const ed = $('#xsEd');

    const keepDraft = () => {
      html[mode] = ed.innerHTML;
      it.xpDraft = { body: html.body, status: html.status };
      if (typeof Drawer !== 'undefined') Drawer.quietSave();
    };

    let busy = 0, again = false;
    const redraw = async () => {
      if (busy) { again = true; return; }
      busy = 1;
      const tplMode = mode === 'status' && opt.stStyle === 'tpl';
      const paras = tplMode ? [] : readEditor(ed);
      if (tplMode) {
        if (!stList.length) { canvases = []; $('#xsPrev').innerHTML = ''; $('#xsInfo').textContent = '이 글에는 상태창이 없어요 (｡•́︿•̀｡)'; }
        else {
          $('#xsInfo').textContent = '상태창 그리는 중… ✏';
          try {
            const r = await renderTplStatus(pickSections(stList[stIdx], secOn), tplObj(), opt);
            canvases = r.canvases;
            const prev = $('#xsPrev'); prev.innerHTML = '';
            const im = new Image(); im.src = canvases[0].toDataURL('image/png'); prev.appendChild(im);
            $('#xsInfo').innerHTML = `${canvases[0].width}×${canvases[0].height} · 🎨 ${esc((tplObj() || {}).name || '기본 상태창')}` +
              (r.small ? ' · 길어서 작게 들어갔어요 → <b>세로 자동</b>을 추천해요' : '');
          } catch (err) {
            canvases = []; $('#xsPrev').innerHTML = '';
            $('#xsInfo').innerHTML = '⚠️ 이 브라우저에선 틀 그대로 그리기가 안 돼요 → <b>📝 글자만</b>을 써 주세요';
          }
        }
      } else if (!paras.length) {
        canvases = [];
        $('#xsPrev').innerHTML = '';
        $('#xsInfo').textContent = '왼쪽에 글이 없어요 (｡•́︿•̀｡)';
      } else {
        const r = await render(paras, opt);
        canvases = r.canvases;
        const prev = $('#xsPrev'); prev.innerHTML = '';
        canvases.forEach(cv => { const im = new Image(); im.src = cv.toDataURL('image/png'); prev.appendChild(im); });
        const sz = SIZES[opt.size];
        $('#xsInfo').innerHTML = `${canvases[0].width}×${canvases[0].height}` +
          (canvases.length > 1 ? ` · <b>${canvases.length}장</b>으로 나뉘었어요` : ' · 1장') +
          (r.fs !== opt.fs ? ` · 글자를 ${r.fs}px로 줄였어요` : '') +
          (sz.h ? '' : ' · 글 길이만큼 세로가 늘어나요');
      }
      busy = 0;
      if (again) { again = false; redraw(); }
    };
    let tm;
    const soon = () => { clearTimeout(tm); tm = setTimeout(redraw, 300); };

    const setMode = m => {
      if (ed.isConnected && mode) html[mode] = ed.innerHTML;
      mode = m;
      ov.querySelectorAll('.xs-tabs .subtab').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
      ed.innerHTML = html[m] || '';
      showRows();
      $('#xsHelp').innerHTML = m === 'body'
        ? (groups.length || draft.body ? '글을 바로 고칠 수 있어요 · <b>Enter</b> = 새 문단, <b>Shift+Enter</b> = 줄바꿈 · 드래그 후 형광펜 색을 누르면 칠해져요'
          : '📸 발췌 표시한 문장이 없어요. ② 편집에서 📸 발췌 펜으로 드래그하거나, 여기에 바로 써도 돼요')
        : (stList.length ? '📝 글자만: 보여줄 칸을 고르면 아래 글이 새로 채워져요 (고친 내용은 사라져요) · 글은 바로 고칠 수 있어요'
          : '이 글에는 상태창이 없어요 (｡•́︿•̀｡)');
      redraw();
    };

    // 탭·서식에 따라 보이는 줄 바꾸기
    function showRows() {
      const st = mode === 'status', tpl = st && opt.stStyle === 'tpl';
      ov.querySelectorAll('.xs-st').forEach(r => r.hidden = !st);
      ov.querySelectorAll('.xs-tplonly').forEach(r => r.hidden = !tpl);
      ov.querySelectorAll('.xs-txt').forEach(r => r.hidden = tpl);
      $('#xsHelp').hidden = tpl;
      $('#xsFitL').hidden = opt.size === 'auto' || tpl;
    }

    /* --- 편집기 --- */
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
    ed.addEventListener('input', () => { keepDraft(); soon(); });
    ed.addEventListener('paste', e => {          // 붙여넣기는 글자만
      e.preventDefault();
      const t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t);
    });
    ed.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); document.execCommand('insertLineBreak'); }
    });

    const selIn = () => {
      const s = window.getSelection();
      if (!s.rangeCount) return null;
      const r = s.getRangeAt(0);
      return ed.contains(r.commonAncestorContainer) ? r : null;
    };
    const textNodesIn = r => {
      const root = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentNode;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => r.intersectsNode(n) && n.nodeValue ? 1 : 2 });
      const out = []; while (w.nextNode()) out.push(w.currentNode); return out;
    };
    const paint = color => {
      const r = selIn();
      if (!r || r.collapsed) return toast('칠할 곳을 먼저 드래그해 주세요');
      textNodesIn(r).forEach(n => {
        let s = 0, e = n.nodeValue.length;
        if (n === r.startContainer) s = r.startOffset;
        if (n === r.endContainer) e = r.endOffset;
        if (s >= e) return;
        let t = n;
        if (e < t.nodeValue.length) t.splitText(e);
        if (s > 0) t = t.splitText(s);
        const old = t.parentElement.closest('[data-hl]');
        if (old && old.textContent === t.nodeValue) {         // 이미 칠한 덩어리 → 색만 바꾸기/지우기
          if (color) { old.dataset.hl = color; old.style.background = color; } else old.replaceWith(...old.childNodes);
          return;
        }
        if (!color && !old) return;
        if (old) {   // 칠한 덩어리 일부 → 바깥으로 빼서 따로 칠하기
          const before = old.cloneNode(false), after = old.cloneNode(false);
          let hit = false;
          [...old.childNodes].forEach(c => { if (c === t) hit = true; else (hit ? after : before).appendChild(c); });
          if (before.childNodes.length) old.before(before);
          if (after.childNodes.length) old.after(after);
          old.replaceWith(t);
        }
        if (color) { const sp = document.createElement('span'); sp.dataset.hl = color; sp.style.background = color; t.before(sp); sp.appendChild(t); }
      });
      window.getSelection().removeAllRanges();
      keepDraft(); redraw();
    };
    ov.querySelectorAll('[data-hl]').forEach(b => {
      if (!b.closest('.xs-row')) return;
      b.addEventListener('mousedown', e => e.preventDefault());       // 선택이 안 풀리게
      b.onclick = () => paint(b.dataset.hl);
    });

    // 커서·선택이 걸친 문단들
    const parasInSel = () => {
      const r = selIn(); if (!r) return [];
      return [...ed.children].filter(p => r.intersectsNode(p));
    };
    ov.querySelectorAll('.xs-k').forEach(b => {
      b.addEventListener('mousedown', e => e.preventDefault());
      b.onclick = () => {
        const ps = parasInSel();
        if (!ps.length) return toast('바꿀 줄에 커서를 두고 눌러 주세요');
        ps.forEach(p => { if (p.dataset.k !== 'sep') p.dataset.k = b.dataset.k; });
        keepDraft(); redraw();
      };
    });
    $('[data-sep]').addEventListener('mousedown', e => e.preventDefault());
    $('[data-sep]').onclick = () => {
      const ps = parasInSel();
      const sep = document.createElement('p'); sep.dataset.k = 'sep'; sep.textContent = '♡';
      if (ps.length) ps[ps.length - 1].after(sep); else ed.appendChild(sep);
      keepDraft(); redraw();
    };

    /* --- 옵션 --- */
    ov.querySelectorAll('input[name=xsSize]').forEach(r => r.onchange = () => {
      opt.size = r.value; store.set('xp.size', opt.size);
      showRows();
      redraw();
    });
    ov.querySelectorAll('input[name=xsAlign]').forEach(r => r.onchange = () => { opt.align = r.value; store.set('xp.align', opt.align); ed.dataset.align = opt.align; redraw(); });
    ed.dataset.align = opt.align;
    ov.querySelectorAll('input[name=xsStStyle]').forEach(r => r.onchange = () => {
      opt.stStyle = r.value; store.set('xp.stStyle', opt.stStyle);
      if (opt.stStyle === 'text' && !ed.textContent.trim()) refillStatus(); else redraw();
      showRows();
    });
    $('#xsTpl').onchange = e => { opt.tplFile = e.target.value; store.set('xp.tpl', opt.tplFile); redraw(); };
    $('#xsCssW').onchange = e => { opt.cssW = +e.target.value; store.set('xp.cssW', opt.cssW); redraw(); };
    $('#xsFont').onchange = e => { opt.font = e.target.value; store.set('xp.font', opt.font); ed.dataset.font = opt.font; redraw(); };
    ed.dataset.font = opt.font;
    $('#xsFs').onchange = e => { opt.fs = +e.target.value; store.set('xp.fs', opt.fs); redraw(); };
    $('#xsFit').onchange = e => { opt.fit = e.target.checked; store.set('xp.fit', opt.fit ? '1' : '0'); redraw(); };

    const refillStatus = () => {
      if (!stList.length) return;
      if (opt.stStyle === 'tpl') { html.status = toHtml(statusParas(stList[stIdx], secOn)); ed.innerHTML = html.status; it.xpDraft = { body: html.body, status: html.status }; return redraw(); }
      ed.innerHTML = toHtml(statusParas(stList[stIdx], secOn));
      keepDraft(); redraw();
    };
    $('#xsSt').onchange = e => { stIdx = +e.target.value; refillStatus(); };
    ov.querySelectorAll('[data-sec]').forEach(c => c.onchange = () => {
      secOn[c.dataset.sec] = c.checked; store.setJson('xp.sec', secOn); refillStatus();
    });

    ov.querySelectorAll('.xs-tabs .subtab').forEach(b => b.onclick = () => { if (b.dataset.mode !== mode) setMode(b.dataset.mode); });

    /* --- 버튼 --- */
    const close = () => { clearTimeout(tm); keepDraft(); ov.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    $('.md-x').onclick = close;
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    ov.querySelector('[data-act=close]').onclick = close;
    ov.querySelector('[data-act=reload]').onclick = async () => {
      if (!await Modal.confirm('지금 탭의 글을 처음 상태로 되돌릴까요?<br><small>고친 글·형광펜이 사라져요</small>', { ok: '되돌리기' })) return;
      ed.innerHTML = mode === 'body' ? groupsHtml(collect(it)) : (stList.length ? toHtml(statusParas(stList[stIdx], secOn)) : '');
      keepDraft(); redraw();
    };
    ov.querySelector('[data-act=save]').onclick = async () => {
      await redraw();
      if (!canvases.length) return toast('그릴 글이 없어요');
      const name = (typeof Drawer !== 'undefined' ? Drawer.fullTitle(it) : '') || 'log';
      canvases.forEach((cv, n) => {
        const a = document.createElement('a');
        a.download = `발췌_${name.replace(/[\\/:*?"<>|]/g, '')}${mode === 'status' ? '_상태창' : ''}${canvases.length > 1 ? '_' + (n + 1) : ''}.png`;
        a.href = cv.toDataURL('image/png'); a.click();
      });
      toast('💾 PNG를 저장했어요!');
    };
    ov.querySelector('[data-act=copy]').onclick = async () => {
      await redraw();
      if (!canvases.length) return toast('그릴 글이 없어요');
      try {
        const blob = await new Promise(r => canvases[0].toBlob(r, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast(canvases.length > 1 ? '📋 첫 장을 복사했어요 (나머지는 PNG 저장으로)' : '📋 이미지를 복사했어요!');
      } catch (err) { toast('⚠️ 이 브라우저에선 이미지 복사가 안 돼요. PNG 저장을 써 주세요'); }
    };

    setMode(startMode);
    setTimeout(() => ed.focus(), 30);
  }

  return { open, collect };
})();
