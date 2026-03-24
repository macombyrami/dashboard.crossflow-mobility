/**
 * Simple ray-casting point-in-polygon algorithm
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if a road segment (array of points) is partially or fully within a polygon
 */
export function isSegmentInPolygon(coords: [number, number][], polygon: [number, number][]): boolean {
  // If any point is inside, we consider it in the zone for analysis
  return coords.some(p => isPointInPolygon(p, polygon));
}
