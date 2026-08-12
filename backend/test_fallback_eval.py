import sys
import os
import time

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.evaluation_service import evaluate_response_rule_fallback
from services.llm_service import DEFAULT_TIMEOUT_SECONDS, CONNECT_TIMEOUT_SECONDS

def run_tests():
    print("=" * 60)
    print("RUNNING CONSERVATIVE FALLBACK EVALUATION SYSTEM TESTS")
    print("=" * 60)

    print(f"Verified LLM Timeout Settings: Default={DEFAULT_TIMEOUT_SECONDS}s, Connect={CONNECT_TIMEOUT_SECONDS}s")
    assert DEFAULT_TIMEOUT_SECONDS <= 10.0, "DEFAULT_TIMEOUT_SECONDS should be <= 10s for fast failover!"
    assert CONNECT_TIMEOUT_SECONDS <= 5.0, "CONNECT_TIMEOUT_SECONDS should be <= 5s!"

    golden_answer = "Standard Scaler standardizes features by removing the mean and scaling to unit variance. Formula is z = (x - u) / s."
    expected_keywords = "StandardScaler, mean, unit variance, scale, standardizes"
    topic = "Feature Engineering"
    difficulty = "Medium"
    question = "What is StandardScaler and how does it work?"

    # Test Case 1: Skipped Answer
    res_skipped = evaluate_response_rule_fallback("[Question Skipped]", golden_answer, expected_keywords, topic, difficulty, question)
    print("\n1. Skipped Answer Test:")
    print("   Score:", res_skipped["overall_question_score"])
    print("   Feedback:", res_skipped["eval_feedback"])
    assert res_skipped["overall_question_score"] == 0.0, "Skipped answer must score 0!"

    # Test Case 2: Gibberish Answer
    res_gibberish = evaluate_response_rule_fallback("asdf qwerty foo bar", golden_answer, expected_keywords, topic, difficulty, question)
    print("\n2. Gibberish Answer Test:")
    print("   Score:", res_gibberish["overall_question_score"])
    print("   Feedback:", res_gibberish["eval_feedback"])
    assert res_gibberish["overall_question_score"] <= 15.0, "Gibberish answer score must be <= 15!"

    # Test Case 3: Keyword Stuffing (buzzwords repeated out of context / high noise)
    keyword_stuffing_ans = "StandardScaler mean unit variance scale standardizes StandardScaler mean unit variance scale standardizes random unrelated banana sky apple orange pizza rocket guitar laptop keyboard train tree flower sunset ocean."
    res_stuffing = evaluate_response_rule_fallback(keyword_stuffing_ans, golden_answer, expected_keywords, topic, difficulty, question)
    print("\n3. Keyword Stuffing Test:")
    print("   Score:", res_stuffing["overall_question_score"])
    print("   Feedback:", res_stuffing["eval_feedback"])
    assert res_stuffing["overall_question_score"] <= 20.0, "Keyword stuffing score must be <= 20%!"

    # Test Case 4: Excessive Unrelated Tokens (>30% noise cap test)
    fluff_ans = "StandardScaler standardizes features by removing mean and scaling to unit variance. However I like eating pizza on Sundays while watching football games in the stadium with my friends in blue shirts."
    res_fluff = evaluate_response_rule_fallback(fluff_ans, golden_answer, expected_keywords, topic, difficulty, question)
    print("\n4. Excessive Unrelated Tokens (>30% noise) Test:")
    print("   Score:", res_fluff["overall_question_score"])
    print("   Feedback:", res_fluff["eval_feedback"])
    assert res_fluff["overall_question_score"] <= 40.0, "Excessive noise (>30%) must cap score at <= 40%!"

    # Test Case 5: Exact or Near-Exact Answer
    exact_ans = "StandardScaler standardizes features by subtracting the mean and scaling features to unit variance using the formula z = (x - u) / s."
    res_exact = evaluate_response_rule_fallback(exact_ans, golden_answer, expected_keywords, topic, difficulty, question)
    print("\n5. Exact / Near-Exact Answer Test:")
    print("   Score:", res_exact["overall_question_score"])
    print("   Feedback:", res_exact["eval_feedback"])
    assert res_exact["overall_question_score"] >= 85.0, "Exact answer score must be >= 85%!"

    # Test Case 6: Correct Answer with Minor Omissions
    minor_ans = "StandardScaler standardizes dataset features by centering around mean and scaling."
    res_minor = evaluate_response_rule_fallback(minor_ans, golden_answer, expected_keywords, topic, difficulty, question)
    print("\n6. Minor Omission Answer Test:")
    print("   Score:", res_minor["overall_question_score"])
    print("   Feedback:", res_minor["eval_feedback"])
    assert 60.0 <= res_minor["overall_question_score"] <= 89.0, "Minor omission answer score should be in 60-89 range!"

    print("\n" + "=" * 60)
    print("ALL CONSERVATIVE FALLBACK EVALUATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
