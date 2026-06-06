/**
 * PlayerController.js
 * 
 * Encapsula a posição/rotação do corpo do jogador e o gerenciamento
 * de câmera para dois modos:
 *   - FPS  : câmera colada no olho do personagem (comportamento anterior)
 *   - 3ª P : câmera em offset atrás/acima, personagem visível como cápsula
 * 
 * A física (gravidade, pulo, colisão com terreno) continua no main.js —
 * este módulo apenas expõe `position` e `rotationY` como superfície de
 * controle, e gerencia a câmera de acordo com o modo ativo.
 * 
 * Tecla V alterna entre os modos em tempo real.
 */

export class PlayerController {

    /**
     * @param {THREE.Camera}  camera   - A câmera da cena (PerspectiveCamera)
     * @param {THREE.Scene}   scene    - Cena Three.js (para adicionar a mesh)
     * @param {number} playerHeight    - Altura dos olhos em unidades (default 2)
     */
    constructor(camera, scene, playerHeight = 2.0) {
        this.camera      = camera;
        this.scene       = scene;
        this.PLAYER_H    = playerHeight;

        // Posição e orientação lógica do corpo — é isso que a física atualiza
        this.position  = new THREE.Vector3();
        this.rotationY = 0; // yaw horizontal (controlado pelo mouse)

        // Modo atual
        this.mode = 'fps'; // 'fps' | 'third'

        // Parâmetros da câmera em 3ª pessoa
        this.thirdPerson = {
            distance : 8,    // distância atrás do corpo
            height   : 4,    // altura acima do corpo
            pitchX   : 0,    // pitch vindo do mouse (targetRotationX do main.js)
        };

        // Inicializa a câmera na posição do spawn (será sobrescrita no primeiro frame)
        this.position.copy(camera.position);

        // Cria a mesh de cápsula que representa o corpo
        this._createBodyMesh();

        // Listener de toggle
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyV') this.toggleMode();
        });
    }

    // -------------------------------------------------------------------------
    // Mesh do corpo (cápsula simples com cilindro + duas esferas)
    // -------------------------------------------------------------------------
    _createBodyMesh() {
        this.bodyGroup = new THREE.Group();

        // Cilindro — tronco
        const torsoGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
        const mat      = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.8 });
        const torso    = new THREE.Mesh(torsoGeo, mat);
        torso.position.y = 0.6; // base em y=0
        torso.castShadow = true;

        // Esfera — cabeça
        const headGeo  = new THREE.SphereGeometry(0.4, 8, 6);
        const head     = new THREE.Mesh(headGeo, mat);
        head.position.y = 1.6;
        head.castShadow = true;

        // Esfera menor — pés (arredonda a base)
        const feetGeo  = new THREE.SphereGeometry(0.4, 8, 6);
        const feet     = new THREE.Mesh(feetGeo, mat);
        feet.position.y = 0.0;

        this.bodyGroup.add(torso, head, feet);
        this.bodyGroup.visible = false; // invisível em FPS
        this.scene.add(this.bodyGroup);
    }

    // -------------------------------------------------------------------------
    // API pública — chamada pelo main.js a cada frame APÓS atualizar this.position
    // -------------------------------------------------------------------------

    /**
     * Atualiza câmera e mesh a partir da posição/rotação lógica do corpo.
     * Deve ser chamado no final do bloco de física do main.js, passando
     * targetRotationY e targetRotationX do sistema de mouse.
     * 
     * @param {number} yaw   - targetRotationY (radianos)
     * @param {number} pitch - targetRotationX (radianos, clampado)
     */
    update(yaw, pitch) {
        this.rotationY = yaw;
        this.thirdPerson.pitchX = pitch;

        // Posiciona e orienta a mesh do corpo
        this.bodyGroup.position.copy(this.position);
        this.bodyGroup.rotation.y = yaw;

        if (this.mode === 'fps') {
            this._updateFPS(yaw, pitch);
        } else {
            this._updateThirdPerson(yaw, pitch);
        }
    }

    _updateFPS(yaw, pitch) {
        // Câmera = olho do personagem
        this.camera.position.copy(this.position);
        this.camera.position.y += this.PLAYER_H; // sobe para a altura dos olhos

        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = yaw;
        this.camera.rotation.x = pitch;
    }

    _updateThirdPerson(yaw, pitch) {
        // Câmera fica atrás e acima do corpo, olhando para ele
        const { distance, height } = this.thirdPerson;

        // Ponto alvo = cabeça do personagem
        const target = this.position.clone();
        target.y += this.PLAYER_H;

        // Offset esférico baseado no yaw e um pitch fixo levemente para baixo
        const camPitch = Math.max(-0.6, Math.min(0.3, pitch)); // limita para não girar embaixo
        const offsetX  = -Math.sin(yaw)  * Math.cos(camPitch) * distance;
        const offsetZ  = -Math.cos(yaw)  * Math.cos(camPitch) * distance;
        const offsetY  =  Math.sin(camPitch < 0 ? -camPitch : 0.25) * distance + height;

        this.camera.position.set(
            this.position.x + offsetX,
            this.position.y + offsetY,
            this.position.z + offsetZ
        );

        this.camera.lookAt(target);
    }

    // -------------------------------------------------------------------------
    // Toggle de modo
    // -------------------------------------------------------------------------
    toggleMode() {
        this.mode = this.mode === 'fps' ? 'third' : 'fps';
        this.bodyGroup.visible = (this.mode === 'third');

        const label = document.getElementById('flight-mode');
        if (label) {
            const flyTxt = label.textContent.includes('Voo') ? 'Voo Livre' : 'Terrestre';
            // mantém o texto de modo de voo, adiciona sufixo de câmera
        }

        console.log(`📷 Câmera: ${this.mode === 'fps' ? 'Primeira Pessoa' : 'Terceira Pessoa'}`);
    }

    isThirdPerson() {
        return this.mode === 'third';
    }
}
