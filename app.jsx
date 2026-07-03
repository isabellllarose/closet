/* global React, ReactDOM */
const { useState, useRef, useEffect, useCallback } = React;

// ── Supabase ──────────────────────────────────────────────────────────────────
const SB_URL = 'https://bxlpdmnxoslukvrpdfke.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bHBkbW54b3NsdWt2cnBkZmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTk0NTksImV4cCI6MjA5ODU5NTQ1OX0.HARfq5wkICO8AuFNubc6I7TQrnWBMFv_yUanKaMjGMQ';
const H = {'apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Content-Type':'application/json','Prefer':'return=representation'};

const sb = {
  async get(t,q='')  { const r=await fetch(`${SB_URL}/rest/v1/${t}?${q}&order=created_at.asc`,{headers:H}); if(!r.ok)throw new Error(await r.text()); return r.json(); },
  async ins(t,d)     { const r=await fetch(`${SB_URL}/rest/v1/${t}`,{method:'POST',headers:H,body:JSON.stringify(d)}); if(!r.ok)throw new Error(await r.text()); return r.json(); },
  async upd(t,id,d)  { const r=await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:'PATCH',headers:H,body:JSON.stringify(d)}); if(!r.ok)throw new Error(await r.text()); return r.json(); },
  async del(t,id)    { const r=await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:'DELETE',headers:H}); if(!r.ok)throw new Error(await r.text()); },
  // Upload with retry — converts to JPEG first for reliable iPhone camera roll uploads
  async upload(file) {
    const MAX = 4 * 1024 * 1024; // 4MB
    // resize/convert via canvas for reliable mobile upload
    let blob = await resizeImage(file, 1200);
    const ext = 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadHeaders = {'apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Content-Type':'image/jpeg'};
    try {
      const r = await fetch(`${SB_URL}/storage/v1/object/closet-images/${path}`, {method:'POST',headers:uploadHeaders,body:blob});
      if (!r.ok) { const err = await r.text(); console.error('Upload failed:', err); return null; }
      return `${SB_URL}/storage/v1/object/public/closet-images/${path}`;
    } catch(e) { console.error('Upload error:', e); return null; }
  }
};

// Resize + convert to JPEG via canvas — fixes iPhone HEIC/camera roll issues
function resizeImage(file, maxPx=1200) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(blob => resolve(blob), 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ── Date helpers ──────────────────────────────────────────────────────────────
const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatDate(iso) {
  if (!iso) return null;
  const [y,m,d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m)-1]} ${y}`;
}
function todayIso() { return new Date().toISOString().slice(0,10); }
function today2()   { return new Date().toISOString().slice(0,7); }
function daysAgoLabel(iso) {
  if (!iso) return 'Never worn';
  const d = Math.round((new Date() - new Date(iso)) / 86400000);
  if (d===0) return 'Today'; if (d===1) return 'Yesterday';
  if (d<7)   return `${d}d ago`; if (d<30) return `${Math.round(d/7)}w ago`;
  return `${Math.round(d/30)}mo ago`;
}
function isOverdue(iso, n=30) {
  if (!iso) return true;
  return Math.round((new Date()-new Date(iso))/86400000) > n;
}

// ── Data helpers ──────────────────────────────────────────────────────────────
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const toRow  = i => ({id:i.id,name:i.name,category:i.category,subcategory:i.subcategory||null,brand:i.brand||null,store:i.store||null,color:i.color||null,size:i.size||null,size_label:i.sizeLabel||i.size||null,photo_url:i.photoUrl||null,occasions:i.occasions||[],date_bought:i.dateBought||null,last_worn_date:i.lastWornDate||null,wear_count:i.wearCount||0,notes:i.notes||null,complete:!!i.complete});
const fromRow= r => ({id:r.id,name:r.name,category:r.category,subcategory:r.subcategory,brand:r.brand,store:r.store,color:r.color,size:r.size,sizeLabel:r.size_label,photoUrl:r.photo_url,occasions:r.occasions||[],dateBought:r.date_bought,lastWornDate:r.last_worn_date,wearCount:r.wear_count||0,notes:r.notes,complete:r.complete});
const toWR   = i => ({id:i.id,name:i.name,category:i.category,subcategory:i.subcategory||null,store:i.store||null,brand:i.brand||null,url:i.url||null,price:i.price||null,orig_price:i.origPrice||null,on_sale:!!i.onSale,rating:i.rating||3,photo_urls:i.photoUrls||[],color:i.color||null,notes:i.notes||null,added_date:i.addedDate||today2()});
const fromWR = r => ({id:r.id,name:r.name,category:r.category,subcategory:r.subcategory,store:r.store,brand:r.brand,url:r.url,price:r.price,origPrice:r.orig_price,onSale:r.on_sale,rating:r.rating||3,photoUrls:r.photo_urls||[],color:r.color,notes:r.notes,addedDate:r.added_date});
const toOR   = o => ({id:o.id,name:o.name,occasion:o.occasion||null,notes:o.notes||null,item_ids:o.itemIds||[],item_positions:o.positions||null,wear_count:o.wearCount||0,last_worn_date:o.lastWornDate||null});
const fromOR = r => ({id:r.id,name:r.name,occasion:r.occasion,notes:r.notes,itemIds:r.item_ids||[],positions:r.item_positions||null,wearCount:r.wear_count||0,lastWornDate:r.last_worn_date});

const findSimilar = (wish,wardrobe) => {
  if(!wish.category)return[];
  return wardrobe.filter(w=>{if(!w.complete)return false;const cw=(wish.color||'').toLowerCase().split(' ')[0];return w.category===wish.category&&cw&&(w.color||'').toLowerCase().includes(cw);});
};

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_MAP = {
  'Tops':       ['T-shirts','Long sleeve tops','Shirts','Blouses','Knits & Jumpers','Tanks & Singlets','Crop tops','Hoodies & Sweatshirts'],
  'Bottoms':    ['Jeans','Trousers','Shorts','Skirts','Mini skirts','Midi skirts','Maxi skirts','Flares','Leggings'],
  'Dresses':    ['Mini','Midi','Maxi','Slip','Shirt dress','Wrap dress'],
  'Activewear': ['Sports tops','Sports bras','Sports bottoms','Gym sets','Tights','Bike shorts'],
  'Outerwear':  ['Coats','Jackets','Blazers','Vests','Puffer jackets','Leather jackets','Trench coats'],
  'Shoes':      ['Sneakers','Heels','Boots','Ankle boots','Sandals','Flats','Mules','Loafers'],
  'Bags':       ['Tote','Shoulder bag','Crossbody','Clutch','Backpack','Belt bag'],
  'Accessories':['Jewellery','Scarves','Belts','Hats','Sunglasses','Hair accessories'],
  'Swimwear':   ['Bikini tops','Bikini bottoms','One-piece','Coverups'],
  'Lingerie':   ['Bras','Underwear','Sleepwear'],
};
const CATS      = ['All',...Object.keys(CATEGORY_MAP)];
const OCCASIONS = ['Casual','Work','Evening','Event','Gym','Holiday','Beach'];
const OCC_C     = {Casual:{bg:'#EEF5EC',b:'#89BE7B',t:'#3A7A2B'},Work:{bg:'#EAF0F8',b:'#7BA4D0',t:'#1E5799'},Evening:{bg:'#F3EEF8',b:'#A47BC4',t:'#5D2A8A'},Event:{bg:'#FDF3EC',b:'#E0A86A',t:'#8A4A10'},Gym:{bg:'#EDFAF4',b:'#62C99A',t:'#1A7A52'},Holiday:{bg:'#FEF0F0',b:'#E07B7B',t:'#8A1C1C'},Beach:{bg:'#EAF5F8',b:'#60AACC',t:'#1A5E7A'}};
const CAT_EMOJI = {Tops:'👕',Bottoms:'👖',Dresses:'👗',Activewear:'🏃',Outerwear:'🧥',Shoes:'👟',Bags:'👜',Accessories:'💍',Swimwear:'👙',Lingerie:'🩱'};
const NEED_LBL  = ['','Nice to have','Want it','Really want it','Need it','Genuinely need'];
const NAV       = [{key:'wardrobe',label:'Wardrobe'},{key:'outfits',label:'Outfits'},{key:'wishlist',label:'Wishlist'},{key:'stats',label:'Stats'},{key:'sizes',label:'Sizes'},{key:'ask',label:'Ask'}];
const SIZE_CAT_MAP = {'Tops':'Tops','Bottoms':'Bottoms','Dresses':'Dresses','Activewear':'Activewear','Outerwear':'Outerwear','Shoes':'Shoes'};

const SIZE_GUIDES = [
  {store:'Cotton On',cat:'Tops & Bottoms',country:'AU',sizes:[{l:'XS',au:'6',bust:'80–83',waist:'62–65',hip:'87–90'},{l:'S',au:'8',bust:'84–87',waist:'66–69',hip:'91–94'},{l:'M',au:'10',bust:'88–91',waist:'70–73',hip:'95–98'},{l:'L',au:'12',bust:'92–95',waist:'74–77',hip:'99–102'},{l:'XL',au:'14',bust:'96–101',waist:'78–83',hip:'103–108'}]},
  {store:'Zara',cat:'Tops & Bottoms',country:'AU/EU',sizes:[{l:'XS',au:'6',bust:'79–81',waist:'61–63',hip:'87–89'},{l:'S',au:'8',bust:'83–85',waist:'65–67',hip:'91–93'},{l:'M',au:'10–12',bust:'87–89',waist:'69–71',hip:'95–97'},{l:'L',au:'14',bust:'91–93',waist:'73–75',hip:'99–101'},{l:'XL',au:'16',bust:'96–98',waist:'79–81',hip:'105–107'}]},
  {store:'ASOS',cat:'Tops & Bottoms',country:'AU',sizes:[{l:'XS',au:'6',bust:'82',waist:'62',hip:'88'},{l:'S',au:'8',bust:'86',waist:'66',hip:'92'},{l:'M',au:'10',bust:'90',waist:'70',hip:'96'},{l:'L',au:'12',bust:'94',waist:'74',hip:'100'},{l:'XL',au:'14',bust:'98',waist:'78',hip:'104'}]},
  {store:"Levi's",cat:'Jeans (waist)',country:'AU',sizes:[{l:'24',au:'6',bust:'—',waist:'61',hip:'84',inseam:'30"'},{l:'25',au:'6–8',bust:'—',waist:'63',hip:'86',inseam:'30"'},{l:'26',au:'8',bust:'—',waist:'66',hip:'89',inseam:'30"'},{l:'27',au:'8–10',bust:'—',waist:'69',hip:'92',inseam:'30"'},{l:'28',au:'10',bust:'—',waist:'72',hip:'95',inseam:'30"'},{l:'29',au:'10–12',bust:'—',waist:'75',hip:'98',inseam:'30"'},{l:'30',au:'12',bust:'—',waist:'78',hip:'101',inseam:'30"'},{l:'31',au:'12–14',bust:'—',waist:'81',hip:'104',inseam:'30"'},{l:'32',au:'14',bust:'—',waist:'84',hip:'107',inseam:'30"'}]},
  {store:'H&M',cat:'Tops & Bottoms',country:'AU',sizes:[{l:'XS',au:'6',bust:'78–82',waist:'60–64',hip:'86–90'},{l:'S',au:'8',bust:'82–86',waist:'64–68',hip:'90–94'},{l:'M',au:'10–12',bust:'86–90',waist:'68–72',hip:'94–98'},{l:'L',au:'14',bust:'92–96',waist:'74–78',hip:'100–104'},{l:'XL',au:'16',bust:'98–102',waist:'80–84',hip:'106–110'}]},
  {store:'Princess Polly',cat:'Tops & Dresses',country:'AU',sizes:[{l:'4',au:'4',bust:'77',waist:'58',hip:'83'},{l:'6',au:'6',bust:'80',waist:'62',hip:'87'},{l:'8',au:'8',bust:'84',waist:'66',hip:'91'},{l:'10',au:'10',bust:'88',waist:'70',hip:'95'},{l:'12',au:'12',bust:'93',waist:'75',hip:'100'}]},
  {store:'Glassons',cat:'Tops & Bottoms',country:'AU/NZ',sizes:[{l:'XS',au:'6',bust:'80',waist:'62',hip:'87'},{l:'S',au:'8',bust:'84',waist:'66',hip:'91'},{l:'M',au:'10',bust:'88',waist:'70',hip:'95'},{l:'L',au:'12',bust:'93',waist:'75',hip:'100'},{l:'XL',au:'14',bust:'98',waist:'80',hip:'105'}]},
  {store:'The Iconic',cat:'Multi-brand (AU)',country:'AU',sizes:[{l:'XS',au:'6',bust:'80–83',waist:'62–65',hip:'86–89'},{l:'S',au:'8',bust:'84–87',waist:'66–69',hip:'90–93'},{l:'M',au:'10',bust:'88–91',waist:'70–73',hip:'94–97'},{l:'L',au:'12',bust:'92–95',waist:'74–77',hip:'98–101'},{l:'XL',au:'14',bust:'96–99',waist:'78–81',hip:'102–105'}]},
  {store:'Lululemon',cat:'Activewear',country:'AU',sizes:[{l:'2',au:'4',bust:'—',waist:'58–61',hip:'83–86'},{l:'4',au:'6',bust:'—',waist:'61–64',hip:'86–89'},{l:'6',au:'8',bust:'—',waist:'64–67',hip:'89–92'},{l:'8',au:'10',bust:'—',waist:'67–70',hip:'92–95'},{l:'10',au:'12',bust:'—',waist:'70–73',hip:'95–98'}]},
  {store:'Nike',cat:'Activewear',country:'AU',sizes:[{l:'XS',au:'6–8',bust:'78–83',waist:'60–65',hip:'85–90'},{l:'S',au:'8–10',bust:'83–88',waist:'65–70',hip:'90–95'},{l:'M',au:'10–12',bust:'88–93',waist:'70–75',hip:'95–100'},{l:'L',au:'12–14',bust:'93–98',waist:'75–80',hip:'100–105'}]},
];

function getMySizeSummary(storeName, wardrobe) {
  const items = wardrobe.filter(w=>w.store===storeName&&w.size);
  if (!items.length) return null;
  const groups = {};
  items.forEach(item=>{const cat=SIZE_CAT_MAP[item.category]||item.category;if(!cat)return;if(!groups[cat])groups[cat]=new Set();groups[cat].add(item.size);});
  return Object.entries(groups).map(([cat,sizes])=>`${cat}: ${[...sizes].join(', ')}`);
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  html,body,#root{height:100%;}
  body{font-family:'Jost',system-ui,sans-serif;background:#111;}
  :root{--cream:#F5F0E8;--ink:#1A1714;--muted:#8A837A;--border:#E0D9CF;--panel:#FDFAF5;--accent:#B07848;--accent-bg:#F5EDE2;--red:#C4623A;--green:#5A8A60;--safe-t:env(safe-area-inset-top,0px);--safe-b:env(safe-area-inset-bottom,16px);}
  .app{display:flex;height:100dvh;height:100vh;background:var(--cream);overflow:hidden;}
  .app-inner{display:flex;flex-direction:column;flex:1;overflow:hidden;max-width:430px;margin:0 auto;width:100%;}
  @media(min-width:768px){.app{justify-content:center;background:#ECEAE4;}.app-inner{flex-direction:row;max-width:1100px;margin:24px auto;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.15);height:calc(100vh - 48px);}}
  .sidebar{display:none;}
  @media(min-width:768px){.sidebar{display:flex;flex-direction:column;width:220px;flex-shrink:0;background:var(--ink);padding:32px 0 24px;}.sidebar-logo{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;letter-spacing:4px;color:#F5F0E8;padding:0 28px 32px;}.sidebar-item{padding:13px 28px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.4);cursor:pointer;transition:all .15s;border:none;background:none;font-family:'Jost',sans-serif;text-align:left;width:100%;border-left:2px solid transparent;}.sidebar-item:hover{color:rgba(255,255,255,.75);background:rgba(255,255,255,.05);}.sidebar-item.active{color:#F5F0E8;border-left-color:var(--accent);background:rgba(255,255,255,.06);}}
  .content-area{display:flex;flex-direction:column;flex:1;overflow:hidden;background:var(--cream);}
  .topbar{display:flex;align-items:center;gap:10px;padding:14px 18px 11px;background:var(--panel);border-bottom:1px solid var(--border);flex-shrink:0;padding-top:calc(14px + var(--safe-t));}
  @media(min-width:768px){.topbar{padding-top:16px;}.topbar-logo{display:none;}.topbar-title{display:block!important;}}
  .topbar-logo{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:300;letter-spacing:3px;color:var(--ink);flex-shrink:0;}
  .topbar-title{display:none;font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:300;color:var(--ink);flex-shrink:0;}
  .searchbox{flex:1;display:flex;align-items:center;gap:6px;background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:7px 10px;}
  .searchbox input{flex:1;border:none;background:none;font-size:12px;font-family:'Jost',sans-serif;color:var(--ink);outline:none;}
  .searchbox input::placeholder{color:var(--muted);}
  .iconbtn{width:36px;height:36px;border-radius:50%;background:var(--ink);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .iconbtn:hover{opacity:.85;}
  .botnav{display:flex;background:var(--panel);border-top:1px solid var(--border);padding:0;flex-shrink:0;padding-bottom:var(--safe-b);}
  @media(min-width:768px){.botnav{display:none;}}
  .navitem{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:none;background:none;cursor:pointer;padding:10px 2px 8px;min-height:58px;}
  .navitem .nl{font-size:9px;letter-spacing:.3px;text-transform:uppercase;color:var(--muted);font-weight:400;}
  .navitem.active .nl{color:var(--ink);font-weight:600;}
  .navdot{width:4px;height:4px;border-radius:50%;background:var(--accent);margin-top:2px;}
  .scroll{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;}
  .scroll::-webkit-scrollbar{width:4px;}
  .scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
  .filterrow{display:flex;gap:6px;padding:10px 16px 6px;overflow-x:auto;}
  .filterrow::-webkit-scrollbar{display:none;}
  .chip{flex-shrink:0;padding:6px 14px;border-radius:20px;border:1.5px solid var(--border);background:#fff;font-size:12px;cursor:pointer;color:var(--muted);font-family:'Jost',sans-serif;transition:all .15s;white-space:nowrap;}
  .chip.active{background:var(--ink);border-color:var(--ink);color:#fff;}
  .seclbl{padding:6px 16px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);font-weight:500;}

  /* ── WARDROBE GRID — squarer cards ── */
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 16px 24px;}
  @media(min-width:768px){.grid{grid-template-columns:repeat(4,1fr);}}
  @media(min-width:1024px){.grid{grid-template-columns:repeat(5,1fr);}}
  .icard{border-radius:12px;overflow:hidden;background:#fff;border:1.5px solid var(--border);cursor:pointer;transition:transform .15s,box-shadow .15s;position:relative;}
  .icard:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);}
  .icard:active{transform:scale(0.97);}
  .icard.incomplete{border-style:dashed;}
  /* Square-ish photo area with white bg padding */
  .iphoto{width:100%;aspect-ratio:1/1;background:#fff;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
  .iphoto img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;}
  .iphoto .no-photo{display:flex;flex-direction:column;align-items:center;gap:3px;}
  .badge-warn{position:absolute;top:5px;right:5px;background:var(--accent);color:#fff;font-size:8px;padding:2px 5px;border-radius:4px;}
  .badge-worn{position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,.52);color:#fff;font-size:8px;padding:2px 5px;border-radius:4px;backdrop-filter:blur(4px);}
  .iinfo{padding:5px 7px 7px;}
  .iname{font-size:10.5px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .imeta{font-size:9px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .isize{font-size:9px;font-weight:500;color:var(--accent);margin-top:1px;}

  /* ── WISHLIST GRID — square cards ── */
  .wish-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:8px 16px 24px;}
  @media(min-width:768px){.wish-grid{grid-template-columns:repeat(3,1fr);}}
  @media(min-width:1024px){.wish-grid{grid-template-columns:repeat(4,1fr);}}
  .wcard{background:#fff;border-radius:12px;border:1.5px solid var(--border);cursor:pointer;transition:transform .15s,box-shadow .15s;overflow:hidden;}
  .wcard:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);}
  .wcard:active{transform:scale(0.98);}
  /* Square photo with white bg padding — same approach as wardrobe */
  .wimg{width:100%;aspect-ratio:1/1;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;}
  .wimg img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;}
  .wimg .no-photo{font-size:28px;opacity:.2;}
  /* photo count badge */
  .photo-count{position:absolute;bottom:5px;right:5px;background:rgba(0,0,0,.5);color:#fff;font-size:9px;padding:2px 6px;border-radius:10px;backdrop-filter:blur(4px);}
  .simflag{font-size:9px;background:var(--accent-bg);color:var(--accent);border-radius:5px;padding:2px 6px;margin-top:4px;display:inline-block;}

  /* ── WISH PHOTO VIEWER (swipe/hover) ── */
  .wish-viewer{position:relative;width:100%;aspect-ratio:1/1;background:#fff;overflow:hidden;border-radius:14px;margin-bottom:12px;}
  .wish-viewer-img{width:100%;height:100%;object-fit:contain;display:block;user-select:none;}
  .wish-viewer-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.85);border:none;border-radius:50%;width:30px;height:30px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.12);}
  .wish-viewer-nav.prev{left:8px;}
  .wish-viewer-nav.next{right:8px;}
  .wish-thumbs{display:flex;gap:6px;margin-top:8px;overflow-x:auto;padding-bottom:2px;}
  .wish-thumbs::-webkit-scrollbar{display:none;}
  .wish-thumb{width:48px;height:48px;border-radius:7px;overflow:hidden;flex-shrink:0;cursor:pointer;border:2px solid transparent;background:#fff;display:flex;align-items:center;justify-content:center;}
  .wish-thumb.active{border-color:var(--ink);}
  .wish-thumb img{width:100%;height:100%;object-fit:contain;}
  .wish-thumb-add{border:2px dashed var(--border);background:var(--cream);font-size:18px;color:var(--muted);position:relative;}
  .wish-thumb-add input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}

  /* stats */
  .stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 16px 4px;}
  @media(min-width:768px){.stat-grid{grid-template-columns:repeat(4,1fr);}}
  .stat-card{background:#fff;border-radius:14px;padding:14px;border:1px solid var(--border);}
  .stat-n{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:300;}
  .stat-l{font-size:10px;color:var(--muted);margin-top:2px;}
  /* sizes */
  .store-card{background:#fff;border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:8px;}
  .store-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:pointer;}
  .size-wrap{overflow-x:auto;}
  table{width:100%;border-collapse:collapse;font-size:10px;}
  th{background:var(--cream);padding:6px 8px;text-align:left;font-weight:500;font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);white-space:nowrap;border-top:1px solid var(--border);}
  td{padding:6px 8px;border-top:1px solid var(--border);color:var(--ink);white-space:nowrap;}
  .my-row td{background:var(--accent-bg);font-weight:500;}
  .my-sizes-summary{padding:10px 14px 12px;border-top:1px solid var(--border);background:var(--accent-bg);}
  /* ask */
  .ask-wrap{padding:14px 16px;display:flex;flex-direction:column;gap:10px;}
  @media(min-width:768px){.ask-wrap{max-width:640px;}}
  .ask-box{background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;}
  .ask-input-row{display:flex;align-items:center;gap:8px;padding:11px 13px;}
  .ask-input{flex:1;border:none;background:none;font-size:13px;font-family:'Jost',sans-serif;color:var(--ink);outline:none;}
  .ask-input::placeholder{color:var(--muted);}
  .banner{margin:8px 16px;background:var(--accent-bg);border-radius:12px;padding:10px 13px;border:1px solid #DEC9AF;display:flex;align-items:center;gap:8px;}
  .empty{text-align:center;padding:60px 24px;}
  .empty-t{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:300;margin-bottom:6px;}
  .empty-s{font-size:12px;color:var(--muted);line-height:1.6;}

  /* sheets */
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(5px);}
  @media(min-width:768px){.overlay{align-items:center;}}
  .sheet{background:var(--panel);border-radius:24px 24px 0 0;max-height:94vh;width:100%;display:flex;flex-direction:column;overflow:hidden;}
  @media(min-width:768px){.sheet{border-radius:20px;max-width:580px;max-height:88vh;}}
  .sheet-handle{width:36px;height:4px;background:var(--border);border-radius:2px;margin:14px auto 0;flex-shrink:0;}
  @media(min-width:768px){.sheet-handle{display:none;}}
  .sheet-top{display:flex;align-items:center;justify-content:space-between;padding:12px 20px 10px;border-bottom:1px solid var(--border);flex-shrink:0;}
  .sheet-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:300;}
  .sheet-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted);line-height:1;padding:2px 6px;}
  .sheet-body{padding:16px 20px;flex:1;overflow-y:auto;}
  .sheet-body::-webkit-scrollbar{display:none;}
  .sheet-actions{display:flex;gap:8px;padding:12px 20px calc(12px + var(--safe-b));border-top:1px solid var(--border);flex-shrink:0;}
  @media(min-width:768px){.sheet-actions{padding-bottom:16px;}}
  .f-lbl{font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px;display:block;}
  .f-inp{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:'Jost',sans-serif;background:#fff;color:var(--ink);outline:none;transition:border-color .15s;}
  .f-inp:focus{border-color:var(--ink);}
  .f-sel{-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238A837A'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}
  .detail-row{display:flex;align-items:baseline;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);gap:12px;}
  .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid var(--border);}
  .store-picker{position:relative;}
  .store-options{position:absolute;top:100%;left:0;right:0;background:#fff;border:1.5px solid var(--ink);border-radius:10px;z-index:100;max-height:200px;overflow-y:auto;box-shadow:0 4px 16px rgba(0,0,0,.12);margin-top:2px;}
  .store-opt{padding:10px 13px;font-size:13px;cursor:pointer;transition:background .1s;font-family:'Jost',sans-serif;}
  .store-opt:hover{background:var(--cream);}
  .store-opt.add-new{color:var(--accent);font-weight:500;border-top:1px solid var(--border);}
  .spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .pz{border:2px dashed var(--border);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;background:var(--cream);position:relative;overflow:hidden;transition:border-color .2s;}
  .pz:active{border-color:var(--accent);}
  .pz img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;}
  .pz input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}

  /* upload status */
  .upload-status{font-size:11px;margin-top:4px;padding:5px 8px;border-radius:6px;display:flex;align-items:center;gap:5px;}
  .upload-status.ok{background:#EDF7ED;color:#2E7D32;}
  .upload-status.err{background:#FDECEA;color:#C62828;}
  .upload-status.loading{background:var(--cream);color:var(--muted);}

  /* calendar */
  .cal-overlay{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);backdrop-filter:blur(3px);}
  .cal-box{background:#fff;border-radius:20px;padding:20px;width:320px;max-width:92vw;box-shadow:0 8px 32px rgba(0,0,0,.18);}
  .cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
  .cal-title{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:300;}
  .cal-nav{background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted);padding:4px 8px;border-radius:6px;}
  .cal-nav:hover{background:var(--cream);}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
  .cal-day-lbl{font-size:10px;color:var(--muted);text-align:center;padding:4px 0;font-weight:500;letter-spacing:.5px;}
  .cal-day{font-size:13px;text-align:center;padding:7px 4px;border-radius:8px;cursor:pointer;transition:all .15s;font-family:'Jost',sans-serif;line-height:1;}
  .cal-day:hover{background:var(--cream);}
  .cal-day.today{background:var(--accent-bg);color:var(--accent);font-weight:600;}
  .cal-day.selected{background:var(--ink)!important;color:#fff!important;font-weight:500;}
  .cal-day.other-month{color:#D0C8BE;cursor:default;}
  .cal-day.other-month:hover{background:none;}
  .cal-footer{display:flex;gap:8px;margin-top:14px;}

  /* outfits */
  .outfit-masonry{columns:2;column-gap:10px;padding:0 16px 24px;}
  @media(min-width:768px){.outfit-masonry{columns:3;}}
  @media(min-width:1024px){.outfit-masonry{columns:4;}}
  .outfit-card{background:#fff;border-radius:16px;border:1.5px solid var(--border);overflow:hidden;cursor:pointer;transition:box-shadow .15s;break-inside:avoid;margin-bottom:10px;display:inline-block;width:100%;}
  .outfit-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);}
  .outfit-photos.single img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;}
  .outfit-photos.two{display:grid;grid-template-columns:1fr 1fr;gap:2px;}
  .outfit-photos.two .ph{aspect-ratio:2/3;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fff;}
  .outfit-photos.two .ph img{width:100%;height:100%;object-fit:contain;}
  .outfit-photos.three{display:grid;grid-template-columns:1fr 1fr;gap:2px;}
  .outfit-photos.three .ph:first-child{grid-column:1/-1;aspect-ratio:3/2;}
  .outfit-photos.three .ph{overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fff;}
  .outfit-photos.three .ph:not(:first-child){aspect-ratio:1;}
  .outfit-photos.three .ph img,.outfit-photos.four .ph img{width:100%;height:100%;object-fit:contain;}
  .outfit-photos.four{display:grid;grid-template-columns:1fr 1fr;gap:2px;}
  .outfit-photos.four .ph{aspect-ratio:1;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fff;}
  .ph-empty{display:flex;align-items:center;justify-content:center;font-size:22px;opacity:.2;width:100%;height:100%;}
  .outfit-info{padding:8px 12px 10px;}
  .outfit-name{font-size:12px;font-weight:500;color:var(--ink);}
  .outfit-meta{font-size:10px;color:var(--muted);margin-top:2px;}
  .builder-stage{background:var(--cream);border-radius:16px;padding:16px;margin-bottom:14px;}
  .slot-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
  .slot-label{font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);width:56px;flex-shrink:0;}
  .slot-item{flex:1;height:64px;background:#fff;border-radius:10px;border:1.5px solid var(--border);display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;transition:all .15s;}
  .slot-item:hover{border-color:var(--ink);}
  .slot-item.empty{border-style:dashed;color:var(--muted);font-size:12px;justify-content:center;}
  .slot-thumb{width:44px;height:52px;border-radius:6px;overflow:hidden;flex-shrink:0;background:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;}
  .slot-thumb img{width:100%;height:100%;object-fit:contain;}
  .slot-name{font-size:12px;font-weight:500;color:var(--ink);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .slot-remove{background:none;border:none;font-size:14px;cursor:pointer;color:var(--muted);padding:2px;flex-shrink:0;}
  .slot-remove:hover{color:var(--red);}
  .freeform-canvas{width:100%;height:300px;position:relative;background:var(--cream);border-radius:12px;overflow:hidden;touch-action:none;}
  .freeform-item{position:absolute;width:88px;height:108px;background:#fff;border-radius:10px;border:1.5px solid var(--border);overflow:hidden;cursor:grab;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.08);user-select:none;}
  .freeform-item:active{cursor:grabbing;box-shadow:0 6px 20px rgba(0,0,0,.18);z-index:10;}
  .freeform-item img{width:100%;height:100%;object-fit:contain;}
  .freeform-item .fi-label{font-size:9px;color:var(--muted);position:absolute;bottom:2px;left:0;right:0;text-align:center;background:rgba(255,255,255,.85);}
  .mode-toggle{display:flex;gap:6px;margin-bottom:12px;}
  .mode-btn{flex:1;padding:7px;border-radius:8px;font-size:11px;cursor:pointer;font-family:'Jost',sans-serif;transition:all .15s;}
  .mode-btn.active{background:var(--ink);color:#fff;border:1.5px solid var(--ink);}
  .mode-btn:not(.active){background:#fff;color:var(--muted);border:1.5px solid var(--border);}
  .picker-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:4px 0;}
  .picker-item{border-radius:10px;overflow:hidden;background:#fff;border:1.5px solid var(--border);cursor:pointer;transition:all .15s;}
  .picker-item:hover,.picker-item.sel{border-color:var(--ink);}
  .picker-item.sel{background:var(--accent-bg);}
  .picker-thumb{width:100%;aspect-ratio:1/1;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;}
  .picker-thumb img{max-width:100%;max-height:100%;object-fit:contain;}
  .picker-name{font-size:10px;font-weight:500;padding:4px 6px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
`;

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalendarPicker({ value, onSelect, onClose }) {
  const initDate = value ? new Date(value+'T12:00:00') : new Date();
  const [view, setView] = useState({ year: initDate.getFullYear(), month: initDate.getMonth() });
  const todayStr = todayIso();

  function buildCells() {
    const firstDow = new Date(view.year, view.month, 1).getDay();
    const offset = (firstDow + 6) % 7;
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const prevDays = new Date(view.year, view.month, 0).getDate();
    const cells = [];
    for (let i = offset-1; i >= 0; i--) {
      const d=prevDays-i, m=view.month===0?11:view.month-1, y=view.month===0?view.year-1:view.year;
      cells.push({d,m,y,other:true});
    }
    for (let d=1; d<=daysInMonth; d++) cells.push({d,m:view.month,y:view.year,other:false});
    const rem = (7-(cells.length%7))%7;
    for (let d=1; d<=rem; d++) {
      const m=view.month===11?0:view.month+1, y=view.month===11?view.year+1:view.year;
      cells.push({d,m,y,other:true});
    }
    return cells;
  }
  function isoOf(c) { return `${c.y}-${String(c.m+1).padStart(2,'0')}-${String(c.d).padStart(2,'0')}`; }
  function prev() { setView(v=>v.month===0?{year:v.year-1,month:11}:{year:v.year,month:v.month-1}); }
  function next() { setView(v=>v.month===11?{year:v.year+1,month:0}:{year:v.year,month:v.month+1}); }

  return (
    <div className="cal-overlay" onClick={onClose}>
      <div className="cal-box" onClick={e=>e.stopPropagation()}>
        <div className="cal-header">
          <button className="cal-nav" onClick={prev}>‹</button>
          <div className="cal-title">{MONTHS_FULL[view.month]} {view.year}</div>
          <button className="cal-nav" onClick={next}>›</button>
        </div>
        <div className="cal-grid">
          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=><div key={d} className="cal-day-lbl">{d}</div>)}
          {buildCells().map((cell,i)=>{
            const iso=isoOf(cell);
            let cls='cal-day';
            if(cell.other)cls+=' other-month';
            else if(iso===todayStr)cls+=' today';
            if(iso===value)cls+=' selected';
            return <div key={i} className={cls} onClick={()=>{if(!cell.other){onSelect(iso);onClose();}}}>{cell.d}</div>;
          })}
        </div>
        <div className="cal-footer">
          <button onClick={()=>{onSelect(todayStr);onClose();}} style={{flex:1,padding:'9px',border:'1.5px solid var(--border)',borderRadius:10,background:'none',fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Today</button>
          <button onClick={()=>{onSelect(null);onClose();}} style={{flex:1,padding:'9px',border:'1.5px solid var(--border)',borderRadius:10,background:'none',fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif",color:'var(--muted)'}}>Clear</button>
        </div>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{marginBottom:11}}>
      {label&&<label className="f-lbl">{label}</label>}
      <div className="f-inp" onClick={()=>setOpen(true)}
        style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',color:value?'var(--ink)':'var(--muted)'}}>
        <span>{value?formatDate(value):'Select date…'}</span>
        <span style={{fontSize:14,opacity:.5}}>📅</span>
      </div>
      {open&&<CalendarPicker value={value} onSelect={onChange} onClose={()=>setOpen(false)}/>}
    </div>
  );
}

function LogWearModal({ onLog, onClose }) {
  const [date, setDate] = useState(todayIso());
  return (
    <div className="cal-overlay" onClick={onClose}>
      <div className="cal-box" onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,marginBottom:14}}>Log a wear</div>
        <DateField label="Date worn" value={date} onChange={setDate}/>
        <div style={{display:'flex',gap:8,marginTop:4}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',border:'1.5px solid var(--border)',borderRadius:10,background:'none',fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Cancel</button>
          <button onClick={()=>{if(date){onLog(date);onClose();}}} style={{flex:1,padding:'10px',border:'none',borderRadius:10,background:'var(--ink)',color:'#fff',fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Photo upload with status feedback ─────────────────────────────────────────
function PhotoUploader({ photoUrl, onUrl, style={}, label='Tap to add photo\ncamera or library' }) {
  const ref = useRef();
  const [status, setStatus] = useState(null); // null | 'loading' | 'ok' | 'err'

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show preview immediately from local file
    const localUrl = URL.createObjectURL(file);
    onUrl(localUrl); // instant visual feedback
    setStatus('loading');
    const uploaded = await sb.upload(file);
    if (uploaded) {
      onUrl(uploaded);
      setStatus('ok');
    } else {
      // keep local blob for session but warn
      setStatus('err');
    }
    // reset input so same file can be reselected
    e.target.value = '';
  }

  return (
    <div style={{...style}}>
      {/* No onClick on the div — the input covers the full area and handles it directly.
          Having both causes a double-trigger on iPhone Safari which breaks uploads. */}
      <div className="pz" style={{width:'100%',height:'100%',minHeight:style.minHeight||120}}>
        {photoUrl&&<img src={photoUrl} alt=""/>}
        {!photoUrl&&status!=='loading'&&<>
          <span style={{fontSize:24,zIndex:1}}>📷</span>
          <span style={{fontSize:11,color:'var(--muted)',zIndex:1,textAlign:'center',lineHeight:1.4,whiteSpace:'pre-line'}}>{label}</span>
        </>}
        {status==='loading'&&<div style={{zIndex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          <div className="spinner" style={{borderTopColor:'var(--accent)',borderColor:'var(--border)'}}/>
          <span style={{fontSize:11,color:'var(--muted)'}}>Uploading…</span>
        </div>}
        <input ref={ref} type="file" accept="image/*"
          onClick={e=>e.stopPropagation()}
          onChange={handleFile}/>
      </div>
      {status==='ok'&&<div className="upload-status ok">✓ Photo saved</div>}
      {status==='err'&&<div className="upload-status err">⚠ Upload failed — photo visible this session only. Check storage settings.</div>}
    </div>
  );
}

// ── Wishlist multi-photo uploader ─────────────────────────────────────────────
function WishPhotoManager({ urls, onChange }) {
  const ref = useRef();
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    onChange([...urls, localUrl]); // immediate preview
    const uploaded = await sb.upload(file);
    if (uploaded) {
      onChange(prev => prev.map(u => u === localUrl ? uploaded : u));
    }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div style={{marginBottom:11}}>
      <label className="f-lbl">Photos</label>
      <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4}}>
        {urls.map((url,i)=>(
          <div key={i} style={{position:'relative',flexShrink:0}}>
            <div style={{width:72,height:72,borderRadius:8,overflow:'hidden',background:'#fff',border:'1.5px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <img src={url} alt="" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>
            </div>
            <button onClick={()=>onChange(urls.filter((_,j)=>j!==i))}
              style={{position:'absolute',top:-6,right:-6,width:18,height:18,borderRadius:'50%',background:'var(--red)',border:'none',color:'#fff',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>✕</button>
          </div>
        ))}
        <div style={{width:72,height:72,borderRadius:8,border:'2px dashed var(--border)',background:'var(--cream)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative',fontSize:uploading?11:22,color:'var(--muted)'}}>
          {uploading?'…':'＋'}
          <input ref={ref} type="file" accept="image/*"
            style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}}
            onClick={e=>e.stopPropagation()}
            onChange={handleFile}/>
        </div>
      </div>
    </div>
  );
}

// ── Wishlist photo viewer (swipe on phone, hover on desktop) ──────────────────
function WishPhotoViewer({ urls }) {
  const [idx, setIdx] = useState(0);
  const touchStart = useRef(null);

  if (!urls || urls.length === 0) {
    return <div style={{width:'100%',aspectRatio:'1/1',background:'var(--cream)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:44,opacity:.2,marginBottom:12}}>🛍️</div>;
  }

  function prev() { setIdx(i=>(i-1+urls.length)%urls.length); }
  function next() { setIdx(i=>(i+1)%urls.length); }

  function onTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    touchStart.current = null;
  }

  return (
    <div>
      <div className="wish-viewer"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <img className="wish-viewer-img" src={urls[idx]} alt=""/>
        {urls.length > 1 && <>
          <button className="wish-viewer-nav prev" onClick={e=>{e.stopPropagation();prev();}}>‹</button>
          <button className="wish-viewer-nav next" onClick={e=>{e.stopPropagation();next();}}>›</button>
        </>}
      </div>
      {urls.length > 1 && (
        <div className="wish-thumbs">
          {urls.map((url,i)=>(
            <div key={i} className={`wish-thumb${i===idx?' active':''}`}
              onClick={()=>setIdx(i)}
              onMouseEnter={()=>setIdx(i)}>
              <img src={url} alt=""/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function StarDisplay({rating,size=12,onClick}){return <div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(i=><span key={i} onClick={e=>{e.stopPropagation();onClick&&onClick(i);}} style={{fontSize:size,cursor:onClick?'pointer':'default',color:i<=rating?'#C9A050':'#DDD6CA',lineHeight:1}}>★</span>)}</div>;}
function Toggle({on,onToggle}){return <div onClick={e=>{e.stopPropagation();onToggle();}} style={{width:44,height:26,background:on?'#5A8A60':'#E0D9CF',borderRadius:13,position:'relative',cursor:'pointer',transition:'background .2s',flexShrink:0}}><div style={{position:'absolute',top:3,left:3,width:20,height:20,background:'#fff',borderRadius:'50%',transition:'transform .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)',transform:on?'translateX(18px)':'none'}}/></div>;}
function OccChips({selected,onChange}){return <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:4}}>{OCCASIONS.map(o=>{const c=OCC_C[o]||{bg:'#eee',b:'#aaa',t:'#333'};const sel=selected.includes(o);return <div key={o} onClick={()=>onChange(sel?selected.filter(x=>x!==o):[...selected,o])} style={{padding:'4px 10px',borderRadius:20,fontSize:11,border:`1.5px solid ${c.b}`,cursor:'pointer',background:sel?c.b:c.bg,color:sel?'#fff':c.t,fontFamily:"'Jost',sans-serif"}}>{o}</div>})}</div>;}
function StorePicker({value,onChange,stores,onAddStore}){const [open,setOpen]=useState(false);const [q,setQ]=useState(value||'');const ref=useRef();useEffect(()=>setQ(value||''),[value]);const filtered=stores.filter(s=>s.name.toLowerCase().includes(q.toLowerCase()));const exact=stores.some(s=>s.name.toLowerCase()===q.toLowerCase());function sel(name){onChange(name);setQ(name);setOpen(false);}useEffect(()=>{function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);return <div className="store-picker" ref={ref}><input className="f-inp" value={q} placeholder="Search or type store name…" onChange={e=>{setQ(e.target.value);onChange(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)}/>{open&&<div className="store-options">{filtered.slice(0,8).map(s=><div key={s.id} className="store-opt" onClick={()=>sel(s.name)}>{s.name}</div>)}{q&&!exact&&<div className="store-opt add-new" onClick={()=>{onAddStore(q);sel(q);}}>+ Add "{q}" to stores</div>}</div>}</div>;}
function Sheet({title,onClose,children,actions}){return <div className="overlay" onClick={onClose}><div className="sheet" onClick={e=>e.stopPropagation()}><div className="sheet-handle"/><div className="sheet-top"><div className="sheet-title">{title}</div><button className="sheet-close" onClick={onClose}>✕</button></div><div className="sheet-body">{children}</div>{actions&&<div className="sheet-actions">{actions}</div>}</div></div>;}
function BtnO({onClick,children}){return <button onClick={onClick} style={{flex:1,padding:12,border:'1.5px solid #E0D9CF',borderRadius:12,background:'none',fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif",color:'#1A1714'}}>{children}</button>;}
function BtnF({onClick,disabled,loading,children,color='#1A1714'}){return <button onClick={onClick} disabled={disabled||loading} style={{flex:1,padding:12,border:'none',borderRadius:12,background:color,color:'#fff',fontSize:13,cursor:disabled||loading?'default':'pointer',fontFamily:"'Jost',sans-serif",opacity:disabled||loading?.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading&&<div className="spinner"/>}{children}</button>;}
function FGrp({label,children,style={}}){return <div style={{marginBottom:11,...style}}><label className="f-lbl">{label}</label>{children}</div>;}
function FInp({value,onChange,placeholder='',type='text',style={}}){return <input type={type} value={value||''} onChange={onChange} placeholder={placeholder} className="f-inp" style={style}/>;}
function FSel({value,onChange,options,placeholder=''}){return <select value={value||''} onChange={onChange} className="f-inp f-sel">{placeholder&&<option value="">{placeholder}</option>}{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;}
function FRow({children}){return <div style={{display:'flex',gap:8}}>{children}</div>;}
function DetailRow({label,value}){if(!value&&value!==0)return null;return <div className="detail-row"><span style={{fontSize:11,color:'#8A837A',flexShrink:0}}>{label}</span><span style={{fontSize:12,fontWeight:500,color:'#1A1714',textAlign:'right'}}>{value}</span></div>;}

// ── Wardrobe fields ───────────────────────────────────────────────────────────
function WardrobeFields({d,up,stores,onAddStore}){
  const subcats=CATEGORY_MAP[d.category]||[];
  return <>
    <div style={{display:'flex',gap:12,marginBottom:14}}>
      <PhotoUploader photoUrl={d.photoUrl} onUrl={u=>up({photoUrl:u})} style={{flex:'0 0 110px',minHeight:146}}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
        <FGrp label="Name" style={{marginBottom:0}}><FInp value={d.name} placeholder="e.g. White linen shirt" onChange={e=>up({name:e.target.value})}/></FGrp>
        <FGrp label="Category" style={{marginBottom:0}}><FSel value={d.category} onChange={e=>up({category:e.target.value,subcategory:''})} options={Object.keys(CATEGORY_MAP)}/></FGrp>
        {subcats.length>0&&<FGrp label="Type" style={{marginBottom:0}}><FSel value={d.subcategory||''} onChange={e=>up({subcategory:e.target.value})} placeholder="Select type…" options={subcats}/></FGrp>}
      </div>
    </div>
    <FRow><FGrp label="Brand" style={{flex:1}}><FInp value={d.brand} placeholder="e.g. Levi's" onChange={e=>up({brand:e.target.value})}/></FGrp><FGrp label="Colour" style={{flex:1}}><FInp value={d.color} placeholder="Navy" onChange={e=>up({color:e.target.value})}/></FGrp></FRow>
    <FRow><FGrp label="Size" style={{flex:1}}><FInp value={d.size} placeholder="S / 10 / 27" onChange={e=>up({size:e.target.value,sizeLabel:e.target.value})}/></FGrp><FGrp label="Store" style={{flex:1}}><StorePicker value={d.store||''} onChange={v=>up({store:v})} stores={stores} onAddStore={onAddStore}/></FGrp></FRow>
    <DateField label="Date bought" value={d.dateBought} onChange={v=>up({dateBought:v})}/>
    <FGrp label="Notes"><FInp value={d.notes} placeholder="Fit, how it runs, where you wear it…" onChange={e=>up({notes:e.target.value})}/></FGrp>
    <FGrp label="Occasions"><OccChips selected={d.occasions||[]} onChange={o=>up({occasions:o})}/></FGrp>
  </>;
}

function AddWardrobeSheet({onSave,onClose,stores,onAddStore}){
  const [d,setD]=useState({name:'',category:'Tops',subcategory:'',brand:'',store:'',color:'',size:'',sizeLabel:'',photoUrl:null,occasions:[],dateBought:null,notes:''});
  const [saving,setSaving]=useState(false);const up=v=>setD(p=>({...p,...v}));
  async function save(photoOnly=false){setSaving(true);await onSave({...d,id:uid(),complete:!photoOnly&&!!(d.name&&d.category),sizeLabel:d.sizeLabel||d.size,name:d.name||'New item',lastWornDate:null,wearCount:0});setSaving(false);}
  return <Sheet title="Add item" onClose={onClose} actions={<><BtnO onClick={onClose}>Cancel</BtnO><BtnF onClick={()=>save()} loading={saving}>{d.name?'Add to wardrobe':'Save anyway'}</BtnF></>}>
    <WardrobeFields d={d} up={up} stores={stores} onAddStore={onAddStore}/>
    {d.photoUrl&&!d.name&&<div onClick={()=>save(true)} style={{fontSize:11,color:'var(--muted)',textDecoration:'underline',cursor:'pointer',textAlign:'center',padding:'8px 0'}}>Save photo only — I'll fill details in later</div>}
  </Sheet>;
}
function EditWardrobeSheet({item,onSave,onCancel,stores,onAddStore}){
  const [f,setF]=useState({...item});const [saving,setSaving]=useState(false);const up=v=>setF(p=>({...p,...v}));
  return <Sheet title="Edit item" onClose={onCancel} actions={<><BtnO onClick={onCancel}>Cancel</BtnO><BtnF onClick={async()=>{setSaving(true);await onSave(f);setSaving(false);}} loading={saving} color="#B07848">Save changes</BtnF></>}>
    <WardrobeFields d={f} up={up} stores={stores} onAddStore={onAddStore}/>
    <FRow><FGrp label="Total wears" style={{flex:1,marginTop:4}}><FInp value={f.wearCount} type="number" onChange={e=>up({wearCount:parseInt(e.target.value)||0})}/></FGrp><div style={{flex:1,marginTop:4}}><DateField label="Last worn" value={f.lastWornDate} onChange={v=>up({lastWornDate:v})}/></div></FRow>
  </Sheet>;
}
function WardrobeDetailSheet({item,onClose,onEdit,onLogWear,onDelete}){
  const [showLog,setShowLog]=useState(false);
  return <Sheet title={item.name||'Untitled'} onClose={onClose}>
    <div style={{width:'100%',aspectRatio:'1/1',maxHeight:260,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',borderRadius:14,marginBottom:14}}>
      {item.photoUrl?<img src={item.photoUrl} alt="" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>:<span style={{fontSize:52}}>{CAT_EMOJI[item.category]||'👗'}</span>}
    </div>
    {!item.complete&&<div style={{background:'var(--accent-bg)',borderRadius:10,padding:'9px 12px',marginBottom:12,border:'1px solid #DEC9AF',fontSize:12,color:'var(--accent)'}}>Some details are still missing — tap Edit to fill them in.</div>}
    <DetailRow label="Category" value={item.category}/><DetailRow label="Type" value={item.subcategory}/><DetailRow label="Brand" value={item.brand}/><DetailRow label="Store" value={item.store}/><DetailRow label="Colour" value={item.color}/><DetailRow label="Size" value={item.sizeLabel||item.size}/><DetailRow label="Date bought" value={formatDate(item.dateBought)}/><DetailRow label="Last worn" value={item.lastWornDate?`${formatDate(item.lastWornDate)} (${daysAgoLabel(item.lastWornDate)})`:'Never worn'}/><DetailRow label="Total wears" value={item.wearCount||0}/><DetailRow label="Occasions" value={(item.occasions||[]).join(', ')||null}/><DetailRow label="Notes" value={item.notes}/>
    <div style={{display:'flex',gap:8,marginTop:14}}>
      <button onClick={()=>setShowLog(true)} style={{flex:1,padding:12,background:'var(--green)',color:'#fff',border:'none',borderRadius:12,fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>+ Log wear</button>
      <button onClick={onEdit} style={{flex:1,padding:12,border:'1.5px solid var(--border)',borderRadius:12,background:'none',fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Edit</button>
      <button onClick={onDelete} style={{padding:'12px 14px',border:'1.5px solid #EAC8C8',borderRadius:12,background:'none',fontSize:13,cursor:'pointer',color:'var(--red)',fontFamily:"'Jost',sans-serif"}}>🗑</button>
    </div>
    {showLog&&<LogWearModal onLog={date=>onLogWear(item,date)} onClose={()=>setShowLog(false)}/>}
  </Sheet>;
}

// ── Wishlist fields ───────────────────────────────────────────────────────────
function WishFields({d,up,stores,onAddStore}){
  const [urlIn,setUrlIn]=useState(d.url||'');const [fetching,setFetching]=useState(false);
  const subcats=CATEGORY_MAP[d.category]||[];
  async function fetchUrl(){if(!urlIn.trim())return;setFetching(true);await new Promise(r=>setTimeout(r,700));let sn='';try{sn=new URL(urlIn).hostname.replace('www.','').split('.')[0];}catch{}sn=sn?sn.charAt(0).toUpperCase()+sn.slice(1):'';up({url:urlIn,store:d.store||sn,name:d.name||`Item from ${sn}`});setFetching(false);}
  return <>
    <WishPhotoManager urls={d.photoUrls||[]} onChange={urls=>up({photoUrls:urls})}/>
    <FGrp label="Paste a link (optional)">
      <div style={{display:'flex',gap:6}}><FInp value={urlIn} placeholder="https://zara.com/product/…" onChange={e=>{setUrlIn(e.target.value);up({url:e.target.value});}} style={{flex:1}}/><button onClick={fetchUrl} disabled={fetching||!urlIn} style={{padding:'10px 14px',background:'var(--ink)',color:'#fff',border:'none',borderRadius:10,fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif",opacity:fetching||!urlIn?.5:1,flexShrink:0,display:'flex',alignItems:'center',gap:6}}>{fetching?<><div className="spinner"/>Fetching</>:'Fetch'}</button></div>
    </FGrp>
    <div style={{display:'flex',gap:8}}>
      <FGrp label="Item name" style={{flex:1}}><FInp value={d.name} placeholder="e.g. Barrel leg jeans" onChange={e=>up({name:e.target.value})}/></FGrp>
    </div>
    <FRow><FGrp label="Category" style={{flex:1}}><FSel value={d.category} onChange={e=>up({category:e.target.value,subcategory:''})} options={Object.keys(CATEGORY_MAP)}/></FGrp>{subcats.length>0&&<FGrp label="Type" style={{flex:1}}><FSel value={d.subcategory||''} onChange={e=>up({subcategory:e.target.value})} placeholder="Select type…" options={subcats}/></FGrp>}</FRow>
    <FRow><FGrp label="Store" style={{flex:1}}><StorePicker value={d.store||''} onChange={v=>up({store:v})} stores={stores} onAddStore={onAddStore}/></FGrp><FGrp label="Colour" style={{flex:1}}><FInp value={d.color} placeholder="Black" onChange={e=>up({color:e.target.value})}/></FGrp></FRow>
    <FRow><FGrp label="Price (A$)" style={{flex:1}}><FInp value={d.price} placeholder="89.95" type="number" onChange={e=>up({price:e.target.value})}/></FGrp>{d.onSale&&<FGrp label="Original (A$)" style={{flex:1}}><FInp value={d.origPrice} placeholder="119.95" type="number" onChange={e=>up({origPrice:e.target.value})}/></FGrp>}</FRow>
    <div className="toggle-row"><div><div style={{fontSize:13,color:'var(--ink)'}}>On sale</div><div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>Toggle on if this is a sale price</div></div><Toggle on={d.onSale} onToggle={()=>up({onSale:!d.onSale,origPrice:''})}/></div>
    <FGrp label="How much do you need this? (1 = nice to have · 5 = genuinely need)" style={{marginTop:12}}>
      <div style={{display:'flex',gap:4,marginTop:4}}>{[1,2,3,4,5].map(i=><span key={i} onClick={()=>up({rating:i})} style={{fontSize:28,cursor:'pointer',color:i<=d.rating?'#C9A050':'#DDD6CA',lineHeight:1}}>★</span>)}</div>
      <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>{NEED_LBL[d.rating||3]}</div>
    </FGrp>
    <FGrp label="Notes"><FInp value={d.notes} placeholder="Why you want it, what you'd wear it with…" onChange={e=>up({notes:e.target.value})}/></FGrp>
  </>;
}

function AddWishSheet({onSave,onClose,stores,onAddStore}){
  const [d,setD]=useState({name:'',store:'',brand:'',url:'',price:'',origPrice:'',onSale:false,rating:3,photoUrls:[],notes:'',category:'Tops',subcategory:'',color:''});
  const [saving,setSaving]=useState(false);const up=v=>setD(p=>({...p,...v}));
  return <Sheet title="Add to wishlist" onClose={onClose} actions={<><BtnO onClick={onClose}>Cancel</BtnO><BtnF onClick={async()=>{setSaving(true);await onSave({...d,id:uid(),addedDate:today2()});setSaving(false);}} disabled={!d.name} loading={saving} color="#B07848">Add to wishlist</BtnF></>}>
    <WishFields d={d} up={up} stores={stores} onAddStore={onAddStore}/>
  </Sheet>;
}
function EditWishSheet({item,onSave,onCancel,stores,onAddStore}){
  const [f,setF]=useState({...item,photoUrls:item.photoUrls||[]});const [saving,setSaving]=useState(false);const up=v=>setF(p=>({...p,...v}));
  return <Sheet title="Edit wishlist item" onClose={onCancel} actions={<><BtnO onClick={onCancel}>Cancel</BtnO><BtnF onClick={async()=>{setSaving(true);await onSave(f);setSaving(false);}} loading={saving} color="#B07848">Save changes</BtnF></>}>
    <WishFields d={f} up={up} stores={stores} onAddStore={onAddStore}/>
  </Sheet>;
}
function WishDetailSheet({item,similar,onClose,onEdit,onDelete,onRate,onMoveToWardrobe}){
  return <Sheet title={item.name} onClose={onClose}>
    <WishPhotoViewer urls={item.photoUrls||[]}/>
    {similar.length>0&&<div style={{background:'var(--accent-bg)',borderRadius:10,padding:'9px 12px',marginBottom:12,border:'1px solid #DEC9AF',fontSize:12,color:'var(--accent)'}}>⚠️ You own something similar — {similar.map(s=>s.name).join(', ')}</div>}
    <div style={{marginBottom:12}}><div style={{fontSize:10,color:'var(--muted)',letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>How much do you need this</div><StarDisplay rating={item.rating||3} size={24} onClick={onRate}/><div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>{NEED_LBL[item.rating||3]}</div></div>
    <DetailRow label="Store" value={item.store}/><DetailRow label="Brand" value={item.brand}/><DetailRow label="Category" value={item.category}/><DetailRow label="Colour" value={item.color}/><DetailRow label="Price" value={item.price?`A$${item.price}${item.onSale?' (sale)':''}`:null}/><DetailRow label="Original price" value={item.onSale&&item.origPrice?`A$${item.origPrice}`:null}/><DetailRow label="Added" value={item.addedDate}/><DetailRow label="Notes" value={item.notes}/>
    {item.url&&<div onClick={()=>window.open(item.url,'_blank')} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 13px',background:'var(--cream)',borderRadius:10,marginTop:10,cursor:'pointer',border:'1px solid var(--border)'}}><span>🔗</span><span style={{fontSize:11,color:'var(--accent)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.url}</span><span style={{fontSize:11,color:'var(--muted)'}}>↗</span></div>}
    <div style={{display:'flex',gap:8,marginTop:14}}>
      <button onClick={onMoveToWardrobe} style={{flex:1,padding:12,background:'var(--accent)',color:'#fff',border:'none',borderRadius:12,fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>✓ I bought it</button>
      <button onClick={onEdit} style={{flex:1,padding:12,border:'1.5px solid var(--border)',borderRadius:12,background:'none',fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Edit</button>
      <button onClick={onDelete} style={{padding:'12px 14px',border:'1.5px solid #EAC8C8',borderRadius:12,background:'none',fontSize:13,cursor:'pointer',color:'var(--red)',fontFamily:"'Jost',sans-serif"}}>🗑</button>
    </div>
  </Sheet>;
}

// ── Outfit components ─────────────────────────────────────────────────────────
function OutfitThumbnail({items}){
  const n=items.length;
  const ph=(item)=><div className="ph">{item?.photoUrl?<img src={item.photoUrl} alt=""/>:<div className="ph-empty">{CAT_EMOJI[item?.category]||'✦'}</div>}</div>;
  if(n===0)return <div style={{padding:'24px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,opacity:.15}}>✦</div>;
  if(n===1)return <div className="outfit-photos single">{items[0].photoUrl?<img src={items[0].photoUrl} alt=""/>:<div style={{aspectRatio:'3/4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:48,opacity:.2}}>{CAT_EMOJI[items[0].category]||'✦'}</div>}</div>;
  if(n===2)return <div className="outfit-photos two">{items.map((it,i)=>ph(it))}</div>;
  if(n===3)return <div className="outfit-photos three">{items.map((it,i)=>ph(it))}</div>;
  return <div className="outfit-photos four">{items.slice(0,4).map((it,i)=>ph(it))}</div>;
}

function FreeformCanvas({items,positions,onPositionsChange}){
  const canvasRef=useRef();const dragging=useRef(null);
  const [pos,setPos]=useState(()=>{const p={};items.forEach((item,i)=>{p[item.id]=positions?.[item.id]||{x:20+(i%3)*100,y:20+Math.floor(i/3)*130};});return p;});
  function getXY(e){const rect=canvasRef.current.getBoundingClientRect();if(e.touches)return{x:e.touches[0].clientX-rect.left,y:e.touches[0].clientY-rect.top};return{x:e.clientX-rect.left,y:e.clientY-rect.top};}
  function onStart(e,id){e.preventDefault();const{x,y}=getXY(e);dragging.current={id,ox:x-(pos[id]?.x||0),oy:y-(pos[id]?.y||0)};}
  function onMove(e){if(!dragging.current)return;e.preventDefault();const{x,y}=getXY(e);const c=canvasRef.current;const nx=Math.max(0,Math.min(c.clientWidth-88,x-dragging.current.ox));const ny=Math.max(0,Math.min(c.clientHeight-108,y-dragging.current.oy));setPos(p=>({...p,[dragging.current.id]:{x:nx,y:ny}}));}
  function onEnd(){if(dragging.current){onPositionsChange(pos);dragging.current=null;}}
  return <div ref={canvasRef} className="freeform-canvas" onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd} onTouchMove={onMove} onTouchEnd={onEnd}>
    {items.map(item=><div key={item.id} className="freeform-item" style={{left:pos[item.id]?.x||0,top:pos[item.id]?.y||0}} onMouseDown={e=>onStart(e,item.id)} onTouchStart={e=>onStart(e,item.id)}>
      {item.photoUrl?<img src={item.photoUrl} alt={item.name} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<span style={{fontSize:28,opacity:.35}}>{CAT_EMOJI[item.category]||'👗'}</span>}
      <div className="fi-label">{item.name?.split(' ')[0]}</div>
    </div>)}
  </div>;
}

function ItemPickerSheet({wardrobe,currentId,slotLabel,onPick,onClose}){
  const [cat,setCat]=useState('All');const [q,setQ]=useState('');
  const filtered=wardrobe.filter(i=>{const mc=cat==='All'||i.category===cat;const ms=!q||[i.name,i.brand,i.color].some(s=>(s||'').toLowerCase().includes(q.toLowerCase()));return mc&&ms;});
  return <Sheet title={`Pick ${slotLabel}`} onClose={onClose}>
    <div style={{marginBottom:10}}><input className="f-inp" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/></div>
    <div className="filterrow" style={{padding:'0 0 8px'}}>{CATS.map(c=><button key={c} className={`chip${cat===c?' active':''}`} onClick={()=>setCat(c)} style={{fontSize:11,padding:'4px 10px'}}>{c}</button>)}</div>
    <div className="picker-grid">{filtered.map(item=><div key={item.id} className={`picker-item${currentId===item.id?' sel':''}`} onClick={()=>onPick(item)}><div className="picker-thumb">{item.photoUrl?<img src={item.photoUrl} alt={item.name}/>:<span style={{fontSize:22,opacity:.3}}>{CAT_EMOJI[item.category]||'👗'}</span>}</div><div className="picker-name">{item.name}</div></div>)}{filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:'24px 0',fontSize:12,color:'var(--muted)'}}>No items found</div>}</div>
  </Sheet>;
}

function OutfitBuilderSheet({wardrobe,outfit,onSave,onClose}){
  const isNew=!outfit;
  const [name,setName]=useState(outfit?.name||'');const [occasion,setOcc]=useState(outfit?.occasion||'');const [notes,setNotes]=useState(outfit?.notes||'');
  const [slots,setSlots]=useState(()=>{const s={Top:null,Bottom:null,Shoes:null,Bag:null,Outer:null};if(outfit?.itemIds){outfit.itemIds.forEach(id=>{const item=wardrobe.find(w=>w.id===id);if(!item)return;const cat=item.category;if(cat==='Tops'||cat==='Dresses'||cat==='Activewear')s.Top=s.Top||item;else if(cat==='Bottoms')s.Bottom=item;else if(cat==='Shoes')s.Shoes=item;else if(cat==='Bags'||cat==='Accessories')s.Bag=item;else if(cat==='Outerwear')s.Outer=item;});}return s;});
  const [mode,setMode]=useState('structured');const [positions,setPositions]=useState(outfit?.positions||null);const [picker,setPicker]=useState(null);const [saving,setSaving]=useState(false);
  const slotItems=Object.values(slots).filter(Boolean);const itemIds=slotItems.map(i=>i.id);
  async function save(){setSaving(true);await onSave({id:outfit?.id||uid(),name:name||'My outfit',occasion,notes,itemIds,positions:mode==='freeform'?positions:null,wearCount:outfit?.wearCount||0,lastWornDate:outfit?.lastWornDate||null});setSaving(false);}
  const SC=[{key:'Top',label:'Top / Dress'},{key:'Outer',label:'Outer layer'},{key:'Bottom',label:'Bottom'},{key:'Shoes',label:'Shoes'},{key:'Bag',label:'Bag / Acc.'}];
  return <Sheet title={isNew?'New outfit':'Edit outfit'} onClose={onClose} actions={<><BtnO onClick={onClose}>Cancel</BtnO><BtnF onClick={save} loading={saving} color="#B07848">{isNew?'Save outfit':'Save changes'}</BtnF></>}>
    <FGrp label="Outfit name"><FInp value={name} placeholder="e.g. Casual Friday" onChange={e=>setName(e.target.value)}/></FGrp>
    <FGrp label="Occasion"><FSel value={occasion} onChange={e=>setOcc(e.target.value)} placeholder="Any occasion" options={OCCASIONS}/></FGrp>
    <div className="mode-toggle"><button className={`mode-btn${mode==='structured'?' active':''}`} onClick={()=>setMode('structured')}>Structured</button><button className={`mode-btn${mode==='freeform'?' active':''}`} onClick={()=>setMode('freeform')}>Freeform drag</button></div>
    {mode==='structured'?<div className="builder-stage">{SC.map(({key,label})=>{const item=slots[key];return <div key={key} className="slot-row"><span className="slot-label">{label}</span>{item?<div className="slot-item"><div className="slot-thumb">{item.photoUrl?<img src={item.photoUrl} alt={item.name}/>:<span style={{fontSize:18,opacity:.4}}>{CAT_EMOJI[item.category]||'👗'}</span>}</div><span className="slot-name" onClick={()=>setPicker({slot:key,label})}>{item.name}</span><button className="slot-remove" onClick={()=>setSlots(p=>({...p,[key]:null}))}>✕</button></div>:<div className="slot-item empty" onClick={()=>setPicker({slot:key,label})}>+ Add {label.toLowerCase()}</div>}</div>;})}</div>
    :<div className="builder-stage"><div style={{fontSize:11,color:'var(--muted)',marginBottom:8,textAlign:'center'}}>Drag items to arrange your flat-lay</div>{slotItems.length===0?<div style={{textAlign:'center',padding:'32px 0',color:'var(--muted)',fontSize:12}}>Add items in Structured mode first</div>:<FreeformCanvas items={slotItems} positions={positions} onPositionsChange={setPositions}/>}</div>}
    <FGrp label="Notes" style={{marginTop:4}}><FInp value={notes} placeholder="What you love about this combo…" onChange={e=>setNotes(e.target.value)}/></FGrp>
    {picker&&<ItemPickerSheet wardrobe={wardrobe} currentId={slots[picker.slot]?.id} slotLabel={picker.label} onPick={item=>{setSlots(p=>({...p,[picker.slot]:item}));setPicker(null);}} onClose={()=>setPicker(null)}/>}
  </Sheet>;
}

function OutfitDetailSheet({outfit,wardrobe,onClose,onEdit,onDelete,onMarkWorn}){
  const [showLog,setShowLog]=useState(false);
  const items=outfit.itemIds.map(id=>wardrobe.find(w=>w.id===id)).filter(Boolean);
  const [freeform,setFreeform]=useState(!!outfit.positions);
  return <Sheet title={outfit.name} onClose={onClose}>
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'flex-end',gap:6,marginBottom:8}}>
        <button onClick={()=>setFreeform(false)} style={{fontSize:11,padding:'4px 10px',borderRadius:6,border:'1.5px solid var(--border)',background:!freeform?'var(--ink)':'#fff',color:!freeform?'#fff':'var(--muted)',cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Grid</button>
        {outfit.positions&&<button onClick={()=>setFreeform(true)} style={{fontSize:11,padding:'4px 10px',borderRadius:6,border:'1.5px solid var(--border)',background:freeform?'var(--ink)':'#fff',color:freeform?'#fff':'var(--muted)',cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Flat-lay</button>}
      </div>
      {freeform&&outfit.positions?<FreeformCanvas items={items} positions={outfit.positions} onPositionsChange={()=>{}}/>
      :<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>{items.map(item=><div key={item.id} style={{borderRadius:10,overflow:'hidden',background:'#fff',aspectRatio:'1/1',display:'flex',alignItems:'center',justifyContent:'center'}}>{item.photoUrl?<img src={item.photoUrl} alt={item.name} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>:<span style={{fontSize:28,opacity:.3}}>{CAT_EMOJI[item.category]||'👗'}</span>}</div>)}</div>}
    </div>
    <DetailRow label="Occasion" value={outfit.occasion}/><DetailRow label="Last worn" value={outfit.lastWornDate?`${formatDate(outfit.lastWornDate)} (${daysAgoLabel(outfit.lastWornDate)})`:'Never worn'}/><DetailRow label="Times worn" value={outfit.wearCount||0}/><DetailRow label="Notes" value={outfit.notes}/>
    <div style={{marginTop:12}}><div style={{fontSize:10,letterSpacing:1,textTransform:'uppercase',color:'var(--muted)',marginBottom:8}}>Items in this outfit</div>
      {items.map(item=><div key={item.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:32,height:32,borderRadius:6,background:'#fff',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'1px solid var(--border)'}}>{item.photoUrl?<img src={item.photoUrl} alt="" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>:<span style={{fontSize:14,opacity:.3}}>{CAT_EMOJI[item.category]||'👗'}</span>}</div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{item.store||item.brand||item.category}</div></div>
        <div style={{fontSize:10,color:'var(--muted)',flexShrink:0}}>{daysAgoLabel(item.lastWornDate)}</div>
      </div>)}
    </div>
    <div style={{display:'flex',gap:8,marginTop:14}}>
      <button onClick={()=>setShowLog(true)} style={{flex:1,padding:12,background:'var(--green)',color:'#fff',border:'none',borderRadius:12,fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>+ Log wear</button>
      <button onClick={onEdit} style={{flex:1,padding:12,border:'1.5px solid var(--border)',borderRadius:12,background:'none',fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Edit</button>
      <button onClick={onDelete} style={{padding:'12px 14px',border:'1.5px solid #EAC8C8',borderRadius:12,background:'none',fontSize:13,cursor:'pointer',color:'var(--red)',fontFamily:"'Jost',sans-serif"}}>🗑</button>
    </div>
    {showLog&&<LogWearModal onLog={date=>onMarkWorn(outfit,date)} onClose={()=>setShowLog(false)}/>}
  </Sheet>;
}

// ── Cards ─────────────────────────────────────────────────────────────────────
function WardrobeCard({item,onClick}){
  return <div className={`icard${!item.complete?' incomplete':''}`} onClick={onClick}>
    <div className="iphoto">
      {item.photoUrl?<img src={item.photoUrl} alt={item.name}/>:<div className="no-photo"><span style={{fontSize:22,opacity:.3}}>{CAT_EMOJI[item.category]||'👗'}</span><span style={{fontSize:9,color:'var(--muted)',marginTop:2}}>{item.subcategory||item.category}</span></div>}
      {!item.complete&&<span className="badge-warn">needs info</span>}
      {item.lastWornDate&&<span className="badge-worn">{daysAgoLabel(item.lastWornDate)}</span>}
    </div>
    <div className="iinfo"><div className="iname">{item.name||'Untitled'}</div><div className="imeta">{item.brand||item.store||item.color||'—'}</div>{item.size&&<div className="isize">{item.sizeLabel||item.size}</div>}</div>
  </div>;
}

function WishCard({item,similar,onRate,onClick}){
  const urls = item.photoUrls||[];
  const firstUrl = urls[0]||null;
  return <div className="wcard" onClick={onClick}>
    <div className="wimg">
      {firstUrl?<img src={firstUrl} alt={item.name}/>:<div className="no-photo">{CAT_EMOJI[item.category]||'🛍️'}</div>}
      {urls.length>1&&<div className="photo-count">+{urls.length-1}</div>}
    </div>
    <div style={{padding:'8px 10px 10px'}}>
      <div style={{fontSize:11,fontWeight:500,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:2}}>{item.name}</div>
      <div style={{fontSize:10,color:'var(--muted)'}}>{item.store||item.brand||'—'}</div>
      <div style={{display:'flex',alignItems:'center',gap:5,marginTop:3}}>{item.price&&<span style={{fontSize:12,fontWeight:500,color:item.onSale?'var(--red)':'var(--ink)'}}>A${item.price}</span>}{item.onSale&&item.origPrice&&<span style={{fontSize:10,color:'var(--muted)',textDecoration:'line-through'}}>A${item.origPrice}</span>}</div>
      <div onClick={e=>e.stopPropagation()} style={{marginTop:3}}><StarDisplay rating={item.rating||3} size={11} onClick={onRate}/></div>
      {similar.length>0&&<div className="simflag">⚠️ Similar item owned</div>}
    </div>
  </div>;
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App(){
  const [tab,setTab]        = useState('wardrobe');
  const [wardrobe,setW]     = useState([]);
  const [wishlist,setWL]    = useState([]);
  const [outfits,setO]      = useState([]);
  const [stores,setStores]  = useState([]);
  const [loading,setLoading]= useState(true);
  const [catFilter,setCat]  = useState('All');
  const [wlFilter,setWlF]   = useState('All');
  const [search,setSearch]  = useState('');
  const [openStore,setOS]   = useState(null);
  const [askQ,setAskQ]      = useState('');
  const [askResult,setAR]   = useState(null);
  const [showAddW,setShowAddW]    = useState(false);
  const [showAddWL,setShowAddWL]  = useState(false);
  const [showAddO,setShowAddO]    = useState(false);
  const [selItem,setSelItem]      = useState(null);
  const [selWish,setSelWish]      = useState(null);
  const [selOutfit,setSelOutfit]  = useState(null);
  const [editItem,setEditItem]    = useState(false);
  const [editWish,setEditWish]    = useState(false);
  const [editOutfit,setEditOutfit]= useState(false);

  useEffect(()=>{
    async function load(){
      try{
        const [wr,wlr,or,sr]=await Promise.all([sb.get('wardrobe'),sb.get('wishlist'),sb.get('outfits'),sb.get('stores')]);
        setW(wr.map(fromRow));setWL(wlr.map(fromWR));setO(or.map(fromOR));setStores(sr);
      }catch(e){console.error(e);}
      setLoading(false);
    }
    load();
  },[]);

  async function addStore(n){const s={id:uid(),name:n,country:'AU'};try{await sb.ins('stores',s);setStores(p=>[...p,s]);}catch(e){console.error(e);}}

  async function addItem(i){try{await sb.ins('wardrobe',toRow(i));setW(p=>[...p,i]);}catch(e){console.error(e);}setShowAddW(false);}
  async function saveItem(i){const complete=!!(i.name&&i.category&&(i.size||i.brand));const u={...i,complete};try{await sb.upd('wardrobe',i.id,toRow(u));setW(p=>p.map(x=>x.id===i.id?u:x));setSelItem(u);}catch(e){console.error(e);}setEditItem(false);}
  async function delItem(id){try{await sb.del('wardrobe',id);setW(p=>p.filter(x=>x.id!==id));}catch(e){console.error(e);}setSelItem(null);}
  async function logWear(item,date){const u={...item,lastWornDate:date,wearCount:(item.wearCount||0)+1};try{await sb.upd('wardrobe',item.id,{last_worn_date:date,wear_count:u.wearCount});setW(p=>p.map(x=>x.id===item.id?u:x));setSelItem(u);}catch(e){console.error(e);}}

  async function addWish(i){try{await sb.ins('wishlist',toWR(i));setWL(p=>[...p,i]);}catch(e){console.error(e);}setShowAddWL(false);}
  async function saveWish(i){try{await sb.upd('wishlist',i.id,toWR(i));setWL(p=>p.map(x=>x.id===i.id?i:x));setSelWish(i);}catch(e){console.error(e);}setEditWish(false);}
  async function delWish(id){try{await sb.del('wishlist',id);setWL(p=>p.filter(x=>x.id!==id));}catch(e){console.error(e);}setSelWish(null);}
  async function rateWish(id,r){try{await sb.upd('wishlist',id,{rating:r});}catch(e){console.error(e);}setWL(p=>p.map(x=>x.id===id?{...x,rating:r}:x));setSelWish(p=>p?{...p,rating:r}:p);}
  async function bought(w){const item={...w,id:uid(),lastWornDate:null,wearCount:0,complete:false,dateBought:null,notes:`From wishlist. ${w.notes||''}`.trim()};await addItem(item);await delWish(w.id);}

  async function saveOutfit(o){const row=toOR(o);try{if(outfits.find(x=>x.id===o.id)){await sb.upd('outfits',o.id,row);setO(p=>p.map(x=>x.id===o.id?o:x));setSelOutfit(o);}else{await sb.ins('outfits',row);setO(p=>[...p,o]);}}catch(e){console.error(e);}setShowAddO(false);setEditOutfit(false);}
  async function delOutfit(id){try{await sb.del('outfits',id);setO(p=>p.filter(x=>x.id!==id));}catch(e){console.error(e);}setSelOutfit(null);}
  async function logOutfitWear(outfit,date){
    const u={...outfit,lastWornDate:date,wearCount:(outfit.wearCount||0)+1};
    try{await sb.upd('outfits',outfit.id,{last_worn_date:date,wear_count:u.wearCount});setO(p=>p.map(x=>x.id===outfit.id?u:x));setSelOutfit(u);}catch(e){console.error(e);}
    for(const id of outfit.itemIds){const item=wardrobe.find(w=>w.id===id);if(!item)continue;const ui={...item,lastWornDate:date,wearCount:(item.wearCount||0)+1};try{await sb.upd('wardrobe',id,{last_worn_date:date,wear_count:ui.wearCount});setW(p=>p.map(x=>x.id===id?ui:x));}catch(e){console.error(e);}}
  }

  const fW=wardrobe.filter(i=>{const mc=catFilter==='All'||i.category===catFilter;const q=search.toLowerCase();return mc&&(!q||[i.name,i.brand,i.color,i.store,i.category,i.subcategory].some(s=>(s||'').toLowerCase().includes(q)));});
  const fWL=wishlist.filter(i=>(wlFilter==='All'||i.category===wlFilter)&&(!search||(i.name||'').toLowerCase().includes(search.toLowerCase())||(i.store||'').toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>(b.rating||3)-(a.rating||3));
  const incomplete=wardrobe.filter(i=>!i.complete);
  const unworn=wardrobe.filter(i=>i.complete&&isOverdue(i.lastWornDate)).sort((a,b)=>{const da=a.lastWornDate?new Date(a.lastWornDate):new Date(0);const db=b.lastWornDate?new Date(b.lastWornDate):new Date(0);return da-db;});

  const ASK_SUGG=["What size are my Levi's jeans?","What Zara size do I wear?","Do I have anything black?","When did I last wear my coat?","What Cotton On size am I?"];
  function handleAsk(q){const query=(q||askQ).toLowerCase().trim();if(!query)return;const words=query.split(' ').filter(w=>w.length>3);const match=wardrobe.find(i=>words.some(w=>[i.name,i.brand,i.color,i.store,i.category,i.subcategory].some(s=>(s||'').toLowerCase().includes(w))));if(match){const guide=SIZE_GUIDES.find(g=>g.store.toLowerCase()===(match.store||'').toLowerCase());const sRow=guide?.sizes.find(s=>s.l===match.size);setAR({item:match,guide,sRow,query:q||askQ});}else{setAR({notFound:true,query:q||askQ});}setAskQ('');}

  const tabTitle={wardrobe:'Wardrobe',outfits:'Outfits',wishlist:'Wishlist',stats:'Stats',sizes:'Size guides',ask:'Ask closet'};

  if(loading)return<><style>{CSS}</style><div style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--cream)',flexDirection:'column',gap:12}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:300,letterSpacing:4}}>closet</div><div style={{fontSize:12,color:'var(--muted)'}}>Loading your wardrobe…</div></div></>;

  return<><style>{CSS}</style>
  <div className="app"><div className="app-inner">
    <div className="sidebar">
      <div className="sidebar-logo">closet</div>
      <nav style={{display:'flex',flexDirection:'column',flex:1}}>{NAV.map(n=><button key={n.key} className={`sidebar-item${tab===n.key?' active':''}`} onClick={()=>setTab(n.key)}>{n.label}</button>)}</nav>
      <div style={{padding:'16px 28px',fontSize:10,color:'rgba(255,255,255,.2)'}}>Your wardrobe, organised.</div>
    </div>
    <div className="content-area">
      <div className="topbar">
        <div className="topbar-logo">closet</div>
        <div className="topbar-title">{tabTitle[tab]}</div>
        {(tab==='wardrobe'||tab==='wishlist')&&<div className="searchbox"><span style={{fontSize:13,color:'var(--muted)'}}>⌕</span><input placeholder={tab==='wardrobe'?'Search items, brands, colours…':'Search wishlist…'} value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<span onClick={()=>setSearch('')} style={{cursor:'pointer',color:'var(--muted)',fontSize:12}}>✕</span>}</div>}
        {tab==='wardrobe'&&<button className="iconbtn" onClick={()=>setShowAddW(true)}>+</button>}
        {tab==='outfits'&&<button className="iconbtn" onClick={()=>setShowAddO(true)}>+</button>}
        {tab==='wishlist'&&<button className="iconbtn" onClick={()=>setShowAddWL(true)}>+</button>}
      </div>
      <div className="scroll">

        {tab==='wardrobe'&&<>
          <div className="filterrow">{CATS.map(c=><button key={c} className={`chip${catFilter===c?' active':''}`} onClick={()=>setCat(c)}>{c}</button>)}</div>
          {incomplete.length>0&&<div className="banner"><span>📋</span><div><div style={{fontSize:12,fontWeight:500,color:'var(--ink)'}}>{incomplete.length} item{incomplete.length>1?'s':''} need details</div><div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>Tap to fill in store, size and colour whenever you have time</div></div></div>}
          {fW.length===0?<div className="empty"><div style={{fontSize:40,marginBottom:10}}>🧺</div><div className="empty-t">Your wardrobe is empty</div><div className="empty-s">Tap + to add your first item.</div></div>
          :<>{fW.some(i=>!i.complete)&&<><div className="seclbl">Needs info</div><div className="grid">{fW.filter(i=>!i.complete).map(i=><WardrobeCard key={i.id} item={i} onClick={()=>{setSelItem(i);setEditItem(false);}}/>)}</div></>}{fW.some(i=>i.complete)&&<><div className="seclbl">{catFilter==='All'?'All items':catFilter} · {fW.filter(i=>i.complete).length}</div><div className="grid">{fW.filter(i=>i.complete).map(i=><WardrobeCard key={i.id} item={i} onClick={()=>{setSelItem(i);setEditItem(false);}}/>)}</div></>}</>}
        </>}

        {tab==='outfits'&&<>
          {outfits.length===0?<div className="empty"><div style={{fontSize:40,marginBottom:10}}>✦</div><div className="empty-t">No saved outfits yet</div><div className="empty-s">Tap + to build your first outfit.</div></div>
          :<><div className="seclbl" style={{paddingTop:10}}>Saved outfits · {outfits.length}</div>
          <div className="outfit-masonry">{outfits.map(outfit=>{const items=outfit.itemIds.map(id=>wardrobe.find(w=>w.id===id)).filter(Boolean);return<div key={outfit.id} className="outfit-card" onClick={()=>{setSelOutfit(outfit);setEditOutfit(false);}}><OutfitThumbnail items={items}/><div className="outfit-info"><div className="outfit-name">{outfit.name}</div><div className="outfit-meta">{items.length} piece{items.length!==1?'s':''}{outfit.occasion?` · ${outfit.occasion}`:''}{outfit.lastWornDate?` · ${daysAgoLabel(outfit.lastWornDate)}`:' · Never worn'}</div></div></div>;})}</div></>}
        </>}

        {tab==='wishlist'&&<>
          <div className="filterrow">{['All',...Object.keys(CATEGORY_MAP)].map(c=><button key={c} className={`chip${wlFilter===c?' active':''}`} onClick={()=>setWlF(c)}>{c}</button>)}</div>
          {fWL.length===0?<div className="empty"><div style={{fontSize:40,marginBottom:10}}>🛍️</div><div className="empty-t">Nothing on the wishlist yet</div><div className="empty-s">Tap + to add items.</div></div>
          :<div className="wish-grid">{fWL.map(i=><WishCard key={i.id} item={i} similar={findSimilar(i,wardrobe)} onRate={r=>rateWish(i.id,r)} onClick={()=>{setSelWish(i);setEditWish(false);}}/>)}</div>}
        </>}

        {tab==='stats'&&<>
          <div className="stat-grid">{[{n:wardrobe.filter(i=>i.complete).length,l:'Items in wardrobe'},{n:outfits.length,l:'Saved outfits'},{n:wishlist.length,l:'On wishlist'},{n:unworn.length,l:'Unworn 30+ days'}].map(s=><div key={s.l} className="stat-card"><div className="stat-n">{s.n}</div><div className="stat-l">{s.l}</div></div>)}</div>
          <div className="seclbl" style={{marginTop:6}}>By category</div>
          <div style={{padding:'0 16px 14px'}}>{Object.keys(CATEGORY_MAP).map(cat=>{const count=wardrobe.filter(i=>i.category===cat).length;if(!count)return null;const pct=Math.round(count/Math.max(wardrobe.length,1)*100);return<div key={cat} style={{display:'flex',alignItems:'center',gap:10,background:'#fff',borderRadius:10,padding:'9px 12px',border:'1px solid var(--border)',marginBottom:6}}><span style={{fontSize:16,width:24,textAlign:'center'}}>{CAT_EMOJI[cat]}</span><span style={{fontSize:12,fontWeight:500,width:100,flexShrink:0}}>{cat}</span><div style={{flex:1,height:3,background:'var(--border)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',background:'var(--accent)',width:`${pct}%`,borderRadius:2}}/></div><span style={{fontSize:11,color:'var(--muted)',width:24,textAlign:'right',flexShrink:0}}>{count}</span></div>;})}
          </div>
          {unworn.length>0&&<><div className="seclbl">Consider rewearing</div><div style={{display:'flex',flexDirection:'column',gap:7,padding:'0 16px 24px'}}>{unworn.slice(0,6).map(i=><div key={i.id} onClick={()=>{setSelItem(i);setEditItem(false);setTab('wardrobe');}} style={{display:'flex',alignItems:'center',gap:10,background:'#fff',borderRadius:12,padding:'10px 13px',border:'1px solid var(--border)',cursor:'pointer'}}><div style={{width:36,height:36,borderRadius:6,background:'#fff',flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,border:'1px solid var(--border)'}}>{i.photoUrl?<img src={i.photoUrl} alt="" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>:CAT_EMOJI[i.category]}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.name}</div><div style={{fontSize:10,color:'var(--red)',marginTop:1}}>{i.lastWornDate?`Last worn ${formatDate(i.lastWornDate)}`:'Never worn'} · {i.wearCount||0} wears</div></div><span style={{fontSize:11,color:'var(--muted)',textDecoration:'underline',flexShrink:0}}>View →</span></div>)}</div></>}
        </>}

        {tab==='sizes'&&<div style={{padding:'10px 16px 24px'}}>
          <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,marginBottom:12}}>Your saved sizes are highlighted. Tap a store to expand its chart.</div>
          {SIZE_GUIDES.map((sg,i)=>{
            const isOpen=openStore===i;
            const myItems=wardrobe.filter(w=>w.store===sg.store&&w.size);
            const mySizes=[...new Set(myItems.map(w=>w.size))];
            const summary=getMySizeSummary(sg.store,wardrobe);
            const hasIn=sg.sizes.some(s=>s.inseam);
            return<div key={sg.store} className="store-card">
              <div className="store-hd" onClick={()=>setOS(isOpen?null:i)}>
                <div><div style={{fontSize:13,fontWeight:500}}>{sg.store}</div><div style={{fontSize:10,color:'var(--muted)'}}>{sg.cat} · {sg.country}</div></div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>{mySizes.length>0&&<span style={{fontSize:10,background:'var(--accent-bg)',color:'var(--accent)',padding:'2px 7px',borderRadius:10,fontWeight:500}}>{mySizes.join(', ')}</span>}<span style={{fontSize:11,color:'var(--muted)',display:'inline-block',transition:'transform .2s',transform:isOpen?'rotate(180deg)':'none'}}>▼</span></div>
              </div>
              {isOpen&&<>
                <div className="size-wrap"><table><thead><tr><th>Size</th><th>AU</th><th>Bust</th><th>Waist</th><th>Hip</th>{hasIn&&<th>Inseam</th>}</tr></thead><tbody>{sg.sizes.map(s=>{const mine=mySizes.includes(s.l);return<tr key={s.l} className={mine?'my-row':''}><td>{s.l}{mine&&<span style={{fontSize:8,color:'var(--accent)',fontWeight:600,marginLeft:3}}>★ mine</span>}</td><td>{s.au}</td><td>{s.bust}</td><td>{s.waist}</td><td>{s.hip}</td>{hasIn&&<td>{s.inseam||'—'}</td>}</tr>;})}</tbody></table></div>
                {summary&&<div className="my-sizes-summary"><div style={{fontSize:10,letterSpacing:'.8px',textTransform:'uppercase',color:'var(--accent)',fontWeight:500,marginBottom:5}}>My sizes at {sg.store}</div>{summary.map(line=><div key={line} style={{fontSize:12,color:'var(--ink)',marginBottom:2}}>{line}</div>)}</div>}
              </>}
            </div>;
          })}
        </div>}

        {tab==='ask'&&<div className="ask-wrap">
          <div className="ask-box"><div className="ask-input-row"><input className="ask-input" placeholder="e.g. What size are my Levi's jeans?" value={askQ} onChange={e=>setAskQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAsk()}/><button onClick={()=>handleAsk()} style={{padding:'7px 13px',background:'var(--ink)',color:'#fff',border:'none',borderRadius:8,fontSize:11,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Ask</button></div><div>{ASK_SUGG.map(q=><div key={q} onClick={()=>handleAsk(q)} style={{padding:'9px 14px',fontSize:12,color:'var(--muted)',cursor:'pointer',borderTop:'1px solid var(--border)'}}>{q}</div>)}</div></div>
          {askResult&&<div style={{background:'var(--ink)',borderRadius:14,padding:16,color:'#fff'}}><div style={{fontSize:9,letterSpacing:1,textTransform:'uppercase',color:'rgba(255,255,255,.45)',marginBottom:5}}>{askResult.query}</div>{askResult.notFound?<><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,marginBottom:6}}>Nothing found</div><div style={{fontSize:12,color:'rgba(255,255,255,.7)',lineHeight:1.7}}>No items matched. Try a brand, colour, or category.</div></>:<><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,marginBottom:6,lineHeight:1.3}}>{askResult.item.name} — {askResult.item.sizeLabel||askResult.item.size||'size not set'}</div><div style={{fontSize:12,color:'rgba(255,255,255,.7)',lineHeight:1.7,whiteSpace:'pre-line'}}>{[askResult.item.brand,askResult.item.color,askResult.item.category,askResult.item.subcategory,askResult.item.store&&`from ${askResult.item.store}`].filter(Boolean).join(' · ')}{askResult.sRow?`\n\n${askResult.guide.store} size ${askResult.sRow.l}:\nBust ${askResult.sRow.bust}cm · Waist ${askResult.sRow.waist}cm · Hip ${askResult.sRow.hip}cm${askResult.sRow.inseam?` · Inseam ${askResult.sRow.inseam}`:''}`:askResult.guide?'\n\nSize guide available — check the Sizes tab.':''}</div></>}</div>}
          {!askResult&&<div style={{background:'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid var(--border)'}}><div style={{fontSize:10,color:'var(--muted)',marginBottom:8,letterSpacing:'.5px',textTransform:'uppercase'}}>Try asking</div><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{ASK_SUGG.map(q=><div key={q} onClick={()=>handleAsk(q)} style={{padding:'5px 11px',borderRadius:20,border:'1px solid var(--border)',background:'#fff',fontSize:11,color:'var(--muted)',cursor:'pointer'}}>{q}</div>)}</div></div>}
        </div>}

      </div>
      <div className="botnav">{NAV.map(n=><button key={n.key} className={`navitem${tab===n.key?' active':''}`} onClick={()=>setTab(n.key)}><span className="nl">{n.label}</span>{tab===n.key&&<span className="navdot"/>}</button>)}</div>
    </div>
  </div></div>

  {showAddW   && <AddWardrobeSheet  onSave={addItem}  onClose={()=>setShowAddW(false)}  stores={stores} onAddStore={addStore}/>}
  {showAddWL  && <AddWishSheet      onSave={addWish}  onClose={()=>setShowAddWL(false)} stores={stores} onAddStore={addStore}/>}
  {showAddO   && <OutfitBuilderSheet wardrobe={wardrobe} outfit={null} onSave={saveOutfit} onClose={()=>setShowAddO(false)}/>}
  {selItem&&!editItem  && <WardrobeDetailSheet item={selItem} onClose={()=>setSelItem(null)} onEdit={()=>setEditItem(true)} onLogWear={logWear} onDelete={()=>delItem(selItem.id)}/>}
  {selItem&&editItem   && <EditWardrobeSheet   item={selItem} onSave={saveItem} onCancel={()=>setEditItem(false)} stores={stores} onAddStore={addStore}/>}
  {selWish&&!editWish  && <WishDetailSheet item={selWish} similar={findSimilar(selWish,wardrobe)} onClose={()=>setSelWish(null)} onEdit={()=>setEditWish(true)} onDelete={()=>delWish(selWish.id)} onRate={r=>rateWish(selWish.id,r)} onMoveToWardrobe={()=>bought(selWish)}/>}
  {selWish&&editWish   && <EditWishSheet   item={selWish} onSave={saveWish} onCancel={()=>setEditWish(false)} stores={stores} onAddStore={addStore}/>}
  {selOutfit&&!editOutfit && <OutfitDetailSheet outfit={selOutfit} wardrobe={wardrobe} onClose={()=>setSelOutfit(null)} onEdit={()=>setEditOutfit(true)} onDelete={()=>delOutfit(selOutfit.id)} onMarkWorn={logOutfitWear}/>}
  {selOutfit&&editOutfit  && <OutfitBuilderSheet wardrobe={wardrobe} outfit={selOutfit} onSave={saveOutfit} onClose={()=>setEditOutfit(false)}/>}
  </>;
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
