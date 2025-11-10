import * as THREE from 'three'
import CSM from 'three-custom-shader-material/vanilla'

import { INSTANCED_VERTEX_SHADER, INSTANCED_FRAGMENT_SHADER } from './instancedShaders'
import { type ParticleMaterialUniforms } from '../utils'

export function createParticleMaterial(initialUniforms: ParticleMaterialUniforms): CSM<typeof THREE.MeshPhysicalMaterial> {
  // Clone uniforms to avoid sharing references between instances
  const uniformsSnapshot = THREE.UniformsUtils.clone(initialUniforms) as ParticleMaterialUniforms

  return new CSM<typeof THREE.MeshPhysicalMaterial>({
    baseMaterial: THREE.MeshPhysicalMaterial,
    vertexShader: INSTANCED_VERTEX_SHADER,
    fragmentShader: INSTANCED_FRAGMENT_SHADER,
    uniforms: uniformsSnapshot,
    silent: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

