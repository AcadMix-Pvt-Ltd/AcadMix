import requests
import fitz

url = "https://cdn.iiit.ac.in/cdn/www.iiit.ac.in/wp-content/uploads/2025/02/NIRF_Eng_23-24_Submitted_20250131.pdf"
response = requests.get(url, verify=False)
pdf = fitz.open(stream=response.content, filetype="pdf")

# Page 1 only - full text + tables
page = pdf[0]
print(page.get_text())
print("\n--- TABLES ---")
tables = page.find_tables()
for t_idx, table in enumerate(tables.tables):
    print(f"\nTable {t_idx + 1} ({table.row_count}r x {table.col_count}c):")
    data = table.extract()
    for row in data:
        print(" | ".join([str(cell or "").strip()[:60] for cell in row]))
