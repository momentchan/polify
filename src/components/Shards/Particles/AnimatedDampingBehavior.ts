import { ParticleBehavior } from "@packages/particle-system";

export class AnimatedDampingBehavior extends ParticleBehavior {
    public dampingUniform: { value: number };
    public noiseStrengthUniform: { value: number };
    public noiseScaleUniform: { value: number };
    public animationValueUniform: { value: number };

    constructor(initialDamping: number = 1.0, noiseStrength: number = 0.1, noiseScale: number = 2.0) {
        super();
        this.dampingUniform = { value: initialDamping };
        this.noiseStrengthUniform = { value: noiseStrength };
        this.noiseScaleUniform = { value: noiseScale };
        this.animationValueUniform = { value: 0.0 };
    }

    getName(): string {
        return 'AnimatedDamping';
    }

    getVelocityUniforms(): Record<string, any> {
        return {
            damping: this.dampingUniform,
            noiseStrength: this.noiseStrengthUniform,
            noiseScale: this.noiseScaleUniform,
            animationValue: this.animationValueUniform
        };
    }

    protected getVelocityUpdateLogic(): string {
        return /*glsl*/ `
            // Apply damping to slow down particles
            vel.xyz *= damping;
            
            // Calculate rotation speed multiplier based on animation value
            // animationValue goes from 0 to 1, we map it to rotation speed multiplier
            float rotationSpeedMultiplier = mix(20.0, 1., smoothstep(0.0, 0.6, animationValue));
            
            // Update rotation accumulator in velocity.w component
            // vel.w stores accumulated rotation multiplier
            // We add delta * rotationSpeedMultiplier each frame
            vel.w += delta * rotationSpeedMultiplier;
        `;
    }
}

