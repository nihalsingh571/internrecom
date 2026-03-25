import os
import json
from typing import List, Dict, Any

try:
    import google.genai as genai
except ModuleNotFoundError:  # pragma: no cover - dev environments may not have optional deps
    genai = None

def generate_questions_with_gemini(skill_name: str) -> List[Dict[str, Any]]:
    """
    Generate 10 moderate-level MCQ questions for a skill using Gemini AI.

    Args:
        skill_name: The name of the skill to generate questions for

    Returns:
        List of question dictionaries with 'text', 'options', and 'correct_option'

    Raises:
        Exception: If API call fails or returns invalid data
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY environment variable not set")

    if genai is None:
        raise ImportError("google-genai package is not installed. Install it or skip Gemini generation.")

    client = genai.Client(api_key=api_key)

    prompt = f"""Generate 10 beginner level multiple choice questions for the skill: {skill_name}.

Return strictly in JSON format:

[
{{
"text": "What is a basic concept in {skill_name}?",
"options": ["Correct answer", "Wrong option 1", "Wrong option 2", "Wrong option 3"],
"correct_option": 0
}}
]

Rules:
* exactly 10 questions
* exactly 4 options each
* correct_option must be index 0-3
* questions should test fundamental knowledge
* make questions educational and appropriate for beginners
* ensure correct_option points to the right answer (index 0-3)"""

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        response_text = response.text.strip()

        # Clean up the response - remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        questions = json.loads(response_text)

        # Validate the response
        if not isinstance(questions, list) or len(questions) != 10:
            raise Exception("Invalid response: expected list of 10 questions")

        for i, q in enumerate(questions):
            if not all(key in q for key in ['text', 'options', 'correct_option']):
                raise Exception(f"Question {i+1} missing required fields")
            if not isinstance(q['options'], list) or len(q['options']) != 4:
                raise Exception(f"Question {i+1} must have exactly 4 options")
            if not isinstance(q['correct_option'], int) or not (0 <= q['correct_option'] <= 3):
                raise Exception(f"Question {i+1} correct_option must be 0-3")

        return questions

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse JSON response: {e}")
    except Exception as e:
        raise Exception(f"Gemini API error: {e}")


def generate_default_questions(skill_name: str) -> List[Dict[str, Any]]:
    """
    Generate 10 default MCQ questions as fallback when Gemini fails.

    Args:
        skill_name: The name of the skill

    Returns:
        List of question dictionaries
    """
    questions = []

    # Template questions with placeholders
    templates = [
        {
            "text": f"What is a fundamental concept in {skill_name}?",
            "options": [f"Core principle of {skill_name}", "Unrelated technology", "Hardware component", "Network protocol"],
            "correct_option": 0
        },
        {
            "text": f"Which of the following is essential for {skill_name}?",
            "options": [f"Basic knowledge of {skill_name}", "Advanced mathematics", "Graphic design", "Music theory"],
            "correct_option": 0
        },
        {
            "text": f"What role does {skill_name} play in software development?",
            "options": ["Important technical skill", "Marketing tool", "Legal framework", "Financial planning"],
            "correct_option": 0
        },
        {
            "text": f"Which statement best describes {skill_name}?",
            "options": [f"A key technology in {skill_name} domain", "A type of database", "A programming language", "A web browser"],
            "correct_option": 0
        },
        {
            "text": f"What is the primary purpose of {skill_name}?",
            "options": [f"To provide {skill_name} functionality", "To create graphics", "To manage emails", "To play videos"],
            "correct_option": 0
        },
        {
            "text": f"Which component is crucial in {skill_name}?",
            "options": [f"Core {skill_name} element", "Printer device", "Mouse input", "Speaker output"],
            "correct_option": 0
        },
        {
            "text": f"How is {skill_name} typically used?",
            "options": ["In technical applications", "For cooking recipes", "In sports", "For gardening"],
            "correct_option": 0
        },
        {
            "text": f"What makes {skill_name} important?",
            "options": ["Its technical significance", "Its color", "Its size", "Its weight"],
            "correct_option": 0
        },
        {
            "text": f"Which of these relates to {skill_name}?",
            "options": [f"{skill_name} concepts", "Weather patterns", "Animal species", "Car models"],
            "correct_option": 0
        },
        {
            "text": f"What should beginners learn first in {skill_name}?",
            "options": ["Basic fundamentals", "Advanced techniques", "Historical background", "Future trends"],
            "correct_option": 0
        }
    ]

    return templates
