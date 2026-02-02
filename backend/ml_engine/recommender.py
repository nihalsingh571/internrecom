from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Dict, Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
  """
  Clamp a numeric value into the [minimum, maximum] interval.
  Used to guarantee all scores stay between 0 and 1.
  """
  return max(minimum, min(maximum, value))


@dataclass
class MicroAssessment:
  """
  Represents a candidate's performance in micro assessments.

  All input values are expected in [0, 1].
  VSPS is computed using the provided formula and then clamped to [0, 1].
  """

  accuracy: float
  speed_score: float
  skip_penalty: float

  def normalized(self) -> "MicroAssessment":
    """
    Return a copy with all fields clamped to [0, 1].
    """
    return MicroAssessment(
      accuracy=_clamp(self.accuracy),
      speed_score=_clamp(self.speed_score),
      skip_penalty=_clamp(self.skip_penalty),
    )

  def vsps(self) -> float:
    """
    Compute Verified Skill Performance Score (VSPS).

    VSPS = (0.6 * accuracy) + (0.3 * speed_score) - (0.1 * skip_penalty)
    The final value is clamped into [0, 1].
    """
    normalized = self.normalized()
    raw_vsps = (
      0.6 * normalized.accuracy
      + 0.3 * normalized.speed_score
      - 0.1 * normalized.skip_penalty
    )
    return _clamp(raw_vsps)


@dataclass
class CandidateProfile:
  """
  Represents a candidate in the recommendation system.

  recency_score should be in [0, 1] (1 = very recent activity).
  """

  id: Optional[int]
  skills: List[str]
  micro_assessment: MicroAssessment
  recency_score: float = 1.0

  def normalized_recency(self) -> float:
    """
    Recency clamped into [0, 1].
    """
    return _clamp(self.recency_score)

  def skills_as_text(self) -> str:
    """
    Represent skills as a single string for TF-IDF.
    """
    return " ".join(self.skills)


@dataclass
class Internship:
  """
  Represents an internship opportunity.

  recruiter_rating is expected in [0, 1] if present.
  recency_score should be in [0, 1] (1 = very recent listing).
  """

  id: Optional[int]
  title: str
  description: str
  recruiter_rating: Optional[float] = None
  recency_score: float = 1.0

  def text_for_vectorization(self) -> str:
    """
    Combine title and description into a single text field for TF-IDF.
    """
    return f"{self.title} {self.description}"


class TrustCalculator:
  """
  Calculates Trust Score for an internship with respect to a candidate.

  If recruiter rating exists:
      AdjustedRR = recruiter_rating * confidence_factor
      Trust = 0.4*accuracy + 0.4*AdjustedRR + 0.2*recency
  Else:
      Trust = 0.7*accuracy + 0.3*recency
  """

  def __init__(self, confidence_factor: float = 1.0) -> None:
    # Confidence factor adjusts how much we trust recruiter_rating.
    self.confidence_factor = _clamp(confidence_factor)

  def compute_trust(
    self,
    accuracy: float,
    recency: float,
    recruiter_rating: Optional[float] = None,
  ) -> float:
    """
    Compute trust score for a candidate's match to an internship.

    All inputs are assumed to be in [0, 1]; the result is clamped into [0, 1].
    """
    accuracy_n = _clamp(accuracy)
    recency_n = _clamp(recency)

    if recruiter_rating is not None:
      recruiter_rating_n = _clamp(recruiter_rating)
      adjusted_rr = _clamp(recruiter_rating_n * self.confidence_factor)
      trust = 0.4 * accuracy_n + 0.4 * adjusted_rr + 0.2 * recency_n
    else:
      trust = 0.7 * accuracy_n + 0.3 * recency_n

    return _clamp(trust)


class RecommendationEngine:
  """
  Core recommendation engine that:
  - Builds TF-IDF vectors for candidate skills and internship descriptions.
  - Computes cosine similarity between candidate and each internship.
  - Combines cosine similarity, VSPS and TrustScore into a final score.
  """

  def __init__(self, trust_calculator: Optional[TrustCalculator] = None) -> None:
    self.vectorizer = TfidfVectorizer()
    self.trust_calculator = trust_calculator or TrustCalculator()

  def _build_tfidf(
    self,
    candidate: CandidateProfile,
    internships: List[Internship],
  ) -> np.ndarray:
    """
    Fit TF-IDF on candidate skills plus internship descriptions.

    Returns an array of cosine similarity scores between the candidate and
    each internship. All values are in [0, 1].
    """
    documents: List[str] = [candidate.skills_as_text()] + [
      internship.text_for_vectorization() for internship in internships
    ]

    tfidf_matrix = self.vectorizer.fit_transform(documents)

    candidate_vector = tfidf_matrix[0:1]
    internship_matrix = tfidf_matrix[1:]

    similarities = cosine_similarity(candidate_vector, internship_matrix)[0]
    similarities = np.clip(similarities, 0.0, 1.0)
    return similarities

  def recommend(
    self,
    candidate: CandidateProfile,
    internships: List[Internship],
    top_k: Optional[int] = None,
  ) -> List[Dict[str, Any]]:
    """
    Compute ranked recommendations.

    FinalScore = cosine_similarity * VSPS * TrustScore
    All intermediate and final scores are clamped to [0, 1].

    Returns a list of dictionaries:
    {
      "internship": Internship,
      "cosine_similarity": float,
      "vsps": float,
      "trust_score": float,
      "final_score": float,
    }
    """
    if not internships:
      return []

    vsps_value = candidate.micro_assessment.vsps()
    recency_value = candidate.normalized_recency()

    similarities = self._build_tfidf(candidate, internships)

    recommendations: List[Dict[str, Any]] = []

    for index, internship in enumerate(internships):
      cosine_sim = float(_clamp(float(similarities[index])))

      trust_score = self.trust_calculator.compute_trust(
        accuracy=candidate.micro_assessment.accuracy,
        recency=recency_value,
        recruiter_rating=internship.recruiter_rating,
      )

      final_score = float(np.clip(cosine_sim * vsps_value * trust_score, 0.0, 1.0))

      recommendations.append(
        {
          "internship": internship,
          "cosine_similarity": cosine_sim,
          "vsps": vsps_value,
          "trust_score": trust_score,
          "final_score": final_score,
        }
      )

    recommendations.sort(key=lambda item: item["final_score"], reverse=True)

    if top_k is not None:
      recommendations = recommendations[:top_k]

    return recommendations


def example_usage() -> None:
  """
  Standalone example to demonstrate the engine.

  This can be removed in production, but is useful for quick testing:
  `python -m ml_engine.recommender` (from your Django project root).
  """
  candidate = CandidateProfile(
    id=1,
    skills=["Python", "Django", "REST API"],
    micro_assessment=MicroAssessment(
      accuracy=0.9,
      speed_score=0.8,
      skip_penalty=0.1,
    ),
    recency_score=0.9,
  )

  internships = [
    Internship(
      id=101,
      title="Backend Developer Intern",
      description="Work on REST APIs using Python and Django in a microservices architecture.",
      recruiter_rating=0.85,
      recency_score=0.95,
    ),
    Internship(
      id=102,
      title="Data Science Intern",
      description="Use Python, Pandas, and machine learning techniques to analyze large datasets.",
      recruiter_rating=0.9,
      recency_score=0.8,
    ),
    Internship(
      id=103,
      title="Frontend React Intern",
      description="Build user interfaces with React and Tailwind CSS.",
      recruiter_rating=None,
      recency_score=1.0,
    ),
  ]

  engine = RecommendationEngine()
  results = engine.recommend(candidate, internships)

  for item in results:
    internship = item["internship"]
    print(
      f"{internship.title} (ID={internship.id}) -> "
      f"Final={item['final_score']:.4f}, "
      f"Cos={item['cosine_similarity']:.4f}, "
      f"VSPS={item['vsps']:.4f}, "
      f"Trust={item['trust_score']:.4f}",
    )


if __name__ == "__main__":
  example_usage()

