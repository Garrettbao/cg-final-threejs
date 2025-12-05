/**
 * app.js
 *
 * This is the first file loaded. It sets up the Renderer,
 * Scene and Camera. It also starts the render loop and
 * handles window resizes.
 *
 */
import { WebGLRenderer, PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SeedScene } from 'scenes';

// Initialize core ThreeJS components
// Create Camera FIRST, pass it to the scene
const camera = new PerspectiveCamera();
const scene = new SeedScene(camera); // Pass camera here
const renderer = new WebGLRenderer({ antialias: true });

// --- CAMERA FIX ---
// Set initial position to match the Player.js resetCamera() logic
// Player starts at (0, 5, 0). Reset offset is (0, 10, 20).
// Therefore start pos = (0, 15, 20).
camera.position.set(0, 15, 20);
camera.lookAt(new Vector3(0, 5, 0));

// Set up renderer, canvas, and minor CSS adjustments
renderer.setPixelRatio(window.devicePixelRatio);
const canvas = renderer.domElement;
canvas.style.display = 'block'; // Removes padding below canvas
document.body.style.margin = 0; // Removes margin around page
document.body.style.overflow = 'hidden'; // Fix scrolling
document.body.appendChild(canvas);

// Set up controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 30;
// Make controls look at the player's start height initially
controls.target.set(0, 5, 0); 
controls.update();

// Render loop
const onAnimationFrameHandler = (timeStamp) => {
    // CAMERA FOLLOW LOGIC
    // move the camera by the same amount the player moved.
    if (scene.player) {
        const playerPos = scene.player.position;
        const target = controls.target; // The point the camera looks at (pivot)

        // Calculate how much the player moved since the last frame
        const displacement = playerPos.clone().sub(target);

        // Move the camera by that offset
        camera.position.add(displacement);

        // Update the pivot point to the new player position
        controls.target.copy(playerPos);
    }

    // Update controls (handles the "spin" momentum)
    controls.update();

    renderer.render(scene, camera);
    scene.update && scene.update(timeStamp);
    window.requestAnimationFrame(onAnimationFrameHandler);
};
window.requestAnimationFrame(onAnimationFrameHandler);

// Resize Handler
const windowResizeHandler = () => {
    const { innerHeight, innerWidth } = window;
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
};
windowResizeHandler();
window.addEventListener('resize', windowResizeHandler, false);