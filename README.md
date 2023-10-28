# batched-3d-tiles-demo

Demonstration of rendering 3d tiles using three.js BatchedMesh addon.

The demo shows a use cased for three.js' BatchedMesh and `WEBGL_multidraw_arrays` extension that enables the drawing of a full 3D Tiles tileset in a single draw call by:

- allocating a maximum size index and vertex buffer length per geometry in the batched mesh.
- using a texture array to store all the active textures in the visible set.
- assigning overwriting geometry at an existing id with newly loaded geometry once it's no longer needed.
- toggling tile visibility based on tileset visibility.

Using `WEBGL_multidraw_arrays` should enable:
- minimal unnecessary vertex drawing.
- frustum culling.
- draw order sorting.

**TODO**
- Add .updateGeometry function
- Use ints for the id buffer
- consistent GPU upload type
- consider removing the geomtry entirely when it's toggled not visible
