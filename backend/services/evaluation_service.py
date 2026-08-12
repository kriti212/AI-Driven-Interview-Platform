"""
evaluation_service.py
---------------------
Evaluates candidate responses using LLM evaluation for:
1. Technical Accuracy & Depth against Golden Answer & Keywords
2. Soft Skills & Communication Quality
3. Anti-Bluffing Enforcement & Rubric Evaluation
4. Strict Conservative Fallback Answer Evaluation System (used ONLY when LLM is unavailable)
   Objective: Prevent gibberish or keyword-stuffed answers from receiving high scores.
"""

import math
import re
import json
import logging
from typing import Dict, List, Any, Set, Tuple

from services.llm_service import generate_llm_response

logger = logging.getLogger("uvicorn")

# Optional offline sentence transformer embedding model
ST_MODEL = None
try:
    from sentence_transformers import SentenceTransformer, util
    ST_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("SentenceTransformer offline embedding model loaded successfully.")
except Exception as st_err:
    logger.info(f"SentenceTransformer not initialized ({st_err}). Fallback will use rule-based TF-IDF and N-gram similarity.")


ENGLISH_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
    "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
    "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
    "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
    "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i'ive", "if", "in", "into", "is", "isn't",
    "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
    "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
    "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
    "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those",
    "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll",
    "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd",
    "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
}

COMMON_TECHNICAL_CONNECTORS = {
    "using", "used", "uses", "use", "method", "function", "value", "values", "data",
    "features", "feature", "input", "output", "result", "results", "calculate",
    "calculated", "calculates", "calculating", "subtracting", "subtracted", "subtract",
    "adding", "added", "add", "dividing", "divided", "divide", "multiplying",
    "multiplied", "multiply", "return", "returns", "returning", "apply", "applied",
    "applies", "applying", "given", "defined", "find", "finds", "finding", "get", "gets",
    "getting", "perform", "performs", "performing", "type", "types", "case", "cases",
    "way", "ways", "process", "processing", "step", "steps", "algorithm", "technique"
}


def normalize_text(text: str) -> str:
    """Step 1: Normalize text (lowercase, remove punctuation, trim spaces)."""
    if not text:
        return ""
    lowered = text.lower()
    no_punct = re.sub(r'[^\w\s]', ' ', lowered)
    normalized = re.sub(r'\s+', ' ', no_punct).strip()
    return normalized


def tokenize(text: str) -> List[str]:
    """Tokenizes text into lowercase alphanumeric words."""
    norm = normalize_text(text)
    return norm.split() if norm else []


def extract_keywords_and_concepts(gold_answer: str, expected_keywords: str) -> Set[str]:
    """Step 2: Extract important keywords/concepts from gold answer and explicit keywords."""
    keywords = set()

    if expected_keywords:
        for kw in expected_keywords.split(","):
            kw_clean = normalize_text(kw)
            if kw_clean:
                keywords.add(kw_clean)
                for part in kw_clean.split():
                    if part not in ENGLISH_STOPWORDS and len(part) > 1:
                        keywords.add(part)

    if gold_answer:
        gold_tokens = tokenize(gold_answer)
        for token in gold_tokens:
            if token not in ENGLISH_STOPWORDS and len(token) > 1:
                keywords.add(token)

    return keywords


def is_token_matched(token: str, gold_keywords: Set[str]) -> bool:
    """Stem & connector matching check."""
    if token in gold_keywords:
        return True
    if token in COMMON_TECHNICAL_CONNECTORS:
        return True
    if len(token) >= 4:
        stem = token[:4]
        for gk in gold_keywords:
            if len(gk) >= 4 and (gk[:4] == stem or gk in token or token in gk):
                return True
    return False


def compute_keyword_overlap(user_tokens: List[str], gold_keywords: Set[str]) -> Tuple[float, float, float, float]:
    """
    Step 3: Compute keyword overlap (Precision, Recall, F1, Jaccard).
    """
    if not user_tokens or not gold_keywords:
        return 0.0, 0.0, 0.0, 0.0

    user_non_stopwords = [t for t in user_tokens if t not in ENGLISH_STOPWORDS]
    user_kw_set = set(user_non_stopwords)

    if not user_kw_set:
        return 0.0, 0.0, 0.0, 0.0

    matched = {t for t in user_kw_set if is_token_matched(t, gold_keywords)}
    matched_count = len(matched)

    precision = matched_count / len(user_kw_set)
    recall = matched_count / max(1, len(gold_keywords))
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    union_len = len(user_kw_set.union(gold_keywords))
    jaccard = (matched_count / union_len) if union_len > 0 else 0.0

    return precision, recall, f1, jaccard


def detect_expected_format(gold_answer: str) -> str:
    """Determines expected format of golden answer: NUMERIC, CODE, LIST, SHORT_PHRASE, or DESCRIPTIVE."""
    if not gold_answer:
        return "DESCRIPTIVE"

    norm_gold = gold_answer.strip()
    # Check numeric
    if re.fullmatch(r'^-?\d+(\.\d+)?$', norm_gold) or (re.search(r'\b\d+(\.\d+)?\b', norm_gold) and len(norm_gold.split()) < 5):
        return "NUMERIC"

    # Check code/formula
    if any(k in norm_gold for k in ["def ", "import ", "lambda", "return ", "==", "+=", "df[", "np.", "pd."]):
        return "CODE"

    # Check list
    if ("," in norm_gold and len(norm_gold.split(",")) >= 3) or "\n-" in norm_gold or "\n1." in norm_gold:
        return "LIST"

    # Short phrase
    if len(norm_gold.split()) <= 4:
        return "SHORT_PHRASE"

    return "DESCRIPTIVE"


def verify_format_match(user_answer: str, expected_format: str) -> bool:
    """Step 4: Check whether user answer matches expected answer format."""
    user_norm = user_answer.strip()
    if not user_norm:
        return False

    if expected_format == "NUMERIC":
        return bool(re.search(r'\b\d+(\.\d+)?\b', user_norm))
    elif expected_format == "CODE":
        return any(k in user_norm.lower() for k in ["def ", "import ", "lambda", "return", "=", "df", "np", "pd", "class ", "for ", "while "]) or len(re.findall(r'[{}[\]()=;]', user_norm)) >= 2
    elif expected_format == "LIST":
        return "," in user_norm or "\n" in user_norm or len(user_norm.split()) >= 3
    elif expected_format == "SHORT_PHRASE":
        return len(user_norm.split()) <= 12

    return True


def compute_keyword_match_score(candidate_text: str, expected_keywords: str) -> float:
    """Calculates percentage of expected keywords found in the candidate transcript."""
    if not expected_keywords:
        return 75.0
    keywords = [k.strip().lower() for k in expected_keywords.split(",") if k.strip()]
    if not keywords:
        return 75.0
    candidate_lower = candidate_text.lower()
    matches = sum(1 for kw in keywords if kw in candidate_lower)
    score = (matches / len(keywords)) * 100.0
    return min(100.0, round(score, 2))


def compute_tfidf_cosine_similarity(text1: str, text2: str) -> float:
    """Calculates TF-IDF cosine similarity between candidate response and target answer/reference."""
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)

    if not tokens1 or not tokens2:
        return 0.0

    vocab = sorted(list(set(tokens1 + tokens2)))

    tf1 = {word: tokens1.count(word) for word in vocab}
    tf2 = {word: tokens2.count(word) for word in vocab}

    dot_product = sum(tf1[w] * tf2[w] for w in vocab)
    norm1 = math.sqrt(sum(tf1[w] ** 2 for w in vocab))
    norm2 = math.sqrt(sum(tf2[w] ** 2 for w in vocab))

    if norm1 == 0 or norm2 == 0:
        return 0.0

    similarity = dot_product / (norm1 * norm2)
    return round(similarity * 100.0, 2)


def evaluate_response_rule_fallback(
    candidate_transcript: str,
    golden_answer: str,
    expected_keywords: str,
    topic: str,
    difficulty: str,
    question_text: str = ""
) -> Dict[str, Any]:
    """
    STRICT CONSERVATIVE FALLBACK ANSWER EVALUATION SYSTEM
    ------------------------------------------------------
    Used ONLY when LLM API endpoint is unavailable.
    Objective: Prevent gibberish or keyword-stuffed answers from receiving high scores.

    Enforces Steps 1-8 and Scoring Guidelines strictly.
    """
    raw_user = candidate_transcript.strip()

    # Handle Skipped / Empty answers
    if not raw_user or raw_user.lower() in ["[question skipped]", "[skipped]", "skipped", "n/a", "none"]:
        return {
            "keyword_match_score": 0.0,
            "semantic_similarity_score": 0.0,
            "concept_score": 0.0,
            "rubric_score": 0.0,
            "soft_skills_score": 0.0,
            "overall_question_score": 0.0,
            "bluff_detected": False,
            "eval_feedback": "Question skipped by candidate. Score: 0/100.",
        }

    # Step 1: Normalize texts
    user_tokens = tokenize(raw_user)
    word_count = len(user_tokens)

    # Gibberish / Too short check
    if word_count < 3:
        return {
            "keyword_match_score": 0.0,
            "semantic_similarity_score": 0.0,
            "concept_score": 0.0,
            "rubric_score": 0.0,
            "soft_skills_score": 0.0,
            "overall_question_score": 0.0,
            "bluff_detected": True,
            "eval_feedback": "Invalid, gibberish, or insufficient content provided. Score: 0/100.",
        }

    # Check for repetitive gibberish (e.g., "abc abc abc abc")
    unique_words = len(set(user_tokens))
    repetition_ratio = unique_words / word_count

    if word_count > 6 and repetition_ratio < 0.35:
        return {
            "keyword_match_score": 10.0,
            "semantic_similarity_score": 5.0,
            "concept_score": 10.0,
            "rubric_score": 10.0,
            "soft_skills_score": 10.0,
            "overall_question_score": 10.0,
            "bluff_detected": True,
            "eval_feedback": "Repetitive gibberish or word loop detected. Assigning low score (10/100).",
        }

    # Step 2: Extract keywords from golden answer and expected_keywords
    gold_keywords = extract_keywords_and_concepts(golden_answer, expected_keywords)

    # Step 3: Compute keyword overlap (precision, recall, f1, jaccard)
    precision, recall, f1, jaccard = compute_keyword_overlap(user_tokens, gold_keywords)
    kw_score = round(min(100.0, precision * 100.0), 2)

    # Step 4: Check expected answer format
    expected_fmt = detect_expected_format(golden_answer)
    fmt_matched = verify_format_match(raw_user, expected_fmt)

    # Step 5: Unrelated token ratio check (>30% threshold for non-domain/non-matching words)
    user_non_stopwords = [t for t in user_tokens if t not in ENGLISH_STOPWORDS]
    unrelated_tokens = [t for t in user_non_stopwords if not is_token_matched(t, gold_keywords)]
    unrelated_ratio = (len(unrelated_tokens) / len(user_non_stopwords)) if user_non_stopwords else 0.0

    # Step 6: Keyword stuffing / Unrelated context detection
    # (High repetition, low precision, high fluff noise, or keywords dropped out of context)
    is_keyword_stuffed = (unrelated_ratio > 0.50 and word_count > 12) or (repetition_ratio < 0.40 and word_count > 10)

    # Step 7: Compute Semantic Similarity (Sentence Transformers if available, else TF-IDF + Jaccard)
    if ST_MODEL is not None and golden_answer:
        try:
            emb_gold = ST_MODEL.encode(golden_answer, convert_to_tensor=True)
            emb_user = ST_MODEL.encode(raw_user, convert_to_tensor=True)
            sim_tensor = util.cos_sim(emb_gold, emb_user)
            semantic_score = max(0.0, min(100.0, round(float(sim_tensor[0][0]) * 100.0, 2)))
        except Exception as e:
            logger.warning(f"SentenceTransformer evaluation failed: {e}. Using TF-IDF cosine similarity.")
            semantic_score = compute_tfidf_cosine_similarity(raw_user, golden_answer or "")
    else:
        semantic_score = compute_tfidf_cosine_similarity(raw_user, golden_answer or "")

    # Step 8: Conservative Scoring Guidelines calculation
    base_score = (semantic_score * 0.45) + (precision * 100.0 * 0.35) + (jaccard * 100.0 * 0.20)

    # Apply strict caps based on criteria
    if is_keyword_stuffed:
        final_score = min(20.0, max(5.0, base_score * 0.2))
        feedback = f"Keyword stuffing / unrelated context detected ({round(unrelated_ratio*100)}% noise). Assigning low score (<=20%)."
        is_bluff = True
    elif unrelated_ratio > 0.30 and word_count > 12:
        # Penalize excessive unrelated words (ratio > 30%) by capping score at 35%
        final_score = min(35.0, base_score * 0.5)
        feedback = f"Excessive unrelated tokens detected ({round(unrelated_ratio*100)}% noise > 30% threshold). Score capped."
        is_bluff = False
    elif not fmt_matched:
        # Format mismatch penalty
        final_score = min(45.0, base_score * 0.6)
        feedback = f"Answer does not match expected format ({expected_fmt}). Partial credit assigned."
        is_bluff = False
    else:
        # Classify based on conservative guidelines
        if precision >= 0.70 and semantic_score >= 60.0:
            final_score = min(100.0, max(90.0, base_score))
            feedback = "Exact or near-exact technical answer with complete conceptual alignment."
        elif precision >= 0.50 or semantic_score >= 45.0:
            final_score = min(89.0, max(70.0, base_score))
            feedback = "Correct answer with minor omissions or slight wording variation."
        elif precision >= 0.30 or semantic_score >= 30.0:
            final_score = min(69.0, max(40.0, base_score))
            feedback = "Partial answer covering basic elements but lacking full accuracy or depth."
        elif precision > 0 or semantic_score > 15.0:
            final_score = min(39.0, max(15.0, base_score))
            feedback = "Minimal relevant content detected. Score reflects low technical depth."
        else:
            final_score = 0.0
            feedback = "Invalid, gibberish, or completely irrelevant answer content."
        is_bluff = False

    final_score = round(final_score, 2)
    concept_score = round(min(100.0, max(final_score, semantic_score * 0.8)), 2)
    rubric_score = final_score
    soft_skills = round(min(100.0, max(50.0, 60.0 + min(30.0, word_count * 0.4))), 2) if final_score > 0 else 0.0

    return {
        "keyword_match_score": kw_score,
        "semantic_similarity_score": semantic_score,
        "concept_score": concept_score,
        "rubric_score": rubric_score,
        "soft_skills_score": soft_skills,
        "overall_question_score": final_score,
        "bluff_detected": is_bluff,
        "eval_feedback": f"[Conservative Fallback Engine] {feedback} Score: {final_score}/100.",
    }


def evaluate_response_with_llm(
    candidate_transcript: str,
    golden_answer: str,
    expected_keywords: str,
    topic: str,
    difficulty: str,
    question_text: str = ""
) -> Dict[str, Any]:
    """
    Invokes LLM to evaluate candidate technical and soft skills, enforcing rubrics & anti-bluffing penalties.
    Sends question, golden answer, candidate answer, and evaluation rubrics to LLM.
    """
    if not candidate_transcript or candidate_transcript.strip().lower() in ["[question skipped]", "[skipped]", "skipped"]:
        return evaluate_response_rule_fallback(
            candidate_transcript, golden_answer, expected_keywords, topic, difficulty, question_text
        )

    prompt = f"""You are a strict Senior Data Science Interview Evaluator.

Evaluate the candidate's answer for technical accuracy, conceptual depth, structure, and soft skills against the provided Question, Golden Answer, and Rubrics.

==================================================
1. QUESTION:
{question_text}

2. TOPIC:
{topic} (Difficulty: {difficulty})

3. GOLDEN REFERENCE ANSWER:
{golden_answer}

4. EXPECTED KEYWORDS & CONCEPTS:
{expected_keywords}

5. CANDIDATE ANSWER TRANSCRIPT:
{candidate_transcript}
==================================================

EVALUATION RUBRICS & RULES:
- Technical Skills & Accuracy (0-100): Exact or near-exact alignment with Golden Answer gives 90-100. Correct with minor omissions gives 70-89. Partial answer gives 40-69.
- Anti-Bluffing & Keyword Stuffing Rule (CRITICAL):
  * If candidate bluffs, drops buzzwords without explanation, or stuffs keywords in an unrelated context, assign score ≤ 20.
  * If candidate gives generic evasive fluff or excessive unrelated text, cap score below 30.
  * If answer is gibberish, invalid, or skipped, assign 0.
- Soft Skills & Articulation (0-100): Clarity, logical progression, and professional tone.

Return ONLY a valid JSON object with NO markdown formatting:
{{
  "keyword_match_score": float,
  "semantic_similarity_score": float,
  "concept_score": float,
  "rubric_score": float,
  "soft_skills_score": float,
  "overall_question_score": float,
  "bluff_detected": boolean,
  "eval_feedback": "2-3 concise sentence summary of technical accuracy, soft skills, and rubric alignment."
}}"""

    system_prompt = "You are a strict Senior Data Science Interview Evaluator. Output JSON strictly without markdown codeblocks."

    raw_resp = generate_llm_response(prompt, system_prompt=system_prompt, timeout_seconds=10.0)

    if raw_resp:
        try:
            cleaned_json = raw_resp.strip().strip('```json').strip('```').strip()
            res = json.loads(cleaned_json)

            return {
                "keyword_match_score": float(res.get("keyword_match_score", 50.0)),
                "semantic_similarity_score": float(res.get("semantic_similarity_score", 50.0)),
                "concept_score": float(res.get("concept_score", 50.0)),
                "rubric_score": float(res.get("rubric_score", 50.0)),
                "soft_skills_score": float(res.get("soft_skills_score", 50.0)),
                "overall_question_score": float(res.get("overall_question_score", 50.0)),
                "bluff_detected": bool(res.get("bluff_detected", False)),
                "eval_feedback": str(res.get("eval_feedback", "LLM evaluation completed.")),
            }
        except Exception as e:
            logger.warning(f"Failed to parse LLM evaluation JSON response: {e}. Falling back to conservative rule engine.")

    # Fallback to conservative rule-based evaluation engine
    return evaluate_response_rule_fallback(
        candidate_transcript, golden_answer, expected_keywords, topic, difficulty, question_text
    )


def evaluate_coding_response_with_llm(
    candidate_transcript: str,
    golden_answer: str,
    expected_keywords: str,
    topic: str,
    difficulty: str,
    question_text: str = ""
) -> Dict[str, Any]:
    """
    Evaluates candidate's Python code submission for Data Science / DSA coding questions using gemma4:e2b.
    Sends question, golden code, candidate submission, and rubrics.
    """
    if not candidate_transcript or candidate_transcript.strip().lower() in ["[question skipped]", "[skipped]", "skipped"]:
        return evaluate_response_rule_fallback(
            candidate_transcript, golden_answer, expected_keywords, topic, difficulty, question_text
        )

    prompt = f"""You are a strict Senior Software Engineer and Data Science Technical Evaluator.

Evaluate the candidate's Python code submission for the following Coding Problem against the Golden Reference Answer.

==================================================
1. CODING PROBLEM STATEMENT:
{question_text}

2. TOPIC:
{topic} (Difficulty: {difficulty})

3. GOLDEN REFERENCE SOLUTION:
{golden_answer}

4. EXPECTED KEYWORDS/LIBRARIES:
{expected_keywords}

5. CANDIDATE CODE SUBMISSION:
{candidate_transcript}
==================================================

EVALUATION RUBRICS:
1. Problem Understanding & Correctness (0-100): Did candidate implement working logic resolving the requirement?
2. Time Complexity Analysis (0-100 & Notation): Algorithmic efficiency (e.g. O(N), O(N log N)).
3. Space Complexity Analysis (0-100 & Notation): Auxiliary memory efficiency (e.g. O(1), O(N)).
4. Anti-Gibberish / Anti-Stuffing Rule: If candidate code is incomplete fluff, syntax errors, or non-functional, cap overall score below 30.

Return ONLY a valid JSON object with NO markdown formatting:
{{
  "problem_understanding_score": float,
  "time_complexity_score": float,
  "time_complexity_notation": "O(N)",
  "space_complexity_score": float,
  "space_complexity_notation": "O(1)",
  "code_correctness_score": float,
  "overall_question_score": float,
  "eval_feedback": "Detailed 2-3 sentence technical evaluation of code correctness, complexity, and library usage."
}}"""

    system_prompt = "You are a Senior Technical Software Evaluator. Output JSON strictly without codeblocks."

    raw_resp = generate_llm_response(prompt, system_prompt=system_prompt, timeout_seconds=10.0)

    if raw_resp:
        try:
            cleaned_json = raw_resp.strip().strip('```json').strip('```').strip()
            res = json.loads(cleaned_json)

            time_not = str(res.get("time_complexity_notation", "O(N)"))
            space_not = str(res.get("space_complexity_notation", "O(1)"))
            p_score = float(res.get("problem_understanding_score", 70.0))
            t_score = float(res.get("time_complexity_score", 70.0))
            s_score = float(res.get("space_complexity_score", 70.0))
            c_score = float(res.get("code_correctness_score", 70.0))
            overall = float(res.get("overall_question_score", round((p_score + t_score + s_score + c_score) / 4, 2)))
            fb = str(res.get("eval_feedback", f"Coding solution evaluated. Time: {time_not}, Space: {space_not}."))

            return {
                "keyword_match_score": c_score,
                "semantic_similarity_score": p_score,
                "concept_score": p_score,
                "rubric_score": overall,
                "soft_skills_score": 80.0,
                "time_complexity_score": t_score,
                "time_complexity_notation": time_not,
                "space_complexity_score": s_score,
                "space_complexity_notation": space_not,
                "overall_question_score": overall,
                "bluff_detected": False,
                "eval_feedback": f"[{time_not} Time | {space_not} Space] {fb}",
            }
        except Exception as e:
            logger.warning(f"Failed to parse coding LLM evaluation JSON: {e}")

    # Fallback to conservative rule-based evaluation if LLM is unreachable
    return evaluate_response_rule_fallback(
        candidate_transcript, golden_answer, expected_keywords, topic, difficulty, question_text
    )


def evaluate_response(
    candidate_transcript: str,
    golden_answer: str,
    expected_keywords: str,
    topic: str,
    difficulty: str,
    step_type: str = "PREDEFINED",
    question_text: str = "",
    question_type: str = "TECHNICAL"
) -> Dict[str, Any]:
    """Main evaluation entrypoint."""
    if question_type == "CODING" or step_type == "CODING" or "coding" in topic.lower() or "dsa" in topic.lower():
        return evaluate_coding_response_with_llm(
            candidate_transcript=candidate_transcript,
            golden_answer=golden_answer,
            expected_keywords=expected_keywords,
            topic=topic,
            difficulty=difficulty,
            question_text=question_text
        )

    return evaluate_response_with_llm(
        candidate_transcript=candidate_transcript,
        golden_answer=golden_answer,
        expected_keywords=expected_keywords,
        topic=topic,
        difficulty=difficulty,
        question_text=question_text
    )
