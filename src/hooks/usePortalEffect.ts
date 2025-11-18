// src/hooks/usePortalEffect.ts

import { MutableRefObject, useRef } from "react";
import {
  Group,
  Mesh,
  WebGLRenderTarget,
  HalfFloatType,
  PerspectiveCamera,
  Vector2,
  Vector3,
  Texture,
} from "three";
import { useFrame, useThree } from "@react-three/fiber";
// @ts-ignore
import * as CameraUtils from "three/examples/jsm/utils/CameraUtils.js";

type PortalEffectParams = {
  currentRootRef: MutableRefObject<Group | null>;
  otherRootRef: MutableRefObject<Group | null>;
  portalPlaneRef: MutableRefObject<Mesh | null>;
  onUpdatePortalMap: (texture: Texture) => void;
};

export function usePortalEffect({
  currentRootRef,
  otherRootRef,
  portalPlaneRef,
  onUpdatePortalMap,
}: PortalEffectParams) {
  const renderTargetRef = useRef<WebGLRenderTarget | null>(null);
  const otherCameraRef = useRef<PerspectiveCamera | null>(null);

  const bottomLeftRef = useRef(new Vector3());
  const bottomRightRef = useRef(new Vector3());
  const topLeftRef = useRef(new Vector3());

  const { gl, scene, camera } = useThree();

  useFrame(() => {
    const currentRoot = currentRootRef.current;
    const otherRoot = otherRootRef.current;
    const portalPlane = portalPlaneRef.current;
    if (!currentRoot || !otherRoot || !portalPlane) return;

    // Initialize renderTarget
    if (!renderTargetRef.current) {
      const rtSize = gl.getSize(new Vector2());
      renderTargetRef.current = new WebGLRenderTarget(rtSize.x, rtSize.y, {
        type: HalfFloatType,
      });
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

