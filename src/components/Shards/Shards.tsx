import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import Shard from "./Shard";
import type { ShardDefinition } from "./types";
import { createShardInstances } from "./generator";

export const SHARD_DATABASE: ShardDefinition[] = [
    { image: "textures/img1.avif", shape: "textures/shape1.svg" },
    { image: "textures/img2.avif", shape: "textures/shape2.svg" },
    { image: "textures/img3.avif", shape: "textures/shape3.svg" },
    { image: "textures/img4.avif", shape: "textures/shape4.svg" },
    { image: "textures/img5.avif", shape: "textures/shape1.svg" },
    { image: "textures/img6.avif", shape: "textures/shape2.svg" },
    { image: "textures/img7.avif", shape: "textures/shape3.svg" },
    { image: "textures/img8.avif", shape: "textures/shape4.svg" },
    { image: "textures/img9.avif", shape: "textures/shape1.svg" },
    { image: "textures/img10.avif", shape: "textures/shape2.svg" },
];

export default function Shards() {
    const { size } = useThree();
    const aspectRatio = size.width / size.height;
    
    const shards = useMemo(() => 
        createShardInstances(SHARD_DATABASE, { aspectRatio }), 
        [aspectRatio]
    );
    
    return (
        <>
            {shards.map((shard) => (
                <Shard
                    key={shard.id}
                    shard={shard}
                    debug={false}
                />
            ))}
        </>
    );
}