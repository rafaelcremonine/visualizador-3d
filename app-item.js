(function () {
  const THREE = window.THREE;
  const C = window.MCVCommon;
  C.registerSW();

  const stage = C.createStage({ env: true, grid: false });
  stage.controls.autoRotateSpeed = 2.0;
  let mesh = null;
  let flat = false;

  function clear() {
    if (mesh) { stage.scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; }
  }

  // Constrói o item 3D: cada pixel opaco vira um cubinho (item "esticado")
  function build(img) {
    clear();
    const w = img.naturalWidth, h = img.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;

    // preview 2D
    const sp = document.getElementById('sprite2d');
    sp.width = w; sp.height = h;
    sp.getContext('2d').drawImage(img, 0, 0);

    const depth = Math.max(1, Math.round(Math.min(w, h) / 16)); // espessura ~1 px
    const positions = [], colors = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] < 128) continue; // pixel transparente
        positions.push([x - w / 2 + 0.5, (h - 1 - y) - h / 2 + 0.5, 0]);
        const col = new THREE.Color().setRGB(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255, THREE.SRGBColorSpace);
        colors.push(col);
      }
    }
    if (!positions.length) { C.toast('A imagem está vazia/transparente.'); return; }

    const geo = new THREE.BoxGeometry(1, 1, depth);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });
    mesh = new THREE.InstancedMesh(geo, mat, positions.length);
    const dummy = new THREE.Object3D();
    for (let k = 0; k < positions.length; k++) {
      dummy.position.set(...positions[k]); dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
      mesh.setColorAt(k, colors[k]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    stage.scene.add(mesh);
    applyFlat();
    stage.frame(mesh, 1.9);
  }

  function applyFlat() {
    if (!mesh) return;
    stage.controls.autoRotate = !flat && document.getElementById('rotate-btn').classList.contains('active');
    if (flat) { mesh.rotation.set(0, 0, 0); stage.camera.position.set(0, 0, Math.max(mesh.geometry.parameters.depth, 1) * 30); stage.controls.target.set(0, 0, 0); stage.controls.update(); }
  }

  function loadFile(file) {
    if (!(file.type.startsWith('image/') || /\.png$/i.test(file.name))) { C.toast('Carregue um PNG.'); return; }
    C.showLoading(true);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { build(img); document.getElementById('fname').textContent = file.name + ' · ' + img.naturalWidth + '×' + img.naturalHeight; C.showLoading(false); URL.revokeObjectURL(url); };
    img.onerror = () => { C.showLoading(false); URL.revokeObjectURL(url); C.toast('Não consegui ler a imagem.'); };
    img.src = url;
  }

  // ---- Item de exemplo: uma espada ----
  function demo() {
    const s = 16, cv = document.createElement('canvas'); cv.width = cv.height = s;
    const ctx = cv.getContext('2d');
    const P = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
    const BLADE = '#c7d0dd', BLADE2 = '#9aa6b8', GUARD = '#6b4a2a', HANDLE = '#4a3420';
    // lâmina (diagonal do canto sup-direito ao centro)
    for (let k = 0; k < 9; k++) { P(12 - k, 2 + k, BLADE); P(13 - k, 2 + k, BLADE2); }
    P(13, 2, BLADE); P(12, 2, BLADE); P(13, 3, BLADE2);
    // guarda
    P(3, 12, GUARD); P(4, 11, GUARD); P(2, 13, GUARD); P(5, 12, GUARD); P(4, 13, GUARD);
    // cabo
    P(2, 14, HANDLE); P(1, 15, HANDLE); P(3, 13, HANDLE);
    const img = new Image();
    img.onload = () => { build(img); document.getElementById('fname').textContent = 'exemplo (espada)'; };
    img.src = cv.toDataURL();
  }

  C.wireInput((files) => loadFile(files[0]));
  C.wireAutoRotate(stage.controls);
  document.getElementById('reset-btn').addEventListener('click', () => { flat = false; document.getElementById('flat-btn').classList.remove('active'); mesh && stage.frame(mesh, 1.9); });
  const flatBtn = document.getElementById('flat-btn');
  flatBtn.addEventListener('click', () => { flat = !flat; flatBtn.classList.toggle('active', flat); if (!flat && mesh) stage.frame(mesh, 1.9); applyFlat(); });

  demo();
})();
