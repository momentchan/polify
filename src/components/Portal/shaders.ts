export const vertexShader = /* glsl */ `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * modelViewPosition; 
}
`;

export const fragmentShader = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;

void main() {
  vec4 color = texture2D( map, vUv);
  gl_FragColor = linearToOutputTexel(color);
}
`;

