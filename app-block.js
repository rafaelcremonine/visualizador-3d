(function () {
  const THREE = window.THREE;
  const C = window.MCVCommon;
  const MB = window.MCBedrock;
  C.registerSW();

  const stage = C.createStage({ env: true, grid: true });
  let cube = null, faces = null, smart = false;
  let geoModel = null, geoMeshes = [], geoTex = null, geoActive = false;
  // memória pra juntar geometria + textura carregadas em passos separados
  let curGeo = null, curGeoName = '', curTex = null, curTexName = '';

  const B = './samples/blocks/';
  const GALLERY = [
    { name: 'Grama',              top: 'grama_top.png', side: 'grama_side.png', bottom: 'grama_bottom.png' },
    { name: 'Terra',             all: 'terra.png' },
    { name: 'Pedra',             all: 'pedra.png' },
    { name: 'Pedregulho',        all: 'pedregulho.png' },
    { name: 'Tábuas de Carvalho',all: 'planks.png' },
    { name: 'Tronco de Carvalho',top: 'tronco_top.png', side: 'tronco_side.png', bottom: 'tronco_top.png' },
    { name: 'Areia',             all: 'areia.png' },
    { name: 'Folhas',            all: 'folhas.png' },
    { name: 'Minério de Diamante', all: 'minerio_diamante.png' },
    { name: 'Minério de Ouro',   all: 'minerio_ouro.png' },
    { name: 'Minério de Carvão', all: 'minerio_carvao.png' }
  ];
  const MC_BRIGHT = [0.6, 0.6, 1.0, 0.5, 0.8, 0.8];

  const pixelate = (t) => { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  const texFromImg = (img) => pixelate(new THREE.Texture(img));
  const geoHint = (v) => { const e = document.getElementById('geo-hint'); if (e) e.style.display = v ? 'block' : 'none'; };

  function removeCube() { if (cube) { stage.scene.remove(cube); cube.geometry.dispose(); cube.material.forEach(m => m.dispose()); cube = null; } }
  function removeGeo() { if (geoModel) { stage.scene.remove(geoModel); geoModel = null; geoMeshes = []; } }

  // ---------------- CUBO (textura simples) ----------------
  function faceMats() {
    const order = ['east', 'west', 'up', 'down', 'south', 'north'];
    return order.map((f, i) => {
      const tex = faces[f] || faces.all || faces.side;
      if (smart) { const b = MC_BRIGHT[i]; return new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(b, b, b), transparent: true, alphaTest: 0.5 }); }
      return new THREE.MeshStandardMaterial({ map: tex, metalness: 0, roughness: 1, transparent: true, alphaTest: 0.5 });
    });
  }
  function rebuildCube() {
    geoActive = false; removeGeo(); removeCube(); geoHint(false);
    cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), faceMats());
    cube.position.y = 0.5; stage.scene.add(cube); stage.frame(cube, 3.0);
  }

  // ---------------- GEOMETRIA (forma real) ----------------
  function bakeMCColors(geom) {
    const norm = geom.attributes.normal, n = norm.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const nx = norm.getX(i), ny = norm.getY(i);
      let b = 0.8;
      if (ny > 0.5) b = 1.0; else if (ny < -0.5) b = 0.5; else if (Math.abs(nx) > 0.5) b = 0.6; else b = 0.8;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  function applyGeoMaterials() {
    geoMeshes.forEach(m => {
      if (m.material) m.material.dispose();
      m.material = smart
        ? new THREE.MeshBasicMaterial({ map: geoTex, vertexColors: true, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ map: geoTex, roughness: 1, metalness: 0, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide });
    });
  }
  function renderGeo() {
    removeCube(); removeGeo();
    geoActive = true;
    geoTex = curTex;
    geoModel = MB.buildModel(curGeo, curTex).root;
    geoMeshes = [];
    geoModel.traverse(o => { if (o.isMesh) { bakeMCColors(o.geometry); geoMeshes.push(o); } });
    applyGeoMaterials();
    stage.scene.add(geoModel);
    let bx = new THREE.Box3().setFromObject(geoModel);
    const size = bx.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 16;
    geoModel.scale.setScalar(2.6 / maxDim);
    bx = new THREE.Box3().setFromObject(geoModel);
    geoModel.position.y -= bx.min.y;
    stage.frame(geoModel, 2.4);
    document.getElementById('fname').textContent = curGeoName + (curTexName ? ' + ' + curTexName : ' — falta a textura');
    geoHint(!curTexName);
    [...document.querySelectorAll('#gallery img')].forEach(el => el.classList.remove('sel'));
  }

  function readGeoFile(file, cb) {
    const jr = new FileReader();
    jr.onload = () => {
      let geos;
      try { geos = MB.parseGeometries(JSON.parse(jr.result)); } catch (e) { C.showLoading(false); C.toast('Esse .json de geometria está inválido.'); return; }
      if (!geos.length) { C.showLoading(false); C.toast('Não encontrei geometria nesse arquivo.'); return; }
      curGeo = geos[0]; curGeoName = file.name; cb();
    };
    jr.readAsText(file);
  }
  function readTexFile(file, cb) {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { curTex = texFromImg(img); curTexName = file.name; URL.revokeObjectURL(url); cb(true); };
    img.onerror = () => { URL.revokeObjectURL(url); cb(false); };
    img.src = url;
  }

  // ---------------- entrada de arquivos ----------------
  function loadUserFiles(files) {
    const jsonF = files.find(f => /\.(json|geo)$/i.test(f.name) || f.type === 'application/json');
    const imgs = files.filter(f => f.type.startsWith('image/') || /\.png$/i.test(f.name));

    if (jsonF) { // carregou a GEOMETRIA (com ou sem textura no mesmo lote)
      C.showLoading(true);
      readGeoFile(jsonF, () => {
        if (imgs.length) readTexFile(imgs[0], () => { renderGeo(); C.showLoading(false); });
        else { renderGeo(); C.showLoading(false); } // usa textura anterior se houver, senão mostra a forma cinza
      });
      return;
    }

    if (imgs.length && geoActive && curGeo) { // já tem uma FORMA -> esse PNG é a textura dela
      C.showLoading(true);
      readTexFile(imgs[0], () => { renderGeo(); C.showLoading(false); });
      return;
    }

    if (!imgs.length) { C.toast('Carregue um PNG (textura), ou um .geo/.json + textura.'); return; }

    // caminho do CUBO (textura simples / _top/_side/_bottom)
    C.showLoading(true);
    const acc = {}; let pending = imgs.length; let dims = '';
    imgs.forEach(f => {
      const url = URL.createObjectURL(f); const img = new Image();
      img.onload = () => {
        const t = texFromImg(img); const n = f.name.toLowerCase();
        if (n.includes('_top') || n.includes('_up')) acc.top = t;
        else if (n.includes('_bottom') || n.includes('_down')) acc.bottom = t;
        else if (n.includes('_side')) acc.side = t; else acc.all = t;
        dims = img.naturalWidth + '×' + img.naturalHeight; URL.revokeObjectURL(url); if (--pending === 0) finishUser(imgs, dims, acc);
      };
      img.onerror = () => { URL.revokeObjectURL(url); if (--pending === 0) finishUser(imgs, dims, acc); };
      img.src = url;
    });
  }
  function finishUser(imgs, dims, acc) {
    const side = acc.side || acc.all || acc.top || acc.bottom;
    if (!side) { C.showLoading(false); C.toast('Não consegui ler a imagem.'); return; }
    faces = { east: side, west: side, south: side, north: side, up: acc.top || acc.all || side, down: acc.bottom || acc.all || side, all: acc.all, side };
    rebuildCube();
    document.getElementById('fname').textContent = (imgs.length === 1 ? imgs[0].name : imgs.length + ' texturas') + ' · ' + dims;
    C.showLoading(false);
  }

  // ---------------- galeria ----------------
  function loadPreset(p) {
    C.showLoading(true);
    const need = p.all ? [['all', p.all]] : [['top', p.top], ['side', p.side], ['bottom', p.bottom]];
    faces = {}; let pending = need.length;
    need.forEach(([slot, file]) => {
      const img = new Image();
      img.onload = () => { const t = texFromImg(img); if (slot === 'all') faces.all = t; else if (slot === 'side') faces._side = t; else faces[slot] = t; done(); };
      img.onerror = done; img.crossOrigin = 'anonymous'; img.src = B + file;
      function done() { if (--pending === 0) finishPreset(p); }
    });
  }
  function finishPreset(p) {
    const side = faces._side || faces.all;
    faces = { east: side, west: side, south: side, north: side, up: faces.top || faces.all || side, down: faces.bottom || faces.all || side, all: faces.all, side };
    rebuildCube();
    document.getElementById('fname').textContent = p.name;
    C.showLoading(false);
    [...document.querySelectorAll('#gallery img')].forEach(el => el.classList.toggle('sel', el.dataset.name === p.name));
  }

  function applySmart() {
    document.getElementById('smart-hint').style.display = smart ? 'block' : 'none';
    if (geoActive) applyGeoMaterials();
    else if (faces) rebuildCube();
  }

  function buildGallery() {
    const g = document.getElementById('gallery');
    GALLERY.forEach(p => { const im = document.createElement('img'); im.src = B + (p.side || p.all); im.title = p.name; im.dataset.name = p.name; im.addEventListener('click', () => loadPreset(p)); g.appendChild(im); });
  }

  C.wireInput(loadUserFiles);
  C.wireAutoRotate(stage.controls);
  document.getElementById('reset-btn').addEventListener('click', () => { const t = geoActive ? geoModel : cube; if (t) stage.frame(t, geoActive ? 2.4 : 3.0); });
  const gridBtn = document.getElementById('grid-btn');
  gridBtn.addEventListener('click', () => { stage.grid.visible = !stage.grid.visible; gridBtn.classList.toggle('active', stage.grid.visible); });
  const smartBtn = document.getElementById('smart-btn');
  smartBtn.addEventListener('click', () => { smart = !smart; smartBtn.classList.toggle('active', smart); applySmart(); });

  buildGallery();
  loadPreset(GALLERY[0]);
})();
