(function () {
  const C = window.MCVCommon;
  C.registerSW();

  const audio = new Audio();
  let ctx, analyser, srcNode, raf, freq;
  const viz = document.getElementById('viz');
  const vctx = viz.getContext('2d');

  function setupAudioGraph() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    srcNode = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    srcNode.connect(analyser); analyser.connect(ctx.destination);
    freq = new Uint8Array(analyser.frequencyBinCount);
  }

  function draw() {
    raf = requestAnimationFrame(draw);
    const w = viz.width = viz.clientWidth * devicePixelRatio;
    const h = viz.height = viz.clientHeight * devicePixelRatio;
    vctx.clearRect(0, 0, w, h);
    if (!analyser) return;
    analyser.getByteFrequencyData(freq);
    const n = freq.length, bw = w / n;
    for (let i = 0; i < n; i++) {
      const v = freq[i] / 255;
      const bh = Math.max(2 * devicePixelRatio, v * h);
      const grd = vctx.createLinearGradient(0, h, 0, h - bh);
      grd.addColorStop(0, '#5474f0'); grd.addColorStop(1, '#7ee0c8');
      vctx.fillStyle = grd;
      vctx.fillRect(i * bw + bw * 0.15, h - bh, bw * 0.7, bh);
    }
  }

  const fmt = (s) => { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const playIc = document.getElementById('play-ic');
  const setIcon = (playing) => { playIc.innerHTML = playing ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : '<path d="M8 5v14l11-7z"/>'; };

  function loadFile(file) {
    if (!(file.type.startsWith('audio/') || /\.(ogg|mp3|wav|m4a|aac|flac)$/i.test(file.name))) { C.toast('Carregue um arquivo de áudio.'); return; }
    audio.src = URL.createObjectURL(file);
    document.getElementById('sname').textContent = '🎵 ' + file.name;
    document.getElementById('player').style.display = 'block';
    if (!raf) draw();
  }

  document.getElementById('play').addEventListener('click', async () => {
    setupAudioGraph();
    if (ctx.state === 'suspended') await ctx.resume();
    if (audio.paused) { try { await audio.play(); } catch (e) { C.toast('Não consegui tocar esse arquivo.'); } }
    else audio.pause();
  });
  audio.addEventListener('play', () => setIcon(true));
  audio.addEventListener('pause', () => setIcon(false));
  audio.addEventListener('timeupdate', () => {
    document.getElementById('seek').value = (audio.currentTime / (audio.duration || 1)) * 100 || 0;
    document.getElementById('time').textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
  });
  document.getElementById('seek').addEventListener('input', (e) => { if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration; });

  C.wireInput((files) => loadFile(files[0]));
})();
