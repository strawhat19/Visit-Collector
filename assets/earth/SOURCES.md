# Earth Imagery

The three 4096 × 2048 textures are the same local textures used by GeoCorp. They were copied unchanged from its source snapshot on September 17, 2026.

- `earth_day_4096.jpg`: daytime surface, sRGB
- `earth_night_4096.jpg`: nighttime lights, sRGB
- `earth_bump_roughness_clouds_4096.jpg`: linear packed detail; red = elevation, green = roughness, blue = cloud density

Earth textures by **Solar System Scope / INOVE**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); resized and merged by the Three.js contributors. Based on NASA imagery. Rendering shaders adapted from GeoCorp, with dashboard map projection, visitor markers, and interaction adaptations by Visit Collector.

- [Creator and license](https://www.solarsystemscope.com/textures/)
- [Three.js Earth example](https://threejs.org/examples/webgpu_tsl_earth.html)
- [Three.js example source](https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_tsl_earth.html)
- [Original texture directory](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets)

These are satellite-derived illustrative basemaps, not live satellite or weather feeds. Visitor markers come from the app's current data source. The imagery is bundled with the app and requires no remote map service.

GeoCorp shader code is reused under its MIT license: Copyright (c) 2026 Strawhat19.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
