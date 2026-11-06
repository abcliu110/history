/* 时间里的中国 — 2026-11-06 由原型 artifact（shi-jian-li-de-zhong-guo）如实移植进仓库。 */
'use strict';

  var tlList = document.getElementById('tlList');
  var stage = document.getElementById('stage');
  var panel = document.getElementById('panel');
  var quizBox = document.getElementById('quizBox');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- 时间线：时期分组 → 朝代 → 当前朝代的事件 ---------- */
  var currentIdx = 0;
  /* 时间线只建一次；换站时只挪高亮，不整表重建、更不滚动页面——
   * 以前每次换站都重建整条时间线并 scrollIntoView，页面跟着跳，看着像刷新。 */
  var timelineBuilt = false;
  function renderTimeline() {
    var cur = STATIONS[currentIdx];
    if (!timelineBuilt) {
      var html = '';
      DATA.eras.forEach(function (era) {
        html += '<li class="tl-group"><span class="tl-era-name">' + esc(era.name) + '</span></li>';
        DYNASTIES.forEach(function (d) {
          if (d.era !== era.id) return;
          var on = cur.dyn.id === d.id;
          html += '<li class="tl-dyn"><button class="tl-btn' + (on ? ' on' : '') + '" type="button" data-dyn="' + d.id + '">' +
            '<span class="nm">' + esc(d.name) + '</span>' +
            '<span class="yr">' + esc(d.years) + '</span></button></li>';
        });
      });
      tlList.innerHTML = html;
      tlList.querySelectorAll('.tl-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { stopTour(); selectStation(firstStationOf(btn.getAttribute('data-dyn'))); });
      });
      timelineBuilt = true;
      return;
    }
    tlList.querySelectorAll('.tl-btn').forEach(function (btn) {
      btn.classList.toggle('on', btn.getAttribute('data-dyn') === cur.dyn.id);
    });
  }
  function curDynId() { return STATIONS[currentIdx].dyn.id; }

  /* ---------- 故事面板 ---------- */
  function lensHtml(data, key, title, num) {
    var items = data[key] || [];
    if (!items.length) return '';
    var html = '<section class="lens"><h3><span class="no">' + num + '</span>' + esc(title) + '</h3>';
    if (key === 'lit') {
      items.forEach(function (p) {
        html += '<div class="poem"><div class="quote">' + esc(p.quote) + '</div>' +
          '<div class="from">' + esc(p.from) + '</div>' +
          '<div class="say">' + esc(p.say) + '</div></div>';
      });
    } else {
      html += '<ul>';
      items.forEach(function (it) {
        html += '<li><b>' + esc(it.t) + '</b>：' + esc(it.d) + '</li>';
      });
      html += '</ul>';
    }
    return html + '</section>';
  }
  function ancientHtml(era) {
    var items = era.ancient || [];
    if (!items.length) return '';
    var html = '<section class="lens ancient"><h3><span class="no">远古</span>先说远古</h3><ul>';
    items.forEach(function (it) {
      html += '<li><b>' + esc(it.t) + '</b>：' + esc(it.d) + '</li>';
    });
    return html + '</ul></section>';
  }
  /* 故事面板拆成两个常驻容器：事件故事每站更新；「这个朝代」整块只在换朝代时才换，
   * 同一朝代里换事件时它纹丝不动，不再整块重建、闪一下。 */
  var panelStoryEl = null, panelDynEl = null, panelDynKey = null;
  function renderPanel(st) {
    if (!panelStoryEl) {
      panel.innerHTML = '<div id="panelStory"></div><div id="panelDyn"></div>';
      panelStoryEl = document.getElementById('panelStory');
      panelDynEl = document.getElementById('panelDyn');
    }
    var storyHtml = '', dynHtml = '', dynKey;
    if (st.type === 'event') {
      var demo = DEMO[st.dyn.id];
      var ev = st.ev;
      var w = EVENT_WHERE[ev.id];
      var routeTxt;
      if (w && w.list.length > 1) {
        routeTxt = '跟着地图上的红线走一遍：' + w.list.map(function (p) { return p.name; }).join(' → ') + '。';
      } else if (w && w.list.length === 1) {
        routeTxt = '这件事就发生在一个地方：' + w.list[0].name + '，地图上的红点 1 就是那里。';
      } else {
        routeTxt = '先看一眼地图上亮起来的地方。';
      }
      storyHtml = '<section class="lens event-story"><h3><span class="no">' + esc(ev.year) + '</span>' + esc(st.dyn.name) + ' · ' + esc(ev.title) + '</h3>' +
        '<ol class="steps">' +
        '<li class="step"><span class="sn">1</span><p><span class="st-t">先走一遍路线</span>' + esc(routeTxt) +
        '<br><button class="walkbtn" type="button" id="walkBtn">↻ 在地图上再走一遍</button></p></li>' +
        '<li class="step"><span class="sn">2</span><p><span class="st-t">发生了什么</span>' + esc(ev.story) + '</p></li>' +
        '<li class="step"><span class="sn">3</span><p><span class="st-t">为什么重要</span>' + esc(ev.why) + '</p></li>' +
        '<li class="step"><span class="sn">4</span><p><span class="st-t">后来怎么样了</span>' + esc(ev.later) + '</p></li>' +
        '</ol></section>';
      /* 朝代的五方面单独收在「这个朝代」里，不跟事件故事叠在一起。
       * 示范朝代用朝代专属内容；其余有事件的朝代沿用所属时期的内容。 */
      dynKey = 'dyn:' + st.dyn.id;
      dynHtml = '<h3 class="dyn-title">这个朝代 · ' + esc(st.dyn.name) + '</h3>';
      if (demo) {
        dynHtml += '<p class="tagline">' + esc(demo.china) + '</p>';
        LENSES.forEach(function (pair, i) { dynHtml += lensHtml(demo.lenses, pair[0], pair[1], '0' + (i + 1)); });
      } else {
        var devEra = eraById(st.dyn.era);
        dynHtml += '<p class="tagline">' + esc(devEra.tagline) + '</p>';
        if (st.dyn.id === 'xia') dynHtml += ancientHtml(devEra);
        LENSES.forEach(function (pair, i) { dynHtml += lensHtml(devEra, pair[0], pair[1], '0' + (i + 1)); });
      }
    } else {
      var era = st.era;
      dynKey = 'era:' + st.dyn.id;
      dynHtml = '<p class="tagline">' + esc(era.tagline) + '</p>';
      if (st.dyn.id === 'xia') dynHtml += ancientHtml(era);
      LENSES.forEach(function (pair, i) { dynHtml += lensHtml(era, pair[0], pair[1], '0' + (i + 1)); });
    }
    panelStoryEl.innerHTML = storyHtml;
    if (dynKey !== panelDynKey) {
      panelDynEl.innerHTML = dynHtml;
      panelDynKey = dynKey;
    }
    if (st.type === 'event') {
      var wb = document.getElementById('walkBtn');
      if (wb) wb.addEventListener('click', function () {
        renderStage(STATIONS[currentIdx]);
        var mb = document.getElementById('mapBox');
        if (mb) { try { mb.scrollIntoView({ block: 'center' }); } catch (e) { /* 滚动失败不影响重走路线 */ } }
      });
    }
  }

  /* ---------- 地图舞台 ---------- */
  var prevKeys = null;
  var playing = false;
  function showPlaceStory(storyEl, place) {
    storyEl.innerHTML = '<div class="ps-head">' + esc(place.name) +
      '<span class="kind">' + esc(place.kind) + ' · ' + esc(place.sub) + '</span></div>' +
      '<p>' + esc(place.story) + '</p>';
  }
  /* 取文本的前 n 句（按句末标点切，不改动原文）。 */
  function firstSentences(text, n) {
    if (!text) return '';
    var out = '', count = 0;
    for (var i = 0; i < text.length && count < n; i++) {
      var ch = text.charAt(i);
      out += ch;
      if (ch === '。' || ch === '！' || ch === '？') count++;
    }
    return out;
  }
  /* 地图正下方的事件描述卡：年份 + 标题 + 描述。
   * 描述用故事里「发生了什么」的前 2–3 句；没有故事文案时用大事索引的一句话摘要（changed）。
   * 只选了朝代、还没选具体事件时，显示这个朝代的一句简介。 */
  function evDescHtml(st) {
    var year, title, body;
    if (st.type === 'event') {
      year = st.ev.year;
      title = st.ev.title;
      body = firstSentences(st.ev.story, 3) || st.ev.changed || '';
    } else {
      year = st.dyn.years;
      title = st.dyn.name;
      body = st.era.tagline || '';
    }
    return '<div class="ev-desc"><div class="ev-desc-head">' +
      '<span class="ev-desc-year">' + esc(year) + '</span>' +
      '<span class="ev-desc-title">' + esc(title) + '</span></div>' +
      (body ? '<p class="ev-desc-body">' + esc(body) + '</p>' : '') + '</div>';
  }
  /* 舞台骨架只建一次：标题、地图框、描述卡、地点列表、上下一站按钮都是常驻节点，按钮事件也只绑一次。
   * 换站时只换地图框里的 SVG、标题文字、描述和地点行——舞台本身不拆不重建，
   * 页面不跳、焦点不丢，看起来就是「地图变了」，而不是整页刷新。 */
  var stageEls = null;
  function buildStageShell() {
    stage.innerHTML =
      '<div class="years" id="stageYears"></div>' +
      '<h2 id="stageTitle"></h2>' +
      '<div id="stageSub"></div>' +
      '<div class="mapbox" id="mapBox" role="img"></div>' +
      '<div id="evDesc"></div>' +
      '<p class="map-caption">手绘示意图：只标重要的地方，疆域、位置和路线都是大致示意。蓝色虚线淡印的轮廓是现在的中国，用来对照发生地在今天的位置。</p>' +
      '<p class="routeline" id="routeLine"></p>' +
      '<ol class="place-list" id="placeList"></ol>' +
      '<div class="place-story" id="placeStory"></div>' +
      '<div class="stagenav">' +
      '<button class="navbtn" type="button" id="prevBtn">← 上一个</button>' +
      '<button class="navbtn play" type="button" id="playBtn">▶ 播放时间</button>' +
      '<button class="navbtn" type="button" id="nextBtn">下一个 →</button>' +
      '<div class="tourline"><span class="tour-pos"></span><div class="tour-track" aria-hidden="true"><div class="tour-fill"></div></div></div></div>';
    stageEls = {
      years: document.getElementById('stageYears'),
      title: document.getElementById('stageTitle'),
      sub: document.getElementById('stageSub'),
      mapBox: document.getElementById('mapBox'),
      evDesc: document.getElementById('evDesc'),
      routeLine: document.getElementById('routeLine'),
      placeList: document.getElementById('placeList'),
      placeStory: document.getElementById('placeStory'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      playBtn: document.getElementById('playBtn')
    };
    /* 上一个/下一个：连播中点一下，到新的一站重新计 6 秒、继续播；没在播时只换一站。 */
    stageEls.prevBtn.addEventListener('click', function () { stepStation(-1); });
    stageEls.nextBtn.addEventListener('click', function () { stepStation(1); });
    stageEls.playBtn.addEventListener('click', togglePlay);
  }
  function renderStage(st) {
    if (!stageEls) buildStageShell();
    pvEvId = null;
    var isEv = st.type === 'event';
    var state = isEv ? eventState(st.ev) : eraState(st.era);
    var keys = stateKeys(state);
    var newKeys = null;
    if (prevKeys) {
      newKeys = {};
      Object.keys(keys).forEach(function (k) { if (!prevKeys[k]) newKeys[k] = 1; });
    }
    prevKeys = keys;

    stageEls.years.textContent = isEv ? (st.dyn.name + ' · ' + st.dyn.years) : st.dyn.years;
    stageEls.title.textContent = isEv ? (st.ev.title + '（' + st.ev.year + '）') : st.dyn.name;
    stageEls.sub.innerHTML = isEv
      ? '<div class="change-banner"><b>地图变了：</b>' + esc(st.ev.changed) + '</div>'
      : '<p class="mapnote">' + esc(MAPDATA[st.era.id].mapNote) + '</p>';
    var marks = displayMarks(state);
    var labelNames = marks.map(function (p) { return p.name; }).join('、');
    stageEls.mapBox.setAttribute('aria-label', (isEv ? st.ev.title : st.dyn.name) + '那一刻的手绘中国示意地图，标着' + labelNames);
    stageEls.mapBox.innerHTML = buildMapSvg(state, marks, newKeys);
    stageEls.evDesc.innerHTML = evDescHtml(st);
    if (!isEv && MAPDATA[st.era.id].route) {
      var rt = MAPDATA[st.era.id].route;
      stageEls.routeLine.innerHTML = '<b>' + esc(rt.name) + '：</b>' + esc(rt.note);
      stageEls.routeLine.style.display = '';
    } else {
      stageEls.routeLine.innerHTML = '';
      stageEls.routeLine.style.display = 'none';
    }
    var listHtml = '';
    marks.forEach(function (p, i) {
      listHtml += '<li><button class="place-row' + (p.where ? ' where-row' : '') + '" type="button">' +
        '<span class="num">' + (i + 1) + '</span>' +
        '<span><span class="pname">' + esc(p.name) + '</span> <span class="psub">' + esc(p.sub) + '</span></span>' +
        '<span class="kind">' + esc(p.kind) + '</span></button></li>';
    });
    stageEls.placeList.innerHTML = listHtml;

    var rows = Array.prototype.slice.call(stageEls.placeList.querySelectorAll('.place-row'));
    var storyEl = stageEls.placeStory;
    var markers = Array.prototype.slice.call(stageEls.mapBox.querySelectorAll('.mk'));
    function select(i) {
      clearPreview();
      rows.forEach(function (r, j) { r.classList.toggle('map-selected', j === i); });
      markers.forEach(function (g, j) { g.classList.toggle('on', j === i); });
      showPlaceStory(storyEl, marks[i]);
    }
    /* 点标记看地方故事时停下来，不自动跳走。 */
    rows.forEach(function (row, i) { row.addEventListener('click', function () { stopTour(); select(i); }); });
    markers.forEach(function (g, i) { g.addEventListener('click', function () { stopTour(); select(i); }); });
    if (marks.length) select(0); else storyEl.innerHTML = '';

    stageEls.prevBtn.disabled = currentIdx <= 0;
    stageEls.nextBtn.disabled = currentIdx >= STATIONS.length - 1;
    stageEls.playBtn.textContent = playing ? '❚❚ 暂停' : '▶ 播放时间';
  }

  /* ---------- 连播：只有点了「播放时间 / 连播」才开始；每一站停 6 秒，进度条走完自动到下一站，播完停。
   * 点事件、点朝代、点地点、答题都会停下来（stopTour）；暂停（pauseTour）会把进度条冻在原地，再点继续。 ---------- */
  var TOUR_MS = 6000;
  var tickTimer = null;
  var segStart = 0;
  var elapsedBase = 0;
  function tourElapsed() { return playing ? elapsedBase + (Date.now() - segStart) : elapsedBase; }
  function renderTourUi() {
    var pos = '第 ' + (currentIdx + 1) + ' 站 / 共 ' + STATIONS.length + ' 站';
    document.querySelectorAll('.tour-pos').forEach(function (el) { el.textContent = pos; });
    var pct = Math.min(100, (tourElapsed() / TOUR_MS) * 100);
    document.querySelectorAll('.tour-fill').forEach(function (el) { el.style.width = pct.toFixed(1) + '%'; });
    var b = document.getElementById('playBtn');
    if (b) b.textContent = playing ? '❚❚ 暂停' : '▶ 播放时间';
    var t = document.getElementById('tourToggle');
    if (t) t.textContent = playing ? '❚❚ 暂停连播' : '▶ 连播';
  }
  function tourTick() {
    if (tourElapsed() >= TOUR_MS) {
      if (currentIdx >= STATIONS.length - 1) { stopTour(); return; }
      elapsedBase = 0;
      segStart = Date.now();
      selectStation(currentIdx + 1);
    }
    renderTourUi();
  }
  function startTour() {
    if (playing) return;
    playing = true;
    segStart = Date.now();
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tourTick, 100);
    renderTourUi();
  }
  function pauseTour() {
    if (!playing) return;
    elapsedBase = tourElapsed();
    playing = false;
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    renderTourUi();
  }
  function stopTour() {
    playing = false;
    elapsedBase = 0;
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    renderTourUi();
  }
  function togglePlay() {
    if (playing) { pauseTour(); return; }
    if (currentIdx >= STATIONS.length - 1) { stopTour(); selectStation(0); }
    startTour();
  }
  function stepStation(delta) {
    var n = currentIdx + delta;
    if (n < 0 || n >= STATIONS.length) return;
    if (!playing) stopTour();
    elapsedBase = 0;
    segStart = Date.now();
    selectStation(n);
  }
  /* 答题时停下来，不自动跳走。 */
  quizBox.addEventListener('click', function () { stopTour(); });

  /* ---------- 选中一站：只就地更新各区域，不整页重建、不动滚动位置 ---------- */
  var quizDynId = null;
  function selectStation(idx) {
    if (idx < 0 || idx >= STATIONS.length) return;
    currentIdx = idx;
    var st = STATIONS[idx];
    if (st.type === 'event') markRead(st.ev.id);
    renderTimeline();
    renderStage(st);
    renderPanel(st);
    syncIndexSelection();
    renderTourUi();
    /* 动手练是按朝代出的：同一朝代里换事件不重开，孩子答到一半的题和成绩都留着；换了朝代才换题。 */
    if (st.dyn.id !== quizDynId) {
      quizDynId = st.dyn.id;
      if (st.type === 'event') startQuiz(st.dyn.name, DEMO[st.dyn.id] ? DEMO[st.dyn.id].quiz : (DYNASTY_QUIZ[st.dyn.id] || eraById(st.dyn.era).quiz));
      else startQuiz(st.dyn.name, st.era.quiz);
    }
    document.title = (st.type === 'event' ? st.ev.title : st.dyn.name) + ' · 时间里的中国';
    var hash = '#d=' + st.dyn.id + (st.type === 'event' ? '&e=' + st.ev.id : '');
    if (window.history && history.replaceState) history.replaceState(null, '', hash);
    else location.hash = hash;
  }

  /* ---------- 动手练 ---------- */
  function startQuiz(name, qs) {
    qs = qs || [];
    var qi = 0, score = 0;
    function show() {
      if (qi >= qs.length) {
        quizBox.innerHTML = '<h3>动手练 · ' + esc(name) + '</h3><p class="score">答完了：答对 ' + score + ' / ' + qs.length + ' 道。</p>' +
          '<button class="nextbtn" type="button">再练一次</button>';
        quizBox.querySelector('.nextbtn').addEventListener('click', function () { qi = 0; score = 0; show(); });
        return;
      }
      var q = qs[qi];
      var html = '<h3>动手练 · ' + esc(name) + '（' + (qi + 1) + ' / ' + qs.length + '）</h3><div class="q">' + esc(q.q) + '</div><div class="opts">';
      q.options.forEach(function (o, i) {
        html += '<button class="opt" type="button" data-i="' + i + '">' + esc(o) + '</button>';
      });
      html += '</div><div class="why" hidden></div>';
      quizBox.innerHTML = html;
      var opts = quizBox.querySelectorAll('.opt');
      opts.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var picked = parseInt(btn.getAttribute('data-i'), 10);
          opts.forEach(function (b) { b.disabled = true; });
          var why = quizBox.querySelector('.why');
          if (picked === q.answer) {
            btn.classList.add('correct');
            score++;
            why.innerHTML = '<b>答对了。</b>' + esc(q.why);
          } else {
            btn.classList.add('wrong');
            opts[q.answer].classList.add('correct');
            why.innerHTML = '<b>答错了，正确答案是“' + esc(q.options[q.answer]) + '”。</b>' + esc(q.why);
          }
          why.hidden = false;
          var next = document.createElement('button');
          next.className = 'nextbtn'; next.type = 'button';
          next.textContent = (qi + 1 >= qs.length) ? '看成绩' : '下一题';
          next.addEventListener('click', function () { qi++; show(); });
          quizBox.appendChild(next);
        });
      });
    }
    show();
  }

  /* ---------- 大事索引：常驻一级列表，按朝代分组、可折叠。
   * A：行里只留年份 + 标题 + 类型色点 + 迷你路线；点一下行就地展开看摘要，再点「看这个故事」才换站；
   *    划过 / 点行（还没进故事）时，地图上先亮出这条事件的路线做预览，不换地图和故事。
   * B：转折点做成金边大卡（带「为什么重要」）；点开过的事件打勾、组头显示读了几个，用本地存储记住。
   * 点事件只换地图和故事，不自动连播；带搜索、总数和「只看有路线」筛选，事件再多也翻得动。 ---------- */
  var evxGroupsEl = document.getElementById('evxGroups');
  var evxCountEl = document.getElementById('evxCount');
  var evxSearchEl = document.getElementById('evxSearch');
  var evxRouteBtn = document.getElementById('evxRouteBtn');
  var evxQuery = '';
  var evxRouteOnly = false;
  var evxOpen = {};
  var evxExpanded = {};
  DYNASTIES.forEach(function (d) { if (eventsOf(d.id).length) evxOpen[d.id] = (d.id === 'qin'); });

  /* 已读记录：存在浏览器本地存储里，下次打开还在。 */
  var READ_KEY = 'shijian-read-v1';
  var readSet = {};
  try {
    var savedRead = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
    if (Object.prototype.toString.call(savedRead) === '[object Array]') {
      savedRead.forEach(function (id) { readSet[id] = 1; });
    }
  } catch (e) { readSet = {}; }
  function markRead(id) {
    if (readSet[id]) return;
    readSet[id] = 1;
    try { localStorage.setItem(READ_KEY, JSON.stringify(Object.keys(readSet))); } catch (e) { /* 存不下也照常打勾 */ }
  }

  /* 迷你路线图：小圆点连线，几个发生地就几个点，不写地名。 */
  function miniRouteHtml(ev) {
    var w = EVENT_WHERE[ev.id];
    var n = w ? w.list.length : 0;
    if (!n) return '';
    var h = '<span class="mr" aria-hidden="true"><i></i>';
    for (var i = 1; i < n; i++) h += '<em></em><i></i>';
    return h + '</span>';
  }

  /* 地图路线预览：把事件的发生地红点和红线叠到当前地图上，不换站、不动故事。 */
  var pvEvId = null;
  function clearPreview() {
    var g = document.getElementById('pvLayer');
    if (g && g.parentNode) g.parentNode.removeChild(g);
    pvEvId = null;
  }
  function showPreview(ev) {
    var cur = STATIONS[currentIdx];
    if (cur.type === 'event' && cur.ev.id === ev.id) { clearPreview(); return; }
    if (pvEvId === ev.id && document.getElementById('pvLayer')) return;
    var w = EVENT_WHERE[ev.id];
    if (!w || !w.list.length) return;
    var box = document.getElementById('mapBox');
    var svg = box ? box.querySelector('svg') : null;
    if (!svg) return;
    clearPreview();
    pvEvId = ev.id;
    var h = '<g class="pv-layer" id="pvLayer">';
    if (w.path) h += '<path class="where-path pv-path" pathLength="100" d="' + w.path + '"/>';
    w.list.forEach(function (p, i) {
      var xy = PLACE_XY[p.name];
      if (!xy) return;
      var left = !!LABEL_LEFT[p.name];
      var lx = left ? xy[0] - 18 : xy[0] + 18;
      h += '<g class="mk where-mk pv-mk"><circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="13"/>' +
        '<text class="mk-num" x="' + xy[0] + '" y="' + (xy[1] + 4.5) + '">' + (i + 1) + '</text>' +
        '<text class="mk-label" x="' + lx + '" y="' + (xy[1] + 5) + '"' + (left ? ' text-anchor="end"' : '') + '>' + esc(p.name) + '</text></g>';
    });
    h += '</g>';
    svg.insertAdjacentHTML('beforeend', h);
  }
  function evHasRoute(ev) {
    var w = EVENT_WHERE[ev.id];
    return !!(w && w.path && w.list.length > 1);
  }
  function evWhereText(ev) {
    var w = EVENT_WHERE[ev.id];
    if (!w || !w.list.length) return '';
    return w.list.map(function (p) { return p.name; }).join(' → ');
  }
  function evMatches(ev, dyn) {
    if (evxRouteOnly && !evHasRoute(ev)) return false;
    if (!evxQuery) return true;
    var hay = dyn.name + ' ' + ev.year + ' ' + ev.title + ' ' + ev.changed + ' ' + evWhereText(ev);
    return hay.indexOf(evxQuery) >= 0;
  }
  function renderIndex(keepScroll) {
    var cur = STATIONS[currentIdx];
    if (cur.type === 'event') evxOpen[cur.dyn.id] = true;
    /* 整表重建前记下左栏滚到哪，重建后还原——重建不许把页面或左栏拽走。 */
    var tlBox = document.querySelector('.timeline-box');
    var keepTop = (keepScroll && tlBox) ? tlBox.scrollTop : null;
    var total = 0, shown = 0, html = '';
    DYNASTIES.forEach(function (d) {
      var evs = eventsOf(d.id);
      if (!evs.length) return;
      total += evs.length;
      var vis = evs.filter(function (ev) { return evMatches(ev, d); });
      if (!vis.length) return;
      shown += vis.length;
      /* 正在搜索或筛选时，分组强制展开，不然找到了也看不见。 */
      var open = !!evxOpen[d.id] || !!evxQuery || evxRouteOnly;
      var readN = evs.filter(function (ev) { return !!readSet[ev.id]; }).length;
      html += '<div class="evx-group' + (open ? '' : ' closed') + '">' +
        '<button class="evx-ghead" type="button" data-dyn="' + d.id + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span class="gname">' + esc(d.name) + '</span>' +
        '<span class="gcnt">' + vis.length + ' 个大事 · <span class="grd">读了 ' + readN + '/' + evs.length + '</span></span>' +
        '<span class="chev" aria-hidden="true">▾</span></button>';
      if (open) {
        html += '<ul class="evx-rows">';
        vis.forEach(function (ev) {
          var on = cur.type === 'event' && cur.ev.id === ev.id;
          var key = !!KEY_EVENTS[ev.id];
          var exp = !!evxExpanded[ev.id];
          var tc = TYPE_CLASS[EV_TYPES[ev.id]] || '';
          html += '<li><div class="evx-row' + (on ? ' on' : '') + (key ? ' key' : '') + (exp ? ' open' : '') + '">' +
            '<button class="evx-main" type="button" data-dyn="' + d.id + '" data-ev="' + ev.id + '" aria-expanded="' + (exp ? 'true' : 'false') + '">' +
            '<span class="rtop"><span class="tdot t-' + tc + '" aria-hidden="true"></span><span class="eyr">' + esc(ev.year) + '</span><span class="rtitle">' + esc(ev.title) + '</span>' +
            (key ? '<span class="ktag">转折点</span>' : '') +
            (readSet[ev.id] ? '<span class="rdone" title="读过了">✓</span>' : '') + '</span>' +
            (key ? '<span class="rwhy"><b>为什么重要：</b>' + esc(ev.why) + '</span>' : '') +
            '<span class="rmeta">' + miniRouteHtml(ev) + '<span class="rchev" aria-hidden="true">▾</span></span>' +
            '</button>';
          if (exp) {
            html += '<div class="evx-detail"><span class="rsum">' + esc(ev.changed) + '</span>' +
              '<span class="rwhere">发生地：' + esc(evWhereText(ev)) + '</span>' +
              '<button class="evx-go" type="button" data-dyn="' + d.id + '" data-ev="' + ev.id + '">看这个故事 →</button></div>';
          }
          html += '</div></li>';
        });
        html += '</ul>';
      }
      html += '</div>';
    });
    if (!shown) html = '<p class="evx-empty">没找到这样的事件，换个词试试。</p>';
    evxGroupsEl.innerHTML = html;
    evxCountEl.textContent = '共 ' + total + ' 个' + ((evxQuery || evxRouteOnly) ? ' · 找到 ' + shown + ' 个' : '');
    evxGroupsEl.querySelectorAll('.evx-ghead').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-dyn');
        evxOpen[id] = !evxOpen[id];
        renderIndex(true);
      });
    });
    evxGroupsEl.querySelectorAll('.evx-main').forEach(function (btn) {
      var ev = eventById(btn.getAttribute('data-ev'));
      if (!ev) return;
      /* 点一下行：就地展开/收起摘要，并先在地图上亮出这条路线预览；点「看这个故事」才真正换站。 */
      btn.addEventListener('click', function () {
        if (evxExpanded[ev.id]) {
          delete evxExpanded[ev.id];
          if (pvEvId === ev.id) clearPreview();
        } else {
          evxExpanded[ev.id] = 1;
          showPreview(ev);
        }
        renderIndex(true);
      });
      btn.addEventListener('mouseenter', function () { showPreview(ev); });
      btn.addEventListener('mouseleave', function () { if (!evxExpanded[ev.id] && pvEvId === ev.id) clearPreview(); });
      btn.addEventListener('focus', function () { showPreview(ev); });
    });
    evxGroupsEl.querySelectorAll('.evx-go').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = stationIndexOf(btn.getAttribute('data-dyn'), btn.getAttribute('data-ev'));
        if (i >= 0) { stopTour(); selectStation(i); }
      });
    });
    if (keepTop !== null) tlBox.scrollTop = keepTop;
  }
  /* 换站时索引只做就地同步：挪一下高亮、给刚读完的事件补上勾、更新组头计数，整表不重建。
   * 只有当前事件那一行不在表里（它所在的组还折着，或正开着搜索/筛选）时才整表重建一次，
   * 而且重建会保留左栏的滚动位置——以前每次换站 151 行全部重建再 scrollIntoView，
   * 页面被拽着跳，是「地图一变整页刷新」的主因之一。 */
  function syncIndexSelection() {
    var cur = STATIONS[currentIdx];
    if (cur.type !== 'event' || evxQuery || evxRouteOnly) { renderIndex(true); return; }
    var btn = evxGroupsEl.querySelector('.evx-main[data-ev="' + cur.ev.id + '"]');
    if (!btn) { renderIndex(true); return; }
    var oldRow = evxGroupsEl.querySelector('.evx-row.on');
    if (oldRow) oldRow.classList.remove('on');
    var row = btn.parentNode;
    if (row) row.classList.add('on');
    var rtop = btn.querySelector('.rtop');
    if (rtop && !rtop.querySelector('.rdone')) {
      var done = document.createElement('span');
      done.className = 'rdone';
      done.title = '读过了';
      done.textContent = '✓';
      rtop.appendChild(done);
    }
    var group = row;
    while (group && !(group.classList && group.classList.contains('evx-group'))) group = group.parentNode;
    if (group) {
      var grd = group.querySelector('.grd');
      if (grd) {
        var evs = eventsOf(cur.dyn.id);
        var readN = evs.filter(function (ev) { return !!readSet[ev.id]; }).length;
        grd.textContent = '读了 ' + readN + '/' + evs.length;
      }
    }
  }
  evxSearchEl.addEventListener('input', function () { evxQuery = evxSearchEl.value.trim(); renderIndex(true); });
  evxRouteBtn.addEventListener('click', function () {
    evxRouteOnly = !evxRouteOnly;
    evxRouteBtn.setAttribute('aria-pressed', evxRouteOnly ? 'true' : 'false');
    evxRouteBtn.classList.toggle('on', evxRouteOnly);
    renderIndex(true);
  });
  document.getElementById('tourToggle').addEventListener('click', togglePlay);

  /* ---------- 入口：#d=朝代&e=事件；旧 #era=时期 进该时期第一个朝代 ---------- */
  function initialIndex() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return 0;
    var params = {};
    h.split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p.length === 2) params[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
    });
    if (params.d && dynById(params.d)) {
      var i = stationIndexOf(params.d, params.e || null);
      if (i >= 0) return i;
      return firstStationOf(params.d);
    }
    if (params.era && eraById(params.era)) {
      for (var j = 0; j < DYNASTIES.length; j++) if (DYNASTIES[j].era === params.era) return firstStationOf(DYNASTIES[j].id);
    }
    return 0;
  }
  selectStation(initialIndex());
