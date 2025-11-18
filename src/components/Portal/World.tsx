import React, { useEffect, useRef } from "react";
import { Group, Object3D, Mesh, MeshStandardMaterial, Texture } from "three";
import CSM from "three-custom-shader-material/vanilla";
import * as THREE from "three";
import { PortalMaterialImpl } from "../shaders/portalMaterial";

export type WorldAPI = {
  rootGroup?: Group | null;         // 🔹 新增：世界的根 group
  holder?: Object3D | null;
  portalPlane?: Mesh | null;
  portalWorldStart?: Object3D | null;
  portalWorldEnd?: Object3D | null;
  portalMaterial?: CSM<typeof THREE.MeshPhysicalMaterial> | null;
};

type WorldProps = {
  scene: Object3D;      // gltf.scene
  name: string;
  visible?: boolean;
  onReady?: (api: WorldAPI) => void;
};

const World: React.FC<WorldProps> = ({ scene, name, visible = true, onReady }) => {
  const groupRef = useRef<Group | null>(null);

  useEffect(() => {
    if (!scene) return;

    const node = scene.clone(true);

    if (groupRef.current) {
      groupRef.current.clear();
      groupRef.current.add(node);
      groupRef.current.name = name;
      groupRef.current.visible = visible;
    }

    const holder = node.getObjectByName("holder") || null;
    const portalPlaneObj = node.getObjectByName("portal") as Mesh | null;
    const portalWorldStart = node.getObjectByName("portalWorldStart") || null;
    const portalWorldEnd = node.getObjectByName("portalWorldEnd") || null;

    let portalMaterial: CSM<typeof THREE.MeshPhysicalMaterial> | null = null;

    if (portalPlaneObj) {
      const originalMat = portalPlaneObj.material as MeshStandardMaterial;
      const originalMap = (originalMat?.map ?? null) as Texture | null;

      // PortalMaterialImpl is already an instance, not a constructor
      portalMaterial = PortalMaterialImpl;
      if (originalMap && portalMaterial) {
        const uniforms = portalMaterial.uniforms as any;
        if (uniforms.map) {
          uniforms.map.value = originalMap;
        }
      }

      if (portalMaterial) {
        portalPlaneObj.material = portalMaterial;
      }
    }

    onReady?.({
      rootGroup: groupRef.current ?? undefined,   // 🔹 回傳 rootGroup
      holder,
      portalPlane: portalPlaneObj,
      portalWorldStart,
      portalWorldEnd,
      portalMaterial
    });

    return () => {
      if (groupRef.current) {
        groupRef.current.clear();
      }
    };
  }, [scene, name, visible, onReady]);

  return <group ref={groupRef} />;
};

export default World;
