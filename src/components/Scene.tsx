import { CameraControls } from "@react-three/drei";
import EnvironmentSetup from "./EnvironmentSetup";
import Shards from "./Shards";
import BackgroundSphere from "./BackgroundSphere";
import Effects from "./Effects";

export default function Scene() {
    return (
        <>
            <color attach="background" args={['#222222']} />
            {/* <fog attach="fog" args={['#222222', 0, 30]} /> */}
            {/* <BasicMesh/> */}

            <directionalLight position={[10, 10, 10]} intensity={10} />
            <EnvironmentSetup/>

            <CameraControls maxDistance={30} makeDefault />
            <Shards />
            <BackgroundSphere />
            <BackgroundDrop />

            <Effects />

        </>
    )
}