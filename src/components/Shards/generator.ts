import type { CameraOffset, Position, ShardDefinition, ShardInstance, Vector3Tuple } from "./types";

const DEFAULT_MIN_DISTANCE = 1.5;
const DEFAULT_BOUNDS = 3;
const DEFAULT_MAX_POSITION_ATTEMPTS = 20;
const DEFAULT_CENTER: Position = [0, 0, -5];

export interface ShardGenerationConfig {
    minDistance?: number;
    bounds?: number;
    maxPositionAttempts?: number;
    center?: Position;
    aspectRatio?: number;
}

function generateRandomPosition(bounds: number, center: Position, aspectRatio: number = 1): Position {
    const radius = bounds;

    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());

    const sinPhi = Math.sin(phi);

    // Scale x and y based on aspect ratio to create an ellipsoid
    // For landscape (aspectRatio > 1): stretch horizontally
    // For portrait (aspectRatio < 1): stretch vertically
    const aspectScaleX = aspectRatio >= 1 ? aspectRatio : 1;
    const aspectScaleY = aspectRatio < 1 ? 1 / aspectRatio : 1;

    const x = r * sinPhi * Math.cos(theta) * aspectScaleX + center[0];
    const y = r * sinPhi * Math.sin(theta) * aspectScaleY + center[1];
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

function generatePositions(count: number, minDistance: number, bounds: number, maxAttempts: number, center: Position, aspectRatio: number = 1): Position[] {
    const positions: Position[] = [];

    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let position: Position | null = null;
        let valid = false;

        while (!valid && attempts < maxAttempts) {
            position = generateRandomPosition(bounds, center, aspectRatio);
            valid = isValidPosition(position, positions, minDistance);
            attempts++;
        }

        positions.push(position || generateRandomPosition(bounds, center, aspectRatio));
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

function generateScales(count: number): Vector3Tuple[] {
    return Array.from({ length: count }, () => {
        const xy = Math.random() * 0.5 + 1;
        return [xy, xy, 1] as Vector3Tuple;
    });
}

function generateBaseRotationZ(): number {
    return (Math.random() - 0.5) * Math.PI * 2;
}

export function createShardInstances(
    database: ShardDefinition[],
    config: ShardGenerationConfig = {}
): ShardInstance[] {
    const {
        minDistance = DEFAULT_MIN_DISTANCE,
        bounds = DEFAULT_BOUNDS,
        maxPositionAttempts = DEFAULT_MAX_POSITION_ATTEMPTS,
        center = DEFAULT_CENTER,
        aspectRatio = 1,
    } = config;

    const count = database.length;
    const positions = generatePositions(count, minDistance, bounds, maxPositionAttempts, center, aspectRatio);
    const scales = generateScales(count);

    return database.map((entry, index) => ({
        ...entry,
        id: `${entry.image}-${entry.shape}-${index}`,
        position: positions[index],
        scale: scales[index],
        cameraOffset: generateCameraOffset(),
        baseRotationZ: generateBaseRotationZ(),
    }));
}
