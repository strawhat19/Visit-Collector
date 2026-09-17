export const globeVertex = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1.0);
  }
`;

export const surfaceFragment = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D detailMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 detail = texture2D(detailMap, vUv).rgb;
    float heightX = texture2D(detailMap, vUv + vec2(0.0005, 0.0)).r - detail.r;
    float heightY = texture2D(detailMap, vUv + vec2(0.0, 0.0005)).r - detail.r;
    vec3 tangent = normalize(vec3(-vNormal.z, 0.00001, vNormal.x));
    vec3 bitangent = normalize(cross(vNormal, tangent));
    vec3 normal = normalize(vNormal + tangent * heightX * 1.8 + bitangent * heightY * 1.8);
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float light = dot(normal, sunDirection);
    float daylight = smoothstep(-0.16, 0.22, light);
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    float diffuse = max(light, 0.0) * 1.15 + 0.11;
    vec3 color = day * diffuse * mix(0.035, 1.0, daylight);
    color += night * (1.0 - smoothstep(-0.24, 0.18, light)) * 1.4;
    float specular = pow(max(dot(normal, normalize(sunDirection + viewDirection)), 0.0), 70.0);
    color += vec3(0.6, 0.82, 1.0) * specular * (1.0 - detail.g) * 0.45;
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.5);
    color += vec3(0.10, 0.36, 0.63) * fresnel * daylight * 0.48;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const cloudsFragment = `
  uniform sampler2D detailMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    float cloud = smoothstep(0.22, 0.95, texture2D(detailMap, vUv).b);
    float light = dot(normalize(vNormal), sunDirection);
    float brightness = max(light, 0.0) * 0.9 + 0.16;
    gl_FragColor = vec4(vec3(0.87, 0.94, 1.0) * brightness, cloud * 0.85);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const atmosphereFragment = `
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float rim = pow(1.0 - abs(dot(normalize(vNormal), viewDirection)), 4.5);
    float daylight = smoothstep(-0.45, 0.8, dot(normalize(vNormal), sunDirection));
    gl_FragColor = vec4(vec3(0.12, 0.48, 0.9), rim * daylight * 0.52);
  }
`;
