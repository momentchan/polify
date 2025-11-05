// dependencies: @react-three/fiber, @react-three/drei
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { ShardMirrorWorld } from './ShardMirrorWorld'
import { useRef } from 'react'
import { ImagePlaneHelper } from './ImagePlaneHelper'
import { useFrame } from '@react-three/fiber'

interface ShardProps {
    textureUrl?: string
    position?: [number, number, number]
    rotation?: [number, number, number]
    scale?: number
}

export default function Shard({
}: ShardProps) {

    const map = useTexture('textures/favicon.png')
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping
    map.anisotropy = 8

    const planeA = useRef<THREE.Group>(null)

    // useFrame(({ clock }) => {
    //     if (planeA.current) {
    //         const time = clock.getElapsedTime()
    //         const radius = 2.0
    //         planeA.current.position.x = Math.cos(time) * radius
    //         planeA.current.position.y = Math.sin(time) * radius
    //         // Keep Z position unchanged for XY plane circle
    //     }
    // })

    return (
        <>
            {/* World-anchored image plane A (oriented toward +Z by default) */}
            <ImagePlaneHelper ref={planeA} map={map} position={[0, 1.2, -1]} rotation={[0, 0, 0]} scale={[5, 5, 1]} />

            {/* Shard that reflects plane A, only inside its silhouette */}
            <ShardMirrorWorld planeRef={planeA} map={map} position={[0, 0, 0]} scale={[2, 2, 1]}/>

            {/* Add more shards; each can reference planeA or another planeRef with its own texture */}
        </>
    )
}
