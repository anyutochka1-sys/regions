let measures=[];
const children=document.querySelector("#children"),ages=document.querySelector("#ages"),extra=document.querySelector("#extraQuestions");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function drawAges(){let n=Math.max(0,Math.min(15,+children.value||0));ages.innerHTML=n?'<h3>Возраст детей</h3><div class="age-grid">'+Array.from({length:n},(_,i)=>'<label>Ребёнок '+(i+1)+'<input class="age" type="number" min="0" max="30" step="0.1" placeholder="лет" required></label>').join("")+'</div>':""}
function drawExtra(){extra.innerHTML='<details><summary>Уточнить ситуацию семьи</summary><div class="grid2"><label>Возраст мамы<input id="motherAge" type="number" min="14" max="80" placeholder="Необязательно"></label><label>Дети родились одновременно?<select id="multipleBirth"><option value="">Не относится</option><option value="yes">Да</option><option value="no">Нет</option></select></label></div><label><input id="student1822" type="checkbox"> Есть ребёнок 18–22 лет, который учится очно</label></details>'}
children.addEventListener("input",()=>{drawAges();drawExtra()});drawAges();drawExtra();
async function loadMeasures(){try{const r=await fetch("./data/measures.json",{cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();measures=(d.measures||[]).filter(x=>x.status==="active"&&x.review_status==="verified")}catch(e){document.querySelector("#cards").innerHTML='<p>База мер временно не загрузилась. Попробуйте обновить страницу.</p>'}}
function fits(m,ctx){
 if(m.jurisdiction&&m.jurisdiction!=="RU"&&m.jurisdiction!==ctx.region)return false;
 const q=m.eligibility||{};
 if(q.children_min&&ctx.kids<q.children_min)return false;
 if(q.child_max_months!=null&&!ctx.ages.some(a=>a*12<=q.child_max_months))return false;
 if(q.child_max_years!=null&&!ctx.ages.some(a=>a<=q.child_max_years))return false;
 if(q.event==="birth"&&!ctx.ages.some(a=>a<1))return false;
 if(q.pregnancy&&!ctx.preg)return false;
 if(q.disabled_child&&!ctx.dis)return false;
 if(q.special_category==="wife_of_conscript"&&!(ctx.preg&&ctx.conscript))return false;
 if(q.special_category==="child_of_conscript"&&!ctx.conscript)return false;
 if(q.special_category==="adoption_guardianship_foster"&&!ctx.foster)return false;
 if(q.special_category==="mother_heroine"&&!ctx.motherHeroine)return false;
 if(q.parent_employed&&!ctx.employed)return false;
 if(q.special_category==="large_family"&&!ctx.largeFamily)return false;
 if(q.education&&!ctx.schoolChild)return false;
 if(q.housing_utilities&&!ctx.housingUtilities)return false;
 if(m.id==="unified"&&!ctx.preg&&!ctx.ages.some(a=>a<17))return false;
 return true;
}
function amountText(a){if(!a)return"";if(a.type==="fixed")return "Размер: "+new Intl.NumberFormat("ru-RU",{minimumFractionDigits:2}).format(a.value)+" ₽"+(a.note?" • "+a.note:"");if(a.type==="range")return "Размер: "+new Intl.NumberFormat("ru-RU").format(a.min)+"–"+new Intl.NumberFormat("ru-RU").format(a.max)+" ₽"+(a.note?" • "+a.note:"");if(a.type==="regional_child_living_minimum")return"Размер зависит от детского прожиточного минимума в регионе.";if(a.type==="formula")return a.note||"";return""}
function renderCard(m){const law=(m.legal_basis||[])[0];const url=(m.official_urls||[])[0];return '<article class="measure"><div class="measure-top"><div><h3>'+esc(m.title)+'</h3><span class="tag">'+(m.level==="federal"?"Федеральная":"Региональная")+'</span></div></div>'+(amountText(m.amount)?'<p><strong>'+esc(amountText(m.amount))+'</strong></p>':'')+'<p class="status">● Проверено '+esc(m.verified)+'</p>'+(law?'<p class="legal"><strong>Основание:</strong> '+esc(law.title)+'</p>':'')+(url?'<p><a href="'+esc(url)+'" target="_blank" rel="noopener">Официальный источник ↗</a></p>':'')+'<p class="small">Это предварительный подбор. Наличие карточки не означает автоматического права на выплату.</p></article>'}
document.querySelector("#familyForm").addEventListener("submit",async e=>{e.preventDefault();if(!measures.length)await loadMeasures();const ctx={region:document.querySelector("#region").value,members:+document.querySelector("#members").value,kids:+children.value,ages:[...document.querySelectorAll(".age")].map(x=>+x.value),preg:document.querySelector("#pregnant").checked,dis:document.querySelector("#disabledChild").checked,conscript:document.querySelector("#conscriptFamily")?.checked||false,foster:document.querySelector("#fosterFamily")?.checked||false,motherHeroine:document.querySelector("#motherHeroine")?.checked||false,employed:document.querySelector("#employedParent")?.checked||false,largeFamily:document.querySelector("#largeFamily")?.checked||false,schoolChild:document.querySelector("#schoolChild")?.checked||false,noKindergarten:document.querySelector("#noKindergarten")?.checked||false,housingUtilities:document.querySelector("#housingUtilities")?.checked||false};const relevant=measures.filter(m=>fits(m,ctx));document.querySelector("#summary").textContent=ctx.region+" • членов семьи: "+ctx.members+" • детей: "+ctx.kids+(ctx.preg?" • беременность":"")+(ctx.dis?" • есть ребёнок с инвалидностью":"")+". Ниже меры, которые стоит проверить.";const fed=relevant.filter(x=>x.level==="federal"),reg=relevant.filter(x=>x.level==="regional");const group=(t,a)=>a.length?'<h3 class="group-title">'+t+'</h3>'+a.map(renderCard).join(""):"";document.querySelector("#cards").innerHTML=group("Федеральные меры",fed)+group("Региональные меры",reg)+(relevant.length?"":'<p>По введённым данным в проверенной базе пока нет подходящих карточек.</p>');document.querySelector("#results").classList.remove("hidden");document.querySelector("#results").scrollIntoView({behavior:"smooth"})});
document.querySelector("#edit").onclick=()=>document.querySelector(".form-card").scrollIntoView({behavior:"smooth"});
loadMeasures();
