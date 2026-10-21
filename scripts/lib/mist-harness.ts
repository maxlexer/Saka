import type { Page } from "@playwright/test";
import { fragment, vertex } from "../../src/lib/mist-shader.ts";
import { hexToRgb, MIST_COLORS, type Box } from "../../src/lib/mist-math.ts";

type Boxes = Partial<Record<"keepA" | "keepB" | "bottle" | "text", Box>>;
type Options = { width: number; height: number; time?: number; scale?: number; colors?: readonly string[]; boxes?: Boxes };

/** Draws one frame of the real shader in a fresh canvas and reports the maximum alpha per region. */
export function renderMist(page: Page, { width, height, time = 40, scale = 1, colors = MIST_COLORS, boxes = {} }: Options) {
  return page.evaluate(
    ({ vertex, fragment, width, height, time, scale, boxes, colors }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, preserveDrawingBuffer: true });
      if (!gl) throw new Error("WebGL2 is unavailable in this browser");

      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type) as WebGLShader;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader error");
        return shader;
      };
      const program = gl.createProgram() as WebGLProgram;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link error");
      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      const set = (name: string, ...v: number[]) => {
        const at = gl.getUniformLocation(program, name);
        if (v.length === 1) gl.uniform1f(at, v[0]);
        else if (v.length === 2) gl.uniform2f(at, v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(at, v[0], v[1], v[2]);
        else gl.uniform4f(at, v[0], v[1], v[2], v[3]);
      };
      const zero = [0, 0, 0, 0];
      set("uTime", time);
      set("uRes", width, height);
      set("uScale", scale);
      ["uColA", "uColB", "uColC"].forEach((name, i) => set(name, ...colors[i]));
      set("uPointer", -1e4, -1e4);
      set("uSwirl", 0, 0);
      set("uForce", 0);
      set("uRadius", 160);
      set("uKeepA", ...(boxes.keepA ?? zero));
      set("uKeepB", ...(boxes.keepB ?? zero));
      set("uBottle", ...(boxes.bottle ?? zero));
      set("uText", ...(boxes.text ?? zero));

      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const maxAlpha = (box: number[]) => {
        const [x0, y0, x1, y1] = box.map(Math.round);
        let max = 0;
        for (let y = Math.max(0, y0); y < Math.min(height, y1); y++) {
          for (let x = Math.max(0, x0); x < Math.min(width, x1); x++) max = Math.max(max, pixels[(y * width + x) * 4 + 3]);
        }
        return max / 255;
      };
      const stats: Record<string, number> = { all: maxAlpha([0, 0, width, height]) };
      for (const [name, box] of Object.entries(boxes)) stats[name] = maxAlpha(box as number[]);
      return { stats, dataUrl: canvas.toDataURL("image/png") };
    },
    { vertex, fragment, width, height, time, scale, boxes, colors: colors.map(hexToRgb) },
  );
}
