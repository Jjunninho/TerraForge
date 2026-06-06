/**
 * ExplorerMode.js
 * 
 * Modo de exploração em primeira pessoa para o Builder.
 * Tecla G alterna entre:
 *   - EDITOR  : OrbitControls ativo, cursor livre, ferramentas funcionando
 *   - EXPLORAR: OrbitControls desativado, PointerLock + WASD FPS
 * 
 * Reutiliza a mesma lógica de movimento/física do Mundo Procedural,
 * mas dentro do terreno editado do Builder (TerrainManager).
 * A altura do terreno é lida por interpolação bilinear dos vértices
 * (igual ao _getEditedTerrainHeight do Tools.js) para respeitar edições manuais.
 */

export class ExplorerMode {

    /**
     * @param {BuilderManager} builder  - Referência ao BuilderManager
     */
    constructor(builder) {
        this.builder  = builder;
        this.active   = false;

        // Estado de movimento
        this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false };

        // Física — escala humana proporcional às árvores (~2.5u com globalScale=0.5)
        // Árvore real ~8m → 2.5u, então 1u ≈ 3.2m. Humano 1.75m ≈ 0.55u
        this.PLAYER_H  = 0.03;
        this.SPEED     = 8.0;
        this.FLY_SPEED = 20.0;
        this.GRAVITY   = 9.8;
        this.JUMP_F    = 1.2;
        this.velocityY = 0;
        this.canJump   = false;
        this.flying    = false; // começa no chão no modo exploração

        // Rotação de câmera (acumuladores)
        this.yaw   = 0;
        this.pitch = 0;

        // Salva estado da câmera para restaurar ao sair
        this._savedCamPos = null;
        this._savedCamRot = null;

        this._setupListeners();
        this._createHUD();
    }

    // -------------------------------------------------------------------------
    // Setup de eventos
    // -------------------------------------------------------------------------
    _setupListeners() {
        // Toggle G
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyG') this.toggle();
        });

        // WASD + Space + Shift
        document.addEventListener('keydown', (e) => {
            if (!this.active) return;
            switch (e.code) {
                case 'KeyW':      this.keys.w     = true; break;
                case 'KeyS':      this.keys.s     = true; break;
                case 'KeyA':      this.keys.a     = true; break;
                case 'KeyD':      this.keys.d     = true; break;
                case 'Space':     this.keys.space  = true; e.preventDefault(); break;
                case 'ShiftLeft':
                case 'ShiftRight': this.keys.shift = true; break;
                case 'KeyF':      if (e.type === 'keydown') this.flying = !this.flying; break;
            }
        });
        document.addEventListener('keyup', (e) => {
            if (!this.active) return;
            switch (e.code) {
                case 'KeyW':      this.keys.w     = false; break;
                case 'KeyS':      this.keys.s     = false; break;
                case 'KeyA':      this.keys.a     = false; break;
                case 'KeyD':      this.keys.d     = false; break;
                case 'Space':     this.keys.space  = false; break;
                case 'ShiftLeft':
                case 'ShiftRight': this.keys.shift = false; break;
            }
        });

        // Mouse (PointerLock)
        document.addEventListener('mousemove', (e) => {
            if (!this.active || document.pointerLockElement !== this.builder.graphics.renderer.domElement) return;
            this.yaw   -= e.movementX * 0.002;
            this.pitch  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch - e.movementY * 0.002));
        });

        // Saída do PointerLock = sair do modo exploração
        document.addEventListener('pointerlockchange', () => {
            if (this.active && document.pointerLockElement !== this.builder.graphics.renderer.domElement) {
                this._deactivate();
            }
        });
    }

    // -------------------------------------------------------------------------
    // HUD de modo
    // -------------------------------------------------------------------------
    _createHUD() {
        this.hud = document.createElement('div');
        this.hud.id = 'explorer-hud';
        this.hud.style.cssText = `
            display:none; position:fixed; top:12px; left:50%;
            transform:translateX(-50%);
            background:rgba(0,0,0,0.55); color:#fff;
            font-family:monospace; font-size:13px;
            padding:6px 16px; border-radius:8px;
            pointer-events:none; z-index:9999;
            letter-spacing:0.05em;
        `;
        this.hud.textContent = '🎮 EXPLORAR  |  G = sair  |  WASD mover  |  F = voo  |  ESC = sair';
        document.body.appendChild(this.hud);
    }

    // -------------------------------------------------------------------------
    // Ativar / Desativar
    // -------------------------------------------------------------------------
    toggle() {
        if (this.active) {
            this._deactivate();
        } else {
            this._activate();
        }
    }

    _activate() {
        this.active = true;

        // Salva estado da câmera do editor
        const cam = this.builder.graphics.camera;
        this._savedCamPos = cam.position.clone();
        this._savedCamRot = cam.rotation.clone();

        // Desativa OrbitControls
        this.builder.graphics.controls.enabled = false;

        // Desativa TransformControls para evitar conflito com PointerLock
        if (this.builder.tools && this.builder.tools.transformControl) {
            this.builder.tools.transformControl.enabled = false;
        }

        // Posiciona o jogador no X,Z da câmera mas POUSADO no terreno imediatamente
        const groundH = this._getTerrainHeight(cam.position.x, cam.position.z);
        this.playerPos = new THREE.Vector3(
            cam.position.x,
            groundH + this.PLAYER_H,  // já no chão, sem queda livre do editor
            cam.position.z
        );
        this.velocityY = 0;
        this.canJump   = true;  // já está no chão

        // Inicializa yaw com a direção atual da câmera
        this.yaw   = cam.rotation.y;
        this.pitch = 0;

        // Solicita PointerLock
        this.builder.graphics.renderer.domElement.requestPointerLock();

        // Mostra HUD
        this.hud.style.display = 'block';

        console.log('🎮 Modo Exploração ATIVADO — G ou ESC para sair');
    }

    _deactivate() {
        this.active = false;

        // Reativa OrbitControls
        this.builder.graphics.controls.enabled = true;

        // Reativa TransformControls
        if (this.builder.tools && this.builder.tools.transformControl) {
            this.builder.tools.transformControl.enabled = true;
        }

        // Restaura câmera do editor
        if (this._savedCamPos) {
            const cam = this.builder.graphics.camera;
            cam.position.copy(this._savedCamPos);
            cam.rotation.copy(this._savedCamRot);
        }

        // Libera PointerLock se ainda ativo
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Esconde HUD
        this.hud.style.display = 'none';

        console.log('🗺️ Modo Editor restaurado');
    }

    // -------------------------------------------------------------------------
    // Loop de atualização — chamado no animate() do BuilderManager
    // -------------------------------------------------------------------------
    update(delta) {
        if (!this.active) return;

        const cam   = this.builder.graphics.camera;
        const speed = this.flying ? this.FLY_SPEED : this.SPEED;

        // Movimento horizontal — relativo ao yaw
        const dx = (this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0);
        const dz = (this.keys.s ? 1 : 0) - (this.keys.w ? 1 : 0);

        if (dx !== 0 || dz !== 0) {
            const len = Math.sqrt(dx * dx + dz * dz);
            const nx  = dx / len;
            const nz  = dz / len;
            const cos = Math.cos(this.yaw);
            const sin = Math.sin(this.yaw);
            this.playerPos.x += (nx * cos - nz * sin) * speed * delta;
            this.playerPos.z += (nx * sin + nz * cos) * speed * delta;
        }

        // Física vertical
        const terrH = this._getTerrainHeight(this.playerPos.x, this.playerPos.z);

        if (this.flying) {
            if (this.keys.space) this.playerPos.y += this.FLY_SPEED * delta;
            if (this.keys.shift) this.playerPos.y -= this.FLY_SPEED * delta;
            this.velocityY = 0;
            // piso mesmo em voo
            if (this.playerPos.y < terrH + this.PLAYER_H) {
                this.playerPos.y = terrH + this.PLAYER_H;
            }
        } else {
            this.velocityY -= this.GRAVITY * delta;
            if (this.keys.space && this.canJump) {
                this.velocityY = this.JUMP_F;
                this.canJump   = false;
            }
            this.playerPos.y += this.velocityY * delta;
            if (this.playerPos.y < terrH + this.PLAYER_H) {
                this.playerPos.y = terrH + this.PLAYER_H;
                this.velocityY   = 0;
                this.canJump     = true;
            }
        }

        // Aplica à câmera (FPS — olho do personagem)
        cam.position.set(
            this.playerPos.x,
            this.playerPos.y + this.PLAYER_H * 0.5, // olhos = meio da altura
            this.playerPos.z
        );
        cam.rotation.order = 'YXZ';
        cam.rotation.y = this.yaw;
        cam.rotation.x = this.pitch;
    }

    // -------------------------------------------------------------------------
    // Altura do terreno — lê da geometria editada (mesma lógica do Tools.js)
    // -------------------------------------------------------------------------
    _getTerrainHeight(wx, wz) {
        const mesh = this.builder.terrain.mesh;
        if (!mesh) return 0;

        const pos = mesh.geometry.attributes.position;

        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }

        let segsX = 0;
        const firstZ = pos.getZ(0);
        for (let i = 0; i < pos.count; i++) {
            if (Math.abs(pos.getZ(i) - firstZ) < 0.001) segsX++;
            else break;
        }
        const segsZ = pos.count / segsX - 1;

        const fx = Math.max(0, Math.min(segsX - 2, (wx - minX) / (maxX - minX) * (segsX - 1)));
        const fz = Math.max(0, Math.min(segsZ - 1, (wz - minZ) / (maxZ - minZ) * segsZ));

        const ix = Math.floor(fx), iz = Math.floor(fz);
        const tx = fx - ix,        tz = fz - iz;

        const i00 = iz       * segsX + ix;
        const i10 = iz       * segsX + ix + 1;
        const i01 = (iz + 1) * segsX + ix;
        const i11 = (iz + 1) * segsX + ix + 1;

        const h00 = pos.getY(i00);
        const h10 = pos.getY(Math.min(i10, pos.count - 1));
        const h01 = pos.getY(Math.min(i01, pos.count - 1));
        const h11 = pos.getY(Math.min(i11, pos.count - 1));

        return h00 * (1 - tx) * (1 - tz)
             + h10 * tx       * (1 - tz)
             + h01 * (1 - tx) * tz
             + h11 * tx       * tz;
    }
}
