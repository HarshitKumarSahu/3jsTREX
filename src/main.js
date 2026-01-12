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

/**
 * Base
 */
// Debug
const gui = new GUI()

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
    // "/models/trex.glb",
    (gltf) => {
        console.log("success");
        
        let model = gltf.scene
        console.log(model);
        

        // Apply same material to ALL meshes
        model.traverse((child) => {
            if (child.isMesh) {
                child.material = trexMaterial;
            }
        });

        mixer = new THREE.AnimationMixer(gltf.scene)
        let action = mixer.clipAction(gltf.animations[0])

        action.play()
        
        // model.scale.set(0.025, 0.025, 0.025)
        model.rotation.y = Math.PI * 0.5
        scene.add(model)
    },
    (progress) => {
        console.log("progress");
    },
    (error) => {
        console.log("error");
        console.log(error);
    }
)

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