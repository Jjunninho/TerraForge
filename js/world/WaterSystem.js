import { CONFIG } from '../config.js';
import { WATER_LEVEL } from './Terrain.js'; // ✅ NOVO: Importar o nível do mar

export class WaterSystem {
    constructor(scene, sunLight) {
        this.scene = scene;
        this.sunLight = sunLight;
        this.waterMesh = null;
        this.moveFactor = 0;
        this.textureLoaded = false;
    }

    createOcean() {
        // Geometria gigante para cobrir o mundo todo
        const geometry = new THREE.PlaneGeometry(10000, 10000, 1, 1);

        // ===================================
        // CARREGAMENTO DE TEXTURA COM FALLBACK
        // ===================================
        const loader = new THREE.TextureLoader();
        const normalMap = new THREE.Texture();
        
        loader.load(
            'textures/waternormals.jpg',
            (texture) => {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                this.waterMesh.material.uniforms['normalSampler'].value = texture;
                this.textureLoaded = true;
                console.log('✅ Textura de água carregada localmente');
            },
            undefined,
            (err) => {
                console.warn('⚠️ Textura local não encontrada, tentando online...');
                loader.load(
                    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg',
                    (texture) => {
                        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                        this.waterMesh.material.uniforms['normalSampler'].value = texture;
                        this.textureLoaded = true;
                        console.log('✅ Textura de água carregada online');
                    },
                    undefined,
                    (finalErr) => {
                        console.error('❌ Falha ao carregar textura de água:', finalErr);
                        this.waterMesh.material.uniforms['normalSampler'].value = this.createFallbackTexture();
                    }
                );
            }
        );

        // ===================================
        // SHADER CUSTOMIZADO DE ÁGUA
        // ===================================
        const waterUniforms = {
            'time': { value: 0 },
            'size': { value: 10.0 },
            'distortionScale': { value: 3.7 },
            'sunColor': { value: new THREE.Color(0xffffff) },
            'sunDirection': { value: new THREE.Vector3(0.70707, 0.70707, 0) },
            'waterColor': { value: new THREE.Color(CONFIG.COLORS.WATER) },
            'normalSampler': { value: normalMap },
            'alpha': { value: 0.8 }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: waterUniforms,
            vertexShader: `
                uniform float time;
                varying vec2 vUv;
                varying vec3 vToEye;
                varying vec3 vWorldPosition;

                void main() {
                    vUv = uv;
                    
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vToEye = cameraPosition - worldPosition.xyz;
                    
                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D normalSampler;
                uniform float time;
                uniform float size;
                uniform vec3 sunColor;
                uniform vec3 sunDirection;
                uniform vec3 waterColor;
                uniform float alpha;
                
                varying vec2 vUv;
                varying vec3 vToEye;
                varying vec3 vWorldPosition;

                vec3 getNormal(vec2 uv) {
                    vec2 uv0 = (uv / 103.0) + vec2(time / 17.0, time / 29.0);
                    vec2 uv1 = uv / 107.0 - vec2(time / -19.0, time / 31.0);
                    
                    vec4 noise = (texture2D(normalSampler, uv0) + 
                                  texture2D(normalSampler, uv1)) * 0.5;
                    
                    return normalize(noise.xyz * 2.0 - 1.0);
                }

                void main() {
                    vec3 surfaceNormal = getNormal(vUv * size);
                    vec3 eyeDirection = normalize(vToEye);
                    
                    // Reflexo especular (brilho do sol)
                    vec3 sunDir = normalize(sunDirection);
                    vec3 reflection = reflect(-sunDir, surfaceNormal);
                    float specular = pow(max(0.0, dot(eyeDirection, reflection)), 50.0) * 2.0;
                    
                    // Efeito Fresnel (água mais reflexiva nas bordas)
                    float fresnel = pow(1.0 - max(dot(eyeDirection, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
                    
                    vec3 finalColor = mix(waterColor, sunColor, fresnel * 0.2) + sunColor * specular;
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        this.waterMesh = new THREE.Mesh(geometry, material);
        this.waterMesh.rotation.x = -Math.PI / 2;
        
        // ===================================
        // ✅ CORREÇÃO CRÍTICA: Usar o nível do mar definido em Terrain.js
        // ===================================
        this.waterMesh.position.y = WATER_LEVEL; // Agora usa Y = 0 (ou o valor de WATER_LEVEL)
        
        this.waterMesh.renderOrder = 1;
        
        this.scene.add(this.waterMesh);
        
        console.log(`🌊 Sistema de água inicializado no nível Y = ${WATER_LEVEL}`);
    }

    createFallbackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        const imageData = ctx.createImageData(512, 512);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 50 + 100;
            imageData.data[i] = noise;
            imageData.data[i + 1] = noise;
            imageData.data[i + 2] = 255;
            imageData.data[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        console.log('🎨 Usando textura procedural de emergência');
        return texture;
    }

    update(deltaTime) {
        if (!this.waterMesh) return;
        
        this.waterMesh.material.uniforms['time'].value += deltaTime * 0.2;
        
        if (this.sunLight) {
            const sunDir = this.sunLight.position.clone().normalize();
            this.waterMesh.material.uniforms['sunDirection'].value.copy(sunDir);
        }
    }

    // ===================================
    // MÉTODOS ÚTEIS
    // ===================================
    setWaterLevel(y) {
        if (this.waterMesh) {
            this.waterMesh.position.y = y;
            console.log(`🌊 Nível da água ajustado para Y = ${y}`);
        }
    }

    setWaterColor(color) {
        if (this.waterMesh) {
            this.waterMesh.material.uniforms['waterColor'].value.set(color);
        }
    }

    setTransparency(alpha) {
        if (this.waterMesh) {
            this.waterMesh.material.uniforms['alpha'].value = Math.max(0, Math.min(1, alpha));
        }
    }

    dispose() {
        if (this.waterMesh) {
            this.waterMesh.geometry.dispose();
            this.waterMesh.material.dispose();
            this.scene.remove(this.waterMesh);
            this.waterMesh = null;
        }
    }
}
