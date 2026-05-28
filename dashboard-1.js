// ── GLOBAL UTILITIES ──
function todayKey(){
  var n=new Date();
  if(n.getHours()<4)n=new Date(n.getTime()-864e5);
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}
window._dash1_todayKey=todayKey;
window.addEventListener('load',function(){if(typeof blPrune==='function')blPrune();});
function todayKeyRaw(){ return new Date().toISOString().slice(0,10); }
function safeHap(type, card, detail){
  if(typeof hap==='function')hap(type);
  // Log to button log
  var hapName = 'hap_unknown';
  if(typeof HAP!=='undefined'){
    if(type===HAP.check)hapName='hap_check';
    else if(type===HAP.save)hapName='hap_save';
    else if(type===HAP.soft)hapName='hap_soft';
    else if(type===HAP.dhikr)hapName='hap_dhikr';
    else if(type===HAP.dhikrDone)hapName='hap_dhikr_done';
    else if(type===HAP.brick)hapName='hap_brick';
    else if(type===HAP.tap)hapName='hap_tap';
    else if(type===HAP.error)hapName='hap_error';
  }
  if(hapName!=='hap_tap'&&hapName!=='hap_error'){
    if(typeof blLog==='function') blLog('action', card||'unknown', hapName, detail||'');
  }
}
function safeToast(msg){ if(typeof showToast==='function')showToast(msg); }
function lsGet(key,def){
  try{ var v=localStorage.getItem(key); return v?JSON.parse(v):def; }
  catch(e){ return def; }
}
function lsSet(key,val){
  try{ localStorage.setItem(key,JSON.stringify(val)); }
  catch(e){ console.warn('lsSet failed:',key,e); }
}
function copyToClipboard(text){
  if(navigator.clipboard){
    navigator.clipboard.writeText(text).catch(function(){
      var ta=document.createElement('textarea');ta.value=text;
      document.body.appendChild(ta);ta.select();
      document.execCommand('copy');document.body.removeChild(ta);
    });
  } else {
    var ta=document.createElement('textarea');ta.value=text;
    document.body.appendChild(ta);ta.select();
    document.execCommand('copy');document.body.removeChild(ta);
  }
}
// ── END GLOBAL UTILITIES ──

if(!window._dbgCheckpoints)window._dbgCheckpoints={};
window._dbgCheckpoints['dash1_start']=true;
console.log('dashboard-1.js started');
if(!window._dbgCheckpoints)window._dbgCheckpoints={};
// ── dashboard-1.js ── Part 1 of 3 ── v13 ── BUILD 2026-05-27 ──
// Contains: core setup, device sync, haptic engine, magnet mode,
//           todos, quick notes, meals, schedule, books (+ Kindle locations),
//           birthdays, weather, stocks, prayer times, calendar (week numbers),
//           salah tracker, quran tracker, juz amma, goals, bookmarks
// Continues in dashboard-2.js and dashboard-3.js

//  ZIP CODE CONFIG (must be first — used by weather, prayer, pickleball) 
var zipConfig=lsGet('dash_zip',{});
function getZipCfg(key,def){return zipConfig[key]!==undefined&&zipConfig[key]!==''?zipConfig[key]:def;}
function saveZipCfg(key,val){zipConfig[key]=val;lsSet('dash_zip',zipConfig);}
var ZIP_COORDS={
  '21044':{lat:39.2195,lng:-76.8607,city:'Columbia'},
  '21043':{lat:39.2657,lng:-76.7983,city:'Ellicott City'},
  '21045':{lat:39.2204,lng:-76.8347,city:'Columbia'},
  '21046':{lat:39.1876,lng:-76.8641,city:'Columbia'},
  '21042':{lat:39.2815,lng:-76.9121,city:'Ellicott City'},
  '21228':{lat:39.2676,lng:-76.7424,city:'Catonsville'},
  '21201':{lat:39.2904,lng:-76.6122,city:'Baltimore'},
  '20001':{lat:38.9072,lng:-77.0369,city:'Washington DC'},
  '20002':{lat:38.8951,lng:-76.9900,city:'Washington DC'},
  '20906':{lat:39.0787,lng:-77.0527,city:'Silver Spring'},
  '20850':{lat:39.0839,lng:-77.1528,city:'Rockville'},
  '20852':{lat:39.0512,lng:-77.1200,city:'Rockville'},
  '20707':{lat:39.0232,lng:-76.8713,city:'Laurel'},
  '21224':{lat:39.2787,lng:-76.5563,city:'Baltimore'},
};
function getHomeCoords(){
  var zip=getZipCfg('home','21044').trim();
  return ZIP_COORDS[zip]||ZIP_COORDS['21044'];
}
function getPickleCoords(){
  var zip=getZipCfg('pickle','21043').trim();
  return ZIP_COORDS[zip]||ZIP_COORDS['21043'];
}
function getPrayerZip(){
  return getZipCfg('home','21044').trim()||'21044';
}

var pad=function(n){return String(n).padStart(2,'0');};

function triggerJiggles(){
  document.querySelectorAll('.inactivity-notice.jiggle').forEach(function(el){
    el.style.animation='none';
    el.offsetHeight; // reflow
    el.style.animation='';
  });
}
function localDateStr(d){
  d=d||new Date();
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
var DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
var MO3=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
var DAY3=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function hijri(date){
  // Epoch-based: 1 Muharram 1447 = 7 July 2025 (verified)
  var EPOCH=new Date(2025,6,7);
  var HM=['Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Awwal','Jumada al-Thani','Rajab','Shaban','Ramadan','Shawwal','Dhu al-Qidah','Dhu al-Hijjah'];
  function isLeap(y){return [2,5,7,10,13,15,18,21,24,26,29].indexOf(y%30)>=0;}
  function dim(m,y){if(m%2===1)return 30;if(m===12)return isLeap(y)?30:29;return 29;}
  var hy=1447,hm=1,hd=1;
  var d=Math.round((date-EPOCH)/86400000);
  if(d>=0){while(d>0){var left=dim(hm,hy)-hd+1;if(d<left){hd+=d;d=0;}else{d-=left;hd=1;hm++;if(hm>12){hm=1;hy++;}}}}
  else{d=-d;while(d>0){if(d<hd){hd-=d;d=0;}else{d-=hd;hm--;if(hm<1){hm=12;hy--;}hd=dim(hm,hy);}}}
  return hd+' '+HM[hm-1]+' '+hy+' AH';
}

function moonEmoji(date){
  var JD=2451545.0+(date-new Date('2000-01-01T12:00:00Z'))/86400000;
  var age=(JD-2451549.76)%29.53059;
  if(age<0)age+=29.53059;
  if(age<1.85)return'\uD83C\uDF11';
  if(age<5.55)return'\uD83C\uDF12';
  if(age<9.25)return'\uD83C\uDF13';
  if(age<12.95)return'\uD83C\uDF14';
  if(age<16.65)return'\uD83C\uDF15';
  if(age<20.35)return'\uD83C\uDF16';
  if(age<24.05)return'\uD83C\uDF17';
  if(age<27.75)return'\uD83C\uDF18';
  return'\uD83C\uDF11';
}

function fmt12(t){
  var p=t.replace(/\s.*/,'').split(':').map(Number);
  return (p[0]%12||12)+':'+pad(p[1])+' '+(p[0]>=12?'PM':'AM');
}

var clockMode=localStorage.getItem('clockMode')||'24';
var sTapCount=0;
var sTapTimer=null;
var sHideTimer=null;

// ── HAPTIC FEEDBACK ──
// Central function — respects the vibrateOff setting
function hap(pattern){
  if(getSetting('vibrateOff'))return;
  if(!navigator.vibrate)return;
  navigator.vibrate(Array.isArray(pattern)?pattern:[pattern]);
}

// Named patterns with personality
var HAP={
  tap:      15,                    // barely-there acknowledgment
  soft:     [20,30,20],            // gentle double pulse
  check:    [25,40,60],            // short→long = satisfying confirmation
  brick:    [30,20,30],            // solid double thud — placing something
  dhikr:    20,                    // single quiet tap per count
  dhikrDone:[40,50,40,50,80],      // phase complete — builds to a finish
  write:    [20,40,20,40,60],      // building momentum
  grat:     [15,30,15],            // soft and warm
  stress:   [30,60,30],            // grounding, deliberate
  pomoWork: [80,50,80,50,120],     // work done — strong, earned
  pomoBreak:[30,80,50],            // break end — gentle wake-up
  goal:     [40,30,40,30,80],      // goal check-in — decisive
  save:     [20,30,40],            // generic save — ascending
  error:    [80,40,80,40,80],      // three bumps — something wrong
};

function toggleClockMode(){
  // Toggle clock mode immediately on every tap
  clockMode=(clockMode==='24'?'12':'24');
  localStorage.setItem('clockMode',clockMode);
  document.getElementById('clock-mode-badge').textContent=clockMode+'H';
  tickClock();
  // Also count toward secret 5-tap S-tracker reveal
  sTapCount++;
  if(sTapTimer)clearTimeout(sTapTimer);
  if(sTapCount>=5){
    sTapCount=0;
    revealSTracker();
    // Also unlock soul cards
    var soulCards=['legacy-letter','shadow-log','fear-inventory'];
    soulCards.forEach(function(id){
      var i=hiddenTiles.indexOf(id);
      if(i>=0)hiddenTiles.splice(i,1);
    });
    saveHiddenTiles();
    applyHiddenTiles();
    confetti(window.innerWidth/2,window.innerHeight/2,'#bf5fff');
    setTimeout(function(){confetti(window.innerWidth/2,window.innerHeight/2,'#ff8c42');},200);
    setTimeout(function(){confetti(window.innerWidth/2,window.innerHeight/2,'#00ff88');},400);
    showToast('\uD83D\uDD13 Soul cards unlocked');
  } else {
    // Reset tap count if no new tap within 2 seconds
    sTapTimer=setTimeout(function(){sTapCount=0;},2000);
  }
}

function revealSTracker(){
  if(sHideTimer)clearTimeout(sHideTimer);
  document.body.classList.add('s-unlocked');
  renderSMain();
  // Scroll to the s-tracker tile briefly
  var tile=document.querySelector('[data-id="s-tracker"]');
  if(tile)setTimeout(function(){tile.scrollIntoView({behavior:'smooth',block:'center'});},100);
  // Auto-hide after 3 minutes
  sHideTimer=setTimeout(function(){
    document.body.classList.remove('s-unlocked');
  },3*60*1000);
}


function tickClock(){
  var n=new Date();
  var h=n.getHours(),m=n.getMinutes(),s=n.getSeconds();
  var ts;
  if(clockMode==='12'){
    var ampm=h>=12?'PM':'AM';
    var h12=h%12||12;
    ts=pad(h12)+':'+pad(m)+':'+pad(s)+' '+ampm;
  } else {
    ts=pad(h)+':'+pad(m)+':'+pad(s);
  }
  // Animated digit slide for big-time
  var btEl=document.getElementById('big-time');
  if(btEl){
    var prevTs=btEl.dataset.prevTs||'';
    if(prevTs!==ts){
      var html2='';
      for(var ci=0;ci<ts.length;ci++){
        var ch=ts[ci];
        var prevCh=prevTs[ci]||'';
        if(ch!==prevCh&&ch>='0'&&ch<='9'){
          var dir=(!prevCh||ch>prevCh)?'digit-up':'digit-down';
          html2+='<span class="digit-slide-'+dir+'">'+ch+'</span>';
        } else {
          html2+=ch;
        }
      }
      btEl.innerHTML=html2;
      btEl.dataset.prevTs=ts;
    }
  }
  document.getElementById('top-clock').textContent=(clockMode==='12'?(pad(h%12||12)+':'+pad(m)+' '+(h>=12?'PM':'AM')):pad(h)+':'+pad(m)+':'+pad(s));
  document.getElementById('big-date').textContent=DAYS[n.getDay()].toUpperCase()+', '+MONTHS[n.getMonth()].toUpperCase()+' '+n.getDate()+', '+n.getFullYear();
  document.getElementById('big-hijri').textContent=hijri(n);
  document.getElementById('big-moon').textContent=moonEmoji(n);
}
document.getElementById('clock-mode-badge').textContent=clockMode+'H';
setInterval(tickClock,1000);
tickClock();

var prayers=null;
var PNAMES=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];
var futurePrayers={};
function loadPrayer(){
  var n=new Date();
  var todayStr=pad(n.getDate())+'-'+pad(n.getMonth()+1)+'-'+n.getFullYear();
  var _pzip=getPrayerZip();
  var url='https://api.aladhan.com/v1/timingsByAddress/'+todayStr+'?address='+encodeURIComponent(_pzip+',US')+'&method=2';
  fetch(url).then(function(r){return r.json();}).then(function(j){
    if(j.code===200){
      prayers=j.data.timings;
      renderPrayer();
      loadFuturePrayers(n);
    }
  }).catch(function(){});
}
function loadFuturePrayers(baseDate){
  var fetched=0;
  for(var d=1;d<=7;d++){
    (function(offset){
      var fd=new Date(baseDate);
      fd.setDate(fd.getDate()+offset);
      var ds=pad(fd.getDate())+'-'+pad(fd.getMonth()+1)+'-'+fd.getFullYear();
      var key=localDateStr(fd);
      fetch('https://api.aladhan.com/v1/timingsByAddress/'+ds+'?address='+encodeURIComponent(getPrayerZip()+',US')+'&method=2')
        .then(function(r){return r.json();})
        .then(function(j){
          if(j.code===200){futurePrayers[key]=j.data.timings;}
          fetched++;
          if(fetched===7)renderPrayer();
        }).catch(function(){fetched++;});
    })(d);
  }
}
function pMins(t){var p=t.replace(/\s.*/,'').split(':').map(Number);return p[0]*60+p[1];}
function getPrayerTrend(pname){
  if(!prayers||!prayers[pname])return null;
  var fd=new Date();fd.setDate(fd.getDate()+7);
  var fk=localDateStr(fd);
  if(!futurePrayers[fk]||!futurePrayers[fk][pname])return null;
  var futureTime=futurePrayers[fk][pname];
  var diff=Math.round(pMins(futureTime)-pMins(prayers[pname]));
  return{time:fmt12(futureTime),diff:diff};
}
function currentPrayer(){
  if(!prayers)return null;
  var nm=new Date().getHours()*60+new Date().getMinutes();
  var cur='Isha';
  for(var i=0;i<PNAMES.length;i++){if(nm<pMins(prayers[PNAMES[i]])){cur=i===0?'Isha':PNAMES[i-1];break;}}
  return cur;
}
function nextPrayer(){
  if(!prayers)return null;
  var nm=new Date().getHours()*60+new Date().getMinutes();
  for(var i=0;i<PNAMES.length;i++){if(nm<pMins(prayers[PNAMES[i]]))return{name:PNAMES[i],time:prayers[PNAMES[i]]};}
  return{name:'Fajr',time:prayers['Fajr']};
}
function minsUntil(timeStr){
  var n=new Date();
  var nm=n.getHours()*60+n.getMinutes()+n.getSeconds()/60;
  var pm=pMins(timeStr);
  var diff=pm-nm;
  if(diff<0)diff+=1440; // next day
  return diff;
}
function fmtCountdown(minsFrac){
  var totalSec=Math.round(minsFrac*60);
  var h=Math.floor(totalSec/3600);
  var m=Math.floor((totalSec%3600)/60);
  var s=totalSec%60;
  if(h>0)return h+'h '+pad(m)+'m';
  return pad(m)+'m '+pad(s)+'s';
}
function updatePrayerCountdown(){
  if(!prayers)return;
  var nxt=nextPrayer();
  var badge=document.getElementById('nbadge');
  var countdown=document.getElementById('prayer-countdown');
  if(!nxt||!badge||!countdown)return;
  badge.textContent=nxt.name.toUpperCase();
  countdown.textContent=fmtCountdown(minsUntil(nxt.time));
}
function renderForbiddenTimes(){
  var el=document.getElementById('forbidden-times-panel');
  if(!el||!prayers||!prayers.Sunrise||!prayers.Maghrib)return;
  var _sr=pMins(prayers.Sunrise);
  var _mg=pMins(prayers.Maghrib);
  var _dh=prayers.Dhuhr?pMins(prayers.Dhuhr):0;
  var _now=new Date();var _nm=_now.getHours()*60+_now.getMinutes();
  var _forbiddenNow=false;var _forbiddenLabel='';
  if(_nm>=_sr-2&&_nm<=_sr+12){_forbiddenNow=true;_forbiddenLabel='⚠ Sunrise — do not pray now';}
  else if(_dh&&_nm>=_dh-12&&_nm<_dh){_forbiddenNow=true;_forbiddenLabel='⚠ Sun at zenith — do not pray now';}
  else if(_nm>=_mg-12&&_nm<_mg){_forbiddenNow=true;_forbiddenLabel='⚠ Sunset — do not pray now';}
  var h='<div style="margin-top:10px;padding:8px 10px;background:rgba(255,68,68,.05);border:1px solid rgba(255,68,68,.15)">';
  h+='<div style="font-size:var(--t-xs);color:rgba(255,68,68,.6);letter-spacing:1px;margin-bottom:5px">🚫 FORBIDDEN TIMES</div>';
  h+='<div style="display:flex;justify-content:space-between;font-size:var(--t-sm);color:var(--c-dim);margin-bottom:2px"><span>Sunrise</span><span>'+fmt12(prayers.Sunrise)+' + 12 min</span></div>';
  if(prayers.Dhuhr)h+='<div style="display:flex;justify-content:space-between;font-size:var(--t-sm);color:var(--c-dim);margin-bottom:2px"><span>Zenith (before Dhuhr)</span><span>12 min before '+fmt12(prayers.Dhuhr)+'</span></div>';
  h+='<div style="display:flex;justify-content:space-between;font-size:var(--t-sm);color:var(--c-dim)'
    +((_nm>=_mg-12&&_nm<_mg)?';color:rgba(255,68,68,.8)':'')+'"><span>Sunset (before Maghrib)</span><span>12 min before '+fmt12(prayers.Maghrib)+'</span></div>';
  if(_forbiddenNow)h+='<div style="margin-top:5px;font-size:var(--t-sm);color:rgba(255,68,68,.9);font-weight:bold">'+_forbiddenLabel+'</div>';
  h+='</div>';
  el.innerHTML=h;
}

function renderPrayer(){
  if(!prayers)return;
  var cur=currentPrayer(),nxt=nextPrayer();
  updatePrayerCountdown();
  var h='';
  for(var i=0;i<PNAMES.length;i++){
    var p=PNAMES[i],a=(p===cur);
    var tr=getPrayerTrend(p),tl='--',tStyle='color:rgba(134,155,171,.4)';
    if(tr!==null){
      tl=tr.time;
      var diff=tr.diff;
      if(diff<-2){
        var ins=Math.min(1,Math.abs(diff)/30);
        tStyle='color:rgb('+Math.round(160+ins*60)+','+Math.round(80+ins*20)+',220)';
      } else if(diff>2){
        var ins=Math.min(1,diff/30);
        tStyle='color:rgb('+Math.round(40)+','+Math.round(180+ins*40)+','+Math.round(100-ins*40)+')';
      } else {
        tStyle='color:rgba(134,155,171,.7)';
      }
    }
    h+='<div class="prayer-row'+(a?' now':'')+'"><span class="pname">'+p.toUpperCase()+'</span><span class="ptime">'+fmt12(prayers[p])+'</span><span class="ptrend" style="'+tStyle+'">'+tl+'</span></div>';
  }
  document.getElementById('plist').innerHTML=h;
  renderForbiddenTimes();
}
loadPrayer();
setInterval(renderPrayer,60000);
setInterval(updatePrayerCountdown,1000);

var wx=null;
var WMO={0:'Clear',1:'Mainly Clear',2:'Partly Cloudy',3:'Overcast',45:'Fog',51:'Lt Drizzle',53:'Drizzle',55:'Hvy Drizzle',61:'Lt Rain',63:'Rain',65:'Hvy Rain',71:'Lt Snow',73:'Snow',75:'Hvy Snow',77:'Snow Grains',80:'Showers',81:'Hvy Showers',82:'Violent Showers',85:'Snow Showers',86:'Hvy Snow Showers',95:'Thunderstorm',99:'Hail Storm'};
var WICO={'0':'\u2600\uFE0F','1':'\uD83C\uDF24\uFE0F','2':'\u26C5','3':'\u2601\uFE0F','45':'\uD83C\uDF2B\uFE0F','51':'\uD83C\uDF26\uFE0F','53':'\uD83C\uDF27\uFE0F','55':'\uD83C\uDF27\uFE0F','61':'\uD83C\uDF26\uFE0F','63':'\uD83C\uDF27\uFE0F','65':'\uD83C\uDF27\uFE0F','71':'\uD83C\uDF28\uFE0F','73':'\u2744\uFE0F','75':'\u2744\uFE0F','77':'\u2744\uFE0F','80':'\uD83C\uDF27\uFE0F','81':'\uD83C\uDF27\uFE0F','82':'\u26C8\uFE0F','85':'\uD83C\uDF28\uFE0F','86':'\uD83C\uDF28\uFE0F','95':'\u26C8\uFE0F','99':'\u26C8\uFE0F'};
function loadWeather(){
  var _wc=getHomeCoords();
  var url='https://api.open-meteo.com/v1/forecast?latitude='+_wc.lat+'&longitude='+_wc.lng+'&current_weather=true&hourly=relativehumidity_2m,apparent_temperature,precipitation,snowfall,precipitation_probability,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=4';
  fetch(url).then(function(r){return r.json();}).then(function(data){wx=data;renderWeather();}).catch(function(){document.getElementById('wdesc').textContent='Failed to load';document.getElementById('wbadge').textContent='ERROR';});
}

function renderHourlyRain(hrData){
  var el=document.getElementById('walert2');
  if(!el||!hrData)return;
  var now=new Date();
  var todayStr=localDateStr(now);
  var tomorrowStr=localDateStr(new Date(now.getTime()+864e5));
  var rainHours=[];

  // Scan next 48 hours for rain/snow
  for(var i=0;i<Math.min(hrData.time.length,48);i++){
    var t=hrData.time[i];
    var dayStr=t.slice(0,10);
    if(dayStr!==todayStr&&dayStr!==tomorrowStr)continue;
    var h=parseInt(t.slice(11,13));
    var curHour=now.getHours();
    // Skip past hours for today
    if(dayStr===todayStr&&h<curHour)continue;
    var precip=hrData.precipitation[i]||0;
    var snow=hrData.snowfall[i]||0;
    var prob=hrData.precipitation_probability?hrData.precipitation_probability[i]||0:0;
    if(precip>0.01||snow>0.01||prob>=40){
      var ampm=h<12?'AM':'PM';
      var h12=h===0?12:h>12?h-12:h;
      rainHours.push({
        label:(dayStr===todayStr?'Today ':'Tomorrow ')+h12+ampm,
        precip:precip,snow:snow,prob:prob,
        isSnow:snow>precip
      });
    }
  }

  if(!rainHours.length){
    el.innerHTML='<div style="font-size:var(--t-sm);color:var(--cg);margin-top:4px;letter-spacing:.5px">&#9729; No rain in next 48h</div>';
    return;
  }

  var h='<div style="font-size:var(--t-xs);letter-spacing:1.5px;color:var(--dim);margin-top:8px;margin-bottom:5px">RAIN SCHEDULE</div>';
  h+='<div style="display:flex;flex-direction:column;gap:3px">';
  rainHours.forEach(function(r){
    var icon=r.isSnow?'&#10052;':'&#127783;';
    var col=r.precip>0.1||r.snow>0.1?'var(--cr)':'var(--ca)';
    var detail=r.isSnow?(r.snow.toFixed(2)+'"snow'):(r.precip.toFixed(2)+'" rain');
    if(r.prob)detail+=', '+r.prob+'% chance';
    h+='<div style="display:flex;align-items:center;gap:8px;font-size:var(--t-sm)">';
    h+='<span style="color:'+col+';min-width:16px">'+icon+'</span>';
    h+='<span style="color:var(--text);min-width:88px">'+r.label+'</span>';
    h+='<span style="color:'+col+'">'+detail+'</span>';
    h+='</div>';
  });
  h+='</div>';
  el.innerHTML=h;
}

function checkDayJacket(hrData,dayStr){
  var rain=0,snow=0;
  for(var i=0;i<hrData.time.length;i++){
    if(hrData.time[i].startsWith(dayStr)){
      var h=parseInt(hrData.time[i].slice(11,13));
      if(h>=7&&h<=16){rain+=hrData.precipitation[i]||0;snow+=hrData.snowfall[i]||0;}
    }
  }
  return{rain:rain,snow:snow,needs:(rain>0.25||snow>0.1)};
}
function renderWeather(){
  if(!wx)return;
  document.getElementById('wbadge').textContent='LIVE';
  var cw=wx.current_weather,code=cw.weathercode,idx=new Date().getHours();
  var hr=wx.hourly,daily=wx.daily;
  document.getElementById('wtemp').textContent=Math.round(cw.temperature)+'\u00B0F';
  document.getElementById('wdesc').textContent=WMO[code]||'Unknown';
  document.getElementById('wicon').textContent=WICO[String(code)]||'?';
  document.getElementById('wfeels').textContent=Math.round(hr.apparent_temperature[idx])+'\u00B0';
  document.getElementById('whum').textContent=hr.relativehumidity_2m[idx]+'%';
  document.getElementById('wwind').textContent=Math.round(cw.windspeed)+'mph';
  // Per-day jacket check for next 3 days during work hours 7am-4pm
  var jacketDays=[];
  for(var d=0;d<=2;d++){
    var nd=new Date();nd.setDate(nd.getDate()+d);
    var ds=localDateStr(nd);
    var jk=checkDayJacket(hr,ds);
    if(jk.needs){
      var lbl=d===0?'Today':d===1?'Tomorrow':DAY3[nd.getDay()];
      var why=[];
      if(jk.rain>0.25)why.push(jk.rain.toFixed(2)+'"');
      if(jk.snow>0.1)why.push(jk.snow.toFixed(1)+'" snow');
      jacketDays.push({lbl:lbl,why:why.join('/')});
    }
  }
  var al=document.getElementById('walert');
  if(jacketDays.length){
    al.className='w-alert rain';
    var lines=jacketDays.map(function(x){return x.lbl+(x.why?' ('+x.why+')':'');});
    al.innerHTML='\u26A0 JACKET: '+lines.join(' &middot; ');
    renderHourlyRain(hr);
  } else {
    al.className='w-alert ok';
    al.innerHTML='\u2713 No rain/snow during work hours (7am\u20134pm) for next 3 days';
    renderHourlyRain(hr);
  }
  var fh='<div class="w-fc">';
  for(var d=1;d<=3;d++){
    var nd=new Date();nd.setDate(nd.getDate()+d);
    var rn=daily.precipitation_sum[d]||0,sn=daily.snowfall_sum[d]||0,wet=(rn>0.05||sn>0.05);
    var extra='';
    if(rn>0.05)extra+='<div class="wfd-r">\uD83C\uDF27 '+rn.toFixed(2)+'"</div>';
    if(sn>0.05)extra+='<div class="wfd-r" style="color:var(--cc)">\u2744 '+sn.toFixed(1)+'"</div>';
    fh+='<div class="wfd'+(wet?' wet':'')+'"><div class="wfd-d">'+DAY3[nd.getDay()].toUpperCase()+'</div><div class="wfd-i">'+(WICO[String(daily.weathercode[d])]||'?')+'</div><div class="wfd-h">'+Math.round(daily.temperature_2m_max[d])+'\u00B0</div><div class="wfd-l">'+Math.round(daily.temperature_2m_min[d])+'\u00B0 lo</div>'+extra+'</div>';
  }
  fh+='</div>';
  document.getElementById('wfc').innerHTML=fh;
}
loadWeather();
setInterval(loadWeather, 5*60*1000);

var STOCK_TICKERS=[
  {t:'HLAL',  lb:'Wahed Shariah ETF'},
  {t:'SPUS',  lb:'Halal S&P 500'},
  {t:'SPRE',  lb:'Halal REIT'},
  {t:'GLD',   lb:'Gold ETF'},
  {t:'SUKUK', lb:'Sukuk Bond ETF'}
];
var stocks=STOCK_TICKERS.map(function(s){return {t:s.t,lb:s.lb,p:0,ch:0,pt:0};});
var _stockLastFetch=parseInt(localStorage.getItem('dash_stock_fetch_ts')||'0');
var _stockFetchInterval=6*60*60*1000; // 6 hours = 4x daily

async function fetchStockPrice(ticker){
  try{
    var url='https://query1.finance.yahoo.com/v8/finance/chart/'+ticker+'?interval=1d&range=2d';
    var res=await fetch(url);
    if(!res.ok)return null;
    var data=await res.json();
    var result=data.chart&&data.chart.result&&data.chart.result[0];
    if(!result)return null;
    var meta=result.meta;
    var price=meta.regularMarketPrice||0;
    var prev=meta.chartPreviousClose||meta.previousClose||price;
    var change=price-prev;
    var pct=prev?((change/prev)*100):0;
    return {p:parseFloat(price.toFixed(2)),ch:parseFloat(change.toFixed(2)),pt:parseFloat(pct.toFixed(2))};
  }catch(e){return null;}
}

async function fetchAllStocks(force){
  var now=Date.now();
  if(!force&&now-_stockLastFetch<_stockFetchInterval)return; // not due yet
  var cached=lsGet('dash_stock_prices',null);
  if(!force&&cached&&cached.ts&&(now-cached.ts)<_stockFetchInterval){
    // Use cached
    STOCK_TICKERS.forEach(function(s,i){
      if(cached[s.t])Object.assign(stocks[i],cached[s.t]);
    });
    renderStocks();
    return;
  }
  // Fetch all tickers
  var results={ts:now};
  for(var i=0;i<STOCK_TICKERS.length;i++){
    var s=STOCK_TICKERS[i];
    var data=await fetchStockPrice(s.t);
    if(data){
      Object.assign(stocks[i],data);
      results[s.t]=data;
    }
  }
  lsSet('dash_stock_prices',results);
  localStorage.setItem('dash_stock_fetch_ts',String(now));
  _stockLastFetch=now;
  renderStocks();
}

// Fetch on load, then every 30 min check if 6h has passed
window.addEventListener('load',function(){
  fetchAllStocks(false);
  setInterval(function(){fetchAllStocks(false);},30*60*1000);
});
// Store daily close prices for rolling avg (keyed by YYYY-MM-DD)
var stockHist=lsGet('stockHist',{});
function seedStockHistory(){
  // Seed 15 days of simulated prior prices so avg shows immediately
  var today=new Date();
  for(var d=1;d<=15;d++){
    var dd=new Date(today);dd.setDate(dd.getDate()-d);
    var key=localDateStr(dd);
    if(!stockHist[key]){
      stockHist[key]={};
      for(var i=0;i<stocks.length;i++){
        // slight random walk backward from current price
        var variance=(Math.random()-0.5)*0.03;
        stockHist[key][stocks[i].t]=parseFloat((stocks[i].p*(1+variance*d)).toFixed(2));
      }
    }
  }
  lsSet('stockHist',stockHist);
}
if(Object.keys(stockHist).length<3)seedStockHistory();
function recordStockPrices(){
  var key=localDateStr();
  if(!stockHist[key])stockHist[key]={};
  for(var i=0;i<stocks.length;i++)stockHist[key][stocks[i].t]=stocks[i].p;
  var keys=Object.keys(stockHist).sort();
  while(keys.length>20){delete stockHist[keys.shift()];}
  lsSet('stockHist',stockHist);
}
function get15DayAvg(ticker){
  var keys=Object.keys(stockHist).sort();
  var today=localDateStr();
  var vals=[];
  for(var i=0;i<keys.length;i++){
    if(keys[i]!==today&&stockHist[keys[i]][ticker]!=null)vals.push(Number(stockHist[keys[i]][ticker]));
  }
  if(!vals.length)return null;
  var recent=vals.slice(-15);
  return recent.reduce(function(a,b){return a+b;},0)/recent.length;
}
function mktOpen(){var n=new Date(),d=n.getDay(),m=n.getHours()*60+n.getMinutes();return d>0&&d<6&&m>=570&&m<960;}
function renderStocks(){
  document.getElementById('mkbadge').textContent=mktOpen()?'LIVE':'CLOSED';
  recordStockPrices();
  var h='';
  for(var i=0;i<stocks.length;i++){
    var s=stocks[i];
    var avg=get15DayAvg(s.t);
    var avgStr='--',avgCls='cdm',avgDiff='';
    if(avg!==null){
      var diff=s.p-avg;
      avgStr='$'+avg.toFixed(2);
      avgCls=diff>=0?'sup':'sdn';
      avgDiff=(diff>=0?'+':'')+diff.toFixed(2);
    }
    h+='<div class="sr">'
      +'<div><div class="st">'+s.t+'</div><div class="dim-10">'+s.lb+'</div></div>'
      +'<div style="text-align:right"><div class="sp">$'+s.p.toFixed(2)+'</div>'
      +'<div class="sc '+(s.ch>=0?'sup':'sdn')+'">'+( s.ch>=0?'+':'')+s.ch.toFixed(2)+'</div></div>'
      +'<div style="text-align:right;margin-left:10px;min-width:52px"><div class="dim-9-ls">15D AVG</div>'
      +'<div style="font-family:monospace;font-size:var(--t-body);color:var(--dim)">'+avgStr+'</div>'
      +(avg!==null?'<div style="font-size:var(--t-sm)" class="sc '+avgCls+'">'+avgDiff+'</div>':'')
      +'</div>'
      +'</div>';
  }
  // Last updated time
  var _lu=parseInt(localStorage.getItem('dash_stock_fetch_ts')||'0');
  var _luStr=_lu?'Updated '+new Date(_lu).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'Fetching...';
  var _nextFetch=_lu?Math.max(0,Math.round((_lu+6*60*60*1000-Date.now())/60000)):0;
  var _nextStr=_nextFetch>0?(' · next in '+_nextFetch+'m'):''
  h='<div class="dim-9" style="margin-bottom:8px">'+_luStr+_nextStr+'</div>'+h;
  document.getElementById('slist').innerHTML=h;
}
renderStocks();

var SYNC_DEVICE_KEY='dash_sync_device_id';
function syncNowIso(){return new Date().toISOString();}
function syncTsMs(v){
  if(v===undefined||v===null||v===0||v==='')return 0;
  if(typeof v==='number')return v;
  var n=Date.parse(v);
  return isNaN(n)?0:n;
}
function getSyncDeviceId(){
  var id=localStorage.getItem(SYNC_DEVICE_KEY)||'';
  if(!id){
    id='dev-'+Math.random().toString(36).slice(2,8)+'-'+Date.now().toString(36);
    localStorage.setItem(SYNC_DEVICE_KEY,id);
  }
  return id;
}

// ══════════════════════════════════════════
// BUTTON LOG SYSTEM
// ══════════════════════════════════════════
var BL_KEY = 'dash_button_log';
var BL_MAX_LOCAL = 500; // keep last 500 events locally

function blGetCardFromEl(el){
  // Walk up DOM to find parent tile data-id
  var node = el;
  for(var i=0;i<12;i++){
    if(!node) break;
    if(node.dataset && node.dataset.id) return node.dataset.id;
    // Check data-id attribute
    var did = node.getAttribute && node.getAttribute('data-id');
    if(did) return did;
    node = node.parentElement;
  }
  return 'unknown';
}

function blLog(type, card, action, detail){
  if(card==='button-log')return; // don't log the log card itself
  var now = Date.now();
  var d = new Date(now);
  var entry = {
    ts: now,
    dow: d.getDay(),
    hour: d.getHours(),
    type: type,         // 'view' | 'action'
    card: card || 'unknown',
    action: action || '',
    detail: detail || '',
    device: getSyncDeviceId()
  };
  var log = lsGet(BL_KEY, []);
  log.push(entry);
  // Keep only last BL_MAX_LOCAL
  if(log.length > BL_MAX_LOCAL) log = log.slice(-BL_MAX_LOCAL);
  lsSet(BL_KEY, log);
}

function blGetUnsynced(){
  return lsGet(BL_KEY, []).filter(function(e){ return !e._synced; });
}

function blMarkSynced(ts_list){
  var log = lsGet(BL_KEY, []);
  var tsSet = {};
  ts_list.forEach(function(ts){ tsSet[ts]=true; });
  log.forEach(function(e){ if(tsSet[e.ts]) e._synced=true; });
  lsSet(BL_KEY, log);
}

function blPrune(){
  // Keep: unsynced events (any age) + synced events from last 48 hours
  var cutoff = Date.now() - 48*60*60*1000;
  var log = lsGet(BL_KEY, []);
  var before = log.length;
  log = log.filter(function(e){
    return !e._synced || e.ts > cutoff;
  });
  lsSet(BL_KEY, log);
  if(log.length < before) console.log('[BL] Pruned '+(before-log.length)+' old synced events');
}

async function blPushToSupabase(){
  var cfg = sbGetConfig();
  if(!cfg.url||!cfg.key||!cfg.account) return;
  var unsync = blGetUnsynced();
  if(!unsync.length) return;
  try{
    var rows = unsync.map(function(e){
      return {
        user_id: cfg.account,
        ts: e.ts,
        dow: e.dow,
        hour: e.hour,
        type: e.type,
        card: e.card,
        action: e.action,
        detail: e.detail,
        device_id: e.device
      };
    });
    var endpoint = cfg.url.replace(/\/+$/,'')+'/rest/v1/button_log';
    var res = await fetch(endpoint,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':cfg.key,
        'Authorization':'Bearer '+cfg.key,
        'Prefer':'return=minimal'
      },
      body: JSON.stringify(rows)
    });
    if(res.ok||res.status===201){
      blMarkSynced(unsync.map(function(e){return e.ts;}));
      blPrune(); // clean up old synced events
      console.log('[BL] Pushed '+rows.length+' events to Supabase');
    }
  }catch(e){
    console.warn('[BL] Push failed:',e.message);
  }
}
// ══════════════════════════════════════════
function itemEffectiveMs(it){
  if(!it||typeof it!=='object')return 0;
  return Math.max(
    syncTsMs(it.updatedAt),
    syncTsMs(it.deletedAt),
    syncTsMs(it.doneAt),
    syncTsMs(it.created),
    syncTsMs(it.id)
  );
}
function isDateKey(k){return typeof k==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(k);}
function normalizeTodoItem(raw){
  if(!raw||typeof raw!=='object')return null;
  var t=Object.assign({},raw);
  if(t.id===undefined||t.id===null)t.id=Date.now()+Math.floor(Math.random()*1000);
  t.text=String(t.text||'').trim();
  t.done=!!t.done;
  t.doneAt=t.doneAt||0;
  t.created=t.created||((typeof t.id==='number'&&t.id>0)?t.id:Date.now());
  t.deletedAt=t.deletedAt||0;
  if(!t.updatedAt){
    var base=t.deletedAt||t.doneAt||t.created||Date.now();
    t.updatedAt=new Date(base).toISOString();
  }
  return t;
}
function normalizeNoteItem(raw){
  if(!raw||typeof raw!=='object')return null;
  var n=Object.assign({},raw);
  if(n.id===undefined||n.id===null)n.id=Date.now()+Math.floor(Math.random()*1000);
  n.text=String(n.text||'').trim();
  n.done=!!n.done;
  n.doneAt=n.doneAt||0;
  n.deletedAt=n.deletedAt||0;
  n.created=n.created||((typeof n.id==='number'&&n.id>0)?n.id:Date.now());
  if(!n.ts){
    var d=new Date(n.created||Date.now());
    var _hr=d.getHours(),_mn=d.getMinutes();
    var _ampm=_hr>=12?'PM':'AM';
    var _hr12=_hr%12||12;
    var _months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var _days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    n.ts=_days[d.getDay()]+', '+_months[d.getMonth()]+' '+d.getDate()+' · '+_hr12+':'+(pad(_mn))+' '+_ampm;
  }
  if(!n.updatedAt){
    var base=n.deletedAt||n.doneAt||n.created||Date.now();
    n.updatedAt=new Date(base).toISOString();
  }
  return n;
}
function chooseNewestItem(a,b){
  if(!a)return b;
  if(!b)return a;
  var am=itemEffectiveMs(a),bm=itemEffectiveMs(b);
  if(bm>am)return b;
  if(am>bm)return a;
  if((b.deletedAt||0)>(a.deletedAt||0))return b;
  return a;
}
function mergeItemArrays(localArr,remoteArr,normalizer){
  var map=new Map();
  var localOrder=[];
  (Array.isArray(localArr)?localArr:[]).forEach(function(it){
    var n=normalizer(it); if(!n)return;
    var id=String(n.id);
    if(!map.has(id))localOrder.push(id);
    map.set(id,chooseNewestItem(map.get(id),n));
  });
  var remoteOnly=[];
  (Array.isArray(remoteArr)?remoteArr:[]).forEach(function(it){
    var n=normalizer(it); if(!n)return;
    var id=String(n.id);
    if(!map.has(id))remoteOnly.push(id);
    map.set(id,chooseNewestItem(map.get(id),n));
  });
  remoteOnly.sort(function(a,b){return itemEffectiveMs(map.get(b))-itemEffectiveMs(map.get(a));});
  var finalIds=localOrder.concat(remoteOnly);
  return finalIds.map(function(id){return map.get(id);}).filter(Boolean);
}
function mergePtData(localPt,remotePt){
  var a=localPt&&typeof localPt==='object'?localPt:{};
  var b=remotePt&&typeof remotePt==='object'?remotePt:{};
  var out={};
  // Union of all date keys from both sides
  var keySet={};
  Object.keys(a).concat(Object.keys(b)).forEach(function(k){keySet[k]=1;});
  Object.keys(keySet).forEach(function(k){
    if(!isDateKey(k))return;
    var av=a[k]&&typeof a[k]==='object'?a[k]:null;
    var bv=b[k]&&typeof b[k]==='object'?b[k]:null;
    // If only one side has data, take it
    if(!av&&bv){out[k]=Object.assign({},bv);return;}
    if(av&&!bv){out[k]=Object.assign({},av);return;}
    if(!av&&!bv)return;
    // Both have data — pick by _updatedAt if available, otherwise merge fields
    var at=syncTsMs(av._updatedAt);
    var bt=syncTsMs(bv._updatedAt);
    if(at>0||bt>0){
      // At least one has a real timestamp — pick the newer one
      out[k]=Object.assign({},bt>=at?bv:av);
    } else {
      // Neither has timestamp — union all fields, remote wins conflicts
      out[k]=Object.assign({},av,bv);
    }
  });
  return out;
}
function mergeSnapshots(localSnap,remoteSnap){
  var local=localSnap&&typeof localSnap==='object'?localSnap:{};
  var remote=remoteSnap&&typeof remoteSnap==='object'?remoteSnap:{};
  var localTs=syncTsMs(local.ts),remoteTs=syncTsMs(remote.ts);
  var base=(remoteTs>=localTs)?remote:local;
  var merged=Object.assign({},base);
  merged.version=Math.max(Number(local.version)||0,Number(remote.version)||0,3);
  merged.ts=syncNowIso();
  merged.syncMeta={deviceId:getSyncDeviceId(),mergedAt:merged.ts};

  //  Item arrays with IDs: proper item-level merge 
  merged.todos=mergeItemArrays(local.todos,remote.todos,normalizeTodoItem);
  merged.notes=mergeItemArrays(local.notes,remote.notes,normalizeNoteItem);

  //  Date-keyed objects: union of all dates, prefer newer per date 
  merged.ptData=mergePtData(local.ptData,remote.ptData);
  merged.qtData=mergeDateKeyed(local.qtData,remote.qtData);
  merged.jmData=mergeDateKeyed(local.jmData,remote.jmData);

  //  pomoHistLog: merge by date key 
  merged.pomoHistLog=mergePomoHistLog(local.pomoHistLog,remote.pomoHistLog);

  //  Append-only arrays (decisions, reviews, mood): union by unique key, no deletions 
  merged.dlData=mergeById(local.dlData,remote.dlData,'id');
  merged.wrData=mergeById(local.wrData,remote.wrData,'week');
  merged.mlData=mergeById(local.mlData,remote.mlData,'id'); // mood has multiple entries/day, must merge by id not date

  //  Weekly routines: take whichever has more items OR is newer 
  merged.wmData=mergeWmData(local.wmData,remote.wmData);

  //  Everything else: always take the UNION — newer wins per field 
  // These are either live-fetch (weather/stocks) or single-device configs
  // For user data blobs with no ID scheme, take local if local is newer, remote if remote is newer
  // But ALWAYS ensure both devices get all keys — never drop a key that exists on either side
  var alwaysUnionKeys=['schedule','books','bmarks','meals','birthdays','goalsData',
    'islamicState','wdState','wwData','sLog','prayerHist','seasonTraditions',
    'qcState','stockHist','pomoDayData','sSettings','sSettingsRaw', // mlData uses mergeById('id') below
    'tileOrder','hiddenTiles','clockMode','pinsData','zipCfg','sbCfg'];
  alwaysUnionKeys.forEach(function(k){
    // If one side has data and the other doesn't, always take the one that has data
    if(local[k]!==undefined&&remote[k]===undefined)merged[k]=local[k];
    else if(remote[k]!==undefined&&local[k]===undefined)merged[k]=remote[k];
    // If both have data, already set by base (newer timestamp wins) — keep that
  });

  return merged;
}

function mergeDateKeyed(a,b){
  // Merge two objects keyed by date strings — union of keys
  var out={};
  var la=a&&typeof a==='object'?a:{};
  var lb=b&&typeof b==='object'?b:{};
  Object.keys(la).forEach(function(k){out[k]=la[k];});
  Object.keys(lb).forEach(function(k){if(out[k]===undefined)out[k]=lb[k];});
  return out;
}

function mergePomoHistLog(a,b){
  // Union all sessions from both devices for each day
  var out={};
  var la=a&&typeof a==='object'?a:{};
  var lb=b&&typeof b==='object'?b:{};
  var allDates={};
  Object.keys(la).forEach(function(d){allDates[d]=1;});
  Object.keys(lb).forEach(function(d){allDates[d]=1;});
  Object.keys(allDates).forEach(function(d){
    var al=Array.isArray(la[d])?la[d]:[];
    var bl=Array.isArray(lb[d])?lb[d]:[];
    if(!al.length){out[d]=bl;return;}
    if(!bl.length){out[d]=al;return;}
    // Union by ts timestamp — dedupe sessions that appear on both
    var seen={};
    var merged=[];
    al.concat(bl).forEach(function(e){
      var key=e.ts||(e.type+':'+(e.mins||0));
      if(!seen[key]){seen[key]=1;merged.push(e);}
    });
    // Sort by ts ascending
    merged.sort(function(x,y){return (x.ts||'')>(y.ts||'')?1:-1;});
    out[d]=merged;
  });
  return out;
}

function mergeById(a,b,idKey){
  // Union of two arrays, deduped by idKey, prefer entry with newer ts if duplicate
  var la=Array.isArray(a)?a:[];
  var lb=Array.isArray(b)?b:[];
  var map={};
  la.forEach(function(e){if(e&&e[idKey]!==undefined)map[String(e[idKey])]=e;});
  lb.forEach(function(e){
    if(!e||e[idKey]===undefined)return;
    var k=String(e[idKey]);
    if(!map[k]){map[k]=e;}
    else{
      var existing=map[k];
      var eTs=e.ts||e.week||'';
      var exTs=existing.ts||existing.week||'';
      // For decision log: union the outcomes arrays from both sides
      if(e.outcomes||existing.outcomes){
        var outA=Array.isArray(existing.outcomes)?existing.outcomes:[];
        var outB=Array.isArray(e.outcomes)?e.outcomes:[];
        var outMap={};
        outA.concat(outB).forEach(function(o){
          var ok=String(o.ts||o.id||o.text||JSON.stringify(o));
          if(!outMap[ok])outMap[ok]=o;
        });
        var mergedOuts=Object.values(outMap).sort(function(x,y){return (x.ts||'')>(y.ts||'')?1:-1;});
        // Keep the base entry from whichever side has newer ts, then attach merged outcomes
        var base=eTs>exTs?e:existing;
        map[k]=Object.assign({},base,{outcomes:mergedOuts});
      } else {
        // Non-decision: prefer newer ts
        if(eTs>exTs)map[k]=e;
      }
    }
  });
  return Object.values(map).sort(function(a,b){
    return (b.ts||b.week||'')>(a.ts||a.week||'')?1:-1;
  });
}

function mergeWmData(a,b){
  var la=a&&typeof a==='object'?a:{weekKey:null,items:[],deleted:[]};
  var lb=b&&typeof b==='object'?b:{weekKey:null,items:[],deleted:[]};
  var ai=Array.isArray(la.items)?la.items:[];
  var bi=Array.isArray(lb.items)?lb.items:[];

  // Merge tombstones — union of both deleted lists, keep last 33
  var delA=Array.isArray(la.deleted)?la.deleted:[];
  var delB=Array.isArray(lb.deleted)?lb.deleted:[];
  var delMap={};
  delA.forEach(function(d){delMap[d.id||d.text]={id:d.id||d.text,ts:d.ts};});
  delB.forEach(function(d){
    var k=d.id||d.text;
    if(!delMap[k]||d.ts>delMap[k].ts)delMap[k]={id:k,ts:d.ts};
  });
  var deleted=Object.values(delMap).sort(function(a,b){return b.ts-a.ts;}).slice(0,33);
  var deletedIds=new Set(deleted.map(function(d){return d.id;}));

  // Union of items by id — filter out anything in tombstones
  var map={};
  ai.forEach(function(it){
    if(!it||!it.text)return;
    var k=it.id||it.text.toLowerCase();
    if(!deletedIds.has(k)&&!deletedIds.has(it.text.toLowerCase()))map[k]=it;
  });
  bi.forEach(function(it){
    if(!it||!it.text)return;
    var k=it.id||it.text.toLowerCase();
    if(deletedIds.has(k)||deletedIds.has(it.text.toLowerCase()))return;
    if(!map[k])map[k]=it;
    else if(it.done&&!map[k].done)map[k]=Object.assign({},map[k],{done:true});
  });
  var items=Object.values(map);
  var weekKey=(la.weekKey>lb.weekKey)?la.weekKey:lb.weekKey;
  // Merge logs
  var logA=Array.isArray(la.log)?la.log:[];
  var logB=Array.isArray(lb.log)?lb.log:[];
  var logMap={};
  logA.concat(logB).forEach(function(l){if(l&&l.week)logMap[l.week]=l;});
  var log=Object.values(logMap).sort(function(a,b){return b.week<a.week?-1:1;}).slice(0,52);
  return {weekKey:weekKey,items:items,deleted:deleted,log:log};
}

var todos=mergeItemArrays(lsGet('dash_todos',[]),[],normalizeTodoItem);
function saveTodos(){lsSet('dash_todos',todos);}
saveTodos();

// ── Tab slide utility ──
function _tabSlide(panels, fromId, toId, fromIdx, toIdx){
  var dir=toIdx>fromIdx?'left':'right';
  var enterDir=dir==='left'?'right':'left';
  var oldEl=document.getElementById(fromId);
  var newEl=document.getElementById(toId);
  if(!oldEl||!newEl||oldEl===newEl){
    if(newEl)newEl.style.display='';
    return;
  }
  oldEl.style.transition='opacity .2s ease,transform .2s ease';
  oldEl.style.opacity='0';
  oldEl.style.transform='translateX('+(dir==='left'?'-16px':'16px')+')';
  setTimeout(function(){
    oldEl.style.display='none';
    oldEl.style.transition='';
    oldEl.style.opacity='';
    oldEl.style.transform='';
    newEl.style.display='';
    newEl.style.opacity='0';
    newEl.style.transform='translateX('+(enterDir==='left'?'-16px':'16px')+')';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        newEl.style.transition='opacity .2s ease,transform .2s ease';
        newEl.style.opacity='';
        newEl.style.transform='';
        setTimeout(function(){newEl.style.transition='';},220);
      });
    });
  },180);
}

var todoTab=localStorage.getItem('dash_todo_tab')||'main';
var _todoTabPrev='main';
function todoSwitchTab(tab,skipSave){
  var prev=_todoTabPrev;
  todoTab=(tab==='done')?'done':'main';
  _todoTabPrev=todoTab;
  if(!skipSave)localStorage.setItem('dash_todo_tab',todoTab);
  var mainTab=document.getElementById('td-tab-main');
  var doneTab=document.getElementById('td-tab-done');
  var isMain=todoTab==='main';
  if(mainTab){mainTab.style.color=isMain?'var(--cp)':'var(--dim)';mainTab.style.borderColor=isMain?'var(--cp)':'var(--dim)';}
  if(doneTab){doneTab.style.color=!isMain?'var(--cp)':'var(--dim)';doneTab.style.borderColor=!isMain?'var(--cp)':'var(--dim)';}
  var order=['main','done'];
  _tabSlide(order, 'td-'+(prev==='main'?'main':'done')+'-panel', 'td-'+(isMain?'main':'done')+'-panel', order.indexOf(prev), order.indexOf(todoTab));
}

function todoToggleImport(){
  var panel=document.getElementById('td-import-panel');
  var btn=document.getElementById('td-import-toggle');
  var open=panel&&panel.style.display==='none';
  if(panel)panel.style.display=open?'':'none';
  if(btn){
    btn.style.color=open?'var(--cp)':'var(--dim)';
    btn.style.borderColor=open?'var(--cp)':'var(--dim)';
  }
  if(open){
    setTimeout(function(){
      var ta=document.getElementById('td-import-inp');
      if(ta)ta.focus();
    },50);
  } else {
    var ta=document.getElementById('td-import-inp');
    if(ta)ta.value='';
    var st=document.getElementById('td-import-status');
    if(st)st.textContent='';
  }
}

function todoImport(){
  var ta=document.getElementById('td-import-inp');
  var st=document.getElementById('td-import-status');
  if(!ta)return;
  var raw=ta.value.trim();
  if(!raw){
    if(st){st.textContent='Paste some tasks first.';st.style.color='var(--cr)';}
    return;
  }

  // Parse /// delimited format
  var tasks=raw.split('///').map(function(t){return t.trim();}).filter(function(t){return t.length>0;});
  if(!tasks.length){
    if(st){st.style.color='var(--cr)';st.textContent='No tasks found. Use task one///task two///task three format.';}
    return;
  }
  if(!tasks.length){
    if(st){st.style.color='var(--cr)';st.textContent='Tasks were empty after parsing.';}
    return;
  }

  // Add all tasks (prepend in reverse so order is preserved at top)
  var now=Date.now();
  tasks.slice().reverse().forEach(function(txt,i){
    todos.unshift({
      id:now+i,
      text:txt.trim()==='---'?'---':txt, // preserve --- as section divider
      done:false,
      created:now+i,
      doneAt:0,
      deletedAt:0,
      updatedAt:syncNowIso(),
      _deviceId:getSyncDeviceId()
    });
  });
  saveTodos();
  renderTodos();

  // Feedback + close
  if(st){st.style.color='var(--cg)';st.textContent='\u2713 Loaded '+tasks.length+' task'+(tasks.length!==1?'s':'')+' successfully!';}
  ta.value='';
  setTimeout(function(){todoToggleImport();},1200);
}


var clearTodosPending=false;
function clearAllTodos(){
  var btn=document.getElementById('todo-clear-btn');
  if(!clearTodosPending){
    clearTodosPending=true;
    if(btn){btn.innerHTML='SURE?';btn.style.background='rgba(255,68,68,.12)';}
    setTimeout(function(){
      clearTodosPending=false;
      if(btn){btn.innerHTML='&#128465;';btn.style.background='';}
    },3000);
    return;
  }
  clearTodosPending=false;
  var stamp=Date.now();
  var iso=syncNowIso();
  todos.forEach(function(t){
    var n=normalizeTodoItem(t);
    if(!n||n.deletedAt)return;
    n.deletedAt=stamp;
    n.updatedAt=iso;
    n._deviceId=getSyncDeviceId();
    t.deletedAt=n.deletedAt;
    t.updatedAt=n.updatedAt;
    t._deviceId=n._deviceId;
  });
  saveTodos();renderTodos();
  if(btn){btn.innerHTML='&#10003;';btn.style.background='';setTimeout(function(){if(btn)btn.innerHTML='&#128465;';},1000);}
}

function addTodo(){
  var inp=document.getElementById('tdinp'),txt=inp.value.trim();
  if(!txt)return;
  var now=Date.now();
  todos.unshift({
    id:now,
    text:txt,
    done:false,
    created:now,
    doneAt:0,
    deletedAt:0,
    updatedAt:syncNowIso(),
    _deviceId:getSyncDeviceId()
  });
  inp.value='';
  safeHap(HAP.soft);
  saveTodos();
  renderTodos();
}
function toggleTodo(id){
  var _td=todos.find(function(x){return x.id===id;});if(_td&&_td.text==='---')return;
  var t=todos.find(function(x){return x.id===id&&!x.deletedAt;});
  if(!t)return;
  t.done=!t.done;
  if(t.done)t.doneAt=Date.now(); else t.doneAt=0;
  t.updatedAt=syncNowIso();
  t._deviceId=getSyncDeviceId();
  saveTodos();renderTodos();
  if(t.done){
    safeHap(HAP.check);
    var el=document.getElementById('tdel-'+id);
    if(el){var r=el.getBoundingClientRect();confetti(r.left,r.top,'#ff5fa0');}
    else confetti(window.innerWidth/2,300,'#ff5fa0');
  }
}
var todoDeletePending={};
function delTodo(id){
  if(!todoDeletePending[id]){
    todoDeletePending[id]=true;
    var el=document.getElementById('tdel-'+id);
    if(el){el.textContent='SURE?';el.style.background='rgba(255,68,68,.1)';}
    setTimeout(function(){
      todoDeletePending[id]=false;
      var el=document.getElementById('tdel-'+id);
      if(el){el.innerHTML='&#x2715;';el.style.background='';}
    },3000);
    return;
  }
  todoDeletePending[id]=false;
  var delEl=document.getElementById('tdel-'+id);
  if(delEl){var r=delEl.getBoundingClientRect();confetti(r.left+r.width/2,r.top,'#ff5fa0');}
  var t=todos.find(function(x){return x.id===id;});
  if(t){
    t.deletedAt=Date.now();
    t.updatedAt=syncNowIso();
    t._deviceId=getSyncDeviceId();
  }
  saveTodos();renderTodos();
}
var todoEditId=null;
var todoHoldTimer=null;
var todoDragActive=false;
var todoDraggingId=null;
var todoDragPointerId=null;
var todoSuppressTapUntil=0;
function startOfLocalDayTs(ts){
  var d=new Date(ts||Date.now());
  d.setHours(0,0,0,0);
  return d.getTime();
}
function pruneTodoDoneWindow(){
  var now=Date.now();
  var keepMs=14*24*60*60*1000;
  var keepDeletedMs=30*24*60*60*1000;
  var changed=false;
  todos=todos.filter(function(t){
    if(t&&t.deletedAt){
      if((now-t.deletedAt)>keepDeletedMs){changed=true;return false;}
      return true;
    }
    if(!t.done||!t.doneAt)return true;
    if((now-t.doneAt)>keepMs){changed=true;return false;}
    return true;
  });
  if(changed)saveTodos();
}
function todoInMainView(t){
  if(t.deletedAt)return false;
  if(!t.done)return true;
  if(!t.doneAt)return true;
  return startOfLocalDayTs(t.doneAt)===startOfLocalDayTs(Date.now());
}
function renderTodoDoneList(){
  var el=document.getElementById('td-done-list');
  if(!el)return;
  var done=todos.filter(function(t){return !t.deletedAt&&t.done&&t.doneAt;}).sort(function(a,b){return (b.doneAt||0)-(a.doneAt||0);});
  if(!done.length){el.innerHTML='<div class="done-item">No completed tasks in the last 14 days.</div>';return;}
  var h='';
  done.forEach(function(t){
    h+='<div class="done-item"><div>'+t.text+'</div><div class="done-time">'+new Date(t.doneAt).toLocaleString()+'</div></div>';
  });
  el.innerHTML=h;
}
function copyTodoDone(){
  var done=todos.filter(function(t){return !t.deletedAt&&t.done&&t.doneAt;}).sort(function(a,b){return (b.doneAt||0)-(a.doneAt||0);});
  if(!done.length){clipCopy('(no completed todos in last 14 days)','Done Todos');return;}
  var lines=done.map(function(t){return '- '+t.text+' ['+new Date(t.doneAt).toLocaleDateString()+']';});
  clipCopy(lines.join('\n'),'Done Todos');
}
function todoHoldHint(){alert('Press and hold a task, then drag it up or down.');}
function todoIndexById(id){
  for(var i=0;i<todos.length;i++)if(todos[i].id===id)return i;
  return -1;
}
function todoReorderById(dragId,targetId){
  if(dragId===targetId)return false;
  var from=todoIndexById(dragId),to=todoIndexById(targetId);
  if(from<0||to<0||from===to)return false;
  var moved=todos.splice(from,1)[0];
  todos.splice(to,0,moved);
  saveTodos();
  return true;
}
function beginTodoDrag(id){
  todoDragActive=true;
  todoDraggingId=id;
  var row=document.getElementById('ti-'+id);
  if(row)row.classList.add('dragging');
}
function endTodoDrag(){
  if(!todoDragActive)return;
  todoDragActive=false;
  todoSuppressTapUntil=Date.now()+350;
  var row=document.getElementById('ti-'+todoDraggingId);
  if(row)row.classList.remove('dragging');
  todoDraggingId=null;
}
(function initTodoDrag(){
  if(window._todoDragInit)return;
  window._todoDragInit=true;
  document.addEventListener('pointermove',function(e){
    if(!todoDragActive||todoDraggingId===null)return;
    if(todoDragPointerId!==null&&e.pointerId!==todoDragPointerId)return;
    var hit=document.elementFromPoint(e.clientX,e.clientY);
    var tgt=hit&&hit.closest?hit.closest('.ti[data-todo-id]'):null;
    if(!tgt)return;
    var targetId=Number(tgt.getAttribute('data-todo-id'));
    if(!targetId||targetId===todoDraggingId)return;
    if(todoReorderById(todoDraggingId,targetId)){
      renderTodos();
      var activeRow=document.getElementById('ti-'+todoDraggingId);
      if(activeRow)activeRow.classList.add('dragging');
    }
  },{passive:true});
  document.addEventListener('pointerup',function(e){
    if(todoDragPointerId!==null&&e.pointerId!==todoDragPointerId)return;
    clearTimeout(todoHoldTimer);
    endTodoDrag();
    todoDragPointerId=null;
  },{passive:true});
  document.addEventListener('pointercancel',function(e){
    if(todoDragPointerId!==null&&e.pointerId!==todoDragPointerId)return;
    clearTimeout(todoHoldTimer);
    endTodoDrag();
    todoDragPointerId=null;
  },{passive:true});
})();

function renderTodos(){
  pruneTodoDoneWindow();
  var el=document.getElementById('tdlist');
  if(!el)return;
  var left=todos.filter(function(t){return !t.deletedAt&&!t.done;}).length;
  document.getElementById('tdbadge').textContent=left+' left';
  var visible=todos.filter(todoInMainView);
  if(!visible.length){el.innerHTML='<div class="cdm" style="font-size:var(--t-lg);padding:8px 0">NO TASKS.</div>';renderTodoDoneList();todoSwitchTab(todoTab,true);return;}
  var now=Date.now();
  var h='';
  for(var i=0;i<visible.length;i++){
    var t=visible[i];
    var age=now-(t.created||t.id);
    var ageClass='';
    if(!t.done){
      var hrs=age/3600000;
      if(hrs>=36)ageClass=' age-heavy';
      else if(hrs>=24)ageClass=' age-medium';
      else if(hrs>=12)ageClass=' age-light';
    }
    if(t.text==='---'){
      // Section divider
      h+='<div class="ti" id="ti-'+t.id+'" data-todo-id="'+t.id+'" style="padding:4px 0;gap:4px;border:none;background:transparent;cursor:default">'
        +'<div style="flex:1;height:1px;background:rgba(255,255,255,.12);margin:4px 0"></div>'
        +'<span class="tdel" id="tdel-'+t.id+'" style="opacity:.4;font-size:var(--t-xs)">[x]</span>'
        +'</div>';
    } else if(todoEditId===t.id){
      h+='<div class="ti" style="gap:4px">'
        +'<input class="ti-edit-inp" id="tedit-'+t.id+'" value="'+t.text.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">'
        +'<button class="ti-mv" id="tedit-ok-'+t.id+'">OK</button>'
        +'<button class="ti-mv" id="tedit-cancel-'+t.id+'">&#x2715;</button>'
        +'</div>';
    } else {
      h+='<div class="ti reorder-ready'+(t.done?' done':'')+ageClass+'" id="ti-'+t.id+'" data-todo-id="'+t.id+'" style="gap:4px">'
        +'<div class="tbox" id="tbox-'+t.id+'">'+(t.done?'&#10003;':'')+'</div>'
+(function(){
  var ageDays=Math.floor((now-(t.created||t.id))/86400000);
  t._ageDays=ageDays;
  var ageCol=ageDays<=0?'':ageDays<=3?'rgba(255,180,80,.65)':ageDays<=7?'rgba(210,110,40,.75)':'rgba(180,70,20,.85)';
  var ageStr=ageDays>=1?' <span style="font-size:var(--t-xs);color:'+ageCol+'">('
  +ageDays+' day'+(ageDays===1?'':'s')+' old)</span>':'';
  return '<span class="ttx" id="ttx-'+t.id+'">'+t.text+ageStr+'</span>';
}())
        +'<button class="ti-mv" id="tedit-btn-'+t.id+'" title="Edit">&#9998;</button>'
        +'<span class="tdel" id="tdel-'+t.id+'">[x]</span>'
        +'</div>'
        +(t._ageDays>10&&!t.done?'<div style="display:flex;align-items:center;gap:8px;margin:3px 0 6px 24px;padding:6px 10px;background:rgba(180,70,20,.12);border:1px solid rgba(180,70,20,.4);border-left:3px solid rgba(180,70,20,.8)">'
          +'<span style="font-size:var(--t-xs);color:rgba(180,70,20,.9);flex:1">⚠ '+t._ageDays+' days old — finish it or cut it</span>'
          +'<span data-todo-age-del="'+t.id+'" style="font-size:var(--t-xs);color:rgba(255,68,68,.7);cursor:pointer;padding:2px 6px;border:1px solid rgba(255,68,68,.3)">DELETE</span>'
          +'<span data-todo-age-done="'+t.id+'" style="font-size:var(--t-xs);color:rgba(0,255,136,.7);cursor:pointer;padding:2px 6px;border:1px solid rgba(0,255,136,.3)">DONE</span>'
          +'</div>':'');
    }
  }
  el.innerHTML=h;
  renderTodoDoneList();
  todoSwitchTab(todoTab,true);

  // Wire age warning buttons
  el.querySelectorAll('[data-todo-age-del]').forEach(function(btn){
    btn.onclick=function(){
      var id=parseInt(this.dataset.todoAgeDel);
      todos=todos.filter(function(t){return t.id!==id;});
      safeHap(HAP.soft);
      saveTodos();renderTodos();
    };
  });
  el.querySelectorAll('[data-todo-age-done]').forEach(function(btn){
    btn.onclick=function(){
      var id=parseInt(this.dataset.todoAgeDone);
      var t=todos.find(function(t){return t.id===id;});
      if(t){t.done=true;t.doneAt=Date.now();}
      safeHap(HAP.check);
      saveTodos();renderTodos();
    };
  });
  // Wire events after render
  for(var i=0;i<visible.length;i++){
    var t=visible[i];
    if(todoEditId===t.id){
      (function(id){
        var inp=document.getElementById('tedit-'+id);
        var okBtn=document.getElementById('tedit-ok-'+id);
        var cancelBtn=document.getElementById('tedit-cancel-'+id);
        if(inp){
          inp.onkeydown=function(e){
            if(e.key==='Enter')saveTodoEdit(id);
            if(e.key==='Escape'){todoEditId=null;renderTodos();}
          };
          setTimeout(function(){inp.focus();inp.select();},20);
        }
        if(okBtn)okBtn.onclick=function(){saveTodoEdit(id);};
        if(cancelBtn)cancelBtn.onclick=function(){todoEditId=null;renderTodos();};
      })(t.id);
    } else {
      (function(id,idx){
        var isDivider=todos.find(function(x){return x.id===id;});
        isDivider=isDivider&&isDivider.text==='---';
        var box=document.getElementById('tbox-'+id);
        var ttx=document.getElementById('ttx-'+id);
        var editBtn=document.getElementById('tedit-btn-'+id);
        var delBtn=document.getElementById('tdel-'+id);
        var row=document.getElementById('ti-'+id);
        if(isDivider){
          if(delBtn)delBtn.onclick=function(e){e.stopPropagation();delTodo(id);};
          return; // no toggle, no edit for dividers
        }
        if(box)box.onclick=function(){if(Date.now()<todoSuppressTapUntil)return;toggleTodo(id);};
        if(ttx)ttx.onclick=function(){if(Date.now()<todoSuppressTapUntil)return;toggleTodo(id);};
        if(editBtn)editBtn.onclick=function(e){if(Date.now()<todoSuppressTapUntil)return;e.stopPropagation();todoEditId=id;renderTodos();};
        if(delBtn)delBtn.onclick=function(e){if(Date.now()<todoSuppressTapUntil)return;e.stopPropagation();delTodo(id);};
        if(row){
          row.onpointerdown=function(e){
            if(e.button&&e.button!==0)return;
            if(e.target.closest('.tbox')||e.target.closest('.ti-mv')||e.target.closest('.tdel'))return;
            e.preventDefault();
            todoDragPointerId=e.pointerId;
            clearTimeout(todoHoldTimer);
            todoHoldTimer=setTimeout(function(){beginTodoDrag(id);},260);
          };
          row.onpointerup=function(){clearTimeout(todoHoldTimer);};
          row.onpointercancel=function(){clearTimeout(todoHoldTimer);};
        }
      })(t.id,i);
    }
  }
}

function saveTodoEdit(id){
  var inp=document.getElementById('tedit-'+id);
  if(!inp)return;
  var txt=inp.value.trim();
  if(!txt)return;
  var t=todos.find(function(x){return x.id===id&&!x.deletedAt;});
  if(t){
    t.text=txt;
    t.updatedAt=syncNowIso();
    t._deviceId=getSyncDeviceId();
  }
  todoEditId=null;
  saveTodos();renderTodos();
}


function closeTodoReorder(){var m=document.getElementById('todo-reorder-modal');if(m)m.remove();}

function openTodoReorder(){
  // Open a simple modal showing todos with ↑↓ arrows
  var existing=document.getElementById('todo-reorder-modal');
  if(existing){existing.remove();return;}
  var modal=document.createElement('div');
  modal.id='todo-reorder-modal';
  modal.style.cssText='position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.88);display:flex;flex-direction:column;padding:0';
  var h='<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,95,160,.2)">';
  h+='<span style="font-size:var(--t-base);letter-spacing:3px;color:var(--cp)">&#8597; SORT TASKS</span>';
  h+='<button onclick="closeTodoReorder()" style="background:transparent;border:1px solid rgba(255,255,255,.2);color:var(--dim);font-size:var(--t-lg);padding:4px 12px;cursor:pointer">&#10005;</button>';
  h+='</div><div style="flex:1;overflow-y:auto;padding:8px 14px">';
  todos.forEach(function(t,i){
    h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
    h+='<span style="flex:1;font-size:var(--t-lg);color:'+(t.done?'var(--dim)':'var(--text)')+';word-break:break-word">'+(t.done?'<s>':'')+t.text+(t.done?'</s>':'')+'</span>';
    h+='<button class="ti-mv" id="tsor-up-'+i+'"'+(i===0?' disabled':'')+'>&#8593;</button>';
    h+='<button class="ti-mv" id="tsor-dn-'+i+'"'+(i===todos.length-1?' disabled':'')+'>&#8595;</button>';
    h+='</div>';
  });
  h+='</div>';
  h+='<div style="padding:12px 18px;border-top:1px solid var(--c-ghost)">';
  h+='<button onclick="closeTodoReorder()" style="background:transparent;border:1px solid var(--cp);color:var(--cp);font-family:monospace;font-size:var(--t-base);padding:8px;cursor:pointer;width:100%;letter-spacing:2px">DONE</button>';
  h+='</div>';
  modal.innerHTML=h;
  document.body.appendChild(modal);
  // Wire buttons
  todos.forEach(function(t,i){
    var up=document.getElementById('tsor-up-'+i);
    var dn=document.getElementById('tsor-dn-'+i);
    if(up)up.onclick=function(){todoMove(i,-1);modal.remove();openTodoReorder();};
    if(dn)dn.onclick=function(){todoMove(i,1);modal.remove();openTodoReorder();};
  });
}

function todoMove(idx,dir){
  var ni=idx+dir;
  if(ni<0||ni>=todos.length)return;
  var tmp=todos[idx];todos[idx]=todos[ni];todos[ni]=tmp;
  if(todos[idx]){todos[idx].updatedAt=syncNowIso();todos[idx]._deviceId=getSyncDeviceId();}
  if(todos[ni]){todos[ni].updatedAt=syncNowIso();todos[ni]._deviceId=getSyncDeviceId();}
  saveTodos();renderTodos();
}

renderTodos();

var DEF_MEALS=[{d:'MON',m:'Grilled Chicken + Rice'},{d:'TUE',m:'Pasta Bolognese'},{d:'WED',m:'Salmon + Veggies'},{d:'THU',m:'Chicken Shawarma'},{d:'FRI',m:'Pizza Night'},{d:'SAT',m:'Lamb Chops'},{d:'SUN',m:'Meal Prep Day'}];
var meals=JSON.parse(localStorage.getItem('dash_meals')||JSON.stringify(DEF_MEALS));
function saveMeals(){lsSet('dash_meals',meals);}
function todayIdx(){var d=new Date().getDay();return d===0?6:d-1;}
function renderMeals(){
  var ti=todayIdx(),h='';
  for(var i=0;i<meals.length;i++){var m=meals[i];h+='<div class="mr'+(i===ti?' mt':'')+'"><span class="md">'+m.d+(i===ti?' &laquo;':'')+'</span><span class="mn">'+m.m+'</span><span class="me" onclick="editMeal('+i+')">[edit]</span></div>';}
  document.getElementById('mlist').innerHTML=h;
}
function editMeal(i){var v=prompt('Edit '+meals[i].d+':',meals[i].m);if(v!==null){meals[i].m=v||meals[i].m;saveMeals();renderMeals();}}
renderMeals();

function getUSHolidays(y,mo){
  // mo is 0-indexed
  var h={};
  function set(m,d,name){if(m===mo)h[d]=(h[d]?h[d]+', ':'')+name;}
  function nthDay(m,nth,dow){// nth weekday (1-indexed) of month, dow 0=Sun
    var d=1,count=0;
    while(count<nth){if(new Date(y,m,d).getDay()===dow)count++;if(count<nth)d++;}return d;}
  // Fixed US holidays
  set(0,1,'New Years Day');
  set(1,14,'Valentines Day');
  set(6,4,'Independence Day');
  set(9,31,'Halloween');
  set(10,11,'Veterans Day');
  set(11,25,'Christmas Day');
  set(11,31,'New Years Eve');
  // Floating US holidays
  set(0,nthDay(0,3,1),'MLK Day');
  set(1,nthDay(1,3,1),'Presidents Day');
  var lastMon=0;for(var d=31;d>=1;d--){if(new Date(y,4,d).getDay()===1){lastMon=d;break;}}set(4,lastMon,'Memorial Day');
  set(8,nthDay(8,1,1),'Labor Day');
  set(9,nthDay(9,2,1),'Columbus Day');
  // Thanksgiving: 4th Thursday of November
  set(10,nthDay(10,4,4),'Thanksgiving');
  // Mothers/Fathers Day
  set(4,nthDay(4,2,0),'Mothers Day');
  set(5,nthDay(5,3,0),'Fathers Day');
  // PTO days (2026 only)
  if(y===2026){
    set(4,26,'PTO'); set(4,27,'PTO');           // May 26-27
    set(5,19,'PTO');                             // June 19
    set(6,6,'PTO'); set(6,7,'PTO'); set(6,8,'PTO'); // July 6-8
    set(8,8,'PTO'); set(8,9,'PTO'); set(8,10,'PTO'); set(8,11,'PTO'); // Sept 8-11
    set(9,8,'PTO'); set(9,9,'PTO');              // Oct 8-9
  }
  return h;
}
function getIslamicHolidays(y,mo){
  // Approximate Gregorian dates for 2024-2027 major holidays
  var h={};
  function set(gy,gm,gd,name){if(gy===y&&gm===mo)h[gd]=(h[gd]?h[gd]+', ':'')+name;}
  // Eid al-Fitr (end of Ramadan)
  set(2024,3,10,'Eid al-Fitr');set(2025,2,30,'Eid al-Fitr');set(2026,2,20,'Eid al-Fitr');set(2027,2,9,'Eid al-Fitr');
  // Eid al-Adha
  set(2024,5,16,'Eid al-Adha');set(2025,5,6,'Eid al-Adha');set(2026,4,27,'Eid al-Adha');set(2027,4,16,'Eid al-Adha');
  // Ramadan start
  set(2024,2,11,'Ramadan Begins');set(2025,2,1,'Ramadan Begins');set(2026,1,18,'Ramadan Begins');set(2027,1,8,'Ramadan Begins');
  // Islamic New Year (1 Muharram)
  set(2024,6,7,'Islamic New Year');set(2025,5,26,'Islamic New Year');set(2026,5,16,'Islamic New Year');
  // Mawlid al-Nabi
  set(2024,8,15,'Mawlid al-Nabi');set(2025,8,4,'Mawlid al-Nabi');set(2026,7,25,'Mawlid al-Nabi');
  // Laylat al-Qadr (27th Ramadan approx)
  set(2025,2,27,'Laylat al-Qadr*');set(2026,2,16,'Laylat al-Qadr*');
  // Day of Arafah
  set(2024,5,15,'Day of Arafah');set(2025,5,5,'Day of Arafah');set(2026,4,26,'Day of Arafah');
  // Ashura
  set(2024,6,16,'Ashura');set(2025,6,5,'Ashura');set(2026,5,25,'Ashura');
  return h;
}
function renderCal(){
  var n=new Date(),y=n.getFullYear(),mo=n.getMonth(),td=n.getDate();
  document.getElementById('calhdr').textContent=MO3[mo]+' '+y;
  var first=new Date(y,mo,1).getDay(),dim=new Date(y,mo+1,0).getDate();
  var usH=getUSHolidays(y,mo),isH=getIslamicHolidays(y,mo);
  var dows=['S','M','T','W','T','F','S'],h='';
  h+='<div class="cwk"></div>'; // week# header spacer
  for(var i=0;i<dows.length;i++)h+='<div class="cdow">'+dows[i]+'</div>';
  // Helper: ISO week number
  function getISOWeek(d){var dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));var day=dt.getUTCDay()||7;dt.setUTCDate(dt.getUTCDate()+4-day);var yearStart=new Date(Date.UTC(dt.getUTCFullYear(),0,1));return Math.ceil((((dt-yearStart)/86400000)+1)/7);}
  // Inject week number at start of each row (every 7 cells, offset by first)
  var cellCount=first;
  // Leading empty cells
  for(var i=0;i<first;i++){
    if(i===0)h+='<div class="cwk"></div>'; // week# placeholder for partial first row
    h+='<div class="cday"></div>';
  }
  var noteMap={};
  for(var d=1;d<=dim;d++){
    var colPos=(first+d-1)%7; // 0=Sun...6=Sat
    if(colPos===0){
      // Start of a new row — inject week number
      var weekDate=new Date(y,mo,d);
      h+='<div class="cwk">W'+getISOWeek(weekDate)+'</div>';
    }
    var cls='cday in'+(d===td?' today':'');
    var hasUS=!!usH[d],hasIS=!!isH[d];
    if(hasUS&&hasIS)cls+=' both-hol'; else if(hasUS)cls+=' us-hol'; else if(hasIS)cls+=' is-hol';
    var dot='';
    if(hasUS)dot+='<span class="hol-dot us"></span>';
    if(hasIS)dot+='<span class="hol-dot is"></span>';
    if(hasUS||hasIS){var names=(usH[d]||'')+(hasUS&&hasIS?' / ':'')+(isH[d]||'');noteMap[d]={names:names,type:hasUS&&hasIS?'both':hasUS?'us':'is'};}
    h+='<div class="'+cls+'">'+d+dot+'</div>';
  }
  document.getElementById('calgrid').innerHTML=h;
  // ── Inject birthdays into noteMap ──
  // ── Inject birthdays (stored as {month:1-12, day:1-31, name}) ──
  if(window.birthdays&&Array.isArray(window.birthdays)){
    window.birthdays.forEach(function(b){
      var bmo=parseInt(b.month,10)-1; // convert to 0-indexed
      var bday=parseInt(b.day,10);
      if(isNaN(bmo)||isNaN(bday))return;
      if(bmo===mo){
        if(!noteMap[bday])noteMap[bday]={names:'',type:'birthday',extra:[]};
        if(!noteMap[bday].extra)noteMap[bday].extra=[];
        noteMap[bday].extra.push({text:'🎂 '+(b.name||'Birthday'),col:'#ff85c2',_type:'birthday'});
      }
    });
  }

  // ── Inject countdowns into noteMap ──
  if(window.cdData&&Array.isArray(window.cdData.items)){
    window.cdData.items.forEach(function(it){
      var targetDate=null;
      if(it.type==='date'&&it.targetDate){
        targetDate=new Date(it.targetDate+'T00:00:00');
      } else if(it.type==='days'&&it.days&&it.created){
        targetDate=new Date(new Date(it.created).getTime()+it.days*864e5);
      }
      if(!targetDate)return;
      if(targetDate.getFullYear()===y&&targetDate.getMonth()===mo){
        var d=targetDate.getDate();
        if(!noteMap[d])noteMap[d]={names:'',type:'countdown',extra:[]};
        if(!noteMap[d].extra)noteMap[d].extra=[];
        noteMap[d].extra.push({text:'📅 '+it.label,col:'#fb923c',_type:'countdown'});
      }
    });
  }

  // ── Inject user yearly events into noteMap ──
  if(window.USER_CAL_EVENTS&&Array.isArray(window.USER_CAL_EVENTS)){
    window.USER_CAL_EVENTS.forEach(function(ev){
      if(ev.yearly&&parseInt(ev.month,10)-1===mo){
        var eday=parseInt(ev.day,10);
        if(!noteMap[eday])noteMap[eday]={names:'',type:'user',extra:[]};
        if(!noteMap[eday].extra)noteMap[eday].extra=[];
        noteMap[eday].extra.push({text:ev.label,col:ev.color||'var(--cp)'});
        // Highlight the calendar day cell
        var cells=document.querySelectorAll('#calgrid .cday.in');
        cells.forEach(function(cell){
          if(parseInt(cell.textContent,10)===eday){
            cell.style.outline='1px solid '+(ev.color||'var(--cp)');
          }
        });
      }
    });
  }

  // Notes section
  var noteKeys=Object.keys(noteMap).map(Number).sort(function(a,b){return a-b;});
  // Count total entries
  var totalEntries=0;
  noteKeys.forEach(function(d){
    var nm=noteMap[d];
    if(nm.names)totalEntries++;
    if(nm.extra)totalEntries+=nm.extra.length;
  });
  var twoCol=totalEntries>5;
  var nh='';
  if(noteKeys.length){
    if(twoCol)nh+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 10px">';
    noteKeys.forEach(function(d){
      var nm=noteMap[d];
      var col=nm.type==='both'?'var(--cp)':nm.type==='us'?'var(--ca)':nm.type==='is'?'var(--cg)':'var(--dim)';
      if(nm.names)nh+='<div class="cal-note-row"><span class="cal-note-dot" style="background:'+col+'"></span><span style="color:'+col+';min-width:20px;font-size:var(--t-base)">'+d+'</span><span class="dim-11">'+nm.names+'</span></div>';
      // Extra events (birthdays=pink, countdowns=purple, user=their color)
      if(nm.extra)nm.extra.forEach(function(ev){
        nh+='<div class="cal-note-row"><span class="cal-note-dot" style="background:'+ev.col+'"></span><span style="color:'+ev.col+';min-width:20px;font-size:var(--t-base)">'+d+'</span><span style="font-size:var(--t-base);color:'+ev.col+'">'+ev.text+'</span></div>';
      });
    });
    if(twoCol)nh+='</div>';
  }
  var notesEl=document.getElementById('cal-notes');
  if(notesEl){
    var alertHtml='';
    // Check if we're in the last baked year for Islamic holidays (2027)
    var ISLAMIC_LAST_YEAR=2027;
    if(y>=ISLAMIC_LAST_YEAR){
      alertHtml='<div style="background:rgba(255,204,0,.08);border:1px solid rgba(255,204,0,.3);padding:6px 10px;margin-bottom:8px;font-size:var(--t-sm);color:var(--ca);letter-spacing:.5px">'
        +'&#9888; Islamic holiday dates are only pre-loaded through '+ISLAMIC_LAST_YEAR+'. Dates may be missing after this year.'
        +'</div>';
    }
    if(nh)notesEl.innerHTML=alertHtml+'<div class="cal-note-label" style="margin-bottom:5px;flex-wrap:wrap;display:flex;gap:8px"><span style="color:var(--ca)">&#9679;</span><span style="color:var(--ca);font-size:var(--t-xs)">US</span>&nbsp;<span style="color:var(--cg)">&#9679;</span><span style="color:var(--cg);font-size:var(--t-xs)">Islamic</span>&nbsp;<span style="color:var(--cp)">&#9679;</span><span style="color:var(--cp);font-size:var(--t-xs)">Both</span>&nbsp;<span style="color:#ff85c2">&#9679;</span><span style="color:#ff85c2;font-size:var(--t-xs)">Birthday</span>&nbsp;<span style="color:#a78bfa">&#9679;</span><span style="color:#a78bfa;font-size:var(--t-xs)">In X Days</span></div>'+nh;
    else notesEl.innerHTML=alertHtml;
  }
}
renderCal();

// ── USER CALENDAR EVENTS (yearly recurring) ──
var USER_CAL_EVENTS=lsGet('dash_user_cal',[]);
// Seed defaults if empty
if(!USER_CAL_EVENTS.length){
  USER_CAL_EVENTS=[{id:'walima',month:5,day:6,label:'🎬 Record Walima Video',color:'#bd93f9',yearly:true}];
  lsSet('dash_user_cal',USER_CAL_EVENTS);
}
function saveUserCalEvents(){lsSet('dash_user_cal',USER_CAL_EVENTS);}
window.USER_CAL_EVENTS=USER_CAL_EVENTS;

var notes=mergeItemArrays(lsGet('dash_notes_v2',[]),[],normalizeNoteItem);
function saveNotes(){lsSet('dash_notes_v2',notes);}
saveNotes();
var notesTab=localStorage.getItem('dash_notes_tab')||'main';
function notesSwitchTab(tab,skipSave){
  notesTab=(tab==='done')?'done':'main';
  if(!skipSave)localStorage.setItem('dash_notes_tab',notesTab);
  var mainTab=document.getElementById('notes-tab-main');
  var doneTab=document.getElementById('notes-tab-done');
  var mainPanel=document.getElementById('notes-main-panel');
  var donePanel=document.getElementById('notes-done-panel');
  var isMain=notesTab==='main';
  if(mainTab){mainTab.style.color=isMain?'var(--cc)':'var(--dim)';mainTab.style.borderColor=isMain?'var(--cc)':'var(--dim)';}
  if(doneTab){doneTab.style.color=!isMain?'var(--cc)':'var(--dim)';doneTab.style.borderColor=!isMain?'var(--cc)':'var(--dim)';}
  if(mainPanel)mainPanel.style.display=isMain?'':'none';
  if(donePanel)donePanel.style.display=isMain?'none':'';
}
function pruneNotesDoneWindow(){
  var now=Date.now();
  var keepMs=14*24*60*60*1000;
  var keepDeletedMs=30*24*60*60*1000;
  var changed=false;
  notes=notes.filter(function(n){
    if(n&&n.deletedAt){
      if((now-n.deletedAt)>keepDeletedMs){changed=true;return false;}
      return true;
    }
    if(!n.done||!n.doneAt)return true;
    if((now-n.doneAt)>keepMs){changed=true;return false;}
    return true;
  });
  if(changed)saveNotes();
}
function noteInMainView(n){
  if(n.deletedAt)return false;
  if(!n.done)return true;
  if(!n.doneAt)return true;
  return startOfLocalDayTs(n.doneAt)===startOfLocalDayTs(Date.now());
}
function renderNotesDoneList(){
  var el=document.getElementById('notes-done-list');
  if(!el)return;
  var done=notes.filter(function(n){return !n.deletedAt&&n.done&&n.doneAt;}).sort(function(a,b){return (b.doneAt||0)-(a.doneAt||0);});
  if(!done.length){el.innerHTML='<div class="done-item">No completed notes in the last 14 days.</div>';return;}
  var h='';
  done.forEach(function(n){
    h+='<div class="done-item"><div>'+n.text+'</div><div class="done-time">'+new Date(n.doneAt).toLocaleString()+'</div></div>';
  });
  el.innerHTML=h;
}
function copyNotesDone(){
  var done=notes.filter(function(n){return !n.deletedAt&&n.done&&n.doneAt;}).sort(function(a,b){return (b.doneAt||0)-(a.doneAt||0);});
  if(!done.length){clipCopy('(no completed notes in last 14 days)','Done Notes');return;}
  var lines=done.map(function(n){return '- '+n.text+' ['+new Date(n.doneAt).toLocaleDateString()+']';});
  clipCopy(lines.join('\n'),'Done Notes');
}
function addNote(){
  var inp=document.getElementById('notes-inp'),txt=inp.value.trim();
  if(!txt)return;
  var now=new Date();
  var _hr=now.getHours(),_mn=now.getMinutes();
  var _ampm=_hr>=12?'PM':'AM';
  var _h12=_hr%12||12;
  var _months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var ts=DAYS[now.getDay()].slice(0,3)+' '+_months[now.getMonth()]+' '+now.getDate()+' · '+_h12+':'+pad(_mn)+' '+_ampm;
  notes.push({
    id:Date.now(),
    text:txt,
    ts:ts,
    done:false,
    doneAt:0,
    deletedAt:0,
    created:Date.now(),
    updatedAt:syncNowIso(),
    _deviceId:getSyncDeviceId()
  });
  inp.value='';
  safeHap(HAP.soft);
  saveNotes();
  renderNotes(true);
}
function markNoteDone(id){
  var n=notes.find(function(x){return x.id===id&&!x.deletedAt;});
  if(!n)return;
  n.done=!n.done;
  if(n.done&&typeof hap==='function')hap(HAP.check);
  if(n.done)n.doneAt=Date.now(); else n.doneAt=0;
  n.updatedAt=syncNowIso();
  n._deviceId=getSyncDeviceId();
  saveNotes();
  renderNotes(false);
}
var noteDeletePending={};
function delNote(id){
  if(!noteDeletePending[id]){
    noteDeletePending[id]=true;
    var el=document.getElementById('ndel-'+id);
    if(el){el.textContent='SURE?';el.style.background='rgba(255,68,68,.1)';}
    setTimeout(function(){
      noteDeletePending[id]=false;
      var el=document.getElementById('ndel-'+id);
      if(el){el.innerHTML='&#x2715;';el.style.background='';}
    },3000);
    return;
  }
  noteDeletePending[id]=false;
  var delEl2=document.getElementById('ndel-'+id);
  if(delEl2){var r2=delEl2.getBoundingClientRect();confetti(r2.left+r2.width/2,r2.top,'#00e5ff');}
  var n=notes.find(function(x){return x.id===id;});
  if(n){
    n.deletedAt=Date.now();
    n.updatedAt=syncNowIso();
    n._deviceId=getSyncDeviceId();
  }
  saveNotes();
  renderNotes(false);
}
function copyNote(id){
  var n=notes.find(function(x){return x.id===id;});
  if(!n)return;
  navigator.clipboard.writeText(n.text).then(function(){
    var el=document.getElementById('ndel-'+id);
    var cp=document.querySelector('.note-bubble .nb-copy');
    var saved=document.getElementById('nsaved');
    if(saved){saved.textContent='COPIED';setTimeout(function(){saved.textContent='';},1500);}
  }).catch(function(){});
}
function copyAllNotes(){
  var visible=notes.filter(function(n){return !n.deletedAt;});
  if(!visible.length)return;
  var txt=visible.map(function(n){return '['+n.ts+'] '+n.text;}).join('\n');
  navigator.clipboard.writeText(txt).then(function(){
    var s=document.getElementById('nsaved');
    s.textContent='COPIED TO CLIPBOARD';
    setTimeout(function(){s.textContent='';},2000);
  }).catch(function(){
    var s=document.getElementById('nsaved');
    s.textContent='COPY FAILED';
    setTimeout(function(){s.textContent='';},2000);
  });
}
function renderNotes(scrollDown){
  pruneNotesDoneWindow();
  var feed=document.getElementById('notes-feed');
  var visible=notes.filter(noteInMainView);
  document.getElementById('notes-count').textContent=visible.length;
  if(!visible.length){feed.innerHTML='<div class="cdm" style="font-size:var(--t-base);padding:6px 0">No notes yet.</div>';renderNotesDoneList();notesSwitchTab(notesTab,true);return;}
  var h='';
  for(var i=0;i<visible.length;i++){
    var n=visible[i];
    h+='<div class="note-bubble'+(n.done?' done':'')+'"><span class="nb-del" id="ndel-'+n.id+'" onclick="delNote('+n.id+')">[x]</span><span class="nb-copy" onclick="copyNote('+n.id+')" title="Copy">&#128203;</span><span class="nb-done" onclick="markNoteDone('+n.id+')" title="Mark done">&#10003;</span>'+n.text+'<div class="nb-time" style="font-size:var(--t-xs);color:rgba(255,255,255,.25);margin-top:5px;letter-spacing:.5px">'+n.ts+(n.done?' <span style="color:rgba(80,250,123,.5)">· done</span>':'')+'</div></div>';
  }
  feed.innerHTML=h;
  renderNotesDoneList();
  notesSwitchTab(notesTab,true);
  if(scrollDown)feed.scrollTop=feed.scrollHeight;
}
renderNotes(false);


var STIMES=['6:30','7:00','7:30','8:00'];
var schedWeekOffset=0; // 0=this week, 1=next week, -1=last week

function schedGetWeekDays(offset){
  var now=new Date();
  var dow=now.getDay(); // 0=Sun
  // If today is Sunday, show next week by default (add 1 to offset)
  var sundayBonus=(dow===0&&offset===0)?1:0;
  var monday=new Date(now);
  monday.setDate(now.getDate()-((dow+6)%7)+(offset+sundayBonus)*7);
  monday.setHours(0,0,0,0);
  var days=[];
  var dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var dayAbbrs=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  // Mon–Sat
  for(var i=0;i<6;i++){
    var d=new Date(monday);d.setDate(monday.getDate()+i);
    var key=localDateStr(d);
    var isToday=key===localDateStr(now);
    days.push({key:key,abbr:dayAbbrs[d.getDay()],label:dayNames[d.getDay()]+' '+d.getDate(),isToday:isToday,isWeekend:d.getDay()===0||d.getDay()===6});
  }
  return days;
}

function schedPrune(){
  // Keep 8 weeks of history so prev/next week always have data
  var now=new Date();
  var cutoff=new Date(now);
  cutoff.setDate(now.getDate()-56); // 8 weeks back
  cutoff.setHours(0,0,0,0);
  var changed=false;
  Object.keys(schedule).forEach(function(k){
    if(k.length===10){
      var d=new Date(k+'T00:00:00');
      if(d<cutoff){delete schedule[k];changed=true;}
    }
  });
  if(changed)saveSched();
}

var schedule=lsGet('dash_schedule',{});
function saveSched(){lsSet('dash_schedule',schedule);}

function schedNav(dir){
  schedWeekOffset+=dir;
  // Don't go more than 1 week back (can't edit past) or 1 week forward
  if(schedWeekOffset<-1)schedWeekOffset=-1;
  if(schedWeekOffset>1)schedWeekOffset=1;
  renderSched();
}

function selectTime(key,time){
  var cur=schedule[key];
  if(cur===time){schedule[key]=time+'?';}
  else if(cur===time+'?'){schedule[key]=null;}
  else{schedule[key]=time;}
  saveSched();renderSched();
}

function toggleOff(key){
  schedule[key]=schedule[key]==='OFF'?null:'OFF';
  saveSched();renderSched();
}

function renderSched(){
  schedPrune();
  var days=schedGetWeekDays(schedWeekOffset);
  var lbl=document.getElementById('sched-week-label');
  if(lbl)lbl.textContent=schedWeekOffset===0?'THIS WEEK':schedWeekOffset===1?'NEXT WEEK':'LAST WEEK';
  var h='';
  for(var i=0;i<days.length;i++){
    var day=days[i];
    var sel=schedule[day.key]||null;
    var isOff=(sel==='OFF');
    var pills='';
    for(var j=0;j<STIMES.length;j++){
      var t=STIMES[j];
      var pst=(sel===t?'on':sel===t+'?'?'maybe':'');
      pills+='<span class="pill'+(pst?' '+pst:'')+'" onclick="selectTime(\'' +day.key+ '\',\'' +t+ '\')">'+t+'</span>';
    }
    h+='<div class="schr"><span class="schd'+(day.isToday?' today':'')+' " style="min-width:54px">'+day.label+'</span><div class="pills" style="'+(isOff?'opacity:.3;pointer-events:none':'')+'">'+pills+'</div><span class="soff'+(isOff?' off':'')+'" onclick="toggleOff(\'' +day.key+ '\')">'+(isOff?'OFF':'off?')+'</span></div>';
  }
  document.getElementById('schlist').innerHTML=h;
}
renderSched();

var DEF_BM=[{id:1,i:'📞',n:'DialPad',u:'https://astounding-mermaid-392b17.netlify.app/'},{id:2,i:'🍽',n:'FoodMood',u:'https://meals-crisp-d7638b.netlify.app/'},{id:3,i:'E',n:'Gmail',u:'https://mail.google.com'},{id:4,i:'C',n:'Calendar',u:'https://calendar.google.com'},{id:5,i:'N',n:'HackerNews',u:'https://news.ycombinator.com'},{id:6,i:'Y',n:'YouTube',u:'https://youtube.com'},{id:7,i:'Q',n:'Quran.com',u:'https://quran.com'},{id:8,i:'G',n:'GitHub',u:'https://github.com'}];
var bmarks=JSON.parse(localStorage.getItem('dash_bmarks')||JSON.stringify(DEF_BM));
// Ensure DialPad and FoodMood are in bmarks
(function(){var urls=['https://astounding-mermaid-392b17.netlify.app/','https://meals-crisp-d7638b.netlify.app/'];var changed=false;urls.reverse().forEach(function(u,ri){if(!bmarks.find(function(b){return b.u===u;})){var entry=ri===0?{id:Date.now()+ri,i:'🍽',n:'FoodMood',u:u}:{id:Date.now()+ri,i:'📞',n:'DialPad',u:u};bmarks.unshift(entry);changed=true;}});if(changed)saveBmarks();})();
(function(){var mx=0;bmarks.forEach(function(b){if(b.id&&b.id>mx)mx=b.id;});bmarks.forEach(function(b){if(!b.id){mx++;b.id=mx;}});})();
var bmManageMode=false;
var bmDelPending={};
function saveBmarks(){lsSet('dash_bmarks',bmarks);}
function bmToggleManage(){
  bmManageMode=!bmManageMode;
  var btn=document.getElementById('bm-manage-btn');
  if(btn){btn.style.color=bmManageMode?'var(--cl)':'var(--dim)';btn.style.borderColor=bmManageMode?'var(--cl)':'var(--dim)';btn.textContent=bmManageMode?'DONE':'MANAGE';}
  renderBmarks();
}
function renderBmarks(){
  var grid=document.getElementById('bmgrid');if(!grid)return;
  var h='';
  if(bmManageMode){
    bmarks.forEach(function(b,idx){
      h+='<div class="bm-manage-item">'
        +'<span class="bm-manage-icon">'+b.i+'</span>'
        +'<div class="flex-1"><div class="bm-manage-name">'+b.n+'</div>'
        +'<div class="bm-manage-url">'+b.u.replace(/https?:\/\//,'')+'</div></div>'
        +'<button class="bm-arr" onclick="bmMove('+idx+',-1)"'+(idx===0?' disabled':'')+'>&#8593;</button>'
        +'<button class="bm-arr" onclick="bmMove('+idx+',1)"'+(idx===bmarks.length-1?' disabled':'')+'>&#8595;</button>'
        +'<button class="bm-del" id="bmdel-'+b.id+'" onclick="bmDelete('+b.id+')">&#x2715;</button>'
        +'</div>';
    });
    h+='<div style="margin-top:8px"><div class="bmadd" onclick="addBookmark()">+ Add Link</div></div>';
    grid.innerHTML=h;
  } else {
    h='';
    for(var i=0;i<bmarks.length;i++){
      var b=bmarks[i];
      h+='<a class="bma" href="'+b.u+'" target="_blank"><div class="bmi">'+b.i+'</div><div class="bmn">'+b.n+'</div><div class="bmu">'+b.u.replace(/https?:\/\//,'')+'</div></a>';
    }
    h+='<div class="bmadd" onclick="addBookmark()">+ Add Link</div>';
    grid.innerHTML=h;
  }
}
function bmMove(idx,dir){
  var ni=idx+dir;if(ni<0||ni>=bmarks.length)return;
  var tmp=bmarks[idx];bmarks[idx]=bmarks[ni];bmarks[ni]=tmp;
  saveBmarks();renderBmarks();
}
function bmDelete(id){
  var pid='bmdel-'+id;
  if(!bmDelPending[id]){
    bmDelPending[id]=true;
    var el=document.getElementById(pid);
    if(el){el.innerHTML='?';el.style.background='rgba(255,68,68,.2)';}
    setTimeout(function(){bmDelPending[id]=false;var el2=document.getElementById(pid);if(el2){el2.innerHTML='&#x2715;';el2.style.background='';}},3000);
    return;
  }
  bmDelPending[id]=false;
  bmarks=bmarks.filter(function(b){return b.id!==id;});
  saveBmarks();renderBmarks();
}
function addBookmark(){
  var n=prompt('Name:');if(!n)return;
  var u=prompt('URL:');if(!u)return;
  if(!/^https?:\/\//i.test(u))u='https://'+u;
  var ic=prompt('Icon (letter or emoji):','🔗')||'🔗';
  var mx=bmarks.reduce(function(m,b){return Math.max(m,b.id||0);},0);
  bmarks.push({id:mx+1,i:ic,n:n,u:u});
  saveBmarks();renderBmarks();
}
renderBmarks();

function openModal(type){
  var box=document.getElementById('mb'),title=document.getElementById('mtitle'),mc=document.getElementById('mc');
  document.getElementById('mo').classList.add('open');
  if(type==='prayer'){
    box.style.borderColor='var(--ca)';title.className='ca';title.textContent='// PRAYER TIMES 21044';
    if(!prayers){mc.innerHTML='<div class="cdm">Loading...</div>';return;}
    var cur=currentPrayer(),nxt=nextPrayer(),h='<div class="sl">ISNA METHOD - ZIP '+(getZipCfg('home','21044')||'21044')+'</div>';
    if(nxt)h+='<div class="nb ca">NEXT: '+nxt.name.toUpperCase()+' @ '+fmt12(nxt.time)+'</div>';
    for(var i=0;i<PNAMES.length;i++){
      var p=PNAMES[i],a=(p===cur);
      var tr=getPrayerTrend(p),tc='same',tl='--';
      if(tr!==null){if(tr<0){tc='earlier';tl=tr+'m';}else if(tr>0){tc='later';tl='+'+tr+'m';}else tl='+/-0';}
      h+='<div class="drow" style="'+(a?'color:var(--ca)':'')+'"><span style="font-size:var(--t-body);letter-spacing:3px">'+p.toUpperCase()+'</span><span class="vt" style="font-size:30px">'+fmt12(prayers[p])+'</span><span class="ptrend '+tc+'" style="font-size:var(--t-lg)">'+tl+'</span></div>';
    }
    h+='<div style="margin-top:14px;font-size:var(--t-sm);color:var(--dim)">Trend = today vs 7-day future avg. Green = earlier than upcoming week, pink = later.</div>';
    mc.innerHTML=h;
  } else if(type==='weather'){
    box.style.borderColor='var(--cc)';title.className='cc';title.textContent='// WEATHER ZIP 21044';
    if(!wx){mc.innerHTML='<div class="cdm">Loading...</div>';return;}
    var cw=wx.current_weather,code=cw.weathercode,idx=new Date().getHours();
    var hr=wx.hourly,daily=wx.daily;
    var rain3=(daily.precipitation_sum[1]||0)+(daily.precipitation_sum[2]||0)+(daily.precipitation_sum[3]||0);
    var snow3=(daily.snowfall_sum[1]||0)+(daily.snowfall_sum[2]||0)+(daily.snowfall_sum[3]||0);
    var rw=(rain3>0.25||snow3>0.1),fr='';
    for(var d=1;d<=3;d++){
      var nd=new Date();nd.setDate(nd.getDate()+d);
      var jk=checkDayJacket(hr,localDateStr(nd));
      var rn=daily.precipitation_sum[d]||0,sn=daily.snowfall_sum[d]||0;
      fr+='<div class="drow"><span>'+DAY3[nd.getDay()].toUpperCase()+' '+(WICO[String(daily.weathercode[d])]||'?')+' '+(WMO[daily.weathercode[d]]||'')+'</span><span><span class="cc">'+Math.round(daily.temperature_2m_max[d])+'\u00B0</span><span class="cdm"> / '+Math.round(daily.temperature_2m_min[d])+'\u00B0</span>'+(rn>0.05?'<span class="cc"> \uD83C\uDF27 '+rn.toFixed(2)+'"</span>':'')+(sn>0.05?'<span class="cc"> \u2744 '+sn.toFixed(1)+'"</span>':'')+(jk.needs?' <span style="color:var(--ca)">\u26A0 jacket</span>':'')+'</span></div>';
    }
    mc.innerHTML='<div class="sl">OPEN-METEO - ZIP '+(getZipCfg('home','21044')||'21044')+' - '+(getHomeCoords().city||'COLUMBIA')+' MD</div><div style="display:flex;align-items:center;gap:20px;margin-bottom:16px"><div class="vt cc" style="font-size:100px;line-height:1;text-shadow:var(--gc)">'+Math.round(cw.temperature)+'\u00B0F</div><div><div style="font-size:38px">'+(WICO[String(code)]||'?')+'</div><div style="font-size:var(--t-body);color:var(--dim);margin-top:4px">'+(WMO[code]||'Unknown')+'</div></div></div><div class="mdg" style="margin-bottom:16px"><div class="mdc"><div class="mdl">FEELS LIKE</div><div class="mdv cc">'+Math.round(hr.apparent_temperature[idx])+'\u00B0F</div></div><div class="mdc"><div class="mdl">HUMIDITY</div><div class="mdv cc">'+hr.relativehumidity_2m[idx]+'%</div></div><div class="mdc"><div class="mdl">WIND</div><div class="mdv cc">'+Math.round(cw.windspeed)+' mph</div></div><div class="mdc"><div class="mdl">3-DAY PRECIP</div><div class="mdv '+(rw?'ca':'cl')+'">R:'+rain3.toFixed(2)+'" S:'+snow3.toFixed(1)+'"</div></div></div><div class="sl">3-DAY FORECAST (7AM-4PM JACKET CHECK)</div>'+fr;
  } else if(type==='stocks'){
    box.style.borderColor='var(--cl)';title.className='cl';title.textContent='// MARKET DATA';
    var open=mktOpen(),h='<div class="sl">STATUS: <span style="color:'+(open?'var(--cl)':'var(--cr)')+'">'+( open?'OPEN':'CLOSED')+'</span> - DEMO DATA</div>';
    for(var i=0;i<stocks.length;i++){var s=stocks[i];h+='<div class="drow"><div><div class="vt cl" style="font-size:var(--t-h1);text-shadow:var(--gl)">'+s.t+'</div><div class="dim-11">'+s.lb+'</div></div><div style="text-align:right"><div class="vt" style="font-size:var(--t-h1)">$'+s.p+'</div><div class="sc '+(s.up?'sup':'sdn')+'" style="font-size:var(--t-body);margin-top:2px">'+s.ch+' ('+s.pt+')</div></div></div>';}
    h+='<div style="margin-top:18px;border:1px dashed var(--dim);padding:12px;font-size:var(--t-base);color:var(--dim)">DEMO MODE - integrate Finnhub API for live prices.</div>';
    mc.innerHTML=h;
  }
}
function closeModal(){document.getElementById('mo').classList.remove('open');}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});

var DEF_ORDER=['quick-nav','clock','prayer','weather','stocks','todo','meals','calendar','notes','schedule','books','birthdays','season-traditions','pickleball','s-tracker','prayer-tracker','quran-tracker','juz-amma','islamic-topics','pomodoro','weekly-review','decision-log','energy-map','life-streaks','weekly-moments','weekend-warrior','goals','writers-den','meal-prep','ebook-library','raft','day-blocks','workout-log','quran-cards','quran-words','for-akhira','the-wall','countdown','gratitude-log','dua-card','rent-payments','settings','bookmarks','mood-log','milestone','reframe','legacy-letter','shadow-log','fear-inventory','people-become','writing-log','stress-demess','calorie-counter','weekly-summary','ayah-recall','ayah-completion','surah-map','voice-study','articulate'];
var tileOrder=JSON.parse(localStorage.getItem('dash_tile_order')||'null')||DEF_ORDER;
// Merge any new cards from DEF_ORDER that aren't in saved tileOrder
if(localStorage.getItem('dash_tile_order')){
  DEF_ORDER.forEach(function(id){if(tileOrder.indexOf(id)<0)tileOrder.push(id);});
}
function applyOrder(){
  var g=document.getElementById('grid');
  // Apply saved order
  for(var i=0;i<tileOrder.length;i++){var el=g.querySelector('[data-id="'+tileOrder[i]+'"]');if(el)g.appendChild(el);}
  // Append any tiles NOT in tileOrder (new cards added since last save)
  var allTiles=Array.from(g.querySelectorAll('[data-id]'));
  allTiles.forEach(function(el){
    if(tileOrder.indexOf(el.dataset.id)<0)g.appendChild(el);
  });
}
function saveOrder(){var els=document.getElementById('grid').querySelectorAll('[data-id]');tileOrder=Array.from(els).map(function(e){return e.dataset.id;});lsSet('dash_tile_order',tileOrder);}
applyOrder();
var MAGNET_PAIRS=[
  ['clock','pomodoro'],
  ['todo','notes'],
  ['prayer-tracker','prayer'],
  ['quran-tracker','juz-amma'],
  // Updated/new pairs
  ['dua-card','islamic-topics'],
  ['quran-cards','quran-words','ayah-recall','ayah-completion','surah-map','voice-study','articulate'],
  ['legacy-letter','shadow-log'],
  ['goals','milestone'],
  ['calorie-counter','meals']
];
function getMagnetBuddy(id){
  for(var i=0;i<MAGNET_PAIRS.length;i++){
    var a=MAGNET_PAIRS[i][0],b=MAGNET_PAIRS[i][1];
    if(a===id)return b;
    if(b===id)return a;
  }
  return '';
}
function magnetPlace(anchorId){
  if(!getSetting('magnetMode'))return;
  var buddyId=getMagnetBuddy(anchorId);
  if(!buddyId)return;
  var g=document.getElementById('grid');
  if(!g)return;
  var anchor=g.querySelector('[data-id="'+anchorId+'"]');
  var buddy=g.querySelector('[data-id="'+buddyId+'"]');
  if(!anchor||!buddy)return;
  if(hiddenTiles.indexOf(anchorId)>=0||hiddenTiles.indexOf(buddyId)>=0)return;
  if(anchor.nextElementSibling!==buddy)anchor.after(buddy);
}
function enforceMagnetAll(){
  if(!getSetting('magnetMode'))return;
  var g=document.getElementById('grid');
  if(!g)return;
  MAGNET_PAIRS.forEach(function(pair){
    var a=g.querySelector('[data-id="'+pair[0]+'"]');
    var b=g.querySelector('[data-id="'+pair[1]+'"]');
    if(!a||!b)return;
    if(hiddenTiles.indexOf(pair[0])>=0||hiddenTiles.indexOf(pair[1])>=0)return;
    var all=Array.from(g.querySelectorAll('[data-id]'));
    var ia=all.indexOf(a),ib=all.indexOf(b);
    if(ia<0||ib<0)return;
    if(ia<=ib){
      if(a.nextElementSibling!==b)a.after(b);
    } else {
      if(b.nextElementSibling!==a)b.after(a);
    }
  });
  saveOrder();
}
window.enforceMagnetAll=enforceMagnetAll;

var dragTile=null,ghost=null,dox=0,doy=0;
function getAt(x,y){if(ghost)ghost.style.display='none';var el=document.elementFromPoint(x,y);if(ghost)ghost.style.display='';return el?el.closest('[data-id]'):null;}
function startDrag(tile,cx,cy){dragTile=tile;var r=tile.getBoundingClientRect();dox=cx-r.left;doy=cy-r.top;ghost=tile.cloneNode(true);ghost.style.cssText='position:fixed;z-index:9000;pointer-events:none;width:'+r.width+'px;height:'+r.height+'px;left:'+r.left+'px;top:'+r.top+'px;opacity:.8;box-shadow:0 8px 40px rgba(0,0,0,.6);transform:scale(1.03);background:var(--bg2);border:1px solid rgba(255,255,255,.3);overflow:hidden;';document.body.appendChild(ghost);tile.classList.add('dragging');}
function moveDrag(cx,cy){if(!ghost||!dragTile)return;if(window._zonesVisible)return;ghost.style.left=(cx-dox)+'px';ghost.style.top=(cy-doy)+'px';var ov=getAt(cx,cy);document.querySelectorAll('.drag-over').forEach(function(e){e.classList.remove('drag-over');});if(ov&&ov!==dragTile)ov.classList.add('drag-over');}
function endDrag(cx,cy){if(!dragTile)return;if(window._zonesVisible){dragTile.classList.remove('dragging');if(ghost){ghost.remove();ghost=null;}dragTile=null;return;}var movedId=dragTile.dataset.id;var tgt=getAt(cx,cy);document.querySelectorAll('.drag-over').forEach(function(e){e.classList.remove('drag-over');});if(tgt&&tgt!==dragTile){var g=document.getElementById('grid'),all=Array.from(g.querySelectorAll('[data-id]')),si=all.indexOf(dragTile),ti=all.indexOf(tgt);if(si<ti)tgt.after(dragTile);else tgt.before(dragTile);}if(getSetting('magnetMode'))magnetPlace(movedId);saveOrder();dragTile.classList.remove('dragging');if(ghost){ghost.remove();ghost=null;}dragTile=null;}
document.getElementById('grid').addEventListener('mousedown',function(e){var h=e.target.closest('.drag-handle');if(!h)return;e.preventDefault();var tile=h.closest('[data-id]');if(tile)startDrag(tile,e.clientX,e.clientY);});
document.addEventListener('mousemove',function(e){if(dragTile)moveDrag(e.clientX,e.clientY);});
document.addEventListener('mouseup',function(e){if(dragTile)endDrag(e.clientX,e.clientY);});
document.getElementById('grid').addEventListener('touchstart',function(e){var h=e.target.closest('.drag-handle');if(!h)return;e.preventDefault();var tile=h.closest('[data-id]');if(tile){var t=e.touches[0];startDrag(tile,t.clientX,t.clientY);}},{passive:false});
document.addEventListener('touchmove',function(e){if(!dragTile)return;e.preventDefault();var t=e.touches[0];moveDrag(t.clientX,t.clientY);},{passive:false});
document.addEventListener('touchend',function(e){if(!dragTile)return;var t=e.changedTouches[0];endDrag(t.clientX,t.clientY);},{passive:false});



//  CONFETTI 
function confetti(x,y,color){
  var colors=color
    ?[color,lighten(color),'#ffffff',color]
    :['#00ff88','#ffcc00','#00e5ff','#ff5fa0','#c77dff','#ff8c42','#ffffff','#aaff00'];
  var count=55;
  for(var i=0;i<count;i++){
    (function(){
      var el=document.createElement('div');
      var c2=colors[Math.floor(Math.random()*colors.length)];
      var w=(3+Math.random()*7);
      var h2=Math.random()>0.4?(2+Math.random()*4):w; // mix squares and rectangles
      var angle=Math.random()*360;
      var dist=80+Math.random()*160;
      var tx=Math.cos(angle*Math.PI/180)*dist*(0.7+Math.random()*0.6);
      var ty=Math.sin(angle*Math.PI/180)*dist-80-Math.random()*60;
      var rot=Math.random()*900-450;
      var delay=Math.random()*120;
      var dur=700+Math.random()*500;
      el.style.cssText='position:fixed;z-index:99999;pointer-events:none;width:'+w+'px;height:'+h2+'px'
        +';background:'+c2+';left:'+(x-w/2)+'px;top:'+(y-h2/2)+'px'
        +';border-radius:'+(Math.random()>.4?'50%':'2px')
        +';transition:transform '+dur+'ms ease-out '+delay+'ms,opacity '+dur+'ms ease-in '+delay+'ms'
        +';opacity:1';
      document.body.appendChild(el);
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        el.style.transform='translate('+tx+'px,'+ty+'px) rotate('+rot+'deg)';
        el.style.opacity='0';
      });});
      setTimeout(function(){el.remove();},(dur+delay+100));
    })();
  }
}
function lighten(hex){
  // returns a lighter tint of a hex color
  try{
    var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return 'rgb('+(r+60>255?255:r+60)+','+(g+60>255?255:g+60)+','+(b+60>255?255:b+60)+')';
  }catch(e){return hex;}
}

//  BOOKS 
var books=lsGet('dash_books',[]);
// Prune covers on load
setTimeout(function(){if(typeof booksPruneCoversByDate==='function')booksPruneCoversByDate();},200);
var booksTab='reading';
function saveBooks(){lsSet('dash_books',books);}


var _booksTabOrder=['reading','done','stats','add','reviews'];
function _booksTabDir(from,to){
  var fi=_booksTabOrder.indexOf(from),ti=_booksTabOrder.indexOf(to);
  return ti>fi?'left':'right';
}
function _slideTab(panelEl, dir, cb){
  if(!panelEl)return cb&&cb();
  panelEl.classList.add('tab-exit-'+dir);
  setTimeout(function(){
    panelEl.style.display='none';
    panelEl.classList.remove('tab-exit-'+dir);
    cb&&cb();
  },180);
}
function switchBooksTab(tab){
  var prevTab=booksTab||'reading';
  booksTab=tab;
  var tabs=['reading','done','add','stats','reviews'];
  var col='#9b6fff';
  var dir=_booksTabDir(prevTab,tab);
  // Update badge colors
  tabs.forEach(function(t){
    var el=document.getElementById('books-tab-'+t);
    if(el){el.style.color=t===tab?col:'var(--dim)';el.style.borderColor=t===tab?col:'var(--dim)';}
  });
  // Slide out current, slide in new
  var oldPnl=document.getElementById('books-'+prevTab);
  var newPnl=document.getElementById('books-'+tab);
  if(oldPnl&&oldPnl!==newPnl){
    oldPnl.classList.add('tab-panel','tab-exit-'+dir);
    setTimeout(function(){
      oldPnl.style.display='none';
      oldPnl.classList.remove('tab-panel','tab-exit-'+dir);
      if(newPnl){
        newPnl.style.display='';
        newPnl.classList.add('tab-panel','tab-enter-'+(dir==='left'?'right':'left'));
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){
            newPnl.classList.remove('tab-enter-left','tab-enter-right');
            newPnl.classList.add('tab-panel');
          });
        });
      }
    },200);
  } else {
    tabs.forEach(function(t){
      var pnl=document.getElementById('books-'+t);
      if(pnl)pnl.style.display=t===tab?'':'none';
    });
  }
  if(tab==='add'){
    setTimeout(function(){var el=document.getElementById('bf-title');if(el)el.focus();},50);
    // Show cover row for add mode too
    var _cr=document.getElementById('book-cover-row');
    if(_cr&&!window._bfEditingId)_cr.style.display='block';
  }
  if(tab==='stats')renderBooksStats();
  if(tab==='reviews')renderBookReviews();
}

function submitAddBook(){
  var title=(document.getElementById('bf-title').value||'').trim();
  var author=(document.getElementById('bf-author').value||'').trim();
  var total=parseInt(document.getElementById('bf-total').value)||0;
  var cur=parseInt(document.getElementById('bf-cur').value)||0;
  if(!title||!total)return;
  // hide cover row after validation passes
  var cr=document.getElementById('book-cover-row');if(cr)cr.style.display='none';
  var pr=document.getElementById('bf-cover-preview');if(pr)pr.style.display='none';
  var genre=bfGetGenre();
  var isLib=bfGetLibrary();
  var dueDays=parseInt((document.getElementById('bf-due')||{}).value)||0;
  var dueDate=null;
  if(dueDays>0){
    var dd=new Date();dd.setDate(dd.getDate()+dueDays);
    dueDate=localDateStr(dd);
    isLib=true;
  }
  var _rpEl=document.getElementById('bf-real-pages');
var _realPages=_rpEl&&_rpEl.value?parseInt(_rpEl.value)||null:null;
var _newBook={id:Date.now(),title:title,author:author,total:total,current:Math.min(Math.max(0,cur),total),done:false,startDate:localDateStr(),doneDate:null,library:isLib||false,dueDate:dueDate,genre:genre||'fiction',useLocations:window._bfUseLocations||false,realPages:_realPages};
  window._bfUseLocations=false;
  // Apply cover if one was uploaded
  if(window._bfCoverData){_newBook.cover=window._bfCoverData;window._bfCoverData=null;}
  books.push(_newBook);
  booksPruneCoversByDate();
  safeHap(HAP.save);
  saveBooks();
  document.getElementById('bf-title').value='';
  document.getElementById('bf-author').value='';
  document.getElementById('bf-total').value='';
  document.getElementById('bf-cur').value='';
  if(document.getElementById('bf-due'))document.getElementById('bf-due').value='';
  bfReset();
  switchBooksTab('reading');
  renderBooks();
}

function startEditPage(id){
  var el=document.getElementById('bpg-'+id);
  if(!el)return;
  var b=books.find(function(x){return x.id===id;});
  if(!b)return;
  el.innerHTML='<input id="bpg-inp-'+id+'" type="number" min="0" max="'+b.total+'" value="'+b.current+'" style="width:52px;background:transparent;border:1px solid #9b6fff;color:var(--text);font-family:monospace;font-size:var(--t-base);padding:2px 4px;outline:none" onkeydown="if(event.key===\'Enter\')savePageEdit('+id+');if(event.key===\'Escape\')renderBooks()"><span class="book-btn" onmousedown="event.preventDefault();savePageEdit('+id+')" ontouchstart="event.preventDefault();savePageEdit('+id+')" style="margin-left:4px;color:#9b6fff;border-color:rgba(122,79,255,.4);padding:4px 8px">OK</span>';
  setTimeout(function(){var i=document.getElementById('bpg-inp-'+id);if(i){i.focus();i.select();}},20);
}

function savePageEdit(id){
  var inp=document.getElementById('bpg-inp-'+id);
  if(!inp)return;
  var b=books.find(function(x){return x.id===id;});
  if(!b)return;
  var n=parseInt(inp.value);
  if(!isNaN(n))b.current=Math.min(Math.max(0,n),b.total);
  saveBooks();renderBooks();
}

var bookFinishPending={};
function finishBook(id){
  if(!bookFinishPending[id]){
    bookFinishPending[id]=true;
    var el=document.getElementById('bfin-'+id);
    if(el){el.textContent='SURE?';el.style.color='var(--ca)';el.style.borderColor='rgba(255,204,0,.5)';}
    setTimeout(function(){
      bookFinishPending[id]=false;
      var el=document.getElementById('bfin-'+id);
      if(el){el.innerHTML='&#10003;';el.style.color='#9b6fff';el.style.borderColor='rgba(122,79,255,.4)';}
    },3000);
    return;
  }
  bookFinishPending[id]=false;
  var b=books.find(function(x){return x.id===id;});
  if(!b)return;
  b.done=true;b.current=b.total;
  b.doneDate=localDateStr();
  saveBooks();renderBooks();
}

var bookDeletePending={};

function deleteBook(id){
  if(!bookDeletePending[id]){
    bookDeletePending[id]=true;
    var el=document.getElementById('bdel-'+id);
    if(el){el.textContent='SURE?';el.style.background='rgba(255,68,68,.1)';}
    setTimeout(function(){
      bookDeletePending[id]=false;
      var el=document.getElementById('bdel-'+id);
      if(el){el.innerHTML='&#x2715;';el.style.background='';}
    },3000);
    return;
  }
  bookDeletePending[id]=false;
  var delElB=document.getElementById('bdel-'+id);
  if(delElB){var rB=delElB.getBoundingClientRect();confetti(rB.left+rB.width/2,rB.top,'#c77dff');}
  books=books.filter(function(x){return x.id!==id;});
  saveBooks();renderBooks();
}

function booksPruneCoversByDate(){
  // Keep covers only for the 15 most recently read/updated books
  var withCovers=books.filter(function(b){return b.cover;});
  if(withCovers.length<=15)return;
  // Sort by most recently started or updated (use id as proxy for recency)
  withCovers.sort(function(a,b){return b.id-a.id;});
  var toStrip=withCovers.slice(15);
  toStrip.forEach(function(b){delete b.cover;});
  saveBooks();
}
function bfCoverPreview(input){
  var file=input.files[0];
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var W=70,H=Math.round(img.height*(W/img.width));
      var offscreen=document.createElement('canvas');
      offscreen.width=W;offscreen.height=H;
      var ctx=offscreen.getContext('2d');
      ctx.drawImage(img,0,0,W,H);
      var imgData=ctx.getImageData(0,0,W,H);
      var data=imgData.data;
      var levels=10;
      var clamp=function(v){return Math.max(0,Math.min(255,v));};
      var quantize=function(v){return Math.round(v/255*(levels-1))*(255/(levels-1));};
      for(var py=0;py<H;py++){
        for(var px=0;px<W;px++){
          var pi=(py*W+px)*4;
          var oldR=data[pi],oldG=data[pi+1],oldB=data[pi+2];
          var newR=quantize(oldR),newG=quantize(oldG),newB=quantize(oldB);
          data[pi]=newR;data[pi+1]=newG;data[pi+2]=newB;
          var eR=oldR-newR,eG=oldG-newG,eB=oldB-newB;
          var ni;
          if(px+1<W){ni=(py*W+(px+1))*4;data[ni]=clamp(data[ni]+eR*7/16);data[ni+1]=clamp(data[ni+1]+eG*7/16);data[ni+2]=clamp(data[ni+2]+eB*7/16);}
          if(px-1>=0&&py+1<H){ni=((py+1)*W+(px-1))*4;data[ni]=clamp(data[ni]+eR*3/16);data[ni+1]=clamp(data[ni+1]+eG*3/16);data[ni+2]=clamp(data[ni+2]+eB*3/16);}
          if(py+1<H){ni=((py+1)*W+px)*4;data[ni]=clamp(data[ni]+eR*5/16);data[ni+1]=clamp(data[ni+1]+eG*5/16);data[ni+2]=clamp(data[ni+2]+eB*5/16);}
          if(px+1<W&&py+1<H){ni=((py+1)*W+(px+1))*4;data[ni]=clamp(data[ni]+eR*1/16);data[ni+1]=clamp(data[ni+1]+eG*1/16);data[ni+2]=clamp(data[ni+2]+eB*1/16);}
        }
      }
      ctx.putImageData(imgData,0,0);
      window._bfCoverData=offscreen.toDataURL('image/png');
      // Show preview
      var preview=document.getElementById('bf-cover-preview');
      if(preview){preview.style.display='block';bookDrawCover(preview,window._bfCoverData);if(typeof showToast==="function")showToast("\U0001f5bc Cover added!");}
      var delBtn=document.getElementById('bf-cover-del');
      if(delBtn){delBtn.style.display='block';}
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function openEditBook(id){
  var b=books.find(function(x){return x.id===id;});
  if(!b)return;
  document.getElementById('bf-title').value=b.title;
  document.getElementById('bf-author').value=b.author||'';
  document.getElementById('bf-total').value=b.total;
  document.getElementById('bf-cur').value=b.current;
  var btn=document.querySelector('.book-form-btn');
  if(btn){btn.textContent='SAVE CHANGES';btn.onclick=function(){submitEditBook(id);};}
  var cancelBtn=document.getElementById('book-edit-cancel');
  if(cancelBtn){cancelBtn.style.display='inline-block';cancelBtn.onclick=function(){cancelEditBook();};}
  // Show/wire drop button
  var dropBtn=document.getElementById('book-drop-btn');
  if(dropBtn){
    dropBtn.style.display='inline-block';
    dropBtn.textContent='DROP BOOK';
    dropBtn.style.color='var(--cr)';
    dropBtn.style.borderColor='rgba(255,68,68,.35)';
    dropBtn.onclick=function(){dropBook(id);};
  }
  switchBooksTab('add');
  // Populate genre
  bfSetGenre(b.genre||'fiction');
  // Populate Kindle locations
  bfSetLocationsActive(!!b.useLocations);
  var _rpEditEl=document.getElementById('bf-real-pages');
  if(_rpEditEl){_rpEditEl.value=b.realPages||'';_rpEditEl.style.display=b.useLocations?'':'none';}
  // Populate library + due days
  bfSetLibraryActive(!!b.library);
  if(b.dueDate){
    var today=new Date();today.setHours(0,0,0,0);
    var due=new Date(b.dueDate+'T00:00:00');
    var diffDays=Math.round((due-today)/86400000);
    var dueEl=document.getElementById('bf-due');
    if(dueEl)dueEl.value=diffDays>0?diffDays:'';
  } else {
    var dueEl=document.getElementById('bf-due');
    if(dueEl)dueEl.value='';
  }
  // Show cover section in edit mode
  var coverRow=document.getElementById('book-cover-row');
  if(coverRow)coverRow.style.display='block';
  // Show current cover preview
  var preview=document.getElementById('bf-cover-preview');
  var delBtn=document.getElementById('bf-cover-del');
  if(b.cover){
    if(preview){preview.style.display='block';bookDrawCover(preview,b.cover);}
    if(delBtn){delBtn.style.display='block';delBtn.textContent='✕ REMOVE COVER';delBtn.dataset.coverDel='0';}
  } else {
    if(preview)preview.style.display='none';
    if(delBtn)delBtn.style.display='none';
  }
  if(delBtn){
    delBtn.onclick=function(){
      if(delBtn.dataset.coverDel==='1'){
        // Confirmed — remove cover
        var bk=books.find(function(x){return x.id===id;});
        if(bk){delete bk.cover;saveBooks();}
        if(preview)preview.style.display='none';
        delBtn.style.display='none';
        renderBooks();
      } else {
        delBtn.dataset.coverDel='1';
        delBtn.textContent='SURE? TAP AGAIN TO REMOVE';
        delBtn.style.color='#ff4444';
        setTimeout(function(){if(delBtn.dataset.coverDel==='1'){delBtn.dataset.coverDel='0';delBtn.textContent='✕ REMOVE COVER';delBtn.style.color='var(--cr)';}},3000);
      }
    };
  }
  // Show cover section (only in edit mode)
  var coverSection=document.getElementById('book-cover-section');
  if(coverSection)coverSection.style.display='block';
  // Populate cover preview
  var preview=document.getElementById('bf-cover-preview');
  var delBtn=document.getElementById('bf-cover-delete');
  if(b.cover&&preview){
    bookDrawCover(preview,b.cover);
    preview.style.display='block';
    if(delBtn){delBtn.style.display='block';delBtn.textContent='✕ REMOVE COVER';}
  } else {
    if(preview)preview.style.display='none';
    if(delBtn)delBtn.style.display='none';
  }
  // Store editing id for cover functions
  window._bfEditingId=id;
  setTimeout(function(){var el=document.getElementById('bf-title');if(el){el.focus();el.select();}},50);
}

function bfSetGenre(g){
  window._bfGenre=g;
  var fb=document.getElementById('bf-genre-fiction');
  var nb=document.getElementById('bf-genre-nonfiction');
  if(fb){fb.style.background=g==='fiction'?'rgba(122,79,255,.15)':'transparent';fb.style.color=g==='fiction'?'#9b6fff':'var(--dim)';fb.style.borderColor=g==='fiction'?'rgba(122,79,255,.4)':'rgba(122,79,255,.2)';}
  if(nb){nb.style.background=g==='nonfiction'?'rgba(122,79,255,.15)':'transparent';nb.style.color=g==='nonfiction'?'#9b6fff':'var(--dim)';nb.style.borderColor=g==='nonfiction'?'rgba(122,79,255,.4)':'rgba(122,79,255,.2)';}
}
function bfSetLocationsActive(on){
  window._bfUseLocations=on;
  var btn=document.getElementById('bf-loc-btn');
  if(btn){btn.style.background=on?'rgba(122,79,255,.15)':'transparent';btn.style.color=on?'#9b6fff':'var(--dim)';btn.style.borderColor=on?'rgba(122,79,255,.4)':'rgba(122,79,255,.2)';}
  var rp=document.getElementById('bf-real-pages');
  if(rp)rp.style.display=on?'':'none';
}

function bfToggleLocations(){
  var editBook=window._bfEditingId?books.find(function(b){return b.id===window._bfEditingId||b.id===+window._bfEditingId;}):null;
  if(editBook){
    editBook.useLocations=!editBook.useLocations;
    if(!editBook.useLocations){editBook.realPages=null;} // clear realPages when turning off
    bfSetLocationsActive(editBook.useLocations);
    // Update real pages input value
    var _rp=document.getElementById('bf-real-pages');
    if(_rp&&!editBook.useLocations)_rp.value='';
    saveBooks();renderBooks();
  } else {
    window._bfUseLocations=!window._bfUseLocations;
    if(!window._bfUseLocations)window._bfRealPages=null;
    bfSetLocationsActive(window._bfUseLocations);
    var _rp2=document.getElementById('bf-real-pages');
    if(_rp2&&!window._bfUseLocations)_rp2.value='';
  }
}

function bfSetLibraryActive(on){
  window._bfLibrary=on;
  var btn=document.getElementById('bf-library-btn');
  if(btn){btn.style.background=on?'rgba(122,79,255,.15)':'transparent';btn.style.color=on?'#9b6fff':'var(--dim)';btn.style.borderColor=on?'rgba(122,79,255,.4)':'rgba(122,79,255,.2)';}
}
function bfToggleLocations(){
  if(window._bfEditingId){
    var b=books.find(function(x){return x.id===window._bfEditingId||x.id===+window._bfEditingId;});
    if(b){b.useLocations=!b.useLocations;saveBooks();}
  } else {
    window._bfUseLocations=!window._bfUseLocations;
  }
  renderBooks();
}

function bfToggleLibrary(){
  bfSetLibraryActive(!window._bfLibrary);
  if(!window._bfLibrary){var due=document.getElementById('bf-due');if(due)due.value='';}
}
function bfGetGenre(){return window._bfGenre||'fiction';}
function bfGetLibrary(){return !!window._bfLibrary;}
function bfReset(){window._bfGenre='fiction';window._bfLibrary=false;window._bfCoverData=null;bfSetGenre('fiction');bfSetLibraryActive(false);}
var _dropPending=false;
function dropBook(id){
  var dropBtn=document.getElementById('book-drop-btn');
  if(!_dropPending){
    _dropPending=true;
    if(dropBtn){dropBtn.textContent='SURE? TAP AGAIN';dropBtn.style.background='rgba(255,68,68,.1)';}
    setTimeout(function(){
      if(_dropPending){
        _dropPending=false;
        if(dropBtn){dropBtn.textContent='✕ DROP BOOK';dropBtn.style.background='transparent';}
      }
    },3000);
    return;
  }
  _dropPending=false;
  var b=books.find(function(x){return x.id===id;});
  if(!b)return;
  b.done=true;
  b.dropped=true;
  b.doneDate=localDateStr();
  saveBooks();
  var btn=document.querySelector('.book-form-btn');
  if(btn){btn.textContent='ADD BOOK';btn.onclick=submitAddBook;}
  var cancelBtn=document.getElementById('book-edit-cancel');
  if(cancelBtn)cancelBtn.style.display='none';
  var editActs=document.getElementById('book-edit-actions');if(editActs)editActs.style.display='none';
  if(dropBtn){dropBtn.style.display='none';dropBtn.style.background='transparent';}
  bfReset();
  cancelEditBook();
  renderBooks();
}
function cancelEditBook(){
  var coverSection=document.getElementById('book-cover-section');
  if(coverSection)coverSection.style.display='none';
  var preview=document.getElementById('bf-cover-preview');
  if(preview)preview.style.display='none';
  var inp=document.getElementById('bf-cover-input');
  if(inp)inp.value='';
  window._bfEditingId=null;
  bfSetLocationsActive(false); // reset locations toggle on clear
  var cr=document.getElementById('book-cover-row');if(cr)cr.style.display='none';
  var pr=document.getElementById('bf-cover-preview');if(pr)pr.style.display='none';
  var btn=document.querySelector('.book-form-btn');
  if(btn){btn.textContent='ADD BOOK';btn.onclick=submitAddBook;}
  var cancelBtn=document.getElementById('book-edit-cancel');
  if(cancelBtn)cancelBtn.style.display='none';
  var editActs=document.getElementById('book-edit-actions');if(editActs)editActs.style.display='none';
  document.getElementById('bf-title').value='';
  document.getElementById('bf-author').value='';
  document.getElementById('bf-total').value='';
  document.getElementById('bf-cur').value='';
  var dueEl2=document.getElementById('bf-due');if(dueEl2)dueEl2.value='';
  bfReset();
  var dropBtn2=document.getElementById('book-drop-btn');
  if(dropBtn2)dropBtn2.style.display='none';
  switchBooksTab('reading');
}
function submitEditBook(id){
  booksEnforceCoverLimit();
  var b=books.find(function(x){return x.id===id;});
  if(!b)return;
  // Save cover if uploaded in form
  if(window._bfCoverData){b.cover=window._bfCoverData;window._bfCoverData=null;booksPruneCoversByDate();}
  var cr=document.getElementById('book-cover-row');if(cr)cr.style.display='none';
  var pr=document.getElementById('bf-cover-preview');if(pr)pr.style.display='none';
  var title=(document.getElementById('bf-title').value||'').trim();
  var author=(document.getElementById('bf-author').value||'').trim();
  var total=parseInt(document.getElementById('bf-total').value)||0;
  var cur=parseInt(document.getElementById('bf-cur').value)||0;
  if(!title||!total)return;
  b.title=title;b.author=author;b.total=total;
  b.current=Math.min(Math.max(0,cur),total);
  // Update library & due date
  b.library=bfGetLibrary()||false;
  var _eDueDays=parseInt((document.getElementById('bf-due')||{}).value)||0;
  if(_eDueDays>0){
    var _eDd=new Date();_eDd.setDate(_eDd.getDate()+_eDueDays);
    b.dueDate=localDateStr(_eDd);
    b.library=true;
  } else if(!b.library){
    b.dueDate=null;
  }
  // Update genre
  var _eGenre=bfGetGenre();
  if(_eGenre)b.genre=_eGenre;
  saveBooks();
  var btn=document.querySelector('.book-form-btn');
  if(btn){btn.textContent='ADD BOOK';btn.onclick=submitAddBook;}
  var cancelBtn=document.getElementById('book-edit-cancel');
  if(cancelBtn)cancelBtn.style.display='none';
  var editActs=document.getElementById('book-edit-actions');if(editActs)editActs.style.display='none';
  var dropBtn3=document.getElementById('book-drop-btn');
  if(dropBtn3)dropBtn3.style.display='none';
  document.getElementById('bf-title').value='';
  document.getElementById('bf-author').value='';
  document.getElementById('bf-total').value='';
  document.getElementById('bf-cur').value='';
  switchBooksTab('reading');
  renderBooks();
  confetti(window.innerWidth/2,200,'#9b6fff');
}

// ── BOOK COVER IN EDIT FORM ──
function bfPreviewCover(input){
  var file=input.files[0];
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var W=70,H=Math.round(img.height*(W/img.width));
      var offscreen=document.createElement('canvas');
      offscreen.width=W;offscreen.height=H;
      var ctx=offscreen.getContext('2d');
      ctx.drawImage(img,0,0,W,H);
      var imgData=ctx.getImageData(0,0,W,H);
      var data=imgData.data;
      var levels=10;
      var clamp=function(v){return Math.max(0,Math.min(255,v));};
      var quantize=function(v){return Math.round(v/255*(levels-1))*(255/(levels-1));};
      for(var py=0;py<H;py++){
        for(var px=0;px<W;px++){
          var pi=(py*W+px)*4;
          var oldR=data[pi],oldG=data[pi+1],oldB=data[pi+2];
          var newR=quantize(oldR),newG=quantize(oldG),newB=quantize(oldB);
          data[pi]=newR;data[pi+1]=newG;data[pi+2]=newB;
          var eR=oldR-newR,eG=oldG-newG,eB=oldB-newB;
          var ni;
          if(px+1<W){ni=(py*W+(px+1))*4;data[ni]=clamp(data[ni]+eR*7/16);data[ni+1]=clamp(data[ni+1]+eG*7/16);data[ni+2]=clamp(data[ni+2]+eB*7/16);}
          if(px-1>=0&&py+1<H){ni=((py+1)*W+(px-1))*4;data[ni]=clamp(data[ni]+eR*3/16);data[ni+1]=clamp(data[ni+1]+eG*3/16);data[ni+2]=clamp(data[ni+2]+eB*3/16);}
          if(py+1<H){ni=((py+1)*W+px)*4;data[ni]=clamp(data[ni]+eR*5/16);data[ni+1]=clamp(data[ni+1]+eG*5/16);data[ni+2]=clamp(data[ni+2]+eB*5/16);}
          if(px+1<W&&py+1<H){ni=((py+1)*W+(px+1))*4;data[ni]=clamp(data[ni]+eR*1/16);data[ni+1]=clamp(data[ni+1]+eG*1/16);data[ni+2]=clamp(data[ni+2]+eB*1/16);}
        }
      }
      ctx.putImageData(imgData,0,0);
      var compressed=offscreen.toDataURL('image/jpeg',0.60);
      // Save to book immediately
      var id=window._bfEditingId;
      if(id){
        var bk=books.find(function(b){return b.id===id;});
        if(bk){
          bk.cover=compressed;
          booksEnforceCoverLimit();
          saveBooks();
        }
      }
      // Show preview
      var preview=document.getElementById('bf-cover-preview');
      if(preview){bookDrawCover(preview,compressed);preview.style.display='block';}
      var delBtn=document.getElementById('bf-cover-delete');
      if(delBtn){delBtn.style.display='block';delBtn.textContent='✕ REMOVE COVER';}
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

var _bfDeletePending=false;
function bfDeleteCover(){
  var delBtn=document.getElementById('bf-cover-delete');
  if(!_bfDeletePending){
    _bfDeletePending=true;
    if(delBtn)delBtn.textContent='SURE? TAP AGAIN';
    setTimeout(function(){
      _bfDeletePending=false;
      if(delBtn)delBtn.textContent='✕ REMOVE COVER';
    },3000);
    return;
  }
  _bfDeletePending=false;
  var id=window._bfEditingId;
  if(id){
    var bk=books.find(function(b){return b.id===id;});
    if(bk){delete bk.cover;saveBooks();renderBooks();}
  }
  var preview=document.getElementById('bf-cover-preview');
  if(preview)preview.style.display='none';
  if(delBtn){delBtn.style.display='none';delBtn.textContent='✕ REMOVE COVER';}
  var inp=document.getElementById('bf-cover-input');
  if(inp)inp.value='';
}

function booksEnforceCoverLimit(){
  // Keep covers only for the 15 most recently started/added books
  var withCover=books.filter(function(b){return b.cover;});
  if(withCover.length<=15)return;
  // Sort by startDate descending (most recent first), then by id
  var sorted=withCover.slice().sort(function(a,b){
    var da=a.startDate||'';var db=b.startDate||'';
    if(db!==da)return db>da?1:-1;
    return b.id-a.id;
  });
  // Remove covers from books beyond position 15
  sorted.slice(15).forEach(function(b){delete b.cover;});
}
// ── BOOKS BLOCK PROGRESS BAR ENGINE ──
var _bkLastAnimTime = 0;
var _bkObserver = null;
var _bkAnimating = false;

function bkObserveProgressBars(){
  if(_bkObserver){_bkObserver.disconnect();_bkObserver=null;}
  // Watch the card tile, not the inner body (which may be display:none)
  var wrap=document.querySelector('[data-id="books"]')||document.getElementById('books-body');
  if(!wrap)return;
  _bkObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting)bkMaybeAnimate();
    });
  },{threshold:0.1});
  _bkObserver.observe(wrap);
  // Check immediately
  var rect=wrap.getBoundingClientRect();
  if(rect.top<window.innerHeight&&rect.bottom>0)bkMaybeAnimate();
}

function bkMaybeAnimate(){
  var now=Date.now();
  var fiveMins=5*60*1000;
  if(_bkAnimating)return;
  if(_bkLastAnimTime&&(now-_bkLastAnimTime)<fiveMins)return;
  _bkLastAnimTime=now;
  bkRunAnimation();
}

function bkRunAnimation(){
  var bars=document.querySelectorAll('.book-bar-fill[data-barpct]');
  if(!bars.length)return;
  _bkAnimating=true;

  var barData=[];
  bars.forEach(function(bar){
    bar.innerHTML='';
    bar.style.width='0';
    var wrap=bar.parentElement;
    // Get width from wrap, or from books-reading, or from bar's tile
    var totalW=0;
    if(wrap&&wrap.offsetWidth>0){totalW=wrap.offsetWidth;}
    else{
      var _rEl=document.getElementById('books-reading');
      if(_rEl&&_rEl.offsetWidth>0)totalW=_rEl.offsetWidth-32;
      else{
        var _tile=document.querySelector('[data-id="books"]');
        if(_tile)totalW=(_tile.offsetWidth||300)-32;
        else totalW=260;
      }
    }
    // each block = 11px (10px + 1px border-right)
    var blockW=11;
    var maxBlocks=Math.floor(totalW/blockW);
    if(maxBlocks<1)maxBlocks=1;
    var pct=parseFloat(bar._bkTarget||bar.dataset.barpct)||0;
    var targetBlocks=Math.max(0,Math.round(pct/100*maxBlocks));
    barData.push({
      bar:bar,
      wrap:wrap,
      totalW:totalW,
      blockW:blockW,
      target:targetBlocks,
      current:0,
      done:!!(bar._bkDone||bar.classList.contains('done'))
    });
  });

  var STEP_MS=100;

  function step(){
    var anyLeft=false;
    barData.forEach(function(d){
      if(d.current<d.target){
        anyLeft=true;
        d.current++;
        var block=document.createElement('div');
        block.className='book-bar-block'+(d.done?' done-block':'');
        d.bar.appendChild(block);
        // Grow the fill div to match blocks added
        d.bar.style.width=(d.current*d.blockW)+'px';
      }
    });
    if(anyLeft)setTimeout(step,STEP_MS);
    else _bkAnimating=false;
  }

  setTimeout(step,250);
}

function renderBooks(){
  var reading=books.filter(function(b){return !b.done;});
  var done=books.filter(function(b){return b.done;});
  // ADD BOOK button will be appended after rEl is ready (below)

  // ── Win98 block progress bars ──
  document.querySelectorAll('.book-bar-fill[data-barpct]').forEach(function(bar){
    bar._bkTarget=parseFloat(bar.dataset.barpct)||0;
    bar._bkDone=bar.classList.contains('done');
    bar.innerHTML='';
    bar.style.width='0';
  });
  // Reset cooldown so bars always animate after a render
  _bkLastAnimTime=0;
  _bkAnimating=false;
  // Trigger animation after paint so offsetWidth is correct
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      bkObserveProgressBars();
    });
  });


  var dTab=document.getElementById('books-tab-done');
  if(dTab)dTab.textContent='DONE'+(done.length?'('+done.length+')':'');
  var rEl=document.getElementById('books-reading');
  // Add book button — appended here after rEl is defined
  if(rEl){
    if(!reading.length){
      rEl.innerHTML='<div class="books-empty">No books in progress. Hit +ADD to start.</div>';
    } else {
      var h='';
      for(var i=0;i<reading.length;i++){
        var b=reading[i];
        var isLoc=b.useLocations;
        var pct=(!isLoc&&b.total>0)?Math.round((b.current/b.total)*100):0;
        var BCOLS=['#ff5fa0','#00e5ff','#ffcc00','#00ff88','#ff8c42','#c77dff','#aaff00','#ff6b6b','#4ecdc4','#ffd93d'];
        var bcol=BCOLS[i%BCOLS.length];
                // Due date helper
        var bookDueLine='';
        if(b.dueDate){
          var _now=new Date();
          var _due=new Date(b.dueDate+'T00:00:00');
          var _today=new Date(_now.getFullYear(),_now.getMonth(),_now.getDate());
          var _diff=Math.round((_due-_today)/(864e5));
          var _uc=_diff<=0?'#ff4444':_diff<=3?'#ff4444':_diff<=7?'#ffcc00':'#9b6fff';
          var _msg=_diff<=0?'&#128218; OVERDUE by '+Math.abs(_diff)+'d':_diff===1?'&#128218; Due tomorrow':'&#128218; Due in '+_diff+' days';
          bookDueLine='<div style="font-size:var(--t-md);font-weight:bold;color:'+_uc+';margin:2px 0 5px">'+_msg+'</div>';
          window._bookDueColor=_uc;window._bookDueMsg=_msg.replace(/&#128218; /,'');
        }
          // outer flex: [cover] [right-column]
          h+='<div style="display:flex;gap:6px;margin-bottom:10px;border-bottom:1px solid var(--c-ghost);padding-bottom:8px">'
          // Cover to the left of the vertical bar
          +(b.cover?'<canvas id="bcover-'+b.id+'" style="image-rendering:pixelated;flex-shrink:0;align-self:flex-start;border-radius:1px;width:70px"></canvas>':'')
          // Right column — contains colored bar + all content
          +'<div style="flex:1;border-left:3px solid '+bcol+'40;padding-left:8px;min-width:0;display:flex;flex-direction:column;gap:0">'
            // Title
            +'<div class="book-title" style="margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+b.title+'</div>'
            // Author
            +(b.author?'<div style="font-size:var(--t-base);color:var(--dim);margin-bottom:5px">'+b.author+'</div>':'')
            // Started + due row
            +'<div style="display:flex;gap:12px;font-size:var(--t-xs);color:var(--dim);margin-bottom:6px">'
            +(b.startDate?'<span>Started '+b.startDate+'</span>':'')
            +(bookDueLine?'<span style="color:'+(window._bookDueColor||'var(--dim)')+'">'+( window._bookDueMsg||'')+'</span>':'')
            +'</div>'
            // Progress bar + stats
            +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
              +'<div class="book-bar-wrap" style="flex:1;background:'+bcol+'18"><div class="book-bar-fill" data-barpct="'+Math.min(pct,100)+'" style="background:'+bcol+'"></div></div>'
              +'<div style="font-size:var(--t-sm);color:'+bcol+';white-space:nowrap;flex-shrink:0">'
                +'<span class="book-pct">'+pct+'%</span>'
                +' <span style="opacity:.4">|</span> '
                +'<span id="bpg-'+b.id+'" onclick="startEditPage('+b.id+')" style="cursor:pointer;opacity:.8;border-bottom:1px dashed '+bcol+'55">p.'+(isLoc?'loc '+b.current+(b.total?' of '+b.total:'')+(b.realPages?' ('+b.realPages+'p)':''):b.current+'/'+b.total)+'</span>'
              +'</div>'
            +'</div>'
            // Action buttons
            +'<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">'
              +'<span class="book-btn" onclick="openEditBook('+b.id+')" style="color:#9b6fff;border-color:rgba(122,79,255,.4)">&#9998;</span>'
              +'<span class="book-btn finish" id="bfin-'+b.id+'" onclick="finishBook('+b.id+')">&#10003;</span>'
              +'<span class="book-btn" id="bdel-'+b.id+'" onclick="deleteBook('+b.id+')" style="color:var(--cr);border-color:rgba(255,68,68,.35)">&#x2715;</span>'

            +'</div>'
          +'</div>'
          +'</div>';

      }
      rEl.innerHTML=h;
      // Draw dithered covers — defer if bookDrawCover not yet loaded (js2)
      var drawCovers=function(){
        reading.forEach(function(b){
          if(b.cover){
            var canvas=document.getElementById('bcover-'+b.id);
            if(canvas)bookDrawCover(canvas,b.cover);
          }
        });
      };
      if(typeof bookDrawCover==='function'){drawCovers();}
      else{setTimeout(drawCovers,600);}
    }
    // + ADD BOOK button always visible at bottom
    var rAddBtn=document.createElement('button');
    rAddBtn.textContent='+ ADD BOOK';
    rAddBtn.style.cssText='width:100%;margin-top:10px;padding:10px;background:rgba(122,79,255,.06);border:1px solid rgba(122,79,255,.3);color:#9b6fff;font-family:monospace;font-size:var(--t-md);cursor:pointer;letter-spacing:1px';
    var _switchAdd=function(){switchBooksTab('add');};
    rAddBtn.onclick=_switchAdd;
    // Scroll-aware touch — only fire if finger didn't move (not a swipe)
    var _rAddTY=0,_rAddTX=0;
    rAddBtn.ontouchstart=function(e){_rAddTX=e.touches[0].clientX;_rAddTY=e.touches[0].clientY;};
    var _gTXA1=0,_gTYA1=0;
    rAddBtn.ontouchstart=function(e){_gTXA1=e.touches[0].clientX;_gTYA1=e.touches[0].clientY;};
    rAddBtn.ontouchend=function(e){
      var dx=Math.abs(e.changedTouches[0].clientX-_rAddTX);
      var dy=Math.abs(e.changedTouches[0].clientY-_rAddTY);
      if(dx>10||dy>10)return; // was a swipe, ignore
      if(Math.abs(e.changedTouches[0].clientX-_gTXA1)>8||Math.abs(e.changedTouches[0].clientY-_gTYA1)>8)return;
      e.preventDefault();
      _switchAdd();
    };
    if(rEl)rEl.appendChild(rAddBtn);
  }
  var dEl=document.getElementById('books-done');
  if(dEl){
    dEl.style.maxHeight='700px';
    dEl.style.overflowY='auto';
    if(!done.length){
      dEl.innerHTML='<div class="books-empty">No finished books yet.</div>';
    } else {
      // Controls
      if(!window._bookDoneHideDropped)window._bookDoneHideDropped=false;
      if(!window._bookDoneOrder)window._bookDoneOrder='newest';
      var ctrlH='<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center">';
      ctrlH+='<button id="bdone-toggle-dropped" style="font-size:var(--t-xs);padding:3px 9px;background:'+(window._bookDoneHideDropped?'rgba(255,68,68,.12)':'transparent')+';border:1px solid '+(window._bookDoneHideDropped?'rgba(255,68,68,.4)':'rgba(255,255,255,.12)')+';color:'+(window._bookDoneHideDropped?'var(--cr)':'var(--dim)')+';font-family:monospace;cursor:pointer">'+(window._bookDoneHideDropped?'SHOW DROPPED':'HIDE DROPPED')+'</button>';
      ctrlH+='<button id="bdone-toggle-order" style="font-size:var(--t-xs);padding:3px 9px;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--dim);font-family:monospace;cursor:pointer">'+(window._bookDoneOrder==='newest'?'NEWEST FIRST':'OLDEST FIRST')+'</button>';
      ctrlH+='</div>';

      // Filter + sort
      var displayDone=done.slice();
      if(window._bookDoneHideDropped)displayDone=displayDone.filter(function(b){return !b.dropped;});
      if(window._bookDoneOrder==='oldest')displayDone=displayDone.reverse();

      // Group by year
      var byYear={};
      displayDone.forEach(function(b){
        var yr='Unknown';
        if(b.doneDate){
          if(b.doneDate.match(/^\d{4}-/))yr=b.doneDate.slice(0,4);
          else{var _m=b.doneDate.match(/(\d{4})$/);if(_m)yr=_m[1];}
        }
        if(!byYear[yr])byYear[yr]=[];
        byYear[yr].push(b);
      });
      var years=Object.keys(byYear).sort(function(a,b){return b-a;});
      var curYear=new Date().getFullYear().toString();
      if(!window._bookDoneCollapsed)window._bookDoneCollapsed={};

      var h='';
      // Sort years
      if(window._bookDoneOrder==='oldest')years.reverse();

      years.forEach(function(yr){
        var bks=byYear[yr];
        // Default: current year open, others collapsed
        if(window._bookDoneCollapsed[yr]===undefined)window._bookDoneCollapsed[yr]=(yr!==curYear);
        var collapsed=window._bookDoneCollapsed[yr];
        h+='<div data-bookyr="'+yr+'" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(155,111,255,.15);cursor:pointer;user-select:none">';
        h+='<span style="font-size:var(--t-base);color:#9b6fff;font-weight:bold;letter-spacing:1px">'+yr+'</span>';
        h+='<span class="dim-10">'+bks.length+' book'+(bks.length!==1?'s':'')+'&nbsp;&nbsp;'+(collapsed?'▶':'▼')+'</span>';
        h+='</div>';

        if(!collapsed){
          bks.forEach(function(b){
            var isEditingReview=window._bookReviewEdit===b.id;
            // Days to finish
            var daysStr='';
            if(b.startDate&&b.doneDate){
              var s=new Date(b.startDate+'T00:00:00');
              var e=new Date(b.doneDate.length===10?b.doneDate+'T00:00:00':b.doneDate);
              var days=Math.round((e-s)/864e5);
              if(days>0)daysStr=days+' days';
            }

            h+='<div class="book-done-item" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)">';
            // Cover + content row
            h+='<div style="display:flex;gap:8px;align-items:flex-start">';
            // Cover
            if(b.cover){
              h+='<canvas id="bcover-done-'+b.id+'" style="width:55px;image-rendering:pixelated;flex-shrink:0;border-radius:1px;align-self:flex-start"></canvas>';
            }
            // Right column
            h+='<div class="flex-1">';
            // Title + dropped badge
            h+='<div class="book-done-title" style="margin-bottom:3px">'+b.title+(b.dropped?' <span style="font-size:var(--t-xs);color:var(--cr);border:1px solid rgba(255,68,68,.35);padding:1px 5px">DROPPED</span>':'')+'</div>';
            // Stats row: pages · finished · days
            h+='<div style="font-size:var(--t-xs);color:var(--dim);margin-bottom:6px;display:flex;gap:8px;flex-wrap:wrap">';
            if(b.total)h+='<span>'+b.total+' pages</span>';
            if(b.doneDate){
              var _dd=b.doneDate;
              // Normalize legacy locale-string format to displayable
              if(_dd.match(/^\d{4}-/)){
                var _dp=_dd.split('-');
                var _months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                _dd=_months[parseInt(_dp[1],10)-1]+' '+parseInt(_dp[2],10)+', '+_dp[0];
              }
              h+='<span>Finished '+_dd+'</span>';
            }
            if(daysStr)h+='<span>'+daysStr+' to finish</span>';
            h+='</div>';
            // Buttons
            h+='<div style="display:flex;gap:4px;margin-bottom:6px">';
            h+='<span class="book-btn" onclick="toggleBookReview('+b.id+')" style="color:var(--ca);border-color:rgba(255,204,0,.35)" title="Review">&#9998;</span>';
            h+='<span class="book-btn" onclick="openEditBook('+b.id+')" style="color:#9b6fff;border-color:rgba(122,79,255,.4)">&#128218;</span>';
            h+='<span class="book-btn" id="bdel-'+b.id+'" onclick="deleteBook('+b.id+')" style="color:var(--cr);border-color:rgba(255,68,68,.35)">&#x2715;</span>';
            h+='</div>';
            // Review
            if(isEditingReview){
              h+='<div style="margin-top:4px"><textarea id="br-inp-'+b.id+'" placeholder="Write your review..." style="width:100%;min-height:80px;background:rgba(255,204,0,.04);border:1px solid rgba(255,204,0,.25);color:var(--text);font-family:monospace;font-size:var(--t-md);padding:8px;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6">'+( b.review||'')+'</textarea><div style="display:flex;gap:6px;margin-top:4px"><button onclick="saveBookReview('+b.id+')" style="flex:1;padding:5px;background:transparent;border:1px solid var(--ca);color:var(--ca);font-family:monospace;font-size:var(--t-base);cursor:pointer">SAVE</button><button onclick="window._bookReviewEdit=null;renderBooks()" style="padding:5px 10px;background:transparent;border:1px solid var(--c-faint);color:var(--dim);font-family:monospace;font-size:var(--t-base);cursor:pointer">CANCEL</button></div></div>';
            } else if(b.review){
              h+='<div style="margin-top:4px;padding:7px;background:rgba(255,204,0,.04);border-left:2px solid rgba(255,204,0,.3);font-size:var(--t-base);color:var(--text);line-height:1.6;white-space:pre-wrap">'+b.review+'</div>';
            }
            h+='</div></div></div>';
          });
        }
      });

      dEl.innerHTML=ctrlH+h;

      // Wire controls
      var bdTogDrop=document.getElementById('bdone-toggle-dropped');
      if(bdTogDrop)bdTogDrop.onclick=function(){window._bookDoneHideDropped=!window._bookDoneHideDropped;renderBooks();};
      var bdTogOrd=document.getElementById('bdone-toggle-order');
      if(bdTogOrd)bdTogOrd.onclick=function(){window._bookDoneOrder=(window._bookDoneOrder==='newest'?'oldest':'newest');renderBooks();};

      // Wire year collapse toggles
      dEl.querySelectorAll('[data-bookyr]').forEach(function(hdr){
        hdr.onclick=function(){
          var yr=this.dataset.bookyr;
          window._bookDoneCollapsed[yr]=!window._bookDoneCollapsed[yr];
          renderBooks();
        };
      });

      // Draw covers — defer to let DOM paint first
      var drawDoneCovers=function(){
        displayDone.forEach(function(b){
          if(b.cover){
            var canvas=document.getElementById('bcover-done-'+b.id);
            if(canvas && typeof bookDrawCover==='function') bookDrawCover(canvas,b.cover);
          }
        });
      };
      if(typeof bookDrawCover==='function'){setTimeout(drawDoneCovers,80);}
      else{setTimeout(drawDoneCovers,600);}
    }
  }
}
var BOOK_REVIEW_QS=[
  {id:'q1', label:'Overall rating', type:'stars', max:5},
  {id:'q2', label:'What did you enjoy most?', type:'text'},
  {id:'q3', label:'What was the key idea or lesson?', type:'text'},
  {id:'q5', label:'One sentence summary', type:'text'},
  {id:'q6', label:'How did it change you?', type:'text'},
  {id:'q7', label:'Favourite quote or passage', type:'text'},
  {id:'q8', label:'How was the writing style? (prose, pacing, voice)', type:'text'},
];

function renderBookReviews(){
  var el=document.getElementById('books-reviews');
  if(!el)return;
  var done=books.filter(function(b){return b.done;});
  if(!done.length){
    el.innerHTML='<div class="books-empty">No finished books yet.</div>';
    return;
  }
  var h='';
  done.forEach(function(b){
    var rev=b.structuredReview||{};
    var hasReview=Object.keys(rev).some(function(k){return rev[k];});
    var stars=rev.q1||0;
    var starStr='';
    for(var s=1;s<=5;s++)starStr+='<span data-brstar="'+b.id+'" data-val="'+s+'" style="font-size:var(--t-body);cursor:pointer;color:'+(s<=stars?'#ffcc00':'rgba(255,255,255,.2)')+'">&#9733;</span>';
    h+='<div style="border:1px solid rgba(255,255,255,.07);border-radius:2px;margin-bottom:10px;overflow:hidden">';
    h+='<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,.02);cursor:pointer" data-brexpand="'+b.id+'">';
    h+='<div style="font-size:var(--t-md);font-weight:600;flex:1">'+b.title+'</div>';
    h+='<div class="dim-10">'+starStr+'</div>';
    h+='<div style="font-size:var(--t-sm);color:var(--dim);margin-left:4px">'+(hasReview?'&#10003;':'&#9998;')+'</div>';
    h+='</div>';
    if(window['_brOpen_'+b.id]){
      h+='<div style="padding:12px">';
      h+='<div class="mb-10"><div class="label-dim-xs">RATING</div>';
      h+='<div id="brstars-'+b.id+'">'+starStr+'</div></div>';
      BOOK_REVIEW_QS.slice(1).forEach(function(q){
        h+='<div class="mb-10">';
        h+='<div class="label-dim-xs">'+q.label.toUpperCase()+'</div>';
        h+='<textarea id="brq-'+b.id+'-'+q.id+'" style="width:100%;min-height:56px;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.08);color:var(--text);font-family:monospace;font-size:var(--t-md);padding:4px 0;outline:none;resize:none;box-sizing:border-box;line-height:1.5">'+( rev[q.id]||'')+'</textarea>';
        h+='</div>';
      });
      h+='<button data-brsave="'+b.id+'" style="width:100%;padding:8px;background:rgba(255,204,0,.06);border:1px solid rgba(255,204,0,.3);color:var(--ca);font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:1px">SAVE REVIEW</button>';
      h+='</div>';
    }
    h+='</div>';
  });
  el.innerHTML=h;

  // Wire expand
  el.querySelectorAll('[data-brexpand]').forEach(function(btn){
    btn.onclick=function(){
      var bid=this.dataset.brexpand;
      window['_brOpen_'+bid]=!window['_brOpen_'+bid];
      renderBookReviews();
    };
  });
  // Wire stars
  el.querySelectorAll('[data-brstar]').forEach(function(star){
    star.onclick=function(e){
      e.stopPropagation();
      var bid=this.dataset.brstar;
      var val=parseInt(this.dataset.val);
      var b=books.find(function(x){return x.id===bid||x.id===+bid;});
      if(!b)return;
      if(!b.structuredReview)b.structuredReview={};
      b.structuredReview.q1=val;
      saveBooks();
      renderBookReviews();
    };
  });
  // Wire save
  el.querySelectorAll('[data-brsave]').forEach(function(btn){
    btn.onclick=function(){
      var bid=this.dataset.brsave;
      var b=books.find(function(x){return x.id===bid||x.id===+bid;});
      if(!b)return;
      if(!b.structuredReview)b.structuredReview={};
      BOOK_REVIEW_QS.slice(1).forEach(function(q){
        var inp=document.getElementById('brq-'+bid+'-'+q.id);
        if(inp)b.structuredReview[q.id]=inp.value.trim();
      });
      saveBooks();
      this.textContent='\u2713 SAVED';
      setTimeout(function(){renderBookReviews();},800);
    };
  });
}

function renderBooksStats(){
  var el=document.getElementById('books-stats');if(!el)return;
  var now=new Date();
  var thisYear=now.getFullYear();
  var thisMonth=now.getMonth();
  var allBooks=books;
  var done=allBooks.filter(function(b){return b.done;});
  var finished=done.filter(function(b){return !b.dropped;});
  var dropped=done.filter(function(b){return b.dropped;});
  var reading=allBooks.filter(function(b){return !b.done;});

  // Helper: parse doneDate to Date object
  function parseDate(s){if(!s)return null;var d=new Date(s.length===10?s+'T00:00:00':s);return isNaN(d.getTime())?null:d;}

  // Period filters on finished+dropped (all "done" books)
  function doneInPeriod(startDate){
    return finished.filter(function(b){
      var d=parseDate(b.doneDate);
      return d&&d>=startDate;
    });
  }
  var now0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var startOfMonth=new Date(thisYear,thisMonth,1);
  var startOfYear=new Date(thisYear,0,1);
  var start2Yr=new Date(thisYear-2,now.getMonth(),now.getDate());
  var thisMonthBooks=doneInPeriod(startOfMonth);
  var thisYearBooks=doneInPeriod(startOfYear);
  var twoYearBooks=doneInPeriod(start2Yr);

  // Pages
  var totalPagesDone=done.reduce(function(a,b){
  if(b.useLocations)return a+(b.realPages||0); // Kindle: use real page count
  return a+(b.dropped?b.current:b.total)||0;
},0);
  var totalPagesReading=reading.reduce(function(a,b){return a+(b.current||0);},0);

  // Avg days (finished only, not dropped)
  var timed=finished.filter(function(b){return b.startDate&&b.doneDate;});
  var avgDays=0;
  if(timed.length){
    var totD=timed.reduce(function(a,b){
      var s=parseDate(b.startDate);var e=parseDate(b.doneDate);
      return a+(s&&e?Math.max(1,Math.round((e-s)/864e5)):30);
    },0);
    avgDays=Math.round(totD/timed.length);
  }

  // Fastest and slowest book
  var fastest=null,slowest=null;
  timed.forEach(function(b){
    var s=parseDate(b.startDate);var e=parseDate(b.doneDate);
    if(!s||!e)return;
    var days=Math.max(1,Math.round((e-s)/864e5));
    if(!fastest||days<fastest.days)fastest={b:b,days:days};
    if(!slowest||days>slowest.days)slowest={b:b,days:days};
  });

  // Genre breakdown
  var fDone=finished.filter(function(b){return (b.genre||'fiction')==='fiction';}).length;
  var nDone=finished.filter(function(b){return b.genre==='nonfiction';}).length;
  var maxBar=Math.max(fDone,nDone,1);

  // Pages per year breakdown (last 4 years)
  var pagesByYear={};
  done.forEach(function(b){
    var d=parseDate(b.doneDate);if(!d)return;
    var yr=d.getFullYear();
    pagesByYear[yr]=(pagesByYear[yr]||0)+(b.dropped?b.current:b.total);
  });
  var booksByYear={};
  finished.forEach(function(b){
    var d=parseDate(b.doneDate);if(!d)return;
    var yr=d.getFullYear();
    booksByYear[yr]=(booksByYear[yr]||0)+1;
  });

  var h='';

  //  PERIOD COUNTS 
  h+='<div class="label-dim-wide">BOOKS COMPLETED</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px">';
  function pstat(val,lbl,sub){
    return '<div style="text-align:center;padding:8px 4px;border:1px solid rgba(122,79,255,.12);background:rgba(122,79,255,.04)">'
      +'<div style="font-family:VT323,monospace;font-size:30px;color:#9b6fff;line-height:1">'+val+'</div>'
      +'<div class="dim-9-ls">'+lbl+'</div>'
      +(sub?'<div style="font-size:var(--t-xxs);color:var(--dim);opacity:.5;margin-top:2px">'+sub+'</div>':'')
      +'</div>';
  }
  h+=pstat(thisMonthBooks.length,'THIS MONTH');
  h+=pstat(thisYearBooks.length,'THIS YEAR',thisYear+'');
  h+=pstat(twoYearBooks.length,'PAST 2 YEARS');
  h+=pstat(finished.length,'ALL TIME',dropped.length?dropped.length+' dropped':'');
  h+='</div>';

  //  READING ACTIVITY 
  h+='<div class="label-dim-wide">READING ACTIVITY</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px">';
  h+=pstat(totalPagesDone.toLocaleString(),'PAGES READ','finished books');
  h+=pstat(reading.length,'IN PROGRESS','currently');
  h+=pstat(avgDays||'—','AVG DAYS/BOOK','finished only');
  h+=pstat(Math.round((thisYearBooks.length/Math.max(1,(now.getMonth()+1)))*12*10)/10,'PACE','books/yr at current rate');
  h+='</div>';

  //  FASTEST / SLOWEST 
  if(fastest&&slowest&&fastest.b.id!==slowest.b.id){
    h+='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:2px;margin-bottom:6px">EXTREMES</div>';
    h+='<div class="mb-14">';
    h+='<div style="display:flex;align-items:baseline;gap:6px;padding:5px 0;border-bottom:1px solid var(--c-ghost)">';
    h+='<span style="font-size:var(--t-xs);color:var(--cg);width:56px;flex-shrink:0">FASTEST</span>';
    h+='<span class="text-11-flex">'+fastest.b.title+'</span>';
    h+='<span style="font-size:var(--t-sm);color:var(--cg)">'+fastest.days+'d</span>';
    h+='</div>';
    h+='<div style="display:flex;align-items:baseline;gap:6px;padding:5px 0;border-bottom:1px solid var(--c-ghost)">';
    h+='<span style="font-size:var(--t-xs);color:var(--ca);width:56px;flex-shrink:0">SLOWEST</span>';
    h+='<span class="text-11-flex">'+slowest.b.title+'</span>';
    h+='<span style="font-size:var(--t-sm);color:var(--ca)">'+slowest.days+'d</span>';
    h+='</div>';
    h+='</div>';
  }

  //  BOOKS & PAGES PER YEAR 
  var years=Object.keys(booksByYear).sort().reverse().slice(0,5);
  if(years.length){
    h+='<div class="label-dim-wide">BY YEAR</div>';
    var maxYrBooks=Math.max.apply(null,years.map(function(y){return booksByYear[y]||0;}));
    years.forEach(function(yr){
      var bc=booksByYear[yr]||0;var pg=pagesByYear[yr]||0;
      var pct=Math.round(bc/maxYrBooks*100);
      var isCur=+yr===thisYear;
      h+='<div class="mb-6">';
      h+='<div style="display:flex;justify-content:space-between;font-size:var(--t-sm);margin-bottom:2px">';
      h+='<span style="color:'+(isCur?'#9b6fff':'var(--dim)')+'">'+yr+(isCur?' ←':'')+' </span>';
      h+='<span style="color:var(--dim)">'+bc+' books · '+pg.toLocaleString()+' pages</span>';
      h+='</div>';
      h+='<div style="height:5px;background:rgba(122,79,255,.1);border-radius:2px">';
      h+='<div style="width:'+pct+'%;height:100%;background:'+(isCur?'#9b6fff':'rgba(122,79,255,.4)')+';border-radius:2px"></div>';
      h+='</div></div>';
    });
    h+='<div style="margin-top:10px;margin-bottom:14px">';
  }

  //  GENRE BREAKDOWN 
  h+='<div class="label-dim-wide">GENRE SPLIT</div>';
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
  h+='<span style="font-size:var(--t-base);color:var(--dim);width:80px;flex-shrink:0">Fiction</span>';
  h+='<div style="flex:1;height:10px;background:rgba(122,79,255,.1);border-radius:2px"><div style="width:'+Math.round((fDone/maxBar)*100)+'%;height:100%;background:#9b6fff;border-radius:2px"></div></div>';
  h+='<span style="font-family:VT323,monospace;font-size:var(--t-title);color:#9b6fff;min-width:24px;text-align:right">'+fDone+'</span>';
  h+='</div>';
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">';
  h+='<span style="font-size:var(--t-base);color:var(--dim);width:80px;flex-shrink:0">Non-Fiction</span>';
  h+='<div style="flex:1;height:10px;background:rgba(0,229,255,.1);border-radius:2px"><div style="width:'+Math.round((nDone/maxBar)*100)+'%;height:100%;background:var(--cc);border-radius:2px"></div></div>';
  h+='<span style="font-family:VT323,monospace;font-size:var(--t-title);color:var(--cc);min-width:24px;text-align:right">'+nDone+'</span>';
  h+='</div>';

  //  LONGEST BOOKS FINISHED 
  var longBooks=finished.slice().sort(function(a,b){return b.total-a.total;}).slice(0,3);
  if(longBooks.length){
    h+='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:2px;margin-bottom:6px">LONGEST FINISHED</div>';
    h+='<div class="mb-8">';
    longBooks.forEach(function(b,i){
      var medals=['🥇','🥈','🥉'];
      h+='<div style="display:flex;align-items:baseline;gap:6px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">';
      h+='<span style="font-size:var(--t-md)">'+medals[i]+'</span>';
      h+='<span class="text-11-flex">'+b.title+'</span>';
      h+='<span class="dim-10">'+b.total.toLocaleString()+' pp</span>';
      h+='</div>';
    });
    h+='</div>';
  }

  el.innerHTML=h;
}



function toggleBookReview(id){
  window._bookReviewEdit=(window._bookReviewEdit===id)?null:id;
  renderBooks();
  if(window._bookReviewEdit===id){
    setTimeout(function(){var el=document.getElementById('br-inp-'+id);if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}},50);
  }
}
function saveBookReview(id){
  var b=books.find(function(x){return x.id===id;});
  if(!b)return;
  var inp=document.getElementById('br-inp-'+id);
  if(!inp)return;
  b.review=inp.value.trim();
  b.reviewDate=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  window._bookReviewEdit=null;
  saveBooks();
  renderBooks();
  confetti(window.innerWidth/2,200,'#ffcc00');
}
renderBooks();

// Init settings after DOM ready
setTimeout(initSettings,200);

//  RAFT 
(function(){
  var canvas=document.getElementById('raft-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var W=400,H=200;

  var C={
    sky:['#050d1a','#071424','#0a1c38','#0d2448','#112e5a'],
    water:['#061828','#082040','#0a2a5a','#0d3470','#103d84','#1a4a9e','#2058b8','#1a4a9e','#103d84','#0d3470'],
    foam:'#5aaedd',foam2:'#8ac8ee',foam3:'#c8e8ff',
    raft:['#8b5e2a','#a06c30','#7a4f1a','#b87830','#c89040','#9a6828'],
    rope:'#5a3a18',ropeLight:'#8a5a28',
    skin:'#e8c090',skinDark:'#c8985a',hair:'#1a0e04',hairHi:'#3a2008',
    shirt:'#b82838',shirtShadow:'#881820',
    pants:'#2a3a7c',pantsShadow:'#1a2a5c',
    paddle:'#7a4e1a',paddleBlade:'#9a6428',
    sun:'#ffe080',sunRim:'#ffcc00',
    aurora:['#004433','#006644','#008855','#00aa66','#33cc77'],
    cloud:'#0d2248',cloud2:'#1a3460',
    star:'#aad4ff',starBright:'#ffffff',
    fish:'#1aaa88',fishBelly:'#40ddaa',fishFin:'#0a8866',
    bird:'#2a4a6a',
    rain:'#4488cc',
    lighthouse:'#d4b896',lighthouseLight:'#ffe8a0',lighthouseBase:'#8b6a4a',
    moon:'#fff0c0',moonGlow:'#ffe880',moonShadow:'#d4b850',
    reflection:'#1a3860'
  };

  var t=0;
  var waveAmplitude=6;
  var waveTarget=5;
  var waveSpeed=0.5;
  var waveSpeedTarget=0.5;
  var stormTimer=0;
  var stormCooldown=0;
  var MSGS_CALM=[
    'stay on the raft.','breathe.','you got this.','one wave at a time.','still here.','grounded.',
    'the water is beneath you, not inside you.','float. just float.','the horizon is steady.',
    'you have survived every wave so far.','rest. the raft holds you.','it is okay to just exist.',
    'the ocean does not ask permission.','you are not the water.','this moment is enough.',
    'be still.','look at the horizon.','you are allowed to rest.','the raft is solid.',
    'your weight is held.','drift gently.','peace is not the absence of waves.',
    'you are doing it right now.','keep your eyes soft.','the water reflects the sky.',
    'nothing is required of you right now.','breathe in. breathe out.','you belong here.',
    'let the ocean carry what you cannot.','stillness is not weakness.','anchor yourself in now.',
    'the raft knows your weight.','you are enough as you are.','gentleness is strength.',
    'not every moment needs to mean something.','stay. just stay.','here. present. alive.',
    'the stars have always been there.','float like you mean it.','rest is not retreat.',
    'you have made it to today.','slow down. the destination can wait.',
    'your breath is the only compass you need.','trust the raft.','you are not lost.',
    'the sea has seen storms before. so have you.','small movements. steady hands.',
    'you were built for this.','peace finds those who wait for it.',
    'the raft is your ground.','you do not need to paddle right now.',
    'watch the light on the water.','nothing is permanent, not even the storm.',
    'you are more than the waves.','one breath. then another.',
    'what is not in your control is not your concern.',
    'the obstacle is the way.',
    'you suffer more in imagination than in reality.',
    'how long will you wait before you demand the best of yourself?',
    'the impediment to action advances action. what stands in the way becomes the way.',
    'do not indulge in dreams of what you do not have.',
    'confine yourself to the present.',
    'the happiness of your life depends on the quality of your thoughts.',
    'you have power over your mind, not outside events.',
    'waste no more time arguing what a good person should be. be one.',
    'if it is not right, do not do it. if it is not true, do not say it.',
    'never let the future disturb you. you will meet it with the same reason you bring today.',
    'look within. within is the fountain of good.',
    'the soul becomes dyed with the color of its thoughts.',
    'dwell on the beauty of life. watch the stars, and see yourself running with them.',
    'he who lives in harmony with himself lives in harmony with the universe.',
    'nothing is as it seems to be at first glance.',
    'this life is a single breath in eternity. breathe it with intention.',
    'sabr is not waiting. it is trusting while you wait.',
    'the dunya is a bridge. cross it. do not build your house upon it.',
    'every soul shall taste death. what will you have given before that moment?',
    'you were not created for this world. you were sent through it.',
    'be patient. what Allah has decreed will reach you even if it is between two mountains.',
    'the believer who perseveres through difficulty has already won.',
    'this hardship is a station. not a destination.',
    'what is destined for you will find you even if you are behind locked doors.',
    'the world is the prison of the believer and the paradise of the disbeliever. so rest easy — your true home is ahead.',
    'do not grieve over what has passed. it was written before you were born.',
    'your sustenance will not stop because you are patient. it stops when it is finished.'
  ];
  var MSGS_STORM=[
    'hold on.','this too shall pass.','breathe through it.','still on the raft.',
    'you are not the storm.','steady.','the storm is not you.',
    'grip the raft. breathe.','you have been through worse.',
    'wild water, steady heart.','the raft holds in storms too.',
    'this wave will end. they always do.','you are stronger than the sea.',
    'do not fight it. ride it.','let the wave pass through you.',
    'the storm does not define you.','you are the raft, not the water.',
    'chaos outside. stillness inside.','lean into the raft.',
    'every storm has a last wave.','you are still here. that matters.',
    'breathe. the air is still there.','the horizon has not moved.',
    'storms cannot last forever.','hold on. morning comes.',
    'you are not alone on this water.','the raft was made for this.',
    'do not mistake the storm for the truth.','rough water makes strong sailors.',
    'this intensity will soften.','your presence here is an act of courage.',
    'the waves are loud but you are louder.',
    'pain moves through. it does not stay.',
    'even in the storm, you are afloat.','breathe first. everything else second.',
    'you are not required to be okay right now.','just stay on the raft.',
    'the sea tests everyone eventually.','wild outside. you choose inside.',
    'the storm thinks it owns you. it does not.',
    'one moment at a time. just this one.','endure. then rest.',
    'the raft does not sink in storms.','neither do you.',
    'somewhere beyond this, there is calm water.',
    'trust yourself the way you trust the raft.',
    'it is okay to feel the waves. feel them. stay.',
    'indeed, with hardship comes ease.',
    'and He found you lost and guided you.',
    'verily, Allah is with the patient.',
    'do not grieve. indeed Allah is with us.',
    'put your trust in Allah. He loves those who trust.',
    'Allah does not burden a soul beyond what it can bear.',
    'whoever fears Allah, He will make for him a way out.',
    'be patient. the earth is wide and the mercy of Allah is wider.',
    'turn to Allah before you return to Allah.',
    'the heart finds rest in the remembrance of Allah.',
    'be in this world as though you were a stranger or a traveler.',
    'speak good or remain silent.',
    'the strong person is not the one who wrestles. it is the one who controls himself in anger.',
    'make things easy and do not make them difficult.',
    'none of you truly believes until he loves for his brother what he loves for himself.',
    'take benefit of five before five: youth before old age, health before sickness.',
    'the best of you are those who are best to their families.',
    'feed the hungry, visit the sick, free the captive.',
    'whoever saves one life it is as though he saved all of mankind.',
    'seek knowledge from the cradle to the grave.',
    'the ink of the scholar is more sacred than the blood of the martyr.',
    'be merciful to others and Allah will be merciful to you.',
    'the world is a prison for the believer and a paradise for the disbeliever.',
    'O turner of hearts, keep our hearts firm on your religion.',
    'Allah is beautiful and loves beauty.',
    'charity does not decrease wealth.',
    'pray as though everything depends on Allah. work as though everything depends on you.',
    'the greatest jihad is to battle your own soul.',
    'make dua. the door of Allah is always open.',
    'this life is but a moment. spend it in obedience.',
    'patience is half of faith.',
    'gratitude turns what we have into enough.',
    'everything happens by the will of Allah. find peace in that.',
    'verily, with hardship comes ease. with hardship comes ease. twice He said it.',
    'Allah does not burden a soul beyond what it can bear. you can bear this.',
    'the prophets were tested more than anyone. and they were the most beloved.',
    'sabr has no expiry date. hold.',
    'call upon Allah in the darkest hour. that is exactly what this hour is for.',
    'your pain is not punishment. sometimes it is elevation.',
    'the darkest point of the night is just before fajr.',
    'do not despair of the mercy of Allah. He is closer than you think.',
    'this too is written. and everything written has a wisdom you cannot yet see.',
    'Allah is with those who are patient. you are not alone on this water.'
  ];
  var curMsg=MSGS_CALM[0];
  var msgTimer=300;

  // Stars
  var stars=[];
  for(var i=0;i<40;i++)stars.push({
    x:Math.random()*W, y:Math.random()*(H*0.5),
    b:Math.random(), size:Math.random()<0.15?2:1,
    bright:Math.random()<0.08
  });

  // Shooting star
  var shootingStar={x:-100,y:0,active:false,vx:0,vy:0,trail:[]};

  // Fish
  var fish=[];
  for(var i=0;i<5;i++)fish.push({
    x:Math.random()*W, y:H*0.75+Math.random()*40,
    spd:0.2+Math.random()*0.5, dir:Math.random()>0.5?1:-1,
    t:Math.random()*100, depth:Math.random()
  });

  // Birds (appear during calm, low count)
  var birds=[];
  for(var i=0;i<4;i++)birds.push({
    x:Math.random()*W, y:H*0.15+Math.random()*H*0.2,
    spd:0.4+Math.random()*0.6, wingT:Math.random()*10,
    active:false
  });

  // Rain drops
  var rainDrops=[];
  for(var i=0;i<80;i++)rainDrops.push({
    x:Math.random()*W, y:Math.random()*H,
    spd:4+Math.random()*4, len:6+Math.random()*8
  });

  // Aurora bands
  var auroraBands=[];
  for(var i=0;i<5;i++)auroraBands.push({
    phase:Math.random()*Math.PI*2, amp:8+Math.random()*12,
    y:H*0.08+i*12, col:C.aurora[i]
  });

  function px(n){return Math.round(n);}
  function rect(x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(px(x),px(y),w,h);}

  function drawSky(){
    var rows=Math.ceil(H*0.58);
    for(var i=0;i<rows;i++){
      var p=i/rows;
      var ci=Math.floor(p*4);
      ctx.fillStyle=C.sky[Math.min(ci,4)];
      ctx.fillRect(0,i,W,1);
    }
  }

  function drawAurora(){
    if(waveAmplitude>12)return; // no aurora in storms
    var alpha=Math.max(0,(10-waveAmplitude)/10)*0.18;
    for(var b=0;b<auroraBands.length;b++){
      var band=auroraBands[b];
      ctx.globalAlpha=alpha*(0.5+0.5*Math.sin(t*0.005+band.phase));
      for(var x=0;x<W;x+=2){
        var wavey=band.y+Math.sin(x*0.015+t*0.008+band.phase)*band.amp;
        var h2=8+Math.sin(x*0.02+t*0.006)*5;
        ctx.fillStyle=band.col;
        ctx.fillRect(x,px(wavey),2,px(h2));
      }
    }
    ctx.globalAlpha=1;
  }

  function drawStars(){
    for(var i=0;i<stars.length;i++){
      var s=stars[i];
      var bright=0.3+0.7*Math.sin(t*0.025+s.b*10);
      if(waveAmplitude>16)bright*=0.3;
      ctx.globalAlpha=bright;
      ctx.fillStyle=s.bright?C.starBright:C.star;
      ctx.fillRect(px(s.x),px(s.y),s.size,s.size);
      // cross flare on bright stars
      if(s.bright&&s.size===2){
        ctx.globalAlpha=bright*0.4;
        ctx.fillRect(px(s.x)-2,px(s.y)+1,6,1,C.star);
        ctx.fillRect(px(s.x)+1,px(s.y)-2,1,6,C.star);
      }
    }
    ctx.globalAlpha=1;
    // Shooting star
    if(shootingStar.active){
      for(var ti=0;ti<shootingStar.trail.length;ti++){
        var tp=shootingStar.trail[ti];
        ctx.globalAlpha=tp.a;
        rect(tp.x,tp.y,2,1,C.starBright);
      }
      ctx.globalAlpha=1;
    }
  }

  function drawMoon(){
    var mx=W*0.78,my=H*0.10;
    // outer glow
    ctx.globalAlpha=0.06;
    ctx.fillStyle=C.moonGlow;
    ctx.fillRect(px(mx-14),px(my-14),36,36);
    ctx.globalAlpha=0.12;
    ctx.fillRect(px(mx-8),px(my-8),24,24);
    ctx.globalAlpha=1;
    // moon body
    rect(mx,my,14,14,C.moon);
    rect(mx+1,my+1,12,12,C.moonGlow);
    // craters
    rect(mx+9,my+2,3,3,C.moonShadow);
    rect(mx+2,my+8,2,2,C.moonShadow);
    rect(mx+6,my+9,2,2,C.moonShadow);
    // shadow edge
    rect(mx+11,my,3,14,C.moonShadow);
    rect(mx+8,my,3,4,C.moonShadow);
    rect(mx+8,my+10,3,4,C.moonShadow);
    // moon reflection on water
    var refY=H*0.60+waveY(mx,t,waveAmplitude,waveSpeed);
    for(var ri=0;ri<8;ri++){
      var rw=10-ri*1.2;
      var ra=0.25-ri*0.028;
      ctx.globalAlpha=Math.max(0,ra)*(1-waveAmplitude/30);
      var rwavex=mx+Math.sin(t*0.02+ri)*3;
      rect(rwavex-rw/2,refY+ri*3+2,rw,1,C.foam3);
    }
    ctx.globalAlpha=1;
  }

  function drawLighthouse(){
    var lx=W*0.08,ly=H*0.32;
    // base rock
    rect(lx-6,ly+38,18,8,C.lighthouseBase);
    rect(lx-4,ly+34,14,6,C.lighthouseBase);
    // tower
    rect(lx,ly,10,36,C.lighthouse);
    rect(lx+1,ly+1,8,34,C.lighthouseLight);
    // stripes
    for(var si=0;si<4;si++){
      ctx.globalAlpha=0.35;
      rect(lx,ly+6+si*8,10,4,'#c86030');
    }
    ctx.globalAlpha=1;
    // top
    rect(lx-2,ly-3,14,4,C.lighthouseBase);
    rect(lx+1,ly-7,8,5,C.lighthouseLight);
    // light beam sweep
    var beamAngle=(t*0.015)%(Math.PI*2);
    var beamDist=80;
    var bx=lx+5+Math.cos(beamAngle)*beamDist;
    var by=ly-4+Math.sin(beamAngle)*30;
    ctx.globalAlpha=0.08;
    ctx.fillStyle=C.lighthouseLight;
    ctx.beginPath();
    ctx.moveTo(lx+5,ly-4);
    ctx.lineTo(bx+15,by-8);
    ctx.lineTo(bx+15,by+8);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha=1;
    // blink
    var blink=0.3+0.7*Math.abs(Math.sin(t*0.04));
    ctx.globalAlpha=blink;
    rect(lx+2,ly-6,6,4,C.moonGlow);
    ctx.globalAlpha=1;
  }

  function drawBirds(){
    if(waveAmplitude>14)return;
    var alpha=Math.max(0,(14-waveAmplitude)/14);
    for(var i=0;i<birds.length;i++){
      var b=birds[i];
      if(!b.active)continue;
      ctx.globalAlpha=alpha*0.7;
      var wing=Math.sin(b.wingT*0.3)*3;
      // V shape bird — 2 wing arcs
      ctx.fillStyle=C.bird;
      rect(b.x,b.y+wing,4,1,C.bird);
      rect(b.x-4,b.y+wing*0.5,4,1,C.bird);
      ctx.globalAlpha=1;
    }
    ctx.globalAlpha=1;
  }

  function drawRain(){
    if(waveAmplitude<16)return;
    var intensity=(waveAmplitude-16)/10;
    ctx.globalAlpha=Math.min(0.5,intensity*0.6);
    ctx.fillStyle=C.rain;
    for(var i=0;i<rainDrops.length;i++){
      var d=rainDrops[i];
      ctx.fillRect(px(d.x),px(d.y),1,d.len);
    }
    ctx.globalAlpha=1;
  }

  function waveY(x,time,amp,spd){
    return Math.sin((x/W)*Math.PI*3+time*spd*0.018)*amp
          +Math.sin((x/W)*Math.PI*5-time*spd*0.011)*amp*0.35
          +Math.sin((x/W)*Math.PI*1.8+time*spd*0.028)*amp*0.18
          +Math.sin((x/W)*Math.PI*7+time*spd*0.009)*amp*0.1;
  }

  function drawWater(){
    var baseY=H*0.60;
    for(var x=0;x<W;x++){
      var wy=baseY+waveY(x,t,waveAmplitude,waveSpeed);
      var depth=H-wy;
      for(var y=px(wy);y<H;y++){
        var di=Math.floor(((y-wy)/depth)*9);
        ctx.fillStyle=C.water[Math.min(di,9)];
        ctx.fillRect(x,y,1,1);
      }
    }
    // foam layers
    for(var x=0;x<W;x+=1){
      var wy=baseY+waveY(x,t,waveAmplitude,waveSpeed);
      var prev=baseY+waveY(x-1,t,waveAmplitude,waveSpeed);
      if(wy<prev-0.5){
        ctx.fillStyle=C.foam3;
        ctx.fillRect(px(x),px(wy),2,1);
      }
      if(wy<prev-1.5){
        ctx.globalAlpha=0.6;
        ctx.fillStyle=C.foam;
        ctx.fillRect(px(x),px(wy)-1,2,1);
        ctx.globalAlpha=1;
      }
    }
    // shimmer bands
    for(var x=3;x<W;x+=5){
      var wy=baseY+waveY(x,t,waveAmplitude,waveSpeed)+3;
      ctx.globalAlpha=0.18;
      ctx.fillStyle=C.foam2;
      ctx.fillRect(px(x),px(wy),3,1);
    }
    ctx.globalAlpha=1;
    // deep water shimmer
    for(var x=0;x<W;x+=8){
      var shimY=H*0.78+Math.sin(x*0.04+t*0.012)*4;
      ctx.globalAlpha=0.08;
      ctx.fillStyle=C.reflection;
      ctx.fillRect(px(x),px(shimY),6,2);
    }
    ctx.globalAlpha=1;
  }

  function drawFish(){
    for(var i=0;i<fish.length;i++){
      var f=fish[i];
      if(f.y>H-4)continue;
      var fy=f.y+Math.sin(f.t*0.06)*6;
      var alpha=0.15+0.25*Math.sin(f.t*0.04)*(1-f.depth*0.6);
      ctx.globalAlpha=alpha;
      if(f.dir>0){
        rect(f.x,fy,8,4,C.fish);
        rect(f.x+2,fy+1,4,2,C.fishBelly);
        rect(f.x-3,fy,4,4,C.fish);
        rect(f.x-5,fy+1,3,2,C.fishFin);
        rect(f.x+6,fy+1,1,1,'#088844');
        // fin
        rect(f.x+1,fy-2,4,2,C.fishFin);
      } else {
        rect(f.x,fy,8,4,C.fish);
        rect(f.x+2,fy+1,4,2,C.fishBelly);
        rect(f.x+7,fy,4,4,C.fish);
        rect(f.x+10,fy+1,3,2,C.fishFin);
        rect(f.x,fy+1,1,1,'#088844');
        rect(f.x+3,fy-2,4,2,C.fishFin);
      }
      ctx.globalAlpha=1;
    }
  }

  function getRaftY(){
    var raftX=W/2;
    var baseY=H*0.60;
    return baseY+waveY(raftX,t,waveAmplitude,waveSpeed)-12;
  }

  function drawRaft(){
    var rx=W/2-30, ry=getRaftY();
    var tilt=Math.sin(t*waveSpeed*0.04)*3.5*(waveAmplitude/8);
    var roll=Math.cos(t*waveSpeed*0.027)*1.5*(waveAmplitude/10);

    ctx.save();
    ctx.translate(px(rx+30),px(ry+6));
    ctx.rotate((tilt+roll)*Math.PI/180);

    // shadow under raft
    ctx.globalAlpha=0.3;
    rect(-28,8,56,4,'#000');
    ctx.globalAlpha=1;

    // 6 raft planks
    for(var i=0;i<6;i++){
      var px2=i*10-30;
      rect(px2,-5,9,10,C.raft[i%6]);
      // grain lines
      rect(px2+2,-3,1,6,C.raft[(i+3)%6]);
      rect(px2+6,-4,1,7,C.rope);
      // highlight top
      ctx.globalAlpha=0.4;
      rect(px2,-5,9,1,C.raft[4]);
      ctx.globalAlpha=1;
    }
    // cross-ropes
    rect(-30,-6,60,1,C.rope);
    rect(-30,5,60,1,C.rope);
    rect(-30,-2,60,1,C.ropeLight);
    // corner knots
    for(var kx=-28;kx<=28;kx+=56){
      rect(kx,-7,4,4,C.ropeLight);
      rect(kx+1,-6,2,2,C.rope);
    }

    // Paddle resting on raft
    rect(-30,-3,60,1,C.paddle);
    rect(-32,-6,6,6,C.paddleBlade);
    rect(26,-6,6,6,C.paddleBlade);

    // PERSON — more detailed seated figure
    // left leg
    rect(-6,0,5,7,C.pants);
    rect(-6,7,5,3,C.pantsShadow);
    rect(-8,10,6,3,C.pants);
    // right leg
    rect(1,0,5,7,C.pants);
    rect(1,7,5,3,C.pantsShadow);
    rect(2,10,6,3,C.pants);
    // torso
    rect(-7,-12,14,13,C.shirt);
    rect(-7,-11,14,2,C.shirtShadow);
    rect(-7,-2,14,2,C.shirtShadow);
    // collar/neck detail
    rect(-2,-12,4,3,C.skin);
    // left arm — resting on knee
    rect(-10,-6,4,4,C.shirt);
    rect(-11,-2,4,3,C.skin);
    rect(-10,1,3,4,C.skinDark);
    // right arm — slightly raised
    rect(6,-8,4,5,C.shirt);
    rect(7,-3,4,3,C.skin);
    rect(6,0,3,4,C.skinDark);
    // neck
    rect(-2,-14,4,3,C.skin);
    // head
    rect(-5,-24,10,11,C.skin);
    rect(-5,-23,10,2,C.skinDark);
    // hair — slightly unkempt, windblown
    rect(-5,-24,10,4,C.hair);
    rect(-6,-22,2,3,C.hair);
    rect(4,-22,3,3,C.hair);
    rect(-4,-22,1,2,C.hairHi);
    // ears
    rect(-6,-20,2,3,C.skinDark);
    rect(4,-20,2,3,C.skinDark);
    // eyes — looking out at horizon
    rect(-3,-19,3,2,'#3a2008');
    rect(1,-19,3,2,'#3a2008');
    // eye whites
    ctx.globalAlpha=0.5;
    rect(-2,-19,2,2,'#f0e0c0');
    rect(2,-19,2,2,'#f0e0c0');
    ctx.globalAlpha=1;
    // subtle smile
    rect(-2,-14,1,1,C.skinDark);
    rect(-1,-14,3,1,'#b87860');
    rect(2,-14,1,1,C.skinDark);
    // small scarf in wind
    ctx.globalAlpha=0.7;
    rect(-1,-13,6,2,'#4a80dd');
    rect(4,-12,5,1,'#4a80dd');
    rect(8,-11,4,1,'#3a60bb');
    ctx.globalAlpha=1;

    ctx.restore();
  }

  function drawSplash(){
    if(waveAmplitude<13)return;
    var intensity=(waveAmplitude-13)/12;
    var baseY=H*0.60;
    for(var x=8;x<W-8;x+=10){
      var wy=baseY+waveY(x,t,waveAmplitude,waveSpeed);
      if(wy<baseY-waveAmplitude*0.6){
        ctx.globalAlpha=0.5*intensity;
        rect(x+Math.sin(t*0.12+x)*4,wy-5,2,3,C.foam2);
        rect(x-3+Math.cos(t*0.09+x)*3,wy-8,1,3,C.foam3);
        rect(x+4+Math.sin(t*0.07+x)*2,wy-3,2,2,C.foam);
        ctx.globalAlpha=1;
      }
    }
  }

  function drawVignette(){
    // dark corners
    ctx.globalAlpha=0.4;
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,W,8);
    ctx.fillRect(0,H-6,W,6);
    ctx.globalAlpha=0.2;
    ctx.fillRect(0,0,12,H);
    ctx.fillRect(W-12,0,12,H);
    ctx.globalAlpha=1;
  }

  function updateState(){
    waveAmplitude+=(waveTarget-waveAmplitude)*0.006;
    waveSpeed+=(waveSpeedTarget-waveSpeed)*0.004;

    if(stormCooldown>0){stormCooldown--;}
    else if(stormTimer>0){
      stormTimer--;
      if(stormTimer===0){
        waveTarget=3+Math.random()*5;
        waveSpeedTarget=0.3+Math.random()*0.3;
        stormCooldown=4800+Math.floor(Math.random()*4800);
      }
    } else {
      if(Math.random()<0.0002){
        var intensity=Math.random();
        if(intensity<0.4){
          waveTarget=7+Math.random()*4;
          waveSpeedTarget=0.4+Math.random()*0.3;
          stormTimer=4000+Math.floor(Math.random()*2000);
        } else if(intensity<0.75){
          waveTarget=13+Math.random()*4;
          waveSpeedTarget=0.6+Math.random()*0.4;
          stormTimer=4000+Math.floor(Math.random()*4000);
        } else {
          waveTarget=18+Math.random()*6;
          waveSpeedTarget=0.9+Math.random()*0.5;
          stormTimer=200+Math.floor(Math.random()*300);
        }
      }
    }

    // Shooting star
    if(!shootingStar.active&&waveAmplitude<8&&Math.random()<0.0006){
      shootingStar.active=true;
      shootingStar.x=Math.random()*W*0.7;
      shootingStar.y=Math.random()*H*0.2;
      shootingStar.vx=2+Math.random()*3;
      shootingStar.vy=0.8+Math.random()*1.5;
      shootingStar.trail=[];
    }
    if(shootingStar.active){
      shootingStar.trail.push({x:shootingStar.x,y:shootingStar.y,a:0.9});
      shootingStar.x+=shootingStar.vx;
      shootingStar.y+=shootingStar.vy;
      for(var ti=0;ti<shootingStar.trail.length;ti++)shootingStar.trail[ti].a*=0.82;
      shootingStar.trail=shootingStar.trail.filter(function(tp){return tp.a>0.05;});
      if(shootingStar.x>W||shootingStar.y>H*0.5)shootingStar.active=false;
    }

    // Birds
    for(var i=0;i<birds.length;i++){
      var b=birds[i];
      if(!b.active){
        if(waveAmplitude<10&&Math.random()<0.0003)b.active=true;
      } else {
        b.x+=b.spd;
        b.y+=Math.sin(b.x*0.02)*0.3;
        b.wingT+=1;
        if(b.x>W+30){b.x=-30;b.active=false;}
      }
    }

    // Birds
    for(var i=0;i<birds.length;i++){
      var b=birds[i];
      if(!b.active){
        if(waveAmplitude<10&&Math.random()<0.0003)b.active=true;
      } else {
        b.x+=b.spd;
        b.y+=Math.sin(b.x*0.02)*0.3;
        b.wingT+=1;
        if(b.x>W+30){b.x=-30;b.active=false;}
      }
    }

    // Rain
    if(waveAmplitude>16){
      for(var ri=0;ri<rainDrops.length;ri++){
        var d=rainDrops[ri];
        d.y+=d.spd;
        d.x+=0.5;
        if(d.y>H){d.y=-d.len;d.x=Math.random()*W;}
      }
    }

    // Aurora phases
    for(var ai=0;ai<auroraBands.length;ai++)auroraBands[ai].phase+=0.003;

    // Fish
    for(var fi=0;fi<fish.length;fi++){
      var f=fish[fi];
      f.x+=f.spd*f.dir*(0.6+waveAmplitude*0.04);
      f.t++;
      if(f.x>W+30){f.x=-10;f.dir=1;}
      if(f.x<-30){f.x=W+10;f.dir=-1;}
    }

    // Badge + message
    var badge=document.getElementById('raft-state-badge');
    var msgEl=document.getElementById('raft-msg');
    var state;
    if(waveAmplitude<9){state='CALM';}
    else if(waveAmplitude<15){state='CHOPPY';}
    else if(waveAmplitude<21){state='ROUGH';}
    else{state='STORM';}
    if(badge)badge.textContent=state;

    msgTimer--;
    if(msgTimer<=0){
      msgTimer=18000+Math.floor(Math.random()*5000);
      var pool=waveAmplitude>14?MSGS_STORM:MSGS_CALM;
      curMsg=pool[Math.floor(Math.random()*pool.length)];
      if(msgEl){
        msgEl.style.opacity='0';
        setTimeout(function(m){return function(){
          msgEl.textContent=m;
          msgEl.style.transition='opacity 2s ease';
          msgEl.style.opacity='1';
        };}(curMsg),800);
      }
    }

    t++;
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    drawSky();
    drawAurora();
    drawStars();
    drawMoon();
    drawLighthouse();
    drawBirds();
    drawWater();
    drawFish();
    drawRaft();
    drawSplash();
    drawRain();
    drawVignette();
    updateState();
    requestAnimationFrame(draw);
  }

  var msgEl=document.getElementById('raft-msg');
  if(msgEl){msgEl.textContent=curMsg;msgEl.style.transition='opacity 2s ease';}
  msgTimer=400;
  draw();
})();

//  S TRACKER //  S TRACKER 
var sLog=lsGet('s_log',[]);
var sDeletePending={};
var sPanel='main';

function saveSLog(){lsSet('s_log',sLog);}

function switchSTab(tab){
  sPanel=tab;
  var mainEl=document.getElementById('s-main');
  var logEl=document.getElementById('s-log-panel');
  var mainBadge=document.getElementById('s-tab-main');
  var logBadge=document.getElementById('s-tab-log');
  if(tab==='log'){
    mainEl.style.display='none';logEl.style.display='';
    if(logBadge){logBadge.style.color='#ff5fa0';logBadge.style.borderColor='#ff5fa0';}
    if(mainBadge){mainBadge.style.color='var(--dim)';mainBadge.style.borderColor='var(--dim)';}
    renderSLog();
  } else {
    mainEl.style.display='';logEl.style.display='none';
    if(mainBadge){mainBadge.style.color='#ff5fa0';mainBadge.style.borderColor='#ff5fa0';}
    if(logBadge){logBadge.style.color='var(--dim)';logBadge.style.borderColor='var(--dim)';}
    renderSMain();
  }
}

function logS(){
  var now=new Date();
  var inp=document.getElementById('s-note-inp');
  var note=inp?(inp.value.trim()||''):'';
  sLog.push({id:Date.now(),ts:now.toISOString(),note:note});
  if(inp)inp.value='';
  saveSLog();
  renderSMain();
  var btn=document.querySelector('.s-log-btn');
  if(btn){btn.textContent='LOGGED';btn.style.background='rgba(255,95,160,.25)';setTimeout(function(){btn.textContent='LOG S';btn.style.background='';},1500);}
}

function timeSince(isoStr){
  var then=new Date(isoStr);
  var now=new Date();
  var diff=now-then;
  var mins=Math.floor(diff/60000);
  var hours=Math.floor(diff/3600000);
  var days=Math.floor(diff/86400000);
  if(mins<60)return{val:mins,unit:mins===1?'min':'mins',days:0,isToday:true};
  if(hours<24)return{val:hours,unit:hours===1?'hr':'hrs',days:0,isToday:true};
  return{val:days,unit:days===1?'day':'days',days:days,isToday:false};
}
function daysSince(isoStr){
  return Math.floor((new Date()-new Date(isoStr))/86400000);
}

function renderSMain(){
  var badge=document.getElementById('s-days-badge');
  var disp=document.getElementById('s-streak-display');
  var last=document.getElementById('s-last');
  if(!sLog.length){
    if(badge)badge.textContent='no entries';
    if(disp)disp.innerHTML='<div class="s-big-days" style="opacity:.3">--</div><div class="s-days-label">log your first S</div>';
    if(last)last.textContent='';
    return;
  }
  var latest=sLog[sLog.length-1];
  var since=timeSince(latest.ts);
  var days=since.days;
  if(badge)badge.textContent=since.val+' '+since.unit+' ago';
  var color=since.isToday?'#ff5fa0':days<3?'#ffcc00':days<7?'#00e5ff':'#00ff88';
  var unitLabel=since.isToday?(since.unit==='mins'||since.unit==='min'?'MINS SINCE LAST S':'HRS SINCE LAST S'):'DAYS SINCE LAST S';
  if(disp)disp.innerHTML='<div class="s-big-days" style="color:'+color+';text-shadow:0 0 12px '+color+'88">'+since.val+'</div><div class="s-days-label">'+unitLabel+'</div>';
  if(last){
    var d=new Date(latest.ts);
    last.textContent='Last: '+d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+(latest.note?' — '+latest.note:'');
  }
  // Trail — last 5 entries as a gap chain, oldest on left, most recent on right
  var trailEl=document.getElementById('s-trail');
  if(trailEl&&sLog.length>0){
    var trail5=sLog.slice(-6); // up to 6 to compute 5 gaps
    if(trail5.length<2){
      trailEl.innerHTML='';
    } else {
      // Compute gaps between consecutive entries
      var gaps=[];
      for(var ti=1;ti<trail5.length;ti++){
        var g=Math.round((new Date(trail5[ti].ts)-new Date(trail5[ti-1].ts))/86400000);
        gaps.push(g);
      }
      var maxG=Math.max.apply(null,gaps)||1;
      var th='<div style="display:flex;align-items:center;gap:0;margin-top:10px;padding:8px 0;border-top:1px solid rgba(255,95,160,.15)">';
      gaps.forEach(function(g,gi){
        var norm=g/maxG;
        var col=g===0?'#ff5fa0':g<=2?'#ff5fa0':g<=5?'#ffcc00':g<=14?'#00e5ff':'#00ff88';
        var lbl=g===0?'today':g+'d';
        // Line segment — width proportional to gap
        var segW=Math.max(20,Math.round(norm*60));
        th+='<div style="height:2px;width:'+segW+'px;background:'+col+';opacity:.5;transition:width .3s"></div>';
        // Dot with label
        var isLast=gi===gaps.length-1;
        th+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0">';
        th+='<div style="width:8px;height:8px;border-radius:50%;background:'+col+';box-shadow:0 0 6px '+col+'88"></div>';
        th+='<div style="font-size:var(--t-xxs);color:'+col+';white-space:nowrap">'+lbl+'</div>';
        th+='</div>';
        // After last gap add a final line to "now"
        if(isLast){
          var sinceNow=Math.round((new Date()-new Date(trail5[trail5.length-1].ts))/86400000);
          var nowCol=sinceNow<=1?'#ff5fa0':sinceNow<=5?'#ffcc00':'#00e5ff';
          th+='<div style="height:2px;flex:1;min-width:10px;background:'+nowCol+';opacity:.3"></div>';
          th+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0">';
          th+='<div style="width:8px;height:8px;border-radius:50%;background:'+nowCol+';box-shadow:0 0 6px '+nowCol+'88;animation:pulse 1.5s ease-in-out infinite"></div>';
          th+='<div style="font-size:var(--t-xxs);color:'+nowCol+'">now</div>';
          th+='</div>';
        }
      });
      th+='</div>';
      trailEl.innerHTML=th;
    }
  }
}

function editSEntry(id){
  var e=sLog.find(function(x){return x.id===id;});
  if(!e)return;
  var row=document.getElementById('srow-'+id);
  if(!row)return;
  var d=new Date(e.ts);
  var dstr=d.toISOString().slice(0,16);
  row.innerHTML='<div style="display:flex;flex-direction:column;gap:5px;padding:4px 0">'
    +'<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:2px">DATE/TIME</div>'
    +'<input id="sedit-dt-'+id+'" type="datetime-local" value="'+dstr+'" style="background:transparent;border:1px solid #ff5fa0;color:var(--text);font-size:var(--t-base);padding:4px 7px;outline:none;width:100%;box-sizing:border-box">'
    +'<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:2px;margin-top:2px">NOTE</div>'
    +'<input id="sedit-note-'+id+'" type="text" value="'+(e.note||'')+'" placeholder="note..." style="background:transparent;border:1px solid #ff5fa0;color:var(--text);font-size:var(--t-base);padding:4px 7px;outline:none;width:100%;box-sizing:border-box">'
    +'<div style="display:flex;gap:6px;margin-top:2px">'
    +'<button class="s-log-btn-sm" onclick="saveEditS('+id+')" style="color:#ff5fa0;border-color:#ff5fa0;padding:4px 10px">SAVE</button>'
    +'<button class="s-log-btn-sm" onclick="renderSLog()" style="padding:4px 10px">CANCEL</button>'
    +'</div></div>';
}

function saveEditS(id){
  var e=sLog.find(function(x){return x.id===id;});
  if(!e)return;
  var dtEl=document.getElementById('sedit-dt-'+id);
  var noteEl=document.getElementById('sedit-note-'+id);
  if(dtEl&&dtEl.value){var p=new Date(dtEl.value);if(!isNaN(p))e.ts=p.toISOString();}
  if(noteEl)e.note=noteEl.value.trim();
  saveSLog();renderSLog();renderSMain();
}

function deleteSEntry(id){
  if(!sDeletePending[id]){
    sDeletePending[id]=true;
    var el=document.getElementById('sdel-'+id);
    if(el){el.textContent='SURE?';el.style.color='var(--cr)';}
    setTimeout(function(){
      sDeletePending[id]=false;
      var el=document.getElementById('sdel-'+id);
      if(el){el.textContent='&#x2715;';el.style.color='var(--dim)';}
    },3000);
    return;
  }
  sDeletePending[id]=false;
  sLog=sLog.filter(function(x){return x.id!==id;});
  saveSLog();renderSLog();renderSMain();
}

var _sLogCollapsed={};

function renderSLog(){
  var el=document.getElementById('s-log-list');
  if(!el)return;
  if(!sLog.length){el.innerHTML='<div class="empty-msg-sm">No entries yet.</div>';return;}

  // Group by year, most recent year first
  var byYear={};
  sLog.slice().reverse().forEach(function(e){
    var yr=new Date(e.ts).getFullYear();
    if(!byYear[yr])byYear[yr]=[];
    byYear[yr].push(e);
  });
  var years=Object.keys(byYear).sort(function(a,b){return b-a;});
  var curYear=new Date().getFullYear();

  var h='';
  years.forEach(function(yr){
    var entries=byYear[yr];
    var count=entries.length;
    // Default: current year open, others collapsed
    if(_sLogCollapsed[yr]===undefined)_sLogCollapsed[yr]=(+yr!==curYear);
    var collapsed=_sLogCollapsed[yr];

    h+='<div data-syr="'+yr+'" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,95,160,.15);cursor:pointer;user-select:none">';
    h+='<span style="font-size:var(--t-base);color:#ff5fa0;font-weight:bold;letter-spacing:1px">'+yr+'</span>';
    h+='<span class="flex-center"><span class="dim-10">'+count+' entries</span>';
    h+='<span class="dim-10">'+(collapsed?'▶':'▼')+'</span></span>';
    h+='</div>';

    if(!collapsed){
      entries.forEach(function(e){
        var d=new Date(e.ts);
        var dstr=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
        var tstr=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
        h+='<div class="s-log-item" id="srow-'+e.id+'">'
          +'<div><div class="s-log-date">'+dstr+'</div><div class="dim-10">'+tstr+(e.note?' &mdash; <em style="color:#ff5fa0aa">'+e.note+'</em>':'')+'</div></div>'
          +'<div class="s-log-actions">'
          +'<button class="s-log-btn-sm" onclick="editSEntry('+e.id+')">&#9998;</button>'
          +'<button class="s-log-btn-sm" id="sdel-'+e.id+'" onclick="deleteSEntry('+e.id+')" style="color:var(--cr);border-color:rgba(255,68,68,.3)">&#x2715;</button>'
          +'</div>'
          +'</div>';
      });
    }
  });
  el.innerHTML=h;

  // Wire year header toggles
  el.querySelectorAll('[data-syr]').forEach(function(hdr){
    hdr.onclick=function(){
      var yr=this.dataset.syr;
      _sLogCollapsed[yr]=!_sLogCollapsed[yr];
      renderSLog();
    };
  });
}

renderSMain();

//  EXPORT / COPY FUNCTIONS 
function clipCopy(text, label){
  function showOk(){
    var s=document.getElementById('nsaved');
    if(s){s.textContent=(label||'Data')+' copied!';setTimeout(function(){s.textContent='';},2000);}
  }
  function fallback(){
    // execCommand fallback for file:// and older browsers
    var ta=document.createElement('textarea');
    ta.value=text;
    ta.style.cssText='position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();ta.select();
    try{
      if(document.execCommand('copy')){showOk();}
      else{alert(text);}
    }catch(e){alert(text);}
    ta.remove();
  }
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(text).then(showOk).catch(fallback);
  } else {
    fallback();
  }
}

function exportTodos(){
  var out=todos.filter(function(t){return !t.deletedAt;});
  if(!out.length){clipCopy('(no tasks)','Todos');return;}
  var lines=['=== TO-DO LIST ==='];
  out.forEach(function(t){lines.push((t.done?'[x] ':'[ ] ')+t.text);});
  clipCopy(lines.join('\n'),'Todos');
}

function exportNotes(){
  var out=notes.filter(function(n){return !n.deletedAt;});
  if(!out.length){clipCopy('(no notes)','Notes');return;}
  var lines=['=== QUICK NOTES ==='];
  out.forEach(function(n){lines.push('['+n.ts+'] '+n.text);});
  clipCopy(lines.join('\n'),'Notes');
}

function exportSchedule(){
  var days=schedGetWeekDays(schedWeekOffset);
  var lines=['=== WORK ARRIVAL ==='];
  days.forEach(function(day){
    var val=schedule[day.key]||null;
    var isM=val&&val.endsWith('?');
    var display=val==='OFF'?'OFF':val?(isM?(val.slice(0,-1)+' (if needed)'):(val+' (confirmed)')):'(not set)';
    lines.push(day.label+': '+display);
  });
  clipCopy(lines.join('\n'),'Schedule');
}

function exportScheduleWife(){
  var days=schedGetWeekDays(schedWeekOffset);
  var dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function parseTime(t){var p=t.split(':');return {h:parseInt(p[0]),m:parseInt(p[1]||'0')};}
  function addMins(h,m,mins){var tot=h*60+m+mins;return {h:Math.floor(tot/60)%24,m:tot%60};}
  function fmt12(h,m){
    var ampm=h>=12?'pm':'am';var hh=h%12||12;
    var mm=m===0?'':':'+String(m).padStart(2,'0');
    return hh+mm+ampm;
  }

  var lines=[];
  days.forEach(function(day){
    var val=schedule[day.key]||null;
    if(!val||val==='OFF')return;
    var maybe=val.endsWith('?');
    var timeStr=maybe?val.slice(0,-1):val;
    var parsed=parseTime(timeStr);
    var leave=addMins(parsed.h,parsed.m,510);
    var dp=day.key.split('-');
    var d=new Date(parseInt(dp[0]),parseInt(dp[1])-1,parseInt(dp[2]));
    var label=dayNames[d.getDay()]+' '+monthNames[d.getMonth()]+' '+d.getDate();
    var line=label+' · '+fmt12(parsed.h,parsed.m)+'–'+fmt12(leave.h,leave.m);
    if(maybe)line+=' (maybe)';
    lines.push(line);
  });

  var weekLabel=schedWeekOffset===0?'this week':schedWeekOffset===1?'next week':'last week';
  var header='?? Work '+weekLabel+':';
  var msg=header+(lines.length?'\n\n'+lines.join('\n'):'No shifts scheduled.');

  if(navigator.clipboard){
    navigator.clipboard.writeText(msg).then(function(){safeToast('Copied for wife ??');});
  } else {
    var ta=document.createElement('textarea');ta.value=msg;
    document.body.appendChild(ta);ta.select();
    document.execCommand('copy');document.body.removeChild(ta);
    safeToast('Copied for wife ??');
  }
}

function exportBooks(){
  var lines=['=== BOOKS ==='];
  var reading=books.filter(function(b){return !b.done;});
  var done=books.filter(function(b){return b.done;});
  if(reading.length){
    lines.push('\n--- READING ---');
    reading.forEach(function(b){
      var pct=b.total>0?Math.round((b.current/b.total)*100):0;
      lines.push(b.title+(b.author?' by '+b.author:'')+' — p.'+b.current+'/'+b.total+' ('+pct+'%)');
    });
  }
  if(done.length){
    lines.push('\n--- FINISHED ---');
    done.forEach(function(b){
      lines.push(b.title+(b.author?' by '+b.author:'')+' — '+b.total+' pages'+(b.doneDate?', finished '+b.doneDate:''));
    });
  }
  if(!reading.length&&!done.length)lines.push('(no books)');
  clipCopy(lines.join('\n'),'Books');
}

function exportS(){
  var lines=['=== S LOG ==='];
  if(!sLog.length){lines.push('(no entries)');clipCopy(lines.join('\n'),'S log');return;}
  var latest=sLog[sLog.length-1];
  var since=timeSince(latest.ts);
  lines.push('Last S: '+since.val+' '+since.unit+' ago');
  lines.push('Total entries: '+sLog.length);
  lines.push('\n--- HISTORY ---');
  var sorted=sLog.slice().reverse();
  sorted.forEach(function(e){
    var d=new Date(e.ts);
    var ds=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
    var ts=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    lines.push(ds+' '+ts+(e.note?' — '+e.note:''));
  });
  clipCopy(lines.join('\n'),'S log');
}

//  PRAYER TRACKER 
var PT_PRAYERS=['Fajr','Dhuhr','Asr','Maghrib','Isha']; // Sunrise not tracked
var ptData=lsGet('pt_data',{});
var ptTab='today';
var ptViewDate=localDateStr();
var ptExtraOpen=(localStorage.getItem('pt_extra_open')||'0')==='1';
Object.keys(ptData).forEach(function(k){
  if(!isDateKey(k))return;
  if(!ptData[k]||typeof ptData[k]!=='object')ptData[k]={};
  if(!ptData[k]._updatedAt)ptData[k]._updatedAt=new Date(k+'T12:00:00').toISOString();
});
function ptTouchDay(dateKey){
  if(!ptData[dateKey])ptData[dateKey]={};
  ptData[dateKey]._updatedAt=syncNowIso();
  ptData[dateKey]._deviceId=getSyncDeviceId();
}

function ptToggleExtraInfo(){
  ptExtraOpen=!ptExtraOpen;
  localStorage.setItem('pt_extra_open',ptExtraOpen?'1':'0');
  var wrap=document.getElementById('pt-extra-wrap');
  var arrow=document.getElementById('pt-extra-arrow');
  if(ptTab==='today'&&wrap){
    if(ptExtraOpen){
      wrap.style.maxHeight=wrap.scrollHeight+'px';
      wrap.style.opacity='1';
    } else {
      wrap.style.maxHeight='0px';
      wrap.style.opacity='0';
    }
    if(arrow)arrow.style.transform=ptExtraOpen?'rotate(0deg)':'rotate(-90deg)';
  } else if(ptTab==='today'){
    ptRenderToday();
  }
}


function ptSetFocus(dateKey,val){
  if(!ptData[dateKey])ptData[dateKey]={};
  // Toggle off if same value tapped again
  ptData[dateKey]._focus=(ptData[dateKey]._focus===val)?0:val;
  ptTouchDay(dateKey);
  ptSave();
  if(ptTab==='today')ptRenderToday();
}

function ptRenderFocus(){
  var el=document.getElementById('pt-focus-panel');
  if(!el)return;
  var today=new Date();
  var allDates=Object.keys(ptData).sort().reverse();
  var focusDates=allDates.filter(function(d){return ptData[d]&&ptData[d]._focus;});
  if(!focusDates.length){
    el.innerHTML='<div style="font-size:var(--t-md);color:var(--dim);padding:12px 0">No focus ratings yet. Rate your concentration after each prayer session.</div>';
    return;
  }
  // Stats
  var vals=focusDates.map(function(d){return ptData[d]._focus||0;});
  var avg=Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length*10)/10;
  var best=Math.max.apply(null,vals);
  var recent=vals.slice(0,7);
  var trend=recent.length>1?(recent[0]>recent[recent.length-1]?'up':recent[0]<recent[recent.length-1]?'down':'flat'):'—';
  var trendIcon=trend==='up'?'↗':trend==='down'?'↘':'→';
  var trendCol=trend==='up'?'var(--cg)':trend==='down'?'var(--cr)':'var(--dim)';
  var h='';
  // Stats row
  h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">';
  function fstat(v,l,col){return '<div class="text-center"><div style="font-family:VT323,monospace;font-size:var(--t-h1);color:'+(col||'var(--cc)')+'">'+v+'</div><div class="dim-9">'+l+'</div></div>';}
  h+=fstat(avg,'AVG FOCUS');
  h+=fstat(best+'/10','BEST DAY','var(--cg)');
  h+=fstat(trendIcon,'7-DAY TREND',trendCol);
  h+='</div>';
  // Bar chart — last 14 days
  h+='<div style="font-size:var(--t-xs);letter-spacing:1px;color:var(--dim);margin-bottom:6px">LAST 14 DAYS</div>';
  h+='<div style="display:flex;align-items:flex-end;gap:3px;height:60px;margin-bottom:10px">';
  var last14=focusDates.slice(0,14).reverse();
  last14.forEach(function(d){
    var v=ptData[d]._focus||0;
    var pct=Math.round((v/10)*100);
    var col=v<=3?'var(--cr)':v<=6?'var(--ca)':'var(--cg)';
    h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">';
    h+='<div style="width:100%;background:'+col+';height:'+pct+'%;min-height:2px;border-radius:1px 1px 0 0" title="'+d+': '+v+'"></div>';
    h+='<div style="font-size:var(--t-xxs);color:var(--dim)">'+d.slice(8)+'</div>';
    h+='</div>';
  });
  h+='</div>';
  // Per-prayer average (which prayer gets best focus)
  h+='<div style="font-size:var(--t-xs);letter-spacing:1px;color:var(--dim);margin-bottom:6px">BY PRAYER (avg focus)</div>';
  var prayerFocus={};
  var prayerCount={};
  PT_PRAYERS.forEach(function(p){prayerFocus[p]=0;prayerCount[p]=0;});
  // Note: focus is per day, not per prayer. Show day-level data per day-of-week instead
  var dowFocus=[0,0,0,0,0,0,0],dowCount=[0,0,0,0,0,0,0];
  focusDates.forEach(function(d){
    var dow=new Date(d+'T12:00:00').getDay();
    dowFocus[dow]+=(ptData[d]._focus||0);
    dowCount[dow]++;
  });
  h+='<div class="flex-row-4">';
  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(function(d,i){
    var avg2=dowCount[i]?Math.round(dowFocus[i]/dowCount[i]*10)/10:0;
    var col=!avg2?'var(--c-border)':avg2<=3?'var(--cr)':avg2<=6?'var(--ca)':'var(--cg)';
    h+='<div style="flex:1;text-align:center">';
    h+='<div style="font-size:var(--t-base);color:'+col+';font-family:VT323,monospace">'+(avg2||'—')+'</div>';
    h+='<div class="dim-9">'+d+'</div>';
    h+='</div>';
  });
  h+='</div>';
  // Recent log
  h+='<div style="font-size:var(--t-xs);letter-spacing:1px;color:var(--dim);margin-bottom:6px">RECENT LOG</div>';
  h+='<div style="max-height:140px;overflow-y:auto">';
  focusDates.slice(0,20).forEach(function(d){
    var v=ptData[d]._focus||0;
    var col=v<=3?'var(--cr)':v<=6?'var(--ca)':'var(--cg)';
    var bar='█'.repeat(v)+'░'.repeat(10-v);
    h+='<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:var(--t-base)">';
    h+='<span style="color:var(--dim);min-width:80px">'+d+'</span>';
    h+='<span style="color:'+col+';letter-spacing:1px;font-size:var(--t-xs)">'+bar+'</span>';
    h+='<span style="color:'+col+';font-weight:bold;min-width:20px">'+v+'</span>';
    h+='</div>';
  });
  h+='</div>';
  el.innerHTML=h;
}

function ptSave(){lsSet('pt_data',ptData);}

function ptTodayKey(){return localDateStr();}

function ptSetStatus(dateKey,prayer,status,evt){
  safeHap(status==='prayed'?HAP.check:status==='missed'?HAP.error:HAP.soft);
  if(!ptData[dateKey])ptData[dateKey]={};
  if(ptData[dateKey][prayer]===status){
    delete ptData[dateKey][prayer];
  } else {
    ptData[dateKey][prayer]=status;
    if(status==='ontime'&&evt){
      var r=evt.target.getBoundingClientRect();
      confetti(r.left+r.width/2,r.top+r.height/2,'#00ff88');
    }
  }
  ptTouchDay(dateKey);
  ptSave();
  if(ptTab==='today')ptRenderToday();
  else ptRenderLog();
  setTimeout(checkPrayerSparkle,200);
}

// Rakaat per prayer for balance math
var PT_RAKAAT={Fajr:2,Dhuhr:4,Asr:4,Maghrib:3,Isha:4};
var PT_DAILY_OBLIGATION=17; // sum of all 5

function ptDayBalance(dateKey){
  var day=ptData[dateKey]||{};
  setTimeout(checkPrayerSparkle,200);
  var prayed=0,missed=0;
  PT_PRAYERS.forEach(function(p){
    var s=day[p];
    var r=PT_RAKAAT[p]||0;
    if(s==='ontime'||s==='late') prayed+=r;
    else if(s==='missed') missed+=r;
    // unlogged: treat as unknown, don't count as missed
  });
  var extra=day._extra||0;
  // balance = prayed - obligation_for_logged_prayers + extra
  // only penalize for explicitly missed
  var loggedObligation=prayed+missed;
  var bal=(prayed-loggedObligation)+extra; // = -missed + extra
  return{prayed:prayed,missed:missed,extra:extra,bal:bal};
}

function ptAddExtra(dateKey,delta){
  safeHap(delta>0?HAP.goal:HAP.soft);
  if(!ptData[dateKey])ptData[dateKey]={};
  var cur=ptData[dateKey]._extra||0;
  var next=Math.max(0,cur+delta);
  ptData[dateKey]._extra=next;
  ptTouchDay(dateKey);
  ptSave();
  if(ptTab==='today')ptRenderToday();
  else if(ptTab==='balance')ptRenderBalance();
  else if(ptTab==='focus')ptRenderFocus();
}
function ptSetEasyOnly(dateKey,val){
  if(!ptData[dateKey])ptData[dateKey]={};
  if(val===1){ptData[dateKey]._easyOnly=1;}
  else if(val===0){ptData[dateKey]._easyOnly=0;}
  else{delete ptData[dateKey]._easyOnly;}
  ptTouchDay(dateKey);
  ptSave();
  if(ptTab==='today')ptRenderToday();
  else if(ptTab==='log')ptRenderLog();
}

var ptBalPeriod='all';

var _ptTabPrev='today';
var _ptOrder=['today','log','balance','focus'];
var _ptPanels={today:'pt-today',log:'pt-log',balance:'pt-balance-panel',focus:'pt-focus-panel'};
var _ptTabEls={today:'pt-tab-today',log:'pt-tab-log',balance:'pt-tab-balance',focus:'pt-tab-focus'};
function ptSwitchTab(tab){
  safeHap(HAP.tap);
  var prev=_ptTabPrev;
  ptTab=tab;_ptTabPrev=tab;
  _ptOrder.forEach(function(t){
    var te=document.getElementById(_ptTabEls[t]);
    if(te){te.style.color=t===tab?'var(--ca)':'var(--dim)';te.style.borderColor=t===tab?'var(--ca)':'var(--dim)';}
  });
  _tabSlide(_ptOrder, _ptPanels[prev], _ptPanels[tab], _ptOrder.indexOf(prev), _ptOrder.indexOf(tab));
  if(tab==='today') ptRenderToday();
  else if(tab==='log'){ptViewDate=localDateStr();ptRenderLog();}
  else if(tab==='balance') ptRenderBalance();
  else if(tab==='focus') ptRenderFocus();
}

function ptStatusClass(s){
  if(s==='ontime')return'sel-ontime';
  if(s==='late')return'sel-late';
  if(s==='missed')return'sel-missed';
  return'';
}

function ptNavDay(offset){
  safeHap(HAP.tap);
  var d=new Date(ptViewDate+'T12:00:00');
  d.setDate(d.getDate()+offset);
  ptViewDate=localDateStr(d);
  ptRenderToday();
}

function ptRenderTodayLegacy(){
  var el=document.getElementById('pt-today');
  if(!el)return;
  var today=ptTodayKey();
  var isToday=(ptViewDate===today);
  var day=ptData[ptViewDate]||{};
  var cur=isToday?(currentPrayer()||''):'';
  var vd=new Date(ptViewDate+'T12:00:00');
  var dayLabel=DAYS[vd.getDay()].slice(0,3).toUpperCase()+', '+MO3[vd.getMonth()]+' '+vd.getDate()+' '+vd.getFullYear()+(isToday?' • TODAY':'');
  var h='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    +'<button onclick="ptNavDay(-1)" style="background:transparent;border:1px solid rgba(255,204,0,.3);color:var(--ca);padding:4px 11px;cursor:pointer;font-size:var(--t-lg)">&#8592;</button>'
    +'<span style="font-size:var(--t-base);letter-spacing:2px;color:var(--ca)">'+dayLabel+'</span>'
    +'<button onclick="ptNavDay(1)" style="background:transparent;border:1px solid rgba(255,204,0,.3);color:var(--ca);padding:4px 11px;cursor:pointer;font-size:var(--t-lg);'+(isToday?'opacity:.25;pointer-events:none':'')+'">&#8594;</button>'
    +'</div>';
  h+='<div class="pt-score-bar" class="mb-10">';
  PT_PRAYERS.forEach(function(p){
    var s=day[p];
    h+='<div class="pt-score-seg'+(s==='ontime'?' s-on':s==='late'?' s-late':s==='missed'?' s-miss':'')+'"></div>';
  });
  h+='</div>';
  PT_PRAYERS.forEach(function(p){
    var s=day[p]||null;
    var isActive=isToday&&(p.toLowerCase()===cur.toLowerCase());
    h+='<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">'
      +'<span style="font-size:var(--t-base);letter-spacing:2px;width:58px;flex-shrink:0;color:'+(isActive?'var(--ca)':'var(--dim)')+(isActive?';text-shadow:var(--ga)':'')+'">'
      +p.toUpperCase()+'</span>'
      +'<div style="display:flex;gap:4px;flex:1">'
      +'<button data-pt-status="ontime" data-pt-date="'+ptViewDate+'" data-pt-prayer="'+p+'" class="pt-sp-btn" style="flex:1;padding:'+(s==="ontime"?'12px':'8px')+' 0;border:1px solid '+(s==="ontime"?'var(--cg)':'rgba(0,255,136,.12)')+';background:'+(s==="ontime"?'rgba(0,255,136,.2)':'transparent')+';color:'+(s==="ontime"?'var(--cg)':'rgba(0,255,136,.18)')+';font-size:'+(s==="ontime"?'var(--t-title)':'var(--t-md)')+';font-weight:bold;cursor:pointer;border-radius:3px;transition:all .12s">✓</button>'
      +'<button data-pt-status="late" data-pt-date="'+ptViewDate+'" data-pt-prayer="'+p+'" class="pt-sp-btn" style="flex:1;padding:'+(s==="late"?'12px':'8px')+' 0;border:1px solid '+(s==="late"?'var(--ca)':'rgba(255,204,0,.1)')+';background:'+(s==="late"?'rgba(255,204,0,.2)':'transparent')+';color:'+(s==="late"?'var(--ca)':'rgba(255,204,0,.15)')+';font-size:'+(s==="late"?'var(--t-base)':'var(--t-xs)')+';font-weight:bold;letter-spacing:1px;cursor:pointer;border-radius:3px;transition:all .12s">LATE</button>'
      +'<button data-pt-status="missed" data-pt-date="'+ptViewDate+'" data-pt-prayer="'+p+'" class="pt-sp-btn" style="flex:1;padding:'+(s==="missed"?'12px':'8px')+' 0;border:1px solid '+(s==="missed"?'var(--cr)':'rgba(255,68,68,.1)')+';background:'+(s==="missed"?'rgba(255,68,68,.2)':'transparent')+';color:'+(s==="missed"?'var(--cr)':'rgba(255,68,68,.15)')+';font-size:'+(s==="missed"?'var(--t-title)':'var(--t-md)')+';font-weight:bold;cursor:pointer;border-radius:3px;transition:all .12s">✗</button>'
      +'</div>'
      +'</div>';
  });
  // Extra voluntary prayers row
  var extra=(day._extra||0);
  var bal=ptDayBalance(ptViewDate);
  var balCls=bal.bal>0?'pt-balance-pos':bal.bal<0?'pt-balance-neg':'pt-balance-zero';
  h+='<div class="pt-extra-row">'
    +'<div><div style="font-size:var(--t-base);letter-spacing:1px;color:var(--ca)">EXTRA RAKAAT</div>'
    +'<div class="dim-9-mt">voluntary prayers</div></div>'
    +'<div class="flex-center">'
    +'<button class="pt-extra-btn" onclick="ptAddExtra(\'' +ptViewDate+ '\',-1)">&#8722;</button>'
    +'<span class="pt-extra-count">'+extra+'</span>'
    +'<button class="pt-extra-btn" onclick="ptAddExtra(\'' +ptViewDate+ '\',1)" style="border-color:var(--ca)">&#43;</button>'
    +'</div></div>';
  // Day balance
  h+='<div class="pt-balance-bar">'
    +'<div><div class="pt-balance-lbl">TODAYS BALANCE</div>'
    +'<div class="dim-9-mt">'+(bal.missed?bal.missed+' missed':bal.prayed+'/17 prayed')+'</div></div>'
    +'<div class="pt-balance-num '+balCls+'">'+(bal.bal>=0?'+':'')+bal.bal+'</div>'
    +'</div>';

  var easyState=(day._easyOnly===1||day._easyOnly===0)?day._easyOnly:null;
  var easyYes=easyState===1;
  var easyNo=easyState===0;
  h+='<div style="margin-top:8px;padding:8px;border:1px solid rgba(255,95,160,.18);background:rgba(255,95,160,.06)">';
  h+='<div style="font-size:var(--t-sm);letter-spacing:1px;color:var(--cp);margin-bottom:6px">EASY SURAHS ONLY</div>';
  h+='<div class="flex-row">';
  h+='<button onclick="ptSetEasyOnly(\''+ptViewDate+'\',1)" style="flex:1;padding:7px 0;border:1px solid '+(easyYes?'var(--cp)':'var(--c-faint)')+';background:'+(easyYes?'rgba(255,95,160,.16)':'transparent')+';color:'+(easyYes?'var(--cp)':'var(--dim)')+';font-size:var(--t-base);cursor:pointer">YES</button>';
  h+='<button onclick="ptSetEasyOnly(\''+ptViewDate+'\',0)" style="flex:1;padding:7px 0;border:1px solid '+(easyNo?'rgba(0,255,136,.35)':'var(--c-faint)')+';background:'+(easyNo?'rgba(0,255,136,.1)':'transparent')+';color:'+(easyNo?'var(--cg)':'var(--dim)')+';font-size:var(--t-base);cursor:pointer">NO</button>';
  h+='</div>';
  h+='<div style="font-size:var(--t-xs);color:var(--dim);margin-top:5px">'+(easyState===1?'Logged as easy-surah-only day.':easyState===0?'Logged as normal-surah day.':'Not set yet.')+'</div>';
  h+='</div>';

  //  Focus section 
  h+='<hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:12px 0">';
  h+='<div style="font-size:var(--t-xs);letter-spacing:2px;color:var(--dim);margin-bottom:8px">FOCUS LEVEL</div>';
  var focusVal=(day._focus||0);
  h+='<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:5px">';
  for(var fi=1;fi<=10;fi++){
    var fSel=focusVal===fi;
    var fCol=fi<=3?'var(--cr)':fi<=6?'var(--ca)':'var(--cg)';
    var fBg=fSel?fCol.replace('var(--cr)','rgba(255,68,68,.18)').replace('var(--ca)','rgba(255,204,0,.18)').replace('var(--cg)','rgba(0,255,136,.18)'):'transparent';
    h+='<button id="ptf-'+fi+'-'+ptViewDate+'" onclick="ptSetFocus(\''+ptViewDate+'\','+fi+')" '
      +'style="flex:1;min-width:24px;padding:8px 2px;border:1px solid '+(fSel?fCol:'rgba(255,255,255,.12)')+';background:'+(fSel?fBg:'transparent')+';color:'+(fSel?fCol:'var(--dim)')+';font-size:var(--t-lg);cursor:pointer;font-family:monospace;font-weight:'+(fSel?'bold':'normal')+'">'+fi+'</button>';
  }
  h+='</div>';
  h+='<div class="dim-9">'+(focusVal?'Focus: '+focusVal+'/10 — '+(focusVal<=3?'low concentration':focusVal<=6?'moderate':'high concentration'):'Tap a number to rate your focus')+'</div>';
  el.innerHTML=h;
}
var PT_PRAYERS_5=['Fajr','Dhuhr','Asr','Maghrib','Isha'];

function ptGetLastNDays(n){
  // Returns array of YYYY-MM-DD strings for last n days (most recent first)
  var days=[];
  var d=new Date();
  for(var i=0;i<n;i++){
    var s=new Date(d);s.setDate(d.getDate()-i);
    days.push(s.toISOString().slice(0,10));
  }
  return days;
}

function ptCheckNotices(){
  var el=document.getElementById('pt-notices');
  if(!el)return;
  var notices=[];

  //  1. Focus < 4 for past 5+ consecutive days 
  var focusStreak=0;
  var checkDays=ptGetLastNDays(30);
  for(var i=0;i<checkDays.length;i++){
    var d=checkDays[i];
    var focus=(ptData[d]&&ptData[d]._focus)||0;
    if(focus>0&&focus<4){focusStreak++;}
    else if(focus===0){break;} // no data = stop counting
    else{break;} // focus>=4 = streak broken
  }
  if(focusStreak>=5){
    notices.push({
      type:'focus',
      msg:'Focus has been below 4 for '+focusStreak+' consecutive days. Consider reflecting on what is pulling your attention away during salah.'
    });
  }

  //  2. All easy surahs (easyOnly=1) for past 5 days 
  var easyStreak=0;
  var last5=ptGetLastNDays(5);
  for(var i=0;i<last5.length;i++){
    var d=last5[i];
    var day=ptData[d]||{};
    // Only count days where at least one prayer was logged
    var hasAnyPrayer=PT_PRAYERS_5.some(function(p){return day[p];});
    if(hasAnyPrayer&&day._easyOnly===1){easyStreak++;}
    else if(hasAnyPrayer&&day._easyOnly!==1){easyStreak=0;break;}
    // days with no prayers don't break the streak but don't count
  }
  if(easyStreak>=5){
    notices.push({
      type:'easy',
      msg:'Easy surahs only for the past '+easyStreak+' days. Try challenging yourself with a longer surah — even just one prayer.'
    });
  }

  //  3. At least 1 missed prayer for past 3+ consecutive days 
  var missedStreak=0;
  for(var i=0;i<checkDays.length;i++){
    var d=checkDays[i];
    var day=ptData[d]||{};
    var hasMissed=PT_PRAYERS_5.some(function(p){return day[p]==='missed';});
    var hasAny=PT_PRAYERS_5.some(function(p){return day[p];});
    if(hasAny&&hasMissed){missedStreak++;}
    else if(hasAny&&!hasMissed){break;} // clean day = streak broken
    else{break;} // no data = stop
  }
  if(missedStreak>=3){
    notices.push({
      type:'missed',
      msg:'At least one missed prayer for '+missedStreak+' consecutive days. Every prayer is a chance to return — start fresh with the next one.'
    });
  }

  //  4. Mood below 4 for more than 3 days 
  try{
    var mlData=lsGet('dash_ml',[]);
    if(mlData.length){
      var lowMoodStreak=0;
      var moodDays=ptGetLastNDays(14);
      for(var i=0;i<moodDays.length;i++){
        var d=moodDays[i];
        var entry=mlData.find(function(e){return e.date===d;});
        if(entry&&entry.mood<4){lowMoodStreak++;}
        else if(entry&&entry.mood>=4){break;}
        // days with no mood entry don't count but don't break streak
      }
      if(lowMoodStreak>3){
        notices.push({
          type:'mood',
          msg:'Your mood has been low for '+lowMoodStreak+' days. Take it easy on yourself — have faith that Allah sees your struggle and will bring ease. "Verily, with hardship comes ease." (94:5)'
        });
      }
    }
  }catch(e){}

  //  Render 
  if(!notices.length){el.innerHTML='';return;}
  var dismissed=JSON.parse(sessionStorage.getItem('pt-notices-dismissed')||'[]');
  var active=notices.filter(function(n){return dismissed.indexOf(n.type)<0;});
  if(!active.length){el.innerHTML='';return;}
  var h='';
  active.forEach(function(n){
    var icon=n.type==='focus'?'◎':n.type==='easy'?'☽':n.type==='missed'?'△':'♥';
    var col=n.type==='mood'?'var(--cc)':'var(--ca)';
    h+='<div class="inactivity-notice'+(n.days>5?' jiggle':'')+'" style="margin-bottom:4px;border-color:'+col+'40">';
    h+='<span style="color:'+col+'">'+icon+' '+n.msg+'</span>';
    h+='<button data-ptnotice="'+n.type+'" style="background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:var(--t-lg);padding:0 2px">&#10005;</button>';
    h+='</div>';
  });
  el.innerHTML=h;
  // Wire dismiss buttons
  el.querySelectorAll('[data-ptnotice]').forEach(function(btn){
    btn.onclick=function(){ptDismissNotice(this.dataset.ptnotice);};
  });
}

function ptDismissNotice(type){
  var dismissed=JSON.parse(sessionStorage.getItem('pt-notices-dismissed')||'[]');
  if(dismissed.indexOf(type)<0)dismissed.push(type);
  sessionStorage.setItem('pt-notices-dismissed',JSON.stringify(dismissed));
  ptCheckNotices();
}
function ptMonthPct(){
  // Calculate this month's on-time percentage
  var now=new Date();
  var yr=now.getFullYear(),mo=now.getMonth();
  var total=0,onTime=0;
  Object.keys(ptData).forEach(function(dk){
    var d=new Date(dk+'T12:00:00');
    if(d.getFullYear()!==yr||d.getMonth()!==mo)return;
    PT_PRAYERS.forEach(function(p){
      var s=(ptData[dk]||{})[p];
      if(s==='ontime'){total++;onTime++;}
      else if(s==='late'||s==='missed'){total++;}
    });
  });
  if(!total)return null;
  return Math.round(onTime/total*100);
}

function ptRenderToday(){
  var el=document.getElementById('pt-today');
  if(!el)return;

  ptCheckNotices();
  var today=ptTodayKey();
  var isToday=(ptViewDate===today);
  var day=ptData[ptViewDate]||{};
  var cur=isToday?(currentPrayer()||''):'';
  var vd=new Date(ptViewDate+'T12:00:00');
  var dayLabel=DAYS[vd.getDay()].slice(0,3).toUpperCase()+', '+MO3[vd.getMonth()]+' '+vd.getDate()+' '+vd.getFullYear()+(isToday?' • TODAY':'');
  var h='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    +'<button onclick="ptNavDay(-1)" style="background:transparent;border:1px solid rgba(255,204,0,.3);color:var(--ca);padding:4px 11px;cursor:pointer;font-size:var(--t-lg)">&#8592;</button>'
    +'<span style="font-size:var(--t-base);letter-spacing:2px;color:var(--ca)">'+dayLabel+'</span>'
    +'<button onclick="ptNavDay(1)" style="background:transparent;border:1px solid rgba(255,204,0,.3);color:var(--ca);padding:4px 11px;cursor:pointer;font-size:var(--t-lg);'+(isToday?'opacity:.25;pointer-events:none':'')+'">&#8594;</button>'
    +'</div>';
  h+='<div class="pt-score-bar" class="mb-10">';
  PT_PRAYERS.forEach(function(p){
    var s=day[p];
    h+='<div class="pt-score-seg'+(s==='ontime'?' s-on':s==='late'?' s-late':s==='missed'?' s-miss':'')+'"></div>';
  });
  h+='</div>';
  PT_PRAYERS.forEach(function(p){
    var s=day[p]||null;
    var isActive=isToday&&(p.toLowerCase()===cur.toLowerCase());
    h+='<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">'
      +'<span style="font-size:var(--t-base);letter-spacing:2px;width:58px;flex-shrink:0;color:'+(isActive?'var(--ca)':'var(--dim)')+(isActive?';text-shadow:var(--ga)':'')+'">'
      +p.toUpperCase()+'</span>'
      +'<div style="display:flex;gap:5px;flex:1">'
      +'<button onclick="ptSetStatus(\'' +ptViewDate+ '\',\'' +p+ '\',\'ontime\',event)" style="flex:1;padding:9px 0;border:1px solid '+(s==='ontime'?'var(--cg)':'rgba(0,255,136,.2)')+';background:'+(s==='ontime'?'var(--c-ok-dim)':'transparent')+';color:'+(s==='ontime'?'var(--cg)':'rgba(0,255,136,.4)')+';font-size:var(--t-body);cursor:pointer;border-radius:3px">&#10003;</button>'
      +'<button onclick="ptSetStatus(\'' +ptViewDate+ '\',\'' +p+ '\',\'late\')" style="flex:1;padding:9px 0;border:1px solid '+(s==='late'?'var(--ca)':'var(--c-gold-dim)')+';background:'+(s==='late'?'rgba(255,204,0,.15)':'transparent')+';color:'+(s==='late'?'var(--ca)':'rgba(255,204,0,.4)')+';font-size:var(--t-sm);letter-spacing:1px;cursor:pointer;border-radius:3px">LATE</button>'
      +'<button onclick="ptSetStatus(\'' +ptViewDate+ '\',\'' +p+ '\',\'missed\')" style="flex:1;padding:9px 0;border:1px solid '+(s==='missed'?'var(--cr)':'rgba(255,68,68,.2)')+';background:'+(s==='missed'?'rgba(255,68,68,.15)':'transparent')+';color:'+(s==='missed'?'var(--cr)':'rgba(255,68,68,.4)')+';font-size:var(--t-body);cursor:pointer;border-radius:3px">&#10005;</button>'
      +'</div>'
      +'</div>';
  });

  h+='<div onclick="ptToggleExtraInfo()" style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid rgba(255,255,255,.12);cursor:pointer;background:rgba(255,255,255,.02)">';
  h+='<span style="font-size:var(--t-sm);letter-spacing:2px;color:var(--dim)">EXTRA INFO</span>';
  h+='<span id="pt-extra-arrow" style="font-size:var(--t-md);color:var(--ca);transform:'+(ptExtraOpen?'rotate(0deg)':'rotate(-90deg)')+';transition:transform .2s">&#9660;</span>';
  h+='</div>';
  h+='<div id="pt-extra-wrap" style="max-height:'+(ptExtraOpen?'900px':'0')+';overflow:hidden;transition:max-height .28s ease,opacity .2s;opacity:'+(ptExtraOpen?'1':'0')+'">';

  var extra=(day._extra||0);
  var bal=ptDayBalance(ptViewDate);
  var balCls=bal.bal>0?'pt-balance-pos':bal.bal<0?'pt-balance-neg':'pt-balance-zero';
  h+='<div class="pt-extra-row" style="margin-top:8px">'
    +'<div><div style="font-size:var(--t-base);letter-spacing:1px;color:var(--ca)">EXTRA RAKAAT</div>'
    +'<div class="dim-9-mt">voluntary prayers</div></div>'
    +'<div class="flex-center">'
    +'<button class="pt-extra-btn" onclick="ptAddExtra(\'' +ptViewDate+ '\',-1)">&#8722;</button>'
    +'<span class="pt-extra-count">'+extra+'</span>'
    +'<button class="pt-extra-btn" onclick="ptAddExtra(\'' +ptViewDate+ '\',1)" style="border-color:var(--ca)">&#43;</button>'
    +'</div></div>';
  h+='<div class="pt-balance-bar">'
    +'<div><div class="pt-balance-lbl">TODAYS BALANCE</div>'
    +'<div class="dim-9-mt">'+(bal.missed?bal.missed+' missed':bal.prayed+'/17 prayed')+'</div></div>'
    +'<div class="pt-balance-num '+balCls+'">'+(bal.bal>=0?'+':'')+bal.bal+'</div>'
    +'</div>';

  var easyState=(day._easyOnly===1||day._easyOnly===0)?day._easyOnly:null;
  var easyYes=easyState===1;
  var easyNo=easyState===0;
  h+='<div style="margin-top:8px;padding:8px;border:1px solid rgba(255,95,160,.18);background:rgba(255,95,160,.06)">';
  h+='<div style="font-size:var(--t-sm);letter-spacing:1px;color:var(--cp);margin-bottom:6px">EASY SURAHS ONLY</div>';
  h+='<div class="flex-row">';
  h+='<button onclick="ptSetEasyOnly(\''+ptViewDate+'\',1)" style="flex:1;padding:7px 0;border:1px solid '+(easyYes?'var(--cp)':'var(--c-faint)')+';background:'+(easyYes?'rgba(255,95,160,.16)':'transparent')+';color:'+(easyYes?'var(--cp)':'var(--dim)')+';font-size:var(--t-base);cursor:pointer">YES</button>';
  h+='<button onclick="ptSetEasyOnly(\''+ptViewDate+'\',0)" style="flex:1;padding:7px 0;border:1px solid '+(easyNo?'rgba(0,255,136,.35)':'var(--c-faint)')+';background:'+(easyNo?'rgba(0,255,136,.1)':'transparent')+';color:'+(easyNo?'var(--cg)':'var(--dim)')+';font-size:var(--t-base);cursor:pointer">NO</button>';
  h+='</div>';
  h+='<div style="font-size:var(--t-xs);color:var(--dim);margin-top:5px">'+(easyState===1?'Logged as easy-surah-only day.':easyState===0?'Logged as normal-surah day.':'Not set yet.')+'</div>';
  h+='</div>';

  h+='<hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:12px 0">';
  h+='<div style="font-size:var(--t-xs);letter-spacing:2px;color:var(--dim);margin-bottom:8px">FOCUS LEVEL</div>';
  var focusVal=(day._focus||0);
  h+='<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:5px">';
  for(var fi=1;fi<=10;fi++){
    var fSel=focusVal===fi;
    var fCol=fi<=3?'var(--cr)':fi<=6?'var(--ca)':'var(--cg)';
    var fBg=fSel?fCol.replace('var(--cr)','rgba(255,68,68,.18)').replace('var(--ca)','rgba(255,204,0,.18)').replace('var(--cg)','rgba(0,255,136,.18)'):'transparent';
    h+='<button id="ptf-'+fi+'-'+ptViewDate+'" onclick="ptSetFocus(\''+ptViewDate+'\','+fi+')" '
      +'style="flex:1;min-width:24px;padding:8px 2px;border:1px solid '+(fSel?fCol:'rgba(255,255,255,.12)')+';background:'+(fSel?fBg:'transparent')+';color:'+(fSel?fCol:'var(--dim)')+';font-size:var(--t-lg);cursor:pointer;font-family:monospace;font-weight:'+(fSel?'bold':'normal')+'">'+fi+'</button>';
  }
  h+='</div>';
  h+='<div class="dim-9">'+(focusVal?'Focus: '+focusVal+'/10 - '+(focusVal<=3?'low concentration':focusVal<=6?'moderate':'high concentration'):'Tap a number to rate your focus')+'</div>';
  h+='</div>';
  // ── Forbidden prayer times rendered in prayer tile ──
  if(isToday&&prayers)renderForbiddenTimes();  el.innerHTML=h;
  // Wire prayer status buttons
  el.querySelectorAll('[data-pt-status]').forEach(function(btn){
    btn.onclick=function(){
      var status=this.dataset.ptStatus;
      var dateKey=this.dataset.ptDate;
      var prayer=this.dataset.ptPrayer;
      ptSetStatus(dateKey,prayer,status,{target:this});
    };
  });
}

var ptCollapsed={};
function ptToggleMonth(key){
  ptCollapsed[key]=!ptCollapsed[key];
  var body=document.getElementById('ptm-'+key);
  var icon=document.getElementById('ptmi-'+key);
  if(body){body.classList.toggle('collapsed',ptCollapsed[key]);}
  if(icon){icon.style.transform=ptCollapsed[key]?'rotate(-90deg)':'';}
}
function ptRenderLog(){
  var el=document.getElementById('pt-log');
  if(!el)return;
  var keys=Object.keys(ptData).sort().reverse();
  if(!keys.length){el.innerHTML='<div class="empty-msg-sm">No entries yet. Log some prayers first.</div>';return;}
  // Group by YYYY-MM
  var months={},monthOrder=[];
  keys.forEach(function(dk){
    var mo=dk.slice(0,7);
    if(!months[mo]){months[mo]=[];monthOrder.push(mo);}
    months[mo].push(dk);
  });
  var h='';
  monthOrder.forEach(function(mo,mi){
    var dkeys=months[mo];
    var moDate=new Date(mo+'-15T12:00:00');
    var moLabel=MONTHS[moDate.getMonth()].toUpperCase()+' '+moDate.getFullYear();
    // aggregate stats
    var totOn=0,totLate=0,totMiss=0,totPossible=dkeys.length*PT_PRAYERS.length;
    dkeys.forEach(function(dk){
      var day=ptData[dk]||{};
      PT_PRAYERS.forEach(function(p){
        if(day[p]==='ontime')totOn++;
        else if(day[p]==='late')totLate++;
        else if(day[p]==='missed')totMiss++;
      });
    });
    var collapsed=(ptCollapsed[mo]===undefined?mi>0:ptCollapsed[mo]);
    if(ptCollapsed[mo]===undefined)ptCollapsed[mo]=mi>0;
    h+='<div class="mb-8">'
      +'<div class="pt-month-hdr" onclick="ptToggleMonth(\'' +mo+ '\')">' 
      +'<span class="pt-month-label">'+moLabel+'</span>'
      +'<div class="pt-month-stats">'
      +(totOn?'<span style="color:var(--cg)">'+totOn+' ✓</span>':'')
      +(totLate?'<span style="color:var(--ca)">'+totLate+' late</span>':'')
      +(totMiss?'<span style="color:var(--cr)">'+totMiss+' ✗</span>':'')
      +'<span id="ptmi-'+mo+'" class="pt-month-toggle" style="transform:'+(collapsed?'rotate(-90deg)':'')+';">&#9660;</span>'
      +'</div></div>'
      +'<div id="ptm-'+mo+'" class="pt-month-body" style="max-height:2000px">';
    dkeys.forEach(function(dateKey){
      var day=ptData[dateKey]||{};
      var d=new Date(dateKey+'T12:00:00');
      var dstr=DAYS[d.getDay()].slice(0,3)+' '+d.getDate();
      var rowH='';
      PT_PRAYERS.forEach(function(p){
        var s=day[p];
        var cls=s==='ontime'?'pt-lp s-on':s==='late'?'pt-lp s-late':s==='missed'?'pt-lp s-miss':'pt-lp s-none';
        var lbl=s==='ontime'?'\u2713':s==='late'?'L':s==='missed'?'\u2715':'\u00B7';
        rowH+='<span class="'+cls+'">'+p.slice(0,3).toUpperCase()+' '+lbl+'</span>';
      });
      var ontime=PT_PRAYERS.filter(function(p){return day[p]==='ontime';}).length;
      var missed=PT_PRAYERS.filter(function(p){return day[p]==='missed';}).length;
      h+='<div class="pt-log-day" style="padding-left:10px">'
        +'<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px">'
        +'<span class="pt-log-date">'+dstr+'</span>'
        +'<span style="font-size:var(--t-sm);color:'+(missed?'var(--cr)':'var(--dim)')+'">'+ontime+'/'+PT_PRAYERS.length+(missed?' · '+missed+'✗':'')+'</span>'
        +'</div>'
        +'<div class="pt-log-pills">'+rowH+'</div>'
        +(day._easyOnly?'<div style="font-size:var(--t-sm);color:var(--cp);margin-top:3px;letter-spacing:.5px">Easy Surahs Only: YES</div>':'')
        +(day._focus?'<div style="font-size:var(--t-sm);color:'+(day._focus<=3?'var(--cr)':day._focus<=6?'var(--ca)':'var(--cg)')+';margin-top:3px;letter-spacing:.5px">Focus: '+day._focus+'/10 '+'█'.repeat(day._focus)+'░'.repeat(10-day._focus)+'</div>':'')
        +'</div>';
    });
    h+='</div></div>';
  });
  el.innerHTML=h;
  // Re-apply collapse state
  monthOrder.forEach(function(mo){
    if(ptCollapsed[mo]){
      var body=document.getElementById('ptm-'+mo);
      if(body)body.classList.add('collapsed');
    }
  });
}
function exportBalanceReport(){
  var keys=Object.keys(ptData).sort();
  if(!keys.length){clipCopy('(no prayer data)','Balance');return;}

  var today=localDateStr();
  var thisYear=today.slice(0,4);
  var thisMonth=today.slice(0,7);

  function buildSection(label,filtered){
    if(!filtered.length)return'';
    var total=filtered.reduce(function(a,d){return a+d.bal;},0);
    var totalMissed=filtered.reduce(function(a,d){return a+d.missed;},0);
    var totalExtra=filtered.reduce(function(a,d){return a+d.extra;},0);
    var lines=['## '+label,'','**Net Balance: '+(total>=0?'+':'')+total+'**',
      '- Missed rakaat: '+totalMissed,
      '- Extra voluntary: '+totalExtra,
      '- Days tracked: '+filtered.length,''];
    // Per-prayer stats
    var ps=ptComputePrayerStats(filtered.map(function(d){return d.dk;}));
    lines.push('','### Missed by Prayer');
    PT_PRAYERS.forEach(function(p){
      var s=ps[p];
      var bar='';
      for(var i=0;i<s.missed;i++)bar+='█';
      for(var i=0;i<s.late;i++)bar+='░';
      lines.push('- '+p+': '+s.missed+' missed, '+s.late+' late  '+bar);
    });
    lines.push('');
    filtered.slice().reverse().forEach(function(d){
      if(d.bal===0&&!d.missed&&!d.extra)return;
      var d2=new Date(d.dk+'T12:00:00');
      var dl=DAYS[d2.getDay()].slice(0,3)+' '+MO3[d2.getMonth()]+' '+d2.getDate()+' '+d2.getFullYear();
      var parts=[];
      if(d.missed)parts.push('-'+d.missed+' missed');
      if(d.extra)parts.push('+'+d.extra+' extra');
      lines.push('- '+dl+': '+(d.bal>=0?'+':'')+d.bal+(parts.length?' ('+parts.join(', ')+')':''));
    });
    return lines.join('\n');
  }

  var dayBals=keys.map(function(dk){var b=ptDayBalance(dk);return{dk:dk,bal:b.bal,missed:b.missed,extra:b.extra};});
  var allBals=dayBals;
  var yearBals=dayBals.filter(function(d){return d.dk.slice(0,4)===thisYear;});
  var monthBals=dayBals.filter(function(d){return d.dk.slice(0,7)===thisMonth;});

  var out=['# Salah Prayer Balance Report','*Exported: '+new Date().toLocaleString()+'*',''];
  out.push(buildSection('This Month ('+thisMonth+')',monthBals));
  out.push(buildSection('This Year ('+thisYear+')',yearBals));
  out.push(buildSection('All Time',allBals));
  clipCopy(out.filter(Boolean).join('\n\n'),'Balance report');
}

function ptComputePrayerStats(keys){
  var pStats={};
  PT_PRAYERS.forEach(function(p){pStats[p]={missed:0,late:0,ontime:0};});
  keys.forEach(function(dk){
    var day=ptData[dk]||{};
    PT_PRAYERS.forEach(function(p){
      var s=day[p];
      if(s==='missed')pStats[p].missed++;
      else if(s==='late')pStats[p].late++;
      else if(s==='ontime')pStats[p].ontime++;
    });
  });
  return pStats;
}

function ptBuildStatsBar(pStats){
  var maxMiss=Math.max.apply(null,PT_PRAYERS.map(function(p){return pStats[p].missed;}));
  if(maxMiss<1)maxMiss=1;
  var h='<div class="pt-stats-grid">';
  PT_PRAYERS.forEach(function(p){
    var st=pStats[p];
    var missH=Math.round((st.missed/maxMiss)*44);
    var lateH=Math.min(Math.round((st.late/maxMiss)*20),44-missH);
    var total=st.missed+st.late+st.ontime;
    var missRate=total>0?Math.round((st.missed/total)*100):0;
    h+='<div class="pt-stat-col">'      +'<div class="pt-stat-bar-wrap">'      +(st.late?'<div class="pt-stat-bar-late" style="height:'+lateH+'px"></div>':'')      +(st.missed?'<div class="pt-stat-bar-miss" style="height:'+missH+'px"></div>':'')      +'</div>'      +'<div class="pt-stat-num">'+(st.missed||'&#183;')+'</div>'      +'<div class="pt-stat-name">'+p.slice(0,3).toUpperCase()+'</div>'      +'</div>';
  });
  h+='</div>'    +'<div style="display:flex;gap:10px;font-size:var(--t-xs);margin-bottom:12px;margin-top:2px">'    +'<span style="color:var(--cr)">&#9632; missed</span>'    +'<span style="color:var(--ca)">&#9632; late</span>'    +'<span style="color:var(--dim)">bars = relative frequency</span>'    +'</div>';
  return h;
}

function ptRenderBalance(){
  var el=document.getElementById('pt-balance-panel');
  if(!el)return;
  var keys=Object.keys(ptData).sort();
  if(!keys.length){
    el.innerHTML='<div class="empty-msg-sm">No data yet. Start logging prayers.</div>';
    return;
  }
  // Compute per-day balances
  var dayBals=keys.map(function(dk){
    var b=ptDayBalance(dk);
    return{dk:dk,bal:b.bal,missed:b.missed,extra:b.extra,prayed:b.prayed};
  });

  // Period selector
  var h='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    +'<div class="pt-bal-period" style="margin-bottom:0">'
    +'<span class="pt-bal-pill'+(ptBalPeriod==='all'?' active':'')+'" onclick="ptSetBalPeriod(\'all\')">ALL TIME</span>'
    +'<span class="pt-bal-pill'+(ptBalPeriod==='year'?' active':'')+'" onclick="ptSetBalPeriod(\'year\')">THIS YEAR</span>'
    +'<span class="pt-bal-pill'+(ptBalPeriod==='month'?' active':'')+'" onclick="ptSetBalPeriod(\'month\')">THIS MONTH</span>'
    +'</div>'
    +'<button onclick="exportBalanceReport()" style="background:transparent;border:1px solid rgba(255,204,0,.3);color:var(--ca);font-size:var(--t-sm);padding:4px 9px;cursor:pointer;white-space:nowrap">&#128203; EXPORT</button>'
    +'</div>';

  // Filter by period
  var today=localDateStr();
  var thisYear=today.slice(0,4);
  var thisMonth=today.slice(0,7);
  var filtered=dayBals.filter(function(d){
    if(ptBalPeriod==='year')return d.dk.slice(0,4)===thisYear;
    if(ptBalPeriod==='month')return d.dk.slice(0,7)===thisMonth;
    return true;
  });

  // Running total
  var total=filtered.reduce(function(acc,d){return acc+d.bal;},0);
  var totalMissed=filtered.reduce(function(acc,d){return acc+d.missed;},0);
  var totalExtra=filtered.reduce(function(acc,d){return acc+d.extra;},0);
  var totalCls=total>0?'pt-balance-pos':total<0?'pt-balance-neg':'pt-balance-zero';

  // Big total
  h+='<div style="text-align:center;padding:14px 0;border-bottom:1px solid rgba(255,204,0,.1);margin-bottom:10px">'
    +'<div class="pt-balance-lbl" class="mb-4">NET BALANCE ('+(ptBalPeriod==='all'?'ALL TIME':ptBalPeriod==='year'?thisYear:thisMonth)+')</div>'
    +'<div class="pt-balance-num '+totalCls+'" style="font-size:52px">'+(total>=0?'+':'')+total+'</div>'
    +'<div style="display:flex;justify-content:center;gap:16px;margin-top:6px">'
    +'<span style="font-size:var(--t-sm);color:var(--cr)">&#8722;'+totalMissed+' missed</span>'
    +(totalExtra?'<span style="font-size:var(--t-sm);color:var(--ca)">+'+totalExtra+' extra</span>':'')
    +'<span class="dim-10">'+filtered.length+' days</span>'
    +'</div></div>';

  // Per-prayer stats for this period
  var filteredKeys=filtered.map(function(d){return d.dk;});
  var pStats=ptComputePrayerStats(filteredKeys);
  h+='<div style="margin-bottom:4px;font-size:var(--t-xs);letter-spacing:2px;color:var(--dim)">MISSED BY PRAYER</div>';
  h+=ptBuildStatsBar(pStats);

  // Day-by-day list reversed
  var rev=filtered.slice().reverse();
  rev.forEach(function(d){
    if(d.bal===0&&!d.missed&&!d.extra)return; // skip empty days
    var d2=new Date(d.dk+'T12:00:00');
    var dlabel=DAYS[d2.getDay()].slice(0,3)+' '+d2.getDate()+' '+MO3[d2.getMonth()];
    var cls=d.bal>0?'pt-balance-pos':d.bal<0?'pt-balance-neg':'pt-balance-zero';
    h+='<div class="pt-bal-row">'
      +'<span class="pt-bal-date">'+dlabel+'</span>'
      +'<div style="display:flex;gap:10px;align-items:center">'
      +(d.missed?'<span style="font-size:var(--t-sm);color:var(--cr)">&#8722;'+d.missed+'</span>':'')
      +(d.extra?'<span style="font-size:var(--t-sm);color:var(--ca)">+'+d.extra+'e</span>':'')
      +'<span class="pt-bal-val '+cls+'">'+(d.bal>=0?'+':'')+d.bal+'</span>'
      +'</div></div>';
  });

  if(!rev.filter(function(d){return d.bal!==0||d.missed||d.extra;}).length){
    h+='<div style="color:var(--dim);font-size:var(--t-base);padding:8px 0">No logged prayers in this period yet.</div>';
  }

  el.innerHTML=h;
}

function ptSetBalPeriod(p){
  ptBalPeriod=p;
  ptRenderBalance();
}

function exportPrayerLog(){
  var keys=Object.keys(ptData).filter(function(k){return Object.values(ptData[k]).some(function(v){return v&&v!=='not logged';});}).sort().reverse();
  if(!keys.length){clipCopy('(no prayer log entries)','Prayer log');return;}
  var lines=['SALAH LOG','DATE       F  D  A  M  I   SCORE  FOCUS  EASY'];
  var statusChar=function(s){return s==='ontime'?'\u2713':s==='late'?'~':s==='missed'?'\u2717':'-';};
  keys.forEach(function(dk){
    var day=ptData[dk]||{};
    var row=dk+'  ';
    PT_PRAYERS.forEach(function(p){row+=statusChar(day[p])+'  ';});
    var on=PT_PRAYERS.filter(function(p){return day[p]==='ontime';}).length;
    var miss=PT_PRAYERS.filter(function(p){return day[p]==='missed';}).length;
    row+=on+'/'+PT_PRAYERS.length;if(miss)row+='(-'+miss+')';
    row=row.padEnd(23);
    if(day._focus)row+=' f'+day._focus;
    if(day._easy&&Object.values(day._easy).some(Boolean)){var ep=Object.keys(day._easy).filter(function(p){return day._easy[p];}).map(function(p){return p[0];}).join('');row+=' e['+ep+']';}
    lines.push(row);
  });
  var allOn=0,allMiss=0,allLate=0,allTotal=0;
  keys.forEach(function(dk){var day=ptData[dk]||{};PT_PRAYERS.forEach(function(p){if(day[p]){allTotal++;if(day[p]==='ontime')allOn++;else if(day[p]==='late')allLate++;else if(day[p]==='missed')allMiss++;}});});
  lines.push('');
  lines.push('TOTAL '+keys.length+' days | \u2713'+allOn+' ~'+allLate+' \u2717'+allMiss+(allTotal?' ('+Math.round(allOn/allTotal*100)+'% on time)':''));
  clipCopy(lines.join('\n'),'Prayer log');
}

ptRenderToday();


//  SETTINGS SYSTEM 
var sSettings=(function(){try{var s=lsGet('dash_settings',{});return(s&&typeof s==='object')?s:{};}catch(e){return{};}})();
var sSections={view:false,display:false,data:false,supabase:false,layout:false,zipcodes:false,theme:false,hides:false,danger:false};

// Defaults
window._dbgCheckpoints['settings_defaults']=true;
var SETTING_DEFAULTS={compact:false,slimScreen:false,singleCol:false,bigCat:false,iconMode:false,minimalMode:false,vibrateOff:false,categoryNav:false,sectionHeaders:false,pinnedCards:false,snapToCard:false,crt:false,vignette:true,magnetMode:false,bigBorders:false,scrollGlow:false,sbAutoSync:false,noGoogleFonts:false,largeText:false,extraLargeText:false,bgVisuals:false,bgVisualSinSin:false,letterNav:false,textGlow:false,starfield:false,scrollTrail:false,cardEntrance:false};
var hiddenTiles=(function(){
  try{
    var v=lsGet('dash_hidden_tiles',[]);
    if(!Array.isArray(v))return[];
    // NEVER allow these to be hidden via localStorage — always force visible
    var alwaysVisible=['quick-nav','quran-cards','gratitude-log','dua-card','for-akhira',
      'the-wall','countdown','reframe','mood-log','life-streaks','quran-tracker','juz-amma',
      'goals','books','todo','notes','calendar','prayer-tracker','weather','clock'];
    v=v.filter(function(id){return alwaysVisible.indexOf(id)<0;});
    // Soul cards always hidden on page load — session only, unlocked by raft tap
    var soulCards=['legacy-letter','shadow-log','fear-inventory'];
    soulCards.forEach(function(id){if(v.indexOf(id)<0)v.push(id);});
    return v;
  }catch(e){return[];}
})();
var currentTheme=localStorage.getItem('dash_theme')||'default';
function saveHiddenTiles(showMsg){lsSet('dash_hidden_tiles',hiddenTiles);if(showMsg)showToast('\u2715 Card hidden');}

function getSetting(k){if(!sSettings)return SETTING_DEFAULTS?SETTING_DEFAULTS[k]:undefined;return sSettings[k]!==undefined?sSettings[k]:SETTING_DEFAULTS[k];}
function setSetting(k,v){sSettings[k]=v;lsSet('dash_settings',sSettings);}

var VIEW_MODES=['compact','slimScreen','iconMode','minimalMode','singleCol','bigCat'];

function refreshBuildLabel(){
  var el=document.getElementById('settings-build');
  if(!el)return;
  var lm=new Date(document.lastModified||Date.now());
  var file=(location.pathname||'').split('/').pop()||'';
  var m=file.match(/v\d+/i);
  var ver=m?m[0].toUpperCase():'V?';
  el.textContent='BUILD '+ver+' · '+lm.toLocaleDateString()+' '+lm.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

function toggleSetting(key){
  var newVal=!getSetting(key);
  // Bg visuals are mutually exclusive
  if(newVal&&key==='bgVisuals'){setSetting('bgVisualSinSin',false);if(window.applyBgSinSin)window.applyBgSinSin(false);}
  if(newVal&&key==='bgVisualSinSin'){setSetting('bgVisuals',false);if(window.applyBgVisuals)window.applyBgVisuals(false);}
  // View modes are mutually exclusive — turning one on turns others off
  if(newVal&&VIEW_MODES.indexOf(key)!==-1){
    VIEW_MODES.forEach(function(k){if(k!==key)setSetting(k,false);});
  }
  setSetting(key,newVal);
  applySettings();
  updateSettingsUI();
}

function toggleSection(key){
  sSections[key]=!sSections[key];
  var b=document.getElementById('sbody-'+key);
  var a=document.getElementById('sarr-'+key);
  if(b)b.classList.toggle('collapsed',!sSections[key]);
  if(a)a.style.transform=sSections[key]?'':'rotate(-90deg)';
  if(key==='data'&&sSections[key])renderBackupList();
  if(key==='view'&&sSections[key])renderViewPills();
}

var VIEW_MODE_DEFS=[
  {key:'normal',    label:'Normal',    desc:'Full cards, default layout'},
  {key:'compact',   label:'Compact',   desc:'Smaller cards, tighter spacing'},
  {key:'slimScreen',label:'Slim Screen', desc:'3-col, large text, wide monitor'},
  {key:'iconMode',  label:'Icon',      desc:'Icon dock, tap to open card'},
  {key:'minimalMode',label:'Minimal',  desc:'Plain text, no borders, markdown style'},
  {key:'singleCol',  label:'1 Column',  desc:'One column always, no side by side'},
  {key:'bigCat',     label:'Categories', desc:'4 category buttons, expand to see cards'},
];

function getActiveView(){
  if(getSetting('minimalMode'))return 'minimalMode';
  if(getSetting('iconMode'))return 'iconMode';
  if(getSetting('slimScreen'))return 'slimScreen';
  if(getSetting('singleCol'))return 'singleCol';
  if(getSetting('bigCat'))return 'bigCat';
  if(getSetting('compact'))return 'compact';
  return 'normal';
}

function setViewMode(key){
  VIEW_MODES.forEach(function(k){setSetting(k,false);});
  if(key!=='normal')setSetting(key,true);
  applySettings();
  updateSettingsUI();
}

function renderViewPills(){
  var el=document.getElementById('view-mode-pills');
  if(!el)return;
  var active=getActiveView();
  var h='';
  VIEW_MODE_DEFS.forEach(function(vm){
    var isOn=(vm.key===active);
    h+='<div onclick="event.stopPropagation();setViewMode(\'' +vm.key+ '\')" style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border:1px solid '+(isOn?'var(--cg)':'var(--c-border)')+';background:'+(isOn?'rgba(0,255,136,.07)':'transparent')+';cursor:pointer;transition:all .12s;border-radius:3px">'
      +'<div><div style="font-size:var(--t-md);color:'+(isOn?'var(--cg)':'var(--text)')+'">'+vm.label+'</div><div style="font-size:var(--t-sm);color:var(--dim);margin-top:2px">'+vm.desc+'</div></div>'
      +'<div style="width:16px;height:16px;border-radius:50%;border:2px solid '+(isOn?'var(--cg)':'rgba(255,255,255,.2)')+';background:'+(isOn?'var(--cg)':'transparent')+';flex-shrink:0"></div>'
      +'</div>';
  });
  el.innerHTML=h;
}

function updateSettingsUI(){
  // Appearance toggles
  ['crt','vignette','magnetMode','bigBorders','scrollGlow','sbAutoSync','noGoogleFonts','largeText','extraLargeText','bgVisuals','bgVisualSinSin','letterNav','textGlow','categoryNav','sectionHeaders','pinnedCards','snapToCard','starfield','scrollTrail','cardEntrance','vibrateOff'].forEach(function(k){
    var t=document.getElementById('tog-'+k);
    if(t)t.classList.toggle('on',getSetting(k));
  });
  // View mode radio pills
  renderViewPills();
  if(window.updateSbNextSyncLabel)updateSbNextSyncLabel();
}

function applyCyber2BigBorderFix(){
  var ids=['clock','prayer','weather','stocks','todo','meals','calendar','notes','schedule','books','birthdays','season-traditions','pickleball','prayer-tracker','s-tracker','quran-tracker','juz-amma','goals','pomodoro','raft','settings','bookmarks','islamic-topics','ebook-library','meal-prep','writers-den','weekend-warrior'];
  var colorMap={
    clock:'rgba(57,255,20,.42)',
    prayer:'rgba(255,159,0,.42)',
    weather:'rgba(0,245,255,.42)',
    stocks:'rgba(204,255,0,.40)',
    todo:'rgba(255,45,120,.42)',
    meals:'rgba(255,107,0,.42)',
    calendar:'rgba(191,95,255,.42)',
    notes:'rgba(0,245,255,.36)',
    schedule:'rgba(57,255,20,.36)',
    books:'rgba(191,95,255,.42)',
    birthdays:'rgba(255,105,180,.42)',
    'season-traditions':'rgba(255,176,120,.42)',
    pickleball:'rgba(57,255,20,.42)',
    'prayer-tracker':'rgba(255,159,0,.42)',
    's-tracker':'rgba(255,45,120,.42)',
    'quran-tracker':'rgba(0,245,200,.44)',
    'juz-amma':'rgba(255,215,0,.44)',
    goals:'rgba(255,230,80,.42)',
    pomodoro:'rgba(255,32,32,.42)',
    raft:'rgba(0,120,200,.42)',
    settings:'rgba(255,255,255,.22)',
    bookmarks:'rgba(170,255,0,.40)',
    'islamic-topics':'rgba(0,245,200,.36)',
    'ebook-library':'rgba(0,245,255,.42)',
    'meal-prep':'rgba(255,140,0,.38)',
    'writers-den':'rgba(220,90,255,.42)',
    'weekend-warrior':'rgba(255,170,0,.40)'
  };
  var active=(currentTheme==='cyber2'&&getSetting('bigBorders'));
  ids.forEach(function(id){
    var el=document.querySelector('[data-id="'+id+'"]');
    if(!el)return;
    if(active){
      el.style.borderColor=colorMap[id]||'';
      el.setAttribute('data-bbfix','1');
    } else if(el.getAttribute('data-bbfix')==='1'){
      el.style.borderColor='';
      el.removeAttribute('data-bbfix');
    }
  });
}

function applyMinimalMode(){
  // Inject minimal-mode stylesheet
  var sid='minimal-mode-style';
  if(document.getElementById(sid))return;
  var s=document.createElement('style');
  s.id=sid;
  s.textContent=[
    // Reset tile appearance
    'body.minimal-mode #grid{display:block;padding:16px;max-width:680px;margin:0 auto}',
    'body.minimal-mode .tile{background:transparent!important;border:none!important;box-shadow:none!important;',
    'border-radius:0!important;padding:0!important;margin:0!important;display:block!important;',
    'width:100%!important;position:static!important;transform:none!important}',
    // HR separator between tiles
    
    // Hide decorative elements
    'body.minimal-mode .drag-handle,body.minimal-mode .icon-label-wrap,body.minimal-mode .th-icon{display:none!important}',
    // Card header — plain label
    'body.minimal-mode .th{border:none!important;background:none!important;padding:0 0 6px!important;',
    'margin-bottom:8px!important}',
    'body.minimal-mode .th-label{font-size:var(--t-base)!important;letter-spacing:2px!important;color:var(--c-dim)!important;',
    'text-transform:uppercase!important;font-weight:normal!important}',
    'body.minimal-mode .th-badge{font-size:var(--t-xs)!important;border:none!important;',
    'color:rgba(255,255,255,.25)!important;padding-left:8px!important}',
    // Body text
    'body.minimal-mode .tile *{font-family:monospace!important}',
    // Hide progress bars and decorative
    'body.minimal-mode .book-bar-wrap,body.minimal-mode .book-bar-fill{display:none!important}',
    'body.minimal-mode .soul-card::before{display:none!important}',
    // Inputs and buttons stay functional but minimal
    'body.minimal-mode button{background:transparent!important;border:1px solid var(--c-faint)!important;',
    'color:rgba(255,255,255,.5)!important;padding:3px 8px!important;font-size:var(--t-sm)!important}',
    // Hide the topbar and quick nav tile borders
    'body.minimal-mode #topbar{opacity:.4}',
    // Faint 1px border on each card, 2em gap between cards
    'body.minimal-mode .tile{background:var(--bg)!important;border:1px solid rgba(255,255,255,.13)!important;margin-bottom:3em!important;padding:10px!important}',
    // Hide settings and raft and other non-content tiles
    'body.minimal-mode .tile[data-id="settings"],body.minimal-mode .tile[data-id="raft"],',

  ].join('');
  document.head.appendChild(s);
  // Set --tile-color on each tile from its border-color for the separator
  setTimeout(function(){
    var grid=document.getElementById('grid');
    // Set tile colors for separators
    document.querySelectorAll('#grid .tile').forEach(function(el){
      var bc=el.style.borderColor||window.getComputedStyle(el).borderColor;
      if(bc&&bc!=='rgba(0, 0, 0, 0)'&&bc!=='transparent'){
        el.style.setProperty('--tile-color',bc);
      }
    });
  },50);
}

function removeMinimalMode(){
  var s=document.getElementById('minimal-mode-style');
  if(s)s.remove();

}



var BIGCAT_OPEN = []; // up to 2 open at once

var BIGCAT_DEFS = [
  {
    id:'islam', icon:'🕌', label:'ISLAM',
    color:'rgba(255,204,0,.6)',
    cards:['dua-card','juz-amma','quran-cards','quran-words','ayah-recall','ayah-completion','surah-map','islamic-topics','for-akhira','prayer-tracker']
  },
  {
    id:'learning', icon:'📖', label:'LEARNING',
    color:'rgba(80,250,123,.6)',
    cards:['voice-study','articulate','books','writers-den','writing-log','quran-words','quran-cards']
  },
  {
    id:'wellness', icon:'🌿', label:'WELLNESS',
    color:'rgba(126,184,255,.6)',
    cards:['mood-log','gratitude-log','stress-demess','reframe','shadow-log','legacy-letter','energy-map','life-streaks','fear-log','people-log']
  },
  {
    id:'life', icon:'⚙', label:'LIFE',
    color:'rgba(255,184,108,.6)',
    cards:['todo','quick-notes','calendar','meals','goals','days-until','pomodoro','bookmarks','countdown','birthdays','raft','day-blocks','milestone','button-log','settings']
  }
];

function bigCatToggle(id){
  var idx=BIGCAT_OPEN.indexOf(id);
  if(idx>=0){
    BIGCAT_OPEN.splice(idx,1);
  } else {
    if(BIGCAT_OPEN.length>=2)BIGCAT_OPEN.shift(); // remove oldest if 2 open
    BIGCAT_OPEN.push(id);
  }
  bigCatRender();
}

function bigCatClear(){
  var grid=document.getElementById('grid');
  if(grid){document.querySelectorAll('[data-tile-owner]').forEach(function(t){t.removeAttribute('data-tile-owner');grid.appendChild(t);});}
  var p=document.getElementById('bigcat-panel');
  if(p)p.innerHTML='';
  BIGCAT_OPEN=[];
}


function bigCatRender(){
  var panel=document.getElementById('bigcat-panel');
  if(!panel){return;}
  var grid=document.getElementById('grid');

  // Restore tiles first
  if(grid){
    document.querySelectorAll('[data-tile-owner]').forEach(function(tile){
      tile.removeAttribute('data-tile-owner');
      grid.appendChild(tile);
    });
  }

  var h='';
  h+='<button id="bigcat-exit-btn" style="display:block;width:100%;padding:10px;margin-bottom:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.2);color:var(--text);font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:2px">\u2715 EXIT CATEGORIES MODE</button>';

  BIGCAT_DEFS.forEach(function(cat){
    var open=BIGCAT_OPEN.indexOf(cat.id)>=0;
    var borderCol=open?cat.color:'rgba(255,255,255,.12)';
    var labelCol=open?cat.color:'var(--text)';
    var bg=open?'rgba(255,255,255,.05)':'rgba(255,255,255,.03)';
    h+='<div>';
    h+='<div class="bigcat-btn'+(open?' open':'')+'" data-bcid="'+cat.id+'" style="border-color:'+borderCol+';background:'+bg+'">';
    h+='<span class="bigcat-icon">'+cat.icon+'</span>';
    h+='<span class="bigcat-label" style="color:'+labelCol+'">'+cat.label+'</span>';
    h+='<span class="bigcat-count">'+cat.cards.length+' cards</span>';
    h+='<span class="bigcat-arrow">\u25b6</span>';
    h+='</div>';
    h+='<div class="bigcat-cards-wrap'+(open?' open':'')+'" id="bigcat-cards-'+cat.id+'"></div>';
    h+='</div>';
  });
  panel.innerHTML=h;

  var exitBtn=document.getElementById('bigcat-exit-btn');
  if(exitBtn)exitBtn.onclick=function(){setViewMode('normal');};

  panel.querySelectorAll('[data-bcid]').forEach(function(btn){
    btn.onclick=function(){
      var id=this.getAttribute('data-bcid');
      var idx=BIGCAT_OPEN.indexOf(id);
      if(idx>=0){BIGCAT_OPEN.splice(idx,1);}
      else{if(BIGCAT_OPEN.length>=2)BIGCAT_OPEN.shift();BIGCAT_OPEN.push(id);}
      bigCatRender();
    };
  });

  BIGCAT_DEFS.forEach(function(cat){
    if(BIGCAT_OPEN.indexOf(cat.id)<0)return;
    var slot=document.getElementById('bigcat-cards-'+cat.id);
    if(!slot||!grid)return;
    cat.cards.forEach(function(cid){
      var tile=grid.querySelector('[data-id="'+cid+'"]');
      if(tile){tile.setAttribute('data-tile-owner',cat.id);slot.appendChild(tile);}
    });
  });
}

function applySettings(){
  // Reset deleted themes
  if(['paynes','vangogh'].indexOf(getSetting('theme'))>=0){setSetting('theme','default');}
  var b=document.body;
  b.classList.toggle('compact-mode',getSetting('compact'));
  b.classList.toggle('slim-screen-mode',getSetting('slimScreen'));
  b.classList.toggle('single-col-mode',getSetting('singleCol'));
  b.classList.toggle('bigcat-mode',getSetting('bigCat'));
  if(getSetting('bigCat'))setTimeout(bigCatRender,50); else bigCatClear();
  b.classList.toggle('icon-mode',getSetting('iconMode'));
  b.classList.toggle('minimal-mode',getSetting('minimalMode'));
  if(getSetting('minimalMode'))applyMinimalMode();
  else removeMinimalMode();
  applyCategoryNav();
  applySectionHeaders();
  applyPinnedCards();
  updatePinSettingsVisibility();
  applySnapToCard();
  // CRT
  var cs=document.getElementById('crt-style');
  if(!cs){cs=document.createElement('style');cs.id='crt-style';document.head.appendChild(cs);}
  if(getSetting('crt')){
    cs.textContent='';
    // Add phosphor flicker animation
    if(!document.getElementById('crt-flicker-style')){
      var fs=document.createElement('style');
      fs.id='crt-flicker-style';
      fs.textContent='@keyframes crt-flicker{0%,95%,100%{opacity:1}96%{opacity:.96}98%{opacity:.98}}'
        +'body::after{animation:crt-flicker 8s infinite;}'
        +'body{text-shadow:0 0 2px rgba(0,255,136,.08);}';
      document.head.appendChild(fs);
    }
  } else {
    cs.textContent='body::before{display:none}';
    var fs=document.getElementById('crt-flicker-style');
    if(fs)fs.remove();
  }
  // Vignette
  var vs=document.getElementById('vig-style');
  if(!vs){vs=document.createElement('style');vs.id='vig-style';document.head.appendChild(vs);}
  vs.textContent=getSetting('vignette')?'':'body::after{display:none}';

  // Big Borders
  var bb=document.getElementById('bigb-style');
  if(!bb){bb=document.createElement('style');bb.id='bigb-style';document.head.appendChild(bb);}
  bb.textContent=getSetting('bigBorders')?'.tile{border-width:5px!important}':'';
  applyCyber2BigBorderFix();
  // Scroll glow
  if(window.setScrollGlow)window.setScrollGlow(getSetting('scrollGlow'));
  applyHiddenTiles();
  // Large text
  document.body.classList.toggle('large-text',getSetting('largeText')&&!getSetting('extraLargeText'));
  document.body.classList.toggle('extra-large-text',getSetting('extraLargeText'));
  // Background visuals
  if(window.applyBgVisuals)window.applyBgVisuals(getSetting('bgVisuals'));
  if(window.applyBgSinSin)window.applyBgSinSin(getSetting('bgVisualSinSin'));
  if(getSetting('magnetMode')&&window.enforceMagnetAll)window.enforceMagnetAll();
  // Text glow/outline
  var tgStyle=document.getElementById('textglow-style');
  if(!tgStyle){tgStyle=document.createElement('style');tgStyle.id='textglow-style';document.head.appendChild(tgStyle);}
  tgStyle.textContent=getSetting('textGlow')?'body{--text-stroke:0 0 1px rgba(0,0,0,.9),-1px 0 1px rgba(0,0,0,.6),1px 0 1px rgba(0,0,0,.6)}body *{text-shadow:var(--text-stroke,none)}':'';
  if(window.applyLetterNav)window.applyLetterNav(getSetting('letterNav'));
  // No Google Fonts
  var gfLink=document.getElementById('gfonts-link');
  if(gfLink)gfLink.disabled=getSetting('noGoogleFonts');
  // New effects
  if(window.applyStarfield)window.applyStarfield(getSetting('starfield'));
  if(window.applyScrollTrail)window.applyScrollTrail(getSetting('scrollTrail'));
  if(window.applyCardEntrance)window.applyCardEntrance(getSetting('cardEntrance'));
}

function initSettings(){
  applyCategoryNav();
  applySectionHeaders();
  applyPinnedCards();
  updatePinSettingsVisibility();
  applySnapToCard();
  refreshBuildLabel();
  renderHideTileSettings();
  applyHiddenTiles();
  applyTheme(currentTheme);
  renderViewPills();
  // Sections start collapsed via HTML class; sSections already init to false - don't reset
  applySettings();
  updateSettingsUI();
}

// Accordion removed


//  AUTO BACKUP SYSTEM 
// Storage keys: 'bk_recent' = array of up to 3 recent snapshots
//               'bk_daily'  = object {YYYY-MM-DD: snapshot} for up to 7 days


//  QURAN TRACKER 
var qtData=lsGet('qt_data',{});
var qtTab='today'; var qtLogPeriod='week'; var qtGraphPeriod='week';
function qtSave(){lsSet('qt_data',qtData);}
function qtGetToday(){return qtData[localDateStr()]||0;}
function qtSetToday(n){qtData[localDateStr()]=Math.max(0,Math.min(604,Math.round(n)));qtSave();qtRenderToday();}
function qtAdjust(d){qtSetToday(qtGetToday()+d);}
function qtSetManual(){var inp=document.getElementById('qt-manual-inp');if(!inp)return;var v=parseInt(inp.value);if(!isNaN(v)){qtSetToday(v);inp.value='';}}
function qtCalcRange(){
  var s=parseInt(document.getElementById('qt-pg-start').value)||0;
  var e=parseInt(document.getElementById('qt-pg-end').value)||0;
  var preview=document.getElementById('qt-range-preview');
  var btn=document.getElementById('qt-range-btn');
  if(s>0&&e>0&&e>=s){
    var pages=e-s+1;
    if(preview)preview.textContent=pages+' pages (p.'+s+' → p.'+e+')';
    if(btn){btn.style.opacity='1';btn.style.pointerEvents='auto';}
  } else if(s>0&&e>0&&e<s){
    if(preview)preview.textContent='End page must be ≥ start page';
    if(preview)preview.style.color='var(--cr)';
    if(btn){btn.style.opacity='.4';btn.style.pointerEvents='none';}
  } else {
    if(preview)preview.textContent='';
    if(btn){btn.style.opacity='.4';btn.style.pointerEvents='none';}
  }
  if(preview&&e>=s)preview.style.color='var(--cc)';
}

function qtSetRange(){
  var s=parseInt(document.getElementById('qt-pg-start').value)||0;
  var e=parseInt(document.getElementById('qt-pg-end').value)||0;
  if(!s||!e||e<s)return;
  var pages=e-s+1;
  var today=localDateStr();
  if(!qtData[today])qtData[today]=0;
  qtData[today]+=pages;
  lsSet('qt_data',qtData);
  // Clear inputs
  document.getElementById('qt-pg-start').value='';
  document.getElementById('qt-pg-end').value='';
  var preview=document.getElementById('qt-range-preview');
  if(preview)preview.textContent='+'+pages+' pages added!';
  var btn=document.getElementById('qt-range-btn');
  if(btn){btn.style.opacity='.4';btn.style.pointerEvents='none';}
  qtRenderToday();
  if(typeof confetti==='function')confetti(window.innerWidth/2,200,'#00f5c8');
}
function qtSwitch(tab){
  qtTab=tab;
  ['today','log','graph'].forEach(function(t){
    var b=document.getElementById('qt-tab-'+t),p=document.getElementById('qt-'+t+'-panel');
    if(b)b.classList.toggle('active',t===tab);
    if(p)p.style.display=t===tab?'':'none';
  });
  if(tab==='today')qtRenderToday();else if(tab==='log')qtRenderLog();else qtRenderGraph();
}
function qtStreak(){
  var s=0,d=new Date();
  while(s<365){var k=localDateStr(d);if(!qtData[k]||qtData[k]===0)break;s++;d.setDate(d.getDate()-1);}
  return s;
}
function qtRenderToday(){
  var n=document.getElementById('qt-big-num'),se=document.getElementById('qt-streak');
  if(n)n.textContent=qtGetToday();
  var s=qtStreak();
  if(se)se.textContent=s>=2?s+' day streak':qtGetToday()>0?'Keep it up!':'Log your pages for today';
  qtCheckNotice();
}

function qtCheckNotice(){
  var el=document.getElementById('qt-notice');
  if(!el)return;
  // Check if dismissed this session
  if(sessionStorage.getItem('qt-notice-dismissed'))return;
  // Find last day with pages > 0
  var keys=Object.keys(qtData).filter(function(k){return qtData[k]>0;}).sort().reverse();
  if(!keys.length){
    var msg='No Quran pages logged yet.';
    el.innerHTML='<div class="inactivity-notice'+(daysSince>5?' jiggle':'')+'"><span>&#9650; '+msg+'</span><button onclick="qtDismissNotice()" title="Dismiss">&#10005;</button></div>';
    el.style.display='';
    return;
  }
  var lastKey=keys[0];
  var today=new Date();
  var last=new Date(lastKey+'T00:00:00');
  var daysSince=Math.round((today-last)/(864e5));
  if(daysSince>=2){
    var msg='No pages read in '+daysSince+' day'+(daysSince!==1?'s':'')+'. Last: '+lastKey;
    el.innerHTML='<div class="inactivity-notice'+(daysSince>5?' jiggle':'')+'"><span>&#9650; '+msg+'</span><button onclick="qtDismissNotice()" title="Dismiss">&#10005;</button></div>';
    el.style.display='';
  } else {
    el.style.display='none';
  }
}

function qtDismissNotice(){
  sessionStorage.setItem('qt-notice-dismissed','1');
  var el=document.getElementById('qt-notice');
  if(el)el.style.display='none';
}
function qtFilterKeys(p){
  var today=new Date(),todayStr=localDateStr();
  var keys=Object.keys(qtData).filter(function(k){return qtData[k]>0;}).sort().reverse();
  if(p==='all')return keys;
  if(p==='week'){var c2=new Date(today);c2.setDate(today.getDate()-7);return keys.filter(function(k){return k>=localDateStr(c2);});}
  if(p==='month')return keys.filter(function(k){return k.slice(0,7)===todayStr.slice(0,7);});
  if(p==='year')return keys.filter(function(k){return k.slice(0,4)===todayStr.slice(0,4);});
  return keys;
}
function qtSetPeriod(p){
  qtLogPeriod=p;
  ['week','month','year','all'].forEach(function(x){var b=document.getElementById('qt-period-'+x);if(b)b.classList.toggle('active',x===p);});
  qtRenderLog();
}
function qtRenderLog(){
  var el=document.getElementById('qt-log-list'),su=document.getElementById('qt-log-sum');
  if(!el)return;
  var keys=qtFilterKeys(qtLogPeriod);
  if(!keys.length){el.innerHTML='<div style="color:var(--dim);font-size:var(--t-base);padding:6px 0">No entries yet.</div>';if(su)su.textContent='';return;}
  var total=0,h='';
  keys.forEach(function(k){
    var pg=qtData[k];total+=pg;
    var d=new Date(k+'T12:00:00');
    h+='<div class="qt-log-row"><span class="qt-log-date">'+DAYS[d.getDay()].slice(0,3)+' '+d.getDate()+' '+MO3[d.getMonth()]+'</span><span class="qt-log-pages">'+pg+'</span></div>';
  });
  el.innerHTML=h;
  if(su)su.textContent=keys.length+' days · '+total+' pages · avg '+Math.round(total/keys.length)+'/day';
}
function qtSetGraphPeriod(p){
  qtGraphPeriod=p;
  ['week','month','year'].forEach(function(x){var b=document.getElementById('qt-gperiod-'+x);if(b)b.classList.toggle('active',x===p);});
  qtRenderGraph();
}
function qtRenderGraph(){
  var el=document.getElementById('qt-graph-list'),tot=document.getElementById('qt-graph-totals');
  if(!el)return;
  var today=new Date(),h='';
  if(qtGraphPeriod==='week'){
    var bars=[];
    for(var i=6;i>=0;i--){var d=new Date(today);d.setDate(today.getDate()-i);bars.push({lbl:DAYS[d.getDay()].slice(0,3),pg:qtData[localDateStr(d)]||0});}
    var mx=Math.max.apply(null,bars.map(function(b){return b.pg;}))||1;
    bars.forEach(function(b){
      h+='<div class="qt-graph-row"><span class="qt-graph-lbl">'+b.lbl+'</span><div class="qt-bar-wrap"><div class="qt-bar" style="width:'+Math.round(b.pg/mx*100)+'%"></div></div><span class="qt-graph-val">'+(b.pg||'')+'</span></div>';
    });
    if(tot)tot.textContent='Week: '+bars.reduce(function(a,b){return a+b.pg;},0)+' pages';
  } else if(qtGraphPeriod==='month'){
    var months={};
    Object.keys(qtData).forEach(function(k){var ym=k.slice(0,7);months[ym]=(months[ym]||0)+(qtData[k]||0);});
    var sm=Object.keys(months).sort().reverse().slice(0,12).reverse();
    var mx2=Math.max.apply(null,sm.map(function(m){return months[m];}))||1;
    sm.forEach(function(m){
      var d=new Date(m+'-01T12:00:00');
      h+='<div class="qt-graph-row"><span class="qt-graph-lbl">'+MO3[d.getMonth()]+'</span><div class="qt-bar-wrap"><div class="qt-bar" style="width:'+Math.round(months[m]/mx2*100)+'%"></div></div><span class="qt-graph-val">'+months[m]+'</span></div>';
    });
    if(tot)tot.textContent=sm.length+' months · '+sm.reduce(function(a,m){return a+months[m];},0)+' pages';
  } else {
    var years={};
    Object.keys(qtData).forEach(function(k){var yr=k.slice(0,4);years[yr]=(years[yr]||0)+(qtData[k]||0);});
    var sy=Object.keys(years).sort().reverse();
    var mx3=Math.max.apply(null,sy.map(function(y){return years[y];}))||1;
    sy.forEach(function(yr){
      h+='<div class="qt-graph-row"><span class="qt-graph-lbl">'+yr+'</span><div class="qt-bar-wrap"><div class="qt-bar" style="width:'+Math.round(years[yr]/mx3*100)+'%"></div></div><span class="qt-graph-val">'+years[yr]+'</span></div>';
    });
    if(tot)tot.textContent=sy.length+' years · '+sy.reduce(function(a,y){return a+years[y];},0)+' pages';
  }
  el.innerHTML=h||'<div style="color:var(--dim);font-size:var(--t-base)">No data.</div>';
}
function qtExport(){
  var keys=Object.keys(qtData).filter(function(k){return qtData[k]>0;}).sort().reverse();
  if(!keys.length){clipCopy('No Quran reading logged yet.','Quran');return;}
  var total=keys.reduce(function(a,k){return a+qtData[k];},0);
  var lines=['# Quran Reading Log','Total: '+total+' pages over '+keys.length+' days',''];
  keys.forEach(function(k){var d=new Date(k+'T12:00:00');lines.push(DAYS[d.getDay()].slice(0,3)+' '+d.getDate()+' '+MO3[d.getMonth()]+' '+d.getFullYear()+': '+qtData[k]+' pages');});
  clipCopy(lines.join('\n'),'Quran log');
}
qtRenderToday();
setTimeout(qtCheckNotice,200);

//  JUZ AMMA 
var JM_SURAHS=[{"num": 114, "name": "An-Nas", "verses": 6}, {"num": 113, "name": "Al-Falaq", "verses": 5}, {"num": 112, "name": "Al-Ikhlas", "verses": 4}, {"num": 111, "name": "Al-Masad", "verses": 5}, {"num": 110, "name": "An-Nasr", "verses": 3}, {"num": 109, "name": "Al-Kafirun", "verses": 6}, {"num": 108, "name": "Al-Kawthar", "verses": 3}, {"num": 107, "name": "Al-Maun", "verses": 7}, {"num": 106, "name": "Quraysh", "verses": 4}, {"num": 105, "name": "Al-Fil", "verses": 5}, {"num": 104, "name": "Al-Humazah", "verses": 9}, {"num": 103, "name": "Al-Asr", "verses": 3}, {"num": 102, "name": "At-Takathur", "verses": 8}, {"num": 101, "name": "Al-Qariah", "verses": 11}, {"num": 100, "name": "Al-Adiyat", "verses": 11}, {"num": 99, "name": "Az-Zalzalah", "verses": 8}, {"num": 98, "name": "Al-Bayyinah", "verses": 8}, {"num": 97, "name": "Al-Qadr", "verses": 5}, {"num": 96, "name": "Al-Alaq", "verses": 19}, {"num": 95, "name": "At-Tin", "verses": 8}, {"num": 94, "name": "Ash-Sharh", "verses": 8}, {"num": 93, "name": "Ad-Duha", "verses": 11}, {"num": 92, "name": "Al-Layl", "verses": 21}, {"num": 91, "name": "Ash-Shams", "verses": 15}, {"num": 90, "name": "Al-Balad", "verses": 20}, {"num": 89, "name": "Al-Fajr", "verses": 30}, {"num": 88, "name": "Al-Ghashiyah", "verses": 26}, {"num": 87, "name": "Al-Ala", "verses": 19}, {"num": 86, "name": "At-Tariq", "verses": 17}, {"num": 85, "name": "Al-Buruj", "verses": 22}, {"num": 84, "name": "Al-Inshiqaq", "verses": 25}, {"num": 83, "name": "Al-Mutaffifin", "verses": 36}, {"num": 82, "name": "Al-Infitar", "verses": 19}, {"num": 81, "name": "At-Takwir", "verses": 29}, {"num": 80, "name": "Abasa", "verses": 42}, {"num": 79, "name": "An-Naziat", "verses": 46}, {"num": 78, "name": "An-Naba", "verses": 40}];



//  GOALS 
var goalsData=JSON.parse(localStorage.getItem('dash_goals')||'{"monthly":[],"yearly":[],"done":[]}');
var goalPeriod='monthly';
var goalEditId=null;
var goalDelPending={};

function goalsSave(){
  lsSet('dash_goals',goalsData);
}

function goalSwitch(period){
  goalPeriod=period;
  ['active','done'].forEach(function(p){
    var btn=document.getElementById('gtab-'+p);
    var panel=document.getElementById('goal-'+p+'-panel');
    if(btn)btn.classList.toggle('active',p===period);
    if(panel)panel.style.display=p===period?'':'none';
  });
  renderGoals(period);
}

function goalIsStale(g){
  // Stale if: has target, not completed, and no check-in in last 14 days (monthly) or 60 days (yearly)
  var staleDays=goalPeriod==='yearly'?60:14;
  var checkins=g.checkins||[];
  if(!checkins.length) return true; // never checked in
  var last=new Date(checkins[checkins.length-1]+'T00:00:00');
  var daysSince=Math.round((new Date()-last)/(864e5));
  return daysSince>staleDays;
}

function goalsCheckNotice(){
  var el=document.getElementById('goals-notice');
  if(!el)return;
  if(sessionStorage.getItem('goals-notice-dismissed')==='1'){el.innerHTML='';return;}
  var goalsData=JSON.parse(localStorage.getItem('dash_goals')||'{"monthly":[],"yearly":[]}');
  var allGoals=(goalsData.monthly||[]).concat(goalsData.yearly||[]);
  if(!allGoals.length){el.innerHTML='';return;}
  // Find most recent checkin across all goals
  var mostRecent=null;
  allGoals.forEach(function(g){
    (g.checkins||[]).forEach(function(c){
      if(!mostRecent||c>mostRecent)mostRecent=c;
    });
  });
  if(!mostRecent){el.innerHTML='';return;}
  var daysSince=Math.round((new Date()-new Date(mostRecent+'T00:00:00'))/(864e5));
  if(daysSince>=3){
    el.innerHTML='<div class="inactivity-notice'+(daysSince>=5?' jiggle':'')+'" class="mb-6"><span>&#9650; No goal check-in in '+daysSince+' day'+(daysSince!==1?'s':'')+'. Last: '+mostRecent+'</span><button data-dismiss="goals-notice" style="background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:var(--t-lg);padding:0 2px">&#10005;</button></div>';
  } else {
    el.innerHTML='';
  }
}
function renderGoals(period){
  goalsCheckNotice();
  if(period==='done'){renderDoneGoals();return;}
  var el=document.getElementById('goal-active-panel');
  if(!el)return;
  var now=new Date();
  var todayStr=localDateStr();
  var monthly=goalsData.monthly||[];
  var yearly=goalsData.yearly||[];
  var allActive=monthly.map(function(g){return Object.assign({},g,{_period:'monthly'});})
    .concat(yearly.map(function(g){return Object.assign({},g,{_period:'yearly'});}));
  var h='';

  var _goalQuotes=[
    'Small steps every day build mountains.',
    'The goal is not perfect, the goal is progress.',
    'You become what you consistently do.',
    'Discipline is choosing what you want most over what you want now.',
    'Start where you are. Use what you have. Do what you can.',
    'Every check-in is a vote for who you are becoming.',
    'Your future self is watching. Make them proud.',
    'The work is the reward.',
    'One more day of showing up. That\'s all it takes.',
    'Momentum is a skill. Build it today.',
    'Done is better than perfect. Progress beats nothing.',
    'You don\'t rise to your goals — you fall to your systems.',
    'The journey begins with a single step.',
    'What you do today is who you become tomorrow.',
    'Consistency beats intensity every time.',
    'You already have everything you need to begin.',
    'Trust the process. The results follow.',
    'Hard days are proof you\'re not giving up.',
    'The only bad day is one where you stopped caring.',
    'Show up, do the work, repeat.',
  ];
  var _goalQuote=_goalQuotes[Math.floor((new Date().getDate()+allActive.length*7))%_goalQuotes.length];

  if(!allActive.length){
    h='<div style="font-size:var(--t-sm);color:var(--dim);font-style:italic;opacity:.6;padding:4px 0 12px;line-height:1.5">'+_goalQuote+'</div>';
    h+='<div style="font-size:var(--t-base);color:var(--dim);padding:10px 0;text-align:center;line-height:2">Nothing to pursue yet.<br>Add your first goal below.</div>';
  }

  var _goalAccents=[
    {c:'#ffcc00',bg:'rgba(255,204,0,.06)',ring:'rgba(255,204,0,.22)'},   // gold
    {c:'#00e5ff',bg:'rgba(0,229,255,.05)',ring:'rgba(0,229,255,.2)'},    // cyan
    {c:'#bf5fff',bg:'rgba(191,95,255,.06)',ring:'rgba(191,95,255,.2)'},  // purple
    {c:'#00ff88',bg:'rgba(0,255,136,.05)',ring:'rgba(0,255,136,.2)'},    // green
    {c:'#ff8c42',bg:'rgba(255,140,66,.06)',ring:'rgba(255,140,66,.2)'},  // orange
    {c:'#58e8c8',bg:'rgba(88,232,200,.05)',ring:'rgba(88,232,200,.2)'},  // teal
    {c:'#f5a623',bg:'rgba(245,166,35,.05)',ring:'rgba(245,166,35,.2)'},  // amber
    {c:'#7eb8ff',bg:'rgba(126,184,255,.05)',ring:'rgba(126,184,255,.2)'},// sky blue
    {c:'#e0ff60',bg:'rgba(224,255,96,.04)',ring:'rgba(224,255,96,.18)'}, // lime
    {c:'#ff9de2',bg:'rgba(255,157,226,.04)',ring:'rgba(255,157,226,.18)'},// pink
  ];

  if(allActive.length){
    h='<div style="font-size:var(--t-sm);color:var(--dim);font-style:italic;opacity:.55;padding:4px 0 12px;line-height:1.5;border-bottom:1px solid rgba(255,255,255,.05);margin-bottom:2px">'+_goalQuote+'</div>'+h;
  }

  allActive.forEach(function(g,gi){
    var period=g._period;
    var checkins=g.checkins||[];
    var notes=g.notes||[];
    var subgoals=g.subgoals||[];
    var lastCheckinDays=999;
    if(checkins.length){
      var lastD=new Date(checkins[checkins.length-1]+'T00:00:00');
      lastCheckinDays=Math.round((now-lastD)/(864e5));
    }
    var checkedToday=checkins.length&&checkins[checkins.length-1]===todayStr;
    var isStale=lastCheckinDays>14;
    var accent=isStale?{c:'rgba(255,255,255,.4)',bg:'rgba(255,255,255,.02)',ring:'rgba(255,255,255,.08)'}:_goalAccents[gi%_goalAccents.length];
    var pct=g.total?Math.round((checkins.length/g.total)*100):null;
    var daysLeft=0,timeInfo='';
    if(period==='monthly'){
      var endOfMonth=new Date(now.getFullYear(),now.getMonth()+1,0);
      daysLeft=Math.round((endOfMonth-now)/(864e5))+1;
      timeInfo=daysLeft+'d left';
    } else {
      var endOfYear=new Date(now.getFullYear(),11,31);
      daysLeft=Math.round((endOfYear-now)/(864e5))+1;
      timeInfo=daysLeft+'d left';
    }
    var remaining=g.total?Math.max(0,g.total-checkins.length):null;
    var onTrack=remaining===null||(daysLeft>0&&remaining/daysLeft<=1)||remaining===0;
    var isExpanded=window['goal_open_'+g.id];

    // Progress arc SVG
    var arcSvg='';
    if(g.total){
      var R=22,CX=28,CY=28,circ=2*Math.PI*R;
      var fillPct=Math.min(checkins.length/g.total,1);
      var dash=fillPct*circ,gap=circ-dash;
      arcSvg='<svg width="56" height="56" style="flex-shrink:0"><circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="none" stroke="var(--c-ghost)" stroke-width="4"/><circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="none" stroke="'+accent.c+'" stroke-width="4" stroke-dasharray="'+dash+' '+gap+'" stroke-dashoffset="'+circ/4+'" stroke-linecap="round" opacity="0.85"/><text x="'+CX+'" y="'+(CY+4)+'" text-anchor="middle" fill="'+accent.c+'" font-size="10" font-family="VT323,monospace">'+(pct!==null?pct+'%':checkins.length)+'</text></svg>';
    }

    // Dot streak
    var totalSlots=Math.min(Math.max(g.total||10,checkins.length,8),20);
    var dotsH='<div style="display:flex;gap:3px;flex-wrap:wrap;margin:8px 0 10px">';
    for(var ci=0;ci<totalSlots;ci++){
      var filled=ci<checkins.length;
      var isToday2=filled&&ci===checkins.length-1&&checkedToday;
      dotsH+='<div style="width:8px;height:8px;border-radius:50%;background:'+(isToday2?accent.c:filled?accent.c+'99':'rgba(255,255,255,.08)')+';box-shadow:'+(isToday2?'0 0 6px '+accent.c:'none')+';flex-shrink:0"></div>';
    }
    dotsH+='</div>';

    h+='<div style="background:'+accent.bg+';border:1px solid '+accent.ring+';border-radius:3px;padding:12px 14px;margin-bottom:8px">';

    if(goalEditId===g.id){
      h+='<input class="goal-inp" id="gedit-'+g.id+'" value="'+g.text.replace(/"/g,'&quot;')+'" style="margin-bottom:8px;font-size:var(--t-body)">';
      h+='<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><span class="dim-9">Target check-ins (optional):</span><input class="goal-inp" id="gedit-total-'+g.id+'" type="number" min="1" value="'+(g.total||'')+'" placeholder="optional" style="width:60px"></div>';
      h+='<div class="flex-row"><button class="goal-action-btn checkin" data-gedit-save="'+g.id+'" data-gperiod="'+period+'">SAVE</button><button class="goal-action-btn" data-gedit-cancel="1">CANCEL</button></div>';
    } else {
      h+='<div style="display:flex;gap:10px;align-items:flex-start">';
      h+=arcSvg;
      h+='<div class="flex-1">';
      h+='<div style="font-size:var(--t-xs);color:'+accent.c+';letter-spacing:1.5px;opacity:.7;margin-bottom:2px">'+period.toUpperCase()+(timeInfo?' · '+timeInfo:'')+'</div>';
      h+='<div style="font-size:var(--t-body);color:var(--text);font-weight:600;line-height:1.3">'+g.text+'</div>';
      h+='</div>';
      h+='<div style="display:flex;gap:3px;flex-shrink:0">';
      h+='<button class="goal-action-btn" data-geditbtn="'+g.id+'" style="font-size:var(--t-sm);padding:2px 6px;opacity:.4">&#9998;</button>';
      h+='<button class="goal-action-btn danger" data-gdel="'+g.id+'" data-gperiod="'+period+'" style="font-size:var(--t-sm);padding:2px 6px;opacity:.4">&#x2715;</button>';
      h+='</div></div>';
      h+=dotsH;
      if(checkedToday){
        h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid var(--c-ghost)">';
        h+='<span style="color:'+accent.c+';font-size:var(--t-sub)">&#10003;</span><span style="font-size:var(--t-base);color:'+accent.c+';opacity:.8">Done for today</span>';
        h+='<span style="font-size:var(--t-sm);color:var(--dim);margin-left:auto">'+checkins.length+(g.total?'/'+g.total:'')+' total</span>';
        h+='</div>';
      } else {
        h+='<button data-gcheckin="'+g.id+'" data-gperiod="'+period+'" style="width:100%;padding:10px;background:'+accent.bg+';border:1px solid '+accent.ring+';color:'+accent.c+';font-family:VT323,monospace;font-size:var(--t-title);cursor:pointer;letter-spacing:2px;border-radius:2px">CHECK IN ✓</button>';
      }
      if(!onTrack&&remaining>0){
        h+='<div style="font-size:var(--t-sm);color:rgba(255,180,50,.8);margin-top:6px">&#9650; Behind · '+remaining+' more needed in '+daysLeft+'d</div>';
      } else if(remaining===0){
        h+='<div style="font-size:var(--t-sm);color:'+accent.c+';margin-top:6px">&#10003; Target reached!</div>';
      }
      var detailCount=notes.length+subgoals.length;
      h+='<div data-goalexpand="'+g.id+'" style="font-size:var(--t-sm);color:var(--dim);cursor:pointer;margin-top:8px;opacity:.5;user-select:none">'+(isExpanded?'▲ collapse':'▼ details'+(detailCount?' ('+detailCount+')':''))+'</div>';
      if(isExpanded){
        h+='<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--c-ghost)">';
        h+='<div class="label-dim-sm">SUBGOALS</div>';
        subgoals.forEach(function(sg,sgi){
          h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
          h+='<span data-goalsg="'+g.id+'" data-sgidx="'+sgi+'" style="cursor:pointer;font-size:var(--t-sub);color:'+(sg.done?accent.c:'rgba(255,255,255,.2)')+'">'+( sg.done?'◉':'○')+'</span>';
          h+='<span style="flex:1;font-size:var(--t-md);color:'+(sg.done?'var(--dim)':'var(--text)')+(sg.done?';text-decoration:line-through':'')+'">'+sg.text+'</span>';
          h+='<span data-goalsqdel="'+g.id+'" data-sgidx="'+sgi+'" style="font-size:var(--t-sm);color:var(--dim);cursor:pointer;opacity:.3">✕</span>';
          h+='</div>';
        });
        h+='<div style="display:flex;gap:6px;margin-top:8px"><input id="gsg-inp-'+g.id+'" placeholder="Add subgoal..." autocomplete="off" style="flex:1;background:transparent;border:none;border-bottom:1px solid var(--c-border);color:var(--text);font-family:monospace;font-size:var(--t-md);padding:4px 2px;outline:none"><button data-goalsgadd="'+g.id+'" data-gperiod="'+period+'" style="font-size:var(--t-sm);padding:3px 10px;border:1px solid '+accent.ring+';color:'+accent.c+';background:transparent;cursor:pointer">+</button></div>';
        h+='<div style="margin-top:12px"><div class="label-dim-sm">NOTES</div>';
        if(notes.length){
          notes.slice().reverse().slice(0,5).forEach(function(n){
            h+='<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04)"><div style="font-size:var(--t-xs);color:var(--dim);margin-bottom:2px">'+(n.ts?n.ts.slice(0,10):'')+'</div><div style="font-size:var(--t-md);color:var(--text);line-height:1.5">'+n.text+'</div></div>';
          });
          if(notes.length>5)h+='<div style="font-size:var(--t-xs);color:var(--dim);opacity:.4;margin-top:4px">+ '+(notes.length-5)+' more</div>';
        } else {
          h+='<div style="font-size:var(--t-sm);color:var(--dim);opacity:.5">No notes yet.</div>';
        }
        h+='<textarea id="gnote-inp-'+g.id+'" placeholder="Add a note..." style="width:100%;min-height:52px;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.08);color:var(--text);font-family:monospace;font-size:var(--t-md);padding:8px 0;outline:none;resize:none;box-sizing:border-box;line-height:1.5;margin-top:8px"></textarea>';
        h+='<button data-goalnotesave="'+g.id+'" data-gperiod="'+period+'" style="width:100%;padding:6px;background:transparent;border:1px solid var(--c-border);color:var(--dim);font-family:monospace;font-size:var(--t-sm);cursor:pointer;letter-spacing:1px;margin-top:4px">SAVE NOTE</button></div>';
        h+='<button class="goal-action-btn complete" data-gcomplete="'+g.id+'" data-gperiod="'+period+'" style="width:100%;margin-top:12px">MARK COMPLETE</button>';
        h+='</div>';
      }
    }
    h+='</div>';
  });

  // Add goal form
  h+='<div style="margin-top:4px;padding-top:10px;border-top:1px solid var(--c-ghost)">';
  h+='<div style="display:flex;gap:6px;margin-bottom:8px">';
  h+='<span data-gperiod="monthly" id="gperiod-monthly" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid rgba(255,204,0,.4);color:var(--ca);cursor:pointer;letter-spacing:1px">MONTHLY</span>';
  h+='<span data-gperiod="yearly" id="gperiod-yearly" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid var(--c-border);color:var(--dim);cursor:pointer;letter-spacing:1px">YEARLY</span>';
  h+='</div>';
  h+='<input class="goal-inp" id="gi-new" placeholder="What do you want to pursue?" autocomplete="off" class="mb-6">';
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="dim-9">target check-ins</span><input class="goal-inp" id="gt-new" type="number" min="1" placeholder="optional" style="width:80px;flex-shrink:0"></div>';
  h+='<button class="goal-add-btn" id="gadd-new">+ ADD GOAL</button>';
  h+='</div>';

  el.innerHTML=h;

  // Wire up via data attributes to avoid closure-in-loop bugs
  el.querySelectorAll('[data-gcheckin]').forEach(function(btn){
    btn.onclick=function(){goalCheckin(this.dataset.gperiod,+this.dataset.gcheckin);};
  });
  el.querySelectorAll('[data-gcomplete]').forEach(function(btn){
    btn.onclick=function(){goalComplete(this.dataset.gperiod,+this.dataset.gcomplete);};
  });
  el.querySelectorAll('[data-geditbtn]').forEach(function(btn){
    btn.onclick=function(){goalEditId=+this.dataset.geditbtn;renderGoals('active');};
  });
  el.querySelectorAll('[data-gdel]').forEach(function(btn){
    btn.onclick=function(){goalDelete(this.dataset.gperiod,+this.dataset.gdel,this);};
  });
  el.querySelectorAll('[data-goalsgadd]').forEach(function(btn){
    btn.onclick=function(){goalAddSubgoal(this.dataset.gperiod,+this.dataset.goalsgadd);};
  });
  el.querySelectorAll('[data-gsg-inp]').forEach(function(inp){
    inp.onkeydown=function(e){if(e.keyCode===13)goalAddSubgoal(this.dataset.gperiod,+this.dataset.gsgId);};
  });
  el.querySelectorAll('[data-goalnotesave]').forEach(function(btn){
    btn.onclick=function(){goalSaveNote(this.dataset.gperiod,+this.dataset.goalnotesave);};
  });
  el.querySelectorAll('[data-gedit-save]').forEach(function(btn){
    btn.onclick=function(){goalSaveEditNew(this.dataset.gperiod,+this.dataset.geditSave);};
  });
  el.querySelectorAll('[data-gedit-cancel]').forEach(function(btn){
    btn.onclick=function(){goalEditId=null;renderGoals('active');};
  });
  el.querySelectorAll('[data-gedit-inp]').forEach(function(inp){
    var pid=inp.dataset.gperiod,gid=+inp.dataset.geditInp;
    inp.onkeydown=function(e){
      if(e.keyCode===13)goalSaveEditNew(pid,gid);
      if(e.keyCode===27){goalEditId=null;renderGoals('active');}
    };
    setTimeout(function(){inp.focus();inp.select();},20);
  });

  // New goal period selector
  window._newGoalPeriod=window._newGoalPeriod||'monthly';
  var gpm=document.getElementById('gperiod-monthly');
  var gpy=document.getElementById('gperiod-yearly');
  function updatePeriodBtns(){
    var p=window._newGoalPeriod;
    if(gpm){gpm.style.background=p==='monthly'?'rgba(255,204,0,.08)':'transparent';gpm.style.color=p==='monthly'?'var(--ca)':'var(--dim)';gpm.style.borderColor=p==='monthly'?'rgba(255,204,0,.4)':'rgba(255,255,255,.12)';}
    if(gpy){gpy.style.background=p==='yearly'?'rgba(255,204,0,.08)':'transparent';gpy.style.color=p==='yearly'?'var(--ca)':'var(--dim)';gpy.style.borderColor=p==='yearly'?'rgba(255,204,0,.4)':'rgba(255,255,255,.12)';}
  }
  updatePeriodBtns();
  if(gpm)gpm.onclick=function(){window._newGoalPeriod='monthly';updatePeriodBtns();};
  if(gpy)gpy.onclick=function(){window._newGoalPeriod='yearly';updatePeriodBtns();};

  var addBtn=document.getElementById('gadd-new');
  var addInp=document.getElementById('gi-new');
  if(addBtn)addBtn.onclick=function(){goalAddNew();};
  if(addInp)addInp.onkeydown=function(e){if(e.keyCode===13)goalAddNew();};

  // Expand toggle delegation
  el.querySelectorAll('[data-goalexpand]').forEach(function(btn){
    btn.onclick=function(){
      var gid=+this.dataset.goalexpand;
      var k='goal_open_'+gid;
      window[k]=!window[k];
      renderGoals('active');
    };
  });
  // Subgoal toggle
  el.querySelectorAll('[data-goalsg]').forEach(function(btn){
    btn.onclick=function(){
      var gid=+this.dataset.goalsg;var sgi=+this.dataset.sgidx;
      var g2=findGoalById(gid);if(!g2)return;
      if(!g2.subgoals)g2.subgoals=[];
      g2.subgoals[sgi].done=!g2.subgoals[sgi].done;
      goalsSave();renderGoals('active');
    };
  });
  // Subgoal delete
  el.querySelectorAll('[data-goalsqdel]').forEach(function(btn){
    btn.onclick=function(){
      var gid=+this.dataset.goalsqdel;var sgi=+this.dataset.sgidx;
      var g2=findGoalById(gid);if(!g2)return;
      g2.subgoals.splice(sgi,1);
      goalsSave();renderGoals('active');
    };
  });
}


function findGoalById(id){
  var all=(goalsData.monthly||[]).concat(goalsData.yearly||[]);
  return all.find(function(g){return g.id===id;});
}

function goalAddNew(){
  var inp=document.getElementById('gi-new');
  var txt=inp?inp.value.trim():'';if(!txt)return;
  var totalEl=document.getElementById('gt-new');
  var total=parseInt(totalEl?totalEl.value:'')||null;
  var period=window._newGoalPeriod||'monthly';
  if(!goalsData[period])goalsData[period]=[];
  goalsData[period].push({id:Date.now(),text:txt,total:total,checkins:[],notes:[],subgoals:[],created:localDateStr()});
  goalsSave();
  if(inp)inp.value='';
  if(totalEl)totalEl.value='';
  renderGoals('active');
}

function goalSaveEditNew(period,id){
  var inp=document.getElementById('gedit-'+id);
  var totalEl=document.getElementById('gedit-total-'+id);
  if(!inp)return;
  var txt=inp.value.trim();if(!txt)return;
  var total=parseInt(totalEl?totalEl.value:'')||null;
  var list=goalsData[period]||[];
  var g=list.find(function(x){return x.id===id;});
  if(g){g.text=txt;g.total=total;}
  goalEditId=null;
  goalsSave();renderGoals('active');
}

function goalAddSubgoal(period,id){
  var inp=document.getElementById('gsg-inp-'+id);
  var txt=inp?inp.value.trim():'';if(!txt)return;
  var list=goalsData[period]||[];
  var g=list.find(function(x){return x.id===id;});
  if(!g)return;
  if(!g.subgoals)g.subgoals=[];
  g.subgoals.push({text:txt,done:false,created:localDateStr()});
  if(inp)inp.value='';
  goalsSave();renderGoals('active');
}

function goalSaveNote(period,id){
  var inp=document.getElementById('gnote-inp-'+id);
  var txt=inp?inp.value.trim():'';if(!txt)return;
  var list=goalsData[period]||[];
  var g=list.find(function(x){return x.id===id;});
  if(!g)return;
  if(!g.notes)g.notes=[];
  g.notes.push({text:txt,ts:new Date().toISOString()});
  if(inp)inp.value='';
  goalsSave();renderGoals('active');
  confetti(window.innerWidth/2,200,'#ffcc00');
}
function renderDoneGoals(){
  var el=document.getElementById('goal-done-panel');if(!el)return;
  var done=goalsData.done||[];
  if(!done.length){
    el.innerHTML='<div class="card-empty-v">No completed goals yet.</div>';
    return;
  }
  var h='<div style="font-size:var(--t-xs);letter-spacing:2px;color:var(--dim);margin-bottom:10px">'+done.length+' COMPLETED</div>';
  done.slice().reverse().forEach(function(g){
    var notes=g.notes||[];
    var subgoals=g.subgoals||[];
    var checkins=g.checkins||[];
    var expandKey='goaldone_open_'+g.id;
    var isOpen=window[expandKey];
    h+='<div class="goal-card" style="border-left-color:var(--cg);background:rgba(0,255,136,.03);margin-bottom:10px">';
    // Header
    h+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">';
    h+='<div style="flex:1">';
    h+='<div style="font-size:var(--t-xs);letter-spacing:2px;color:var(--cg);opacity:.7;margin-bottom:4px">'+(g.period||'').toUpperCase()+' · COMPLETED</div>';
    h+='<div class="goal-card-title">'+g.text+'</div>';
    h+='</div>';
    h+='<span style="font-size:var(--t-xs);color:var(--dim);white-space:nowrap">'+( g.completedDate||'')+'</span>';
    h+='</div>';
    // Chain dots
    if(checkins.length){
      h+='<div class="goal-chain" class="mb-8">';
      var slots=Math.max(g.total||checkins.length,checkins.length);
      for(var ci=0;ci<Math.min(slots,16);ci++){
        h+='<div class="goal-chain-dot'+(ci<checkins.length?' done':'')+'"></div>';
      }
      h+='</div>';
      h+='<div style="font-size:var(--t-sm);color:var(--dim);margin-bottom:8px">'+checkins.length+(g.total?'/'+g.total:'')+' check-ins</div>';
    }
    // Expand toggle
    h+='<div data-goaldoneexpand="'+g.id+'" style="font-size:var(--t-sm);color:var(--dim);cursor:pointer;user-select:none">'+(isOpen?'▲ hide':'▼ notes & subgoals ('+notes.length+' notes, '+subgoals.length+' subgoals)')+'</div>';
    if(isOpen){
      // Subgoals
      if(subgoals.length){
        h+='<div style="margin-top:10px">';
        h+='<div style="font-size:var(--t-xs);color:var(--cg);letter-spacing:2px;margin-bottom:6px">SUBGOALS</div>';
        subgoals.forEach(function(sg){
          h+='<div class="goal-subgoal'+(sg.done?' done-sg':'')+'">';
          h+='<span style="font-size:var(--t-body);color:'+(sg.done?'var(--cg)':'rgba(255,255,255,.2)')+'">'+( sg.done?'◉':'○')+'</span>';
          h+='<span>'+sg.text+'</span>';
          h+='</div>';
        });
        h+='</div>';
      }
      // Notes
      if(notes.length){
        h+='<div style="margin-top:10px">';
        h+='<div style="font-size:var(--t-xs);color:var(--cg);letter-spacing:2px;margin-bottom:6px">NOTES ('+notes.length+')</div>';
        notes.slice().reverse().forEach(function(n){
          h+='<div class="goal-note-entry">';
          h+='<div class="goal-note-date">'+(n.ts?n.ts.slice(0,10):'')+'</div>';
          h+='<div>'+n.text+'</div>';
          h+='</div>';
        });
        h+='</div>';
      }
      if(!notes.length&&!subgoals.length){
        h+='<div style="font-size:var(--t-sm);color:var(--dim);margin-top:8px;opacity:.6">No notes or subgoals recorded.</div>';
      }
    }
    h+='</div>';
  });
  el.innerHTML=h;
  // Wire expand toggles
  el.querySelectorAll('[data-goaldoneexpand]').forEach(function(btn){
    btn.onclick=function(){
      var gid=+this.dataset.goaldoneexpand;
      var k='goaldone_open_'+gid;
      window[k]=!window[k];
      renderDoneGoals();
    };
  });
}

function goalAdd(period){
  var inp=document.getElementById('gi-'+period);
  var txt=inp?inp.value.trim():'';if(!txt)return;
  var totalEl=document.getElementById('gt-'+period);
  var total=parseInt(totalEl?totalEl.value:'')||null;
  if(!goalsData[period])goalsData[period]=[];
  goalsData[period].push({id:Date.now(),text:txt,total:total,checkins:[],created:localDateStr()});
  goalsSave();
  if(inp)inp.value='';
  if(totalEl)totalEl.value='';
  renderGoals(period);
}

function goalSaveEdit(period,id){
  var inp=document.getElementById('gedit-'+id);
  var totalEl=document.getElementById('gedit-total-'+id);
  if(!inp)return;
  var txt=inp.value.trim();if(!txt)return;
  var total=parseInt(totalEl?totalEl.value:'')||null;
  var list=goalsData[period]||[];
  var g=list.find(function(x){return x.id===id;});
  if(g){g.text=txt;g.total=total;}
  goalEditId=null;
  goalsSave();renderGoals(period);
}

function goalCheckin(period,id){
  var list=goalsData[period]||[];
  var g=list.find(function(x){return x.id===id;});
  if(!g)return;
  if(!g.checkins)g.checkins=[];
  var todayStr=localDateStr();
  if(g.checkins[g.checkins.length-1]===todayStr)return; // already checked in today
  g.checkins.push(todayStr);
  safeHap(HAP.goal);
  goalsSave();renderGoals('active');
  confetti(window.innerWidth/2,window.innerHeight*0.3,'#ffcc00');
}

function goalComplete(period,id){
  var list=goalsData[period]||[];
  var idx=list.findIndex(function(x){return x.id===id;});
  if(idx<0)return;
  var g=list[idx];
  if(!goalsData.done)goalsData.done=[];
  goalsData.done.push(Object.assign({},g,{period:period,completedDate:localDateStr()}));
  list.splice(idx,1);
  goalsSave();renderGoals('active');
  confetti(window.innerWidth/2,window.innerHeight*0.3,'#00ff88');
}

function goalDelete(period,id,btn){
  var key=period+'-'+id;
  if(!goalDelPending[key]){
    goalDelPending[key]=true;
    if(btn)btn.textContent='SURE?';
    setTimeout(function(){
      goalDelPending[key]=false;
      if(btn&&btn.parentNode)btn.textContent='✕';
    },3000);
    return;
  }
  goalDelPending[key]=false;
  goalsData[period]=(goalsData[period]||[]).filter(function(x){return x.id!==id;});
  goalsSave();renderGoals('active');
}

renderGoals('active');


//  PRAYER SPARKLE 
function checkPrayerSparkle(){
  var day=ptData[localDateStr()]||{};
  var PT5=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
  var allOT=PT5.every(function(p){return day[p]==='ontime';});
  var tile=document.querySelector('[data-id="prayer-tracker"]');
  if(!tile)return;
  if(allOT){
    tile.classList.add('prayer-all-done');
    var rect=tile.getBoundingClientRect();
    for(var i=0;i<10;i++){
      (function(delay){setTimeout(function(){
        var star=document.createElement('span');
        star.className='sparkle-star';
        star.textContent=['✦','★','✶','✹','✪','✨'][Math.floor(Math.random()*6)];
        star.style.cssText='position:fixed;left:'+(rect.left+Math.random()*rect.width)+'px;top:'+(rect.top+Math.random()*rect.height*.7)+'px;color:'+['#00ff88','#ffcc00','#ffffff','#00e5ff'][Math.floor(Math.random()*4)]+';font-size:'+(9+Math.random()*12)+'px;pointer-events:none;z-index:9999';
        document.body.appendChild(star);setTimeout(function(){star.remove();},1200);
      },delay);})(i*110+Math.random()*60);
    }
  } else {
    tile.classList.remove('prayer-all-done');
  }
}










//  SUPABASE CLOUD SYNC 
var SB_CONFIG_KEY='dash_sb_config';
var SB_LOG_KEY='dash_sb_log';

function sbGetConfig(){
  var cfg=JSON.parse(localStorage.getItem(SB_CONFIG_KEY)||'{}');
  cfg.deviceName=localStorage.getItem('dash_device_name')||'';
  return cfg;
}
function getDeviceName(){return localStorage.getItem('dash_device_name')||'unnamed device';}
function setDeviceName(name){localStorage.setItem('dash_device_name',name||'');updateDeviceNameDisplay();}

function sbSaveConfig(){
  var cfg={
    url:(document.getElementById('sb-url')||{}).value||'',
    key:(document.getElementById('sb-key')||{}).value||'',
    account:(document.getElementById('sb-account')||{}).value||''
  };
  localStorage.setItem(SB_CONFIG_KEY,JSON.stringify(cfg));
  var dn=document.getElementById('sb-device-name');
  if(dn)setDeviceName(dn.value);
}

function sbLoadConfig(){
  var cfg=sbGetConfig();
  var urlEl=document.getElementById('sb-url');
  var keyEl=document.getElementById('sb-key');
  var accEl=document.getElementById('sb-account');
  if(urlEl&&cfg.url)urlEl.value=cfg.url;
  if(keyEl&&cfg.key)keyEl.value=cfg.key;
  if(accEl&&cfg.account)accEl.value=cfg.account;
  var dnEl=document.getElementById('sb-device-name');
  if(dnEl)dnEl.value=getDeviceName();
  sbRenderLog();
  updateDeviceNameDisplay();
}

function updateDeviceNameDisplay(){
  var name=getDeviceName();
  var btn=document.getElementById('topbar-sync-btn');
  if(btn)btn.title='Sync · '+name;
  var el=document.getElementById('sb-device-display');
  if(el)el.textContent=name?'Device: '+name:'Device name not set';
  var tn=document.getElementById('topbar-device-name');
  if(tn)tn.textContent=name||'';
}

function sbSetStatus(msg,type){
  // type: 'ok' | 'err' | 'working' | ''
  var el=document.getElementById('sb-status');
  if(!el)return;
  var color=type==='ok'?'var(--cg)':type==='err'?'var(--cr)':type==='working'?'var(--ca)':'var(--dim)';
  var prefix=type==='ok'?'✓ ':type==='err'?'✗ ':type==='working'?'⟳ ':'';
  el.style.color=color;
  el.textContent=prefix+msg;
  if(type==='ok') setTimeout(function(){if(el.textContent===prefix+msg)el.textContent='';},5000);
}

function sbAddLog(action,ok,detail){
  var log=JSON.parse(localStorage.getItem(SB_LOG_KEY)||'[]');
  log.unshift({action:action,ok:ok,detail:detail||'',ts:new Date().toLocaleString()});
  if(log.length>4)log=log.slice(0,4);
  localStorage.setItem(SB_LOG_KEY,JSON.stringify(log));
  sbRenderLog();
}

function sbRenderLog(){
  var el=document.getElementById('sb-log-list');
  if(!el)return;
  var log=JSON.parse(localStorage.getItem(SB_LOG_KEY)||'[]');
  if(!log.length){
    el.innerHTML='<div style="font-size:var(--t-sm);color:var(--dim);padding:4px 0">No sync activity yet.</div>';
    return;
  }
  var h='';
  log.forEach(function(entry){
    var icon=entry.ok?'✓':'✗';
    var color=entry.ok?'var(--cg)':'var(--cr)';
    h+='<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;border-bottom:1px solid rgba(0,255,136,.06)">';
    h+='<div class="flex-1">';
    h+='<span style="color:'+color+';font-size:var(--t-sm);letter-spacing:.5px">'+icon+' '+entry.action+'</span>';
    if(entry.detail){
      h+='<div style="font-size:var(--t-xs);color:var(--dim);margin-top:2px;word-break:break-all">'+entry.detail+'</div>';
    }
    h+='</div>';
    h+='<span style="font-size:var(--t-xs);color:var(--dim);flex-shrink:0;margin-left:8px;white-space:nowrap">'+entry.ts+'</span>';
    h+='</div>';
  });
  el.innerHTML=h;
}



// sync dropdown removed — using direct push/pull buttons

var _sbModalChoice=null;

async function sbMaybeFetchCloudStatus(){
  var statusEl=document.getElementById('sb-cloud-status');
  if(!statusEl)return;
  var cached=JSON.parse(localStorage.getItem('dash_cloud_meta')||'null');
  var now=Date.now();
  if(cached&&cached.fetchedAt&&(now-cached.fetchedAt)<3600000){
    sbRenderCloudStatus(cached);
    return;
  }
  var cfg=sbGetConfig();
  if(!cfg.url||!cfg.key||!cfg.account){
    statusEl.innerHTML='<span style="color:var(--dim)">Configure Supabase in Settings.</span>';
    return;
  }
  statusEl.innerHTML='<span style="color:var(--dim);font-size:var(--t-sm)">Checking cloud...</span>';
  try{
    var base=cfg.url.replace(/\/+$/,'');
    // Single lightweight request — updated_at column + two payload fields
    var endpoint=base+'/rest/v1/dashboard_data?account=eq.'+encodeURIComponent(cfg.account)
      +'&select=updated_at,payload->>lastPushDevice,payload->>lastPushDeviceId&limit=1';
    var res=await fetch(endpoint,{headers:{'apikey':cfg.key,'Authorization':'Bearer '+cfg.key}});
    if(!res.ok){
      var errBody='';
      try{var ej=await res.json();errBody=ej.message||ej.hint||JSON.stringify(ej);}catch(e2){try{errBody=await res.text();}catch(e3){errBody='(no body)';}};
      statusEl.innerHTML='<span style="color:var(--cr);font-size:var(--t-sm)">HTTP '+res.status+': '+errBody.slice(0,80)+'</span>';
      return;
    }
    var data=await res.json();
    if(!data||!data.length){
      statusEl.innerHTML='<span style="color:var(--dim);font-size:var(--t-sm)">No cloud data yet. Push first.</span>';
      return;
    }
    var row=data[0];
    var meta={
      fetchedAt:now,
      lastPushDevice:row.lastPushDevice||null,
      lastPushDeviceId:row.lastPushDeviceId||null,
      lastPushTs:row.updated_at||null
    };
    lsSet('dash_cloud_meta',meta);
    sbRenderCloudStatus(meta);
  }catch(e){
    statusEl.innerHTML='<span style="color:var(--cr);font-size:var(--t-sm)">Error: '+(e.message||'network error')+'</span>';
  }
}

function sbRenderCloudStatus(meta){
  var el=document.getElementById('sb-cloud-status');
  if(!el)return;
  var lines=[];
  if(meta.lastPushDevice){
    lines.push('Last pushed by: <span style="color:var(--text)">'+meta.lastPushDevice+'</span>');
  }
  if(meta.lastPushTs){
    lines.push('Cloud updated: <span style="color:var(--text)">'+sbTimeAgo(meta.lastPushTs)+'</span>');
  }
  var fetchAge=meta.fetchedAt?sbTimeAgo(new Date(meta.fetchedAt).toISOString()):'just now';
  lines.push('<span style="opacity:.5;font-size:var(--t-xs)">Status checked '+fetchAge+'</span>');
  el.innerHTML=lines.join('<br>');
}
function sbShowModal(){
  var modal=document.getElementById('sb-modal');
  if(!modal)return;
  var cfg=sbGetConfig();
  var accEl=document.getElementById('sb-modal-account');
  if(accEl)accEl.textContent=cfg.account?'Account: '+cfg.account+' · Device: '+getDeviceName():'No account configured — go to Settings';
  var st=document.getElementById('sb-modal-status');
  if(st){st.textContent='';st.style.color='';}
  renderSyncLog();
  modal.style.display='flex';
  // Close on backdrop click
  modal.onclick=function(e){if(e.target===modal)sbHideModal();};
  // Soft pull cloud metadata if last sync was >1hr ago
  sbMaybeFetchCloudStatus();
  sbFetchCloudSyncLog();
  renderSyncLog();
  // Wire auto-sync checkbox
  var _cb=document.getElementById('sb-autosync-cb');
  if(_cb){
    _cb.checked=!!_autoSyncInterval;
    _cb.onchange=function(){
      if(this.checked)sbStartAutoSync();
      else sbStopAutoSync();
    };
  }
  _sbUpdateAutoSyncStatus();
}

function sbHideModal(){
  var modal=document.getElementById('sb-modal');
  if(modal)modal.style.display='none';
  _sbModalChoice=null;
  // Reset topbar button
  var btn=document.getElementById('topbar-sync-btn');
  if(btn){btn.innerHTML='&#9729;';btn.disabled=false;btn.style.color='var(--cg)';}
}

function sbModalSelect(choice){
  _sbModalChoice=choice;
  var rPush=document.getElementById('sb-radio-push');
  var rPull=document.getElementById('sb-radio-pull');
  var oPush=document.getElementById('sb-opt-push');
  var oPull=document.getElementById('sb-opt-pull');
  if(rPush)rPush.innerHTML=choice==='push'?'<div style="width:8px;height:8px;border-radius:50%;background:var(--cg)"></div>':'';
  if(rPull)rPull.innerHTML=choice==='pull'?'<div style="width:8px;height:8px;border-radius:50%;background:var(--cc)"></div>':'';
  if(oPush)oPush.style.background=choice==='push'?'rgba(0,255,136,.07)':'';
  if(oPull)oPull.style.background=choice==='pull'?'rgba(0,229,255,.07)':'';
}

function sbModalStatus(msg,type){
  var el=document.getElementById('sb-modal-status');
  if(!el)return;
  el.textContent=msg;
  el.style.color=type==='ok'?'var(--cg)':type==='err'?'var(--cr)':'var(--dim)';
}


function topbarProgress(direction){
  var bar=document.getElementById('topbar-progress');
  if(!bar)return;
  var isPush=direction==='push';
  bar.style.transition='none';bar.style.opacity='1';
  bar.style.background=isPush?'rgba(0,255,136,0.18)':'rgba(0,229,255,0.18)';
  if(isPush){bar.style.left='0';bar.style.right='auto';bar.style.width='0';setTimeout(function(){bar.style.transition='width 5s linear';bar.style.width='100%';},20);}
  else{bar.style.right='0';bar.style.left='auto';bar.style.width='0';setTimeout(function(){bar.style.transition='width 5s linear';bar.style.width='100%';},20);}
  setTimeout(function(){bar.style.transition='opacity 0.5s';bar.style.opacity='0';},5200);
  setTimeout(function(){bar.style.width='0';},5800);
}

var SYNC_LOG_KEY='dash_sync_log';
function saveSyncLog(action,device,ts){
  var tsStr=ts||new Date().toISOString();
  // Local log (this device)
  var log=JSON.parse(localStorage.getItem(SYNC_LOG_KEY)||'[]');
  log.unshift({action:action,device:device,ts:tsStr});
  if(log.length>20)log=log.slice(0,20);
  localStorage.setItem(SYNC_LOG_KEY,JSON.stringify(log));
  // Cross-device log (all devices, stored in cloud key)
  var allLog=lsGet('dash_sync_log_all',[]);
  allLog.unshift({action:action,device:device,ts:tsStr});
  if(allLog.length>20)allLog=allLog.slice(0,20);
  lsSet('dash_sync_log_all',allLog);
  renderSyncLog();
}
async function sbFetchCloudSyncLog(){
  var cfg=sbGetConfig();
  if(!cfg.url||!cfg.key||!cfg.account)return;
  try{
    var base=cfg.url.replace(/\/+$/,'');
    var endpoint=base+'/rest/v1/dashboard_data?account=eq.'+encodeURIComponent(cfg.account)+'&select=payload->>syncLogAll&limit=1';
    var res=await fetch(endpoint,{headers:{'apikey':cfg.key,'Authorization':'Bearer '+cfg.key}});
    if(!res.ok)return;
    var rows=await res.json();
    if(!rows||!rows[0])return;
    var cloudLog=rows[0].syncLogAll;
    if(typeof cloudLog==='string')cloudLog=JSON.parse(cloudLog);
    if(!Array.isArray(cloudLog))return;
    // Merge with local
    var localLog=lsGet('dash_sync_log_all',[]);
    var map={};
    localLog.concat(cloudLog).forEach(function(e){if(e&&e.ts&&e.device)map[e.device+'_'+e.ts]=e;});
    var merged=Object.values(map).sort(function(a,b){return b.ts>a.ts?1:-1;}).slice(0,20);
    lsSet('dash_sync_log_all',merged);
    renderSyncLog();
  }catch(e){console.warn('sbFetchCloudSyncLog failed',e);}
}

function renderSyncLog(){
  var el=document.getElementById('sb-sync-history');
  if(!el)return;
  var thisDevice=getDeviceName();
  var allLog=lsGet('dash_sync_log_all',[]);
  var localLog=JSON.parse(localStorage.getItem(SYNC_LOG_KEY)||'[]');
  var h='';

  // Last 5 syncs across all devices
  h+='<div class="label-dim-sm">LAST 5 SYNCS · ALL DEVICES</div>';
  if(!allLog.length){
    h+='<div style="font-size:var(--t-sm);color:var(--dim);padding:4px 0;opacity:.5">No syncs yet.</div>';
  } else {
    allLog.slice(0,5).forEach(function(entry){
      var ago=sbTimeAgo(entry.ts);
      var isPush=entry.action==='PUSH'||entry.action==='PUSH ↑';
      var col=isPush?'var(--cg)':'var(--cc)';
      var isMe=entry.device===thisDevice;
      h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">';
      h+='<span style="font-size:var(--t-lg);color:'+col+'">'+(isPush?'↑':'↓')+'</span>';
      h+='<div style="flex:1">';
      h+='<div style="font-size:var(--t-base);color:'+(isMe?'var(--text)':'var(--dim)')+'">'+(entry.device||'unknown')+(isMe?' • this device':'')+'</div>';
      h+='<div style="font-size:var(--t-xs);color:var(--dim);opacity:.6">'+ago+'</div>';
      h+='</div>';
      h+='<span style="font-size:var(--t-xs);color:'+col+';opacity:.7">'+(isPush?'PUSH':'PULL')+'</span>';
      h+='</div>';
    });
  }

  // This device last sync
  h+='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-top:10px;margin-bottom:6px">THIS DEVICE</div>';
  var thisDevLog=localLog.filter(function(e){return !e.device||e.device===thisDevice;});
  if(!thisDevLog.length){
    h+='<div style="font-size:var(--t-sm);color:var(--dim);opacity:.5">No syncs from this device yet.</div>';
  } else {
    var last=thisDevLog[0];
    var isPush=last.action==='PUSH'||last.action==='PUSH ↑';
    var col=isPush?'var(--cg)':'var(--cc)';
    h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0">';
    h+='<span style="font-size:var(--t-lg);color:'+col+'">'+(isPush?'↑':'↓')+'</span>';
    h+='<div style="flex:1"><div class="text-11">'+(isPush?'PUSH':'PULL')+' · '+sbTimeAgo(last.ts)+'</div></div>';
    h+='</div>';
  }
  el.innerHTML=h;
}
function sbTimeAgo(isoStr){
  if(!isoStr)return 'unknown time';
  var then=new Date(isoStr);
  var now=new Date();
  var diff=Math.floor((now-then)/1000);
  if(diff<60)return diff+' seconds ago';
  if(diff<3600)return Math.floor(diff/60)+' minutes ago';
  if(diff<86400)return Math.floor(diff/3600)+' hours ago';
  return Math.floor(diff/86400)+' days ago';
}

async function sbAnalyzeCloud(){
  var el=document.getElementById('sb-analyze-result');
  if(!el)return;
  el.textContent='Fetching from cloud...';
  el.style.color='var(--dim)';
  var cfg=sbGetConfig();
  if(!cfg.url||!cfg.key||!cfg.account){
    el.textContent='No Supabase config — go to Settings first.';
    el.style.color='var(--cr)';
    return;
  }
  try{
    var endpoint=cfg.url.replace(/\/+$/,'')+'/rest/v1/dashboard_data?account=eq.'+encodeURIComponent(cfg.account)+'&select=payload&limit=1';
    var res=await fetch(endpoint,{headers:{'apikey':cfg.key,'Authorization':'Bearer '+cfg.key}});
    if(!res.ok){el.textContent='Error: HTTP '+res.status;el.style.color='var(--cr)';return;}
    var rows=await res.json();
    if(!rows||!rows.length){el.innerHTML='No data found in cloud for account <strong>'+cfg.account+'</strong>';el.style.color='var(--ca)';return;}
    var payload=rows[0].payload||{};
    var lastDevice=payload.lastPushDevice||'unknown device';
    var lastTs=payload.lastPushTs||rows[0].updated_at||null;
    var ago=sbTimeAgo(lastTs);
    var localTs=payload.ts||null;
    var thisDevice=getDeviceName()||'this device';
    el.innerHTML=
      '<span style="color:var(--cg)">&#10003; Cloud has data</span><br>'+
      'Last pushed by: <strong style="color:var(--text)">'+lastDevice+'</strong>'+(payload.lastPushDeviceId?' <span class="dim-9">['+payload.lastPushDeviceId+']</span>':'')+'<br>'+
      'When: <strong style="color:var(--text)">'+ago+'</strong>'+(lastTs?' ('+lastTs.slice(0,16).replace('T',' ')+'Z)':'')+'<br>'+
      'You are on: <strong style="color:var(--text)">'+thisDevice+'</strong>';
    el.style.color='var(--dim)';
    // Auto-recommend push or pull
    if(localTs&&lastTs){
      var localMs=new Date(localTs).getTime();
      var cloudMs=new Date(lastTs).getTime();
      var rec=localMs>cloudMs?
        '<br><span style="color:var(--cg)">&#8593; Recommend: PUSH (your local is newer)</span>':
        '<br><span style="color:var(--cc)">&#8595; Recommend: PULL (cloud is newer)</span>';
      el.innerHTML+=rec;
    }
  }catch(e){
    el.textContent='Error: '+e.message;
    el.style.color='var(--cr)';
  }
}

function sbModalConfirm(choice){
  var c=choice||_sbModalChoice;
  if(!c)return;
  if(c==='push')sbPush();
  else if(c==='pull')sbPull();
}

function sbPushTopbar(){sbShowModal();}
function sbPullTopbar(){sbShowModal();}


function sbStripLocalSettings(settingsStr){
  var LOCAL_ONLY=['compact','slimScreen','iconMode','minimalMode','singleCol','crt','vignette','bgVisuals','bgVisualSinSin','starfield','cardEntrance','scrollGlow','bigBorders','textGlow','scrollTrail','largeText','extraLargeText','magnetMode','noGoogleFonts','letterNav'];
  try{
    var s=JSON.parse(settingsStr||'{}');
    LOCAL_ONLY.forEach(function(k){delete s[k];});
    return JSON.stringify(s);
  }catch(e){return settingsStr;}
}

async function sbPush(){
  var cfg=sbGetConfig();
  if(!cfg.url||!cfg.key||!cfg.account){
    sbSetStatus('Fill in URL, key and account name first','err');
    return;
  }
  var pushBtn=document.querySelector('[onclick="sbPush()"]');
  if(pushBtn){pushBtn.disabled=true;pushBtn.textContent='PUSHING...';}
  sbSetStatus('Connecting to Supabase...','working');
  try{
    var payload=snapshotData();
    localStorage.removeItem('dash_cloud_meta'); // invalidate cache on push
    payload.lastPushDevice=getDeviceName();
    payload.lastPushDeviceId=getSyncDeviceId();
    payload.lastPushTs=new Date().toISOString();
    var endpoint=cfg.url.replace(/\/+$/,'')+'/rest/v1/dashboard_data';
    var readEndpoint=cfg.url.replace(/\/+$/,'')+'/rest/v1/dashboard_data?account=eq.'+encodeURIComponent(cfg.account)+'&select=payload&limit=1';
    try{
      var readRes=await fetch(readEndpoint,{
        headers:{
          'apikey':cfg.key,
          'Authorization':'Bearer '+cfg.key
        }
      });
      if(readRes.ok){
        var rows=await readRes.json();
        if(rows&&rows.length&&rows[0].payload){
          payload=mergeSnapshots(payload,rows[0].payload);
          // Also union syncLogAll from cloud so all devices stay in sync
          var _cloudLog=(rows[0].payload&&rows[0].payload.syncLogAll)||[];
          var _localLog=lsGet('dash_sync_log_all',[]);
          var _logMap={};
          _cloudLog.concat(_localLog).forEach(function(e){
            var k=(e.ts||'')+'|'+(e.device||'');
            if(!_logMap[k])_logMap[k]=e;
          });
          payload.syncLogAll=Object.values(_logMap).sort(function(a,b){return b.ts>a.ts?1:-1;}).slice(0,20);
        }
      }
    }catch(_mergeReadErr){}
    var res=await fetch(endpoint,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':cfg.key,
        'Authorization':'Bearer '+cfg.key,
        'Prefer':'resolution=merge-duplicates'
      },
      body:JSON.stringify({account:cfg.account,payload:payload})
    });
    if(res.ok||res.status===200||res.status===201){
      restoreSnapshot(payload);
      sbSetStatus('Push successful — data saved to cloud','ok');
      blPushToSupabase(); // push button log to separate table
      sbAddLog('PUSH ↑',true,'Account: '+cfg.account);
      saveSyncLog('PUSH',getDeviceName(),new Date().toISOString());
      if(typeof confetti==='function'){
        confetti(window.innerWidth/2,60,'#00ff88');
        setTimeout(function(){confetti(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.5,'#00ff88');},120);
        setTimeout(function(){confetti(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.5,'#ffcc00');},250);
        setTimeout(function(){confetti(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.5,'#00e5ff');},380);
      }
      setTimeout(function(){sbHideModal();},5000);
    } else {
      var body='';
      try{var j=await res.json();body=j.message||j.hint||JSON.stringify(j);}catch(e2){try{body=await res.text();}catch(e3){body='(no body)';}}
      sbSetStatus('Push failed: HTTP '+res.status+' — '+body.slice(0,120),'err');
      sbAddLog('PUSH ↑',false,'HTTP '+res.status+': '+body.slice(0,80));
    }
  } catch(e){
    var msg=e.message||String(e);
    sbSetStatus('Push error: '+msg,'err');
    sbAddLog('PUSH ↑',false,msg.slice(0,80));
  }
  if(pushBtn){pushBtn.disabled=false;pushBtn.innerHTML='&#8593; PUSH TO CLOUD';}
}

function sbAnimBtn(type){
  var btn=document.getElementById('sb-'+type+'-btn');
  if(!btn)return;
  btn.classList.remove('animating-push','animating-pull');
  void btn.offsetWidth;
  btn.classList.add('animating-'+type);
  var ripple=document.createElement('span');
  ripple.className='sb-ripple';
  ripple.style.top='50%';
  ripple.style.left='50%';
  btn.appendChild(ripple);
  setTimeout(function(){try{ripple.remove();}catch(e){}},600);
  setTimeout(function(){btn.classList.remove('animating-push','animating-pull');},600);
}

async function sbPull(){
  var cfg=sbGetConfig();
  if(!cfg.url||!cfg.key||!cfg.account){
    sbSetStatus('Fill in URL, key and account name first','err');
    return;
  }
  var pullBtn=document.querySelector('[onclick="sbPull()"]');
  if(pullBtn){pullBtn.disabled=true;pullBtn.textContent='PULLING...';}
  sbSetStatus('Fetching from Supabase...','working');
  try{
    var endpoint=cfg.url.replace(/\/+$/,'')+'/rest/v1/dashboard_data?account=eq.'+encodeURIComponent(cfg.account)+'&select=payload&limit=1';
    var res=await fetch(endpoint,{
      headers:{
        'apikey':cfg.key,
        'Authorization':'Bearer '+cfg.key
      }
    });
    if(!res.ok){
      var body='';
      try{var j=await res.json();body=j.message||j.hint||JSON.stringify(j);}catch(e2){try{body=await res.text();}catch(e3){body='(no body)';}}
      sbSetStatus('Pull failed: HTTP '+res.status+' — '+body.slice(0,120),'err');
      sbAddLog('PULL ↓',false,'HTTP '+res.status+': '+body.slice(0,80));
    } else {
      var data=await res.json();
      if(!data||!data.length){
        sbSetStatus('No data found for account "'+cfg.account+'" — push first or check account name','err');
        sbAddLog('PULL ↓',false,'No rows for account: '+cfg.account);
      } else if(!data[0].payload){
        sbSetStatus('Row found but payload is empty — data may be corrupted','err');
        sbAddLog('PULL ↓',false,'Empty payload');
      } else {
        // Use cloud as authoritative base — don't let local ts override it
        // Only preserve local-only additions (todos/notes created since last push)
        var cloudPayload=data[0].payload;
        var localSnap=snapshotData();
        // Carefully merge only append-only arrays — cloud wins everything else
        var safePayload=Object.assign({},cloudPayload);
        safePayload.todos=mergeItemArrays(localSnap.todos,cloudPayload.todos,normalizeTodoItem);
        safePayload.notes=mergeItemArrays(localSnap.notes,cloudPayload.notes,normalizeNoteItem);
        safePayload.dlData=mergeById(localSnap.dlData,cloudPayload.dlData,'id');
        safePayload.wrData=mergeById(localSnap.wrData,cloudPayload.wrData,'week');
        safePayload.mlData=mergeById(localSnap.mlData,cloudPayload.mlData,'id'); // mood has multiple entries/day
        safePayload.pomoHistLog=mergePomoHistLog(localSnap.pomoHistLog,cloudPayload.pomoHistLog);
        // ptData: union by date, cloud wins per-date conflicts
        safePayload.ptData=mergePtData(localSnap.ptData,cloudPayload.ptData);
        safePayload.wmData=mergeWmData(localSnap.wmData,cloudPayload.wmData);
        safePayload.wlData=mergeById(localSnap.wlData||[],cloudPayload.wlData||[],'id');
        if(cloudPayload.gratData)safePayload.gratData=cloudPayload.gratData;
        if(cloudPayload.duaState)safePayload.duaState=cloudPayload.duaState;
        if(cloudPayload.akhiraData)safePayload.akhiraData=cloudPayload.akhiraData;
        if(cloudPayload.rentData)safePayload.rentData=cloudPayload.rentData;
        if(cloudPayload.cdData)safePayload.cdData=cloudPayload.cdData;
        if(cloudPayload.qcState)safePayload.qcState=cloudPayload.qcState;
        // dbData: cloud wins if same date, else keep local
        if(cloudPayload.dbData&&cloudPayload.dbData.date===localSnap.dbData&&localSnap.dbData.date){safePayload.dbData=cloudPayload.dbData;}else if(cloudPayload.dbData){safePayload.dbData=cloudPayload.dbData;}
        // Merge syncLogAll from cloud with local
        if(cloudPayload.syncLogAll&&Array.isArray(cloudPayload.syncLogAll)){
          var _cLog=cloudPayload.syncLogAll;
          var _lLog=lsGet('dash_sync_log_all',[]);
          var _lMap={};
          _cLog.concat(_lLog).forEach(function(e){var k=(e.ts||'')+'|'+(e.device||'');if(!_lMap[k])_lMap[k]=e;});
          safePayload.syncLogAll=Object.values(_lMap).sort(function(a,b){return b.ts>a.ts?1:-1;}).slice(0,20);
        }
        var lastDev=cloudPayload.lastPushDevice;
        var lastTs=cloudPayload.lastPushTs;
        restoreSnapshot(safePayload);
        var devInfo=lastDev?' · Last pushed by: '+lastDev+(lastTs?' at '+lastTs.slice(0,16).replace('T',' '):''):'';
        saveSyncLog('PULL',getDeviceName(),new Date().toISOString());
        sbSetStatus('Pull successful! Merged.'+devInfo+' Reloading...','ok');
        sbAddLog('PULL ↓',true,'Account: '+cfg.account);
        if(typeof confetti==='function'){
          confetti(window.innerWidth/2,60,'#00e5ff');
          setTimeout(function(){confetti(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.5,'#00e5ff');},120);
          setTimeout(function(){confetti(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.5,'#00ff88');},250);
          setTimeout(function(){confetti(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.5,'#ffcc00');},380);
        }
        setTimeout(function(){location.reload();},2000);
      }
    }
  } catch(e){
    var msg=e.message||String(e);
    // Network errors often mean CORS or wrong URL
    if(msg.toLowerCase().includes('fetch')||msg.toLowerCase().includes('network')){
      msg='Network error — check your Project URL is correct and Supabase is reachable';
    }
    sbSetStatus('Pull error: '+msg,'err');
    sbAddLog('PULL ↓',false,msg.slice(0,80));
  }
  if(pullBtn){pullBtn.disabled=false;pullBtn.innerHTML='&#8595; PULL FROM CLOUD';}
}

// Load config when supabase or data section opens
(function(){
  var origToggle=window.toggleSection;
  window.toggleSection=function(key){
    if(origToggle)origToggle(key);
    if(key==='supabase'||key==='data')setTimeout(sbLoadConfig,50);
  };
  setTimeout(sbLoadConfig,300);
})();


//  POMODORO 
var pomoState={
  running:false,
  mode:'work',
  totalSecs:25*60,
  remainSecs:25*60,
  sessions:0,
  sessionLog:[],
  interval:null
};
// Load day data after all scripts load
window.addEventListener('load',function(){if(typeof pomoLoadDay==='function')pomoLoadDay();});

// Save pomo state when page hides or closes — ensures trail persists
document.addEventListener('visibilitychange',function(){
  if(document.hidden)pomoSaveDay(!!pomoState.running);
});
window.addEventListener('beforeunload',function(){
  pomoSaveDay(!!pomoState.running);
});
window.addEventListener('pagehide',function(){
  pomoSaveDay(!!pomoState.running);
});

function pomoSaveSessions(){
  pomoSaveDay(false);
}

function pomoFmt(secs){
  var m=Math.floor(secs/60),s=secs%60;
  return (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
}




// Restart jiggle animations whenever new notice elements appear
setInterval(triggerJiggles, 800);



// ── BIG CATEGORIES MODE ──



function bigCatRestoreAll(){
  // Move all tiles back to #grid
  var grid=document.getElementById('grid');
  if(!grid)return;
  document.querySelectorAll('[data-bigcat-slot]').forEach(function(slot){
    var tile=slot.firstElementChild;
    if(tile&&tile.dataset.id)grid.appendChild(tile);
  });
}

window._dbgCheckpoints['jua_data_start']=true;
// ── JUZ AMMA UNDERSTAND ──
window._dbgCheckpoints['jua_data_assign']=true;
var JUA_DATA=[{"order":78,"surah":"An-Naba","meaning":"The Tidings","key_points":["Confirms the reality of the Day of Judgment.","Highlights the signs of Allah’s power in nature (mountains, Earth, sky).","Describes the rewards for the righteous in Paradise.","Warns of the consequences for those who deny the afterlife."]},{"order":79,"surah":"An-Nazi'at","meaning":"Those Who Drag Forth","key_points":["Describes the soul being taken at the time of death.","Recounts the story of Prophet Musa and Pharaoh as a warning.","Emphasizes that only Allah knows the exact timing of the Last Hour.","Contrasts the fate of the arrogant with those who fear Allah."]},{"order":80,"surah":"Abasa","meaning":"He Frowned","key_points":["Gentle correction to the Prophet regarding priority given to seekers of truth.","Reminds humanity of their humble origins from a drop of fluid.","Lists Allah’s blessings in providing food and vegetation.","Describes the chaos of the Day of Judgment where families flee from each other."]},{"order":81,"surah":"At-Takwir","meaning":"The Overthrowing","key_points":["Vividly describes the cosmic end of the world (stars falling, sun darkening).","Mentions the accountability for the 'buried alive' female infant.","Defends the integrity of the Quran as a message delivered by Angel Jibril.","Affirms that the Quran is a reminder for all of humanity."]},{"order":82,"surah":"Al-Infitar","meaning":"The Cleaving Asunder","key_points":["Describes the sky splitting and the graves being overturned.","Asks man what has deceived him regarding his Generous Lord.","Mentions the recording angels (Kiraman Katibin) who note every deed.","States that on the Last Day, no soul will have power over another."]},{"order":83,"surah":"Al-Mutaffifin","meaning":"The Defrauders","key_points":["Condemns those who give less in weight and measure (dishonesty in trade).","Defines 'Sijjin' as the register of the wicked.","Defines 'Illiyyun' as the register of the righteous.","Describes the mockery the believers faced and how the tables will turn."]},{"order":84,"surah":"Al-Inshiqaq","meaning":"The Sundering","key_points":["Describes the Earth being flattened and 'throwing out' its contents.","Explains that everyone is laboring toward a meeting with their Lord.","Contrasts those given their record in the right hand vs. behind their back.","Encourages prostration and submission to Allah’s word."]},{"order":85,"surah":"Al-Buruj","meaning":"The Mansions of the Stars","key_points":["Recounts the story of the People of the Ditch (martyrs of faith).","Assures that Allah witnesses all things, even when justice seems delayed.","Warns of the punishment for those who persecute believers.","Affirms the preservation of the Quran in the 'Guarded Tablet'."]},{"order":86,"surah":"At-Tariq","meaning":"The Night-Comer","key_points":["Points to the piercing star as a sign of divine oversight.","Reflects on the creation of man to prove that resurrection is easy for Allah.","States that on Judgment Day, all secrets will be laid bare.","Describes the Quran as a decisive word, not a matter for jest."]},{"order":87,"surah":"Al-A'la","meaning":"The Most High","key_points":["Commands the glorification of Allah, the Creator and Proportioner.","Promises the Prophet that he will not forget the revelation (except as Allah wills).","Emphasizes that success comes to those who purify their souls.","Notes that these teachings were also in the scriptures of Ibrahim and Musa."]},{"order":88,"surah":"Al-Ghashiyah","meaning":"The Overwhelming Event","key_points":["Describes the faces of the burdened vs. the joyful on Judgment Day.","Details the comforts of Paradise (running springs, raised couches).","Invites reflection on camels, the sky, mountains, and the Earth.","Reminds the Prophet that his role is to remind, not to manage people's hearts."]},{"order":89,"surah":"Al-Fajr","meaning":"The Dawn","key_points":["Swears by the dawn and the ten nights (of Dhul-Hijjah).","Mentions the destruction of powerful past nations like 'Ad and Thamud.","Critiques the human tendency to be greedy and neglect orphans.","Addresses the 'soul at peace' (An-Nafs al-Mutma'innah) with a call to enter Paradise."]},{"order":90,"surah":"Al-Balad","meaning":"The City","key_points":["Highlights that man was created for a life of struggle and test.","Lists the 'steep path' of virtue: freeing slaves and feeding the hungry.","Critiques those who brag about their wealth while ignoring the needy.","Identifies the believers as the 'Companions of the Right'."]},{"order":91,"surah":"Ash-Shams","meaning":"The Sun","key_points":["Swears by various celestial objects to emphasize the soul’s potential.","Teaches that success is achieved by purifying the soul (Tazkiyah).","Teaches that failure comes from corrupting the soul.","Uses the story of the She-Camel and Thamud as a warning against rebellion."]},{"order":92,"surah":"Al-Layl","meaning":"The Night","key_points":["Contrasts the paths of the generous believer and the stingy denier.","Explains that Allah makes the path to ease easy for the righteous.","Warns that wealth will not benefit a person once they perish.","Assures that those who give for the sake of Allah will be satisfied."]},{"order":93,"surah":"Ad-Duha","meaning":"The Morning Hours","key_points":["Consoles the Prophet during a period when revelation had paused.","Assures that the hereafter is better than the present life.","Reminds the Prophet of Allah’s care for him when he was an orphan.","Commands kindness to the needy and proclaiming Allah's favors."]},{"order":94,"surah":"Ash-Sharh","meaning":"The Expansion","key_points":["Speaks of Allah 'opening the chest' of the Prophet for guidance.","Mentions the removal of the heavy burden of anxiety/sin.","Repeats the famous promise: 'With every hardship, there is ease.'","Encourages turning to Allah in worship once worldly tasks are finished."]},{"order":95,"surah":"At-Tin","meaning":"The Fig","key_points":["Swears by the fig, the olive, Mount Sinai, and the city of Makkah.","States that man was created in the 'best of molds'.","Warns that man can fall to the 'lowest of the low' without faith.","Affirms Allah as the Most Just of all judges."]},{"order":96,"surah":"Al-Alaq","meaning":"The Clot","key_points":["Contains the first five verses revealed to the Prophet (Read!).","Emphasizes the importance of seeking knowledge and the pen.","Warns against the arrogance of man who thinks he is self-sufficient.","Condemns those who try to stop others from praying."]},{"order":97,"surah":"Al-Qadr","meaning":"The Power/Decree","key_points":["Commemorates the night the Quran was first sent down.","States that Laylat al-Qadr is better than a thousand months.","Mentions the descent of angels and the Spirit (Jibril).","Describes the night as one of peace until the break of dawn."]},{"order":98,"surah":"Al-Bayyinah","meaning":"The Clear Evidence","key_points":["Explains that people of the book needed clear evidence to change.","Defines the 'straight religion' as sincere worship, prayer, and charity.","Labels those who reject truth as the 'worst of creatures'.","Labels the righteous believers as the 'best of creatures'."]},{"order":99,"surah":"Al-Zalzalah","meaning":"The Earthquake","key_points":["Describes the final, violent shaking of the Earth.","States that the Earth will 'speak' and testify about human actions.","Teaches that people will see their deeds in the smallest detail.","Emphasizes the weight of an atom’s worth of good or evil."]},{"order":100,"surah":"Al-Adiyat","meaning":"The Chargers","key_points":["Uses the imagery of war horses to describe human intensity.","Critiques man for being ungrateful to his Lord.","Points out man's intense love for material wealth.","Reminds that what is hidden in the hearts will be made known."]},{"order":101,"surah":"Al-Qari'ah","meaning":"The Striking Hour","key_points":["Describes the Day of Judgment making people like scattered moths.","Mentions the mountains becoming like fluffed wool.","Introduces the concept of the 'Heavy Scales' for good deeds.","Warns of the 'Hawiyah' (a bottomless pit of fire) for the light scales."]},{"order":102,"surah":"At-Takathur","meaning":"Competition in Increase","key_points":["Warns that the distraction of gaining wealth lasts until death.","Tells humans that they will eventually see the 'certainty' of the fire.","Reminds that everyone will be questioned about the blessings they enjoyed.","Teaches that materialism blinds people to the purpose of life."]},{"order":103,"surah":"Al-Asr","meaning":"The Declining Day/Time","key_points":["Swears by time to show that humanity is in a state of loss.","Identifies the four traits of success: Faith, Good Deeds, Truth, and Patience.","Teaches the necessity of communal encouragement toward righteousness.","Summarizes the entire philosophy of life in three short verses."]},{"order":104,"surah":"Al-Humazah","meaning":"The Scorner","key_points":["Condemns backbiting, slandering, and mocking others.","Critiques the hoarding of wealth as a false sense of immortality.","Describes 'Hutamah', the fire that reaches the hearts.","Warns that arrogance and gossip lead to spiritual and literal ruin."]},{"order":105,"surah":"Al-Fil","meaning":"The Elephant","key_points":["Recounts the historical event of Abrahah’s failed attack on the Kaaba.","Shows how Allah protects His sanctuary with the smallest of means (birds).","Reminds the Quraish of Allah’s favor and power over their enemies.","Demonstrates that no human plot can overcome Allah’s plan."]},{"order":106,"surah":"Quraish","meaning":"The Quraish","key_points":["Mentions the winter and summer trade caravans of the tribe.","Urges the Quraish to worship the Lord of the House (Kaaba).","Attributes their security and food to Allah's grace.","Teaches that economic stability should lead to gratitude and worship."]},{"order":107,"surah":"Al-Ma'un","meaning":"Small Kindnesses","key_points":["Defines the 'denier of faith' as one who repels the orphan.","Critiques those who pray only to be seen (hypocrisy).","Condemns those who are heedless of their prayers.","Warns against those who withhold basic necessities/kindness from others."]},{"order":108,"surah":"Al-Kawthar","meaning":"The Abundance","key_points":["Consoles the Prophet by promising him the River of Abundance.","Commands the Prophet to pray and sacrifice for his Lord.","Declares that the enemies of the Prophet are the ones truly 'cut off'.","The shortest Surah, emphasizing quality of message over length."]},{"order":109,"surah":"Al-Kafirun","meaning":"The Disbelievers","key_points":["Establishes a clear distinction between Islamic monotheism and polytheism.","Refuses compromise in matters of core theology/worship.","Concludes with the famous principle: 'To you your religion, to me mine.'","Protects the integrity of the believer’s faith from external influence."]},{"order":110,"surah":"An-Nasr","meaning":"The Divine Support","key_points":["Foresees the final victory of Islam and the conquest of Makkah.","Describes people entering the religion in large crowds.","Instructs the Prophet to glorify Allah and seek forgiveness.","Signals the completion of the Prophet’s mission on Earth."]},{"order":111,"surah":"Al-Masad","meaning":"The Palm Fiber","key_points":["Condemns Abu Lahab for his active opposition to the Prophet.","Mentions that his wealth and children did not save him.","Condemns his wife for her role in spreading slander.","Serves as a historical miracle (it was revealed while they were still alive)."]},{"order":112,"surah":"Al-Ikhlas","meaning":"The Sincerity/Purity","key_points":["Defines the absolute Oneness of Allah (Tawhid).","States that Allah is Self-Sufficient and Eternal (As-Samad).","Negates the concept of Allah having parents or children.","Declares that nothing is comparable or equal to Him."]},{"order":113,"surah":"Al-Falaq","meaning":"The Daybreak","key_points":["A prayer for protection from the evil of created things.","Seeks refuge from the darkness of the night when it spreads.","Seeks protection from the evil of those who practice 'magic/knots'.","Seeks protection from the evil of the envious person."]},{"order":114,"surah":"An-Nas","meaning":"Mankind","key_points":["A prayer for protection from internal whispers (Waswas).","Recognizes Allah as the Lord, King, and God of mankind.","Identifies the whisperer as one who retreats (Al-Khannas).","Notes that whispers can come from both Jinns and Men."]}];
var juaState=lsGet('dash_jua',{});
if(!juaState.cards)juaState.cards={};
if(!juaState.section)juaState.section='facts';
if(!juaState._tab)juaState._tab='study';
if(!juaState._revealed)juaState._revealed=0;
function juaSave(){lsSet('dash_jua',juaState);}

var SECTIONS=[
  {id:'facts',label:'Facts',desc:'4 key points per surah'},
  {id:'meanings',label:'Meanings',desc:'Surah name meanings'},
  {id:'forward',label:'Order ►',desc:'78 → 114 sequence'},
  {id:'backward',label:'Order ◄',desc:'114 → 78 sequence'}
];
var JUA_INTERVALS={again:1,hard:2,good:5,easy:14};

// todayKey() → now uses global todayKey()
function juaCardKey(s,i){return s+'_'+i;}
function juaSectionUnlocked(s){
  if(s==='facts')return true;
  if(s==='meanings')return juaAllSeen('facts');
  if(s==='forward')return juaAllSeen('meanings');
  if(s==='backward')return juaAllSeen('forward');
  return false;
}
function juaAllSeen(s){
  var count=s==='forward'||s==='backward'?JUA_DATA.length-1:JUA_DATA.length;
  for(var i=0;i<count;i++){var k=juaCardKey(s,i);if(!(juaState.cards[k]&&juaState.cards[k].seen))return false;}
  return true;
}
function juaGetCard(s){
  var today=todayKey();
  var count=s==='forward'||s==='backward'?JUA_DATA.length-1:JUA_DATA.length;
  // Build shuffled index array so surahs come in random order
  var indices=[];for(var i=0;i<count;i++)indices.push(i);
  // Seeded shuffle based on today so order is consistent within a day
  var seed=today.split('-').join('')%997;
  for(var i=indices.length-1;i>0;i--){var j=(seed*31+i*17)%i|0;var t=indices[i];indices[i]=indices[j];indices[j]=t;}
  // Review cards first (due today)
  for(var n=0;n<indices.length;n++){var i=indices[n];var k=juaCardKey(s,i);var c=juaState.cards[k];if(c&&c.seen&&c.nextReview&&c.nextReview<=today)return i;}
  // Then new cards
  var newCount=0;
  for(var n=0;n<indices.length;n++){var i=indices[n];var k=juaCardKey(s,i);var c=juaState.cards[k];if(!c||!c.seen){if(newCount<5)return i;newCount++;}}
  return null;
}
function juaAnswerCard(s,idx,result){
  var k=juaCardKey(s,idx);
  if(!juaState.cards[k])juaState.cards[k]={};
  var c=juaState.cards[k];c.seen=true;
  var interval=JUA_INTERVALS[result]||1;
  if(c.interval&&result!=='again')interval=Math.round(c.interval*(result==='easy'?2.5:result==='good'?2:1.3));
  c.interval=interval;
  var next=new Date();next.setDate(next.getDate()+interval);
  c.nextReview=next.toISOString().slice(0,10);
  if(result==='again')c.lapses=(c.lapses||0)+1;
  juaState._revealed=0;juaState._factsIdx=null;
  juaSave();
}
function juaSectionProgress(s){
  var count=s==='forward'||s==='backward'?JUA_DATA.length-1:JUA_DATA.length;
  var seen=0,due=0,mastered=0,today=todayKey();
  for(var i=0;i<count;i++){var k=juaCardKey(s,i);var c=juaState.cards[k];if(c&&c.seen){seen++;if(c.interval>=14)mastered++;if(!c.nextReview||c.nextReview<=today)due++;}}
  return{seen:seen,total:count,due:due,mastered:mastered};
}
function juaRenderBadge(){
  var badge=document.getElementById('jua-badge');if(!badge)return;
  if(!juaState||!juaState.cards)return;
  var p=juaSectionProgress(juaState.section||'facts');
  if(p.due>0){badge.textContent=p.due+' due';badge.style.display='';}else badge.style.display='none';
}
window._dbgCheckpoints['jua_render_defined']=true;
function juaRender(){
  var el=document.getElementById('jua-body');
  if(!el)return;
  // Safety guards
  if(typeof JUA_DATA==='undefined'||!JUA_DATA){
    el.innerHTML='<div style="padding:20px;text-align:center;font-size:var(--t-base);color:var(--dim)">JUA_DATA not loaded yet. Retrying...</div>';
    setTimeout(juaRender,500);return;
  }
  if(!juaState)juaState={};
  if(!juaState.cards)juaState.cards={};
  if(!juaState.section)juaState.section='facts';
  if(!juaState._tab)juaState._tab='study';
  juaRenderBadge();
  var tab=juaState._tab||'study';
  var h='<div style="display:flex;gap:5px;margin-bottom:12px">';
  [{t:'study',l:'STUDY'},{t:'progress',l:'PROGRESS'},{t:'stats',l:'STATS'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-juatab="'+x.t+'" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid '+(a?'rgba(255,204,0,.5)':'var(--c-border)')+';color:'+(a?'var(--ca)':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';
  if(tab==='study')h+=juaRenderStudy();
  else if(tab==='progress')h+=juaRenderProgress();
  else h+=juaRenderStats();
  el.innerHTML=h;
  el.querySelectorAll('[data-juatab]').forEach(function(b){b.onclick=function(){juaState._tab=this.dataset.juatab;juaSave();safeHap(HAP.soft);juaRender();};});
  el.querySelectorAll('[data-juasec]').forEach(function(b){
    b.onclick=function(){
      var s=this.getAttribute('data-juasec');
      if(!juaSectionUnlocked(s))return;
      juaState.section=s;juaState._revealed=0;juaSave();safeHap(HAP.soft);juaRender();
    };
  });
  el.querySelectorAll('[data-juaans]').forEach(function(b){
    b.onclick=function(){
      var result=this.getAttribute('data-juaans');
      var idx=parseInt(this.getAttribute('data-juaidx'));
      juaAnswerCard(juaState.section,idx,result);
      safeHap(result==='again'?HAP.error:HAP.check);
      juaRender();
    };
  });
  var revBtn=el.querySelector('[data-juareveal]');
  if(revBtn)revBtn.onclick=function(){juaState._revealed=(juaState._revealed||0)+1;safeHap(HAP.soft);juaSave();juaRender();};
  el.querySelectorAll('[data-juachoice]').forEach(function(b){
    b.onclick=function(){
      var correct=this.getAttribute('data-juacorrect')==='1';
      var idx=parseInt(this.getAttribute('data-juaidx'));
      this.style.borderColor=correct?'var(--cg)':'var(--cr)';
      this.style.color=correct?'var(--cg)':'var(--cr)';
      if(!correct)el.querySelectorAll('[data-juachoice][data-juacorrect="1"]').forEach(function(c){c.style.borderColor='var(--cg)';c.style.color='var(--cg)';});
      safeHap(correct?HAP.check:HAP.error);
      juaAnswerCard(juaState.section,idx,correct?'good':'again');
      safeHap(correct?HAP.check:HAP.error);
      if(correct)setTimeout(function(){juaRender();},600);
      else{var nb=document.createElement('button');nb.textContent='NEXT →';nb.style.cssText='width:100%;margin-top:8px;padding:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.2);color:var(--text);font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:2px';nb.onclick=function(){juaRender();};el.appendChild(nb);}
    };
  });
}
function juaRenderStudy(){
  var sec=juaState.section||'facts';
  var h='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">';
  SECTIONS.forEach(function(s){
    var active=sec===s.id,locked=!juaSectionUnlocked(s.id);
    var col=active?'var(--ca)':locked?'rgba(255,255,255,.2)':'var(--dim)';
    var border=active?'rgba(255,204,0,.5)':locked?'rgba(255,255,255,.08)':'var(--c-faint)';
    h+='<span data-juasec="'+s.id+'" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid '+border+';color:'+col+';cursor:'+(locked?'default':'pointer')+';letter-spacing:1px">'+(locked?'?? ':'')+s.label+'</span>';
  });
  h+='</div>';
  if(!juaSectionUnlocked(sec)){
    var prev=SECTIONS[SECTIONS.findIndex(function(s){return s.id===sec;})-1];
    return h+'<div style="padding:20px;text-align:center;border:1px solid var(--c-border)"><div style="font-size:var(--t-body);margin-bottom:8px">??</div><div class="text-12">Locked</div><div class="dim-10">Complete '+prev.label+' first</div></div>';
  }
  var idx=juaGetCard(sec);
  if(idx===null)return h+'<div style="padding:20px;text-align:center;border:1px solid rgba(255,204,0,.15)"><div class="icon-lg">✓</div><div style="font-size:var(--t-lg);color:var(--ca)">All done for today!</div><div class="dim-10">Come back tomorrow</div></div>';
  var surah=JUA_DATA[idx];
  var k=juaCardKey(sec,idx);
  var card=juaState.cards[k]||{};
  var isReview=!!(card.seen&&card.nextReview);
  h+='<div style="font-size:var(--t-xs);color:var(--dim);margin-bottom:10px;display:flex;gap:8px">';
  h+='<span style="color:var(--ca)">'+SECTIONS.find(function(s){return s.id===sec;}).label+'</span>';
  h+=(isReview?'<span style="color:rgba(80,250,123,.6)">REVIEW</span>':'<span style="color:rgba(255,184,108,.6)">NEW</span>');
  h+='</div>';
  if(sec==='facts')return h+juaRenderFacts(surah,idx);
  if(sec==='meanings')return h+juaRenderMeanings(surah,idx);
  return h+juaRenderOrder(surah,idx,sec);
}
function juaCloze(text, seed){
  // Blank ~30% of meaningful words, max 3 blanks per sentence
  var stopwords=['a','an','the','and','or','but','of','in','on','at','to','for',
    'is','are','was','were','be','been','being','it','its','that','this','which',
    'with','as','by','from','into','through','during','before','after','about',
    'against','between','into','through','he','she','they','we','you','who','what'];
  var words=text.split(' ');
  var rng=function(i){return ((seed*31+i*17)%100)/100;};
  var blanked=0;
  var maxBlanks=Math.max(1,Math.min(3,Math.floor(words.length*0.25)));
  return words.map(function(w,i){
    var clean=w.replace(/[^a-zA-Z]/g,'').toLowerCase();
    if(clean.length<=2||stopwords.indexOf(clean)>=0)return w;
    if(blanked>=maxBlanks)return w;
    if(rng(i)<0.3){blanked++;return '<span style="color:rgba(255,204,0,.25);border-bottom:1px solid rgba(255,204,0,.3);min-width:40px;display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>';}
    return w;
  }).join(' ');
}

function juaRenderFacts(surah,idx){
  var revealed=juaState._revealed||0;
  // Use idx as seed so blanks are consistent per card per session
  var seed=idx*7+surah.order;
  var h='<div style="border:1px solid var(--c-gold-dim);padding:14px;margin-bottom:10px">';
  h+='<div style="font-size:var(--t-title);color:var(--ca);font-family:monospace;margin-bottom:4px">'+surah.surah+'</div>';
  h+='<div style="font-size:var(--t-sm);color:var(--dim);margin-bottom:12px">Surah '+surah.order+'</div>';
  if(revealed===0){
    // Show cloze version of point 1
    h+='<div style="font-size:var(--t-xs);color:rgba(255,204,0,.5);letter-spacing:1px;margin-bottom:6px">KEY POINT 1 — fill in the blanks:</div>';
    h+='<div style="font-size:var(--t-md);color:var(--text);line-height:1.9;margin-bottom:12px;padding:10px;border:1px solid rgba(255,204,0,.1);background:rgba(255,204,0,.03)">'+juaCloze(surah.key_points[0],seed)+'</div>';
    h+='<button data-juareveal="1" style="width:100%;padding:9px;background:transparent;border:1px solid rgba(255,204,0,.3);color:var(--ca);font-family:monospace;font-size:var(--t-sm);cursor:pointer;letter-spacing:2px">REVEAL FULL POINT 1</button>';
  } else {
    h+='<div class="mb-10">';
    for(var i=0;i<Math.min(revealed,surah.key_points.length);i++){
      var isLast=i===revealed-1;
      // Previous points shown complete; current point shown complete after reveal
      // Next point shown as cloze if not yet revealed
      h+='<div style="padding:8px 0;border-bottom:1px solid var(--c-ghost)">';
      h+='<div style="display:flex;gap:8px;align-items:flex-start">';
      h+='<span style="color:var(--ca);flex-shrink:0;font-size:var(--t-base)">'+(i+1)+'.</span>';
      h+='<div style="font-size:var(--t-md);color:var(--text);line-height:1.6">'+surah.key_points[i]+'</div>';
      h+='</div>';
      h+='</div>';
    }
    h+='</div>';
    if(revealed<surah.key_points.length){
      // Show cloze of next point
      h+='<div style="font-size:var(--t-xs);color:rgba(255,204,0,.5);letter-spacing:1px;margin-bottom:6px">KEY POINT '+(revealed+1)+' — fill in the blanks:</div>';
      h+='<div style="font-size:var(--t-md);color:var(--text);line-height:1.9;margin-bottom:12px;padding:10px;border:1px solid rgba(255,204,0,.1);background:rgba(255,204,0,.03)">'+juaCloze(surah.key_points[revealed],seed+revealed)+'</div>';
      h+='<button data-juareveal="1" style="width:100%;padding:9px;background:transparent;border:1px solid rgba(255,204,0,.3);color:var(--ca);font-family:monospace;font-size:var(--t-sm);cursor:pointer;letter-spacing:2px">REVEAL POINT '+(revealed+1)+'</button>';
    } else {
      h+='<div style="display:flex;gap:8px;margin-top:12px">';
      h+='<button data-juaans="again" data-juaidx="'+idx+'" style="flex:1;padding:10px;background:transparent;border:1px solid rgba(255,68,68,.4);color:rgba(255,68,68,.8);font-family:monospace;font-size:var(--t-sm);cursor:pointer">✗ MISSED</button>';
      h+='<button data-juaans="good" data-juaidx="'+idx+'" style="flex:1;padding:10px;background:transparent;border:1px solid rgba(80,250,123,.4);color:rgba(80,250,123,.8);font-family:monospace;font-size:var(--t-sm);cursor:pointer">✓ GOT IT</button>';
      h+='</div>';
    }
  }
  return h+'</div>';
}
function juaRenderMeanings(surah,idx){
  var choices=[{text:surah.meaning,correct:true}];
  var others=JUA_DATA.filter(function(s){return s.order!==surah.order;}).slice().sort(function(){return Math.random()-.5;}).slice(0,3);
  others.forEach(function(s){choices.push({text:s.meaning,correct:false});});
  choices.sort(function(){return Math.random()-.5;});
  var h='<div style="border:1px solid var(--c-gold-dim);padding:14px">';
  h+='<div style="font-size:var(--t-base);color:var(--dim);margin-bottom:6px">What does this surah name mean?</div>';
  h+='<div style="font-size:var(--t-body);color:var(--ca);font-family:monospace;margin-bottom:4px">'+surah.surah+'</div>';
  h+='<div style="font-size:var(--t-sm);color:var(--dim);margin-bottom:12px">Surah '+surah.order+'</div>';
  choices.forEach(function(c){
    h+='<button data-juachoice="1" data-juacorrect="'+(c.correct?'1':'0')+'" data-juaidx="'+idx+'" style="width:100%;padding:10px;text-align:left;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--text);font-family:monospace;font-size:var(--t-base);cursor:pointer;margin-bottom:6px">'+c.text+'</button>';
  });
  return h+'</div>';
}
function juaRenderOrder(surah,idx,dir){
  var leftSurah=surah,correctSurah=JUA_DATA[idx+1],rightSurah=JUA_DATA[idx+2]||null;
  var answerSurah=dir==='forward'?correctSurah:leftSurah;
  var h='<div style="border:1px solid var(--c-gold-dim);padding:16px">';
  h+='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:12px">'+(dir==='forward'?'ORDER FORWARD ►':'◄ ORDER BACKWARD')+'</div>';
  h+='<div style="display:flex;align-items:center;gap:4px;margin-bottom:16px">';
  if(dir==='forward'){
    h+='<div class="text-center-flex"><div style="font-size:var(--t-md);color:var(--text);font-family:monospace">'+leftSurah.surah+'</div><div class="dim-9">('+leftSurah.order+')</div></div>';
    h+='<div style="color:var(--ca);font-size:var(--t-sub)">►</div>';
    h+='<div style="text-align:center;flex:1;padding:8px;border:2px solid rgba(255,204,0,.4);background:rgba(255,204,0,.06)"><div style="font-size:var(--t-sub);color:rgba(255,204,0,.4)">???</div></div>';
    if(rightSurah){h+='<div style="color:var(--ca);font-size:var(--t-sub)">►</div><div class="text-center-flex"><div style="font-size:var(--t-md);color:var(--text);font-family:monospace">'+rightSurah.surah+'</div><div class="dim-9">('+rightSurah.order+')</div></div>';}
  } else {
    h+='<div style="text-align:center;flex:1;padding:8px;border:2px solid rgba(255,204,0,.4);background:rgba(255,204,0,.06)"><div style="font-size:var(--t-sub);color:rgba(255,204,0,.4)">???</div></div>';
    h+='<div style="color:var(--ca);font-size:var(--t-sub)">◄</div>';
    h+='<div class="text-center-flex"><div style="font-size:var(--t-md);color:var(--text);font-family:monospace">'+correctSurah.surah+'</div><div class="dim-9">('+correctSurah.order+')</div></div>';
    if(rightSurah){h+='<div style="color:var(--ca);font-size:var(--t-sub)">◄</div><div class="text-center-flex"><div style="font-size:var(--t-md);color:var(--text);font-family:monospace">'+rightSurah.surah+'</div><div class="dim-9">('+rightSurah.order+')</div></div>';}
  }
  h+='</div>';
  var choices=[{text:answerSurah.surah+' ('+answerSurah.order+')',correct:true}];
  var nearby=JUA_DATA.filter(function(s){return s.order!==answerSurah.order&&Math.abs(s.order-answerSurah.order)<=5;}).slice().sort(function(){return Math.random()-.5;}).slice(0,3);
  if(nearby.length<3)JUA_DATA.filter(function(s){return s.order!==answerSurah.order;}).slice().sort(function(){return Math.random()-.5;}).slice(0,3-nearby.length).forEach(function(s){nearby.push(s);});
  nearby.forEach(function(s){choices.push({text:s.surah+' ('+s.order+')',correct:false});});
  choices.sort(function(){return Math.random()-.5;});
  choices.forEach(function(c){
    h+='<button data-juachoice="1" data-juacorrect="'+(c.correct?'1':'0')+'" data-juaidx="'+idx+'" style="width:100%;padding:10px;text-align:left;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--text);font-family:monospace;font-size:var(--t-base);cursor:pointer;margin-bottom:6px">'+c.text+'</button>';
  });
  return h+'</div>';
}
function juaRenderProgress(){
  var h='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:12px">SECTION PROGRESS</div>';
  SECTIONS.forEach(function(sec,si){
    var p=juaSectionProgress(sec.id),locked=!juaSectionUnlocked(sec.id);
    var pct=p.total?Math.round(p.seen/p.total*100):0;
    var col=locked?'rgba(255,255,255,.2)':'var(--ca)';
    h+='<div class="mb-14">';
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="font-size:var(--t-base);color:'+col+'">'+(si+1)+'. '+sec.label+'</span>';
    if(locked)h+='<span style="font-size:var(--t-xs);color:rgba(255,255,255,.25)">??</span>';
    else if(p.seen===p.total&&p.total>0)h+='<span style="font-size:var(--t-xs);color:rgba(80,250,123,.6)">ALL SEEN</span>';
    h+='<span style="margin-left:auto;font-size:var(--t-xs);color:var(--dim)">'+p.seen+'/'+p.total+'</span></div>';
    h+='<div style="height:6px;background:var(--c-ghost);margin-bottom:4px"><div style="height:100%;width:'+pct+'%;background:'+(locked?'var(--c-border)':'var(--ca)')+';transition:width .3s"></div></div>';
    h+='<div class="dim-9">'+p.due+' due today · '+p.mastered+' mastered</div>';
    h+='</div>';
  });
  return h;
}
function juaRenderStats(){
  var totalSeen=0,totalMastered=0,totalDue=0;
  SECTIONS.forEach(function(s){var p=juaSectionProgress(s.id);totalSeen+=p.seen;totalMastered+=p.mastered;totalDue+=p.due;});
  var h='<div class="grid-2col">';
  [{l:'Cards Seen',v:totalSeen},{l:'Mastered',v:totalMastered},{l:'Due Today',v:totalDue},{l:'Total Cards',v:JUA_DATA.length*2}].forEach(function(stat){
    h+='<div style="padding:10px;border:1px solid rgba(255,255,255,.08);text-align:center"><div style="font-size:var(--t-h2);color:var(--ca);font-family:monospace">'+stat.v+'</div><div class="dim-9">'+stat.l+'</div></div>';
  });
  return h+'</div>';
}
window._dbgCheckpoints['jua_settimeout']=true;
setTimeout(function(){juaRender();},500);
// ── END JUZ AMMA UNDERSTAND ──

window._dbgCheckpoints['qt_before_data']=true;
// ── QURAN TAFSIR ──
var QT_DATA=[{"id_number":1,"verse":"1:1","surah_name":"Al-Fatiha","quran_text":"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ","english_meaning":"In the name of Allah, the Entirely Merciful, the Especially Merciful.","verse_explanation":"The 'Basmalah' serves as the gateway to the Quran and every action for a believer. It establishes that all existence begins with the mercy of the Creator.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"He emphasizes that starting with the name of Allah is a means of seeking blessing (barakah) and recognition that He is the only One truly worthy of worship."},{"scholar":"Al-Qurtubi","opinion":"He delves into the linguistic roots, noting that Ar-Rahman refers to a general mercy for all creation, while Ar-Rahim is a specific, intimate mercy reserved for the believers."},{"scholar":"Muhammad Asad","opinion":"He views it as a psychological framework, suggesting that by reciting this, the human mind aligns itself with the primary attribute of the Divine: Infinite Grace."}]},{"id_number":2,"verse":"1:2","surah_name":"Al-Fatiha","quran_text":"الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ","english_meaning":"[All] praise is [due] to Allah, Lord of the worlds.","verse_explanation":"This verse establishes the foundational relationship between the Creator and the created: one of gratitude and absolute sovereignty.","scholars_opinions":[{"scholar":"Al-Tabari","opinion":"Argues that 'Hamd' is more than just praise; it is a specific type of gratitude directed at the benefactor for favors granted by His own will."},{"scholar":"Fakhr al-Din al-Razi","opinion":"Explains 'Al-Alamin' (the worlds) as a proof of the infinite nature of God's creation, suggesting there are thousands of realms beyond human perception."},{"scholar":"Ibn al-Qayyim","opinion":"Focuses on the heart's involvement, stating that Hamd is the 'breath of the soul,' and without it, the spiritual life of a human ceases to function."}]},{"id_number":3,"verse":"1:5","surah_name":"Al-Fatiha","quran_text":"إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ","english_meaning":"It is You we worship and You we ask for help.","verse_explanation":"This is the central pivot of the Quran, dividing the relationship into the duty of the slave (worship) and the promise of the Master (assistance).","scholars_opinions":[{"scholar":"Ibn Taymiyyah","opinion":"States that this verse cures two major spiritual diseases: showing off (Riya) through 'It is You we worship,' and arrogance (Kibr) through 'You we ask for help.'"},{"scholar":"Sayyid Qutb","opinion":"Views this as the ultimate declaration of independence; if a person truly relies only on God, they become free from the slavery of all worldly powers."},{"scholar":"Al-Ghazali","opinion":"Suggests that 'worship' is the external action, but 'seeking help' is the internal realization that no action is possible without Divine permission."}]},{"id_number":4,"verse":"1:6","surah_name":"Al-Fatiha","quran_text":"اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ","english_meaning":"Guide us to the straight path.","verse_explanation":"A perpetual prayer for clarity and consistency in a world of moral ambiguity.","scholars_opinions":[{"scholar":"Raghib al-Isfahani","opinion":"Notes that 'Hidayah' (guidance) here is not just knowing the path, but being granted the strength to actually walk upon it until the end."},{"scholar":"Al-Shawkani","opinion":"Defines the 'Straight Path' as the Quran itself, which acts as a rope between the heavens and the earth, unchanging and secure."},{"scholar":"Malik Bennabi","opinion":"Interprets this path as the 'social trajectory' of a civilization that remains balanced between spiritual values and material progress."}]},{"id_number":5,"verse":"2:153","surah_name":"Al-Baqarah","quran_text":"يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ","english_meaning":"O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.","verse_explanation":"Provides the two primary tools for navigating the trials of life: internal fortitude (patience) and external connection (prayer).","scholars_opinions":[{"scholar":"Al-Baghawi","opinion":"Explains that patience (Sabr) refers specifically to fasting or the restraint of the soul from desires, which prepares it for the discipline of prayer."},{"scholar":"Ibn Ajiba","opinion":"From a Sufi perspective, he argues that 'Allah is with the patient' implies a special 'Ma'iyyah' (presence) that brings tranquility amidst chaos."},{"scholar":"Nouman Ali Khan","opinion":"Highlights the linguistic placement of Sabr before Salah, suggesting that one needs mental resilience (patience) just to be able to focus in prayer."}]},{"id_number":6,"verse":"2:155","surah_name":"Al-Baqarah","quran_text":"وَلَنَبْلُوَنَّكُمْ بِشَيْءٍ مِنَ الْخَوْفِ وَالْجُوعِ وَنَقْصٍ مِنَ الْأَمْوَالِ وَالْأَنْفُسِ وَالثَّمَرَاتِ ۗ وَبَشِّرِ الصَّابِرِينَ","english_meaning":"And We will surely test you with something of fear and hunger and a loss of wealth and lives and fruits, but give good tidings to the patient.","verse_explanation":"An honest declaration that life is a series of tests designed to refine the human spirit.","scholars_opinions":[{"scholar":"Ibn Ashur","opinion":"Notes that the use of 'something' (bi-shay'in) implies that God never tests a soul beyond its capacity; it is only a small portion of what could be."},{"scholar":"Al-Jalalayn","opinion":"Emphasizes that these trials are a way to distinguish the sincere believer from the one who worships God only when things are easy."},{"scholar":"Tariq Ramadan","opinion":"Argues that these tests are not punishments, but 'opportunities for growth' that force humans to look inward and find their true source of strength."}]},{"id_number":7,"verse":"2:156","surah_name":"Al-Baqarah","quran_text":"الَّذِينَ إِذَا أَصَابَتْهُمْ مُصِيبَةٌ قَالُوا إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ","english_meaning":"Who, when disaster strikes them, say, 'Indeed we belong to Allah, and indeed to Him we will return.'","verse_explanation":"The ultimate mantra of detachment, shifting the focus from the loss to the Eternal Owner.","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"States that this phrase is a 'safety valve' for the heart, acknowledging that since we didn't own ourselves to begin with, the loss is merely a return of a trust."},{"scholar":"Saeed bin Jubayr","opinion":"Points out that this specific phrase was given to the Ummah of Muhammad as a mercy; previous nations did not have this specific verbal refuge during calamity."},{"scholar":"Hamza Yusuf","opinion":"Describes this as a 'metaphysical orientation,' where the soul recognizes its origin and its destination, rendering the middle (the disaster) manageable."}]},{"id_number":8,"verse":"2:186","surah_name":"Al-Baqarah","quran_text":"وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ","english_meaning":"And when My servants ask you concerning Me - indeed I am near. I respond to the invocation of the supplicant when he calls upon Me.","verse_explanation":"A deeply personal verse where God removes the intermediary to speak directly to the seeker.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"Notes the unique structure: usually, God says 'They ask you... Say (Qul).' Here, He omits 'Say' and answers directly, showing the lack of barriers in prayer."},{"scholar":"Al-Razi","opinion":"Explains 'Nearness' (Qurb) as an intellectual and spiritual closeness that transcends physical distance or space."},{"scholar":"Wahbah al-Zuhayli","opinion":"Emphasizes that the response of God is guaranteed, but it may take forms the human didn't expect, such as averting a future evil instead."}]},{"id_number":9,"verse":"2:216","surah_name":"Al-Baqarah","quran_text":"وَعَسَىٰ أَنْ تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَكُمْ ۖ وَعَسَىٰ أَنْ تُحِبُّوا شَيْئًا وَهُوَ شَرٌّ لَكُمْ","english_meaning":"But perhaps you hate a thing and it is good for you; and perhaps you love a thing and it is bad for you.","verse_explanation":"A lesson in Divine wisdom versus human limited perception.","scholars_opinions":[{"scholar":"Ibn al-Qayyim","opinion":"Suggests that if a believer truly understood how God manages their affairs, their heart would melt out of love for His hidden kindness."},{"scholar":"Al-Tabari","opinion":"Relates this to the context of struggle (Jihad), but generalizes it to all of life's occurrences where humans lack foresight."},{"scholar":"Muhammad Metwalli al-Sha'rawi","opinion":"Uses the analogy of a parent and a child: the parent denies the child candy (which they love) for their own health, representing God's 'positive denial.'"}]},{"id_number":10,"verse":"2:255","surah_name":"Al-Baqarah","quran_text":"اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ","english_meaning":"Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence. Neither drowsiness overtakes Him nor sleep.","verse_explanation":"Known as Ayat al-Kursi, this is the most powerful description of God's majesty and attributes in the Quran.","scholars_opinions":[{"scholar":"Al-Ghazali","opinion":"Focuses on 'Al-Qayyum' (The Self-Sustaining), explaining that every atom in the universe requires His constant attention to exist for even a millisecond."},{"scholar":"Ibn Taymiyyah","opinion":"Argues that this verse contains the 'Greatest Name' of Allah, which combines His life and His power over all creation."},{"scholar":"Abul A'la Maududi","opinion":"Views this as a complete refutation of all forms of shirk (polytheism), establishing a worldview where everything is dependent on one Will."}]},{"id_number":11,"verse":"2:256","surah_name":"Al-Baqarah","quran_text":"لَا إِكْرَاهَ فِي الدِّينِ ۖ قَدْ تَبَيَّنَ الرُّشْدُ مِنَ الْغَيِّ","english_meaning":"There shall be no compulsion in [acceptance of] the religion. The right course has become clear from the wrong.","verse_explanation":"Establishes the principle of religious freedom and the necessity of sincere, voluntary faith.","scholars_opinions":[{"scholar":"Ibn Abbas","opinion":"Reports that this was revealed when people tried to force their children into Islam, and God forbade it, as faith must come from the heart."},{"scholar":"Al-Zamakhshari","opinion":"Argues that since the proofs of truth are so clear, using force would be redundant and illogical; truth stands on its own merit."},{"scholar":"Yusuf al-Qaradawi","opinion":"Generalizes this as a human rights foundation, stating that Islam protects the sanctity of the human conscience above all."}]},{"id_number":12,"verse":"2:263","surah_name":"Al-Baqarah","quran_text":"قَوْلٌ مَعْرُوفٌ وَمَغْفِرَةٌ خَيْرٌ مِنْ صَدَقَةٍ يَتْبَعُهَا أَذًى","english_meaning":"Kind words and forgiveness are better than charity followed by injury.","verse_explanation":"Prioritizes the dignity of the recipient over the material value of the gift.","scholars_opinions":[{"scholar":"Al-Sadi","opinion":"Notes that a kind word heals the soul, while a hurtful charity breaks it; God is 'Ghani' (Rich), so He doesn't need our money if it comes with arrogance."},{"scholar":"Ibn Zayd","opinion":"Suggests that 'forgiveness' here means forgiving the beggar if they are persistent or rude, rather than reacting with anger."},{"scholar":"Malik bin Dinar","opinion":"Emphasized that the 'injury' (adha) mentioned can be as subtle as making the recipient feel inferior, which nullifies the spiritual reward."}]},{"id_number":13,"verse":"2:269","surah_name":"Al-Baqarah","quran_text":"يُؤْتِي الْحِكْمَةَ مَنْ يَشَاءُ ۚ وَمَنْ يُؤْتَ الْحِكْمَةَ فَقَدْ أُوتِيَ خَيْرًا كَثِيرًا","english_meaning":"He gives wisdom to whom He wills, and whoever has been given wisdom has certainly been given much good.","verse_explanation":"Differentiates between mere knowledge (information) and wisdom (the ability to apply knowledge correctly).","scholars_opinions":[{"scholar":"Mujahid ibn Jabr","opinion":"Defines wisdom (Hikmah) specifically as the understanding of the Quran and the ability to correctly interpret Divine laws."},{"scholar":"Al-Suyuti","opinion":"Describes it as 'acting upon knowledge,' stating that information without action is a burden, not wisdom."},{"scholar":"Muhammad Iqbal","opinion":"Sees Hikmah as the synthesis of 'Intellect' and 'Love,' allowing the human to master the material world while remaining spiritually grounded."}]},{"id_number":14,"verse":"2:284","surah_name":"Al-Baqarah","quran_text":"لِلَّهِ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ وَإِنْ تُبْدُوا مَا فِي أَنْفُسِكُمْ أَوْ تُخْفُوهُ يُحَاسِبْكُمْ بِهِ اللَّهُ","english_meaning":"To Allah belongs whatever is in the heavens and whatever is in the earth. Whether you show what is within yourselves or conceal it, Allah will bring you to account for it.","verse_explanation":"A reminder of God's omniscience, covering both the cosmos and the deepest secrets of the heart.","scholars_opinions":[{"scholar":"Aisha (RA)","opinion":"Clarified that this 'accountability' for thoughts refers to the distress or 'humm' (anxiety) a person feels for a bad thought, which acts as an expiation."},{"scholar":"Al-Tabari","opinion":"Explains that while God knows our thoughts, He only punishes for the 'intent' (Azm) to act, not the fleeting whispers (Waswasa)."},{"scholar":"Ja'far al-Sadiq","opinion":"Spiritualized this as a call to purify the 'Sirr' (inner secret), as the heart is the true throne where God's presence is felt."}]},{"id_number":15,"verse":"2:286","surah_name":"Al-Baqarah","quran_text":"لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ","english_meaning":"Allah does not charge a soul except [with that within] its capacity. It will have [the consequence of] what [good] it has gained, and it will bear [the consequence of] what [evil] it has earned.","verse_explanation":"The ultimate promise of Divine justice and psychological relief, ensuring that no one is overwhelmed by duty.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"Notes that this verse was revealed to ease the companions' fear of being judged for their thoughts (from verse 284), confirming God's leniency."},{"scholar":"Al-Qurtubi","opinion":"Explains the linguistic nuance between 'Kasabat' (gained easily) for good deeds and 'Iktasabat' (earned with effort) for sins, showing evil requires more exertion."},{"scholar":"Fazlur Rahman","opinion":"Interprets this as the foundation of 'Moral Responsibility'—man is only responsible for what he has the power to change."}]},{"id_number":16,"verse":"3:8","surah_name":"Ali 'Imran","quran_text":"رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً","english_meaning":"[Who say], 'Our Lord, let not our hearts deviate after You have guided us and grant us from Yourself mercy.'","verse_explanation":"A prayer of those grounded in knowledge, recognizing the fragility of the human heart.","scholars_opinions":[{"scholar":"Al-Baghawi","opinion":"Points out that 'deviation' refers to following ambiguous verses to cause fitnah (confusion), seeking mercy to stay firm on the clear truths."},{"scholar":"Umm Salama","opinion":"Narrated that the Prophet (PBUH) frequently made a similar prayer, stating that 'the heart is between two fingers of the Merciful; He turns it as He wills.'"},{"scholar":"Ibn Ashur","opinion":"Describes this as the 'Petition of the Intellectuals'—those who realize that intelligence alone cannot preserve faith; only God's grace can."}]},{"id_number":17,"verse":"3:31","surah_name":"Ali 'Imran","quran_text":"قُلْ إِنْ كُنْتُمْ تُحبُّونَ اللَّهَ فَاتَّبِعُونِي يُحْبِبْكُمُ اللَّهُ وَيَغْفِرْ لَكُمْ ذُنُوبَكُمْ","english_meaning":"Say, [O Muhammad], 'If you should love Allah, then follow me, [so] Allah will love you and forgive you your sins.'","verse_explanation":"Defines true love for God as action and imitation of the Prophetic model, rather than just emotional sentiment.","scholars_opinions":[{"scholar":"Hasan al-Basri","opinion":"Famously said: 'People claimed to love Allah, so He tested them with this verse.' It serves as the 'Verse of the Test.'"},{"scholar":"Al-Zamakhshari","opinion":"Highlights that the reward (God's love for us) is far greater than our initial claim (our love for God)."},{"scholar":"Ibn Qayyim","opinion":"Explains that following the Prophet is the 'fuel' for the fire of Divine Love; without it, the flame eventually dies out."}]},{"id_number":18,"verse":"3:139","surah_name":"Ali 'Imran","quran_text":"وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنْتُمُ الْأَعْلَوْنَ إِنْ كُنْتُمْ مُؤْمِنِينَ","english_meaning":"So do not weaken and do not grieve, and you will be superior if you are [true] believers.","verse_explanation":"Revealed after the setback of the Battle of Uhud to restore morale and provide a spiritual definition of 'superiority.'","scholars_opinions":[{"scholar":"Sayyid Qutb","opinion":"Argues that 'superiority' refers to a moral and spiritual high ground—even when physically defeated, the believer's values remain supreme."},{"scholar":"Al-Tabari","opinion":"Focuses on the prohibition of 'Wahn' (mental weakness) and 'Huzn' (excessive grief for the past), as both paralyze a person's future actions."},{"scholar":"Ibn Abbas","opinion":"Interpreted this as a promise of eventual victory, provided the internal condition of faith is purified."}]},{"id_number":19,"verse":"3:159","surah_name":"Ali 'Imran","quran_text":"فَبِمَا رَحْمَةٍ مِنَ اللَّهِ لِنْتَ لَهُمْ ۖ وَلَوْ كُنْتَ فَظًّا غَلِيظَ الْقَلْبِ لَانْفَضُّوا مِنْ حَوْلِكَ","english_meaning":"So by mercy from Allah, [O Muhammad], you were lenient with them. And if you had been rude [in speech] and harsh in heart, they would have disbanded from about you.","verse_explanation":"Highlights the importance of soft-heartedness and emotional intelligence in leadership and communication.","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"Stresses that if the Prophet himself needed to be gentle to keep people close, then ordinary leaders have an even greater obligation to avoid harshness."},{"scholar":"Fakhr al-Din al-Razi","opinion":"Connects 'Mercy' to the internal state and 'Lenience' to the external behavior, showing that one must flow from the other."},{"scholar":"Ali Gomaa","opinion":"Uses this verse to argue that the 'aesthetic of character' is a central pillar of Islamic دعوت (calling to the path), where beauty of soul is the main attractor."}]},{"id_number":20,"verse":"3:160","surah_name":"Ali 'Imran","quran_text":"إِنْ يَنْصُرْكُمُ اللَّهُ فَلَا غَالِبَ لَكُمْ ۖ وَإِنْ يَخْذُلْكُمْ فَمَنْ ذَا الَّذِي يَنْصُرُكُمْ مِنْ بَعْدِهِ","english_meaning":"If Allah should aid you, no one can overcome you; but if He should forsake you, who is there that can aid you after Him?","verse_explanation":"The ultimate statement of Tawakkul (reliance), shifting the source of victory from material causes to Divine will.","scholars_opinions":[{"scholar":"Ibn Ashur","opinion":"Points out the rhetorical question 'Who is there...?' serves to highlight the absolute powerlessness of creation when God withdraws His support."},{"scholar":"Al-Baghawi","opinion":"Defines 'forsaking' (khidhlan) as God leaving a person to their own self/ego, which is the greatest form of failure."},{"scholar":"Abul A'la Maududi","opinion":"Emphasizes that this verse is meant to purge the heart of fear of enemies and replace it with a singular fear of losing God's favor."}]},{"id_number":21,"verse":"3:190","surah_name":"Ali 'Imran","quran_text":"إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِأُولِي الْأَلْبَابِ","english_meaning":"Indeed, in the creation of the heavens and the earth and the alternation of the night and the day are signs for those of understanding.","verse_explanation":"Directs the human intellect to find the Creator through the observation of the natural laws and the cosmic order.","scholars_opinions":[{"scholar":"Ibn al-Jawzi","opinion":"Notes that 'Al-Albab' (the core/intellect) refers to those who strip away the husk of the world to see the essence of the Creator's wisdom within it."},{"scholar":"Al-Alusi","opinion":"Suggests the alternation of night and day represents the perpetual shift between expansion (joy) and contraction (sorrow) in the human soul."},{"scholar":"Muhammad Asad","opinion":"Interprets this as a call to scientific inquiry, where the 'signs' are the mathematical and physical laws that govern the universe."}]},{"id_number":22,"verse":"3:191","surah_name":"Ali 'Imran","quran_text":"الَّذِينَ يَذْكُرُونَ اللَّهَ قِيَامًا وَقُعُودًا وَعَلَىٰ جُنُوبِهِمْ وَيَتَفَكَّرُونَ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ رَبَّنَا مَا خَلَقْتَ هَٰذَا بَاطِلًا","english_meaning":"Who remember Allah while standing or sitting or [lying] on their sides and give thought to the creation of the heavens and the earth, [saying], 'Our Lord, You did not create this aimlessly.'","verse_explanation":"Shows the synthesis of the heart (remembrance) and the mind (reflection), leading to the realization of purpose.","scholars_opinions":[{"scholar":"Allamah Tabataba'i","opinion":"Explains that true 'Dhikr' is not just a tongue movement, but a permanent state of consciousness where one is never heedless of the Divine presence."},{"scholar":"Jalaluddin Rumi (referenced)","opinion":"Describes this as the 'dance of the soul'—whether moving or still, the lover's focus never leaves the Beloved, seeing Him in every atom."},{"scholar":"Ibn al-Qayyim","opinion":"Argues that 'reflection' (Tafakkur) is the lamp of the heart; without it, the heart is in darkness even if it performs rituals."}]},{"id_number":23,"verse":"4:1","surah_name":"An-Nisa","quran_text":"يَا أَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمُ الَّذِي خَلَقَكُمْ مِنْ نَفْسٍ وَاحِدَةٍ","english_meaning":"O mankind, fear your Lord, who created you from one soul...","verse_explanation":"Establishes the ontological unity of all human beings, regardless of race, gender, or status.","scholars_opinions":[{"scholar":"Al-Tabari","opinion":"Emphasizes the biological and spiritual kinship of humanity, making any form of tribalism or racism a violation of the 'One Soul' principle."},{"scholar":"Ibn Arabi","opinion":"Takes a metaphysical view, suggesting the 'One Soul' is the universal human reality (Al-Haqiqah al-Muhammadiyyah) from which all individuals manifest."},{"scholar":"Amina Wadud","opinion":"Highlights that the creation from a single soul implies primordial equality between genders, as neither is superior in origin."}]},{"id_number":24,"verse":"4:36","surah_name":"An-Nisa","quran_text":"وَاعْبُدُوا اللَّهَ وَلَا تُشْرِكُوا بِهِ شَيْئًا ۖ وَبِالْوَالِدَيْنِ إِحْسَانًا","english_meaning":"Worship Allah and associate nothing with Him, and to parents do good...","verse_explanation":"A comprehensive social charter linking the vertical relationship (God) with the horizontal relationships (family, neighbors, society).","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"Notes that 'Ihsan' (excellence/kindness) is a higher standard than 'Adl' (justice); it requires doing more than what is legally required."},{"scholar":"Ibn Kathir","opinion":"Details the rights of the 'neighbor who is a stranger,' arguing that Islam mandates social safety nets for all members of a community, regardless of faith."},{"scholar":"Fethullah Gülen","opinion":"Sees this as the 'Circle of Compassion,' starting from the Creator and expanding to the closest kin, then the neighborhood, and finally the whole world."}]},{"id_number":25,"verse":"4:114","surah_name":"An-Nisa","quran_text":"لَا خَيْرَ فِي كَثِيرٍ مِنْ نَجْوَاهُمْ إِلَّا مَنْ أَمَرَ بِصَدَقَةٍ أَوْ مَعْرُوفٍ أَوْ إِصْلَاحٍ بَيْنَ النَّاسِ","english_meaning":"No good is there in much of their private conversation, except for those who enjoin charity or that which is right or conciliation between people.","verse_explanation":"Criticizes idle or harmful talk and defines the only three productive uses of 'secret' or private meetings.","scholars_opinions":[{"scholar":"Al-Baghawi","opinion":"States that 'Najwa' (whispering/private talk) usually leads to sin (backbiting), unless it is purposefully steered toward helping the poor."},{"scholar":"Ibn Ashur","opinion":"Points out that 'reconciliation' (Islah) is often more beloved to God than voluntary prayer, as it heals the fabric of the community."},{"scholar":"Malik Bennabi","opinion":"Views this as a 'social hygiene' rule, where the energy of communication must be directed toward construction rather than social decay."}]},{"id_number":26,"verse":"4:135","surah_name":"An-Nisa","quran_text":"يَا أَيُّهَا الَّذِينَ آمَنُوا كُونُوا قَوَّامِينَ بِالْقِسْطِ شُهَدَاءَ لِلَّهِ وَلَوْ عَلَىٰ أَنْفُسِكُمْ","english_meaning":"O you who have believed, be persistently standing firm in justice, witnesses for Allah, even if it be against yourselves...","verse_explanation":"The ultimate standard of impartial justice, where truth takes precedence over self-interest, family, or wealth.","scholars_opinions":[{"scholar":"Sayyid Qutb","opinion":"Describes this as the 'pinnacle of human integrity,' where a person's conscience is so pure that they can testify against their own ego."},{"scholar":"Al-Jalalayn","opinion":"Focuses on the word 'Qawwamin' (persistently standing), implying that justice is not a one-time act but a permanent character trait."},{"scholar":"Hamza Yusuf","opinion":"Relates this to the 'fitra' (innate nature), stating that true justice is only possible when a person fears God more than they love their own benefit."}]},{"id_number":27,"verse":"4:147","surah_name":"An-Nisa","quran_text":"مَا يَفْعَلُ اللَّهُ بِعَذَابِكُمْ إِنْ شَكَرْتُمْ وَآمَنْتُمْ","english_meaning":"What would Allah do with your punishment if you are grateful and believe?","verse_explanation":"A powerful rhetorical question establishing that God does not desire to punish; punishment is merely a result of human choices.","scholars_opinions":[{"scholar":"Al-Razi","opinion":"Argues that God is 'Ghani' (Self-Sufficient), so He gains nothing from punishing. Punishment only exists as a corrective for those who reject the truth."},{"scholar":"Ibn al-Qayyim","opinion":"Connects gratitude (Shukr) to the preservation of blessings; if a human is grateful, they have secured themselves from the need for 'wake-up' trials."},{"scholar":"Muhammad al-Ghazali","opinion":"States that the universe is built on 'Grace,' and the human only encounters 'Wrath' when they actively turn away from the light of belief."}]},{"id_number":28,"verse":"5:8","surah_name":"Al-Ma'idah","quran_text":"وَلَا يَجْرِمَنَّكُمْ شَنَآنُ قَوْمٍ عَلَىٰ أَلَّا تَعْدِلُوا ۚ اعْدِلُوا هُوَ أَقْرَبُ لِلتَّقْوَىٰ","english_meaning":"And do not let the hatred of a people prevent you from being just. Be just; that is nearer to righteousness.","verse_explanation":"Mandates ethical behavior even toward enemies, forbidding that personal animosity should cloud moral judgment.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"Notes that justice is an absolute obligation that does not change based on the identity of the person—friend or foe."},{"scholar":"Javed Ahmad Ghamidi","opinion":"Highlights that justice is the 'closest neighbor' to Taqwa (God-consciousness). Without justice, one's claim of piety is hollow."},{"scholar":"Tariq Ramadan","opinion":"Argues this is the foundation of 'Universal Ethics,' where the believer must defend the rights of those they dislike as much as those they love."}]},{"id_number":29,"verse":"5:32","surah_name":"Al-Ma'idah","quran_text":"مَنْ قَتَلَ نَفْسًا بِغَيْرِ نَفْسٍ أَوْ فَسَادٍ فِي الْأَرْضِ فَكَأَنَّمَا قَتَلَ النَّاسَ جَمِيعًا","english_meaning":"Whoever kills a soul... it is as if he had slain mankind entirely. And whoever saves one - it is as if he had saved mankind entirely.","verse_explanation":"The Quranic declaration on the absolute sanctity of human life, using a powerful mathematical analogy.","scholars_opinions":[{"scholar":"Al-Sadi","opinion":"Explains that because the right to life is universal, an attack on one is an attack on the 'concept' of life itself, which affects all of humanity."},{"scholar":"Sa'id bin al-Musayyib","opinion":"Interpreted 'saving a soul' not just as physical rescue, but also as guiding someone out of spiritual darkness into light."},{"scholar":"Yusuf al-Qaradawi","opinion":"Uses this to emphasize that Islam is inherently pro-life and anti-terror, as no political goal justifies the 'killing of mankind' through one soul."}]},{"id_number":30,"verse":"6:103","surah_name":"Al-An'am","quran_text":"لَا تُدْرِكُهُ الْأَبْصَارُ وَهُوَ يُدْرِكُ الْأَبْصَارَ ۖ وَهُوَ اللَّطِيفُ الْخَبِيرُ","english_meaning":"Vision perceives Him not, but He perceives [all] vision; and He is the Subtle, the Acquainted.","verse_explanation":"Defines the transcendence of God, who is beyond physical perception but intimately aware of every observer.","scholars_opinions":[{"scholar":"Ja'far al-Sadiq","opinion":"Explained that 'vision' here means the limits of the mind; God cannot be 'encompassed' by thought, though He is known by the heart."},{"scholar":"Al-Razi","opinion":"Focuses on 'Al-Latif' (The Subtle), stating that God is closer to us than our own senses, yet too vast to be trapped by them."},{"scholar":"Ibn Arabi","opinion":"Suggests that we don't see God because He is 'too apparent' (like the sun blinding the eye), and He sees us because He is our very essence."}]},{"id_number":31,"verse":"6:162","surah_name":"Al-An'am","quran_text":"قُلْ إِنَّ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي لِلَّهِ رَبِّ الْعَالَمِينَ","english_meaning":"Say, 'Indeed, my prayer, my rites of sacrifice, my living and my dying are for Allah, Lord of the worlds.'","verse_explanation":"The ultimate declaration of purpose, surrendering the entirety of existence—from rituals to the moment of death—to the Creator.","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"Notes that 'living and dying' implies that even mundane activities (eating, sleeping) become worship if the intention is for God."},{"scholar":"Ibn al-Qayyim","opinion":"Describes this as the 'Station of Sincerity' (Ikhlas), where a person becomes a 'pure servant,' seeking no approval from the creation."},{"scholar":"Sayyid Qutb","opinion":"Views this as a revolutionary stance: it removes the 'secular' divide, making every aspect of life a spiritual mission."}]},{"id_number":32,"verse":"7:156","surah_name":"Al-A'raf","quran_text":"وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ","english_meaning":"...but My mercy encompasses all things.","verse_explanation":"A foundational promise that the primary attribute of God’s dealing with the universe is Mercy, which overpowers His wrath.","scholars_opinions":[{"scholar":"Ibn Arabi","opinion":"Argues that even in the Hereafter, Mercy is the ultimate end, as 'all things' include every creature and every state of being."},{"scholar":"Al-Suyuti","opinion":"Relates a Hadith that God divided mercy into 100 parts, keeping 99 for Himself and sending 1 to Earth—this 1 part is what causes a mother to love her child."},{"scholar":"Fakhr al-Din al-Razi","opinion":"Explains that Mercy 'encompassing' means it precedes our existence and continues after it; it is the environment in which we live."}]},{"id_number":33,"verse":"7:199","surah_name":"Al-A'raf","quran_text":"خُذِ الْعَفْوَ وَأْمُرْ بِالْعُرْفِ وَأَعْرِضْ عَنِ الْجَاهِلِينَ","english_meaning":"Take what is given, enjoin what is right, and turn away from the ignorant.","verse_explanation":"A three-part guide to interpersonal conduct: being easygoing, promoting virtue, and avoiding unproductive conflict.","scholars_opinions":[{"scholar":"Jafar al-Sadiq","opinion":"Said that this verse contains the entire sum of good character (Makarim al-Akhlaq)."},{"scholar":"Al-Tabari","opinion":"Interprets 'Afw' (what is given) as accepting the natural temperament of people without demanding perfection from them."},{"scholar":"Nouman Ali Khan","opinion":"Points out that 'turning away' from the ignorant is a form of emotional intelligence—not every insult deserves a response."}]},{"id_number":34,"verse":"7:204","surah_name":"Al-A'raf","quran_text":"وَإِذَا قُرِئَ الْقُرْآنُ فَاسْتَمِعُوا لَهُ وَأَنْصِتُوا لَعَلَّكُمْ تُرْحَمُونَ","english_meaning":"So when the Quran is recited, then listen to it and pay attention that you may receive mercy.","verse_explanation":"Establishes the etiquette of engagement with the Divine Word—silence and active listening as a prerequisite for spiritual reception.","scholars_opinions":[{"scholar":"Al-Baghawi","opinion":"Differentiates between 'hearing' (sama') and 'listening' (istima'), where the latter requires the presence of the heart."},{"scholar":"Ibn Ashur","opinion":"Suggests that the 'Mercy' mentioned is the immediate tranquility (Sakina) that descends upon those who respect the Word."},{"scholar":"Sahl al-Tustari","opinion":"Believes that in the silence of the listener, God 'speaks' to the inner secret of the soul, providing personal guidance."}]},{"id_number":35,"verse":"8:2","surah_name":"Al-Anfal","quran_text":"إِنَّمَا الْمُؤْمِنُونَ الَّذِينَ إِذَا ذُكِرَ اللَّهُ وَجِلَتْ قُلُوبُهُمْ","english_meaning":"The believers are only those who, when Allah is mentioned, their hearts tremble...","verse_explanation":"Describes the emotional sensitivity of a heart that is truly connected to its Creator.","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"Explains 'Wajal' (trembling) as a mix of awe and love—like a child who is both in awe of their father but loves him deeply."},{"scholar":"Ibn al-Qayyim","opinion":"States that the trembling is because of the heart's awareness of its own shortcomings in the presence of Majesty."},{"scholar":"Amin Ahsan Islahi","opinion":"Emphasizes the word 'Innama' (only), suggesting that if a person feels nothing when hearing God's name, their faith needs 'reviving.'"}]},{"id_number":36,"verse":"8:33","surah_name":"Al-Anfal","quran_text":"وَمَا كَانَ اللَّهُ لِيُعَذِّبَهُمْ وَأَنْتَ فِيهِمْ ۚ وَمَا كَانَ اللَّهُ مُعَذِّبَهُمْ وَهُمْ يَسْتَغْفِرُونَ","english_meaning":"But Allah would not punish them while you, [O Muhammad], are among them, and Allah would not punish them while they seek forgiveness.","verse_explanation":"Reveals the two 'shields' against Divine punishment: the presence of the Prophetic legacy and the act of Istighfar (seeking forgiveness).","scholars_opinions":[{"scholar":"Ibn Abbas","opinion":"Famously said: 'There were two safeties on earth. One is gone (the Prophet), but the other remains (seeking forgiveness). If you lose that, you are lost.'"},{"scholar":"Al-Shawkani","opinion":"Notes that 'seeking forgiveness' must be sincere (from the heart) to act as a shield, not just empty words."},{"scholar":"Habib Umar bin Hafiz","opinion":"Interprets 'you are among them' as the Prophet's character (Sunnah) being alive in the community; as long as the Sunnah is practiced, the community is protected."}]},{"id_number":37,"verse":"8:46","surah_name":"Al-Anfal","quran_text":"وَلَا تَنَازَعُوا فَتَفْشَلُوا وَتَذْهَبَ رِيحُكُمْ","english_meaning":"...and do not dispute and [thus] lose courage and [then] your strength would depart...","verse_explanation":"A sociological warning that internal conflict leads to the loss of 'Rih' (wind/momentum/power).","scholars_opinions":[{"scholar":"Al-Tabari","opinion":"Uses the metaphor of a ship: if the crew fights, they lose the 'wind' in their sails and the ship becomes a sitting duck."},{"scholar":"Abul A'la Maududi","opinion":"Argues that unity is not just a moral goal but a strategic necessity for any civilization that wishes to survive."},{"scholar":"Muhammad Iqbal","opinion":"Interprets 'Rih' as the collective 'ego' or 'spirit' of a nation; once they split into sects, that spirit evaporates."}]},{"id_number":38,"verse":"9:40","surah_name":"At-Tawbah","quran_text":"لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا","english_meaning":"...'Do not grieve; indeed Allah is with us.'","verse_explanation":"Spoken by the Prophet to Abu Bakr in the Cave of Thawr, representing absolute trust in God during the most vulnerable moment.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"Emphasizes that 'Ma'iyyah' (God being with us) is the ultimate source of Sakina (tranquility) that allows one to remain calm in the face of death."},{"scholar":"Al-Qurtubi","opinion":"Notes that the Prophet didn't say 'Don't fear,' but 'Don't grieve,' because grief for the future can paralyze action, whereas trust in God empowers it."},{"scholar":"Hamza Yusuf","opinion":"Describes this as the 'Philosophy of the Cave'—when the world is against you, the realization of God's presence makes the small cave feel like the whole universe."}]},{"id_number":39,"verse":"9:128","surah_name":"At-Tawbah","quran_text":"لَقَدْ جَاءَكُمْ رَسُولٌ مِنْ أَنْفُسِكُمْ عَزِيزٌ عَلَيْهِ مَا عَنِتُّمْ حَرِيصٌ عَلَيْكُمْ بِالْمُؤْمِنِينَ رَءُوفٌ رَحِيمٌ","english_meaning":"There has certainly come to you a Messenger from among yourselves. Grievous to him is what you suffer; [he is] concerned over you and to the believers is kind and merciful.","verse_explanation":"A touching description of the Prophet’s empathy and his deep emotional investment in the well-being of his people.","scholars_opinions":[{"scholar":"Ibn Ashur","opinion":"Points out that 'from yourselves' means he understands human weakness because he shares the human nature."},{"scholar":"Al-Jalalayn","opinion":"Highlights 'Haris' (concerned), which implies a mother-like anxiety for the safety and guidance of the believers."},{"scholar":"Fethullah Gülen","opinion":"Describes the Prophet as a 'Doctor of Hearts' whose own heart hurts whenever his 'patients' are in pain."}]},{"id_number":40,"verse":"9:129","surah_name":"At-Tawbah","quran_text":"فَإِنْ تَوَلَّوْا فَقُلْ حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ","english_meaning":"But if they turn away, say, 'Sufficient for me is Allah; there is no deity except Him. On Him I have relied, and He is the Lord of the Great Throne.'","verse_explanation":"The ultimate declaration of spiritual independence—even if the whole world turns away, the presence of God is enough.","scholars_opinions":[{"scholar":"Al-Sadi","opinion":"States that 'Hasbiya Allah' (God is sufficient) is the fortress for anyone who is lonely or rejected in their mission."},{"scholar":"Abul A'la Maududi","opinion":"Explains that referencing the 'Great Throne' is to remind the soul that the one supporting it is the Sovereign of the entire cosmos."},{"scholar":"Ibn al-Qayyim","opinion":"Argues that 'Tawakkul' (reliance) is not passive, but the highest form of active courage, as it grounds the human in the Infinite."}]},{"id_number":41,"verse":"10:44","surah_name":"Yunus","quran_text":"إِنَّ اللَّهَ لَا يَظْلِمُ النَّاسَ شَيْئًا وَلَٰكِنَّ النَّاسَ أَنْفُسَهُمْ يَظْلِمُونَ","english_meaning":"Indeed, Allah does not wrong the people at all, but it is the people who are wronging themselves.","verse_explanation":"A foundational statement on Divine Justice and human accountability, emphasizing that suffering is often the result of human choices rather than Divine whim.","scholars_opinions":[{"scholar":"Fakhr al-Din al-Razi","opinion":"Argues that 'wronging themselves' refers to the corruption of the soul's innate potential; God provides the light, but humans choose to close their eyes."},{"scholar":"Allamah Tabataba'i","opinion":"Explains this through the law of cause and effect; every action carries a natural consequence, and 'wronging oneself' is simply triggering a negative outcome."},{"scholar":"Muhammad Asad","opinion":"Views this as a sociological law: societies perish not because of Divine anger, but because they violate the moral and physical laws that sustain them."}]},{"id_number":42,"verse":"10:62","surah_name":"Yunus","quran_text":"أَلَا إِنَّ أَوْلِيَاءَ اللَّهِ لَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ","english_meaning":"Unquestionably, [for] the allies of Allah there will be no fear concerning them, nor will they grieve.","verse_explanation":"Defines the state of 'Wilayah' (closeness to God) as a psychological fortress where the anxieties of the future and the regrets of the past are neutralized.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"Identifies the 'Allies' as those who combine faith (Iman) with constant mindfulness (Taqwa), resulting in a state of eternal tranquility."},{"scholar":"Al-Ghazali","opinion":"Suggests that 'no fear' means they have reached a level of certainty where they trust the outcome of every event, seeing the hand of the Beloved in everything."},{"scholar":"Yasir Qadhi","opinion":"Notes that while they may feel human emotions, they are not 'overwhelmed' by them; their spiritual anchor prevents them from sinking into despair."}]},{"id_number":43,"verse":"11:115","surah_name":"Hud","quran_text":"وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ","english_meaning":"And be patient, for indeed, Allah does not allow to be lost the reward of those who do good.","verse_explanation":"An assurance of the conservation of moral energy; no good deed, however small, is ever deleted from the cosmic record.","scholars_opinions":[{"scholar":"Ibn al-Jawzi","opinion":"Highlights that the 'reward' isn't just in the afterlife, but in the immediate peace and strength God grants the doer of good."},{"scholar":"Al-Sadi","opinion":"Emphasizes that patience is the 'container' for excellence (Ihsan); without patience, a person cannot sustain high-quality work or character."},{"scholar":"Nouman Ali Khan","opinion":"Points out the word 'Ajar' (wage/reward) implies a contractual certainty; God views Himself as 'indebted' to pay back the one who does good."}]},{"id_number":44,"verse":"12:18","surah_name":"Yusuf","quran_text":"فَصَبْرٌ جَمِيلٌ ۖ وَاللَّهُ الْمُسْتَعَانُ عَلَىٰ مَا تَصِفُونَ","english_meaning":"...So patience is most fitting. And Allah is the one sought for help against that which you describe.","verse_explanation":"Introduces the concept of 'Sabrun Jamil' (Beautiful Patience)—patience without complaining to creation, only to the Creator.","scholars_opinions":[{"scholar":"Ibn al-Qayyim","opinion":"Defines beautiful patience as that which is free from restlessness, anxiety, and the desire to make others feel guilty for one's suffering."},{"scholar":"Al-Qurtubi","opinion":"Notes that Jacob (AS) knew his sons were lying, but chose silence and reliance on God as the most dignified response to betrayal."},{"scholar":"Muhammad al-Ghazali","opinion":"Describes this as 'Positive Patience'—not a passive surrender, but a calm, strategic endurance while waiting for the truth to manifest."}]},{"id_number":45,"verse":"12:67","surah_name":"Yusuf","quran_text":"لَا تَدْخُلُوا مِنْ بَابٍ وَاحِدٍ وَادْخُلُوا مِنْ أَبْوَابٍ مُتَفَرِّقَةٍ","english_meaning":"And he said, 'O my sons, do not enter from one gate but enter from different gates...'","verse_explanation":"A lesson in balancing practical caution and strategic planning with the ultimate reliance on Divine decree.","scholars_opinions":[{"scholar":"Ibn Ashur","opinion":"Interprets this as a command to avoid 'Evil Eye' and unnecessary attention, showing that Islam encourages taking logical precautions (Asbab)."},{"scholar":"Al-Zamakhshari","opinion":"Suggests that using multiple gates represents 'diversification of risk'—if one path is blocked or dangerous, others remain open."},{"scholar":"Hamza Yusuf","opinion":"Uses this to discuss the 'shadow' of the ego; by entering from different gates, they remained humble and less likely to provoke envy or hostility."}]},{"id_number":46,"verse":"12:86","surah_name":"Yusuf","quran_text":"إِنَّمَا أَشْكُو بَثِّي وَحُزْنِي إِلَى اللَّهِ وَأَعْلَمُ مِنَ اللَّهِ مَا لَا تَعْلَمُونَ","english_meaning":"He said, 'I only complain of my suffering and my grief to Allah, and I know from Allah that which you do not know.'","verse_explanation":"The ultimate expression of emotional intimacy with God, where the believer vents their deepest pain only to the One who can actually heal it.","scholars_opinions":[{"scholar":"Al-Tabari","opinion":"Explains that 'what you do not know' refers to Jacob’s absolute certainty that God’s promise is true, even when the data of the world suggests otherwise."},{"scholar":"Ibn Ajiba","opinion":"From a mystical perspective, this is the station of 'Kashf' (unveiling)—where the heart sees the hidden mercy behind the apparent tragedy."},{"scholar":"Abdel Haleem","opinion":"Focuses on the linguistic precision: 'Bath' (suffering) refers to grief so intense it 'scatters' one's focus, yet it is gathered back through prayer."}]},{"id_number":47,"verse":"13:11","surah_name":"Ar-Ra'd","quran_text":"إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنْفُسِهِمْ","english_meaning":"Indeed, Allah will not change the condition of a people until they change what is in themselves.","verse_explanation":"The primary law of social and personal transformation: external reality is a reflection of internal state.","scholars_opinions":[{"scholar":"Malek Bennabi","opinion":"This is a core pillar of his 'Conditions of Civilization,' arguing that no political revolution succeeds unless the 'inner man' is reformed first."},{"scholar":"Sayyid Qutb","opinion":"Emphasizes that Divine support is contingent upon human initiative; God provides the power, but the 'trigger' is the human will."},{"scholar":"Ibn al-Qayyim","opinion":"Relates this to individual psychology: if you want God to change your anxiety to peace, you must change your habits of thought and heart."}]},{"id_number":48,"verse":"13:28","surah_name":"Ar-Ra'd","quran_text":"أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ","english_meaning":"Unquestionably, by the remembrance of Allah hearts are assured.","verse_explanation":"Defines the only 'natural frequency' at which the human heart finds resonance and stability: the mention of its Source.","scholars_opinions":[{"scholar":"Al-Razi","opinion":"Argues that since the heart is infinite in its desires, it can never be satisfied by finite worldly objects; only the Infinite (God) can fill it."},{"scholar":"Ibn Taymiyyah","opinion":"States that 'Dhikr' (remembrance) is to the heart what water is to a fish; without it, the heart gasps and dies in a state of agitation."},{"scholar":"Saeed bin Jubayr","opinion":"Interprets 'assurance' as the removal of doubt; the heart becomes firm because it finally understands the 'Why' behind existence."}]},{"id_number":49,"verse":"14:7","surah_name":"Ibrahim","quran_text":"لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ","english_meaning":"If you are grateful, I will surely increase you [in favor].","verse_explanation":"Establishes a mathematical-spiritual ratio: gratitude is the multiplier of blessings.","scholars_opinions":[{"scholar":"Al-Sadi","opinion":"Explains that gratitude isn't just saying 'Alhamdulillah,' but using the blessing in a way that pleases the Provider, which then triggers more."},{"scholar":"Ibn al-Jawzi","opinion":"Notes that the 'increase' can be in the blessing itself, or in the 'Barakah' (utility) of the blessing, making a little go a long way."},{"scholar":"Muhammad Metwalli al-Sha'rawi","opinion":"Suggests that gratitude 'tethers' the current blessing and 'hunts' the future one; it is both a shield and a magnet."}]},{"id_number":50,"verse":"14:34","surah_name":"Ibrahim","quran_text":"وَإِنْ تَعُدُّوا نِعْمَتَ اللَّهِ لَا تُحْصُوهَا","english_meaning":"And if you should count the favor of Allah, you could not enumerate them.","verse_explanation":"A reminder of the infinite complexity and volume of the biological and spiritual systems supporting human life at every second.","scholars_opinions":[{"scholar":"Al-Razi","opinion":"Invites the reader to look at a single cell or a single breath; the variables required to sustain life for one minute are beyond human calculation."},{"scholar":"Muhammad Asad","opinion":"Refers to the 'ecological favors'—the precise balance of gases, gravity, and distance that make Earth habitable against all odds."},{"scholar":"Fethullah Gülen","opinion":"Notes the word 'Ni'mah' is singular, implying that even 'one' favor (like the eye) has so many sub-layers that you couldn't count the components of that single gift."}]},{"id_number":51,"verse":"15:49","surah_name":"Al-Hijr","quran_text":"نَبِّئْ عِبَادِي أَنِّي أَنَا الْغَفُورُ الرَّحِيمُ","english_meaning":"[O Muhammad], inform My servants that it is I who am the Forgiving, the Merciful.","verse_explanation":"A direct message of hope, where God identifies Himself primarily through the lens of redemption and grace.","scholars_opinions":[{"scholar":"Al-Baghawi","opinion":"Points out the honor in the word 'My servants'; even those who sin are still 'His,' and He invites them back with tenderness."},{"scholar":"Ibn Kathir","opinion":"States that this verse was revealed to balance the fear of punishment, ensuring the believer's heart remains in a state of optimistic love."},{"scholar":"Al-Qurtubi","opinion":"Highlights that God uses the 'First Person' (I am the Forgiving), making the promise of mercy an absolute and personal guarantee."}]},{"id_number":52,"verse":"15:85","surah_name":"Al-Hijr","quran_text":"فَاصْفَحِ الصَّفْحَ الْجَمِيلَ","english_meaning":"...So overlook [any human faults] with gracious forgiveness.","verse_explanation":"Defines 'Al-Safh al-Jamil' (Gracious Overlooking)—forgiving without reminding the person of their fault or holding a secret grudge.","scholars_opinions":[{"scholar":"Al-Tabari","opinion":"Interprets 'overlooking' as a higher state than mere forgiveness; it's as if the fault was never committed, wiping the slate completely clean."},{"scholar":"Ibn Ajiba","opinion":"Argues that one cannot have a gracious heart if it is filled with the 'trash' of others' mistakes; overlooking is for one's own mental health."},{"scholar":"Tariq Ramadan","opinion":"Sees this as a social ethic: to build a community, we must 'overlook' the petty differences and focus on the shared common good."}]},{"id_number":53,"verse":"16:18","surah_name":"An-Nahl","quran_text":"وَإِنْ تَعُدُّوا نِعْمَةَ اللَّهِ لَا تُحْصُوهَا ۗ إِنَّ اللَّهَ لَفَغُورٌ رَحِيمٌ","english_meaning":"And if you should count the favors of Allah, you could not enumerate them. Indeed, Allah is Forgiving and Merciful.","verse_explanation":"A repetition of 14:34, but with a different ending; here, God acknowledges our failure to be sufficiently grateful and offers forgiveness for it.","scholars_opinions":[{"scholar":"Ibn al-Qayyim","opinion":"Notes that the end of the verse ('Indeed Allah is Forgiving') is a consolation; since we can never count the favors, we can never give full thanks, so God forgives our shortcoming."},{"scholar":"Al-Shawkani","opinion":"Suggests that the greatest 'favor' we can't count is the very fact that God forgives us for being ungrateful for all the other favors."},{"scholar":"Hamza Yusuf","opinion":"Relates this to 'Entropy' in the physical world; God's Mercy is the constant energy input that keeps the system from collapsing into chaos."}]},{"id_number":54,"verse":"16:90","surah_name":"An-Nahl","quran_text":"إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيتَاءِ ذِي الْقُرْبَىٰ","english_meaning":"Indeed, Allah orders justice and good conduct and giving to relatives and forbids immorality and bad conduct and oppression.","verse_explanation":"The 'Comprehensive Verse' that summarizes the entire Islamic ethical and social system in a single sentence.","scholars_opinions":[{"scholar":"Abdullah ibn Mas'ud","opinion":"Famously said: 'This is the most comprehensive verse in the Quran regarding good and evil.'"},{"scholar":"Abul A'la Maududi","opinion":"Views this as the 'Constitution of a Moral Society,' balancing the legal (justice) with the social/emotional (Ihsan)."},{"scholar":"Al-Jalalayn","opinion":"Defines 'Adl' as giving everyone their due right, and 'Ihsan' as giving more than their due right and taking less than your own."}]},{"id_number":55,"verse":"16:125","surah_name":"An-Nahl","quran_text":"ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ ۖ وَجَادِلْهُمْ بِالَّتِي هِيَ أَحْسَنُ","english_meaning":"Invite to the way of your Lord with wisdom and good instruction, and argue with them in a way that is best.","verse_explanation":"The methodology of communication: using intellect (wisdom), emotion (good instruction), and dialectic (best argument).","scholars_opinions":[{"scholar":"Ibn Ashur","opinion":"Explains that 'Wisdom' means addressing each person according to their mental capacity and specific situation."},{"scholar":"Sayyid Qutb","opinion":"Argues that 'arguing in a way that is best' means maintaining dignity and kindness even when the other person is being rude or illogical."},{"scholar":"Malik Bennabi","opinion":"Describes this as the 'Pedagogy of the Soul'—the goal isn't to 'win' the debate but to 'open' the heart of the listener."}]},{"id_number":56,"verse":"16:128","surah_name":"An-Nahl","quran_text":"إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوْا وَالَّذِينَ هُمْ مُحْسِنُونَ","english_meaning":"Indeed, Allah is with those who fear Him and those who are doers of good.","verse_explanation":"Reveals the two keys to gaining 'Ma'iyyat Allah' (Divine Support): internal restraint (Taqwa) and external excellence (Ihsan).","scholars_opinions":[{"scholar":"Al-Baghawi","opinion":"Defines 'those who fear Him' as those who avoid the forbidden, and 'doers of good' as those who go above and beyond in their duties."},{"scholar":"Saeed bin Jubayr","opinion":"States that God's 'with-ness' here is the 'Special Support' (Al-Ma'iyyah al-Khassah), providing protection and success in all affairs."},{"scholar":"Ibn Ajiba","opinion":"Suggests that 'Ihsan' is to worship God as if you see Him; if you do that, you realize He was 'with' you all along."}]},{"id_number":57,"verse":"17:23","surah_name":"Al-Isra","quran_text":"وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا","english_meaning":"And your Lord has decreed that you not worship except Him, and to parents, good treatment.","verse_explanation":"Links the highest spiritual obligation (Tawhid) directly with the highest social obligation (honoring parents).","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"Notes that 'Qada' (decreed) here is a moral and legal command, making the service of parents a form of worship in itself."},{"scholar":"Fakhr al-Din al-Razi","opinion":"Explains that parents are the 'apparent' cause of existence, while God is the 'real' cause; thus, both must be acknowledged in hierarchy."},{"scholar":"Ibn Kathir","opinion":"Details the meaning of 'Uff' (the smallest sound of irritation), stating that even a sigh of annoyance toward parents is a violation of this verse."}]},{"id_number":58,"verse":"17:32","surah_name":"Al-Isra","quran_text":"وَلَا تَقْرَبُوا الزِّنَا ۖ إِنَّهُ كَانَ فَاحِشَةً وَسَاءَ سَبِيلًا","english_meaning":"And do not approach unlawful sexual intercourse. Indeed, it is ever an immorality and is evil as a way.","verse_explanation":"A preventative command: it doesn't just forbid the act, but the 'approaching' of it (the pathways that lead to it).","scholars_opinions":[{"scholar":"Al-Sadi","opinion":"Notes that 'don't approach' is more powerful than 'don't do,' as it targets the environment, the gaze, and the preliminary steps."},{"scholar":"Muhammad Asad","opinion":"Focuses on 'evil as a way,' arguing that it destroys the sanctity of the family unit, which is the basic building block of a healthy society."},{"scholar":"Abul A'la Maududi","opinion":"Describes this as the 'social hygiene' of the Quran, protecting the psychological and physical health of the community."}]},{"id_number":59,"verse":"17:37","surah_name":"Al-Isra","quran_text":"وَلَا تَمْشِ فِي الْأَرْضِ مَرَحًا ۖ إِنَّكَ لَنْ تَخْرِقَ الْأَرْضَ وَلَنْ تَبْلُغَ الْجِبَالَ طُولًا","english_meaning":"And do not walk upon the earth exultantly. Indeed, you will never tear the earth [apart], and you will never reach the mountains in height.","verse_explanation":"A poetic check on human arrogance, reminding the person of their physical limitations against the vastness of the Earth.","scholars_opinions":[{"scholar":"Al-Zamakhshari","opinion":"Interprets this as a call to 'physical humility'—the way one walks and carries themselves is a reflection of their internal ego."},{"scholar":"Fethullah Gülen","opinion":"Describes this as the 'realization of nothingness'—only when the human realizes their smallness can they reflect the greatness of the Creator."},{"scholar":"Amin Ahsan Islahi","opinion":"Notes that arrogance is a form of 'delusion' that detaches a person from reality; the mountain and the earth are there to ground us."}]},{"id_number":60,"verse":"17:70","surah_name":"Al-Isra","quran_text":"وَلَقَدْ كَرَّمْنَا بَنِي آدَمَ","english_meaning":"And We have certainly honored the children of Adam...","verse_explanation":"The Quranic declaration of 'Inherent Human Dignity,' granted to every human being by virtue of their creation, regardless of faith or status.","scholars_opinions":[{"scholar":"Al-Jassas","opinion":"Legal expert who argues that 'honor' includes the right to life, property, and freedom, forming the basis of Islamic human rights."},{"scholar":"Ibn Arabi","opinion":"Metaphysical view: man is honored because he is the 'microcosm' that contains the secrets of the entire 'macrocosm' (the universe)."},{"scholar":"Hamza Yusuf","opinion":"States that dignity (karamah) is a 'Divine Trust'; to mistreat any human is to disrespect the One who honored them."}]},{"id_number":61,"verse":"17:80","surah_name":"Al-Isra","quran_text":"وَقُلْ رَبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ وَاجْعَلْ لِي مِنْ لَدُنْكَ سُلْطَانًا نَصِيرًا","english_meaning":"And say, 'My Lord, cause me to enter a sound entrance and to exit a sound exit and grant me from Yourself a supporting authority.'","verse_explanation":"A prayer for absolute integrity and sincerity (Sidq) in every transition of life, ensuring one's beginning and end are rooted in truth.","scholars_opinions":[{"scholar":"Al-Hasan al-Basri","opinion":"Interprets 'sound entrance' as entering the grave with faith and 'sound exit' as being resurrected with honor, focusing on the ultimate transition."},{"scholar":"Ibn al-Qayyim","opinion":"Argues that 'Sidq' (truthfulness) here means the harmony between the heart's intention, the tongue's word, and the limb's action."},{"scholar":"Nouman Ali Khan","opinion":"Points out that 'supporting authority' refers to God providing the external means (people, resources, power) to protect one's internal sincerity."}]},{"id_number":62,"verse":"17:82","surah_name":"Al-Isra","quran_text":"وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِلْمُؤْمِنِينَ","english_meaning":"And We send down of the Quran that which is healing and mercy for the believers...","verse_explanation":"Identifies the Quran not just as a book of laws, but as a therapeutic tool for the psychological and spiritual ailments of humanity.","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"States that the 'healing' is dual: physical (through Ruqyah) and spiritual (curing doubt, hypocrisy, and malice)."},{"scholar":"Fakhr al-Din al-Razi","opinion":"Suggests that the Quran 'heals' the intellect by providing proofs that remove the 'sickness' of ignorance and confusion."},{"scholar":"Muhammad al-Ghazali","opinion":"Argues that it is a 'social healing,' providing the correct values to mend broken societies and dysfunctional relationships."}]},{"id_number":63,"verse":"18:10","surah_name":"Al-Kahf","quran_text":"رَبَّنَا آتِنَا مِنْ لَدُنْكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا","english_meaning":"Our Lord, grant us from Yourself mercy and prepare for us from our affair right guidance.","verse_explanation":"The prayer of the Youth of the Cave when they were trapped, seeking 'Rashad'—the ability to make the right decision under extreme pressure.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"Notes that they asked for 'Mercy' to protect them from their enemies and 'Guidance' to ensure their own actions were correct."},{"scholar":"Al-Baghawi","opinion":"Defines 'Rashad' as a path that leads directly to the desired goal without any deviation or wasted effort."},{"scholar":"Hamza Yusuf","opinion":"Highlights that when logic fails and the world closes in, the believer asks for 'min ladunka' (from Your very Presence), bypassing all worldly means."}]},{"id_number":64,"verse":"18:109","surah_name":"Al-Kahf","quran_text":"قُلْ لَوْ كَانَ الْبَحْرُ مِدَادًا لِكَلِمَاتِ رَبِّي لَنَفِدَ الْبَحْرُ قَبْلَ أَنْ تَنْفَدَ كَلِمَاتُ رَبِّي","english_meaning":"Say, 'If the sea were ink for [writing] the words of my Lord, the sea would be exhausted before the words of my Lord were exhausted...'","verse_explanation":"A stunning metaphor for the infinite nature of Divine Knowledge and the vastness of the meanings contained in God's creation and revelation.","scholars_opinions":[{"scholar":"Al-Zamakhshari","opinion":"Points out that 'Words' (Kalimat) refers to both the written scriptures and the 'creative words' by which every atom in the universe is managed."},{"scholar":"Allamah Tabataba'i","opinion":"Explains that the finite (the sea) can never encompass the infinite (God's knowledge), highlighting the humility required of the human intellect."},{"scholar":"Muhammad Asad","opinion":"Suggests this is a call to perpetual discovery; no matter how much science or theology we learn, we have only scratched the surface."}]},{"id_number":65,"verse":"19:4","surah_name":"Maryam","quran_text":"قَالَ رَبِّ إِنِّي وَهَنَ الْعَظْمُ مِنِّي وَاشْتَعَلَ الرَّأْسُ شَيْبًا وَلَمْ أَكُنْ بِدُعَائِكَ رَبِّ شَقِيًّا","english_meaning":"He said, 'My Lord, indeed my bones have weakened, and my head has filled with white, and never have I been in my supplication to You, my Lord, unhappy.'","verse_explanation":"Zachariah’s (AS) intimate conversation with God, combining a vulnerable admission of physical frailty with an unshakeable trust in God's response.","scholars_opinions":[{"scholar":"Ibn Ashur","opinion":"Highlights the beauty of 'Shaqiyya' (unhappy/disappointed); Zachariah is saying that the mere act of praying to God has always brought him joy, regardless of the answer."},{"scholar":"Al-Qurtubi","opinion":"Notes that mentioning one's weakness (the bones) is an etiquette of prayer, as it demonstrates total 'Iftiqar' (utter neediness) before the Almighty."},{"scholar":"Saeed bin Jubayr","opinion":"Describes this as the 'Hope of the Elderly,' showing that biological impossibility is irrelevant when one has a history of Divine favor."}]},{"id_number":66,"verse":"19:21","surah_name":"Maryam","quran_text":"قَالَ كَذَٰلِكِ قَالَ رَبُّكِ هُوَ عَلَيَّ هَيِّنٌ ۖ وَلِنَجْعَلَهُ آيَةً لِلنَّاسِ وَرَحْمَةً مِنَّا","english_meaning":"He said, 'Thus [it will be]; your Lord says, \"It is easy for Me\"...'","verse_explanation":"The Archangel Gabriel's response to Mary (AS), establishing that the 'laws of nature' are merely 'habits of God' which He can suspend at will.","scholars_opinions":[{"scholar":"Al-Razi","opinion":"Argues that 'Easy for Me' reminds the human that God does not work through 'effort' but through 'Will' (Kun/Be)."},{"scholar":"Sayyid Qutb","opinion":"Views this as a message of 'Cosmic Possibility'—no situation is too difficult for God to resolve, no matter how 'impossible' it looks to us."},{"scholar":"Ibn Arabi","opinion":"Interprets this as the 'Breath of the Merciful' (Nafas al-Rahman), where existence is constantly being renewed with ease."}]},{"id_number":67,"verse":"19:96","surah_name":"Maryam","quran_text":"إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ سَيَجْعَلُ لَهُمُ الرَّحْمَنُ وُدًّا","english_meaning":"Indeed, those who have believed and done righteous deeds - the Most Merciful will appoint for them affection.","verse_explanation":"A promise that authentic faith and service to humanity will result in 'Wudd'—a deep, Divinely-inspired love from both the Creator and the creation.","scholars_opinions":[{"scholar":"Ibn Abbas","opinion":"Explains that this 'Wudd' starts in the heavens; God loves them, tells the angels to love them, and then places that love in the hearts of people on Earth."},{"scholar":"Al-Tabari","opinion":"Emphasizes that this love is not sought through PR or fame-seeking, but is a 'natural byproduct' of sincere righteousness."},{"scholar":"Ja'far al-Sadiq","opinion":"States that 'Wudd' is the highest form of love (stronger than Hubb), implying an intimate friendship and protection from the Divine."}]},{"id_number":68,"verse":"20:25","surah_name":"Taha","quran_text":"قَالَ رَبِّ اشْرَحْ لِي صَدْرِي","english_meaning":"[Moses] said, 'My Lord, expand for me my breast [with assurance].'","verse_explanation":"The opening of the prayer for leadership and communication, asking for the internal capacity to hold the weight of a monumental mission.","scholars_opinions":[{"scholar":"Al-Sadi","opinion":"Notes that 'expansion of the breast' is the first requirement for any task, as it removes anxiety and allows for clear, calm thinking."},{"scholar":"Al-Alusi","opinion":"Connects this to the 'Light of Wisdom'; when the chest is expanded, it becomes a vessel that can receive Divine inspiration without being overwhelmed."},{"scholar":"Muhammad Iqbal","opinion":"Sees this as the 'expansion of the Ego,' where the individual self grows to encompass the concerns and pains of the entire community."}]},{"id_number":69,"verse":"20:46","surah_name":"Taha","quran_text":"قَالَ لَا تَخَافَا ۖ إِنَّنِي مَعَكُمَا أَسْمَعُ وَأَرَىٰ","english_meaning":"[Allah] said, 'Fear not. Indeed, I am with you both; I hear and I see.'","verse_explanation":"A foundational verse for courage, grounding the absence of fear in the active, observant presence of God.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"Emphasizes that 'I hear and I see' is a promise of protection; God isn't just watching, He is actively monitoring every word and move of the oppressor."},{"scholar":"Al-Ghazali","opinion":"States that if a person truly internalized 'I am with you,' they would never feel lonely or vulnerable again, as the Source of Power is their companion."},{"scholar":"Amin Ahsan Islahi","opinion":"Notes that this was spoken to Moses and Aaron when they had to face Pharaoh—the most powerful tyrant—proving that God's presence outweights any earthly power."}]},{"id_number":70,"verse":"20:114","surah_name":"Taha","quran_text":"وَقُلْ رَبِّ زِدْنِي عِلْمًا","english_meaning":"...and say, 'My Lord, increase me in knowledge.'","verse_explanation":"The only thing God commanded the Prophet (PBUH) to ask for 'more' of was knowledge, establishing it as the ultimate pursuit of a believer.","scholars_opinions":[{"scholar":"Al-Suyuti","opinion":"Points out that the lack of any other request for 'increase' (like wealth or power) proves that knowledge is the only thing that is purely beneficial."},{"scholar":"Ibn al-Jawzi","opinion":"Explains that this includes 'beneficial knowledge'—that which leads to action, better character, and a deeper connection to the Creator."},{"scholar":"Muhammad Asad","opinion":"Interprets this as a mandate for 'Continuous Education,' suggesting that a believer should never be satisfied with what they already know."}]},{"id_number":71,"verse":"21:30","surah_name":"Al-Anbiya","quran_text":"أَوَلَمْ يَرَ الَّذِينَ كَفَرُوا أَنَّ السَّمَاوَاتِ وَالْأَرْضِ كَانَتَا رَتْقًا فَفَتَقْنَاهُمَا ۖ وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ","english_meaning":"Have those who disbelieved not considered that the heavens and the earth were a joined entity, and We separated them and made from water every living thing?","verse_explanation":"A profound verse addressing the origins of the universe and the biological necessity of water for life.","scholars_opinions":[{"scholar":"Al-Tabari","opinion":"Classical view: The heavens and earth were 'joined' (no rain from one, no plants from the other) until God 'separated' them to allow for life."},{"scholar":"Ibn Ashur","opinion":"Linguistic view: 'Ratq' (sewn together) and 'Fatq' (ripped apart) suggests a primordial unity of matter before the cosmic expansion."},{"scholar":"Maurice Bucaille","opinion":"Scientific view: Sees this as a direct reference to the Big Bang theory and the modern biological discovery that protoplasm is mostly water."}]},{"id_number":72,"verse":"21:35","surah_name":"Al-Anbiya","quran_text":"كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ ۗ وَنَبْلُوكُمْ بِالشَّرِّ وَالْخَيْرِ فِتْنَةً","english_meaning":"Every soul will taste death. And We test you with evil and with good as a trial...","verse_explanation":"Reframes 'good' (ease, wealth, health) as just as much of a 'test' as 'evil' (hardship, poverty, sickness).","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"Argues that the test of 'Good' (gratitude) is often harder than the test of 'Evil' (patience), as ease makes one forgetful."},{"scholar":"Ibn al-Qayyim","opinion":"Describes life as a 'testing ground' where the soul is refined; death is not the end, but the transition to the 'final result' of the test."},{"scholar":"Nouman Ali Khan","opinion":"Points out the word 'Fitnah' (refining gold with fire), implying that the purpose of life's ups and downs is to burn away the impurities of the heart."}]},{"id_number":73,"verse":"21:87","surah_name":"Al-Anbiya","quran_text":"لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ","english_meaning":"...'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.'","verse_explanation":"The 'Prayer of Yunus' (AS) in the belly of the whale, which Prophet Muhammad (PBUH) said would be answered for any believer in distress.","scholars_opinions":[{"scholar":"Ibn Taymiyyah","opinion":"Argues that this prayer is perfect because it combines the recognition of God's Perfection (Tawhid/Tasbih) with the recognition of human imperfection (Istighfar)."},{"scholar":"Al-Razi","opinion":"Notes that Yunus didn't even ask for help; he simply stated the truth. God's response to truth is more immediate than His response to a request."},{"scholar":"Hamza Yusuf","opinion":"Describes this as the 'Key to Darkness'—whenever you feel 'swallowed' by life, this realization is the only way out."}]},{"id_number":74,"verse":"21:107","surah_name":"Al-Anbiya","quran_text":"وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِلْعَالَمِينَ","english_meaning":"And We have not sent you, [O Muhammad], except as a mercy to the worlds.","verse_explanation":"Defines the very essence of the Prophetic mission: it is not about judgment or condemnation, but about bringing universal compassion.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"Explains that even those who reject him receive mercy through the delay of their punishment and the moral standards he introduced to the world."},{"scholar":"Fethullah Gülen","opinion":"Views the Prophet as a 'Spring of Life' whose message brings mercy to animals, plants, and the environment, not just humans."},{"scholar":"Tariq Ramadan","opinion":"Argues that a believer's job is to 'embody' this mercy; if a religious person is harsh or cruel, they are violating the core of the Prophetic mission."}]},{"id_number":75,"verse":"22:46","surah_name":"Al-Hajj","quran_text":"فَإِنَّهَا لَا تَعْمَى الْأَبْصَارُ وَلَٰكِنْ تَعْمَى الْقُلُوبُ الَّتِي فِي الصُّدُورِ","english_meaning":"For indeed, it is not eyes that are blinded, but blinded are the hearts which are within the breasts.","verse_explanation":"Distinguishes between physical sight and spiritual insight (Basirah), identifying 'heart-blindness' as the true tragedy.","scholars_opinions":[{"scholar":"Al-Ghazali","opinion":"Explains that the heart has its own 'eye' which sees the spiritual realities (Malakut). When it is covered in the 'rust' of sins, it loses its vision."},{"scholar":"Ibn Ajiba","opinion":"Suggests that physical blindness can be a mercy if it leads to inner vision, while the 'seeing' person who is heart-blind is in total darkness."},{"scholar":"Muhammad Iqbal","opinion":"Views this as 'Intellectual Blindness'—the inability to see the deeper purpose and meaning behind the material world."}]},{"id_number":76,"verse":"23:118","surah_name":"Al-Mu'minun","quran_text":"وَقُلْ رَبِّ اغْفِرْ وَارْحَمْ وَأَنْتَ خَيْرُ الرَّاحِمِينَ","english_meaning":"And, [O Muhammad], say, 'My Lord, forgive and have mercy, and You are the best of the merciful.'","verse_explanation":"The closing verse of the Surah, summarizing the believer’s dual need for 'Maghfirah' (covering of sins) and 'Rahmah' (bestowal of blessings).","scholars_opinions":[{"scholar":"Al-Sadi","opinion":"Notes that 'Forgiveness' deals with the past (removing the bad) and 'Mercy' deals with the future (granting the good)."},{"scholar":"Ibn Ashur","opinion":"Highlights 'Best of the Merciful,' stating that God's mercy is unconditional and infinite, unlike the limited mercy of humans."},{"scholar":"Habib Umar bin Hafiz","opinion":"Describes this as the 'Ultimate Refuge'—when all human mercy is exhausted, the believer returns to the 'Best' of them."}]},{"id_number":77,"verse":"24:35","surah_name":"An-Nur","quran_text":"اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ ۚ مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ","english_meaning":"Allah is the Light of the heavens and the earth. The example of His light is like a niche within which is a lamp...","verse_explanation":"Known as 'Ayat an-Nur' (The Verse of Light), this is a complex, multi-layered parable describing Divine Guidance and the human heart.","scholars_opinions":[{"scholar":"Al-Ghazali","opinion":"In his book 'Mishkat al-Anwar,' he argues that 'Light' is the only thing that is visible in itself and makes other things visible. Therefore, God is the only 'True Reality' through which everything else is understood."},{"scholar":"Ibn al-Qayyim","opinion":"Interprets the parable as the light of 'Iman' (Faith) inside the 'Niche' (the chest) and 'Lamp' (the heart), protected by the 'Glass' (the pure nature/fitra)."},{"scholar":"Allamah Tabataba'i","opinion":"Explains that God is 'Light' because He is the Source of 'Existence.' Just as light brings things out of darkness into being, God brings things out of non-existence into life."}]},{"id_number":78,"verse":"25:43","surah_name":"Al-Furqan","quran_text":"أَرَأَيْتَ مَنِ اتَّخَذَ إِلَٰهَهُ هَوَاهُ أَفَأَنْتَ تَكُونُ عَلَيْهِ وَكِيلًا","english_meaning":"Have you seen the one who takes as his god his own desire? Then would you be responsible for him?","verse_explanation":"A psychological warning against 'Hawa' (whim/desire), identifying it as a form of subtle polytheism where the ego becomes the object of worship.","scholars_opinions":[{"scholar":"Al-Tabari","opinion":"Defines this person as one who follows their desires regardless of logic or Divine law; their 'god' is whatever they feel like doing at that moment."},{"scholar":"Ibn Taymiyyah","opinion":"Argues that 'Hawa' is the root of all innovation and misguidance, as it prioritizes the subjective 'self' over objective 'truth.'"},{"scholar":"Muhammad al-Ghazali","opinion":"Describes this as 'Internalized Idolatry,' where the modern human replaces stone idols with the idol of 'Self-Gratification.'"}]},{"id_number":79,"verse":"25:63","surah_name":"Al-Furqan","quran_text":"وَعِبَادُ الرَّحْمَنِ الَّذِينَ يَمْشُونَ عَلَى الْأَرْضِ هَوْنًا وَإِذَا خَاطَبَهُمُ الْجَاهِلُونَ قَالُوا سَلَامًا","english_meaning":"And the servants of the Most Merciful are those who walk upon the earth easily, and when the ignorant address them, they say, 'Peace.'","verse_explanation":"Defines the 'Aesthetic of Character'—humility in movement and emotional intelligence in communication.","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"Notes that 'walk easily' doesn't mean being slow, but being free from arrogance and pride; they carry no 'weight' of ego."},{"scholar":"Ibn Kathir","opinion":"Explains that saying 'Peace' (Salam) isn't just a greeting, but a way to end a hostile conversation without sinking to the other's level."},{"scholar":"Saeed bin Jubayr","opinion":"Interprets this as 'forbearance' (Hilm); they respond to the 'ignorance' of others with the 'knowledge' of their own peace."}]},{"id_number":80,"verse":"25:74","surah_name":"Al-Furqan","quran_text":"رَبَّنَا هَبْ لَنَا مِنْ أَزْواجِنا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا","english_meaning":"...'Our Lord, grant us from among our wives and offspring comfort to our eyes and make us an example for the righteous.'","verse_explanation":"A comprehensive prayer for the family and for 'Moral Leadership,' asking for success that brings joy to the eyes and benefits the community.","scholars_opinions":[{"scholar":"Al-Hasan al-Basri","opinion":"States that 'comfort to the eyes' means seeing your family being obedient to God; there is no greater joy for a believer than seeing those they love find faith."},{"scholar":"Ibn Ashur","opinion":"Highlights 'Make us an Imam (example)'; this is not asking for power, but for such a high level of character that others are inspired to follow."},{"scholar":"Abul A'la Maududi","opinion":"Describes this as the 'Believer's Ambition'—to build a home that is a sanctuary and a life that is a light for others."}]},{"id_number":81,"verse":"26:80","surah_name":"Ash-Shu'ara","quran_text":"وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ","english_meaning":"And when I am ill, it is He who cures me.","verse_explanation":"A statement by Abraham (AS) demonstrating high etiquette (Adab) with God: he attributes the illness to himself and the cure to the Creator.","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"Notes the linguistic shift; Abraham does not say 'He makes me ill,' out of respect for God's Absolute Goodness, even though all causes come from Him."},{"scholar":"Ibn al-Qayyim","opinion":"Argues that 'cure' includes the heart’s recovery from the sickness of doubt and passion, which is more critical than physical healing."},{"scholar":"Muhammad Metwalli al-Sha'rawi","opinion":"Suggests this verse is the foundation of 'Faith-Based Medicine'—the doctor provides the means, but the patient's heart must be tethered to the Source of Healing."}]},{"id_number":82,"verse":"27:62","surah_name":"An-Naml","quran_text":"أَمَّنْ يُجِيبُ الْمُضْطَرَّ إِذَا دَعَاهُ وَيَكْشِفُ السُّوءَ","english_meaning":"Is He [not best] who responds to the desperate one when he calls upon Him and removes evil...","verse_explanation":"Identifies the state of 'Idtirar' (desperation/dire need) as the most potent condition for an answered prayer.","scholars_opinions":[{"scholar":"Al-Tabari","opinion":"Defines the 'desperate one' as someone who has lost all worldly hope and realizes that none can help him except Allah."},{"scholar":"Al-Ghazali","opinion":"Views desperation as a 'spiritual necessity' that breaks the ego, allowing the soul to finally call upon God with 100% sincerity."},{"scholar":"Hamza Yusuf","opinion":"Describes this as the 'Ontological Response'—God answers even the non-believer when they are truly desperate, because the truth of their neediness is undeniable."}]},{"id_number":83,"verse":"28:24","surah_name":"Al-Qasas","quran_text":"رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ","english_meaning":"...'My Lord, indeed I am, for whatever good You would send down to me, in need.'","verse_explanation":"Moses (AS) makes this prayer while alone, hungry, and an outlaw, demonstrating the 'Dignity of the Needy'—asking God without complaining to people.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"Points out that immediately after this humble admission of need, God provided Moses with a home, a wife, and a job."},{"scholar":"Ibn Ajiba","opinion":"States that 'Faqr' (poverty/need) before God is the highest spiritual rank, as it acknowledges the reality of the human condition."},{"scholar":"Nouman Ali Khan","opinion":"Notes the wording 'any good' (min khayrin)—Moses is so desperate he will take anything God deems good, showing total surrender of preference."}]},{"id_number":84,"verse":"28:56","surah_name":"Al-Qasas","quran_text":"إِنَّك لَا تَهْدِي مَنْ أَحْبَبْتَ وَلَٰكِنَّ اللَّهَ يَهْدِي مَنْ يَشَاءُ","english_meaning":"Indeed, [O Muhammad], you do not guide whom you like, but Allah guides whom He wills.","verse_explanation":"A reminder that guidance is a Divine gift, not a result of human persuasion or emotional attachment.","scholars_opinions":[{"scholar":"Ibn Abbas","opinion":"Explains this was revealed concerning the Prophet's uncle, Abu Talib, whom he loved deeply but who died without embracing Islam."},{"scholar":"Al-Razi","opinion":"Argues that if the Prophet himself couldn't 'give' guidance, it proves that faith is an internal resonance between God and the individual soul."},{"scholar":"Muhammad Asad","opinion":"Interprets 'whom He wills' as 'those who seek it'; God guides those whose internal state is ready to receive the truth."}]},{"id_number":85,"verse":"28:77","surah_name":"Al-Qasas","quran_text":"وَابْتَغِ فِيمَا آتَاكَ اللَّهُ الدَّارَ الْآخِرَةَ ۖ وَلَا تَنْسَ نَصِيبَكَ مِنَ الدُّنْيَا","english_meaning":"But seek, through that which Allah has given you, the home of the Hereafter; and [yet], do not forget your share of the world...","verse_explanation":"Provides the blueprint for a balanced life: using material wealth for spiritual ends while maintaining a healthy enjoyment of the physical world.","scholars_opinions":[{"scholar":"Al-Sadi","opinion":"Explains 'do not forget your share' as taking what is necessary for health, comfort, and family, ensuring the body is not neglected."},{"scholar":"Abul A'la Maududi","opinion":"Views this as a refutation of extreme asceticism; Islam wants humans to be productive and prosperous 'in' the world for the 'sake' of the next."},{"scholar":"Malik Bennabi","opinion":"Describes this as the 'Synthesis of Values'—a civilization must maintain its spiritual goal without losing its material competence."}]},{"id_number":86,"verse":"29:2","surah_name":"Al-'Ankabut","quran_text":"أَحَسِبَ النَّاسُ أَنْ يُتْرَكُوا أَنْ يَقُولُوا آمَنَّا وَهُمْ لَا يُفْتَنُونَ","english_meaning":"Do the people think that they will be left to say, 'We believe' and they will not be tried?","verse_explanation":"Establishes that faith is not a mere verbal claim but a conviction that must be verified through the trials of life.","scholars_opinions":[{"scholar":"Sayyid Qutb","opinion":"Argues that trials are like fire to gold—they don't exist to destroy the believer, but to melt away the impurities of doubt and cowardice."},{"scholar":"Al-Baghawi","opinion":"Notes that the 'test' is meant to make the internal state of a person apparent to themselves and the world, fulfilling the requirement of justice."},{"scholar":"Fazlur Rahman","opinion":"Sees this as a call to 'Ethical Action'—belief without the willingness to sacrifice or endure for one's principles is meaningless."}]},{"id_number":87,"verse":"29:69","surah_name":"Al-'Ankabut","quran_text":"وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا","english_meaning":"And those who strive for Us - We will surely guide them to Our ways.","verse_explanation":"A promise that sincere effort (Jihad of the soul and action) is the prerequisite for deeper spiritual insight.","scholars_opinions":[{"scholar":"Jafar al-Sadiq","opinion":"Interpreted 'Our ways' (plural) to mean that there are many paths to God, and He will guide each person to the path that best suits their unique nature."},{"scholar":"Ibn al-Qayyim","opinion":"States that guidance is a reward for struggle; the more you push against your ego (Nafs), the more the horizons of Truth open for you."},{"scholar":"Allamah Tabataba'i","opinion":"Emphasizes that the striving must be 'in Us' (fina)—meaning with the correct intention—for the guidance to be activated."}]},{"id_number":88,"verse":"30:21","surah_name":"Ar-Rum","quran_text":"وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ مِنْ أَنْفُسِكُمْ أَزْوَاجًا لِتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُمْ مَوَدَّةً وَرَحْمَةً","english_meaning":"And of His signs is that He created for you from yourselves mates that you may find tranquility in them; and He placed between you affection and mercy.","verse_explanation":"Defines the spiritual and psychological purpose of marriage: 'Sakina' (Tranquility) and 'Mawaddah' (Active Love).","scholars_opinions":[{"scholar":"Al-Qurtubi","opinion":"Distinguishes between 'Mawaddah' (love when things are good) and 'Rahmah' (mercy/compassion when things are difficult or health fails)."},{"scholar":"Muhammad Asad","opinion":"Focuses on 'from yourselves,' highlighting the biological and spiritual kinship between men and women as a foundational 'Sign' of God."},{"scholar":"Hamza Yusuf","opinion":"Describes the home as a 'sanctuary' where the noise of the world is silenced by the tranquility of a companionate relationship."}]},{"id_number":89,"verse":"30:22","surah_name":"Ar-Rum","quran_text":"وَمِنْ آيَاتِهِ خَلْقُ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافُ أَلْسِنَتِكُمْ وَأَلْوَانِكُمْ","english_meaning":"And of His signs is the creation of the heavens and the earth and the diversity of your languages and your colors...","verse_explanation":"Celebrates diversity (linguistic, racial, ethnic) as a Divine miracle rather than a cause for conflict.","scholars_opinions":[{"scholar":"Ibn Ashur","opinion":"Argues that linguistic diversity is a proof of the infinite creativity of God; it forces humans to learn from one another."},{"scholar":"Sayyid Qutb","opinion":"Views this as the 'Quranic Charter of Equality'—if diversity is a sign of God, then no color or language can be superior to another."},{"scholar":"Tariq Ramadan","opinion":"Suggests that pluralism is a 'test of intelligence'; only the wise see the beauty in the 'Other.'"}]},{"id_number":90,"verse":"31:17","surah_name":"Luqman","quran_text":"يَا بُنَيَّ أَقِمِ الصَّلَاةَ وَأْمُرْ بِالْمَعْرُوفِ وَانْهَ عَنِ الْمُنْكَرِ وَاصْبِرْ عَلَىٰ مَا أَصَابَكَ","english_meaning":"O my son, establish prayer, enjoin what is right, forbid what is wrong, and be patient over what befalls you...","verse_explanation":"Luqman’s advice to his son, linking the internal spiritual duty (prayer) with social activism and resilience.","scholars_opinions":[{"scholar":"Al-Zamakhshari","opinion":"Notes the sequence: once you try to 'enjoin right,' you will inevitably face pushback, which is why 'patience' is mentioned immediately after."},{"scholar":"Abul A'la Maududi","opinion":"Describes this as the 'Complete Personality'—one who connects with God, serves society, and remains firm under pressure."},{"scholar":"Saeed bin Jubayr","opinion":"Interprets 'establish prayer' as the fuel for the soul; without it, one lacks the strength to face the 'wrongs' of the world."}]},{"id_number":91,"verse":"31:18","surah_name":"Luqman","quran_text":"وَلَا تُصَعِّرْ خَدَّكَ لِلنَّاسِ وَلَا تَمْشِ فِي الْأَرْضِ مَرَحًا","english_meaning":"And do not turn your cheek [in contempt] toward people and do not walk through the earth exultantly.","verse_explanation":"Forbids the micro-expressions and body language of arrogance, mandating a humble social presence.","scholars_opinions":[{"scholar":"Al-Tabari","opinion":"Explains 'turning the cheek' (Tu-sa'ir) as a facial expression of disdain; God is regulating even the muscles of the face to promote kindness."},{"scholar":"Ibn al-Jawzi","opinion":"Warns that 'walking exultantly' detaches the human from their humble origin, making them a 'stranger' to their own humanity."},{"scholar":"Muhammad al-Ghazali","opinion":"Describes this as the 'Aesthetics of Interaction'—a believer’s face and gait should radiate accessibility and warmth, not distance and pride."}]},{"id_number":92,"verse":"33:35","surah_name":"Al-Ahzab","quran_text":"إِنَّ الْمُسْلِمِينَ وَالْمُسْلِمَاتِ وَالْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ...","english_meaning":"Indeed, the Muslim men and Muslim women, the believing men and believing women...","verse_explanation":"A rhythmic, comprehensive verse emphasizing the absolute spiritual equality and shared moral responsibility of both genders.","scholars_opinions":[{"scholar":"Umm Salama","opinion":"Reportedly asked the Prophet why the Quran addressed men mostly; this verse was revealed to show that every reward applies equally to women."},{"scholar":"Ibn Ashur","opinion":"Points out the ten qualities mentioned (faith, patience, charity, etc.) as the 'Universal Decalogue' for the human soul regardless of biological sex."},{"scholar":"Amina Wadud","opinion":"Highlights that the 'equal and parallel' structure of the language here is the definitive Quranic stance on gender ontological equality."}]},{"id_number":93,"verse":"33:56","surah_name":"Al-Ahzab","quran_text":"إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا","english_meaning":"Indeed, Allah confers blessing upon the Prophet, and His angels [ask Him to do so]. O you who have believed, ask [Allah to confer] blessing upon him and ask [Allah to grant him] peace.","verse_explanation":"Commands a constant connection of love and gratitude toward the Messenger, identifying it as an activity shared by God and the angels.","scholars_opinions":[{"scholar":"Al-Sadi","opinion":"Explains that God's 'Salat' on the Prophet is His praise for him in the highest assembly, while the angels' 'Salat' is seeking his elevation."},{"scholar":"Ibn al-Qayyim","opinion":"In his book 'Jala' al-Afham,' he argues that sending blessings on the Prophet is a means for the believer to receive blessings back from God tenfold."},{"scholar":"Habib Ali al-Jifri","opinion":"Describes this as the 'Umbilical Cord of Love'—it keeps the heart of the believer nourished by the Prophetic light even in his physical absence."}]},{"id_number":94,"verse":"39:53","surah_name":"Az-Zumar","quran_text":"قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنْفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ","english_meaning":"Say, 'O My servants who have transgressed against themselves [by sinning], do not despair of the mercy of Allah...'","verse_explanation":"Often called the 'Most Hopeful Verse' in the Quran, it offers a blank slate to anyone, no matter the gravity of their past mistakes.","scholars_opinions":[{"scholar":"Abdullah ibn Mas'ud","opinion":"Said: 'This is the verse in the Book of Allah that provides the greatest relief for the heart.'"},{"scholar":"Ibn Kathir","opinion":"Emphasizes that 'transgressed against themselves' implies that the sin only hurts the sinner, not God, and He is waiting to heal the self-inflicted wound."},{"scholar":"Fethullah Gülen","opinion":"Notes that the address 'O My servants' is kept even for the sinners, showing that the bond of 'belonging' to God is never severed by a mistake."}]},{"id_number":95,"verse":"40:60","surah_name":"Ghafir","quran_text":"وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ","english_meaning":"And your Lord says, 'Call upon Me; I will respond to you.'","verse_explanation":"A direct, unconditional promise from the Creator to the creature, making the act of 'asking' the highest form of worship.","scholars_opinions":[{"scholar":"Al-Baghawi","opinion":"Quotes the Prophet: 'Dua (supplication) is worship itself,' because it demonstrates the ultimate humility and recognition of Sovereignty."},{"scholar":"Ibn Taymiyyah","opinion":"Argues that if God didn't want to give, He wouldn't have inspired the person to ask; the impulse to pray is itself a sign of an impending gift."},{"scholar":"Yasir Qadhi","opinion":"Notes that 'I will respond' is a guarantee, but the timing and nature of the response are according to God’s wisdom, not our whims."}]},{"id_number":96,"verse":"41:34","surah_name":"Fussilat","quran_text":"وَلَا تَسْتَوِي الْحَسَنَةُ وَلَا السَّيِّئَةُ ۚ ادْفَعْ بِالَّتِي هِيَ أَحْسَنُ","english_meaning":"And not equal are the good deed and the bad. Repel [evil] by that [deed] which is better...","verse_explanation":"A masterclass in conflict resolution: turning an enemy into a friend through the unexpected use of kindness.","scholars_opinions":[{"scholar":"Ibn Abbas","opinion":"States that 'that which is better' refers to showing patience when someone is angry and forgiveness when someone is oppressive."},{"scholar":"Al-Razi","opinion":"Points out that 'repelling' implies an active force—kindness is not passive; it is a spiritual 'move' that disarms the aggressor."},{"scholar":"Hamza Yusuf","opinion":"Describes this as 'Moral Judo'—using the momentum of the other person’s hate to flip the situation into one of reconciliation."}]},{"id_number":97,"verse":"48:4","surah_name":"Al-Fath","quran_text":"هُوَ الَّذِي أَنْزَلَ السَّكِينَةَ فِي قُلُوبِ الْمُؤْمِنِينَ","english_meaning":"It is He who sent down tranquility into the hearts of the believers...","verse_explanation":"Defines 'Sakina' (Tranquility) as a Divinely-sent state of calm that overrides environmental chaos and internal anxiety.","scholars_opinions":[{"scholar":"Ibn al-Qayyim","opinion":"Describes Sakina as a 'light' that descends on the heart, giving it the strength to remain still when everyone else is trembling."},{"scholar":"Al-Qurtubi","opinion":"Notes that this was revealed in the context of the Treaty of Hudaybiyyah, where the believers were under immense stress, proving Sakina is for times of crisis."},{"scholar":"Nouman Ali Khan","opinion":"Focuses on 'sent down' (Anzala), implying that peace of mind is not something you can manufacture; it is a gift you must ask for."}]},{"id_number":98,"verse":"50:16","surah_name":"Qaf","quran_text":"وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ","english_meaning":"...and We are closer to him than [his] jugular vein.","verse_explanation":"A powerful anatomical metaphor for Divine Immanence—God is more essential to the human's existence than their own blood supply.","scholars_opinions":[{"scholar":"Al-Tabari","opinion":"Explains this closeness in terms of knowledge: God knows what you will think even before the thought fully forms in your mind."},{"scholar":"Ibn Arabi","opinion":"Takes a metaphysical view, arguing that the 'closeness' is not spatial, but existential; God is the 'Reality' (Al-Haqq) that sustains the soul."},{"scholar":"Sahl al-Tustari","opinion":"Suggests that if God is closer to you than your own vein, then seeking Him 'outside' yourself is the ultimate spiritual misunderstanding."}]},{"id_number":99,"verse":"55:60","surah_name":"Ar-Rahman","quran_text":"هَلْ جَزَاءُ الْإِحْسَانِ إِلَّا الْإِحْسَانُ","english_meaning":"Is the reward for excellence [anything] but excellence?","verse_explanation":"A rhetorical question establishing the 'Law of Reciprocity' in the universe: beauty attracts beauty, and goodness results in goodness.","scholars_opinions":[{"scholar":"Ibn Kathir","opinion":"Interprets this as: 'Is the reward for the one who did good in the world anything other than God doing good to them in the Hereafter?'"},{"scholar":"Al-Alusi","opinion":"Suggests that 'Ihsan' from the human side is 'sincerity,' and 'Ihsan' from God's side is 'Vision' (the opportunity to see His light)."},{"scholar":"Muhammad Iqbal","opinion":"Sees this as the 'Cosmic Echo'—the universe is designed to respond to the quality of human action with a corresponding quality of result."}]},{"id_number":100,"verse":"94:6","surah_name":"Ash-Sharh","quran_text":"إِنَّ مَعَ الْعُسْرِ يُسْرًا","english_meaning":"Indeed, with hardship [will be] ease.","verse_explanation":"The ultimate comfort for the suffering: hardship and ease are not sequential, but coexist simultaneously.","scholars_opinions":[{"scholar":"Ibn Abbas","opinion":"Famously noted the grammar: 'Al-Usr' (the hardship) is definite (singular), while 'Yusran' (ease) is indefinite (plural). Therefore, one hardship will never overcome two eases."},{"scholar":"Al-Razi","opinion":"Argues that 'with' (ma'a) means the ease is 'hidden' inside the hardship, like a seed inside a tough shell; they arrive together."},{"scholar":"Hamza Yusuf","opinion":"Describes this as the 'Relativity of Suffering'—no matter how dark the moment, the mechanisms for relief and growth are already present in the heart."}]}];
window._dbgCheckpoints['qt_after_data']=true;
var qtState = lsGet('dash_qt',{});
if(!qtState.history)qtState.history=[];
if(!qtState.currentId)qtState.currentId=null;
if(!qtState.currentDate)qtState.currentDate=null;
if(!qtState.readToday)qtState.readToday=false;
if(!qtState._tab)qtState._tab='today';
if(!qtState._expanded)qtState._expanded=false;
function qtSave(){ lsSet('dash_qt',qtState); }

// todayKey() → now uses global todayKey()

function qtPickRandom(){
  if(!QT_DATA||!QT_DATA.length) return null;
  var pick = QT_DATA[Math.floor(Math.random()*QT_DATA.length)];
  qtState.currentId = pick.id_number;
  qtState.currentDate = todayKey();
  qtState.readToday = false;
  qtState._expanded = false;
  qtSave();
  return pick;
}

function qtCurrent(){
  if(!QT_DATA) return null;
  var today = todayKey();
  if(qtState.currentId && qtState.currentDate === today){
    var v = QT_DATA.find(function(x){ return x.id_number===qtState.currentId; });
    if(v) return v;
  }
  return qtPickRandom();
}

function qtMarkRead(v){
  var today = todayKey();
  // Add to history if not already there for today
  var alreadyLogged = qtState.history.some(function(h){ return h.date===today && h.id===v.id_number; });
  if(!alreadyLogged){
    qtState.history.unshift({id:v.id_number, date:today, surah:v.surah_name, verse:v.verse});
    if(qtState.history.length>200)qtState.history=qtState.history.slice(0,200);
  }
  qtState.readToday = true;
  qtSave();
  qtRender();
  if(typeof hap==='function') hap(HAP.check);
}

function qtCopyToClipboard(v){
  var txt = v.surah_name+' ('+v.verse+')\n\n'+v.quran_text+'\n\n'+'"'+v.english_meaning+'"\n\n'+v.verse_explanation+'\n\n';
  if(navigator.clipboard)navigator.clipboard.writeText(txt).catch(function(){var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);});
  else{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}
}

function qtRenderVerse(v, expanded, showMarkRead){
  var h='';
  // Reference row
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">';
  h+='<div style="flex:1"><div style="font-size:var(--t-base);color:var(--ca);letter-spacing:1px;font-family:monospace">'+v.surah_name+'</div>';
  h+='<div class="dim-9">'+v.verse+'</div></div>';
  h+='<button data-qtcopy="1" style="background:transparent;border:1px solid var(--c-gold-dim);color:rgba(255,204,0,.5);font-family:monospace;font-size:var(--t-xs);padding:4px 10px;cursor:pointer">📋</button>';
  h+='</div>';
  // Arabic
  h+='<div style="font-size:var(--t-body);color:var(--ca);text-align:right;line-height:1.8;margin-bottom:10px;font-family:serif;direction:rtl">'+v.quran_text+'</div>';
  // Meaning
  h+='<div style="font-size:var(--t-md);color:var(--text);font-style:italic;margin-bottom:10px;line-height:1.6;border-left:2px solid rgba(255,204,0,.3);padding-left:10px">"'+v.english_meaning+'"</div>';
  // Explanation
  h+='<div style="font-size:var(--t-base);color:var(--dim);line-height:1.7;margin-bottom:10px">'+v.verse_explanation+'</div>';
  // Scholars — always shown, each with a unique tinted background
  if(v.scholars_opinions&&v.scholars_opinions.length){
    var scholarShades=[
      'rgba(255,204,0,.06)','rgba(80,200,255,.06)','rgba(180,130,255,.06)',
      'rgba(80,250,123,.06)','rgba(255,130,180,.06)','rgba(255,160,80,.06)'
    ];
    var scholarBorders=[
      'rgba(255,204,0,.15)','rgba(80,200,255,.15)','rgba(180,130,255,.15)',
      'rgba(80,250,123,.15)','rgba(255,130,180,.15)','rgba(255,160,80,.15)'
    ];
    var scholarNameCols=[
      '#ffcc00','#50c8ff','#b482ff',
      '#50fa7b','#ff82b4','#ffa050'
    ];
    h+='<div class="label-dim">SCHOLARS</div>';
    v.scholars_opinions.forEach(function(s,si){
      var shade=scholarShades[si%scholarShades.length];
      var border=scholarBorders[si%scholarBorders.length];
      var nameCol=scholarNameCols[si%scholarNameCols.length];
      h+='<div style="padding:10px 12px;margin-bottom:6px;border:1px solid '+border+';background:'+shade+';border-left:3px solid '+nameCol+'">';
      h+='<div style="font-size:var(--t-xs);color:'+nameCol+';letter-spacing:1px;margin-bottom:5px;font-family:monospace">'+s.scholar+'</div>';
      h+='<div style="font-size:var(--t-base);color:rgba(255,255,255,.75);line-height:1.7">'+s.opinion+'</div>';
      h+='</div>';
    });
  }
  // Mark as read
  if(showMarkRead){
    h+='<button data-qtread="1" style="width:100%;margin-top:8px;padding:10px;background:rgba(255,204,0,.06);border:1px solid rgba(255,204,0,.3);color:var(--ca);font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:1px">✓ MARK AS READ</button>';
  }
  return h;
}

function qtRender(){
  var el = document.getElementById('qtafsir-body');
  if(!el) return;

  if(!QT_DATA){
    el.innerHTML='<div style="font-size:var(--t-base);color:var(--dim);text-align:center;padding:20px 0">⏳ Loading...</div>';
    setTimeout(qtRender,500); return;
  }

  if(!qtState)qtState={};
  if(!qtState.history)qtState.history=[];
  if(!qtState._tab)qtState._tab='today';

  var tab = qtState._tab||'today';
  var h='';

  // Tabs
  h+='<div style="display:flex;gap:5px;margin-bottom:12px">';
  [{t:'today',l:'TODAY'},{t:'history',l:'HISTORY'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-qttab="'+x.t+'" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid '+(a?'rgba(255,204,0,.5)':'var(--c-border)')+';color:'+(a?'var(--ca)':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  // Progress bar
  var qtTotal=QT_DATA?QT_DATA.length:100;
  var qtRead=(qtState.history||[]).length;
  var qtPct=Math.round(qtRead/qtTotal*100);
  h+='<div style="margin-bottom:12px">';
  h+='<div style="display:flex;justify-content:space-between;font-size:var(--t-xs);color:var(--dim);margin-bottom:4px">';
  h+='<span>'+qtRead+' / '+qtTotal+' tafsir read</span>';
  h+='<span style="color:var(--ca)">'+qtPct+'%</span>';
  h+='</div>';
  h+='<div style="height:4px;background:rgba(255,255,255,.06);border-radius:2px">';
  h+='<div style="height:100%;width:'+qtPct+'%;background:var(--ca);border-radius:2px;transition:width .4s"></div>';
  h+='</div></div>';

  if(tab==='today'){
    var v = qtCurrent();
    if(!v){h+='<div class="dim-11">No verse found.</div>';}
    else if(qtState.readToday){
      h+=qtRenderVerse(v, !!qtState._expanded, false);
      h+='<div style="margin-top:10px;padding:8px 12px;border:1px solid rgba(255,204,0,.2);background:rgba(255,204,0,.04);display:flex;align-items:center;justify-content:center;gap:8px">';
      h+='<span style="color:var(--ca)">✓</span><span style="font-size:var(--t-sm);color:var(--ca)">Read for today</span><span style="font-size:var(--t-xs);color:var(--dim)">'+v.surah_name+' · '+v.verse+'</span>';
      h+='</div>';
    } else {
      h+=qtRenderVerse(v, !!qtState._expanded, true);
    }
  } else {
    // History tab
    if(!qtState.history.length){
      h+='<div style="font-size:var(--t-base);color:var(--dim);padding:20px 0;text-align:center">No history yet.<br>Mark verses as read to build your history.</div>';
    } else {
      qtState.history.forEach(function(entry,i){
        var v2=QT_DATA.find(function(x){return x.id_number===entry.id;});
        var open=qtState._histOpen===i;
        h+='<div style="border-bottom:1px solid var(--c-ghost);padding:8px 0">';
        h+='<div data-qthistopen="'+i+'" style="display:flex;align-items:center;gap:8px;cursor:pointer">';
        h+='<div style="flex:1"><div style="font-size:var(--t-base);color:var(--ca)">'+entry.surah+'</div>';
        h+='<div class="dim-9">'+entry.verse+' · '+entry.date+'</div></div>';
        h+='<span style="color:var(--dim);font-size:var(--t-md)">'+(open?'▲':'▼')+'</span>';
        h+='</div>';
        if(open&&v2){
          h+='<div style="margin-top:10px">'+qtRenderVerse(v2,false,false)+'</div>';
        }
        h+='</div>';
      });
    }
  }

  el.innerHTML=h;

  // Wire tabs
  el.querySelectorAll('[data-qttab]').forEach(function(b){
    b.onclick=function(){qtState._tab=this.getAttribute('data-qttab');qtSave();qtRender();};
  });


  // Wire copy
  el.querySelectorAll('[data-qtcopy]').forEach(function(btn){
    btn.onclick=function(){
      var v=qtCurrent();if(!v)return;
      qtCopyToClipboard(v);
      this.textContent='✓';
      var _b=this;setTimeout(function(){_b.textContent='📋';},1800);
      safeHap(HAP.soft);
    };
  });

  // Wire mark as read
  var readBtn=el.querySelector('[data-qtread]');
  if(readBtn)readBtn.onclick=function(){var v=qtCurrent();if(v)qtMarkRead(v);};

  // Wire history expand
  el.querySelectorAll('[data-qthistopen]').forEach(function(row){
    row.onclick=function(){
      var i=parseInt(this.getAttribute('data-qthistopen'));
      qtState._histOpen=(qtState._histOpen===i?null:i);
      qtSave();qtRender();
    };
  });
}

window.dbgQt=function(){
  var el=document.getElementById('qtafsir-body');
  window._dbgErrors.push('[QT] body:'+!!el+' QT_DATA:'+(typeof QT_DATA!=='undefined'?QT_DATA.length:'UNDEF')+' qtState:'+(typeof qtState)+' qtRender:'+(typeof qtRender));
  if(typeof window._dbgUpdate==='function')window._dbgUpdate();
  else if(typeof dbgUpdate==='function')dbgUpdate();
  if(typeof qtRender==='function')try{qtRender();}catch(e){window._dbgErrors.push('[QT ERR] '+e.message);if(typeof dbgUpdate==='function')dbgUpdate();}
};

setTimeout(function(){qtRender();},600);
// ── END QURAN TAFSIR ──

// ── QUEST ──
var QUEST_DATA={"title":"Memorize Juz Amma","steps":[{"step":1,"phase":"Preparation","task":"Find a reliable recitation of Juz Amma. Sheikh Mishary Rashid Al-Afasy or Al-Husary (Muallim) are great for memorization. Download or bookmark it now."},{"step":2,"phase":"Preparation","task":"Set a daily memorization time. Even 15 minutes after Fajr is enough. Consistency beats duration. Decide the time now."},{"step":3,"phase":"Preparation","task":"Get a Quran or open a Quran app. Use the same mushaf every session — your brain maps the page layout. Recommended: Quran.com."},{"step":4,"phase":"Listen","surah":"Al-Asr","surah_num":103,"task":"Listen to Al-Asr (Surah 103, 3 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":5,"phase":"Repeat","surah":"Al-Asr","surah_num":103,"task":"Repeat Al-Asr (Surah 103) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":6,"phase":"Memorize","surah":"Al-Asr","surah_num":103,"task":"Memorize Al-Asr (Surah 103). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":7,"phase":"Listen","surah":"Al-Kawthar","surah_num":108,"task":"Listen to Al-Kawthar (Surah 108, 3 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":8,"phase":"Repeat","surah":"Al-Kawthar","surah_num":108,"task":"Repeat Al-Kawthar (Surah 108) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":9,"phase":"Memorize","surah":"Al-Kawthar","surah_num":108,"task":"Memorize Al-Kawthar (Surah 108). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":10,"phase":"Listen","surah":"An-Nasr","surah_num":110,"task":"Listen to An-Nasr (Surah 110, 3 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":11,"phase":"Repeat","surah":"An-Nasr","surah_num":110,"task":"Repeat An-Nasr (Surah 110) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":12,"phase":"Memorize","surah":"An-Nasr","surah_num":110,"task":"Memorize An-Nasr (Surah 110). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":13,"phase":"Listen","surah":"Quraysh","surah_num":106,"task":"Listen to Quraysh (Surah 106, 4 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":14,"phase":"Repeat","surah":"Quraysh","surah_num":106,"task":"Repeat Quraysh (Surah 106) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":15,"phase":"Memorize","surah":"Quraysh","surah_num":106,"task":"Memorize Quraysh (Surah 106). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":16,"phase":"Listen","surah":"Al-Ikhlas","surah_num":112,"task":"Listen to Al-Ikhlas (Surah 112, 4 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":17,"phase":"Repeat","surah":"Al-Ikhlas","surah_num":112,"task":"Repeat Al-Ikhlas (Surah 112) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":18,"phase":"Memorize","surah":"Al-Ikhlas","surah_num":112,"task":"Memorize Al-Ikhlas (Surah 112). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":19,"phase":"Listen","surah":"Al-Qadr","surah_num":97,"task":"Listen to Al-Qadr (Surah 97, 5 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":20,"phase":"Repeat","surah":"Al-Qadr","surah_num":97,"task":"Repeat Al-Qadr (Surah 97) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":21,"phase":"Memorize","surah":"Al-Qadr","surah_num":97,"task":"Memorize Al-Qadr (Surah 97). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":22,"phase":"Listen","surah":"Al-Fil","surah_num":105,"task":"Listen to Al-Fil (Surah 105, 5 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":23,"phase":"Repeat","surah":"Al-Fil","surah_num":105,"task":"Repeat Al-Fil (Surah 105) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":24,"phase":"Memorize","surah":"Al-Fil","surah_num":105,"task":"Memorize Al-Fil (Surah 105). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":25,"phase":"Listen","surah":"Al-Masad","surah_num":111,"task":"Listen to Al-Masad (Surah 111, 5 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":26,"phase":"Repeat","surah":"Al-Masad","surah_num":111,"task":"Repeat Al-Masad (Surah 111) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":27,"phase":"Memorize","surah":"Al-Masad","surah_num":111,"task":"Memorize Al-Masad (Surah 111). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":28,"phase":"Listen","surah":"Al-Falaq","surah_num":113,"task":"Listen to Al-Falaq (Surah 113, 5 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":29,"phase":"Repeat","surah":"Al-Falaq","surah_num":113,"task":"Repeat Al-Falaq (Surah 113) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":30,"phase":"Memorize","surah":"Al-Falaq","surah_num":113,"task":"Memorize Al-Falaq (Surah 113). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":31,"phase":"Listen","surah":"Al-Kafirun","surah_num":109,"task":"Listen to Al-Kafirun (Surah 109, 6 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":32,"phase":"Repeat","surah":"Al-Kafirun","surah_num":109,"task":"Repeat Al-Kafirun (Surah 109) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":33,"phase":"Memorize","surah":"Al-Kafirun","surah_num":109,"task":"Memorize Al-Kafirun (Surah 109). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":34,"phase":"Listen","surah":"An-Nas","surah_num":114,"task":"Listen to An-Nas (Surah 114, 6 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":35,"phase":"Repeat","surah":"An-Nas","surah_num":114,"task":"Repeat An-Nas (Surah 114) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":36,"phase":"Memorize","surah":"An-Nas","surah_num":114,"task":"Memorize An-Nas (Surah 114). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":37,"phase":"Listen","surah":"Al-Ma'un","surah_num":107,"task":"Listen to Al-Ma'un (Surah 107, 7 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":38,"phase":"Repeat","surah":"Al-Ma'un","surah_num":107,"task":"Repeat Al-Ma'un (Surah 107) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":39,"phase":"Memorize","surah":"Al-Ma'un","surah_num":107,"task":"Memorize Al-Ma'un (Surah 107). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":40,"phase":"Listen","surah":"Ash-Sharh","surah_num":94,"task":"Listen to Ash-Sharh (Surah 94, 8 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":41,"phase":"Repeat","surah":"Ash-Sharh","surah_num":94,"task":"Repeat Ash-Sharh (Surah 94) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":42,"phase":"Memorize","surah":"Ash-Sharh","surah_num":94,"task":"Memorize Ash-Sharh (Surah 94). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":43,"phase":"Listen","surah":"At-Tin","surah_num":95,"task":"Listen to At-Tin (Surah 95, 8 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":44,"phase":"Repeat","surah":"At-Tin","surah_num":95,"task":"Repeat At-Tin (Surah 95) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":45,"phase":"Memorize","surah":"At-Tin","surah_num":95,"task":"Memorize At-Tin (Surah 95). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":46,"phase":"Listen","surah":"Al-Bayyinah","surah_num":98,"task":"Listen to Al-Bayyinah (Surah 98, 8 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":47,"phase":"Repeat","surah":"Al-Bayyinah","surah_num":98,"task":"Repeat Al-Bayyinah (Surah 98) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":48,"phase":"Memorize","surah":"Al-Bayyinah","surah_num":98,"task":"Memorize Al-Bayyinah (Surah 98). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":49,"phase":"Listen","surah":"Az-Zalzalah","surah_num":99,"task":"Listen to Az-Zalzalah (Surah 99, 8 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":50,"phase":"Repeat","surah":"Az-Zalzalah","surah_num":99,"task":"Repeat Az-Zalzalah (Surah 99) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":51,"phase":"Memorize","surah":"Az-Zalzalah","surah_num":99,"task":"Memorize Az-Zalzalah (Surah 99). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":52,"phase":"Listen","surah":"At-Takathur","surah_num":102,"task":"Listen to At-Takathur (Surah 102, 8 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":53,"phase":"Repeat","surah":"At-Takathur","surah_num":102,"task":"Repeat At-Takathur (Surah 102) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":54,"phase":"Memorize","surah":"At-Takathur","surah_num":102,"task":"Memorize At-Takathur (Surah 102). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":55,"phase":"Listen","surah":"Al-Humazah","surah_num":104,"task":"Listen to Al-Humazah (Surah 104, 9 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":56,"phase":"Repeat","surah":"Al-Humazah","surah_num":104,"task":"Repeat Al-Humazah (Surah 104) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":57,"phase":"Memorize","surah":"Al-Humazah","surah_num":104,"task":"Memorize Al-Humazah (Surah 104). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":58,"phase":"Listen","surah":"Ad-Duha","surah_num":93,"task":"Listen to Ad-Duha (Surah 93, 11 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":59,"phase":"Repeat","surah":"Ad-Duha","surah_num":93,"task":"Repeat Ad-Duha (Surah 93) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":60,"phase":"Memorize","surah":"Ad-Duha","surah_num":93,"task":"Memorize Ad-Duha (Surah 93). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":61,"phase":"Listen","surah":"Al-Adiyat","surah_num":100,"task":"Listen to Al-Adiyat (Surah 100, 11 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":62,"phase":"Repeat","surah":"Al-Adiyat","surah_num":100,"task":"Repeat Al-Adiyat (Surah 100) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":63,"phase":"Memorize","surah":"Al-Adiyat","surah_num":100,"task":"Memorize Al-Adiyat (Surah 100). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":64,"phase":"Listen","surah":"Al-Qari'ah","surah_num":101,"task":"Listen to Al-Qari'ah (Surah 101, 11 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":65,"phase":"Repeat","surah":"Al-Qari'ah","surah_num":101,"task":"Repeat Al-Qari'ah (Surah 101) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":66,"phase":"Memorize","surah":"Al-Qari'ah","surah_num":101,"task":"Memorize Al-Qari'ah (Surah 101). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":67,"phase":"Listen","surah":"Ash-Shams","surah_num":91,"task":"Listen to Ash-Shams (Surah 91, 15 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":68,"phase":"Repeat","surah":"Ash-Shams","surah_num":91,"task":"Repeat Ash-Shams (Surah 91) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":69,"phase":"Memorize","surah":"Ash-Shams","surah_num":91,"task":"Memorize Ash-Shams (Surah 91). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":70,"phase":"Listen","surah":"At-Tariq","surah_num":86,"task":"Listen to At-Tariq (Surah 86, 17 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":71,"phase":"Repeat","surah":"At-Tariq","surah_num":86,"task":"Repeat At-Tariq (Surah 86) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":72,"phase":"Memorize","surah":"At-Tariq","surah_num":86,"task":"Memorize At-Tariq (Surah 86). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":73,"phase":"Listen","surah":"Al-Infitar","surah_num":82,"task":"Listen to Al-Infitar (Surah 82, 19 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":74,"phase":"Repeat","surah":"Al-Infitar","surah_num":82,"task":"Repeat Al-Infitar (Surah 82) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":75,"phase":"Memorize","surah":"Al-Infitar","surah_num":82,"task":"Memorize Al-Infitar (Surah 82). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":76,"phase":"Listen","surah":"Al-Ala","surah_num":87,"task":"Listen to Al-Ala (Surah 87, 19 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":77,"phase":"Repeat","surah":"Al-Ala","surah_num":87,"task":"Repeat Al-Ala (Surah 87) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":78,"phase":"Memorize","surah":"Al-Ala","surah_num":87,"task":"Memorize Al-Ala (Surah 87). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":79,"phase":"Listen","surah":"Al-Alaq","surah_num":96,"task":"Listen to Al-Alaq (Surah 96, 19 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":80,"phase":"Repeat","surah":"Al-Alaq","surah_num":96,"task":"Repeat Al-Alaq (Surah 96) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":81,"phase":"Memorize","surah":"Al-Alaq","surah_num":96,"task":"Memorize Al-Alaq (Surah 96). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":82,"phase":"Listen","surah":"Al-Balad","surah_num":90,"task":"Listen to Al-Balad (Surah 90, 20 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":83,"phase":"Repeat","surah":"Al-Balad","surah_num":90,"task":"Repeat Al-Balad (Surah 90) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":84,"phase":"Memorize","surah":"Al-Balad","surah_num":90,"task":"Memorize Al-Balad (Surah 90). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":85,"phase":"Listen","surah":"Al-Layl","surah_num":92,"task":"Listen to Al-Layl (Surah 92, 21 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":86,"phase":"Repeat","surah":"Al-Layl","surah_num":92,"task":"Repeat Al-Layl (Surah 92) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":87,"phase":"Memorize","surah":"Al-Layl","surah_num":92,"task":"Memorize Al-Layl (Surah 92). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":88,"phase":"Listen","surah":"Al-Buruj","surah_num":85,"task":"Listen to Al-Buruj (Surah 85, 22 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":89,"phase":"Repeat","surah":"Al-Buruj","surah_num":85,"task":"Repeat Al-Buruj (Surah 85) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":90,"phase":"Memorize","surah":"Al-Buruj","surah_num":85,"task":"Memorize Al-Buruj (Surah 85). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":91,"phase":"Listen","surah":"Al-Inshiqaq","surah_num":84,"task":"Listen to Al-Inshiqaq (Surah 84, 25 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":92,"phase":"Repeat","surah":"Al-Inshiqaq","surah_num":84,"task":"Repeat Al-Inshiqaq (Surah 84) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":93,"phase":"Memorize","surah":"Al-Inshiqaq","surah_num":84,"task":"Memorize Al-Inshiqaq (Surah 84). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":94,"phase":"Listen","surah":"Al-Ghashiyah","surah_num":88,"task":"Listen to Al-Ghashiyah (Surah 88, 26 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":95,"phase":"Repeat","surah":"Al-Ghashiyah","surah_num":88,"task":"Repeat Al-Ghashiyah (Surah 88) out loud with the audio, ayah by ayah. Pause after each and echo it back. Do this 3 times through."},{"step":96,"phase":"Memorize","surah":"Al-Ghashiyah","surah_num":88,"task":"Memorize Al-Ghashiyah (Surah 88). Cover the text, recite from memory, check yourself. Repeat until you can do the full surah once without looking."},{"step":97,"phase":"Listen","surah":"At-Takwir","surah_num":81,"task":"Listen to At-Takwir (Surah 81, 29 ayahs) 5 times in a row. Don't try to memorize yet. Just absorb the melody and rhythm."},{"step":98,"phase":"Full Review","task":"Recite the last 10 surahs (Al-Kawthar to An-Nas) from memory in one sitting. These are your foundation — recite with confidence."},{"step":99,"phase":"Full Review","task":"Recite the middle surahs (Ad-Duha to Al-Adiyat) from memory. Take your time. It is okay to pause and recall."},{"step":100,"phase":"Complete","task":"Recite all of Juz Amma from An-Naba to An-Nas from memory. Start with Bismillah. You have been building to this moment. This is it."}]};
var questState = lsGet('dash_quest',{});
if(!questState.currentStep)questState.currentStep=1;
if(!questState.completedSteps)questState.completedSteps=[];
if(!questState._tab)questState._tab='current';
function questSave(){ lsSet('dash_quest',questState); }

function questConfetti(sourceEl){
  var rect=sourceEl?sourceEl.getBoundingClientRect():{top:window.innerHeight/2,left:window.innerWidth/2,width:0,height:0};
  var x=rect.left+rect.width/2;
  var y=rect.top+rect.height/2;
  var colors=['#ffa500','#ffcc00','#ff6b6b','#50fa7b','#8be9fd','#ff79c6','#bd93f9'];
  for(var i=0;i<40;i++){
    var el=document.createElement('div');
    el.style.cssText='position:fixed;pointer-events:none;z-index:9999;width:'+(6+Math.random()*6)+'px;height:'+(6+Math.random()*6)+'px;background:'+colors[Math.floor(Math.random()*colors.length)]+';border-radius:'+(Math.random()>0.5?'50%':'2px')+';left:'+x+'px;top:'+y+'px;transform:translate(-50%,-50%)';
    document.body.appendChild(el);
    var angle=Math.random()*Math.PI*2;
    var speed=80+Math.random()*200;
    var vx=Math.cos(angle)*speed;
    var vy=Math.sin(angle)*speed-150;
    var gravity=300;
    var start=null;
    (function(el,vx,vy){
      function frame(ts){
        if(!start)start=ts;
        var t=(ts-start)/1000;
        var px=x+vx*t;
        var py=y+vy*t+0.5*gravity*t*t;
        var alpha=Math.max(0,1-t*1.5);
        el.style.left=px+'px';
        el.style.top=py+'px';
        el.style.opacity=alpha;
        if(alpha>0)requestAnimationFrame(frame);
        else el.remove();
      }
      requestAnimationFrame(frame);
    })(el,vx,vy);
  }
}

function questRender(){
  var el = document.getElementById('quest-body');
  var badge = document.getElementById('quest-badge');
  if(!el) return;

  var steps = QUEST_DATA.steps;
  var current = questState.currentStep || 1;
  var completed = questState.completedSteps || [];
  var tab = questState._tab || 'current';

  if(badge){
    badge.textContent = 'Step ' + current + '/100';
  }

  var h = '';

  // Tab bar
  h += '<div style="display:flex;gap:5px;margin-bottom:14px">';
  [{t:'current',l:'CURRENT'},{t:'log',l:'COMPLETED ('+completed.length+')'}].forEach(function(x){
    var a = tab===x.t;
    h += '<span data-questtab="'+x.t+'" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid '+(a?'rgba(255,165,0,.5)':'var(--c-border)')+';color:'+(a?'#ffa500':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h += '</div>';

  if(tab === 'current'){
    if(current > 100){
      h += '<div style="text-align:center;padding:30px 0">';
      h += '<div style="font-size:40px;margin-bottom:10px">🏆</div>';
      h += '<div style="font-size:var(--t-sub);color:#ffa500;font-family:monospace">QUEST COMPLETE</div>';
      h += '<div style="font-size:var(--t-base);color:var(--dim);margin-top:6px">You memorized Juz Amma</div>';
      h += '</div>';
    } else {
      var step = steps.find(function(s){ return s.step === current; });
      if(!step){ h += '<div style="color:var(--dim)">Step not found.</div>'; }
      else {
        // Progress bar
        var pct = Math.round((current-1)/100*100);
        h += '<div style="height:3px;background:var(--c-ghost);margin-bottom:14px">';
        h += '<div style="height:100%;width:'+pct+'%;background:#ffa500;transition:width .4s"></div>';
        h += '</div>';

        // Phase label
        h += '<div style="font-size:var(--t-xxs);color:rgba(255,165,0,.3);letter-spacing:1px;margin-bottom:4px">LEVEL 1 · JUZ AMMA MEMORIZATION</div>';
        h+='<div style="font-size:var(--t-xs);color:rgba(255,165,0,.5);letter-spacing:2px;margin-bottom:8px">'+step.phase.toUpperCase()+(step.surah?' · '+step.surah:'')+'</div>';

        // Step card
        h += '<div style="padding:20px 16px;border:1px solid rgba(255,165,0,.2);background:rgba(255,165,0,.04);margin-bottom:16px">';
        h += '<div style="font-size:var(--t-base);color:rgba(255,255,255,.4);margin-bottom:10px;letter-spacing:1px">STEP '+current+' OF 100</div>';
        h += '<div style="font-size:var(--t-sub);color:var(--text);line-height:1.7">'+step.task+'</div>';
        h += '</div>';

        // Done button
        // Undo last step
        var lastDone = questState.completedSteps && questState.completedSteps.length > 0;
        if(lastDone){
          var lastStep = questState.completedSteps[questState.completedSteps.length-1];
          var lastTime = new Date(lastStep.completedAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
          h += '<button id="quest-undo-btn" style="width:100%;padding:8px;background:transparent;border:1px solid rgba(255,165,0,.15);color:rgba(255,165,0,.4);font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px;margin-bottom:6px">↩ UNDO LAST (step '+lastStep.step+' · '+lastTime+')</button>';
        }
        h += '<button id="quest-done-btn" style="width:100%;padding:14px;background:rgba(255,165,0,.08);border:1px solid rgba(255,165,0,.4);color:#ffa500;font-family:monospace;font-size:var(--t-lg);cursor:pointer;letter-spacing:2px">✓ DONE</button>';
      }
    }
  } else {
    // Completed log
    if(!completed.length){
      h += '<div style="font-size:var(--t-base);color:var(--dim);padding:20px 0;text-align:center">No steps completed yet.</div>';
    } else {
      // Show most recent first
      var sorted = completed.slice().reverse();
      sorted.forEach(function(entry){
        var s = steps.find(function(x){ return x.step===entry.step; });
        var dateStr = new Date(entry.completedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        var timeStr = new Date(entry.completedAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
        h += '<div style="padding:10px 0;border-bottom:1px solid var(--c-ghost)">';
        h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">';
        h += '<span style="font-size:var(--t-sm);color:#ffa500;font-family:monospace;flex-shrink:0">Step '+entry.step+'</span>';
        h += '<span style="font-size:var(--t-xs);color:rgba(255,165,0,.4)">'+(s?s.phase.toUpperCase():'')+'</span>';
        h += '<span style="font-size:var(--t-xs);color:var(--dim);margin-left:auto">'+dateStr+' · '+timeStr+'</span>';
        h += '</div>';
        h += '<div style="font-size:var(--t-base);color:var(--dim);line-height:1.5">'+(s?s.task:'')+'</div>';
        h += '</div>';
      });
    }
  }

  el.innerHTML = h;

  // Wire tabs
  el.querySelectorAll('[data-questtab]').forEach(function(b){
    b.onclick=function(){ questState._tab=this.getAttribute('data-questtab'); questSave(); questRender(); };
  });

  // Wire done button
  var doneBtn = el.querySelector('#quest-done-btn');
  if(doneBtn){
    var questDoneFn = function(){
      // Confetti burst
      questConfetti(doneBtn);
      var now = new Date().toISOString();
      questState.completedSteps.push({ step: questState.currentStep, completedAt: now });
      questState.currentStep++;
      questSave();
      if(typeof hap==='function') hap(HAP.check);
      questRender();
    };
  var undoBtn = el.querySelector('#quest-undo-btn');
  if(undoBtn){
    undoBtn.onclick = function(){
      if(!questState.completedSteps||!questState.completedSteps.length)return;
      var last = questState.completedSteps.pop();
      questState.currentStep = last.step;
      questSave();
      safeHap(HAP.soft);
      questRender();
    };
  }
    var _qtX=0,_qtY=0;
    doneBtn.ontouchstart = function(e){ _qtX=e.touches[0].clientX; _qtY=e.touches[0].clientY; };
    var _gTXA2=0,_gTYA2=0;
    doneBtn.ontouchstart=function(e){_gTXA2=e.touches[0].clientX;_gTYA2=e.touches[0].clientY;};
    doneBtn.ontouchend = function(e){
      var dx=Math.abs(e.changedTouches[0].clientX-_qtX);
      var dy=Math.abs(e.changedTouches[0].clientY-_qtY);
      if(dx>8||dy>8)return; // was a scroll, ignore
      if(Math.abs(e.changedTouches[0].clientX-_gTXA2)>8||Math.abs(e.changedTouches[0].clientY-_gTYA2)>8)return;
      e.preventDefault(); e.stopPropagation();
      questDoneFn();
    };
    doneBtn.onclick = function(e){ if(e.detail===0)return; questDoneFn(); }; // mouse only, not synthetic
  }
}

window.addEventListener('load', function(){
  if(typeof questRender==='function') questRender();
});
// ── END QUEST ──

// ── AUTO SYNC FOR 1 HOUR ──
var _autoSyncTimer=null;
var _autoSyncInterval=null;
var _autoSyncEnd=0;

function sbStartAutoSync(){
  if(_autoSyncInterval)return; // already running
  _autoSyncEnd=Date.now()+60*60*1000; // 1 hour from now
  localStorage.setItem('dash_autosync_end',String(_autoSyncEnd));
  _sbDoAutoSync();
  _autoSyncInterval=setInterval(function(){
    if(Date.now()>=_autoSyncEnd){
      sbStopAutoSync();
      safeToast('Auto-sync ended after 1 hour');
      var cb=document.getElementById('sb-autosync-cb');
      if(cb)cb.checked=false;
      return;
    }
    _sbDoAutoSync();
  },10*60*1000); // every 10 minutes
  _sbUpdateAutoSyncStatus();
}

function sbStopAutoSync(){
  if(_autoSyncInterval){clearInterval(_autoSyncInterval);_autoSyncInterval=null;}
  _autoSyncEnd=0;
  localStorage.removeItem('dash_autosync_end');
  _sbUpdateAutoSyncStatus();
}

function _sbDoAutoSync(){
  var cfg=sbGetConfig();
  if(!cfg.url||!cfg.key||!cfg.account)return;
  sbPush&&sbPush(true); // silent push
  var _now=new Date();
  var _t=_now.getHours()+':'+String(_now.getMinutes()).padStart(2,'0');
  safeToast('☁ Auto-synced at '+_t);
}

function _sbUpdateAutoSyncStatus(){
  var el=document.getElementById('sb-autosync-status');
  if(!el)return;
  if(_autoSyncInterval&&_autoSyncEnd>Date.now()){
    var minsLeft=Math.ceil((_autoSyncEnd-Date.now())/60000);
    el.textContent='Active · '+minsLeft+' min remaining · next push in ~10 min';
    el.style.color='var(--cg)';
  } else {
    el.textContent='Pushes every 10 min for 60 min, then stops';
    el.style.color='var(--dim)';
  }
}

// Restore auto sync if page reloaded within the hour
window.addEventListener('load',function(){
  var savedEnd=parseInt(localStorage.getItem('dash_autosync_end')||'0');
  if(savedEnd>Date.now()){
    _autoSyncEnd=savedEnd;
    _autoSyncInterval=setInterval(function(){
      if(Date.now()>=_autoSyncEnd){
        sbStopAutoSync();
        safeToast('Auto-sync ended after 1 hour');
        var cb=document.getElementById('sb-autosync-cb');
        if(cb)cb.checked=false;
        return;
      }
      _sbDoAutoSync();
    },10*60*1000);
  }
});
// ── END AUTO SYNC ──

// ── END OF dashboard-1.js (Part 1 of 3) — continues in dashboard-2.js ──
