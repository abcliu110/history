/* 时间里的中国 v3.1：事件驱动地图 + 点事件自动连播。
 * 时间线按朝代分（21 个节点）；点朝代进朝代，点重大事件地图就变到那个时刻：
 * 每一站（朝代或事件）自带地图状态，新出现的东西闪一下，并有一句“地图变了”。
 * 事件有发生地（EVENT_WHERE）：点事件，地图上按顺序标出发生地（编号圆点），
 * 多个地点之间连一条线，标出地点之间的变化；显示完（6 秒）自动到下一个事件，
 * 点标记、答题时会暂停，随时能点任意事件跳过去。
 * 秦、西汉、东汉、隋、唐 5 个朝代有完整事件内容；其余朝代先沿用 8 个时期的内容。 */
(function () {
  'use strict';
  var DATA = window.TIME_CHINA;
  var MAPS = window.ERA_MAPS;
  var DYNS = window.DYNASTIES;
  var WHERE = window.EVENT_WHERE || {};
  var TOUR_MS = 6000;
  var ERA_BY_ID = {};
  DATA.eras.forEach(function (e) { ERA_BY_ID[e.id] = e; });

  /* 每一站：有事件的朝代一站一个事件，没事件的朝代一站就是朝代本身。 */
  var STOPS = [];
  DYNS.forEach(function (d) {
    if (d.events && d.events.length) {
      d.events.forEach(function (ev) { STOPS.push({ dyn: d, event: ev }); });
    } else {
      STOPS.push({ dyn: d, event: null });
    }
  });
  function stopIndexOf(dynId, eventId) {
    for (var i = 0; i < STOPS.length; i++) {
      if (STOPS[i].dyn.id !== dynId) continue;
      if (!eventId && !STOPS[i].event) return i;
      if (eventId && STOPS[i].event && STOPS[i].event.id === eventId) return i;
    }
    return -1;
  }
  function firstStopOfDynasty(dynId) {
    for (var i = 0; i < STOPS.length; i++) if (STOPS[i].dyn.id === dynId) return i;
    return 0;
  }

  var railList = document.getElementById('railList');
  var evStrip = document.getElementById('evStrip');
  var mapSvg = document.getElementById('mapSvg');
  var mapNote = document.getElementById('mapNote');
  var mapChanged = document.getElementById('mapChanged');
  var markerPop = document.getElementById('markerPop');
  var story = document.getElementById('story');
  var quizBox = document.getElementById('quizBox');
  var btnPrev = document.getElementById('btnPrev');
  var btnNext = document.getElementById('btnNext');
  var btnPlay = document.getElementById('btnPlay');
  var stopIdx = 0;
  var timer = null;
  var prevMap = null;
  var LENSES = [
    ['history', '历史大事'],
    ['astro', '天文观星'],
    ['geo', '地理山河'],
    ['lit', '文学诗文'],
    ['culture', '文化风俗']
  ];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function lensHtml(obj, key, title) {
    var items = obj[key] || [];
    if (!items.length) return '';
    var html = '<section class="lens"><h3>' + esc(title) + '</h3>';
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
  function startQuiz(obj) {
    var qs = obj.quiz || [];
    var qi = 0, score = 0;
    function show() {
      if (qi >= qs.length) {
        quizBox.innerHTML = '<h3>动手练</h3><p class="score">答完了：答对 ' + score + ' / ' + qs.length + ' 道。</p>' +
          '<button class="nextbtn" type="button">再练一次</button>';
        quizBox.querySelector('.nextbtn').addEventListener('click', function () { qi = 0; score = 0; show(); });
        return;
      }
      var q = qs[qi];
      var html = '<h3>动手练（' + (qi + 1) + ' / ' + qs.length + '）</h3><div class="q">' + esc(q.q) + '</div><div class="opts">';
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
  /* 和上一站比，找出这一站新出现的东西（疆域、路线、都城、标记），用来闪一下。 */
  function diffMaps(prev, cur) {
    if (!prev) return {};
    var hi = {};
    if ((prev.territory || []).join('|') !== (cur.territory || []).join('|')) hi.territory = true;
    function newKeys(prevList, curList, keyFn) {
      var prevSet = {};
      (prevList || []).forEach(function (it) { prevSet[keyFn(it)] = true; });
      var out = [];
      (curList || []).forEach(function (it) { var k = keyFn(it); if (!prevSet[k]) out.push(k); });
      return out;
    }
    hi.routes = newKeys(prev.routes, cur.routes, function (r) { return r.id; });
    hi.capitals = newKeys(prev.capital, cur.capital, function (c) { return c.name; });
    hi.points = newKeys(prev.points, cur.points, function (p) { return p.label; });
    hi.astro = newKeys(prev.astro, cur.astro, function (a) { return a.label; });
    return hi;
  }
  function renderRail() {
    var cur = STOPS[stopIdx];
    var html = '';
    var lastEra = null;
    DYNS.forEach(function (d) {
      if (d.era !== lastEra) {
        lastEra = d.era;
        html += '<li class="rail-group">' + esc(ERA_BY_ID[d.era].name) + '</li>';
      }
      var active = d.id === cur.dyn.id;
      html += '<li><button type="button" data-dyn="' + d.id + '" class="' + (active ? 'active' : '') + '">' +
        '<span class="y">' + esc(d.years) + '</span><span class="n">' + esc(d.name) + '</span></button>';
      if (active && d.events && d.events.length) {
        html += '<ul class="ev-list">';
        d.events.forEach(function (ev) {
          var on = cur.event && cur.event.id === ev.id;
          html += '<li><button type="button" data-ev="' + ev.id + '" class="' + (on ? 'active' : '') + '">' +
            '<span class="y">' + esc(ev.year) + '</span><span class="n">' + esc(ev.title) + '</span></button></li>';
        });
        html += '</ul>';
      }
      html += '</li>';
    });
    railList.innerHTML = html;
    railList.querySelectorAll('button[data-dyn]').forEach(function (b) {
      b.addEventListener('click', function () { setStop(firstStopOfDynasty(b.getAttribute('data-dyn'))); startTour(); });
    });
    railList.querySelectorAll('button[data-ev]').forEach(function (b) {
      b.addEventListener('click', function () { setStop(stopIndexOf(cur.dyn.id, b.getAttribute('data-ev'))); startTour(); });
    });
    /* 手机上时间线是横排，事件另外放一条横排（桌面端这条藏起来）。 */
    if (evStrip) {
      if (cur.dyn.events && cur.dyn.events.length) {
        var sh = '<span class="ev-strip-label">' + esc(cur.dyn.name) + ' · 重大事件</span>';
        cur.dyn.events.forEach(function (ev) {
          var on = cur.event && cur.event.id === ev.id;
          sh += '<button type="button" data-ev="' + ev.id + '" class="' + (on ? 'active' : '') + '">' + esc(ev.year) + ' ' + esc(ev.title) + '</button>';
        });
        evStrip.innerHTML = sh;
        evStrip.hidden = false;
        evStrip.querySelectorAll('button[data-ev]').forEach(function (b) {
          b.addEventListener('click', function () { setStop(stopIndexOf(cur.dyn.id, b.getAttribute('data-ev'))); startTour(); });
        });
      } else {
        evStrip.innerHTML = '';
        evStrip.hidden = true;
      }
    }
  }
  function setStop(i) {
    stopIdx = Math.max(0, Math.min(STOPS.length - 1, i));
    var stop = STOPS[stopIdx];
    var dyn = stop.dyn;
    var ev = stop.event;
    var era = ERA_BY_ID[dyn.era];
    var ms = ev ? Object.assign({}, ev.map, WHERE[ev.id] || {}) : (MAPS[dyn.era] || {});
    renderRail();
    var hi = diffMaps(prevMap, ms);
    window.renderChinaMap(mapSvg, ms, function (kind, item) {
      stopTour(); /* 点标记看地方故事时停下来，不自动跳走 */
      var tag = kind === 'capital' ? '都城' : kind === 'astro' ? '观星' : kind === 'where' ? '发生地' : '地方';
      markerPop.innerHTML = '<b>' + esc(item.label || item.name) + '（' + tag + '）</b>：' + esc(item.text || '');
    }, hi);
    prevMap = ms;
    if (ev) {
      mapChanged.textContent = '地图变了：' + ev.changed;
      mapChanged.hidden = false;
      mapNote.textContent = ev.year + ' · ' + dyn.name + ' · ' + ev.title;
    } else {
      mapChanged.hidden = true;
      mapChanged.textContent = '';
      mapNote.textContent = dyn.years + ' · ' + dyn.name + '：' + (ms.territoryNote || '');
    }
    markerPop.textContent = '点一点地图上的标记，看看那个地方的故事。';
    var html = '';
    if (ev) {
      html += '<div class="years">' + esc(ev.year) + '</div><h2>' + esc(dyn.name) + ' · ' + esc(ev.title) + '</h2>';
      html += '<div class="tagline">' + esc(dyn.tagline || era.tagline) + '</div>';
      html += '<section class="lens event"><h3>发生了什么</h3><p>' + esc(ev.story) + '</p>' +
        '<p><b>为什么重要：</b>' + esc(ev.why) + '</p>' +
        '<p><b>后来怎么样了：</b>' + esc(ev.later) + '</p>' +
        '<p class="mapline">这时候的中国：' + esc(ev.map.territoryNote || '') + '</p></section>';
      LENSES.forEach(function (pair) { html += lensHtml(dyn, pair[0], pair[1]); });
      story.innerHTML = html;
      startQuiz(dyn);
    } else {
      html += '<div class="years">' + esc(dyn.years) + '</div><h2>' + esc(dyn.name) + '</h2>';
      html += '<div class="tagline">' + esc(era.tagline) + '</div>';
      if (dyn.id === 'xia' && era.prologue) {
        html += '<section class="lens prologue"><h3>先说远古</h3><ul>';
        era.prologue.forEach(function (it) {
          html += '<li><b>' + esc(it.t) + '</b>：' + esc(it.d) + '</li>';
        });
        html += '</ul></section>';
      }
      LENSES.forEach(function (pair) { html += lensHtml(era, pair[0], pair[1]); });
      story.innerHTML = html;
      startQuiz(era);
    }
    btnPrev.disabled = stopIdx === 0;
    btnNext.disabled = stopIdx === STOPS.length - 1;
    /* 当前朝代/事件滚到眼前：事件列表再长，当前这一站也找得到。 */
    try {
      var ab = railList.querySelector('button[data-dyn].active');
      if (ab) ab.scrollIntoView({ block: 'nearest' });
      var ae = railList.querySelector('.ev-list button.active');
      if (ae) ae.scrollIntoView({ block: 'nearest' });
      if (evStrip && !evStrip.hidden) {
        var ac = evStrip.querySelector('button.active');
        if (ac) ac.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      }
    } catch (e) { /* 滚动失败不影响地图与故事 */ }
    document.title = (ev ? dyn.name + ' · ' + ev.title : dyn.name) + ' · 时间里的中国';
    var hash = '#d=' + dyn.id + (ev ? '&e=' + ev.id : '');
    try { if (location.hash !== hash) history.replaceState(null, '', hash); } catch (e) { /* 地址栏同步失败不影响地图与故事 */ }
  }
  function stopTour() {
    if (timer) { clearInterval(timer); timer = null; }
    btnPlay.textContent = '▶ 播放时间';
  }
  function startTour() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      if (stopIdx >= STOPS.length - 1) { stopTour(); return; }
      setStop(stopIdx + 1);
    }, TOUR_MS);
    btnPlay.textContent = '❚❚ 暂停';
  }
  btnPrev.addEventListener('click', function () { setStop(stopIdx - 1); if (timer) startTour(); });
  btnNext.addEventListener('click', function () { setStop(stopIdx + 1); if (timer) startTour(); });
  btnPlay.addEventListener('click', function () {
    if (timer) { stopTour(); return; }
    startTour();
  });
  /* 答题时停下来，不自动跳走。 */
  quizBox.addEventListener('click', function () { stopTour(); });
  window.addEventListener('hashchange', function () {
    var m = (location.hash || '').match(/^#d=([\w-]+)(?:&e=([\w-]+))?/);
    if (m) {
      var si = stopIndexOf(m[1], m[2] || null);
      if (si >= 0) { setStop(si); return; }
    }
    var old = (location.hash || '').match(/^#era=([\w-]+)/);
    if (old) {
      for (var i = 0; i < DYNS.length; i++) {
        if (DYNS[i].era === old[1]) { setStop(firstStopOfDynasty(DYNS[i].id)); return; }
      }
    }
  });
  (function init() {
    var start = 0;
    var m = (location.hash || '').match(/^#d=([\w-]+)(?:&e=([\w-]+))?/);
    if (m) {
      var si = stopIndexOf(m[1], m[2] || null);
      if (si >= 0) start = si;
    } else {
      var old = (location.hash || '').match(/^#era=([\w-]+)/);
      if (old) {
        for (var i = 0; i < DYNS.length; i++) {
          if (DYNS[i].era === old[1]) { start = firstStopOfDynasty(DYNS[i].id); break; }
        }
      }
    }
    setStop(start);
  })();
})();
