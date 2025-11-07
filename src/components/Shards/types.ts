export type Vector3Tuple = [number, number, number];
export type Position = Vector3Tuple;
export type CameraOffset = Vector3Tuple;

export interface ShardDefinition {
    image: string;
    shape: string;
}

export interface ShardInstance extends ShardDefinition {
    id: string;
    position: Position;
    scale: Vector3Tuple;
    cameraOffset: CameraOffset;
    baseRotationZ: number;
}
