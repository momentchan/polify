import { useMemo } from "react";
import Shard from "./Shard";

type Position = [number, number, number];
type CameraOffset = [number, number, number];

export interface ShardData {
    image: string;
    shape: string;
    cameraOffset?: CameraOffset;
}

// Database: Define shard configurations with image and shape mappings
// Edit this array to configure which image is paired with which shape
export const SHARD_DATABASE: Omit<ShardData, 'cameraOffset'>[] = [
    { image: "textures/img1.avif", shape: "textures/shape1.svg" },
    { image: "textures/img2.avif", shape: "textures/shape2.svg" },
    { image: "textures/img3.avif", shape: "textures/shape3.svg" },
    { image: "textures/img4.avif", shape: "textures/shape4.svg" },
    { image: "textures/img5.avif", shape: "textures/shape1.svg" },
    { image: "textures/img6.avif", shape: "textures/shape2.svg" },
    { image: "textures/img7.avif", shape: "textures/shape3.svg" },
    { image: "textures/img8.avif", shape: "textures/shape4.svg" },
    { image: "textures/img9.avif", shape: "textures/shape1.svg" },
    { image: "textures/img10.avif", shape: "textures/shape2.svg" },
];

const MIN_DISTANCE = 2.5;
const BOUNDS = 3;
const MAX_POSITION_ATTEMPTS = 10;

function generateRandomPosition(bounds: number): Position {
    const radius = bounds;
    const center: Position = [0, 0, -5];

    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());

    const sinPhi = Math.sin(phi);

    const x = r * sinPhi * Math.cos(theta) + center[0];
    const y = r * sinPhi * Math.sin(theta) + center[1];
    const z = r * Math.cos(phi) + center[2];

    return [x, y, z];
}

function calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1[0] - pos2[0];
    const dy = pos1[1] - pos2[1];
    const dz = pos1[2] - pos2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isValidPosition(position: Position, existingPositions: Position[], minDistance: number): boolean {
    return existingPositions.every(existing => calculateDistance(position, existing) >= minDistance);
}

function generatePositions(count: number, minDistance: number, bounds: number): Position[] {
    const positions: Position[] = [];

    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let position: Position | null = null;
        let valid = false;

        while (!valid && attempts < MAX_POSITION_ATTEMPTS) {
            position = generateRandomPosition(bounds);
            valid = isValidPosition(position, positions, minDistance);
            attempts++;
        }

        positions.push(position || generateRandomPosition(bounds));
    }

    return positions;
}

function generateCameraOffset(): CameraOffset {
    return [
        (Math.random() - 0.5) * Math.PI * 0.25,
        (Math.random() - 0.5) * Math.PI * 0.25,
        0,
    ];
}

function generateScales(count: number): [number, number, number][] {
    return Array.from({ length: count }, () => {
        const xy = Math.random() * 0.5 + 1;
        return [xy, xy, 1] as [number, number, number];
    });
}

function createShardConfigsFromDatabase(database: Omit<ShardData, 'cameraOffset'>[]): ShardData[] {
    return database.map((entry) => ({
        ...entry,
        cameraOffset: generateCameraOffset(),
    }));
}

export default function Shards() {
    const shardConfigs = useMemo(() => createShardConfigsFromDatabase(SHARD_DATABASE), []);
    const positions = useMemo(() => generatePositions(SHARD_DATABASE.length, MIN_DISTANCE, BOUNDS), []);
    const scales = useMemo(() => generateScales(SHARD_DATABASE.length), []);
    return (
        <>
            {shardConfigs.map((config, index) => (
                <Shard
                    key={`${config.image}-${config.shape}`}
                    textureUrl={config.image}
                    shapePath={config.shape}
                    position={positions[index]}
                    scale={scales[index]}
                    cameraOffset={config.cameraOffset}
                    debug={false}
                />
            ))}
        </>
    );
}