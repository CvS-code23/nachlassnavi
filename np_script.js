// =============================================
// GATE & ADMIN
// =============================================
const ADMIN_CODE    = 'VSS-ADMIN-2025';
const FALLBACK_CODE = 'VSS2025';
const GITHUB_OWNER  = 'CvS-code23';
const GITHUB_REPO   = 'nachlassnavi';

let npCodes = null;

async function gateLoadCodes(){
  // Token aus Code-Manager (gleicher localStorage bei file://)
  const tok = localStorage.getItem('np_cm_token')||'';
  const hdrs = {'Accept':'application/vnd.github.v3+json'};
  if(tok) hdrs['Authorization']='token '+tok;

  // 1. GitHub API (immer aktuell, kein CDN-Cache)
  try{
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/codes.json`,
      {headers:hdrs, cache:'no-store'}
    );
    if(r.ok){
      const meta = await r.json();
      const d = JSON.parse(atob(meta.content.replace(/\s/g,'')));
      if(Array.isArray(d.codes)&&d.codes.length){npCodes=d.codes;return;}
    }
  }catch(e){}

  // 2. Fallback: relative URL (GitHub Pages)
  try{
    const r = await fetch(`./codes.json?t=${Date.now()}`);
    if(r.ok){
      const d = await r.json();
      if(Array.isArray(d.codes)&&d.codes.length){npCodes=d.codes;return;}
    }
  }catch(e){}

  npCodes=[FALLBACK_CODE];
}

let npCodesReady = false;

function showGreeting(){
  const name = sessionStorage.getItem('np_client') || '';
  if(!name) return;
  const el = document.getElementById('np-greeting');
  if(el){ el.textContent = 'Willkommen, ' + name; el.style.display = 'inline'; }
  const mg = document.getElementById('np-modal-greeting');
  if(mg){ mg.textContent = 'Hallo, ' + name + '!'; mg.style.display = 'block'; }
}

(function(){
  if(sessionStorage.getItem('np_auth')==='1'){
    const g = document.getElementById('np-gate');
    if(g) g.remove();
    showGreeting();
    if(localStorage.getItem('np_modal_seen')==='1'){
      const m = document.getElementById('modal_ds');
      if(m) m.style.display='none';
    }
    setTimeout(()=>{initKeine();updateProgress();}, 500);
  } else {
    const btn = document.getElementById('gate-btn');
    if(btn){ btn.disabled=true; btn.textContent='Wird geladen …'; }
    const urlCode = new URLSearchParams(window.location.search).get('code');
    gateLoadCodes().then(()=>{
      npCodesReady = true;
      if(btn){ btn.disabled=false; btn.textContent='Zugang bestätigen'; }
      if(urlCode){
        const inp = document.getElementById('gate-code');
        if(inp){ inp.value=urlCode; gateSubmit(); }
      }
    });
  }
})();

async function gateSubmit(){
  if(!npCodesReady) await gateLoadCodes().then(()=>{ npCodesReady=true; });
  const v = (document.getElementById('gate-code').value||'').trim().toUpperCase();
  if(v === ADMIN_CODE.toUpperCase()){ openAdminPanel(); return; }
  const now = new Date();
  const list = npCodes || [FALLBACK_CODE];
  const valid = list.filter(c => {
    if(typeof c === 'string') return true;
    return !c.expires || new Date(c.expires) >= now;
  });
  const codeValues = valid.map(c => (typeof c === 'string' ? c : c.code).toUpperCase());
  if(codeValues.includes(v)){
    sessionStorage.setItem('np_auth','1');
    const matchIdx = codeValues.indexOf(v);
    const matchEntry = valid[matchIdx];
    const clientName = (typeof matchEntry === 'object' && matchEntry.client) ? matchEntry.client : '';
    const salutation = (typeof matchEntry === 'object' && matchEntry.salutation) ? matchEntry.salutation : '';
    if(clientName) sessionStorage.setItem('np_client', clientName);
    if(salutation) sessionStorage.setItem('np_salutation', salutation); else sessionStorage.removeItem('np_salutation');
    showGreeting();
    const g = document.getElementById('np-gate');
    if(g) g.remove();
    setTimeout(()=>{initKeine();updateProgress();}, 300);
  } else {
    const err = document.getElementById('gate-err');
    const allCodes = list.map(c => (typeof c === 'string' ? c : c.code).toUpperCase());
    const isExpired = allCodes.includes(v);
    const msg = isExpired
      ? 'Dieser Zugangscode ist abgelaufen. Bitte einen neuen Code anfordern.'
      : `Ungültiger Code. (${list.length} Code${list.length!==1?'s':''} geladen)`;
    if(err) err.textContent = msg;
    const inp = document.getElementById('gate-code');
    if(inp){ inp.value=''; inp.focus(); }
  }
}

function openAdminPanel(){
  const g = document.getElementById('np-gate');
  if(g) g.classList.add('hidden');
  const p = document.getElementById('admin-panel');
  if(p) p.classList.remove('hidden');
  const tok = localStorage.getItem('np_admin_token')||'';
  const ti = document.getElementById('admin-token');
  if(ti) ti.value = tok;
  adminLoadPanel();
}

function adminClose(){
  document.getElementById('admin-panel').classList.add('hidden');
  document.getElementById('np-gate').classList.remove('hidden');
  document.getElementById('gate-code').value='';
}

function adminLoadPanel(){
  if(!npCodes) npCodes = [FALLBACK_CODE];
  adminRenderCodes();
}

function adminRenderCodes(){
  const list = document.getElementById('admin-codes-list');
  if(!list) return;
  if(!npCodes||!npCodes.length){ list.innerHTML='<div style="padding:.6rem .75rem;color:#888;font-size:12px">Keine Codes</div>'; return; }
  list.innerHTML = npCodes.map(c=>`
    <div class="admin-code-row">
      <span>${c}</span>
      <div>
        <button class="admin-del-btn" onclick="adminDeleteCode('${c}')" title="Löschen">✕</button>
      </div>
    </div>`).join('');
}

function adminDeleteCode(code){
  npCodes = (npCodes||[]).filter(c=>c!==code);
  adminRenderCodes();
}

function adminGenCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code='NP-';
  for(let i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)];
  const inp = document.getElementById('admin-new-code');
  if(inp) inp.value=code;
}

function adminAddCode(){
  const inp = document.getElementById('admin-new-code');
  const val = (inp?inp.value:'').trim().toUpperCase();
  if(!val){ setAdminMsg('Bitte einen Code eingeben.','#c0392b'); return; }
  if(!npCodes) npCodes=[];
  if(npCodes.map(c=>c.toUpperCase()).includes(val)){ setAdminMsg('Code bereits vorhanden.','#b8952a'); return; }
  npCodes.push(val);
  if(inp) inp.value='';
  adminRenderCodes();
  setAdminMsg('Code hinzugefügt. Bitte speichern!','#b8952a');
}

function adminSaveToken(){
  const v = (document.getElementById('admin-token')||{}).value||'';
  localStorage.setItem('np_admin_token', v);
}

async function adminSaveCodes(){
  const token = localStorage.getItem('np_admin_token')||'';
  if(!token){ setAdminMsg('Bitte zuerst ein GitHub Token eingeben.','#c0392b'); return; }
  if(!npCodes||!npCodes.length){ setAdminMsg('Keine Codes zum Speichern.','#c0392b'); return; }
  setAdminMsg('Wird gespeichert…','#444');
  try{
    const getR = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/codes.json`,{
      headers:{'Authorization':'token '+token,'Accept':'application/vnd.github.v3+json'}
    });
    let sha='';
    if(getR.ok){ const d=await getR.json(); sha=d.sha||''; }
    const content = btoa(JSON.stringify({codes:npCodes},null,2));
    const body = {message:'Zugangscodes aktualisiert',content};
    if(sha) body.sha=sha;
    const putR = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/codes.json`,{
      method:'PUT',
      headers:{'Authorization':'token '+token,'Accept':'application/vnd.github.v3+json','Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    if(putR.ok){
      setAdminMsg('✓ Gespeichert! Codes sind jetzt aktiv.','#2d7a4f');
    } else {
      const err=await putR.json();
      setAdminMsg('Fehler: '+(err.message||putR.status),'#c0392b');
    }
  } catch(e){ setAdminMsg('Netzwerkfehler: '+e.message,'#c0392b'); }
}

function setAdminMsg(msg,color){
  const el=document.getElementById('admin-msg');
  if(el){el.textContent=msg;el.style.color=color||'#2d7a4f';}
}

// =============================================
// GUTACHTEN UPLOAD (RAM-only, kein localStorage)
// =============================================
const GUTACHTEN = {};

function uploadGutachten(section, input) {
  if (!GUTACHTEN[section]) GUTACHTEN[section] = [];
  const files = Array.from(input.files);
  const promises = files.map(f => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res({name: f.name, size: f.size, data: e.target.result});
    r.onerror = rej;
    r.readAsArrayBuffer(f);
  }));
  Promise.all(promises).then(loaded => {
    GUTACHTEN[section].push(...loaded);
    renderGutachtenList(section);
    input.value = '';
  });
}

function removeGutachten(section, idx) {
  if (GUTACHTEN[section]) {
    GUTACHTEN[section].splice(idx, 1);
    renderGutachtenList(section);
  }
}

function renderGutachtenList(section) {
  const list = document.getElementById('gu_list_' + section);
  if (!list) return;
  const items = GUTACHTEN[section] || [];
  list.innerHTML = items.map((f, i) =>
    `<div class="gutachten-item">` +
    `<span class="gutachten-item-name" title="${f.name}">📄 ${f.name}</span>` +
    `<span class="gutachten-item-size">${(f.size/1024).toFixed(0)} KB</span>` +
    `<button class="gutachten-item-del" onclick="removeGutachten('${section}',${i})" title="Entfernen">&times;</button>` +
    `</div>`
  ).join('');
}

function hasGutachten() {
  return Object.values(GUTACHTEN).some(arr => arr && arr.length > 0);
}

async function mergeAndSavePDF(jspdfDoc, fname) {
  const {PDFDocument} = window.PDFLib;
  const mainBytes = jspdfDoc.output('arraybuffer');
  const merged = await PDFDocument.load(mainBytes);
  const cats = ['immobilien','fahrzeuge','beteiligungen','wertgegenstaende'];
  for (const cat of cats) {
    for (const f of (GUTACHTEN[cat] || [])) {
      try {
        const ext = await PDFDocument.load(f.data, {ignoreEncryption: true});
        const pages = await merged.copyPages(ext, ext.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      } catch(e) {
        console.warn('Fehler beim Anhängen:', f.name, e);
      }
    }
  }
  const bytes = await merged.save();
  const blob = new Blob([bytes], {type: 'application/pdf'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fname; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// =============================================
// STATE & AUTO-SAVE
// =============================================
const STATE = {
  immobilien:[], bankkonten:[], wertpapiere:[], fahrzeuge:[],
  versicherungen:[], beteiligungen:[], wertgegenstaende:[],
  forderungen:[], verbindlichkeiten:[], sonstiges:[]
};
let asTimer=null;
function autoSave(){
  clearTimeout(asTimer);
  asTimer=setTimeout(()=>{ try{localStorage.setItem('np_v1',JSON.stringify(snap()));}catch(e){} },800);
}
function snap(){
  const erlF=['name','geburt','sterben','geburtsname','staat','adresse','sterbeort','standesamt','aktenzeichen','gericht','erstelldatum','ersteller','verhaeltnis','anmerkung'];
  const erl={};
  erlF.forEach(f=>{const el=document.getElementById('erl_'+f);if(el)erl[f]=el.value;});
  Object.keys(STATE).forEach(cat=>STATE[cat].forEach(p=>collectPosFields(cat,p)));
  return {version:'1.0',erblasser:erl,positionen:STATE};
}
function collectPosFields(cat,p){
  const allF=['bez','typ','bauweise','wfl','gfl','nutz','bj','zimmer','etage','ausrichtung','ek','renov','zustand','plz','miko','mako','oepnv','heizung','daem','brw','markt','miete','verm','institut','art','iban','saldo','datum','waehrung','gemein','depot','depotnr','wert','positionen','marke','modell','km','kz','fin','grundlage','gesellschaft','vtnr','rkw','bezugs','summe','unternehmen','rechtsform','hrb','anteil','stammkap','kat','beschr','schuldner','betrag','faellig','sicherung','glaeubiger','restschuld','zinssatz','vertrnr','anm'];
  allF.forEach(f=>{const el=document.getElementById(p.id+'_'+f);if(el)p[f]=el.value;});
  ['aufzug','garage','balkon','garten','keller','eik','parkett','bf','pv','wp'].forEach(f=>{const el=document.getElementById(p.id+'_'+f);if(el)p[f]=el.checked;});
}
window.addEventListener('load',()=>{
  try{const s=localStorage.getItem('np_v1');if(s)loadAll(JSON.parse(s));}catch(e){}
  if(!document.getElementById('erl_erstelldatum').value)
    document.getElementById('erl_erstelldatum').value=new Date().toISOString().split('T')[0];
});
function loadAll(data){
  if(!data)return;
  const e=data.erblasser||{};
  Object.entries(e).forEach(([k,v])=>{const el=document.getElementById('erl_'+k);if(el)el.value=v||'';});
  if(data.positionen){Object.assign(STATE,data.positionen);Object.keys(STATE).forEach(cat=>renderCat(cat));}
  updateAllSums();
}

// =============================================
// NAVIGATION
// =============================================
function toggleSidebar(){
  const sb=document.querySelector('.sidebar');
  const ov=document.getElementById('sidebar-overlay');
  if(sb) sb.classList.toggle('open');
  if(ov) ov.classList.toggle('show');
}

function showPage(name){
  const mc=document.querySelector('.main-content');if(mc)mc.scrollTop=0;
  // Close sidebar on mobile after navigation
  const sb=document.querySelector('.sidebar');
  const ov=document.getElementById('sidebar-overlay');
  if(sb&&sb.classList.contains('open')){sb.classList.remove('open');if(ov)ov.classList.remove('show');}
  updateProgress();
  document.querySelectorAll('.section-page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page_'+name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>{
    if(n.getAttribute('onclick')&&n.getAttribute('onclick').includes("'"+name+"'"))n.classList.add('active');
  });
  if(name==='dashboard')renderDashboard();
}
function closeModal(){document.getElementById('modal_ds').style.display='none';localStorage.setItem('np_modal_seen','1');}

const KEINE_LABELS={immobilien:'Immobilien',bankkonten:'Bankkonten',wertpapiere:'Wertpapiere',fahrzeuge:'Fahrzeuge',versicherungen:'Versicherungen',beteiligungen:'Beteiligungen',wertgegenstaende:'Wertgegenstände',forderungen:'Forderungen',sonstiges:'sonstiges Vermögen',verbindlichkeiten:'Verbindlichkeiten'};

function toggleKeine(section){
  const key='np_keine_'+section;
  localStorage.setItem(key, localStorage.getItem(key)==='1'?'0':'1');
  renderKeineBtn(section);
  updateProgress();
}

function renderKeineBtn(section){
  const btn=document.getElementById('keine_'+section);
  if(!btn)return;
  const active=localStorage.getItem('np_keine_'+section)==='1';
  btn.textContent=(active?'☑ ':'☐ ')+'Keine '+KEINE_LABELS[section]+' vorhanden';
  btn.className='btn-keine'+(active?' active':'');
}

function initKeine(){Object.keys(KEINE_LABELS).forEach(s=>renderKeineBtn(s));}

function updateProgress(){
  const secs=['immobilien','bankkonten','wertpapiere','fahrzeuge','versicherungen','beteiligungen','wertgegenstaende','forderungen','sonstiges','verbindlichkeiten'];
  let filled=secs.filter(s=>{
    const el=document.getElementById('ns_'+s);
    const hasItems=el&&el.textContent.trim()!=='–'&&el.textContent.trim()!=='0'&&el.textContent.trim()!=='';
    return hasItems||localStorage.getItem('np_keine_'+s)==='1';
  }).length;
  const erlName=document.getElementById('erl_name');
  if(erlName&&erlName.value.trim())filled++;
  const total=secs.length+1;
  const bar=document.getElementById('progress-bar-fill');
  const txt=document.getElementById('progress-text');
  if(bar)bar.style.width=Math.round(filled/total*100)+'%';
  if(txt)txt.textContent=filled+' / '+total+' Bereiche ausgefüllt';
}
function openDSModal(){document.getElementById('modal_dserkl').style.display='flex';}
function closeDSModal(){document.getElementById('modal_dserkl').style.display='none';}

// =============================================
// HELPERS
// =============================================
function gv(id){const e=document.getElementById(id);return e?e.value:'';}
function eur(n){return(n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});}
function fmtDate(s){if(!s)return'–';const[y,m,d]=s.split('-');return d+'.'+m+'.'+y;}
function parseN(s){return parseFloat(String(s||0).replace(/[^0-9.,-]/g,'').replace(',','.'))||0;}
function uid(){return'p'+Math.random().toString(36).slice(2,9);}
function shortEur(n){if(n>=1000000)return(n/1000000).toFixed(1).replace('.',',')+' Mio.';if(n>=1000)return Math.round(n/1000)+'T';return Math.round(n)+'';}

// =============================================
// FORM TEMPLATES
// =============================================
const FORMS={
immo:id=>`
<div class="form-grid">
  <div class="field form-full"><label>Bezeichnung / Adresse *</label><input type="text" id="${id}_bez" placeholder="z.B. EFH Musterstraße 1, 80331 München" oninput="autoSave();ptitle('immobilien','${id}')"></div>
  <div class="field"><label>Gebäudetyp</label><select id="${id}_typ"><option value="">– wählen –</option><option value="ETW">Eigentumswohnung (ETW)</option><option value="EFH">Einfamilienhaus (EFH)</option><option value="DHH">Doppelhaushälfte</option><option value="RH">Reihenhaus</option><option value="MFH">Mehrfamilienhaus (MFH)</option><option value="Villa">Villa</option><option value="Bungalow">Bungalow</option></select></div>
  <div class="field"><label>Wohnfläche (m²) *</label><input type="number" id="${id}_wfl" placeholder="z.B. 95" min="1" oninput="autoSave()"></div>
  <div class="field"><label>Grundstücksfläche (m²)</label><input type="number" id="${id}_gfl" placeholder="z.B. 400" min="0" oninput="autoSave()"></div>
  <div class="field"><label>Nutzfläche (m²)</label><input type="number" id="${id}_nutz" placeholder="z.B. 30" min="0" oninput="autoSave()"></div>
  <div class="field"><label>Baujahr *</label><input type="number" id="${id}_bj" placeholder="z.B. 1985" min="1800" max="2025" oninput="autoSave()"></div>
  <div class="field"><label>Anzahl Zimmer</label><input type="number" id="${id}_zimmer" placeholder="z.B. 4" min="1" step="0.5" oninput="autoSave()"></div>
  <div class="field"><label>Etage</label><select id="${id}_etage"><option value="eg">EG</option><option value="1og" selected>1. OG</option><option value="2og">2. OG</option><option value="3og">3. OG</option><option value="dg">DG</option><option value="ug">UG</option></select></div>
  <div class="field"><label>Ausrichtung</label><select id="${id}_ausrichtung"><option value="">– unbekannt –</option><option value="sued">Süd</option><option value="suedwest">Südwest</option><option value="suedost">Südost</option><option value="ost">Ost</option><option value="west">West</option><option value="nord">Nord</option></select></div>
  <div class="field"><label>Energieeffizienzklasse</label><select id="${id}_ek"><option value="">– unbekannt –</option><option value="Ap">A+</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="F">F</option><option value="G">G</option><option value="H">H</option></select></div>
  <div class="field"><label>Letztes Renovierungsjahr</label><input type="number" id="${id}_renov" placeholder="z.B. 2015" min="1950" max="2025" oninput="autoSave()"></div>
</div>
<div style="margin:.6rem 0">
  <label style="font-size:11px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:.3rem">Objektzustand</label>
  <div class="range-wrap"><input type="range" id="${id}_zustand" min="1" max="10" value="5" oninput="document.getElementById('${id}_zv').textContent=this.value+'/10';autoSave()"><span class="range-val" id="${id}_zv">5/10</span></div>
  <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3)"><span>Sanierungsbedürftig</span><span>Erstbezug</span></div>
</div>
<div style="margin-bottom:.6rem">
  <label style="font-size:11px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:.3rem">Ausstattung</label>
  <div class="check-grid">
    <label class="check-item"><input type="checkbox" id="${id}_aufzug"> Aufzug</label>
    <label class="check-item"><input type="checkbox" id="${id}_garage"> Garage/Stellplatz</label>
    <label class="check-item"><input type="checkbox" id="${id}_balkon"> Balkon/Terrasse</label>
    <label class="check-item"><input type="checkbox" id="${id}_garten"> Garten</label>
    <label class="check-item"><input type="checkbox" id="${id}_keller"> Keller</label>
    <label class="check-item"><input type="checkbox" id="${id}_eik"> Einbauküche</label>
    <label class="check-item"><input type="checkbox" id="${id}_parkett"> Parkett/Dielen</label>
    <label class="check-item"><input type="checkbox" id="${id}_bf"> Barrierefrei</label>
    <label class="check-item"><input type="checkbox" id="${id}_pv"> Photovoltaik</label>
    <label class="check-item"><input type="checkbox" id="${id}_wp"> Wärmepumpe</label>
  </div>
</div>
<div class="form-grid">
  <div class="field"><label>PLZ *</label><input type="text" id="${id}_plz" placeholder="z.B. 80331" maxlength="5" oninput="immoPlz('${id}')"><div class="plz-info plz-idle" id="${id}_plzi">PLZ eingeben (alle DE-PLZ 01000–99999)</div></div>
  <div class="field"><label>Mikrolage</label><select id="${id}_miko"><option value="sehr_gut">Sehr gut</option><option value="gut" selected>Gut</option><option value="mittel">Mittel</option><option value="einfach">Einfach</option><option value="schlecht">Schlecht</option></select></div>
  <div class="field"><label>Makrolage</label><select id="${id}_mako"><option value="innenstadt">Innenstadt</option><option value="innenstadtrand">Innenstadtrand</option><option value="stadtrand" selected>Stadtrand/Vorort</option><option value="laendlich">Ländlich</option></select></div>
  <div class="field"><label>ÖPNV</label><select id="${id}_oepnv"><option value="sehr_gut">Sehr gut</option><option value="gut" selected>Gut</option><option value="mittel">Mittel</option><option value="schlecht">Schlecht</option></select></div>
  <div class="field"><label>Heizungsart</label><select id="${id}_heizung"><option value="">– unbekannt –</option><option value="waermepumpe">Wärmepumpe</option><option value="fernwaerme">Fernwärme</option><option value="gas">Gas</option><option value="oel">Öl</option><option value="pellet">Pellet</option><option value="elektro">Elektro</option></select></div>
  <div class="field"><label>Dämmstandard</label><select id="${id}_daem"><option value="sehr_gut">Sehr gut (KfW55)</option><option value="gut">Gut (KfW70)</option><option value="mittel" selected>Mittel (EnEV)</option><option value="einfach">Einfach</option><option value="kein">Nicht gedämmt</option></select></div>
  <div class="field"><label>Bodenrichtwert €/m² (auto)</label><input type="number" id="${id}_brw" placeholder="aus PLZ" min="0" oninput="autoSave()"></div>
  <div class="field"><label>Ø Marktpreis €/m² (auto)</label><input type="number" id="${id}_markt" placeholder="aus PLZ" min="0" oninput="autoSave()"></div>
  <div class="field"><label>Kaltmiete €/m²/Mon. (auto)</label><input type="number" id="${id}_miete" placeholder="aus PLZ" min="0" step="0.5" oninput="autoSave()"></div>
  <div class="field"><label>Vermietungssituation</label><select id="${id}_verm"><option value="leer" selected>Leerstand/Eigennutz</option><option value="vermietet_markt">Vermietet (Marktmiete)</option><option value="vermietet_unter">Vermietet (unter Markt)</option></select></div>
</div>
<div style="display:flex;gap:.5rem;align-items:center;margin-top:.75rem;flex-wrap:wrap">
  <button class="btn-calc-sm" onclick="calcImmo('${id}')">🏠 Bewertung berechnen</button>
  <button class="btn-calc-sm" onclick="exportGutachtenImmo('${id}')">📋 Gesondertes Gutachten</button>
  <span style="font-size:11px;color:var(--text3)">Vergleichswert + Ertragswert + Sachwert</span>
</div>
<div id="${id}_res" style="display:none" class="bw-result"></div>
<div class="anm-wrap"><span class="anm-toggle" onclick="this.nextElementSibling.classList.toggle('open')">+ Anmerkung</span><div class="anm-body"><textarea id="${id}_anm" placeholder="z.B. Belastet mit Grundschuld …" oninput="autoSave()" style="margin-top:.4rem"></textarea></div></div>`,

bank:id=>`<div class="form-grid">
  <div class="field form-full"><label>Bezeichnung *</label><input type="text" id="${id}_bez" placeholder="z.B. Girokonto Deutsche Bank" oninput="autoSave();ptitle('bankkonten','${id}')"></div>
  <div class="field"><label>Kreditinstitut *</label><input type="text" id="${id}_institut" placeholder="z.B. Deutsche Bank AG" oninput="autoSave()"></div>
  <div class="field"><label>Kontoart</label><select id="${id}_art" oninput="autoSave()"><option>Girokonto</option><option>Sparkonto/Sparbuch</option><option>Tagesgeldkonto</option><option>Festgeldkonto</option><option>Bargeld</option><option>Sonstiges</option></select></div>
  <div class="field"><label>IBAN (letzte 4)</label><input type="text" id="${id}_iban" placeholder="z.B. …4521" maxlength="4" oninput="autoSave()"></div>
  <div class="field"><label>Kontostand (€) *</label><input type="number" id="${id}_saldo" placeholder="z.B. 12500" oninput="autoSave();recalc('bankkonten')"></div>
  <div class="field"><label>Kontoauszug vom</label><input type="date" id="${id}_datum" oninput="autoSave()"></div>
  <div class="field"><label>Währung</label><select id="${id}_waehrung" oninput="autoSave()"><option>Euro (EUR)</option><option>US-Dollar (USD)</option><option>Schweizer Franken (CHF)</option><option>Britisches Pfund (GBP)</option><option>Sonstige</option></select></div>
  <div class="field"><label>Gemeinschaftskonto?</label><select id="${id}_gemein" oninput="autoSave()"><option value="nein">Nein – Einzelkonto</option><option value="ja_50">Ja – 50% Anteil</option><option value="ja_100">Ja – 100% Erblasser</option></select></div>
</div>
<div class="anm-wrap"><span class="anm-toggle" onclick="this.nextElementSibling.classList.toggle('open')">+ Anmerkung</span><div class="anm-body"><textarea id="${id}_anm" oninput="autoSave()" style="margin-top:.4rem"></textarea></div></div>`,

wp:id=>`<div class="form-grid">
  <div class="field form-full"><label>Bezeichnung *</label><input type="text" id="${id}_bez" placeholder="z.B. Wertpapierdepot Comdirect" oninput="autoSave();ptitle('wertpapiere','${id}')"></div>
  <div class="field"><label>Depotbank *</label><input type="text" id="${id}_depot" placeholder="z.B. Comdirect Bank AG" oninput="autoSave()"></div>
  <div class="field"><label>Depotnummer (letzte 4)</label><input type="text" id="${id}_depotnr" placeholder="z.B. …7821" maxlength="4" oninput="autoSave()"></div>
  <div class="field"><label>Art</label><select id="${id}_art" oninput="autoSave()"><option>Depot (Aktien/ETF/Fonds)</option><option>Anleihen/Rentenpapiere</option><option>Kryptowährungen</option><option>Sonstiges</option></select></div>
  <div class="field"><label>Kurswert gesamt (€) *</label><input type="number" id="${id}_wert" placeholder="z.B. 45000" oninput="autoSave();recalc('wertpapiere')"></div>
  <div class="field"><label>Bewertungsstichtag</label><input type="date" id="${id}_datum" oninput="autoSave()"></div>
  <div class="field form-full"><label>Einzelpositionen (ISIN / Beschreibung)</label><textarea id="${id}_positionen" placeholder="z.B.&#10;ISIN DE0005140008 – Deutsche Bank, 200 Stk. à 15,20 € = 3.040 €" oninput="autoSave()" style="min-height:80px"></textarea></div>
</div>
<div class="anm-wrap"><span class="anm-toggle" onclick="this.nextElementSibling.classList.toggle('open')">+ Anmerkung</span><div class="anm-body"><textarea id="${id}_anm" oninput="autoSave()" style="margin-top:.4rem"></textarea></div></div>`,

fzg:id=>`<div class="form-grid">
  <div class="field form-full"><label>Bezeichnung *</label><input type="text" id="${id}_bez" placeholder="z.B. PKW BMW 3er Touring, 2018" oninput="autoSave();ptitle('fahrzeuge','${id}')"></div>
  <div class="field"><label>Fahrzeugart</label><select id="${id}_art" oninput="autoSave()"><option>PKW</option><option>Motorrad</option><option>Wohnmobil/Caravan</option><option>Boot</option><option>LKW/Nutzfahrzeug</option><option>Sonstiges</option></select></div>
  <div class="field"><label>Marke</label><input type="text" id="${id}_marke" placeholder="z.B. BMW" oninput="autoSave()"></div>
  <div class="field"><label>Modell</label><input type="text" id="${id}_modell" placeholder="z.B. 3er Touring" oninput="autoSave()"></div>
  <div class="field"><label>Baujahr</label><input type="number" id="${id}_bj" placeholder="z.B. 2018" min="1900" max="2025" oninput="autoSave()"></div>
  <div class="field"><label>Kilometerstand</label><input type="number" id="${id}_km" placeholder="z.B. 85000" oninput="autoSave()"></div>
  <div class="field"><label>Kennzeichen</label><input type="text" id="${id}_kz" placeholder="z.B. M-AB 1234" oninput="autoSave()"></div>
  <div class="field"><label>FIN</label><input type="text" id="${id}_fin" placeholder="z.B. WBA3A5…" oninput="autoSave()"></div>
  <div class="field"><label>Zeitwert (€) *</label><input type="number" id="${id}_wert" placeholder="z.B. 18000" oninput="autoSave();recalc('fahrzeuge')"></div>
  <div class="field"><label>Bewertungsgrundlage</label><select id="${id}_grundlage" oninput="autoSave()"><option>DAT/Schwacke-Schätzung</option><option>Händlerbewertung</option><option>Gutachten</option><option>Eigeneinschätzung</option></select></div>
</div>
<div class="anm-wrap"><span class="anm-toggle" onclick="this.nextElementSibling.classList.toggle('open')">+ Anmerkung</span><div class="anm-body"><textarea id="${id}_anm" oninput="autoSave()" style="margin-top:.4rem"></textarea></div></div>`,

vers:id=>`<div class="form-grid">
  <div class="field form-full"><label>Bezeichnung *</label><input type="text" id="${id}_bez" placeholder="z.B. Lebensversicherung Allianz" oninput="autoSave();ptitle('versicherungen','${id}')"></div>
  <div class="field"><label>Versicherungsgesellschaft *</label><input type="text" id="${id}_gesellschaft" placeholder="z.B. Allianz Lebensversicherungs-AG" oninput="autoSave()"></div>
  <div class="field"><label>Art</label><select id="${id}_art" oninput="autoSave()"><option>Kapitallebensversicherung</option><option>Risikolebensversicherung</option><option>Private Rentenversicherung</option><option>Betriebliche Altersvorsorge</option><option>Sonstige</option></select></div>
  <div class="field"><label>Vertragsnummer</label><input type="text" id="${id}_vtnr" placeholder="z.B. LV-123456" oninput="autoSave()"></div>
  <div class="field"><label>Rückkaufwert (€) *</label><input type="number" id="${id}_rkw" placeholder="z.B. 35000" oninput="autoSave();recalc('versicherungen')"></div>
  <div class="field"><label>Stichtag Rückkaufwert</label><input type="date" id="${id}_datum" oninput="autoSave()"></div>
  <div class="field"><label>Bezugsberechtigter</label><input type="text" id="${id}_bezugs" placeholder="z.B. Ehefrau Maria Mustermann" oninput="autoSave()"></div>
  <div class="field"><label>Versicherungssumme (€)</label><input type="number" id="${id}_summe" placeholder="z.B. 50000" oninput="autoSave()"></div>
</div>
<div class="anm-wrap"><span class="anm-toggle" onclick="this.nextElementSibling.classList.toggle('open')">+ Anmerkung</span><div class="anm-body"><textarea id="${id}_anm" oninput="autoSave()" style="margin-top:.4rem"></textarea></div></div>`,

bet:id=>`<div class="form-grid">
  <div class="field form-full"><label>Bezeichnung *</label><input type="text" id="${id}_bez" placeholder="z.B. GmbH-Anteil Muster GmbH" oninput="autoSave();ptitle('beteiligungen','${id}')"></div>
  <div class="field"><label>Unternehmen *</label><input type="text" id="${id}_unternehmen" placeholder="z.B. Muster GmbH" oninput="autoSave()"></div>
  <div class="field"><label>Rechtsform</label><select id="${id}_rechtsform" oninput="autoSave()"><option>GmbH</option><option>AG</option><option>KG</option><option>OHG</option><option>GbR</option><option>Einzelunternehmen</option><option>Stille Beteiligung</option><option>Genossenschaft</option><option>Sonstiges</option></select></div>
  <div class="field"><label>Handelsregister</label><input type="text" id="${id}_hrb" placeholder="z.B. HRB 12345, AG München" oninput="autoSave()"></div>
  <div class="field"><label>Anteil des Erblassers (%)</label><input type="number" id="${id}_anteil" placeholder="z.B. 50" min="0" max="100" step="0.01" oninput="autoSave()"></div>
  <div class="field"><label>Stammkapital gesamt (€)</label><input type="number" id="${id}_stammkap" placeholder="z.B. 25000" oninput="autoSave()"></div>
  <div class="field"><label>Wert des Anteils (€) *</label><input type="number" id="${id}_wert" placeholder="z.B. 80000" oninput="autoSave();recalc('beteiligungen')"></div>
  <div class="field"><label>Bewertungsgrundlage</label><select id="${id}_grundlage" oninput="autoSave()"><option>Eigeneinschätzung</option><option>Letzter Jahresabschluss</option><option>Unternehmensgutachten</option><option>Buchwert</option></select></div>
</div>
<div style="display:flex;gap:.5rem;margin-top:.75rem">
  <button class="btn-calc-sm" onclick="exportGutachtenBet('${id}')">📋 Gesondertes Gutachten</button>
</div>
<div class="anm-wrap"><span class="anm-toggle" onclick="this.nextElementSibling.classList.toggle('open')">+ Anmerkung</span><div class="anm-body"><textarea id="${id}_anm" oninput="autoSave()" style="margin-top:.4rem"></textarea></div></div>`,

wg:id=>`<div class="form-grid">
  <div class="field form-full"><label>Bezeichnung *</label><input type="text" id="${id}_bez" placeholder="z.B. Goldkette 750er, ca. 40g" oninput="autoSave();ptitle('wertgegenstaende','${id}')"></div>
  <div class="field"><label>Kategorie</label><select id="${id}_kat" oninput="autoSave()"><option>Schmuck/Uhren</option><option>Kunst/Gemälde</option><option>Antiquitäten/Möbel</option><option>Edelmetalle</option><option>Sammlungen</option><option>Hochwertige Elektronik</option><option>Sonstiges</option></select></div>
  <div class="field"><label>Geschätzter Wert (€) *</label><input type="number" id="${id}_wert" placeholder="z.B. 3500" oninput="autoSave();recalc('wertgegenstaende')"></div>
  <div class="field"><label>Bewertungsgrundlage</label><select id="${id}_grundlage" oninput="autoSave()"><option>Eigeneinschätzung des Erben</option><option>Gutachten vorhanden</option><option>Kaufbeleg/Quittung vorhanden</option><option>Versicherungswert</option></select></div>
  <div class="field form-full"><label>Beschreibung / Herkunft</label><textarea id="${id}_beschr" placeholder="z.B. Goldkette aus Nachlass der Großmutter, 750er Gold, 40g …" oninput="autoSave()"></textarea></div>
</div>
<div style="display:flex;gap:.5rem;margin-top:.75rem">
  <button class="btn-calc-sm" onclick="exportGutachtenWg('${id}')">📋 Gesondertes Gutachten</button>
</div>
<div class="anm-wrap"><span class="anm-toggle" onclick="this.nextElementSibling.classList.toggle('open')">+ Anmerkung</span><div class="anm-body"><textarea id="${id}_anm" oninput="autoSave()" style="margin-top:.4rem"></textarea></div></div>`,

ford:id=>`<div class="form-grid">
  <div class="field form-full"><label>Bezeichnung *</label><input type="text" id="${id}_bez" placeholder="z.B. Darlehen an Thomas Mustermann" oninput="autoSave();ptitle('forderungen','${id}')"></div>
  <div class="field"><label>Schuldner *</label><input type="text" id="${id}_schuldner" placeholder="z.B. Thomas Mustermann" oninput="autoSave()"></div>
  <div class="field"><label>Art</label><select id="${id}_art" oninput="autoSave()"><option>Privatdarlehen</option><option>Geschäftliche Forderung</option><option>Mietkaution</option><option>Kaufpreisforderung</option><option>Sonstiges</option></select></div>
  <div class="field"><label>Forderungsbetrag (€) *</label><input type="number" id="${id}_betrag" placeholder="z.B. 15000" oninput="autoSave();recalc('forderungen')"></div>
  <div class="field"><label>Fälligkeitsdatum</label><input type="date" id="${id}_faellig" oninput="autoSave()"></div>
  <div class="field"><label>Gesichert durch</label><select id="${id}_sicherung" oninput="autoSave()"><option>Schuldschein/Vertrag</option><option>Grundschuld</option><option>Bürgschaft</option><option>Nicht gesichert</option></select></div>
</div>
<div class="anm-wrap"><span class="anm-toggle" onclick="this.nextElementSibling.classList.toggle('open')">+ Anmerkung</span><div class="anm-body"><textarea id="${id}_anm" oninput="autoSave()" style="margin-top:.4rem"></textarea></div></div>`,

verb:id=>`<div class="form-grid">
  <div class="field form-full"><label>Bezeichnung *</label><input type="text" id="${id}_bez" placeholder="z.B. Hypothek Sparkasse München" oninput="autoSave();ptitle('verbindlichkeiten','${id}')"></div>
  <div class="field"><label>Gläubiger *</label><input type="text" id="${id}_glaeubiger" placeholder="z.B. Sparkasse München" oninput="autoSave()"></div>
  <div class="field"><label>Art</label><select id="${id}_art" oninput="autoSave()"><option>Hypothek/Grundschuld</option><option>Ratenkredit</option><option>Dispositionskredit</option><option>Privatschuld</option><option>Steuerschuld</option><option>Sonstiges</option></select></div>
  <div class="field"><label>Restschuld (€) *</label><input type="number" id="${id}_restschuld" placeholder="z.B. 120000" oninput="autoSave();recalc('verbindlichkeiten')"></div>
  <div class="field"><label>Zinssatz (% p.a.)</label><input type="number" id="${id}_zinssatz" placeholder="z.B. 2.5" min="0" max="30" step="0.01" oninput="autoSave()"></div>
  <div class="field"><label>Fälligkeit bis</label><input type="date" id="${id}_faellig" oninput="autoSave()"></div>
  <div class="field"><label>Darlehensvertrag-Nr.</label><input type="text" id="${id}_vertrnr" placeholder="z.B. DV-789012" oninput="autoSave()"></div>
  <div class="field"><label>Gesichert durch</label><select id="${id}_sicherung" oninput="autoSave()"><option>Grundschuld eingetragen</option><option>Bürgschaft</option><option>Nicht gesichert</option></select></div>
</div>
<div class="anm-wrap"><span class="anm-toggle" onclick="this.nextElementSibling.classList.toggle('open')">+ Anmerkung</span><div class="anm-body"><textarea id="${id}_anm" oninput="autoSave()" style="margin-top:.4rem"></textarea></div></div>`,

sonst:id=>`<div class="form-grid">
  <div class="field form-full"><label>Bezeichnung *</label><input type="text" id="${id}_bez" placeholder="z.B. Domain musterfirma.de" oninput="autoSave();ptitle('sonstiges','${id}')"></div>
  <div class="field"><label>Art</label><select id="${id}_art" oninput="autoSave()"><option>Digitale Assets</option><option>Patent/Urheberrecht/Lizenz</option><option>Steuererstattungsanspruch</option><option>Erbschaftsanwartschaft</option><option>Sonstiges</option></select></div>
  <div class="field"><label>Geschätzter Wert (€) *</label><input type="number" id="${id}_wert" placeholder="z.B. 2000" oninput="autoSave();recalc('sonstiges')"></div>
  <div class="field form-full"><label>Beschreibung</label><textarea id="${id}_beschr" placeholder="z.B. Domain seit 2005 registriert bei IONOS …" oninput="autoSave()"></textarea></div>
</div>
<div class="anm-wrap"><span class="anm-toggle" onclick="this.nextElementSibling.classList.toggle('open')">+ Anmerkung</span><div class="anm-body"><textarea id="${id}_anm" oninput="autoSave()" style="margin-top:.4rem"></textarea></div></div>`
};

const CAT_FORM={immobilien:'immo',bankkonten:'bank',wertpapiere:'wp',fahrzeuge:'fzg',versicherungen:'vers',beteiligungen:'bet',wertgegenstaende:'wg',forderungen:'ford',verbindlichkeiten:'verb',sonstiges:'sonst'};
const WERTFELD={immobilien:null,bankkonten:'_saldo',wertpapiere:'_wert',fahrzeuge:'_wert',versicherungen:'_rkw',beteiligungen:'_wert',wertgegenstaende:'_wert',forderungen:'_betrag',verbindlichkeiten:'_restschuld',sonstiges:'_wert'};

// =============================================
// POSITIONS MANAGEMENT
// =============================================
function addPos(cat){
  const id=uid(); STATE[cat].push({id}); renderCat(cat); autoSave();
  setTimeout(()=>{ const el=document.getElementById('pc_'+id); if(el){el.scrollIntoView({behavior:'smooth',block:'nearest'});el.classList.add('open');} },80);
}
function delPos(cat,id){
  if(!confirm('Position wirklich löschen?'))return;
  STATE[cat]=STATE[cat].filter(p=>p.id!==id); renderCat(cat); recalc(cat); autoSave();
}
function renderCat(cat){
  const list=document.getElementById('list_'+cat); if(!list)return;
  if(!STATE[cat].length){ list.innerHTML='<div class="empty"><div class="empty-icon">📂</div><p>Noch keine Positionen. Klicken Sie auf „+ Hinzufügen".</p></div>'; return; }
  const fk=CAT_FORM[cat];
  list.innerHTML=STATE[cat].map((p,i)=>`
    <div class="pos-card" id="pc_${p.id}">
      <div class="pos-hd" onclick="togglePC('${p.id}')">
        <div class="pos-num">${i+1}</div>
        <div class="pos-title" id="pt_${p.id}">${p.bez||'(ohne Bezeichnung)'}</div>
        <div class="pos-val" id="pv_${p.id}">–</div>
        <span class="pos-chev">▼</span>
        <button class="btn-del" onclick="event.stopPropagation();delPos('${cat}','${p.id}')">✕</button>
      </div>
      <div class="pos-body" id="pb_${p.id}">${FORMS[fk](p.id)}</div>
    </div>`).join('');
  STATE[cat].forEach(p=>restorePos(cat,p)); recalc(cat);
}
function togglePC(id){document.getElementById('pc_'+id).classList.toggle('open');}
function restorePos(cat,p){
  const id=p.id;
  ['bez','typ','bauweise','wfl','gfl','nutz','bj','zimmer','etage','ausrichtung','ek','renov','zustand','plz','miko','mako','oepnv','heizung','daem','brw','markt','miete','verm','institut','art','iban','saldo','datum','waehrung','gemein','depot','depotnr','wert','positionen','marke','modell','km','kz','fin','grundlage','gesellschaft','vtnr','rkw','bezugs','summe','unternehmen','rechtsform','hrb','anteil','stammkap','kat','beschr','schuldner','betrag','faellig','sicherung','glaeubiger','restschuld','zinssatz','vertrnr','anm'].forEach(f=>{const el=document.getElementById(id+'_'+f);if(el&&p[f]!==undefined)el.value=p[f];});
  ['aufzug','garage','balkon','garten','keller','eik','parkett','bf','pv','wp'].forEach(f=>{const el=document.getElementById(id+'_'+f);if(el&&p[f]!==undefined)el.checked=p[f];});
  const zv=document.getElementById(id+'_zv'),zs=document.getElementById(id+'_zustand');
  if(zv&&zs)zv.textContent=zs.value+'/10';
  if(cat==='immobilien'&&p.bewertung)showImmoResult(id,p.bewertung);
  updatePV(cat,id);
}
function ptitle(cat,id){
  const bez=document.getElementById(id+'_bez'); if(!bez)return;
  const p=STATE[cat].find(x=>x.id===id);
  if(p){p.bez=bez.value;const el=document.getElementById('pt_'+id);if(el)el.textContent=bez.value||'(ohne Bezeichnung)';}
}
function updatePV(cat,id){
  let v=0;
  if(cat==='immobilien'){const p=STATE[cat].find(x=>x.id===id);v=p&&p.bewertung?p.bewertung.mw:0;}
  else{const wf=WERTFELD[cat];const el=document.getElementById(id+wf);v=el?parseN(el.value):0;}
  const el=document.getElementById('pv_'+id); if(el)el.textContent=v>0?eur(v):'–';
  return v;
}
function recalc(cat){
  let total=0; (STATE[cat]||[]).forEach(p=>{total+=updatePV(cat,p.id);});
  const ns=document.getElementById('ns_'+cat); if(ns)ns.textContent=total>0?shortEur(total):'–';
  const sr=document.getElementById('sum_'+cat),sv=document.getElementById('sv_'+cat);
  if(sr)sr.style.display=total>0?'flex':'none'; if(sv)sv.textContent=eur(total);
  updateSbTotals();
}
function getSum(cat){
  let t=0;
  (STATE[cat]||[]).forEach(p=>{
    if(cat==='immobilien'){t+=p.bewertung?p.bewertung.mw:0;}
    else{const el=document.getElementById(p.id+WERTFELD[cat]);t+=el?parseN(el.value):0;}
  });
  return t;
}
function updateSbTotals(){
  const aCats=['immobilien','bankkonten','wertpapiere','fahrzeuge','versicherungen','beteiligungen','wertgegenstaende','forderungen','sonstiges'];
  const ak=aCats.reduce((s,c)=>s+getSum(c),0);
  const pa=getSum('verbindlichkeiten'); const net=ak-pa;
  const sa=document.getElementById('tot_aktiva'),sp=document.getElementById('tot_passiva'),sn=document.getElementById('tot_netto');
  if(sa)sa.textContent=ak>0?eur(ak):'–'; if(sp)sp.textContent=pa>0?eur(pa):'–';
  if(sn)sn.textContent=(ak>0||pa>0)?eur(net):'–';
}
function updateAllSums(){Object.keys(STATE).forEach(cat=>recalc(cat));}

// =============================================
// PLZ
// =============================================
function immoPlz(id){
  const plz=document.getElementById(id+'_plz').value.trim();
  const info=document.getElementById(id+'_plzi');
  if(plz.length===5&&/^\d{5}$/.test(plz)){
    const d=getPLZData(plz);
    if(d){
      document.getElementById(id+'_brw').value=d.brw;
      document.getElementById(id+'_markt').value=d.kauf;
      document.getElementById(id+'_miete').value=d.miete;
      info.className='plz-info plz-ok';
      info.innerHTML=`<strong>✓ ${d.stadt}</strong><div class="plz-chips"><span class="plz-chip">BRW ${d.brw.toLocaleString('de-DE')} €/m²</span><span class="plz-chip">Kauf Ø ${d.kauf.toLocaleString('de-DE')} €/m²</span><span class="plz-chip">Miete ${d.miete} €/m²</span></div>`;
    }
  } else { info.className='plz-info plz-idle'; info.textContent='PLZ eingeben (01000–99999)'; }
  autoSave();
}

// =============================================
// IMMOBILIEN-BEWERTUNG
// =============================================
function calcImmo(id){
  const wfl=parseN(document.getElementById(id+'_wfl')?.value);
  const bj=parseN(document.getElementById(id+'_bj')?.value);
  if(!wfl||!bj){alert('Bitte Wohnfläche und Baujahr angeben.');return;}
  const nutz=parseN(document.getElementById(id+'_nutz')?.value);
  const gfl=parseN(document.getElementById(id+'_gfl')?.value);
  const zustand=parseN(document.getElementById(id+'_zustand')?.value)||5;
  const typ=document.getElementById(id+'_typ')?.value||'ETW';
  const etage=document.getElementById(id+'_etage')?.value||'1og';
  const ausrichtung=document.getElementById(id+'_ausrichtung')?.value||'';
  const renovJahr=parseN(document.getElementById(id+'_renov')?.value);
  const brw=parseN(document.getElementById(id+'_brw')?.value)||500;
  const markt_qm=parseN(document.getElementById(id+'_markt')?.value)||brw*2.8;
  const miete_qm=parseN(document.getElementById(id+'_miete')?.value)||markt_qm/200;
  const now=2025,alter=now-bj;
  const eff_alter=renovJahr?Math.min(alter,Math.round((now-renovJahr)*0.35+(renovJahr-bj)*0.5)):alter;
  const rnd=Math.max(10,80-eff_alter);
  const factors=[];
  const mikoM={sehr_gut:1.08,gut:1.0,mittel:0.93,einfach:0.85,schlecht:0.78};
  const makoM={innenstadt:1.12,innenstadtrand:1.04,stadtrand:1.0,laendlich:0.88};
  const oepnvM={sehr_gut:1.04,gut:1.0,mittel:0.97,schlecht:0.93};
  const lage_f=(mikoM[document.getElementById(id+'_miko')?.value]||1)*(makoM[document.getElementById(id+'_mako')?.value]||1)*(oepnvM[document.getElementById(id+'_oepnv')?.value]||1);
  factors.push({n:'Lage (Mikro/Makro/ÖPNV)',v:(lage_f-1)*100});
  const zustand_f=0.75+(zustand-1)/9*0.4; factors.push({n:`Zustand (${zustand}/10)`,v:(zustand_f-1)*100});
  const alter_f=0.75+Math.min(rnd/80,1)*0.35; factors.push({n:`Restnutzungsdauer (${rnd} J.)`,v:(alter_f-1)*100});
  const etageM={eg:0.96,ug:0.88,'1og':1.0,'2og':1.02,'3og':1.01,dg:0.99};
  const et_f=etageM[etage]||1.0; if(et_f!==1.0)factors.push({n:'Etage',v:(et_f-1)*100});
  const ausM={sued:1.03,suedwest:1.02,suedost:1.02,ost:1.0,west:0.99,nord:0.96};
  const a_f=ausM[ausrichtung]||1.0; if(a_f!==1.0)factors.push({n:'Ausrichtung',v:(a_f-1)*100});
  let aust=0;
  [['aufzug',1.5],['garage',2],['balkon',1.5],['garten',2],['eik',1],['parkett',1.5],['bf',1],['pv',2],['wp',2]].forEach(([f,w])=>{if(document.getElementById(id+'_'+f)?.checked)aust+=w;});
  if(aust>0)factors.push({n:'Ausstattung',v:aust});
  const aust_f=1+aust/100;
  const ekM={'Ap':1.05,'A':1.03,'B':1.01,'C':1.0,'D':0.99,'E':0.97,'F':0.94,'G':0.91,'H':0.88};
  const ek=document.getElementById(id+'_ek')?.value; const ek_f=ekM[ek]||1.0;
  if(ek&&ek_f!==1.0)factors.push({n:`Energieeffizienz (${ek})`,v:(ek_f-1)*100});
  const hzM={waermepumpe:1.03,fernwaerme:1.01,gas:1.0,oel:0.97,pellet:1.01,elektro:0.95};
  const h_f=hzM[document.getElementById(id+'_heizung')?.value]||1.0;
  if(h_f!==1.0)factors.push({n:'Heizungsart',v:(h_f-1)*100});
  const dmM={sehr_gut:1.03,gut:1.01,mittel:1.0,einfach:0.97,kein:0.93};
  const d_f=dmM[document.getElementById(id+'_daem')?.value]||1.0;
  if(d_f!==1.0)factors.push({n:'Dämmstandard',v:(d_f-1)*100});
  const vM={leer:1.0,vermietet_markt:0.97,vermietet_unter:0.92};
  const v_f=vM[document.getElementById(id+'_verm')?.value]||1.0;
  if(v_f!==1.0)factors.push({n:'Vermietung',v:(v_f-1)*100});
  const ges_f=lage_f*zustand_f*alter_f*et_f*a_f*aust_f*ek_f*h_f*d_f*v_f;
  const vw=markt_qm*wfl*ges_f;

  // Liegenschaftszinssatz – BRW-abhängig (§ 33 ImmoWertV 2021)
  // Quelle: Kleiber/Simon, Verkehrswertermittlung 9. Aufl., § 33 ImmoWertV Rn. 45 ff.
  // Gutachterausschuss-Berichte: München ~2,0%, mittlere Städte ~3,5%, Ländlich ~5,0–5,5%
  const lzs_hoch=typ==='MFH'?3.0:(typ==='EFH'||typ==='Villa')?2.0:2.5;
  const lzs_niedrig=typ==='MFH'?6.0:(typ==='EFH'||typ==='Villa')?5.0:5.5;
  const lzs_t=Math.max(0,Math.min(1,Math.log10(Math.max(100,brw)/100)/Math.log10(50)));
  const kap_zins=Math.round((lzs_niedrig-lzs_t*(lzs_niedrig-lzs_hoch))*10)/10;

  const jahreskalt=miete_qm*wfl*12;
  const reinertrag=jahreskalt*0.97-jahreskalt*(gfl>0?0.22:0.28);
  const kap_fak=(1-Math.pow(1+kap_zins/100,-rnd))/(kap_zins/100);

  // Bodenwertanteil – MEA für ETW (§§ 28, 39 ImmoWertV 2021)
  // Quelle: Kleiber/Simon, § 28 ImmoWertV Rn. 123: Miteigentumsanteil ≈ anteilige Grundstücksfläche
  // Näherungsformel für ETW ohne bekannte Gesamtanlage: wfl × 1,2
  const boden_anteil=typ==='ETW'?Math.max(gfl,wfl*1.2):(gfl>0?gfl:wfl*0.8);
  const boden_ew=brw*boden_anteil;
  const ew=reinertrag*kap_fak+boden_ew;

  // Regelherstellungskosten BKI 2025 (§ 36 ImmoWertV 2021)
  // Quelle: BMWSB/BKI 2025, Normalherstellungskosten; Kleiber/Simon, § 36 ImmoWertV Rn. 30 ff.
  // ETW mittlerer Standard: ~2.700 €/m² WFL; EFH: ~2.500; DHH/RH: ~2.400; MFH: ~2.100
  const hk_base=typ==='ETW'?2700:(typ==='EFH'||typ==='Villa')?2500:(typ==='DHH'||typ==='RH')?2400:typ==='Bungalow'?2200:2100;
  const hk_qm=hk_base*(d_f*0.5+0.5);
  const altMind=Math.min(0.7,eff_alter*0.012);
  const geb_sw=wfl*hk_qm*(1-altMind)*zustand_f;
  const bod_sw=brw*boden_anteil;
  const sw_roh=geb_sw+bod_sw+(nutz*500*(1-altMind));

  // Sachwertfaktor – Marktanpassung (§ 39 ImmoWertV 2021)
  // Quelle: Kleiber/Simon, § 39 ImmoWertV Rn. 67 ff.; BORIS-Daten der Gutachterausschüsse
  // Ableitung aus BRW: Hochpreismarkt (BRW>2000) → Faktor ~1,5–2,0; Landmarkt → ~0,7–0,9
  const sw_faktor=Math.max(0.6,Math.min(2.2,0.7+Math.log10(Math.max(100,brw)/100)*0.5));
  const sw=sw_roh*sw_faktor;

  // Verfahrensgewichtung nach ImmoWertV 2021 Praxis (§ 8 ImmoWertV)
  // Quelle: Sommer/Kröll, Grundstückswertermittlung 5. Aufl., S. 241 ff.
  // ETW: Vergleichswert dominant (§ 24 ff.), EFH: Sach+Vergleich, MFH: Ertrag dominant
  let wVW=0.50,wEW=0.30,wSW=0.20;
  if(typ==='ETW'){wVW=0.65;wEW=0.20;wSW=0.15;}
  else if(typ==='MFH'){wVW=0.30;wEW=0.50;wSW=0.20;}
  else if(['EFH','DHH','RH'].includes(typ)){wVW=0.50;wEW=0.20;wSW=0.30;}
  else if(['Villa','Bungalow'].includes(typ)){wVW=0.45;wEW=0.20;wSW=0.35;}
  const mw=vw*wVW+ew*wEW+sw*wSW;
  const bewertung={mw,vw,ew,sw,sw_roh,sw_faktor,wVW,wEW,wSW,mw_min:mw*0.88,mw_max:mw*1.12,markt_qm,brw,gfl,boden_anteil,wfl,bj,alter,eff_alter,rnd,jahreskalt,reinertrag,kap_zins,kap_fak,hk_qm,altMind,geb_sw,bod_sw,factors,ges_f};
  const p=STATE.immobilien.find(x=>x.id===id);
  if(p){p.bewertung=bewertung;collectPosFields('immobilien',p);}
  showImmoResult(id,bewertung); recalc('immobilien'); autoSave();
}
function showImmoResult(id,b){
  const el=document.getElementById(id+'_res'); if(!el)return;
  el.style.display='block';
  const frows=b.factors.slice(0,8).map(f=>`<div class="bw-frow"><span>${f.n}</span><span class="${f.v>=0?'f-pos':'f-neg'}">${f.v>=0?'+':''}${f.v.toFixed(1)}%</span></div>`).join('');
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.4rem">
    <div><div style="font-size:11px;color:var(--text3);margin-bottom:.1rem">Geschätzter Marktwert</div>
      <div class="bw-main">${eur(b.mw)}</div><div class="bw-range">${eur(b.mw_min)} – ${eur(b.mw_max)} (±12%)</div></div>
    <div style="font-size:11px;color:var(--text3);text-align:right">Ø ${eur(b.mw/b.wfl)}/m²<br>Rendite ${(b.jahreskalt/b.mw*100).toFixed(1)}% p.a.</div>
  </div>
  <div class="bw-grid">
    <div class="bw-cell"><div class="bw-cell-name">Vergleichswert (${Math.round(b.wVW*100)}%)</div><div class="bw-cell-val">${eur(b.vw)}</div></div>
    <div class="bw-cell"><div class="bw-cell-name">Ertragswert (${Math.round(b.wEW*100)}%)</div><div class="bw-cell-val">${eur(b.ew)}</div></div>
    <div class="bw-cell"><div class="bw-cell-name">Sachwert (${Math.round(b.wSW*100)}%)</div><div class="bw-cell-val">${eur(b.sw)}</div></div>
  </div>
  <div style="margin-top:.5rem;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:.2rem">Korrekturfaktoren</div>${frows}`;
}

// =============================================
// DASHBOARD
// =============================================
function renderDashboard(){
  const aCats=[{key:'immobilien',label:'I. Grundvermögen (Immobilien)'},{key:'bankkonten',label:'II. Bankguthaben & Bargeld'},{key:'wertpapiere',label:'III. Wertpapiere & Investments'},{key:'fahrzeuge',label:'IV. Fahrzeuge'},{key:'versicherungen',label:'V. Versicherungen (Rückkaufwerte)'},{key:'beteiligungen',label:'VI. Unternehmensbeteiligungen'},{key:'wertgegenstaende',label:'VII. Wertgegenstände'},{key:'forderungen',label:'VIII. Forderungen'},{key:'sonstiges',label:'IX. Sonstiges Vermögen'}];
  const aktiva=aCats.map(c=>({...c,val:getSum(c.key)}));
  const totA=aktiva.reduce((s,c)=>s+c.val,0), totP=getSum('verbindlichkeiten'), netto=totA-totP;
  const erl=gv('erl_name'),sterb=fmtDate(gv('erl_sterben')),erstellt=fmtDate(gv('erl_erstelldatum'));
  document.getElementById('dashboard_content').innerHTML=`
    ${erl?`<div class="erl-banner"><div class="erl-name">Nachlass: ${erl}</div><div class="erl-meta">Verstorben am ${sterb} · Verzeichnis erstellt am ${erstellt}</div></div>`:''}
    <div class="db-grid">
      <div class="db-card"><div class="db-card-title">A. Aktiva – Übersicht</div>
        ${aktiva.filter(c=>c.val>0).map(c=>`<div class="db-row"><span class="db-rl">${c.label.replace(/^[IVX]+\.\s*/,'')}</span><span class="db-rv">${eur(c.val)}</span></div>`).join('')}
        <div class="db-row" style="font-weight:600;border-top:2px solid var(--navy);margin-top:.3rem;padding-top:.4rem"><span class="db-rl" style="color:var(--navy)">Aktiva gesamt</span><span class="db-rv">${eur(totA)}</span></div>
      </div>
      <div class="db-card"><div class="db-card-title">B. Passiva</div>
        ${totP>0?`<div class="db-row"><span class="db-rl">Verbindlichkeiten gesamt</span><span class="db-rv neg">– ${eur(totP)}</span></div>`:'<div style="color:var(--text3);font-size:12.5px">Keine Verbindlichkeiten erfasst.</div>'}
        <div class="db-row" style="font-weight:600;border-top:2px solid var(--red);margin-top:.3rem;padding-top:.4rem"><span class="db-rl" style="color:var(--red)">Passiva gesamt</span><span class="db-rv neg">– ${eur(totP)}</span></div>
      </div>
      <div class="db-total"><div class="db-total-label">C. Reinnachlass (Aktiva − Passiva)</div><div class="db-total-val">${eur(netto)}</div><div class="db-total-sub">${eur(totA)} Aktiva − ${eur(totP)} Passiva = ${eur(netto)}</div></div>
      <div class="db-detail"><div class="db-card-title">Detaillierte Herleitung</div>
        ${aktiva.filter(c=>c.val>0).map(c=>`<div class="db-drow"><span class="db-dnum">${c.label.split('.')[0]}.</span><span class="db-dlabel">${c.label.replace(/^[IVX]+\.\s*/,'')}</span><span class="db-dval">${eur(c.val)}</span></div>`).join('')}
        ${totA>0?`<div class="db-dtotal"><span>Summe Aktiva</span><span>${eur(totA)}</span></div>`:''}
        ${totP>0?`<div class="db-dtotal" style="background:var(--red-bg);color:var(--red)"><span>Summe Passiva</span><span>– ${eur(totP)}</span></div>`:''}
        ${(totA>0||totP>0)?`<div class="db-dtotal" style="background:var(--navy);color:var(--amber2);font-size:14px"><span>Reinnachlass</span><span>${eur(netto)}</span></div>`:''}
      </div>
    </div>
    <div style="text-align:center;margin-top:1.5rem">
      <button onclick="exportPDF()" style="padding:.8rem 2rem;background:var(--navy);color:white;border:none;border-radius:var(--radius);font-size:14px;font-weight:600;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer">📄 Formales PDF exportieren</button>
      <p style="font-size:11px;color:var(--text3);margin-top:.5rem">Erzeugt ein gerichtsgerechtes Nachlassverzeichnis mit vollständiger Herleitung aller Werte</p>
    </div>`;
}

// =============================================
// JSON EXPORT / IMPORT
// =============================================
function exportJSON(){
  Object.keys(STATE).forEach(cat=>STATE[cat].forEach(p=>collectPosFields(cat,p)));
  const blob=new Blob([JSON.stringify(snap(),null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='nachlassnavi_'+(gv('erl_name')||'nachlass').replace(/\s+/g,'_')+'_'+new Date().toISOString().split('T')[0]+'.json';
  a.click();
}
function importJSON(evt){
  const file=evt.target.files[0]; if(!file)return;
  const r=new FileReader();
  r.onload=e=>{try{loadAll(JSON.parse(e.target.result));alert('Datei erfolgreich geladen.');}catch(err){alert('Fehler: '+err.message);}};
  r.readAsText(file); evt.target.value='';
}

// =============================================
// PDF EXPORT
// =============================================
async function exportPDF(){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210,ML=20,MR=20,TW=170,PH=297,MB=22;
  let y=0;
  function np(need=12){if(y+need>PH-MB){doc.addPage();y=25;}}
  function ln(x1,y1,x2,y2,r=180,g=180,b=170){doc.setDrawColor(r,g,b);doc.line(x1,y1,x2,y2);}
  function T(txt,x,yp,sz=10,st='normal',col=[26,26,46]){doc.setFontSize(sz);doc.setFont('helvetica',st);doc.setTextColor(...col);doc.text(String(txt||''),x,yp);}
  function TR(txt,x,yp,sz=10,st='normal',col=[26,26,46]){doc.setFontSize(sz);doc.setFont('helvetica',st);doc.setTextColor(...col);doc.text(String(txt||''),x,yp,{align:'right'});}
  function kv(label,val,x,yp,lw=58){T(label+':',x,yp,9,'normal',[100,110,125]);T(val||'–',x+lw,yp,9,'normal',[26,26,46]);}
  function secHead(title,roman){np(14);y+=5;doc.setFillColor(15,27,45);doc.rect(ML,y,TW,7,'F');T((roman?roman+'. ':'')+title,ML+3,y+5,10,'bold',[255,255,255]);y+=10;}
  function subHead(title){np(14);y+=14;doc.setFillColor(237,233,224);doc.rect(ML,y,TW,7,'F');T(title,ML+3,y+5,9,'bold',[26,26,46]);y+=14;}
  function row(label,val,indent=0,bold=false){np(8);T(label,ML+indent,y,9,bold?'bold':'normal',[74,85,104]);if(val!==undefined)TR(typeof val==='number'?eur(val):String(val||'–'),ML+TW,y,9,bold?'bold':'normal',[26,26,46]);y+=7;}
  function totRow(label,val,r=15,g=27,b=45,vc=[232,162,53]){np(11);doc.setFillColor(r,g,b);doc.rect(ML,y,TW,8,'F');T(label,ML+3,y+5.5,10,'bold',[255,255,255]);TR(eur(val),ML+TW-3,y+5.5,10,'bold',vc);y+=12;}

  const erlF=['name','geburt','sterben','geburtsname','staat','adresse','sterbeort','standesamt','aktenzeichen','gericht','erstelldatum','ersteller','verhaeltnis','anmerkung'];
  const erl={};erlF.forEach(f=>{erl[f]=gv('erl_'+f);});

  // Deckblatt
  doc.setFillColor(15,27,45);doc.rect(0,0,W,55,'F');
  doc.setFillColor(232,162,53);doc.rect(0,55,W,2.5,'F');
  T('NACHLASSPILOT',ML,20,22,'bold',[255,255,255]);
  T('Nachlassverzeichnis',ML,31,13,'normal',[200,210,220]);
  T('Vertrauliches Dokument – erstellt mit Nachlassnavi',ML,41,8,'italic',[140,155,175]);
  y=68;
  T('ERBLASSER',ML,y,8,'bold',[150,150,150]);y+=6;
  T(erl.name||'(Name nicht angegeben)',ML,y,17,'bold',[15,27,45]);y+=9;
  kv('geboren am',fmtDate(erl.geburt),ML,y);y+=6;
  kv('verstorben am',fmtDate(erl.sterben)+(erl.sterbeort?' in '+erl.sterbeort:''),ML,y);y+=6;
  kv('letzte Anschrift',erl.adresse,ML,y);y+=6;
  kv('Staatsangehörigkeit',erl.staat,ML,y);
  if(erl.geburtsname){y+=6;kv('Geburtsname',erl.geburtsname,ML,y);}
  y+=10;ln(ML,y,W-MR,y,200,200,190);y+=7;
  kv('Aktenzeichen',erl.aktenzeichen||'–',ML,y);y+=6;
  kv('Nachlassgericht',erl.gericht||'–',ML,y);y+=6;
  kv('Erstellt am',fmtDate(erl.erstelldatum)||'–',ML,y);y+=6;
  kv('Erstellt von',(erl.ersteller||'–')+(erl.verhaeltnis?' ('+erl.verhaeltnis+')':''),ML,y);
  if(erl.anmerkung){y+=10;const lines=doc.splitTextToSize('Anmerkung: '+erl.anmerkung,TW-6);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,lines.length*4.8+6,'F');doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(lines,ML+3,y+5);y+=lines.length*4.8+9;}

  // Seite 2: Hinweise
  doc.addPage();y=25;
  T('RECHTLICHE HINWEISE & INHALTSVERZEICHNIS',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  ['A. Aktiva','  I. Grundvermögen (Immobilien)','  II. Bankguthaben & Bargeld','  III. Wertpapiere & Investments','  IV. Fahrzeuge','  V. Versicherungen (Rückkaufwerte)','  VI. Unternehmensbeteiligungen','  VII. Wertgegenstände','  VIII. Forderungen','  IX. Sonstiges','B. Passiva','  X. Verbindlichkeiten','C. Reinnachlass'].forEach(i=>{T(i,ML,y,9,i.startsWith(' ')?'normal':'bold');y+=5.2;});
  y+=8;doc.setFillColor(254,243,224);doc.rect(ML,y,TW,46,'F');doc.setDrawColor(232,162,53);doc.rect(ML,y,TW,46,'S');
  T('Rechtliche Hinweise',ML+3,y+6,9,'bold',[184,134,11]);
  ['1. Dieses Verzeichnis wurde nach bestem Wissen und Gewissen erstellt.','2. Immobilienwerte basieren auf rechnerischen Schätzungen (Vergleichswert-, Ertragswert-','   und Sachwertverfahren gem. §§ 182–198 BewG) und ersetzen kein Sachverständigengutachten','   gemäß § 194 BauGB.','3. Alle Angaben beziehen sich auf den Sterbezeitpunkt des Erblassers als Stichtag.','4. Das Verzeichnis dient als Grundlage für die anwaltliche und gerichtliche Prüfung.','5. Unvollständigkeiten sind unverzüglich der Anwältin oder dem Nachlassgericht mitzuteilen.'].forEach((h,i)=>{T(h,ML+3,y+13+i*5,8,'normal',[74,85,104]);});
  y+=53;

  // A. AKTIVA
  np(15);y+=4;doc.setFillColor(15,27,45);doc.rect(ML,y,TW,11,'F');doc.setFillColor(232,162,53);doc.rect(ML,y,3.5,11,'F');T('A.  AKTIVA',ML+7,y+7.5,13,'bold',[255,255,255]);y+=15;

  // I. Immobilien
  if(STATE.immobilien.length>0){
    secHead('Grundvermögen (Immobilien)','I');
    STATE.immobilien.forEach((p,i)=>{
      subHead(`${i+1}. ${p.bez||'Immobilie '+(i+1)}`);
      if(p.typ)row(`Gebäudetyp: ${p.typ||'–'} · Wohnfläche: ${p.wfl||'–'} m²${p.gfl?' · Grundstück: '+p.gfl+' m²':''}`,undefined,3);
      if(p.bj)row(`Baujahr: ${p.bj}${p.renov?' · Renovierung: '+p.renov:''} · Zustand: ${p.zustand||5}/10`,undefined,3);
      if(p.miko)row(`Lage: PLZ ${p.plz||'–'} · Mikro: ${p.miko} · Makro: ${p.mako||'–'} · ÖPNV: ${p.oepnv||'–'}`,undefined,3);
      if(p.ek)row(`Energieeffizienz: Klasse ${p.ek}${p.heizung?' · Heizung: '+p.heizung:''}`,undefined,3);
      if(p.bewertung){
        const b=p.bewertung;
        y+=7;T('Bewertungsherleitung:',ML+3,y,9,'bold',[26,26,46]);y+=7;
        np(22);doc.setFillColor(247,244,239);doc.rect(ML+3,y,TW-3,18,'F');
        T('Marktdaten-Basis (PLZ-Referenzdatenbank):',ML+5,y+4.5,8.5,'bold',[74,85,104]);
        T('Bodenrichtwert:',ML+5,y+10,8,'normal',[100,110,125]);TR(eur(b.brw)+'/m²',ML+TW-3,y+10,8,'normal',[26,26,46]);
        T('Vergleichsmarktpreis:',ML+5,y+16,8,'normal',[100,110,125]);TR(eur(b.markt_qm)+'/m²',ML+TW-3,y+16,8,'normal',[26,26,46]);
        y+=21;
        np(8+b.factors.length*4.5);T(`Korrekturfaktoren (Gesamtfaktor: ${(b.ges_f*100).toFixed(1)}%):`,ML+3,y,8.5,'bold',[74,85,104]);y+=5;
        b.factors.forEach(f=>{np(5);T('• '+f.n+':',ML+6,y,8,'normal',[100,110,125]);const col=f.v>=0?[45,122,79]:[192,57,43];doc.setFontSize(8);doc.setFont('helvetica','bold');doc.setTextColor(...col);doc.text((f.v>=0?'+':'')+f.v.toFixed(1)+'%',ML+TW,y,{align:'right'});y+=4.5;});
        y+=3;np(52);doc.setFillColor(247,244,239);doc.rect(ML+3,y,TW-3,46,'F');
        T('Drei-Verfahren-Bewertung:',ML+5,y+5,9,'bold',[15,27,45]);
        T(`Vergleichswertverfahren (${Math.round(b.wVW*100)}%)`,ML+5,y+12,8.5,'normal',[74,85,104]);
        T(`${eur(b.markt_qm)}/m² x ${b.wfl} m² x Korrekturfaktor ${b.ges_f.toFixed(3)}`,ML+8,y+17.5,7.5,'normal',[120,130,140]);TR(eur(b.vw),ML+TW-3,y+12,8.5,'bold',[26,26,46]);
        T(`Ertragswertverfahren (${Math.round(b.wEW*100)}%)`,ML+5,y+24,8.5,'normal',[74,85,104]);
        T(`Reinertrag ${eur(b.reinertrag)} x Kap.-Fak. ${b.kap_fak.toFixed(1)} (Zins ${b.kap_zins}%, RND ${b.rnd} J.) + Bodenwert`,ML+8,y+29.5,7.5,'normal',[120,130,140]);TR(eur(b.ew),ML+TW-3,y+24,8.5,'bold',[26,26,46]);
        T(`Sachwertverfahren (${Math.round(b.wSW*100)}%)`,ML+5,y+36,8.5,'normal',[74,85,104]);
        T(`HK ${eur(b.hk_qm)}/m² x ${b.wfl} m² - Altersmind. ${((b.altMind||0)*100).toFixed(0)}% + Bodenwert`,ML+8,y+41.5,7.5,'normal',[120,130,140]);TR(eur(b.sw),ML+TW-3,y+36,8.5,'bold',[26,26,46]);
        y+=50;np(12);doc.setFillColor(15,27,45);doc.rect(ML+3,y,TW-3,9,'F');
        T('Gewichteter Marktwert:',ML+5,y+6,9,'bold',[255,255,255]);TR(eur(b.mw),ML+TW-3,y+6,10,'bold',[232,162,53]);y+=11;
        T(`Bewertungsbandbreite: ${eur(b.mw_min)} – ${eur(b.mw_max)} (±12%)`,ML+5,y,8,'italic',[150,150,150]);y+=7;
      } else { row('Keine rechnerische Bewertung durchgeführt.',undefined,3); }
      if(p.anm){np(8);T('Anmerkung: '+p.anm,ML+3,y,8,'italic',[100,110,125]);y+=6;}
      y+=3;ln(ML+3,y,W-MR-3,y,220,215,205);y+=5;
    });
    totRow('Summe I. Grundvermögen (Immobilien)',getSum('immobilien'));
  }

  function simpleSec(cat,roman,label,fields){
    if(!STATE[cat].length)return;
    secHead(label,roman);
    STATE[cat].forEach((p,i)=>{
      subHead(`${i+1}. ${p.bez||label+' '+(i+1)}`);
      fields.forEach(([fk,fl,ff])=>{const v=p[fk];if(!v&&v!==0)return;let d=v;if(ff==='date')d=fmtDate(v);else if(ff==='eur')d=eur(parseN(v));const vStr=String(d||'–');if(ff==='eur'){np(7);T(fl+':',ML+3,y,8.5,'normal',[100,110,125]);TR(vStr,ML+TW,y,9,'bold',[26,26,46]);y+=7;}else{const vL=doc.splitTextToSize(vStr,TW-72);np(7+(vL.length-1)*4.8);T(fl+':',ML+3,y,8.5,'normal',[100,110,125]);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(26,26,46);doc.text(vL,ML+72,y);y+=7+(vL.length-1)*4.8;}});
      if(p.anm){np(7);T('Anmerkung: '+p.anm,ML+3,y,8,'italic',[100,110,125]);y+=6;}
      y+=4;ln(ML+3,y,W-MR-3,y,220,215,205);y+=6;
    });
    totRow('Summe '+roman+'. '+label,getSum(cat));
  }

  simpleSec('bankkonten','II','Bankguthaben & Bargeld',[['institut','Kreditinstitut'],['art','Kontoart'],['iban','IBAN (letzte 4)'],['saldo','Kontostand per Stichtag','eur'],['datum','Stichtag (Kontoauszug)','date'],['waehrung','Währung'],['gemein','Gemeinschaftskonto']]);
  simpleSec('wertpapiere','III','Wertpapiere & Investments',[['depot','Depotbank'],['depotnr','Depotnummer (letzte 4)'],['art','Art'],['wert','Kurswert gesamt','eur'],['datum','Bewertungsstichtag','date'],['positionen','Einzelpositionen']]);
  simpleSec('fahrzeuge','IV','Fahrzeuge',[['art','Fahrzeugart'],['marke','Marke'],['modell','Modell'],['bj','Baujahr'],['km','Kilometerstand'],['kz','Kennzeichen'],['fin','FIN'],['wert','Zeitwert','eur'],['grundlage','Bewertungsgrundlage']]);
  simpleSec('versicherungen','V','Lebens- & Rentenversicherungen',[['gesellschaft','Versicherungsgesellschaft'],['art','Art'],['vtnr','Vertragsnummer'],['rkw','Rückkaufwert','eur'],['datum','Stichtag','date'],['bezugs','Bezugsberechtigter'],['summe','Versicherungssumme','eur']]);
  simpleSec('beteiligungen','VI','Unternehmensbeteiligungen',[['unternehmen','Unternehmen'],['rechtsform','Rechtsform'],['hrb','Handelsregister'],['anteil','Anteil (%)'],['stammkap','Stammkapital','eur'],['wert','Wert des Anteils','eur'],['grundlage','Bewertungsgrundlage']]);
  simpleSec('wertgegenstaende','VII','Wertgegenstände',[['kat','Kategorie'],['beschr','Beschreibung/Herkunft'],['wert','Geschätzter Wert','eur'],['grundlage','Bewertungsgrundlage']]);
  simpleSec('forderungen','VIII','Forderungen',[['schuldner','Schuldner'],['art','Art'],['betrag','Forderungsbetrag','eur'],['faellig','Fälligkeit','date'],['sicherung','Gesichert durch']]);
  simpleSec('sonstiges','IX','Sonstiges Vermögen',[['art','Art'],['beschr','Beschreibung'],['wert','Geschätzter Wert','eur']]);

  const totA=['immobilien','bankkonten','wertpapiere','fahrzeuge','versicherungen','beteiligungen','wertgegenstaende','forderungen','sonstiges'].reduce((s,c)=>s+getSum(c),0);
  np(14);y+=3;doc.setFillColor(15,27,45);doc.rect(ML,y,TW,10,'F');T('SUMME A. AKTIVA (I.–IX.)',ML+3,y+7,11,'bold',[255,255,255]);TR(eur(totA),ML+TW,y+7,12,'bold',[100,220,150]);y+=14;

  // B. PASSIVA
  np(14);doc.setFillColor(192,57,43);doc.rect(ML,y,TW,11,'F');doc.setFillColor(250,160,160);doc.rect(ML,y,3.5,11,'F');T('B.  PASSIVA',ML+7,y+7.5,13,'bold',[255,255,255]);y+=15;
  simpleSec('verbindlichkeiten','X','Verbindlichkeiten',[['glaeubiger','Gläubiger'],['art','Art'],['restschuld','Restschuld','eur'],['zinssatz','Zinssatz (% p.a.)'],['faellig','Fälligkeit','date'],['vertrnr','Darlehensvertrag-Nr.'],['sicherung','Gesichert durch']]);
  const totP=getSum('verbindlichkeiten');
  np(12);doc.setFillColor(192,57,43);doc.rect(ML,y,TW,10,'F');T('SUMME B. PASSIVA (X.)',ML+3,y+7,11,'bold',[255,255,255]);TR('– '+eur(totP),ML+TW,y+7,12,'bold',[255,160,160]);y+=14;

  // C. REINNACHLASS
  const netto=totA-totP;
  np(22);y+=5;doc.setFillColor(15,27,45);doc.rect(ML,y,TW,17,'F');doc.setFillColor(232,162,53);doc.rect(ML,y,4,17,'F');
  T('C.  REINNACHLASS',ML+7,y+8,13,'bold',[255,255,255]);T('Aktiva '+eur(totA)+' − Passiva '+eur(totP),ML+7,y+14,8,'normal',[180,195,210]);TR(eur(netto),ML+TW,y+11,14,'bold',[232,162,53]);y+=22;

  // Unterschrift
  np(52);y+=8;T('Versicherung der Vollständigkeit und Richtigkeit',ML,y,9,'bold',[15,27,45]);y+=6;
  const vLines=doc.splitTextToSize('Die vorstehenden Angaben sind nach bestem Wissen und Gewissen gemacht. Das Verzeichnis umfasst alle dem Unterzeichner bekannten Nachlassgegenstände zum Sterbezeitpunkt des Erblassers. Etwaige Unvollständigkeiten oder Unrichtigkeiten werden unverzüglich der Anwältin oder dem Nachlassgericht mitgeteilt.',TW);
  doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(vLines,ML,y);y+=vLines.length*4.5+14;
  ln(ML,y,ML+72,y);ln(ML+95,y,ML+TW,y);y+=5;
  T('Ort, Datum',ML,y,8,'normal',[150,150,150]);T('Unterschrift ('+(erl.ersteller||'Erbe')+(erl.verhaeltnis?', '+erl.verhaeltnis:'')+')' ,ML+95,y,8,'normal',[150,150,150]);

  // Seitenzahlen
  const total=doc.internal.getNumberOfPages();
  for(let i=1;i<=total;i++){
    doc.setPage(i);doc.setFontSize(7.5);doc.setFont('helvetica','normal');doc.setTextColor(170,170,170);
    doc.text('Seite '+i+' / '+total,W/2,PH-10,{align:'center'});
    doc.text('Nachlassnavi – Vertrauliches Nachlassverzeichnis',ML,PH-10);
    doc.text(new Date().toLocaleDateString('de-DE'),W-MR,PH-10,{align:'right'});
  }
  const fname='nachlassnavi_'+(erl.name||'nachlass').replace(/\s+/g,'_')+'_'+new Date().toISOString().split('T')[0]+'.pdf';
  if(hasGutachten()){
    await mergeAndSavePDF(doc,fname);
  } else {
    doc.save(fname);
  }
}

// =============================================
// GUTACHTEN – IMMOBILIE (ImmoWertV 2021)
// =============================================
function exportGutachtenImmo(id){
  const p=STATE.immobilien.find(x=>x.id===id);
  if(!p)return;
  collectPosFields('immobilien',p);
  if(!p.bewertung){
    if(!confirm('Noch keine Bewertung berechnet. Jetzt berechnen und Gutachten erstellen?'))return;
    calcImmo(id);
  }
  const pp=STATE.immobilien.find(x=>x.id===id);
  if(!pp||!pp.bewertung){alert('Bewertung konnte nicht berechnet werden.');return;}
  const b=pp.bewertung;
  const erl={};
  ['name','sterben','adresse','aktenzeichen','gericht','erstelldatum','ersteller','verhaeltnis'].forEach(f=>{erl[f]=gv('erl_'+f);});
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210,ML=20,MR=20,TW=170,PH=297,MB=22;
  let y=0;
  function np(n=12){if(y+n>PH-MB){doc.addPage();y=25;}}
  function ln(x1,y1,x2,y2,r=180,g=180,b=170){doc.setDrawColor(r,g,b);doc.line(x1,y1,x2,y2);}
  function T(txt,x,yp,sz=10,st='normal',col=[26,26,46]){doc.setFontSize(sz);doc.setFont('helvetica',st);doc.setTextColor(...col);doc.text(String(txt||''),x,yp);}
  function TR(txt,x,yp,sz=10,st='normal',col=[26,26,46]){doc.setFontSize(sz);doc.setFont('helvetica',st);doc.setTextColor(...col);doc.text(String(txt||''),x,yp,{align:'right'});}
  function kv(label,val,x,yp,lw=65){T(label+':',x,yp,9,'normal',[100,110,125]);T(val||'–',x+lw,yp,9,'normal',[26,26,46]);}
  function wrap(txt,x,yp,w,sz=8.5,col=[74,85,104]){const lines=doc.splitTextToSize(txt,w);doc.setFontSize(sz);doc.setFont('helvetica','normal');doc.setTextColor(...col);doc.text(lines,x,yp);return lines.length;}
  const stichtag=fmtDate(erl.sterben)||fmtDate(erl.erstelldatum)||new Date().toLocaleDateString('de-DE');
  const erstDatum=fmtDate(erl.erstelldatum)||new Date().toLocaleDateString('de-DE');
  const nutzN=parseN(p.nutz);

  // DECKBLATT
  doc.setFillColor(15,27,45);doc.rect(0,0,W,65,'F');
  doc.setFillColor(232,162,53);doc.rect(0,65,W,2.5,'F');
  T('VERKEHRSWERTGUTACHTEN',ML,22,18,'bold',[255,255,255]);
  T('Immobilienbewertung nach ImmoWertV 2021',ML,33,11,'normal',[200,210,220]);
  T('Erstattet im Rahmen der Nachlassermittlung',ML,41,9,'normal',[160,175,195]);
  T('Vertraulich – Anwaltliche Unterlagen',ML,51,8,'italic',[140,155,175]);
  y=77;
  T('BEWERTUNGSOBJEKT',ML,y,8,'bold',[150,150,150]);y+=6;
  T(p.bez||'(Bezeichnung nicht angegeben)',ML,y,15,'bold',[15,27,45]);y+=9;
  if(p.typ||p.wfl){kv('Objekttyp',(p.typ||'–')+(p.wfl?' · '+p.wfl+' m² Wohnfläche':''),ML,y);y+=6;}
  if(p.bj){kv('Baujahr / Zustand',p.bj+(p.zustand?' · Zustand '+p.zustand+'/10':''),ML,y);y+=6;}
  kv('Bewertungsstichtag',stichtag,ML,y);y+=6;
  kv('Aktenzeichen',erl.aktenzeichen||'–',ML,y);y+=6;
  kv('Nachlassgericht',erl.gericht||'–',ML,y);y+=6;
  kv('Erstellt am',erstDatum,ML,y);y+=6;
  kv('Erstellt von',(erl.ersteller||'–')+(erl.verhaeltnis?' ('+erl.verhaeltnis+')':''),ML,y);
  y+=12;ln(ML,y,W-MR,y,200,200,190);y+=8;
  doc.setFillColor(254,243,224);doc.rect(ML,y,TW,22,'F');
  doc.setDrawColor(232,162,53);doc.rect(ML,y,TW,22,'S');
  T('Ermittelter Verkehrswert (§ 194 BauGB)',ML+4,y+6,9,'normal',[184,134,11]);
  T(eur(b.mw),ML+4,y+14,16,'bold',[15,27,45]);
  T('Bewertungsbandbreite: '+eur(b.mw_min)+' – '+eur(b.mw_max)+' (±12%)',ML+4,y+20,8,'normal',[120,120,120]);
  y+=28;

  // I. RECHTSGRUNDLAGEN
  doc.addPage();y=25;
  T('I.  RECHTSGRUNDLAGEN UND BEWERTUNGSAUFTRAG',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  T('1. Auftrag und Zweck',ML,y,9,'bold',[26,26,46]);y+=6;
  const auftragText='Das vorliegende Gutachten dient der Ermittlung des Verkehrswerts der bezeichneten Immobilie im Rahmen der Nachlassermittlung nach dem Erbfall. Es wurde auf der Grundlage der vom Erben übermittelten Daten und der PLZ-basierten Referenzdatenbank erstellt. Das Gutachten soll die anwaltliche und gerichtliche Prüfung des Nachlasses unterstützen.';
  const l1=doc.splitTextToSize(auftragText,TW);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(l1,ML,y);y+=l1.length*4.8+7;
  T('2. Rechtsgrundlagen',ML,y,9,'bold',[26,26,46]);y+=7;
  const rechtsBasis=[
    ['§ 194 BauGB','Verkehrswertdefinition: Der Verkehrswert (Marktwert) wird durch den Preis bestimmt, der in dem Zeitpunkt, auf den sich die Ermittlung bezieht, im gewöhnlichen Geschäftsverkehr nach den rechtlichen Gegebenheiten und tatsächlichen Eigenschaften, der sonstigen Beschaffenheit und der Lage des Grundstücks ohne Rücksicht auf ungewöhnliche oder persönliche Verhältnisse zu erzielen wäre (BauGB i.d.F. vom 03.11.2017, BGBl. I S. 3634).'],
    ['ImmoWertV 2021','Immobilienwertermittlungsverordnung vom 14.07.2021 (BGBl. I S. 2805): Normiert die anerkannten Wertermittlungsverfahren – Vergleichswertverfahren (§§ 24–26), Ertragswertverfahren (§§ 27–34) und Sachwertverfahren (§§ 35–39). § 8 regelt die Verkehrswertableitung aus den Verfahrensergebnissen.'],
    ['§ 2 ImmoWertV 2021','Stichtag der Wertermittlung: Maßgebend sind die rechtlichen und tatsächlichen Grundstücksverhältnisse sowie die allgemeinen Wertverhältnisse am Wertermittlungsstichtag (Sterbezeitpunkt des Erblassers).'],
    ['§§ 182–198 BewG','Bewertungsgesetz: Ergänzende steuerliche Bewertungsgrundlagen für Grundbesitz, insbesondere für die Erbschaft- und Schenkungsteuerbewertung nach §§ 157 ff. BewG i.V.m. § 12 Abs. 3 ErbStG.'],
  ];
  rechtsBasis.forEach(([norm,text])=>{
    np(22);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,5,'F');
    T(norm,ML+3,y+3.5,8.5,'bold',[15,27,45]);y+=6;
    const tl=doc.splitTextToSize(text,TW-6);doc.setFontSize(7.8);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(tl,ML+3,y);y+=tl.length*4.3+5;
  });
  T('3. Literatur und Quellen',ML,y,9,'bold',[26,26,46]);y+=7;
  const literatur=[
    'Kleiber, W. / Simon, J.: Verkehrswertermittlung von Grundstücken, 9. Aufl., Bundesanzeiger Verlag / Beck-Verlag, München 2023.',
    'Rössler, R. / Langner, J.: Schätzung und Ermittlung von Grundstückswerten, 12. Aufl., Luchterhand Verlag, 2023.',
    'Sommer, G. / Kröll, R.: Lehrbuch zur Grundstückswertermittlung, 5. Aufl., Luchterhand Verlag, 2023.',
    'Bundesministerium der Justiz (BMJ): Bekanntmachung der ImmoWertV 2021, BGBl. I S. 2805.',
    'BMWSB: Normalherstellungskosten NHK 2010 / BKI 2025, Bundesanzeiger Verlag.',
    'BGH, Urt. v. 22.04.2015 – IV ZR 504/14: Zur Bewertung von Nachlassgrundstücken nach § 194 BauGB.',
    'BGH, Urt. v. 07.06.2019 – V ZR 175/18: Zur Methodik der Verkehrswertermittlung.',
    'BFH, Urt. v. 11.05.2018 – II R 28/15: Grundbesitzbewertung für Zwecke der Erbschaftsteuer.',
    'OLG München, Beschl. v. 12.03.2020 – 34 Wx 6/20: Nachlassbewertung und Sachverständigengutachten.',
  ];
  literatur.forEach((s,i)=>{
    np(9);const tl=doc.splitTextToSize('['+(i+1)+']  '+s,TW);
    doc.setFontSize(7.8);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(tl,ML,y);y+=tl.length*4.3+2;
  });

  // II. OBJEKTBESCHREIBUNG
  doc.addPage();y=25;
  T('II.  BESCHREIBUNG DES BEWERTUNGSOBJEKTS',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const objektData=[
    ['Bezeichnung / Adresse',p.bez||'–'],['Gebäudetyp',p.typ||'–'],['Wohnfläche',p.wfl?(p.wfl+' m²'):'–'],
    ['Grundstücksfläche',p.gfl?(p.gfl+' m²'):'–'],['Nutzfläche',p.nutz?(p.nutz+' m²'):'–'],
    ['Baujahr',p.bj||'–'],['Letztes Renovierungsjahr',p.renov||'–'],
    ['Effektives Gebäudealter',b.eff_alter?(b.eff_alter+' Jahre'):'–'],['Restnutzungsdauer',b.rnd?(b.rnd+' Jahre'):'–'],
    ['Objektzustand',(p.zustand||5)+'/10'],['Etage',p.etage||'–'],['Ausrichtung',p.ausrichtung||'–'],
    ['Energieeffizienzklasse',p.ek||'–'],['Heizungsart',p.heizung||'–'],['Dämmstandard',p.daem||'–'],
    ['PLZ / Lage',p.plz||'–'],['Mikrolage',p.miko||'–'],['Makrolage',p.mako||'–'],
    ['ÖPNV-Anbindung',p.oepnv||'–'],['Vermietungssituation',p.verm||'–'],
  ];
  const ausstattung=[];
  [['aufzug','Aufzug'],['garage','Garage/Stellplatz'],['balkon','Balkon/Terrasse'],['garten','Garten'],['keller','Keller'],['eik','Einbauküche'],['parkett','Parkett/Dielen'],['bf','Barrierefrei'],['pv','Photovoltaik'],['wp','Wärmepumpe']].forEach(([f,l])=>{if(p[f])ausstattung.push(l);});
  if(ausstattung.length)objektData.push(['Ausstattungsmerkmale',ausstattung.join(', ')]);
  objektData.forEach(([k,v])=>{
    if(!v||v==='–')return;
    np(7);T(k+':',ML,y,9,'normal',[100,110,125]);
    const vl=doc.splitTextToSize(String(v),TW-75);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(26,26,46);doc.text(vl,ML+75,y);y+=Math.max(6,vl.length*4.8);
  });
  if(p.anm){y+=4;np(10);T('Anmerkung:',ML,y,9,'normal',[100,110,125]);const al=doc.splitTextToSize(p.anm,TW-75);doc.setFontSize(9);doc.setFont('helvetica','italic');doc.setTextColor(74,85,104);doc.text(al,ML+75,y);y+=al.length*4.8+4;}

  // III. MARKTDATEN
  y+=6;T('III.  MARKTDATEN UND LAGEBESCHREIBUNG',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  np(32);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,28,'F');
  T('Marktdaten-Basis (PLZ-Referenzdatenbank)',ML+3,y+5,9,'bold',[26,26,46]);
  T('Bodenrichtwert (BRW):',ML+5,y+12,8.5,'normal',[100,110,125]);TR(eur(b.brw)+'/m²',ML+TW-3,y+12,8.5,'bold',[26,26,46]);
  T('Vergleichsmarktpreis (Kaufpreis Ø):',ML+5,y+18,8.5,'normal',[100,110,125]);TR(eur(b.markt_qm)+'/m²',ML+TW-3,y+18,8.5,'bold',[26,26,46]);
  T('Mietmarkt (Kaltmiete Ø):',ML+5,y+24,8.5,'normal',[100,110,125]);TR(eur(b.jahreskalt/b.wfl/12)+'/m²/Mon.',ML+TW-3,y+24,8.5,'bold',[26,26,46]);
  y+=32;
  const lagebeschr='Die Lagebewertung erfolgt anhand des Mikro-/Makrolageindex sowie der ÖPNV-Anbindung gemäß § 3 Abs. 1 Nr. 3 ImmoWertV 2021. Der ermittelte Gesamtlagefaktor beträgt '+((b.ges_f||1)*100).toFixed(1)+' %. Die spezifischen Marktverhältnisse des Postleitzahlbereichs fließen gemäß der hinterlegten PLZ-Referenzdatenbank ein.';
  np(20);const lll=doc.splitTextToSize(lagebeschr,TW);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(lll,ML,y);y+=lll.length*4.8+6;
  np(10+b.factors.length*5.5);
  T('Wertrelevante Korrekturfaktoren (§ 8 Abs. 2 ImmoWertV 2021):',ML,y,9,'bold',[26,26,46]);y+=7;
  b.factors.forEach(f=>{
    np(6);doc.setFillColor(f.v>=0?240:255,f.v>=0?248:240,f.v>=0?240:240);doc.rect(ML,y-3.5,TW,5.5,'F');
    T('• '+f.n+':',ML+3,y,8.5,'normal',[74,85,104]);
    const col=f.v>=0?[45,122,79]:[192,57,43];
    doc.setFontSize(8.5);doc.setFont('helvetica','bold');doc.setTextColor(...col);doc.text((f.v>=0?'+':'')+f.v.toFixed(1)+'%',ML+TW,y,{align:'right'});y+=5.5;
  });
  np(7);doc.setFillColor(237,233,224);doc.rect(ML,y-2,TW,6,'F');
  T('Gesamtkorrekturfaktor:',ML+3,y+2.5,9,'bold',[26,26,46]);TR(((b.ges_f||1)*100).toFixed(1)+'%',ML+TW,y+2.5,9,'bold',[26,26,46]);y+=9;

  // IV. VERGLEICHSWERTVERFAHREN
  doc.addPage();y=25;
  T('IV.  VERGLEICHSWERTVERFAHREN (§§ 24–26 ImmoWertV 2021)',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const vwText1='Das Vergleichswertverfahren nach §§ 24–26 ImmoWertV 2021 ermittelt den Verkehrswert aus tatsächlich erzielten Kaufpreisen vergleichbarer Objekte. Gemäß § 24 Abs. 1 ImmoWertV 2021 ist der Vergleichswert aus einer ausreichenden Zahl von Kaufpreisen wertmäßig geeigneter Vergleichsgrundstücke abzuleiten. Die Vergleichspreise sind durch Zu- und Abschläge (Korrekturfaktor) an das Bewertungsobjekt anzupassen (§ 24 Abs. 2 ImmoWertV 2021).';
  np(25);const vwl1=doc.splitTextToSize(vwText1,TW);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(vwl1,ML,y);y+=vwl1.length*4.8+5;
  T('Rechnerische Herleitung:',ML,y,9,'bold',[26,26,46]);y+=6;
  np(30);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,24,'F');
  T('Vergleichsmarktpreis (PLZ-Referenz):',ML+4,y+6,8.5,'normal',[100,110,125]);TR(eur(b.markt_qm)+'/m²',ML+TW-4,y+6,8.5,'bold',[26,26,46]);
  T('Wohnfläche:',ML+4,y+12,8.5,'normal',[100,110,125]);TR(b.wfl+' m²',ML+TW-4,y+12,8.5,'bold',[26,26,46]);
  T('Korrekturfaktor (Lage, Zustand, Ausstattung etc.):',ML+4,y+18,8.5,'normal',[100,110,125]);TR((b.ges_f||1).toFixed(3),ML+TW-4,y+18,8.5,'bold',[26,26,46]);
  y+=26;
  np(10);doc.setFillColor(15,27,45);doc.rect(ML,y,TW,8,'F');
  T('Vergleichswert = '+eur(b.markt_qm)+'/m² x '+b.wfl+' m² x '+(b.ges_f||1).toFixed(3)+' =',ML+4,y+5.5,8.5,'normal',[200,210,220]);
  TR(eur(b.vw),ML+TW-4,y+5.5,10,'bold',[232,162,53]);y+=12;
  T('Gewichtungsanteil: '+Math.round(b.wVW*100)+'% am gewichteten Verkehrswert',ML,y,8,'italic',[120,130,140]);y+=10;

  // V. ERTRAGSWERTVERFAHREN
  y+=4;T('V.  ERTRAGSWERTVERFAHREN (§§ 27–34 ImmoWertV 2021)',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const ewText1='Das Ertragswertverfahren nach §§ 27–34 ImmoWertV 2021 ermittelt den Verkehrswert anhand der nachhaltig erzielbaren Reinerträge des Grundstücks. Gemäß § 27 ImmoWertV 2021 setzt sich der Ertragswert aus dem kapitalisierten Gebäudeertragswert und dem Bodenwertanteil zusammen.';
  np(25);const ewl1=doc.splitTextToSize(ewText1,TW);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(ewl1,ML,y);y+=ewl1.length*4.8+5;
  T('Rechnerische Herleitung:',ML,y,9,'bold',[26,26,46]);y+=6;
  const rohertrag=b.jahreskalt;
  const bkz_pct=b.gfl>0?22:28;
  const bkz=rohertrag*(bkz_pct/100);
  const bodenEW=b.brw*(b.boden_anteil||b.wfl*1.2);
  np(54);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,48,'F');
  T('Rohertrag (Jahres-Kaltmiete): '+b.wfl+' m² x '+eur(b.jahreskalt/b.wfl/12)+'/m²/Mon. x 12',ML+4,y+6,8.5,'normal',[100,110,125]);TR(eur(rohertrag)+'/Jahr',ML+TW-4,y+6,8.5,'bold',[26,26,46]);
  T('./. Bewirtschaftungskosten (§ 32 ImmoWertV 2021, '+bkz_pct+'%):',ML+4,y+12,8.5,'normal',[100,110,125]);TR('./. '+eur(bkz)+'/Jahr',ML+TW-4,y+12,8.5,'normal',[192,57,43]);
  T('= Reinertrag des Gebäudes (§ 31 ImmoWertV 2021):',ML+4,y+18,8.5,'bold',[74,85,104]);TR(eur(b.reinertrag)+'/Jahr',ML+TW-4,y+18,8.5,'bold',[26,26,46]);
  T('Liegenschaftszinssatz (§ 33 ImmoWertV 2021, BRW-abhängig): '+b.kap_zins+'% p.a.',ML+4,y+24,8.5,'normal',[100,110,125]);
  T('Restnutzungsdauer (§ 6 ImmoWertV 2021): '+b.rnd+' Jahre',ML+4,y+30,8.5,'normal',[100,110,125]);
  T('Vervielfältiger (§ 34 ImmoWertV 2021): '+b.kap_fak.toFixed(2),ML+4,y+36,8.5,'bold',[74,85,104]);
  T('+ Bodenwertanteil (§ 28 ImmoWertV 2021, BRW '+eur(b.brw)+'/m² x '+(b.boden_anteil||b.wfl*1.2).toFixed(0)+' m² MEA):',ML+4,y+42,8.5,'normal',[100,110,125]);TR(eur(bodenEW),ML+TW-4,y+42,8.5,'normal',[26,26,46]);
  y+=50;
  np(10);doc.setFillColor(15,27,45);doc.rect(ML,y,TW,8,'F');
  T('Ertragswert = Reinertrag x Vervielfältiger + Bodenwertanteil =',ML+4,y+5.5,8.5,'normal',[200,210,220]);
  TR(eur(b.ew),ML+TW-4,y+5.5,10,'bold',[232,162,53]);y+=12;
  T('Gewichtungsanteil: '+Math.round(b.wEW*100)+'% am gewichteten Verkehrswert',ML,y,8,'italic',[120,130,140]);y+=10;

  // VI. SACHWERTVERFAHREN
  doc.addPage();y=25;
  T('VI.  SACHWERTVERFAHREN (§§ 35–39 ImmoWertV 2021)',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const swText1='Das Sachwertverfahren nach §§ 35–39 ImmoWertV 2021 ermittelt den Verkehrswert anhand der Herstellungskosten des Gebäudes unter Berücksichtigung der Alterswertminderung sowie dem Bodenwert. Es eignet sich vorrangig für eigengenutztes Wohneigentum (§ 35 ImmoWertV 2021). Die Regelherstellungskosten (RHK) basieren auf der NHK 2010 (§ 36 ImmoWertV 2021).';
  np(25);const swl1=doc.splitTextToSize(swText1,TW);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(swl1,ML,y);y+=swl1.length*4.8+5;
  T('Rechnerische Herleitung:',ML,y,9,'bold',[26,26,46]);y+=6;
  const swBoxH=nutzN>0?54:48;
  np(swBoxH+6);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,swBoxH,'F');
  T('Regelherstellungskosten (§ 36 ImmoWertV / NHK 2010/BKI 2025): '+eur(b.hk_qm)+'/m²',ML+4,y+6,8.5,'normal',[100,110,125]);
  T('Bruttogrundfläche / Wohnfläche: '+b.wfl+' m²',ML+4,y+12,8.5,'normal',[100,110,125]);
  T('Rohbauwert: '+eur(b.hk_qm)+'/m² x '+b.wfl+' m²:',ML+4,y+18,8.5,'normal',[100,110,125]);TR(eur(b.hk_qm*b.wfl),ML+TW-4,y+18,8.5,'bold',[26,26,46]);
  T('./. Alterswertminderung (§ 38 ImmoWertV 2021): '+((b.altMind||0)*100).toFixed(0)+'%',ML+4,y+24,8.5,'normal',[100,110,125]);TR('./. '+eur(b.hk_qm*b.wfl*(b.altMind||0)),ML+TW-4,y+24,8.5,'normal',[192,57,43]);
  T('x Zustandsfaktor (Objektzustand '+(p.zustand||5)+'/10)',ML+4,y+30,8.5,'normal',[100,110,125]);
  T('= Gebäudesachwert (§ 37 ImmoWertV 2021):',ML+4,y+36,8.5,'bold',[74,85,104]);TR(eur(b.geb_sw),ML+TW-4,y+36,8.5,'bold',[26,26,46]);
  T('+ Bodenwert (§ 39 ImmoWertV 2021, BRW '+eur(b.brw)+'/m² x '+(b.boden_anteil||(b.gfl>0?b.gfl:b.wfl*1.2)).toFixed(0)+' m² MEA):',ML+4,y+42,8.5,'normal',[100,110,125]);TR(eur(b.bod_sw),ML+TW-4,y+42,8.5,'normal',[26,26,46]);
  if(nutzN>0){T('+ Nutzflächenanteil: '+nutzN+' m² x 500 €/m²:',ML+4,y+48,8.5,'normal',[100,110,125]);TR(eur(nutzN*500*(1-(b.altMind||0))),ML+TW-4,y+48,8.5,'normal',[26,26,46]);}
  y+=swBoxH+2;
  np(14);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,10,'F');
  T('Vorläufiger Sachwert (vor Marktanpassung):',ML+4,y+4,8.5,'normal',[100,110,125]);TR(eur(b.sw_roh||b.sw),ML+TW-4,y+4,8.5,'normal',[26,26,46]);
  T('x Sachwertfaktor (§ 39 ImmoWertV 2021, BRW-abhängig): '+(b.sw_faktor||1).toFixed(2),ML+4,y+8.5,8.5,'bold',[74,85,104]);
  y+=13;
  np(10);doc.setFillColor(15,27,45);doc.rect(ML,y,TW,8,'F');
  T('Sachwert = Vorläufiger Sachwert x Sachwertfaktor =',ML+4,y+5.5,8.5,'normal',[200,210,220]);
  TR(eur(b.sw),ML+TW-4,y+5.5,10,'bold',[232,162,53]);y+=12;
  T('Gewichtungsanteil: '+Math.round(b.wSW*100)+'% am gewichteten Verkehrswert',ML,y,8,'italic',[120,130,140]);y+=10;

  // VII. VERKEHRSWERTERMITTLUNG
  y+=4;T('VII.  VERKEHRSWERTERMITTLUNG (§ 8 ImmoWertV 2021)',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const verkText='Gemäß § 8 Abs. 1 ImmoWertV 2021 wird der Verkehrswert aus den Ergebnissen der angewendeten Wertermittlungsverfahren unter Würdigung ihrer Aussagekraft und unter Berücksichtigung der Lage auf dem Grundstücksmarkt abgeleitet. Die Gewichtung der einzelnen Verfahren erfolgt entsprechend der Objektart und der Marktgängigkeit.';
  np(25);const vkl=doc.splitTextToSize(verkText,TW);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(vkl,ML,y);y+=vkl.length*4.8+7;
  np(50);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,40,'F');
  T('Zusammenführung der Verfahrensergebnisse (§ 8 ImmoWertV 2021):',ML+4,y+6,9,'bold',[26,26,46]);
  T('Vergleichswert ('+Math.round(b.wVW*100)+'%):',ML+4,y+14,8.5,'normal',[100,110,125]);TR(eur(b.vw),ML+TW-4,y+14,8.5,'normal',[26,26,46]);
  T('Ertragswert ('+Math.round(b.wEW*100)+'%):',ML+4,y+20,8.5,'normal',[100,110,125]);TR(eur(b.ew),ML+TW-4,y+20,8.5,'normal',[26,26,46]);
  T('Sachwert ('+Math.round(b.wSW*100)+'%):',ML+4,y+26,8.5,'normal',[100,110,125]);TR(eur(b.sw),ML+TW-4,y+26,8.5,'normal',[26,26,46]);
  ln(ML+4,y+30,ML+TW-4,y+30,180,180,170);
  T('Gewichteter Verkehrswert:',ML+4,y+36,9,'bold',[26,26,46]);TR(eur(b.mw),ML+TW-4,y+36,10,'bold',[26,26,46]);
  y+=44;
  np(16);doc.setFillColor(254,243,224);doc.rect(ML,y,TW,14,'F');doc.setDrawColor(232,162,53);doc.rect(ML,y,TW,14,'S');
  T('VERKEHRSWERT gemäß § 194 BauGB (gerundet):',ML+4,y+6,9,'bold',[184,134,11]);
  T(eur(b.mw),ML+4,y+12,14,'bold',[15,27,45]);
  TR('Bandbreite: '+eur(b.mw_min)+' – '+eur(b.mw_max),ML+TW-4,y+12,8,'normal',[120,120,120]);
  y+=18;

  // VIII. HAFTUNGSAUSSCHLUSS
  doc.addPage();y=25;
  T('VIII.  EINSCHRÄNKUNGEN UND HAFTUNGSAUSSCHLUSS',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const disclaimerLines=[
    '1. Dieses Gutachten wurde auf Basis der vom Auftraggeber übermittelten Daten und einer PLZ-basierten Referenzdatenbank erstellt. Es ersetzt kein amtliches Sachverständigengutachten nach § 194 BauGB durch einen öffentlich bestellten und vereidigten Sachverständigen.',
    '2. Die verwendeten Marktdaten (Bodenrichtwerte, Vergleichspreise, Mietansätze) basieren auf der NachlassPilot-Referenzdatenbank. Eine Übereinstimmung mit den aktuellen Werten der örtlichen Gutachterausschüsse (§ 192 BauGB) kann nicht garantiert werden.',
    '3. Wertbeeinflussende Faktoren wie Bau- oder Altlastenbelastungen, Grundbuchrechte (Grundschulden, Nießbrauch, Wegerechte), Denkmaleigenschaften, städtebauliche Bindungen oder ungeklärte Eigentumsverhältnisse wurden mangels Angaben nicht berücksichtigt.',
    '4. Das Gutachten dient der Vorbereitung anwaltlicher und nachlassgerichtlicher Tätigkeit. Für steuerliche Zwecke (Erbschaftsteuer) kann eine gesonderte Bewertung nach §§ 157 ff. BewG durch das zuständige Finanzamt erforderlich sein.',
    '5. Die Bewertungsbandbreite von ±12% berücksichtigt die marktübliche Unsicherheit bei der Verkehrswertermittlung aus Vergleichsdaten (vgl. Kleiber/Simon, Verkehrswertermittlung, 9. Aufl., § 194 BauGB Rn. 120 ff.).',
    '6. Der ermittelte Verkehrswert bezieht sich auf den Bewertungsstichtag (Sterbezeitpunkt des Erblassers). Wertveränderungen nach dem Stichtag bleiben unberücksichtigt.',
  ];
  disclaimerLines.forEach(d=>{
    np(22);const dl=doc.splitTextToSize(d,TW-5);
    doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(dl,ML,y);y+=dl.length*4.8+5;
  });
  y+=6;np(30);
  T('Erklärung zur Erstellung',ML,y,9,'bold',[26,26,46]);y+=6;
  const erlText='Das vorliegende Gutachten wurde nach bestem Wissen und Gewissen erstellt. Die zugrunde gelegten Daten entstammen den Angaben des Auftraggebers sowie öffentlich verfügbaren Marktdaten. Korrekturen und Ergänzungen bei Vorliegen weiterer Informationen (z.B. Gutachterausschuss-Daten, Grundbuchauszüge, Energieausweis) bleiben vorbehalten.';
  const ell=doc.splitTextToSize(erlText,TW);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(ell,ML,y);y+=ell.length*4.8+14;
  ln(ML,y,ML+72,y);y+=5;T('Ort, Datum',ML,y,8,'normal',[150,150,150]);
  ln(ML+95,y-5,ML+TW,y-5);T('Unterschrift / Kanzleistempel',ML+95,y,8,'normal',[150,150,150]);

  const total=doc.internal.getNumberOfPages();
  for(let i=1;i<=total;i++){doc.setPage(i);doc.setFontSize(7.5);doc.setFont('helvetica','normal');doc.setTextColor(170,170,170);doc.text('Seite '+i+' / '+total,W/2,PH-10,{align:'center'});doc.text('Verkehrswertgutachten NachlassPilot – Vertraulich',ML,PH-10);doc.text(new Date().toLocaleDateString('de-DE'),W-MR,PH-10,{align:'right'});}
  doc.save('gutachten_immo_'+(p.bez||'immobilie').replace(/[\s/\\:*?"<>|]/g,'_').substring(0,30)+'_'+new Date().toISOString().split('T')[0]+'.pdf');
}

// =============================================
// GUTACHTEN – BETEILIGUNG (IDW S 1 / HGB)
// =============================================
function exportGutachtenBet(id){
  const p=STATE.beteiligungen.find(x=>x.id===id);
  if(!p)return;
  collectPosFields('beteiligungen',p);
  const wert=parseN(document.getElementById(id+'_wert')?.value)||parseN(p.wert)||0;
  const erl={};
  ['name','sterben','adresse','aktenzeichen','gericht','erstelldatum','ersteller','verhaeltnis'].forEach(f=>{erl[f]=gv('erl_'+f);});
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210,ML=20,MR=20,TW=170,PH=297,MB=22;
  let y=0;
  function np(n=12){if(y+n>PH-MB){doc.addPage();y=25;}}
  function ln(x1,y1,x2,y2,r=180,g=180,b=170){doc.setDrawColor(r,g,b);doc.line(x1,y1,x2,y2);}
  function T(txt,x,yp,sz=10,st='normal',col=[26,26,46]){doc.setFontSize(sz);doc.setFont('helvetica',st);doc.setTextColor(...col);doc.text(String(txt||''),x,yp);}
  function TR(txt,x,yp,sz=10,st='normal',col=[26,26,46]){doc.setFontSize(sz);doc.setFont('helvetica',st);doc.setTextColor(...col);doc.text(String(txt||''),x,yp,{align:'right'});}
  function kv(label,val,x,yp,lw=65){T(label+':',x,yp,9,'normal',[100,110,125]);T(val||'–',x+lw,yp,9,'normal',[26,26,46]);}
  const stichtag=fmtDate(erl.sterben)||fmtDate(erl.erstelldatum)||new Date().toLocaleDateString('de-DE');
  const erstDatum=fmtDate(erl.erstelldatum)||new Date().toLocaleDateString('de-DE');

  // DECKBLATT
  doc.setFillColor(15,27,45);doc.rect(0,0,W,65,'F');
  doc.setFillColor(232,162,53);doc.rect(0,65,W,2.5,'F');
  T('UNTERNEHMENSBEWERTUNGSGUTACHTEN',ML,20,15,'bold',[255,255,255]);
  T('Bewertung einer Unternehmensbeteiligung im Nachlass',ML,31,10,'normal',[200,210,220]);
  T('Grundlage: IDW S 1, §§ 199–203 BewG, HGB, GmbHG',ML,40,9,'normal',[160,175,195]);
  T('Vertraulich – Anwaltliche Unterlagen',ML,50,8,'italic',[140,155,175]);
  y=77;
  T('BEWERTUNGSOBJEKT',ML,y,8,'bold',[150,150,150]);y+=6;
  T(p.bez||p.unternehmen||'(Bezeichnung nicht angegeben)',ML,y,15,'bold',[15,27,45]);y+=9;
  if(p.unternehmen){kv('Unternehmen',p.unternehmen,ML,y);y+=6;}
  if(p.rechtsform){kv('Rechtsform',p.rechtsform,ML,y);y+=6;}
  if(p.hrb){kv('Handelsregister',p.hrb,ML,y);y+=6;}
  if(p.anteil){kv('Anteil des Erblassers',p.anteil+'%',ML,y);y+=6;}
  if(p.stammkap){kv('Stammkapital gesamt',eur(parseN(p.stammkap)),ML,y);y+=6;}
  kv('Bewertungsstichtag',stichtag,ML,y);y+=6;
  kv('Aktenzeichen',erl.aktenzeichen||'–',ML,y);y+=6;
  kv('Erstellt am',erstDatum,ML,y);y+=6;
  kv('Erstellt von',(erl.ersteller||'–')+(erl.verhaeltnis?' ('+erl.verhaeltnis+')':''),ML,y);
  y+=12;ln(ML,y,W-MR,y,200,200,190);y+=8;
  doc.setFillColor(254,243,224);doc.rect(ML,y,TW,16,'F');doc.setDrawColor(232,162,53);doc.rect(ML,y,TW,16,'S');
  T('Angesetzter Beteiligungswert ('+( p.grundlage||'gemäß Angabe')+')',ML+4,y+6,9,'normal',[184,134,11]);
  T(eur(wert),ML+4,y+13,16,'bold',[15,27,45]);
  y+=20;

  // I. RECHTSGRUNDLAGEN
  doc.addPage();y=25;
  T('I.  RECHTSGRUNDLAGEN UND BEWERTUNGSAUFTRAG',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const betRechts=[
    ['IDW S 1 (2008)','Standard zur Durchführung von Unternehmensbewertungen des Instituts der Wirtschaftsprüfer. Maßgeblicher fachlicher Standard; normiert Ertragswertverfahren und DCF-Verfahren als anerkannte Bewertungsmethoden für Kapitalgesellschaften und Personengesellschaften.'],
    ['§§ 199–203 BewG','Vereinfachtes Ertragswertverfahren: Jahresertrag der letzten 3 Jahre x Kapitalisierungsfaktor (§ 203 BewG; aktuell 13,75). Dieser Wert dient als Untergrenze (§ 11 Abs. 2 Satz 4 BewG) und kann nicht unterschritten werden.'],
    ['§ 11 Abs. 2 BewG','Gemeiner Wert für nicht börsennotierte Anteile: wird in erster Linie aus zeitnahen Verkäufen abgeleitet; hilfsweise unter Berücksichtigung des Vermögens und der Ertragsaussichten geschätzt.'],
    ['§§ 29 ff. GmbHG','GmbH-Gesetz: Regelungen zur Gewinnverteilung, Geschäftsanteilen und Anteilsbewertung. Minderheitsbeteiligungen können mit einem Fungibilitätsabschlag belegt werden.'],
    ['§ 12 Abs. 2 ErbStG','Erbschaftsteuergesetz: Nicht notierte Anteile an Kapitalgesellschaften sind mit dem gemeinen Wert nach § 11 Abs. 2 BewG anzusetzen.'],
  ];
  betRechts.forEach(([norm,text])=>{
    np(22);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,5,'F');
    T(norm,ML+3,y+3.5,8.5,'bold',[15,27,45]);y+=6;
    const tl=doc.splitTextToSize(text,TW-6);doc.setFontSize(7.8);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(tl,ML+3,y);y+=tl.length*4.3+5;
  });
  T('Literatur und Quellen:',ML,y,9,'bold',[26,26,46]);y+=7;
  const betLit=[
    '[1]  IDW (Hrsg.): WP-Handbuch 2021, Band II, Institut der Wirtschaftsprüfer, Düsseldorf 2021.',
    '[2]  Drukarczyk, J. / Schüler, A.: Unternehmensbewertung, 7. Aufl., Vahlen Verlag, München 2016.',
    '[3]  Fleischer, H. / Goette, W.: Münchener Kommentar zum GmbHG, 4. Aufl., Beck-Verlag, München 2022.',
    '[4]  Moxter, A.: Grundsätze ordnungsmäßiger Unternehmensbewertung, 2. Aufl., Gabler Verlag, Wiesbaden 1983.',
    '[5]  Bundesministerium der Justiz (BMJ): Kommentierung des GmbHG, Bundesanzeiger Verlag, Berlin.',
    '[6]  BGH, Urt. v. 24.09.2007 – II ZR 135/06: Zur Bewertung von GmbH-Anteilen im Erbfall.',
    '[7]  BFH, Urt. v. 21.07.2020 – II R 20/18: Vereinfachtes Ertragswertverfahren nach §§ 199 ff. BewG.',
    '[8]  OLG Düsseldorf, Beschl. v. 09.01.2014 – 26 W 16/12 (AktG): Unternehmensbewertung im Squeeze-out.',
  ];
  betLit.forEach(s=>{np(12);const tl=doc.splitTextToSize(s,TW);doc.setFontSize(7.8);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(tl,ML,y);y+=tl.length*4.3+2;});
  y+=5;

  // II. BESCHREIBUNG
  y+=5;T('II.  BESCHREIBUNG DER BETEILIGUNG',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const betDaten=[['Bezeichnung',p.bez||'–'],['Unternehmen',p.unternehmen||'–'],['Rechtsform',p.rechtsform||'–'],['Handelsregister',p.hrb||'–'],['Anteil des Erblassers',p.anteil?(p.anteil+'%'):'–'],['Stammkapital gesamt',p.stammkap?eur(parseN(p.stammkap)):'–'],['Wert des Anteils (angesetzt)',eur(wert)],['Bewertungsgrundlage',p.grundlage||'–']];
  betDaten.forEach(([k,v])=>{
    if(!v||v==='–')return;
    np(7);T(k+':',ML,y,9,'normal',[100,110,125]);
    const vl=doc.splitTextToSize(String(v),TW-75);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(26,26,46);doc.text(vl,ML+75,y);y+=Math.max(6,vl.length*4.8);
  });
  if(p.anm){y+=4;np(10);T('Anmerkung:',ML,y,9,'normal',[100,110,125]);const al=doc.splitTextToSize(p.anm,TW-75);doc.setFontSize(9);doc.setFont('helvetica','italic');doc.setTextColor(74,85,104);doc.text(al,ML+75,y);y+=al.length*4.8+4;}

  // III. BEWERTUNGSVERFAHREN
  y+=6;T('III.  ANERKANNTE BEWERTUNGSVERFAHREN',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const bvText='Für die Bewertung von Unternehmensbeteiligungen im Nachlass kommen gemäß IDW S 1 und §§ 199 ff. BewG insbesondere folgende Verfahren in Betracht:';
  const bvl=doc.splitTextToSize(bvText,TW);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(bvl,ML,y);y+=bvl.length*4.8+6;
  const verfahren=[
    ['Ertragswertverfahren (IDW S 1 i.d.F. 2008)','Der Unternehmenswert ergibt sich aus dem Barwert künftiger Ertragsüberschüsse. Maßgebend sind nachhaltig erzielbare Erträge auf Basis der Vergangenheitsanalyse und Unternehmensplanung. Der Kapitalisierungszinssatz wird aus Basiszins zzgl. Risikozuschlag abgeleitet.'],
    ['Vereinfachtes Ertragswertverfahren (§§ 199–203 BewG)','Für Zwecke der Erbschaft-/Schenkungsteuer: Jahresertrag der letzten 3 Jahre x Kapitalisierungsfaktor (§ 203 BewG). Gesetzlicher Mindestwert, der nicht unterschritten werden kann (§ 11 Abs. 2 Satz 4 BewG).'],
    ['Substanzwertverfahren','Ermittlung des Zeitwerts aller Vermögensgegenstände abzüglich Schulden. Dient als Untergrenze der Bewertung (Liquidationswert). Bei Unternehmen mit substanzwertdominanter Vermögensstruktur (z.B. Immobiliengesellschaften) kann das Verfahren maßgeblich werden.'],
    ['Multiplikatorverfahren','Ableitung aus Transaktionspreisen vergleichbarer Unternehmen (Branchenmultiplikatoren auf EBIT, EBITDA oder Umsatz). Geeignet als Plausibilisierung der Ertragswertermittlung.'],
  ];
  verfahren.forEach(([name,desc])=>{
    np(22);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,5,'F');T(name,ML+3,y+3.5,8.5,'bold',[15,27,45]);y+=7;
    const dl=doc.splitTextToSize(desc,TW-6);doc.setFontSize(7.8);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(dl,ML+3,y);y+=dl.length*4.3+5;
  });

  // IV. WERTANSATZ
  y+=4;T('IV.  WERTANSATZ IM NACHLASSVERZEICHNIS',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  np(30);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,24,'F');
  T('Angesetzter Wert des Beteiligungsanteils:',ML+4,y+6,9,'normal',[100,110,125]);TR(eur(wert),ML+TW-4,y+6,10,'bold',[26,26,46]);
  T('Bewertungsgrundlage:',ML+4,y+12,9,'normal',[100,110,125]);T(p.grundlage||'–',ML+4+55,y+12,9,'normal',[26,26,46]);
  T('Bewertungsstichtag:',ML+4,y+18,9,'normal',[100,110,125]);T(stichtag,ML+4+55,y+18,9,'normal',[26,26,46]);
  y+=27;
  const warnText='Hinweis: Bei fehlenden Jahresabschlüssen oder komplexen Unternehmensstrukturen (Holdingstrukturen, stille Beteiligungen, nicht beherrschende Minderheitsbeteiligungen) ist die Einholung eines gesonderten Unternehmenswertgutachtens durch einen Wirtschaftsprüfer/Steuerberater nach IDW S 1 dringend empfohlen (vgl. BGH, Urt. v. 24.09.2007 – II ZR 135/06).';
  np(22);const wl=doc.splitTextToSize(warnText,TW-6);doc.setFillColor(255,244,230);doc.rect(ML,y,TW,wl.length*4.3+10,'F');doc.setDrawColor(200,120,50);doc.rect(ML,y,TW,wl.length*4.3+10,'S');y+=5;doc.setFontSize(8);doc.setFont('helvetica','italic');doc.setTextColor(130,70,20);doc.text(wl,ML+3,y);y+=wl.length*4.3+9;

  const total=doc.internal.getNumberOfPages();
  for(let i=1;i<=total;i++){doc.setPage(i);doc.setFontSize(7.5);doc.setFont('helvetica','normal');doc.setTextColor(170,170,170);doc.text('Seite '+i+' / '+total,W/2,PH-10,{align:'center'});doc.text('Beteiligungsgutachten NachlassPilot – Vertraulich',ML,PH-10);doc.text(new Date().toLocaleDateString('de-DE'),W-MR,PH-10,{align:'right'});}
  doc.save('gutachten_bet_'+(p.bez||p.unternehmen||'beteiligung').replace(/[\s/\\:*?"<>|]/g,'_').substring(0,30)+'_'+new Date().toISOString().split('T')[0]+'.pdf');
}

// =============================================
// GUTACHTEN – WERTGEGENSTÄNDE (§ 9 BewG / § 2311 BGB)
// =============================================
function exportGutachtenWg(id){
  const p=STATE.wertgegenstaende.find(x=>x.id===id);
  if(!p)return;
  collectPosFields('wertgegenstaende',p);
  const wert=parseN(document.getElementById(id+'_wert')?.value)||parseN(p.wert)||0;
  const erl={};
  ['name','sterben','adresse','aktenzeichen','gericht','erstelldatum','ersteller','verhaeltnis'].forEach(f=>{erl[f]=gv('erl_'+f);});
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210,ML=20,MR=20,TW=170,PH=297,MB=22;
  let y=0;
  function np(n=12){if(y+n>PH-MB){doc.addPage();y=25;}}
  function ln(x1,y1,x2,y2,r=180,g=180,b=170){doc.setDrawColor(r,g,b);doc.line(x1,y1,x2,y2);}
  function T(txt,x,yp,sz=10,st='normal',col=[26,26,46]){doc.setFontSize(sz);doc.setFont('helvetica',st);doc.setTextColor(...col);doc.text(String(txt||''),x,yp);}
  function TR(txt,x,yp,sz=10,st='normal',col=[26,26,46]){doc.setFontSize(sz);doc.setFont('helvetica',st);doc.setTextColor(...col);doc.text(String(txt||''),x,yp,{align:'right'});}
  function kv(label,val,x,yp,lw=65){T(label+':',x,yp,9,'normal',[100,110,125]);T(val||'–',x+lw,yp,9,'normal',[26,26,46]);}
  const stichtag=fmtDate(erl.sterben)||fmtDate(erl.erstelldatum)||new Date().toLocaleDateString('de-DE');
  const erstDatum=fmtDate(erl.erstelldatum)||new Date().toLocaleDateString('de-DE');

  // DECKBLATT
  doc.setFillColor(15,27,45);doc.rect(0,0,W,65,'F');
  doc.setFillColor(232,162,53);doc.rect(0,65,W,2.5,'F');
  T('WERTERMITTLUNGSGUTACHTEN',ML,22,18,'bold',[255,255,255]);
  T('Bewertung eines Wertgegenstands im Nachlass',ML,33,11,'normal',[200,210,220]);
  T('Grundlage: § 2311 BGB, § 9 BewG, § 12 ErbStG',ML,41,9,'normal',[160,175,195]);
  T('Vertraulich – Anwaltliche Unterlagen',ML,51,8,'italic',[140,155,175]);
  y=77;
  T('BEWERTUNGSOBJEKT',ML,y,8,'bold',[150,150,150]);y+=6;
  T(p.bez||'(Bezeichnung nicht angegeben)',ML,y,15,'bold',[15,27,45]);y+=9;
  if(p.kat){kv('Kategorie',p.kat,ML,y);y+=6;}
  kv('Bewertungsstichtag',stichtag,ML,y);y+=6;
  kv('Aktenzeichen',erl.aktenzeichen||'–',ML,y);y+=6;
  kv('Erstellt am',erstDatum,ML,y);y+=6;
  kv('Erstellt von',(erl.ersteller||'–')+(erl.verhaeltnis?' ('+erl.verhaeltnis+')':''),ML,y);
  y+=12;ln(ML,y,W-MR,y,200,200,190);y+=8;
  doc.setFillColor(254,243,224);doc.rect(ML,y,TW,16,'F');doc.setDrawColor(232,162,53);doc.rect(ML,y,TW,16,'S');
  T('Angesetzter Wert ('+( p.grundlage||'gemäß Angabe')+')',ML+4,y+6,9,'normal',[184,134,11]);
  T(eur(wert),ML+4,y+13,16,'bold',[15,27,45]);
  y+=20;

  // I. RECHTSGRUNDLAGEN
  doc.addPage();y=25;
  T('I.  RECHTSGRUNDLAGEN',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const wgRechts=[
    ['§ 2311 BGB','Für die Berechnung des Pflichtteils ist der Bestand und der Wert des Nachlasses zur Zeit des Erbfalls maßgebend. Wertgegenstände sind mit ihrem gemeinen Wert (Verkehrswert) anzusetzen.'],
    ['§ 9 Abs. 2 BewG','Gemeiner Wert: „Der gemeine Wert wird durch den Preis bestimmt, der im gewöhnlichen Geschäftsverkehr nach der Beschaffenheit des Wirtschaftsguts bei einer Veräußerung zu erzielen wäre." Besondere Vorlieben und subjektive Umstände haben keinen Einfluss.'],
    ['§ 12 Abs. 1 ErbStG','Bewertung mit dem gemeinen Wert zum Todeszeitpunkt. Bei Kunstgegenständen und Antiquitäten ist der Marktwert anhand von Auktionsergebnissen vergleichbarer Objekte heranzuziehen.'],
    ['§§ 2032 ff. BGB','Erbengemeinschaft und Nachlassauseinandersetzung: Wertgegenstände fallen in den Gesamthandsnachlass; für die Auseinandersetzung ist eine Bewertung aller Gegenstände erforderlich.'],
    ['§ 12 Abs. 1 ErbStG i.V.m. § 9 BewG','Bewertungsmaßstab bei der Erbschaftsteuer: gemeiner Wert ohne Abzug besonderer Vorlieben (§ 9 Abs. 3 BewG).'],
  ];
  wgRechts.forEach(([norm,text])=>{
    np(22);doc.setFillColor(247,244,239);doc.rect(ML,y,TW,5,'F');
    T(norm,ML+3,y+3.5,8.5,'bold',[15,27,45]);y+=6;
    const tl=doc.splitTextToSize(text,TW-6);doc.setFontSize(7.8);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(tl,ML+3,y);y+=tl.length*4.3+5;
  });
  T('Literatur und Quellen:',ML,y,9,'bold',[26,26,46]);y+=7;
  const wgLit=[
    '[1]  Staudinger / Otte: Kommentar zum BGB, §§ 2303–2338, 17. Bearbeitung, De Gruyter Verlag, Berlin 2023.',
    '[2]  Palandt / Weidlich: BGB-Kommentar, 84. Aufl., Beck-Verlag, München 2025, §§ 2311, 2312.',
    '[3]  Meincke / Hannes / Holtz: ErbStG-Kommentar, 18. Aufl., Beck-Verlag, München 2024.',
    '[4]  Rössler / Troll: BewG-Kommentar, aktuellste Auflage, Vahlen Verlag, München.',
    '[5]  Schmidt-Kessel, M.: Münchener Kommentar BGB, Erbrecht, 9. Aufl., Beck-Verlag, München 2024.',
    '[6]  BGH, Urt. v. 14.05.1986 – IV a ZR 155/84: Pflichtteil und Nachlassbewertung bei Wertgegenständen.',
    '[7]  BFH, Urt. v. 29.06.2005 – II R 57/03: Zum gemeinen Wert von Kunstgegenständen und Sammlungen.',
    '[8]  Bundesministerium der Justiz (BMJ): Erbschaftsteuerreformgesetz 2009, BGBl. I S. 3018.',
  ];
  wgLit.forEach(s=>{np(12);const tl=doc.splitTextToSize(s,TW);doc.setFontSize(7.8);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(tl,ML,y);y+=tl.length*4.3+2;});

  // II. OBJEKTBESCHREIBUNG
  y+=8;T('II.  BESCHREIBUNG DES WERTGEGENSTANDS',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const wgDaten=[['Bezeichnung',p.bez||'–'],['Kategorie',p.kat||'–'],['Bewertungsgrundlage',p.grundlage||'–']];
  wgDaten.forEach(([k,v])=>{
    if(!v||v==='–')return;
    np(7);T(k+':',ML,y,9,'normal',[100,110,125]);
    const vl=doc.splitTextToSize(String(v),TW-75);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(26,26,46);doc.text(vl,ML+75,y);y+=Math.max(6,vl.length*4.8);
  });
  if(p.beschr){
    y+=3;np(10);T('Beschreibung / Herkunft:',ML,y,9,'bold',[26,26,46]);y+=6;
    const bl=doc.splitTextToSize(p.beschr,TW);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(bl,ML,y);y+=bl.length*4.8+4;
  }
  if(p.anm){y+=3;np(10);T('Anmerkung:',ML,y,9,'normal',[100,110,125]);const al=doc.splitTextToSize(p.anm,TW-75);doc.setFontSize(9);doc.setFont('helvetica','italic');doc.setTextColor(74,85,104);doc.text(al,ML+75,y);y+=al.length*4.8+4;}

  // III. BEWERTUNGSMETHODIK
  y+=4;T('III.  BEWERTUNGSMETHODIK',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  const katMethodik={
    'Schmuck/Uhren':'Schmuck und Uhren werden nach dem gemeinen Wert gemäß § 9 BewG bewertet. Maßgebend sind aktuelle Marktpreise vergleichbarer Stücke, insbesondere Auktionsergebnisse renommierter Auktionshäuser (Sothebys, Christies, Dorotheum). Bei Edelmetallschmuck ist der Metallwert (Feingewicht x aktueller Spotpreis) als Untergrenze heranzuziehen. Für Markenuhren (Rolex, Patek Philippe u.a.) sind Sekundärmarktpreise einschlägiger Plattformen relevant.',
    'Kunst/Gemälde':'Kunstgegenstände werden nach dem Verkehrswert bewertet, der aus Auktionsergebnissen vergleichbarer Werke desselben Künstlers (Provenienz, Werkverzeichnis, Ausstellungsgeschichte) abzuleiten ist. Bei unbekannten Künstlern ist ein Schätzwert durch einen Kunstsachverständigen einzuholen. Referenz: artprice.com, Invaluable.com, Lempertz-Auktionspreise.',
    'Antiquitäten/Möbel':'Antiquitäten und historische Möbel werden nach Zeitwert und Provenienz bewertet. Maßgebend sind Auktionsergebnisse sowie Händlerpreise. Der Erhaltungszustand (Originalsubstanz, Restaurierungen) ist wertbestimmend.',
    'Edelmetalle':'Edelmetalle (Gold, Silber, Platin, Palladium) werden nach dem tagesaktuellen Spotpreis der Londoner Metallbörse (LBMA) bewertet. Maßgebend sind Feingewicht und Feingehalt (z.B. 750er Gold = 18 Karat = 75,0% Feingold). Ankaufskurse liegen i.d.R. 3–5% unter Spotpreis.',
    'Sammlungen':'Sammlungen (Briefmarken, Münzen, Wein etc.) werden nach dem gemeinen Wert gemäß § 9 BewG bewertet. Maßgebend sind Katalogwerte (Michel-Katalog für Briefmarken, Schön-Münzkatalog, Weinbewertung nach Parker Points / Wine Spectator) sowie aktuelle Markttransaktionen.',
    'Hochwertige Elektronik':'Hochwertige Elektronik wird nach dem aktuellen Zeitwert bewertet. Maßgebend sind Zweitmarktpreise (eBay Kleinanzeigen, Refurbed.de, MediaMarkt Gebrauchtgeräte). Die Wertminderung beträgt i.d.R. 20–30% p.a. in den ersten Jahren.',
  };
  const methText=katMethodik[p.kat]||'Der Wertgegenstand ist nach dem gemeinen Wert gemäß § 9 BewG zu bewerten. Maßgebend ist der Preis, der im gewöhnlichen Geschäftsverkehr bei einer Veräußerung zum Bewertungsstichtag erzielbar wäre. Ggf. ist ein Sachverständigengutachten eines öffentlich bestellten und vereidigten Sachverständigen einzuholen.';
  np(30);const ml=doc.splitTextToSize(methText,TW);doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(74,85,104);doc.text(ml,ML,y);y+=ml.length*4.8+8;

  // IV. WERTANSATZ
  T('IV.  WERTANSATZ',ML,y,11,'bold',[15,27,45]);y+=2;ln(ML,y,W-MR,y,15,27,45);y+=9;
  np(20);doc.setFillColor(254,243,224);doc.rect(ML,y,TW,14,'F');doc.setDrawColor(232,162,53);doc.rect(ML,y,TW,14,'S');
  T('Gemeiner Wert (§ 9 BewG / § 2311 BGB):',ML+4,y+6,9,'normal',[184,134,11]);
  T(eur(wert),ML+4,y+12,14,'bold',[15,27,45]);
  TR(p.grundlage||'–',ML+TW-4,y+12,8,'normal',[120,120,120]);
  y+=18;
  const hinweisText='Hinweis: Der angesetzte Wert basiert auf der Angabe des Erben/Auftraggebers. Für Pflichtteilsberechnungen, steuerliche Zwecke oder gerichtliche Auseinandersetzungen empfiehlt sich die Einholung eines Sachverständigengutachtens durch einen öffentlich bestellten und vereidigten Sachverständigen für das betreffende Fachgebiet (vgl. BGH, Urt. v. 14.05.1986 – IV a ZR 155/84 zum Bewertungsmaßstab bei der Pflichtteilsberechnung).';
  np(22);const hl=doc.splitTextToSize(hinweisText,TW-6);const hBoxH=hl.length*4.3+10;doc.setFillColor(240,248,255);doc.rect(ML,y,TW,hBoxH,'F');doc.setDrawColor(100,140,200);doc.rect(ML,y,TW,hBoxH,'S');y+=5;doc.setFontSize(8);doc.setFont('helvetica','italic');doc.setTextColor(50,80,130);doc.text(hl,ML+3,y);y+=hBoxH;

  const total=doc.internal.getNumberOfPages();
  for(let i=1;i<=total;i++){doc.setPage(i);doc.setFontSize(7.5);doc.setFont('helvetica','normal');doc.setTextColor(170,170,170);doc.text('Seite '+i+' / '+total,W/2,PH-10,{align:'center'});doc.text('Wertermittlungsgutachten NachlassPilot – Vertraulich',ML,PH-10);doc.text(new Date().toLocaleDateString('de-DE'),W-MR,PH-10,{align:'right'});}
  doc.save('gutachten_wg_'+(p.bez||p.kat||'wertgegenstand').replace(/[\s/\\:*?"<>|]/g,'_').substring(0,30)+'_'+new Date().toISOString().split('T')[0]+'.pdf');
}
