import { CONFIG, PANEL_STATE } from './config.js';
import { ChunkManager }        from './world/ChunkManager.js';
import { InputController }     from './core/Input.js';
import { getHeight }           from './world/Terrain.js';
import { WaterSystem }         from './world/WaterSystem.js';
import { DayNightSystem }      from './core/DayNightSystem.js';
import { Minimap }             from './core/Minimap.js';
import { HUD }                 from './core/HUD.js';
import { PanelUI }             from './core/PanelUI.js';

import {
    PlanetSystem,
    CameraConstraints,
    BedrockLayer,
    AtmosphereSystem,
} from './world/PlanetSystem.js';

// ============================================================
// 1. SCENE / RENDERER / CÂMERA
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 50, 250);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 0, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
renderer.domElement.id = 'world-canvas';

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(50, 100, 50);
sunLight.castShadow = true;
sunLight.shadow.camera.left   = -50;
sunLight.shadow.camera.right  =  50;
sunLight.shadow.camera.top    =  50;
sunLight.shadow.camera.bottom = -50;
sunLight.shadow.mapSize.width  = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

// ============================================================
// 2. SISTEMAS DO MUNDO
// ============================================================
const waterSystem = new WaterSystem(scene, sunLight);
waterSystem.createOcean();

const planetSystemInstance    = new PlanetSystem();
const bedrockLayerInstance    = new BedrockLayer(scene);
const atmosphereSystemInstance = new AtmosphereSystem(scene);

// Exposição global — ChunkManager precisa acessar
window.planetSystem = planetSystemInstance;
window.bedrockLayer = bedrockLayerInstance;

const cameraConstraints = new CameraConstraints(camera, planetSystemInstance);

// Aliases locais
const planetSystem    = planetSystemInstance;
const bedrockLayer    = bedrockLayerInstance;
const atmosphereSystem = atmosphereSystemInstance;

console.log('🌍 Sistema Planetário Inicializado');

// ============================================================
// 3. MÓDULOS CORE
// ============================================================
const dayNight = new DayNightSystem(scene, sunLight, ambientLight, atmosphereSystem);
const minimap  = new Minimap('minimap', CONFIG);
const hud      = new HUD(cameraConstraints, planetSystem);

// ============================================================
// 4. PLAYER / INPUT
// ============================================================
const PLAYER_HEIGHT = 2.0;
const GRAVITY       = 50.0;
const JUMP_FORCE    = 15.0;
const FLY_SPEED     = 20.0;

const chunkManager = new ChunkManager(scene, camera);
window.chunkManager = chunkManager;
const input = new InputController(renderer.domElement, camera);

// Spawn acima do terreno real
const spawnTerrainY = getHeight(camera.position.x, camera.position.z, chunkManager.seed);
camera.position.y = spawnTerrainY + PLAYER_HEIGHT + 0.1;

chunkManager.updateChunks(camera.position.x, camera.position.z);

// ============================================================
// 5. PAINEL UI
// ============================================================
const panel = new PanelUI(chunkManager, dayNight, planetSystem, camera);
panel.init();

// ============================================================
// 6. EVENTOS DE SISTEMA
// ============================================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let mouseX = 0, mouseY = 0;
let targetRotationY = 0, targetRotationX = 0;

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== renderer.domElement) return;
    mouseX += e.movementX;
    mouseY += e.movementY;
    targetRotationY = -mouseX * 0.002;
    targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, -mouseY * 0.002));
});

renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement) {
        mouseX = targetRotationY / -0.002;
        mouseY = targetRotationX / -0.002;
    }
});

// ============================================================
// 7. FUNÇÕES GLOBAIS (chamadas pelo HTML)
// ============================================================
window.regenerateWorld = () => {
    const raw     = parseInt(document.getElementById('seed-input').value);
    const newSeed = isNaN(raw) ? chunkManager.seed : raw;   // mantém seed atual se inválida
    document.getElementById('seed-input').value = newSeed;  // corrige o campo visualmente
    chunkManager.updateSeed(newSeed);
    chunkManager.clear();
    chunkManager.updateChunks(camera.position.x, camera.position.z);
};

window.toggleWireframe = () => chunkManager.toggleWireframe();

window.toggleFlightMode = () => {
    const isFlying = input.toggleFlightMode();
    const modeText = document.getElementById('flight-mode');
    const btn      = document.getElementById('flight-btn');
    if (modeText) modeText.textContent = isFlying ? 'Voo Livre' : 'Terrestre';
    if (btn) btn.classList.toggle('active', isFlying);
};

// ============================================================
// 8. LOOP PRINCIPAL
// ============================================================
const clock     = new THREE.Clock();
const velocity  = new THREE.Vector3();
const direction = new THREE.Vector3();
let velocityY   = 0;
let canJump     = false;

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Água
    waterSystem.update(delta);

    // Ciclo dia/noite
    dayNight.update(delta);

    // FPS counter
    hud.updateStats();

    // Movimento horizontal
    const moveSpeed = input.isFlying() ? FLY_SPEED : 10;
    const inputDir  = input.getMovementVector();
    direction.copy(inputDir);

    if (direction.length() > 0) {
        direction.normalize();
        const rotated = direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), targetRotationY);
        velocity.x = rotated.x * moveSpeed * delta;
        velocity.z = rotated.z * moveSpeed * delta;
        camera.position.x += velocity.x;
        camera.position.z += velocity.z;
    }

    // Física vertical
    if (input.isFlying()) {
        if (input.isGoingUp())   camera.position.y += FLY_SPEED * delta;
        if (input.isGoingDown()) camera.position.y -= FLY_SPEED * delta;
        velocityY = 0;
        canJump   = false;
        const floorH = getHeight(camera.position.x, camera.position.z, chunkManager.seed);
        if (camera.position.y < floorH + PLAYER_HEIGHT)
            camera.position.y = floorH + PLAYER_HEIGHT;
    } else {
        velocityY -= GRAVITY * delta;
        if (input.isJumping() && canJump) { velocityY = JUMP_FORCE; canJump = false; }
        camera.position.y += velocityY * delta;
        const terrH = getHeight(camera.position.x, camera.position.z, chunkManager.seed);
        if (camera.position.y < terrH + PLAYER_HEIGHT) {
            camera.position.y = terrH + PLAYER_HEIGHT;
            velocityY = 0;
            canJump   = true;
        }
    }

    // Limites planetários + HUD altitude
    const terrainHeight    = getHeight(camera.position.x, camera.position.z, chunkManager.seed);
    const constraintInfo   = cameraConstraints.enforceConstraints(camera.position, terrainHeight);
    hud.updateAltitude(terrainHeight, constraintInfo);

    // Rotação da câmera
    camera.rotation.order = 'YXZ';
    camera.rotation.y = targetRotationY;
    camera.rotation.x = targetRotationX;

    // Chunks
    const count = chunkManager.updateChunks(camera.position.x, camera.position.z);

    // Bedrock
    const pChunkX = Math.floor(camera.position.x / CONFIG.CHUNK_SIZE);
    const pChunkZ = Math.floor(camera.position.z / CONFIG.CHUNK_SIZE);
    bedrockLayer.cleanupDistantBedrock(pChunkX, pChunkZ, CONFIG.RENDER_DISTANCE);

    // Stats planeta + HUD posição
    hud.updatePlanetStats();
    hud.updateChunkCount(count);
    hud.updatePosition(camera.position.x, camera.position.y, camera.position.z);

    // Minimap
    minimap.update(camera.position.x, camera.position.z, chunkManager.seed, targetRotationY);

    renderer.render(scene, camera);
}

animate();

// Expõe para debug no console
window.floraSystem  = null;
window.faunaSystem  = null;
setTimeout(() => {
    if (chunkManager.floraSystem) window.floraSystem = chunkManager.floraSystem;
    if (chunkManager.faunaSystem) window.faunaSystem = chunkManager.faunaSystem;
}, 2000);
