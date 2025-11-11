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

// Distance-based slow motion configuration for explosion effect
interface ShardDistanceSlowMotionConfig {
    distance1?: number;              // First distance threshold - start of first transition (default: 3.0)
    distance2?: number;              // Second distance threshold - end of first transition (default: 5.0)
    distance3?: number;              // Third distance threshold - end of second transition (default: 7.0)
    timeScale1?: number;             // Time scale for d < d1 (normal speed, default: 1.0)
    timeScale2?: number;             // Time scale for d1 < d < d2 transition end (default: 0.01)
    timeScale3?: number;             // Time scale for d > d3 (slowest motion, default: 0.001)
    distanceRandomization?: number;  // Amount of distance randomization (0 = none, default: 0.5)
    center?: [number, number, number]; // Center point for distance calculation (default: [0, 0, 0])
}

const DEFAULT_SHARD_DISTANCE_CONFIG: ShardDistanceSlowMotionConfig = {
    distance1: 1.0,
    distance2: 2,
    distance3: 2.5,
    timeScale1: 1.0,
    timeScale2: 0.1,
    timeScale3: 0.0,
    distanceRandomization: 0,
    center: [0, 0, 0],
};

type ShardProps = ThreeElements['group'] & {
    shard: ShardInstance,
    debug?: boolean,
    animValueRef?: React.RefObject<SharedAnimationValue>,
    onShardClick?: () => void,
    isSelected?: boolean,
    originalDistance?: number,
    closerDistanceOffset?: number,
    distanceConfig?: Partial<ShardDistanceSlowMotionConfig>
}

export default function Shard({ 
    shard, 
    debug = false, 
    animValueRef, 
    onShardClick,
    isSelected = false,
    originalDistance = 0,
    closerDistanceOffset = 0.3,
    distanceConfig = {},
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
    
    // Merge distance config with defaults
    const config = useMemo(() => ({ ...DEFAULT_SHARD_DISTANCE_CONFIG, ...distanceConfig }), [distanceConfig])
    
    // Per-shard random seed for distance randomization (consistent per shard)
    const shardSeed = useMemo(() => {
        // Generate seed from default position to ensure consistency
        const pos = new THREE.Vector3(...defaultPosition)
        return Math.sin(pos.x * 12.9898 + pos.y * 78.233 + pos.z * 43.5432) * 43758.5453
    }, [defaultPosition])
    
    // Seeded random function for deterministic randomization
    const seededRandom = (seed: number): number => {
        const x = Math.sin(seed) * 10000
        return x - Math.floor(x)
    }
    
    // Calculate distance randomization offset
    const distanceOffset = useMemo(() => {
        const seed = seededRandom(shardSeed)
        return (seed - 0.5) * (config.distanceRandomization ?? 0.5)
    }, [shardSeed, config.distanceRandomization])
    
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

        // Apply explosive motion with distance-based time scale (same as particles)
        if (animValueRef?.current) {
            // Get current position (without selection offset for distance calculation)
            const currentPos = new THREE.Vector3(...group.current.position).sub(selectionOffset.current)

            // Calculate distance from center with randomization
            const centerVec = new THREE.Vector3(...(config.center ?? [0, 0, 0]))
            const baseDistance = currentPos.distanceTo(centerVec)
            const d = baseDistance;//+ distanceOffset

            
            // Calculate distance-based time scale using three zones with smooth transitions
            const d1 = config.distance1!
            const d2 = config.distance2!
            const d3 = config.distance3!
            const timeScale1 = config.timeScale1!
            const timeScale2 = config.timeScale2!
            const timeScale3 = 0.0 // Always 0 at distance3 to stop shards
            
            // Manual smoothstep implementation: smoothstep(edge0, edge1, x)
            const smoothstep = (edge0: number, edge1: number, x: number): number => {
                const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
                return t * t * (3 - 2 * t)
            }
            
            // Calculate transition factors and blend time scales
            const t1 = smoothstep(d1, d2, d) // 0 when d <= d1, 1 when d >= d2
            const t2 = smoothstep(d2, d3, d) // 0 when d <= d2, 1 when d >= d3
            
            const timeScale12 = MathUtils.lerp(timeScale1, timeScale2, t1)
            const timeScale23 = MathUtils.lerp(timeScale2, timeScale3, t2)
            
            // Choose between zones: when d < d2 use timeScale12, when d >= d2 use timeScale23
            const distanceTimeScale = d < d2 ? timeScale12 : timeScale23
            
            const scaledDelta = Math.min(delta, 1/30) * distanceTimeScale
            let newPos = currentPos.clone().add(
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
                MathUtils.smoothstep(animValueRef.current.value, 0, 1)
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
 