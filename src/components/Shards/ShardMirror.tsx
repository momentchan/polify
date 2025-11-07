// ShardMirrorWorld.tsx
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, forwardRef } from 'react'
import { useControls } from 'leva'
import CustomShaderMaterial from 'three-custom-shader-material'
import type CustomShaderMaterialVanilla from 'three-custom-shader-material/vanilla'
import { useLoader } from '@react-three/fiber'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

const vert = /* glsl */`
  varying vec3 vWpos;
  varying vec3 vWnorml;
  void main(){
    vec4 wp = modelMatrix * vec4(position,1.0);
    vWpos = wp.xyz;
    vWnorml = normalize(mat3(modelMatrix) * normal);
    // csm_Position = projectionMatrix * viewMatrix * wp;
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

  void main() {
    vec3 view = normalize(uCamPos - vWpos);
    vec3 nml = normalize(vWnorml);
    vec3 refect = reflect(-view, nml);

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

    col *= edgeFade;

    
    csm_DiffuseColor =  vec4(col.rgb, 1.0);
  }
`;

type Props = {
  planeRef: React.RefObject<THREE.Object3D | null>; // the world-anchored helper
  map: THREE.Texture;
};

export const ShardMirror = forwardRef<THREE.Mesh, Props & React.JSX.IntrinsicElements['mesh']>(({
  planeRef, map, children, ...meshProps
}, ref) => {

  const matRef = useRef<CustomShaderMaterialVanilla<typeof THREE.MeshPhysicalMaterial> | null>(null)

  const { paths } = useLoader(SVGLoader, 'textures/shape1.svg')
  
  const extrudeControls = useControls('Shard.Extrude', {
    depth: { value: 0.05, min: 0, max: 1, step: 0.01 },
    bevelEnabled: { value: true },
    bevelThickness: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
    bevelSize: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
    bevelSegments: { value: 3, min: 1, max: 10, step: 1 },
  }, { collapsed: true })
  
  const geometry = useMemo(() => {
    if (!paths?.length) return new THREE.BoxGeometry(1, 1, 0.05)
    
    const shapes = paths.flatMap(path => path.toShapes(true))
    if (!shapes.length) return new THREE.BoxGeometry(1, 1, 0.05)
    
    const extractedShape = shapes[0]
    const points = extractedShape.getPoints(12)
    if (!points.length) return new THREE.BoxGeometry(1, 1, 0.05)
    
    // Calculate bounding box
    const bbox = new THREE.Box2()
    points.forEach(point => bbox.expandByPoint(new THREE.Vector2(point.x, point.y)))
    
    const center = bbox.getCenter(new THREE.Vector2())
    const size = bbox.getSize(new THREE.Vector2())
    const scale = 1 / Math.max(size.x, size.y)
    
    // Center, scale, and flip Y axis
    const scaledPoints = points.map(point => 
      new THREE.Vector2(
        (point.x - center.x) * scale,
        -(point.y - center.y) * scale
      )
    )
    const transformedShape = new THREE.Shape(scaledPoints)
    
    return new THREE.ExtrudeGeometry(
      transformedShape,
      {
        depth: extrudeControls.depth,
        bevelEnabled: extrudeControls.bevelEnabled,
        bevelThickness: extrudeControls.bevelThickness,
        bevelSize: extrudeControls.bevelSize,
        bevelSegments: extrudeControls.bevelSegments,
      }
    )
  }, [paths, extrudeControls])

  const controls = useControls('Shard.Material', {
    roughness: { value: 0.2, min: 0, max: 1, step: 0.01 },
    metalness: { value: 0.5, min: 0, max: 1, step: 0.01 },
    transmission: { value: 0.0, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0.0, min: 0, max: 10, step: 0.1 },
    ior: { value: 1.5, min: 1, max: 2.5, step: 0.01 },
    clearcoat: { value: 1.0, min: 0, max: 1, step: 0.01 },
    clearcoatRoughness: { value: 0.5, min: 0, max: 1, step: 0.01 },
    reflectivity: { value: 1.0, min: 0, max: 1, step: 0.01 },
    envMapIntensity: { value: 1.0, min: 0, max: 10, step: 0.1 },
    sheen: { value: 0.0, min: 0, max: 1, step: 0.01 },
    sheenRoughness: { value: 0.0, min: 0, max: 1, step: 0.01 },
    sheenColor: { value: '#ffffff' },
    iridescence: { value: 1.0, min: 0, max: 1, step: 0.01 },
    iridescenceIOR: { value: 1.3, min: 1, max: 2.5, step: 0.01 },
    attenuationDistance: { value: 0.0, min: 0, max: 10, step: 0.1 },
    attenuationColor: { value: '#ffffff' },
    bumpScale: { value: 1.0, min: 0, max: 10, step: 0.1 },
  }, { collapsed: true })

  // Initialize uniforms
  const uniforms = useMemo(() => ({
    uCamPos: { value: new THREE.Vector3() },
    uCenter: { value: new THREE.Vector3() },
    uU: { value: new THREE.Vector3(1, 0, 0) },
    uV: { value: new THREE.Vector3(0, 1, 0) },
    uN: { value: new THREE.Vector3(0, 0, 1) },
    uSize: { value: new THREE.Vector2(2, 2) },
    uMap: { value: map },
  }), [map])

  useFrame(({ camera }) => {
    if (!planeRef.current || !matRef.current) return

    const plane = planeRef.current
    const uniforms = matRef.current.uniforms

    uniforms.uCamPos.value.copy(camera.position)

    plane.updateWorldMatrix(true, false)
    uniforms.uCenter.value.setFromMatrixPosition(plane.matrixWorld)

    const q = new THREE.Quaternion()
    plane.getWorldQuaternion(q)
    const rot = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q))

    uniforms.uU.value.set(1, 0, 0).applyMatrix3(rot).normalize()
    uniforms.uV.value.set(0, 1, 0).applyMatrix3(rot).normalize()
    uniforms.uN.value.set(0, 0, 1).applyMatrix3(rot).normalize()

    const worldScale = new THREE.Vector3()
    plane.getWorldScale(worldScale)
    uniforms.uSize.value.set(worldScale.x, worldScale.y)
  })

  return (
    <mesh ref={ref} {...meshProps} geometry={geometry}>
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshPhysicalMaterial}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        silent={true}
        transparent={true}
        depthWrite={false}
        roughness={controls.roughness}
        metalness={controls.metalness}
        transmission={controls.transmission}
        thickness={controls.thickness}
        ior={controls.ior}
        clearcoat={controls.clearcoat}
        clearcoatRoughness={controls.clearcoatRoughness}
        reflectivity={controls.reflectivity}
        envMapIntensity={controls.envMapIntensity}
        sheen={controls.sheen}
        sheenRoughness={controls.sheenRoughness}
        sheenColor={controls.sheenColor}
        iridescence={controls.iridescence}
        iridescenceIOR={controls.iridescenceIOR}
        attenuationDistance={controls.attenuationDistance}
        attenuationColor={controls.attenuationColor}
        bumpScale={controls.bumpScale}
        side={THREE.DoubleSide}
      />
      {children /* optional: add a slightly larger rim mesh as a sibling */}
    </mesh>
  )
})

ShardMirror.displayName = 'ShardMirrorWorld'
