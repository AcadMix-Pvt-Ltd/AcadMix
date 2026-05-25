import urllib.request
import PyPDF2
import io
import os

urls = [
    "https://www.nirfindia.org/nirfpdfcdn/2025/framework/Colleges.pdf",
    "https://www.nirfindia.org/nirfpdfcdn/2025/framework/Overall.pdf",
    "https://www.nirfindia.org/nirfpdfcdn/2025/framework/Engineering.pdf",
    "https://www.nirfindia.org/nirfpdfcdn/2025/framework/Innovation.pdf",
    "https://www.nirfindia.org/nirfpdfcdn/2025/framework/Research.pdf"
]

output_dir = "scratch"
os.makedirs(output_dir, exist_ok=True)

for url in urls:
    filename = url.split("/")[-1]
    print(f"Downloading {filename}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            pdf_bytes = response.read()
            
            pdf_file = io.BytesIO(pdf_bytes)
            reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
                
            out_path = os.path.join(output_dir, filename.replace(".pdf", ".txt"))
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"Saved extracted text to {out_path}")
    except Exception as e:
        print(f"Error processing {filename}: {e}")
