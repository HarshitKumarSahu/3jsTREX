uniform vec3 baseColor;
  uniform vec3 rimColor;
  uniform float rimPower;
  uniform float rimIntensity;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // Fresnel
    float fresnel = pow(
      1.0 - clamp(dot(normal, viewDir), 0.0, 1.0),
      rimPower
    );

    // Base color + some subtle variation from UV / noise if you want
    vec3 color = baseColor;

    // Rim lighting / glow
    vec3 rim = rimColor * fresnel * rimIntensity;

    // Combine
    vec3 finalColor = color + rim;

    gl_FragColor = vec4(finalColor, 1.0);
  }