import { Mesh, SphereGeometry, MeshStandardMaterial, Vector3, CanvasTexture } from 'three';
import * as CANNON from 'cannon-es';

class Player extends Mesh {
    constructor(parent, camera) {
        // VISUAL MESH SETUP
        const geometry = new SphereGeometry(0.5, 32, 32);

        // Generate Texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 230, 512, 52); 
        ctx.fillRect(100, 0, 50, 512);
        ctx.fillRect(350, 0, 50, 512);

        const texture = new CanvasTexture(canvas);

        const material = new MeshStandardMaterial({
            map: texture, 
            roughness: 0.4,
            metalness: 0.1,
        });
        super(geometry, material);

        this.camera = camera;
        this.parent = parent;

        // --- PHYSICS BODY SETUP ---
        const shape = new CANNON.Sphere(0.5);
        this.body = new CANNON.Body({
            mass: 50,
            shape: shape,
            position: new CANNON.Vec3(0, 5, 0),
        });

        // Initial Damping
        this.body.linearDamping = 0.9; 
        this.body.angularDamping = 0.95; 

        parent.world.addBody(this.body);
        parent.addToUpdateList(this);

        // --- INPUT HANDLING ---
        this.moveDirection = new Vector3();
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(event) {
        switch (event.key) {
            case 'ArrowUp': case 'w': this.moveDirection.z = -1; break;
            case 'ArrowDown': case 's': this.moveDirection.z = 1; break;
            case 'ArrowLeft': case 'a': this.moveDirection.x = -1; break;
            case 'ArrowRight': case 'd': this.moveDirection.x = 1; break;
            case ' ': this.jump(); break;
            case 'r': case 'R': this.resetCamera(); break;
        }
    }

    handleKeyUp(event) {
        switch (event.key) {
            case 'ArrowUp': case 'w': case 'ArrowDown': case 's': this.moveDirection.z = 0; break;
            case 'ArrowLeft': case 'a': case 'ArrowRight': case 'd': this.moveDirection.x = 0; break;
        }
    }

    jump() {
        if (Math.abs(this.body.velocity.y) < 0.5 && this.position.y < 5.0) {
            this.body.velocity.y = 10; 
        }
    }

    resetCamera() {
        const offset = new Vector3(0, 10, 20); 
        this.camera.position.copy(this.position).add(offset);
        this.camera.lookAt(this.position);
    }

    update(timeStamp) {
        const torqueStrength = 400; 
        
        // --- DYNAMIC DAMPING FIX ---
        // Check if on ground (Vertical velocity is near zero)
        if (Math.abs(this.body.velocity.y) < 0.1) {
            // ON GROUND: High damping for tight controls
            this.body.linearDamping = 0.9;
            this.body.angularDamping = 0.95;
            
            const torque = new CANNON.Vec3(
                this.moveDirection.z * torqueStrength,
                0,
                -this.moveDirection.x * torqueStrength
            );
            this.body.applyTorque(torque);
        } else {
            // IN AIR: 
            // linearDamping = 0.1 (Low to keep moving forward)
            // angularDamping = 0.5 (Increased to kill spin so it doesn't shoot out on landing)
            this.body.linearDamping = 0.1;
            this.body.angularDamping = 0.5; 
        }

        // --- SAFETY CLAMPS ---
        // Prevent the ball from exceeding a maximum speed to stop glitching
        const maxSpeed = 15;
        if (this.body.velocity.length() > maxSpeed) {
            this.body.velocity.scale(maxSpeed / this.body.velocity.length(), this.body.velocity);
        }
        // Prevent the spin from getting too crazy
        const maxAngular = 20;
        if (this.body.angularVelocity.length() > maxAngular) {
            this.body.angularVelocity.scale(maxAngular / this.body.angularVelocity.length(), this.body.angularVelocity);
        }

        this.position.copy(this.body.position);
        this.quaternion.copy(this.body.quaternion);

        if (this.position.y < -10) {
            this.body.position.set(0, 5, 0);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            if (this.parent.resetGame) this.parent.resetGame();
        }
    }
}

export default Player;