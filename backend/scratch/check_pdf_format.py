import requests
import fitz # PyMuPDF
import io

urls = [
    "https://cdn.iiit.ac.in/cdn/www.iiit.ac.in/wp-content/uploads/2025/02/NIRF_Eng_23-24_Submitted_20250131.pdf"
]

for url in urls:
    response = requests.get(url, verify=False)
    if response.status_code == 200:
        pdf = fitz.open(stream=response.content, filetype="pdf")
        text = ""
        for i in range(min(4, len(pdf))): # first 4 pages
            text += pdf[i].get_text()
        print(f"--- {url} ---")
        print(text[:2000])
    else:
        print(f"Failed: {url}")
