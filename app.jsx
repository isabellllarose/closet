/* global React, ReactDOM */
const { useState, useRef, useEffect, useCallback } = React;

// ── Persistent storage helpers ────────────────────────────────────────────────
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Data constants ─────────────────────────────────────────────────────────────
const CATS = ['All','Tops','Bottoms','Dresses','Outerwear','Shoes','Bags','Accessories'];
const OCCASIONS = ['Casual','Work','Evening','Event','Gym','Holiday'];
const OCC_C = {
  Casual:{bg:'#EEF5EC',b:'#89BE7B',t:'#3A7A2B'},
  Work:{bg:'#EAF0F8',b:'#7BA4D0',t:'#1E5799'},
  Evening:{bg:'#F3EEF8',b:'#A47BC4',t:'#5D2A8A'},
  Event:{bg:'#FDF3EC',b:'#E0A86A',t:'#8A4A10'},
  Gym:{bg:'#EDFAF4',b:'#62C99A',t:'#1A7A52'},
  Holiday:{bg:'#FEF0F0',b:'#E07B7B',t:'#8A1C1C'},
};
const CAT_EMOJI = {
  Tops:'👕',Bottoms:'👖',Dresses:'👗',Outerwear:'🧥',
  Shoes:'👟',Bags:'👜',Accessories:'💍'
};
const NEED_LABELS = ['','Nice to have','Want it','Really want it','Need it','Genuinely need'];

const SIZE_GUIDES = [
  { store:'Cotton On', cat:'Tops & Bottoms', country:'AU',
    sizes:[{l:'XS',au:'6',bust:'80–83',waist:'62–65',hip:'87–90'},{l:'S',au:'8',bust:'84–87',waist:'66–69',hip:'91–94'},{l:'M',au:'10',bust:'88–91',waist:'70–73',hip:'95–98'},{l:'L',au:'12',bust:'92–95',waist:'74–77',hip:'99–102'},{l:'XL',au:'14',bust:'96–101',waist:'78–83',hip:'103–108'}]},
  { store:'Zara', cat:'Tops & Bottoms', country:'AU/EU',
    sizes:[{l:'XS',au:'6',bust:'79–81',waist:'61–63',hip:'87–89'},{l:'S',au:'8',bust:'83–85',waist:'65–67',hip:'91–93'},{l:'M',au:'10–12',bust:'87–89',waist:'69–71',hip:'95–97'},{l:'L',au:'14',bust:'91–93',waist:'73–75',hip:'99–101'},{l:'XL',au:'16',bust:'96–98',waist:'79–81',hip:'105–107'}]},
  { store:'ASOS', cat:'Tops & Bottoms', country:'AU',
    sizes:[{l:'XS',au:'6',bust:'82',waist:'62',hip:'88'},{l:'S',au:'8',bust:'86',waist:'66',hip:'92'},{l:'M',au:'10',bust:'90',waist:'70',hip:'96'},{l:'L',au:'12',bust:'94',waist:'74',hip:'100'},{l:'XL',au:'14',bust:'98',waist:'78',hip:'104'}]},
  { store:"Levi's", cat:'Jeans (waist size)', country:'AU',
    sizes:[{l:'24',au:'6',bust:'—',waist:'61',hip:'84',inseam:'30"'},{l:'25',au:'6–8',bust:'—',waist:'63',hip:'86',inseam:'30"'},{l:'26',au:'8',bust:'—',waist:'66',hip:'89',inseam:'30"'},{l:'27',au:'8–10',bust:'—',waist:'69',hip:'92',inseam:'30"'},{l:'28',au:'10',bust:'—',waist:'72',hip:'95',inseam:'30"'},{l:'29',au:'10–12',bust:'—',waist:'75',hip:'98',inseam:'30"'},{l:'30',au:'12',bust:'—',waist:'78',hip:'101',inseam:'30"'},{l:'31',au:'12–14',bust:'—',waist:'81',hip:'104',inseam:'30"'},{l:'32',au:'14',bust:'—',waist:'84',hip:'107',inseam:'30"'}]},
  { store:'H&M', cat:'Tops & Bottoms', country:'AU',
    sizes:[{l:'XS',au:'6',bust:'78–82',waist:'60–64',hip:'86–90'},{l:'S',au:'8',bust:'82–86',waist:'64–68',hip:'90–94'},{l:'M',au:'10–12',bust:'86–90',waist:'68–72',hip:'94–98'},{l:'L',au:'14',bust:'92–96',waist:'74–78',hip:'100–104'},{l:'XL',au:'16',bust:'98–102',waist:'80–84',hip:'106–110'}]},
  { store:'Princess Polly', cat:'Tops & Dresses', country:'AU',
    sizes:[{l:'4',au:'4',bust:'77',waist:'58',hip:'83'},{l:'6',au:'6',bust:'80',waist:'62',hip:'87'},{l:'8',au:'8',bust:'84',waist:'66',hip:'91'},{l:'10',au:'10',bust:'88',waist:'70',hip:'95'},{l:'12',au:'12',bust:'93',waist:'75',hip:'100'}]},
  { store:'Glassons', cat:'Tops & Bottoms', country:'AU/NZ',
    sizes:[{l:'XS',au:'6',bust:'80',waist:'62',hip:'87'},{l:'S',au:'8',bust:'84',waist:'66',hip:'91'},{l:'M',au:'10',bust:'88',waist:'70',hip:'95'},{l:'L',au:'12',bust:'93',waist:'75',hip:'100'},{l:'XL',au:'14',bust:'98',waist:'80',hip:'105'}]},
  { store:'The Iconic', cat:'Multi-brand (AU)', country:'AU',
    sizes:[{l:'XS',au:'6',bust:'80–83',waist:'62–65',hip:'86–89'},{l:'S',au:'8',bust:'84–87',waist:'66–69',hip:'90–93'},{l:'M',au:'10',bust:'88–91',waist:'70–73',hip:'94–97'},{l:'L',au:'12',bust:'92–95',waist:'74–77',hip:'98–101'},{l:'XL',au:'14',bust:'96–99',waist:'78–81',hip:'102–105'}]},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysLabel(d) {
  if (d === null || d === undefined) return 'Never worn';
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.round(d/7)}w ago`;
  return `${Math.round(d/30)}mo ago`;
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function today() { return new Date().toISOString().slice(0,7); }

function findSimilar(wishItem, wardrobe) {
  if (!wishItem.category) return [];
  return wardrobe.filter(w => {
    if (!w.complete) return false;
    const catMatch = w.category === wishItem.category;
    const colorWord = (wishItem.color||'').toLowerCase().split(' ')[0];
    const colorMatch = colorWord && (w.color||'').toLowerCase().includes(colorWord);
    return catMatch && colorMatch;
  });
}

// ── Shared Components ─────────────────────────────────────────────────────────
function StarDisplay({ rating, max=5, size=12, onClick }) {
  return (
    <div style={{display:'flex',gap:2}}>
      {Array.from({length:max}).map((_,i) => (
        <span key={i}
          onClick={e=>{e.stopPropagation();onClick&&onClick(i+1);}}
          style={{fontSize:size,cursor:onClick?'pointer':'default',
            color:i<rating?'#C9A050':'#DDD6CA',lineHeight:1}}>★</span>
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
        transform:on?'translateX(18px)':'translateX(0)'}}/>
    </div>
  );
}

function OccChips({ selected, onChange }) {
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:4}}>
      {OCCASIONS.map(o => {
        const c = OCC_C[o]; const sel = selected.includes(o);
        return <div key={o} onClick={()=>onChange(sel?selected.filter(x=>x!==o):[...selected,o])}
          style={{padding:'4px 10px',borderRadius:20,fontSize:11,border:`1.5px solid ${c.b}`,
            cursor:'pointer',background:sel?c.b:c.bg,color:sel?'#fff':c.t,
            fontFamily:"'Jost',sans-serif"}}>
          {o}</div>;
      })}
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

function Sheet({ title, onClose, children, actions }) {
  return (
    <div onClick={onClose}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,
        display:'flex',flexDirection:'column',justifyContent:'flex-end',backdropFilter:'blur(5px)'}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:'#FDFAF5',borderRadius:'24px 24px 0 0',maxHeight:'94vh',
          display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{width:36,height:4,background:'#E0D9CF',borderRadius:2,margin:'14px auto 0',flexShrink:0}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'12px 20px 10px',borderBottom:'1px solid #E0D9CF',flexShrink:0}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300}}>{title}</div>
          <button onClick={onClose}
            style={{background:'none',border:'none',fontSize:18,cursor:'pointer',
              color:'#8A837A',lineHeight:1,padding:'2px 4px'}}>✕</button>
        </div>
        <div style={{padding:'16px 20px',flex:1,overflowY:'auto'}}>
          {children}
        </div>
        {actions && (
          <div style={{display:'flex',gap:8,padding:'12px 20px calc(12px + env(safe-area-inset-bottom,20px))',
            borderTop:'1px solid #E0D9CF',flexShrink:0}}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

function BtnO({ onClick, children }) {
  return <button onClick={onClick}
    style={{flex:1,padding:12,border:'1.5px solid #E0D9CF',borderRadius:12,background:'none',
      fontSize:13,cursor:'pointer',fontFamily:"'Jost',sans-serif",color:'#1A1714'}}>
    {children}</button>;
}
function BtnF({ onClick, disabled, children, color='#1A1714' }) {
  return <button onClick={onClick} disabled={disabled}
    style={{flex:1,padding:12,border:'none',borderRadius:12,background:color,
      color:'#fff',fontSize:13,cursor:disabled?'default':'pointer',
      fontFamily:"'Jost',sans-serif",opacity:disabled?.35:1}}>
    {children}</button>;
}

function FGrp({ label, children, style={} }) {
  return <div style={{marginBottom:11,...style}}>
    <label style={{fontSize:10,letterSpacing:'.8px',textTransform:'uppercase',
      color:'#8A837A',marginBottom:4,display:'block'}}>{label}</label>
    {children}
  </div>;
}
function FInp({ value, onChange, placeholder='', type='text', style={} }) {
  return <input type={type} value={value||''} onChange={onChange} placeholder={placeholder}
    style={{width:'100%',padding:'9px 12px',border:'1.5px solid #E0D9CF',borderRadius:10,
      fontSize:13,fontFamily:"'Jost',sans-serif",background:'#fff',color:'#1A1714',
      outline:'none',...style}}/>;
}
function FSel({ value, onChange, options }) {
  return <select value={value} onChange={onChange}
    style={{width:'100%',padding:'9px 12px',border:'1.5px solid #E0D9CF',borderRadius:10,
      fontSize:13,fontFamily:"'Jost',sans-serif",background:'#fff',color:'#1A1714',
      outline:'none',WebkitAppearance:'none'}}>
    {options.map(o=><option key={o}>{o}</option>)}
  </select>;
}
function FRow({ children }) {
  return <div style={{display:'flex',gap:8}}>{children}</div>;
}
function DetailRow({ label, value }) {
  if (!value) return null;
  return <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',
    padding:'8px 0',borderBottom:'1px solid #E0D9CF',gap:12}}>
    <span style={{fontSize:11,color:'#8A837A',flexShrink:0}}>{label}</span>
    <span style={{fontSize:12,fontWeight:500,color:'#1A1714',textAlign:'right'}}>{value}</span>
  </div>;
}

// ── CSS injected once ─────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  .app{display:flex;flex-direction:column;height:100dvh;height:100vh;background:#F5F0E8;overflow:hidden;max-width:430px;margin:0 auto;}
  .scroll{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;}
  .scroll::-webkit-scrollbar{display:none;}
  .topbar{display:flex;align-items:center;gap:10px;padding:14px 18px 11px;background:#FDFAF5;border-bottom:1px solid #E0D9CF;flex-shrink:0;padding-top:calc(14px + env(safe-area-inset-top,0px));}
  .logo{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:300;letter-spacing:3px;color:#1A1714;flex-shrink:0;}
  .searchbox{flex:1;display:flex;align-items:center;gap:6px;background:#F5F0E8;border:1px solid #E0D9CF;border-radius:10px;padding:7px 10px;}
  .searchbox input{flex:1;border:none;background:none;font-size:12px;font-family:'Jost',sans-serif;color:#1A1714;outline:none;}
  .searchbox input::placeholder{color:#8A837A;}
  .iconbtn{width:34px;height:34px;border-radius:50%;background:#1A1714;border:none;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .botnav{display:flex;background:#FDFAF5;border-top:1px solid #E0D9CF;padding:8px 0;padding-bottom:calc(8px + env(safe-area-inset-bottom,20px));flex-shrink:0;}
  .navitem{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;border:none;background:none;cursor:pointer;padding:4px 0;}
  .navitem .ni{font-size:17px;line-height:1;}
  .navitem .nl{font-size:9px;letter-spacing:.8px;text-transform:uppercase;color:#8A837A;}
  .navitem.active .nl{color:#1A1714;font-weight:500;}
  .navdot{width:4px;height:4px;border-radius:50%;background:#B07848;margin-top:1px;}
  .filterrow{display:flex;gap:6px;padding:10px 16px 6px;overflow-x:auto;flex-shrink:0;}
  .filterrow::-webkit-scrollbar{display:none;}
  .chip{flex-shrink:0;padding:5px 12px;border-radius:20px;border:1.5px solid #E0D9CF;background:#fff;font-size:11px;cursor:pointer;color:#8A837A;font-family:'Jost',sans-serif;transition:all .15s;white-space:nowrap;}
  .chip.active{background:#1A1714;border-color:#1A1714;color:#fff;}
  .seclbl{padding:4px 16px 6px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8A837A;font-weight:500;}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 16px 24px;}
  .icard{border-radius:14px;overflow:hidden;background:#fff;border:1.5px solid #E0D9CF;cursor:pointer;transition:transform .15s;position:relative;}
  .icard:active{transform:scale(0.97);}
  .icard.incomplete{border-style:dashed;}
  .iphoto{width:100%;aspect-ratio:3/4;background:#F5F0E8;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
  .iphoto img{width:100%;height:100%;object-fit:cover;}
  .iphoto-ph{display:flex;flex-direction:column;align-items:center;gap:3px;}
  .badge-warn{position:absolute;top:5px;right:5px;background:#B07848;color:#fff;font-size:8px;padding:2px 5px;border-radius:4px;}
  .badge-worn{position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,.52);color:#fff;font-size:8px;padding:2px 5px;border-radius:4px;backdrop-filter:blur(4px);}
  .iinfo{padding:6px 8px 8px;}
  .iname{font-size:11px;font-weight:500;color:#1A1714;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .imeta{font-size:9.5px;color:#8A837A;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .isize{font-size:9.5px;font-weight:500;color:#B07848;margin-top:1px;}
  .wcard{background:#fff;border-radius:14px;border:1.5px solid #E0D9CF;cursor:pointer;transition:transform .15s;overflow:hidden;}
  .wcard:active{transform:scale(0.98);}
  .wimg{width:100%;aspect-ratio:4/3;background:#F5F0E8;display:flex;align-items:center;justify-content:center;overflow:hidden;}
  .wimg img{width:100%;height:100%;object-fit:cover;}
  .stat-card{background:#fff;border-radius:14px;padding:14px;border:1px solid #E0D9CF;}
  .stat-n{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:300;}
  .stat-l{font-size:10px;color:#8A837A;margin-top:2px;}
  .store-card{background:#fff;border-radius:12px;border:1px solid #E0D9CF;overflow:hidden;margin-bottom:8px;}
  .store-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:pointer;}
  table{width:100%;border-collapse:collapse;font-size:10px;}
  th{background:#F5F0E8;padding:6px 8px;text-align:left;font-weight:500;font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:#8A837A;white-space:nowrap;border-top:1px solid #E0D9CF;}
  td{padding:6px 8px;border-top:1px solid #E0D9CF;color:#1A1714;white-space:nowrap;}
  .my-row td{background:#F5EDE2;font-weight:500;}
  .ask-box{background:#fff;border-radius:14px;border:1px solid #E0D9CF;overflow:hidden;}
  .ask-input-row{display:flex;align-items:center;gap:8px;padding:11px 13px;}
  .ask-input{flex:1;border:none;background:none;font-size:13px;font-family:'Jost',sans-serif;color:#1A1714;outline:none;}
  .ask-input::placeholder{color:#8A837A;}
  .banner{margin:8px 16px;background:#F5EDE2;border-radius:12px;padding:10px 13px;border:1px solid #DEC9AF;display:flex;align-items:center;gap:8px;}
  .empty{text-align:center;padding:44px 24px;}
  .empty-t{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:300;margin-bottom:6px;}
  .empty-s{font-size:12px;color:#8A837A;line-height:1.6;}
  .simflag{font-size:9px;background:#F5EDE2;color:#B07848;border-radius:5px;padding:2px 6px;margin-top:5px;display:inline-block;}
  .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid #E0D9CF;}
`;

// ── WARDROBE FORMS ────────────────────────────────────────────────────────────
function AddWardrobeSheet({ onSave, onClose }) {
  const [d, setD] = useState({
    name:'',category:'Tops',brand:'',store:'',color:'',
    size:'',sizeLabel:'',photoUrl:null,occasions:[],dateBought:'',notes:''
  });
  const up = f => setD(p=>({...p,...f}));

  function save(photoOnly=false) {
    onSave({...d, id:uid(), complete:!photoOnly&&!!(d.name&&d.category),
      sizeLabel:d.sizeLabel||d.size, name:d.name||'New item',
      lastWorn:null, wearCount:0});
  }

  return (
    <Sheet title="Add item" onClose={onClose} actions={<>
      <BtnO onClick={onClose}>Cancel</BtnO>
      <BtnF onClick={()=>save()}>{d.name?'Add to wardrobe':'Save anyway'}</BtnF>
    </>}>
      <div style={{display:'flex',gap:12,marginBottom:14}}>
        <PhotoZone photoUrl={d.photoUrl} onPhoto={u=>up({photoUrl:u})}
          style={{flex:'0 0 110px',height:146}}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          <FGrp label="Name" style={{marginBottom:0}}>
            <FInp value={d.name} placeholder="e.g. White linen shirt"
              onChange={e=>up({name:e.target.value})}/>
          </FGrp>
          <FGrp label="Category" style={{marginBottom:0}}>
            <FSel value={d.category} onChange={e=>up({category:e.target.value})}
              options={CATS.filter(c=>c!=='All')}/>
          </FGrp>
        </div>
      </div>
      <FRow>
        <FGrp label="Brand"><FInp value={d.brand} placeholder="Zara"
          onChange={e=>up({brand:e.target.value,store:d.store||e.target.value})}/></FGrp>
        <FGrp label="Colour"><FInp value={d.color} placeholder="Navy"
          onChange={e=>up({color:e.target.value})}/></FGrp>
      </FRow>
      <FRow>
        <FGrp label="Size"><FInp value={d.size} placeholder="S / 10 / 27"
          onChange={e=>up({size:e.target.value,sizeLabel:e.target.value})}/></FGrp>
        <FGrp label="Date bought"><FInp value={d.dateBought} placeholder="2024-03"
          onChange={e=>up({dateBought:e.target.value})}/></FGrp>
      </FRow>
      <FGrp label="Store"><FInp value={d.store} placeholder="Where you bought it"
        onChange={e=>up({store:e.target.value})}/></FGrp>
      <FGrp label="Notes"><FInp value={d.notes} placeholder="Fit, where you wear it…"
        onChange={e=>up({notes:e.target.value})}/></FGrp>
      <FGrp label="Occasions"><OccChips selected={d.occasions}
        onChange={o=>up({occasions:o})}/></FGrp>
      {d.photoUrl && !d.name && (
        <div onClick={()=>save(true)}
          style={{fontSize:11,color:'#8A837A',textDecoration:'underline',cursor:'pointer',
            textAlign:'center',padding:'8px 0'}}>
          Save photo only — I'll fill details in later
        </div>
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
        <PhotoZone photoUrl={f.photoUrl} onPhoto={u=>up({photoUrl:u})}
          label="Tap to change" style={{flex:'0 0 110px',height:146}}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          <FGrp label="Name" style={{marginBottom:0}}>
            <FInp value={f.name} onChange={e=>up({name:e.target.value})}/></FGrp>
          <FGrp label="Category" style={{marginBottom:0}}>
            <FSel value={f.category} onChange={e=>up({category:e.target.value})}
              options={CATS.filter(c=>c!=='All')}/></FGrp>
        </div>
      </div>
      <FRow>
        <FGrp label="Brand"><FInp value={f.brand} onChange={e=>up({brand:e.target.value})}/></FGrp>
        <FGrp label="Store"><FInp value={f.store} onChange={e=>up({store:e.target.value})}/></FGrp>
      </FRow>
      <FRow>
        <FGrp label="Colour"><FInp value={f.color} onChange={e=>up({color:e.target.value})}/></FGrp>
        <FGrp label="Size"><FInp value={f.size}
          onChange={e=>up({size:e.target.value,sizeLabel:e.target.value})}/></FGrp>
      </FRow>
      <FRow>
        <FGrp label="Date bought"><FInp value={f.dateBought} placeholder="2024-03"
          onChange={e=>up({dateBought:e.target.value})}/></FGrp>
        <FGrp label="Total wears"><FInp value={f.wearCount} type="number"
          onChange={e=>up({wearCount:parseInt(e.target.value)||0})}/></FGrp>
      </FRow>
      <FGrp label="Notes"><FInp value={f.notes}
        onChange={e=>up({notes:e.target.value})}/></FGrp>
      <FGrp label="Occasions"><OccChips selected={f.occasions||[]}
        onChange={o=>up({occasions:o})}/></FGrp>
    </Sheet>
  );
}

function WardrobeDetailSheet({ item, onClose, onEdit, onMarkWorn, onDelete }) {
  return (
    <Sheet title={item.name||'Untitled'} onClose={onClose}>
      <div style={{width:'100%',aspectRatio:'3/4',maxHeight:240,background:'#F5F0E8',
        display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',
        borderRadius:14,marginBottom:14}}>
        {item.photoUrl
          ? <img src={item.photoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          : <span style={{fontSize:52}}>{CAT_EMOJI[item.category]||'👗'}</span>}
      </div>
      {!item.complete && (
        <div style={{background:'#F5EDE2',borderRadius:10,padding:'9px 12px',
          marginBottom:12,border:'1px solid #DEC9AF',fontSize:12,color:'#B07848'}}>
          Some details are still missing. Tap Edit to fill them in.
        </div>
      )}
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
        <button onClick={onMarkWorn}
          style={{flex:1,padding:11,background:'#5A8A60',color:'#fff',border:'none',
            borderRadius:12,fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>
          ✓ Worn today</button>
        <button onClick={onEdit}
          style={{flex:1,padding:11,border:'1.5px solid #E0D9CF',borderRadius:12,
            background:'none',fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>
          Edit</button>
        <button onClick={onDelete}
          style={{padding:'11px 14px',border:'1.5px solid #EAC8C8',borderRadius:12,
            background:'none',fontSize:12,cursor:'pointer',color:'#C4623A',fontFamily:"'Jost',sans-serif"}}>
          🗑</button>
      </div>
    </Sheet>
  );
}

// ── WISHLIST FORMS ────────────────────────────────────────────────────────────
function AddWishSheet({ onSave, onClose }) {
  const [d, setD] = useState({
    name:'',store:'',brand:'',url:'',price:'',origPrice:'',
    onSale:false,rating:3,photoUrl:null,notes:'',category:'Tops',color:''
  });
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const up = v => setD(p=>({...p,...v}));

  async function fetchUrl() {
    if (!urlInput.trim()) return;
    setLoading(true);
    await new Promise(r=>setTimeout(r,800));
    let storeName = '';
    try { storeName = new URL(urlInput).hostname.replace('www.','').split('.')[0]; } catch {}
    storeName = storeName ? storeName.charAt(0).toUpperCase()+storeName.slice(1) : '';
    up({url:urlInput, store:d.store||storeName, name:d.name||`Item from ${storeName}`});
    setLoading(false);
  }

  return (
    <Sheet title="Add to wishlist" onClose={onClose} actions={<>
      <BtnO onClick={onClose}>Cancel</BtnO>
      <BtnF onClick={()=>onSave({...d,id:uid(),addedDate:today()})}
        disabled={!d.name} color="#B07848">Add to wishlist</BtnF>
    </>}>
      <FGrp label="Paste a link (optional)">
        <div style={{display:'flex',gap:6}}>
          <FInp value={urlInput} placeholder="https://zara.com/product/…"
            onChange={e=>setUrlInput(e.target.value)} style={{flex:1}}/>
          <BtnF onClick={fetchUrl} disabled={loading||!urlInput}
            style={{flex:'0 0 64px',padding:'9px 0',fontSize:12}}>
            {loading?'…':'Fetch'}
          </BtnF>
        </div>
        <div style={{fontSize:10,color:'#8A837A',marginTop:3}}>
          Fetches store name automatically — you can edit everything after
        </div>
      </FGrp>

      {d.url && (
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',
          background:'#F5F0E8',borderRadius:10,marginBottom:12,border:'1px solid #E0D9CF'}}>
          <span>🔗</span>
          <span style={{fontSize:11,color:'#B07848',flex:1,overflow:'hidden',
            textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.url}</span>
        </div>
      )}

      <div style={{display:'flex',gap:12,marginBottom:14}}>
        <PhotoZone photoUrl={d.photoUrl} onPhoto={u=>up({photoUrl:u})}
          label="Image" style={{flex:'0 0 100px',height:133}}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          <FGrp label="Item name" style={{marginBottom:0}}>
            <FInp value={d.name} placeholder="e.g. Barrel leg jeans"
              onChange={e=>up({name:e.target.value})}/></FGrp>
          <FGrp label="Category" style={{marginBottom:0}}>
            <FSel value={d.category} onChange={e=>up({category:e.target.value})}
              options={CATS.filter(c=>c!=='All')}/></FGrp>
        </div>
      </div>

      <FRow>
        <FGrp label="Store"><FInp value={d.store} placeholder="Zara"
          onChange={e=>up({store:e.target.value})}/></FGrp>
        <FGrp label="Colour"><FInp value={d.color} placeholder="Black"
          onChange={e=>up({color:e.target.value})}/></FGrp>
      </FRow>

      <FRow>
        <FGrp label="Price (A$)"><FInp value={d.price} placeholder="89.95" type="number"
          onChange={e=>up({price:e.target.value})}/></FGrp>
        {d.onSale && (
          <FGrp label="Original price (A$)"><FInp value={d.origPrice} placeholder="119.95" type="number"
            onChange={e=>up({origPrice:e.target.value})}/></FGrp>
        )}
      </FRow>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'10px 0',borderTop:'1px solid #E0D9CF'}}>
        <div>
          <div style={{fontSize:13,color:'#1A1714'}}>On sale</div>
          <div style={{fontSize:10,color:'#8A837A',marginTop:1}}>
            Toggle on if this is a sale price
          </div>
        </div>
        <Toggle on={d.onSale} onToggle={()=>up({onSale:!d.onSale,origPrice:''})}/>
      </div>

      <FGrp label="How much do you need this? (1 = nice to have, 5 = genuinely need)"
        style={{marginTop:10}}>
        <div style={{display:'flex',gap:4,marginTop:4}}>
          {[1,2,3,4,5].map(i=>(
            <span key={i} onClick={()=>up({rating:i})}
              style={{fontSize:28,cursor:'pointer',color:i<=d.rating?'#C9A050':'#DDD6CA',lineHeight:1}}>★</span>
          ))}
        </div>
        <div style={{fontSize:10,color:'#8A837A',marginTop:4}}>{NEED_LABELS[d.rating]}</div>
      </FGrp>

      <FGrp label="Notes"><FInp value={d.notes}
        placeholder="Why you want it, what you'd wear it with…"
        onChange={e=>up({notes:e.target.value})}/></FGrp>
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
        <PhotoZone photoUrl={f.photoUrl} onPhoto={u=>up({photoUrl:u})}
          label="Tap to change" style={{flex:'0 0 100px',height:133}}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          <FGrp label="Name" style={{marginBottom:0}}>
            <FInp value={f.name} onChange={e=>up({name:e.target.value})}/></FGrp>
          <FGrp label="Category" style={{marginBottom:0}}>
            <FSel value={f.category} onChange={e=>up({category:e.target.value})}
              options={CATS.filter(c=>c!=='All')}/></FGrp>
        </div>
      </div>
      <FRow>
        <FGrp label="Store"><FInp value={f.store} onChange={e=>up({store:e.target.value})}/></FGrp>
        <FGrp label="Colour"><FInp value={f.color} onChange={e=>up({color:e.target.value})}/></FGrp>
      </FRow>
      <FRow>
        <FGrp label="Price (A$)"><FInp value={f.price} type="number"
          onChange={e=>up({price:e.target.value})}/></FGrp>
        {f.onSale && <FGrp label="Original (A$)"><FInp value={f.origPrice} type="number"
          onChange={e=>up({origPrice:e.target.value})}/></FGrp>}
      </FRow>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'10px 0',borderTop:'1px solid #E0D9CF'}}>
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
      <FGrp label="Link"><FInp value={f.url} placeholder="https://…"
        onChange={e=>up({url:e.target.value})}/></FGrp>
      <FGrp label="Notes"><FInp value={f.notes}
        onChange={e=>up({notes:e.target.value})}/></FGrp>
    </Sheet>
  );
}

function WishDetailSheet({ item, similar, onClose, onEdit, onDelete, onRate, onMoveToWardrobe }) {
  return (
    <Sheet title={item.name} onClose={onClose}>
      <div style={{width:'100%',aspectRatio:'4/3',background:'#F5F0E8',
        display:'flex',alignItems:'center',justifyContent:'center',
        overflow:'hidden',borderRadius:14,marginBottom:14}}>
        {item.photoUrl
          ? <img src={item.photoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          : <span style={{fontSize:44,opacity:.25}}>{CAT_EMOJI[item.category]||'🛍️'}</span>}
      </div>

      {similar.length>0 && (
        <div style={{background:'#F5EDE2',borderRadius:10,padding:'9px 12px',
          marginBottom:12,border:'1px solid #DEC9AF',fontSize:12,color:'#B07848'}}>
          ⚠️ You own something similar — {similar.map(s=>s.name).join(', ')}
        </div>
      )}

      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:'#8A837A',letterSpacing:.5,
          textTransform:'uppercase',marginBottom:6}}>How much do you need this</div>
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

      {item.url && (
        <div onClick={()=>window.open(item.url,'_blank')}
          style={{display:'flex',alignItems:'center',gap:6,padding:'10px 13px',
            background:'#F5F0E8',borderRadius:10,marginTop:10,cursor:'pointer',
            border:'1px solid #E0D9CF'}}>
          <span>🔗</span>
          <span style={{fontSize:11,color:'#B07848',flex:1,overflow:'hidden',
            textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.url}</span>
          <span style={{fontSize:11,color:'#8A837A'}}>↗</span>
        </div>
      )}

      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button onClick={onMoveToWardrobe}
          style={{flex:1,padding:11,background:'#B07848',color:'#fff',border:'none',
            borderRadius:12,fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>
          ✓ I bought it</button>
        <button onClick={onEdit}
          style={{flex:1,padding:11,border:'1.5px solid #E0D9CF',borderRadius:12,
            background:'none',fontSize:12,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>
          Edit</button>
        <button onClick={onDelete}
          style={{padding:'11px 14px',border:'1.5px solid #EAC8C8',borderRadius:12,
            background:'none',fontSize:12,cursor:'pointer',color:'#C4623A',
            fontFamily:"'Jost',sans-serif"}}>🗑</button>
      </div>
    </Sheet>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState('wardrobe');
  const [wardrobe, setWardrobe] = useState(() => load('closet-wardrobe', []));
  const [wishlist, setWishlist] = useState(() => load('closet-wishlist', []));
  const [catFilter, setCat]     = useState('All');
  const [wishFilter, setWishFilter] = useState('All');
  const [search, setSearch]     = useState('');
  const [openStore, setOpenStore] = useState(null);
  const [askQ, setAskQ]         = useState('');
  const [askResult, setAskResult] = useState(null);

  const [showAddW, setShowAddW] = useState(false);
  const [showAddWL, setShowAddWL] = useState(false);
  const [selItem, setSelItem]   = useState(null);
  const [selWish, setSelWish]   = useState(null);
  const [editItem, setEditItem] = useState(false);
  const [editWish, setEditWish] = useState(false);

  // Persist on change
  useEffect(()=>save('closet-wardrobe', wardrobe), [wardrobe]);
  useEffect(()=>save('closet-wishlist', wishlist), [wishlist]);

  // Wardrobe CRUD
  const addItem   = item => { setWardrobe(p=>[...p,item]); setShowAddW(false); };
  const saveItem  = item => {
    const complete = !!(item.name&&item.category&&(item.size||item.brand));
    setWardrobe(p=>p.map(i=>i.id===item.id?{...item,complete}:i));
    setSelItem({...item,complete}); setEditItem(false);
  };
  const delItem   = id => { setWardrobe(p=>p.filter(i=>i.id!==id)); setSelItem(null); };
  const markWorn  = item => {
    const u={...item,lastWorn:0,wearCount:(item.wearCount||0)+1};
    setWardrobe(p=>p.map(i=>i.id===item.id?u:i)); setSelItem(u);
  };

  // Wishlist CRUD
  const addWish   = item => { setWishlist(p=>[...p,item]); setShowAddWL(false); };
  const saveWish  = item => { setWishlist(p=>p.map(i=>i.id===item.id?item:i)); setSelWish(item); setEditWish(false); };
  const delWish   = id => { setWishlist(p=>p.filter(i=>i.id!==id)); setSelWish(null); };
  const rateWish  = (id,r) => {
    setWishlist(p=>p.map(i=>i.id===id?{...i,rating:r}:i));
    setSelWish(p=>p?{...p,rating:r}:p);
  };
  const bought = wish => {
    addItem({...wish,id:uid(),lastWorn:null,wearCount:0,complete:false,
      dateBought:today(),name:wish.name,notes:`From wishlist. ${wish.notes||''}`.trim()});
    delWish(wish.id);
  };

  // Filtered
  const fWardrobe = wardrobe.filter(it => {
    const mc = catFilter==='All'||it.category===catFilter;
    const q  = search.toLowerCase();
    const ms = !q||[it.name,it.brand,it.color,it.store,it.category]
      .some(s=>(s||'').toLowerCase().includes(q));
    return mc&&ms;
  });
  const fWishlist = wishlist.filter(it =>
    (wishFilter==='All'||it.category===wishFilter) &&
    (!search||(it.name||'').toLowerCase().includes(search.toLowerCase())||(it.store||'').toLowerCase().includes(search.toLowerCase()))
  ).sort((a,b)=>b.rating-a.rating);

  const incomplete = wardrobe.filter(i=>!i.complete);
  const unworn     = wardrobe.filter(i=>i.complete&&i.lastWorn!==null&&i.lastWorn>30)
                             .sort((a,b)=>b.lastWorn-a.lastWorn);

  // Ask
  const ASK_SUGG = [
    "What size are my Levi's jeans?",
    "What Zara size do I wear?",
    "Do I have anything black?",
    "When did I last wear my trench coat?",
    "What Cotton On size am I?",
  ];
  function handleAsk(q) {
    const query = (q||askQ).toLowerCase().trim();
    if (!query) return;
    const words = query.split(' ').filter(w=>w.length>3);
    let match = wardrobe.find(it =>
      words.some(w=>[it.name,it.brand,it.color,it.store,it.category]
        .some(s=>(s||'').toLowerCase().includes(w)))
    );
    if (match) {
      const guide = SIZE_GUIDES.find(g=>g.store.toLowerCase()===(match.store||'').toLowerCase());
      const sRow  = guide?.sizes.find(s=>s.l===match.size);
      setAskResult({item:match,guide,sRow,query:q||askQ});
    } else {
      setAskResult({notFound:true,query:q||askQ});
    }
    setAskQ('');
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="app">

        {/* TOP BAR */}
        <div className="topbar">
          <div className="logo">closet</div>
          {(tab==='wardrobe'||tab==='wishlist') && (
            <div className="searchbox">
              <span style={{fontSize:13,color:'#8A837A'}}>⌕</span>
              <input placeholder={tab==='wardrobe'?'Search items, brands, colours…':'Search wishlist…'}
                value={search} onChange={e=>setSearch(e.target.value)}/>
              {search&&<span onClick={()=>setSearch('')}
                style={{cursor:'pointer',color:'#8A837A',fontSize:12}}>✕</span>}
            </div>
          )}
          {(tab==='stats'||tab==='sizes'||tab==='ask')&&(
            <div style={{flex:1,fontFamily:"'Cormorant Garamond',serif",
              fontSize:18,fontWeight:300,color:'#1A1714',paddingLeft:6}}>
              {tab==='stats'?'Stats':tab==='sizes'?'Size guides':'Ask closet'}
            </div>
          )}
          {tab==='wardrobe'&&<button className="iconbtn" onClick={()=>setShowAddW(true)}>+</button>}
          {tab==='wishlist'&&<button className="iconbtn" onClick={()=>setShowAddWL(true)}>+</button>}
        </div>

        <div className="scroll">

          {/* ══ WARDROBE ══ */}
          {tab==='wardrobe'&&<>
            <div className="filterrow">
              {CATS.map(c=><button key={c} className={`chip${catFilter===c?' active':''}`}
                onClick={()=>setCat(c)}>{c}</button>)}
            </div>
            {incomplete.length>0&&(
              <div className="banner">
                <span style={{fontSize:16}}>📋</span>
                <div>
                  <div style={{fontSize:12,fontWeight:500,color:'#1A1714'}}>
                    {incomplete.length} item{incomplete.length>1?'s':''} need details
                  </div>
                  <div style={{fontSize:10,color:'#8A837A',marginTop:1}}>
                    Tap to fill in store, size and colour whenever you have time
                  </div>
                </div>
              </div>
            )}
            {fWardrobe.length===0?(
              <div className="empty">
                <div style={{fontSize:40,marginBottom:10}}>🧺</div>
                <div className="empty-t">Your wardrobe is empty</div>
                <div className="empty-s">Tap + to add items. Drop a photo in and fill the details later — no pressure to do it all at once.</div>
              </div>
            ):<>
              {fWardrobe.some(i=>!i.complete)&&<>
                <div className="seclbl">Needs info</div>
                <div className="grid">
                  {fWardrobe.filter(i=>!i.complete).map(item=>(
                    <WardrobeCard key={item.id} item={item}
                      onClick={()=>{setSelItem(item);setEditItem(false);}}/>
                  ))}
                </div>
              </>}
              {fWardrobe.some(i=>i.complete)&&<>
                <div className="seclbl">
                  {catFilter==='All'?'All items':catFilter} · {fWardrobe.filter(i=>i.complete).length}
                </div>
                <div className="grid">
                  {fWardrobe.filter(i=>i.complete).map(item=>(
                    <WardrobeCard key={item.id} item={item}
                      onClick={()=>{setSelItem(item);setEditItem(false);}}/>
                  ))}
                </div>
              </>}
            </>}
          </>}

          {/* ══ WISHLIST ══ */}
          {tab==='wishlist'&&<>
            <div className="filterrow">
              {['All',...CATS.filter(c=>c!=='All')].map(c=>(
                <button key={c} className={`chip${wishFilter===c?' active':''}`}
                  onClick={()=>setWishFilter(c)}>{c}</button>
              ))}
            </div>
            {fWishlist.length===0?(
              <div className="empty">
                <div style={{fontSize:40,marginBottom:10}}>🛍️</div>
                <div className="empty-t">Nothing on the wishlist yet</div>
                <div className="empty-s">Tap + to add items. Paste a link and the store name fills automatically, or add manually.</div>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:10,padding:'8px 16px 24px'}}>
                {fWishlist.map(item=>{
                  const similar=findSimilar(item,wardrobe);
                  return <WishCard key={item.id} item={item} similar={similar}
                    onRate={r=>rateWish(item.id,r)}
                    onClick={()=>{setSelWish(item);setEditWish(false);}}/>;
                })}
              </div>
            )}
          </>}

          {/* ══ STATS ══ */}
          {tab==='stats'&&<>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,padding:'14px 16px 4px'}}>
              {[
                {n:wardrobe.filter(i=>i.complete).length,l:'Items in wardrobe'},
                {n:wishlist.length,l:'On wishlist'},
                {n:unworn.length,l:'Unworn 30+ days'},
                {n:wardrobe.filter(i=>i.lastWorn!==null&&i.lastWorn<=7).length,l:'Worn this week'},
              ].map(s=>(
                <div key={s.l} className="stat-card">
                  <div className="stat-n">{s.n}</div>
                  <div className="stat-l">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="seclbl" style={{marginTop:6}}>By category</div>
            <div style={{padding:'0 16px 14px'}}>
              {CATS.filter(c=>c!=='All').map(cat=>{
                const count=wardrobe.filter(i=>i.category===cat).length;
                if(!count)return null;
                const pct=Math.round(count/Math.max(wardrobe.length,1)*100);
                return (
                  <div key={cat} style={{display:'flex',alignItems:'center',gap:10,
                    background:'#fff',borderRadius:10,padding:'9px 12px',
                    border:'1px solid #E0D9CF',marginBottom:6}}>
                    <span style={{fontSize:16,width:24,textAlign:'center'}}>{CAT_EMOJI[cat]}</span>
                    <span style={{fontSize:12,fontWeight:500,width:80,flexShrink:0}}>{cat}</span>
                    <div style={{flex:1,height:3,background:'#E0D9CF',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',background:'#B07848',width:`${pct}%`,borderRadius:2}}/>
                    </div>
                    <span style={{fontSize:11,color:'#8A837A',width:24,textAlign:'right',flexShrink:0}}>{count}</span>
                  </div>
                );
              })}
            </div>
            {unworn.length>0&&<>
              <div className="seclbl">Consider rewearing</div>
              <div style={{display:'flex',flexDirection:'column',gap:7,padding:'0 16px 24px'}}>
                {unworn.slice(0,6).map(item=>(
                  <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,
                    background:'#fff',borderRadius:12,padding:'10px 13px',
                    border:'1px solid #E0D9CF',cursor:'pointer'}}
                    onClick={()=>{setSelItem(item);setEditItem(false);setTab('wardrobe');}}>
                    <div style={{width:36,height:48,borderRadius:6,background:'#F5F0E8',
                      flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',
                      justifyContent:'center',fontSize:18}}>
                      {item.photoUrl
                        ?<img src={item.photoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        :CAT_EMOJI[item.category]}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,overflow:'hidden',
                        textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                      <div style={{fontSize:10,color:'#C4623A',marginTop:1}}>
                        {daysLabel(item.lastWorn)} · {item.wearCount||0} wears total</div>
                    </div>
                    <span style={{fontSize:11,color:'#8A837A',textDecoration:'underline',flexShrink:0}}>View →</span>
                  </div>
                ))}
              </div>
            </>}
          </>}

          {/* ══ SIZES ══ */}
          {tab==='sizes'&&(
            <div style={{padding:'10px 16px 24px'}}>
              <div style={{fontSize:12,color:'#8A837A',lineHeight:1.6,marginBottom:12}}>
                Your saved sizes are highlighted. Tap a store to expand its chart.
              </div>
              {SIZE_GUIDES.map((sg,i)=>{
                const isOpen=openStore===i;
                const myS=wardrobe.filter(w=>w.store===sg.store).map(w=>w.size);
                const hasIn=sg.sizes.some(s=>s.inseam);
                return (
                  <div key={sg.store} className="store-card">
                    <div className="store-hd" onClick={()=>setOpenStore(isOpen?null:i)}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500}}>{sg.store}</div>
                        <div style={{fontSize:10,color:'#8A837A'}}>{sg.cat} · {sg.country}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        {myS.length>0&&(
                          <span style={{fontSize:10,background:'#F5EDE2',color:'#B07848',
                            padding:'2px 7px',borderRadius:10,fontWeight:500}}>
                            {myS.join(', ')}
                          </span>
                        )}
                        <span style={{fontSize:11,color:'#8A837A',
                          transition:'transform .2s',display:'inline-block',
                          transform:isOpen?'rotate(180deg)':'none'}}>▼</span>
                      </div>
                    </div>
                    {isOpen&&(
                      <div style={{overflowX:'auto'}}>
                        <table>
                          <thead><tr>
                            <th>Size</th><th>AU</th><th>Bust</th><th>Waist</th><th>Hip</th>
                            {hasIn&&<th>Inseam</th>}
                          </tr></thead>
                          <tbody>
                            {sg.sizes.map(s=>{
                              const mine=myS.includes(s.l);
                              return (
                                <tr key={s.l} className={mine?'my-row':''}>
                                  <td>{s.l}{mine&&<span style={{fontSize:8,color:'#B07848',fontWeight:600,marginLeft:3}}>★ mine</span>}</td>
                                  <td>{s.au}</td><td>{s.bust}</td><td>{s.waist}</td><td>{s.hip}</td>
                                  {hasIn&&<td>{s.inseam||'—'}</td>}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ ASK ══ */}
          {tab==='ask'&&(
            <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
              <div className="ask-box">
                <div className="ask-input-row">
                  <input className="ask-input"
                    placeholder="e.g. What size are my Levi's jeans?"
                    value={askQ} onChange={e=>setAskQ(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&handleAsk()}/>
                  <button onClick={()=>handleAsk()}
                    style={{padding:'7px 13px',background:'#1A1714',color:'#fff',border:'none',
                      borderRadius:8,fontSize:11,cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>Ask</button>
                </div>
                <div>{ASK_SUGG.map(q=>(
                  <div key={q} onClick={()=>handleAsk(q)}
                    style={{padding:'9px 14px',fontSize:12,color:'#8A837A',cursor:'pointer',
                      borderTop:'1px solid #E0D9CF'}}>
                    {q}
                  </div>
                ))}</div>
              </div>

              {askResult&&(
                <div style={{background:'#1A1714',borderRadius:14,padding:16,color:'#fff'}}>
                  <div style={{fontSize:9,letterSpacing:1,textTransform:'uppercase',
                    color:'rgba(255,255,255,.45)',marginBottom:5}}>{askResult.query}</div>
                  {askResult.notFound?(
                    <>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,marginBottom:6}}>Nothing found</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,.7)',lineHeight:1.7}}>
                        No items matched that. Try a brand name, colour, or category.
                      </div>
                    </>
                  ):(
                    <>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,marginBottom:6,lineHeight:1.3}}>
                        {askResult.item.name} — {askResult.item.sizeLabel||askResult.item.size||'size not set'}
                      </div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,.7)',lineHeight:1.7,whiteSpace:'pre-line'}}>
                        {[askResult.item.brand,askResult.item.color,askResult.item.category,
                          askResult.item.store&&`from ${askResult.item.store}`].filter(Boolean).join(' · ')}
                        {askResult.sRow
                          ? `\n\n${askResult.guide.store} size ${askResult.sRow.l}:\nBust ${askResult.sRow.bust}cm · Waist ${askResult.sRow.waist}cm · Hip ${askResult.sRow.hip}cm${askResult.sRow.inseam?` · Inseam ${askResult.sRow.inseam}`:''}`
                          : askResult.guide?`\n\nSize guide available — check the Sizes tab.`:''}
                      </div>
                    </>
                  )}
                </div>
              )}

              {!askResult&&(
                <div style={{background:'#fff',borderRadius:14,padding:'14px 16px',
                  border:'1px solid #E0D9CF'}}>
                  <div style={{fontSize:10,color:'#8A837A',marginBottom:8,
                    letterSpacing:'.5px',textTransform:'uppercase'}}>Try asking</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {ASK_SUGG.map(q=>(
                      <div key={q} onClick={()=>handleAsk(q)}
                        style={{padding:'5px 11px',borderRadius:20,border:'1px solid #E0D9CF',
                          background:'#fff',fontSize:11,color:'#8A837A',cursor:'pointer'}}>
                        {q}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM NAV */}
        <div className="botnav">
          {[
            {key:'wardrobe',icon:'🗂️',label:'Wardrobe'},
            {key:'wishlist',icon:'🛍️',label:'Wishlist'},
            {key:'stats',   icon:'📊',label:'Stats'},
            {key:'sizes',   icon:'📏',label:'Sizes'},
            {key:'ask',     icon:'💬',label:'Ask'},
          ].map(n=>(
            <button key={n.key} className={`navitem${tab===n.key?' active':''}`}
              onClick={()=>setTab(n.key)}>
              <span className="ni">{n.icon}</span>
              <span className="nl">{n.label}</span>
              {tab===n.key&&<span className="navdot"/>}
            </button>
          ))}
        </div>

        {/* Sheets */}
        {showAddW  && <AddWardrobeSheet   onSave={addItem}  onClose={()=>setShowAddW(false)}/>}
        {showAddWL && <AddWishSheet       onSave={addWish}  onClose={()=>setShowAddWL(false)}/>}
        {selItem && !editItem && (
          <WardrobeDetailSheet item={selItem} onClose={()=>setSelItem(null)}
            onEdit={()=>setEditItem(true)} onMarkWorn={()=>markWorn(selItem)}
            onDelete={()=>delItem(selItem.id)}/>
        )}
        {selItem && editItem && (
          <EditWardrobeSheet item={selItem} onSave={saveItem} onCancel={()=>setEditItem(false)}/>
        )}
        {selWish && !editWish && (
          <WishDetailSheet item={selWish} similar={findSimilar(selWish,wardrobe)}
            onClose={()=>setSelWish(null)} onEdit={()=>setEditWish(true)}
            onDelete={()=>delWish(selWish.id)}
            onRate={r=>rateWish(selWish.id,r)}
            onMoveToWardrobe={()=>bought(selWish)}/>
        )}
        {selWish && editWish && (
          <EditWishSheet item={selWish} onSave={saveWish} onCancel={()=>setEditWish(false)}/>
        )}
      </div>
    </>
  );
}

// ── Card components (outside App to avoid re-definition) ──────────────────────
function WardrobeCard({ item, onClick }) {
  return (
    <div className={`icard${!item.complete?' incomplete':''}`} onClick={onClick}>
      <div className="iphoto">
        {item.photoUrl
          ?<img src={item.photoUrl} alt={item.name}/>
          :<div className="iphoto-ph">
            <span style={{fontSize:22,opacity:.35}}>{CAT_EMOJI[item.category]||'👗'}</span>
            <span style={{fontSize:9,color:'#8A837A'}}>{item.category}</span>
          </div>}
        {!item.complete&&<span className="badge-warn">needs info</span>}
        {item.lastWorn!==null&&item.lastWorn!==undefined&&(
          <span className="badge-worn">{daysLabel(item.lastWorn)}</span>
        )}
      </div>
      <div className="iinfo">
        <div className="iname">{item.name||'Untitled'}</div>
        <div className="imeta">{item.brand||item.color||'—'}</div>
        {item.size&&<div className="isize">{item.sizeLabel||item.size}</div>}
      </div>
    </div>
  );
}

function WishCard({ item, similar, onRate, onClick }) {
  return (
    <div className="wcard" onClick={onClick}>
      <div className="wimg">
        {item.photoUrl
          ?<img src={item.photoUrl} alt={item.name}/>
          :<span style={{fontSize:32,opacity:.3}}>{CAT_EMOJI[item.category]||'🛍️'}</span>}
      </div>
      <div style={{padding:'10px 12px'}}>
        <div style={{fontSize:12,fontWeight:500,color:'#1A1714',
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:3}}>
          {item.name}</div>
        <div style={{fontSize:10,color:'#8A837A'}}>{item.store||item.brand||'—'}</div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
          {item.price&&(
            <span style={{fontSize:13,fontWeight:500,color:item.onSale?'#C4623A':'#1A1714'}}>
              A${item.price}</span>
          )}
          {item.onSale&&item.origPrice&&(
            <span style={{fontSize:11,color:'#8A837A',textDecoration:'line-through'}}>
              A${item.origPrice}</span>
          )}
          {item.onSale&&(
            <span style={{fontSize:9,background:'#FEF0F0',color:'#C4623A',
              borderRadius:4,padding:'2px 5px',fontWeight:500}}>Sale</span>
          )}
        </div>
        <div onClick={e=>e.stopPropagation()} style={{marginTop:4}}>
          <StarDisplay rating={item.rating} size={13} onClick={onRate}/>
        </div>
        {similar.length>0&&(
          <div className="simflag">⚠️ You own something similar</div>
        )}
      </div>
    </div>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
