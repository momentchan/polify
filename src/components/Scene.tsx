import { Canvas } from "@react-three/fiber";
import Shard from "./Shard";
import { CameraControls } from "@react-three/drei";
import BasicMesh from "./BasicMesh";

export default function Scene() {
    return (
        <>
            <color attach="background" args={['#222222']} />
            {/* <BasicMesh/> */}

            <CameraControls makeDefault />
            <Shard textureUrl="favicon.png" />
        </>
    )
}