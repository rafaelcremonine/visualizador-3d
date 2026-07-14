(function () {
  const C = window.MCVCommon;
  C.registerSW();

  // Dicionário de comandos comuns do Bedrock
  const CMDS = {
    give:      { desc: 'Dá um item pra alguém.', min: 2, args: ['jogador (quem recebe)', 'item', 'quantidade', 'dado/variação'] },
    tp:        { desc: 'Teletransporta (leva) alguém pra outro lugar.', min: 1, args: ['quem vai', 'destino (jogador ou x y z)'] },
    teleport:  { desc: 'Teletransporta (leva) alguém pra outro lugar.', min: 1, args: ['quem vai', 'destino (jogador ou x y z)'] },
    summon:    { desc: 'Faz aparecer um mob/entidade.', min: 1, args: ['entidade (o bicho)', 'x y z (onde aparece)'] },
    setblock:  { desc: 'Coloca um bloco num lugar exato.', min: 4, args: ['x', 'y', 'z', 'bloco', 'modo'] },
    fill:      { desc: 'Preenche uma área inteira com um bloco.', min: 7, args: ['x1', 'y1', 'z1', 'x2', 'y2', 'z2', 'bloco', 'modo'] },
    gamemode:  { desc: 'Muda o modo de jogo (sobrevivência, criativo…).', min: 1, args: ['modo (survival/creative/adventure)', 'jogador'] },
    gamerule:  { desc: 'Muda uma regra do mundo.', min: 1, args: ['regra', 'valor (true/false ou número)'] },
    time:      { desc: 'Muda a hora do dia.', min: 2, args: ['set ou add', 'valor (day/night ou número)'] },
    weather:   { desc: 'Muda o clima.', min: 1, args: ['clear/rain/thunder', 'duração (segundos)'] },
    effect:    { desc: 'Dá um efeito (poção) pra alguém.', min: 2, args: ['jogador', 'efeito', 'segundos', 'força', 'esconder partículas'] },
    difficulty:{ desc: 'Muda a dificuldade do jogo.', min: 1, args: ['peaceful/easy/normal/hard'] },
    kill:      { desc: 'Elimina uma entidade (ou você).', min: 0, args: ['alvo'] },
    clear:     { desc: 'Limpa o inventário (ou um item).', min: 0, args: ['jogador', 'item', 'dado', 'quantidade'] },
    xp:        { desc: 'Dá pontos de experiência.', min: 1, args: ['quantidade (use L pra níveis)', 'jogador'] },
    say:       { desc: 'Manda uma mensagem no chat.', min: 1, args: ['mensagem'] },
    tell:      { desc: 'Manda mensagem privada pra alguém.', min: 2, args: ['jogador', 'mensagem'] },
    playsound: { desc: 'Toca um som.', min: 1, args: ['som', 'jogador', 'x y z', 'volume', 'tom'] },
    title:     { desc: 'Mostra um texto grande na tela.', min: 2, args: ['jogador', 'title/subtitle/actionbar', 'texto'] },
    enchant:   { desc: 'Encanta um item.', min: 2, args: ['jogador', 'encantamento', 'nível'] },
    particle:  { desc: 'Cria partículas (efeitos visuais).', min: 1, args: ['partícula', 'x y z'] },
    fog:       { desc: 'Muda a névoa (fog) do jogador.', min: 3, args: ['alvo', 'push/pop', 'id da névoa'] },
    ride:      { desc: 'Faz uma entidade montar em outra.', min: 2, args: ['quem monta', 'ação'] },
    fill_:     {}
  };
  const SELECTORS = { '@a': 'todos os jogadores', '@p': 'jogador mais perto', '@e': 'todas as entidades', '@r': 'jogador aleatório', '@s': 'você mesmo (quem executa)' };

  // separa em tokens respeitando aspas
  function tokenize(s) {
    const out = []; let cur = '', q = false;
    for (const ch of s) {
      if (ch === '"') { q = !q; cur += ch; }
      else if (ch === ' ' && !q) { if (cur) out.push(cur); cur = ''; }
      else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }

  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function analyze(raw) {
    const result = document.getElementById('result');
    const text = raw.trim();
    if (!text) { result.style.display = 'none'; return; }
    result.style.display = 'block';

    let s = text.replace(/^\//, '');
    const tokens = tokenize(s);
    const cmd = (tokens[0] || '').toLowerCase();
    const info = CMDS[cmd];

    // tokens coloridos
    const tokEl = document.getElementById('tokens');
    tokEl.innerHTML = tokens.map((t, i) => {
      const cls = i === 0 ? 'tk-cmd' : (SELECTORS[t] ? 'tk-sel' : 'tk-arg');
      return `<span class="token ${cls}">${esc(t)}</span>`;
    }).join('');

    // explicação
    const ex = document.getElementById('explain');
    let lines = '';
    if (info) lines += `<div class="line"><b>/${esc(cmd)}</b><span>${info.desc}</span></div>`;
    else lines += `<div class="line"><b>/${esc(cmd || '?')}</b><span class="warn">não conheço esse comando — confira se o nome está certo.</span></div>`;
    for (let i = 1; i < tokens.length; i++) {
      const t = tokens[i];
      let label = SELECTORS[t] ? ('seletor: ' + SELECTORS[t]) : (info && info.args[i - 1] ? info.args[i - 1] : 'argumento');
      lines += `<div class="line"><b>${esc(t)}</b><span>${label}</span></div>`;
    }
    ex.innerHTML = lines;

    // verificações
    const checks = [];
    const quotes = (s.match(/"/g) || []).length;
    if (quotes % 2 !== 0) checks.push(['err', 'Tem aspas " sobrando (abriu e não fechou).']);
    const pairs = [['[', ']'], ['{', '}'], ['(', ')']];
    for (const [a, b] of pairs) {
      const ca = (s.split(a).length - 1), cb = (s.split(b).length - 1);
      if (ca !== cb) checks.push(['warn', `Os símbolos ${a} ${b} estão desbalanceados (${ca} de "${a}" e ${cb} de "${b}").`]);
    }
    if (info && (tokens.length - 1) < info.min) checks.push(['warn', `Parece faltar informação. O /${cmd} costuma precisar de pelo menos ${info.min} parte(s) depois do nome.`]);
    if (info && cmd === 'gamemode' && tokens[1] && !/^(0|1|2|3|s|c|a|sp|survival|creative|adventure|spectator)$/i.test(tokens[1])) checks.push(['warn', `"${tokens[1]}" não parece um modo válido (use survival, creative ou adventure).`]);
    if (info && cmd === 'difficulty' && tokens[1] && !/^(0|1|2|3|p|e|n|h|peaceful|easy|normal|hard)$/i.test(tokens[1])) checks.push(['warn', `"${tokens[1]}" não parece uma dificuldade válida.`]);
    if (!text.startsWith('/')) checks.push(['ok', 'Dica: no bate-papo do jogo os comandos começam com / (mas em blocos de comando não precisa).']);
    if (info && checks.filter(c => c[0] !== 'ok').length === 0) checks.push(['ok', 'Tudo certo! Esse comando parece válido. ✅']);

    document.getElementById('checks').innerHTML = checks.map(([k, m]) =>
      `<div class="line"><b class="${k}">${k === 'ok' ? '✓' : k === 'warn' ? '!' : '✕'}</b><span class="${k}">${esc(m)}</span></div>`).join('');
  }

  const ta = document.getElementById('cmd');
  ta.addEventListener('input', () => analyze(ta.value));
  document.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { ta.value = b.dataset.ex; analyze(ta.value); }));
})();
