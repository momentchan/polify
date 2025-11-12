import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ShardHoverInfoProps {
    shardPosition: [number, number, number]
    title?: string
    info?: string
}

// Constants
const SCREEN_OFFSET_X = 300 // pixels
const SCREEN_OFFSET_Y = 150 // pixels
const MIN_DISTANCE_THRESHOLD = 0.001
const LINE_Z_INDEX = '1000'
const INFO_Z_INDEX = '1001'
const DOT_SIZE = 6 // pixels

// Helper: Project world position to screen coordinates
function worldToScreen(
    worldPos: THREE.Vector3,
    camera: THREE.Camera,
    size: { width: number; height: number }
): { x: number; y: number } {
    const screenPos = worldPos.clone().project(camera)
    return {
        x: (screenPos.x * 0.5 + 0.5) * size.width,
        y: (screenPos.y * -0.5 + 0.5) * size.height,
    }
}

// Helper: Calculate direction from center to shard
function getDirectionFromCenter(shardPos: [number, number, number]): { x: number; y: number } {
    const [sx, sy] = shardPos
    const distanceFromCenter = Math.sqrt(sx * sx + sy * sy)
    
    if (distanceFromCenter < MIN_DISTANCE_THRESHOLD) {
        return { x: 1, y: 0 } // Default to right
    }
    
    return {
        x: sx / distanceFromCenter,
        y: sy / distanceFromCenter,
    }
}

// Helper: Find closest point on rectangle border from a ray
function findBorderIntersection(
    start: { x: number; y: number },
    direction: { x: number; y: number },
    rect: DOMRect
): { x: number; y: number } {
    const { left, right, top, bottom } = rect
    
    // Calculate intersection parameters for each edge
    const intersections: Array<{ t: number; x: number; y: number }> = []
    
    // Left edge
    if (direction.x !== 0) {
        const t = (left - start.x) / direction.x
        if (t > 0) {
            const y = start.y + direction.y * t
            if (y >= top && y <= bottom) {
                intersections.push({ t, x: left, y })
            }
        }
    }
    
    // Right edge
    if (direction.x !== 0) {
        const t = (right - start.x) / direction.x
        if (t > 0) {
            const y = start.y + direction.y * t
            if (y >= top && y <= bottom) {
                intersections.push({ t, x: right, y })
            }
        }
    }
    
    // Top edge
    if (direction.y !== 0) {
        const t = (top - start.y) / direction.y
        if (t > 0) {
            const x = start.x + direction.x * t
            if (x >= left && x <= right) {
                intersections.push({ t, x, y: top })
            }
        }
    }
    
    // Bottom edge
    if (direction.y !== 0) {
        const t = (bottom - start.y) / direction.y
        if (t > 0) {
            const x = start.x + direction.x * t
            if (x >= left && x <= right) {
                intersections.push({ t, x, y: bottom })
            }
        }
    }
    
    if (intersections.length === 0) {
        // Fallback to center if no intersection found
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        }
    }
    
    // Return closest intersection
    const closest = intersections.reduce((prev, curr) => (curr.t < prev.t ? curr : prev))
    return { x: closest.x, y: closest.y }
}

export function ShardHoverInfo({
    shardPosition,
    title,
    info,
}: ShardHoverInfoProps) {
    const { camera, size } = useThree()
    const infoDivRef = useRef<HTMLDivElement | null>(null)
    const lineDivRef = useRef<HTMLDivElement | null>(null)
    const dotDivRef = useRef<HTMLDivElement | null>(null)
    
    // Create info panel and line divs in document.body
    useEffect(() => {
        // Create info panel div
        const infoElement = document.createElement('div')
        infoElement.style.position = 'fixed'
        infoElement.style.pointerEvents = 'none'
        infoElement.style.zIndex = INFO_Z_INDEX
        infoElement.style.display = 'none'
        infoElement.style.color = 'white'
        infoElement.style.padding = '12px 16px'
        infoElement.style.borderRadius = '8px'
        infoElement.style.fontSize = '12px'
        infoElement.style.fontFamily = 'monospace'
        infoElement.style.whiteSpace = 'nowrap'
        infoElement.style.transform = 'translate(-50%, -50%)' // Center on position
        infoElement.style.mixBlendMode = 'difference'
        document.body.appendChild(infoElement)
        infoDivRef.current = infoElement
        
        // Create line div
        const lineElement = document.createElement('div')
        lineElement.style.position = 'fixed'
        lineElement.style.pointerEvents = 'none'
        lineElement.style.zIndex = LINE_Z_INDEX
        lineElement.style.display = 'none'
        lineElement.style.mixBlendMode = 'difference'
        document.body.appendChild(lineElement)
        lineDivRef.current = lineElement
        
        // Create dot div (at shard position)
        const dotElement = document.createElement('div')
        dotElement.style.position = 'fixed'
        dotElement.style.pointerEvents = 'none'
        dotElement.style.zIndex = LINE_Z_INDEX
        dotElement.style.display = 'none'
        dotElement.style.width = `${DOT_SIZE}px`
        dotElement.style.height = `${DOT_SIZE}px`
        dotElement.style.borderRadius = '50%'
        dotElement.style.backgroundColor = 'rgba(255, 255, 255, 1)'
        dotElement.style.transform = 'translate(-50%, -50%)' // Center on position
        dotElement.style.mixBlendMode = 'difference'
        document.body.appendChild(dotElement)
        dotDivRef.current = dotElement
        
        return () => {
            if (infoElement.parentNode) {
                infoElement.parentNode.removeChild(infoElement)
            }
            if (lineElement.parentNode) {
                lineElement.parentNode.removeChild(lineElement)
            }
            if (dotElement.parentNode) {
                dotElement.parentNode.removeChild(dotElement)
            }
        }
    }, [])
    
    // Update positions every frame
    useFrame(() => {
        const infoDiv = infoDivRef.current
        const lineDiv = lineDivRef.current
        const dotDiv = dotDivRef.current
        if (!infoDiv || !lineDiv || !dotDiv) return
        
        // Calculate shard screen position
        const shardWorldPos = new THREE.Vector3(...shardPosition)
        const shardScreenPos = worldToScreen(shardWorldPos, camera, size)
        
        // Calculate info panel screen position with offset
        const offsetDirection = getDirectionFromCenter(shardPosition)
        const infoScreenPos = {
            x: shardScreenPos.x + offsetDirection.x * SCREEN_OFFSET_X,
            y: shardScreenPos.y - offsetDirection.y * SCREEN_OFFSET_Y,
        }
        
        // Update info panel position
        infoDiv.style.left = `${infoScreenPos.x}px`
        infoDiv.style.top = `${infoScreenPos.y}px`
        infoDiv.style.display = 'block'
        
        // Update info panel content
        const titleHtml = title ? `<div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${title}</div>` : ''
        const infoHtml = info ? `<div style="margin-bottom: 8px; font-size: 12px; color: rgba(255, 255, 255, 0.8);">${info}</div>` : ''
        infoDiv.innerHTML = titleHtml + infoHtml
        
        // Get info panel screen position for line calculation
        const rect = infoDiv.getBoundingClientRect()
        const divCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        }
        
        // Calculate direction from shard to div center
        const dx = divCenter.x - shardScreenPos.x
        const dy = divCenter.y - shardScreenPos.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < MIN_DISTANCE_THRESHOLD) {
            lineDiv.style.display = 'none'
            dotDiv.style.display = 'none'
            return
        }
        
        const lineDirection = { x: dx / distance, y: dy / distance }
        
        // Find intersection point on rectangle border
        const borderPoint = findBorderIntersection(shardScreenPos, lineDirection, rect)
        
        // Calculate line properties
        const lineLength = Math.sqrt(
            Math.pow(borderPoint.x - shardScreenPos.x, 2) +
            Math.pow(borderPoint.y - shardScreenPos.y, 2)
        )
        const angle = (Math.atan2(
            borderPoint.y - shardScreenPos.y,
            borderPoint.x - shardScreenPos.x
        ) * 180) / Math.PI
        
        // Update line styles
        lineDiv.style.left = `${shardScreenPos.x}px`
        lineDiv.style.top = `${shardScreenPos.y}px`
        lineDiv.style.width = `${lineLength}px`
        lineDiv.style.height = '1px'
        lineDiv.style.backgroundColor = 'rgba(255, 255, 255, 1)'
        lineDiv.style.transformOrigin = '0 center' // Rotate around vertical center
        lineDiv.style.transform = `rotate(${angle}deg)`
        lineDiv.style.display = 'block'
        
        // Update dot position at the start of the line, offset outward by half radius
        // Dot is centered with translate(-50%, -50%), aligns with line center
        const dotRadius = DOT_SIZE / 2
        const dotOffsetX = lineDirection.x * dotRadius
        const dotOffsetY = lineDirection.y * dotRadius
        dotDiv.style.left = `${shardScreenPos.x - dotOffsetX}px`
        dotDiv.style.top = `${shardScreenPos.y + 0.5 - dotOffsetY}px` // Offset by half line height (0.5px) + outward offset
        dotDiv.style.display = 'block'
    })
    
    // Component doesn't render anything in R3F tree
    return null
}
