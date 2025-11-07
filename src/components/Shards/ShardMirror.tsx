// ShardMirrorWorld.tsx
import * as THREE from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from 'react'
import { useControls } from 'leva'
import { SVGLoader, type SVGResult } from 'three/examples/jsm/loaders/SVGLoader.js'
import { useTexture } from '@react-three/drei'

import {
  copyUniformValues,
  createExtrudeSettings,
  createInitialUniforms,
  createShardGeometry,
  updateFresnelUniforms,
  type ExtrudeSettings,
  type FresnelConfig,
  type MaterialUniforms,
} from './shardMirrorUtils'
import { getSharedShardMirrorMaterial } from './shardMirrorMaterial'

type ShardMirrorProps = React.JSX.IntrinsicElements['group'] & {
  planeRef: React.RefObject<THREE.Object3D | null>;
  map: THREE.Texture;
  shapePath: string;
  baseRotationZ?: number;
  debugPerf?: boolean;
};

export const ShardMirror = forwardRef<THREE.Group, ShardMirrorProps>(({
  planeRef,
  map,
  shapePath,
  baseRotationZ = 0,
  debugPerf = false,
  children,
  ...groupProps
}, ref) => {

  const scratchTex = useTexture('/textures/scratch.jpg')

  const meshRef = useRef<THREE.Mesh | null>(null)

  const { paths } = useLoader(SVGLoader, shapePath) as SVGResult
  const groupRef = useRef<THREE.Group | null>(null)

  useImperativeHandle(ref, () => groupRef.current as THREE.Group)

  // Generate unique variance offset for each mirror instance
  const varianceOffset = useMemo(() => Math.random() * Math.PI * 2, [])

  const {
    depth,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments,
  } = useControls('Shard.Extrude', {
    depth: { value: 0.02, min: 0, max: 0.1, step: 0.01 },
    bevelEnabled: { value: true },
    bevelThickness: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
    bevelSize: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
    bevelSegments: { value: 3, min: 1, max: 10, step: 1 },
  }, { collapsed: true })

  const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
  const geometryBuildTimeMs = useRef<number | null>(null)
  const uniformInitTimeMs = useRef<number | null>(null)
  const materialCreateTimeMs = useRef<number | null>(null)

  const geometry = useMemo(() => {
    const start = perfNow()
    const settings: ExtrudeSettings = createExtrudeSettings({
      depth,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments,
    })
    const result = createShardGeometry(paths, settings)
    geometryBuildTimeMs.current = perfNow() - start
    return result
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
  }, { collapsed: true })

  const {
    scratchBlend,
    blurAmount,
    mappingScale,
  } = useControls('Shard.Material.Texture', {
    scratchBlend: { value: 0.3, min: 0, max: 1, step: 0.01 },
    blurAmount: { value: 0.01, min: 0, max: 0.03, step: 0.001 },
    mappingScale: { value: 1.0, min: 0.1, max: 3.0, step: 0.01 },
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

  const uniforms = useMemo<MaterialUniforms>(() => {
    const start = perfNow()
    const result = createInitialUniforms(
      map,
      scratchTex,
      fresnelConfig,
      scratchBlend,
      blurAmount,
      mappingScale
    )
    uniformInitTimeMs.current = perfNow() - start
    return result
  }, [map, scratchTex, fresnelConfig, scratchBlend, blurAmount, mappingScale])

  const uniformsRef = useRef(uniforms)
  useEffect(() => {
    uniformsRef.current = uniforms
  }, [uniforms])

  const material = useMemo(() => {
    const start = perfNow()
    const result = getSharedShardMirrorMaterial(uniforms)
    materialCreateTimeMs.current = perfNow() - start
    return result
  }, [uniforms])

  useEffect(() => {
    if (!debugPerf) return

    const geometryTime = geometryBuildTimeMs.current
    const uniformsTime = uniformInitTimeMs.current
    const materialTime = materialCreateTimeMs.current

    if (geometryTime != null) {
      console.info(`[ShardMirror] geometry from '${shapePath}' built in ${geometryTime.toFixed(2)}ms`)
    }

    if (uniformsTime != null) {
      console.info(`[ShardMirror] uniforms initialized in ${uniformsTime.toFixed(2)}ms`)
    }

    if (materialTime != null) {
      console.info(`[ShardMirror] material clone created in ${materialTime.toFixed(2)}ms`)
    }
  }, [debugPerf, shapePath])

  // Update fresnel uniforms when controls change
  useEffect(() => {
    updateFresnelUniforms(uniformsRef.current, fresnelConfig)
  }, [fresnelConfig])

  // Update blur amount and mapping scale when controls change
  useEffect(() => {
    uniformsRef.current.uBlurAmount.value = blurAmount
    uniformsRef.current.uMappingScale.value = mappingScale
  }, [blurAmount, mappingScale])

  useEffect(() => {
    const physicalMaterial = material as unknown as THREE.MeshPhysicalMaterial & {
      sheenColor: THREE.Color;
      attenuationColor: THREE.Color;
    }

    physicalMaterial.roughness = roughness
    physicalMaterial.metalness = metalness
    physicalMaterial.transmission = transmission
    physicalMaterial.thickness = thickness
    physicalMaterial.ior = ior
    physicalMaterial.clearcoat = clearcoat
    physicalMaterial.clearcoatRoughness = clearcoatRoughness
    physicalMaterial.reflectivity = reflectivity
    physicalMaterial.envMapIntensity = envMapIntensity
    physicalMaterial.sheen = sheen
    physicalMaterial.sheenRoughness = sheenRoughness
    physicalMaterial.sheenColor.set(sheenColor)
    physicalMaterial.iridescence = iridescence
    physicalMaterial.iridescenceIOR = iridescenceIOR
    physicalMaterial.attenuationDistance = attenuationDistance
    physicalMaterial.attenuationColor.set(attenuationColor)
    physicalMaterial.bumpScale = bumpScale
    physicalMaterial.needsUpdate = true
  }, [
    material,
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
    blurAmount,
  ])

  useEffect(() => {
    if (!meshRef.current) return

    const mesh = meshRef.current
    const previous = mesh.onBeforeRender
    const handler: THREE.Mesh['onBeforeRender'] = () => {
      const uniformsTarget = material.uniforms as unknown as MaterialUniforms
      copyUniformValues(uniformsTarget, uniformsRef.current)
    }

    mesh.onBeforeRender = handler

    return () => {
      mesh.onBeforeRender = previous
    }
  }, [material])

  const framePerf = useRef({
    total: 0,
    frames: 0,
  })

  useFrame(({ camera, clock }) => {
    const start = debugPerf ? perfNow() : 0

    if (!planeRef.current) return

    const plane = planeRef.current
    if (!plane) return

    const uniforms = uniformsRef.current

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

    // Add time variance motion to meshRef
    if (meshRef.current) {
      const time = clock.elapsedTime
      const rotationSpeed = 0.5
      const rotationAmount = 0.05
      const positionSpeed = 0.5
      const positionAmount = 0.2

      // Subtle rotation oscillation with variance offset
      meshRef.current.rotation.x = Math.sin(time * rotationSpeed + varianceOffset) * rotationAmount
      meshRef.current.rotation.y = Math.cos(time * rotationSpeed * 0.7 + varianceOffset * 1.3) * rotationAmount

      // Subtle position oscillation with variance offset
      meshRef.current.position.x = Math.sin(time * positionSpeed * 0.6 + varianceOffset * 0.8) * positionAmount * 0.5
      meshRef.current.position.y = Math.cos(time * positionSpeed * 0.8 + varianceOffset * 1.1) * positionAmount * 0.5
    }

    if (debugPerf) {
      const elapsed = perfNow() - start
      framePerf.current.total += elapsed
      framePerf.current.frames += 1

      if (framePerf.current.frames >= 120) {
        const average = framePerf.current.total / framePerf.current.frames
        console.info(`[ShardMirror] average useFrame update: ${average.toFixed(3)}ms over ${framePerf.current.frames} frames`)
        framePerf.current.total = 0
        framePerf.current.frames = 0
      }
    }
  })

  return (
    <group ref={groupRef} {...groupProps}>
      <mesh ref={meshRef} geometry={geometry} rotation={[0, 0, baseRotationZ]}>
        <primitive object={material} attach="material" />
        {children /* optional: add a slightly larger rim mesh as a sibling */}
      </mesh>
    </group>
  )
})

ShardMirror.displayName = 'ShardMirrorWorld'
