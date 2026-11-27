/* =========================================================
   쿄냐통신 — kyonya.js  (동작 전부)
   글·문구는 kyonya-data.js 에서 고쳐요
   ========================================================= */
(function(){
  var KY=window.KY||{}, PREVIEW=!!window.KY_PREVIEW;
  var $=function(i){return document.getElementById(i)};
  var esc=function(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var store={ get:function(k){try{return localStorage.getItem(k)}catch(e){return null}}, set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}} };
  var sess ={ get:function(k){try{return sessionStorage.getItem(k)}catch(e){return null}}, set:function(k,v){try{sessionStorage.setItem(k,v)}catch(e){}} };
  var isHome=document.body.id==='tt-body-index' || PREVIEW;   // 미리보기는 화면 전환이 있어서 홈 칸을 항상 채워 둠
  var today=new Date();
  function on(id,ev,fn){ var e=$(id); if(e) e.addEventListener(ev,fn); }

  /* ---------- 방명록 작은 창 안이면: 방명록만 보이게 하고 끝 ---------- */
  if(window.self!==window.top && document.body.id==='tt-body-guestbook'){
    document.body.classList.add('in-frame');
    document.querySelectorAll('a[href]').forEach(function(a){ a.target='_top'; });
    return;
  }

  /* ---------- 팝업 (뒤 화면 안 덮음) ---------- */
  var bg=$('popBg'), ok=$('popOk');
  // design: 'dA'(기본·회색 땡땡이) / 'd14 st'(초코+초콜릿바+줄무늬) / 'd2'(하늘 초코칩)
  function pop(t,i,m,btn,design){ $('popT').innerHTML=t; $('popI').innerHTML=i; $('popM').innerHTML=m;
    $('popW').className='kw pop '+(design||'dA');
    ok.parentNode.style.display=btn===false?'none':''; bg.classList.add('show'); }
  function close(){ bg.classList.remove('show'); }
  ok.onclick=close; $('popX').onclick=close;
  window.kyPop=pop;

  /* 준비 중 링크 */
  document.addEventListener('click',function(e){ var a=e.target.closest('a[href="#soon"]');
    if(a){ e.preventDefault(); pop('준비 중','🚧','아직 준비 중인 서비스예요!<br><small>조금만 기다려 주세요 ♡</small>'); } });

  /* ---------- 창 열기·끌기 ---------- */
  var zTop=90;
  function openWin(w){ w.classList.add('show'); w.style.zIndex=++zTop; }
  document.querySelectorAll('.win').forEach(function(w){
    w.addEventListener('mousedown',function(){ w.style.zIndex=++zTop; });
    w.querySelector('.tt').addEventListener('mousedown',function(e){ if(e.target.classList.contains('x')) return;
      var r=w.getBoundingClientRect(), dx=e.clientX-r.left, dy=e.clientY-r.top;
      function mv(ev){ w.style.right='auto'; w.style.left=(ev.clientX-dx)+'px'; w.style.top=Math.max(0,ev.clientY-dy)+'px'; }
      function up(){ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); }
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up); e.preventDefault(); });
  });
  document.querySelectorAll('.win:not(.ad-pop):not(#wBgm) .x').forEach(function(x){ x.onclick=function(){ x.closest('.win').classList.remove('show'); }; });

  /* =========================== 로그인 =========================== */
  var USERS=KY.USERS||{}, CHAT=KY.CHAT||{}, me=null, mails=[], chatOpened=false;
  on('findId','click',function(){
    pop('아이디/PW 찾기','🔍','<div style="text-align:left">쿄냐통신 회원 목록입니다.<ul class="ids">'+
      Object.keys(USERS).map(function(k){return '<li data-id="'+k+'"><b>'+k+'</b><span>'+USERS[k].hint+'</span></li>'}).join('')+
      '</ul>비밀번호는 아무거나 입력하세요!<span class="warn">※ 진짜 비밀번호는 절대 쓰지 마세요</span></div>',true,'d14 stripe');
    document.querySelectorAll('.ids li').forEach(function(li){ li.onclick=function(){ $('lgId').value=li.dataset.id; close(); $('lgPw').focus(); }; });
  });
  function setUser(id){
    var u=USERS[id.toLowerCase()];
    if(!u) u={name:esc(id),av:'🐣',grade:'🌱 새싹회원',pt:10,welcome:'<b>'+esc(id)+'</b>님 환영합니다!<br>출석 포인트 10P 지급 ♡',blog:'#soon',chatWith:'kyohei',mails:(USERS.guest||{}).mails||[]};
    me=u;
    $('cName').innerHTML=u.name; $('cAv').innerHTML=u.av; $('cGrade').innerHTML=u.grade; $('cPt').innerHTML=u.pt;
    $('myBlog').href=u.blog;
    mails=u.mails.concat(KY.SPAM||[]).map(function(m){ var c={}; for(var k in m)c[k]=m[k]; c.unread=true; return c; });
    var read=(store.get('ky_read_'+id)||'').split(','); mails.forEach(function(m,i){ if(read.indexOf(String(i))>-1) m.unread=false; });
    drawMail(); $('mRead').innerHTML='편지를 눌러서 읽어 보세요 ✉';
    $('chatLog').innerHTML=''; chatOpened=false;
    $('lgForm').hidden=true; $('lgCard').hidden=false; $('loginBox').classList.add('on');
        var sm=$('secretMenu'); if(sm){ sm.classList.add('open'); sm.querySelector('.t').innerHTML = id.toLowerCase()==='sei' ? '세이 전용 게시판' : '회원전용게시판'; }
    var gn=$('gbName'); if(gn) gn.value=u.name.replace(/<[^>]*>/g,'');
    var k=id.toLowerCase(); if(KY.MICRO_SET && (k==='kyohei'||k==='sei')) KY.MICRO_SET(k);
    return u.welcome;
  }
  on('lgBtn','click',function(){
    var id=$('lgId').value.trim(), pw=$('lgPw').value;
    if(!id){ pop('로그인','🙀','아이디를 입력해 주세요!'); return; }
    if(!pw){ pop('로그인','🙀','비밀번호를 입력해 주세요!'); return; }
    if(id.toLowerCase()==='sei' && pw!==KY.SEI_PW){ $('lgPw').value=''; pop('로그인','🙀','비밀번호가 틀렸어요!'); return; }
    $('lgPw').value='';   // 비번은 바로 지움 — 어디에도 저장·전송 안 함
    pop('로그인','⏳','<span class="dots">로그인 중</span>',false);
    setTimeout(function(){ var msg=setUser(id); store.set('ky_login',id); if(typeof drawOnline==='function') drawOnline(); pop('로그인 성공','🎉',msg); },1200);
  });
  on('lgPw','keydown',function(e){ if(e.key==='Enter') $('lgBtn').click(); });
  on('lgOut','click',function(e){ e.preventDefault(); me=null; store.set('ky_login','');
    $('lgForm').hidden=false; $('lgCard').hidden=true; $('loginBox').classList.remove('on');
    var sm=$('secretMenu'); if(sm){ sm.classList.remove('open'); sm.querySelector('.t').innerHTML='회원전용게시판'; }    document.querySelectorAll('#wMail,#wChat').forEach(function(w){w.classList.remove('show')});
    var gn=$('gbName'); if(gn) gn.value=''; if(KY.MICRO_SET) KY.MICRO_SET('all'); resetOmk();
    if(typeof drawOnline==='function') drawOnline(); pop('로그아웃','👋','또 놀러 오세요!'); });
  on('secretMenu','click',function(e){ if(!this.classList.contains('open')){ e.preventDefault(); pop('회원 전용','🔒','로그인한 회원만 볼 수 있어요!'); } });
  // 다른 페이지로 가도 로그인 유지
  var saved=store.get('ky_login'); if(saved && $('lgCard')) setUser(saved);

  /* 메일 */
  function drawMail(){
    $('mList').innerHTML=mails.map(function(m,i){
      return '<li data-i="'+i+'" class="'+(m.unread?'unread':'')+'"><b>'+(m.unread?'● ':'')+m.from+'</b><span>'+m.sub+'</span><time>'+m.date+'</time></li>'; }).join('');
    var n=mails.filter(function(m){return m.unread}).length;
    $('mailN').innerHTML=n; $('mailN').style.display=n?'':'none';
  }
  on('mList','click',function(e){ var li=e.target.closest('li'); if(!li) return;
    var m=mails[li.dataset.i]; m.unread=false;
    var read=mails.map(function(x,i){return x.unread?null:i}).filter(function(x){return x!==null});
    store.set('ky_read_'+(store.get('ky_login')||''),read.join(','));
    $('mRead').innerHTML='<h4>'+m.sub+'</h4><small>보낸 사람: '+m.from+' · '+m.date+'</small><br><br>'+m.body; drawMail(); });
  on('openMail','click',function(e){ e.preventDefault(); openWin($('wMail')); });

  /* 채팅 */
  function who(){ return CHAT[me.chatWith]||CHAT.kyohei; }
  function say(mine,t){ var d=document.createElement('div'); d.className='kcm'+(mine?' me':'');
    var n=new Date(), tm=n.getHours()+':'+('0'+n.getMinutes()).slice(-2);
    d.innerHTML=(mine?'':'<div class="ca">'+who().av+'</div>')+'<p>'+t+'</p><small>'+tm+'</small>';
    $('chatLog').appendChild(d); $('chatLog').scrollTop=1e5; }
  on('openChat','click',function(e){ e.preventDefault(); $('chatT').innerHTML='💬 쿄냐톡 · '+who().name; openWin($('wChat'));
    if(!chatOpened){ chatOpened=true; say(false,who().hello); } $('chatIn').focus(); });
  function send(){ var t=$('chatIn').value.trim(); if(!t) return; $('chatIn').value='';
    say(true,esc(t)); var c=who(), rep=null;
    c.re.forEach(function(r){ if(!rep && r[0].test(t)) rep=r[1]; });
    if(!rep) rep=c.def[Math.floor(Math.random()*c.def.length)];
    $('typing').innerHTML=c.name+' 님이 입력 중…';
    setTimeout(function(){ $('typing').innerHTML=''; say(false,rep); }, 900+Math.random()*900); }
  on('chatSend','click',send);
  on('chatIn','keydown',function(e){ if(e.key==='Enter' && !e.isComposing) send(); });
  on('myBlog','click',function(e){ if(this.getAttribute('href')==='#soon') return; });


  /* =========================== 헤더: 메뉴 · 시계 · D+ · 접속 중 =========================== */
  document.querySelectorAll('.m2 [data-dd]').forEach(function(mi){
    mi.firstElementChild.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation();
      var o=mi.classList.contains('open');
      document.querySelectorAll('.m2 .open').forEach(function(x){x.classList.remove('open')});
      if(!o) mi.classList.add('open'); });
  });
  document.addEventListener('click',function(){
    document.querySelectorAll('.m2 .open').forEach(function(x){x.classList.remove('open')});
    var ol=$('onList'); if(ol) ol.classList.remove('show'); });
  function clk(){ var c=$('clock'); if(!c) return; var d=new Date();
    c.innerHTML=('0'+d.getHours()).slice(-2)+'<i>:</i>'+('0'+d.getMinutes()).slice(-2); }
  clk(); setInterval(clk,10000);
  if($('dday') && KY.DDAY_START){ var p=KY.DDAY_START.split('-'), st0=new Date(+p[0],+p[1]-1,+p[2]), t0=new Date(); t0.setHours(0,0,0,0);
    $('dday').innerHTML='D+'+(Math.round((t0-st0)/864e5)+1); }
  function drawOnline(){ var L=(KY.ONLINE||[]).slice(), me2=store.get('ky_login');
    if(me2){ var u=USERS[me2.toLowerCase()]; L.unshift([u?u.av:'🐣',esc(me2),'나']); } else L.push(['👀','손님','나']);
    var seen={}; L=L.filter(function(x){ var k=String(x[1]).toLowerCase(); if(seen[k]) return false; seen[k]=1; return true; });
    if($('onN')) $('onN').innerHTML=L.length;
    if($('onList')) $('onList').innerHTML=L.map(function(x){return '<div>'+x[0]+' '+x[1]+' <em>'+x[2]+'</em></div>'}).join(''); }
  drawOnline();
  on('onBtn','click',function(e){ e.stopPropagation(); $('onList').classList.toggle('show'); });
  /* =========================== 흐르는 띠·인기 검색어·패밀리 =========================== */
  if($('tickTx') && KY.TICKER) $('tickTx').innerHTML=KY.TICKER;
  if($('hotList') && KY.HOT) $('hotList').innerHTML=KY.HOT.map(function(h,i){
    var v=h[1]==='NEW'?'<em class="n">NEW</em>':'<em>'+h[1]+'</em>';
    return '<li><b>'+(i+1)+'</b><a href="/search/'+encodeURIComponent(h[0])+'">'+esc(h[0])+'</a>'+v+'</li>'; }).join('');
      if($('hotRoll') && KY.HOT){ var hr=$('hotRoll'), ri=0;
    hr.innerHTML=KY.HOT.map(function(h,i){ return '<p><b>'+(i+1)+'</b>'+esc(h[0])+'</p>'; }).join('');
    setInterval(function(){ ri=(ri+1)%KY.HOT.length; hr.style.transform='translateY('+(-18*ri)+'px)'; },2500);
    on('hotRollBtn','click',function(){ $('hotBox').classList.toggle('fold'); }); }
  if($('famSel') && KY.FAMILY) KY.FAMILY.forEach(function(f){ var o=document.createElement('option'); o.value=f[1]; o.innerHTML=f[0]; $('famSel').appendChild(o); });
  on('famGo','click',function(){ var v=$('famSel').value; if(!v){ pop('패밀리 사이트','🔗','갈 곳을 골라 주세요!'); return; } window.open(v,'_blank'); });

  /* 카운터: 숫자를 픽셀 칸으로 */
  var ct=$('cntTotal');
  if(ct){ var n=(ct.textContent||'0').replace(/\D/g,'')||'0'; while(n.length<6) n='0'+n;
    $('cntDigits').innerHTML=n.split('').map(function(d){return '<i>'+d+'</i>'}).join(''); }

  /* =========================== 홈 전용 =========================== */
  if(isHome){
    /* 갱신내역·알림 */
        if($('updList')) $('updList').innerHTML=(KY.UPDATES||[]).map(function(u){
      return '<div><time>'+u.d+'</time>'+u.t+(u.new?'<span class="n">NEW</span>':'')+'</div>'; }).join('');
          /* 투두 — kyonya-data.js 의 TODO */
    if($('todoList')) $('todoList').innerHTML=(KY.TODO||[]).map(function(t){
      return '<li'+(t[1]?' class="done"':'')+'>'+t[0]+'</li>'; }).join('') || '<li>할 일 없음 ♡</li>';
    if($('ntcD') && KY.NOTICE){ $('ntcD').innerHTML=KY.NOTICE.d; $('ntcT').innerHTML=KY.NOTICE.t; }

    /* ---- 글 불러오기 (티스토리 RSS) ---- */
    function ago(ms){ var m=Math.floor(ms/60000); if(m<60) return Math.max(m,1)+'분 전'; var h=Math.floor(m/60); if(h<24) return h+'시간 전';
      var d=Math.floor(h/24); return d<7? d+'일 전' : ''; }
    function md(dt){ return ('0'+(dt.getMonth()+1)).slice(-2)+'.'+('0'+dt.getDate()).slice(-2); }
    function prefix(t){ var m=t.match(/^\s*\[([^\]]+)\]\s*/); return m?{p:m[1],t:t.slice(m[0].length)}:{p:'',t:t}; }
    /* &quot; &hellip; 같은 글자를 원래 문장부호로 */
    var _ta=document.createElement('textarea');
    function unent(t){ _ta.innerHTML=t; return _ta.value; }
    function loadPosts(cb){
      if(PREVIEW){ cb((KY.DEMO_RSS||[]).map(function(x){ var dt=new Date(Date.now()-x.ago*60000);
        return {title:x.title,link:'#',cat:x.cat,date:dt,img:x.img||''}; })); return; }
      fetch('/rss').then(function(r){return r.text()}).then(function(xml){
        var doc=new DOMParser().parseFromString(xml,'text/xml');
        cb([].slice.call(doc.querySelectorAll('item')).map(function(it){
          var g=function(s){ var e=it.querySelector(s); return e?e.textContent:''; };
          var desc=g('description'), im=desc.match(/<img[^>]+src=["']([^"']+)/i);
          return {title:unent(g('title')),link:g('link'),cat:unent(g('category')),date:new Date(g('pubDate')),img:im?unent(im[1]):''}; }));
      }).catch(function(){ cb([]); });
    }
    loadPosts(function(all){
      var C=KY.CAT||{};
        /* 세이의 한마디 — 제목 = 한마디 / 본문 첫 그림 = 오늘의 기분 */
      var micro=all.filter(function(p){return p.cat.indexOf(C.micro)===0});
      var WK=['日','月','火','水','木','金','土'], p2=function(n){return ('0'+n).slice(-2)};
      KY.MICRO_SET=function(){   // 로그인·로그아웃 때도 불려요 (예전 탭 자리)
        var el=$('mbList'); if(!el) return;
        if($('mbN')) $('mbN').textContent='('+micro.length+')';
        el.innerHTML=micro.length?micro.map(function(p,i){ var d=p.date, x=prefix(p.title);
          var dt=(KY.MICRO_YEAR||d.getFullYear())+'/'+p2(d.getMonth()+1)+'/'+p2(d.getDate())+'('+WK[d.getDay()]+') '+p2(d.getHours())+':'+p2(d.getMinutes());
          return '<dt>'+(micro.length-i)+' ：<span class="nm">'+(KY.MICRO_NAME||'세이')+'</span> ：오늘의 기분: '+
            (p.img?'<img class="text-emoji" src="'+esc(p.img)+'" alt="">':'－')+' ：'+dt+'</dt><dd><a href="'+p.link+'">'+esc(x.t)+'</a></dd>'; }).join('')
          :'<dd style="color:#888;margin-left:0">아직 한마디가 없어요</dd>';
      };
      KY.MICRO_SET();

      /* 쿄냐뉴스 */
      var news=all.filter(function(p){return p.cat.indexOf(C.news)===0});
      var EMO=['🏐','🐱','💸','📰','🌤'];
      function setNews(k){
        document.querySelectorAll('#nTabs b').forEach(function(b){ b.classList.toggle('on',b.dataset.c===k); });
        var sub=k==='all'?null:(C.sub||{})[k];
        var list=news.filter(function(p){ return !sub || p.cat.indexOf('/'+sub)>-1; });
        if(!list.length){ $('nCards').innerHTML=''; $('nList').innerHTML='<li style="color:#888">아직 기사가 없어요</li>'; return; }
        var cards=list.slice(0,2), rest=list.slice(2,8);
        $('nCards').innerHTML=cards.map(function(p,i){ var x=prefix(p.title), a=ago(Date.now()-p.date);
          return '<a class="nc" href="'+p.link+'"><div class="th t'+(i+1)+'">'+(p.img?'<img src="'+p.img+'" alt="" style="width:100%;height:100%;object-fit:cover">':EMO[i%EMO.length])+(i===0&&a.indexOf('분')>-1?'<span>LIVE</span>':'')+'</div><div class="tx"><p>'+esc(x.t)+'</p><small>'+esc(x.p||'쿄냐뉴스')+(a?' · '+a:' · '+md(p.date))+'</small></div></a>'; }).join('');
        $('nList').innerHTML=rest.map(function(p){ var x=prefix(p.title);
          return '<li><a href="'+p.link+'">'+esc(x.t)+'</a><span>'+esc(x.p||'쿄냐뉴스')+'</span></li>'; }).join('');
      }
      on('nTabs','click',function(e){ var b=e.target.closest('b'); if(b) setNews(b.dataset.c); });
      setNews('all');
      var more=$('newsMore'); if(more) more.href='/category/'+encodeURIComponent(C.news);

            /* 새 소식 (푸딩) — 최근 글 7개 · 이틀 안에 쓴 글은 NEW */
      var pl=$('pudList');
      if(pl) pl.innerHTML=all.slice(0,4).map(function(p){ var top=p.cat.split('/')[0], L=(KY.CAT_LABEL||{})[top]||[top||'글',''], x=prefix(p.title);
          var isNew=(Date.now()-p.date)<2*86400000;
          return '<li><span class="cat '+L[1]+'">'+esc(L[0])+'</span><a href="'+p.link+'">'+esc(x.t)+'</a>'+(isNew?'<span class="new">NEW</span>':'')+'<time>'+md(p.date)+'</time></li>'; }).join('')
        || '<li style="color:#888">아직 글이 없어요</li>';
        });

    /* ---- 달력 (항상 2014년) ---- */
    var cm=today.getMonth();
    function drawCal(){
      var first=new Date(2014,cm,1).getDay(), days=new Date(2014,cm+1,0).getDate(), h='<tr>', EV=KY.CAL_EVENTS||{};
      $('calT').innerHTML='2014. '+(cm+1);
      for(var i=0;i<first;i++) h+='<td></td>';
      for(var d=1;d<=days;d++){ var key=(cm+1)+'-'+d, cls=[];
        if(cm===today.getMonth()&&d===today.getDate()) cls.push('today'); if(EV[key]) cls.push('ev');
        h+='<td class="'+cls.join(' ')+'"'+(EV[key]?' title="'+esc(EV[key])+'"':'')+'><span>'+d+'</span></td>';
        if((first+d)%7===0 && d<days) h+='</tr><tr>'; }
      $('calB').innerHTML=h+'</tr>';
    }
    if($('calB')){ on('calP','click',function(){ cm=(cm+11)%12; drawCal(); }); on('calN','click',function(){ cm=(cm+1)%12; drawCal(); }); drawCal(); }

    /* ---- 투표 (깡통: 내 표만 더해짐 / 나중에 VOTE만 구글 시트로 교체) ---- */
    var P=KY.POLL;
    var VOTE={ get:function(cb){ var mine=store.get('ky_vote'); var c=P.opts.map(function(o){return o[1]}); if(mine!==null&&mine!=='') c[+mine]++; cb(c); },
               send:function(i,cb){ store.set('ky_vote',i); VOTE.get(cb); } };
    if(P && $('pollQ')){
      $('pollQ').innerHTML='Q. '+P.q;
      $('pollOpts').innerHTML=P.opts.map(function(o,i){ return '<label><input type="radio" name="pv" value="'+i+'">'+o[0]+'</label>'; }).join('');
      var showRes=function(c,mine){ var tot=c.reduce(function(a,b){return a+b},0);
        $('pollRes').innerHTML=P.opts.map(function(o,i){ var p=Math.round(c[i]/tot*100);
          return '<div class="pr'+(i===mine?' mine':'')+'"><div class="pl"><b>'+o[0]+(i===mine?' ✔':'')+'</b><small>'+c[i]+'표 · '+p+'%</small></div><div class="pb2"><i data-w="'+p+'"></i></div></div>'; }).join('')+
          '<div class="tot">총 '+tot+'명 참여</div>';
        $('pollForm').hidden=true; $('pollRes').hidden=false;
        setTimeout(function(){ document.querySelectorAll('.pb2 i').forEach(function(x){ x.style.width=x.dataset.w+'%'; }); },30); };
      on('pollGo','click',function(){ var sel=document.querySelector('input[name=pv]:checked');
        if(!sel){ pop('쿄냐 투표','🗳','하나를 골라 주세요!'); return; }
        var i=+sel.value; VOTE.send(i,function(c){ showRes(c,i); pop('쿄냐 투표','🎉','투표 완료!<br><b>'+P.opts[i][0]+'</b>에 한 표 ♡'); }); });
      on('pollPeek','click',function(){ VOTE.get(function(c){ var m=store.get('ky_vote'); showRes(c,m?+m:-1); }); });
      var voted=store.get('ky_vote'); if(voted!==null && voted!=='') VOTE.get(function(c){ showRes(c,+voted); });
    }
  }

  /* ---- 운세 (날짜 + 아이디로 정해짐) ---- */
  function hash(s){ var h=0; for(var i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }
  function resetOmk(){ if($('omk')){ $('omk').style.display=''; $('omkRes').style.display='none'; } }
  on('omk','click',function(){ var F=KY.FORTUNE, name=me?me.name.replace(/<[^>]*>/g,''):'손님', h=hash(today.toDateString()+name);
    var pick=function(a,n){ return a[(h>>>n)%a.length]; }, love=60+(h>>>3)%41;
    $('omkRes').innerHTML='<small>'+esc(name)+'님의 오늘</small><div class="big">'+pick(F.luck,0)+'</div>'+
      '<dl><dt>행운템</dt><dd>'+pick(F.item,5)+'</dd><dt>쿄냐지수</dt><dd>'+love+'%</dd><dt>한마디</dt><dd>'+pick(F.tip,9)+'</dd></dl>';
    this.style.display='none'; $('omkRes').style.display='block'; });



  /* =========================== 들어올 때: BGM 묻기 → (홈이면) 팝업 광고 =========================== */
  var todayKey=today.toDateString();
  function showAds(){ if(!isHome) return;
    [['wAd1',0],['wAd2',700]].forEach(function(a){ var w=$(a[0]); if(!w || store.get('hide_'+w.dataset.key)===todayKey) return;
      setTimeout(function(){ openWin(w); },a[1]); }); }
  document.querySelectorAll('.ad-pop').forEach(function(w){
    var shut=function(){ if(w.querySelector('.ks input').checked) store.set('hide_'+w.dataset.key,todayKey); w.classList.remove('show'); };
    w.querySelector('.close').onclick=shut; w.querySelector('.x').onclick=shut; });
  var pz=document.querySelector('[data-prize]'); if(pz) pz.onclick=function(){ pop('경품 당첨','🎁','<b>쿄헤이의 세이 자랑 3시간 청취권</b>이<br>지급되었습니다!<br><small>(환불 불가)</small>'); };
  var by=document.querySelector('[data-buy]'); if(by) by.onclick=function(){ pop('세이캠','📸','품절되었습니다.<br><small>(구매자: 사쿠라바 쿄헤이 외 0명)</small>'); };

  var wb=$('wBgm');
  function center(w){ w.style.left=Math.max(10,(innerWidth-w.offsetWidth)/2)+'px'; w.style.top=Math.max(10,(innerHeight-w.offsetHeight)/2-40)+'px'; }
  function answer(yes){ wb.classList.remove('show'); sess.set('ky_asked','1'); if(yes) play(); else store.set('ky_bgm','off'); setTimeout(showAds,400); }
  if(wb){
    $('bgmYes').onclick=function(){answer(true)}; $('bgmNo').onclick=function(){answer(false)};
    wb.querySelector('.x').onclick=function(){answer(false)};
    if(PREVIEW && store.get('ky_pv_quiet')==='1'){ /* 미리보기: 팝업 조용히 */ }
    else if(!sess.get('ky_asked')){ openWin(wb); center(wb); }
    else { showAds();
      // 이미 「네」를 골랐으면: 다른 페이지에서는 처음 누를 때 이어서 재생
      if(store.get('ky_bgm')==='on'){ setTitle('♪ 아무 데나 누르면 이어서 재생돼요',true);
        var first=function(){ document.removeEventListener('pointerdown',first,true); play(); };
        document.addEventListener('pointerdown',first,true); } }
  }
    /* =========================== 박수 (구글 시트에 모아요) =========================== */
  (function(){
    var W=$('wClap'); if(!W) return;
    var URL=KY.CLAP_URL||'', MAX=10, key='ky_clap_'+new Date().toDateString();
    var mine=+(store.get(key)||0), total=null;
    function show(){
      if(total!==null){ if($('clapN')) $('clapN').innerHTML=total; $('clapAll').innerHTML=total; }
      $('clapMe').innerHTML=mine;
      var b=$('clapMore'); b.disabled=mine>=MAX;
      b.innerHTML=mine>=MAX?'오늘은 여기까지! 고마워요 ♡':'👏 한 번 더 (최대 '+MAX+'번)'; }
    function call(q,cb){
      if(!URL){   // 구글 시트 연결 전: 이 브라우저에만 세어 둠
        var t=+(store.get('ky_clap_demo')||0); if(q==='a=clap'){ t++; store.set('ky_clap_demo',t); }
        if(cb) cb({total:t}); return; }
      fetch(URL+'?'+q).then(function(r){return r.json()}).then(function(d){ if(cb) cb(d); }).catch(function(){}); }
    function pulse(){ var bd=$('clapBd'); bd.classList.remove('clap-pop'); void bd.offsetWidth; bd.classList.add('clap-pop'); }
    function clap(){ if(mine>=MAX) return; mine++; store.set(key,mine); if(total!==null) total++; show(); pulse();
      call('a=clap',function(d){ total=d.total; show(); }); }
    function xmas(){ var t=new Date(); t.setHours(0,0,0,0); var x=new Date(t.getFullYear(),11,25); if(t>x) x=new Date(t.getFullYear()+1,11,25);
      var d=Math.round((x-t)/864e5); $('clapX').innerHTML=d===0?'메리 크리스마스! 🎄':'크리스마스까지 앞으로 <b>'+d+'</b>일!'; }
    document.addEventListener('click',function(e){ if(!e.target.closest('[data-clap]')) return;
      e.preventDefault(); xmas(); openWin(W); clap(); });
    on('clapMore','click',clap);
    on('clapTx','input',function(){ $('clapLen').innerHTML=this.value.length+' / 200'; });
    on('clapSend','click',function(){ var t=$('clapTx').value.trim(); if(!t) return;
      call('a=msg&t='+encodeURIComponent(t.slice(0,200))); $('clapTx').value='';
      $('clapLen').innerHTML='<span class="sent">보냈어요! 고마워요 ♡</span>'; });
    call('a=get',function(d){ total=d.total; show(); });
    show();
  })();

  /* ---------- 🍡 오늘의 앙케이트 (당고 접시) ---------- */
(function(){
  var box=$('voteArea'), P=KY.VOTE; if(!box||!P) return;
  var URL=KY.CLAP_URL||'', N=P.ops.length, KEY='kyVote_'+P.id, mine=null, V=P.ops.map(function(){return 0});
  try{ mine=localStorage.getItem(KEY); }catch(x){}
  function draw(newI){
    var mx=Math.max.apply(null,V)||1, t=V.reduce(function(a,b){return a+b},0);
    box.classList.toggle('done',mine!==null);
    box.innerHTML='<div class="vt-roof"><span class="vt-sign">今日のアンケート</span></div>'+
      '<div class="vt-q">'+P.q+'</div><div class="vt-body">'+
      P.ops.map(function(o,i){
        var n=V[i]?Math.max(1,Math.round(V[i]/mx*4)):0, b='';   // 경단은 접시당 최대 4개
        for(var k=0;k<n;k++) b+='<span class="vt-ball '+(o[1]||'')+(i==newI&&k==n-1?' new':'')+'"></span>';
        return '<div class="vt-op'+(mine==i&&mine!==null?' me':'')+'" data-i="'+i+'"><em class="vt-cnt">'+V[i]+'표</em>'+
          '<div class="vt-plate"><div class="vt-stk">'+b+'</div></div><div class="vt-nm">'+o[0]+'</div></div>';
      }).join('')+'</div>'+
      '<div class="vt-hint">'+(mine!==null?'총 '+t+'표 · 잘 먹겠습니다 ♡':'먹고 싶은 걸 골라 주세요 🍡')+'</div>';
  }
  function ask(q,newI){
    if(!URL){ draw(newI); return; }
    fetch(URL+'?'+q+'&id='+encodeURIComponent(P.id)+'&n='+N+'&_='+Date.now())
      .then(function(r){return r.json()})
      .then(function(d){ if(d&&d.counts){ V=P.ops.map(function(o,i){return Number(d.counts[i])||0}); } draw(newI); })
      .catch(function(){ draw(newI); });
  }
  box.addEventListener('click',function(e){
    var op=e.target.closest('.vt-op'); if(!op||mine!==null) return;
    var i=+op.dataset.i; mine=String(i);
    try{ localStorage.setItem(KEY,i); }catch(x){}
    V[i]++; draw(i);                 // 화면에 먼저 보여 주고
    ask('a=vote&o='+i,i);            // 시트에 저장
  });
  draw(); ask('a=vget');
})();

  /* =========================== TOP · 커서 =========================== */
  addEventListener('scroll',function(){ var t=$('toTop'); if(t) t.classList.toggle('on',scrollY>300); },{passive:true});
  on('toTop','click',function(){ scrollTo({top:0,behavior:'smooth'}); });
  if(matchMedia('(pointer:fine)').matches){
    var last=0, SP=['✦','✧','⋆','·'], CL=['','s','y'];
    addEventListener('mousemove',function(e){ var n=Date.now(); if(n-last<45) return; last=n;
      var d=document.createElement('span'); d.className='spk '+CL[Math.floor(Math.random()*3)];
      d.innerHTML=SP[Math.floor(Math.random()*SP.length)];
      d.style.left=(e.clientX+(Math.random()*10-5))+'px'; d.style.top=(e.clientY+8)+'px';
      document.body.appendChild(d); setTimeout(function(){d.remove()},800); });
    addEventListener('mousedown',function(e){ var d=document.createElement('span'); d.className='hrt'; d.innerHTML='♥';
      d.style.left=e.clientX+'px'; d.style.top=e.clientY+'px'; document.body.appendChild(d); setTimeout(function(){d.remove()},700); });
  }
})();
