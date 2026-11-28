/* =========================================================
   📺 2ch 스레 변환기 — kyonya-2ch.js
   · 블로그(401채널 글)와 작업대 2ch 페이지가 같이 써요
   · 블로그: 글 안의 <pre class="ch2">원문</pre> 를 찾아서 2ch 화면으로 바꿔요
   · 작업대: Ch2.parse(글) / Ch2.render(글) 로 미리보기
   ========================================================= */
(function () {
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  /* ---------- 카테고리 (탭 · 자동 분류에 같이 씀) ---------- */
  var CATS = [
    { id: 'news',    emo: '📰', label: '속보·뉴스',  keys: ['속보', '뉴스', '速報', '悲報', '朗報'] },
    { id: 'live',    emo: '⚾', label: '실황',       keys: ['실황', '実況', '중계'] },
    { id: 'main',    emo: '💙', label: '본스레(종합)', keys: ['본스레', '종합', '総合', '전임'] },
    { id: 'player',  emo: '👤', label: '선수 개별',   keys: ['선수', '응원', '応援'] },
    { id: 'seen',    emo: '👀', label: '목격 정보',   keys: ['목격', '目撃'] },
    { id: 'mystery', emo: '❓', label: '수수께끼(구단주 대리 정체 추측)', keys: ['수수께끼', '구단주', '球団主', '謎'] },
    { id: 'anti',    emo: '🔥', label: '아라시·안티', keys: ['아라시', '안티', '荒らし', 'アンチ'] },
    { id: 'fan',     emo: '💗', label: '여성 팬',     keys: ['여성', '女'] }
  ];
  function classify(catText, title) {
    var hit = function (s) {
      s = String(s || ''); if (!s) return '';
      for (var i = 0; i < CATS.length; i++) for (var k = 0; k < CATS[i].keys.length; k++) if (s.indexOf(CATS[i].keys[k]) > -1) return CATS[i].id;
      return '';
    };
    return hit(catText) || hit(title) || '';
  }

  /* ---------- 글 읽기 ---------- */
  var RES = /^(\d+)\s*:\s*(.*?)\s*:\s*(\d{4}\/\d{1,2}\/\d{1,2}\s*(?:\([^)]*\))?\s*[\d:.]*)\s*ID\s*:\s*(\S+)\s*$/;
  function parse(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n');
    var board = '', cat = '', summary = '', threads = [], th = null, res = null;
    function endRes() { if (res) { while (res.lines.length && !res.lines[res.lines.length - 1].trim()) res.lines.pop(); res.body = res.lines.join('\n'); delete res.lines; } res = null; }
    lines.forEach(function (ln) {
      var t = ln.trim(), m;
      if (/^```/.test(t)) return;
      if ((m = t.match(/^\[게시판\]\s*(.*)$/))) { endRes(); board = m[1]; return; }
      if ((m = t.match(/^\[카테고리\]\s*(.*)$/))) { endRes(); cat = m[1]; if (th && !th.res.length) th.cat = cat; return; }
      if ((m = t.match(/^\[스레\]\s*(.*)$/))) {   // 같은 제목이 또 나오면 그 스레에 이어 붙여요
        endRes(); var key = m[1].replace(/\s+/g, '');
        th = threads.filter(function (x) { return x.title.replace(/\s+/g, '') === key; })[0];
        if (!th) { th = { board: board, cat: cat, title: m[1], res: [], summary: '' }; threads.push(th); }
        return;
      }
      if ((m = t.match(/^\[스레\s*한\s*줄\s*요약\]\s*(.*)$/))) { endRes(); summary = m[1]; if (th) th.summary = m[1]; return; }
      if (/^\[2ch\]$/i.test(t)) return;
      if (/^-{3,}$/.test(t)) { endRes(); return; }
      if ((m = t.match(RES))) {
        endRes();
        if (!th) { th = { board: board, cat: cat, title: '', res: [], summary: '' }; threads.push(th); }
        res = { no: +m[1], name: m[2] || '名無しさん', date: m[3].trim(), id: m[4], lines: [] };
        th.res.push(res); return;
      }
      if (res) res.lines.push(ln.replace(/\s+$/, ''));
    });
    endRes();
    threads.forEach(function (x) {
      x.res.sort(function (a, b) { return a.no - b.no; });
      if (!x.summary) x.summary = summary;
      x.catId = classify(x.cat, x.title);
      x.last = x.res.reduce(function (a, r) { return Math.max(a, r.no); }, 0);
    });
    return threads;
  }

  /* ---------- 2ch 화면 만들기 ---------- */
  var PAL = ['#d9468b', '#2f7fd1', '#2e9a5b', '#c7701b', '#8a54c9', '#c2414b', '#178a8a', '#9a7a14'];
  function idColor(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return PAL[h % PAL.length]; }
  function isAA(body) {
    var ls = body.split('\n');
    if (ls.length < 3) return false;
    var n = ls.filter(function (l) { return /[　 ]{3,}|[／＼￣＿|｜]{1}.*[／＼￣＿|｜]|（[●・]）|__人__/.test(l); }).length;
    return n >= 2;
  }
  function inline(s) {
    return esc(s)
      .replace(/==(.+?)==/g, '<b class="c2-hl">$1</b>')
      .replace(/&gt;&gt;(\d+)/g, '<a class="c2-anc" data-to="$1">&gt;&gt;$1</a>');
  }
  function render(src, opt) {
    opt = opt || {};
    var threads = typeof src === 'string' ? parse(src) : src;
    if (!threads.length) return '';
    return '<div class="c2">' + threads.map(function (th) {
      var first = th.res[0], cnt = {}, seen = {};
      th.res.forEach(function (r) { cnt[r.id] = (cnt[r.id] || 0) + 1; });
      var c = CATS.filter(function (x) { return x.id === th.catId; })[0];
      return '<div class="c2-th">' +
        '<div class="c2-hd"><span class="c2-board">' + esc(th.board || 'なんでも実況J') + '</span>' +
          (th.cat ? '<span class="c2-cat">' + (c ? c.emo + ' ' : '') + esc(th.cat) + '</span>' : '') + '</div>' +
        '<h3 class="c2-title">' + esc(th.title || '(제목 없음)') + '</h3>' +
        '<div class="c2-list">' + th.res.map(function (r) {
          seen[r.id] = (seen[r.id] || 0) + 1;
          var aa = isAA(r.body), hot = /==.+?==/.test(r.body);
          var body = aa ? '<pre class="c2-aa">' + esc(r.body.replace(/==/g, '')) + '</pre>'
                        : r.body.split('\n').map(inline).join('<br>');
          return '<div class="c2-r' + (hot ? ' hot' : '') + '" data-no="' + r.no + '">' +
            '<div class="c2-rh"><span class="c2-no">' + r.no + '</span> : <b class="c2-nm">' + esc(r.name) + '</b> : <span class="c2-dt">' + esc(r.date) + '</span> ' +
            '<span class="c2-id" style="color:' + (cnt[r.id] > 1 ? idColor(r.id) : 'inherit') + '">ID:' + esc(r.id) + '</span>' +
            (cnt[r.id] > 1 ? ' <span class="c2-cnt">(' + seen[r.id] + '/' + cnt[r.id] + ')</span>' : '') +
            (first && r.id === first.id ? ' <span class="c2-ichi">イッチ</span>' : '') + '</div>' +
            '<div class="c2-rb">' + body + '</div></div>';
        }).join('') + '</div>' +
        (opt.summary && th.summary ? '<div class="c2-sum"><b>📝 한줄 요약</b> ' + esc(th.summary) + '</div>' : '') +
      '</div>';
    }).join('') + '</div>';
  }

  /* ---------- >>앵커에 올리면 그 레스 미리보기 ---------- */
  var pop = null;
  function hidePop() { if (pop) { pop.remove(); pop = null; } }
  function showPop(a) {
    hidePop();
    var th = a.closest('.c2-th'), r = th && th.querySelector('.c2-r[data-no="' + a.getAttribute('data-to') + '"]');
    pop = document.createElement('div'); pop.className = 'c2 c2-pop';
    pop.innerHTML = r ? r.outerHTML : '<div class="c2-r"><div class="c2-rb">그 레스는 이 스레에 없어요 (´・ω・｀)</div></div>';
    document.body.appendChild(pop);
    var b = a.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.left = Math.max(6, Math.min(b.left + scrollX, scrollX + innerWidth - w - 6)) + 'px';
    pop.style.top = (b.bottom + scrollY + 4) + 'px';
  }
  document.addEventListener('mouseover', function (e) { var a = e.target.closest && e.target.closest('.c2-anc'); if (a) showPop(a); else if (pop && !e.target.closest('.c2-pop')) hidePop(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.c2-anc');
    if (a) { e.preventDefault(); showPop(a); } else if (pop && !e.target.closest('.c2-pop')) hidePop();
  });

  /* ---------- 블로그: <pre class="ch2"> 자동 변환 (한 글에 여러 개면 이어 붙여서 하나로) ---------- */
  function mount(root) {
    var groups = [];
    (root || document).querySelectorAll('pre.ch2:not([data-done])').forEach(function (pre) {
      var g = groups.filter(function (x) { return x.parent === pre.parentNode; })[0];
      if (!g) { g = { parent: pre.parentNode, pres: [] }; groups.push(g); }
      g.pres.push(pre);
    });
    groups.forEach(function (g) {
      var html = render(g.pres.map(function (p) { return p.textContent; }).join('\n'));
      if (!html) return;
      var box = document.createElement('div'); box.innerHTML = html;
      g.parent.insertBefore(box.firstChild, g.pres[0]);
      g.pres.forEach(function (p) { p.setAttribute('data-done', '1'); p.style.display = 'none'; });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mount(); }); else mount();

  /* ---------- 로그 통째로 붙여도 2ch 답변만 골라내기 ---------- */
  // [2ch] 한 줄로 시작 → 한줄 요약 줄 / 코드블록 끝 / 다음 OOC 직전까지. 레스가 하나도 없는 덩어리(OOC 양식 예시)는 버려요
  function htmlToText(t) {
    if (!/<\/?(p|div|br|span|li)[\s>/]/i.test(t) || typeof DOMParser === 'undefined') return t;
    var d = new DOMParser().parseFromString(t.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '$&\n'), 'text/html');
    return d.body.textContent;
  }
  function extract(text) {
    var lines = htmlToText(String(text || '')).replace(/\r/g, '').split('\n'), segs = [], cur = null;
    lines.forEach(function (ln) {
      var t = ln.trim();
      if (/^\[2ch\]$/i.test(t)) { if (cur) segs.push(cur); cur = [ln]; return; }
      if (!cur) return;
      if (/^```/.test(t) || /^\(?\s*OOC\s*:/i.test(t)) { segs.push(cur); cur = null; return; }
      cur.push(ln);
      if (/^\[스레\s*한\s*줄\s*요약\]/.test(t)) { segs.push(cur); cur = null; }
    });
    if (cur) segs.push(cur);
    segs = segs.map(function (x) { return x.join('\n').trim(); }).filter(function (x) { return parse(x).some(function (th) { return th.res.length; }); });
    return segs;
  }

  /* ---------- 스레 하나 → 원문 글 (게시용으로 스레별로 나눌 때) ---------- */
  function toText(th) {
    return ['[2ch]', '[게시판] ' + (th.board || 'なんでも実況J'), '[카테고리] ' + (th.cat || ''), '[스레] ' + th.title, ''].join('\n') +
      th.res.map(function (r) { return r.no + ' : ' + r.name + ' : ' + r.date + ' ID:' + r.id + '\n' + r.body; }).join('\n\n') +
      (th.summary ? '\n\n[스레 한줄 요약] ' + th.summary : '');
  }

  window.Ch2 = { CATS: CATS, classify: classify, parse: parse, render: render, mount: mount, extract: extract, toText: toText };
})();

/* =========================================================
   📺 블로그 401채널: 화면 전체를 2ch 게시판으로 (kyonya-data.js 의 KY.CH2 가 있을 때만)
   · 목록 = 왼쪽 게시판 메뉴 + 게시판 머리 + 스레 목록 / 글 = 스레 화면 (메뉴 없음)
   · 글 제목: {2/1} 스레 제목 (159)  ← 끝의 (숫자)가 레스 수로 나와요
   ========================================================= */
(function () {
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var DEF = {
    board: 'なんでも実況J', path: '401チャンネル ＞ 実況ch ＞ なんでも実況J', logo: '401チャンネル', logoSub: 'ｷｮﾆｬ通信 支部',
    back: '■ 쿄냐통신으로 돌아가기 ■',
    rules: ['이름 없는 분들의 글은 전부 망상입니다', '실존 구단·인물과는 관계없습니다', '아라시는 무시, 도발에 반응하는 것도 아라시입니다 (｀・ω・´)', '스레 세우기 전에 {로컬 룰}을 읽어 주세요'],
    lrules: ['요코하마 블루윙즈 이야기는 여기서 자유롭게', '스레 제목에는 【速報】【実況】 같은 말머리를 붙여 주세요', '선수 사생활 추측·미행은 금지 (목격담은 적당히)',
      '구단주 대리 이야기는 「謎・オカルト」 스레에서만', '드래곤즈 팬 출입은 자유, 도발은 금지', '1000을 넘으면 다음 스레를 세운 사람이 이치', '아라시는 무시가 최고 (´・ω・｀)'],
    menu: [['案内', ['401chの歩き方', '初心者はここ', 'ローカルルール集']], ['ニュース', ['ニュース速報', 'ニュース速報+', '芸スポ速報+']],
      ['実況ch', ['★なんでも実況J', '実況 野球', '番組ch']], ['スポーツ', ['プロ野球', 'ドラゴンズ', 'メジャー', '高校野球']],
      ['街の話題', ['目撃情報', '沖縄', '東京']], ['謎・オカルト', ['オカルト', '未解決事件']], ['趣味', ['アイドル', '女性ファン', 'スイーツ']], ['雑談', ['ニュー速VIP', '雑談']]],
    adTop: { cls: 'ad1', html: '<span>⚾ 横浜ブルーウィングス</span><span class="big">応援グッズ大放出！</span>' },
    adBottom: [{ cls: 'ad2', html: '<span class="big">🥷 ニンジャ加盟店募集</span><span>死亡保険未適用</span>' }, { cls: 'ad3', html: '&gt; 401ch専用ブラウザ『しゃべるくん』_' }]
  };
  function ad(a) {
    if (!a) return '';
    var inner = a.img ? '<img src="' + esc(a.img) + '" alt="">' : (a.html || '');
    return '<a class="ch-ad ' + (a.img ? 'img' : (a.cls || '')) + '" href="' + esc(a.href || '#soon') + '"' + (a.href ? ' target="_blank" rel="noopener"' : '') + '><small>PR</small>' + inner + '</a>';
  }
  function lrPop(C) {
    var d = document.createElement('div'); d.className = 'ch-lr-bg';
    d.innerHTML = '<div class="ch-lr"><div class="ch-lr-t"><span>📜 ' + esc(C.board) + ' ローカルルール</span><button class="ch-lr-x">×</button></div><div class="ch-lr-b"><h4>■ ' + esc(C.board) + ' 로컬 룰 ■</h4><ol>' +
      C.lrules.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ol><div class="ps">※ 규칙을 안 지키는 레스는 삭제될 수 있습니다 by 401ch 운영진</div></div></div>';
    document.body.appendChild(d);
  }
  function stripN(t) { var m = t.match(/\s*[（(]\s*(\d+)\s*[)）]\s*$/); return { t: m ? t.slice(0, m.index) : t, n: m ? +m[1] : null }; }

  function board() {
    var KY = window.KY || {}, U = KY.CH2; if (!U || !U.cat || !window.Ch2) return;
    var C = {}; for (var k in DEF) C[k] = DEF[k]; for (k in U) C[k] = U[k];
    var hb = document.querySelector('.la-list .la-hb'), catA = document.querySelector('.la-post .la-cat');
    var path = decodeURIComponent(location.pathname);
    var isList = !!(hb && path.indexOf('/category/') > -1 && path.indexOf(C.cat) > -1);
    var isPost = !!(catA && catA.textContent.trim().indexOf(C.cat) === 0);
    if (!isList && !isPost) return;
    var home = isPost ? catA.href : location.pathname;
    var scr = document.createElement('div'); scr.id = 'chScreen';

    if (isList) {
      var items = [].map.call(document.querySelectorAll('.la-list li'), function (li) {
        var a = li.querySelector('a'), sum = (li.querySelector('.sum') || {}).textContent || '';
        var raw = a.textContent.replace(/^🔒\s*/, ''), x = stripN(raw.trim());
        var cm = sum.match(/\[카테고리\]\s*([^\[\n]+)/);
        return { href: a.href, t: x.t, n: x.n, lock: li.classList.contains('lock'), cat: Ch2.classify(cm ? cm[1] : '', x.t) };
      });
      var menu = '<nav class="ch-bm"><div class="ch-logo">' + esc(C.logo) + '<small>' + esc(C.logoSub) + '</small></div><a class="ch-back" href="/">' + esc(C.back) + '</a>' +
        C.menu.map(function (g) { return '<b>' + esc(g[0]) + '</b>' + g[1].map(function (n) { return n.charAt(0) === '★' ? '<a class="here" href="' + esc(home) + '">' + esc(n.slice(1)) + '</a>' : '<a class="soon" href="#soon">' + esc(n) + '</a>'; }).join(''); }).join('') +
        '<div class="ch-ft">401ch since 2014<br>(´・ω・｀) 準備中の板が多いよ</div></nav>';
      var head = ad(C.adTop) + '<div class="ch-bh"><div class="ch-bt">' + esc(C.board) + '</div><div class="ch-path">' + esc(C.path) + '</div>' +
        '<table class="ch-rule"><tr><td>' + C.rules.map(function (r) { return '■ ' + esc(r).replace(/\{(.+?)\}/, '<a href="#" class="ch-lr-open">$1</a>'); }).join('<br>') + '</td></tr></table></div>' +
        '<div class="ch-cats"><a class="on" href="#" data-cat="">全部</a>' + Ch2.CATS.map(function (c) { return '<a href="#" data-cat="' + c.id + '">' + c.emo + ' ' + c.label.replace(/\(.*\)/, '') + '</a>'; }).join('') + '</div>';
      var list = '<div class="ch-subj"><div class="ch-st">スレッド一覧 (最新順)</div>' + (items.length ? '<ol class="ch-sl">' + items.map(function (x, i) {
        var c = Ch2.CATS.filter(function (y) { return y.id === x.cat; })[0];
        return '<li data-cat="' + x.cat + '"' + (x.lock ? ' class="lock"' : '') + '><span class="n">' + (i + 1) + ':</span><span class="k">' + (c ? c.emo : '📄') + '</span><a href="' + esc(x.href) + '">' + (x.lock ? '🔒 ' : '') + esc(x.t) + '</a>' + (x.n != null ? ' <span class="c">(' + x.n + ')</span>' : '') + '</li>';
      }).join('') + '</ol>' : '<div class="ch-none">まだスレがありません (´・ω・｀)</div>') + '<div class="ch-pg"></div></div>';
      var form = '<div class="ch-new">新規スレッド作成　タイトル：<input size="30" disabled> <button disabled>新規スレッド作成</button><textarea disabled>名前：風吹けば名無し</textarea></div>';
      scr.innerHTML = '<div class="ch-screen">' + menu + '<div class="ch-main">' + head + list + form + '<div class="ch-ads">' + C.adBottom.map(ad).join('') + '</div></div></div>';
      var pg = document.querySelector('.paging'); if (pg) scr.querySelector('.ch-pg').appendChild(pg);
      scr.addEventListener('click', function (e) {
        var b = e.target.closest('[data-cat]'); if (!b || b.tagName !== 'A') return; e.preventDefault();
        scr.querySelectorAll('.ch-cats a').forEach(function (x) { x.classList.toggle('on', x === b); });
        scr.querySelectorAll('.ch-sl li').forEach(function (li) { li.style.display = !b.dataset.cat || li.dataset.cat === b.dataset.cat ? '' : 'none'; });
      });
    } else {
      Ch2.mount();
      var c2 = document.querySelector('.la-post .c2');
      var pv = document.querySelector('.la-nav .p a'), nx = document.querySelector('.la-nav .n a');
      var nm = function (a) { return a ? esc(stripN(a.textContent.replace(/[«»]/g, '').trim()).t) : ''; };
      var bar = '<div class="ch-vbar"><a class="ch-back2" href="/">' + esc(C.back) + '</a><a href="' + esc(home) + '">■掲示板に戻る■</a>' +
        '<a href="#" data-r="all">全部</a><a href="#" data-r="100">1-100</a><a href="#" data-r="50">最新50</a></div>';
      scr.innerHTML = '<div class="ch-screen post"><div class="ch-main">' + bar + ad(C.adTop) + '<div class="ch-body"></div>' +
        '<div class="ch-vbar">' + (pv ? '<a href="' + esc(pv.href) + '">« ' + nm(pv) + '</a>' : '') + '<a href="' + esc(home) + '">■掲示板に戻る■</a>' + (nx ? '<a href="' + esc(nx.href) + '">' + nm(nx) + ' »</a>' : '') + '</div>' +
        '<div class="ch-ads">' + C.adBottom.map(ad).join('') + '</div></div></div>';
      if (c2) scr.querySelector('.ch-body').appendChild(c2);
      else scr.querySelector('.ch-body').innerHTML = '<div class="ch-none">스레 원문(<code>&lt;pre class="ch2"&gt;</code>)이 없는 글이에요</div>';
      scr.addEventListener('click', function (e) {
        var b = e.target.closest('[data-r]'); if (!b) return; e.preventDefault();
        var rs = scr.querySelectorAll('.c2-r'), n = rs.length;
        rs.forEach(function (r, i) { r.style.display = b.dataset.r === 'all' || (b.dataset.r === '100' && i < 100) || (b.dataset.r === '50' && i >= n - 50) ? '' : 'none'; });
      });
      document.title = document.title.replace(/^\s*[【{｛]\s*(?:\d{4}\D)?\d{1,2}\D\d{1,2}\s*[】}｝]\s*/, '').replace(/\s*[（(]\s*\d+\s*[)）](?=\s*(?:::|$))/, '');
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest('.ch-lr-open')) { e.preventDefault(); lrPop(C); return; }
      if (e.target.closest('.ch-lr-x') || (e.target.classList && e.target.classList.contains('ch-lr-bg'))) { var x = document.querySelector('.ch-lr-bg'); if (x) x.remove(); }
    });
    document.body.appendChild(scr);
    document.body.classList.add('ch-mode');
    scrollTo(0, 0);
  }
  // 화면 가리개(skin.html 머리의 ch-wait)는 2ch든 아니든 다 그린 뒤에 벗겨요
  function run() { try { board(); } finally { document.documentElement.classList.remove('ch-wait'); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
