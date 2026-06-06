/**
 * Minimap.js
 *
 * Melhorias de performance vs versão anterior:
 *  - Atualiza por intervalo de tempo real (1s) em vez de a cada N frames
 *  - Cache de cor por string de bioma — evita recriar THREE.Color a cada pixel
 *  - `putImageData` em vez de fillRect por pixel — um único flush no canvas
 *  - Seta do jogador sempre atualizada (separada do mapa de biomas)
 */

import { getHeight, getBiome, getMoisture } from '../world/Terrain.js';

export class Minimap {
    constructor(canvasId, config) {
        this.config   = config;
        this._lastUpdate = 0;
        this._interval   = 1000; // ms entre renders do mapa de biomas

        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        const SIZE = 200;
        this.SIZE  = SIZE;
        this.canvas.width  = SIZE;
        this.canvas.height = SIZE;
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // ImageData reutilizável — evita alocação a cada frame
        this._imgData = this.ctx.createImageData(SIZE, SIZE);

        // Cache de cor por bioma (string → [r,g,b])
        this._colorCache = {};

        // Última posição conhecida — evita redesenhar se parado
        this._lastX = null;
        this._lastZ = null;
        this._lastSeed = null;
    }

    // -----------------------------------------------------------------------
    _biomeRGB(biome, wx, wz) {
        const key = biome.toUpperCase();

        // Variante escura para florestas densas
        let cacheKey = key;
        if (['FOREST', 'JUNGLE', 'MUSHROOM'].includes(key)) {
            const dark = Math.sin(wx * 0.5) * Math.cos(wz * 0.5) > 0.5;
            cacheKey = dark ? key + '_D' : key;
        }

        if (this._colorCache[cacheKey]) return this._colorCache[cacheKey];

        const hexColor = this.config.COLORS[key];
        if (hexColor === undefined) { this._colorCache[cacheKey] = [0, 0, 0]; return [0, 0, 0]; }

        const c = new THREE.Color(hexColor);
        if (cacheKey.endsWith('_D')) c.multiplyScalar(0.7);

        const rgb = [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
        this._colorCache[cacheKey] = rgb;
        return rgb;
    }

    // -----------------------------------------------------------------------
    // update() — chamado no animate(); redesenha biomas max 1×/s,
    // seta do jogador sempre.
    //
    // CORREÇÃO: a condição anterior exigia que playerX/Z ou seed mudassem
    // para disparar o redesenho. Isso quebrava o minimap quando o usuário
    // alterava sliders de relevo/bioma (PANEL_STATE) sem se mover —
    // o mapa ficava congelado. Agora basta o intervalo de tempo transcorrer.
    // O _colorCache é limpo a cada render porque os biomas podem mudar via
    // PANEL_STATE sem que a seed ou posição se alterem.
    // -----------------------------------------------------------------------
    update(playerX, playerZ, seed, rotationY) {
        if (!this.ctx) return;

        const now = performance.now();

        if (now - this._lastUpdate >= this._interval) {
            this._lastUpdate = now;
            this._lastX      = playerX;
            this._lastZ      = playerZ;
            this._lastSeed   = seed;
            // Invalida cache de cor: biomas podem ter mudado via PANEL_STATE
            this._colorCache = {};
            this._renderBiomes(playerX, playerZ, seed);
        }

        this._renderArrow(rotationY);
    }

    _renderBiomes(playerX, playerZ, seed) {
        const SIZE       = this.SIZE;
        const worldScale = 4;
        const pixelSize  = 4;
        const cx = SIZE / 2;
        const cz = SIZE / 2;
        const data = this._imgData.data;

        // Preenche fundo preto
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255;
        }

        for (let px = 0; px < SIZE; px += pixelSize) {
            for (let pz = 0; pz < SIZE; pz += pixelSize) {
                const wx = playerX + (px - cx) * worldScale;
                const wz = playerZ + (pz - cz) * worldScale;

                const height   = getHeight(wx, wz, seed);
                const moisture = getMoisture(wx, wz, seed);
                const biome    = getBiome(height, moisture);
                const [r, g, b] = this._biomeRGB(biome, wx, wz);

                // Pintar o bloco pixelSize×pixelSize no ImageData
                for (let dy = 0; dy < pixelSize && pz + dy < SIZE; dy++) {
                    for (let dx = 0; dx < pixelSize && px + dx < SIZE; dx++) {
                        const idx = ((pz + dy) * SIZE + (px + dx)) * 4;
                        data[idx]     = r;
                        data[idx + 1] = g;
                        data[idx + 2] = b;
                        data[idx + 3] = 255;
                    }
                }
            }
        }

        this.ctx.putImageData(this._imgData, 0, 0);
    }

    _renderArrow(rotationY) {
        if (!this.ctx) return;
        const cx = this.SIZE / 2;
        const cz = this.SIZE / 2;

        // Apaga só a área central da seta (pequeno círculo)
        // — o mapa de biomas já foi desenhado; só sobrepõe a seta
        this.ctx.save();
        this.ctx.translate(cx, cz);
        this.ctx.rotate(-rotationY);
        this.ctx.fillStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -6);
        this.ctx.lineTo(5, 5);
        this.ctx.lineTo(0, 2);
        this.ctx.lineTo(-5, 5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }
}
