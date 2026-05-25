import fitz
import sys

pdf_path = r"C:\Users\akank\AppData\Local\Temp\8b8ed3a2-28b6-4192-bd3e-37be93014454_NIRF_DCS_2024-2025_v10.zip.454\NIRF_DCS_Report.pdf"

pdf = fitz.open(pdf_path)
print(f"Total pages: {len(pdf)}")

for i in range(len(pdf)):
    page = pdf[i]
    print(f"\n{'='*60} PAGE {i+1} {'='*60}")
    print(page.get_text())
