# Report results excerpt

`report-results.png` is an authentic raster excerpt of section 9 on page 5 of the team's public report. It was rendered directly from the PDF with no redrawn measurements or reconstructed plots. The report does not contain a plotted ROC figure.

- Source repository revision: `9dfa29e353526ef75bef389a37a2abd2357d6d19`
- [Original PDF at that revision](https://github.com/FastMartini/llm-data-leakage-study/blob/9dfa29e353526ef75bef389a37a2abd2357d6d19/Group%231_Membership_Inference_Attack_Report.pdf)
- PDF SHA-256: `451b2c724f2b8ce6c157b040b4f2434a40a0e67c6932af8c084a8c9b7c1bd4ff`
- Image SHA-256: `9f3162065ffe3a43675ea57d6f8155e8565043168f82abb5932aaff50d61e50a`
- Rendering: PyMuPDF 1.28.2, page index 4, clip rectangle `(60, 298, 555, 723)` in PDF points, scale 2, RGB PNG, 990 × 850 pixels.

Reproduce after downloading the source PDF and installing PyMuPDF:

```python
import pymupdf

with pymupdf.open("report.pdf") as report:
    image = report[4].get_pixmap(
        matrix=pymupdf.Matrix(2, 2),
        clip=pymupdf.Rect(60, 298, 555, 723),
    )
    image.save("report-results.png")
```

The Case Study also provides these results as semantic HTML tables and explains the target-model and attack-model evaluation populations. Team attribution follows the report's cover and section 12 on page 8. The public Vimeo demo URL follows the report's cover.
