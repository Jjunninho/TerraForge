/**
 * PanelUI.js
 * 
 * Gerencia toda a lógica do painel lateral do Mundo Procedural:
 *   - Controles de modo / bioma / ciclo / sliders
 *   - Seed (manual + aleatória)
 *   - Save / Load / Export / Import de planeta
 *   - Modal de estatísticas
 *   - Integração com ChunkManager, DayNightSystem e PlanetSystem
 * 
 * Uso:
 *   const panel = new PanelUI(chunkManager, dayNight, planetSystem, camera);
 *   // O construtor já registra todos os listeners — não precisa chamar nada depois.
 *   panel.init(); // chama os valores iniciais
 */

import { PANEL_STATE } from '../config.js';

export class PanelUI {
    constructor(chunkManager, dayNight, planetSystem, camera) {
        this.chunkManager = chunkManager;
        this.dayNight     = dayNight;
        this.planetSystem = planetSystem;
        this.camera       = camera;

        this._qs  = (s) => document.querySelector(s);
        this._qsa = (s) => [...document.querySelectorAll(s)];
    }

    // -----------------------------------------------------------------------
    // Inicialização — chama após construir (garante que o DOM está pronto)
    // -----------------------------------------------------------------------
    init() {
        this._setupModeButtons();
        this._setupCycleButtons();
        this._setupLayerButtons();
        this._setupSliders();
        this._setupComboButtons();
        this._setupPlanetButtons();
        this._setupSeedControls();
        this._setupFlightToggle();

        // Valores iniciais
        this.setMode('manual');
        this.setCycle('dia');
        this.setSeed(12345);
        this._updateSliderDisplays();
        this._renderFeedback();
    }

    // -----------------------------------------------------------------------
    // SEED
    // -----------------------------------------------------------------------
    setSeed(n) {
        PANEL_STATE.seed = n;
        this.chunkManager.updateSeed(n);

        const seedInput = document.getElementById('seed-input');
        if (seedInput) seedInput.value = n;

        const seedLabel = document.getElementById('seedLabel');
        if (seedLabel) seedLabel.textContent = String(n);
    }

    _randSeed() {
        return Math.floor(1000000 + Math.random() * 9000000);
    }

    // -----------------------------------------------------------------------
    // MODO
    // -----------------------------------------------------------------------
    setMode(mode) {
        PANEL_STATE.mode = mode;
        this._qsa('[data-mode]').forEach(btn => {
            btn.setAttribute('aria-pressed', btn.dataset.mode === mode ? 'true' : 'false');
        });
    }

    // -----------------------------------------------------------------------
    // CICLO DIA/NOITE
    // -----------------------------------------------------------------------
    setCycle(cycle) {
        PANEL_STATE.cycle = cycle;
        this._qsa('[data-cycle]').forEach(btn => {
            btn.setAttribute('aria-pressed', btn.dataset.cycle === cycle ? 'true' : 'false');
        });
        this.dayNight.setTime(cycle);
    }

    // -----------------------------------------------------------------------
    // SLIDERS
    // -----------------------------------------------------------------------
    _updateSliderDisplays() {
        const set = (id, val) => {
            const el = this._qs(id);
            if (el) el.textContent = val;
        };
        set('#blendVal',     PANEL_STATE.sliders.blend);
        set('#scaleVal',     PANEL_STATE.sliders.scale);
        set('#intensityVal', PANEL_STATE.sliders.intensity);
    }

    // -----------------------------------------------------------------------
    // ITENS DE CAMADA (biomas, água, vegetação)
    // -----------------------------------------------------------------------
    _toggleItem(layer, item, btn) {
        const set = PANEL_STATE.selected[layer];
        if (set.has(item)) {
            set.delete(item);
            btn.setAttribute('aria-pressed', 'false');
        } else {
            set.add(item);
            btn.setAttribute('aria-pressed', 'true');
        }
        this._renderFeedback();
    }

    _renderFeedback() {
        const r = [...PANEL_STATE.selected.relevo];
        const a = [...PANEL_STATE.selected.agua];
        const v = [...PANEL_STATE.selected.veg];

        const combo = [
            r.length ? `R(${r.length})` : null,
            a.length ? `F(${a.length})` : null,
            v.length ? `B(${v.length})` : null,
        ].filter(Boolean).join(' + ') || 'Vazio';

        const el = this._qs('#comboText');
        if (el) el.textContent = combo;
    }

    _clearAll() {
        Object.values(PANEL_STATE.selected).forEach(s => s.clear());
        this._qsa('[data-layer][data-item]').forEach(btn =>
            btn.setAttribute('aria-pressed', 'false')
        );
        this._renderFeedback();
    }

    _randomCombo() {
        this._clearAll();

        const pickSome = (buttons, min, max) => {
            const n = Math.floor(min + Math.random() * (max - min + 1));
            buttons.sort(() => Math.random() - 0.5).slice(0, n).forEach(btn => btn.click());
        };

        pickSome(this._qsa('[data-layer="relevo"]'), 1, 3);
        pickSome(this._qsa('[data-layer="agua"]'),   0, 2);
        pickSome(this._qsa('[data-layer="veg"]'),    1, 3);
    }

    // -----------------------------------------------------------------------
    // Restaura UI a partir do PANEL_STATE (usado no load de planeta)
    // -----------------------------------------------------------------------
    updateUIFromState() {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('blend',     PANEL_STATE.sliders.blend);
        setVal('scale',     PANEL_STATE.sliders.scale);
        setVal('intensity', PANEL_STATE.sliders.intensity);
        setTxt('blendVal',     PANEL_STATE.sliders.blend);
        setTxt('scaleVal',     PANEL_STATE.sliders.scale);
        setTxt('intensityVal', PANEL_STATE.sliders.intensity);

        this._qsa('.icon-btn').forEach(btn => {
            const { layer, item } = btn.dataset;
            if (layer && item && PANEL_STATE.selected[layer]) {
                btn.setAttribute('aria-pressed', PANEL_STATE.selected[layer].has(item));
            }
        });

        this._qsa('[data-cycle]').forEach(btn => {
            btn.setAttribute('aria-pressed', btn.dataset.cycle === PANEL_STATE.cycle);
        });

        this.chunkManager.clear();
    }

    // -----------------------------------------------------------------------
    // SETUP DE EVENTOS
    // -----------------------------------------------------------------------
    _setupModeButtons() {
        this._qsa('[data-mode]').forEach(btn =>
            btn.addEventListener('click', () => this.setMode(btn.dataset.mode))
        );
    }

    _setupCycleButtons() {
        this._qsa('[data-cycle]').forEach(btn =>
            btn.addEventListener('click', () => this.setCycle(btn.dataset.cycle))
        );
    }

    _setupLayerButtons() {
        this._qsa('[data-layer][data-item]').forEach(btn =>
            btn.addEventListener('click', () =>
                this._toggleItem(btn.dataset.layer, btn.dataset.item, btn)
            )
        );
    }

    _setupSliders() {
        const bind = (id, key) => {
            const el = this._qs(id);
            if (!el) return;
            el.addEventListener('input', e => {
                PANEL_STATE.sliders[key] = Number(e.target.value);
                this._updateSliderDisplays();
            });
        };
        bind('#blend',     'blend');
        bind('#scale',     'scale');
        bind('#intensity', 'intensity');
    }

    _setupComboButtons() {
        const qs = this._qs.bind(this);

        const newSeedBtn = qs('#newSeed');
        if (newSeedBtn) newSeedBtn.addEventListener('click', () => this.setSeed(this._randSeed()));

        const clearBtn = qs('#clear');
        if (clearBtn) clearBtn.addEventListener('click', () => this._clearAll());

        const combineBtn = qs('#combine');
        if (combineBtn) {
            combineBtn.addEventListener('click', () => {
                const el = qs('#comboText');
                const original = el ? el.textContent : '';
                if (el) { el.textContent = 'GERANDO...'; el.style.color = '#2a7fff'; }
                this.chunkManager.clear();
                this.chunkManager.updateChunks(this.camera.position.x, this.camera.position.z);
                setTimeout(() => {
                    if (el) { el.textContent = '✓ ' + original; el.style.color = '#27ae60'; }
                }, 800);
            });
        }

        const randomBtn = qs('#randomCombo');
        if (randomBtn) randomBtn.addEventListener('click', () => this._randomCombo());
    }

    _setupFlightToggle() {
        // Exposto globalmente pelo main.js — apenas o botão
        const btn = document.getElementById('flight-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                if (typeof window.toggleFlightMode === 'function') window.toggleFlightMode();
            });
        }
    }

    _setupPlanetButtons() {
        const ps    = this.planetSystem;
        const nameInput = document.getElementById('planet-name');

        if (nameInput) {
            nameInput.addEventListener('input', e => ps.renamePlanet(e.target.value));
        }

        // Salvar localStorage
        const btnSave = document.getElementById('btn-save-planet');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                const data = ps.exportPlanetData();
                localStorage.setItem('savedPlanet', JSON.stringify(data));
                alert(`✅ Planeta "${ps.planetName}" salvo localmente!`);
            });
        }

        // Carregar localStorage
        const btnLoad = document.getElementById('btn-load-planet');
        if (btnLoad) {
            btnLoad.addEventListener('click', () => {
                const saved = localStorage.getItem('savedPlanet');
                if (!saved) { alert('⚠️ Nenhum planeta salvo encontrado!'); return; }

                const result = ps.importPlanetData(saved);
                if (result.success) {
                    alert(`✅ Planeta "${result.planetName}" carregado!`);
                    if (nameInput) nameInput.value = result.planetName;
                    if (result.seed) this.setSeed(result.seed);
                    if (result.settings) {
                        PANEL_STATE.sliders              = result.settings.sliders;
                        PANEL_STATE.selected.relevo      = new Set(result.settings.selected.relevo);
                        PANEL_STATE.selected.agua        = new Set(result.settings.selected.agua);
                        PANEL_STATE.selected.veg         = new Set(result.settings.selected.veg);
                        PANEL_STATE.cycle                = result.settings.cycle;
                    }
                    this.updateUIFromState();
                } else {
                    alert(`❌ Erro: ${result.error}`);
                }
            });
        }

        // Exportar arquivo
        const btnExport = document.getElementById('btn-export-planet');
        if (btnExport) {
            btnExport.addEventListener('click', () => ps.downloadPlanetFile());
        }

        // Importar de arquivo (dblclick no btnLoad)
        const fileInput = document.getElementById('planetFileInput');
        if (fileInput && btnLoad) {
            btnLoad.addEventListener('dblclick', () => fileInput.click());
            fileInput.addEventListener('change', e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                    const result = ps.importPlanetData(ev.target.result);
                    if (result.success) {
                        alert(`✅ Importado: "${result.planetName}"`);
                        if (nameInput) nameInput.value = result.planetName;
                    } else {
                        alert(`❌ Erro: ${result.error}`);
                    }
                };
                reader.readAsText(file);
            });
        }

        // Modal de estatísticas
        const btnStats  = document.getElementById('btn-show-stats');
        const modal     = document.getElementById('stats-modal');
        const closeBtn  = document.getElementById('close-stats');

        if (btnStats && modal) {
            btnStats.addEventListener('click', () => {
                const stats   = ps.getPlanetStats();
                const content = document.getElementById('stats-content');
                if (content) {
                    content.innerHTML = `
                        <div class="stat-card"><h4>🪐 Nome do Planeta</h4><p>${stats.name}</p></div>
                        <div class="stat-card"><h4>📦 Total de Chunks</h4><p>${stats.totalChunks}</p></div>
                        <div class="stat-card"><h4>🏔️ Altura Máxima</h4><p>${stats.heightRange.max} metros</p></div>
                        <div class="stat-card"><h4>🕳️ Profundidade Mín.</h4><p>${stats.heightRange.min} metros</p></div>
                        <div class="stat-card"><h4>📏 Amplitude Total</h4><p>${stats.heightRange.span} metros</p></div>
                        <div class="stat-card"><h4>🗺️ Área Coberta</h4><p>${stats.coverage} km²</p></div>
                        <div class="stat-card"><h4>🌍 Biomas Presentes</h4><p>${stats.biomes.join(', ')}</p></div>
                        <div class="stat-card"><h4>💾 Tamanho em Memória</h4><p>${stats.memoryEstimate}</p></div>
                    `;
                }
                modal.classList.add('active');
            });
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        }
    }

    _setupSeedControls() {
        const seedInput    = document.getElementById('seed-input');
        const btnRandSeed  = document.getElementById('btn-random-seed');

        if (seedInput) {
            seedInput.addEventListener('change', e => {
                let n = parseInt(e.target.value);
                if (n < 1000000) n = 1000000;
                if (n > 9999999) n = 9999999;
                if (n !== parseInt(e.target.value)) e.target.value = n;

                this.setSeed(n);
                this.chunkManager.clear();
                this.chunkManager.updateChunks(this.camera.position.x, this.camera.position.z);
                console.log(`🎲 SEED alterada para: ${n}`);
            });

            seedInput.addEventListener('keypress', e => {
                if (!/[0-9]/.test(e.key) && e.key !== 'Enter') e.preventDefault();
                if (e.key === 'Enter') e.target.blur();
            });
        }

        if (btnRandSeed) {
            btnRandSeed.addEventListener('click', () => {
                const n = this._randSeed();
                if (seedInput) seedInput.value = n;
                this.setSeed(n);
                btnRandSeed.style.transform = 'rotate(360deg)';
                setTimeout(() => { btnRandSeed.style.transform = 'rotate(0deg)'; }, 300);
                this.chunkManager.clear();
                this.chunkManager.updateChunks(this.camera.position.x, this.camera.position.z);
                console.log(`🎲 Nova SEED: ${n}`);
            });

            btnRandSeed.addEventListener('mouseenter', () => {
                btnRandSeed.style.background = '#388e3c';
                btnRandSeed.style.transform  = 'scale(1.1)';
            });
            btnRandSeed.addEventListener('mouseleave', () => {
                btnRandSeed.style.background = '#2e7d32';
                btnRandSeed.style.transform  = 'scale(1)';
            });
        }
    }
}
