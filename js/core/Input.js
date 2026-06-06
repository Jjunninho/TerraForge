export class InputController {
    constructor(domElement, camera) {
        this.movement = { 
            forward: false, 
            backward: false, 
            left: false, 
            right: false, 
            jump: false,
            up: false,      // NOVO - Space para subir no modo voo
            down: false     // NOVO - Shift para descer no modo voo
        };
        this.flightMode = true; // NOVO - começa em modo voo
        this.domElement = domElement;
        this._initListeners();
    }

    _initListeners() {
        document.addEventListener('keydown', (e) => this._onKey(e, true));
        document.addEventListener('keyup', (e) => this._onKey(e, false));
    }

    _onKey(e, isPressed) {
        switch(e.code) {
            case 'KeyW': this.movement.forward = isPressed; break;
            case 'KeyS': this.movement.backward = isPressed; break;
            case 'KeyA': this.movement.left = isPressed; break;
            case 'KeyD': this.movement.right = isPressed; break;
            case 'Space': 
                if (this.flightMode) {
                    this.movement.up = isPressed; // No modo voo, Space sobe
                } else {
                    this.movement.jump = isPressed; // No modo terra, Space pula
                }
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.movement.down = isPressed; // Shift desce no modo voo
                break;
            case 'KeyF':
                if (isPressed) this.toggleFlightMode(); // F alterna modo
                break;
        }
    }
    
    getMovementVector() {
        const dir = new THREE.Vector3();
        if (this.movement.forward) dir.z -= 1;
        if (this.movement.backward) dir.z += 1;
        if (this.movement.left) dir.x -= 1;
        if (this.movement.right) dir.x += 1;
        return dir;
    }
    
    isJumping() {
        return this.movement.jump;
    }
    
    // NOVO - getters para modo voo
    isGoingUp() {
        return this.movement.up;
    }
    
    isGoingDown() {
        return this.movement.down;
    }
    
    toggleFlightMode() {
        this.flightMode = !this.flightMode;
        return this.flightMode;
    }
    
    isFlying() {
        return this.flightMode;
    }
}