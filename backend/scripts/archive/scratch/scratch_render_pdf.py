import os
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS

# Setup paths (Inside Docker)
base_dir = "/app"
template_dir = os.path.join(base_dir, "app", "templates")
output_path = os.path.join(base_dir, "sample_naac_ssr.pdf")

# Initialize Jinja2
env = Environment(loader=FileSystemLoader(template_dir))
template = env.get_template("naac_ssr_template.html")

# Dummy Context Data
context = {
    "college": {"name": "SAGAR INSTITUTE OF RESEARCH AND TECHNOLOGY, BHOPAL"},
    "cycle": "1",
    "generated_at": "02-06-2024 10:44:48",
    "executive_summary": {
        "intro": "Sagar Institute of Research and Technology (SIRT) is a premier engineering college...",
        "vision": "To motivate and mould students into world class professionals...",
        "mission": "To provide a learning environment that encourages excellence..."
    },
    "swoc": {
        "strength": "Strong industry connect and placements...",
        "weakness": "Limited number of international students...",
        "opportunity": "Implementation of NEP 2020...",
        "challenge": "Rapidly changing technology landscape..."
    },
    "programs_data": [
        {"level": "UG", "name": "B.Tech Computer Science", "duration": "4 Years", "medium": "English", "sanctioned": "180", "admitted": "180"},
        {"level": "PG", "name": "M.Tech Computer Science", "duration": "2 Years", "medium": "English", "sanctioned": "18", "admitted": "15"}
    ],
    "category_admission_data": [
        {"year": "2023-24", "general": "100", "sc": "30", "st": "10", "obc": "40"},
        {"year": "2022-23", "general": "95", "sc": "28", "st": "12", "obc": "45"}
    ],
    "nep_preparedness": {
        "NEP_1": {"title": "Multidisciplinary / interdisciplinary", "text": "The institution has integrated multidisciplinary courses..."},
        "NEP_2": {"title": "Academic bank of credits (ABC)", "text": "Registered with ABC portal..."},
        "NEP_3": {"title": "Skill development", "text": "Multiple skill dev programs..."},
        "NEP_4": {"title": "Appropriate integration of Indian Knowledge system", "text": "Elective courses on IKS introduced..."},
        "NEP_5": {"title": "Focus on Outcome based education (OBE)", "text": "OBE is fully implemented..."},
        "NEP_6": {"title": "Distance education/online education", "text": "NPTEL/Swayam courses are mandated..."}
    },
    "qualitative_metrics": {
        "1.1.1": {
            "name": "The Institution ensures effective curriculum planning and delivery through a well-planned and documented process",
            "text": "The curriculum is meticulously planned at the beginning of each academic session."
        }
    },
    "quantitative_metrics": {
        "1.2.1": {
            "value": 15,
            "yearly_data": [
                {"year": "2023-24", "value": 5},
                {"year": "2022-23", "value": 4},
                {"year": "2021-22", "value": 3},
                {"year": "2020-21", "value": 2},
                {"year": "2019-20", "value": 1}
            ]
        }
    }
}

# Render HTML
html_out = template.render(context)

# Generate PDF with WeasyPrint
HTML(string=html_out).write_pdf(output_path)

print(f"Sample PDF successfully generated inside Docker at: {output_path}")
