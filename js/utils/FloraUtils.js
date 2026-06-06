import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
// ===================================================================
// FloraUtils.js - VERSÃO FINAL - Merge Manual Correto
// SEM dependências externas problemáticas
// ===================================================================

export const FloraUtils = {
    /**
     * ✅ MERGE MANUAL CORRETO - Preserva índices e topologia
     * Sem dependências externas problemáticas
     */
    createMergedGeometry: (treeDefinition, globalScale = 1) => {
        if (!treeDefinition || !treeDefinition.blocks) {
            console.warn('JSON inválido ou sem blocks');
            return new THREE.BufferGeometry();
        }

        const geometries = [];

        treeDefinition.blocks.forEach(block => {
            let geometry;

            // Normaliza scale: aceita número simples OU objeto {x,y,z} do Voxel Genesis
            const rawScale = block.scale;
            const isVec = rawScale && typeof rawScale === 'object';
            const sx = (isVec ? rawScale.x : rawScale || 1) * globalScale;
            const sy = (isVec ? rawScale.y : rawScale || 1) * globalScale;
            const sz = (isVec ? rawScale.z : rawScale || 1) * globalScale;
            const su = (sx + sy + sz) / 3; // escala uniforme para tipos que não usam xyz

            // Cria geometria primitiva — suporta cylinder, cone, sphere, box, cube
            switch (block.type) {
                case 'cylinder':
                    const cylHeight = 1.0 * su;
                    geometry = new THREE.CylinderGeometry(0.15 * su, 0.15 * su, cylHeight, 8);
                    geometry.translate(0, cylHeight / 2, 0);
                    break;

                case 'cone':
                    const coneHeight = 1.0 * su;
                    geometry = new THREE.ConeGeometry(0.5 * su, coneHeight, 8);
                    geometry.translate(0, coneHeight / 2, 0);
                    break;

                case 'sphere':
                    geometry = new THREE.SphereGeometry(0.5 * su, 16, 16);
                    break;

                case 'box':
                case 'cube':
                    geometry = new THREE.BoxGeometry(sx, sy, sz);
                    break;

                default:
                    geometry = new THREE.BoxGeometry(su, su, su);
            }

            // Aplica rotação por bloco se existir (formato Voxel Genesis)
            if (block.rotation) {
                geometry.rotateX(block.rotation.x || 0);
                geometry.rotateY(block.rotation.y || 0);
                geometry.rotateZ(block.rotation.z || 0);
            }

            // Posicionar geometria
            geometry.translate(
                (block.position?.x || 0) * globalScale,
                (block.position?.y || 0) * globalScale,
                (block.position?.z || 0) * globalScale
            );

            // ✅ Aplicar Vertex Colors
            const color = new THREE.Color(block.color || '#ffffff');
            const count = geometry.attributes.position.count;
            const colors = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }

            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geometries.push(geometry);
        });

        // ✅ MERGE MANUAL CORRETO (preserva índices)
        return FloraUtils._mergeBufferGeometries(geometries);
    },

    /**
     * ✅ IMPLEMENTAÇÃO MANUAL CORRETA
     * Baseado no BufferGeometryUtils do Three.js
     * Preserva índices, normais e vertex colors
     */
    _mergeBufferGeometries: (geometries) => {
        if (geometries.length === 0) return new THREE.BufferGeometry();
        if (geometries.length === 1) return geometries[0].clone();

        // Verificar se todas as geometrias são indexadas ou não
        const isIndexed = geometries[0].index !== null;
        
        // Calcular totais
        let totalVertices = 0;
        let totalIndices = 0;
        
        geometries.forEach(geo => {
            totalVertices += geo.attributes.position.count;
            
            if (isIndexed && geo.index) {
                totalIndices += geo.index.count;
            } else if (!isIndexed) {
                totalIndices += geo.attributes.position.count;
            }
        });

        // Preparar arrays
        const posArray = new Float32Array(totalVertices * 3);
        const normArray = new Float32Array(totalVertices * 3);
        const colArray = new Float32Array(totalVertices * 3);
        
        let indexArray = null;
        if (isIndexed || totalVertices > 65535) {
            // Usar Uint32Array se precisar de mais de 65535 vértices
            indexArray = totalVertices > 65535 
                ? new Uint32Array(totalIndices)
                : new Uint16Array(totalIndices);
        }

        let vertOffset = 0;
        let idxOffset = 0;

        // Processar cada geometria
        geometries.forEach(geo => {
            const vertCount = geo.attributes.position.count;
            
            // Copiar position
            if (geo.attributes.position) {
                posArray.set(geo.attributes.position.array, vertOffset * 3);
            }
            
            // Copiar normal
            if (geo.attributes.normal) {
                normArray.set(geo.attributes.normal.array, vertOffset * 3);
            }
            
            // Copiar color
            if (geo.attributes.color) {
                colArray.set(geo.attributes.color.array, vertOffset * 3);
            } else {
                // Preencher com branco se não tiver cor
                for (let i = 0; i < vertCount; i++) {
                    const idx = (vertOffset + i) * 3;
                    colArray[idx] = 1;
                    colArray[idx + 1] = 1;
                    colArray[idx + 2] = 1;
                }
            }

            // ✅ CRÍTICO: Copiar e ajustar índices
            if (indexArray) {
                if (geo.index) {
                    // Geometria tem índices - copiar e ajustar offset
                    const indices = geo.index.array;
                    for (let i = 0; i < indices.length; i++) {
                        indexArray[idxOffset + i] = indices[i] + vertOffset;
                    }
                    idxOffset += indices.length;
                } else {
                    // Geometria não tem índices - criar sequenciais
                    for (let i = 0; i < vertCount; i++) {
                        indexArray[idxOffset + i] = vertOffset + i;
                    }
                    idxOffset += vertCount;
                }
            }

            vertOffset += vertCount;
        });

        // Criar geometria final
        const merged = new THREE.BufferGeometry();
        
        merged.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        merged.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
        merged.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
        
        // ✅ Aplicar índices se necessário
        if (indexArray) {
            merged.setIndex(new THREE.BufferAttribute(indexArray, 1));
        }

        // ✅ Recalcular normais (importante!)
        merged.computeVertexNormals();
        
        return merged;
    },

    /**
     * Método alternativo: Group (sem merge)
     */
    generateTreeFrom3DBlocks: (treeJSON, progress = 1) => {
        const treeGroup = new THREE.Group();
        
        if (!treeJSON || !treeJSON.blocks) {
            console.warn('JSON inválido ou sem blocks');
            return treeGroup;
        }

        treeJSON.blocks.forEach((block, index) => {
            const blockThreshold = index / treeJSON.blocks.length;
            if (blockThreshold > progress) return;

            let geometry;
            const blockScale = block.scale || 1;
            
            switch (block.type) {
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(
                        0.2 * blockScale, 
                        0.2 * blockScale, 
                        1.0, 
                        8
                    );
                    break;
                    
                case 'sphere':
                    geometry = new THREE.SphereGeometry(
                        0.5 * blockScale, 
                        16, 
                        16
                    );
                    break;
                    
                case 'cone':
                    geometry = new THREE.ConeGeometry(
                        0.8 * blockScale, 
                        1.5, 
                        8
                    );
                    break;
                    
                default:
                    geometry = new THREE.BoxGeometry(
                        0.5 * blockScale,
                        0.5 * blockScale,
                        0.5 * blockScale
                    );
            }

            const material = new THREE.MeshStandardMaterial({
                color: block.color || '#ffffff',
                roughness: 0.7,
                metalness: 0.1
            });

            const mesh = new THREE.Mesh(geometry, material);
            
            if (block.position) {
                mesh.position.set(
                    block.position.x || 0,
                    block.position.y || 0,
                    block.position.z || 0
                );
            }

            mesh.scale.multiplyScalar(progress);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            treeGroup.add(mesh);
        });

        return treeGroup;
    },

    /**
     * Textura billboard 2D
     */
    generateTextureFrom2D: (treeJSON, progress = 1) => {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(size / 2, size - 20);

        if (!treeJSON || !treeJSON.blocks) {
            return new THREE.CanvasTexture(canvas);
        }

        treeJSON.blocks.forEach((block, index) => {
            const blockThreshold = index / treeJSON.blocks.length;
            if (blockThreshold > progress) return;

            const scale = (block.scale || 1) * progress;
            const x = (block.position?.x || 0) * 30;
            const y = -(block.position?.y || 0) * 30;
            
            ctx.fillStyle = block.color || '#00ff00';

            switch (block.type) {
                case 'cylinder':
                    const cylWidth = 20 * scale;
                    const cylHeight = 30 * scale;
                    ctx.fillRect(x - cylWidth/2, y - cylHeight/2, cylWidth, cylHeight);
                    
                    ctx.fillStyle = FloraUtils._darkenColor(block.color, 0.3);
                    ctx.fillRect(x + cylWidth/4, y - cylHeight/2, cylWidth/4, cylHeight);
                    break;
                    
                case 'sphere':
                    const radius = 25 * scale;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    const gradient = ctx.createRadialGradient(
                        x - radius/3, y - radius/3, 0,
                        x, y, radius
                    );
                    gradient.addColorStop(0, FloraUtils._lightenColor(block.color, 0.4));
                    gradient.addColorStop(1, block.color);
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'cone':
                    const coneWidth = 60 * scale;
                    const coneHeight = 45 * scale;
                    ctx.beginPath();
                    ctx.moveTo(x, y - coneHeight);
                    ctx.lineTo(x - coneWidth/2, y);
                    ctx.lineTo(x + coneWidth/2, y);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.fillStyle = FloraUtils._darkenColor(block.color, 0.2);
                    ctx.beginPath();
                    ctx.moveTo(x, y - coneHeight);
                    ctx.lineTo(x + coneWidth/2, y);
                    ctx.lineTo(x, y);
                    ctx.closePath();
                    ctx.fill();
                    break;
            }
        });

        ctx.restore();

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        
        return texture;
    },

    loadTreeFromJSON: async (jsonUrl, progress = 1) => {
        try {
            const response = await fetch(jsonUrl);
            const treeJSON = await response.json();
            return FloraUtils.generateTreeFrom3DBlocks(treeJSON, progress);
        } catch (error) {
            console.error(`Erro ao carregar árvore de ${jsonUrl}:`, error);
            return new THREE.Group();
        }
    },

    createTreeInstances: (treeJSON, count = 1, options = {}) => {
        const trees = [];
        const {
            scaleVariation = 0.2,
            rotationVariation = true,
            progressVariation = 0.15
        } = options;

        for (let i = 0; i < count; i++) {
            const progress = 0.7 + Math.random() * progressVariation;
            const tree = FloraUtils.generateTreeFrom3DBlocks(treeJSON, progress);
            
            const scaleModifier = 1 + (Math.random() - 0.5) * scaleVariation;
            tree.scale.multiplyScalar(scaleModifier);
            
            if (rotationVariation) {
                tree.rotation.y = Math.random() * Math.PI * 2;
            }
            
            trees.push(tree);
        }

        return trees;
    },

    _darkenColor: (hexColor, percent) => {
        const color = new THREE.Color(hexColor);
        color.r *= (1 - percent);
        color.g *= (1 - percent);
        color.b *= (1 - percent);
        return '#' + color.getHexString();
    },

    _lightenColor: (hexColor, percent) => {
        const color = new THREE.Color(hexColor);
        color.r = Math.min(1, color.r + (1 - color.r) * percent);
        color.g = Math.min(1, color.g + (1 - color.g) * percent);
        color.b = Math.min(1, color.b + (1 - color.b) * percent);
        return '#' + color.getHexString();
    },

    createCrossBillboard: (texture, size = 10) => {
        const group = new THREE.Group();
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.5
        });

        const plane1 = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size * 2),
            material
        );
        group.add(plane1);

        const plane2 = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size * 2),
            material
        );
        plane2.rotation.y = Math.PI / 2;
        group.add(plane2);

        return group;
    }
};
