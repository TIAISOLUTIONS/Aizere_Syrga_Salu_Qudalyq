(() => {
'use strict';
const $=id=>document.getElementById(id);
// The existing config.js is unchanged. Upload a vertical picture at this relative path.
const COVER_PHOTO='./assets/cover.jpg';
const photo=new Image();
photo.onload=()=>{$('cover-photo').src=photo.src;$('cover-photo').hidden=false;};
photo.onerror=()=>{}; // No photo: keep the cream background, never show a broken image.
photo.src=COVER_PHOTO;
const EVENT_TIME=Date.parse('2026-11-22T12:00:00+05:00');
function countdown(){
 const seconds=Math.floor(Math.max(0,EVENT_TIME-Date.now())/1000);
 const values=[Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
 ['days','hours','minutes','seconds'].forEach((id,i)=>$(id).textContent=String(values[i]).padStart(2,'0'));
 if(Date.now()>=EVENT_TIME)$('countdown-title').textContent=Date.now()-EVENT_TIME<86400000?'Той күні келді!':'Той өтті';
}
countdown();setInterval(countdown,1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)countdown();});
if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const ob=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');ob.unobserve(e.target);}}),{threshold:.05});
 document.querySelectorAll('.reveal').forEach(el=>ob.observe(el));document.documentElement.classList.add('js-reveal');
}
$('copy-address').addEventListener('click',async()=>{
 const address='https://2gis.kz/almaty/firm/70000001076317228 Жаркент қаласы, Жібек Жолы көшесі, 137А. «Қуаныш Гранд Холл» мейрамханасы, «Суан» залы.';
 try{await navigator.clipboard.writeText(address);$('copy-status').textContent='Көшірілді';}
 catch{$('copy-status').textContent='Автоматты көшіру қолжетімсіз.';}
});
const form=$('rsvp-form'),companion=$('companion-name'),button=$('submit-button'),status=$('form-status');
const radios=form.querySelectorAll('input[name=attendance]');
radios.forEach(input=>input.addEventListener('change',()=>{
 radios.forEach(el=>el.setCustomValidity(''));
 const pair=input.checked&&input.value==='couple';$('companion-field').hidden=!pair;companion.disabled=!pair;companion.required=pair;
 companion.setCustomValidity('');if(!pair)companion.value='';status.textContent='';
}));
form.querySelectorAll('input').forEach(input=>{
 input.addEventListener('input',()=>input.setCustomValidity(''));input.addEventListener('change',()=>input.setCustomValidity(''));
 input.addEventListener('invalid',()=>{if(input.validity.valueMissing)input.setCustomValidity(input.type==='radio'?'Қатысу нұсқасын таңдаңыз.':'Аты-жөніңізді жазыңыз.');else if(input.validity.tooShort)input.setCustomValidity('Кемінде 2 таңба енгізіңіз.');});
});
const cfg=window.INVITATION_CONFIG||{};let apiUrl='';
try{const u=new URL(cfg.supabaseUrl);if(u.protocol==='https:'&&u.hostname.endsWith('.supabase.co'))apiUrl=u.origin;}catch{}
const key=(cfg.supabasePublishableKey||'').trim();let forbidden=key.startsWith('sb_secret_');
if(key.startsWith('eyJ'))try{forbidden=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role!=='anon';}catch{forbidden=true;}
const ready=Boolean(apiUrl&&!forbidden&&(key.startsWith('sb_publishable_')||key.startsWith('eyJ')));
if(!ready){$('config-notice').hidden=false;button.disabled=true;}
let pending=null;
const normalize=v=>v.trim().replace(/\s+/g,' ');
function uuid(){return crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16));}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!ready||button.disabled||form.elements.website.value)return;
 const attendance=form.elements.attendance.value;
 const payload={p_guest_name:normalize($('guest-name').value),p_attendance:attendance,p_companion_name:attendance==='couple'?normalize(companion.value):''};
 if(payload.p_guest_name.length<2||(attendance==='couple'&&payload.p_companion_name.length<2)){status.className='form-status error';status.textContent='Аты-жөніңізді толық жазыңыз.';return;}
 const signature=JSON.stringify(payload);if(!pending||pending.signature!==signature)pending={id:uuid(),signature};payload.p_submission_id=pending.id;
 button.disabled=true;button.setAttribute('aria-busy','true');$('submit-label').textContent='Жіберілуде…';status.textContent='';status.className='form-status';
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),16000);
 try{
  const headers={'Content-Type':'application/json',apikey:key};if(key.startsWith('eyJ'))headers.Authorization=`Bearer ${key}`;
  const response=await fetch(`${apiUrl}/rest/v1/rpc/submit_rsvp`,{method:'POST',headers,body:JSON.stringify(payload),signal:ctrl.signal});
  const result=await response.json().catch(()=>null);
  if(!response.ok){const err=new Error('Database request failed');err.code=result?.code;throw err;}
  if(result!==pending.id)throw new Error('Unconfirmed save');
  $('form-content').hidden=true;$('success-panel').hidden=false;
  $('success-text').textContent=attendance==='declined'?'Жауабыңыз сақталды.':attendance==='couple'?'Сіздерді қуана күтеміз!':'Сізді қуана күтеміз!';
  $('success-panel').focus({preventScroll:true});pending=null;form.reset();
 }catch(err){
  status.className='form-status error';
  status.textContent=err.code==='22023'?'Мәліметтерді тексеріп, қайта жіберіңіз.':err.code==='23505'?'Бұл жауап бұрын сақталған.': 'Сақтау расталмады. Интернетті тексеріп, қайта жіберіңіз.';
 }finally{clearTimeout(timeout);button.disabled=false;button.removeAttribute('aria-busy');$('submit-label').textContent='Жіберу';}
});
})();
