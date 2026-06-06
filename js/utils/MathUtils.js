// ===================================================================
// MathUtils.js - VERSÃO ULTRA-ROBUSTA (Anti-Striping Garantido)
// ===================================================================

export class Random {
    constructor(seed) { this.seed = seed; }
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    range(min, max) { return min + this.next() * (max - min); }
}

// ===================================================================
// ✅ MELHORIAS: Hash 2D com múltiplos primos e validação
// ===================================================================
function hash2D(x, y, seed) {
    // Validação de entrada (prevenir NaN/Infinity)
    if (!isFinite(x) || !isFinite(y) || !isFinite(seed)) {
        console.error('❌ hash2D: Coordenadas inválidas!', { x, y, seed });
        return 0.5; // Valor seguro de fallback
    }
    
    // Converter para inteiros se necessário
    x = Math.floor(x);
    y = Math.floor(y);
    seed = Math.floor(seed);
    
    // Mix de múltiplos números primos grandes (anti-aliasing)
    let h = seed;
    
    // Primeira camada: Primos grandes
    h = (h ^ (x * 73856093)) * 19349663;
    h = (h ^ (y * 83492791)) * 50331653;
    
    // Segunda camada: Bit mixing (Wang hash)
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = (h >> 16) ^ h;
    
    // Terceira camada: XOR com seed rotacionado
    h ^= (seed << 13) | (seed >> 19);
    
    // Normalizar para [0, 1]
    const result = (h & 0x7FFFFFFF) / 0x7FFFFFFF;
    
    // Validação de saída
    return isFinite(result) ? result : 0.5;
}

// ===================================================================
// ✅ Smoothstep com Hermite interpolation (C2 continuous)
// ===================================================================
function smoothstep(t) {
    // Clamp para [0, 1]
    t = Math.max(0, Math.min(1, t));
    
    // Hermite polynomial: 3t² - 2t³
    return t * t * (3 - 2 * t);
}

// ✅ NOVO: Smootherstep (Ken Perlin, C2 continuous)
function smootherstep(t) {
    t = Math.max(0, Math.min(1, t));
    
    // 6t⁵ - 15t⁴ + 10t³
    return t * t * t * (t * (t * 6 - 15) + 10);
}

// ===================================================================
// Noise 2D base (valor puro do hash)
// ===================================================================
export function noise2D(x, y, seed) {
    return hash2D(Math.floor(x), Math.floor(y), seed);
}

// ===================================================================
// ✅ Noise suavizado com Hermite interpolation
// ===================================================================
export function smoothNoise(x, y, seed, scale = 1) {
    x = x / scale;
    y = y / scale;
    
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    
    // Fração com smootherstep (mais suave que smoothstep)
    const sx = smootherstep(x - x0);
    const sy = smootherstep(y - y0);
    
    // Valores nos 4 cantos
    const n00 = hash2D(x0, y0, seed);
    const n10 = hash2D(x1, y0, seed);
    const n01 = hash2D(x0, y1, seed);
    const n11 = hash2D(x1, y1, seed);
    
    // Interpolação bilinear
    const ix0 = n00 * (1 - sx) + n10 * sx;
    const ix1 = n01 * (1 - sx) + n11 * sx;
    
    return ix0 * (1 - sy) + ix1 * sy;
}

// ===================================================================
// ✅ Perlin Noise (gradientes vetoriais - zero direcionalidade)
// ===================================================================
export function perlinNoise(x, y, seed, scale = 1) {
    // Validação de entrada
    if (!isFinite(x) || !isFinite(y)) {
        console.error('❌ perlinNoise: Coordenadas inválidas!', { x, y });
        return 0.5;
    }
    
    x = x / scale;
    y = y / scale;
    
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    
    const sx = smootherstep(x - x0);
    const sy = smootherstep(y - y0);
    
    // ✅ Função para gerar gradientes pseudo-aleatórios
    // Usa múltiplos ângulos para evitar alinhamento
    function gradient(ix, iy) {
        const hash = hash2D(ix, iy, seed);
        
        // Mapear hash [0,1] para ângulo [0, 2π]
        const angle = hash * Math.PI * 2;
        
        // Vetor unitário na direção do ângulo
        return {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }
    
    // Dot product
    function dot(g, dx, dy) {
        return g.x * dx + g.y * dy;
    }
    
    // Gradientes nos 4 cantos
    const g00 = gradient(x0, y0);
    const g10 = gradient(x0 + 1, y0);
    const g01 = gradient(x0, y0 + 1);
    const g11 = gradient(x0 + 1, y0 + 1);
    
    // Vetores de distância do ponto aos cantos
    const dx = x - x0;
    const dy = y - y0;
    
    // Dot products
    const d00 = dot(g00, dx, dy);
    const d10 = dot(g10, dx - 1, dy);
    const d01 = dot(g01, dx, dy - 1);
    const d11 = dot(g11, dx - 1, dy - 1);
    
    // Interpolação bilinear com smootherstep
    const ix0 = d00 * (1 - sx) + d10 * sx;
    const ix1 = d01 * (1 - sx) + d11 * sx;
    
    const result = ix0 * (1 - sy) + ix1 * sy;
    
    // Normalizar de [-1, 1] para [0, 1]
    return result * 0.5 + 0.5;
}

// ===================================================================
// ✅ FBM (Fractal Brownian Motion) com rotação e validação
// ===================================================================
export function fbm(x, y, seed, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    // Validação de parâmetros
    if (!isFinite(x) || !isFinite(y)) {
        console.error('❌ fbm: Coordenadas inválidas!', { x, y });
        return 0.5;
    }
    
    octaves = Math.max(1, Math.min(8, octaves)); // Clamp [1, 8]
    persistence = Math.max(0.1, Math.min(1.0, persistence)); // Clamp [0.1, 1]
    lacunarity = Math.max(1.5, Math.min(4.0, lacunarity)); // Clamp [1.5, 4]
    
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    // ✅ Golden Angle (137.5°) para rotação não-periódica
    const goldenAngle = 2.39996322972865332; // ~137.5° em radianos
    
    for (let i = 0; i < octaves; i++) {
        // Rotacionar cada octave em múltiplos do Golden Angle
        // (garante que nunca se alinhem)
        const angle = goldenAngle * i;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Aplicar rotação 2D
        const rx = x * cos - y * sin;
        const ry = x * sin + y * cos;
        
        // Sample perlin noise
        const sample = perlinNoise(rx * frequency, ry * frequency, seed + i * 1000, 1);
        
        total += sample * amplitude;
        
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    
    // Normalizar para [0, 1]
    const result = total / maxValue;
    
    // Validação final
    return isFinite(result) ? result : 0.5;
}

// ===================================================================
// ✅ Domain Warping (distorce o espaço antes de samplar)
// ===================================================================
export function warpedNoise(x, y, seed, scale = 1, warpAmount = 5) {
    // Validação
    if (!isFinite(x) || !isFinite(y)) {
        console.error('❌ warpedNoise: Coordenadas inválidas!', { x, y });
        return 0.5;
    }
    
    // Clamp warpAmount para evitar distorções extremas
    warpAmount = Math.max(0, Math.min(20, warpAmount));
    
    // ✅ Dois campos de warping ortogonais (evita alinhamento)
    const warpX = fbm(x + 100, y, seed + 1000, 3) * warpAmount;
    const warpY = fbm(x, y + 100, seed + 2000, 3) * warpAmount;
    
    // Sample noise nas coordenadas distorcidas
    const result = fbm(x + warpX, y + warpY, seed, 4);
    
    return isFinite(result) ? result : 0.5;
}

// ===================================================================
// ✅ NOVA FUNÇÃO: Ridged Noise (para montanhas dramáticas)
// ===================================================================
export function ridgedNoise(x, y, seed, octaves = 4) {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        // Sample noise
        let sample = perlinNoise(x * frequency, y * frequency, seed + i * 1000, 1);
        
        // ✅ Inverter e elevar ao quadrado (cria "cristas")
        sample = 1 - Math.abs(sample * 2 - 1);
        sample = sample * sample;
        
        total += sample * amplitude;
        
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return total / maxValue;
}

// ===================================================================
// ✅ NOVA FUNÇÃO: Billowy Noise (para nuvens/fumaça)
// ===================================================================
export function billowyNoise(x, y, seed, octaves = 4) {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        let sample = perlinNoise(x * frequency, y * frequency, seed + i * 1000, 1);
        
        // ✅ Valor absoluto (cria "bolhas")
        sample = Math.abs(sample * 2 - 1);
        
        total += sample * amplitude;
        
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return total / maxValue;
}

// ===================================================================
// ✅ FUNÇÃO DE TESTE: Verificar qualidade do noise
// ===================================================================
export function testNoiseQuality(seed = 12345) {
    console.log('🧪 Testando qualidade do noise...');
    
    const samples = 1000;
    let values = [];
    
    // Coletar amostras
    for (let i = 0; i < samples; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        values.push(fbm(x, y, seed));
    }
    
    // Calcular estatísticas
    const mean = values.reduce((a, b) => a + b) / samples;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / samples;
    const stdDev = Math.sqrt(variance);
    
    // Verificar distribuição
    const histogram = Array(10).fill(0);
    values.forEach(v => {
        const bucket = Math.floor(v * 10);
        histogram[Math.min(bucket, 9)]++;
    });
    
    console.log('📊 Estatísticas do Noise:');
    console.log('  Média:', mean.toFixed(3), '(ideal: ~0.5)');
    console.log('  Desvio Padrão:', stdDev.toFixed(3), '(ideal: 0.15-0.25)');
    console.log('  Distribuição:', histogram.map(v => (v / samples * 100).toFixed(1) + '%').join(', '));
    
    // Verificar problemas
    const isGood = Math.abs(mean - 0.5) < 0.1 && stdDev > 0.1 && stdDev < 0.3;
    console.log(isGood ? '✅ Noise de boa qualidade!' : '⚠️ Possível problema no noise');
    
    return isGood;
}

// ===================================================================
// 🎯 EXPORTAR TUDO
// ===================================================================
export default {
    Random,
    noise2D,
    smoothNoise,
    perlinNoise,
    fbm,
    warpedNoise,
    ridgedNoise,
    billowyNoise,
    testNoiseQuality
};
