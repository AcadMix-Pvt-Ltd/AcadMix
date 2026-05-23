import * as THREE from 'three';
import { Evaluator, Brush, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

export type NodeType = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'union' | 'subtract' | 'intersect';

export interface CadNode {
  id: string;
  name: string;
  type: NodeType;
  visible: boolean;
  color?: string;
  
  // Parametric Properties
  size?: [number, number, number]; // for box
  radius?: number; // for cyl, sphere, cone, torus
  height?: number; // for cyl, cone
  tube?: number; // for torus
  
  // Transform
  position?: [number, number, number];
  rotation?: [number, number, number]; // in degrees
  
  // Boolean references
  targetId?: string;
  toolId?: string;
}

// Convert a primitive node into a Brush object
const createPrimitiveBrush = (node: CadNode): Brush | null => {
  let geometry: THREE.BufferGeometry;
  
  if (node.type === 'box') {
    const s = node.size || [10, 10, 10];
    geometry = new THREE.BoxGeometry(s[0], s[1], s[2]);
  } else if (node.type === 'cylinder') {
    geometry = new THREE.CylinderGeometry(node.radius || 5, node.radius || 5, node.height || 10, 32);
  } else if (node.type === 'sphere') {
    geometry = new THREE.SphereGeometry(node.radius || 5, 32, 16);
  } else if (node.type === 'cone') {
    geometry = new THREE.ConeGeometry(node.radius || 5, node.height || 10, 32);
  } else if (node.type === 'torus') {
    geometry = new THREE.TorusGeometry(node.radius || 5, node.tube || 1.5, 16, 64);
  } else {
    return null;
  }

  const material = new THREE.MeshStandardMaterial({
    color: node.color || '#3b82f6',
    metalness: 0.1,
    roughness: 0.4,
    side: THREE.DoubleSide
  });
  const brush = new Brush(geometry, material);
  
  if (node.position) {
    brush.position.set(node.position[0], node.position[1], node.position[2]);
  }
  if (node.rotation) {
    brush.rotation.set(
      THREE.MathUtils.degToRad(node.rotation[0]),
      THREE.MathUtils.degToRad(node.rotation[1]),
      THREE.MathUtils.degToRad(node.rotation[2])
    );
  }
  
  brush.updateMatrixWorld(true);
  return brush;
};

// Evaluate the feature tree to generate meshes
export const evaluateFeatureTree = (nodes: CadNode[]): { id: string, mesh: THREE.Mesh }[] => {
  const brushCache = new Map<string, Brush>();
  const results: { id: string, mesh: THREE.Mesh }[] = [];
  const evaluator = new Evaluator();

  for (const node of nodes) {
    let resultBrush: Brush | null = null;

    if (['box', 'cylinder', 'sphere', 'cone', 'torus'].includes(node.type)) {
      resultBrush = createPrimitiveBrush(node);
    } 
    else if (['union', 'subtract', 'intersect'].includes(node.type)) {
      const target = brushCache.get(node.targetId || '');
      const tool = brushCache.get(node.toolId || '');
      
      if (target && tool) {
        try {
          let op = ADDITION;
          if (node.type === 'subtract') op = SUBTRACTION;
          if (node.type === 'intersect') op = INTERSECTION;
          
          resultBrush = evaluator.evaluate(target, tool, op);
        } catch (e) {
          console.warn('CSG Boolean failed for node', node.id, e);
          resultBrush = target; // Fallback to target if boolean fails
        }
      } else if (target) {
        resultBrush = target;
      }
    }

    if (resultBrush) {
      brushCache.set(node.id, resultBrush);
      
      // If the node is marked visible, generate a mesh for it
      if (node.visible) {
        // use the material generated/preserved by the evaluator
        const mesh = new THREE.Mesh(resultBrush.geometry, resultBrush.material);
        // Use the position/rotation of the resulting brush
        mesh.position.copy(resultBrush.position);
        mesh.rotation.copy(resultBrush.rotation);
        
        // Compute normals for smooth shading
        if (mesh.geometry) {
          mesh.geometry.computeVertexNormals();
        }
        
        results.push({ id: node.id, mesh });
      }
    }
  }

  return results;
};
