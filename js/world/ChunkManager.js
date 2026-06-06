// ===================================================================
// ChunkManager.js
// ===================================================================

import { CONFIG } from '../config.js';
import { getHeight, getBiome, getMoisture } from './Terrain.js';
import { fbm } from '../utils/MathUtils.js';
import { FloraSystem } from './flora/FloraSystem.js';
import { FaunaSystem } from './fauna/FaunaSystem.js';

// Mapa de cores de bioma — definido UMA VEZ, fora de qualquer loop
const BIOME_COLORS = {
    'water':      CONFIG.COLORS.WATER,
    'plains':     CONFIG.COLORS.PLAINS,
    'hills':      CONFIG.COLORS.HILLS,
    'mountains':  CONFIG.COLORS.MOUNTAINS,
    'snow':       CONFIG.COLORS.SNOW,
    'desert':     CONFIG.COLORS.DESERT,
    'jungle':     CONFIG.COLORS.JUNGLE,
    'forest':     CONFIG.COLORS.FOREST,
    'tundra':     CONFIG.COLORS.TUNDRA,
    'corruption': CONFIG.COLORS.CORRUPTION,
    'crimson':    CONFIG.COLORS.CRIMSON,
    'hallow':     CONFIG.COLORS.HALLOW,
    'mushroom':   CONFIG.COLORS.MUSHROOM,
    'lava':       CONFIG.COLORS.LAVA,
    'honey':      CONFIG.COLORS.HONEY
};

export class ChunkManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.chunks = new Map();
        this.seed = CONFIG.SEED;
        this.wireframeMode = false;
        
        this.frustum = new THREE.Frustum();
        this.cameraViewProjectionMatrix = new THREE.Matrix4();
        
        this.floraSystem = new FloraSystem(this.scene, this.seed);
        this.faunaSystem = new FaunaSystem(this.seed);
        
        this.heightCache = new Map();
        this.MAX_CACHE_SIZE = 50000;

        // Objetos reutilizáveis — evitam alocações dentro dos loops de vértice
        this._normalVec = new THREE.Vector3();
        this._colorObj  = new THREE.Color();
        
        console.log('🗺️ ChunkManager inicializado');
    }

    getLODForRing(ring) {
        if (ring <= 2) return 64;
        if (ring <= 4) return 32;
        if (ring <= 6) return 16;
        return 8;
    }

    getCachedHeight(x, z) {
        // Chave numérica: multiplica por 2 (delta mínimo é 0.5) → inteiros puros
        const key = (Math.round(x * 2) * 1000000) + Math.round(z * 2);
        if (!this.heightCache.has(key)) {
            if (this.heightCache.size >= this.MAX_CACHE_SIZE) {
                const evictCount = Math.floor(this.MAX_CACHE_SIZE / 2);
                const keys = this.heightCache.keys();
                for (let i = 0; i < evictCount; i++) {
                    this.heightCache.delete(keys.next().value);
                }
            }
            this.heightCache.set(key, getHeight(x, z, this.seed));
        }
        return this.heightCache.get(key);
    }

    // Libera geometria e material da GPU antes de remover o chunk da cena
    disposeChunk(chunk) {
        this.scene.remove(chunk.group);
        chunk.group.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                Array.isArray(child.material)
                    ? child.material.forEach(m => m.dispose())
                    : child.material.dispose();
            }
        });
    }

    getGlobalVertexPosition(localX, localZ, chunkX, chunkZ) {
        // Removido 'rgn' daqui
        const normalizedX = (localX + CONFIG.CHUNK_SIZE / 2) / CONFIG.CHUNK_SIZE;
        const normalizedZ = (localZ + CONFIG.CHUNK_SIZE / 2) / CONFIG.CHUNK_SIZE;
        
        const worldX = chunkX * CONFIG.CHUNK_SIZE + normalizedX * CONFIG.CHUNK_SIZE - CONFIG.CHUNK_SIZE / 2;
        const worldZ = chunkZ * CONFIG.CHUNK_SIZE + normalizedZ * CONFIG.CHUNK_SIZE - CONFIG.CHUNK_SIZE / 2;
        
        return { worldX, worldZ };
    }

    updateChunks(playerX, playerZ) {
        const playerChunkX = Math.floor(playerX / CONFIG.CHUNK_SIZE);
        const playerChunkZ = Math.floor(playerZ / CONFIG.CHUNK_SIZE);

        this.camera.updateMatrixWorld();
        this.cameraViewProjectionMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix);

        for (let x = -CONFIG.RENDER_DISTANCE; x <= CONFIG.RENDER_DISTANCE; x++) {
            for (let z = -CONFIG.RENDER_DISTANCE; z <= CONFIG.RENDER_DISTANCE; z++) {
                const chunkX = playerChunkX + x;
                const chunkZ = playerChunkZ + z;
                
                const ring = Math.max(Math.abs(x), Math.abs(z));
                const resolution = this.getLODForRing(ring);
                
                // Removido 'rgn' daqui
                this.createOrUpdateChunk(chunkX, chunkZ, resolution);
            }
        }

        this.chunks.forEach((chunk, key) => {
            const dx = Math.abs(chunk.chunkX - playerChunkX);
            const dz = Math.abs(chunk.chunkZ - playerChunkZ);
            
            if (dx > CONFIG.RENDER_DISTANCE + 1 || dz > CONFIG.RENDER_DISTANCE + 1) {
                this.disposeChunk(chunk);
                this.chunks.delete(key);
            } else {
                this.updateChunkVisibility(chunk);
            }
        });
        
        this.faunaSystem.cullDistantMobs(playerChunkX, playerChunkZ, CONFIG.RENDER_DISTANCE);
        
        return this.chunks.size;
    }

    createOrUpdateChunk(chunkX, chunkZ, desiredResolution) {
        const key = `${chunkX},${chunkZ}`;
        
        if (this.chunks.has(key)) {
            const existing = this.chunks.get(key);
            if (existing.resolution !== desiredResolution) {
                this.disposeChunk(existing);
                this.chunks.delete(key);
            } else {
                return;
            }
        }

        const group = new THREE.Group();
        
        const geometry = new THREE.PlaneGeometry(
            CONFIG.CHUNK_SIZE, 
            CONFIG.CHUNK_SIZE, 
            desiredResolution - 1, 
            desiredResolution - 1
        );

        geometry.rotateX(-Math.PI / 2);
        
        const vertices = geometry.attributes.position.array;
        const normals = new Float32Array(vertices.length);
        const colors = [];
        
        const delta = 0.5;
		
        let floraData = [];
        if (desiredResolution >= 32) {
            // ✅ CORRIGIDO: Não passa 'rgn' aqui. O FloraSystem cria o próprio RNG.
            floraData = this.floraSystem.populateChunk(group, chunkX, chunkZ, desiredResolution);
        }

        for (let i = 0; i < vertices.length; i += 3) {
            const localX = vertices[i];
            const localZ = vertices[i + 2];
            
            const worldX = localX + chunkX * CONFIG.CHUNK_SIZE;
            const worldZ = localZ + chunkZ * CONFIG.CHUNK_SIZE;
            
            const height = this.getCachedHeight(worldX, worldZ);
            vertices[i + 1] = height;

            const hL = this.getCachedHeight(worldX - delta, worldZ);
            const hR = this.getCachedHeight(worldX + delta, worldZ);
            const hD = this.getCachedHeight(worldX, worldZ - delta);
            const hU = this.getCachedHeight(worldX, worldZ + delta);

            // Reutiliza o mesmo Vector3 — sem alocação por vértice
            this._normalVec.set(hL - hR, 2 * delta, hD - hU).normalize();
            normals[i]     = this._normalVec.x;
            normals[i + 1] = this._normalVec.y;
            normals[i + 2] = this._normalVec.z;

            const moisture = getMoisture(worldX, worldZ, this.seed);
            const biome = getBiome(height, moisture, this.seed);

            // Reutiliza o mesmo Color e usa BIOME_COLORS definido fora do loop
            this._colorObj.setHex(BIOME_COLORS[biome] ?? CONFIG.COLORS.PLAINS);

            const variation = (fbm(worldX, worldZ, this.seed + 777, 2) - 0.5) * 0.15;
            this._colorObj.r = Math.max(0, Math.min(1, this._colorObj.r + variation));
            this._colorObj.g = Math.max(0, Math.min(1, this._colorObj.g + variation));
            this._colorObj.b = Math.max(0, Math.min(1, this._colorObj.b + variation));

            colors.push(this._colorObj.r, this._colorObj.g, this._colorObj.b);
        }
        
        this.addChunkSkirts(geometry, chunkX, chunkZ, desiredResolution);
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        
        const material = new THREE.MeshLambertMaterial({ 
            vertexColors: true,
            wireframe: this.wireframeMode
        });
        const terrain = new THREE.Mesh(geometry, material);
        terrain.receiveShadow = true;
        terrain.castShadow = true;
        group.add(terrain);
        
        group.position.set(chunkX * CONFIG.CHUNK_SIZE, 0, chunkZ * CONFIG.CHUNK_SIZE);
        
        const bbox = new THREE.Box3().setFromObject(group);
        
        this.scene.add(group);
        this.chunks.set(key, { 
            group, 
            chunkX, 
            chunkZ, 
            resolution: desiredResolution,
            bbox: bbox
        });
        
        if (window.planetSystem) {
            const biomeData = [];
            for (let i = 0; i < colors.length; i += 3) {
                const idx = Math.floor((i / 3) * 3);
                const localX = vertices[idx];
                const localZ = vertices[idx + 2];
                const worldX = localX + chunkX * CONFIG.CHUNK_SIZE;
                const worldZ = localZ + chunkZ * CONFIG.CHUNK_SIZE;
                const height = vertices[idx + 1];
                const moisture = getMoisture(worldX, worldZ, this.seed);
                biomeData.push(getBiome(height, moisture, this.seed));
            }
            
            window.planetSystem.registerChunk(
                chunkX, 
                chunkZ, 
                { vertices }, 
                biomeData,
                floraData
            );
            
            const heights = [];
            for (let i = 1; i < vertices.length; i += 3) {
                heights.push(vertices[i]);
            }
            const minHeight = Math.min(...heights);
            
            if (window.bedrockLayer) {
                window.bedrockLayer.addBedrockToChunk(chunkX, chunkZ, minHeight, CONFIG.CHUNK_SIZE);
            }
		}
	}	
	
    addChunkSkirts(geometry, chunkX, chunkZ, resolution) {
        const vertices = geometry.attributes.position.array;
        const size = Math.sqrt(vertices.length / 3);
        const skirtDepth = 10;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const localIndex = i / 3;
            const row = Math.floor(localIndex / size);
            const col = localIndex % size;
            const isEdge = (row === 0 || row === size - 1 || col === 0 || col === size - 1);
            
            if (isEdge) {
                const currentHeight = vertices[i + 1];
                const neighborLODs = this.getNeighborLODs(chunkX, chunkZ);
                const hasDifferentLOD = neighborLODs.some(lod => lod !== resolution);
                
                if (hasDifferentLOD) {
                    vertices[i + 1] = Math.min(currentHeight, currentHeight - skirtDepth);
                }
            }
        }
    }

    getNeighborLODs(chunkX, chunkZ) {
        const neighbors = [
            [chunkX - 1, chunkZ],
            [chunkX + 1, chunkZ],
            [chunkX, chunkZ - 1],
            [chunkX, chunkZ + 1]
        ];
        
        return neighbors.map(([x, z]) => {
            const key = `${x},${z}`;
            return this.chunks.has(key) ? this.chunks.get(key).resolution : null;
        }).filter(lod => lod !== null);
    }

    updateChunkVisibility(chunk) {
        const isVisible = this.frustum.intersectsBox(chunk.bbox);
        chunk.group.visible = isVisible;
    }

    update(deltaTime, playerPosition) {
        this.faunaSystem.update(deltaTime, playerPosition);
    }

    clear() {
        this.chunks.forEach(chunk => this.disposeChunk(chunk));
        this.chunks.clear();
        this.faunaSystem.clearAllMobs();
        this.heightCache.clear();
    }
    
    toggleWireframe() {
        this.wireframeMode = !this.wireframeMode;
        this.chunks.forEach(chunk => {
            chunk.group.children.forEach(child => {
                if (child.material) {
                    child.material.wireframe = this.wireframeMode;
                }
            });
        });
    }

    updateSeed(newSeed) {
        this.seed = newSeed;
        this.floraSystem.updateSeed(newSeed);
        this.faunaSystem.updateSeed(newSeed);
        this.heightCache.clear();
        console.log(`🗺️ ChunkManager: Seed atualizada para ${newSeed}`);
    }

    getStats() {
        return {
            totalChunks: this.chunks.size,
            cachedHeights: this.heightCache.size,
            floraStats: this.floraSystem.getStats(),
            faunaStats: this.faunaSystem.getStats()
        };
    }

    logStats() {
        console.log('🗺️ ChunkManager Stats:', this.getStats());
    }

    enableOptimizationMode() {
        this.floraSystem.enableInstancedMode();
        console.log('🚀 ChunkManager: Modo de otimização ATIVADO');
    }

    dispose() {
        this.clear();
        this.floraSystem.dispose();
        this.faunaSystem.dispose();
        console.log('🗺️ ChunkManager: Recursos liberados');
    }
}