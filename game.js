// ==========================================
// ABYSS CORE - GAME LOGIC (ROBUST VERSION)
// ==========================================

/* -----------------------------------------------------
   1. GLOBAL VARIABLES
   ----------------------------------------------------- */
let canvas, ctx;
let uiLayer, body; 

// Game State
let totalScrap = 0;
let maxUnlockedLevel = 1;
let currentShopTab = 'stat';
let appState = 'title';
let currentLevel = 1;
let score = 0;
let frameCount = 0;
let comboTimer = 0;
let currentHits = 0;
let collectedScrapInRun = 0;
let gameSpeed = 1.0;
let selectedLevelForConfirm = 1;

// Level Progress
let totalDistance = 3000;
let currentDistance = 0;
let bossSpawned = false;
let bossObj = null;

// Entities
let player = null; 
let playerBullets = [];
let enemyBullets = [];
let enemies = [];
let explosions = [];
let scraps = [];
let powerItems = [];
let grazeSparks = [];

// Input System
const keys = {};
let isTouching = false;
let isMouseDown = false;
let lastTouchX = 0, lastTouchY = 0;

// Default Stats
let playerStats = {
    maxHp: 3, baseDamage: 1.0, chargeSpeed: 1.0, maxLocks: 2, lockRange: 1.0, minionPower: 1.0, maxBombs: 2
};

// Default Unlocks
let playerUnlocks = {
    autoScavenger: false, adrenalineBurst: false, deadManSwitch: false, homingShot: false, penetratingShot: false, diffusionShot: false,
    vampireDrive: false, guillotineField: false, midasCurse: false, berserkTrigger: false
};

const SAVE_KEY = 'abyss_core_save_v5';

// Upgrade Data
const upgradeData = {
    // STATS
    maxHp: { name: "BODY MASS (最大HP)", type: "stat", baseCost: 50, scale: 1.5, getLevel: () => playerStats.maxHp - 2, getCost: () => Math.floor(50 * Math.pow(1.5, playerStats.maxHp - 3)) },
    baseDamage: { name: "WEAPON OUTPUT (基礎火力)", type: "stat", baseCost: 100, scale: 1.8, getLevel: () => Math.floor(playerStats.baseDamage * 10) - 9, getCost: () => Math.floor(100 * Math.pow(1.8, (playerStats.baseDamage - 1.0) * 5)) },
    chargeSpeed: { name: "CORE SYNC (チャージ速度)", type: "stat", baseCost: 150, scale: 2.0, getLevel: () => Math.floor(playerStats.chargeSpeed * 10) - 9, getCost: () => Math.floor(150 * Math.pow(2.0, (playerStats.chargeSpeed - 1.0) * 5)) },
    maxLocks: { name: "MULTIPLE EYES (ロック数)", type: "stat", baseCost: 200, scale: 2.5, getLevel: () => playerStats.maxLocks - 1, getCost: () => Math.floor(200 * Math.pow(2.5, playerStats.maxLocks - 2)) },
    lockRange: { name: "SENSORY EXPANSION (ロック範囲)", type: "stat", baseCost: 150, scale: 2.0, getLevel: () => Math.floor(playerStats.lockRange * 10) - 9, getCost: () => Math.floor(150 * Math.pow(2.0, (playerStats.lockRange - 1.0) * 5)) },
    minionPower: { name: "MINION LINK (使役出力)", type: "stat", condition: () => playerUnlocks.autoScavenger, baseCost: 300, scale: 2.0, getLevel: () => Math.floor((playerStats.minionPower - 1.0) * 2) + 1, getCost: () => Math.floor(300 * Math.pow(2.0, (playerStats.minionPower - 1.0) * 2)) },
    maxBombs: { name: "MENTAL STOCK (ボム数)", type: "stat", baseCost: 500, scale: 2.0, getLevel: () => playerStats.maxBombs - 1, getCost: () => Math.floor(500 * Math.pow(2.0, playerStats.maxBombs - 2)) },
    
    // UNLOCKS
    homingShot: { name: "SEEKER ROUNDS (追尾弾)", type: "unlock", cost: 2000, desc: "通常弾が自動で敵を追尾する" },
    penetratingShot: { name: "PENETRATOR (貫通弾)", type: "unlock", cost: 2500, desc: "弾が敵を貫通し、複数を串刺しにする" },
    diffusionShot: { name: "DIFFUSION BURST (拡散弾)", type: "unlock", cost: 2500, desc: "自機から360度全方位に弾を発射する" },
    autoScavenger: { name: "AUTO-SCAVENGER (自動捕食)", type: "unlock", cost: 500, desc: "倒した敵を再起動し、左右に従える" },
    adrenalineBurst: { name: "ADRENALINE (脳内麻薬)", type: "unlock", cost: 1000, desc: "敵弾接近時、世界を0.5倍速にする" },
    deadManSwitch: { name: "DEAD MAN'S SWITCH (遺言爆弾)", type: "unlock", cost: 1500, desc: "被弾時、自動でボムを使用して死を拒絶する" },
    
    // MODULES
    vampireDrive: { name: "VAMPIRE DRIVE (吸血回路)", type: "module", cost: 3000, desc: "攻撃力2倍 / HP半減＆被ダメ2倍" },
    guillotineField: { name: "GUILLOTINE FIELD (断頭領域)", type: "module", cost: 4000, desc: "敵弾を無効化するシールドを展開" },
    midasCurse: { name: "MIDAS CURSE (黄金の呪い)", type: "module", cost: 5000, desc: "死んだ時、全財産の半分を捧げて1回だけ蘇生" },
    berserkTrigger: { name: "BERSERK TRIGGER (発狂スイッチ)", type: "module", cost: 2000, desc: "好きな時に発狂モードを発動できるボタンを追加" }
};

/* -----------------------------------------------------
   3. FUNCTIONS (Globally Defined)
   ----------------------------------------------------- */

function getCanvasRelativeCoords(e) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function syncTouchPosition(e) {
    if ((e.touches && e.touches.length > 0) || e.type.startsWith('mouse')) {
        const coords = getCanvasRelativeCoords(e);
        lastTouchX = coords.x;
        lastTouchY = coords.y;
    }
}

function saveGameData() {
    const data = { totalScrap, maxUnlockedLevel, playerStats, playerUnlocks };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { console.error(e); }
}

function loadGameData() {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            if(data.totalScrap !== undefined) totalScrap = data.totalScrap;
            if(data.maxUnlockedLevel !== undefined) maxUnlockedLevel = data.maxUnlockedLevel;
            if(data.playerStats) playerStats = { ...playerStats, ...data.playerStats };
            if(data.playerUnlocks) playerUnlocks = { ...playerUnlocks, ...data.playerUnlocks };
        }
    } catch (e) { console.error(e); }
}

function resetSaveData() {
    if (confirm("全ての記録を消去し、肉体を初期化しますか？")) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    if (!container || !canvas) return;
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    if(player && player.y > canvas.height) player.y = canvas.height - 100;
}

function switchShopTab(tab) {
    currentShopTab = tab;
    const tabStat = document.getElementById('tab-stat');
    const tabUnlock = document.getElementById('tab-unlock');
    const tabModule = document.getElementById('tab-module');
    
    if(tabStat) tabStat.classList.toggle('active', tab === 'stat');
    if(tabUnlock) tabUnlock.classList.toggle('active', tab === 'unlock');
    if(tabModule) tabModule.classList.toggle('active', tab === 'module');
    
    renderShop();
}

function hideAllScreens() {
    document.querySelectorAll('.overlay-screen').forEach(el => el.classList.add('hidden'));
    if(uiLayer) uiLayer.style.display = 'none';
    if(body) {
        body.classList.remove('berserk-active'); 
        body.classList.remove('bomb-active'); 
        body.classList.remove('slow-active');
    }
}

function openTitle() {
    appState = 'title';
    hideAllScreens();
    loadGameData(); 
    const titleScreen = document.getElementById('title-screen');
    if(titleScreen) titleScreen.classList.remove('hidden');
    const titleScrap = document.getElementById('title-scrap');
    if(titleScrap) titleScrap.innerText = `SCRAP: ${Math.floor(totalScrap)}`;
    renderStageGrid();
}

function openShop() {
    appState = 'shop';
    hideAllScreens();
    const shopScreen = document.getElementById('shop-screen');
    if(shopScreen) shopScreen.classList.remove('hidden');
    renderShop();
}

function showStageConfirm(level) {
    if (level > maxUnlockedLevel) return;
    selectedLevelForConfirm = level;
    const confirmScreen = document.getElementById('stage-confirm-screen');
    if(confirmScreen) confirmScreen.classList.remove('hidden');
    const confirmLevel = document.getElementById('confirm-level');
    if(confirmLevel) confirmLevel.innerText = `LEVEL ${level}`;
    
    let baseSpawnRate = 90 / Math.pow(1.5, level - 1);
    let estEnemies = Math.floor(1500 / Math.max(10, baseSpawnRate)); 
    const confirmEnemy = document.getElementById('confirm-enemy-count');
    if(confirmEnemy) confirmEnemy.innerText = `ENEMY SIGNAL: ${estEnemies} DETECTED`;
}

function closeConfirm() { 
    const el = document.getElementById('stage-confirm-screen');
    if(el) el.classList.add('hidden'); 
}
function startConfirmedGame() { closeConfirm(); startGame(selectedLevelForConfirm); }
function openTitleFromPause() { 
    appState = 'title'; 
    hideAllScreens(); 
    const titleScreen = document.getElementById('title-screen');
    if(titleScreen) titleScreen.classList.remove('hidden');
    totalScrap += collectedScrapInRun; 
    saveGameData();
    const titleScrap = document.getElementById('title-scrap');
    if(titleScrap) titleScrap.innerText = `SCRAP: ${Math.floor(totalScrap)}`;
    renderStageGrid(); 
}

function togglePause() {
    if (appState === 'playing') {
        appState = 'paused';
        const pauseScreen = document.getElementById('pause-screen');
        if(pauseScreen) pauseScreen.classList.remove('hidden');
    } else if (appState === 'paused') {
        appState = 'playing';
        const pauseScreen = document.getElementById('pause-screen');
        if(pauseScreen) pauseScreen.classList.add('hidden');
    }
}

function startGame(level) {
    currentLevel = level;
    appState = 'playing';
    hideAllScreens();
    if(uiLayer) uiLayer.style.display = 'block';
    
    // Player Re-initialization
    if (!player) player = new Player();
    player.hp = playerStats.maxHp;
    
    if(canvas) {
        player.x = canvas.width / 2;
        player.y = canvas.height - 100;
    }
    
    player.chargeAmount = 0; player.isCharging = false; player.lockedTargets.clear();
    player.invincibleTimer = 60; 
    player.lockOnRadius = (120 + (playerStats.maxLocks * 5)) * playerStats.lockRange;
    player.erosion = 0; player.isBerserk = false; player.berserkTimer = 0;
    player.bombs = playerStats.maxBombs;
    player.isBombing = false;
    player.minions = [];
    player.powerLevel = 0; 
    player.shieldHp = player.shieldMax; 
    player.usedMidas = false;
    
    playerBullets = []; enemyBullets = []; enemies = []; explosions = []; scraps = []; powerItems = []; grazeSparks = [];
    score = 0; currentHits = 0; comboTimer = 0; collectedScrapInRun = 0;
    totalDistance = 2000 + (level * 1000); 
    currentDistance = 0;
    bossSpawned = false; bossObj = null;
    
    const berserkBtn = document.getElementById('berserk-btn');
    if (berserkBtn) {
        if (playerUnlocks.berserkTrigger) {
            berserkBtn.style.display = 'flex';
        } else {
            berserkBtn.style.display = 'none';
        }
    }

    updatePlayingUI();
}

function renderStageGrid() {
    const grid = document.getElementById('stage-grid');
    if (!grid) return;
    grid.innerHTML = '';
    let displayMax = Math.max(10, Math.ceil(maxUnlockedLevel / 5) * 5);
    for(let i=1; i<=displayMax; i++) {
        let btn = document.createElement('div');
        btn.className = 'stage-btn' + (i > maxUnlockedLevel ? ' locked' : '');
        btn.innerText = i;
        if(i <= maxUnlockedLevel) {
            btn.onclick = function() { showStageConfirm(i); };
        }
        grid.appendChild(btn);
    }
}

function renderShop() {
    const shopScrap = document.getElementById('shop-scrap');
    if(shopScrap) shopScrap.innerText = `SCRAP: ${Math.floor(totalScrap)}`;
    const list = document.getElementById('shop-items');
    if (!list) return;
    list.innerHTML = '';
    
    for (const key in upgradeData) {
        let item = upgradeData[key];
        if (item.type !== currentShopTab) continue;
        if (item.condition && !item.condition()) continue;

        let isUnlocked = false;
        let cost = 0;
        let levelText = "";
        let buttonText = "ASSIMILATE";
        let buttonDisabled = false;

        if (item.type === 'stat') {
            cost = item.getCost();
            levelText = `[Lv.${item.getLevel()}]`;
        } else if (item.type === 'unlock' || item.type === 'module') {
            cost = item.cost;
            isUnlocked = playerUnlocks[key];
            levelText = isUnlocked ? "[ACTIVE]" : "[LOCKED]";
            if (isUnlocked) {
                buttonText = "ACQUIRED";
                buttonDisabled = true;
            }
        }
        
        let div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div class="shop-info">
                <div class="shop-name">${item.name} <span style="color:#0ff;">${levelText}</span></div>
                ${item.desc ? `<div class="shop-desc">${item.desc}</div>` : ''}
                <div class="shop-cost">${isUnlocked ? '---' : `REQ: ${cost} SCRAP`}</div>
            </div>
        `;
        let btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.width = 'auto';
        btn.style.margin = '0';
        btn.innerText = buttonText;
        if ((totalScrap < cost && !buttonDisabled) || buttonDisabled) btn.disabled = true;
        
        btn.onclick = function() { buyUpgrade(key); };
        div.appendChild(btn);
        list.appendChild(div);
    }
}

function buyUpgrade(key) {
    let item = upgradeData[key];
    let cost = 0;
    
    if (item.type === 'stat') {
        cost = item.getCost();
        if (totalScrap >= cost) {
            totalScrap -= cost;
            if(key === 'maxHp' || key === 'maxLocks' || key === 'maxBombs') playerStats[key] += 1;
            else if (key === 'lockRange') playerStats[key] += 0.1;
            else if (key === 'minionPower') playerStats[key] += 0.5; 
            else playerStats[key] += 0.2; 
            saveGameData(); 
            renderShop();
        }
    } else if (item.type === 'unlock' || item.type === 'module') {
        cost = item.cost;
        if (totalScrap >= cost && !playerUnlocks[key]) {
            totalScrap -= cost;
            playerUnlocks[key] = true;
            saveGameData(); 
            renderShop();
        }
    }
}

function triggerStageClear() {
    appState = 'clear';
    if (currentLevel === maxUnlockedLevel) maxUnlockedLevel++;
    let scoreBonus = Math.floor(score * 0.01);
    totalScrap += scoreBonus;
    collectedScrapInRun += scoreBonus;
    saveGameData(); 
    hideAllScreens();
    const clearScreen = document.getElementById('clear-screen');
    if(clearScreen) clearScreen.classList.remove('hidden');
    const clearStats = document.getElementById('clear-stats');
    if(clearStats) clearStats.innerText = `LEVEL ${currentLevel} CLEARED / SCORE: ${score}`;
    const clearScrap = document.getElementById('clear-scrap');
    if(clearScrap) clearScrap.innerText = `OBTAINED SCRAP: +${Math.floor(collectedScrapInRun)} (incl. Score Bonus: ${scoreBonus})`;
}

function triggerGameOver() {
    appState = 'gameover';
    
    if (playerUnlocks.midasCurse && !player.usedMidas) {
        if (totalScrap >= 100) { 
             if(confirm("黄金の呪いが発動しますか？ (所持金の半分を消費して復活)")) {
                 totalScrap = Math.floor(totalScrap / 2);
                 player.hp = player.maxHp;
                 player.invincibleTimer = 120;
                 player.usedMidas = true;
                 appState = 'playing';
                 hideAllScreens();
                 if(uiLayer) uiLayer.style.display = 'block';
                 if (playerUnlocks.berserkTrigger) {
                     let btn = document.getElementById('berserk-btn');
                     if(btn) btn.style.display = 'flex';
                 }
                 return;
             }
        }
    }

    totalScrap += collectedScrapInRun;
    saveGameData(); 
    hideAllScreens();
    const goScreen = document.getElementById('gameover-screen');
    if(goScreen) goScreen.classList.remove('hidden');
    const goScrap = document.getElementById('gameover-scrap');
    if(goScrap) goScrap.innerText = `OBTAINED SCRAP: +${Math.floor(collectedScrapInRun)}`;
}

function updatePlayingUI() {
    let hpEl = document.getElementById('hpDisplay');
    if(hpEl) {
        let currentHp = player ? Math.max(0, player.hp) : 0;
        let maxHp = player ? player.maxHp : 3;
        hpEl.innerText = `HP: ${'♥'.repeat(currentHp)}${'♡'.repeat(Math.max(0, maxHp - currentHp))}`;
        
        if (currentHp <= 1 && currentHp > 0) hpEl.style.color = (frameCount % 10 < 5) ? "#f00" : "#800";
        else hpEl.style.color = currentHp <= 0 ? "#300" : "#f05";
    }
    
    let scoreEl = document.getElementById('scoreDisplay');
    if(scoreEl) scoreEl.innerText = `SCORE: ${score}`;
    let scrapEl = document.getElementById('playScrapDisplay');
    if(scrapEl) scrapEl.innerText = `SCRAP: ${Math.floor(collectedScrapInRun)}`;
    
    let bombEl = document.getElementById('bombDisplay');
    if(bombEl) {
        let bombCount = player ? player.bombs : 0;
        bombEl.innerText = `BOMB: ${'💣'.repeat(bombCount)}`;
    }
    
    let powEl = document.getElementById('powerDisplay');
    if(powEl) {
        let pLvl = player ? player.powerLevel : 0;
        powEl.innerText = `POWER: Lv.${pLvl}`;
        powEl.style.color = pLvl === 2 ? "#d0f" : (pLvl === 1 ? "#f0f" : "#888");
    }
    
    let mentalBar = document.getElementById('mentalGaugeBar');
    if(mentalBar) {
        let erosion = player ? player.erosion : 0;
        let isBerserk = player ? player.isBerserk : false;
        mentalBar.style.width = `${erosion}%`;
        if (isBerserk) mentalBar.style.backgroundColor = (frameCount % 4 < 2) ? "#f00" : "#fff"; 
        else mentalBar.style.backgroundColor = "#d0f";
    }

    let slowDisp = document.getElementById('slowDisplay');
    if(slowDisp) {
        if (gameSpeed < 1.0) {
            slowDisp.style.display = 'block';
            if(body) body.classList.add('slow-active');
        } else {
            slowDisp.style.display = 'none';
            if(body) body.classList.remove('slow-active');
        }
    }
}

function checkCollision(obj1, obj2, margin = 0) {
    if(!obj1 || !obj2) return false;
    let dx = obj1.x - obj2.x; let dy = obj1.y - obj2.y;
    return Math.sqrt(dx*dx + dy*dy) < (obj1.radius + obj2.radius + margin);
}

function checkDistance(obj1, obj2) {
    if(!obj1 || !obj2) return 99999;
    let dx = obj1.x - obj2.x; let dy = obj1.y - obj2.y;
    return Math.sqrt(dx*dx + dy*dy);
}

function addHitScore() {
    currentHits++; comboTimer = 60;
    let bonus = Math.min(currentHits, 10);
    score += 100 * bonus;
    let hd = document.getElementById('hitDisplay');
    if (hd) {
        hd.innerText = `HITS: ${currentHits} (x${bonus})`;
        hd.style.color = currentHits > 5 ? "#ff0" : "#f0f";
    }
}

// --- 4. Game Loop ---

function gameLoop() {
    if (appState === 'paused') { drawGame(ctx); requestAnimationFrame(gameLoop); return; }
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frameCount++;

    ctx.fillStyle = (player && player.isBerserk) ? "rgba(50, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.5)"; 
    let speedScroll = appState === 'playing' ? ((player && player.isBerserk) ? 2.0 : 0.5) : 0.1;
    for(let i=0; i<5; i++) {
        let starY = (frameCount * (i+1) * speedScroll) % canvas.height;
        ctx.fillRect((i * 100 + frameCount * (appState==='playing'?1:0.2)) % canvas.width, starY, 2, 2);
    }

    if (appState === 'playing') { updateGame(); drawGame(ctx); updatePlayingUI(); } 
    else if (appState === 'clear' || appState === 'gameover') { drawGame(ctx); }
    requestAnimationFrame(gameLoop);
}

function updateGame() {
    if (!player) return;
    gameSpeed = 1.0;
    if (playerUnlocks.adrenalineBurst) {
        let nearby = false;
        for (let eb of enemyBullets) { if (checkDistance(player, eb) < player.grazeRadius + 10) { nearby = true; break; } }
        if (nearby) gameSpeed = 0.5;
    }
    if (!bossSpawned) {
        currentDistance += (player.isBerserk ? 4 : 2) * gameSpeed;
        let baseSpawnRate = 90 / Math.pow(1.5, currentLevel - 1);
        baseSpawnRate = Math.max(10, baseSpawnRate); 
        if (player.isBerserk) baseSpawnRate = Math.max(5, baseSpawnRate / 2); 
        let finalSpawnRate = Math.floor(baseSpawnRate / gameSpeed);
        if (finalSpawnRate < 1) finalSpawnRate = 1;
        if (frameCount % finalSpawnRate === 0) {
            let rand = Math.random(); let type = 'normal';
            if (rand < 0.35) type = 'normal'; else if (rand < 0.55) type = 'rusher'; else if (rand < 0.75) type = 'sprinkler'; else if (rand < 0.95) type = 'sniper'; else type = 'carrier'; 
            let spawnX, spawnY;
            if (Math.random() < 0.8) { spawnX = Math.random() * (canvas.width - 40) + 20; spawnY = -20; } 
            else { spawnX = Math.random() < 0.5 ? -20 : canvas.width + 20; spawnY = Math.random() * (canvas.height * 0.5); }
            if (spawnY > 0 && type !== 'rusher' && type !== 'sprinkler') { type = Math.random() < 0.5 ? 'rusher' : 'sprinkler'; }
            enemies.push(new Enemy(spawnX, spawnY, type, currentLevel));
        }
        if (frameCount % (finalSpawnRate * 8) === 0) enemies.push(new Enemy(canvas.width / 2, -30, 'big', currentLevel));
        if (currentDistance >= totalDistance) { bossSpawned = true; bossObj = new Enemy(canvas.width / 2, -100, 'boss', currentLevel); enemies.push(bossObj); }
    }
    if (comboTimer > 0) comboTimer--; else { currentHits = 0; }
    player.update();
    playerBullets.forEach(pb => pb.update());
    enemyBullets.forEach(eb => eb.update());
    enemies.forEach(e => e.update());
    explosions.forEach(exp => exp.update());
    scraps.forEach(s => s.update());
    powerItems.forEach(pi => pi.update());
    grazeSparks.forEach(gs => gs.update());
    
    // Player Bullets Collision
    playerBullets.forEach(pb => {
        enemies.forEach(enemy => {
            if (!pb.markedForDeletion && !enemy.markedForDeletion && checkCollision(pb, enemy)) {
                if (pb.isPenetrating && pb.hitList.includes(enemy)) return;
                if (!pb.isPenetrating) pb.markedForDeletion = true; else pb.hitList.push(enemy);
                let dmg = pb.damage;
                if (enemy.type === 'boss') { let dist = Math.sqrt((player.x - enemy.x)**2 + (player.y - enemy.y)**2); if (dist < 60) dmg *= 0.1; }
                enemy.hp -= dmg;
                if (enemy.hp <= 0) {
                    enemy.markedForDeletion = true; enemy.dropScrap();
                    // ★ FIX: e.x -> enemy.x
                    if (playerUnlocks.autoScavenger && player.minions.length < 2 && enemy.type !== 'boss' && enemy.type !== 'carrier') player.minions.push(new Minion(enemy.x, enemy.y));
                    if (currentLevel >= 5 && Math.random() < 0.3 && enemy.type !== 'boss' && enemy.type !== 'carrier') { let angle = Math.atan2(player.y - enemy.y, player.x - enemy.x); enemyBullets.push(new EnemyBullet(enemy.x, enemy.y, Math.cos(angle)*3, Math.sin(angle)*3)); }
                    if (enemy.type === 'boss') { for(let i=0; i<10; i++) explosions.push(new Explosion(enemy.x + (Math.random()-0.5)*80, enemy.y + (Math.random()-0.5)*80, true)); score += 50000; setTimeout(triggerStageClear, 3000); } 
                    else { explosions.push(new Explosion(enemy.x, enemy.y, pb.isCharge)); }
                    addHitScore();
                }
            }
        });
    });
    
    explosions.forEach(exp => {
        if (exp.maxRadius > 30) {
            enemies.forEach(enemy => {
                if (!enemy.markedForDeletion && checkCollision(exp, enemy)) {
                    enemy.hp -= 0.5 * playerStats.baseDamage;
                    if (enemy.hp <= 0) {
                        enemy.markedForDeletion = true; enemy.dropScrap();
                        if (playerUnlocks.autoScavenger && player.minions.length < 2 && enemy.type !== 'boss' && enemy.type !== 'carrier') player.minions.push(new Minion(enemy.x, enemy.y));
                        if (enemy.type === 'boss') { for(let i=0; i<10; i++) explosions.push(new Explosion(enemy.x + (Math.random()-0.5)*80, enemy.y + (Math.random()-0.5)*80, true)); score += 50000; setTimeout(triggerStageClear, 3000); } 
                        else { explosions.push(new Explosion(enemy.x, enemy.y, true)); }
                        addHitScore();
                    }
                }
            });
        }
    });

    // Enemy Bullets Collision (Robust Check)
    enemyBullets.forEach(eb => {
        if (!eb.markedForDeletion) {
            let dist = checkDistance(eb, player);
            if (dist < player.grazeRadius + eb.radius && dist > player.radius + eb.radius && eb.grazedCooldown <= 0 && !player.isBerserk) {
                player.addErosion(5); grazeSparks.push(new GrazeSpark(eb.x, eb.y)); eb.grazedCooldown = 30; score += 10;
            }
            if (player.invincibleTimer <= 0 && !player.isBerserk && !player.isBombing) { 
                if (checkCollision(eb, {x: player.x, y: player.y + 5, radius: player.radius})) {
                    if (playerUnlocks.deadManSwitch && player.bombs > 0) { player.triggerBomb(); }
                    else {
                        player.hp--; player.invincibleTimer = 60; score = Math.max(0, score - 500); player.powerLevel = Math.max(0, player.powerLevel - 1); 
                        eb.markedForDeletion = true; currentHits = 0; if (player.hp <= 0) triggerGameOver();
                    }
                }
            }
        }
    });

    // Enemy Body Collision (Robust Check)
    enemies.forEach(enemy => {
        if (!enemy.markedForDeletion) {
            let isAttacking = player.isBerserk || player.isBombing;
            if (isAttacking) {
                if (checkCollision(enemy, player, 10)) {
                    let damage = (player.isBerserk ? 50 : 5); if (enemy.type === 'boss') damage = 3; 
                    enemy.hp -= damage; grazeSparks.push(new GrazeSpark((player.x+enemy.x)/2, (player.y+enemy.y)/2));
                    if (enemy.hp <= 0) {
                        enemy.markedForDeletion = true; enemy.dropScrap();
                        // ★ FIX: e.x -> enemy.x
                        if (playerUnlocks.autoScavenger && player.minions.length < 2 && enemy.type !== 'boss' && enemy.type !== 'carrier') {
                            player.minions.push(new Minion(enemy.x, enemy.y));
                        }
                        if (enemy.type === 'boss') { for(let i=0; i<10; i++) explosions.push(new Explosion(enemy.x + (Math.random()-0.5)*80, enemy.y + (Math.random()-0.5)*80, true)); score += 50000; setTimeout(triggerStageClear, 3000); } 
                        else { explosions.push(new Explosion(enemy.x, enemy.y, true)); }
                        addHitScore();
                    } else if (enemy.type !== 'boss') enemy.y -= 2;
                }
            } else if (player.invincibleTimer <= 0) {
                if (checkCollision(enemy, {x: player.x, y: player.y + 5, radius: player.radius})) {
                    if (playerUnlocks.deadManSwitch && player.bombs > 0) { player.triggerBomb(); }
                    else {
                        player.hp--; player.invincibleTimer = 60; score = Math.max(0, score - 500); currentHits = 0; player.powerLevel = Math.max(0, player.powerLevel - 1); 
                        if (enemy.type !== 'boss') { enemy.hp -= 5 * playerStats.baseDamage; if (enemy.hp <= 0) { enemy.markedForDeletion = true; enemy.dropScrap(); explosions.push(new Explosion(enemy.x, enemy.y, false)); } }
                        if (player.hp <= 0) triggerGameOver();
                    }
                }
            }
        }
    });

    // Cleanup
    playerBullets = playerBullets.filter(pb => !pb.markedForDeletion);
    enemyBullets = enemyBullets.filter(eb => !eb.markedForDeletion);
    enemies = enemies.filter(e => !e.markedForDeletion);
    explosions = explosions.filter(exp => !exp.markedForDeletion);
    scraps = scraps.filter(s => !s.markedForDeletion);
    powerItems = powerItems.filter(pi => !pi.markedForDeletion);
    grazeSparks = grazeSparks.filter(gs => gs.life > 0);
}

function drawGame(ctx) {
    if (!ctx || !player) return;
    scraps.forEach(s => s.draw(ctx));
    powerItems.forEach(pi => pi.draw(ctx));
    grazeSparks.forEach(gs => gs.draw(ctx));
    playerBullets.forEach(pb => pb.draw(ctx));
    enemyBullets.forEach(eb => eb.draw(ctx));
    enemies.forEach(e => e.draw(ctx));
    player.draw(ctx);
    explosions.forEach(exp => exp.draw(ctx));
    
    if (!bossSpawned) {
        let gH = canvas.height * 0.5, gY = canvas.height * 0.25, gX = canvas.width - 15;
        ctx.fillStyle = "rgba(50, 50, 50, 0.5)"; ctx.fillRect(gX, gY, 4, gH);
        let p = currentDistance / totalDistance, fH = gH * p;
        ctx.fillStyle = `rgb(${Math.floor(255 * p)}, ${Math.floor(255 * (1 - p))}, 0)`;
        ctx.fillRect(gX - 2, gY + gH - fH, 8, fH);
        ctx.fillStyle = "#fff"; ctx.fillRect(gX - 4, gY + gH - fH - 2, 12, 4);
        ctx.fillStyle = "#f00"; ctx.fillRect(gX - 4, gY - 4, 12, 4);
    } else if (bossObj && !bossObj.markedForDeletion) {
        let hpR = Math.max(0, bossObj.hp / bossObj.maxHp);
        ctx.fillStyle = "rgba(50, 0, 0, 0.8)"; ctx.fillRect(50, 40, canvas.width - 100, 10);
        ctx.fillStyle = hpR > 0.3 ? "#f00" : "#ff0"; ctx.fillRect(50, 40, (canvas.width - 100) * hpR, 10);
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px 'Courier New'"; ctx.textAlign = "center";
        ctx.fillText(`Lv.${currentLevel} UNKNOWN ENTITY`, canvas.width / 2, 35);
        ctx.textAlign = "left";
    }
}

// Global Start
window.addEventListener('resize', resizeCanvas);
// window.addEventListener('load', initGame) is in window.onload