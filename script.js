
const accountApiBase = location.protocol === "file:" ? "http://localhost:3000" : "";

async function renderSharedLeaderboard(){
  const el=$("leaderboardContent");
  if(!el)return;
  let board=[];
  try{
    // Flush this browser's genuine local changes to the root first, then
    // read the canonical leaderboard. This makes the leaderboard converge
    // immediately instead of waiting for the 3-second background timer.
    if(serverAvailable) await pushServerUsers();
    const r=await fetch(`${accountApiBase}/api/leaderboard`,{cache:"no-store"});
    if(!r.ok)throw new Error("leaderboard request failed");
    const d=await r.json();
    board=Array.isArray(d.leaderboard)?d.leaderboard:[];
  }catch{
    board=Object.entries(users||{}).map(([username,u])=>({
      username, opened:Number(u.opened||0), coins:Number(u.coins||0),
      xp:Number(u.xp||0), score:Number(u.score||u.xp||u.opened||0)
    })).sort((a,b)=>b.score-a.score||b.opened-a.opened||b.coins-a.coins||a.username.localeCompare(b.username));
  }
  el.innerHTML=board.map((x,i)=>`<div class="rank"><b>${i<3?["🥇","🥈","🥉"][i]:i+1}</b><span class="rank-player">${getAvatarVisual(x.username)} <span>${escapeHtml(x.username)}${x.username===current?" (You)":""}</span></span><b>${Number(x.opened||0)} packs</b></div>`).join("");
}


/* Data preservation: never wipe existing localStorage on startup. */
const $=id=>document.getElementById(id);
const liveChannel = ("BroadcastChannel" in window) ? new BroadcastChannel("brooket_live") : null;
let realtimeSocket = null;
let realtimeChatReady = false;
let onlineRealtimePlayers = [];
function connectRealtimeChat(){
  // Realtime chat also works when index.html is opened directly, as long as
  // the bundled Node server is running on localhost:3000. When served by the
  // server, always connect back to the same host so LAN/hosting deployments work.
  const isFile = location.protocol === "file:";
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const endpoint = isFile ? "ws://localhost:3000" : `${proto}//${location.host}`;
  try {
    realtimeSocket = new WebSocket(endpoint);
    realtimeSocket.onopen = ()=>{ realtimeChatReady=true; sendRealtimePresence(); };
    realtimeSocket.onmessage = ev=>{
      try {
        const data=JSON.parse(ev.data);
        if(data.type === "chat:init"){
          localStorage.setItem("pm_chat",JSON.stringify(data.messages||[]));
          renderChat(); renderCredits();
        } else if(data.type === "presence:list"){
          onlineRealtimePlayers = Array.isArray(data.players) ? data.players : [];
          renderChat(); renderCredits();
        } else if(data.type === "chat:new"){
          const msgs=JSON.parse(localStorage.getItem("pm_chat")||"[]");
          if(!msgs.some(x=>x.id===data.message.id)) msgs.push(data.message);
          localStorage.setItem("pm_chat",JSON.stringify(msgs.slice(-100)));
          renderChat(); renderCredits();
        }
      } catch {}
    };
    realtimeSocket.onclose=()=>{ realtimeChatReady=false; setTimeout(connectRealtimeChat,2000); };
    realtimeSocket.onerror=()=>{ realtimeChatReady=false; };
  } catch {}
}
if(liveChannel){
  liveChannel.onmessage = (ev)=>{
    if(!ev.data) return;
    if(ev.data.type==="chat" || ev.data.type==="announcement"){ renderChat(); renderAll(); }
    if(ev.data.type==="users"){ users=JSON.parse(localStorage.getItem("pm_users")||"{}"); if(current&&users[current]){account=users[current]; renderAll();} }
  };
}
function broadcast(type,payload={}){ if(liveChannel) liveChannel.postMessage({type,...payload}); }
function sendRealtimePresence(){
  if(!realtimeSocket || realtimeSocket.readyState!==WebSocket.OPEN || !current) return;
  const avatar = account?.inventory?.find(x=>x.id===account.avatar);
  realtimeSocket.send(JSON.stringify({type:"presence:set",user:current,avatar:avatar?.item||"🙂",rarity:avatar?.rarity||""}));
}
connectRealtimeChat();


const packs=[
["BOT","assets/packs/bot-pack.png","#20a65b","A techy pack full of robots, computers and futuristic Blooks."],["BUG","assets/packs/bug-pack.png","#5f9d3d","A creepy-crawly collection packed with bugs and tiny creatures."],["DINO","assets/packs/dino-pack.png","#3f8b46","Prehistoric Blooks inspired by dinosaurs, fossils and ancient adventures."],["CANDY","assets/packs/candy-pack.png","#7650dc","Sweet Blooks, colorful treats and candy-themed surprises."],
["FRUIT","assets/packs/fruit-pack.png","#c8b5a4","Fresh fruit-themed Blooks with bright, juicy designs."],["MAGIC","assets/packs/magic-pack.png","#8a765c","Magical Blooks featuring spells, wizards and mysterious artifacts."],["MUSIC","assets/packs/music-pack.png","#9e2732","Musical Blooks for players who love instruments, beats and performances."],["RETRO","assets/packs/retro-pack.png","#e51aa8","Classic retro and arcade-inspired Blooks from old-school tech."],
["SPACE","assets/packs/space-pack.png","#222f77","Explore space with alien, rocket and cosmic-themed Blooks."],["AUTUMN","assets/packs/autumn-pack.png","#e77a19","Cozy autumn Blooks with fall colors, pumpkins and seasonal vibes."],["COMBAT","assets/packs/combat-pack.png","#525681","Battle-ready Blooks with armor, weapons and action themes."],["PIRATE","assets/packs/pirate-pack.png","#20a4ce","Set sail for pirate-themed Blooks, treasure and ocean adventures."],
["SAFARI","assets/packs/safari-pack.png","#ed851b","Wild safari Blooks featuring animals and expedition themes."],["SCI-FI","assets/packs/sci-fi-pack.png","#c64fda","Futuristic science-fiction Blooks with space tech and experiments."],["SPOOKY","assets/packs/spooky-pack.png","#7a326f","Spooky Blooks with ghosts, monsters and Halloween-style surprises."],
["SPORTS","assets/packs/sports-pack.png","#12ad35","Sports-themed Blooks inspired by games, teams and trophies."],["SUMMER","assets/packs/summer-pack.png","#8bd9d0","Sunny summer Blooks with beaches, water and vacation vibes."],["AQUATIC","assets/packs/aquatic-pack.png","#1988cf","Underwater Blooks featuring ocean creatures and aquatic adventures."],
["DESSERT","assets/packs/dessert-pack.png","#8fc879","Dessert-themed Blooks full of cakes, cookies and sweet treats."],["OUTBACK","assets/packs/outback-pack.png","#c97436","Australian outback-inspired Blooks featuring wild animals and adventure."],
["OG","assets/packs/og-pack.png","#2aa9df","The OG Pack — classic throwback Blooks and old-school favorites."],["ANKHA","assets/packs/ankha-pack.png","#b77b24","The ANKHA Pack — a special collection centered around the iconic cat theme."],["TIME","assets/packs/time-pack.png","#6f4a2f","The Time Pack — clocks, watches and time-themed Blooks."],["VIDEO GAME","assets/packs/video-game-pack.png","#1b4fa3","A fast-paced pack inspired by classic video games, arcade characters and pixel worlds."],["ICE MONSTERS","assets/packs/ice-monsters-pack.png","#38a6cf","A chilly pack filled with icy monsters, snow creatures and frozen adventures."],["CHESS","assets/packs/chess-pack.png","#3a2d2b","A strategy pack featuring chess pieces, boards and classic black-and-white designs."],
["VERITY","assets/packs/verity-pack.png","#4b14a8","An admin-exclusive pack containing the mysterious Verity Blook.","adminOnly"],
["FESTIVAL EXOTIC","assets/packs/festival-exotic-pack.png","#7b3ff2","A limited Festival Exotic pack featuring Untrusted, Mythical and Chroma Blooks.","adminOnly"]
];
const sets=[
["🖥️","🤖","🐱","💾","🌟"],["🐞","🪲","🐛","🦋","💎"],["🦕","🦖","🥚","🌋","🌌"],["🍭","🍬","🍫","🧁","💜"],
["🍉","🍓","🍍","🥝","🌈"],["🪄","🔮","🧙","✨","💜"],["🎸","🎹","🎧","🎤","🎶"],["👾","🕹️","📺","💿","💜"],
["👽","🚀","🪐","🌌","💜"],["🍁","🎃","🦊","☕","💜"],["🛡️","⚔️","🏹","💥","💜"],["🏴‍☠️","⚓","🦜","💰","💜"],
["🦁","🐘","🦒","🐯","💜"],["🤖","🛸","🔬","🛰️","💜"],["🎃","👻","🦇","💀","💜"],["⚽","🏀","🏈","🏆","💜"],
["😎","🏖️","🩴","🌊","💜"],["🐟","🦈","🐙","🐳","💜"],["🍰","🍩","🍪","🍮","💜"],["🦘","🐊","🪃","🐨","💜"],
["📸","🐱","📱","💿","✨"],["🟡","🐱","👑","🐈","✨"],["🕰️","⌛","⏱️","⏳","🧭"], ["🕹️","👾","🎮","🟦","⭐"], ["❄️","👹","🧊","☃️","💎"], ["♟️","♜","♞","♝","♛"],["Verity"],["Festival Untrusted","Festival Angelic","Festival Chroma"]
];

function readUsersSafe(){
  try{
    const raw=localStorage.getItem("pm_users");
    const parsed=raw?JSON.parse(raw,(k,v)=>v==="__INF__"?Infinity:v):{};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  }catch(e){
    console.warn("Could not read saved accounts; starting with an empty account map.",e);
    return {};
  }
}
let users=readUsersSafe();
let current=localStorage.getItem("pm_current")||null;
let account=null, selected=null, registerMode=false; window.__registerMode=false;

// Server is the source of truth when the Node server is available.
// localStorage remains a cache so the site still works offline.
let serverUsersReady = null;
let serverSyncTimer = null;
let serverSaveQueue = Promise.resolve();
// Snapshot the browser cache BEFORE contacting the shared root server.
// This is important: an untouched local account must not be treated as a
// newer change and overwrite another player's canonical server account.
let lastSyncedUsers = cloneUsers(users);
let serverAvailable = false;

function serverUsersUrl(){ return `${accountApiBase}/api/users`; }

function cloneUsers(value){
  try { return JSON.parse(JSON.stringify(value,(k,v)=>v===Infinity?"__INF__":v)); }
  catch { return {}; }
}
function markChangedAccounts(){
  const now=Date.now();
  for(const [username, acc] of Object.entries(users||{})){
    const before=lastSyncedUsers[username];
    const normalized=cloneUsers(acc);
    // Only stamp accounts that really changed locally since the last
    // successful server snapshot. New local accounts are also pushed.
    if(!before || JSON.stringify(before)!==JSON.stringify(normalized)){
      acc.updatedAt=Math.max(Number(acc.updatedAt||0), now);
    }
  }
}
async function loadServerUsers(){
  try{
    const r=await fetch(serverUsersUrl(),{cache:"no-store"});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const data=await r.json();
    const remote = data && data.users && typeof data.users === "object" && !Array.isArray(data.users) ? data.users : {};
    serverAvailable=true;

    // Root sync rule:
    // 1) remote accounts win when they are newer;
    // 2) local-only/newer accounts are retained and pushed;
    // 3) never replace the entire local account map with a server snapshot.
    const localBefore=cloneUsers(users);
    let mergedChanged=false;
    for(const [username, remoteAcc] of Object.entries(remote)){
      const localAcc=users[username];
      if(!localAcc || Number(remoteAcc?.updatedAt||0) > Number(localAcc?.updatedAt||0)){
        users[username]=remoteAcc;
        mergedChanged=true;
      }
    }

    // Always keep the canonical Admin account in THIS SAME shared map.
    const adminKey = Object.keys(users||{}).find(k => String(k).toLowerCase() === "blooketstudio");
    if(adminKey){
      const admin=users[adminKey];
      admin.admin=true;
      admin.role="admin";
      admin.displayName ||= adminKey;
      admin.password="Growgarden1@";
      admin.banned=false; admin.muted=false;
      admin.coins=Number(admin.coins ?? 865);
      admin.tokens=Number(admin.tokens ?? 100);
      admin.opened=Number(admin.opened ?? 0);
      admin.inventory=Array.isArray(admin.inventory)?admin.inventory:[];
      admin.updatedAt=Number(admin.updatedAt||0);
    }else{
      users.Blooketstudio=makeAccount("Blooketstudio","Growgarden1@");
      users.Blooketstudio.admin=true;
      users.Blooketstudio.displayName="Blooketstudio";
      users.Blooketstudio.updatedAt=Date.now();
      mergedChanged=true;
    }

    for(const a of Object.values(users||{})){ normalizeRole(a); if(String(a.role||"").toLowerCase()==="admin") a.admin=true; if(String(a.role||"").toLowerCase()==="partner") a.admin=false; }
    localStorage.setItem("pm_users",JSON.stringify(users,(k,v)=>v===Infinity?"__INF__":v));
    lastSyncedUsers=cloneUsers(users);

    // If this browser contained an account that the root server did not
    // have, or a genuinely newer local account, push it now. Compare against
    // the server snapshot rather than blindly pushing the whole cache.
    let needPush=false;
    for(const [u,localAcc] of Object.entries(localBefore)){
      const remoteAcc=remote[u];
      if(!remoteAcc || Number(localAcc?.updatedAt||0)>Number(remoteAcc?.updatedAt||0)){
        needPush=true;
        break;
      }
    }
    if(needPush) await pushServerUsers();

    if(current){
      const sessionKey=Object.keys(users).find(k=>String(k).toLowerCase()===String(current).toLowerCase());
      if(sessionKey){
        current=sessionKey;
        localStorage.setItem("pm_current",current);
        account=users[current];
      }
    }
    try{renderAll();}catch{}
    try{renderSharedLeaderboard();}catch{}
  }catch(e){
    serverAvailable=false;
    console.warn("Shared root server unavailable; using this browser's local cache.",e.message);
  }
  return users;
}
async function pushServerUsers(){
  if(!serverAvailable) return;
  markChangedAccounts();
  const payload={users:cloneUsers(users)};
  // Serialize writes from this browser so saves cannot arrive out of order.
  serverSaveQueue=serverSaveQueue.then(async()=>{
    try{
      const r=await fetch(serverUsersUrl(),{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      if(data?.users && typeof data.users==="object"){
        // Do not blindly replace local data: merge by updatedAt.
        for(const [u,remoteAcc] of Object.entries(data.users)){
          const localAcc=users[u];
          if(!localAcc || Number(remoteAcc.updatedAt||0)>=Number(localAcc.updatedAt||0)){
            users[u]=remoteAcc;
          }
        }
        lastSyncedUsers=cloneUsers(users);
        localStorage.setItem("pm_users",JSON.stringify(users,(k,v)=>v===Infinity?"__INF__":v));
      }
    }catch(e){
      console.warn("Could not save shared accounts to server.",e.message);
    }
  });
  return serverSaveQueue;
}
function mergeRemoteUsers(remoteUsers){
  let changed=false;
  for(const [u,remoteAcc] of Object.entries(remoteUsers||{})){
    const localAcc=users[u];
    if(!localAcc || Number(remoteAcc.updatedAt||0)>Number(localAcc.updatedAt||0)){
      users[u]=remoteAcc; changed=true;
    }
  }
  return changed;
}
function startAccountSync(){
  if(serverSyncTimer) clearInterval(serverSyncTimer);
  serverSyncTimer=setInterval(async()=>{
    try{
      const r=await fetch(serverUsersUrl(),{cache:"no-store"});
      if(!r.ok)return;
      serverAvailable=true;
      const data=await r.json();
      const remoteUsers=data?.users;
      if(!remoteUsers || typeof remoteUsers!=="object" || Array.isArray(remoteUsers))return;
      const changed=mergeRemoteUsers(remoteUsers);
      for(const a of Object.values(users||{})){ normalizeRole(a); if(String(a.role||"").toLowerCase()==="admin") a.admin=true; if(String(a.role||"").toLowerCase()==="partner") a.admin=false; }
      if(changed){
        localStorage.setItem("pm_users",JSON.stringify(users,(k,v)=>v===Infinity?"__INF__":v));
        lastSyncedUsers=cloneUsers(users);
        if(current && users[current]) account=users[current];
        try{renderAll();}catch{}
        // Keep an already-open leaderboard live when another player joins
        // or changes their score.
        try{
          const page=document.querySelector('[data-page="leaderboard"].active,[data-page="leaderboard"][aria-current="page"]');
          if(page) renderSharedLeaderboard();
        }catch{}
      }
      // If this browser has a newer local account, send it back.
      let localNewer=false;
      for(const [u,acc] of Object.entries(users||{})){
        if(Number(acc?.updatedAt||0)>Number(remoteUsers[u]?.updatedAt||0)){localNewer=true;break;}
      }
      if(localNewer) await pushServerUsers();
    }catch(e){ serverAvailable=false; }
  },3000);
}
serverUsersReady=loadServerUsers().then(()=>{startAccountSync();return users;});

function saveUsers(){
  localStorage.setItem("pm_users",JSON.stringify(users,(k,v)=>v===Infinity?"__INF__":v));
  broadcast("users");
  if(serverUsersReady) serverUsersReady.then(()=>pushServerUsers());
}
function save(){ if(account?.inventory) account.inventory=account.inventory.map(normalizeBlookRarity); users[current]=account;saveUsers()}
function makeAccount(u,p){return{password:p,displayName:u,coins:0,tokens:0,opened:0,inventory:[],avatar:null,admin:false,role:"user",banned:false,muted:false,dailyReward:{lastClaim:null,streak:0},updatedAt:Date.now()}}
const BLOOK_IMAGE_MAP=new Map(sets.flatMap(r=>r).map((item,i)=>[item,"assets/blooks/blook_"+i+".svg"]));
/* Each pack slot resolves to its own blook_N.svg first, so repeated labels such as 💜 do NOT share an image. */
const CUSTOM_BLOOK_IMAGES={"Festival Chroma":"assets/blooks/festival-chroma.png","Festival Angelic":"assets/blooks/festival-mythical.png","Festival Untrusted":"assets/blooks/festival-untrusted.png"};
function packIndexForName(packName){ return packs.findIndex(p=>p[0]===packName); }
function blookImage(item,cls="blook-img",packIndex=null){
  let src=null;
  if(item === "Verity") src="assets/blooks/verity.png";
  if(CUSTOM_BLOOK_IMAGES[item]) src=CUSTOM_BLOOK_IMAGES[item];
  if(Number.isInteger(packIndex) && packIndex>=0 && !CUSTOM_BLOOK_IMAGES[item]){
    const ri=sets[packIndex]?.indexOf(item);
    const imageIndex=packIndex*5+ri;
    if(ri>=0 && imageIndex>=0 && imageIndex<130) src="assets/blooks/blook_"+imageIndex+".svg";
  }
  if(!src) src=BLOOK_IMAGE_MAP.get(item)||null;
  if(!src) return `<span class="blook-fallback" style="display:block">${escapeHtml(item)}</span>`;
  return `<img class="${cls}" src="${src}" alt="${escapeHtml(item)} Blook" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="blook-fallback" style="display:none">${escapeHtml(item)}</span>`;
}
function rarityClass(r){return String(r||"").toLowerCase().replace(/[^a-z]/g,"");}
function blookVisual(x, cls="blook-img"){
  const rc=rarityClass(x.rarity);
  const pi=packIndexForName(x.pack);
  return `<div class="blook-visual rarity-${rc}">${blookImage(x.item,cls,pi)}<span class="mythic-spark s1">✦</span><span class="mythic-spark s2">✧</span><span class="mythic-spark s3">✦</span></div>`;
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function setAuthMode(reg){
 registerMode=!!reg; window.__registerMode=registerMode;
 $("authTitle").textContent=reg?"Sign Up":"Log In";
 $("authSub").textContent=reg?"Create a new player account":"Log in to start playing";
 $("authBtn").textContent=reg?"SIGN UP":"LOG IN";
 $("switchAuth").textContent=reg?"Already have an account? Log In":"Don't have an account? Sign Up";
 $("authPass2").classList.toggle("hidden",!reg);
 $("authMsg").textContent="";
}
async function auth(){
 // Login/Sign Up must never wait for the shared server. The server sync runs in the background.
 const u=$("authUser").value.trim(),p=$("authPass").value;
 if(!u||!p)return $("authMsg").textContent="Please fill in all fields.";
 if(!/^[A-Za-z0-9_]{3,20}$/.test(u))return $("authMsg").textContent="Username must be 3–20 characters.";
 if(window.__registerMode){
  if(p.length<4)return $("authMsg").textContent="Password must be at least 4 characters.";
  if($("authPass2").value!==p)return $("authMsg").textContent="Passwords do not match.";
  const existingKey=Object.keys(users).find(k=>String(k).toLowerCase()===u.toLowerCase());
  if(existingKey)return $("authMsg").textContent="That username already exists.";
  users[u]=makeAccount(u,p);
  saveUsers();
  enter(u);
  // Push the new account in the background; never block the UI.
  Promise.resolve(serverUsersReady).then(()=>pushServerUsers()).catch(()=>{});
 }else{
  const key = Object.keys(users).find(k=>String(k).toLowerCase()===u.toLowerCase());
  const loginKey = key || u;
  const saved = users[loginKey];
  if(!saved) return $("authMsg").textContent="Incorrect username or password.";
  if(String(loginKey).toLowerCase()==="blooketstudio"){
    if(p!=="Growgarden1@") return $("authMsg").textContent="Incorrect username or password.";
    saved.password="Growgarden1@";
    saved.admin=true;
    users[loginKey]=saved;
    saveUsers();
  }else if(saved.password!==p){
    return $("authMsg").textContent="Incorrect username or password.";
  }
  enter(loginKey);
  // Refresh shared data in the background after login.
  Promise.resolve(serverUsersReady).then(()=>{
    const key=Object.keys(users).find(k=>String(k).toLowerCase()===u.toLowerCase());
    if(key && key!==current){ current=key; account=users[key]; normalizeRole(account); update(); renderAll(); }
  }).catch(()=>{});
 }
}
window.auth=auth;
window.setAuthMode=setAuthMode;
function festivalRarityForItem(item){
 const map={"Festival Untrusted":"Untrusted","Festival Angelic":"Mythical","Festival Chroma":"Chroma"};
 return map[item]||null;
}
function normalizeBlookRarity(x){
 if(!x || typeof x!=="object") return x;
 if(x.pack==="FESTIVAL EXOTIC"){
   const correct=festivalRarityForItem(x.item);
   if(correct) x.rarity=correct;
 }
 return x;
}
function enter(u){
 current=u;localStorage.setItem("pm_current",u);account=users[u];
 if(String(u).toLowerCase()==="blooketstudio"){ account.banned=false; account.admin=true; account.role="admin"; }
 account.coins ??= 0; account.tokens ??= 0; account.avatar ??= null; account.admin ??= false; normalizeRole(account); if(String(account.role||"").toLowerCase()==="admin") account.admin=true; if(String(account.role||"").toLowerCase()==="partner") account.admin=false; account.banned ??= false; account.muted ??= false;
 account.inventory=Array.isArray(account.inventory)?account.inventory:[];
 account.inventory=account.inventory.map(x=>{x.id??=("blook_"+Date.now()+"_"+Math.random().toString(36).slice(2));return normalizeBlookRarity(x);});
 if(account.avatar && !account.inventory.some(x=>x.id===account.avatar)) account.avatar=null;
 if(account.banned){localStorage.removeItem("pm_current"); $("authMsg").textContent="This account has been banned."; return;}
 try{ save(); }catch(e){ console.error("Save after login failed",e); }
 const authScreen=$("authScreen"), game=$("game");
 if(authScreen) { authScreen.classList.add("hidden"); authScreen.style.display="none"; }
 if(game) { game.classList.remove("hidden"); game.style.display="block"; }
 document.body.classList.add("logged-in");
 try{ renderAll(); }catch(e){ console.error("Post-login render error:",e); }
 // The socket can open before login is completed. Re-send presence here so
 // the server always receives the logged-in username and avatar.
 setTimeout(sendRealtimePresence, 0);
 bazaarRefresh();
}
setAuthMode(false);

// Reliable Login / Sign Up handlers.
// Bind after the auth controls exist, and also expose them for inline HTML handlers.
function bindAuthControls(){
  const authBtn = $("authBtn");
  const switchAuth = $("switchAuth");
  const authPass = $("authPass");
  const authPass2 = $("authPass2");
  if(authBtn){
    authBtn.type = "button";
    authBtn.onclick = (e)=>{ e?.preventDefault?.(); Promise.resolve(auth()).catch(err=>{ console.error(err); const m=$("authMsg"); if(m)m.textContent="Unable to log in right now."; }); };
  }
  if(switchAuth){
    switchAuth.type = "button";
    switchAuth.onclick = (e)=>{ e?.preventDefault?.(); setAuthMode(!window.__registerMode); };
  }
  if(authPass){
    authPass.onkeydown = (e)=>{ if(e.key==="Enter"){ e.preventDefault(); authBtn?.click(); } };
  }
  if(authPass2){
    authPass2.onkeydown = (e)=>{ if(e.key==="Enter"){ e.preventDefault(); authBtn?.click(); } };
  }
}
bindAuthControls();
window.auth = auth;
window.setAuthMode = setAuthMode;

function update(){
 $("coins").textContent=account.coins.toLocaleString();
 $("tokens").textContent=(account.tokens||0).toLocaleString();
 $("opened").textContent=account.opened;
 $("adminNav").classList.toggle("hidden",!isStaffAccount());
 $("inventoryCount").textContent=account.inventory.length;
 $("playerName").innerHTML=`${getAvatarVisual(current)} <span>${escapeHtml(account.displayName)}</span>`;
}

function renderPacks(){
 const visiblePacks=packs.map((p,i)=>({p,i})).filter(({p})=>!p[4] || isAdminAccount());
 $("packs").innerHTML=visiblePacks.map(({p,i})=>`
 <div class="pack ${(p[0]==="VERITY"||p[0]==="FESTIVAL EXOTIC")?'admin-pack':''} ${selected?.i===i?'selected':''}" style="--pack-accent:${p[2]}" onclick="buy(${i})">
   ${(p[0]==="VERITY"||p[0]==="FESTIVAL EXOTIC")?'<div class="admin-crown">👑</div>':''}
   <button class="pack-info" type="button" title="Rarest Drop / Drop Rates" aria-label="View ${escapeHtml(p[0])} Pack drop rates" onclick="event.stopPropagation();showPackInfo(${i})">?</button>
   <div class="pack-art"><img class="pack-image" src="${p[1]}" alt="${escapeHtml(p[0])} Pack"></div>
   <div class="pack-name">${escapeHtml(p[0])} Pack</div>
   <div class="price">🪙 ${((p[0]==="VERITY"||p[0]==="FESTIVAL EXOTIC")?1:25)}</div>
   ${(p[0]==="VERITY"||p[0]==="FESTIVAL EXOTIC")?'<div class="admin-only-badge">🔒 Admin Only</div>':''}
 </div>`).join("");
}

function showPackInfo(i){
 const p=packs[i], row=sets[i];
 $("packInfoTitle").textContent=p[0]+" PACK — DROP RATES";

 // Festival Exotic is a special 3-drop event pack with custom odds.
 if(p[0]==="FESTIVAL EXOTIC"){
   // Festival Exotic rarity tier: Untrusted (highest) > Mythical > Chroma.
   // Drop odds follow rarity: Untrusted is rarest, then Mythical, then Chroma.
   const festival=[
     {item:"Festival Untrusted",rarity:"Untrusted",chance:"0.25%",tier:"TIER 1"},
     {item:"Festival Angelic",rarity:"Mythical",chance:"1.75%",tier:"TIER 2"},
     {item:"Festival Chroma",rarity:"Chroma",chance:"98.00%",tier:"TIER 3"}
   ];
   const rows=festival.map(x=>`<div class="festival-drop-card festival-${rarityClass(x.rarity)}">
     <div class="festival-drop-visual">${blookVisual({item:x.item,rarity:x.rarity,pack:p[0]},"drop-rate-img")}</div>
     <div class="festival-drop-copy">
       <div class="festival-tier">${x.tier}</div>
       <div class="festival-drop-name">${escapeHtml(x.item)}</div>
       <div class="drop-rate-rarity rarity-${rarityClass(x.rarity)} rainbow-rarity">${x.rarity}</div>
       <strong class="drop-rate-percent">${x.chance}</strong>
     </div>
   </div>`).join("");
   $("packInfoBody").innerHTML=`
     <div class="festival-ui-hero">
       <div class="festival-ui-title">FESTIVAL EXOTIC</div>
       <div class="festival-ui-subtitle">Three exclusive Blooks • Rainbow effects</div>
       <div class="pack-info-preview" style="background:${p[2]}"><img src="${p[1]}" alt="${p[0]} Pack"></div>
     </div>
     <div class="festival-drop-list">${rows}</div>
     <div class="pack-info-meta festival-cost"><b>Cost:</b> 2,500 Tokens &nbsp; • &nbsp; <b>3 Blooks</b> &nbsp; • &nbsp; <b>Total chance: 100%</b></div>`;
   $("packInfoModal").classList.remove("hidden");
   return;
 }

 // Verity is a special admin-only pack: show exactly one drop in its rate panel.
 if(p[0]==="VERITY"){
   const item="Verity";
   $("packInfoBody").innerHTML=`
     <div class="pack-info-preview verity-rate-preview"><img src="${p[1]}" alt="Verity Pack"></div>
     <p class="drop-rate-note">The Verity Pack contains exactly one possible drop:</p>
     <div class="drop-rate-list">
       <div class="drop-rate-row verity-rate-row">
         <div class="drop-rate-blook verity-rate-blook">${blookImage(item,"drop-rate-img",i)}<span>Verity</span></div>
         <div class="drop-rate-rarity rarity-intrustdent rainbow-rarity">Intrustdent</div>
         <strong class="drop-rate-percent">100%</strong>
       </div>
     </div>
     <div class="verity-rate-note">🌈 <b>Verity • Intrustdent</b> — unique Verity Pack drop</div>
     <div class="pack-info-meta"><b>Cost:</b> 50 Tokens &nbsp; • &nbsp; <b>1 Blook</b> &nbsp; • &nbsp; <b>Total chance: 100%</b></div>`;
   $("packInfoModal").classList.remove("hidden");
   return;
 }

 const rarities=[
   ["Common","68%"],
   ["Rare","20%"],
   ["Epic","11.5%"],
   ["Chroma","0.4%"],
   ["Mythic","0.05%"]
 ];
 const rows=DISPLAY_RARITY_INDICES.map(ri=>{ const item=row[ri]; return `<div class="drop-rate-row">
     <div class="drop-rate-blook">${blookImage(item,"drop-rate-img",i)}<span>${escapeHtml(item)}</span></div>
     <div class="drop-rate-rarity rarity-${rarityClass(rarities[ri][0])}">${rarities[ri][0]}</div>
     <strong class="drop-rate-percent">${rarities[ri][1]}</strong>
   </div>`; }).join("");
 $("packInfoBody").innerHTML=`
   <div class="pack-info-preview" style="background:${p[2]}"><img src="${p[1]}" alt="${p[0]} Pack"></div>
   <p class="drop-rate-note">Drop rate for each Blook when opening the ${escapeHtml(p[0])} Pack:</p>
   <div class="drop-rate-list">${rows}</div>
   <div class="pack-info-meta"><b>Cost:</b> 25 Tokens &nbsp; • &nbsp; <b>5 Blooks</b> &nbsp; • &nbsp; <b>Total chance: 100%</b></div>`;
 $("packInfoModal").classList.remove("hidden");
}

function rarity(){
 const r=Math.random();
 if(r<.68)return"Common";
 if(r<.88)return"Rare";
 if(r<.995)return"Epic";
 if(r<.9995)return"Chroma";
 return"Mythic";
}
function rarityIndex(r){return{Common:0,Rare:1,Epic:2,Chroma:3,Mythic:4,Intrustdent:0}[r]}
// Blooks page order: Common → Rare → Epic → Chroma → Mythic (Mythic is the rarest).
const DISPLAY_RARITY_INDICES=[0,1,2,3,4];
const BLOOKS_RARITY_ORDER=["Common","Rare","Epic","Chroma","Mythic"];
function getForcedDrops(){return JSON.parse(localStorage.getItem("pm_forced_drops")||"{}")}
function saveForcedDrops(x){localStorage.setItem("pm_forced_drops",JSON.stringify(x))}
function catalogBlooks(){
 return sets.flatMap((row,pi)=>row.map((item,ri)=>{
   const pack=packs[pi][0];
   let rarity=pack==="VERITY"?"Intrustdent":["Common","Rare","Epic","Chroma","Mythic"][ri];
   if(pack==="FESTIVAL EXOTIC") rarity=festivalRarityForItem(item)||"Untrusted";
   return {id:"catalog_"+pi+"_"+ri,pack,item,rarity,pi,ri};
 }));
}
function forcedBlookFor(u){
 const f=getForcedDrops()[u];
 return f ? catalogBlooks().find(x=>x.id===f.id) : null;
}

function buy(i){
 const p=packs[i];
 if(!p || (p[4] && !account?.admin)) return alert("This Pack is available to admins only.");
 const cost=((p[0]==="VERITY"||p[0]==="FESTIVAL EXOTIC")?1:25);
 if(account.coins<cost)return alert("You don't have enough Tokens!");
 account.coins-=cost;account.opened++;
 const forced=forcedBlookFor(current);
 let r,b,packIndex=i;
 if(p[0]==="VERITY"){ r="Intrustdent"; b="Verity"; }
 else if(p[0]==="FESTIVAL EXOTIC"){
   if(forced && forced.pack===p[0]) { r=forced.rarity; b=forced.item; }
   else {
     const roll=Math.random();
     if(roll<0.0025){ r="Untrusted"; b="Festival Untrusted"; }
     else if(roll<0.02){ r="Mythical"; b="Festival Angelic"; }
     else { r="Chroma"; b="Festival Chroma"; }
   }
 }
 else if(forced){ r=forced.rarity;b=forced.item; }
 else{ r=rarity();b=sets[i][rarityIndex(r)]; }
 const rec={id:"blook_"+Date.now()+"_"+Math.random().toString(36).slice(2),pack:packs[i][0],item:b,rarity:r};
 account.inventory.push(rec);selected={i,rec};save();syncUsersWithServer(false).then(()=>{update();});showResult();
 if(r==="Mythic"||r==="Mythical"||r==="Chroma"||r==="Intrustdent")globalAnnouncement(account.displayName,b,r,packs[i][0]);
}

function showResult(){
 const p=packs[selected.i],r=selected.rec;
 $("modalTitle").textContent=p[0]+" PACK";
 $("result").style.background=p[2];
 $("result").innerHTML=`<div class="item">${blookVisual(r,"result-img")}</div><div class="rarity-label rarity-${rarityClass(r.rarity)}">${r.rarity}</div><small>${p[0]} Pack</small>`;
 $("modal").classList.remove("hidden");
}

function globalAnnouncement(player,blook,r,pack){
 let a=JSON.parse(localStorage.getItem("pm_announcements")||"[]");
 const m={player,blook,rarity:r,pack,time:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})};
 a.push(m);localStorage.setItem("pm_announcements",JSON.stringify(a.slice(-50)));
 let msgs=JSON.parse(localStorage.getItem("pm_chat")||"[]");
 msgs.push({user:"🤖 PackBot",text:`${player} opened ${pack} Pack → received ${blook} ${r}!`,time:m.time,bot:true,rarity:r});
 localStorage.setItem("pm_chat",JSON.stringify(msgs.slice(-100)));
 showAnnouncement(m);renderChat();
}
function showAnnouncement(m){
 const e=$("announcement");
 e.className="announcement "+(m.rarity==="Chroma"?"chroma":"");
 e.innerHTML=(m.rarity==="Chroma"?"💜":"⭐")+` <b>PackBot</b> • ${escapeHtml(m.player)} opened <b>${escapeHtml(m.pack)} Pack</b> and received <span style="font-size:28px">${escapeHtml(m.blook)}</span> <b>${m.rarity}</b>!`;
 e.classList.add("show");clearTimeout(window.annTimer);window.annTimer=setTimeout(()=>e.classList.remove("show"),6500);
}
function renderBotLog(){
 const a=JSON.parse(localStorage.getItem("pm_announcements")||"[]");
 $("botLog").innerHTML=a.length?a.slice().reverse().map(m=>`<div class="bot-msg ${m.rarity==="Chroma"?"chroma":""}">
 <div class="bot-title">🤖 PackBot: ${m.rarity} DROP!</div>
 <div>👤 <b>${escapeHtml(m.player)}</b> opened <b>${escapeHtml(m.pack)} Pack</b> → received <span style="font-size:24px">${escapeHtml(m.blook)}</span> <b>${m.rarity}</b>!</div>
 <small>${m.time}</small></div>`).join(""):'<div class="muted">No Mythic/Chroma drops yet.</div>';
}


function isAdminAccount(a=account){ return !!a && (a.admin===true || String(a.role||"").toLowerCase()==="admin"); }
function isPartnerAccount(a=account){ return !!a && String(a.role||"").toLowerCase()==="partner" && !isAdminAccount(a); }
function isStaffAccount(a=account){ return isAdminAccount(a) || isPartnerAccount(a); }
function normalizeRole(a){ if(!a) return a; if(a.admin===true) a.role="admin"; else if(!["user","partner","admin"].includes(String(a.role||"").toLowerCase())) a.role="user"; return a; }
function requireAdmin(){if(!isAdminAccount()){alert("You do not have admin permission.");return false}return true}
function requireStaff(){if(!isStaffAccount()){alert("You do not have Admin/Partner permission.");return false}return true}
function refreshAdmin(){
 if(!isStaffAccount())return;
 const fullAdmin=isAdminAccount();
 document.querySelectorAll(".admin-full-only").forEach(el=>el.classList.toggle("hidden",!fullAdmin));
 const notice=$("adminPanelNotice"); if(notice) notice.textContent=fullAdmin ? "You have full Admin permissions." : "Partner permissions: you can mute/unmute players and edit Tokens/ESP.";
 const names=Object.keys(users);
 const opts=names.map(u=>`<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join("");
 $("adminPlayer").innerHTML=opts;
 $("adminPlayerMod").innerHTML=opts;
 if($("adminRolePlayer")) $("adminRolePlayer").innerHTML=opts;
 $("adminPlayerDelete").innerHTML=opts;
 $("adminGivePlayer").innerHTML=opts;
 $("adminForcePlayer").innerHTML=opts;
 $("adminGivePack").innerHTML=packs.map((p,i)=>`<option value="${i}">${escapeHtml(p[0])} Pack</option>`).join("");
 refreshGiveBlooks();
 const forced=getForcedDrops();
 const catalog=catalogBlooks();
 $("adminForceBlook").innerHTML=catalog.map(x=>`<option value="${x.id}">${x.item} • ${x.rarity} • ${x.pack}</option>`).join("");
 const fu=$("adminForcePlayer").value;
 const f=forced[fu];
 if(f){
   $("adminForceBlook").value=f.id;
   $("adminForceStatus").textContent=`🎯 ${fu} is forced to ${f.item} (${f.rarity}) — 100%`;
 }else{
   $("adminForceStatus").textContent=`${fu||"Player"} does not have a forced 100% Blook.`;
 }
 $("adminPlayers").innerHTML=names.map(u=>{
   const a=users[u], f=forced[u];
   return `<div class="player-row"><span>${escapeHtml(u)}</span><span><span class="badge">${a.coins.toLocaleString()} Tokens</span> <span class="badge">${(a.tokens||0).toLocaleString()} ESP</span>${f?`<span class="badge">🎯 100% ${escapeHtml(f.item)}</span>`:""}${a.banned?'<span class="badge banned">BANNED</span>':''}${a.muted?'<span class="badge muted">MUTED</span>':''}</span></div>`;
 }).join("");
}
function refreshGiveBlooks(){
 const pi=Number($("adminGivePack")?.value||0);
 const row=sets[pi]||[];
 if($("adminGiveBlook")) {
  const pack=packs[pi]?.[0];
  if(pack === "VERITY") {
    $("adminGiveBlook").innerHTML = `<option value="0">Verity • Intrustdent</option>`;
  } else if(pack === "FESTIVAL EXOTIC") {
    $("adminGiveBlook").innerHTML = row.map((item,ri)=>`<option value="${ri}">${escapeHtml(item)} • ${festivalRarityForItem(item)||"Untrusted"}</option>`).join("");
  } else {
    $("adminGiveBlook").innerHTML = DISPLAY_RARITY_INDICES.map(ri=>`<option value="${ri}">${escapeHtml(row[ri])} • ${["Common","Rare","Epic","Chroma","Mythic"][ri]}</option>`).join("");
  }
 }
}
function selectedAdminUser(){return $("adminPlayer").value}
function selectedModUser(){return $("adminPlayerMod").value}
if($("adminGivePack")) $("adminGivePack").onchange=refreshGiveBlooks;
if($("adminGiveApply")) $("adminGiveApply").onclick=()=>{
 if(!requireAdmin())return;
 const u=$("adminGivePlayer").value;
 const pi=Number($("adminGivePack").value);
 const ri=Number($("adminGiveBlook").value);
 const qty=Math.floor(Number($("adminGiveQty").value));
 const item=sets[pi]?.[ri];
 if(!u||!users[u]||!item)return alert("Choose a player, Pack, and Blook.");
 if(!Number.isInteger(qty)||qty<1||qty>10000)return alert("Quantity must be between 1 and 10,000.");
 const pack=packs[pi][0];
 const rarity=pack === "VERITY" ? "Intrustdent" : (pack === "FESTIVAL EXOTIC" ? (festivalRarityForItem(item)||"Untrusted") : ["Common","Rare","Epic","Chroma","Mythic"][ri]);
 users[u].inventory=users[u].inventory||[];
 for(let n=0;n<qty;n++){
   users[u].inventory.push({id:"blook_"+Date.now()+"_"+Math.random().toString(36).slice(2),pack,item,rarity});
 }
 saveUsers();
 if(u===current){account=users[u];renderAll();}
 refreshAdmin();
 $("adminGiveStatus").textContent=`🎁 Gave ${qty} × ${item} (${rarity}) from the ${pack} Pack to ${u}.`;
};
if($("adminCoinsInf")) $("adminCoinsInf").onchange=()=>{ const inf=$("adminCoinsInf").checked; $("adminCoins").disabled=inf; if(inf) $("adminCoins").value=""; };
if($("adminTokensInf")) $("adminTokensInf").onchange=()=>{ const inf=$("adminTokensInf").checked; $("adminTokens").disabled=inf; if(inf) $("adminTokens").value=""; };
if($("adminApplyBalance")) $("adminApplyBalance").onclick=()=>{
 const staff=account;
 if(!isStaffAccount()){alert("You do not have Admin/Partner permission.");return;}
 const u=selectedAdminUser(),a=users[u];
 if(!u||!a)return alert("Select an account.");
 const infiniteCoins=!!$("adminCoinsInf")?.checked;
 const infiniteTokens=!!$("adminTokensInf")?.checked;
 const c=Number($("adminCoins").value),t=Number($("adminTokens").value);
 if(isPartnerAccount(staff)){
   if(infiniteCoins||infiniteTokens)return alert("Partner can only edit Balance up to 10,000.");
   if(!Number.isFinite(c)||c<0||c>10000)return alert("Partner Balance must be between 0 and 10,000.");
   a.coins=Math.floor(c);
 }else{
   if(!infiniteCoins && (!Number.isFinite(c)||c<0))return alert("Enter a valid Balance amount or enable ∞.");
   if(!infiniteTokens && (!Number.isFinite(t)||t<0))return alert("Enter a valid EXP amount or enable ∞.");
   a.coins=infiniteCoins?Infinity:Math.floor(c);
   a.tokens=infiniteTokens?Infinity:Math.floor(t);
 }
 a.updatedAt=Date.now(); users[u]=a; saveUsers();
 if(u===current){account=a;renderAll();}
 refreshAdmin();
 alert("Updated "+u);
};
if($("adminBan")) $("adminBan").onclick=()=>{
 if(!requireAdmin())return;
 const u=selectedModUser();
 if(!u||!users[u])return alert("Select an account.");
 if(String(u).toLowerCase()==="blooketstudio")return alert("The main Blooketstudio account cannot be banned.");
 const willBan=!users[u].banned;
 if(willBan && !confirm("Are you sure you want to ban @"+u+"?"))return;
 if(!willBan && !confirm("Are you sure you want to unban @"+u+"?"))return;
 users[u].banned=willBan; users[u].updatedAt=Date.now(); saveUsers(); refreshAdmin();
 if(u===current && willBan){localStorage.removeItem("pm_current");alert("Account @"+u+" has been banned. You will be logged out.");location.reload();}
};
if($("adminMute")) $("adminMute").onclick=()=>{
 if(!requireStaff())return;
 const u=selectedModUser();
 if(!u||!users[u])return alert("Select an account.");
 users[u].muted=!users[u].muted;
 saveUsers();refreshAdmin();
};

if($("adminRolePlayer")) $("adminRolePlayer").onchange=()=>{ const u=$("adminRolePlayer").value,a=users[u]; if($("adminRoleSelect")&&a) $("adminRoleSelect").value=isAdminAccount(a)?"admin":isPartnerAccount(a)?"partner":"user"; };
if($("adminRoleApply")) $("adminRoleApply").onclick=()=>{
 if(!requireAdmin())return;
 const u=$("adminRolePlayer").value, role=String($("adminRoleSelect").value||"user").toLowerCase();
 if(!u||!users[u])return alert("Select an account.");
 if(u.toLowerCase()==="blooketstudio"&&role!=="admin")return alert("The main Blooketstudio account must remain Admin.");
 const a=users[u]; a.role=role; a.admin=(role==="admin"); a.updatedAt=Date.now(); normalizeRole(a); users[u]=a; localStorage.setItem("pm_users",JSON.stringify(users,(k,v)=>v==="__INF__"?"__INF__":v)); broadcast("users"); saveUsers();
 if(u===current){account=a;update();renderAll();}
 refreshAdmin(); renderCredits();
 Promise.resolve(serverUsersReady).then(()=>pushServerUsers()).catch(()=>{});
 alert(`@${u} is now ${role==="admin"?"Admin":role==="partner"?"Partner":"User"}.`);
};
if($("adminForcePlayer")) $("adminForcePlayer").onchange=refreshAdmin;
if($("adminForceApply")) $("adminForceApply").onclick=()=>{
 if(!requireAdmin())return;
 const u=$("adminForcePlayer").value, id=$("adminForceBlook").value;
 const b=catalogBlooks().find(x=>x.id===id);
 if(!u||!b)return alert("Choose a player and Blook.");
 const forced=getForcedDrops();
 forced[u]={id:b.id,item:b.item,rarity:b.rarity,pack:b.pack,pi:b.pi,ri:b.ri};
 saveForcedDrops(forced);refreshAdmin();
 alert(`Set ${b.item} (${b.rarity}) for ${u} at a 100% drop chance.`);
};
if($("adminForceClear")) $("adminForceClear").onclick=()=>{
 if(!requireAdmin())return;
 const u=$("adminForcePlayer").value;
 const forced=getForcedDrops();
 delete forced[u];saveForcedDrops(forced);refreshAdmin();
 alert("Cleared the 100% Blook force for "+u+".");
};

if($("adminDelete")) $("adminDelete").onclick=()=>{
 if(!requireAdmin())return;
 const u=$("adminPlayerDelete").value;
 if(!u||!users[u])return alert("Select an account to delete.");

 const ok=confirm(
   "WARNING: Delete account @" + u + "?\\n\\n" +
   "All Tokens, ESP, Blooks, avatar data, and account data will be deleted from this browser.\\n\\n" +
   "This action cannot be undone."
 );
 if(!ok)return;

 const wasCurrent=(u===current);
 const wasBootstrap=(u.toLowerCase()==="blooketstudio");

 delete users[u];

 // Keep the legacy flag cleared; the default Admin is restored automatically.
 if(wasBootstrap) localStorage.removeItem("pm_deleted_blooketstudio_admin");

 // Remove forced-drop settings and cancel trades involving the deleted account.
 const forced=getForcedDrops();
 delete forced[u];
 saveForcedDrops(forced);

 const trades=getTrades().map(t=>{
   if(t.from===u || t.to===u){
     if(t.status==="pending") t.status="cancelled";
   }
   return t;
 });
 saveTrades(trades);
 saveUsers();

 if(wasCurrent){
   localStorage.removeItem("pm_current");
   account=null;
   current=null;
   alert("Deleted account @" + u + " successfully. You will be logged out.");
   location.reload();
   return;
 }

 refreshAdmin();
 renderAll();
 alert("Deleted account @" + u + " successfully.");
};

function rarityValue(r,item){
  if(item==="Festival Untrusted") return 100000;
  if(item==="Festival Angelic") return 10000;
  if(item==="Festival Chroma") return 1000;
  return {Uncommon:7,Common:3,Rare:12,Epic:35,Untrusted:35,Mythic:100,Mythical:100,Chroma:300,Intrustdent:1000}[r]||0;
}
function getAvatar(u){const a=users[u]; const b=a?.inventory?.find(x=>x.id===a.avatar); return b?.item||"🙂"}
function getAvatarVisual(u, cls="avatar-visual") {
 const a=users[u]; const b=a?.inventory?.find(x=>x.id===a.avatar);
 if(!b) return `<span class="avatar-fallback">🙂</span>`;
 return `<span class="${cls} rarity-${rarityClass(b.rarity)}">${blookImage(b.item,"avatar-img",packIndexForName(b.pack))}<i class="avatar-spark a1">✦</i><i class="avatar-spark a2">✧</i><i class="avatar-spark a3">✦</i></span>`;
}


const DAILY_REWARD_MIN=1000;
const DAILY_REWARD_MAX=10000;

function localDayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dayDiff(a,b){
  const [ay,am,ad]=String(a||"").split("-").map(Number), [by,bm,bd]=String(b||"").split("-").map(Number);
  if(!ay||!by)return null;
  return Math.round((Date.UTC(by,bm-1,bd)-Date.UTC(ay,am-1,ad))/86400000);
}
function initDailyRewardData(){
  account.dailyReward ??={lastClaim:null,streak:0,amount:0};
  account.dailyReward.lastClaim=account.dailyReward.lastClaim||null;
  account.dailyReward.amount=Number(account.dailyReward.amount)||0;
}
function dailyRewardState(){
  initDailyRewardData();
  const today=localDayKey(), last=account.dailyReward.lastClaim;
  return {today,last,claimed:last===today,amount:account.dailyReward.amount};
}
function renderDailyRewards(){
  const s=dailyRewardState();
  const status=$("dailyRewardStatus"), streak=$("dailyRewardStreak"), list=$("dailyRewardsList"), btn=$("claimDailyRewardBtn");
  if(!status||!streak||!list||!btn)return;
  status.textContent=s.claimed?`Today's reward: ${s.amount.toLocaleString()} Tokens. Come back tomorrow!`:"Claim today's random Token reward.";
  streak.textContent="🎲 Random reward: 1,000–10,000 Tokens";
  list.innerHTML=`<div class="daily-reward-day ${s.claimed?"claimed":"current"}"><span class="day">Daily Reward</span><span class="amount">🪙 ${s.claimed?s.amount.toLocaleString():"1,000–10,000"} Tokens</span>${s.claimed?"<span>✓</span>":""}</div>`;
  btn.disabled=s.claimed;
  btn.textContent=s.claimed?"✓ Reward Claimed":"🎁 Claim Random Reward";
}
function claimDailyReward(){
  const s=dailyRewardState();
  if(s.claimed)return;
  const reward=Math.floor(Math.random()*(DAILY_REWARD_MAX-DAILY_REWARD_MIN+1))+DAILY_REWARD_MIN;
  account.coins=(Number(account.coins)||0)+reward;
  account.dailyReward={lastClaim:s.today,streak:0,amount:reward};
  save(); update(); renderDailyRewards();
  alert(`🎁 Daily Reward claimed! +${reward.toLocaleString()} Tokens`);
}
function openDailyRewards(){
  renderDailyRewards();
  $("dailyRewardsModal")?.classList.remove("hidden");
}
function closeDailyRewards(){$("dailyRewardsModal")?.classList.add("hidden");}
function openRarityInfo(){$("rarityInfoModal")?.classList.remove("hidden");}
function closeRarityInfo(){$("rarityInfoModal")?.classList.add("hidden");}

function renderAll(){
 initDailyRewardData();
 renderPacks();update();
 const myth=account.inventory.filter(x=>x.rarity==="Mythic"||x.rarity==="Mythical").length;
 const chroma=account.inventory.filter(x=>x.rarity==="Chroma").length;
 const intrustdent=account.inventory.filter(x=>x.rarity==="Intrustdent").length;
 const rarityRank={Common:1,Uncommon:2,Rare:3,Epic:4,Chroma:5,Mythic:6,Mythical:6,Untrusted:7,Intrustdent:8};
 const rarestDrop=account.inventory.length ? account.inventory.reduce((best,x)=>!best || (rarityRank[x.rarity]||0)>(rarityRank[best.rarity]||0) ? x : best,null) : null;
 const rarestText=rarestDrop ? `${escapeHtml(rarestDrop.item)} (${escapeHtml(rarestDrop.rarity)})` : "None yet";
 $("statsContent").innerHTML=[
  ["Tokens Tokens",account.coins.toLocaleString()], ["📦 Packs Opened",account.opened],
  ["🧩 Blooks",account.inventory.length], ["🌈 Intrustdent",intrustdent], ["⭐ Mythics",myth], ["💜 Chroma",chroma],
  ["🏆 Rarest Drop",rarestText]
 ].map(x=>`<div class="card ${x[0].includes("Rarest")?"rarest-drop-card":""}">${x[0]}<b>${x[1]}</b></div>`).join("");

 $("avatarStatus").innerHTML=`<div class="current-avatar-row"><span class="current-avatar-label">Current avatar</span>${getAvatarVisual(current, "avatar-visual avatar-hero")}<b>${escapeHtml(account.displayName)}</b>
 ${account.avatar?'<button class="small" onclick="clearAvatar()">Remove avatar</button>':''}`;

 const ownedByCatalog = new Map();
 account.inventory.forEach(x=>{
   const key = `${x.pack}::${x.item}`;
   const list = ownedByCatalog.get(key) || [];
   list.push(x);
   ownedByCatalog.set(key,list);
 });
 $("blooksContent").innerHTML = packs.filter(p=>!p[4] || isAdminAccount()).map((p)=>{
   const pi=packs.indexOf(p);
   const row = sets[pi] || [];
   const ownedInPack = account.inventory.filter(x=>x.pack===p[0]).length;
   const cards = row.map((item,ri)=>{
     const key = `${p[0]}::${item}`;
     const owned = ownedByCatalog.get(key) || [];
     const sample = owned[0];
     const rarityName = p[0]==="VERITY" ? "Intrustdent" : (p[0]==="FESTIVAL EXOTIC" ? (festivalRarityForItem(item)||"Untrusted") : BLOOKS_RARITY_ORDER[ri]);
     if(!sample){
       return `<div class="blook blook-locked ${p[0]==="VERITY"?'verity-blook-card':''}">
         <div class="big"><div class="blook-visual rarity-${rarityClass(rarityName)}">${blookImage(item,"inventory-img",pi)}</div></div>
         <b>${escapeHtml(item)}</b>
         <small class="rarity-label rarity-${rarityClass(rarityName)}">${rarityName}</small>
         <div class="blook-locked-label">🔒 Not owned</div>
       </div>`;
     }
     return `<div class="blook blook-owned">
       <div class="big">${blookVisual({...sample,rarity:rarityName},"inventory-img")}</div>
       <b>${escapeHtml(item)}</b>
       <small class="rarity-label rarity-${rarityClass(rarityName)}">${rarityName}</small>
       <div class="owned-count">${owned.length>1?`×${owned.length} owned`:'1 owned'}</div>
       <div class="blook-actions">
         <button class="small" onclick="setAvatar('${sample.id}')">${account.avatar===sample.id?'✅ Current avatar':'🧑 Set as avatar'}</button>
         <button class="small danger" onclick="sellOne('${sample.id}')">💰 Sell ${rarityValue(rarityName,item)} Tokens</button>
       </div>
     </div>`;
   }).join("");
   return `<section class="blook-pack-section">
     <div class="blook-pack-header">
       <div class="blook-pack-title">
         <img src="${p[1]}" alt="${escapeHtml(p[0])} Pack">
         <div><h2>${escapeHtml(p[0])} Pack</h2><small>${ownedInPack}/${row.length} Blooks owned</small></div>
       </div>
       <div class="blook-pack-line"></div>
     </div>
     <div class="blook-pack-grid">${cards}</div>
   </section>`;
 }).join("");



 renderTrade();
 renderChat(); renderCredits(); if(account.admin)refreshAdmin();
}

function setAvatar(id){
 if(!account.inventory.some(x=>x.id===id))return;
 account.avatar=id;save();renderAll();
}
function clearAvatar(){account.avatar=null;save();renderAll()}
function sellOne(id){
 const i=account.inventory.findIndex(x=>x.id===id);if(i<0)return;
 const x=account.inventory[i],value=rarityValue(x.rarity,x.item);
 if(confirm(`Sell ${x.item} (${x.rarity}) for ${value} Tokens?`)){
  account.coins+=value;if(account.avatar===id)account.avatar=null;
  account.inventory.splice(i,1);save();renderAll();
 }
}

function getTrades(){return JSON.parse(localStorage.getItem("pm_trades")||"[]")}
function saveTrades(a){localStorage.setItem("pm_trades",JSON.stringify(a.slice(-200)))}
function renderTrade(){
 const usersExcept=Object.keys(users).filter(u=>u!==current);
 $("tradeTarget").innerHTML=usersExcept.length?usersExcept.map(u=>`<option value="${escapeHtml(u)}">${getAvatar(u)} ${escapeHtml(u)}</option>`).join(""):'<option>No other players</option>';
 const makeOpts=(arr,empty)=>arr.length?arr.map(x=>`<option value="${x.id}">${x.item} • ${x.rarity} • ${x.pack}</option>`).join(""):`<option value="">${empty}</option>`;
 $("tradeGive").innerHTML=makeOpts(account.inventory,"Inventory is empty");
 const target=$("tradeTarget").value;
 const targetInv=users[target]?.inventory||[];
 $("tradeWant").innerHTML=makeOpts(targetInv,"That player has no Blooks");
 $("sendTradeBtn").disabled=!usersExcept.length||!account.inventory.length||!targetInv.length;

 const trades=getTrades();
 const incoming=trades.filter(t=>t.to===current&&t.status==="pending");
 $("incomingTrades").innerHTML=incoming.length?incoming.map(t=>{
  const from=users[t.from],to=users[t.to],give=from?.inventory?.find(x=>x.id===t.giveId),want=to?.inventory?.find(x=>x.id===t.wantId);
  return `<div class="trade-card"><div>📨 <b>${escapeHtml(t.from)}</b> ${getAvatar(t.from)} wants to trade <b>${give?.item||"❌"}</b> (${give?.rarity||"no longer available"})<br>for <b>${want?.item||"❌"}</b> from you.</div>
  <div class="trade-actions"><button class="small" onclick="acceptTrade('${t.id}')">✅ Accept</button><button class="small danger" onclick="declineTrade('${t.id}')">❌ Decline</button></div></div>`;
 }).join(""):'<p class="muted">No new trade requests.</p>';

 const outgoing=trades.filter(t=>t.from===current&&t.status==="pending");
 $("outgoingTrades").innerHTML=outgoing.length?outgoing.map(t=>`<div class="trade-card">📤 Waiting for  <b>${escapeHtml(t.to)}</b>: ${t.giveItem} ➜ ${t.wantItem}<button class="small danger" onclick="cancelTrade('${t.id}')">Cancel</button></div>`).join(""):'<p class="muted">No pending trades.</p>';
}
if($("tradeTarget")) $("tradeTarget").onchange=renderTrade;
if($("sendTradeBtn")) $("sendTradeBtn").onclick=sendTrade;

function sendTrade(){
 const to=$("tradeTarget").value,giveId=$("tradeGive").value,wantId=$("tradeWant").value;
 if(!users[to]||to===current||!giveId||!wantId)return alert("Choose a player and both Blooks.");
 const give=account.inventory.find(x=>x.id===giveId),want=users[to].inventory.find(x=>x.id===wantId);
 if(!give||!want)return alert("This Blook is no longer available.");
 const trades=getTrades();
 trades.push({id:"trade_"+Date.now()+"_"+Math.random().toString(36).slice(2),from:current,to,giveId,wantId,giveItem:give.item,wantItem:want.item,status:"pending",time:Date.now()});
 saveTrades(trades);renderTrade();alert("Trade request sent!");
}
function acceptTrade(id){
 const trades=getTrades(),t=trades.find(x=>x.id===id&&x.to===current&&x.status==="pending");
 if(!t)return alert("This trade request is no longer valid.");
 const from=users[t.from],to=users[t.to];
 const give=from?.inventory?.find(x=>x.id===t.giveId),want=to?.inventory?.find(x=>x.id===t.wantId);
 if(!from||!to||!give||!want){t.status="declined";saveTrades(trades);renderAll();return alert("Trade failed because a Blook was sold or traded.");}
 from.inventory=from.inventory.filter(x=>x.id!==give.id);to.inventory=to.inventory.filter(x=>x.id!==want.id);
 to.inventory.push(give);from.inventory.push(want);
 if(from.avatar===give.id)from.avatar=null;
 if(to.avatar===want.id)to.avatar=null;
 t.status="accepted";saveUsers();if(current===t.to)account=users[current];renderAll();alert("Trade completed!");
}
function declineTrade(id){
 const trades=getTrades(),t=trades.find(x=>x.id===id&&x.to===current&&x.status==="pending");
 if(!t)return; t.status="declined";saveTrades(trades);renderTrade();
}
function cancelTrade(id){
 const trades=getTrades(),t=trades.find(x=>x.id===id&&x.from===current&&x.status==="pending");
 if(!t)return; t.status="cancelled";saveTrades(trades);renderTrade();
}

function ensureCreditsAndRoleStyles(){
  if(document.getElementById("brooketCreditsStyles")) return;
  const st=document.createElement("style"); st.id="brooketCreditsStyles";
  st.textContent=`.brooket-credits-panel{position:fixed;right:18px;bottom:18px;z-index:9998;width:250px;max-height:280px;overflow:auto;padding:12px 14px;border-radius:14px;background:rgba(12,14,24,.94);box-shadow:0 8px 30px rgba(0,0,0,.35);color:#fff;font-family:inherit;border:1px solid rgba(255,255,255,.14)}.brooket-credits-title{font-weight:800;font-size:16px;margin-bottom:8px}.brooket-credit-row{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:5px 0;font-size:13px}.brooket-role-badge{font-weight:900;display:inline-block;margin-left:5px}.brooket-admin-badge,.brooket-partner-badge,.admin-chat-badge,.partner-chat-badge{background:linear-gradient(90deg,#ff2d55,#ff9500,#ffd60a,#30d158,#0a84ff,#bf5af2,#ff2d55);background-size:300% 100%;animation:brooketRainbow 2s linear infinite;-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 10px rgba(255,255,255,.18)}.partner-chat-badge,.brooket-partner-badge{position:relative}.partner-chat-badge::after,.brooket-partner-badge::after{content:"";position:absolute;inset:-4px -6px;border:2px solid transparent;border-radius:999px;background:linear-gradient(90deg,#ff2d55,#ffd60a,#30d158,#0a84ff,#bf5af2,#ff2d55) border-box;-webkit-mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:brooketRainbow 2s linear infinite;pointer-events:none}@keyframes brooketRainbow{to{background-position:300% 0}}`;
  document.head.appendChild(st);
}
function renderCredits(){
  ensureCreditsAndRoleStyles(); let panel=document.getElementById("brooketCreditsPanel");
  if(!panel){panel=document.createElement("div");panel.id="brooketCreditsPanel";panel.className="brooket-credits-panel";document.body.appendChild(panel);}
  const admins=[],partners=[]; for(const [u,a] of Object.entries(users||{})){if(isAdminAccount(a))admins.push(u);else if(isPartnerAccount(a))partners.push(u);}
  panel.innerHTML=`<div class="brooket-credits-title">Credits</div><div class="brooket-credit-row"><span>👑 Admin</span><span>${admins.length?admins.map(u=>`<span class="brooket-role-badge brooket-admin-badge">${escapeHtml(u)}</span>`).join(", "):"None"}</span></div><div class="brooket-credit-row"><span>🤝 Partner</span><span>${partners.length?partners.map(u=>`<span class="brooket-role-badge brooket-partner-badge">${escapeHtml(u)}</span>`).join(", "):"None"}</span></div>`;
}
function roleBadgeForChat(user,bot=false){
  if(bot)return ""; const key=Object.keys(users||{}).find(k=>k.toLowerCase()===String(user||"").toLowerCase()); const a=key?users[key]:null;
  if(String(user||"").toLowerCase()==="blooketstudio"||isAdminAccount(a))return `<span class="admin-chat-badge" title="Administrator">[admin]</span>`;
  if(isPartnerAccount(a))return `<span class="partner-chat-badge" title="Partner">[partner]</span>`; return "";
}

function renderChat(){
 const msgs=JSON.parse(localStorage.getItem("pm_chat")||"[]");
 const players = onlineRealtimePlayers.length ? onlineRealtimePlayers : (current ? [{user:current,avatar:getAvatar(current),rarity:""}] : []);
 $("onlinePlayers").innerHTML = players.map(p=>{
   const mine = p.user===current ? " (You)" : "";
   return `<span title="${escapeHtml(p.user)}">🟢 ${escapeHtml(p.user)}${mine}</span>`;
 }).join("") || '<span>🟡 No players online</span>';
 $("chatMessages").innerHTML=msgs.length?msgs.slice(-100).map(m=>{
   const bot=!!m.bot || m.user==="🤖 PackBot";
   const chatUserKey = Object.keys(users).find(k => k.toLowerCase() === String(m.user||"").toLowerCase());
   const chatUser = chatUserKey ? users[chatUserKey] : null;
   const isAdmin = !bot && (String(m.user||"").toLowerCase() === "blooketstudio" || isAdminAccount(chatUser));
   const avatar = m.avatar ? `<span class="chat-avatar">${escapeHtml(m.avatar)}</span>` : (bot ? "🤖" : getAvatarVisual(m.user));
   const adminBadge = roleBadgeForChat(m.user,bot);
   return `<div class="chat-message ${m.user===current?"mine":""} ${bot?"bot-chat":""}">
     <div class="sender">${avatar} ${escapeHtml(m.user)} ${adminBadge}</div>
     <div>${escapeHtml(m.text)}</div><div class="time">${m.time}</div>
   </div>`;
 }).join(""): '<div class="muted">No messages yet.</div>';
 $("chatMessages").scrollTop=$("chatMessages").scrollHeight;
}
function sendChat(){
 if(account.muted)return alert("You are muted.");
 const text=$("chatInput").value.trim();if(!text)return;
 if(realtimeChatReady && realtimeSocket && realtimeSocket.readyState===WebSocket.OPEN){
   const avatar = account?.inventory?.find(x=>x.id===account.avatar);
   realtimeSocket.send(JSON.stringify({type:"chat:send",user:current,text,avatar:avatar?.item||"🙂",rarity:avatar?.rarity||""}));
 } else {
   let msgs=JSON.parse(localStorage.getItem("pm_chat")||"[]");
   const avatar = account?.inventory?.find(x=>x.id===account.avatar);
   msgs.push({user:current,text,avatar:avatar?.item||"🙂",rarity:avatar?.rarity||"",time:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})});
   localStorage.setItem("pm_chat",JSON.stringify(msgs.slice(-100)));broadcast("chat");renderChat();
 }
 $("chatInput").value="";
}
if($("sendChat")) $("sendChat").onclick=sendChat;
if($("chatInput")) $("chatInput").onkeydown=e=>{if(e.key==="Enter")sendChat()};

function findPlayerStats(name){
 const q=String(name||"").trim().toLowerCase();
 if(!q)return null;
 const key=Object.keys(users).find(k=>k.toLowerCase()===q||String(users[k]?.displayName||"").toLowerCase()===q);
 if(!key||!users[key])return null;
 const a=users[key],inv=Array.isArray(a.inventory)?a.inventory:[],c={Common:0,Rare:0,Epic:0,Mythic:0,Chroma:0};
 inv.forEach(x=>{if(c[x.rarity]!=null)c[x.rarity]++;});
 const av=inv.find(x=>x.id===a.avatar);
 return {username:key,displayName:a.displayName||key,coins:Number(a.coins||0),opened:Number(a.opened||0),inventory:inv.length,avatar:av?.item||"🙂",c};
}
function renderViewedStats(name){
 const t=findPlayerStats(name),out=$("statsViewResult");
 if(!t){out.innerHTML='<div class="stats-view-empty">Player not found. Please enter the correct username.</div>';return;}
 out.innerHTML=`<div class="stats-view-title"><span class="stats-view-avatar">${escapeHtml(t.avatar)}</span><div><div class="stats-view-name">${escapeHtml(t.displayName)}</div><div class="muted">@${escapeHtml(t.username)}</div></div></div><div class="stats-view-grid"><div class="stats-view-card-item">🪙 Tokens<b>${t.coins.toLocaleString()}</b></div><div class="stats-view-card-item">📦 Packs Opened<b>${t.opened.toLocaleString()}</b></div><div class="stats-view-card-item">🧩 Blooks<b>${t.inventory.toLocaleString()}</b></div><div class="stats-view-card-item">⭐ Mythics<b>${t.c.Mythic}</b></div><div class="stats-view-card-item">💜 Chroma<b>${t.c.Chroma}</b></div><div class="stats-view-card-item">🟢 Common<b>${t.c.Common}</b></div><div class="stats-view-card-item">🔵 Rare<b>${t.c.Rare}</b></div><div class="stats-view-card-item">🟣 Epic<b>${t.c.Epic}</b></div></div>`;
}

document.querySelectorAll(".nav").forEach(btn=>btn.onclick=()=>{
 if(btn.dataset.page==="admin"&&!isStaffAccount())return alert("You do not have Admin/Partner permission.");
 document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 $(btn.dataset.page+"Page").classList.add("active");renderAll();
});

if($("dailyRewardsBtn")) $("dailyRewardsBtn").onclick=openDailyRewards;
if($("closeDailyRewards")) $("closeDailyRewards").onclick=closeDailyRewards;
if($("claimDailyRewardBtn")) $("claimDailyRewardBtn").onclick=claimDailyReward;
if($("dailyRewardsModal")) $("dailyRewardsModal").addEventListener("click",e=>{if(e.target.id==="dailyRewardsModal")closeDailyRewards()});
if($("rarityInfoBtn")) $("rarityInfoBtn").onclick=openRarityInfo;
if($("closeRarityInfo")) $("closeRarityInfo").onclick=closeRarityInfo;
if($("rarityInfoModal")) $("rarityInfoModal").addEventListener("click",e=>{if(e.target.id==="rarityInfoModal")closeRarityInfo()});
if($("viewStatsBtn")) $("viewStatsBtn").onclick=()=>{
 $("statsPlayerInput").value="";$("statsViewResult").innerHTML="";$("statsViewModal").classList.remove("hidden");setTimeout(()=>$("statsPlayerInput").focus(),50);
};
if($("showStatsBtn")) $("showStatsBtn").onclick=()=>renderViewedStats($("statsPlayerInput").value);
if($("statsPlayerInput")) $("statsPlayerInput").onkeydown=e=>{if(e.key==="Enter")renderViewedStats(e.target.value)};
if($("closeStatsView")) $("closeStatsView").onclick=()=>$("statsViewModal").classList.add("hidden");
if($("statsViewModal")) $("statsViewModal").addEventListener("click",e=>{if(e.target.id==="statsViewModal")$("statsViewModal").classList.add("hidden")});

if($("closeModal")) $("closeModal").onclick=()=>$("modal").classList.add("hidden");
if($("openAgain")) $("openAgain").onclick=()=>{const i=selected.i;$("modal").classList.add("hidden");buy(i)};
if($("closePackInfo")) $("closePackInfo").onclick=()=>$("packInfoModal").classList.add("hidden");
if($("closePackInfoBottom")) $("closePackInfoBottom").onclick=()=>$("packInfoModal").classList.add("hidden");
if($("packInfoModal")) $("packInfoModal").addEventListener("click",e=>{if(e.target.id==="packInfoModal")$("packInfoModal").classList.add("hidden")});
if($("sellBtn")) $("sellBtn").onclick=()=>{
 if(!account.inventory.length)return alert("Inventory is empty.");
 // Sell only duplicate copies of non-Mythic/Chroma Blooks.
 // Keep one copy of each Common/Rare/Epic Blook; never sell Mythic or Chroma.
 const seen=new Set();
 const dupes=[];
 for(const x of account.inventory){
   if(x.rarity==="Mythic"||x.rarity==="Chroma") continue;
   const key=x.item;
   if(seen.has(key)) dupes.push(x);
   else seen.add(key);
 }
 if(!dupes.length)return alert("There are no duplicate Blooks to sell. Mythic and Chroma can never be sold.");
 const value=dupes.reduce((s,x)=>s+rarityValue(x.rarity,x.item),0);
 if(confirm(`Sell ${dupes.length} duplicate Blooks for ${value} Tokens?\n\nKeep one copy of each Blook. Mythic and Chroma will never be sold.`)){
   const ids=new Set(dupes.map(x=>x.id));
   account.coins+=value;
   account.inventory=account.inventory.filter(x=>!ids.has(x.id));
   if(account.avatar && ids.has(account.avatar)) account.avatar=null;
   save();
   renderAll();
 }
};
if($("sellAllBtn")) $("sellAllBtn").onclick=()=>{
 if(!account.inventory.length)return alert("Inventory is empty.");
 const sellableRarities=new Set(["Uncommon","Common","Rare","Epic"]);
 const sellable=account.inventory.filter(x=>sellableRarities.has(x.rarity));
 if(!sellable.length)return alert("There are no Common, Uncommon, Rare, or Epic Blooks to sell. Mythic and Chroma will not be sold.");
 const value=sellable.reduce((sum,x)=>sum+rarityValue(x.rarity,x.item),0);
 if(confirm(`⚠️ ARE YOU SURE?\n\nSell ALL ${sellable.length} Common/Uncommon/Rare/Epic Blooks for ${value} Tokens?\n\nThis will sell every Blook in these four rarities, with none kept.\n\nMythic and Chroma will NOT be sold.`)){
   const ids=new Set(sellable.map(x=>x.id));
   account.coins+=value;
   account.inventory=account.inventory.filter(x=>!ids.has(x.id));
   if(account.avatar && ids.has(account.avatar)) account.avatar=null;
   save();
   renderAll();
 }
};
if($("instantBtn")) $("instantBtn").onclick=e=>{
 const on=e.target.dataset.on!=="1";e.target.dataset.on=on?"1":"0";e.target.textContent="⚡ Instant Open: "+(on?"ON":"OFF");
};
if($("renameBtn")) $("renameBtn").onclick=()=>{
 const n=prompt("New display name:",account.displayName);
 if(n&&n.trim()){account.displayName=n.trim();save();update()}
};
if($("passwordBtn")) $("passwordBtn").onclick=()=>{
 const old=prompt("Current password:");
 if(old!==account.password)return alert("Current password is incorrect.");
 const np=prompt("New password:");
 if(np&&np.length>=4){account.password=np;save();alert("Password changed.")}
};
if($("logoutBtn")) $("logoutBtn").onclick=()=>{localStorage.removeItem("pm_current");location.reload()};
if($("resetBtn")) $("resetBtn").onclick=()=>{
 if(confirm("Delete this account from this browser?")){
  delete users[current];saveUsers();localStorage.removeItem("pm_current");location.reload();
 }
};

if(current){
  serverUsersReady.then(()=>{
    const sessionKey = Object.keys(users).find(k=>String(k).toLowerCase()===String(current).toLowerCase());
    if(sessionKey){ current=sessionKey; localStorage.setItem("pm_current",current); enter(current); }
  });
}


/* blooketstudio admin backup helper */
window.blooketstudioAdminBackup = {
  export: function () {
    const u = users["Blooketstudio"] || {};
    const data = {
      username: "Blooketstudio",
      password: "Growgarden1@",
      admin: true,
      coins: Number(u.coins || 0),
      tokens: Number(u.tokens || 0),
      inventory: Array.isArray(u.inventory) ? u.inventory : [],
      avatar: u.avatar || null,
      muted: false,
      banned: false
    };
    return JSON.stringify(data, null, 2);
  }
};

/* Admin persistence is handled by ensureAdminAccount() above; no destructive reset is performed. */

// Bazaar: shared player-to-player marketplace. Admins can also buy/list, but nothing is purchasable unless a player has listed it.
const BAZAAR_PRICES={Common:18,Rare:55,Epic:140,Chroma:850,Mythic:2500,Intrustdent:10000,Uncommon:30,Untrusted:100000,Mythical:10000};
function bazaarPriceForItem(item,rarity){
  if(item==="Festival Untrusted") return 100000;
  if(item==="Festival Angelic") return 10000;
  if(item==="Festival Chroma") return 1000;
  return BAZAAR_PRICES[rarity]||0;
}
const bazaarApiBase = location.protocol === 'file:' ? 'http://localhost:3000' : '';
function bazaarApiUrl(path){ return `${bazaarApiBase}${path}`; }
let bazaarListings=[];
const BAZAAR_LOCAL_KEY='pm_bazaar_local';
function bazaarLocalRead(){try{const d=JSON.parse(localStorage.getItem(BAZAAR_LOCAL_KEY)||'{\"listings\":[]}');return d&&Array.isArray(d.listings)?d:{listings:[]};}catch{return {listings:[]};}}
function bazaarLocalWrite(d){localStorage.setItem(BAZAAR_LOCAL_KEY,JSON.stringify(d));}
async function bazaarRefresh(){
  try{const r=await fetch(bazaarApiUrl('/api/bazaar'),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();bazaarListings=Array.isArray(d.listings)?d.listings:[];renderBazaar();}
  catch(e){bazaarListings=bazaarLocalRead().listings;renderBazaar();console.warn('Bazaar server unavailable; local fallback enabled.',e);}
}

function renderBazaar(){
  if(!$('bazaarPage')) return;
  $('bazaarCoins').textContent=Number(account?.coins||0).toLocaleString();
  const listings=bazaarListings;
  $('bazaarListings').innerHTML=listings.length?listings.map(x=>{
    const qty=Math.max(1,Number(x.quantity||1));
    return `<div class="bazaar-card"><span class="bazaar-owned">👤 ${escapeHtml(x.seller)}</span><div class="bazaar-blook">${blookVisual(x,'bazaar-img')}</div><div class="bazaar-name">${escapeHtml(x.item)}</div><div class="bazaar-rarity rarity-${rarityClass(x.rarity)}">${escapeHtml(x.rarity)}</div><div class="bazaar-price">🪙 ${Number(x.price).toLocaleString()} / Blook</div><div class="muted">📦 ${qty} available</div>${x.seller===current ? `<button class="small" onclick="event.stopPropagation();bazaarRecall('${escapeHtml(x.id)}')">RECALL ALL</button>` : `<button class="small" onclick="event.stopPropagation();bazaarBuy('${escapeHtml(x.id)}')">BUY</button>`}</div>`;
  }).join(''):'<div class="bazaar-empty">No player has listed a Blook yet. Ask a player to list one in the Sell tab.</div>';
  const groups={};
  for(const x of (account.inventory||[])){
    if(!groups[x.item]) groups[x.item]={sample:x,count:0,ids:[]};
    groups[x.item].count++;
    groups[x.item].ids.push(x.id);
  }
  const inv=Object.values(groups).sort((a,b)=>(bazaarPriceForItem(b.sample.item,b.sample.rarity)||0)-(bazaarPriceForItem(a.sample.item,a.sample.rarity)||0));
  $('bazaarInventory').innerHTML=inv.length?inv.map(g=>{
    const x=g.sample;
    const price=Math.max(1,Math.floor((bazaarPriceForItem(x.item,x.rarity)||25)*0.6));
    const locked=g.ids.includes(account.avatar);
    const maxQty=g.ids.filter(id=>id!==account.avatar).length;
    return `<div class="bazaar-card"><div class="bazaar-blook">${blookVisual(x,'bazaar-img')}</div><div class="bazaar-name">${escapeHtml(x.item)}</div><div class="bazaar-rarity rarity-${rarityClass(x.rarity)}">${escapeHtml(x.rarity)}</div><div class="muted">You own: ${g.count}</div><label class="muted">Price / Blook <input class="bazaar-price-input" id="bazaarPrice_${escapeHtml(x.item).replace(/[^a-zA-Z0-9_-]/g,'_')}" type="number" min="1" value="${price}"></label><button class="small ${maxQty<1?'danger':''}" ${maxQty<1?'disabled':''} onclick="bazaarSell('${escapeHtml(g.ids.find(id=>id!==account.avatar)||g.ids[0])}', this)">${maxQty<1?'EQUIPPED ONLY':'LIST BLOOKS'}</button></div>`;
  }).join(''):'<div class="bazaar-empty">You do not have any Blooks to list yet.</div>';
}
async function syncUsersWithServer(push=false){
  try{
    if(push){
      const r=await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({users:users})});
      const d=await r.json();
      if(d.ok && d.users){ users=d.users; return users; }
    }else{
      const r=await fetch('/api/users');
      const d=await r.json();
      if(d.ok && d.users){
        users=d.users;
        if(current && users[current]) account=users[current];
        localStorage.setItem('pm_users',JSON.stringify(users,(k,v)=>v===Infinity?'__INF__':v));
syncUsersWithServer(true);
      }
    }
  }catch(e){ console.warn('Account sync unavailable:',e.message); }
  return users;
}
async function bazaarRecall(id){
  const listing=(bazaarListings||[]).find(x=>String(x.id)===String(id));
  if(!listing || String(listing.seller)!==String(current)) return alert("You can only recall your own listing.");
  if(!confirm("Thu hồi Blook này khỏi Bazaar?")) return;
  try{
    const r=await fetch(bazaarApiUrl('/api/bazaar/recall'),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({listingId:id,seller:current})
    });
    const d=await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error||'Recall failed');
    if(d.seller){ users[current]=d.seller; account=d.seller; }
    localStorage.setItem('pm_users',JSON.stringify(users,(k,v)=>v===Infinity?'__INF__':v));
    await bazaarRefresh(); update();
    return;
  }catch(e){
    // Local Bazaar fallback: remove the listing and return the exact same Blook.
    const db=bazaarLocalRead();
    const i=db.listings.findIndex(x=>String(x.id)===String(id)&&String(x.seller)===String(current));
    if(i<0) return alert(e.message||"Không thể thu hồi Blook.");
    const li=db.listings[i];
    db.listings.splice(i,1);
    account.inventory=Array.isArray(account.inventory)?account.inventory:[];
    const qty=Math.max(1,Number(li.quantity||1));
    for(let n=0;n<qty;n++) account.inventory.push({id:'blook_'+Date.now()+'_'+Math.random().toString(36).slice(2),item:li.item,rarity:li.rarity,pack:li.pack});
    users[current]=account;
    localStorage.setItem('pm_users',JSON.stringify(users,(k,v)=>v===Infinity?'__INF__':v));
    bazaarLocalWrite(db); bazaarListings=db.listings;
    update(); renderBazaar();
  }
}
async function bazaarBuy(id){
  const listing=(bazaarListings||[]).find(x=>String(x.id)===String(id));
  if(!listing)return alert('This listing is no longer available.');
  const available=Math.max(1,Number(listing.quantity||1));
  const qtyText=prompt(`How many "${listing.item}" Blooks do you want to buy?\nAvailable: ${available}\nPrice: ${Number(listing.price).toLocaleString()} Tokens each`, '1');
  if(qtyText===null)return;
  const quantity=Math.floor(Number(qtyText));
  if(!Number.isFinite(quantity)||quantity<1||quantity>available)return alert(`Enter a quantity from 1 to ${available}.`);
  try{
    const r=await fetch(bazaarApiUrl('/api/bazaar/buy'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({buyer:current,listingId:id,quantity})});
    const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Unable to buy this listing.');
    users[current]=d.buyer;account=users[current];localStorage.setItem('pm_users',JSON.stringify(users,(k,v)=>v===Infinity?'__INF__':v));
    syncUsersWithServer(true);update();await bazaarRefresh();alert(`🏪 Bought ${quantity} × ${d.item} for ${Number(d.price).toLocaleString()} Tokens!`);
  }catch(e){
    const db=bazaarLocalRead(),li=db.listings.find(x=>x.id===id);
    if(!li)return alert(e.message||'Bazaar unavailable.');
    if(li.seller===current)return alert('You cannot buy your own listing.');
    const availableLocal=Math.max(1,Number(li.quantity||1));
    if(quantity>availableLocal)return alert(`Only ${availableLocal} available.`);
    const total=Number(li.price)*quantity;
    if(Number(account.coins||0)<total)return alert('Not enough Tokens.');
    account.coins=Number(account.coins||0)-total;account.inventory=Array.isArray(account.inventory)?account.inventory:[];
    for(let i=0;i<quantity;i++)account.inventory.push({id:'blook_'+Date.now()+'_'+Math.random().toString(36).slice(2),item:li.item,rarity:li.rarity,pack:li.pack});
    users[current]=account;localStorage.setItem('pm_users',JSON.stringify(users,(k,v)=>v===Infinity?'__INF__':v));
    syncUsersWithServer(true);
    if(quantity===availableLocal) db.listings=db.listings.filter(x=>x.id!==id);
    else {li.quantity=availableLocal-quantity; if(Array.isArray(li.blookIds))li.blookIds=li.blookIds.slice(quantity);li.blookId=li.blookIds?.[0]||li.blookId;}
    const seller=users[li.seller];if(seller){seller.coins=Number(seller.coins||0)+total;users[li.seller]=seller;}
    bazaarLocalWrite(db);bazaarListings=db.listings;update();renderBazaar();alert(`🏪 Bought ${quantity} × ${li.item} for ${total.toLocaleString()} Tokens!`);
  }
}

async function bazaarSell(id,button){
  const i=account.inventory.findIndex(x=>x.id===id);if(i<0)return;
  const x=account.inventory[i];
  if(account.avatar===id)return alert('Remove this Blook as your avatar before listing it.');
  const same=account.inventory.filter(v=>v.item===x.item && v.id!==account.avatar);
  if(!same.length)return alert('You do not have a sellable copy of this Blook.');
  const defaultPrice=Math.max(1,Math.floor((bazaarPriceForItem(x.item,x.rarity)||25)*0.6));
  const priceInput=button?.parentElement?.querySelector('.bazaar-price-input');
  const typedPrice=Number(priceInput?.value);
  const price=Number.isFinite(typedPrice)&&typedPrice>0?Math.floor(typedPrice):defaultPrice;
  const qtyText=prompt(`How many "${x.item}" Blooks do you want to list?\nYou can list up to ${same.length}.\n\nPrice: ${price.toLocaleString()} Tokens per Blook`, String(Math.min(same.length,1)));
  if(qtyText===null)return;
  const quantity=Math.floor(Number(qtyText));
  if(!Number.isFinite(quantity)||quantity<1||quantity>same.length)return alert(`Enter a quantity from 1 to ${same.length}.`);
  if(!confirm(`List ${quantity} × ${x.item} for ${price.toLocaleString()} Tokens each?\n\nTotal value: ${(quantity*price).toLocaleString()} Tokens.`))return;
  const ids=same.slice(0,quantity).map(v=>v.id);
  try{
    await pushServerUsers();
    const r=await fetch(bazaarApiUrl('/api/bazaar/list'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seller:current,blookId:ids[0],blookIds:ids,price,quantity})});
    const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Unable to list this Blook.');
    account=d.seller;users[current]=account;localStorage.setItem('pm_users',JSON.stringify(users,(k,v)=>v==='__INF__'?'__INF__':v));
    syncUsersWithServer(true);update();await bazaarRefresh();
    alert(`🏪 Listed ${quantity} × ${x.item} for ${price.toLocaleString()} Tokens each.`);
  }catch(e){
    const db=bazaarLocalRead();
    const listedQty=db.listings.filter(v=>v.seller===current&&v.item===x.item).reduce((s,v)=>s+Number(v.quantity||1),0);
    const alreadyIds=new Set(db.listings.filter(v=>v.seller===current&&v.item===x.item).flatMap(v=>v.blookIds||[v.blookId]));
    const available=same.filter(v=>!alreadyIds.has(v.id));
    if(quantity>available.length)return alert('Some copies of this Blook are already listed.');
    account.inventory=account.inventory.filter(v=>!ids.includes(v.id));
    users[current]=account;localStorage.setItem('pm_users',JSON.stringify(users,(k,v)=>v==='__INF__'?'__INF__':v));
    syncUsersWithServer(true);
    db.listings.push({id:'local_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),seller:current,blookId:ids[0],blookIds:ids,item:x.item,rarity:x.rarity,pack:x.pack,price,quantity,createdAt:Date.now()});
    bazaarLocalWrite(db);bazaarListings=db.listings;update();renderBazaar();
    alert(`🏪 Listed ${quantity} × ${x.item} locally for ${price.toLocaleString()} Tokens each.`);
  }
}

document.addEventListener('click',e=>{
  const tab=e.target.closest('.bazaar-tab'); if(!tab)return;
  document.querySelectorAll('.bazaar-tab').forEach(x=>x.classList.remove('active'));tab.classList.add('active');
  $('bazaarBuy')?.classList.toggle('hidden',tab.dataset.bazaarTab!=='buy');
  $('bazaarSell')?.classList.toggle('hidden',tab.dataset.bazaarTab!=='sell');
  renderBazaar();
});
const __oldRenderAll=renderAll;
renderAll=function(){__oldRenderAll();renderBazaar();};

document.addEventListener("click",e=>{
  const btn=e.target.closest?.('[data-page="leaderboard"]');
  if(btn) setTimeout(()=>renderSharedLeaderboard(),0);
});

document.addEventListener("click",e=>{if(e.target.closest?.('[data-page="leaderboard"]'))setTimeout(renderSharedLeaderboard,0);});

document.addEventListener('click',e=>{
  if(e.target.closest?.('button')) return;
  const card=e.target.closest?.('.bazaar-card');
  if(!card || !document.querySelector('#bazaarBuy') || document.querySelector('#bazaarBuy').classList.contains('hidden')) return;
  const cards=[...document.querySelectorAll('#bazaarListings .bazaar-card')];
  const idx=cards.indexOf(card);
  if(idx<0) return;
  const li=(bazaarListings||[])[idx];
  if(li && String(li.seller)===String(current)) bazaarRecall(li.id);
}); // bazaar-own-card-recall
