import { RadialVelocityConfig3D } from "@packages/particle-system";

/**
 * Custom velocity config that initializes rotation accumulator in the 4th component
 */
export class CustomRadialVelocityConfig extends RadialVelocityConfig3D {
    generateVelocity(index: number, totalCount: number, size: number): [number, number, number, number] {
        const [vx, vy, vz] = super.generateVelocity(index, totalCount, size);
        // Use 4th component to store initial rotation accumulator (starts at 0)
        return [vx, vy, vz, 0.0];
    }
}

