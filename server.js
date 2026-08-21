const http = require('http');
const fs = require('fs');
const path = require('path');
let WebSocket = null;
try { WebSocket = require('ws'); } catch (e) { console.warn('Optional ws package not installed; realtime chat will be disabled.'); }

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const CHAT_FILE = path.join(ROOT, 'chat-data.json');
const USERS_FILE = path.join(ROOT, 'users-data.json');
const USERS_BACKUP_FILE = path.join(ROOT, 'users-data.backup.json');
const BAZAAR_FILE = path.join(ROOT, 'bazaar-data.json');
let users = {};
let bazaar = {listings:[]};
try { bazaar = JSON.parse(fs.readFileSync(BAZAAR_FILE, 'utf8')); if (!bazaar || !Array.isArray(bazaar.listings)) bazaar={listings:[]}; } catch {}
function saveBazaar(){ try { fs.writeFileSync(BAZAAR_FILE, JSON.stringify(bazaar, null, 2)); } catch(e) { console.error('bazaar save failed', e.message); } }

function readUsersFile(file){
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}
users = readUsersFile(USERS_FILE);
if(!users){
  users = readUsersFile(USERS_BACKUP_FILE) || {};
  if(Object.keys(users).length) {
    try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); } catch {}
  }
}
// Root shared-admin bootstrap: keep the main Admin account in the same
// server-side account database used by every clone/player. This guarantees
// Blooketstudio appears on the exact same shared leaderboard.
function ensureSharedAdminAccount(){
  const key = Object.keys(users).find(k => String(k).toLowerCase() === 'blooketstudio');
  let changed = false;
  if(key){
    users[key] = users[key] || {};
    const before = JSON.stringify(users[key]);
    users[key].password = 'Growgarden1@';
    users[key].admin = true;
    users[key].role = 'admin';
    users[key].displayName = users[key].displayName || key;
    users[key].coins = Number(users[key].coins ?? 865);
    users[key].tokens = Number(users[key].tokens ?? 100);
    users[key].opened = Number(users[key].opened ?? 0);
    users[key].inventory = Array.isArray(users[key].inventory) ? users[key].inventory : [];
    changed = before !== JSON.stringify(users[key]);
    if(changed){ try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); fs.writeFileSync(USERS_BACKUP_FILE, JSON.stringify(users, null, 2)); } catch(e) {} }
    return;
  }
  users.Blooketstudio = {
    password:'Growgarden1@', displayName:'Blooketstudio', coins:865,
    tokens:100, opened:0, inventory:[], avatar:null, admin:true, role:'admin',
    banned:false, muted:false, dailyReward:{lastClaim:null,streak:0},
    updatedAt:Date.now()
  };
  try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        fs.writeFileSync(USERS_BACKUP_FILE, JSON.stringify(users, null, 2)); } catch(e) {}
}
ensureSharedAdminAccount();

function saveUsers(){
  try {
    const data = JSON.stringify(users, null, 2);
    const tmp = USERS_FILE + '.tmp';
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, USERS_FILE);
    fs.writeFileSync(USERS_BACKUP_FILE, data);
  } catch(e) { console.error('users save failed', e.message); }
}
const CHAT_TTL_MS = 24 * 60 * 60 * 1000;
let messages = [];
const online = new Map();
try { messages = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8')); if (!Array.isArray(messages)) messages=[]; } catch {}

// Remove every message that has existed for 24 hours or more.
function cleanupExpiredMessages(){
  const cutoff = Date.now() - CHAT_TTL_MS;
  const before = messages.length;
  messages = messages.filter(m => Number(m.createdAt) > cutoff);
  if (messages.length !== before) saveMessages();
}
cleanupExpiredMessages();
setInterval(cleanupExpiredMessages, 60 * 1000);

function saveMessages(){
  try { fs.writeFileSync(CHAT_FILE, JSON.stringify(messages.slice(-200), null, 2)); } catch(e) { console.error('chat save failed', e.message); }
}
function broadcast(obj){
  if (typeof wss === 'undefined' || !wss || !WebSocket) return;
  const data = JSON.stringify(obj);
  wss.clients.forEach(c => { if(c.readyState === WebSocket.OPEN) c.send(data); });
}

const server = http.createServer((req,res)=>{
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if(req.method === 'OPTIONS') {
    res.writeHead(204, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});
    return res.end();
  }
  if(urlPath === '/api/health' && req.method === 'GET') {
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});
    res.end(JSON.stringify({ok:true,server:'shared-root',port:PORT,accounts:Object.keys(users).length,admin:!!users.Blooketstudio}));
    return;
  }
  if(urlPath === '/api/leaderboard' && req.method === 'GET') {
    const leaderboard=Object.entries(users).map(([username,u])=>({
      username,
      tokens:Number(u.tokens ?? u.coins ?? 0),
      opened:Number(u.opened||0)
    })).sort((a,b)=>b.tokens-a.tokens||a.username.localeCompare(b.username));
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});
    res.end(JSON.stringify({ok:true,leaderboard}));
    return;
  }

if(urlPath === '/api/bazaar' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});
    return res.end(JSON.stringify(bazaar));
  }
  if(urlPath === '/api/bazaar/list' && req.method === 'POST') {
    let body=''; req.on('data', c=>body+=c); req.on('end', ()=>{
      try{
        const {seller,blookId,blookIds,price,quantity}=JSON.parse(body||'{}');
        if(!seller || !users[seller]) throw new Error('Seller account not found.');
        const account=users[seller];
        const requestedIds=Array.isArray(blookIds)&&blookIds.length?blookIds:[blookId];
        const amount=Math.floor(Number(price)); if(!Number.isFinite(amount)||amount<1) throw new Error('Invalid price.');
        const qty=Math.floor(Number(quantity||requestedIds.length));
        if(!Number.isFinite(qty)||qty<1||qty>requestedIds.length) throw new Error('Invalid quantity.');
        const ids=requestedIds.slice(0,qty);
        const found=ids.map(id=>Array.isArray(account.inventory)?account.inventory.findIndex(x=>x.id===id):-1);
        if(found.some(idx=>idx<0)) throw new Error('One or more Blooks are no longer in your inventory.');
        if(ids.some(id=>account.avatar===id)) throw new Error('Your equipped avatar cannot be listed.');
        const first=account.inventory[found[0]];
        if(bazaar.listings.some(x=>x.seller===seller && (x.blookId===blookId || (Array.isArray(x.blookIds)&&x.blookIds.includes(blookId))))) throw new Error('That Blook is already listed.');
        const removeSet=new Set(ids);
        account.inventory=account.inventory.filter(x=>!removeSet.has(x.id));
        const listing={id:'listing_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),seller,blookId:first.id,blookIds:ids,item:first.item,rarity:first.rarity,pack:first.pack,price:amount,quantity:qty,createdAt:Date.now()};
        bazaar.listings.push(listing); saveUsers(); saveBazaar();
        res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}); res.end(JSON.stringify({ok:true,seller:account,listing}));
      }catch(e){ res.writeHead(400, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}); res.end(JSON.stringify({ok:false,error:e.message})); }
    }); return;
  }
  if(urlPath === '/api/bazaar/recall' && req.method === 'POST') {
    let body=''; req.on('data', c=>body+=c); req.on('end', ()=>{
      try{
        const {seller,listingId}=JSON.parse(body||'{}');
        const li=bazaar.listings.find(x=>String(x.id)===String(listingId));
        if(!li || li.seller!==seller) throw new Error('Listing not found or not owned by you.');
        const account=users[seller];
        account.inventory=Array.isArray(account.inventory)?account.inventory:[];
        const qty=Math.max(1,Number(li.quantity||1));
        for(let i=0;i<qty;i++) account.inventory.push({id:'blook_'+Date.now()+'_'+Math.random().toString(36).slice(2),item:li.item,rarity:li.rarity,pack:li.pack});
        bazaar.listings=bazaar.listings.filter(x=>String(x.id)!==String(listingId));
        saveUsers(); saveBazaar();
        res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
        res.end(JSON.stringify({ok:true,seller:account}));
      }catch(e){
        res.writeHead(400,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
        res.end(JSON.stringify({ok:false,error:e.message}));
      }
    }); return;
  }
if(urlPath === '/api/bazaar/buy' && req.method === 'POST') {
    let body=''; req.on('data', c=>body+=c); req.on('end', ()=>{
      try{
        const {buyer,listingId}=JSON.parse(body||'{}');
        if(!buyer || !users[buyer]) throw new Error('Buyer account not found.');
        const li=bazaar.listings.find(x=>x.id===listingId); if(!li) throw new Error('This player listing is no longer available.');
        if(li.seller===buyer) throw new Error('You cannot buy your own listing.');
        const buyerAcc=users[buyer], sellerAcc=users[li.seller]; if(!sellerAcc) throw new Error('Seller account no longer exists.');
        const unitPrice=Number(li.price); const available=Math.max(1,Number(li.quantity||1));
        const requested=Number(body.quantity||1); const buyQty=Math.floor(requested);
        if(!Number.isFinite(buyQty)||buyQty<1||buyQty>available) throw new Error(`Choose a quantity from 1 to ${available}.`);
        const totalPrice=unitPrice*buyQty;
        if(Number(buyerAcc.coins||0)<totalPrice) throw new Error(`You need ${totalPrice.toLocaleString()} Tokens to buy ${buyQty} Blook${buyQty===1?'':'s'}.`);
        buyerAcc.coins=Number(buyerAcc.coins||0)-totalPrice; buyerAcc.inventory=Array.isArray(buyerAcc.inventory)?buyerAcc.inventory:[];
        for(let i=0;i<buyQty;i++) buyerAcc.inventory.push({id:'blook_'+Date.now()+'_'+Math.random().toString(36).slice(2),item:li.item,rarity:li.rarity,pack:li.pack});
        sellerAcc.coins=Number(sellerAcc.coins||0)+totalPrice;
        if(buyQty===available) bazaar.listings=bazaar.listings.filter(x=>x.id!==listingId);
        else { li.quantity=available-buyQty; li.blookIds=Array.isArray(li.blookIds)?li.blookIds.slice(buyQty):li.blookIds; li.blookId=li.blookIds?.[0]||li.blookId; }
        saveUsers(); saveBazaar();
        res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}); res.end(JSON.stringify({ok:true,buyer:buyerAcc,seller:li.seller,item:li.item,price:totalPrice,quantity:buyQty}));
      }catch(e){ res.writeHead(400, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}); res.end(JSON.stringify({ok:false,error:e.message})); }
    }); return;
  }
  if(urlPath === '/api/users' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});
    return res.end(JSON.stringify({users}));
  }
  if(urlPath === '/api/users' && req.method === 'POST') {
    // Merge account changes instead of replacing the entire database.
    // Each account carries updatedAt, preventing an old browser tab from
    // wiping newer data saved by another player/device.
    let body='';
    req.on('data', chunk => { body += chunk; if(body.length > 8 * 1024 * 1024) req.destroy(); });
    req.on('end', ()=>{
      try {
        const incoming = JSON.parse(body || '{}');
        if(!incoming || typeof incoming !== 'object' || !incoming.users || typeof incoming.users !== 'object' || Array.isArray(incoming.users)) {
          throw new Error('Invalid users payload');
        }
        const incomingUsers = incoming.users;
        let changed = false;
        for (const [username, incomingAccount] of Object.entries(incomingUsers)) {
          if (!incomingAccount || typeof incomingAccount !== 'object') continue;
          const currentAccount = users[username];
          const incomingTime = Number(incomingAccount.updatedAt || 0);
          const currentTime = Number(currentAccount?.updatedAt || 0);
          // Newer data wins. If the root has no timestamp yet, accept a
          // timestamped client account. Never delete accounts just because
          // another browser submitted a smaller account map.
          if (!currentAccount || incomingTime > currentTime || (incomingTime === currentTime && incomingTime > 0)) {
            users[username] = incomingAccount;
            changed = true;
          }
        }
        if (changed) saveUsers();
        res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});
        res.end(JSON.stringify({ok:true, count:Object.keys(users).length, users}));
      } catch(e) {
        res.writeHead(400, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
        res.end(JSON.stringify({ok:false,error:e.message}));
      }
    });
    return;
  }

  if(urlPath === '/api/users/delete' && req.method === 'POST') {
    let body='';
    req.on('data', chunk => { body += chunk; if(body.length > 1024 * 1024) req.destroy(); });
    req.on('end', ()=>{
      try {
        const incoming = JSON.parse(body || '{}');
        const username = String(incoming.username || '');
        if (!username || !users[username]) throw new Error('Account not found.');
        delete users[username];
        saveUsers();
        res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});
        res.end(JSON.stringify({ok:true, count:Object.keys(users).length}));
      } catch(e) {
        res.writeHead(400, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
        res.end(JSON.stringify({ok:false,error:e.message}));
      }
    });
    return;
  }
  if(urlPath === '/health'){
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ok:true, chat:messages.length}));
  }
  if(urlPath === '/') urlPath='/index.html';
  const file = path.normalize(path.join(ROOT,urlPath));
  if(!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file,(err,data)=>{
    if(err){ res.writeHead(err.code==='ENOENT'?404:500); return res.end('Not found'); }
    const ext=path.extname(file);
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'};
    res.writeHead(200, {'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-cache'}); res.end(data);
  });
});

const wss = WebSocket ? new WebSocket.Server({server}) : null;
if(wss) wss.on('connection', ws=>{
  cleanupExpiredMessages();
  ws.send(JSON.stringify({type:'chat:init', messages:messages.slice(-100)}));
  const sendPresence = () => broadcast({type:'presence:list', players:[...online.values()]});
  ws.on('close', ()=>{ if(ws.__user && online.get(ws.__user)?.connectionId===ws.__connectionId) { online.delete(ws.__user); sendPresence(); } });
  ws.on('message', raw=>{
    try {
      const m=JSON.parse(raw.toString());
      if(m.type === 'presence:set') {
        const user=String(m.user||'').trim().slice(0,32);
        if(!user) return;
        ws.__user=user;
        ws.__connectionId = Math.random().toString(36).slice(2);
        online.set(user,{user,avatar:String(m.avatar||'🙂').slice(0,16),rarity:String(m.rarity||'').slice(0,16),connectionId:ws.__connectionId});
        broadcast({type:'presence:list', players:[...online.values()]});
        return;
      }
      if(m.type !== 'chat:send') return;
      const user=String(m.user||'').trim().slice(0,32);
      const text=String(m.text||'').trim().slice(0,500);
      if(!user || !text) return;
      const createdAt = Date.now();
      const msg={id:createdAt.toString(36)+Math.random().toString(36).slice(2,7),user,text,avatar:String(m.avatar||'🙂').slice(0,16),rarity:String(m.rarity||'').slice(0,16),createdAt,time:new Date(createdAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})};
      messages.push(msg); messages=messages.slice(-200); saveMessages(); broadcast({type:'chat:new', message:msg});
    } catch {}
  });
});
server.listen(PORT, "0.0.0.0", ()=>console.log(`BlooketStudio server: http://localhost:${PORT}`));
