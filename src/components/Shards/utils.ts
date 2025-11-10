import * as THREE from 'three'
export type ExtrudeSettings = {
  depth: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
}

export type FresnelConfig = {
  enabled: boolean;
  power: number;
  intensity: number;
  color: string;
}

export type MaterialUniforms = Record<string, { value: unknown }> & {
  uCamPos: { value: THREE.Vector3 };
  uCenter: { value: THREE.Vector3 };
  uU: { value: THREE.Vector3 };
  uV: { value: THREE.Vector3 };
  uN: { value: THREE.Vector3 };
  uSize: { value: THREE.Vector2 };
  uMap: { value: THREE.Texture };
  uBlurAmount: { value: number };
  uMappingScale: { value: number };
  uFresnelPower: { value: number };
  uFresnelIntensity: { value: number };
  uFresnelColor: { value: THREE.Color };
  uScratchTex: { value: THREE.Texture };
  uScratchBlend: { value: number };
}

export function createExtrudeSettings(settings: ExtrudeSettings): ExtrudeSettings {
  return { ...settings }
}

type SVGPath = {
  toShapes: (isCCW: boolean) => THREE.Shape[]
}

export function createShardGeometry(paths: SVGPath[], settings: ExtrudeSettings): THREE.BufferGeometry {
  if (!paths?.length) return new THREE.BoxGeometry(1, 1, 0.05)

  const shapes = paths.flatMap(path => path.toShapes(true))
  if (!shapes.length) return new THREE.BoxGeometry(1, 1, 0.05)

  const extractedShape = shapes[0]
  const points: THREE.Vector2[] = extractedShape.getPoints(12)
  if (!points.length) return new THREE.BoxGeometry(1, 1, 0.05)

  const bbox = new THREE.Box2()
  points.forEach((point: THREE.Vector2) => bbox.expandByPoint(new THREE.Vector2(point.x, point.y)))

  const center = bbox.getCenter(new THREE.Vector2())
  const size = bbox.getSize(new THREE.Vector2())
  const scale = 1 / Math.max(size.x, size.y)

  const scaledPoints = points.map((point: THREE.Vector2) =>
    new THREE.Vector2(
      (point.x - center.x) * scale,
      -(point.y - center.y) * scale
    )
  )
  const transformedShape = new THREE.Shape(scaledPoints)

  const geometry = new THREE.ExtrudeGeometry(transformedShape, settings)

  const positions = geometry.attributes.position
  const uvs = new Float32Array(positions.count * 2)

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    uvs[i * 2] = (x + 0.5)
    uvs[i * 2 + 1] = (y + 0.5)
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

  return geometry
}

export function createInitialUniforms(
  map: THREE.Texture,
  scratchTex: THREE.Texture,
  fresnel: FresnelConfig,
  scratchBlend: number,
  blurAmount: number = 0.0,
  mappingScale: number = 1.0
): MaterialUniforms {
  return {
    uCamPos: { value: new THREE.Vector3() },
    uCenter: { value: new THREE.Vector3() },
    uU: { value: new THREE.Vector3(1, 0, 0) },
    uV: { value: new THREE.Vector3(0, 1, 0) },
    uN: { value: new THREE.Vector3(0, 0, 1) },
    uSize: { value: new THREE.Vector2(2, 2) },
    uMap: { value: map },
    uBlurAmount: { value: blurAmount },
    uMappingScale: { value: mappingScale },
    uFresnelPower: { value: fresnel.power },
    uFresnelIntensity: { value: fresnel.enabled ? fresnel.intensity : 0.0 },
    uFresnelColor: { value: new THREE.Color(fresnel.color) },
    uScratchTex: { value: scratchTex },
    uScratchBlend: { value: scratchBlend },
  }
}

export function cloneMaterialUniforms(uniforms: MaterialUniforms): MaterialUniforms {
  return THREE.UniformsUtils.clone(uniforms) as MaterialUniforms
}

export function cloneParticleMaterialUniforms(uniforms: ParticleMaterialUniforms): ParticleMaterialUniforms {
  return THREE.UniformsUtils.clone(uniforms) as ParticleMaterialUniforms
}

export function updateFresnelUniforms(
  uniforms: MaterialUniforms,
  fresnel: FresnelConfig
): void {
  uniforms.uFresnelPower.value = fresnel.power
  uniforms.uFresnelIntensity.value = fresnel.enabled ? fresnel.intensity : 0.0
  uniforms.uFresnelColor.value.set(fresnel.color)
}

export function copyUniformValues(target: MaterialUniforms, source: MaterialUniforms): void {
  target.uCamPos.value.copy(source.uCamPos.value)
  target.uCenter.value.copy(source.uCenter.value)
  target.uU.value.copy(source.uU.value)
  target.uV.value.copy(source.uV.value)
  target.uN.value.copy(source.uN.value)
  target.uSize.value.copy(source.uSize.value)

  target.uMap.value = source.uMap.value
  target.uBlurAmount.value = source.uBlurAmount.value
  target.uMappingScale.value = source.uMappingScale.value
  target.uScratchTex.value = source.uScratchTex.value

  target.uFresnelPower.value = source.uFresnelPower.value
  target.uFresnelIntensity.value = source.uFresnelIntensity.value
  target.uFresnelColor.value.copy(source.uFresnelColor.value)

  target.uScratchBlend.value = source.uScratchBlend.value
}

// Particle-specific uniform types
export type ParticleMaterialUniforms = Record<string, { value: unknown }> & {
  // Particle system uniforms
  positionTex: { value: THREE.Texture | null };
  velocityTex: { value: THREE.Texture | null };
  time: { value: number };
  delta: { value: number };
  sizeMultiplier: { value: number };
  instanceCount: { value: number };
  animationValue: { value: number };
  sizeVariation: { value: number };
  // Shared material uniforms
  uCamPos: { value: THREE.Vector3 };
  uFresnelPower: { value: number };
  uFresnelIntensity: { value: number };
  uFresnelColor: { value: THREE.Color };
  uScratchTex: { value: THREE.Texture };
  uScratchBlend: { value: number };
}

export function createParticleUniforms(
  scratchTex: THREE.Texture,
  fresnel: FresnelConfig,
  scratchBlend: number,
  instanceCount: number
): ParticleMaterialUniforms {
  return {
    // Particle system uniforms
    positionTex: { value: null },
    velocityTex: { value: null },
    time: { value: 0.0 },
    delta: { value: 0.0 },
    sizeMultiplier: { value: 0.3 },
    opacity: { value: 0.8 },
    instanceCount: { value: instanceCount },
    animationValue: { value: 0 },
    sizeVariation: { value: 0.5 },
    // Shared material uniforms
    uCamPos: { value: new THREE.Vector3() },
    uFresnelPower: { value: fresnel.power },
    uFresnelIntensity: { value: fresnel.enabled ? fresnel.intensity : 0.0 },
    uFresnelColor: { value: new THREE.Color(fresnel.color) },
    uScratchTex: { value: scratchTex },
    uScratchBlend: { value: scratchBlend },
  }
}

export function updateParticleFresnelUniforms(
  uniforms: ParticleMaterialUniforms,
  fresnel: FresnelConfig
): void {
  uniforms.uFresnelPower.value = fresnel.power
  uniforms.uFresnelIntensity.value = fresnel.enabled ? fresnel.intensity : 0.0
  uniforms.uFresnelColor.value.set(fresnel.color)
}

export function copyParticleUniformValues(target: ParticleMaterialUniforms, source: ParticleMaterialUniforms): void {
  // Particle system uniforms (per-instance)
  if (source.positionTex && target.positionTex) target.positionTex.value = source.positionTex.value
  if (source.velocityTex && target.velocityTex) target.velocityTex.value = source.velocityTex.value
  if (source.time && target.time) target.time.value = source.time.value
  if (source.delta && target.delta) target.delta.value = source.delta.value
  if (source.sizeMultiplier && target.sizeMultiplier) target.sizeMultiplier.value = source.sizeMultiplier.value
  if (source.opacity && target.opacity) target.opacity.value = source.opacity.value
  if (source.instanceCount && target.instanceCount) target.instanceCount.value = source.instanceCount.value
  if (source.animationValue && target.animationValue) target.animationValue.value = source.animationValue.value
  if (source.sizeVariation && target.sizeVariation) target.sizeVariation.value = source.sizeVariation.value
  
  // Shared material uniforms
  if (source.uCamPos && target.uCamPos) target.uCamPos.value.copy(source.uCamPos.value)
  if (source.uFresnelPower && target.uFresnelPower) target.uFresnelPower.value = source.uFresnelPower.value
  if (source.uFresnelIntensity && target.uFresnelIntensity) target.uFresnelIntensity.value = source.uFresnelIntensity.value
  if (source.uFresnelColor && target.uFresnelColor) target.uFresnelColor.value.copy(source.uFresnelColor.value)
  if (source.uScratchTex && target.uScratchTex) target.uScratchTex.value = source.uScratchTex.value
  if (source.uScratchBlend && target.uScratchBlend) target.uScratchBlend.value = source.uScratchBlend.value
}
