import { ParticleBehavior } from "@packages/particle-system";

export class AnimatedDampingBehavior extends ParticleBehavior {
    public dampingUniform: { value: number };
    public noiseStrengthUniform: { value: number };
    public noiseScaleUniform: { value: number };
    public animationValueUniform: { value: number };
    public timeScaleUniform: { value: number };

    constructor(initialDamping: number = 1.0, noiseStrength: number = 0.1, noiseScale: number = 2.0) {
        super();
        this.dampingUniform = { value: initialDamping };
        this.noiseStrengthUniform = { value: noiseStrength };
        this.noiseScaleUniform = { value: noiseScale };
        this.animationValueUniform = { value: 0.0 };
        this.timeScaleUniform = { value: 1.0 };
    }

    getName(): string {
        return 'AnimatedDamping';
    }

    getPositionUniforms(): Record<string, any> {
        return {
            timeScale: this.timeScaleUniform
        };
    }

    getVelocityUniforms(): Record<string, any> {
        return {
            damping: this.dampingUniform,
            noiseStrength: this.noiseStrengthUniform,
            noiseScale: this.noiseScaleUniform,
            animationValue: this.animationValueUniform,
            timeScale: this.timeScaleUniform
        };
    }

    protected getPositionUpdateLogic(): string {
        return /*glsl*/ `
            float scaledDelta = delta * timeScale;
            pos.xyz += vel.xyz * scaledDelta;
        `;
    }

    protected getVelocityUpdateLogic(): string {
        return /*glsl*/ `
            // No damping applied - particles maintain their velocity
            // Slow motion is achieved purely through delta scaling (time dilation)
            // Velocity remains unchanged, only time slows down
            
            // Calculate rotation speed multiplier based on animation value
            // animationValue goes from 0 to 1, we map it to rotation speed multiplier
            float rotationSpeedMultiplier = mix(20.0, 1., smoothstep(0.0, 0.5, animationValue));
            
            // Update rotation accumulator in velocity.w component
            // vel.w stores accumulated rotation multiplier
            // Scale delta by timeScale for rotation as well
            float scaledDelta = delta;
            vel.w += scaledDelta * rotationSpeedMultiplier;
        `;
    }
}

