/* 中国示意地图：手绘轮廓 + 黄河、长江 + 城市点。
 * 注意：这是示意图，用于帮孩子建立方位感，不作精确测绘；疆域范围亦为示意。 */
window.CHINA_MAP = {
  viewBox: '0 0 1000 720',
  outline: 'M900,51 L848,214 L835,248 L810,282 L764,286 L739,317 L732,334 L706,368 L726,428 L719,487 L693,539 L655,573 L603,590 L564,607 L558,619 L526,606 L513,599 L474,590 L448,573 L423,539 L416,488 L345,479 L294,496 L255,453 L190,419 L139,385 L126,334 L152,299 L190,248 L242,214 L294,180 L319,154 L384,128 L448,111 L513,111 L577,111 L642,111 L706,94 L732,60 L797,51 Z',
  hainan: { cx: 560, cy: 645, rx: 16, ry: 24 },
  rivers: [
    { id: 'yellow', name: '黄河', d: 'M435,368 C480,350 510,349 529,308 C545,275 570,262 577,265 C600,290 610,318 624,373 C650,372 670,350 693,325' },
    { id: 'yangtze', name: '长江', d: 'M345,371 C420,420 480,450 532,460 C570,455 594,441 633,443 C670,435 691,417 726,428' }
  ],
  cities: [
    { name: '北京', x: 660, y: 284 }, { name: '西安', x: 563, y: 380 },
    { name: '洛阳', x: 608, y: 375 }, { name: '开封', x: 633, y: 371 },
    { name: '南京', x: 691, y: 417 }, { name: '杭州', x: 709, y: 448 },
    { name: '成都', x: 501, y: 443 }, { name: '广州', x: 620, y: 571 },
    { name: '上海', x: 726, y: 433 }, { name: '武汉', x: 633, y: 443 },
    { name: '敦煌', x: 380, y: 281 }, { name: '安阳', x: 634, y: 349 }
  ]
};

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* 在 svg 元素里画出某时期的地图状态。
 * mapState: { territory:[d...], territoryNote, capital:[{x,y,name}], routes:[{id,name,d,lx,ly}], points:[{x,y,label,text}], astro:[{x,y,label,text}] }
 * onMarker(kind, item): 点标记时的回调。 */
window.renderChinaMap = function (svg, mapState, onMarker) {
  var M = window.CHINA_MAP;
  var h = '';
  h += '<path class="map-land" d="' + M.outline + '"/>';
  h += '<ellipse class="map-land" cx="' + M.hainan.cx + '" cy="' + M.hainan.cy + '" rx="' + M.hainan.rx + '" ry="' + M.hainan.ry + '"/>';
  (mapState.territory || []).forEach(function (d) {
    h += '<path class="map-territory" d="' + d + '"/>';
  });
  M.rivers.forEach(function (r) {
    h += '<path class="map-river" d="' + r.d + '"/>';
  });
  (mapState.routes || []).forEach(function (rt) {
    h += '<path class="map-route" d="' + rt.d + '"/>';
    h += '<text class="route-label" x="' + rt.lx + '" y="' + rt.ly + '">' + escAttr(rt.name) + '</text>';
  });
  M.cities.forEach(function (c) {
    h += '<circle class="city-dot" cx="' + c.x + '" cy="' + c.y + '" r="3.5"/>';
    h += '<text class="city-label" x="' + (c.x + 7) + '" y="' + (c.y + 4) + '">' + escAttr(c.name) + '</text>';
  });
  function marker(cls, it, sym) {
    return '<g class="mk ' + cls + '" data-kind="' + cls + '" data-label="' + escAttr(it.label || it.name) + '">' +
      '<circle cx="' + it.x + '" cy="' + it.y + '" r="9"/>' +
      '<text class="mk-sym" x="' + it.x + '" y="' + (it.y + 4.5) + '">' + sym + '</text>' +
      '<text class="mk-label" x="' + (it.x + 12) + '" y="' + (it.y + 4) + '">' + escAttr(it.label || it.name) + '</text></g>';
  }
  (mapState.capital || []).forEach(function (c) { h += marker('capital', c, '都'); });
  (mapState.points || []).forEach(function (p) { h += marker('point', p, '●'); });
  (mapState.astro || []).forEach(function (a) { h += marker('astro', a, '★'); });
  svg.innerHTML = h;
  svg.querySelectorAll('.mk').forEach(function (g) {
    g.addEventListener('click', function () {
      var kind = g.getAttribute('data-kind');
      var label = g.getAttribute('data-label');
      var list = kind === 'capital' ? mapState.capital : kind === 'astro' ? mapState.astro : mapState.points;
      var item = null;
      (list || []).forEach(function (it) { if ((it.label || it.name) === label) item = it; });
      if (item && onMarker) onMarker(kind, item);
    });
  });
};
