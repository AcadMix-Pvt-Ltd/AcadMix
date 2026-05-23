import * as THREE from 'three';
import { Evaluator, Brush, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const GlobalAssetCache = {
  font: null as any,
  textures: {} as Record<string, THREE.Texture>,
  onLoadCallback: null as (() => void) | null,
};

export const preloadCadAssets = (callback: () => void) => {
  GlobalAssetCache.onLoadCallback = callback;
  
  const fontLoader = new FontLoader();
  fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    GlobalAssetCache.font = font;
    if (GlobalAssetCache.onLoadCallback) GlobalAssetCache.onLoadCallback();
  });

  const textureLoader = new THREE.TextureLoader();
  
  const loadTex = (url: string, repeat: number = 1) => {
    const t = textureLoader.load(url, () => {
      if (GlobalAssetCache.onLoadCallback) GlobalAssetCache.onLoadCallback();
    });
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  GlobalAssetCache.textures['wood'] = loadTex('https://images.unsplash.com/photo-1520114885542-a841d1df332f?w=512&q=80', 0.1);
  GlobalAssetCache.textures['carbon'] = loadTex('https://images.unsplash.com/photo-1596434448512-404fb171cd8f?w=512&q=80', 1);
};


export type NodeType = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'text' | 'union' | 'subtract' | 'intersect';

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
  textValue?: string; // for text
  cornerRadius?: number; // for box fillets
  materialType?: 'solid' | 'wood' | 'carbon'; // for textures
  
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
    if (node.cornerRadius && node.cornerRadius > 0) {
      geometry = new RoundedBoxGeometry(s[0], s[1], s[2], 4, node.cornerRadius);
    } else {
      geometry = new THREE.BoxGeometry(s[0], s[1], s[2]);
    }
  } else if (node.type === 'cylinder') {
    geometry = new THREE.CylinderGeometry(node.radius || 5, node.radius || 5, node.height || 10, 32);
  } else if (node.type === 'sphere') {
    geometry = new THREE.SphereGeometry(node.radius || 5, 32, 16);
  } else if (node.type === 'cone') {
    geometry = new THREE.ConeGeometry(node.radius || 5, node.height || 10, 32);
  } else if (node.type === 'torus') {
    geometry = new THREE.TorusGeometry(node.radius || 5, node.tube || 1.5, 16, 64);
  } else if (node.type === 'text') {
    if (GlobalAssetCache.font) {
      geometry = new TextGeometry(node.textValue || 'AcadMix', {
        font: GlobalAssetCache.font,
        size: node.radius || 5,
        depth: node.height || 2,
        curveSegments: 12,
        bevelEnabled: false
      });
      geometry.center();
    } else {
      geometry = new THREE.BoxGeometry(5, 5, 5);
    }
  } else {
    return null;
  }

  const matParams: THREE.MeshStandardMaterialParameters = {
    color: node.color || '#3b82f6',
    metalness: node.materialType === 'carbon' ? 0.8 : 0.1,
    roughness: node.materialType === 'wood' ? 0.9 : 0.4,
    side: THREE.DoubleSide
  };
  if (node.materialType && node.materialType !== 'solid' && GlobalAssetCache.textures[node.materialType]) {
    matParams.map = GlobalAssetCache.textures[node.materialType];
    matParams.color = 0xffffff;
  }
  const material = new THREE.MeshStandardMaterial(matParams);
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

    if (['box', 'cylinder', 'sphere', 'cone', 'torus', 'text'].includes(node.type)) {
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
