// ── dashboard-3.js ── Part 3 of 3 ── v13 ── BUILD 2026-05-15 ──
// Contains: Day Blocks, Workout Log, Rent Payments, S-Tracker,
//           Quran Cards (SRS, 6/day), Quran Words (695 cards, SRS, Arabic fonts),
//           Quick Nav, Gratitude Log, Dua, For Akhira, Countdown / In X Days,
//           The Wall, Reframe (GPT-4o), Legacy Letter, Shadow Log, Fear Inventory,
//           People I Want to Become, Creative Writing Log, Stress Demess,
//           Calorie Counter, Starfield / Scroll Trail / Card Entrance / Pinboard
// Requires dashboard-1.js and dashboard-2.js to be loaded first

// ── DAY BLOCKS ──
var dbData=JSON.parse(localStorage.getItem('dash_db')||'{}');
var DB_DEFAULT_COLORS={work:'#2d7a4f',break:'#1a5a8a',other:'#6a3a8a',type4:'#8a5a1a',type5:'#1a6a7a'};
var DB_DEFAULT_NAMES={work:'Work',break:'Break',other:'Other',type4:'Activity',type5:'Event'};
var DB_STATES=['work','break','other','type4','type5',null];

function dbSave(){localStorage.setItem('dash_db',JSON.stringify(dbData));}
function dbTodayKey(){return new Date().toISOString().slice(0,10);}

function dbEnsureToday(){
  var today=dbTodayKey();
  if(dbData.date!==today){
    dbData={date:today,startH:dbData.startH!==undefined?dbData.startH:8,endH:dbData.endH!==undefined?dbData.endH:22,blocksPerHour:dbData.blocksPerHour||4,blocks:{},colors:dbData.colors||Object.assign({},DB_DEFAULT_COLORS),tab:'setup'};
    dbSave();
  }
  if(!dbData.colors)dbData.colors=Object.assign({},DB_DEFAULT_COLORS);
  if(!dbData.names)dbData.names=Object.assign({},DB_DEFAULT_NAMES);
  // Ensure new types exist in colors/names
  ['type4','type5'].forEach(function(t){if(!dbData.colors[t])dbData.colors[t]=DB_DEFAULT_COLORS[t];if(!dbData.names[t])dbData.names[t]=DB_DEFAULT_NAMES[t];});
  if(!dbData.blocks)dbData.blocks={};
}

function dbCurrentBlock(){
  var now=new Date();var h=now.getHours();var m=now.getMinutes();
  var bph=dbData.blocksPerHour||4;var bi=Math.floor(m/(60/bph));
  return {h:h,b:bi};
}

function dbTapBlock(h,b){
  dbEnsureToday();
  var key=h+':'+b;var cur=dbData.blocks[key]||null;
  var idx=DB_STATES.indexOf(cur);var next=DB_STATES[(idx+1)%DB_STATES.length];
  if(next===null)delete dbData.blocks[key]; else dbData.blocks[key]=next;
  dbSave();dbRenderBlocks();
}

function dbConfirmRegen(){if(window.confirm("Clear all blocks and regenerate?"))dbBuild();}
function dbBuild(){
  dbEnsureToday();
  dbData.blocks={};
  dbData.tab='blocks';
  dbSave();dbRender();
}

function dbSwitchTab(t){dbEnsureToday();dbData.tab=t;dbSave();dbRender();}

function dbRenderBlocks(){
  var el=document.getElementById('db-grid-area');
  if(!el)return;
  var colors=dbData.colors||DB_DEFAULT_COLORS;
  var bph=dbData.blocksPerHour||4;
  var startH=dbData.startH!==undefined?dbData.startH:8;
  var endH=dbData.endH!==undefined?dbData.endH:22;
  var cur=dbCurrentBlock();
  var typeCounts={};
  DB_STATES.filter(function(s){return s!==null;}).forEach(function(t){typeCounts[t]=0;});
  Object.values(dbData.blocks||{}).forEach(function(v){if(v&&typeCounts[v]!==undefined)typeCounts[v]++;});
  var h='<div class="db-grid">';
  for(var hr=startH;hr<endH;hr++){
    var label=(hr===0?'12a':hr<12?hr+'a':hr===12?'12p':(hr-12)+'p');
    h+='<div class="db-hour-row"><div class="db-hour-lbl">'+label+'</div><div class="db-blocks">';
    for(var bi=0;bi<bph;bi++){
      var key=hr+':'+bi;var state=dbData.blocks[key]||null;
      var isNow=(cur.h===hr&&cur.b===bi);
      var bgCol=state?(colors[state]||DB_DEFAULT_COLORS[state]||'rgba(255,255,255,.15)'):'rgba(255,255,255,.04)';
      var cls='db-block'+(isNow?' db-now':'');
      // Compute time range for this block
      var _minsPerBlock=60/bph;
      var _startMin=Math.round(bi*_minsPerBlock);
      var _endMin=Math.round((bi+1)*_minsPerBlock);
      var _endH=(_endMin>=60)?hr+1:hr;
      var _endM=_endMin>=60?_endMin-60:_endMin;
      var _fmtT=function(h,m){return (h%12||12)+':'+(m<10?'0':'')+m+(h<12?'a':'p');};
      var _timeLabel=_fmtT(hr,_startMin)+'-'+_fmtT(_endH,_endM);
      var style='background:'+bgCol+';position:relative;';
      h+='<div class="'+cls+'" style="'+style+'" data-dbh="'+hr+'" data-dbb="'+bi+'" title="'+_timeLabel+'">';
      // Hover label — shown via CSS :hover
      h+='<span class="db-time-label">'+_timeLabel+'</span>';
      h+='</div>';
    }
    h+='</div></div>';
  }
  h+='</div>';
  h+='<div class="db-legend">';
  DB_STATES.filter(function(s){return s!==null;}).forEach(function(t){
    var col=colors[t]||DB_DEFAULT_COLORS[t];
    var name=(dbData.names&&dbData.names[t])||DB_DEFAULT_NAMES[t];
    var cnt=typeCounts[t]||0;
    h+='<div class="db-legend-item"><div class="db-legend-dot" style="background:'+col+'"></div>'+name+' ('+cnt+')</div>';
  });
  h+='</div>';
  el.innerHTML=h;
  clearTimeout(window._dbTimer);
  window._dbTimer=setTimeout(dbRenderBlocks,60000);
}

function dbRender(){
  var el=document.getElementById('db-body');
  var badge=document.getElementById('db-badge');
  if(!el)return;
  dbEnsureToday();
  var tab=dbData.tab||'setup';
  var colors=dbData.colors||DB_DEFAULT_COLORS;
  var bph=dbData.blocksPerHour||4;
  var startH=dbData.startH!==undefined?dbData.startH:8;
  var endH=dbData.endH!==undefined?dbData.endH:22;
  if(badge)badge.textContent=dbTodayKey();

  var h='<div style="display:flex;gap:4px;margin-bottom:10px">';
  [{t:'blocks',l:'BLOCKS'},{t:'settings',l:'⚙'}].forEach(function(x){
    var active=tab===x.t||( tab==='setup'&&x.t==='blocks');
    h+='<span data-dbtab="'+x.t+'" class="db-tab'+(active?' active':'')+'">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='settings'){
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:10px">GRID SETUP</div>';
    h+='<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;flex-wrap:wrap">';
    h+='<label style="font-size:10px;color:var(--dim)">From</label>';
    h+='<input type="number" min="0" max="23" value="'+startH+'" onchange="dbData.startH=+this.value;dbSave();dbRender()" style="width:48px;background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--text);font-family:monospace;font-size:12px;padding:4px;outline:none;text-align:center">';
    h+='<label style="font-size:10px;color:var(--dim)">to</label>';
    h+='<input type="number" min="1" max="24" value="'+endH+'" onchange="dbData.endH=+this.value;dbSave();dbRender()" style="width:48px;background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--text);font-family:monospace;font-size:12px;padding:4px;outline:none;text-align:center">';
    h+='<label style="font-size:10px;color:var(--dim)">h</label>';
    h+='</div>';
    h+='<div style="margin-bottom:12px"><div style="font-size:10px;color:var(--dim);margin-bottom:6px">BLOCKS PER HOUR</div><div style="display:flex;gap:6px">';
    [1,2,3,4,5,6,7,8].forEach(function(n){
      var active=bph===n;
      h+='<button data-dbph="'+n+'" style="padding:4px 7px;background:'+(active?'rgba(199,125,255,.12)':'transparent')+';border:1px solid '+(active?'var(--cpr)':'rgba(255,255,255,.12)')+';color:'+(active?'var(--cpr)':'var(--dim)')+';font-family:monospace;font-size:11px;cursor:pointer">'+n+'</button>';
    });
    h+='</div></div>';
    DB_STATES.filter(function(s){return s!==null;}).forEach(function(t){
      var col=colors[t]||DB_DEFAULT_COLORS[t];
      var name=(dbData.names&&dbData.names[t])||DB_DEFAULT_NAMES[t];
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
      h+='<div style="width:20px;height:20px;border-radius:3px;flex-shrink:0;background:'+col+'"></div>';
      h+='<input value="'+name+'" data-dbnt="'+t+'" onchange="dbData.names[this.dataset.dbnt]=this.value.trim()||DB_DEFAULT_NAMES[this.dataset.dbnt];dbSave();dbRender()" style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.15);color:var(--text);font-family:monospace;font-size:12px;padding:3px 2px;outline:none" placeholder="Type name...">';
      h+='<input type="color" value="'+col+'" data-ck="'+t+'" onchange="dbData.colors[this.dataset.ck]=this.value;dbSave();dbRender()" style="width:32px;height:26px;border:none;background:transparent;cursor:pointer;padding:0;flex-shrink:0">';
      h+='</div>';
    });
    h+='<button id="db-regen-btn" style="margin-top:8px;width:100%;padding:8px;background:transparent;border:1px solid rgba(199,125,255,.3);color:var(--cpr);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">&#8635; REGENERATE</button>';
  } else if(tab==='setup'||tab!=='blocks'){
    // Setup / empty state — show config + BUILD button
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:12px">CONFIGURE YOUR DAY</div>';
    h+='<div style="display:flex;gap:8px;margin-bottom:14px;align-items:center;flex-wrap:wrap">';
    h+='<span style="font-size:11px;color:var(--dim)">From</span>';
    h+='<input type="number" min="0" max="23" value="'+startH+'" onchange="dbData.startH=+this.value;dbSave()" style="width:52px;background:transparent;border:1px solid rgba(199,125,255,.25);color:var(--text);font-family:monospace;font-size:13px;padding:5px;outline:none;text-align:center">';
    h+='<span style="font-size:11px;color:var(--dim)">to</span>';
    h+='<input type="number" min="1" max="24" value="'+endH+'" onchange="dbData.endH=+this.value;dbSave()" style="width:52px;background:transparent;border:1px solid rgba(199,125,255,.25);color:var(--text);font-family:monospace;font-size:13px;padding:5px;outline:none;text-align:center">';
    h+='<span style="font-size:11px;color:var(--dim)">h</span>';
    h+='</div>';
    h+='<div style="margin-bottom:16px"><div style="font-size:10px;color:var(--dim);margin-bottom:8px;letter-spacing:1px">BLOCKS PER HOUR</div><div style="display:flex;gap:8px">';
    [1,2,3,4,5,6,7,8].forEach(function(n){
      var active=bph===n;
      h+='<button data-dbph="'+n+'" style="flex:1;padding:5px 2px;background:'+(active?'rgba(199,125,255,.12)':'transparent')+';border:1px solid '+(active?'var(--cpr)':'rgba(255,255,255,.12)')+';color:'+(active?'var(--cpr)':'var(--dim)')+';font-family:monospace;font-size:11px;cursor:pointer">'+n+'</button>';
    });
    h+='</div><div style="font-size:9px;color:var(--dim);margin-top:4px;opacity:.6">'+(bph===2?'30 min':bph===3?'20 min':bph===4?'15 min':'10 min')+' per block</div>';
    h+='</div>';
    var totalHours=Math.max(0,endH-startH);var totalBlocks=totalHours*bph;
    h+='<div style="font-size:10px;color:var(--dim);margin-bottom:12px;opacity:.7">'+totalHours+' hours &times; '+bph+' blocks = '+totalBlocks+' total blocks</div>';
    h+='<button id="db-build-btn" style="width:100%;padding:12px;background:rgba(199,125,255,.1);border:1px solid var(--ca);color:var(--cpr);font-family:monospace;font-size:13px;cursor:pointer;letter-spacing:2px;transition:all .2s">&#9654; BUILD DAY</button>';
  } else {
    // Blocks exist — show the grid
    h+='<div id="db-grid-area"></div>';
  }
  el.innerHTML=h;
  if(tab==='blocks'){dbRenderBlocks();}
  clearTimeout(window._dbTimer);
  window._dbTimer=setTimeout(dbRender,60000);
}

setTimeout(function(){dbEnsureToday();dbRender();},400);

// ── DAY BLOCKS DELEGATION ──
// Single touch/click handler on document — routes by element attributes
// More reliable than innerHTML onclick or post-render wiring on Android
document.addEventListener('click', function(e){
  var t=e.target;
  // Use closest() to handle clicks on child nodes (e.g. text inside button)
  var btn=t.closest?t.closest('[id],[data-dbph],[data-dbtab],[data-dbh],[data-ck]'):t;
  if(!btn)return;
  // Build day button
  if(btn.id==='db-build-btn'){dbBuild();return;}
  // Regenerate button
  if(btn.id==='db-regen-btn'){dbConfirmRegen();return;}
  // Blocks per hour
  if(btn.dataset&&btn.dataset.dbph!==undefined){dbData.blocksPerHour=+btn.dataset.dbph;dbSave();dbRender();return;}
  // Tab switch
  if(btn.dataset&&btn.dataset.dbtab!==undefined){dbSwitchTab(btn.dataset.dbtab);return;}
  // Block tap
  if(btn.dataset&&btn.dataset.dbh!==undefined){dbTapBlock(+btn.dataset.dbh,+btn.dataset.dbb);return;}
  // Color input — handled by onchange, skip here
  // Hour inputs — handled by onchange, skip here
});

// ── WORKOUT LOG ──
var wlData=JSON.parse(localStorage.getItem('dash_wl')||'[]');
// wlData = array of sessions: {id,date,startTs,endTs,exercises:[{name,muscle,sets:[{reps,weight}],note}],note}
var wlActiveSession=null; // current in-progress session
var wlTimer=null;
var wlTab='log';
var wlEditingEx=-1; // index of exercise being edited in active session

// Muscle group lookup — auto-tags by keyword
// Grouped exercise library — used for the picker UI
var WL_LIBRARY={
  chest:[
    'Bench Press','Incline Bench Press','Dumbbell Chest Press','Incline Dumbbell Press',
    'Dumbbell Fly','Incline Dumbbell Fly','Push Up','Wide Push Up',
    'Diamond Push Up','Dips','Band Chest Fly'
  ],
  back:[
    'Pull Up','Chin Up','Neutral Grip Pull Up','Dumbbell Row','Single Arm Row',
    'Band Pull Apart','Band Face Pull','Band Row','Deadlift','Back Extension'
  ],
  shoulders:[
    'Dumbbell Shoulder Press','Arnold Press','Lateral Raise','Front Raise',
    'Rear Delt Fly','Band Lateral Raise','Band Front Raise','Upright Row',
    'Band Overhead Press'
  ],
  arms:[
    'Dumbbell Curl','Hammer Curl','Concentration Curl','Incline Dumbbell Curl',
    'Tricep Overhead Extension','Tricep Kickback','Close Grip Push Up',
    'Band Curl','Band Tricep Pushdown','Skull Crusher'
  ],
  legs:[
    'Goblet Squat','Dumbbell Squat','Dumbbell Lunge','Romanian Deadlift',
    'Dumbbell Step Up','Glute Bridge','Single Leg Glute Bridge','Hip Thrust',
    'Calf Raise','Band Squat','Band Lateral Walk','Band Glute Kickback'
  ],
  core:[
    'Plank','Side Plank','Dead Bug','Hollow Hold','Leg Raise','Hanging Leg Raise',
    'Crunch','Bicycle Crunch','Russian Twist','Mountain Climber','Ab Rollout'
  ],
  cardio:[
    'Jump Rope','Burpee','Jumping Jack','High Knees','Band Jumping Jack'
  ]
};

// Flat lookup for auto-tagging
var WL_MUSCLES={};
Object.keys(WL_LIBRARY).forEach(function(m){
  WL_LIBRARY[m].forEach(function(ex){WL_MUSCLES[ex.toLowerCase()]=m;});
});
var WL_MUSCLE_COLORS={
  chest:'rgba(255,80,80,.25)',back:'rgba(80,160,255,.25)',
  shoulders:'rgba(255,160,80,.25)',arms:'rgba(160,80,255,.25)',
  legs:'rgba(80,200,120,.25)',core:'rgba(255,220,80,.25)',
  cardio:'rgba(80,220,220,.25)',other:'rgba(180,180,180,.15)'
};
var WL_MUSCLE_TEXT={
  chest:'#ff7060',back:'#60aaff',shoulders:'#ffaa60',
  arms:'#aa60ff',legs:'#60cc80',core:'#ffdc60',
  cardio:'#60dcdc',other:'#aaa'
};

function wlAutoMuscle(name){
  var n=name.toLowerCase();
  var keys=Object.keys(WL_MUSCLES);
  for(var i=0;i<keys.length;i++){if(n.indexOf(keys[i])>=0)return WL_MUSCLES[keys[i]];}
  return 'other';
}

function wlSave(){localStorage.setItem('dash_wl',JSON.stringify(wlData));}
function wlSaveActive(){if(wlActiveSession)localStorage.setItem('dash_wl_active',JSON.stringify(wlActiveSession));}
function wlLoadActive(){
  var s=localStorage.getItem('dash_wl_active');
  if(s){try{wlActiveSession=JSON.parse(s);}catch(e){wlActiveSession=null;}}
}

function wlFmt(ms){var s=Math.floor(ms/1000);var m=Math.floor(s/60);s=s%60;var h=Math.floor(m/60);m=m%60;return (h?h+'h ':'')+m+'m '+String(s).padStart(2,'0')+'s';}

function wlStartManual(){
  var dateStr=new Date().toISOString().slice(0,10);
  wlActiveSession={id:Date.now(),date:dateStr,startTs:Date.now(),endTs:Date.now(),exercises:[],note:'',manual:true};
  wlSaveActive();
  wlTab='log';
  wlRender();
}
function wlStartSession(){
  wlActiveSession={id:Date.now(),date:new Date().toISOString().slice(0,10),startTs:Date.now(),endTs:null,exercises:[],note:''};
  wlSaveActive();
  wlTab='log';
  wlRender();
  wlStartTimer();
}

function wlStartTimer(){
  clearInterval(wlTimer);
  wlTimer=setInterval(function(){
    var el=document.getElementById('wl-timer-display');
    if(el&&wlActiveSession){el.textContent=wlFmt(Date.now()-wlActiveSession.startTs);}
    else clearInterval(wlTimer);
  },1000);
}

function wlCancelSession(){
  // Discard the active session without saving
  localStorage.removeItem('dash_wl_active');
  wlActiveSession=null;
  clearInterval(wlTimer);
  wlEditingEx=-1;
  wlRender();
}

function wlEndSession(){
  if(!wlActiveSession)return;
  wlActiveSession.endTs=Date.now();
  wlData.unshift(wlActiveSession);
  if(wlData.length>200)wlData=wlData.slice(0,200);
  wlSave();
  localStorage.removeItem('dash_wl_active');
  wlActiveSession=null;
  clearInterval(wlTimer);
  wlEditingEx=-1;
  wlRender();
}

function wlAddExercise(name){
  if(!wlActiveSession||!name||!name.trim())return;
  var muscle=wlAutoMuscle(name.trim());
  wlActiveSession.exercises.push({name:name.trim(),muscle:muscle,sets:[{reps:0,weight:0}],note:''});
  wlEditingEx=wlActiveSession.exercises.length-1;
  wlSaveActive();wlRender();
}

function wlAddSet(ei){
  if(!wlActiveSession||!wlActiveSession.exercises[ei])return;
  var lastSet=wlActiveSession.exercises[ei].sets.slice(-1)[0]||{reps:0,weight:0};
  wlActiveSession.exercises[ei].sets.push({reps:lastSet.reps,weight:lastSet.weight});
  wlSaveActive();wlRenderActive();
}

function wlRemoveSet(ei,si){
  if(!wlActiveSession||!wlActiveSession.exercises[ei])return;
  if(wlActiveSession.exercises[ei].sets.length<=1)return;
  wlActiveSession.exercises[ei].sets.splice(si,1);
  wlSaveActive();wlRenderActive();
}

function wlUpdateSet(ei,si,field,val){
  if(!wlActiveSession||!wlActiveSession.exercises[ei])return;
  wlActiveSession.exercises[ei].sets[si][field]=+val||0;
  wlSaveActive();
}

function wlUpdateNote(ei,val){
  if(!wlActiveSession||!wlActiveSession.exercises[ei])return;
  wlActiveSession.exercises[ei].note=val;
  wlSaveActive();
}

function wlUpdateMuscle(ei,val){
  if(!wlActiveSession||!wlActiveSession.exercises[ei])return;
  wlActiveSession.exercises[ei].muscle=val;
  wlSaveActive();wlRenderActive();
}

function wlDeleteExercise(ei){
  if(!wlActiveSession)return;
  wlActiveSession.exercises.splice(ei,1);
  if(wlEditingEx===ei)wlEditingEx=-1;
  wlSaveActive();wlRenderActive();
}

function wlGetHistory(){
  // All exercise names from history for autocomplete
  var names={};
  wlData.forEach(function(s){s.exercises.forEach(function(e){names[e.name]=1;});});
  if(wlActiveSession)wlActiveSession.exercises.forEach(function(e){names[e.name]=1;});
  return Object.keys(names).sort();
}

function wlRenderActive(){
  var el=document.getElementById('wl-active-area');
  if(!el||!wlActiveSession)return;
  var h='';
  // Date picker for manual sessions
  if(wlActiveSession.manual){
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)">';
    h+='<span style="font-size:10px;color:var(--dim);white-space:nowrap">SESSION DATE</span>';
    h+='<input type="date" id="wl-manual-date" value="'+wlActiveSession.date+'" onchange="wlActiveSession.date=this.value;wlActiveSession.startTs=new Date(this.value).getTime();wlActiveSession.endTs=wlActiveSession.startTs;wlSaveActive()" style="flex:1;background:transparent;border:1px solid rgba(255,95,160,.25);color:var(--text);font-family:monospace;font-size:12px;padding:4px 6px;outline:none">';
    h+='<span style="font-size:10px;color:var(--dim);white-space:nowrap">Duration (min)</span>';
    h+='<input type="number" id="wl-manual-dur" min="0" max="300" placeholder="60" style="width:52px;background:transparent;border:1px solid rgba(255,95,160,.25);color:var(--text);font-family:monospace;font-size:12px;padding:4px;outline:none;text-align:center" onchange="wlActiveSession.endTs=wlActiveSession.startTs+(+this.value*60000);wlSaveActive()">';
    h+='</div>';
  }
  wlActiveSession.exercises.forEach(function(ex,ei){
    var mcol=WL_MUSCLE_COLORS[ex.muscle]||WL_MUSCLE_COLORS.other;
    var mtxt=WL_MUSCLE_TEXT[ex.muscle]||WL_MUSCLE_TEXT.other;
    h+='<div class="wl-ex-row" style="background:'+mcol+';padding:8px;margin-bottom:6px;border-radius:2px">';
    h+='<div class="wl-ex-name"><span style="flex:1">'+ex.name+'</span>';
    h+='<select data-wlei="'+ei+'" data-wlfield="muscle" style="background:transparent;border:none;color:'+mtxt+';font-size:9px;cursor:pointer;font-family:monospace" onchange="wlUpdateMuscle(+this.dataset.wlei,this.value)">';
    ['chest','back','shoulders','arms','legs','core','cardio','other'].forEach(function(m){
      h+='<option value="'+m+'"'+(ex.muscle===m?' selected':'')+'>'+m+'</option>';
    });
    h+='</select>';
    h+='<span data-wldex="'+ei+'" style="font-size:10px;color:var(--cr);cursor:pointer;opacity:.5;padding:2px 6px">✕</span>';
    h+='</div>';
    // Sets
    ex.sets.forEach(function(set,si){
      h+='<div class="wl-set-row">';
      h+='<span class="wl-set-lbl" style="min-width:20px">S'+(si+1)+'</span>';
      h+='<input class="wl-set-inp" type="number" min="0" data-wlei="'+ei+'" data-wlsi="'+si+'" data-wlf="reps" value="'+set.reps+'" placeholder="reps" onchange="wlUpdateSet(+this.dataset.wlei,+this.dataset.wlsi,this.dataset.wlf,this.value)">';
      h+='<span class="wl-set-lbl">×</span>';
      h+='<input class="wl-set-inp" type="number" min="0" data-wlei="'+ei+'" data-wlsi="'+si+'" data-wlf="weight" value="'+set.weight+'" placeholder="lbs" onchange="wlUpdateSet(+this.dataset.wlei,+this.dataset.wlsi,this.dataset.wlf,this.value)" style="width:48px">';
      h+='<span class="wl-set-lbl">lbs</span>';
      if(ex.sets.length>1)h+='<span data-wldsi="'+si+'" data-wlei="'+ei+'" style="font-size:10px;color:var(--dim);cursor:pointer;opacity:.4">✕</span>';
      h+='</div>';
    });
    h+='<div style="display:flex;gap:6px;margin-top:4px">';
    h+='<span data-wladdset="'+ei+'" style="font-size:10px;color:var(--cp);cursor:pointer;border:1px solid rgba(255,95,160,.3);padding:2px 8px">+ set</span>';
    h+='</div>';
    h+='<input class="wl-note-inp" placeholder="note..." value="'+( ex.note||'')+'" data-wlei="'+ei+'" onchange="wlUpdateNote(+this.dataset.wlei,this.value)">';
    h+='</div>';
  });
  // Exercise picker — collapsible groups
  h+='<div style="margin-top:12px">';
  h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:6px">ADD EXERCISE</div>';
  // Recent from history first
  var hist=wlGetHistory().slice(0,6);
  if(hist.length){
    h+='<div style="margin-bottom:8px"><div style="font-size:9px;color:var(--cp);opacity:.7;margin-bottom:4px">RECENT</div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:4px">';
    hist.forEach(function(n){h+='<span data-wlpick="'+n+'" style="font-size:11px;padding:4px 10px;border:1px solid rgba(255,95,160,.25);color:var(--cp);cursor:pointer;background:rgba(255,95,160,.05)">'+n+'</span>';});
    h+='</div></div>';
  }
  // Muscle group collapsible sections
  var mOrder=['chest','back','shoulders','arms','legs','core','cardio'];
  mOrder.forEach(function(m){
    var col=WL_MUSCLE_TEXT[m];
    var exs=WL_LIBRARY[m]||[];
    var openKey='wl_open_'+m;
    var isOpen=window[openKey];
    h+='<div style="margin-bottom:4px;border:1px solid rgba(255,255,255,.07)">';
    h+='<div data-wlgroup="'+m+'" style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;cursor:pointer;background:rgba(255,255,255,.03)">';
    h+='<span style="font-size:11px;color:'+col+';letter-spacing:1px">'+m.toUpperCase()+'</span>';
    h+='<span style="font-size:11px;color:var(--dim)">'+( isOpen?'▲':'▼')+'</span>';
    h+='</div>';
    if(isOpen){
      h+='<div style="display:flex;flex-wrap:wrap;gap:4px;padding:8px">';
      exs.forEach(function(n){
        h+='<span data-wlpick="'+n+'" style="font-size:11px;padding:5px 10px;border:1px solid rgba(255,255,255,.12);color:var(--text);cursor:pointer;background:rgba(255,255,255,.03);transition:background .12s">'+n+'</span>';
      });
      h+='</div>';
    }
    h+='</div>';
  });
  // Custom exercise input
  h+='<div style="display:flex;gap:6px;margin-top:8px">';
  h+='<input id="wl-ex-inp" placeholder="Custom exercise..." autocomplete="off" style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(255,95,160,.3);color:var(--text);font-family:monospace;font-size:12px;padding:5px 2px;outline:none">';
  h+='<button id="wl-custom-add-btn" style="padding:5px 12px;background:transparent;border:1px solid rgba(255,95,160,.3);color:var(--cp);font-family:monospace;font-size:11px;cursor:pointer">ADD</button>';
  h+='</div>';
  h+='</div>';
  el.innerHTML=h;
  // Wire custom add button
  var customBtn=document.getElementById('wl-custom-add-btn');
  var customInp=document.getElementById('wl-ex-inp');
  if(customBtn&&customInp){
    customBtn.ontouchend=function(e){e.preventDefault();var v=customInp.value.trim();if(v){wlAddExercise(v);customInp.value='';}};
    customBtn.onmouseup=function(){var v=customInp.value.trim();if(v){wlAddExercise(v);customInp.value='';}};
    customInp.onkeydown=function(e){if(e.key===String.fromCharCode(13)){var v=this.value.trim();if(v){wlAddExercise(v);this.value='';}}}; 
  }
}

function wlShowAC(val){
  var ac=document.getElementById('wl-ac');
  if(!ac)return;
  if(!val||val.length<1){ac.style.display='none';return;}
  var hist=wlGetHistory();
  var matches=hist.filter(function(n){return n.toLowerCase().indexOf(val.toLowerCase())>=0;}).slice(0,6);
  if(!matches.length){ac.style.display='none';return;}
  ac.innerHTML=matches.map(function(n){return '<div class="wl-autocomplete-item" data-wlac="'+n+'">'+n+'</div>';}).join('');
  ac.style.display='block';
}

function wlRender(){
  var el=document.getElementById('wl-body');
  var badge=document.getElementById('wl-badge');
  if(!el)return;
  if(badge)badge.textContent=wlActiveSession?'ACTIVE':wlData.length+' sessions';

  var h='';
  // If active session — show it at top
  if(wlActiveSession){
    // Date display + save button — no timer emphasis
    var sessDateLabel=wlActiveSession.manual?wlActiveSession.date:wlActiveSession.date;
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
    h+='<span style="font-size:11px;color:var(--dim)">'+sessDateLabel+'</span>';
    h+='<div style="display:flex;gap:6px">';
    h+='<button id="wl-cancel-btn" style="padding:7px 12px;background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--dim);font-family:monospace;font-size:11px;cursor:pointer">&#x2715; CANCEL</button>';
    h+='<button id="wl-end-btn" style="padding:7px 16px;background:rgba(255,95,160,.1);border:1px solid var(--cp);color:var(--cp);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">&#10003; SAVE</button>';
    h+='</div>';
    h+='</div>';
    h+='<div id="wl-active-area"></div>';
    el.innerHTML=h;
    wlRenderActive();
    return;
  }

  // Tabs
  h+='<div style="display:flex;gap:4px;margin-bottom:12px">';
  ['log','stats'].forEach(function(t){
    var labels={log:'LOG',stats:'STATS'};
    h+='<span data-wltab="'+t+'" class="wl-tab'+(wlTab===t?' active':'')+'" style="font-size:10px;padding:3px 10px;border:1px solid '+(wlTab===t?'var(--cp)':'rgba(255,255,255,.12)')+';color:'+(wlTab===t?'var(--cp)':'var(--dim)')+';cursor:pointer">'+labels[t]+'</span>';
  });
  h+='</div>';

  if(wlTab==='stats'){
    h+=wlBuildStats();
  } else {
    // Start buttons
    h+='<div style="display:flex;gap:6px;margin-bottom:14px">';
    h+='<button id="wl-start-btn" style="flex:2;padding:12px;background:rgba(255,95,160,.08);border:1px solid var(--cp);color:var(--cp);font-family:monospace;font-size:12px;cursor:pointer;letter-spacing:1px">&#9654; START SESSION</button>';
    h+='<button id="wl-log-past-btn" style="flex:1;padding:12px;background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--dim);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">+ LOG PAST</button>';
    h+='</div>';
    // Past sessions
    if(!wlData.length){
      h+='<div style="color:var(--dim);font-size:12px">No sessions yet. Start your first workout above.</div>';
    } else {
      wlData.slice(0,20).forEach(function(s,si){
        var dur=s.endTs?wlFmt(s.endTs-s.startTs):'—';
        var exNames=s.exercises.map(function(e){return e.name;}).join(', ');
        h+='<div class="wl-session">';
        var isPendingDel=_wlPendingDelete===String(s.id);
        h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
        h+='<span style="font-size:11px;color:var(--text)">'+s.date+'</span>';
        h+='<div style="display:flex;align-items:center;gap:6px">';
        h+='<span style="font-size:10px;color:var(--dim)">'+s.exercises.length+' ex</span>';
        h+='<span data-wleditsess="'+s.id+'" style="font-size:10px;color:var(--cc);cursor:pointer;opacity:.6;padding:2px 6px;border:1px solid rgba(0,229,255,.2)">✎ edit</span>';
        if(isPendingDel){
          h+='<span style="font-size:10px;color:var(--cr)">sure?</span>';
          h+='<span data-wldelses="'+s.id+'" style="font-size:10px;color:var(--cr);cursor:pointer;padding:2px 8px;border:1px solid rgba(255,68,68,.5);background:rgba(255,68,68,.1)">YES</span>';
          h+='<span data-wlcanceldel="1" style="font-size:10px;color:var(--dim);cursor:pointer;padding:2px 6px;border:1px solid rgba(255,255,255,.15)">no</span>';
        } else {
          h+='<span data-wldelses="'+s.id+'" style="font-size:10px;color:var(--cr);cursor:pointer;opacity:.4;padding:2px 6px;border:1px solid rgba(255,68,68,.2)">✕</span>';
        }
        h+='</div>';
        h+='</div>';
        s.exercises.forEach(function(ex){
          var mtxt=WL_MUSCLE_TEXT[ex.muscle]||WL_MUSCLE_TEXT.other;
          var setsStr=ex.sets.map(function(st){return st.reps+'×'+st.weight+'lb';}).join(' / ');
          h+='<div style="display:flex;align-items:baseline;gap:6px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
          h+='<span style="font-size:12px;color:var(--text);flex:1">'+ex.name+'</span>';
          h+='<span style="font-size:9px;color:'+mtxt+'">'+ex.muscle+'</span>';
          h+='</div>';
          h+='<div style="font-size:10px;color:var(--dim);padding:2px 0 4px">'+setsStr+'</div>';
          if(ex.note)h+='<div style="font-size:10px;color:var(--dim);font-style:italic;padding-bottom:4px">'+ex.note+'</div>';
        });
        h+='</div>';
      });
    }
  }
  el.innerHTML=h;
}

function wlBuildStats(){
  if(!wlData.length)return '<div style="color:var(--dim);font-size:12px;padding:12px 0">No sessions logged yet.</div>';

  var now=new Date();
  var h='';

  // ── Sub-tabs: OVERVIEW / TRENDS / EXERCISES ──
  var st=window._wlStatTab||'overview';
  h+='<div style="display:flex;gap:4px;margin-bottom:14px;flex-wrap:wrap">';
  [{t:'overview',l:'OVERVIEW'},{t:'trends',l:'TRENDS'},{t:'exercises',l:'EXERCISES'}].forEach(function(x){
    var a=st===x.t;
    h+='<span data-wlstab="'+x.t+'" style="font-size:9px;padding:2px 10px;border:1px solid '+(a?'var(--cp)':'rgba(255,255,255,.12)')+';color:'+(a?'var(--cp)':'var(--dim)')+';cursor:pointer;letter-spacing:.5px">'+x.l+'</span>';
  });
  h+='</div>';

  // ── Helper: last N months keys ──
  function monthKeys(n){
    var keys=[];
    for(var i=n-1;i>=0;i--){
      var d=new Date(now.getFullYear(),now.getMonth()-i,1);
      keys.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
    }
    return keys;
  }

  function sessionsByMonth(){
    var map={};
    wlData.forEach(function(s){var mo=s.date.slice(0,7);map[mo]=(map[mo]||0)+1;});
    return map;
  }

  function fmtMo(key){
    var d=new Date(key+'-01');
    return d.toLocaleDateString('en-US',{month:'short'});
  }

  if(st==='overview'){
    // Session frequency
    var months6=monthKeys(6);
    var byMonth=sessionsByMonth();
    var maxSess=Math.max.apply(null,months6.map(function(m){return byMonth[m]||0;}).concat([1]));
    var thisMonthKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    var lastMonthKey=new Date(now.getFullYear(),now.getMonth()-1,1).getFullYear()+'-'+String(new Date(now.getFullYear(),now.getMonth()-1,1).getMonth()+1).padStart(2,'0');
    var thisM=byMonth[thisMonthKey]||0;
    var lastM=byMonth[lastMonthKey]||0;
    var trend=thisM>lastM?'↑':thisM<lastM?'↓':'→';
    var trendCol=thisM>lastM?'var(--cg)':thisM<lastM?'var(--cr)':'var(--dim)';

    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">';
    h+='<div style="text-align:center"><div style="font-size:24px;color:var(--cp)">'+wlData.length+'</div><div style="font-size:9px;color:var(--dim)">TOTAL</div></div>';
    h+='<div style="text-align:center"><div style="font-size:24px;color:var(--cp)">'+thisM+'</div><div style="font-size:9px;color:var(--dim)">THIS MONTH</div></div>';
    h+='<div style="text-align:center"><div style="font-size:24px;color:'+trendCol+'">'+trend+'</div><div style="font-size:9px;color:var(--dim)">VS LAST MO</div></div>';
    h+='</div>';

    // 6-month session bar chart
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:8px">SESSIONS PER MONTH</div>';
    h+='<div style="display:flex;align-items:flex-end;gap:4px;height:60px;margin-bottom:4px">';
    months6.forEach(function(mo){
      var v=byMonth[mo]||0;
      var pct=maxSess>0?Math.round(v/maxSess*100):0;
      var isCur=mo===thisMonthKey;
      h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">';
      h+='<div style="font-size:8px;color:'+(isCur?'var(--cp)':'var(--dim)')+'">'+( v||'')+'</div>';
      h+='<div style="width:100%;background:'+(isCur?'var(--cp)':'rgba(255,95,160,.4)')+';height:'+Math.max(2,pct)+'%;border-radius:1px 1px 0 0;min-height:'+(v?'4px':'2px')+'"></div>';
      h+='<div style="font-size:8px;color:'+(isCur?'var(--cp)':'var(--dim)')+'">'+fmtMo(mo)+'</div>';
      h+='</div>';
    });
    h+='</div>';

    // Muscle group frequency this month vs last month
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin:14px 0 8px">MUSCLE GROUPS THIS MONTH VS LAST</div>';
    var muscleThisMonth={};var muscleLastMonth={};
    wlData.forEach(function(s){
      var mo=s.date.slice(0,7);
      s.exercises.forEach(function(ex){
        var m=ex.muscle||'other';
        if(mo===thisMonthKey)muscleThisMonth[m]=(muscleThisMonth[m]||0)+1;
        if(mo===lastMonthKey)muscleLastMonth[m]=(muscleLastMonth[m]||0)+1;
      });
    });
    var allMuscles=Array.from(new Set(Object.keys(muscleThisMonth).concat(Object.keys(muscleLastMonth))));
    allMuscles.sort();
    allMuscles.forEach(function(m){
      var cur=muscleThisMonth[m]||0;
      var prev=muscleLastMonth[m]||0;
      var col=WL_MUSCLE_TEXT[m]||'#aaa';
      var tr=cur>prev?'↑ more':cur<prev?'↓ less':'same';
      var trCol=cur>prev?'var(--cg)':cur<prev?'var(--cr)':'var(--dim)';
      h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">';
      h+='<span style="font-size:10px;color:'+col+';width:80px">'+m.toUpperCase()+'</span>';
      h+='<span style="font-size:11px;color:var(--text);flex:1">'+cur+'x this month</span>';
      h+='<span style="font-size:10px;color:'+trCol+'">'+tr+' ('+prev+')</span>';
      h+='</div>';
    });

  } else if(st==='trends'){
    // Weight progression per exercise
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:10px">WEIGHT PROGRESSION</div>';
    h+='<div style="font-size:10px;color:var(--dim);margin-bottom:10px;opacity:.7">Best weight per session for each exercise.</div>';

    // Build per-exercise progression
    var exSessions={};
    var sessionsSorted=wlData.slice().sort(function(a,b){return a.date>b.date?1:-1;});
    sessionsSorted.forEach(function(s){
      s.exercises.forEach(function(ex){
        if(!exSessions[ex.name])exSessions[ex.name]=[];
        var best=ex.sets.reduce(function(m,st){return Math.max(m,st.weight||0);},0);
        if(best>0)exSessions[ex.name].push({date:s.date,weight:best});
      });
    });

    // Show exercises that have 2+ data points
    var exNames=Object.keys(exSessions).filter(function(n){return exSessions[n].length>=2;});
    if(!exNames.length){
      h+='<div style="color:var(--dim);font-size:11px">Log 2+ sessions with the same exercise to see progression.</div>';
    } else {
      exNames.forEach(function(name){
        var pts=exSessions[name];
        var first=pts[0].weight;
        var last=pts[pts.length-1].weight;
        var pr=Math.max.apply(null,pts.map(function(p){return p.weight;}));
        var diff=last-first;
        var diffStr=(diff>0?'+':'')+diff+'lb';
        var diffCol=diff>0?'var(--cg)':diff<0?'var(--cr)':'var(--dim)';
        var muscle=wlAutoMuscle(name);
        var mcol=WL_MUSCLE_TEXT[muscle]||'#aaa';
        h+='<div style="margin-bottom:12px">';
        h+='<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:4px">';
        h+='<span style="font-size:12px;color:var(--text);flex:1">'+name+'</span>';
        h+='<span style="font-size:9px;color:'+mcol+'">'+muscle+'</span>';
        h+='</div>';
        // Mini sparkline SVG
        var W=200,H=28,pad=2;
        var weights=pts.map(function(p){return p.weight;});
        var minW=Math.min.apply(null,weights);
        var maxW=Math.max.apply(null,weights);
        var range=maxW-minW||1;
        h+='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:28px;margin-bottom:4px">';
        if(pts.length>=2){
          var polyPts=pts.map(function(p,i){
            var x=pad+(W-pad*2)*(i/(pts.length-1));
            var y=pad+(H-pad*2)*(1-(p.weight-minW)/range);
            return x+','+y;
          }).join(' ');
          h+='<polyline points="'+polyPts+'" fill="none" stroke="var(--cp)" stroke-width="1.5" stroke-linejoin="round"/>';
          pts.forEach(function(p,i){
            var x=pad+(W-pad*2)*(i/(pts.length-1));
            var y=pad+(H-pad*2)*(1-(p.weight-minW)/range);
            h+='<circle cx="'+x+'" cy="'+y+'" r="2.5" fill="var(--cp)"/>';
          });
        }
        h+='</svg>';
        h+='<div style="display:flex;gap:12px;font-size:10px">';
        h+='<span style="color:var(--dim)">Start: <span style="color:var(--text)">'+first+'lb</span></span>';
        h+='<span style="color:var(--dim)">Now: <span style="color:var(--text)">'+last+'lb</span></span>';
        h+='<span style="color:var(--dim)">PR: <span style="color:var(--ca)">'+pr+'lb</span></span>';
        h+='<span style="color:'+diffCol+'">'+diffStr+'</span>';
        h+='</div>';
        h+='</div>';
      });
    }

    // Session frequency trend
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin:14px 0 8px">WORKOUT FREQUENCY TREND</div>';
    var months4=monthKeys(4);
    var byMo=sessionsByMonth();
    var vals=months4.map(function(m){return byMo[m]||0;});
    var increasing=vals[vals.length-1]>vals[0];
    var consistent=vals.every(function(v){return Math.abs(v-vals[0])<=1;});
    var msg=consistent?'Consistent frequency across months':increasing?'Frequency is trending up lately ↑':'Frequency has dipped recently — time to push ↑';
    var msgCol=consistent?'var(--ca)':increasing?'var(--cg)':'var(--dim)';
    h+='<div style="font-size:11px;color:'+msgCol+';margin-bottom:8px;line-height:1.5">'+msg+'</div>';
    h+='<div style="display:flex;gap:8px">';
    months4.forEach(function(mo,i){
      var v=byMo[mo]||0;
      var isCur=mo===( now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'));
      h+='<div style="flex:1;text-align:center">';
      h+='<div style="font-size:16px;color:'+(isCur?'var(--cp)':'var(--text)')+'">'+v+'</div>';
      h+='<div style="font-size:9px;color:var(--dim)">'+fmtMo(mo)+'</div>';
      h+='</div>';
      if(i<3){var arrow=vals[i+1]>v?'↑':vals[i+1]<v?'↓':'→';var ac=vals[i+1]>v?'var(--cg)':vals[i+1]<v?'var(--cr)':'var(--dim)';h+='<div style="font-size:14px;color:'+ac+';align-self:center">'+arrow+'</div>';}
    });
    h+='</div>';

  } else {
    // EXERCISES tab — PRs and frequency per exercise
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:10px">ALL EXERCISES</div>';
    var muscleOrder=['chest','back','shoulders','arms','legs','core','cardio','other'];
    var groups={};
    wlData.forEach(function(s){
      s.exercises.forEach(function(ex){
        var m=ex.muscle||'other';
        if(!groups[m])groups[m]={};
        if(!groups[m][ex.name])groups[m][ex.name]={sessions:0,pr:0,lastDate:''};
        groups[m][ex.name].sessions++;
        var best=ex.sets.reduce(function(mx,st){return Math.max(mx,st.weight||0);},0);
        if(best>groups[m][ex.name].pr)groups[m][ex.name].pr=best;
        if(s.date>groups[m][ex.name].lastDate)groups[m][ex.name].lastDate=s.date;
      });
    });
    muscleOrder.forEach(function(m){
      if(!groups[m])return;
      var col=WL_MUSCLE_TEXT[m]||'#aaa';
      h+='<div style="margin-bottom:12px">';
      h+='<div style="font-size:9px;color:'+col+';letter-spacing:2px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid rgba(255,255,255,.08)">'+m.toUpperCase()+'</div>';
      Object.keys(groups[m]).sort().forEach(function(name){
        var ex=groups[m][name];
        h+='<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
        h+='<span style="font-size:12px;color:var(--text);flex:1">'+name+'</span>';
        h+='<span style="font-size:9px;color:var(--dim)">'+ex.sessions+'x</span>';
        if(ex.pr>0)h+='<span style="font-size:9px;color:var(--ca);background:rgba(255,204,0,.1);border:1px solid rgba(255,204,0,.25);padding:1px 5px">'+ex.pr+'lb PR</span>';
        h+='</div>';
      });
      h+='</div>';
    });
  }
  return h;
}

// Event delegation for workout log
document.addEventListener('click',function(e){
  var t=e.target;
  var btn=t.closest?t.closest('[id],[data-wltab],[data-wlac],[data-wladdset],[data-wldex],[data-wldsi],[data-wlgroup],[data-wlpick],[data-wldelses],[data-wlstab],[data-wlcanceldel],[data-wleditsess]'):t;
  if(!btn)return;
  if(btn.id==='wl-start-btn'){wlStartSession();return;}
  if(btn.id==='wl-log-past-btn'){wlStartManual();return;}
  if(btn.id==='wl-cancel-btn'){wlCancelSession();return;}
  if(btn.id==='wl-end-btn'){wlEndSession();return;}
  if(btn.dataset&&btn.dataset.wltab){wlTab=btn.dataset.wltab;wlRender();return;}
  if(btn.dataset&&btn.dataset.wlstab){window._wlStatTab=btn.dataset.wlstab;wlRender();return;}
  if(btn.dataset&&btn.dataset.wldelses!==undefined){wlDeleteSession(btn.dataset.wldelses);return;}
  if(btn.dataset&&btn.dataset.wlcanceldel!==undefined){wlCancelDelete();return;}
  if(btn.dataset&&btn.dataset.wleditsess!==undefined){wlEditSession(btn.dataset.wleditsess);return;}
  if(btn.dataset&&btn.dataset.wlpick){wlAddExercise(btn.dataset.wlpick);return;}
  if(btn.dataset&&btn.dataset.wlgroup){
    var gk='wl_open_'+btn.dataset.wlgroup;
    window[gk]=!window[gk];
    wlRenderActive();return;
  }
  if(btn.dataset&&btn.dataset.wlac){
    var inp=document.getElementById('wl-ex-inp');
    if(inp)inp.value=btn.dataset.wlac;
    var ac=document.getElementById('wl-ac');if(ac)ac.style.display='none';
    wlAddExercise(btn.dataset.wlac);return;
  }
  if(btn.dataset&&btn.dataset.wladdset!==undefined){wlAddSet(+btn.dataset.wladdset);return;}
  if(btn.dataset&&btn.dataset.wldex!==undefined){wlDeleteExercise(+btn.dataset.wldex);return;}
  if(btn.dataset&&btn.dataset.wldsi!==undefined){wlRemoveSet(+btn.dataset.wlei,+btn.dataset.wldsi);return;}
});

// Load any active session on page load
wlLoadActive();
setTimeout(function(){wlRender();},450);

function wlEditSession(id){
  var sess=wlData.find(function(s){return String(s.id)===String(id);});
  if(!sess)return;
  // Remove from history, load into active
  wlData=wlData.filter(function(s){return String(s.id)!==String(id);});
  wlSave();
  wlActiveSession=JSON.parse(JSON.stringify(sess)); // deep copy
  wlActiveSession.manual=true; // show date picker
  wlSaveActive();
  wlRender();
}
var _wlPendingDelete=null;
function wlDeleteSession(id){
  if(_wlPendingDelete===String(id)){
    // Second tap — confirmed
    wlData=wlData.filter(function(s){return String(s.id)!==String(id);});
    wlSave();_wlPendingDelete=null;wlRender();
  } else {
    // First tap — ask
    _wlPendingDelete=String(id);wlRender();
  }
}
function wlCancelDelete(){_wlPendingDelete=null;wlRender();}

function pomoRequestDelete(date,idx){
  window._pomoPendingDel={d:date,i:idx};
  pomoRenderLog();
}
function pomoCancelDelete(){
  window._pomoPendingDel=null;
  pomoRenderLog();
}
function pomoConfirmDelete(date,idx){
  window._pomoPendingDel=null;
  var log=JSON.parse(localStorage.getItem('pomo_log_'+date)||'[]');
  if(!log[idx])return;
  log.splice(idx,1);
  localStorage.setItem('pomo_log_'+date,JSON.stringify(log));
  if(date===pomoGetDayKey()){
    pomoState.sessionLog=log.map(function(e){return {mode:e.type||e,mins:e.mins||0,ts:e.ts||''};});
    pomoState.sessions=pomoState.sessionLog.filter(function(e){return e.mode==='work';}).length;
    pomoSaveDay(false);
  }
  pomoRenderLog();
  pomoRender();
}

// Pomo delete delegation
document.addEventListener('click',function(e){
  var t=e.target;
  var btn=t.closest?t.closest('[data-pomoreqdel],[data-pomoconfirmdel],[data-pomocanceldel]'):t;
  if(!btn)return;
  if(btn.dataset.pomoreqdel){pomoRequestDelete(btn.dataset.date,+btn.dataset.idx);return;}
  if(btn.dataset.pomoconfirmdel){pomoConfirmDelete(btn.dataset.date,+btn.dataset.idx);return;}
  if(btn.dataset.pomocanceldel){pomoCancelDelete();return;}
});

// Weekly Routines delegation
document.addEventListener('click',function(e){
  var t=e.target;
  var btn=t.closest?t.closest('[data-wmadd],[data-wmtab],[data-wmtoggle],[data-wmdel]'):t;
  if(!btn)return;
  if(btn.dataset.wmadd){wmAdd();return;}
  if(btn.dataset.wmtab){wmSwitchTab(btn.dataset.wmtab);return;}
  if(btn.dataset.wmtoggle!==undefined){var _wi=btn.dataset.wi!==undefined?+btn.dataset.wi:+btn.dataset.wmtoggle;wmToggle(_wi);return;}
  if(btn.dataset.wmdel!==undefined){var _wid=btn.dataset.wi!==undefined?+btn.dataset.wi:+btn.dataset.wmdel;wmDelete(_wid);return;}
});

// ── QUICK NAV ──
var QNAV_CARDS=[
  // [id, emoji, label, color]
  ['clock',        '🕐', 'Clock',          'var(--cg)'],
  ['prayer',       '☪',  'Prayer',          'var(--ca)'],
  ['weather',      '⛅', 'Weather',         'var(--cc)'],
  ['stocks',       '◆',  'Markets',         'var(--cl)'],
  ['todo',         '▣',  'To-Do',           'var(--cp)'],
  ['notes',        '▤',  'Notes',           'var(--cc)'],
  ['meals',        '◉',  'Meals',           'var(--co)'],
  ['calendar',     '▦',  'Calendar',        'var(--cpr)'],
  ['schedule',     '🕖', 'Schedule',        'var(--cg)'],
  ['books',        '📖', 'Books',           '#9b6fff'],
  ['goals',        '🎯', 'Goals',           'var(--ca)'],
  ['pomodoro',     '⏱', 'Pomodoro',        'var(--cp)'],
  ['prayer-tracker','📈','Salah Tracker',   'var(--ca)'],
  ['mood-log',     '🌊', 'Mood Log',        '#869BAB'],
  ['milestone',    '🎯', 'Days Until',      'var(--cg)'],
  ['day-blocks',   '🟧', 'Day Blocks',      'var(--cpr)'],
  ['workout-log',  '💪', 'Workout',         'var(--cp)'],
  ['weekly-moments','✨','Routines',        'var(--ca)'],
  ['weekly-review','📋', 'Weekly Review',   'var(--cg)'],
  ['decision-log', '⚖', 'Decision Log',    'var(--cpr)'],
  ['energy-map',   '⚡', 'Energy Map',     'var(--cc)'],
  ['life-streaks', '🔥', 'Life Streaks',    'var(--cp)'],
  ['writers-den',  '✍',  "Writer's Den",   'var(--cc)'],
  ['islamic-topics','☯', 'Islamic Topics',  'var(--ca)'],
  ['quran-tracker','📖', 'Quran Pages',     'var(--ca)'],
  ['juz-amma',     '📱', 'Juz Amma',        'var(--ca)'],
  ['birthdays',    '🎂', 'Birthdays',       '#ff69b4'],
  ['season-traditions','🍂','Seasons',      'var(--co)'],
  ['ebook-library','📚', 'E-Book Lib',      '#9b6fff'],
  ['weekend-warrior','🏋','Weekend Warrior','var(--cg)'],
  ['raft',         '🚣', 'Raft',            '#5ecfff'],
  ['quran-cards',  '🃏', 'Quran Cards',      'var(--cc)'],
  ['for-akhira',   '🌙', 'For Akhira',       'var(--ca)'],
  ['the-wall',     '🧱', 'The Wall',         '#ff8c42'],
  ['reframe',      '🔄', 'Reframe',          '#7eb8ff'],
  ['legacy-letter','✉️',  'Legacy Letter',    '#f5a623'],
  ['shadow-log',   '🌑', 'Shadow Log',       '#bf5fff'],
  ['fear-inventory','💀', 'Fear Inventory',   '#ff8c42'],
  ['countdown',    '⏳', 'In X Days',        'var(--cc)'],
  ['gratitude-log','🌿', 'Gratitude',       'var(--cg)'],
  ['dua-card',     '🤲', 'Dua',              'var(--ca)'],
  ['rent-payments','🏠', 'Rent',             'var(--cp)'],
  ['bookmarks',    '🔖', 'Bookmarks',       'var(--cc)'],
  ['settings',     '⚙',  'Settings',        'var(--dim)'],
  ['people-become', '⭐', 'People I Become',  '#f5a623'],
  ['writing-log',   '✍', 'Creative Writing', '#bf5fff'],
  ['stress-demess', '🌊', 'Stress Demess', '#c77dff'],
  ['calorie-counter','🍽', 'Calorie Log',  '#00e5ff'],
  ['quran-words',    '📗', 'Quran Words',  '#00ff88'],
  ['ayah-recall',    '🕌', 'Ayah Recall',  '#ffcc00'],
  ['ayah-completion','📖', 'Ayah Completion','#00e5ff'],
  ['surah-map',       '🗺️', 'Surah Map',     '#7eb8ff'],
  ['voice-study',    '✍️',        'Voice Study',   '#50fa7b'],
  ['articulate',     '🗣️',    'Articulate',    '#ffb86c'],
  ['quran-tafsir',   '📖',    'Quran Tafsir',  'var(--ca)'],
  ['certifications', '🏅',    'Certifications','#50fac8'],
  ['medicine',       '💊',    'Medicine',      '#c896ff'],
  ['quest',          '⚔',     'Quest',         '#ffa500']
];


var _qnavMode=localStorage.getItem('qnav_mode')||'both'; // 'both','labels','icons'
var _qnavMostUsed=localStorage.getItem('qnav_mostused')==='1';
var _qnavSort=localStorage.getItem('qnav_sort')||'default'; // 'default','mostused','alpha'

function qnavScrollTo(id){
  var tile=document.querySelector('[data-id="'+id+'"]');
  if(tile){tile.scrollIntoView({behavior:'smooth',block:'center'});}
}

// Sort: 'default' | 'mostused' | 'alpha'
var _qnavClicks=JSON.parse(localStorage.getItem('qnav_clicks')||'[]');

function qnavTrackClick(id){
  _qnavClicks.unshift(id);
  if(_qnavClicks.length>77)_qnavClicks=_qnavClicks.slice(0,77);
  localStorage.setItem('qnav_clicks',JSON.stringify(_qnavClicks));
}

function qnavGetSorted(visible){
  if(_qnavSort==='mostused'){
    var counts={};
    _qnavClicks.forEach(function(id){counts[id]=(counts[id]||0)+1;});
    return visible.slice().sort(function(a,b){return (counts[b[0]]||0)-(counts[a[0]]||0);});
  }
  if(_qnavSort==='alpha'){
    return visible.slice().sort(function(a,b){return a[2].localeCompare(b[2]);});
  }
  return visible; // default order
}

function qnavRender(){
  var el=document.getElementById('qnav-body');
  if(!el)return;
  var hidden=JSON.parse(localStorage.getItem('dash_hidden_tiles')||'[]');
  var visible=QNAV_CARDS.filter(function(c){
    return c[0]!=='quick-nav'&&hidden.indexOf(c[0])<0&&document.querySelector('[data-id="'+c[0]+'"]');
  });

  // Gear button active state
  var gearBtn=document.getElementById('qnav-gear-btn');
  if(gearBtn)gearBtn.style.color=window._qnavSettings?'var(--cc)':'var(--dim)';

  if(window._qnavSettings){
    // ── SETTINGS PANEL ──
    var h='<div style="padding:2px 0 8px">';

    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:2px;margin-bottom:8px">DISPLAY</div>';
    [{k:'both',l:'Icons + Labels'},{k:'icons',l:'Icons Only'},{k:'labels',l:'Labels Only'}].forEach(function(x){
      var a=_qnavMode===x.k;
      h+='<div data-qnavmode="'+x.k+'" style="display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:4px;'
        +'border:1px solid rgba(255,255,255,'+(a?'.25':'.07')+');background:rgba(255,255,255,'+(a?'.07':'0')+');cursor:pointer">';
      h+='<span style="font-size:13px;color:'+(a?'var(--cc)':'var(--dim)')+';">'+(a?'◉':'○')+'</span>';
      h+='<span style="font-size:12px;color:'+(a?'var(--text)':'var(--dim)')+'">'+x.l+'</span>';
      h+='</div>';
    });

    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:2px;margin:12px 0 8px">SORT ORDER</div>';
    [{k:'default',l:'Default'},{k:'mostused',l:'Most Used First'},{k:'alpha',l:'Alphabetical A\u2013Z'}].forEach(function(x){
      var a=_qnavSort===x.k;
      h+='<div data-qnavsort="'+x.k+'" style="display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:4px;'
        +'border:1px solid rgba(255,255,255,'+(a?'.25':'.07')+');background:rgba(255,255,255,'+(a?'.07':'0')+');cursor:pointer">';
      h+='<span style="font-size:13px;color:'+(a?'var(--cc)':'var(--dim)')+';">'+(a?'◉':'○')+'</span>';
      h+='<span style="font-size:12px;color:'+(a?'var(--text)':'var(--dim)')+'">'+x.l+'</span>';
      h+='</div>';
    });

    h+='</div>';
    el.innerHTML=h;

    el.querySelectorAll('[data-qnavmode]').forEach(function(btn){
      var fn=function(){_qnavMode=this.dataset.qnavmode;localStorage.setItem('qnav_mode',_qnavMode);qnavRender();};
      btn.onclick=fn;
      btn.ontouchend=function(e){e.preventDefault();fn.call(this);};
    });
    el.querySelectorAll('[data-qnavsort]').forEach(function(btn){
      var fn=function(){
        _qnavSort=this.dataset.qnavsort;
        _qnavMostUsed=(_qnavSort==='mostused');
        localStorage.setItem('qnav_sort',_qnavSort);
        localStorage.setItem('qnav_mostused',_qnavMostUsed?'1':'0');
        qnavRender();
      };
      btn.onclick=fn;
      btn.ontouchend=function(e){e.preventDefault();fn.call(this);};
    });
    return;
  }

  // ── CARD GRID ──
  var sorted=qnavGetSorted(visible);
  var counts={};
  _qnavClicks.forEach(function(id){counts[id]=(counts[id]||0)+1;});

  var h='<div class="qnav-grid">';
  sorted.forEach(function(c){
    var id=c[0],emoji=c[1],label=c[2],col=c[3];
    var cnt=counts[id]||0;
    h+='<button class="qnav-btn" data-qnavto="'+id+'" style="border-color:'+col+'40;color:'+col+'" title="'+label+(cnt?' ('+cnt+'x)':'')+'">';
    if(_qnavMode!=='labels')h+='<span class="qnav-emoji">'+emoji+'</span>';
    if(_qnavMode!=='icons')h+='<span>'+label+'</span>';
    if(_qnavSort==='mostused'&&cnt>0)h+='<span style="font-size:8px;opacity:.4;margin-left:2px">'+cnt+'</span>';
    h+='</button>';
  });
  h+='</div>';
  el.innerHTML=h;

  el.querySelectorAll('[data-qnavto]').forEach(function(btn){
    var _touchStartY=0,_touchStartX=0;
    btn.ontouchstart=function(e){
      _touchStartY=e.touches[0].clientY;
      _touchStartX=e.touches[0].clientX;
    };
    btn.ontouchend=function(e){
      var dy=Math.abs(e.changedTouches[0].clientY-_touchStartY);
      var dx=Math.abs(e.changedTouches[0].clientX-_touchStartX);
      if(dy>8||dx>8)return; // finger moved — was a scroll, not a tap
      e.preventDefault();
      var id=this.dataset.qnavto;
      qnavTrackClick(id);
      qnavScrollTo(id);
      if(_qnavSort==='mostused')setTimeout(qnavRender,50);
    };
    btn.onclick=function(){
      var id=this.dataset.qnavto;
      qnavTrackClick(id);
      qnavScrollTo(id);
      if(_qnavSort==='mostused')setTimeout(qnavRender,50);
    };
  });

  // Entrance animation — always on page load, cooldown only if no refresh
  var _QNAV_COOLDOWN=11*60*1000;
  var _qnavLastAnim=parseInt(localStorage.getItem('qnav_last_anim')||'0',10);
  var _qnavIsRefresh=!!(window.performance&&window.performance.navigation&&window.performance.navigation.type===1)||
    !!(window.performance&&window.performance.getEntriesByType&&window.performance.getEntriesByType('navigation')[0]&&window.performance.getEntriesByType('navigation')[0].type==='reload');
  var _shouldAnim=_qnavIsRefresh||(Date.now()-_qnavLastAnim)>=_QNAV_COOLDOWN;
  if(_shouldAnim){
    var _qnavObserver=new IntersectionObserver(function(entries,obs){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          localStorage.setItem('qnav_last_anim',String(Date.now()));
          obs.disconnect();
          var btns=Array.from(el.querySelectorAll('.qnav-btn'));
          var indices=btns.map(function(_,i){return i;}).sort(function(){return Math.random()-0.5;});
          btns.forEach(function(btn){
            btn.style.opacity='0';
            btn.style.transform='scale(0.88)';
            btn.style.transition='none';
          });
          indices.forEach(function(idx){
            var btn=btns[idx];
            var delay=Math.random()*280;
            setTimeout(function(){
              btn.style.transition='opacity 0.22s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)';
              btn.style.opacity='';
              btn.style.transform='';
            },delay);
          });
        }
      });
    },{threshold:0.2});
    _qnavObserver.observe(el);
  }
}

function qnavToggleIcons(){
  var modes=['both','icons','labels'];
  _qnavMode=modes[(modes.indexOf(_qnavMode)+1)%3];
  localStorage.setItem('qnav_mode',_qnavMode);
  qnavRender();
}

setTimeout(function(){qnavRender();},300);

// ── QURAN CARDS ──


var QC_CARDS = [];
(function(){
  fetch('qcards.json')
    .then(function(r){return r.json();})
    .then(function(d){
      QC_CARDS = Array.isArray(d) ? d : (d.cards || []);
      if(typeof qcRenderStudy==='function') qcRenderStudy();
    })
    .catch(function(e){console.warn('qcards.json failed',e);});
})();

// qcState stored in dash_qc:
// { seen:{id:true}, wrong:[id,...], history:[{id,correct,ts}], todayDate, todayCount, queue:[id,...] }
var qcState=JSON.parse(localStorage.getItem('dash_qc')||'{}');
var qcCurrentCard=null;
var qcAnswered=false;
var qcCurrentTab='study';

function qcSave(){localStorage.setItem('dash_qc',JSON.stringify(qcState));}

function qcTodayKey(){
  var n=new Date();
  if(n.getHours()<6)n=new Date(n.getTime()-864e5);
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}

function qcEnsureState(){
  if(!qcState.seen)qcState.seen={};
  if(!qcState.wrong)qcState.wrong=[];
  if(!qcState.history)qcState.history=[];
  if(!qcState.queue)qcState.queue=[];
  if(!qcState.correct)qcState.correct=[];
  if(!qcState.streaks)qcState.streaks={}; // {cardId: consecutiveCorrect}
  if(!qcState.nextReview)qcState.nextReview={}; // {cardId: ISO date string}
  if(qcState.todayDate!==qcTodayKey()){qcState._skipSet={};
    qcState.todayDate=qcTodayKey();
    qcState.todayCount=0;
    qcState.todayNewCount=0;
    qcState.todayReviewCount=0;
    qcState.wrong.forEach(function(id){if(qcState.queue.indexOf(id)<0)qcState.queue.push(id);});
    // Pick 3-5 random correct cards for review today (new limit is 6)
    // Exclude cards whose nextReview date is in the future (SRS cooldown)
    var todayKey2=qcTodayKey();
    var pool=qcState.correct.filter(function(id){
      if(qcState.wrong.indexOf(id)>=0)return false;
      var nr=qcState.nextReview&&qcState.nextReview[id];
      if(nr&&nr>todayKey2)return false; // still cooling down
      return true;
    });
    for(var si=pool.length-1;si>0;si--){var sj=Math.floor(Math.random()*(si+1));var st=pool[si];pool[si]=pool[sj];pool[sj]=st;}
    qcState.todayReviewQueue=pool.slice(0,3+Math.floor(Math.random()*3));
  }
  if(!qcState.todayReviewQueue)qcState.todayReviewQueue=[];
}

function qcNextCard(){
  qcEnsureState();
  var newDone=qcState.todayNewCount||0;
  var revDone=qcState.todayReviewCount||0;
  var revTarget=qcState.todayReviewQueue?qcState.todayReviewQueue.length:0;
  if(newDone>=6&&revDone>=revTarget){return null;}
  var skipSet=qcState._skipSet||{};
  var queue=(qcState.queue||[]).filter(function(id){return QC_CARDS.some(function(c){return c.id===id;});});
  qcState.queue=queue;
  // Wrong queue first — skip cards in skipSet, try next
  if(queue.length>0&&newDone<6){
    var qCard=null;
    for(var qi=0;qi<queue.length;qi++){
      if(!skipSet[queue[qi]]){
        qCard=QC_CARDS.find(function(c){return c.id===queue[qi];})||null;
        if(qCard)break;
      }
    }
    if(qCard)return qCard;
  }
  // Review cards interleaved
  if(revDone<revTarget){
    // Find next review card not in skipSet
    var revQueue=qcState.todayReviewQueue||[];
    for(var ri=revDone;ri<revQueue.length;ri++){
      var revId2=revQueue[ri];
      if(!skipSet[revId2]){
        var revCard2=QC_CARDS.find(function(c){return c.id===revId2;});
        if(revCard2)return revCard2;
      }
    }
  }
  // New unseen
  if(newDone<6){
    var unseen=QC_CARDS.filter(function(c){return !qcState.seen[c.id]&&(qcState.wrong||[]).indexOf(c.id)<0;});
    if(!unseen.length){qcState.seen={};unseen=QC_CARDS.filter(function(c){return (qcState.wrong||[]).indexOf(c.id)<0;});}
    if(!unseen.length)unseen=QC_CARDS.slice();
    return unseen[Math.floor(Math.random()*unseen.length)];
  }
  return null;
}

function qcShuffleChoices(card){
  var choices=[card.a].concat(card.wrong);
  // Fisher-Yates shuffle
  for(var i=choices.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var tmp=choices[i];choices[i]=choices[j];choices[j]=tmp;
  }
  return choices;
}

function qcTab(t){
  qcCurrentTab=t;
  ['study','learn','review','stats'].forEach(function(x){
    var btn=document.getElementById('qctab-'+x);
    var panel=document.getElementById('qc-panel-'+x);
    if(btn){btn.style.color=x===t?'var(--cc)':'var(--dim)';btn.style.borderColor=x===t?'var(--cc)':'var(--dim)';}
    if(panel)panel.style.display=x===t?'':'none';
  });
  if(t==='study')qcRenderStudy();
  else if(t==='learn')qcRenderLearn();
  else if(t==='review'){qcReviewIdx=0;qcRenderReview();}
  else qcRenderStats();
}

function qcRenderLearn(){
  var el=document.getElementById('qc-panel-learn');
  if(!el)return;
  if(!QC_CARDS||!QC_CARDS.length){
    el.innerHTML='<div style="font-size:11px;color:var(--dim);padding:10px">Loading...</div>';
    setTimeout(function(){if(QC_CARDS&&QC_CARDS.length)qcRenderLearn();},600);
    return;
  }
  if(!qcState.learnDate)qcState.learnDate='';
  if(!qcState.learnWords)qcState.learnWords=[];
  if(!qcState.learnSeen)qcState.learnSeen={};
  if(!qcState.learnRevealed)qcState.learnRevealed={};
  var _lToday=qcTodayKey();
  var _lBadWords=qcState.learnWords.length>0&&!qcState.learnWords[0].q;
  var _lNeedsRebuild=qcState.learnDate!==_lToday
    ||(qcState.learnWords.length===0&&QC_CARDS.length>0)
    ||_lBadWords;
  if(_lNeedsRebuild){
    qcState.learnDate=_lToday;
    qcState.learnRevealed={};
    var _pool=QC_CARDS.filter(function(c){return !qcState.learnSeen[c.id];});
    qcState.learnWords=_pool.slice(0,15).map(function(c){return {id:c.id,q:c.q,a:c.a,cat:c.cat};});
    if(QC_CARDS.length)qcSave();
  }
  var _lW=qcState.learnWords||[];
  var _lRev=Object.keys(qcState.learnRevealed||{}).length;
  var _lSeen=Object.keys(qcState.learnSeen||{}).length;
  var h='';
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:10px;color:var(--dim)">';
  h+='<span style="color:var(--cc)">'+_lRev+'</span><span>/'+_lW.length+' revealed</span>';
  h+='<div style="flex:1;height:2px;background:rgba(255,255,255,.06)"><div style="height:100%;width:'+(_lW.length?_lRev/_lW.length*100:0)+'%;background:var(--cc);transition:width .3s"></div></div>';
  h+='<span style="font-size:9px;color:rgba(255,255,255,.2)">'+_lSeen+' total</span>';
  h+='</div>';
  if(!_lW.length){
    h+='<div style="padding:20px;text-align:center;border:1px solid rgba(0,229,255,.15);background:rgba(0,229,255,.04)">';
    h+='<div style="font-size:24px;margin-bottom:8px">📖</div>';
    h+='<div style="font-size:13px;color:var(--cc);margin-bottom:4px">All cards learned!</div>';
    h+='<div style="font-size:10px;color:var(--dim)">'+_lSeen+' total · come back tomorrow</div>';
    h+='</div>';
  } else {
    h+='<table style="width:100%;border-collapse:collapse">';
    h+='<thead><tr style="border-bottom:1px solid rgba(255,255,255,.1)">';
    h+='<th style="padding:5px 6px;font-size:9px;color:var(--dim);letter-spacing:1px;text-align:left;width:26px">#</th>';
    h+='<th style="padding:5px 6px;font-size:9px;color:var(--dim);letter-spacing:1px;text-align:left">QUESTION</th>';
    h+='<th style="padding:5px 6px;font-size:9px;color:var(--dim);letter-spacing:1px;text-align:left">ANSWER</th>';
    h+='</tr></thead><tbody>';
    _lW.forEach(function(w,i){
      var rev=!!(qcState.learnRevealed&&qcState.learnRevealed[w.id]);
      h+='<tr style="border-bottom:1px solid rgba(255,255,255,.04)">';
      h+='<td style="padding:9px 6px;color:rgba(255,255,255,.2);font-size:10px;vertical-align:middle">'+(i+1)+'</td>';
      h+='<td style="padding:9px 6px;vertical-align:middle;font-size:11px;color:var(--text);line-height:1.4">'+w.q+'</td>';
      h+='<td style="padding:9px 6px;vertical-align:middle">';
      if(rev){
        h+='<span style="font-size:12px;color:var(--cc)">'+w.a+'</span>';
      } else {
        h+='<button data-qcreveal="'+w.id+'" style="padding:4px 10px;background:transparent;border:1px solid rgba(0,229,255,.2);color:var(--dim);font-family:monospace;font-size:9px;cursor:pointer;letter-spacing:1px">SHOW</button>';
      }
      h+='</td></tr>';
    });
    h+='</tbody></table>';
    h+='<button data-qclearnall="1" style="width:100%;margin-top:12px;padding:9px;background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.25);color:var(--cc);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:1px">✓ MARK ALL LEARNED</button>';
  }
  el.innerHTML=h;
  el.querySelectorAll('[data-qcreveal]').forEach(function(btn){
    btn.onclick=function(){
      var wid=this.dataset.qcreveal;
      if(!qcState.learnRevealed)qcState.learnRevealed={};
      if(!qcState.learnSeen)qcState.learnSeen={};
      qcState.learnRevealed[wid]=true;
      qcState.learnSeen[wid]=qcTodayKey();
      if(typeof hap==='function')hap(HAP.soft);
      qcSave();qcRenderLearn();
    };
    btn.ontouchend=function(e){e.preventDefault();btn.onclick();};
  });
  var learnAllBtn=el.querySelector('[data-qclearnall]');
  if(learnAllBtn)learnAllBtn.onclick=function(){
    var _t=qcTodayKey();
    if(!qcState.learnRevealed)qcState.learnRevealed={};
    if(!qcState.learnSeen)qcState.learnSeen={};
    (qcState.learnWords||[]).forEach(function(w){
      qcState.learnRevealed[w.id]=true;
      qcState.learnSeen[w.id]=_t;
    });
    if(typeof hap==='function')hap(HAP.check);
    qcSave();qcRenderLearn();
  };
}

function qcRenderStudy(){
  var el=document.getElementById('qc-panel-study');
  if(!el)return;
  qcEnsureState();
  var badge=document.getElementById('qc-badge');
  var done=qcState.todayCount||0;
  var wrong=qcState.wrong?qcState.wrong.length:0;
  var nd2=qcState.todayNewCount||0;var rd2=qcState.todayReviewCount||0;var rt2=qcState.todayReviewQueue?qcState.todayReviewQueue.length:0;
  if(badge)badge.textContent=nd2+'/6 new · '+rd2+'/'+rt2+' review'+(wrong?' · '+wrong+' missed':'');

  // Streak dots — last 10 answers
  var hist=(qcState.history||[]).slice(-10);
  var streakH='<div class="qc-streak">';
  hist.forEach(function(h){
    streakH+='<div class="qc-streak-dot '+(h.correct?'correct':'wrong')+'"></div>';
  });
  streakH+='</div>';

  var rt3=qcState.todayReviewQueue?qcState.todayReviewQueue.length:0;
  var allDone=(qcState.todayNewCount||0)>=6&&(qcState.todayReviewCount||0)>=rt3;
  // Cards on cooldown
  var todayKeyS=qcTodayKey();
  var cooled3=(Object.keys(qcState.nextReview||{}).filter(function(id){var nr=qcState.nextReview[id];return nr>todayKeyS&&(qcState.streaks[id]||0)<6;})).length;
  var cooled6=(Object.keys(qcState.nextReview||{}).filter(function(id){var nr=qcState.nextReview[id];return nr>todayKeyS&&(qcState.streaks[id]||0)>=6;})).length;
  if(allDone){
    el.innerHTML=streakH
      +'<div class="qc-card" style="text-align:center">'
      +'<div style="font-size:28px;margin-bottom:8px">&#10003;</div>'
      +'<div style="font-size:13px;color:var(--cg);letter-spacing:1px">All done for today!</div>'
      +'<div style="font-size:10px;color:var(--dim);margin-top:6px">Come back tomorrow for more.'+(wrong?' '+wrong+' card'+(wrong!==1?'s':'')+' will be repeated.':'')+'</div>'
      +'</div>';
    return;
  }

  if(!qcCurrentCard||qcAnswered){
    qcCurrentCard=qcNextCard();
    qcAnswered=false;
  }

  if(!qcCurrentCard){
    el.innerHTML=streakH+'<div style="color:var(--dim);font-size:12px;padding:12px 0">No cards available. Well done!</div>';
    return;
  }

  var card=qcCurrentCard;
  var choices=qcShuffleChoices(card);
  var h=streakH;
  var _qcIsReview=(qcState.todayReviewQueue||[]).indexOf(card.id)>=0;
  var _qcStreak=qcState.streaks&&qcState.streaks[card.id]||0;
  h+='<div class="qc-card">';
  h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
  h+='<div class="qc-cat" style="margin-bottom:0">'+card.cat+'</div>';
  h+='<span style="margin-left:auto;font-size:9px;padding:2px 7px;border:1px solid rgba(255,255,255,.15);color:'+(_qcIsReview?'var(--cc)':'var(--cg)')+';letter-spacing:1px">'+(_qcIsReview?'REVIEW':'NEW')+'</span>';
  if(_qcStreak>=3)h+='<span style="font-size:9px;color:var(--ca)">'+('★'.repeat(Math.min(_qcStreak,6)))+'</span>';
  h+='</div>';
  if(card.hadith)h+='<div class="qc-hadith">&ldquo;'+card.hadith+'&rdquo;</div>';
  h+='<div class="qc-q">'+card.q+'</div>';
  choices.forEach(function(c,i){
    h+='<button class="qc-choice" data-qcc="'+i+'" data-answer="'+encodeURIComponent(c)+'" data-correct="'+(c===card.a?'1':'0')+'" style="display:block">'+c+'</button>';
  });
  h+='<button class="qc-choice" data-qcc="99" data-answer="dontknow" data-correct="0" style="display:block;opacity:.5;font-style:italic;margin-top:4px">I don\'t know</button>';
  h+='<button id="qc-skip-btn" style="display:block;width:100%;margin-top:6px;padding:6px;background:transparent;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.6);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:2px">SKIP ↷</button>';
  h+='<div id="qc-result" style="min-height:24px"></div>';
  h+='<div style="text-align:right;margin-top:4px"><button id="qc-copy-btn" style="font-size:9px;padding:2px 8px;background:transparent;border:1px solid rgba(0,229,255,.2);color:var(--dim);font-family:monospace;cursor:pointer;letter-spacing:1px">&#128203; COPY Q</button></div>';
  h+='</div>';
  h+='<div style="font-size:9px;color:var(--dim);text-align:right;margin-top:4px">'+(done+1)+' of 6 today · '+Object.keys(qcState.seen||{}).length+' of '+QC_CARDS.length+' cards seen</div>';
  el.innerHTML=h;

  // Wire choices
  el.querySelectorAll('[data-qcc]').forEach(function(btn){
    btn.onclick=function(){qcAnswer(this.dataset.correct==='1',card.id,this);};
  });
  // Wire copy button
  var skipBtn=document.getElementById('qc-skip-btn');
  if(skipBtn){
    skipBtn.onclick=function(){
      if(qcAnswered)return;
      if(this.dataset.confirm!=='1'){
        this.textContent='ARE YOU SURE?';
        this.style.color='rgba(255,184,108,.8)';
        this.style.borderColor='rgba(255,184,108,.4)';
        this.dataset.confirm='1';
        var _sk=this;
        setTimeout(function(){if(_sk.dataset.confirm==='1'){_sk.textContent='SKIP ↷';_sk.style.color='rgba(255,255,255,.6)';_sk.style.borderColor='rgba(255,255,255,.3)';_sk.dataset.confirm='';}},2500);
        return;
      }
      // Mark as skipped
      if(qcCurrentCard){
        var sid=qcCurrentCard.id;
        if(qcState.queue&&qcState.queue[0]===sid){qcState.queue.shift();qcState.queue.push(sid);}
        if(!qcState._skipSet)qcState._skipSet={};
        qcState._skipSet[sid]=true;
      }
      // Highlight skip button as activated, show NEXT
      skipBtn.textContent='SKIPPED ✓';
      skipBtn.style.color='var(--cc)';
      skipBtn.style.borderColor='rgba(0,229,255,.3)';
      skipBtn.onclick=null;
      // Add NEXT button
      var _skipNext=document.createElement('button');
      _skipNext.textContent='NEXT →';
      _skipNext.style.cssText='display:block;width:100%;margin-top:6px;padding:7px;background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.2);color:var(--cc);font-family:monospace;font-size:9px;cursor:pointer;letter-spacing:2px';
      var _doNext=function(){qcCurrentCard=null;qcAnswered=false;qcSave();qcRenderStudy();};
      _skipNext.onclick=_doNext;
      _skipNext.ontouchend=function(e){e.preventDefault();_doNext();};
      skipBtn.parentNode.insertBefore(_skipNext,skipBtn.nextSibling);
      qcSave();
    };
    skipBtn.ontouchend=function(e){
      e.preventDefault();
      if(!qcAnswered)skipBtn.onclick();
    };
  }
  var copyBtn=document.getElementById('qc-copy-btn');
  if(copyBtn){
    copyBtn.onclick=function(){
      var txt=(card.hadith?'"'+card.hadith+'"\n\n':'')+card.q;
      if(navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){copyBtn.textContent='\u2713 COPIED';setTimeout(function(){copyBtn.textContent='\u{1F4CB} COPY Q';},1500);});}
      else{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);copyBtn.textContent='\u2713 COPIED';setTimeout(function(){copyBtn.textContent='\u{1F4CB} COPY Q';},1500);}
    };
  }
}

function qcAnswer(isCorrect,cardId,clickedBtn){
  if(qcAnswered)return;
  qcAnswered=true;
  qcEnsureState();
  // Mark seen
  qcState.seen[cardId]=true;
  qcState.history.push({id:cardId,correct:isCorrect,ts:new Date().toISOString()});
  if(qcState.history.length>500)qcState.history=qcState.history.slice(-500);
  if(!qcState.correct)qcState.correct=[];
  var wIdx=(qcState.wrong||[]).indexOf(cardId);
  var cIdx=qcState.correct.indexOf(cardId);
  if(isCorrect){
    if(wIdx>=0)qcState.wrong.splice(wIdx,1);
    var qIdx=qcState.queue.indexOf(cardId);if(qIdx>=0)qcState.queue.splice(qIdx,1);
    if(cIdx<0)qcState.correct.push(cardId);
    // SRS streak tracking
    if(!qcState.streaks)qcState.streaks={};
    if(!qcState.nextReview)qcState.nextReview={};
    qcState.streaks[cardId]=(qcState.streaks[cardId]||0)+1;
    var streak=qcState.streaks[cardId];
    var cooldownDays=0;
    if(streak>=6)cooldownDays=30;       // 6+ in a row: rest 1 month
    else if(streak>=3)cooldownDays=7;   // 3-5 in a row: rest 1 week
    if(cooldownDays>0){
      var nr=new Date();nr.setDate(nr.getDate()+cooldownDays);
      qcState.nextReview[cardId]=nr.toISOString().slice(0,10);
    }
  } else {
    if(wIdx<0)qcState.wrong.push(cardId);
    var qIdx2=qcState.queue.indexOf(cardId);if(qIdx2>=0)qcState.queue.splice(qIdx2,1);
    // Reset streak on wrong answer
    if(qcState.streaks)qcState.streaks[cardId]=0;
    if(qcState.nextReview)delete qcState.nextReview[cardId];
  }
  var isRevCard=(qcState.todayReviewQueue||[]).indexOf(cardId)>=0;
  if(isRevCard){qcState.todayReviewCount=(qcState.todayReviewCount||0)+1;}
  else{qcState.todayNewCount=(qcState.todayNewCount||0)+1;}
  qcState.todayCount=(qcState.todayCount||0)+1;
  qcSave();

  // Show result visually
  var panel=document.getElementById('qc-panel-study');
  if(panel){
    panel.querySelectorAll('[data-qcc]').forEach(function(btn){
      var correct=btn.dataset.correct==='1';
      if(btn===clickedBtn){
        btn.classList.add(isCorrect?'correct':'wrong');
      }
      if(correct&&!isCorrect){
        btn.classList.add('reveal-correct');
      }
      btn.onclick=null;
    });
    var res=document.getElementById('qc-result');
    if(res){
      var qcResCol=isCorrect?'var(--cg)':'var(--cr)';
      var qcResMsg=isCorrect?'\u2713 Correct!':'\u2717 Wrong - correct answer highlighted';
      res.innerHTML='<div class="qc-result" style="color:'+qcResCol+'">'+qcResMsg+' <button onclick="qcNext()" style="margin-left:10px;padding:4px 14px;background:transparent;border:1px solid var(--cc);color:var(--cc);font-family:monospace;font-size:11px;cursor:pointer">NEXT</button></div>';
    }
    if(isCorrect)confetti(window.innerWidth/2,200,'#00ff88');
  }
}

function qcNext(){
  qcCurrentCard=null;
  qcAnswered=false;
  qcRenderStudy();
}

var qcReviewIdx=0;
var qcReviewRevealed={};

function qcGetReviewCards(){
  // Cards answered wrong in the past 7 days
  var cutoff=new Date();cutoff.setDate(cutoff.getDate()-7);
  var cutoffStr=cutoff.toISOString();
  var hist=qcState.history||[];
  // Get unique wrong card IDs from last 7 days, most recent first
  var wrongRecent={};
  hist.slice().reverse().forEach(function(h){
    if(!h.correct&&h.ts>=cutoffStr)wrongRecent[h.id]=true;
  });
  // Exclude those later answered correctly in the window
  hist.slice().reverse().forEach(function(h){
    if(h.correct&&h.ts>=cutoffStr&&wrongRecent[h.id]){
      // Check if the LAST answer for this card was correct
      var lastAns=hist.slice().reverse().find(function(x){return x.id===h.id;});
      if(lastAns&&lastAns.correct)delete wrongRecent[h.id];
    }
  });
  return Object.keys(wrongRecent).map(function(id){
    return QC_CARDS.find(function(c){return c.id===id;});
  }).filter(Boolean);
}

function qcRenderReview(){
  var el=document.getElementById('qc-panel-review');
  if(!el)return;
  qcEnsureState();
  var cards=qcGetReviewCards();
  if(!cards.length){
    el.innerHTML='<div style="color:var(--dim);font-size:12px;padding:12px 0">No missed cards in the past 7 days. Keep it up!</div>';
    return;
  }
  if(qcReviewIdx>=cards.length)qcReviewIdx=0;
  var card=cards[qcReviewIdx];
  var h='<div style="font-size:10px;color:var(--dim);margin-bottom:8px">'+( qcReviewIdx+1)+' of '+cards.length+' missed cards (past 7 days)</div>';
  // Nav arrows
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
  h+='<button id="qcrev-prev" style="padding:4px 14px;background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--dim);font-family:monospace;font-size:12px;cursor:pointer'+(qcReviewIdx===0?';opacity:.3':'')+'">←</button>';
  h+='<div style="flex:1;display:flex;align-items:center;justify-content:center"><div style="display:flex;gap:3px">';
  cards.forEach(function(_,i){
    h+='<div style="width:7px;height:7px;border-radius:50%;background:'+(i===qcReviewIdx?'var(--cc)':'rgba(255,255,255,.15)')+';flex-shrink:0"></div>';
  });
  h+='</div></div>';
  h+='<button id="qcrev-next" style="padding:4px 14px;background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--dim);font-family:monospace;font-size:12px;cursor:pointer'+(qcReviewIdx===cards.length-1?';opacity:.3':'')+'">→</button>';
  h+='</div>';
  var revealed=qcReviewRevealed[qcReviewIdx];
  // Shuffle choices same way as study mode
  var revChoices=[card.a].concat(card.wrong);
  for(var ri=revChoices.length-1;ri>0;ri--){var rj=Math.floor(Math.random()*(ri+1));var rt=revChoices[ri];revChoices[ri]=revChoices[rj];revChoices[rj]=rt;}
  h+='<div class="qc-card">';
  h+='<div class="qc-cat">'+card.cat+'</div>';
  if(card.hadith)h+='<div class="qc-hadith">&ldquo;'+card.hadith+'&rdquo;</div>';
  h+='<div class="qc-q">'+card.q+'</div>';
  if(!revealed){
    revChoices.forEach(function(c,ci){
      h+='<button class="qc-choice" data-qcrc="'+ci+'" data-correct="'+(c===card.a?'1':'0')+'">'+c+'</button>';
    });
    h+='<button class="qc-choice" data-qcrc="99" data-correct="0" style="opacity:.5;font-style:italic;margin-top:4px">I don\'t know</button>';
  } else {
    revChoices.forEach(function(c){
      var isCorrect=(c===card.a);
      h+='<div class="qc-choice '+(isCorrect?'correct':'wrong')+'">'+c+'</div>';
    });
    h+='<div style="font-size:11px;color:var(--cg);text-align:center;padding:8px">&#10003; Answer revealed</div>';
  }
  h+='<div style="text-align:right;margin-top:8px"><button id="qcrev-copy" style="font-size:9px;padding:2px 8px;background:transparent;border:1px solid rgba(0,229,255,.2);color:var(--dim);font-family:monospace;cursor:pointer">&#128203; COPY Q</button></div>';
  h+='</div>';
  el.innerHTML=h;
  var prev=document.getElementById('qcrev-prev');
  var next=document.getElementById('qcrev-next');
  var copy=document.getElementById('qcrev-copy');
  if(prev)prev.onclick=function(){if(qcReviewIdx>0){qcReviewIdx--;qcRenderReview();}};
  if(next)next.onclick=function(){if(qcReviewIdx<cards.length-1){qcReviewIdx++;qcRenderReview();}};
  // Wire review choices
  el.querySelectorAll('[data-qcrc]').forEach(function(btn){
    btn.onclick=function(){
      qcReviewRevealed[qcReviewIdx]=true;
      qcRenderReview();
    };
  });
  if(copy)copy.onclick=function(){
    var txt=(card.hadith?'"'+card.hadith+'"\n\n':'')+card.q;
    if(navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){copy.textContent='✓ COPIED';setTimeout(function(){copy.innerHTML='&#128203; COPY Q';},1500);});}
    else{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);copy.textContent='✓ COPIED';setTimeout(function(){copy.innerHTML='&#128203; COPY Q';},1500);}
  };
}
function qcRenderStats(){
  var el=document.getElementById('qc-panel-stats');
  if(!el)return;
  qcEnsureState();
  var hist=qcState.history||[];
  var seen=Object.keys(qcState.seen||{}).length;
  var wrong=(qcState.wrong||[]).length;
  var correct=hist.filter(function(h){return h.correct;}).length;
  var total=hist.length;
  var pct=total>0?Math.round(correct/total*100):0;

  var h='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">';
  function st(v,l){return '<div style="text-align:center;padding:8px;border:1px solid rgba(0,229,255,.12);background:rgba(0,229,255,.04)"><div style="font-family:VT323,monospace;font-size:28px;color:var(--cc)">'+v+'</div><div style="font-size:9px;color:var(--dim)">'+l+'</div></div>';}
  h+=st(seen+'/'+QC_CARDS.length,'CARDS SEEN');
  h+=st(pct+'%','ACCURACY');
  h+=st(correct,'CORRECT');
  h+=st(wrong,'TO REVIEW');
  h+='</div>';

  // Category breakdown
  var catStats={};
  hist.forEach(function(h){
    var card=QC_CARDS.find(function(c){return c.id===h.id;});
    if(!card)return;
    var cat=card.cat;
    if(!catStats[cat])catStats[cat]={correct:0,total:0};
    catStats[cat].total++;
    if(h.correct)catStats[cat].correct++;
  });
  var cats=Object.keys(catStats);
  if(cats.length){
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:2px;margin-bottom:8px">BY CATEGORY</div>';
    cats.forEach(function(cat){
      var s=catStats[cat];
      var p=Math.round(s.correct/s.total*100);
      var col=p>=80?'var(--cg)':p>=50?'var(--ca)':'var(--cr)';
      h+='<div class="qc-stat-row"><span>'+cat+'</span><span style="color:'+col+'">'+p+'% ('+s.correct+'/'+s.total+')</span></div>';
    });
  }

  // Wrong cards list
  if(wrong){
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:2px;margin:12px 0 6px">CARDS TO REVIEW ('+wrong+')</div>';
    (qcState.wrong||[]).slice(0,10).forEach(function(id){
      var card=QC_CARDS.find(function(c){return c.id===id;});
      if(!card)return;
      h+='<div style="font-size:11px;color:var(--dim);padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">'+card.q.slice(0,60)+'...</div>';
    });
    if(wrong>10)h+='<div style="font-size:9px;color:var(--dim);opacity:.5">+ '+(wrong-10)+' more</div>';
  }

  // Reset button
  h+='<div style="margin-top:14px;border-top:1px solid rgba(255,255,255,.07);padding-top:12px">';
  h+='<button id="qc-reset-btn" style="font-size:10px;padding:5px 14px;background:transparent;border:1px solid rgba(255,68,68,.3);color:var(--cr);font-family:monospace;cursor:pointer;letter-spacing:1px">RESET ALL PROGRESS</button>';
  h+='</div>';
  el.innerHTML=h;
  var rb=document.getElementById('qc-reset-btn');
  if(rb){
    rb.ontouchend=function(e){e.preventDefault();qcReset();};
    rb.onmouseup=function(){qcReset();};
  }
}

var _qcResetPending=false;
function qcReset(){
  if(!_qcResetPending){
    _qcResetPending=true;
    var btn=document.getElementById('qc-reset-btn');
    if(btn)btn.textContent='SURE? TAP AGAIN';
    setTimeout(function(){_qcResetPending=false;var b=document.getElementById('qc-reset-btn');if(b)b.textContent='RESET ALL PROGRESS';},3000);
    return;
  }
  _qcResetPending=false;
  qcState={};qcSave();qcCurrentCard=null;qcAnswered=false;
  qcTab('study');
}

setTimeout(function(){qcEnsureState();qcRenderStudy();},500);

// ── STARRING for Islamic Topics + Writer's Den ──

var _itCurrentTab='topic';
function itTabSwitch(t){
  _itCurrentTab=t;
  var tbT=document.getElementById('it-tab-topic');
  var tbS=document.getElementById('it-tab-starred');
  if(tbT){tbT.style.color=t==='topic'?'var(--ca)':'var(--dim)';tbT.style.borderColor=t==='topic'?'var(--ca)':'var(--dim)';}
  if(tbS){tbS.style.color=t==='starred'?'var(--ca)':'var(--dim)';tbS.style.borderColor=t==='starred'?'var(--ca)':'var(--dim)';}
  if(t==='starred')itRenderStarred(); else itRender();
}
function itToggleStar(){
  if(!itState)return;
  var num=itState.browseIdx!==undefined?itState.browseIdx:itState.current;
  if(!itState.starred)itState.starred=[];
  var idx=itState.starred.indexOf(num);
  if(idx>=0)itState.starred.splice(idx,1); else itState.starred.push(num);
  itSave();
  // Update star button
  var btn=document.getElementById('it-star-btn');
  if(btn)btn.style.color=idx>=0?'':'var(--ca)';
  if(_itCurrentTab==='starred')itRenderStarred(); else itRender();
}
function itRenderStarred(){
  var el=document.getElementById('it-body');
  if(!el||!itData)return;
  var starred=itState.starred||[];
  if(!starred.length){el.innerHTML='<div style="color:var(--dim);font-size:12px;padding:12px 0">No starred topics yet. Tap ★ on any topic to save it here.</div>';return;}
  var h='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:10px">'+starred.length+' STARRED TOPICS</div>';
  starred.slice().sort(function(a,b){return a-b;}).forEach(function(num){
    var entry=itData[Math.max(0,num-1)];
    if(!entry)return;
    h+='<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07)">';
    h+='<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">';
    h+='<span style="font-size:10px;color:var(--ca);flex-shrink:0">#'+num+'</span>';
    h+='<span style="font-size:12px;color:var(--text);font-weight:bold">'+entry.title+'</span>';
    h+='</div>';
    if(entry.topic)h+='<div style="font-size:9px;color:var(--ca);opacity:.7;margin-bottom:4px">'+entry.topic+'</div>';
    if(entry.question)h+='<div style="font-size:11px;color:var(--dim);line-height:1.5;margin-bottom:4px">'+entry.question+'</div>';
    h+='<span data-itunstar="'+num+'" style="font-size:9px;color:var(--dim);cursor:pointer;opacity:.5">✕ unstar</span>';
    h+='</div>';
  });
  el.innerHTML=h;
  el.querySelectorAll('[data-itunstar]').forEach(function(btn){
    btn.onclick=function(){
      var n=+this.dataset.itunstar;
      if(!itState.starred)itState.starred=[];
      itState.starred=itState.starred.filter(function(x){return x!==n;});
      itSave();itRenderStarred();
    };
  });
}

var _wdCurrentTab='topic';
function wdTabSwitch(t){
  _wdCurrentTab=t;
  var tbT=document.getElementById('wd-tab-topic');
  var tbS=document.getElementById('wd-tab-starred');
  if(tbT){tbT.style.color=t==='topic'?'var(--cc)':'var(--dim)';tbT.style.borderColor=t==='topic'?'var(--cc)':'var(--dim)';}
  if(tbS){tbS.style.color=t==='starred'?'var(--cc)':'var(--dim)';tbS.style.borderColor=t==='starred'?'var(--cc)':'var(--dim)';}
  if(t==='starred')wdRenderStarred(); else wdRender();
}
function wdToggleStar(){
  if(!wdState)return;
  var id=wdState.browseId||wdState.currentId; // correct property names
  if(!id)return;
  if(!wdState.starred)wdState.starred=[];
  var idx=wdState.starred.indexOf(id);
  if(idx>=0)wdState.starred.splice(idx,1); else wdState.starred.push(id);
  wdSave();
  var btn=document.getElementById('wd-star-btn');
  if(btn)btn.style.color=wdState.starred.indexOf(id)>=0?'var(--cc)':'';
  if(_wdCurrentTab==='starred')wdRenderStarred(); else wdRender();
}
function wdRenderStarred(){
  var el=document.getElementById('wd-body');
  if(!el||!wdData)return;
  var starred=wdState.starred||[];
  if(!starred.length){el.innerHTML='<div style="color:var(--dim);font-size:12px;padding:12px 0">No starred entries yet. Tap ★ on any entry to save it here.</div>';return;}
  var h='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:10px">'+starred.length+' STARRED ENTRIES</div>';
  starred.forEach(function(id){
    var entry=wdData[id];
    if(!entry)return;
    h+='<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07)">';
    h+='<div style="font-size:12px;color:var(--text);font-weight:bold;margin-bottom:4px">'+entry.title+'</div>';
    if(entry.prompt||entry.body)h+='<div style="font-size:11px;color:var(--dim);line-height:1.5;margin-bottom:4px">'+(entry.prompt||entry.body||'').slice(0,120)+'...</div>';
    h+='<span data-wdunstar="'+id+'" style="font-size:9px;color:var(--dim);cursor:pointer;opacity:.5">✕ unstar</span>';
    h+='</div>';
  });
  el.innerHTML=h;
  el.querySelectorAll('[data-wdunstar]').forEach(function(btn){
    btn.onclick=function(){
      var id=this.dataset.wdunstar;
      if(!wdState.starred)wdState.starred=[];
      wdState.starred=wdState.starred.filter(function(x){return x!==id;});
      wdSave();wdRenderStarred();
    };
  });
}

// ── GRATITUDE LOG ──
var gratData=JSON.parse(localStorage.getItem('dash_grat')||'[]');
// gratData = [{id,date,items:[str,str,str],ts}]
function gratSave(){localStorage.setItem('dash_grat',JSON.stringify(gratData));}
function gratTodayKey(){
  var n=new Date();
  // Before 6am local time counts as the previous day
  if(n.getHours()<6)n=new Date(n.getTime()-864e5);
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}

function gratTab(t){
  ['log','history'].forEach(function(x){
    var btn=document.getElementById('grat-tab-'+x);
    var panel=document.getElementById('grat-panel-'+x);
    if(btn){btn.style.color=x===t?'var(--cg)':'var(--dim)';btn.style.borderColor=x===t?'var(--cg)':'var(--dim)';}
    if(panel)panel.style.display=x===t?'':'none';
  });
  if(t==='log')gratRenderLog(); else gratRenderHistory();
}

function gratRenderLog(){
  var el=document.getElementById('grat-panel-log');
  var badge=document.getElementById('grat-badge');
  if(!el)return;
  var today=gratTodayKey();
  var todayEntry=gratData.find(function(e){return e.date===today;});
  // Streak
  var streak=0;
  var d=new Date();
  for(var i=0;i<365;i++){
    var dk=new Date(d);dk.setDate(d.getDate()-i);
    var dks=dk.toISOString().slice(0,10);
    if(gratData.find(function(e){return e.date===dks;}))streak++;
    else if(i>0)break;
  }
  if(badge)badge.textContent=streak+'d streak';
  // Streak dots
  var h='<div style="display:flex;gap:3px;margin-bottom:10px">';
  for(var si=6;si>=0;si--){
    var sd=new Date();sd.setDate(sd.getDate()-si);
    var sdk=sd.toISOString().slice(0,10);
    var has=gratData.find(function(e){return e.date===sdk;});
    h+='<div class="grat-streak-dot'+(has?' done':'')+'"></div>';
  }
  h+='</div>';

  if(todayEntry){
    h+='<div style="font-size:10px;color:var(--cg);margin-bottom:8px;letter-spacing:1px">&#10003; Logged today</div>';
    todayEntry.items.forEach(function(item,i){
      h+='<div style="display:flex;gap:8px;padding:4px 0"><span style="color:var(--cg);font-size:12px">'+(i+1)+'.</span><span style="font-size:13px;color:var(--text)">'+item+'</span></div>';
    });
    h+='<button onclick="gratClear()" style="margin-top:10px;font-size:9px;padding:3px 10px;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--dim);font-family:monospace;cursor:pointer">EDIT</button>';
  } else {
    h+='<div style="font-size:10px;color:var(--dim);margin-bottom:8px">What are you grateful for today?</div>';
    [1,2,3].forEach(function(n){
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
      h+='<span style="color:var(--cg);font-size:12px;flex-shrink:0">'+n+'.</span>';
      h+='<input id="grat-inp-'+n+'" autocomplete="off" placeholder="Something good..." style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(0,255,136,.2);color:var(--text);font-family:monospace;font-size:13px;padding:4px 2px;outline:none">';
      h+='</div>';
    });
    h+='<button id="grat-save-btn" style="width:100%;padding:9px;background:rgba(0,255,136,.06);border:1px solid var(--cg);color:var(--cg);font-family:monospace;font-size:12px;cursor:pointer;letter-spacing:1px;margin-top:4px">SAVE &#10003;</button>';
  }
  el.innerHTML=h;
  // Wire
  var saveBtn=document.getElementById('grat-save-btn');
  if(saveBtn){
    saveBtn.onclick=function(){gratSaveEntry();};
    saveBtn.ontouchend=function(e){e.preventDefault();gratSaveEntry();};
  }
  [1,2,3].forEach(function(n){
    var inp=document.getElementById('grat-inp-'+n);
    if(inp)inp.onkeydown=function(e){if(e.keyCode===13){var next=document.getElementById('grat-inp-'+(n+1));if(next)next.focus();else gratSaveEntry();}};
  });
}

function gratSaveEntry(){
  var items=[];
  [1,2,3].forEach(function(n){var el=document.getElementById('grat-inp-'+n);if(el&&el.value.trim())items.push(el.value.trim());});
  if(!items.length)return;
  var today=gratTodayKey();
  gratData=gratData.filter(function(e){return e.date!==today;});
  gratData.unshift({id:Date.now(),date:today,items:items,ts:new Date().toISOString()});
  if(gratData.length>365)gratData=gratData.slice(0,365);
  if(typeof hap==='function')hap(HAP.grat);
  gratSave();
  gratRenderLog();
  confetti(window.innerWidth/2,200,'#00ff88');
}

function gratClear(){
  var today=gratTodayKey();
  gratData=gratData.filter(function(e){return e.date!==today;});
  gratSave();gratRenderLog();
}

var _gratFilter='all'; // 'all','year','month'

function gratRenderHistory(){
  var el=document.getElementById('grat-panel-history');
  if(!el)return;
  if(!gratData.length){el.innerHTML='<div style="color:var(--dim);font-size:12px;padding:10px 0">No entries yet.</div>';return;}

  var now=new Date();
  var thisMonth=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var thisYear=String(now.getFullYear());

  // Filter
  var filtered=gratData.filter(function(e){
    if(_gratFilter==='month')return e.date&&e.date.slice(0,7)===thisMonth;
    if(_gratFilter==='year')return e.date&&e.date.slice(0,4)===thisYear;
    return true;
  });

  // Filter tabs + copy button
  var h='<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:10px">';
  ['all','year','month'].forEach(function(f){
    var lbl=f==='all'?'ALL':f==='year'?thisYear:thisMonth;
    var active=_gratFilter===f;
    h+='<span data-gratfilter="'+f+'" style="font-size:10px;padding:3px 10px;border:1px solid '+(active?'var(--cg)':'rgba(255,255,255,.12)')+';color:'+(active?'var(--cg)':'var(--dim)')+';cursor:pointer">'+lbl+'</span>';
  });
  h+='<button data-gratcopy="1" style="margin-left:auto;font-size:9px;padding:3px 10px;background:transparent;border:1px solid rgba(0,255,136,.2);color:var(--dim);font-family:monospace;cursor:pointer">&#128203; COPY</button>';
  h+='</div>';

  if(!filtered.length){
    h+='<div style="color:var(--dim);font-size:12px">No entries for this period.</div>';
    el.innerHTML=h;
    return;
  }

  h+='<div style="font-size:9px;color:var(--dim);margin-bottom:8px">'+filtered.length+' entries</div>';
  filtered.forEach(function(entry){
    h+='<div class="grat-entry">';
    h+='<div class="grat-date">'+entry.date+'</div>';
    entry.items.forEach(function(item,i){
      h+='<div class="grat-entry-text">'+(i+1)+'. '+item+' <span style="font-size:10px;color:var(--dim);opacity:.5;font-style:italic">(alhumdulillah)</span></div>';
    });
    h+='</div>';
  });
  el.innerHTML=h;

  // Wire filter tabs
  el.querySelectorAll('[data-gratfilter]').forEach(function(btn){
    btn.onclick=function(){_gratFilter=this.dataset.gratfilter;gratRenderHistory();};
  });

  // Wire copy
  var copyBtn=el.querySelector('[data-gratcopy]');
  if(copyBtn){
    copyBtn.onclick=function(){
      var lines=['GRATITUDE LOG - '+(_gratFilter==='all'?'All Time':_gratFilter==='year'?thisYear:thisMonth),''];
      filtered.forEach(function(e){
        lines.push(e.date);
        e.items.forEach(function(item,i){lines.push('  '+(i+1)+'. '+item);});
        lines.push('');
      });
      var txt=lines.join('\n').trim();
      if(navigator.clipboard){
        navigator.clipboard.writeText(txt).then(function(){
          copyBtn.textContent='\u2713 COPIED';
          setTimeout(function(){copyBtn.innerHTML='&#128203; COPY';},1500);
        });
      } else {
        var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
        copyBtn.textContent='\u2713 COPIED';
        setTimeout(function(){copyBtn.innerHTML='&#128203; COPY';},1500);
      }
    };
  }
}

setTimeout(function(){gratRenderLog();},350);

// ── DUA CARD ──
var DUA_LIST=[
  {id:'yunus',title:'Dua of Yunus (as)',
   arabic:'لَّا إِلَـٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
   transliteration:"La ilaha illa anta subhanaka inni kuntu minaz-zalimin",
   translation:"There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.",
   source:'Quran 21:87 — recited by Yunus (as) in the belly of the whale'},
  {id:'anxiety',title:'Dua for Anxiety & Grief',
   arabic:'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
   transliteration:"Allahumma inni a'udhu bika minal-hammi wal-hazan, wal-'ajzi wal-kasal, wal-bukhli wal-jubn, wa dhala'id-dayni wa ghalabatir-rijal",
   translation:"O Allah, I seek refuge in You from worry and grief, from incapacity and laziness, from miserliness and cowardice, and from the burden of debt and the overpowering of men.",
   source:"Sahih al-Bukhari 6369"},
  {id:'hardship',title:'Dua in Times of Distress',
   arabic:'لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',
   transliteration:"La ilaha illallahul-'Azimul-Halim. La ilaha illallahu Rabbul-'Arshil-'Azim. La ilaha illallahu Rabbus-samawati wa Rabbul-ardi wa Rabbul-'Arshil-Karim",
   translation:"There is no deity except Allah, the Magnificent, the Forbearing. There is no deity except Allah, Lord of the Magnificent Throne. There is no deity except Allah, Lord of the heavens, Lord of the earth, and Lord of the Noble Throne.",
   source:"Sahih al-Bukhari 6346"},
  {id:'relief',title:'Dua for Relief from Hardship',
   arabic:'اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَهَ إِلَّا أَنْتَ',
   transliteration:"Allahumma rahmataka arju fala takilni ila nafsi tarfata 'ayn, wa aslih li sha'ni kullahu, la ilaha illa ant",
   translation:"O Allah, I hope for Your mercy. Do not leave me to myself even for the blink of an eye. Rectify all my affairs. There is no deity except You.",
   source:"Abu Dawud 5090 — declared hasan"},
  {id:'trust',title:'Dua of Complete Reliance',
   arabic:'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
   transliteration:"Hasbiyallahu la ilaha illa huwa, 'alayhi tawakkaltu wa huwa Rabbul-'Arshil-'Azim",
   translation:"Allah is sufficient for me. There is no deity except Him. Upon Him I have relied, and He is Lord of the Magnificent Throne.",
   source:"Quran 9:129 — 7x morning and evening"},
  {id:'peace',title:'Dua for Peace of Heart',
   arabic:'اللَّهُمَّ أَلِّفْ بَيْنَ قُلُوبِنَا، وَأَصْلِحْ ذَاتَ بَيْنِنَا، وَاهْدِنَا سُبُلَ السَّلَامِ',
   transliteration:"Allahumma allif bayna qulubina, wa aslih dhata baynina, wahdinaa subulas-salam",
   translation:"O Allah, bring our hearts together, mend our relations, and guide us to paths of peace.",
   source:"Reported in various collections"},
  {id:'morning',title:'Morning Dua (Sabah)',
   arabic:'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
   transliteration:"Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu, wa ilaykan-nushur",
   translation:"O Allah, by You we enter the morning, by You we enter the evening, by You we live, by You we die, and to You is the resurrection.",
   source:"Abu Dawud 5068"},
  {id:'forgiveness',title:'Sayyidul Istighfar (Master of Forgiveness)',
   arabic:'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
   transliteration:"Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mastata'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bini'matika 'alayya, wa abu'u bidhanbi faghfir li fa-innahu la yaghfirudh-dhunuba illa ant",
   translation:"O Allah, You are my Lord. There is no deity except You. You created me and I am Your servant, and I am faithful to my covenant and my promise to You as much as I am able. I seek refuge in You from the evil that I have done. I acknowledge Your favour upon me, and I acknowledge my sin, so forgive me, for none forgives sins except You.",
   source:"Sahih al-Bukhari 6306 — whoever says this believing in it and dies that day enters paradise"},
  {id:'dua_musa',title:'Dua of Musa (as)',
   arabic:'رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
   transliteration:"Rabbi inni lima anzalta ilayya min khayrin faqir",
   translation:"My Lord, indeed I am in need of whatever good You send down to me.",
   source:"Quran 28:24 — the dua of Musa when he had nothing"},
  {id:'completion',title:'Dua at the End of a Gathering',
   arabic:'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ',
   transliteration:"Subhanakallahumma wa bihamdika ashhadu an la ilaha illa anta astaghfiruka wa atubu ilayk",
   translation:"Glory be to You, O Allah, and all praise. I testify that there is no deity except You. I seek Your forgiveness and repent to You.",
   source:"Abu Dawud 4859 — expiation for what occurred in the gathering"},
  // ── Shortness of Life ──
  {id:'short_life_1',title:'Dua for a Blessed Short Life',
   arabic:'اللَّهُمَّ اجْعَلْ خَيْرَ عُمُرِي آخِرَهُ، وَخَيْرَ عَمَلِي خَوَاتِيمَهُ، وَخَيْرَ أَيَّامِي يَوْمَ أَلْقَاكَ',
   transliteration:"Allahumma-j'al khayra 'umuri akhirah, wa khayra 'amali khawatimah, wa khayra ayyami yawma alqak",
   translation:"O Allah, make the best of my life its last part, the best of my deeds their final ones, and the best of my days the day I meet You.",
   source:"Reported by al-Nasa'i — a dua for a life that ends well"},
  {id:'short_life_2',title:'Dua Not to Be Distracted by the Dunya',
   arabic:'اللَّهُمَّ لَا تَجْعَلِ الدُّنْيَا أَكْبَرَ هَمِّنَا، وَلَا مَبْلَغَ عِلْمِنَا',
   transliteration:"Allahumma la taj'alid-dunya akbara hammina, wa la mablagha 'ilmina",
   translation:"O Allah, do not make this world our greatest concern, nor the limit of our knowledge.",
   source:"Tirmidhi 3502 — hasan"},
  {id:'short_life_3',title:'Dua for the Hereafter to Be Our Concern',
   arabic:'اللَّهُمَّ اجْعَلِ الآخِرَةَ خَيْرًا لَنَا مِنَ الدُّنْيَا',
   transliteration:"Allahumma-j'alil-akhirata khayran lana minad-dunya",
   translation:"O Allah, make the hereafter better for us than this world.",
   source:"Collected in du'a compilations — grounded in Quranic teachings on the hereafter"},
  {id:'short_life_4',title:'Dua of the Traveler (We Are All Travelers)',
   arabic:'اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الْأَهْلِ',
   transliteration:"Allahumma antas-sahibu fis-safar, wal-khalifatu fil-ahl",
   translation:"O Allah, You are the companion on the journey and the guardian of those left behind.",
   source:"Muslim 1342 — the Prophet (saw) recited this at the start of every journey"},
  // ── The Hereafter ──
  {id:'akhira_1',title:'Dua for a Good End (Husn al-Khatimah)',
   arabic:'اللَّهُمَّ اخْتِمْ لَنَا بِالْإِسْلَامِ، وَاخْتِمْ لَنَا بِالْإِيمَانِ',
   transliteration:"Allahumma-khtim lana bil-Islam, wakhtim lana bil-iman",
   translation:"O Allah, seal our lives with Islam, and seal our lives with faith.",
   source:"Reported in du'a collections — one of the most important duas a believer can make"},
  {id:'akhira_2',title:'Dua for Paradise and Protection from Hellfire',
   arabic:'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ، وَأَعُوذُ بِكَ مِنَ النَّارِ',
   transliteration:"Allahumma inni as'alukal-jannah, wa a'udhu bika minan-nar",
   translation:"O Allah, I ask You for Paradise and I seek refuge in You from the Fire.",
   source:"Abu Dawud 792 — whoever asks three times for paradise, paradise says: O Allah admit him"},
  {id:'akhira_3',title:'Dua for the Grave to Be Made Spacious',
   arabic:'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، وَمِنْ عَذَابِ جَهَنَّمَ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ، وَمِنْ شَرِّ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ',
   transliteration:"Allahumma inni a'udhu bika min 'adhabil-qabr, wa min 'adhabi jahannam, wa min fitnatil-mahya wal-mamat, wa min sharri fitnatil-masihid-dajjal",
   translation:"O Allah, I seek refuge in You from the punishment of the grave, the punishment of Hell, the trials of life and death, and the evil trial of the False Messiah.",
   source:"Bukhari 1377 — recited in every prayer after tashahud"},
  {id:'akhira_4',title:'Dua for a Good Account on Judgment Day',
   arabic:'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
   transliteration:"Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan waqina 'adhaban-nar",
   translation:"Our Lord, give us good in this world and good in the hereafter, and protect us from the punishment of the Fire.",
   source:"Quran 2:201 — the most comprehensive dua, said to encompass all good"},
  // ── Sadness & Grief ──
  {id:'sadness_1',title:'Dua When Overwhelmed by Sadness',
   arabic:'اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ، أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ سَمَّيْتَ بِهِ نَفْسَكَ، أَوْ أَنْزَلْتَهُ فِي كِتَابِكَ، أَوْ عَلَّمْتَهُ أَحَدًا مِنْ خَلْقِكَ، أَوِ اسْتَأْثَرْتَ بِهِ فِي عِلْمِ الْغَيْبِ عِنْدَكَ، أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي',
   transliteration:"Allahumma inni 'abduka, ibnu 'abdika, ibnu amatika, nasiyati biyadika, madin fiyya hukmuka, 'adlun fiyya qada'uka, as'aluka bikulli-smin huwa laka sammayta bihi nafsaka, aw anzaltahu fi kitabika, aw 'allamtahu ahadan min khalqika, awista'tharta bihi fi 'ilmil-ghaybi 'indaka, an taj'alal-Qurana rabi'a qalbi, wa nura sadri, wa jala'a huzni, wa dhahaba hammi",
   translation:"O Allah, I am Your servant, son of Your servant, son of Your maidservant. My forelock is in Your hand, Your command over me is forever, Your decree over me is just. I ask You by every name You have named Yourself with, or revealed in Your book, or taught to any of Your creation, or kept in the knowledge of the unseen with You — make the Quran the spring of my heart, the light of my chest, the departure of my sadness, and the removal of my anxiety.",
   source:"Ahmad 3712 — the Prophet (saw) said whoever says this, Allah will replace his grief with joy"},
  {id:'sadness_2',title:'Dua of Ayyub (as) in Suffering',
   arabic:'رَبِّ أَنِّي مَسَّنِيَ الضُّرُّ وَأَنتَ أَرْحَمُ الرَّاحِمِينَ',
   transliteration:"Rabbi anni massaniyad-durru wa anta arhamur-rahimin",
   translation:"My Lord, adversity has touched me, and You are the Most Merciful of the merciful.",
   source:"Quran 21:83 — the dua of Ayyub (as) after years of illness and loss, Allah responded"},
  {id:'sadness_3',title:'Dua for a Heavy Heart',
   arabic:'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
   transliteration:"Ya Hayyu ya Qayyum, birahmatika astaghith, aslih li sha'ni kullahu, wa la takilni ila nafsi tarfata 'ayn",
   translation:"O Ever-Living, O Sustainer of all, by Your mercy I call for help. Rectify all my affairs and do not leave me to myself for even the blink of an eye.",
   source:"Al-Hakim 1/545 — authenticated. The Prophet (saw) said this is from the names Allah loves most"},
  {id:'sadness_4',title:'Dua When Feeling Lost',
   arabic:'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي يَفْقَهُوا قَوْلِي',
   transliteration:"Rabbish-rah li sadri wa yassir li amri wahlul 'uqdatan min lisani yafqahu qawli",
   translation:"My Lord, expand my chest for me, ease my task for me, and remove the impediment from my speech, so they may understand my words.",
   source:"Quran 20:25-28 — the dua of Musa (as) when given the mission, before facing Pharaoh"},
  // ── Courage ──
  {id:'courage_1',title:'Dua for Strength and Steadfastness',
   arabic:'رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ',
   transliteration:"Rabbana afrigh 'alayna sabran wa thabbit aqdamana wansurna 'alal-qawmil-kafirin",
   translation:"Our Lord, pour upon us patience and plant our feet firmly and give us victory over the disbelieving people.",
   source:"Quran 2:250 — the dua of the army of Talut before facing Goliath"},
  {id:'courage_2',title:'Dua for Firmness of Heart',
   arabic:'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
   transliteration:"Ya Muqallibal-qulub, thabbit qalbi 'ala dinik",
   translation:"O Turner of hearts, keep my heart firm upon Your religion.",
   source:"Tirmidhi 3522 — the Prophet (saw) recited this frequently"},
  {id:'courage_3',title:'Dua Before Facing Something Difficult',
   arabic:'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
   transliteration:"Allahumma la sahla illa ma ja'altahu sahlan, wa anta taj'alul-hazna idha shi'ta sahla",
   translation:"O Allah, there is no ease except what You make easy, and You make the difficult, if You wish, easy.",
   source:"Ibn Hibban 3/255 — the dua for when something seems impossible"},
  {id:'courage_4',title:'Dua for Protection and Courage',
   arabic:'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْجُبْنِ، وَأَعُوذُ بِكَ مِنَ الْبُخْلِ، وَأَعُوذُ بِكَ مِنْ أَنْ أُرَدَّ إِلَى أَرْذَلِ الْعُمُرِ، وَأَعُوذُ بِكَ مِنْ فِتْنَةِ الدُّنْيَا، وَعَذَابِ الْقَبْرِ',
   transliteration:"Allahumma inni a'udhu bika minal-jubn, wa a'udhu bika minal-bukhl, wa a'udhu bika an uradda ila ardhalil-'umur, wa a'udhu bika min fitnatid-dunya, wa 'adhabul-qabr",
   translation:"O Allah, I seek refuge in You from cowardice, from miserliness, from being returned to a feeble old age, from the trial of this world, and from the punishment of the grave.",
   source:"Bukhari 6374 — the Prophet (saw) recited this as a regular morning protection"},
  // ── Patience / Sabr ──
  {id:'sabr_1',title:'Dua for Patience on a Calamity',
   arabic:'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي وَأَخْلِفْ لِي خَيْرًا مِنْهَا',
   transliteration:"Inna lillahi wa inna ilayhi raji'un. Allahumma-jurni fi musibati wa akhlif li khayran minha",
   translation:"Indeed we belong to Allah, and indeed to Him we shall return. O Allah, reward me in my affliction and replace it for me with something better.",
   source:"Muslim 918 — Umm Salama recited this when her husband died, and Allah gave her the Prophet (saw) in his place"},
  {id:'sabr_2',title:'Dua for Patience When Tested',
   arabic:'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً إِنَّكَ أَنتَ الْوَهَّابُ',
   transliteration:"Rabbana la tuzigh qulubana ba'da idh hadaytana wa hab lana min ladunka rahmatan innaka antal-Wahhab",
   translation:"Our Lord, do not let our hearts deviate after You have guided us, and grant us from Yourself mercy. Indeed, You are the Bestower.",
   source:"Quran 3:8 — the dua of those firm in knowledge, asking to remain guided"},
  {id:'sabr_3',title:'Dua for Sabr and Gratitude',
   arabic:'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَىٰ وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ وَأَصْلِحْ لِي فِي ذُرِّيَّتِي إِنِّي تُبْتُ إِلَيْكَ وَإِنِّي مِنَ الْمُسْلِمِينَ',
   transliteration:"Rabbi awzi'ni an ashkura ni'matakallati an'amta 'alayya wa 'ala walidayya wa an a'mala salihan tardahu wa aslih li fi dhurriyyati inni tubtu ilayka wa inni minal-muslimin",
   translation:"My Lord, enable me to be grateful for Your favor which You have bestowed upon me and upon my parents, and to do righteousness of which You approve. And make righteous for me my offspring. Indeed, I have repented to You, and indeed I am of the Muslims.",
   source:"Quran 46:15 — the dua of one who reaches forty and reflects on their life"},
  {id:'sabr_4',title:'Dua for Steadiness During Hardship',
   arabic:'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
   transliteration:"Hasbunallahu wa ni'mal-wakil",
   translation:"Allah is sufficient for us, and He is the best disposer of affairs.",
   source:"Quran 3:173 — said by Ibrahim (as) when thrown into the fire. Allah made it cool and safe"},
  {id:'sabr_5',title:'Dua for Ease After Prolonged Difficulty',
   arabic:'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا إِنَّ مَعَ الْعُسْرِ يُسْرًا',
   transliteration:"Fa inna ma'al-'usri yusra, inna ma'al-'usri yusra",
   translation:"For indeed, with hardship will be ease. Indeed, with hardship will be ease.",
   source:"Quran 94:5-6 — Allah repeated it twice. The scholars said: one hardship cannot overcome two eases"},
];

var DUA_ARABIC_FONTS=[
  {key:'scheherazade',name:'Scheherazade',css:"'Scheherazade New', serif"},
  {key:'nastaliq',name:'Indopak / Nastaliq',css:"'Noto Nastaliq Urdu', serif"},
  {key:'amiri',name:'Amiri',css:"'Amiri', serif"},
  {key:'naskh',name:'Noto Naskh',css:"'Noto Naskh Arabic', serif"},
  {key:'lateef',name:'Lateef',css:"'Lateef', serif"},
];

var duaState=JSON.parse(localStorage.getItem('dash_dua')||'{}');
// duaState = {font:'scheherazade', recited:{id:date}, currentTab:'daily', dailyIdx:0}
var _duaCurrentTab='daily';

function duaSave(){localStorage.setItem('dash_dua',JSON.stringify(duaState));}
function duaTodayKey(){return new Date().toISOString().slice(0,10);}

function duaTab(t){
  _duaCurrentTab=t;
  ['daily','all'].forEach(function(x){
    var btn=document.getElementById('dua-tab-'+x);
    if(btn){btn.style.color=x===t?'var(--ca)':'var(--dim)';btn.style.borderColor=x===t?'var(--ca)':'var(--dim)';}
  });
  duaRender();
}

function duaGetDailyDua(){
  // Rotate through duas, one per day
  var dayOfYear=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/864e5);
  var idx=dayOfYear%DUA_LIST.length;
  return DUA_LIST[idx];
}

function duaRender(){
  var el=document.getElementById('dua-body');
  var badge=document.getElementById('dua-badge');
  if(!el)return;
  if(!duaState.font)duaState.font='scheherazade';
  var fontCss=DUA_ARABIC_FONTS.find(function(f){return f.key===duaState.font;})||DUA_ARABIC_FONTS[0];
  var recited=duaState.recited||{};
  var today=duaTodayKey();

  if(_duaCurrentTab==='all'){
    // Show all duas as a scrollable list
    if(badge){var _td=Object.values(recited).filter(function(d){return d===today;}).length;badge.textContent=_td?'\u2713 '+_td+' today':Object.keys(recited).length?Object.keys(recited).length+' total':'';}
    var h='';
    // Font picker
    h+=duaFontPicker();
    DUA_LIST.forEach(function(dua){
      var wasRecited=Object.keys(recited).some(function(k){return k===dua.id;});
      var recitedToday=recited[dua.id]===today;
      h+='<div style="padding:12px 0;border-bottom:1px solid rgba(255,204,0,.08)">';
      h+='<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">';
      h+='<div style="font-size:11px;color:var(--ca);font-weight:bold">'+dua.title+'</div>';
      if(recitedToday)h+='<span style="font-size:9px;color:var(--cg)">&#10003; today</span>';
      h+='</div>';
      h+='<div class="dua-arabic" style="font-family:'+fontCss.css+';font-size:'+(fontCss.key==="lateef"?"33":"22")+'px">'+dua.arabic+'</div>';
      h+='<div class="dua-transliteration">'+dua.transliteration+'</div>';
      h+='<div class="dua-translation">'+dua.translation+'</div>';
      h+='<div class="dua-source">'+dua.source+'</div>';
      h+='<button data-duarecite="'+dua.id+'" style="margin-top:8px;padding:5px 14px;background:'+(recitedToday?'rgba(0,255,136,.08)':'transparent')+';border:1px solid '+(recitedToday?'var(--cg)':'rgba(255,204,0,.3)')+';color:'+(recitedToday?'var(--cg)':'var(--ca)')+';font-family:monospace;font-size:10px;cursor:pointer">'+(recitedToday?'&#10003; RECITED TODAY':'MARK AS RECITED')+'</button>';
      h+='</div>';
    });
    el.innerHTML=h;
  } else {
    // Daily dua
    var dua=duaGetDailyDua();
    var recitedToday=recited[dua.id]===today;
    var totalRecited=Object.values(recited).filter(function(d){return d===today;}).length;
    if(badge){badge.textContent=totalRecited?'\u2713 '+totalRecited+' today':'';}
    var h=duaFontPicker();
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:8px">DUA OF THE DAY</div>';
    h+='<div style="font-size:11px;color:var(--ca);font-weight:bold;margin-bottom:10px">'+dua.title+'</div>';
    h+='<div class="dua-arabic" style="font-family:'+fontCss.css+';font-size:'+(fontCss.key==="lateef"?"35":"24")+'px">'+dua.arabic+'</div>';
    h+='<div class="dua-transliteration">'+dua.transliteration+'</div>';
    h+='<div class="dua-translation">'+dua.translation+'</div>';
    h+='<div class="dua-source">'+dua.source+'</div>';
    h+='<button data-duarecite="'+dua.id+'" style="width:100%;margin-top:10px;padding:10px;background:'+(recitedToday?'rgba(0,255,136,.08)':'rgba(255,204,0,.06)')+';border:1px solid '+(recitedToday?'var(--cg)':'var(--ca)')+';color:'+(recitedToday?'var(--cg)':'var(--ca)')+';font-family:monospace;font-size:12px;cursor:pointer;letter-spacing:1px">'+(recitedToday?'&#10003; RECITED TODAY':'&#127768; MARK AS RECITED')+'</button>';
    el.innerHTML=h;
  }
  // Wire recite buttons
  el.querySelectorAll('[data-duarecite]').forEach(function(btn){
    var fn=function(){
      var id=this.dataset.duarecite;
      var _today=duaTodayKey();
      if(!duaState.recited)duaState.recited={};
      if(duaState.recited[id]===_today){
        delete duaState.recited[id];
      } else {
        duaState.recited[id]=_today;
        if(typeof confetti==='function')confetti(window.innerWidth/2,200,'#ffcc00');
        if(typeof hap==='function')hap(HAP.check);
      }
      duaSave();
      duaRender();
    };
    btn.onclick=fn;
    btn.ontouchend=function(e){e.preventDefault();fn.call(this);};
  });
  // Wire font buttons
  el.querySelectorAll('[data-duafont]').forEach(function(btn){
    btn.onclick=function(){duaState.font=this.dataset.duafont;duaSave();duaRender();};
  });
}

function duaFontPicker(){
  var h='<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">';
  DUA_ARABIC_FONTS.forEach(function(f){
    var active=(duaState.font||'scheherazade')===f.key;
    h+='<button data-duafont="'+f.key+'" class="dua-font-btn'+(active?' active':'')+'" style="font-family:'+f.css+'">'+f.name+'</button>';
  });
  h+='</div>';
  return h;
}

setTimeout(function(){duaRender();},400);

// ── FOR AKHIRA ──
var akhiraData=JSON.parse(localStorage.getItem('dash_akhira')||'{}');
// { dhikr:{date,counts:[33,33,0,0],phase:0,custom:0},
//   audit:[{date,q,answer,ts}],
//   intentions:[{date,text,ts}] }
function akhiraSave(){localStorage.setItem('dash_akhira',JSON.stringify(akhiraData));}

var DHIKR_SEQUENCE=[
  {name:'SubhanAllah',arabic:'سُبْحَانَ ٱللَّٰهِ',target:33},
  {name:'Alhamdulillah',arabic:'ٱلْحَمْدُ لِلَّٰهِ',target:33},
  {name:'Allahu Akbar',arabic:'ٱللَّٰهُ أَكْبَرُ',target:33},
  {name:'La ilaha illallah',arabic:'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ',target:100},
];

var AUDIT_QUESTIONS=[
  'What did I do today that will matter in my grave?',
  'Did I remember death today?',
  'What would I regret if today was my last?',
  'Who did I help today without expecting anything back?',
  'Was I honest today — with Allah, and with myself?',
  'What habit am I still carrying that I know displeases Allah?',
  'Did I waste time today on what does not matter?',
  'What am I holding onto that belongs to the dunya, not to me?',
  'If I stood before Allah tonight, what would I wish I had done differently?',
  'Did I make anyone feel seen or valued today?',
];

var _akhiraTab='dhikr';

function _tabSlide3(fromId,toId,toRight){var o=document.getElementById(fromId),n=document.getElementById(toId);if(!o||!n||o===n){if(n)n.style.display='';return;}var exitX=toRight?'-16px':'16px',enterX=toRight?'16px':'-16px';o.style.transition='opacity .2s ease,transform .2s ease';o.style.opacity='0';o.style.transform='translateX('+exitX+')';setTimeout(function(){o.style.display='none';o.style.transition='';o.style.opacity='';o.style.transform='';n.style.display='';n.style.opacity='0';n.style.transform='translateX('+enterX+')';requestAnimationFrame(function(){requestAnimationFrame(function(){n.style.transition='opacity .2s ease,transform .2s ease';n.style.opacity='';n.style.transform='';setTimeout(function(){n.style.transition='';},220);});});},180);}

var _akhiraPrev='dhikr';
var _akhiraOrder=['dhikr','audit','intentions'];
function akhiraTab(t){
  var prev=_akhiraPrev;
  _akhiraTab=t;_akhiraPrev=t;
  ['dhikr','audit','intentions'].forEach(function(x){
    var btn=document.getElementById('akhira-tab-'+x);
    if(btn){btn.classList.toggle('active',x===t);}
  });
  _tabSlide3('akhira-panel-'+prev,'akhira-panel-'+t,_akhiraOrder.indexOf(t)>_akhiraOrder.indexOf(prev));
  if(t==='dhikr')akhiraRenderDhikr();
  else if(t==='audit')akhiraRenderAudit();
  else akhiraRenderIntentions();
}

// ── DHIKR ──
function akhiraDhikrToday(){
  var _cn=new Date();if(_cn.getHours()<4)_cn=new Date(_cn.getTime()-864e5);
  var today=_cn.getFullYear()+'-'+String(_cn.getMonth()+1).padStart(2,'0')+'-'+String(_cn.getDate()).padStart(2,'0');
  if(!akhiraData.dhikr||akhiraData.dhikr.date!==today){
    akhiraData.dhikr={date:today,counts:[0,0,0,0],phase:0};
    akhiraSave();
  }
  return akhiraData.dhikr;
}

function dhikrPop(x, y, color) {
  var count = 1 + Math.floor(Math.random() * 7);
  var c = color || '#ffcc00';
  for (var i = 0; i < count; i++) {
    (function() {
      var el = document.createElement('div');
      var size = 3 + Math.random() * 5;
      var angle = Math.random() * 360;
      var dist = 20 + Math.random() * 60;
      var tx = Math.cos(angle * Math.PI / 180) * dist;
      var ty = Math.sin(angle * Math.PI / 180) * dist - 30 - Math.random() * 30;
      var rot = Math.random() * 360;
      var dur = 400 + Math.random() * 300;
      var delay = Math.random() * 60;
      el.style.cssText = 'position:fixed;z-index:99999;pointer-events:none'
        + ';width:' + size + 'px;height:' + size + 'px'
        + ';background:' + c
        + ';left:' + (x - size/2) + 'px;top:' + (y - size/2) + 'px'
        + ';border-radius:' + (Math.random() > 0.4 ? '50%' : '2px')
        + ';opacity:1'
        + ';transition:transform ' + dur + 'ms ease-out ' + delay + 'ms'
        + ',opacity ' + dur + 'ms ease-in ' + delay + 'ms';
      document.body.appendChild(el);
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        el.style.transform = 'translate(' + tx + 'px,' + ty + 'px) rotate(' + rot + 'deg)';
        el.style.opacity = '0';
      });});
      setTimeout(function(){el.remove();}, dur + delay + 100);
    })();
  }
}
function akhiraRenderDhikr(){
  var el=document.getElementById('akhira-panel-dhikr');
  var badge=document.getElementById('akhira-badge');
  if(!el)return;
  var d=akhiraDhikrToday();
  var phase=d.phase;
  var allDone=phase>=DHIKR_SEQUENCE.length;
  var totalTapped=d.counts.reduce(function(s,c){return s+c;},0);
  if(badge)badge.textContent=totalTapped+' today';

  var h='';
  if(allDone){
    h+='<div style="text-align:center;padding:20px 0">';
    h+='<div style="font-size:36px;margin-bottom:8px">🌙</div>';
    h+='<div style="font-size:13px;color:var(--cg);letter-spacing:1px">Dhikr complete — baarakAllahu feek</div>';
    h+='<div style="font-size:10px;color:var(--dim);margin-top:6px">'+totalTapped+' total remembrances today</div>';
    h+='<button onclick="akhiraDhikrReset()" style="margin-top:14px;font-size:10px;padding:4px 14px;background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--dim);font-family:monospace;cursor:pointer">START AGAIN</button>';
    h+='</div>';
  } else {
    var cur=DHIKR_SEQUENCE[phase];
    var count=d.counts[phase]||0;
    var remaining=cur.target-count;
    h+='<div class="dhikr-name">'+cur.name+'</div>';
    h+='<div style="text-align:center;font-size:18px;color:var(--ca);margin-bottom:6px;direction:rtl">'+cur.arabic+'</div>';
    h+='<div class="dhikr-counter">'+count+'<span style="font-size:28px;color:var(--dim)">/'+cur.target+'</span></div>';
    // Dot progress
    h+='<div class="dhikr-progress">';
    for(var di=0;di<cur.target;di++){
      h+='<div class="dhikr-dot'+(di<count?' done':'')+'"></div>';
    }
    h+='</div>';
    h+='<button class="dhikr-tap" id="dhikr-tap-btn">TAP &bull; '+remaining+' remaining</button>';
    // Phase progress
    h+='<div style="display:flex;gap:4px;justify-content:center;margin-top:10px">';
    DHIKR_SEQUENCE.forEach(function(s,i){
      var isDone=i<phase;
      var isCur=i===phase;
      h+='<div style="font-size:9px;padding:2px 8px;border:1px solid '+(isDone?'var(--cg)':isCur?'var(--ca)':'rgba(255,255,255,.12)')+';color:'+(isDone?'var(--cg)':isCur?'var(--ca)':'var(--dim)')+'">'+s.name.split(' ')[0]+'</div>';
    });
    h+='</div>';
  }
  el.innerHTML=h;
  var tapBtn=document.getElementById('dhikr-tap-btn');
  if(tapBtn){
    function doTap(px,py){
      var d2=akhiraDhikrToday();
      var ph=d2.phase;
      if(ph>=DHIKR_SEQUENCE.length)return;
      d2.counts[ph]=(d2.counts[ph]||0)+1;
      if(typeof hap==='function')hap(HAP.dhikr);
      var col=ph===0?'#ffcc00':ph===1?'#00ff88':ph===2?'#00e5ff':'#ffffff';
      dhikrPop(px||window.innerWidth/2,py||200,col);
      if(d2.counts[ph]>=DHIKR_SEQUENCE[ph].target){
        if(typeof hap==='function')hap(HAP.dhikrDone);
        d2.phase=ph+1;
        if(d2.phase<DHIKR_SEQUENCE.length)confetti(window.innerWidth/2,200,'#ffcc00');
        else confetti(window.innerWidth/2,200,'#00ff88');
      }
      akhiraSave();
      akhiraRenderDhikr();
    }
    var _dhikrTapped=false;
    var _dhikrTY=0,_dhikrTX=0;
    tapBtn.ontouchstart=function(e){_dhikrTX=e.touches[0].clientX;_dhikrTY=e.touches[0].clientY;};
    tapBtn.ontouchend=function(e){
      var dx=Math.abs(e.changedTouches[0].clientX-_dhikrTX);
      var dy=Math.abs(e.changedTouches[0].clientY-_dhikrTY);
      if(dx>10||dy>10)return; // swipe — ignore
      e.preventDefault();
      _dhikrTapped=true;
      var t=e.changedTouches&&e.changedTouches[0];
      doTap(t?t.clientX:window.innerWidth/2,t?t.clientY:200);
      setTimeout(function(){_dhikrTapped=false;},300);
    };
    tapBtn.onmouseup=function(e){if(_dhikrTapped)return;doTap(e.clientX,e.clientY);};
  }
}

function akhiraDhikrReset(){
  var _cn=new Date();if(_cn.getHours()<4)_cn=new Date(_cn.getTime()-864e5);
  var today=_cn.getFullYear()+'-'+String(_cn.getMonth()+1).padStart(2,'0')+'-'+String(_cn.getDate()).padStart(2,'0');
  akhiraData.dhikr={date:today,counts:[0,0,0,0],phase:0};
  akhiraSave();akhiraRenderDhikr();
}

// ── AKHIRA AUDIT ──
function akhiraRenderAudit(){
  var el=document.getElementById('akhira-panel-audit');
  if(!el)return;
  var _cn=new Date();if(_cn.getHours()<4)_cn=new Date(_cn.getTime()-864e5);
  var today=_cn.getFullYear()+'-'+String(_cn.getMonth()+1).padStart(2,'0')+'-'+String(_cn.getDate()).padStart(2,'0');
  var log=akhiraData.audit||[];
  var todayEntry=log.find(function(e){return e.date===today;});
  // Pick today's question — rotate by day of year
  var doy=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/864e5);
  var q=AUDIT_QUESTIONS[doy%AUDIT_QUESTIONS.length];
  var h='';
  if(todayEntry){
    h+='<div style="font-size:10px;color:var(--cg);letter-spacing:1px;margin-bottom:8px">&#10003; Answered today</div>';
    h+='<div class="audit-q">'+todayEntry.q+'</div>';
    h+='<div style="font-size:13px;color:var(--text);line-height:1.6;padding:8px;background:rgba(255,204,0,.04);border-left:2px solid rgba(255,204,0,.2)">'+todayEntry.answer+'</div>';
    h+='<button onclick="akhiraAuditClear()" style="margin-top:8px;font-size:9px;padding:3px 10px;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--dim);font-family:monospace;cursor:pointer">EDIT</button>';
  } else {
    h+='<div class="audit-q">&ldquo;'+q+'&rdquo;</div>';
    h+='<textarea id="audit-inp" placeholder="Be honest. No one sees this but Allah." style="width:100%;min-height:80px;background:rgba(255,204,0,.03);border:1px solid rgba(255,204,0,.15);color:var(--text);font-family:monospace;font-size:12px;padding:8px;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6"></textarea>';
    h+='<button id="audit-save-btn" style="width:100%;margin-top:6px;padding:9px;background:rgba(255,204,0,.06);border:1px solid var(--ca);color:var(--ca);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">SAVE REFLECTION</button>';
  }
  // History
  if(log.length){
    h+='<div style="margin-top:14px;border-top:1px solid rgba(255,255,255,.07);padding-top:10px">';
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:8px">PRIOR REFLECTIONS</div>';
    log.slice(todayEntry?1:0,8).forEach(function(e){
      h+='<div class="audit-entry">';
      h+='<div class="audit-entry-date">'+e.date+' &mdash; &ldquo;'+e.q.slice(0,40)+'...&rdquo;</div>';
      h+='<div style="font-size:12px;color:var(--text);line-height:1.5">'+e.answer+'</div>';
      h+='</div>';
    });
    h+='</div>';
  }
  el.innerHTML=h;
  var saveBtn=document.getElementById('audit-save-btn');
  if(saveBtn){
    saveBtn.onclick=function(){akhiraAuditSave(q);};
    saveBtn.ontouchend=function(ev){ev.preventDefault();akhiraAuditSave(q);};
  }
}

function akhiraAuditSave(q){
  var inp=document.getElementById('audit-inp');
  var txt=inp?inp.value.trim():'';
  if(!txt)return;
  var _cn=new Date();if(_cn.getHours()<4)_cn=new Date(_cn.getTime()-864e5);
  var today=_cn.getFullYear()+'-'+String(_cn.getMonth()+1).padStart(2,'0')+'-'+String(_cn.getDate()).padStart(2,'0');
  if(!akhiraData.audit)akhiraData.audit=[];
  akhiraData.audit=akhiraData.audit.filter(function(e){return e.date!==today;});
  akhiraData.audit.unshift({date:today,q:q,answer:txt,ts:new Date().toISOString()});
  if(akhiraData.audit.length>365)akhiraData.audit=akhiraData.audit.slice(0,365);
  akhiraSave();akhiraRenderAudit();
  confetti(window.innerWidth/2,200,'#ffcc00');
}

function akhiraAuditClear(){
  var _cn=new Date();if(_cn.getHours()<4)_cn=new Date(_cn.getTime()-864e5);
  var today=_cn.getFullYear()+'-'+String(_cn.getMonth()+1).padStart(2,'0')+'-'+String(_cn.getDate()).padStart(2,'0');
  akhiraData.audit=(akhiraData.audit||[]).filter(function(e){return e.date!==today;});
  akhiraSave();akhiraRenderAudit();
}

// ── INTENTIONS / NIGHT LETTER ──
function akhiraRenderIntentions(){
  var el=document.getElementById('akhira-panel-intentions');
  if(!el)return;
  var _cn=new Date();if(_cn.getHours()<4)_cn=new Date(_cn.getTime()-864e5);
  var today=_cn.getFullYear()+'-'+String(_cn.getMonth()+1).padStart(2,'0')+'-'+String(_cn.getDate()).padStart(2,'0');
  var log=akhiraData.intentions||[];
  var todayEntry=log.find(function(e){return e.date===today;});
  var h='';
  h+='<div style="font-size:10px;color:var(--dim);margin-bottom:8px;line-height:1.6">Write your intention for tomorrow. What you seek forgiveness for. What you are grateful for tonight. A private letter — only Allah reads it.</div>';
  if(todayEntry){
    h+='<div style="font-size:10px;color:var(--cg);letter-spacing:1px;margin-bottom:8px">&#10003; Written tonight</div>';
    h+='<div style="font-size:12px;color:var(--text);line-height:1.7;padding:10px;background:rgba(255,204,0,.04);border-left:2px solid rgba(255,204,0,.2);white-space:pre-wrap">'+todayEntry.text+'</div>';
    h+='<button onclick="akhiraIntentClear()" style="margin-top:8px;font-size:9px;padding:3px 10px;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--dim);font-family:monospace;cursor:pointer">EDIT</button>';
  } else {
    h+='<textarea id="intent-inp" placeholder="Bismillah..." style="width:100%;min-height:120px;background:rgba(255,204,0,.03);border:1px solid rgba(255,204,0,.15);color:var(--text);font-family:monospace;font-size:12px;padding:8px;outline:none;resize:vertical;box-sizing:border-box;line-height:1.7"></textarea>';
    h+='<button id="intent-save-btn" style="width:100%;margin-top:6px;padding:9px;background:rgba(255,204,0,.06);border:1px solid var(--ca);color:var(--ca);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">&#9790; SEAL FOR TONIGHT</button>';
  }
  if(log.length){
    h+='<div style="margin-top:14px;border-top:1px solid rgba(255,255,255,.07);padding-top:10px">';
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:8px">PRIOR NIGHTS</div>';
    log.slice(todayEntry?1:0,5).forEach(function(e){
      h+='<div class="audit-entry">';
      h+='<div class="audit-entry-date">'+e.date+'</div>';
      h+='<div style="font-size:11px;color:var(--dim);line-height:1.6">'+e.text.slice(0,120)+(e.text.length>120?'...':'')+'</div>';
      h+='</div>';
    });
    h+='</div>';
  }
  el.innerHTML=h;
  var sb=document.getElementById('intent-save-btn');
  if(sb){
    sb.onclick=function(){akhiraIntentSave();};
    sb.ontouchend=function(ev){ev.preventDefault();akhiraIntentSave();};
  }
}

function akhiraIntentSave(){
  var inp=document.getElementById('intent-inp');
  var txt=inp?inp.value.trim():'';
  if(!txt)return;
  var _cn=new Date();if(_cn.getHours()<4)_cn=new Date(_cn.getTime()-864e5);
  var today=_cn.getFullYear()+'-'+String(_cn.getMonth()+1).padStart(2,'0')+'-'+String(_cn.getDate()).padStart(2,'0');
  if(!akhiraData.intentions)akhiraData.intentions=[];
  akhiraData.intentions=akhiraData.intentions.filter(function(e){return e.date!==today;});
  akhiraData.intentions.unshift({date:today,text:txt,ts:new Date().toISOString()});
  if(akhiraData.intentions.length>365)akhiraData.intentions=akhiraData.intentions.slice(0,365);
  akhiraSave();akhiraRenderIntentions();
  confetti(window.innerWidth/2,200,'#ffcc00');
}

function akhiraIntentClear(){
  var _cn=new Date();if(_cn.getHours()<4)_cn=new Date(_cn.getTime()-864e5);
  var today=_cn.getFullYear()+'-'+String(_cn.getMonth()+1).padStart(2,'0')+'-'+String(_cn.getDate()).padStart(2,'0');
  akhiraData.intentions=(akhiraData.intentions||[]).filter(function(e){return e.date!==today;});
  akhiraSave();akhiraRenderIntentions();
}

setTimeout(function(){akhiraRenderDhikr();},450);

// ── RENT PAYMENTS ──
var rentData=JSON.parse(localStorage.getItem('dash_rent')||'[]');
// [{id, year, month, amount, note, ts}]
function rentSave(){localStorage.setItem('dash_rent',JSON.stringify(rentData));}

var _rentSelYear=new Date().getFullYear();
var _rentSelMonth=new Date().getMonth()+1; // 1-indexed

var RENT_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function rentRender(){
  var el=document.getElementById('rent-body');
  var badge=document.getElementById('rent-badge');
  if(!el)return;

  // Always show previous and current year, plus any years with data
  var curYear=new Date().getFullYear();
  var prevYear=curYear-1;
  var yearsWithData=rentData.reduce(function(acc,r){if(acc.indexOf(r.year)<0)acc.push(r.year);return acc;},[]);
  if(yearsWithData.indexOf(curYear)<0)yearsWithData.push(curYear);
  if(yearsWithData.indexOf(prevYear)<0)yearsWithData.push(prevYear);
  var years=yearsWithData.sort(function(a,b){return a-b;});

  var h='';

  // Year color palette — one per year starting 2025
  var YEAR_COLORS={
    2025:'#ff2d78', // pink
    2026:'#00e5ff', // cyan
    2027:'#39ff14', // green
    2028:'#ffcc00', // gold
    2029:'#bf5fff', // purple
    2030:'#ff6b00', // orange
  };
  function yearCol(y){return YEAR_COLORS[y]||'#aaa';}

  // Season colors for months
  var MONTH_SEASON_COLS=[
    'rgba(100,160,255,.9)',  // Jan - winter blue
    'rgba(120,170,255,.9)',  // Feb - winter blue lighter
    'rgba(120,220,140,.9)',  // Mar - spring green
    'rgba(80,210,120,.9)',   // Apr - spring green bright
    'rgba(120,230,100,.9)',  // May - late spring
    'rgba(255,210,60,.9)',   // Jun - summer gold
    'rgba(255,180,40,.9)',   // Jul - summer amber
    'rgba(255,160,50,.9)',   // Aug - late summer
    'rgba(220,130,60,.9)',   // Sep - early autumn
    'rgba(200,100,40,.9)',   // Oct - autumn orange
    'rgba(160,80,50,.9)',    // Nov - late autumn
    'rgba(80,130,210,.9)',   // Dec - winter blue
  ];

  // Year pills
  h+='<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">';
  years.forEach(function(y){
    var col=yearCol(y);
    var active=y===_rentSelYear;
    // Convert hex to rgba for background tint
    var r16=parseInt(col.slice(1,3),16),g16=parseInt(col.slice(3,5),16),b16=parseInt(col.slice(5,7),16);
    var bgCol=active?'rgba('+r16+','+g16+','+b16+',.15)':'transparent';
    var borderCol=active?col:'rgba(255,255,255,.12)';
    var textCol=active?col:'var(--dim)';
    var fontW=active?'bold':'normal';
    h+='<span data-rentyear="'+y+'" class="rent-pill" style="border-color:'+borderCol+';color:'+textCol+';background:'+bgCol+';font-weight:'+fontW+'">'+y+'</span>';
  });
  h+='</div>';

  // Month pills with season colors
  var selYearCol=yearCol(_rentSelYear);
  h+='<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">';
  RENT_MONTHS.forEach(function(m,i){
    var mn=i+1;
    var paid=rentData.find(function(r){return r.year===_rentSelYear&&r.month===mn;});
    var seasonCol=MONTH_SEASON_COLS[i];
    var active=mn===_rentSelMonth;
    var borderCol=active?seasonCol:paid?'rgba(0,255,136,.5)':'rgba(255,255,255,.1)';
    var textCol=active?seasonCol:paid?'var(--cg)':'var(--dim)';
    var bg=active?seasonCol.replace('.9)','.12)'):'transparent';
    h+='<span data-rentmonth="'+mn+'" class="rent-pill" style="border-color:'+borderCol+';color:'+textCol+';background:'+bg+'">'+m+(paid?' ✓':'')+'</span>';
  });
  h+='</div>';

  // Selected month entry
  var existing=rentData.find(function(r){return r.year===_rentSelYear&&r.month===_rentSelMonth;});
  h+='<div style="font-size:10px;color:var(--dim);letter-spacing:1px;margin-bottom:8px">'+RENT_MONTHS[_rentSelMonth-1]+' '+_rentSelYear+'</div>';
  if(existing){
    h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:rgba(0,255,136,.05);border:1px solid rgba(0,255,136,.2);margin-bottom:8px">';
    h+='<div><div style="font-family:VT323,monospace;font-size:32px;color:var(--cg)">$'+existing.amount.toLocaleString()+'</div>';
    if(existing.note)h+='<div style="font-size:10px;color:var(--dim)">'+existing.note+'</div>';
    h+='</div>';
    h+='<button data-rentdel="'+existing.id+'" style="font-size:10px;padding:4px 10px;background:transparent;border:1px solid rgba(255,68,68,.3);color:var(--cr);font-family:monospace;cursor:pointer">DELETE</button>';
    h+='</div>';
  } else {
    h+='<div style="display:flex;gap:6px;margin-bottom:6px">';
    h+='<span style="color:var(--cp);font-size:16px;align-self:center">$</span>';
    h+='<input id="rent-amt-inp" type="number" min="0" placeholder="Amount paid" style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(255,45,120,.25);color:var(--text);font-family:VT323,monospace;font-size:24px;padding:4px 2px;outline:none">';
    h+='</div>';
    h+='<input id="rent-note-inp" placeholder="Note (optional)..." style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.1);color:var(--text);font-family:monospace;font-size:11px;padding:4px 2px;outline:none;box-sizing:border-box;margin-bottom:8px">';
    h+='<button id="rent-save-btn" style="width:100%;padding:8px;background:rgba(255,45,120,.06);border:1px solid var(--cp);color:var(--cp);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">LOG PAYMENT</button>';
  }

  // Stats
  var allEntries=rentData.filter(function(r){return r.year===_rentSelYear;});
  var yearTotal=allEntries.reduce(function(s,r){return s+r.amount;},0);
  var monthsLogged=allEntries.length;
  var avgMonthly=monthsLogged?Math.round(yearTotal/monthsLogged):0;
  var allTime=rentData.reduce(function(s,r){return s+r.amount;},0);

  if(badge)badge.textContent='$'+yearTotal.toLocaleString()+' in '+_rentSelYear;

  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px">';
  function st(v,l){return '<div class="rent-stat"><div class="rent-stat-val">'+v+'</div><div class="rent-stat-lbl">'+l+'</div></div>';}
  h+=st('$'+yearTotal.toLocaleString(),_rentSelYear+' TOTAL');
  h+=st(monthsLogged+'/12','MONTHS PAID');
  h+=st('$'+avgMonthly.toLocaleString(),'MONTHLY AVG');
  h+=st('$'+allTime.toLocaleString(),'ALL TIME');
  h+='</div>';

  // Year bar chart
  if(rentData.length>1){
    var yearTotals={};
    rentData.forEach(function(r){yearTotals[r.year]=(yearTotals[r.year]||0)+r.amount;});
    var yrKeys=Object.keys(yearTotals).sort();
    var maxYr=Math.max.apply(null,yrKeys.map(function(y){return yearTotals[y];}));
    h+='<div style="margin-top:12px;border-top:1px solid rgba(255,45,120,.1);padding-top:10px">';
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:8px">BY YEAR</div>';
    yrKeys.forEach(function(y){
      var pct=Math.round(yearTotals[y]/maxYr*100);
      var yc=YEAR_COLORS[y]||'#aaa';
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">';
      h+='<span style="font-size:10px;color:'+yc+';min-width:36px">'+y+'</span>';
      h+='<div style="flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:1px"><div style="width:'+pct+'%;height:100%;background:'+yc+';border-radius:1px"></div></div>';
      h+='<span style="font-size:10px;color:'+yc+';min-width:60px;text-align:right">$'+yearTotals[y].toLocaleString()+'</span>';
      h+='</div>';
    });
    h+='</div>';
  }

  // Copy button
  h+='<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.07)">';
  h+='<button id="rent-copy-btn" style="font-size:9px;padding:3px 12px;background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--dim);font-family:monospace;cursor:pointer">&#128203; COPY RENT DATA</button>';
  h+='</div>';

  el.innerHTML=h;

  // Wire copy
  var rentCopyBtn=document.getElementById('rent-copy-btn');
  if(rentCopyBtn){
    rentCopyBtn.onclick=function(){
      var lines=['RENT PAYMENTS','Generated: '+new Date().toLocaleDateString(),''];
      var years=rentData.reduce(function(acc,r){if(acc.indexOf(r.year)<0)acc.push(r.year);return acc;},[]).sort();
      years.forEach(function(y){
        lines.push('--- '+y+' ---');
        var yEntries=rentData.filter(function(r){return r.year===y;}).sort(function(a,b){return a.month-b.month;});
        yEntries.forEach(function(r){
          var mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          lines.push(mNames[r.month-1]+': $'+r.amount+(r.note?' ('+r.note+')':''));
        });
        lines.push('');
      });
      var txt=lines.join('\n').trim();
      if(navigator.clipboard){
        navigator.clipboard.writeText(txt).then(function(){rentCopyBtn.textContent='\u2713 COPIED';setTimeout(function(){rentCopyBtn.innerHTML='&#128203; COPY RENT DATA';},1500);});
      } else {
        var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
        rentCopyBtn.textContent='\u2713 COPIED';setTimeout(function(){rentCopyBtn.innerHTML='&#128203; COPY RENT DATA';},1500);
      }
    };
  }

  // Wire year/month pills
  el.querySelectorAll('[data-rentyear]').forEach(function(btn){
    btn.onclick=function(){_rentSelYear=+this.dataset.rentyear;rentRender();};
  });
  el.querySelectorAll('[data-rentmonth]').forEach(function(btn){
    btn.onclick=function(){_rentSelMonth=+this.dataset.rentmonth;rentRender();};
  });

  // Wire save
  var saveBtn=document.getElementById('rent-save-btn');
  var amtInp=document.getElementById('rent-amt-inp');
  var noteInp=document.getElementById('rent-note-inp');
  if(saveBtn&&amtInp){
    function doSave(){
      var amt=parseFloat(amtInp.value);
      if(!amt||amt<=0)return;
      var note=noteInp?noteInp.value.trim():'';
      rentData.push({id:Date.now(),year:_rentSelYear,month:_rentSelMonth,amount:amt,note:note,ts:new Date().toISOString()});
      rentSave();rentRender();
      confetti(window.innerWidth/2,200,'#ff2d78');
    }
    saveBtn.onclick=doSave;
    saveBtn.ontouchend=function(e){e.preventDefault();doSave();};
    amtInp.onkeydown=function(e){if(e.keyCode===13)doSave();};
  }

  // Wire delete
  el.querySelectorAll('[data-rentdel]').forEach(function(btn){
    btn.onclick=function(){
      var id=+this.dataset.rentdel;
      rentData=rentData.filter(function(r){return r.id!==id;});
      rentSave();rentRender();
    };
  });
}

setTimeout(function(){rentRender();},500);

function bookUploadCover(bookId,input){
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
      var levels=6;
      var clamp=function(v){return Math.max(0,Math.min(255,v));};
      var quantize=function(v){return Math.round(v/255*(levels-1))*(255/(levels-1));};
      for(var py=0;py<H;py++){
        for(var px=0;px<W;px++){
          var pi=(py*W+px)*4;
          var oldR=data[pi],oldG=data[pi+1],oldB=data[pi+2];
          var newR=quantize(oldR),newG=quantize(oldG),newB=quantize(oldB);
          data[pi]=newR;data[pi+1]=newG;data[pi+2]=newB;
          var eR=oldR-newR,eG=oldG-newG,eB=oldB-newB;
          // Distribute Floyd-Steinberg error inline (no function-in-loop)
          var ni;
          if(px+1<W){ni=(py*W+(px+1))*4;data[ni]=clamp(data[ni]+eR*7/16);data[ni+1]=clamp(data[ni+1]+eG*7/16);data[ni+2]=clamp(data[ni+2]+eB*7/16);}
          if(px-1>=0&&py+1<H){ni=((py+1)*W+(px-1))*4;data[ni]=clamp(data[ni]+eR*3/16);data[ni+1]=clamp(data[ni+1]+eG*3/16);data[ni+2]=clamp(data[ni+2]+eB*3/16);}
          if(py+1<H){ni=((py+1)*W+px)*4;data[ni]=clamp(data[ni]+eR*5/16);data[ni+1]=clamp(data[ni+1]+eG*5/16);data[ni+2]=clamp(data[ni+2]+eB*5/16);}
          if(px+1<W&&py+1<H){ni=((py+1)*W+(px+1))*4;data[ni]=clamp(data[ni]+eR*1/16);data[ni+1]=clamp(data[ni+1]+eG*1/16);data[ni+2]=clamp(data[ni+2]+eB*1/16);}
        }
      }
      ctx.putImageData(imgData,0,0);
      var compressed=offscreen.toDataURL('image/jpeg',0.55);
      var bk=books.find(function(b){return b.id===bookId;});
      if(bk){bk.cover=compressed;saveBooks();}
      renderBooks();
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

function bookRemoveCover(bookId){
  var bk=books.find(function(b){return b.id===bookId;});
  if(bk){delete bk.cover;saveBooks();}
  renderBooks();
}

function bookDrawCover(canvas,dataUrl){
  var img=new Image();
  img.onload=function(){
    var W=70,H=Math.round(img.height*(W/img.width));
    canvas.width=W;canvas.height=H;
    var ctx=canvas.getContext('2d');
    ctx.drawImage(img,0,0,W,H);
  };
  img.src=dataUrl;
}

// ── STARFIELD ──
window.applyStarfield = (function(){
  var canvas=null,ctx=null,stars=[],raf=null,running=false;
  var N=120;
  function init(){
    if(!canvas){
      canvas=document.createElement('canvas');
      canvas.id='starfield-canvas';
      canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.55';
      document.body.insertBefore(canvas,document.body.firstChild);
    }
    resize();
    stars=[];
    for(var i=0;i<N;i++)stars.push({
      x:Math.random()*canvas.width,
      y:Math.random()*canvas.height,
      r:Math.random()*1.4+0.3,
      speed:Math.random()*0.15+0.05,
      opacity:Math.random()*0.6+0.2
    });
  }
  function resize(){if(canvas){canvas.width=window.innerWidth;canvas.height=window.innerHeight;}}
  function draw(){
    if(!running)return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    stars.forEach(function(s){
      ctx.beginPath();
      ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,'+s.opacity+')';
      ctx.fill();
      s.y+=s.speed;
      s.x+=s.speed*0.2;
      if(s.y>canvas.height){s.y=0;s.x=Math.random()*canvas.width;}
      if(s.x>canvas.width)s.x=0;
    });
    raf=requestAnimationFrame(draw);
  }
  return function(on){
    if(on){
      running=true;
      if(!canvas||!ctx){init();ctx=canvas.getContext('2d');}
      if(!raf)draw();
      if(canvas)canvas.style.display='block';
    } else {
      running=false;
      if(raf){cancelAnimationFrame(raf);raf=null;}
      if(canvas)canvas.style.display='none';
    }
  };
})();

// ── SCROLL TRAIL ──
window.applyScrollTrail = (function(){
  var handler=null;
  var ticking=false;
  return function(on){
    if(handler){window.removeEventListener('scroll',handler);handler=null;}
    if(!on)return;
    handler=function(){
      if(ticking)return;
      ticking=true;
      requestAnimationFrame(function(){
        ticking=false;
        var vh=window.innerHeight;
        document.querySelectorAll('#grid [data-id]').forEach(function(tile){
          var rect=tile.getBoundingClientRect();
          // Flash tile if its top edge just entered or just left viewport
          if(rect.top>-20&&rect.top<vh*0.25){
            if(!tile._trailDone){
              tile._trailDone=true;
              tile.classList.remove('scroll-trail-flash');
              void tile.offsetWidth; // force reflow
              tile.classList.add('scroll-trail-flash');
              setTimeout(function(){tile.classList.remove('scroll-trail-flash');tile._trailDone=false;},600);
            }
          } else {
            tile._trailDone=false;
          }
        });
      });
    };
    window.addEventListener('scroll',handler,{passive:true});
  };
})();

// ── CARD ENTRANCE ──
window.applyCardEntrance = (function(){
  var observer=null;
  var seenIds={};
  return function(on){
    if(observer){observer.disconnect();observer=null;}
    // Remove hidden class from all tiles when turning off
    if(!on){
      document.querySelectorAll('.tile.entrance-hidden,.tile.entrance-reveal').forEach(function(t){
        t.classList.remove('entrance-hidden','entrance-reveal');
      });
      return;
    }
    // Add hidden class to all tiles not yet seen
    document.querySelectorAll('#grid [data-id]').forEach(function(tile){
      var id=tile.dataset.id;
      if(!seenIds[id]){
        tile.classList.add('entrance-hidden');
      }
    });
    observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          var tile=entry.target;
          var id=tile.dataset.id;
          if(!seenIds[id]){
            seenIds[id]=true;
            tile.classList.remove('entrance-hidden');
            tile.classList.add('entrance-reveal');
            observer.unobserve(tile);
          }
        }
      });
    },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
    document.querySelectorAll('#grid [data-id]').forEach(function(tile){
      if(!seenIds[tile.dataset.id])observer.observe(tile);
    });
  };
})();

// Init effects on load
setTimeout(function(){
  if(typeof getSetting==='function'){
    if(getSetting('starfield')&&window.applyStarfield)window.applyStarfield(true);
    if(getSetting('scrollTrail')&&window.applyScrollTrail)window.applyScrollTrail(true);
    if(getSetting('cardEntrance')&&window.applyCardEntrance)window.applyCardEntrance(true);
  }
},600);

// ── COUNTDOWN / IN X DAYS ──
window.cdData=null;
var cdData = window.cdData = (function(){
  try{var d=JSON.parse(localStorage.getItem('dash_cd')||'{}');
    return{items:Array.isArray(d.items)?d.items:[],log:Array.isArray(d.log)?d.log:[]};}
  catch(e){return{items:[],log:[]};}
})();
// Re-render calendar after cdData loads so In X Days events appear
setTimeout(function(){if(typeof renderCal==='function')renderCal();},200);

function cdSave(){localStorage.setItem('dash_cd',JSON.stringify(cdData));window.cdData=cdData;if(typeof renderCal==='function')renderCal();}

function cdDaysLeft(item){
  // item.type: 'date' (specific date) or 'days' (days from creation)
  if(item.type==='date'){
    var now=new Date(); now.setHours(0,0,0,0);
    var target=new Date(item.targetDate+'T00:00:00');
    return Math.round((target-now)/864e5);
  } else {
    var created=new Date(item.created);
    var target2=new Date(created.getTime()+item.days*864e5);
    var now2=new Date(); now2.setHours(0,0,0,0);
    return Math.round((target2-now2)/864e5);
  }
}

function cdDayColor(days){
  if(days<0)return'var(--cr)';
  if(days===0)return'#ff9900';
  if(days<=3)return'#ff6b00';
  if(days<=7)return'var(--ca)';
  if(days<=30)return'var(--cc)';
  return'var(--cg)';
}

var _cdDelPending={};
var _cdEditId=null;

function cdRender(){
  var el=document.getElementById('cd-body');
  var badge=document.getElementById('cd-badge');
  if(!el)return;

  // Sort: overdue first, then by days ascending
  var items=cdData.items.slice().sort(function(a,b){return cdDaysLeft(a)-cdDaysLeft(b);});
  var overdue=items.filter(function(it){return cdDaysLeft(it)<0;});
  if(badge)badge.textContent=items.length+(overdue.length?' · '+overdue.length+' overdue':'');

  var h='';

  // Overdue notice — jiggle if worst item is >5 days overdue
  if(overdue.length){
    var worstDays=Math.abs(Math.min.apply(null,overdue.map(function(it){return cdDaysLeft(it);})));
    h+='<div class="inactivity-notice'+(worstDays>5?' jiggle':'')+'" style="margin-bottom:8px"><span style="color:var(--cr)">&#9650; '+overdue.length+' item'+(overdue.length!==1?'s':'')+' overdue — up to '+worstDays+' day'+(worstDays!==1?'s':'')+' past</span></div>';
  }

  // Add form
  if(_cdEditId){
    var editing=cdData.items.find(function(it){return it.id===_cdEditId;});
    if(editing){
      h+='<div style="padding:10px;background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.15);margin-bottom:10px">';
      h+='<div style="font-size:9px;color:var(--cc);letter-spacing:1px;margin-bottom:8px">EDIT ENTRY</div>';
      h+='<input id="cd-edit-label" placeholder="Label..." value="'+editing.label.replace(/"/g,'&quot;')+'" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(0,229,255,.25);color:var(--text);font-family:monospace;font-size:13px;padding:4px 2px;outline:none;margin-bottom:8px;box-sizing:border-box">';
      h+='<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">';
      h+='<span style="font-size:10px;color:var(--dim)">In</span>';
      h+='<input id="cd-edit-days" type="number" min="1" value="'+(editing.type==='days'?editing.days:'')+'" placeholder="days" style="width:70px;background:transparent;border:none;border-bottom:1px solid rgba(0,229,255,.25);color:var(--cc);font-family:VT323,monospace;font-size:22px;padding:2px;outline:none">';
      h+='<span style="font-size:10px;color:var(--dim)">days &nbsp;or&nbsp;</span>';
      h+='<input id="cd-edit-date" type="date" value="'+(editing.type==='date'?editing.targetDate:'')+'" style="background:transparent;border:none;border-bottom:1px solid rgba(0,229,255,.25);color:var(--cc);font-family:monospace;font-size:11px;padding:2px;outline:none">';
      h+='</div>';
      h+='<div style="display:flex;gap:6px">';
      h+='<button id="cd-edit-save" style="flex:1;padding:7px;background:rgba(0,229,255,.06);border:1px solid var(--cc);color:var(--cc);font-family:monospace;font-size:11px;cursor:pointer">SAVE</button>';
      h+='<button id="cd-edit-cancel" style="padding:7px 12px;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--dim);font-family:monospace;font-size:11px;cursor:pointer">CANCEL</button>';
      h+='</div></div>';
    }
  } else {
    h+='<div style="margin-bottom:10px">';
    h+='<input id="cd-new-label" placeholder="What are you counting down to?" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(0,229,255,.2);color:var(--text);font-family:monospace;font-size:12px;padding:5px 2px;outline:none;margin-bottom:8px;box-sizing:border-box">';
    h+='<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">';
    h+='<span style="font-size:10px;color:var(--dim)">In</span>';
    h+='<input id="cd-new-days" type="number" min="1" placeholder="days" style="width:70px;background:transparent;border:none;border-bottom:1px solid rgba(0,229,255,.25);color:var(--cc);font-family:VT323,monospace;font-size:22px;padding:2px;outline:none">';
    h+='<span style="font-size:10px;color:var(--dim)">days &nbsp;or&nbsp;</span>';
    h+='<input id="cd-new-date" type="date" style="background:transparent;border:none;border-bottom:1px solid rgba(0,229,255,.25);color:var(--cc);font-family:monospace;font-size:11px;padding:2px;outline:none">';
    h+='</div>';
    h+='<button id="cd-add-btn" style="width:100%;padding:8px;background:rgba(0,229,255,.05);border:1px solid var(--cc);color:var(--cc);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">+ ADD COUNTDOWN</button>';
    h+='</div>';
  }

  // Items
  if(items.length){
    items.forEach(function(it){
      var days=cdDaysLeft(it);
      var col=cdDayColor(days);
      var daysTxt=days<0?Math.abs(days)+' days ago':days===0?'TODAY':days+' days';
      var pending=_cdDelPending[it.id];
      h+='<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)">';
      // Days pill
      h+='<div style="flex-shrink:0;min-width:60px;text-align:center;padding:4px 6px;border:1px solid '+col+'44;background:'+col+'11">';
      h+='<div style="font-family:VT323,monospace;font-size:24px;color:'+col+';line-height:1">'+daysTxt+'</div>';
      h+='</div>';
      // Label
      h+='<div style="flex:1;font-size:12px;color:var(--text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+it.label+'</div>';
      // Buttons
      h+='<div style="display:flex;gap:4px;flex-shrink:0">';
      h+='<span data-cdmark="'+it.id+'" style="font-size:11px;padding:3px 7px;border:1px solid rgba(0,255,136,.3);color:var(--cg);cursor:pointer" title="Mark done">✓</span>';
      h+='<span data-cdedit="'+it.id+'" style="font-size:11px;padding:3px 7px;border:1px solid rgba(255,255,255,.15);color:var(--dim);cursor:pointer">✎</span>';
      h+='<span data-cddel="'+it.id+'" style="font-size:11px;padding:3px 7px;border:1px solid rgba(255,68,68,.3);color:'+(pending?'var(--cr)':'var(--dim)')+';cursor:pointer">'+(pending?'SURE?':'✕')+'</span>';
      h+='</div></div>';
    });
  }

  // Log
  if(cdData.log&&cdData.log.length){
    h+='<div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">';
    h+='<div style="display:flex;align-items:center;margin-bottom:6px">';
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px">COMPLETED (last '+cdData.log.length+')</div>';
    h+='<button id="cd-copy-btn" style="margin-left:auto;font-size:9px;padding:2px 8px;background:transparent;border:1px solid rgba(0,229,255,.2);color:var(--dim);font-family:monospace;cursor:pointer">&#128203; COPY</button>';
    h+='</div>';
    cdData.log.forEach(function(entry){
      h+='<div style="font-size:10px;color:var(--dim);padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);display:flex;justify-content:space-between">';
      h+='<span>'+entry.label+'</span>';
      h+='<span style="opacity:.5">'+entry.completedOn+'</span>';
      h+='</div>';
    });
    h+='</div>';
  }

  el.innerHTML=h;

  // Wire copy log
  var cdCopyBtn=document.getElementById('cd-copy-btn');
  if(cdCopyBtn){cdCopyBtn.onclick=function(){
    var log=cdData.log||[];
    var txt=log.map(function(e){return e.completedOn+' — '+e.label;}).join('\n');
    if(navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){cdCopyBtn.textContent='\u2713 COPIED';setTimeout(function(){cdCopyBtn.innerHTML='&#128203; COPY';},1500);});}
    else{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);cdCopyBtn.textContent='\u2713 COPIED';setTimeout(function(){cdCopyBtn.innerHTML='&#128203; COPY';},1500);}
  };}

  // Wire add
  var addBtn=document.getElementById('cd-add-btn');
  if(addBtn) addBtn.onclick=cdAdd;

  var newLabel=document.getElementById('cd-new-label');
  if(newLabel) newLabel.onkeydown=function(e){if(e.keyCode===13)cdAdd();};

  // Wire edit save/cancel
  var saveBtn=document.getElementById('cd-edit-save');
  if(saveBtn) saveBtn.onclick=cdEditSave;
  var cancelBtn=document.getElementById('cd-edit-cancel');
  if(cancelBtn) cancelBtn.onclick=function(){_cdEditId=null;cdRender();};

  // Wire mark/edit/delete
  el.querySelectorAll('[data-cdmark]').forEach(function(btn){
    btn.onclick=function(){cdMarkDone(this.dataset.cdmark);};
  });
  el.querySelectorAll('[data-cdedit]').forEach(function(btn){
    btn.onclick=function(){_cdEditId=this.dataset.cdedit;_cdDelPending={};cdRender();};
  });
  el.querySelectorAll('[data-cddel]').forEach(function(btn){
    btn.onclick=function(){
      var id=this.dataset.cddel;
      if(_cdDelPending[id]){
        cdData.items=cdData.items.filter(function(it){return it.id!==id;});
        cdSave(); _cdDelPending={}; cdRender();
      } else {
        _cdDelPending={};
        _cdDelPending[id]=true;
        var self=this;
        self.textContent='SURE?'; self.style.color='var(--cr)';
        setTimeout(function(){_cdDelPending={};if(self.parentNode)self.textContent='✕';self.style.color='var(--dim)';},2500);
      }
    };
  });
}

function cdAdd(){
  var labelEl=document.getElementById('cd-new-label');
  var daysEl=document.getElementById('cd-new-days');
  var dateEl=document.getElementById('cd-new-date');
  var label=(labelEl?labelEl.value.trim():'');
  if(!label)return;
  var days=daysEl?parseInt(daysEl.value):NaN;
  var date=dateEl?dateEl.value:'';
  if(!date&&isNaN(days))return;
  // Normalize created to midnight so 'in X days' counts whole days from today
  var _cdToday=new Date();_cdToday.setHours(0,0,0,0);
  var item={id:String(Date.now()),label:label,created:_cdToday.toISOString()};
  if(date){item.type='date';item.targetDate=date;}
  else{item.type='days';item.days=days;}
  cdData.items.push(item);
  cdSave();
  if(labelEl)labelEl.value='';
  if(daysEl)daysEl.value='';
  if(dateEl)dateEl.value='';
  cdRender();
  confetti(window.innerWidth/2,200,'#00e5ff');
}

function cdEditSave(){
  var it=cdData.items.find(function(x){return x.id===_cdEditId;});
  if(!it)return;
  var labelEl=document.getElementById('cd-edit-label');
  var daysEl=document.getElementById('cd-edit-days');
  var dateEl=document.getElementById('cd-edit-date');
  var label=labelEl?labelEl.value.trim():'';
  if(!label)return;
  var days=daysEl?parseInt(daysEl.value):NaN;
  var date=dateEl?dateEl.value:'';
  it.label=label;
  if(date){it.type='date';it.targetDate=date;delete it.days;}
  else if(!isNaN(days)){it.type='days';it.days=days;it.created=new Date().toISOString();delete it.targetDate;}
  _cdEditId=null;
  cdSave();cdRender();
}

function cdMarkDone(id){
  var it=cdData.items.find(function(x){return x.id===id;});
  if(!it)return;
  if(!cdData.log)cdData.log=[];
  cdData.log.unshift({label:it.label,completedOn:new Date().toISOString().slice(0,10)});
  if(cdData.log.length>33)cdData.log=cdData.log.slice(0,33);
  cdData.items=cdData.items.filter(function(x){return x.id!==id;});
  cdSave();cdRender();
  confetti(window.innerWidth/2,200,'#00ff88');
}

setTimeout(function(){cdRender();},450);

// Contains: Pinboard mode
// Requires dashboard-1.js and dashboard-2.js to be loaded first

// ── PINBOARD MODE ──
var pb = {
  active: false,
  panX: -100, panY: -60,
  zoom: 0.75,
  MIN_ZOOM: 0.15, MAX_ZOOM: 2,
  BOARD_W:2286,BOARD_H:3390,
  dragging: null,
  dragOffX: 0, dragOffY: 0,
  isPanning: false,
  panStartX: 0, panStartY: 0,
  panStartBX: 0, panStartBY: 0,
  pinchDist0: null, pinchZoom0: 1,
  positions: {},  // always start fresh from defaults
  sizes: JSON.parse(localStorage.getItem('dash_pb_sizes')||'{}'),
  longPressTimer: null,
};

var PB_ZONES = [
  {key:'home',label:'HOME',x:40,y:40,w:702,h:1136,color:'rgba(57,255,20,.05)',border:'rgba(57,255,20,.25)'},
  {key:'islamic',label:'ISLAMIC',x:40,y:1964,w:702,h:1172,color:'rgba(255,204,0,.05)',border:'rgba(255,204,0,.25)'},
  {key:'life',label:'LIFE',x:782,y:40,w:702,h:1884,color:'rgba(0,229,255,.04)',border:'rgba(0,229,255,.2)'},
  {key:'tools',label:'TOOLS',x:782,y:1964,w:702,h:1366,color:'rgba(255,45,120,.04)',border:'rgba(255,45,120,.2)'},
  {key:'reading',label:'READING',x:1524,y:40,w:702,h:584,color:'rgba(155,111,255,.05)',border:'rgba(155,111,255,.25)'},
];

var PB_SNAP = {
  home: {x:40,y:40,w:702,h:1136},
  islamic: {x:40,y:1964,w:702,h:1172},
  life: {x:782,y:40,w:702,h:1884},
  tools: {x:782,y:1964,w:702,h:1366},
  reading: {x:1524,y:40,w:702,h:584},
  fit: null,
};

var PB_DEFAULT_POS = {
  'quick-nav': {x:64,y:92},
  'clock': {x:398,y:92},
  'prayer': {x:64,y:256},
  'weather': {x:398,y:256},
  'todo': {x:64,y:440},
  'schedule': {x:398,y:440},
  'stocks': {x:64,y:704},
  'notes': {x:1548,y:376},
  's-tracker': {x:64,y:908},
  'prayer-tracker': {x:64,y:2016},
  'quran-tracker': {x:398,y:2016},
  'quran-cards': {x:64,y:2320},
  'juz-amma': {x:398,y:2320},
  'islamic-topics': {x:64,y:2604},
  'dua-card': {x:398,y:2604},
  'for-akhira': {x:64,y:2868},
  'goals': {x:806,y:92},
  'mood-log': {x:1140,y:92},
  'gratitude-log': {x:806,y:416},
  'life-streaks': {x:1140,y:416},
  'weekly-moments': {x:806,y:640},
  'weekly-review': {x:1140,y:640},
  'pomodoro': {x:806,y:904},
  'energy-map': {x:1140,y:904},
  'milestone': {x:806,y:1188},
  'day-blocks': {x:1140,y:1188},
  'workout-log': {x:806,y:1412},
  'rent-payments': {x:1140,y:1412},
  'decision-log': {x:806,y:1676},
  'meals': {x:806,y:2016},
  'calendar': {x:1140,y:2016},
  'birthdays': {x:806,y:2300},
  'season-traditions': {x:1140,y:2300},
  'raft': {x:806,y:2504},
  'bookmarks': {x:1882,y:376},
  'pickleball': {x:806,y:2728},
  'weekend-warrior': {x:1140,y:2728},
  'meal-prep': {x:806,y:2932},
  'settings': {x:1140,y:2932},
  'books': {x:1548,y:92},
  'ebook-library': {x:1882,y:92},
};

var PB_ZONE_CARDS = {
  'home': ['quick-nav','clock','prayer','weather','todo','schedule','stocks','notes','s-tracker'],
  'islamic': ['prayer-tracker','quran-tracker','quran-cards','juz-amma','islamic-topics','dua-card','for-akhira'],
  'life': ['goals','mood-log','gratitude-log','life-streaks','weekly-moments','weekly-review','pomodoro','energy-map','milestone','day-blocks','workout-log','rent-payments','decision-log'],
  'tools': ['meals','calendar','birthdays','season-traditions','raft','bookmarks','pickleball','weekend-warrior','meal-prep','settings'],
  'reading': ['books','ebook-library','notes','bookmarks'],
};

function pbGetCardData(el) {
  var id = el.dataset.id;
  // Get label
  var lbl = el.querySelector('.th-label');
  var icon = el.querySelector('.th-icon');
  var emoji = el.querySelector('.icon-emoji');
  var badge = el.querySelector('[class*="badge"]');
  return {
    id: id,
    label: lbl ? lbl.textContent.trim() : id,
    icon: emoji ? emoji.textContent : (icon ? icon.textContent : '▪'),
    color: lbl ? getComputedStyle(lbl).color : '#fff',
    badgeText: badge ? badge.textContent.trim() : '',
  };
}

function pinboardToggle() {
  pb.active = !pb.active;
  var overlay = document.getElementById('pinboard-overlay');
  var btn = document.getElementById('pinboard-btn');
  if (pb.active) {
    overlay.style.display = 'block';
    if (btn) { btn.style.borderColor='var(--cc)'; btn.style.color='var(--cc)'; btn.style.background='rgba(0,229,255,.08)'; }
    pbBuild();
    pbApplyTransform();
  } else {
    pbTeardown();
    overlay.style.display = 'none';
    if (btn) { btn.style.borderColor='rgba(0,229,255,.25)'; btn.style.color='var(--cc)'; btn.style.background='transparent'; }
  }
}

function pbBuild() {
  var board = document.getElementById('pb-board');
  board.innerHTML = '';
  var grid = document.getElementById('grid');

  // Zone overlays — created first, updated dynamically
  PB_ZONES.forEach(function(z) {
    var el = document.createElement('div');
    el.className = 'pb-zone';
    el.id = 'pb-zone-'+z.key;
    el.style.cssText = 'left:'+z.x+'px;top:'+z.y+'px;width:'+z.w+'px;height:'+z.h+'px;background:'+z.color+';border-color:'+z.border+';transition:all .4s cubic-bezier(.22,1,.36,1)';
    var lbl = document.createElement('div');
    lbl.className = 'pb-zone-lbl';
    lbl.style.color = z.border;
    lbl.textContent = z.label;
    el.appendChild(lbl);
    board.appendChild(el);
  });

  // Move real tiles onto the pinboard
  var tiles = Array.from(grid.querySelectorAll('[data-id]'));
  var pinIdx = 0;
  tiles.forEach(function(tile) {
    if (tile.classList.contains('tile-hidden')) return;
    var id = tile.dataset.id;
    var pos = Object.keys(pb.positions).length>0 && pb.positions[id] ? pb.positions[id] : (PB_DEFAULT_POS[id] || {x:100+(pinIdx%7)*220,y:80+Math.floor(pinIdx/7)*320});

    // Save original position in grid
    tile._pbOrigParent = grid;
    tile._pbOrigNextSibling = tile.nextSibling;

    // Wrap in a dragger div
    var wrapper = document.createElement('div');
    wrapper.className = 'pb-card';
    wrapper.dataset.tileid = id;
    var savedW=pb.sizes[id]?pb.sizes[id].w:320; var savedH = pb.sizes[id] ? pb.sizes[id].h : null;
    // Get real border color from tile
    var tileBorderColor = tile.style.borderColor || getComputedStyle(tile).borderColor || 'rgba(255,255,255,.15)';
    wrapper.style.cssText = 'left:'+pos.x+'px;top:'+pos.y+'px;position:absolute;z-index:'+(100+pinIdx)+';width:'+savedW+'px'+(savedH?';height:'+savedH+'px':'')+';border:1px solid '+tileBorderColor+';border-radius:2px;box-shadow:0 0 12px '+tileBorderColor.replace(')',',0.15)').replace('rgba','rgba').replace('rgb(','rgba(').replace(/,\s*[\d.]+\)$/,',0.15)');

    // Pin
    var pin = document.createElement('div');
    pin.className = 'pb-pin';
    pin.style.background = PB_PIN_COLORS[pinIdx % PB_PIN_COLORS.length];
    wrapper.appendChild(pin);

    // Move real tile into wrapper
    tile.style.position = 'relative';
    tile.style.margin = '0';
    tile.style.width = '100%';
    tile.style.maxHeight = pb.sizes[id] && pb.sizes[id].h ? 'none' : '500px';
    tile.style.overflow = 'hidden';
    var dh = tile.querySelector('.drag-handle');
    if (dh) dh._pbWasVisible = dh.style.display;
    if (dh) dh.style.display = 'none';
    wrapper.appendChild(tile);

    // Expand/contract toggle button
    var expandBtn = document.createElement('button');
    expandBtn.style.cssText = 'position:absolute;bottom:4px;right:4px;z-index:10;font-size:9px;padding:2px 7px;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.4);font-family:monospace;cursor:pointer;letter-spacing:1px';
    var isExpanded = pb.sizes[id] && pb.sizes[id].h;
    expandBtn.textContent = isExpanded ? '▲ COLLAPSE' : '▼ EXPAND';
    expandBtn.onclick = function(e) {
      e.stopPropagation();
      if (tile.style.maxHeight === 'none' || pb.sizes[id] && pb.sizes[id].h) {
        // Collapse
        tile.style.maxHeight = '500px';
        tile.style.overflow = 'hidden';
        wrapper.style.height = '';
        if (!pb.sizes[id]) pb.sizes[id] = {};
        delete pb.sizes[id].h;
        expandBtn.textContent = '▼ EXPAND';
      } else {
        // Expand
        tile.style.maxHeight = 'none';
        tile.style.overflow = 'visible';
        wrapper.style.height = '';
        if (!pb.sizes[id]) pb.sizes[id] = {};
        pb.sizes[id].h = 'full';
        expandBtn.textContent = '▲ COLLAPSE';
      }
      localStorage.setItem('dash_pb_sizes', JSON.stringify(pb.sizes));
      pbUpdateMinimap();
    };
    wrapper.appendChild(expandBtn);

    // Resize handle (bottom-right corner)
    var resizeHandle = document.createElement('div');
    resizeHandle.style.cssText = 'position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:se-resize;z-index:11;opacity:.4';
    resizeHandle.innerHTML = '<svg width="16" height="16" style="display:block"><polyline points="4,12 12,4" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/><polyline points="8,12 12,8" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/></svg>';
    var resizing = false, resStartX=0, resStartW=0;
    resizeHandle.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      resizing=true; resStartX=e.clientX; resStartW=parseFloat(wrapper.style.width)||'+str(CARD_W)+';
      function onMove(e2) {
        if (!resizing) return;
        var newW = Math.max(200, resStartW + (e2.clientX - resStartX)/pb.zoom);
        wrapper.style.width = newW+'px';
        if (!pb.sizes[id]) pb.sizes[id]={};
        pb.sizes[id].w = Math.round(newW);
        pbUpdateMinimap();
      }
      function onUp() { resizing=false; localStorage.setItem('dash_pb_sizes',JSON.stringify(pb.sizes)); document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); }
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    });
    wrapper.appendChild(resizeHandle);

    pbMakeDraggable(wrapper, id);
    board.appendChild(wrapper);
    pinIdx++;
  });

  pbBuildMinimap();
  pbInitEvents();
  // Update zone boundaries to fit cards
  setTimeout(pbUpdateZones, 200);
}

function pbPushApart(){}
function pbUpdateZones(){
  Object.keys(PB_ZONE_CARDS).forEach(function(zkey){
    var zEl=document.getElementById('pb-zone-'+zkey);if(!zEl)return;
    var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9,found=false;
    PB_ZONE_CARDS[zkey].forEach(function(id){
      var w=document.querySelector('.pb-card[data-tileid="'+id+'"]');if(!w)return;
      var x=parseFloat(w.style.left)||0,y=parseFloat(w.style.top)||0;
      var rw=w.offsetWidth||CARD_W,rh=w.offsetHeight||200;
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+rw);maxY=Math.max(maxY,y+rh);found=true;
    });
    if(!found)return;
    var P=20;
    zEl.style.left=(minX-P)+'px';zEl.style.top=(minY-P-20)+'px';
    zEl.style.width=(maxX-minX+P*2)+'px';zEl.style.height=(maxY-minY+P*2+20)+'px';
  });
}

function pbTeardown() {
  // Move real tiles back to grid
  var grid = document.getElementById('grid');
  document.querySelectorAll('.pb-card[data-tileid]').forEach(function(wrapper) {
    var tile = wrapper.querySelector('[data-id]');
    if (!tile) return;
    // Restore drag handle
    var dh = tile.querySelector('.drag-handle');
    if (dh && dh._pbWasVisible !== undefined) dh.style.display = dh._pbWasVisible;
    // Restore tile styles
    tile.style.position = '';
    tile.style.margin = '';
    tile.style.width = '';
    // Put back in grid
    if (tile._pbOrigNextSibling && tile._pbOrigNextSibling.parentNode === grid) {
      grid.insertBefore(tile, tile._pbOrigNextSibling);
    } else {
      grid.appendChild(tile);
    }
  });
  document.getElementById('pb-board').innerHTML = '';
}

function pbMakeDraggable(card, id) {
  var moved = false;

  function startDrag(cx, cy) {
    pb.dragging = card;
    moved = true;
    var rect = card.getBoundingClientRect();
    pb.dragOffX = (cx - rect.left) / pb.zoom;
    pb.dragOffY = (cy - rect.top) / pb.zoom;
    card.classList.add('pb-dragging');
    card.style.zIndex = 5000;
  }

  card.addEventListener('touchstart', function(e) {
    moved = false;
    var t = e.touches[0];
    pb.longPressTimer = setTimeout(function() { startDrag(t.clientX, t.clientY); }, 500);
  }, {passive:true});

  card.addEventListener('touchmove', function(e) {
    if (!pb.dragging || pb.dragging !== card) { clearTimeout(pb.longPressTimer); return; }
    var t = e.touches[0];
    var bx = (t.clientX - pb.panX) / pb.zoom - pb.dragOffX;
    var by = (t.clientY - pb.panY) / pb.zoom - pb.dragOffY;
    bx = Math.max(0, bx); by = Math.max(30, by);
    card.style.left = bx+'px'; card.style.top = by+'px';
    pb.positions[id] = {x:Math.round(bx), y:Math.round(by)};
    pbUpdateMinimap();
    e.stopPropagation();
  }, {passive:true});

  card.addEventListener('touchend', function() {
    clearTimeout(pb.longPressTimer);
    if (pb.dragging === card) {
      card.classList.remove('pb-dragging');
      pb.dragging = null;
      localStorage.setItem('dash_pb_pos', JSON.stringify(pb.positions));
    }
  });

  card.addEventListener('mousedown', function(e) {
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  });
}

function pbInitEvents() {
  var overlay = document.getElementById('pinboard-overlay');

  // Pan
  overlay.addEventListener('mousedown', function(e) {
    if (pb.dragging) return;
    if (e.target.closest('.pb-card,.pb-nav-btn,button')) return;
    pb.isPanning = true;
    pb.panStartX = e.clientX; pb.panStartY = e.clientY;
    pb.panStartBX = pb.panX; pb.panStartBY = pb.panY;
  });

  overlay.addEventListener('mousemove', function(e) {
    if (pb.dragging) {
      var bx = (e.clientX - pb.panX) / pb.zoom - pb.dragOffX;
      var by = (e.clientY - pb.panY) / pb.zoom - pb.dragOffY;
      pb.dragging.style.left = Math.max(0,bx)+'px';
      pb.dragging.style.top = Math.max(30,by)+'px';
      var tid = pb.dragging.dataset.tileid;
      pb.positions[tid] = {x:Math.round(Math.max(0,bx)), y:Math.round(Math.max(30,by))};
      pbUpdateMinimap();
      return;
    }
    if (!pb.isPanning) return;
    pb.panX = pb.panStartBX + (e.clientX - pb.panStartX);
    pb.panY = pb.panStartBY + (e.clientY - pb.panStartY);
    pbApplyTransform();
  });

  overlay.addEventListener('mouseup', function() {
    if (pb.dragging) {
      pb.dragging.classList.remove('pb-dragging');
      localStorage.setItem('dash_pb_pos', JSON.stringify(pb.positions));
      setTimeout(pbPushApart, 50);
      pb.dragging = null;
    }
    pb.isPanning = false;
  });

  // Touch pan
  var tpStartX=0, tpStartY=0, tpStartBX=0, tpStartBY=0, tpActive=false;
  overlay.addEventListener('touchstart', function(e) {
    if (pb.dragging) return;
    if (e.touches.length===1 && !e.target.closest('.pb-card,.pb-nav-btn,button')) {
      tpActive=true;
      tpStartX=e.touches[0].clientX; tpStartY=e.touches[0].clientY;
      tpStartBX=pb.panX; tpStartBY=pb.panY;
    }
    if (e.touches.length===2) {
      var dx=e.touches[0].clientX-e.touches[1].clientX;
      var dy=e.touches[0].clientY-e.touches[1].clientY;
      pb.pinchDist0=Math.sqrt(dx*dx+dy*dy);
      pb.pinchZoom0=pb.zoom;
      tpActive=false;
    }
  },{passive:true});

  overlay.addEventListener('touchmove', function(e) {
    if (pb.dragging) return;
    if (e.touches.length===1 && tpActive) {
      pb.panX = tpStartBX+(e.touches[0].clientX-tpStartX);
      pb.panY = tpStartBY+(e.touches[0].clientY-tpStartY);
      pbApplyTransform();
    } else if (e.touches.length===2 && pb.pinchDist0) {
      var dx=e.touches[0].clientX-e.touches[1].clientX;
      var dy=e.touches[0].clientY-e.touches[1].clientY;
      var dist=Math.sqrt(dx*dx+dy*dy);
      var newZ=Math.max(pb.MIN_ZOOM,Math.min(pb.MAX_ZOOM,pb.pinchZoom0*(dist/pb.pinchDist0)));
      var cx=(e.touches[0].clientX+e.touches[1].clientX)/2;
      var cy=(e.touches[0].clientY+e.touches[1].clientY)/2;
      var bx=(cx-pb.panX)/pb.zoom; var by=(cy-pb.panY)/pb.zoom;
      pb.zoom=newZ; pb.panX=cx-bx*newZ; pb.panY=cy-by*newZ;
      pbApplyTransform();
    }
  },{passive:true});

  overlay.addEventListener('touchend', function(e) {
    if(e.touches.length<2) pb.pinchDist0=null;
    if(e.touches.length===0) tpActive=false;
  },{passive:true});

  // Wheel zoom
  overlay.addEventListener('wheel', function(e) {
    e.preventDefault();
    var delta = e.deltaY>0?0.88:1.12;
    var newZ = Math.max(pb.MIN_ZOOM,Math.min(pb.MAX_ZOOM,pb.zoom*delta));
    var bx=(e.clientX-pb.panX)/pb.zoom; var by=(e.clientY-pb.panY)/pb.zoom;
    pb.zoom=newZ; pb.panX=e.clientX-bx*newZ; pb.panY=e.clientY-by*newZ;
    pbApplyTransform();
  },{passive:false});

  // Nav buttons
  overlay.querySelectorAll('[data-pbsnap]').forEach(function(btn) {
    btn.onclick = function() { pbSnapTo(this.dataset.pbsnap); };
  });
}

function pbApplyTransform() {
  var board = document.getElementById('pb-board');
  if (board) board.style.transform = 'translate('+pb.panX+'px,'+pb.panY+'px) scale('+pb.zoom+')';
  pbDrawGrid();
  pbUpdateMinimap();
  var lbl = document.getElementById('pb-zoom-lbl');
  if (lbl) lbl.textContent = Math.round(pb.zoom*100)+'%';
}

function pbDrawGrid() {
  var canvas = document.getElementById('pb-grid-canvas');
  if (!canvas) return;
  var W=window.innerWidth, H=window.innerHeight;
  canvas.width=W; canvas.height=H;
  var ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);
  var gs=40*pb.zoom;
  var ox=pb.panX%gs, oy=pb.panY%gs;
  ctx.strokeStyle='rgba(255,255,255,.03)'; ctx.lineWidth=1;
  for(var x=ox;x<W;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(var y=oy;y<H;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  var ms=gs*5, mox=pb.panX%ms, moy=pb.panY%ms;
  ctx.strokeStyle='rgba(255,255,255,.06)';
  for(var mx=mox;mx<W;mx+=ms){ctx.beginPath();ctx.moveTo(mx,0);ctx.lineTo(mx,H);ctx.stroke();}
  for(var my=moy;my<H;my+=ms){ctx.beginPath();ctx.moveTo(0,my);ctx.lineTo(W,my);ctx.stroke();}
}

function pbBuildMinimap() {
  var mm = document.getElementById('pb-minimap');
  if (!mm) return;
  mm.querySelectorAll('.pb-mm-dot').forEach(function(d){d.remove();});
  document.querySelectorAll('.pb-card').forEach(function(card) {
    var dot = document.createElement('div');
    dot.className = 'pb-mm-dot';
    dot.style.cssText = 'position:absolute;width:3px;height:3px;border-radius:50%;pointer-events:none';
    var col = card.style.borderColor||'#fff';
    dot.style.background = col;
    dot.dataset.cardid = card.dataset.tileid;
    mm.appendChild(dot);
  });
  pbUpdateMinimap();
}

function pbUpdateMinimap() {
  var mm = document.getElementById('pb-minimap');
  var vp = document.getElementById('pb-minimap-vp');
  if (!mm||!vp) return;
  var sx=110/pb.BOARD_W, sy=80/pb.BOARD_H;
  mm.querySelectorAll('.pb-mm-dot').forEach(function(dot) {
    var card = document.querySelector('.pb-card[data-tileid="'+dot.dataset.cardid+'"]');
    if (card) {
      dot.style.left = (parseFloat(card.style.left)*sx)+'px';
      dot.style.top = (parseFloat(card.style.top)*sy)+'px';
    }
  });
  var vpW=(window.innerWidth/pb.zoom)*sx;
  var vpH=(window.innerHeight/pb.zoom)*sy;
  var vpX=(-pb.panX/pb.zoom)*sx;
  var vpY=(-pb.panY/pb.zoom)*sy;
  vp.style.left=Math.max(0,vpX)+'px'; vp.style.top=Math.max(0,vpY)+'px';
  vp.style.width=Math.min(110,vpW)+'px'; vp.style.height=Math.min(80,vpH)+'px';
}

function pbSnapTo(key) {
  var W=window.innerWidth, H=window.innerHeight;
  if (key==='fit') {
    pb.zoom=Math.min(W/pb.BOARD_W,H/pb.BOARD_H)*0.85;
    pb.panX=20; pb.panY=50;
  } else if (PB_SNAP[key]) {
    var z=PB_SNAP[key];
    pb.zoom=Math.min(pb.MAX_ZOOM,Math.min((W-80)/z.w,(H-100)/z.h)*0.88);
    pb.panX=-(z.x*pb.zoom)+30; pb.panY=-(z.y*pb.zoom)+50;
  }
  pbApplyTransform();
}

// ── THE WALL ──
var _wallEditBrickId = null;
var _wallDelBrickPending = null;

var wallData = (function(){
  try{
    var d=JSON.parse(localStorage.getItem('dash_wall')||'{}');
    return {
      walls: Array.isArray(d.walls)?d.walls:[{id:'default',name:'Main Wall',evalEvery:25,linkedGoal:null,linkedCd:null}],
      bricks: Array.isArray(d.bricks)?d.bricks:[],
      archive: Array.isArray(d.archive)?d.archive:[],
      _tab: d._tab||'wall',
      _activeWall: d._activeWall||'default',
    };
  }catch(e){return {walls:[{id:'default',name:'Main Wall',evalEvery:25,linkedGoal:null,linkedCd:null}],bricks:[],archive:[],_tab:'wall',_activeWall:'default'};}
})();

function wallSave(){localStorage.setItem('dash_wall',JSON.stringify(wallData));}

var WALL_COLORS=[
  {main:'#ff8c42',border:'rgba(255,140,66,.4)',ghost:'rgba(255,140,66,',do_bg:'rgba(255,140,66,.15)',plan_bg:'rgba(0,229,255,.08)'},
  {main:'#bf5fff',border:'rgba(191,95,255,.4)',ghost:'rgba(191,95,255,',do_bg:'rgba(191,95,255,.15)',plan_bg:'rgba(0,255,136,.08)'},
  {main:'#00e5ff',border:'rgba(0,229,255,.4)',ghost:'rgba(0,229,255,',do_bg:'rgba(0,229,255,.12)',plan_bg:'rgba(255,140,66,.08)'},
  {main:'#00ff88',border:'rgba(0,255,136,.4)',ghost:'rgba(0,255,136,',do_bg:'rgba(0,255,136,.12)',plan_bg:'rgba(191,95,255,.08)'},
  {main:'#ff5fa0',border:'rgba(255,95,160,.4)',ghost:'rgba(255,95,160,',do_bg:'rgba(255,95,160,.12)',plan_bg:'rgba(255,204,0,.08)'},
];

function wallColor(){
  var idx=wallData.walls.findIndex(function(w){return w.id===wallData._activeWall;});
  return WALL_COLORS[Math.max(0,idx)%WALL_COLORS.length];
}

function wallGetActive(){
  return wallData.walls.find(function(w){return w.id===wallData._activeWall;})||wallData.walls[0];
}

function wallBricks(wallId){
  return wallData.bricks.filter(function(b){return b.wallId===(wallId||wallData._activeWall);});
}

function wallRender(){
  var el=document.getElementById('wall-body');
  var badge=document.getElementById('wall-badge');
  if(!el)return;

  var wall=wallGetActive();
  var bricks=wallBricks(wall.id);
  var total=bricks.length;
  var doBricks=bricks.filter(function(b){return b.type==='do';}).length;
  if(badge)badge.textContent=total+' bricks'+(total>0?' · '+doBricks+' doing':'');

  var tab=wallData._tab||'wall';
  var h='';

  h+='<div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap">';
  [{t:'wall',l:'🧱 WALL'},{t:'add',l:'+ BRICK'},{t:'eval',l:'↺ EVAL'},{t:'settings',l:'⚙ EDIT'},{t:'archive',l:'📦 ARCHIVE'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-walltab="'+x.t+'" class="wall-tab'+(a?' active':'')+'" >'+x.l+'</span>';
  });
  h+='</div>';

  // Wall switcher — always shown, separator above
  var wc=wallColor();
  h+='<div style="border-top:1px solid rgba(255,255,255,.07);padding-top:8px;display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center">';
  wallData.walls.forEach(function(w,wi){
    var a=w.id===wall.id;
    var wci=WALL_COLORS[wi%WALL_COLORS.length];
    h+='<span data-wallswitch="'+w.id+'" style="font-size:10px;padding:3px 9px;border:1px solid '+(a?wci.border:'rgba(255,255,255,.12)')+';color:'+(a?wci.main:'var(--dim)')+';background:'+(a?'rgba(0,0,0,.2)':'transparent')+';cursor:pointer">'+w.name+'</span>';
  });
  h+='<span data-wallnew="1" style="font-size:10px;padding:3px 9px;border:1px dashed rgba(255,255,255,.15);color:rgba(255,255,255,.25);cursor:pointer">+ NEW</span>';
  h+='</div>';

  if(tab==='wall'){
    h+='<div style="border-top:1px solid rgba(255,255,255,.07);margin-bottom:10px"></div>';
    var evalEvery=wall.evalEvery||25;
    var bricksSinceEval=0;
    for(var bi=bricks.length-1;bi>=0;bi--){
      if(bricks[bi].type==='eval')break;
      bricksSinceEval++;
    }
    if(bricksSinceEval>=evalEvery&&bricksSinceEval>0){
      h+='<div class="wall-eval-prompt" style="margin-bottom:10px;border-color:'+wc.border+'">';
      h+='<div style="font-size:11px;color:'+wc.main+';margin-bottom:6px">&#8987; '+bricksSinceEval+' bricks since last reflection</div>';
      h+='<div style="font-size:11px;color:var(--text);line-height:1.6;margin-bottom:8px">'+(wall.linkedGoal?'Your goal: <em style="color:#ff8c42">'+wall.linkedGoal+'</em><br>':'')+'Look back at your last '+bricksSinceEval+' bricks. Did they move you forward — or were you mostly planning?</div>';
      h+='<div style="display:flex;gap:6px">';
      h+='<button data-walleval="real" style="flex:1;padding:7px;background:rgba(0,255,136,.06);border:1px solid var(--cg);color:var(--cg);font-family:monospace;font-size:10px;cursor:pointer">&#10003; REAL PROGRESS</button>';
      h+='<button data-walleval="plan" style="flex:1;padding:7px;background:rgba(0,229,255,.06);border:1px solid var(--cc);color:var(--cc);font-family:monospace;font-size:10px;cursor:pointer">&#9737; MOSTLY PLANNING</button>';
      h+='</div></div>';
    }

    if(!bricks.length){
      h+='<div style="color:var(--dim);font-size:12px;padding:20px 0;text-align:center;line-height:2">No bricks yet.<br>Every small step counts.<br>Lay the first one.</div>';
    } else {
      // Show oldest first so grid fills bottom→top visually (grid scaleY(-1))
      var display=bricks.slice(-50);
      // Chunk bricks into rows of 5, wrap in flex column-reverse outer
      h+='<div class="wall-outer" id="wall-outer">';
      var totalRows=Math.ceil(display.length/5);
      for(var ri=0;ri<display.length;ri+=5){
        var rowIdx=Math.floor(ri/5);
        var isOdd=rowIdx%2===1;
        var row=display.slice(ri,ri+5);
        h+='<div class="wall-grid'+(isOdd?' row-odd':'')+'">';
        row.forEach(function(b){
          if(b.type==='eval'){
            var evalCol=b.answer==='real'?'var(--cg)':'var(--cc)';
            h+='<div class="brick brick-eval brick-in" style="color:'+evalCol+'">';
            h+='<span style="font-size:10px">'+(b.answer==='real'?'✓':'○')+' '+b.label+'</span>';
            h+='<span style="font-size:8px;opacity:.5">'+b.date+'</span>';
            h+='</div>';
          } else {
            var brickBg=b.type==='do'?wc.do_bg:wc.plan_bg;
            var brickBorder=b.type==='do'?wc.border:'rgba(0,229,255,.25)';
            var llen=(b.label||'').length;
            var sizeClass=llen<=20?'brick-s':llen<=36?'brick-m':'brick-l';
            // Random hue/saturation variation per brick (seeded by brick id for consistency per session)
            var brickSeed=(b.id%1000)/1000;
            var hShift=Math.round((brickSeed*70)-35); // -35 to +35 deg hue
            var sShift=Math.round((((b.id*17)%100)/100)*35); // 0-35% saturation boost
            var brickFilter='hue-rotate('+hShift+'deg) saturate('+(100+sShift)+'%)';
            h+='<div class="brick brick-'+(b.type||'do')+' '+sizeClass+'" id="brick-'+b.id+'" style="background:'+brickBg+';border-color:'+brickBorder+';filter:'+brickFilter+'">';
            h+='<div class="brick-label">'+(b.label||'·')+'</div>';
            if(b.link)h+='<div class="brick-link">'+b.link+'</div>';
            h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px">';
            h+='<div class="brick-tag">'+(b.type==='do'?'DO':'PLAN')+'</div>';
            h+='<div style="display:flex;gap:2px"><span data-brickedit="'+b.id+'" style="font-size:11px;color:rgba(255,255,255,.4);cursor:pointer;padding:2px 4px;line-height:1">✎</span><span data-brickdel="'+b.id+'" style="font-size:11px;color:rgba(255,68,68,.5);cursor:pointer;padding:2px 4px;line-height:1">✕</span></div>';
            h+='</div>';
            h+='</div>';
          }
        });
        h+='</div>';
      }
      // 2 ghost rows above (rendered after real = visually on top with column-reverse)
      // rowIdx for ghost rows continues from totalRows
      for(var ghostRow=0;ghostRow<2;ghostRow++){
        var ghostRowIdx=totalRows+ghostRow;
        var ghostOdd=ghostRowIdx%2===1;
        var ghostOpacity=ghostRow===0?'0.18':'0.09';
        h+='<div class="wall-grid'+(ghostOdd?' row-odd':'')+'">';
        for(var gb=0;gb<5;gb++){
          h+='<div class="brick brick-ghost brick-in" style="border:1px dashed '+wc.ghost+ghostOpacity+');background:transparent;min-height:36px"></div>';
        }
        h+='</div>';
      }
      h+='</div>';
      if(bricks.length>50)h+='<div style="font-size:9px;color:var(--dim);text-align:center;margin-top:6px">'+(bricks.length-50)+' more in archive</div>';
    }

    // Quick-add strip at bottom of wall
    h+='<div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.07)">';
    h+='<div style="display:flex;gap:8px">';
    h+='<button id="wall-quick-do" style="flex:1;padding:12px 8px;background:rgba(255,140,66,.08);border:2px solid rgba(255,140,66,.5);color:#ff8c42;font-family:VT323,monospace;font-size:20px;cursor:pointer;letter-spacing:1px;line-height:1">🔨 LAY BRICK</button>';
    h+='<button id="wall-quick-plan" style="flex:1;padding:12px 8px;background:rgba(0,229,255,.05);border:1px solid rgba(0,229,255,.3);color:var(--cc);font-family:VT323,monospace;font-size:20px;cursor:pointer;letter-spacing:1px;line-height:1">📋 PLAN BRICK</button>';
    h+='</div>';
    h+='</div>';

  } else if(tab==='add'){
    h+='<input id="wall-label-inp" placeholder="What did you do? (optional)" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,140,66,.25);color:var(--text);font-family:monospace;font-size:13px;padding:5px 2px;outline:none;box-sizing:border-box;margin-bottom:12px">';
    h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:8px">WHAT KIND OF BRICK?</div>';
    h+='<div style="display:flex;gap:8px;margin-bottom:12px">';
    h+='<div data-wallbricktype="do" id="wall-type-do" style="flex:1;padding:14px 8px;border:2px solid #ff8c42;background:rgba(255,140,66,.1);cursor:pointer;text-align:center"><div style="font-size:20px">🔨</div><div style="font-size:10px;color:#ff8c42;margin-top:4px;letter-spacing:1px">DOING</div><div style="font-size:9px;color:var(--dim);margin-top:2px">Real action taken</div></div>';
    h+='<div data-wallbricktype="plan" id="wall-type-plan" style="flex:1;padding:14px 8px;border:1px solid rgba(0,229,255,.3);background:rgba(0,229,255,.04);cursor:pointer;text-align:center"><div style="font-size:20px">📋</div><div style="font-size:10px;color:var(--cc);margin-top:4px;letter-spacing:1px">PLANNING</div><div style="font-size:9px;color:var(--dim);margin-top:2px">Organizing, prep</div></div>';
    h+='</div>';
    h+='<input id="wall-link-inp" placeholder="Link to goal/countdown (optional)..." style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;font-size:11px;padding:4px 2px;outline:none;box-sizing:border-box;margin-bottom:12px">';
    h+='<button id="wall-add-btn" style="width:100%;padding:12px;background:rgba(255,140,66,.08);border:2px solid #ff8c42;color:#ff8c42;font-family:monospace;font-size:13px;cursor:pointer;letter-spacing:2px">+ LAY BRICK</button>';

  } else if(tab==='eval'){
    var evals=bricks.filter(function(b){return b.type==='eval';});
    if(!evals.length){
      h+='<div style="color:var(--dim);font-size:12px;padding:10px 0">No evaluations yet. Keep laying bricks.</div>';
    } else {
      evals.slice().reverse().forEach(function(ev){
        var col=ev.answer==='real'?'var(--cg)':'var(--cc)';
        h+='<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:10px;color:'+col+'">'+(ev.answer==='real'?'✓':'○')+' '+ev.label+'</span><span style="font-size:9px;color:var(--dim)">'+ev.date+'</span></div></div>';
      });
    }


  } else if(tab==='settings'){
    h+='<div style="margin-bottom:12px"><div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:6px">WALL NAME</div>';
    h+='<input id="wall-name-inp" value="'+wall.name+'" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,140,66,.25);color:var(--text);font-family:monospace;font-size:14px;padding:4px 2px;outline:none;box-sizing:border-box"></div>';
    h+='<div style="margin-bottom:12px"><div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:6px">GOAL THIS WALL IS BUILDING TOWARD</div>';
    h+='<input id="wall-goal-inp" value="'+(wall.linkedGoal||'')+'" placeholder="e.g. launch my app, learn Arabic..." style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,140,66,.2);color:var(--text);font-family:monospace;font-size:12px;padding:4px 2px;outline:none;box-sizing:border-box"></div>';
    h+='<div style="margin-bottom:14px;display:flex;align-items:center;gap:10px"><div style="font-size:9px;color:var(--dim);letter-spacing:1px">EVALUATE EVERY</div>';
    h+='<input id="wall-eval-every" type="number" min="5" max="100" value="'+(wall.evalEvery||25)+'" style="width:55px;background:transparent;border:none;border-bottom:1px solid rgba(255,140,66,.3);color:#ff8c42;font-family:VT323,monospace;font-size:28px;padding:2px;outline:none;text-align:center">';
    h+='<span style="font-size:11px;color:var(--dim)">bricks</span></div>';
    h+='<button id="wall-settings-save" style="width:100%;padding:9px;background:rgba(255,140,66,.07);border:1px solid rgba(255,140,66,.4);color:#ff8c42;font-family:monospace;font-size:12px;cursor:pointer;letter-spacing:1px;margin-bottom:8px">SAVE CHANGES</button>';
    // Delete wall option (if more than one wall)
    if(wallData.walls.length>1){
      h+='<button id="wall-delete-btn" style="width:100%;padding:7px;background:transparent;border:1px solid rgba(255,68,68,.3);color:var(--cr);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">DELETE THIS WALL</button>';
    }

  } else if(tab==='archive'){
    var archived=wallData.archive.filter(function(b){return b.wallId===wall.id;});
    if(!archived.length){h+='<div style="color:var(--dim);font-size:12px;padding:10px 0">Archive is empty. Keep building.</div>';}
    else{
      h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:8px">'+archived.length+' archived bricks</div>';
      archived.slice().reverse().slice(0,40).forEach(function(b){
        h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span style="font-size:9px;padding:2px 5px;border:1px solid '+(b.type==='do'?'rgba(255,140,66,.4)':'rgba(0,229,255,.3)')+';color:'+(b.type==='do'?'#ff8c42':'var(--cc)')+'">'+(b.type==='do'?'DO':'PLAN')+'</span><span style="flex:1;font-size:11px;color:var(--dim)">'+( b.label||'·')+'</span><span style="font-size:9px;color:rgba(255,255,255,.2)">'+b.date+'</span></div>';
      });
    }
  }

  el.innerHTML=h;

  el.querySelectorAll('[data-walltab]').forEach(function(btn){btn.onclick=function(){wallData._tab=this.dataset.walltab;wallSave();wallRender();};});
  el.querySelectorAll('[data-wallswitch]').forEach(function(btn){btn.onclick=function(){wallData._activeWall=this.dataset.wallswitch;wallSave();wallRender();};});
  // Wire quick-add buttons
  var quickDo=document.getElementById('wall-quick-do');
  var quickPlan=document.getElementById('wall-quick-plan');
  if(quickDo)quickDo.onclick=function(e){
    var label=prompt('What did you do? (optional — leave blank to just mark the day)','');
    if(label===null)return;
    wallAddBrick(label.trim(),'do','',e);
  };
  if(quickPlan)quickPlan.onclick=function(e){
    var label=prompt('What did you plan? (optional)','');
    if(label===null)return;
    wallAddBrick(label.trim(),'plan','',e);
  };

  el.querySelectorAll('[data-wallnew]').forEach(function(btn){
    btn.onclick=function(){
      var name=prompt('Name for new wall (e.g. Career, Health, Learning):');
      if(!name||!name.trim())return;
      var w={id:String(Date.now()),name:name.trim(),evalEvery:25,linkedGoal:null};
      wallData.walls.push(w);
      wallData._activeWall=w.id;
      wallData._tab='wall';
      wallSave();wallRender();
    };
  });
  // Brick edit
  el.querySelectorAll('[data-brickedit]').forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      var bid=this.dataset.brickedit;
      var b=wallData.bricks.find(function(x){return String(x.id)===String(bid);});
      if(!b)return;
      var newLabel=prompt('Edit brick label:',b.label||'');
      if(newLabel===null)return;
      b.label=newLabel.trim();
      wallSave();wallRender();
    };
  });
  // Brick delete
  var _wallBrickDelPending={};
  el.querySelectorAll('[data-brickdel]').forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      var bid=this.dataset.brickdel;
      if(_wallBrickDelPending[bid]){
        wallData.bricks=wallData.bricks.filter(function(x){return String(x.id)!==String(bid);});
        wallSave();wallRender();
      } else {
        _wallBrickDelPending={};_wallBrickDelPending[bid]=true;
        var self=this;self.textContent='✕✕';self.style.color='var(--cr)';
        setTimeout(function(){_wallBrickDelPending={};if(self.parentNode)self.textContent='✕';self.style.color='rgba(255,68,68,.35)';},2000);
      }
    };
  });

  var selectedType='do';
  el.querySelectorAll('[data-wallbricktype]').forEach(function(btn){
    btn.onclick=function(){
      selectedType=this.dataset.wallbricktype;
      el.querySelectorAll('[data-wallbricktype]').forEach(function(b){
        var isDo=b.dataset.wallbricktype==='do';
        var sel=b.dataset.wallbricktype===selectedType;
        b.style.border=sel?(isDo?'2px solid #ff8c42':'2px solid var(--cc)'):(isDo?'1px solid rgba(255,140,66,.3)':'1px solid rgba(0,229,255,.3)');
        b.style.background=sel?(isDo?'rgba(255,140,66,.1)':'rgba(0,229,255,.06)'):'transparent';
      });
    };
  });

  var addBtn=document.getElementById('wall-add-btn');
  var labelInp=document.getElementById('wall-label-inp');
  var linkInp=document.getElementById('wall-link-inp');
  if(addBtn){
    addBtn.onclick=function(e){wallAddBrick(labelInp?labelInp.value.trim():'',selectedType,linkInp?linkInp.value.trim():'',e);};
  }
  if(labelInp)labelInp.onkeydown=function(e){if(e.keyCode===13)addBtn&&addBtn.click();};

  el.querySelectorAll('[data-walleval]').forEach(function(btn){btn.onclick=function(e){wallRecordEval(this.dataset.walleval,e);};});

  var settingsSave=document.getElementById('wall-settings-save');
  if(settingsSave)settingsSave.onclick=function(){
    var w=wallGetActive();
    var nameEl=document.getElementById('wall-name-inp');
    var goalEl=document.getElementById('wall-goal-inp');
    var evEl=document.getElementById('wall-eval-every');
    if(nameEl&&nameEl.value.trim())w.name=nameEl.value.trim();
    if(goalEl)w.linkedGoal=goalEl.value.trim()||null;
    var v=parseInt(evEl?evEl.value:25,10);
    if(v>=5&&v<=100)w.evalEvery=v;
    wallSave();wallRender();
  };
  var delWallBtn=document.getElementById('wall-delete-btn');
  if(delWallBtn)delWallBtn.onclick=function(){
    if(!confirm('Delete "'+wall.name+'" and all its bricks?'))return;
    var wid=wall.id;
    wallData.walls=wallData.walls.filter(function(w){return w.id!==wid;});
    wallData.bricks=wallData.bricks.filter(function(b){return b.wallId!==wid;});
    wallData._activeWall=wallData.walls[0].id;
    wallData._tab='wall';
    wallSave();wallRender();
  };


  // Animate bricks row by row — each row appears 600ms after the previous
  requestAnimationFrame(function(){
    wallFixLoneBricks();
    var bricks=Array.from(el.querySelectorAll('.brick:not(.brick-in):not(.brick-eval)'));
    // Row appears every 600ms, bricks within each row stagger by 47ms
    var rowDelay=600;
    var brickStagger=47;
    bricks.forEach(function(b,i){
      var rowIdx=Math.floor(i/5);
      var posInRow=i%5;
      setTimeout(function(){b.classList.add('brick-in');},rowIdx*rowDelay+posInRow*brickStagger);
    });
  });
}

// Post-render: move long bricks to their own centered rows
function wallFixLoneBricks(){
  document.querySelectorAll('.brick-l').forEach(function(brick){
    // Create a lone row
    var loneRow=document.createElement('div');
    loneRow.className='brick-row-lone';
    brick.className=brick.className.replace('brick-l','brick-lone');
    // Insert before brick's current parent row
    var row=brick.parentNode;
    if(row){
      row.parentNode.insertBefore(loneRow,row);
      loneRow.appendChild(brick);
    }
  });
  // Remove empty rows
  document.querySelectorAll('.wall-grid').forEach(function(r){
    if(!r.children.length)r.remove();
  });
}

function wallAddBrick(label,type,link,evt){
  var wall=wallGetActive();
  var bricks=wallBricks(wall.id);
  if(bricks.length>=50){
    var oldest=bricks[0];
    wallData.bricks=wallData.bricks.filter(function(b){return b.id!==oldest.id;});
    wallData.archive.push(oldest);
    if(wallData.archive.length>500)wallData.archive=wallData.archive.slice(-500);
  }
  wallData.bricks.push({id:Date.now(),wallId:wall.id,label:label||'',type:type||'do',link:link||'',date:new Date().toISOString().slice(0,10),ts:Date.now()});
  if(typeof hap==='function')hap(HAP.brick);
  wallSave();
  wallData._tab='wall';
  wallRender();
  if(evt){confetti(evt.clientX||window.innerWidth/2,evt.clientY||200,type==='do'?'#ff8c42':'#00e5ff');}
}

function wallRecordEval(answer,evt){
  var labels={'real':'Real progress — moving forward','plan':'Mostly planning — need more doing'};
  wallData.bricks.push({id:Date.now(),wallId:wallGetActive().id,label:labels[answer],type:'eval',answer:answer,date:new Date().toISOString().slice(0,10),ts:Date.now()});
  wallSave();
  if(evt)confetti(evt.clientX||window.innerWidth/2,evt.clientY||200,answer==='real'?'#00ff88':'#00e5ff');
  wallRender();
}

setTimeout(function(){wallRender();},480);

// ──────────────────────────────────────────
// ── REFRAME CARD ──
// ──────────────────────────────────────────
var rfData=JSON.parse(localStorage.getItem('dash_reframe')||'[]');
function rfSave(){localStorage.setItem('dash_reframe',JSON.stringify(rfData));}

function rfRender(){
  var el=document.getElementById('reframe-body');
  if(!el)return;
  var tab=window._rfTab||'reframe';
  var hasKey=!!(rfGetKey());
  var h='';

  // Tab bar
  h+='<div style="display:flex;gap:6px;margin-bottom:12px">';
  [{t:'reframe',l:'REFRAME'},{t:'log',l:'LOG'},{t:'settings',l:'⚙'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-rftab="'+x.t+'" style="font-size:9px;padding:3px 10px;border:1px solid '+(a?'rgba(126,184,255,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'#7eb8ff':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='reframe'){
    if(!hasKey){
      h+='<div style="padding:10px;background:rgba(255,204,0,.06);border:1px solid rgba(255,204,0,.2);font-size:11px;color:var(--dim);line-height:1.6;margin-bottom:10px">';
      h+='No API key set. Add your Anthropic API key in the ⚙ tab to use Reframe.';
      h+='</div>';
    }
    h+='<div style="font-size:11px;color:var(--dim);line-height:1.6;margin-bottom:10px">Write a thought that\'s weighing on you. Get a gentle, grounded reframe.</div>';
    h+='<textarea id="rf-inp" placeholder="I feel like I have been wasting my time..." style="width:100%;min-height:80px;background:transparent;border:none;border-bottom:1px solid rgba(126,184,255,.2);color:var(--text);font-family:monospace;font-size:13px;padding:4px 0;outline:none;resize:none;box-sizing:border-box;line-height:1.6"></textarea>';
    h+='<button id="rf-btn" onclick="rfSubmit()" style="width:100%;margin-top:10px;padding:10px;background:rgba(126,184,255,.06);border:1px solid rgba(126,184,255,.25);color:#7eb8ff;font-family:monospace;font-size:13px;cursor:pointer;letter-spacing:1px">REFRAME ↻</button>';
    h+='<div id="rf-response" style="margin-top:12px"></div>';

  } else if(tab==='log'){
    if(!rfData.length){
      h+='<div style="font-size:11px;color:var(--dim);padding:10px 0">No reframes yet.</div>';
    } else {
      h+='<div style="max-height:500px;overflow-y:auto">';
      rfData.forEach(function(e,i){
        h+='<div style="margin-bottom:12px;padding:10px;background:rgba(126,184,255,.04);border-left:2px solid rgba(126,184,255,.2)">';
        h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">';
        h+='<span style="font-size:9px;color:rgba(255,255,255,.2);flex:1">'+e.date+'</span>';
        h+='<button data-rfcopy="'+i+'" style="font-size:9px;padding:2px 8px;background:transparent;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.3);font-family:monospace;cursor:pointer;letter-spacing:1px">📋</button>';
        h+='</div>';
        h+='<div style="font-size:11px;color:var(--dim);margin-bottom:6px;font-style:italic;line-height:1.5">&ldquo;'+e.thought+'&rdquo;</div>';
        h+='<div style="font-size:12px;color:var(--text);line-height:1.7">'+e.reframe+'</div>';
        h+='</div>';
      });
      h+='</div>';
      h+='<div style="font-size:9px;color:var(--dim);margin-top:6px;opacity:.5">'+rfData.length+' entries stored</div>';
    }

  } else {
    // Settings
    h+='<div style="font-size:9px;color:rgba(126,184,255,.6);letter-spacing:2px;margin-bottom:10px">ANTHROPIC API KEY</div>';
    h+='<div style="font-size:11px;color:var(--dim);line-height:1.6;margin-bottom:10px">';
    h+='Your OpenAI key is stored locally only. Get one at platform.openai.com → API keys.';
    h+='</div>';
    h+='<input id="rf-key-inp" type="password" placeholder="sk-..." value="'+(rfGetKey()||'')+'" ';
    h+='style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(126,184,255,.2);color:var(--text);font-family:monospace;font-size:12px;padding:6px 0;outline:none;box-sizing:border-box;margin-bottom:10px">';
    h+='<button id="rf-key-save" style="width:100%;padding:9px;background:rgba(126,184,255,.06);border:1px solid rgba(126,184,255,.3);color:#7eb8ff;font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">SAVE KEY</button>';
    if(hasKey){
      h+='<button id="rf-key-clear" style="width:100%;margin-top:6px;padding:9px;background:transparent;border:1px solid rgba(255,85,85,.2);color:rgba(255,85,85,.6);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:1px">CLEAR KEY</button>';
    }
    h+='<div style="margin-top:12px;font-size:9px;color:var(--dim);line-height:1.6;opacity:.6">';
    h+='Key is stored in localStorage and never sent anywhere except Anthropic\'s API directly from your browser.';
    h+='</div>';
  }

  el.innerHTML=h;

  // Wire tabs
  el.querySelectorAll('[data-rftab]').forEach(function(b){
    b.onclick=function(){window._rfTab=this.dataset.rftab;rfRender();};
  });
  el.querySelectorAll('[data-rfcopy]').forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(this.dataset.rfcopy);
      var e=rfData[idx];
      if(!e)return;
      var txt='Thought:\n'+e.thought+'\n\nReframe:\n'+e.reframe;
      if(navigator.clipboard){
        navigator.clipboard.writeText(txt).catch(function(){
          var ta=document.createElement('textarea');ta.value=txt;
          document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
        });
      } else {
        var ta=document.createElement('textarea');ta.value=txt;
        document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
      }
      var b2=this;b2.textContent='✓';
      if(typeof hap==='function')hap(HAP.soft);
      setTimeout(function(){b2.textContent='📋';},1800);
    };
  });

  // Wire key save/clear
  var ks=document.getElementById('rf-key-save');
  if(ks)ks.onclick=function(){
    var inp=document.getElementById('rf-key-inp');
    if(inp){rfSetKey(inp.value);rfRender();}
  };
  var kc=document.getElementById('rf-key-clear');
  if(kc)kc.onclick=function(){
    localStorage.removeItem('dash_rf_key');
    showToast('API key cleared');
    rfRender();
  };
}

async function rfSubmit(){
  var inp=document.getElementById('rf-inp');
  var btn=document.getElementById('rf-btn');
  var resp=document.getElementById('rf-response');
  if(!inp||!inp.value.trim())return;
  var thought=inp.value.trim();
  btn.textContent='Thinking...';
  btn.disabled=true;
  resp.innerHTML='<div style="color:var(--dim);font-size:11px;animation:pulse 1.5s infinite">...</div>';
  try{
    var res=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+rfGetKey()},
      body:JSON.stringify({
        model:'gpt-4o-mini',
        max_tokens:300,
        messages:[
          {role:'system',content:'You are a compassionate, grounded companion. The user is sharing a difficult thought or feeling. Offer a gentle, honest reframe — not toxic positivity, not dismissiveness. Acknowledge the feeling first, then offer one or two alternative perspectives. Keep it under 5 sentences. Warm but not saccharine. Never say "I understand" or "I can see". Speak directly.'},
          {role:'user',content:thought}
        ]
      })
    });
    var data=await res.json();
    if(!res.ok){
      var _apiErr=(data.error&&data.error.message)||JSON.stringify(data);
      resp.innerHTML='<div style="color:var(--cr);font-size:11px">API error ('+res.status+'): '+_apiErr+'</div>';
      btn.textContent='REFRAME ↻';btn.disabled=false;
      return;
    }
    var reframe=data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content||'Could not generate reframe.';
    resp.innerHTML='<div style="font-size:12px;color:var(--text);line-height:1.8;padding:10px;background:rgba(126,184,255,.05);border-left:2px solid rgba(126,184,255,.4)">'+reframe+'</div>';
    rfData.unshift({thought:thought,reframe:reframe,date:new Date().toISOString().slice(0,10),ts:Date.now()});
    if(rfData.length>30)rfData=rfData.slice(0,30);
    rfSave();
    inp.value='';
  }catch(err){
    var _errMsg=err.message||String(err);
    // If it's a JSON parse error, the API returned an error response
    resp.innerHTML='<div style="color:var(--cr);font-size:11px">'
      +'<div style="margin-bottom:4px">Error: '+_errMsg+'</div>'
      +'<div style="opacity:.7">Check: valid OpenAI key in ⚙ tab (starts sk-...), key has credits, no VPN blocking api.openai.com</div>'
      +'</div>';
  }
  btn.textContent='REFRAME ↻';
  btn.disabled=false;
}

function rfGetKey(){
  return localStorage.getItem('dash_rf_key')||'';
}

function rfSetKey(k){
  localStorage.setItem('dash_rf_key',k.trim());
  showToast('API key saved');
}

setTimeout(function(){rfRender();},600);

// ──────────────────────────────────────────
// ── LEGACY LETTER ──
// ──────────────────────────────────────────
var legacyData=JSON.parse(localStorage.getItem('dash_legacy')||'{"letter":"","entries":[]}');
function legacySave(){localStorage.setItem('dash_legacy',JSON.stringify(legacyData));}

function legacyRender(){
  var el=document.getElementById('legacy-body');
  if(!el)return;
  var h='';
  h+='<div style="font-size:11px;color:rgba(245,166,35,.6);margin-bottom:10px;font-style:italic;line-height:1.6">A letter to your future self. Add to it over time. No pressure, no format. Just truth.</div>';
  // Tab bar
  var tab=legacyData._tab||'write';
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
  [{t:'write',l:'✍ WRITE'},{t:'history',l:'📜 HISTORY'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-legacytab="'+x.t+'" style="font-size:9px;padding:3px 10px;border:1px solid '+(a?'rgba(245,166,35,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'#f5a623':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='write'){
    h+='<textarea id="legacy-inp" placeholder="Dear future me,\n\nI am writing this on..." style="width:100%;min-height:180px;background:transparent;border:none;border-bottom:1px solid rgba(245,166,35,.15);color:var(--text);font-family:monospace;font-size:13px;padding:4px 0;outline:none;resize:vertical;box-sizing:border-box;line-height:1.8">'+( legacyData.draft||'')+'</textarea>';
    h+='<div style="display:flex;gap:6px;margin-top:8px">';
    h+='<button id="legacy-save-draft" style="flex:1;padding:8px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;font-size:10px;cursor:pointer">SAVE DRAFT</button>';
    h+='<button id="legacy-add-entry" style="flex:2;padding:8px;background:rgba(245,166,35,.07);border:1px solid rgba(245,166,35,.3);color:#f5a623;font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:1px">ADD TO LETTER ↓</button>';
    h+='</div>';
    h+='<div style="font-size:9px;color:var(--dim);margin-top:6px;opacity:.5">'+( legacyData.entries&&legacyData.entries.length?legacyData.entries.length+' entries so far · started '+(legacyData.entries[0]&&legacyData.entries[0].date||'today'):'First entry. Begin whenever.')+'</div>';
  } else {
    var entries=legacyData.entries||[];
    if(!entries.length){
      h+='<div style="color:var(--dim);font-size:11px;padding:10px 0">No entries yet. Start writing.</div>';
    } else {
      entries.slice().reverse().forEach(function(e,i){
        h+='<div style="margin-bottom:14px;padding:10px;background:rgba(245,166,35,.03);border-left:2px solid rgba(245,166,35,'+(i===0?'.4':'.15')+')">';
        h+='<div style="font-size:9px;color:rgba(245,166,35,.5);margin-bottom:6px">'+e.date+'</div>';
        h+='<div style="font-size:12px;color:var(--text);line-height:1.8;white-space:pre-wrap">'+e.text+'</div>';
        h+='</div>';
      });
    }
  }
  el.innerHTML=h;

  el.querySelectorAll('[data-legacytab]').forEach(function(btn){btn.onclick=function(){legacyData._tab=this.dataset.legacytab;legacySave();if(typeof hap==='function')hap(HAP.write);legacyRender();};});
  var draftBtn=document.getElementById('legacy-save-draft');
  if(draftBtn)draftBtn.onclick=function(){var inp=document.getElementById('legacy-inp');if(inp){legacyData.draft=inp.value;legacySave();showToast('Draft saved');}};
  var addBtn=document.getElementById('legacy-add-entry');
  if(addBtn)addBtn.onclick=function(){
    var inp=document.getElementById('legacy-inp');
    if(!inp||!inp.value.trim())return;
    if(!legacyData.entries)legacyData.entries=[];
    legacyData.entries.push({text:inp.value.trim(),date:new Date().toISOString().slice(0,10),ts:Date.now()});
    legacyData.draft='';
    legacySave();
    showToast('Added to your letter ✉️');
    if(typeof hap==='function')hap(HAP.write);legacyRender();
  };
}

setTimeout(function(){legacyRender();},650);

// ──────────────────────────────────────────
// ── SHADOW LOG ──
// ──────────────────────────────────────────
var shadowData=JSON.parse(localStorage.getItem('dash_shadow')||'[]');
function shadowSave(){localStorage.setItem('dash_shadow',JSON.stringify(shadowData));}

function shadowRender(){
  var el=document.getElementById('shadow-body');
  if(!el)return;
  var h='';
  h+='<div style="font-size:11px;color:rgba(191,95,255,.6);margin-bottom:10px;line-height:1.6;font-style:italic">What bothered, irritated, or shamed you today? What does that reaction reveal about you?</div>';
  // Add form
  h+='<div style="margin-bottom:12px">';
  h+='<textarea id="shadow-trigger" placeholder="What triggered you? (anger, jealousy, shame...)" style="width:100%;min-height:52px;background:transparent;border:none;border-bottom:1px solid rgba(191,95,255,.15);color:var(--text);font-family:monospace;font-size:12px;padding:4px 0;outline:none;resize:none;box-sizing:border-box;line-height:1.6;margin-bottom:8px"></textarea>';
  h+='<textarea id="shadow-reflection" placeholder="What does this reaction say about me honestly?" style="width:100%;min-height:52px;background:transparent;border:none;border-bottom:1px solid rgba(191,95,255,.15);color:var(--text);font-family:monospace;font-size:12px;padding:4px 0;outline:none;resize:none;box-sizing:border-box;line-height:1.6"></textarea>';
  h+='<button id="shadow-add" style="width:100%;margin-top:8px;padding:9px;background:rgba(191,95,255,.06);border:1px solid rgba(191,95,255,.25);color:#bf5fff;font-family:monospace;font-size:12px;cursor:pointer;letter-spacing:1px">LOG SHADOW ↓</button>';
  h+='</div>';
  // Log
  if(shadowData.length){
    h+='<div style="border-top:1px solid rgba(255,255,255,.06);padding-top:10px">';
    shadowData.slice().reverse().slice(0,10).forEach(function(e){
      h+='<div style="margin-bottom:10px;padding:8px;background:rgba(191,95,255,.04);border-left:2px solid rgba(191,95,255,.2)">';
      h+='<div style="font-size:10px;color:var(--dim);font-style:italic;margin-bottom:4px">'+e.trigger+'</div>';
      h+='<div style="font-size:11px;color:rgba(191,95,255,.8);line-height:1.5">↳ '+e.reflection+'</div>';
      h+='<div style="font-size:9px;color:rgba(255,255,255,.15);margin-top:4px">'+e.date+'</div>';
      h+='</div>';
    });
    if(shadowData.length>10)h+='<div style="font-size:9px;color:var(--dim);opacity:.4">+ '+(shadowData.length-10)+' more entries</div>';
    h+='</div>';
  } else {
    h+='<div style="font-size:11px;color:var(--dim);opacity:.5">No entries yet. The shadow grows when ignored.</div>';
  }
  el.innerHTML=h;

  var addBtn=document.getElementById('shadow-add');
  if(addBtn)addBtn.onclick=function(){
    var t=document.getElementById('shadow-trigger');
    var r=document.getElementById('shadow-reflection');
    if(!t||!t.value.trim()||!r||!r.value.trim())return;
    shadowData.unshift({trigger:t.value.trim(),reflection:r.value.trim(),date:new Date().toISOString().slice(0,10),ts:Date.now()});
    if(shadowData.length>100)shadowData=shadowData.slice(0,100);
    shadowSave();
    showToast('Shadow logged 🌑');
    if(typeof hap==='function')hap(HAP.write);shadowRender();
  };
}

setTimeout(function(){shadowRender();},700);

// ──────────────────────────────────────────
// ── FEAR INVENTORY + MEMENTO MORI ──
// ──────────────────────────────────────────
var fearData=JSON.parse(localStorage.getItem('dash_fear')||'{"fears":[],"mori":[]}');
function fearSave(){localStorage.setItem('dash_fear',JSON.stringify(fearData));}

var MORI_PROMPTS=[
  // On purpose & direction
  'What did you do today that your best self would be proud of?',
  'What is one thing you could change tomorrow that would make next month different?',
  'What does the version of you in five years need you to do this week?',
  // On relationships & accountability
  'Who in your life deserves more of your presence than they are getting?',
  'What is one commitment you made that you have not honoured yet?',
  'How did you show up for the people who depend on you today?',
  // On growth & courage
  'What is something you know you should do but keep finding reasons not to?',
  'Where are you playing it safe when you know you should step forward?',
  'What would you attempt if you were certain you would not fail?',
  // On character & integrity
  'Did your actions today reflect the person you are trying to become?',
  'What is one thing you could do this week that would require real courage?',
  'Where in your life are your values and your actions out of alignment?',
];

function fearRender(){
  var el=document.getElementById('fear-body');
  if(!el)return;
  var tab=fearData._tab||'fears';
  var h='';
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
  [{t:'fears',l:'💀 FEARS'},{t:'mori',l:'⏳ DEATHBED'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-feartab="'+x.t+'" style="font-size:9px;padding:3px 10px;border:1px solid '+(a?'rgba(255,140,66,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'#ff8c42':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='fears'){
    h+='<div style="font-size:11px;color:rgba(255,140,66,.6);margin-bottom:10px;line-height:1.6;font-style:italic">Name the real fear underneath the surface. What are you actually avoiding?</div>';
    var fears=fearData.fears||[];
    h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
    h+='<input id="fear-inp" placeholder="I am afraid of..." style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(255,140,66,.2);color:var(--text);font-family:monospace;font-size:12px;padding:4px 2px;outline:none">';
    h+='<button id="fear-add" style="padding:4px 12px;background:rgba(255,140,66,.07);border:1px solid rgba(255,140,66,.3);color:#ff8c42;font-family:monospace;font-size:11px;cursor:pointer">ADD</button>';
    h+='</div>';
    if(!fears.length){
      h+='<div style="font-size:11px;color:var(--dim);opacity:.5;padding:8px 0">No fears named yet. Naming them is the first act of courage.</div>';
    } else {
      fears.forEach(function(f,i){
        h+='<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">';
        h+='<span data-fearface="'+i+'" style="font-size:16px;cursor:pointer;color:'+(f.faced?'#ff8c42':'rgba(255,255,255,.15)')+'" title="'+(f.faced?'Faced':'Mark as faced')+'">'+(f.faced?'◉':'○')+'</span>';
        h+='<span style="flex:1;font-size:12px;color:'+(f.faced?'var(--dim)':'var(--text)')+(f.faced?';text-decoration:line-through':'')+'">'+f.text+'</span>';
        h+='<span style="font-size:9px;color:rgba(255,255,255,.15)">'+f.date+'</span>';
        h+='<span data-feardel="'+i+'" style="font-size:10px;color:rgba(255,68,68,.3);cursor:pointer;padding:2px 4px">✕</span>';
        h+='</div>';
      });
    }
  } else {
    // Deathbed test
    var todayStr=new Date().toISOString().slice(0,10);
    var doy=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/(864e5));
    var prompt=MORI_PROMPTS[doy%MORI_PROMPTS.length];
    var todayMori=(fearData.mori||[]).find(function(m){return m.date===todayStr;});
    h+='<div style="font-size:13px;color:rgba(255,140,66,.8);line-height:1.7;margin-bottom:12px;font-style:italic;padding:10px;border-left:2px solid rgba(255,140,66,.3)">'+prompt+'</div>';
    if(todayMori){
      h+='<div style="font-size:12px;color:var(--text);line-height:1.7;padding:8px;background:rgba(255,140,66,.04);border-left:2px solid rgba(255,140,66,.2)">'+todayMori.answer+'</div>';
      h+='<div style="font-size:9px;color:var(--dim);margin-top:6px;opacity:.5">Written today</div>';
    } else {
      h+='<textarea id="mori-inp" placeholder="Be honest..." style="width:100%;min-height:80px;background:transparent;border:none;border-bottom:1px solid rgba(255,140,66,.15);color:var(--text);font-family:monospace;font-size:12px;padding:4px 0;outline:none;resize:none;box-sizing:border-box;line-height:1.7"></textarea>';
      h+='<button id="mori-save" style="width:100%;margin-top:8px;padding:9px;background:rgba(255,140,66,.06);border:1px solid rgba(255,140,66,.25);color:#ff8c42;font-family:monospace;font-size:12px;cursor:pointer;letter-spacing:1px">ANSWER ↓</button>';
    }
    // History
    var moriLog=(fearData.mori||[]).slice().reverse().slice(1,6);
    if(moriLog.length){
      h+='<div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">';
      h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:8px">PAST REFLECTIONS</div>';
      moriLog.forEach(function(m){
        h+='<div style="margin-bottom:8px;padding:6px 8px;background:rgba(255,140,66,.03);border-left:1px solid rgba(255,140,66,.15)">';
        h+='<div style="font-size:9px;color:rgba(255,255,255,.2);margin-bottom:3px">'+m.date+'</div>';
        h+='<div style="font-size:11px;color:var(--dim);line-height:1.5">'+m.answer+'</div>';
        h+='</div>';
      });
      h+='</div>';
    }
  }

  el.innerHTML=h;

  el.querySelectorAll('[data-feartab]').forEach(function(btn){btn.onclick=function(){fearData._tab=this.dataset.feartab;fearSave();if(typeof hap==='function')hap(HAP.save);fearRender();};});
  var fearAddBtn=document.getElementById('fear-add');
  var fearInp=document.getElementById('fear-inp');
  if(fearAddBtn)fearAddBtn.onclick=function(){
    if(!fearInp||!fearInp.value.trim())return;
    if(!fearData.fears)fearData.fears=[];
    fearData.fears.unshift({text:fearInp.value.trim(),date:new Date().toISOString().slice(0,10),faced:false,ts:Date.now()});
    fearSave();if(typeof hap==='function')hap(HAP.save);fearRender();
  };
  if(fearInp)fearInp.onkeydown=function(e){if(e.keyCode===13)fearAddBtn&&fearAddBtn.click();};
  el.querySelectorAll('[data-fearface]').forEach(function(btn){btn.onclick=function(){
    var i=parseInt(this.dataset.fearface);
    fearData.fears[i].faced=!fearData.fears[i].faced;
    fearSave();if(typeof hap==='function')hap(HAP.save);fearRender();
  };});
  el.querySelectorAll('[data-feardel]').forEach(function(btn){btn.onclick=function(){
    var i=parseInt(this.dataset.feardel);
    fearData.fears.splice(i,1);
    fearSave();if(typeof hap==='function')hap(HAP.save);fearRender();
  };});
  var moriSave=document.getElementById('mori-save');
  if(moriSave)moriSave.onclick=function(){
    var inp=document.getElementById('mori-inp');
    if(!inp||!inp.value.trim())return;
    if(!fearData.mori)fearData.mori=[];
    fearData.mori.push({date:new Date().toISOString().slice(0,10),answer:inp.value.trim(),prompt:prompt,ts:Date.now()});
    if(fearData.mori.length>200)fearData.mori=fearData.mori.slice(-200);
    fearSave();if(typeof hap==='function')hap(HAP.save);fearRender();
  };
}

setTimeout(function(){fearRender();},750);

// ── AYAH RECALL ──
var AR_DATA = null;
var arState = JSON.parse(localStorage.getItem('dash_ar') || '{}');
var _arFont=localStorage.getItem('ar_font')||'scheherazade';


(function(){
  fetch('quranMemory.json')
    .then(function(r){return r.json();})
    .then(function(d){
      AR_DATA=d.surahs;
      arRender();
    })
    .catch(function(e){console.warn('quranMemory.json failed',e);});
})();


var arRevealed=false;


setTimeout(function(){arRender();},800);

// ── AYAH COMPLETION ──
var AC_DATA = null;
var acState = JSON.parse(localStorage.getItem('dash_ac') || '{}');
var _acFont=localStorage.getItem('ac_font')||'scheherazade';


// Reuse quranMemory.json — loaded by ayah recall if that card exists, else fetch again
(function(){
  if(window.AR_DATA){AC_DATA=window.AR_DATA;acRender();return;}
  fetch('quranMemory.json')
    .then(function(r){return r.json();})
    .then(function(d){AC_DATA=d.surahs;acRender();})
    .catch(function(e){console.warn('quranMemory.json failed',e);});
})();


var acAnswered=false;
var acCurrentCard=null;
var acCurrentOpts=null;


setTimeout(function(){acRender();},900);

// ── AUTO-PROMOTE: if all ayahs in a learning surah are known, promote to memorized ──
function qmCheckAutoPromote(surahNum){
  if(!smState||!smState.surah)return;
  if(smState.surah[String(surahNum)]!=='learning')return; // only promote learning surahs
  var data=window.AR_DATA||window.SM_DATA;
  if(!data)return;
  var surah=data.find(function(s){return s.n===surahNum;});
  if(!surah)return;
  // Check if ALL ayahs are known in arState
  if(!arState||!arState.known)return;
  var allKnown=surah.ayahs.every(function(_,i){
    return !!arState.known[surahNum+'_'+(i+1)];
  });
  if(!allKnown)return;
  // Promote!
  smState.surah[String(surahNum)]='memorized';
  smSave();
  if(typeof smRender==='function')setTimeout(smRender,50);
  // Show toast
  var sName=surah.name||('Surah '+surahNum);
  if(typeof showToast==='function')showToast('\u2605 '+sName+' promoted to Memorized!');
  // Sync to Juz Amma
  if(typeof qmSyncSurahState==='function')qmSyncSurahState(surahNum,'memorized');
}

// ── SURAH MAP ──
var SM_DATA = null;
var smState = JSON.parse(localStorage.getItem('dash_sm') || '{}');

// ── QURAN MEMORY SYNC ──
// Central function: keeps Surah Map, Ayah Recall, Ayah Completion and Juz Amma in sync
function qmSync(surahNum, ayahIdx, status){
  // status: 'memorized'|'reviewing'|'struggling'|null
  // Update Surah Map
  if(typeof smState!=='undefined'){
    if(!smState.status)smState.status={};
    var key=surahNum+'_'+ayahIdx;
    if(status==='memorized')smState.status[key]='memorized';
    else if(status==='reviewing')smState.status[key]='reviewing';
    else if(status==='struggling')smState.status[key]='revision'; // show as red in map
    else delete smState.status[key];
    smSave();
  }
}

function qmSyncSurahState(surahNum, newState){
  // newState: 'learning' | 'memorized' | 'revision' | null
  if(!window.AR_DATA&&!window.SM_DATA)return;
  var data=window.AR_DATA||window.SM_DATA;
  var surah=data.find(function(s){return s.n===surahNum;});
  if(!surah)return;

  surah.ayahs.forEach(function(_,i){
    var k=surahNum+'_'+(i+1);

    if(newState==='memorized'){
      // Mark as fully known in all cards
      qmSync(surahNum,i+1,'memorized');
      if(typeof arState!=='undefined'){if(!arState.known)arState.known={};arState.known[k]=true;}
      if(typeof acState!=='undefined'){if(!acState.correct)acState.correct={};acState.correct[k]=true;}
    } else if(newState==='revision'){
      // Clear SRS cooldown so ayahs come back immediately
      if(typeof arState!=='undefined'){
        if(arState.nextReview)delete arState.nextReview[k];
        if(arState.streaks)arState.streaks[k]=0;
      }
      if(typeof acState!=='undefined'){
        if(acState.nextReview)delete acState.nextReview[k];
        if(acState.streaks)acState.streaks[k]=0;
      }
      qmSync(surahNum,i+1,'revision');
    } else if(newState==='learning'){
      // Just make eligible — don't mark as known, don't touch existing progress
      qmSync(surahNum,i+1,null);
    } else {
      // Not started — remove from map
      qmSync(surahNum,i+1,null);
    }
  });

  // Juz Amma sync — only for memorized
  if(typeof jmData!=='undefined'){
    if(newState==='memorized'){
      jmData[surahNum]={status:'done',date:new Date().toISOString().slice(0,10)};
    } else if(newState===null&&jmData[surahNum]&&jmData[surahNum].status==='done'){
      jmData[surahNum]={status:'todo'};
    }
    if(typeof jmSave==='function')jmSave();
  }

  // Rebuild today's queue in both cards so changes take effect immediately
  if(typeof arState!=='undefined'){arState.todayDate=null;} // force rebuild next render
  if(typeof acState!=='undefined'){acState.todayDate=null;}

  // Save & re-render
  if(typeof arSave==='function')arSave();
  if(typeof acSave==='function')acSave();
  if(typeof smSave==='function')smSave();
  if(typeof arRender==='function')setTimeout(arRender,50);
  if(typeof acRender==='function')setTimeout(acRender,100);
  if(typeof smRender==='function')smRender();
}

// Legacy wrapper used by jmMarkDone/jmCycle
function qmSyncSurahMemorized(surahNum, memorized){
  qmSyncSurahState(surahNum, memorized?'memorized':null);
}

(function(){
  if(window.AR_DATA){SM_DATA=window.AR_DATA;smRender();return;}
  fetch('quranMemory.json')
    .then(function(r){return r.json();})
    .then(function(d){SM_DATA=d.surahs;smRender();})
    .catch(function(e){console.warn('quranMemory.json failed',e);});
})();

// Status per ayah: 'memorized' | 'reviewing' | 'struggling' | null


setTimeout(function(){smRender();},1000);

// ── VOICE STUDY ──
var VS_DATA = null;
var vsState = JSON.parse(localStorage.getItem('dash_vs') || '{}');


(function(){
  fetch('voiceStudy.json')
    .then(function(r){return r.json();})
    .then(function(d){VS_DATA=d;vsRender();})
    .catch(function(e){console.warn('voiceStudy.json failed',e);});
})();


function vsTodayKey(){
  var n=new Date();if(n.getHours()<4)n=new Date(n.getTime()-864e5);
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}

function vsEnsureDaily(){
  if(!vsState.lastSeen)vsState.lastSeen={};
  if(!vsState.studied)vsState.studied={};
  var today=vsTodayKey();
  if(vsState.todayDate===today)return;
  vsState.todayDate=today;
  vsState.todayNewDone=0;
  vsState.todayReviewDone=0;
  // Build 2 new entries — unseen, in order across all categories
  var allEntries=[];
  if(VS_DATA&&VS_DATA.categories){
    VS_DATA.categories.forEach(function(c){
      c.entries.forEach(function(e){allEntries.push(e);});
    });
  }
  var unseen=allEntries.filter(function(e){return !vsState.studied[e.id];});
  vsState.todayNew=unseen.slice(0,2).map(function(e){return e.id;});
  // Build 1 review — studied at least 7 days ago, random
  var sevenDaysAgo=new Date();sevenDaysAgo.setDate(sevenDaysAgo.getDate()-7);
  var sevenKey=sevenDaysAgo.getFullYear()+'-'+String(sevenDaysAgo.getMonth()+1).padStart(2,'0')+'-'+String(sevenDaysAgo.getDate()).padStart(2,'0');
  var reviewPool=allEntries.filter(function(e){
    return vsState.studied[e.id]&&(vsState.lastSeen[e.id]||'0000-00-00')<=sevenKey;
  });
  if(reviewPool.length>0){
    var ri=Math.floor(Math.random()*reviewPool.length);
    vsState.todayReview=[reviewPool[ri].id];
  } else {
    vsState.todayReview=[];
  }
  vsSave();
}

function vsGetTodayEntry(){
  vsEnsureDaily();
  var s=vsState;
  // First serve new cards
  if((s.todayNewDone||0)<(s.todayNew||[]).length){
    var id=s.todayNew[s.todayNewDone||0];
    if(VS_DATA&&VS_DATA.categories){
      for(var ci=0;ci<VS_DATA.categories.length;ci++){
        var e=VS_DATA.categories[ci].entries.find(function(x){return x.id===id;});
        if(e)return {entry:e,cat:VS_DATA.categories[ci],type:'new'};
      }
    }
  }
  // Then serve review
  if((s.todayReviewDone||0)<(s.todayReview||[]).length){
    var rid=s.todayReview[s.todayReviewDone||0];
    if(VS_DATA&&VS_DATA.categories){
      for(var ci2=0;ci2<VS_DATA.categories.length;ci2++){
        var e2=VS_DATA.categories[ci2].entries.find(function(x){return x.id===rid;});
        if(e2)return {entry:e2,cat:VS_DATA.categories[ci2],type:'review'};
      }
    }
  }
  return null; // all done
}

function vsMarkDone(entryId, type){
  if(!vsState.studied)vsState.studied={};
  if(!vsState.lastSeen)vsState.lastSeen={};
  vsState.studied[entryId]=true;
  vsState.lastSeen[entryId]=vsTodayKey();
  if(type==='new')vsState.todayNewDone=(vsState.todayNewDone||0)+1;
  else if(type==='review')vsState.todayReviewDone=(vsState.todayReviewDone||0)+1;
  vsSave();
}


setTimeout(function(){vsRender();},1100);

// ── ARTICULATE ──
var ART_DATA = null;
var artState = JSON.parse(localStorage.getItem('dash_art') || '{}');


(function(){
  fetch('articulate.json')
    .then(function(r){return r.json();})
    .then(function(d){ART_DATA=d;artRender();})
    .catch(function(e){console.warn('articulate.json failed',e);});
})();


function artTodayKey(){
  var n=new Date();if(n.getHours()<4)n=new Date(n.getTime()-864e5);
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}

function artEnsureDaily(){
  if(!artState.lastSeen)artState.lastSeen={};
  if(!artState.studied)artState.studied={};
  var today=artTodayKey();
  if(artState.todayDate===today)return;
  artState.todayDate=today;
  artState.todayNewDone=0;
  artState.todayReviewDone=0;
  // Build 2 new entries — unseen, in order across all categories
  var allEntries=[];
  if(ART_DATA&&ART_DATA.categories){
    ART_DATA.categories.forEach(function(c){
      c.entries.forEach(function(e){allEntries.push(e);});
    });
  }
  var unseen=allEntries.filter(function(e){return !artState.studied[e.id];});
  artState.todayNew=unseen.slice(0,2).map(function(e){return e.id;});
  // Build 1 review — studied at least 7 days ago, random
  var sevenDaysAgo=new Date();sevenDaysAgo.setDate(sevenDaysAgo.getDate()-7);
  var sevenKey=sevenDaysAgo.getFullYear()+'-'+String(sevenDaysAgo.getMonth()+1).padStart(2,'0')+'-'+String(sevenDaysAgo.getDate()).padStart(2,'0');
  var reviewPool=allEntries.filter(function(e){
    return artState.studied[e.id]&&(artState.lastSeen[e.id]||'0000-00-00')<=sevenKey;
  });
  if(reviewPool.length>0){
    var ri=Math.floor(Math.random()*reviewPool.length);
    artState.todayReview=[reviewPool[ri].id];
  } else {
    artState.todayReview=[];
  }
  artSave();
}

function artGetTodayEntry(){
  artEnsureDaily();
  var s=artState;
  // First serve new cards
  if((s.todayNewDone||0)<(s.todayNew||[]).length){
    var id=s.todayNew[s.todayNewDone||0];
    if(ART_DATA&&ART_DATA.categories){
      for(var ci=0;ci<ART_DATA.categories.length;ci++){
        var e=ART_DATA.categories[ci].entries.find(function(x){return x.id===id;});
        if(e)return {entry:e,cat:ART_DATA.categories[ci],type:'new'};
      }
    }
  }
  // Then serve review
  if((s.todayReviewDone||0)<(s.todayReview||[]).length){
    var rid=s.todayReview[s.todayReviewDone||0];
    if(ART_DATA&&ART_DATA.categories){
      for(var ci2=0;ci2<ART_DATA.categories.length;ci2++){
        var e2=ART_DATA.categories[ci2].entries.find(function(x){return x.id===rid;});
        if(e2)return {entry:e2,cat:ART_DATA.categories[ci2],type:'review'};
      }
    }
  }
  return null; // all done
}

function artMarkDone(entryId, type){
  if(!artState.studied)artState.studied={};
  if(!artState.lastSeen)artState.lastSeen={};
  artState.studied[entryId]=true;
  artState.lastSeen[entryId]=artTodayKey();
  if(type==='new')artState.todayNewDone=(artState.todayNewDone||0)+1;
  else if(type==='review')artState.todayReviewDone=(artState.todayReviewDone||0)+1;
  artSave();
}


setTimeout(function(){artRender();},1200);

// ── FOCUS MODES ──
var FOCUS_MODES = [
  {
    id: 'islam',
    icon: '🕌',
    label: 'Islam',
    color: '#ffcc00',
    desc: 'Dhikr, Quran, duas, Islamic study',
    cards: [
      {id:'dua-card',       render:'duaRender',          body:'dua-body'},
      {id:'juz-amma',       render:'juaRender',          body:'jua-body'},
      {id:'quran-cards',    render:'qcRenderStudy',      body:'qc-panel-study'},
      {id:'quran-words',    render:'qwRenderStudy',      body:'qw-body'},
      {id:'ayah-recall',    render:'arRender',           body:'ar-body'},
      {id:'ayah-completion',render:'acRender',           body:'ac-body'},
      {id:'surah-map',      render:'smRender',           body:'sm-body'},
      {id:'islamic-topics', render:'itRender',           body:'it-body'},
      {id:'for-akhira',     render:'akhiraRenderDhikr',  body:'akhira-panel-dhikr'},
      {id:'prayer-tracker', render:'ptRenderToday',      body:'pt-focus-panel'}
    ]
  },
  {
    id: 'night',
    icon: '🌙',
    label: 'Night Wind-Down',
    color: '#bd93f9',
    desc: 'Reflect, release, review the day',
    cards: [
      {id:'gratitude-log',  render:'gratRenderLog',      body:'grat-panel-log'},
      {id:'mood-log',       render:'moodRender',         body:'ml-panel-log'},
      {id:'stress-demess',  render:'stressRender',       body:'stress-body'},
      {id:'reframe',        render:'rfRender',           body:'reframe-body'},
      {id:'shadow-log',     render:'shadowRender',       body:'shadow-body'},
      {id:'legacy-letter',  render:'legacyRender',       body:'legacy-body'},
      {id:'weekly-review',  render:'wrRenderWrite',      body:'wr-panel-write'},
      {id:'goals',          render:'renderGoals',        body:'goal-active-panel'}
    ]
  },
  {
    id: 'learning',
    icon: '📚',
    label: 'Hobby Learning',
    color: '#50fa7b',
    desc: 'Voice study, articulate, reading',
    cards: [
      {id:'voice-study',    render:'vsRender',           body:'vs-body'},
      {id:'articulate',     render:'artRender',          body:'art-body'},
      {id:'quran-words',    render:'qwRenderStudy',      body:'qw-body'},
      {id:'quran-cards',    render:'qcRenderStudy',      body:'qc-panel-study'},
      {id:'books',          render:'renderBooks',        body:'books-body'},
      {id:'writing-log',    render:'writeRender',        body:'writing-body'},
      {id:'writers-den',    render:'wdRender',           body:'wd-body'}
    ]
  }
];

var _modeSession = null;


function _modeRestoreCard(s){
  // Put the body element back where it belongs
  if(s.origEl && s.origParent){
    // Reset max-height constraints we might have set
    s.origEl.style.maxHeight='';
    s.origEl.style.overflowY='';
    s.origParent.appendChild(s.origEl);
  }
}


// ── END OF dashboard-3.js ──

// -- PEOPLE I WANT TO BECOME --
var peopleData=JSON.parse(localStorage.getItem('dash_people')||'[]');
function peopleSave(){localStorage.setItem('dash_people',JSON.stringify(peopleData));}
function peopleRender(){
  var el=document.getElementById('people-body');
  if(!el)return;
  var h='';
  h+='<div style="font-size:11px;color:rgba(245,166,35,.6);line-height:1.6;margin-bottom:10px;font-style:italic">Not inspiration. Study. Who are they, what do you admire, and how does it translate to a real behavior?</div>';
  var adding=window._peopleAdding;
  if(!adding){
    h+='<button id="people-add-btn" style="width:100%;padding:9px;background:rgba(245,166,35,.06);border:1px solid rgba(245,166,35,.25);color:#f5a623;font-family:monospace;font-size:12px;cursor:pointer;letter-spacing:1px;margin-bottom:10px">+ ADD PERSON</button>';
  } else {
    h+='<div style="padding:10px;background:rgba(245,166,35,.04);border:1px solid rgba(245,166,35,.15);margin-bottom:10px">';
    h+='<input id="people-name" placeholder="Name..." style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(245,166,35,.2);color:var(--text);font-family:monospace;font-size:13px;padding:4px 2px;outline:none;box-sizing:border-box;margin-bottom:8px">';
    h+='<textarea id="people-admire" placeholder="What specifically do you admire?" style="width:100%;min-height:52px;background:transparent;border:none;border-bottom:1px solid rgba(245,166,35,.15);color:var(--text);font-family:monospace;font-size:12px;padding:4px 0;outline:none;resize:none;box-sizing:border-box;line-height:1.6;margin-bottom:8px"></textarea>';
    h+='<textarea id="people-behavior" placeholder="What concrete behavior does this translate to for you?" style="width:100%;min-height:52px;background:transparent;border:none;border-bottom:1px solid rgba(245,166,35,.15);color:var(--text);font-family:monospace;font-size:12px;padding:4px 0;outline:none;resize:none;box-sizing:border-box;line-height:1.6;margin-bottom:8px"></textarea>';
    h+='<div style="display:flex;gap:6px"><button id="people-save" style="flex:1;padding:8px;background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.3);color:#f5a623;font-family:monospace;font-size:11px;cursor:pointer">SAVE</button><button id="people-cancel" style="padding:8px 14px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;font-size:11px;cursor:pointer">CANCEL</button></div>';
    h+='</div>';
  }
  if(!peopleData.length&&!adding){h+='<div style="color:var(--dim);font-size:11px;opacity:.5;line-height:1.8">No one yet. Think carefully.</div>';}
  peopleData.forEach(function(p,i){
    var expanded=window['_peopleOpen_'+i];
    h+='<div style="margin-bottom:8px;border:1px solid rgba(245,166,35,'+(expanded?'.2':'.08')+')">';
    h+='<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer" data-peopleexpand="'+i+'"><span style="font-size:18px">&#11088;</span><div style="flex:1"><div style="font-size:13px;color:var(--text);font-weight:600">'+p.name+'</div></div><span style="font-size:10px;color:var(--dim)">'+(expanded?'&#9650;':'&#9660;')+'</span></div>';
    if(expanded){
      h+='<div style="padding:0 12px 12px">';
      if(p.admire)h+='<div style="margin-bottom:8px"><div style="font-size:9px;color:rgba(245,166,35,.6);letter-spacing:1px;margin-bottom:3px">WHAT I ADMIRE</div><div style="font-size:12px;color:var(--text);line-height:1.6">'+p.admire+'</div></div>';
      if(p.behavior)h+='<div style="margin-bottom:8px"><div style="font-size:9px;color:rgba(245,166,35,.6);letter-spacing:1px;margin-bottom:3px">HOW I APPLY IT</div><div style="font-size:12px;color:var(--text);line-height:1.6">'+p.behavior+'</div></div>';
      h+='<div style="display:flex;gap:6px"><button data-peopleedit="'+i+'" style="font-size:9px;padding:3px 10px;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--dim);font-family:monospace;cursor:pointer">EDIT</button><button data-peopledel="'+i+'" style="font-size:9px;padding:3px 10px;background:transparent;border:1px solid rgba(255,68,68,.25);color:var(--cr);font-family:monospace;cursor:pointer">REMOVE</button></div>';
      h+='</div>';
    }
    h+='</div>';
  });
  el.innerHTML=h;
  var addBtn=document.getElementById('people-add-btn');
  if(addBtn)addBtn.onclick=function(){window._peopleAdding=true;if(typeof hap==='function')hap(HAP.save);peopleRender();setTimeout(function(){var n=document.getElementById('people-name');if(n)n.focus();},50);};
  var cancelBtn=document.getElementById('people-cancel');
  if(cancelBtn)cancelBtn.onclick=function(){window._peopleAdding=false;if(typeof hap==='function')hap(HAP.save);peopleRender();};
  var saveBtn=document.getElementById('people-save');
  if(saveBtn)saveBtn.onclick=function(){
    var name=document.getElementById('people-name');var admire=document.getElementById('people-admire');var behavior=document.getElementById('people-behavior');
    if(!name||!name.value.trim())return;
    peopleData.push({name:name.value.trim(),admire:admire?admire.value.trim():'',behavior:behavior?behavior.value.trim():'',ts:Date.now()});
    peopleSave();window._peopleAdding=false;if(typeof hap==='function')hap(HAP.save);peopleRender();
    if(typeof showToast==='function')showToast('Added');
  };
  el.querySelectorAll('[data-peopleexpand]').forEach(function(btn){btn.onclick=function(){var i=parseInt(this.dataset.peopleexpand);window['_peopleOpen_'+i]=!window['_peopleOpen_'+i];if(typeof hap==='function')hap(HAP.save);peopleRender();};});
  el.querySelectorAll('[data-peopledel]').forEach(function(btn){btn.onclick=function(){var i=parseInt(this.dataset.peopledel);if(!confirm('Remove?'))return;peopleData.splice(i,1);peopleSave();if(typeof hap==='function')hap(HAP.save);peopleRender();};});
  el.querySelectorAll('[data-peopleedit]').forEach(function(btn){btn.onclick=function(){var i=parseInt(this.dataset.peopleedit);var p=peopleData[i];var n=prompt('Name:',p.name);if(n===null)return;var a=prompt('What do you admire?',p.admire);if(a===null)return;var b=prompt('How do you apply it?',p.behavior);if(b===null)return;p.name=n.trim()||p.name;p.admire=a.trim();p.behavior=b.trim();peopleSave();if(typeof hap==='function')hap(HAP.save);peopleRender();};});
}
setTimeout(function(){peopleRender();},800);

// -- CREATIVE WRITING LOG --
var writeData=JSON.parse(localStorage.getItem('dash_write_log')||'[]');
function writeSave(){localStorage.setItem('dash_write_log',JSON.stringify(writeData));}
function writeRender(){
  var el=document.getElementById('writing-body');
  var badge=document.getElementById('write-streak-badge');
  if(!el)return;
  var _cn=new Date();if(_cn.getHours()<4)_cn=new Date(_cn.getTime()-864e5);
  var today=_cn.getFullYear()+'-'+String(_cn.getMonth()+1).padStart(2,'0')+'-'+String(_cn.getDate()).padStart(2,'0');
  var todayEntry=writeData.find(function(e){return e.date===today;});
  var streak=0;var d=new Date();
  while(true){var dk=d.toISOString().slice(0,10);if(writeData.find(function(e){return e.date===dk;})){streak++;d.setDate(d.getDate()-1);}else break;}
  if(badge){if(streak>0){badge.textContent=streak+'d';badge.style.display='';}else badge.style.display='none';}
  var h='';
  if(!todayEntry){
    h+='<div style="font-size:11px;color:rgba(191,95,255,.6);margin-bottom:10px;font-style:italic">You wrote today. Log it.</div>';
    h+='<div style="display:flex;gap:8px;margin-bottom:8px">';
    h+='<input id="write-words" type="number" min="1" placeholder="words" style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(191,95,255,.2);color:var(--text);font-family:monospace;font-size:13px;padding:4px 2px;outline:none">';
    h+='<input id="write-mins" type="number" min="1" placeholder="mins" style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(191,95,255,.2);color:var(--text);font-family:monospace;font-size:13px;padding:4px 2px;outline:none">';
    h+='</div>';
    h+='<input id="write-note" placeholder="what did you write? (optional)" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(191,95,255,.15);color:var(--text);font-family:monospace;font-size:12px;padding:4px 2px;outline:none;box-sizing:border-box;margin-bottom:10px">';
    h+='<div style="display:flex;gap:6px">';
    h+='<button id="write-log-btn" style="flex:1;padding:10px;background:rgba(191,95,255,.06);border:1px solid rgba(191,95,255,.3);color:#bf5fff;font-family:VT323,monospace;font-size:18px;cursor:pointer;letter-spacing:2px">I WROTE TODAY &#10003;</button>';
    h+='<a href="https://glyph-istan-2a3684.netlify.app/" target="_blank" style="display:flex;align-items:center;justify-content:center;padding:0 14px;background:rgba(191,95,255,.04);border:1px solid rgba(191,95,255,.2);color:#bf5fff;font-family:VT323,monospace;font-size:13px;text-decoration:none;white-space:nowrap;cursor:pointer;letter-spacing:1px">GLYPHWRITER &#8599;</a>';
    h+='</div>';
  } else {
    h+='<div style="padding:10px;background:rgba(191,95,255,.06);border-left:2px solid #bf5fff;margin-bottom:12px">';
    h+='<div style="font-size:10px;color:#bf5fff;margin-bottom:4px">&#10003; Logged today</div>';
    if(todayEntry.words)h+='<div style="font-size:13px;color:var(--text)">'+todayEntry.words.toLocaleString()+' words</div>';
    if(todayEntry.mins)h+='<div style="font-size:12px;color:var(--dim)">'+todayEntry.mins+'m</div>';
    if(todayEntry.note)h+='<div style="font-size:11px;color:var(--dim);margin-top:4px;font-style:italic">'+todayEntry.note+'</div>';
    h+='<button data-writeedit="1" style="font-size:9px;margin-top:8px;padding:2px 8px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;cursor:pointer">edit</button>';
    h+='</div>';
    h+='<a href="https://glyph-istan-2a3684.netlify.app/" target="_blank" style="display:block;text-align:center;padding:8px;background:rgba(191,95,255,.04);border:1px solid rgba(191,95,255,.2);color:#bf5fff;font-family:VT323,monospace;font-size:13px;text-decoration:none;margin-bottom:10px;letter-spacing:1px">GLYPHWRITER &#8599;</a>';
  }
  if(writeData.length){
    var totalWords=writeData.reduce(function(a,e){return a+(e.words||0);},0);
    h+='<div style="display:flex;gap:12px;margin-bottom:10px;padding:8px;background:rgba(191,95,255,.04);border:1px solid rgba(191,95,255,.1)">';
    h+='<div style="text-align:center;flex:1"><div style="font-size:18px;color:#bf5fff;font-family:VT323,monospace">'+writeData.length+'</div><div style="font-size:9px;color:var(--dim)">sessions</div></div>';
    if(totalWords)h+='<div style="text-align:center;flex:1"><div style="font-size:18px;color:#bf5fff;font-family:VT323,monospace">'+totalWords.toLocaleString()+'</div><div style="font-size:9px;color:var(--dim)">words</div></div>';
    if(streak)h+='<div style="text-align:center;flex:1"><div style="font-size:18px;color:#bf5fff;font-family:VT323,monospace">'+streak+'</div><div style="font-size:9px;color:var(--dim)">streak</div></div>';
    h+='</div>';
    h+='<div style="border-top:1px solid rgba(255,255,255,.06);padding-top:8px">';
    writeData.slice(0,30).forEach(function(e,i){
      h+='<div style="display:flex;align-items:baseline;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
      h+='<span style="font-size:10px;color:rgba(255,255,255,.25);flex-shrink:0">'+e.date+'</span>';
      var parts=[];if(e.words)parts.push(e.words.toLocaleString()+' words');if(e.mins)parts.push(e.mins+'m');
      h+='<span style="font-size:12px;color:'+(i===0?'#bf5fff':'var(--dim)')+'">'+( parts.length?parts.join(' � '):'wrote')+'</span>';
      if(e.note)h+='<span style="font-size:10px;color:rgba(255,255,255,.3);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\u2014 '+e.note+'</span>';
      h+='</div>';
    });
    h+='</div>';
  }
  el.innerHTML=h;
  var logBtn=document.getElementById('write-log-btn');
  if(logBtn)logBtn.onclick=function(e){
    var words=parseInt(document.getElementById('write-words').value)||0;
    var mins=parseInt(document.getElementById('write-mins').value)||0;
    var note=(document.getElementById('write-note').value||'').trim();
    writeData=writeData.filter(function(x){return x.date!==today;});
    writeData.unshift({date:today,words:words||null,mins:mins||null,note:note||null,ts:Date.now()});
    if(writeData.length>365)writeData=writeData.slice(0,365);
    if(typeof hap==='function')hap(HAP.write);
    writeSave();
    if(typeof confetti==='function'){confetti(e.clientX||window.innerWidth/2,e.clientY||200,'#bf5fff');setTimeout(function(){confetti(e.clientX||window.innerWidth/2,e.clientY||200,'#9b6fff');},150);}
    writeRender();
  };
  el.querySelectorAll('[data-writeedit]').forEach(function(btn){btn.onclick=function(){writeData=writeData.filter(function(x){return x.date!==today;});writeSave();writeRender();};});
}
setTimeout(function(){writeRender();},850);

// -- STRESS DEMESS --
var stressData=JSON.parse(localStorage.getItem('dash_stress_demess')||'{"log":[]}');
function stressSave(){localStorage.setItem('dash_stress_demess',JSON.stringify(stressData));}
var STRESS_MENU=[
  {id:'privacy',label:'Need privacy / retreat',icon:'\uD83D\uDEAA',tools:['Sit in the car alone. No phone.','Bathroom door locked. Breathe slowly.','Step outside and stand in silence.','Headphones on. Eyes closed. One song.']},
  {id:'soothe',label:'Need soothing sensation',icon:'\u2744',tools:['Hot tea or flavored zero-cal drink.','Crushed ice or sparkling water.','Very cold water, slowly.','Sugar-free gum. Chew slowly.']},
  {id:'release',label:'Need emotional release',icon:'\uD83D\uDCDD',tools:['Write every worry uncensored for 3 minutes. Then delete it.','Voice memo rant. Private.','Squeeze a towel or pillow. Hard.','20 slow exhales. Count them.']},
  {id:'reward',label:'Need reward / treat feeling',icon:'\u2615',tools:['Fancy decaf or herbal tea in your favorite mug.','One measured portion, not an impulse binge.','Watch one saved funny clip. Intentionally.','Zero-cal sparkling drink in a nice glass.']},
  {id:'downshift',label:'Need nervous system downshift',icon:'\uD83E\uDDE0',tools:['10 physiological sighs: double inhale, long slow exhale.','Splash cold water on your face.','Relax jaw. Drop shoulders. Consciously.','60 seconds staring out a window. Nothing else.']},
];
var STRESS_QUOTES=['What you crave is often not the thing itself, but the feeling you expect it to give.','You do not want dessert. You want relief.','Discipline is choosing what you want most over what you want now.','The craving is not the problem. The craving is information.','Delay, do not deny. 10 minutes first.','You almost never feel good after. That is the data.','Your nervous system wants comfort, not sugar.','State change is what helps. Not the thing itself.'];
function stressRender(){
  var el=document.getElementById('stress-body');if(!el)return;
  var tab=window._stressTab||'menu';var h='';
  h+='<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">';
  [{t:'menu',l:'\uD83C\uDF1A MENU'},{t:'rule',l:'\u23F0 THE RULE'},{t:'log',l:'\uD83D\uDCCB LOG'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-stresstab="'+x.t+'" style="font-size:9px;padding:4px 12px;border:1px solid '+(a?'rgba(88,232,200,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'#58e8c8':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';
  if(tab==='menu'){
    var q=STRESS_QUOTES[new Date().getDate()%STRESS_QUOTES.length];
    h+='<div style="font-size:11px;color:rgba(88,232,200,.55);font-style:italic;line-height:1.6;margin-bottom:14px;padding:8px;border-left:2px solid rgba(88,232,200,.2)">'+q+'</div>';
    h+='<button id="stress-tap-btn" style="width:100%;padding:12px;background:rgba(88,232,200,.07);border:1px solid rgba(88,232,200,.3);color:#58e8c8;font-family:VT323,monospace;font-size:20px;cursor:pointer;letter-spacing:2px;margin-bottom:14px">I AM OVERWHELMED \u2192</button>';
    STRESS_MENU.forEach(function(cat){
      var open=window['_stressOpen_'+cat.id];
      h+='<div style="margin-bottom:6px;border:1px solid rgba(88,232,200,'+(open?'.15':'.06')+')">';
      h+='<div data-stresscat="'+cat.id+'" style="display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer">';
      h+='<span style="font-size:16px">'+cat.icon+'</span><span style="font-size:11px;color:var(--text);flex:1">'+cat.label+'</span><span style="font-size:10px;color:rgba(88,232,200,.4)">'+(open?'\u25b2':'\u25bc')+'</span></div>';
      if(open){
        h+='<div style="padding:6px 10px 10px 36px">';
        cat.tools.forEach(function(tool,ti){
          h+='<div data-stresstool="'+cat.id+'-'+ti+'" style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer">';
          h+='<span style="color:rgba(88,232,200,.4);font-size:12px;flex-shrink:0">\u25cb</span><span style="font-size:12px;color:var(--dim);line-height:1.5">'+tool+'</span></div>';
        });
        h+='</div>';
      }
      h+='</div>';
    });
  } else if(tab==='rule'){
    h+='<div style="background:rgba(88,232,200,.04);border:1px solid rgba(88,232,200,.15);padding:14px;margin-bottom:12px">';
    h+='<div style="font-size:9px;color:rgba(88,232,200,.6);letter-spacing:2px;margin-bottom:8px">THE BUFFER RULE</div>';
    h+='<div style="font-size:13px;color:var(--text);line-height:1.8">When the craving hits &mdash; do <strong>one 3-minute tool</strong> first. Then decide on dessert after.</div>';
    h+='<div style="font-size:11px;color:var(--dim);margin-top:10px;line-height:1.7">Not never. Just insert a buffer. Often the urge drops.</div></div>';
    h+='<div style="background:rgba(88,232,200,.03);border:1px solid rgba(88,232,200,.1);padding:12px;margin-bottom:12px">';
    h+='<div style="font-size:9px;color:rgba(88,232,200,.6);letter-spacing:2px;margin-bottom:8px">EMERGENCY KIT</div>';
    ['\u2605 Cold sparkling drink','\u2605 Headphones + 1 song alone','\u2605 3 min private sit (car, bathroom, outside)','\u2605 Written note: 10 min first, dessert later if needed'].forEach(function(item){h+='<div style="font-size:12px;color:var(--text);padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">'+item+'</div>';});
    h+='</div>';
    h+='<div style="font-size:10px;color:rgba(255,255,255,.3);line-height:1.7;font-style:italic">The lane widens only by use, not by understanding it.</div>';
  } else {
    var log=stressData.log||[];
    if(!log.length){h+='<div style="color:var(--dim);font-size:11px;padding:10px 0">No sessions logged yet.</div>';}
    else{
      h+='<div style="font-size:9px;color:var(--dim);margin-bottom:10px">'+log.length+' session'+(log.length!==1?'s':'')+' logged</div>';
      log.slice(0,33).forEach(function(e){
        h+='<div style="margin-bottom:8px;padding:8px;background:rgba(88,232,200,.03);border-left:2px solid rgba(88,232,200,'+(e.used?'.35':'.12')+')">';
        h+='<div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:9px;color:rgba(255,255,255,.25)">'+e.date+(e.time?' \xb7 '+e.time:'')+'</span><span style="font-size:9px;color:'+(e.used?'#58e8c8':'var(--dim)')+'">'+(e.used?'\u2713 tool used':'noted')+'</span></div>';
        if(e.tool)h+='<div style="font-size:11px;color:#58e8c8;margin-bottom:2px">'+e.tool+'</div>';
        if(e.note)h+='<div style="font-size:11px;color:var(--dim);font-style:italic">'+e.note+'</div>';
        h+='</div>';
      });
    }
  }
  el.innerHTML=h;
  el.querySelectorAll('[data-stresstab]').forEach(function(b){b.onclick=function(){window._stressTab=this.dataset.stresstab;stressRender();};});
  el.querySelectorAll('[data-stresscat]').forEach(function(b){b.onclick=function(){var id=this.dataset.stresscat;window['_stressOpen_'+id]=!window['_stressOpen_'+id];stressRender();};});
  el.querySelectorAll('[data-stresstool]').forEach(function(b){b.onclick=function(){
    var parts=this.dataset.stresstool.split('-');var cat=STRESS_MENU.find(function(c){return c.id===parts[0];});var tool=cat?cat.tools[parseInt(parts[1])]:'';
    var now=new Date();if(!stressData.log)stressData.log=[];
    stressData.log.unshift({date:now.toISOString().slice(0,10),time:now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),tool:tool,used:true,ts:Date.now()});
    if(stressData.log.length>33)stressData.log=stressData.log.slice(0,33);
    stressSave();this.querySelector('span:first-child').textContent='\u25cf';this.querySelector('span:first-child').style.color='#58e8c8';
    if(typeof hap==='function')hap(HAP.stress);
    if(typeof showToast==='function')showToast('\uD83C\uDF0A Tool noted \u2014 10 min then decide');
  };});
  var tapBtn=document.getElementById('stress-tap-btn');
  if(tapBtn)tapBtn.onclick=function(){
    var now=new Date();if(!stressData.log)stressData.log=[];
    stressData.log.unshift({date:now.toISOString().slice(0,10),time:now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),tool:null,used:false,note:'Overwhelmed \u2014 opened menu',ts:Date.now()});
    if(stressData.log.length>33)stressData.log=stressData.log.slice(0,33);
    stressSave();window._stressOpen_privacy=true;stressRender();
    if(typeof showToast==='function')showToast('\uD83C\uDF0A Pick one tool. 3 minutes.');
  };
}
setTimeout(function(){stressRender();},900);

// -- CALORIE LOG --
var calData=JSON.parse(localStorage.getItem('dash_calories')||'[]');
function calSave(){localStorage.setItem('dash_calories',JSON.stringify(calData));}
function calRender(){
  var el=document.getElementById('calorie-body');if(!el)return;
  var tab=window._calTab||'log';var _cn=new Date();if(_cn.getHours()<4)_cn=new Date(_cn.getTime()-864e5);
  var today=_cn.getFullYear()+'-'+String(_cn.getMonth()+1).padStart(2,'0')+'-'+String(_cn.getDate()).padStart(2,'0');var h='';
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
  [{t:'log',l:'TODAY'},{t:'history',l:'HISTORY'},{t:'export',l:'EXPORT'}].forEach(function(x){var a=tab===x.t;h+='<span data-caltab="'+x.t+'" style="font-size:9px;padding:3px 10px;border:1px solid '+(a?'rgba(245,166,35,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'#f5a623':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';});
  h+='</div>';
  var todayEntries=calData.filter(function(e){return e.date===today;});
  if(tab==='log'){
    h+='<div style="margin-bottom:10px"><input id="cal-inp" placeholder="what did you eat?" autocomplete="off" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(245,166,35,.25);color:var(--text);font-family:monospace;font-size:13px;padding:6px 2px;outline:none;box-sizing:border-box;margin-bottom:8px"><div style="display:flex;gap:6px;margin-bottom:8px"><input id="cal-cal" type="number" min="0" placeholder="calories (optional)" style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(245,166,35,.15);color:var(--text);font-family:monospace;font-size:12px;padding:4px 2px;outline:none"><select id="cal-meal" style="flex:1;background:#12121a;border:1px solid rgba(245,166,35,.15);color:var(--dim);font-family:monospace;font-size:11px;padding:3px;outline:none">';
    ['snack','breakfast','lunch','dinner','drink','other'].forEach(function(m){h+='<option value="'+m+'">'+m+'</option>';});
    h+='</select></div><button id="cal-add-btn" style="width:100%;padding:9px;background:rgba(245,166,35,.07);border:1px solid rgba(245,166,35,.3);color:#f5a623;font-family:VT323,monospace;font-size:18px;cursor:pointer;letter-spacing:2px">LOG IT</button></div>';
    if(todayEntries.length){
      var totalCal=todayEntries.reduce(function(a,e){return a+(e.cal||0);},0);
      h+='<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:6px"><span style="font-size:9px;color:var(--dim)">'+todayEntries.length+' item'+(todayEntries.length!==1?'s':'')+'</span>'+(totalCal?'<span style="font-size:13px;color:#f5a623;font-family:VT323,monospace">'+totalCal+' cal</span>':'')+'</div>';
      todayEntries.slice().reverse().forEach(function(e){var idx=calData.findIndex(function(x){return x.id===e.id;});var isEditing=window._calEdit===e.id;var isPendingDel=window._calDelPending===e.id;if(isEditing){h+='<div style="padding:8px;background:rgba(245,166,35,.05);border:1px solid rgba(245,166,35,.2);margin-bottom:4px">';h+='<input id="cal-edit-food-'+e.id+'" value="'+e.food.replace(/"/g,'&quot;')+'" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(245,166,35,.2);color:var(--text);font-family:monospace;font-size:12px;padding:4px 0;outline:none;box-sizing:border-box;margin-bottom:6px">';h+='<div style="display:flex;gap:6px;margin-bottom:6px">';h+='<input id="cal-edit-cal-'+e.id+'" type="number" value="'+(e.cal||'')+'" placeholder="cal" style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(245,166,35,.15);color:var(--text);font-family:monospace;font-size:12px;padding:3px 0;outline:none">';h+='<select id="cal-edit-meal-'+e.id+'" style="flex:1;background:#12121a;border:1px solid rgba(245,166,35,.15);color:var(--dim);font-family:monospace;font-size:11px;padding:3px;outline:none">';['snack','breakfast','lunch','dinner','drink','other'].forEach(function(m){h+='<option value="'+m+'"'+(e.meal===m?' selected':'')+'>'+m+'</option>';});h+='</select></div>';h+='<div style="display:flex;gap:6px">';h+='<button data-calsave="'+e.id+'" data-calidx="'+idx+'" style="flex:1;padding:6px;background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.3);color:#f5a623;font-family:monospace;font-size:10px;cursor:pointer">SAVE</button>';h+='<button data-caleditcancel="'+e.id+'" style="padding:6px 10px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;font-size:10px;cursor:pointer">CANCEL</button>';h+='</div></div>';}else if(isPendingDel){h+='<div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid rgba(255,68,68,.15);background:rgba(255,68,68,.05)">';h+='<span style="font-size:11px;color:rgba(255,68,68,.8);flex:1">Delete &quot;'+e.food+'&quot;?</span>';h+='<button data-calconfirmdel="'+idx+'" style="font-size:10px;padding:3px 8px;background:rgba(255,68,68,.15);border:1px solid rgba(255,68,68,.4);color:var(--cr);font-family:monospace;cursor:pointer">YES</button>';h+='<button data-calcanceldet="'+e.id+'" style="font-size:10px;padding:3px 8px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;cursor:pointer">NO</button>';h+='</div>';}else{h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04)">';h+='<span style="font-size:9px;color:rgba(255,255,255,.2);flex-shrink:0;min-width:45px">'+e.time+'</span>';h+='<div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--text)">'+e.food+'</div><span style="font-size:9px;color:rgba(245,166,35,.5)">'+e.meal+'</span></div>';h+=(e.cal?'<span style="font-size:12px;color:#f5a623;flex-shrink:0">'+e.cal+'</span>':'');h+='<button data-caledit="'+e.id+'" style="font-size:9px;padding:2px 6px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;cursor:pointer">edit</button>';h+='<button data-caldel="'+e.id+'" style="font-size:10px;color:rgba(255,68,68,.3);cursor:pointer;padding:2px 6px;background:transparent;border:none">x</button>';h+='</div>';}});
    } else {h+='<div style="font-size:11px;color:var(--dim);opacity:.5;padding:8px 0">Nothing logged today.</div>';}
  } else if(tab==='history'){
    var byDate={};calData.forEach(function(e){if(!byDate[e.date])byDate[e.date]=[];byDate[e.date].push(e);});
    var dates=Object.keys(byDate).sort().reverse().slice(0,30);
    if(!dates.length){h+='<div style="font-size:11px;color:var(--dim);opacity:.5;padding:10px 0">No history yet.</div>';}
    dates.forEach(function(dk){var entries=byDate[dk];var total=entries.reduce(function(a,e){return a+(e.cal||0);},0);h+='<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(245,166,35,.15);margin-bottom:4px"><span style="font-size:10px;color:#f5a623;letter-spacing:1px">'+dk+'</span>'+(total?'<span style="font-size:12px;color:#f5a623;font-family:VT323,monospace">'+total+' cal</span>':'')+'</div>';entries.forEach(function(e){h+='<div style="display:flex;gap:8px;padding:4px 0;font-size:11px"><span style="color:rgba(255,255,255,.2);flex-shrink:0;min-width:45px">'+e.time+'</span><span style="color:rgba(245,166,35,.5);flex-shrink:0;min-width:55px">'+e.meal+'</span><span style="color:var(--dim);flex:1">'+e.food+'</span>'+(e.cal?'<span style="color:#f5a623;flex-shrink:0">'+e.cal+'</span>':'')+'</div>';});h+='</div>';});
  } else {
    var period=window._calPeriod||'today';
    h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
    [{t:'today',l:'TODAY'},{t:'week',l:'WEEK'},{t:'month',l:'MONTH'}].forEach(function(x){var a=period===x.t;h+='<span data-calperiod="'+x.t+'" style="font-size:9px;padding:3px 8px;border:1px solid '+(a?'rgba(245,166,35,.4)':'rgba(255,255,255,.1)')+';color:'+(a?'#f5a623':'var(--dim)')+';cursor:pointer">'+x.l+'</span>';});
    h+='</div>';
    var now=new Date();var filtered=calData.filter(function(e){var d=new Date(e.date+'T12:00:00');if(period==='today')return e.date===today;if(period==='week')return (now-d)/(864e5)<=7;return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
    if(!filtered.length){h+='<div style="font-size:11px;color:var(--dim);padding:10px 0">No entries for this period.</div>';}
    else{
      var byD={};filtered.forEach(function(e){if(!byD[e.date])byD[e.date]=[];byD[e.date].push(e);});
      var lines=['Please estimate calories for each item and give me a daily total.\n'];
      Object.keys(byD).sort().forEach(function(dk){lines.push('DATE: '+dk);byD[dk].forEach(function(e){var l='  ['+e.time+'] '+e.meal.toUpperCase()+': '+e.food;if(e.cal)l+=' ('+e.cal+' cal noted)';lines.push(l);});lines.push('');});
      var exportText=lines.join('\n');
      h+='<div style="font-size:9px;color:var(--dim);margin-bottom:6px">PASTE INTO ANY AI FOR CALORIE ESTIMATES</div>';
      h+='<textarea id="cal-export" readonly style="width:100%;min-height:160px;background:rgba(245,166,35,.03);border:1px solid rgba(245,166,35,.15);color:var(--dim);font-family:monospace;font-size:10px;padding:8px;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6">'+exportText+'</textarea>';
      h+='<button id="cal-copy" style="width:100%;margin-top:6px;padding:8px;background:rgba(245,166,35,.07);border:1px solid rgba(245,166,35,.3);color:#f5a623;font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">COPY TO CLIPBOARD</button>';
    }
  }
  el.innerHTML=h;
  // Meal type pills — replace select with pill buttons post-render
  var _calSel=el.querySelector('#cal-meal');
  if(_calSel){
    _calSel.style.display='none';
    if(!window._calMealType)window._calMealType=_calSel.value||'snack';
    var _pillWrap=document.createElement('div');
    _pillWrap.style.cssText='display:flex;gap:4px;flex-wrap:wrap;flex:1';
    ['snack','breakfast','lunch','dinner','drink','other'].forEach(function(m){
      var p=document.createElement('span');
      p.textContent=m[0].toUpperCase()+m.slice(1);
      var act=(window._calMealType||'snack')===m;
      p.style.cssText='padding:3px 9px;font-size:9px;cursor:pointer;font-family:monospace;border:1px solid '+(act?'rgba(245,166,35,.6)':'rgba(245,166,35,.15)')+';background:'+(act?'rgba(245,166,35,.15)':'transparent')+';color:'+(act?'#f5a623':'var(--dim)');
      p.onclick=function(){
        window._calMealType=m;
        var s=el.querySelector('#cal-meal');if(s)s.value=m;
        _pillWrap.querySelectorAll('span').forEach(function(pp){
          var a=pp.textContent.toLowerCase()===m;
          pp.style.borderColor=a?'rgba(245,166,35,.6)':'rgba(245,166,35,.15)';
          pp.style.background=a?'rgba(245,166,35,.15)':'transparent';
          pp.style.color=a?'#f5a623':'var(--dim)';
        });
      };
      _pillWrap.appendChild(p);
    });
    _calSel.parentNode.insertBefore(_pillWrap,_calSel);
  }
  el.querySelectorAll('[data-caltab]').forEach(function(b){b.onclick=function(){window._calTab=this.dataset.caltab;calRender();};});
  el.querySelectorAll('[data-calperiod]').forEach(function(b){b.onclick=function(){window._calPeriod=this.dataset.calperiod;calRender();};});
  el.querySelectorAll('[data-caledit]').forEach(function(b){b.onclick=function(){window._calEdit=this.dataset.caledit;window._calDelPending=null;calRender();};});
  el.querySelectorAll('[data-caleditcancel]').forEach(function(b){b.onclick=function(){window._calEdit=null;calRender();};});
  el.querySelectorAll('[data-calsave]').forEach(function(b){b.onclick=function(){var eid=this.dataset.caledit||this.dataset.calsave;var idx2=parseInt(this.dataset.calidx);if(isNaN(idx2)||!calData[idx2])return;var foodEl=document.getElementById('cal-edit-food-'+eid);var calEl=document.getElementById('cal-edit-cal-'+eid);var mealEl=document.getElementById('cal-edit-meal-'+eid);if(foodEl&&foodEl.value.trim())calData[idx2].food=foodEl.value.trim();if(calEl)calData[idx2].cal=parseInt(calEl.value)||null;if(mealEl)calData[idx2].meal=mealEl.value||calData[idx2].meal;calSave();window._calEdit=null;calRender();if(typeof showToast==='function')showToast('Updated');};});
  el.querySelectorAll('[data-caldel]').forEach(function(b){b.onclick=function(){window._calDelPending=this.dataset.caldel;window._calEdit=null;calRender();};});
  el.querySelectorAll('[data-calconfirmdel]').forEach(function(b){b.onclick=function(){calData.splice(parseInt(this.dataset.calconfirmdel),1);window._calDelPending=null;calSave();calRender();};});
  el.querySelectorAll('[data-calcanceldet]').forEach(function(b){b.onclick=function(){window._calDelPending=null;calRender();};});
  var addBtn=document.getElementById('cal-add-btn');var inp=document.getElementById('cal-inp');
  function doAdd(){if(!inp||!inp.value.trim())return;var c=parseInt(document.getElementById('cal-cal').value)||null;var m=document.getElementById('cal-meal').value||'snack';var n=new Date();calData.unshift({id:String(Date.now()),date:n.toISOString().slice(0,10),time:n.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),food:inp.value.trim(),cal:c,meal:m,ts:Date.now()});if(calData.length>500)calData=calData.slice(0,500);calSave();inp.value='';document.getElementById('cal-cal').value='';calRender();if(typeof showToast==='function')showToast('Logged');}
  if(addBtn)addBtn.onclick=doAdd;
  if(inp)inp.onkeydown=function(e){if(e.keyCode===13)doAdd();};
  var copy=document.getElementById('cal-copy');
  if(copy)copy.onclick=function(){var ta=document.getElementById('cal-export');if(!ta)return;if(navigator.clipboard)navigator.clipboard.writeText(ta.value).then(function(){if(typeof showToast==='function')showToast('Copied!');});else{ta.select();document.execCommand('copy');if(typeof showToast==='function')showToast('Copied!');}};
}
setTimeout(function(){calRender();},1000);

// ── QURAN WORDS ──
var QW_CARDS=[];
(function(){
  fetch('quranWords.json?v='+Date.now())
    .then(function(r){return r.json();})
    .then(function(data){
      // Convert {1:{category,question,options,correct_answer},...} to card array
      QW_CARDS=Object.keys(data).map(function(k){
        var v=data[k];
        return {
          id:'qw_'+k,
          cat:v.category,
          q:v.question,
          a:v.correct_answer,
          wrong:v.options.filter(function(o){return o!==v.correct_answer;})
        };
      });
      qwRenderStudy();
    })
    .catch(function(e){console.warn('quranWords.json failed to load',e);});
})()

var qwState=JSON.parse(localStorage.getItem('dash_qw')||'{}');
var _qwFont=localStorage.getItem('qw_font')||'scheherazade'; // persists locally
function qwSave(){localStorage.setItem('dash_qw',JSON.stringify(qwState));}

function qwTodayKey(){
  var n=new Date();if(n.getHours()<6)n=new Date(n.getTime()-864e5);
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}

function qwEnsureState(){
  if(!qwState.seen)qwState.seen={};
  if(!qwState.wrong)qwState.wrong=[];
  if(!qwState.history)qwState.history=[];
  if(!qwState.queue)qwState.queue=[];
  if(!qwState.correct)qwState.correct=[];
  if(!qwState.streaks)qwState.streaks={};
  if(!qwState.nextReview)qwState.nextReview={};
  if(qwState.todayDate!==qwTodayKey()){
    qwState.todayDate=qwTodayKey();
    qwState.todayCount=0;
    qwState.todayNewCount=0;
    qwState.todayReviewCount=0;
    qwState.wrong.forEach(function(id){if(qwState.queue.indexOf(id)<0)qwState.queue.push(id);});
    var todayKey2=qwTodayKey();
    var pool=qwState.correct.filter(function(id){
      if(qwState.wrong.indexOf(id)>=0)return false;
      var nr=qwState.nextReview&&qwState.nextReview[id];
      if(nr&&nr>todayKey2)return false;
      return true;
    });
    for(var si=pool.length-1;si>0;si--){var sj=Math.floor(Math.random()*(si+1));var st=pool[si];pool[si]=pool[sj];pool[sj]=st;}
    qwState.todayReviewQueue=pool.slice(0,3+Math.floor(Math.random()*3));
  }
  if(!qwState.todayReviewQueue)qwState.todayReviewQueue=[];
}

function qwNextCard(){
  qwEnsureState();
  var newDone=qwState.todayNewCount||0;
  var revDone=qwState.todayReviewCount||0;
  var revTarget=qwState.todayReviewQueue?qwState.todayReviewQueue.length:0;
  if(newDone>=6&&revDone>=revTarget)return null;
  var _lastId=qwState._lastAnswered||null;
  var queue=(qwState.queue||[]).filter(function(id){return QW_CARDS.some(function(c){return c.id===id;});});
  qwState.queue=queue;
  // Wrong queue — skip the card just answered
  if(queue.length>0&&newDone<6){
    var qid=queue.find(function(id){return id!==_lastId;});
    if(qid)return QW_CARDS.find(function(c){return c.id===qid;})||null;
    if(queue.length===1)return QW_CARDS.find(function(c){return c.id===queue[0];})||null;
  }
  if(revDone<revTarget){
    var revQueue=qwState.todayReviewQueue||[];
    for(var ri=revDone;ri<revQueue.length;ri++){
      if(revQueue[ri]!==_lastId){
        var rc=QW_CARDS.find(function(c){return c.id===revQueue[ri];});
        if(rc)return rc;
      }
    }
    // Fall through to any review if all match lastId
    var revId=(qwState.todayReviewQueue||[])[revDone];
    if(revId){var rc2=QW_CARDS.find(function(c){return c.id===revId;});if(rc2)return rc2;}
  }
  if(newDone<6){
    var unseen=QW_CARDS.filter(function(c){return !qwState.seen[c.id]&&(qwState.wrong||[]).indexOf(c.id)<0&&c.id!==_lastId;});
    if(!unseen.length)unseen=QW_CARDS.filter(function(c){return !qwState.seen[c.id]&&(qwState.wrong||[]).indexOf(c.id)<0;});
    if(!unseen.length){qwState.seen={};unseen=QW_CARDS.filter(function(c){return (qwState.wrong||[]).indexOf(c.id)<0;});}
    if(!unseen.length)unseen=QW_CARDS.slice();
    return unseen[Math.floor(Math.random()*unseen.length)];
  }
  return null;
}

var qwAnswered=false;
var qwCurrentCard=null;

function qwRenderStudy(){
  var el=document.getElementById('qw-body');
  var badge=document.getElementById('qw-badge');
  if(!el)return;
  qwEnsureState();
  var nd=qwState.todayNewCount||0;
  var rd=qwState.todayReviewCount||0;
  var rt=qwState.todayReviewQueue?qwState.todayReviewQueue.length:0;
  var qwLimit=ultraQW?21:6;
  var allDone=nd>=qwLimit&&rd>=(ultraQW?rt+25:rt);
  var ultraQW=!!qwState._ultra;
  if(badge){
    badge.textContent=nd+'/'+(ultraQW?21:6);
    badge.style.display='';
  }

  var card=allDone?null:qwNextCard();
  var tab=qwState._tab||'study';
  var h='';

  // Tab bar
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
  [{'t':'study','l':'STUDY'},{'t':'learn','l':'LEARN'},{'t':'stats','l':'STATS'},{'t':'settings','l':'\u2699'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-qwtab="'+x.t+'" style="font-size:9px;padding:3px 10px;border:1px solid '+(a?'rgba(0,255,136,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'#00ff88':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='study'){
    // Progress bar
    h+='<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;font-size:10px;color:var(--dim)">';
    h+='<span style="color:#00ff88">'+nd+'</span><span>/'+(ultraQW?21:6)+' new</span>';
    if(rt>0)h+='<span style="margin-left:4px;color:rgba(0,255,136,.5)">'+rd+'/'+(ultraQW?rt+25:rt)+' review</span>';
    h+='<div style="flex:1;height:2px;background:rgba(255,255,255,.06);margin-left:4px"><div style="height:100%;width:'+(nd/Math.max(ultraQW?21:6,1)*100)+'%;background:#00ff88;transition:width .3s"></div></div>';
    h+='</div>';
    h+='<div style="text-align:right;margin-bottom:10px">';
    h+='<button data-qwultra="1" style="font-size:9px;padding:2px 10px;background:rgba(255,204,0,'+(ultraQW?'.15':'0')+');border:1px solid rgba(255,204,0,'+(ultraQW?'.5':'.2')+');color:'+(ultraQW?'#ffcc00':'rgba(255,255,255,.3)')+';font-family:monospace;cursor:pointer;letter-spacing:1px">⚡ ULTRA</button>';
    h+='</div>';

    if(allDone){
      h+='<div style="padding:20px;text-align:center;border:1px solid rgba(0,255,136,.15);background:rgba(0,255,136,.04)">';
      h+='<div style="font-size:28px;margin-bottom:8px">\u2705</div>';
      h+='<div style="font-size:13px;color:#00ff88;margin-bottom:4px">All done for today.</div>';
      h+='<div style="font-size:10px;color:var(--dim)">'+QW_CARDS.length+' total words · '+(qwState.correct||[]).length+' learned</div>';
      h+='</div>';
    } else if(card){
      qwCurrentCard=card;
      qwAnswered=false;
      var isReview=(qwState.todayReviewQueue||[]).indexOf(card.id)>=0;
      var streak=qwState.streaks&&qwState.streaks[card.id]||0;
      h+='<div style="margin-bottom:10px">';
      if(card.cat)h+='<div style="font-size:9px;color:rgba(0,255,136,.5);letter-spacing:1px;margin-bottom:6px">'+card.cat+(isReview?' · review':'')+(streak>=3?' · \u2605'.repeat(Math.min(streak,6)):'')+'</div>';
      // Detect if question contains Arabic chars — apply selected Arabic font
      var _qwHasAr=/[\u0600-\u06ff]/.test(card.q);
      var _qwFontCss=DUA_ARABIC_FONTS.find(function(f){{return f.key===_qwFont;}})||(DUA_ARABIC_FONTS[0]);
      var _qwQStyle="font-size:19px;color:var(--text);line-height:1.5;margin-bottom:14px;padding:12px;background:rgba(0,255,136,.04);border:1px solid rgba(0,255,136,.12);text-align:center;";
      if(_qwHasAr)_qwQStyle+="font-family:"+_qwFontCss.css+";direction:rtl;font-size:26px;";
      h+='<div id="qw-question" style="'+_qwQStyle+'">'+card.q+'</div>';
      h+='<div id="qw-choices" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
      // Shuffle options
      var opts=[card.a].concat(card.wrong||[]);
      for(var oi=opts.length-1;oi>0;oi--){var oj=Math.floor(Math.random()*(oi+1));var ot=opts[oi];opts[oi]=opts[oj];opts[oj]=ot;}
      var _qwHasArOpt=/[\u0600-\u06ff]/.test(opts.join(''));
      var _qwOptFontCss2=DUA_ARABIC_FONTS.find(function(f){return f.key===_qwFont;})||(DUA_ARABIC_FONTS[0]);
      opts.forEach(function(opt){
        var isCorrect=opt===card.a;
        var _optHasAr=/[\u0600-\u06ff]/.test(opt);
        var _optStyle='padding:10px 8px;background:rgba(0,255,136,.04);border:1px solid rgba(0,255,136,.15);color:var(--text);cursor:pointer;line-height:1.4;';
        if(_optHasAr){
          _optStyle+='font-family:'+_qwOptFontCss2.css+';font-size:24px;direction:rtl;text-align:right;';
        } else {
          _optStyle+='font-family:monospace;font-size:12px;text-align:left;';
        }
        h+='<button data-qwcorrect="'+(isCorrect?'1':'0')+'" data-qwopt="'+opt.replace(/"/g,'&quot;')+'" style="'+_optStyle+'">'+opt+'</button>';
      });
      h+='</div>';
      h+='<button data-qwdontknow="1" style="margin-top:8px;width:100%;padding:7px;background:transparent;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.65);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:1px">I DON\'T KNOW</button>';
      h+='</div>';
    }
  } else if(tab==='learn'){
    // Daily word learning table
    if(!qwState.learnDate)qwState.learnDate='';
    if(!qwState.learnWords)qwState.learnWords=[];
    if(!qwState.learnSeen)qwState.learnSeen={};
    if(!qwState.learnRevealed)qwState.learnRevealed={};
    var _lToday=qwTodayKey();
    // Rebuild if new day, empty words, or words have no valid arabic (extraction failed before)
    var _lBadWords=qwState.learnWords.length>0&&!qwState.learnWords[0].arabic;
    var _lNeedsRebuild=qwState.learnDate!==_lToday
      ||(qwState.learnWords.length===0&&QW_CARDS&&QW_CARDS.length>0)
      ||_lBadWords;
    if(_lNeedsRebuild){
      qwState.learnDate=_lToday;
      qwState.learnRevealed={};
      var _lPool=[];
      if(QW_CARDS&&QW_CARDS.length){
        QW_CARDS.forEach(function(c){
          // QW_CARDS uses .q (question), .a (answer), .cat (category)
          var q=c.q||c.question||'';
          var qi=q.indexOf("'"),qi2=q.lastIndexOf("'");
          var arabic=(qi>=0&&qi2>qi)?q.slice(qi+1,qi2):'';
          if(!arabic)return;
          var answer=c.a||c.correct_answer||'';
          var cat=c.cat||c.category||'';
          if(!qwState.learnSeen[c.id])_lPool.push({id:c.id,arabic:arabic,answer:answer,cat:cat});
        });
      }
      qwState.learnWords=_lPool.slice(0,15);
      if(!QW_CARDS||!QW_CARDS.length){
        qwState.learnDate=''; // force rebuild when cards load
      } else {
        qwSave();
      }
    }
    var _lW=qwState.learnWords||[];
    var _lRev=Object.keys(qwState.learnRevealed||{}).length;
    var _lSeen=Object.keys(qwState.learnSeen||{}).length;
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:10px;color:var(--dim)">';
    h+='<span style="color:#00ff88">'+_lRev+'</span><span>/'+_lW.length+' revealed</span>';
    h+='<div style="flex:1;height:2px;background:rgba(255,255,255,.06)"><div style="height:100%;width:'+(_lW.length?_lRev/_lW.length*100:0)+'%;background:#00ff88;transition:width .3s"></div></div>';
    h+='<span style="font-size:9px;color:rgba(255,255,255,.2)">'+_lSeen+' total</span>';
    h+='</div>';
    if(!QW_CARDS||!QW_CARDS.length){
      h+='<div style="font-size:11px;color:var(--dim);padding:10px">Loading words...</div>';
      setTimeout(function(){if(QW_CARDS&&QW_CARDS.length&&(qwState._tab||'study')==='learn')qwRenderStudy();},600);
    } else if(!_lW.length){
      h+='<div style="padding:20px;text-align:center;border:1px solid rgba(0,255,136,.15);background:rgba(0,255,136,.04)">';
      h+='<div style="font-size:24px;margin-bottom:8px">📖</div>';
      h+='<div style="font-size:13px;color:#00ff88;margin-bottom:4px">All words learned!</div>';
      h+='<div style="font-size:10px;color:var(--dim)">'+_lSeen+' total · come back tomorrow</div>';
      h+='</div>';
    } else {
      h+='<table style="width:100%;border-collapse:collapse">';
      h+='<thead><tr style="border-bottom:1px solid rgba(255,255,255,.1)">';
      h+='<th style="padding:5px 6px;font-size:9px;color:var(--dim);letter-spacing:1px;text-align:left;width:26px">#</th>';
      h+='<th style="padding:5px 6px;font-size:9px;color:var(--dim);letter-spacing:1px;text-align:right">ARABIC</th>';
      h+='<th style="padding:5px 6px;font-size:9px;color:var(--dim);letter-spacing:1px;text-align:left">MEANING</th>';
      h+='</tr></thead><tbody>';
      _lW.forEach(function(w,i){
        var rev=!!(qwState.learnRevealed&&qwState.learnRevealed[w.id]);
        h+='<tr style="border-bottom:1px solid rgba(255,255,255,.04)">';
        h+='<td style="padding:10px 6px;color:rgba(255,255,255,.2);font-size:10px;vertical-align:middle">'+(i+1)+'</td>';
        h+='<td style="padding:10px 6px;text-align:right;vertical-align:middle">';
        h+='<div style="font-size:28px;font-family:\'Scheherazade New\',serif;color:#ffcc00;direction:rtl">'+w.arabic+'</div>';
        h+='<div style="font-size:8px;color:rgba(255,255,255,.2);margin-top:2px">'+w.cat+'</div></td>';
        h+='<td style="padding:10px 6px;vertical-align:middle">';
        if(rev)h+='<span style="font-size:13px;color:var(--text)">'+w.answer+'</span>';
        else h+='<button data-qwreveal="'+w.id+'" style="padding:4px 10px;background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--dim);font-family:monospace;font-size:9px;cursor:pointer;letter-spacing:1px">SHOW</button>';
        h+='</td></tr>';
      });
      h+='</tbody></table>';
      h+='<button data-qwlearnall="1" style="width:100%;margin-top:12px;padding:9px;background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.25);color:#00ff88;font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:1px">✓ MARK ALL LEARNED</button>';
    }

  } else if(tab==='stats') {
    // STATS tab
    var total=QW_CARDS.length;
    var learned=(qwState.correct||[]).length;
    var wrongCount=(qwState.wrong||[]).length;
    var todayKeyS=qwTodayKey();
    var cooled3=Object.keys(qwState.nextReview||{}).filter(function(id){var nr=qwState.nextReview[id];return nr>todayKeyS&&(qwState.streaks[id]||0)<6;}).length;
    var cooled6=Object.keys(qwState.nextReview||{}).filter(function(id){var nr=qwState.nextReview[id];return nr>todayKeyS&&(qwState.streaks[id]||0)>=6;}).length;

    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">';
    [{'v':total,'l':'total words'},{'v':learned,'l':'learned'},{'v':wrongCount,'l':'needs work'}].forEach(function(s){
      h+='<div style="text-align:center;padding:8px;background:rgba(0,255,136,.04);border:1px solid rgba(0,255,136,.1)">';
      h+='<div style="font-size:22px;color:#00ff88;font-family:VT323,monospace">'+s.v+'</div>';
      h+='<div style="font-size:9px;color:var(--dim)">'+s.l+'</div></div>';
    });
    h+='</div>';

    // Categories breakdown
    // Merge X and X (Reverse) into single category
    function _qwBaseCat(cat){return cat.replace(/ \(Reverse\)$/,'').trim();}
    var cats={};
    QW_CARDS.forEach(function(c){
      if(!c.cat)return;
      var base=_qwBaseCat(c.cat);
      cats[base]=(cats[base]||0)+1;
    });
    var learnedByCat={};
    (qwState.correct||[]).forEach(function(id){
      var c=QW_CARDS.find(function(x){return x.id===id;});
      if(!c||!c.cat)return;
      var base=_qwBaseCat(c.cat);
      learnedByCat[base]=(learnedByCat[base]||0)+1;
    });
    h+='<div style="border-top:1px solid rgba(255,255,255,.06);padding-top:10px;margin-bottom:10px">';
    Object.keys(cats).sort().forEach(function(cat){
      var tot=cats[cat],lrn=learnedByCat[cat]||0;
      var pct=Math.round(lrn/tot*100);
      h+='<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px">';
      h+='<span style="flex:1;color:var(--dim)">'+cat+'</span>';
      h+='<div style="width:80px;height:4px;background:rgba(255,255,255,.06)">';
      h+='<div style="height:100%;width:'+pct+'%;background:#00ff88;opacity:.7"></div></div>';
      h+='<span style="font-size:10px;color:rgba(0,255,136,.7);min-width:30px;text-align:right">'+lrn+'/'+tot+'</span>';
      h+='</div>';
    });
    h+='</div>';

    if(cooled3||cooled6){
      h+='<div style="padding:6px 8px;background:rgba(0,255,136,.04);border-left:2px solid rgba(0,255,136,.2);font-size:10px;color:var(--dim)">';
      if(cooled3)h+='<div>\u231b '+cooled3+' word'+(cooled3!==1?'s':'')+' resting 1 week</div>';
      if(cooled6)h+='<div>\u231b '+cooled6+' word'+(cooled6!==1?'s':'')+' resting 1 month</div>';
      h+='</div>';
    }
    h+='<div style="font-size:9px;color:var(--dim);margin-top:8px;opacity:.5">'+total+' total Quran words</div>';
  } else if(tab==='settings'){
    var QWFONTS=DUA_ARABIC_FONTS;
    h+='<div style="font-size:9px;color:rgba(0,255,136,.6);letter-spacing:2px;margin-bottom:10px">ARABIC TEXT STYLE</div>';
    h+='<div style="font-size:11px;color:var(--dim);margin-bottom:12px;line-height:1.6">Choose how Arabic words appear on flashcards.</div>';
    QWFONTS.forEach(function(f){
      var active=_qwFont===f.key;
      h+='<div data-qwfont="'+f.key+'" style="display:flex;align-items:center;gap:12px;padding:10px;margin-bottom:6px;border:1px solid rgba(0,255,136,'+(active?'.4':'.1')+');background:rgba(0,255,136,'+(active?'.06':'0')+');cursor:pointer">';
      h+='<div style="flex:1">';
      h+='<div style="font-size:11px;color:'+(active?'#00ff88':'var(--text)')+'">'+f.name+'</div>';
      h+='<div style="font-size:26px;font-family:'+f.css+';direction:rtl;text-align:right;color:'+(active?'#00ff88':'var(--dim)')+';margin-top:4px">';
      h+='\u0628\u0650\u0633\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650</div>';
      h+='</div>';
      if(active)h+='<span style="color:#00ff88;font-size:18px">\u2713</span>';
      h+='</div>';
    });
  }

  el.innerHTML=h;

  // Wire LEARN tab interactions
  el.querySelectorAll('[data-qwreveal]').forEach(function(btn){
    btn.onclick=function(){
      var wid=this.dataset.qwreveal;
      if(!qwState.learnRevealed)qwState.learnRevealed={};
      qwState.learnRevealed[wid]=true;
      if(!qwState.learnSeen)qwState.learnSeen={};
      qwState.learnSeen[wid]=qwTodayKey();
      if(typeof hap==='function')hap(HAP.soft);
      qwSave();qwRenderStudy();
    };
  });
  var learnAllBtn=el.querySelector('[data-qwlearnall]');
  if(learnAllBtn)learnAllBtn.onclick=function(){
    var _today=qwTodayKey();
    if(!qwState.learnRevealed)qwState.learnRevealed={};
    if(!qwState.learnSeen)qwState.learnSeen={};
    (qwState.learnWords||[]).forEach(function(w){
      qwState.learnRevealed[w.id]=true;
      qwState.learnSeen[w.id]=_today;
    });
    if(typeof hap==='function')hap(HAP.check);
    qwSave();qwRenderStudy();
  };
  el.querySelectorAll('[data-qwreveal]').forEach(function(btn){
    btn.onclick=function(){
      var wid=this.dataset.qwreveal;
      if(!qwState.learnRevealed)qwState.learnRevealed={};
      if(!qwState.learnSeen)qwState.learnSeen={};
      qwState.learnRevealed[wid]=true;
      qwState.learnSeen[wid]=qwTodayKey();
      if(typeof hap==='function')hap(HAP.soft);
      qwSave();qwRenderStudy();
    };
  });
  var _learnAllBtn=el.querySelector('[data-qwlearnall]');
  if(_learnAllBtn)_learnAllBtn.onclick=function(){
    var _t=qwTodayKey();
    if(!qwState.learnRevealed)qwState.learnRevealed={};
    if(!qwState.learnSeen)qwState.learnSeen={};
    (qwState.learnWords||[]).forEach(function(w){
      qwState.learnRevealed[w.id]=true;
      qwState.learnSeen[w.id]=_t;
    });
    if(typeof hap==='function')hap(HAP.check);
    qwSave();qwRenderStudy();
  };
  el.querySelectorAll('[data-qwtab]').forEach(function(b){
    b.onclick=function(){qwState._tab=this.dataset.qwtab;qwSave();qwRenderStudy();};
  });
  var qwUltraBtn=el.querySelector('[data-qwultra]');
  if(qwUltraBtn)qwUltraBtn.onclick=function(){
    qwState._ultra=!qwState._ultra;
    if(qwState._ultra){
      qwEnsureState();
      var qwExtraNew=[];var qwExtraRev=[];
      QW_CARDS.forEach(function(c){
        var k=c.id;
        if(!qwState.correct.includes(k)&&!qwState.wrong.includes(k)&&!(qwState.todayNewQueue||[]).includes(k))qwExtraNew.push(k);
        else if(qwState.correct.includes(k)&&!(qwState.todayReviewQueue||[]).includes(k))qwExtraRev.push(k);
      });
      for(var xi=qwExtraRev.length-1;xi>0;xi--){var xj=Math.floor(Math.random()*(xi+1));var xt=qwExtraRev[xi];qwExtraRev[xi]=qwExtraRev[xj];qwExtraRev[xj]=xt;}
      qwState.todayNewQueue=(qwState.todayNewQueue||[]).concat(qwExtraNew.slice(0,15));
      qwState.todayReviewQueue=(qwState.todayReviewQueue||[]).concat(qwExtraRev.slice(0,25));
    }
    qwSave();qwRenderStudy();
  };
  el.querySelectorAll('[data-qwfont]').forEach(function(b){
    b.onclick=function(){_qwFont=this.dataset.qwfont;localStorage.setItem('qw_font',_qwFont);qwRenderStudy();};
  });

  if(tab==='study'&&card&&!allDone){
    // Wire "I Don't Know" — reveal correct answer then mark wrong
    var dkBtn=el.querySelector('[data-qwdontknow]');
    if(dkBtn){
      var _dkConfirmed=false;
      var dkFn=function(){
        if(qwAnswered)return;
        if(!_dkConfirmed){
          var _dkb=el.querySelector('[data-qwdontknow]');
          if(_dkb){
            _dkb.textContent='ARE YOU SURE?';
            _dkb.style.color='rgba(255,184,108,.8)';
            _dkb.style.borderColor='rgba(255,184,108,.4)';
            setTimeout(function(){_dkConfirmed=false;if(_dkb){_dkb.textContent="I DON'T KNOW";_dkb.style.color='rgba(255,255,255,.65)';_dkb.style.borderColor='rgba(255,255,255,.3)';}},2500);
          }
          _dkConfirmed=true;
          return;
        }
        qwAnswered=true;
        // Reveal the correct answer
        el.querySelectorAll('[data-qwopt]').forEach(function(b2){
          if(b2.dataset.qwcorrect==='1'){b2.style.background='rgba(0,255,136,.18)';b2.style.borderColor='#00ff88';b2.style.color='#00ff88';}
          b2.onclick=null;
        });
        dkBtn.style.borderColor='var(--cr)';dkBtn.style.color='var(--cr)';dkBtn.onclick=null;
        // Record as wrong
        qwEnsureState();
        qwState.seen[card.id]=true;
        qwState.history.push({id:card.id,correct:false,ts:new Date().toISOString()});
        if(qwState.history.length>1000)qwState.history=qwState.history.slice(-1000);
        if(!qwState.correct)qwState.correct=[];
        var wIdx=(qwState.wrong||[]).indexOf(card.id);
        if(wIdx<0)qwState.wrong.push(card.id);
        qwState.streaks[card.id]=0;
        delete qwState.nextReview[card.id];
        var isRev=(qwState.todayReviewQueue||[]).indexOf(card.id)>=0;
        if(isRev)qwState.todayReviewCount=(qwState.todayReviewCount||0)+1;
        else qwState.todayNewCount=(qwState.todayNewCount||0)+1;
        qwState.todayCount=(qwState.todayCount||0)+1;
        if(typeof hap==='function')hap(HAP.error);
        qwState._lastAnswered=card.id;
        if(qwState.queue){
          var _qi=qwState.queue.indexOf(card.id);
          if(_qi===0){qwState.queue.shift();qwState.queue.push(card.id);}
        }
        qwState._showNext=true;
        qwSave();
        qwRenderStudy();
      };
      dkBtn.onclick=dkFn;
      dkBtn.ontouchend=function(e){e.preventDefault();dkFn();};
    }
    var qwNextBtn=el.querySelector('[data-qwnext]');
    if(qwNextBtn){
      var qwNextFn=function(){
        qwAnswered=false;
        qwState._showNext=false;
        qwSave();
        qwRenderStudy();
      };
      qwNextBtn.onclick=qwNextFn;
      qwNextBtn.ontouchend=function(e){e.preventDefault();qwNextFn();};
    }
    el.querySelectorAll('[data-qwopt]').forEach(function(btn){
      btn.onclick=function(){
        if(qwAnswered)return;
        qwAnswered=true;
        var isCorrect=this.dataset.qwcorrect==='1';
        // Visual feedback
        el.querySelectorAll('[data-qwopt]').forEach(function(b2){
          if(b2.dataset.qwcorrect==='1'){b2.style.background='rgba(0,255,136,.18)';b2.style.borderColor='#00ff88';b2.style.color='#00ff88';}
          else if(b2===btn&&!isCorrect){b2.style.background='rgba(255,68,68,.15)';b2.style.borderColor='var(--cr)';b2.style.color='var(--cr)';}
          b2.onclick=null;
        });
        // Record answer
        qwEnsureState();
        qwState.seen[card.id]=true;
        qwState.history.push({id:card.id,correct:isCorrect,ts:new Date().toISOString()});
        if(qwState.history.length>1000)qwState.history=qwState.history.slice(-1000);
        if(!qwState.correct)qwState.correct=[];
        var wIdx=(qwState.wrong||[]).indexOf(card.id);
        var cIdx=qwState.correct.indexOf(card.id);
        if(isCorrect){
          if(wIdx>=0)qwState.wrong.splice(wIdx,1);
          var qIdx3=qwState.queue.indexOf(card.id);if(qIdx3>=0)qwState.queue.splice(qIdx3,1);
          if(cIdx<0)qwState.correct.push(card.id);
          qwState.streaks[card.id]=(qwState.streaks[card.id]||0)+1;
          var stk=qwState.streaks[card.id];
          var coolDays=stk>=6?30:stk>=3?7:0;
          if(coolDays>0){var nr=new Date();nr.setDate(nr.getDate()+coolDays);qwState.nextReview[card.id]=nr.toISOString().slice(0,10);}
          if(typeof hap==='function')hap(HAP.check);
        } else {
          if(wIdx<0)qwState.wrong.push(card.id);
          qwState.streaks[card.id]=0;
          delete qwState.nextReview[card.id];
          // Move to back of queue
          var _qiw=qwState.queue.indexOf(card.id);
          if(_qiw===0){qwState.queue.shift();qwState.queue.push(card.id);}
          qwState._lastAnswered=card.id;
          if(typeof hap==='function')hap(HAP.error);
        }
        var isRev=(qwState.todayReviewQueue||[]).indexOf(card.id)>=0;
        if(isRev)qwState.todayReviewCount=(qwState.todayReviewCount||0)+1;
        else qwState.todayNewCount=(qwState.todayNewCount||0)+1;
        qwState.todayCount=(qwState.todayCount||0)+1;
        qwSave();
        if(isCorrect){
          // Auto-advance on correct
          setTimeout(function(){qwRenderStudy();},2000);
        } else {
          // Show NEXT button on wrong — add it to DOM directly
          var _nBtn=document.createElement('button');
          _nBtn.textContent='NEXT →';
          _nBtn.style.cssText='width:100%;margin-top:8px;padding:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.2);color:var(--text);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:2px';
          var _qwNext=function(){qwAnswered=false;qwRenderStudy();};
          _nBtn.onclick=_qwNext;
          _nBtn.ontouchend=function(e){e.preventDefault();_qwNext();};
          var _dkEl=el.querySelector('[data-qwdontknow]');
          if(_dkEl&&_dkEl.parentNode)_dkEl.parentNode.insertBefore(_nBtn,_dkEl.nextSibling);
          else{var _qwc=el.querySelector('#qw-choices');if(_qwc)_qwc.parentNode.appendChild(_nBtn);}
        }
      };
    });
  }
}

setTimeout(function(){qwRenderStudy();},700);

// ── AYAH RECALL ──
var AR_DATA = null;
var arState = JSON.parse(localStorage.getItem('dash_ar') || '{}');
function arSave(){ localStorage.setItem('dash_ar', JSON.stringify(arState)); }

function arTodayKey(){
  var n=new Date(); if(n.getHours()<4)n=new Date(n.getTime()-864e5);
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}

(function(){
  fetch('quranMemory.json')
    .then(function(r){return r.json();})
    .then(function(d){
      AR_DATA=d.surahs;
      arRender();
    })
    .catch(function(e){console.warn('quranMemory.json failed',e);});
})();

function arEnsureState(){
  if(!arState.known)arState.known={};     // {key: true}
  if(!arState.struggling)arState.struggling={}; // {key: count}
  if(!arState.streaks)arState.streaks={};
  if(!arState.nextReview)arState.nextReview={};
  if(!arState.history)arState.history=[];
  if(arState.todayDate!==arTodayKey()){
    arState.todayDate=arTodayKey();
    arState.todayDone=0;
    // Build today's queue: new cards + due reviews
    var todayKey=arTodayKey();
    var allKeys=[];
    if(AR_DATA)AR_DATA.forEach(function(s){
      s.ayahs.forEach(function(txt,i){
        allKeys.push(s.n+'_'+(i+1));
      });
    });
    // New: not yet seen
    var newCards=allKeys.filter(function(k){return !arState.known[k]&&!arState.struggling[k];});
    // Review: known but due
    var reviewCards=allKeys.filter(function(k){
      if(!arState.known[k]&&!arState.struggling[k])return false;
      var nr=arState.nextReview[k];
      return !nr||nr<=todayKey;
    });
    // Shuffle
    for(var i=newCards.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=newCards[i];newCards[i]=newCards[j];newCards[j]=t;}
    // Shuffle both queues so verses aren't chronological
    reviewCards.sort(function(){return Math.random()-0.5;});
    newCards.sort(function(){return Math.random()-0.5;});
    arState.todayQueue=[].concat(reviewCards, newCards.slice(0,5));
    arState.todayIdx=0;
  }
  if(!arState.todayQueue)arState.todayQueue=[];
}

function arGetCard(){
  if(!AR_DATA)return null;
  arEnsureState();
  while(arState.todayIdx<arState.todayQueue.length){
    var key=arState.todayQueue[arState.todayIdx];
    var parts=key.split('_');
    var sn=parseInt(parts[0]),an=parseInt(parts[1]);
    var surah=AR_DATA.find(function(s){return s.n===sn;});
    if(surah&&surah.ayahs[an-1])return {key:key,surah:surah,ayahNum:an,text:surah.ayahs[an-1]};
    arState.todayIdx++;
  }
  return null;
}

var arRevealed=false;

// ── AYAH RECALL FIREFLIES ──
var _arFireflyRAF = null;
var _arFireflies = [];

function arStopFireflies(){
  if(_arFireflyRAF){cancelAnimationFrame(_arFireflyRAF);_arFireflyRAF=null;}
  _arFireflies=[];
}

function arStartFireflies(){
  arStopFireflies();
  var canvas=document.getElementById('ar-firefly-canvas');
  var wrap=document.getElementById('ar-firefly-wrap');
  if(!canvas||!wrap)return;

  var ctx=canvas.getContext('2d');

  function resize(){
    canvas.width=wrap.offsetWidth;
    canvas.height=wrap.offsetHeight;
  }
  resize();

  // Spawn 18 fireflies
  var N=18;
  var COLORS=['#ffd6a5','#caffbf','#9bf6ff','#ffc6ff','#fdffb6','#ffffcc','#e8f4ff'];
  for(var i=0;i<N;i++){
    _arFireflies.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      r: 1.2+Math.random()*2,         // radius
      a: Math.random()*Math.PI*2,      // angle of drift
      speed: 0.15+Math.random()*0.3,   // drift speed
      wobble: Math.random()*Math.PI*2, // phase for pulsing
      wobbleSpeed: 0.015+Math.random()*0.025,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      alpha: 0.1+Math.random()*0.5,    // base opacity
      turnSpeed: (Math.random()-0.5)*0.04, // gentle direction drift
      tail: []                          // trail points
    });
  }

  function draw(){
    _arFireflyRAF=requestAnimationFrame(draw);
    // Only re-read dimensions occasionally
    if(canvas.width!==wrap.offsetWidth||canvas.height!==wrap.offsetHeight)resize();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    var now=Date.now()/1000;

    _arFireflies.forEach(function(f){
      // Update position
      f.a += f.turnSpeed;
      f.x += Math.cos(f.a)*f.speed;
      f.y += Math.sin(f.a)*f.speed;
      f.wobble += f.wobbleSpeed;

      // Wrap around edges
      if(f.x<-4)f.x=canvas.width+4;
      if(f.x>canvas.width+4)f.x=-4;
      if(f.y<-4)f.y=canvas.height+4;
      if(f.y>canvas.height+4)f.y=-4;

      // Pulsing opacity
      var pulse=0.4+Math.sin(f.wobble)*0.6;
      var opacity=f.alpha*pulse;

      // Store trail
      f.tail.push({x:f.x,y:f.y,o:opacity});
      if(f.tail.length>8)f.tail.shift();

      // Draw tail
      for(var t=0;t<f.tail.length;t++){
        var tp=f.tail[t];
        var to=tp.o*(t/f.tail.length)*0.4;
        ctx.beginPath();
        ctx.arc(tp.x,tp.y,f.r*0.5,0,Math.PI*2);
        ctx.fillStyle=f.color;
        ctx.globalAlpha=to;
        ctx.fill();
      }

      // Draw glow halo
      var grad=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*4);
      grad.addColorStop(0,f.color);
      grad.addColorStop(1,'transparent');
      ctx.beginPath();
      ctx.arc(f.x,f.y,f.r*4,0,Math.PI*2);
      ctx.fillStyle=grad;
      ctx.globalAlpha=opacity*0.15;
      ctx.fill();

      // Draw core dot
      ctx.beginPath();
      ctx.arc(f.x,f.y,f.r,0,Math.PI*2);
      ctx.fillStyle=f.color;
      ctx.globalAlpha=opacity;
      ctx.fill();

      ctx.globalAlpha=1;
    });
  }

  draw();
}

function arRender(){
  var el=document.getElementById('ar-body');
  var badge=document.getElementById('ar-badge');
  if(!el)return;
  el.style.maxHeight='800px';
  el.style.overflowY='auto';
  // Apply wide class if enabled
  var _tile=document.querySelector('[data-id="ayah-recall"]');
  if(_tile){
    if(arState._wide){
      _tile.classList.add('span2');
      _tile.style.gridColumn='span 2';
    } else {
      _tile.classList.remove('span2');
      _tile.style.gridColumn='';
    }
  }

  if(!AR_DATA){
    el.innerHTML='<div style="font-size:11px;color:var(--dim);padding:10px">Loading...</div>';
    return;
  }

  arEnsureState();
  var tab=arState._tab||'recall';
  var knownCount=Object.keys(arState.known).length;
  var totalAyahs=AR_DATA.reduce(function(a,s){return a+s.ayahs.length;},0);
  if(badge){badge.textContent=knownCount+'/'+totalAyahs;badge.style.display='';}

  var h='';
  // Tab bar
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
  [{t:'recall',l:'RECALL'},{t:'memorized',l:'MEMORIZED'},{t:'surah',l:'SURAH'},{t:'stats',l:'STATS'},{t:'settings',l:'\u2699'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-artab="'+x.t+'" style="font-size:9px;padding:3px 10px;border:1px solid '+(a?'rgba(255,204,0,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'#ffcc00':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='recall'){
    var card=arGetCard();
    var queueLeft=(arState.todayQueue||[]).length-(arState.todayIdx||0);

    var ultraAR=!!arState._ultra;
    // Progress bar
    var done=arState.todayDone||0;
    var total=arState.todayQueue?arState.todayQueue.length:0;
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:10px;color:var(--dim)">';
    h+='<span style="color:#ffcc00">'+done+'</span><span>/'+total+' today'+(ultraAR?' ⚡':'')+'</span>';
    h+='<div style="flex:1;height:2px;background:rgba(255,255,255,.06)"><div style="height:100%;width:'+(total?done/total*100:0)+'%;background:#ffcc00;transition:width .3s"></div></div>';
    h+='</div>';
    h+='<div style="text-align:right;margin-bottom:10px">';
    h+='<button data-arultra="1" style="font-size:9px;padding:2px 10px;background:rgba(255,204,0,'+(ultraAR?'.15':'0')+');border:1px solid rgba(255,204,0,'+(ultraAR?'.5':'.2')+');color:'+(ultraAR?'#ffcc00':'rgba(255,255,255,.3)')+';font-family:monospace;cursor:pointer;letter-spacing:1px">⚡ ULTRA</button>';
    h+='</div>';

    if(!card){
      h+='<div style="padding:20px;text-align:center;border:1px solid rgba(255,204,0,.15);background:rgba(255,204,0,.04)">';
      h+='<div style="font-size:28px;margin-bottom:8px">✅</div>';
      h+='<div style="font-size:13px;color:#ffcc00;margin-bottom:4px">All done for today.</div>';
      h+='<div style="font-size:10px;color:var(--dim)">'+knownCount+' ayahs memorized · '+totalAyahs+' total</div>';
      h+='</div>';
    } else {
      var streak=arState.streaks&&arState.streaks[card.key]||0;
      var isReview=!!arState.known[card.key]||!!arState.struggling[card.key];
      h+='<div style="margin-bottom:10px">';
      // Label
      h+='<div style="font-size:9px;color:rgba(255,204,0,.5);letter-spacing:1px;margin-bottom:8px">';
      h+=card.surah.name+' · Ayah '+card.ayahNum+(isReview?' · review':'')+(streak>=3?' · '+'★'.repeat(Math.min(streak,6)):'');
      h+='</div>';
      // Prompt box
      h+='<div style="font-size:15px;color:#ffcc00;padding:14px;background:rgba(255,204,0,.04);border:1px solid rgba(255,204,0,.15);text-align:center;margin-bottom:12px;letter-spacing:1px">';
      h+=card.surah.name+'<br><span style="font-size:22px;font-family:monospace">'+card.ayahNum+'</span>';
      h+='</div>';

      if(!arRevealed){
        h+='<div style="font-size:10px;color:var(--dim);text-align:center;margin-bottom:10px">Recite it — then reveal</div>';
        h+='<button id="ar-reveal" style="width:100%;padding:10px;background:rgba(255,204,0,.08);border:1px solid rgba(255,204,0,.3);color:#ffcc00;font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:2px">REVEAL AYAH</button>';
      } else {
        // Show Arabic text
        h+='<div style="font-size:28px;font-family:\'Scheherazade New\',serif;direction:rtl;text-align:right;line-height:1.8;padding:12px;background:rgba(255,204,0,.04);border:1px solid rgba(255,204,0,.15);margin-bottom:12px;color:var(--text)">'+card.text+'</div>';
        h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        h+='<button data-arknew="0" style="padding:10px;background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.3);color:#ff4444;font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">✗ MISSED</button>';
        h+='<button data-arknew="1" style="padding:10px;background:rgba(0,255,136,.08);border:1px solid rgba(0,255,136,.3);color:#00ff88;font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">✓ GOT IT</button>';
        h+='</div>'; // ar-surah-scroll
        h+='</div>'; // ar-firefly-wrap
      }
      h+='</div>';
    }


  } else if(tab==='memorized'){
    if(!arState.memorizedSurahs)arState.memorizedSurahs={};
    var mFilter=arState._mFilter||'30';
    h+='<div style="font-size:9px;color:rgba(255,204,0,.6);letter-spacing:2px;margin-bottom:10px">SURAHS YOU HAVE MEMORIZED</div>';
    h+='<div style="font-size:11px;color:var(--dim);line-height:1.6;margin-bottom:12px">Mark surahs you already know. They enter review rotation immediately.</div>';
    h+='<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">';
    [{v:'30',l:'Juz 30'},{v:'29',l:'Juz 29'},{v:'28',l:'Juz 28'},{v:'all',l:'All'}].forEach(function(x){
      var a=mFilter===x.v;
      h+='<span data-arjuzfilter="'+x.v+'" style="font-size:9px;padding:3px 10px;border:1px solid rgba(255,204,0,'+(a?'.5':'.15')+');color:'+(a?'#ffcc00':'var(--dim)')+';cursor:pointer">'+x.l+'</span>';
    });
    h+='<span data-arselectjuz="1" style="margin-left:auto;font-size:9px;padding:3px 8px;border:1px solid rgba(255,204,0,.2);color:rgba(255,204,0,.6);cursor:pointer">✓ All in view</span>';
    h+='<span data-arclearjuz="1" style="font-size:9px;padding:3px 8px;border:1px solid rgba(255,85,85,.2);color:rgba(255,85,85,.5);cursor:pointer">✕ Clear</span>';
    h+='</div>';
    var mSurahs=AR_DATA.filter(function(s){return mFilter==='all'||s.juz===parseInt(mFilter);});
    var memCount=AR_DATA.filter(function(s){return arState.memorizedSurahs[s.n];}).length;
    var memAyahs=AR_DATA.reduce(function(a,s){return a+(arState.memorizedSurahs[s.n]?s.ayahs.length:0);},0);
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;max-height:460px;overflow-y:auto">';
    mSurahs.forEach(function(s){
      var mem=!!arState.memorizedSurahs[s.n];
      h+='<div data-armemsurah="'+s.n+'" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(255,204,0,'+(mem?'.4':'.1')+');background:rgba(255,204,0,'+(mem?'.07':'0')+');cursor:pointer">';
      h+='<span style="font-size:15px;color:'+(mem?'#ffcc00':'rgba(255,255,255,.2)')+';flex-shrink:0">'+(mem?'✓':'○')+'</span>';
      h+='<div style="min-width:0"><div style="font-size:11px;color:'+(mem?'#ffcc00':'var(--dim)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+s.name+'</div>';
      h+='<div style="font-size:9px;color:rgba(255,255,255,.2)">'+s.n+' · '+s.ayahs.length+'</div></div></div>';
    });
    h+='</div>';
    h+='<div style="margin-top:8px;font-size:9px;color:var(--dim)">'+memCount+' surahs · '+memAyahs+' ayahs memorized</div>';

  } else if(tab==='surah'){
    var selSurah=arState._viewSurah||null;
    var rainbow=!!arState._rainbow;
    var WORD_COLORS=['#ffd6a5','#caffbf','#9bf6ff','#ffc6ff','#fdffb6'];
    if(!selSurah){
      h+='<div style="font-size:9px;color:rgba(255,204,0,.6);letter-spacing:2px;margin-bottom:10px">SELECT A SURAH</div>';
      [30,29,28].forEach(function(juz){
        var juzSurahs=AR_DATA.filter(function(s){return s.juz===juz;});
        h+='<div style="margin-bottom:14px"><div style="font-size:9px;color:rgba(255,204,0,.4);letter-spacing:2px;margin-bottom:6px">JUZ '+juz+'</div>';
        h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">';
        juzSurahs.forEach(function(s){
          var mem=arState.memorizedSurahs&&arState.memorizedSurahs[s.n];
          h+='<div data-arviewsurah="'+s.n+'" style="padding:8px 10px;border:1px solid rgba(255,204,0,'+(mem?'.3':'.1')+');cursor:pointer;background:rgba(255,204,0,'+(mem?'.05':'0')+')">'
            +'<div style="font-size:11px;color:'+(mem?'#ffcc00':'var(--text)')+'">'+s.name+'</div>'
            +'<div style="font-size:9px;color:rgba(255,255,255,.2)">'+s.n+' · '+s.ayahs.length+' ayahs</div>'
          +'</div>';
        });
        h+='</div></div>';
      });
    } else {
      var viewS=AR_DATA.find(function(s){return s.n===selSurah;});
      if(viewS){
        var _arFontCssV=(typeof DUA_ARABIC_FONTS!=='undefined'?(DUA_ARABIC_FONTS.find(function(f){return f.key===_arFont;})||DUA_ARABIC_FONTS[0]).css:"'Scheherazade New',serif");
        h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">';
        h+='<button data-arviewsurah="null" style="background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--dim);font-family:monospace;font-size:10px;cursor:pointer;padding:3px 8px">← BACK</button>';
        h+='<div style="flex:1"><div style="font-size:14px;color:#ffcc00">'+viewS.name+'</div>';
        h+='<div style="font-size:9px;color:var(--dim)">Surah '+viewS.n+' · Juz '+viewS.juz+' · '+viewS.ayahs.length+' ayahs</div></div>';
        h+='<button data-arrainbow="1" style="background:rgba(255,204,0,'+(rainbow?'.12':'0')+');border:1px solid rgba(255,204,0,'+(rainbow?'.4':'.2')+');color:'+(rainbow?'#ffcc00':'var(--dim)')+';font-family:monospace;font-size:10px;cursor:pointer;padding:3px 8px">🎨</button>';
        h+='</div>';
        h+='<div id="ar-firefly-wrap" style="position:relative;overflow:hidden;border-radius:2px">';
        h+='<canvas id="ar-firefly-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0"></canvas>';
        h+='<div id="ar-surah-scroll" style="max-height:500px;overflow-y:auto;padding-right:4px;position:relative;z-index:1">';
        viewS.ayahs.forEach(function(ayah,i){
          var known=arState.known&&arState.known[viewS.n+'_'+(i+1)];
          var ayahText=ayah;
          if(rainbow){var words=ayah.split(' ');ayahText=words.map(function(w,wi){return '<span style="color:'+WORD_COLORS[wi%WORD_COLORS.length]+'">'+w+'</span>';}).join(' ');}
          h+='<div style="margin-bottom:12px;padding:10px 12px;border-left:2px solid rgba(255,204,0,'+(known?'.5':'.15')+');background:rgba(255,204,0,'+(known?'.05':'0')+')">'
            +'<div style="font-size:28px;color:rgba(255,255,255,.85);margin-bottom:8px;font-family:monospace;font-weight:bold;letter-spacing:2px">'+(i+1)+'</div>'
            +'<div style="font-size:28px;font-family:'+_arFontCssV+';direction:rtl;text-align:right;line-height:1.9;color:'+(rainbow?'inherit':'#ffcc00')+'">'+ayahText+'</div>'
          +'</div>';
        });
        h+='</div>';
      }
    }

  } else if(tab==='settings'){
    // Wide card toggle
    var isWide=!!arState._wide;
    h+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:10px;border:1px solid rgba(255,204,0,'+(isWide?'.3':'.1')+');background:rgba(255,204,0,'+(isWide?'.06':'0')+')">'
      +'<div style="flex:1"><div style="font-size:11px;color:'+(isWide?'#ffcc00':'var(--text)')+'">Wide Card (2 columns)</div>'
      +'<div style="font-size:9px;color:var(--dim);margin-top:2px">Stretches card across 2 grid columns for more reading space</div></div>'
      +'<button data-arwide="1" style="padding:4px 14px;background:rgba(255,204,0,'+(isWide?'.2':'.05')+');border:1px solid rgba(255,204,0,'+(isWide?'.5':'.2')+');color:'+(isWide?'#ffcc00':'var(--dim)')+';font-family:monospace;font-size:10px;cursor:pointer">'+(isWide?'ON':'OFF')+'</button>'
    +'</div>';
    h+='<div style="font-size:9px;color:rgba(255,204,0,.6);letter-spacing:2px;margin-bottom:10px">ARABIC TEXT STYLE</div>';
    DUA_ARABIC_FONTS.forEach(function(f){
      var a=_arFont===f.key;
      h+='<div data-arfont="'+f.key+'" style="display:flex;align-items:center;gap:12px;padding:10px;margin-bottom:6px;border:1px solid rgba(255,204,0,'+(a?'.4':'.1')+');background:rgba(255,204,0,'+(a?'.06':'0')+');cursor:pointer">';
      h+='<div style="flex:1"><div style="font-size:11px;color:'+(a?'#ffcc00':'var(--text)')+'">'+f.name+'</div>';
      h+='<div style="font-size:24px;font-family:'+f.css+';direction:rtl;text-align:right;color:'+(a?'#ffcc00':'var(--dim)')+';margin-top:4px">\u0628\u0650\u0633\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650</div></div>';
      if(a)h+='<span style="color:#ffcc00;font-size:18px">\u2713</span>';
      h+='</div>';
    });

  } else {
    // STATS
    var struggling=Object.keys(arState.struggling||{}).length;
    var juz30=AR_DATA.filter(function(s){return s.juz===30;});
    var juz29=AR_DATA.filter(function(s){return s.juz===29;});
    var juz28=AR_DATA.filter(function(s){return s.juz===28;});
    function juzKnown(surahs){
      var tot=0;
      surahs.forEach(function(s){s.ayahs.forEach(function(_,i){if(arState.known[s.n+'_'+(i+1)])tot++;});});
      return tot;
    }
    function juzTotal(surahs){return surahs.reduce(function(a,s){return a+s.ayahs.length;},0);}

    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">';
    [{l:'Juz 30',k:juzKnown(juz30),t:juzTotal(juz30)},{l:'Juz 29',k:juzKnown(juz29),t:juzTotal(juz29)},{l:'Juz 28',k:juzKnown(juz28),t:juzTotal(juz28)}].forEach(function(x){
      h+='<div style="text-align:center;padding:8px;background:rgba(255,204,0,.04);border:1px solid rgba(255,204,0,.1)">';
      h+='<div style="font-size:20px;color:#ffcc00;font-family:VT323,monospace">'+x.k+'/'+x.t+'</div>';
      h+='<div style="font-size:9px;color:var(--dim)">'+x.l+'</div>';
      h+='</div>';
    });
    h+='</div>';
    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
    [{v:knownCount,l:'memorized'},{v:struggling,l:'struggling'},{v:totalAyahs-knownCount-struggling,l:'not started'}].forEach(function(x){
      h+='<div style="text-align:center;padding:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)">';
      h+='<div style="font-size:20px;color:var(--text);font-family:VT323,monospace">'+x.v+'</div>';
      h+='<div style="font-size:9px;color:var(--dim)">'+x.l+'</div>';
      h+='</div>';
    });
    h+='</div>';
  }

  el.innerHTML=h;
  // Start fireflies if in surah viewer
  if(tab==='surah'&&arState._viewSurah){
    setTimeout(arStartFireflies,50);
  } else {
    arStopFireflies();
  }

  // Wire tabs
  el.querySelectorAll('[data-artab]').forEach(function(b){
    b.onclick=function(){arState._tab=this.dataset.artab;arSave();arRender();};
  });
  var arUltraBtn=el.querySelector('[data-arultra]');
  if(arUltraBtn)arUltraBtn.onclick=function(){
    arState._ultra=!arState._ultra;
    if(arState._ultra){
      // Add 15 new + 25 review to today's queue
      arEnsureState();
      var extraNew=[];
      if(AR_DATA){AR_DATA.forEach(function(s){
        var sst=smState&&smState.surah&&smState.surah[String(s.n)]||null;
        if(!sst)return;
        s.ayahs.forEach(function(_,i){
          var k=s.n+'_'+(i+1);
          if(!arState.known[k]&&!arState.struggling[k]&&(arState.todayQueue||[]).indexOf(k)<0)extraNew.push(k);
        });
      });}
      var extraRev=[];
      if(AR_DATA){AR_DATA.forEach(function(s){
        s.ayahs.forEach(function(_,i){
          var k=s.n+'_'+(i+1);
          if((arState.known[k]||arState.struggling[k])&&(arState.todayQueue||[]).indexOf(k)<0)extraRev.push(k);
        });
      });}
      for(var xi=extraRev.length-1;xi>0;xi--){var xj=Math.floor(Math.random()*(xi+1));var xt=extraRev[xi];extraRev[xi]=extraRev[xj];extraRev[xj]=xt;}
      arState.todayQueue=(arState.todayQueue||[]).concat(extraNew.slice(0,15),extraRev.slice(0,25));
    }
    arSave();arRender();
  };
  el.querySelectorAll('[data-arfont]').forEach(function(b){
    b.onclick=function(){_arFont=this.dataset.arfont;localStorage.setItem('ar_font',_arFont);arRender();};
  });
  var wideBtn=el.querySelector('[data-arwide]');
  if(wideBtn)wideBtn.onclick=function(){
    arState._wide=!arState._wide;
    // Apply/remove span2 to the tile
    var tile=document.querySelector('[data-id="ayah-recall"]');
    if(tile){
      if(arState._wide){
        tile.classList.add('span2');
        tile.style.gridColumn='span 2';
      } else {
        tile.classList.remove('span2');
        tile.style.gridColumn='';
      }
    }
    arSave();arRender();
  };
  el.querySelectorAll('[data-arjuzfilter]').forEach(function(b){
    b.onclick=function(){arState._mFilter=this.dataset.arjuzfilter;arSave();arRender();};
  });
  el.querySelectorAll('[data-armemsurah]').forEach(function(b){
    b.onclick=function(){
      var sn=parseInt(this.dataset.armemsurah);
      if(!arState.memorizedSurahs)arState.memorizedSurahs={};
      arState.memorizedSurahs[sn]=!arState.memorizedSurahs[sn];
      if(typeof qmSyncSurahMemorized==='function')qmSyncSurahMemorized(sn,arState.memorizedSurahs[sn]);
      else{var su=AR_DATA.find(function(s){return s.n===sn;});if(su){su.ayahs.forEach(function(_,i){var k=sn+'_'+(i+1);if(!arState.known)arState.known={};if(arState.memorizedSurahs[sn])arState.known[k]=true;else delete arState.known[k];});}}
      if(typeof hap==='function')hap(HAP.tap);
      arSave();arRender();
    };
  });
  var sb=el.querySelector('[data-arselectjuz]');
  if(sb)sb.onclick=function(){
    if(!confirm('Mark all surahs in this view as memorized?'))return;
    var mf=arState._mFilter||'30';
    AR_DATA.filter(function(s){return mf==='all'||s.juz===parseInt(mf);}).forEach(function(s){
      if(!arState.memorizedSurahs)arState.memorizedSurahs={};
      arState.memorizedSurahs[s.n]=true;
      if(typeof qmSyncSurahState==='function')qmSyncSurahState(s.n,'memorized');
    });
    arSave();arRender();
  };
  var cb=el.querySelector('[data-arclearjuz]');
  if(cb)cb.onclick=function(){
    if(!confirm('Clear memorized status for all surahs in this view?'))return;
    var mf=arState._mFilter||'30';
    AR_DATA.filter(function(s){return mf==='all'||s.juz===parseInt(mf);}).forEach(function(s){
      if(!arState.memorizedSurahs)arState.memorizedSurahs={};
      arState.memorizedSurahs[s.n]=false;
      if(typeof qmSyncSurahState==='function')qmSyncSurahState(s.n,null);
    });
    arSave();arRender();
  };
  el.querySelectorAll('[data-arviewsurah]').forEach(function(b){b.onclick=function(){var v=this.dataset.arviewsurah;arState._viewSurah=v==='null'?null:parseInt(v);if(v==='null')arStopFireflies();arSave();arRender();};});
  var rb=el.querySelector('[data-arrainbow]');
  if(rb)rb.onclick=function(){arState._rainbow=!arState._rainbow;arSave();arRender();};

  // Wire reveal
  var revBtn=document.getElementById('ar-reveal');
  if(revBtn){
    revBtn.onclick=function(){arRevealed=true;arRender();};
    revBtn.ontouchend=function(e){e.preventDefault();arRevealed=true;arRender();};
  }

  // Wire got it / missed
  el.querySelectorAll('[data-arknew]').forEach(function(btn){
    btn.onclick=function(){
      arEnsureState();
      var card=arGetCard();
      if(!card)return;
      var gotIt=this.dataset.arknew==='1';
      if(gotIt){
        if(typeof hap==='function')hap(HAP.check);
        arState.known[card.key]=true;
        delete arState.struggling[card.key];
        arState.streaks[card.key]=(arState.streaks[card.key]||0)+1;
        var stk=arState.streaks[card.key];
        var coolDays=stk>=6?30:stk>=3?7:0;
        if(coolDays>0){var nr=new Date();nr.setDate(nr.getDate()+coolDays);arState.nextReview[card.key]=nr.toISOString().slice(0,10);}
        // Update surah map ayah block instantly
        var _arParts=card.key.split('_');
        if(typeof qmSync==='function')qmSync(parseInt(_arParts[0]),parseInt(_arParts[1]),'memorized');
        if(typeof qmCheckAutoPromote==='function')setTimeout(function(){qmCheckAutoPromote(parseInt(_arParts[0]));},100);
        if(typeof smRender==='function')setTimeout(smRender,50);
      } else {
        if(typeof hap==='function')hap(HAP.error);
        arState.struggling[card.key]=(arState.struggling[card.key]||0)+1;
        arState.streaks[card.key]=0;
        delete arState.nextReview[card.key];
        // Update surah map ayah block instantly
        var _arParts2=card.key.split('_');
        if(typeof qmSync==='function')qmSync(parseInt(_arParts2[0]),parseInt(_arParts2[1]),'struggling');
        if(typeof smRender==='function')setTimeout(smRender,50);
      }
      arState.todayDone=(arState.todayDone||0)+1;
      arState.todayIdx=(arState.todayIdx||0)+1;
      arSave();
      arRevealed=false;
      arRender();
    };
  });
}

setTimeout(function(){arRender();},800);

// ── AYAH COMPLETION ──
var AC_DATA = null;
var acState = JSON.parse(localStorage.getItem('dash_ac') || '{}');
function acSave(){ localStorage.setItem('dash_ac', JSON.stringify(acState)); }

function acTodayKey(){
  var n=new Date(); if(n.getHours()<4)n=new Date(n.getTime()-864e5);
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}

// Reuse quranMemory.json — loaded by ayah recall if that card exists, else fetch again
(function(){
  if(window.AR_DATA){AC_DATA=window.AR_DATA;acRender();return;}
  fetch('quranMemory.json')
    .then(function(r){return r.json();})
    .then(function(d){AC_DATA=d.surahs;acRender();})
    .catch(function(e){console.warn('quranMemory.json failed',e);});
})();

function acSplitAyah(text){
  // Split into prompt (first ~40% of words) and completion (rest)
  var words=text.split(' ');
  var splitAt=Math.max(1,Math.min(Math.floor(words.length*0.4),3));
  return {
    prompt: words.slice(0,splitAt).join(' '),
    completion: words.slice(splitAt).join(' ')
  };
}

function acGetWrongOptions(correctCompletion, juz, count){
  if(!AC_DATA)return[];
  var pool=[];
  AC_DATA.forEach(function(s){
    if(s.juz!==juz)return; // same juz for plausible distractors
    s.ayahs.forEach(function(txt){
      var sp=acSplitAyah(txt);
      if(sp.completion && sp.completion!==correctCompletion && sp.completion.split(' ').length>1){
        pool.push(sp.completion);
      }
    });
  });
  // Shuffle pool
  for(var i=pool.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=pool[i];pool[i]=pool[j];pool[j]=t;}
  return pool.slice(0,count);
}

function acEnsureState(){
  if(!acState.correct)acState.correct={};
  if(!acState.wrong)acState.wrong={};
  if(!acState.streaks)acState.streaks={};
  if(!acState.nextReview)acState.nextReview={};
  if(acState.todayDate!==acTodayKey()){
    acState.todayDate=acTodayKey();
    acState.todayDone=0;
    var todayKey=acTodayKey();
    var allKeys=[];
    if(AC_DATA)AC_DATA.forEach(function(s){
      s.ayahs.forEach(function(txt,i){
        if(acSplitAyah(txt).completion.split(' ').length>1)
          allKeys.push(s.n+'_'+(i+1));
      });
    });
    var newCards=allKeys.filter(function(k){return !acState.correct[k];});
    var reviewCards=allKeys.filter(function(k){
      if(!acState.correct[k])return false;
      var nr=acState.nextReview[k];
      return !nr||nr<=todayKey;
    });
    for(var i=newCards.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=newCards[i];newCards[i]=newCards[j];newCards[j]=t;}
    acState.todayQueue=[].concat(reviewCards,newCards.slice(0,6));
    acState.todayIdx=0;
  }
  if(!acState.todayQueue)acState.todayQueue=[];
}

function acGetCard(){
  if(!AC_DATA)return null;
  acEnsureState();
  while(acState.todayIdx<acState.todayQueue.length){
    var key=acState.todayQueue[acState.todayIdx];
    var parts=key.split('_');
    var sn=parseInt(parts[0]),an=parseInt(parts[1]);
    var surah=AC_DATA.find(function(s){return s.n===sn;});
    if(surah&&surah.ayahs[an-1]){
      var sp=acSplitAyah(surah.ayahs[an-1]);
      if(sp.completion.split(' ').length>1)
        return {key:key,surah:surah,ayahNum:an,prompt:sp.prompt,completion:sp.completion,juz:surah.juz};
    }
    acState.todayIdx++;
  }
  return null;
}

var acAnswered=false;
var acCurrentCard=null;
var acCurrentOpts=null;

function acRender(){
  var el=document.getElementById('ac-body');
  var badge=document.getElementById('ac-badge');
  if(!el)return;

  if(!AC_DATA){
    el.innerHTML='<div style="font-size:11px;color:var(--dim);padding:10px">Loading...</div>';
    return;
  }

  acEnsureState();
  var tab=acState._tab||'study';
  var correctCount=Object.keys(acState.correct).length;
  var totalCards=0;
  if(AC_DATA)AC_DATA.forEach(function(s){s.ayahs.forEach(function(txt){if(acSplitAyah(txt).completion.split(' ').length>1)totalCards++;});});
  if(badge){badge.textContent=correctCount+'/'+totalCards;badge.style.display='';}

  var h='';
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
  [{t:'study',l:'STUDY'},{t:'stats',l:'STATS'},{t:'settings',l:'\u2699'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-actab="'+x.t+'" style="font-size:9px;padding:3px 10px;border:1px solid '+(a?'rgba(0,229,255,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'#00e5ff':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='study'){
    var card=acGetCard();
    var done=acState.todayDone||0;
    var total=acState.todayQueue?acState.todayQueue.length:0;

    var ultraAC=!!acState._ultra;
    // Progress bar
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:10px;color:var(--dim)">';
    h+='<span style="color:#00e5ff">'+done+'</span><span>/'+total+' today'+(ultraAC?' ⚡':'')+'</span>';
    h+='<div style="flex:1;height:2px;background:rgba(255,255,255,.06)"><div style="height:100%;width:'+(total?done/total*100:0)+'%;background:#00e5ff;transition:width .3s"></div></div>';
    h+='</div>';
    h+='<div style="text-align:right;margin-bottom:10px">';
    h+='<button data-acultra="1" style="font-size:9px;padding:2px 10px;background:rgba(0,229,255,'+(ultraAC?'.15':'0')+');border:1px solid rgba(0,229,255,'+(ultraAC?'.5':'.2')+');color:'+(ultraAC?'#00e5ff':'rgba(255,255,255,.3)')+';font-family:monospace;cursor:pointer;letter-spacing:1px">⚡ ULTRA</button>';
    h+='</div>';

    if(!card){
      h+='<div style="padding:20px;text-align:center;border:1px solid rgba(0,229,255,.15);background:rgba(0,229,255,.04)">';
      h+='<div style="font-size:28px;margin-bottom:8px">✅</div>';
      h+='<div style="font-size:13px;color:#00e5ff;margin-bottom:4px">All done for today.</div>';
      h+='<div style="font-size:10px;color:var(--dim)">'+correctCount+' completions mastered</div>';
      h+='</div>';
    } else {
      acCurrentCard=card;
      acAnswered=false;
      var streak=acState.streaks&&acState.streaks[card.key]||0;
      var isReview=!!acState.correct[card.key];

      h+='<div style="font-size:9px;color:rgba(0,229,255,.5);letter-spacing:1px;margin-bottom:8px">';
      h+=card.surah.name+' · Ayah '+card.ayahNum+(isReview?' · review':'')+(streak>=3?' · '+'★'.repeat(Math.min(streak,6)):'');
      h+='</div>';

      // Prompt
      h+='<div style="font-size:26px;font-family:\'Scheherazade New\',serif;direction:rtl;text-align:right;';
      h+='padding:12px;background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.15);margin-bottom:12px;line-height:1.8;color:#00e5ff">';
      h+=card.prompt+' <span style="opacity:.3">...</span></div>';

      // Build options
      var wrongs=acGetWrongOptions(card.completion,card.juz,3);
      var opts=[{t:card.completion,c:true}].concat(wrongs.map(function(w){return{t:w,c:false};}));
      // Shuffle
      for(var oi=opts.length-1;oi>0;oi--){var oj=Math.floor(Math.random()*(oi+1));var ot=opts[oi];opts[oi]=opts[oj];opts[oj]=ot;}
      acCurrentOpts=opts;

      h+='<div style="display:flex;flex-direction:column;gap:8px">';
      opts.forEach(function(opt,idx){
        h+='<button data-acopt="'+idx+'" data-accorrect="'+(opt.c?'1':'0')+'" ';
        h+='style="padding:10px 12px;background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.15);';
        h+='color:var(--text);font-family:\'Scheherazade New\',serif;font-size:22px;direction:rtl;';
        h+='text-align:right;cursor:pointer;line-height:1.6;width:100%">'+opt.t+'</button>';
      });
      h+='</div>';

      // Don't know button
      h+='<button data-acdontknow="1" style="margin-top:8px;width:100%;padding:7px;background:transparent;';
      h+='border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.65);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:1px">I DON\'T KNOW</button>';
    }

  } else if(tab==='settings'){
    h+='<div style="font-size:9px;color:rgba(0,229,255,.6);letter-spacing:2px;margin-bottom:10px">ARABIC TEXT STYLE</div>';
    DUA_ARABIC_FONTS.forEach(function(f){
      var a=_acFont===f.key;
      h+='<div data-acfont="'+f.key+'" style="display:flex;align-items:center;gap:12px;padding:10px;margin-bottom:6px;border:1px solid rgba(0,229,255,'+(a?'.4':'.1')+');background:rgba(0,229,255,'+(a?'.06':'0')+');cursor:pointer">';
      h+='<div style="flex:1"><div style="font-size:11px;color:'+(a?'#00e5ff':'var(--text)')+'">'+f.name+'</div>';
      h+='<div style="font-size:24px;font-family:'+f.css+';direction:rtl;text-align:right;color:'+(a?'#00e5ff':'var(--dim)')+';margin-top:4px">\u0628\u0650\u0633\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650</div></div>';
      if(a)h+='<span style="color:#00e5ff;font-size:18px">\u2713</span>';
      h+='</div>';
    });

  } else {
    // STATS
    var juz30=AC_DATA.filter(function(s){return s.juz===30;});
    var juz29=AC_DATA.filter(function(s){return s.juz===29;});
    var juz28=AC_DATA.filter(function(s){return s.juz===28;});
    function juzCorrect(surahs){var tot=0;surahs.forEach(function(s){s.ayahs.forEach(function(_,i){if(acState.correct[s.n+'_'+(i+1)])tot++;});});return tot;}
    function juzTotal2(surahs){var tot=0;surahs.forEach(function(s){s.ayahs.forEach(function(txt){if(acSplitAyah(txt).completion.split(' ').length>1)tot++;});});return tot;}

    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">';
    [{l:'Juz 30',k:juzCorrect(juz30),t:juzTotal2(juz30)},{l:'Juz 29',k:juzCorrect(juz29),t:juzTotal2(juz29)},{l:'Juz 28',k:juzCorrect(juz28),t:juzTotal2(juz28)}].forEach(function(x){
      h+='<div style="text-align:center;padding:8px;background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.1)">';
      h+='<div style="font-size:20px;color:#00e5ff;font-family:VT323,monospace">'+x.k+'/'+x.t+'</div>';
      h+='<div style="font-size:9px;color:var(--dim)">'+x.l+'</div>';
      h+='</div>';
    });
    h+='</div>';
    h+='<div style="font-size:9px;color:var(--dim);margin-top:4px;opacity:.5">'+totalCards+' total completions · 6 new per day</div>';
  }

  el.innerHTML=h;

  el.querySelectorAll('[data-actab]').forEach(function(b){
    b.onclick=function(){acState._tab=this.dataset.actab;acSave();acRender();};
  });
  var acUltraBtn2=el.querySelector('[data-acultra]');
  if(acUltraBtn2)acUltraBtn2.onclick=function(){
    acState._ultra=!acState._ultra;
    if(acState._ultra){
      acEnsureState();
      var acExtraNew2=[];var acExtraRev2=[];
      if(AC_DATA){AC_DATA.forEach(function(s){
        var sst=smState&&smState.surah&&smState.surah[String(s.n)]||null;
        s.ayahs.forEach(function(txt,i){
          if(acSplitAyah(txt).completion.split(' ').length<2)return;
          var k=s.n+'_'+(i+1);
          if(!acState.correct[k]&&sst&&(acState.todayQueue||[]).indexOf(k)<0)acExtraNew2.push(k);
          else if(acState.correct[k]&&(acState.todayQueue||[]).indexOf(k)<0)acExtraRev2.push(k);
        });
      });}
      for(var xi=acExtraRev2.length-1;xi>0;xi--){var xj=Math.floor(Math.random()*(xi+1));var xt=acExtraRev2[xi];acExtraRev2[xi]=acExtraRev2[xj];acExtraRev2[xj]=xt;}
      acState.todayQueue=(acState.todayQueue||[]).concat(acExtraNew2.slice(0,15),acExtraRev2.slice(0,25));
    }
    acSave();acRender();
  };
  el.querySelectorAll('[data-acfont]').forEach(function(b){
    b.onclick=function(){_acFont=this.dataset.acfont;localStorage.setItem('ac_font',_acFont);acRender();};
  });

  el.querySelectorAll('[data-acopt]').forEach(function(btn){
    btn.onclick=function(){
      if(acAnswered)return;
      acAnswered=true;
      var isCorrect=this.dataset.accorrect==='1';
      // Visual feedback
      el.querySelectorAll('[data-acopt]').forEach(function(b2){
        if(b2.dataset.accorrect==='1'){b2.style.background='rgba(0,255,136,.18)';b2.style.borderColor='#00ff88';b2.style.color='#00ff88';}
        else if(b2===btn&&!isCorrect){b2.style.background='rgba(255,68,68,.15)';b2.style.borderColor='var(--cr)';b2.style.color='var(--cr)';}
        b2.onclick=null;
      });
      var dkBtn2=el.querySelector('[data-acdontknow]');if(dkBtn2)dkBtn2.onclick=null;
      var card=acCurrentCard;
      acEnsureState();
      var _acParts=card.key.split('_');
      if(isCorrect){
        if(typeof hap==='function')hap(HAP.check);
        acState.correct[card.key]=true;
        acState.streaks[card.key]=(acState.streaks[card.key]||0)+1;
        var stk=acState.streaks[card.key];
        var coolDays=stk>=6?30:stk>=3?7:0;
        if(coolDays>0){var nr=new Date();nr.setDate(nr.getDate()+coolDays);acState.nextReview[card.key]=nr.toISOString().slice(0,10);}
        if(typeof qmSync==='function')qmSync(parseInt(_acParts[0]),parseInt(_acParts[1]),'memorized');
        if(typeof qmCheckAutoPromote==='function')setTimeout(function(){qmCheckAutoPromote(parseInt(_acParts[0]));},100);
        if(typeof smRender==='function')setTimeout(smRender,50);
      } else {
        if(typeof hap==='function')hap(HAP.error);
        acState.streaks[card.key]=0;
        delete acState.nextReview[card.key];
        if(typeof qmSync==='function')qmSync(parseInt(_acParts[0]),parseInt(_acParts[1]),'struggling');
        if(typeof smRender==='function')setTimeout(smRender,50);
      }
      acState.todayDone=(acState.todayDone||0)+1;
      acState.todayIdx=(acState.todayIdx||0)+1;
      acSave();
      if(isCorrect){
        // Auto-advance on correct
        setTimeout(function(){acAnswered=false;acRender();},1200);
      } else {
        // Show NEXT button on wrong
        var _acNBtn=document.createElement('button');
        _acNBtn.textContent='NEXT →';
        _acNBtn.style.cssText='width:100%;margin-top:8px;padding:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.2);color:var(--text);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:2px';
        var _acNext=function(){acAnswered=false;acRender();};
        _acNBtn.onclick=_acNext;
        _acNBtn.ontouchend=function(e){e.preventDefault();_acNext();};
        // Find the choices container and append after it
        var _acChoices=el.querySelector('[data-acopt]');
        if(_acChoices&&_acChoices.parentNode)_acChoices.parentNode.appendChild(_acNBtn);
        else el.appendChild(_acNBtn);
      }
    };
  });

  var dkBtn=el.querySelector('[data-acdontknow]');
  if(dkBtn){
    var _acDkConfirmed=false;
    dkBtn.onclick=function(){
      if(acAnswered)return;
      if(!_acDkConfirmed){
        dkBtn.textContent='ARE YOU SURE?';
        dkBtn.style.color='rgba(255,184,108,.8)';
        dkBtn.style.borderColor='rgba(255,184,108,.4)';
        _acDkConfirmed=true;
        setTimeout(function(){_acDkConfirmed=false;dkBtn.textContent="I DON'T KNOW";dkBtn.style.color='rgba(255,255,255,.65)';dkBtn.style.borderColor='rgba(255,255,255,.3)';},2500);
        return;
      }
      acAnswered=true;
      el.querySelectorAll('[data-acopt]').forEach(function(b2){
        if(b2.dataset.accorrect==='1'){b2.style.background='rgba(0,255,136,.18)';b2.style.borderColor='#00ff88';b2.style.color='#00ff88';}
        b2.onclick=null;
      });
      this.style.borderColor='var(--cr)';this.style.color='var(--cr)';this.onclick=null;
      var card=acCurrentCard;
      acEnsureState();
      if(typeof hap==='function')hap(HAP.error);
      acState.streaks[card.key]=0;
      delete acState.nextReview[card.key];
      // Update surah map instantly
      var _dkp=card.key.split('_');
      if(typeof qmSync==='function')qmSync(parseInt(_dkp[0]),parseInt(_dkp[1]),'struggling');
      if(typeof smRender==='function')setTimeout(smRender,50);
      acState.todayDone=(acState.todayDone||0)+1;
      acState.todayIdx=(acState.todayIdx||0)+1;
      acSave();
      // Show NEXT button
      var _dkNBtn=document.createElement('button');
      _dkNBtn.textContent='NEXT →';
      _dkNBtn.style.cssText='width:100%;margin-top:8px;padding:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.2);color:var(--text);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:2px';
      var _dkNext=function(){acAnswered=false;acRender();};
      _dkNBtn.onclick=_dkNext;
      _dkNBtn.ontouchend=function(e){e.preventDefault();_dkNext();};
      var _dkDkBtn=el.querySelector('[data-acdontknow]');
      if(_dkDkBtn&&_dkDkBtn.parentNode)_dkDkBtn.parentNode.insertBefore(_dkNBtn,_dkDkBtn.nextSibling);
      else el.appendChild(_dkNBtn);
    };
  }
}

setTimeout(function(){acRender();},900);

// ── SURAH MAP ──
var SM_DATA = null;
var smState = JSON.parse(localStorage.getItem('dash_sm') || '{}');
function smSave(){ localStorage.setItem('dash_sm', JSON.stringify(smState)); }

(function(){
  if(window.AR_DATA){SM_DATA=window.AR_DATA;smRender();return;}
  fetch('quranMemory.json')
    .then(function(r){return r.json();})
    .then(function(d){SM_DATA=d.surahs;smRender();})
    .catch(function(e){console.warn('quranMemory.json failed',e);});
})();

// Status per ayah: 'memorized' | 'reviewing' | 'struggling' | null
function smGetStatus(key){
  return (smState.status&&smState.status[key])||null;
}
function smSetStatus(key, val){
  if(!smState.status)smState.status={};
  if(val)smState.status[key]=val;
  else delete smState.status[key];
  smSave();
}
function smCycleStatus(key){
  var cur=smGetStatus(key);
  var next=cur===null?'memorized':cur==='memorized'?'reviewing':cur==='reviewing'?'struggling':null;
  smSetStatus(key,next);
  smRender();
}

// ── SURAH MAP STATE HELPERS (module-level so event handlers can access) ──
var SM_STATES={
  'none':     {col:'rgba(255,255,255,.1)',  label:'Not Started',   icon:'○'},
  'learning': {col:'rgba(255,204,0,.85)',   label:'Learning',      icon:'◑'},
  'memorized':{col:'rgba(126,184,255,.85)', label:'Memorized',     icon:'✓'},
  'revision': {col:'rgba(255,68,68,.8)',    label:'Needs Revision', icon:'↻'}
};
function smKey(st){return st||'none';}
function smStateInfo(st){
  var k=st||'none';
  return SM_STATES[k]||SM_STATES['none'];
}
function smNextState(cur){
  var cycle=[null,'learning','memorized','revision'];
  var i=cycle.indexOf(cur);
  return cycle[(i+1)%cycle.length];
}
function smSurahCol(n){return smStateInfo(smState.surah[String(n)]||null).col;}
function smAyahCol(key,surahN){
  // Check individual ayah override first
  var ast=smState.status&&smState.status[key]||null;
  if(ast&&SM_STATES[ast])return SM_STATES[ast].col;
  // Fall back to surah-level state
  var sst=smState.surah&&smState.surah[String(surahN)]||null;
  return SM_STATES[sst||'none']?SM_STATES[sst||'none'].col:SM_STATES['none'].col;
}

function smRender(){
  var el=document.getElementById('sm-body');
  var badge=document.getElementById('sm-badge');
  if(!el)return;
  el.style.maxHeight='600px';
  el.style.overflowY='auto';
  if(!SM_DATA){el.innerHTML='<div style="font-size:11px;color:var(--dim);padding:10px">Loading...</div>';return;}

  if(!smState.surah)smState.surah={};   // {n: 'learning'|'memorized'|'revision'|null}
  if(!smState.status)smState.status={}; // {n_ayah: 'memorized'|'reviewing'|'struggling'|null}

  var tab=smState._tab||'map';

  // Counts
  var total=SM_DATA.reduce(function(a,s){return a+s.ayahs.length;},0);
  var sMem=SM_DATA.filter(function(s){return smState.surah[String(s.n)]==='memorized';}).length;
  var sLearn=SM_DATA.filter(function(s){return smState.surah[String(s.n)]==='learning';}).length;
  var sRev=SM_DATA.filter(function(s){return smState.surah[String(s.n)]==='revision';}).length;
  if(badge){badge.textContent=sMem+'/'+SM_DATA.length+' surahs';badge.style.display='';}

  // State colors & labels
  // State helpers defined at module level (see below smRender)

  var h='';

  // Tab bar
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
  [{t:'map',l:'MAP'},{t:'stats',l:'STATS'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-smtab="'+x.t+'" style="font-size:9px;padding:3px 10px;border:1px solid '+(a?'rgba(126,184,255,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'#7eb8ff':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  // Legend
  h+='<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">';
  ['none','learning','memorized','revision'].forEach(function(k){
    var s=SM_STATES[k];
    h+='<span style="font-size:9px;color:var(--dim);display:flex;align-items:center;gap:4px">'
      +'<span style="display:inline-block;width:9px;height:9px;background:'+s.col+';border-radius:1px"></span>'+s.label+'</span>';
  });
  h+='</div>';

  if(tab==='map'){
    if(!smState._collapsed)smState._collapsed={};
    [30,29,28].forEach(function(juz){
      var juzSurahs=SM_DATA.filter(function(s){return s.juz===juz;});
      var collapsed=!!smState._collapsed[juz];
      var juzMem=juzSurahs.filter(function(s){return smState.surah[String(s.n)]==='memorized';}).length;
      var juzLearn=juzSurahs.filter(function(s){return smState.surah[String(s.n)]==='learning';}).length;
      var juzRev=juzSurahs.filter(function(s){return smState.surah[String(s.n)]==='revision';}).length;
      h+='<div style="margin-bottom:14px">';
      // Collapsible header
      h+='<div data-smcollapse="'+juz+'" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(126,184,255,.05);border:1px solid rgba(126,184,255,.15);cursor:pointer;margin-bottom:'+(collapsed?'0':'8px')+'">';
      h+='<span style="font-size:11px;color:#7eb8ff;font-weight:bold">JUZ '+juz+'</span>';
      h+='<span style="font-size:9px;color:var(--dim);flex:1">';
      if(juzMem)h+='<span style="color:rgba(126,184,255,.7)">'+juzMem+' mem</span> ';
      if(juzLearn)h+='<span style="color:rgba(255,204,0,.7)">'+juzLearn+' learning</span> ';
      if(juzRev)h+='<span style="color:rgba(255,68,68,.7)">'+juzRev+' revision</span>';
      h+='</span>';
      h+='<span style="font-size:10px;color:var(--dim)">'+( collapsed?'▸':'▾')+'</span>';
      h+='</div>';
      if(collapsed){h+='</div>';return;}
      juzSurahs.forEach(function(s){
        var sst=smState.surah[String(s.n)]||null;
        var ssInfo=smStateInfo(sst);
        var _smColMap={
          'learning': {border:'rgba(255,204,0,.35)',  bg:'rgba(255,204,0,.06)'},
          'memorized':{border:'rgba(126,184,255,.35)',bg:'rgba(126,184,255,.06)'},
          'revision': {border:'rgba(255,68,68,.35)',  bg:'rgba(255,68,68,.06)'},
          'none':     {border:'rgba(255,255,255,.08)',bg:'rgba(255,255,255,.02)'}
        };
        var _smC=_smColMap[sst||'none']||_smColMap['none'];
        var borderCol=_smC.border;
        var bgCol=_smC.bg;

        // Unified card — surah header + ayah blocks all inside one border
        h+='<div style="margin-bottom:8px;border:1px solid '+borderCol+';background:'+bgCol+';border-radius:3px;overflow:hidden">';

        // Surah header row
        h+='<div data-smsurahn="'+s.n+'" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.06)">';
        h+='<span style="font-size:9px;color:rgba(255,255,255,.3);min-width:24px;text-align:right;font-family:monospace">'+s.n+'</span>';
        var _nameCol=sst&&SM_STATES[sst]?SM_STATES[sst].col:'var(--text)';
        h+='<span style="font-size:12px;color:'+_nameCol+';flex:1;font-weight:'+(sst?'bold':'normal')+'">'+s.name+'</span>';
        h+='<span style="font-size:9px;color:var(--dim)">'+s.ayahs.length+' ayahs</span>';
        h+='<span style="font-size:13px;color:'+ssInfo.col+'">'+ssInfo.icon+'</span>';
        h+='</div>';

        // Ayah blocks — flush inside the card
        h+='<div style="padding:8px 12px;display:flex;flex-wrap:wrap;gap:3px">';
        s.ayahs.forEach(function(_,i){
          var key=s.n+'_'+(i+1);
          var col=smAyahCol(key,s.n);
          var _numCol=(!sst||sst==='none')?'rgba(255,255,255,.4)':'rgba(0,0,0,.6)';
          h+='<div data-smayahkey="'+key+'" style="width:21px;height:21px;background:'+col+';border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center">'
          +'<span style="font-size:8px;font-family:monospace;color:'+_numCol+';font-weight:bold;line-height:1;user-select:none">'+(i+1)+'</span>'
          +'</div>';
        });
        h+='</div>';

        h+='</div>'; // card
      });
      h+='</div>';
    });

    // Bulk actions
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)">';
    h+='<span style="font-size:9px;color:var(--dim)">Bulk:</span>';
    [{st:'learning',l:'All Learning'},{st:'memorized',l:'All Memorized'},{st:'revision',l:'All Revision'},{st:'null',l:'Clear All'}].forEach(function(x){
      h+='<span data-smbulk="'+x.st+'" style="font-size:9px;padding:2px 8px;border:1px solid rgba(255,255,255,.1);color:var(--dim);cursor:pointer">'+x.l+'</span>';
    });
    h+='</div>';
    h+='<div style="font-size:9px;color:var(--dim);margin-top:6px;opacity:.5">Tap surah row to cycle state · tap ayah block to cycle individually</div>';

  } else {
    // STATS
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">';
    [{v:sLearn,l:'learning',c:SM_STATES.learning.col},{v:sMem,l:'memorized',c:SM_STATES.memorized.col},{v:sRev,l:'needs revision',c:SM_STATES.revision.col},{v:SM_DATA.length-sLearn-sMem-sRev,l:'not started',c:SM_STATES.none.col}].forEach(function(x){
      h+='<div style="text-align:center;padding:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)">';
      h+='<div style="font-size:24px;color:'+x.c+';font-family:VT323,monospace">'+x.v+'</div>';
      h+='<div style="font-size:9px;color:var(--dim)">'+x.l+'</div>';
      h+='</div>';
    });
    h+='</div>';
    [30,29,28].forEach(function(juz){
      var juzS=SM_DATA.filter(function(s){return s.juz===juz;});
      var jMem=juzS.filter(function(s){return smState.surah[String(s.n)]==='memorized';}).length;
      var pct=Math.round(jMem/juzS.length*100);
      h+='<div style="margin-bottom:8px;display:flex;align-items:center;gap:8px">';
      h+='<span style="font-size:10px;color:var(--dim);min-width:40px">Juz '+juz+'</span>';
      h+='<div style="flex:1;height:5px;background:rgba(255,255,255,.06);border-radius:2px"><div style="height:100%;width:'+pct+'%;background:#7eb8ff;border-radius:2px"></div></div>';
      h+='<span style="font-size:9px;color:var(--dim);min-width:40px;text-align:right">'+jMem+'/'+juzS.length+'</span>';
      h+='</div>';
    });
  }

  el.innerHTML=h;

  el.querySelectorAll('[data-smtab]').forEach(function(b){
    b.onclick=function(){smState._tab=this.dataset.smtab;smSave();smRender();};
  });
  el.querySelectorAll('[data-smcollapse]').forEach(function(b){
    b.onclick=function(){
      var juz=parseInt(this.dataset.smcollapse);
      if(!smState._collapsed)smState._collapsed={};
      smState._collapsed[juz]=!smState._collapsed[juz];
      smSave();smRender();
    };
  });

  // Surah row cycle — scroll-aware
  el.querySelectorAll('[data-smsurahn]').forEach(function(b){
    var _ty=0;
    b.ontouchstart=function(e){_ty=e.touches[0].clientY;};
    var fn=function(){
      var n=parseInt(this.dataset.smsurahn);
      var cur=smState.surah[String(n)]||null;
      var next=smNextState(cur);
      smState.surah[String(n)]=next;
      if(typeof qmSyncSurahState==='function')qmSyncSurahState(n,next);
      if(typeof hap==='function')hap(HAP.tap);
      smSave();smRender();
    };
    b.ontouchend=function(e){
      if(Math.abs(e.changedTouches[0].clientY-_ty)>8)return;
      e.preventDefault();fn.call(this);
    };
    b.onclick=fn;
  });

  // Ayah block cycle
  el.querySelectorAll('[data-smayahkey]').forEach(function(block){
    var touchStartY=0;
    block.ontouchstart=function(e){touchStartY=e.touches[0].clientY;};
    var fn=function(){
      var key=this.dataset.smayahkey;
      var cur=smState.status[key]||null;
      // Ayah-level cycles: null→memorized→revision→null
      var ayahCycle=[null,'memorized','revision'];
      var i=ayahCycle.indexOf(cur);
      var next=ayahCycle[(i+1)%ayahCycle.length];
      if(next)smState.status[key]=next; else delete smState.status[key];
      if(typeof hap==='function')hap(HAP.tap);
      smSave();smRender();
    };
    block.ontouchend=function(e){
      if(Math.abs(e.changedTouches[0].clientY-touchStartY)>8)return;
      e.preventDefault();fn.call(this);
    };
    block.onclick=fn;
  });

  // Bulk actions
  el.querySelectorAll('[data-smbulk]').forEach(function(b){
    b.onclick=function(){
      var st=this.dataset.smbulk;
      var val=st==='null'?null:st;
      SM_DATA.forEach(function(s){
        smState.surah[String(s.n)]=val;
        if(typeof qmSyncSurahState==='function')qmSyncSurahState(s.n,val);
      });
      smSave();smRender();
    };
  });
}

setTimeout(function(){smRender();},1000);

// ── VOICE STUDY ──
var VS_DATA = null;
var vsState = JSON.parse(localStorage.getItem('dash_vs') || '{}');
function vsSave(){ localStorage.setItem('dash_vs', JSON.stringify(vsState)); }

(function(){
  fetch('voiceStudy.json')
    .then(function(r){return r.json();})
    .then(function(d){VS_DATA=d;vsRender();})
    .catch(function(e){console.warn('voiceStudy.json failed',e);});
})();

function vsGetStudied(id){ return !!(vsState.studied&&vsState.studied[id]); }
function vsMarkStudied(id){ if(!vsState.studied)vsState.studied={}; vsState.studied[id]=true; vsSave(); }

function vsRender(){
  var el=document.getElementById('vs-body');
  var badge=document.getElementById('vs-badge');
  if(!el)return;
  el.style.maxHeight='600px';
  el.style.overflowY='auto';
  if(!VS_DATA){el.innerHTML='<div style="font-size:11px;color:var(--dim);padding:10px">Loading...</div>';return;}

  var tab=vsState._tab||'read';
  var cat=vsState._cat||VS_DATA.categories[0].id;
  var catData=VS_DATA.categories.find(function(c){return c.id===cat;})||VS_DATA.categories[0];
  var totalStudied=0;
  var totalAll=0;
  VS_DATA.categories.forEach(function(c){c.entries.forEach(function(e){totalAll++;if(vsGetStudied(e.id))totalStudied++;});});
  if(badge){badge.textContent=totalStudied+'/'+totalAll;badge.style.display='';}

  var h='';

  // Tab bar
  h+='<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">';
  [{t:'read',l:'READ'},{t:'browse',l:'BROWSE'},{t:'stats',l:'STATS'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-vstab="'+x.t+'" style="font-size:9px;padding:3px 10px;border:1px solid '+(a?'rgba(80,250,123,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'var(--cg)':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='read'){
    vsEnsureDaily();
    var todayEntry=vsGetTodayEntry();
    var newDone=vsState.todayNewDone||0;
    var newTotal=(vsState.todayNew||[]).length;
    var revDone=vsState.todayReviewDone||0;
    var revTotal=(vsState.todayReview||[]).length;
    var allDone=!todayEntry;

    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:10px;color:var(--dim)">';
    h+='<span style="color:var(--cg)">'+newDone+'</span><span>/'+newTotal+' new</span>';
    if(revTotal>0)h+='<span style="margin-left:6px;color:rgba(80,250,123,.5)">'+revDone+'/'+revTotal+' review</span>';
    h+='<div style="flex:1;height:2px;background:rgba(255,255,255,.06)"><div style="height:100%;width:'+((newDone+revDone)/Math.max(newTotal+revTotal,1)*100)+'%;background:var(--cg);transition:width .3s"></div></div>';
    h+='</div>';

    if(allDone){
      h+='<div style="padding:20px;text-align:center;border:1px solid rgba(80,250,123,.15);background:rgba(80,250,123,.04)">';
      h+='<div style="font-size:24px;margin-bottom:8px">✅</div>';
      h+='<div style="font-size:13px;color:var(--cg);margin-bottom:4px">All done for today.</div>';
      h+='<div style="font-size:10px;color:var(--dim)">'+totalStudied+' entries studied · come back tomorrow</div>';
      h+='</div>';
    } else {
      var entry=todayEntry.entry;
      var catData=todayEntry.cat;
      var entryType=todayEntry.type;
      var revealed=vsState._revealed===entry.id;

      h+='<div style="border:1px solid rgba(255,255,255,.1);padding:14px;margin-bottom:10px">';
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">';
      h+='<div style="font-size:9px;color:'+catData.color+';letter-spacing:1px">'+catData.name+'</div>';
      h+='<span style="margin-left:auto;font-size:9px;padding:2px 7px;border:1px solid rgba(255,255,255,.15);color:'+(entryType==='review'?'var(--cc)':'var(--cg)')+'">'+entryType.toUpperCase()+'</span>';
      h+='</div>';
      h+='"'+entry.excerpt+'"</div>';
      h+='<div style="font-size:11px;color:var(--text);line-height:1.8;font-style:italic;margin-bottom:14px;padding:0 12px;border-left:2px solid '+catData.color+'40">';
      // Author + work label
      h+='<div style="font-size:9px;color:var(--dim);margin-bottom:8px;letter-spacing:1px">';
      h+='<span style="color:var(--text)">'+entry.author+'</span>';
      h+=' · <em>'+entry.work+'</em>';
      h+='</div>';
      if(!revealed){
        h+='<button data-vsreveal="'+entry.id+'" style="width:100%;padding:9px;background:transparent;border:1px solid rgba(80,250,123,.3);color:var(--cg);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:2px">WHAT TO NOTICE</button>';
      } else {
        h+='<div style="padding:10px;background:rgba(80,250,123,.05);border:1px solid rgba(80,250,123,.2);font-size:12px;color:var(--dim);line-height:1.7;margin-bottom:8px">'+entry.notice+'</div>';
        h+='<button data-vscopy="1" style="width:100%;padding:7px;margin-bottom:10px;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--dim);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:1px">📋 COPY FOR AI</button>';
        if(!vsGetStudied(entry.id)){
          h+='<button data-vsmark="'+entry.id+'" data-vstype="'+entryType+'" style="width:100%;padding:9px;background:rgba(80,250,123,.08);border:1px solid rgba(80,250,123,.4);color:var(--cg);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:2px">✓ MARK STUDIED · NEXT</button>';
        } else {
          h+='<button data-vsnext="'+entryType+'" style="width:100%;padding:9px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:2px">NEXT →</button>';
        }
      }
      h+='</div>';
    }
  } else if(tab==='browse'){
    if(!vsState._expanded)vsState._expanded={};
    VS_DATA.categories.forEach(function(c){
      h+='<div style="margin-bottom:16px">';
      h+='<div style="font-size:9px;color:'+c.color+';letter-spacing:2px;margin-bottom:8px">'+c.name.toUpperCase()+'</div>';
      c.entries.forEach(function(e){
        var studied=vsGetStudied(e.id);
        var expanded=!!vsState._expanded[e.id];
        h+='<div style="border-bottom:1px solid rgba(255,255,255,.05);padding:6px 0">';
        h+='<div style="display:flex;align-items:center;gap:8px">';
        h+='<span style="font-size:12px;color:'+(studied?'var(--cg)':'rgba(255,255,255,.2)')+';flex-shrink:0">'+( studied?'✓':'○')+'</span>';
        h+='<div style="flex:1;min-width:0"><div style="font-size:11px;color:var(--text)">'+e.author+'</div>';
        h+='<div style="font-size:9px;color:var(--dim)">'+e.work+'</div></div>';
        h+='<button data-vsexpand="'+e.id+'" style="flex-shrink:0;padding:2px 8px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;font-size:9px;cursor:pointer">'+(expanded?'▴':'▾')+'</button>';
        h+='</div>';
        if(expanded){
          h+='<div style="margin:8px 0 4px 20px;padding:10px;background:rgba(255,255,255,.03);border-left:2px solid '+c.color+'40">';
          h+='<div style="font-size:12px;color:var(--text);line-height:1.8;font-style:italic;margin-bottom:8px">&ldquo;'+e.excerpt+'&rdquo;</div>';
          h+='<div style="font-size:11px;color:var(--dim);line-height:1.6">'+e.notice+'</div>';
          if(!studied)h+='<button data-vsmarkb="'+e.id+'" style="margin-top:8px;padding:4px 12px;background:rgba(80,250,123,.08);border:1px solid rgba(80,250,123,.3);color:var(--cg);font-family:monospace;font-size:9px;cursor:pointer;letter-spacing:1px">✓ MARK STUDIED</button>';
          h+='</div>';
        }
        h+='</div>';
      });
      h+='</div>';
    });

  } else {
    // STATS
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">';
    [{v:totalStudied,l:'studied'},{v:totalAll-totalStudied,l:'remaining'}].forEach(function(x){
      h+='<div style="text-align:center;padding:10px;background:rgba(80,250,123,.04);border:1px solid rgba(80,250,123,.1)">';
      h+='<div style="font-size:28px;color:var(--cg);font-family:VT323,monospace">'+x.v+'</div>';
      h+='<div style="font-size:9px;color:var(--dim)">'+x.l+'</div></div>';
    });
    h+='</div>';
    VS_DATA.categories.forEach(function(c){
      var done=c.entries.filter(function(e){return vsGetStudied(e.id);}).length;
      var pct=Math.round(done/c.entries.length*100);
      h+='<div style="margin-bottom:8px;display:flex;align-items:center;gap:8px">';
      h+='<span style="font-size:10px;color:var(--dim);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+c.name+'</span>';
      h+='<div style="width:80px;height:4px;background:rgba(255,255,255,.06);flex-shrink:0">';
      h+='<div style="height:100%;width:'+pct+'%;background:'+c.color+'"></div></div>';
      h+='<span style="font-size:9px;color:var(--dim);min-width:28px;text-align:right">'+done+'/'+c.entries.length+'</span>';
      h+='</div>';
    });
  }

  el.innerHTML=h;

  el.querySelectorAll('[data-vstab]').forEach(function(b){
    b.onclick=function(){vsState._tab=this.dataset.vstab;vsSave();vsRender();};
  });
  el.querySelectorAll('[data-vscat]').forEach(function(b){
    b.onclick=function(){vsState._cat=this.dataset.vscat;vsState._revealed=null;vsSave();vsRender();};
  });

  el.querySelectorAll('[data-vsexpand]').forEach(function(b){
    b.onclick=function(){
      var eid=this.dataset.vsexpand;
      if(!vsState._expanded)vsState._expanded={};
      vsState._expanded[eid]=!vsState._expanded[eid];
      vsSave();vsRender();
    };
  });
  el.querySelectorAll('[data-vsmarkb]').forEach(function(b){
    b.onclick=function(){
      vsMarkStudied(this.dataset.vsmarkb);
      if(typeof hap==='function')hap(HAP.check);
      vsSave();vsRender();
    };
  });
  var revBtn=el.querySelector('[data-vsreveal]');
  if(revBtn){
    revBtn.onclick=function(){
      vsState._revealed=this.dataset.vsreveal;
      vsSave();vsRender();
    };
  }
  var copyBtn=el.querySelector('[data-vscopy]');
  if(copyBtn){
    copyBtn.onclick=function(){
      var todayEnt=vsGetTodayEntry();
      var ent=todayEnt?todayEnt.entry:null;
      var cat=todayEnt?todayEnt.cat:null;
      if(!ent)return;
      var txt='VOICE STUDY — '+( cat?cat.name:'')+' ('+ent.author+', '+ent.work+')\n\n';
      txt+='EXCERPT:\n\"'+ent.excerpt+'\"\n\n';
      txt+='WHAT TO NOTICE:\n'+ent.notice+'\n\n';
      txt+='---\nPlease elaborate on this craft technique. What specifically makes it work? '+'Give me 2-3 concrete ways I can apply this in my own fiction writing, with brief examples.';
      var doCopy=function(t){
        if(navigator.clipboard){
          navigator.clipboard.writeText(t).catch(function(){
            var ta=document.createElement('textarea');ta.value=t;
            document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
          });
        } else {
          var ta=document.createElement('textarea');ta.value=t;
          document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
        }
      };
      doCopy(txt);
      copyBtn.textContent='✓ COPIED';
      copyBtn.style.color='var(--cg)';
      if(typeof hap==='function')hap(HAP.soft);
      setTimeout(function(){copyBtn.textContent='📋 COPY FOR AI';copyBtn.style.color='var(--dim)';},2000);
    };
  }

  var markBtn=el.querySelector('[data-vsmark]');
  if(markBtn){
    markBtn.onclick=function(){
      var t=this.dataset.vsmark;
      vsMarkStudied(t);
      vsState._revealed=null;
      if(t==='new')vsState.todayNewDone=(vsState.todayNewDone||0)+1;
      else if(t==='review')vsState.todayReviewDone=(vsState.todayReviewDone||0)+1;
      if(typeof hap==='function')hap(HAP.check);
      vsSave();vsRender();
    };
  }

  var nextBtn=el.querySelector('[data-vsnext]');
  if(nextBtn){
    var vsNextFn=function(){
      var t=nextBtn.dataset.vsnext;
      vsState._revealed=null;
      if(t==='new')vsState.todayNewDone=(vsState.todayNewDone||0)+1;
      else if(t==='review')vsState.todayReviewDone=(vsState.todayReviewDone||0)+1;
      vsSave();vsRender();
    };
    nextBtn.onclick=vsNextFn;
    nextBtn.ontouchend=function(e){e.preventDefault();e.stopPropagation();vsNextFn();};
  }
}

setTimeout(function(){vsRender();},1100);

// ── ARTICULATE ──
var ART_DATA = null;
var artState = JSON.parse(localStorage.getItem('dash_art') || '{}');
function artSave(){ localStorage.setItem('dash_art', JSON.stringify(artState)); }

(function(){
  fetch('articulate.json')
    .then(function(r){return r.json();})
    .then(function(d){ART_DATA=d;artRender();})
    .catch(function(e){console.warn('articulate.json failed',e);});
})();

function artStudied(id){ return !!(artState.studied&&artState.studied[id]); }
function artMarkStudied(id){ if(!artState.studied)artState.studied={}; artState.studied[id]=true; artSave(); }

function artRender(){
  var el=document.getElementById('art-body');
  var badge=document.getElementById('art-badge');
  if(!el)return;
  el.style.maxHeight='600px';
  el.style.overflowY='auto';
  if(!ART_DATA){el.innerHTML='<div style="font-size:11px;color:var(--dim);padding:10px">Loading...</div>';return;}

  var tab=artState._tab||'read';
  var catId=artState._cat||ART_DATA.categories[0].id;
  var catData=ART_DATA.categories.find(function(c){return c.id===catId;})||ART_DATA.categories[0];
  var totalStudied=0,totalAll=0;
  ART_DATA.categories.forEach(function(c){c.entries.forEach(function(e){totalAll++;if(artStudied(e.id))totalStudied++;});});
  if(badge){badge.textContent=totalStudied+'/'+totalAll;badge.style.display='';}

  var h='';
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">';
  [{t:'read',l:'READ'},{t:'browse',l:'BROWSE'},{t:'stats',l:'STATS'}].forEach(function(x){
    var a=tab===x.t;
    h+='<span data-arttab="'+x.t+'" style="font-size:9px;padding:3px 10px;border:1px solid '+(a?'rgba(255,184,108,.5)':'rgba(255,255,255,.1)')+';color:'+(a?'#ffb86c':'var(--dim)')+';cursor:pointer;letter-spacing:1px">'+x.l+'</span>';
  });
  h+='</div>';

  if(tab==='read'){
    artEnsureDaily();
    var todayEntryA=artGetTodayEntry();
    var newDoneA=artState.todayNewDone||0;
    var newTotalA=(artState.todayNew||[]).length;
    var revDoneA=artState.todayReviewDone||0;
    var revTotalA=(artState.todayReview||[]).length;
    var allDoneA=!todayEntryA;

    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:10px;color:var(--dim)">';
    h+='<span style="color:#ffb86c">'+newDoneA+'</span><span>/'+newTotalA+' new</span>';
    if(revTotalA>0)h+='<span style="margin-left:6px;color:rgba(255,184,108,.5)">'+revDoneA+'/'+revTotalA+' review</span>';
    h+='<div style="flex:1;height:2px;background:rgba(255,255,255,.06)"><div style="height:100%;width:'+((newDoneA+revDoneA)/Math.max(newTotalA+revTotalA,1)*100)+'%;background:#ffb86c;transition:width .3s"></div></div>';
    h+='</div>';

    if(allDoneA){
      h+='<div style="padding:20px;text-align:center;border:1px solid rgba(255,184,108,.15);background:rgba(255,184,108,.04)">';
      h+='<div style="font-size:24px;margin-bottom:8px">✅</div>';
      h+='<div style="font-size:13px;color:#ffb86c;margin-bottom:4px">All done for today.</div>';
      h+='<div style="font-size:10px;color:var(--dim)">'+totalStudied+' tips studied · come back tomorrow</div>';
      h+='</div>';
    } else {
      var entry=todayEntryA.entry;
      var catData=todayEntryA.cat;
      var entryTypeA=todayEntryA.type;
      var revealId=artState._revealed;

      h+='<div style="border:1px solid rgba(255,184,108,.2);background:rgba(255,184,108,.03);padding:14px;margin-bottom:10px">';
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
      h+='<div style="font-size:9px;color:'+catData.color+';letter-spacing:1px">'+catData.name+'</div>';
      h+='<span style="margin-left:auto;font-size:9px;padding:2px 7px;border:1px solid rgba(255,255,255,.15);color:'+(entryTypeA==='review'?'var(--cc)':'#ffb86c')+'">'+entryTypeA.toUpperCase()+'</span>';
      h+='</div>';
      h+='<div style="font-size:14px;color:#ffb86c;font-weight:bold;line-height:1.5;margin-bottom:12px">'+entry.tip+'</div>';
      h+='<div style="margin-bottom:10px;padding:10px;background:rgba(255,255,255,.04);border-left:2px solid rgba(255,184,108,.4)">';
      h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:4px">EXAMPLE</div>';
      h+='<div style="font-size:12px;color:var(--text);line-height:1.6">'+entry.example+'</div>';
      h+='</div>';
      if(revealId!==entry.id){
        h+='<button data-artreveal="'+entry.id+'" style="width:100%;padding:9px;background:transparent;border:1px solid rgba(255,184,108,.3);color:#ffb86c;font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:2px">REVEAL FULL TIP</button>';
      } else {
        h+='<div style="margin-bottom:8px;padding:10px;background:rgba(255,85,85,.05);border-left:2px solid rgba(255,85,85,.4)">';
        h+='<div style="font-size:9px;color:rgba(255,85,85,.7);letter-spacing:1px;margin-bottom:4px">DON\'T</div>';
        h+='<div style="font-size:12px;color:var(--dim);line-height:1.6">'+entry.not+'</div></div>';
        h+='<div style="margin-bottom:10px;padding:10px;background:rgba(80,250,123,.05);border-left:2px solid rgba(80,250,123,.4)">';
        h+='<div style="font-size:9px;color:rgba(80,250,123,.7);letter-spacing:1px;margin-bottom:4px">WHY IT WORKS</div>';
        h+='<div style="font-size:12px;color:var(--dim);line-height:1.6">'+entry.why+'</div></div>';
        h+='<button data-artcopy="1" style="width:100%;padding:7px;margin-bottom:8px;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--dim);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:1px">📋 COPY FOR AI</button>';
        if(!artStudied(entry.id)){
          h+='<button data-artmark="'+entry.id+'" data-arttype="'+entryTypeA+'" style="width:100%;padding:9px;background:rgba(255,184,108,.08);border:1px solid rgba(255,184,108,.4);color:#ffb86c;font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:2px">✓ GOT IT · NEXT</button>';
        } else {
          h+='<button data-artnext="'+entryTypeA+'" style="width:100%;padding:9px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;font-size:10px;cursor:pointer;letter-spacing:2px">NEXT →</button>';
        }
      }
      h+='</div>';
    }
  } else if(tab==='browse'){
    if(!artState._expanded)artState._expanded={};
    ART_DATA.categories.forEach(function(c){
      h+='<div style="margin-bottom:14px">';
      h+='<div style="font-size:9px;color:'+c.color+';letter-spacing:2px;margin-bottom:6px">'+c.name.toUpperCase()+'</div>';
      c.entries.forEach(function(e){
        var done=artStudied(e.id);
        var expanded=!!artState._expanded[e.id];
        h+='<div style="border-bottom:1px solid rgba(255,255,255,.04);padding:6px 0">';
        h+='<div style="display:flex;align-items:flex-start;gap:8px">';
        h+='<span style="font-size:12px;color:'+(done?c.color:'rgba(255,255,255,.2)')+';flex-shrink:0;margin-top:2px">'+(done?'✓':'○')+'</span>';
        h+='<div style="flex:1;font-size:11px;color:'+(done?'var(--text)':'var(--dim)')+';line-height:1.4">'+e.tip+'</div>';
        h+='<button data-artexpand="'+e.id+'" style="flex-shrink:0;padding:2px 8px;background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--dim);font-family:monospace;font-size:9px;cursor:pointer">'+(expanded?'▴':'▾')+'</button>';
        h+='</div>';
        if(expanded){
          h+='<div style="margin:8px 0 4px 20px;padding:10px;background:rgba(255,184,108,.03);border-left:2px solid rgba(255,184,108,.3)">';
          h+='<div style="margin-bottom:8px;padding:8px;background:rgba(255,255,255,.04);border-left:2px solid rgba(255,184,108,.4)">';
          h+='<div style="font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:3px">EXAMPLE</div>';
          h+='<div style="font-size:11px;color:var(--text);line-height:1.5">'+e.example+'</div></div>';
          h+='<div style="margin-bottom:6px;padding:8px;background:rgba(255,85,85,.05);border-left:2px solid rgba(255,85,85,.3)">';
          h+='<div style="font-size:9px;color:rgba(255,85,85,.7);letter-spacing:1px;margin-bottom:3px">DON\'T</div>';
          h+='<div style="font-size:11px;color:var(--dim);line-height:1.5">'+e.not+'</div></div>';
          h+='<div style="padding:8px;background:rgba(80,250,123,.05);border-left:2px solid rgba(80,250,123,.3)">';
          h+='<div style="font-size:9px;color:rgba(80,250,123,.7);letter-spacing:1px;margin-bottom:3px">WHY IT WORKS</div>';
          h+='<div style="font-size:11px;color:var(--dim);line-height:1.5">'+e.why+'</div></div>';
          if(!done)h+='<button data-artmarkb="'+e.id+'" style="margin-top:8px;padding:4px 12px;background:rgba(255,184,108,.08);border:1px solid rgba(255,184,108,.3);color:#ffb86c;font-family:monospace;font-size:9px;cursor:pointer;letter-spacing:1px">✓ MARK LEARNED</button>';
          h+='</div>';
        }
        h+='</div>';
      });
      h+='</div>';
    });

  } else {
    // STATS
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">';
    [{v:totalStudied,l:'learned'},{v:totalAll-totalStudied,l:'remaining'}].forEach(function(x){
      h+='<div style="text-align:center;padding:10px;background:rgba(255,184,108,.04);border:1px solid rgba(255,184,108,.1)">';
      h+='<div style="font-size:28px;color:#ffb86c;font-family:VT323,monospace">'+x.v+'</div>';
      h+='<div style="font-size:9px;color:var(--dim)">'+x.l+'</div></div>';
    });
    h+='</div>';
    ART_DATA.categories.forEach(function(c){
      var done=c.entries.filter(function(e){return artStudied(e.id);}).length;
      var pct=Math.round(done/c.entries.length*100);
      h+='<div style="margin-bottom:7px;display:flex;align-items:center;gap:8px">';
      h+='<span style="font-size:10px;color:var(--dim);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+c.name+'</span>';
      h+='<div style="width:70px;height:4px;background:rgba(255,255,255,.06);flex-shrink:0"><div style="height:100%;width:'+pct+'%;background:'+c.color+'"></div></div>';
      h+='<span style="font-size:9px;color:var(--dim);min-width:28px;text-align:right">'+done+'/'+c.entries.length+'</span>';
      h+='</div>';
    });
  }

  el.innerHTML=h;

  el.querySelectorAll('[data-arttab]').forEach(function(b){b.onclick=function(){artState._tab=this.dataset.arttab;artSave();artRender();};});
  el.querySelectorAll('[data-artcat]').forEach(function(b){b.onclick=function(){artState._cat=this.dataset.artcat;artState._revealed=null;artSave();artRender();};});

  el.querySelectorAll('[data-artexpand]').forEach(function(b){
    b.onclick=function(){
      var eid=this.dataset.artexpand;
      if(!artState._expanded)artState._expanded={};
      artState._expanded[eid]=!artState._expanded[eid];
      artSave();artRender();
    };
  });
  el.querySelectorAll('[data-artmarkb]').forEach(function(b){
    b.onclick=function(){
      artMarkStudied(this.dataset.artmarkb);
      if(typeof hap==='function')hap(HAP.check);
      artSave();artRender();
    };
  });
  var artCopyBtn=el.querySelector('[data-artcopy]');
  if(artCopyBtn){
    artCopyBtn.onclick=function(){
      var todayEnt=artGetTodayEntry();
      var ent=todayEnt?todayEnt.entry:null;
      var cat=todayEnt?todayEnt.cat:null;
      if(!ent)return;
      var txt='ARTICULATE — '+(cat?cat.name:'')+'\n\n';
      txt+='TIP:\n'+ent.tip+'\n\n';
      txt+='EXAMPLE:\n'+ent.example+'\n\n';
      txt+='DON\'T:\n'+ent.not+'\n\n';
      txt+='WHY IT WORKS:\n'+ent.why+'\n\n';
      txt+='---\n'
        +'Please elaborate on this writing craft tip. Give me 2-3 concrete ways I can apply it '
        +'in my own fiction, with brief before/after examples showing the difference.';
      var doCopy=function(t){
        if(navigator.clipboard){
          navigator.clipboard.writeText(t).catch(function(){
            var ta=document.createElement('textarea');ta.value=t;
            document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
          });
        } else {
          var ta=document.createElement('textarea');ta.value=t;
          document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
        }
      };
      doCopy(txt);
      artCopyBtn.textContent='✓ COPIED';
      artCopyBtn.style.color='var(--cg)';
      if(typeof hap==='function')hap(HAP.soft);
      setTimeout(function(){artCopyBtn.textContent='📋 COPY FOR AI';artCopyBtn.style.color='var(--dim)';},2000);
    };
  }
  var revBtn=el.querySelector('[data-artreveal]');
  if(revBtn)revBtn.onclick=function(){artState._revealed=this.dataset.artreveal;artSave();artRender();};

  var markBtn=el.querySelector('[data-artmark]');
  if(markBtn)markBtn.onclick=function(){
    var t=this.dataset.artmark;
    artMarkStudied(t);
    artState._revealed=null;
    if(t==='new')artState.todayNewDone=(artState.todayNewDone||0)+1;
    else if(t==='review')artState.todayReviewDone=(artState.todayReviewDone||0)+1;
    if(typeof hap==='function')hap(HAP.check);
    artSave();artRender();
  };

  var nextBtn=el.querySelector('[data-artnext]');
  if(nextBtn){
    var artNextFn=function(){
      var t=nextBtn.dataset.artnext;
      artState._revealed=null;
      if(t==='new')artState.todayNewDone=(artState.todayNewDone||0)+1;
      else if(t==='review')artState.todayReviewDone=(artState.todayReviewDone||0)+1;
      artSave();artRender();
    };
    nextBtn.onclick=artNextFn;
    nextBtn.ontouchend=function(e){e.preventDefault();e.stopPropagation();artNextFn();};
  }
}
setTimeout(function(){artRender();},1200);

// ── FOCUS MODES ──
var FOCUS_MODES = [
  {
    id: 'islam',
    icon: '🕌',
    label: 'Islam',
    color: '#ffcc00',
    desc: 'Dhikr, Quran, duas, Islamic study',
    cards: ['dua-card','juz-amma','quran-cards','quran-words','ayah-recall','ayah-completion','surah-map','islamic-topics','for-akhira','prayer-tracker']
  },
  {
    id: 'night',
    icon: '🌙',
    label: 'Night Wind-Down',
    color: '#bd93f9',
    desc: 'Reflect, release, review the day',
    cards: ['gratitude-log','mood-log','stress-demess','reframe','shadow-log','legacy-letter','weekly-review','goals']
  },
  {
    id: 'learning',
    icon: '📚',
    label: 'Hobby Learning',
    color: '#50fa7b',
    desc: 'Voice study, articulate, reading',
    cards: ['voice-study','articulate','quran-words','quran-cards','books','writing-log','writers-den']
  }
];

var _modeSession = null; // {mode, cards, idx}

function modeOpen(){
  var overlay = document.getElementById('mode-overlay');
  var picker = document.getElementById('mode-picker');
  var session = document.getElementById('mode-session');
  if(!overlay)return;
  session.style.display='none';
  picker.style.display='';
  overlay.style.display='block';
  document.body.style.overflow='hidden';

  var h = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px">';
  h += '<div style="font-size:13px;color:var(--dim);letter-spacing:3px">FOCUS MODE</div>';
  h += '<button onclick="modeClose()" style="background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--dim);font-family:monospace;font-size:11px;cursor:pointer;padding:4px 10px">✕ CLOSE</button>';
  h += '</div>';

  FOCUS_MODES.forEach(function(m){
    h += '<div onclick="modeStart(\''+m.id+'\')" style="margin-bottom:14px;padding:20px;border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s" '
       + 'onmouseenter="this.style.borderColor=\''+m.color+'40\';this.style.background=\'rgba(255,255,255,.03)\'" '
       + 'onmouseleave="this.style.borderColor=\'rgba(255,255,255,.1)\';this.style.background=\'transparent\'">';
    h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">';
    h += '<span style="font-size:28px">'+m.icon+'</span>';
    h += '<div><div style="font-size:16px;color:'+m.color+';letter-spacing:1px">'+m.label+'</div>';
    h += '<div style="font-size:10px;color:var(--dim);margin-top:2px">'+m.desc+'</div></div>';
    h += '</div>';
    h += '<div style="font-size:9px;color:rgba(255,255,255,.2);letter-spacing:1px">'+m.cards.length+' CARDS</div>';
    h += '</div>';
  });

  picker.innerHTML = h;
}

function modeClose(){
  var overlay = document.getElementById('mode-overlay');
  if(overlay)overlay.style.display='none';
  document.body.style.overflow='';
  _modeSession = null;
}

function modeStart(modeId){
  var mode = FOCUS_MODES.find(function(m){return m.id===modeId;});
  if(!mode)return;
  // Filter to only cards that exist in DOM
  var validCards = mode.cards.filter(function(id){
    return document.querySelector('[data-id="'+id+'"]');
  });
  _modeSession = {mode:mode, cards:validCards, idx:0};
  modeShowCard();
}

function modeShowCard(){
  var picker = document.getElementById('mode-picker');
  var session = document.getElementById('mode-session');
  if(!session||!_modeSession)return;
  picker.style.display='none';
  session.style.display='';

  var s = _modeSession;
  var mode = s.mode;
  var total = s.cards.length;
  var idx = s.idx;

  if(idx >= total){
    // Done
    session.innerHTML = '<div style="text-align:center;padding:40px 20px">'
      + '<div style="font-size:48px;margin-bottom:16px">'+mode.icon+'</div>'
      + '<div style="font-size:18px;color:'+mode.color+';letter-spacing:1px;margin-bottom:8px">Session complete.</div>'
      + '<div style="font-size:12px;color:var(--dim);margin-bottom:32px">All '+total+' cards done.</div>'
      + '<button onclick="modeClose()" style="padding:12px 32px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.2);color:var(--text);font-family:monospace;font-size:12px;cursor:pointer;letter-spacing:2px">BACK TO DASHBOARD</button>'
      + '</div>';
    return;
  }

  var cardId = s.cards[idx];
  // Get card HTML from the actual tile
  var tile = document.querySelector('[data-id="'+cardId+'"]');
  var cardLabel = cardId.replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
  // Try to get the th-label
  var thLabel = tile ? tile.querySelector('.th-label') : null;
  if(thLabel) cardLabel = thLabel.textContent;

  // Get the body element of the card
  var bodyEl = tile ? tile.querySelector('[id$="-body"]') : null;
  var bodyId = bodyEl ? bodyEl.id : null;

  var h = '';
  // Progress bar
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">';
  h += '<button onclick="modeClose()" style="background:transparent;border:none;color:var(--dim);font-size:18px;cursor:pointer;padding:0">✕</button>';
  h += '<div style="flex:1;height:3px;background:rgba(255,255,255,.08);border-radius:2px">';
  h += '<div style="height:100%;width:'+(idx/total*100)+'%;background:'+mode.color+';border-radius:2px;transition:width .4s ease"></div>';
  h += '</div>';
  h += '<div style="font-size:10px;color:var(--dim)">'+( idx+1)+'/'+total+'</div>';
  h += '</div>';

  // Card container — animated in
  h += '<div id="mode-card-wrap" style="opacity:0;transform:translateY(20px) scale(0.97);transition:opacity .35s ease,transform .35s ease">';

  // Card header
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">';
  h += '<span style="font-size:22px">'+mode.icon+'</span>';
  h += '<div style="flex:1">';
  h += '<div style="font-size:14px;color:'+mode.color+';letter-spacing:1px">'+cardLabel+'</div>';
  h += '<div style="font-size:9px;color:var(--dim);letter-spacing:2px">'+mode.label.toUpperCase()+' · '+(idx+1)+' OF '+total+'</div>';
  h += '</div>';
  h += '</div>';

  // Card body — clone from actual card
  h += '<div id="mode-card-body" style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);padding:16px;margin-bottom:20px;min-height:120px">';
  if(bodyId){
    h += '<div id="mode-card-inner"></div>';
  } else {
    h += '<div style="font-size:11px;color:var(--dim);padding:10px">Open this card on the dashboard to interact with it.</div>';
  }
  h += '</div>';

  // Action buttons
  h += '<div style="display:flex;gap:10px">';
  h += '<button onclick="modeSkip()" style="flex:1;padding:12px;background:transparent;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.65);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:1px">SKIP →</button>';
  h += '<button onclick="modeNext()" style="flex:2;padding:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.25);color:var(--text);font-family:monospace;font-size:11px;cursor:pointer;letter-spacing:2px">DONE · NEXT →</button>';
  h += '</div>';

  h += '</div>'; // mode-card-wrap

  session.innerHTML = h;

  // Animate in
  requestAnimationFrame(function(){
    var wrap = document.getElementById('mode-card-wrap');
    if(wrap){
      requestAnimationFrame(function(){
        wrap.style.opacity='1';
        wrap.style.transform='translateY(0) scale(1)';
      });
    }
  });

  // Clone card content into mode overlay
  if(bodyId){
    var inner = document.getElementById('mode-card-inner');
    var origBody = document.getElementById(bodyId);
    if(inner && origBody){
      inner.innerHTML = origBody.innerHTML;
    }
  }
}

function modeAnimateOut(cb){
  var wrap = document.getElementById('mode-card-wrap');
  if(wrap){
    wrap.style.opacity='0';
    wrap.style.transform='translateY(-16px) scale(0.97)';
    setTimeout(cb, 320);
  } else {
    cb();
  }
}

function modeNext(){
  if(!_modeSession)return;
  modeAnimateOut(function(){
    _modeSession.idx++;
    modeShowCard();
  });
}

function modeSkip(){
  if(!_modeSession)return;
  var _skipBtn=document.querySelector('[onclick="modeSkip()"]');
  if(_skipBtn&&_skipBtn.dataset.confirm!=='1'){
    _skipBtn.textContent='ARE YOU SURE?';
    _skipBtn.style.color='rgba(255,184,108,.8)';
    _skipBtn.style.borderColor='rgba(255,184,108,.4)';
    _skipBtn.dataset.confirm='1';
    setTimeout(function(){if(_skipBtn.dataset.confirm==='1'){_skipBtn.textContent='SKIP →';_skipBtn.style.color='rgba(255,255,255,.65)';_skipBtn.style.borderColor='rgba(255,255,255,.3)';_skipBtn.dataset.confirm='';}},2500);
    return;
  }
  if(!_modeSession)return;
  modeAnimateOut(function(){
    _modeSession.idx++;
    modeShowCard();
  });
}

// ── END OF dashboard-3.js ──