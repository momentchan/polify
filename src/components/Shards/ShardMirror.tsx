// ShardMirrorWorld.tsx
import * as THREE from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from 'react'
import { useControls } from 'leva'
import CustomShaderMaterial from 'three-custom-shader-material'
import type CustomShaderMaterialVanilla from 'three-custom-shader-material/vanilla'
import { SVGLoader, type SVGResult } from 'three/examples/jsm/loaders/SVGLoader.js'
import { useTexture } from '@react-three/drei'

import {
  createExtrudeSettings,
  createInitialUniforms,
  createShardGeometry,
  updateFresnelUniforms,
  type ExtrudeSettings,
  type FresnelConfig,
  type MaterialUniforms,
} from './shardMirrorUtils'
import { shardMirrorVertexShader, shardMirrorFragmentShader } from './shardMirrorShaders'

type ShardMirrorProps = React.JSX.IntrinsicElements['group'] & {
  planeRef: React.RefObject<THREE.Object3D | null>;
  map: THREE.Texture;
  shapePath: string;
  baseRotationZ?: number;
};

export const ShardMirror = forwardRef<THREE.Group, ShardMirrorProps>(({ 
  planeRef,
  map,
  shapePath,
  baseRotationZ = 0,
  children,
  ...groupProps
}, ref) => {

  const matRef = useRef<CustomShaderMaterialVanilla<typeof THREE.MeshPhysicalMaterial> | null>(null)
  const scratchTex = useTexture('/textures/scratch.jpg')

  const { paths } = useLoader(SVGLoader, shapePath) as SVGResult
  const groupRef = useRef<THREE.Group | null>(null)

  useImperativeHandle(ref, () => groupRef.current as THREE.Group)
   
  const {
    depth,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments,
  } = useControls('Shard.Extrude', {
    depth: { value: 0.05, min: 0, max: 1, step: 0.01 },
    bevelEnabled: { value: true },
    bevelThickness: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
    bevelSize: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
    bevelSegments: { value: 3, min: 1, max: 10, step: 1 },
  }, { collapsed: true })

  const geometry = useMemo(() => {
    const settings: ExtrudeSettings = createExtrudeSettings({
      depth,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments,
    })
    return createShardGeometry(paths, settings)
  }, [paths, depth, bevelEnabled, bevelThickness, bevelSize, bevelSegments])

  const {
    roughness,
    metalness,
    transmission,
    thickness,
    ior,
    clearcoat,
    clearcoatRoughness,
    reflectivity,
    envMapIntensity,
    sheen,
    sheenRoughness,
    sheenColor,
    iridescence,
    iridescenceIOR,
    attenuationDistance,
    attenuationColor,
    bumpScale,
    scratchBlend,
  } = useControls('Shard.Material.Base', {
    roughness: { value: 0.5, min: 0, max: 1, step: 0.01 },
    metalness: { value: 0.25, min: 0, max: 1, step: 0.01 },
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
    scratchBlend: { value: 0.3, min: 0, max: 1, step: 0.01 },
  }, { collapsed: true })

  const {
    enabled: fresnelEnabled,
    power: fresnelPower,
    intensity: fresnelIntensity,
    color: fresnelColor,
  } = useControls('Shard.Material.Fresnel', {
    enabled: { value: true },
    power: { value: 2.5, min: 0.1, max: 5.0, step: 0.1 },
    intensity: { value: 0.45, min: 0, max: 2.0, step: 0.01 },
    color: { value: '#7b5ca3' },
  }, { collapsed: true })

  // Initialize uniforms
  const fresnelConfig = useMemo<FresnelConfig>(() => ({
    enabled: fresnelEnabled,
    power: fresnelPower,
    intensity: fresnelIntensity,
    color: fresnelColor,
  }), [fresnelEnabled, fresnelPower, fresnelIntensity, fresnelColor])

  const uniforms = useMemo<MaterialUniforms>(() => createInitialUniforms(
    map,
    scratchTex,
    fresnelConfig,
    scratchBlend
  ), [map, scratchTex, fresnelConfig, scratchBlend])

  // Update fresnel uniforms when controls change
  useEffect(() => {
    updateFresnelUniforms(matRef.current, fresnelConfig)
  }, [fresnelConfig])

  useFrame(({ camera }) => {
    if (!planeRef.current || !matRef.current) return

    const plane = planeRef.current
    if (!plane) return

    const uniforms = matRef.current.uniforms as MaterialUniforms

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
    <group ref={groupRef} {...groupProps}>
      <mesh geometry={geometry} rotation={[0, 0, baseRotationZ]}>
        <CustomShaderMaterial
          ref={matRef}
          baseMaterial={THREE.MeshPhysicalMaterial}
          vertexShader={shardMirrorVertexShader}
          fragmentShader={shardMirrorFragmentShader}
          uniforms={uniforms}
          silent={true}
          transparent={true}
          depthWrite={false}
          roughness={roughness}
          metalness={metalness}
          transmission={transmission}
          thickness={thickness}
          ior={ior}
          clearcoat={clearcoat}
          clearcoatRoughness={clearcoatRoughness}
          reflectivity={reflectivity}
          envMapIntensity={envMapIntensity}
          sheen={sheen}
          sheenRoughness={sheenRoughness}
          sheenColor={sheenColor}
          iridescence={iridescence}
          iridescenceIOR={iridescenceIOR}
          attenuationDistance={attenuationDistance}
          attenuationColor={attenuationColor}
          bumpScale={bumpScale}
          side={THREE.DoubleSide}
        />
        {children /* optional: add a slightly larger rim mesh as a sibling */}
      </mesh>
    </group>
  )
})

ShardMirror.displayName = 'ShardMirrorWorld'
