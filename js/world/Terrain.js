import { fbm, warpedNoise, perlinNoise } from '../utils/MathUtils.js';
import { PANEL_STATE } from '../config.js';

// ===================================================================
// CONFIGURAÇÃO CRÍTICA: NÍVEL DO MAR
// ===================================================================
export const WATER_LEVEL = 0;

// ===================================================================
// FUNÇÕES AUXILIARES - TRANSIÇÕES SUAVES
// ===================================================================

function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
}

function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3 - 2 * t);
}

// ✅ NOVA: Função para aplicar efeitos de forma suave
function applyEffect(baseHeight, mask, minThreshold, maxThreshold, effectStrength) {
    // Se mask está fora do range, retorna sem mudanças
    if (mask < minThreshold || mask > maxThreshold) return baseHeight;
    
    // Calcula transição suave (0 a 1)
    let blend;
    if (maxThreshold - minThreshold < 0.01) {
        // Range muito pequeno, usar diretamente
        blend = 1.0;
    } else {
        // Normalizar mask para 0-1 dentro do range
        blend = (mask - minThreshold) / (maxThreshold - minThreshold);
        // Aplicar smoothstep para suavizar entrada/saída
        blend = smoothstep(0, 1, blend);
    }
    
    return baseHeight + (effectStrength * blend);
}

// ✅ NOVA: Clamp seguro para noise (evita valores extremos)
function safeNoise(noiseFunc, ...args) {
    const value = noiseFunc(...args);
    return clamp(value, -1.0, 1.0);
}

// ===================================================================
// LÓGICA DE TERRENO - VERSÃO CORRIGIDA SEM DESCONTINUIDADES
// ===================================================================

export function getHeight(x, z, seed) {
    // 1. Configuração de Escala e Intensidade
    const scale = PANEL_STATE.sliders.scale || 60;
    const globalScale = scale;
    const intensity = (PANEL_STATE.sliders.intensity || 50) / 100;

    // ===================================================================
    // BASE HEIGHT - AGORA COM CLAMP E MAIS OITAVAS
    // ===================================================================
    
    // Blend factor suave
    const blendFactor = (safeNoise(fbm, x / (scale * 3), z / (scale * 3), seed, 2) + 1) / 2;

    // ✅ CORREÇÃO CRÍTICA: Noise base com clamp e mais octaves
    let baseNoise = safeNoise(
        warpedNoise,
        x / globalScale, 
        z / globalScale, 
        seed, 
        3,  // ✅ Aumentado de 1 para 3 oitavas
        2.0 // ✅ Ganho reduzido de 4 para 2
    );
    
    // ✅ Altura base mais controlada (multiplicador reduzido)
    let baseHeight = baseNoise * 30 + 8; // Antes: * 40 + 5
    
    // ===================================================================
    // RELEVO - APLICADO COM TRANSIÇÕES SUAVES
    // ===================================================================
    
    // RELEVO: Elevar
    if (PANEL_STATE.selected.relevo.has('Elevar')) {
        const mask = (safeNoise(fbm, x / 80, z / 80, seed + 100, 3) + 1) / 2;
        baseHeight = applyEffect(baseHeight, mask, 0.4, 0.9, 15 * intensity);
    }
    
    // RELEVO: Rebaixar
    if (PANEL_STATE.selected.relevo.has('Rebaixar')) {
        const mask = (safeNoise(fbm, x / 70, z / 70, seed + 200, 3) + 1) / 2;
        baseHeight = applyEffect(baseHeight, mask, 0.3, 0.8, -12 * intensity);
    }
    
    // RELEVO: Planícies - ✅ AGORA COM LERP SUAVE
    if (PANEL_STATE.selected.relevo.has('Planícies')) {
        const mask = (safeNoise(fbm, x / 90, z / 90, seed + 250, 2) + 1) / 2;
        if (mask > 0.3 && mask < 0.6) {
            // ✅ Transição suave em vez de achatamento brutal
            const plainsTarget = 3; // Altura alvo das planícies
            const blendAmount = smoothstep(0.3, 0.6, mask);
            baseHeight = lerp(baseHeight, plainsTarget, blendAmount * 0.7);
        }
    }
    
    // RELEVO: Colinas
    if (PANEL_STATE.selected.relevo.has('Colinas')) {
        const hillMask = (safeNoise(fbm, x / 60, z / 60, seed + 275, 3) + 1) / 2;
        baseHeight = applyEffect(baseHeight, hillMask, 0.4, 1.0, 12 * intensity);
    }
    
    // RELEVO: Montanhas - ✅ TRANSIÇÃO SUAVE
    if (PANEL_STATE.selected.relevo.has('Montanhas')) {
        const mountainMask = (safeNoise(fbm, x / 100, z / 100, seed + 300, 4) + 1) / 2;
        // ✅ Usar smoothstep em vez de if statement duro
        if (mountainMask > 0.3) {
            const transition = smoothstep(0.3, 0.7, mountainMask);
            baseHeight += transition * 40 * intensity;
        }
    }
    
    // RELEVO: Cânions - ✅ TRANSIÇÃO SUAVE
    if (PANEL_STATE.selected.relevo.has('Cânions')) {
        const canyonMask = Math.abs(safeNoise(fbm, x / 60, z / 60, seed + 400, 2));
        if (canyonMask < 0.2) {
            const depth = smoothstep(0.2, 0.05, canyonMask); // Invertido
            baseHeight -= depth * 30 * intensity;
        }
    }
    
    // RELEVO: Vales
    if (PANEL_STATE.selected.relevo.has('Vales')) {
        const valleyMask = (safeNoise(fbm, x / 90, z / 90, seed + 500, 3) + 1) / 2;
        if (valleyMask > 0.5) {
            const depth = smoothstep(0.5, 0.8, valleyMask);
            baseHeight -= depth * 12;
        }
    }
    
    // RELEVO: Abismo
    if (PANEL_STATE.selected.relevo.has('Abismo')) {
        const abyssMask = (safeNoise(fbm, x / 50, z / 50, seed + 600, 2) + 1) / 2;
        if (abyssMask < 0.25) {
            const depth = smoothstep(0.25, 0.1, abyssMask);
            baseHeight -= depth * 25 * intensity;
        }
    }
    
    // ===================================================================
    // ÁGUA - ✅ TRANSIÇÕES SUAVES EM VEZ DE Math.min BRUTAL
    // ===================================================================
    
    // ÁGUA: Lagos - ✅ TRANSIÇÃO SUAVE
    if (PANEL_STATE.selected.agua.has('Lagos')) {
        const lakeMask = (safeNoise(fbm, x / 40, z / 40, seed + 700, 2) + 1) / 2;
        if (lakeMask < 0.4) {
            const lakeTarget = WATER_LEVEL - 2;
            const blendAmount = smoothstep(0.4, 0.2, lakeMask); // Quanto mais baixo, mais forte
            baseHeight = lerp(baseHeight, lakeTarget, blendAmount);
        }
    }
    
    // ÁGUA: Rios - ✅ TRANSIÇÃO SUAVE
    if (PANEL_STATE.selected.agua.has('Rios')) {
        const riverNoise1 = safeNoise(fbm, x / 50, z / 50, seed + 750, 2);
        const riverNoise2 = safeNoise(fbm, x / 35, z / 35, seed + 755, 2);
        const riverMask = Math.abs(riverNoise1 - 0.5) * Math.abs(riverNoise2 - 0.5);
        
        if (riverMask < 0.03) {
            const riverTarget = WATER_LEVEL - 1.5;
            const blendAmount = smoothstep(0.03, 0.01, riverMask);
            baseHeight = lerp(baseHeight, riverTarget, blendAmount);
        }
    }
    
    // ÁGUA: Oceano - ✅ TRANSIÇÃO GRADUAL
    if (PANEL_STATE.selected.agua.has('Oceano')) {
        const distFromCenter = Math.sqrt(x * x + z * z);
        if (distFromCenter > 120) {
            const oceanTarget = WATER_LEVEL - 5;
            const blendAmount = smoothstep(120, 180, distFromCenter);
            baseHeight = lerp(baseHeight, oceanTarget, blendAmount);
        }
    }
    
    // ÁGUA: Pântanos - ✅ TRANSIÇÃO SUAVE
    if (PANEL_STATE.selected.agua.has('Pântanos')) {
        const swampMask = (safeNoise(fbm, x / 55, z / 55, seed + 800, 3) + 1) / 2;
        if (swampMask > 0.4 && swampMask < 0.7) {
            const swampTarget = WATER_LEVEL - 0.5;
            const blendAmount = smoothstep(0.4, 0.55, swampMask) * (1 - smoothstep(0.55, 0.7, swampMask));
            baseHeight = lerp(baseHeight, swampTarget, blendAmount * 0.8);
        }
    }
    
    // ÁGUA: Lava
    if (PANEL_STATE.selected.agua.has('Lava')) {
        const lavaMask = (safeNoise(fbm, x / 45, z / 45, seed + 850, 2) + 1) / 2;
        if (lavaMask < 0.3) {
            const lavaTarget = WATER_LEVEL - 3;
            const blendAmount = smoothstep(0.3, 0.15, lavaMask);
            baseHeight = lerp(baseHeight, lavaTarget, blendAmount);
        }
    }
    
    // ÁGUA: Mel
    if (PANEL_STATE.selected.agua.has('Mel')) {
        const honeyMask = (safeNoise(fbm, x / 35, z / 35, seed + 900, 2) + 1) / 2;
        if (honeyMask > 0.65 && honeyMask < 0.85) {
            const honeyTarget = WATER_LEVEL - 1;
            const blendAmount = smoothstep(0.65, 0.75, honeyMask) * (1 - smoothstep(0.75, 0.85, honeyMask));
            baseHeight = lerp(baseHeight, honeyTarget, blendAmount * 0.7);
        }
    }
    
    // ===================================================================
    // ✅ DETALHE DE ALTA FREQUÊNCIA - SEMPRE PRESENTE
    // ===================================================================
    
    // Detalhe fino SEMPRE ativo (não dependente de blendFactor)
    const fineDetail = safeNoise(
        fbm,
        (x / globalScale) * 8,  // ✅ Frequência maior (era * 4)
        (z / globalScale) * 8,
        seed + 500,
        4,  // ✅ Mais oitavas
        0.5,
        2.0
    ) * 2.5; // ✅ Amplitude reduzida para não criar novos paredões
    
    // Detalhe médio (adiciona variação sem extremos)
    const mediumDetail = safeNoise(
        fbm,
        x / (globalScale * 2),
        z / (globalScale * 2),
        seed + 600,
        3,
        0.5,
        2.0
    ) * 1.5;
    
    return baseHeight + fineDetail + mediumDetail;
}

// ===================================================================
// SISTEMA DE BIOMAS
// ===================================================================

export function getMoisture(x, z, seed) {
    let moisture = safeNoise(warpedNoise, x / 40, z / 40, seed + 999, 1, 3);
    
    // ÁGUA: Pântanos aumentam umidade
    if (PANEL_STATE.selected.agua.has('Pântanos')) {
        const swampMask = (safeNoise(fbm, x / 60, z / 60, seed + 800, 3) + 1) / 2;
        if (swampMask > 0.5) {
            moisture = Math.max(moisture, 0.8);
        }
    }
    
    return moisture;
}

export function getBiome(height, moisture, seed) {

    // BIOMA: Deserto
    if (PANEL_STATE.selected.veg.has('Deserto')) {
        const desertMask = (safeNoise(fbm, height, moisture, seed + 900, 2) + 1) / 2;
        if (desertMask > 0.5 && height > WATER_LEVEL) return 'desert';
    }
    
    // BIOMA: Tundra
    if (PANEL_STATE.selected.veg.has('Tundra')) {
        if (height > 20) return 'tundra';
    }
    
    // BIOMA: Selva
    if (PANEL_STATE.selected.veg.has('Selva')) {
        if (moisture > 0.7 && height > WATER_LEVEL && height < 15) return 'jungle';
    }
    
    // BIOMA: Floresta
    if (PANEL_STATE.selected.veg.has('Floresta')) {
        const forestMask = (safeNoise(fbm, height * 2, moisture, seed + 950, 3) + 1) / 2;
        if (forestMask > 0.5 && height > WATER_LEVEL + 1 && height < 18) return 'forest';
    }
    
    // BIOMA: Corrupção
    if (PANEL_STATE.selected.veg.has('Corrupção')) {
        const corruptionMask = (safeNoise(fbm, height * 2, moisture * 2, seed + 1000, 2) + 1) / 2;
        if (corruptionMask > 0.7 && height > WATER_LEVEL) return 'corruption';
    }
    
    // BIOMA: Carmesim
    if (PANEL_STATE.selected.veg.has('Carmesim')) {
        const crimsonMask = (safeNoise(fbm, height * 3, moisture, seed + 1100, 2) + 1) / 2;
        if (crimsonMask > 0.75 && height > WATER_LEVEL) return 'crimson';
    }
    
    // BIOMA: Hallow
    if (PANEL_STATE.selected.veg.has('Hallow')) {
        const hallowMask = (safeNoise(fbm, height, moisture * 3, seed + 1200, 2) + 1) / 2;
        if (hallowMask > 0.75 && height > WATER_LEVEL) return 'hallow';
    }
    
    // BIOMA: Cogumelos
    if (PANEL_STATE.selected.veg.has('Cogumelos')) {
        const mushroomMask = (safeNoise(fbm, height * 2, moisture * 2, seed + 1300, 3) + 1) / 2;
        if (mushroomMask > 0.65 && height > WATER_LEVEL) return 'mushroom';
    }
    
    // ===================================================================
    // FLUIDOS ESPECIAIS (afetam bioma)
    // ===================================================================
    
    // Lava (sobrepõe água)
    if (PANEL_STATE.selected.agua.has('Lava')) {
        const lavaMask = (safeNoise(fbm, height, moisture, seed + 1400, 2) + 1) / 2;
        if (lavaMask < 0.25 && height < WATER_LEVEL - 2) return 'lava';
    }
    
    // Mel (área específica)
    if (PANEL_STATE.selected.agua.has('Mel')) {
        const honeyMask = (safeNoise(fbm, height * 2, moisture, seed + 1500, 2) + 1) / 2;
        if (honeyMask > 0.75 && height < WATER_LEVEL && height > WATER_LEVEL - 2) return 'honey';
    }
    
    // BIOMAS PADRÃO
    if (height < WATER_LEVEL) return 'water';
    if (height < WATER_LEVEL + 3) return 'plains';
    if (height < WATER_LEVEL + 10) return 'hills';
    if (height < WATER_LEVEL + 25) return 'mountains';
    return 'snow';
}

// ===================================================================
// CÁLCULO DE NORMAIS ANALÍTICAS
// ===================================================================

export function getTerrainNormal(x, z, seed, delta = 0.1) { // ✅ Delta reduzido de 0.5 para 0.1
    const hL = getHeight(x - delta, z, seed);
    const hR = getHeight(x + delta, z, seed);
    const hD = getHeight(x, z - delta, seed);
    const hU = getHeight(x, z + delta, seed);
    
    const normal = new THREE.Vector3(
        hL - hR,
        2 * delta,
        hD - hU
    );
    
    return normal.normalize();
}

// ===================================================================
// VERIFICAÇÃO DE SUBMERSÃO
// ===================================================================
export function isUnderwater(x, z, seed) {
    const terrainHeight = getHeight(x, z, seed);
    return terrainHeight < WATER_LEVEL;
}
