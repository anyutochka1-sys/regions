let measures=[];let regions=[];
const children=document.querySelector("#children"),ages=document.querySelector("#ages"),extra=document.querySelector("#extraQuestions");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function drawAges(){let n=Math.max(0,Math.min(15,+children.value||0));ages.innerHTML=n?'<h3>Возраст детей</h3><div class="age-grid">'+Array.from({length:n},(_,i)=>'<label>Ребёнок '+(i+1)+'<input class="age" type="number" min="0" max="30" step="0.1" placeholder="лет" required></label>').join("")+'</div>':""}
function drawExtra(){extra.innerHTML='<details><summary>Уточнить ситуацию семьи</summary><label id="pregnancyWeeksWrap" style="display:none">Срок беременности, недель<input id="pregnancyWeeks" type="number" min="1" max="45" step="1" placeholder="Например, 26"></label><div class="grid2"><label>Возраст мамы<input id="motherAge" type="number" min="14" max="80" placeholder="Необязательно"></label><label>Дети родились одновременно?<select id="multipleBirth"><option value="">Не относится</option><option value="yes">Да</option><option value="no">Нет</option></select></label></div><label><input id="student1822" type="checkbox"> Есть ребёнок 18–22 лет, который учится очно</label></details>'}
children.addEventListener("input",()=>{drawAges();drawExtra();syncPregnancyWeeks()});function syncPregnancyWeeks(){const w=document.querySelector("#pregnancyWeeksWrap");if(w)w.style.display=document.querySelector("#pregnant").checked?"flex":"none"}document.querySelector("#pregnant").addEventListener("change",syncPregnancyWeeks);drawAges();drawExtra();syncPregnancyWeeks();
async function loadMeasures(){try{const [mr,rr]=await Promise.all([fetch("./data/measures.json",{cache:"no-store"}),fetch("./data/regions.json",{cache:"no-store"})]);if(!mr.ok)throw Error();const d=await mr.json();measures=(d.measures||[]).filter(x=>x.status==="active"&&x.review_status==="verified");if(rr.ok){const rd=await rr.json();regions=rd.regions||[];populateRegions();restoreRegion()}}catch(e){document.querySelector("#cards").innerHTML='<p>База мер временно не загрузилась. Попробуйте обновить страницу.</p>'}}
function isCurrentlyEffective(m){const now=new Date();now.setHours(0,0,0,0);if(m.effective_from){const from=new Date(m.effective_from+"T00:00:00");if(from>now)return false}if(m.effective_to){const to=new Date(m.effective_to+"T23:59:59");if(to<now)return false}return true}
function fits(m,ctx){
 if(m.jurisdiction&&m.jurisdiction!=="RU"&&m.jurisdiction!==ctx.region)return false;
 const q=m.eligibility||{};
 if(q.children_min&&ctx.kids<q.children_min)return false;
 if(q.child_max_months!=null&&!ctx.ages.some(a=>a*12<=q.child_max_months))return false;
 if(q.child_max_years!=null&&!ctx.ages.some(a=>a<=q.child_max_years))return false;
 if(q.event==="birth"&&!ctx.ages.some(a=>a<1))return false;
 if(q.pregnancy&&!ctx.preg)return false;
 if(q.pregnancy_weeks_min!=null&&(!ctx.pregnancyWeeks||ctx.pregnancyWeeks<q.pregnancy_weeks_min))return false;
 if(q.disabled_child&&!ctx.dis)return false;
 if(q.special_category==="wife_of_conscript"&&!(ctx.preg&&ctx.conscript))return false;
 if(q.special_category==="child_of_conscript"&&!ctx.conscript)return false;
 if(q.special_category==="adoption_guardianship_foster"&&!ctx.foster)return false;
 if(q.special_category==="mother_heroine"&&!ctx.motherHeroine)return false;
 if((q.parent_employed||q.parent_working)&&!ctx.employed)return false;
 if(q.special_category==="large_family"&&!ctx.largeFamily)return false;
 if(q.education&&!ctx.schoolChild)return false;
 if(q.housing_utilities&&!ctx.housingUtilities)return false;
 if(m.id==="unified"&&!ctx.preg&&!ctx.ages.some(a=>a<17))return false;
 return true;
}
function updateUrl(region){try{const u=new URL(location.href);u.searchParams.set("region",region);history.replaceState(null,"",u)}catch(e){}}
function populateRegions(){const el=document.querySelector("#region");if(!el||!regions.length)return;const current=el.value;el.innerHTML='<option value="">Выберите регион</option>'+regions.filter(r=>r.public!==false).map(r=>'<option value="'+esc(r.name)+'">'+esc(r.name)+'</option>').join("")+'<option disabled>Другие регионы добавляются</option>';if(current&&[...el.options].some(o=>o.value===current))el.value=current}
function restoreRegion(){try{const r=new URL(location.href).searchParams.get("region");const el=document.querySelector("#region");if(r&&[...el.options].some(o=>o.value===r))el.value=r}catch(e){}}
function money(v){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(v)+" ₽"}
function amountText(a){
 if(!a)return"";
 if(a.type==="fixed")return "Размер: "+money(a.value)+(a.note?" • "+a.note:"");
 if(a.type==="range")return "Размер: "+money(a.min)+"–"+money(a.max)+(a.note?" • "+a.note:"");
 if(a.type==="regional_child_living_minimum")return"Размер зависит от детского прожиточного минимума в регионе."+(a.note?" "+a.note:"");
 if(a.type==="formula"||a.type==="calculated"||a.type==="benefit")return a.note||a.description||"Размер или объём меры определяется по правилам программы.";
 if(a.type==="variants"){const items=(a.variants||a.values||[]).map(v=>{const val=v.value!=null?money(v.value):esc(v.amount||"");return (v.label?esc(v.label)+": ":"")+val});return items.length?"Варианты: "+items.join(" • "):(a.note||"");}
 return a.note||"";
}
function effectiveText(m){if(!m.effective_from)return"";const d=new Date(m.effective_from+"T00:00:00");return isNaN(d)?"":d.toLocaleDateString("ru-RU")}
function sourceDate(m){return m.verified||m.last_verified||m.verified_at||""}
function measureDetails(m){const q=m.eligibility||{};const rows=[];if(q.children_min)rows.push("Детей: от "+q.children_min);if(q.child_max_years!=null)rows.push("Возраст ребёнка: до "+q.child_max_years+" лет");if(q.child_max_months!=null)rows.push("Возраст ребёнка: до "+q.child_max_months+" мес.");if(q.pregnancy_weeks_min!=null)rows.push("Срок беременности: от "+Math.ceil(q.pregnancy_weeks_min)+" недель");if(q.parent_employed||q.parent_working)rows.push("Учитывается официальная занятость родителя");if(q.education)rows.push("Учитывается обучение ребёнка");return rows}
function renderCard(m){const law=(m.legal_basis||[])[0];const url=(m.official_urls||[])[0];return '<article class="measure"><div class="measure-top"><div><h3>'+esc(m.title)+'</h3><span class="tag">'+(m.level==="federal"?"Федеральная":"Региональная")+'</span></div></div>'+(amountText(m.amount)?'<p><strong>'+esc(amountText(m.amount))+'</strong></p>':'')+(measureDetails(m).length?'<div class="conditions"><strong>Что уже учтено в подборе:</strong><ul>'+measureDetails(m).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'')+'<p class="status">● Проверено '+esc(sourceDate(m)||"дата указана в базе")+'</p>'+(m.effective_from?'<p class="small"><strong>Действует с:</strong> '+esc(effectiveText(m))+'</p>':'')+(law?'<p class="legal"><strong>Основание:</strong> '+esc(law.title)+'</p>':'')+(url?'<p><a href="'+esc(url)+'" target="_blank" rel="noopener">Официальный источник ↗</a></p>':'')+'<p class="small">Это предварительный подбор. Наличие карточки не означает автоматического права на выплату.</p></article>'}
document.querySelector("#familyForm").addEventListener("submit",async e=>{e.preventDefault();if(!measures.length)await loadMeasures();const ctx={region:document.querySelector("#region").value,members:+document.querySelector("#members").value,kids:+children.value,ages:[...document.querySelectorAll(".age")].map(x=>+x.value),preg:document.querySelector("#pregnant").checked,pregnancyWeeks:+(document.querySelector("#pregnancyWeeks")?.value||0),dis:document.querySelector("#disabledChild").checked,conscript:document.querySelector("#conscriptFamily")?.checked||false,foster:document.querySelector("#fosterFamily")?.checked||false,motherHeroine:document.querySelector("#motherHeroine")?.checked||false,employed:document.querySelector("#employedParent")?.checked||false,largeFamily:document.querySelector("#largeFamily")?.checked||false,schoolChild:document.querySelector("#schoolChild")?.checked||false,noKindergarten:document.querySelector("#noKindergarten")?.checked||false,housingUtilities:document.querySelector("#housingUtilities")?.checked||false};updateUrl(ctx.region);const relevant=measures.filter(m=>isCurrentlyEffective(m)&&fits(m,ctx));const regionMeta=regions.find(r=>r.name===ctx.region);const regionalCount=relevant.filter(x=>x.level==="regional").length;document.querySelector("#regionalStatus").innerHTML=regionMeta&&regionMeta.data_status!=="verified_complete"?'<div class="notice"><strong>Региональная база ещё проверяется.</strong><p>Федеральные меры показаны из проверенной базы. По '+esc(ctx.region)+' региональные меры добавляются только после сверки действующего НПА. Сейчас найдено проверенных региональных карточек: '+regionalCount+'.</p></div>':'';document.querySelector("#summary").textContent=ctx.region+" • членов семьи: "+ctx.members+" • детей: "+ctx.kids+(ctx.preg?" • беременность":"")+(ctx.dis?" • есть ребёнок с инвалидностью":"")+". Ниже меры, которые стоит проверить.";const fed=relevant.filter(x=>x.level==="federal"),reg=relevant.filter(x=>x.level==="regional");const group=(t,a)=>a.length?'<h3 class="group-title">'+t+'</h3>'+a.map(renderCard).join(""):"";document.querySelector("#cards").innerHTML=group("Федеральные меры",fed)+group("Региональные меры",reg)+(relevant.length?"":'<p>По введённым данным в проверенной базе пока нет подходящих карточек.</p>');document.querySelector("#results").classList.remove("hidden");document.querySelector("#results").scrollIntoView({behavior:"smooth"})});
document.querySelector("#edit").onclick=()=>document.querySelector(".form-card").scrollIntoView({behavior:"smooth"});
loadMeasures();
