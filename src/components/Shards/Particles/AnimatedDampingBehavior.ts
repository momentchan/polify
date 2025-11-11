import { ParticleBehavior } from "@packages/particle-system";

export class AnimatedDampingBehavior extends ParticleBehavior {
    public dampingUniform: { value: number };
    public noiseStrengthUniform: { value: number };
    public noiseScaleUniform: { value: number };
    public animationValueUniform: { value: number };
    public distance1Uniform: { value: number };
    public distance2Uniform: { value: number };
    public distance3Uniform: { value: number };
    public timeScale1Uniform: { value: number };
    public timeScale2Uniform: { value: number };
    public timeScale3Uniform: { value: number };
    public rotationMultiplierUniform: { value: number };
    public distanceRandomizationUniform: { value: number };

    constructor(initialDamping: number = 1.0, noiseStrength: number = 0.1, noiseScale: number = 2.0) {
        super();
        this.dampingUniform = { value: initialDamping };
        this.noiseStrengthUniform = { value: noiseStrength };
        this.noiseScaleUniform = { value: noiseScale };
        this.animationValueUniform = { value: 0.0 };
        this.distance1Uniform = { value: 4.0 };
        this.distance2Uniform = { value: 6.0 };
        this.distance3Uniform = { value: 8.0 };
        this.timeScale1Uniform = { value: 1.0 };
        this.timeScale2Uniform = { value: 0.01 };
        this.timeScale3Uniform = { value: 0.001 };
        this.rotationMultiplierUniform = { value: 20.0 };
        this.distanceRandomizationUniform = { value: 0.5 };
    }

    getName(): string {
        return 'AnimatedDamping';
    }

    getPositionUniforms(): Record<string, any> {
        return {
            distance1: this.distance1Uniform,
            distance2: this.distance2Uniform,
            distance3: this.distance3Uniform,
            timeScale1: this.timeScale1Uniform,
            timeScale2: this.timeScale2Uniform,
            timeScale3: this.timeScale3Uniform,
            distanceRandomization: this.distanceRandomizationUniform
        };
    }

    getVelocityUniforms(): Record<string, any> {
        return {
            damping: this.dampingUniform,
            noiseStrength: this.noiseStrengthUniform,
            noiseScale: this.noiseScaleUniform,
            animationValue: this.animationValueUniform,
            distance1: this.distance1Uniform,
            distance2: this.distance2Uniform,
            distance3: this.distance3Uniform,
            timeScale1: this.timeScale1Uniform,
            timeScale2: this.timeScale2Uniform,
            timeScale3: this.timeScale3Uniform,
            rotationMultiplier: this.rotationMultiplierUniform,
            distanceRandomization: this.distanceRandomizationUniform
        };
    }

    protected getPositionUpdateLogic(): string {
        return /*glsl*/ `
            // Generate random seed for this particle from UV coordinates
            // This gives each particle a unique, consistent seed value
            float particleSeed = fract(sin(dot(uv, vec2(12.9898, 78.233)) + dot(uv.yx, vec2(43.5432, 21.1234))) * 43758.5453);
            
            // Calculate distance from center with randomization
            float baseDistance = length(pos.xyz);
            // Add random offset to distance based on particle seed
            // distanceRandomization controls the amount of variation (0 = no variation, 1 = full variation)
            float distanceOffset = (particleSeed - 0.5) * distanceRandomization;
            float d = baseDistance + distanceOffset;
            
            // Four zones with smooth transitions using smoothstep:
            // d < d1: timeScale1, d1 < d < d2: transition 1, d2 < d < d3: transition 2, d > d3: timeScale3
            float t1 = smoothstep(distance1, distance2, d); // Transition factor for zone 1->2
            float t2 = smoothstep(distance2, distance3, d); // Transition factor for zone 2->3
            
            // Blend time scales: first blend 1->2, then blend 2->3, then combine based on which zone we're in
            float timeScale12 = mix(timeScale1, timeScale2, t1);
            float timeScale23 = mix(timeScale2, timeScale3, t2);
            float distanceTimeScale = mix(timeScale12, timeScale23, step(distance2, d));
            
            float scaledDelta = delta * distanceTimeScale;
            pos.xyz += vel.xyz * scaledDelta;
        `;
    }

    protected getVelocityUpdateLogic(): string {
        return /*glsl*/ `
            // Generate random seed for this particle from UV coordinates
            // This gives each particle a unique, consistent seed value
            float particleSeed = fract(sin(dot(uv, vec2(12.9898, 78.233)) + dot(uv.yx, vec2(43.5432, 21.1234))) * 43758.5453);
            
            // Calculate distance from center with randomization for rotation slow motion
            float baseDistance = length(pos.xyz);
            // Add random offset to distance based on particle seed
            float distanceOffset = (particleSeed - 0.5) * distanceRandomization;
            float d = baseDistance + distanceOffset;
            
            // Apply same distance-based time scaling as position
            float t1 = smoothstep(distance1, distance2, d);
            float t2 = smoothstep(distance2, distance3, d);
            float timeScale12 = mix(timeScale1, timeScale2, t1);
            float timeScale23 = mix(timeScale2, timeScale3, t2);
            float distanceTimeScale = max(mix(timeScale12, timeScale23, step(distance2, d)), 0.05);
            
            float scaledDelta = delta * distanceTimeScale * rotationMultiplier;
            vel.w += scaledDelta;
        `;
    }
}

