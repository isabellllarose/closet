/* global React, ReactDOM */
const { useState, useRef, useEffect } = React;

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function today() { return new Date().toISOString().slice(0,7); }
function daysLabel(d) {
  if (d === null || d === undefined) return 'Never worn';
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`; if (d < 30) return `${Math.round(d/7)}w ago`;
  return `${Math.round(d/30)}mo ago`;
}
function findSimilar(wish, wardrobe) {
  if (!wish.category) return [];
  return wardrobe.filter(w => {
    if (!w.complete) return false;
    const catMatch = w.category === wish.category;
    const cw = (wish.color||'').toLowerCase().split(' ')[0];
    return catMatch && cw && (w.color||'').toLowerCase().includes(cw);
  });
}

const CATS = ['All','Tops','Bottoms','Dresses','Outerwear','Shoes','Bags','Accessories'];
const OCCASIONS = ['Casual','Work','Evening','Event','Gym','Holiday'];
const OCC_C = {
  Casual:{bg:'#EEF5EC',b:'#89BE7B',t:'#3A7A2B'}, Work:{bg:'#EAF0F8',b:'#7BA4D0',t:'#1E5799'},
  Evening:{bg:'#F3EEF8',b:'#A47BC4',t:'#5D2A8A'}, Event:{bg:'#FDF3EC',b:'#E0A86A',t:'#8A4A10'},
  Gym:{bg:'#EDFAF4',b:'#62C99A',t:'#1A7A52'}, Holiday:{bg:'#FEF0F0',b:'#E07B7B',t:'#8A1C1C'},
};
const CAT_EMOJI = { Tops:'👕',Bottoms:'👖',Dresses:'👗',Outerwear:'🧥',Shoes:'👟',Bags:'👜',Accessories:'💍' };
const NEED_LABELS = ['','Nice to have','Want it','Really want it','Need it','Genuinely need'];
const NAV_ITEMS = [
  {key:'wardrobe', label:'Wardrobe'},
  {key:'wishlist', label:'Wishlist'},
  {key:'stats',    label:'Stats'},
  {key:'sizes',    label:'Sizes'},
  {key:'ask',      label:'Ask'},
];

const SIZE_GUIDES = [
  { store:'Cotton On', cat:'Tops & Bottoms', country:'AU', sizes:[{l:'XS',au:'6',bust:'80–83',waist:'62–65',hip:'87–90'},{l:'S',au:'8',bust:'84–87',waist:'66–69',hip:'91–94'},{l:'M',au:'10',bust:'88–91',waist:'70–73',hip:'95–98'},{l:'L',au:'12',bust:'92–95',waist:'74–77',hip:'99–102'},{l:'XL',au:'14',bust:'96–101',waist:'78–83',hip:'103–108'}]},
  { store:'Zara', cat:'Tops & Bottoms', country:'AU/EU', sizes:[{l:'XS',au:'6',bust:'79–81',waist:'61–63',hip:'87–89'},{l:'S',au:'8',bust:'83–85',waist:'65–67',hip:'91–93'},{l:'M',au:'10–12',bust:'87–89',waist:'69–71',hip:'95–97'},{l:'L',au:'14',bust:'91–93',waist:'73–75',hip:'99–101'},{l:'XL',au:'16',bust:'96–98',waist:'79–81',hip:'105–107'}]},
  { store:'ASOS', cat:'Tops & Bottoms', country:'AU', sizes:[{l:'XS',au:'6',bust:'82',waist:'62',hip:'88'},{l:'S',au:'8',bust:'86',waist:'66',hip:'92'},{l:'M',au:'10',bust:'90',waist:'70',hip:'96'},{l:'L',au:'12',bust:'94',waist:'74',hip:'100'},{l:'XL',au:'14',bust:'98',waist:'78',hip:'104'}]},
  { store:"Levi's", cat:'Jeans (waist size)', country:'AU', sizes:[{l:'24',au:'6',bust:'—',waist:'61',hip:'84',inseam:'30"'},{l:'25',au:'6–8',bust:'—',waist:'63',hip:'86',inseam:'30"'},{l:'26',au:'8',bust:'—',waist:'66',hip:'89',inseam:'30"'},{l:'27',au:'8–10',bust:'—',waist:'69',hip:'92',inseam:'30"'},{l:'28',au:'10',bust:'—',waist:'72',hip:'95',inseam:'30"'},{l:'29',au:'10–12',bust:'—',waist:'75',hip:'98',inseam:'30"'},{l:'30',au:'12',bust:'—',waist:'78',hip:'101',inseam:'30"'},{l:'31',au:'12–14',bust:'—',waist:'81',hip:'104',inseam:'30"'},{l:'32',au:'14',bust:'—',waist:'84',hip:'107',inseam:'30"'}]},
  { store:'H&M', cat:'Tops & Bottoms', country:'AU', sizes:[{l:'XS',au:'6',bust:'78–82',waist:'60–64',hip:'86–90'},{l:'S',au:'8',bust:'82–86',waist:'64–68',hip:'90–94'},{l:'M',au:'10–12',bust:'86–90',waist:'68–72',hip:'94–98'},{l:'L',au:'14',bust:'92–96',waist:'74–78',hip:'100–104'},{l:'XL',au:'16',bust:'98–102',waist:'80–84',hip:'106–110'}]},
  { store:'Princess Polly', cat:'Tops & Dresses', country:'AU', sizes:[{l:'4',au:'4',bust:'77',waist:'58',hip:'83'},{l:'6',au:'6',bust:'80',waist:'62',hip:'87'},{l:'8',au:'8',bust:'84',waist:'66',hip:'91'},{l:'10',au:'10',bust:'88',waist:'70',hip:'95'},{l:'12',au:'12',bust:'93',waist:'75',hip:'100'}]},
  { store:'Glassons', cat:'Tops & Bottoms', country:'AU/NZ', sizes:[{l:'XS',au:'6',bust:'80',waist:'62',hip:'87'},{l:'S',au:'8',bust:'84',waist:'66',hip:'91'},{l:'M',au:'10',bust:'88',waist:'70',hip:'95'},{l:'L',au:'12',bust:'93',waist:'75',hip:'100'},{l:'XL',au:'14',bust:'98',waist:'80',hip:'105'}]},
  { store:'The Iconic', cat:'Multi-brand (AU)', country:'AU', sizes:[{l:'XS',au:'6',bust:'80–83',waist:'62–65',hip:'86–89'},{l:'S',au:'8',bust:'84–87',waist:'66–69',hip:'90–93'},{l:'M',au:'10',bust:'88–91',waist:'70–73',hip:'94–97'},{l:'L',au:'12',bust:'92–95',waist:'74–77',hip:'98–101'},{l:'XL',au:'14',bust:'96–99',waist:'78–81',hip:'102–105'}]},
];

// ── Global styles ─────────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body, #root { height: 100%; }
  body { font-family: 'Jost', system-ui, sans-serif; background: #111; }

  :root {
    --cream: #F5F0E8; --ink: #1A1714; --muted: #8A837A; --border: #E0D9CF;
    --panel: #FDFAF5; --accent: #B07848; --accent-bg: #F5EDE2;
    --red: #C4623A; --green: #5A8A60;
    --safe-t: env(safe-area-inset-top, 0px);
    --safe-b: env(safe-area-inset-bottom, 16px);
  }

  /* ── LAYOUT ── */
  .app { display: flex; height: 100dvh; height: 100vh; background: var(--cream); overflow: hidden; }

  /* Mobile: column layout */
  .app-inner { display: flex; flex-direction: column; flex: 1; overflow: hidden; max-width: 430px; margin: 0 auto; width: 100%; }

  /* Desktop: sidebar + content side by side, centred with max width */
  @media (min-width: 768px) {
    .app { justify-content: center; background: #ECEAE4; }
    .app-inner { flex-direction: row; max-width: 1100px; margin: 24px auto; border-radius: 20px;
      overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,.15); height: calc(100vh - 48px); }
  }

  /* ── SIDEBAR (desktop) ── */
  .sidebar { display: none; }
  @media (min-width: 768px) {
    .sidebar { display: flex; flex-direction: column; width: 220px; flex-shrink: 0;
      background: var(--ink); padding: 32px 0 24px; overflow: hidden; }
    .sidebar-logo { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300;
      letter-spacing: 4px; color: #F5F0E8; padding: 0 28px 32px; }
    .sidebar-nav { display: flex; flex-direction: column; flex: 1; }
    .sidebar-item { padding: 12px 28px; font-size: 12px; letter-spacing: 1px;
      text-transform: uppercase; color: rgba(255,255,255,.45); cursor: pointer;
      transition: all .15s; border: none; background: none; font-family: 'Jost', sans-serif;
      text-align: left; border-left: 2px solid transparent; }
    .sidebar-item:hover { color: rgba(255,255,255,.75); background: rgba(255,255,255,.05); }
    .sidebar-item.active { color: #F5F0E8; border-left-color: var(--accent); background: rgba(255,255,255,.06); }
    .sidebar-footer { padding: 16px 28px; font-size:10px; color: rgba(255,255,255,.25); }
  }

  /* ── CONTENT AREA ── */
  .content-area { display: flex; flex-direction: column; flex: 1; overflow: hidden; background: var(--cream); }

  /* ── TOP BAR ── */
  .topbar { display: flex; align-items: center; gap: 10px; padding: 14px 18px 11px;
    background: var(--panel); border-bottom: 1px solid var(--border); flex-shrink: 0;
    padding-top: calc(14px + var(--safe-t)); }
  @media (min-width: 768px) {
    .topbar { padding-top: 16px; border-bottom: 1px solid var(--border); }
    .topbar-logo { display: none; }
  }
  .topbar-logo { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300;
    letter-spacing: 3px; color: var(--ink); flex-shrink: 0; }
  .topbar-title { display: none; font-family: 'Cormorant Garamond', serif; font-size: 20px;
    font-weight: 300; color: var(--ink); flex-shrink: 0; }
  @media (min-width: 768px) {
    .topbar-title { display: block; }
  }
  .searchbox { flex: 1; display: flex; align-items: center; gap: 6px;
    background: var(--cream); border: 1px solid var(--border); border-radius: 10px; padding: 7px 10px; }
  .searchbox input { flex: 1; border: none; background: none; font-size: 12px;
    font-family: 'Jost', sans-serif; color: var(--ink); outline: none; }
  .searchbox input::placeholder { color: var(--muted); }
  .iconbtn { width: 34px; height: 34px; border-radius: 50%; background: var(--ink); border: none;
    color: #fff; font-size: 18px; cursor: pointer; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; transition: opacity .15s; }
  .iconbtn:hover { opacity: .8; }

  /* ── BOTTOM NAV (mobile only) ── */
  .botnav { display: flex; background: var(--panel); border-top: 1px solid var(--border);
    padding: 6px 0 calc(6px + var(--safe-b)); flex-shrink: 0; }
  @media (min-width: 768px) { .botnav { display: none; } }
  .navitem { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
    border: none; background: none; cursor: pointer; padding: 4px 0; }
  .navitem .nl { font-size: 9px; letter-spacing: .6px; text-transform: uppercase; color: var(--muted); }
  .navitem.active .nl { color: var(--ink); font-weight: 600; }
  .navdot { width: 3px; height: 3px; border-radius: 50%; background: var(--accent); margin-top: 1px; }

  /* ── SCROLL BODY ── */
  .scroll { flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
  .scroll::-webkit-scrollbar { width: 4px; }
  .scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* ── FILTERS ── */
  .filterrow { display: flex; gap: 6px; padding: 10px 16px 6px; overflow-x: auto; }
  .filterrow::-webkit-scrollbar { display: none; }
  .chip { flex-shrink: 0; padding: 5px 12px; border-radius: 20px; border: 1.5px solid var(--border);
    background: #fff; font-size: 11px; cursor: pointer; color: var(--muted);
    font-family: 'Jost', sans-serif; transition: all .15s; white-space: nowrap; }
  .chip.active { background: var(--ink); border-color: var(--ink); color: #fff; }

  /* ── GRID ── */
  .seclbl { padding: 4px 16px 6px; font-size: 10px; letter-spacing: 1.2px;
    text-transform: uppercase; color: var(--muted); font-weight: 500; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 16px 24px; }
  @media (min-width: 768px) { .grid { grid-template-columns: repeat(4, 1fr); } }
  @media (min-width: 1024px) { .grid { grid-template-columns: repeat(5, 1fr); } }

  /* ── ITEM CARD ── */
  .icard { border-radius: 14px; overflow: hidden; background: #fff; border: 1.5px solid var(--border);
    cursor: pointer; transition: transform .15s, box-shadow .15s; position: relative; }
  .icard:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
  .icard:active { transform: scale(0.97); }
  .icard.incomplete { border-style: dashed; }
  .iphoto { width: 100%; aspect-ratio: 3/4; background: var(--cream); display: flex;
    align-items: center; justify-content: center; position: relative; overflow: hidden; }
  .iphoto img { width: 100%; height: 100%; object-fit: cover; }
  .badge-warn { position: absolute; top: 5px; right: 5px; background: var(--accent);
    color: #fff; font-size: 8px; padding: 2px 5px; border-radius: 4px; }
  .badge-worn { position: absolute; bottom: 5px; left: 5px; background: rgba(0,0,0,.52);
    color: #fff; font-size: 8px; padding: 2px 5px; border-radius: 4px; backdrop-filter: blur(4px); }
  .iinfo { padding: 6px 8px 8px; }
  .iname { font-size: 11px; font-weight: 500; color: var(--ink);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .imeta { font-size: 9.5px; color: var(--muted); margin-top: 1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .isize { font-size: 9.5px; font-weight: 500; color: var(--accent); margin-top: 1px; }

  /* ── WISH CARD ── */
  .wcard { background: #fff; border-radius: 14px; border: 1.5px solid var(--border);
    cursor: pointer; transition: transform .15s, box-shadow .15s; overflow: hidden; }
  .wcard:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
  .wcard:active { transform: scale(0.98); }
  .wish-grid { display: grid; grid-template-columns: 1fr; gap: 10px; padding: 8px 16px 24px; }
  @media (min-width: 768px) { .wish-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .wish-grid { grid-template-columns: repeat(3, 1fr); } }
  .wimg { width: 100%; aspect-ratio: 4/3; background: var(--cream); display: flex;
    align-items: center; justify-content: center; overflow: hidden; }
  .wimg img { width: 100%; height: 100%; object-fit: cover; }
  .simflag { font-size: 9px; background: var(--accent-bg); color: var(--accent);
    border-radius: 5px; padding: 2px 6px; margin-top: 5px; display: inline-block; }

  /* ── STATS ── */
  .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px 16px 4px; }
  @media (min-width: 768px) { .stat-grid { grid-template-columns: repeat(4, 1fr); } }
  .stat-card { background: #fff; border-radius: 14px; padding: 14px; border: 1px solid var(--border); }
  .stat-n { font-family: 'Cormorant Garamond', serif; font-size: 38px; font-weight: 300; }
  .stat-l { font-size: 10px; color: var(--muted); margin-top: 2px; }

  /* ── SIZE TABLES ── */
  .store-card { background: #fff; border-radius: 12px; border: 1px solid var(--border);
    overflow: hidden; margin-bottom: 8px; }
  .store-hd { display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; cursor: pointer; }
  .size-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: var(--cream); padding: 6px 8px; text-align: left; font-weight: 500;
    font-size: 9px; letter-spacing: .5px; text-transform: uppercase; color: var(--muted);
    white-space: nowrap; border-top: 1px solid var(--border); }
  td { padding: 6px 8px; border-top: 1px solid var(--border); color: var(--ink); white-space: nowrap; }
  .my-row td { background: var(--accent-bg); font-weight: 500; }

  /* ── ASK ── */
  .ask-wrap { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
  @media (min-width: 768px) { .ask-wrap { max-width: 640px; } }
  .ask-box { background: #fff; border-radius: 14px; border: 1px solid var(--border); overflow: hidden; }
  .ask-input-row { display: flex; align-items: center; gap: 8px; padding: 11px 13px; }
  .ask-input { flex: 1; border: none; background: none; font-size: 13px;
    font-family: 'Jost', sans-serif; color: var(--ink); outline: none; }
  .ask-input::placeholder { color: var(--muted); }

  /* ── BANNER ── */
  .banner { margin: 8px 16px; background: var(--accent-bg); border-radius: 12px;
    padding: 10px 13px; border: 1px solid #DEC9AF; display: flex; align-items: center; gap: 8px; }

  /* ── EMPTY ── */
  .empty { text-align: center; padding: 60px 24px; }
  .empty-t { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300; margin-bottom: 6px; }
  .empty-s { font-size: 12px; color: var(--muted); line-height: 1.6; }

  /* ── MODAL / SHEET ── */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 200;
    display: flex; align-items: flex-end; justify-content: center; backdrop-filter: blur(5px); }
  @media (min-width: 768px) { .overlay { align-items: center; } }
  .sheet { background: var(--panel); border-radius: 24px 24px 0 0; max-height: 94vh;
    width: 100%; display: flex; flex-direction: column; overflow: hidden; }
  @media (min-width: 768px) {
    .sheet { border-radius: 20px; max-width: 560px; max-height: 88vh; width: 100%; }
  }
  .sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px;
    margin: 14px auto 0; flex-shrink: 0; }
  @media (min-width: 768px) { .sheet-handle { display: none; } }
  .sheet-top { display: flex; align-items: center; justify-content: space-between;
    padding: 12px 20px 10px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .sheet-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300; }
  .sheet-close { background: none; border: none; font-size: 18px; cursor: pointer;
    color: var(--muted); line-height: 1; padding: 2px 4px; }
  .sheet-body { padding: 16px 20px; flex: 1; overflow-y: auto; }
  .sheet-body::-webkit-scrollbar { display: none; }
  .sheet-actions { display: flex; gap: 8px;
    padding: 12px 20px calc(12px + var(--safe-b));
    border-top: 1px solid var(--border); flex-shrink: 0; }
  @media (min-width: 768px) { .sheet-actions { padding-bottom: 16px; } }

  /* ── FORM ELEMENTS ── */
  .f-lbl { font-size: 10px; letter-spacing: .8px; text-transform: uppercase;
    color: var(--muted); margin-bottom: 4px; display: block; }
  .f-inp { width: 100%; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 10px;
    font-size: 13px; font-family: 'Jost', sans-serif; background: #fff; color: var(--ink);
    outline: none; transition: border-color .15s; }
  .f-inp:focus { border-color: var(--ink); }
  .f-sel { -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238A837A'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; }
  .detail-row { display: flex; align-items: baseline; justify-content: space-between;
    padding: 8px 0; border-bottom: 1px solid var(--border); gap: 12px; }
  .toggle-row { display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0; border-top: 1px solid var(--border); }
`;

// ── Shared UI components ──────────────────────────────────────────────────────
function StarDisplay({ rating, size=12, onClick }) {
  return (
    <div style={{display:'flex',gap:2}}>
      {[1,2,3,4,5].map(i => (
        <span key={i} onClick={e=>{e.stopPropagation();onClick&&onClick(i);}}
          style={{fontSize:size,cursor:onClick?'pointer':'default',
            color:i<=rating?'#C9A050':'#DDD6CA',lineHeight:1}}>★</span>
      ))}
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <div onClick={e=>{e.stopPropagation();onToggle();}}
      style={{width:44,height:26,background:on?'#5A8A60':'#E0D9CF',borderRadius:13,
        position:'relative',cursor:'pointer',transition:'background .2s',flexShrink:0}}>
      <div style={{position:'absolute',top:3,left:3,width:20,height:20,background:'#fff',
        borderRadius:'50%',transition:'transform .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)',
        transform:on?'translateX(18px)':'none'}}/>
    </div>
  );
}

function PhotoZone({ photoUrl, onPhoto, style={}, label='Photo\n(optional)' }) {
  const ref = useRef();
  return (
    <div onClick={()=>ref.current?.click()}
      style={{border:'2px dashed #E0D9CF',borderRadius:14,display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',gap:6,cursor:'pointer',
        background:'#F5F0E8',position:'relative',overflow:'hidden',...style}}>
      {photoUrl && <img src={photoUrl} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
      {!photoUrl && <>
        <span style={{fontSize:24,zIndex:1}}>📷</span>
        <span style={{fontSize:11,color:'#8A837A',zIndex:1,textAlign:'center',lineHeight:1.4,whiteSpace:'pre-line'}}>{label}</span>
      </>}
      <input ref={ref} type="file" accept="image/*" capture="environment"
        style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}}
        onChange={e=>{const f=e.target.files?.[0];if(f)onPhoto(URL.createObjectURL(f));}}/>
    </div>
  );
}

function OccChips({ selected, onChange }) {
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:4}}>
      {OCCASIONS.map(o => {
        const c=OCC_C[o]; const sel=selected.includes(o);
        return <div key={o} onClick={()=>onChange(sel?selected.filter(x=>x!==o):[...selected,o])}
          style={{padding:'4px 10px',borderRadius:20,fontSize:11,border:`1.5px solid ${c.b}`,
            cursor:'pointer',background:sel?c.b:c.bg,color:sel?'#fff':c.t,fontFamily:"'Jost',sans-serif"}}>
          {o}</div>;
      })}
    </div>
  );
}

function Sheet({ title, onClose, children, actions }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-top">
          <div className="sheet-title">{title}</div>
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body">{children}</div>
        {actions && <div className="sheet-actions">{actions}</div>}
      </div>
    </div>
  );
}

function BtnO({ onClick, children }) {
  return <button onClick={onClick}
    style={{flex:1,padding:12,border:'1.5px solid #E0D9CF',borderRadius:12,background:'none',
      fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif",color:'#1A1714'}}>{children}</button>;
}
function BtnF({ onClick, disabled, children, color='#1A1714' }) {
  return <button onClick={onClick} disabled={disabled}
    style={{flex:1,padding:12,border:'none',borderRadius:12,background:color,
      color:'#fff',fontSize:13,cursor:disabled?'default':'pointer',
      fontFamily:"'Jost',sans-serif",opacity:disabled?.35:1}}>{children}</button>;
}
function FGrp({ label, children, style={} }) {
  return <div style={{marginBottom:11,...style}}>
    <label className="f-lbl">{label}</label>
    {children}
  </div>;
}
function FInp({ value, onChange, placeholder='', type='text', style={} }) {
  return <input type={type} value={value||''} onChange={onChange} placeholder={placeholder}
    className="f-inp" style={style}/>;
}
function FSel({ value, onChange, options }) {
  return <select value={value} onChange={onChange} className="f-inp f-sel">
    {options.map(o=><option key={o}>{o}</option>)}
  </select>;
}
function FRow({ children }) { return <div style={{display:'flex',gap:8}}>{children}</div>; }
function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return <div className="detail-row">
    <span style={{fontSize:11,color:'#8A837A',flexShrink:0}}>{label}</span>
    <span style={{fontSize:12,fontWeight:500,color:'#1A1714',textAlign:'right'}}>{value}</span>
  </div>;
}

// ── Wardrobe card ─────────────────────────────────────────────────────────────
function WardrobeCard({ item, onClick }) {
  return (
    <div className={`icard${!item.complete?' incomplete':''}`} onClick={onClick}>
      <div className="iphoto">
        {item.photoUrl
          ? <img src={item.photoUrl} alt={item.name}/>
          : <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
              <span style={{fontSize:22,opacity:.35}}>{CAT_EMOJI[item.category]||'👗'}</span>
              <span style={{fontSize:9,color:'#8A837A'}}>{item.category}</span>
            </div>}
        {!item.complete && <span className="badge-warn">needs info</span>}
        {item.lastWorn!==null&&item.lastWorn!==undefined && (
          <span className="badge-worn">{daysLabel(item.lastWorn)}</span>
        )}
      </div>
      <div className="iinfo">
        <div className="iname">{item.name||'Untitled'}</div>
        <div className="imeta">{item.brand||item.color||'—'}</div>
        {item.size && <div className="isize">{item.sizeLabel||item.size}</div>}
      </div>
    </div>
  );
}

// ── Wish card ─────────────────────────────────────────────────────────────────
function WishCard({ item, similar, onRate, onClick }) {
  return (
    <div className="wcard" onClick={onClick}>
      <div className="wimg">
        {item.photoUrl
          ? <img src={item.photoUrl} alt={item.name}/>
          : <span style={{fontSize:32,opacity:.25}}>{CAT_EMOJI[item.category]||'🛍️'}</span>}
      </div>
      <div style={{padding:'10px 12px'}}>
        <div style={{fontSize:12,fontWeight:500,color:'#1A1714',whiteSpace:'nowrap',
          overflow:'hidden',textOverflow:'ellipsis',marginBottom:3}}>{item.name}</div>
        <div style={{fontSize:10,color:'#8A837A'}}>{item.store||item.brand||'—'}</div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
          {item.price && <span style={{fontSize:13,fontWeight:500,
            color:item.onSale?'#C4623A':'#1A1714'}}>A${item.price}</span>}
          {item.onSale&&item.origPrice && <span style={{fontSize:11,color:'#8A837A',
            textDecoration:'line-through'}}>A${item.origPrice}</span>}
          {item.onSale && <span style={{fontSize:9,background:'#FEF0F0',color:'#C4623A',
            borderRadius:4,padding:'2px 5px',fontWeight:500}}>Sale</span>}
        </div>
        <div onClick={e=>e.stopPropagation()} style={{marginTop:4}}>
          <StarDisplay rating={item.rating} size={13} onClick={onRate}/>
        </div>
        {similar.length>0 && <div className="simflag">⚠️ You own something similar</div>}
      </div>
    </div>
  );
}

// ── Add / Edit Wardrobe ───────────────────────────────────────────────────────
function AddWardrobeSheet({ onSave, onClose }) {
  const [d, setD] = useState({name:'',category:'Tops',brand:'',store:'',color:'',size:'',
    sizeLabel:'',photoUrl:null,occasions:[],dateBought:'',notes:''});
  const up = v => setD(p=>({...p,...v}));
  function save(photoOnly=false) {
    onSave({...d,id:uid(),complete:!photoOnly&&!!(d.name&&d.category),
      sizeLabel:d.sizeLabel||d.size,name:d.name||'New item',lastWorn:null,wearCount:0});
  }
  return (
    <Sheet title="Add item" onClose={onClose} actions={<>
      <BtnO onClick={onClose}>Cancel</BtnO>
      <BtnF onClick={()=>save()}>{d.name?'Add to wardrobe':'Save anyway'}</BtnF>
    </>}>
      <div style={{display:'flex',gap:12,marginBottom:14}}>
        <PhotoZone photoUrl={d.photoUrl} onPhoto={u=>up({photoUrl:u})} style={{flex:'0 0 110px',height:146}}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          <FGrp label="Name" style={{marginBottom:0}}><FInp value={d.name} placeholder="e.g. White linen shirt" onChange={e=>up({name:e.target.value})}/></FGrp>
          <FGrp label="Category" style={{marginBottom:0}}><FSel value={d.category} onChange={e=>up({category:e.target.value})} options={CATS.filter(c=>c!=='All')}/></FGrp>
        </div>
      </div>
      <FRow><FGrp label="Brand" style={{flex:1}}><FInp value={d.brand} placeholder="Zara" onChange={e=>up({brand:e.target.value,store:d.store||e.target.value})}/></FGrp>
        <FGrp label="Colour" style={{flex:1}}><FInp value={d.color} placeholder="Navy" onChange={e=>up({color:e.target.value})}/></FGrp></FRow>
      <FRow><FGrp label="Size" style={{flex:1}}><FInp value={d.size} placeholder="S / 10 / 27" onChange={e=>up({size:e.target.value,sizeLabel:e.target.value})}/></FGrp>
        <FGrp label="Store" style={{flex:1}}><FInp value={d.store} placeholder="Where you bought it" onChange={e=>up({store:e.target.value})}/></FGrp></FRow>
      <FRow><FGrp label="Date bought" style={{flex:1}}><FInp value={d.dateBought} placeholder="2024-03" onChange={e=>up({dateBought:e.target.value})}/></FGrp>
        <div style={{flex:1}}/></FRow>
      <FGrp label="Notes"><FInp value={d.notes} placeholder="Fit, where you wear it…" onChange={e=>up({notes:e.target.value})}/></FGrp>
      <FGrp label="Occasions"><OccChips selected={d.occasions} onChange={o=>up({occasions:o})}/></FGrp>
      {d.photoUrl&&!d.name&&(
        <div onClick={()=>save(true)} style={{fontSize:11,color:'#8A837A',textDecoration:'underline',cursor:'pointer',textAlign:'center',padding:'8px 0'}}>
          Save photo only — I'll fill details in later</div>
      )}
    </Sheet>
  );
}

function EditWardrobeSheet({ item, onSave, onCancel }) {
  const [f, setF] = useState({...item});
  const up = v => setF(p=>({...p,...v}));
  return (
    <Sheet title="Edit item" onClose={onCancel} actions={<>
      <BtnO onClick={onCancel}>Cancel</BtnO>
      <BtnF onClick={()=>onSave(f)} color="#B07848">Save changes</BtnF>
    </>}>
      <div style={{display:'flex',gap:12,marginBottom:14}}>
        <PhotoZone photoUrl={f.photoUrl} onPhoto={u=>up({photoUrl:u})} label="Tap to change" style={{flex:'0 0 110px',height:146}}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          <FGrp label="Name" style={{marginBottom:0}}><FInp value={f.name} onChange={e=>up({name:e.target.value})}/></FGrp>
          <FGrp label="Category" style={{marginBottom:0}}><FSel value={f.category} onChange={e=>up({category:e.target.value})} options={CATS.filter(c=>c!=='All')}/></FGrp>
        </div>
      </div>
      <FRow><FGrp label="Brand" style={{flex:1}}><FInp value={f.brand} onChange={e=>up({brand:e.target.value})}/></FGrp>
        <FGrp label="Store" style={{flex:1}}><FInp value={f.store} onChange={e=>up({store:e.target.value})}/></FGrp></FRow>
      <FRow><FGrp label="Colour" style={{flex:1}}><FInp value={f.color} onChange={e=>up({color:e.target.value})}/></FGrp>
        <FGrp label="Size" style={{flex:1}}><FInp value={f.size} onChange={e=>up({size:e.target.value,sizeLabel:e.target.value})}/></FGrp></FRow>
      <FRow><FGrp label="Date bought" style={{flex:1}}><FInp value={f.dateBought} placeholder="2024-03" onChange={e=>up({dateBought:e.target.value})}/></FGrp>
        <FGrp label="Total wears" style={{flex:1}}><FInp value={f.wearCount} type="number" onChange={e=>up({wearCount:parseInt(e.target.value)||0})}/></FGrp></FRow>
      <FGrp label="Notes"><FInp value={f.notes} onChange={e=>up({notes:e.target.value})}/></FGrp>
      <FGrp label="Occasions"><OccChips selected={f.occasions||[]} onChange={o=>up({occasions:o})}/></FGrp>
    </Sheet>
  );
}

function WardrobeDetailSheet({ item, onClose, onEdit, onMarkWorn, onDelete }) {
  return (
    <Sheet title={item.name||'Untitled'} onClose={onClose}>
      <div style={{width:'100%',aspectRatio:'3/4',maxHeight:240,background:'#F5F0E8',
        display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',
        borderRadius:14,marginBottom:14}}>
        {item.photoUrl?<img src={item.photoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          :<span style={{fontSize:52}}>{CAT_EMOJI[item.category]||'👗'}</span>}
      </div>
      {!item.complete&&<div style={{background:'#F5EDE2',borderRadius:10,padding:'9px 12px',
        marginBottom:12,border:'1px solid #DEC9AF',fontSize:12,color:'#B07848'}}>
        Some details are still missing — tap Edit to fill them in.</div>}
      <DetailRow label="Category" value={item.category}/>
      <DetailRow label="Brand" value={item.brand}/>
      <DetailRow label="Store" value={item.store}/>
      <DetailRow label="Colour" value={item.color}/>
      <DetailRow label="Size" value={item.sizeLabel||item.size}/>
      <DetailRow label="Date bought" value={item.dateBought}/>
      <DetailRow label="Last worn" value={daysLabel(item.lastWorn)}/>
      <DetailRow label="Total wears" value={item.wearCount||0}/>
      <DetailRow label="Occasions" value={(item.occasions||[]).join(', ')||'—'}/>
      <DetailRow label="Notes" value={item.notes}/>
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button onClick={onMarkWorn} style={{flex:1,padding:11,background:'#5A8A60',color:'#fff',border:'none',borderRadius:12,fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>✓ Worn today</button>
        <button onClick={onEdit} style={{flex:1,padding:11,border:'1.5px solid #E0D9CF',borderRadius:12,background:'none',fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Edit</button>
        <button onClick={onDelete} style={{padding:'11px 14px',border:'1.5px solid #EAC8C8',borderRadius:12,background:'none',fontSize:12,cursor:'pointer',color:'#C4623A',fontFamily:"'Jost',sans-serif"}}>🗑</button>
      </div>
    </Sheet>
  );
}

// ── Add / Edit Wishlist ───────────────────────────────────────────────────────
function AddWishSheet({ onSave, onClose }) {
  const [d, setD] = useState({name:'',store:'',brand:'',url:'',price:'',origPrice:'',
    onSale:false,rating:3,photoUrl:null,notes:'',category:'Tops',color:''});
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const up = v => setD(p=>({...p,...v}));

  async function fetchUrl() {
    if (!urlInput.trim()) return;
    setLoading(true);
    await new Promise(r=>setTimeout(r,700));
    let storeName = '';
    try { storeName = new URL(urlInput).hostname.replace('www.','').split('.')[0]; } catch {}
    storeName = storeName ? storeName.charAt(0).toUpperCase()+storeName.slice(1) : '';
    up({url:urlInput, store:d.store||storeName, name:d.name||`Item from ${storeName}`});
    setLoading(false);
  }

  return (
    <Sheet title="Add to wishlist" onClose={onClose} actions={<>
      <BtnO onClick={onClose}>Cancel</BtnO>
      <BtnF onClick={()=>onSave({...d,id:uid(),addedDate:today()})} disabled={!d.name} color="#B07848">Add to wishlist</BtnF>
    </>}>
      <FGrp label="Paste a link (optional)">
        <div style={{display:'flex',gap:6}}>
          <FInp value={urlInput} placeholder="https://zara.com/product/…"
            onChange={e=>setUrlInput(e.target.value)} style={{flex:1}}/>
          <button onClick={fetchUrl} disabled={loading||!urlInput}
            style={{padding:'9px 14px',background:'#1A1714',color:'#fff',border:'none',
              borderRadius:10,fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif",
              opacity:loading||!urlInput?.5:1,flexShrink:0}}>
            {loading?'…':'Fetch'}</button>
        </div>
        <div style={{fontSize:10,color:'#8A837A',marginTop:3}}>Extracts store name automatically — fill in the rest manually for now</div>
      </FGrp>
      {d.url&&<div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',
        background:'#F5F0E8',borderRadius:10,marginBottom:10,border:'1px solid #E0D9CF'}}>
        <span>🔗</span><span style={{fontSize:11,color:'#B07848',flex:1,overflow:'hidden',
          textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.url}</span>
      </div>}
      <div style={{display:'flex',gap:12,marginBottom:14}}>
        <PhotoZone photoUrl={d.photoUrl} onPhoto={u=>up({photoUrl:u})} label="Image" style={{flex:'0 0 100px',height:133}}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          <FGrp label="Item name" style={{marginBottom:0}}><FInp value={d.name} placeholder="e.g. Barrel leg jeans" onChange={e=>up({name:e.target.value})}/></FGrp>
          <FGrp label="Category" style={{marginBottom:0}}><FSel value={d.category} onChange={e=>up({category:e.target.value})} options={CATS.filter(c=>c!=='All')}/></FGrp>
        </div>
      </div>
      <FRow><FGrp label="Store" style={{flex:1}}><FInp value={d.store} placeholder="Zara" onChange={e=>up({store:e.target.value})}/></FGrp>
        <FGrp label="Colour" style={{flex:1}}><FInp value={d.color} placeholder="Black" onChange={e=>up({color:e.target.value})}/></FGrp></FRow>
      <FRow>
        <FGrp label="Price (A$)" style={{flex:1}}><FInp value={d.price} placeholder="89.95" type="number" onChange={e=>up({price:e.target.value})}/></FGrp>
        {d.onSale&&<FGrp label="Original (A$)" style={{flex:1}}><FInp value={d.origPrice} placeholder="119.95" type="number" onChange={e=>up({origPrice:e.target.value})}/></FGrp>}
      </FRow>
      <div className="toggle-row">
        <div><div style={{fontSize:13,color:'#1A1714'}}>On sale</div>
          <div style={{fontSize:10,color:'#8A837A',marginTop:1}}>Toggle on if this is a sale price</div></div>
        <Toggle on={d.onSale} onToggle={()=>up({onSale:!d.onSale,origPrice:''})}/>
      </div>
      <FGrp label="How much do you need this? (1 = nice to have · 5 = genuinely need)" style={{marginTop:12}}>
        <div style={{display:'flex',gap:4,marginTop:4}}>
          {[1,2,3,4,5].map(i=>(
            <span key={i} onClick={()=>up({rating:i})}
              style={{fontSize:28,cursor:'pointer',color:i<=d.rating?'#C9A050':'#DDD6CA',lineHeight:1}}>★</span>
          ))}
        </div>
        <div style={{fontSize:10,color:'#8A837A',marginTop:4}}>{NEED_LABELS[d.rating]}</div>
      </FGrp>
      <FGrp label="Notes"><FInp value={d.notes} placeholder="Why you want it, what you'd wear it with…" onChange={e=>up({notes:e.target.value})}/></FGrp>
    </Sheet>
  );
}

function EditWishSheet({ item, onSave, onCancel }) {
  const [f, setF] = useState({...item});
  const up = v => setF(p=>({...p,...v}));
  return (
    <Sheet title="Edit wishlist item" onClose={onCancel} actions={<>
      <BtnO onClick={onCancel}>Cancel</BtnO>
      <BtnF onClick={()=>onSave(f)} color="#B07848">Save changes</BtnF>
    </>}>
      <div style={{display:'flex',gap:12,marginBottom:14}}>
        <PhotoZone photoUrl={f.photoUrl} onPhoto={u=>up({photoUrl:u})} label="Tap to change" style={{flex:'0 0 100px',height:133}}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          <FGrp label="Name" style={{marginBottom:0}}><FInp value={f.name} onChange={e=>up({name:e.target.value})}/></FGrp>
          <FGrp label="Category" style={{marginBottom:0}}><FSel value={f.category} onChange={e=>up({category:e.target.value})} options={CATS.filter(c=>c!=='All')}/></FGrp>
        </div>
      </div>
      <FRow><FGrp label="Store" style={{flex:1}}><FInp value={f.store} onChange={e=>up({store:e.target.value})}/></FGrp>
        <FGrp label="Colour" style={{flex:1}}><FInp value={f.color} onChange={e=>up({color:e.target.value})}/></FGrp></FRow>
      <FRow><FGrp label="Price (A$)" style={{flex:1}}><FInp value={f.price} type="number" onChange={e=>up({price:e.target.value})}/></FGrp>
        {f.onSale&&<FGrp label="Original (A$)" style={{flex:1}}><FInp value={f.origPrice} type="number" onChange={e=>up({origPrice:e.target.value})}/></FGrp>}</FRow>
      <div className="toggle-row">
        <div style={{fontSize:13,color:'#1A1714'}}>On sale</div>
        <Toggle on={f.onSale} onToggle={()=>up({onSale:!f.onSale})}/>
      </div>
      <FGrp label="Need rating" style={{marginTop:10}}>
        <div style={{display:'flex',gap:4,marginTop:4}}>
          {[1,2,3,4,5].map(i=>(
            <span key={i} onClick={()=>up({rating:i})}
              style={{fontSize:28,cursor:'pointer',color:i<=f.rating?'#C9A050':'#DDD6CA',lineHeight:1}}>★</span>
          ))}
        </div>
        <div style={{fontSize:10,color:'#8A837A',marginTop:4}}>{NEED_LABELS[f.rating]}</div>
      </FGrp>
      <FGrp label="Link"><FInp value={f.url} placeholder="https://…" onChange={e=>up({url:e.target.value})}/></FGrp>
      <FGrp label="Notes"><FInp value={f.notes} onChange={e=>up({notes:e.target.value})}/></FGrp>
    </Sheet>
  );
}

function WishDetailSheet({ item, similar, onClose, onEdit, onDelete, onRate, onMoveToWardrobe }) {
  return (
    <Sheet title={item.name} onClose={onClose}>
      <div style={{width:'100%',aspectRatio:'4/3',background:'#F5F0E8',display:'flex',
        alignItems:'center',justifyContent:'center',overflow:'hidden',borderRadius:14,marginBottom:14}}>
        {item.photoUrl?<img src={item.photoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          :<span style={{fontSize:44,opacity:.25}}>{CAT_EMOJI[item.category]||'🛍️'}</span>}
      </div>
      {similar.length>0&&<div style={{background:'#F5EDE2',borderRadius:10,padding:'9px 12px',
        marginBottom:12,border:'1px solid #DEC9AF',fontSize:12,color:'#B07848'}}>
        ⚠️ You own something similar — {similar.map(s=>s.name).join(', ')}</div>}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:'#8A837A',letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>How much do you need this</div>
        <StarDisplay rating={item.rating} size={24} onClick={onRate}/>
        <div style={{fontSize:10,color:'#8A837A',marginTop:4}}>{NEED_LABELS[item.rating]||''}</div>
      </div>
      <DetailRow label="Store" value={item.store}/>
      <DetailRow label="Brand" value={item.brand}/>
      <DetailRow label="Category" value={item.category}/>
      <DetailRow label="Colour" value={item.color}/>
      <DetailRow label="Price" value={item.price?`A$${item.price}${item.onSale?' (sale)':''}`:null}/>
      <DetailRow label="Original price" value={item.onSale&&item.origPrice?`A$${item.origPrice}`:null}/>
      <DetailRow label="Added" value={item.addedDate}/>
      <DetailRow label="Notes" value={item.notes}/>
      {item.url&&<div onClick={()=>window.open(item.url,'_blank')}
        style={{display:'flex',alignItems:'center',gap:6,padding:'10px 13px',background:'#F5F0E8',
          borderRadius:10,marginTop:10,cursor:'pointer',border:'1px solid #E0D9CF'}}>
        <span>🔗</span>
        <span style={{fontSize:11,color:'#B07848',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.url}</span>
        <span style={{fontSize:11,color:'#8A837A'}}>↗</span>
      </div>}
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button onClick={onMoveToWardrobe} style={{flex:1,padding:11,background:'#B07848',color:'#fff',border:'none',borderRadius:12,fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>✓ I bought it</button>
        <button onClick={onEdit} style={{flex:1,padding:11,border:'1.5px solid #E0D9CF',borderRadius:12,background:'none',fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Edit</button>
        <button onClick={onDelete} style={{padding:'11px 14px',border:'1.5px solid #EAC8C8',borderRadius:12,background:'none',fontSize:12,cursor:'pointer',color:'#C4623A',fontFamily:"'Jost',sans-serif"}}>🗑</button>
      </div>
    </Sheet>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab]       = useState('wardrobe');
  const [wardrobe, setW]    = useState(()=>load('closet-wardrobe',[]));
  const [wishlist, setWL]   = useState(()=>load('closet-wishlist',[]));
  const [catFilter, setCat] = useState('All');
  const [wlFilter, setWlF]  = useState('All');
  const [search, setSearch] = useState('');
  const [openStore, setOS]  = useState(null);
  const [askQ, setAskQ]     = useState('');
  const [askResult, setAR]  = useState(null);

  const [showAddW,  setShowAddW]  = useState(false);
  const [showAddWL, setShowAddWL] = useState(false);
  const [selItem,   setSelItem]   = useState(null);
  const [selWish,   setSelWish]   = useState(null);
  const [editItem,  setEditItem]  = useState(false);
  const [editWish,  setEditWish]  = useState(false);

  useEffect(()=>save('closet-wardrobe',wardrobe),[wardrobe]);
  useEffect(()=>save('closet-wishlist',wishlist),[wishlist]);

  // Wardrobe actions
  const addItem  = i => { setW(p=>[...p,i]); setShowAddW(false); };
  const saveItem = i => {
    const complete = !!(i.name&&i.category&&(i.size||i.brand));
    setW(p=>p.map(x=>x.id===i.id?{...i,complete}:x));
    setSelItem({...i,complete}); setEditItem(false);
  };
  const delItem  = id => { setW(p=>p.filter(x=>x.id!==id)); setSelItem(null); };
  const markWorn = i => {
    const u={...i,lastWorn:0,wearCount:(i.wearCount||0)+1};
    setW(p=>p.map(x=>x.id===i.id?u:x)); setSelItem(u);
  };

  // Wishlist actions
  const addWish  = i => { setWL(p=>[...p,i]); setShowAddWL(false); };
  const saveWish = i => { setWL(p=>p.map(x=>x.id===i.id?i:x)); setSelWish(i); setEditWish(false); };
  const delWish  = id => { setWL(p=>p.filter(x=>x.id!==id)); setSelWish(null); };
  const rateWish = (id,r) => { setWL(p=>p.map(x=>x.id===id?{...x,rating:r}:x)); setSelWish(p=>p?{...p,rating:r}:p); };
  const bought   = w => {
    addItem({...w,id:uid(),lastWorn:null,wearCount:0,complete:false,dateBought:today(),
      notes:`From wishlist. ${w.notes||''}`.trim()});
    delWish(w.id);
  };

  // Filtered
  const fW = wardrobe.filter(i => {
    const mc = catFilter==='All'||i.category===catFilter;
    const q  = search.toLowerCase();
    return mc&&(!q||[i.name,i.brand,i.color,i.store,i.category].some(s=>(s||'').toLowerCase().includes(q)));
  });
  const fWL = wishlist.filter(i =>
    (wlFilter==='All'||i.category===wlFilter)&&
    (!search||(i.name||'').toLowerCase().includes(search.toLowerCase())||(i.store||'').toLowerCase().includes(search.toLowerCase()))
  ).sort((a,b)=>b.rating-a.rating);

  const incomplete = wardrobe.filter(i=>!i.complete);
  const unworn     = wardrobe.filter(i=>i.complete&&i.lastWorn!==null&&i.lastWorn>30).sort((a,b)=>b.lastWorn-a.lastWorn);

  // Ask
  const ASK_SUGG = ["What size are my Levi's jeans?","What Zara size do I wear?","Do I have anything black?","When did I last wear my trench coat?","What Cotton On size am I?"];
  function handleAsk(q) {
    const query=(q||askQ).toLowerCase().trim(); if(!query)return;
    const words=query.split(' ').filter(w=>w.length>3);
    const match=wardrobe.find(i=>words.some(w=>[i.name,i.brand,i.color,i.store,i.category].some(s=>(s||'').toLowerCase().includes(w))));
    if(match){
      const guide=SIZE_GUIDES.find(g=>g.store.toLowerCase()===(match.store||'').toLowerCase());
      const sRow=guide?.sizes.find(s=>s.l===match.size);
      setAR({item:match,guide,sRow,query:q||askQ});
    } else { setAR({notFound:true,query:q||askQ}); }
    setAskQ('');
  }

  const tabTitle = {wardrobe:'Wardrobe',wishlist:'Wishlist',stats:'Stats',sizes:'Size guides',ask:'Ask closet'};

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="app-inner">

          {/* Sidebar (desktop) */}
          <div className="sidebar">
            <div className="sidebar-logo">closet</div>
            <nav className="sidebar-nav">
              {NAV_ITEMS.map(n=>(
                <button key={n.key} className={`sidebar-item${tab===n.key?' active':''}`}
                  onClick={()=>setTab(n.key)}>{n.label}</button>
              ))}
            </nav>
            <div className="sidebar-footer">Your wardrobe, organised.</div>
          </div>

          {/* Content */}
          <div className="content-area">

            {/* Top bar */}
            <div className="topbar">
              <div className="topbar-logo">closet</div>
              <div className="topbar-title">{tabTitle[tab]}</div>
              {(tab==='wardrobe'||tab==='wishlist') && (
                <div className="searchbox">
                  <span style={{fontSize:13,color:'#8A837A'}}>⌕</span>
                  <input placeholder={tab==='wardrobe'?'Search items, brands, colours…':'Search wishlist…'}
                    value={search} onChange={e=>setSearch(e.target.value)}/>
                  {search&&<span onClick={()=>setSearch('')} style={{cursor:'pointer',color:'#8A837A',fontSize:12}}>✕</span>}
                </div>
              )}
              {tab==='wardrobe'&&<button className="iconbtn" onClick={()=>setShowAddW(true)}>+</button>}
              {tab==='wishlist'&&<button className="iconbtn" onClick={()=>setShowAddWL(true)}>+</button>}
            </div>

            {/* Scroll body */}
            <div className="scroll">

              {/* WARDROBE */}
              {tab==='wardrobe'&&<>
                <div className="filterrow">
                  {CATS.map(c=><button key={c} className={`chip${catFilter===c?' active':''}`} onClick={()=>setCat(c)}>{c}</button>)}
                </div>
                {incomplete.length>0&&<div className="banner">
                  <span style={{fontSize:16}}>📋</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:500,color:'#1A1714'}}>{incomplete.length} item{incomplete.length>1?'s':''} need details</div>
                    <div style={{fontSize:10,color:'#8A837A',marginTop:1}}>Tap to fill in store, size and colour whenever you have time</div>
                  </div>
                </div>}
                {fW.length===0?(
                  <div className="empty">
                    <div style={{fontSize:40,marginBottom:10}}>🧺</div>
                    <div className="empty-t">Your wardrobe is empty</div>
                    <div className="empty-s">Tap + to add items. Drop a photo in and fill the details later — no pressure to do it all at once.</div>
                  </div>
                ):<>
                  {fW.some(i=>!i.complete)&&<><div className="seclbl">Needs info</div>
                    <div className="grid">{fW.filter(i=>!i.complete).map(i=><WardrobeCard key={i.id} item={i} onClick={()=>{setSelItem(i);setEditItem(false);}}/>)}</div></>}
                  {fW.some(i=>i.complete)&&<><div className="seclbl">{catFilter==='All'?'All items':catFilter} · {fW.filter(i=>i.complete).length}</div>
                    <div className="grid">{fW.filter(i=>i.complete).map(i=><WardrobeCard key={i.id} item={i} onClick={()=>{setSelItem(i);setEditItem(false);}}/>)}</div></>}
                </>}
              </>}

              {/* WISHLIST */}
              {tab==='wishlist'&&<>
                <div className="filterrow">
                  {['All',...CATS.filter(c=>c!=='All')].map(c=><button key={c} className={`chip${wlFilter===c?' active':''}`} onClick={()=>setWlF(c)}>{c}</button>)}
                </div>
                {fWL.length===0?(
                  <div className="empty">
                    <div style={{fontSize:40,marginBottom:10}}>🛍️</div>
                    <div className="empty-t">Nothing on the wishlist yet</div>
                    <div className="empty-s">Tap + to add items. Paste a link and the store name fills in automatically, or add manually.</div>
                  </div>
                ):<div className="wish-grid">
                  {fWL.map(i=><WishCard key={i.id} item={i} similar={findSimilar(i,wardrobe)}
                    onRate={r=>rateWish(i.id,r)} onClick={()=>{setSelWish(i);setEditWish(false);}}/>)}
                </div>}
              </>}

              {/* STATS */}
              {tab==='stats'&&<>
                <div className="stat-grid">
                  {[{n:wardrobe.filter(i=>i.complete).length,l:'Items in wardrobe'},{n:wishlist.length,l:'On wishlist'},{n:unworn.length,l:'Unworn 30+ days'},{n:wardrobe.filter(i=>i.lastWorn!==null&&i.lastWorn<=7).length,l:'Worn this week'}]
                    .map(s=><div key={s.l} className="stat-card"><div className="stat-n">{s.n}</div><div className="stat-l">{s.l}</div></div>)}
                </div>
                <div className="seclbl" style={{marginTop:6}}>By category</div>
                <div style={{padding:'0 16px 14px'}}>
                  {CATS.filter(c=>c!=='All').map(cat=>{
                    const count=wardrobe.filter(i=>i.category===cat).length; if(!count)return null;
                    const pct=Math.round(count/Math.max(wardrobe.length,1)*100);
                    return <div key={cat} style={{display:'flex',alignItems:'center',gap:10,background:'#fff',borderRadius:10,padding:'9px 12px',border:'1px solid #E0D9CF',marginBottom:6}}>
                      <span style={{fontSize:16,width:24,textAlign:'center'}}>{CAT_EMOJI[cat]}</span>
                      <span style={{fontSize:12,fontWeight:500,width:90,flexShrink:0}}>{cat}</span>
                      <div style={{flex:1,height:3,background:'#E0D9CF',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',background:'#B07848',width:`${pct}%`,borderRadius:2}}/></div>
                      <span style={{fontSize:11,color:'#8A837A',width:24,textAlign:'right',flexShrink:0}}>{count}</span>
                    </div>;
                  })}
                </div>
                {unworn.length>0&&<><div className="seclbl">Consider rewearing</div>
                  <div style={{display:'flex',flexDirection:'column',gap:7,padding:'0 16px 24px'}}>
                    {unworn.slice(0,6).map(i=>(
                      <div key={i.id} onClick={()=>{setSelItem(i);setEditItem(false);setTab('wardrobe');}}
                        style={{display:'flex',alignItems:'center',gap:10,background:'#fff',borderRadius:12,padding:'10px 13px',border:'1px solid #E0D9CF',cursor:'pointer'}}>
                        <div style={{width:36,height:48,borderRadius:6,background:'#F5F0E8',flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
                          {i.photoUrl?<img src={i.photoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:CAT_EMOJI[i.category]}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.name}</div>
                          <div style={{fontSize:10,color:'#C4623A',marginTop:1}}>{daysLabel(i.lastWorn)} · {i.wearCount||0} wears total</div></div>
                        <span style={{fontSize:11,color:'#8A837A',textDecoration:'underline',flexShrink:0}}>View →</span>
                      </div>
                    ))}
                  </div></>}
              </>}

              {/* SIZES */}
              {tab==='sizes'&&<div style={{padding:'10px 16px 24px'}}>
                <div style={{fontSize:12,color:'#8A837A',lineHeight:1.6,marginBottom:12}}>Your saved sizes are highlighted. Tap a store to expand its chart.</div>
                {SIZE_GUIDES.map((sg,i)=>{
                  const isOpen=openStore===i;
                  const myS=wardrobe.filter(w=>w.store===sg.store).map(w=>w.size);
                  const hasIn=sg.sizes.some(s=>s.inseam);
                  return <div key={sg.store} className="store-card">
                    <div className="store-hd" onClick={()=>setOS(isOpen?null:i)}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500}}>{sg.store}</div>
                        <div style={{fontSize:10,color:'#8A837A'}}>{sg.cat} · {sg.country}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        {myS.length>0&&<span style={{fontSize:10,background:'#F5EDE2',color:'#B07848',padding:'2px 7px',borderRadius:10,fontWeight:500}}>{myS.join(', ')}</span>}
                        <span style={{fontSize:11,color:'#8A837A',transition:'transform .2s',display:'inline-block',transform:isOpen?'rotate(180deg)':'none'}}>▼</span>
                      </div>
                    </div>
                    {isOpen&&<div className="size-wrap"><table><thead><tr>
                      <th>Size</th><th>AU</th><th>Bust</th><th>Waist</th><th>Hip</th>
                      {hasIn&&<th>Inseam</th>}
                    </tr></thead><tbody>
                      {sg.sizes.map(s=>{const mine=myS.includes(s.l); return <tr key={s.l} className={mine?'my-row':''}>
                        <td>{s.l}{mine&&<span style={{fontSize:8,color:'#B07848',fontWeight:600,marginLeft:3}}>★ mine</span>}</td>
                        <td>{s.au}</td><td>{s.bust}</td><td>{s.waist}</td><td>{s.hip}</td>
                        {hasIn&&<td>{s.inseam||'—'}</td>}
                      </tr>;})}
                    </tbody></table></div>}
                  </div>;
                })}
              </div>}

              {/* ASK */}
              {tab==='ask'&&<div className="ask-wrap">
                <div className="ask-box">
                  <div className="ask-input-row">
                    <input className="ask-input" placeholder="e.g. What size are my Levi's jeans?"
                      value={askQ} onChange={e=>setAskQ(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&handleAsk()}/>
                    <button onClick={()=>handleAsk()} style={{padding:'7px 13px',background:'#1A1714',color:'#fff',border:'none',borderRadius:8,fontSize:11,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Ask</button>
                  </div>
                  <div>{ASK_SUGG.map(q=><div key={q} onClick={()=>handleAsk(q)}
                    style={{padding:'9px 14px',fontSize:12,color:'#8A837A',cursor:'pointer',borderTop:'1px solid #E0D9CF'}}>{q}</div>)}</div>
                </div>
                {askResult&&<div style={{background:'#1A1714',borderRadius:14,padding:16,color:'#fff'}}>
                  <div style={{fontSize:9,letterSpacing:1,textTransform:'uppercase',color:'rgba(255,255,255,.45)',marginBottom:5}}>{askResult.query}</div>
                  {askResult.notFound
                    ? <><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,marginBottom:6}}>Nothing found</div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,.7)',lineHeight:1.7}}>No items matched. Try a brand name, colour, or category.</div></>
                    : <><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,marginBottom:6,lineHeight:1.3}}>
                          {askResult.item.name} — {askResult.item.sizeLabel||askResult.item.size||'size not set'}</div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,.7)',lineHeight:1.7,whiteSpace:'pre-line'}}>
                          {[askResult.item.brand,askResult.item.color,askResult.item.category,askResult.item.store&&`from ${askResult.item.store}`].filter(Boolean).join(' · ')}
                          {askResult.sRow?`\n\n${askResult.guide.store} size ${askResult.sRow.l}:\nBust ${askResult.sRow.bust}cm · Waist ${askResult.sRow.waist}cm · Hip ${askResult.sRow.hip}cm${askResult.sRow.inseam?` · Inseam ${askResult.sRow.inseam}`:''}`:askResult.guide?'\n\nSize guide available — check the Sizes tab.':''}</div></>}
                </div>}
                {!askResult&&<div style={{background:'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid #E0D9CF'}}>
                  <div style={{fontSize:10,color:'#8A837A',marginBottom:8,letterSpacing:'.5px',textTransform:'uppercase'}}>Try asking</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {ASK_SUGG.map(q=><div key={q} onClick={()=>handleAsk(q)}
                      style={{padding:'5px 11px',borderRadius:20,border:'1px solid #E0D9CF',background:'#fff',fontSize:11,color:'#8A837A',cursor:'pointer'}}>{q}</div>)}
                  </div>
                </div>}
              </div>}

            </div>{/* end scroll */}

            {/* Bottom nav (mobile) */}
            <div className="botnav">
              {NAV_ITEMS.map(n=>(
                <button key={n.key} className={`navitem${tab===n.key?' active':''}`} onClick={()=>setTab(n.key)}>
                  <span className="nl">{n.label}</span>
                  {tab===n.key&&<span className="navdot"/>}
                </button>
              ))}
            </div>

          </div>{/* end content-area */}
        </div>{/* end app-inner */}

        {/* Sheets */}
        {showAddW  && <AddWardrobeSheet   onSave={addItem}  onClose={()=>setShowAddW(false)}/>}
        {showAddWL && <AddWishSheet       onSave={addWish}  onClose={()=>setShowAddWL(false)}/>}
        {selItem&&!editItem && <WardrobeDetailSheet item={selItem} onClose={()=>setSelItem(null)} onEdit={()=>setEditItem(true)} onMarkWorn={()=>markWorn(selItem)} onDelete={()=>delItem(selItem.id)}/>}
        {selItem&&editItem  && <EditWardrobeSheet   item={selItem} onSave={saveItem} onCancel={()=>setEditItem(false)}/>}
        {selWish&&!editWish && <WishDetailSheet item={selWish} similar={findSimilar(selWish,wardrobe)} onClose={()=>setSelWish(null)} onEdit={()=>setEditWish(true)} onDelete={()=>delWish(selWish.id)} onRate={r=>rateWish(selWish.id,r)} onMoveToWardrobe={()=>bought(selWish)}/>}
        {selWish&&editWish  && <EditWishSheet   item={selWish} onSave={saveWish} onCancel={()=>setEditWish(false)}/>}

      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
