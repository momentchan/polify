// ShardMirrorWorld.tsx
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef, useState } from 'react'
import { useControls } from 'leva'
import { useTexture, MeshPortalMaterial, Html } from '@react-three/drei'
import { useLocation } from 'wouter'

import {
  copyUniformValues,
  createInitialUniforms,
  updateFresnelUniforms,
  type MaterialUniforms,
} from './utils'
import { getSharedShardMirrorMaterial } from './shardMirrorMaterial'
import { useShardShape, useExtrudeControls, useMaterialControls, useFresnelControls, useShardGeometry, useMaterialProperties } from './hooks'
import type { SharedAnimationValue } from './hooks/useSharedAnimation'
import { ImagePlane } from './ImagePlane'
import ShardParticles from './Particles/ShardParticles'
import EnvironmentSetup from '../EnvironmentSetup'

type ShardMirrorProps = React.JSX.IntrinsicElements['group'] & {
  planeRef: React.RefObject<THREE.Object3D | null>;
  map: THREE.Texture;
  isSelected?: boolean;
  shapePath: string;
  baseRotationZ?: number;
  cameraOffset?: [number, number, number];
  hovered?: boolean;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
  onClick?: (e: any) => void;
  onBack?: () => void;
  animValueRef?: React.RefObject<SharedAnimationValue>
};

export const ShardMirror = forwardRef<THREE.Group, ShardMirrorProps>(({
  planeRef,
  map,
  isSelected = false,
  shapePath,
  baseRotationZ = 0,
  cameraOffset = [0, 0, 0],
  hovered = false,
  onHoverEnter,
  onHoverLeave,
  onClick,
  onBack,
  children,
  animValueRef,
  ...groupProps
}, ref) => {

  const scratchTex = useTexture('/textures/scratch.jpg')
  const blend = useRef(0)
  const [blendValue, setBlendValue] = useState(0)
  const [, setLocation] = useLocation()
  const { pointer } = useThree()

  const meshRef = useRef<THREE.Mesh | null>(null)
  const mouseTargetQuaternion = useRef(new THREE.Quaternion())
  const mouseCurrentQuaternion = useRef(new THREE.Quaternion())

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
    mappingScale: { value: 2.0, min: 0.1, max: 3.0, step: 0.01 },
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

  useFrame(({ camera: frameCamera, clock }) => {
    // Animate blend smoothly from 0 to 1 when selected
    const targetBlend = isSelected ? 1 : 0
    // Speed up animation when going back (deselecting)
    const lerpFactor = isSelected ? 0.2 : 0.5 // Faster when going back
    blend.current = THREE.MathUtils.lerp(blend.current, targetBlend, lerpFactor)
    
    // Snap to exact target when very close to avoid floating point issues
    if (Math.abs(blend.current - targetBlend) < 0.001) {
      blend.current = targetBlend
    }

    // Update state to trigger re-render when blend changes significantly
    // Also update when close to target (0 or 1) to ensure it reaches exactly
    if (Math.abs(blend.current - blendValue) > 0.001 || Math.abs(blend.current - targetBlend) < 0.01) {
      setBlendValue(blend.current)
    }

    const uniforms = uniformsRef.current

    uniforms.uCamPos.value.copy(frameCamera.position)


    // Add time variance motion to meshRef
    if (meshRef.current) {
      const time = clock.elapsedTime
      const rotationSpeed = 0.5
      const rotationAmount = 0.05 + THREE.MathUtils.lerp(7, 0, THREE.MathUtils.smoothstep(animValueRef?.current?.value || 0, 0, 1))
      const positionSpeed = 0.5
      const positionAmount = 0.2

      // Subtle rotation oscillation with variance offset
      const baseRotationX = Math.sin(time * rotationSpeed + varianceOffset) * rotationAmount
      const baseRotationY = Math.cos(time * rotationSpeed * 0.7 + varianceOffset * 1.3) * rotationAmount

      // Subtle position oscillation with variance offset
      meshRef.current.position.x = Math.sin(time * positionSpeed * 0.6 + varianceOffset * 0.8) * positionAmount * 0.5
      meshRef.current.position.y = Math.cos(time * positionSpeed * 0.8 + varianceOffset * 1.1) * positionAmount * 0.5

      // Build base rotation (time-based oscillations + camera offset)
      let finalRotationX = baseRotationX
      let finalRotationY = baseRotationY
      let finalRotationZ = baseRotationZ

      // Camera offset rotation - reduce effect when portal is open
      const rotationReduction = 1 - blendValue // 0 when portal open, 1 when closed
      if (rotationReduction > 0 && !hovered) {
        // Apply camera offset scaled by reduction factor
        finalRotationX += cameraOffset[0] * rotationReduction
        finalRotationY += cameraOffset[1] * rotationReduction
        finalRotationZ += cameraOffset[2] * rotationReduction
      }

      // Convert base rotation to quaternion
      const baseQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(finalRotationX, finalRotationY, finalRotationZ)
      )

      // Mouse offset rotation - reduce to 0 when portal blend reaches 1
      const mouseRotationReduction = 1 - blendValue
      if (mouseRotationReduction > 0) {
        const offsetAmount = (hovered ? 0.1 : 0.5) * mouseRotationReduction
        const mouseOffsetX = pointer.y * offsetAmount // pitch offset
        const mouseOffsetY = pointer.x * offsetAmount // yaw offset
        
        // Smooth interpolation toward target mouse rotation
        mouseTargetQuaternion.current.setFromEuler(new THREE.Euler(mouseOffsetX, mouseOffsetY, 0))
        const mouseLerpFactor = hovered ? 0.4 : 0.2
        mouseCurrentQuaternion.current.slerp(mouseTargetQuaternion.current, mouseLerpFactor)
        
        // Apply mouse rotation quaternion on top of base quaternion
        baseQuaternion.multiply(mouseCurrentQuaternion.current)
      }

      
      // Apply final quaternion to mesh
      // meshRef.current.quaternion.copy(baseQuaternion)
    }
  })

  return (
    <group ref={groupRef} {...groupProps}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[0, 0, 0]}
        onPointerEnter={(e) => {
          e.stopPropagation()
          onHoverEnter?.()
        }}
        onPointerLeave={(e) => {
          e.stopPropagation()
          onHoverLeave?.()
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(e)
        }}
      >
        <MeshPortalMaterial resolution={2048} blur={0} blend={blendValue}>
          <ImagePlane map={map} position={[0, 0, -2]} rotation={[0, 0, 0]} scale={[2, 2, 1]} debug={false} />
          <color attach="background" args={['#000000']} />
          <directionalLight position={[10, 10, 10]} intensity={10} />
          <EnvironmentSetup />
          <group ref={groupRef} position={[0, 0, -2]}>
            <ShardParticles shapePath="textures/shape1.svg" count={16} animValueRef={animValueRef} sizeMultiplier={1} />
            <ShardParticles shapePath="textures/shape2.svg" count={128} animValueRef={animValueRef} />
            <ShardParticles shapePath="textures/shape3.svg" count={128} animValueRef={animValueRef} />
            <ShardParticles shapePath="textures/shape4.svg" count={128} animValueRef={animValueRef} />
          </group>
          {/* Go Back Button - Small text at top left */}
          {isSelected && blendValue > 0.5 && (
            <Html
              position={[-1.8, 1.8, -1]}
              scale={[0.5, 0.5, 0.5]}
              transform
              occlude
              style={{ 
                pointerEvents: 'auto',
                userSelect: 'none',
              }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  if (onBack) {
                    onBack()
                  } else {
                    setLocation('/')
                  }
                }}
                style={{
                  fontSize: '12px',
                  fontWeight: '400',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'color 0.2s ease',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
                }}
              >
                ← Back
              </div>
            </Html>
          )}
        </MeshPortalMaterial>
        {children /* optional: add a slightly larger rim mesh as a sibling */}
      </mesh>
    </group>
  )
})

ShardMirror.displayName = 'ShardMirrorWorld'
