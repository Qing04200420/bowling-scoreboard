// ── State ──
const NUM_GAMES = 3;
let players = [];
let currentGame = 0;       // 0, 1, 2
let currentView = 'game';  // 'game' | 'rankings'
let activeCell = null;      // { pi, frame, roll }

function createPlayer(name) {
  const games = [];
  for (let i = 0; i < NUM_GAMES; i++) games.push({ rolls: new Array(21).fill(null) });
  return { name, games };
}

function getRolls(p, g) { return p.games[g !== undefined ? g : currentGame].rolls; }

function init() {
  players = [createPlayer('PLAYER 1')];
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('zh-TW');
  render();
}

// ── Roll index ──
function rollIndex(frame, roll) {
  return frame <= 9 ? (frame - 1) * 2 + roll : 18 + roll;
}

// ── Score Calculation ──
function calcScores(p, gameIdx) {
  const r = getRolls(p, gameIdx);
  const balls = [];
  for (let f = 0; f < 9; f++) {
    const ri = f * 2;
    balls.push(r[ri]);
    if (r[ri] !== 10) balls.push(r[ri + 1]);
  }
  balls.push(r[18], r[19], r[20]);

  const cumScores = [];
  let bi = 0, total = 0;

  for (let f = 0; f < 10; f++) {
    if (balls[bi] == null) {
      while (cumScores.length < 10) cumScores.push(null);
      break;
    }
    let fs;
    if (f < 9) {
      if (balls[bi] === 10) {
        if (balls[bi+1] == null || balls[bi+2] == null) { while (cumScores.length < 10) cumScores.push(null); break; }
        fs = 10 + balls[bi+1] + balls[bi+2]; bi += 1;
      } else {
        if (balls[bi+1] == null) { while (cumScores.length < 10) cumScores.push(null); break; }
        if (balls[bi] + balls[bi+1] === 10) {
          if (balls[bi+2] == null) { while (cumScores.length < 10) cumScores.push(null); break; }
          fs = 10 + balls[bi+2];
        } else {
          fs = balls[bi] + balls[bi+1];
        }
        bi += 2;
      }
    } else {
      const b0 = balls[bi], b1 = balls[bi+1];
      if (b0 == null || b1 == null) { cumScores.push(null); break; }
      if (b0 === 10 || b0 + b1 === 10) {
        if (balls[bi+2] == null) { cumScores.push(null); break; }
        fs = b0 + b1 + balls[bi+2];
      } else { fs = b0 + b1; }
    }
    total += fs;
    cumScores.push(total);
  }
  return { cumScores };
}

function getGameTotal(p, g) {
  const { cumScores } = calcScores(p, g);
  return cumScores[9];
}

function getGrandTotal(p) {
  let sum = 0;
  for (let g = 0; g < NUM_GAMES; g++) {
    const t = getGameTotal(p, g);
    if (t === null) return null;
    sum += t;
  }
  return sum;
}

// ── Symbol Display ──
function rollSymbol(p, frame, rollInFrame, gameIdx) {
  const r = getRolls(p, gameIdx);
  const ri = rollIndex(frame, rollInFrame);
  const val = r[ri];
  if (val === null) return { text: '', cls: '' };

  if (frame <= 9) {
    if (rollInFrame === 0) {
      if (val === 10) return { text: 'X', cls: 'strike' };
      return val === 0 ? { text: '-', cls: 'gutter' } : { text: String(val), cls: '' };
    }
    const r1 = r[ri - 1];
    if (r1 === 10) return { text: '', cls: '' };
    if (r1 + val === 10) return { text: '/', cls: 'spare' };
    return val === 0 ? { text: '-', cls: 'gutter' } : { text: String(val), cls: '' };
  }

  // Frame 10
  const simple = (v) => v === 10 ? { text: 'X', cls: 'strike' } : v === 0 ? { text: '-', cls: 'gutter' } : { text: String(v), cls: '' };

  if (rollInFrame === 0) return simple(val);
  if (rollInFrame === 1) {
    const f10r1 = r[18];
    if (f10r1 === 10) return simple(val);
    if (f10r1 + val === 10) return { text: '/', cls: 'spare' };
    return val === 0 ? { text: '-', cls: 'gutter' } : { text: String(val), cls: '' };
  }
  // rollInFrame 2
  const f10r1 = r[18], f10r2 = r[19];
  if (f10r1 === 10 && f10r2 !== 10 && f10r2 + val === 10) return { text: '/', cls: 'spare' };
  return simple(val);
}

// ── Game Completion ──
function isGameComplete(p, g) {
  const r = getRolls(p, g);
  for (let f = 0; f < 9; f++) {
    const ri = f * 2;
    if (r[ri] === null) return false;
    if (r[ri] !== 10 && r[ri+1] === null) return false;
  }
  if (r[18] === null || r[19] === null) return false;
  if ((r[18] === 10 || r[18] + r[19] === 10) && r[20] === null) return false;
  return true;
}

function allGamesComplete() {
  return players.length > 0 && players.every(p => [0,1,2].every(g => isGameComplete(p, g)));
}

// ── Rankings (per-game) ──
function getRankings(gameIdx) {
  const totals = players.map((p, i) => ({ idx: i, total: getGameTotal(p, gameIdx) }))
    .filter(x => x.total !== null).sort((a, b) => b.total - a.total);
  const ranks = new Array(players.length).fill(null);
  let rank = 1;
  for (let i = 0; i < totals.length; i++) {
    if (i > 0 && totals[i].total < totals[i-1].total) rank = i + 1;
    ranks[totals[i].idx] = rank;
  }
  return ranks;
}

// ── Navigation ──
function getNextCell(pi, frame, roll) {
  const r = getRolls(players[pi]);
  if (frame <= 9) {
    if (roll === 0) {
      if (r[rollIndex(frame, 0)] === 10) return frame < 10 ? { pi, frame: frame+1, roll: 0 } : null;
      return { pi, frame, roll: 1 };
    }
    return frame < 10 ? { pi, frame: frame+1, roll: 0 } : null;
  }
  if (roll === 0) return { pi, frame: 10, roll: 1 };
  if (roll === 1) {
    if (r[18] === 10 || (r[18] !== null && r[19] !== null && r[18] + r[19] === 10))
      return { pi, frame: 10, roll: 2 };
    return null;
  }
  return null;
}

function getFirstEmpty(pi) {
  const r = getRolls(players[pi]);
  for (let f = 1; f <= 9; f++) {
    const ri = rollIndex(f, 0);
    if (r[ri] === null) return { pi, frame: f, roll: 0 };
    if (r[ri] === 10) continue;
    if (r[ri+1] === null) return { pi, frame: f, roll: 1 };
  }
  if (r[18] === null) return { pi, frame: 10, roll: 0 };
  if (r[19] === null) return { pi, frame: 10, roll: 1 };
  if ((r[18] === 10 || r[18] + r[19] === 10) && r[20] === null) return { pi, frame: 10, roll: 2 };
  return null;
}

function getMaxPins(pi, frame, roll) {
  const r = getRolls(players[pi]);
  if (frame <= 9) return roll === 0 ? 10 : 10 - (r[rollIndex(frame, 0)] || 0);
  if (roll === 0) return 10;
  if (roll === 1) return r[18] === 10 ? 10 : 10 - (r[18] || 0);
  const r1 = r[18], r2 = r[19];
  if (r1 === 10 && r2 === 10) return 10;
  if (r1 === 10) return 10 - r2;
  return 10; // after spare
}

// ── Awards ──
function getBallSequence(rolls) {
  const b = [];
  for (let f = 0; f < 9; f++) {
    b.push(rolls[f*2]);
    if (rolls[f*2] !== 10) b.push(rolls[f*2+1]);
  }
  b.push(rolls[18], rolls[19], rolls[20]);
  return b;
}

const GAME_LABELS = ['第一局', '第二局', '第三局'];

function calcTurkeyAward() {
  let best = null;
  players.forEach((p, pi) => {
    for (let g = 0; g < NUM_GAMES; g++) {
      if (!isGameComplete(p, g)) continue;
      const balls = getBallSequence(getRolls(p, g));
      let streak = 0, gameMax = 0;
      for (const b of balls) {
        if (b === 10) { streak++; if (streak > gameMax) gameMax = streak; }
        else streak = 0;
      }
      if (gameMax >= 3 && (!best || gameMax > best.count)) {
        best = { pi, count: gameMax, game: g };
      }
    }
  });
  return best;
}

function calcGutterAward() {
  let worst = null;
  players.forEach((p, pi) => {
    for (let g = 0; g < NUM_GAMES; g++) {
      const r = getRolls(p, g);
      let count = 0;
      for (let i = 0; i < 21; i++) if (r[i] === 0) count++;
      if (count > 0 && (!worst || count > worst.count)) {
        worst = { pi, count, game: g };
      }
    }
  });
  return worst;
}

function calcLucky7Award() {
  const winners = [];
  players.forEach((p, pi) => {
    for (let g = 0; g < NUM_GAMES; g++) {
      const t = getGameTotal(p, g);
      if (t === null) continue;
      const tens = Math.floor(t / 10) % 10;
      const ones = t % 10;
      if (tens === 7 || ones === 7) winners.push({ pi, total: t, game: g });
    }
  });
  return winners;
}

function calcBBAward() {
  const totals = players.map((p, i) => ({ idx: i, total: getGrandTotal(p) }))
    .filter(x => x.total !== null).sort((a, b) => a.total - b.total);
  if (totals.length < 2) return null;
  const second = totals[totals.length - 2];
  return { pi: second.idx, total: second.total };
}

// ── Render ──
function render() {
  updateTabs();
  if (currentView === 'rankings') {
    document.getElementById('boardWrap').style.display = 'none';
    renderRankings();
    return;
  }
  document.getElementById('boardWrap').style.display = '';
  document.getElementById('rankingsView').classList.remove('show');

  const focused = document.activeElement;
  let focusPi = null, focusCursor = null;
  if (focused && focused.classList.contains('player-name-input')) {
    focusPi = parseInt(focused.dataset.pi);
    focusCursor = focused.selectionStart;
  }

  const tbody = document.getElementById('boardBody');
  const ranks = getRankings(currentGame);
  let html = '';

  const sortedIndices = players.map((_, i) => i).sort((a, b) => {
    const ta = getGameTotal(players[a], currentGame);
    const tb = getGameTotal(players[b], currentGame);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  });

  sortedIndices.forEach(pi => {
    const p = players[pi];
    const { cumScores } = calcScores(p, currentGame);
    const total = cumScores[9];
    const isPerfect = total === 300;

    html += `<tr class="player-row ${isPerfect ? 'perfect' : ''}">`;

    html += `<td class="player-name-cell" style="position:relative">
      <input class="player-name-input" data-pi="${pi}" value="${escHtml(p.name)}"
        onchange="players[${pi}].name=this.value"
        onblur="players[${pi}].name=this.value" placeholder="輸入選手名稱">
      ${players.length > 1 ? `<button class="remove-btn" onclick="event.stopPropagation();removePlayer(${pi})">&times;</button>` : ''}
    </td>`;

    for (let f = 1; f <= 9; f++) {
      const isAct = activeCell && activeCell.pi === pi && activeCell.frame === f;
      html += `<td class="frame-cell ${isAct?'active':''}" onclick="onFrameClick(${pi},${f})"><div class="frame-inner"><div class="roll-boxes">`;
      for (let rv = 0; rv < 2; rv++) { const s = rollSymbol(p, f, rv, currentGame); html += `<div class="roll-box ${s.cls}">${s.text}</div>`; }
      html += `</div><div class="cum-score">${cumScores[f-1]!==null?cumScores[f-1]:''}</div></div></td>`;
    }

    const isAct10 = activeCell && activeCell.pi === pi && activeCell.frame === 10;
    html += `<td class="frame-cell ${isAct10?'active':''}" onclick="onFrameClick(${pi},10)"><div class="frame-inner"><div class="roll-boxes">`;
    for (let rv = 0; rv < 3; rv++) { const s = rollSymbol(p, 10, rv, currentGame); html += `<div class="roll-box ${s.cls}">${s.text}</div>`; }
    html += `</div><div class="cum-score">${cumScores[9]!==null?cumScores[9]:''}</div></div></td>`;

    let totalHtml = total !== null ? total : '';
    if (ranks[pi] && ranks[pi] <= 3) totalHtml += `<br><span class="rank-badge rank-${ranks[pi]}">#${ranks[pi]}</span>`;
    html += `<td class="total-cell">${totalHtml}</td></tr>`;
  });

  tbody.innerHTML = html;

  if (focusPi !== null) {
    const input = tbody.querySelector(`.player-name-input[data-pi="${focusPi}"]`);
    if (input) { input.focus(); if (focusCursor !== null) input.setSelectionRange(focusCursor, focusCursor); }
  }
}

function renderRankings() {
  const rv = document.getElementById('rankingsView');
  document.getElementById('boardWrap').style.display = 'none';
  rv.classList.add('show');

  const standings = players.map((p, i) => {
    const gTotals = [0,1,2].map(g => getGameTotal(p, g));
    return { idx: i, name: p.name, gTotals, grand: getGrandTotal(p) };
  }).sort((a, b) => (b.grand||0) - (a.grand||0));

  let rank = 0, prevTotal = -1;
  standings.forEach((s, i) => {
    if (s.grand !== prevTotal) rank = i + 1;
    s.rank = s.grand !== null ? rank : '-';
    prevTotal = s.grand;
  });

  let html = `<h2 class="rankings-title">最終排名</h2>`;
  html += `<table class="standings-table"><thead><tr>
    <th>名次</th><th>選手</th><th>第一局</th><th>第二局</th><th>第三局</th><th>總分</th>
  </tr></thead><tbody>`;

  standings.forEach(s => {
    const rc = s.rank <= 3 ? ` rank-${s.rank}` : '';
    html += `<tr>
      <td class="rank-cell"><span class="rank-badge${rc}">${s.rank}</span></td>
      <td style="font-weight:bold;text-transform:uppercase">${escHtml(s.name)}</td>
      <td>${s.gTotals[0] !== null ? s.gTotals[0] : '-'}</td>
      <td>${s.gTotals[1] !== null ? s.gTotals[1] : '-'}</td>
      <td>${s.gTotals[2] !== null ? s.gTotals[2] : '-'}</td>
      <td class="grand-total">${s.grand !== null ? s.grand : '-'}</td>
    </tr>`;
  });
  html += '</tbody></table>';

  // 特別獎項
  const done = allGamesComplete();
  html += `<h3 class="awards-title">特別獎項${done ? '' : '（比賽進行中）'}</h3><div class="awards-grid">`;
  //火雞獎
  const turkey = calcTurkeyAward();
  html += `<div class="award-card ${turkey?'won':''}">
    <div class="award-icon">🦃</div><div class="award-name">火雞獎</div>
    ${turkey ? `<div class="award-winner">${escHtml(players[turkey.pi].name)}</div><div class="award-stat">${GAME_LABELS[turkey.game]}．最多連續 ${turkey.count} 次</div>` : `<div class="award-pending">待定</div>`}
  </div>`;
  // 洗溝獎
  const gutter = calcGutterAward();
  html += `<div class="award-card ${gutter?'won':''}">
    <div class="award-icon">🕳️</div><div class="award-name">洗溝獎</div>
    ${gutter ? `<div class="award-winner">${escHtml(players[gutter.pi].name)}</div><div class="award-stat">${GAME_LABELS[gutter.game]}．共 ${gutter.count} 次</div>` : `<div class="award-pending">待定</div>`}
  </div>`;
  // 幸運7獎
  const lucky7 = calcLucky7Award();
  html += `<div class="award-card ${lucky7.length?'won':''}">
    <div class="award-icon">🍀</div><div class="award-name">幸運7獎</div>
    ${lucky7.length ? [...new Set(lucky7.map(w => w.pi))].map(pi => `<div class="award-winner">${escHtml(players[pi].name)}</div>`).join('') : `<div class="award-pending">${done?'無人獲獎':'待定'}</div>`}
  </div>`;
  // BB獎
  const bb = done ? calcBBAward() : null;
  html += `<div class="award-card ${bb?'won':''}">
    <div class="award-icon">👶</div><div class="award-name">BB獎</div>
    ${bb ? `<div class="award-winner">${escHtml(players[bb.pi].name)}</div>` : `<div class="award-pending">${done&&players.length<2?'人數不足':'待定'}</div>`}
  </div>`;
{/* <div class="award-stat">總分 ${bb.total}（倒數第二）</div> */}
  html += '</div>';

  html += `<div class="info-section">
    <div class="info-card">
      <h2>&#8505;&#65039; 特別獎項說明</h2>
      <ul>
        <li>🦃 火雞獎：三局中單局連續 X（全倒）3 次以上，取最高者</li>
        <li>🕳️ 洗溝獎：三局中單局洗溝（0 分）次數最多的選手</li>
        <li>🍀 幸運7獎：三局中單局總分的十位或個位數字含 7</li>
        <li>👶 BB獎：三局總分倒數第二名的選手</li>
      </ul>
    </div>
  </div>`;

  rv.innerHTML = html;
}

function updateTabs() {
  const tabs = document.querySelectorAll('.game-tab');
  for (let g = 0; g < 3; g++) {
    tabs[g].classList.toggle('active', currentView === 'game' && currentGame === g);
    const complete = players.length > 0 && players.every(p => isGameComplete(p, g));
    tabs[g].classList.toggle('complete', complete);
  }
  tabs[3].classList.toggle('active', currentView === 'rankings');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── 匯出 Excel (xlsx) ──
function exportExcel() {
  if (typeof XLSX === 'undefined') {
    alert('匯出套件尚未載入，請檢查網路連線後再試一次');
    return;
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  const title = `保齡球比賽_${dateStr}`;

  const turkey = calcTurkeyAward();
  const gutter = calcGutterAward();
  const lucky7 = calcLucky7Award();
  const done = allGamesComplete();
  const bb = done ? calcBBAward() : null;

  const awardsByPlayer = {};
  const push = (pi, label) => { (awardsByPlayer[pi] = awardsByPlayer[pi] || []).push(label); };
  if (turkey) push(turkey.pi, `🦃火雞獎(${GAME_LABELS[turkey.game]}連${turkey.count}次)`);
  if (gutter) push(gutter.pi, `🕳️洗溝獎(${GAME_LABELS[gutter.game]}${gutter.count}次)`);
  [...new Set(lucky7.map(w => w.pi))].forEach(pi => push(pi, '🍀幸運7獎'));
  if (bb) push(bb.pi, '👶BB獎');

  const standings = players.map((p, i) => ({
    idx: i,
    name: p.name,
    gTotals: [0, 1, 2].map(g => getGameTotal(p, g)),
    grand: getGrandTotal(p),
  })).sort((a, b) => (b.grand || 0) - (a.grand || 0));

  let rank = 0, prev = -1;
  standings.forEach((s, i) => {
    if (s.grand !== prev) rank = i + 1;
    s.rank = s.grand !== null ? rank : '-';
    prev = s.grand;
  });

  const cell = v => (v === null || v === undefined) ? '-' : v;
  const aoa = [
    [title],
    ['名次', '選手', '第一局', '第二局', '第三局', '總分', '獎項'],
  ];
  standings.forEach(s => {
    aoa.push([
      s.rank,
      s.name,
      cell(s.gTotals[0]),
      cell(s.gTotals[1]),
      cell(s.gTotals[2]),
      cell(s.grand),
      (awardsByPlayer[s.idx] || []).join('、'),
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  ws['!cols'] = [
    { wch: 6 }, { wch: 16 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '比賽結果');
  XLSX.writeFile(wb, `${title}.xlsx`);
}

// ── Interaction ──
function switchGame(g) {
  currentGame = g;
  currentView = 'game';
  activeCell = null;
  closePanel();
  render();
}

function showRankingsView() {
  currentView = 'rankings';
  activeCell = null;
  closePanel();
  render();
}

function onFrameClick(pi, frame) {
  const r = getRolls(players[pi]);
  let roll = 0;
  if (frame <= 9) {
    const ri = rollIndex(frame, 0);
    if (r[ri] !== null && r[ri] !== 10 && r[ri+1] === null) roll = 1;
    else if (r[ri] !== null && (r[ri] === 10 || r[ri+1] !== null)) {
      const next = getFirstEmpty(pi);
      if (next) { activeCell = next; showPanel(); render(); return; }
      closePanel(); return;
    }
  } else {
    if (r[18] === null) roll = 0;
    else if (r[19] === null) roll = 1;
    else if ((r[18] === 10 || r[18] + r[19] === 10) && r[20] === null) roll = 2;
    else { closePanel(); return; }
  }
  activeCell = { pi, frame, roll };
  showPanel();
  render();
}

function showPanel() {
  if (!activeCell) return;
  const panel = document.getElementById('pinPanel');
  const info = document.getElementById('pinInfo');
  const btnsDiv = document.getElementById('pinBtns');
  const { pi, frame, roll } = activeCell;
  const p = players[pi];
  const max = getMaxPins(pi, frame, roll);

  const gameLabel = `第${currentGame + 1}局`;
  info.textContent = `${gameLabel} — ${p.name} — 第 ${frame} 格 第 ${roll + 1} 球`;

  let html = '';
  for (let n = 0; n <= 10; n++) {
    const disabled = n > max;
    const isStrike = n === 10 && roll === 0 && frame <= 9;
    const cls = disabled ? 'pin-btn disabled' : (isStrike ? 'pin-btn pin-btn-strike' : 'pin-btn');
    html += `<button class="${cls}" onclick="onPinClick(${n})">${n === 10 && roll === 0 ? 'X' : n}</button>`;
  }
  btnsDiv.innerHTML = html;
  panel.classList.add('show');
}

function closePanel() {
  document.getElementById('pinPanel').classList.remove('show');
  activeCell = null;
}

function onPinClick(n) {
  if (!activeCell) return;
  const { pi, frame, roll } = activeCell;
  getRolls(players[pi])[rollIndex(frame, roll)] = n;

  const next = getNextCell(pi, frame, roll);
  if (next) {
    activeCell = next;
    showPanel();
  } else {
    const nextPi = pi + 1 < players.length ? pi + 1 : null;
    if (nextPi !== null) {
      const np = getFirstEmpty(nextPi);
      if (np) { activeCell = np; showPanel(); }
      else { closePanel(); }
    } else {
      closePanel();
    }
  }
  render();
}

// ── Add / Remove ──
function addPlayer() {
  if (players.length >= 100) return;
  const overlay = document.getElementById('modalOverlay');
  const input = document.getElementById('modalInput');
  input.value = '';
  input.placeholder = `PLAYER ${players.length + 1}`;
  overlay.classList.add('show');
  setTimeout(() => input.focus(), 50);
}

function confirmAddPlayer() {
  const input = document.getElementById('modalInput');
  players.push(createPlayer(input.value.trim() || input.placeholder));
  closeModal();
  render();
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }

document.getElementById('modalInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmAddPlayer();
  if (e.key === 'Escape') closeModal();
});
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

function removePlayer(pi) {
  if (players.length <= 1) return;
  players.splice(pi, 1);
  if (activeCell && activeCell.pi >= players.length) activeCell = null;
  render();
}

function resetAll() {
  if (!confirm('確定要重置所有分數？（三局全部清除）')) return;
  players.forEach(p => p.games.forEach(g => g.rolls.fill(null)));
  currentGame = 0;
  currentView = 'game';
  activeCell = null;
  closePanel();
  render();
}

// ── Keyboard ──
document.addEventListener('keydown', (e) => {
  if (!activeCell) return;
  if (e.key === 'Escape') { closePanel(); render(); return; }
  const n = parseInt(e.key);
  if (!isNaN(n) && n >= 0 && n <= 9) {
    const max = getMaxPins(activeCell.pi, activeCell.frame, activeCell.roll);
    if (n <= max) onPinClick(n);
  }
  if (e.key === 'x' || e.key === 'X') {
    const max = getMaxPins(activeCell.pi, activeCell.frame, activeCell.roll);
    if (10 <= max) onPinClick(10);
  }
});

// ── Init ──
init();
