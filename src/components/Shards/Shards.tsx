import { useMemo } from "react";
import Shard from "./Shard";
import type { ShardDefinition } from "./types";
import { createShardInstances } from "./generator";
import type { SharedAnimationValue } from "./hooks";

export const SHARD_DATABASE: ShardDefinition[] = [
    { image: "textures/img1.avif", shape: "textures/shape1.svg" },
    { image: "textures/img2.avif", shape: "textures/shape2.svg" },
    { image: "textures/img3.avif", shape: "textures/shape3.svg" },
    { image: "textures/img4.avif", shape: "textures/shape4.svg" },
    { image: "textures/img5.avif", shape: "textures/shape1.svg" },
];

interface ShardsProps {
    animValueRef?: React.RefObject<SharedAnimationValue>;
}

export default function Shards({ animValueRef }: ShardsProps) {
    const shards = useMemo(() => createShardInstances(SHARD_DATABASE), []);

    return (
        <>
            {shards.map((shard) => (
                <Shard
                    key={shard.id}
                    shard={shard}
                    debug={false}
                    animValueRef={animValueRef}
                />
            ))}
        </>
    );
}