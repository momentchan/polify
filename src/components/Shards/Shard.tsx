// dependencies: @react-three/fiber, @react-three/drei
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { ShardMirror } from './ShardMirror'
import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { ImagePlane } from './ImagePlane'
import type { ShardInstance } from './types'
import type { SharedAnimationValue } from './hooks'
import { useShardAnimation } from './hooks'
import { MathUtils } from 'three'

type ShardProps = ThreeElements['group'] & {
    shard: ShardInstance,
    debug?: boolean,
    animValueRef?: React.RefObject<SharedAnimationValue>
}

export default function Shard({ shard, debug = false, animValueRef, ...groupProps }: ShardProps) {
    const { image, shape, cameraOffset, position: defaultPosition, scale: defaultScale, baseRotationZ } = shard

    const map = useTexture(image)
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping
    map.anisotropy = 8

    const planeA = useRef<THREE.Group>(null)
    const group = useRef<THREE.Group>(null)
    const shardMirrorRef = useRef<THREE.Group>(null)
    const cameraTargetQuaternion = useRef(new THREE.Quaternion())
    const cameraCurrentQuaternion = useRef(new THREE.Quaternion())
    const mouseTargetQuaternion = useRef(new THREE.Quaternion())
    const mouseCurrentQuaternion = useRef(new THREE.Quaternion())
    const { pointer } = useThree()
    const [hovered, setHovered] = useState(false)
    
    // Explosive motion: initial velocity and damping
    const velocity = useRef<THREE.Vector3>(new THREE.Vector3())
    const isVelocityInitialized = useRef(false)
    const baseScale = useRef<THREE.Vector3>(new THREE.Vector3())

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

    // Apply shared animation if provided (hook handles undefined ref gracefully)
    useShardAnimation({ 
        groupRef: group as React.RefObject<THREE.Group>, 
        animValueRef 
    });

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
            const initialSpeed = 0.5 // Initial outward speed (similar to ShardParticles)
            velocity.current.copy(direction).multiplyScalar(initialSpeed)
            isVelocityInitialized.current = true
        }
    }, [defaultPosition])

    useFrame(({ camera }, delta) => {
        if (!group.current) return

        // Apply explosive motion: update position based on velocity with damping
        if (animValueRef?.current) {
            // Calculate damping based on animation value (similar to ShardParticles)
            // Damping goes from 1.0 (no damping) to 0.95 (some damping) as animation progresses
            const damping = THREE.MathUtils.lerp(
                1.0,
                0.95,
                THREE.MathUtils.smoothstep(animValueRef.current.value, 0.5, 0.7)
            )
            
            // Apply damping to velocity
            velocity.current.multiplyScalar(damping)
            
            // Update position based on velocity
            const currentPos = new THREE.Vector3(...group.current.position)
            const newPos = currentPos.clone().add(
                velocity.current.clone().multiplyScalar(delta)
            )
            group.current.position.copy(newPos)
            
            // Scale up based on animation value (multiply base scale)
            const scaleMultiplier = THREE.MathUtils.lerp(
                0.1,
                1.0,
                MathUtils.smoothstep(animValueRef.current.value, 0.2, 1)
            )
            group.current.scale.copy(baseScale.current).multiplyScalar(scaleMultiplier)
        }

        // Get world position (accounting for parent rotation)
        group.current.updateWorldMatrix(true, false)
        const worldPosition = new THREE.Vector3()
        group.current.getWorldPosition(worldPosition)
        
        // Get parent rotation (from ShardSystem) to account for system rotation
        const parentQuaternion = new THREE.Quaternion()
        if (group.current.parent) {
            group.current.parent.updateWorldMatrix(true, false)
            group.current.parent.getWorldQuaternion(parentQuaternion)
        }
        const inverseParentQuaternion = parentQuaternion.clone().invert()

        // Calculate direction from shard to camera in world space
        const direction = new THREE.Vector3()
        direction.subVectors(camera.position, worldPosition).normalize()

        // Transform direction to local space by inverting parent rotation
        // This accounts for the ShardSystem's rotation
        direction.applyQuaternion(inverseParentQuaternion)

        // When hovered, face camera directly using only X and Y rotation (no Z-axis rotation)
        // When not hovered, apply camera offset rotation
        if (hovered) {
            // Calculate pitch (X rotation) and yaw (Y rotation) from direction
            // Forward is (0, 0, 1), so we calculate angles relative to that
            const pitch = Math.asin(-direction.y) // X-axis rotation (pitch)
            const yaw = Math.atan2(direction.x, direction.z) // Y-axis rotation (yaw)
            
            // Create quaternion from only pitch and yaw (no roll/Z rotation)
            cameraTargetQuaternion.current.setFromEuler(
                new THREE.Euler(pitch, yaw, 0, 'XYZ')
            )
        } else {
            // Apply camera offset rotation
            const offsetQuaternion = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(cameraOffset[0], cameraOffset[1], cameraOffset[2])
            )
            direction.applyQuaternion(offsetQuaternion)
            
            // Calculate target quaternion with offset
            cameraTargetQuaternion.current.setFromUnitVectors(
                new THREE.Vector3(0, 0, 1), // forward direction
                direction
            )
        }

        // When hovered, rotate directly to camera (fast), otherwise slow tracking
        const cameraLerpFactor = hovered ? 0.3 : 0.05
        cameraCurrentQuaternion.current.slerp(cameraTargetQuaternion.current, cameraLerpFactor)
        group.current.quaternion.copy(cameraCurrentQuaternion.current)

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
    })


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
                debugPerf={debug}
                onHoverEnter={() => {
                    setHovered(true)
                    document.body.style.cursor = 'pointer'
                }}
                onHoverLeave={() => {
                    setHovered(false)
                    document.body.style.cursor = 'auto'
                }}
            />
        </group>
    )
}
 