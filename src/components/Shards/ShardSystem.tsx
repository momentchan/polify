import { useSharedAnimation } from "./hooks";
import Shards from "./Shards";
import Particles from "./Particles/Particles";

interface ShardSystemProps {
    animationDuration?: number;
    position?: [number, number, number];
}

/**
 * System component that manages shared animation value for Shards and Particles
 */
export default function ShardSystem({ 
    animationDuration = 10,
    position = [0, 0, -6]
}: ShardSystemProps) {
    // Shared animation value synchronized across all components
    const animValueRef = useSharedAnimation(animationDuration);

    return (
        <group position={position}>
            <Shards animValueRef={animValueRef} />
            <Particles shapePath="textures/shape1.svg" count={32} animValueRef={animValueRef} />
            <Particles shapePath="textures/shape2.svg" count={32} animValueRef={animValueRef} />
            <Particles shapePath="textures/shape3.svg" count={32} animValueRef={animValueRef} />
            <Particles shapePath="textures/shape4.svg" count={32} animValueRef={animValueRef} />
            <Particles shapePath="textures/shape5.svg" count={32} animValueRef={animValueRef} />
        </group>
    );
}

