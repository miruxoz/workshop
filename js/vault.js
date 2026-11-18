/* =========================================================
   🗂 깃허브 보관함 연결
   ---------------------------------------------------------
   · 사이트 저장소(공개)와 다른 **비공개 저장소**에 저장해요
   · 토큰·저장소 이름은 이 브라우저에만 보관 (localStorage 'vault.cfg')
   · 보관함 안의 파일 구조
       meta.json          채팅방 카테고리, STOP 문장, 링크, 메모
       index.json         저장한 글 목록 (제목·날짜·카테고리 등 요약)
       posts/<id>.json    글 하나 (변환 전 원문 + 정보)
   ========================================================= */
const Vault = (() => {
  const API = window.VAULT_API || 'https://api.github.com';
  const CFG_KEY = 'vault.cfg';

  const cfg = () => store.json(CFG_KEY, null);
  const configured = () => { const c = cfg(); return !!(c && c.owner && c.repo && c.token); };

  // 한글이 깨지지 않게 base64 변환
  const enc = str => {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const dec = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
  const encPath = p => p.split('/').map(encodeURIComponent).join('/');

  async function api(path, opts = {}, c = cfg()) {
    if (!c || !c.token) throw new Error('보관함이 아직 연결되지 않았어요');
    const res = await fetch(`${API}/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) }
    });
    if (res.status === 401) throw new Error('토큰이 맞지 않거나 만료됐어요');
    if (res.status === 403) throw new Error('권한이 없어요 (토큰 권한: Contents 읽기·쓰기 확인)');
    return res;
  }

  // 파일 읽기 → { data, sha } / 없으면 null
  async function getJson(path) {
    const res = await api(`/contents/${encPath(path)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`);
    const j = await res.json();
    let text;
    if (j.content && j.encoding === 'base64') text = dec(j.content);
    else {   // 1MB 넘는 큰 파일은 원문으로 다시 받기
      const raw = await api(`/contents/${encPath(path)}`, { headers: { Accept: 'application/vnd.github.raw+json' } });
      text = await raw.text();
    }
    return { data: JSON.parse(text), sha: j.sha };
  }

  async function putJson(path, data, sha, message) {
    const res = await api(`/contents/${encPath(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ message: message || `save ${path}`, content: enc(JSON.stringify(data, null, 1)), ...(sha ? { sha } : {}) })
    });
    if (res.status === 409 || res.status === 422) { const e = new Error('충돌'); e.conflict = true; throw e; }
    if (!res.ok) throw new Error(`저장 실패 (${res.status})`);
    return (await res.json()).content.sha;
  }

  async function del(path, sha, message) {
    const res = await api(`/contents/${encPath(path)}`, { method: 'DELETE', body: JSON.stringify({ message: message || `delete ${path}`, sha }) });
    if (!res.ok && res.status !== 404) throw new Error(`삭제 실패 (${res.status})`);
  }

  // 같은 파일을 동시에 고치다 부딪히면 새로 읽어서 한 번 더
  async function update(path, fn, message, fallback) {
    for (let tries = 0; tries < 3; tries++) {
      const cur = await getJson(path);
      const next = fn(cur ? cur.data : fallback);
      try { await putJson(path, next, cur && cur.sha, message); return next; }
      catch (e) { if (!e.conflict) throw e; }
    }
    throw new Error('저장이 자꾸 부딪혀요. 잠시 후 다시 해 주세요');
  }

  /* ---------- 연결 테스트 (공개 저장소는 막기) ---------- */
  async function test(c) {
    const res = await api('', {}, c);
    if (res.status === 404) return { ok: false, msg: '저장소를 찾을 수 없어요. 이름과 토큰 권한을 확인해 주세요' };
    if (!res.ok) return { ok: false, msg: `연결 실패 (${res.status})` };
    const repo = await res.json();
    if (!repo.private) return { ok: false, msg: '⚠️ 이 저장소는 <b>공개</b>예요! 로그가 모두에게 보이니 <b>비공개 저장소</b>로 연결해 주세요' };
    return { ok: true, msg: `「${esc(repo.full_name)}」 비공개 저장소에 연결됐어요 ♡` };
  }

  /* ---------- 글 ---------- */
  const INDEX = 'index.json';
  const cacheIndex = idx => store.setJson('vault.index', idx);
  const cachedIndex = () => store.json('vault.index', { posts: [] });

  async function loadIndex() {
    const r = await getJson(INDEX);
    const idx = r ? r.data : { posts: [] };
    cacheIndex(idx);
    window.dispatchEvent(new Event('vault-changed'));
    return idx;
  }

  // post: { id, title, cat, type, text, request, storyDate, savedAt, stats }
  async function savePost(post) {
    const path = `posts/${post.id}.json`;
    const cur = await getJson(path);
    await putJson(path, post, cur && cur.sha, `💾 ${post.title || post.id}`);
    const entry = { id: post.id, title: post.title, cat: post.cat, type: post.type, storyDate: post.storyDate, savedAt: post.savedAt, stats: post.stats };
    const idx = await update(INDEX, i => {
      i = i || { posts: [] };
      i.posts = i.posts.filter(p => p.id !== post.id).concat(entry);
      return i;
    }, `📇 ${post.title || post.id}`, { posts: [] });
    cacheIndex(idx);
    window.dispatchEvent(new Event('vault-changed'));
  }

  async function getPost(id) { const r = await getJson(`posts/${id}.json`); return r && r.data; }

  async function deletePost(id) {
    const path = `posts/${id}.json`;
    const cur = await getJson(path);
    if (cur) await del(path, cur.sha, `🗑 ${id}`);
    const idx = await update(INDEX, i => { i = i || { posts: [] }; i.posts = i.posts.filter(p => p.id !== id); return i; }, `📇 remove ${id}`, { posts: [] });
    cacheIndex(idx);
    window.dispatchEvent(new Event('vault-changed'));
  }

  // 보관함 글 → 이 브라우저의 서랍으로 꺼내기
  function toDrawer(post) {
    const items = store.json('wb.drawer', []);
    if (items.some(x => x.id === post.id)) return false;
    const m = (post.title || '').match(/^(.*?)\s*([①-⑳])$/);
    items.push({
      id: post.id, base: m ? m[1] : (post.title || ''), no: m ? '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'.indexOf(m[2]) + 1 : 1,
      text: post.text, type: post.type || 'main', cat: post.cat, request: post.request || '', storyDate: post.storyDate || '',
      done: false, bookmark: post.bookmark ?? null, vaultAt: post.savedAt || Date.now(),
      ...(post.edited ? { edited: post.edited, editedCss: post.editedCss } : {})
    });
    store.setJson('wb.drawer', items);
    return true;
  }

  return {
    toDrawer,
    cfg, configured, test, getJson, putJson, update,
    setCfg(c) { store.setJson(CFG_KEY, c); },
    clearCfg() { store.remove(CFG_KEY); store.remove('vault.index'); },
    loadIndex, cachedIndex, savePost, getPost, deletePost
  };
})();
