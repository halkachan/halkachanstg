// ==========================================
// ABYSS CORE - GAME LOGIC (FIXED)
// ==========================================

// 1. Global Variables & Init
// (config.js で定義された変数はグローバルスコープにあるため、ここでは再定義せず使用します)

// 2. Data & Config
// (config.js で定義済み)

// 3. Classes
// (classes.js で定義済み)

// 4. MAIN LOGIC

// Initialize
window.onload = function() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    uiLayer = document.getElementById('ui-layer');
    body = document.getElementById('body');

    // UI Helper
    function setBtn(id, callback) {
        const el = document.getElementById(id);
        if(el) {
            el.onclick = callback;
            el.ontouchend = (e) => { e.preventDefault(); callback(); };
        }
    }
    
    // Set Listeners
    setBtn('btn-shop', openShop);
    setBtn('btn-reset', resetSaveData);
    setBtn('btn-shop-return', openTitle);
    setBtn('btn-clear-return', openTitle);
    setBtn('btn-reboot', openTitle);
    setBtn('btn-resume', togglePause);
    setBtn('btn-abort', openTitleFromPause);
    setBtn('btn-cancel-dive', closeConfirm);
    setBtn('btn-start-dive', startConfirmedGame);
    setBtn('pause-btn', togglePause);
    setBtn('tab-stat', () => switchShopTab('stat'));
    setBtn('tab-unlock', () => switchShopTab('unlock'));
    setBtn('tab-module', () => switchShopTab('module'));
    
    // --- Mouse Inputs ---
    function getCanvasRelativeCoords(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    canvas.addEventListener('mousedown', e => {
        if(appState !== 'playing') return;
        if (e.button === 2) return; 
        e.preventDefault();
        const coords = getCanvasRelativeCoords(e);
        lastTouchX = coords.x; lastTouchY = coords.y;
        isMouseDown = true;
        if (e.button === 0) isTouching = true; 
    });
    canvas.addEventListener('mousemove', e => {
        if(appState !== 'playing') return;
        e.preventDefault();
        if (isMouseDown) {
            const coords = getCanvasRelativeCoords(e);
            let cx = coords.x; let cy = coords.y;
            let dist = Math.hypot(cx - lastTouchX, cy - lastTouchY);
            if (dist < 300) { 
                player.x += (cx - lastTouchX); player.y += (cy - lastTouchY);
                player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
                player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
            }
            lastTouchX = cx; lastTouchY = cy;
        }
    });
    canvas.addEventListener('mouseup', e => {
        if(appState !== 'playing') return;
        e.preventDefault();
        if (e.button === 0) { if (isTouching) player.releaseCharge(); isTouching = false; }
        isMouseDown = false;
    });
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); if(appState === 'playing') player.triggerBomb(); });

    // --- Touch Inputs ---
    function syncTouchPosition(e) {
        if (e.touches && e.touches.length > 0) {
            const coords = getCanvasRelativeCoords(e);
            lastTouchX = coords.x; lastTouchY = coords.y;
        }
    }

    canvas.addEventListener('touchstart', e => {
        if(appState !== 'playing') return;
        e.preventDefault();
        syncTouchPosition(e);
        if (e.touches.length === 1) { isTouching = true; } 
        else if (e.touches.length === 2) { player.triggerBomb(); }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if(appState !== 'playing') return;
        e.preventDefault();
        if (e.touches.length === 0) return;
        const coords = getCanvasRelativeCoords(e);
        let cx = coords.x; let cy = coords.y;
        let dist = Math.hypot(cx - lastTouchX, cy - lastTouchY);
        if (dist < 100) { 
            player.x += (cx - lastTouchX); player.y += (cy - lastTouchY);
            player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
            player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
        }
        lastTouchX = cx; lastTouchY = cy;
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        if(appState !== 'playing') return;
        e.preventDefault();
        syncTouchPosition(e);
        if (e.touches.length === 0) { if (isTouching) player.releaseCharge(); isTouching = false; }
    }, { passive: false });

    window.addEventListener('keydown', e => {
        if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) e.preventDefault();
        keys[e.code] = true;
    });
    window.addEventListener('keyup', e => keys[e.code] = false);

    // Initial Setup
    resizeCanvas();
    player = new Player(); 
    openTitle();
    gameLoop();
    console.log("Game Initialized");
};

// --- Helper Functions ---

function saveGameData() {
    const data = { totalScrap, maxUnlockedLevel, playerStats, playerUnlocks };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
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
    if (!canvas) return;
    const container = document.getElementById('game-container');
    if(container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    if(player && player.y > canvas.height) player.y = canvas.height - 100;
}

function switchShopTab(tab) {
    currentShopTab = tab;
    document.getElementById('tab-stat').classList.toggle('active', tab === 'stat');
    document.getElementById('tab-unlock').classList.toggle('active', tab === 'unlock');
    document.getElementById('tab-module').classList.toggle('active', tab === 'module');
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
    document.getElementById('title-screen').classList.remove('hidden');
    document.getElementById('title-scrap').innerText = `SCRAP: ${Math.floor(totalScrap)}`;
    renderStageGrid();
}

function openShop() {
    appState = 'shop';
    hideAllScreens();
    document.getElementById('shop-screen').classList.remove('hidden');
    renderShop();
}

function showStageConfirm(level) {
    if (level > maxUnlockedLevel) return;
    selectedLevelForConfirm = level;
    document.getElementById('stage-confirm-screen').classList.remove('hidden');
    document.getElementById('confirm-level').innerText = `LEVEL ${level}`;
    let baseSpawnRate = 90 / Math.pow(1.5, level - 1);
    let estEnemies = Math.floor(1500 / Math.max(10, baseSpawnRate)); 
    document.getElementById('confirm-enemy-count').innerText = `ENEMY SIGNAL: ${estEnemies} DETECTED`;
}

function closeConfirm() { document.getElementById('stage-confirm-screen').classList.add('hidden'); }
function startConfirmedGame() { closeConfirm(); startGame(selectedLevelForConfirm); }
function openTitleFromPause() { 
    appState = 'title'; 
    hideAllScreens(); 
    document.getElementById('title-screen').classList.remove('hidden');
    totalScrap += collectedScrapInRun; 
    saveGameData();
    document.getElementById('title-scrap').innerText = `SCRAP: ${Math.floor(totalScrap)}`;
    renderStageGrid(); 
}

function togglePause() {
    if (appState === 'playing') {
        appState = 'paused';
        document.getElementById('pause-screen').classList.remove('hidden');
    } else if (appState === 'paused') {
        appState = 'playing';
        document.getElementById('pause-screen').classList.add('hidden');
    }
}

function startGame(level) {
    currentLevel = level;
    appState = 'playing';
    hideAllScreens();
    if(uiLayer) uiLayer.style.display = 'block';
    
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
    
    if (playerUnlocks.berserkTrigger) {
        let btn = document.getElementById('berserk-btn');
        if(btn) btn.style.display = 'flex';
    } else {
        let btn = document.getElementById('berserk-btn');
        if(btn) btn.style.display = 'none';
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
    document.getElementById('shop-scrap').innerText = `SCRAP: ${Math.floor(totalScrap)}`;
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
    document.getElementById('clear-screen').classList.remove('hidden');
    document.getElementById('clear-stats').innerText = `LEVEL ${currentLevel} CLEARED / SCORE: ${score}`;
    document.getElementById('clear-scrap').innerText = `OBTAINED SCRAP: +${Math.floor(collectedScrapInRun)} (incl. Score Bonus: ${scoreBonus})`;
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
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('gameover-scrap').innerText = `OBTAINED SCRAP: +${Math.floor(collectedScrapInRun)}`;
}

function updatePlayingUI() {
    let hpEl = document.getElementById('hpDisplay');
    let currentHp = player ? Math.max(0, player.hp) : 0;
    let maxHp = player ? player.maxHp : 3;
    hpEl.innerText = `HP: ${'♥'.repeat(currentHp)}${'♡'.repeat(Math.max(0, maxHp - currentHp))}`;
    
    if (currentHp <= 1 && currentHp > 0) hpEl.style.color = (frameCount % 10 < 5) ? "#f00" : "#800";
    else hpEl.style.color = currentHp <= 0 ? "#300" : "#f05";
    
    document.getElementById('scoreDisplay').innerText = `SCORE: ${score}`;
    document.getElementById('playScrapDisplay').innerText = `SCRAP: ${Math.floor(collectedScrapInRun)}`;
    
    let bombCount = player ? player.bombs : 0;
    document.getElementById('bombDisplay').innerText = `BOMB: ${'💣'.repeat(bombCount)}`;
    
    let pLvl = player ? player.powerLevel : 0;
    let powEl = document.getElementById('powerDisplay');
    powEl.innerText = `POWER: Lv.${pLvl}`;
    powEl.style.color = pLvl === 2 ? "#d0f" : (pLvl === 1 ? "#f0f" : "#888");
    
    let erosion = player ? player.erosion : 0;
    let isBerserk = player ? player.isBerserk : false;
    let mentalBar = document.getElementById('mentalGaugeBar');
    mentalBar.style.width = `${erosion}%`;
    if (isBerserk) mentalBar.style.backgroundColor = (frameCount % 4 < 2) ? "#f00" : "#fff"; 
    else mentalBar.style.backgroundColor = "#d0f";

    let slowDisp = document.getElementById('slowDisplay');
    if (gameSpeed < 1.0) {
        slowDisp.style.display = 'block';
        if(body) body.classList.add('slow-active');
    } else {
        slowDisp.style.display = 'none';
        if(body) body.classList.remove('slow-active');
    }
}

function checkCollision(obj1, obj2, margin = 0) {
    let dx = obj1.x - obj2.x; let dy = obj1.y - obj2.y;
    return Math.sqrt(dx*dx + dy*dy) < (obj1.radius + obj2.radius + margin);
}

function checkDistance(obj1, obj2) {
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
    enemies.forEach(enemy => {
        if (!enemy.markedForDeletion) {
            let isAttacking = player.isBerserk || player.isBombing;
            if (isAttacking) {
                if (checkCollision(enemy, player, 10)) {
                    let damage = (player.isBerserk ? 50 : 5); if (enemy.type === 'boss') damage = 3; 
                    enemy.hp -= damage; grazeSparks.push(new GrazeSpark((player.x+enemy.x)/2, (player.y+enemy.y)/2));
                    if (enemy.hp <= 0) {
                        enemy.markedForDeletion = true; enemy.dropScrap();
                        // 修正: 変数eの誤用を修正 (enemyを使用)
                        if (playerUnlocks.autoScavenger && player.minions.length < 2 && enemy.type !== 'boss' && enemy.type !== 'carrier') player.minions.push(new Minion(enemy.x, enemy.y));
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
window.addEventListener('load', initGame);