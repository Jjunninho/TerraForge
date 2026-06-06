/**
 * BuilderMinimap.js
 *
 * Minimap para o Builder. Funciona nos dois modos:
 *   - EDITOR   : mostra posição do alvo da câmera OrbitControls (centro do mapa)
 *   - EXPLORAR : mostra posição FPS + seta direcional
 *
 * Importa getHeight / getBiome / getMoisture do Terrain.js do mundo procedural
 * (o mesmo usado pelo TerrainManager do builder) para colorir os biomas.
 *
 * Atualiza o mapa de biomas a cada 1s e a seta a cada frame.
 * O _colorCache é invalidado a cada render para refletir mudanças do PANEL_STATE.
 */

import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { getHeight, getBiome, getMoisture } from '../world/Terrain.js';
import { CONFIG } from '../config.js';

export class BuilderMinimap {
    constructor(canvasId) {
        this._interval   = 1000; // ms entre renders do mapa de biomas
        this._lastUpdate = 0;

        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn(`[BuilderMinimap] Canvas #${canvasId} não encontrado.`);
            return;
        }

        const SIZE = 180;
        this.SIZE  = SIZE;
        this.canvas.width  = SIZE;
        this.canvas.height = SIZE;
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // ImageData reutilizável
        this._imgData    = this.ctx.createImageData(SIZE, SIZE);
        this._colorCache = {};

        // Estado de posição/rotação
        this._cx  = 0;   // centro X (câmera ou alvo)
        this._cz  = 0;   // centro Z
        this._yaw = 0;   // rotação Y para a seta (só no modo FPS)
        this._fpsMode = false; // mostra seta apenas no modo FPS
    }

    // -----------------------------------------------------------------------
    // update() — chamado no animate() do BuilderManager
    //   builder : referência ao BuilderManager
    // -----------------------------------------------------------------------
    update(builder) {
        if (!this.ctx) return;

        const cam      = builder.graphics.camera;
        const explorer = builder.explorer;
        const seed     = builder.currentSeed || (typeof PANEL_STATE !== 'undefined' ? PANEL_STATE.seed : 12345) || 12345;

        if (explorer && explorer.active) {
            // Modo FPS: usar posição real da câmera
            this._cx      = cam.position.x;
            this._cz      = cam.position.z;
            this._yaw     = cam.rotation.y;
            this._fpsMode = true;
        } else {
            // Modo editor: usar alvo do OrbitControls (centro da órbita)
            const ctrl = builder.graphics.controls;
            if (ctrl && ctrl.target) {
                this._cx = ctrl.target.x;
                this._cz = ctrl.target.z;
            } else {
                this._cx = cam.position.x;
                this._cz = cam.position.z;
            }
            this._fpsMode = false;
        }

        const now = performance.now();
        if (now - this._lastUpdate >= this._interval) {
            this._lastUpdate = now;
            this._colorCache = {}; // invalida cache — PANEL_STATE pode ter mudado
            this._renderBiomes(this._cx, this._cz, seed);
        }

        this._renderArrow(this._fpsMode ? this._yaw : null);
    }

    // -----------------------------------------------------------------------
    _renderBiomes(cx, cz, seed) {
        const SIZE       = this.SIZE;
        const worldScale = 3.5;   // metros de mundo por pixel
        const pixelSize  = 3;
        const half       = SIZE / 2;
        const data       = this._imgData.data;

        // Fundo preto
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255;
        }

        for (let px = 0; px < SIZE; px += pixelSize) {
            for (let pz = 0; pz < SIZE; pz += pixelSize) {
                const wx = cx + (px - half) * worldScale;
                const wz = cz + (pz - half) * worldScale;

                const height   = getHeight(wx, wz, seed);
                const moisture = getMoisture(wx, wz, seed);
                const biome    = getBiome(height, moisture);
                const [r, g, b] = this._biomeRGB(biome, wx, wz);

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

        // Borda circular para recorte visual
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-in';
        this.ctx.beginPath();
        this.ctx.arc(half, half, half, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.restore();
    }

    // -----------------------------------------------------------------------
    _renderArrow(yaw) {
        if (!this.ctx) return;
        const half = this.SIZE / 2;

        this.ctx.save();
        this.ctx.translate(half, half);

        if (yaw !== null) {
            // Modo FPS: seta direcional vermelha
            this.ctx.rotate(-yaw);
            this.ctx.fillStyle = '#FF3333';
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -7);
            this.ctx.lineTo(5, 6);
            this.ctx.lineTo(0, 3);
            this.ctx.lineTo(-5, 6);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        } else {
            // Modo editor: ponto central cinza (sem direção)
            this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    // -----------------------------------------------------------------------
    _biomeRGB(biome, wx, wz) {
        const key = biome.toUpperCase();
        let cacheKey = key;
        if (['FOREST', 'JUNGLE', 'MUSHROOM'].includes(key)) {
            const dark = Math.sin(wx * 0.5) * Math.cos(wz * 0.5) > 0.5;
            cacheKey = dark ? key + '_D' : key;
        }

        if (this._colorCache[cacheKey]) return this._colorCache[cacheKey];

        const hexColor = CONFIG.COLORS[key];
        if (hexColor === undefined) {
            this._colorCache[cacheKey] = [30, 30, 30];
            return [30, 30, 30];
        }

        const c = new THREE.Color(hexColor);
        if (cacheKey.endsWith('_D')) c.multiplyScalar(0.7);

        const rgb = [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
        this._colorCache[cacheKey] = rgb;
        return rgb;
    }
}
