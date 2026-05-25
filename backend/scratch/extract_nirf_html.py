"""
Converts a real NIRF DCS PDF into an HTML file we can use as the Jinja template base.
Uses PyMuPDF to extract the HTML rendering of each page.
"""
import requests
import fitz

url = "https://cdn.iiit.ac.in/cdn/www.iiit.ac.in/wp-content/uploads/2025/02/NIRF_Eng_23-24_Submitted_20250131.pdf"

response = requests.get(url, verify=False)
pdf = fitz.open(stream=response.content, filetype="pdf")

html_parts = []
html_parts.append("""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>NIRF DCS</title>
<style>
body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
th, td { border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; font-size: 8pt; }
th { background-color: #f0f0f0; font-weight: bold; }
.text-left { text-align: left; }
</style>
</head><body>
""")

# Extract pages 1-3 as HTML (the key data pages)
for i in range(min(3, len(pdf))):
    page = pdf[i]
    # Get the HTML rendering of the page
    page_html = page.get_text("html")
    html_parts.append(f"<!-- PAGE {i+1} -->")
    html_parts.append(page_html)
    html_parts.append("<hr style='page-break-after: always;'>")

html_parts.append("</body></html>")

output = "\n".join(html_parts)

with open("scratch/nirf_extracted.html", "w", encoding="utf-8") as f:
    f.write(output)

print(f"Wrote {len(output)} bytes to scratch/nirf_extracted.html")
print(f"Pages extracted: {min(3, len(pdf))}")
