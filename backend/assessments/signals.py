from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Skill, Question
from .utils import save_questions
from .gemini_generator import generate_questions_with_gemini, generate_default_questions
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Skill)
def generate_skill_questions(sender, instance, created, **kwargs):
    """
    Automatically generate questions for a newly created skill.
    """
    if created:
        # Check if questions already exist (shouldn't happen for new skill, but safety check)
        if Question.objects.filter(skill=instance).exists():
            logger.warning(f"Questions already exist for skill {instance.name}, skipping generation")
            return

        try:
            # Try to generate questions with Gemini
            logger.info(f"Generating questions with Gemini for skill: {instance.name}")
            questions = generate_questions_with_gemini(instance.name)
            generation_method = "AI"
        except Exception as e:
            # Fallback to default questions
            logger.warning(f"Gemini generation failed for skill {instance.name}: {e}")
            logger.info(f"Using fallback question generation for skill: {instance.name}")
            questions = generate_default_questions(instance.name)
            generation_method = "fallback"

        # Save questions to database
        try:
            save_questions(instance, questions)
            logger.info(f"Successfully saved {len(questions)} questions for skill {instance.name} using {generation_method}")
        except Exception as e:
            logger.error(f"Failed to save questions for skill {instance.name}: {e}")
            # Don't raise exception to avoid breaking skill creation