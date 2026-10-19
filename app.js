/* No dependencies, no build. Keep every path relative for GitHub Pages. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const EVENT_TIME = new Date('2026-11-22T12:00:00+05:00').getTime();
  const ADDRESS = 'Жаркент қаласы, Жібек Жолы көшесі, 137А. «Қуаныш Гранд Холл» мейрамханасы, «Суан» залы.';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('in-view'); observer.unobserve(entry.target);
      }
    }, { threshold: 0.06 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    document.documentElement.classList.add('js-reveal');
  }
  function updateCountdown() {
    const delta = Math.max(0, EVENT_TIME - Date.now());
    const totalSeconds = Math.floor(delta / 1000);
    const values = [Math.floor(totalSeconds/86400), Math.floor(totalSeconds/3600)%24, Math.floor(totalSeconds/60)%60, totalSeconds%60];
    ['days','hours','minutes','seconds'].forEach((id,i) => { $(id).textContent = String(values[i]).padStart(2,'0'); });
    if (!delta) {
      const startedToday = Date.now() - EVENT_TIME < 86400000;
      $('countdown-title').textContent = startedToday ? 'Қуанышты күн келді!' : 'Ақ тілектеріңізге рақмет!';
      $('countdown-note').textContent = startedToday ? 'Сіздерді қуана күтеміз!' : 'Бұл күн жүрегімізде мәңгі сақталады.';
    }
  }
  updateCountdown(); setInterval(updateCountdown,1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateCountdown(); });
  const mobileCta = document.querySelector('.mobile-rsvp');
  function updateCta() {
    const rsvp = $('rsvp').getBoundingClientRect();
    mobileCta.classList.toggle('visible', window.scrollY > 600 && !(rsvp.top < window.innerHeight && rsvp.bottom > 0));
  }
  window.addEventListener('scroll', updateCta, {passive:true});
  window.addEventListener('resize', updateCta, {passive:true}); updateCta();
  $('copy-address').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(ADDRESS); $('copy-status').textContent='Мекенжай көшірілді!'; }
    catch { $('copy-status').textContent='Көшіру қолжетімсіз. Мекенжай мәтінін белгілеп көшіріңіз.'; }
  });
  const dialog = $('privacy-dialog');
  $('open-privacy').addEventListener('click', () => dialog.showModal());
  ['close-privacy','privacy-understood'].forEach(id=>$(id).addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',event=>{ if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();} });
  const form=$('rsvp-form'), companion=$('companion-name'), status=$('form-status'), button=$('submit-button');
  form.querySelectorAll('input[name=attendance]').forEach(input=>input.addEventListener('change',()=>{
    form.querySelectorAll('input[name=attendance]').forEach(radio=>radio.setCustomValidity(''));
    const isCouple=input.value==='couple' && input.checked;
    $('companion-field').hidden=!isCouple; companion.disabled=!isCouple; companion.required=isCouple;
    if(!isCouple)companion.value='';
    status.textContent='';
  }));
  // Kazakh validation messages; use browser validation without custom alert boxes.
  form.querySelectorAll('input,textarea').forEach(input=>{
    input.addEventListener('input',()=>input.setCustomValidity(''));
    input.addEventListener('change',()=>input.setCustomValidity(''));
    input.addEventListener('invalid',()=>{
      if(input.validity.valueMissing)input.setCustomValidity(input.type==='checkbox'?'Деректерді сақтауға келісіміңізді белгілеңіз.':input.type==='radio'?'Қатысу нұсқасын таңдаңыз.':'Бұл жолды толтырыңыз.');
      else if(input.validity.tooShort)input.setCustomValidity('Кемінде 2 таңба енгізіңіз.');
    });
  });
  const cfg=window.INVITATION_CONFIG||{};
  let apiUrl='';
  try { const parsed=new URL(cfg.supabaseUrl); if(parsed.protocol==='https:' && parsed.hostname.endsWith('.supabase.co'))apiUrl=parsed.origin; } catch { /* Unconfigured preview. */ }
  const key=(cfg.supabasePublishableKey||'').trim();
  let forbiddenKey=key.startsWith('sb_secret_');
  if(key.startsWith('eyJ'))try{forbiddenKey=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role!=='anon';}catch{forbiddenKey=true;}
  const ready=Boolean(apiUrl && (key.startsWith('sb_publishable_')||key.startsWith('eyJ')) && !forbiddenKey);
  if(!ready){$('config-notice').hidden=false;button.disabled=true;$('submit-label').textContent='Жауап қабылдау әлі қосылмаған';}
  // A stable request UUID makes a network retry idempotent; names are NOT stored in browser storage.
  let pending=null;
  function uuid(){return crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16));}
  function normalized(value){return value.trim().replace(/\s+/g,' ');}
  function errorMessage(code){
    if(code==='22023')return 'Мәліметтерді тексеріңіз: аты-жөніңізді толық жазыңыз және қатысу нұсқасын таңдаңыз.';
    if(code==='23505')return 'Бұл жауап бұрын жіберілген. Мәліметті өзгерту үшін той иелеріне хабарласыңыз.';
    return 'Жауап сақталмады немесе сақтау расталмады. Интернетті тексеріп, қайта жіберіңіз. Қайта жіберу алдыңғы жауапты қайталамайды.';
  }
  form.addEventListener('submit',async(event)=>{
    event.preventDefault(); if(!ready||button.disabled)return;
    if(form.elements.website.value)return;
    const attendance=form.elements.attendance.value;
    const payload={p_guest_name:normalized($('guest-name').value),p_attendance:attendance,p_companion_name:attendance==='couple'?normalized(companion.value):'',p_message:$('guest-message').value.trim(),p_consent:$('consent').checked};
    if(payload.p_guest_name.length<2||(attendance==='couple'&&payload.p_companion_name.length<2)){status.textContent='Аты-жөніңізді кемінде 2 таңбамен жазыңыз.';status.className='form-status error';return;}
    const signature=JSON.stringify(payload);
    if(!pending||pending.signature!==signature)pending={id:uuid(),signature};
    payload.p_submission_id=pending.id;
    button.disabled=true;button.setAttribute('aria-busy','true');$('submit-label').textContent='Жіберілуде…';$('submit-icon').textContent='…';status.className='form-status';status.textContent='Жауабыңыз қауіпсіз түрде жіберілуде.';
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),16000);
    try {
      const headers={'Content-Type':'application/json','apikey':key};
      // Publishable keys are not JWTs. Only legacy anon JWT keys belong in Authorization.
      if(key.startsWith('eyJ'))headers.Authorization=`Bearer ${key}`;
      const response=await fetch(`${apiUrl}/rest/v1/rpc/submit_rsvp`,{method:'POST',headers,body:JSON.stringify(payload),signal:controller.signal});
      const result=await response.json().catch(()=>null);
      if(!response.ok){const err=new Error('Request failed');err.code=result?.code;throw err;}
      if(result!==pending.id)throw new Error('Unconfirmed database response');
      $('form-content').hidden=true;$('success-panel').hidden=false;
      $('success-text').textContent=attendance==='declined'?'Хабарлағаныңызға рақмет! Ізгі тілектеріңіз біз үшін қымбат.':attendance==='couple'?'Сізді және жұбыңызды қуана күтеміз!':'Сізді қуана күтеміз!';
      $('success-panel').focus({preventScroll:true});pending=null;form.reset();
    } catch(err){status.className='form-status error';status.textContent=errorMessage(err.code);}
    finally {clearTimeout(timeout);button.disabled=false;button.removeAttribute('aria-busy');$('submit-label').textContent='Жауапты жіберу';$('submit-icon').textContent='↗';}
  });
})();
