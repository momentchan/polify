// ShardMirrorWorld.tsx
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { shaderMaterial } from '@react-three/drei'

const vert = /* glsl */`
  varying vec3 vWpos;
  varying vec3 vWnorml;
  void main(){
    vec4 wp = modelMatrix * vec4(position,1.0);
    vWpos = wp.xyz;
    vWnorml = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const frag = /* glsl */`
  precision highp float;
  varying vec3 vWpos;
  varying vec3 vWnorml;

  uniform vec3 uCamPos;

  uniform vec3 uCenter;   // plane center (world)
  uniform vec3 uU;        // in-plane X (unit, world)
  uniform vec3 uV;        // in-plane Y (unit, world)
  uniform vec3 uN;        // plane normal (unit, world)
  uniform vec2 uSize;     // plane width/height in world units

  uniform sampler2D uMap; // image
  uniform float uFresPow;
  uniform float uFresGain;

  void main() {
    vec3 view = normalize(uCamPos - vWpos);
    vec3 normal = normalize(vWnorml);
    vec3 refect = reflect(-view, normal);

    float denom = dot(refect, uN);

    float t = dot(uCenter - vWpos, uN) / denom;

    float denomFade = smoothstep(0.01, 0.04, abs(denom)); // parallel → fade out
    float frontFade = step(0.0, t);                       // behind-plane → 0

    vec3 hit = vWpos + t * refect;
    vec3 rel = hit - uCenter;

    float x = dot(rel, uU);
    float y = dot(rel, uV);

    vec2 uv = vec2(x / uSize.x + 0.5, y / uSize.y + 0.5);

    // Soft crop near edges
    float inset = 0.0; // push if you want a safe border, e.g. 0.002
    vec2 d = vec2(
      min(uv.x - 0.0, 1.0 - uv.x),
      min(uv.y - 0.0, 1.0 - uv.y)
    );
    float edgeFade = smoothstep(inset, inset + 0.015, min(d.x, d.y));
    
    vec4 col = texture2D(uMap, uv);
    float alpha = denomFade * edgeFade * col.a;

    
    float fres = pow(1.0 - max(dot(normal, view), 0.0), uFresPow) * uFresGain;
    gl_FragColor = vec4(col.rgb + fres, 1.0);
    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

const ShardMirrorMat = shaderMaterial(
  {
    uCamPos: new THREE.Vector3(),
    uCenter: new THREE.Vector3(),
    uU: new THREE.Vector3(1, 0, 0),
    uV: new THREE.Vector3(0, 1, 0),
    uN: new THREE.Vector3(0, 0, 1),
    uSize: new THREE.Vector2(2, 2),
    uMap: null,
    uFresPow: 4.0,
    uFresGain: 0.08,
  },
  vert, frag
);

type Props = {
  planeRef: React.RefObject<THREE.Object3D | null>; // the world-anchored helper
  map: THREE.Texture;
};

export function ShardMirrorWorld({
  planeRef, map, children, ...meshProps
}: Props & React.JSX.IntrinsicElements['mesh']) {
  const material = useMemo(() => {
    const mat = new ShardMirrorMat()
    mat.uMap = map as any
    mat.transparent = true
    mat.depthWrite = false

    return mat
  }, [map])

  useFrame(({ camera }) => {
    const plane = planeRef.current
    if (!plane) return

    material.uCamPos.copy(camera.position)

    plane.updateWorldMatrix(true, false)
    const center = new THREE.Vector3().setFromMatrixPosition(plane.matrixWorld)
    const q = new THREE.Quaternion(); plane.getWorldQuaternion(q)
    const rot = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q))

    const u = new THREE.Vector3(1, 0, 0).applyMatrix3(rot).normalize()
    const v = new THREE.Vector3(0, 1, 0).applyMatrix3(rot).normalize()
    const n = new THREE.Vector3(0, 0, 1).applyMatrix3(rot).normalize()

    const worldScale = new THREE.Vector3(); plane.getWorldScale(worldScale)

    material.uCenter.copy(center)
    material.uU.copy(u)
    material.uV.copy(v)
    material.uN.copy(n)
    material.uSize.set(worldScale.x, worldScale.y) // sync to helper size
  })

  return (
    <mesh {...meshProps} material={material}>
      {/* use your shard geometry here */}
      <boxGeometry args={[1, 1, 0.2]} />
      {/* <meshBasicMaterial color="red" /> */}
      {children /* optional: add a slightly larger rim mesh as a sibling */}
    </mesh>
  )
}
