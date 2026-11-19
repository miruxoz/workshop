/* =========================================================
   🏷 채팅방 카테고리 · STOP 문장 · 링크 · 메모
   ---------------------------------------------------------
   · 이 브라우저에 저장 + (보관함이 연결돼 있으면) 깃허브 meta.json 에도 저장
   · 다른 기기에서 열면 더 최근에 고친 쪽 내용으로 맞춰져요
   ========================================================= */
const Meta = (() => {
  const KEY = 'meta';
  const blank = () => ({
    categories: [{ id: 'c' + Date.now().toString(36), name: '내 채팅방' }],
    defaultCat: '', stops: {}, links: [], memo: '', updatedAt: 0
  });

  let data = store.json(KEY, null);
  const fresh = !data;
  if (!data) data = blank();
  if (!data.categories || !data.categories.length) data.categories = blank().categories;
  if (!data.categories.some(c => c.id === data.defaultCat)) data.defaultCat = data.categories[0].id;
  data.stops = data.stops || {}; data.links = data.links || []; data.memo = data.memo || '';
  if (fresh) store.setJson(KEY, data);   // 처음 만든 기본 카테고리를 바로 기억 (페이지마다 새로 생기지 않게)

  const changed = () => window.dispatchEvent(new Event('meta-changed'));

  let pushTimer;
  function save(push = true) {
    store.setJson(KEY, data);
    changed();
    if (push && Vault.configured()) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        Vault.update('meta.json', () => data, '🏷 meta', null).catch(e => toast('⚠️ 보관함에 설정 저장 실패: ' + e.message));
      }, 1500);
    }
  }
  function update(fn) { fn(data); data.updatedAt = Date.now(); save(); }

  // 깃허브와 맞추기 (페이지 열 때 한 번)
  async function sync() {
    if (!Vault.configured()) return;
    try {
      const r = await Vault.getJson('meta.json');
      if (r && (r.data.updatedAt || 0) > (data.updatedAt || 0)) { data = r.data; save(false); }
      else if (!r || (data.updatedAt || 0) > (r.data.updatedAt || 0)) save(true);
    } catch (e) { console.warn('meta sync', e); }
  }

  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  return {
    get: () => data,
    sync, update,
    cats: () => data.categories,
    catName: id => (data.categories.find(c => c.id === id) || {}).name || '(카테고리 없음)',
    defaultCat: () => data.defaultCat,
    addCat(name) { const id = uid('c'); update(d => d.categories.push({ id, name })); return id; },
    renameCat(id, name) { update(d => { const c = d.categories.find(x => x.id === id); if (c) c.name = name; }); },
    setDefault(id) { update(d => d.defaultCat = id); },
    removeCat(id) {
      update(d => {
        d.categories = d.categories.filter(c => c.id !== id);
        if (d.defaultCat === id) d.defaultCat = d.categories[0].id;
        delete d.stops[id];
      });
    },
    // 명령어 모음의 '내 명령어' (보관함이 연결돼 있으면 다른 기기에서도 보여요)
    commands: () => data.commands || [],
    setCommands(list) { update(d => d.commands = list); },
    // ★ 즐겨찾기한 명령어 id (맨 위에 고정)
    favCmds: () => data.favCmds || [],
    // ★ 즐겨찾기한 폰트 이름
    favFonts: () => data.favFonts || [],
    toggleFavFont(n) { update(d => { const f = d.favFonts || []; d.favFonts = f.includes(n) ? f.filter(x => x !== n) : f.concat(n); }); },
    toggleFavCmd(id) { update(d => { const f = d.favCmds || []; d.favCmds = f.includes(id) ? f.filter(x => x !== id) : f.concat(id); }); },
    stop: catId => data.stops[catId] || null,
    setStop(catId, text) { update(d => d.stops[catId] = { text, date: Date.now() }); },
    addLink(name, url) { update(d => d.links.push({ id: uid('l'), name, url })); },
    removeLink(id) { update(d => d.links = d.links.filter(l => l.id !== id)); },
    setMemo(text) { update(d => d.memo = text); }
  };
})();
