import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { FloraUtils } from '../utils/FloraUtils.js'; 
import { getHeight } from '../world/Terrain.js'; 

// Catálogos de assets por categoria
const CATALOGOS = [
    { chave: 'vegetacao',       path: 'js/world/flora/species/vegetacao.json',       campo: 'vegetacao'       },
    { chave: 'rochas_recursos', path: 'js/world/rocks/rochas_recursos.json',         campo: 'rochas_recursos' },
    { chave: 'estruturas',      path: 'js/world/structures/estruturas.json',         campo: 'estruturas'      },
    { chave: 'infraestrutura',  path: 'js/world/infrasctructure/infraestrutura.json', campo: 'infraestrutura'  }
];

export class ObjectManager {
    constructor(scene) {
        this.scene = scene;
        this.activeObjects = [];
        this.floraLib = {};   // id → THREE.BufferGeometry
        this.assetMeta = {};  // id → { nome, icone, arquivo }
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.loadAllAssets();
    }

    // -------------------------------------------------------------------------
    // Carrega todos os catálogos e depois cada asset JSON individual
    // -------------------------------------------------------------------------
    async loadAllAssets() {
        for (const catalogo of CATALOGOS) {
            try {
                const res = await fetch(catalogo.path);
                if (!res.ok) { console.warn(`Catálogo não encontrado: ${catalogo.path}`); continue; }
                const data = await res.json();
                const itens = data[catalogo.campo] || [];

                for (const item of itens) {
                    // Registra metadados (para o frontend gerar botões)
                    this.assetMeta[item.id] = { nome: item.nome, icone: item.icone, arquivo: item.arquivo };

                    // Tenta carregar o asset JSON (pode não existir ainda — placeholder)
                    try {
                        const assetRes = await fetch(item.arquivo);
                        if (!assetRes.ok) continue; // ainda não criado — sem erro visível
                        const assetData = await assetRes.json();
                        if (FloraUtils?.createMergedGeometry) {
                            this.floraLib[item.id] = FloraUtils.createMergedGeometry(assetData, 0.5);
                            console.log(`✅ Asset carregado: ${item.id}`);
                        }
                    } catch (e) { /* asset ainda não existe — placeholder registrado */ }
                }
            } catch (e) { console.warn(`Erro ao carregar catálogo: ${catalogo.path}`, e); }
        }

        // Notifica o frontend que os assets estão prontos para gerar os botões
        document.dispatchEvent(new CustomEvent('assets-loaded', { detail: this.assetMeta }));
        console.log(`✅ ObjectManager: ${Object.keys(this.floraLib).length} assets carregados, ${Object.keys(this.assetMeta).length} registrados`);
    }

    // -------------------------------------------------------------------------
    // Limpa todos os objetos da cena
    // -------------------------------------------------------------------------
    clear() {
        this.activeObjects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
        });
        this.activeObjects = [];
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }
    }

    // -------------------------------------------------------------------------
    // Planta um objeto na cena
    // -------------------------------------------------------------------------
    spawn(data, seed) {
        const geometry = this.floraLib[data.type];
        if (!geometry) {
            console.warn(`Asset não disponível ainda: ${data.type}`);
            return;
        }

        const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
        const mesh = new THREE.Mesh(geometry, material);

        let y = data.y;
        if (typeof getHeight === 'function') y = getHeight(data.x, data.z, seed);

        mesh.position.set(data.x, y, data.z);
        mesh.scale.setScalar(data.s || 1);
        mesh.rotation.y = data.r || 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: data.type, originalScale: data.s };

        this.group.add(mesh);
        this.activeObjects.push(mesh);
    }
}
