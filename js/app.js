'use strict';
const App={
_data:null,_loading:false,
async loadData(){
  if(this._data)return this._data;
  if(this._loading)return new Promise(r=>setTimeout(()=>r(this.loadData()),60));
  this._loading=true;
  try{const resp=await fetch('data/subjects.json');if(!resp.ok)throw new Error('HTTP '+resp.status);this._data=await resp.json();}
  catch(e){console.warn('Data load failed:',e.message);this._data={subjects:[]};}
  this._loading=false;this._mergeAdminData();return this._data;
},
_mergeAdminData(){
  if(!this._data)return;
  const ov=this._parseLS('vm_overrides',{});
  const ad=this._parseLS('vm_admin_data',{subjects:[],quiz:[],pdfs:[],ncertTopics:[],announcements:[],teachers:[]});
  this._data.subjects.forEach(s=>{
    s.chapters.forEach(ch=>{
      const key=`${s.id}::${ch.id}`,o=ov[key];if(!o)return;
      if(o.videoId&&ch.lessons?.length)ch.lessons[0].videoId=o.videoId;
      if(o.lesson0Title&&ch.lessons?.length)ch.lessons[0].title=o.lesson0Title;
      if(o.extraLessons?.length)ch.lessons=[...(ch.lessons||[]),...o.extraLessons];
      if(o.adminNote)ch._adminNote=o.adminNote;
      if(o.extraTopics?.length)ch.ncertTopics=[...(ch.ncertTopics||[]),...o.extraTopics];
      if(o.extraQuiz?.length)ch.quiz=[...(ch.quiz||[]),...o.extraQuiz];
      if(o.replaceQuiz?.length)ch.quiz=o.replaceQuiz;
    });
  });
  (ad.subjects||[]).forEach(cs=>{
    if(!this._data.subjects.find(s=>s.id===cs.id)){
      this._data.subjects.push({id:cs.id||this._slug(cs.name),name:cs.name,nameHi:'',icon:cs.icon||'📖',description:cs.desc||'',chapters:cs.chapters||[],gradient:`linear-gradient(135deg,${cs.color||'#6C63FF'},#4F46E5)`,glow:'rgba(108,99,255,.1)',bg:'rgba(108,99,255,.07)',border:'rgba(108,99,255,.2)',color:cs.color||'#6C63FF'});
    }
  });
},
saveOverride(sid,cid,patch){const ov=this._parseLS('vm_overrides',{});const key=`${sid}::${cid}`;ov[key]={...(ov[key]||{}),...patch};this._saveLS('vm_overrides',ov);this._data=null;},
getOverride(sid,cid){return(this._parseLS('vm_overrides',{}))[`${sid}::${cid}`]||{};},
_parseLS(k,def){try{return JSON.parse(localStorage.getItem(k)||'null')??def;}catch{return def;}},
_saveLS(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
_slug(s){return(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');},
getSubject(id){return(this._data?.subjects||[]).find(s=>s.id===id)||null;},
getChapter(sid,cid){return(this.getSubject(sid)?.chapters||[]).find(c=>c.id===cid)||null;},
getParam(k){return new URLSearchParams(location.search).get(k);},
/* Profile */
getProfile(){return this._parseLS('vm_profile',null);},
saveProfile(p){this._saveLS('vm_profile',p);},
hasProfile(){const p=this.getProfile();return!!(p?.name);},
showOnboarding(cb){
  const el=document.createElement('div');el.className='wall-overlay';el.id='obOverlay';
  let step=0,selSubj='',obName='',role='student';
  const subs=[{id:'mathematics',icon:'📐',name:'Mathematics'},{id:'science',icon:'🔬',name:'Science'},{id:'social-science',icon:'🌍',name:'Social Science'},{id:'english',icon:'📚',name:'English'}];
  const render=()=>{
    if(step===0){
      el.innerHTML=`<div class="wall-card ob-step">
        <span class="wall-icon">✨</span>
        <div class="wall-title">Welcome to Class 10Edu</div>
        <div class="wall-sub">Choose your role — we’ll personalise the experience.</div>
        <div class="ob-option${role==='student'?' picked':''}" data-role="student"><span class="ob-icon">🎓</span><span class="ob-label">Student</span><span class="ob-check">${role==='student'?'✓':''}</span></div>
        <div class="ob-option${role==='teacher'?' picked':''}" data-role="teacher"><span class="ob-icon">👨‍🏫</span><span class="ob-label">Teacher</span><span class="ob-check">${role==='teacher'?'✓':''}</span></div>
        <button class="btn btn-b" id="obR1" style="width:100%;justify-content:center;margin-top:12px">Continue →</button>
      </div>`;
      el.querySelectorAll('.ob-option').forEach(o=>o.addEventListener('click',()=>{role=o.dataset.role;render();}));
      el.querySelector('#obR1').addEventListener('click',()=>{step=1;render();});
      return;
    }
    if(step===1){
      el.innerHTML=`<div class="wall-card ob-step">
        <span class="wall-icon">👋</span>
        <div class="wall-title">Let’s set you up</div>
        <div class="wall-sub">Quick setup — 10 seconds.</div>
        <div class="fg"><label>Your Name</label><input class="fc" id="obName" placeholder="e.g. Arjun Sharma" maxlength="40" autocomplete="given-name" autofocus></div>
        <button class="btn btn-b" id="obN1" style="width:100%;justify-content:center;margin-top:4px">Continue →</button>
      </div>`;
      const inp=el.querySelector('#obName');
      setTimeout(()=>inp?.focus(),100);
      el.querySelector('#obN1').addEventListener('click',()=>{
        const v=VidyaSec.sanitize((inp?.value||'').trim());
        if(!v){inp?.focus();return;}
        obName=v;step=2;render();
      });
      inp?.addEventListener('keydown',e=>{if(e.key==='Enter')el.querySelector('#obN1')?.click();});
    } else {
      el.innerHTML=`<div class="wall-card ob-step">
        <span class="wall-icon">📚</span>
        <div class="wall-title">Hi, ${VidyaSec.sanitize(obName)}!</div>
        <div class="wall-sub">Pick your favourite subject — we'll show it first on your dashboard.</div>
        ${subs.map(s=>`<div class="ob-option${selSubj===s.id?' picked':''}" data-id="${s.id}"><span class="ob-icon">${s.icon}</span><span class="ob-label">${s.name}</span><span class="ob-check">${selSubj===s.id?'✓':''}</span></div>`).join('')}
        <button class="btn btn-b" id="obDone" style="width:100%;justify-content:center;margin-top:12px"${selSubj?'':' disabled'}>Start Learning →</button>
      </div>`;
      el.querySelectorAll('.ob-option').forEach(o=>o.addEventListener('click',()=>{selSubj=o.dataset.id;render();}));
      el.querySelector('#obDone')?.addEventListener('click',()=>{
        this.saveProfile({role,name:obName,favourite:selSubj,joinedAt:Date.now()});
        el.style.opacity='0';el.style.transition='opacity .3s';
        setTimeout(()=>{el.remove();if(cb)cb();},300);
      });
    }
  };
  document.body.appendChild(el);render();
},
/* Progress */
getProgress(){return this._parseLS('vm_prog',{});},
saveProgress(p){this._saveLS('vm_prog',p);},
_ep(p,sid){if(!p[sid])p[sid]={done:[],scores:{},last:null,watched:[]};},
markDone(sid,cid){const p=this.getProgress();this._ep(p,sid);if(!p[sid].done.includes(cid))p[sid].done.push(cid);this.saveProgress(p);this.updateStreak();},
saveScore(sid,cid,score,total){const p=this.getProgress();this._ep(p,sid);p[sid].scores[cid]={score,total,pct:Math.round(score/total*100),ts:Date.now()};this.saveProgress(p);},
setLast(sid,cid,title){const p=this.getProgress();this._ep(p,sid);p[sid].last={cid,title,ts:Date.now()};this.saveProgress(p);},
markWatched(sid,cid,lid){if(!lid)return;const p=this.getProgress();this._ep(p,sid);const k=`${cid}::${lid}`;if(!p[sid].watched.includes(k))p[sid].watched.push(k);this.saveProgress(p);},
getSubjPct(sid,subj){const p=this.getProgress()[sid]||{};return subj.chapters.length?Math.round(((p.done||[]).length/subj.chapters.length)*100):0;},
getBookmarks(){return this._parseLS('vm_bm',[]);},
toggleBookmark(s,c){const bm=this.getBookmarks(),k=`${s}::${c}`,i=bm.indexOf(k);if(i>=0)bm.splice(i,1);else bm.push(k);this._saveLS('vm_bm',bm);return i<0;},
isBookmarked(s,c){return this.getBookmarks().includes(`${s}::${c}`);},
updateStreak(){const today=new Date().toDateString(),last=localStorage.getItem('vm_sdate');let s=parseInt(localStorage.getItem('vm_streak')||'0');if(last!==today){s=(last===new Date(Date.now()-86400000).toDateString())?s+1:1;localStorage.setItem('vm_streak',s);localStorage.setItem('vm_sdate',today);}},
/* Theme */
applyMode(){document.documentElement.setAttribute('data-mode',localStorage.getItem('vm_mode')||'light');},
setMode(m){document.documentElement.setAttribute('data-mode',m);localStorage.setItem('vm_mode',m);document.querySelectorAll('.mt-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));const btn=document.getElementById('modeBtn');if(btn)btn.innerHTML=m==='dark'?'☀️':'🌙';},
toggleMode(){this.setMode((localStorage.getItem('vm_mode')||'light')==='dark'?'light':'dark');},
setScheme(s){document.documentElement.setAttribute('data-scheme',s);localStorage.setItem('vm_scheme',s);App.toast('Theme updated');},
/* Ads */
adNative(slot){
  const ads={
    dashboard:{logo:'📘',title:'Unlock full mock papers',desc:'500+ CBSE Board questions with detailed solutions',cta:'Try Free',href:'#'},
    subjects:{logo:'🎯',title:'Personalised study plans',desc:'Expert teachers · Adaptive learning · Board-focused',cta:'Learn More',href:'#'}
  };
  const ad=ads[slot]||ads.dashboard;
  return`<div class="ad-native"><div class="ad-logo">${ad.logo}</div><div class="ad-body"><div class="ad-title">${ad.title}</div><div class="ad-desc">${ad.desc}</div></div><a href="${ad.href}" class="ad-cta" target="_blank" rel="noopener sponsored">${ad.cta}</a></div>`;
},
adBanner(){
  return`<div class="ad-banner"><div class="ad-banner-icon">🏆</div><div class="ad-banner-text"><div class="ad-banner-title">Previous Years' Board Papers</div><div class="ad-banner-sub">2015–2024 with full solutions — free to download</div></div><a href="#" class="ad-banner-btn" target="_blank" rel="noopener sponsored">View →</a></div>`;
},
/* Navbar */
navbarHTML(){
  const profile=this.getProfile();
  const name=VidyaSec.sanitize(profile?.name||'Student');
  const initials=name[0]?.toUpperCase()||'S';
  const site=VidyaSec.sanitize(localStorage.getItem('vm_site_name')||'Class 10Edu');
  const mode=localStorage.getItem('vm_mode')||'light';
  return`<nav class="topnav" id="mainNav">
    <button class="mob-burger" onclick="App.toggleSidebar()">☰</button>
    <a href="index.html" class="nav-brand"><div class="nav-gem">C</div><div class="nav-wordmark"><span class="nav-title">${site}</span><span class="nav-sub">Class 10 · CBSE/NCERT</span></div></a>
    <div class="nav-search"><span class="nav-sico">⌕</span><input type="text" id="searchInput" placeholder="Search chapters, topics, lessons…" autocomplete="off" spellcheck="false" oninput="App.doSearch(this.value)" onfocus="App.showSearch()" onblur="setTimeout(()=>App.hideSearch(),180)"><div class="search-drop" id="searchDrop"></div></div>
    <div class="nav-right">
      <button class="nav-ic" onclick="TodoPanel.toggle()" id="todoNavBtn">✓<div class="notif-pip" id="todoNDot"></div></button>
      <button class="nav-ic" onclick="ThemeEngine.toggle()" title="Appearance">🎨</button>
      <button class="nav-ic" id="modeBtn" onclick="App.toggleMode()">${mode==='dark'?'☀️':'🌙'}</button>
      <div class="user-pill" onclick="App._showProfileEdit()"><div class="user-av">${initials}</div><span class="user-nm">${name}</span></div>
    </div>
  </nav>`;
},
/* Sidebar */
sidebarHTML(active){
  const p=this.getProgress(),profile=this.getProfile(),bm=this.getBookmarks().length;
  const subs=[{id:'mathematics',name:'Mathematics',icon:'📐'},{id:'science',name:'Science',icon:'🔬'},{id:'social-science',name:'Social Science',icon:'🌍'},{id:'english',name:'English',icon:'📚'}];
  if(profile?.favourite){const fi=subs.findIndex(s=>s.id===profile.favourite);if(fi>0){const[f]=subs.splice(fi,1);subs.unshift(f);}}
  return`<aside class="sidebar" id="sidebar">
    <span class="sb-lbl">Navigate</span>
    <a href="dashboard.html" class="sb-link ${active==='dashboard'?'on':''}"><div class="sb-icon">🏠</div>Dashboard</a>
    <a href="sample-papers.html" class="sb-link ${active==='sample-papers'?'on':''}"><div class="sb-icon">🏆</div>Sample Papers</a>
    <a href="todo.html" class="sb-link ${active==='todo'?'on':''}"><div class="sb-icon">✅</div>My Tasks</a>
    <a href="bookmarks.html" class="sb-link ${active==='bookmarks'?'on':''}"><div class="sb-icon">🔖</div>Bookmarks${bm>0?` <span class="sb-badge">${bm}</span>`:''}</a>
    <a href="teachers.html" class="sb-link ${active==='teachers'?'on':''}"><div class="sb-icon">👨‍🏫</div>Teachers</a>
    <div class="sb-div"></div>
    <span class="sb-lbl">Subjects</span>
    ${subs.map(s=>{const done=(p[s.id]?.done||[]).length;return`<a href="subject.html?id=${s.id}" class="sb-link ${active===s.id?'on':''}"><div class="sb-icon">${s.icon}</div>${s.name}${done>0?` <span class="sb-badge">${done}</span>`:''}</a>`;}).join('')}
    <div class="sb-div"></div>
    <a href="admin.html" class="sb-link ${active==='admin'?'on':''}" style="opacity:.45;font-size:.78rem"><div class="sb-icon" style="font-size:12px">⚙️</div>Admin</a>
  </aside>`;
},
/* Theme panel */
themeHTML(){
  const mode=localStorage.getItem('vm_mode')||'light';
  return`<div class="slide-panel" id="themePanel">
    <div class="sp-head"><h3>🎨 Appearance</h3><button class="btn btn-gh btn-sm" onclick="ThemeEngine.toggle()">✕</button></div>
    <span class="sp-lbl">Colour Mode</span>
    <div class="mode-toggle">
      <div class="mt-btn ${mode==='light'?'active':''}" data-mode="light" onclick="App.setMode('light')">☀️ Light</div>
      <div class="mt-btn ${mode==='dark'?'active':''}" data-mode="dark" onclick="App.setMode('dark')">🌙 Dark</div>
    </div>
    <span class="sp-lbl">Extract from Photo</span>
    <div class="upload-drop" onclick="document.getElementById('themeFileInp').click()">
      <input type="file" id="themeFileInp" accept="image/*" style="display:none" onchange="ThemeEngine.handleUpload(event)">
      <div style="font-size:24px;margin-bottom:5px">🖼️</div>
      <p style="font-size:.82rem;color:var(--ink-3);font-weight:600;margin-bottom:2px">Upload any image</p>
      <span style="font-size:.72rem;color:var(--ink-4)">Colours extracted automatically</span>
    </div>
    <div id="themePreviewWrap" style="display:none">
      <img id="themePreviewImg" src="" alt="" style="width:100%;height:78px;object-fit:cover;border-radius:8px;margin-bottom:8px">
      <div class="swatches-row" id="swatchRow"></div>
      <button class="btn btn-b" style="width:100%;margin-bottom:6px" onclick="ThemeEngine.applyExtracted()">✨ Apply Colours</button>
      <button class="btn btn-gh" style="width:100%" onclick="ThemeEngine.reset()">↺ Reset</button>
    </div>
  </div>
  <div class="backdrop" id="themeBack" onclick="ThemeEngine.toggle()"></div>`;
},
todoPanelHTML(){return`<div class="slide-panel" id="todoPanel"><div class="sp-head"><h3>✅ My Tasks</h3><button class="btn btn-gh btn-sm" onclick="TodoPanel.toggle()">✕</button></div><div id="todoPanelBody"></div></div><div class="backdrop" id="todoBack" onclick="TodoPanel.toggle()"></div>`;},
_showProfileEdit(){
  const profile=this.getProfile()||{};
  const ov=document.createElement('div');ov.className='wall-overlay';
  ov.innerHTML=`<div class="wall-card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div class="wall-title" style="font-size:1.2rem">Edit Profile</div><button class="btn btn-gh btn-sm" id="cpClose">✕</button></div><div class="fg"><label>Your Name</label><input class="fc" id="cpName" value="${VidyaSec.sanitize(profile.name||'')}" maxlength="40"></div><button class="btn btn-b" id="cpSave" style="width:100%;justify-content:center;margin-top:4px">Save</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#cpClose').addEventListener('click',()=>ov.remove());
  ov.querySelector('#cpSave').addEventListener('click',()=>{
    const name=VidyaSec.sanitize((ov.querySelector('#cpName').value||'').trim());
    if(!name)return;
    this.saveProfile({...profile,name});ov.remove();
    const nb=document.getElementById('nb');if(nb)nb.innerHTML=this.navbarHTML();
    App.toast('Profile updated ✅');
  });
},
async doSearch(q){
  const drop=document.getElementById('searchDrop');if(!drop)return;
  const sq=q.trim();if(!sq){drop.classList.remove('open');return;}
  const data=await this.loadData();const lq=sq.toLowerCase(),res=[];
  data.subjects.forEach(s=>{
    if(s.name.toLowerCase().includes(lq))res.push({icon:s.icon,title:s.name,sub:`${s.chapters.length} chapters`,url:`subject.html?id=${s.id}`});
    s.chapters.forEach(ch=>{
      if(ch.title.toLowerCase().includes(lq))res.push({icon:'📄',title:ch.title,sub:s.name,url:`chapter.html?subject=${s.id}&chapter=${ch.id}`});
      (ch.lessons||[]).forEach(l=>{if(l.title.toLowerCase().includes(lq))res.push({icon:'▶️',title:l.title,sub:`${s.name} › ${ch.title}`,url:`chapter.html?subject=${s.id}&chapter=${ch.id}&lesson=${l.id}`});});
      (ch.ncertTopics||[]).forEach(t=>{if(t.text.toLowerCase().includes(lq))res.push({icon:'⭐',title:t.text.slice(0,55),sub:`${s.name} › ${ch.title}`,url:`chapter.html?subject=${s.id}&chapter=${ch.id}`});});
    });
  });
  drop.innerHTML=res.length?res.slice(0,9).map(r=>`<a class="sd-row" href="${r.url}"><div class="sd-ico">${r.icon}</div><div><div class="sd-title">${VidyaSec.sanitize(r.title)}</div><div class="sd-sub">${VidyaSec.sanitize(r.sub)}</div></div></a>`).join(''):`<div class="sd-row"><div class="sd-sub">No results for "${VidyaSec.sanitize(sq)}"</div></div>`;
  drop.classList.add('open');
},
showSearch(){const v=document.getElementById('searchInput')?.value;if(v)this.doSearch(v);},
hideSearch(){document.getElementById('searchDrop')?.classList.remove('open');},
toggleSidebar(){document.getElementById('sidebar')?.classList.toggle('open');document.getElementById('sbBack')?.classList.toggle('on');},
toast(msg,ico='✅'){let t=document.getElementById('appToast');if(!t){t=document.createElement('div');t.id='appToast';t.className='toast';t.setAttribute('role','alert');document.body.appendChild(t);}t.innerHTML=`<span>${ico}</span> ${VidyaSec.sanitize(msg)}`;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3200);},
initPage(active){
  this.applyMode();
  const nb=document.getElementById('nb'),sb=document.getElementById('sb');
  if(nb)nb.innerHTML=this.navbarHTML();
  if(sb)sb.innerHTML=this.sidebarHTML(active);
  document.body.insertAdjacentHTML('beforeend',this.themeHTML());
  document.body.insertAdjacentHTML('beforeend',this.todoPanelHTML());
  document.body.insertAdjacentHTML('beforeend',`<div class="backdrop" id="sbBack" onclick="App.toggleSidebar()"></div>`);
  ThemeEngine.init();TodoPanel.init();
  const m=localStorage.getItem('vm_mode')||'light';
  const btn=document.getElementById('modeBtn');if(btn)btn.innerHTML=m==='dark'?'☀️':'🌙';
  document.querySelectorAll('.mt-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));
}
};
