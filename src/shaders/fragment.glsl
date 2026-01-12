// varying vec3 vNormal;
// varying vec3 vViewPosition;

// uniform vec3 rimColor;
// uniform float rimPower;
// uniform float rimIntensity;

// float fresnel(float amount, vec3 normal, vec3 viewDir) {
//     return pow(
//         1.0 - clamp(dot(normalize(normal), normalize(viewDir)), 0.0, 1.0),
//         amount
//     );
// }

// void main() {
//     vec3 normal = normalize(vNormal);
//     vec3 viewDir = normalize(vViewPosition);
    
//     float fresnelEffect = fresnel(rimPower, normal, viewDir);
    
//     vec3 finalColor = rimColor * fresnelEffect * rimIntensity;
    
//     // You can also blend with base color / texture if you want
//     finalColor += vec3(0.0, 0.0, 0.0); // ← dark base for example
    
//     gl_FragColor = vec4(finalColor, 1.0);
// }


varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

uniform vec3 rimColor;
uniform float rimPower;
uniform float rimIntensity;
uniform sampler2D normalMap; // The new texture uniform

// --- Helper Function to Calculate Normal Bump ---
// This calculates the "Tangent Space" matrix automatically
vec3 getPerturbedNormal(vec3 viewPos, vec3 surfNormal, vec2 uv, sampler2D tex) {
    vec3 p = viewPos;
    vec3 n = normalize(surfNormal);
    vec3 texNormal = texture2D(tex, uv).xyz * 2.0 - 1.0; // Map [0,1] to [-1,1]
    
    // Calculate derivatives (how much P and UV change per pixel)
    vec3 dp1 = dFdx(p);
    vec3 dp2 = dFdy(p);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);

    // Solve for Tangent and Bitangent
    vec3 dp2perp = cross(dp2, n);
    vec3 dp1perp = cross(n, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;

    // Construct the TBN Matrix
    float invmax = inversesqrt(max(dot(T,T), dot(B,B)));
    mat3 tbn = mat3(T * invmax, B * invmax, n);

    // Transform texture normal to View Space
    return normalize(tbn * texNormal);
}

float fresnel(float amount, vec3 normal, vec3 viewDir) {
    return pow(
        1.0 - clamp(dot(normalize(normal), normalize(viewDir)), 0.0, 1.0),
        amount
    );
}

void main() {
    // 1. Get the base normal
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // 2. Apply the Normal Map logic
    // This overwrites the smooth normal with the bumpy one
    normal = getPerturbedNormal(vViewPosition, normal, vUv, normalMap);
    
    // 3. Calculate Fresnel using the NEW bumpy normal
        float fresnelEffect = fresnel(rimPower, normal, viewDir);
    // float fresnelEffect = fresnel(rimPower, vNormal, viewDir);
    
    vec3 finalColor = rimColor * fresnelEffect * rimIntensity;
    finalColor += vec3(0.0, 0.0, 0.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
}