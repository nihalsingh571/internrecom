import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internconnect_backend.settings')
django.setup()

from assessments.models import Skill, Question

# Define Skills and Questions
data = {
    "Python": [
        {
            "text": "What is the output of print(type([]))?",
            "options": ["<class 'list'>", "<class 'tuple'>", "<class 'dict'>", "<class 'set'>"],
            "correct_option": 0
        },
        {
            "text": "Which method is used to remove whitespace from the beginning and end of a string?",
            "options": ["strip()", "trim()", "clean()", "cut()"],
            "correct_option": 0
        },
        {
            "text": "How do you start a for loop in Python?",
            "options": ["for x in y:", "for x in y", "foreach x in y", "loop x in y"],
            "correct_option": 0
        },
        {
             "text": "What is the correct file extension for Python files?",
             "options": [".pt", ".pyth", ".py", ".pyt"],
             "correct_option": 2
        },
        {
             "text": "Which keyword is used to create a function in Python?",
             "options": ["function", "def", "fun", "define"],
             "correct_option": 1
        }
    ],
    "Django": [
        {
            "text": "Which file is used to configure database settings in Django?",
            "options": ["models.py", "views.py", "settings.py", "urls.py"],
            "correct_option": 2
        },
        {
            "text": "What is the command to run the development server?",
            "options": ["python manage.py run", "python manage.py start", "python manage.py runserver", "python server"],
            "correct_option": 2
        },
         {
            "text": "Which class is commonly used for creating database models?",
            "options": ["models.Model", "db.Model", "django.Db", "Model.Base"],
            "correct_option": 0
        },
        {
            "text": "What is used to map URLs to views?",
            "options": ["Router", "Mapper", "URLConf", "Controller"],
            "correct_option": 2
        },
        {
            "text": "Which template tag is used to loop over a list?",
            "options": ["{% loop %}", "{% for %}", "{{ for }}", "[% for %]"],
            "correct_option": 1
        }
    ],
    "React": [
         {
            "text": "What is the correct hook to manage state in a functional component?",
            "options": ["useState", "useEffect", "useContext", "useReducer"],
            "correct_option": 0
        },
        {
            "text": "What is JSX?",
            "options": ["JavaScript XML", "Java Syntax Extension", "JSON Xylophone", "JavaScript Extension"],
            "correct_option": 0
        },
        {
             "text": "How do you pass data to a child component?",
             "options": ["State", "Props", "Context", "Redux"],
             "correct_option": 1
        },
        {
             "text": "Which method is used to render React content into the DOM?",
             "options": ["ReactDOM.render()", "React.render()", "DOM.render()", "Render.view()"],
             "correct_option": 0
        },
        {
             "text": "What prevents a default action in an event handler?",
             "options": ["stopDefault()", "preventDefault()", "halt()", "cancel()"],
             "correct_option": 1
        }
    ]
}

for skill_name, questions in data.items():
    skill, created = Skill.objects.get_or_create(name=skill_name)
    if created:
        print(f"Created Skill: {skill_name}")
    
    for q_data in questions:
        if not Question.objects.filter(text=q_data['text']).exists():
            Question.objects.create(
                skill=skill,
                text=q_data['text'],
                options=q_data['options'],
                correct_option=q_data['correct_option']
            )
            print(f"Created Question for {skill_name}")

print("Seeding Complete!")
