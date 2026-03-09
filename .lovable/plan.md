

## Understanding the Problem

The pool catalog image is the **texture/appearance** of the pool (its top-down layout showing shape, steps, benches, etc.). When placed on the canvas, this image should **replace the water gradient fill entirely**, acting as the pool's visual representation scaled exactly to the pool's pixel dimensions.

Currently, the image is overlaid as a separate `FabricImage` object on top of a transparent polygon. This causes layering issues and the image doesn't truly "become" the pool.

## Plan

### 1. Use the catalog image as a Fabric.js Pattern fill on the pool polygon

Instead of adding a separate `FabricImage` object on top of the pool polygon, load the image and apply it as a `Pattern` fill directly on the pool's `Polygon` object. This way:
- The image **is** the pool — no separate object to manage
- It scales exactly to the pool's width/height
- Rotation is handled by the fact that dimensions are already swapped when rotation is 90°/270°, and for the image itself we apply a pattern transform to rotate it

**In `createPoolShape` (ManualTracingCanvas.tsx):**

- When `imageUrl` is provided:
  1. Load the image via `document.createElement('img')`
  2. On load, create a `Pattern` from the image with `scaleX`/`scaleY` set to `poolWidth / img.width` and `poolHeight / img.height`
  3. Apply rotation transform to the pattern for 90°/180°/270° cases
  4. Set `polygon.set('fill', pattern)` and call `fabricCanvas.renderAll()`
- When no `imageUrl`: keep the existing `createWaterGradient` fill
- Remove the entire separate `FabricImage` block (lines ~4852-4910)

### 2. Ensure rotation is correctly applied

When rotation is 90° or 270°, the pool dimensions (width/length) are already swapped in `handlePoolDialogConfirm` (line 4694-4698), so the pool rectangle on canvas is correct. The pattern just needs to rotate the source image to match:
- 0°: pattern applied directly, scaled to pool bounds
- 90°: pattern rotated 90° with adjusted scale (image natural width maps to pool height)
- 180°: pattern rotated 180°
- 270°: pattern rotated 270°

### 3. Clean up

- Remove the `FabricImage` overlay code block entirely
- Remove references to `isPoolImage` tagging since the image is now part of the polygon fill
- The pool polygon remains the single object representing the pool, simplifying move/delete/edit operations

### Files to modify
- `src/components/pool-designer/ManualTracingCanvas.tsx` — Replace the FabricImage overlay approach with Pattern fill on the pool polygon

