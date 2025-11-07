// dependencies: @react-three/fiber, @react-three/drei
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { ShardMirror } from './ShardMirror'
import { useRef } from 'react'
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { ImagePlane } from './ImagePlane'
import type { ShardInstance } from './types'

type ShardProps = ThreeElements['group'] & {
    shard: ShardInstance,
    debug?: boolean
}

export default function Shard({ shard, debug = false, ...groupProps }: ShardProps) {
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

    const {
        position = defaultPosition,
        scale = defaultScale,
        ...restGroupProps
    } = groupProps

    useFrame(({ camera }) => {
        if (!group.current) return

        // 1. Camera-facing rotation (slow) - applied to whole group
        const direction = new THREE.Vector3()
        direction.subVectors(camera.position, group.current.position).normalize()

        // Apply camera offset rotation
        const offsetQuaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(cameraOffset[0], cameraOffset[1], cameraOffset[2])
        )
        direction.applyQuaternion(offsetQuaternion)

        cameraTargetQuaternion.current.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), // forward direction
            direction
        )

        const cameraLerpFactor = 0.05 // slow for camera tracking
        cameraCurrentQuaternion.current.slerp(cameraTargetQuaternion.current, cameraLerpFactor)
        group.current.quaternion.copy(cameraCurrentQuaternion.current)

        // 2. Mouse offset rotation (smooth) - applied only to ShardMirrorWorld
        if (shardMirrorRef.current) {
            const offsetAmount = 0.5 // adjust offset strength
            const offsetRotation = new THREE.Euler(
                pointer.y * offsetAmount, // pitch offset
                pointer.x * offsetAmount, // yaw offset
                0
            )
            mouseTargetQuaternion.current.setFromEuler(offsetRotation)
            
            // Smooth interpolation toward target mouse rotation
            const mouseLerpFactor = 0.2 // adjust smoothing speed (higher = faster response)
            mouseCurrentQuaternion.current.slerp(mouseTargetQuaternion.current, mouseLerpFactor)
            shardMirrorRef.current.quaternion.copy(mouseCurrentQuaternion.current)
        }
    })


    return (
        <group ref={group} position={position} scale={scale} {...restGroupProps}>
            <ImagePlane ref={planeA} map={map} position={[0, 0, 3]} rotation={[0, 0, 0]} scale={[7, 7, 1]} debug={debug} />
            <ShardMirror ref={shardMirrorRef} planeRef={planeA} map={map} shapePath={shape} baseRotationZ={baseRotationZ} position={[0, 0, 0]} />
        </group>
    )
}
 