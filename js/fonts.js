/* =========================================================
   🔤 FontLib — 폰트 모음
   ---------------------------------------------------------
   · 사이트 저장소의 fonts/ 폴더 안 .css 파일을 읽어요
     (파일 하나 = 분류 하나, 파일 이름 앞 "01_" 같은 번호는 빼고 보여줘요)
   · 파일 안에는 @font-face 를 그대로 붙여넣기만 하면 돼요
   · @font-face 바로 위에 「종류 | 지원 글자 | 메모」 를 CSS 주석으로 달면 정보로 읽어요
       (예: 픽셀 | 한·일·영 | 12px 배수에서 선명)
   · url("내폰트.ttf") 처럼 주소가 짧으면 fonts/ 폴더 안 파일로 봐요
   · 같은 이름(font-family)이 여러 번 나오면 (굵기별 등) 하나로 합쳐요
   ========================================================= */
const FontLib = (() => {
  const KEY = 'fontlib.list';
  const BUILTIN = [
    { family: 'Mona12', group: '기본', kind: '픽셀', langs: '한·일·영', memo: '12px 배수에서 선명해요',
      css: '@font-face { font-family: "Mona12"; src: url("https://cdn.jsdelivr.net/gh/MonadABXY/mona-font@main/web/Mona12.woff2") format("woff2"); font-display: swap; }' },
    { family: 'ThinMulmaru', group: '기본', kind: '픽셀 · 둥근', langs: '한·일·영', memo: '',
      css: '@font-face { font-family: "ThinMulmaru"; src: url("https://cdn.jsdelivr.net/gh/Project-Noonnu/2607161321@thinmulmaru/thinmulmaru/ThinMulmaru.woff2") format("woff2"); font-display: swap; }' },
    { family: 'Umdot12', group: '기본', kind: '픽셀', langs: '한·영', memo: '',
      css: '@font-face { font-family: "Umdot12"; src: url("https://cdn.jsdelivr.net/gh/MonadABXY/umdot-font@main/woff2/Umdot12.woff2") format("woff2"); font-display: swap; }' }
  ].map(f => ({ ...f, builtin: true }));

  // 짧은 주소 → fonts/ 폴더 주소
  function resolveUrls(css) {
    return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
      u = u.trim();
      if (/^(https?:|data:|\/\/)/.test(u)) return m;
      const path = 'fonts/' + u.replace(/^\.?\/?(fonts\/)?/, '');
      return `url("${typeof Repo !== 'undefined' && Repo.info() ? Repo.cdn(path) : path}")`;
    });
  }

  function parse(group, text) {
    const out = new Map();
    const re = /(?:\/\*([\s\S]*?)\*\/\s*)?@font-face\s*{[^}]*}/g;
    let m;
    while ((m = re.exec(text))) {
      const block = m[0].replace(/^\/\*[\s\S]*?\*\/\s*/, '');
      const fam = (block.match(/font-family\s*:\s*(['"]?)([^;'"]+)\1/) || [])[2];
      if (!fam) continue;
      const family = fam.trim();
      const meta = (m[1] || '').split('|').map(s => s.trim());
      const css = resolveUrls(block);
      if (out.has(family)) { out.get(family).css += '\n' + css; continue; }
      out.set(family, { family, group, kind: meta[0] || '', langs: meta[1] || '', memo: meta[2] || '', css });
    }
    return [...out.values()];
  }

  function cached() {
    const mine = store.json(KEY, []) || [];
    const names = new Set(mine.map(f => f.family));
    return BUILTIN.filter(f => !names.has(f.family)).concat(mine);
  }
  const get = family => cached().find(f => f.family === family) || null;

  // 페이지에 @font-face 전부 넣기 (실제로 쓰는 폰트만 브라우저가 받아요)
  function inject() {
    let st = document.getElementById('fontlibFaces');
    if (!st) { st = document.createElement('style'); st.id = 'fontlibFaces'; document.head.appendChild(st); }
    st.textContent = cached().map(f => f.css).join('\n');
  }

  async function refresh() {
    const files = (await Repo.list('fonts')).filter(f => /\.css$/i.test(f.name));
    let all = [];
    for (const f of files) {
      try { all = all.concat(parse(f.name.replace(/\.css$/i, '').replace(/^\d+[_\-. ]+/, ''), await Repo.text(f))); }
      catch (e) { console.warn(e); }
    }
    store.setJson(KEY, all);
    inject();
    return cached();
  }

  // ★ 즐겨찾기 (보관함 연결 시 같이 저장)
  const favs = () => (typeof Meta !== 'undefined' && Meta.favFonts) ? Meta.favFonts() : (store.json('fontlib.fav', []) || []);
  function toggleFav(family) {
    if (typeof Meta !== 'undefined' && Meta.toggleFavFont) return Meta.toggleFavFont(family);
    const f = favs(); store.setJson('fontlib.fav', f.includes(family) ? f.filter(x => x !== family) : f.concat(family));
  }

  // 글꼴 고르는 <select> 용 옵션 (★ 즐겨찾기 → 분류별)
  function optionsHtml(selected, extra = []) {
    const all = cached(), fav = favs();
    const opt = (v, label) => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(label)}</option>`;
    let html = extra.map(([v, l]) => opt(v, l)).join('');
    const favList = fav.map(get).filter(Boolean);
    if (favList.length) html += `<optgroup label="★ 즐겨찾기">${favList.map(f => opt('lib:' + f.family, '★ ' + f.family)).join('')}</optgroup>`;
    [...new Set(all.map(f => f.group))].forEach(g => {
      html += `<optgroup label="📁 ${esc(g)}">${all.filter(f => f.group === g).map(f => opt('lib:' + f.family, f.family)).join('')}</optgroup>`;
    });
    return html;
  }

  inject();
  return { BUILTIN, parse, cached, get, inject, refresh, favs, toggleFav, optionsHtml };
})();
