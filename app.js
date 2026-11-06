/* 时间里的中国 v2：地图为核心，时间线在旁边。
 * 一页到底：侧边选时期 → 中央地图变化 → 故事围着地图讲 → 动手练在下。 */
(function () {
  'use strict';
  var DATA = window.TIME_CHINA;
  var MAPS = window.ERA_MAPS;
  var railList = document.getElementById('railList');
  var mapSvg = document.getElementById('mapSvg');
  var mapNote = document.getElementById('mapNote');
  var markerPop = document.getElementById('markerPop');
  var story = document.getElementById('story');
  var quizBox = document.getElementById('quizBox');
  var btnPrev = document.getElementById('btnPrev');
  var btnNext = document.getElementById('btnNext');
  var btnPlay = document.getElementById('btnPlay');
  var idx = 0;
  var timer = null;
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
  function lensHtml(era, key, title) {
    var items = era[key] || [];
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
  function startQuiz(era) {
    var qs = era.quiz || [];
    var qi = 0, score = 0;
    function show() {
      if (qi >= qs.length) {
        quizBox.innerHTML = '<h3>动手练</h3><p class="score">这个时期答完了：答对 ' + score + ' / ' + qs.length + ' 道。</p>' +
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
  function renderRail() {
    var html = '';
    DATA.eras.forEach(function (e, i) {
      html += '<li><button type="button" data-i="' + i + '" class="' + (i === idx ? 'active' : '') + '">' +
        '<span class="y">' + esc(e.years) + '</span><span class="n">' + esc(e.name) + '</span></button></li>';
    });
    railList.innerHTML = html;
    railList.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { stopPlay(); setEra(parseInt(b.getAttribute('data-i'), 10)); });
    });
  }
  function setEra(i) {
    idx = Math.max(0, Math.min(DATA.eras.length - 1, i));
    var era = DATA.eras[idx];
    var ms = MAPS[era.id] || {};
    renderRail();
    window.renderChinaMap(mapSvg, ms, function (kind, item) {
      var tag = kind === 'capital' ? '都城' : kind === 'astro' ? '观星' : '地方';
      markerPop.innerHTML = '<b>' + esc(item.label || item.name) + '（' + tag + '）</b>：' + esc(item.text || '');
    });
    mapNote.textContent = era.years + ' · ' + era.name + '：' + (ms.territoryNote || '');
    markerPop.textContent = '点一点地图上的标记，看看那个地方的故事。';
    var html = '<div class="years">' + esc(era.years) + '</div><h2>' + esc(era.name) + '</h2>';
    html += '<div class="tagline">' + esc(era.tagline) + '</div>';
    if (era.prologue) {
      html += '<section class="lens prologue"><h3>先说远古</h3><ul>';
      era.prologue.forEach(function (it) {
        html += '<li><b>' + esc(it.t) + '</b>：' + esc(it.d) + '</li>';
      });
      html += '</ul></section>';
    }
    LENSES.forEach(function (pair) { html += lensHtml(era, pair[0], pair[1]); });
    story.innerHTML = html;
    startQuiz(era);
    btnPrev.disabled = idx === 0;
    btnNext.disabled = idx === DATA.eras.length - 1;
    document.title = era.name + ' · 时间里的中国';
    try { if (location.hash !== '#era=' + era.id) history.replaceState(null, '', '#era=' + era.id); } catch (e) { /* 地址栏同步失败不影响地图与故事 */ }
  }
  function stopPlay() {
    if (timer) { clearInterval(timer); timer = null; }
    btnPlay.textContent = '▶ 播放时间';
  }
  btnPrev.addEventListener('click', function () { stopPlay(); setEra(idx - 1); });
  btnNext.addEventListener('click', function () { stopPlay(); setEra(idx + 1); });
  btnPlay.addEventListener('click', function () {
    if (timer) { stopPlay(); return; }
    btnPlay.textContent = '❚❚ 暂停';
    timer = setInterval(function () {
      if (idx >= DATA.eras.length - 1) { stopPlay(); return; }
      setEra(idx + 1);
    }, 3000);
  });
  window.addEventListener('hashchange', function () {
    var m = (location.hash || '').match(/^#era=([\w-]+)/);
    if (!m) return;
    for (var i = 0; i < DATA.eras.length; i++) {
      if (DATA.eras[i].id === m[1]) { stopPlay(); setEra(i); return; }
    }
  });
  (function init() {
    var m = (location.hash || '').match(/^#era=([\w-]+)/);
    var start = 0;
    if (m) {
      for (var i = 0; i < DATA.eras.length; i++) if (DATA.eras[i].id === m[1]) start = i;
    }
    setEra(start);
  })();
})();
