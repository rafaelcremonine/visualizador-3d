/* Parser + construtor de modelos no formato de geometria Bedrock. Usa window.THREE.
   Expõe window.MCBedrock = { parseGeometries, buildModel, pixelate } */
(function () {
  const THREE = window.THREE;
  const D2R = Math.PI / 180;

  function parseGeometries(json) {
    const out = [];
    if (json['minecraft:geometry']) {
      for (const g of json['minecraft:geometry']) {
        const d = g.description || {};
        out.push({ id: d.identifier || 'geometry', tw: d.texture_width || 64, th: d.texture_height || 64, bones: g.bones || [] });
      }
    } else {
      for (const k of Object.keys(json)) {
        if (!k.startsWith('geometry.')) continue;
        const g = json[k];
        out.push({ id: k, tw: g.texturewidth || 64, th: g.textureheight || 64, bones: g.bones || [] });
      }
    }
    return out;
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
      uv.setXY(fi * 4 + 0, u0, vTop);
      uv.setXY(fi * 4 + 1, u1, vTop);
      uv.setXY(fi * 4 + 2, u0, vBot);
      uv.setXY(fi * 4 + 3, u1, vBot);
    }
    uv.needsUpdate = true;
  }

  function setBoxUV(geo, u, v, w, h, d, tw, th, mirror) {
    let east  = [u,             v + d, d, h];
    let west  = [u + d + w,     v + d, d, h];
    const north = [u + d,         v + d, w, h];
    const south = [u + d + w + d, v + d, w, h];
    const up    = [u + d,         v,     w, d];
    const down  = [u + d + w,     v,     w, d];
    if (mirror) { const t = east; east = west; west = t; }
    const rects = [east, west, up, down, south, north];
    const flips = mirror ? ['h', 'h', 'v', 'v', 'h', 'h'] : ['', '', 'v', 'v', '', ''];
    applyRects(geo, rects, flips, tw, th);
  }

  function setPerFaceUV(geo, uvObj, tw, th) {
    const g = (name) => { const f = uvObj[name]; if (!f) return [0, 0, 0, 0]; const [x, y] = f.uv; const [w, h] = f.uv_size || [0, 0]; return [x, y, w, h]; };
    applyRects(geo, [g('east'), g('west'), g('up'), g('down'), g('south'), g('north')], ['', '', '', '', '', ''], tw, th);
  }

  // Retorna { root, bones } onde bones é um mapa nome->THREE.Group
  function buildModel(g, texture, opts = {}) {
    const root = new THREE.Group();
    const groups = {}, bonesByName = {};
    for (const b of g.bones) bonesByName[b.name] = b;
    for (const b of g.bones) groups[b.name] = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0, transparent: true, alphaTest: opts.alphaTest ?? 0.2, side: THREE.DoubleSide });

    for (const b of g.bones) {
      const grp = groups[b.name];
      const pivot = b.pivot || [0, 0, 0];
      const parent = b.parent && groups[b.parent] ? groups[b.parent] : root;
      const pPivot = (b.parent && bonesByName[b.parent] && bonesByName[b.parent].pivot) || [0, 0, 0];
      grp.position.set(pivot[0] - pPivot[0], pivot[1] - pPivot[1], pivot[2] - pPivot[2]);
      if (b.rotation) { grp.rotation.order = 'ZYX'; grp.rotation.set(-b.rotation[0] * D2R, -b.rotation[1] * D2R, b.rotation[2] * D2R); }
      grp.userData.pivot = pivot;
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
        mesh.position.set(ox + w / 2 - pivot[0], oy + h / 2 - pivot[1], oz + d / 2 - pivot[2]);
        grp.add(mesh);
      }
    }
    return { root, bones: groups, material: mat };
  }

  function pixelate(tex) {
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = true; tex.needsUpdate = true;
    return tex;
  }

  window.MCBedrock = { parseGeometries, buildModel, setBoxUV, pixelate };
})();
