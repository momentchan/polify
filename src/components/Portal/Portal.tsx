import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { PortalCorners } from './types';
import { vertexShader, fragmentShader } from './shaders';

interface PortalProps {
  plane: THREE.Object3D;
  onCornersUpdate?: (corners: PortalCorners) => void;
}

export function Portal({ plane, onCornersUpdate }: PortalProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Create render target for portal texture
  const renderTarget = useFBO(2048, 2048, {
    type: THREE.HalfFloatType
  });

  // Create corners for camera framing
  const corners = useMemo<PortalCorners>(() => ({
    bottomLeft: new THREE.Vector3(),
    bottomRight: new THREE.Vector3(),
    topLeft: new THREE.Vector3()
  }), []);

  // Initialize uniforms - only map is needed
  const uniforms = useMemo(() => ({
    map: { value: renderTarget.texture }
  }), [renderTarget.texture]);

  // Update material when plane is available
  useEffect(() => {
    if (plane && materialRef.current) {
      // Get the mesh from the plane object
      const mesh = plane as THREE.Mesh;
      if (mesh && mesh.isMesh) {
        mesh.material = materialRef.current;
        mesh.material.needsUpdate = true;
      }
    }
  }, [plane, materialRef.current]);

  // Update corners each frame
  useFrame(() => {
    if (plane && plane instanceof THREE.Mesh && plane.geometry) {
      const geometry = plane.geometry;
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }
      
      if (geometry.boundingBox) {
        const { min, max } = geometry.boundingBox;
        plane.localToWorld(corners.bottomLeft.set(min.x, min.y, 0));
        plane.localToWorld(corners.bottomRight.set(max.x, min.y, 0));
        plane.localToWorld(corners.topLeft.set(min.x, max.y, 0));
        
        if (onCornersUpdate) {
          onCornersUpdate(corners);
        }
      }
    }
  });

  // Expose methods via ref (will be used by World component)
  useEffect(() => {
    if (materialRef.current) {
      (materialRef.current as any).portalRef = {
        renderTarget,
        corners
      };
    }
  }, [renderTarget, corners]);

  return (
    <shaderMaterial
      ref={materialRef}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
    />
  );
}

