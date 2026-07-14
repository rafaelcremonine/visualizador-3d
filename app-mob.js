(function () {
  const THREE = window.THREE;
  const C = window.MCVCommon;
  const MB = window.MCBedrock;
  C.registerSW();

  const stage = C.createStage({ env: false, grid: true });
  stage.controls.autoRotateSpeed = 1.4;
  let model = null, bones = null, gaze = null, smart = false;

  function show(g, texture, label) {
    if (model) stage.scene.remove(model);
    const built = MB.buildModel(g, texture);
    model = built.root; bones = built.bones;
    stage.scene.add(model);
    let box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 16;
    model.scale.setScalar(2.4 / maxDim);
    box = new THREE.Box3().setFromObject(model);
    model.position.y -= box.min.y;
    stage.frame(model, 2.3);
    document.getElementById('fname').textContent = label;
    buildGaze();
  }

  // Seta que mostra pra onde o mob olha (modo Minecraft)
  function buildGaze() {
    gaze = null;
    if (!bones) return;
    const headName = Object.keys(bones).find(n => /head|cabe/i.test(n));
    const head = headName ? bones[headName] : (bones[Object.keys(bones)[0]]);
    if (!head) return;
    const dir = new THREE.Vector3(0, 0, -1);
    const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), 10, 0x6c8cff, 3.5, 2.4);
    arrow.visible = smart;
    head.add(arrow);
    gaze = arrow;
    applySmart();
  }

  function applySmart() {
    if (gaze) gaze.visible = smart;
    document.getElementById('smart-hint').style.display = smart ? 'block' : 'none';
  }

  function loadFiles(files) {
    const jsonF = files.find(f => /\.json$/i.test(f.name));
    const pngF = files.find(f => /\.(png|jpg|jpeg)$/i.test(f.name) || f.type.startsWith('image/'));
    if (!jsonF) { C.toast('Falta o arquivo de geometria (.json).'); return; }
    C.showLoading(true);
    const jr = new FileReader();
    jr.onload = () => {
      let geos; try { geos = MB.parseGeometries(JSON.parse(jr.result)); } catch (e) { C.showLoading(false); C.toast('JSON inválido.'); return; }
      if (!geos.length) { C.showLoading(false); C.toast('Não achei geometria nesse arquivo.'); return; }
      const g = geos[0];
      const label = jsonF.name + (pngF ? ' + ' + pngF.name : ' (sem textura)');
      if (pngF) {
        const url = URL.createObjectURL(pngF); const img = new Image();
        img.onload = () => { show(g, MB.pixelate(new THREE.Texture(img)), label); C.showLoading(false); URL.revokeObjectURL(url); };
        img.onerror = () => { show(g, null, label); C.showLoading(false); URL.revokeObjectURL(url); };
        img.src = url;
      } else { show(g, null, label); C.showLoading(false); }
    };
    jr.readAsText(jsonF);
  }

  function demo() {
    fetch('./samples/mob_porquinho.geo.json').then(r => r.json()).then(json => {
      const g = MB.parseGeometries(json)[0]; const img = new Image();
      img.onload = () => show(g, MB.pixelate(new THREE.Texture(img)), 'exemplo (porquinho)');
      img.onerror = () => show(g, null, 'exemplo (porquinho)');
      img.src = './samples/mob_porquinho.png';
    }).catch(() => { document.getElementById('fname').textContent = 'carregue um mob para começar'; });
  }

  window.__setView = (az, el) => {
    const t = stage.controls.target; const d = stage.camera.position.distanceTo(t) || 4;
    stage.camera.position.set(t.x + d * Math.cos(el) * Math.sin(az), t.y + d * Math.sin(el), t.z + d * Math.cos(el) * Math.cos(az));
    stage.camera.lookAt(t); stage.controls.update();
  };

  C.wireInput(loadFiles);
  C.wireAutoRotate(stage.controls);
  document.getElementById('reset-btn').addEventListener('click', () => model && stage.frame(model, 2.3));
  const gridBtn = document.getElementById('grid-btn');
  gridBtn.addEventListener('click', () => { stage.grid.visible = !stage.grid.visible; gridBtn.classList.toggle('active', stage.grid.visible); });
  const smartBtn = document.getElementById('smart-btn');
  smartBtn.addEventListener('click', () => { smart = !smart; smartBtn.classList.toggle('active', smart); applySmart(); });

  demo();
})();
