(function () {
  const THREE = window.THREE;
  const { GLTFLoader, OBJLoader, STLLoader, FBXLoader, PLYLoader } = window.MCV;
  const C = window.MCVCommon;
  C.registerSW();

  const stage = C.createStage({ env: true, grid: true });
  let current = null, wireframe = false, smart = false;

  // sombra de contato (modo Minecraft)
  const shadow = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.visible = false; stage.scene.add(m);
    return m;
  })();
  function placeShadow() {
    if (!current) return;
    const box = new THREE.Box3().setFromObject(current);
    const size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.z) * 1.6;
    shadow.scale.set(r, r, 1);
    shadow.position.set((box.min.x + box.max.x) / 2, box.min.y + 0.001, (box.min.z + box.max.z) / 2);
    shadow.visible = smart;
  }

  function defaultMat() { return new THREE.MeshStandardMaterial({ color: 0xb8c0d0, metalness: 0.1, roughness: 0.6 }); }

  function setModel(obj) {
    if (current) { stage.scene.remove(current); dispose(current); }
    current = obj; stage.scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    obj.scale.multiplyScalar(2.5 / maxDim);
    box.setFromObject(obj); box.getCenter(center); obj.position.sub(center);
    applyWire();
    stage.frame(obj);
    placeShadow();
  }
  function applyWire() {
    current?.traverse((c) => { if (c.isMesh && c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m.wireframe = wireframe); });
  }
  function dispose(o) { o.traverse((c) => { if (c.isMesh) { c.geometry?.dispose(); (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m?.dispose()); } }); }

  function loadDemo() {
    const geo = new THREE.TorusKnotGeometry(1, 0.32, 220, 32);
    setModel(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6c8cff, metalness: 0.6, roughness: 0.2 })));
    document.getElementById('fname').textContent = 'modelo de exemplo';
  }

  function loadFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const url = URL.createObjectURL(file);
    C.showLoading(true);
    const ok = (obj) => { setModel(obj); document.getElementById('fname').textContent = file.name; C.showLoading(false); URL.revokeObjectURL(url); };
    const err = (e) => { console.error(e); C.showLoading(false); URL.revokeObjectURL(url); C.toast('Não consegui abrir "' + file.name + '".'); };
    try {
      if (ext === 'glb' || ext === 'gltf') new GLTFLoader().load(url, (g) => ok(g.scene), undefined, err);
      else if (ext === 'obj') new OBJLoader().load(url, (o) => { o.traverse(c => { if (c.isMesh && !c.material) c.material = defaultMat(); }); ok(o); }, undefined, err);
      else if (ext === 'stl') new STLLoader().load(url, (g) => { g.computeVertexNormals(); ok(new THREE.Mesh(g, defaultMat())); }, undefined, err);
      else if (ext === 'ply') new PLYLoader().load(url, (g) => { g.computeVertexNormals(); const m = defaultMat(); if (g.hasAttribute('color')) m.vertexColors = true; ok(new THREE.Mesh(g, m)); }, undefined, err);
      else if (ext === 'fbx') new FBXLoader().load(url, (o) => ok(o), undefined, err);
      else { C.showLoading(false); URL.revokeObjectURL(url); C.toast('Formato ".' + ext + '" não suportado aqui.'); }
    } catch (e) { err(e); }
  }

  C.wireInput((files) => loadFile(files[0]));
  C.wireAutoRotate(stage.controls);
  document.getElementById('reset-btn').addEventListener('click', () => current && stage.frame(current));
  const wireBtn = document.getElementById('wire-btn');
  wireBtn.addEventListener('click', () => { wireframe = !wireframe; wireBtn.classList.toggle('active', wireframe); applyWire(); });
  const gridBtn = document.getElementById('grid-btn');
  gridBtn.addEventListener('click', () => { stage.grid.visible = !stage.grid.visible; gridBtn.classList.toggle('active', stage.grid.visible); });
  const smartBtn = document.getElementById('smart-btn');
  smartBtn.addEventListener('click', () => { smart = !smart; smartBtn.classList.toggle('active', smart); placeShadow(); });

  loadDemo();
})();
