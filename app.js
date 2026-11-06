/* 时间里的中国：时间线列表 → 时期详情（只回一层），动手练即时反馈 */
(function () {
  'use strict';
  var DATA = window.TIME_CHINA;
  var app = document.getElementById('app');
  var LENSES = [
    ['history', '历史大事'],
    ['astro', '天文观星'],
    ['geo', '地理山河'],
    ['lit', '文学诗文'],
    ['culture', '文化风俗']
  ];
  var LENS_NAMES = { history: '历史', astro: '天文', geo: '地理', lit: '文学', culture: '文化' };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function eraById(id) {
    for (var i = 0; i < DATA.eras.length; i++) if (DATA.eras[i].id === id) return { era: DATA.eras[i], idx: i };
    return null;
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
  function renderHome() {
    var html = '<div class="lead">中国几千年的故事，<b>沿着时间线</b>从头讲到尾。点开一个时期，站在那个年代看星星、走山河、读诗文、过生活——<b>天文、历史、地理、文学、文化，全在一个时期里讲</b>。</div>';
    html += '<ol class="timeline">';
    DATA.eras.forEach(function (e) {
      html += '<li><a class="era-card" href="#era=' + e.id + '">' +
        '<div class="years">' + esc(e.years) + '</div>' +
        '<h2>' + esc(e.name) + '</h2><p>' + esc(e.tagline) + '</p>' +
        '<div class="lenses">天文 · 历史 · 地理 · 文学 · 文化</div></a></li>';
    });
    html += '</ol>';
    app.innerHTML = html;
    document.title = '时间里的中国';
  }
  function renderEra(id) {
    var found = eraById(id);
    if (!found) { renderHome(); return; }
    var era = found.era, idx = found.idx;
    var html = '<div class="detail">';
    html += '<div class="backrow"><a class="backbtn" href="#">← 返回时间线</a></div>';
    html += '<div class="years">' + esc(era.years) + '</div><h2>' + esc(era.name) + '</h2>';
    html += '<div class="tagline">' + esc(era.tagline) + '</div>';
    LENSES.forEach(function (pair) { html += lensHtml(era, pair[0], pair[1]); });
    html += '<section class="quiz" id="quizBox"></section>';
    html += '<div class="backrow">';
    if (idx > 0) html += '<a class="backbtn ghost" href="#era=' + DATA.eras[idx - 1].id + '">← 上一时期：' + esc(DATA.eras[idx - 1].name) + '</a>';
    if (idx < DATA.eras.length - 1) html += '<a class="backbtn ghost" href="#era=' + DATA.eras[idx + 1].id + '">下一时期：' + esc(DATA.eras[idx + 1].name) + ' →</a>';
    html += '<a class="backbtn" href="#">← 返回时间线</a></div>';
    html += '</div>';
    app.innerHTML = html;
    document.title = era.name + ' · 时间里的中国';
    startQuiz(era);
    window.scrollTo(0, 0);
  }
  function startQuiz(era) {
    var box = document.getElementById('quizBox');
    var qs = era.quiz || [];
    var qi = 0, score = 0;
    function show() {
      if (qi >= qs.length) {
        box.innerHTML = '<h3>动手练</h3><p class="score">这个时期答完了：答对 ' + score + ' / ' + qs.length + ' 道。</p>' +
          '<button class="nextbtn" type="button">再练一次</button>';
        box.querySelector('.nextbtn').addEventListener('click', function () { qi = 0; score = 0; show(); });
        return;
      }
      var q = qs[qi];
      var html = '<h3>动手练（' + (qi + 1) + ' / ' + qs.length + '）</h3><div class="q">' + esc(q.q) + '</div><div class="opts">';
      q.options.forEach(function (o, i) {
        html += '<button class="opt" type="button" data-i="' + i + '">' + esc(o) + '</button>';
      });
      html += '</div><div class="why" hidden></div>';
      box.innerHTML = html;
      var opts = box.querySelectorAll('.opt');
      opts.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var picked = parseInt(btn.getAttribute('data-i'), 10);
          opts.forEach(function (b) { b.disabled = true; });
          var why = box.querySelector('.why');
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
          box.appendChild(next);
        });
      });
    }
    show();
  }
  function route() {
    var m = (location.hash || '').match(/^#era=([\w-]+)/);
    if (m) renderEra(m[1]); else renderHome();
  }
  window.addEventListener('hashchange', route);
  route();
})();
