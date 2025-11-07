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
  scratchBlend: number
): MaterialUniforms {
  return {
    uCamPos: { value: new THREE.Vector3() },
    uCenter: { value: new THREE.Vector3() },
    uU: { value: new THREE.Vector3(1, 0, 0) },
    uV: { value: new THREE.Vector3(0, 1, 0) },
    uN: { value: new THREE.Vector3(0, 0, 1) },
    uSize: { value: new THREE.Vector2(2, 2) },
    uMap: { value: map },
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
  target.uScratchTex.value = source.uScratchTex.value

  target.uFresnelPower.value = source.uFresnelPower.value
  target.uFresnelIntensity.value = source.uFresnelIntensity.value
  target.uFresnelColor.value.copy(source.uFresnelColor.value)

  target.uScratchBlend.value = source.uScratchBlend.value
}
