import { PANEL_STATE } from '../config.js';

export class MapLoader {
    constructor(builder) {
        this.builder = builder;
        this.currentPlanetData = null; // Guarda o JSON carregado para saveMap()
        this.setupFileInput();
        this.setupSaveButtons();
    }

    // =========================================================================
    // 📂 SETUP: File input + botões de salvar
    // =========================================================================
    setupFileInput() {
        const fileInput = document.getElementById('file-input');
        const btnLoad   = document.getElementById('btn-load-file');

        if (btnLoad && fileInput) {
            btnLoad.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFile(e));
        }
    }

    setupSaveButtons() {
        // Botão "Salvar Mundo" na aba Tools
        const btnSaveWorld = document.getElementById('btn-save-world');
        if (btnSaveWorld) {
            btnSaveWorld.addEventListener('click', () => this.saveMap());
        }

        // Botão "💾 SALVAR" rápido no rodapé
        const btnQuickSave = document.getElementById('btn-quick-save');
        if (btnQuickSave) {
            btnQuickSave.addEventListener('click', () => this.saveMap());
        }
    }

    // =========================================================================
    // 📂 CARREGAR
    // =========================================================================
    handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                this.loadMap(json);
            } catch (err) {
                alert('Arquivo inválido!');
                console.error(err);
            }
        };
        reader.readAsText(file);
    }

    loadMap(json) {
        console.log('📂 Carregando mapa...', json);
        try {
            const newSeed = json.metadata ? json.metadata.seed : 12345;

            // 1. Sincronizar PANEL_STATE
            if (json.settings) {
                if (json.settings.sliders) Object.assign(PANEL_STATE.sliders, json.settings.sliders);

                if (json.settings.selected) {
                    const sel = json.settings.selected;
                    if (sel.relevo) PANEL_STATE.selected.relevo = new Set(sel.relevo);
                    if (sel.agua)   PANEL_STATE.selected.agua   = new Set(sel.agua);
                    if (sel.veg)    PANEL_STATE.selected.veg    = new Set(sel.veg);
                    // suporte ao campo legado 'biomas'
                    if (sel.biomas) PANEL_STATE.selected.veg    = new Set(sel.biomas);
                }
                PANEL_STATE.seed = newSeed;
                console.log('⚙️ Configurações Sincronizadas.');
            } else {
                console.warn('⚠️ Arquivo sem configurações (settings).');
            }

            // 2. Sincronizar UI dos sliders (1.2)
            this.syncSlidersToUI(newSeed);

            // 3. Gerar terreno + objetos
            this.builder.terrain.generate(newSeed);
            this.builder.objects.clear();

            if (json.chunks) {
                json.chunks.forEach(chunk => {
                    if (chunk.flora) {
                        chunk.flora.forEach(item => {
                            this.builder.objects.spawn(item, newSeed);
                        });
                    }
                });
            }

            // 4. Guardar referência para saveMap()
            this.currentPlanetData = json;
            this.builder.currentSeed = newSeed;

            const fileStatus = document.getElementById('file-status');
            const name = json.metadata && json.metadata.name ? json.metadata.name : 'Planeta';
            if (fileStatus) {
                fileStatus.textContent = `✅ "${name}" carregado (seed: ${newSeed})`;
                fileStatus.style.color = '#90EE90';
            }

            console.log('✅ Mapa Carregado!');

        } catch (err) {
            console.error(err);
            alert('Erro fatal ao carregar mapa: ' + err.message);
        }
    }

    // =========================================================================
    // 1.2 — Sincronizar sliders da UI com os valores do PANEL_STATE
    // =========================================================================
    syncSlidersToUI(seed) {
        // Campo seed
        const seedInput = document.getElementById('seed-input');
        if (seedInput) seedInput.value = seed;

        // Os sliders do PANEL_STATE (scale, intensity, blend) não têm
        // equivalentes diretos no builder hoje — quando forem adicionados
        // basta mapear aqui: { sliderId: chave do PANEL_STATE.sliders }
        const sliderMap = {
            'terrain-scale':     'scale',
            'terrain-intensity': 'intensity',
            'terrain-blend':     'blend'
        };

        Object.entries(sliderMap).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el && PANEL_STATE.sliders[key] !== undefined) {
                el.value = PANEL_STATE.sliders[key];
                // Atualiza display companion (padrão: id com 'disp-' prefix)
                const disp = document.getElementById('disp-' + id.replace('terrain-', ''));
                if (disp) disp.textContent = PANEL_STATE.sliders[key];
            }
        });
    }

    // =========================================================================
    // 1.1 — Salvar: exporta estado atual como .planet.json
    // =========================================================================
    saveMap() {
        const seed = this.builder.currentSeed || PANEL_STATE.seed || 12345;

        // Coletar posições atuais de todos os objetos na cena
        const floraItems = this.builder.objects.activeObjects.map(obj => ({
            type: obj.userData.type,
            x: obj.position.x,
            y: obj.position.y,
            z: obj.position.z,
            s: obj.userData.originalScale || obj.scale.x,
            r: obj.rotation.y
        }));

        // Montar estrutura compatível com o formato .planet do Mundo Procedural
        const planetData = {
            metadata: {
                name: (this.currentPlanetData && this.currentPlanetData.metadata && this.currentPlanetData.metadata.name)
                    ? this.currentPlanetData.metadata.name + ' (editado)'
                    : 'Mundo Editado',
                seed: seed,
                savedAt: new Date().toISOString(),
                editedInBuilder: true
            },
            settings: {
                sliders: { ...PANEL_STATE.sliders },
                selected: {
                    relevo: Array.from(PANEL_STATE.selected.relevo),
                    agua:   Array.from(PANEL_STATE.selected.agua),
                    veg:    Array.from(PANEL_STATE.selected.veg)
                },
                cycle: PANEL_STATE.cycle || 'dia'
            },
            // Builder representa tudo como um chunk único
            chunks: [{
                id: 'builder_0_0',
                x: 0, z: 0,
                flora: floraItems
            }]
        };

        // Download do arquivo
        const blob = new Blob([JSON.stringify(planetData, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${planetData.metadata.name.replace(/\s+/g, '_')}.planet.json`;
        a.click();
        URL.revokeObjectURL(url);

        const fileStatus = document.getElementById('file-status');
        if (fileStatus) {
            fileStatus.textContent = `💾 Salvo: ${a.download}`;
            fileStatus.style.color = '#90EE90';
        }
        console.log('💾 Mapa salvo:', planetData);
    }
}
