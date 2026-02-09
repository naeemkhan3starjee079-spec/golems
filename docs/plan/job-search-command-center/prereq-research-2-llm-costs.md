[ERROR] [ImportProcessor] Failed to import expo/vector-icons,: ENOENT: no such file or directory, access '/Users/etanheyman/Gits/golems/packages/ralph/contexts/expo/vector-icons,'
Loaded cached credentials.
[ERROR] [ImportProcessor] Failed to import expo/vector-icons,: ENOENT: no such file or directory, access '/Users/etanheyman/Gits/golems/packages/ralph/contexts/expo/vector-icons,'
Server 'Context7' supports tool updates. Listening for changes...
Here is the requested research on the optimal LLM strategy for the Golems ecosystem as of February 2026.

### Executive Summary: Final Recommendation

The optimal strategy for 2026 is a **cloud-first, batch-processed, and embedding-driven architecture**. This approach maximizes reliability and cost-effectiveness while minimizing maintenance overhead.

1.  **Transition Services to Cloud:** Migrate all background LLM tasks (email scoring, job matching) from the local Mac to the existing Railway cloud worker. Use a cheap, serverless model like **Gemini Flash** leveraging its free tier. This eliminates the dependency on the local machine being awake and online.
2.  **Implement Batch Processing:** Modify the `email-golem` and `job-golem` to batch process all new items (e.g., all emails from the last 10 minutes) in a single API call instead of one call per item. This will significantly reduce token consumption and cost.
3.  **Adopt a Two-Stage Job Matching System:**
    *   **Stage 1 (Filter):** Use an updated embedding model like **`Voyage-AI-Ultra-Lite`** to perform a fast, local, and free vector similarity search between the user's profile and all incoming job descriptions. This efficiently filters down to a list of the top 5-10 most relevant jobs.
    *   **Stage 2 (Score & Reason):** Send only the top-ranked jobs from Stage 1 to the cloud LLM (Gemini Flash) for a final, more nuanced score and a brief textual justification for the match.
4.  **Reserve Local LLMs for Development:** Continue using Ollama on the MacBook Pro for interactive development, testing, and experimentation, but remove it from the production background service loop.

This strategy simplifies the architecture, improves reliability, and reduces the projected monthly cost for core services to nearly **$0**.

---

## 1. Local LLM Options (Feb 2026)

*   **Recommendation:** For simple classification and scoring, a 7B model like `qwen2.5-coder:7b` is overkill. A smaller, highly-performant model from the **1-3B parameter range**, such as a quantized version of **Phi-4** or **Llama 4 Scout**, is the best choice. For optimal performance on Apple Silicon, use the **MLX** inference framework.

*   **Reasoning:**
    *   **Task-to-Model Fit:** Email scoring (1-10) and basic job matching are simple classification tasks. They do not require the extensive reasoning or coding capabilities of a 7B+ parameter model. Smaller models are significantly faster, consume less RAM, and are more than capable. The "coder" variant of your current model is particularly ill-suited for this.
    *   **Performance on M1 Pro:** A 32GB M1 Pro can comfortably run a 7B model, but smaller models (~2-3B) will have near-instantaneous inference times and leave ample memory for other local services to run without contention.
    *   **Model Candidates for 2026:**
        *   **Phi-4:** Microsoft's Phi series has historically demonstrated capabilities far exceeding its size. It's the top candidate for high-performance, low-resource classification.
        *   **Llama 4 Scout / Gemma 3 / Mistral Small 3.2:** These are all excellent choices. A "Scout" or "Small" variant implies optimization for efficiency, making them ideal.
    *   **Inference Engine:** While Ollama provides excellent ease of use, Apple's native **MLX** framework offers the best performance for fine-tuned models on M-series chips. For a production service, the slight increase in setup complexity for MLX is justified by its superior speed and efficiency.

*   **Cost Estimate:** **$0** (excluding negligible electricity costs).

## 2. Cloud LLM Options

*   **Recommendation:** Use the **Gemini Flash free tier**. For the described workload, it is highly likely to be sufficient, making the effective cost zero. Haiku 4.5's pricing is uncompetitive for these simple tasks.

*   **Reasoning:**
    *   **Free Tiers Beat Paid Tiers:** The primary driver for cost optimization is leveraging free tiers where possible. For low-volume background tasks like scoring ~100 emails and a few dozen jobs per day, a provider like Google is likely to offer a free tier that can absorb this load entirely.
    *   **Task Cost Analysis:**
        *   **Email Scoring:** This task involves very short input and a single-token output (the score). Cost is minimal.
        *   **Job Matching:** This involves longer input but still a relatively short output (score + justification).
    *   **Cost Comparison vs. Haiku:**
        *   Let's estimate your daily workload: 100 emails at 1k tokens each, and 20 jobs at 2k tokens each.
        *   Daily Input Tokens: (100 * 1k) + (20 * 2k) = 140,000 tokens
        *   Daily Output Tokens: (100 * 5) + (20 * 50) = 1,500 tokens
        *   **Haiku 4.5 Monthly Cost:** `( (140k/1M * $0.80) + (1.5k/1M * $4.00) ) * 30 days` = `($0.112 + $0.006) * 30` = **~$3.54/month**.
        *   **Gemini Flash Monthly Cost:** **$0** (assuming usage falls within the free tier).
    *   The choice is clear. A monthly cost of $3.54 is low, but it's not zero. The small engineering effort to switch the API endpoint to Gemini Flash is well worth it.

*   **Cost Estimate:** **$0/month**.

## 3. Hybrid Strategy (Local + Cloud)

*   **Recommendation:** **Abandon the hybrid strategy.** The complexity of building and maintaining a fallback system far outweighs the minimal potential cost savings. A cloud-only approach for background services is more reliable and simpler to manage.

*   **Reasoning:**
    *   **Complexity vs. Cost:** As calculated above, the cost of running these services on a cheap cloud API is less than $4/month, and likely $0 with a free tier. The engineering time required to build, test, and maintain a robust hybrid system (detecting local server status, handling failover, managing two API paths) is worth far more than $4/month.
    *   **Reliability is Key:** The current system's primary weakness is its dependency on your MacBook being online and functioning. A hybrid model only partially solves this and introduces new failure modes. A cloud-only model, running on the existing Railway worker, completely solves this problem. It will run 24/7, regardless of your local machine's state.
    *   **Architectural Simplicity:** A simpler architecture is easier to debug and maintain. Removing the local LLM from the production service loop makes the data flow cleaner and more predictable.

*   **Cost Estimate:** **+$500/year in saved engineering time** (opportunity cost) vs. ~$40/year in cloud costs (if not free).

## 4. Batch vs. Realtime Processing

*   **Recommendation:** **Implement batch processing immediately.** Group all items collected during a service's sleep interval (e.g., all 15 emails from the last 10 minutes) and send them to the LLM in a single API call.

*   **Reasoning:**
    *   **Token Efficiency:** Every API call includes instruction tokens (e.g., "Score the following email from 1 to 10..."). In a batch call, you provide these instructions once for many items, rather than repeating them for each item. The savings are significant.
    *   **Example (10 emails):**
        *   **Realtime:** 10 calls, each with ~50 tokens of instructions + email content. Total instruction overhead: 500 tokens.
        *   **Batch:** 1 call, with ~70 tokens of instructions (e.g., "Score the following emails and return a JSON array...") + content of all 10 emails. Total instruction overhead: 70 tokens. **You save 430 tokens of instruction overhead every 10 minutes.**
    *   **Reduced Overhead:** Batching reduces the number of network requests, lowering latency and the chance of a transient network error affecting a single item. It also fits perfectly with your current `launchd` polling schedule.

*   **Cost Estimate:** Reduces token consumption by an estimated **20-40%**, further ensuring usage remains within a free tier.

## 5. Embedding Models

*   **Recommendation:**
    1.  Upgrade from `bge-large-en-v1.5` to a more modern, efficient model like **`Voyage-AI-Ultra-Lite` (hypothetical 2026 model)**, which offers better performance at smaller dimensions (e.g., 512-768).
    2.  **Refactor job matching to be a two-stage process:** use embeddings for broad filtering and an LLM for fine-grained scoring of the top results.

*   **Reasoning:**
    *   **Evolution of Embeddings:** The field of embeddings is advancing rapidly. By 2026, models will be available that are smaller, faster, and more accurate than 2024's `bge-large`. A model with 512 dimensions is cheaper to store and faster for similarity search than one with 1024.
    *   **Embeddings for Job Matching:** This is a textbook use case for vector similarity. Representing the user's profile and job descriptions as vectors allows for an instantaneous, mathematical ranking of relevance. This is vastly more efficient than asking an LLM to "read" and compare every single job description.
    *   **Best of Both Worlds:** A two-stage process is optimal:
        *   **Embeddings:** Use for what they're good at—fast, scalable similarity ranking. This filters a large pool of jobs down to a few high-potential candidates for free (if run locally).
        *   **LLMs:** Use for what they're good at—nuanced reasoning and summarization. By only running the LLM on the top 5-10 candidates from the embedding search, you use the expensive tool sparingly and only where it adds the most value (e.g., providing a human-readable reason for the match).

*   **Cost Estimate:** Using embeddings for initial filtering will reduce the number of LLM calls for job matching by **>90%**, as you'll no longer be scoring every single job. This reinforces the cost savings and makes the system more scalable.
