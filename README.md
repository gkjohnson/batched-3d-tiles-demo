# batched-3d-tiles-demo

Demonstration of rendering 3d tiles with [3D Tiles Renderer](https://github.com/NASA-AMMOS/3DTilesRendererJS) using three.js BatchedMesh addon and now r159 core BatchedMesh object with multidraw:

- [Proof of concept BatchedMesh addon](https://gkjohnson.github.io/batched-3d-tiles-demo/)
- [Three.js r159 BatchedMesh multi draw demo](https://gkjohnson.github.io/batched-3d-tiles-demo/core.html)

The demo shows a use cased for three.js' BatchedMesh and `WEBGL_multidraw_arrays` extension that enables the drawing of a full 3D Tiles tileset in a single draw call by:

- allocating a maximum size index and vertex buffer length per geometry in the batched mesh.
- using a texture array to store all the active textures in the visible set.
- assigning overwriting geometry at an existing id with newly loaded geometry once it's no longer needed.
- toggling tile visibility based on tileset visibility.

Using `WEBGL_multidraw_arrays` enables:
- minimal unnecessary vertex drawing
- frustum culling
- draw order sorting
