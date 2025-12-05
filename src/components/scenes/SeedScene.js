import * as Dat from 'dat.gui';
import { Scene, Color, ArrowHelper, Vector3 } from 'three';
import { Flower, Land, Player } from 'objects';
import { BasicLights } from 'lights';
import * as CANNON from 'cannon-es';

class SeedScene extends Scene {
    constructor(camera) {
        // Call parent Scene() constructor
        super();

        // Init state
        this.state = {
            gui: new Dat.GUI(), 
            rotationSpeed: 1,
            updateList: [],
            windStatus: 'Calm', // Display for GUI
            windEnabled: true, // New Toggle State
        };

        // --- TIMER & UI SETUP ---
        this.startTime = Date.now();
        this.bestTime = 0;

        // Create a dedicated UI element for the timer
        this.timerDiv = document.createElement('div');
        this.timerDiv.style.position = 'absolute';
        this.timerDiv.style.top = '20px';
        this.timerDiv.style.width = '100%';
        this.timerDiv.style.textAlign = 'center';
        this.timerDiv.style.color = 'white';
        this.timerDiv.style.fontSize = '24px';
        this.timerDiv.style.fontFamily = 'Arial, sans-serif';
        this.timerDiv.style.fontWeight = 'bold';
        this.timerDiv.style.textShadow = '2px 2px 4px #000000'; // Black outline for readability
        this.timerDiv.style.pointerEvents = 'none'; // Let clicks pass through
        document.body.appendChild(this.timerDiv);

        // --- INSTRUCTIONS UI ---
        this.instructionsDiv = document.createElement('div');
        this.instructionsDiv.style.position = 'absolute';
        this.instructionsDiv.style.top = '80px'; // Positioned below the timer
        this.instructionsDiv.style.width = '100%';
        this.instructionsDiv.style.textAlign = 'center';
        this.instructionsDiv.style.color = '#eeeeee';
        this.instructionsDiv.style.fontSize = '16px';
        this.instructionsDiv.style.fontFamily = 'Arial, sans-serif';
        this.instructionsDiv.style.textShadow = '1px 1px 2px #000000';
        this.instructionsDiv.style.pointerEvents = 'none';
        this.instructionsDiv.innerHTML = 'WASD / Arrows to Move | SPACE to Jump | R to Reset Camera';
        document.body.appendChild(this.instructionsDiv);

        // Init physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); 

        this.world.defaultContactMaterial.friction = 5.0;

        // Set background to a nice color
        this.background = new Color(0x7ec0ee);

        // --- 3x3 ISLAND GRID ---
        const spacing = 12; // Distance between island centers
        const boxSize = 4.3; // Half-width of the physics box

        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                // 1. Create Physics Floor
                const groundShape = new CANNON.Box(new CANNON.Vec3(boxSize, 0.5, boxSize));
                const groundBody = new CANNON.Body({
                    mass: 0, // Mass 0 = Static (Immovable)
                    shape: groundShape,
                });
                // Position physics body in grid
                groundBody.position.set(x * spacing, -0.5, z * spacing);
                this.world.addBody(groundBody);

                // 2. Create Visual Land
                const land = new Land();
                land.position.set(x * spacing, 0, z * spacing);
                this.add(land);
            }
        }

        // --- WIND SETUP ---
        // 1. Wind Physics Vector
        this.windVector = new CANNON.Vec3(0, 0, 0);
        this.nextWindChange = 0; // Timestamp for next change

        // 2. Wind Visualizer (Arrow)
        // Red arrow pointing in direction of wind
        const dir = new Vector3(1, 0, 0);
        const origin = new Vector3(0, 0, 0);
        const length = 1;
        const color = 0xff0000; // Red arrow
        this.windArrow = new ArrowHelper(dir, origin, length, color);
        this.add(this.windArrow);

        // Add meshes to scene
        const flower = new Flower(this);
        const lights = new BasicLights();
        
        // Pass the camera from the constructor to the Player
        this.player = new Player(this, camera);

        this.add(flower, lights, this.player);

        // Populate GUI
        //this.state.gui.add(this.state, 'rotationSpeed', -5, 5);
        this.state.gui.add(this.state, 'windEnabled').name('Enable Wind'); // Toggle Button
        this.state.gui.add(this.state, 'windStatus').listen(); // Live wind update
    }

    addToUpdateList(object) {
        this.state.updateList.push(object);
    }

    // Called by Player.js when ball falls off
    resetGame() {
        const runDuration = (Date.now() - this.startTime) / 1000;
        
        // Check for new record
        if (runDuration > this.bestTime) {
            this.bestTime = runDuration;
        }
        
        // Reset timer
        this.startTime = Date.now();
    }

    // Helper to generate new random wind
    updateWind() {
        // Random Angle (0 to 2PI)
        const angle = Math.random() * Math.PI * 2;
        
        // Random Strength (100 to 300)
        const strength = 190 + Math.random(); // Adjusted strength

        // Update Physics Vector (X and Z only, don't blow up/down)
        this.windVector.set(
            Math.cos(angle) * strength,
            0,
            Math.sin(angle) * strength
        );

        // Update Visual Arrow
        // Normalize direction for the arrow helper
        const arrowDir = new Vector3(this.windVector.x, 0, this.windVector.z).normalize();
        this.windArrow.setDirection(arrowDir);
        // Scale arrow length based on strength (visual feedback)
        this.windArrow.setLength(strength / 50); 

        // Update GUI text
        this.state.windStatus = `Str: ${Math.floor(strength)}`;
    }

    update(timeStamp) {
        const { updateList } = this.state;
        const deltaTime = 1 / 60;
        this.world.step(deltaTime);

        // --- UPDATE TIMER DISPLAY ---
        const currentSeconds = (Date.now() - this.startTime) / 1000;
        this.timerDiv.innerHTML = `
            Time: ${currentSeconds.toFixed(1)}s <br> 
            <span style="font-size: 18px; color: #FFD700;">Best: ${this.bestTime.toFixed(1)}s</span>
        `;

        // --- WIND LOGIC ---
        if (this.state.windEnabled) {
            this.windArrow.visible = true; // Show arrow

            // 1. Check if it's time to change wind (every 3 to 6 seconds)
            if (timeStamp > this.nextWindChange) {
                this.updateWind();
                // Set next change time (current time + 3000ms + random 0-3000ms)
                this.nextWindChange = timeStamp + 3000 + Math.random() * 3000;
            }

            // 2. Apply Wind Force to Player (Only on ground)
            if (this.player && this.player.body) {
                if (Math.abs(this.player.body.velocity.y) < 0.1) {
                    this.player.body.applyForce(this.windVector, this.player.body.position);
                }
                
                // 3. Move Visual Arrow to follow player
                this.windArrow.position.copy(this.player.position);
                this.windArrow.position.y += 2.5; // Hover above ball
            }
        } else {
            // Wind Disabled
            this.windArrow.visible = false; // Hide arrow
            this.state.windStatus = 'Off';
        }

        // Game Logic: Check Collisions
        for (let i = updateList.length - 1; i >= 0; i--) {
            const obj = updateList[i];
            obj.update(timeStamp);

            if (obj.name === 'flower' && this.player) {
                const distance = this.player.position.distanceTo(obj.position);
                if (distance < 2.0) { 
                    this.remove(obj);
                    updateList.splice(i, 1);
                    console.log('Flower Collected!');
                }
            }
        }
    }
}

export default SeedScene;