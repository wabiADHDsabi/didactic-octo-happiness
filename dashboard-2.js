// ── LOCAL UTILITY DEFINITIONS (always available, even before dash-1 loads) ──
function todayKey(){var n=new Date();if(n.getHours()<4)n=new Date(n.getTime()-864e5);return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');}
function localDateStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function todayKeyRaw(){ return localDateStr(new Date()); }
function lsGet(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.warn('lsSet failed:',k,e);}}
function safeHap(t){if(typeof hap==='function')hap(t);}
// ── END LOCAL UTILITIES ──

// ── dashboard-2.js ── Part 2 of 3 ── v14 ── BUILD 2026-06-11 ──
// Contains: pomodoro (maroon/blue SRS animation, haptics),
//           Islamic topics, writers den, weekend warrior,
//           weekly routines (Fri–Sun only), weekly review,
//           weekly summary (Sun+Mon), decision log, energy map,
//           life streaks, mood log (EST timezone), milestone,
//           settings, sort mode, background visuals, sync engine
// Requires dashboard-1.js to be loaded first
// Continues in dashboard-3.js

// ── POMODORO DAY-SCOPED PERSISTENCE ──
function pomoGetDayKey(){
  // Day rolls over at 4am
  var now=new Date();
  var rollover=new Date(now);
  rollover.setHours(4,0,0,0);
  if(now<rollover) rollover.setDate(rollover.getDate()-1); // before 4am = previous day
  return rollover.getFullYear()+'-'+String(rollover.getMonth()+1).padStart(2,'0')+'-'+String(rollover.getDate()).padStart(2,'0');
}

function pomoLoadDay(){
  if(!window.pomoState)return;
  var key=pomoGetDayKey();
  var saved=JSON.parse(localStorage.getItem('pomo_day_data')||'null');
  // Always load today's committed log from pomo_log_ as source of truth
  var committedLog=JSON.parse(localStorage.getItem('pomo_log_'+key)||'[]');
  if(saved&&saved.date===key){
    // Same day — restore, but use the longer of saved vs committed log
    var savedLog=saved.sessionLog||[];
    // Merge: union by ts, fall back to taking whichever is longer
    var merged=savedLog.length>=committedLog.length?savedLog:committedLog;
    if(savedLog.length&&committedLog.length&&savedLog.length!==committedLog.length){
      // Union by ts
      var tsMap={};
      savedLog.concat(committedLog).forEach(function(e){
        var k=e.ts||(e.mode||e.type)+':'+(e.mins||0);
        if(!tsMap[k])tsMap[k]=e;
      });
      merged=Object.values(tsMap).sort(function(a,b){return (a.ts||'')>(b.ts||'')?1:-1;});
    }
    pomoState.sessions=Math.max(saved.sessions||0, merged.filter(function(e){return (e.mode||e.type)==='work';}).length);
    pomoState.sessionLog=merged;
    // Restore active timer if one was running
    if(saved.activeTimer&&saved.activeTimer.remainSecs>0){
      var at=saved.activeTimer;
      pomoState.mode=at.mode||'work';
      pomoState.totalSecs=at.totalSecs||25*60;
      // Calculate elapsed since save
      var elapsed=at.startedAt?Math.round((Date.now()-at.startedAt)/1000):0;
      pomoState.remainSecs=Math.max(0,at.remainSecs-elapsed);
      // If timer was running and time remains, auto-resume
      if(elapsed<at.remainSecs){
        setTimeout(function(){pomoStartStop();},300);
      }
    }
  } else {
    // New day — fresh start
    pomoState.sessions=0;
    pomoState.sessionLog=[];
    pomoState.remainSecs=pomoState.totalSecs;
    localStorage.removeItem('pomo_day_data');
    // Also clear old keys
    localStorage.removeItem('pomo_sessions');
    localStorage.removeItem('pomo_session_log');
  }
  pomoRender();
}

function pomoSaveDayLog(){
  // Persist today's session log to a date-keyed entry for history
  // Preserve real ts from sessionLog — critical for energy map hour analysis
  var key='pomo_log_'+pomoGetDayKey();
  var log=pomoState.sessionLog.map(function(m){
    var mode=typeof m==='object'?m.mode:m;
    var mins=typeof m==='object'?m.mins:0;
    var ts=typeof m==='object'&&m.ts?m.ts:new Date().toISOString();
    return {type:mode,mins:mins,ts:ts};
  });
  localStorage.setItem(key,JSON.stringify(log));
}

function pomoSaveDay(includeTimer){
  var data={
    date:pomoGetDayKey(),
    sessions:pomoState.sessions,
    sessionLog:pomoState.sessionLog,
    activeTimer:null
  };
  if(includeTimer&&pomoState.running){
    data.activeTimer={
      mode:pomoState.mode,
      totalSecs:pomoState.totalSecs,
      remainSecs:pomoState.remainSecs,
      startedAt:Date.now()
    };
  } else if(!pomoState.running&&pomoState.remainSecs<pomoState.totalSecs&&pomoState.remainSecs>0){
    // Paused — save current position without startedAt so it doesn't auto-run
    data.activeTimer={
      mode:pomoState.mode,
      totalSecs:pomoState.totalSecs,
      remainSecs:pomoState.remainSecs,
      startedAt:null
    };
  }
  lsSet('pomo_day_data',data);
}


var pomoCurrentTab='timer';

function _tabSlide2(fromId,toId,toRight){var o=document.getElementById(fromId),n=document.getElementById(toId);if(!o||!n||o===n){if(n)n.style.display='';return;}var exitX=toRight?'-16px':'16px',enterX=toRight?'16px':'-16px';o.style.transition='opacity .2s ease,transform .2s ease';o.style.opacity='0';o.style.transform='translateX('+exitX+')';setTimeout(function(){o.style.display='none';o.style.transition='';o.style.opacity='';o.style.transform='';n.style.display='';n.style.opacity='0';n.style.transform='translateX('+enterX+')';requestAnimationFrame(function(){requestAnimationFrame(function(){n.style.transition='opacity .2s ease,transform .2s ease';n.style.opacity='';n.style.transform='';setTimeout(function(){n.style.transition='';},220);});});},180);}

var _pomoTabPrev='timer';
var _pomoOrder=['timer','log','stats'];
function pomoTab(tab){
  var prev=_pomoTabPrev;
  pomoCurrentTab=tab;_pomoTabPrev=tab;
  _pomoOrder.forEach(function(t){
    var btn=document.getElementById('ptab-'+t);
    if(btn)btn.classList.toggle('active',t===tab);
  });
  _tabSlide2('ppanel-'+prev,'ppanel-'+tab,_pomoOrder.indexOf(tab)>_pomoOrder.indexOf(prev));
  if(tab==='log')pomoRenderLog();
  if(tab==='stats')pomoRenderStats();
}

function pomoTrailSegment(m,idx,log){
  var workCount=log.slice(0,idx+1).filter(function(x){return x.type==='work';}).length;
  var breakCount=log.slice(0,idx+1).filter(function(x){return x.type==='break';}).length;
  if(m.type==='work') return '<span class="pomo-work-seg">['+workCount+']</span>';
  return '<span class="pomo-break-seg">('+breakCount+')</span>';
}

function pomoGetAllLog(){
  // Get all log entries from localStorage (keyed by date)
  var result={};
  for(var i=0;i<localStorage.length;i++){
    var k=localStorage.key(i);
    if(k&&k.startsWith('pomo_log_')){
      try{result[k.slice(9)]=JSON.parse(localStorage.getItem(k)||'[]');}catch(e){}
    }
  }
  // Also include today from pomoState
  var todayKey=pomoGetDayKey();
  if(pomoState.sessionLog&&pomoState.sessionLog.length){
    result[todayKey]=pomoState.sessionLog.map(function(m){var mode=typeof m==='object'?m.mode:m;var mins=typeof m==='object'?m.mins:0;return {type:mode,mins:mins,ts:null};});
  }
  return result;
}

function pomoRenderLog(){
  var el=document.getElementById('ppanel-log');
  if(!el)return;
  var allLog=pomoGetAllLog();
  var dates=Object.keys(allLog).sort().reverse();
  if(!dates.length){el.innerHTML='<div class="empty-msg">No sessions logged yet.</div>';return;}
  var h='';
  // Group by month
  var months={};
  dates.forEach(function(d){
    var mo=d.slice(0,7);
    if(!months[mo])months[mo]=[];
    months[mo].push(d);
  });
  Object.keys(months).sort().reverse().forEach(function(mo){
    var moLabel=new Date(mo+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'});
    h+='<div style="font-size:var(--t-sm);letter-spacing:2px;color:var(--dim);margin:10px 0 4px;padding-top:8px;border-top:1px solid var(--c-ghost)">'+moLabel+'</div>';
    months[mo].forEach(function(d){
      var log=allLog[d]||[];
      var workSessions=log.filter(function(e){return e.type==='work';}).length;
      var breakSessions=log.filter(function(e){return e.type==='break';}).length;
      var trail=log.map(function(e){var mode=e.type||e;var mins=e.mins||'';if(mode==='work')return '<span class="pomo-work-seg">['+mins+']</span>';return '<span class="pomo-break-seg">('+mins+')</span>';}).join(' <span style="color:var(--dim);font-size:var(--t-sm)">&rarr;</span> ');
      h+='<div class="pomo-log-day">';
      h+='<div class="pomo-log-date" style="display:flex;justify-content:space-between;align-items:baseline">'+
        '<span>'+d+' &mdash; <span style="color:#39ff88">'+workSessions+'w</span> <span style="color:#00e5ff">'+breakSessions+'b</span></span>'+
        '</div>';
      // Individual session pills with delete
      h+='<div style="font-size:var(--t-base);line-height:2;word-break:break-all">';
      log.forEach(function(e,ei){
        var mode=e.type||e;var mins=e.mins||'';
        var pill=mode==='work'?'<span class="pomo-work-seg">['+mins+']</span>':'<span class="pomo-break-seg">('+mins+')</span>';
        var isPendingPomoDel=window._pomoPendingDel&&window._pomoPendingDel.d===d&&window._pomoPendingDel.i===ei;
        if(isPendingPomoDel){
          h+=pill+'<span data-pomocanceldel="1" style="font-size:var(--t-xs);color:var(--dim);cursor:pointer;margin-right:2px;vertical-align:super">no</span>';
          h+='<span data-pomoconfirmdel="1" data-date="'+d+'" data-idx="'+ei+'" style="font-size:var(--t-xs);color:var(--cr);cursor:pointer;margin-right:6px;vertical-align:super;border:1px solid rgba(255,68,68,.4);padding:0 4px">sure?</span>';
        } else {
          h+=pill+'<span data-pomoreqdel="1" data-date="'+d+'" data-idx="'+ei+'" style="font-size:var(--t-xs);color:var(--dim);cursor:pointer;opacity:.4;margin-right:6px;vertical-align:super">✕</span>';
        }
        if(ei<log.length-1)h+='<span style="color:var(--dim);font-size:var(--t-sm)">&rarr;</span> ';
      });
      h+='</div>';
      h+='</div>';
    });
  });
  el.innerHTML='<div style="max-height:360px;overflow-y:auto">'+h+'</div>';
}

function pomoRenderStats(){
  var el=document.getElementById('ppanel-stats');
  if(!el)return;
  var subTab=window._pomoStatTab||'all';
  // Sub-tab bar
  var h='<div style="display:flex;gap:4px;margin-bottom:12px">';
  ['day','week','year','all'].forEach(function(t){
    var labels={day:'TODAY',week:'WEEK',year:'YEAR',all:'ALL TIME'};
    var active=subTab===t;
    h+='<span data-pst="'+t+'" onclick="window._pomoStatTab=this.dataset.pst;pomoRenderStats()" style="font-size:var(--t-xs);padding:2px 8px;border:1px solid '+(active?'var(--cp)':'rgba(255,255,255,.12)')+';color:'+(active?'var(--cp)':'var(--dim)')+';cursor:pointer;letter-spacing:.5px">'+labels[t]+'</span>';
  });
  h+='</div>';

  var allLog=pomoGetAllLog();
  var now=new Date();
  function getFilteredDates(){
    var allDates=Object.keys(allLog).sort();
    if(subTab==='day'){
      var td=localDateStr(now);
      return allDates.filter(function(d){return d===td;});
    } else if(subTab==='week'){
      var wStart=new Date(now);wStart.setDate(now.getDate()-((now.getDay()+6)%7));wStart.setHours(0,0,0,0);
      var wStr=wStart.toISOString().slice(0,10);
      return allDates.filter(function(d){return d>=wStr;});
    } else if(subTab==='year'){
      var yStr=now.getFullYear()+'-01-01';
      return allDates.filter(function(d){return d>=yStr;});
    }
    return allDates;
  }

  var dates=getFilteredDates();
  if(!dates.length){
    el.innerHTML=h+'<div class="empty-msg">No sessions for this period.</div>';
    return;
  }
  var totalWorkMins=0,totalBreakMins=0,totalWorkSess=0,totalBreakSess=0;
  var workMinsByDate={},workSessByDate={};
  var workMinsByDow=[0,0,0,0,0,0,0];
  var workMinsByHour=new Array(24).fill(0);
  dates.forEach(function(d){
    var log=allLog[d]||[];
    var dwm=0,dws=0,dbm=0;
    log.forEach(function(e){
      var mode=e.type||e;var mins=e.mins||0;
      if(mode==='work'){dws++;dwm+=mins;}else{dbm+=mins;}
      // Hour breakdown from timestamp
      if(e.ts){var hr=new Date(e.ts).getHours();if(mode==='work')workMinsByHour[hr]+=mins;}
    });
    totalWorkSess+=dws;totalBreakSess+=log.length-dws;
    totalWorkMins+=dwm;totalBreakMins+=dbm;
    workMinsByDate[d]=dwm;workSessByDate[d]=dws;
    var dow=new Date(d+'T12:00:00').getDay();
    workMinsByDow[dow]+=dwm;
  });
  function fmins(m){return m>=60?(Math.floor(m/60)+'h '+(m%60?m%60+'m':'')):(m+'m');}
  function stat(v,l,col){return '<div class="text-center"><div class="pomo-stat-num" style="color:'+(col||'var(--cp)')+'">'+v+'</div><div class="pomo-stat-lbl">'+l+'</div></div>';}

  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
  h+=stat(fmins(totalWorkMins),'WORK','var(--cr)');
  h+=stat(fmins(totalBreakMins),'BREAK','var(--cg)');
  h+=stat(totalWorkSess,'WORK SESS','var(--cr)');
  h+=stat(totalBreakSess,'BREAK SESS','var(--cg)');
  h+='</div>';

  if(subTab!=='day'&&dates.length>1){
    var n=dates.length;
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
    h+=stat(fmins(Math.round(totalWorkMins/n)),'AVG WORK/DAY','var(--cr)');
    h+=stat(fmins(Math.round(totalBreakMins/n)),'AVG BREAK/DAY','var(--cg)');
    h+='</div>';
    var bestDay=dates.reduce(function(a,b){return (workMinsByDate[b]||0)>(workMinsByDate[a]||0)?b:a;},dates[0]);
    if(bestDay&&workMinsByDate[bestDay])h+='<div style="font-size:var(--t-base);color:var(--dim);margin-bottom:10px">Best day: <span style="color:var(--ca)">'+bestDay+'</span> — '+fmins(workMinsByDate[bestDay])+'</div>';
  }

  // Day-of-week breakdown
  if(subTab==='week'||subTab==='year'||subTab==='all'){
    var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var maxDow=Math.max.apply(null,workMinsByDow)||1;
    h+='<div style="font-size:var(--t-xs);letter-spacing:1px;color:var(--dim);margin-bottom:6px">BY DAY OF WEEK</div>';
    h+='<div style="display:flex;align-items:flex-end;gap:3px;height:50px;margin-bottom:4px">';
    workMinsByDow.forEach(function(m,i){
      var pct=maxDow>0?Math.round(m/maxDow*100):0;
      var isToday=i===now.getDay();
      h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">';
      h+='<div style="width:100%;background:'+(isToday?'var(--cp)':'rgba(255,95,160,.4)')+';border-radius:1px 1px 0 0;height:'+pct+'%" title="'+fmins(m)+'"></div>';
      h+='<div style="font-size:var(--t-xxs);color:'+(isToday?'var(--cp)':'var(--dim)')+'">'+DOW[i].slice(0,2)+'</div>';
      h+='</div>';
    });
    h+='</div>';
  }

  // Hour-of-day breakdown (only if we have ts data)
  var hasHourData=workMinsByHour.some(function(v){return v>0;});
  if(hasHourData){
    var maxHr=Math.max.apply(null,workMinsByHour)||1;
    h+='<div style="font-size:var(--t-xs);letter-spacing:1px;color:var(--dim);margin:10px 0 6px">BY HOUR OF DAY</div>';
    h+='<div style="display:flex;align-items:flex-end;gap:1px;height:40px;margin-bottom:4px">';
    for(var hr=0;hr<24;hr++){
      var pct=maxHr>0?Math.round(workMinsByHour[hr]/maxHr*100):0;
      h+='<div style="flex:1;background:'+(pct>0?'var(--cr)':'rgba(255,255,255,.04)')+';border-radius:1px 1px 0 0;height:'+pct+'%" title="'+hr+':00 — '+fmins(workMinsByHour[hr])+'"></div>';
    }
    h+='</div>';
    h+='<div style="display:flex;justify-content:space-between;font-size:var(--t-xxs);color:var(--dim)"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span></div>';
  }

  // Monthly breakdown for year/all
  if(subTab==='year'||subTab==='all'){
    var workMinsByMonth={},breakMinsByMonth={};
    dates.forEach(function(d){
      var mo=d.slice(0,7);
      workMinsByMonth[mo]=(workMinsByMonth[mo]||0)+(workMinsByDate[d]||0);
    });
    var months=Object.keys(workMinsByMonth).sort().slice(-6).reverse();
    if(months.length){
      var maxWm=Math.max.apply(null,months.map(function(m){return workMinsByMonth[m]||0;}))||1;
      h+='<div style="font-size:var(--t-xs);letter-spacing:1px;color:var(--dim);margin:10px 0 6px">MONTHLY</div>';
      months.forEach(function(mo){
        var moLabel=new Date(mo+'-01').toLocaleDateString('en-US',{month:'short',year:'2-digit'});
        var wm=workMinsByMonth[mo]||0;
        var wpct=Math.round(wm/maxWm*100);
        h+='<div class="mb-6"><div style="display:flex;justify-content:space-between;font-size:var(--t-xs);color:var(--dim);margin-bottom:2px"><span>'+moLabel+'</span><span style="color:var(--cr)">'+fmins(wm)+'</span></div>';
        h+='<div style="height:6px;background:rgba(255,255,255,.07);border-radius:2px"><div style="width:'+wpct+'%;height:100%;background:var(--cr);border-radius:2px"></div></div></div>';
      });
    }
  }

  el.innerHTML=h;
}

function pomoRender(){
  if(!pomoState||typeof pomoState.totalSecs==='undefined')return;
  var disp=document.getElementById('pomo-display');
  var lbl=document.getElementById('pomo-label');
  var bar=document.getElementById('pomo-bar');
  var startBtn=document.getElementById('pomo-start-btn');
  var badge=document.getElementById('pomo-sessions-badge');
  var pct=pomoState.totalSecs>0?Math.round(((pomoState.totalSecs-pomoState.remainSecs)/pomoState.totalSecs)*100):0;
  var isIdle=!pomoState.running&&pomoState.remainSecs===pomoState.totalSecs;
  var isDone=!pomoState.running&&pomoState.remainSecs===0;
  var modeColor=pomoState.mode==='work'?'var(--cr)':'var(--cc)';
  var modeHex=pomoState.mode==='work'?'#ff4444':'#00ff88';

  var labelTxt=isIdle?'READY':pomoState.running?(pomoState.mode==='work'?'FOCUS':'BREAK'):(isDone?'DONE!':'PAUSED');

  if(disp){
    disp.textContent=pomoFmt(pomoState.remainSecs);
    disp.className='pomo-time '+(isIdle?'idle':pomoState.mode==='work'?'work':'break');
  }
  if(lbl)lbl.textContent=labelTxt;
  if(bar){bar.style.width=pct+'%';bar.style.background=modeColor;}
  if(startBtn)startBtn.innerHTML=pomoState.running?'&#9646;&#9646; PAUSE':'&#9654; '+(pomoState.remainSecs<pomoState.totalSecs&&!isDone?'RESUME':'START');
  if(badge)badge.textContent=pomoState.sessions+' session'+(pomoState.sessions!==1?'s':'');
  // Trail
  var trailEl=document.getElementById('pomo-trail');
  if(trailEl){
    // Use sessionLog (in-memory, includes current session) for trail display
    var trailLog=pomoState.sessionLog;
    // If sessionLog is empty but pomo_log_ has today's data (after pull), load it
    if(!trailLog.length){
      var committedToday=JSON.parse(localStorage.getItem('pomo_log_'+pomoGetDayKey())||'[]');
      if(committedToday.length){
        pomoState.sessionLog=committedToday.map(function(e){return {mode:e.type||e,mins:e.mins||0,ts:e.ts||''};});
        pomoState.sessions=committedToday.filter(function(e){return (e.type||e)==='work';}).length;
        trailLog=pomoState.sessionLog;
      }
    }
    if(!trailLog.length){
      trailEl.innerHTML='';
    } else {
      trailEl.innerHTML=trailLog.map(function(m){
        var mode=typeof m==='object'?m.mode:m;
        var mins=typeof m==='object'?m.mins:'';
        if(mode==='work')return '<span class="pomo-work-seg">['+mins+']</span>';
        return '<span class="pomo-break-seg">('+mins+')</span>';
      }).join(' <span style="color:var(--dim);font-size:var(--t-sm)">&rarr;</span> ');
    }
  }

  // ── Clock tile overlay (mobile: covers clock face when running) ──
  var overlay=document.getElementById('pomo-clock-overlay');
  var ovTime=document.getElementById('pomo-ov-time');
  var ovLabel=document.getElementById('pomo-ov-label');
  var bigTime=document.getElementById('big-time');
  var bigDate=document.getElementById('big-date');
  var bigHijri=document.getElementById('big-hijri');
  if(overlay){
    var showOverlay=pomoState.running||(!isIdle&&!isDone);
    overlay.style.display=showOverlay?'flex':'none';
    if(ovTime){ovTime.textContent=pomoFmt(pomoState.remainSecs);ovTime.style.color=modeColor;}
    if(ovLabel)ovLabel.textContent=labelTxt;
    // Hide clock elements when overlay is on
    [bigTime,bigDate,bigHijri].forEach(function(el){if(el)el.style.visibility=showOverlay?'hidden':'visible';});
  }

  // ── Topbar mini (desktop: show beside clock when running) ──
  var tbMini=document.getElementById('pomo-topbar-mini');
  var tbTime=document.getElementById('pomo-tb-time');
  var tbLabel=document.getElementById('pomo-tb-label');
  if(tbMini){
    var showMini=pomoState.running||(!isIdle&&!isDone);
    tbMini.style.display=showMini?'flex':'none';
    if(tbTime){tbTime.textContent=pomoFmt(pomoState.remainSecs);tbTime.style.color=modeColor;}
    if(tbLabel)tbLabel.textContent=pomoState.mode==='work'?'FOCUS':'BREAK';
  }

  // ── Canvas clock-hand effect ──
  pomoDrawCanvas(pct,modeHex,pomoState.running,isDone);
}

// ── POMO ASCII NOISE BACKGROUND ──
(function(){
  var noise3D=function(){return 0;};
  var noiseReady=false;
  fetch('https://raw.githubusercontent.com/blindman67/SimplexNoiseJS/master/simplexNoise.js')
    .then(function(r){return r.text();})
    .then(function(src){
      try{
        var openSimplexNoise=new Function('return '+src)();
        noise3D=openSimplexNoise(Date.now()).noise3D;
        noiseReady=true;
      }catch(e){}
    }).catch(function(){});

  var DENSITY='Ñ@#W$9876543210?!abcxyz;:+=-,._ ';
  var animFrame=null;
  var isRunning=false;

  function startNoise(mode){
    isRunning=true;
    var canvas=document.getElementById('pomo-bg-canvas');
    if(!canvas)return;
    canvas.style.display='block';
    var tile=document.querySelector('[data-id="pomodoro"]');
    var colWork='rgba(159,26,26,0.24)';
    var colBreak='rgba(35,115,255,0.14)';
    var startTime=performance.now();

    function frame(now){
      if(!isRunning)return;
      // Size canvas to tile
      if(tile){
        var r=tile.getBoundingClientRect();
        if(canvas.width!==Math.round(r.width)||canvas.height!==Math.round(r.height)){
          canvas.width=Math.round(r.width)||300;
          canvas.height=Math.round(r.height)||400;
        }
      }
      var W=canvas.width,H=canvas.height;
      var ctx=canvas.getContext('2d');
      ctx.clearRect(0,0,W,H);

      var curMode=pomoState.mode||mode;
      var col=curMode==='work'?colWork:colBreak;
      var t=(now-startTime)*0.000175; // 4x slower than original 0.0007
      ctx.font='bold 12px monospace';
      ctx.fillStyle=col;
      ctx.textBaseline='top';
      var cellW=10,cellH=12;
      var cols=Math.ceil(W/cellW);
      var rows=Math.ceil(H/cellH);
      var aspect=W/H;
      for(var row=0;row<rows;row++){
        for(var col2=0;col2<cols;col2++){
          var x=col2*0.03;
          var y=(row*0.03)/aspect+t;
          var n=noiseReady?noise3D(x,y,t):Math.sin(x*3+t)*0.5;
          var idx=Math.floor((n*0.5+0.5)*DENSITY.length);
          idx=Math.max(0,Math.min(DENSITY.length-1,idx));
          // Work mode: 6 brightness groups across full density range
          // Range: base * 1.10 (densest) down to base * 0.90 (sparsest)
          if(curMode==='work'){
            var _dl=DENSITY.length; // 33
            var _group=Math.floor(idx/_dl*6); // 0=densest .. 5=sparsest
            _group=Math.min(5,_group);
            var _factors=[1.32,1.23,1.04,0.96,0.88,0.80];
            var _f=_factors[_group];
            ctx.fillStyle=col.replace(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/,function(m,r,g,b,a){
              return 'rgba('+Math.min(255,Math.round(+r*_f))+','+Math.min(255,Math.round(+g*_f))+','+Math.min(255,Math.round(+b*_f))+','+Math.min(1,parseFloat(a)*_f)+')';
            });
          } else {
            ctx.fillStyle=col;
          }
          ctx.fillText(DENSITY[idx],col2*cellW,row*cellH);
        }
      }
      animFrame=requestAnimationFrame(frame);
    }
    if(animFrame)cancelAnimationFrame(animFrame);
    animFrame=requestAnimationFrame(frame);
  }

  function stopNoise(){
    isRunning=false;
    if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
    var canvas=document.getElementById('pomo-bg-canvas');
    if(canvas){
      canvas.style.display='none';
      var ctx=canvas.getContext('2d');
      if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
    }
  }

  window.pomoNoiseStart=startNoise;
  window.pomoNoiseStop=stopNoise;
})();

function pomoDrawCanvas(pct,color,running,done){
  // Noise animation is handled separately via pomoNoiseStart/Stop
  /* no done class */ var canvas=document.getElementById('pomo-bg-canvas');
  if(canvas)canvas.className='';
}

function pomoGoToCard(){
  var tile=document.querySelector('[data-id="pomodoro"]');
  if(tile)tile.scrollIntoView({behavior:'smooth',block:'center'});
}



function pomoConfettiRain(){
  var tile=document.querySelector('[data-id="pomodoro"]');
  if(!tile)return;
  var rect=tile.getBoundingClientRect();
  var colors=['#00ff88','#ffcc00','#00e5ff','#ff5fa0','#ffffff','#aaff00'];
  var count=0;
  var maxCount=22;
  var interval=setInterval(function(){
    if(count>=maxCount){clearInterval(interval);return;}
    var n=count<10?2:1; // halved burst
    for(var i=0;i<n;i++){
      confetti(
        rect.left+Math.random()*rect.width,
        rect.top+Math.random()*rect.height*0.3,
        colors[Math.floor(Math.random()*colors.length)]
      );
    }
    count++;
  },80);
}

// Shared AudioContext — created on first user interaction to satisfy autoplay policy
var _sharedAudioCtx=null;
function _getAudioCtx(){
  if(!_sharedAudioCtx){
    try{_sharedAudioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}
  }
  // Resume if suspended (happens after tab switch or lock screen)
  if(_sharedAudioCtx.state==='suspended'){
    try{_sharedAudioCtx.resume();}catch(e){}
  }
  return _sharedAudioCtx;
}
// Prime AudioContext on any user tap — must happen before timer completes
document.addEventListener('touchstart',function(){_getAudioCtx();},{once:false,passive:true});
document.addEventListener('click',function(){_getAudioCtx();},{once:false,passive:true});

function _gbSound(notes,wave){
  try{
    var ctx=_getAudioCtx();
    if(!ctx)return;
    var t=ctx.currentTime;
    notes.forEach(function(n){
      var osc=ctx.createOscillator();
      var g=ctx.createGain();
      osc.connect(g);g.connect(ctx.destination);
      osc.type=wave||'square';
      osc.frequency.value=n[0];
      g.gain.setValueAtTime(0.18,t+n[1]);
      g.gain.exponentialRampToValueAtTime(0.001,t+n[1]+n[2]);
      osc.start(t+n[1]);
      osc.stop(t+n[1]+n[2]+0.01);
    });
  }catch(e){}
}
function pomoBeep(){
  safeHap(HAP.pomoWork);
  // Fireworks sound: 2 seconds of staggered pops, whistles, and crackle bursts
  try{
    var ctx=_getAudioCtx();
    if(!ctx)return;
    var masterGain=ctx.createGain();
    masterGain.gain.setValueAtTime(0.6,ctx.currentTime);
    masterGain.connect(ctx.destination);

    function pop(t,freq,dur,vol){
      // Sharp percussive pop
      var osc=ctx.createOscillator();
      var g=ctx.createGain();
      osc.connect(g);g.connect(masterGain);
      osc.type='sine';osc.frequency.value=freq;
      g.gain.setValueAtTime(vol||0.5,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+dur);
      osc.start(ctx.currentTime+t);
      osc.stop(ctx.currentTime+t+dur+0.02);
    }

    function whistle(t,startF,endF,dur){
      // Rising whistle before a burst
      var osc=ctx.createOscillator();
      var g=ctx.createGain();
      osc.connect(g);g.connect(masterGain);
      osc.type='sine';
      osc.frequency.setValueAtTime(startF,ctx.currentTime+t);
      osc.frequency.linearRampToValueAtTime(endF,ctx.currentTime+t+dur);
      g.gain.setValueAtTime(0.15,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+dur);
      osc.start(ctx.currentTime+t);
      osc.stop(ctx.currentTime+t+dur+0.02);
    }

    function crackle(t,count){
      // Rapid burst of noise pops
      for(var i=0;i<count;i++){
        var offset=t+i*0.03+Math.random()*0.02;
        var freq=300+Math.random()*2000;
        pop(offset,freq,0.04+Math.random()*0.04,0.2+Math.random()*0.25);
      }
    }

    // Burst 1 — 0.0s
    whistle(0.0,200,1200,0.12);
    crackle(0.15,6);
    pop(0.15,880,0.15,0.6);
    pop(0.18,660,0.12,0.4);
    pop(0.22,1100,0.10,0.35);

    // Burst 2 — 0.5s
    whistle(0.45,180,1400,0.14);
    crackle(0.62,8);
    pop(0.62,1047,0.18,0.7);
    pop(0.65,784,0.14,0.4);
    pop(0.70,523,0.12,0.35);
    pop(0.73,1320,0.10,0.3);

    // Burst 3 — 1.0s
    whistle(0.95,220,1600,0.13);
    crackle(1.10,7);
    pop(1.10,880,0.16,0.65);
    pop(1.14,1100,0.13,0.4);
    pop(1.18,660,0.12,0.3);

    // Burst 4 — 1.5s (finale — bigger)
    whistle(1.42,150,1800,0.15);
    whistle(1.44,200,2000,0.13);
    crackle(1.60,10);
    pop(1.60,1047,0.2,0.8);
    pop(1.63,1320,0.16,0.5);
    pop(1.66,880,0.14,0.45);
    pop(1.70,1568,0.12,0.4);
    pop(1.74,523,0.18,0.35);
    pop(1.78,1760,0.10,0.3);

    // Fade out master
    masterGain.gain.setValueAtTime(0.6,ctx.currentTime+1.8);
    masterGain.gain.linearRampToValueAtTime(0,ctx.currentTime+2.1);
  }catch(e){}
}
function pomoSoundStart(){_gbSound([[392,0,0.06],[523,0.07,0.12]],'square');}
function pomoSoundReset(){_gbSound([[523,0,0.05],[392,0.06,0.05],[294,0.12,0.1]],'square');}

function pomoBreakBeep(){
  safeHap(HAP.pomoBreak);
  // Calm, gentle chime for break completion — 3 soft bell tones descending
  try{
    var ctx=_getAudioCtx();
    if(!ctx)return;
    var masterGain=ctx.createGain();
    masterGain.gain.setValueAtTime(0.4,ctx.currentTime);
    masterGain.connect(ctx.destination);
    function bell(t,freq,dur,vol){
      var osc=ctx.createOscillator();
      var g=ctx.createGain();
      osc.connect(g);g.connect(masterGain);
      osc.type='sine';osc.frequency.value=freq;
      g.gain.setValueAtTime(vol||0.4,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+dur);
      osc.start(ctx.currentTime+t);
      osc.stop(ctx.currentTime+t+dur+0.05);
      // Add a subtle overtone for bell quality
      var osc2=ctx.createOscillator();
      var g2=ctx.createGain();
      osc2.connect(g2);g2.connect(masterGain);
      osc2.type='sine';osc2.frequency.value=freq*2.76;
      g2.gain.setValueAtTime((vol||0.4)*0.25,ctx.currentTime+t);
      g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+dur*0.5);
      osc2.start(ctx.currentTime+t);
      osc2.stop(ctx.currentTime+t+dur);
    }
    bell(0.0, 880, 1.2, 0.5);
    bell(0.4, 698, 1.0, 0.4);
    bell(0.8, 587, 1.4, 0.35);
    masterGain.gain.setValueAtTime(0.4,ctx.currentTime+1.8);
    masterGain.gain.linearRampToValueAtTime(0,ctx.currentTime+2.4);
  }catch(e){}
}

function pomoStartStop(){
  if(pomoState.running){
    clearInterval(pomoState.interval);
    pomoState.running=false;
    if(window.pomoNoiseStop)window.pomoNoiseStop();
    pomoSaveDay(false);
    pomoRender();
    return;
  }
  pomoState.running=true;
  if(pomoState.remainSecs===pomoState.totalSecs)pomoSoundStart();
  if(window.pomoNoiseStart)window.pomoNoiseStart(pomoState.mode);
  pomoSaveDay(true);
  pomoState.interval=setInterval(function(){
    if(pomoState.remainSecs<=0){
      clearInterval(pomoState.interval);
      pomoState.running=false;
      var _smins=Math.round(pomoState.totalSecs/60);
      pomoState.sessionLog.push({mode:pomoState.mode,mins:_smins,ts:new Date().toISOString()});
      if(pomoState.sessionLog.length>200)pomoState.sessionLog=pomoState.sessionLog.slice(-200);
      if(pomoState.mode==='work'){
        pomoState.sessions++;
      }
      pomoSaveSessions();
      pomoSaveDayLog();
      if(window.pomoNoiseStop)window.pomoNoiseStop();
      if(pomoState.mode==='work'){
        pomoBeep();
        safeHap(HAP.pomoWork);
      }else{
        pomoBreakBeep();
        safeHap(HAP.pomoBreak);
      }
      pomoRender();
      pomoConfettiRain();
      return;
    }
    pomoState.remainSecs--;
    if(pomoState.remainSecs%10===0)pomoSaveDay(true); // save every 10s
    pomoRender();
  },1000);
  pomoRender();
}

function pomoReset(){
  safeHap(HAP.soft);
  clearInterval(pomoState.interval);
  pomoState.running=false;
  if(window.pomoNoiseStop)window.pomoNoiseStop();
  pomoSoundReset();
  pomoState.remainSecs=pomoState.totalSecs;
  // Clear persisted timer so reload doesn't restore it
  var saved=JSON.parse(localStorage.getItem('pomo_day_data')||'null');
  if(saved){saved.activeTimer=null;lsSet('pomo_day_data',saved);}
  pomoRender();
}

function pomoSetMode(mode,mins){
  clearInterval(pomoState.interval);
  pomoState.running=false;
  pomoState.mode=mode;
  pomoState.totalSecs=mins*60;
  pomoState.remainSecs=mins*60;
  // Update preset active state
  document.querySelectorAll('.pomo-preset').forEach(function(btn){
    var t=btn.textContent.toLowerCase();
    var active=false;
    if(mode==='work'&&mins===25&&t.includes('work 25'))active=true;
    if(mode==='break'&&mins===5&&t.includes('short 5'))active=true;
    if(mode==='break'&&mins===15&&t.includes('long 15'))active=true;
    if(mode==='work'&&mins===50&&t.includes('deep 50'))active=true;
    btn.classList.toggle('active',active);
  });
  pomoRender();
}

function pomoSetFromInput(mode){
  var val=parseInt((document.getElementById('pomo-'+mode+'-inp')||{}).value)||0;
  if(val<1||val>120)return;
  clearInterval(pomoState.interval);
  pomoState.running=false;
  pomoState.mode=mode;
  pomoState.totalSecs=val*60;
  pomoState.remainSecs=val*60;
  document.querySelectorAll('.pomo-preset').forEach(function(b){b.classList.remove('active');});
  pomoRender();
}

function pomoUpdateCustom(){}

pomoRender();

// ── SUPABASE AUTO-SYNC ──
var sbAutoSyncInterval=null;
var sbAutoSyncLabelTimer=null;
var sbAutoSyncNextTs=0;
function updateSbNextSyncLabel(){
  var el=document.getElementById('sb-next-sync');
  if(!el)return;
  if(typeof getSetting!=='function'||!getSetting('sbAutoSync')||!sbAutoSyncNextTs){
    el.textContent='Next auto-sync: OFF';
    return;
  }
  if(sbAutoSyncNextTs<Date.now())sbAutoSyncNextTs=Date.now()+(7*60*1000);
  var when=new Date(sbAutoSyncNextTs);
  var now=Date.now();
  var mins=Math.max(0,Math.round((sbAutoSyncNextTs-now)/60000));
  var dayStr=when.toDateString()===new Date().toDateString()?'Today':when.toDateString();
  el.textContent='Next auto-sync: '+dayStr+' at '+when.toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'})+' ('+mins+'m)';
}
function startSbAutoSync(){
  clearInterval(sbAutoSyncInterval);
  clearInterval(sbAutoSyncLabelTimer);
  var everyMs=7*60*1000;
  sbAutoSyncNextTs=Date.now()+everyMs;
  sbAutoSyncInterval=setInterval(function(){
    sbAutoSyncNextTs=Date.now()+everyMs;
    updateSbNextSyncLabel();
    if(typeof getSetting==='function'&&getSetting('sbAutoSync')){
      var cfg=sbGetConfig();
      if(cfg.url&&cfg.key&&cfg.account) sbPush().then(function(){topbarProgress('push');});
    }
  },everyMs);
  sbAutoSyncLabelTimer=setInterval(updateSbNextSyncLabel,1000);
  updateSbNextSyncLabel();
}
setTimeout(function(){if(typeof getSetting==="function")startSbAutoSync();},50);


// ── ISLAMIC TOPICS ──
var itData=null; // loaded from islam.json
var itState=JSON.parse(localStorage.getItem('dash_islamic')||'{"current":1,"meditated":{},"log":[]}');
itState.browseIdx=itState.current; // always start at today's entry

function itSave(){lsSet('dash_islamic',itState);}


// ── WRITER'S DEN ──
var wdData=null; // loaded from write.json (object keyed by string id)
var wdState=JSON.parse(localStorage.getItem('dash_wd')||'{"currentId":null,"seen":[],"history":[],"meditated":{},"log":[]}');
wdState.browseId=null; // always start at today's entry

function wdSave(){lsSet('dash_wd',wdState);}

function wdLoad(){
  var el=document.getElementById('wd-body');
  if(wdData){wdRender();return;}
  // Try window.WRITE_DATA first (embedded), then fetch
  if(window.WRITE_DATA){
    wdData=window.WRITE_DATA;
    wdCheckAdvance();
    if(!wdState.currentId)wdPickNext();
    wdRender();
    return;
  }
  fetch('write.json?v='+Date.now())
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(data){
      wdData=data;
      wdCheckAdvance();
      if(!wdState.currentId)wdPickNext();
      wdRender();
    })
    .catch(function(err){
      if(el)el.innerHTML='<div class="it-err">&#9888; write.json: '+err.message+'<br><span style="font-size:var(--t-xs);opacity:.6">Works on Netlify — open via server, not file://</span></div>';
    });
}

function wdAllIds(){
  if(!wdData)return[];
  return Object.keys(wdData);
}

function wdPickNext(){
  var allIds=wdAllIds();
  if(!allIds.length)return;
  // Filter out already seen
  var unseen=allIds.filter(function(id){return wdState.seen.indexOf(id)<0;});
  // If all seen, reset (start fresh cycle)
  if(!unseen.length){
    wdState.seen=[];
    unseen=allIds.slice();
  }
  // Pick random from unseen
  var picked=unseen[Math.floor(Math.random()*unseen.length)];
  if(wdState.currentId)wdState.history.push(wdState.currentId);
  if(wdState.history.length>200)wdState.history=wdState.history.slice(-200);
  wdState.currentId=picked;
  wdState.seen.push(picked);
  wdSave();
}

function wdCheckAdvance(){
  var today=localDateStr();
  if(wdState.lastChecked===today)return;
  var prev=wdState.lastChecked;
  wdState.lastChecked=today;
  // New day: always advance to a fresh entry
  if(prev&&prev!==today){
    wdPickNext();
    return;
  }
  wdSave();
}

function wdRender(){
  var el=document.getElementById('wd-body');
  var badge=document.getElementById('wd-badge');
  if(!el||!wdData)return;
  var id=wdState.browseId||wdState.currentId;
  if(!id){wdPickNext();id=wdState.currentId;}
  var isBrowsingWD=wdState.browseId&&wdState.browseId!==wdState.currentId;
  var entry=wdData[id]||wdData[Object.keys(wdData)[0]];
  var totalIds=wdAllIds().length;
  var seenCount=wdState.seen.length;
  var pct=totalIds>0?Math.round((seenCount/totalIds)*100):0;
  var meditatedDate=wdState.meditated[id];
  var doneToday=meditatedDate===localDateStr();
  var canGoBack=wdState.history.length>0;

  if(badge)badge.textContent='#'+id+' ('+seenCount+'/'+totalIds+')';

  // Update prev button state
  var prevBtn=document.querySelector('[onclick="wdPrev()"]');
  var canBack=!!(wdState.history&&wdState.history.length)||(wdState.browseHistory&&wdState.browseHistory.length);
  if(prevBtn){prevBtn.style.opacity=canBack?'1':'.25';prevBtn.style.pointerEvents=canBack?'auto':'none';}
  var nxtBtn=document.getElementById('wd-next-btn');
  if(nxtBtn){nxtBtn.style.opacity=isBrowsingWD?'1':'.25';nxtBtn.style.pointerEvents=isBrowsingWD?'auto':'none';}

  var h='<div class="it-card">';
  // Progress
  h+='<div class="wd-progress">';
  h+='<div class="wd-pbar-wrap"><div class="wd-pbar" style="width:'+pct+'%"></div></div>';
  h+='<span class="dim-9">'+pct+'% seen</span>';
  h+='</div>';
  // ID + category
  h+='<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">';
  h+='<div class="wd-id">#'+id+'</div>';
  h+='<div class="wd-category">'+(entry.category||'')+'</div>';
  h+='</div>';
  // Title
  h+='<div class="wd-title">'+(entry.title||'')+'</div>';
  // Question
  if(entry.question)h+='<div class="wd-question">'+(entry.question)+'</div>';
  // Answer
  if(entry.answer)h+='<div class="wd-answer">'+(entry.answer).replace(/\[span_\d+\]\((?:start|end)_span\)/g,'').trim()+'</div>';
  // Source
  if(entry.source){var _src=(entry.source).replace(/\[span_\d+\]\((?:start|end)_span\)/g,'').trim();if(_src)h+='<div class="wd-source">&#8212; '+_src+'</div>';}
  // Reflect + star row
  var _wdStarredNow=(wdState.starred||[]).indexOf(wdState.browseId||wdState.currentId)>=0;
  h+='<div style="display:flex;gap:6px;align-items:stretch">';
  if(doneToday){
    h+='<button class="wd-meditate-btn done" disabled style="width:70%">&#10003; REFLECTED TODAY</button>';
  } else if(wdState.meditated&&wdState.meditated[id]){
    h+='<button class="wd-meditate-btn done" disabled style="width:70%;opacity:.7">&#10003; REFLECTED '+wdState.meditated[id]+'</button>';
  } else {
    h+='<button class="wd-meditate-btn" onclick="wdMeditate()" style="width:70%">&#9998; MARK AS REFLECTED</button>';
  }
  h+='<button id="wd-star-inline" style="flex:1;padding:6px 0;background:transparent;border:1px solid rgba(0,229,255,'+(_wdStarredNow?'.5':'.2')+');color:'+(_wdStarredNow?'var(--cc)':'rgba(255,255,255,.3)')+';font-size:var(--t-body);cursor:pointer;">'+(_wdStarredNow?'\u2605':'\u2606')+'</button>';
  h+='<button id="wd-skip-btn" style="flex:1;padding:6px 0;background:transparent;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.65);font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px">SKIP</button>';
  h+='</div>';
  h+='</div>';
  el.innerHTML=h;
  var wdStarInline=document.getElementById('wd-star-inline');
  if(wdStarInline)wdStarInline.onclick=function(){wdToggleStar();};
  var wdsb=document.getElementById('wd-star-btn');
  if(wdsb){var wdStarred3=wdState.starred||[];wdsb.style.color=wdStarred3.indexOf(wdState.currentId)>=0?'var(--cc)':'';}
  var wdSkipBtn=document.getElementById('wd-skip-btn');
  if(wdSkipBtn)wdSkipBtn.onclick=function(){
    var _b=this;
    if(_b.dataset.confirm!=='1'){
      _b.textContent='ARE YOU SURE? TAP AGAIN';
      _b.style.color='rgba(255,184,108,.8)';
      _b.style.borderColor='rgba(255,184,108,.4)';
      _b.dataset.confirm='1';
      setTimeout(function(){if(_b.dataset.confirm==='1'){_b.textContent='SKIP ENTRY →';_b.style.color='rgba(255,255,255,.65)';_b.style.borderColor='rgba(255,255,255,.3)';_b.dataset.confirm='';}},2500);
      return;
    }
    safeHap(HAP.tap);
    wdPickNext();wdRender();
  };
}

function wdMeditate(){
  wdState.browseId=null;wdState.browseHistory=[];
  var id=wdState.currentId;
  if(!id)return;
  wdState.meditated[id]=localDateStr();
  wdState.log=wdState.log||[];
  wdState.log.unshift({id:id,date:localDateStr(),title:(wdData&&wdData[id]?wdData[id].title:'')});
  if(wdState.log.length>500)wdState.log=wdState.log.slice(0,500);
  safeHap(HAP.goal);
  wdSave();
  wdRender();
  confetti(window.innerWidth/2,window.innerHeight*0.4,'#00e5ff');
}

function wdPrev(){
  if(wdState.browseHistory===undefined)wdState.browseHistory=[];
  if(!wdState.browseHistory.length&&!wdState.history.length)return;
  // Build browse stack from history if first time
  if(!wdState.browseHistory.length)wdState.browseHistory=wdState.history.slice();
  if(!wdState.browseHistory.length)return;
  var prev=wdState.browseHistory.pop();
  wdState.browseId=prev;
  wdRender();
}
function wdForward(){
  // Only goes forward through browse stack, can't exceed currentId
  if(!wdState.browseId||wdState.browseId===wdState.currentId){return;}
  // We don't have a forward stack — just go to current
  wdState.browseId=null;
  wdRender();
}

// Load on init
setTimeout(wdLoad,500);

function itLoad(){
  var el=document.getElementById('it-body');
  if(itData){itRender();return;}
  // Try window.ISLAM_DATA first (embedded), then fetch
  if(window.ISLAM_DATA){
    itData=window.ISLAM_DATA;
    itCheckAdvance();
    itRender();
    return;
  }
  fetch('islam.json?v='+Date.now())
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(data){
      itData=data;
      itCheckAdvance();
      itRender();
    })
    .catch(function(err){
      if(el)el.innerHTML='<div class="it-err">&#9888; islam.json: '+err.message+'<br><span style="font-size:var(--t-xs);opacity:.6">Works on Netlify — open via server, not file://</span></div>';
    });
}

function itCheckAdvance(){
  var today=localDateStr();
  if(itState.lastChecked===today)return;
  var prev=itState.lastChecked;
  itState.lastChecked=today;
  // New day: always advance to next topic
  if(prev&&prev!==today){
    var next=itState.current+1;
    if(itData&&next>itData.length)next=1;
    itState.current=next;
    itState.browseIdx=itState.current;
  }
  itSave();
}

function itRender(){
  var el=document.getElementById('it-body');
  var badge=document.getElementById('it-badge');
  if(!el||!itData)return;
  if(itState.browseIdx===undefined)itState.browseIdx=itState.current;
  var viewNum=itState.browseIdx;
  var idx=Math.max(0,Math.min(viewNum-1,itData.length-1));
  var entry=itData[idx];
  var total=itData.length;
  var pct=Math.round((itState.current/total)*100);
  var meditatedDate=itState.meditated[viewNum];
  var donToday=meditatedDate===localDateStr();
  var isBrowsing=viewNum!==itState.current;

  if(badge)badge.textContent='#'+viewNum+'/'+total;

  var h='<div class="it-card">';
  // Progress bar
  h+='<div class="it-progress">';
  h+='<div class="it-pbar-wrap"><div class="it-pbar" style="width:'+pct+'%"></div></div>';
  h+='<span class="dim-9">'+pct+'%</span>';
  h+='</div>';
  // Number + topic
  h+='<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">';
  h+='<div class="it-num">#'+viewNum+'</div>';
  h+='<div class="it-topic">'+(entry.topic||'')+'</div>';
  h+='</div>';
  // Title
  h+='<div class="it-title">'+entry.title+'</div>';
  // Question
  if(entry.question){
    h+='<div class="it-question">'+entry.question+'</div>';
  }
  // Notes
  if(entry.notes_sources){
    h+='<div class="it-notes">'+entry.notes_sources+'</div>';
  }
  // Meditate + star row
  var _itStarred=(itState.starred||[]).indexOf(viewNum)>=0;
  h+='<div style="display:flex;gap:6px;align-items:stretch">';
  if(donToday){
    h+='<button class="it-meditate-btn done" disabled style="flex:1">&#10003; MEDITATED TODAY</button>';
  } else if(meditatedDate){
    h+='<button class="it-meditate-btn done" disabled style="flex:1;opacity:.7">&#10003; MEDITATED '+meditatedDate+'</button>';
  } else {
    h+='<button class="it-meditate-btn" id="it-med-btn" onclick="itMeditate()" style="flex:1">&#9770; MARK AS MEDITATED</button>';
  }
  h+='<button id="it-star-inline" style="width:15%;padding:6px 0;background:transparent;border:1px solid rgba(255,204,0,'+(  _itStarred?'.5':'.2')+');color:'+(_itStarred?'var(--ca)':'rgba(255,255,255,.3)')+';font-size:var(--t-body);cursor:pointer;">'+(_itStarred?'★':'☆')+'</button>';
  h+='</div>';
  h+='</div>';
  el.innerHTML=h;
  // Wire inline star
  var sb2=document.getElementById('it-star-inline');
  if(sb2)sb2.onclick=function(){itToggleStar(viewNum);};
  // Update external star button if exists
  var sb=document.getElementById('it-star-btn');
  if(sb){var _stArr=itState.starred||[];sb.style.color=_stArr.indexOf(viewNum)>=0?'var(--ca)':'';}
  // Update nav button states
  var pb=document.getElementById('it-prev-btn'),nb=document.getElementById('it-next-btn');
  if(pb){pb.style.opacity=viewNum>1?'1':'.25';pb.style.pointerEvents=viewNum>1?'auto':'none';}
  if(nb){nb.style.opacity=viewNum<itState.current?'1':'.25';nb.style.pointerEvents=viewNum<itState.current?'auto':'none';}
}

function itMeditate(){
  itState.browseIdx=itState.current; // snap back to today
  itState.meditated[itState.current]=localDateStr();
  itState.log=itState.log||[];
  itState.log.unshift({id:itState.current,date:localDateStr()});
  if(itState.log.length>200)itState.log=itState.log.slice(0,200);
  safeHap(HAP.goal);
  itSave();
  itRender();
  confetti(window.innerWidth/2,window.innerHeight*0.4,'#ffcc00');
}

function itPrev(){
  // Browse back — don't change current (the "today" entry), just view
  if(itState.browseIdx===undefined)itState.browseIdx=itState.current;
  if(itState.browseIdx>1){itState.browseIdx--;itRender();}
}
function itNext(){
  // Only go forward up to the actual current (today's) entry
  if(itState.browseIdx===undefined)itState.browseIdx=itState.current;
  if(itState.browseIdx<itState.current){itState.browseIdx++;itRender();}
}

// Load on init
setTimeout(itLoad,400);


// ── WEEKEND WARRIOR ──
var wwData=lsGet('dash_ww',{});
var wwOffset=0; // weeks from current
var wwExpandedKey='';

var US_HOLIDAYS=[
  // Fixed
  {m:1,d:1,n:'New Year'},
  {m:7,d:4,n:'Independence Day'},
  {m:11,d:11,n:'Veterans Day'},
  {m:12,d:25,n:'Christmas'},
  {m:12,d:31,n:'New Years Eve'},
];

function wwSave(){lsSet('dash_ww',wwData);}
function wwNormalizeNotes(entry){
  var raw=entry&&entry.notes;
  if(!raw)return [];
  if(!Array.isArray(raw)){
    if(typeof raw==='string'&&raw.trim())return [{text:raw.trim(),ts:''}];
    return [];
  }
  return raw.map(function(n){
    if(typeof n==='string')return {text:n,ts:''};
    if(n&&typeof n==='object')return {text:(n.text||'').toString(),ts:(n.ts||'').toString()};
    return {text:String(n||''),ts:''};
  }).filter(function(n){return n.text&&n.text.trim();});
}
var WW_COLOR_POOL=['#55fff1','#9cff6a','#fff678','#ee7521','#da4fbc','#2796db','#ce8464','#1ec663','#ffaacf'];
function wwWeekendColorsForSat(satDate){
  var serial=Math.floor(new Date(satDate.getFullYear(),satDate.getMonth(),satDate.getDate()).getTime()/604800000);
  var satIdx=((serial*2)%WW_COLOR_POOL.length+WW_COLOR_POOL.length)%WW_COLOR_POOL.length;
  var sunIdx=(satIdx+4)%WW_COLOR_POOL.length;
  return {sat:WW_COLOR_POOL[satIdx],sun:WW_COLOR_POOL[sunIdx]};
}

function wwGetWeekendDates(offset){
  var now=new Date();
  var dow=now.getDay(); // 0=Sun,6=Sat
  // After Sunday (dow===0) it's already past the weekend
  // Treat as new week starting Monday — next weekend is Sat+6 days away
  // Roll over to next weekend on Monday at 1am
  var isPostWeekend=(dow===1&&now.getHours()<1)||(dow===0);
  // Wait — on Sunday we're IN the weekend, not past it
  // On Monday before 1am we're still in "this weekend" mentally
  // So: if Sun → daysToSat = 6 (next Sat), unless offset compensates
  // Fix: if Sunday, we're mid-weekend so offset 0 = this weekend (Sat was yesterday)
  var daysToSat;
  if(dow===0){
    // Sunday: this weekend's Sat was yesterday
    daysToSat=-1;
  } else if(dow===1&&now.getHours()<1){
    // Monday before 1am: still show this weekend (Sat was 2 days ago)
    daysToSat=-2;
  } else {
    daysToSat=dow===6?0:(6-dow);
  }
  var sat=new Date(now);sat.setDate(now.getDate()+daysToSat+offset*7);
  sat.setHours(0,0,0,0);
  var sun=new Date(sat);sun.setDate(sat.getDate()+1);
  return [sat,sun];
}

function wwGetAdjacentHolidays(sat,sun){
  // Check if Friday before or Monday after is a federal holiday
  var fri=new Date(sat);fri.setDate(sat.getDate()-1);
  var mon=new Date(sun);mon.setDate(sun.getDate()+1);
  var days=[{date:fri,side:'fri'},{date:sat,side:'sat'},{date:sun,side:'sun'},{date:mon,side:'mon'}];
  var result={fri:null,mon:null};
  days.forEach(function(d){
    US_HOLIDAYS.forEach(function(h){
      if(d.date.getMonth()+1===h.m&&d.date.getDate()===h.d){
        if(d.side==='fri')result.fri=h.n;
        if(d.side==='mon')result.mon=h.n;
      }
    });
  });
  return result;
}

function wwKey(date){return localDateStr(date);}
function wwToggleExpand(key,label){
  if(label!=='SATURDAY'&&label!=='SUNDAY')return;
  wwExpandedKey=(wwExpandedKey===key?'':key);
  wwApplyExpandLayout();
}
function wwApplyExpandLayout(){
  var root=document.getElementById('ww-body');
  if(!root)return;
  var cols=Array.from(root.querySelectorAll('.ww-col[data-ww-key]'));
  if(!cols.length)return;
  var colCount=Number(root.getAttribute('data-ww-count')||cols.length);
  var expandedPct=colCount===2?68:(colCount===3?56:50);
  var collapsedPct=(100-expandedPct)/Math.max(1,colCount-1);
  cols.forEach(function(col){
    var key=col.getAttribute('data-ww-key');
    var canExpand=col.getAttribute('data-ww-expandable')==='1';
    var isExpanded=wwExpandedKey&&key===wwExpandedKey;
    var basis='';
    if(wwExpandedKey&&colCount>1){
      basis='calc('+(isExpanded?expandedPct:collapsedPct)+'% - 6px)';
    } else {
      basis=colCount>=3?'calc(33.33% - 6px)':'calc(50% - 4px)';
    }
    col.style.flexBasis=basis;
    col.classList.toggle('expanded',!!isExpanded);
    var pill=col.querySelector('.ww-expand-pill');
    if(pill&&canExpand)pill.textContent=isExpanded?'COLLAPSE':'EXPAND';
  });
}

function wwRender(){
  var el=document.getElementById('ww-body');
  var badge=document.getElementById('ww-badge');
  var nextBtn=document.getElementById('ww-next-btn');
  if(!el)return;
  var dates=wwGetWeekendDates(wwOffset);
  var sat=dates[0],sun=dates[1];
  var adj=wwGetAdjacentHolidays(sat,sun);
  var fri=new Date(sat);fri.setDate(sat.getDate()-1);
  var mon=new Date(sun);mon.setDate(sun.getDate()+1);
  var isThisWeekend=wwOffset===0;
  if(badge)badge.textContent=isThisWeekend?'THIS WEEKEND':localDateStr(sat).slice(0,7);
  if(nextBtn)nextBtn.style.opacity=wwOffset>=5?'.25':'1';
  if(nextBtn)nextBtn.style.pointerEvents=wwOffset>=5?'none':'auto';

  // Build days list
  var days=[];
  if(adj.fri)days.push({date:fri,label:'FRIDAY',holiday:adj.fri,isMain:false});
  days.push({date:sat,label:'SATURDAY',holiday:null,isMain:true});
  days.push({date:sun,label:'SUNDAY',holiday:null,isMain:true});
  if(adj.mon)days.push({date:mon,label:'MONDAY',holiday:adj.mon,isMain:false});
  var wwColors=wwWeekendColorsForSat(sat);

  var mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var h='';

  days.forEach(function(day){
    var k=wwKey(day.date);
    var entry=wwData[k]||{goal:'',notes:[]};
    var status=entry.goalStatus||'';
    var edge='rgba(0,229,255,.15)';
    if(day.label==='SATURDAY')edge=wwColors.sat;
    if(day.label==='SUNDAY')edge=wwColors.sun;

    var dateStr=mn[day.date.getMonth()]+' '+day.date.getDate();

    h+='<div style="border:1px solid '+edge+';box-shadow:inset 0 0 0 1px '+edge+'22;padding:12px;margin-bottom:10px">';

    // Header row: day name + date + status pills
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">';
    h+='<div style="flex:1">';
    h+='<div style="font-size:var(--t-lg);font-family:monospace;color:'+edge+';text-shadow:0 0 8px '+edge+'44;letter-spacing:1px">'+day.label+'</div>';
    h+='<div class="dim-9">'+dateStr+(day.holiday?' · 🎉 '+day.holiday:'')+'</div>';
    h+='</div>';
    // Status toggle buttons
    h+='<div style="display:flex;gap:4px">';
    var statuses=[
      {v:'missed', label:'✗', col:'rgba(255,68,68,.7)',  bg:'rgba(255,68,68,.12)'},
      {v:'half',   label:'½', col:'rgba(255,184,108,.8)',bg:'rgba(255,184,108,.1)'},
      {v:'done',   label:'✓', col:'rgba(0,255,136,.8)', bg:'rgba(0,255,136,.1)'}
    ];
    statuses.forEach(function(s){
      var active=status===s.v;
      h+='<button data-wwstatus="'+k+'" data-wwval="'+s.v+'" style="width:32px;height:32px;border:1px solid '+(active?s.col:'rgba(255,255,255,.12)')+';background:'+(active?s.bg:'transparent')+';color:'+(active?s.col:'var(--dim)')+';font-size:var(--t-body);cursor:pointer;font-family:monospace">'+s.label+'</button>';
    });
    h+='</div>';
    h+='</div>';

    // Goal input
    h+='<div class="dim-9-ls" style="margin-bottom:4px">GOAL</div>';
    var gv=(entry.goal||'').replace(/"/g,'&quot;');
    h+='<input class="ww-goal-inp" id="wwg-'+k+'" value="'+gv+'" placeholder="Mission for the day..." style="width:100%;box-sizing:border-box;background:transparent;border:1px solid rgba(255,255,255,.08);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:7px 9px;outline:none;margin-bottom:8px" oninput="wwSaveField(\''+k+'\',\'goal\',this.value)">';

    // Notes
    h+='<div class="dim-9-ls" style="margin-bottom:4px">NOTES</div>';
    var notes=entry.notes||[];
    notes.forEach(function(n,ni){
      var nv=(n||'').replace(/"/g,'&quot;');
      h+='<div style="display:flex;gap:6px;margin-bottom:4px">';
      h+='<input value="'+nv+'" placeholder="Note..." style="flex:1;background:transparent;border:1px solid var(--c-ghost);color:var(--dim);font-family:monospace;font-size:var(--t-sm);padding:5px 8px;outline:none" oninput="wwSaveNote(\''+k+'\','+ni+',this.value)">';
      h+='<button data-wwnote-del="'+k+'" data-wwnote-idx="'+ni+'" style="background:transparent;border:none;color:rgba(255,255,255,.2);font-size:var(--t-md);cursor:pointer">✕</button>';
      h+='</div>';
    });
    h+='<button data-wwnote-add="'+k+'" style="width:100%;padding:5px;background:transparent;border:1px dashed var(--c-border);color:var(--dim);font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px">+ ADD NOTE</button>';

    h+='</div>';
  });

  el.innerHTML=h;

  // Wire status buttons
  el.querySelectorAll('[data-wwstatus]').forEach(function(btn){
    btn.onclick=function(){
      var k=this.dataset.wwstatus;
      var v=this.dataset.wwval;
      var cur=(wwData[k]&&wwData[k].goalStatus)||'';
      if(!wwData[k])wwData[k]={goal:'',notes:[]};
      wwData[k].goalStatus=(cur===v)?'':v; // toggle
      safeHap(HAP.check);
      wwSave();wwRender();
    };
  });

  // Wire add note
  el.querySelectorAll('[data-wwnote-add]').forEach(function(btn){
    btn.onclick=function(){
      var k=this.dataset.wwnoteAdd;
      // Save any currently typed note values before re-render
      // Save any currently typed note values before re-render
      var noteInps=el.querySelectorAll('input[oninput]');
      var ni=0;
      noteInps.forEach(function(inp){
        var attr=inp.getAttribute('oninput')||'';
        if(attr.indexOf('wwSaveNote')>=0&&attr.indexOf(k)>=0){
          if(!wwData[k].notes)wwData[k].notes=[];
          wwData[k].notes[ni]=inp.value;ni++;
        }
      });
      if(!wwData[k])wwData[k]={goal:'',notes:[]};
      if(!wwData[k].notes)wwData[k].notes=[];
      wwData[k].notes.push('');
      wwSave();wwRender();
    };
  });

  // Wire delete note
  el.querySelectorAll('[data-wwnote-del]').forEach(function(btn){
    btn.onclick=function(){
      var k=this.dataset.wwnoteDel;
      var ni=parseInt(this.dataset.wwnoteIdx);
      if(wwData[k]&&wwData[k].notes)wwData[k].notes.splice(ni,1);
      wwSave();wwRender();
    };
  });
}


function wwSetStatus(key,status){
  if(!wwData[key])wwData[key]={goal:'',notes:[],goalStatus:'',statusLog:[]};
  var prev=wwData[key].goalStatus||'';
  // Toggle off if same
  wwData[key].goalStatus=(prev===status)?'':status;
  if(!wwData[key].statusLog)wwData[key].statusLog=[];
  wwData[key].statusLog.push({status:wwData[key].goalStatus,ts:new Date().toISOString(),goal:wwData[key].goal||''});
  wwSave();
  wwRender();
}


function wwAddNote(key){
  var inp=document.getElementById('wwni-'+key);
  if(!inp||!inp.value.trim())return;
  if(!wwData[key])wwData[key]={goal:'',notes:[],goalStatus:'',statusLog:[]};
  var notes=wwNormalizeNotes(wwData[key]);
  notes.push({text:inp.value.trim(),ts:new Date().toISOString()});
  wwData[key].notes=notes;
  inp.value='';
  wwSave();
  wwRender();
}
function wwDeleteNote(key,idx){
  if(!wwData[key])return;
  var notes=wwNormalizeNotes(wwData[key]);
  notes.splice(idx,1);
  wwData[key].notes=notes;
  wwSave();
  wwRender();
}

function wwSaveField(key,field,val){
  if(!wwData[key])wwData[key]={goal:'',notes:[]};
  wwData[key][field]=val;
  wwSave();
}
function wwSaveNote(key,idx,val){
  if(!wwData[key])wwData[key]={goal:'',notes:[]};
  if(!wwData[key].notes)wwData[key].notes=[];
  wwData[key].notes[idx]=val;
  wwSave();
}

function wwPrevWeek(){if(wwOffset>-5){wwOffset--;wwExpandedKey='';wwRender();}}
function wwNextWeek(){if(wwOffset<5){wwOffset++;wwExpandedKey='';wwRender();}}

// Add to snapshot + export
window.addEventListener('load',function(){if(typeof wwRender==='function')wwRender();});

function snapshotData(){
  if(typeof _lsFlushAll==='function')_lsFlushAll();
  return {
    version:3,
    ts:new Date().toISOString(),
    todos:lsGet('dash_todos',[]),
    notes:lsGet('dash_notes_v2',[]),
    meals:lsGet('dash_meals',[]),
    schedule:lsGet('dash_schedule',{}),
    books:lsGet('dash_books',[]),
    bmarks:lsGet('dash_bmarks',[]),
    sLog:lsGet('s_log',[]),
    ptData:lsGet('pt_data',{}), // includes _focus per day
    birthdays:lsGet('dash_birthdays',[]),
    tileOrder:JSON.parse(localStorage.getItem('dash_tile_order')||'null'),
    clockMode:localStorage.getItem('clockMode')||'24',
    sSettings:sbStripLocalSettings(localStorage.getItem('dash_settings')),
    qtData:lsGet('qt_data',{}),
    jmData:lsGet('jm_data',{}),
    goalsData:JSON.parse(localStorage.getItem('dash_goals')||'{"monthly":[],"yearly":[]}'),
    islamicState:lsGet('dash_islamic',{}),
    wdState:lsGet('dash_wd',{}),
    wwData:lsGet('dash_ww',{}),
    wmData:lsGet('dash_wm',{}),
    wrData:lsGet('dash_wr',[]),
    dlData:lsGet('dash_dl',[]),
    seasonTraditions:lsGet('dash_season_traditions',{}),
    zipConfig:lsGet('dash_zip',{}),
    hiddenTiles:lsGet('dash_hidden_tiles',[]),
    pomoDayData:JSON.parse(localStorage.getItem('pomo_day_data')||'null'),
    pomoHistLog:(function(){var h={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.startsWith('pomo_log_')){try{h[k.slice(9)]=JSON.parse(localStorage.getItem(k)||'[]');}catch(e){}}}return h;}()),
    zipCfg:localStorage.getItem('dash_zip')||'{}',
    sbCfg:localStorage.getItem('dash_sb_config')||'{}',
    qcState:lsGet('dash_qc',{}),
    pinsData:lsGet('dash_pins',[]),
    mlData:lsGet('dash_ml',[]),
    prayerHist:lsGet('prayerHist',{}),
    stockHist:lsGet('stockHist',{}),
    sSettingsRaw:sbStripLocalSettings(localStorage.getItem('dash_settings')),
    milData:lsGet('dash_mil',{}),
    dbData:lsGet('dash_db',{}),
    wlData:lsGet('dash_wl',[]),
    qcState:lsGet('dash_qc',{}),
    gratData:lsGet('dash_grat',[]),
    duaState:lsGet('dash_dua',{}),
    akhiraData:lsGet('dash_akhira',{}),
    cdData:JSON.parse(localStorage.getItem('dash_cd')||'{"items":[],"log":[]}'),

    calorieLog:lsGet('dash_calories',[]),
    writeLog:lsGet('dash_write_log',[]),
    rfData:lsGet('dash_reframe',[]),
    legacyData:lsGet('dash_legacy',{}),
    shadowData:lsGet('dash_shadow',[]),
    fearData:lsGet('dash_fear',{}),
    rfData:lsGet('dash_reframe',[]),
    legacyData:lsGet('dash_legacy',{}),
    shadowData:lsGet('dash_shadow',[]),
    fearData:lsGet('dash_fear',{}),
    rentData:lsGet('dash_rent',[]),
    syncLogAll:lsGet('dash_sync_log_all',[]),
    qwState:lsGet('dash_qw',{}),
    arState:lsGet('dash_ar',{}),
    acState:lsGet('dash_ac',{}),
    smState:lsGet('dash_sm',{}),
    vsState:lsGet('dash_vs',{}),
    artState:lsGet('dash_art',{}),
    juaState:lsGet('dash_jua',{}),
    certData:lsGet('dash_cert',[]),
    medData:JSON.parse(localStorage.getItem('dash_med')||'{"meds":[],"log":[]}'),
    peopleData:lsGet('dash_people',[]),
    stressDemess:JSON.parse(localStorage.getItem('dash_stress_demess')||'{"log":[]}'),
    clData:lsGet('dash_cl',{activities:[],log:{}}),
    semData:lsGet('dash_sem',{subjects:[],_active:null,_tab:'progress'}),
    questState:lsGet('dash_quest',{}),
    ltsData:lsGet('dash_lts',{entries:[]}),
    mipData:lsGet('dash_mip',{months:{}})
  };
}

function restoreSnapshot(snap){
  if(snap.todos)localStorage.setItem('dash_todos',JSON.stringify(snap.todos));
  if(snap.notes)localStorage.setItem('dash_notes_v2',JSON.stringify(snap.notes));
  if(snap.meals)localStorage.setItem('dash_meals',JSON.stringify(snap.meals));
  if(snap.schedule)localStorage.setItem('dash_schedule',JSON.stringify(snap.schedule));
  if(snap.books)localStorage.setItem('dash_books',JSON.stringify(snap.books));
  if(snap.bmarks)localStorage.setItem('dash_bmarks',JSON.stringify(snap.bmarks));
  if(snap.sLog)localStorage.setItem('s_log',JSON.stringify(snap.sLog));
  if(snap.ptData)localStorage.setItem('pt_data',JSON.stringify(snap.ptData));
  if(snap.birthdays)localStorage.setItem('dash_birthdays',JSON.stringify(snap.birthdays));
  if(snap.tileOrder)localStorage.setItem('dash_tile_order',JSON.stringify(snap.tileOrder));
  if(snap.clockMode)localStorage.setItem('clockMode',snap.clockMode);
  if(snap.hiddenTiles)localStorage.setItem('dash_hidden_tiles',JSON.stringify(snap.hiddenTiles));
  if(snap.qtData)localStorage.setItem('qt_data',JSON.stringify(snap.qtData));
  if(snap.jmData)localStorage.setItem('jm_data',JSON.stringify(snap.jmData));
  if(snap.goalsData)localStorage.setItem('dash_goals',JSON.stringify(snap.goalsData));
  if(snap.islamicState)localStorage.setItem('dash_islamic',JSON.stringify(snap.islamicState));
  if(snap.wdState)localStorage.setItem('dash_wd',JSON.stringify(snap.wdState));
  if(snap.wwData)localStorage.setItem('dash_ww',JSON.stringify(snap.wwData));
  if(snap.wmData)localStorage.setItem('dash_wm',JSON.stringify(snap.wmData));
  if(snap.wrData)localStorage.setItem('dash_wr',JSON.stringify(snap.wrData));
  if(snap.dlData)localStorage.setItem('dash_dl',JSON.stringify(snap.dlData));
  if(snap.seasonTraditions)localStorage.setItem('dash_season_traditions',JSON.stringify(snap.seasonTraditions));
  if(snap.pomoDayData)localStorage.setItem('pomo_day_data',JSON.stringify(snap.pomoDayData));
  if(snap.pomoHistLog){Object.keys(snap.pomoHistLog).forEach(function(d){localStorage.setItem('pomo_log_'+d,JSON.stringify(snap.pomoHistLog[d]));});}
  if(snap.zipCfg)localStorage.setItem('dash_zip',snap.zipCfg);
  if(snap.sbCfg)localStorage.setItem('dash_sb_config',snap.sbCfg);
  if(snap.qcState)localStorage.setItem('dash_qc',JSON.stringify(snap.qcState));
  if(snap.pinsData)localStorage.setItem('dash_pins',JSON.stringify(snap.pinsData));
  if(snap.milData)localStorage.setItem('dash_mil',JSON.stringify(snap.milData));
  if(snap.mlData)localStorage.setItem('dash_ml',JSON.stringify(snap.mlData));
  if(snap.prayerHist)localStorage.setItem('prayerHist',JSON.stringify(snap.prayerHist));
  if(snap.stockHist)localStorage.setItem('stockHist',JSON.stringify(snap.stockHist));
  if(snap.stockHist)localStorage.setItem('stockHist',JSON.stringify(snap.stockHist));
  if(snap.sSettingsRaw){
    // Merge: keep local appearance prefs, restore everything else
    var _LOCAL_APP=['compact','slimScreen','iconMode','minimalMode','singleCol',
      'crt','vignette','bgVisuals','bgVisualSinSin','starfield','cardEntrance',
      'scrollGlow','bigBorders','textGlow','scrollTrail','largeText','magnetMode','noGoogleFonts','letterNav'];
    try{
      var _remote=JSON.parse(snap.sSettingsRaw||'{}');
      var _local=lsGet('dash_settings',{});
      // Start with remote, then overlay local appearance keys
      var _merged=Object.assign({},_remote);
      _LOCAL_APP.forEach(function(k){if(_local.hasOwnProperty(k))_merged[k]=_local[k];});
      lsSet('dash_settings',_merged);
    }catch(e){localStorage.setItem('dash_settings',snap.sSettingsRaw);}
  }
  if(snap.milData)localStorage.setItem('dash_mil',JSON.stringify(snap.milData));
  if(snap.dbData)localStorage.setItem('dash_db',JSON.stringify(snap.dbData));
  if(snap.wlData)localStorage.setItem('dash_wl',JSON.stringify(snap.wlData));
  if(snap.qcState)localStorage.setItem('dash_qc',JSON.stringify(snap.qcState));
  if(snap.gratData)localStorage.setItem('dash_grat',JSON.stringify(snap.gratData));
  if(snap.duaState)localStorage.setItem('dash_dua',JSON.stringify(snap.duaState));
  if(snap.akhiraData)localStorage.setItem('dash_akhira',JSON.stringify(snap.akhiraData));
  if(snap.cdData)localStorage.setItem('dash_cd',JSON.stringify(snap.cdData));
  if(snap.userCalEvents)localStorage.setItem('dash_user_cal',JSON.stringify(snap.userCalEvents));
  if(snap.calorieLog)localStorage.setItem('dash_calories',JSON.stringify(snap.calorieLog));
  if(snap.writeLog)localStorage.setItem('dash_write_log',JSON.stringify(snap.writeLog));
  if(snap.rfData)localStorage.setItem('dash_reframe',JSON.stringify(snap.rfData));
  if(snap.legacyData)localStorage.setItem('dash_legacy',JSON.stringify(snap.legacyData));
  if(snap.shadowData)localStorage.setItem('dash_shadow',JSON.stringify(snap.shadowData));
  if(snap.fearData)localStorage.setItem('dash_fear',JSON.stringify(snap.fearData));
  if(snap.peopleData)localStorage.setItem('dash_people',JSON.stringify(snap.peopleData));
  if(snap.rentData)localStorage.setItem('dash_rent',JSON.stringify(snap.rentData));
  if(snap.qwState)localStorage.setItem('dash_qw',JSON.stringify(snap.qwState));
  if(snap.arState)localStorage.setItem('dash_ar',JSON.stringify(snap.arState));
  if(snap.acState)localStorage.setItem('dash_ac',JSON.stringify(snap.acState));
  if(snap.smState)localStorage.setItem('dash_sm',JSON.stringify(snap.smState));
  if(snap.vsState)localStorage.setItem('dash_vs',JSON.stringify(snap.vsState));
  if(snap.artState)localStorage.setItem('dash_art',JSON.stringify(snap.artState));
  if(snap.juaState)localStorage.setItem('dash_jua',JSON.stringify(snap.juaState));
  if(snap.certData)localStorage.setItem('dash_cert',JSON.stringify(snap.certData));
  if(snap.medData)localStorage.setItem('dash_med',JSON.stringify(snap.medData));
  if(snap.peopleData)localStorage.setItem('dash_people',JSON.stringify(snap.peopleData));
  if(snap.stressDemess)localStorage.setItem('dash_stress_demess',JSON.stringify(snap.stressDemess));
  if(snap.clData)localStorage.setItem('dash_cl',JSON.stringify(snap.clData));
  if(snap.semData)localStorage.setItem('dash_sem',JSON.stringify(snap.semData));
  if(snap.questState)localStorage.setItem('dash_quest',JSON.stringify(snap.questState));
  if(snap.ltsData)localStorage.setItem('dash_lts',JSON.stringify(snap.ltsData));
  if(snap.mipData)localStorage.setItem('dash_mip',JSON.stringify(snap.mipData));
  if(snap.syncLogAll&&Array.isArray(snap.syncLogAll)){
    var _curAll=lsGet('dash_sync_log_all',[]);
    var _allMap={};
    snap.syncLogAll.concat(_curAll).forEach(function(e){
      var k=(e.ts||'')+'|'+(e.device||'');
      if(!_allMap[k])_allMap[k]=e;
    });
    var _merged=Object.values(_allMap).sort(function(a,b){return b.ts>a.ts?1:-1;}).slice(0,20);
    lsSet('dash_sync_log_all',_merged);
  }
}

function doBackup(manual){
  var snap=snapshotData();
  var now=new Date();

  // ── Recent backups: keep last 3 ──
  var recent=lsGet('bk_recent',[]);
  recent.unshift(snap);
  if(recent.length>3)recent=recent.slice(0,3);
  lsSet('bk_recent',recent);

  // ── Daily backups: 1 per day for 7 days ──
  var daily=lsGet('bk_daily',{});
  var dayKey=localDateStr(now);
  daily[dayKey]=snap;
  // Prune to last 7 days
  var dayKeys=Object.keys(daily).sort().reverse().slice(0,7);
  var pruned={};
  dayKeys.forEach(function(k){pruned[k]=daily[k];});
  lsSet('bk_daily',pruned);

  localStorage.setItem('bk_last',now.toISOString());
  renderBackupList();
  if(manual){
    var btn=document.querySelector('[onclick="doManualBackup()"]');
    if(btn){btn.textContent='&#10003; SAVED';setTimeout(function(){btn.innerHTML='&#128190; BACKUP NOW';},1500);}
  }
}

function doManualBackup(){doBackup(true);}

function fmtBackupTime(isoStr){
  var d=new Date(isoStr);
  var now=new Date();
  var diffMs=now-d;
  var diffMins=Math.floor(diffMs/60000);
  var diffHrs=Math.floor(diffMs/3600000);
  var diffDays=Math.floor(diffMs/86400000);
  var time=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  var date=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  if(diffMins<1)return{main:'Just now',sub:''};
  if(diffMins<60)return{main:diffMins+'m ago',sub:time};
  if(diffHrs<24)return{main:diffHrs+'h ago',sub:time};
  return{main:date,sub:time};
}

var bkRestorePending={};

function confirmRestore(key,idx){
  var pid=key+'-'+idx;
  if(!bkRestorePending[pid]){
    bkRestorePending[pid]=true;
    var btn=document.getElementById('bkbtn-'+pid);
    if(btn){btn.textContent='SURE?';btn.style.color='var(--ca)';}
    setTimeout(function(){
      bkRestorePending[pid]=false;
      var b=document.getElementById('bkbtn-'+pid);
      if(b){b.textContent='RESTORE';b.style.color='';}
    },3000);
    return;
  }
  bkRestorePending[pid]=false;
  // Do restore
  var snap=null;
  if(key==='recent'){
    var recent=lsGet('bk_recent',[]);
    snap=recent[idx];
  } else {
    var daily=lsGet('bk_daily',{});
    snap=daily[idx];
  }
  if(!snap){alert('Backup not found.');return;}
  restoreSnapshot(snap);
  alert('Restored! Refreshing...');
  location.reload();
}

function renderBackupList(){
  var el=document.getElementById('backup-list');
  if(!el)return;
  var recent=lsGet('bk_recent',[]);
  var daily=lsGet('bk_daily',{});
  var h='';

  if(!recent.length&&!Object.keys(daily).length){
    h='<div class="bk-empty">No backups yet. Tap BACKUP NOW or wait for auto-save.</div>';
    el.innerHTML=h;return;
  }

  // Recent
  if(recent.length){
    h+='<div style="font-size:var(--t-xs);letter-spacing:1px;color:var(--dim);margin-bottom:4px">RECENT (last 3)</div>';
    recent.forEach(function(snap,i){
      var t=fmtBackupTime(snap.ts);
      var pid='recent-'+i;
      h+='<div class="bk-item">'
        +'<div class="bk-meta"><div class="bk-time">'+t.main+'</div>'+(t.sub?'<div class="bk-label">'+t.sub+'</div>':'')+'</div>'
        +'<div class="bk-actions">'
        +'<button class="bk-btn restore" id="bkbtn-'+pid+'" onclick="confirmRestore(\'recent\','+i+')">RESTORE</button>'
        +'</div></div>';
    });
  }

  // Daily
  var dayKeys=Object.keys(daily).sort().reverse();
  if(dayKeys.length){
    h+='<div style="font-size:var(--t-xs);letter-spacing:1px;color:var(--dim);margin:8px 0 4px">DAILY (7 days)</div>';
    dayKeys.forEach(function(dk){
      var snap=daily[dk];
      var t=fmtBackupTime(snap.ts);
      var d=new Date(dk+'T12:00:00');
      var label=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      var pid='daily-'+dk;
      h+='<div class="bk-item">'
        +'<div class="bk-meta"><div class="bk-time">'+label+'</div><div class="bk-label">'+t.sub+'</div></div>'
        +'<div class="bk-actions">'
        +'<button class="bk-btn restore" id="bkbtn-'+pid+'" onclick="confirmRestore(\'daily\',\''+dk+'\')">RESTORE</button>'
        +'</div></div>';
    });
  }

  el.innerHTML=h;
}

// Auto-backup every 5 minutes
function autoBackupTick(){
  var last=localStorage.getItem('bk_last');
  var now=new Date();
  if(!last||((now-new Date(last))>=5*60*1000)){
    doBackup(false);
  }
}
setInterval(autoBackupTick,60*1000); // check every minute
autoBackupTick(); // run immediately on load

// ── SETTINGS ──
var clearDataPending=false;
function exportAllData(){
  var data={
    version:2,
    exported:new Date().toISOString(),
    // Core data
    todos:lsGet('dash_todos',[]),
    notes:lsGet('dash_notes_v2',[]),
    meals:lsGet('dash_meals',[]),
    schedule:lsGet('dash_schedule',{}),
    books:lsGet('dash_books',[]),
    bmarks:lsGet('dash_bmarks',[]),
    sLog:lsGet('s_log',[]),
    ptData:lsGet('pt_data',{}), // includes _focus per day
    prayerHist:lsGet('prayerHist',{}),
    stockHist:lsGet('stockHist',{}),
    stockHist:lsGet('stockHist',{}),
    birthdays:lsGet('dash_birthdays',[]),
    // New cards
    qtData:lsGet('qt_data',{}),
    jmData:lsGet('jm_data',{}),
    goalsData:lsGet('dash_goals',{}),
    islamicState:lsGet('dash_islamic',{}),
    wdState:lsGet('dash_wd',{}),
    wwData:lsGet('dash_ww',{}),
    wmData:lsGet('dash_wm',{}),
    wrData:lsGet('dash_wr',[]),
    dlData:lsGet('dash_dl',[]),
    mlData:lsGet('dash_ml',[]),
    qcState:lsGet('dash_qc',{}),
    pinsData:lsGet('dash_pins',[]),
    wmData:lsGet('dash_wm',{}),
    wrData:lsGet('dash_wr',[]),
    dlData:lsGet('dash_dl',[]),
    seasonTraditions:lsGet('dash_season_traditions',{}),
    pomoDayData:JSON.parse(localStorage.getItem('pomo_day_data')||'null'),
    pomoHistLog:(function(){var h={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.startsWith('pomo_log_')){try{h[k.slice(9)]=JSON.parse(localStorage.getItem(k)||'[]');}catch(e){}}}return h;}()),
    // Settings & config
    tileOrder:JSON.parse(localStorage.getItem('dash_tile_order')||'null'),
    clockMode:localStorage.getItem('clockMode')||'24',
    sSettings:localStorage.getItem('dash_settings')||'{}',
    hiddenTiles:lsGet('dash_hidden_tiles',[]),
    zipConfig:lsGet('dash_zip',{}),
    milData:lsGet('dash_mil',{}),
    wlData:lsGet('dash_wl',[]),
    clData:lsGet('dash_cl',{activities:[],log:{}}),
    semData:lsGet('dash_sem',{subjects:[],_active:null,_tab:'progress'}),
    // Supabase credentials
    sbCfg:localStorage.getItem('dash_sb_config')||'{}'
  };
  var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download='dashboard-backup-'+localDateStr()+'.json';
  a.click();
  URL.revokeObjectURL(url);
}
function importAllData(evt){
  var file=evt.target.files[0];
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var data=JSON.parse(e.target.result);
      // Core data
      if(data.todos)localStorage.setItem('dash_todos',JSON.stringify(data.todos));
      if(data.notes)localStorage.setItem('dash_notes_v2',JSON.stringify(data.notes));
      if(data.meals)localStorage.setItem('dash_meals',JSON.stringify(data.meals));
      if(data.schedule)localStorage.setItem('dash_schedule',JSON.stringify(data.schedule));
      if(data.books)localStorage.setItem('dash_books',JSON.stringify(data.books));
      if(data.bmarks)localStorage.setItem('dash_bmarks',JSON.stringify(data.bmarks));
      if(data.sLog)localStorage.setItem('s_log',JSON.stringify(data.sLog));
      if(data.ptData)localStorage.setItem('pt_data',JSON.stringify(data.ptData));
      if(data.prayerHist)localStorage.setItem('prayerHist',JSON.stringify(data.prayerHist));
      if(data.stockHist)localStorage.setItem('stockHist',JSON.stringify(data.stockHist));
      if(data.birthdays)localStorage.setItem('dash_birthdays',JSON.stringify(data.birthdays));
      // New cards
      if(data.qtData)localStorage.setItem('qt_data',JSON.stringify(data.qtData));
      if(data.jmData)localStorage.setItem('jm_data',JSON.stringify(data.jmData));
      if(data.goalsData)localStorage.setItem('dash_goals',JSON.stringify(data.goalsData));
      if(data.islamicState)localStorage.setItem('dash_islamic',JSON.stringify(data.islamicState));
      if(data.wdState)localStorage.setItem('dash_wd',JSON.stringify(data.wdState));
      if(data.wwData)localStorage.setItem('dash_ww',JSON.stringify(data.wwData));
      if(data.wmData)localStorage.setItem('dash_wm',JSON.stringify(data.wmData));
      if(data.wrData)localStorage.setItem('dash_wr',JSON.stringify(data.wrData));
      if(data.dlData)localStorage.setItem('dash_dl',JSON.stringify(data.dlData));
      if(data.mlData)localStorage.setItem('dash_ml',JSON.stringify(data.mlData));
      if(data.qcState)localStorage.setItem('dash_qc',JSON.stringify(data.qcState));
      if(data.pinsData)localStorage.setItem('dash_pins',JSON.stringify(data.pinsData));
  if(data.milData)localStorage.setItem('dash_mil',JSON.stringify(data.milData));
      if(data.seasonTraditions)localStorage.setItem('dash_season_traditions',JSON.stringify(data.seasonTraditions));
      if(data.pomoDayData)localStorage.setItem('pomo_day_data',JSON.stringify(data.pomoDayData));
      if(data.pomoHistLog){Object.keys(data.pomoHistLog).forEach(function(d){localStorage.setItem('pomo_log_'+d,JSON.stringify(data.pomoHistLog[d]));});}
      // Settings & config
      if(data.tileOrder)localStorage.setItem('dash_tile_order',JSON.stringify(data.tileOrder));
      if(data.clockMode)localStorage.setItem('clockMode',data.clockMode);
      if(data.sSettings)localStorage.setItem('dash_settings',data.sSettings);
      if(data.hiddenTiles)localStorage.setItem('dash_hidden_tiles',JSON.stringify(data.hiddenTiles));
      if(data.zipConfig)localStorage.setItem('dash_zip',JSON.stringify(data.zipConfig));
      // Supabase credentials
      if(data.wlData)localStorage.setItem('dash_wl',JSON.stringify(data.wlData));
      if(data.cdData)localStorage.setItem('dash_cd',JSON.stringify(data.cdData));
      if(data.rfData)localStorage.setItem('dash_reframe',JSON.stringify(data.rfData));
      if(data.legacyData)localStorage.setItem('dash_legacy',JSON.stringify(data.legacyData));
      if(data.shadowData)localStorage.setItem('dash_shadow',JSON.stringify(data.shadowData));
      if(data.fearData)localStorage.setItem('dash_fear',JSON.stringify(data.fearData));
      if(data.peopleData)localStorage.setItem('dash_people',JSON.stringify(data.peopleData));
      if(data.sbCfg)localStorage.setItem('dash_sb_config',data.sbCfg);
      if(data.clData)localStorage.setItem('dash_cl',JSON.stringify(data.clData));
      if(data.semData)localStorage.setItem('dash_sem',JSON.stringify(data.semData));
      alert('Import successful! Refreshing...');
      location.reload();
    }catch(err){alert('Import failed: '+err.message);}
  };
  reader.readAsText(file);
  evt.target.value='';
}
function resetTileOrder(){
  localStorage.removeItem('dash_tile_order');
  location.reload();
}
function clearAllData(){
  var btn=document.getElementById('clear-data-btn');
  if(!clearDataPending){
    clearDataPending=true;
    if(btn){btn.textContent='SURE? TAP AGAIN';btn.style.background='rgba(255,68,68,.12)';}
    setTimeout(function(){
      clearDataPending=false;
      if(btn){btn.textContent='\u{1F5D1} CLEAR ALL DATA';btn.style.background='';}
    },3000);
    return;
  }
  ['dash_todos','dash_notes_v2','dash_meals','dash_schedule','dash_books','dash_bmarks',
   's_log','pt_data','prayerHist','stockHist','dash_tile_order','clockMode','prayerHist',
   'dash_jua','dash_qt','dash_med','dash_cert','dash_goals','jm_data'].forEach(function(k){
    localStorage.removeItem(k);
  });
  localStorage.removeItem('dash_season_traditions');
  location.reload();
}

// ── ICON MODE EXPAND (inline at top of grid) ──
var iconActiveTile=null;

var ICON_RENDERERS={
  'clock':function(){},
  'prayer':function(){renderPrayer();},
  'weather':function(){renderWeather();},
  'stocks':function(){renderStocks();},
  'todo':function(){renderTodos();},
  'meals':function(){renderMeals();},
  'calendar':function(){renderCal();},
  'notes':function(){renderNotes(false);},
  'schedule':function(){renderSched();},
  'books':function(){renderBooks();},
  's-tracker':function(){renderSMain();},
  'prayer-tracker':function(){ptRenderToday();},
  'raft':function(){},
  'settings':function(){},
  'bookmarks':function(){}
};

function iconExpand(tile){
  if(!getSetting('iconMode'))return;
  var tid=tile.dataset.id;
  var grid=document.getElementById('grid');
  if(!grid)return;
  // If same tile tapped again — close
  if(iconActiveTile===tile){
    iconClose();
    return;
  }
  iconClose();
  iconActiveTile=tile;
  tile.classList.add('icon-active');
  // Build inline card
  var card=document.createElement('div');
  card.id='icon-inline-card';
  // Close bar
  var label=tile.querySelector('.icon-label');
  var closeBar=document.createElement('div');
  closeBar.className='icon-close-bar';
  closeBar.innerHTML='<span class="icon-close-label">'+(label?label.textContent:'')+'</span>'
    +'<button class="icon-close-btn" onclick="iconClose()">&#10005; CLOSE</button>';
  card.appendChild(closeBar);
  // For raft: move actual nodes (canvas can't be cloned with pixels)
  // For all others: clone nodes
  var tid2=tile.dataset.id;
  var movedNodes=[];
  Array.from(tile.childNodes).forEach(function(n){
    if(!n.classList)return;
    if(n.classList.contains('icon-label-wrap')||n.classList.contains('drag-handle'))return;
    if(tid2==='raft'){
      // Move actual node, record original parent for restoration
      movedNodes.push({node:n,parent:tile,next:n.nextSibling});
      card.appendChild(n);
    } else {
      card.appendChild(n.cloneNode(true));
    }
  });
  card._movedNodes=movedNodes;
  card._sourceTile=tile;
  // Inherit tile color class
  var cm=tile.className.match(/\btg\b|\bta\b|\btc\b|\btl\b|\btp\b|\bto\b|\btpr\b/);
  if(cm)card.classList.add(cm[0]);
  // Insert as first child of grid
  grid.insertBefore(card,grid.firstChild);
  // Scroll to top
  window.scrollTo({top:0,behavior:'smooth'});
  // Re-render live content into the card
  setTimeout(function(){
    if(ICON_RENDERERS[tid])ICON_RENDERERS[tid]();
  },60);
}

function iconClose(){
  var card=document.getElementById('icon-inline-card');
  if(card){
    // Restore any moved nodes back to their original tile
    if(card._movedNodes&&card._movedNodes.length){
      card._movedNodes.forEach(function(m){
        if(m.next)m.parent.insertBefore(m.node,m.next);
        else m.parent.appendChild(m.node);
      });
    }
    card.remove();
  }
  if(iconActiveTile){iconActiveTile.classList.remove('icon-active');iconActiveTile=null;}
}

// Hook tile clicks in icon mode
document.addEventListener('click',function(e){
  if(!getSetting('iconMode'))return;
  if(e.target.closest('#icon-inline-card'))return;
  if(e.target.closest('.sset-toggle')||e.target.closest('.sset-row')||e.target.closest('.sset-hdr')||e.target.closest('.sset-body'))return;
  var tile=e.target.closest('[data-id]');
  if(!tile)return;
  e.stopPropagation();
  e.preventDefault();
  iconExpand(tile);
},true);

// ── TILE REORDER MODAL ──
var reorderList=[];

var TILE_NAMES={'birthdays':'Birthdays','season-traditions':'Season Traditions','ebook-library':'E-Book Library','writers-den':'Writer Den','weekend-warrior':'Weekend Warrior','pickleball':'Pickleball','quran-tracker':'Quran Pages','juz-amma':'Juz Amma','islamic-topics':'Islamic Topics','goals':'Goals','pomodoro':'Pomodoro','meal-prep':'Meal Prep',
  clock:'Clock',prayer:'Prayer Times',weather:'Weather',stocks:'Markets',
  todo:'To-Do',meals:'Meals',calendar:'Calendar',notes:'Notes',
  schedule:'Work Arrival',books:'Books','s-tracker':'S Tracker',
  'prayer-tracker':'Salah Tracker',raft:'Raft',settings:'Settings',bookmarks:'Bookmarks','the-wall':'The Wall','countdown':'In X Days','reframe':'Reframe','legacy-letter':'Legacy Letter','shadow-log':'Shadow Log','fear-inventory':'Fear Inventory','people-become':'People I Want to Become','writing-log':'Creative Writing'
};

var TILE_EMOJI={'clock':'🕐','prayer':'☪','weather':'⛅','stocks':'◆','todo':'▣','meals':'◉','calendar':'▦','notes':'▤','schedule':'🕖','books':'📖','birthdays':'🎂','season-traditions':'🍂','pickleball':'🏓','s-tracker':'🔒','prayer-tracker':'📈','quran-tracker':'📖','juz-amma':'📱','islamic-topics':'☯','pomodoro':'⏱','goals':'🎯','meal-prep':'🥗','ebook-library':'📚','raft':'🌊','settings':'⚙','bookmarks':'🔖'};
function openReorder(){
  var g=document.getElementById('grid');
  reorderList=Array.from(g.querySelectorAll('[data-id]')).map(function(el){return el.dataset.id;});
  renderReorderModal();
}

function renderReorderModal(){
  var existing=document.getElementById('reorder-modal');
  if(existing)existing.remove();
  var modal=document.createElement('div');
  modal.id='reorder-modal';
  modal.className='reorder-modal';
  var h='<div class="reorder-header">'    +'<span class="reorder-title">&#8942; DRAG TO REORDER</span>'    +'<div class="flex-row">'    +'<button class="settings-btn" onclick="applyReorder()" style="padding:4px 14px;font-size:var(--t-sm)">&#10003; APPLY</button>'    +'<button class="reorder-close" onclick="closeReorder()">&#10005;</button>'    +'</div></div>'    +'<div style="font-size:var(--t-xs);color:var(--dim);padding:4px 12px 8px;letter-spacing:1px">Drag to reorder &bull; tap APPLY to save</div>'    +'<div class="ro-grid" id="ro-grid">';
  reorderList.forEach(function(id,i){
    var name=TILE_NAMES[id]||id;
    var emoji=TILE_EMOJI[id]||'▪';
    h+='<div class="ro-item" id="roi-'+i+'" data-idx="'+i+'" draggable="true">'
      +'<div class="ro-item-emoji">'+emoji+'</div>'
      +'<div class="ro-item-name">'+name+'</div>'
      +'<div class="ro-item-btns">'
      +(i>=5?'<button class="ro-mv-btn" data-from="'+i+'" data-delta="-5" title="Move 5 up">⇡</button>':'<span class="ro-mv-btn" style="opacity:.1" disabled>⇡</span>')
      +(i<=reorderList.length-6?'<button class="ro-mv-btn" data-from="'+i+'" data-delta="5" title="Move 5 down">⇣</button>':'<span class="ro-mv-btn" style="opacity:.1" disabled>⇣</span>')
      +'</div>'
      +'</div>';
  });
  h+='</div>';
  modal.innerHTML=h;
  document.body.appendChild(modal);
  wireReorderDrag();
  // Wire move buttons
  document.querySelectorAll('.ro-mv-btn[data-from]').forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      var from=parseInt(this.dataset.from);
      var delta=parseInt(this.dataset.delta);
      var to=Math.max(0,Math.min(reorderList.length-1,from+delta));
      if(from===to)return;
      // Shift items between from and to
      var item=reorderList.splice(from,1)[0];
      reorderList.splice(to,0,item);
      renderReorderModal();
    };
  });
}

function wireReorderDrag(){
  var grid=document.getElementById('ro-grid');
  if(!grid)return;
  var dragSrc=null;
  var touchClone=null;

  function swapItems(fromIdx,toIdx){
    if(fromIdx===toIdx)return;
    var tmp=reorderList[fromIdx];
    reorderList[fromIdx]=reorderList[toIdx];
    reorderList[toIdx]=tmp;
    renderReorderModal();
  }

  grid.querySelectorAll('.ro-item').forEach(function(item){
    // Mouse drag
    item.addEventListener('dragstart',function(e){
      dragSrc=item;item.classList.add('ro-dragging');
      e.dataTransfer.effectAllowed='move';
    });
    item.addEventListener('dragend',function(){
      item.classList.remove('ro-dragging');
      grid.querySelectorAll('.ro-item').forEach(function(i){i.classList.remove('ro-over');});
    });
    item.addEventListener('dragover',function(e){
      e.preventDefault();
      grid.querySelectorAll('.ro-item').forEach(function(i){i.classList.remove('ro-over');});
      if(item!==dragSrc)item.classList.add('ro-over');
    });
    item.addEventListener('drop',function(e){
      e.preventDefault();
      if(!dragSrc||dragSrc===item)return;
      swapItems(parseInt(dragSrc.dataset.idx),parseInt(item.dataset.idx));
    });
    // Touch drag
    item.addEventListener('touchstart',function(e){
      dragSrc=item;
      var r=item.getBoundingClientRect();
      touchClone=item.cloneNode(true);
      touchClone.style.cssText='position:fixed;pointer-events:none;z-index:99999;opacity:.85;width:'+r.width+'px;height:'+r.height+'px;top:'+r.top+'px;left:'+r.left+'px;border-color:var(--cg);background:rgba(0,255,136,.1)';
      document.body.appendChild(touchClone);
      item.classList.add('ro-dragging');
    },{passive:true});
    item.addEventListener('touchmove',function(e){
      e.preventDefault();
      var t=e.touches[0];
      if(touchClone){
        touchClone.style.top=(t.clientY-34)+'px';
        touchClone.style.left=(t.clientX-44)+'px';
      }
      grid.querySelectorAll('.ro-item').forEach(function(i){i.classList.remove('ro-over');});
      var over=document.elementFromPoint(t.clientX,t.clientY);
      var overItem=over&&over.closest('.ro-item');
      if(overItem&&overItem!==dragSrc)overItem.classList.add('ro-over');
    },{passive:false});
    item.addEventListener('touchend',function(e){
      if(touchClone){touchClone.remove();touchClone=null;}
      item.classList.remove('ro-dragging');
      var t=e.changedTouches[0];
      var over=document.elementFromPoint(t.clientX,t.clientY);
      var overItem=over&&over.closest('.ro-item');
      grid.querySelectorAll('.ro-item').forEach(function(i){i.classList.remove('ro-over');});
      if(overItem&&overItem!==item){
        swapItems(parseInt(item.dataset.idx),parseInt(overItem.dataset.idx));
      }
    },{passive:true});
  });
}


function applyReorder(){
  tileOrder=reorderList.slice();
  lsSet('dash_tile_order',tileOrder);
  applyOrder();
  if(getSetting('magnetMode'))enforceMagnetAll();
  closeReorder();
}

function closeReorder(){
  var m=document.getElementById('reorder-modal');
  if(m)m.remove();
}


// ── SEASON TRADITIONS ──
var stData=lsGet('dash_season_traditions',{});
var ST_SEASONS=['spring','summer','fall','winter'];
var ST_LABELS={spring:'SPRING',summer:'SUMMER',fall:'FALL',winter:'WINTER'};
function stCurrentSeason(){
  var m=(new Date()).getMonth()+1;
  if(m>=3&&m<=5)return 'spring';
  if(m>=6&&m<=8)return 'summer';
  if(m>=9&&m<=11)return 'fall';
  return 'winter';
}
var stSeason=(function(){
  var saved=localStorage.getItem('dash_st_tab');
  return ST_SEASONS.indexOf(saved)>=0?saved:stCurrentSeason();
})();
function stSave(){lsSet('dash_season_traditions',stData);}
function stYear(){return (new Date()).getFullYear();}
var stViewYear=(function(){
  var y=parseInt(localStorage.getItem('dash_st_year')||'',10);
  var cy=stYear();
  if(isNaN(y))return cy;
  if(y<cy-5)return cy-5;
  if(y>cy+5)return cy+5;
  return y;
})();
function stKey(season,year){return String(year)+'-'+season;}
function stEnsureEntry(season,year){
  var key=stKey(season,year);
  if(!stData[key])stData[key]={tradition1:'',tradition2:'',tradition3:'',notes:''};
  // Migrate old single tradition
  if(stData[key].tradition!==undefined&&!stData[key].tradition1){
    stData[key].tradition1=stData[key].tradition||'';
    delete stData[key].tradition;
  }
  return stData[key];
}
function stSeasonColor(season){
  if(season==='spring')return '#1ec663';
  if(season==='summer')return '#ee7521';
  if(season==='fall')return '#ce8464';
  return '#55fff1';
}
function stSwitchTab(season){
  if(ST_SEASONS.indexOf(season)<0)return;
  stSeason=season;
  localStorage.setItem('dash_st_tab',season);
  stRender();
}
function stShiftYear(delta){
  var y=stYear();
  var minY=y-5,maxY=y+5;
  stViewYear=Math.max(minY,Math.min(maxY,stViewYear+delta));
  localStorage.setItem('dash_st_year',String(stViewYear));
  stRender();
}
function stSaveField(field,val){
  var y=stViewYear;
  var entry=stEnsureEntry(stSeason,y);
  entry[field]=val||'';
  entry.updatedAt=new Date().toISOString();
  stSave();
  var status=document.getElementById('st-status');
  if(status)status.textContent='Saved '+ST_LABELS[stSeason]+' '+y+' at '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
}
function stRender(){
  var y=stViewYear;
  var entry=stEnsureEntry(stSeason,y);
  var accent=stSeasonColor(stSeason);
  var title=document.getElementById('st-active-title');
  var yBadge=document.getElementById('st-year-badge');
  var notes=document.getElementById('st-notes-inp');
  var status=document.getElementById('st-status');
  if(yBadge)yBadge.textContent=String(y);
  if(title){title.textContent=ST_LABELS[stSeason]+' '+y;title.style.color=accent;}
  ST_SEASONS.forEach(function(s){
    var tab=document.getElementById('st-tab-'+s);
    if(!tab)return;
    var on=s===stSeason;
    tab.style.color=on?accent:'var(--dim)';
    tab.style.borderColor=on?accent:'var(--dim)';
  });
  var t1=document.getElementById('st-tradition-1');
  var t2=document.getElementById('st-tradition-2');
  var t3=document.getElementById('st-tradition-3');
  if(t1)t1.value=entry.tradition1||'';
  if(t2)t2.value=entry.tradition2||'';
  if(t3)t3.value=entry.tradition3||'';
  if(notes)notes.value=entry.notes||'';
  if(status){
    if(entry.updatedAt)status.textContent='Last update: '+new Date(entry.updatedAt).toLocaleString();
    else status.textContent='No entry saved yet for '+ST_LABELS[stSeason]+' '+y+'.';
  }
}
function exportSeasonTraditions(){
  var keys=Object.keys(stData);
  if(!keys.length){clipCopy('(no season traditions yet)','Season Traditions');return;}
  var idxMap={spring:0,summer:1,fall:2,winter:3};
  keys.sort(function(a,b){
    var ap=a.split('-'),bp=b.split('-');
    var ay=Number(ap[0]||0),by=Number(bp[0]||0);
    if(ay!==by)return by-ay;
    return (idxMap[ap[1]]||0)-(idxMap[bp[1]]||0);
  });
  var lines=['# Season Traditions',''];
  keys.forEach(function(key){
    var parts=key.split('-');
    var year=parts[0];
    var season=parts[1];
    var entry=stData[key]||{};
    lines.push('## '+(ST_LABELS[season]||season.toUpperCase())+' '+year);
    lines.push('Tradition: '+(entry.tradition||'(none)'));
    lines.push('Notes: '+(entry.notes||'(none)'));
    lines.push('');
  });
  clipCopy(lines.join('\n'),'Season Traditions');
}
setTimeout(stRender,200);

// ── BIRTHDAYS ──
var birthdays=window.birthdays=lsGet('dash_birthdays',[]);
var bdayDeletePending={};
var bdayEditId=null;
var bdayTab='view';

function saveBirthdays(){lsSet('dash_birthdays',birthdays);window.birthdays=birthdays;if(typeof renderCal==='function')renderCal();}

function bdayDaysUntil(month,day){
  var now=new Date();
  var today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var thisYear=now.getFullYear();
  var next=new Date(thisYear,month-1,day);
  if(next<today) next=new Date(thisYear+1,month-1,day);
  return Math.round((next-today)/(1000*60*60*24));
}

function bdayNextDate(month,day){
  // Returns the actual Date object of the next occurrence of this birthday
  var now=new Date();
  var today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var next=new Date(now.getFullYear(),month-1,day);
  if(next<today) next=new Date(now.getFullYear()+1,month-1,day);
  return next;
}

function bdayTurningAge(b){
  if(!b.year)return null;
  // Age = year they next celebrate minus birth year
  var nextDate=bdayNextDate(b.month,b.day);
  return nextDate.getFullYear()-b.year;
}

var MONTHS_FULL=['January','February','March','April','May','June','July','August','September','October','November','December'];
var MONTHS_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function bdaySwitchTab(tab){
  bdayTab=tab;
  var vt=document.getElementById('bday-tab-view');
  var pt=document.getElementById('bday-tab-people');
  var vp=document.getElementById('bday-view-panel');
  var pp=document.getElementById('bday-people-panel');
  var isView=(tab==='view');
  if(vt){vt.style.color=isView?'#ff69b4':'var(--dim)';vt.style.borderColor=isView?'#ff69b4':'var(--dim)';}
  if(pt){pt.style.color=!isView?'#ff69b4':'var(--dim)';pt.style.borderColor=!isView?'#ff69b4':'var(--dim)';}
  if(vp)vp.style.display=isView?'':'none';
  if(pp)pp.style.display=!isView?'':'none';
  if(isView)renderBdayView();
  else renderBdayPeople();
}

// ── VIEW TAB: upcoming list + next banner + stats ──
function renderBdayView(){
  var el=document.getElementById('bday-view-panel');
  if(!el)return;
  if(!birthdays.length){
    el.innerHTML='<div class="card-empty-v">No birthdays yet. Go to PEOPLE to add some.</div>';
    return;
  }
  var sorted=birthdays.slice().sort(function(a,b){
    return bdayDaysUntil(a.month,a.day)-bdayDaysUntil(b.month,b.day);
  });
  var next=sorted[0];
  var nextDays=bdayDaysUntil(next.month,next.day);
  var h='';

  // ── Next birthday hero ──
  h+='<div class="bday-next-banner">'
    +'<span class="bday-next-icon">'+(next.emoji||'🎂')+'</span>'
    +'<div class="bday-next-info">'
    +'<div class="bday-next-name">'+next.name+'</div>'
    +'<div class="bday-next-sub">'
    +(nextDays===0?'🎉 TODAY!':nextDays===1?'Tomorrow!':nextDays+' days away')
    +(bdayTurningAge(next)?' · turns '+bdayTurningAge(next):'')
    +'</div>'+(next.notes?'<div class="dim-9-mt">'+next.notes+'</div>':'')
    +'</div></div>';

  // ── Upcoming list grouped by month ──
  var currentMonth=null;
  sorted.forEach(function(b){
    var days=bdayDaysUntil(b.month,b.day);
    var age=bdayTurningAge(b);
    var daysClass=days===0?'today':days<=14?'soon':'normal';
    var daysLabel=days===0?'TODAY 🎉':days===1?'Tomorrow':days+' days';
    var avatarBg='hsl('+((b.name.charCodeAt(0)*47)%360)+',40%,22%)';
    var initials=b.name.split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase();
    var monthKey=b.month;
    if(monthKey!==currentMonth){
      currentMonth=monthKey;
      h+='<div class="bday-month-hdr">'+MONTHS_FULL[b.month-1].toUpperCase()+'</div>';
    }
    h+='<div class="bday-item">'
      +'<div class="bday-avatar" style="background:'+avatarBg+';color:#fff;font-size:'+(b.emoji?'16px':'11px')+'">'+(b.emoji||initials)+'</div>'
      +'<div class="bday-info">'
      +'<div class="bday-name">'+b.name+'</div>'
      +'<div class="bday-date">'+MONTHS_SHORT[b.month-1]+' '+b.day+(b.year?' · born '+b.year:'')+(b.notes?' · <em style="color:var(--dim)">'+b.notes+'</em>':'')+'</div>'
      +'</div>'
      +'<div class="bday-right">'
      +'<div class="bday-days '+daysClass+'">'+daysLabel+'</div>'
      +(age?'<div class="bday-age">turns '+age+'</div>':'<div class="bday-age">age unknown</div>')
      +'</div>'
      +'</div>';
  });

  // ── Stats strip ──
  var withYear=birthdays.filter(function(b){return b.year;});
  var soonCount=birthdays.filter(function(b){return bdayDaysUntil(b.month,b.day)<=30;}).length;
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,105,180,.1)">'
    +'<span class="dim-10">'+birthdays.length+' people</span>'
    +(soonCount?'<span style="font-size:var(--t-sm);color:#ff69b4">·  '+soonCount+' in next 30 days</span>':'')
    +(withYear.length?'<span class="dim-10">·  '+withYear.length+' with age</span>':'')
    +'</div>';

  el.innerHTML=h;
}

// ── PEOPLE TAB: manage list + add/edit form ──
function renderBdayPeople(){
  var el=document.getElementById('bday-people-list');
  if(!el)return;
  if(!birthdays.length){
    el.innerHTML='<div style="font-size:var(--t-base);color:var(--dim);padding:6px 0 10px">No people added yet.</div>';
    return;
  }
  var alphaSorted=birthdays.slice().sort(function(a,b){return a.name.localeCompare(b.name);});
  var h='';
  alphaSorted.forEach(function(b){
    var pid='bday-'+b.id;
    var avatarBg='hsl('+((b.name.charCodeAt(0)*47)%360)+',40%,22%)';
    var initials=b.name.split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase();
    h+='<div class="bday-people-item">'
      +'<div class="bday-avatar" style="background:'+avatarBg+';color:#fff;font-size:'+(b.emoji?'16px':'11px')+'">'+(b.emoji||initials)+'</div>'
      +'<div class="bday-info">'
      +'<div class="bday-name">'+b.name+'</div>'
      +'<div class="bday-date">'+MONTHS_SHORT[b.month-1]+' '+b.day+(b.year?' '+b.year:'')+'</div>'
      +'</div>'
      +'<div class="bday-actions">'
      +'<button class="bday-btn" onclick="bdayStartEdit('+b.id+')">&#9998;</button>'
      +'<button class="bday-btn del" id="'+pid+'" onclick="deleteBirthday('+b.id+')">&#x2715;</button>'
      +'</div>'
      +'</div>';
  });
  el.innerHTML=h;
}

function bdayStartEdit(id){
  var b=birthdays.find(function(x){return x.id===id;});
  if(!b)return;
  bdayEditId=id;
  document.getElementById('bday-name').value=b.name;
  document.getElementById('bday-month').value=b.month;
  document.getElementById('bday-day').value=b.day;
  document.getElementById('bday-year').value=b.year||'';
  document.getElementById('bday-emoji').value=b.emoji||'';
  document.getElementById('bday-notes').value=b.notes||'';
  var title=document.getElementById('bday-form-title');
  var btn=document.getElementById('bday-form-btn');
  if(title)title.textContent='EDITING: '+b.name.toUpperCase();
  if(btn){btn.textContent='SAVE CHANGES';btn.onclick=function(){saveBdayEdit(id);};}
  document.getElementById('bday-name').focus();
  document.getElementById('bday-add-form').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function bdayCancelEdit(){
  bdayEditId=null;
  document.getElementById('bday-name').value='';
  document.getElementById('bday-month').value='';
  document.getElementById('bday-day').value='';
  document.getElementById('bday-year').value='';
  document.getElementById('bday-emoji').value='';
  document.getElementById('bday-notes').value='';
  var title=document.getElementById('bday-form-title');
  var btn=document.getElementById('bday-form-btn');
  if(title)title.textContent='ADD PERSON';
  if(btn){btn.textContent='+ ADD PERSON';btn.onclick=addBirthday;}
}

function addBirthday(){
  var name=(document.getElementById('bday-name').value||'').trim();
  var month=parseInt(document.getElementById('bday-month').value)||0;
  var day=parseInt(document.getElementById('bday-day').value)||0;
  var year=parseInt(document.getElementById('bday-year').value)||0;
  var emoji=(document.getElementById('bday-emoji').value||'').trim();
  var notes=(document.getElementById('bday-notes').value||'').trim();
  if(!name||month<1||month>12||day<1||day>31)return;
  birthdays.push({id:Date.now(),name:name,month:month,day:day,year:year||null,emoji:emoji||null,notes:notes||null});
  saveBirthdays();
  bdayCancelEdit();
  renderBdayPeople();
  var btn=document.getElementById('bday-form-btn');
  if(btn){var r=btn.getBoundingClientRect();confetti(r.left+r.width/2,r.top,'#ff69b4');}
}

function saveBdayEdit(id){
  var b=birthdays.find(function(x){return x.id===id;});
  if(!b)return;
  var name=(document.getElementById('bday-name').value||'').trim();
  var month=parseInt(document.getElementById('bday-month').value)||0;
  var day=parseInt(document.getElementById('bday-day').value)||0;
  var year=parseInt(document.getElementById('bday-year').value)||0;
  var emoji=(document.getElementById('bday-emoji').value||'').trim();
  var notes=(document.getElementById('bday-notes').value||'').trim();
  if(!name||month<1||month>12||day<1||day>31)return;
  b.name=name;b.month=month;b.day=day;
  b.year=year||null;b.emoji=emoji||null;b.notes=notes||null;
  saveBirthdays();
  bdayCancelEdit();
  renderBdayPeople();
}

function deleteBirthday(id){
  var pid='bday-'+id;
  if(!bdayDeletePending[id]){
    bdayDeletePending[id]=true;
    var el=document.getElementById(pid);
    if(el){el.innerHTML='SURE?';el.style.background='rgba(255,68,68,.1)';}
    setTimeout(function(){
      bdayDeletePending[id]=false;
      var el=document.getElementById(pid);
      if(el){el.innerHTML='&#x2715;';el.style.background='';}
    },3000);
    return;
  }
  bdayDeletePending[id]=false;
  var el=document.getElementById(pid);
  if(el){var r=el.getBoundingClientRect();confetti(r.left+r.width/2,r.top,'#ff69b4');}
  birthdays=birthdays.filter(function(x){return x.id!==id;});
  if(bdayEditId===id)bdayCancelEdit();
  saveBirthdays();
  renderBdayPeople();
}

function exportBirthdays(){
  if(!birthdays.length){clipCopy('(no birthdays)','Birthdays');return;}
  var sorted=birthdays.slice().sort(function(a,b){return bdayDaysUntil(a.month,a.day)-bdayDaysUntil(b.month,b.day);});
  var lines=['# Birthdays',''];
  sorted.forEach(function(b){
    var days=bdayDaysUntil(b.month,b.day);
    var age=bdayTurningAge(b);
    lines.push('- '+(b.emoji||'🎂')+' **'+b.name+'** — '+MONTHS_FULL[b.month-1]+' '+b.day+(b.year?' ('+b.year+')':'')
      +' | '+(days===0?'TODAY! 🎉':days===1?'Tomorrow':days+' days away')
      +(age?' | turns '+age:'')
      +(b.notes?' | '+b.notes:''));
  });
  clipCopy(lines.join('\n'),'Birthdays');
}

// Initial render
bdaySwitchTab('view');

// ── AKIRA SCROLL GLOW ──
(function(){
  var lastScrollY=window.scrollY;
  var lastTime=Date.now();
  var activeStreaks=[];
  var animFrame=null;
  var lastRender=0;
  var lastSpawn=0;
  var glowEnabled=false;

  var canvas=document.createElement('canvas');
  canvas.id='akira-glow-canvas';
  canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9997;opacity:1;display:none';
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight;
  document.body.appendChild(canvas);
  var ctx=canvas.getContext('2d');

  window.addEventListener('resize',function(){
    canvas.width=window.innerWidth;
    canvas.height=window.innerHeight;
  });

  window.setScrollGlow=function(on){
    glowEnabled=on;
    canvas.style.display=on?'':'none';
    if(!on){activeStreaks=[];if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}ctx.clearRect(0,0,canvas.width,canvas.height);}
  };

  function spawnStreak(x,y,dy,speed){
    var hues=[185,195,160,210,175];
    var hue=hues[Math.floor(Math.random()*hues.length)];
    activeStreaks.push({
      x:x, y:y,
      vy:dy*(3+Math.random()*5),
      len:40+Math.random()*120,
      width:0.5+Math.random()*1.5,
      alpha:0.12+Math.random()*0.18,
      decay:0.015+Math.random()*0.02,
      hue:hue
    });
  }

  function renderGlow(ts){
    if(ts-lastRender<16){animFrame=requestAnimationFrame(renderGlow);return;}
    lastRender=ts;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    var alive=[];
    for(var i=0;i<activeStreaks.length;i++){
      var s=activeStreaks[i];
      s.alpha-=s.decay;
      s.y+=s.vy;
      s.len*=0.98;
      if(s.alpha<=0||s.len<4)continue;
      alive.push(s);
      var grd=ctx.createLinearGradient(s.x,s.y,s.x,s.y-s.vy*s.len*0.35);
      var col='hsla('+s.hue+',90%,65%,';
      grd.addColorStop(0,col+'0)');
      grd.addColorStop(0.3,col+(s.alpha*0.6)+')');
      grd.addColorStop(0.7,col+(s.alpha*0.9)+')');
      grd.addColorStop(1,col+s.alpha+')');
      ctx.beginPath();
      ctx.moveTo(s.x,s.y);
      ctx.lineTo(s.x,s.y-s.vy*s.len*0.35);
      ctx.strokeStyle=grd;
      ctx.lineWidth=s.width;
      ctx.lineCap='round';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.x,s.y,s.width*1.2,0,Math.PI*2);
      ctx.fillStyle='hsla('+s.hue+',100%,85%,'+(s.alpha*0.7)+')';
      ctx.fill();
    }
    activeStreaks=alive;
    if(activeStreaks.length>0){
      animFrame=requestAnimationFrame(renderGlow);
    } else {
      animFrame=null;
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
  }

  window.addEventListener('scroll',function(){
    if(!glowEnabled)return;
    var now=Date.now();
    var currentY=window.scrollY;
    var dt=Math.max(1,now-lastTime);
    var speed=Math.abs(currentY-lastScrollY)/dt*16;
    var dy=(currentY>lastScrollY)?1:-1;
    lastScrollY=currentY;
    lastTime=now;
    if(speed<1)return;
    if(now-lastSpawn<25)return;
    lastSpawn=now;
    var count=Math.min(2+Math.floor(speed/8),6);
    var W=canvas.width,H=canvas.height;
    for(var i=0;i<count;i++){
      var xBias=Math.random();
      var x;
      if(xBias<0.25) x=20+Math.random()*(W*0.25);
      else if(xBias>0.75) x=W*0.75+Math.random()*(W*0.25-20);
      else x=W*0.2+Math.random()*W*0.6;
      var y=dy>0?(H*0.1+Math.random()*H*0.4):(H*0.6+Math.random()*H*0.35);
      spawnStreak(x,y,dy,speed);
    }
    if(!animFrame) animFrame=requestAnimationFrame(renderGlow);
  },{passive:true});
})();

// ── PICKLEBALL WEATHER ──
// ZIP 21043 = Ellicott City MD: 39.2657, -76.7983
var pbData=null;
var pbLastFetch=0;

var PB_TEMP_GREAT=["Perfect playing temp","Nice and warm","Great weather for it","Shirt-sleeve weather","Ideal temperature"];
var PB_TEMP_OK=["A bit chilly but doable","Dress in layers","Grab a jacket","Cool but workable","Manageable temps"];
var PB_TEMP_BAD=["Way too cold","Far too cold to play","Bundle up — not worth it","Too cold out there","Too cold for courts"];
var PB_WIND_GREAT=["Calm out there","Barely any wind","Nice still evening","Wind is no issue","Smooth conditions"];
var PB_WIND_OK=["A bit breezy","Wind is a factor but okay","Some gusts, manageable","Slightly windy","Could be worse wind-wise"];
var PB_WIND_BAD=["Too windy","Winds are brutal","Way too gusty","Wind will wreck your game","Not worth it wind-wise"];
var PB_OVERALL_GREAT=["Go play!","Perfect evening for pickleball","Get out there!","Ideal conditions tonight","Go go go!"];
var PB_OVERALL_GOOD=["Should be fine","Decent night for it","Worth heading out","Good enough — go play","Playable tonight"];
var PB_OVERALL_MEH=["Could be better","Might be okay","Borderline conditions","Your call — it is iffy","Playable but not ideal"];
var PB_OVERALL_BAD=["Skip tonight","Not great out there","Sit this one out","Conditions are rough","Better to stay in"];

function pbRandPhrase(arr,seed){
  // Deterministic-ish pick based on date so it's stable per day
  var idx=seed%arr.length;
  return arr[idx<0?0:idx];
}

function loadPickleball(){
  var now=Date.now();
  if(pbData&&(now-pbLastFetch)<10*60*1000)return; // cache 10 min
  document.getElementById('pb-badge').textContent='LOADING';
  // Need hourly: temp, precip, windspeed, snowfall for 7 days
  var _pc=getPickleCoords();
  var url='https://api.open-meteo.com/v1/forecast?latitude='+_pc.lat+'&longitude='+_pc.lng+''
    +'&hourly=temperature_2m,precipitation,windspeed_10m,snowfall,weathercode'
    +'&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch'
    +'&timezone=America%2FNew_York&forecast_days=7';
  fetch(url)
    .then(function(r){return r.json();})
    .then(function(data){
      pbData=data;
      pbLastFetch=Date.now();
      renderPickleball();
    })
    .catch(function(){
      document.getElementById('pb-badge').textContent='ERROR';
      document.getElementById('pb-list').innerHTML='<div style="color:var(--cr);font-size:var(--t-base)">Failed to load weather.</div>';
    });
}

function pbCheckWindow(dateStr,startHour,endHour){
  if(!pbData)return null;
  var hr=pbData.hourly;
  var temps=[],winds=[],precips=[],snows=[];
  for(var i=0;i<hr.time.length;i++){
    if(!hr.time[i].startsWith(dateStr))continue;
    var h=parseInt(hr.time[i].slice(11,13));
    if(h<startHour||h>=endHour)continue;
    temps.push(hr.temperature_2m[i]);
    winds.push(hr.windspeed_10m[i]);
    precips.push(hr.precipitation[i]||0);
    snows.push(hr.snowfall[i]||0);
  }
  if(!temps.length)return null;

  var minTemp=Math.round(Math.min.apply(null,temps));
  var maxTemp=Math.round(Math.max.apply(null,temps));
  var maxWind=Math.round(Math.max.apply(null,winds));
  var totalPrecip=precips.reduce(function(a,b){return a+b;},0);
  var totalSnow=snows.reduce(function(a,b){return a+b;},0);

  // Temp tier
  var tempStatus,tempHard=false;
  if(minTemp<40){tempStatus='too cold';tempHard=true;}
  else if(minTemp<55){tempStatus='suboptimal';}
  else{tempStatus='optimal';}

  // Wind tier
  var windStatus,windHard=false;
  if(maxWind>15){windStatus='too strong';windHard=true;}
  else if(maxWind>=10){windStatus='suboptimal';}
  else{windStatus='optimal';}

  // Other conditions
  var otherIssues=[];
  if(totalPrecip>0.01)otherIssues.push(totalPrecip.toFixed(2)+'" rain — wet courts');
  if(totalSnow>0.001)otherIssues.push('snow');
  // Rain 4hrs before = courts still wet
  var prevPrecip=0;
  for(var i=0;i<hr.time.length;i++){
    if(!hr.time[i].startsWith(dateStr))continue;
    var hh=parseInt(hr.time[i].slice(11,13));
    if(hh>=startHour-4&&hh<startHour)prevPrecip+=hr.precipitation[i]||0;
  }
  if(prevPrecip>0.05&&totalPrecip<0.01)otherIssues.push('courts likely wet from earlier rain');

  var hardNo=tempHard||windHard||otherIssues.length>0;
  var borderline=!hardNo&&(tempStatus==='suboptimal'||windStatus==='suboptimal');
  var ok=!hardNo&&!borderline;

  return{
    ok:ok,borderline:borderline,hardNo:hardNo,
    minTemp:minTemp,maxTemp:maxTemp,maxWind:maxWind,
    tempStatus:tempStatus,tempHard:tempHard,
    windStatus:windStatus,windHard:windHard,
    totalPrecip:totalPrecip,otherIssues:otherIssues
  };
}

function renderPickleball(){
  var el=document.getElementById('pb-list');
  var badge=document.getElementById('pb-badge');
  if(!el||!pbData)return;
  var today=new Date();
  var goodCount=0,mehCount=0;
  var h='';
  for(var d=0;d<7;d++){
    var date=new Date(today);date.setDate(today.getDate()+d);
    var dateStr=localDateStr(date);
    var dow=date.getDay();
    var isWeekend=(dow===0||dow===6);
    var dayName=DAYS[dow].slice(0,3).toUpperCase();
    var dayNum=date.getDate();
    var isToday=(d===0);
    var startH=isWeekend?8:17;
    var r=pbCheckWindow(dateStr,startH,22);
    if(!r)continue;
    var seed=date.getDate()+dow;

    var tempScore=r.tempHard?2:r.tempStatus==='suboptimal'?1:0;
    var windScore=r.windHard?2:r.windStatus==='suboptimal'?1:0;
    var otherScore=r.otherIssues.length?2:0;
    var total=tempScore+windScore+otherScore;
    var verdict,icon,verdictLabel,verdictColor;
    if(total===0){
      verdict='yes';icon='✓';goodCount++;
      verdictLabel='Great';verdictColor='var(--cg)';
    } else if(total===1){
      verdict='mixed';icon='✓';goodCount++;
      verdictLabel='Good';verdictColor='#88dd22';
    } else if(total>=4||(tempScore===2||windScore===2||otherScore===2)){
      verdict='no';icon='✗';
      verdictLabel='No';verdictColor='var(--cr)';
    } else {
      verdict='meh';icon='~';mehCount++;
      verdictLabel='Okay';verdictColor='var(--ca)';
    }

    // Friendly temp line
    var tempColor=r.tempHard?'var(--cr)':r.tempStatus==='suboptimal'?'var(--ca)':'var(--cg)';
    var tempPhrase=r.tempHard?pbRandPhrase(PB_TEMP_BAD,seed)
      :r.tempStatus==='suboptimal'?pbRandPhrase(PB_TEMP_OK,seed)
      :pbRandPhrase(PB_TEMP_GREAT,seed);
    var tempLine='<div style="font-size:var(--t-xs);color:'+tempColor+';margin-top:2px">'+r.minTemp+'°–'+r.maxTemp+'°F · '+tempPhrase+'</div>';

    // Friendly wind line
    var windColor=r.windHard?'var(--cr)':r.windStatus==='suboptimal'?'var(--ca)':'var(--cg)';
    var windPhrase=r.windHard?pbRandPhrase(PB_WIND_BAD,seed+1)
      :r.windStatus==='suboptimal'?pbRandPhrase(PB_WIND_OK,seed+1)
      :pbRandPhrase(PB_WIND_GREAT,seed+1);
    var windLine='<div style="font-size:var(--t-xs);color:'+windColor+';margin-top:2px">'+r.maxWind+'mph · '+windPhrase+'</div>';

    // Other issues (rain/wet)
    var otherLine=r.otherIssues.length
      ?'<div style="font-size:var(--t-xs);color:var(--cr);margin-top:2px">'+r.otherIssues.join(' · ')+'</div>'
      :'';

    h+='<div class="pb-day" style="flex-wrap:wrap">'
      +'<div style="width:44px;flex-shrink:0">'
      +'<div class="pb-day-name'+(isToday?' today':'')+'">'+dayName+'</div>'
      +'<div style="font-size:var(--t-base);color:var(--dim);margin-top:1px">'+dayNum+'</div>'
      +'</div>'
      +'<div class="pb-verdict '+verdict+'" style="flex-direction:column;gap:1px;height:auto;padding:6px 0;width:40px;border-color:'+verdictColor+';background:'+verdictColor+'18">'
      +'<span style="font-size:var(--t-body);color:'+verdictColor+'">'+icon+'</span>'
      +'<span style="font-size:var(--t-xxs);color:'+verdictColor+';letter-spacing:.5px;font-weight:bold">'+verdictLabel+'</span>'
      +'</div>'
      +'<div class="flex-1">'
      +tempLine
      +windLine
      +otherLine
      +'</div>'
      +'<span style="font-size:var(--t-xs);color:var(--dim);flex-shrink:0;align-self:flex-start;margin-top:2px">'+(isWeekend?'8a–10p':'5–10p')+'</span>'
      +'</div>';
  }
  if(badge){
    badge.textContent=goodCount===0?'NO GOOD DAYS':goodCount+' GOOD DAY'+(goodCount!==1?'S':'');
    badge.style.color=goodCount===0?(mehCount?'var(--ca)':'var(--cr)'):goodCount<=2?'var(--ca)':'var(--cg)';
    badge.style.borderColor=badge.style.color;
  }
  el.innerHTML=h||'<div style="color:var(--dim);font-size:var(--t-base)">No data.</div>';
}

loadPickleball();
setInterval(loadPickleball,10*60*1000);

function copyPickleball(){
  if(!pbData){clipCopy('No pickleball data yet.','Pickleball');return;}
  var today=new Date();
  var lines=['🏓 Pickleball week (21043)',''];
  for(var d=0;d<7;d++){
    var date=new Date(today);date.setDate(today.getDate()+d);
    var dateStr=localDateStr(date);
    var dow=date.getDay();
    var isWeekend=(dow===0||dow===6);
    var dayLabel=DAYS[dow]+(d===0?' (today)':d===1?' (tmrw)':'');
    var window=isWeekend?'all day':'5–10pm';
    var startH=isWeekend?8:17;
    var r=pbCheckWindow(dateStr,startH,22);
    if(!r)continue;
    var icon=r.ok?'✅':r.borderline?'🟡':'❌';
    var line=icon+' '+dayLabel+' '+window;
    var details=[];
    if(r.tempStatus!=='optimal')details.push(r.minTemp+'°F – '+r.tempStatus);
    if(r.windStatus!=='optimal')details.push(r.maxWind+'mph wind – '+r.windStatus);
    r.otherIssues.forEach(function(s){details.push(s);});
    if(details.length)line+='\n   '+details.join('\n   ');
    lines.push(line);
  }
  clipCopy(lines.join('\n'),'Pickleball');
}

function exportPickleballPNG(){
  if(!pbData){alert('No data yet.');return;}
  var today=new Date();
  var dateLabel=today.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  var timeLabel=today.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});

  // Build rows identical to renderPickleball
  var rows=[];
  for(var d=0;d<7;d++){
    var date=new Date(today);date.setDate(today.getDate()+d);
    var dateStr=localDateStr(date);
    var dow=date.getDay();
    var isWeekend=(dow===0||dow===6);
    var startH=isWeekend?8:17;
    var r=pbCheckWindow(dateStr,startH,22);
    if(!r)continue;
    var seed=date.getDate()+dow;
    var tempScore=r.tempHard?2:r.tempStatus==='suboptimal'?1:0;
    var windScore=r.windHard?2:r.windStatus==='suboptimal'?1:0;
    var otherScore=r.otherIssues.length?2:0;
    var total=tempScore+windScore+otherScore;
    var verdictLabel,verdictColor,icon;
    if(total===0){verdictLabel='Great';verdictColor='#00ff88';icon='✓';}
    else if(total===1){verdictLabel='Good';verdictColor='#88dd22';icon='✓';}
    else if(total>=4||(tempScore===2||windScore===2||otherScore===2)){verdictLabel='No';verdictColor='#ff4444';icon='✗';}
    else{verdictLabel='Okay';verdictColor='#ffcc00';icon='~';}
    var tempPhrase=r.tempHard?pbRandPhrase(PB_TEMP_BAD,seed):r.tempStatus==='suboptimal'?pbRandPhrase(PB_TEMP_OK,seed):pbRandPhrase(PB_TEMP_GREAT,seed);
    var windPhrase=r.windHard?pbRandPhrase(PB_WIND_BAD,seed+1):r.windStatus==='suboptimal'?pbRandPhrase(PB_WIND_OK,seed+1):pbRandPhrase(PB_WIND_GREAT,seed+1);
    var tempColor=r.tempHard?'#ff4444':r.tempStatus==='suboptimal'?'#ffcc00':'#00ff88';
    var windColor=r.windHard?'#ff4444':r.windStatus==='suboptimal'?'#ffcc00':'#00ff88';
    var textLines=[];
    textLines.push({text:r.minTemp+'°–'+r.maxTemp+'°F · '+tempPhrase,color:tempColor});
    textLines.push({text:r.maxWind+'mph · '+windPhrase,color:windColor});
    if(r.otherIssues.length)r.otherIssues.forEach(function(s){textLines.push({text:s,color:'#ff4444'});});
    rows.push({date:date,dow:dow,isWeekend:isWeekend,
      verdictLabel:verdictLabel,verdictColor:verdictColor,icon:icon,textLines:textLines});
  }

  // Canvas layout constants — mirror card exactly
  var scale=2,pad=14,fs=10;
  var dayColW=44;    // matches width:44px in card
  var verdictColW=46; // matches width:40px + gap
  var winLblW=36;    // right-side window label
  var textStart=pad+dayColW+verdictColW+6;

  // Measure max text line width
  var measCtx=document.createElement('canvas').getContext('2d');
  measCtx.font=fs+'px monospace';
  var maxTW=0;
  rows.forEach(function(row){
    row.textLines.forEach(function(ln){maxTW=Math.max(maxTW,measCtx.measureText(ln.text).width);});
  });
  measCtx.font='bold 14px monospace';
  var hdrW=measCtx.measureText('Pickleball Weather').width;
  measCtx.font='9px monospace';
  var genW=measCtx.measureText('Generated '+timeLabel).width;
  var cW=Math.max(textStart+maxTW+winLblW+pad, pad+hdrW+genW+pad*2, 320);

  var rowH=64;  // fixed row height matching card feel
  var headerH=48;
  var canvas=document.createElement('canvas');
  canvas.width=cW*scale;
  canvas.height=(headerH+rows.length*rowH)*scale;
  var ctx=canvas.getContext('2d');
  ctx.scale(scale,scale);

  // Dark background
  ctx.fillStyle='#080c0a';
  ctx.fillRect(0,0,cW,canvas.height/scale);

  // Header
  ctx.fillStyle='#00ff88';ctx.font='bold 14px monospace';ctx.textAlign='left';
  ctx.fillText('Pickleball Weather',pad,22);
  ctx.fillStyle='rgba(255,255,255,0.28)';ctx.font='9px monospace';ctx.textAlign='right';
  ctx.fillText('Generated '+timeLabel,cW-pad,22);
  ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='9px monospace';ctx.textAlign='left';
  ctx.fillText(dateLabel+' · 21043',pad,36);
  ctx.strokeStyle='rgba(0,255,136,0.18)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pad,headerH);ctx.lineTo(cW-pad,headerH);ctx.stroke();

  var y=headerH;
  rows.forEach(function(row){
    var vc=row.verdictColor;
    var mid=y+rowH/2;

    // ── Day column: name top, number below (mirrors card) ──
    ctx.textAlign='left';
    ctx.fillStyle='rgba(255,255,255,0.65)';ctx.font='bold 11px monospace';
    ctx.fillText(DAYS[row.dow].slice(0,3).toUpperCase(),pad,mid-5);
    ctx.fillStyle='rgba(255,255,255,0.38)';ctx.font='11px monospace';
    ctx.fillText(String(row.date.getDate()),pad,mid+9);

    // ── Verdict box: column flex, icon on top, label below (mirrors .pb-verdict) ──
    var vx=pad+dayColW+2;
    var vBoxW=38,vBoxH=rowH-16;
    var vy=y+(rowH-vBoxH)/2;
    // Background fill
    ctx.fillStyle=vc+'1a';
    ctx.fillRect(vx,vy,vBoxW,vBoxH);
    // Border
    ctx.strokeStyle=vc;ctx.lineWidth=1.5;
    ctx.strokeRect(vx,vy,vBoxW,vBoxH);
    // Icon (top half)
    ctx.fillStyle=vc;ctx.font='bold 14px monospace';ctx.textAlign='center';
    ctx.fillText(row.icon,vx+vBoxW/2,vy+vBoxH*0.45);
    // Label (bottom half) — small bold text like the card
    ctx.font='bold 8px monospace';
    ctx.fillText(row.verdictLabel,vx+vBoxW/2,vy+vBoxH*0.82);
    ctx.textAlign='left';

    // ── Text lines (temp, wind, other) centered vertically ──
    var lineH=12;
    var totalH=row.textLines.length*lineH;
    var startY=mid-totalH/2+lineH-2;
    ctx.font=fs+'px monospace';
    row.textLines.forEach(function(ln,li){
      ctx.fillStyle=ln.color;
      ctx.fillText(ln.text,textStart,startY+li*lineH);
    });

    // ── Window label right-aligned ──
    ctx.fillStyle='rgba(255,255,255,0.28)';ctx.font='9px monospace';ctx.textAlign='right';
    ctx.fillText(row.isWeekend?'8a–10p':'5–10p',cW-pad,mid+4);
    ctx.textAlign='left';

    // Row divider
    ctx.strokeStyle='rgba(0,255,136,0.07)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad,y+rowH);ctx.lineTo(cW-pad,y+rowH);ctx.stroke();
    y+=rowH;
  });

  var link=document.createElement('a');
  link.download='pickleball-'+localDateStr()+'.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
}


function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

function applyHiddenTiles(){
  // Failsafe: settings can never be hidden — purge it from the list every time
  hiddenTiles=hiddenTiles.filter(function(id){return id!=='settings'&&id!=='quick-nav';});
  saveHiddenTiles();
  document.querySelectorAll('#grid [data-id]').forEach(function(el){
    var id=el.dataset.id;
    if(id==='settings'||id==='quick-nav'){el.classList.remove('tile-hidden');return;}
    if(hiddenTiles.indexOf(id)>=0) el.classList.add('tile-hidden');
    else el.classList.remove('tile-hidden');
  });
}

function toggleHideTile(id){
  if(id==='settings')return; // settings card can never be hidden
  var idx=hiddenTiles.indexOf(id);
  if(idx>=0) hiddenTiles.splice(idx,1);
  else hiddenTiles.push(id);
  saveHiddenTiles();
  applyHiddenTiles();
  renderHideTileSettings();
}

function renderHideTileSettings(){
  var el=document.getElementById('hide-tiles-body');if(!el)return;
  var names={
    clock:'Clock',prayer:'Prayer Times',weather:'Weather',stocks:'Markets',
    todo:'To-Do',meals:'Meals',calendar:'Calendar',notes:'Notes',
    schedule:'Work Arrival',books:'Books',birthdays:'Birthdays','season-traditions':'Season Traditions',
    pickleball:'Pickleball','quran-tracker':'Quran Pages','juz-amma':'Juz Amma',
    'islamic-topics':'Islamic Topics','goals':'Goals','pomodoro':'Pomodoro',
    'meal-prep':'Meal Prep','ebook-library':'E-Books','prayer-tracker':'Salah Tracker',
    'weekly-review':'Weekly Review','decision-log':'Decision Log','energy-map':'Energy Map','life-streaks':'Life Streaks','weekly-moments':'Weekly Routines','weekend-warrior':'Weekend Warrior','writers-den':"Writer's Den",raft:'Raft','day-blocks':'Day Blocks','workout-log':'Workout Log','quick-nav':'Quick Nav','quran-cards':'Quran Cards','for-akhira':'For Akhira','gratitude-log':'Gratitude Log','dua-card':'Dua','rent-payments':'Rent Payments',bookmarks:'Bookmarks','the-wall':'The Wall','countdown':'In X Days','reframe':'Reframe','legacy-letter':'Legacy Letter','shadow-log':'Shadow Log','fear-inventory':'Fear Inventory','people-become':'People I Want to Become','writing-log':'Creative Writing','s-tracker':'S Tracker'
  };
  var ids=Object.keys(names);
  // 3-column grid
  var h='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">';
  ids.forEach(function(id){
    var hidden=hiddenTiles.indexOf(id)>=0;
    h+='<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border:1px solid var(--c-ghost);background:rgba(255,255,255,.02)">';
    h+='<button class="sset-toggle'+(hidden?'':' on')+'" id="toghide-'+id+'"';
    h+=' onclick="event.stopPropagation();toggleHideTile(\''+id+'\')"><div class="sset-knob"></div></button>';
    h+='<div style="font-size:var(--t-xs);color:var(--dim);text-align:center;letter-spacing:.3px;line-height:1.2">'+names[id]+'</div>';
    h+='</div>';
  });
  h+='</div>';
  el.innerHTML=h;
}


function applyTheme(t){
  currentTheme=t;
  localStorage.setItem('dash_theme',t);
  document.body.classList.remove('theme-severance','theme-oceans','theme-vangogh','theme-cyber2','theme-paynes','theme-bw');
  if(t!=='default') document.body.classList.add('theme-'+t);
  // Update theme buttons
  ['default','severance','oceans','vangogh','cyber2','paynes','bw'].forEach(function(th){
    var btn=document.getElementById('theme-btn-'+th);
    if(btn) btn.style.opacity=currentTheme===th?'1':'0.45';
    if(btn) btn.style.borderWidth=currentTheme===th?'2px':'1px';
  });
}


// ── BACKGROUND VISUALS: 10 PRINT pattern on tiles ──
(function(){
  var CHARS=['╱','╲']; // ╱ ╲
  var enabled=false;
  var styleTag=null;

  function getCardColor(tile){
    var style=window.getComputedStyle(tile);
    var bc=style.borderTopColor||style.borderColor;
    var m=bc&&bc.match(/\d+/g);
    if(m&&m.length>=3){
      return [parseInt(m[0]),parseInt(m[1]),parseInt(m[2])];
    }
    return [0,220,120];
  }

  function make10PrintDataURL(w,h,r,g,b){
    var cellSize=36;
    var canvas=document.createElement('canvas');
    canvas.width=w; canvas.height=h;
    var ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,w,h);
    ctx.font='bold '+cellSize+'px monospace';
    ctx.fillStyle='rgba('+r+','+g+','+b+',0.09)';
    ctx.textBaseline='top';
    var cols=Math.ceil(w/cellSize)+1;
    var rows=Math.ceil(h/cellSize)+1;
    for(var row=0;row<rows;row++){
      for(var col=0;col<cols;col++){
        ctx.fillText(CHARS[Math.random()<0.5?0:1],col*cellSize,row*cellSize);
      }
    }
    // Radial fade: dark center, visible at edges
    var cx=w/2,cy=h/2;
    var grd=ctx.createRadialGradient(cx,cy,Math.min(w,h)*0.1,cx,cy,Math.max(w,h)*0.7);
    grd.addColorStop(0,'rgba(0,0,0,0.78)');
    grd.addColorStop(0.55,'rgba(0,0,0,0.45)');
    grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd;
    ctx.fillRect(0,0,w,h);
    return canvas.toDataURL('image/png');
  }

  function applyToTiles(){
    if(styleTag){styleTag.remove();styleTag=null;}
    if(!enabled)return;
    // Remove old inline bg from tiles
    document.querySelectorAll('#grid [data-id]').forEach(function(tile){
      tile.style.removeProperty('--bg-visual');
      tile.style.backgroundImage='';
    });
    // Build CSS rules per tile using inline style background-image
    // Use a fixed 300x400 pattern (tiles are similar size)
    // For each tile, generate its own colored pattern
    var rules=[];
    document.querySelectorAll('#grid [data-id]').forEach(function(tile){
      var id=tile.dataset.id;
      if(!id)return;
      var rgb=getCardColor(tile);
      var r=tile.getBoundingClientRect();
      var w=Math.max(200,Math.round(r.width||320));
      var h=Math.max(200,Math.round(r.height||400));
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var dataUrl=make10PrintDataURL(w*dpr,h*dpr,rgb[0],rgb[1],rgb[2]);
      // Apply as background-image layered with existing background
      var existing=tile.style.background||window.getComputedStyle(tile).background||'';
      tile.dataset.bgOriginal=tile.style.backgroundImage||'';
      tile.style.backgroundImage='url("'+dataUrl+'")';
      tile.style.backgroundSize='100% 100%';
      tile.style.backgroundRepeat='no-repeat';
    });
  }

  function clearFromTiles(){
    document.querySelectorAll('#grid [data-id]').forEach(function(tile){
      tile.style.backgroundImage=tile.dataset.bgOriginal||'';
      tile.style.backgroundSize='';
      tile.style.backgroundRepeat='';
    });
  }

  window.applyBgVisuals=function(on){
    enabled=on;
    if(on){
      setTimeout(applyToTiles,120);
    } else {
      clearFromTiles();
    }
  };

  var resizeTimer;
  window.addEventListener('resize',function(){
    if(!enabled)return;
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(applyToTiles,300);
  });
})();




// ── LETTER NAVIGATION ──
(function(){
  var pad=null,grid=null,trigger=null;
  var enabled=false;

  var CARDS=[
    {l:'C',id:'clock',name:'Clock'},
    {l:'P',id:'prayer',name:'Prayer'},
    {l:'W',id:'weather',name:'Weather'},
    {l:'M',id:'meals',name:'Meals'},
    {l:'T',id:'todo',name:'To-Do'},
    {l:'B',id:'books',name:'Books'},
    {l:'N',id:'notes',name:'Notes'},
    {l:'S',id:'schedule',name:'Schedule'},
    {l:'G',id:'goals',name:'Goals'},
    {l:'Q',id:'quran-tracker',name:'Quran'},
    {l:'J',id:'juz-amma',name:'Juz'},
    {l:'K',id:'pickleball',name:'Pickleball'},
    {l:'A',id:'prayer-tracker',name:'Salah'},
    {l:'E',id:'ebook-library',name:'E-Books'},
    {l:'I',id:'birthdays',name:'Birthdays'},
    {l:'Y',id:'season-traditions',name:'Seasons'},
    {l:'R',id:'pomodoro',name:'Pomodoro'},
    {l:'O',id:'stocks',name:'Markets'},
    {l:'D',id:'bookmarks',name:'Links'},
    {l:'H',id:'islamic-topics',name:'Islamic'},
    {l:'Z',id:'settings',name:'Settings'},
  ];

  function init(){
    pad=document.getElementById('letter-nav-pad');
    trigger=document.getElementById('lnav-trigger');
    if(!pad)return;

    if(trigger){
      trigger.addEventListener('click',function(){
        if(pad.style.display!=='none'){closePad();}else{openPad();}
      });
    }
  }

  function openPad(){
    if(!pad)return;
    var topbar=document.getElementById('topbar');
    var tbH=topbar?topbar.getBoundingClientRect().height:56;
    pad.style.top=tbH+'px';
    pad.style.left='0';pad.style.right='0';
    pad.style.padding='10px 12px';
    pad.style.background='rgba(0,0,0,.9)';
    pad.style.backdropFilter='blur(6px)';
    pad.style.borderBottom='1px solid var(--c-ok-dim)';
    pad.style.display='grid';
    pad.style.gridTemplateColumns='repeat(3,1fr)';
    pad.style.gap='6px';
    pad.style.pointerEvents='auto';
    pad.style.zIndex='9400';

    var h='';
    CARDS.forEach(function(card){
      var tile=document.querySelector('[data-id="'+card.id+'"]');
      var hidden=!tile||tile.classList.contains('tile-hidden')||window.getComputedStyle(tile).display==='none';
      if(hidden)return;
      h+='<button onclick="lnavGo(\'' +card.id+ '\')" style="'
        +'background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.25);'
        +'color:var(--text);font-family:monospace;'
        +'padding:6px 10px;cursor:pointer;transition:all .12s;'
        +'display:flex;flex-direction:column;align-items:center;gap:1px;min-width:52px'
        +'">'
        +'<span style="font-size:var(--t-title);color:var(--cg);font-weight:bold">'+card.l+'</span>'
        +'<span style="font-size:var(--t-xxs);color:var(--dim);letter-spacing:.5px">'+card.name+'</span>'
        +'</button>';
    });
    h+='<button onclick="closeLNav()" style="background:transparent;border:1px solid var(--c-faint);color:var(--dim);font-family:monospace;padding:6px 12px;cursor:pointer;font-size:var(--t-base);align-self:center">&#10005;</button>';
    pad.innerHTML=h;
  }

  function closePad(){
    if(!pad)return;
    pad.style.display='none';
    pad.style.pointerEvents='none';
  }

  window.lnavGo=function(tileId){
    closePad();
    var tile=document.querySelector('[data-id="'+tileId+'"]');
    if(!tile)return;
    tile.scrollIntoView({behavior:'smooth',block:'center'});
    var orig=tile.style.outline;
    tile.style.outline='2px solid var(--cg)';
    setTimeout(function(){tile.style.outline=orig;},1000);
  };

  window.closeLNav=closePad;

  window.applyLetterNav=function(on){
    enabled=on;
    // Always re-init to ensure elements are bound
    pad=document.getElementById('letter-nav-pad');
    trigger=document.getElementById('lnav-trigger');
    if(pad&&trigger&&!trigger._lnavBound){
      trigger._lnavBound=true;
      trigger.addEventListener('click',function(e){
        e.stopPropagation();
        if(pad.style.display!=='none'&&pad.style.display!==''){closePad();}else{openPad();}
      });
    }
    if(trigger)trigger.style.display=on?'flex':'none';
    if(!on&&pad)closePad();
  };

  // Also init on load so trigger is ready
  setTimeout(function(){
    pad=document.getElementById('letter-nav-pad');
    trigger=document.getElementById('lnav-trigger');
    if(pad&&trigger&&!trigger._lnavBound){
      trigger._lnavBound=true;
      trigger.addEventListener('click',function(e){
        e.stopPropagation();
        if(pad.style.display!=='none'&&pad.style.display!==''){closePad();}else{openPad();}
      });
    }
    // Apply saved setting
    if(window.getSetting&&window.getSetting('letterNav')){
      if(trigger)trigger.style.display='flex';
    }
  },500);
})();


// ── DRAG ZONE: 3-second hover reveals hide/top/bottom zones ──
(function(){
  var hoverTimer=null;
  var zonesVisible=false;
  var draggingTile=null;
  var confettiDone=false;

  function showZones(mode){
    document.getElementById('dz-top').classList.toggle('visible', true);
    document.getElementById('dz-up5').classList.toggle('visible', true);
    document.getElementById('dz-hide').classList.toggle('visible', true);
    document.getElementById('dz-down5').classList.toggle('visible', true);
    document.getElementById('dz-bottom').classList.toggle('visible', true);
    zonesVisible=true;window._zonesVisible=true;
    document.body.classList.add('zones-active');
    document.documentElement.style.touchAction='none';
  }
  function hideZones(){
    ['dz-top','dz-up5','dz-hide','dz-down5','dz-bottom'].forEach(function(id){
      var el=document.getElementById(id);if(el)el.classList.remove('visible');
    });
    zonesVisible=false;window._zonesVisible=false;
    window._holdActive=false;
    document.removeEventListener('touchmove',window._preventScrollFn);
    // Nothing to restore — no body lock was applied
    document.body.classList.remove('zones-active');
    document.documentElement.style.touchAction='';
  }

  function getZoneAtPoint(x,y){
    var wh=window.innerHeight;
    var quarter=wh*0.25;
    if(y<=quarter) return 'top';
    if(y>=wh-quarter) return 'bottom';
    if(y>=wh*0.375&&y<=wh*0.625) return 'hide';
    return null;
  }

  function applyZoneAction(zone,tileId){
    var g=document.getElementById('grid');
    // Flatten grid first (remove section headers/pinned wrappers temporarily)
    var allTiles=Array.from(document.querySelectorAll('[data-id]')).filter(function(t){return t.closest('#sort-overlay')===null;});
    allTiles.forEach(function(t){if(t.parentElement!==g)g.appendChild(t);});
    Array.from(g.children).forEach(function(c){if(!c.dataset||!c.dataset.id)c.remove();});
    var tiles=Array.from(g.querySelectorAll('[data-id]'));
    var tile=g.querySelector('[data-id="'+tileId+'"]');
    if(!tile)return;

    if(zone==='hide'){
      if(hiddenTiles.indexOf(tileId)<0)hiddenTiles.push(tileId);
      saveHiddenTiles();
      // Capture real pixel dimensions before animation
      var _cs=window.getComputedStyle(tile);
      var _tileH=tile.offsetHeight;
      var _tileMb=parseFloat(_cs.marginBottom)||16;
      var _tilePt=parseFloat(_cs.paddingTop)||22;
      var _tilePb=parseFloat(_cs.paddingBottom)||34;

      // Lock height/margin/padding to current values so transition has a start point
      tile.style.height=_tileH+'px';
      tile.style.marginBottom=_tileMb+'px';
      tile.style.paddingTop=_tilePt+'px';
      tile.style.paddingBottom=_tilePb+'px';
      tile.style.overflow='hidden';
      tile.style.pointerEvents='none';

      // Single rAF then start ALL transitions simultaneously
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          // Slide right + fade
          tile.style.transition='transform 1s cubic-bezier(.4,0,.8,1),opacity 0.8s ease,height 1s cubic-bezier(.4,0,.2,1),margin-bottom 1s cubic-bezier(.4,0,.2,1),padding-top 1s,padding-bottom 1s,border-width 0.9s';
          tile.style.transform='translateX(110%)';
          tile.style.opacity='0';
          // Collapse height simultaneously — next card rises as card slides
          tile.style.height='0px';
          tile.style.marginBottom='0px';
          tile.style.paddingTop='0px';
          tile.style.paddingBottom='0px';
          tile.style.borderWidth='0px';

          // Clean up and apply hidden
          setTimeout(function(){
            tile.style.transition='';
            tile.style.transform='';
            tile.style.opacity='';
            tile.style.height='';
            tile.style.marginBottom='';
            tile.style.paddingTop='';
            tile.style.paddingBottom='';
            tile.style.borderWidth='';
            tile.style.overflow='';
            tile.style.pointerEvents='';
            applyHiddenTiles();
          },1100);
        });
      });
      confetti(window.innerWidth/2,window.innerHeight-80,'#ff4444');
      setTimeout(function(){confetti(window.innerWidth/2,window.innerHeight-80,'#ff4444');},150);
    } else if(zone==='top'){
      g.insertBefore(tile,g.firstElementChild);
      showToast('\u2191 Moved to top');
      if(getSetting('magnetMode'))magnetPlace(tileId);
      tileOrder=Array.from(g.querySelectorAll('[data-id]')).map(function(e){return e.dataset.id;});
      lsSet('dash_tile_order',tileOrder);
      confetti(window.innerWidth/2,80,'#00ff88');
    } else if(zone==='up5'){
      // Move 5 positions up
      var tiles5=Array.from(g.querySelectorAll('[data-id]'));
      var pos5=tiles5.indexOf(tile);
      var newPos5=Math.max(0,pos5-5);
      var ref5=tiles5[newPos5];
      if(ref5&&ref5!==tile)g.insertBefore(tile,ref5);
      showToast('\u21e1 Moved 5 up');
      tileOrder=Array.from(g.querySelectorAll('[data-id]')).map(function(e){return e.dataset.id;});
      lsSet('dash_tile_order',tileOrder);
      confetti(window.innerWidth/2,window.innerHeight*0.18,'#00ff88');
    } else if(zone==='down5'){
      // Move 5 positions down
      var tiles5d=Array.from(g.querySelectorAll('[data-id]'));
      var pos5d=tiles5d.indexOf(tile);
      var newPos5d=Math.min(tiles5d.length-1,pos5d+5);
      var ref5d=tiles5d[newPos5d];
      if(ref5d&&ref5d!==tile){g.insertBefore(tile,ref5d);g.insertBefore(ref5d,tile);}
      showToast('\u21e3 Moved 5 down');
      tileOrder=Array.from(g.querySelectorAll('[data-id]')).map(function(e){return e.dataset.id;});
      lsSet('dash_tile_order',tileOrder);
      confetti(window.innerWidth/2,window.innerHeight*0.82,'#00e5ff');
    } else if(zone==='bottom'){
      var sTile=g.querySelector('[data-id="settings"]');
      if(sTile&&sTile!==tile)g.insertBefore(tile,sTile);
      else g.appendChild(tile);
      if(getSetting('magnetMode'))magnetPlace(tileId);
      showToast('\u2193 Moved to bottom');
      tileOrder=Array.from(g.querySelectorAll('[data-id]')).map(function(e){return e.dataset.id;});
      lsSet('dash_tile_order',tileOrder);
      confetti(window.innerWidth/2,window.innerHeight-80,'#00e5ff');
    }
    hideZones();
    draggingTile=null;
  }

  // Hook into existing drag system — listen on the drag-handle elements
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){
    document.getElementById('grid').addEventListener('pointerdown',function(e){
      var handle=e.target.closest('.drag-handle');
      if(!handle)return;
      var tile=handle.closest('[data-id]');
      if(!tile)return;
      draggingTile=tile.dataset.id;
      confettiDone=false;
      // Prevent scroll while holding so zones are easy to hit
      function _preventScroll(ev){if(window._zonesVisible||window._holdActive)ev.preventDefault();}
      window._holdActive=true;
      window._preventScrollFn=_preventScroll;
      document.addEventListener('touchmove',_preventScroll,{passive:false});
      // No body position:fixed — causes scroll jump on Android
      // touchmove preventDefault is sufficient to block scrolling
      // Start 3-second timer
      hoverTimer=setTimeout(function(){
        if(draggingTile){
          // Cancel the rearrange drag completely before showing zones
          // so touchend can't trigger a tile swap
          if(dragTile){dragTile.classList.remove('dragging');dragTile=null;}
          if(ghost){ghost.remove();ghost=null;}
          window._zonesVisible=false; // reset so showZones sets it fresh
          showZones('all');
        }
      },3000);
    });

    function getEventY(e){
      // Works for both touch and pointer events
      if(e.touches&&e.touches.length)return e.touches[0].clientY;
      if(e.changedTouches&&e.changedTouches.length)return e.changedTouches[0].clientY;
      return e.clientY;
    }

    function resolveZone(y){
      var wh=window.innerHeight;
      // 5 zones, each ~16.6% of screen height
      // top 0-10%: top, 10-26%: up5, 37-63%: hide, 74-90%: down5, 90-100%: bottom
      if(y<=wh*0.10)return 'top';
      if(y<=wh*0.26)return 'up5';
      if(y>=wh*0.90)return 'bottom';
      if(y>=wh*0.74)return 'down5';
      if(y>=wh*0.37&&y<=wh*0.63)return 'hide';
      return null;
    }

    function highlightZones(y){
      var zone=resolveZone(y);
      var dzT=document.getElementById('dz-top');
      var dzU=document.getElementById('dz-up5');
      var dzH=document.getElementById('dz-hide');
      var dzD=document.getElementById('dz-down5');
      var dzB=document.getElementById('dz-bottom');
      if(dzT)dzT.style.background=zone==='top'?'rgba(0,255,136,.35)':'rgba(0,255,136,.12)';
      if(dzU)dzU.style.background=zone==='up5'?'rgba(0,255,136,.25)':'rgba(0,255,136,.07)';
      if(dzH)dzH.style.background=zone==='hide'?'rgba(255,68,68,.35)':'rgba(255,68,68,.15)';
      if(dzD)dzD.style.background=zone==='down5'?'rgba(0,229,255,.25)':'rgba(0,229,255,.07)';
      if(dzB)dzB.style.background=zone==='bottom'?'rgba(0,229,255,.35)':'rgba(0,229,255,.12)';
    }

    function handleDragEnd(y){
      clearTimeout(hoverTimer);
      window._holdActive=false;
      if(zonesVisible&&draggingTile){
        var zone=resolveZone(y);
        if(zone)applyZoneAction(zone,draggingTile);
        else hideZones();
      } else {
        hideZones();
      }
      draggingTile=null;
    }

    document.addEventListener('pointermove',function(e){
      if(!zonesVisible||!draggingTile)return;
      highlightZones(getEventY(e));
    });
    document.addEventListener('touchmove',function(e){
      if(!zonesVisible||!draggingTile)return;
      highlightZones(getEventY(e));
    },{passive:true});

    document.addEventListener('pointerup',function(e){
      handleDragEnd(getEventY(e));
    });
    document.addEventListener('touchend',function(e){
      handleDragEnd(getEventY(e));
    });
  },600);});
})();



// ── BACKGROUND VISUALS: SIN SIN pattern on tiles ──
(function(){
  var PATTERN='┌┘└┐╰╮╭╯';
  var enabled=false;

  function getCardColor(tile){
    var style=window.getComputedStyle(tile);
    var bc=style.borderTopColor||style.borderColor;
    var m=bc&&bc.match(/\d+/g);
    if(m&&m.length>=3) return [parseInt(m[0]),parseInt(m[1]),parseInt(m[2])];
    return [0,200,180];
  }

  function makeSinSinDataURL(w,h,r,g,b){
    var cellSize=18;
    var canvas=document.createElement('canvas');
    canvas.width=w; canvas.height=h;
    var ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,w,h);
    ctx.font=cellSize+'px monospace';
    ctx.fillStyle='rgba('+r+','+g+','+b+',0.10)';
    ctx.textBaseline='top';
    var cols=Math.ceil(w/cellSize)+1;
    var rows=Math.ceil(h/cellSize)+1;
    var t=Date.now()*0.0001; // slow drift
    for(var row=0;row<rows;row++){
      for(var col=0;col<cols;col++){
        var x=col, y=row;
        var o=Math.sin(y*x*Math.sin(t)*0.003+y*0.01+t)*20;
        var idx=Math.round(Math.abs(x+y+o))%PATTERN.length;
        ctx.fillText(PATTERN[idx],col*cellSize,row*cellSize);
      }
    }
    // Edge fade like 10PRINT
    var cx=w/2,cy=h/2;
    var grd=ctx.createRadialGradient(cx,cy,Math.min(w,h)*0.08,cx,cy,Math.max(w,h)*0.68);
    grd.addColorStop(0,'rgba(0,0,0,0.78)');
    grd.addColorStop(0.5,'rgba(0,0,0,0.42)');
    grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd;
    ctx.fillRect(0,0,w,h);
    return canvas.toDataURL('image/png');
  }

  function applyToTiles(){
    if(!enabled)return;
    document.querySelectorAll('#grid [data-id]').forEach(function(tile){
      var id=tile.dataset.id;if(!id)return;
      var rgb=getCardColor(tile);
      var r=tile.getBoundingClientRect();
      var w=Math.max(200,Math.round(r.width||320));
      var h=Math.max(200,Math.round(r.height||400));
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var dataUrl=makeSinSinDataURL(w*dpr,h*dpr,rgb[0],rgb[1],rgb[2]);
      tile.dataset.ssBgOriginal=tile.style.backgroundImage||'';
      tile.style.backgroundImage='url("'+dataUrl+'")';
      tile.style.backgroundSize='100% 100%';
      tile.style.backgroundRepeat='no-repeat';
    });
  }

  function clearFromTiles(){
    document.querySelectorAll('#grid [data-id]').forEach(function(tile){
      tile.style.backgroundImage=tile.dataset.ssBgOriginal||'';
      tile.style.backgroundSize='';
      tile.style.backgroundRepeat='';
    });
  }

  window.applyBgSinSin=function(on){
    enabled=on;
    if(on){setTimeout(applyToTiles,120);}
    else{clearFromTiles();}
  };

  var resizeTimer;
  window.addEventListener('resize',function(){
    if(!enabled)return;
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(applyToTiles,300);
  });
})();
var mi=0;
setInterval(function(){mi=(mi+1)%msgs.length;document.getElementById('smsg').textContent=msgs[mi];},5000);

// ── PWA SERVICE WORKER REGISTRATION ──
var msgs=['SYSTEM NOMINAL','ALL SYSTEMS GO','STANDING BY','READY','UPTIME NOMINAL','CONNECTION STABLE','MODULES LOADED','RUNNING SMOOTHLY'];
var mi=0;
setInterval(function(){mi=(mi+1)%msgs.length;var el=document.getElementById('smsg');if(el)el.textContent=msgs[mi];},5000);
if('serviceWorker' in navigator&&location.protocol==='https:'&&!location.hostname.includes('claudeusercontent')){
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
}

var wmData=JSON.parse(localStorage.getItem('dash_wm')||'{"weekKey":null,"items":[]}');
function wmSave(){lsSet('dash_wm',wmData);}
function wmGetWeekKey(){
  // Week resets Monday at midnight — no grace period
  var n=new Date();
  var dow=n.getDay();
  var mon=new Date(n);mon.setDate(n.getDate()-((dow+6)%7));mon.setHours(0,0,0,0);
  return mon.toISOString().slice(0,10);
}

function wmGetLastWeekKey(){
  var n=new Date();
  var dow=n.getDay();
  var mon=new Date(n);mon.setDate(n.getDate()-((dow+6)%7)-7);mon.setHours(0,0,0,0);
  return mon.toISOString().slice(0,10);
}
function wmCheckWeek(){
  // Defensive: ensure wmData is always valid
  if(!wmData||typeof wmData!=='object')wmData={weekKey:null,items:[],log:[],deleted:[]};
  if(!Array.isArray(wmData.items))wmData.items=[];
  if(!Array.isArray(wmData.log))wmData.log=[];
  if(!Array.isArray(wmData.deleted))wmData.deleted=[];
  var wk=wmGetWeekKey();
  if(wmData.weekKey!==wk){
    // Log completed items from last week before resetting
    if(wmData.weekKey){
      var completedItems=wmData.items.filter(function(it){return it.done;}).map(function(it){return it.text;});
      if(!wmData.log)wmData.log=[];
      wmData.log.unshift({week:wmData.weekKey,done:completedItems,all:wmData.items.map(function(it){return it.text;}),ts:new Date().toISOString()});
      if(wmData.log.length>52)wmData.log=wmData.log.slice(0,52);
    }
    wmData.weekKey=wk;
    wmData.items=wmData.items.map(function(it){return {text:it.text,done:false,ts:it.ts};});
    wmSave();
  }
  return wmData;
}
function wmRender(){
  var el=document.getElementById('wm-body');
  var badge=document.getElementById('wm-badge');
  if(!el)return;
  wmCheckWeek();
  var done=wmData.items.filter(function(it){return it.done;}).length;
  var total=wmData.items.length;
  if(badge)badge.textContent=done+'/'+total;
  var tab=wmData._tab||'routines';
  var dow=new Date().getDay();
  // Active only Fri(5), Sat(6), Sun(0). Mon resets but is locked. Tue-Thu locked.
  var locked=(dow>=1&&dow<=4); // Mon=1 through Thu=4 are locked
  var h='';

  // Tab bar — no inline onclick, use data-wmtab
  h+='<div class="flex-row-4">';
  [{t:'routines',l:'ROUTINES'},{t:'log',l:'LOG'},{t:'chain',l:'CHAIN'}].forEach(function(x){
    var active=tab===x.t;
    h+='<span data-wmtab="'+x.t+'" style="font-size:var(--t-sm);padding:3px 10px;border:1px solid '+(active?'var(--ca)':'rgba(255,255,255,.12)')+';color:'+(active?'var(--ca)':'var(--dim)')+';cursor:pointer">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='routines'){
    // Show current week number
    var curWkNum=wrGetISOWeek?wrGetISOWeek(localDateStr(new Date())):0;
    if(curWkNum)h+='<div class="label-dim">WEEK #'+curWkNum+'</div>';
    if(!wmData.items.length){
      h+='<div style="color:var(--dim);font-size:var(--t-md);padding:8px 0">No routines yet. Add one below.</div>';
    } else {
      // Get last week's completed items for prior-week indicator
      var lastWk=wmGetLastWeekKey();
      var lastLog=wmData.log&&wmData.log.find(function(l){return l.week===lastWk;});
      var lastDone=lastLog?lastLog.done||[]:[];
      wmData.items.forEach(function(it,i){
        var doneLastWeek=lastDone.indexOf(it.text)>=0;
        h+='<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--c-ghost)">';
        // Tap-friendly checkbox
        h+='<div '+(locked?'':'data-wmtoggle="'+i+'"')+' style="flex-shrink:0;width:28px;height:28px;border-radius:4px;border:2px solid '+(it.done?'var(--ca)':locked?'rgba(255,255,255,.08)':'rgba(255,255,255,.2)')+';background:'+(it.done?'var(--ca)':'transparent')+';cursor:'+(locked?'default':'pointer')+';display:flex;align-items:center;justify-content:center;transition:all .15s;opacity:'+(locked&&!it.done?'.4':'1')+'">';
        h+=it.done?'<span style="color:#000;font-size:var(--t-sub);font-weight:bold;line-height:1">&#10003;</span>':'';
        h+='</div>';
        h+='<div class="flex-1">';
        h+='<span style="font-size:var(--t-lg);color:'+(it.done?'var(--dim)':'var(--text)')+';'+(it.done?'text-decoration:line-through':'')+'">' +it.text+'</span>';
        if(doneLastWeek)h+='<span style="margin-left:6px;font-size:var(--t-xs);color:rgba(255,204,0,.45);letter-spacing:.5px">✓ last wk</span>';
        h+='</div>';
        if(!locked)h+='<span data-wmdel="'+i+'" style="font-size:var(--t-base);color:var(--dim);cursor:pointer;opacity:.4;flex-shrink:0">✕</span>';
        h+='</div>';
      });
    }
    if(locked){
      var lockDay=['','Mon','Tue','Wed','Thu'][dow]||'';
      h+='<div style="display:flex;align-items:center;gap:6px;margin-top:6px;padding:5px 8px;border:1px solid var(--c-gold-dim);background:rgba(255,204,0,.04)"><span>🔒</span><span style="font-size:var(--t-xs);color:var(--ca)">Check-ins open Fri – Sun only'+(lockDay?' · today is '+lockDay:'')+'</span></div>';
    }
    h+='<div style="display:flex;gap:6px;margin-top:8px">';
    h+='<input id="wm-inp" placeholder="Add routine..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" style="flex:1;background:transparent;border:none;border-bottom:1px solid var(--c-faint);color:var(--text);font-family:monospace;font-size:var(--t-md);padding:4px 2px;outline:none">';
    h+='<button id="wm-add-btn" style="font-size:var(--t-sm);padding:4px 10px;border:1px solid var(--c-faint);color:var(--dim);background:transparent;cursor:pointer">+</button>';
    h+='</div>';
  } else if(tab==='log'){
    var log=wmData.log||[];
    if(!log.length){
      h+='<div style="color:var(--dim);font-size:var(--t-md);padding:8px 0">No history yet.</div>';
    } else {
      log.slice(0,12).forEach(function(entry){
        h+='<div style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--c-ghost)">';
        h+='<div class="label-dim-xs">WEEK #'+wrGetISOWeek(entry.week)+' &mdash; '+entry.week+'</div>';
        entry.done.forEach(function(text){
          h+='<div style="font-size:var(--t-md);color:var(--text);padding:2px 0">&#10003; '+text+'</div>';
        });
        h+='</div>';
      });
    }
  } else if(tab==='chain'){
    var log=wmData.log||[];
    if(!wmData.items.length){
      h+='<div style="color:var(--dim);font-size:var(--t-md);padding:8px 0">Add routines first.</div>';
    } else {
      h+='<div class="label-dim-md">Consecutive weeks completed</div>';
      wmData.items.forEach(function(it){
        var streak=0;
        if(it.done)streak++;
        for(var li=0;li<log.length;li++){
          if(log[li].done.indexOf(it.text)>=0)streak++;
          else break;
        }
        var dots='';
        for(var d=0;d<12;d++){
          dots+='<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:'+(d<streak?'var(--ca)':'rgba(255,255,255,.08)')+';margin-right:3px"></span>';
        }
        h+='<div class="mb-10">';
        h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">';
        h+='<span class="text-12">'+it.text+'</span>';
        h+='<span style="font-size:var(--t-base);color:var(--ca);font-weight:bold">'+streak+'w</span>';
        h+='</div>';
        h+='<div style="display:flex;flex-wrap:wrap;gap:3px">'+dots+(streak>12?'<span style="font-size:var(--t-sm);color:var(--ca)">+'+(streak-12)+'</span>':'')+'</div>';
        h+='</div>';
      });
    }
  }

  // ── Verbose reset sentence ──
  var _now=new Date();
  var _dow=_now.getDay();
  // Next Monday midnight
  var _daysToMon=(_dow===0)?1:(8-_dow); // Sun=1 day, others = days until next Mon
  var _nextMon=new Date(_now);
  _nextMon.setDate(_now.getDate()+_daysToMon);
  _nextMon.setHours(0,0,0,0);
  var _msLeft=_nextMon-_now;
  var _hLeft=Math.floor(_msLeft/36e5);
  var _mLeft=Math.floor((_msLeft%36e5)/6e4);
  var _dLeft=Math.floor(_hLeft/24);
  var _hRem=_hLeft%24;
  var _completedCount=(wmData.items||[]).filter(function(it){return it.done;}).length;
  var _totalCount=(wmData.items||[]).length;
  var _timeStr=_dLeft>0?_dLeft+'d '+_hRem+'h '+_mLeft+'m':_hLeft+'h '+_mLeft+'m';
  var _resetSentence='';
  if(_dow===1){ // Monday — just reset
    _resetSentence='Week just reset. Check-ins open Friday.';
  } else if(_dow>=2&&_dow<=4){ // Tue–Thu
    _resetSentence='Week resets in '+_timeStr+'. Check-ins open Friday. '
      +(_totalCount?(_completedCount+' of '+_totalCount+' done last weekend.'):'');
  } else { // Fri–Sun
    if(_totalCount===0){
      _resetSentence='Weekend active. Add routines below.';
    } else if(_completedCount===_totalCount){
      _resetSentence='All '+_totalCount+' routines done this weekend. Week resets in '+_timeStr+'.';
    } else {
      var _remaining=_totalCount-_completedCount;
      _resetSentence=_completedCount+' of '+_totalCount+' done. '
        +_remaining+' remaining. Week resets in '+_timeStr+'.';
    }
  }
  h+='<div style="margin-top:10px;padding:6px 8px;border-left:2px solid var(--c-gold-dim);font-size:var(--t-sm);color:var(--dim);line-height:1.6">'+_resetSentence+'</div>';

  el.innerHTML=h;

  // Wire everything after render
  var addInp=document.getElementById('wm-inp');
  var addBtn=document.getElementById('wm-add-btn');
  if(addInp){
    addInp.onkeydown=function(e){if(e.key==='Enter'||e.keyCode===13)wmAdd();};
    addInp.oninput=function(){window._wmInpVal=this.value;};
  }
  if(addBtn){
    addBtn.onclick=function(){wmAdd();};
    var _gTX1=0,_gTY1=0;
    addBtn.ontouchstart=function(e){_gTX1=e.touches[0].clientX;_gTY1=e.touches[0].clientY;};
    addBtn.ontouchend=function(e){
      if(Math.abs(e.changedTouches[0].clientX-_gTX1)>8||Math.abs(e.changedTouches[0].clientY-_gTY1)>8)return;
      e.preventDefault();wmAdd();
    };
  }
  el.querySelectorAll('[data-wmtab]').forEach(function(btn){
    btn.onclick=function(){wmSwitchTab(this.dataset.wmtab);};
  });
  // Wiring handled by global document click delegator below
}
setTimeout(function(){wmRender();},300);
function wmSwitchTab(t){wmData._tab=t;wmSave();wmRender();}
function wmAdd(){
  // Read from cached value (set by oninput) or DOM as fallback
  var txt=(window._wmInpVal||'').trim();
  if(!txt){
    var inp=document.getElementById('wm-inp');
    txt=inp?inp.value.trim():'';
  }
  if(!txt)return;
  window._wmInpVal='';
  var inp2=document.getElementById('wm-inp');
  if(inp2)inp2.value='';
  wmCheckWeek();
  if(!Array.isArray(wmData.items))wmData.items=[];
  wmData.items.push({id:String(Date.now()),text:txt,done:false,ts:new Date().toISOString()});
  wmSave();
  wmRender();
}
function wmToggle(i,evt){
  if(wmData.items[i]){
    wmData.items[i].done=!wmData.items[i].done;
    wmSave();wmRender();
    if(wmData.items[i].done){
      var cx=evt&&evt.clientX?evt.clientX:window.innerWidth/2;
      var cy=evt&&evt.clientY?evt.clientY:200;
      confetti(cx,cy,'#ffcc00');
    }
  }
}
var _wmDelPending=null;
var _wmDelTimer=null;

function wmDelete(i, evt){
  if(_wmDelPending===i){
    clearTimeout(_wmDelTimer);
    _wmDelPending=null; _wmDelTimer=null;
    var cx=evt&&evt.clientX?evt.clientX:window.innerWidth/2;
    var cy=evt&&evt.clientY?evt.clientY:200;
    var deletedItem=wmData.items[i]||null;
    var deletedText=deletedItem?deletedItem.text:null;
    // Write tombstone so deletion survives cloud sync
    if(deletedItem){
      if(!Array.isArray(wmData.deleted))wmData.deleted=[];
      var tombId=deletedItem.id||deletedItem.text.toLowerCase();
      wmData.deleted.unshift({id:tombId,text:deletedItem.text,ts:Date.now()});
      if(wmData.deleted.length>33)wmData.deleted=wmData.deleted.slice(0,33);
    }
    wmData.items.splice(i,1);
    // Purge from log so deletion syncs fully
    if(deletedText&&wmData.log){
      wmData.log.forEach(function(entry){
        if(entry.done)entry.done=entry.done.filter(function(t){return t!==deletedText;});
        if(entry.all)entry.all=entry.all.filter(function(t){return t!==deletedText;});
      });
    }
    wmSave(); wmRender();
    if(typeof confetti==='function')confetti(cx,cy,'#ff4444');
  } else {
    _wmDelPending=i;
    clearTimeout(_wmDelTimer);
    var btn=document.querySelector('[data-wmdel="'+i+'"]');
    if(btn){btn.textContent='SURE?';btn.style.color='var(--cr)';btn.style.opacity='1';}
    _wmDelTimer=setTimeout(function(){
      _wmDelPending=null; _wmDelTimer=null;
      var b=document.querySelector('[data-wmdel="'+i+'"]');
      if(b){b.textContent='✕';b.style.color='var(--dim)';b.style.opacity='.4';}
    },2500);
  }
}
function wmStartEdit(i){
  var row=document.getElementById('wm-row-'+i);
  if(!row)return;
  var it=wmData.items[i];
  var safe=it.text.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  var eHtml='<input id="wm-ei-'+i+'" style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(255,204,0,.4);color:var(--text);font-family:monospace;font-size:var(--t-md);padding:3px 2px;outline:none" value="'+safe+'" onkeydown="var k=event.key;if(k===String.fromCharCode(13))wmSaveEdit('+i+');if(k===String.fromCharCode(27))wmRender()">';
  eHtml+='<span onclick="wmSaveEdit('+i+')" style="font-size:var(--t-base);color:var(--ca);cursor:pointer;padding:2px 6px;border:1px solid rgba(255,204,0,.3);margin-left:4px">OK</span>';
  eHtml+='<span onclick="wmRender()" style="font-size:var(--t-base);color:var(--dim);cursor:pointer;padding:2px 6px">&#x2715;</span>';
  row.innerHTML=eHtml;
  setTimeout(function(){var inp=document.getElementById('wm-ei-'+i);if(inp){inp.focus();inp.select();}},20);
}
function wmSaveEdit(i){var inp=document.getElementById('wm-ei-'+i);if(!inp||!inp.value.trim())return;wmData.items[i].text=inp.value.trim();wmSave();wmRender();}
function pomoSetCustomWork(){var inp=document.getElementById('pomo-custom-inp');var v=parseInt(inp&&inp.value);if(v>0&&v<=120){pomoSetMode('work',v);if(inp)inp.value='';}}
function pomoSetCustomBreak(){var inp=document.getElementById('pomo-custom-inp');var v=parseInt(inp&&inp.value);if(v>0&&v<=120){pomoSetMode('break',v);if(inp)inp.value='';}}
setTimeout(wmRender,200);

var wrData=lsGet('dash_wr',[]);
function wrSave(){lsSet('dash_wr',wrData);}
function wrGetISOWeek(dateStr){
  // Returns ISO week number for a YYYY-MM-DD string
  var d=new Date(dateStr+'T12:00:00');
  var jan4=new Date(d.getFullYear(),0,4);
  var dayOfYear=Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);
  var weekOfJan4=Math.floor((jan4-new Date(jan4.getFullYear(),0,0))/864e5/7);
  return Math.floor((dayOfYear-1)/7)-weekOfJan4+2;
}
function wrWeekLabel(weekKey){
  return 'Week #'+wrGetISOWeek(weekKey)+' · '+weekKey;
}
function wrGetWeekKey(){var n=new Date();var dow=n.getDay();var sun=new Date(n);sun.setDate(n.getDate()-dow);sun.setHours(0,0,0,0);return sun.toISOString().slice(0,10);}
var wrCurrentTab='write';
function wrTab(t){
  wrCurrentTab=t;
  ['write','history'].forEach(function(x){
    var btn=document.getElementById('wr-tab-'+x);
    var panel=document.getElementById('wr-panel-'+x);
    if(btn){btn.style.color=x===t?'var(--cg)':'var(--dim)';btn.style.borderColor=x===t?'var(--cg)':'var(--dim)';}
    if(panel)panel.style.display=x===t?'':'none';
  });
  if(t==='write')wrRenderWrite();
  else wrRenderHistory();
}
function wrRenderWrite(){
  var el=document.getElementById('wr-panel-write');
  var badge=document.getElementById('wr-badge');
  if(!el)return;
  var wk=wrGetWeekKey();
  var dow=new Date().getDay();
  var isWeekend=(dow===0||dow===6);
  var existing=wrData.find(function(e){return e.week===wk;});
  if(badge){
    if(existing){badge.textContent='Week #'+wrGetISOWeek(wk)+' ✓';badge.style.color='var(--cg)';badge.style.borderColor='var(--cg)';}
    else if(dow===0||dow===6){badge.textContent='Week #'+wrGetISOWeek(wk)+' — due!';badge.style.color='var(--cr)';badge.style.borderColor='var(--cr)';}
    else{badge.textContent='Week #'+wrGetISOWeek(wk);badge.style.color='var(--dim)';badge.style.borderColor='var(--dim)';}
  }
  var PROMPTS=[
    {id:'win',label:'What went well this week?',ph:'A win, big or small...'},
    {id:'miss',label:'What did I miss or avoid?',ph:'Be honest...'},
    {id:'learn',label:'What did I learn?',ph:'A lesson, insight, or surprise...'},
    {id:'next',label:'One priority for next week:',ph:'The thing that will make next week a win...'},
    {id:'gratitude',label:'What am I grateful for?',ph:'Keep it real...'}
  ];
  var h='';
  if(existing){
    h+='<div style="font-size:var(--t-sm);color:var(--cg);padding:6px 0;margin-bottom:8px;letter-spacing:1px">&#10003; Week #'+wrGetISOWeek(wk)+' — review saved</div>';
    PROMPTS.forEach(function(p){if(existing[p.id]){h+='<div class="mb-8"><div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:2px">'+p.label.toUpperCase()+'</div><div style="font-size:var(--t-md);color:var(--text);line-height:1.5">'+existing[p.id]+'</div></div>';}});
    h+='<button onclick="wrStartNew()" style="width:100%;padding:7px;background:transparent;border:1px solid rgba(0,255,136,.3);color:var(--cg);font-family:monospace;font-size:var(--t-sm);cursor:pointer;margin-top:4px">EDIT / UPDATE</button>';
  } else {
    PROMPTS.forEach(function(p){h+='<div class="mb-10"><div class="wr-prompt">'+p.label+'</div><textarea class="wr-inp" id="wr-'+p.id+'" placeholder="'+p.ph+'"></textarea></div>';});
    h+='<button onclick="wrSaveEntry()" style="width:100%;padding:9px;background:transparent;border:1px solid var(--cg);color:var(--cg);font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:2px">SAVE REVIEW</button>';
  }

  // Verbose timing sentence
  var _wrNow=new Date();
  var _wrDow=_wrNow.getDay();
  // Week resets Sunday midnight (wrGetWeekKey uses Sunday as start)
  var _wrToSun=_wrDow===0?7:(7-_wrDow);
  var _wrNextSun=new Date(_wrNow);
  _wrNextSun.setDate(_wrNow.getDate()+_wrToSun);
  _wrNextSun.setHours(0,0,0,0);
  var _wrMs=_wrNextSun-_wrNow;
  var _wrH=Math.floor(_wrMs/36e5);
  var _wrD=Math.floor(_wrH/24);
  var _wrHr=_wrH%24;
  var _wrMin=Math.floor((_wrMs%36e5)/6e4);
  var _wrTimeStr=_wrD>0?_wrD+'d '+_wrHr+'h '+_wrMin+'m':_wrH+'h '+_wrMin+'m';
  var _wrSentence='';
  var _wrExisting=wrData.find(function(e){return e.week===wrGetWeekKey();});
  if(_wrDow===0||_wrDow===6){
    if(_wrExisting){
      _wrSentence='Review saved for this week. Week resets in '+_wrTimeStr+'.';
    } else {
      _wrSentence='Weekend — a good time to reflect. Week resets in '+_wrTimeStr+'.';
    }
  } else if(_wrDow===1){
    _wrSentence='New week started. Last chance to review last week before it is gone.';
  } else {
    if(_wrExisting){
      _wrSentence='Review done for this week. Next review window in '+_wrTimeStr+'.';
    } else {
      _wrSentence='Review window opens on the weekend. Next in '+_wrTimeStr+'.';
    }
  }
  h+='<div style="margin-top:10px;padding:6px 8px;border-left:2px solid rgba(0,255,136,.2);font-size:var(--t-sm);color:var(--dim);line-height:1.6">'+_wrSentence+'</div>';

  el.innerHTML=h;
}
function wrStartNew(){var wk=wrGetWeekKey();var idx=wrData.findIndex(function(e){return e.week===wk;});if(idx>=0)wrData.splice(idx,1);wrSave();wrRenderWrite();}
function wrSaveEntry(){
  var wk=wrGetWeekKey();
  var entry={week:wk,ts:new Date().toISOString()};
  ['win','miss','learn','next','gratitude'].forEach(function(id){var el=document.getElementById('wr-'+id);if(el&&el.value.trim())entry[id]=el.value.trim();});
  if(Object.keys(entry).length<=2)return;
  var idx=wrData.findIndex(function(e){return e.week===wk;});
  if(idx>=0)wrData[idx]=entry; else wrData.unshift(entry);
  if(wrData.length>52)wrData=wrData.slice(0,52);
  wrSave();wrRenderWrite();confetti(window.innerWidth/2,200,'#00ff88');
}
function wrRenderHistory(){
  var el=document.getElementById('wr-panel-history');
  if(!el)return;
  if(!wrData.length){el.innerHTML='<div class="empty-msg-sm">No reviews yet.</div>';return;}
  var h='';
  wrData.forEach(function(entry){
    h+='<div class="wr-entry"><div class="wr-entry-date">Week #'+wrGetISOWeek(entry.week)+' &mdash; '+entry.week+'</div>';
    if(entry.win)h+='<div class="mb-4"><span style="font-size:var(--t-xs);color:var(--cg)">WIN: </span><span class="wr-entry-text">'+entry.win+'</span></div>';
    if(entry.next)h+='<div class="mb-4"><span style="font-size:var(--t-xs);color:var(--ca)">NEXT: </span><span class="wr-entry-text">'+entry.next+'</span></div>';
    if(entry.miss)h+='<div class="mb-4"><span style="font-size:var(--t-xs);color:var(--cr)">MISSED: </span><span class="wr-entry-text">'+entry.miss+'</span></div>';
    h+='</div>';
  });
  el.innerHTML=h;
}
setTimeout(function(){wrTab('write');},400);

var dlData=lsGet('dash_dl',[]);
function dlSave(){lsSet('dash_dl',dlData);}
var dlCurrentTab='add';
var dlAddMode='quick';
function dlTab(t){
  dlCurrentTab=t;
  ['add','log'].forEach(function(x){
    var btn=document.getElementById('dl-tab-'+x);
    var panel=document.getElementById('dl-panel-'+x);
    if(btn){btn.style.color=x===t?'var(--ca)':'var(--dim)';btn.style.borderColor=x===t?'var(--ca)':'var(--dim)';}
    if(panel)panel.style.display=x===t?'':'none';
  });
  if(t==='add')dlRenderAdd();
  else dlRenderLog();
}
function dlSetMode(m){dlAddMode=m;dlRenderAdd();}
function dlRenderAdd(){
  var el=document.getElementById('dl-panel-add');
  var badge=document.getElementById('dl-badge');
  if(!el)return;
  if(badge)badge.textContent=dlData.length;
  var qActive=dlAddMode==='quick';
  var h='<div class="flex-row-4">';
  h+='<span data-m="quick" onclick="dlSetMode(this.dataset.m)" style="font-size:var(--t-sm);padding:3px 10px;border:1px solid '+(qActive?'var(--cpr)':'var(--c-faint)')+';color:'+(qActive?'var(--cpr)':'var(--dim)')+';cursor:pointer;letter-spacing:1px">QUICK</span>';
  h+='<span data-m="structured" onclick="dlSetMode(this.dataset.m)" style="font-size:var(--t-sm);padding:3px 10px;border:1px solid '+(!qActive?'var(--cpr)':'var(--c-faint)')+';color:'+(!qActive?'var(--cpr)':'var(--dim)')+';cursor:pointer;letter-spacing:1px">STRUCTURED</span>';
  h+='</div>';
  if(qActive){
    h+='<textarea class="wr-inp" id="dl-inp-quick" placeholder="Quick decision note..." style="min-height:80px"></textarea>';
    h+='<button onclick="dlSaveQuick()" style="width:100%;padding:9px;background:transparent;border:1px solid var(--cpr);color:var(--cpr);font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:2px;margin-top:4px">LOG</button>';
  } else {
    h+='<div class="mb-8"><div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:3px">THE DECISION</div><textarea class="wr-inp" id="dl-inp-decision" placeholder="What am I deciding?" style="min-height:44px"></textarea></div>';
    h+='<div class="mb-8"><div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:3px">WHY</div><textarea class="wr-inp" id="dl-inp-why" placeholder="Reasoning, context..." style="min-height:44px"></textarea></div>';
    h+='<div class="mb-10"><div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:3px">ALTERNATIVES CONSIDERED</div><textarea class="wr-inp" id="dl-inp-alts" placeholder="What else did I consider?" style="min-height:36px"></textarea></div>';
    h+='<div class="flex-row">';
    h+='<button onclick="dlSaveEntry()" style="flex:1;padding:9px;background:transparent;border:1px solid var(--cpr);color:var(--cpr);font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:2px">LOG DECISION</button>';
    h+='<button id="dl-copy-prompt-btn" style="padding:9px 12px;background:transparent;border:1px solid var(--c-faint);color:var(--dim);font-family:monospace;font-size:var(--t-sm);cursor:pointer;letter-spacing:1px;white-space:nowrap">📋 AI</button>';
    h+='</div>';
  }
  el.innerHTML=h;
  // Wire AI copy prompt button
  var dlCopyBtn=document.getElementById('dl-copy-prompt-btn');
  if(dlCopyBtn){
    dlCopyBtn.onclick=function(){
      var d=document.getElementById('dl-inp-decision');
      var w=document.getElementById('dl-inp-why');
      var a=document.getElementById('dl-inp-alts');
      var dv=d&&d.value.trim()||'';
      var wv=w&&w.value.trim()||'';
      var av=a&&a.value.trim()||'';
      var prompt='I need help thinking through a decision.\n\n';
      if(dv)prompt+='THE DECISION:\n'+dv+'\n\n';
      if(wv)prompt+='MY REASONING / CONTEXT:\n'+wv+'\n\n';
      if(av)prompt+='ALTERNATIVES I\'VE CONSIDERED:\n'+av+'\n\n';
      prompt+='Please help me think through this carefully. Ask clarifying questions if needed. '
        +'Point out any blind spots, assumptions, or factors I may not have considered. '
        +'Then give me your honest assessment of the decision.';
      var doCopy=function(t){
        if(navigator.clipboard)navigator.clipboard.writeText(t).catch(function(){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);});
        else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}
      };
      doCopy(prompt);
      dlCopyBtn.textContent='✓ COPIED';
      dlCopyBtn.style.color='var(--cg)';
      safeHap(HAP.soft);
      setTimeout(function(){dlCopyBtn.textContent='📋 AI';dlCopyBtn.style.color='var(--dim)';},2000);
    };
  }
}
function dlSaveQuick(){var el=document.getElementById('dl-inp-quick');if(!el||!el.value.trim())return;var entry={id:Date.now(),date:localDateStr(new Date()),decision:el.value.trim(),why:'',alts:'',outcome:'',quick:true};dlData.unshift(entry);if(dlData.length>200)dlData=dlData.slice(0,200);dlSave();el.value='';dlTab('log');}
function dlSaveEntry(){
  var d=document.getElementById('dl-inp-decision');
  var w=document.getElementById('dl-inp-why');
  var a=document.getElementById('dl-inp-alts');
  if(!d||!d.value.trim())return;
  var entry={id:Date.now(),date:localDateStr(new Date()),decision:d.value.trim(),why:(w&&w.value.trim())||'',alts:(a&&a.value.trim())||'',outcome:''};
  dlData.unshift(entry);if(dlData.length>200)dlData=dlData.slice(0,200);dlSave();
  ['dl-inp-decision','dl-inp-why','dl-inp-alts'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  dlTab('log');
}
function dlRenderLog(){
  var el=document.getElementById('dl-panel-log');
  if(!el)return;
  var badge=document.getElementById('dl-badge');
  if(badge)badge.textContent=dlData.length;
  if(!dlData.length){el.innerHTML='<div class="empty-msg-sm">No decisions logged yet.</div>';return;}
  var h='';
  // 30-day review prompt — find decisions that need revisiting
  var now30=new Date();
  var overdueReview=dlData.filter(function(e){
    var lastOutcome=e.outcomes&&e.outcomes.length?new Date(e.outcomes[e.outcomes.length-1].ts):new Date(e.date+'T00:00:00');
    var daysSince=Math.round((now30-lastOutcome)/(864e5));
    return daysSince>=30;
  });
  if(overdueReview.length){
    h+='<div class="inactivity-notice'+(overdueReview.length>0?' jiggle':'')+'" style="margin-bottom:12px;border-color:rgba(245,166,35,.4);background:rgba(245,166,35,.05)">';
    h+='<span style="color:#f5a623;font-size:var(--t-base)">&#9650; '+overdueReview.length+' decision'+(overdueReview.length>1?'s':'')+' need a 30-day review</span>';
    h+='</div>';
  }
  dlData.forEach(function(entry){
    // Check if this entry needs review
    var lastOutcome=entry.outcomes&&entry.outcomes.length?new Date(entry.outcomes[entry.outcomes.length-1].ts):new Date(entry.date+'T00:00:00');
    var daysSinceReview=Math.round((now30-lastOutcome)/(864e5));
    var needsReview=daysSinceReview>=30;
    var outcomes=Array.isArray(entry.outcomes)?entry.outcomes:(entry.outcome?[{text:entry.outcome,ts:''}]:[]);
    h+='<div class="dl-entry">';
    h+='<div class="dl-decision">'+entry.decision+(entry.quick?' <span style="font-size:var(--t-xs);color:var(--dim);font-weight:normal">[quick]</span>':'')+'</div>';
    if(entry.why)h+='<div class="dl-field"><span style="font-size:var(--t-xs);letter-spacing:.5px">WHY: </span>'+entry.why+'</div>';
    if(entry.alts)h+='<div class="dl-field"><span style="font-size:var(--t-xs);letter-spacing:.5px">ALT: </span>'+entry.alts+'</div>';
    // Outcomes list
    if(outcomes.length){
      h+='<div style="margin-top:6px;display:flex;flex-direction:column;gap:3px">';
      outcomes.forEach(function(o,oi){
        h+='<div style="display:flex;gap:6px;align-items:flex-start;padding:4px 8px;background:rgba(0,255,136,.05);border-left:2px solid rgba(0,255,136,.3)">';
        h+='<div style="flex:1"><span style="font-size:var(--t-xs);color:var(--cg);letter-spacing:.5px">OUTCOME'+(outcomes.length>1?' '+(oi+1):'')+':</span><span style="font-size:var(--t-base);color:var(--text);margin-left:6px">'+o.text+'</span>'+(o.ts?'<div style="font-size:var(--t-xs);color:var(--dim);margin-top:1px">'+o.ts.slice(0,16).replace('T',' ')+'</div>':'')+'</div>';
        h+='<span data-eid="'+entry.id+'" data-oi="'+oi+'" onclick="dlDeleteOutcome(this.dataset.eid,+this.dataset.oi)" style="font-size:var(--t-sm);color:var(--dim);cursor:pointer;opacity:.4;flex-shrink:0">✕</span>';
        h+='</div>';
      });
      h+='</div>';
    }
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">';
    h+='<span class="dl-date">'+entry.date+(needsReview?' <span style="color:#f5a623;font-size:var(--t-xs)">&#9650; review due</span>':'')+'</span>';
    h+='<div style="display:flex;gap:4px">';
    h+='<button class="dl-outcome-btn" data-eid="'+entry.id+'" onclick="dlAddOutcome(this.dataset.eid)">'+(needsReview?'&#9650; update':'+ outcome')+'</button>';
    h+='<button data-eid="'+entry.id+'" onclick="dlDelete(this.dataset.eid)" style="font-size:var(--t-xs);padding:2px 6px;border:1px solid rgba(255,68,68,.3);color:var(--cr);background:transparent;cursor:pointer">del</button>';
    h+='</div>';
    h+='</div>';
    h+='</div>';
  });
  el.innerHTML=h;
}
function dlAddOutcome(id){
  var outcome=prompt('What was the outcome?');
  if(!outcome||!outcome.trim())return;
  var entry=dlData.find(function(e){return String(e.id)===String(id);});
  if(!entry)return;
  // Migrate legacy single outcome to array
  if(!entry.outcomes){
    entry.outcomes=entry.outcome?[{text:entry.outcome,ts:''}]:[];
    delete entry.outcome;
  }
  entry.outcomes.push({text:outcome.trim(),ts:new Date().toISOString()});
  dlSave();dlRenderLog();
}
function dlDeleteOutcome(id,oi){
  var entry=dlData.find(function(e){return String(e.id)===String(id);});
  if(!entry)return;
  if(!entry.outcomes)entry.outcomes=entry.outcome?[{text:entry.outcome,ts:''}]:[];
  entry.outcomes.splice(oi,1);
  if(!entry.outcomes.length)delete entry.outcome;
  dlSave();dlRenderLog();
}
function dlDelete(id){dlData=dlData.filter(function(e){return String(e.id)!==String(id);});dlSave();dlRenderLog();}
setTimeout(function(){dlTab('add');},450);

var emCurrentTab='hours';
function emTab(t){
  emCurrentTab=t;
  ['hours','days'].forEach(function(x){
    var btn=document.getElementById('em-tab-'+x);
    if(btn){btn.style.color=x===t?'var(--cc)':'var(--dim)';btn.style.borderColor=x===t?'var(--cc)':'var(--dim)';}
  });
  emRender();
}
function emRender(){
  var el=document.getElementById('em-body');
  var badge=document.getElementById('em-badge');
  if(!el)return;
  var allSessions=[];
  for(var i=0;i<localStorage.length;i++){
    var k=localStorage.key(i);
    if(k&&k.startsWith('pomo_log_')){
      try{var date=k.slice(9);var log=JSON.parse(localStorage.getItem(k)||'[]');log.forEach(function(e){if((e.type||e)==='work')allSessions.push({date:date,mins:e.mins||0,ts:e.ts||''});});}catch(ex){}
    }
  }
  if(typeof pomoState!=='undefined'&&pomoState.sessionLog){
    var today=localDateStr(new Date());
    pomoState.sessionLog.forEach(function(m){var mode=typeof m==='object'?m.mode:m;if(mode==='work'){var mts=typeof m==='object'&&m.ts?m.ts:new Date().toISOString();allSessions.push({date:today,mins:typeof m==='object'?m.mins:0,ts:mts});}});
  }
  if(!allSessions.length){el.innerHTML='<div class="empty-msg">No session data yet. Complete some pomodoros first.</div>';return;}
  if(badge)badge.textContent=allSessions.length+' sessions';
  if(emCurrentTab==='hours'){
    var hourMins=new Array(24).fill(0);
    var hasTime=false;
    allSessions.forEach(function(s){if(s.ts&&s.ts.length>10){hasTime=true;var h=new Date(s.ts).getHours();hourMins[h]+=s.mins;}});
    var maxM=Math.max.apply(null,hourMins);
    var h='<div class="label-dim">FOCUS INTENSITY BY HOUR</div>';
    if(!hasTime){h+='<div style="color:var(--dim);font-size:var(--t-base)">Hour data appears after future sessions.</div>';}
    else{
      h+='<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:3px;margin-bottom:8px">';
      for(var hr=0;hr<24;hr++){
        var intensity=maxM>0?hourMins[hr]/maxM:0;
        var bg=intensity>0?'rgba(0,229,255,'+Math.max(0.08,intensity*0.8)+')':'rgba(255,255,255,.04)';
        h+='<div style="text-align:center;padding:4px 2px;background:'+bg+';border-radius:2px">';
        var textCol=intensity>0.45?'rgba(0,20,30,0.9)':'rgba(255,255,255,0.8)';
        var subCol=intensity>0.45?'rgba(0,20,30,0.6)':'rgba(255,255,255,0.35)';
        h+='<div style="font-size:var(--t-xxs);color:'+subCol+'">'+(hr===0?'12a':hr<12?hr+'a':hr===12?'12p':(hr-12)+'p')+'</div>';
        h+='<div style="font-size:var(--t-xs);font-weight:'+(intensity>0.3?'600':'normal')+';color:'+textCol+'">'+( hourMins[hr]?hourMins[hr]+'m':'')+'</div>';
        h+='</div>';
      }
      h+='</div>';
      var peakHr=hourMins.indexOf(maxM);
      var peakLabel=peakHr<12?(peakHr||12)+'am':(peakHr===12?'12pm':(peakHr-12)+'pm');
      h+='<div class="dim-11">Peak: <span style="color:var(--cc)">'+peakLabel+'</span> ('+maxM+' min)</div>';
    }
    el.innerHTML=h;
  } else {
    var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var dowMins=new Array(7).fill(0);
    allSessions.forEach(function(s){var dw=new Date(s.date+'T12:00:00').getDay();dowMins[dw]+=s.mins;});
    var maxDow=Math.max.apply(null,dowMins);
    var h='<div class="label-dim-md">FOCUS MINUTES BY DAY OF WEEK</div>';
    h+='<div style="display:flex;align-items:flex-end;gap:6px;height:80px;margin-bottom:8px">';
    for(var dw=0;dw<7;dw++){
      var pct=maxDow>0?Math.round(dowMins[dw]/maxDow*100):0;
      var isTop=dowMins[dw]===maxDow&&maxDow>0;
      h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">';
      h+='<div style="font-size:var(--t-xs);color:'+(isTop?'var(--cc)':'var(--dim)')+'">'+( dowMins[dw]?dowMins[dw]+'m':'')+'</div>';
      h+='<div style="width:100%;background:'+(isTop?'var(--cc)':'rgba(0,229,255,.35)')+';height:'+Math.max(2,pct)+'%;border-radius:1px 1px 0 0;min-height:'+( dowMins[dw]?'4px':'2px')+'"></div>';
      h+='<div class="dim-9">'+DOW[dw].slice(0,2)+'</div>';
      h+='</div>';
    }
    h+='</div>';
    var bestDow=dowMins.indexOf(maxDow);
    h+='<div class="dim-11">Best: <span style="color:var(--cc)">'+DOW[bestDow]+'</span> — '+maxDow+' min</div>';
    el.innerHTML=h;
  }
}
setTimeout(function(){emRender();},500);

function localDateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function lsCalcStreak(activeFn){var today=new Date();var s=0;for(var i=0;i<90;i++){var d=new Date(today);d.setDate(today.getDate()-i);if(!activeFn(localDateKey(d)))break;s++;}return s;}
function lsGet14(activeFn){var r=[];var today=new Date();for(var i=13;i>=0;i--){var d=new Date(today);d.setDate(today.getDate()-i);r.push(activeFn(localDateKey(d)));}return r;}
function lsRender(){
  var el=document.getElementById('ls-body');
  if(!el)return;
  var ptDataRef=(typeof ptData!=='undefined')?ptData:{};
  var qtDataRef=(typeof qtData!=='undefined')?qtData:{};
  var PT=(typeof PT_PRAYERS!=='undefined')?PT_PRAYERS:['Fajr','Dhuhr','Asr','Maghrib','Isha'];
  var STREAMS=[
    {label:'Salah (4+ prayed)',col:'var(--ca)',
     streak:lsCalcStreak(function(k){var d=ptDataRef[k]||{};return PT.filter(function(p){return d[p]==='ontime'||d[p]==='late';}).length>=4;}),
     days:lsGet14(function(k){var d=ptDataRef[k]||{};return PT.filter(function(p){return d[p]==='ontime'||d[p]==='late';}).length>=4;})},
    {label:'Quran pages',col:'var(--cg)',
     streak:lsCalcStreak(function(k){return (qtDataRef[k]||0)>0;}),
     days:lsGet14(function(k){return (qtDataRef[k]||0)>0;})},
    {label:'Deep work 25m+',col:'var(--cp)',
     streak:lsCalcStreak(function(k){try{var log=JSON.parse(localStorage.getItem('pomo_log_'+k)||'[]');return log.filter(function(e){return (e.type||e)==='work';}).reduce(function(a,e){return a+(e.mins||0);},0)>=25;}catch(ex){return false;}}),
     days:lsGet14(function(k){try{var log=JSON.parse(localStorage.getItem('pomo_log_'+k)||'[]');return log.filter(function(e){return (e.type||e)==='work';}).reduce(function(a,e){return a+(e.mins||0);},0)>=25;}catch(ex){return false;}})},
    // Akhira — Dhikr complete (all 4 phases done)
    {label:'Dhikr complete',col:'#ffcc00',
     streak:lsCalcStreak(function(k){try{var d=lsGet('dash_akhira',{});return d.dhikr&&d.dhikr.date===k&&d.dhikr.phase>=4;}catch(ex){return false;}}),
     days:lsGet14(function(k){try{var d=lsGet('dash_akhira',{});return d.dhikr&&d.dhikr.date===k&&d.dhikr.phase>=4;}catch(ex){return false;}})},
    // Akhira — Audit answered today
    {label:'Akhira audit',col:'#bf5fff',
     streak:lsCalcStreak(function(k){try{var d=lsGet('dash_akhira',{});var log=d.audit||[];return log.some(function(e){return e.date===k;});}catch(ex){return false;}}),
     days:lsGet14(function(k){try{var d=lsGet('dash_akhira',{});var log=d.audit||[];return log.some(function(e){return e.date===k;});}catch(ex){return false;}})},
    // Akhira — Intentions written today
    {label:'Intentions set',col:'#00e5ff',
     streak:lsCalcStreak(function(k){try{var d=lsGet('dash_akhira',{});var log=d.intentions||[];return log.some(function(e){return e.date===k;});}catch(ex){return false;}}),
     days:lsGet14(function(k){try{var d=lsGet('dash_akhira',{});var log=d.intentions||[];return log.some(function(e){return e.date===k;});}catch(ex){return false;}})}
  ];
  var h='';
  STREAMS.forEach(function(s){
    var dots='';
    s.days.forEach(function(active){dots+='<div class="streak-dot" style="background:'+(active?s.col:'var(--c-border)')+'"></div>';});
    h+='<div class="streak-row">';
    h+='<span class="streak-label">'+s.label+'</span>';
    h+='<div class="streak-bar">'+dots+'</div>';
    h+='<span class="streak-val" style="color:'+(s.streak>0?s.col:'var(--c-faint)')+'">'+(s.streak>0?s.streak+' day'+(s.streak!==1?'s':''):'')+'</span>';
    h+='</div>';
  });
  h+='<div style="font-size:var(--t-xs);color:var(--dim);margin-top:8px;letter-spacing:.5px">Dots = days done · Right = today · Missing days not shown</div>';
  el.innerHTML=h;
}
setTimeout(function(){lsRender();},600);

function wrExport(){
  if(!wrData||!wrData.length){alert('No weekly reviews to export.');return;}
  var lines=['WEEKLY REVIEWS EXPORT','Generated: '+new Date().toLocaleDateString(),'='.repeat(40),''];
  wrData.forEach(function(e){
    lines.push('WEEK OF: '+e.week);
    lines.push('-'.repeat(30));
    if(e.win)lines.push('WIN: '+e.win);
    if(e.miss)lines.push('MISSED/AVOIDED: '+e.miss);
    if(e.learn)lines.push('LEARNED: '+e.learn);
    if(e.next)lines.push('NEXT PRIORITY: '+e.next);
    if(e.gratitude)lines.push('GRATEFUL FOR: '+e.gratitude);
    lines.push('');
  });
  lines.push('TOTAL: '+wrData.length+' reviews');
  downloadTxt(lines.join('\n'), 'weekly-reviews.txt');
}

function dlExport(){
  if(!dlData||!dlData.length){alert('No decisions to export.');return;}
  var lines=['DECISION LOG EXPORT','Generated: '+new Date().toLocaleDateString(),'='.repeat(40),''];
  dlData.forEach(function(e,i){
    lines.push((i+1)+'. ['+e.date+'] '+e.decision+(e.quick?' [quick]':''));
    if(e.why)lines.push('   WHY: '+e.why);
    if(e.alts)lines.push('   ALTERNATIVES: '+e.alts);
    if(e.outcome)lines.push('   OUTCOME: '+e.outcome);
    lines.push('');
  });
  lines.push('TOTAL: '+dlData.length+' decisions');
  downloadTxt(lines.join('\n'), 'decision-log.txt');
}

function emExport(){
  var lines=['ENERGY MAP EXPORT','Generated: '+new Date().toLocaleDateString(),'='.repeat(40),''];
  var allSessions=[];
  for(var i=0;i<localStorage.length;i++){
    var k=localStorage.key(i);
    if(k&&k.startsWith('pomo_log_')){
      try{var date=k.slice(9);var log=JSON.parse(localStorage.getItem(k)||'[]');log.forEach(function(e){if((e.type||e)==='work')allSessions.push({date:date,mins:e.mins||0,ts:e.ts||''});});}catch(ex){}
    }
  }
  if(!allSessions.length){alert('No session data to export.');return;}
  var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var dowMins=new Array(7).fill(0);
  var dateMins={};
  allSessions.forEach(function(s){
    var dw=new Date(s.date+'T12:00:00').getDay();
    dowMins[dw]+=s.mins;
    dateMins[s.date]=(dateMins[s.date]||0)+s.mins;
  });
  lines.push('TOTAL WORK SESSIONS: '+allSessions.length);
  lines.push('TOTAL WORK MINUTES: '+allSessions.reduce(function(a,s){return a+s.mins;},0));
  lines.push('');
  lines.push('BY DAY OF WEEK:');
  DOW.forEach(function(d,i){if(dowMins[i])lines.push('  '+d+': '+dowMins[i]+' min');});
  lines.push('');
  lines.push('BY DATE (sorted):');
  Object.keys(dateMins).sort().forEach(function(d){lines.push('  '+d+': '+dateMins[d]+' min');});
  downloadTxt(lines.join('\n'), 'energy-map.txt');
}

function lsExport(){
  var lines=['LIFE STREAKS EXPORT','Generated: '+new Date().toLocaleDateString(),'='.repeat(40),''];
  function localDateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function calcStreak(fn){var t=new Date();var s=0;for(var i=0;i<90;i++){var d=new Date(t);d.setDate(t.getDate()-i);if(!fn(localDateKey(d)))break;s++;}return s;}
  var ptDataRef=(typeof ptData!=='undefined')?ptData:{};
  var qtDataRef=(typeof qtData!=='undefined')?qtData:{};
  var PT=(typeof PT_PRAYERS!=='undefined')?PT_PRAYERS:['Fajr','Dhuhr','Asr','Maghrib','Isha'];
  var salahStreak=calcStreak(function(k){var d=ptDataRef[k]||{};return PT.filter(function(p){return d[p]==='ontime'||d[p]==='late';}).length>=4;});
  var quranStreak=calcStreak(function(k){return (qtDataRef[k]||0)>0;});
  var workStreak=calcStreak(function(k){try{var log=JSON.parse(localStorage.getItem('pomo_log_'+k)||'[]');return log.filter(function(e){return (e.type||e)==='work';}).reduce(function(a,e){return a+(e.mins||0);},0)>=25;}catch(ex){return false;}});
  lines.push('Salah streak (4+ prayers): '+salahStreak+' days');
  lines.push('Quran pages streak: '+quranStreak+' days');
  lines.push('Deep work streak (25m+): '+workStreak+' days');
  downloadTxt(lines.join('\n'), 'life-streaks.txt');
}

function downloadTxt(content, filename){
  var blob=new Blob([content],{type:'text/plain;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},100);
}

var HELP_CONTENT={
  wr:{
    title:'WEEKLY REVIEW',
    body:'A structured 10-15 minute reflection done each weekend. Research on learning and performance consistently shows that review loops are more important than raw effort — you can work hard in the wrong direction for weeks without noticing.<br><br><strong>What went well</strong> — reinforces what to keep doing. Your brain needs to consciously register wins or it discards them.<br><br><strong>What I missed or avoided</strong> — the uncomfortable part. Avoidance is where most growth is hidden. Name it without judgment.<br><br><strong>What I learned</strong> — converts experience into usable knowledge. Without this step, you just accumulate time, not wisdom.<br><br><strong>One priority for next week</strong> — the most important decision you make all week. One clear target beats five vague intentions every time.<br><br><strong>Gratitude</strong> — not a feel-good add-on. Gratitude literally shifts what your brain pays attention to. It trains your attention toward what is working rather than what is not.<br><br>Browse history to see patterns across months. You will be surprised what problems keep appearing in the "missed" section.'
  },
  dl:{
    title:'DECISION LOG',
    body:'A permanent record of significant decisions and the thinking behind them. Most people make decisions and immediately forget the reasoning. Six months later they cannot remember why they did what they did, which means they cannot learn from it.<br><br><strong>Quick mode</strong> — for fast captures. "Decided to skip the gym because I was tired." Small decisions accumulate into character. Worth logging.<br><br><strong>Structured mode</strong> — for bigger choices. Forces you to articulate the why and what else you considered. The act of writing it out often reveals whether the decision is actually sound.<br><br><strong>The outcome field</strong> — fill this in later, sometimes months later, when you see what actually happened. This is where the real learning is. Most people never close the loop. You will.<br><br>Over time this becomes a personal case study of your own judgment. You will see patterns — what kinds of decisions you make well, where you consistently misjudge, what factors you tend to underweight. That awareness is rare and valuable.'
  },
  em:{
    title:'ENERGY MAP',
    body:'Your pomodoro sessions plotted by time of day and day of week, accumulated over weeks and months. Most people have strong opinions about when they are most productive but have never actually checked.<br><br><strong>Hours view</strong> — shows which hours of the day accumulate the most focused work. This reveals your natural peak window. Once you know it, protect it ruthlessly. Do not schedule calls or errands during your peak hours.<br><br><strong>Days view</strong> — shows which days of the week you actually do deep work. Often surprising. Many people think they are productive on Mondays but the data shows Tuesdays and Wednesdays are their real power days.<br><br>The actionable insight: once you see your pattern, reorganize your schedule around it rather than fighting it. Stop trying to do deep work at 9pm if the data shows you never actually do. Stop beating yourself up for not working Sundays if that is genuinely your rest day.<br><br>Data accumulates over time — the more sessions you log, the clearer and more reliable the pattern becomes.'
  },
  ls:{
    title:'LIFE STREAKS',
    body:'A single glance view of your consistency across the things that matter most — salah, Quran, and deep work. The 14-day trail shows not just the current streak but the pattern of consistency over two weeks.<br><br>Streaks are motivating but they are also revealing. A streak of 3 after a gap means something. A streak of 0 that has been 0 for two weeks means something else. The dots do not lie.<br><br><strong>Why this matters</strong> — you track salah in one card, Quran in another, pomodoro in another. Without this view, you never see them together. But they are not separate — they are expressions of the same underlying discipline and intention. When all three are moving, you are in a good place. When they all stall at the same time, that tells you something about your state that no individual card would reveal.<br><br>The number on the right is your current unbroken streak. The dots show the last 14 days — right side is today. A filled dot means the threshold was met that day.<br><br>Salah counts if 4 or more prayers were prayed (on time or late). Quran counts if any pages were logged. Deep work counts if 25 or more focused minutes were completed.'
  }
};

function showHelp(card){
  var modal=document.getElementById('help-modal');
  var title=document.getElementById('help-title');
  var body=document.getElementById('help-body');
  if(!modal||!title||!body)return;
  var content=HELP_CONTENT[card];
  if(!content)return;
  title.textContent=content.title;
  body.innerHTML=content.body;
  modal.style.display='flex';
}

// ── MOOD LOG ──
var mlData=lsGet('dash_ml',[]);
function mlSave(){lsSet('dash_ml',mlData);}

var ML_TAG_COLORS={
  // Sad / low — blue
  'anxious':      'rgba(90,140,255,.45)',
  'lonely':       'rgba(80,120,220,.45)',
  'empty':        'rgba(70,110,200,.45)',
  'heavy':        'rgba(60,100,190,.45)',
  'hollow':       'rgba(70,110,200,.45)',
  'defeated':     'rgba(80,100,180,.45)',
  'hopeless':     'rgba(70,90,180,.45)',
  'adrift':       'rgba(80,130,210,.45)',
  'drained':      'rgba(90,130,200,.45)',
  'nostalgic':    'rgba(100,130,220,.45)',
  // Happy / positive — green
  'calm':         'rgba(60,200,120,.45)',
  'grateful':     'rgba(70,210,130,.45)',
  'motivated':    'rgba(80,220,140,.45)',
  'hopeful':      'rgba(90,200,130,.45)',
  'present':      'rgba(70,190,120,.45)',
  'luminous':     'rgba(100,220,150,.45)',
  'resolute':     'rgba(80,210,140,.45)',
  'radiant':      'rgba(90,230,150,.45)',
  'elated':       'rgba(100,240,160,.45)',
  'content':      'rgba(70,200,130,.45)',
  'inspired':     'rgba(90,220,150,.45)',
  'sharp':        'rgba(80,215,145,.45)',
  // Middle / mixed — purple or amber
  'tired':        'rgba(160,120,220,.4)',
  'overwhelmed':  'rgba(200,130,80,.4)',
  'restless':     'rgba(180,120,220,.4)',
  'foggy':        'rgba(160,130,200,.4)',
  'tender':       'rgba(200,140,220,.4)',
  'scattered':    'rgba(200,150,80,.4)',
  'irritable':    'rgba(210,140,80,.4)',
};
var ML_MOODS=[
  {n:1, e:'😭',label:'Terrible'},
  {n:2, e:'😞',label:'Very Low'},
  {n:3, e:'😔',label:'Low'},
  {n:4, e:'😕',label:'Meh'},
  {n:5, e:'😐',label:'Neutral'},
  {n:6, e:'🙂',label:'Okay'},
  {n:7, e:'😊',label:'Alright'},
  {n:8, e:'😄',label:'Good'},
  {n:9, e:'😁',label:'Great'},
  {n:10,e:'🤩',label:'Amazing'}
];

var ML_TAG_CATS=[
  {
    id:'low', label:'Low / Hard', color:'rgba(100,140,255,0.7)', emoji:'🌧',
    tags:['sad','depressed','hopeless','defeated','empty','hollow','numb','miserable','heartbroken',
          'grieving','despairing','crushed','lost','broken','helpless','worthless','gloomy','heavy',
          'tearful','sorrowful','melancholy','desolate','adrift','bleak','dark']
  },
  {
    id:'anxious', label:'Anxious / Tense', color:'rgba(255,140,80,0.7)', emoji:'⚡',
    tags:['anxious','nervous','worried','fearful','stressed','panicked','uneasy','tense','on-edge',
          'dread','overwhelmed','frantic','agitated','jittery','restless','insecure','unsettled',
          'racing','apprehensive','wired','scattered','frazzled','exposed','unsafe','shaky']
  },
  {
    id:'tired', label:'Tired / Low Energy', color:'rgba(150,120,200,0.7)', emoji:'🌙',
    tags:['tired','exhausted','drained','foggy','sluggish','lethargic','burnt out','sleepy','fatigued',
          'depleted','heavy','slow','disconnected','flat','zoned out','disengaged','detached',
          'vacant','hollow','weary','spent','unmotivated','apathetic','listless','numb']
  },
  {
    id:'mixed', label:'Mixed / Complex', color:'rgba(180,150,80,0.7)', emoji:'🌤',
    tags:['confused','conflicted','ambivalent','bittersweet','tender','nostalgic','wistful','pensive',
          'reflective','unsure','torn','complicated','turbulent','sensitive','raw','fragile','touchy',
          'irritable','moody','defensive','stubborn','proud','humbled','cautious','ordinary']
  },
  {
    id:'okay', label:'Okay / Neutral', color:'rgba(160,180,160,0.7)', emoji:'☁️',
    tags:['okay','fine','neutral','steady','stable','ordinary','average','so-so','indifferent',
          'calm','settled','balanced','grounded','quiet','composed','collected','patient','measured',
          'resigned','accepting','mellow','subdued','even','unbothered','present']
  },
  {
    id:'good', label:'Good / Positive', color:'rgba(80,210,120,0.7)', emoji:'🌱',
    tags:['happy','content','good','hopeful','peaceful','grateful','relieved','optimistic','light',
          'comfortable','safe','warm','loved','appreciated','seen','supported','connected','close',
          'at ease','joyful','pleased','satisfied','thankful','blessed','fortunate']
  },
  {
    id:'high', label:'High Energy / Great', color:'rgba(255,220,60,0.7)', emoji:'✨',
    tags:['excited','energized','motivated','inspired','confident','proud','unstoppable','radiant',
          'alive','electric','sharp','focused','clear','creative','productive','flow','powerful',
          'elated','ecstatic','thrilled','euphoric','amazing','on fire','luminous','resolved']
  }
];
// Flat array for backward compatibility
var ML_TAGS=[];ML_TAG_CATS.forEach(function(c){c.tags.forEach(function(t){if(ML_TAGS.indexOf(t)<0)ML_TAGS.push(t);});});
// Track which categories are expanded
var mlCatExpanded={};

var mlCurrentTab='log';
var mlSelectedMood=null;
var mlSelectedTags=[];

function mlTab(t){
  mlCurrentTab=t;
  ['log','history'].forEach(function(x){
    var btn=document.getElementById('ml-tab-'+x);
    var panel=document.getElementById('ml-panel-'+x);
    if(btn){btn.style.color=x===t?'#869BAB':'var(--dim)';btn.style.borderColor=x===t?'#869BAB':'var(--dim)';}
    if(panel)panel.style.display=x===t?'':'none';
  });
  if(t==='log')mlRenderLog();
  else mlRenderHistory();
}

function mlMoodColor(n){
  // Smooth gradient: 1=deep blue, 2=orange-blue, 3=amber, 5=yellow, 7=lime, 9-10=green
  // Interpolate between anchor colors based on mood value
  var stops=[
    {v:1,  r:80,  g:120, b:220}, // deep blue (very sad)
    {v:2,  r:255, g:120, b:60},  // orange (low/distressed)
    {v:4,  r:255, g:180, b:30},  // amber
    {v:6,  r:220, g:220, b:50},  // yellow-green
    {v:8,  r:120, g:220, b:60},  // lime
    {v:10, r:0,   g:220, b:120}, // green (great)
  ];
  var clamped=Math.max(1,Math.min(10,n));
  for(var i=0;i<stops.length-1;i++){
    if(clamped<=stops[i+1].v){
      var t=(clamped-stops[i].v)/(stops[i+1].v-stops[i].v);
      var r=Math.round(stops[i].r+(stops[i+1].r-stops[i].r)*t);
      var g=Math.round(stops[i].g+(stops[i+1].g-stops[i].g)*t);
      var b=Math.round(stops[i].b+(stops[i+1].b-stops[i].b)*t);
      return'rgb('+r+','+g+','+b+')';
    }
  }
  return'rgb(0,220,120)';
}

function mlCheckNotice(){
  var el=document.getElementById('ml-notice');
  if(!el)return;
  if(sessionStorage.getItem('ml-notice-dismissed')==='1'){el.innerHTML='';return;}
  var mlData=lsGet('dash_ml',[]);
  if(!mlData.length){el.innerHTML='';return;}
  // Find most recent entry date
  var sorted=mlData.slice().sort(function(a,b){return b.date>a.date?1:-1;});
  var lastDate=sorted[0].date;
  var daysSince=Math.round((new Date()-new Date(lastDate+'T00:00:00'))/(864e5));
  if(daysSince>=3){
    el.innerHTML='<div class="inactivity-notice'+(daysSince>5?' jiggle':'')+'" class="mb-6"><span>&#9650; No mood logged in '+daysSince+' day'+(daysSince!==1?'s':'')+'. Last entry: '+lastDate+'</span><button data-dismiss="ml-notice" style="background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:var(--t-lg);padding:0 2px">&#10005;</button></div>';
  } else {
    el.innerHTML='';
  }
}
function mlRenderLog(){
  mlCheckNotice();
  var el=document.getElementById('ml-panel-log');
  var badge=document.getElementById('ml-badge');
  if(!el)return;
  var today=localDateStr(new Date());
  // today's entries checked below
  if(badge){
    var todayC=mlData.filter(function(e){return e.date===localDateStr(new Date());}).length;
    var avg7=mlData.length?Math.round(mlData.slice(0,14).reduce(function(a,e){return a+e.mood;},0)/Math.min(14,mlData.length)*10)/10:null;
    badge.textContent=(todayC?todayC+'/3 today · ':'')+(avg7?'avg '+avg7:'—');
  }
  var h='';
  // Mood scale
  h+='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-top:10px;margin-bottom:6px">HOW ARE YOU RIGHT NOW?</div>';
  h+='<div class="mood-scale" style="display:flex;flex-direction:column;gap:4px">';
  h+='<div style="display:flex;gap:4px;justify-content:space-between">';
  ML_MOODS.slice(0,5).forEach(function(m){
    var sel=mlSelectedMood===m.n;
    h+='<button class="mood-scale-btn'+(sel?' selected':'')+'" data-mn="'+m.n+'" onclick="mlSelectMood('+m.n+')">';
    h+='<span class="mood-emoji">'+m.e+'</span>';
    h+='<span class="mood-num">'+m.n+'</span>';
    h+='</button>';
  });
  h+='</div>';
  h+='<div style="display:flex;gap:4px;justify-content:space-between">';
  ML_MOODS.slice(5,10).forEach(function(m){
    var sel=mlSelectedMood===m.n;
    h+='<button class="mood-scale-btn'+(sel?' selected':'')+'" data-mn="'+m.n+'" onclick="mlSelectMood('+m.n+')">';
    h+='<span class="mood-emoji">'+m.e+'</span>';
    h+='<span class="mood-num">'+m.n+'</span>';
    h+='</button>';
  });
  h+='</div>';
  h+='</div>';
  // Tags — section grid then flat adjective pool
  h+='<div class="label-dim">WHAT\'S PRESENT?</div>';
  // Section buttons grid
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:10px">';
  ML_TAG_CATS.forEach(function(cat){
    var expanded=!!mlCatExpanded[cat.id];
    var selInCat=cat.tags.filter(function(t){return mlSelectedTags.indexOf(t)>=0;}).length;
    var borderCol=expanded?cat.color.replace('0.7','0.8'):'var(--c-border)';
    var bgCol=expanded?cat.color.replace('0.7','0.12'):'transparent';
    var textCol=expanded?'var(--text)':'var(--dim)';
    h+='<div data-mlcat="'+cat.id+'" onclick="mlCatExpanded[this.dataset.mlcat]=!mlCatExpanded[this.dataset.mlcat];mlRenderLog()" style="display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid '+borderCol+';background:'+bgCol+';cursor:pointer;user-select:none">';
    h+='<span style="font-size:var(--t-sub)">'+cat.emoji+'</span>';
    h+='<div class="flex-1">';
    h+='<div style="font-size:var(--t-sm);color:'+textCol+';line-height:1.3">'+cat.label+'</div>';
    if(selInCat>0)h+='<div style="font-size:var(--t-xs);color:'+cat.color.replace('0.7','0.9')+'">'+selInCat+' selected</div>';
    h+='</div>';
    h+='</div>';
  });
  h+='</div>';
  // Flat adjective pool from active sections
  var activeCats=ML_TAG_CATS.filter(function(c){return !!mlCatExpanded[c.id];});
  if(activeCats.length){
    h+='<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;padding:10px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02)">';
    activeCats.forEach(function(cat){
      cat.tags.forEach(function(tag){
        var sel=mlSelectedTags.indexOf(tag)>=0;
        var borderCol=sel?cat.color.replace('0.7','0.8'):'var(--c-border)';
        var bgCol=sel?cat.color.replace('0.7','0.2'):'transparent';
        var textCol=sel?'var(--text)':'rgba(255,255,255,.45)';
        h+='<span data-tag="'+tag+'" onclick="mlToggleTag(this.dataset.tag)" style="font-size:var(--t-sm);padding:4px 10px;border:1px solid '+borderCol+';background:'+bgCol+';color:'+textCol+';cursor:pointer">'+tag+'</span>';
      });
    });
    h+='</div>';
  } else {
    h+='<div class="mb-12"></div>';
  }
  // Note
  h+='<textarea class="wr-inp" id="ml-note" placeholder="Write anything... or nothing. You don&apos;t have to explain yourself." style="min-height:72px;font-size:var(--t-md)"></textarea>';
  // Affirmation if low mood selected
  if(mlSelectedMood!==null&&mlSelectedMood<=3){
    h+='<div style="padding:10px;border-left:2px solid rgba(134,155,171,.3);background:rgba(83,104,120,.08);margin-bottom:10px;font-size:var(--t-md);color:var(--text);line-height:1.6">';
    var affirmations=[
      "This feeling is temporary. It will shift.",
      "You don't have to feel better right now. Just stay.",
      "Low moments are part of being human, not a flaw.",
      "You showed up today. That is enough.",
      "Be gentle with yourself right now.",
      "Feelings are weather. They pass.",
      "You've gotten through hard days before."
    ];
    h+=affirmations[new Date().getDay()%affirmations.length];
    h+='</div>';
  }
  // Resources if very low
  if(mlSelectedMood===1){
    h+='<div style="padding:10px;border:1px solid rgba(122,80,89,.3);background:rgba(122,80,89,.06);margin-bottom:10px;font-size:var(--t-base);color:var(--text);line-height:1.7">';
    h+='<div style="font-size:var(--t-xs);color:rgba(170,100,110,.8);letter-spacing:1px;margin-bottom:6px">IF YOU NEED SUPPORT</div>';
    h+='Crisis Text Line: Text HOME to 741741<br>';
    h+='988 Suicide &amp; Crisis Lifeline: Call or text 988<br>';
    h+='<span class="dim-10">You are not alone in this.</span>';
    h+='</div>';
  }
  h+='<button onclick="mlSaveEntry()" style="width:100%;padding:9px;background:transparent;border:1px solid rgba(134,155,171,.3);color:#869BAB;font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:2px">SAVE</button>';
  var todayCount=mlData.filter(function(e){return e.date===today;}).length;
  if(todayCount>0&&todayCount<3){
    h+='<div style="font-size:var(--t-sm);color:var(--dim);text-align:center;margin-top:8px">'+todayCount+' of 3 logs today. '+( todayCount===1?'2 more':'1 more')+' allowed.</div>';
  } else if(todayCount>=3){
    h+='<div style="font-size:var(--t-sm);color:var(--dim);text-align:center;margin-top:8px">3 of 3 logs done for today.</div>';
  }
  el.innerHTML=h;
  // Disable save button if at 3/day limit
  var todayCount2=mlData.filter(function(e){return e.date===today;}).length;
  var saveBtn=el.querySelector('button[onclick="mlSaveEntry()"]');
  if(saveBtn&&todayCount2>=3){saveBtn.disabled=true;saveBtn.style.opacity='.4';saveBtn.style.cursor='not-allowed';}
  el.querySelectorAll('[data-mlcat]').forEach(function(b){
    b.onclick=function(){
      var cid=this.dataset.mlcat;
      mlCatExpanded[cid]=!mlCatExpanded[cid];
      mlRenderLog();
    };
  });
  el.querySelectorAll('[data-tag]').forEach(function(b){
    b.onclick=function(){mlToggleTag(this.dataset.tag);};
  });
}

function mlSelectMood(n){
  mlSelectedMood=n;
  mlRenderLog();
  // Small haptic hint: scroll note into view
  setTimeout(function(){var el=document.getElementById('ml-note');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});},100);
}

function mlToggleTag(tag){
  var idx=mlSelectedTags.indexOf(tag);
  if(idx>=0)mlSelectedTags.splice(idx,1); else mlSelectedTags.push(tag);
  mlRenderLog();
}

function mlSaveEntry(){
  if(mlSelectedMood===null){
    var btns=document.querySelectorAll('.mood-scale-btn');
    btns.forEach(function(b){b.style.animation='none';setTimeout(function(){b.style.animation='';},100);});
    return;
  }
  var noteEl=document.getElementById('ml-note');
  var today=localDateStr(new Date());
  var entry={
    id:Date.now(),
    date:today,
    mood:mlSelectedMood,
    tags:mlSelectedTags.slice(),
    note:noteEl?noteEl.value.trim():'',
    ts:new Date().toISOString()
  };
  // Allow up to 3 logs per day
  var todayEntries=mlData.filter(function(e){return e.date===today;});
  if(todayEntries.length>=3){return;} // already at limit
  mlData.unshift(entry);
  if(mlData.length>1095)mlData=mlData.slice(0,1095); // 3/day * 365
  mlSave();
  mlSelectedMood=null;
  mlSelectedTags=[];
  mlTab('history');
}

function mlRenderHistory(){
  var el=document.getElementById('ml-panel-history');
  if(!el)return;
  if(!mlData.length){el.innerHTML='<div class="empty-msg">No entries yet.</div>';return;}

  // ── SVG line chart — last 30 days avg mood ──
  var chartDays=30;
  var byDate={};
  mlData.forEach(function(e){if(!byDate[e.date])byDate[e.date]=[];byDate[e.date].push(e);});
  // Build last 30 days array
  var chartPts=[];
  for(var di=chartDays-1;di>=0;di--){
    var cd=new Date();cd.setDate(cd.getDate()-di);
    var dk=cd.toISOString().slice(0,10);
    if(byDate[dk]){
      var avg=byDate[dk].reduce(function(s,e){return s+e.mood;},0)/byDate[dk].length;
      chartPts.push({d:dk,v:avg,i:chartDays-1-di});
    }
  }
  var W=280,H=80,padL=24,padR=6,padT=8,padB=18;
  var chartH='';
  if(chartPts.length>=2){
    var minV=1,maxV=10,range=9; // fixed 1-10 scale for consistent y axis
    function cx(pt){return padL+(W-padL-padR)*(pt.i/(chartDays-1));}
    function cy(v){return padT+(H-padT-padB)*(1-(v-minV)/range);}
    // Area fill
    var areaPath='M'+cx(chartPts[0])+','+( H-padB);
    chartPts.forEach(function(p){areaPath+=' L'+cx(p)+','+cy(p.v);});
    areaPath+=' L'+cx(chartPts[chartPts.length-1])+','+(H-padB)+' Z';
    // Line
    var linePts=chartPts.map(function(p){return cx(p)+','+cy(p.v);}).join(' ');
    // Dots — colored by mood value
    var dots=chartPts.map(function(p){
      var col=mlMoodColor(p.v);
      return '<circle cx="'+cx(p)+'" cy="'+cy(p.v)+'" r="3" fill="'+col+'" opacity="0.9" filter="url(#dotglow)"/>';
    }).join('');
    // Colored line segments between dots
    var segLines='';
    for(var si=0;si<chartPts.length-1;si++){
      var p1=chartPts[si],p2=chartPts[si+1];
      var midV=(p1.v+p2.v)/2;
      var segCol=mlMoodColor(midV);
      segLines+='<line x1="'+cx(p1)+'" y1="'+cy(p1.v)+'" x2="'+cx(p2)+'" y2="'+cy(p2.v)+'" stroke="'+segCol+'" stroke-width="1.5" stroke-opacity="0.7"/>';
    }
    // Avg line
    var avgAll=chartPts.reduce(function(s,p){return s+p.v;},0)/chartPts.length;
    var avgY=cy(avgAll);
    // Y axis ticks: 2, 4, 6, 8, 10
    var yTicks='';
    [2,4,6,8,10].forEach(function(v){
      var y=cy(v);
      yTicks+='<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="var(--c-ghost)" stroke-width="1"/>';
      yTicks+='<text x="'+(padL-3)+'" y="'+(y+3)+'" fill="rgba(134,155,171,.6)" font-size="7" text-anchor="end">'+v+'</text>';
    });
    // X axis ticks: day labels at 0, 10, 20, 29
    var xTicks='';
    var now2=new Date();
    [29,19,9,0].forEach(function(daysAgo){
      var xIdx=chartDays-1-daysAgo;
      var xPos=padL+(W-padL-padR)*(xIdx/(chartDays-1));
      var d2=new Date(now2);d2.setDate(now2.getDate()-daysAgo);
      var lbl=daysAgo===0?'today':(d2.getMonth()+1)+'/'+(d2.getDate());
      xTicks+='<line x1="'+xPos+'" y1="'+(H-padB)+'" x2="'+xPos+'" y2="'+(H-padB+3)+'" stroke="rgba(134,155,171,.4)" stroke-width="1"/>';
      xTicks+='<text x="'+xPos+'" y="'+(H-padB+10)+'" fill="rgba(134,155,171,.6)" font-size="7" text-anchor="middle">'+lbl+'</text>';
    });
    chartH='<div class="mb-12">';
    chartH+='<div class="label-dim-xs">MOOD — LAST 30 DAYS</div>';
    chartH+='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:'+H+'px;display:block">';
    chartH+=yTicks;
    // Y axis line
    chartH+='<line x1="'+padL+'" y1="'+padT+'" x2="'+padL+'" y2="'+(H-padB)+'" stroke="rgba(134,155,171,.2)" stroke-width="1"/>';
    // X axis line
    chartH+='<line x1="'+padL+'" y1="'+(H-padB)+'" x2="'+(W-padR)+'" y2="'+(H-padB)+'" stroke="rgba(134,155,171,.2)" stroke-width="1"/>';
    chartH+='<defs><filter id="dotglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    chartH+='<path d="'+areaPath+'" fill="rgba(134,155,171,.07)"/>';
    chartH+=segLines;
    chartH+=dots;
    chartH+='<line x1="'+padL+'" y1="'+avgY+'" x2="'+(W-padR)+'" y2="'+avgY+'" stroke="rgba(134,155,171,.35)" stroke-width="1" stroke-dasharray="3,3"/>';
    chartH+='<text x="'+(W-padR-2)+'" y="'+(avgY-2)+'" fill="rgba(134,155,171,.5)" font-size="7" text-anchor="end">avg '+Math.round(avgAll*10)/10+'</text>';
    chartH+=xTicks;
    chartH+='</svg>';
    chartH+='</div>';
  }

  // Group entries by date
  byDate={};
  mlData.forEach(function(e){
    if(!byDate[e.date])byDate[e.date]=[];
    byDate[e.date].push(e);
  });
  var dates=Object.keys(byDate).sort().reverse();
  var h=chartH;
  dates.slice(0,60).forEach(function(d){
    var entries=byDate[d].sort(function(a,b){return (a.ts||'')>(b.ts||'')?1:-1;});
    var avgMood=Math.round(entries.reduce(function(s,e){return s+e.mood;},0)/entries.length*10)/10;
    var avgEmoji=ML_MOODS[Math.round(avgMood)-1]?ML_MOODS[Math.round(avgMood)-1].e:'';
    h+='<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07)">';
    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
    h+='<span class="text-11">'+d+'</span>';
    h+='<span class="dim-11">'+avgEmoji+' avg '+avgMood+'</span>';
    h+='</div>';
    entries.forEach(function(e){
      var timeLabel='';
      var timeExact='';
      if(e.ts){
        var t=new Date(e.ts);
        var hr=t.getHours();
        timeLabel=hr<6?'Night':hr<12?'Morning':hr<17?'Afternoon':hr<20?'Evening':'Night';
        timeExact=t.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
      }
      h+='<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-left:2px solid rgba(134,155,171,.2);padding-left:8px;margin-bottom:4px">';
      if(timeLabel)h+='<div style="white-space:nowrap;min-width:60px;padding-top:2px"><div class="dim-9">'+timeLabel+'</div><div style="font-size:var(--t-xs);color:rgba(134,155,171,.5)">'+timeExact+'</div></div>';
      h+='<div style="flex:1">';
      h+='<span style="font-size:var(--t-body)">'+ML_MOODS[e.mood-1].e+'</span> <span class="text-12">'+e.mood+'/10</span>';
      if(e.tags&&e.tags.length)h+='<div style="font-size:var(--t-sm);color:var(--dim);margin-top:3px">'+e.tags.join(', ')+'</div>';
      if(e.note)h+='<div style="font-size:var(--t-base);color:var(--text);margin-top:4px;font-style:italic;line-height:1.5">'+e.note+'</div>';
      h+='</div></div>';
    });
    h+='</div>';
  });
  el.innerHTML=h;
}

function mlExport(){
  if(!mlData||!mlData.length){alert('No mood entries to export.');return;}
  var lines=['MOOD LOG EXPORT','Generated: '+new Date().toLocaleDateString(),'='.repeat(40),''];
  var sum=0;
  mlData.forEach(function(e){
    var m=ML_MOODS[e.mood-1];
    lines.push('['+e.date+'] '+(m?m.e+' ':'')+e.mood+'/10'+(m?' — '+m.label:''));
    if(e.tags&&e.tags.length)lines.push('  Feelings: '+e.tags.join(', '));
    if(e.note)lines.push('  Note: '+e.note);
    lines.push('');
    sum+=e.mood;
  });
  var avg=Math.round(sum/mlData.length*10)/10;
  lines.push('TOTAL ENTRIES: '+mlData.length);
  lines.push('AVERAGE MOOD: '+avg+'/10');
  downloadTxt(lines.join('\n'),'mood-log.txt');
}

HELP_CONTENT['ml']={
  title:"MOOD LOG",
  body:"A private, judgment-free place to track how you're doing over time. Not a diagnostic tool — just a mirror.<br><br><strong>Why track mood?</strong> Because feelings are slippery. You can spend weeks in a low period and not fully register it until you look back. Logging creates a record that your memory alone cannot provide. You start to see patterns: which days are harder, what conditions correlate with better or worse days, whether things are trending up or down over weeks.<br><br><strong>The scale (1–7)</strong> is intentionally simple. 1 is very low, 7 is great, 4 is neutral. Don't overthink it — go with your first instinct.<br><br><strong>Tags</strong> help you identify what emotions are present without requiring full sentences. Sometimes 'lonely + foggy' is all you can manage, and that's valid data.<br><br><strong>The note field</strong> is optional. Write nothing, or write everything. Both are fine. Over time, the notes become a kind of journal — evidence that you were here, trying.<br><br><strong>The chart</strong> shows your last 14 days at a glance. Taller bars = better days. Gaps = days you didn't log (that's okay).<br><br>If you're going through something hard: you are not broken. Depression lies — it tells you this is permanent and that nothing helps. The data often tells a different story. Keep logging."
};

setTimeout(function(){mlTab('log');},650);

// ── CARD CATEGORIES ──
var CARD_CATS=[
  {id:'time',   label:'⏰ Time',   icon:'⏰', cards:['clock','prayer','schedule','calendar']},
  {id:'islam',  label:'🕌 Islam',  icon:'🕌', cards:['prayer-tracker','quran-tracker','juz-amma','islamic-topics','quran-cards']},
  {id:'focus',  label:'⏱ Focus',  icon:'⏱', cards:['pomodoro','energy-map','goals','writers-den','decision-log']},
  {id:'life',   label:'🌱 Life',   icon:'🌱', cards:['todo','notes','weekly-review','weekly-moments','mood-log','life-streaks','weekend-warrior']},
  {id:'info',   label:'📊 Info',   icon:'📊', cards:['weather','stocks','meals','meal-prep','birthdays','pickleball','season-traditions','books','ebook-library','bookmarks','raft']},
  {id:'other',  label:'⚙ Other',  icon:'⚙',  cards:['settings','s-tracker']}
];

function cardCategory(id){
  for(var i=0;i<CARD_CATS.length;i++){
    if(CARD_CATS[i].cards.indexOf(id)>=0)return CARD_CATS[i];
  }
  return CARD_CATS[CARD_CATS.length-1];
}

// ── FEATURE 1: CATEGORY NAV BAR ──
function updatePinSettingsVisibility(){
  var wrap=document.getElementById('pin-settings-wrap');
  if(!wrap)return;
  var on=getSetting('pinnedCards');
  wrap.style.display=on?'block':'none';
  if(on)renderPinSettings();
}

function applyCategoryNav(){
  var bar=document.getElementById('cat-nav');
  if(!bar)return;
  var on=getSetting('categoryNav');
  bar.style.display=on?'block':'none';
  if(!on)return;
  var h='';
  CARD_CATS.forEach(function(cat){
    h+='<button data-catid="'+cat.id+'" onclick="catNavJump(this.dataset.catid)" style="display:inline-block;padding:8px 14px;background:transparent;border:none;color:var(--dim);font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:1px;border-bottom:2px solid transparent;transition:all .15s" id="catnav-'+cat.id+'">'+cat.label+'</button>';
  });
  bar.innerHTML=h;
}

function catNavJump(catId){
  // Highlight active
  CARD_CATS.forEach(function(c){
    var btn=document.getElementById('catnav-'+c.id);
    if(btn){btn.style.color=c.id===catId?'var(--text)':'var(--dim)';btn.style.borderBottomColor=c.id===catId?'var(--cg)':'transparent';}
  });
  // If pinned cards on — open overflow if needed
  if(getSetting('pinnedCards')){
    var overflow=document.getElementById('pinned-overflow');
    var cat=CARD_CATS.find(function(c){return c.id===catId;});
    var pinnedIds=getPinnedIds();
    var needsOverflow=cat&&cat.cards.some(function(id){return pinnedIds.indexOf(id)<0;});
    if(needsOverflow&&overflow&&overflow.style.display==='none'){
      overflow.style.display='';
      var btn=document.getElementById('pinned-toggle-btn');
      if(btn)btn.textContent='▲ SHOW LESS';
    }
  }
  // Find first visible card in category
  var cat=CARD_CATS.find(function(c){return c.id===catId;});
  if(!cat)return;
  var found=null;
  var grid=document.getElementById('grid');
  var tiles=grid.querySelectorAll('[data-id]');
  for(var i=0;i<tiles.length;i++){
    var tid=tiles[i].dataset.id;
    if(cat.cards.indexOf(tid)>=0&&tiles[i].offsetParent!==null){
      found=tiles[i];break;
    }
  }
  if(found){
    var topOffset=found.getBoundingClientRect().top+window.scrollY;
    var headerH=document.getElementById('topbar').offsetHeight+(getSetting('categoryNav')?document.getElementById('cat-nav').offsetHeight:0)+10;
    window.scrollTo({top:topOffset-headerH,behavior:'smooth'});
  }
}

// ── FEATURE 2: SECTION HEADERS ──
function applySectionHeaders(){
  // Remove existing headers first
  document.querySelectorAll('.grid-section-header').forEach(function(el){el.remove();});
  if(!getSetting('sectionHeaders'))return;
  var grid=document.getElementById('grid');
  var tiles=Array.from(grid.querySelectorAll('[data-id]'));
  var lastCat=null;
  tiles.forEach(function(tile){
    var cat=cardCategory(tile.dataset.id);
    if(cat&&cat.id!==lastCat){
      lastCat=cat.id;
      var hdr=document.createElement('div');
      hdr.className='grid-section-header';
      hdr.dataset.cat=cat.id;
      hdr.style.cssText='grid-column:1/-1;padding:8px 4px 4px;font-size:var(--t-xs);letter-spacing:3px;color:var(--dim);border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:2px;font-family:monospace;opacity:.7;user-select:none';
      hdr.textContent='── '+cat.label.toUpperCase()+' ──';
      grid.insertBefore(hdr,tile);
    }
  });
}

// ── FEATURE 3: PINNED CARDS ──
var DEFAULT_PINS=['clock','prayer','prayer-tracker','todo','pomodoro','quran-tracker'];

function getPinnedIds(){
  return JSON.parse(localStorage.getItem('dash_pins')||JSON.stringify(DEFAULT_PINS));
}
function savePinnedIds(pins){lsSet('dash_pins',pins);}

function applyPinnedCards(){
  // Remove existing overflow wrapper
  var existing=document.getElementById('pinned-overflow');
  if(existing){
    // Move children back to grid before removing wrapper
    var grid=document.getElementById('grid');
    while(existing.firstChild)grid.appendChild(existing.firstChild);
    existing.remove();
  }
  var toggle=document.getElementById('pinned-toggle-btn');
  if(toggle)toggle.remove();
  var sep=document.getElementById('pinned-separator');
  if(sep)sep.remove();

  if(!getSetting('pinnedCards'))return;

  var grid=document.getElementById('grid');
  var allTiles=Array.from(grid.querySelectorAll('[data-id]'));
  var pinnedIds=getPinnedIds();

  // Build overflow div
  var overflow=document.createElement('div');
  overflow.id='pinned-overflow';
  overflow.style.cssText='display:none;contents:"";grid-column:1/-1;display:none';
  // Actually we need a different approach - wrap unpinned tiles
  // Create a collapsible section for unpinned
  var unpinnedWrapper=document.createElement('div');
  unpinnedWrapper.id='pinned-overflow';
  unpinnedWrapper.style.cssText='display:none;grid-column:1/-1;width:100%';

  // Create inner grid for unpinned
  var innerGrid=document.createElement('div');
  innerGrid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr));gap:14px;width:100%';
  unpinnedWrapper.appendChild(innerGrid);

  // Create separator + toggle button
  var sep=document.createElement('div');
  sep.id='pinned-separator';
  sep.style.cssText='grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer';
  var unpinnedCount=allTiles.filter(function(t){return pinnedIds.indexOf(t.dataset.id)<0&&t.dataset.id!=='settings';}).length;
  sep.innerHTML='<div style="flex:1;height:1px;background:var(--c-border)"></div>'
    +'<button id="pinned-toggle-btn" onclick="togglePinnedOverflow()" style="font-size:var(--t-sm);padding:5px 14px;background:transparent;border:1px solid var(--c-faint);color:var(--dim);font-family:monospace;cursor:pointer;letter-spacing:1px;white-space:nowrap">▼ '+unpinnedCount+' MORE CARDS</button>'
    +'<div style="flex:1;height:1px;background:var(--c-border)"></div>';

  // Move unpinned tiles to innerGrid
  allTiles.forEach(function(tile){
    var id=tile.dataset.id;
    if(id==='settings')return; // settings always visible
    if(pinnedIds.indexOf(id)<0){
      innerGrid.appendChild(tile);
    }
  });

  // Insert separator then overflow after last pinned tile
  // Find last pinned tile in grid
  var pinnedTiles=Array.from(grid.querySelectorAll('[data-id]')).filter(function(t){return pinnedIds.indexOf(t.dataset.id)>=0||t.dataset.id==='settings';});
  var lastPinned=pinnedTiles[pinnedTiles.length-1];
  if(lastPinned){
    grid.insertBefore(sep, lastPinned.nextSibling||null);
    grid.insertBefore(unpinnedWrapper, sep.nextSibling||null);
  } else {
    grid.appendChild(sep);
    grid.appendChild(unpinnedWrapper);
  }

  // Apply section headers to unpinned too if that setting is on
  if(getSetting('sectionHeaders'))applySectionHeaders();
}

function togglePinnedOverflow(){
  var overflow=document.getElementById('pinned-overflow');
  var btn=document.getElementById('pinned-toggle-btn');
  if(!overflow)return;
  var isHidden=overflow.style.display==='none'||overflow.style.display==='';
  overflow.style.display=isHidden?'block':'none';
  if(btn){
    var count=overflow.querySelectorAll('[data-id]').length;
    btn.textContent=isHidden?'▲ SHOW LESS':'▼ '+count+' MORE CARDS';
  }
  if(isHidden&&getSetting('sectionHeaders'))applySectionHeaders();
}

function renderPinSettings(){
  var el=document.getElementById('pin-settings-body');
  if(!el)return;
  var pinnedIds=getPinnedIds();
  var allIds=Array.from(document.querySelectorAll('#grid [data-id]')).map(function(t){return t.dataset.id;}).filter(function(id){return id!=='settings';});
  var NAMES=typeof TILE_NAMES!=='undefined'?TILE_NAMES:{};
  var h='<div style="font-size:var(--t-sm);color:var(--dim);margin-bottom:8px">Tap to pin/unpin. Pinned cards always show — rest collapse under a ▼ button.</div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
  allIds.forEach(function(id){
    var pinned=pinnedIds.indexOf(id)>=0;
    var name=NAMES[id]||id;
    h+='<span data-pid="'+id+'" onclick="togglePin(this.dataset.pid)" style="font-size:var(--t-sm);padding:4px 10px;border:1px solid '+(pinned?'var(--cg)':'var(--c-faint)')+';color:'+(pinned?'var(--cg)':'var(--dim)')+';cursor:pointer;transition:all .15s;letter-spacing:.5px">'+name+'</span>';
  });
  h+='</div>';
  h+='<button onclick="savePinnedIds('+JSON.stringify(DEFAULT_PINS)+');applyPinnedCards();renderPinSettings();" style="margin-top:10px;font-size:var(--t-sm);padding:4px 10px;border:1px solid rgba(255,255,255,.12);color:var(--dim);background:transparent;cursor:pointer">reset to default</button>';
  el.innerHTML=h;
}

function togglePin(id){
  var pins=getPinnedIds();
  var idx=pins.indexOf(id);
  if(idx>=0)pins.splice(idx,1); else pins.push(id);
  savePinnedIds(pins);
  applyPinnedCards();
  renderPinSettings();
}

// ── RAPID SORT MODE ──
var _sortActive = false;
var _sortSelection = []; // array of tile ids in chosen order

var SORT_ICONS={
  'clock':'🕐','prayer':'🕌','weather':'🌤','stocks':'📈','todo':'✅',
  'meals':'🍽','calendar':'📅','notes':'📝','schedule':'🚗','books':'📚',
  'birthdays':'🎂','pickleball':'🏓','prayer-tracker':'📿','quran-tracker':'📖',
  'juz-amma':'📜','islamic-topics':'🌙','goals':'🎯','pomodoro':'⏱',
  'raft':'🛶','day-blocks':'🟧','workout-log':'💪','quick-nav':'⚡','quran-cards':'🃏','for-akhira':'🌙','gratitude-log':'🌿','dua-card':'🤲','rent-payments':'🏠','settings':'⚙','bookmarks':'🔖','ebook-library':'📱',
  'meal-prep':'🥗','writers-den':'✍','weekend-warrior':'🏕',
  'season-traditions':'🍂','weekly-review':'📋','decision-log':'⚖',
  'energy-map':'⚡','life-streaks':'🔥','weekly-moments':'✨',
  's-tracker':'🌿','mood-log':'🌊','quran-cards':'🃏'
};

function sortModeToggle(){
  if(_sortActive) sortModeExit();
  else sortModeEnter();
}

function sortModeEnter(){
  _sortActive=true;
  _sortSelection=[];

  // Flatten grid: remove section headers, pinned separator/overflow wrappers
  // and move all real tiles back to root #grid
  var grid=document.getElementById('grid');
  // Remove non-tile elements (section headers, separators, overflow wrappers)
  Array.from(grid.children).forEach(function(child){
    if(!child.dataset||!child.dataset.id){
      // Move any [data-id] tiles out of this wrapper first
      Array.from(child.querySelectorAll('[data-id]')).forEach(function(t){
        grid.insertBefore(t, child);
      });
      child.remove();
    }
  });
  // Also grab any tiles that ended up in nested wrappers elsewhere
  Array.from(document.querySelectorAll('[data-id]')).forEach(function(t){
    if(t.parentElement!==grid && !t.closest('#sort-overlay')){
      grid.appendChild(t);
    }
  });

  var btn=document.getElementById('sort-mode-btn');
  if(btn)btn.classList.add('active');

  // Build mini card grid from real tiles
  var tiles=Array.from(grid.querySelectorAll('[data-id]'));
  var NAMES=typeof TILE_NAMES!=='undefined'?TILE_NAMES:{};
  var h='';
  tiles.forEach(function(tile){
    var id=tile.dataset.id;
    var icon=SORT_ICONS[id]||'📦';
    var name=NAMES[id]||id;
    h+='<div class="sort-card" data-sortid="'+id+'" onclick="sortCardTap(this,this.dataset.sortid)">'
      +'<div class="sort-badge" id="sbadge-'+id+'"></div>'
      +'<div class="sort-card-icon">'+icon+'</div>'
      +'<div class="sort-card-name">'+name+'</div>'
      +'</div>';
  });

  var sortGrid=document.getElementById('sort-grid');
  if(sortGrid)sortGrid.innerHTML=h;

  // Show overlay with animation
  var overlay=document.getElementById('sort-overlay');
  overlay.style.display='flex';
  overlay.style.opacity='0';
  overlay.style.transform='scale(1.04)';
  overlay.style.transition='';
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      overlay.style.transition='opacity .22s ease, transform .22s ease';
      overlay.style.opacity='1';
      overlay.style.transform='scale(1)';
    });
  });

  sortUpdateHint();
}

function sortCardTap(el,id){
  var idx=_sortSelection.indexOf(id);
  if(idx>=0){
    // Deselect — animate out then remove
    el.classList.add('sort-deselecting');
    setTimeout(function(){
      el.classList.remove('sort-deselecting','sort-selected');
      _sortSelection.splice(idx,1);
      sortRenumberBadges();
      sortUpdateHint();
    },150);
  } else {
    // Select
    _sortSelection.push(id);
    el.classList.add('sort-selected');
    // Pop badge in
    var badge=document.getElementById('sbadge-'+id);
    if(badge){
      badge.textContent=_sortSelection.length;
      requestAnimationFrame(function(){badge.classList.add('visible');});
    }
    // Pulse the card
    el.style.transform='scale(1.12)';
    setTimeout(function(){el.style.transform='';},180);
    sortUpdateHint();
  }
}

function sortRenumberBadges(){
  // Update all badge numbers after a deselect
  var allCards=document.querySelectorAll('.sort-card');
  allCards.forEach(function(card){
    var id=card.dataset.sortid;
    var badge=document.getElementById('sbadge-'+id);
    if(!badge)return;
    var idx=_sortSelection.indexOf(id);
    if(idx>=0){
      badge.textContent=idx+1;
      badge.classList.add('visible');
      card.classList.add('sort-selected');
    } else {
      badge.textContent='';
      badge.classList.remove('visible');
      card.classList.remove('sort-selected');
    }
  });
}

function sortUpdateHint(){
  var hint=document.getElementById('sort-hint');
  var applyBtn=document.getElementById('sort-apply-btn');
  var n=_sortSelection.length;
  if(hint){
    if(n===0) hint.textContent='Tap cards in the order you want them. Unselected follow after.';
    else hint.textContent=n+' selected — tap more to extend, re-tap to deselect.';
  }
  if(applyBtn){
    applyBtn.disabled=n===0;
    applyBtn.style.opacity=n===0?'.4':'1';
  }
}

function sortModeClear(){
  _sortSelection=[];
  var allCards=document.querySelectorAll('.sort-card');
  allCards.forEach(function(card){
    card.classList.remove('sort-selected','sort-deselecting');
    var badge=document.getElementById('sbadge-'+card.dataset.sortid);
    if(badge){badge.textContent='';badge.classList.remove('visible');}
  });
  sortUpdateHint();
}

function sortModeApply(){
  if(!_sortSelection.length)return;

  // Build new order: selected first (in tap order), then unselected (in current grid order)
  // Collect all tiles regardless of pinned/overflow nesting
  var allTiles=Array.from(document.querySelectorAll('[data-id]')).filter(function(t){return t.closest('#sort-overlay')===null;});
  // Ensure all tiles are in root grid before reordering
  var grid=document.getElementById('grid');
  allTiles.forEach(function(t){if(t.parentElement!==grid)grid.appendChild(t);});
  allTiles=Array.from(grid.querySelectorAll('[data-id]'));
  var allIds=allTiles.map(function(t){return t.dataset.id;});
  var unselected=allIds.filter(function(id){return _sortSelection.indexOf(id)<0;});
  var newOrder=_sortSelection.concat(unselected);

  // Flash selected cards green before closing
  _sortSelection.forEach(function(id){
    var card=document.querySelector('.sort-card[data-sortid="'+id+'"]');
    if(card){
      card.style.background='rgba(0,255,136,.25)';
      card.style.borderColor='var(--cg)';
    }
  });

  setTimeout(function(){
    // Apply order to real grid
    newOrder.forEach(function(id){
      var tile=grid.querySelector('[data-id="'+id+'"]');
      if(tile)grid.appendChild(tile);
    });
    // Save
    tileOrder=newOrder;
    lsSet('dash_tile_order',tileOrder);
    // Re-apply features that depend on order
    if(getSetting('sectionHeaders'))applySectionHeaders();
    if(getSetting('pinnedCards'))applyPinnedCards();
    sortModeExit();
    // Confetti burst
    for(var i=0;i<6;i++)(function(d){setTimeout(function(){confetti(Math.random()*window.innerWidth,Math.random()*window.innerHeight*.5,'#00ff88');},d);})(i*80);
  },280);
}

function sortModeExit(){
  _sortActive=false;
  _sortSelection=[];
  var btn=document.getElementById('sort-mode-btn');
  if(btn)btn.classList.remove('active');
  var overlay=document.getElementById('sort-overlay');
  if(overlay){
    overlay.style.transition='opacity .2s ease, transform .2s ease';
    overlay.style.opacity='0';
    overlay.style.transform='scale(1.03)';
    setTimeout(function(){
      overlay.style.display='none';
      overlay.style.transition='';
      overlay.style.transform='';
    },220);
  }
}

function applySnapToCard(){
  window._snapToCardEnabled=getSetting('snapToCard');
  if(getSetting('snapToCard')){
    if(!window._snapHandler){
      var startY=0;var startScroll=0;var snapping=false;
      window._snapHandler=function(e){
        if(e.touches)startY=e.touches[0].clientY;
        startScroll=window.scrollY;
      };
      window._snapMoveHandler=function(e){
        if(snapping)return;
        var curY=e.touches?e.touches[0].clientY:e.clientY;
        var dy=curY-startY;
        if(Math.abs(dy)<20)return;
        var dir=dy>0?-1:1; // swipe down (dy>0) = go to prev card, up = next
        snapping=true;
        var tiles=Array.from(document.querySelectorAll('#grid [data-id]')).filter(function(t){return t.offsetParent!==null;});
        var topbar=document.getElementById('topbar');
        var catNav=document.getElementById('cat-nav');
        var headerH=(topbar?topbar.offsetHeight:56)+(catNav&&catNav.style.display!=='none'?catNav.offsetHeight:0)+8;
        var best=null;
        if(dir>0){
          // Find next card below current scroll
          for(var i=0;i<tiles.length;i++){
            var top=tiles[i].getBoundingClientRect().top+window.scrollY-headerH;
            if(top>window.scrollY+10){best=top;break;}
          }
        } else {
          // Find prev card above
          for(var i=tiles.length-1;i>=0;i--){
            var top=tiles[i].getBoundingClientRect().top+window.scrollY-headerH;
            if(top<window.scrollY-10){best=top;break;}
          }
        }
        if(best!==null){
          window.scrollTo({top:Math.max(0,best),behavior:'smooth'});
        }
        setTimeout(function(){snapping=false;},600);
      };
      document.addEventListener('touchstart',window._snapHandler,{passive:true});
      document.addEventListener('touchmove',window._snapMoveHandler,{passive:true});
    }
  } else {
    if(window._snapHandler){
      document.removeEventListener('touchstart',window._snapHandler);
      document.removeEventListener('touchmove',window._snapMoveHandler);
      window._snapHandler=null;window._snapMoveHandler=null;
    }
  }
}

function showToast(msg){
  var t=document.getElementById('drag-toast');
  if(!t){t=document.createElement('div');t.id='drag-toast';t.style.cssText='position:fixed;bottom:30%;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(0,0,0,.85);color:#fff;font-family:monospace;font-size:var(--t-lg);padding:10px 20px;border-radius:3px;z-index:9999;pointer-events:none;opacity:0;transition:opacity .2s,transform .2s;letter-spacing:1px;white-space:nowrap;border:1px solid rgba(255,255,255,.2)';document.body.appendChild(t);}
  t.textContent=msg;
  t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(t._to);
  t._to=setTimeout(function(){t.style.opacity='0';t.style.transform='translateX(-50%) translateY(10px)';},2000);
}

// ── MILESTONE / DAYS UNTIL ──
var milData=JSON.parse(localStorage.getItem('dash_mil')||'{"birthday":null,"target":40,"goals":[]}');
function milSave(){lsSet('dash_mil',milData);}

function milDaysUntil(){
  if(!milData.birthday)return null;
  var bday=new Date(milData.birthday+'T00:00:00');
  var target=new Date(bday);
  target.setFullYear(bday.getFullYear()+(milData.target||40));
  target.setHours(0,0,0,0);
  var today=new Date();today.setHours(0,0,0,0);
  return Math.round((target-today)/86400000);
}
function milCurrentAge(){
  if(!milData.birthday)return null;
  var bday=new Date(milData.birthday+'T00:00:00');
  var now=new Date();
  var msAge=now-bday;
  var ageExact=msAge/(365.25*24*3600*1000);
  return Math.floor(ageExact*10)/10;
}

var milTab='main'; // 'main' or 'settings'

function milSwitchTab(t){
  milTab=t;
  milRender();
}

function milCheckNotice(){
  var el=document.getElementById('mil-notice');
  if(!el)return;
  if(sessionStorage.getItem('mil-notice-dismissed')==='1'){el.innerHTML='';return;}
  var milData=lsGet('dash_mil',{});
  var goals=milData.goals||[];
  if(!goals.length){el.innerHTML='';return;}
  // Find most recent note timestamp across all goals
  var mostRecent=null;
  goals.forEach(function(g){
    (g.notes||[]).forEach(function(n){
      var ts=n.ts||(n.date||'');
      if(ts&&(!mostRecent||ts>mostRecent))mostRecent=ts;
    });
    // Also count goal pct changes via updatedAt if available
  });
  if(!mostRecent){el.innerHTML='';return;}
  var lastDate=mostRecent.slice(0,10);
  var daysSince=Math.round((new Date()-new Date(lastDate+'T00:00:00'))/(864e5));
  if(daysSince>=7){
    el.innerHTML='<div class="inactivity-notice'+(daysSince>5?' jiggle':'')+'" class="mb-6"><span>&#9650; No milestone update in '+daysSince+' day'+(daysSince!==1?'s':'')+'. Last note: '+lastDate+'</span><button data-dismiss="mil-notice" style="background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:var(--t-lg);padding:0 2px">&#10005;</button></div>';
  } else {
    el.innerHTML='';
  }
}
function milRender(){
  milCheckNotice();
  var el=document.getElementById('mil-body');
  var badge=document.getElementById('mil-badge');
  if(!el)return;
  el.style.maxHeight='700px';
  el.style.overflowY='auto';
  var days=milDaysUntil();
  var age=milCurrentAge();
  var target=milData.target||40;
  if(badge)badge.textContent=days!==null?(days>0?days+' days':days===0?'TODAY!':'DONE'):'—';

  // Tab header
  var h='<div class="flex-row-4">';
  h+='<span data-tab="main" onclick="milSwitchTab(this.dataset.tab)" style="font-size:var(--t-sm);padding:3px 10px;border:1px solid '+(milTab==='main'?'var(--cg)':'rgba(255,255,255,.12)')+';color:'+(milTab==='main'?'var(--cg)':'var(--dim)')+';cursor:pointer">MAIN</span>';
  h+='<span data-tab="settings" onclick="milSwitchTab(this.dataset.tab)" style="font-size:var(--t-sm);padding:3px 10px;border:1px solid '+(milTab==='settings'?'var(--cg)':'rgba(255,255,255,.12)')+';color:'+(milTab==='settings'?'var(--cg)':'var(--dim)')+';cursor:pointer">&#9881; SETTINGS</span>';
  h+='</div>';

  if(milTab==='settings'){
    // ── SETTINGS TAB ──
    h+='<div class="mb-14">';
    h+='<div class="label-dim-xs">BIRTHDAY</div>';
    h+='<input type="date" id="mil-bday-inp" value="'+(milData.birthday||'')+'" onchange="milSetBirthday(this.value)" style="width:100%;background:transparent;border:1px solid var(--c-faint);color:var(--text);font-family:monospace;font-size:var(--t-lg);padding:7px 10px;outline:none;box-sizing:border-box">';
    h+='</div>';
    h+='<div class="mb-14">';
    h+='<div class="label-dim-sm">TARGET AGE</div>';
    h+='<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">';
    [35,40,45,50,55,60].forEach(function(t){
      h+='<button class="mil-target-btn'+(target===t?' active':'')+'" data-t="'+t+'" onclick="milSetTarget(+this.dataset.t)">'+t+'</button>';
    });
    h+='</div>';
    h+='<input type="number" id="mil-custom-target" placeholder="Custom age" min="1" max="120" value="'+(([35,40,45,50,55,60].indexOf(target)<0)?target:'')+'" style="width:100%;background:transparent;border:1px solid var(--c-faint);color:var(--text);font-family:monospace;font-size:var(--t-md);padding:6px 10px;outline:none;box-sizing:border-box" onchange="milSetTarget(+this.value||target)">';
    h+='</div>';
    h+='<div class="label-dim-sm">GOALS</div>';
    var goals=milData.goals||[];
    goals.forEach(function(g,i){
      h+='<div style="display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid var(--c-ghost)">';
      h+='<span style="flex:1;font-size:var(--t-md);color:var(--text)">'+g.name+'</span>';
      h+='<span class="dim-9">'+( g.pct||0)+'%</span>';
      h+='<button onclick="milDeleteGoal('+i+')" style="font-size:var(--t-sm);padding:2px 8px;border:1px solid rgba(255,68,68,.3);color:var(--cr);background:transparent;cursor:pointer">✕</button>';
      h+='</div>';
    });
    h+='<div style="display:flex;gap:6px;margin-top:10px">';
    h+='<input id="mil-new-goal-inp" placeholder="New goal name..." style="flex:1;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--text);font-family:monospace;font-size:var(--t-md);padding:6px 8px;outline:none" onkeydown="if(event.key===String.fromCharCode(13))milAddGoal()">';
    h+='<button onclick="milAddGoal()" style="padding:6px 12px;background:transparent;border:1px solid rgba(0,255,136,.3);color:var(--cg);font-family:monospace;font-size:var(--t-base);cursor:pointer">ADD</button>';
    h+='</div>';
  } else {
    // ── MAIN TAB ──
    // Big counter
    if(days!==null){
      var col=days<0?'var(--ca)':days===0?'var(--ca)':'var(--cg)';
      h+='<div class="mil-counter">';
      h+='<div class="mil-days-num" style="color:'+col+'">'+( days<0?0:days)+'</div>';
      h+='<div class="mil-days-lbl">'+(days<0?'YOU&#39;VE MADE IT':days===0?'TODAY IS THE DAY':'DAYS UNTIL '+target)+'</div>';
      h+='</div>';
      h+='<div class="mil-age-display">'+( age!==null?'Currently '+age+' years old':'')+'</div>';
    } else {
      h+='<div style="color:var(--dim);font-size:var(--t-md);text-align:center;padding:20px 0;line-height:1.8">Set your birthday and target age<br>in ⚙ SETTINGS above.</div>';
    }

    // Goals with chat-style notes
    var goals=milData.goals||[];
    if(goals.length){
      h+='<div style="font-size:var(--t-xs);letter-spacing:2px;color:var(--dim);margin:14px 0 8px">GOALS FOR '+target+'</div>';
      goals.forEach(function(g,i){
        h+='<div class="mil-goal-row" class="mb-12">';
        // Goal name + % input
        h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">';
        h+='<span class="mil-goal-name" style="flex:1">'+g.name+'</span>';
        h+='<div style="display:flex;align-items:center;gap:4px">';
        h+='<input type="number" min="0" max="100" value="'+(g.pct||0)+'" data-gi="'+i+'" onchange="milSetPct(+this.dataset.gi,+this.value)" style="width:48px;background:transparent;border:1px solid var(--c-faint);color:var(--cg);font-family:monospace;font-size:var(--t-md);padding:3px 6px;outline:none;text-align:center">';
        h+='<span class="dim-10">%</span>';
        h+='</div>';
        h+='</div>';
        // Progress bar (visual only)
        h+='<div class="mil-pbar-wrap" style="cursor:default">';
        h+='<div class="mil-pbar-fill" style="width:'+(g.pct||0)+'%"></div>';
        h+='</div>';
        // Chat-style notes
        var notes=g.notes||[];
        if(notes.length){
          h+='<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;'+(notes.length>5?'max-height:180px;overflow-y:auto;padding-right:4px':'')+'">';
          notes.forEach(function(n,ni){
            var ts=n.ts?new Date(n.ts).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
            h+='<div style="background:rgba(255,255,255,.04);border-left:2px solid rgba(255,255,255,.12);padding:5px 10px;font-size:var(--t-base);color:var(--dim);display:flex;justify-content:space-between;align-items:flex-start;gap:6px">';
            h+='<div style="flex:1"><div style="line-height:1.5;color:var(--text)">'+n.text+'</div>'+(ts?'<div style="font-size:var(--t-xs);color:var(--dim);opacity:.6;margin-top:2px">'+ts+'</div>':'')+'</div>';
            h+='<span data-gi="'+i+'" data-ni="'+ni+'" onclick="milDeleteNote(+this.dataset.gi,+this.dataset.ni)" style="color:var(--dim);cursor:pointer;opacity:.4;font-size:var(--t-sm);flex-shrink:0">✕</span>';
            h+='</div>';
          });
          h+='</div>';
        }
        // Note input
        h+='<div style="display:flex;gap:4px;margin-top:5px">';
        h+='<input id="mil-note-'+i+'" placeholder="Add note..." style="flex:1;background:transparent;border:none;border-bottom:1px solid var(--c-border);color:var(--dim);font-family:monospace;font-size:var(--t-base);padding:3px 2px;outline:none" onkeydown="if(event.key===String.fromCharCode(13))milAddNote('+i+')">';
        h+='<button onclick="milAddNote('+i+')" style="font-size:var(--t-sm);padding:2px 8px;border:1px solid var(--c-border);color:var(--dim);background:transparent;cursor:pointer">+</button>';
        h+='</div>';
        h+='</div>';
      });
    } else {
      h+='<div style="color:var(--dim);font-size:var(--t-base);margin-top:12px">No goals yet — add them in ⚙ SETTINGS.</div>';
    }
  }

  el.innerHTML=h;
}

function milSetTarget(t){if(!t||t<1||t>120)return;milData.target=+t;milSave();milRender();}
function milSetBirthday(v){milData.birthday=v||null;milSave();milRender();}
function milSetPct(i,v){
  if(!milData.goals[i])return;
  milData.goals[i].pct=Math.max(0,Math.min(100,v||0));
  milSave();milRender();
}
function milAddGoal(){
  var inp=document.getElementById('mil-new-goal-inp');
  if(!inp||!inp.value.trim())return;
  if(!milData.goals)milData.goals=[];
  milData.goals.push({name:inp.value.trim(),pct:0,notes:[]});
  milSave();milRender();
}
function milDeleteGoal(i){milData.goals.splice(i,1);milSave();milRender();}
function milAddNote(i){
  var inp=document.getElementById('mil-note-'+i);
  if(!inp||!inp.value.trim())return;
  if(!milData.goals[i].notes)milData.goals[i].notes=[];
  milData.goals[i].notes.push({text:inp.value.trim(),ts:new Date().toISOString()});
  milSave();milRender();
}
function milDeleteNote(gi,ni){milData.goals[gi].notes.splice(ni,1);milSave();milRender();}
function milExport(){
  var days=milDaysUntil();var age=milCurrentAge();var t=milData.target||40;
  var lines=['MILESTONE: DAYS UNTIL '+t,'Generated: '+new Date().toLocaleDateString(),'='.repeat(40),''];
  if(milData.birthday)lines.push('Birthday: '+milData.birthday);
  if(age!==null)lines.push('Current age: '+age);
  if(days!==null)lines.push('Days until '+t+': '+(days>0?days:days===0?'TODAY':'PASSED'));
  var goals=milData.goals||[];
  if(goals.length){lines.push('');lines.push('GOALS:');goals.forEach(function(g,i){lines.push((i+1)+'. '+g.name+' — '+(g.pct||0)+'%');(g.notes||[]).forEach(function(n){lines.push('   '+n.text);});});}
  downloadTxt(lines.join('\n'),'milestone.txt');
}
setTimeout(function(){milRender();},500);

function itCopyEntry(){
  if(!itData||!itState)return;
  var viewNum=itState.browseIdx||itState.current;
  var idx=Math.max(0,Math.min(viewNum-1,itData.length-1));
  var entry=itData[idx];
  if(!entry)return;
  var parts=[entry.title||''];
  if(entry.topic)parts.push(entry.topic.toUpperCase());
  if(entry.question)parts.push('\n'+entry.question);
  if(entry.notes_sources)parts.push('\n'+entry.notes_sources);
  clipCopy(parts.join('\n'),'Islamic Topics');
}

function wdCopyEntry(){
  if(!wdData||!wdState)return;
  var id=wdState.browseId||wdState.currentId;
  var entry=wdData[id];
  if(!entry)return;
  var parts=[entry.title||''];
  if(entry.category)parts.push(entry.category.toUpperCase());
  if(entry.question)parts.push('\n'+entry.question);
  if(entry.answer)parts.push('\n'+(entry.answer).replace(/\[span_\d+\]\((?:start|end)_span\)/g,'').trim());
  if(entry.source){var s=(entry.source).replace(/\[span_\d+\]\((?:start|end)_span\)/g,'').trim();if(s)parts.push('\n— '+s);}
  clipCopy(parts.join('\n'),'Writers Den');
}
function scrollToSettings(){var el=document.querySelector('[data-id="settings"]');if(el){var top=el.getBoundingClientRect().top+window.scrollY-60;window.scrollTo({top:top,behavior:"smooth"});}}


// ── END OF CODE ──

// ── WEEKLY SUMMARY ──
function wSummaryRender(){
  var el=document.getElementById('weekly-summary-body');
  var tile=document.getElementById('weekly-summary-tile');
  if(!el||!tile)return;
  var dow=new Date().getDay();
  if(dow!==0&&dow!==1){tile.style.display='none';return;}
  var n=new Date();var d=n.getDay();var mon=new Date(n);
  mon.setDate(n.getDate()-((d+6)%7));mon.setHours(0,0,0,0);
  var weekKey=mon.toISOString().slice(0,10);
  var dismissKey='wsum_dismissed_'+weekKey;
  if(localStorage.getItem(dismissKey)){tile.style.display='none';return;}
  tile.style.display='';
  var days=[];for(var i=6;i>=0;i--){var dd=new Date();dd.setDate(dd.getDate()-i);days.push(dd.toISOString().slice(0,10));}
  // Mood
  var mlRef=lsGet('dash_ml',[]);
  var moodEntries=mlRef.filter(function(e){return days.indexOf(e.date)>=0;});
  var moodAvg=moodEntries.length?Math.round(moodEntries.reduce(function(a,e){return a+e.mood;},0)/moodEntries.length*10)/10:null;
  // Prayers
  var ptRef=lsGet('pt_data',{});
  var prayersLogged=0;
  days.forEach(function(dk){var day=ptRef[dk]||{};['Fajr','Dhuhr','Asr','Maghrib','Isha'].forEach(function(p){if(day[p]==='ontime'||day[p]==='late')prayersLogged++;});});
  // Goals
  var goalsRef=lsGet('dash_goals',{});
  var goalCheckins=0;
  ['monthly','yearly'].forEach(function(period){var gs=goalsRef[period]||[];gs.forEach(function(g){(g.checkins||[]).forEach(function(c){if(days.indexOf(c)>=0)goalCheckins++;});});});
  // Gratitude
  var gratRef=lsGet('dash_grat',[]);
  var gratDays=gratRef.filter(function(e){return days.indexOf(e.date)>=0;}).length;
  // Books
  var booksRef=lsGet('dash_books',[]);
  var activeBooks=booksRef.filter(function(b){return !b.done&&b.current>0;}).length;
  // Writing
  var writeRef=lsGet('dash_write_log',[]);
  var writeDays=writeRef.filter(function(e){return days.indexOf(e.date)>=0;}).length;

  var things=[];
  if(prayersLogged>0)things.push(prayersLogged+' prayer'+(prayersLogged!==1?'s':''));
  if(goalCheckins>0)things.push(goalCheckins+' goal check-in'+(goalCheckins!==1?'s':''));
  if(gratDays>0)things.push(gratDays+' day'+(gratDays!==1?'s':'')+' of gratitude');
  if(writeDays>0)things.push(writeDays+' writing session'+(writeDays!==1?'s':''));
  if(activeBooks>0)things.push(activeBooks+' book'+(activeBooks!==1?'s':'')+' in progress');
  if(moodAvg!==null)things.push('mood averaged '+moodAvg+'/10');

  var tone='';
  if(things.length===0){tone='A quiet week. Rest is part of the journey. You are still here.';}
  else if(moodAvg!==null&&moodAvg<4){tone='It was a harder week. That takes its own kind of strength. You showed up.';}
  else if(things.length>=4){tone='A solid week. You did real things. That matters.';}
  else if(things.length>=2){tone='You moved forward this week. Not nothing.';}
  else{tone='You did something this week. That is not nothing.';}

  var h='';
  h+='<div style="font-size:var(--t-base);color:rgba(126,184,255,.7);line-height:1.7;margin-bottom:12px;font-style:italic">'+tone+'</div>';
  if(things.length){
    h+='<div class="mb-14">';
    things.forEach(function(t){
      h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">';
      h+='<span style="color:#7eb8ff;font-size:var(--t-body)">&#8226;</span><span class="text-12">'+t+'</span></div>';
    });
    h+='</div>';
  } else {
    h+='<div style="font-size:var(--t-base);color:var(--dim);opacity:.6;margin-bottom:14px">Nothing logged this week yet. The week is not over.</div>';
  }
  var _wsNow=new Date();
var _wsDow=_wsNow.getDay();
var _wsToSun=_wsDow===0?7:(7-_wsDow);
var _wsNextSun=new Date(_wsNow);_wsNextSun.setDate(_wsNow.getDate()+_wsToSun);_wsNextSun.setHours(0,0,0,0);
var _wsMs=_wsNextSun-_wsNow;
var _wsH=Math.floor(_wsMs/36e5);var _wsD=Math.floor(_wsH/24);var _wsHr=_wsH%24;
var _wsTimeStr=_wsD>0?_wsD+'d '+_wsHr+'h':_wsH+'h';
var _wsSentence='';
if(_wsDow===0)_wsSentence='This summary is for last week. Next summary appears next Sunday.';
else if(_wsDow===1)_wsSentence='Last week is now closed. This summary disappears today. Next in '+_wsTimeStr+'.';
else _wsSentence='Next weekly summary in '+_wsTimeStr+'.';
h+='<div style="font-size:var(--t-sm);color:var(--dim);margin-bottom:10px;padding:5px 8px;border-left:2px solid rgba(126,184,255,.2);line-height:1.6">'+_wsSentence+'</div>';
h+='<button id="wsum-dismiss" style="width:100%;padding:8px;background:transparent;border:1px solid var(--c-border);color:var(--dim);font-family:monospace;font-size:var(--t-sm);cursor:pointer;letter-spacing:1px">CLOSE FOR THIS WEEK</button>';
  el.innerHTML=h;
  var btn=document.getElementById('wsum-dismiss');
  if(btn)btn.onclick=function(){localStorage.setItem(dismissKey,'1');tile.style.display='none';safeToast('See you next week');};
}
setTimeout(function(){wSummaryRender();},1100);

// ── CERTIFICATIONS TRACKER ──
var certData = lsGet('dash_cert',[]);
var certNotesOpen = {}; // {id: bool} — tracks which note editors are open
function certSave(){lsSet('dash_cert',certData);}

function certRender(){
  var el=document.getElementById('cert-body');
  var badge=document.getElementById('cert-badge');
  if(!el)return;
  var today=new Date();today.setHours(0,0,0,0);
  var tab=certNotesOpen._tab||'list';

  // Generate keyword if missing
  if(!certData._keyword){
    var _W1=['vault','cedar','stone','ember','frost','iron','lunar','amber','cobalt','echo','flint','harbor','jade','lark','moss','nova','opal','pine','quill','reef'];
    var _W2=['signal','current','anchor','beacon','cipher','delta','echo','field','grove','hatch','inlet','joist','knot','latch','manor','notch','orbit','panel','quest','ridge'];
    certData._keyword=_W1[Math.floor(Math.random()*_W1.length)]+'-'+_W2[Math.floor(Math.random()*_W2.length)]+'-'+Math.floor(1000+Math.random()*9000);
    certSave();
  }

  var sorted=certData.filter(function(c){return c.id;}).slice().sort(function(a,b){return new Date(a.expiry)-new Date(b.expiry);});
  var urgentCount=sorted.filter(function(c){var d=Math.ceil((new Date(c.expiry)-today)/864e5);return d<=60&&d>=0;}).length;
  if(badge){badge.textContent=urgentCount?urgentCount+' expiring soon':'';badge.style.display=urgentCount?'':'none';}

  var h='';
  // Tabs
  h+='<div style="display:flex;gap:6px;margin-bottom:12px">';
  [{t:'list',l:'LIST'},{t:'add',l:'+ ADD'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-certtab="'+x.t+'" style="font-size:var(--t-xs);padding:3px 12px;border:1px solid '+(a?'rgba(80,250,200,.5)':'var(--c-border)')+';color:'+(a?'#50fac8':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='list'){
    if(!sorted.length){
      h+='<div style="font-size:var(--t-base);color:var(--dim);padding:20px 0;text-align:center">No certifications yet.<br>Tap + ADD to get started.</div>';
    } else {
      sorted.forEach(function(c){
        var exp=new Date(c.expiry);
        var daysLeft=Math.ceil((exp-today)/864e5);
        var expired=daysLeft<0;
        var urgent=daysLeft<=30&&!expired;
        var warning=daysLeft<=60&&daysLeft>30;
        var col=expired?'rgba(255,68,68,.9)':urgent?'rgba(255,140,0,.9)':warning?'rgba(255,220,60,.8)':'#50fac8';
        var status=expired?'EXPIRED':(urgent||warning)?daysLeft+'d left':'';
        var expStr=exp.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        var notesOpen=!!(certNotesOpen&&certNotesOpen[c.id]);
        h+='<div style="border-bottom:1px solid var(--c-ghost);padding:8px 0">';
        h+='<div class="flex-center">';
        h+='<div class="flex-1">';
        h+='<div class="text-12">'+c.name+'</div>';
        if(c.issuer)h+='<div class="dim-9">'+c.issuer+'</div>';
        h+='</div>';
        h+='<div style="text-align:right;flex-shrink:0">';
        h+='<div style="font-size:var(--t-sm);color:'+col+'">'+expStr+'</div>';
        if(status)h+='<div style="font-size:var(--t-xs);font-weight:bold;color:'+col+'">'+status+'</div>';
        h+='</div>';
        h+='<button data-certnotes="'+c.id+'" style="flex-shrink:0;background:transparent;border:none;color:'+(notesOpen?'#50fac8':'rgba(255,255,255,.3)')+';font-size:var(--t-base);cursor:pointer;padding:0 3px">📝</button>';
        h+='<button data-certdel="'+c.id+'" style="flex-shrink:0;background:transparent;border:none;color:rgba(255,255,255,.25);font-size:var(--t-lg);cursor:pointer;padding:0 2px">✕</button>';
        h+='</div>';
        if(notesOpen){
          h+='<textarea data-certnotesinp="'+c.id+'" style="width:100%;box-sizing:border-box;background:rgba(80,250,200,.04);border:1px solid rgba(80,250,200,.15);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:6px 8px;outline:none;resize:vertical;min-height:56px;margin-top:6px">'+( c.notes||'')+'</textarea>';
          h+='<button data-certnotessave="'+c.id+'" style="margin-top:4px;padding:4px 12px;background:rgba(80,250,200,.06);border:1px solid rgba(80,250,200,.25);color:#50fac8;font-family:monospace;font-size:var(--t-sm);cursor:pointer">SAVE</button>';
        } else if(c.notes){
          h+='<div style="font-size:var(--t-sm);color:var(--dim);padding:3px 0;line-height:1.5">'+c.notes+'</div>';
        }
        if(c.certKey){
          h+='<div style="display:flex;align-items:center;gap:6px;padding:3px 0">';
          h+='<span style="font-size:var(--t-xs);color:rgba(80,250,200,.5);font-family:monospace">'+c.certKey+'</span>';
          h+='<button data-certkeycopy="'+c.id+'" style="font-size:var(--t-xs);padding:1px 7px;background:transparent;border:1px solid rgba(80,250,200,.2);color:rgba(80,250,200,.5);font-family:monospace;cursor:pointer">📋</button>';
          h+='</div>';
        }
        h+='</div>';
      });
    }
  } else {
    // ADD tab
    var _kw=certData._keyword;
    h+='<input id="cert-inp-name" placeholder="Name (e.g. CPR, CNMT License)" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid rgba(80,250,200,.2);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:6px 8px;margin-bottom:6px;outline:none">';
    h+='<input id="cert-inp-issuer" placeholder="Issuer (optional)" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid rgba(80,250,200,.1);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:6px 8px;margin-bottom:6px;outline:none">';
    h+='<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><span style="font-size:var(--t-xs);color:var(--dim);flex-shrink:0">EXPIRES</span><input id="cert-inp-expiry" type="date" style="flex:1;background:transparent;border:1px solid rgba(80,250,200,.2);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:5px 8px;outline:none"></div>';
    h+='<textarea id="cert-inp-notes" placeholder="Notes (optional)" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid rgba(80,250,200,.1);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:6px 8px;margin-bottom:8px;outline:none;resize:vertical;min-height:48px"></textarea>';
    h+='<input id="cert-inp-key" placeholder="Unique key / reference (optional)" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid rgba(80,250,200,.1);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:6px 8px;margin-bottom:8px;outline:none">';
    h+='<button id="cert-add-btn" style="width:100%;padding:9px;background:rgba(80,250,200,.06);border:1px solid rgba(80,250,200,.3);color:#50fac8;font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:1px;margin-bottom:16px">+ ADD CERTIFICATION</button>';
    // Keyword section at bottom of add tab
    h+='<div style="border-top:1px solid rgba(255,255,255,.08);padding-top:12px">';
    h+='<div style="font-size:var(--t-xs);color:rgba(80,250,200,.5);letter-spacing:1px;margin-bottom:6px">GMAIL SEARCH KEYWORD</div>';
    h+='<div style="font-size:var(--t-body);color:#50fac8;font-family:monospace;letter-spacing:2px;margin-bottom:4px">'+_kw+'</div>';
    h+='<div style="font-size:var(--t-xs);color:var(--dim);line-height:1.5;margin-bottom:8px">Include this keyword in any email you send yourself about a cert. Search Gmail for it to find all your cert emails.</div>';
    h+='<div class="flex-row">';
    h+='<button data-certkwcopy="1" style="padding:4px 12px;background:transparent;border:1px solid rgba(80,250,200,.2);color:rgba(80,250,200,.6);font-family:monospace;font-size:var(--t-xs);cursor:pointer">📋 COPY</button>';
    h+='<button data-certkwregen="1" style="padding:4px 12px;background:transparent;border:1px solid var(--c-border);color:var(--dim);font-family:monospace;font-size:var(--t-xs);cursor:pointer">↻ REGENERATE</button>';
    h+='</div></div>';
  }

  el.innerHTML=h;

  // Wire tabs
  el.querySelectorAll('[data-certtab]').forEach(function(b){
    b.onclick=function(){certNotesOpen._tab=this.dataset.certtab;certRender();};
  });

  // Wire add button
  var addBtn=el.querySelector('#cert-add-btn');
  if(addBtn)addBtn.onclick=function(){
    var name=(el.querySelector('#cert-inp-name').value||'').trim();
    var issuer=(el.querySelector('#cert-inp-issuer').value||'').trim();
    var expiry=el.querySelector('#cert-inp-expiry').value;
    var notes=(el.querySelector('#cert-inp-notes').value||'').trim();
    var certKey=(el.querySelector('#cert-inp-key').value||'').trim();
    if(!name||!expiry)return;
    certData.push({id:Date.now(),name:name,issuer:issuer,expiry:expiry,notes:notes,certKey:certKey});
    certSave();
    certNotesOpen._tab='list';
    certRender();
    safeHap(HAP.save);
  };

  // Wire notes toggle
  el.querySelectorAll('[data-certnotes]').forEach(function(btn){
    btn.onclick=function(){
      var id=parseInt(this.dataset.certnotes);
      certNotesOpen[id]=!certNotesOpen[id];
      certRender();
      if(certNotesOpen[id])setTimeout(function(){var ta=el.querySelector('[data-certnotesinp="'+id+'"]');if(ta)ta.focus();},50);
    };
  });

  // Wire notes save
  el.querySelectorAll('[data-certnotessave]').forEach(function(btn){
    btn.onclick=function(){
      var id=parseInt(this.dataset.certnotessave);
      var ta=el.querySelector('[data-certnotesinp="'+id+'"]');
      var c=certData.find(function(x){return x.id===id;});
      if(c&&ta){c.notes=ta.value.trim();certSave();}
      certNotesOpen[id]=false;
      certRender();
      safeHap(HAP.soft);
    };
  });

  // Wire keyword copy
  var kwCopy=el.querySelector('[data-certkwcopy]');
  if(kwCopy)kwCopy.onclick=function(){
    var txt=certData._keyword||'';
    if(navigator.clipboard)navigator.clipboard.writeText(txt).catch(function(){var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);});
    else{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}
    kwCopy.textContent='✓ COPIED';setTimeout(function(){kwCopy.textContent='📋 COPY';},1800);
    safeHap(HAP.soft);
  };

  // Wire keyword regen
  var kwRegen=el.querySelector('[data-certkwregen]');
  if(kwRegen)kwRegen.onclick=function(){
    if(kwRegen.dataset.confirm!=='1'){
      kwRegen.textContent='SURE?';kwRegen.dataset.confirm='1';
      setTimeout(function(){if(kwRegen.dataset.confirm==='1'){kwRegen.textContent='↻ REGENERATE';kwRegen.dataset.confirm='';}},2000);
      return;
    }
    delete certData._keyword;certSave();certRender();
  };

  // Wire cert key copy
  el.querySelectorAll('[data-certkeycopy]').forEach(function(btn){
    btn.onclick=function(){
      var id=parseInt(this.dataset.certkeycopy);
      var c=certData.find(function(x){return x.id===id;});
      if(!c||!c.certKey)return;
      if(navigator.clipboard)navigator.clipboard.writeText(c.certKey);
      else{var ta=document.createElement('textarea');ta.value=c.certKey;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}
      this.textContent='✓';
      var _b=this;setTimeout(function(){_b.textContent='📋';},1500);
      safeHap(HAP.soft);
    };
  });

  // Wire delete with confirm
  el.querySelectorAll('[data-certdel]').forEach(function(btn){
    btn.onclick=function(){
      var _b=this;
      if(_b.dataset.confirm!=='1'){
        _b.textContent='?';_b.style.color='rgba(255,100,100,.8)';_b.dataset.confirm='1';
        setTimeout(function(){if(_b.dataset.confirm==='1'){_b.textContent='✕';_b.style.color='rgba(255,255,255,.25)';_b.dataset.confirm='';}},2000);
        return;
      }
      var id=parseInt(this.dataset.certdel);
      certData=certData.filter(function(c){return c.id!==id;});
      certSave();certRender();
    };
  });
}

setTimeout(function(){certRender();},300);

// ── MEDICINE TRACKER ──
var medData = JSON.parse(localStorage.getItem('dash_med') || '{"meds":[],"log":[]}');
if(!medData.meds)medData.meds=[];
if(!medData.log)medData.log=[];
function medSave(){lsSet('dash_med',medData);}
var medTab='today';
var medPending=null; // id of med awaiting confirm

var MED_COLORS=['#c896ff','#50fac8','#ff85c2','#fb923c','#7dd3fc','#86efac'];

function medRender(){
  var el=document.getElementById('med-body');
  if(!el)return;
  var h='';

  // Tabs
  var tabs=[{t:'today',l:'💊 TODAY'},{t:'log',l:'📋 LOG'},{t:'pk',l:'📈 CURVE'},{t:'stats',l:'📊 STATS'},{t:'manage',l:'⚙ MANAGE'}];
  h+='<div style="display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap">';
  tabs.forEach(function(x){
    var a=medTab===x.t;
    h+='<span data-medtab="'+x.t+'" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid '+(a?'rgba(200,150,255,.5)':'var(--c-border)')+';color:'+(a?'#c896ff':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  var now=new Date();

  if(medTab==='today'){
    if(!medData.meds.length){
      h+='<div style="font-size:var(--t-base);color:var(--dim);text-align:center;padding:20px 0">No medicines yet.<br>Add them in ⚙ MANAGE.</div>';
    } else {
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">';
      medData.meds.forEach(function(m){
        var col=m.color||'#c896ff';
        // Find last taken ever
        var _n=now;var todayStr=_n.getFullYear()+'-'+String(_n.getMonth()+1).padStart(2,'0')+'-'+String(_n.getDate()).padStart(2,'0');
        var lastLog=null;
        for(var i=medData.log.length-1;i>=0;i--){
          if(medData.log[i].mid===m.id){lastLog=medData.log[i];break;}
        }
        var takenToday=!!(lastLog&&lastLog.ts.slice(0,10)===todayStr);
        var pending=medPending===m.id;
        var bg=takenToday?'rgba('+hexToRgb(col)+',.12)':'rgba(255,255,255,.03)';
        var border=takenToday?col:(pending?'rgba(255,184,108,.6)':'rgba(255,255,255,.12)');
        h+='<div data-medlog="'+m.id+'" style="padding:14px 10px;border:1px solid '+border+';background:'+bg+';cursor:pointer;text-align:center;user-select:none">';
        h+='<div style="font-size:var(--t-lg);font-weight:bold;color:'+col+';font-family:monospace;margin-bottom:4px">'+m.name+'</div>';
        if(m.dose)h+='<div style="font-size:var(--t-sm);color:var(--dim);margin-bottom:6px">'+m.dose+'</div>';
        if(pending){
          h+='<div style="font-size:var(--t-sm);color:rgba(255,184,108,.9);letter-spacing:1px">TAP AGAIN ✓</div>';
        } else if(lastLog){
          var _msAgo=now-new Date(lastLog.ts);
          var _hrsAgo=Math.floor(_msAgo/36e5);
          var _minsAgo=Math.floor(_msAgo/6e4)%60;
          var _daysAgo=Math.floor(_msAgo/864e5);
          var timeStr=_daysAgo>0?_daysAgo+'d ago':_hrsAgo>0?_hrsAgo+'h '+_minsAgo+'m ago':_minsAgo+'m ago';
          var timeColor=takenToday?col:'rgba(255,255,255,.4)';
          h+='<div style="font-size:var(--t-sm);color:'+timeColor+'">'+(takenToday?'✓ ':'')+timeStr+'</div>';
        } else {
          h+='<div style="font-size:var(--t-sm);color:rgba(255,255,255,.25)">never logged</div>';
        }
        h+='</div>';
      });
      h+='</div>';
    }

  } else if(medTab==='log'){
    if(!medData.log.length){
      h+='<div class="card-empty-v">No doses logged yet.</div>';
    } else {
      // Group by date
      var byDate={};
      medData.log.forEach(function(e){
        var d=e.ts.slice(0,10);
        if(!byDate[d])byDate[d]=[];
        byDate[d].push(e);
      });
      var dates=Object.keys(byDate).sort().reverse();
      dates.slice(0,30).forEach(function(d){
        var label=new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
        h+='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin:10px 0 4px">'+label+'</div>';
        byDate[d].slice().reverse().forEach(function(e){
          var m=medData.meds.find(function(x){return x.id===e.mid;})||{name:e.mname||'?',color:'#c896ff'};
          var t=new Date(e.ts);
          var timeStr=t.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
          var col=m.color||'#c896ff';
          h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
          h+='<div style="width:8px;height:8px;border-radius:50%;background:'+col+';flex-shrink:0"></div>';
          h+='<div class="text-11-flex">'+m.name+'</div>';
          if(m.dose)h+='<div class="dim-9">'+m.dose+'</div>';
          h+='<div class="dim-10">'+timeStr+'</div>';
          h+='<button data-meddel="'+e.ts+'|'+e.mid+'" style="background:transparent;border:none;color:rgba(255,255,255,.2);font-size:var(--t-base);cursor:pointer">✕</button>';
          h+='</div>';
        });
      });
      h+='<button id="med-export-btn" style="width:100%;margin-top:14px;padding:8px;background:transparent;border:1px solid var(--c-faint);color:var(--dim);font-family:monospace;font-size:var(--t-sm);cursor:pointer;letter-spacing:1px">📋 COPY LOG TO CLIPBOARD</button>';
    }

  } else if(medTab==='pk'){
    h+=medRenderPK();

  } else if(medTab==='stats'){
    if(!medData.log.length||!medData.meds.length){
      h+='<div class="card-empty-v">Log some doses to see stats.</div>';
    } else {
      // Last 14 days bar chart — doses per day
      var days14=[];
      for(var i=13;i>=0;i--){
        var d=new Date(now);d.setDate(d.getDate()-i);
        days14.push(d.toISOString().slice(0,10));
      }
      var maxPerDay=0;
      var dayCounts=days14.map(function(d){
        var c=medData.log.filter(function(e){return e.ts.slice(0,10)===d;}).length;
        if(c>maxPerDay)maxPerDay=c;
        return c;
      });
      h+='<div class="label-dim">DOSES — LAST 14 DAYS</div>';
      h+='<div style="display:flex;align-items:flex-end;gap:3px;height:60px;margin-bottom:4px">';
      days14.forEach(function(d,i){
        var c=dayCounts[i];
        var pct=maxPerDay?c/maxPerDay:0;
        var barH=Math.max(pct*52,c>0?4:0);
        var isToday=d===localDateStr(now);
        h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:60px">';
        if(c>0)h+='<div style="font-size:var(--t-xxs);color:var(--dim);margin-bottom:2px">'+c+'</div>';
        h+='<div style="width:100%;height:'+barH+'px;background:'+(isToday?'#c896ff':'rgba(200,150,255,.4)')+';min-height:'+(c>0?'4px':'0')+'"></div>';
        h+='</div>';
      });
      h+='</div>';
      // Day labels (every other)
      h+='<div style="display:flex;gap:3px;margin-bottom:16px">';
      days14.forEach(function(d,i){
        var label=i%4===0?new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'numeric',day:'numeric'}):'';
        h+='<div style="flex:1;font-size:var(--t-xxs);color:rgba(255,255,255,.25);text-align:center">'+label+'</div>';
      });
      h+='</div>';
      // Per-med stats
      h+='<div class="label-dim">PER MEDICINE</div>';
      medData.meds.forEach(function(m){
        var logs=medData.log.filter(function(e){return e.mid===m.id;});
        var total=logs.length;
        var lastTaken=logs.length?new Date(logs[logs.length-1].ts):null;
        var lastStr=lastTaken?lastTaken.toLocaleDateString('en-US',{month:'short',day:'numeric'})+'  '+lastTaken.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'never';
        var col=m.color||'#c896ff';
        // Streak: consecutive days with at least one dose
        var streak=0;
        var d=new Date(now);
        while(true){
          var ds=d.toISOString().slice(0,10);
          if(medData.log.some(function(e){return e.mid===m.id&&e.ts.slice(0,10)===ds;})){streak++;d.setDate(d.getDate()-1);}
          else break;
        }
        h+='<div style="padding:8px 0;border-bottom:1px solid var(--c-ghost)">';
        h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
        h+='<div style="width:10px;height:10px;border-radius:50%;background:'+col+'"></div>';
        h+='<span class="text-11">'+m.name+'</span>';
        h+='</div>';
        h+='<div class="dim-10">'+total+' doses total · '+streak+' day streak · last: '+lastStr+'</div>';
        h+='</div>';
      });
    }

  } else if(medTab==='manage'){
    h+='<div class="label-dim-md">YOUR MEDICINES</div>';
    if(!medData.meds.length){
      h+='<div style="font-size:var(--t-base);color:var(--dim);margin-bottom:12px">None yet. Add below.</div>';
    } else {
      medData.meds.forEach(function(m,idx){
        var col=m.color||'#c896ff';
        h+='<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--c-ghost)">';
        h+='<div style="width:12px;height:12px;border-radius:50%;background:'+col+';flex-shrink:0"></div>';
        h+='<div style="flex:1"><div class="text-12">'+m.name+'</div>';
        if(m.dose)h+='<div class="dim-9">'+m.dose+'</div></div>';
        else h+='</div>';
        h+='<button data-meddelmeds="'+m.id+'" style="background:transparent;border:none;color:rgba(255,255,255,.25);font-size:var(--t-lg);cursor:pointer;padding:0 4px">✕</button>';
        h+='</div>';
      });
    }
    // Add form
    h+='<div style="margin-top:12px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px">';
    h+='<div class="label-dim">ADD MEDICINE</div>';
    h+='<input id="med-inp-name" placeholder="Name (e.g. Loratadine)" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid rgba(200,150,255,.2);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:6px 8px;margin-bottom:6px;outline:none">';
    h+='<input id="med-inp-dose" placeholder="Dose label (e.g. 10mg) — optional" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid rgba(200,150,255,.1);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:6px 8px;margin-bottom:6px;outline:none">';
    h+='<div style="display:flex;gap:6px;margin-bottom:8px">';
    h+='<div style="flex:1"><div style="font-size:var(--t-xs);color:var(--dim);margin-bottom:3px">TMAX (hrs to peak)</div><input id="med-inp-tmax" type="number" min="0.5" max="12" step="0.5" value="2" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid rgba(200,150,255,.1);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:5px 8px;outline:none"></div>';
    h+='<div style="flex:1"><div style="font-size:var(--t-xs);color:var(--dim);margin-bottom:3px">HALF-LIFE (hrs)</div><input id="med-inp-hl" type="number" min="1" max="72" step="0.5" value="8" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid rgba(200,150,255,.1);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:5px 8px;outline:none"></div>';
    h+='</div>';
    h+='<div style="font-size:var(--t-xs);color:var(--dim);margin-bottom:6px;letter-spacing:1px">BUTTON COLOR</div>';
    h+='<div class="flex-row-mb">';
    MED_COLORS.forEach(function(col,ci){
      h+='<div data-medcol="'+col+'" style="width:22px;height:22px;border-radius:50%;background:'+col+';cursor:pointer;border:2px solid var(--c-faint)"></div>';
    });
    h+='</div>';
    h+='<input type="hidden" id="med-inp-color" value="'+MED_COLORS[0]+'">';
    h+='<button id="med-add-btn" style="width:100%;padding:9px;background:rgba(200,150,255,.06);border:1px solid rgba(200,150,255,.3);color:#c896ff;font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:1px">+ ADD</button>';
    h+='</div>';
  }

  el.innerHTML=h;

  // Wire PK isolate buttons
  el.querySelectorAll('[data-medpkiso]').forEach(function(b){
    b.onclick=function(){
      var iso=this.dataset.medpkiso;
      window._medPKIsolate=(iso==='all')?null:iso;
      medRender();
    };
  });

  // Wire tabs
  el.querySelectorAll('[data-medtab]').forEach(function(b){
    b.onclick=function(){medTab=this.dataset.medtab;medPending=null;medRender();};
  });

  // Wire pill buttons (today tab)
  el.querySelectorAll('[data-medlog]').forEach(function(btn){
    btn.onclick=function(){
      var mid=this.dataset.medlog;
      if(medPending===mid){
        // Confirm — log it
        var m=medData.meds.find(function(x){return x.id===mid;});
        medData.log.push({ts:new Date().toISOString(),mid:mid,mname:m?m.name:'?'});
        medSave();medPending=null;medRender();
        safeHap(HAP.check);
        // Confetti
        var _r=this.getBoundingClientRect();
        if(typeof confetti==='function')confetti(_r.left+_r.width/2,_r.top+_r.height/2,'#c896ff');
      } else {
        medPending=mid;
        medRender();
      }
    };
  });

  // Wire log delete
  el.querySelectorAll('[data-meddel]').forEach(function(btn){
    btn.onclick=function(){
      var _b=this;
      if(_b.dataset.confirm!=='1'){
        _b.textContent='?';_b.style.color='rgba(255,100,100,.8)';_b.dataset.confirm='1';
        setTimeout(function(){if(_b.dataset.confirm==='1'){_b.textContent='✕';_b.style.color='rgba(255,255,255,.2)';_b.dataset.confirm='';}},2000);
        return;
      }
      var parts=this.dataset.meddel.split('|');
      var ts=parts[0],mid=parts[1];
      medData.log=medData.log.filter(function(e){return !(e.ts===ts&&e.mid===mid);});
      medSave();medRender();
    };
  });

  // Wire export
  var expBtn=el.querySelector('#med-export-btn');
  if(expBtn)expBtn.onclick=function(){
    var rows=['Date,Time,Medicine,Dose'];
    medData.log.forEach(function(e){
      var m=medData.meds.find(function(x){return x.id===e.mid;})||{name:e.mname||'?',dose:''};
      var t=new Date(e.ts);
      rows.push(t.toLocaleDateString()+','+t.toLocaleTimeString()+','+m.name+','+(m.dose||''));
    });
    var txt=rows.join('\n');
    if(navigator.clipboard)navigator.clipboard.writeText(txt).then(function(){safeToast('Log copied!');});
    else{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);safeToast('Log copied!');}
    safeHap(HAP.soft);
  };

  // Wire manage delete med
  el.querySelectorAll('[data-meddelmeds]').forEach(function(btn){
    btn.onclick=function(){
      var id=this.dataset.meddelmeds;
      if(this.dataset.confirm!=='1'){
        this.textContent='?';this.style.color='rgba(255,100,100,.8)';this.dataset.confirm='1';
        var _b=this;setTimeout(function(){if(_b.dataset.confirm==='1'){_b.textContent='✕';_b.style.color='rgba(255,255,255,.25)';_b.dataset.confirm='';}},2000);
        return;
      }
      medData.meds=medData.meds.filter(function(m){return m.id!==id;});
      medSave();medRender();
    };
  });

  // Wire color pickers
  var colorInp=el.querySelector('#med-inp-color');
  el.querySelectorAll('[data-medcol]').forEach(function(dot){
    dot.onclick=function(){
      if(colorInp)colorInp.value=this.dataset.medcol;
      el.querySelectorAll('[data-medcol]').forEach(function(d){d.style.borderColor='var(--c-faint)';});
      this.style.borderColor='#fff';
    };
  });

  // Wire add med button
  var addMedBtn=el.querySelector('#med-add-btn');
  if(addMedBtn)addMedBtn.onclick=function(){
    var name=(el.querySelector('#med-inp-name').value||'').trim();
    var dose=(el.querySelector('#med-inp-dose').value||'').trim();
    var col=(el.querySelector('#med-inp-color').value)||MED_COLORS[0];
    var tmax=parseFloat(el.querySelector('#med-inp-tmax').value)||2;
    var halfLife=parseFloat(el.querySelector('#med-inp-hl').value)||8;
    if(!name)return;
    medData.meds.push({id:'med_'+Date.now(),name:name,dose:dose,color:col,tmax:tmax,halfLife:halfLife});
    medSave();medRender();
    safeHap(HAP.save);
  };
}

function medRenderPK(){
  if(!medData.meds.length||!medData.log.length)
    return '<div style="font-size:var(--t-base);color:var(--dim);padding:20px 0;text-align:center">Log some doses to see the curve.</div>';

  var W=320,H=180,PAD={t:20,r:10,b:30,l:36};
  var plotW=W-PAD.l-PAD.r, plotH=H-PAD.t-PAD.b;
  var now=new Date();
  var isolated=window._medPKIsolate||null;

  // Build time axis: last 7 days in hours from 7d ago
  var startMs=now.getTime()-7*24*3600*1000;
  var totalHours=7*24;

  // For each med, compute concentration at each hour
  var meds=medData.meds.filter(function(m){return !isolated||m.id===isolated;});
  var allCurves=[];
  var globalMax=0;

  meds.forEach(function(m){
    var tmax=m.tmax||2;
    var hl=m.halfLife||8;
    // One-compartment oral: C(t) = (ka*F*D/(Vd*(ka-ke))) * (e^(-ke*t) - e^(-ka*t))
    // Simplified: peak=1 at tmax, use ka/ke from tmax and hl
    var ke=Math.LN2/hl;
    var ka=Math.LN2/( tmax/2.5); // approximate ka so Tmax lands right
    // Scale factor so Cmax=1
    var tmax_exact=(Math.log(ka)-Math.log(ke))/(ka-ke);
    var scale=1/((Math.exp(-ke*tmax_exact)-Math.exp(-ka*tmax_exact)));

    // Get doses for this med in last 7 days
    var doses=medData.log.filter(function(e){
      return e.mid===m.id&&new Date(e.ts).getTime()>=startMs;
    });

    // Sample concentration at each half-hour
    var pts=[];
    for(var h=0;h<=totalHours;h+=0.5){
      var t_ms=startMs+h*3600000;
      var C=0;
      doses.forEach(function(dose){
        var dt=(t_ms-new Date(dose.ts).getTime())/3600000;
        if(dt<0||dt>hl*6)return;
        var c=(Math.exp(-ke*dt)-Math.exp(-ka*dt));
        if(c>0)C+=c*scale;
      });
      pts.push({h:h,C:C});
      if(C>globalMax)globalMax=C;
    }
    allCurves.push({m:m,pts:pts});
  });

  if(globalMax===0)globalMax=1;

  // Build SVG
  var svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block;overflow:visible">';

  // Background
  svg+='<rect width="'+W+'" height="'+H+'" fill="transparent"/>';

  // Grid lines (horizontal)
  for(var g=0;g<=4;g++){
    var gy=PAD.t+plotH-g/4*plotH;
    svg+='<line x1="'+PAD.l+'" y1="'+gy.toFixed(1)+'" x2="'+(PAD.l+plotW)+'" y2="'+gy.toFixed(1)+'" stroke="var(--c-ghost)" stroke-width="1"/>';
    if(g>0){
      var label=(g/4*100).toFixed(0)+'%';
      svg+='<text x="'+(PAD.l-4)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-family="monospace" font-size="7" fill="rgba(255,255,255,.3)">'+label+'</text>';
    }
  }

  // Day markers
  for(var d=0;d<=15;d++){
    var dx=PAD.l+d/15*plotW;
    svg+='<line x1="'+dx.toFixed(1)+'" y1="'+PAD.t+'" x2="'+dx.toFixed(1)+'" y2="'+(PAD.t+plotH)+'" stroke="rgba(255,255,255,.05)" stroke-width="1"/>';
    if(d%3===0&&d<15){
      var dayLabel=new Date(startMs+d*86400000).toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
      svg+='<text x="'+dx.toFixed(1)+'" y="'+(PAD.t+plotH+14)+'" text-anchor="middle" font-family="monospace" font-size="6.5" fill="rgba(255,255,255,.25)">'+dayLabel+'</text>';
    }
  }

  // X axis
  svg+='<line x1="'+PAD.l+'" y1="'+(PAD.t+plotH)+'" x2="'+(PAD.l+plotW)+'" y2="'+(PAD.t+plotH)+'" stroke="rgba(255,255,255,.2)" stroke-width="1"/>';
  // Y axis
  svg+='<line x1="'+PAD.l+'" y1="'+PAD.t+'" x2="'+PAD.l+'" y2="'+(PAD.t+plotH)+'" stroke="rgba(255,255,255,.2)" stroke-width="1"/>';

  // Draw curves
  allCurves.forEach(function(curve){
    var col=curve.m.color||'#c896ff';
    var pts=curve.pts.filter(function(p){return p.C>0.001;});
    if(!pts.length)return;

    // Build path
    var path='';
    var fillPts=[];
    curve.pts.forEach(function(p){
      var x=(PAD.l+p.h/totalHours*plotW).toFixed(1);
      var y=(PAD.t+plotH-Math.min(p.C/globalMax,1)*plotH).toFixed(1);
      fillPts.push({x:x,y:y});
      path+=(path===''?'M':'L')+x+' '+y+' ';
    });

    // Fill area under curve
    var fillPath=fillPts[0].x+' '+(PAD.t+plotH);
    fillPts.forEach(function(p){fillPath+=','+p.x+' '+p.y;});
    fillPath+=','+fillPts[fillPts.length-1].x+' '+(PAD.t+plotH);
    svg+='<polygon points="'+fillPath+'" fill="'+col+'" opacity="0.08"/>';

    // Line
    svg+='<path d="'+path+'" stroke="'+col+'" stroke-width="1.8" fill="none" opacity="'+(isolated?'0.95':'0.75')+'"/>';
  });

  // "Now" vertical line
  var nowX=(PAD.l+plotW).toFixed(1);
  svg+='<line x1="'+nowX+'" y1="'+PAD.t+'" x2="'+nowX+'" y2="'+(PAD.t+plotH)+'" stroke="rgba(255,255,255,.4)" stroke-width="1" stroke-dasharray="3,3"/>';
  svg+='<text x="'+nowX+'" y="'+(PAD.t-4)+'" text-anchor="end" font-family="monospace" font-size="7" fill="rgba(255,255,255,.4)">now</text>';

  svg+='</svg>';

  // Legend + isolate buttons
  var h='<div class="label-dim">PLASMA CONCENTRATION CURVE — LAST 15 DAYS</div>';
  h+=svg;

  h+='<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px">';
  h+='<button data-medpkiso="all" style="padding:3px 10px;font-size:var(--t-xs);font-family:monospace;cursor:pointer;border:1px solid '+(isolated?'var(--c-faint)':'rgba(255,255,255,.4)')+';background:transparent;color:'+(isolated?'var(--dim)':'var(--text)')+'">ALL</button>';
  medData.meds.forEach(function(m){
    var isol=isolated===m.id;
    h+='<button data-medpkiso="'+m.id+'" style="padding:3px 10px;font-size:var(--t-xs);font-family:monospace;cursor:pointer;border:1px solid '+(isol?m.color:'var(--c-faint)')+';color:'+(isol?m.color:'var(--dim)')+';background:'+(isol?'rgba(255,255,255,.04)':'transparent')+'">'+m.name+'</button>';
  });
  h+='</div>';

  h+='<div style="font-size:var(--t-xxs);color:rgba(255,255,255,.2);margin-top:8px;line-height:1.5">Illustrative only. Based on 1-compartment oral model using Tmax and half-life set in ⚙ MANAGE. Not clinical advice.</div>';
  return h;
}

function hexToRgb(hex){
  var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return r+','+g+','+b;
}

setTimeout(function(){medRender();},400);

// ── MEAL PREP ──
var mpData = lsGet('dash_mp', {meals:[]});
if(!mpData.meals)mpData.meals=[];
function mpSave(){ lsSet('dash_mp', mpData); }

function mpRender(){
  var el=document.getElementById('mp-body');
  var badge=document.getElementById('mp-badge');
  if(!el)return;

  var meals=mpData.meals;

  // Badge: unchecked items count
  var total=0,done=0;
  meals.forEach(function(m){
    (m.items||[]).forEach(function(it){ total++; if(it.done)done++; });
  });
  if(badge){
    if(total>0){ badge.textContent=done+'/'+total; badge.style.display=''; }
    else badge.style.display='none';
  }

  var h='';

  // Add meal input
  h+='<div style="display:flex;gap:6px;margin-bottom:12px">';
  h+='<input id="mp-new-meal" placeholder="Add a meal..." style="flex:1;background:transparent;border:1px solid rgba(255,140,66,.2);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:7px 9px;outline:none">';
  h+='<button id="mp-add-meal" style="padding:7px 12px;background:rgba(255,140,66,.08);border:1px solid rgba(255,140,66,.3);color:rgba(255,140,66,.8);font-family:monospace;font-size:var(--t-base);cursor:pointer">+</button>';
  h+='</div>';

  if(!meals.length){
    h+='<div class="empty-msg">No meals added yet.</div>';
  } else {
    meals.forEach(function(meal,mi){
      var items=meal.items||[];
      var mDone=items.filter(function(it){return it.done;}).length;
      var allDone=items.length>0&&mDone===items.length;

      h+='<div style="border:1px solid rgba(255,140,66,'+(allDone?'.4':'.15')+');background:rgba(255,140,66,'+(allDone?'.06':'.02')+');padding:10px;margin-bottom:8px">';

      // Meal header
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
      h+='<div style="font-size:var(--t-lg);color:rgba(255,140,66,.9);flex:1;font-family:monospace">'+(allDone?'✓ ':'')+meal.name+'</div>';
      if(items.length>0)h+='<span style="font-size:var(--t-xs);color:var(--dim)">'+mDone+'/'+items.length+'</span>';
      h+='<button data-mp-del-meal="'+mi+'" style="background:transparent;border:none;color:rgba(255,255,255,.2);font-size:var(--t-md);cursor:pointer">✕</button>';
      h+='</div>';

      // Checklist items
      items.forEach(function(it,ii){
        h+='<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
        h+='<div data-mp-toggle="'+mi+'-'+ii+'" style="width:16px;height:16px;border:1px solid rgba(255,140,66,'+(it.done?'.6':'.25')+');background:'+(it.done?'rgba(255,140,66,.2)':'transparent')+';cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:var(--t-sm);color:rgba(255,140,66,.8)">'+(it.done?'✓':'')+'</div>';
        h+='<span style="font-size:var(--t-base);color:'+(it.done?'var(--dim)':'var(--text)')+';flex:1;'+(it.done?'text-decoration:line-through;':'')+'">'+it.text+'</span>';
        h+='<button data-mp-del-item="'+mi+'-'+ii+'" style="background:transparent;border:none;color:var(--c-faint);font-size:var(--t-base);cursor:pointer">✕</button>';
        h+='</div>';
      });

      // Add item input
      h+='<div style="display:flex;gap:5px;margin-top:7px">';
      h+='<input data-mp-inp="'+mi+'" placeholder="Add prep step..." style="flex:1;background:transparent;border:1px solid rgba(255,255,255,.08);color:var(--text);font-family:monospace;font-size:var(--t-sm);padding:5px 7px;outline:none">';
      h+='<button data-mp-add-item="'+mi+'" style="padding:5px 10px;background:transparent;border:1px solid var(--c-border);color:var(--dim);font-family:monospace;font-size:var(--t-sm);cursor:pointer">+</button>';
      h+='</div>';

      h+='</div>';
    });

    // Clear done button if any done
    if(done>0){
      h+='<button id="mp-clear-done" style="width:100%;padding:7px;background:transparent;border:1px dashed var(--c-border);color:var(--dim);font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px;margin-top:4px">CLEAR COMPLETED ('+done+')</button>';
    }
  }

  el.innerHTML=h;

  // Wire add meal
  var addMealBtn=el.querySelector('#mp-add-meal');
  var addMealInp=el.querySelector('#mp-new-meal');
  function doAddMeal(){
    var v=(addMealInp.value||'').trim();
    if(!v)return;
    mpData.meals.push({name:v,items:[]});
    addMealInp.value='';
    safeHap(HAP.save);
    mpSave();mpRender();
  }
  if(addMealBtn)addMealBtn.onclick=doAddMeal;
  if(addMealInp)addMealInp.onkeydown=function(e){if(e.key==='Enter')doAddMeal();};

  // Wire delete meal
  el.querySelectorAll('[data-mp-del-meal]').forEach(function(btn){
    btn.onclick=function(){
      var mi=parseInt(this.dataset.mpDelMeal);
      mpData.meals.splice(mi,1);
      mpSave();mpRender();
    };
  });

  // Wire toggle item
  el.querySelectorAll('[data-mp-toggle]').forEach(function(box){
    box.onclick=function(){
      var p=this.dataset.mpToggle.split('-');
      var mi=parseInt(p[0]),ii=parseInt(p[1]);
      mpData.meals[mi].items[ii].done=!mpData.meals[mi].items[ii].done;
      safeHap(HAP.check);
      mpSave();mpRender();
    };
  });

  // Wire delete item
  el.querySelectorAll('[data-mp-del-item]').forEach(function(btn){
    btn.onclick=function(){
      var p=this.dataset.mpDelItem.split('-');
      var mi=parseInt(p[0]),ii=parseInt(p[1]);
      mpData.meals[mi].items.splice(ii,1);
      mpSave();mpRender();
    };
  });

  // Wire add item per meal
  el.querySelectorAll('[data-mp-add-item]').forEach(function(btn){
    btn.onclick=function(){
      var mi=parseInt(this.dataset.mpAddItem);
      var inp=el.querySelector('[data-mp-inp="'+mi+'"]');
      var v=(inp?inp.value||'':'').trim();
      if(!v)return;
      if(!mpData.meals[mi].items)mpData.meals[mi].items=[];
      mpData.meals[mi].items.push({text:v,done:false});
      inp.value='';
      safeHap(HAP.soft);
      mpSave();mpRender();
    };
  });
  el.querySelectorAll('[data-mp-inp]').forEach(function(inp){
    inp.onkeydown=function(e){
      if(e.key==='Enter'){
        var mi=parseInt(this.dataset.mpInp);
        var v=(this.value||'').trim();
        if(!v)return;
        if(!mpData.meals[mi].items)mpData.meals[mi].items=[];
        mpData.meals[mi].items.push({text:v,done:false});
        this.value='';
        safeHap(HAP.soft);
        mpSave();mpRender();
      }
    };
  });

  // Wire clear done
  var clearBtn=el.querySelector('#mp-clear-done');
  if(clearBtn)clearBtn.onclick=function(){
    mpData.meals.forEach(function(m){
      m.items=(m.items||[]).filter(function(it){return !it.done;});
    });
    mpSave();mpRender();
  };
}

window.addEventListener('load',function(){if(typeof mpRender==='function')mpRender();});
// ── END MEAL PREP ──

// ══════════════════════════════════════════
// BUTTON LOG CARD
// ══════════════════════════════════════════
var _blTab = 'log';

function blRender(){
  var el = document.getElementById('bl-body');
  var badge = document.getElementById('bl-badge');
  if(!el) return;
  el.style.maxHeight='700px';
  el.style.overflowY='auto';

  var log = lsGet('dash_button_log', []);
  var unsynced = log.filter(function(e){return !e._synced;}).length;
  if(badge){
    badge.textContent = log.length + ' events' + (unsynced ? ' · ' + unsynced + ' pending' : '');
    badge.style.display = '';
  }

  var h = '';

  // Tabs
  h += '<div style="display:flex;gap:6px;margin-bottom:10px">';
  ['log','trends','history'].forEach(function(t){
    var a = _blTab===t;
    h += '<span data-bltab="'+t+'" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid '+(a?'rgba(180,130,255,.5)':'var(--c-border)')+';color:'+(a?'var(--c-purple)':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+t.toUpperCase()+'</span>';
  });
  h += '</div>';

  if(_blTab === 'log'){
    if(!log.length){
      h += '<div class="empty-msg">No events logged yet.</div>';
    } else {
      var recent = log.slice().reverse().slice(0,50);
      h += '<div style="font-size:var(--t-xxs);color:var(--dim);margin-bottom:6px;letter-spacing:1px">LAST '+recent.length+' EVENTS (newest first)</div>';
      recent.forEach(function(e){
        var d = new Date(e.ts);
        var timeStr = d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
        var typeCol = e.type==='view'?'rgba(100,160,255,.7)':'rgba(180,130,255,.7)';
        var synced = e._synced?'<span style="color:rgba(0,255,136,.4);margin-left:4px">✓</span>':'<span style="color:rgba(255,200,80,.4);margin-left:4px">⏳</span>';
        h += '<div style="border-bottom:1px solid rgba(255,255,255,.05);padding:5px 0;display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:start">';
        h += '<span style="font-size:var(--t-xxs);color:'+typeCol+';text-transform:uppercase;letter-spacing:1px;padding-top:1px">'+e.type+'</span>';
        h += '<div>';
        h += '<div style="font-size:var(--t-xs);color:var(--text)">'+e.card+(e.action?' · <span style="color:var(--dim)">'+e.action+'</span>':'')+'</div>';
        if(e.detail) h += '<div style="font-size:var(--t-xxs);color:var(--dim);margin-top:1px">'+e.detail+'</div>';
        h += '<div style="font-size:var(--t-xxs);color:rgba(255,255,255,.25);margin-top:2px">'+timeStr+'</div>';
        h += '</div>';
        h += synced;
        h += '</div>';
      });
    }
  } else {
    // TRENDS tab
    if(log.length < 5){
      h += '<div class="empty-msg">Need more events for trends. Use the dashboard a bit first.</div>';
    } else {
      var cardCounts={}, cardViews={}, cardActions={};
      var hourCounts={}, dowCounts={0:0,1:0,2:0,3:0,4:0,5:0,6:0};
      var typeCounts={view:0,action:0};
      var actionTypes={};
      var todayStr2=todayKey();
      var todayCount=0, yesterdayCount=0;
      var yesterday=localDateStr(new Date(Date.now()-86400000));

      log.forEach(function(e){
        cardCounts[e.card]=(cardCounts[e.card]||0)+1;
        if(e.type==='view') cardViews[e.card]=(cardViews[e.card]||0)+1;
        if(e.type==='action') cardActions[e.card]=(cardActions[e.card]||0)+1;
        hourCounts[e.hour]=(hourCounts[e.hour]||0)+1;
        if(e.dow!==undefined) dowCounts[e.dow]=(dowCounts[e.dow]||0)+1;
        if(e.type) typeCounts[e.type]=(typeCounts[e.type]||0)+1;
        if(e.action&&e.action!=='tap'&&e.action!=='view') actionTypes[e.action]=(actionTypes[e.action]||0)+1;
        var eDate=new Date(e.ts).toISOString().slice(0,10);
        if(eDate===todayStr2) todayCount++;
        else if(eDate===yesterday) yesterdayCount++;
      });

      var topCards=Object.keys(cardCounts).sort(function(a,b){return cardCounts[b]-cardCounts[a];}).slice(0,10);
      var maxCard=cardCounts[topCards[0]]||1;

      // ── Quick stats row ──
      var unsynced=log.filter(function(e){return !e._synced;}).length;
      h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:14px">';
      [
        {label:'TOTAL',val:log.length},
        {label:'TODAY',val:todayCount},
        {label:'YESTERDAY',val:yesterdayCount},
        {label:'VIEWS',val:typeCounts.view},
        {label:'ACTIONS',val:typeCounts.action},
        {label:'PENDING',val:unsynced},
      ].forEach(function(s){
        h+='<div style="border:1px solid rgba(180,130,255,.2);padding:7px 6px;text-align:center">';
        h+='<div style="font-size:var(--t-h2);color:var(--c-purple);line-height:1">'+s.val+'</div>';
        h+='<div style="font-size:var(--t-xxs);color:var(--dim);letter-spacing:1px;margin-top:2px">'+s.label+'</div>';
        h+='</div>';
      });
      h+='</div>';

      // ── Top cards ──
      h+='<div style="font-size:var(--t-xxs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">TOP CARDS (views + actions)</div>';
      topCards.forEach(function(card){
        var pct=Math.round(cardCounts[card]/maxCard*100);
        var views=cardViews[card]||0;
        var actions=cardActions[card]||0;
        h+='<div style="margin-bottom:6px">';
        h+='<div style="display:flex;justify-content:space-between;font-size:var(--t-xxs);margin-bottom:2px">';
        h+='<span style="color:var(--text)">'+card+'</span>';
        h+='<span style="color:var(--dim)">'+cardCounts[card]+' <span style="color:rgba(100,160,255,.5)">'+views+'v</span> <span style="color:rgba(180,130,255,.5)">'+actions+'a</span></span>';
        h+='</div>';
        h+='<div style="height:3px;background:rgba(255,255,255,.06);border-radius:2px">';
        h+='<div style="height:100%;width:'+pct+'%;background:var(--c-purple);border-radius:2px"></div>';
        h+='</div></div>';
      });

      // ── Busiest hours ──
      var sortedHours=Object.keys(hourCounts).filter(function(h2){return hourCounts[h2]>0;}).sort(function(a,b){return hourCounts[b]-hourCounts[a];});
      if(sortedHours.length){
        h+='<div style="font-size:var(--t-xxs);color:var(--dim);letter-spacing:1px;margin:12px 0 6px">BUSIEST HOURS</div>';
        h+='<div style="display:flex;gap:5px;flex-wrap:wrap">';
        sortedHours.slice(0,6).forEach(function(hr){
          var hh=parseInt(hr)%12||12;
          var ampm=parseInt(hr)>=12?'pm':'am';
          h+='<span style="font-size:var(--t-xxs);padding:3px 8px;border:1px solid rgba(180,130,255,.25);color:var(--c-purple)">'+hh+ampm+' · '+hourCounts[hr]+'</span>';
        });
        h+='</div>';
      }

      // ── Day of week bar chart ──
      var dowNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      var maxDow=Math.max.apply(null,Object.values(dowCounts))||1;
      h+='<div style="font-size:var(--t-xxs);color:var(--dim);letter-spacing:1px;margin:12px 0 6px">ACTIVITY BY DAY</div>';
      h+='<div style="display:flex;gap:4px;align-items:flex-end;height:48px">';
      for(var di=0;di<7;di++){
        var ht=Math.round((dowCounts[di]||0)/maxDow*44);
        h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">';
        h+='<div style="font-size:var(--t-xxs);color:var(--dim);line-height:1">'+(dowCounts[di]||0)+'</div>';
        h+='<div style="width:100%;height:'+Math.max(ht,2)+'px;background:rgba(180,130,255,'+(ht?'.45':'.1')+');border-radius:2px 2px 0 0"></div>';
        h+='<div style="font-size:var(--t-xxs);color:var(--dim)">'+dowNames[di][0]+'</div>';
        h+='</div>';
      }
      h+='</div>';

      // ── Action type breakdown ──
      var topActions=Object.keys(actionTypes).sort(function(a,b){return actionTypes[b]-actionTypes[a];}).slice(0,6);
      if(topActions.length){
        h+='<div style="font-size:var(--t-xxs);color:var(--dim);letter-spacing:1px;margin:12px 0 6px">ACTION TYPES</div>';
        h+='<div style="display:flex;gap:5px;flex-wrap:wrap">';
        topActions.forEach(function(a){
          h+='<span style="font-size:var(--t-xxs);padding:3px 8px;border:1px solid rgba(255,255,255,.1);color:var(--dim)">'+a+' · '+actionTypes[a]+'</span>';
        });
        h+='</div>';
      }

      // ── 24h activity heatmap ──
      h+='<div style="font-size:var(--t-xxs);color:var(--dim);letter-spacing:1px;margin:12px 0 6px">24H HEATMAP</div>';
      h+='<div style="display:flex;gap:2px;flex-wrap:wrap">';
      var maxHour=Math.max.apply(null,Object.values(hourCounts))||1;
      for(var hi=0;hi<24;hi++){
        var hval=hourCounts[hi]||0;
        var opacity=hval?Math.max(0.1,hval/maxHour*0.8):0.05;
        var hh2=hi%12||12; var ampm2=hi>=12?'p':'a';
        h+='<div style="flex:1;min-width:10px;height:22px;background:rgba(180,130,255,'+opacity.toFixed(2)+');border-radius:2px;position:relative" title="'+hh2+ampm2+': '+hval+'">';
        if(hval) h+='<div style="font-size:5px;color:rgba(255,255,255,.5);text-align:center;line-height:22px">'+hval+'</div>';
        h+='</div>';
      }
      h+='</div>';
      h+='<div style="display:flex;justify-content:space-between;font-size:var(--t-xxs);color:rgba(255,255,255,.2);margin-top:2px"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span></div>';
    }
  }

  el.innerHTML = h;

  if(_blTab === 'history'){
    h += '<div style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap">';
    h += '<button id="bl-load-hist" style="background:transparent;border:1px solid rgba(180,130,255,.4);color:var(--c-purple);font-family:monospace;font-size:var(--t-xs);cursor:pointer;padding:4px 12px;letter-spacing:1px">⬇ LOAD FROM SUPABASE</button>';
    if(_blHistData&&_blHistData.length){
      h += '<button id="bl-export-hist" style="background:transparent;border:1px solid rgba(0,255,136,.3);color:var(--cg);font-family:monospace;font-size:var(--t-xs);cursor:pointer;padding:4px 12px;letter-spacing:1px">⬇ EXPORT CSV</button>';
    }
    h += '</div>';
    if(_blHistLoading){
      h += '<div style="color:var(--dim);font-size:var(--t-sm);padding:16px 0">Loading from Supabase...</div>';
    } else if(_blHistData&&_blHistData.length){
      var _hd = _blHistData;
      var _htotal = _hd.length;
      var _hcards = {};
      var _hactions = {};
      var _hhours = Array(24).fill(0);
      var _hdows = Array(7).fill(0);
      var _hdates = {};
      _hd.forEach(function(e){
        _hcards[e.card]=(_hcards[e.card]||0)+1;
        _hactions[e.action]=(_hactions[e.action]||0)+1;
        if(e.hour>=0&&e.hour<24)_hhours[e.hour]++;
        if(e.dow>=0&&e.dow<7)_hdows[e.dow]++;
        var _date=e.ts?e.ts.slice(0,10):'';
        if(_date)_hdates[_date]=(_hdates[_date]||0)+1;
      });
      // Summary
      var _hdays=Object.keys(_hdates).length;
      var _havg=_hdays>0?Math.round(_htotal/_hdays):0;
      h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">';
      [['Total Events',_htotal],['Days Active',_hdays],['Avg/Day',_havg]].forEach(function(x){
        h += '<div style="border:1px solid rgba(180,130,255,.2);padding:8px;text-align:center">';
        h += '<div style="font-size:var(--t-lg);color:var(--c-purple);font-family:monospace">'+x[1]+'</div>';
        h += '<div style="font-size:var(--t-xs);color:var(--dim)">'+x[0]+'</div></div>';
      });
      h += '</div>';
      // Top cards
      h += '<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">TOP CARDS (ALL TIME)</div>';
      var _hcardSort=Object.entries(_hcards).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
      var _hcMax=_hcardSort[0]?_hcardSort[0][1]:1;
      _hcardSort.forEach(function(x){
        h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
        h += '<div style="font-size:var(--t-xs);color:var(--text);min-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+x[0]+'</div>';
        h += '<div style="flex:1;height:6px;background:rgba(180,130,255,.1);border-radius:1px"><div style="height:100%;width:'+(x[1]/_hcMax*100).toFixed(0)+'%;background:var(--c-purple);border-radius:1px"></div></div>';
        h += '<div style="font-size:var(--t-xs);color:var(--dim);min-width:30px;text-align:right">'+x[1]+'</div></div>';
      });
      // Busiest hours
      h += '<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin:10px 0 6px">BUSIEST HOURS (ALL TIME)</div>';
      h += '<div style="display:flex;align-items:flex-end;gap:2px;height:40px">';
      var _hmaxH=Math.max.apply(null,_hhours)||1;
      _hhours.forEach(function(v,i){
        var _pct=(v/_hmaxH*100).toFixed(0);
        h += '<div style="flex:1;display:flex;flex-direction:column;align-items:center">';
        h += '<div style="width:100%;background:rgba(180,130,255,'+(v>0?'.6':'.1')+');height:'+_pct+'%;min-height:'+(v>0?'2':'0')+'px;border-radius:1px 1px 0 0" title="'+i+':00 — '+v+' events"></div>';
        h += '</div>';
      });
      h += '</div>';
      h += '<div style="display:flex;justify-content:space-between;font-size:var(--t-xxs);color:var(--dim);margin-top:2px"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>';
      // Action types
      h += '<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin:10px 0 6px">ACTION TYPES</div>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
      Object.entries(_hactions).sort(function(a,b){return b[1]-a[1];}).forEach(function(x){
        h += '<div style="font-size:var(--t-xxs);padding:2px 8px;border:1px solid rgba(180,130,255,.2);color:var(--dim)">'+x[0]+' <span style="color:var(--c-purple)">'+x[1]+'</span></div>';
      });
      h += '</div>';
      // Recent entries table
      h += '<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin:10px 0 6px">RECENT ENTRIES</div>';
      _hd.slice(0,30).forEach(function(e){
        h += '<div style="display:flex;gap:6px;font-size:var(--t-xxs);color:var(--dim);padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
        h += '<span style="color:var(--c-purple);min-width:70px">'+(e.ts?e.ts.slice(0,10):'')+'</span>';
        h += '<span style="min-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(e.card||'')+'</span>';
        h += '<span>'+(e.action||'')+'</span>';
        h += '</div>';
      });
    } else {
      h += '<div style="color:var(--dim);font-size:var(--t-sm);padding:20px 0;text-align:center">No data loaded.<br>Press LOAD FROM SUPABASE to fetch all history.</div>';
    }
  }

  // Wire tabs
  el.querySelectorAll('[data-bltab]').forEach(function(btn){
    btn.onclick = function(){
      _blTab = this.dataset.bltab;
      blData._tab = _blTab;
      blRender();
    };
  });

  // Wire history load button
  var _blLoadBtn=document.getElementById('bl-load-hist');
  if(_blLoadBtn){
    var _blLTX=0,_blLTY=0;
    _blLoadBtn.ontouchstart=function(e){_blLTX=e.touches[0].clientX;_blLTY=e.touches[0].clientY;};
    _blLoadBtn.ontouchend=function(e){
      if(Math.abs(e.changedTouches[0].clientX-_blLTX)>8||Math.abs(e.changedTouches[0].clientY-_blLTY)>8)return;
      e.preventDefault();_blLoadBtn.onclick();
    };
    _blLoadBtn.onclick=async function(){
      var cfg=sbGetConfig();
      if(!cfg||!cfg.url||!cfg.key||!cfg.account){alert('Supabase not configured');return;}
      blData._histLoading=true;blRender();
      try{
        var endpoint=cfg.url.replace(/\/+$/,'')+'/rest/v1/button_log?user_id=eq.'+encodeURIComponent(cfg.account)+'&order=ts.desc&limit=10000';
        var res=await fetch(endpoint,{headers:{'apikey':cfg.key,'Authorization':'Bearer '+cfg.key}});
        var rows=await res.json();
        blData._histData=Array.isArray(rows)?rows:[];
        blData._histLoading=false;
        blRender();
      }catch(err){
        blData._histLoading=false;
        alert('Load failed: '+err.message);
        blRender();
      }
    };
  }

  // Wire export button
  var _blExBtn=document.getElementById('bl-export-hist');
  if(_blExBtn)_blExBtn.onclick=function(){
    var rows=blData._histData||[];
    var csv='ts,dow,hour,type,card,action,detail,device_id\n';
    rows.forEach(function(e){
      csv+=[e.ts||'',e.dow||'',e.hour||'',e.type||'',e.card||'',e.action||'',(e.detail||'').replace(/,/g,';'),e.device_id||''].join(',')+'\n';
    });
    var blob=new Blob([csv],{type:'text/csv'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='button_log_'+localDateStr(new Date())+'.csv';
    a.click();
  };
}

window.addEventListener('load', function(){
  if(typeof blRender==='function') blRender();
});

// ══════════════════════════════════════════
// CONSISTENCY LOG
// ══════════════════════════════════════════
var clData = lsGet('dash_cl', {activities:[], log:{}});
if(!clData.activities) clData.activities = [];
if(!clData.log) clData.log = {};

function clSave(){ lsSet('dash_cl', clData); }
function clId(){ return 'cl_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); }
function clTodayKey(){
  var n=new Date();
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}
function clTodayDow(){ return new Date().getDay(); } // 0=Sun

function clStreak(act){
  // Count consecutive past scheduled occurrences completed
  var streak=0, longest=0, cur=0;
  var today = new Date(); today.setHours(0,0,0,0);
  // Go back 365 days
  for(var i=1; i<=365; i++){
    var d=new Date(today); d.setDate(d.getDate()-i);
    var dow=d.getDay();
    if(act.days.indexOf(dow)<0) continue; // not scheduled
    var key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    var done = clData.log[key] && clData.log[key].indexOf(act.id)>=0;
    if(done){ cur++; if(cur>longest)longest=cur; }
    else { if(streak===0)streak=cur; cur=0; }
  }
  if(streak===0)streak=cur;
  return {current:streak, longest:Math.max(longest,streak)};
}

function clWeekDots(act){
  // Last 8 weeks — return array of {scheduled, done} per week
  var weeks=[];
  var today=new Date(); today.setHours(0,0,0,0);
  for(var w=7; w>=0; w--){
    var weekDone=0, weekSched=0;
    for(var d=0; d<7; d++){
      var dt=new Date(today);
      dt.setDate(dt.getDate() - w*7 - (today.getDay()-d));
      if(dt>today) continue;
      var dow=dt.getDay();
      if(act.days.indexOf(dow)<0) continue;
      weekSched++;
      var key=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
      if(clData.log[key]&&clData.log[key].indexOf(act.id)>=0) weekDone++;
    }
    if(weekSched>0) weeks.push({sched:weekSched, done:weekDone});
  }
  return weeks;
}

function clRender(){
  var el=document.getElementById('cl-body');
  var badge=document.getElementById('cl-badge');
  if(!el) return;
  el.style.maxHeight='700px';
  el.style.overflowY='auto';

  var tab=clData._tab||'today';
  var today=clTodayKey();
  var todayDow=clTodayDow();
  var todayLog=clData.log[today]||[];
  var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Badge — completions today
  var todaySched=clData.activities.filter(function(a){return a.days.indexOf(todayDow)>=0;});
  var todayDone=todaySched.filter(function(a){return todayLog.indexOf(a.id)>=0;});
  if(badge){
    badge.textContent=todayDone.length+'/'+todaySched.length+' today';
    badge.style.display='';
  }

  var h='';

  // Tabs
  h+='<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">';
  [{t:'today',l:'TODAY'},{t:'chain',l:'CHAIN'},{t:'stats',l:'STATS'},{t:'edit',l:'EDIT'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-cltab="'+x.t+'" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid '+(a?'rgba(255,184,108,.5)':'var(--c-border)')+';color:'+(a?'var(--ca)':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='today'){
    if(!clData.activities.length){
      h+='<div style="color:var(--dim);font-size:var(--t-sm);padding:20px 0;text-align:center">No activities yet.<br>Go to EDIT to add one.</div>';
    } else {
      // Today's activities first, then others
      var sched=clData.activities.filter(function(a){return a.days.indexOf(todayDow)>=0;});
      var other=clData.activities.filter(function(a){return a.days.indexOf(todayDow)<0;});

      if(sched.length){
        h+='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">TODAY — '+DAYS[todayDow].toUpperCase()+'</div>';
        sched.forEach(function(act){
          var done=todayLog.indexOf(act.id)>=0;
          h+='<button data-cllog="'+act.id+'" style="width:100%;padding:12px;margin-bottom:6px;background:'+(done?'rgba(255,184,108,.12)':'transparent')+';border:1px solid '+(done?'rgba(255,184,108,.5)':'rgba(255,184,108,.2)')+';color:'+(done?'var(--ca)':'var(--text)')+';font-family:monospace;font-size:var(--t-base);cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px">';
          h+='<span style="font-size:var(--t-lg)">'+(done?'✓':'○')+'</span>';
          h+='<span>'+act.name+'</span>';
          h+='</button>';
        });
      }

      if(other.length){
        h+='<div style="font-size:var(--t-xs);color:rgba(255,255,255,.2);letter-spacing:1px;margin:10px 0 6px">OTHER DAYS</div>';
        other.forEach(function(act){
          var done=todayLog.indexOf(act.id)>=0;
          h+='<div style="padding:8px 10px;margin-bottom:4px;border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.3);font-size:var(--t-sm);display:flex;align-items:center;gap:8px">';
          h+='<span>'+(done?'✓':'·')+'</span><span>'+act.name+'</span>';
          h+='<span style="margin-left:auto;font-size:var(--t-xs)">'+act.days.map(function(d){return DAYS[d];}).join(', ')+'</span>';
          h+='</div>';
        });
      }
    }

  } else if(tab==='chain'){
    if(!clData.activities.length){
      h+='<div style="color:var(--dim);font-size:var(--t-sm);padding:20px 0;text-align:center">No activities yet.</div>';
    } else {
      clData.activities.forEach(function(act){
        var s=clStreak(act);
        var dots=clWeekDots(act);
        h+='<div style="border:1px solid rgba(255,184,108,.15);padding:10px;margin-bottom:8px">';
        h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
        h+='<span style="font-size:var(--t-base);color:var(--text)">'+act.name+'</span>';
        h+='<span style="font-size:var(--t-xs);color:var(--dim)">'+act.days.map(function(d){return DAYS[d];}).join(', ')+'</span>';
        h+='<span style="margin-left:auto;font-size:var(--t-xs);color:var(--ca)">🔥 '+s.current+'</span>';
        h+='</div>';
        // Week dots
        h+='<div style="display:flex;gap:4px;align-items:center">';
        dots.forEach(function(w){
          var col=w.done>=w.sched?'var(--ca)':w.done>0?'rgba(255,184,108,.4)':'rgba(255,255,255,.1)';
          h+='<div style="width:18px;height:18px;background:'+col+';border-radius:2px" title="'+w.done+'/'+w.sched+'"></div>';
        });
        h+='<span style="font-size:var(--t-xxs);color:var(--dim);margin-left:4px">←8wks</span>';
        h+='</div>';
        h+='</div>';
      });
    }

  } else if(tab==='stats'){
    if(!clData.activities.length){
      h+='<div style="color:var(--dim);font-size:var(--t-sm);padding:20px 0;text-align:center">No activities yet.</div>';
    } else {
      clData.activities.forEach(function(act){
        var s=clStreak(act);
        // Count total scheduled vs done
        var totalSched=0, totalDone=0;
        Object.keys(clData.log).forEach(function(dateKey){
          var d=new Date(dateKey+'T00:00:00');
          if(act.days.indexOf(d.getDay())>=0){
            totalSched++;
            if(clData.log[dateKey].indexOf(act.id)>=0) totalDone++;
          }
        });
        var rate=totalSched>0?Math.round(totalDone/totalSched*100):0;
        h+='<div style="border:1px solid rgba(255,184,108,.15);padding:10px;margin-bottom:8px">';
        h+='<div style="font-size:var(--t-base);color:var(--text);margin-bottom:8px">'+act.name+'</div>';
        h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px">';
        [
          ['Current','🔥 '+s.current],
          ['Best','⭐ '+s.longest],
          ['Done',totalDone],
          ['Rate',rate+'%']
        ].forEach(function(x){
          h+='<div style="text-align:center;border:1px solid rgba(255,184,108,.1);padding:6px">';
          h+='<div style="font-size:var(--t-md);color:var(--ca);font-family:monospace">'+x[1]+'</div>';
          h+='<div style="font-size:var(--t-xxs);color:var(--dim)">'+x[0]+'</div>';
          h+='</div>';
        });
        h+='</div>';
        // Mini progress bar
        h+='<div style="margin-top:8px;height:3px;background:rgba(255,184,108,.1);border-radius:1px">';
        h+='<div style="height:100%;width:'+rate+'%;background:var(--ca);border-radius:1px;transition:width .4s"></div>';
        h+='</div>';
        h+='</div>';
      });
    }

  } else if(tab==='edit'){
    // Add new activity
    h+='<div style="margin-bottom:12px;padding:10px;border:1px solid rgba(255,184,108,.2)">';
    h+='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">ADD ACTIVITY</div>';
    h+='<input id="cl-new-name" placeholder="Activity name..." style="width:100%;box-sizing:border-box;background:transparent;border:1px solid rgba(255,184,108,.2);color:var(--text);font-family:monospace;font-size:var(--t-sm);padding:6px 8px;outline:none;margin-bottom:6px">';
    h+='<div style="display:flex;gap:4px;margin-bottom:8px">';
    DAYS.forEach(function(d,i){
      h+='<button data-clday="'+i+'" style="flex:1;padding:4px 2px;background:transparent;border:1px solid rgba(255,184,108,.2);color:var(--dim);font-family:monospace;font-size:var(--t-xxs);cursor:pointer">'+d+'</button>';
    });
    h+='</div>';
    h+='<button id="cl-add-btn" style="width:100%;padding:8px;background:rgba(255,184,108,.08);border:1px solid rgba(255,184,108,.3);color:var(--ca);font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px">+ ADD</button>';
    h+='</div>';

    // Existing activities
    if(clData.activities.length){
      h+='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">ACTIVITIES</div>';
      clData.activities.forEach(function(act){
        h+='<div style="border:1px solid rgba(255,255,255,.07);padding:8px;margin-bottom:6px">';
        h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">';
        h+='<input data-clrename="'+act.id+'" value="'+act.name.replace(/"/g,'&quot;')+'" style="flex:1;background:transparent;border:1px solid rgba(255,255,255,.08);color:var(--text);font-family:monospace;font-size:var(--t-sm);padding:4px 6px;outline:none">';
        h+='<button data-cldel="'+act.id+'" style="background:transparent;border:none;color:rgba(255,255,255,.2);font-size:var(--t-md);cursor:pointer">✕</button>';
        h+='</div>';
        h+='<div style="display:flex;gap:4px">';
        DAYS.forEach(function(d,i){
          var active=act.days.indexOf(i)>=0;
          h+='<button data-cldaytog="'+act.id+'" data-dow="'+i+'" style="flex:1;padding:3px 2px;background:'+(active?'rgba(255,184,108,.15)':'transparent')+';border:1px solid '+(active?'rgba(255,184,108,.5)':'rgba(255,255,255,.08)')+';color:'+(active?'var(--ca)':'var(--dim)')+';font-family:monospace;font-size:var(--t-xxs);cursor:pointer">'+d+'</button>';
        });
        h+='</div>';
        h+='</div>';
      });
    }
  }

  el.innerHTML=h;

  // Wire tabs
  el.querySelectorAll('[data-cltab]').forEach(function(btn){
    btn.onclick=function(){clData._tab=this.dataset.cltab;clSave();clRender();};
  });

  if(tab==='today'){
    // Wire log buttons — scroll-safe
    el.querySelectorAll('[data-cllog]').forEach(function(btn){
      var _tx=0,_ty=0;
      btn.ontouchstart=function(e){_tx=e.touches[0].clientX;_ty=e.touches[0].clientY;};
      btn.ontouchend=function(e){
        if(Math.abs(e.changedTouches[0].clientX-_tx)>8||Math.abs(e.changedTouches[0].clientY-_ty)>8)return;
        e.preventDefault();e.stopPropagation();
        var id=this.dataset.cllog;
        var log=clData.log[today]||[];
        var idx=log.indexOf(id);
        if(idx>=0) log.splice(idx,1);
        else log.push(id);
        clData.log[today]=log;
        safeHap(idx>=0?HAP.soft:HAP.check);
        clSave();clRender();
      };
      btn.onclick=function(e){if(e.detail===0)return;
        var id=this.dataset.cllog;
        var log=clData.log[today]||[];
        var idx=log.indexOf(id);
        if(idx>=0) log.splice(idx,1);
        else log.push(id);
        clData.log[today]=log;
        safeHap(idx>=0?HAP.soft:HAP.check);
        clSave();clRender();
      };
    });
  }

  if(tab==='edit'){
    // Day toggles for new activity
    var _newDays=clData._newDays||[];
    el.querySelectorAll('[data-clday]').forEach(function(btn){
      var dow=parseInt(btn.dataset.clday);
      if(_newDays.indexOf(dow)>=0){btn.style.background='rgba(255,184,108,.15)';btn.style.borderColor='rgba(255,184,108,.5)';btn.style.color='var(--ca)';}
      btn.onclick=function(){
        var d=parseInt(this.dataset.clday);
        var idx=_newDays.indexOf(d);
        if(idx>=0)_newDays.splice(idx,1); else _newDays.push(d);
        clData._newDays=_newDays;
        clRender();
      };
    });

    // Add activity button — scroll-safe
    var addBtn=document.getElementById('cl-add-btn');
    if(addBtn){
      var _atx=0,_aty=0;
      addBtn.ontouchstart=function(e){_atx=e.touches[0].clientX;_aty=e.touches[0].clientY;};
      addBtn.ontouchend=function(e){
        if(Math.abs(e.changedTouches[0].clientX-_atx)>8||Math.abs(e.changedTouches[0].clientY-_aty)>8)return;
        e.preventDefault();addBtn.onclick();
      };
      addBtn.onclick=function(){
        var name=(document.getElementById('cl-new-name')||{}).value||'';
        name=name.trim();
        if(!name){alert('Enter a name');return;}
        var days=clData._newDays||[];
        if(!days.length){alert('Pick at least one day');return;}
        clData.activities.push({id:clId(),name:name,days:days.slice()});
        clData._newDays=[];
        clSave();clRender();
      };
    }

    // Rename inputs
    el.querySelectorAll('[data-clrename]').forEach(function(inp){
      inp.oninput=function(){
        var id=this.dataset.clrename;
        var act=clData.activities.find(function(a){return a.id===id;});
        if(act)act.name=this.value;
        clSave();
      };
    });

    // Delete buttons
    el.querySelectorAll('[data-cldel]').forEach(function(btn){
      btn.onclick=function(){
        var id=this.dataset.cldel;
        clData.activities=clData.activities.filter(function(a){return a.id!==id;});
        clSave();clRender();
      };
    });

    // Day toggles for existing activities
    el.querySelectorAll('[data-cldaytog]').forEach(function(btn){
      btn.onclick=function(){
        var id=this.dataset.cldaytog;
        var dow=parseInt(this.dataset.dow);
        var act=clData.activities.find(function(a){return a.id===id;});
        if(!act)return;
        var idx=act.days.indexOf(dow);
        if(idx>=0) act.days.splice(idx,1); else act.days.push(dow);
        clSave();clRender();
      };
    });
  }
}

window.addEventListener('load',function(){if(typeof clRender==='function')clRender();});
// ══════════════════════════════════════════

// ══════════════════════════════════════════
// SEMESTER TRACKER
// ══════════════════════════════════════════
var semData = lsGet('dash_sem', {subjects:[], _active:null, _tab:'progress'});
if(!semData.subjects) semData.subjects = [];

function semSave(){ lsSet('dash_sem', semData); }
function semId(){ return 's_'+Date.now()+'_'+Math.random().toString(36).slice(2,5); }

function semGetActive(){
  if(!semData.subjects.length) return null;
  var found = semData.subjects.find(function(s){ return s.id===semData._active; });
  var result = found || semData.subjects[0];
  if(result && semData._active !== result.id){ semData._active=result.id; semSave(); }
  return result;
}

function semRender(){
  var el = document.getElementById('sem-body');
  var badge = document.getElementById('sem-badge');
  if(!el) return;
  el.style.maxHeight = '700px';
  el.style.overflowY = 'auto';

  var tab = semData._tab || 'progress';
  var active = semGetActive();
  var CA = '#00e5ff';
  var CB = 'rgba(0,229,255,';

  // Badge
  if(badge){
    if(active){
      var done = active.chapters.filter(function(c){return c.t&&c.a&&c.s;}).length;
      badge.textContent = done+'/'+active.chapters.length+' done';
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  var h = '';

  // Subject selector (dropdown style)
  if(semData.subjects.length){
    h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">';
    semData.subjects.forEach(function(sub){
      var isAct = active && sub.id === active.id;
      h += '<button data-semsub="'+sub.id+'" style="font-size:var(--t-xs);padding:3px 10px;background:'+(isAct?CB+'.12)':'transparent')+';border:1px solid '+(isAct?CB+'.5)':'var(--c-border)')+';color:'+(isAct?CA:'var(--dim)')+';cursor:pointer;font-family:monospace;letter-spacing:1px">'+sub.name+'</button>';
    });
    h += '</div>';
  }

  // Tabs
  h += '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">';
  [{t:'progress',l:'PROGRESS'},{t:'edit',l:'EDIT'}].forEach(function(x){
    var a = tab===x.t;
    h += '<button data-semtab="'+x.t+'" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid '+(a?CB+'.5)':'var(--c-border)')+';color:'+(a?CA:'var(--dim)')+';cursor:pointer;letter-spacing:1px;background:'+(a?CB+'.08)':'transparent')+';font-family:monospace">'+x.l+'</button>';
  });
  h += '</div>';

  if(!semData.subjects.length && tab!=='edit'){
    h += '<div style="color:var(--dim);font-size:var(--t-sm);padding:20px 0;text-align:center">No subjects yet.<br>Go to EDIT to add one.</div>';
  } else if(!active && tab!=='edit'){
    h += '<div style="color:var(--dim);font-size:var(--t-sm);padding:20px 0;text-align:center">Select a subject above.</div>';
  } else if(tab==='progress'){
    // Progress bar
    var totalCh = active.chapters.length;
    var fullyDone = active.chapters.filter(function(c){return c.t&&c.a&&c.s;}).length;
    var pct = totalCh ? Math.round(fullyDone/totalCh*100) : 0;
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">';
    h += '<div style="flex:1;height:5px;background:'+CB+'.1);border-radius:2px">';
    h += '<div style="height:100%;width:'+pct+'%;background:'+CA+';border-radius:2px;transition:width .4s"></div>';
    h += '</div>';
    h += '<span style="font-size:var(--t-xs);color:var(--dim)">'+pct+'%</span>';
    h += '</div>';

    if(!active.chapters.length){
      h += '<div style="color:var(--dim);font-size:var(--t-sm);padding:12px 0;text-align:center">No chapters yet. Add them in EDIT.</div>';
    } else {
      // Column headers
      h += '<div style="display:flex;align-items:center;gap:6px;padding:0 4px;margin-bottom:4px">';
      h += '<div style="flex:1;font-size:var(--t-xxs);color:var(--dim)">CHAPTER</div>';
      h += '<div style="font-size:var(--t-xxs);color:#ffcc00;width:52px;text-align:center;letter-spacing:1px">GPT NOTES</div>';
      h += '<div style="font-size:var(--t-xxs);color:#00e5ff;width:52px;text-align:center;letter-spacing:1px">ANKI</div>';
      h += '<div style="font-size:var(--t-xxs);color:#00ff88;width:52px;text-align:center;letter-spacing:1px">STUDY</div>';
      h += '</div>';

      active.chapters.forEach(function(ch, idx){
        var allDone = ch.t&&ch.a&&ch.s;
        h += '<div style="display:flex;align-items:center;gap:6px;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.04);background:'+(allDone?CB+'.04)':'transparent')+';">';
        h += '<div style="flex:1;font-size:var(--t-sm);color:'+(allDone?CA:'var(--text)')+';line-height:1.3">'+ch.title+'</div>';
        var _stageColors={t:'#ffcc00',a:'#00e5ff',s:'#00ff88'};
        ['t','a','s'].forEach(function(stage){
          var done=ch[stage];
          var sc=_stageColors[stage];
          h += '<button data-semstage data-chid="'+ch.id+'" data-subid="'+active.id+'" data-stage="'+stage+'" style="width:52px;height:28px;flex-shrink:0;background:'+(done?'rgba('+hexToRgb(sc)+',.12)':'transparent')+';border:1px solid '+(done?sc:'rgba(255,255,255,.1)')+';color:'+(done?sc:'rgba(255,255,255,.2)')+';font-family:monospace;font-size:var(--t-xs);cursor:pointer;border-radius:2px">'+(done?'✓':'·')+'</button>';
        });
        h += '</div>';
      });
    }

  } else if(tab==='edit'){
    // Add subject
    h += '<div style="margin-bottom:10px;padding:8px;border:1px solid '+CB+'.15)">';
    h += '<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">ADD SUBJECT</div>';
    h += '<div style="display:flex;gap:6px">';
    h += '<input id="sem-new-sub" placeholder="Subject name..." style="flex:1;background:transparent;border:1px solid '+CB+'.2);color:var(--text);font-family:monospace;font-size:var(--t-sm);padding:5px 8px;outline:none">';
    h += '<button id="sem-add-sub" style="padding:5px 12px;background:'+CB+'.08);border:1px solid '+CB+'.3);color:'+CA+';font-family:monospace;font-size:var(--t-xs);cursor:pointer">ADD</button>';
    h += '</div></div>';
    // Export to clipboard
    if(active&&active.chapters.length){
      h += '<button id="sem-export" style="width:100%;padding:7px;margin-bottom:10px;background:transparent;border:1px solid rgba(0,229,255,.2);color:rgba(0,229,255,.6);font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px">📋 COPY PROGRESS TO CLIPBOARD</button>';
    }

    if(active){
      // Rename subject
      h += '<div style="margin-bottom:10px;padding:8px;border:1px solid rgba(255,255,255,.07)">';
      h += '<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">RENAME: '+active.name+'</div>';
      h += '<div style="display:flex;gap:6px">';
      h += '<input id="sem-rename-sub" value="'+active.name.replace(/"/g,'&quot;')+'" style="flex:1;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--text);font-family:monospace;font-size:var(--t-sm);padding:5px 8px;outline:none">';
      h += '<button id="sem-save-rename" style="padding:5px 10px;background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--dim);font-family:monospace;font-size:var(--t-xs);cursor:pointer">SAVE</button>';
      h += '<button id="sem-del-sub" style="padding:5px 10px;background:transparent;border:1px solid rgba(255,68,68,.3);color:rgba(255,68,68,.6);font-family:monospace;font-size:var(--t-xs);cursor:pointer">DELETE</button>';
      h += '</div></div>';

      // Import chapters
      h += '<div style="margin-bottom:10px;padding:8px;border:1px solid '+CB+'.15)">';
      h += '<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">IMPORT CHAPTERS (one per line)</div>';
      h += '<textarea id="sem-import-ta" placeholder="Introduction\nCell Biology\nGenetics\n..." style="width:100%;box-sizing:border-box;background:transparent;border:1px solid '+CB+'.2);color:var(--text);font-family:monospace;font-size:var(--t-sm);padding:6px 8px;outline:none;resize:none;min-height:80px;margin-bottom:6px"></textarea>';
      h += '<div style="display:flex;gap:6px">';
      h += '<button id="sem-import-append" style="flex:1;padding:6px;background:'+CB+'.06);border:1px solid '+CB+'.3);color:'+CA+';font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px">+ APPEND</button>';
      h += '<button id="sem-import-replace" style="flex:1;padding:6px;background:transparent;border:1px solid rgba(255,68,68,.3);color:rgba(255,68,68,.6);font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px">↺ REPLACE ALL</button>';
      h += '</div></div>';

      // Chapter list with delete
      if(active.chapters.length){
        h += '<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">CHAPTERS ('+active.chapters.length+')</div>';
        active.chapters.forEach(function(ch, idx){
          h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
          h += '<div style="font-size:var(--t-xxs);color:rgba(255,255,255,.2);min-width:20px;text-align:right">'+(idx+1)+'</div>';
          h += '<input data-semrench="'+ch.id+'" value="'+ch.title.replace(/"/g,'&quot;')+'" style="flex:1;background:transparent;border:1px solid rgba(255,255,255,.07);color:var(--text);font-family:monospace;font-size:var(--t-xs);padding:3px 6px;outline:none">';
          h += '<button data-semdch="'+ch.id+'" style="background:transparent;border:none;color:rgba(255,255,255,.15);font-size:var(--t-md);cursor:pointer">✕</button>';
          h += '</div>';
        });
      }
    }
  }

  el.innerHTML = h;

  // Wire subject switcher
  el.querySelectorAll('[data-semsub]').forEach(function(btn){
    btn.onclick=function(){semData._active=this.dataset.semsub;semSave();semRender();};
  });

  // Wire tabs
  el.querySelectorAll('[data-semtab]').forEach(function(btn){
    var _stx=0,_sty=0;
    btn.ontouchstart=function(e){_stx=e.touches[0].clientX;_sty=e.touches[0].clientY;};
    btn.ontouchend=function(e){
      if(Math.abs(e.changedTouches[0].clientX-_stx)>8||Math.abs(e.changedTouches[0].clientY-_sty)>8)return;
      e.preventDefault();semData._tab=this.dataset.semtab;semSave();semRender();
    };
    btn.onclick=function(e){if(e.detail===0)return;semData._tab=this.dataset.semtab;semSave();semRender();};
  });

  if(tab==='progress'){
    // Stage toggle buttons — scroll-safe
    el.querySelectorAll('[data-semstage]').forEach(function(btn){
      var _tx=0,_ty=0;
      btn.ontouchstart=function(e){_tx=e.touches[0].clientX;_ty=e.touches[0].clientY;};
      btn.ontouchend=function(e){
        if(Math.abs(e.changedTouches[0].clientX-_tx)>8||Math.abs(e.changedTouches[0].clientY-_ty)>8)return;
        e.preventDefault();semToggle(this);
      };
      btn.onclick=function(e){if(e.detail===0)return;semToggle(this);};
    });
  }

  if(tab==='edit'){
    // Add subject
    var addSubBtn = document.getElementById('sem-add-sub');
    if(addSubBtn){
      var _asTX=0,_asTY=0;
      addSubBtn.ontouchstart=function(e){_asTX=e.touches[0].clientX;_asTY=e.touches[0].clientY;};
      addSubBtn.ontouchend=function(e){
        if(Math.abs(e.changedTouches[0].clientX-_asTX)>8||Math.abs(e.changedTouches[0].clientY-_asTY)>8)return;
        e.preventDefault();addSubBtn.onclick();
      };
      addSubBtn.onclick=function(){
        var name=(document.getElementById('sem-new-sub')||{}).value||'';
        name=name.trim();if(!name)return;
        var sub={id:semId(),name:name,chapters:[]};
        semData.subjects.push(sub);
        semData._active=sub.id;
        document.getElementById('sem-new-sub').value='';
        semSave();semRender();
      };
    }

    // Export to clipboard
    var expBtn=document.getElementById('sem-export');
    if(expBtn) expBtn.onclick=function(){
      var a2=semGetActive();if(!a2)return;
      var lines=[a2.name,''];
      a2.chapters.forEach(function(ch,i){
        lines.push((i+1)+'. '+ch.title+'  [T:'+(ch.t?'✓':'○')+' A:'+(ch.a?'✓':'○')+' S:'+(ch.s?'✓':'○')+']');
      });
      var done=a2.chapters.filter(function(c){return c.t&&c.a&&c.s;}).length;
      lines.push('','Total: '+done+'/'+a2.chapters.length+' complete');
      navigator.clipboard.writeText(lines.join('\n')).then(function(){
        expBtn.textContent='✓ COPIED!';
        setTimeout(function(){expBtn.textContent='📋 COPY PROGRESS TO CLIPBOARD';},2000);
      });
    };

    if(active){
      // Rename
      var saveRen=document.getElementById('sem-save-rename');
      if(saveRen) saveRen.onclick=function(){
        var v=(document.getElementById('sem-rename-sub')||{}).value||'';
        if(v.trim())active.name=v.trim();
        semSave();semRender();
      };

      // Delete subject
      var delSub=document.getElementById('sem-del-sub');
      if(delSub) delSub.onclick=function(){
        if(!confirm('Delete '+active.name+'?'))return;
        semData.subjects=semData.subjects.filter(function(s){return s.id!==active.id;});
        semData._active=semData.subjects.length?semData.subjects[0].id:null;
        semSave();semRender();
      };

      // Import append
      var impApp=document.getElementById('sem-import-append');
      if(impApp){
        var _iaTX=0,_iaTY=0;
        impApp.ontouchstart=function(e){_iaTX=e.touches[0].clientX;_iaTY=e.touches[0].clientY;};
        impApp.ontouchend=function(e){
          if(Math.abs(e.changedTouches[0].clientX-_iaTX)>8||Math.abs(e.changedTouches[0].clientY-_iaTY)>8)return;
          e.preventDefault();impApp.onclick();
        };
        impApp.onclick=function(){
          var ta=document.getElementById('sem-import-ta');
          if(!ta||!ta.value.trim())return;
          ta.value.split('\n').forEach(function(line){
            line=line.trim();if(!line)return;
            active.chapters.push({id:semId(),title:line,t:false,a:false,s:false});
          });
          ta.value='';semSave();semRender();
        };
      }

      // Import replace
      var impRep=document.getElementById('sem-import-replace');
      if(impRep){
        var _irTX=0,_irTY=0;
        impRep.ontouchstart=function(e){_irTX=e.touches[0].clientX;_irTY=e.touches[0].clientY;};
        impRep.ontouchend=function(e){
          if(Math.abs(e.changedTouches[0].clientX-_irTX)>8||Math.abs(e.changedTouches[0].clientY-_irTY)>8)return;
          e.preventDefault();impRep.onclick();
        };
        impRep.onclick=function(){
          var ta=document.getElementById('sem-import-ta');
          if(!ta||!ta.value.trim())return;
          if(!confirm('Replace all chapters in '+active.name+'?'))return;
          active.chapters=[];
          ta.value.split('\n').forEach(function(line){
            line=line.trim();if(!line)return;
            active.chapters.push({id:semId(),title:line,t:false,a:false,s:false});
          });
          ta.value='';semSave();semRender();
        };
      }

      // Rename chapter inputs
      el.querySelectorAll('[data-semrench]').forEach(function(inp){
        inp.oninput=function(){
          var ch=active.chapters.find(function(c){return c.id===this.dataset.semrench;},this);
          if(ch)ch.title=this.value;
          semSave();
        };
      });

      // Delete chapter
      el.querySelectorAll('[data-semdch]').forEach(function(btn){
        btn.onclick=function(){
          var id=this.dataset.semdch;
          active.chapters=active.chapters.filter(function(c){return c.id!==id;});
          semSave();semRender();
        };
      });
    }
  }
}

function semToggle(btn){
  var subId=btn.dataset.subid, chId=btn.dataset.chid, stage=btn.dataset.stage;
  var sub=semData.subjects.find(function(s){return s.id===subId;});
  if(!sub)return;
  var ch=sub.chapters.find(function(c){return c.id===chId;});
  if(!ch)return;
  ch[stage]=!ch[stage];
  if(ch[stage]){
    safeHap(HAP.check);
    var stageColors={t:'#ffcc00',a:'#00e5ff',s:'#00ff88'};
    var r=btn.getBoundingClientRect();
    if(typeof confetti==='function')confetti(r.left+r.width/2,r.top+r.height/2,stageColors[stage]);
  } else {
    safeHap(HAP.soft);
  }
  semSave();semRender();
}

window.addEventListener('load',function(){if(typeof semRender==='function')semRender();});
// ══════════════════════════════════════════

// ══════════════════════════════════════════
// LETTER TO MY SON
// ══════════════════════════════════════════
var ltsData = lsGet('dash_lts', {entries:[]});
if(!ltsData.entries) ltsData.entries = [];

function ltsSave(){ lsSet('dash_lts', ltsData); }
function ltsId(){ return 'lts_'+Date.now()+'_'+Math.random().toString(36).slice(2,5); }

function ltsRender(){
  var el = document.getElementById('lts-body');
  var badge = document.getElementById('lts-badge');
  if(!el) return;
  el.style.maxHeight = '700px';
  el.style.overflowY = 'auto';

  var CG = 'var(--cg)';
  var CB = 'rgba(0,255,136,';
  var tab = ltsData._tab || 'write';
  var entries = ltsData.entries || [];

  if(badge){
    badge.textContent = entries.length + (entries.length===1?' entry':' entries');
    badge.style.display = '';
  }

  var h = '';

  // Tabs
  h += '<div style="display:flex;gap:6px;margin-bottom:10px">';
  [{t:'write',l:'WRITE'},{t:'log',l:'LOG'},{t:'stats',l:'STATS'},{t:'export',l:'EXPORT'}].forEach(function(x){
    var a = tab===x.t;
    h += '<button data-ltstab="'+x.t+'" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid '+(a?CB+'.5)':'var(--c-border)')+';color:'+(a?'var(--cg)':'var(--dim)')+';cursor:pointer;background:'+(a?CB+'.08)':'transparent')+';font-family:monospace;letter-spacing:1px">'+x.l+'</button>';
  });
  h += '</div>';

  if(tab === 'write'){
    h += '<input id="lts-title" placeholder="Title..." style="width:100%;box-sizing:border-box;background:transparent;border:1px solid '+CB+'.2);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:6px 8px;outline:none;margin-bottom:6px">';
    h += '<textarea id="lts-body-inp" placeholder="Dear son..." style="width:100%;box-sizing:border-box;background:transparent;border:1px solid '+CB+'.15);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:8px;outline:none;resize:none;min-height:140px;line-height:1.6;margin-bottom:8px"></textarea>';
    h += '<button id="lts-save-btn" style="width:100%;padding:9px;background:'+CB+'.06);border:1px solid '+CB+'.3);color:var(--cg);font-family:monospace;font-size:var(--t-base);cursor:pointer;letter-spacing:1px">💚 SAVE ENTRY</button>';

  } else {
    if(!entries.length){
      h += '<div style="color:var(--dim);font-size:var(--t-sm);padding:20px 0;text-align:center">No entries yet.</div>';
    } else {
      entries.forEach(function(e){
        var editing = ltsData._editing === e.id;
        h += '<div style="border-bottom:1px solid rgba(0,255,136,.08);padding:12px 0">';
        h += '<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px">';
        h += '<div style="flex:1">';
        h += '<div style="font-size:var(--t-base);color:var(--cg);font-family:monospace;margin-bottom:2px">'+e.title+'</div>';
        h += '<div style="font-size:var(--t-xxs);color:var(--dim)">'+e.date+'&nbsp;&nbsp;'+e.time+'</div>';
        h += '</div>';
        h += '<button data-ltsedit="'+e.id+'" style="background:transparent;border:none;color:rgba(255,255,255,.25);font-size:var(--t-sm);cursor:pointer;padding:0 4px">✏️</button>';
        h += '<button data-ltsdel="'+e.id+'" style="background:transparent;border:none;color:rgba(255,255,255,.2);font-size:var(--t-base);cursor:pointer;padding:0 2px">✕</button>';
        h += '</div>';
        if(editing){
          h += '<input id="lts-edit-title-'+e.id+'" value="'+e.title.replace(/"/g,'&quot;')+'" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid '+CB+'.2);color:var(--text);font-family:monospace;font-size:var(--t-sm);padding:5px 8px;outline:none;margin-bottom:6px">';
          h += '<textarea id="lts-edit-body-'+e.id+'" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid '+CB+'.15);color:var(--text);font-family:monospace;font-size:var(--t-sm);padding:6px 8px;outline:none;resize:none;min-height:100px;line-height:1.6;margin-bottom:6px">'+e.body+'</textarea>';
          h += '<button data-ltssaveedit="'+e.id+'" style="padding:5px 14px;background:'+CB+'.06);border:1px solid '+CB+'.3);color:var(--cg);font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px">SAVE</button>';
          h += '<button data-ltscanceledit="'+e.id+'" style="padding:5px 12px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;font-size:var(--t-xs);cursor:pointer;margin-left:6px">CANCEL</button>';
        } else {
          h += '<div style="font-size:var(--t-sm);color:var(--text);line-height:1.7;white-space:pre-wrap">'+e.body+'</div>';
        }
        h += '</div>';
      });
    }
  }

  if(tab==='stats'){
    if(!entries.length){
      h += '<div style="color:var(--dim);font-size:var(--t-sm);padding:20px 0;text-align:center">No entries yet.</div>';
    } else {
      // Totals
      var totalWords=entries.reduce(function(a,e){return a+(e.body?e.body.trim().split(/\s+/).filter(Boolean).length:0);},0);
      var avgWords=Math.round(totalWords/entries.length);
      var firstDate=entries[entries.length-1].date;
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">';
      [
        ['Total Entries', entries.length],
        ['Total Words', totalWords.toLocaleString()],
        ['Avg Words/Entry', avgWords],
        ['Since', firstDate]
      ].forEach(function(x){
        h += '<div style="border:1px solid rgba(0,255,136,.12);padding:10px;text-align:center">';
        h += '<div style="font-size:var(--t-md);color:var(--cg);font-family:monospace">'+x[1]+'</div>';
        h += '<div style="font-size:var(--t-xxs);color:var(--dim);margin-top:2px">'+x[0]+'</div>';
        h += '</div>';
      });
      h += '</div>';
      // Entries per month
      var byMonth={};
      entries.forEach(function(e){
        var m=e.date?e.date.slice(0,7):'';
        if(m) byMonth[m]=(byMonth[m]||0)+1;
      });
      var months=Object.keys(byMonth).sort().reverse();
      var maxM=Math.max.apply(null,Object.values(byMonth))||1;
      h += '<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">ENTRIES PER MONTH</div>';
      months.forEach(function(m){
        var n=byMonth[m];
        var pct=(n/maxM*100).toFixed(0);
        var label=new Date(m+'-02').toLocaleDateString('en-US',{month:'short',year:'numeric'});
        h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">';
        h += '<div style="font-size:var(--t-xs);color:var(--dim);min-width:70px">'+label+'</div>';
        h += '<div style="flex:1;height:8px;background:rgba(0,255,136,.08);border-radius:2px">';
        h += '<div style="height:100%;width:'+pct+'%;background:var(--cg);border-radius:2px"></div></div>';
        h += '<div style="font-size:var(--t-xs);color:var(--cg);min-width:20px;text-align:right">'+n+'</div>';
        h += '</div>';
      });
      // Longest entry
      var longest=entries.slice().sort(function(a,b){
        return (b.body?b.body.split(/\s+/).length:0)-(a.body?a.body.split(/\s+/).length:0);
      })[0];
      if(longest){
        h += '<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin:10px 0 6px">LONGEST ENTRY</div>';
        h += '<div style="border:1px solid rgba(0,255,136,.12);padding:8px">';
        h += '<div style="font-size:var(--t-sm);color:var(--cg)">'+longest.title+'</div>';
        h += '<div style="font-size:var(--t-xxs);color:var(--dim)">'+longest.date+' · '+(longest.body?longest.body.trim().split(/\s+/).filter(Boolean).length:0)+' words</div>';
        h += '</div>';
      }
    }
  }

  if(tab==='export'){
    var hasEntries = entries.length > 0;
    h += '<div style="margin-bottom:12px;font-size:var(--t-xs);color:var(--dim);line-height:1.6">';
    h += entries.length + ' entries · sorted oldest to newest by year and season';
    h += '</div>';
    h += '<button id="lts-export-md" style="width:100%;padding:10px;background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.3);color:var(--cg);font-family:monospace;font-size:var(--t-sm);cursor:pointer;letter-spacing:1px;margin-bottom:8px"'+(hasEntries?'':' disabled')+'>⬇ EXPORT MARKDOWN</button>';
    h += '<button id="lts-export-epub" style="width:100%;padding:10px;background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.3);color:#00e5ff;font-family:monospace;font-size:var(--t-sm);cursor:pointer;letter-spacing:1px"'+(hasEntries?'':' disabled')+'>⬇ EXPORT EPUB</button>';
    if(!hasEntries) h += '<div style="color:var(--dim);font-size:var(--t-xs);margin-top:10px;text-align:center">No entries to export yet.</div>';
  }

  el.innerHTML = h;

  // Wire tabs
  el.querySelectorAll('[data-ltstab]').forEach(function(btn){
    var _tx=0,_ty=0;
    btn.ontouchstart=function(e){_tx=e.touches[0].clientX;_ty=e.touches[0].clientY;};
    btn.ontouchend=function(e){
      if(Math.abs(e.changedTouches[0].clientX-_tx)>8||Math.abs(e.changedTouches[0].clientY-_ty)>8)return;
      e.preventDefault();ltsData._tab=this.dataset.ltstab;ltsSave();ltsRender();
    };
    btn.onclick=function(e){if(e.detail===0)return;ltsData._tab=this.dataset.ltstab;ltsSave();ltsRender();};
  });

  if(tab==='write'){
    var saveBtn = document.getElementById('lts-save-btn');
    if(saveBtn){
      var _stx=0,_sty=0;
      saveBtn.ontouchstart=function(e){_stx=e.touches[0].clientX;_sty=e.touches[0].clientY;};
      saveBtn.ontouchend=function(e){
        if(Math.abs(e.changedTouches[0].clientX-_stx)>8||Math.abs(e.changedTouches[0].clientY-_sty)>8)return;
        e.preventDefault();ltsDoSave();
      };
      saveBtn.onclick=function(e){if(e.detail===0)return;ltsDoSave();};
    }
  }

  if(tab==='export'){
    var mdBtn=document.getElementById('lts-export-md');
    if(mdBtn) mdBtn.onclick=function(){ ltsExportMarkdown(); };
    var epubBtn=document.getElementById('lts-export-epub');
    if(epubBtn) epubBtn.onclick=function(){ ltsExportEpub(); };
  }

  if(tab==='log'){
    // Delete
    el.querySelectorAll('[data-ltsdel]').forEach(function(btn){
      btn.onclick=function(){
        var id=this.dataset.ltsdel;
        if(!confirm('Delete this entry?'))return;
        ltsData.entries=ltsData.entries.filter(function(e){return e.id!==id;});
        ltsSave();ltsRender();
      };
    });

    // Edit toggle
    el.querySelectorAll('[data-ltsedit]').forEach(function(btn){
      btn.onclick=function(){
        var id=this.dataset.ltsedit;
        ltsData._editing=(ltsData._editing===id)?null:id;
        ltsRender();
      };
    });

    // Save edit
    el.querySelectorAll('[data-ltssaveedit]').forEach(function(btn){
      btn.onclick=function(){
        var id=this.dataset.ltssaveedit;
        var e=ltsData.entries.find(function(x){return x.id===id;});
        if(!e)return;
        var titleEl=document.getElementById('lts-edit-title-'+id);
        var bodyEl=document.getElementById('lts-edit-body-'+id);
        if(!titleEl||!bodyEl)return;
        var newTitle=titleEl.value.trim();
        var newBody=bodyEl.value.trim();
        if(!newTitle||!newBody)return;
        e.title=newTitle;e.body=newBody;
        ltsData._editing=null;
        ltsSave();ltsRender();safeHap(HAP.save);
      };
    });

    // Cancel edit
    el.querySelectorAll('[data-ltscanceledit]').forEach(function(btn){
      btn.onclick=function(){ltsData._editing=null;ltsRender();};
    });
  }
}

function ltsDoSave(){
  var titleEl=document.getElementById('lts-title');
  var bodyEl=document.getElementById('lts-body-inp');
  if(!titleEl||!bodyEl)return;
  var title=titleEl.value.trim();
  var body=bodyEl.value.trim();
  if(!title||!body)return;
  var now=new Date();
  var date=localDateStr(now);
  var time=now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  ltsData.entries.unshift({id:ltsId(),title:title,body:body,date:date,time:time,ts:Date.now()});
  ltsData._tab='log';
  ltsSave();ltsRender();safeHap(HAP.save);
  if(typeof confetti==='function')confetti(window.innerWidth/2,200,'#00ff88');
}

window.addEventListener('load',function(){if(typeof ltsRender==='function')ltsRender();});
// ══════════════════════════════════════════

// ── LTS EXPORT HELPERS ──
function ltsSeason(dateStr){
  var m=parseInt((dateStr||'').slice(5,7));
  if(m>=3&&m<=5)return'Spring';
  if(m>=6&&m<=8)return'Summer';
  if(m>=9&&m<=11)return'Fall';
  return'Winter';
}
function ltsSeasonOrder(s){return{Winter:0,Spring:1,Summer:2,Fall:3}[s]||0;}
function ltsGroupEntries(){
  var entries=(ltsData.entries||[]).slice().sort(function(a,b){return (a.ts||0)-(b.ts||0);});
  var groups={};
  entries.forEach(function(e){
    var year=(e.date||'').slice(0,4)||'Unknown';
    var season=ltsSeason(e.date);
    var key=year+'|'+season;
    if(!groups[key])groups[key]={year:year,season:season,entries:[]};
    groups[key].entries.push(e);
  });
  return Object.values(groups).sort(function(a,b){
    if(a.year!==b.year)return a.year.localeCompare(b.year);
    return ltsSeasonOrder(a.season)-ltsSeasonOrder(b.season);
  });
}

function ltsExportMarkdown(){
  var groups=ltsGroupEntries();
  var lines=['# Letter to My Son',''];
  // TOC
  lines.push('## Table of Contents','');
  groups.forEach(function(g){
    lines.push('- **'+g.season+' '+g.year+'**');
    g.entries.forEach(function(e){
      lines.push('  - '+e.title+' *('+e.date+')*');
    });
  });
  lines.push('','---','');
  // Content
  groups.forEach(function(g){
    lines.push('## '+g.season+' '+g.year,'');
    g.entries.forEach(function(e){
      lines.push('### '+e.title);
      lines.push('*'+e.date+(e.time?' · '+e.time:'')+'*','');
      lines.push(e.body||'','');
      lines.push('---','');
    });
  });
  var blob=new Blob([lines.join('\n')],{type:'text/markdown'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='letter-to-my-son.md';
  a.click();
}

function ltsExportEpub(){
  // Load JSZip dynamically then build epub
  if(typeof JSZip==='undefined'){
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload=function(){_ltsBuildEpub();};
    s.onerror=function(){alert('Could not load JSZip. Check your connection.');};
    document.head.appendChild(s);
  } else {
    _ltsBuildEpub();
  }
}

function _ltsBuildEpub(){
  var groups=ltsGroupEntries();
  var allEntries=[];
  groups.forEach(function(g){g.entries.forEach(function(e){allEntries.push(e);});});
  var zip=new JSZip();

  // mimetype (must be first, uncompressed)
  zip.file('mimetype','application/epub+zip',{compression:'STORE'});

  // container.xml
  zip.folder('META-INF').file('container.xml',
    '<?xml version="1.0"?>\n'+
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'+
    '  <rootfiles>\n'+
    '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n'+
    '  </rootfiles>\n'+
    '</container>');

  var oebps=zip.folder('OEBPS');

  // CSS
  oebps.file('style.css',
    'body{font-family:Georgia,serif;margin:2em;line-height:1.8;color:#222;max-width:600px;}\n'+
    'h1{font-size:2em;margin-bottom:0.2em;}\n'+
    'h2{font-size:1.4em;color:#444;border-bottom:1px solid #ddd;padding-bottom:0.3em;margin-top:2em;}\n'+
    'h3{font-size:1.1em;color:#333;margin-top:1.6em;}\n'+
    '.meta{color:#888;font-size:0.85em;font-style:italic;margin-bottom:1em;}\n'+
    '.entry-body{white-space:pre-wrap;}\n'+
    'hr{border:none;border-top:1px solid #eee;margin:2em 0;}\n'+
    'nav ol{list-style:none;padding:0;}\n'+
    'nav ol li{margin:0.3em 0;}\n'+
    'nav ol li a{color:#333;text-decoration:none;}\n'+
    'nav ol li.section{font-weight:bold;margin-top:0.8em;}\n'+
    'nav ol li.chapter{padding-left:1.2em;font-size:0.9em;}');

  // Build chapter files + manifest items
  var manifestItems='';
  var spineItems='';
  var tocItems='';
  var tocPlayOrder=1;

  // Cover/title page
  var titleHtml='<?xml version="1.0" encoding="UTF-8"?>\n'+
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">\n'+
    '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Letter to My Son</title>'+
    '<link rel="stylesheet" type="text/css" href="style.css"/></head><body>'+
    '<h1>Letter to My Son</h1>'+
    '<p class="meta">'+allEntries.length+' entries · '+
    (allEntries[0]?allEntries[0].date:'')+(allEntries.length>1?' – '+allEntries[allEntries.length-1].date:'')+
    '</p></body></html>';
  oebps.file('title.xhtml',titleHtml);
  manifestItems+='<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>\n';
  spineItems+='<itemref idref="title"/>\n';

  // TOC page (HTML nav)
  var tocHtml='<?xml version="1.0" encoding="UTF-8"?>\n'+
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">\n'+
    '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Contents</title>'+
    '<link rel="stylesheet" type="text/css" href="style.css"/></head><body>'+
    '<h2>Table of Contents</h2><nav><ol>';
  groups.forEach(function(g,gi){
    tocHtml+='<li class="section">'+g.season+' '+g.year+'</li>';
    g.entries.forEach(function(e,ei){
      var chId='ch'+gi+'_'+ei;
      tocHtml+='<li class="chapter"><a href="'+chId+'.xhtml">'+e.title+'</a></li>';
    });
  });
  tocHtml+='</ol></nav></body></html>';
  oebps.file('toc.xhtml',tocHtml);
  manifestItems+='<item id="toc-page" href="toc.xhtml" media-type="application/xhtml+xml"/>\n';
  spineItems+='<itemref idref="toc-page"/>\n';
  tocItems+='<navPoint id="np-toc" playOrder="'+(tocPlayOrder++)+'"><navLabel><text>Table of Contents</text></navLabel><content src="toc.xhtml"/></navPoint>\n';

  // Chapter files
  groups.forEach(function(g,gi){
    var secId='sec'+gi;
    tocItems+='<navPoint id="np-'+secId+'" playOrder="'+(tocPlayOrder++)+'"><navLabel><text>'+g.season+' '+g.year+'</text></navLabel><content src="ch'+gi+'_0.xhtml">\n';
    g.entries.forEach(function(e,ei){
      var chId='ch'+gi+'_'+ei;
      var bodyEsc=(e.body||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      var chHtml='<?xml version="1.0" encoding="UTF-8"?>\n'+
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">\n'+
        '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>'+e.title+'</title>'+
        '<link rel="stylesheet" type="text/css" href="style.css"/></head><body>'+
        '<h3>'+e.title+'</h3>'+
        '<p class="meta">'+e.date+(e.time?' · '+e.time:'')+'</p>'+
        '<div class="entry-body">'+bodyEsc+'</div>'+
        '</body></html>';
      oebps.file(chId+'.xhtml',chHtml);
      manifestItems+='<item id="'+chId+'" href="'+chId+'.xhtml" media-type="application/xhtml+xml"/>\n';
      spineItems+='<itemref idref="'+chId+'"/>\n';
      tocItems+='  <navPoint id="np-'+chId+'" playOrder="'+(tocPlayOrder++)+'"><navLabel><text>'+e.title+'</text></navLabel><content src="'+chId+'.xhtml"/></navPoint>\n';
    });
    tocItems+='</navPoint>\n';
  });

  // content.opf
  var now=new Date().toISOString().slice(0,10);
  oebps.file('content.opf',
    '<?xml version="1.0" encoding="UTF-8"?>\n'+
    '<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">\n'+
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">\n'+
    '  <dc:title>Letter to My Son</dc:title>\n'+
    '  <dc:language>en</dc:language>\n'+
    '  <dc:identifier id="uid">letter-to-my-son-'+Date.now()+'</dc:identifier>\n'+
    '  <dc:date>'+now+'</dc:date>\n'+
    '</metadata>\n'+
    '<manifest>\n'+
    '  <item id="style" href="style.css" media-type="text/css"/>\n'+
    '  <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n'+
    manifestItems+
    '</manifest>\n'+
    '<spine toc="ncx">\n'+spineItems+'</spine>\n'+
    '</package>');

  // toc.ncx
  oebps.file('toc.ncx',
    '<?xml version="1.0" encoding="UTF-8"?>\n'+
    '<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">\n'+
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n'+
    '<head><meta name="dtb:uid" content="letter-to-my-son"/><meta name="dtb:depth" content="2"/></head>\n'+
    '<docTitle><text>Letter to My Son</text></docTitle>\n'+
    '<navMap>\n'+tocItems+'</navMap>\n</ncx>');

  // Generate and download
  zip.generateAsync({type:'blob',mimeType:'application/epub+zip'}).then(function(blob){
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='letter-to-my-son.epub';
    a.click();
  });
}

// ══════════════════════════════════════════
// MONTHLY IMPOSSIBLE PROJECT (MIP)
// ══════════════════════════════════════════
var mipData = lsGet('dash_mip', {months:{}});
if(!mipData.months) mipData.months = {};

function mipSave(){ lsSet('dash_mip', mipData); }
function mipNoteId(){ return 'n_'+Date.now()+'_'+Math.random().toString(36).slice(2,4); }
function mipMonthKey(d){ var n=d||new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0'); }
function mipMonthLabel(key){ var d=new Date(key+'-02'); return d.toLocaleDateString('en-US',{month:'long',year:'numeric'}); }
function mipShift(key, delta){
  var d=new Date(key+'-02');
  d.setMonth(d.getMonth()+delta);
  return mipMonthKey(d);
}

function mipRender(){
  var el=document.getElementById('mip-body');
  var badge=document.getElementById('mip-badge');
  if(!el) return;
  el.style.maxHeight='700px'; el.style.overflowY='auto';

  var CA='var(--ca)', CB='rgba(255,184,108,';
  var tab = mipData._tab||'this';
  var viewKey = mipData._viewKey||mipMonthKey();
  var thisKey = mipMonthKey();
  var entry = mipData.months[viewKey]||{title:'',notes:[],done:false};
  var isThisMonth = viewKey===thisKey;

  // Badge
  if(badge){
    var thisEntry = mipData.months[thisKey];
    badge.textContent = thisEntry&&thisEntry.title ? (thisEntry.done?'✓ Done':'In progress') : 'No project';
    badge.style.display='';
  }

  var h='';

  // Tabs
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
  [{t:'this',l:'THIS MONTH'},{t:'log',l:'LOG'}].forEach(function(x){
    var a=tab===x.t;
    h+='<button data-miptab="'+x.t+'" style="font-size:var(--t-xs);padding:3px 10px;border:1px solid '+(a?CB+'.5)':'var(--c-border)')+';color:'+(a?CA:'var(--dim)')+';cursor:pointer;background:'+(a?CB+'.08)':'transparent')+';font-family:monospace;letter-spacing:1px">'+x.l+'</button>';
  });
  h+='</div>';

  if(tab==='this'){
    // Month nav
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">';
    h+='<button data-mipnav="-1" style="background:transparent;border:1px solid rgba(255,184,108,.2);color:var(--ca);font-family:monospace;cursor:pointer;padding:2px 10px;font-size:var(--t-md)">←</button>';
    h+='<div style="flex:1;text-align:center;font-size:var(--t-sm);color:'+(isThisMonth?CA:'var(--dim)')+'">'+mipMonthLabel(viewKey)+(isThisMonth?' <span style="font-size:var(--t-xxs);color:var(--cg)">● NOW</span>':'')+'</div>';
    h+='<button data-mipnav="1" style="background:transparent;border:1px solid rgba(255,184,108,.2);color:var(--ca);font-family:monospace;cursor:pointer;padding:2px 10px;font-size:var(--t-md)">→</button>';
    h+='</div>';

    // Title input
    h+='<input id="mip-title-inp" placeholder="This month\'s impossible project..." value="'+((entry.title||'').replace(/"/g,'&quot;'))+'" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid '+CB+'.2);color:var(--text);font-family:monospace;font-size:var(--t-base);padding:8px;outline:none;margin-bottom:8px">';

    // Done toggle
    var doneCol = entry.done ? 'var(--cg)' : CB+'.3)';
    h+='<button id="mip-done-btn" style="width:100%;padding:8px;background:'+(entry.done?'rgba(0,255,136,.08)':'transparent')+';border:1px solid '+doneCol+';color:'+(entry.done?'var(--cg)':CB+'.5)')+';font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px;margin-bottom:10px">'+(entry.done?'✓ COMPLETED — TAP TO UNDO':'MARK AS COMPLETED')+'</button>';

    // Add note
    h+='<div style="font-size:var(--t-xs);color:var(--dim);letter-spacing:1px;margin-bottom:6px">UPDATES</div>';
    h+='<textarea id="mip-note-inp" placeholder="Add an update..." style="width:100%;box-sizing:border-box;background:transparent;border:1px solid '+CB+'.15);color:var(--text);font-family:monospace;font-size:var(--t-sm);padding:6px 8px;outline:none;resize:none;min-height:60px;margin-bottom:6px"></textarea>';
    h+='<button id="mip-note-btn" style="width:100%;padding:7px;background:'+CB+'.06);border:1px solid '+CB+'.3);color:'+CA+';font-family:monospace;font-size:var(--t-xs);cursor:pointer;letter-spacing:1px;margin-bottom:12px">+ ADD UPDATE</button>';

    // Notes log
    var notes = (entry.notes||[]).slice().reverse();
    if(notes.length){
      notes.forEach(function(n){
        var editing = mipData._editNote===n.id;
        h+='<div style="border-bottom:1px solid rgba(255,184,108,.08);padding:8px 0" data-mipnote="'+n.id+'">';
        h+='<div style="display:flex;align-items:flex-start;gap:6px">';
        h+='<div style="flex:1">';
        h+='<div style="font-size:var(--t-xxs);color:var(--dim);margin-bottom:4px">'+new Date(n.ts).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})+'</div>';
        if(editing){
          h+='<textarea id="mip-edit-'+n.id+'" style="width:100%;box-sizing:border-box;background:transparent;border:1px solid '+CB+'.2);color:var(--text);font-family:monospace;font-size:var(--t-sm);padding:5px 8px;outline:none;resize:none;min-height:50px">'+n.text+'</textarea>';
          h+='<div style="display:flex;gap:6px;margin-top:4px">';
          h+='<button data-mipsavenote="'+n.id+'" style="padding:3px 10px;background:'+CB+'.06);border:1px solid '+CB+'.3);color:'+CA+';font-family:monospace;font-size:var(--t-xxs);cursor:pointer">SAVE</button>';
          h+='<button data-mipcancelnote="'+n.id+'" style="padding:3px 10px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;font-size:var(--t-xxs);cursor:pointer">CANCEL</button>';
          h+='</div>';
        } else {
          h+='<div style="font-size:var(--t-sm);color:var(--text);white-space:pre-wrap;line-height:1.6">'+n.text+'</div>';
        }
        h+='</div>';
        if(!editing){
          h+='<button data-mipeditnote="'+n.id+'" style="background:transparent;border:none;color:rgba(255,255,255,.2);font-size:var(--t-sm);cursor:pointer;padding:0 4px">✏️</button>';
          h+='<button data-mipdelnote="'+n.id+'" style="background:transparent;border:none;color:rgba(255,255,255,.2);font-size:var(--t-base);cursor:pointer;padding:0 2px">✕</button>';
        }
        h+='</div></div>';
      });
    } else {
      h+='<div style="color:var(--dim);font-size:var(--t-sm);text-align:center;padding:10px 0">No updates yet.</div>';
    }

  } else {
    // LOG tab — past + future months with entries
    var keys = Object.keys(mipData.months).filter(function(k){ return mipData.months[k].title; }).sort().reverse();
    if(!keys.length){
      h+='<div style="color:var(--dim);font-size:var(--t-sm);padding:20px 0;text-align:center">No projects yet.</div>';
    } else {
      keys.forEach(function(k){
        var m = mipData.months[k];
        var isCurr = k===thisKey;
        var isFuture = k>thisKey;
        var col = m.done?'var(--cg)':isFuture?'rgba(255,255,255,.3)':CA;
        h+='<div style="border:1px solid rgba(255,184,108,.1);padding:10px;margin-bottom:8px">';
        h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:'+(m.notes&&m.notes.length?'6':'0')+'px">';
        h+='<div style="font-size:var(--t-xs);color:var(--dim);min-width:80px">'+mipMonthLabel(k)+'</div>';
        h+='<div style="flex:1;font-size:var(--t-sm);color:'+col+'">'+m.title+'</div>';
        if(m.done) h+='<span style="font-size:var(--t-xxs);color:var(--cg)">✓</span>';
        if(isFuture) h+='<span style="font-size:var(--t-xxs);color:rgba(255,255,255,.3)">planned</span>';
        h+='</div>';
        if(m.notes&&m.notes.length){
          h+='<div style="font-size:var(--t-xxs);color:var(--dim)">'+m.notes.length+' update'+(m.notes.length>1?'s':'')+'</div>';
        }
        h+='</div>';
      });
    }
  }

  el.innerHTML=h;

  // Wire tabs
  el.querySelectorAll('[data-miptab]').forEach(function(btn){
    var _tx=0,_ty=0;
    btn.ontouchstart=function(e){_tx=e.touches[0].clientX;_ty=e.touches[0].clientY;};
    btn.ontouchend=function(e){
      if(Math.abs(e.changedTouches[0].clientX-_tx)>8||Math.abs(e.changedTouches[0].clientY-_ty)>8)return;
      e.preventDefault(); mipData._tab=this.dataset.miptab; mipSave(); mipRender();
    };
    btn.onclick=function(e){if(e.detail===0)return; mipData._tab=this.dataset.miptab; mipSave(); mipRender();};
  });

  if(tab==='this'){
    // Nav arrows
    el.querySelectorAll('[data-mipnav]').forEach(function(btn){
      var _tx=0,_ty=0;
      btn.ontouchstart=function(e){_tx=e.touches[0].clientX;_ty=e.touches[0].clientY;};
      btn.ontouchend=function(e){
        if(Math.abs(e.changedTouches[0].clientX-_tx)>8||Math.abs(e.changedTouches[0].clientY-_ty)>8)return;
        e.preventDefault(); mipData._viewKey=mipShift(viewKey,parseInt(this.dataset.mipnav)); mipSave(); mipRender();
      };
      btn.onclick=function(e){if(e.detail===0)return; mipData._viewKey=mipShift(viewKey,parseInt(this.dataset.mipnav)); mipSave(); mipRender();};
    });

    // Title save on input
    var titleInp=document.getElementById('mip-title-inp');
    if(titleInp) titleInp.oninput=function(){
      if(!mipData.months[viewKey])mipData.months[viewKey]={title:'',notes:[],done:false};
      mipData.months[viewKey].title=this.value;
      mipSave();
    };

    // Done toggle
    var doneBtn=document.getElementById('mip-done-btn');
    if(doneBtn){
      var _dtx=0,_dty=0;
      doneBtn.ontouchstart=function(e){_dtx=e.touches[0].clientX;_dty=e.touches[0].clientY;};
      doneBtn.ontouchend=function(e){
        if(Math.abs(e.changedTouches[0].clientX-_dtx)>8||Math.abs(e.changedTouches[0].clientY-_dty)>8)return;
        e.preventDefault(); mipToggleDone();
      };
      doneBtn.onclick=function(e){if(e.detail===0)return; mipToggleDone();};
    }

    // Add note
    var noteBtn=document.getElementById('mip-note-btn');
    if(noteBtn){
      var _ntx=0,_nty=0;
      noteBtn.ontouchstart=function(e){_ntx=e.touches[0].clientX;_nty=e.touches[0].clientY;};
      noteBtn.ontouchend=function(e){
        if(Math.abs(e.changedTouches[0].clientX-_ntx)>8||Math.abs(e.changedTouches[0].clientY-_nty)>8)return;
        e.preventDefault(); mipAddNote();
      };
      noteBtn.onclick=function(e){if(e.detail===0)return; mipAddNote();};
    }

    // Edit note
    el.querySelectorAll('[data-mipeditnote]').forEach(function(btn){
      btn.onclick=function(){
        var id=this.dataset.mipeditnote;
        mipData._editNote=(mipData._editNote===id)?null:id;
        mipRender();
      };
    });

    // Save edited note
    el.querySelectorAll('[data-mipsavenote]').forEach(function(btn){
      btn.onclick=function(){
        var id=this.dataset.mipsavenote;
        var ta=document.getElementById('mip-edit-'+id);
        if(!ta||!ta.value.trim())return;
        var e=mipData.months[viewKey];
        if(!e)return;
        var note=e.notes.find(function(n){return n.id===id;});
        if(note){note.text=ta.value.trim();}
        mipData._editNote=null;
        mipSave(); mipRender(); safeHap(HAP.save);
      };
    });

    // Cancel edit
    el.querySelectorAll('[data-mipcancelnote]').forEach(function(btn){
      btn.onclick=function(){mipData._editNote=null; mipRender();};
    });

    // Delete note
    el.querySelectorAll('[data-mipdelnote]').forEach(function(btn){
      btn.onclick=function(){
        if(!confirm('Delete this update?'))return;
        var id=this.dataset.mipdelnote;
        var e=mipData.months[viewKey];
        if(!e)return;
        e.notes=e.notes.filter(function(n){return n.id!==id;});
        mipSave(); mipRender();
      };
    });
  }
}

function mipToggleDone(){
  var viewKey=mipData._viewKey||mipMonthKey();
  if(!mipData.months[viewKey])mipData.months[viewKey]={title:'',notes:[],done:false};
  mipData.months[viewKey].done=!mipData.months[viewKey].done;
  if(mipData.months[viewKey].done&&typeof confetti==='function')confetti(window.innerWidth/2,200,'#ffcc00');
  mipSave(); mipRender();
}

function mipAddNote(){
  var viewKey=mipData._viewKey||mipMonthKey();
  var ta=document.getElementById('mip-note-inp');
  if(!ta||!ta.value.trim())return;
  if(!mipData.months[viewKey])mipData.months[viewKey]={title:'',notes:[],done:false};
  mipData.months[viewKey].notes.push({id:mipNoteId(),text:ta.value.trim(),ts:Date.now()});
  mipSave(); mipRender(); safeHap(HAP.check);
}

window.addEventListener('load',function(){if(typeof mipRender==='function')mipRender();});
// ══════════════════════════════════════════

// ── END OF dashboard-2.js (Part 2 of 3) — continues in dashboard-3.js ──
