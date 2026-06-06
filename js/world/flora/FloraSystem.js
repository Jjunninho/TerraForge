// ===================================================================
// FloraSystem.js - VERSÃO CORRIGIDA (Sem erro de rgn/rng)
// ===================================================================

import { PANEL_STATE } from '../../config.js';
import { getHeight, getBiome, getMoisture } from '../Terrain.js';
import { FloraUtils } from '../../utils/FloraUtils.js';
import { Random } from '../../utils/MathUtils.js';

export class FloraSystem {
    constructor(scene, seed) {
        this.scene = scene;
        this.seed = seed;
        this.instancedMode = false;
        this.floraObjects = [];
        this.maxInstances = 5000;
        this.instances = {};
        this.instanceCounts = {};
        this.geometryCache = {};
        this.materialCache = {};
        this.plantData = { pinheiro: null, carvalho: null, macieira: null };
        this.assetsLoaded = false;
        
        this._initializeBasicGeometries();
        this._initializeMaterials();
        this._loadPlantAssets();
        
        console.log('🌳 FloraSystem inicializado');
    }

	_initializeBasicGeometries() {
    // --- ORIGINAIS (Essenciais) ---
    this.geometryCache.treeTrunk = new THREE.CylinderGeometry(0.2, 0.25, 2, 6);
    this.geometryCache.treeLeaves = new THREE.ConeGeometry(1.2, 2.5, 8);
    this.geometryCache.rock = new THREE.DodecahedronGeometry(0.8, 0); // Mais orgânico que esfera
    this.geometryCache.cactus = new THREE.CylinderGeometry(0.25, 0.3, 2.5, 8);
    
    // ✅ NOVAS GEOMETRIAS REALISTAS
    
    // ==============================================
    // 1. ARBUSTO (Moita orgânica e natural)
    // ==============================================
    const bushGeo = new THREE.BufferGeometry();
    // Criar 3-4 esferas pequenas sobrepostas para formar moita irregular
    const spheres = [];
    const sphereCount = 4;
    const basePositions = [];
    const baseNormals = [];
    const baseColors = [];
    const baseIndices = [];
    let vertexOffset = 0;
    
    for (let i = 0; i < sphereCount; i++) {
        // Esfera com poucos segmentos para parecer orgânica
        const sphere = new THREE.SphereGeometry(0.4 + Math.random() * 0.2, 3, 2);
        
        // Posicionar aleatoriamente para formar moita
        sphere.translate(
            (Math.random() - 0.5) * 0.6,
            (Math.random() * 0.3) + 0.3,
            (Math.random() - 0.5) * 0.6
        );
        
        // Extrair e combinar geometrias
        const positions = sphere.attributes.position.array;
        const normals = sphere.attributes.normal.array;
        
        // Adicionar vértices
        for (let j = 0; j < positions.length; j += 3) {
            basePositions.push(positions[j], positions[j+1], positions[j+2]);
            baseNormals.push(normals[j], normals[j+1], normals[j+2]);
            // Cor verde variada
            baseColors.push(0.1 + Math.random()*0.1, 0.4 + Math.random()*0.2, 0.1 + Math.random()*0.1);
        }
        
        // Adicionar índices (ajustando offset)
        if (sphere.index) {
            const indices = sphere.index.array;
            for (let j = 0; j < indices.length; j++) {
                baseIndices.push(indices[j] + vertexOffset);
            }
        }
        vertexOffset += sphere.attributes.position.count;
        
        sphere.dispose();
    }
    
    bushGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(basePositions), 3));
    bushGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(baseNormals), 3));
    bushGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(baseColors), 3));
    bushGeo.setIndex(new THREE.BufferAttribute(new Uint16Array(baseIndices), 1));
    bushGeo.translate(0, 0.4, 0); // Ajusta altura
    this.geometryCache.bush = bushGeo;
    
    // ==============================================
    // 2. TRONCO CAÍDO (Mais realista com irregularidades)
    // ==============================================
    const logGeo = new THREE.CylinderGeometry(0.2, 0.22, 2.5, 5); // 5 lados para parecer tronco
    // Adicionar leve curvatura
    const posAttr = logGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        // Adicionar pequena variação para parecer irregular
        const bend = Math.sin(y * 2) * 0.05;
        posAttr.setXYZ(i, x + bend, y, z);
    }
    posAttr.needsUpdate = true;
    logGeo.computeVertexNormals();
    logGeo.rotateZ(Math.PI / 2);
    logGeo.translate(0, 0.15, 0);
    this.geometryCache.log = logGeo;
    
    // ==============================================
    // 3. COGUMELO (Forma realista de cogumelo)
    // ==============================================
    // Haste levemente cônica
    const mushroomStem = new THREE.CylinderGeometry(0.05, 0.08, 0.4, 5);
    mushroomStem.translate(0, 0.2, 0);
    
    // Chapéu arredondado (esfera cortada)
    const mushroomCap = new THREE.SphereGeometry(0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
    mushroomCap.translate(0, 0.55, 0);
    
    // Mesclar haste e chapéu
    this.geometryCache.mushroom = this._mergeGeometries([mushroomStem, mushroomCap]);
    mushroomStem.dispose();
    mushroomCap.dispose();
    
    // ==============================================
    // 4. TUFO DE GRAMA (Feixe de lâminas de grama)
    // ==============================================
    const grassTuftGeo = new THREE.BufferGeometry();
    const grassBlades = 5;
    const grassPositions = [];
    const grassNormals = [];
    const grassColors = [];
    const grassIndices = [];
    let grassVertexOffset = 0;
    
    for (let i = 0; i < grassBlades; i++) {
        // Cada lâmina de grama é um triângulo fino
        const angle = (i / grassBlades) * Math.PI * 2;
        const radius = 0.1 + Math.random() * 0.1;
        const height = 0.4 + Math.random() * 0.2;
        const lean = (Math.random() - 0.5) * 0.3;
        
        // Criar triângulo para lâmina de grama
        const bladeGeo = new THREE.BufferGeometry();
        const bladeVertices = new Float32Array([
            -0.02, 0, 0,
             0.02, 0, 0,
             0, height, lean
        ]);
        
        bladeGeo.setAttribute('position', new THREE.BufferAttribute(bladeVertices, 3));
        bladeGeo.setIndex([0, 1, 2]);
        bladeGeo.computeVertexNormals();
        
        // Rotacionar e posicionar no círculo
        bladeGeo.rotateY(angle);
        bladeGeo.translate(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        
        const positions = bladeGeo.attributes.position.array;
        const normals = bladeGeo.attributes.normal.array;
        
        for (let j = 0; j < positions.length; j += 3) {
            grassPositions.push(positions[j], positions[j+1], positions[j+2]);
            grassNormals.push(normals[j], normals[j+1], normals[j+2]);
            // Gradiente de cor da grama (mais escuro na base)
            const greenLevel = 0.3 + (positions[j+1] / height) * 0.4;
            grassColors.push(0.1, greenLevel, 0.1);
        }
        
        grassIndices.push(
            grassVertexOffset, grassVertexOffset + 1, grassVertexOffset + 2
        );
        grassVertexOffset += 3;
        
        bladeGeo.dispose();
    }
    
    grassTuftGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(grassPositions), 3));
    grassTuftGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(grassNormals), 3));
    grassTuftGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(grassColors), 3));
    grassTuftGeo.setIndex(new THREE.BufferAttribute(new Uint16Array(grassIndices), 1));
    grassTuftGeo.translate(0, 0.15, 0);
    this.geometryCache.grassTuft = grassTuftGeo;
    
    // ==============================================
    // 5. RELVA ALTA (Planta fina que balança)
    // ==============================================
    const tallGrassGeo = new THREE.BufferGeometry();
    const tallGrassCount = 3;
    const tallGrassPositions = [];
    const tallGrassNormals = [];
    const tallGrassColors = [];
    const tallGrassIndices = [];
    let tallGrassOffset = 0;
    
    for (let i = 0; i < tallGrassCount; i++) {
        const angle = (i / tallGrassCount) * Math.PI * 2;
        const radius = 0.08;
        const height = 0.7 + Math.random() * 0.3;
        const curve = (Math.random() - 0.5) * 0.2;
        
        // Criar curva simples para a planta
        const curveGeo = new THREE.BufferGeometry();
        const curveVertices = new Float32Array([
            0, 0, 0,
            curve, height * 0.3, 0,
            curve * 1.5, height * 0.7, 0,
            curve * 0.5, height, 0
        ]);
        
        curveGeo.setAttribute('position', new THREE.BufferAttribute(curveVertices, 3));
        curveGeo.setIndex([0, 1, 2, 2, 3, 0]);
        curveGeo.computeVertexNormals();
        
        // Aplicar rotação e posição
        curveGeo.rotateY(angle);
        curveGeo.translate(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        
        const positions = curveGeo.attributes.position.array;
        const normals = curveGeo.attributes.normal.array;
        
        for (let j = 0; j < positions.length; j += 3) {
            tallGrassPositions.push(positions[j], positions[j+1], positions[j+2]);
            tallGrassNormals.push(normals[j], normals[j+1], normals[j+2]);
            const greenLevel = 0.25 + (positions[j+1] / height) * 0.3;
            tallGrassColors.push(0.15, greenLevel, 0.15);
        }
        
        tallGrassIndices.push(
            tallGrassOffset, tallGrassOffset + 1, tallGrassOffset + 2,
            tallGrassOffset + 2, tallGrassOffset + 3, tallGrassOffset
        );
        tallGrassOffset += 4;
        
        curveGeo.dispose();
    }
    
    tallGrassGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tallGrassPositions), 3));
    tallGrassGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(tallGrassNormals), 3));
    tallGrassGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tallGrassColors), 3));
    tallGrassGeo.setIndex(new THREE.BufferAttribute(new Uint16Array(tallGrassIndices), 1));
    tallGrassGeo.translate(0, 0.1, 0);
    this.geometryCache.tallGrass = tallGrassGeo;
    
    // ==============================================
    // 6. FLOR SILVESTRE (Forma de pétalas)
    // ==============================================
    const flowerGeo = new THREE.BufferGeometry();
    const petalCount = 5;
    const petalPositions = [];
    const petalNormals = [];
    const petalColors = [];
    const petalIndices = [];
    let petalOffset = 0;
    
    // Centro da flor
    const centerGeo = new THREE.SphereGeometry(0.08, 4, 3);
    centerGeo.translate(0, 0.05, 0);
    
    // Adicionar centro
    const centerPositions = centerGeo.attributes.position.array;
    const centerNormals = centerGeo.attributes.normal.array;
    
    for (let j = 0; j < centerPositions.length; j += 3) {
        petalPositions.push(centerPositions[j], centerPositions[j+1], centerPositions[j+2]);
        petalNormals.push(centerNormals[j], centerNormals[j+1], centerNormals[j+2]);
        petalColors.push(0.9, 0.8, 0.1); // Amarelo para o centro
    }
    
    petalOffset += centerGeo.attributes.position.count;
    centerGeo.dispose();
    
    // Pétalas
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petalGeo = new THREE.ConeGeometry(0.12, 0.2, 4);
        petalGeo.rotateX(Math.PI / 2); // Deitar a pétala
        petalGeo.rotateY(angle); // Posicionar ao redor
        petalGeo.translate(Math.cos(angle) * 0.15, 0.05, Math.sin(angle) * 0.15);
        
        const positions = petalGeo.attributes.position.array;
        const normals = petalGeo.attributes.normal.array;
        
        for (let j = 0; j < positions.length; j += 3) {
            petalPositions.push(positions[j], positions[j+1], positions[j+2]);
            petalNormals.push(normals[j], normals[j+1], normals[j+2]);
            // Cores vibrantes para pétalas
            petalColors.push(1.0, 0.5, 0.0); // Laranja
        }
        
        petalGeo.dispose();
    }
    
    // Haste da flor
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.3, 4);
    stemGeo.translate(0, -0.15, 0);
    
    const stemPositions = stemGeo.attributes.position.array;
    const stemNormals = stemGeo.attributes.normal.array;
    
    for (let j = 0; j < stemPositions.length; j += 3) {
        petalPositions.push(stemPositions[j], stemPositions[j+1], stemPositions[j+2]);
        petalNormals.push(stemNormals[j], stemNormals[j+1], stemNormals[j+2]);
        petalColors.push(0.2, 0.5, 0.2); // Verde para haste
    }
    
    // Configurar geometria final da flor
    flowerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(petalPositions), 3));
    flowerGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(petalNormals), 3));
    flowerGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(petalColors), 3));
    this.geometryCache.flower = flowerGeo;
    
    console.log('🌿 Geometrias de vegetação realistas criadas');
}

// ✅ Método auxiliar para mesclar geometrias (reutilizando lógica do FloraUtils)
_mergeGeometries(geometries) {
    let totalVertices = 0;
    let totalIndices = 0;
    
    geometries.forEach(geo => {
        totalVertices += geo.attributes.position.count;
        if (geo.index) {
            totalIndices += geo.index.count;
        } else {
            totalIndices += geo.attributes.position.count;
        }
    });
    
    const posArray = new Float32Array(totalVertices * 3);
    const normArray = new Float32Array(totalVertices * 3);
    const colArray = new Float32Array(totalVertices * 3);
    const indexArray = new Uint16Array(totalIndices);
    
    let vertOffset = 0;
    let idxOffset = 0;
    
    geometries.forEach(geo => {
        // Copiar vértices
        posArray.set(geo.attributes.position.array, vertOffset * 3);
        normArray.set(geo.attributes.normal.array, vertOffset * 3);
        
        // Se não tiver cores, criar cores padrão
        if (geo.attributes.color) {
            colArray.set(geo.attributes.color.array, vertOffset * 3);
        } else {
            // Preencher com cor branca
            for (let i = 0; i < geo.attributes.position.count * 3; i++) {
                colArray[vertOffset * 3 + i] = 1.0;
            }
        }
        
        // Copiar e ajustar índices
        if (geo.index) {
            const indices = geo.index.array;
            for (let i = 0; i < indices.length; i++) {
                indexArray[idxOffset + i] = indices[i] + vertOffset;
            }
            idxOffset += indices.length;
        } else {
            // Se não tem índices, criar sequenciais
            for (let i = 0; i < geo.attributes.position.count; i++) {
                indexArray[idxOffset + i] = i + vertOffset;
            }
            idxOffset += geo.attributes.position.count;
        }
        
        vertOffset += geo.attributes.position.count;
    });
    
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
    merged.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
    merged.setIndex(new THREE.BufferAttribute(indexArray, 1));
    
    return merged;
}

    _initializeMaterials() {
        this.sharedMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        this.materialCache.treeTrunk = new THREE.MeshLambertMaterial({ color: 0x4a2511 });
        this.materialCache.treeLeavesPlains = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
        this.materialCache.treeLeavesForest = new THREE.MeshLambertMaterial({ color: 0x1a4d1a });
        this.materialCache.rock = new THREE.MeshLambertMaterial({ color: 0x808080 });
        this.materialCache.cactus = new THREE.MeshLambertMaterial({ color: 0x3CB371 });
		// --- NOVOS MATERIAIS ---
        this.materialCache.bush = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Verde Floresta
        this.materialCache.grass = new THREE.MeshLambertMaterial({ color: 0x55aa55 }); // Verde Grama
        this.materialCache.tallGrass = new THREE.MeshLambertMaterial({ color: 0x6b8c42 }); // Verde Oliva
        this.materialCache.log = new THREE.MeshLambertMaterial({ color: 0x3d2817 }); // Marrom Escuro
        this.materialCache.mushroomRed = new THREE.MeshLambertMaterial({ color: 0xff3333 }); // Cogumelo Vermelho
        this.materialCache.mushroomStem = new THREE.MeshLambertMaterial({ color: 0xffeedd }); // Haste Bege
        this.materialCache.flowerYellow = new THREE.MeshLambertMaterial({ color: 0xffd700 }); // Flor Amarela
    }
	
	_addMesh(parent, geometry, material, x, y, z, scale) {
        if (!geometry || !material) return;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.scale.setScalar(scale);
        mesh.rotation.y = Math.random() * Math.PI * 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
		mesh.rotation.x = (Math.random() - 0.5) * 0.1; // Pequena inclinação
		mesh.rotation.z = (Math.random() - 0.5) * 0.1;
		mesh.scale.x = scale * (0.9 + Math.random() * 0.2); // Variação irregular
		mesh.scale.y = scale * (0.9 + Math.random() * 0.2);
		mesh.scale.z = scale * (0.9 + Math.random() * 0.2);
        this.floraObjects.push(mesh);
    }

    async _loadPlantAssets() {
        console.log('🎨 Carregando assets de plantas...');
        try {
            const basePath = 'js/world/flora/species/';
            const [pinheiroRes, carvalhoRes, macieiraRes] = await Promise.all([
                fetch(basePath + 'pinheiro.json').catch(() => null),
                fetch(basePath + 'carvalho.json').catch(() => null),
                fetch(basePath + 'macieira.json').catch(() => null)
            ]);
            
            if (pinheiroRes && pinheiroRes.ok) this.plantData.pinheiro = await pinheiroRes.json();
            if (carvalhoRes && carvalhoRes.ok) this.plantData.carvalho = await carvalhoRes.json();
            if (macieiraRes && macieiraRes.ok) this.plantData.macieira = await macieiraRes.json();
            
            if (this.plantData.pinheiro || this.plantData.carvalho || this.plantData.macieira) {
                this._processPlantGeometries();
                this.assetsLoaded = true;
                console.log('✅ Assets carregados');
            } else {
                console.warn('⚠️ Usando fallback');
                this.assetsLoaded = true;
            }
        } catch (error) {
            console.error('❌ Erro assets:', error);
            this.assetsLoaded = true;
        }
    }

    _processPlantGeometries() {
        try {
            if (this.plantData.pinheiro) this.geometryCache.pinheiro = FloraUtils.createMergedGeometry(this.plantData.pinheiro, 0.5);
            if (this.plantData.carvalho) this.geometryCache.carvalho = FloraUtils.createMergedGeometry(this.plantData.carvalho, 0.5);
            if (this.plantData.macieira) this.geometryCache.macieira = FloraUtils.createMergedGeometry(this.plantData.macieira, 0.5);
        } catch (error) { console.error(error); }
    }

 // ✅ populateChunk: Gera árvores e agora também GRAMA e ARBUSTOS
    populateChunk(chunkGroup, chunkX, chunkZ, resolution) {
        // Criação do RNG interno
        const rng = new Random(this.seed + chunkX * 99 + chunkZ * 13);
        const chunkFloraData = [];
        
        // Densidade de vegetação baseada na resolução
        const density = resolution >= 64 ? 12 : resolution >= 32 ? 8 : 4;
        const count = Math.floor(rng.range(density * 0.5, density * 1.5));
        
        for (let i = 0; i < count; i++) {
            // 1. Posição Base
            const lx = rng.range(-16, 16);
            const lz = rng.range(-16, 16);
            const wx = chunkX * 32 + lx;
            const wz = chunkZ * 32 + lz;
            const h = getHeight(wx, wz, this.seed);

            if (h < -2) continue; // Pular água profunda

            const m = getMoisture(wx, wz, this.seed);
            const biome = getBiome(h, m, this.seed);
            let plantType = null;

            // 2. Lógica de Árvores (Principal)
            if (biome === 'forest') plantType = rng.next() > 0.5 ? 'carvalho' : 'pinheiro';
            else if (biome === 'plains') plantType = rng.next() > 0.7 ? 'macieira' : null;
            else if (biome === 'mountains' || biome === 'taiga') plantType = 'pinheiro';
            else if (biome === 'desert' && rng.next() > 0.9) plantType = 'cactus';
            
            if (plantType) {
                const scale = rng.range(0.8, 1.2);
                const rotation = rng.range(0, Math.PI * 2);

                if (this.instancedMode) {
                    this._addInstance(plantType, wx, h, wz, scale, rotation);
                } else {
                    this._addPlantMesh(chunkGroup, plantType, lx, h, lz, scale, rotation, rng); 
                }

                chunkFloraData.push({
                    type: plantType,
                    x: parseFloat(wx.toFixed(2)),
                    y: parseFloat(h.toFixed(2)),
                    z: parseFloat(wz.toFixed(2)),
                    s: parseFloat(scale.toFixed(2)),
                    r: parseFloat(rotation.toFixed(2))
                });
            }

            // =========================================================
            // ✅ 3. CAMADA DE DETALHES (GRAMA E RELVA)
            // =========================================================
            // Adiciona vegetação rasteira em volta da posição sorteada
            if (biome === 'plains' || biome === 'forest' || biome === 'jungle') {
                const grassCount = 5; // Tenta colocar 5 tufos por iteração de árvore/planta
                
                for(let g = 0; g < grassCount; g++) {
                    // Espalha a grama num raio de 2 metros em volta do ponto principal
                    const gx = wx + rng.range(-2, 2);
                    const gz = wz + rng.range(-2, 2);
                    
                    // Recalcula altura para garantir que a grama fique no chão (e não voando)
                    const gh = getHeight(gx, gz, this.seed);
                    
                    // Só adiciona se estiver no chão firme (acima do nível da água + margem)
                    if (gh > 0.5 && rng.next() > 0.4) { // Chance de 60%
                        const roll = rng.next();
                        
                        // Sorteia o tipo de detalhe
                        if (roll > 0.95) {
                            // Arbusto (Raro)
                            this._addMesh(chunkGroup, this.geometryCache.bush, this.materialCache.bush, gx - chunkX*32, gh, gz - chunkZ*32, rng.range(0.6, 1.0));
                        } else if (roll > 0.8) {
                            // Grama Alta
                            this._addMesh(chunkGroup, this.geometryCache.tallGrass, this.materialCache.tallGrass, gx - chunkX*32, gh, gz - chunkZ*32, rng.range(0.8, 1.2));
                        } else {
                            // Touceira de Grama (Comum)
                            this._addMesh(chunkGroup, this.geometryCache.grassTuft, this.materialCache.grass, gx - chunkX*32, gh, gz - chunkZ*32, rng.range(0.7, 1.3));
                        }
                    }
                }
            }

        }
        return chunkFloraData;
    }
	
    // ✅ RECEBE rng AQUI
    _addPlantMesh(parent, type, x, y, z, scale, rotation, rng) { 
        if (this.geometryCache[type] && type !== 'rock' && type !== 'cactus') {
            const mesh = new THREE.Mesh(this.geometryCache[type], this.sharedMaterial);
            mesh.position.set(x, y, z);
            mesh.scale.setScalar(scale);
            mesh.rotation.y = rotation;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            parent.add(mesh);
            this.floraObjects.push(mesh);
        } else {
            // ✅ E AGORA PODE PASSAR O rng ADIANTE
            this._addBasicTree(parent, x, y, z, rng, type);
        }
    }

    _addBasicTree(parent, x, y, z, rng, biome) {
        // Usa o rng corretamente
        const scale = rng.range(0.8, 1.2);
        
        const trunk = new THREE.Mesh(this.geometryCache.treeTrunk, this.materialCache.treeTrunk);
        trunk.position.set(x, y + 1 * scale, z);
        trunk.scale.set(scale, scale, scale);
        trunk.castShadow = true;
        parent.add(trunk);
        this.floraObjects.push(trunk);
        
        const leavesMat = biome === 'forest' ? this.materialCache.treeLeavesForest : this.materialCache.treeLeavesPlains;
        const leaves = new THREE.Mesh(this.geometryCache.treeLeaves, leavesMat);
        leaves.position.set(x, y + 3 * scale, z);
        leaves.scale.set(scale, scale, scale);
        leaves.castShadow = true;
        parent.add(leaves);
        this.floraObjects.push(leaves);
    }

    enableInstancedMode() {
        if (this.instancedMode) return;
        console.log('🚀 Ativando InstancedMesh...');
        if (this.geometryCache.pinheiro) this._createInstanceGroup('pinheiro', this.geometryCache.pinheiro, this.sharedMaterial);
        if (this.geometryCache.carvalho) this._createInstanceGroup('carvalho', this.geometryCache.carvalho, this.sharedMaterial);
        if (this.geometryCache.macieira) this._createInstanceGroup('macieira', this.geometryCache.macieira, this.sharedMaterial);
        this._createInstanceGroup('rock', this.geometryCache.rock, this.materialCache.rock);
        this._createInstanceGroup('cactus', this.geometryCache.cactus, this.materialCache.cactus);
        this.instancedMode = true;
    }

    _createInstanceGroup(key, geometry, material) {
        const mesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const dummy = new THREE.Object3D();
        dummy.position.set(0, -5000, 0);
        dummy.updateMatrix();
        for (let i = 0; i < this.maxInstances; i++) mesh.setMatrixAt(i, dummy.matrix);
        mesh.instanceMatrix.needsUpdate = true;
        this.scene.add(mesh);
        this.instances[key] = mesh;
        this.instanceCounts[key] = 0;
    }

    _addInstance(key, x, y, z, scale, rotation) {
        if (!this.instances[key]) return;
        const count = this.instanceCounts[key];
        if (count >= this.maxInstances) return;
        const dummy = new THREE.Object3D();
        dummy.position.set(x, y, z);
        dummy.scale.setScalar(scale);
        dummy.rotation.y = rotation;
        dummy.updateMatrix();
        this.instances[key].setMatrixAt(count, dummy.matrix);
        this.instances[key].instanceMatrix.needsUpdate = true;
        this.instanceCounts[key]++;
    }

    isReady() { return this.assetsLoaded; }
    updateSeed(newSeed) { this.seed = newSeed; }
    clear() { Object.keys(this.instanceCounts).forEach(k => this.instanceCounts[k] = 0); }
    getStats() {
        if (this.instancedMode) {
            const total = Object.values(this.instanceCounts).reduce((a, b) => a + b, 0);
            return { mode: 'InstancedMesh ✅', totalInstances: total };
        } else {
            return { mode: 'Individual ⚠️', totalObjects: this.floraObjects.length };
        }
    }
    dispose() {
        this.floraObjects.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            if (obj.parent) obj.parent.remove(obj);
        });
        this.floraObjects = [];
        Object.values(this.instances).forEach(mesh => { if (mesh) this.scene.remove(mesh); });
    }
}