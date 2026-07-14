(function () {
  const THREE = window.THREE;
  const C = window.MCVCommon;
  C.registerSW();

  const stage = C.createStage({ env: true, grid: true });
  let cube = null, smart = false;
  let faces = null; // {east,west,up,down,south,north} texturas atuais

  // Blocos prontos estilo Minecraft (na pasta samples/blocks)
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

  // brilho por face no estilo Minecraft: +X,-X,+Y,-Y,+Z,-Z
  const MC_BRIGHT = [0.6, 0.6, 1.0, 0.5, 0.8, 0.8];

  function pixelate(tex) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; return tex; }

  function faceMats() {
    // ordem BoxGeometry: east(+X),west(-X),up(+Y),down(-Y),south(+Z),north(-Z)
    const order = ['east', 'west', 'up', 'down', 'south', 'north'];
    return order.map((f, i) => {
      const tex = faces[f] || faces.all || faces.side;
      if (smart) {
        const b = MC_BRIGHT[i];
        return new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(b, b, b), transparent: true, alphaTest: 0.5 });
      }
      return new THREE.MeshStandardMaterial({ map: tex, metalness: 0, roughness: 1, transparent: true, alphaTest: 0.5 });
    });
  }

  function rebuild() {
    if (cube) { stage.scene.remove(cube); cube.geometry.dispose(); cube.material.forEach(m => m.dispose()); }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    cube = new THREE.Mesh(geo, faceMats());
    cube.position.y = 0.5;
    stage.scene.add(cube);
    stage.frame(cube, 3.0);
  }

  function texFromImg(img) { return pixelate(new THREE.Texture(img)); }

  function loadPreset(p) {
    C.showLoading(true);
    const need = p.all ? [['all', p.all]] : [['top', p.top], ['side', p.side], ['bottom', p.bottom]];
    faces = {};
    let pending = need.length;
    need.forEach(([slot, file]) => {
      const img = new Image();
      img.onload = () => { const t = texFromImg(img); if (slot === 'all') faces.all = t; else faces[slot === 'side' ? '_side' : slot] = t; done(); };
      img.onerror = done;
      img.crossOrigin = 'anonymous';
      img.src = B + file;
      function done() { if (--pending === 0) finishPreset(p); }
    });
  }
  function finishPreset(p) {
    // mapeia top/side/bottom -> faces do cubo
    const side = faces._side || faces.all;
    faces = { east: side, west: side, south: side, north: side, up: faces.top || faces.all || side, down: faces.bottom || faces.all || side, all: faces.all, side };
    rebuild();
    document.getElementById('fname').textContent = p.name;
    C.showLoading(false);
    [...document.querySelectorAll('#gallery img')].forEach(el => el.classList.toggle('sel', el.dataset.name === p.name));
  }

  function loadUserFiles(files) {
    const imgs = files.filter(f => f.type.startsWith('image/') || /\.png$/i.test(f.name));
    if (!imgs.length) { C.toast('Carregue um PNG.'); return; }
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
    rebuild();
    document.getElementById('fname').textContent = (imgs.length === 1 ? imgs[0].name : imgs.length + ' texturas') + ' · ' + dims;
    [...document.querySelectorAll('#gallery img')].forEach(el => el.classList.remove('sel'));
    C.showLoading(false);
  }

  function applySmart() {
    document.getElementById('smart-hint').style.display = smart ? 'block' : 'none';
    if (faces) rebuild();
  }

  function buildGallery() {
    const g = document.getElementById('gallery');
    GALLERY.forEach(p => {
      const im = document.createElement('img');
      im.src = B + (p.side || p.all); im.title = p.name; im.dataset.name = p.name;
      im.addEventListener('click', () => loadPreset(p));
      g.appendChild(im);
    });
  }

  C.wireInput(loadUserFiles);
  C.wireAutoRotate(stage.controls);
  document.getElementById('reset-btn').addEventListener('click', () => cube && stage.frame(cube, 3.0));
  const gridBtn = document.getElementById('grid-btn');
  gridBtn.addEventListener('click', () => { stage.grid.visible = !stage.grid.visible; gridBtn.classList.toggle('active', stage.grid.visible); });
  const smartBtn = document.getElementById('smart-btn');
  smartBtn.addEventListener('click', () => { smart = !smart; smartBtn.classList.toggle('active', smart); applySmart(); });

  buildGallery();
  loadPreset(GALLERY[0]); // começa com grama
})();
