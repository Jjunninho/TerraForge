import { Graphics } from './modules/Graphics.js';
import { TerrainManager } from './modules/Terrain.js';
import { ObjectManager } from './modules/Objects.js';
import { ToolManager } from './modules/Tools.js';
import { MapLoader } from './modules/IO.js';
import { ExplorerMode } from './ExplorerMode.js';
import { BuilderMinimap } from './modules/BuilderMinimap.js';

class BuilderManager {
    constructor() {
        console.log("🏗️ Iniciando Builder Modular...");
        
        // 1. Inicializa Subsistemas
        this.graphics = new Graphics();
        this.terrain = new TerrainManager(this.graphics.scene);
        this.objects = new ObjectManager(this.graphics.scene);
        
        // 2. Ferramentas e IO precisam de acesso aos outros
        this.tools = new ToolManager(this);
        this.io = new MapLoader(this);

        // 3. Modo exploração FPS (toggle G)
        this.explorer = new ExplorerMode(this);
        
        // 4. Minimap
        this.minimap = new BuilderMinimap('builder-minimap');
        
        // 5. Start
        this.terrain.generate(12345); // Terreno inicial
        this.clock = new THREE.Clock();
        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        // Atualiza modo exploração (se ativo, controla câmera; se não, no-op)
        this.explorer.update(delta);
        // Atualiza minimap
        this.minimap.update(this);
        this.graphics.render();
    }
}

window.onload = () => {
    window.builder = new BuilderManager();
};