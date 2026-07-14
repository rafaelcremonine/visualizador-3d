/* Utilidades compartilhadas por todos os visualizadores. Usa window.THREE e window.MCV. */
(function () {
  function createStage(opts = {}) {
    const THREE = window.THREE;
    const { OrbitControls, RoomEnvironment } = window.MCV;
    const { env = true, grid = true, bg = 0x0f1117 } = opts;
    const wrap = document.getElementById('canvas-wrap');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bg);

    const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 8000);
    camera.position.set(3, 2, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    wrap.appendChild(renderer.domElement);

    if (env) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, env ? 0.8 : 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(5, 8, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.8); fill.position.set(-6, 3, -4); scene.add(fill);

    let gridHelper = null;
    if (grid) {
      gridHelper = new THREE.GridHelper(20, 40, 0x3a4058, 0x22263a);
      gridHelper.material.transparent = true; gridHelper.material.opacity = 0.5;
      scene.add(gridHelper);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.autoRotate = true; controls.autoRotateSpeed = 1.2;

    const ticks = [];
    function animate() {
      requestAnimationFrame(animate);
      for (const t of ticks) t();
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    function frame(obj, pad = 2.2) {
      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const dist = maxDim * pad;
      camera.position.set(center.x + dist * 0.7, center.y + dist * 0.5, center.z + dist * 0.9);
      camera.near = maxDim / 100; camera.far = maxDim * 100; camera.updateProjectionMatrix();
      controls.target.copy(center);
      controls.update();
    }

    return { scene, camera, renderer, controls, grid: gridHelper, addTick: (f) => ticks.push(f), frame };
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 4500);
  }
  const showLoading = (v) => document.getElementById('loading')?.classList.toggle('show', v);

  // Liga botão carregar + input + arrastar + colar. onFiles recebe um array de File.
  function wireInput(onFiles) {
    const input = document.getElementById('file-input');
    document.getElementById('load-btn')?.addEventListener('click', () => input.click());
    input?.addEventListener('change', (e) => { if (e.target.files.length) onFiles([...e.target.files]); input.value = ''; });

    const overlay = document.getElementById('drop-overlay');
    let dc = 0;
    addEventListener('dragenter', (e) => { e.preventDefault(); dc++; overlay?.classList.add('show'); });
    addEventListener('dragover', (e) => e.preventDefault());
    addEventListener('dragleave', (e) => { e.preventDefault(); dc--; if (dc <= 0) overlay?.classList.remove('show'); });
    addEventListener('drop', (e) => { e.preventDefault(); dc = 0; overlay?.classList.remove('show'); if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); });
    addEventListener('paste', (e) => {
      const items = e.clipboardData?.items; if (!items) return;
      const files = [];
      for (const it of items) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
      if (files.length) onFiles(files);
    });
  }

  // Botão que liga/desliga rotação automática
  function wireAutoRotate(controls) {
    const b = document.getElementById('rotate-btn');
    b?.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; b.classList.toggle('active', controls.autoRotate); });
  }

  function registerSW() {
    if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  window.MCVCommon = { createStage, toast, showLoading, wireInput, wireAutoRotate, registerSW };
})();
