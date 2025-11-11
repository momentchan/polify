// dependencies: @react-three/fiber, @react-three/drei
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { ShardMirror } from './ShardMirror'
import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { ImagePlane } from './ImagePlane'
import type { ShardInstance } from './types'
import type { SharedAnimationValue } from './hooks'
import { MathUtils } from 'three'

// Time scale configuration for explosion effect
interface ShardTimeScaleConfig {
    explosionEnd: number;
    transitionEnd: number;
    explosionTimeScale: number;
    transitionStartTimeScale: number;
    transitionEndTimeScale: number;
    slowMotionStartTimeScale: number;
    slowMotionEndTimeScale: number;
    deltaSmoothingFactor?: number;
    maxDelta?: number;
    timeScaleSmoothingFactor?: number;
}

const DEFAULT_SHARD_TIME_SCALE_CONFIG: ShardTimeScaleConfig = {
    explosionEnd: 0.15,
    transitionEnd: 0.22,
    explosionTimeScale: 1.0,
    transitionStartTimeScale: 1.0,
    transitionEndTimeScale: 0.1,
    slowMotionStartTimeScale: 0.01,
    slowMotionEndTimeScale: 0.001,
    deltaSmoothingFactor: 0.1,
    maxDelta: 0.1,
    timeScaleSmoothingFactor: 0.2,
};

type ShardProps = ThreeElements['group'] & {
    shard: ShardInstance,
    debug?: boolean,
    animValueRef?: React.RefObject<SharedAnimationValue>,
    onShardClick?: () => void,
    isSelected?: boolean,
    originalDistance?: number,
    closerDistanceOffset?: number,
    timeScaleConfig?: Partial<ShardTimeScaleConfig>
}

export default function Shard({ 
    shard, 
    debug = false, 
    animValueRef, 
    onShardClick,
    isSelected = false,
    originalDistance = 0,
    closerDistanceOffset = 0.3,
    timeScaleConfig = {},
    ...groupProps 
}: ShardProps) {
    const { image, shape, cameraOffset, position: defaultPosition, scale: defaultScale, baseRotationZ } = shard

    const map = useTexture(image)
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping
    map.anisotropy = 8

    const planeA = useRef<THREE.Group>(null)
    const group = useRef<THREE.Group>(null)
    const shardMirrorRef = useRef<THREE.Group>(null)
    const cameraCurrentQuaternion = useRef(new THREE.Quaternion())
    const mouseTargetQuaternion = useRef(new THREE.Quaternion())
    const mouseCurrentQuaternion = useRef(new THREE.Quaternion())
    const { pointer } = useThree()
    const [hovered, setHovered] = useState(false)
    
    // Merge time scale config with defaults
    const config = useMemo(() => ({ ...DEFAULT_SHARD_TIME_SCALE_CONFIG, ...timeScaleConfig }), [timeScaleConfig])
    
    // Calculate transition window sizes
    const transitionWindow = config.transitionEnd - config.explosionEnd
    const slowMotionDuration = 1.0 - config.transitionEnd
    
    // Delta smoothing refs
    const smoothedDeltaRef = useRef<number>(0.016) // Start with ~60fps delta
    const smoothedTimeScaleRef = useRef<number>(config.explosionTimeScale)
    
    // Explosive motion: initial velocity (no damping - use time scale instead)
    const velocity = useRef<THREE.Vector3>(new THREE.Vector3())
    const isVelocityInitialized = useRef(false)
    const baseScale = useRef<THREE.Vector3>(new THREE.Vector3())
    
    // Position offset for selection: move closer along radial direction
    const selectionOffset = useRef<THREE.Vector3>(new THREE.Vector3())
    const targetOffset = useRef<THREE.Vector3>(new THREE.Vector3())

    const {
        position = defaultPosition,
        scale = defaultScale,
        ...restGroupProps
    } = groupProps
    
    // Store base scale for animation
    useEffect(() => {
        if (Array.isArray(scale)) {
            baseScale.current.set(scale[0], scale[1], scale[2])
        } else if (typeof scale === 'number') {
            baseScale.current.setScalar(scale)
        } else if (scale instanceof THREE.Vector3) {
            baseScale.current.copy(scale)
        }
    }, [scale])

    // Initialize explosive velocity: outward from initial position
    useEffect(() => {
        if (!isVelocityInitialized.current) {
            const initialPos = new THREE.Vector3(...defaultPosition)
            // Use normalized position as outward direction (or random direction if at origin)
            const direction = initialPos.length() > 0 
                ? initialPos.clone().normalize() 
                : new THREE.Vector3(
                    Math.random() - 0.5,
                    Math.random() - 0.5,
                    Math.random() - 0.5
                ).normalize()
            const initialSpeed = 5 // Increased speed for super explosion (matching particles)
            velocity.current.copy(direction).multiplyScalar(initialSpeed)
            isVelocityInitialized.current = true
        }
    }, [defaultPosition])

    useFrame(({ camera }, delta) => {
        if (!group.current) return

        // Apply explosive motion with time scale (same as particles)
        if (animValueRef?.current) {
            const animValue = animValueRef.current.value
            
            // Stabilize delta: clamp to max and apply exponential smoothing
            const clampedDelta = Math.min(delta, config.maxDelta ?? 0.1)
            const smoothingFactor = config.deltaSmoothingFactor ?? 0.1
            smoothedDeltaRef.current = MathUtils.lerp(
                smoothedDeltaRef.current,
                clampedDelta,
                smoothingFactor
            )
            
            // Calculate target time scale based on animation value
            let targetTimeScale: number
            
            if (animValue < config.explosionEnd) {
                // Explosion phase - normal time speed
                targetTimeScale = config.explosionTimeScale
            } else if (animValue < config.transitionEnd) {
                // Transition to slow motion
                const transitionProgress = (animValue - config.explosionEnd) / transitionWindow
                const eased = THREE.MathUtils.smoothstep(transitionProgress, 0, 1)
                targetTimeScale = MathUtils.lerp(config.transitionStartTimeScale, config.transitionEndTimeScale, eased)
            } else {
                // Slow motion phase
                const slowMotionProgress = (animValue - config.transitionEnd) / slowMotionDuration
                const eased = THREE.MathUtils.smoothstep(slowMotionProgress, 0, 1)
                targetTimeScale = MathUtils.lerp(config.slowMotionStartTimeScale, config.slowMotionEndTimeScale, eased)
            }
            
            // Smooth timeScale transitions to prevent sudden jumps
            const timeScaleSmoothing = config.timeScaleSmoothingFactor ?? 0.2
            smoothedTimeScaleRef.current = MathUtils.lerp(
                smoothedTimeScaleRef.current,
                targetTimeScale,
                timeScaleSmoothing
            )
            
            const timeScale = smoothedTimeScaleRef.current
            
            // No damping - particles maintain velocity, slow motion via delta scaling
            // Update position based on velocity with scaled delta (time dilation)
            const currentPos = new THREE.Vector3(...group.current.position).sub(selectionOffset.current)
            const scaledDelta = smoothedDeltaRef.current * timeScale
            const newPos = currentPos.clone().add(
                velocity.current.clone().multiplyScalar(scaledDelta)
            )
            
            // Calculate radial direction from center to natural position
            const radialDirection = newPos.length() > 0.001 
                ? newPos.clone().normalize() 
                : new THREE.Vector3(0, 0, 1)
            
            // Update target offset direction when selection changes (recalculate each frame for accuracy)
            if (isSelected) {
                // Move closer: offset towards center (negative radial direction)
                targetOffset.current.copy(radialDirection).multiplyScalar(closerDistanceOffset)
            } else {
                // When deselected, return to natural position (no offset)
                targetOffset.current.set(0, 0, 0)
            }
            
            // Animate selection offset smoothly (use scaled delta for slow motion consistency)
            const offsetLerpSpeed = 3.0; // units per second
            selectionOffset.current.lerp(targetOffset.current, Math.min(1.0, offsetLerpSpeed * scaledDelta))
            
            // Apply selection offset along radial direction
            group.current.position.copy(newPos).add(selectionOffset.current)
            
            // Scale up based on animation value (multiply base scale)
            const scaleMultiplier = THREE.MathUtils.lerp(
                0.1,
                1.0,
                MathUtils.smoothstep(animValueRef.current.value, 0.2, 0.6)
            )
            group.current.scale.copy(baseScale.current).multiplyScalar(scaleMultiplier)
        }

        // Get world position and world rotation
        group.current.updateWorldMatrix(true, false)
        const worldPosition = new THREE.Vector3()
        group.current.getWorldPosition(worldPosition)
        const worldQuaternion = new THREE.Quaternion()
        group.current.getWorldQuaternion(worldQuaternion)

        // Calculate direction from shard to camera in world space
        const direction = new THREE.Vector3()
        direction.subVectors(camera.position, worldPosition).normalize()

        // When hovered, face camera directly using only X and Y rotation (no Z-axis rotation)
        // When not hovered, apply camera offset rotation
        // Apply camera offset rotation when not hovered
        if (!hovered) {
            const offsetQuaternion = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(cameraOffset[0], cameraOffset[1], cameraOffset[2])
            )
            direction.applyQuaternion(offsetQuaternion)
        }
        
        // Calculate pitch (X rotation) and yaw (Y rotation) from direction
        // Avoid z-axis rotation by only using pitch and yaw
        const pitch = Math.asin(-direction.y) // X-axis rotation (pitch)
        const yaw = Math.atan2(direction.x, direction.z) // Y-axis rotation (yaw)
        
        // Create target quaternion in world space from only pitch and yaw (no roll/Z rotation)
        const targetWorldQuaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(pitch, yaw, 0, 'XYZ')
        )

        // When hovered, rotate directly to camera (fast), otherwise slow tracking
        const cameraLerpFactor = hovered ? 0.3 : 0.05
        cameraCurrentQuaternion.current.slerp(targetWorldQuaternion, cameraLerpFactor)
        
        // Convert world quaternion to local quaternion by removing parent rotation
        // worldQuaternion = parentQuaternion * localQuaternion
        // Therefore: localQuaternion = inverseParentQuaternion * worldQuaternion
        const parentQuaternion = new THREE.Quaternion()
        if (group.current.parent) {
            group.current.parent.updateWorldMatrix(true, false)
            group.current.parent.getWorldQuaternion(parentQuaternion)
        }
        const inverseParentQuaternion = parentQuaternion.clone().invert()
        
        // Apply parent rotation inverse to get local quaternion
        const localQuaternion = inverseParentQuaternion.clone().multiply(cameraCurrentQuaternion.current)
        group.current.quaternion.copy(localQuaternion)

        // 2. Mouse offset rotation (smooth) - applied only to ShardMirrorWorld
        // Reduce mouse offset when hovered to allow direct camera facing
        if (shardMirrorRef.current) {
            const offsetAmount = hovered ? 0.1 : 0.5 // reduce offset when hovered
            const offsetRotation = new THREE.Euler(
                pointer.y * offsetAmount, // pitch offset
                pointer.x * offsetAmount, // yaw offset
                0
            )
            mouseTargetQuaternion.current.setFromEuler(offsetRotation)
            
            // Smooth interpolation toward target mouse rotation
            const mouseLerpFactor = hovered ? 0.4 : 0.2 // faster response when hovered
            mouseCurrentQuaternion.current.slerp(mouseTargetQuaternion.current, mouseLerpFactor)
            shardMirrorRef.current.quaternion.copy(mouseCurrentQuaternion.current)
        }
    }, 1)


    return (
        <group 
            ref={group} 
            position={position} 
            scale={scale} 
            {...restGroupProps}
        >
            <ImagePlane ref={planeA} map={map} position={[0, 0, 3]} rotation={[0, 0, 0]} scale={[7, 7, 1]} debug={debug} />
            <ShardMirror 
                ref={shardMirrorRef} 
                planeRef={planeA} 
                map={map} 
                shapePath={shape} 
                baseRotationZ={baseRotationZ} 
                position={[0, 0, 0]} 
                animValueRef={animValueRef}
                onHoverEnter={() => {
                    setHovered(true)
                    document.body.style.cursor = 'pointer'
                }}
                onHoverLeave={() => {
                    setHovered(false)
                    document.body.style.cursor = 'auto'
                }}
                onClick={(e) => {
                    e.stopPropagation()
                    if (onShardClick) {
                        onShardClick()
                    }
                }}
            />
        </group>
    )
}
 