import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// --- SHADERS (Assuming these imports work in your bundler) ---
import vertex from "./shaders/vertex.glsl";
import fragment from "./shaders/fragment.glsl";
import floorVertex from "./shaders/floor/vertex.glsl";
import floorFragment from "./shaders/floor/fragment.glsl";

// --- SETUP ---
const gui = new GUI()
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
scene.background = new THREE.Color('#000000')

// --- TEXTURES ---
const textureLoader = new THREE.TextureLoader()
const normalTexture = textureLoader.load('/img/texture.jpg')
normalTexture.flipY = false

// --- MATERIALS ---
const trexMaterial = new THREE.ShaderMaterial({
    uniforms: {
        rimColor:     { value: new THREE.Color(1.0, 0.0, 0.0) }, 
        rimPower:     { value: 5.0 },
        rimIntensity: { value: 5.4 },
        normalMap:    { value: normalTexture }
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.DoubleSide,
    transparent: true,   
});

const floorMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time:          { value: 0 },
      noiseScale:    { value: 2.75  },
      noiseStrength: { value: 0.075 },
      baseColor:     { value: new THREE.Color('#000') },
      rimColor:      { value: new THREE.Color('#ff0000') },
      rimPower:     { value: 5.0 },
      rimIntensity: { value: 5.4 },
    },
    vertexShader: floorVertex,
    fragmentShader: floorFragment,
    side: THREE.DoubleSide,
});

// --- MODELS & ANIMATION STATE ---
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath("/draco/")
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

let mixer = null;
let actions = {}; // Store all actions here
let activeAction = null;
let trexModel = null;

// !!! IMPORTANT: MAP YOUR ANIMATION INDICES HERE !!!
// Open your console to see the list of animations and correct these numbers
const animIndices = {
    IDLE: 4,   // e.g. Stand
    ROAR: 2,   // e.g. Roar
    BITE: 1,   // e.g. Bite
    TAIL: 3,   // e.g. Tail Attack
    RUN:  0    // e.g. Run
};

gltfLoader.load(
    "/models/trex-v5.glb",
    (gltf) => {
        console.log("GLTF Loaded", gltf);
        trexModel = gltf.scene;

        // Apply Material
        trexModel.traverse((child) => {
            if (child.isMesh) child.material = trexMaterial;
        });

        // Setup Animations
        mixer = new THREE.AnimationMixer(trexModel);
        
        // Load all animations
        gltf.animations.forEach((clip, index) => {
            actions[index] = mixer.clipAction(clip);
        });

        // Initial setup
        trexModel.rotation.y = Math.PI * 0.5;
        scene.add(trexModel);
        
        console.log("Animations List:", gltf.animations); 
    }
);

// --- FLOOR ---
const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 1, 64, 64, 64), floorMaterial);
floor.receiveShadow = true;
floor.rotation.x = - Math.PI * 0.5;
floor.position.y = - 0.5;
scene.add(floor);

// --- LIGHTS ---
const ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// --- SIZES & CAMERA ---
const sizes = { width: window.innerWidth, height: window.innerHeight };
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 0, 3.5); // Initial safe distance
scene.add(camera);

// Controls (Disabled for the story, enabled for debug)
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enabled = false; // Disable so user can't ruin the camera cuts

// --- RENDERER ---
const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));




// ==========================================
// STORY & LOGIC ENGINE
// ==========================================

let currentChapter = 0;
let isRunningInfinite = false;

// Helper: Switch Animation smoothly
const fadeToAction = (index, duration = 0.5) => {
    const newAction = actions[index];
    if(!newAction) return console.warn(`Animation ${index} not found`);
    
    if (activeAction) {
        activeAction.fadeOut(duration);
    }
    newAction.reset().fadeIn(duration).play();
    activeAction = newAction;
}


// ... (Keep your imports and Three.js setup from previous message)

// --- NEW TRANSITION EFFECT ---
const cinematicTransition = (onHalfway) => {
    const veil = document.getElementById('transition-veil');
    const tl = gsap.timeline();

    tl.to(veil, { 
        duration: 0.8, 
        scaleY: 1, 
        transformOrigin: "bottom", 
        ease: "expo.inOut" 
    })
    .call(() => { if(onHalfway) onHalfway(); })
    .to(veil, { 
        duration: 0.8, 
        scaleY: 0, 
        transformOrigin: "top", 
        ease: "expo.inOut",
        delay: 0.3
    });
}

// --- CHAPTER UPDATE LOGIC ---
const updateUI = (title, desc, navId) => {
    // Update Text
    document.getElementById('chapter-title').innerText = title;
    document.getElementById('chapter-desc').innerText = desc;
    
    // Update Nav
    document.querySelectorAll('nav span').forEach(s => s.classList.remove('active'));
    document.getElementById(`nav-${navId}`).classList.add('active');
}

// --- CHAPTER 1: IDLE + AUDIO ---
const playChapter1 = () => {
    console.log("CHAPTER 1: IDLE");
    currentChapter = 1;
    fadeToAction(animIndices.IDLE);

    // Audio Logic
    console.log("AUDIO: Start playing custom voiceover...");
    
    const textEl = document.getElementById('text-display');
    textEl.classList.add('active');
    
    // Mock Audio Sync
    const script = ["Welcome...", "To...", "Project...", "TREX!"];
    let delay = 0;

    script.forEach((word, i) => {
        setTimeout(() => {
            textEl.innerHTML = word; 
            textEl.classList.add('highlight'); // Flash color
            setTimeout(() => textEl.classList.remove('highlight'), 300);
        }, delay);
        delay += 1000;
    });

    // Move to next chapter after audio
    setTimeout(() => {
        textEl.classList.remove('active');
        playChapter2();
    }, delay + 500);
}

// --- REFINED CHAPTERS ---

const playChapter2 = () => {
    cinematicTransition(() => {
        updateUI("The Pursuit Begins", "The T-Rex has spotted its target. Movement is calculated and deadly.", 2);
        fadeToAction(animIndices.RUN); // Start running
        
        // Dynamic Camera: Low angle "Chase" cam
        gsap.to(camera.position, { x: -3, y: 0.5, z: 5, duration: 2, ease: "power2.out" });
        controls.target.set(0, 1, 0);
    });
    // Trigger next auto-transition or wait for audio
    setTimeout(playChapter3, 5000); 
}

const playChapter3 = () => {
    cinematicTransition(() => {
        updateUI("The Primal Scream", "A roar that vibrates through the very ground. Fear takes hold.", 3);
        fadeToAction(animIndices.ROAR);

        // Intense Camera Shake
        gsap.to(camera.position, {
            x: "+=0.4", duration: 0.05, repeat: 30, yoyo: true,
            onComplete: () => gsap.to(camera.position, {x: 0, duration: 0.5})
        });
    });
}

// --- INTEGRATING TAIL ATTACK IMPACT ---
const playChapter4 = () => {
    // We don't use the veil here because the "Hit" IS the transition
    console.log("CHAPTER 4: TAIL HIT");
    updateUI("The Last Defense", "A sudden whip of the tail sends everything spiraling.", 4);
    fadeToAction(animIndices.TAIL);

    setTimeout(() => {
        // The "Hit" Effect: Quick Red Flash + Camera Fly
        gsap.to("#bite-flash", { opacity: 1, duration: 0.1, yoyo: true, repeat: 1 });
        
        gsap.to(camera.position, { 
            x: 15, y: 10, z: 20, 
            duration: 2, 
            ease: "slow(0.7, 0.7, false)" 
        });
        gsap.to(camera.rotation, { z: Math.PI, duration: 2 });
    }, 800);
}

// --- INITIAL START ---
document.getElementById('start-btn').addEventListener('click', (e) => {
    e.target.style.display = 'none';
    // Start Chapter 1
    fadeToAction(animIndices.IDLE);
    // Move to Chapter 2 after a delay
    setTimeout(playChapter2, 4000);
});

// // Helper: Manga Wipe Transition
// const mangaTransition = (onCovered) => {
//     const el = document.getElementById('manga-panel');
//     const tl = gsap.timeline();
    
//     // Slash Wipe IN
//     tl.to(el, { duration: 0.2, x: "0%", ease: "power4.in" }) 
//       .call(() => { if(onCovered) onCovered(); }) // Run logic while hidden
//       .to(el, { duration: 0.4, x: "100%", ease: "power2.out", delay: 0.1 }) // Wipe OUT
//       .set(el, { x: "-100%" }); // Reset position
// }

// // --- CHAPTER 1: IDLE + AUDIO ---
// const playChapter1 = () => {
//     console.log("CHAPTER 1: IDLE");
//     currentChapter = 1;
//     fadeToAction(animIndices.IDLE);

//     // Audio Logic
//     console.log("AUDIO: Start playing custom voiceover...");
    
//     const textEl = document.getElementById('text-display');
//     textEl.classList.add('active');
    
//     // Mock Audio Sync
//     const script = ["Welcome...", "To...", "Project...", "TREX!"];
//     let delay = 0;

//     script.forEach((word, i) => {
//         setTimeout(() => {
//             textEl.innerHTML = word; 
//             textEl.classList.add('highlight'); // Flash color
//             setTimeout(() => textEl.classList.remove('highlight'), 300);
//         }, delay);
//         delay += 1000;
//     });

//     // Move to next chapter after audio
//     setTimeout(() => {
//         textEl.classList.remove('active');
//         playChapter2();
//     }, delay + 500);
// }

// // --- CHAPTER 2: ROAR ---
// const playChapter2 = () => {
//     mangaTransition(() => {
//         console.log("CHAPTER 2: ROAR");
//         currentChapter = 2;
//         fadeToAction(animIndices.ROAR);

//         // Camera Shake
//         gsap.to(camera.position, {
//             x: "+=0.2", y: "+=0.2", duration: 0.05, repeat: 25, yoyo: true,
//             onComplete: () => {
//                 camera.position.set(0, 0, 3.5); // Reset
//                 setTimeout(playChapter3, 500);
//             }
//         });

//         // Chromatic Aberration Simulation (Optional: use post-processing if available)
//         // For now, we flash the background slightly
//         gsap.to(scene.background, { r: 0.2, duration: 0.1, yoyo: true, repeat: 5 });
//     });
// }

// // --- CHAPTER 3: BITE ---
// const playChapter3 = () => {
//     mangaTransition(() => {
//         console.log("CHAPTER 3: BITE");
//         currentChapter = 3;
//         fadeToAction(animIndices.BITE);

//         // Zoom IN fast
//         gsap.to(camera.position, { z: 1.5, duration: 0.5, ease: "expo.in" });

//         // Flash Red overlay
//         const flash = document.getElementById('bite-flash');
//         gsap.to(flash, { opacity: 0.6, duration: 0.1, delay: 0.4, yoyo: true, repeat: 1 });

//         setTimeout(() => {
//             camera.position.z = 3.5; // Reset
//             playChapter4();
//         }, 1500);
//     });
// }

// // --- CHAPTER 4: TAIL ATTACK (CAMERA THROW) ---
// const playChapter4 = () => {
//     mangaTransition(() => {
//         console.log("CHAPTER 4: TAIL ATTACK");
//         currentChapter = 4;
//         fadeToAction(animIndices.TAIL);

//         // Wait for the tail to physically swing in the animation
//         setTimeout(() => {
//             console.log("IMPACT! Camera thrown.");
            
//             // The Throw: Move camera back and rotate wildly
//             gsap.to(camera.position, { 
//                 x: 8, y: 3, z: 10, // Destination
//                 duration: 1.5, ease: "power4.out" 
//             });

//             gsap.to(camera.rotation, {
//                 z: -0.5, x: 0.3, 
//                 duration: 1.2,
//                 onComplete: () => {
//                     playChapter5(); // Transition to Run
//                 }
//             });
//         }, 800); // Adjust timing based on your specific animation
//     });
// }

// // --- CHAPTER 5: INFINITE RUN ---
// const playChapter5 = () => {
//     mangaTransition(() => {
//         console.log("CHAPTER 5: RUN");
//         currentChapter = 5;
//         isRunningInfinite = true;
        
//         fadeToAction(animIndices.RUN);

//         // Reset Camera Rotation smoothly
//         gsap.to(camera.rotation, { x: 0, y: 0, z: 0, duration: 0.5 });
        
//         // Position Camera for the run (side view or dynamic angle)
//         gsap.to(camera.position, { x: 0, y: 1, z: 6, duration: 1 });

//         // Show Marquee
//         document.getElementById('run-marquee').style.opacity = 1;
//     });
// }

// --- EVENTS ---
document.getElementById('start-btn').addEventListener('click', (e) => {
    e.target.style.display = 'none';
    playChapter1();
});

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
});

// --- TICK ---
const clock = new THREE.Clock()
let previousTime = 0

const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Floor Animation Logic
    if (isRunningInfinite) {
        // Fast forward time for speed effect
        floorMaterial.uniforms.time.value += deltaTime * 5.0; 
    } else {
        // Slow idling time
        floorMaterial.uniforms.time.value += deltaTime * 0.5;
    }

    if(mixer) mixer.update(deltaTime);

    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

tick()