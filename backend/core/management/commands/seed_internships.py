import itertools

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from core.models import ApplicantProfile, Internship, RecruiterProfile

User = get_user_model()

INTERNSHIP_DATA = [
    {
        "title": "Software Development Intern",
        "company": "Google",
        "location": "Bangalore",
        "type": "On-site",
        "stipend": 60000,
        "skills": ["Python", "Data Structures", "Algorithms", "System Design"],
    },
    {
        "title": "Frontend Developer Intern",
        "company": "Amazon",
        "location": "Hyderabad",
        "type": "On-site",
        "stipend": 50000,
        "skills": ["React", "JavaScript", "HTML", "CSS"],
    },
    {
        "title": "Machine Learning Intern",
        "company": "Microsoft",
        "location": "Bangalore",
        "type": "Hybrid",
        "stipend": 65000,
        "skills": ["Python", "Machine Learning", "TensorFlow", "Data Science"],
    },
    {
        "title": "Backend Developer Intern",
        "company": "Flipkart",
        "location": "Bangalore",
        "type": "On-site",
        "stipend": 45000,
        "skills": ["Java", "Spring Boot", "Microservices", "MySQL"],
    },
    {
        "title": "Data Science Intern",
        "company": "Swiggy",
        "location": "Remote",
        "type": "Remote",
        "stipend": 40000,
        "skills": ["Python", "Pandas", "Machine Learning", "SQL"],
    },
    {
        "title": "Full Stack Developer Intern",
        "company": "Zomato",
        "location": "Gurgaon",
        "type": "Hybrid",
        "stipend": 42000,
        "skills": ["React", "Node.js", "MongoDB", "Express"],
    },
    {
        "title": "Cloud Engineering Intern",
        "company": "AWS",
        "location": "Bangalore",
        "type": "On-site",
        "stipend": 70000,
        "skills": ["AWS", "Docker", "Kubernetes", "Linux"],
    },
    {
        "title": "DevOps Intern",
        "company": "Infosys",
        "location": "Pune",
        "type": "On-site",
        "stipend": 30000,
        "skills": ["Docker", "CI/CD", "Linux", "Terraform"],
    },
    {
        "title": "AI Research Intern",
        "company": "OpenAI Labs",
        "location": "Remote",
        "type": "Remote",
        "stipend": 80000,
        "skills": ["Python", "Deep Learning", "PyTorch", "NLP"],
    },
    {
        "title": "Product Management Intern",
        "company": "Paytm",
        "location": "Noida",
        "type": "Hybrid",
        "stipend": 35000,
        "skills": ["Product Strategy", "Analytics", "Market Research", "Excel"],
    },
    {
        "title": "Data Analyst Intern",
        "company": "Deloitte",
        "location": "Hyderabad",
        "type": "Hybrid",
        "stipend": 38000,
        "skills": ["SQL", "Python", "Power BI", "Data Visualization"],
    },
    {
        "title": "Cybersecurity Intern",
        "company": "Cisco",
        "location": "Bangalore",
        "type": "On-site",
        "stipend": 45000,
        "skills": ["Network Security", "Ethical Hacking", "Linux", "Python"],
    },
    {
        "title": "Software Engineering Intern",
        "company": "Adobe",
        "location": "Noida",
        "type": "Hybrid",
        "stipend": 55000,
        "skills": ["Java", "Algorithms", "Spring Boot", "APIs"],
    },
    {
        "title": "Mobile App Developer Intern",
        "company": "PhonePe",
        "location": "Bangalore",
        "type": "On-site",
        "stipend": 42000,
        "skills": ["Flutter", "Dart", "Firebase", "REST APIs"],
    },
    {
        "title": "Business Analyst Intern",
        "company": "McKinsey",
        "location": "Mumbai",
        "type": "On-site",
        "stipend": 50000,
        "skills": ["Excel", "Data Analysis", "Business Intelligence", "SQL"],
    },
    {
        "title": "UI/UX Design Intern",
        "company": "PayPal",
        "location": "Chennai",
        "type": "Hybrid",
        "stipend": 35000,
        "skills": ["Figma", "UX Research", "Wireframing", "Prototyping"],
    },
    {
        "title": "Blockchain Developer Intern",
        "company": "Polygon",
        "location": "Remote",
        "type": "Remote",
        "stipend": 45000,
        "skills": ["Solidity", "Blockchain", "Web3", "Smart Contracts"],
    },
    {
        "title": "Game Developer Intern",
        "company": "Ubisoft",
        "location": "Pune",
        "type": "On-site",
        "stipend": 32000,
        "skills": ["Unity", "C#", "Game Physics", "3D Graphics"],
    },
    {
        "title": "Data Engineering Intern",
        "company": "Uber",
        "location": "Hyderabad",
        "type": "Hybrid",
        "stipend": 60000,
        "skills": ["Python", "Spark", "Hadoop", "SQL"],
    },
    {
        "title": "AI Engineer Intern",
        "company": "Nvidia",
        "location": "Bangalore",
        "type": "On-site",
        "stipend": 75000,
        "skills": ["Deep Learning", "CUDA", "Python", "Computer Vision"],
    },
    {
        "title": "Marketing Intern",
        "company": "Unilever",
        "location": "Mumbai",
        "type": "On-site",
        "stipend": 25000,
        "skills": ["SEO", "Content Marketing", "Analytics", "Social Media"],
    },
    {
        "title": "Digital Marketing Intern",
        "company": "Byju's",
        "location": "Remote",
        "type": "Remote",
        "stipend": 20000,
        "skills": ["SEO", "Google Analytics", "Content Strategy", "Social Media"],
    },
    {
        "title": "AI Product Intern",
        "company": "Notion AI",
        "location": "Remote",
        "type": "Remote",
        "stipend": 70000,
        "skills": ["AI", "Product Design", "User Research", "Data Analysis"],
    },
    {
        "title": "Research Intern",
        "company": "IBM Research",
        "location": "Bangalore",
        "type": "On-site",
        "stipend": 60000,
        "skills": ["Machine Learning", "Python", "Data Science", "Statistics"],
    },
    {
        "title": "Frontend Engineer Intern",
        "company": "Razorpay",
        "location": "Bangalore",
        "type": "Hybrid",
        "stipend": 45000,
        "skills": ["React", "TypeScript", "Tailwind", "JavaScript"],
    },
    {
        "title": "Systems Engineer Intern",
        "company": "Intel",
        "location": "Bangalore",
        "type": "On-site",
        "stipend": 55000,
        "skills": ["C++", "Operating Systems", "Computer Architecture", "Linux"],
    },
    {
        "title": "AI NLP Intern",
        "company": "HuggingFace",
        "location": "Remote",
        "type": "Remote",
        "stipend": 75000,
        "skills": ["Python", "NLP", "Transformers", "Deep Learning"],
    },
    {
        "title": "FinTech Intern",
        "company": "Stripe",
        "location": "Remote",
        "type": "Remote",
        "stipend": 70000,
        "skills": ["Finance", "APIs", "Python", "Data Analysis"],
    },
    {
        "title": "Startup Software Intern",
        "company": "CRED",
        "location": "Bangalore",
        "type": "Hybrid",
        "stipend": 45000,
        "skills": ["React", "Node.js", "MongoDB", "JavaScript"],
    },
    {
        "title": "Analytics Intern",
        "company": "KPMG",
        "location": "Delhi",
        "type": "On-site",
        "stipend": 35000,
        "skills": ["SQL", "Power BI", "Excel", "Data Analysis"],
    },
]

DEFAULT_PASSWORD = "InternRecruiter123!"


class Command(BaseCommand):
    help = "Seeds recruiter users and internship listings."

    def add_arguments(self, parser):
        parser.add_argument("--password", default=DEFAULT_PASSWORD, help="Password to assign to recruiter accounts.")
        parser.add_argument(
            "--truncate",
            action="store_true",
            help="Delete existing seeded recruiters/internships before seeding.",
        )

    def handle(self, *args, **options):
        password = options["password"]
        if not password or len(password) < 6:
            raise CommandError("Please supply --password with at least 6 characters.")

        recruiter_emails = [self._build_email(entry["company"]) for entry in INTERNSHIP_DATA]

        if options["truncate"]:
            Internship.objects.filter(recruiter__user__email__in=recruiter_emails).delete()
            RecruiterProfile.objects.filter(user__email__in=recruiter_emails).delete()
            User.objects.filter(email__in=recruiter_emails).delete()
            self.stdout.write(self.style.WARNING("Cleared previously seeded recruiter accounts and internships."))

        created_recruiters = 0
        created_internships = 0

        for record in INTERNSHIP_DATA:
            email = self._build_email(record["company"])
            user_defaults = {
                "first_name": record["company"],
                "last_name": "Recruiter",
                "username": self._derive_username(email),
                "role": User.Role.RECRUITER,
            }
            user, created = User.objects.get_or_create(email=email, defaults=user_defaults)
            if created:
                user.set_password(password)
                user.save()
                created_recruiters += 1
            elif user.role != User.Role.RECRUITER:
                user.role = User.Role.RECRUITER
                user.save(update_fields=["role"])

            recruiter_profile, _ = RecruiterProfile.objects.get_or_create(user=user, defaults={"company_name": record["company"]})
            if recruiter_profile.company_name != record["company"]:
                recruiter_profile.company_name = record["company"]
                recruiter_profile.save(update_fields=["company_name"])

            internship, created_listing = Internship.objects.update_or_create(
                recruiter=recruiter_profile,
                title=record["title"],
                defaults={
                    "description": f"{record['company']} {record['title']} opportunity through InternConnect.",
                    "location": record["location"],
                    "required_skills": record["skills"],
                    "work_type": record["type"],
                    "stipend": record["stipend"],
                },
            )
            if created_listing:
                created_internships += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded/updated {len(INTERNSHIP_DATA)} internships ({created_internships} new) with {created_recruiters} recruiter accounts."
            )
        )

    def _build_email(self, company):
        slug = slugify(company) or "recruiter"
        return f"{slug}@partners.internconnect.ai"

    def _derive_username(self, base_email):
        base = base_email.split("@")[0]
        for idx in itertools.count():
            candidate = base if idx == 0 else f"{base}{idx}"
            if not User.objects.filter(username=candidate).exists():
                return candidate
