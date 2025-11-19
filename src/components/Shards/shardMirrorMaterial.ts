import * as THREE from 'three'
import CSM from 'three-custom-shader-material/vanilla'

import { shardMirrorVertexShader, shardMirrorFragmentShader } from './shardMirrorShaders'
import { cloneMaterialUniforms, type MaterialUniforms } from './utils'

let sharedMaterial: CSM<typeof THREE.MeshPhysicalMaterial> | null = null

export function getSharedShardMirrorMaterial(initialUniforms: MaterialUniforms): CSM<typeof THREE.MeshPhysicalMaterial> {
  if (sharedMaterial) return sharedMaterial

  const uniformsSnapshot = cloneMaterialUniforms(initialUniforms)

  sharedMaterial = new CSM<typeof THREE.MeshPhysicalMaterial>({
    baseMaterial: THREE.MeshPhysicalMaterial,
    vertexShader: shardMirrorVertexShader,
    fragmentShader: shardMirrorFragmentShader,
    uniforms: uniformsSnapshot,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  })

  return sharedMaterial
}

