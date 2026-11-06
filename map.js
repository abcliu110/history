/* 时间里的中国 — 2026-11-06 由原型 artifact（shi-jian-li-de-zhong-guo）如实移植进仓库。 */
'use strict';

  /* ---------- 地图状态（统一成：疆域 / 路线 / 都城 / 标记 / 观星点） ---------- */
  function normTerr(list) {
    return (list || []).map(function (t) {
      return typeof t === 'string' ? { d: t } : t;
    });
  }
  function eventState(ev) {
    var m = ev.map;
    var marks = [];
    if (m.cap) marks.push({ name: m.cap.name, sub: m.cap.sub, kind: '都城', story: m.cap.story, cap: true });
    (m.marks || []).forEach(function (p) { marks.push(p); });
    if (m.star) marks.push({ name: m.star.name, sub: '观测天象', kind: '观星', story: m.star.story, star: true });
    var w = EVENT_WHERE[ev.id] || null;
    return {
      keyEvent: !!KEY_EVENTS[ev.id],
      terr: normTerr(TERR[m.terr]),
      routes: (m.routes || []).map(function (k) { var r = EV_ROUTES[k]; return { key: k, d: r.d, lx: r.lx, ly: r.ly, label: r.label }; }),
      marks: marks,
      where: w ? w.list : [],
      wherePath: w ? w.path : null
    };
  }
  function eraState(era) {
    var md = MAPDATA[era.id];
    var routes = [];
    var rt = HAND_ROUTES[era.id];
    if (rt) routes.push({ key: rt.key, d: rt.d, lx: rt.lx, ly: rt.ly, label: rt.label });
    return { terr: normTerr(TERRITORY[era.id]), routes: routes, marks: md.places.slice() };
  }
  function stateKeys(state) {
    var s = {};
    state.terr.forEach(function (t) { s['t:' + t.d] = 1; });
    state.routes.forEach(function (r) { s['r:' + r.key] = 1; });
    state.marks.forEach(function (p) { s[(p.cap ? 'c:' : (p.star ? 's:' : 'm:')) + p.name] = 1; });
    return s;
  }

  /* 地图与地点列表实际显示的标记：发生地排在最前（红色编号 1、2、3……），
   * 发生地 20px 内的普通标记（都城、事件点、观星点）不再重复画——编号标记已经代表那个地方。 */
  function displayMarks(state) {
    var where = state.where || [];
    function nearWhere(p) {
      var xy = PLACE_XY[p.name];
      if (!xy) return false;
      for (var i = 0; i < where.length; i++) {
        var wxy = PLACE_XY[where[i].name];
        if (!wxy) continue;
        var dx = wxy[0] - xy[0], dy = wxy[1] - xy[1];
        if (dx * dx + dy * dy < 400) return true;
      }
      return false;
    }
    var out = [];
    where.forEach(function (w) { out.push({ name: w.name, sub: '', kind: '发生地', story: w.text, where: true, core: w.core || '' }); });
    state.marks.forEach(function (p) { if (!nearWhere(p)) out.push(p); });
    return out;
  }

  function buildMapSvg(state, marks, newKeys) {
    function fl(key) { return newKeys && newKeys[key] ? ' flash' : ''; }
    var h = '<svg viewBox="0 0 1000 720" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    h += '<path class="map-land" d="' + MAP_OUTLINE + '"/>';
    h += '<ellipse class="map-land" cx="595" cy="607" rx="21" ry="15"/>';
    /* 水印：现在的中国轮廓，印在历史地图后面，换站一直在、点不到。 */
    h += '<g class="wm-layer" aria-hidden="true"><path class="wm-outline" d="' + MODERN_OUTLINE + '"/>' +
      '<path class="wm-outline" d="' + MODERN_TAIWAN + '"/><path class="wm-outline" d="' + MODERN_HAINAN + '"/>' +
      '<text class="wm-label" x="822" y="618" text-anchor="middle">现在的中国</text></g>';
    state.terr.forEach(function (t) {
      h += '<path class="map-territory' + fl('t:' + t.d) + '" d="' + t.d + '"/>';
      if (t.label) h += '<text class="map-territory-label' + fl('t:' + t.d) + '" x="' + t.lx + '" y="' + t.ly + '">' + t.label + '</text>';
    });
    MAP_RIVERS.forEach(function (r) {
      h += '<path class="map-river" d="' + r.d + '"/>';
      h += '<text class="river-label" x="' + r.lx + '" y="' + r.ly + '">' + r.name + '</text>';
    });
    state.routes.forEach(function (r) {
      h += '<path class="map-route' + fl('r:' + r.key) + '" d="' + r.d + '"/>';
      h += '<text class="route-label' + fl('r:' + r.key) + '" x="' + r.lx + '" y="' + r.ly + '">' + r.label + '</text>';
    });
    /* 发生地之间的连线：慢慢画出来，标出地点之间的变化。 */
    if (state.wherePath) {
      h += '<path class="where-path" pathLength="100" d="' + state.wherePath + '"/>';
    }
    marks.forEach(function (p, i) {
      var xy = PLACE_XY[p.name];
      if (!xy) return;
      var left = !!LABEL_LEFT[p.name];
      var lx = left ? xy[0] - 18 : xy[0] + 18;
      var key = (p.cap ? 'c:' : (p.star ? 's:' : 'm:')) + p.name;
      var cls = 'mk' + (p.cap ? ' cap' : '') + (p.star ? ' star' : '') + (p.where ? ' where-mk' : '') + fl(key);
      var rad = (p.cap || p.where) ? 13 : 11;
      var sty = p.where ? ' style="animation-delay: ' + (0.5 + 0.5 * i).toFixed(1) + 's"' : '';
      var keyRing = (p.where && state.keyEvent)
        ? '<circle class="key-ring" cx="' + xy[0] + '" cy="' + xy[1] + '" r="20"/>' +
          '<text class="key-star" x="' + (xy[0] + 13) + '" y="' + (xy[1] - 13) + '">★</text>' : '';
      var coreTxt = (p.where && p.core)
        ? '<text class="core-label" x="' + lx + '" y="' + (xy[1] + 27) + '"' + (left ? ' text-anchor="end"' : '') + '>' + esc(p.core) + '</text>' : '';
      h += '<g class="' + cls + '"' + sty + ' data-i="' + i + '">' + keyRing +
        '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + rad + '"/>' +
        '<text class="mk-num" x="' + xy[0] + '" y="' + (xy[1] + 4.5) + '">' + (i + 1) + '</text>' +
        '<text class="mk-label" x="' + lx + '" y="' + (xy[1] + 5) + '"' + (left ? ' text-anchor="end"' : '') + '>' + esc(p.name) + '</text>' + coreTxt + '</g>';
    });
    return h + '</svg>';
  }
