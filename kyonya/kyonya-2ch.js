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
      if ((m = t.match(/^\[스레\]\s*(.*)$/))) { endRes(); th = { board: board, cat: cat, title: m[1], res: [], summary: '' }; threads.push(th); return; }
      if ((m = t.match(/^\[스레\s*한\s*줄\s*요약\]\s*(.*)$/))) { endRes(); summary = m[1]; return; }
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

  /* ---------- 블로그: <pre class="ch2"> 자동 변환 ---------- */
  function mount(root) {
    (root || document).querySelectorAll('pre.ch2:not([data-done])').forEach(function (pre) {
      var html = render(pre.textContent);
      if (!html) return;
      pre.setAttribute('data-done', '1');
      var box = document.createElement('div'); box.innerHTML = html;
      pre.style.display = 'none';
      pre.parentNode.insertBefore(box.firstChild, pre);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mount(); }); else mount();

  window.Ch2 = { CATS: CATS, classify: classify, parse: parse, render: render, mount: mount };
})();
