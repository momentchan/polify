// ShardMirrorWorld.tsx
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from 'react'
import { useControls } from 'leva'
import { useTexture } from '@react-three/drei'

import {
  copyUniformValues,
  createInitialUniforms,
  updateFresnelUniforms,
  type MaterialUniforms,
} from './utils'
import { getSharedShardMirrorMaterial } from './shardMirrorMaterial'
import { useShardShape, useExtrudeControls, useMaterialControls, useFresnelControls, useShardGeometry, useMaterialProperties } from './hooks'
import type { SharedAnimationValue } from './hooks/useSharedAnimation'

type ShardMirrorProps = React.JSX.IntrinsicElements['group'] & {
  planeRef: React.RefObject<THREE.Object3D | null>;
  map: THREE.Texture;
  shapePath: string;
  baseRotationZ?: number;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
  animValueRef?: React.RefObject<SharedAnimationValue>
};

export const ShardMirror = forwardRef<THREE.Group, ShardMirrorProps>(({
  planeRef,
  map,
  shapePath,
  baseRotationZ = 0,
  onHoverEnter,
  onHoverLeave,
  children,
  animValueRef,
  ...groupProps
}, ref) => {

  const scratchTex = useTexture('/textures/scratch.jpg')

  const meshRef = useRef<THREE.Mesh | null>(null)

  const paths = useShardShape(shapePath)
  const groupRef = useRef<THREE.Group | null>(null)

  useImperativeHandle(ref, () => groupRef.current as THREE.Group)

  // Generate unique variance offset for each mirror instance
  const varianceOffset = useMemo(() => Math.random() * Math.PI * 2, [])

  const extrudeConfig = useExtrudeControls('Shard')

  const geometryBuildTimeMs = useRef<number | null>(null)
  const uniformInitTimeMs = useRef<number | null>(null)
  const materialCreateTimeMs = useRef<number | null>(null)

  const geometry = useShardGeometry(paths, extrudeConfig)

  const materialBase = useMaterialControls('Shard')

  const {
    scratchBlend,
    blurAmount,
    mappingScale,
  } = useControls('Shard.Material.Texture', {
    scratchBlend: { value: 0.3, min: 0, max: 1, step: 0.01 },
    blurAmount: { value: 0.01, min: 0, max: 0.03, step: 0.001 },
    mappingScale: { value: 1.0, min: 0.1, max: 3.0, step: 0.01 },
  }, { collapsed: true })

  const fresnelConfig = useFresnelControls('Shard')

  const uniforms = useMemo<MaterialUniforms>(() => {
    const result = createInitialUniforms(
      map,
      scratchTex,
      fresnelConfig,
      scratchBlend,
      blurAmount,
      mappingScale
    )
    return result
  }, [map, scratchTex, fresnelConfig, scratchBlend, blurAmount, mappingScale])

  const uniformsRef = useRef(uniforms)
  useEffect(() => {
    uniformsRef.current = uniforms
  }, [uniforms])

  const material = useMemo(() => {
    const result = getSharedShardMirrorMaterial(uniforms)
    return result
  }, [uniforms])

  useEffect(() => {
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
  }, [shapePath])

  // Update fresnel uniforms when controls change
  useEffect(() => {
    updateFresnelUniforms(uniformsRef.current, fresnelConfig)
  }, [fresnelConfig])

  // Update blur amount and mapping scale when controls change
  useEffect(() => {
    uniformsRef.current.uBlurAmount.value = blurAmount
    uniformsRef.current.uMappingScale.value = mappingScale
  }, [blurAmount, mappingScale])

  useMaterialProperties(material, materialBase)

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

  useFrame(({ camera, clock }) => {

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
      const rotationAmount = 0.05 + THREE.MathUtils.lerp(20, 0, THREE.MathUtils.smoothstep(animValueRef?.current?.value || 0, 0, 0.6))
      const positionSpeed = 0.5
      const positionAmount = 0.2

      // Subtle rotation oscillation with variance offset
      meshRef.current.rotation.x = Math.sin(time * rotationSpeed + varianceOffset) * rotationAmount
      meshRef.current.rotation.y = Math.cos(time * rotationSpeed * 0.7 + varianceOffset * 1.3) * rotationAmount

      // Subtle position oscillation with variance offset
      meshRef.current.position.x = Math.sin(time * positionSpeed * 0.6 + varianceOffset * 0.8) * positionAmount * 0.5
      meshRef.current.position.y = Math.cos(time * positionSpeed * 0.8 + varianceOffset * 1.1) * positionAmount * 0.5
    }
  })

  return (
    <group ref={groupRef} {...groupProps}>
      <mesh 
        ref={meshRef} 
        geometry={geometry} 
        rotation={[0, 0, baseRotationZ]}
        onPointerEnter={(e) => {
          e.stopPropagation()
          onHoverEnter?.()
        }}
        onPointerLeave={(e) => {
          e.stopPropagation()
          onHoverLeave?.()
        }}
      >
        <primitive object={material} attach="material" />
        {children /* optional: add a slightly larger rim mesh as a sibling */}
      </mesh>
    </group>
  )
})

ShardMirror.displayName = 'ShardMirrorWorld'
