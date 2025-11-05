import { Canvas } from "@react-three/fiber";
import Shard from "./Shard";
import { CameraControls } from "@react-three/drei";
import BasicMesh from "./BasicMesh";
import EnvironmentSetup from "./EnvironmentSetup";

export default function Scene() {
    return (
        <>
            <color attach="background" args={['#222222']} />
            {/* <BasicMesh/> */}

            <directionalLight position={[10, 10, 10]} intensity={10} />
            <EnvironmentSetup/>

            <CameraControls makeDefault />
            <Shard textureUrl="favicon.png" />
        </>
    )
}