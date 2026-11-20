/* =========================================================
   ☁️ 실험실·링크 모음 → 보관함(비공개 깃허브 저장소)에 같이 저장
   ---------------------------------------------------------
   · 보관함이 연결돼 있으면 정해둔 localStorage 값들을 파일 하나로 묶어서 올려요
       lab.json    갤러리·테두리·스티커·팔레트·최근 색·자주 쓰는 요소·스냅샷
       links.json  링크 모음
   · 페이지를 열 때 한 번 맞추고(더 최근에 고친 쪽이 이겨요), 고칠 때마다 잠시 뒤 올려요
   · 보관함이 없으면 그냥 이 브라우저에만 저장돼요
   ========================================================= */
const LabSync = (() => {
  function create(file, keys, { onPulled } = {}) {
    const STAMP = `sync.${file}.at`;
    const has = () => typeof Vault !== 'undefined' && Vault.configured();
    let timer = null, quiet = false;
    const pack = () => { const o = { updatedAt: +store.get(STAMP, 0) || 0 }; keys.forEach(k => { o[k] = store.json(k, null); }); return o; };
    function push() {
      if (!has()) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        Vault.update(file, () => pack(), `☁️ ${file}`, null).then(() => setStatus('☁️ 보관함에 저장됨')).catch(e => setStatus('⚠️ 보관함 저장 실패: ' + e.message, true));
      }, 1500);
    }
    // store.setJson 을 감싸서, 지켜보는 키가 바뀌면 시간 도장 + 업로드
    const orig = store.setJson.bind(store);
    store.setJson = (k, v) => {
      const ok = orig(k, v);
      if (!quiet && keys.includes(k)) { store.set(STAMP, String(Date.now())); push(); }
      return ok;
    };
    let statusEl = null;
    function setStatus(msg, bad) { if (statusEl) { statusEl.textContent = msg; statusEl.classList.toggle('bad', !!bad); } }
    async function sync(el) {
      statusEl = el || statusEl;
      if (!has()) { setStatus('🔌 보관함 미연결 · 이 브라우저에만 저장'); return; }
      setStatus('☁️ 보관함과 맞추는 중…');
      try {
        const r = await Vault.getJson(file);
        const mine = +store.get(STAMP, 0) || 0;
        if (r && (r.data.updatedAt || 0) > mine) {
          quiet = true;
          keys.forEach(k => { if (r.data[k] !== undefined && r.data[k] !== null) store.setJson(k, r.data[k]); });
          quiet = false;
          store.set(STAMP, String(r.data.updatedAt));
          setStatus('☁️ 보관함에서 불러왔어요');
          if (onPulled) onPulled();
        } else if (!r || mine > (r.data.updatedAt || 0)) { if (!mine) store.set(STAMP, String(Date.now())); push(); setStatus('☁️ 보관함에 올리는 중…'); }
        else setStatus('☁️ 보관함과 같아요');
      } catch (e) { setStatus('⚠️ 보관함 연결 실패: ' + e.message, true); }
    }
    return { sync, push };
  }
  return { create };
})();
