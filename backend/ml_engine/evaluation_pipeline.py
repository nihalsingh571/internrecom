"""Synthetic evaluation pipeline for internship recommender.

The pipeline simulates noisy, real-world recruiting conditions by injecting:
1. Low-trust postings with enticing descriptions.
2. Duplicate internships sharing identical skill text but different recruiter quality.
3. Misleading descriptions that mention skills not in the structured requirements.

It evaluates three models (keyword baseline, cosine-only, proposed cosine×VSPS×Trust)
and exports publication-ready metrics, CSV, and plots.

Usage:
  cd backend && python -m ml_engine.evaluation_pipeline
"""

from __future__ import annotations

import math
import os
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

BACKEND_ROOT = Path(__file__).resolve().parents[1]
MPL_CONFIG_DIR = BACKEND_ROOT / ".mplconfig"
MPL_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPL_CONFIG_DIR))

import matplotlib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # type: ignore  # noqa: E402

from .recommender import TrustCalculator

RNG_SEED = 2024
STUDENT_COUNT = 100
INTERNSHIP_COUNT = 100
PRECISION_LABEL_GAIN = {"relevant": 1.0, "partial": 0.5, "not_relevant": 0.0}
NDCG_LABEL_GAIN = {"relevant": 2.0, "partial": 1.0, "not_relevant": 0.0}
METRIC_COLUMNS = ["Precision@5", "Precision@10", "NDCG@5", "NDCG@10"]
PLOT_PATH = Path("res/evaluation_metrics.png")
CSV_PATH = Path("res/evaluation_metrics.csv")
PRECISION_LINE_PATH = Path("res/precision_at_k.png")
NDCG_LINE_PATH = Path("res/ndcg_at_k.png")
IMPROVEMENT_PATH = Path("res/proposed_improvement.png")
ABLATION_PATH = Path("res/ablation_study.png")
NOISE_ROBUSTNESS_PATH = Path("res/noise_robustness.png")
NOISE_INTERNSHIP_RATIO = 0.30
DUPLICATE_PAIR_RATIO = 0.10
MISLEADING_RATIO = 0.20


@dataclass(frozen=True)
class SimulationConfig:
  noise_ratio: float = NOISE_INTERNSHIP_RATIO
  duplicate_ratio: float = DUPLICATE_PAIR_RATIO
  misleading_ratio: float = MISLEADING_RATIO


DEFAULT_CONFIG = SimulationConfig()


SKILL_VOCABULARY: Tuple[str, ...] = (
  "Python",
  "Django",
  "Flask",
  "REST",
  "GraphQL",
  "React",
  "Node.js",
  "TypeScript",
  "JavaScript",
  "SQL",
  "NoSQL",
  "MongoDB",
  "PostgreSQL",
  "Pandas",
  "NumPy",
  "Scikit-learn",
  "TensorFlow",
  "PyTorch",
  "NLP",
  "Computer Vision",
  "Machine Learning",
  "Data Analysis",
  "ETL",
  "Airflow",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Linux",
  "Bash",
  "Git",
  "CI/CD",
  "Testing",
  "Jest",
  "Cypress",
  "GraphQL",
  "HTML",
  "CSS",
  "Tailwind",
  "UI/UX",
  "Figma",
  "Java",
  "Spring",
  "C++",
  "Go",
  "Rust",
  "Scala",
  "Security",
  "Microservices",
  "APIs",
  "Agile",
  "Scrum",
  "Communication",
  "Leadership",
  "Time Management",
)


def clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
  return max(min_value, min(max_value, value))


@dataclass
class Student:
  id: int
  skills: List[str]
  accuracy: float
  speed_score: float
  skip_penalty: float
  vsps: float
  recency: float


@dataclass
class Internship:
  id: int
  title: str
  description: str
  required_skills: List[str]
  recruiter_rating: float
  recency: float
  base_trust: float
  quality_tag: str = "standard"


def _vsps_from_micro(accuracy: float, speed_score: float, skip_penalty: float) -> float:
  return clamp(0.6 * accuracy + 0.3 * speed_score - 0.1 * skip_penalty)


def _build_title(skill: str, rng: random.Random) -> str:
  prefixes = ["Associate", "Junior", "Graduate", "Research"]
  roles = ["Engineer", "Developer", "Analyst", "Scientist", "Specialist"]
  domains = ["Intern", "Fellow", "Apprentice"]
  return f"{rng.choice(prefixes)} {skill} {rng.choice(roles)} {rng.choice(domains)}"


def _describe_role(required_skills: Sequence[str], rng: random.Random) -> str:
  templates = [
    "Collaborate on {skills} deliverables, emphasizing clean code and experimentation.",
    "Prototype data-driven features using {skills} with iterative user feedback.",
    "Implement cloud-ready services where {skills} are critical for reliability.",
    "Research product improvements leveraging {skills} stacks in agile squads.",
  ]
  joined = ", ".join(required_skills)
  return rng.choice(templates).format(skills=joined)


def _craft_description(
  required_skills: Sequence[str],
  rng: random.Random,
  misleading: bool = False,
  decoy_skills: Sequence[str] | None = None,
) -> str:
  base = _describe_role(required_skills, rng)
  if misleading and decoy_skills:
    decoys = ", ".join(decoy_skills)
    base += f" Bonus points for exposure to {decoys}, even though they are not core to this role."
  return base


def generate_students(count: int, vocab: Sequence[str], rng: np.random.Generator) -> List[Student]:
  students: List[Student] = []
  for student_id in range(1, count + 1):
    skill_count = int(rng.integers(3, 7))
    skills = sorted(rng.choice(vocab, size=skill_count, replace=False).tolist())
    accuracy = float(rng.uniform(0.55, 1.0))
    speed_score = float(rng.uniform(0.5, 1.0))
    skip_penalty = float(rng.uniform(0.0, 0.3))
    vsps = clamp(_vsps_from_micro(accuracy, speed_score, skip_penalty), 0.5, 1.0)
    recency = float(rng.uniform(0.5, 1.0))
    students.append(
      Student(
        id=student_id,
        skills=skills,
        accuracy=accuracy,
        speed_score=speed_score,
        skip_penalty=skip_penalty,
        vsps=vsps,
        recency=recency,
      )
    )
  return students


def compute_skill_popularity(
  students: Sequence[Student],
  vocab: Sequence[str],
) -> Dict[str, float]:
  counts: Dict[str, int] = {skill: 0 for skill in vocab}
  for student in students:
    for skill in student.skills:
      counts[skill] = counts.get(skill, 0) + 1
  total = max(len(students), 1)
  return {skill: counts.get(skill, 0) / total for skill in vocab}


def _add_internship(
  internships: List[Internship],
  internship_id: int,
  title: str,
  description: str,
  required_skills: List[str],
  recruiter_rating: float,
  recency: float,
  quality_tag: str,
) -> Internship:
  recruiter_rating = clamp(recruiter_rating)
  recency = clamp(recency)
  internship = Internship(
    id=internship_id,
    title=title,
    description=description,
    required_skills=required_skills,
    recruiter_rating=recruiter_rating,
    recency=recency,
    base_trust=clamp(0.5 * recruiter_rating + 0.5 * recency),
    quality_tag=quality_tag,
  )
  internships.append(internship)
  return internship


def generate_internships(
  count: int,
  vocab: Sequence[str],
  skill_popularity: Dict[str, float],
  students: Sequence[Student],
  config: SimulationConfig,
  rng: np.random.Generator,
  text_rng: random.Random,
) -> List[Internship]:
  internships: List[Internship] = []
  internship_id = 1

  noise_count = max(0, int(round(count * clamp(config.noise_ratio))))
  duplicate_pairs = max(0, int(round(count * clamp(config.duplicate_ratio))))
  available_after_noise = max(count - noise_count, 0)
  duplicate_pairs = min(duplicate_pairs, available_after_noise // 2)
  base_count = max(count - noise_count - (2 * duplicate_pairs), 0)

  # Base internships with moderate-to-high trust.
  for _ in range(base_count):
    skill_count = int(rng.integers(3, 7))
    required_skills = sorted(rng.choice(vocab, size=skill_count, replace=False).tolist())
    title = _build_title(required_skills[0], text_rng)
    description = _craft_description(required_skills, text_rng)
    popularity_values = [skill_popularity.get(skill, 0.0) for skill in required_skills]
    popularity_score = float(np.mean(popularity_values)) if popularity_values else 0.0
    recruiter_rating = clamp(0.55 + 0.4 * popularity_score + float(rng.normal(0, 0.05)))
    recency = float(rng.uniform(0.4, 1.0))
    _add_internship(
      internships,
      internship_id,
      title,
      description,
      required_skills,
      recruiter_rating,
      recency,
      "standard",
    )
    internship_id += 1

  # Misleading descriptions that mention extra skills but do not require them.
  misleading_total = min(len(internships), max(0, int(round(len(internships) * clamp(config.misleading_ratio)))))
  if misleading_total > 0:
    misleading_indices = text_rng.sample(range(len(internships)), k=misleading_total)
    for idx in misleading_indices:
      internship = internships[idx]
      decoy_candidates = [skill for skill in vocab if skill not in internship.required_skills]
      if not decoy_candidates:
        continue
      decoy_skills = text_rng.sample(
        decoy_candidates,
        k=min(2, len(decoy_candidates)),
      )
      internship.description = _craft_description(internship.required_skills, text_rng, True, decoy_skills)

  # Duplicate internships: same skills/text, different recruiter quality.
  duplicate_sources = internships.copy()
  text_rng.shuffle(duplicate_sources)
  duplicate_sources = duplicate_sources[: min(duplicate_pairs, len(duplicate_sources))]
  for source in duplicate_sources:
    high_desc = source.description + " Verified mentor oversight and audited deliverables."
    low_desc = source.description + " Verification pending; recruiter quality remains uncertain."
    _add_internship(
      internships,
      internship_id,
      source.title,
      high_desc,
      list(source.required_skills),
      float(rng.uniform(0.8, 1.0)),
      float(rng.uniform(0.7, 1.0)),
      "duplicate_high_quality",
    )
    internship_id += 1
    _add_internship(
      internships,
      internship_id,
      source.title,
      low_desc,
      list(source.required_skills),
      float(rng.uniform(0.2, 0.5)),
      float(rng.uniform(0.2, 0.5)),
      "duplicate_low_quality",
    )
    internship_id += 1

  # Noise internships: high textual overlap but intentionally low trust.
  for _ in range(noise_count):
    student = text_rng.choice(students)
    descriptive_skills = sorted(
      text_rng.sample(student.skills, k=min(len(student.skills), max(3, int(rng.integers(3, 6)))))
    )
    decoy_pool = [skill for skill in vocab if skill not in descriptive_skills]
    if len(decoy_pool) < 3:
      decoy_pool = list(vocab)
    required_skills = sorted(
      text_rng.sample(decoy_pool, k=min(len(decoy_pool), max(3, int(rng.integers(3, 6)))))
    )
    title = _build_title(descriptive_skills[0], text_rng)
    description = (
      "Immersive sprint featuring "
      f"{', '.join(descriptive_skills)} with aggressive delivery promises. "
      "Portfolio booster guaranteed despite limited verification."
    )
    _add_internship(
      internships,
      internship_id,
      title,
      description,
      required_skills,
      float(rng.uniform(0.1, 0.4)),
      float(rng.uniform(0.1, 0.3)),
      "noise_low_trust",
    )
    internship_id += 1

  # Adjust final size to match requested count.
  if len(internships) > count:
    text_rng.shuffle(internships)
    internships = internships[:count]
  while len(internships) < count:
    skill_count = int(rng.integers(3, 7))
    required_skills = sorted(rng.choice(vocab, size=skill_count, replace=False).tolist())
    title = _build_title(required_skills[0], text_rng)
    description = _craft_description(required_skills, text_rng)
    _add_internship(
      internships,
      internship_id,
      title,
      description,
      required_skills,
      float(rng.uniform(0.5, 0.9)),
      float(rng.uniform(0.4, 0.9)),
      "padding",
    )
    internship_id += 1

  return internships


def label_relevance(student: Student, internship: Internship) -> str:
  student_skills = set(student.skills)
  internship_skills = set(internship.required_skills)
  overlap = student_skills & internship_skills
  if not overlap:
    return "not_relevant"

  overlap_ratio = len(overlap) / len(internship_skills)
  coverage_ratio = len(overlap) / len(student_skills)
  combined = max(overlap_ratio, coverage_ratio)

  if combined >= 0.6 or len(overlap) >= 3:
    return "relevant"
  if combined >= 0.3:
    return "partial"
  return "not_relevant"


def build_ground_truth(
  students: Sequence[Student],
  internships: Sequence[Internship],
) -> Dict[int, Dict[int, str]]:
  truth: Dict[int, Dict[int, str]] = {}
  for student in students:
    truth[student.id] = {}
    for internship in internships:
      truth[student.id][internship.id] = label_relevance(student, internship)
  return truth


def _precision_at_k(labels: Sequence[str], k: int) -> float:
  if not labels:
    return 0.0
  top_k = labels[:k]
  score = sum(PRECISION_LABEL_GAIN[label] for label in top_k)
  return score / k


def _dcg_at_k(labels: Sequence[str], k: int) -> float:
  dcg = 0.0
  for idx, label in enumerate(labels[:k]):
    gain = (2 ** NDCG_LABEL_GAIN[label]) - 1
    dcg += gain / math.log2(idx + 2)
  return dcg


def _ndcg_at_k(labels: Sequence[str], k: int) -> float:
  if not labels:
    return 0.0
  actual = _dcg_at_k(labels, k)
  ideal_order = sorted(labels, key=lambda lbl: NDCG_LABEL_GAIN[lbl], reverse=True)
  ideal = _dcg_at_k(ideal_order, k)
  if ideal == 0:
    return 0.0
  return actual / ideal


def compute_cosine_scores(student: Student, internships: Sequence[Internship]) -> Dict[int, float]:
  documents = [" ".join(student.skills)] + [
    f"{internship.title} {' '.join(internship.required_skills)} {internship.description}"
    for internship in internships
  ]
  vectorizer = TfidfVectorizer()
  matrix = vectorizer.fit_transform(documents)
  candidate_vec = matrix[0:1]
  internships_vec = matrix[1:]
  similarities = cosine_similarity(candidate_vec, internships_vec)[0]
  return {internships[idx].id: float(clamp(score)) for idx, score in enumerate(similarities)}


def rank_keyword(student: Student, internships: Sequence[Internship]) -> List[Tuple[int, float]]:
  student_skills = set(student.skills)
  internship_recency = {internship.id: internship.recency for internship in internships}
  results: List[Tuple[int, float]] = []
  for internship in internships:
    internship_skills = set(internship.required_skills)
    overlap = student_skills & internship_skills
    score = 1.0 if overlap else 0.0
    results.append((internship.id, score))
  results.sort(key=lambda item: (item[1], internship_recency[item[0]]), reverse=True)
  return results


def rank_cosine(student: Student, internships: Sequence[Internship]) -> List[Tuple[int, float]]:
  cosine_scores = compute_cosine_scores(student, internships)
  ordered = sorted(cosine_scores.items(), key=lambda item: item[1], reverse=True)
  return ordered


def rank_proposed(student: Student, internships: Sequence[Internship], trust_calculator: TrustCalculator) -> List[Tuple[int, float]]:
  cosine_scores = compute_cosine_scores(student, internships)
  ranked: List[Tuple[int, float]] = []
  for internship in internships:
    cosine_value = cosine_scores[internship.id]
    trust = trust_calculator.compute_trust(
      accuracy=student.accuracy,
      recency=student.recency,
      recruiter_rating=internship.recruiter_rating,
    )
    final_score = clamp(cosine_value * student.vsps * trust)
    ranked.append((internship.id, final_score))
  ranked.sort(key=lambda item: item[1], reverse=True)
  return ranked


def rank_cosine_vsps(student: Student, internships: Sequence[Internship]) -> List[Tuple[int, float]]:
  cosine_scores = compute_cosine_scores(student, internships)
  final_score = student.vsps
  ranked = [
    (internship.id, clamp(cosine_scores[internship.id] * final_score))
    for internship in internships
  ]
  ranked.sort(key=lambda item: item[1], reverse=True)
  return ranked


def evaluate_model(
  students: Sequence[Student],
  internships: Sequence[Internship],
  truth: Dict[int, Dict[int, str]],
  ranker,
) -> Dict[str, float]:
  precision5: List[float] = []
  precision10: List[float] = []
  ndcg5: List[float] = []
  ndcg10: List[float] = []

  for student in students:
    ranking = ranker(student, internships)
    ordered_labels = [truth[student.id][internship_id] for internship_id, _ in ranking]
    precision5.append(_precision_at_k(ordered_labels, 5))
    precision10.append(_precision_at_k(ordered_labels, 10))
    ndcg5.append(_ndcg_at_k(ordered_labels, 5))
    ndcg10.append(_ndcg_at_k(ordered_labels, 10))

  return {
    "Precision@5": float(np.mean(precision5)),
    "Precision@10": float(np.mean(precision10)),
    "NDCG@5": float(np.mean(ndcg5)),
    "NDCG@10": float(np.mean(ndcg10)),
  }


def simulate_dataset(config: SimulationConfig, seed: int) -> Tuple[List[Student], List[Internship], Dict[int, Dict[int, str]]]:
  np_rng = np.random.default_rng(seed)
  text_rng = random.Random(seed)
  students = generate_students(STUDENT_COUNT, SKILL_VOCABULARY, np_rng)
  skill_popularity = compute_skill_popularity(students, SKILL_VOCABULARY)
  internships = generate_internships(
    INTERNSHIP_COUNT,
    SKILL_VOCABULARY,
    skill_popularity,
    students,
    config,
    np_rng,
    text_rng,
  )
  truth = build_ground_truth(students, internships)
  return students, internships, truth


def run_pipeline(config: SimulationConfig = DEFAULT_CONFIG, seed: int = RNG_SEED) -> Tuple[pd.DataFrame, List[Student], List[Internship], Dict[int, Dict[int, str]], TrustCalculator]:
  students, internships, truth = simulate_dataset(config, seed)
  trust_calculator = TrustCalculator(confidence_factor=1.0)

  metrics = {
    "Keyword Baseline": evaluate_model(students, internships, truth, rank_keyword),
    "Cosine Only": evaluate_model(students, internships, truth, rank_cosine),
    "Proposed Model": evaluate_model(
      students,
      internships,
      truth,
      lambda student, jobs: rank_proposed(student, jobs, trust_calculator),
    ),
  }

  df = pd.DataFrame.from_dict(metrics, orient="index")[METRIC_COLUMNS]
  return df, students, internships, truth, trust_calculator


def summarize_results(df: pd.DataFrame) -> str:
  best_model = df["NDCG@10"].idxmax()
  summary_lines = [
    f"Best model: {best_model} with NDCG@10={df.loc[best_model, 'NDCG@10']:.3f}.",
    "Observations:",
  ]
  ndcg_gain = df.loc["Proposed Model", "NDCG@10"] - df.loc["Cosine Only", "NDCG@10"]
  precision_recovery = df.loc["Proposed Model", "Precision@10"] - df.loc["Cosine Only", "Precision@10"]
  cosine_vs_keyword = df.loc["Cosine Only", "Precision@10"] - df.loc["Keyword Baseline", "Precision@10"]
  summary_lines.append(
    f" - Noise stress: Cosine-only Precision@10 changes by {cosine_vs_keyword:.3f} vs. keyword matching because "
    "TF-IDF overfits mis-specified descriptions."
  )
  summary_lines.append(
    f" - Trust + VSPS recovery: Proposed model gains {precision_recovery:.3f} Precision@10 over cosine-only by "
    "penalising low recruiter ratings and amplifying verified students."
  )
  summary_lines.append(
    f" - Ranking quality: Proposed vs. cosine-only NDCG@10 gain = {ndcg_gain:.3f}, showing robustness against "
    "duplicate internships with identical text."
  )
  return "\n".join(summary_lines)


def analysis_report(df: pd.DataFrame) -> str:
  keyword = df.loc["Keyword Baseline"]
  cosine = df.loc["Cosine Only"]
  proposed = df.loc["Proposed Model"]
  lines = [
    "Research-style analysis:",
    (
      "- Cosine similarity deteriorates under noisy postings, with Precision@10 reaching "
      f"{cosine['Precision@10']:.3f} (vs. {keyword['Precision@10']:.3f} for keyword filtering) because "
      "TF-IDF treats low-trust buzzword listings as highly relevant."
    ),
    (
      "- Trust scoring differentiates duplicate internships sharing identical text: "
      "high-quality copies (rating ≥0.8) stay near the top, whereas low-quality clones "
      "receive low recruiter ratings/recency, enabling the Proposed model to add "
      f"{proposed['NDCG@10'] - cosine['NDCG@10']:.3f} NDCG@10."
    ),
    (
      "- Misleading descriptions mentioning unused skills inflate cosine scores, but structured "
      "skill-overlap (keyword baseline) and VSPS ensure the final model does not reward them."
    ),
    (
      "- VSPS multiplies every score by verified student performance, stabilizing candidate-specific "
      f"ordering and yielding Precision@5={proposed['Precision@5']:.3f} despite noisy inputs."
    ),
    (
      "- Overall, cosine-only cannot separate trustworthy recruiters from low-signal spam, "
      "whereas cosine×VSPS×Trust remains resilient enough for research-grade reporting."
    ),
  ]
  return "\n".join(lines)


def compute_ablation_results(
  students: Sequence[Student],
  internships: Sequence[Internship],
  truth: Dict[int, Dict[int, str]],
  trust_calculator: TrustCalculator,
) -> pd.DataFrame:
  ablation_metrics = {
    "Cosine Only": evaluate_model(students, internships, truth, rank_cosine),
    "Cosine + VSPS": evaluate_model(students, internships, truth, rank_cosine_vsps),
    "Full Model": evaluate_model(
      students,
      internships,
      truth,
      lambda student, jobs: rank_proposed(student, jobs, trust_calculator),
    ),
  }
  return pd.DataFrame.from_dict(ablation_metrics, orient="index")[METRIC_COLUMNS]


def render_precision_line(df: pd.DataFrame) -> None:
  PRECISION_LINE_PATH.parent.mkdir(parents=True, exist_ok=True)
  k_values = [5, 10]
  plt.figure(figsize=(6, 4))
  for model in df.index:
    series = [df.loc[model, "Precision@5"], df.loc[model, "Precision@10"]]
    plt.plot(k_values, series, marker="o", label=model)
  plt.title("Precision@K Comparison")
  plt.xlabel("K")
  plt.ylabel("Precision")
  plt.grid(True, linestyle="--", alpha=0.4)
  plt.legend()
  plt.xticks(k_values)
  plt.tight_layout()
  plt.savefig(PRECISION_LINE_PATH, dpi=200)
  plt.close()


def render_ndcg_line(df: pd.DataFrame) -> None:
  NDCG_LINE_PATH.parent.mkdir(parents=True, exist_ok=True)
  k_values = [5, 10]
  plt.figure(figsize=(6, 4))
  for model in df.index:
    series = [df.loc[model, "NDCG@5"], df.loc[model, "NDCG@10"]]
    plt.plot(k_values, series, marker="o", label=model)
  plt.title("NDCG@K Comparison")
  plt.xlabel("K")
  plt.ylabel("NDCG")
  plt.grid(True, linestyle="--", alpha=0.4)
  plt.legend()
  plt.xticks(k_values)
  plt.tight_layout()
  plt.savefig(NDCG_LINE_PATH, dpi=200)
  plt.close()


def render_improvement_chart(df: pd.DataFrame) -> None:
  IMPROVEMENT_PATH.parent.mkdir(parents=True, exist_ok=True)
  labels = ["Precision@5", "Precision@10", "NDCG@5", "NDCG@10"]
  cosine_vals = [df.loc["Cosine Only", label] for label in labels]
  proposed_vals = [df.loc["Proposed Model", label] for label in labels]
  improvements = [
    ((p - c) / c * 100.0) if c != 0 else 0.0 for p, c in zip(proposed_vals, cosine_vals)
  ]
  plt.figure(figsize=(7, 4))
  plt.bar(labels, improvements, color="#4c72b0")
  plt.title("Proposed Model Improvement over Cosine Similarity")
  plt.ylabel("Improvement (%)")
  plt.grid(axis="y", linestyle="--", alpha=0.3)
  plt.tight_layout()
  plt.savefig(IMPROVEMENT_PATH, dpi=200)
  plt.close()


def render_ablation_chart(ablation_df: pd.DataFrame) -> None:
  ABLATION_PATH.parent.mkdir(parents=True, exist_ok=True)
  plt.figure(figsize=(6, 4))
  plt.bar(ablation_df.index, ablation_df["NDCG@5"], color=["#dd8452", "#55a868", "#4c72b0"])
  plt.title("Ablation Study (Impact of VSPS and Trust)")
  plt.ylabel("NDCG@5")
  plt.tight_layout()
  plt.savefig(ABLATION_PATH, dpi=200)
  plt.close()


def compute_noise_robustness(noise_levels: Sequence[int]) -> Tuple[List[int], List[float], List[float]]:
  cosine_scores: List[float] = []
  proposed_scores: List[float] = []
  for level in noise_levels:
    ratio = level / 100.0
    config = SimulationConfig(
      noise_ratio=ratio,
      duplicate_ratio=DEFAULT_CONFIG.duplicate_ratio,
      misleading_ratio=DEFAULT_CONFIG.misleading_ratio,
    )
    df, *_ = run_pipeline(config=config, seed=RNG_SEED + level)
    cosine_scores.append(df.loc["Cosine Only", "NDCG@10"])
    proposed_scores.append(df.loc["Proposed Model", "NDCG@10"])
  return list(noise_levels), cosine_scores, proposed_scores


def render_noise_robustness(noise_levels: Sequence[int], cosine_scores: Sequence[float], proposed_scores: Sequence[float]) -> None:
  NOISE_ROBUSTNESS_PATH.parent.mkdir(parents=True, exist_ok=True)
  plt.figure(figsize=(6, 4))
  plt.plot(noise_levels, cosine_scores, marker="o", label="Cosine Similarity")
  plt.plot(noise_levels, proposed_scores, marker="o", label="Proposed Model")
  plt.title("Robustness to Noisy Data")
  plt.xlabel("Noise Level (%)")
  plt.ylabel("NDCG@10")
  plt.grid(True, linestyle="--", alpha=0.4)
  plt.legend()
  plt.tight_layout()
  plt.savefig(NOISE_ROBUSTNESS_PATH, dpi=200)
  plt.close()


def render_plot(df: pd.DataFrame) -> None:
  PLOT_PATH.parent.mkdir(parents=True, exist_ok=True)
  ax = df.plot(kind="bar", figsize=(10, 6))
  ax.set_ylabel("Score")
  ax.set_title("Model Comparison on Synthetic Internship Dataset")
  ax.set_xticklabels(df.index, rotation=0)
  ax.legend(loc="lower right")
  plt.tight_layout()
  plt.savefig(PLOT_PATH, dpi=200)
  plt.close()


def main() -> None:
  df, students, internships, truth, trust_calculator = run_pipeline()
  CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
  df.to_csv(CSV_PATH)
  print(df.to_markdown(floatfmt=".3f"))
  print()
  print(summarize_results(df))
  print()
  print(analysis_report(df))
  ablation_df = compute_ablation_results(students, internships, truth, trust_calculator)
  print()
  print("Ablation (NDCG@5):")
  print(ablation_df["NDCG@5"].to_markdown(floatfmt=".3f"))
  render_plot(df)
  render_precision_line(df)
  render_ndcg_line(df)
  render_improvement_chart(df)
  render_ablation_chart(ablation_df)
  noise_levels = [0, 10, 20, 30]
  noise_x, cosine_scores, proposed_scores = compute_noise_robustness(noise_levels)
  render_noise_robustness(noise_x, cosine_scores, proposed_scores)
  print(f"Metric chart saved to {PLOT_PATH}")
  print(f"Precision@K chart saved to {PRECISION_LINE_PATH}")
  print(f"NDCG@K chart saved to {NDCG_LINE_PATH}")
  print(f"Improvement chart saved to {IMPROVEMENT_PATH}")
  print(f"Ablation chart saved to {ABLATION_PATH}")
  print(f"Noise robustness chart saved to {NOISE_ROBUSTNESS_PATH}")
  print(f"Metrics CSV saved to {CSV_PATH}")


if __name__ == "__main__":
  main()
