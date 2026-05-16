"""Gemini AI question generator with adaptive difficulty.

Implements the Gemini Adaptive Questioning enhancement (proposal §7):
- 'easy'   → beginner/conceptual questions (accuracy < 0.50 or first attempt)
- 'medium' → applied, scenario-based questions (0.50 ≤ accuracy ≤ 0.80)
- 'hard'   → complex, multi-step scenario questions (accuracy > 0.80)

Usage:
    from .gemini_generator import generate_questions_with_gemini, determine_next_difficulty
"""

import os
import json
from typing import List, Dict, Any, Literal

try:
    import google.genai as genai
except ModuleNotFoundError:  # pragma: no cover
    genai = None

DifficultyLevel = Literal['easy', 'medium', 'hard']


def determine_next_difficulty(last_accuracy: float) -> DifficultyLevel:
    """Return the adaptive difficulty level for the next assessment.

    Proposal §7 Difficulty Adaptation Logic:
        accuracy > 0.80  → 'hard'   (harder, scenario-based, higher VSPS weight)
        accuracy < 0.50  → 'easy'   (easier, conceptual fundamentals)
        otherwise        → 'medium' (applied scenarios)

    Args:
        last_accuracy: Candidate's accuracy score from the last assessment (0–1).

    Returns:
        Difficulty level string: 'easy', 'medium', or 'hard'.
    """
    if last_accuracy > 0.80:
        return 'hard'
    if last_accuracy < 0.50:
        return 'easy'
    return 'medium'


def _build_difficulty_prompt(skill_name: str, difficulty: DifficultyLevel) -> str:
    """Build a Gemini prompt tailored to the requested difficulty level."""
    difficulty_instructions: Dict[DifficultyLevel, str] = {
        'easy': (
            "Generate 10 BEGINNER-LEVEL multiple choice questions. "
            "Focus on fundamental concepts, definitions, and basic usage. "
            "Avoid complex scenarios or advanced features."
        ),
        'medium': (
            "Generate 10 INTERMEDIATE-LEVEL multiple choice questions. "
            "Include applied, scenario-based questions that require practical understanding. "
            "Mix conceptual questions with realistic use-case scenarios."
        ),
        'hard': (
            "Generate 10 ADVANCED-LEVEL multiple choice questions. "
            "Focus on complex, multi-step scenarios, edge cases, performance trade-offs, "
            "and architectural decisions. Questions should challenge experienced practitioners."
        ),
    }

    instruction = difficulty_instructions[difficulty]

    return f"""{instruction} The skill is: {skill_name}.

Return strictly in JSON format:

[
{{
  "text": "Question text here?",
  "options": ["Correct answer", "Wrong option 1", "Wrong option 2", "Wrong option 3"],
  "correct_option": 0
}}
]

Rules:
* exactly 10 questions
* exactly 4 options each
* correct_option must be index 0-3
* questions must test {difficulty}-level knowledge of {skill_name}
* ensure correct_option points to the correct answer
* do NOT include markdown or code fences in the response — raw JSON only"""


def generate_questions_with_gemini(
    skill_name: str,
    difficulty: DifficultyLevel = 'easy',
) -> List[Dict[str, Any]]:
    """Generate 10 MCQ questions for a skill using Gemini AI.

    Implements proposal §7 adaptive questioning: pass the difficulty level
    determined by ``determine_next_difficulty()`` to personalise the question set.

    Args:
        skill_name: The skill to generate questions for.
        difficulty: Difficulty level — 'easy', 'medium', or 'hard'.

    Returns:
        List of question dicts with 'text', 'options', 'correct_option', 'difficulty'.

    Raises:
        Exception: If the API call fails or returns invalid data.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY environment variable not set")

    if genai is None:
        raise ImportError(
            "google-genai package is not installed. "
            "Install it with: pip install google-genai"
        )

    client = genai.Client(api_key=api_key)
    prompt = _build_difficulty_prompt(skill_name, difficulty)

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
        )
        response_text = response.text.strip()

        # Strip markdown fences if the model wraps the JSON anyway
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        questions = json.loads(response_text)

        if not isinstance(questions, list) or len(questions) != 10:
            raise Exception("Invalid response: expected list of exactly 10 questions")

        for i, q in enumerate(questions):
            if not all(key in q for key in ['text', 'options', 'correct_option']):
                raise Exception(f"Question {i + 1} missing required fields")
            if not isinstance(q['options'], list) or len(q['options']) != 4:
                raise Exception(f"Question {i + 1} must have exactly 4 options")
            if not isinstance(q['correct_option'], int) or not (0 <= q['correct_option'] <= 3):
                raise Exception(f"Question {i + 1} correct_option must be 0-3")
            # Attach difficulty so it can be saved to Question.difficulty
            q['difficulty'] = difficulty

        return questions

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse Gemini JSON response: {e}")
    except Exception as e:
        raise Exception(f"Gemini API error: {e}")


def generate_default_questions(
    skill_name: str,
    difficulty: DifficultyLevel = 'easy',
) -> List[Dict[str, Any]]:
    """Generate 10 fallback MCQ questions when Gemini is unavailable.

    Args:
        skill_name: The skill name.
        difficulty: Difficulty level applied to the returned questions.

    Returns:
        List of question dicts — all fields including 'difficulty' are populated.
    """
    # Fallback templates vary by difficulty tier
    if difficulty == 'hard':
        templates = [
            {
                "text": f"In a production {skill_name} system handling 10k req/s, what is the primary bottleneck?",
                "options": [f"Optimized {skill_name} layer", "Network latency", "Disk I/O", "CPU cache"],
                "correct_option": 0,
            },
            {
                "text": f"Which architectural pattern best scales {skill_name} across distributed nodes?",
                "options": [f"Event-driven {skill_name}", "Monolithic design", "Batch processing", "Polling"],
                "correct_option": 0,
            },
            {
                "text": f"What trade-off must be considered when optimising {skill_name} for low latency?",
                "options": ["Consistency vs availability", "Color vs size", "Weight vs height", "Font vs color"],
                "correct_option": 0,
            },
            {
                "text": f"Which advanced feature of {skill_name} prevents race conditions?",
                "options": [f"{skill_name} locking/synchronisation", "Manual restarts", "Log rotation", "UI theming"],
                "correct_option": 0,
            },
            {
                "text": f"How would you debug a memory leak in a {skill_name} service?",
                "options": ["Profiling and heap analysis", "Rebooting the server", "Changing colours", "Adding more RAM"],
                "correct_option": 0,
            },
            {
                "text": f"What is the best strategy for zero-downtime deployment of {skill_name}?",
                "options": ["Blue-green deployment", "Full server shutdown", "Manual file copy", "DNS polling"],
                "correct_option": 0,
            },
            {
                "text": f"Which observability tool is most effective for tracing {skill_name} microservices?",
                "options": ["Distributed tracing (e.g. Jaeger)", "Notepad logs", "Email alerts", "Browser DevTools"],
                "correct_option": 0,
            },
            {
                "text": f"What happens to {skill_name} throughput when connection pooling is misconfigured?",
                "options": ["Degraded performance and timeouts", "Faster response times", "More memory", "Better UI"],
                "correct_option": 0,
            },
            {
                "text": f"How does horizontal scaling affect {skill_name} session management?",
                "options": ["Requires distributed session store", "No effect", "Removes sessions", "Doubles speed"],
                "correct_option": 0,
            },
            {
                "text": f"Which security vulnerability most commonly affects {skill_name} APIs?",
                "options": ["Injection attacks / broken auth", "Slow animations", "Missing icons", "Wrong fonts"],
                "correct_option": 0,
            },
        ]
    elif difficulty == 'medium':
        templates = [
            {
                "text": f"In a real-world project, how would you structure {skill_name} for maintainability?",
                "options": [f"Modular {skill_name} architecture", "Single large file", "No structure", "Random files"],
                "correct_option": 0,
            },
            {
                "text": f"Which design pattern is commonly used with {skill_name}?",
                "options": [f"Standard {skill_name} pattern", "Anti-pattern", "No pattern", "Random approach"],
                "correct_option": 0,
            },
            {
                "text": f"How do you handle errors in a {skill_name} application?",
                "options": ["Proper error handling and logging", "Ignore errors", "Restart always", "Delete logs"],
                "correct_option": 0,
            },
            {
                "text": f"What is a practical use case for {skill_name} in backend development?",
                "options": [f"Building scalable {skill_name} services", "Designing logos", "Writing poetry", "Drawing charts"],
                "correct_option": 0,
            },
            {
                "text": f"Which tool pairs best with {skill_name} for testing?",
                "options": [f"{skill_name}-compatible test framework", "Paintbrush", "Calculator", "Spreadsheet"],
                "correct_option": 0,
            },
            {
                "text": f"What is the recommended way to configure {skill_name} for production?",
                "options": ["Environment variables and secrets manager", "Hardcode credentials", "Use defaults", "No config"],
                "correct_option": 0,
            },
            {
                "text": f"How does caching improve {skill_name} performance?",
                "options": ["Reduces repeated computation / DB hits", "Slows it down", "No effect", "Deletes data"],
                "correct_option": 0,
            },
            {
                "text": f"Which version control strategy suits a {skill_name} team?",
                "options": ["Feature branching with CI/CD", "No version control", "Email patches", "Manual copies"],
                "correct_option": 0,
            },
            {
                "text": f"What metric indicates healthy {skill_name} API performance?",
                "options": ["Low p99 latency", "High error rate", "Zero requests", "Many timeouts"],
                "correct_option": 0,
            },
            {
                "text": f"How do you ensure {skill_name} code is maintainable long-term?",
                "options": ["Code reviews, tests, documentation", "No reviews", "Delete old code", "Rename files"],
                "correct_option": 0,
            },
        ]
    else:  # easy / default
        templates = [
            {
                "text": f"What is a fundamental concept in {skill_name}?",
                "options": [f"Core principle of {skill_name}", "Unrelated technology", "Hardware component", "Network protocol"],
                "correct_option": 0,
            },
            {
                "text": f"Which of the following is essential for {skill_name}?",
                "options": [f"Basic knowledge of {skill_name}", "Advanced mathematics", "Graphic design", "Music theory"],
                "correct_option": 0,
            },
            {
                "text": f"What role does {skill_name} play in software development?",
                "options": ["Important technical skill", "Marketing tool", "Legal framework", "Financial planning"],
                "correct_option": 0,
            },
            {
                "text": f"Which statement best describes {skill_name}?",
                "options": [f"A key technology in {skill_name} domain", "A type of database", "A programming language", "A web browser"],
                "correct_option": 0,
            },
            {
                "text": f"What is the primary purpose of {skill_name}?",
                "options": [f"To provide {skill_name} functionality", "To create graphics", "To manage emails", "To play videos"],
                "correct_option": 0,
            },
            {
                "text": f"Which component is crucial in {skill_name}?",
                "options": [f"Core {skill_name} element", "Printer device", "Mouse input", "Speaker output"],
                "correct_option": 0,
            },
            {
                "text": f"How is {skill_name} typically used?",
                "options": ["In technical applications", "For cooking recipes", "In sports", "For gardening"],
                "correct_option": 0,
            },
            {
                "text": f"What makes {skill_name} important?",
                "options": ["Its technical significance", "Its color", "Its size", "Its weight"],
                "correct_option": 0,
            },
            {
                "text": f"Which of these relates to {skill_name}?",
                "options": [f"{skill_name} concepts", "Weather patterns", "Animal species", "Car models"],
                "correct_option": 0,
            },
            {
                "text": f"What should beginners learn first in {skill_name}?",
                "options": ["Basic fundamentals", "Advanced techniques", "Historical background", "Future trends"],
                "correct_option": 0,
            },
        ]

    for q in templates:
        q['difficulty'] = difficulty
    return templates
