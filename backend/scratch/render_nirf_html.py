import sys, os
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader("app/templates"))
template = env.get_template("nirf_dcs_template.html")

dummy_payload = {
    "academic_year": "2024",
    "college": {
        "name": "Indian Institute of Technology XYZ",
        "id": "IR-E-U-0123",
        "programs_data": [
            {"level": "UG", "duration": "4 Years", "sanctioned": 60, "admitted": 60}
        ]
    },
    "oi": {"raw_data": {"total_students": 240, "male_students": 180, "female_students": 60}},
    "go": {"raw_data": {"placement_history": {"2023-24": {"graduating": 60, "placed": 55, "median_salary": 800000, "higher_studies": 5}}}},
    "tlr": {"raw_data": {"library_spend": 2800000, "lab_spend": 9500000}},
    "rp": {"raw_data": {"patents_published": 4, "patents_granted": 1, "sponsored_amount": 1200000, "consultancy_amount": 950000}}
}

with open("scratch/nirf_preview.html", "w", encoding="utf-8") as f:
    f.write(template.render(dummy_payload))
print("Done")
