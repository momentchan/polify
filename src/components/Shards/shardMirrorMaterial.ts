import * as THREE from 'three'
import CustomShaderMaterialVanilla from 'three-custom-shader-material/vanilla'
import type { default as CustomShaderMaterialVanillaType } from 'three-custom-shader-material/vanilla'

import { shardMirrorVertexShader, shardMirrorFragmentShader } from './shardMirrorShaders'
import { cloneMaterialUniforms, type MaterialUniforms } from './shardMirrorUtils'

let sharedMaterial: CustomShaderMaterialVanillaType<typeof THREE.MeshPhysicalMaterial> | null = null

export function getSharedShardMirrorMaterial(initialUniforms: MaterialUniforms): CustomShaderMaterialVanillaType<typeof THREE.MeshPhysicalMaterial> {
  if (sharedMaterial) return sharedMaterial

  const uniformsSnapshot = cloneMaterialUniforms(initialUniforms)

  sharedMaterial = new CustomShaderMaterialVanilla<typeof THREE.MeshPhysicalMaterial>({
    baseMaterial: THREE.MeshPhysicalMaterial,
    vertexShader: shardMirrorVertexShader,
    fragmentShader: shardMirrorFragmentShader,
    uniforms: uniformsSnapshot,
    silent: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  return sharedMaterial
}

