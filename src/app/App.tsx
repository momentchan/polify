import { AdaptiveDpr, CameraControls } from "@react-three/drei";
import { LevaWrapper } from "@packages/r3f-gist/components";
import { Canvas } from "@react-three/fiber";
import Scene from "../components/Scene";
import PortalScene from "../components/Portal/PortalScene";
import * as THREE from 'three';
import Effects from "../components/Effects";

export default function App() {
    const usePortalScene = true; // Set to false to use regular Scene
    
    return <>
        <LevaWrapper collapsed={true} />

        <Canvas
            shadows
            gl={{ 
                preserveDrawingBuffer: true, 
                outputColorSpace: THREE.SRGBColorSpace,
                toneMapping: usePortalScene ? THREE.CineonToneMapping : THREE.ACESFilmicToneMapping,
                localClippingEnabled: usePortalScene ? true : false,
            }}
            dpr={[1, 2]}
            performance={{ min: 0.5, max: 1 }}
        >
            {/* <CameraControls/> */}
            <AdaptiveDpr pixelated />
            {usePortalScene ? (
                <>
                <PortalScene />
                </>
            ) : (
                <Scene />
            )}
        </Canvas>
    </>
}
