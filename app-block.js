(function () {
  const THREE = window.THREE;
  const C = window.MCVCommon;
  C.registerSW();

  const stage = C.createStage({ env: true, grid: true });
  let cube = null;

  // Deixa a textura pixelada (sem borrar), igual ao Minecraft
  function pixelate(tex) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }
  function matFor(tex) {
    return new THREE.MeshStandardMaterial({ map: tex, metalness: 0, roughness: 1, transparent: true, alphaTest: 0.5 });
  }

  function buildCube(materials) {
    if (cube) { stage.scene.remove(cube); cube.geometry.dispose(); }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    cube = new THREE.Mesh(geo, materials);
    cube.position.y = 0.5; // apoia na grade
    stage.scene.add(cube);
    stage.frame(cube, 3.0);
  }

  // Ordem das faces do BoxGeometry: +x, -x, +y, -y, +z, -z  (leste, oeste, cima, baixo, sul, norte)
  function facesFrom({ all, top, side, bottom }) {
    const S = side || all, T = top || all, B = bottom || all;
    return [matFor(S), matFor(S), matFor(T), matFor(B), matFor(S), matFor(S)];
  }

  function textureFromImage(img) {
    const t = new THREE.Texture(img);
    return pixelate(t);
  }

  function loadFiles(files) {
    const imgs = files.filter(f => f.type.startsWith('image/') || /\.png$/i.test(f.name));
    if (!imgs.length) { C.toast('Carregue um arquivo PNG de textura.'); return; }
    C.showLoading(true);
    const loaded = {};
    let pending = imgs.length;
    let dims = '';
    imgs.forEach((f) => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const tex = textureFromImage(img);
        const name = f.name.toLowerCase();
        if (name.includes('_top') || name.includes('_up')) loaded.top = tex;
        else if (name.includes('_bottom') || name.includes('_down')) loaded.bottom = tex;
        else if (name.includes('_side')) loaded.side = tex;
        else loaded.all = tex;
        dims = img.naturalWidth + '×' + img.naturalHeight;
        URL.revokeObjectURL(url);
        if (--pending === 0) finish(loaded, imgs, dims);
      };
      img.onerror = () => { URL.revokeObjectURL(url); if (--pending === 0) finish(loaded, imgs, dims); };
      img.src = url;
    });
  }

  function finish(loaded, imgs, dims) {
    if (!loaded.all && !loaded.top && !loaded.side && !loaded.bottom) { C.showLoading(false); C.toast('Não consegui ler a imagem.'); return; }
    if (!loaded.all) loaded.all = loaded.side || loaded.top || loaded.bottom;
    buildCube(facesFrom(loaded));
    document.getElementById('fname').textContent = (imgs.length === 1 ? imgs[0].name : imgs.length + ' texturas') + ' · ' + dims;
    C.showLoading(false);
  }

  // ---- Textura de exemplo (terra) desenhada no canvas ----
  function demoTexture() {
    const s = 16, cv = document.createElement('canvas'); cv.width = cv.height = s;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const n = Math.floor(60 + Math.abs(Math.sin(x * 2.3 + y * 1.7)) * 40);
      ctx.fillStyle = `rgb(${110 + n * 0.3 | 0}, ${78 + n * 0.2 | 0}, ${50 + n * 0.1 | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const t = new THREE.CanvasTexture(cv);
    return pixelate(t);
  }
  function loadDemo() {
    const t = demoTexture();
    buildCube([matFor(t), matFor(t), matFor(t), matFor(t), matFor(t), matFor(t)]);
    document.getElementById('fname').textContent = 'exemplo (terra)';
  }

  C.wireInput(loadFiles);
  C.wireAutoRotate(stage.controls);
  document.getElementById('reset-btn').addEventListener('click', () => cube && stage.frame(cube, 3.0));
  const gridBtn = document.getElementById('grid-btn');
  gridBtn.addEventListener('click', () => { stage.grid.visible = !stage.grid.visible; gridBtn.classList.toggle('active', stage.grid.visible); });

  loadDemo();
})();
