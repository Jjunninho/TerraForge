// ============================================================================
// 📱 FRONTEND.JS - Gerenciamento Completo de UI
// Versão: 2.1 - Fix Garantido para Sistema de Abas
// ============================================================================

console.log('🚀 Frontend.js v2.1 iniciando...');

// ============================================================================
// 🎨 SISTEMA DE ABAS - FIX GARANTIDO
// ============================================================================

// Aguarda o DOM estar completamente carregado
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    console.log(`📌 ${tabs.length} abas encontradas`);
    
    if (tabs.length === 0) {
        console.error('❌ Nenhuma aba encontrada! Verifique o HTML.');
        return;
    }
    
    tabs.forEach((tab, index) => {
        const tabId = tab.getAttribute('data-tab');
        console.log(`  ${index + 1}. Configurando aba: ${tabId}`);
        
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            console.log(`🎯 Aba clicada: ${tabId}`);
            
            // Remove active de todas as abas
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Remove active de todos os conteúdos
            document.querySelectorAll('.tab-content').forEach(tc => {
                tc.classList.remove('active');
            });
            
            // Adiciona active na aba clicada
            this.classList.add('active');
            console.log(`✅ Classe active adicionada na aba: ${tabId}`);
            
            // Adiciona active no conteúdo correspondente
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetTab) {
                targetTab.classList.add('active');
                console.log(`✅ Classe active adicionada no conteúdo: tab-${tabId}`);
            } else {
                console.error(`❌ Conteúdo não encontrado: tab-${tabId}`);
            }
        });
    });
    
    console.log('✅ Sistema de abas inicializado!');
}

// ============================================================================
// 🔧 SISTEMA DE SELEÇÃO DE FERRAMENTAS
// ============================================================================
function initToolButtons() {
    const toolButtons = document.querySelectorAll('.tool-btn, .icon-btn');
    console.log(`🔧 ${toolButtons.length} botões de ferramenta encontrados`);
    
    toolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active de todos
            document.querySelectorAll('.tool-btn, .icon-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            
            // Adiciona active no clicado
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            
            // Atualiza display
            const toolName = this.querySelector('span') ? this.querySelector('span').textContent : this.textContent;
            const toolDisplay = document.getElementById('current-tool-display');
            if (toolDisplay) {
                toolDisplay.textContent = toolName;
            }
            
            showNotification(`Ferramenta selecionada: ${toolName}`);
        });
    });
}

// ============================================================================
// 🌳 SISTEMA DE SELEÇÃO DE OBJETOS — populado dinamicamente pelos catálogos
// ============================================================================

// Mapeamento id-do-catálogo → id-do-grid no HTML
const GRID_MAP = {
    vegetacao:       'grid-vegetacao',
    rochas_recursos: 'grid-rochas',
    estruturas:      'grid-estruturas',
    infraestrutura:  'grid-infraestrutura'
};

function _criarBotaoObjeto(id, meta) {
    const btn = document.createElement('button');
    btn.className = 'construction-btn obj-btn';
    btn.dataset.obj = id;
    btn.innerHTML = `<div class="icon ${meta.icone || 'icon-floresta'}"></div><span>${meta.nome}</span>`;
    btn.addEventListener('click', function() {
        document.querySelectorAll('.obj-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        // Informa o ToolManager qual asset está selecionado
        if (window.builder?.tools) window.builder.tools.selectedObjectPrototype = id;
        showNotification(`Objeto selecionado: ${meta.nome}`);
    });
    return btn;
}

function initObjectButtons() {
    // Botões estáticos que já existiam (ferramentas de objeto — selecionar, mover, etc.)
    const objButtons = document.querySelectorAll('.obj-btn');
    console.log(`🌳 ${objButtons.length} botões de objeto encontrados (estáticos)`);
    objButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.obj-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            const objName = this.querySelector('span') ? this.querySelector('span').textContent : this.textContent;
            showNotification(`Objeto selecionado: ${objName}`);
        });
    });
}

// Escuta o evento disparado pelo ObjectManager quando os catálogos estiverem prontos
document.addEventListener('assets-loaded', (e) => {
    const assetMeta = e.detail; // { id: { nome, icone, arquivo }, ... }

    // Limpa e repopula cada grid
    Object.values(GRID_MAP).forEach(gridId => {
        const el = document.getElementById(gridId);
        if (el) el.innerHTML = '';
    });

    // Descobre a categoria de cada asset pelo arquivo (heurística pelo path)
    for (const [id, meta] of Object.entries(assetMeta)) {
        let gridId = 'grid-vegetacao'; // fallback
        if (meta.arquivo.includes('/rocks/'))          gridId = 'grid-rochas';
        else if (meta.arquivo.includes('/structures/')) gridId = 'grid-estruturas';
        else if (meta.arquivo.includes('/infrasctructure/')) gridId = 'grid-infraestrutura';

        const grid = document.getElementById(gridId);
        if (grid) grid.appendChild(_criarBotaoObjeto(id, meta));
    }

    console.log(`✅ Grids de objetos populados: ${Object.keys(assetMeta).length} itens`);
});

// ============================================================================
// 🎚️ SLIDERS COM VISUALIZAÇÃO EM TEMPO REAL
// ============================================================================
function initSliders() {
    const sliders = [
        { id: 'brush-radius', display: 'disp-radius' },
        { id: 'brush-strength', display: 'disp-strength' },
        { id: 'brush-smoothness', display: 'disp-smoothness' },
        { id: 'precision-level', display: 'disp-precision' },
        { id: 'grid-size', display: 'disp-grid' },
        { id: 'quality-level', display: 'disp-quality' },
        { id: 'view-distance', display: 'disp-view' },
        { id: 'time-of-day', display: 'disp-time' },
        { id: 'weather-intensity', display: 'disp-intensity' }
    ];
    
    let initialized = 0;
    
    sliders.forEach(slider => {
        const sliderEl = document.getElementById(slider.id);
        const displayEl = document.getElementById(slider.display);
        
        if (sliderEl && displayEl) {
            // Define valor inicial
            displayEl.textContent = sliderEl.value;
            
            // Atualiza ao mudar
            sliderEl.addEventListener('input', () => {
                displayEl.textContent = sliderEl.value;
                
                // Formatação especial para slider de tempo
                if (slider.id === 'time-of-day') {
                    const hour = parseInt(sliderEl.value);
                    const timeString = `${hour.toString().padStart(2, '0')}:00`;
                    displayEl.textContent = timeString;
                }
            });
            
            initialized++;
        }
    });
    
    console.log(`🎚️ ${initialized} sliders inicializados`);
}

// ============================================================================
// 🔔 SISTEMA DE NOTIFICAÇÕES
// ============================================================================
function showNotification(message) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ============================================================================
// 🎮 BOTÕES DE AÇÃO
// ============================================================================
function initActionButtons() {
    const actionButtons = document.querySelectorAll('.action-btn, .quick-action, .world-btn');
    console.log(`🎮 ${actionButtons.length} botões de ação encontrados`);
    
    actionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const btnText = this.textContent.trim();
            
            // Ignora botões que já têm handlers específicos
            if (!this.id || !['btn-undo', 'btn-redo', 'btn-save-world', 'btn-reset-world', 
                              'btn-load-world', 'btn-rotate', 'btn-reset', 'btn-toggle-grid',
                              'btn-select-all', 'btn-clear-all'].includes(this.id)) {
                showNotification(`Ação: ${btnText}`);
            }
            
            // Feedback visual
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        });
    });
}

// ============================================================================
// 📊 ESTATÍSTICAS DINÂMICAS
// ============================================================================
function updateStats() {
    const vertexCount = document.getElementById('vertex-count');
    const fpsCount = document.getElementById('fps-count');
    
    if (vertexCount) {
        const vertexChange = Math.floor(Math.random() * 100) - 50;
        const currentVertex = parseInt(vertexCount.textContent.replace('k', '')) * 1000;
        const newVertex = Math.max(10000, currentVertex + vertexChange);
        vertexCount.textContent = `${(newVertex / 1000).toFixed(1)}k`;
    }
    
    if (fpsCount) {
        const fps = 50 + Math.floor(Math.random() * 20);
        fpsCount.textContent = fps;
    }
}

// ============================================================================
// 🌍 BOTÕES DE CONTROLE DO MUNDO
// ============================================================================
function initWorldControls() {
    const btnRotate = document.getElementById('btn-rotate');
    if (btnRotate) {
        btnRotate.addEventListener('click', () => {
            showNotification('Vista rotacionada. Use o mouse para navegar.');
        });
    }
    
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            showNotification('Vista resetada para posição padrão.');
        });
    }
    
    const btnToggleGrid = document.getElementById('btn-toggle-grid');
    if (btnToggleGrid) {
        btnToggleGrid.addEventListener('click', function() {
            const isActive = this.classList.toggle('active');
            showNotification(isActive ? 'Grade ativada' : 'Grade desativada');
        });
    }
}

// ============================================================================
// ⚡ AÇÕES RÁPIDAS (UNDO/REDO/SAVE/LOAD)
// ============================================================================
function initQuickActions() {
    const btnUndo = document.getElementById('btn-undo');
    if (btnUndo) {
        btnUndo.addEventListener('click', () => {
            showNotification('Ação desfeita');
        });
    }
    
    const btnRedo = document.getElementById('btn-redo');
    if (btnRedo) {
        btnRedo.addEventListener('click', () => {
            showNotification('Ação refeita');
        });
    }
    
    const btnSaveWorld = document.getElementById('btn-save-world');
    if (btnSaveWorld) {
        btnSaveWorld.addEventListener('click', () => {
            showNotification('Mundo salvo com sucesso!');
            const fileStatus = document.getElementById('file-status');
            if (fileStatus) {
                fileStatus.textContent = 'Mundo salvo: ' + new Date().toLocaleTimeString();
                fileStatus.style.color = '#4CAF50';
            }
        });
    }
    
    const btnResetWorld = document.getElementById('btn-reset-world');
    if (btnResetWorld) {
        btnResetWorld.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja resetar o mundo? Todas as alterações não salvas serão perdidas.')) {
                showNotification('Mundo resetado para configurações padrão');
            }
        });
    }
    
    const btnLoadWorld = document.getElementById('btn-load-world');
    if (btnLoadWorld) {
        btnLoadWorld.addEventListener('click', () => {
            showNotification('Selecione um arquivo de mundo para carregar');
            const fileStatus = document.getElementById('file-status');
            if (fileStatus) {
                fileStatus.textContent = 'Carregando mundo...';
                fileStatus.style.color = '#FF9800';
                
                setTimeout(() => {
                    fileStatus.textContent = 'Mundo carregado: Exemplo.planet';
                    fileStatus.style.color = '#4CAF50';
                    showNotification('Mundo carregado com sucesso!');
                }, 1500);
            }
        });
    }
}

// ============================================================================
// 🚀 INICIALIZAÇÃO MASTER
// ============================================================================
function initializeAll() {
    console.log('🚀 Inicializando todos os sistemas...');
    
    // 1. Sistema de abas (PRIORITÁRIO)
    initTabs();
    
    // 2. Ferramentas e objetos
    initToolButtons();
    initObjectButtons();
    
    // 3. Sliders
    initSliders();
    
    // 4. Botões de ação
    initActionButtons();
    
    // 5. Controles do mundo
    initWorldControls();
    
    // 6. Ações rápidas
    initQuickActions();
    
    // 7. Ativar primeira ferramenta
    const firstTool = document.querySelector('.tool-btn');
    if (firstTool) {
        firstTool.classList.add('active');
        firstTool.setAttribute('aria-pressed', 'true');
    }
    
    // 8. Ativar primeiro objeto
    const firstObj = document.querySelector('.obj-btn');
    if (firstObj) {
        firstObj.classList.add('selected');
    }
    
    // 9. Iniciar estatísticas
    setInterval(updateStats, 2000);
    
    // 10. Notificação inicial
    setTimeout(() => {
        showNotification('Editor de Mundo carregado! Selecione uma ferramenta para começar.');
    }, 1000);
    
    console.log('✅ Frontend.js v2.1 - Todos os sistemas inicializados!');
}

// ============================================================================
// 🎬 EXECUÇÃO
// ============================================================================

// Espera o DOM estar pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAll);
} else {
    // DOM já está pronto
    initializeAll();
}

console.log('✅ Frontend.js v2.1 carregado!');
