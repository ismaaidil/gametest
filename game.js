// Game variables
let scene, camera, renderer;
let playerCar;
let obstacles = [];
let roadLines = [];
let score = 0;
let highScore = 0;
let gameSpeed = 0.5;
let gameRunning = false;
let laneWidth = 4;
let playerLane = 0; // -1 left, 0 center, 1 right
let animationId;
let obstacleSpawnTimer = 0;
let obstacleSpawnInterval = 80;

// Initialize the game
function init() {
    // Load high score from localStorage
    loadHighScore();
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, -10);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(20, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -50;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create road
    const roadGeometry = new THREE.PlaneGeometry(12, 200);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555,
        roughness: 0.9 
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    road.position.z = -50;
    road.receiveShadow = true;
    scene.add(road);

    // Create road lines
    for (let i = 0; i < 40; i++) {
        createRoadLine(i * 5);
    }

    // Create road side barriers
    createBarriers();

    // Create player car
    createPlayerCar();

    // Add trees/scenery
    createScenery();

    // Update high score display
    updateHighScoreDisplay();

    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', onWindowResize);

    // Start screen buttons
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    document.getElementById('homeButton').addEventListener('click', goToHomepage);
}

function createPlayerCar() {
    const carGroup = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    carGroup.add(body);

    // Car roof
    const roofGeometry = new THREE.BoxGeometry(1.6, 0.5, 2);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 1.15;
    roof.position.z = -0.3;
    roof.castShadow = true;
    carGroup.add(roof);

    // Windows
    const windowGeometry = new THREE.BoxGeometry(1.4, 0.4, 0.1);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.1
    });
    const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow.position.set(0, 1.15, 0.7);
    carGroup.add(frontWindow);
    
    const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    backWindow.position.set(0, 1.15, -1.3);
    carGroup.add(backWindow);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 32);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    
    const wheelPositions = [
        [-1.1, 0.2, 1.2],
        [1.1, 0.2, 1.2],
        [-1.1, 0.2, -1.2],
        [1.1, 0.2, -1.2]
    ];
    
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos[0], pos[1], pos[2]);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = true;
        carGroup.add(wheel);
    });

    // Headlights
    const lightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const lightMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    });
    const leftLight = new THREE.Mesh(lightGeometry, lightMaterial);
    leftLight.position.set(-0.6, 0.5, 2);
    carGroup.add(leftLight);
    
    const rightLight = new THREE.Mesh(lightGeometry, lightMaterial);
    rightLight.position.set(0.6, 0.5, 2);
    carGroup.add(rightLight);

    carGroup.position.set(0, 0, 8);
    scene.add(carGroup);
    playerCar = carGroup;
}

function createObstacle(lane) {
    const colors = [0xff6600, 0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    const obstacleGroup = new THREE.Group();

    // Random car-like obstacle
    const bodyGeometry = new THREE.BoxGeometry(1.8, 0.7, 3.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)]
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    obstacleGroup.add(body);

    const roofGeometry = new THREE.BoxGeometry(1.4, 0.4, 1.8);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 1.05;
    roof.castShadow = true;
    obstacleGroup.add(roof);

    obstacleGroup.position.set(lane * laneWidth, 0, -30);
    scene.add(obstacleGroup);
    obstacles.push(obstacleGroup);
}

function createRoadLine(z) {
    const lineGeometry = new THREE.BoxGeometry(0.2, 0.1, 3);
    const lineMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.3
    });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(0, 0.05, -z);
    scene.add(line);
    roadLines.push(line);
}

function createBarriers() {
    const barrierGeometry = new THREE.BoxGeometry(1, 1.5, 200);
    const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    
    const leftBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    leftBarrier.position.set(-7, 0.75, -50);
    leftBarrier.castShadow = true;
    leftBarrier.receiveShadow = true;
    scene.add(leftBarrier);
    
    const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    rightBarrier.position.set(7, 0.75, -50);
    rightBarrier.castShadow = true;
    rightBarrier.receiveShadow = true;
    scene.add(rightBarrier);
}

function createScenery() {
    const treeGeometry = new THREE.ConeGeometry(1, 3, 8);
    const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

    for (let i = 0; i < 30; i++) {
        const treeGroup = new THREE.Group();
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        const leaves = new THREE.Mesh(treeGeometry, treeMaterial);
        leaves.position.y = 3;
        leaves.castShadow = true;
        treeGroup.add(leaves);
        
        const side = Math.random() > 0.5 ? -10 : 10;
        treeGroup.position.set(side + (Math.random() - 0.5) * 5, 0, -Math.random() * 100);
        scene.add(treeGroup);
    }
}

function handleKeyDown(event) {
    if (!gameRunning) return;

    switch(event.key) {
        case 'ArrowLeft':
            if (playerLane > -1) {
                playerLane--;
            }
            break;
        case 'ArrowRight':
            if (playerLane < 1) {
                playerLane++;
            }
            break;
    }
}

function updatePlayerPosition() {
    const targetX = playerLane * laneWidth;
    playerCar.position.x += (targetX - playerCar.position.x) * 0.2;
}

function spawnObstacles() {
    obstacleSpawnTimer++;
    
    if (obstacleSpawnTimer >= obstacleSpawnInterval) {
        obstacleSpawnTimer = 0;
        
        // Random lane for obstacle
        const lane = Math.floor(Math.random() * 3) - 1;
        
        // Make sure we don't spawn too many obstacles in the same lane
        const obstaclesInLane = obstacles.filter(obs => 
            Math.abs(obs.position.x - lane * laneWidth) < 0.1 && obs.position.z < -10
        );
        
        if (obstaclesInLane.length < 2) {
            createObstacle(lane);
        }
    }
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].position.z += gameSpeed;
        
        // Remove obstacles that are behind the camera
        if (obstacles[i].position.z > 15) {
            scene.remove(obstacles[i]);
            obstacles.splice(i, 1);
            score += 10;
            updateScore();
        }
        
        // Check collision
        if (checkCollision(playerCar, obstacles[i])) {
            gameOver();
            return;
        }
    }
}

function checkCollision(car, obstacle) {
    const carBox = new THREE.Box3().setFromObject(car);
    const obstacleBox = new THREE.Box3().setFromObject(obstacle);
    
    // Add small margin for better gameplay feel
    carBox.expandByScalar(-0.3);
    obstacleBox.expandByScalar(-0.3);
    
    return carBox.intersectsBox(obstacleBox);
}

function updateRoadLines() {
    roadLines.forEach(line => {
        line.position.z += gameSpeed;
        if (line.position.z > 5) {
            line.position.z -= 100;
        }
    });
}

function updateScore() {
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('speedValue').textContent = Math.floor(gameSpeed * 100);
    
    // Update high score in real-time during game
    if (score > highScore) {
        highScore = score;
        document.getElementById('highScoreValue').textContent = highScore;
    }
}

function updateHighScoreDisplay() {
    document.getElementById('highScoreValue').textContent = highScore;
    document.getElementById('startHighScore').textContent = highScore;
}

function loadHighScore() {
    const savedHighScore = localStorage.getItem('racingGameHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
    }
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('racingGameHighScore', highScore.toString());
        return true; // New high score achieved
    }
    return false;
}

function increaseDifficulty() {
    gameSpeed += 0.0005;
    if (obstacleSpawnInterval > 30) {
        obstacleSpawnInterval -= 0.02;
    }
}

function animate() {
    if (!gameRunning) return;
    
    animationId = requestAnimationFrame(animate);
    
    updatePlayerPosition();
    spawnObstacles();
    updateObstacles();
    updateRoadLines();
    increaseDifficulty();
    
    // Slight camera follow effect
    camera.position.x += (playerCar.position.x * 0.5 - camera.position.x) * 0.05;
    camera.lookAt(playerCar.position.x * 0.5, 2, -10);
    
    renderer.render(scene, camera);
}

function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    gameRunning = true;
    score = 0;
    gameSpeed = 0.5;
    obstacleSpawnInterval = 80;
    obstacleSpawnTimer = 0;
    updateScore();
    updateHighScoreDisplay();
    animate();
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    const isNewHighScore = saveHighScore();
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalHighScore').textContent = highScore;
    
    // Show new high score message if achieved
    if (isNewHighScore) {
        document.getElementById('newHighScoreMessage').style.display = 'block';
    } else {
        document.getElementById('newHighScoreMessage').style.display = 'none';
    }
    
    document.getElementById('gameOverScreen').style.display = 'block';
}

function restartGame() {
    document.getElementById('gameOverScreen').style.display = 'none';
    
    // Clear all obstacles
    obstacles.forEach(obs => scene.remove(obs));
    obstacles = [];
    
    // Reset player
    playerLane = 0;
    playerCar.position.set(0, 0, 8);
    camera.position.set(0, 8, 15);
    
    startGame();
}

function goToHomepage() {
    // This will reload the page, going back to the start screen
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
    
    // Clear all obstacles
    obstacles.forEach(obs => scene.remove(obs));
    obstacles = [];
    
    // Reset player
    playerLane = 0;
    playerCar.position.set(0, 0, 8);
    camera.position.set(0, 8, 15);
    
    // Reset game state
    score = 0;
    gameSpeed = 0.5;
    obstacleSpawnInterval = 80;
    obstacleSpawnTimer = 0;
    updateScore();
    updateHighScoreDisplay();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize the game when the page loads
window.onload = init;