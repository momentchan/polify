import { AdaptiveDpr, CameraControls } from "@react-three/drei";
import { LevaWrapper } from "@packages/r3f-gist/components";
import { Canvas } from "@react-three/fiber";
import Scene from "../components/Scene";
import * as THREE from 'three';

export default function App() {
    return <>
        <LevaWrapper />

        <Canvas
            shadows
            camera={{
                fov: 45,
                near: 0.1,
                far: 60,
                position: [0, 0, 5]
            }}
            gl={{ 
                preserveDrawingBuffer: true, 
                outputColorSpace: THREE.SRGBColorSpace,
                toneMapping: THREE.ACESFilmicToneMapping,
            }}
            dpr={[1, 2]}
            performance={{ min: 0.5, max: 1 }}
        >
            <AdaptiveDpr pixelated />
            <Scene />
        </Canvas>
    </>
}
