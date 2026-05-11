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
let particles = [];
let stars = [];
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

// Достижения
let achievements = {
    firstShot: false,
    firstBoss: false,
    levelMaster: false,
    legend: false,
    maxPower: false,
    rich: false
};

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
    
    // Кнопка стрельбы
    const fireButton = document.getElementById('btnFire');
    if (fireButton) {
        const handleFire = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (gameState === 'playing') {
                shootProjectileToMouse();
            }
        };
        
        fireButton.addEventListener('touchstart', handleFire, { passive: false });
        fireButton.addEventListener('mousedown', handleFire);
        
        fireButton.addEventListener('touchend', () => {
            fireButton.classList.remove('active');
        });
        fireButton.addEventListener('touchcancel', () => {
            fireButton.classList.remove('active');
        });
        fireButton.addEventListener('mouseup', () => {
            fireButton.classList.remove('active');
        });
        fireButton.addEventListener('mouseleave', () => {
            fireButton.classList.remove('active');
        });
        
        fireButton.addEventListener('touchstart', () => {
            fireButton.classList.add('active');
        }, { passive: false });
    }
}
setupMobileControl();

// ==================== ФОНОВЫЕ ЗВЁЗДЫ ====================
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.5 + 0.1,
            brightness: Math.random()
        });
    }
}

function updateStars() {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        star.brightness = 0.5 + Math.sin(Date.now() * 0.003 + star.x) * 0.5;
    });
}

function drawStars() {
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}
        
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

// Создание частиц
function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = Math.random() * 3 + 2;
        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            size: Math.random() * 4 + 2,
            color: color,
            life: 30,
            alpha: 1
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.dx *= 0.95;
        p.dy *= 0.95;
        p.life--;
        p.alpha = p.life / 30;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
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
    particles = [];
    
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
    initStars();
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
    
    // Проверка достижения "Максимум силы"
    const allMaxed = Object.values(player.upgrades).every(level => level >= GAME_CONFIG.MAX_UPGRADE_LEVEL);
    if (allMaxed && !achievements.maxPower) {
        achievements.maxPower = true;
        showAchievement('Максимум силы', 'Все улучшения на максимуме!');
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
    
// Получить описание текущего уровня улучшения
function getUpgradeDescription(upgradeId, currentLevel) {
    const upgrade = UPGRADE_TYPES[upgradeId];
    if (!upgrade) return '';
    
    const nextLevel = currentLevel + 1;
    
    switch(upgradeId) {
        case 'speed':
            const nextSpeed = upgrade.baseValue + nextLevel * upgrade.increment;
            return `Скорость: ${upgrade.baseValue + (currentLevel - 1) * upgrade.increment} → ${nextSpeed}`;
        case 'damage':
            const nextDamage = 10 * (1 + nextLevel * 0.2);
            const currentDamage = 10 * (1 + (currentLevel - 1) * 0.2);
            return `Урон: ${Math.round(currentDamage)} → ${Math.round(nextDamage)}`;
        case 'fireRate':
            const nextFireRate = Math.max(100, upgrade.baseValue + nextLevel * upgrade.increment);
            const currentFireRate = Math.max(100, upgrade.baseValue + (currentLevel - 1) * upgrade.increment);
            return `Перезарядка: ${currentFireRate}мс → ${nextFireRate}мс`;
        case 'health':
            const nextHealth = upgrade.baseValue + nextLevel * upgrade.increment;
            return `Жизни: ${upgrade.baseValue + (currentLevel - 1) * upgrade.increment} → ${nextHealth}`;
        case 'projectileSize':
            const nextSize = upgrade.baseValue + nextLevel * upgrade.increment;
            return `Размер снаряда: ${upgrade.baseValue + (currentLevel - 1) * upgrade.increment} → ${nextSize}`;
        default:
            return upgrade.description;
    }
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
        
        const upgradeDesc = isMaxed ? 'Максимальный уровень' : getUpgradeDescription(upgrade.id, currentLevel);
        
        const upgradeDiv = document.createElement('div');
        upgradeDiv.className = 'upgrade-item';
        upgradeDiv.innerHTML = `
            <div class="upgrade-header">
                <span class="upgrade-icon">${upgrade.icon}</span>
                <span class="upgrade-name">${upgrade.name}</span>
                <span class="upgrade-level">Ур. ${currentLevel}/${upgrade.maxLevel}</span>
            </div>
            <p class="upgrade-desc">${upgrade.description}</p>
            <p class="upgrade-change" style="color: #2ecc71; font-size: 12px; margin-bottom: 8px;">${upgradeDesc}</p>
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
    
    // Сброс достижений для новой игры
    achievements = {
        firstShot: false,
        firstBoss: false,
        levelMaster: false,
        legend: false,
        maxPower: false,
        rich: false
    };
    
    updateScore();
}
    
// Показать уведомление о достижении
function showAchievement(title, description) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <span>🏆</span>
        <div>
            <div style="font-size: 14px; opacity: 0.9;">Достижение!</div>
            <div style="font-size: 18px;">${title}</div>
            <div style="font-size: 12px; opacity: 0.8;">${description}</div>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3500);
    
    SoundEffects.playLevelComplete();
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
    
    // Достижение легенда
    if (!achievements.legend) {
        achievements.legend = true;
        showAchievement('Легенда', 'Пройти все 5 уровней!');
    }
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
    
    // Первое достижение
    if (!achievements.firstShot) {
        achievements.firstShot = true;
        showAchievement('Первый выстрел', 'Убить первого врага');
    }
    
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
                createParticles(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, '#e74c3c', 10);
                enemiesKilled++;
                
                // Первое убийство
                if (enemiesKilled === 1 && !achievements.firstShot) {
                    achievements.firstShot = true;
                    showAchievement('Первый выстрел', 'Убить первого врага');
                }
                
                updateScore();
                enemies.push(createEnemy());
                
                // Проверка спавна босса
                if (enemiesKilled % enemiesToSpawnBoss === 0 && !boss && enemiesKilled > 0) {
                    boss = createBoss();
                    SoundEffects.playBossSpawn();
                    
                    // Достижение за первого босса
                    if (currentLevel === 1 && !achievements.firstBoss) {
                        achievements.firstBoss = true;
                        showAchievement('Охотник на боссов', 'Победить первого босса');
                    }
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
                createParticles(projectiles[i].x, projectiles[i].y, '#8e44ad', 5);
                updateScore();
                
                if (boss.health <= 0) {
                    score += 200 + (currentLevel - 1) * 50; // Больше очков за босса на высоких уровнях
                    
                    // Достижение за убийство босса
                    if (currentLevel === 1 && !achievements.firstBoss) {
                        achievements.firstBoss = true;
                        showAchievement('Охотник на боссов', 'Победить первого босса');
                    }
                    
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
            createParticles(player.x + player.size / 2, player.y + player.size / 2, '#3498db', 12);
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
            createParticles(player.x + player.size / 2, player.y + player.size / 2, '#3498db', 12);
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
        
        // Создаём частицы при взрыве
        if (exp.radius > exp.maxRadius * 0.5 && exp.life < 25) {
            createParticles(exp.x, exp.y, '#ff6b35', 3);
        }
        
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
            createParticles(coin.x, coin.y, '#ffd700', 6);
            
            // Достижение богатай
            if (coinsForShop >= 50 && !achievements.rich) {
                achievements.rich = true;
                showAchievement('Богатай', 'Накопить 50 монет');
            }
            
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
    
    // Вычисляем угол направления на мышь
    const angle = Math.atan2(
        mouseY - (player.y + player.size / 2),
        mouseX - (player.x + player.size / 2)
    );
    
    ctx.save();
    ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
    ctx.rotate(angle);
    
    // Тело игрока (космический корабль)
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-15, -15);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-15, 15);
    ctx.closePath();
    ctx.fill();
    
    // Кабина
    ctx.fillStyle = '#85c1e9';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Глаза (для милоты)
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
    
    // Огонь из двигателя
    if (Math.random() > 0.5) {
        ctx.fillStyle = `rgba(255, ${Math.random() * 150 + 100}, 0, 0.8)`;
        ctx.beginPath();
        ctx.moveTo(player.x + player.size / 2 - 5, player.y + player.size - 5);
        ctx.lineTo(player.x + player.size / 2 + 5, player.y + player.size - 5);
        ctx.lineTo(player.x + player.size / 2, player.y + player.size + 10 + Math.random() * 10);
        ctx.closePath();
        ctx.fill();
    }
}
    
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2);
        
        // Вращение врага
        ctx.rotate(Date.now() * 0.002);
        
        // Тело врага
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * 2 * Math.PI) / 6;
            const r = enemy.size / 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // Глаза
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-enemy.size / 4, -enemy.size / 6, 4, 0, Math.PI * 2);
        ctx.arc(enemy.size / 4, -enemy.size / 6, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Злое выражение
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-enemy.size / 4, enemy.size / 4);
        ctx.lineTo(0, enemy.size / 5);
        ctx.lineTo(enemy.size / 4, enemy.size / 4);
        ctx.stroke();
        
        ctx.restore();
    });
}

function drawBoss() {
    if (!boss) return;
    
    ctx.save();
    ctx.translate(boss.x + boss.size / 2, boss.y + boss.size / 2);
    
    // Пульсация босса
    const pulse = Math.sin(Date.now() * 0.005) * 5;
    
    // Основное тело
    ctx.fillStyle = '#8e44ad';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (i * 2 * Math.PI) / 8;
        const r = boss.size / 2 + (i % 2 === 0 ? pulse : -pulse);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Внутреннее кольцо
    ctx.fillStyle = '#9b59b6';
    ctx.beginPath();
    ctx.arc(0, 0, boss.size / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Глаза босса
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(-boss.size / 4, -boss.size / 6, 15, 0, Math.PI * 2);
    ctx.arc(boss.size / 4, -boss.size / 6, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Зрачки
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(-boss.size / 4, -boss.size / 6, 6, 0, Math.PI * 2);
    ctx.arc(boss.size / 4, -boss.size / 6, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Рот босса
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, boss.size / 6, boss.size / 5, 0, Math.PI, false);
    ctx.stroke();
    
    ctx.restore();
    
    // Полоска здоровья
    ctx.fillStyle = '#333';
    ctx.fillRect(boss.x, boss.y - 30, boss.size, 15);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(boss.x + 2, boss.y - 28, (boss.size - 4) * (boss.health / boss.maxHealth), 11);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boss.x, boss.y - 30, boss.size, 15);
    
    if (boss.explodeTimer > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${boss.explodeTimer / 120})`;
        ctx.beginPath();
        ctx.arc(boss.x + boss.size / 2, boss.y + boss.size / 2, boss.size / 2 + 10, 0, Math.PI * 2);
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
    // Космический градиент
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a3a');
    gradient.addColorStop(1, '#0a0a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовка уровня на фоне
    if (gameState === 'playing') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`УРОВЕНЬ ${currentLevel}`, canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop() {
    update();
    updateStars();
    updateParticles();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawStars();
    drawCoins();
    drawProjectiles();
    drawEnemies();
    drawBoss();
    drawExplosions();
    drawParticles();
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
