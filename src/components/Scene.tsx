import { CameraControls } from "@react-three/drei";
import EnvironmentSetup from "./EnvironmentSetup";
import Shards from "./Shards";

export default function Scene() {
    return (
        <>
            <color attach="background" args={['#222222']} />
            {/* <BasicMesh/> */}

            <directionalLight position={[10, 10, 10]} intensity={10} />
            <EnvironmentSetup/>

            <CameraControls makeDefault />
            <Shards />
        </>
    )
}