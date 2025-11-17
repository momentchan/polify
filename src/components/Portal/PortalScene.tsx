import React, { useMemo, useRef, useEffect } from "react";
import {
    Object3D,
    WebGLRenderTarget,
    HalfFloatType,
    PerspectiveCamera,
    Vector2,
    Vector3,
    Raycaster,
} from "three";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import World, { WorldAPI } from "./World";
import { gsap, Power4 } from "gsap";

// @ts-ignore - three 的 CameraUtils 沒有官方 TS 型別
import * as CameraUtils from "three/examples/jsm/utils/CameraUtils.js";

type GLTFAny = any;

const FILES = {
    desert: "https://assets.codepen.io/264161/desert33.glb",
    forest: "https://assets.codepen.io/264161/forest33.glb",
};

const PortalScene: React.FC = () => {
    const forestGltf: GLTFAny = useGLTF(FILES.forest);
    const desertGltf: GLTFAny = useGLTF(FILES.desert);

    const forestScene: Object3D = useMemo(
        () => forestGltf.scene.clone(true),
        [forestGltf]
    );
    const desertScene: Object3D = useMemo(
        () => desertGltf.scene.clone(true),
        [desertGltf]
    );

    const forestApiRef = useRef<WorldAPI | null>(null);
    const desertApiRef = useRef<WorldAPI | null>(null);

    const renderTargetRef = useRef<WebGLRenderTarget | null>(null);
    const otherCameraRef = useRef<PerspectiveCamera | null>(null);
    const controlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
    const { gl, scene, camera, size } = useThree();

    // 哪個是 currentWorld（畫面看到的世界）
    const currentWorldRef = useRef<"forest" | "desert">("forest");

    // hover / transition flag
    const portalHoverRef = useRef(false);
    const isInTransitionRef = useRef(false);

    // portal 的三個 corner
    const bottomLeftRef = useRef(new Vector3());
    const bottomRightRef = useRef(new Vector3());
    const topLeftRef = useRef(new Vector3());

    // Raycaster
    const mouseNDCRef = useRef(new Vector2());
    const raycasterRef = useRef(new Raycaster());

    // Camera target for lookAt during transitions
    const cameraTargetRef = useRef(new Object3D());

    // ====== 事件：hover + click（含 GSAP 相機動畫） ======
    useEffect(() => {
        const dom = gl.domElement;

        function updateHover(clientX: number, clientY: number) {
            const forestApi = forestApiRef.current;
            const desertApi = desertApiRef.current;
            if (!forestApi || !desertApi) return;

            const isForestCurrent = currentWorldRef.current === "forest";
            const currentApi = isForestCurrent ? forestApi : desertApi;
            const portalPlane = currentApi.portalPlane;
            if (!portalPlane) return;

            const ndc = mouseNDCRef.current;
            ndc.x = (clientX / size.width) * 2 - 1;
            ndc.y = -(clientY / size.height) * 2 + 1;

            const raycaster = raycasterRef.current;
            raycaster.setFromCamera(ndc, camera as any);

            const hits = raycaster.intersectObject(portalPlane, true);
            portalHoverRef.current = hits.length > 0;
        }

        function onPointerMove(e: PointerEvent) {
            updateHover(e.clientX, e.clientY);
        }

        function onPointerDown(_e: PointerEvent) {
            if (!portalHoverRef.current || isInTransitionRef.current) return;
          
            const forestApi = forestApiRef.current;
            const desertApi = desertApiRef.current;
            if (!forestApi || !desertApi) return;
          
            const mainCam = camera as PerspectiveCamera;
            const prevWorld = currentWorldRef.current;
            const isForestCurrent = prevWorld === "forest";
            const currentApi = isForestCurrent ? forestApi : desertApi;
            const otherApi = isForestCurrent ? desertApi : forestApi;
          
            const portalPlane = currentApi.portalPlane;
            const portalWorldEnd = currentApi.portalWorldEnd;
            if (!portalPlane || !currentApi.rootGroup || !otherApi.rootGroup || !portalWorldEnd) return;
          
            isInTransitionRef.current = true;
            if (controlsRef.current) controlsRef.current.enabled = false;
          
            const cameraTarget = cameraTargetRef.current;
            const transitionDuration = 1.5;
          
            // ===== Phase 1: move camera towards portal (matching test.js moveCameraToPortal) =====
            const portalNormal = new Vector3();
            portalPlane.getWorldDirection(portalNormal);
            const portalWorldPos = new Vector3();
            portalPlane.getWorldPosition(portalWorldPos);
            const camPos = portalWorldPos.clone().add(portalNormal.multiplyScalar(3));
          
            // Get portalWorldEnd world position
            const portalWorldEndPos = new Vector3();
            portalWorldEnd.getWorldPosition(portalWorldEndPos);
          
            gsap.killTweensOf(mainCam.position);
            gsap.killTweensOf(cameraTarget.position);
          
            // Animate camera target to portalWorldEnd position
            gsap.to(cameraTarget.position, {
              duration: transitionDuration,
              ease: Power4.easeIn,
              x: portalWorldEndPos.x,
              y: portalWorldEndPos.y,
              z: portalWorldEndPos.z
            });
          
            // Animate camera position to portal + 3
            gsap.to(mainCam.position, {
              duration: transitionDuration,
              ease: Power4.easeIn,
              x: camPos.x,
              y: camPos.y,
              z: camPos.z,
              onUpdate: () => {
                mainCam.lookAt(cameraTarget.position);
              },
              onComplete: () => {
                // ===== Phase 2: switch world (matching test.js switchWorlds) =====
                const nextWorld = isForestCurrent ? "desert" : "forest";
                currentWorldRef.current = nextWorld;
          
                const newCurrentApi = nextWorld === "forest" ? forestApi : desertApi;
                const newOtherApi = nextWorld === "forest" ? desertApi : forestApi;
          
                if (newCurrentApi.rootGroup && newOtherApi.rootGroup) {
                  newCurrentApi.rootGroup.visible = true;
                  newOtherApi.rootGroup.visible = false;
                }
          
                // ===== Phase 3: move camera and target back to origin (matching test.js moveWorldAndCameraToOrigin) =====
                // Animate camera target to origin
                gsap.to(cameraTarget.position, {
                  duration: transitionDuration,
                  ease: Power4.easeOut,
                  x: 0,
                  y: 0,
                  z: 0
                });
          
                // Animate camera to (0, 0, 40)
                gsap.to(mainCam.position, {
                  duration: transitionDuration,
                  ease: Power4.easeOut,
                  x: 0,
                  y: 0,
                  z: 40,
                  onUpdate: () => {
                    mainCam.lookAt(cameraTarget.position);
                  },
                  onComplete: () => {
                    isInTransitionRef.current = false;
                    if (controlsRef.current) {
                      controlsRef.current.enabled = true;
                      controlsRef.current.target.set(0, 0, 0);
                      controlsRef.current.update();
                    }
                  },
                });
              },
            });
          }

        dom.addEventListener("pointermove", onPointerMove);
        dom.addEventListener("pointerdown", onPointerDown);

        return () => {
            dom.removeEventListener("pointermove", onPointerMove);
            dom.removeEventListener("pointerdown", onPointerDown);
        };
    }, [gl, camera, size.width, size.height]);

    // ====== 每幀：渲染 otherWorld 到 portal 貼圖 ======
    useFrame(() => {
        const forestApi = forestApiRef.current;
        const desertApi = desertApiRef.current;
        if (!forestApi || !desertApi) return;

        const isForestCurrent = currentWorldRef.current === "forest";
        const currentApi = isForestCurrent ? forestApi : desertApi;
        const otherApi = isForestCurrent ? desertApi : forestApi;

        const currentRoot = currentApi.rootGroup;
        const otherRoot = otherApi.rootGroup;
        const portalMat = currentApi.portalMaterial;
        const portalPlane = currentApi.portalPlane;
        if (!currentRoot || !otherRoot || !portalMat || !portalPlane) return;

        if (!renderTargetRef.current) {
            const rtSize = gl.getSize(new Vector2());
            renderTargetRef.current = new WebGLRenderTarget(rtSize.x, rtSize.y, {
                type: HalfFloatType,
            });
        }

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

        // 同步 otherCam transform
        const mainCam = camera as PerspectiveCamera;
        otherCam.position.copy(mainCam.position);
        otherCam.quaternion.copy(mainCam.quaternion);
        otherCam.updateMatrixWorld();

        // 更新 portal corner
        const bottomLeft = bottomLeftRef.current;
        const bottomRight = bottomRightRef.current;
        const topLeft = topLeftRef.current;

        const geom = portalPlane.geometry;
        if (!geom.boundingBox) {
            geom.computeBoundingBox();
        }
        const { min, max } = geom.boundingBox!;

        portalPlane.localToWorld(bottomLeft.set(min.x, min.y, 0));
        portalPlane.localToWorld(bottomRight.set(max.x, min.y, 0));
        portalPlane.localToWorld(topLeft.set(min.x, max.y, 0));

        // 用 CameraUtils.frameCorners 調整 otherCam 投影
        // @ts-ignore
        CameraUtils.frameCorners(otherCam, bottomLeft, bottomRight, topLeft, false);

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

        if (portalMat.map !== rt.texture) {
            portalMat.map = rt.texture;
            portalMat.needsUpdate = true;
        }
    });

    return (
        <>
            <World
                scene={forestScene}
                name="forest"
                visible={true}
                onReady={(api) => {
                    forestApiRef.current = api;
                    console.log("Forest world ready:", api);
                }}
            />

            <World
                scene={desertScene}
                name="desert"
                visible={false}
                onReady={(api) => {
                    desertApiRef.current = api;
                    console.log("Desert world ready:", api);
                }}
            />
              <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        // 這個要視你需求調
        maxPolarAngle={Math.PI / 2 + 0.1}
      />
        </>
    );
};

export default PortalScene;
