import { toPng } from "html-to-image";

export async function exportBoardAsPng(
  node: HTMLElement,
  filename = "pindou-art"
): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 3,
    backgroundColor: "#f4ecd8",
    cacheBust: true,
    filter: (el) => {
      if (!(el instanceof HTMLElement)) return true;
      return el.dataset.ui === undefined;
    },
  });
  const link = document.createElement("a");
  link.download = `${filename}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}
