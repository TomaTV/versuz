---
name: vz-pdf-extract
description: Extract structured text, tables, and form fields from PDFs into JSON. Three-tier fallback (pdfplumber → pdfminer → Tesseract OCR) with deterministic output schema, page-level provenance, and explicit failure modes. Use when a user gives you a PDF and expects machine-readable output.
tools: ["bash", "read", "write"]
model: claude-opus-4-7
license: Versuz Featured
---

# vz-pdf-extract

Extract every PDF you receive into the same JSON shape, no matter how the
PDF was authored. Built around a three-tier fallback chain so digital,
scanned, and hybrid PDFs all produce usable output.

## When to use

- User uploads a PDF and asks for "the data" / "the tables" / "the text"
- You need to feed PDF content into a downstream pipeline (LLM, DB, API)
- The user expects per-page or per-section provenance (citation, anchor)

## When NOT to use

- The PDF is over 200 pages → split first, extract per-section
- Output needs to preserve visual layout perfectly → use `pdf2image` + visual LLM
- The file is encrypted → ask the user for the password before you start

## Output contract

Every extraction returns this exact JSON shape. **Never** deviate from it
— downstream consumers depend on it.

```json
{
  "filename": "invoice-2026-q1.pdf",
  "pages": 3,
  "extractor": "pdfplumber" | "pdfminer" | "tesseract",
  "language": "en" | "fr" | "auto",
  "extraction_warnings": ["string"],
  "blocks": [
    {
      "page": 1,
      "type": "text" | "table" | "heading",
      "content": "string or 2D array for tables",
      "bbox": [x0, y0, x1, y1]
    }
  ]
}
```

## Workflow

### Step 1 — Inspect

Before extracting anything, check what you're dealing with :

```bash
pdfinfo "$FILE" | head -20        # pages, encrypted?, version
pdfimages -list "$FILE" | wc -l   # any embedded images?
```

If `pdfinfo` reports `Encrypted: yes` → STOP, ask user for password.
If image count > page count → likely scanned PDF, jump straight to Tesseract.

### Step 2 — Try pdfplumber (digital PDFs)

```python
import pdfplumber

with pdfplumber.open(path) as pdf:
    blocks = []
    for i, page in enumerate(pdf.pages, 1):
        text = page.extract_text()
        if text and text.strip():
            blocks.append({"page": i, "type": "text", "content": text, "bbox": [0, 0, page.width, page.height]})
        for table in page.extract_tables():
            blocks.append({"page": i, "type": "table", "content": table, "bbox": None})
```

If `len(blocks) > 0` → SUCCESS, emit JSON, done.
If `len(blocks) == 0` → page has no extractable text layer → fall through.

### Step 3 — Fallback to pdfminer.six

`pdfplumber` builds on `pdfminer` but is more conservative on weird PDF
producers. Try `pdfminer` directly :

```python
from pdfminer.high_level import extract_text
text = extract_text(path)
if len(text.strip()) > 50:
    # emit single text block per page via extract_pages()
```

If still empty → it's a scanned PDF.

### Step 4 — OCR via Tesseract

```bash
pdftoppm -r 300 "$FILE" page -png    # render at 300dpi
for img in page-*.png; do
  tesseract "$img" - -l eng+fra      # detect en or fr per file
done
```

For multi-language PDFs : run language detection on a sample text block
first (use `langdetect` Python lib), then pick `-l` accordingly.

Add an `extraction_warnings` entry : `"OCR fallback used — accuracy may be lower"`.

## Common pitfalls

1. **Tables that span pages** — pdfplumber treats each page independently.
   Detect via : same column count + same column widths → merge cross-page.
2. **Multi-column layouts** — pdfminer reads top-to-bottom per column.
   `pdfplumber` has `extract_text(layout=True)` for layout-aware extraction.
3. **Form fields** — use `pdfplumber.PDF.metadata` and `page.annotations`
   for AcroForm fields. They're invisible to plain text extraction.
4. **Rotated PDFs** — check `page.rotation` and pre-rotate via PyMuPDF
   before OCR.

## Validation

Before returning JSON to the user :

- `len(blocks) >= 1` : if 0, set `extraction_warnings = ["No content extracted — file may be empty or corrupted"]`
- `extractor` field must match the actual extractor used (no lying)
- For tables : verify each row has same column count, drop or warn on jagged tables

## Example invocation

User : *"Extract the line items from this invoice."*

You :
1. Run Step 1 → confirm 1 page, not encrypted, no embedded images
2. Run Step 2 → pdfplumber finds 1 table with 4 columns × 12 rows
3. Filter `blocks` where `type == "table"` and emit just those
4. Reply with the JSON above + a 1-sentence summary

## Disclaimers

- This skill does not validate VAT, currency, or business logic — only structure
- For legally-binding extractions (contracts, financial statements) → flag for human review
- Tesseract accuracy on hand-written content is poor; do not promise > 85%
