import { useMemo } from "react";
import Shard from "./Shard";

function generatePositions(count: number, minDistance: number = 2.0, bounds: number = 10): [number, number, number][] {
    const positions: [number, number, number][] = []
    const maxAttempts = 100
    
    for (let i = 0; i < count; i++) {
        let attempts = 0
        let position: [number, number, number]
        let valid = false
        
        while (!valid && attempts < maxAttempts) {
            position = [
                (Math.random() - 0.5) * bounds * 2,
                (Math.random() - 0.5) * bounds * 2,
                (Math.random() - 0.5) * bounds * 2
            ]
            
            // Check distance from all existing positions
            valid = positions.every(existing => {
                const dx = position[0] - existing[0]
                const dy = position[1] - existing[1]
                const dz = position[2] - existing[2]
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
                return distance >= minDistance
            })
            
            attempts++
        }
        
        if (valid) {
            positions.push(position!)
        } else {
            // Fallback: use position anyway if couldn't find valid one
            positions.push([
                (Math.random() - 0.5) * bounds * 2,
                (Math.random() - 0.5) * bounds * 2,
                (Math.random() - 0.5) * bounds * 2
            ])
        }
    }
    
    return positions
}

export default function Shards() {
    const positions = useMemo(() => generatePositions(10, 2.5, 8), [])

    const shards = useMemo(() => [
        { textureUrl: "textures/img1.avif", cameraOffset: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0] as [number, number, number] },
        { textureUrl: "textures/img2.avif", cameraOffset: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0] as [number, number, number] },
        { textureUrl: "textures/img3.avif", cameraOffset: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0] as [number, number, number] },
        { textureUrl: "textures/img4.avif", cameraOffset: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0] as [number, number, number] },
        { textureUrl: "textures/img5.avif", cameraOffset: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0] as [number, number, number] },
        { textureUrl: "textures/img6.avif", cameraOffset: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0] as [number, number, number] },
        { textureUrl: "textures/img7.avif", cameraOffset: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0] as [number, number, number] },
        { textureUrl: "textures/img8.avif", cameraOffset: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0] as [number, number, number] },
        { textureUrl: "textures/img9.avif", cameraOffset: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0] as [number, number, number] },
        { textureUrl: "textures/img10.avif", cameraOffset: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0] as [number, number, number] },
    ], [])

    return (
        <>
            {shards.map((shard, index) => (
                <Shard 
                    key={index} 
                    textureUrl={shard.textureUrl} 
                    position={positions[index]} 
                    cameraOffset={shard.cameraOffset}
                    debug={false} 
                />
            ))}
        </>
    )
}