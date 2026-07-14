(function () {
  const C = window.MCVCommon;
  C.registerSW();

  const RULES = [
    { id: 'keepInventory', name: 'Manter itens ao morrer', desc: 'não perde o inventário quando morre', def: true },
    { id: 'doDaylightCycle', name: 'Passar o dia', desc: 'o sol se move (dia e noite)', def: true },
    { id: 'doWeatherCycle', name: 'Mudar o clima sozinho', desc: 'chuva e sol mudam sozinhos', def: true },
    { id: 'doMobSpawning', name: 'Mobs aparecem sozinhos', desc: 'bichos nascem pelo mundo', def: true },
    { id: 'mobGriefing', name: 'Mobs mudam blocos', desc: 'creeper explode, enderman pega bloco…', def: true },
    { id: 'tntExplodes', name: 'TNT explode', desc: 'se a TNT explode ou não', def: true },
    { id: 'doFireTick', name: 'Fogo se espalha', desc: 'o fogo se alastra pelos blocos', def: true },
    { id: 'pvp', name: 'Jogadores se machucam', desc: 'pode bater em outro jogador', def: true },
    { id: 'fallDamage', name: 'Dano de queda', desc: 'toma dano ao cair de alto', def: true },
    { id: 'naturalRegeneration', name: 'Recuperar vida sozinho', desc: 'a vida enche comendo bem', def: true },
    { id: 'showcoordinates', name: 'Mostrar coordenadas', desc: 'aparece o X Y Z na tela', def: false },
    { id: 'doImmediateRespawn', name: 'Renascer na hora', desc: 'volta sem a tela de morte', def: false }
  ];

  const seg = {}; // time/weather/difficulty/gamemode selecionados

  function build() {
    const box = document.getElementById('rules');
    RULES.forEach(r => {
      const row = document.createElement('div'); row.className = 'rule';
      row.innerHTML = `<div class="lbl"><b>${r.name}</b><span>${r.desc}</span></div>`;
      const sw = document.createElement('div'); sw.className = 'switch' + (r.def ? ' on' : '');
      sw.addEventListener('click', () => { sw.classList.toggle('on'); render(); });
      sw.dataset.id = r.id;
      row.appendChild(sw); box.appendChild(row);
    });
    document.querySelectorAll('.seg').forEach(s => {
      s.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        const already = b.classList.contains('on');
        s.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        if (!already) { b.classList.add('on'); seg[s.dataset.cmd] = b.dataset.v; }
        else delete seg[s.dataset.cmd];
        render();
      }));
    });
  }

  function commands() {
    const lines = [];
    if (seg.gamemode) lines.push(`/gamemode ${seg.gamemode}`);
    if (seg.difficulty) lines.push(`/difficulty ${seg.difficulty}`);
    if (seg.time) lines.push(`/time set ${seg.time}`);
    if (seg.weather) lines.push(`/weather ${seg.weather}`);
    document.querySelectorAll('.switch').forEach(sw => {
      lines.push(`/gamerule ${sw.dataset.id} ${sw.classList.contains('on') ? 'true' : 'false'}`);
    });
    return lines;
  }

  function render() {
    const lines = commands();
    document.getElementById('out').textContent = lines.length ? lines.join('\n') : '—';
  }

  document.getElementById('copy').addEventListener('click', async () => {
    const txt = commands().join('\n');
    try { await navigator.clipboard.writeText(txt); C.toast && C.toast('Copiado!'); document.getElementById('copy').textContent = '✅ Copiado!'; setTimeout(() => document.getElementById('copy').textContent = '📋 Copiar todos', 1500); }
    catch (e) { C.toast && C.toast('Copie manualmente segurando no texto.'); }
  });

  build();
  render();
})();
