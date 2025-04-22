// Game constants
const CELL_SIZE = 20;
const GRID_SIZE = 20; // 400px / 20px
const GAME_SPEED = 150; // ms (increased from 120ms to slow down snake movement)
const FRUIT_TYPES = ['apple', 'banana', 'strawberry'];

// Game variables
let canvas, ctx;
let snake = [];
let direction = 'RIGHT';
let nextDirection = 'RIGHT';
let fruit = {};
let walls = [];
let score = 0;
let gameInterval;
let gameRunning = false;
let gamePaused = false;
let soundEnabled = true;
let musicEnabled = false;
let frameCount = 0;
let particles = [];
let highScores = [];
const MAX_HIGH_SCORES = 10;

// Sounds (will be created programmatically)
const sounds = {
    eat: null,
    gameOver: null,
    music: null
};

// Game initialization
window.onload = function() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Initialize UI elements
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('soundToggle').addEventListener('change', toggleSound);
    document.getElementById('musicToggle').addEventListener('change', toggleMusic);
    document.getElementById('saveScoreBtn').addEventListener('click', handleSaveScore);
    document.getElementById('closeModal').addEventListener('click', closeGameOverModal);
    
    // Mobile controls
    document.getElementById('upBtn').addEventListener('click', () => setDirection('UP'));
    document.getElementById('leftBtn').addEventListener('click', () => setDirection('LEFT'));
    document.getElementById('downBtn').addEventListener('click', () => setDirection('DOWN'));
    document.getElementById('rightBtn').addEventListener('click', () => setDirection('RIGHT'));
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Create sound effects programmatically
    createSounds();
    
    // Load high scores
    loadHighScores();
    
    // Draw start screen
    drawStartScreen();
};

function createSounds() {
    // Create eat sound (short beep)
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Eat sound (short high pitch beep)
        sounds.eat = audioContext.createOscillator();
        sounds.eat.type = 'sine';
        sounds.eat.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        
        // Game over sound (descending pitch)
        sounds.gameOver = audioContext.createOscillator();
        sounds.gameOver.type = 'sawtooth';
        sounds.gameOver.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        sounds.gameOver.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 1); // A2
        
        // Background music (simple looping pattern)
        sounds.music = audioContext.createOscillator();
        sounds.music.type = 'sine';
        sounds.music.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        
        console.log("Sound effects created successfully");
    } catch (e) {
        console.error("Could not create sound effects:", e);
        
        // Fallback for browsers that don't support Web Audio API
        sounds.eat = { play: () => {} };
        sounds.gameOver = { play: () => {} };
        sounds.music = { play: () => {}, stop: () => {} };
    }
}

function playEatSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.error("Could not play eat sound:", e);
    }
}

function playGameOverSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1);
    } catch (e) {
        console.error("Could not play game over sound:", e);
    }
}

// Background music loop with Web Audio API
let musicInterval;
function toggleBackgroundMusic(start) {
    if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
    }
    
    if (!start || !soundEnabled || !musicEnabled) return;
    
    // Simple melody pattern
    const notes = [440, 493.88, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88];
    let noteIndex = 0;
    
    musicInterval = setInterval(() => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(notes[noteIndex], audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            
            noteIndex = (noteIndex + 1) % notes.length;
        } catch (e) {
            console.error("Could not play background music note:", e);
        }
    }, 300);
}

function drawStartScreen() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#aa44ff';
    ctx.font = '30px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('Fruit Snake Rush', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.fillStyle = '#ffcc00';
    ctx.font = '16px Orbitron';
    ctx.fillText('Press Start to Play!', canvas.width / 2, canvas.height / 2 + 20);
    
    // Draw sample snake and fruit
    drawSnakeHead(canvas.width / 2 - 60, canvas.height / 2 + 50, 'RIGHT');
    drawSnakeBody(canvas.width / 2 - 40, canvas.height / 2 + 50);
    drawSnakeBody(canvas.width / 2 - 20, canvas.height / 2 + 50);
    drawFruit(canvas.width / 2 + 20, canvas.height / 2 + 50, 'apple', 0);
}

function startGame() {
    if (gameRunning) return;
    
    initGame();
    gameRunning = true;
    gamePaused = false;
    gameInterval = setInterval(gameLoop, GAME_SPEED);
    
    // Enable pause button when game starts
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('pauseBtn').textContent = 'Pause';
    
    toggleBackgroundMusic(true);
}

function togglePause() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (gamePaused) {
        clearInterval(gameInterval);
        pauseBtn.textContent = 'Resume';
        
        // Draw "PAUSED" text on canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffcc00';
        ctx.font = '30px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    } else {
        gameInterval = setInterval(gameLoop, GAME_SPEED);
        pauseBtn.textContent = 'Pause';
    }
}

function closeGameOverModal() {
    document.getElementById('gameOverModal').style.display = 'none';
}

function restartGame() {
    document.getElementById('gameOverModal').style.display = 'none';
    startGame();
}

function initGame() {
    // Initialize snake
    snake = [
        { x: 6, y: 10 },
        { x: 5, y: 10 },
        { x: 4, y: 10 }
    ];
    
    direction = 'RIGHT';
    nextDirection = 'RIGHT';
    score = 0;
    document.getElementById('score').textContent = score;
    frameCount = 0;
    particles = [];
    
    // Generate walls
    generateWalls();
    
    // Generate fruit
    generateFruit();
}

function generateWalls() {
    walls = [];
    
    // Generate random walls
    const wallCount = 10;
    for (let i = 0; i < wallCount; i++) {
        let wallX, wallY;
        let validPosition = false;
        
        while (!validPosition) {
            wallX = Math.floor(Math.random() * GRID_SIZE);
            wallY = Math.floor(Math.random() * GRID_SIZE);
            
            // Check if position is valid (not on snake or existing walls)
            validPosition = true;
            
            // Check against snake
            for (let part of snake) {
                if (part.x === wallX && part.y === wallY) {
                    validPosition = false;
                    break;
                }
            }
            
            // Check against existing walls
            if (validPosition) {
                for (let wall of walls) {
                    if (wall.x === wallX && wall.y === wallY) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            // Don't place walls too close to snake's head
            if (validPosition) {
                const distFromHead = Math.abs(snake[0].x - wallX) + Math.abs(snake[0].y - wallY);
                if (distFromHead < 5) {
                    validPosition = false;
                }
            }
        }
        
        walls.push({ x: wallX, y: wallY });
    }
}

function generateFruit() {
    let x, y, validPosition;
    let fruitType = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
    
    do {
        validPosition = true;
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
        
        // Check if position is not on snake
        for (let part of snake) {
            if (part.x === x && part.y === y) {
                validPosition = false;
                break;
            }
        }
        
        // Check if position is not on walls
        if (validPosition) {
            for (let wall of walls) {
                if (wall.x === x && wall.y === y) {
                    validPosition = false;
                    break;
                }
            }
        }
    } while (!validPosition);
    
    fruit = { x, y, type: fruitType, animation: 0 };
}

function gameLoop() {
    update();
    draw();
    frameCount++;
}

function update() {
    // Update direction
    direction = nextDirection;
    
    // Calculate new head position
    const head = { ...snake[0] };
    
    switch (direction) {
        case 'UP':
            head.y -= 1;
            break;
        case 'DOWN':
            head.y += 1;
            break;
        case 'LEFT':
            head.x -= 1;
            break;
        case 'RIGHT':
            head.x += 1;
            break;
    }
    
    // Wrap around screen edges
    if (head.x < 0) head.x = GRID_SIZE - 1;
    if (head.x >= GRID_SIZE) head.x = 0;
    if (head.y < 0) head.y = GRID_SIZE - 1;
    if (head.y >= GRID_SIZE) head.y = 0;
    
    // Check for collision with self
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
            gameOver();
            return;
        }
    }
    
    // Check for collision with walls
    for (let wall of walls) {
        if (wall.x === head.x && wall.y === head.y) {
            gameOver();
            return;
        }
    }
    
    // Check for collision with fruit
    const eatFruit = (head.x === fruit.x && head.y === fruit.y);
    
    // Move snake
    snake.unshift(head);
    
    if (eatFruit) {
        // Increase score
        score += 10;
        document.getElementById('score').textContent = score;
        
        // Play sound effect
        playEatSound();
        
        // Generate new fruit
        generateFruit();
        
        // Create particles
        createParticles(head.x, head.y);
    } else {
        // Remove tail if no fruit was eaten
        snake.pop();
    }
    
    // Update fruit animation
    fruit.animation = (fruit.animation + 1) % 60;
    
    // Update particles
    updateParticles();
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw walls
    for (let wall of walls) {
        drawWall(wall.x * CELL_SIZE, wall.y * CELL_SIZE);
    }
    
    // Draw snake
    for (let i = 0; i < snake.length; i++) {
        const segment = snake[i];
        
        if (i === 0) {
            // Draw head based on direction
            drawSnakeHead(segment.x * CELL_SIZE, segment.y * CELL_SIZE, direction);
        } else if (i === snake.length - 1) {
            // Draw tail
            drawSnakeTail(segment.x * CELL_SIZE, segment.y * CELL_SIZE, getPrevSegmentDirection(i));
        } else {
            // Draw body segment
            drawSnakeBody(segment.x * CELL_SIZE, segment.y * CELL_SIZE);
        }
    }
    
    // Draw fruit with animation
    const bounce = Math.sin(fruit.animation * 0.1) * 2;
    drawFruit(fruit.x * CELL_SIZE, fruit.y * CELL_SIZE - bounce, fruit.type, fruit.animation);
    
    // Draw particles if any
    drawParticles();
}

// Drawing functions
function drawSnakeHead(x, y, dir) {
    // Base head shape
    ctx.fillStyle = '#2dd36f';
    ctx.beginPath();
    ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 8);
    ctx.fill();
    
    // Darker green pattern
    ctx.fillStyle = '#1ec95e';
    ctx.beginPath();
    ctx.roundRect(x + CELL_SIZE * 0.2, y + CELL_SIZE * 0.2, CELL_SIZE * 0.6, CELL_SIZE * 0.6, 4);
    ctx.fill();
    
    // Eyes position based on direction
    let eyeX1, eyeY1, eyeX2, eyeY2;
    
    switch (dir) {
        case 'RIGHT':
            eyeX1 = x + CELL_SIZE * 0.75;
            eyeY1 = y + CELL_SIZE * 0.25;
            eyeX2 = x + CELL_SIZE * 0.75;
            eyeY2 = y + CELL_SIZE * 0.75;
            break;
        case 'LEFT':
            eyeX1 = x + CELL_SIZE * 0.25;
            eyeY1 = y + CELL_SIZE * 0.25;
            eyeX2 = x + CELL_SIZE * 0.25;
            eyeY2 = y + CELL_SIZE * 0.75;
            break;
        case 'UP':
            eyeX1 = x + CELL_SIZE * 0.25;
            eyeY1 = y + CELL_SIZE * 0.25;
            eyeX2 = x + CELL_SIZE * 0.75;
            eyeY2 = y + CELL_SIZE * 0.25;
            break;
        case 'DOWN':
            eyeX1 = x + CELL_SIZE * 0.25;
            eyeY1 = y + CELL_SIZE * 0.75;
            eyeX2 = x + CELL_SIZE * 0.75;
            eyeY2 = y + CELL_SIZE * 0.75;
            break;
    }
    
    // Draw eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(eyeX1, eyeY1, CELL_SIZE * 0.15, 0, Math.PI * 2);
    ctx.arc(eyeX2, eyeY2, CELL_SIZE * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw pupils
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(eyeX1, eyeY1, CELL_SIZE * 0.07, 0, Math.PI * 2);
    ctx.arc(eyeX2, eyeY2, CELL_SIZE * 0.07, 0, Math.PI * 2);
    ctx.fill();
    
    // Tongue (only show sometimes for animation)
    if (frameCount % 20 < 10 && (dir === 'RIGHT' || dir === 'LEFT')) {
        let tongueStartX, tongueEndX;
        
        if (dir === 'RIGHT') {
            tongueStartX = x + CELL_SIZE;
            tongueEndX = x + CELL_SIZE + CELL_SIZE * 0.4;
        } else {
            tongueStartX = x;
            tongueEndX = x - CELL_SIZE * 0.4;
        }
        
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tongueStartX, y + CELL_SIZE / 2);
        ctx.lineTo((tongueStartX + tongueEndX) / 2, y + CELL_SIZE / 2);
        ctx.lineTo(tongueEndX, y + CELL_SIZE / 2 - 3);
        ctx.moveTo((tongueStartX + tongueEndX) / 2, y + CELL_SIZE / 2);
        ctx.lineTo(tongueEndX, y + CELL_SIZE / 2 + 3);
        ctx.stroke();
    }
}

function drawSnakeBody(x, y) {
    // Base body shape
    ctx.fillStyle = '#32db76';
    ctx.beginPath();
    ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 6);
    ctx.fill();
    
    // Darker green pattern
    ctx.fillStyle = '#28c76f';
    ctx.beginPath();
    ctx.roundRect(x + CELL_SIZE * 0.25, y + CELL_SIZE * 0.25, CELL_SIZE * 0.5, CELL_SIZE * 0.5, 3);
    ctx.fill();
    
    // Subtle shading
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + CELL_SIZE, y);
    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + CELL_SIZE);
    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
    ctx.fill();
}

function drawSnakeTail(x, y, dir) {
    // Base tail shape - slightly smaller and tapered compared to body
    ctx.fillStyle = '#28c76f';
    ctx.beginPath();
    ctx.roundRect(x + CELL_SIZE * 0.1, y + CELL_SIZE * 0.1, CELL_SIZE * 0.8, CELL_SIZE * 0.8, 8);
    ctx.fill();
    
    // Darker green pattern
    ctx.fillStyle = '#20b363';
    ctx.beginPath();
    ctx.roundRect(x + CELL_SIZE * 0.3, y + CELL_SIZE * 0.3, CELL_SIZE * 0.4, CELL_SIZE * 0.4, 4);
    ctx.fill();
}

function getPrevSegmentDirection(index) {
    if (index <= 0 || index >= snake.length) return 'RIGHT';
    
    const current = snake[index];
    const prev = snake[index - 1];
    
    if (prev.x > current.x) return 'RIGHT';
    if (prev.x < current.x) return 'LEFT';
    if (prev.y > current.y) return 'DOWN';
    return 'UP';
}

function drawFruit(x, y, type, animation) {
    let mainColor, secondaryColor;
    
    switch (type) {
        case 'apple':
            mainColor = '#ff3333';
            secondaryColor = '#cc0000';
            
            // Draw apple body
            ctx.fillStyle = mainColor;
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Highlights
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE / 3, y + CELL_SIZE / 3, CELL_SIZE / 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Stem
            ctx.fillStyle = '#663300';
            ctx.fillRect(x + CELL_SIZE / 2 - 2, y, 4, 5);
            
            // Leaf
            ctx.fillStyle = '#339933';
            ctx.beginPath();
            ctx.ellipse(x + CELL_SIZE / 2 + 4, y + 3, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'banana':
            mainColor = '#ffcc00';
            secondaryColor = '#e6b800';
            
            // Draw banana shape (curved)
            ctx.fillStyle = mainColor;
            ctx.beginPath();
            ctx.moveTo(x + 5, y + 5);
            ctx.quadraticCurveTo(x + CELL_SIZE / 2, y - 5, x + CELL_SIZE - 5, y + 5);
            ctx.quadraticCurveTo(x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 5, x + 5, y + CELL_SIZE - 5);
            ctx.quadraticCurveTo(x + CELL_SIZE / 2, y + CELL_SIZE - 10, x + CELL_SIZE - 5, y + CELL_SIZE - 5);
            ctx.quadraticCurveTo(x + CELL_SIZE - 10, y + CELL_SIZE / 2, x + CELL_SIZE - 5, y + 5);
            ctx.fill();
            
            // Brown tips
            ctx.fillStyle = '#663300';
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE - 5, y + 5, 3, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'strawberry':
            mainColor = '#ff3366';
            secondaryColor = '#cc0033';
            
            // Draw strawberry body
            ctx.fillStyle = mainColor;
            ctx.beginPath();
            ctx.moveTo(x + CELL_SIZE / 2, y + CELL_SIZE);
            ctx.quadraticCurveTo(x - 5, y + CELL_SIZE / 2, x + CELL_SIZE / 2, y + 5);
            ctx.quadraticCurveTo(x + CELL_SIZE + 5, y + CELL_SIZE / 2, x + CELL_SIZE / 2, y + CELL_SIZE);
            ctx.fill();
            
            // Green top
            ctx.fillStyle = '#339933';
            ctx.beginPath();
            ctx.moveTo(x + CELL_SIZE / 2, y);
            ctx.lineTo(x + CELL_SIZE / 2 - 8, y + 5);
            ctx.lineTo(x + CELL_SIZE / 2, y + 10);
            ctx.lineTo(x + CELL_SIZE / 2 + 8, y + 5);
            ctx.closePath();
            ctx.fill();
            
            // Seeds (dots)
            ctx.fillStyle = '#ffffcc';
            for (let i = 0; i < 6; i++) {
                const seedX = x + 5 + Math.random() * (CELL_SIZE - 10);
                const seedY = y + 10 + Math.random() * (CELL_SIZE - 15);
                ctx.beginPath();
                ctx.arc(seedX, seedY, 1, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
    }
}

function drawWall(x, y) {
    // Draw brick-like wall
    ctx.fillStyle = '#7a3b00';
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    
    // Draw brick pattern
    ctx.strokeStyle = '#4d2500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Horizontal lines
    ctx.moveTo(x, y + CELL_SIZE / 2);
    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE / 2);
    
    // Vertical lines - alternating pattern
    if ((Math.floor(x / CELL_SIZE) + Math.floor(y / CELL_SIZE)) % 2 === 0) {
        ctx.moveTo(x + CELL_SIZE / 2, y);
        ctx.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE / 2);
    } else {
        ctx.moveTo(x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        ctx.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE);
    }
    
    ctx.stroke();
    
    // Add texture with dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 3; i++) {
        const dotX = x + 3 + Math.random() * (CELL_SIZE - 6);
        const dotY = y + 3 + Math.random() * (CELL_SIZE - 6);
        ctx.beginPath();
        ctx.arc(dotX, dotY, 1, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Particle system for effects when eating fruit
function createParticles(x, y) {
    const particleCount = 10;
    const particleColors = ['#ff3333', '#ffcc00', '#ff3366', '#ffffff'];
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x * CELL_SIZE + CELL_SIZE / 2,
            y: y * CELL_SIZE + CELL_SIZE / 2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            radius: Math.random() * 3 + 1,
            color: particleColors[Math.floor(Math.random() * particleColors.length)],
            alpha: 1,
            life: 30 + Math.random() * 20
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        p.life--;
        
        if (p.life <= 0 || p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (let p of particles) {
        ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function handleKeyPress(e) {
    if (!gameRunning) {
        if (e.key === 'Enter') {
            startGame();
        }
        return;
    }
    
    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault(); // Prevent page scrolling
            setDirection('UP');
            break;
        case 'ArrowDown':
            e.preventDefault(); // Prevent page scrolling
            setDirection('DOWN');
            break;
        case 'ArrowLeft':
            e.preventDefault(); // Prevent page scrolling
            setDirection('LEFT');
            break;
        case 'ArrowRight':
            e.preventDefault(); // Prevent page scrolling
            setDirection('RIGHT');
            break;
    }
}

function setDirection(dir) {
    if (!gameRunning || gamePaused) return;
    
    switch (dir) {
        case 'UP':
            if (direction !== 'DOWN') {
                nextDirection = 'UP';
            }
            break;
        case 'DOWN':
            if (direction !== 'UP') {
                nextDirection = 'DOWN';
            }
            break;
        case 'LEFT':
            if (direction !== 'RIGHT') {
                nextDirection = 'LEFT';
            }
            break;
        case 'RIGHT':
            if (direction !== 'LEFT') {
                nextDirection = 'RIGHT';
            }
            break;
    }
}

function toggleSound() {
    soundEnabled = document.getElementById('soundToggle').checked;
}

function toggleMusic() {
    musicEnabled = document.getElementById('musicToggle').checked;
    toggleBackgroundMusic(gameRunning && !gamePaused && musicEnabled);
}

function gameOver() {
    gameRunning = false;
    clearInterval(gameInterval);
    playGameOverSound();
    
    // Stop background music
    toggleBackgroundMusic(false);
    
    // Show game over modal
    const modal = document.getElementById('gameOverModal');
    const finalScoreElement = document.getElementById('finalScore');
    finalScoreElement.textContent = score;
    
    // Focus on player name input
    setTimeout(() => {
        document.getElementById('playerName').focus();
    }, 500);
    
    modal.style.display = 'flex';
}

function handleSaveScore() {
    const playerName = document.getElementById('playerName').value.trim();
    
    if (playerName === '') {
        alert('Please enter your name!');
        return;
    }
    
    // Add to high scores
    const newScore = {
        name: playerName,
        score: score,
        date: new Date().toLocaleDateString()
    };
    
    highScores.push(newScore);
    
    // Sort high scores by score (descending)
    highScores.sort((a, b) => b.score - a.score);
    
    // Keep only top scores
    if (highScores.length > MAX_HIGH_SCORES) {
        highScores = highScores.slice(0, MAX_HIGH_SCORES);
    }
    
    // Save to local storage
    saveHighScores();
    
    // Update high score display
    displayHighScores();
    
    // Close modal
    document.getElementById('gameOverModal').style.display = 'none';
}

function loadHighScores() {
    const savedScores = localStorage.getItem('snakeHighScores');
    if (savedScores) {
        highScores = JSON.parse(savedScores);
    }
    
    displayHighScores();
}

function saveHighScores() {
    localStorage.setItem('snakeHighScores', JSON.stringify(highScores));
}

function displayHighScores() {
    const highScoreBoard = document.getElementById('highScoreBoard');
    highScoreBoard.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('div');
    headerRow.className = 'high-score-row header';
    
    const rankHeader = document.createElement('span');
    rankHeader.textContent = 'Rank';
    
    const nameHeader = document.createElement('span');
    nameHeader.textContent = 'Player';
    
    const scoreHeader = document.createElement('span');
    scoreHeader.textContent = 'Score';
    
    headerRow.appendChild(rankHeader);
    headerRow.appendChild(nameHeader);
    headerRow.appendChild(scoreHeader);
    
    highScoreBoard.appendChild(headerRow);
    
    // Display high scores
    if (highScores.length === 0) {
        const emptyRow = document.createElement('div');
        emptyRow.className = 'high-score-row empty';
        emptyRow.innerHTML = '<span></span><span>No scores yet</span><span></span>';
        highScoreBoard.appendChild(emptyRow);
    } else {
        highScores.forEach((entry, index) => {
            const row = document.createElement('div');
            row.className = 'high-score-row';
            
            // Add special classes for top 3
            if (index === 0) row.classList.add('top-1');
            if (index === 1) row.classList.add('top-2');
            if (index === 2) row.classList.add('top-3');
            
            const rankSpan = document.createElement('span');
            if (index === 0) rankSpan.innerHTML = '1 <span class="medal">🥇</span>';
            else if (index === 1) rankSpan.innerHTML = '2 <span class="medal">🥈</span>';
            else if (index === 2) rankSpan.innerHTML = '3 <span class="medal">🥉</span>';
            else rankSpan.textContent = index + 1;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = entry.name;
            
            const scoreSpan = document.createElement('span');
            scoreSpan.textContent = entry.score;
            
            row.appendChild(rankSpan);
            row.appendChild(nameSpan);
            row.appendChild(scoreSpan);
            
            highScoreBoard.appendChild(row);
        });
    }
}

// Initialize the game when the page loads
loadHighScores();