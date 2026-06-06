import { PANEL_STATE } from '../config.js';
import { getHeight } from './Terrain.js';

// ===================================================================
// 🌍 CONFIGURAÇÃO DO PLANETA
// ===================================================================
export const PLANET_CONFIG = {
    // Identidade do Planeta
    name: "Terra-Procedural",
    version: "1.0.0",
    
    // Escala Real (em metros)
    RADIUS: 6371000, // 6371 km (raio da Terra)
    
    // Limites Verticais (em metros, relativos ao nível do mar Y=0)
    HEIGHT_LIMITS: {
        MAX_MOUNTAIN: 8848,      // Monte Everest
        MAX_ATMOSPHERE: 15000,   // Limite superior da câmera
        SEA_LEVEL: 0,            // Nível do mar (referência)
        MAX_OCEAN_DEPTH: -11034, // Fossa das Marianas
        BEDROCK: -150            // Camada de rocha impenetrável
    },
    
    // Escala de Renderização (1 unidade Three.js = X metros)
    WORLD_SCALE: 1, // 1:1 (1 unidade = 1 metro)
    
    // Sistema de Chunks
    CHUNK_METADATA: {
        saveChunkData: true,     // Salvar dados ao gerar chunks
        compressionEnabled: true, // Compactar dados ao salvar
        autoSaveInterval: 30000   // Auto-salvar a cada 30 segundos
    }
};

// ===================================================================
// 🌍 CLASSE: PLANET SYSTEM
// ===================================================================
export class PlanetSystem {
    constructor() {
        this.planetName = PLANET_CONFIG.name;
        this.chunkRegistry = new Map(); // Registro de chunks gerados
        this.heightStats = {
            minHeight: Infinity,
            maxHeight: -Infinity,
            avgHeight: 0,
            totalSamples: 0
        };
    }

    // ===================================================================
    // 📊 REGISTRO DE CHUNK (Metadados)
    // ===================================================================
	registerChunk(chunkX, chunkZ, meshData, biomeData, floraData = []) {
        const chunkId = `${chunkX}_${chunkZ}`;
        
        // Extrair estatísticas de altura do chunk
        const heights = meshData.vertices
            .filter((_, i) => i % 3 === 1) // Apenas coordenadas Y
            .map(y => y);
        
        const chunkMinHeight = Math.min(...heights);
        const chunkMaxHeight = Math.max(...heights);
        
        // Atualizar estatísticas globais
        this.heightStats.minHeight = Math.min(this.heightStats.minHeight, chunkMinHeight);
        this.heightStats.maxHeight = Math.max(this.heightStats.maxHeight, chunkMaxHeight);
        this.heightStats.totalSamples += heights.length;
        
        // Criar metadados do chunk
		const chunkMetadata = {
            planetName: this.planetName,
            chunkId: chunkId,
            coordinates: { x: chunkX, z: chunkZ },
            heightRange: {
                min: chunkMinHeight,
                max: chunkMaxHeight,
                avg: heights.reduce((a, b) => a + b, 0) / heights.length
            },
			
			heightMap: heights,
            biomes: [...new Set(biomeData)],
            
            // ✅ NOVO CAMPO: FLORA
            flora: floraData, // Agora o JSON terá um array com todas as árvores!
            
            timestamp: new Date().toISOString(),
            seed: PANEL_STATE.seed,
            version: PLANET_CONFIG.version
        };
        
        this.chunkRegistry.set(chunkId, chunkMetadata);
        return chunkMetadata;
    }
	
    // ===================================================================
    // 💾 SALVAR PLANETA (JSON Exportável)
    // ===================================================================
    exportPlanetData() {
        const planetData = {
            metadata: {
                name: this.planetName,
                seed: PANEL_STATE.seed,
                totalChunks: this.chunkRegistry.size,
                heightStats: this.heightStats,
                generatedAt: new Date().toISOString(),
                version: PLANET_CONFIG.version
            },
            chunks: Array.from(this.chunkRegistry.entries()).map(([id, data]) => ({
                id,
                ...data
            })),
            settings: {
                sliders: { ...PANEL_STATE.sliders },
                selected: {
                    relevo: Array.from(PANEL_STATE.selected.relevo),
                    agua: Array.from(PANEL_STATE.selected.agua),
                    veg: Array.from(PANEL_STATE.selected.veg)
                },
                cycle: PANEL_STATE.cycle
            }
        };
        
        return planetData;
    }

// ===================================================================
    // 📥 IMPORTAR PLANETA (Carregar de JSON)
    // ===================================================================
    importPlanetData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            // Validar estrutura
            if (!data.metadata || !data.chunks) {
                throw new Error("Estrutura de dados inválida");
            }
            
            // Restaurar metadados
            this.planetName = data.metadata.name;
            this.heightStats = data.metadata.heightStats;
            
            // Restaurar chunks
            this.chunkRegistry.clear();
            data.chunks.forEach(chunk => {
                this.chunkRegistry.set(chunk.id, chunk);
            });
            
            console.log(`✅ Planeta "${this.planetName}" carregado com ${data.chunks.length} chunks`);
            
            return {
                success: true,
                planetName: this.planetName,
                chunksLoaded: data.chunks.length,
                settings: data.settings, // <--- VÍRGULA ADICIONADA AQUI
                seed: data.metadata.seed // ✅ Agora a seed será passada corretamente
            };
            
        } catch (error) {
            console.error("❌ Erro ao importar planeta:", error);
            return { success: false, error: error.message };
        }
    }

    // ===================================================================
    // 💾 DOWNLOAD AUTOMÁTICO (Botão de Exportar)
    // ===================================================================
    downloadPlanetFile() {
        const data = this.exportPlanetData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.planetName}_${Date.now()}.planet.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`📦 Planeta "${this.planetName}" exportado com sucesso!`);
    }

    // ===================================================================
    // 📛 RENOMEAR PLANETA
    // ===================================================================
    renamePlanet(newName) {
        if (!newName || newName.trim() === '') {
            console.error("❌ Nome inválido");
            return false;
        }
        
        this.planetName = newName.trim();
        console.log(`✏️ Planeta renomeado para: "${this.planetName}"`);
        return true;
    }

    // ===================================================================
    // 📊 ESTATÍSTICAS DO PLANETA
    // ===================================================================
    getPlanetStats() {
        const chunks = Array.from(this.chunkRegistry.values());
        
        return {
            name: this.planetName,
            totalChunks: chunks.length,
            heightRange: {
                min: this.heightStats.minHeight.toFixed(2),
                max: this.heightStats.maxHeight.toFixed(2),
                span: (this.heightStats.maxHeight - this.heightStats.minHeight).toFixed(2)
            },
            biomes: this.getUniqueBiomes(chunks),
            coverage: this.calculateCoverage(chunks),
            memoryEstimate: this.estimateMemoryUsage()
        };
    }

    getUniqueBiomes(chunks) {
        const allBiomes = chunks.flatMap(c => c.biomes);
        return [...new Set(allBiomes)];
    }

    calculateCoverage(chunks) {
        // Área aproximada coberta (em km²)
        const chunkSize = 32; // CONFIG.CHUNK_SIZE
        const areaPerChunk = (chunkSize * chunkSize) / 1000000; // m² → km²
        return (chunks.length * areaPerChunk).toFixed(2);
    }

    estimateMemoryUsage() {
        const json = JSON.stringify(this.exportPlanetData());
        const sizeInBytes = new Blob([json]).size;
        return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    }
}

// ===================================================================
// 🎮 SISTEMA DE LIMITES DE CÂMERA
// ===================================================================
export class CameraConstraints {
    constructor(camera, planetSystem) {
        this.camera = camera;
        this.planet = planetSystem;
    }

    // Aplicar limites a cada frame
    enforceConstraints(playerPosition, terrainHeight) {
        const limits = PLANET_CONFIG.HEIGHT_LIMITS;
        
        // 1. LIMITE SUPERIOR (Atmosfera)
        if (this.camera.position.y > limits.MAX_ATMOSPHERE) {
            this.camera.position.y = limits.MAX_ATMOSPHERE;
            console.warn("⚠️ Limite superior da atmosfera atingido");
        }
        
        // 2. LIMITE INFERIOR (Bedrock)
        const bedrock = Math.max(terrainHeight + limits.BEDROCK, limits.BEDROCK);
        if (this.camera.position.y < bedrock) {
            this.camera.position.y = bedrock;
            console.warn("⚠️ Camada de rocha impenetrável atingida");
        }
        
        // 3. COLISÃO COM TERRENO (Modo Voo)
        const minDistanceFromTerrain = 1.5; // 1.5 metros acima do chão
        const minAllowedHeight = terrainHeight + minDistanceFromTerrain;
        
        if (this.camera.position.y < minAllowedHeight) {
            this.camera.position.y = minAllowedHeight;
        }
        
        return {
            isAtMaxHeight: this.camera.position.y >= limits.MAX_ATMOSPHERE,
            isAtBedrock: this.camera.position.y <= bedrock,
            isAboveTerrain: this.camera.position.y > terrainHeight,
            currentAltitude: this.camera.position.y - limits.SEA_LEVEL,
            depthBelowSea: Math.max(0, limits.SEA_LEVEL - terrainHeight)
        };
    }

    // Verificar se posição é válida antes de mover
    isPositionValid(x, y, z, terrainHeight) {
        const limits = PLANET_CONFIG.HEIGHT_LIMITS;
        const bedrock = Math.max(terrainHeight + limits.BEDROCK, limits.BEDROCK);
        
        return (
            y >= bedrock &&
            y <= limits.MAX_ATMOSPHERE &&
            y >= terrainHeight + 1.5
        );
    }

    // HUD de Debug (para mostrar ao jogador)
    getDebugInfo(terrainHeight) {
        const altitude = this.camera.position.y - PLANET_CONFIG.HEIGHT_LIMITS.SEA_LEVEL;
        const depth = Math.max(0, PLANET_CONFIG.HEIGHT_LIMITS.SEA_LEVEL - terrainHeight);
        
        return {
            altitude: `${altitude.toFixed(1)}m`,
            depth: depth > 0 ? `${depth.toFixed(1)}m` : "0m",
            terrainHeight: `${terrainHeight.toFixed(1)}m`,
            distanceToSpace: `${(PLANET_CONFIG.HEIGHT_LIMITS.MAX_ATMOSPHERE - this.camera.position.y).toFixed(0)}m`,
            distanceToBedrock: `${(this.camera.position.y - (terrainHeight + PLANET_CONFIG.HEIGHT_LIMITS.BEDROCK)).toFixed(0)}m`
        };
    }
}

// ===================================================================
// 🌱 SISTEMA DE CAMADA DE TERRA (Bedrock Visual)
// ===================================================================
export class BedrockLayer {
    constructor(scene) {
        this.scene = scene;
        this.bedrockMeshes = new Map();
    }

    // Adicionar camada de terra abaixo do chunk
    addBedrockToChunk(chunkX, chunkZ, minHeight, chunkSize = 32) {
        const key = `bedrock_${chunkX}_${chunkZ}`;
        
        // Remover se já existir
        if (this.bedrockMeshes.has(key)) {
            this.scene.remove(this.bedrockMeshes.get(key));
        }
        
        // Geometria: Plano espesso abaixo do terreno
        const thickness = Math.abs(PLANET_CONFIG.HEIGHT_LIMITS.BEDROCK);
        const bedrockGeo = new THREE.BoxGeometry(
            chunkSize,
            thickness,
            chunkSize
        );
        
        // Material: Rocha escura com textura procedural
        const bedrockMat = new THREE.MeshLambertMaterial({
            color: 0x2a2a2a,
            wireframe: false
        });
        
        const bedrock = new THREE.Mesh(bedrockGeo, bedrockMat);
        
        // Posicionar abaixo do ponto mais baixo do chunk
        bedrock.position.set(
            chunkX * chunkSize,
            minHeight + PLANET_CONFIG.HEIGHT_LIMITS.BEDROCK / 2,
            chunkZ * chunkSize
        );
        
        bedrock.receiveShadow = true;
        this.scene.add(bedrock);
        this.bedrockMeshes.set(key, bedrock);
        
        return bedrock;
    }

    // Limpar bedrocks fora do alcance
    cleanupDistantBedrock(playerChunkX, playerChunkZ, renderDistance) {
        this.bedrockMeshes.forEach((mesh, key) => {
            const [_, x, z] = key.split('_');
            const dx = Math.abs(parseInt(x) - playerChunkX);
            const dz = Math.abs(parseInt(z) - playerChunkZ);
            
            if (dx > renderDistance + 1 || dz > renderDistance + 1) {
                this.scene.remove(mesh);
                this.bedrockMeshes.delete(key);
            }
        });
    }

    dispose() {
        this.bedrockMeshes.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.material.dispose();
            this.scene.remove(mesh);
        });
        this.bedrockMeshes.clear();
    }
}

// ===================================================================
// 🎨 SISTEMA DE ATMOSFERA 2.0 (Dinâmica + Estrelas)
// ===================================================================
export class AtmosphereSystem {
    constructor(scene) {
        this.scene = scene;
        this.skyDome = null;
        this.stars = null;
        this.sunPosition = new THREE.Vector3();
        
        this.createAtmosphere();
        this.createStars();
    }

    createAtmosphere() {
        const skyGeo = new THREE.SphereGeometry(PLANET_CONFIG.HEIGHT_LIMITS.MAX_ATMOSPHERE * 1.5, 64, 64);
        
        // Shader melhorado com "Sun Glow" (brilho ao redor do sol)
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077be) },
                bottomColor: { value: new THREE.Color(0x89cff0) },
                offset: { value: 33 },
                exponent: { value: 0.6 },
                sunPosition: { value: new THREE.Vector3(0, 100, 0) }, // Posição do sol para o brilho
                sunIntensity: { value: 1.0 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                uniform vec3 sunPosition;
                uniform float sunIntensity;
                varying vec3 vWorldPosition;
                
                void main() {
                    // Gradiente vertical (Horizonte -> Zenite)
                    float h = normalize(vWorldPosition + offset).y;
                    vec3 skyColor = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
                    
                    // Cálculo do Brilho do Sol (Sun Glow)
                    vec3 sunDir = normalize(sunPosition);
                    vec3 viewDir = normalize(vWorldPosition);
                    float sunDot = dot(sunDir, viewDir);
                    
                    // Halo solar (mais intenso perto do sol)
                    float sunHalo = pow(max(sunDot, 0.0), 40.0) * 0.5 * sunIntensity;
                    
                    gl_FragColor = vec4(skyColor + vec3(sunHalo), 1.0);
                }
            `,
            side: THREE.BackSide,
            depthWrite: false // Importante para renderizar atrás de tudo
        });
        
        this.skyDome = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.skyDome);
    }

    createStars() {
        // Cria 3000 estrelas
        const starGeo = new THREE.BufferGeometry();
        const starCount = 3000;
        const posArray = new Float32Array(starCount * 3);
        const sizeArray = new Float32Array(starCount); // Tamanhos variados
        
        for(let i = 0; i < starCount * 3; i+=3) {
            // Distribuição esférica
            const r = PLANET_CONFIG.HEIGHT_LIMITS.MAX_ATMOSPHERE * 1.4; // Um pouco menor que o skyDome
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            posArray[i] = r * Math.sin(phi) * Math.cos(theta);
            posArray[i+1] = r * Math.sin(phi) * Math.sin(theta);
            posArray[i+2] = r * Math.cos(phi);
            
            // Tamanho aleatório para cintilação fake
            sizeArray[i/3] = Math.random() * 2.0; 
        }
        
        starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        starGeo.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));
        
        // Shader simples para estrelas que somem de dia
        const starMat = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 80, // Tamanho base (ajustado pela distância)
            transparent: true,
            opacity: 0.0, // Começa invisível
            sizeAttenuation: true
        });

        this.stars = new THREE.Points(starGeo, starMat);
        this.scene.add(this.stars);
    }

    update(sunPos, timeOfDay) { // 0.0 a 1.0 (Meio dia = 0.5)
        if (!this.skyDome) return;

        // 1. Atualizar posição do sol no shader
        this.skyDome.material.uniforms.sunPosition.value.copy(sunPos);
        
        // 2. Rotação Lenta das Estrelas
        if (this.stars) {
            this.stars.rotation.y += 0.0002; // Rotação da galáxia
            
            // 3. Opacidade das Estrelas (Surgem à noite)
            // Visíveis quando o sol está baixo (y < 0)
            const starVisibility = Math.max(0, -sunPos.y / 1000); 
            this.stars.material.opacity = Math.min(1.0, starVisibility * 3);
        }

        // 4. Interpolação de Cores do Céu (Horizonte Realista)
        const colors = this.getSkyColors(sunPos.y);
        
        this.skyDome.material.uniforms.topColor.value.copy(colors.top);
        this.skyDome.material.uniforms.bottomColor.value.copy(colors.bottom);
        this.skyDome.material.uniforms.sunIntensity.value = colors.intensity;
        
        return colors.bottom; // Retorna a cor do horizonte para o Fog
    }

    getSkyColors(sunY) {
        // Definição de Paletas
        const PALETTE = {
            day:    { top: new THREE.Color(0x0077be), bottom: new THREE.Color(0x89cff0), i: 1.0 },
            sunset: { top: new THREE.Color(0x4a148c), bottom: new THREE.Color(0xff6f00), i: 0.8 },
            night:  { top: new THREE.Color(0x000000), bottom: new THREE.Color(0x0a0a1a), i: 0.0 },
        };

        let result = { top: new THREE.Color(), bottom: new THREE.Color(), intensity: 1 };
        
        if (sunY > 200) { // Dia
            return PALETTE.day;
        } else if (sunY > -200) { // Crepúsculo (Transição)
            const t = (200 - sunY) / 400; // 0 a 1 durante a transição
            result.top.lerpColors(PALETTE.day.top, PALETTE.night.top, t);
            result.bottom.lerpColors(PALETTE.day.bottom, PALETTE.night.bottom, t);
            
            // Adicionar laranja extra no horizonte durante o por do sol
            if (t > 0.2 && t < 0.8) {
                result.bottom.lerp(PALETTE.sunset.bottom, 0.5); 
                result.top.lerp(PALETTE.sunset.top, 0.2);
            }
            
            result.intensity = 1.0 - t;
            return result;
        } else { // Noite
            return PALETTE.night;
        }
    }

    dispose() {
        if (this.skyDome) { this.scene.remove(this.skyDome); this.skyDome.geometry.dispose(); }
        if (this.stars) { this.scene.remove(this.stars); this.stars.geometry.dispose(); }
    }
}
