/**
 * HUD.js
 * 
 * Atualiza todos os elementos de interface sobrepostos ao canvas:
 *   - Contador de FPS
 *   - HUD de altitude / profundidade / distância ao espaço
 *   - Estatísticas do planeta (chunks, altura, cobertura)
 * 
 * Uso:
 *   const hud = new HUD(cameraConstraints, planetSystem);
 *   hud.updateStats();              // no animate() — throttled internamente
 *   hud.updateAltitude(terrH, constraintInfo);  // no animate()
 *   hud.updatePlanetStats();        // no animate() — throttled internamente
 */

export class HUD {
    constructor(cameraConstraints, planetSystem) {
        this.cameraConstraints = cameraConstraints;
        this.planetSystem      = planetSystem;

        // FPS
        this._frameCount = 0;
        this._lastTime   = performance.now();
    }

    // -----------------------------------------------------------------------
    // FPS — atualiza uma vez por segundo
    // -----------------------------------------------------------------------
    updateStats() {
        this._frameCount++;
        const now = performance.now();

        if (now >= this._lastTime + 1000) {
            const fps = Math.round(this._frameCount * 1000 / (now - this._lastTime));
            this._frameCount = 0;
            this._lastTime   = now;

            const el = document.getElementById('fps');
            if (el) el.textContent = fps;
        }
    }

    // -----------------------------------------------------------------------
    // HUD de altitude e limites planetários
    // -----------------------------------------------------------------------
    updateAltitude(terrainHeight, constraintInfo) {
        const info = this.cameraConstraints.getDebugInfo(terrainHeight);

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        set('hud-altitude', info.altitude);
        set('hud-depth',    info.depth);
        set('hud-terrain',  info.terrainHeight);
        set('hud-space',    info.distanceToSpace);
        set('hud-bedrock',  info.distanceToBedrock);

        const spaceWarning   = document.getElementById('space-warning');
        const bedrockWarning = document.getElementById('bedrock-warning');

        if (spaceWarning) {
            spaceWarning.classList.toggle('danger',  constraintInfo.isAtMaxHeight);
            spaceWarning.classList.toggle('warning',
                !constraintInfo.isAtMaxHeight && parseFloat(info.distanceToSpace) < 1000
            );
        }

        if (bedrockWarning) {
            bedrockWarning.classList.toggle('danger',  constraintInfo.isAtBedrock);
            bedrockWarning.classList.toggle('warning',
                !constraintInfo.isAtBedrock && parseFloat(info.distanceToBedrock) < 50
            );
        }
    }

    // -----------------------------------------------------------------------
    // Estatísticas do planeta
    // -----------------------------------------------------------------------
    updatePlanetStats() {
        const stats = this.planetSystem.getPlanetStats();

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        set('planet-chunks',     stats.totalChunks);
        set('planet-max-height', stats.heightRange.max + 'm');
        set('planet-min-height', stats.heightRange.min + 'm');
        set('planet-coverage',   stats.coverage + ' km²');
    }

    // -----------------------------------------------------------------------
    // Posição e altitude do jogador (canto do HUD)
    // -----------------------------------------------------------------------
    updatePosition(x, y, z) {
        const elPos = document.getElementById('position');
        if (elPos) elPos.textContent = `${Math.floor(x)}, ${Math.floor(z)}`;

        const elAlt = document.getElementById('altitude');
        if (elAlt) elAlt.textContent = Math.floor(y);
    }

    // -----------------------------------------------------------------------
    // Chunk count
    // -----------------------------------------------------------------------
    updateChunkCount(count) {
        const el = document.getElementById('chunk-count');
        if (el) el.textContent = count;
    }
}
