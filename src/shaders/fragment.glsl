varying vec3 vNormal;
varying vec3 vViewPosition;

uniform vec3 rimColor;
uniform float rimPower;
uniform float rimIntensity;

float fresnel(float amount, vec3 normal, vec3 viewDir) {
    return pow(
        1.0 - clamp(dot(normalize(normal), normalize(viewDir)), 0.0, 1.0),
        amount
    );
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    float fresnelEffect = fresnel(rimPower, normal, viewDir);
    
    vec3 finalColor = rimColor * fresnelEffect * rimIntensity;
    
    // You can also blend with base color / texture if you want
    finalColor += vec3(0.0, 0.0, 0.0); // ← dark base for example
    
    gl_FragColor = vec4(finalColor, 1.0);
}