/* =========================================================
   📁 사이트 저장소의 폴더 읽기 (templates/ · emoji/ · fonts/)
   ---------------------------------------------------------
   · 사이트가 깃허브 페이지(https://아이디.github.io/저장소/)에 올라가 있으면
     주소를 보고 저장소를 알아서 찾아요 → 폴더에 파일만 넣으면 자동으로 목록에 떠요
   · PC에서 더블클릭으로 열면 폴더 목록을 못 읽어요 (마지막으로 읽은 목록을 대신 써요)
   · 공개 저장소라 토큰이 필요 없어요
   ========================================================= */
const Repo = (() => {
  function info() {
    const manual = store.json('repo.cfg', null);
    if (manual && manual.owner && manual.repo) return manual;
    const h = location.hostname;
    if (!h.endsWith('.github.io')) return null;
    const owner = h.split('.')[0];
    const seg = location.pathname.split('/').filter(Boolean)[0];
    const repo = seg && !seg.includes('.') ? seg : `${owner}.github.io`;
    return { owner, repo };
  }

  // 폴더 안 파일 목록 → [{ name, path, url }]
  async function list(folder) {
    const r = info();
    if (!r) throw new Error('깃허브 페이지에 올린 사이트에서만 폴더를 읽을 수 있어요');
    const res = await fetch(`https://api.github.com/repos/${r.owner}/${r.repo}/contents/${folder}`);
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`폴더를 못 읽었어요 (${res.status})`);
    return (await res.json()).filter(f => f.type === 'file').map(f => ({ name: f.name, path: f.path, url: f.download_url }));
  }

  // 파일 내용 (같은 사이트 주소로 먼저, 안 되면 깃허브 원본으로)
  async function text(file) {
    try { const r = await fetch(file.path, { cache: 'no-cache' }); if (r.ok) return await r.text(); } catch (e) {}
    const r = await fetch(file.url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${file.name} 을(를) 못 읽었어요`);
    return r.text();
  }

  // jsDelivr 주소 (폰트처럼 티스토리·러브로그에서도 불러올 파일용)
  function cdn(path) { const r = info(); return r ? `https://cdn.jsdelivr.net/gh/${r.owner}/${r.repo}@main/${path}` : path; }

  return { info, list, text, cdn };
})();

/* =========================================================
   🎨 상태창 틀 (templates/*.html)
   · 파일 맨 위 <!-- name: 이름 --> 이 선택지 이름이 돼요 (없으면 파일 이름)
   · <style> … </style> 은 글 끝에 한 번만 붙고, 나머지가 상태창 모양이에요
   · 고른 틀은 localStorage 'tpl.cur' 에 통째로 저장 → 변환기가 바로 씀
   ========================================================= */
const Templates = (() => {
  const LIST_KEY = 'tpl.list';
  const parse = (name, html) => {
    const nm = (html.match(/<!--\s*name\s*:\s*([^>]*?)\s*-->/i) || [])[1] || name.replace(/\.html?$/i, '');
    const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1].trim()).join('\n\n');
    const markup = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim();
    return { file: name, name: nm, css, markup };
  };

  async function refresh() {
    const files = (await Repo.list('templates')).filter(f => /\.html?$/i.test(f.name));
    const all = [];
    for (const f of files) { try { all.push(parse(f.name, await Repo.text(f))); } catch (e) { console.warn(e); } }
    store.setJson(LIST_KEY, all);
    // 고른 틀이 바뀌었으면 새 내용으로
    const cur = current();
    if (cur) { const fresh = cached().find(t => t.file === cur.file); if (fresh) store.setJson('tpl.cur', fresh); }
    return cached();
  }

  // 기본 틀(js/builtin-templates.js) + 폴더에서 읽은 틀 (같은 파일 이름이면 폴더 쪽이 우선)
  const cached = () => {
    const folder = store.json(LIST_KEY, []);
    const builtin = (window.BUILTIN_TEMPLATES || []).map(t => parse(t.file, t.html)).filter(b => !folder.some(f => f.file === b.file));
    return builtin.concat(folder);
  };
  const current = () => store.json('tpl.cur', null);
  function select(file) {
    if (!file) { store.remove('tpl.cur'); return; }
    const t = cached().find(x => x.file === file);
    if (t) store.setJson('tpl.cur', t);
  }
  // 고른 틀이 기본 틀이면 최신 내용으로 맞추기 (사이트를 업데이트했을 때)
  (() => { const c = store.json('tpl.cur', null); if (!c) return; const t = cached().find(x => x.file === c.file); if (t && t.markup !== c.markup) store.setJson('tpl.cur', t); })();
  return { refresh, cached, current, select, parse };
})();

/* =========================================================
   🖼 GIF 이모지 (emoji/*.txt)
   · 파일 하나 = 분류 하나 (파일 이름이 분류 이름)
   · 한 줄에 하나: 주소만 / "주소", / 이름 | 주소 / <img src="주소"> 전부 OK
   · 주소가 없는 줄(또는 # 으로 시작하는 줄) = 소분류 제목
   · 파일 이름 앞의 번호(01_빨강.txt)는 순서 정하기용이라 화면엔 '빨강'으로 보여요
   ========================================================= */
const Emoji = (() => {
  const KEY = 'emoji.list';
  function parse(group, txt) {
    const out = []; let sub = '';
    txt.split(/\r?\n/).forEach(line => {
      const l = line.trim();
      if (!l) return;
      const m = l.match(/https?:\/\/[^\s"'<>),]+/);
      if (!m) { sub = l.replace(/^#+\s*/, '').replace(/["',]/g, '').trim(); return; }   // 주소 없는 줄 = 소분류 제목
      const name = l.replace(/<img[^>]*>/gi, ' ').replace(m[0], ' ').replace(/["'|=:\t,]+/g, ' ').replace(/\s+/g, ' ').trim();
      out.push({ group, sub, name, url: m[0] });
    });
    return out;
  }
  async function refresh() {
    const files = (await Repo.list('emoji')).filter(f => /\.(txt|md)$/i.test(f.name));
    let all = [];
    // 파일 이름 앞 번호(01_)는 순서용 → 화면엔 안 보이게
    for (const f of files) { try { all = all.concat(parse(f.name.replace(/\.(txt|md)$/i, '').replace(/^\d+[_\-. ]+/, ''), await Repo.text(f))); } catch (e) { console.warn(e); } }
    store.setJson(KEY, all);
    return all;
  }
  const cached = () => store.json(KEY, []);
  const tag = url => `<img class="text-emoji" src="${url}" />`;
  return { refresh, cached, parse, tag };
})();

/* =========================================================
   ➕ GIF 이모지를 저장소 emoji/ 폴더에 바로 추가
   · 토큰은 보관함 연결 때 넣은 것(localStorage 'vault.cfg')을 같이 써요
     → 그 토큰에 작업대 저장소 Contents 읽기·쓰기 권한이 있어야 해요
   · 토큰은 이 브라우저에만 있고, 파일·코드에는 절대 안 들어가요
   ========================================================= */
const EmojiAdd = (() => {
  const vcfg = () => store.json('vault.cfg', null) || {};
  const target = () => Repo.info() || (vcfg().owner ? { owner: vcfg().owner, repo: 'workshop' } : null);
  const display = f => f.replace(/\.(txt|md)$/i, '').replace(/^\d+[_\-. ]+/, '');
  const enc = str => { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const dec = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
  async function api(path, opts = {}) {
    const t = target(), tok = vcfg().token;
    if (!tok) throw new Error('토큰이 없어요 · 보관함 연결을 먼저 해 주세요');
    if (!t) throw new Error('작업대 저장소를 못 찾았어요');
    const res = await fetch(`https://api.github.com/repos/${t.owner}/${t.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
      ...opts, headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) } });
    if (res.status === 401) throw new Error('토큰이 맞지 않거나 만료됐어요');
    if (res.status === 403) throw new Error('권한이 없어요 · 토큰에 작업대 저장소(Contents 읽기·쓰기)를 추가했는지 확인해 주세요');
    return res;
  }
  // emoji 폴더 파일 목록 → [{ file, name }]
  async function files() {
    const res = await api('emoji');
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`emoji 폴더를 못 읽었어요 (${res.status})`);
    return (await res.json()).filter(f => f.type === 'file' && /\.(txt|md)$/i.test(f.name)).map(f => ({ file: f.name, name: display(f.name) }));
  }
  // 새 분류 파일 이름: 다음 번호_이름.txt
  function newFile(list, name) {
    const n = Math.max(0, ...list.map(f => +(f.file.match(/^(\d+)/) || [0, 0])[1])) + 1;
    return `${String(n).padStart(2, '0')}_${name.replace(/[\\/:*?"<>|]/g, '').trim()}.txt`;
  }
  async function add({ url, file, name }) {
    url = (url || '').trim();
    if (!/^https?:\/\/\S+$/.test(url)) throw new Error('이미지 주소가 아니에요');
    const path = 'emoji/' + file;
    const got = await api(path);
    let text = '', sha;
    if (got.ok) { const j = await got.json(); sha = j.sha; text = dec(j.content || ''); }
    else if (got.status !== 404) throw new Error(`파일을 못 읽었어요 (${got.status})`);
    if (text.includes(url)) throw new Error('이미 그 분류에 있어요');
    const line = name ? `${name.trim()} | ${url}` : url;
    const next = (text.replace(/\s+$/, '') ? text.replace(/\s+$/, '') + '\n' : '') + line + '\n';
    const put = await api(path, { method: 'PUT', body: JSON.stringify({ message: `🖼 emoji: ${display(file)} 에 추가`, content: enc(next), ...(sha ? { sha } : {}) }) });
    if (!put.ok) throw new Error(`저장 실패 (${put.status})`);
    // 이 브라우저 목록에도 바로 추가 (깃허브 페이지 반영은 1분쯤 걸려요)
    const subs = text.split(/\r?\n/).filter(l => l.trim() && !/https?:\/\//.test(l));
    const all = Emoji.cached(); all.push({ group: display(file), sub: subs.length ? subs[subs.length - 1].replace(/^#+\s*/, '').trim() : '', name: (name || '').trim(), url });
    store.setJson('emoji.list', all);
    return true;
  }
  return { target, files, add, newFile, display };
})();
