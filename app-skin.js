(function () {
  const THREE = window.THREE;
  const C = window.MCVCommon;
  const MB = window.MCBedrock;
  C.registerSW();

  const stage = C.createStage({ env: false, grid: true });
  stage.controls.autoRotateSpeed = 1.2;
  let model = null, bones = null, smart = false, t0 = 0;

  // Geometria do boneco padrão do Minecraft (Steve). texH=64 (moderno) ou 32 (antigo)
  function makePlayerGeo(texH) {
    const modern = texH >= 64;
    const bones = [];
    const cube = (origin, size, uv, inflate = 0, mirror = false) => ({ origin, size, uv, inflate, mirror });
    const bone = (name, pivot, cubes, parent) => bones.push({ name, pivot, parent, cubes });

    const head = [cube([-4, 24, -4], [8, 8, 8], [0, 0]), cube([-4, 24, -4], [8, 8, 8], [32, 0], 0.5)];
    bone('cabeca', [0, 24, 0], head);

    const body = [cube([-4, 12, -2], [8, 12, 4], [16, 16])];
    if (modern) body.push(cube([-4, 12, -2], [8, 12, 4], [16, 32], 0.25));
    bone('corpo', [0, 24, 0], body);

    const ra = [cube([-8, 12, -2], [4, 12, 4], [40, 16])];
    if (modern) ra.push(cube([-8, 12, -2], [4, 12, 4], [40, 32], 0.25));
    bone('braco_d', [-6, 22, 0], ra, 'corpo');

    const la = modern ? [cube([4, 12, -2], [4, 12, 4], [32, 48])] : [cube([4, 12, -2], [4, 12, 4], [40, 16], 0, true)];
    if (modern) la.push(cube([4, 12, -2], [4, 12, 4], [48, 48], 0.25));
    bone('braco_e', [6, 22, 0], la, 'corpo');

    const rl = [cube([-4, 0, -2], [4, 12, 4], [0, 16])];
    if (modern) rl.push(cube([-4, 0, -2], [4, 12, 4], [0, 32], 0.25));
    bone('perna_d', [-2, 12, 0], rl, 'corpo');

    const ll = modern ? [cube([0, 0, -2], [4, 12, 4], [16, 48])] : [cube([0, 0, -2], [4, 12, 4], [0, 16], 0, true)];
    if (modern) ll.push(cube([0, 0, -2], [4, 12, 4], [0, 48], 0.25));
    bone('perna_e', [2, 12, 0], ll, 'corpo');

    return { id: 'geometry.player', tw: 64, th: texH, bones };
  }

  function show(img, label) {
    if (model) stage.scene.remove(model);
    const texH = img.naturalHeight <= 32 ? 32 : 64;
    const g = makePlayerGeo(texH);
    const tex = MB.pixelate(new THREE.Texture(img));
    const built = MB.buildModel(g, tex, { alphaTest: 0.05 });
    model = built.root; bones = built.bones;
    stage.scene.add(model);
    let box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 32;
    model.scale.setScalar(3.0 / maxDim);
    box = new THREE.Box3().setFromObject(model);
    model.position.y -= box.min.y;
    stage.frame(model, 2.1);
    document.getElementById('fname').textContent = label + ' · ' + img.naturalWidth + '×' + img.naturalHeight;
  }

  // animação de andar (modo Minecraft)
  stage.addTick(() => {
    if (!smart || !bones) return;
    const t = (performance.now() - t0) / 1000;
    const s = Math.sin(t * 4) * 0.5;
    if (bones.braco_d) bones.braco_d.rotation.x = s;
    if (bones.braco_e) bones.braco_e.rotation.x = -s;
    if (bones.perna_d) bones.perna_d.rotation.x = -s;
    if (bones.perna_e) bones.perna_e.rotation.x = s;
  });
  function applySmart() {
    document.getElementById('smart-hint').style.display = smart ? 'block' : 'none';
    if (smart) t0 = performance.now();
    else if (bones) ['braco_d', 'braco_e', 'perna_d', 'perna_e'].forEach(n => bones[n] && (bones[n].rotation.x = 0));
  }

  function loadFile(file) {
    if (!(file.type.startsWith('image/') || /\.png$/i.test(file.name))) { C.toast('Carregue um PNG de skin.'); return; }
    C.showLoading(true);
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { show(img, file.name); C.showLoading(false); URL.revokeObjectURL(url); };
    img.onerror = () => { C.showLoading(false); URL.revokeObjectURL(url); C.toast('Não consegui ler a skin.'); };
    img.src = url;
  }

  function demo() {
    const img = new Image();
    img.onload = () => show(img, 'exemplo (Steve)');
    img.onerror = () => { document.getElementById('fname').textContent = 'carregue uma skin'; };
    img.src = './samples/skin_steve.png';
  }

  window.__setView = (az, el) => {
    const t = stage.controls.target; const d = stage.camera.position.distanceTo(t) || 4;
    stage.camera.position.set(t.x + d * Math.cos(el) * Math.sin(az), t.y + d * Math.sin(el), t.z + d * Math.cos(el) * Math.cos(az));
    stage.camera.lookAt(t); stage.controls.update();
  };

  C.wireInput((files) => loadFile(files[0]));
  C.wireAutoRotate(stage.controls);
  document.getElementById('reset-btn').addEventListener('click', () => model && stage.frame(model, 2.1));
  const smartBtn = document.getElementById('smart-btn');
  smartBtn.addEventListener('click', () => { smart = !smart; smartBtn.classList.toggle('active', smart); applySmart(); });

  demo();
})();
