import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// Loads every model in `pathMap` (name -> url) and resolves to a matching
// name -> Object3D template map. Templates are meant to be cloned (see
// cloneModel) rather than added to the scene directly, since GLTFLoader
// returns one shared scene graph per URL.
export function loadModels(pathMap) {
  const entries = Object.entries(pathMap).map(
    ([key, path]) =>
      new Promise((resolve, reject) => {
        loader.load(path, (gltf) => resolve([key, gltf.scene]), undefined, (err) => reject(new Error(`failed to load ${path}: ${err.message || err}`)));
      })
  );
  return Promise.all(entries).then((pairs) => Object.fromEntries(pairs));
}

// Object3D.clone(true) deep-clones the node hierarchy but shares geometries
// and materials by reference, which is exactly what we want when the same
// tile/tower/unit model is instanced many times across a battle.
export function cloneModel(template) {
  return template.clone(true);
}
