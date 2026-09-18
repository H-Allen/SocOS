# Default banner artwork

The default banner uses the red-and-black artwork supplied by the user on 17 September 2026. Custom page banners continue to override it.

- Site asset: `public/default-banner.webp`
- Export: 3840 × 1391 pixels, WebP quality 92, 118,076 bytes.
- Workflow: built-in image editing for restoration, followed by Sharp resizing and WebP encoding. The editing tool returned 2084 × 755 pixels; the final dimensions come from resizing, not native 4K generation.
- Display: decorative CSS background, cover sizing, centred horizontally and bottom-aligned.

## Image-editing prompt

Edit target: the supplied red and black banner image. Faithful high-resolution upscale/restoration ONLY, not a redesign. Output a wide banner at 3840 by 1392 pixels (approximately the source 2598:940 aspect ratio), highest detail. Preserve the exact composition, crop, colours, flowing red ribbons/curves, black negative space, subtle red tonal transitions, and the white halftone dot pattern near the lower centre-right. Sharpen smooth edges and circular dots and reduce compression/blur without altering their arrangement. No text, logos, extra shapes, or added detail. Keep the full original artwork edge to edge.
