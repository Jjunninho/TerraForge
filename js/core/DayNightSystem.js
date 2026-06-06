/**
 * DayNightSystem.js
 * 
 * Gerencia o ciclo dia/noite:
 *   - TIME_CONFIG (estado do tempo)
 *   - Órbita do sol (DirectionalLight)
 *   - AtmosphereSystem (cor do horizonte)
 *   - Fog e background da cena
 *   - Intensidade das luzes
 * 
 * Uso:
 *   const dayNight = new DayNightSystem(scene, sunLight, ambientLight, atmosphereSystem);
 *   dayNight.update(delta); // chamado no animate()
 *   dayNight.setTime('dia' | 'noite' | 'aurora' | 'crepusculo');
 *   dayNight.setPlaying(true | false);
 */

export class DayNightSystem {
    constructor(scene, sunLight, ambientLight, atmosphereSystem) {
        this.scene            = scene;
        this.sunLight         = sunLight;
        this.ambientLight     = ambientLight;
        this.atmosphereSystem = atmosphereSystem;

        this.config = {
            duration : 120,   // segundos por dia completo
            time     : 0.25,  // 0=noite · 0.25=nascer · 0.5=dia · 0.75=pôr
            isPlaying: true
        };
    }

    // -----------------------------------------------------------------------
    // Chamado a cada frame com o delta do clock
    // -----------------------------------------------------------------------
    update(delta) {
        if (this.config.isPlaying) {
            this.config.time += delta / this.config.duration;
            if (this.config.time > 1) this.config.time = 0;
        }

        const sunDistance = 2000;
        const theta = (this.config.time - 0.25) * Math.PI * 2;

        this.sunLight.position.set(
            Math.cos(theta) * sunDistance,
            Math.sin(theta) * sunDistance,
            -500
        );

        const horizonColor = this.atmosphereSystem.update(
            this.sunLight.position,
            this.config.time
        );

        this.scene.fog.color.copy(horizonColor);
        this.scene.background.copy(horizonColor);

        const sunHeight = Math.max(0, Math.sin(theta));
        this.sunLight.intensity    = Math.max(0.1, sunHeight * 1.5);
        this.ambientLight.intensity = Math.max(0.2, sunHeight * 0.6);
    }

    // -----------------------------------------------------------------------
    // API para o painel UI
    // -----------------------------------------------------------------------
    setPlaying(playing) {
        this.config.isPlaying = playing;
    }

    setTime(cycle) {
        this.config.isPlaying = false;
        switch (cycle) {
            case 'dia':        this.config.time = 0.5;  break;
            case 'noite':      this.config.time = 0.0;  break;
            case 'aurora':     this.config.time = 0.25; break;
            case 'crepusculo': this.config.time = 0.75; break;
        }
    }

    getTime() {
        return this.config.time;
    }
}
