import os
import urllib.request
import fitz

urls = [
    "https://manuu.edu.in/sites/default/files/NIRF/2026/Maulana_Azad_National_Urdu_University-Overall26.pdf",
    "https://cdn.iiit.ac.in/cdn/www.iiit.ac.in/wp-content/uploads/2025/02/NIRF_Eng_23-24_Submitted_20250131.pdf",
    "https://cdn.iiit.ac.in/cdn/www.iiit.ac.in/wp-content/uploads/2025/02/NIRF_SDGs_23-24_Submitted_20250131.pdf",
    "https://cdn.iiit.ac.in/cdn/www.iiit.ac.in/wp-content/uploads/2025/02/NIRF_Innovation_23-24_Submitted_20250131.pdf",
    "https://nehu.ac.in/public/uploads/8a3abdade565728d0badbe6554182ee0.pdf",
    "https://nehu.ac.in/public/uploads/9a6a7638c116a82b347250a3b28be936.pdf",
    "https://cdnbbsr.s3waas.gov.in/s3d3b1fb02964aa64e257f9f26a31f72cf/uploads/2026/04/202604071793131225.pdf"
]

out_dir = "nirf_reports_raw"
os.makedirs(out_dir, exist_ok=True)

with open("nirf_analysis.txt", "w", encoding="utf-8") as out_f:
    for i, url in enumerate(urls):
        fname = os.path.join(out_dir, f"report_{i}.pdf")
        try:
            print(f"Downloading {url}...")
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response, open(fname, 'wb') as out_file:
                out_file.write(response.read())
            
            doc = fitz.open(fname)
            text = f"--- START REPORT {i} --- URL: {url}\n"
            # Extract first 5 pages to get the structure/tables
            for page in doc[:5]:
                text += page.get_text()
            
            text += f"\n--- END REPORT {i} ---\n\n"
            out_f.write(text)
            print(f"Successfully processed report {i}")
        except Exception as e:
            err = f"Failed {url}: {e}\n"
            print(err)
            out_f.write(err)

print("Done. Check nirf_analysis.txt")
