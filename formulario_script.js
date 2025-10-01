// ===== Modelo enriquecido =====
const MODEL_BASE = [
  { key:"cleanup", title:"1. Limpieza Básica", weight:5, items:[
    { q:"¿Se eliminaron objetos innecesarios (ramas, notebooks, escenarios sin uso)?", d:"Reduce ruido y evita confusiones manteniendo solo elementos relevantes.", s:"low" },
    { q:"¿Se movieron a otro proyecto artefactos no requeridos en producción?", d:"Preserva aprendizajes sin sobrecargar el proyecto principal.", s:"low" }
  ]},
  { key:"readability", title:"2. Legibilidad y Organización", weight:10, items:[
    { q:"¿El Flow está segmentado en Flow Zones coherentes?", d:"Facilita la comprensión global del flujo por cualquier colaborador.", s:"med" },
    { q:"¿Nombres claros y consistentes para datasets/recetas/variables?", d:"Mejora la interpretación rápida y reduce errores de uso.", s:"med" },
    { q:"¿El proyecto es entendible para un nuevo colaborador?", d:"Asegura continuidad operativa y menor curva de aprendizaje.", s:"low" }
  ]},
  { key:"variables", title:"3. Variables y Mantenibilidad", weight:10, items:[
    { q:"¿Valores hard-coded reemplazados por variables de proyecto?", d:"Aumenta flexibilidad y simplifica actualizaciones.", s:"med" },
    { q:"¿Parámetros críticos centralizados (rutas/fechas/límites)?", d:"Mantiene consistencia y facilita trazabilidad.", s:"med" }
  ]},
  { key:"efficiency", title:"4. Eficiencia Computacional", weight:12, items:[
    { q:"¿Se aprovechan recursos externos (SQL/Spark/contenedores)?", d:"Maximiza rendimiento delegando cómputo a la infraestructura adecuada.", s:"med" },
    { q:"¿Mínimo consumo en el host de Dataiku?", d:"Protege la estabilidad de la plataforma y evita sobrecargas.", s:"med" }
  ]},
  { key:"engines", title:"5. Motores de Receta", weight:15, items:[
    { q:"¿Recipe Engine Flow View verificado motor óptimo por receta?", d:"Asegura que cada operación use SQL/Spark/DSS según convenga.", s:"med" },
    { q:"¿Recetas con datasets en SQL corren in-database?", d:"Aprovecha la potencia nativa de la base de datos.", s:"high", crit:true },
    { q:"¿Datos masivos en object storage usan Spark cuando aplica?", d:"Escala cálculos distribuidos con clusters cuando los volúmenes lo requieren.", s:"med" },
    { q:"¿ML/código pesado con containerized execution?", d:"Aísla cargas intensivas y mejora estabilidad del entorno.", s:"med" }
  ]},
  { key:"pipelines", title:"6. Spark/SQL Pipelines", weight:12, items:[
    { q:"¿Spark aporta vs DSS considerando overhead?", d:"Evita costos innecesarios en volúmenes pequeños.", s:"med" },
    { q:"¿Pipelines SQL/Spark para evitar I/O intermedio?", d:"Reduce lecturas/escrituras de datasets intermedios.", s:"med" },
    { q:"¿Recetas consecutivas del mismo tipo unificadas en un job?", d:"Reduce pasos y simplifica la ejecución general.", s:"low" }
  ]},
  { key:"prepare", title:"7. Preparación de Datos", weight:8, items:[
    { q:"¿Evitar Prepare encadenados sin justificación?", d:"Minimiza redundancias y consumo de I/O innecesario.", s:"low" },
    { q:"¿Consolidar operaciones en un solo Prepare cuando es posible?", d:"Simplifica lógica y gana eficiencia.", s:"low" },
    { q:"¿Separar solo si un Prepare corre in-database?", d:"Justifica excepciones cuando aportan eficiencia tangible.", s:"med" }
  ]},
  { key:"partition", title:"8. Particionamiento", weight:10, items:[
    { q:"¿Particiones para cálculos periódicos (diarios/semanales)?", d:"Recalcula solo datos nuevos sin reprocesar históricos.", s:"high", crit:true },
    { q:"¿Evitar recalcular datos históricos inmutables?", d:"Ahorra tiempo y recursos de cómputo.", s:"med" },
    { q:"¿Clave de partición alinea con la lógica de negocio?", d:"Garantiza coherencia.", s:"med" }
  ]},
  { key:"performance", title:"9. Evaluación de Performance", weight:10, items:[
    { q:"¿Pruebas con muestras antes de escalar?", d:"Detecta fallas y valida lógica con menor costo y riesgo.", s:"low" },
    { q:"¿Tiempos medidos en escenarios (Last Runs) para cuellos?", d:"Identifica tareas críticas que requieren optimización.", s:"med" },
    { q:"¿Flow views (File size/Build duration/Count) revisadas?", d:"Localiza ineficiencias con métricas nativas.", s:"med" }
  ]},
  { key:"governance", title:"10. Documentación y Gobernanza", weight:8, items:[
    { q:"¿Documentación de objetivos/dependencias/configuraciones?", d:"Facilita soporte y auditorías posteriores.", s:"med" },
    { q:"¿Comentarios en recetas/datasets críticos?", d:"Mejora trazabilidad.", s:"low" },
    { q:"¿Cumple gobernanza y reproducibilidad?", d:"Asegura calidad, cumplimiento y control operativo.", s:"high", crit:true }
  ]}
];

const SEM = { green:80, amber:60 };
const GATES = [
  { key:"engines", minPct:70, label:"Motores de Receta ≥ 70%" },
  { key:"performance", minPct:70, label:"Evaluación de Performance ≥ 70%" }
];
const DEFAULT_BENCHMARK = 0.7; // 70%
const BENCHMARKS = { };
const severityFactor = { low:1, med:2, high:3 };

// Estado persistente
let MODEL = JSON.parse(localStorage.getItem('dku:model')||'null') || MODEL_BASE;
let CHECKED = JSON.parse(localStorage.getItem('dku:checked')||'{}');

// --- Migración de severidades/crit desde el modelo base si el modelo cacheado es antiguo
(function migrateModelFromBase(){
  if (!Array.isArray(MODEL)) return;
  let changed = false;
  MODEL.forEach(cat => {
    const baseCat = MODEL_BASE.find(c => c.key === cat.key);
    if (!baseCat) return;
    (cat.items || []).forEach((it, idx) => {
      const baseItem = (baseCat.items || [])[idx] || {};
      if (typeof it.s === 'undefined' && typeof baseItem.s !== 'undefined') {
        it.s = baseItem.s; changed = true;
      }
      if (typeof it.crit === 'undefined' && typeof baseItem.crit !== 'undefined') {
        it.crit = !!baseItem.crit; changed = true;
      }
    });
  });
  if (changed) localStorage.setItem('dku:model', JSON.stringify(MODEL));
})();

// DOM refs
const formEl = document.getElementById('form');
const scoreLabel = document.getElementById('scoreLabel');
const scoreBar = document.getElementById('scoreBar');
const checkedCount = document.getElementById('checkedCount');
const weightApplied = document.getElementById('weightApplied');
const weightsPanel = document.getElementById('weightsPanel');
const weightsSum = document.getElementById('weightsSum');
const gatesStatus = document.getElementById('gatesStatus');
const gatesList = document.getElementById('gatesList');

// KPI panel refs
const kpi = {
  cobertura:{ box:document.getElementById('kpiCobertura'), val:document.getElementById('valCobertura'), foot:document.getElementById('footCobertura') },
  high:{ box:document.getElementById('kpiHigh'), val:document.getElementById('valHigh'), foot:document.getElementById('footHigh') },
  gates:{ box:document.getElementById('kpiGates'), val:document.getElementById('valGates'), foot:document.getElementById('footGates') },
  iro:{ box:document.getElementById('kpiIRO'), val:document.getElementById('valIRO') },
  brecha:{ box:document.getElementById('kpiBrecha'), val:document.getElementById('valBrecha') },
  sef:{ box:document.getElementById('kpiSEF'), val:document.getElementById('valSEF') },
  mgo:{ box:document.getElementById('kpiMGO'), val:document.getElementById('valMGO') },
  coher:{ box:document.getElementById('kpiCoher'), val:document.getElementById('valCoher') },
  balance:{ box:document.getElementById('kpiBalance'), val:document.getElementById('valBalance') },
  criticos:{ box:document.getElementById('kpiCriticos'), val:document.getElementById('valCriticos'), foot:document.getElementById('footCriticos') }
};

// Plan de acción refs
const planBox = document.getElementById('planBox');
const planText = document.getElementById('planText');
const btnPlan = document.getElementById('btnPlan');
const btnCopy = document.getElementById('btnCopy');
const btnDownload = document.getElementById('btnDownload');

// Charts
let radarChart, barChart;

function saveState(){
  localStorage.setItem('dku:model', JSON.stringify(MODEL));
  localStorage.setItem('dku:checked', JSON.stringify(CHECKED));
}

function normalizeWeights(){
  const total = MODEL.reduce((a,c)=>a+c.weight,0);
  if(total===0) return;
  MODEL = MODEL.map(c => ({...c, weight:+(c.weight*100/total).toFixed(2)}));
}

function renderWeights(){
  weightsPanel.innerHTML='';
  MODEL.forEach(cat=>{
    const row = document.createElement('div');
    row.className='row';
    row.innerHTML = `<span style="font-size:14px" class="sub">${cat.title}</span>`;
    const inp = document.createElement('input');
    inp.type='number'; inp.min=0; inp.max=100; inp.step=1; inp.value=cat.weight; inp.className='ghost-input'; inp.style.maxWidth='90px';
    inp.addEventListener('change',()=>{
      cat.weight = Number(inp.value)||0;
      normalizeWeights();
      renderForm(); computeScore(); updateCharts(); updateKPIs(); saveState();
    });
    row.appendChild(inp); weightsPanel.appendChild(row);
  });
  const total = MODEL.reduce((a,c)=>a+c.weight,0);
  weightsSum.textContent = total.toFixed(2);
}

function toggleAll(open){ document.querySelectorAll('#form details').forEach(d=> d.open = open); }

function semColor(pct){
  if(pct>=SEM.green) return 'var(--ok)';
  if(pct>=SEM.amber) return 'var(--warn)';
  return 'var(--err)';
}

function categoryHeader(cat){
  const perItem = cat.weight / cat.items.length;
  return `<span class="muted" style="font-size:13px">Cada ítem ≈ ${perItem.toFixed(2)} pts</span>`;
}

function renderForm(){
  const wrap = document.createElement('div');
  wrap.style.display='grid'; wrap.style.gap='12px';
  MODEL.forEach(cat=>{
    const det = document.createElement('details');
    det.open = true; det.dataset.key = cat.key;
    const sum = document.createElement('summary');
    sum.innerHTML = `<span>${cat.title}</span>`;

    const badge = document.createElement('span');
    badge.className='badge'; badge.id=`badge-${cat.key}`; badge.textContent = `0 / ${cat.weight}`;

    const light = document.createElement('span');
    light.className='semaforo'; light.id=`light-${cat.key}`; light.title='Semáforo categoría';

    const right = document.createElement('span'); right.className='summary-right'; right.appendChild(light); right.appendChild(badge);
    sum.appendChild(right);
    det.appendChild(sum);

    const sec = document.createElement('div'); sec.className='section';
    const hint = document.createElement('div'); hint.innerHTML = categoryHeader(cat); hint.style.marginBottom='6px'; sec.appendChild(hint);

    const checks = document.createElement('div'); checks.className='checks';
    const perItem = cat.weight / cat.items.length;

    cat.items.forEach((item, idx)=>{
      const id = `${cat.key}-${idx}`;
      const div = document.createElement('div'); div.className='check';
      const label = document.createElement('label');
      const input = document.createElement('input'); input.type='checkbox'; input.dataset.weight = perItem.toFixed(4); input.dataset.category=cat.key; input.dataset.id=id; input.checked = !!CHECKED[id];
      input.addEventListener('change',()=>{ CHECKED[id]=input.checked; computeScore(); updateCharts(); updateKPIs(); saveState(); if(planBoxVisible()) refreshPlanLive(); });
      const spanQ = document.createElement('span'); spanQ.textContent = item.q;
      const w = document.createElement('span'); w.className='weight'; w.textContent = `+${perItem.toFixed(2)} pts`;
      label.appendChild(input); label.appendChild(spanQ); label.appendChild(w);
      const d = document.createElement('div'); d.className='desc'; d.textContent = item.d;
      div.appendChild(label); div.appendChild(d); checks.appendChild(div);
    });

    sec.appendChild(checks); det.appendChild(sec); wrap.appendChild(det);
  });
  formEl.innerHTML=''; formEl.appendChild(wrap);

  const footer = document.createElement('div'); footer.className='form-footer no-print';
  footer.innerHTML = `<button class="btn primary" id="calcBtn">Calcular Score</button>
                      <button class="btn" id="expandAll">Expandir todo</button>
                      <button class="btn" id="collapseAll">Colapsar todo</button>`;
  formEl.appendChild(footer);
  document.getElementById('calcBtn').addEventListener('click', ()=>{ computeScore(); updateKPIs(); });
  document.getElementById('expandAll').addEventListener('click',()=>toggleAll(true));
  document.getElementById('collapseAll').addEventListener('click',()=>toggleAll(false));
}

// ===== Cálculo score =====
function computeScore(){
  const inputs = [...document.querySelectorAll('#form input[type="checkbox"]')];
  let total=0, checked=0; const byCat={}; const idChecked=new Set();
  inputs.forEach(i=>{
    const w = parseFloat(i.dataset.weight); const cat=i.dataset.category; const id=i.dataset.id;
    if(!byCat[cat]) byCat[cat]={sum:0};
    if(i.checked){ total += w; checked++; byCat[cat].sum += w; idChecked.add(id); }
  });
  const score = Math.min(100, Math.round((total + Number.EPSILON)*100)/100);
  scoreLabel.textContent = score;
  checkedCount.textContent = checked;
  weightApplied.textContent = total.toFixed(2);
  scoreBar.style.width = score + '%';
  scoreLabel.classList.remove('ok','warn','err');
  const cls = score>=SEM.green? 'ok' : score>=SEM.amber? 'warn' : 'err';
  const gateState = computeGates(byCat);
  if(!gateState.ok) scoreLabel.classList.add('err'); else scoreLabel.classList.add(cls);

  MODEL.forEach(cat=>{
    const val = byCat[cat.key]?.sum || 0; const pct = (val/cat.weight)*100;
    const badge = document.getElementById(`badge-${cat.key}`);
    const light = document.getElementById(`light-${cat.key}`);
    if(badge) badge.textContent = `${val.toFixed(2)} / ${cat.weight}`;
    if(light) light.style.background = semColor(pct);
  });

  renderGates(gateState);

  // cache para KPIs
  window.__state_byCat = byCat;
  window.__state_checkedIds = idChecked;
}

function computeGates(byCat){
  const items = GATES.map(g=>{
    const cat = MODEL.find(c=>c.key===g.key); const have = byCat[g.key]?.sum||0; const pct = cat? (have/cat.weight)*100 : 0;
    return { ...g, achieved: Math.round(pct), ok: pct >= g.minPct };
  });
  return { ok: items.every(x=>x.ok), items };
}

function renderGates(state){
  gatesList.innerHTML='';
  state.items.forEach(g=>{
    const li = document.createElement('li');
    const color = semColor(g.achieved);
    li.innerHTML = `<span>${g.label}</span> <span class="badge" style="color:${color};border-color:${color}55;background:${color}14">${g.achieved}%</span>`;
    gatesList.appendChild(li);
  });
  gatesStatus.innerHTML='';
  const dot = document.createElement('span'); dot.className='semaforo'; dot.style.width='10px'; dot.style.height='10px'; dot.style.background = state.ok? 'var(--ok)' : 'var(--err)';
  const txt = document.createElement('span'); txt.textContent = state.ok? 'Cumple mínimos' : 'No cumple';
  gatesStatus.appendChild(dot); gatesStatus.appendChild(txt);
}

// ===== KPIs ampliados y cruzados =====
function computeKPIs(){
  const totalItems = MODEL.reduce((acc,c)=> acc + c.items.length, 0);
  const checkedIds = window.__state_checkedIds || new Set();

  // Índice de ítems
  const meta = [];
  MODEL.forEach(cat=> cat.items.forEach((it,idx)=> meta.push({ catKey:cat.key, catTitle:cat.title, idx, s:it.s||'low', crit:!!it.crit, id:`${cat.key}-${idx}` })));

  const checkedCount = meta.filter(m=> checkedIds.has(m.id)).length;
  const coverage = totalItems? checkedCount/totalItems : 0;

  const highs = meta.filter(m=> m.s==='high');
  const highsTotal = highs.length;
  const highsChecked = highs.filter(m=> checkedIds.has(m.id)).length;
  const highCompliance = highsTotal? highsChecked/highsTotal : 0;

  // Cumplimiento por categoría
  const byCat = window.__state_byCat || {};
  const categoryCompliance = {};
  MODEL.forEach(cat=>{ const have = byCat[cat.key]?.sum||0; categoryCompliance[cat.key] = cat.weight? have/cat.weight : 0; });

  // Gates
  const gateState = computeGates(byCat);

  // Particionamiento OK
  const partitionOk = (categoryCompliance['partition']||0) >= 0.7 || checkedIds.has('partition-0');

  // IRO (0..1)
  let iro = (1 - highCompliance)*0.6 + (gateState.ok?0:1)*0.3 + (partitionOk?0:1)*0.1;
  iro = Math.min(1, Math.max(0, iro));

  // Brecha promedio vs benchmark
  const brechas = MODEL.map(cat=> Math.max(0, (BENCHMARKS[cat.key] ?? DEFAULT_BENCHMARK) - (categoryCompliance[cat.key]||0)) );
  const brechaProm = brechas.length? brechas.reduce((a,b)=>a+b,0)/brechas.length : 0;

  // ===== KPIs cruzados (alto nivel) =====
  const mean = arr => arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  const clamp01 = x => Math.max(0, Math.min(1, x));

  const sef = mean([
    categoryCompliance['engines']||0,
    categoryCompliance['pipelines']||0,
    categoryCompliance['partition']||0
  ]);

  const mgo = mean([
    categoryCompliance['governance']||0,
    categoryCompliance['readability']||0,
    categoryCompliance['variables']||0
  ]);

  const perf = categoryCompliance['performance']||0;
  const eng  = categoryCompliance['engines']||0;
  const coher = clamp01(1 - Math.abs(perf - eng));

  const allVals = MODEL.map(c=> categoryCompliance[c.key]||0);
  const mu = mean(allVals);
  const std = allVals.length? Math.sqrt(mean(allVals.map(v=> (v-mu)**2))) : 0;
  const cv = mu>0? std/mu : 1; // si no hay avance, balance=0
  const balance = clamp01(1 - cv);

  const critTotal = meta.filter(m=> m.crit).length;
  const critChecked = meta.filter(m=> m.crit && checkedIds.has(m.id)).length;
  const critCoverage = critTotal? critChecked/critTotal : 0;

  return { totalItems, checkedCount, coverage, highsTotal, highsChecked, highCompliance, gateState, iro, brechaProm, categoryCompliance, sef, mgo, coher, balance, critTotal, critChecked, critCoverage, meta, checkedIds };
}

function setKpiClass(el, status){ el.classList.remove('ok','warn','err'); if(status) el.classList.add(status); }
function byPct(p){ return p>=0.8? 'ok' : p>=0.6? 'warn' : 'err'; }

function updateKPIs(){
  const k = computeKPIs();
  // Cobertura
  kpi.cobertura.val.textContent = (k.coverage*100).toFixed(0)+"%";
  kpi.cobertura.foot.textContent = `${k.checkedCount}/${k.totalItems} ítems`;
  setKpiClass(kpi.cobertura.box, byPct(k.coverage));
  // High (N/A si no hay ítems high)
  if (k.highsTotal === 0) {
    kpi.high.val.textContent = "N/A";
    kpi.high.foot.textContent = "sin ítems high";
    setKpiClass(kpi.high.box, null);
  } else {
    kpi.high.val.textContent = (k.highCompliance*100).toFixed(0)+"%";
    kpi.high.foot.textContent = `${k.highsChecked}/${k.highsTotal} high`;
    setKpiClass(kpi.high.box, byPct(k.highCompliance));
  }
  // Gates
  const totalG = GATES.length; const okG = k.gateState.items.filter(x=>x.ok).length;
  kpi.gates.val.textContent = `${okG}/${totalG}`;
  kpi.gates.foot.textContent = k.gateState.ok? 'Todo OK' : 'Fallas: '+k.gateState.items.filter(x=>!x.ok).map(x=>x.label).join(' · ');
  setKpiClass(kpi.gates.box, k.gateState.ok? 'ok':'err');
  // IRO (0..100)
  kpi.iro.val.textContent = Math.round(k.iro*100);
  setKpiClass(kpi.iro.box, k.iro<=0.2? 'ok' : k.iro<=0.5? 'warn':'err');
  // Brecha
  kpi.brecha.val.textContent = (k.brechaProm*100).toFixed(0)+"%";
  setKpiClass(kpi.brecha.box, k.brechaProm<=0.2? 'ok': k.brechaProm<=0.4? 'warn':'err');

  // KPIs cruzados
  kpi.sef.val.textContent = (k.sef*100).toFixed(0)+"%";
  setKpiClass(kpi.sef.box, byPct(k.sef));

  kpi.mgo.val.textContent = (k.mgo*100).toFixed(0)+"%";
  setKpiClass(kpi.mgo.box, byPct(k.mgo));

  kpi.coher.val.textContent = (k.coher*100).toFixed(0)+"%";
  setKpiClass(kpi.coher.box, byPct(k.coher));

  kpi.balance.val.textContent = (k.balance*100).toFixed(0)+"%";
  setKpiClass(kpi.balance.box, byPct(k.balance));

  kpi.criticos.val.textContent = (k.critCoverage*100).toFixed(0)+"%";
  if(kpi.criticos.foot) kpi.criticos.foot.textContent = `${k.critChecked}/${k.critTotal} críticos`;
  setKpiClass(kpi.criticos.box, byPct(k.critCoverage));
}

// ===== Export/Print =====
function exportCSV(){
  const rows=[]; const sep=',';
  const project=(document.getElementById('projectName').value||'').replaceAll(',', ' ');
  const auditor=(document.getElementById('auditorName').value||'').replaceAll(',', ' ');
  const notes=(document.getElementById('notes').value||'').replaceAll('\n',' ').replaceAll(',', ';');
  const totalScore=scoreLabel.textContent;
  const gatesTxt = gatesStatus.textContent||'';

  rows.push(['Proyecto','Auditor','Score','Mínimos','Notas'].join(sep));
  rows.push([project,auditor,totalScore,gatesTxt,notes].join(sep));
  rows.push('');

  rows.push(['Mínimo','Requisito','Logrado','OK'].join(sep));
  const items = [...gatesList.children].map(li=>li.textContent);
  GATES.forEach(g=>{
    const li = items.find(t=> t.includes(g.label))||'';
    const m = li.match(/(\d+)%/); const achieved = m? m[1] : '0';
    const ok = Number(achieved) >= g.minPct ? 'Sí':'No';
    rows.push([g.key, `${g.minPct}%`, `${achieved}%`, ok].join(sep));
  });
  rows.push('');

  rows.push(['Categoría','Peso','Check','Puntos','Marcado'].join(sep));
  MODEL.forEach(cat=>{
    const perItem = cat.weight / cat.items.length;
    cat.items.forEach((it, idx)=>{
      const id=`${cat.key}-${idx}`; const mark = CHECKED[id] ? 'Sí' : 'No';
      rows.push([cat.title, cat.weight, it.q.replaceAll(',', ' '), perItem.toFixed(2), mark].join(sep));
    });
  });

  const csv = rows.join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`Checklist_Optimizacion_Dataiku_${project||'proyecto'}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function exportPDF(){ window.print(); }

function resetChecks(){ CHECKED={}; saveState(); renderForm(); computeScore(); updateCharts(); updateKPIs(); }
function resetWeights(){ MODEL = JSON.parse(JSON.stringify(MODEL_BASE)); saveState(); renderWeights(); renderForm(); computeScore(); updateCharts(); updateKPIs(); }

// ===== Gráficas =====
function buildRadarConfig(labels, values){
  return { type:'radar', data:{ labels, datasets:[{ label:'% por categoría', data:values, fill:true }] }, options:{ responsive:true, scales:{ r:{ suggestedMin:0, suggestedMax:100, angleLines:{color:'#e2e8f0'}, grid:{color:'#e2e8f0'}, pointLabels:{color:'#475569'} } }, plugins:{ legend:{display:false} } } };
}
function buildBarConfig(labels, values){
  return { type:'bar', data:{ labels, datasets:[{ label:'Puntos logrados', data:values }] }, options:{ indexAxis:'y', responsive:true, scales:{ x:{ suggestedMin:0, suggestedMax:100, grid:{color:'#e2e8f0'}, ticks:{color:'#475569'} }, y:{ ticks:{color:'#0f172a'} } }, plugins:{ legend:{display:false} } } };
}
function updateCharts(){
  const byCat={};
  MODEL.forEach(cat=> byCat[cat.key]={sum:0});
  document.querySelectorAll('#form input[type="checkbox"]').forEach(i=>{ if(i.checked){ byCat[i.dataset.category].sum += parseFloat(i.dataset.weight); } });

  const labels = MODEL.map(c=>c.title.replace(/^\d+\.\s*/,''));
  const pctValues = MODEL.map(c=>{ const v = byCat[c.key]?.sum||0; return +( (v/c.weight)*100 ).toFixed(2); });
  const rawValues = MODEL.map(c=> +( (byCat[c.key]?.sum||0).toFixed(2) ) );

  if(!radarChart){ radarChart = new Chart(document.getElementById('chartRadar'), buildRadarConfig(labels, pctValues)); }
  else{ radarChart.data.labels = labels; radarChart.data.datasets[0].data = pctValues; radarChart.update(); }

  if(!barChart){ barChart = new Chart(document.getElementById('chartBar'), buildBarConfig(labels, rawValues)); }
  else{ barChart.data.labels = labels; barChart.data.datasets[0].data = rawValues; barChart.update(); }
}

// ===== Prompt ESTRICTO para ChatGPT (reemplazo) =====
function generateChatGPTPrompt(){
  const project = (document.getElementById('projectName').value || '').trim();
  const auditor = (document.getElementById('auditorName').value || '').trim();
  const notes = (document.getElementById('notes').value || '').trim();
  const score = Number(scoreLabel.textContent || 0);
  const gatesTxt = (gatesStatus.textContent || '').trim();

  const k = computeKPIs();

  // Top 5 pendientes (prioridad por peso x severidad x crítico)
  const pending = [];
  MODEL.forEach(cat=>{
    const perItem = cat.weight / cat.items.length;
    cat.items.forEach((it, idx)=>{
      const id=`${cat.key}-${idx}`;
      if(!(k.checkedIds||new Set()).has(id)){
        const sev = it.s||'low';
        const prio = perItem * (severityFactor[sev]||1) * (it.crit?1.5:1);
        pending.push({cat:cat.key, cat_title:cat.title, q:it.q, sev, crit:!!it.crit, prio:+prio.toFixed(2)});
      }
    });
  });
  pending.sort((a,b)=> b.prio - a.prio);
  const top5 = pending.slice(0,5).map(t=> ({cat:t.cat_title, q:t.q, sev:t.sev, crit:t.crit, prioridad:t.prio}));

  // Carga compacta para el LLM
  const payload = {
    proyecto: project || null,
    auditor: auditor || null,
    notas: notes || null,
    score_total: score,
    gates: gatesTxt, // "Cumple mínimos" | "No cumple"
    kpis:{
      cobertura: Math.round(k.coverage*100),
      cumplimiento_high: k.highsTotal===0? null : Math.round(k.highCompliance*100),
      iro: Math.round(k.iro*100),                       // 0 bajo, 100 alto
      brecha_vs_benchmark: Math.round(k.brechaProm*100),
      sef: Math.round(k.sef*100),
      mgo: Math.round(k.mgo*100),
      coherencia_perf_motores: Math.round(k.coher*100),
      balance_categorias: Math.round(k.balance*100),
      cobertura_criticos: Math.round(k.critCoverage*100)
    },
    categorias: Object.fromEntries(
      MODEL.map(c=> [c.key, Math.round((k.categoryCompliance[c.key]||0)*100)])
    ),
    resumen_items:{
      total: k.totalItems, marcados: k.checkedCount,
      highs_total: k.highsTotal, highs_marcados: k.highsChecked,
      crit_total: k.critTotal, crit_marcados: k.critChecked
    },
    top_pendientes: top5
  };

  // PROMPT ESTRICTO
const prompt = [
`ROL: Auditor senior en optimización de flujos en Dataiku.`,
`PROPOSITO: Elaborar un informe narrativo, breve y entendible para un público no técnico, que explique el nivel de madurez alcanzado en la optimización del proyecto. El informe debe usar como base el JSON generado por un formulario de diagnóstico diseñado específicamente para evaluar la eficiencia, gobernanza y riesgos en los flujos de Dataiku.`,
`ENTORNO: No tienes acceso a Dataiku; tu única fuente es el JSON provisto. Dicho JSON proviene de un formulario de auditoría que recopila el estado del proyecto en dimensiones clave: cobertura de ítems, cumplimiento de mínimos, riesgo operativo, eficiencia de motores, gobernanza, balance entre categorías y cobertura de ítems críticos. Este formulario fue creado para ayudar a organizaciones a identificar cuellos de botella y oportunidades de optimización en sus flujos.`,
`IDIOMA: Español, tono ejecutivo y coloquial.`,
`ESTILO:`,
`- Narrativo, no en listas. Conecta ideas de manera fluida.`,
`- Explica términos técnicos en una frase corta (entre paréntesis).`,
`- Frases claras y sin adornos innecesarios.`,
`LIMITES:`,
`- Máximo 180 palabras.`,
`- No repitas ni copies textualmente el JSON.`,
`- No inventes datos ni supongas configuraciones no provistas.`,

`NIVELES POSIBLES: Inicial | En progreso | Estable | Optimizado.`,

`REGLAS DE DECISION:`,
`1) Si gates != "Cumple mínimos" ⇒ nivel máximo: "En progreso".`,
`2) Si IRO ≥ 60 ⇒ no puede ser "Estable" ni "Optimizado".`,
`3) Si cobertura < 60 o cobertura_criticos < 60 ⇒ nivel máximo: "En progreso".`,
`4) "Optimizado" requiere: gates OK, IRO ≤ 20, cobertura ≥ 85, (si existe) cumplimiento_high ≥ 85, SEF ≥ 80, MGO ≥ 80, balance ≥ 70, brecha ≤ 20.`,
`5) "Estable" requiere: gates OK, IRO ≤ 50, cobertura ≥ 70, (si existe) cumplimiento_high ≥ 70, SEF ≥ 70, MGO ≥ 70, balance ≥ 60, brecha ≤ 30.`,
`6) Si no cumple 4–5 y no cae en 1–3 ⇒ "En progreso"; si además IRO ≥ 80 o cobertura < 40 ⇒ "Inicial".`,

`SALIDA OBLIGATORIA (estructura narrativa):`,
`- Introduce el nivel de madurez identificado y explica qué significa en palabras simples.`,
`- Explica el propósito del formulario como herramienta de diagnóstico para optimizar flujos en Dataiku y cómo los datos del JSON permiten esta evaluación.`,
`- Interpreta todas las métricas provistas en el JSON (cobertura, cumplimiento_high, IRO, brecha, SEF, MGO, coherencia_perf_motores, balance, cobertura_criticos) explicando de forma individual qué miden y, cuando sea relevante, cómo se relacionan entre sí para reflejar fortalezas o debilidades.`,
`- Señala los hallazgos principales y su impacto en el negocio o en el uso de la herramienta.`,
`- Integra tres acciones prioritarias con horizonte de 2 semanas, 30 días y 90 días, derivadas de la lectura de los KPIs.`,
`- Concluye con una recomendación de seguimiento, basada en un KPI con umbral claro (ej.: Engines ≥ 80% e IRO ≤ 35).`,

`DATOS:`,
JSON.stringify(payload, null, 2)
].join('\\n');


  return prompt;
}

// ===== Plan de acción =====
function planBoxVisible(){ return planText && planText.offsetParent !== null; }
function refreshPlanLive(){ const body = generatePlan(); planText.value = body; }

function generatePlan(){
  const now = new Date();
  const fecha = now.toLocaleString();

  // Recolectar estado
  const byCat = window.__state_byCat || {};
  const checkedIds = window.__state_checkedIds || new Set();

  // Meta de ítems no cumplidos
  const meta = [];
  MODEL.forEach(cat=>{
    const perItem = cat.weight / cat.items.length;
    cat.items.forEach((it, idx)=>{
      const id = `${cat.key}-${idx}`;
      if(!checkedIds.has(id)){
        const sev = it.s||'low';
        const prio = perItem * (severityFactor[sev]||1) * (it.crit? 1.5 : 1);
        const plazo = sev==='high'? '7 días' : sev==='med'? '14 días' : '30 días';
        meta.push({ categoria:cat.title, id, label:it.q, sev, crit:!!it.crit, peso:perItem, prioridad:prio, plazo, tip: tipForItem(cat.key, idx, it) });
      }
    });
  });
  meta.sort((a,b)=> b.prioridad - a.prioridad);

  const top = meta.slice(0,5).map((h,i)=> ` ${i+1}. [${h.categoria}] ${h.label} — Sev:${h.sev}${h.crit?' · CRÍTICO':''} · Plazo: ${h.plazo}
    Acción: ${h.tip}
`).join('');

  const full = meta.map((h,i)=> `• (${i+1}) [${h.categoria}] ${h.label}
  Severidad:${h.sev}${h.crit?' · CRÍTICO':''} · Prioridad:${h.prioridad.toFixed(1)}
  Acción recomendada: ${h.tip}
  Responsable (R): ______  Accountable (A): ______  Consulted (C): ______  Informed (I): ______
  Fecha objetivo: ______  (sugerido: ${h.plazo})
`).join('\n');

  const k = computeKPIs();
  const resumen = `Cobertura: ${(k.coverage*100).toFixed(0)}% | Cumpl. High: ${k.highsTotal===0?'N/A':(k.highCompliance*100).toFixed(0)+'%'} | Gates: ${k.gateState.items.filter(x=>x.ok).length}/${GATES.length} | IRO: ${Math.round(k.iro*100)} | Brecha prom: ${(k.brechaProm*100).toFixed(0)}%`;

  // === Sección extra: Prompt para ChatGPT ===
  const prompt = generateChatGPTPrompt();

  const body = `PLAN DE ACCIÓN – Auditoría de Optimización (Dataiku)
Generado: ${fecha}

RESUMEN DE KPIs
${resumen}

ACCIONES INMEDIATAS (Top 5)
${top || '  (Sin hallazgos pendientes: todo OK)'}

PLAN DETALLADO (Prioridad descendente)
${full || '  (Sin pendientes)'}

NOTAS
- Ajusta responsables, fechas y agrega evidencias por ítem.
- Revisa gates fallidos: ${k.gateState.ok? 'Ninguno' : k.gateState.items.filter(x=>!x.ok).map(x=>x.label).join(' | ')}.

PROMPT PARA CHATGPT (copiar y pegar)
${prompt}
`;

  return body;
}

function tipForItem(catKey, idx, it){
  const map = {
    engines_1: 'Habilita pushdown/in-database para recetas SQL y revisa conexiones.',
    partition_0: 'Activa particiones por fecha/clave de negocio y recalcula solo nuevas.' ,
    governance_2: 'Añade métricas y checks en escenarios antes de pasar a producción.'
  };
  const key = `${catKey}_${idx}`;
  return map[key] || (it.d || 'Completar el ítem y documentar evidencia en DSS.');
}

// ===== Inicialización =====
function init(){
  renderForm(); renderWeights(); computeScore(); updateCharts(); updateKPIs();
  document.getElementById('resetBtn').addEventListener('click', resetChecks);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('pdfBtn').addEventListener('click', exportPDF);
  document.getElementById('resetWeights').addEventListener('click', resetWeights);
  document.getElementById('projectName').addEventListener('input', e=> localStorage.setItem('dku:project', e.target.value));
  document.getElementById('auditorName').addEventListener('input', e=> localStorage.setItem('dku:auditor', e.target.value));
  document.getElementById('notes').addEventListener('input', e=> localStorage.setItem('dku:notes', e.target.value));

  // Restaurar meta si existe
  const p = localStorage.getItem('dku:project'); if(p) document.getElementById('projectName').value=p;
  const a = localStorage.getItem('dku:auditor'); if(a) document.getElementById('auditorName').value=a;
  const n = localStorage.getItem('dku:notes'); if(n) document.getElementById('notes').value=n;

  // Plan de acción botones
  btnPlan.addEventListener('click', ()=>{ planText.value = generatePlan(); btnCopy.disabled=false; btnDownload.disabled=false; window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'}); });
  btnCopy.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(planText.value); btnCopy.textContent='Copiado'; setTimeout(()=>btnCopy.textContent='Copiar',1200);}catch(e){ alert('No se pudo copiar.'); } });
  btnDownload.addEventListener('click', ()=>{ const blob = new Blob([planText.value], {type:'text/plain'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='plan_accion_auditoria.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });
}
init();
