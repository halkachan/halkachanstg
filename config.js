// ==========================================
// ABYSS CORE - CONFIGURATION & STATE
// ==========================================

// Global DOM Variables (will be set in game.js init)
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

// Input
const keys = {};
let isTouching = false;
let isMouseDown = false;
let lastTouchX = 0, lastTouchY = 0;

const SAVE_KEY = 'abyss_core_save_v5';

// Default Stats
let playerStats = {
    maxHp: 3, baseDamage: 1.0, chargeSpeed: 1.0, maxLocks: 2, lockRange: 1.0, minionPower: 1.0, maxBombs: 2
};

// Default Unlocks
let playerUnlocks = {
    autoScavenger: false, adrenalineBurst: false, deadManSwitch: false, homingShot: false, penetratingShot: false, diffusionShot: false,
    vampireDrive: false, guillotineField: false, midasCurse: false, berserkTrigger: false
};

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