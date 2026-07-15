from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image
from pypdf import PdfReader, PdfWriter


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--scale", type=float, default=2.0)
    parser.add_argument("--page", type=int)
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = str(args.pdf.resolve())
    probe = pdfium.PdfDocument(pdf_path)
    page_count = len(probe)
    probe.close()
    if args.page is None:
        # PDFium's Windows font cache can omit glyphs when different pages are
        # rasterized in one process. Spawn one clean interpreter per page.
        for page_number in range(1, page_count + 1):
            subprocess.run(
                [
                    sys.executable,
                    str(Path(__file__).resolve()),
                    pdf_path,
                    "--output-dir",
                    str(args.output_dir.resolve()),
                    "--scale",
                    str(args.scale),
                    "--page",
                    str(page_number),
                ],
                check=True,
            )
        return

    if args.page < 1 or args.page > page_count:
        raise SystemExit(f"page must be between 1 and {page_count}")
    index = args.page - 1
    # Materialize an independent one-page PDF so inherited resource dictionaries
    # are explicit. PDFium otherwise omitted some Word-exported header glyphs.
    single_pdf = args.output_dir / f".page-{args.page}.single.pdf"
    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    writer.add_page(reader.pages[index])
    with single_pdf.open("wb") as handle:
        writer.write(handle)

    pdf = pdfium.PdfDocument(str(single_pdf))
    page = pdf[0]
    bitmap = page.render(scale=args.scale, fill_color=(255, 255, 255, 255))
    image = bitmap.to_pil()
    if image.mode in {"RGBA", "LA"} or "transparency" in image.info:
        rgba = image.convert("RGBA")
        white = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        white.alpha_composite(rgba)
        image = white.convert("RGB")
    output = args.output_dir / f"page-{args.page}.png"
    image.save(output, format="PNG")
    print(output)
    bitmap.close()
    page.close()
    pdf.close()
    single_pdf.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
