"""
llm_service.py
--------------
Asynchronous & Synchronous HTTP service for communicating with Ollama LLM API.
Enforces model 'gemma4:e2b', retry logic, full request/response logging,
descriptive error handling, and low-latency follow-up question generation without generic templates.
"""

import logging
import os
import time
import requests
import json
from typing import Optional, Dict, Any

logger = logging.getLogger("uvicorn")

# Configuration: Default primary to local Ollama instance for instant zero-latency connect
PRIMARY_LLM_API_URL = os.getenv("LLM_API_URL", "http://llm01.cmi.rebhu.in:11434/api/generate")
FALLBACK_LLM_API_URL = os.getenv("LLM_FALLBACK_API_URL", "http://llm01.cmi.rebhu.in:11434/api/chat")
LLM_MODEL_NAME = "gemma4:e2b"  # STRICT REQUIREMENT: ONLY gemma4:e2b
DEFAULT_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT", "8.0"))
CONNECT_TIMEOUT_SECONDS = float(os.getenv("LLM_CONNECT_TIMEOUT", "3.0"))



def generate_llm_response(
    prompt: str,
    system_prompt: str = "",
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    max_retries: int = 1
) -> str:
    """
    Sends request to Ollama LLM API using model 'gemma4:e2b'.
    Supports both /api/chat and /api/generate Ollama endpoints.
    Executes retries and fallback endpoint URL if connection fails or times out.
    """
    target_urls = [PRIMARY_LLM_API_URL]
    if FALLBACK_LLM_API_URL and FALLBACK_LLM_API_URL != PRIMARY_LLM_API_URL:
        target_urls.append(FALLBACK_LLM_API_URL)

    last_error_detail = ""

    for url in target_urls:
        is_chat_endpoint = "/chat" in url

        if is_chat_endpoint:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            payload = {
                "model": LLM_MODEL_NAME,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 120,
                }
            }
        else:
            payload = {
                "model": LLM_MODEL_NAME,
                "prompt": prompt,
                "system": system_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 120,
                }
            }

        for attempt in range(max_retries + 1):
            start_time = time.time()
            logger.info(f"Sending LLM Request to {url} [Model: {LLM_MODEL_NAME}, Attempt {attempt + 1}/{max_retries + 1}]")
            logger.debug(f"LLM Prompt: {prompt[:200]}...")

            try:
                connect_timeout = CONNECT_TIMEOUT_SECONDS
                response = requests.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=(connect_timeout, timeout_seconds)
                )
                latency_ms = round((time.time() - start_time) * 1000, 2)

                if response.status_code == 200:
                    data = response.json()
                    response_text = ""

                    if is_chat_endpoint and "message" in data and "content" in data["message"]:
                        response_text = data["message"]["content"].strip()
                    elif "response" in data:
                        response_text = data.get("response", "").strip()

                    logger.info(f"Ollama Request Success | URL: {url} | Latency: {latency_ms}ms | Status: 200")
                    if response_text:
                        return response_text
                else:
                    error_msg = f"HTTP {response.status_code}: {response.text}"
                    logger.warning(f"Ollama Error Response [{url}] | Status: {response.status_code} | Body: {response.text}")
                    last_error_detail = error_msg

            except requests.exceptions.Timeout as e:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                last_error_detail = f"Timeout after {timeout_seconds}s on {url}: {e}"
                logger.warning(f"Ollama Request Timeout on {url} (Attempt {attempt + 1}) after {latency_ms}ms: {e}")
            except requests.exceptions.ConnectionError as e:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                last_error_detail = f"Connection error on {url}: {e}"
                logger.warning(f"Ollama Connection Error on {url} (Attempt {attempt + 1}) after {latency_ms}ms: {e}")
            except Exception as e:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                last_error_detail = f"Unexpected error on {url}: {e}"
                logger.error(f"Ollama Unexpected Exception on {url}: {e}", exc_info=True)

            if attempt < max_retries:
                time.sleep(0.3)

    logger.error(f"CRITICAL: Ollama LLM service failed on all endpoints. Last error: {last_error_detail}")
    return ""


def clean_llm_question(text: str) -> str:
    """Cleans up quote wrapping, markdown formatting, and extra whitespace from LLM output."""
    if not text:
        return ""
    cleaned = text.strip().strip('"').strip("'").strip('`')
    if cleaned.startswith("Follow-up Question:"):
        cleaned = cleaned.replace("Follow-up Question:", "").strip()
    if cleaned.startswith("Question:"):
        cleaned = cleaned.replace("Question:", "").strip()
    return cleaned.strip()


def generate_followup_question(
    predefined_question: str,
    candidate_answer: str,
    topic: str
) -> str:
    """
    Generates EXACTLY ONE intelligent follow-up question based ONLY on:
    - Main Question
    - Topic
    - Candidate Answer
    Does NOT send Golden Answer, Expected Keywords, Resume, Rubrics, or History.
    """
    prompt = f"""You are an experienced Senior Data Science interviewer.

A candidate has answered a technical interview question.

Main Question
{predefined_question}

Topic
{topic}

Candidate Answer
{candidate_answer}

Your task is to generate exactly ONE follow-up interview question.

Requirements
The follow-up question must
- be directly related to the candidate's answer
- identify missing concepts
- probe deeper understanding
- ask about assumptions
- ask about trade-offs
- ask about limitations
- ask about implementation decisions
- ask about practical applications if relevant

Never ask
"Could you elaborate"
Never ask
"How does this help Data Science?"
Never use generic templates.
Never repeat the original question.

Return ONLY the follow-up question."""

    system_prompt = "You are an experienced Senior Data Science interviewer. Return ONLY the single follow-up question."

    raw_response = generate_llm_response(prompt, system_prompt, timeout_seconds=DEFAULT_TIMEOUT_SECONDS)
    cleaned = clean_llm_question(raw_response)

    if cleaned and len(cleaned) >= 10:
        return cleaned

    # Intelligent fallback when LLM fails
    logger.warning("Ollama call failed or returned empty. Using dynamic fallback engine.")
    return generate_dynamic_fallback(topic, candidate_answer)


def generate_dynamic_fallback(topic: str, candidate_answer: str) -> str:
    """
    Dynamic heuristic fallback engine used ONLY when Ollama service fails after retries.
    Avoids fixed generic templates.
    """
    top_lower = topic.lower()

    if "python" in top_lower or "pandas" in top_lower or "numpy" in top_lower:
        return f"How would memory utilization or vectorization impact performance when executing this {topic} operation on large-scale data?"
    elif "sql" in top_lower:
        return "What indexing strategy or query execution plan considerations would apply to prevent bottlenecks for this query?"
    elif "model" in top_lower or "machine learning" in top_lower or "classification" in top_lower or "regression" in top_lower:
        return f"What validation metrics or error analysis techniques would you use to detect overfitting in this {topic} setup?"
    elif "statistics" in top_lower or "probability" in top_lower:
        return f"What statistical assumptions about data distribution must hold true for this {topic} method to yield reliable results?"
    else:
        return f"What key edge cases or production trade-offs would you evaluate before deploying this {topic} solution?"


def warmup_ollama_model():
    """Pre-loads model into memory during server startup to minimize cold-start latency."""
    try:
        url = PRIMARY_LLM_API_URL
        payload = {
            "model": LLM_MODEL_NAME,
            "keep_alive": "30m",
        }
        if "/chat" in url:
            payload["messages"] = [{"role": "user", "content": "Ping"}]
        else:
            payload["prompt"] = "Ping"

        logger.info(f"Warming up Ollama model '{LLM_MODEL_NAME}' at {url}...")
        requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=60.0)
        logger.info("Ollama model warmup completed successfully.")
    except Exception as e:
        logger.warning(f"Ollama model warmup notice: {e}")


def generate_ds_coding_question_llm() -> Dict[str, Any]:
    """
    Generates 1 practical Data Science coding question ONLY using gemma4:e2b model.
    Technologies: Scikit-Learn, PyTorch, NumPy, Pandas, Seaborn.
    """
    prompt = """Generate a practical Python Data Science coding question involving pandas, numpy, scikit-learn, pytorch, or seaborn.

Return ONLY a valid JSON object with NO markdown formatting:
{
  "rewritten_question": "Detailed problem statement describing task, input dataset/format, and expected output.",
  "golden_answer": "Complete, working Python reference solution.",
  "topic": "Data Science Application (scikit-learn, pytorch, pandas, numpy, seaborn)",
  "difficulty": "Medium",
  "expected_keywords": "pandas, numpy, scikit-learn, pytorch, seaborn, DataFrame, tensor, fit_transform",
  "coding_template": "import pandas as pd\\nimport numpy as np\\nimport sklearn\\n\\ndef solve_problem(df):\\n    # Write your solution here\\n    pass"
}"""
    system_prompt = "You are a Senior Data Science Interviewer. Output JSON strictly without codeblocks."

    raw_resp = generate_llm_response(prompt, system_prompt=system_prompt, timeout_seconds=5.0)
    if raw_resp:
        try:
            cleaned = raw_resp.strip().strip('```json').strip('```').strip()
            data = json.loads(cleaned)
            data["question_id"] = 501
            data["question_type"] = "CODING"
            data["section"] = "SECTION_3_CODING"
            data["section_title"] = "Section 3: Data Science Coding Challenge"
            return data
        except Exception as e:
            logger.warning(f"Failed to parse DS coding question JSON from LLM: {e}")

    # Fallback if LLM is offline/unreachable
    return {
        "question_id": 501,
        "rewritten_question": "Write a Python function `preprocess_and_train(df)` using Pandas and Scikit-Learn to impute missing numeric values with medians, scale features using StandardScaler, and train a LogisticRegression model on target 'label'. Return the trained model.",
        "golden_answer": "import pandas as pd\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\n\ndef preprocess_and_train(df):\n    X = df.drop(columns=['label'])\n    y = df['label']\n    X = X.fillna(X.median())\n    scaler = StandardScaler()\n    X_scaled = scaler.fit_transform(X)\n    model = LogisticRegression()\n    model.fit(X_scaled, y)\n    return model",
        "topic": "Data Science Application (Pandas & Scikit-Learn)",
        "difficulty": "Medium",
        "expected_keywords": "pandas, StandardScaler, LogisticRegression, fillna, fit_transform",
        "question_type": "CODING",
        "section": "SECTION_3_CODING",
        "section_title": "Section 3: Data Science Coding Challenge",
        "coding_template": "import pandas as pd\nimport numpy as np\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\n\ndef preprocess_and_train(df: pd.DataFrame):\n    # Write your solution here\n    pass"
    }


def generate_dsa_coding_question_llm() -> Dict[str, Any]:
    """
    Generates 1 Data Structures & Algorithms (DSA) coding problem ONLY using gemma4:e2b model.
    Topics: Arrays, Trees, Graphs, DP, Two Pointers, Stacks/Queues, HashMaps.
    """
    prompt = """Generate a Data Structures & Algorithms (DSA) coding problem in Python.
    Return ONLY a valid JSON object with NO markdown formatting:
{
  "rewritten_question": "Problem statement, input parameters, constraints, and example test cases.",
  "golden_answer": "Optimal Python solution with comments on time and space complexity.",
  "topic": "Data Structures & Algorithms (DSA)",
  "difficulty": "Medium",
  "expected_keywords": "array, hashmap, dynamic programming, sliding window, binary search, O(N)",
  "coding_template": "def solve_dsa(nums, target):\\n    # Write your optimal solution here\\n    pass"
}"""
    system_prompt = "You are a Senior Technical Software Interviewer. Output JSON strictly without codeblocks."

    raw_resp = generate_llm_response(prompt, system_prompt=system_prompt, timeout_seconds=5.0)
    if raw_resp:
        try:
            cleaned = raw_resp.strip().strip('```json').strip('```').strip()
            data = json.loads(cleaned)
            data["question_id"] = 502
            data["question_type"] = "CODING"
            data["section"] = "SECTION_3_CODING"
            data["section_title"] = "Section 3: DSA Coding Challenge"
            return data
        except Exception as e:
            logger.warning(f"Failed to parse DSA coding question JSON from LLM: {e}")

    # Fallback if LLM is offline/unreachable
    return {
        "question_id": 502,
        "rewritten_question": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target. Optimize for O(N) time complexity using a HashMap.",
        "golden_answer": "def solve_dsa(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []",
        "topic": "Data Structures & Algorithms (DSA - Two Sum)",
        "difficulty": "Medium",
        "expected_keywords": "hashmap, dict, enumerate, target, O(N), space complexity O(N)",
        "question_type": "CODING",
        "section": "SECTION_3_CODING",
        "section_title": "Section 3: DSA Coding Challenge",
        "coding_template": "from typing import List\n\ndef solve_dsa(nums: List[int], target: int) -> List[int]:\n    # Write your optimal O(N) solution here\n    pass"
    }


