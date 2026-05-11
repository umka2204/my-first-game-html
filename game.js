const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ==================== КОНСТАНТЫ ИГРЫ ====================
const GAME_CONFIG = {
    MAX_LEVELS: 5,
    COINS_TO_WIN: 10,
    MAX_COINS: 15,
    MAX_ENEMIES: 5,
    PROJECTILE_SPEED: 8,
    BOSS_PROJECTILE_SPEED: 5,
    SHOOT_COOLDOWN: 300,
    INVINCIBLE_DURATION: 2000,
    BOSS_HEALTH_BASE: 100,
    BOSS_HEALTH_PER_LEVEL: 20,
    ENEMIES_TO_SPAWN_BOSS_BASE: 15,
    ENEMIES_KILLED_PER_BOSS: 3,
    UPGRADE_COST: 10,
    MAX_UPGRADE_LEVEL: 5
};

// Типы улучшений
const UPGRADE_TYPES = {
    speed: {
        id: 'speed',
        name: 'Скорость',
        description: 'Увеличивает скорость движения',
        icon: '⚡',
        baseValue: 5,
        increment: 1,
        maxLevel: 5
    },
    damage: {
        id: 'damage',
        name: 'Урон',
        description: 'Увеличивает урон снарядов',
        icon: '💥',
        baseValue: 10,
        increment: 5,
        maxLevel: 5
    },
    fireRate: {
        id: 'fireRate',
        name: 'Скорострельность',
        description: 'Уменьшает задержку между выстрелами',
        icon: '🔥',
        baseValue: 300,
        increment: -50,
        maxLevel: 5
    },
    health: {
        id: 'health',
        name: 'Жизни',
        description: 'Добавляет дополнительную жизнь',
        icon: '❤️',
        baseValue: 3,
        increment: 1,
        maxLevel: 5
    },
    projectileSize: {
        id: 'projectileSize',
        name: 'Размер снаряда',
        description: 'Увеличивает размер и радиус снарядов',
        icon: '🎯',
        baseValue: 8,
        increment: 2,
        maxLevel: 5
    }
};
    
// Адаптация размера canvas под экран
function resizeCanvas() {
    canvas.width = Math.min(800, window.innerWidth);
    canvas.height = Math.min(600, window.innerHeight);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ==================== ПЕРЕМЕННЫЕ ИГРЫ ====================

// Игрок
const player = {
    x: 400,
    y: 300,
    size: 40,
    speed: 5,
    color: '#3498db',
    lives: 3,
    invincible: false,
    invincibleTime: 0,
    upgrades: {
        speed: 1,
        damage: 1,
        fireRate: 1,
        health: 1,
        projectileSize: 1
    }
};

// Счёт и уровни
let score = 0;
let currentLevel = 1;
let coinsCollected = 0;
let coinsForShop = 0;
let enemiesKilled = 0;
let enemiesToSpawnBoss = 15;
const maxLevels = GAME_CONFIG.MAX_LEVELS;
const coinsToWin = GAME_CONFIG.COINS_TO_WIN;

// Объекты игры
let coins = [];
let enemies = [];
let projectiles = [];
let enemyProjectiles = [];
let explosions = [];
let boss = null;

// Мышь
let mouseX = 0;
let mouseY = 0;

// Скорости снарядов
const projectileSpeed = GAME_CONFIG.PROJECTILE_SPEED;
const bossProjectileSpeed = GAME_CONFIG.BOSS_PROJECTILE_SPEED;

// Элементы меню
const scoreElement = document.getElementById('score');
const mainMenu = document.getElementById('mainMenu');
const pauseMenu = document.getElementById('pauseMenu');
const winMenu = document.getElementById('winMenu');
const gameOverMenu = document.getElementById('gameOverMenu');
const levelMenu = document.getElementById('levelMenu');
const upgradeMenu = document.getElementById('upgradeMenu');
const shopIndicator = document.getElementById('shopIndicator');

// Состояние игры
let gameState = 'menu';

// Магазин улучшений
let shopAvailable = false;
let shopCooldown = 0;
const SHOP_COOLDOWN_TIME = 300;

// Объект для отслеживания нажатий клавиш
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    W: false,
    A: false,
    S: false,
    D: false
};

// Мобильное управление
const mobileKeys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Константы количества объектов
const maxCoins = GAME_CONFIG.MAX_COINS;
const maxEnemies = GAME_CONFIG.MAX_ENEMIES;

// Настройка кнопок мобильного управления
function setupMobileControl() {
    const buttons = [
        { id: 'btnUp', key: 'ArrowUp' },
        { id: 'btnDown', key: 'ArrowDown' },
        { id: 'btnLeft', key: 'ArrowLeft' },
        { id: 'btnRight', key: 'ArrowRight' }
    ];

    buttons.forEach(({ id, key }) => {
        const button = document.getElementById(id);
        if (button) {
            // Touch events
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                mobileKeys[key] = true;
                button.classList.add('active');
            }, { passive: false });

            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                mobileKeys[key] = false;
                button.classList.remove('active');
            }, { passive: false });

            button.addEventListener('touchcancel', (e) => {
                mobileKeys[key] = false;
                button.classList.remove('active');
            }, { passive: false });

            // Mouse events для тестирования на ПК
            button.addEventListener('mousedown', (e) => {
                e.preventDefault();
                mobileKeys[key] = true;
                button.classList.add('active');
            });

            button.addEventListener('mouseup', () => {
                mobileKeys[key] = false;
                button.classList.remove('active');
            });

            button.addEventListener('mouseleave', () => {
                mobileKeys[key] = false;
                button.classList.remove('active');
            });
        }
    });
}
setupMobileControl();

// ==================== ФУНКЦИИ СОЗДАНИЯ ОБЪЕКТОВ ====================

// ==================== ЗВУКОВЫЕ ЭФФЕКТЫ ====================
const SoundEffects = {
    ctx: null,
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        
        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        oscillator.start();
        oscillator.stop(this.ctx.currentTime + duration);
    },
    
    playCoin() {
        this.playTone(1200, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(1800, 0.1, 'sine', 0.2), 50);
    },
    
    playShoot() {
        this.playTone(400, 0.1, 'triangle', 0.15);
    },
    
    playEnemyHit() {
        this.playTone(200, 0.15, 'sawtooth', 0.2);
    },
    
    playBossHit() {
        this.playTone(150, 0.2, 'square', 0.25);
        setTimeout(() => this.playTone(100, 0.2, 'square', 0.25), 100);
    },
    
    playPlayerHit() {
        this.playTone(100, 0.3, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(80, 0.3, 'sawtooth', 0.25), 150);
    },
    
    playBossSpawn() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playTone(200 + i * 50, 0.2, 'square', 0.2), i * 100);
        }
    },
    
    playLevelComplete() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.2, 'sine', 0.3), i * 150);
        });
    }
};
    
// Создание монетки
function createCoin() {
    return {
        x: Math.random() * (canvas.width - 40) + 20,
        y: Math.random() * (canvas.height - 40) + 20,
        size: 12
    };
}

// Инициализация монеток
function initCoins() {
    coins = [];
    for (let i = 0; i < maxCoins; i++) {
        coins.push(createCoin());
    }
}

// Создание врага
function createEnemy() {
    // С каждым уровнем враги становятся быстрее
    const speedMultiplier = 1 + (currentLevel - 1) * 0.3;
    return {
        x: Math.random() * (canvas.width - 40),
        y: Math.random() * (canvas.height - 40),
        size: 35,
        speed: (1 + Math.random() * 1.5) * speedMultiplier
    };
}

// Инициализация врагов
function initEnemies() {
    enemies = [];
    for (let i = 0; i < maxEnemies; i++) {
        enemies.push(createEnemy());
    }
}

// Создание босса
function createBoss() {
    return {
        x: canvas.width / 2 - 60,
        y: -120,
        size: 120,
        speed: 2,
        health: 100 + currentLevel * 20,
        maxHealth: 100 + currentLevel * 20,
        phase: 'enter',
        shootTimer: 0,
        shootDelay: 60,
        explodeTimer: 0
    };
}

// Создание взрыва
function createExplosion(x, y, maxRadius, damage) {
    explosions.push({
        x: x,
        y: y,
        radius: 0,
        maxRadius: maxRadius,
        life: 30,
        alpha: 1,
        damage: damage
    });
}

// ==================== ФУНКЦИИ ИГРЫ ====================

// Обновление счёта
function updateScore() {
    let text = `Уровень: ${currentLevel}/${maxLevels} | Счёт: ${score} | Жизни: ${player.lives}/${player.maxLives} | Монет: ${coinsToWin - coinsCollected}/${coinsToWin}`;
    if (shopAvailable) {
        text += ` | 🛒 Магазин: ${coinsForShop} 🪙 [U]`;
    }
    if (boss) {
        text += ` | БОСС: ${boss.health}/${boss.maxHealth}`;
    }
    if (gameState === 'playing') {
        scoreElement.innerHTML = text;
        if (shopAvailable) {
            shopIndicator.classList.remove('menu-hidden');
            scoreElement.style.background = 'rgba(255, 215, 0, 0.3)';
            scoreElement.style.borderColor = '#ffd700';
        } else {
            shopIndicator.classList.add('menu-hidden');
            scoreElement.style.background = 'rgba(0, 0, 0, 0.3)';
            scoreElement.style.borderColor = 'transparent';
        }
    }
}

// Сброс игрока
function resetPlayer() {
    player.x = canvas.width / 2 - player.size / 2;
    player.y = canvas.height / 2 - player.size / 2;
    player.lives = player.maxLives || 3;
    player.invincible = false;
    player.invincibleTime = 0;
}

// Сброс игры (полный)
function resetGame() {
    score = 0;
    currentLevel = 1;
    coinsCollected = 0;
    coinsForShop = 0;
    projectiles = [];
    enemyProjectiles = [];
    explosions = [];
    
    // Сброс улучшений
    player.upgrades = {
        speed: 1,
        damage: 1,
        fireRate: 1,
        health: 1,
        projectileSize: 1
    };
    
    applyUpgrades();
    resetPlayer();
    initCoins();
    initEnemies();
    boss = null;
    enemiesKilled = 0;
    enemiesToSpawnBoss = GAME_CONFIG.ENEMIES_TO_SPAWN_BOSS_BASE - (currentLevel - 1) * GAME_CONFIG.ENEMIES_KILLED_PER_BOSS;
    shopAvailable = false;
    updateScore();
}
    
// Применение улучшений
function applyUpgrades() {
    player.speed = UPGRADE_TYPES.speed.baseValue + (player.upgrades.speed - 1) * UPGRADE_TYPES.speed.increment;
    
    const damageMultiplier = 1 + (player.upgrades.damage - 1) * 0.2;
    player.projectileDamage = 10 * damageMultiplier;
    
    player.fireRate = Math.max(100, UPGRADE_TYPES.fireRate.baseValue + (player.upgrades.fireRate - 1) * UPGRADE_TYPES.fireRate.increment);
    
    player.maxLives = UPGRADE_TYPES.health.baseValue + (player.upgrades.health - 1) * UPGRADE_TYPES.health.increment;
    player.lives = player.maxLives;
    
    player.projectileSize = UPGRADE_TYPES.projectileSize.baseValue + (player.upgrades.projectileSize - 1) * UPGRADE_TYPES.projectileSize.increment;
}

// Покупка улучшения
function buyUpgrade(upgradeId) {
    const upgrade = UPGRADE_TYPES[upgradeId];
    
    if (!upgrade) {
        console.error('Неизвестное улучшение:', upgradeId);
        return;
    }
    
    const currentLevel = player.upgrades[upgradeId];
    
    // Проверка: не максимален ли уровень
    if (currentLevel >= upgrade.maxLevel) {
        console.log('Улучшение уже на максимуме');
        return;
    }
    
    // Проверка: хватает ли монет
    if (coinsForShop < GAME_CONFIG.UPGRADE_COST) {
        console.log('Не хватает монет:', coinsForShop, '<', GAME_CONFIG.UPGRADE_COST);
        return;
    }
    
    // Списание монет
    coinsForShop -= GAME_CONFIG.UPGRADE_COST;
    console.log('Куплено:', upgrade.name, 'осталось монет:', coinsForShop);
    
    // Применение улучшения
    player.upgrades[upgradeId]++;
    applyUpgrades();
    
    // Если куплено улучшение здоровья, восстанавливаем жизни
    if (upgradeId === 'health') {
        player.lives = player.maxLives;
    }
    
    SoundEffects.playCoin();
    updateScore();
    renderShop();
    
    // Звук при достижении максимума
    if (player.upgrades[upgradeId] >= upgrade.maxLevel) {
        SoundEffects.playLevelComplete();
    }
}
    
// Показать магазин улучшений
function showUpgradeMenu() {
    gameState = 'shop';
    renderShop();
    upgradeMenu.classList.remove('menu-hidden');
}

// Скрыть магазин (без перехода уровня)
function hideUpgradeMenu() {
    upgradeMenu.classList.add('menu-hidden');
    gameState = 'playing';
    updateScore();
}
    
// Перейти на следующий уровень из магазина
function continueToNextLevel() {
    upgradeMenu.classList.add('menu-hidden');
    shopAvailable = false;
    nextLevel();
}
    
// Отрисовка магазина
function renderShop() {
    const container = document.getElementById('upgradeContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.values(UPGRADE_TYPES).forEach(upgrade => {
        const currentLevel = player.upgrades[upgrade.id];
        const isMaxed = currentLevel >= upgrade.maxLevel;
        const canAfford = coinsForShop >= GAME_CONFIG.UPGRADE_COST;
        
        const upgradeDiv = document.createElement('div');
        upgradeDiv.className = 'upgrade-item';
        upgradeDiv.innerHTML = `
            <div class="upgrade-header">
                <span class="upgrade-icon">${upgrade.icon}</span>
                <span class="upgrade-name">${upgrade.name}</span>
                <span class="upgrade-level">Ур. ${currentLevel}/${upgrade.maxLevel}</span>
            </div>
            <p class="upgrade-desc">${upgrade.description}</p>
            <button class="upgrade-btn ${isMaxed ? 'upgrade-maxed' : ''} ${!canAfford && !isMaxed ? 'upgrade-unaffordable' : ''}" 
                    ${isMaxed ? 'disabled' : ''}>
                ${isMaxed ? 'Максимум' : `Купить (${GAME_CONFIG.UPGRADE_COST} 🪙)`}
            </button>
        `;
        
        container.appendChild(upgradeDiv);
        
        // Добавляем обработчик события для кнопки
        const btn = upgradeDiv.querySelector('.upgrade-btn');
        if (!isMaxed && canAfford) {
            btn.addEventListener('click', () => {
                console.log('Нажата кнопка:', upgrade.name);
                buyUpgrade(upgrade.id);
            });
        }
    });
    
    document.getElementById('upgradeCoins').textContent = coinsForShop;
}

// Показать главное меню
function showMainMenu() {
    gameState = 'menu';
    mainMenu.classList.remove('menu-hidden');
    pauseMenu.classList.add('menu-hidden');
    winMenu.classList.add('menu-hidden');
    gameOverMenu.classList.add('menu-hidden');
    levelMenu.classList.add('menu-hidden');
    upgradeMenu.classList.add('menu-hidden');
    
    // Инициализация базовых значений игрока
    player.maxLives = 3;
    player.lives = 3;
    player.speed = 5;
    player.fireRate = 300;
    player.projectileSize = 8;
    
    updateScore();
}
    
// Показать паузу
function showPauseMenu() {
    gameState = 'paused';
    pauseMenu.classList.remove('menu-hidden');
}

// Скрыть паузу
function hidePauseMenu() {
    pauseMenu.classList.add('menu-hidden');
}

// Показать уровень
function showLevelMenu() {
    gameState = 'level';
    document.getElementById('levelNumber').textContent = currentLevel;
    document.getElementById('levelEnemies').textContent = `Врагов до босса: ${enemiesToSpawnBoss}`;
    levelMenu.classList.remove('menu-hidden');
}

// Показать победу (прохождение всех уровней)
function showWinMenu() {
    gameState = 'won';
    document.getElementById('winScore').textContent = `${score}`;
    document.getElementById('winLevel').textContent = `${currentLevel}/${maxLevels}`;
    winMenu.classList.remove('menu-hidden');
}

// Показать проигрыш
function showGameOverMenu() {
    gameState = 'gameover';
    document.getElementById('finalScore').textContent = `${score}`;
    document.getElementById('finalLevel').textContent = `${currentLevel}`;
    gameOverMenu.classList.remove('menu-hidden');
}

// Начать игру
function startGame() {
    resetGame();
    gameState = 'playing';
    mainMenu.classList.add('menu-hidden');
    pauseMenu.classList.add('menu-hidden');
    winMenu.classList.add('menu-hidden');
    gameOverMenu.classList.add('menu-hidden');
    levelMenu.classList.add('menu-hidden');
    upgradeMenu.classList.add('menu-hidden');
    updateScore();
}
    
// Переход на следующий уровень
function nextLevel() {
    currentLevel++;
    coinsCollected = 0;
    coinsForShop = 0;
    projectiles = [];
    enemyProjectiles = [];
    boss = null;
    enemiesKilled = 0;
    resetPlayer();
    initCoins();
    initEnemies();
    enemiesToSpawnBoss = GAME_CONFIG.ENEMIES_TO_SPAWN_BOSS_BASE - (currentLevel - 1) * GAME_CONFIG.ENEMIES_KILLED_PER_BOSS;
    shopAvailable = false;
    
    if (currentLevel > maxLevels) {
        showWinMenu();
    } else {
        gameState = 'playing';
        updateScore();
    }
}

// Проверка победы на уровне
function checkLevelWin() {
    if (coinsCollected >= coinsToWin && !boss) {
        if (currentLevel >= maxLevels) {
            showWinMenu();
        } else if (!shopAvailable) {
            // Показываем магазин перед следующим уровнем
            shopAvailable = true;
            showUpgradeMenu();
        }
    }
}

// Обработчики событий клавиатуры
document.addEventListener('keydown', (e) => {
    // Проверяем, есть ли клавиша в объекте keys
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }

    // Пауза на P
    if (e.key === 'p' || e.key === 'P') {
        if (gameState === 'playing') {
            showPauseMenu();
        } else if (gameState === 'paused') {
            hidePauseMenu();
            gameState = 'playing';
        }
    }
    
    // Рестарт на R
    if ((e.key === 'r' || e.key === 'R') && gameState === 'playing') {
        startGame();
    }
    
    // Магазин на U
    if ((e.key === 'u' || e.key === 'U') && gameState === 'playing' && shopAvailable) {
        showUpgradeMenu();
    }
    
    // Закрытие магазина на Enter или Escape
    if ((e.key === 'Enter' || e.key === 'Escape') && gameState === 'shop') {
        hideUpgradeMenu();
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Обработчики мыши
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
    if (gameState === 'playing') {
        e.preventDefault();
        shootProjectileToMouse();
    }
});

// Стрельба игрока
let lastShot = 0;
const shootCooldown = GAME_CONFIG.SHOOT_COOLDOWN;

function shootProjectileToMouse() {
    const now = Date.now();
    if (now - lastShot < player.fireRate) return;
    
    lastShot = now;
    SoundEffects.playShoot();
    
    const angle = Math.atan2(
        mouseY - (player.y + player.size / 2),
        mouseX - (player.x + player.size / 2)
    );
    
    projectiles.push({
        x: player.x + player.size / 2,
        y: player.y + player.size / 2,
        dx: Math.cos(angle) * projectileSpeed,
        dy: Math.sin(angle) * projectileSpeed,
        size: player.projectileSize,
        isEnemy: false
    });
}

// Стрельба босса
function bossShoot(boss) {
    const angle = Math.atan2(
        player.y - boss.y,
        player.x - boss.x
    );
    
    enemyProjectiles.push({
        x: boss.x + boss.size / 2,
        y: boss.y + boss.size / 2,
        dx: Math.cos(angle) * bossProjectileSpeed,
        dy: Math.sin(angle) * bossProjectileSpeed,
        size: 12,
        damage: 1
    });
}

// Обновление состояния игры
function update() {
    if (gameState !== 'playing') return;
    
    // Движение игрока
    const up = keys.ArrowUp || keys.w || keys.W || mobileKeys.ArrowUp;
    const down = keys.ArrowDown || keys.s || keys.S || mobileKeys.ArrowDown;
    const left = keys.ArrowLeft || keys.a || keys.A || mobileKeys.ArrowLeft;
    const right = keys.ArrowRight || keys.d || keys.D || mobileKeys.ArrowRight;
    
    if (up) {
        player.y = Math.max(0, player.y - player.speed);
    }
    if (down) {
        player.y = Math.min(canvas.height - player.size, player.y + player.speed);
    }
    if (left) {
        player.x = Math.max(0, player.x - player.speed);
    }
    if (right) {
        player.x = Math.min(canvas.width - player.size, player.x + player.speed);
    }

    // Обновление снарядов игрока
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += proj.dx;
        proj.y += proj.dy;
        
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            projectiles.splice(i, 1);
            continue;
        }
        
        // Попадание во врагов
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dx = proj.x - (enemy.x + enemy.size / 2);
            const dy = proj.y - (enemy.y + enemy.size / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < proj.size + enemy.size / 2) {
                enemies.splice(j, 1);
                projectiles.splice(i, 1);
                score += 25;
                SoundEffects.playEnemyHit();
                enemiesKilled++;
                updateScore();
                enemies.push(createEnemy());
                
                // Проверка спавна босса
                if (enemiesKilled % enemiesToSpawnBoss === 0 && !boss && enemiesKilled > 0) {
                    boss = createBoss();
                    SoundEffects.playBossSpawn();
                }
                break;
            }
        }
        
        // Попадание в босса
        if (boss && projectiles[i]) {
            const dx = projectiles[i].x - (boss.x + boss.size / 2);
            const dy = projectiles[i].y - (boss.y + boss.size / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < projectiles[i].size + boss.size / 2) {
                boss.health -= 10;
                projectiles.splice(i, 1);
                SoundEffects.playBossHit();
                updateScore();
                
                if (boss.health <= 0) {
                    score += 200 + (currentLevel - 1) * 50; // Больше очков за босса на высоких уровнях
                    boss = null;
                    updateScore();
                }
            }
        }
    }

    // Обновление снарядов врагов (босс)
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = enemyProjectiles[i];
        proj.x += proj.dx;
        proj.y += proj.dy;
        
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            enemyProjectiles.splice(i, 1);
            continue;
        }
        
        // Попадание в игрока
        const dx = proj.x - (player.x + player.size / 2);
        const dy = proj.y - (player.y + player.size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < proj.size + player.size / 2 && !player.invincible) {
            player.lives -= proj.damage;
            SoundEffects.playPlayerHit();
            updateScore();
            enemyProjectiles.splice(i, 1);
            
            if (player.lives <= 0) {
                showGameOverMenu();
            } else {
                player.invincible = true;
                player.invincibleTime = Date.now();
            }
        }
    }

    // Обновление врагов
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;
        
        const dx = player.x + player.size / 2 - (enemy.x + enemy.size / 2);
        const dy = player.y + player.size / 2 - (enemy.y + enemy.size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.size / 2 + enemy.size / 2 && !player.invincible) {
            player.lives--;
            SoundEffects.playPlayerHit();
            updateScore();
            
            if (player.lives <= 0) {
                showGameOverMenu();
            } else {
                player.invincible = true;
                player.invincibleTime = Date.now();
            }
        }
    }
    
    // Обновление босса
    if (boss) {
        if (boss.phase === 'enter') {
            boss.y += 2;
            if (boss.y >= 50) {
                boss.phase = 'attack';
            }
        } else if (boss.phase === 'attack') {
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 200) {
                boss.x += (dx / dist) * boss.speed;
                boss.y += (dy / dist) * boss.speed;
            }
            
            boss.shootTimer++;
            if (boss.shootTimer > boss.shootDelay) {
                bossShoot(boss);
                boss.shootTimer = 0;
            }
            
            const playerDist = Math.sqrt(
                (player.x + player.size / 2 - (boss.x + boss.size / 2)) ** 2 +
                (player.y + player.size / 2 - (boss.y + boss.size / 2)) ** 2
            );
            
            if (playerDist < 100) {
                boss.explodeTimer++;
                if (boss.explodeTimer > 120) {
                    createExplosion(boss.x + boss.size / 2, boss.y + boss.size / 2, 150, 1);
                    boss.explodeTimer = 0;
                }
            } else {
                boss.explodeTimer = 0;
            }
        }
    }
    
    // Обновление взрывов
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.radius += (exp.maxRadius - exp.radius) * 0.2;
        exp.life--;
        exp.alpha = exp.life / 30;
        
        const dx = player.x + player.size / 2 - exp.x;
        const dy = player.y + player.size / 2 - exp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < exp.radius + player.size / 2 && !player.invincible && exp.radius > exp.maxRadius * 0.3) {
            player.lives -= exp.damage;
            SoundEffects.playPlayerHit();
            updateScore();
            
            if (player.lives <= 0) {
                showGameOverMenu();
            } else {
                player.invincible = true;
                player.invincibleTime = Date.now();
            }
        }
        
        if (exp.life <= 0) {
            explosions.splice(i, 1);
        }
    }
    
    if (player.invincible && Date.now() - player.invincibleTime > 2000) {
        player.invincible = false;
    }

    // Проверка столкновений с монетками
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        const dx = player.x + player.size / 2 - coin.x;
        const dy = player.y + player.size / 2 - coin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.size / 2 + coin.size) {
            coins.splice(i, 1);
            score += 10;
            coinsCollected++;
            coinsForShop++;
            SoundEffects.playCoin();
            updateScore();
            coins.push(createCoin());
            
            checkLevelWin();
        }
    }
}

function drawPlayer() {
    if (player.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
        return;
    }
    
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x + player.size / 2, player.y + player.size / 2, player.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x + player.size / 3, player.y + player.size / 3, 5, 0, Math.PI * 2);
    ctx.arc(player.x + player.size * 2 / 3, player.y + player.size / 3, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(player.x + player.size / 3, player.y + player.size / 3, 2, 0, Math.PI * 2);
    ctx.arc(player.x + player.size * 2 / 3, player.y + player.size / 3, 2, 0, Math.PI * 2);
    ctx.fill();
    
    if (player.invincible) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.size / 2, player.y + player.size / 2, player.size / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
}
    
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, enemy.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(enemy.x + enemy.size / 3, enemy.y + enemy.size / 3, 5, 0, Math.PI * 2);
        ctx.arc(enemy.x + enemy.size * 2 / 3, enemy.y + enemy.size / 3, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.size / 4, enemy.y + enemy.size / 4);
        ctx.lineTo(enemy.x + enemy.size / 2, enemy.y + enemy.size / 3);
        ctx.moveTo(enemy.x + enemy.size * 3 / 4, enemy.y + enemy.size / 4);
        ctx.lineTo(enemy.x + enemy.size / 2, enemy.y + enemy.size / 3);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.size / 3, enemy.y + enemy.size * 2 / 3);
        ctx.quadraticCurveTo(enemy.x + enemy.size / 2, enemy.y + enemy.size * 0.75, enemy.x + enemy.size * 2 / 3, enemy.y + enemy.size * 2 / 3);
        ctx.stroke();
    });
}

function drawBoss() {
    if (!boss) return;
    
    ctx.fillStyle = '#8e44ad';
    ctx.beginPath();
    ctx.arc(boss.x + boss.size / 2, boss.y + boss.size / 2, boss.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.fillRect(boss.x, boss.y - 20, boss.size, 10);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(boss.x, boss.y - 20, boss.size * (boss.health / boss.maxHealth), 10);
    
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(boss.x + boss.size / 3, boss.y + boss.size / 3, 12, 0, Math.PI * 2);
    ctx.arc(boss.x + boss.size * 2 / 3, boss.y + boss.size / 3, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(boss.x + boss.size / 3, boss.y + boss.size / 3, 5, 0, Math.PI * 2);
    ctx.arc(boss.x + boss.size * 2 / 3, boss.y + boss.size / 3, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(boss.x + boss.size / 2, boss.y + boss.size / 2 + 10, 15, 0, Math.PI, false);
    ctx.stroke();
    
    if (boss.explodeTimer > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${boss.explodeTimer / 120})`;
        ctx.beginPath();
        ctx.arc(boss.x + boss.size / 2, boss.y + boss.size / 2, boss.size / 2 + 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawCoins() {
    coins.forEach(coin => {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffa500';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(coin.x - 3, coin.y - 3, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawProjectiles() {
    projectiles.forEach(proj => {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(proj.x - 2, proj.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    enemyProjectiles.forEach(proj => {
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff69b4';
        ctx.beginPath();
        ctx.arc(proj.x - 3, proj.y - 3, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawExplosions() {
    explosions.forEach(exp => {
        ctx.fillStyle = `rgba(255, 100, 0, ${exp.alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = `rgba(255, 200, 0, ${exp.alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.stroke();
    });
}

function drawBackground() {
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.ellipse(100, 100, 30, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(700, 500, 40, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(650, 150, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    function drawFlower(x, y) {
        ctx.fillStyle = '#ff69b4';
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5;
            ctx.beginPath();
            ctx.arc(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawFlower(200, 200);
    drawFlower(500, 350);
    drawFlower(300, 450);
    drawFlower(600, 250);
    
    // Отрисовка уровня на фоне
    if (gameState === 'playing') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`УРОВЕНЬ ${currentLevel}`, canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop() {
    update();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawCoins();
    drawProjectiles();
    drawEnemies();
    drawBoss();
    drawExplosions();
    drawPlayer();
    
    requestAnimationFrame(gameLoop);
}

// Обработчики кнопок меню
document.addEventListener('click', () => SoundEffects.init(), { once: true });
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('resumeBtn').addEventListener('click', () => {
    hidePauseMenu();
    gameState = 'playing';
});
document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('exitBtn').addEventListener('click', showMainMenu);
document.getElementById('nextLevelBtn').addEventListener('click', nextLevel);
document.getElementById('playAgainBtn').addEventListener('click', startGame);
document.getElementById('exitWinBtn').addEventListener('click', showMainMenu);
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('exitLoseBtn').addEventListener('click', showMainMenu);
document.getElementById('closeUpgradeBtn').addEventListener('click', hideUpgradeMenu);
document.getElementById('nextLevelUpgradeBtn').addEventListener('click', continueToNextLevel);

// Запуск
showMainMenu();
gameLoop();
