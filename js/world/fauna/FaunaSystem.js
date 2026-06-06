// ===================================================================
// FaunaSystem.js - SISTEMA DE MOBS E ANIMAIS PROCEDURAIS
// Fase 5: Placeholder para futuro sistema de IA e comportamento
// ===================================================================

import { CONFIG } from '../../config.js';
import { getHeight, getBiome, getMoisture } from '../Terrain.js';
import { Random } from '../../utils/MathUtils.js';

export class FaunaSystem {
    constructor(seed) {
        this.seed = seed;
        this.mobs = []; // Array de entidades ativas
        this.maxMobsPerChunk = 3; // Limite de mobs por chunk
        this.spawnChance = 0.3; // 30% de chance de spawn por chunk
        
        // ✅ FUTURO: Tipos de mobs por bioma
        this.mobTypes = {
            'plains': ['deer', 'rabbit'],
            'forest': ['bear', 'wolf'],
            'jungle': ['parrot', 'jaguar'],
            'desert': ['scorpion', 'snake'],
            'mountains': ['eagle', 'goat'],
            'tundra': ['penguin', 'seal'],
            'corruption': ['shadow_creature'],
            'crimson': ['blood_zombie'],
            'hallow': ['unicorn', 'pixie'],
            'mushroom': ['mushroom_npc']
        };
        
        console.log('🦌 FaunaSystem inicializado (Modo: Placeholder)');
    }

    // ===================================================================
    // SPAWN DE MOBS EM CHUNK
    // ===================================================================
    spawnMobs(chunkX, chunkZ, biomeData, chunkGroup) {
        const rng = new Random(this.seed + chunkX * 5000 + chunkZ * 3);
        
        // Chance de não spawnar nada neste chunk
        if (rng.next() > this.spawnChance) return;
        
        const numMobs = Math.floor(rng.range(1, this.maxMobsPerChunk + 1));
        
        for (let i = 0; i < numMobs; i++) {
            const localX = rng.range(-CONFIG.CHUNK_SIZE/2, CONFIG.CHUNK_SIZE/2);
            const localZ = rng.range(-CONFIG.CHUNK_SIZE/2, CONFIG.CHUNK_SIZE/2);
            const worldX = localX + chunkX * CONFIG.CHUNK_SIZE;
            const worldZ = localZ + chunkZ * CONFIG.CHUNK_SIZE;
            
            const height = getHeight(worldX, worldZ, this.seed);
            const moisture = getMoisture(worldX, worldZ, this.seed);
            const biome = getBiome(height, moisture);
            
            // Não spawnar em água ou lava
            if (biome === 'water' || biome === 'lava' || height < -2) continue;
            
            // ✅ FUTURO: Selecionar mob baseado no bioma
            const mobType = this._selectMobForBiome(biome, rng);
            
            // Por enquanto, criar um cubo de teste
            this._spawnTestMob(chunkGroup, localX, height, localZ, mobType, biome);
        }
    }

    // ===================================================================
    // SELETOR DE MOB POR BIOMA
    // ===================================================================
    _selectMobForBiome(biome, rng) {
        const availableMobs = this.mobTypes[biome] || ['generic'];
        const index = Math.floor(rng.next() * availableMobs.length);
        return availableMobs[index];
    }

    // ===================================================================
    // SPAWN DE MOB DE TESTE (PLACEHOLDER)
    // ===================================================================
    _spawnTestMob(parent, x, y, z, mobType, biome) {
        // ✅ PLACEHOLDER: Cubo colorido representando o mob
        const size = 0.8;
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // Cor baseada no bioma
        const biomeColors = {
            'plains': 0x90EE90,
            'forest': 0x228B22,
            'jungle': 0x006400,
            'desert': 0xF4A460,
            'mountains': 0x808080,
            'tundra': 0xF0F8FF,
            'corruption': 0x9B30FF,
            'crimson': 0xDC143C,
            'hallow': 0x87CEEB,
            'mushroom': 0x9370DB
        };
        
        const color = biomeColors[biome] || 0xFFFFFF;
        const material = new THREE.MeshLambertMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.2
        });
        
        const mobMesh = new THREE.Mesh(geometry, material);
        mobMesh.position.set(x, y + size * 0.5, z);
        mobMesh.castShadow = true;
        mobMesh.receiveShadow = true;
        
        // ✅ FUTURO: Adicionar componentes de IA
        mobMesh.userData = {
            type: mobType,
            biome: biome,
            health: 100,
            speed: 2.0,
            state: 'idle', // idle, wandering, chasing, fleeing
            target: null
        };
        
        parent.add(mobMesh);
        this.mobs.push(mobMesh);
        
        // Log de debug
        // console.log(`🦌 Mob spawned: ${mobType} em ${biome} (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
    }

    // ===================================================================
    // UPDATE LOOP (CHAMADO NO ANIMATE)
    // ===================================================================
    update(deltaTime, playerPosition) {
        // ✅ FUTURO: Implementar lógica de IA aqui
        
        // Exemplo de comportamento simples (rotação)
        this.mobs.forEach(mob => {
            if (!mob || !mob.parent) return; // Mob foi removido
            
            // ✅ PLACEHOLDER: Rotacionar lentamente
            mob.rotation.y += deltaTime * 0.5;
            
            // ✅ FUTURO: Implementar estados de IA
            switch (mob.userData.state) {
                case 'idle':
                    // TODO: Ficar parado ou animação idle
                    break;
                case 'wandering':
                    // TODO: Caminhar aleatoriamente
                    break;
                case 'chasing':
                    // TODO: Perseguir jogador
                    break;
                case 'fleeing':
                    // TODO: Fugir do jogador
                    break;
            }
        });
    }

    // ===================================================================
    // GERENCIAMENTO DE MOBS
    // ===================================================================
    
    // Remover mobs de chunks distantes (culling)
    cullDistantMobs(playerChunkX, playerChunkZ, renderDistance) {
        this.mobs = this.mobs.filter(mob => {
            if (!mob || !mob.parent) return false;
            
            const mobChunkX = Math.floor(mob.position.x / CONFIG.CHUNK_SIZE);
            const mobChunkZ = Math.floor(mob.position.z / CONFIG.CHUNK_SIZE);
            
            const dx = Math.abs(mobChunkX - playerChunkX);
            const dz = Math.abs(mobChunkZ - playerChunkZ);
            
            if (dx > renderDistance + 1 || dz > renderDistance + 1) {
                // Remover da cena
                mob.parent.remove(mob);
                mob.geometry.dispose();
                mob.material.dispose();
                return false;
            }
            
            return true;
        });
    }

    // Obter mobs próximos ao jogador (para interação/combate)
    getMobsNearPlayer(playerPosition, radius) {
        return this.mobs.filter(mob => {
            if (!mob || !mob.parent) return false;
            const distance = mob.position.distanceTo(playerPosition);
            return distance <= radius;
        });
    }

    // Spawnar mob específico em posição (para eventos)
    spawnMobAt(position, mobType, biome = 'plains') {
        // ✅ FUTURO: Criar mob real baseado no tipo
        console.log(`🦌 Spawn forçado: ${mobType} em (${position.x}, ${position.y}, ${position.z})`);
        
        // TODO: Implementar spawn manual
    }

    // ===================================================================
    // ✅ FUTURO: SISTEMA DE IA AVANÇADO
    // ===================================================================
    
    // Detecção de jogador (visão e audição)
    detectPlayer(mob, playerPosition) {
        // TODO: Implementar raycasting para linha de visão
        // TODO: Calcular distância para audição
        // TODO: Retornar se o mob pode ver/ouvir o jogador
        return false;
    }

    // Pathfinding (navegação)
    findPathTo(mob, targetPosition) {
        // TODO: Implementar A* ou algoritmo similar
        // TODO: Considerar terreno (não atravessar água/paredes)
        return [];
    }

    // Comportamentos específicos por tipo
    updateMobBehavior(mob, deltaTime, playerPosition) {
        switch (mob.userData.type) {
            case 'deer':
                // TODO: Fugir do jogador se próximo
                break;
            case 'wolf':
                // TODO: Perseguir se jogador estiver ferido
                break;
            case 'shadow_creature':
                // TODO: Teleportar e atacar
                break;
            // ... mais comportamentos
        }
    }

    // ===================================================================
    // UTILITÁRIOS
    // ===================================================================
    
    updateSeed(newSeed) {
        this.seed = newSeed;
        console.log(`🦌 FaunaSystem: Seed atualizada para ${newSeed}`);
    }

    getTotalMobs() {
        return this.mobs.length;
    }

    clearAllMobs() {
        this.mobs.forEach(mob => {
            if (mob && mob.parent) {
                mob.parent.remove(mob);
                mob.geometry.dispose();
                mob.material.dispose();
            }
        });
        this.mobs = [];
        console.log('🦌 FaunaSystem: Todos os mobs removidos');
    }

    dispose() {
        this.clearAllMobs();
        console.log('🦌 FaunaSystem: Recursos liberados');
    }

    // ===================================================================
    // DEBUG E ESTATÍSTICAS
    // ===================================================================
    
    getStats() {
        const stats = {
            totalMobs: this.mobs.length,
            mobsByType: {},
            mobsByBiome: {}
        };
        
        this.mobs.forEach(mob => {
            if (!mob || !mob.userData) return;
            
            const type = mob.userData.type || 'unknown';
            const biome = mob.userData.biome || 'unknown';
            
            stats.mobsByType[type] = (stats.mobsByType[type] || 0) + 1;
            stats.mobsByBiome[biome] = (stats.mobsByBiome[biome] || 0) + 1;
        });
        
        return stats;
    }

    logStats() {
        const stats = this.getStats();
        console.log('🦌 FaunaSystem Stats:', stats);
    }
}
