/* =========================================================
   📔 관찰일지 변환기 (journal.html)
   ---------------------------------------------------------
   AI가 쓴 "칸 채우기 글" → journals/ 폴더의 틀(html)에 넣어서 완성 HTML
   · 전부 이 브라우저 안에서만 동작해요 (어디에도 안 올라가요)
   · 입력한 글은 localStorage 'journal.input' 에만 임시 저장
   ========================================================= */
const Journal = (() => {

  /* ---------- 1. 섹션 이름 → 내부 이름 (띄어쓰기·숫자는 무시) ---------- */
  const SEC = {
    '프로필': 'profile',
    '스테이터스': 'status', '상태바': 'status', '상태': 'status',
    '오늘의세이': 'today',
    '관찰기록': 'memos', '밀착관찰기록': 'memos', '오늘의밀착관찰기록': 'memos', '밀착관찰노트': 'memos',
    '새로알게된점': 'found', '새발견': 'found', '新発見': 'found',
    '선택지': 'choice', '접근작전': 'choice', '選択肢': 'choice',
    '주변반응': 'around', '周りの反応': 'around',
    '어록': 'quote', '오늘의어록': 'quote',
    '세이어사전': 'dict', '사전': 'dict', '번역': 'dict', '세이번역기': 'dict', '번역기': 'dict',
    '세이프로필': 'profile', '오늘의접근작전': 'choice', '선수단적응체크': 'around',
    '이상증세': 'karte', '관찰자이상증세': 'karte', '진단서': 'karte',
    '다음관찰계획': 'plan', '다음계획': 'plan',
    '총평': 'review', '한줄총평': 'review',
  };

  // 진단서 체크 칸: 이름 · 보기 (AI가 보기 중 하나만 쓰면 그걸 ☑)
  const KARTE_ROWS = [
    { keys: ['증상'], label: '症状 증상', opts: ['경상', '그럭저럭 중상', '꽤 위험함'] },
    { keys: ['수술', '수술필요'], label: '手術 수술', opts: ['있음', '없음'] },
    { keys: ['검사', '검사결과'], label: '検査 결과', opts: ['멀쩡함', '나아질지도?', '불치병', '이미 늦음'] },
  ];
  const KARTE_LINES = { '병명': '病名', '심박수': '心拍数', '심박수상태': '心拍数', '상태': '心拍数', '진단': '診断', '진단결과': '診断' };

  const WIKI_TOC = {
    found: '新発見',
    choice: '<span style="font-family: Mona12;">選択肢</span>',
    around: '周<span style="font-family: Mona12;">りの</span>反応',
  };

  const NUMS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮';
  const WDAY = '日月火水木金土';

  /* ---------- 2. 글자 다듬기 ---------- */
  // 안전하게 바꾼 뒤 ==형광펜== · ~~취소선~~ 만 살려요
  const fmt = s => esc(String(s ?? '').trim())
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>');
  const norm = s => String(s).replace(/[\s\d.·・()（）]/g, '');
  const splitBar = s => String(s).split(/\s*[|｜]\s*/).map(x => x.trim()).filter(Boolean);
  // 쉼표·| 로 나누기 (괄호 안 쉼표는 그대로)
  const splitList = s => {
    const out = []; let buf = '', depth = 0;
    for (const ch of String(s)) {
      if ('([（「『'.includes(ch)) depth++;
      if (')]）」』'.includes(ch)) depth = Math.max(0, depth - 1);
      if (!depth && /[,，、|｜]/.test(ch)) { out.push(buf); buf = ''; continue; }
      buf += ch;
    }
    out.push(buf);
    return out.map(x => x.trim()).filter(Boolean);
  };
  const unq = s => String(s || '').trim().replace(/^[「『"]\s*|\s*[」』"]$/g, '');
  const kv = line => {
    const m = line.match(/^([^:：]{1,20})[:：]\s*(.*)$/);
    return m ? [m[1].trim(), m[2].trim()] : [null, line.trim()];
  };

  /* ---------- 3. 글 → 칸 (data) ---------- */
  function parse(text) {
    const d = { meta: {}, warn: [], sec: {} };
    let cur = null;
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    for (let raw of lines) {
      const line = raw.replace(/^\s*[-*•]\s+/, '').trimEnd();
      if (/^\s*```/.test(line)) continue;                 // 코드블록 표시는 무시
      const h = line.match(/^\s*(?:[\[【]\s*(.+?)\s*[\]】]|#{2,}\s*(.+?))\s*$/);
      if (h) {
        const name = norm(h[1] || h[2]);
        cur = SEC[name] || null;
        if (!cur) d.warn.push(`모르는 칸 이름: [${h[1] || h[2]}] → 건너뛰어요`);
        else d.sec[cur] = d.sec[cur] || [];
        continue;
      }
      const [k, v] = kv(line);
      if (k && ['날짜', '일자', '관찰일자', 'date'].includes(norm(k))) { d.meta.date = v; continue; }
      if (!cur && (k && norm(k) === '관찰자' || /^\s*(세이\s*)?관찰\s*일지\s*$/.test(line))) continue;   // 제목·관찰자 줄은 틀에 이미 있어요
      if (k && ['번호', '일지번호', 'no'].includes(norm(k).toLowerCase())) { d.meta.no = v; continue; }
      if (!cur) { if (line.trim()) d.warn.push(`칸 밖의 줄: ${line.trim().slice(0, 30)}…`); continue; }
      d.sec[cur].push(line);
    }
    return d;
  }

  function dateInfo(str) {
    const m = String(str || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    const dt = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
    const y = dt.getFullYear(), mo = dt.getMonth() + 1, da = dt.getDate();
    const p2 = n => String(n).padStart(2, '0');
    return { y, m: mo, d: p2(da), mNum: mo, dNum: da, wday: WDAY[dt.getDay()],
      dot: `${y}.${p2(mo)}.${p2(da)}`, mmdd: p2(mo) + p2(da), ok: !!m };
  }

  // 섹션별로 칸 만들기
  function build(d, tplData = {}) {
    const S = d.sec, ctx = {};
    const lines = k => (S[k] || []).filter(l => l.trim());
    const pick = (name, i) => { const a = tplData[name]; return Array.isArray(a) && a.length ? a[i % a.length] : {}; };

    ctx.uid = Math.random().toString(36).slice(2, 7);
    ctx.date = dateInfo(d.meta.date);
    if (!ctx.date.ok) d.warn.push('날짜: 줄이 없어서 오늘 날짜를 넣었어요');
    ctx.no = esc(d.meta.no || '01');

    /* 프로필 */
    const dp = (tplData.defaults && tplData.defaults.p) || {};
    const p = { name: esc(dp.name || ''), kana: esc(dp.kana || ''), title: esc(dp.title || ''), guard: esc(dp.guard || ''), contact: esc(dp.contact || ''),
      skill: [], weak: [], like: [], dislike: [], say: '' };
    const list = (arr, v) => splitList(v).forEach(x => arr.push({ text: fmt(x) }));
    for (const l of lines('profile')) {
      const [k, v] = kv(l); const key = norm(k || '');
      if (key === '이름') {
        const [a, b] = splitBar(v);
        p.name = fmt(String(a || '').replace(/\s*[(（][^)）]*[)）]\s*$/, ''));   // "히비 세이 (日日 清)" → 히비 세이
        if (b) p.kana = fmt(b);
      }
      else if (['칭호', '별명', '称号'].includes(key)) { const [a, b] = splitBar(v); p.title = fmt(a); if (b) p.say = fmt(b); }
      else if (['보호자'].includes(key)) { const [a, b] = splitBar(v); p.guard = fmt(a); p.contact = b ? fmt(b) : ''; }
      else if (['특기', '스킬'].includes(key)) list(p.skill, v);
      else if (['약점'].includes(key)) list(p.weak, v);
      else if (['좋아', '좋아하는것', '좋아함', 'like'].includes(key.toLowerCase())) list(p.like, v);
      else if (['싫어', '싫어하는것', '싫어함', 'dislike'].includes(key.toLowerCase())) list(p.dislike, v);
      else if (['한마디', '쿄헤이', '코멘트', '속마음'].includes(key)) p.say = fmt(v);
      else d.warn.push(`프로필: 모르는 줄 "${l.trim().slice(0, 20)}"`);
    }
    p.skill.forEach((x, i) => x.num = NUMS[i] || `${i + 1}.`);
    p.weak.forEach((x, i) => x.num = NUMS[i] || `${i + 1}.`);
    ctx.p = p;

    /* 스테이터스 */
    ctx.status = lines('status').map((l, i) => {
      const [k, v] = kv(l);
      const parts = splitBar(v);
      let val = parseInt(parts[0], 10), cmt = parts.slice(1).join(' | ');
      if (isNaN(val)) { val = parseInt((parts[0].match(/\d+/) || [0])[0], 10); }
      if (parts.length === 1 && !/^\s*\d+(\s*\/\s*100)?\s*$/.test(parts[0])) cmt = parts[0].replace(/^\s*\d+(\s*\/\s*100)?\s*/, '');
      val = Math.max(0, Math.min(100, val || 0));
      return Object.assign({}, pick('status', i), { label: fmt(k || `칸${i + 1}`), val, cmt: fmt(cmt) });
    });

    /* 오늘의 세이 */
    ctx.today = lines('today').map((l, i) => {
      const [k, v] = kv(l);
      const SHORT = { '자주한표정': '표정', '오늘의냄새': '향기', '냄새': '향기' };
      return Object.assign({}, pick('today', i), { label: fmt(SHORT[norm(k || '')] || k || ''), text: fmt(v) });
    });

    /* 밀착 관찰 기록 (# 제목 | 시간 → 아래 줄들이 본문) */
    const memos = [];
    for (const l of (S.memos || [])) {
      const h = l.match(/^\s*#\s*(.+)$/) || l.match(/^\s*(?:기록|記録)\s*\d+\s*[:：.]?\s*(.+)$/);
      if (h) { const [t, time] = splitBar(h[1]); memos.push({ title: fmt(t), time: fmt(time || ''), body: [] }); continue; }
      if (!l.trim()) continue;
      if (!memos.length) memos.push({ title: '', time: '', body: [] });
      memos[memos.length - 1].body.push(fmt(l));
    }
    const nm = memos.length;
    ctx.memos = memos.map((m, i) => Object.assign({}, pick('memos', i), m, {
      body: m.body.join('<br>'), n: i + 1, nn: String(i + 1).padStart(2, '0'),
      first: i === 0, prev: i === 0 ? 1 : i, next: i === nm - 1 ? 1 : i + 2,
      dots: memos.map((_, j) => ({ on: j === i })),
    }));
    if (nm > 10) d.warn.push('관찰 기록은 10장까지만 넘겨져요');

    /* 공략 wiki */
    const pairs = k => lines(k).map(l => {
      const t = l.replace(/^\s*NEW!?\s*/i, '');
      if (/[|｜]/.test(t)) { const [a, ...b] = splitBar(t); return { k: fmt(a), v: fmt(b.join(' | ')) }; }
      const [a, b] = kv(t); return { k: fmt(a || ''), v: fmt(b) };
    });
    const EVAL = [
      { re: /[◎○⭕]|대성공|성공/, cls: 'o', mark: '◎', word: '대성공' },
      { re: /[△▲]|미묘/, cls: 'm', mark: '△', word: '미묘' },
      { re: /[×✕xX❌]|실패/, cls: 'x', mark: '×', word: '실패…' },
    ];
    const wiki = {
      found: pairs('found'),
      choice: lines('choice').map(l => {
        let act, res, ev;
        const m = l.match(/^\s*([◎○⭕△▲×✕xX❌])\s*(.+?)\s*(?:→|->|⇒)\s*(.+)$/);
        if (m) [ev, act, res] = [m[1], m[2], m[3]];
        else [act, res, ev] = splitBar(l);
        const e = EVAL.find(x => x.re.test(ev || '')) || { cls: 'm', mark: esc(ev || '?'), word: '' };
        return { act: fmt(act), res: fmt(res || ''), cls: e.cls, mark: e.mark, word: e.word };
      }),
      around: pairs('around'),
    };
    wiki.toc = [];
    ['found', 'choice', 'around'].forEach(k => {
      if (!wiki[k].length) return;
      const n = wiki.toc.length + 1;
      wiki['n' + k[0].toUpperCase() + k.slice(1)] = n;
      wiki.toc.push({ n, name: WIKI_TOC[k] });
    });
    if (wiki.toc.length) wiki.toc[wiki.toc.length - 1].last = true;
    ctx.wiki = wiki;

    /* 어록 (말: 대사 | 시간 · 답장: 쿄헤이 속마음) */
    const quote = { say: [], reply: '' };
    const replies = [];
    for (const l of lines('quote')) {
      const [k, v] = kv(l); const key = norm(k || '');
      if (/^\s*[「『]/.test(l)) { const [t, time] = splitBar(l); quote.say.push({ text: fmt(unq(t)), time: fmt(time || '') }); continue; }
      if (k && ['답장', '쿄헤이', '입력', '속마음', '감상'].includes(key)) { replies.push(fmt(v)); continue; }
      if (k && ['말', '세이', '대사', '어록'].includes(key)) { const [t, time] = splitBar(v); quote.say.push({ text: fmt(unq(t)), time: fmt(time || '') }); continue; }
      replies.push(fmt(l));   // 「」 없는 줄 = 쿄헤이 감상
    }
    quote.reply = replies.join('<br>');
    ctx.quote = quote;

    /* 세이어 사전 (단어: 뜻) */
    ctx.dict = lines('dict').map(l => {
      const m = l.match(/^\s*(.+?)\s*(?:→|->|⇒)\s*(.+)$/);
      const [k, v] = m ? [m[1], m[2]] : kv(l);
      return { word: fmt(unq(k)), mean: fmt(v) };
    });

    /* 진단서 */
    const karte = { rows: [], lines: [] };
    for (const l of lines('karte')) {
      const [k, v] = kv(l); const key = norm(k || '');
      const row = KARTE_ROWS.find(r => r.keys.includes(key));
      if (row) {
        let opts;
        if (/[|｜]/.test(v) || /\[.+\]/.test(v)) opts = splitBar(v).map(x => { const on = /^\[.*\]$/.test(x); return { text: fmt(x.replace(/^\[|\]$/g, '')), on }; });
        else {
          opts = row.opts.map(o => ({ text: esc(o), on: norm(o) === norm(v) }));
          if (!opts.some(o => o.on) && v) opts.push({ text: fmt(v), on: true });
        }
        karte.rows.push({ label: row.label, opts });
      } else if (k) karte.lines.push({ label: esc(KARTE_LINES[key] || k), text: fmt(v) });
    }
    if (karte.lines.length) karte.lines[karte.lines.length - 1].last = true;
    ctx.karte = karte;

    /* 엽서 */
    ctx.plan = lines('plan').map(fmt).join('<br>');
    // 총평: "🌸 참 잘했어요 | 한 줄 총평" → 도장 이모지·문구 + 총평
    ctx.stamp = { emoji: '💮', text: '참 잘했어요' };
    const rv = lines('review');
    if (rv.length && /[|｜]/.test(rv[0])) {
      const [st, ...rest] = splitBar(rv[0]);
      const EMO = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u;
      const em = st.match(EMO);
      if (em) ctx.stamp.emoji = em[0];
      const word = st.replace(EMO, '').replace(/^\s*도장\s*/, '').replace(/[()（）\[\]:：]/g, ' ').replace(/\s+/g, ' ').trim();
      if (word) ctx.stamp.text = esc(word);
      rv[0] = rest.join(' | ');
    }
    ctx.review = rv.filter(x => x.trim()).map(fmt).join('<br>');

    const pHas = !!(lines('profile').length);
    ctx.has = {
      profile: pHas, status: !!ctx.status.length, today: !!ctx.today.length,
      memos: !!nm, found: !!wiki.found.length, choice: !!wiki.choice.length, around: !!wiki.around.length,
      quote: !!(quote.say.length || quote.reply), dict: !!ctx.dict.length, karte: !!(karte.rows.length || karte.lines.length),
      card: !!(ctx.plan || ctx.review),
    };
    ctx.has.ss = ctx.has.status || ctx.has.today;
    ctx.has.wiki = !!wiki.toc.length;
    ctx.has.lab = ctx.has.quote || ctx.has.dict;
    return ctx;
  }

  /* ---------- 4. 틀 채우기 ({{칸}} · {{#목록}}…{{/목록}} · {{^없을때}}…{{/}}) ---------- */
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

  /* ---------- 5. 틀 파일 읽기 ---------- */
  function parseTpl(file, html) {
    const name = (html.match(/<!--\s*name\s*:\s*([^>]*?)\s*-->/i) || [])[1] || file.replace(/\.html?$/i, '');
    let data = {};
    const dm = html.match(/<script[^>]*class="tpl-data"[^>]*>([\s\S]*?)<\/script>/i);
    if (dm) { try { data = JSON.parse(dm[1]); } catch (e) { toast('틀의 tpl-data 표가 망가졌어요 (JSON)'); } }
    const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1].trim()).join('\n\n');
    const markup = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '').trim();
    return { file, name, data, css, markup };
  }

  // 결과 HTML: 빈 줄·들여쓰기 정리 (러브로그 등에서 줄바꿈이 간격으로 보이지 않게)
  const tidy = html => html.split('\n').map(l => l.trim()).filter(Boolean).join('\n');

  function convert(text, tpl, opt = {}) {
    const d = parse(text);
    const ctx = build(d, tpl.data);
    const body = tidy(renderTpl(tpl.markup, ctx));
    const html = opt.css === false ? body : `${body}\n<style>\n${tpl.css}\n</style>`;
    return { html, body, warn: d.warn, ctx };
  }

  /* ---------- 6. 작업대·보관함에서 쓰기 (서랍의 📓 관찰일지 글) ---------- */
  // 마지막으로 일지 페이지에서 읽은 틀 → 없으면 builtin-journals.js 의 복사본
  function currentTpl() {
    const list = store.json('journal.tpls', []);
    const want = store.get('journal.tpl', '');
    const t = list.find(x => x.file === want) || list[0] || (window.BUILTIN_JOURNALS || [])[0];
    return t ? parseTpl(t.file, t.html) : null;
  }
  // 칸 채우기 양식으로 쓴 글이면 틀로 바꿔서 { body, css, html, stats }, 아니면 null (옛날 HTML 일지 등)
  function renderForItem(text) {
    const d = parse(text);
    if (Object.keys(d.sec).length < 2) return null;
    const tpl = currentTpl();
    if (!tpl) return null;
    const r = convert(text, tpl);
    return { body: r.body, css: tpl.css, html: r.html, stats: { images: 0, status: 0 } };
  }

  return { parse, build, renderTpl, parseTpl, convert, currentTpl, renderForItem };
})();
window.Journal = Journal;   // 작업대·보관함(converter.js)에서 찾을 수 있게


/* =========================================================
   📄 페이지 동작
   ========================================================= */
(() => {
  const $ = id => document.getElementById(id);
  if (!$('jnIn')) return;

  const TPL_LIST_KEY = 'journal.tpls';
  let tpls = store.json(TPL_LIST_KEY, []);   // [{file, html}]
  let cur = null;

  async function loadTpls(force) {
    let files = [];
    try { files = (await Repo.list('journals')).filter(f => /\.html?$/i.test(f.name)); } catch (e) {}
    if (!files.length) files = [{ name: 'sei.html', path: 'journals/sei.html', url: 'journals/sei.html' }];
    const got = [];
    for (const f of files) {
      const old = tpls.find(t => t.file === f.name);
      if (old && !force) { got.push(old); continue; }
      try { got.push({ file: f.name, html: await Repo.text(f) }); } catch (e) { if (old) got.push(old); }
    }
    if (got.length) { tpls = got; store.set(TPL_LIST_KEY, JSON.stringify(tpls)); }
    renderSel();
  }

  function renderSel() {
    const sel = $('jnTpl'); const was = store.get('journal.tpl', '');
    sel.innerHTML = tpls.map(t => `<option value="${esc(t.file)}">${esc(Journal.parseTpl(t.file, t.html).name)}</option>`).join('')
      || '<option value="">(틀을 못 읽었어요)</option>';
    if (tpls.some(t => t.file === was)) sel.value = was;
    pickTpl();
  }

  function pickTpl() {
    const t = tpls.find(x => x.file === $('jnTpl').value);
    cur = t ? Journal.parseTpl(t.file, t.html) : null;
    store.set('journal.tpl', $('jnTpl').value);
    run();
  }

  function run() {
    const text = $('jnIn').value;
    store.set('journal.input', text);
    if (!cur) { $('jnOut').value = ''; return; }
    if (!text.trim()) { $('jnOut').value = ''; $('jnWarn').hidden = true; preview(''); return; }
    const r = Journal.convert(text, cur, { css: $('jnCss').checked });
    $('jnOut').value = r.html;
    $('jnWarn').hidden = !r.warn.length;
    $('jnWarn').innerHTML = r.warn.map(w => `⚠ ${esc(w)}`).join('<br>');
    preview(`${r.body}\n<style>${cur.css}</style>`);
  }

  function preview(html) {
    const f = $('jnFrame');
    f.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:10px 0 20px;background:#fff}</style></head><body>${html}</body></html>`;
  }
  $('jnFrame').addEventListener('load', () => {
    try { const doc = $('jnFrame').contentDocument; $('jnFrame').style.height = Math.max(200, doc.documentElement.scrollHeight + 4) + 'px'; } catch (e) {}
  });
  // 폰트가 늦게 뜨면 높이가 바뀌어서 한 번 더
  setInterval(() => { try { const doc = $('jnFrame').contentDocument; const h = doc.documentElement.scrollHeight + 4; if (Math.abs(parseInt($('jnFrame').style.height) - h) > 8) $('jnFrame').style.height = h + 'px'; } catch (e) {} }, 1500);

  let timer;
  $('jnIn').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 400); });
  $('jnTpl').addEventListener('change', pickTpl);
  $('jnCss').addEventListener('change', run);
  $('jnReload').addEventListener('click', async () => { await loadTpls(true); toast('틀을 다시 읽었어요 ♪'); });
  $('jnCopy').addEventListener('click', async () => { if (!$('jnOut').value) return toast('아직 결과가 없어요'); toast(await copyText($('jnOut').value) ? '📋 복사했어요 ♡' : '복사 실패… 직접 선택해서 복사해 주세요'); });
  const ask = (msg, ok) => Modal.open({ html: esc(msg), buttons: [{ label: '그만', value: false, cls: 'white' }, { label: ok, value: true, cls: 'pink', primary: true }] });
  $('jnSample').addEventListener('click', async () => { if ($('jnIn').value.trim() && !(await ask('지금 쓴 글을 예시로 바꿀까요?', '바꾸기'))) return; $('jnIn').value = JOURNAL_SAMPLE; run(); });
  $('jnClear').addEventListener('click', async () => { if (!(await ask('입력한 글을 비울까요?', '비우기'))) return; $('jnIn').value = ''; run(); });
  $('jnOocCopy').addEventListener('click', async () => toast(await copyText($('jnOoc').value) ? '📋 OOC 복사했어요 ♡' : '복사 실패…'));

  /* 🗄 서랍에 담기 · 💾 보관함에 저장 */
  const storyDate = () => { const r = Journal.parse($('jnIn').value); const di = r.meta.date && r.meta.date.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return di ? `${di[1]}.${di[2].padStart(2, '0')}.${di[3].padStart(2, '0')}` : ''; };
  const catSel = $('jnCat');
  function renderCats() {
    if (typeof Meta === 'undefined') return;
    const want = store.get('journal.cat', '') || Meta.defaultCat();
    catSel.innerHTML = Meta.cats().map(c => `<option value="${c.id}">${c.id === Meta.defaultCat() ? '★ ' : ''}${esc(c.name)}</option>`).join('');
    catSel.value = Meta.cats().some(c => c.id === want) ? want : Meta.defaultCat();
  }
  catSel.addEventListener('change', () => store.set('journal.cat', catSel.value));
  const titleNow = () => ($('jnTitle').value.trim() || '관찰일지' + (storyDate() ? ' ' + storyDate() : ''));
  $('jnIn').addEventListener('input', () => { $('jnTitle').placeholder = '관찰일지' + (storyDate() ? ' ' + storyDate() : ''); });
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let savedId = null, savedText = null;   // 같은 글을 두 번 저장하면 덮어쓰기
  $('jnDrawer').addEventListener('click', () => {
    const text = $('jnIn').value.trim();
    if (!text) return toast('먼저 일지를 붙여넣어 주세요');
    const items = store.json('wb.drawer', []);
    if (items.some(x => x.type === 'journal' && x.text.trim() === text)) return Modal.alert('이미 서랍에 있는 일지예요');
    const base = titleNow();
    const same = items.filter(x => x.type === 'journal' && x.cat === catSel.value && (x.base || '').trim() === base);
    items.push({ id: newId(), base, no: same.length ? Math.max(...same.map(x => x.no || 1)) + 1 : 1, text, type: 'journal', cat: catSel.value,
      request: '', storyDate: storyDate(), done: false, bookmark: null, vaultAt: 0, addedAt: Date.now() });
    store.setJson('wb.drawer', items);
    toast('🗄 작업대 서랍(📓 관찰일지)에 담았어요!');
  });
  $('jnVault').addEventListener('click', async () => {
    const text = $('jnIn').value.trim();
    if (!text) return toast('먼저 일지를 붙여넣어 주세요');
    if (!Vault.configured()) {
      if (await Modal.open({ html: '깃허브 보관함이 아직 연결되지 않았어요.<br>보관함 페이지에서 연결할까요?', buttons: [{ label: '그만', value: false, cls: 'white' }, { label: '연결하러 가기', value: true, cls: 'pink', primary: true }] })) location.href = 'vault.html';
      return;
    }
    const btn = $('jnVault'); btn.disabled = true; btn.textContent = '⏳ 저장 중…';
    try {
      if (savedText !== text) savedId = null;
      const id = savedId || newId();
      await Vault.savePost({ id, title: titleNow(), cat: catSel.value, type: 'journal', text, request: '', storyDate: storyDate(),
        savedAt: Date.now(), stats: { status: 0, images: 0, chars: text.length } });
      savedId = id; savedText = text;
      toast('💾 보관함에 저장했어요! (🗂 보관함 → 📓 관찰일지)');
    } catch (e) { Modal.alert('⚠️ 저장 못 했어요<br><small>' + esc(e.message) + '</small>'); }
    btn.disabled = false; btn.textContent = '💾 보관함에 저장';
  });
  renderCats();
  window.addEventListener('meta-changed', renderCats);

  $('jnIn').value = store.get('journal.input', '');
  $('jnTitle').placeholder = '관찰일지' + (storyDate() ? ' ' + storyDate() : '');
  $('jnOoc').value = JOURNAL_OOC;
  loadTpls(false);
})();
