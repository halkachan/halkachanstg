// ==========================================
// ABYSS CORE - GAME LOGIC
// ==========================================

// --- 1. Global Variables ---
let canvas, ctx;
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
let totalDistance = 3000;
let currentDistance = 0;
let bossSpawned = false;
let bossObj = null;

let player;
let playerBullets = [];
let enemyBullets = [];
let enemies = [];
let explosions = [];
let scraps = [];
let powerItems = [];
let grazeSparks = [];

// Input
const keys = {};
let isTouching = false;
let lastTouchX = 0, lastTouchY = 0;

// Stats
let playerStats = {
    maxHp: 3, baseDamage: 1.0, chargeSpeed: 1.0, maxLocks: 2, lockRange: 1.0, minionPower: 1.0, maxBombs: 2
};

// Unlocks
let playerUnlocks = {
    autoScavenger: false, adrenalineBurst: false, deadManSwitch: false, homingShot: false, penetratingShot: false, diffusionShot: false,
    vampireDrive: false, guillotineField: false, midasCurse: false, berserkTrigger: false
};

const SAVE_KEY = 'abyss_core_save_v3';

// --- 2. Data & Config ---
const upgradeData = {
    maxHp: { name: "BODY MASS (最大HP)", type: "stat", baseCost: 50, scale: 1.5, getLevel: () => playerStats.maxHp - 2, getCost: () => Math.floor(50 * Math.pow(1.5, playerStats.maxHp - 3)) },
    baseDamage: { name: "WEAPON OUTPUT (基礎火力)", type: "stat", baseCost: 100, scale: 1.8, getLevel: () => Math.floor(playerStats.baseDamage * 10) - 9, getCost: () => Math.floor(100 * Math.pow(1.8, (playerStats.baseDamage - 1.0) * 5)) },
    chargeSpeed: { name: "CORE SYNC (チャージ速度)", type: "stat", baseCost: 150, scale: 2.0, getLevel: () => Math.floor(playerStats.chargeSpeed * 10) - 9, getCost: () => Math.floor(150 * Math.pow(2.0, (playerStats.chargeSpeed - 1.0) * 5)) },
    maxLocks: { name: "MULTIPLE EYES (ロック数)", type: "stat", baseCost: 200, scale: 2.5, getLevel: () => playerStats.maxLocks - 1, getCost: () => Math.floor(200 * Math.pow(2.5, playerStats.maxLocks - 2)) },
    lockRange: { name: "SENSORY EXPANSION (ロック範囲)", type: "stat", baseCost: 150, scale: 2.0, getLevel: () => Math.floor(playerStats.lockRange * 10) - 9, getCost: () => Math.floor(150 * Math.pow(2.0, (playerStats.lockRange - 1.0) * 5)) },
    minionPower: { name: "MINION LINK (使役出力)", type: "stat", condition: () => playerUnlocks.autoScavenger, baseCost: 300, scale: 2.0, getLevel: () => Math.floor((playerStats.minionPower - 1.0) * 2) + 1, getCost: () => Math.floor(300 * Math.pow(2.0, (playerStats.minionPower - 1.0) * 2)) },
    maxBombs: { name: "MENTAL STOCK (ボム数)", type: "stat", baseCost: 500, scale: 2.0, getLevel: () => playerStats.maxBombs - 1, getCost: () => Math.floor(500 * Math.pow(2.0, playerStats.maxBombs - 2)) },
    
    homingShot: { name: "SEEKER ROUNDS (追尾弾)", type: "unlock", cost: 2000, desc: "通常弾が自動で敵を追尾する" },
    penetratingShot: { name: "PENETRATOR (貫通弾)", type: "unlock", cost: 2500, desc: "弾が敵を貫通し、複数を串刺しにする" },
    diffusionShot: { name: "DIFFUSION BURST (拡散弾)", type: "unlock", cost: 2500, desc: "自機から360度全方位に弾を発射する" },
    autoScavenger: { name: "AUTO-SCAVENGER (自動捕食)", type: "unlock", cost: 500, desc: "倒した敵を再起動し、左右に従える" },
    adrenalineBurst: { name: "ADRENALINE (脳内麻薬)", type: "unlock", cost: 1000, desc: "敵弾接近時、世界を0.5倍速にする" },
    deadManSwitch: { name: "DEAD MAN'S SWITCH (遺言爆弾)", type: "unlock", cost: 1500, desc: "被弾時、自動でボムを使用して死を拒絶する" },
    
    vampireDrive: { name: "VAMPIRE DRIVE (吸血回路)", type: "module", cost: 3000, desc: "攻撃力2倍 / HP半減＆被ダメ2倍" },
    guillotineField: { name: "GUILLOTINE FIELD (断頭領域)", type: "module", cost: 4000, desc: "敵弾を無効化するシールドを展開" },
    midasCurse: { name: "MIDAS CURSE (黄金の呪い)", type: "module", cost: 5000, desc: "死んだ時、全財産の半分を捧げて1回だけ蘇生" },
    berserkTrigger: { name: "BERSERK TRIGGER (発狂スイッチ)", type: "module", cost: 2000, desc: "好きな時に発狂モードを発動できるボタンを追加" }
};

// --- 3. Classes ---
class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.baseSpeed = 6;
        this.radius = 4; 
        this.grazeRadius = 25; 
        let hpMult = playerUnlocks.vampireDrive ? 0.5 : 1.0;
        this.maxHp = Math.max(1, Math.floor(playerStats.maxHp * hpMult));
        this.hp = this.maxHp;
        this.invincibleTimer = 0;
        this.shotTimer = 0;
        this.chargeAmount = 0;
        this.isCharging = false;
        this.chargeMax = 60;
        this.lockOnRadius = (120 + (playerStats.maxLocks * 5)) * playerStats.lockRange;
        this.lockedTargets = new Set();
        this.powerLevel = 0;
        this.bombs = playerStats.maxBombs;
        this.isBombing = false;
        this.bombTimer = 0;
        this.erosion = 0; 
        this.isBerserk = false;
        this.berserkTimer = 0;
        this.minions = [];
        this.pollutionTimer = 0; 
        this.shieldMax = 10; 
        this.shieldHp = this.shieldMax;
        this.shieldRecoverTimer = 0;
        this.usedMidas = false;
    }
    triggerBomb() {
        if (this.bombs > 0 && !this.isBombing) {
            this.bombs--;
            this.isBombing = true;
            this.bombTimer = 60; 
            this.invincibleTimer = 120; 
            document.body.classList.add('bomb-active');
            enemyBullets.forEach(eb => { eb.markedForDeletion = true; scraps.push(new Scrap(eb.x, eb.y, true)); });
            enemies.forEach(e => {
                let dmg = 50 * playerStats.baseDamage;
                if(playerUnlocks.vampireDrive) dmg *= 2;
                e.hp -= dmg;
                explosions.push(new Explosion(e.x, e.y, true));
                if (e.hp <= 0) {
                    e.markedForDeletion = true; e.dropScrap();
                    if (playerUnlocks.autoScavenger && player.minions.length < 2 && e.type !== 'boss') player.minions.push(new Minion(e.x, e.y));
                    if (e.type === 'boss') { for(let i=0; i<10; i++) explosions.push(new Explosion(e.x+(Math.random()-0.5)*80, e.y+(Math.random()-0.5)*80, true)); score += 50000; setTimeout(triggerStageClear, 3000); }
                    score += 5000;
                }
            });
        }
    }
    addErosion(amount) {
        if (this.isBerserk) return;
        this.erosion = Math.min(100, this.erosion + amount);
        if (this.erosion >= 100) this.triggerBerserk();
    }
    triggerBerserk() {
        this.isBerserk = true;
        this.berserkTimer = 300; 
        this.erosion = 100;
        document.body.classList.add('berserk-active'); 
        enemyBullets.forEach(eb => { eb.markedForDeletion = true; grazeSparks.push(new GrazeSpark(eb.x, eb.y, true)); });
    }
    triggerBerserkManual() {
        if (this.isBerserk || this.erosion <= 0) return;
        this.isBerserk = true;
        this.berserkTimer = this.erosion * 3; 
        document.body.classList.add('berserk-active');
        enemyBullets.forEach(eb => { eb.markedForDeletion = true; grazeSparks.push(new GrazeSpark(eb.x, eb.y, true)); });
    }
    updateBerserk() {
        if (!this.isBerserk) return;
        this.berserkTimer--;
        if (this.erosion > 0) this.erosion -= (100 / 300); 
        if (frameCount % 4 === 0) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 15;
            // 発狂弾: 追尾かつ貫通→修正: 非貫通
            playerBullets.push(new PlayerBullet(this.x, this.y, Math.cos(angle)*speed, Math.sin(angle)*speed, true, false, null, true, false));
        }
        if (this.berserkTimer <= 0) {
            this.isBerserk = false;
            this.erosion = 0;
            document.body.classList.remove('berserk-active');
            this.invincibleTimer = 60; 
        }
    }
    updateBomb() {
        if (!this.isBombing) return;
        this.bombTimer--;
        if (frameCount % 5 === 0) enemies.forEach(e => { e.hp -= 2 * playerStats.baseDamage; });
        if (this.bombTimer <= 0) {
            this.isBombing = false;
            document.body.classList.remove('bomb-active');
        }
    }
    updateShield() {
        if (!playerUnlocks.guillotineField) return;
        if (this.shieldHp < this.shieldMax) {
            this.shieldRecoverTimer++;
            if (this.shieldRecoverTimer > 300) { this.shieldHp++; this.shieldRecoverTimer = 0; }
        }
    }
    releaseCharge() {
        if (this.isCharging && this.chargeAmount >= this.chargeMax) {
            if (this.lockedTargets.size > 0) {
                this.lockedTargets.forEach(target => {
                    playerBullets.push(new HomingBullet(this.x, this.y, target, this.powerLevel >= 2));
                });
            } else {
                // 非ロックオンチャージ: 修正 非貫通(false)
                playerBullets.push(new PlayerBullet(this.x, this.y - 20, 0, -20, true, this.powerLevel >= 2, null, false, false)); 
            }
        }
        this.isCharging = false;
        this.chargeAmount = 0;
        this.lockedTargets.forEach(t => t.isLocked = false);
        this.lockedTargets.clear();
    }
    update() {
        let speed = this.baseSpeed;
        if (this.isBerserk) speed *= 1.5; 
        if (keys['ArrowLeft']) this.x -= speed;
        if (keys['ArrowRight']) this.x += speed;
        if (keys['ArrowUp']) this.y -= speed;
        if (keys['ArrowDown']) this.y += speed;
        if (keys['KeyV'] && playerUnlocks.berserkTrigger) this.triggerBerserkManual();
        this.x = Math.max(10, Math.min(canvas.width - 10, this.x));
        this.y = Math.max(10, Math.min(canvas.height - 10, this.y));
        if (keys['KeyX']) this.triggerBomb();

        this.updateBerserk();
        this.updateBomb();
        this.updateShield();
        
        let warningEl = document.getElementById('pollution-warning');
        if (this.y < canvas.height * 0.30) { 
            this.pollutionTimer++;
            warningEl.style.display = 'block';
            if (this.pollutionTimer > 60 && this.pollutionTimer % 10 === 0) this.hp = Math.max(1, this.hp - 1); 
        } else {
            this.pollutionTimer = 0;
            warningEl.style.display = 'none';
        }
        
        this.minions = this.minions.filter(m => !m.markedForDeletion);
        this.minions.forEach((m, idx) => m.update(idx)); 

        let isShootingInput = keys['KeyZ'] || isTouching;
        let isChargingInput = keys['KeyZ'] || isTouching;

        if (isShootingInput) {
            if (isChargingInput) {
                this.isCharging = true;
                this.chargeAmount += playerStats.chargeSpeed;
            }
            if (this.chargeAmount < this.chargeMax) {
                if (this.shotTimer <= 0) {
                    let isHoming = playerUnlocks.homingShot;
                    let isPenetrating = playerUnlocks.penetratingShot;
                    if (this.powerLevel === 0) playerBullets.push(new PlayerBullet(this.x, this.y - 20, 0, -15, false, false, null, isHoming, isPenetrating));
                    else if (this.powerLevel === 1) { playerBullets.push(new PlayerBullet(this.x - 8, this.y - 20, 0, -15, false, false, null, isHoming, isPenetrating)); playerBullets.push(new PlayerBullet(this.x + 8, this.y - 20, 0, -15, false, false, null, isHoming, isPenetrating)); }
                    else if (this.powerLevel >= 2) { playerBullets.push(new PlayerBullet(this.x, this.y - 20, 0, -15, false, false, null, isHoming, isPenetrating)); playerBullets.push(new PlayerBullet(this.x - 4, this.y - 20, -3, -14, false, false, null, isHoming, isPenetrating)); playerBullets.push(new PlayerBullet(this.x + 4, this.y - 20, 3, -14, false, false, null, isHoming, isPenetrating)); }
                    if (playerUnlocks.diffusionShot) {
                        let ways = 6; if (this.powerLevel === 1) ways = 12; if (this.powerLevel >= 2) ways = 24;
                        let baseAngle = (frameCount * 0.1); 
                        for(let i=0; i<ways; i++) { let angle = baseAngle + (Math.PI * 2 / ways) * i; let spd = 8; playerBullets.push(new PlayerBullet(this.x, this.y, Math.cos(angle)*spd, Math.sin(angle)*spd, false, false, null, isHoming, isPenetrating)); }
                    }
                    this.shotTimer = 5;
                }
            } else if (isChargingInput) {
                enemies.forEach(enemy => {
                    if (this.lockedTargets.size < playerStats.maxLocks) {
                        let dx = enemy.x - this.x; let dy = enemy.y - (this.y - 150);
                        if (Math.sqrt(dx*dx + dy*dy) < this.lockOnRadius && enemy.y > 0) { this.lockedTargets.add(enemy); enemy.isLocked = true; }
                    }
                });
            }
        }

        if (!keys['KeyZ'] && this.isCharging && !isTouching) this.releaseCharge();
        if (this.shotTimer > 0) this.shotTimer--;
        if (this.invincibleTimer > 0) this.invincibleTimer--;
        
        let isPoC = this.y < canvas.height * 0.25; 
        [...scraps, ...powerItems].forEach(item => {
            let dx = this.x - item.x; let dy = this.y - item.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            let magnetRange = this.isBerserk ? 400 : 150; 
            if (isPoC || dist < magnetRange) { let speedFactor = isPoC ? 15 : (this.isBerserk ? 3 : 1.5); item.vx += (dx / dist) * speedFactor; item.vy += (dy / dist) * speedFactor; }
            if (dist < this.radius + 15) {
                item.markedForDeletion = true;
                if (item instanceof Scrap) { collectedScrapInRun += item.value; totalScrap += item.value; document.getElementById('playScrapDisplay').innerText = `SCRAP: ${Math.floor(collectedScrapInRun)}`; }
                else if (item instanceof PowerItem) { this.powerLevel = Math.min(2, this.powerLevel + 1); grazeSparks.push(new GrazeSpark(this.x, this.y, true)); }
            }
        });
    }

    draw(ctx) {
        if (this.invincibleTimer > 0 && frameCount % 8 < 4 && !this.isBerserk && !this.isBombing) return;
        ctx.save(); ctx.translate(this.x, this.y);
        if (this.isBerserk) { ctx.shadowBlur = 30; ctx.shadowColor = "#f05"; if (frameCount % 4 === 0) ctx.translate((Math.random()-0.5)*4, (Math.random()-0.5)*4); }
        if (this.isBombing) { ctx.shadowBlur = 50; ctx.shadowColor = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, (60 - this.bombTimer) * 10, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = this.isBerserk ? "#500" : "#334"; ctx.fillRect(-12, -30, 8, 40); ctx.fillRect(4, -30, 8, 40);
        ctx.fillStyle = this.isBerserk ? "#f05" : "#0ff"; ctx.fillRect(-10, -32, 4, 10); ctx.fillRect(6, -32, 4, 10);
        if (this.powerLevel >= 1) { ctx.fillStyle = "#334"; ctx.fillRect(-18, -20, 4, 20); ctx.fillRect(14, -20, 4, 20); }
        if (this.powerLevel >= 2) { ctx.fillStyle = "#d0f"; ctx.fillRect(-22, -15, 4, 15); ctx.fillRect(18, -15, 4, 15); }
        ctx.fillStyle = this.isBerserk ? "#f00" : "#fff"; ctx.beginPath(); ctx.arc(0, 5, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (playerUnlocks.guillotineField && this.shieldHp > 0) {
            ctx.save(); ctx.translate(this.x, this.y);
            ctx.strokeStyle = `rgba(0, 255, 255, ${this.shieldHp / this.shieldMax})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
            ctx.rotate(frameCount * 0.2); ctx.strokeStyle = "#0ff"; ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(0, -25); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 35); ctx.lineTo(0, 25); ctx.stroke();
            ctx.restore();
        }
        this.minions.forEach(m => m.draw(ctx));
        if (keys['ShiftLeft'] || keys['ShiftRight'] || isTouching) { if (this.isCharging) { ctx.strokeStyle = "rgba(0, 255, 0, 0.3)"; ctx.beginPath(); ctx.arc(this.x, this.y - 150, this.lockOnRadius, 0, Math.PI * 2); ctx.stroke(); } }
        if (this.chargeAmount >= this.chargeMax) {
            ctx.strokeStyle = this.isBerserk ? "rgba(255, 0, 0, 0.5)" : "rgba(0, 255, 0, 0.5)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(this.x, this.y - 150, this.lockOnRadius, 0, Math.PI * 2); ctx.stroke();
            ctx.save(); ctx.translate(this.x, this.y - 150); ctx.rotate(frameCount * 0.1); ctx.strokeRect(-10, -10, 20, 20); ctx.restore();
        } else if (this.chargeAmount > 0) { ctx.fillStyle = "rgba(0, 255, 255, 0.5)"; ctx.fillRect(this.x - 20, this.y + 20, 40 * (this.chargeAmount / this.chargeMax), 4); }
    }
}

class Minion {
    constructor(x, y) { this.x = x; this.y = y; this.markedForDeletion = false; this.shotTimer = 0; }
    update(index) {
        let targetOffsetX = index === 0 ? -30 : 30; let targetOffsetY = 20;
        this.x += (player.x + targetOffsetX - this.x) * 0.1; this.y += (player.y + targetOffsetY - this.y) * 0.1;
        this.shotTimer--;
        if (this.shotTimer <= 0) {
            let nearest = null; let minDist = 9999;
            enemies.forEach(e => { let d = Math.sqrt((e.x - this.x)**2 + (e.y - this.y)**2); if (d < minDist && d < 300) { minDist = d; nearest = e; } });
            if (nearest) {
                let angle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
                let damage = 1 * playerStats.minionPower;
                if (playerUnlocks.vampireDrive) damage *= 2; 
                playerBullets.push(new PlayerBullet(this.x, this.y, Math.cos(angle)*8, Math.sin(angle)*8, false, false, damage, false, true)); 
                this.shotTimer = 30; 
            }
        }
    }
    draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.fillStyle = "rgba(0, 255, 255, 0.6)"; ctx.shadowBlur = 10; ctx.shadowColor = "#0ff"; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 4); ctx.lineTo(0, 8); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); ctx.restore(); }
}

class PlayerBullet {
    constructor(x, y, vx, vy, isCharge, isBoosted = false, overrideDamage = null, isHoming = false, isPenetrating = false) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.isCharge = isCharge; this.radius = isCharge ? 8 : 3; this.isHoming = isHoming; this.isPenetrating = isPenetrating; this.hitList = []; 
        if (overrideDamage !== null) { this.damage = overrideDamage; } else {
            this.damage = (isCharge ? 10 : 1) * playerStats.baseDamage;
            if (isCharge && isBoosted) this.damage *= 2; if (player.isBerserk) this.damage *= 2; if (playerUnlocks.vampireDrive) this.damage *= 2; 
        }
        this.markedForDeletion = false;
    }
    update() {
        if (this.isHoming) {
            let nearest = null; let minDist = 9999;
            for (let e of enemies) {
                if (e.y > 0 && e.y < canvas.height) { 
                    if (this.isPenetrating && this.hitList.includes(e)) continue;
                    let d = (e.x - this.x)**2 + (e.y - this.y)**2; if (d < minDist) { minDist = d; nearest = e; }
                }
            }
            if (nearest) {
                let targetAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
                let currentAngle = Math.atan2(this.vy, this.vx);
                let diff = targetAngle - currentAngle;
                while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
                let turnSpeed = 0.15;
                if (Math.abs(diff) < turnSpeed) currentAngle = targetAngle; else currentAngle += (diff > 0 ? turnSpeed : -turnSpeed);
                let speed = Math.sqrt(this.vx**2 + this.vy**2);
                this.vx = Math.cos(currentAngle) * speed; this.vy = Math.sin(currentAngle) * speed;
            }
        }
        this.x += this.vx; this.y += this.vy;
        if (this.y < 0 || this.x < 0 || this.x > canvas.width || this.y > canvas.height) this.markedForDeletion = true;
    }
    draw(ctx) {
        let normalColor = "#5f5"; let chargeColor = "#ff0";
        if (this.isCharge) ctx.fillStyle = player.isBerserk ? "#f05" : chargeColor; else ctx.fillStyle = player.isBerserk ? "#f00" : normalColor;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        if (this.isHoming) { ctx.shadowBlur = 5; ctx.shadowColor = normalColor; } ctx.shadowBlur = 0;
    }
}

class HomingBullet extends PlayerBullet {
    constructor(x, y, target, isBoosted = false) { super(x, y, 0, -5, true, isBoosted, null, false, false); this.target = target; this.speed = 12; }
    update() { if (!this.target.markedForDeletion) { let dx = this.target.x - this.x; let dy = this.target.y - this.y; let dist = Math.sqrt(dx*dx + dy*dy); if (dist > 0) { this.vx = (dx / dist) * this.speed; this.vy = (dy / dist) * this.speed; } } super.update(); }
}

class Enemy {
    constructor(x, y, type, level) {
        this.x = x; this.y = y; this.type = type; this.radius = type === 'boss' ? 40 : 12; this.markedForDeletion = false; this.timer = 0; this.level = level; this.isLocked = false; this.angle = undefined; 
        let diffMult = 1 + (level - 1) * 0.5;
        switch(type) {
            case 'normal': this.hp = 2 * diffMult; this.color = "#f5a"; break;
            case 'rusher': this.hp = 1.5 * diffMult; this.color = "#f00"; break;
            case 'sniper': this.hp = 3 * diffMult; this.color = "#0f0"; break;
            case 'sprinkler': this.hp = 4 * diffMult; this.color = "#ff0"; break;
            case 'big': this.hp = 10 * diffMult; this.color = "#f05"; break;
            case 'carrier': this.hp = 5 * diffMult; this.color = "#0ff"; break;
            case 'boss': this.hp = 300 * diffMult; this.color = "#800"; break;
        }
        this.maxHp = this.hp;
    }
    update() {
        this.timer++; let bulletSpeedMult = 1 + (this.level - 1) * 0.2; let moveSpeed = gameSpeed;
        if (this.type === 'normal') {
            this.y += 2 * moveSpeed; this.x += Math.sin(this.timer * 0.05) * 2 * moveSpeed;
            if (this.timer % Math.floor(60/gameSpeed) === 0 && Math.random() > 0.5) enemyBullets.push(new EnemyBullet(this.x, this.y, 0, 4 * bulletSpeedMult));
        } else if (this.type === 'rusher') {
            if (this.y < player.y) {
                let targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
                if (this.angle === undefined) this.angle = targetAngle;
                let diff = targetAngle - this.angle;
                while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
                let turnSpeed = 0.02 * moveSpeed; 
                if (Math.abs(diff) < turnSpeed) this.angle = targetAngle; else this.angle += (diff > 0 ? turnSpeed : -turnSpeed);
            }
            let speed = (3 + (this.timer * 0.05)) * moveSpeed; 
            this.x += Math.cos(this.angle) * speed; this.y += Math.sin(this.angle) * speed;
        } else if (this.type === 'sniper') {
            if (this.y < 100) this.y += 2 * moveSpeed;
            this.x += Math.sin(this.timer * 0.03) * 3 * moveSpeed;
            if (this.timer % Math.floor(90/gameSpeed) === 0) { let angle = Math.atan2(player.y - this.y, player.x - this.x); enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle)*8*bulletSpeedMult, Math.sin(angle)*8*bulletSpeedMult)); }
        } else if (this.type === 'sprinkler') {
            this.y += 1.5 * moveSpeed; 
            if (this.timer % Math.floor(40/gameSpeed) === 0) { let baseAngle = this.timer * 0.1; for(let i=0; i<4; i++) { let angle = baseAngle + (Math.PI/2 * i); enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle)*3*bulletSpeedMult, Math.sin(angle)*3*bulletSpeedMult)); } }
        } else if (this.type === 'big') {
            this.y += 0.5 * moveSpeed;
            if (this.timer % Math.floor(90/gameSpeed) === 0) { enemyBullets.push(new EnemyBullet(this.x, this.y, 0, 5 * bulletSpeedMult)); enemyBullets.push(new EnemyBullet(this.x, this.y, -2, 4 * bulletSpeedMult)); enemyBullets.push(new EnemyBullet(this.x, this.y, 2, 4 * bulletSpeedMult)); }
        } else if (this.type === 'carrier') {
            this.y += 1 * moveSpeed; this.x += Math.sin(this.timer * 0.02) * 3 * moveSpeed; 
        } else if (this.type === 'boss') {
            if (this.y < 120) this.y += 1 * moveSpeed;
            else {
                this.x = (canvas.width / 2) + Math.sin(this.timer * 0.02) * (canvas.width / 3);
                let fireRateP1 = Math.floor(Math.max(20, 50 - (this.level * 2)) / gameSpeed);
                let fireRateP2 = Math.floor(Math.max(5, 12 - Math.floor(this.level / 2)) / gameSpeed);
                if (this.hp > this.maxHp / 2) {
                    if (this.timer % fireRateP1 === 0) { for(let i=-2; i<=2; i++) { let angle = Math.atan2((player.y+5) - this.y, player.x - this.x) + (i * 0.15); enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle)*5*bulletSpeedMult, Math.sin(angle)*5*bulletSpeedMult)); } }
                } else {
                    if (this.timer % fireRateP2 === 0) { let angle = this.timer * 0.1; enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle)*4*bulletSpeedMult, Math.sin(angle)*4*bulletSpeedMult)); enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle+Math.PI)*4*bulletSpeedMult, Math.sin(angle+Math.PI)*4*bulletSpeedMult)); }
                }
            }
        }
        if (this.y > canvas.height + 20 && this.type !== 'boss') this.markedForDeletion = true;
    }
    dropScrap() {
        if (this.type === 'carrier') { powerItems.push(new PowerItem(this.x, this.y)); return; }
        let baseAmount = this.type === 'boss' ? 50 : (this.type === 'big' ? 5 : (this.type === 'rusher' ? 3 : 1));
        let multiplier = player.isBerserk ? 5 : 1;
        let amount = baseAmount * multiplier;
        for(let i=0; i<amount; i++) scraps.push(new Scrap(this.x, this.y, player.isBerserk));
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        if (this.type === 'boss') {
            ctx.rotate(this.timer * 0.02); ctx.fillStyle = "#800"; ctx.beginPath(); ctx.moveTo(0, -this.radius); for(let i=1; i<8; i++){ ctx.lineTo(Math.sin(i * Math.PI/4) * this.radius, -Math.cos(i * Math.PI/4) * this.radius); } ctx.closePath(); ctx.fill(); ctx.fillStyle = (this.timer % 10 < 5 && this.hp < this.maxHp / 2) ? "#f00" : "#ff0"; ctx.beginPath(); ctx.arc(0, 0, 15 + Math.sin(this.timer*0.1)*2, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.fillStyle = this.color;
            ctx.rotate(this.type === 'rusher' ? this.angle + Math.PI/2 : this.timer * 0.02);
            ctx.beginPath();
            if (this.type === 'normal') { ctx.moveTo(0, -this.radius); ctx.lineTo(this.radius, this.radius); ctx.lineTo(-this.radius, this.radius); }
            else if (this.type === 'rusher') { ctx.scale(0.7, 1.5); ctx.moveTo(0, -10); ctx.lineTo(10, 10); ctx.lineTo(-10, 10); }
            else if (this.type === 'sniper') { ctx.rect(-this.radius, -this.radius, this.radius*2, this.radius*2); }
            else if (this.type === 'sprinkler') { for(let i=0; i<8; i++) { let r = i%2==0 ? this.radius : this.radius/2; let a = (i * Math.PI / 4); ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } }
            else if (this.type === 'big') { for(let i=0; i<6; i++) { let a = (i * Math.PI / 3); ctx.lineTo(Math.cos(a)*this.radius, Math.sin(a)*this.radius); } }
            else if (this.type === 'carrier') { ctx.scale(1.5, 0.8); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); }
            ctx.closePath(); ctx.fill();
            if (this.type === 'sniper' || this.type === 'carrier') { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); }
        }
        ctx.restore();
        if (this.isLocked) { ctx.strokeStyle = "#0f0"; ctx.strokeRect(this.x - 15 - (this.radius*0.5), this.y - 15 - (this.radius*0.5), 30 + this.radius, 30 + this.radius); }
    }
}

class EnemyBullet {
    constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.radius = 4; this.markedForDeletion = false; this.reflected = false; this.grazedCooldown = 0; }
    update() { this.x += this.vx * gameSpeed; this.y += this.vy * gameSpeed; if (this.grazedCooldown > 0) this.grazedCooldown--; if (this.y > canvas.height || this.y < 0 || this.x < 0 || this.x > canvas.width) this.markedForDeletion = true; }
    draw(ctx) { ctx.fillStyle = this.reflected ? "#0ff" : "#f00"; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
}

class GrazeSpark {
    constructor(x, y, isBig = false) { this.x = x; this.y = y; this.life = 10; this.isBig = isBig; }
    update() { this.life--; }
    draw(ctx) { ctx.globalAlpha = this.life / 10; ctx.fillStyle = "#d0f"; ctx.beginPath(); let r = this.isBig ? 20 : 10; ctx.arc(this.x, this.y, r, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0; }
}

class Explosion {
    constructor(x, y, isBig) { this.x = x; this.y = y; this.radius = 0; this.maxRadius = isBig ? 80 : 30; this.life = 0; this.maxLife = 20; this.markedForDeletion = false; }
    update() { this.life++; this.radius = this.maxRadius * (1 - Math.pow(1 - this.life / this.maxLife, 3)); if (this.life >= this.maxLife) this.markedForDeletion = true; }
    draw(ctx) { ctx.globalAlpha = 1 - (this.life / this.maxLife); ctx.fillStyle = "#f80"; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0; }
}

class Scrap {
    constructor(x, y, isHighValue) {
        this.x = x + (Math.random()-0.5)*20; this.y = y + (Math.random()-0.5)*20; this.vx = (Math.random()-0.5) * 6; this.vy = (Math.random()-0.5) * 6 - 2; this.radius = isHighValue ? 5 : 3;
        let baseValue = isHighValue ? 5 : 1; let levelMult = 1 + (currentLevel - 1) * 0.5; this.value = Math.floor(baseValue * levelMult); this.isHighValue = isHighValue; this.markedForDeletion = false;
    }
    update() { this.vy += 0.1; this.x += this.vx; this.y += this.vy; this.vx *= 0.95; this.vy *= 0.98; if (this.y > canvas.height) this.markedForDeletion = true; }
    draw(ctx) { ctx.fillStyle = this.isHighValue ? "#ffd700" : "#0ff"; ctx.shadowBlur = 5; ctx.shadowColor = this.isHighValue ? "#fff" : "#0ff"; let s = this.isHighValue ? 6 : 4; ctx.fillRect(this.x - s/2, this.y - s/2, s, s); ctx.shadowBlur = 0; }
}

class PowerItem {
    constructor(x, y) { this.x = x; this.y = y; this.vx = (Math.random()-0.5) * 4; this.vy = -3; this.radius = 8; this.markedForDeletion = false; }
    update() { this.x += this.vx; this.y += this.vy; if(this.x < 10 || this.x > canvas.width - 10) this.vx = -this.vx; if(this.y < 10) this.vy = -this.vy; if(this.y > canvas.height) { this.y = canvas.height; this.vy = -this.vy * 0.8; } this.vx *= 0.98; this.vy = this.vy * 0.98 + 0.05; }
    draw(ctx) { ctx.fillStyle = "#d0f"; ctx.shadowBlur = 10; ctx.shadowColor = "#f0f"; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "bold 10px Courier New"; ctx.textAlign = "center"; ctx.fillText("P", this.x, this.y + 3); ctx.shadowBlur = 0; }
}

// 5. Initialize on Load
window.onload = function() {
    canvas = document.getElementById('gameCanvas'); // 確実に要素を取得
    ctx = canvas.getContext('2d');
    uiLayer = document.getElementById('ui-layer');
    body = document.getElementById('body');

    // UI Button Listeners Helper
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
    // 修正箇所: ポーズボタンとタブ切り替えボタンへのイベント登録を追加
    setBtn('pause-btn', togglePause);
    setBtn('tab-upgrade', () => switchShopTab('stat'));
    setBtn('tab-unlock', () => switchShopTab('unlock'));
    setBtn('tab-module', () => switchShopTab('module'));
    
    // Touch Events on Canvas
    canvas.addEventListener('touchstart', e => {
        if(appState !== 'playing') return;
        e.preventDefault();
        syncTouchPosition(e);
        if (e.touches.length === 1) {
            isTouching = true; 
            touchStartX = lastTouchX; touchStartY = lastTouchY; touchStartTime = Date.now();
        } else if (e.touches.length === 2) {
            // 2本指タップでボム
            player.triggerBomb();
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if(appState !== 'playing') return;
        e.preventDefault();
        if (e.touches.length === 0) return;
        let cx = e.touches[0].clientX;
        let cy = e.touches[0].clientY;
        let dist = Math.hypot(cx - lastTouchX, cy - lastTouchY);
        if (dist < 100) { 
            player.x += (cx - lastTouchX);
            player.y += (cy - lastTouchY);
        }
        lastTouchX = cx;
        lastTouchY = cy;
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        if(appState !== 'playing') return;
        e.preventDefault();
        syncTouchPosition(e);
        if (e.touches.length === 0) {
             if (isTouching) player.releaseCharge();
             isTouching = false;
        }
    }, { passive: false });

    resizeCanvas();
    player = new Player();
    openTitle();
    gameLoop();
};

// ... existing helper functions (resizeCanvas, etc.) ...
// グローバルスコープで定義されている関数はそのまま維持
// （saveGameData, loadGameData, resetSaveData, resizeCanvas, switchShopTab, hideAllScreens, openTitle, openShop, showStageConfirm, closeConfirm, startConfirmedGame, startGame, triggerStageClear, triggerGameOver, togglePause, openTitleFromPause, renderStageGrid, renderShop, buyUpgrade, updatePlayingUI, checkCollision, checkDistance, addHitScore, gameLoop, updateGame, drawGame）
// ※実際のコードではここにすべての関数定義が必要です。