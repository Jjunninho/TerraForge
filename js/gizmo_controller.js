// ============================================================================
// 🎯 GIZMO CONTROLLER - Integração com Ferramentas de Objeto
// Versão: HTML MANUAL (sem criação automática de elementos)
// ============================================================================

// ============================================================================
// 🎮 CONEXÃO DOS BOTÕES COM O TOOLMANAGER
// ============================================================================

function setupObjectToolButtons() {
    const toolButtons = document.querySelectorAll('[data-tool^="select-object"], [data-tool^="move-object"], [data-tool^="rotate-object"], [data-tool^="scale-object"], [data-tool^="duplicate-object"], [data-tool^="delete-object"]');
    
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            
            if (!window.builder || !window.builder.tools) {
                console.warn('⚠️ Builder não inicializado ainda!');
                return;
            }
            
            // Remove active de todos os botões de objeto
            toolButtons.forEach(b => b.classList.remove('active'));
            
            switch(tool) {
                case 'select-object':
                    // Desativa ferramentas ativas e volta ao modo de seleção
                    window.builder.tools.activeTool = null;
                    const currentToolLabel = document.getElementById('current-tool');
                    if (currentToolLabel) currentToolLabel.textContent = 'Navegação';
                    btn.classList.add('active');
                    console.log('🎯 Modo: Seleção de objetos');
                    break;
                    
                case 'move-object':
                    window.builder.tools.setGizmoMode('translate');
                    btn.classList.add('active');
                    console.log('🎯 Modo: Mover objeto (T)');
                    break;
                    
                case 'rotate-object':
                    window.builder.tools.setGizmoMode('rotate');
                    btn.classList.add('active');
                    console.log('🎯 Modo: Rotacionar objeto (R)');
                    break;
                    
                case 'scale-object':
                    window.builder.tools.setGizmoMode('scale');
                    btn.classList.add('active');
                    console.log('🎯 Modo: Escalar objeto (S)');
                    break;
                    
                case 'duplicate-object':
                    window.builder.tools.duplicateSelected();
                    console.log('📋 Duplicando objeto (Ctrl+D)');
                    break;
                    
                case 'delete-object':
                    window.builder.tools.deleteSelected();
                    console.log('🗑️ Removendo objeto (Delete)');
                    break;
            }
        });
    });
}

// ============================================================================
// 🔘 BOTÕES DE AÇÃO (Selecionar Todos / Remover Todos)
// ============================================================================

function setupActionButtons() {
    const btnSelectAll = document.getElementById('btn-select-all');
    const btnClearAll = document.getElementById('btn-clear-all');
    
    if (btnSelectAll) {
        btnSelectAll.addEventListener('click', () => {
            if (!window.builder || !window.builder.objects) {
                console.warn('⚠️ Builder não inicializado!');
                return;
            }
            
            const count = window.builder.objects.activeObjects.length;
            console.log(`📦 Total de objetos na cena: ${count}`);
            alert(`${count} objetos encontrados na cena`);
        });
    }
    
    if (btnClearAll) {
        btnClearAll.addEventListener('click', () => {
            if (!window.builder || !window.builder.objects) {
                console.warn('⚠️ Builder não inicializado!');
                return;
            }
            
            const count = window.builder.objects.activeObjects.length;
            if (count === 0) {
                alert('Nenhum objeto para remover!');
                return;
            }
            
            if (confirm(`⚠️ Deseja remover TODOS os ${count} objetos?`)) {
                window.builder.objects.clear();
                console.log('🗑️ Todos os objetos removidos!');
                updateObjectInfo(); // Atualiza o display
            }
        });
    }
}

// ============================================================================
// 📊 ATUALIZAÇÃO EM TEMPO REAL DAS INFORMAÇÕES
// ============================================================================

function updateObjectInfo() {
    const nameEl = document.getElementById('selected-object-name');
    const posEl = document.getElementById('selected-object-position');
    
    if (!nameEl || !posEl) return;
    if (!window.builder?.tools?.transformControl) return;
    
    const gizmo = window.builder.tools.transformControl;
    
    if (gizmo.object) {
        const obj = gizmo.object;
        const type = obj.userData.type || 'Objeto';
        const pos = obj.position;
        const rot = obj.rotation.y * (180 / Math.PI); // Converte para graus
        const scale = obj.scale.x;
        
        // Nome do objeto
        nameEl.innerHTML = `<strong style="color: var(--accent);">🌲 ${type.toUpperCase()}</strong>`;
        nameEl.style.borderLeft = '3px solid var(--accent)';
        
        // Posição e propriedades
        posEl.innerHTML = `
            <strong>Posição:</strong> X: ${pos.x.toFixed(1)} | Z: ${pos.z.toFixed(1)} | Y: ${pos.y.toFixed(1)}<br>
            <strong>Rotação:</strong> ${rot.toFixed(0)}° | <strong>Escala:</strong> ${scale.toFixed(2)}x
        `;
        posEl.style.color = 'var(--text-main)';
        
        // Destaca o modo ativo do gizmo
        highlightActiveGizmoButton(gizmo.mode);
        
    } else {
        nameEl.textContent = 'Nenhum objeto selecionado';
        nameEl.style.borderLeft = '3px solid var(--ui-border-dark)';
        posEl.textContent = 'Clique em um objeto na cena';
        posEl.style.color = 'var(--text-dim)';
        
        // Remove destaques
        document.querySelectorAll('[data-tool^="move-object"], [data-tool^="rotate-object"], [data-tool^="scale-object"]')
            .forEach(btn => btn.classList.remove('active'));
    }
}

// Destaca o botão correspondente ao modo do gizmo
function highlightActiveGizmoButton(mode) {
    // Remove active de todos
    document.querySelectorAll('[data-tool^="move-object"], [data-tool^="rotate-object"], [data-tool^="scale-object"]')
        .forEach(btn => btn.classList.remove('active'));
    
    // Adiciona active no botão correto
    const modeMap = {
        'translate': 'move-object',
        'rotate': 'rotate-object',
        'scale': 'scale-object'
    };
    
    const toolName = modeMap[mode];
    if (toolName) {
        const btn = document.querySelector(`[data-tool="${toolName}"]`);
        if (btn) btn.classList.add('active');
    }
}

// ============================================================================
// 🚀 INICIALIZAÇÃO AUTOMÁTICA
// ============================================================================

// Aguarda o DOM estar pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObjectTools);
} else {
    initObjectTools();
}

function initObjectTools() {
    console.log('🎮 Inicializando Controles de Objeto...');
    
    // Aguarda o builder estar disponível
    const checkBuilder = setInterval(() => {
        if (window.builder && window.builder.tools) {
            clearInterval(checkBuilder);
            
            // ✅ APENAS conecta os botões (HTML já existe!)
            setupObjectToolButtons();
            setupActionButtons();
            
            // Inicia atualização em tempo real
            setInterval(updateObjectInfo, 300);
            
            console.log('✅ Controles de Objeto Inicializados!');
        }
    }, 100);
    
    // Timeout de segurança (10 segundos)
    setTimeout(() => {
        clearInterval(checkBuilder);
    }, 10000);
}

console.log('✅ Gizmo Controller carregado (HTML Manual)!');
