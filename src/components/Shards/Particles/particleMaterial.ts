import * as THREE from 'three'
import CSM from 'three-custom-shader-material/vanilla'

import { INSTANCED_VERTEX_SHADER, INSTANCED_FRAGMENT_SHADER } from './instancedShaders'
import { cloneParticleMaterialUniforms, type ParticleMaterialUniforms } from '../utils'

let sharedMaterial: CSM<typeof THREE.MeshPhysicalMaterial> | null = null

export function getSharedParticleMaterial(initialUniforms: ParticleMaterialUniforms): CSM<typeof THREE.MeshPhysicalMaterial> {
  if (sharedMaterial) return sharedMaterial

  const uniformsSnapshot = cloneParticleMaterialUniforms(initialUniforms)

  sharedMaterial = new CSM<typeof THREE.MeshPhysicalMaterial>({
    baseMaterial: THREE.MeshPhysicalMaterial,
    vertexShader: INSTANCED_VERTEX_SHADER,
    fragmentShader: INSTANCED_FRAGMENT_SHADER,
    uniforms: uniformsSnapshot,
    silent: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  return sharedMaterial
}

// Keep old function name for backward compatibility
export function createParticleMaterial(initialUniforms: ParticleMaterialUniforms): CSM<typeof THREE.MeshPhysicalMaterial> {
  return getSharedParticleMaterial(initialUniforms)
}

