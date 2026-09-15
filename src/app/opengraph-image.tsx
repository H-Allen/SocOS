import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "HYPED, Hyperloop Edinburgh. Technical Wiki.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/hyped-logo.png"));
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 72, background: "#111", color: "#fff", borderBottom: "16px solid #b32732" }}>
      <img alt="HYPED" src={`data:image/png;base64,${logo.toString("base64")}`} width={570} height={162} />
      <div style={{ display: "flex", marginTop: 58, fontSize: 48 }}>Hyperloop Edinburgh</div>
      <div style={{ display: "flex", marginTop: 22, fontSize: 28, color: "#ddd" }}>Technical Wiki</div>
      <div style={{ display: "flex", marginTop: 36, fontSize: 23, color: "#bbb" }}>University of Edinburgh</div>
    </div>,
    size,
  );
}
