import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'

import vertex from "./shaders/vertex.glsl";
import fragment from "./shaders/fragment.glsl";

import floorVertex from "./shaders/floor/vertex.glsl";
import floorFragment from "./shaders/floor/fragment.glsl";

import gsap from 'gsap';

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Texture
 */
const textureLoader = new THREE.TextureLoader()
const normalTexture = textureLoader.load('/img/texture.jpg')
normalTexture.flipY = false

/**
 * Models
 */
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath("/draco/")

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

let mixer = null;
let actions = {}; // Store all actions here
let activeAction = null;
let trexModel = null;

const trexMaterial = new THREE.ShaderMaterial({
    uniforms: {
        rimColor:     { value: new THREE.Color(1.0, 0.0, 0.0) }, // light cyan/blue rim
        rimPower:     { value: 5.0 },
        rimIntensity: { value: 5.4 },
        normalMap:    { value: normalTexture }
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.DoubleSide,     // ← useful for some models
    transparent: true,   
    // skinning: true,       // ← if you want to mix with opacity later
    // wireframe: true          // ← for debugging
});

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

const animIndices = {
    RUN:  0, 
    BITE: 1, 
    ROAR: 2, 
    TAIL: 3, 
    IDLE: 4,  
};

/**
 * Floor
 */

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
    side: THREE.DoubleSide,      // usually good for floors when debugging
    // transparent: true,        // only if you need alpha < 1
    // wireframe: true
  });

const floor = new THREE.Mesh(
    new THREE.BoxGeometry(10, 3, 1, 64, 64, 64),
    // new THREE.MeshStandardMaterial({
    //     color: '#ff0000',
    //     metalness: 0,
    //     roughness: 0.5,
    //     wireframe: true
    // })
    floorMaterial
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
floor.position.y = - 1 * 0.5
scene.add(floor)

/**
 * Text
 */
// const fontLoader = new FontLoader()
// fontLoader.load(
//     "/fonts/Aileron_SemiBold_Regular.json",
//     (font) => {
//         console.log("font load");
//         const textGeo = new TextGeometry(
//             "TREX",
//             {
//                 font,
//                 size: 4,
//                 depth: 0.5,
//                 curveSegments: 4,
//                 bevelEnabled: true,
//                 bevelThickness: 0.03,
//                 bevelSize: 0.02,
//                 bevelOffset: 0,
//                 bevelSegments: 4
//             }
//         )
//         // textGeo.computeBoundingBox()
//         // textGeo.translate(
//         //     - (textGeo.boundingBox.max.x - 0.02) * 0.5,
//         //     - (textGeo.boundingBox.max.y - 0.02) * 0.5,
//         //     - (textGeo.boundingBox.max.z - 0.03) * 0.5
//         // )

//         textGeo.center()
        
//         const textMat = new THREE.MeshBasicMaterial({
//             color: "#ff0000"
//         })
//         const text = new THREE.Mesh(textGeo, textMat);

//         text.position.y = 3.75 * 0.5
//         text.position.z = -1.25 * 0.75

//         scene.add(text)
//     }
// )


/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.4)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)


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

// --- NEW TRANSITION EFFECT ---
const cinematicTransition = (onHalfway) => {
    const veil = document.getElementById('transition-veil');
    const tl = gsap.timeline();

    // tl.to(veil, { 
    //     duration: 0.7, 
    //     scaleY: 1, 
    //     transformOrigin: "bottom", 
    //     ease: "expo.inOut" 
    // })
    // .call(() => { if(onHalfway) onHalfway(); })
    // .to(veil, { 
    //     duration: 0.7, 
    //     scaleY: 0, 
    //     transformOrigin: "top", 
    //     ease: "expo.inOut",
    //     delay: 0.25
    // });


    // greatest for all
    tl.to(trexMaterial.uniforms.rimIntensity, { value: 5000, duration: 0.5, ease: "power2.in" })
    .to(veil, { opacity: 0.75, duration: 0.3, backgroundColor: "#EFE3D2" }, "-=0.2")
    .call(onHalfway)
    .to(trexMaterial.uniforms.rimIntensity, { value: 5.4, duration: 1 })
    .to(veil, { opacity: 0, duration: 1 }, "-=1");


    // if any thing not worked the this
    // tl
    // .to("canvas", { filter: "blur(20px) brightness(0)", duration: 0.4 }, "-=0.4")
    // .call(() => {
    //     onHalfway();
    //     // Reset camera for new chapter
    //     // camera.position.z = 5; 
    // })
    // .to("canvas", { filter: "blur(0px) brightness(1)", duration: 0.8, ease: "power2.out" });
}

// --- CHAPTER UPDATE UTILITY ---
const updateChapterUI = (index, title, desc) => {
    // Update Chapter Text
    const titleEl = document.getElementById('chapter-title');
    const descEl = document.getElementById('chapter-desc');
    if(titleEl) titleEl.innerText = title;
    if(descEl) descEl.innerText = desc;
    
    // Update Nav Highlighting
    document.querySelectorAll('#chapter-nav p').forEach(p => p.classList.remove('active'));
    const currentNav = document.getElementById(`nav-${index}`);
    if(currentNav) currentNav.classList.add('active');
};

// chapter flow 1->idle , 2->roar , 3->bite, 4->tail, 5->run(marque)

// --- CINEMATIC PATH ---
const camPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 3), 
    new THREE.Vector3(0, 0.25, 2.125),  
    new THREE.Vector3(2.75, 1.5, 1.2),
    // new THREE.Vector3(1.5, 1.2, -2.5),
    // new THREE.Vector3(-2, 1.5, -2),
    // new THREE.Vector3(-1, 0.15, 2),
    // new THREE.Vector3(0, 0, 3),
]);

// --- CHAPTER 1: IDLE (Stand) ---
const playChapter1 = () => {
    currentChapter = 1;
    updateChapterUI(1, "Project: CARNIVORE", "System online. Subject is currently in a dormant state.");
    fadeToAction(animIndices.IDLE);

    const pathObj = { t: 0 };
    gsap.to(pathObj, {
        t: 1, duration: 11.866, ease: "sine.inOut",
        onUpdate: () => {
            const pos = camPath.getPoint(pathObj.t);
            camera.position.copy(pos);
            controls.update();
        }
    });

    // gsap.timeline()
        // Camera orbit with subtle bounce and a little focus pull using FOV and rim glow pulse
        // .to(camera.position, { x: 0, y: 0, z: 3, duration: 0.8, ease: "power2.out" })
        // .to(camera.position, { x: -2, y: 0.75, z: 2.8, duration: 0.8, ease: "power2.inOut" })
        // .to(camera.position, { x: 2, y: 0.75, z: 2.8, duration: 1, ease: "power2.inOut" })
        // .to(camera.position, { x: 0, y: 1.25, z: 2.2, duration: 0.7, ease: "power2.inOut" })
        // .to(camera, { fov: 65, duration: 0.5, onUpdate: () => camera.updateProjectionMatrix() }, "-=0.7") // Focus pull
        // .to(trexMaterial.uniforms.rimIntensity, { value: 22, duration: 0.7, yoyo: true, repeat: 1 }, "<") // Subtle rim flicker as it "awakens"
        // .to(camera.position, { x: 0, y: 0.5, z: 3, duration: 0.6, ease: "bounce.out" })
        // .to(camera, { fov: 75, duration: 0.7, onUpdate: () => camera.updateProjectionMatrix() }) // Reset FOV
    
    // Move to Chapter 2 after 4 seconds
    setTimeout(playChapter2, 11866);
};

const camPathChap2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.75, 1.5, 1.2),
    new THREE.Vector3(2.5, 0.125, -0.125),
    // new THREE.Vector3(-2, 1.5, -2),
    // new THREE.Vector3(-1, 0.15, 2),
    // new THREE.Vector3(0, 0, 3),
]);

// --- CHAPTER 2: ROAR (The Warning) ---
const playChapter2 = () => {
    cinematicTransition(() => {
        currentChapter = 2;
        // isRunningInfinite = false;
        updateChapterUI(2, "The Primal Scream", "Acoustic levels peaking. Structural integrity at risk.");
        fadeToAction(animIndices.ROAR);

        const pathObj = { t: 0 };
        gsap.to(pathObj, {
            t: 1, duration: 2, ease: "sine.inOut",
            onUpdate: () => {
                const pos = camPathChap2.getPoint(pathObj.t);
                camera.position.copy(pos);
                controls.update();
            }
        });

        // Zoom in + Camera Shake
        // gsap.to(camera.position, { x: 0, y: 2, z: 3, duration: 1 });
        // gsap.to(camera.position, {
        //     x: "+=0.3", duration: 0.05, repeat: 40, yoyo: true, delay: 0.5,
        //     onComplete: () => gsap.to(camera.position, {x: 0, duration: 0.5})
        // });
    });

    setTimeout(playChapter3, 9000);
};

const camPathChap3 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.5, 0.125, -0.125),
    new THREE.Vector3(3, 0.125, -1.25),
    // new THREE.Vector3(-1, 0.15, 2),
    // new THREE.Vector3(0, 0, 3),
]);

// --- CHAPTER 5: BITE (The End) ---
const playChapter3 = () => {
    cinematicTransition(() => {
        currentChapter = 3;
        updateChapterUI(3, "Final Contact", "Containment breached. Connection lost.");
        fadeToAction(animIndices.BITE);

        const pathObj = { t: 0 };
        gsap.to(pathObj, {
            t: 1, duration: 2, ease: "sine.inOut",
            onUpdate: () => {
                const pos = camPathChap3.getPoint(pathObj.t);
                camera.position.copy(pos);
                controls.update();
            }
        });

        // Reset rotation and lunge at camera
        // gsap.set(camera.rotation, {z: 0});
        // gsap.fromTo(camera.position, 
        //     { x: 0, y: 0.5, z: 6 }, 
        //     { z: 1.5, duration: 0.8, ease: "power4.in", delay: 1 }
        // );

        // // Final Blackout
        // setTimeout(() => {
        //     gsap.to("canvas", { opacity: 0, duration: 0.5 });
        //     document.getElementById('chapter-desc').innerText = "FATAL ERROR: SUBJECT ESCAPED";
        // }, 2500);
    });

    setTimeout(playChapter4, 9266);
};

// const camPathChap4 = new THREE.CatmullRomCurve3([
//     new THREE.Vector3(3, 0.125, -1.25),
//     new THREE.Vector3(2.75, 1.125, 0.25),
//     new THREE.Vector3(6, 1.125, 0.25),
//     // new THREE.Vector3(0, 0, 3),
// ]);

// --- CHAPTER 4: TAIL ATTACK (The Impact) ---
const playChapter4 = () => {
    cinematicTransition(() => {
        currentChapter = 4;
        updateChapterUI(4, "Tactical Strike", "Subject utilizing rear appendages. Brace for impact.");
        fadeToAction(animIndices.TAIL);

        // gsap.to(camera.position, {
        //     x: "+=0.3", duration: 0.05, repeat: 40, yoyo: true, delay: 0.5,
        //     onComplete: () => gsap.to(camera.position, {x: 0, duration: 0.5})
        // });

        gsap.to(camera.position, {
            x: "2.75", y:"1.125", z:"0.25", duration: 1.1275,
            onComplete: () => {
                gsap.to(camera.position, {x: "7", y:"1.125", z:"0.25", duration: 1, ease:"elastic.out"})
                // gsap.to(scene.rotation, {x: Math.PI * 2, duration: 1, ease:"elastic.out"})
            } 
        });

        // const pathObj = { t: 0 };
        // gsap.to(pathObj, {
        //     t: 1, duration: 3, ease: "sine.Out",
        //     onUpdate: () => {
        //         const pos = camPathChap4.getPoint(pathObj.t);
        //         camera.position.copy(pos);
        //         controls.update();
        //     }
        // });
    });
    setTimeout(playChapter5, 6000);
};

// --- CHAPTER 2: RUN (The Pursuit) ---
const playChapter5 = () => {
    cinematicTransition(() => {
        currentChapter = 5;
        // isRunningInfinite = true; // Speed up floor shader
        updateChapterUI(5, "The Pursuit", "Target acquired. The subject has reached terminal velocity.");
        fadeToAction(animIndices.RUN);

        // Dynamic Camera Move
        // gsap.to(camera.position, { x: -4, y: 1, z: 6, duration: 2.5, ease: "power2.inOut" });
    });
    
};




// --- INITIAL START BUTTON ---
document.getElementById('start-btn').addEventListener('click', (e) => {
    e.target.style.display = 'none';
    
    // Unlock Audio Context if you have audio
    // const audio = new Audio('/your-audio.mp3');
    // audio.play();

    playChapter1();
});


/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0,0,3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0.75, 0)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    floorMaterial.uniforms.time.value = performance.now() * 0.001

    // Update Mixer
    if(mixer) {
        mixer.update(deltaTime)
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()