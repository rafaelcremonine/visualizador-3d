(function () {
  const THREE = window.THREE;
  const C = window.MCVCommon;
  C.registerSW();

  const stage = C.createStage({ env: false, grid: true });
  stage.controls.autoRotateSpeed = 1.4;
  let model = null;
  const D2R = Math.PI / 180;

  // ---------- Parse do formato de geometria Bedrock ----------
  function parseGeometries(json) {
    const out = [];
    if (json['minecraft:geometry']) {
      for (const g of json['minecraft:geometry']) {
        const d = g.description || {};
        out.push({ id: d.identifier || 'geometry', tw: d.texture_width || 64, th: d.texture_height || 64, bones: g.bones || [] });
      }
    } else {
      // formato antigo 1.8: chaves "geometry.xxx"
      for (const k of Object.keys(json)) {
        if (!k.startsWith('geometry.')) continue;
        const g = json[k];
        out.push({ id: k, tw: g.texturewidth || 64, th: g.textureheight || 64, bones: g.bones || [] });
      }
    }
    return out;
  }

  // Aplica UV "box" (uma origem [u,v]) nas 6 faces do BoxGeometry
  function setBoxUV(geo, u, v, w, h, d, tw, th, mirror) {
    // retângulos (px, do topo) para cada face
    let east  = [u,             v + d, d, h];
    let west  = [u + d + w,     v + d, d, h];
    const north = [u + d,         v + d, w, h];
    const south = [u + d + w + d, v + d, w, h];
    const up    = [u + d,         v,     w, d];
    const down  = [u + d + w,     v,     w, d];
    if (mirror) { const t = east; east = west; west = t; }
    // ordem das faces do BoxGeometry: +X,-X,+Y,-Y,+Z,-Z
    const rects = [east, west, up, down, south, north];
    const flips = mirror
      ? ['h', 'h', 'v', 'v', 'h', 'h']   // espelhado: inverte U dos lados
      : ['', '', 'v', 'v', '', ''];       // up/down giram 180 (flip V)
    applyRects(geo, rects, flips, tw, th, mirror);
  }

  // UV por face: { north:{uv:[u,v],uv_size:[w,h]}, ... }
  function setPerFaceUV(geo, uvObj, tw, th) {
    const g = (name, fallbackWH) => {
      const f = uvObj[name];
      if (!f) return [0, 0, 0, 0];
      const [x, y] = f.uv; const [w, h] = f.uv_size || fallbackWH || [0, 0];
      return [x, y, w, h];
    };
    const rects = [g('east'), g('west'), g('up'), g('down'), g('south'), g('north')];
    applyRects(geo, rects, ['', '', '', '', '', ''], tw, th, false);
  }

  function applyRects(geo, rects, flips, tw, th) {
    const uv = geo.attributes.uv;
    for (let fi = 0; fi < 6; fi++) {
      let [x, y, w, h] = rects[fi];
      let u0 = x / tw, u1 = (x + w) / tw;
      let vTop = 1 - y / th, vBot = 1 - (y + h) / th;
      const fl = flips[fi] || '';
      if (fl.includes('h')) { const t = u0; u0 = u1; u1 = t; }
      if (fl.includes('v')) { const t = vTop; vTop = vBot; vBot = t; }
      // ordem dos 4 vértices no BoxGeometry: TL, TR, BL, BR
      uv.setXY(fi * 4 + 0, u0, vTop);
      uv.setXY(fi * 4 + 1, u1, vTop);
      uv.setXY(fi * 4 + 2, u0, vBot);
      uv.setXY(fi * 4 + 3, u1, vBot);
    }
    uv.needsUpdate = true;
  }

  function buildModel(g, texture) {
    const root = new THREE.Group();
    const groups = {}, bonesByName = {};
    for (const b of g.bones) bonesByName[b.name] = b;

    // cria um grupo por bone
    for (const b of g.bones) groups[b.name] = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide });

    for (const b of g.bones) {
      const grp = groups[b.name];
      const pivot = b.pivot || [0, 0, 0];
      const parent = b.parent && groups[b.parent] ? groups[b.parent] : root;
      const pPivot = (b.parent && bonesByName[b.parent] && bonesByName[b.parent].pivot) || [0, 0, 0];
      grp.position.set(pivot[0] - pPivot[0], pivot[1] - pPivot[1], pivot[2] - pPivot[2]);
      if (b.rotation) { grp.rotation.order = 'ZYX'; grp.rotation.set(-b.rotation[0] * D2R, -b.rotation[1] * D2R, b.rotation[2] * D2R); }
      parent.add(grp);

      for (const cube of (b.cubes || [])) {
        const inf = cube.inflate || 0;
        const size = cube.size || [1, 1, 1];
        const origin = cube.origin || [0, 0, 0];
        const w = size[0] + 2 * inf, h = size[1] + 2 * inf, d = size[2] + 2 * inf;
        if (w <= 0 || h <= 0 || d <= 0) continue;
        const ox = origin[0] - inf, oy = origin[1] - inf, oz = origin[2] - inf;
        const geo = new THREE.BoxGeometry(w, h, d);
        if (Array.isArray(cube.uv)) setBoxUV(geo, cube.uv[0], cube.uv[1], size[0], size[1], size[2], g.tw, g.th, cube.mirror);
        else if (cube.uv) setPerFaceUV(geo, cube.uv, g.tw, g.th);
        const mesh = new THREE.Mesh(geo, mat);
        // centro do cubo, relativo ao pivot do bone
        mesh.position.set(ox + w / 2 - pivot[0], oy + h / 2 - pivot[1], oz + d / 2 - pivot[2]);
        grp.add(mesh);
      }
    }
    return root;
  }

  function pixelate(tex) {
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = true; tex.needsUpdate = true;
    return tex;
  }

  function show(g, texture, label) {
    if (model) { stage.scene.remove(model); }
    model = buildModel(g, texture);
    // escala pra caber bem na tela (modelos bedrock ~ dezenas de unidades)
    stage.scene.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 16;
    const s = 2.4 / maxDim;
    model.scale.setScalar(s);
    // apoia na grade
    const box2 = new THREE.Box3().setFromObject(model);
    model.position.y -= box2.min.y;
    stage.frame(model, 2.3);
    document.getElementById('fname').textContent = label;
  }

  function loadFiles(files) {
    const jsonF = files.find(f => /\.json$/i.test(f.name));
    const pngF = files.find(f => /\.(png|jpg|jpeg)$/i.test(f.name) || f.type.startsWith('image/'));
    if (!jsonF) { C.toast('Falta o arquivo de geometria (.json).'); return; }
    C.showLoading(true);
    const jr = new FileReader();
    jr.onload = () => {
      let geos;
      try { geos = parseGeometries(JSON.parse(jr.result)); } catch (e) { C.showLoading(false); C.toast('JSON inválido.'); return; }
      if (!geos.length) { C.showLoading(false); C.toast('Não achei geometria nesse arquivo.'); return; }
      const g = geos[0];
      const label = (jsonF.name) + (pngF ? ' + ' + pngF.name : ' (sem textura)');
      if (pngF) {
        const url = URL.createObjectURL(pngF);
        const img = new Image();
        img.onload = () => { const tex = pixelate(new THREE.Texture(img)); show(g, tex, label); C.showLoading(false); URL.revokeObjectURL(url); };
        img.onerror = () => { show(g, null, label); C.showLoading(false); URL.revokeObjectURL(url); };
        img.src = url;
      } else {
        show(g, null, label); C.showLoading(false);
      }
    };
    jr.readAsText(jsonF);
  }

  // ---------- Exemplo embutido: um "porquinho" de blocos ----------
  function demo() {
    fetch('./samples/mob_porquinho.geo.json').then(r => r.json()).then(json => {
      const g = parseGeometries(json)[0];
      const img = new Image();
      img.onload = () => show(g, pixelate(new THREE.Texture(img)), 'exemplo (porquinho)');
      img.onerror = () => show(g, null, 'exemplo (porquinho)');
      img.src = './samples/mob_porquinho.png';
    }).catch(() => { document.getElementById('fname').textContent = 'carregue um mob para começar'; });
  }

  // Ajuda de teste: posiciona a câmera por ângulo (azimute, elevação)
  window.__setView = (az, el) => {
    const t = stage.controls.target;
    const d = stage.camera.position.distanceTo(t) || 4;
    stage.camera.position.set(
      t.x + d * Math.cos(el) * Math.sin(az),
      t.y + d * Math.sin(el),
      t.z + d * Math.cos(el) * Math.cos(az)
    );
    stage.camera.lookAt(t); stage.controls.update();
  };

  C.wireInput(loadFiles);
  C.wireAutoRotate(stage.controls);
  document.getElementById('reset-btn').addEventListener('click', () => model && stage.frame(model, 2.3));
  const gridBtn = document.getElementById('grid-btn');
  gridBtn.addEventListener('click', () => { stage.grid.visible = !stage.grid.visible; gridBtn.classList.toggle('active', stage.grid.visible); });

  demo();
})();
