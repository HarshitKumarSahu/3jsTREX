// varying vec3 vNormal;
// varying vec3 vViewPosition;

// // 1. Import Skinning Parameters
// #include <common>
// #include <skinning_pars_vertex>

// void main() {
//     // 2. Define local variables for the chunks to modify
//     // We start with the default position and normal
//     vec3 objectNormal = normal;
//     vec3 transformed = position;

//     // 3. Execute the built-in Skinning Logic
//     // This updates 'objectNormal' and 'transformed' based on bone movement
//     #include <skinbase_vertex>
//     #include <skinning_vertex>

//     // 4. Use the new SKINNED variables for final calculation
//     // Note: We use 'objectNormal' instead of 'normal' here
//     vNormal = normalize(normalMatrix * objectNormal);

//     // Note: We use 'transformed' instead of 'position' here
//     vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    
//     vViewPosition = -mvPosition.xyz;
//     gl_Position = projectionMatrix * mvPosition;
// }



varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;             // 1. Add this varying

#include <common>
#include <skinning_pars_vertex>

void main() {
    vUv = uv;                 // 2. Pass the UVs
    
    vec3 objectNormal = normal;
    vec3 transformed = position;

    #include <skinbase_vertex>
    #include <skinning_vertex>

    vNormal = normalize(normalMatrix * objectNormal);
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}