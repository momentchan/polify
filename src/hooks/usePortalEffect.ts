// src/hooks/usePortalEffect.ts

import { MutableRefObject, useRef, useEffect } from "react";
import {
  Group,
  Mesh,
  WebGLRenderTarget,
  HalfFloatType,
  PerspectiveCamera,
  Vector2,
  Vector3,
  Texture,
  LinearFilter,
} from "three";
import { useFrame, useThree } from "@react-three/fiber";
// @ts-ignore
import * as CameraUtils from "three/examples/jsm/utils/CameraUtils.js";

type PortalEffectParams = {
  currentRootRef: MutableRefObject<Group | null>;
  otherRootRef: MutableRefObject<Group | null>;
  portalPlaneRef: MutableRefObject<Mesh | null>;
  onUpdatePortalMap: (texture: Texture) => void;
  resolutionMultiplier?: number; // Quality multiplier (default: 1.5 for better quality)
};

export function usePortalEffect({
  currentRootRef,
  otherRootRef,
  portalPlaneRef,
  onUpdatePortalMap,
  resolutionMultiplier = 1.5, // Higher multiplier = better quality but more performance cost
}: PortalEffectParams) {
  const renderTargetRef = useRef<WebGLRenderTarget | null>(null);
  const otherCameraRef = useRef<PerspectiveCamera | null>(null);
  const sizeRef = useRef(new Vector2());

  const bottomLeftRef = useRef(new Vector3());
  const bottomRightRef = useRef(new Vector3());
  const topLeftRef = useRef(new Vector3());

  const { gl, scene, camera, size } = useThree();

  // Create or update renderTarget with higher resolution
  const createOrUpdateRenderTarget = () => {
    gl.getSize(sizeRef.current);
    const width = Math.floor(sizeRef.current.x * resolutionMultiplier);
    const height = Math.floor(sizeRef.current.y * resolutionMultiplier);

    if (!renderTargetRef.current) {
      // Create new renderTarget with quality settings
      renderTargetRef.current = new WebGLRenderTarget(width, height, {
        type: HalfFloatType,
        minFilter: LinearFilter, // Better quality filtering
        magFilter: LinearFilter,
        generateMipmaps: false, // Disable mipmaps for better performance
        stencilBuffer: false,
        depthBuffer: true, // Enable depth for proper rendering
      });
    } else {
      // Update existing renderTarget size if needed
      if (
        renderTargetRef.current.width !== width ||
        renderTargetRef.current.height !== height
      ) {
        renderTargetRef.current.setSize(width, height);
      }
    }
  };

  // Update renderTarget when size changes
  useEffect(() => {
    createOrUpdateRenderTarget();
  }, [size.width, size.height, resolutionMultiplier]);

  useFrame(() => {
    const currentRoot = currentRootRef.current;
    const otherRoot = otherRootRef.current;
    const portalPlane = portalPlaneRef.current;
    if (!currentRoot || !otherRoot || !portalPlane) return;

    // Ensure renderTarget exists
    if (!renderTargetRef.current) {
      createOrUpdateRenderTarget();
    }

    // Initialize otherCamera
    if (!otherCameraRef.current) {
      const mainCam = camera as PerspectiveCamera;
      otherCameraRef.current = new PerspectiveCamera(
        mainCam.fov ?? 60,
        mainCam.aspect,
        mainCam.near,
        mainCam.far
      );
    }

    const rt = renderTargetRef.current;
    const otherCam = otherCameraRef.current;
    if (!rt || !otherCam) return;

    // 1) Sync otherCam transform
    const mainCam = camera as PerspectiveCamera;
    otherCam.position.copy(mainCam.position);
    otherCam.quaternion.copy(mainCam.quaternion);
    otherCam.updateMatrixWorld();

    // 2) Get portal's three corners (world coordinates)
    const bottomLeft = bottomLeftRef.current;
    const bottomRight = bottomRightRef.current;
    const topLeft = topLeftRef.current;

    const geom = portalPlane.geometry;
    if (!geom.boundingBox) geom.computeBoundingBox();
    const { min, max } = geom.boundingBox!;

    portalPlane.localToWorld(bottomLeft.set(min.x, min.y, 0));
    portalPlane.localToWorld(bottomRight.set(max.x, min.y, 0));
    portalPlane.localToWorld(topLeft.set(min.x, max.y, 0));

    // 3) Use frameCorners to adjust otherCam's frustum
    // @ts-ignore
    CameraUtils.frameCorners(otherCam, bottomLeft, bottomRight, topLeft, false);

    // 4) Render otherWorld to RT
    const prevRT = gl.getRenderTarget();
    const prevCurrentVisible = currentRoot.visible;
    const prevOtherVisible = otherRoot.visible;

    currentRoot.visible = false;
    otherRoot.visible = true;

    gl.setRenderTarget(rt);
    gl.clear();
    gl.render(scene, otherCam);

    gl.setRenderTarget(prevRT);
    currentRoot.visible = prevCurrentVisible;
    otherRoot.visible = prevOtherVisible;

    // 5) Pass texture back, let outside update material
    onUpdatePortalMap(rt.texture);
  });
}

