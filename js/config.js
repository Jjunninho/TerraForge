export const CONFIG = {
    CHUNK_SIZE: 32,
    RENDER_DISTANCE: 2,
    SEED: 12345,
    COLORS: {
        // Biomas Básicos
        WATER: 0x1e90ff,
        PLAINS: 0x3a7c3a,
        HILLS: 0x8b7355,
        MOUNTAINS: 0x696969,
        SNOW: 0xffffff,
        
        // Biomas Especiais
        DESERT: 0xF4A460,
        JUNGLE: 0x008000,
        FOREST: 0x228B22,      // ✅ NOVO - Floresta (verde escuro)
        TUNDRA: 0xF0F8FF,
        CORRUPTION: 0x9B30FF,
        CRIMSON: 0xDC143C,
        HALLOW: 0x87CEEB,
        MUSHROOM: 0x4B0082,
        
        // Fluidos Especiais
        LAVA: 0xFF4500,
        HONEY: 0xFFD700
    }
};

// NOVO: Presets de terreno para fácil experimentação
export const TERRAIN_PRESETS = {
    // Configuração atual (suave e balanceada)
    ALPINE: {
        name: "Alpes Realistas",
        globalScale: 60,
        warpAmount: 4,
        baseAmplitude: 35,
        baseOffset: -5,
        detailFrequency: 4,
        detailAmplitude: 2,
        detailOctaves: 3,
        detailPersistence: 0.5
    },
    
    // Pradaria suave
    PRAIRIE: {
        name: "Pradaria Ondulada",
        globalScale: 100,
        warpAmount: 2,
        baseAmplitude: 15,
        baseOffset: -2,
        detailFrequency: 2,
        detailAmplitude: 1,
        detailOctaves: 2,
        detailPersistence: 0.6
    },
    
    // Montanhas dramáticas
    DRAMATIC: {
        name: "Montanhas Dramáticas",
        globalScale: 40,
        warpAmount: 6,
        baseAmplitude: 60,
        baseOffset: -10,
        detailFrequency: 6,
        detailAmplitude: 5,
        detailOctaves: 4,
        detailPersistence: 0.4
    },
    
    // Ilhas vulcânicas
    VOLCANIC: {
        name: "Ilhas Vulcânicas",
        globalScale: 50,
        warpAmount: 5,
        baseAmplitude: 45,
        baseOffset: -15,
        detailFrequency: 3,
        detailAmplitude: 3,
        detailOctaves: 3,
        detailPersistence: 0.5
    },
    
    // Super suave (quase plano)
    SMOOTH: {
        name: "Terreno Super Suave",
        globalScale: 120,
        warpAmount: 2,
        baseAmplitude: 20,
        baseOffset: -3,
        detailFrequency: 1,
        detailAmplitude: 0.5,
        detailOctaves: 2,
        detailPersistence: 0.7
    },
    
    // Extremo (para testes)
    EXTREME: {
        name: "Terreno Extremo",
        globalScale: 30,
        warpAmount: 8,
        baseAmplitude: 80,
        baseOffset: -20,
        detailFrequency: 8,
        detailAmplitude: 8,
        detailOctaves: 5,
        detailPersistence: 0.3
    }
};

// Preset ativo (pode ser alterado em runtime)
export let ACTIVE_TERRAIN_PRESET = TERRAIN_PRESETS.ALPINE;

// Estado global do painel (compartilhado com main.js)
export const PANEL_STATE = {
    mode: "manual",
    seed: 12345,
    sliders: { blend: 65, scale: 60, intensity: 70 },
    selected: { 
        relevo: new Set(), 
        agua: new Set(), 
        veg: new Set() 
    },
    cycle: "dia"
};
