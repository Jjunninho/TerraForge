import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { TransformControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/TransformControls.js';

export class ToolManager {
    constructor(builder) {
        this.builder = builder;
        this.activeTool = null;
        this.brush = { 
            radius: 15,
            strength: 25,
            smoothness: 50,
            helper: null 
        };
        this.selectedObjectPrototype = 'pinheiro';
        this.ghostMesh = null;
        this.isMouseDown = false;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.initGizmo();
        this.createBrushHelper();
        this.setupEvents();
        this.setupKeyboardShortcuts();
    }

    initGizmo() {
        this.transformControl = new TransformControls(
            this.builder.graphics.camera, 
            this.builder.graphics.renderer.domElement
        );
        
        // ⭐ Define modo padrão (translate = mover)
        this.transformControl.setMode('translate');
        
        // Desativa OrbitControls durante o drag
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.builder.graphics.controls.enabled = !event.value;
        });
        
        this.builder.graphics.scene.add(this.transformControl);
    }

    createBrushHelper() {
        const geo = new THREE.RingGeometry(0.5, 0.6, 32);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0xffff00, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        this.brush.helper = new THREE.Mesh(geo, mat);
        this.brush.helper.visible = false;
        this.builder.graphics.scene.add(this.brush.helper);
    }

    setupEvents() {
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mousedown', () => { 
            this.isMouseDown = true; 
        });
        window.addEventListener('mouseup', () => this.isMouseDown = false);
        
        // ⭐ CLICK para seleção de objetos (como no main.js)
        window.addEventListener('click', (e) => this.onClick(e));
        
        this.setupUI();
    }

    onMouseMove(e) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        const cursor = document.getElementById('brush-cursor');
        if (cursor) {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        }
        
        this.handleMouseMove();
    }

    // ========================================================================
    // 🎯 SELEÇÃO DE OBJETOS (BASEADO NO MAIN.JS FUNCIONAL)
    // ========================================================================
    onClick(e) {
        // Não seleciona se está usando uma ferramenta ativa
        if (this.activeTool) return;
        
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.builder.graphics.camera);
        
        // Não seleciona enquanto está arrastando o gizmo
        if (this.transformControl.dragging) return;
        
        // Busca interseção com objetos de flora
        const objectIntersects = this.raycaster.intersectObjects(
            this.builder.objects.group.children
        );
        
        if (objectIntersects.length > 0) {
            const selectedObject = objectIntersects[0].object;
            
            // Anexa o Gizmo no objeto clicado
            this.transformControl.attach(selectedObject);
            console.log("🌲 Objeto selecionado:", selectedObject.userData.type || selectedObject);
        } else {
            // Clicou no vazio, solta o Gizmo
            this.transformControl.detach();
        }
    }

    // ========================================================================
    // 🖱️ PREVIEW DE FERRAMENTAS (MOUSEMOVE)
    // ========================================================================
    handleMouseMove() {
        const terrainMesh = this.builder.terrain.mesh;
        if (!terrainMesh) return;

        this.raycaster.setFromCamera(this.mouse, this.builder.graphics.camera);
        const terrainIntersect = this.raycaster.intersectObject(terrainMesh);
        
        if (terrainIntersect.length === 0) {
            this.brush.helper.visible = false;
            if (this.ghostMesh) this.ghostMesh.visible = false;
            return;
        }
        
        const point = terrainIntersect[0].point;

        // Lista de ferramentas de escultura
        const sculptTools = ['raise', 'lower', 'flatten', 'smooth', 'terraform', 'dig'];
        
        if (sculptTools.includes(this.activeTool)) {
            this.brush.helper.visible = true;
            this.brush.helper.position.copy(point);
            this.brush.helper.position.y += 0.5;
            this.brush.helper.scale.setScalar(this.brush.radius);
            
            if (this.isMouseDown) {
                this.applySculpt(point);
            }
        } else {
            this.brush.helper.visible = false;
        }

        // Place Object
        if (this.activeTool === 'place') {
            this.updateGhost(point);
            if (this.isMouseDown) {
                this.builder.objects.spawn({
                    type: this.selectedObjectPrototype, 
                    x: point.x, 
                    y: point.y, 
                    z: point.z, 
                    s: 0.8 + Math.random() * 0.4,
                    r: Math.random() * Math.PI * 2
                }, this.builder.currentSeed || 12345);
            }
        } else if (this.ghostMesh) {
            this.ghostMesh.visible = false;
        }
    }

    updateGhost(point) {
        if (!this.ghostMesh) {
            const geometry = this.builder.objects.floraLib[this.selectedObjectPrototype];
            if (!geometry) return;
            
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.4,
                wireframe: true
            });
            
            this.ghostMesh = new THREE.Mesh(geometry, material);
            this.builder.graphics.scene.add(this.ghostMesh);
        }
        
        this.ghostMesh.position.copy(point);
        this.ghostMesh.visible = true;
    }

    // ========================================================================
    // 🎨 LÓGICA DE ESCULTURA
    // ========================================================================
    applySculpt(center) {
        const terrainMesh = this.builder.terrain.mesh;
        if (!terrainMesh) return;

        const positions = terrainMesh.geometry.attributes.position;
        const r2 = this.brush.radius * this.brush.radius;
        let modified = 0;

        const smoothnessFactor = this.brush.smoothness / 100;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            const dx = x - center.x;
            const dz = z - center.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < r2) {
                const dist = Math.sqrt(distSq);
                
                let falloff;
                if (smoothnessFactor > 0.5) {
                    falloff = Math.cos(dist / this.brush.radius * Math.PI / 2);
                } else {
                    falloff = 1 - (dist / this.brush.radius);
                }
                
                falloff = Math.pow(falloff, 2 - smoothnessFactor * 2);
                
                const amount = (this.brush.strength / 100) * falloff;
                let y = positions.getY(i);

                switch (this.activeTool) {
                    case 'raise':
                        y += amount;
                        break;
                        
                    case 'lower':
                        y -= amount;
                        break;
                        
                    case 'flatten':
                        y += (center.y - y) * 0.2 * falloff;
                        break;
                        
                    case 'smooth':
                        const neighbors = this.getNeighbors(i, positions);
                        if (neighbors.length > 0) {
                            const avg = neighbors.reduce((sum, idx) => 
                                sum + positions.getY(idx), 0) / neighbors.length;
                            y += (avg - y) * 0.3 * falloff;
                        }
                        break;
                        
                    case 'terraform':
                        const noise = (Math.random() - 0.5) * amount * 2;
                        y += noise;
                        break;
                        
                    case 'dig':
                        y -= amount * 1.5;
                        y = Math.max(y, -20);
                        break;
                }

                positions.setY(i, y);
                modified++;
            }
        }

        if (modified > 0) {
            positions.needsUpdate = true;
            terrainMesh.geometry.computeVertexNormals();
            
            const counterEl = document.getElementById('vertices-mod');
            if (counterEl) counterEl.textContent = modified;

            // Atualiza Y de todos os objetos dentro do raio do brush
            this._snapObjectsInRadius(center, this.brush.radius, terrainMesh);
        }
    }

    // ========================================================================
    // 📌 SNAP DE OBJETOS AO TERRENO EDITADO
    // ========================================================================

    /**
     * Relê a altura do terreno editado em (wx, wz) por interpolação bilinear
     * dos vértices da geometria — independente da função procedural getHeight().
     */
    _getEditedTerrainHeight(wx, wz, terrainMesh) {
        const geo = terrainMesh.geometry;
        const pos = geo.attributes.position;

        // Descobrir bounds e resolução da grade a partir dos vértices
        // PlaneGeometry r128: vértices em ordem row-major ao longo de X, depois Z
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }

        // Deduzir número de segmentos (vértices = segmentos + 1 por eixo)
        // Conta quantos vértices únicos existem em X na primeira linha Z
        let segsX = 0;
        const firstZ = pos.getZ(0);
        for (let i = 0; i < pos.count; i++) {
            if (Math.abs(pos.getZ(i) - firstZ) < 0.001) segsX++;
            else break;
        }
        const segsZ = pos.count / segsX - 1;

        // Posição normalizada dentro da grade
        const fx = (wx - minX) / (maxX - minX) * (segsX - 1);
        const fz = (wz - minZ) / (maxZ - minZ) * (segsZ);

        const ix = Math.floor(Math.max(0, Math.min(segsX - 2, fx)));
        const iz = Math.floor(Math.max(0, Math.min(segsZ - 1, fz)));

        const tx = fx - ix;
        const tz = fz - iz;

        // Índices dos 4 vértices do quad
        const i00 = iz * segsX + ix;
        const i10 = iz * segsX + ix + 1;
        const i01 = (iz + 1) * segsX + ix;
        const i11 = (iz + 1) * segsX + ix + 1;

        const h00 = pos.getY(i00);
        const h10 = pos.getY(Math.min(i10, pos.count - 1));
        const h01 = pos.getY(Math.min(i01, pos.count - 1));
        const h11 = pos.getY(Math.min(i11, pos.count - 1));

        // Interpolação bilinear
        return h00 * (1 - tx) * (1 - tz)
             + h10 * tx       * (1 - tz)
             + h01 * (1 - tx) * tz
             + h11 * tx       * tz;
    }

    /**
     * Para cada objeto dentro do raio do brush, recalcula seu Y
     * lendo a altura real da geometria editada (não a função procedural).
     */
    _snapObjectsInRadius(center, radius, terrainMesh) {
        const objects = this.builder.objects.activeObjects;
        const r2 = radius * radius;
        for (const obj of objects) {
            const dx = obj.position.x - center.x;
            const dz = obj.position.z - center.z;
            if (dx * dx + dz * dz <= r2) {
                obj.position.y = this._getEditedTerrainHeight(
                    obj.position.x, obj.position.z, terrainMesh
                );
            }
        }
    }

    getNeighbors(index, positions) {
        const neighbors = [];
        const maxDist = 4;
        
        for (let j = Math.max(0, index - maxDist); 
             j < Math.min(positions.count, index + maxDist); 
             j++) {
            if (j !== index) neighbors.push(j);
        }
        
        return neighbors;
    }

    // ========================================================================
    // 🎮 SETUP DA UI
    // ========================================================================
    setupUI() {
        // Ferramentas
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                const tool = btn.dataset.tool;
                
                if (this.activeTool === tool) {
                    this.activeTool = null;
                    const label = document.getElementById('current-tool');
                    if (label) label.textContent = 'Navegação';
                } else {
                    this.activeTool = tool;
                    btn.classList.add('active');
                    this.transformControl.detach();
                    
                    const label = document.getElementById('current-tool');
                    if (label) label.textContent = tool.toUpperCase();
                }
                
                if (this.ghostMesh) this.ghostMesh.visible = false;
            };
        });

        // Botões de objeto
        document.querySelectorAll('.obj-btn').forEach(btn => {
            btn.onclick = () => {
                this.selectedObjectPrototype = btn.dataset.obj;
                this.activeTool = 'place';
                
                const label = document.getElementById('current-tool');
                if (label) label.textContent = `COLOCAR: ${btn.dataset.obj.toUpperCase()}`;
                
                if (this.ghostMesh) {
                    this.builder.graphics.scene.remove(this.ghostMesh);
                    this.ghostMesh.geometry.dispose();
                    this.ghostMesh.material.dispose();
                    this.ghostMesh = null;
                }
            };
        });

        // Slider de RAIO
        const radiusSlider = document.getElementById('brush-radius');
        const radiusDisplay = document.getElementById('disp-radius');
        
        if (radiusSlider) {
            radiusSlider.oninput = (e) => {
                this.brush.radius = parseFloat(e.target.value);
                if (radiusDisplay) radiusDisplay.textContent = e.target.value;
                
                const sizeLabel = document.getElementById('brush-size-val');
                if (sizeLabel) sizeLabel.textContent = e.target.value + 'm';
            };
        }
        
        // Slider de FORÇA
        const strengthSlider = document.getElementById('brush-strength');
        const strengthDisplay = document.getElementById('disp-strength');
        
        if (strengthSlider) {
            strengthSlider.oninput = (e) => {
                this.brush.strength = parseFloat(e.target.value);
                if (strengthDisplay) strengthDisplay.textContent = e.target.value;
            };
        }
        
        // Slider de SUAVIDADE
        const smoothnessSlider = document.getElementById('brush-smoothness');
        const smoothnessDisplay = document.getElementById('disp-smoothness');
        
        if (smoothnessSlider) {
            smoothnessSlider.oninput = (e) => {
                this.brush.smoothness = parseFloat(e.target.value);
                if (smoothnessDisplay) smoothnessDisplay.textContent = e.target.value;
            };
        }
    }

    // ========================================================================
    // 🎯 MÉTODOS DE TRANSFORMAÇÃO DE OBJETOS
    // ========================================================================
    
    /**
     * Define o modo do gizmo (translate, rotate, scale)
     */
    setGizmoMode(mode) {
        if (!this.transformControl.object) {
            console.warn('⚠️ Nenhum objeto selecionado!');
            return;
        }
        this.transformControl.setMode(mode);
        console.log(`🎯 Modo do gizmo: ${mode}`);
    }
    
    /**
     * Duplica o objeto selecionado
     */
    duplicateSelected() {
        const obj = this.transformControl.object;
        if (!obj || !obj.userData.type) {
            console.warn('⚠️ Nenhum objeto selecionado ou objeto inválido!');
            return;
        }
        
        const data = {
            type: obj.userData.type,
            x: obj.position.x + 5,  // Offset de 5m
            y: obj.position.y,
            z: obj.position.z + 5,
            s: obj.userData.originalScale || obj.scale.x,
            r: obj.rotation.y
        };
        
        this.builder.objects.spawn(data, this.builder.currentSeed || 12345);
        console.log('✅ Objeto duplicado!');
    }
    
    /**
     * Remove o objeto selecionado
     */
    deleteSelected() {
        const obj = this.transformControl.object;
        if (!obj) {
            console.warn('⚠️ Nenhum objeto selecionado!');
            return;
        }
        
        // Remove da cena e do array
        this.builder.objects.group.remove(obj);
        const index = this.builder.objects.activeObjects.indexOf(obj);
        if (index > -1) {
            this.builder.objects.activeObjects.splice(index, 1);
        }
        
        // Limpa geometria
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        
        // Desanexa do gizmo
        this.transformControl.detach();
        
        console.log('🗑️ Objeto removido!');
    }
    
    /**
     * Configura atalhos de teclado
     * ⭐ USANDO T, R, S como no main.js original!
     */
    setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Ctrl+D = Duplicar
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.duplicateSelected();
            }
            
            // Delete ou Backspace = Remover
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.deleteSelected();
            }
            
            // ⭐ T = Translate (mover) - Como no main.js!
            if (e.key.toLowerCase() === 't') {
                this.setGizmoMode('translate');
            }
            
            // ⭐ R = Rotate (rotacionar) - Como no main.js!
            if (e.key.toLowerCase() === 'r') {
                this.setGizmoMode('rotate');
            }
            
            // ⭐ S = Scale (escalar) - Como no main.js!
            if (e.key.toLowerCase() === 's') {
                this.setGizmoMode('scale');
            }
        });
    }
}
