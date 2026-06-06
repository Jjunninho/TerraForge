# 🗺️ PROMPT MASTER — BUILDER v4.0
**Projeto:** Editor de Mundo Procedural 3D (Browser-Native)  
**Arquitetura:** Dois projetos irmãos, integrados via localStorage  
**Status:** ✅ Integração Mundo→Builder funcional | Builder com terreno, flora e gizmo operacionais  
**Última Atualização:** Junho 2026

---

## 🌐 VISÃO GERAL DO SISTEMA

O projeto é composto por **dois aplicativos HTML independentes** que se comunicam via `localStorage`:

| App | Arquivo | Função |
|-----|---------|--------|
| **Mundo Procedural 3D** | `index_md_v6.1.html` | Gera terrenos infinitos com chunks, biomas, flora, fauna, ciclo dia/noite, água. **Consolidado.** |
| **Builder** | `builder_2.html` | Carrega o `.planet` gerado pelo Mundo e permite edição manual: escultura, objetos, construções. **Em desenvolvimento ativo.** |

### Fluxo de Trabalho
```
Mundo Procedural  ──[🏗️ Abrir no Builder]──▶  localStorage  ──[🌍 Carregar Mundo Atual]──▶  Builder
      │                                                                                            │
      │◀──────────────────────────[🔭 Voltar ao Mundo Procedural]────────────────────────────────┘
```
- O Mundo grava `planet_for_builder` no `localStorage` e abre o Builder numa nova aba
- O Builder detecta a chave ao carregar e avisa o usuário; um botão explícito importa o mapa
- A chave é apagada do `localStorage` após o carregamento para evitar re-importação acidental

---

## 📁 ESTRUTURA DE DIRETÓRIOS (ATUAL — Junho 2026)

```
C:\DEV\3D\
│   builder_2.html              ← Editor de mundo (Builder)
│   index_md_v6.1.html          ← Mundo Procedural 3D (consolidado)
│
├───css/
│       painel.css              ← Estilos compartilhados (painel lateral)
│       painel_builder.css      ← Estilos específicos do Builder
│
├───Docs/
│       PROMPT_BUILDER_REFACTORED.md   ← Este arquivo
│       ⛰️ ESCULTURA DE TERRA.txt
│
├───js/
│   │   builder.js              ← Orquestrador do Builder (BuilderManager)
│   │   config.js               ← CONFIG global (cores, seeds, chunk size)
│   │   frontend.js             ← Sistema de abas e sliders (Builder UI)
│   │   gizmo_controller.js     ← Integração TransformControls ↔ UI
│   │   main.js                 ← Orquestrador do Mundo Procedural
│   │
│   ├───core/
│   │       Input.js            ← Captura de input (teclado/mouse) do Mundo
│   │
│   ├───modules/                ← Módulos exclusivos do Builder
│   │       Graphics.js         ← Scene, Camera, Renderer, OrbitControls, Luzes
│   │       IO.js               ← Load/Save .planet (importa ../config.js)
│   │       Objects.js          ← Spawn/Clear de flora (importa ../utils/FloraUtils.js)
│   │       Terrain.js          ← getHeight + TerrainManager (malha única 256x256)
│   │       Tools.js            ← Raycaster, Brush, Escultura, Gizmo
│   │
│   ├───utils/
│   │       FloraUtils.js       ← Geração de geometrias de árvores (sem deps externas)
│   │       MathUtils.js        ← fbm, warpedNoise, perlinNoise, Random
│   │
│   └───world/                  ← Módulos exclusivos do Mundo Procedural
│       │   ChunkManager.js     ← Geração/carregamento de chunks infinitos
│       │   PlanetSystem.js     ← Metadados, exportação .planet, estatísticas
│       │   Terrain.js          ← getHeight/getMoisture/getBiome (shared logic)
│       │   WaterSystem.js      ← Superfície de água animada
│       │
│       ├───fauna/
│       │       FaunaSystem.js
│       │
│       └───flora/
│           │   FloraSystem.js
│           └───species/
│                   carvalho.json
│                   macieira.json
│                   pinheiro.json
│
├───system/
│       three.min.js            ← Three.js r128 local (Mundo Procedural usa este)
│
└───textures/
        waternormals.jpg
```

### ⚠️ Regra Crítica: Three.js no Builder vs Mundo

| App | Como carrega Three.js |
|-----|----------------------|
| **Mundo Procedural** | `<script src="system/three.min.js">` (UMD global) + módulos ES sem import de THREE |
| **Builder** | Módulos ES importam via `cdn.skypack.dev/three@0.132.2` — **SEM** `<script>` UMD no HTML |

**Nunca misturar**: carregar UMD global + import ES do mesmo Three.js na mesma página cria duas instâncias separadas e quebra silenciosamente.

---

## ✅ O QUE ESTÁ FUNCIONANDO (Junho 2026)

### Mundo Procedural (`index_md_v6.1.html`) — CONSOLIDADO
- [x] Geração procedural infinita com chunks (ChunkManager)
- [x] Biomas completos (15 tipos: água, planícies, montanhas, deserto, selva, floresta, tundra, corrupção, carmesim, hallow, cogumelos, lava, mel, neve)
- [x] Flora procedural por bioma (pinheiro, carvalho, macieira via JSON)
- [x] Sistema de água animado (WaterSystem)
- [x] Ciclo dia/noite
- [x] PlanetSystem: nomear planetas, exportar/importar `.planet.json`
- [x] Salvar/carregar via BroadcastChannel e arquivo
- [x] **Botão "🏗️ Abrir no Builder"** — grava no BroadcastChannele abre o Builder *(novo)*
- [x] `window.planetSystem` exposto globalmente para integração

### Builder (`builder_2.html`) — EM DESENVOLVIMENTO
- [x] Carregamento de `.planet` via file input
- [x] **Botão "🌍 Carregar Mundo Atual"** — lê do BroadcastChannel *(novo)*
- [x] **Botão "🔭 Voltar ao Mundo Procedural"** *(novo)*
- [x] Auto-detecção de mapa disponível no BroadcastChannel ao abrir
- [x] Renderização de terreno com biomas e cores (TerrainManager, malha 256x256, 128 segmentos)
- [x] Sincronização de PANEL_STATE ao carregar .planet
- [x] Escultura de terreno (raise, lower, flatten, smooth, terraform, dig)
- [x] Brush helper visual com raio ajustável
- [x] Sistema de objetos: spawn/clear de flora (pinheiro, carvalho, macieira)
- [x] Snap-to-ground ao spawnar objetos
- [x] TransformControls (Gizmo): translate/rotate/scale
- [x] Seleção de objeto por click
- [x] Duplicar (Ctrl+D) e deletar (Del) objetos
- [x] Atalhos de teclado: T/R/S/Ctrl+D/Delete
- [x] Info do objeto em tempo real (posição, rotação, escala)
- [x] Sistema de abas: Terreno / Objetos / Construção / Ferramentas / Mundo

---

## 🐛 LIÇÕES APRENDIDAS (Bugs já resolvidos — não repetir)

| Bug | Causa | Fix |
|-----|-------|-----|
| 404 nos módulos do Builder | `builder.js` ficava em `js/` mas importava de `./modules/` enquanto os arquivos estavam na raiz | Mover arquivos para `js/modules/` e corrigir paths |
| 404 no FloraUtils/Terrain/config | Paths `../../../` em módulos dentro de `js/modules/` | Corrigir para `../utils/`, `../world/`, `../config.js` |
| `TerrainManager` não exportado | `js/modules/Terrain.js` era o Terrain do Mundo (funções puras), sem a classe | Adicionar `export class TerrainManager` no fim do arquivo |
| `THREE` undefined no FloraUtils/Terrain | Arquivos usavam THREE sem importar | Adicionar `import * as THREE from 'cdn.skypack.dev'` no topo |
| Fetch das species 404 | `basePath = '../world/...'` — fetch resolve relativo ao HTML, não ao JS | Trocar para `'js/world/flora/species/'` |
| Two Three.js instances | HTML do Builder carregava UMD via CDN + módulos importavam via skypack | Remover as 3 linhas `<script src="cdnjs/unpkg">` do HTML |
| `planet_for_builder` nunca limpo | — | `localStorage.removeItem` após carregar no Builder |

---

## 🎯 ROADMAP DO BUILDER (Priorizado)

### FASE 1 — Fundação Sólida *(próxima)*

**1.1 — Save/Export no Builder**
- [x ] Botão "Salvar" — exporta o estado editado de volta para `.planet.json`
- [ x] Deve incluir: seed, settings, posições editadas de flora, modificações de terreno
- [ x] Módulo: `IO.js` (expandir `loadMap` com método `saveMap`)

**1.2 — Sincronização de Terreno ao Carregar**
- [x ] Ao carregar `.planet`, os sliders do painel devem refletir os valores do arquivo
- [ x] PANEL_STATE já é sincronizado; falta atualizar a UI (inputs/displays dos sliders)
- [ x] Módulo: `IO.js` + `frontend.js`

**1.3 — Resolução de Terreno Configurável**
- [ x] Slider para escolher 64/128/256 segmentos (hoje fixo em 128)
- [ x] Regenera a malha ao mudar
- [x ] Módulo: `TerrainManager` em `js/modules/Terrain.js`

---

### FASE 2 — Ferramentas de Edição

**2.1 — Pintura de Textura/Bioma**
- [ ] Brush que muda a cor do vértice (pinta bioma visualmente)
- [ ] Paleta de biomas no painel
- [ ] Módulo: novo método em `Tools.js` + shader de cor

**2.2 — Scatter Brush de Vegetação**
- [ ] Segurar mousedown com ferramenta "place" para plantar em área
- [ ] Controle de densidade (objetos/m²)
- [ ] Hoje: `isMouseDown` já existe em Tools.js — completar a lógica

**2.3 — Undo / Redo**
- [ ] Novo módulo: `History.js` (Command Pattern, máx 50 ações)
- [ ] Ctrl+Z / Ctrl+Y
- [ ] Ações a registrar: escultura, spawn, delete, move

---

### FASE 3 — Novos Objetos e Estruturas

**3.1 — Novas Espécies de Flora**
- [ ] Palmeira, Arbusto, Cacto, Bambu, Flores
- [ ] Adicionar JSONs em `js/world/flora/species/`
- [ ] Atualizar lista em `Objects.js`

**3.2 — Rochas e Recursos**
- [ ] Rocha pequena, média, pedregulho, minérios, cristais
- [ ] Nova categoria no painel de objetos

**3.3 — Estruturas (novo módulo `Structures.js`)**
- [ ] Casa simples, torre, muro (segmento), portão
- [ ] Socket snap: conectar peças em pontos predefinidos

---

### FASE 4 — Ambiente e Atmosfera

**4.1 — Ciclo Dia/Noite no Builder**
- [ ] Slider de hora (0–24h)
- [ ] DirectionalLight segue arco solar
- [ ] Cor do céu muda com hora

**4.2 — Clima**
- [ ] Neblina (fog distance)
- [ ] Chuva (sistema de partículas)
- [ ] Neve (partículas + acúmulo visual)

---

### FASE 5 — Precisão e Qualidade de Vida

**5.1 — Grid Snap**
- [ ] Modo de grade: 1m, 2m, 4m
- [ ] Snap automático ao soltar objeto

**5.2 — Autosave**
- [ ] Salva no localStorage a cada 5 min
- [ ] Indicador visual "Salvo há X min"

**5.3 — Export de Heightmap**
- [ ] Exporta PNG 16-bit da altura do terreno editado

---

## 🔧 NOTAS TÉCNICAS PARA O BUILDER

### Como `TerrainManager` funciona
`js/modules/Terrain.js` exporta **duas coisas**:
1. Funções puras (`getHeight`, `getMoisture`, `getBiome`, etc.) — shared com o Mundo via lógica idêntica
2. `class TerrainManager` — malha Three.js única (não-chunk) para o editor

`TerrainManager.generate(seed)` cria um `PlaneGeometry(256, 256, 128, 128)`, itera cada vértice chamando `getHeight`/`getMoisture`/`getBiome`, aplica vertex colors por bioma e adiciona à cena.

### Como a integração localStorage funciona
```javascript
// Mundo → Builder
localStorage.setItem('planet_for_builder', JSON.stringify(planetData));
window.open('builder_2.html', '_blank');

// Builder (ao detectar chave)
const raw = localStorage.getItem('planet_for_builder');
if (raw) {
    window.builder.io.loadMap(JSON.parse(raw));
    localStorage.removeItem('planet_for_builder'); // Limpar após uso!
}
```

### Checklist antes de considerar uma feature "pronta"
- [ ] Código implementado e browser-testado
- [ ] Nenhum erro no console
- [ ] UI conectada (botão/slider funcional)
- [ ] Testado com arquivo `.planet` real
- [ ] FPS aceitável (>30) com flora carregada
- [ ] Integração com gizmo_controller.js se mexer em objetos

---

**Próximo Milestone:** Save/Export no Builder (1.1) + Sincronização de sliders na UI ao carregar (1.2)
