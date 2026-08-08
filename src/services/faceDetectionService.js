/**
 * Face Detection API Service
 * ------------------------------------------------------------------
 * Dedicated service for communicating with the Python FastAPI AI
 * microservice (runs on http://localhost:8000).
 *
 * This service is intentionally separate from the main `apiClient`
 * because the AI microservice is an independent process and does not
 * require the NestJS auth token / base URL.
 *
 * Pipeline responsibility:
 *   API Service  ->  Python FastAPI  (POST multipart/form-data)
 *
 * NOTE: This file ONLY handles frame transmission. It does NOT perform
 * face detection, recognition, embedding generation, or attendance.
 */

const LOG_TAG = "[FaceDetectionService]";

// ─── AI Microservice Base URL ────────────────────────────────────────────
// Configure via VITE_AI_MICROSERVICE_URL in .env.
// Fallback: http://localhost:8000 (local FastAPI dev server).
const AI_MICROSERVICE_BASE_URL =
  import.meta.env?.VITE_AI_MICROSERVICE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

const DETECT_FACE_ENDPOINT = "/detect-face";
const SAVE_IMAGE_ENDPOINT = "/enrollment/save-image";
const GENERATE_EMBEDDINGS_ENDPOINT = "/enrollment/generate-embeddings";
const NORMALIZE_EMBEDDINGS_ENDPOINT = "/enrollment/normalize-embeddings";
const DETECT_OUTLIERS_ENDPOINT = "/enrollment/detect-outliers";
const GENERATE_MASTER_ENDPOINT = "/enrollment/generate-master-embedding";
const VERIFY_PIPELINE_ENDPOINT = "/enrollment/verify";
const SAVE_TO_DATABASE_ENDPOINT = "/enrollment/save-to-database";


// ─── Face Detection ──────────────────────────────────────────────────────
// Sends a single video frame to the AI microservice face-detection endpoint
// and receives validation + capture-allowed signals back.
export async function detectFace(imageBlob, meta = {}) {
  const url = `${AI_MICROSERVICE_BASE_URL}${DETECT_FACE_ENDPOINT}`;

  const formData = new FormData();
  formData.append("image", imageBlob, "frame.jpg");
  if (meta.cameraId) formData.append("cameraId", meta.cameraId);
  if (meta.frameIndex !== undefined && meta.frameIndex !== null) {
    formData.append("frameIndex", String(meta.frameIndex));
  }

  console.log(`${LOG_TAG} Detecting face -> POST ${url}`);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Face detection failed:`, detail);
    throw new Error(`Face detection failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  return data;
}

// ─── Enrollment Image Save ────────────────────────────────────────────────
// Sends a single captured enrollment image to persist on disk as part of
// the Phase 5C continuous capture pipeline.
//
// @param {Blob} imageBlob - JPEG image blob captured from the live camera.
// @param {Object} [meta] - Optional metadata:
// @param {string} [meta.cameraId] - Camera identifier.
// @param {number|string} [meta.frameId] - frameId returned by /detect-face.
// @param {string} [meta.sessionId] - Unique enrollment session ID (isolates images per session).
// @param {string} [meta.timestamp] - ISO timestamp of the captured frame.
// @returns {Promise<object>} Parsed JSON response from the server.
export async function saveEnrollmentImage(imageBlob, meta = {}) {
  const url = `${AI_MICROSERVICE_BASE_URL}${SAVE_IMAGE_ENDPOINT}`;

  const formData = new FormData();
  formData.append("image", imageBlob, "enrollment.jpg");
  if (meta.cameraId) formData.append("cameraId", meta.cameraId);
  if (meta.frameId !== undefined && meta.frameId !== null) {
    formData.append("frameId", String(meta.frameId));
  }
  if (meta.sessionId) formData.append("sessionId", meta.sessionId);
  if (meta.timestamp) formData.append("timestamp", meta.timestamp);

  console.log(`${LOG_TAG} Saving image -> POST ${url}`, {
    bytes: imageBlob.size,
    type: imageBlob.type,
    cameraId: meta.cameraId,
    frameId: meta.frameId,
    sessionId: meta.sessionId,
    timestamp: meta.timestamp,
  });

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Save image failed:`, detail);
    throw new Error(`Save image failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  return data;
}

/**
 * Trigger Phase 6A — generate 512-d InsightFace embeddings for every saved
 * enrollment image (in-memory only) and return the verification summary.
 *
 * This is called ONLY after the enrollment capture pipeline has fully
 * stopped (no more /detect-face requests). It processes ONLY the images
 * inside the current session folder — never previous sessions' images.
 *
 * @param {string} [sessionId] - Unique enrollment session ID (isolates images per session).
 * @returns {Promise<object>} Phase 6A verification response, e.g.:
 *   {
 *     success, phase, imagesProcessed, embeddingsGenerated,
 *     failedImages, embeddingDimension, successRate,
 *     verificationPassed, message
 *   }
 */
export async function generateEnrollmentEmbeddings(sessionId) {
  const url = `${AI_MICROSERVICE_BASE_URL}${GENERATE_EMBEDDINGS_ENDPOINT}`;

  console.log(`${LOG_TAG} Phase 6A -> POST ${url} (sessionId: ${sessionId || "none"})`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: sessionId ? JSON.stringify({ sessionId }) : undefined,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Phase 6A failed:`, detail);
    throw new Error(`generateEnrollmentEmbeddings failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  console.log(`${LOG_TAG} Phase 6A response received:`, data);
  return data;
}

/**
 * Trigger Phase 6B.1 — normalize every 512-d InsightFace embedding generated
 * during Phase 6A. Each embedding is L2-normalized, validated, and kept in
 * memory for the current request ONLY. Only a summary object is returned —
 * the normalized 512-d vectors are NEVER exposed to the frontend.
 *
 * This is called ONLY after Phase 6A has completed. It processes ONLY the
 * images inside the current session folder — never previous sessions' images.
 *
 * @param {string} [sessionId] - Unique enrollment session ID (isolates images per session).
 * @returns {Promise<object>} Phase 6B.1 normalization summary, e.g.:
 *   {
 *     success, phase, embeddingsReceived, embeddingsNormalized,
 *     normalizationFailures, embeddingDimension,
 *     averageNormBefore, averageNormAfter,
 *     readyForNextPhase, processingTimeMs, message
 *   }
 */
export async function normalizeEnrollmentEmbeddings(sessionId) {
  const url = `${AI_MICROSERVICE_BASE_URL}${NORMALIZE_EMBEDDINGS_ENDPOINT}`;

  console.log(`${LOG_TAG} Phase 6B.1 -> POST ${url} (sessionId: ${sessionId || "none"})`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: sessionId ? JSON.stringify({ sessionId }) : undefined,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Phase 6B.1 failed:`, detail);
    throw new Error(`normalizeEnrollmentEmbeddings failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  console.log(`${LOG_TAG} Phase 6B.1 response received:`, data);
  return data;
}

/**
 * Trigger Phase 6B.2 — detect outlier embeddings using pairwise cosine
 * similarity on the normalized 512-d embeddings produced in Phase 6B.1.
 *
 * For each valid embedding the microservice computes:
 *   - avgCosineSimilarity  (with all other valid embeddings)
 *   - maxCosineSimilarity
 *   - minCosineSimilarity
 *   - isOutlier  (true when avgCosineSimilarity < OUTLIER_COSINE_THRESHOLD = 0.75)
 *
 * Raw 512-d vectors are NEVER exposed to the frontend.
 * Outliers are NEVER deleted — only flagged.
 * Nothing is stored in the database.
 *
 * @param {string} [sessionId] - Unique enrollment session ID.
 * @returns {Promise<object>} Phase 6B.2 outlier detection summary, e.g.:
 *   {
 *     success, phase, totalEmbeddings, validEmbeddings,
 *     outlierCount, nonOutlierCount, outlierThreshold,
 *     embeddingDimension, embeddings, processingTimeMs, message
 *   }
 *   where `embeddings` is an array of per-embedding objects:
 *   {
 *     index, filename, avgCosineSimilarity, maxCosineSimilarity,
 *     minCosineSimilarity, isOutlier, status
 *   }
 */
export async function detectEnrollmentOutliers(sessionId) {
  const url = `${AI_MICROSERVICE_BASE_URL}${DETECT_OUTLIERS_ENDPOINT}`;

  console.log(`${LOG_TAG} Phase 6B.2 -> POST ${url} (sessionId: ${sessionId || "none"})`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: sessionId ? JSON.stringify({ sessionId }) : undefined,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Phase 6B.2 failed:`, detail);
    throw new Error(`detectEnrollmentOutliers failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  console.log(`${LOG_TAG} Phase 6B.2 response received:`, data);
  return data;
}

/**
 * Trigger Phase 6B.3 — generate the master 512-d face embedding from ONLY
 * the valid (non-outlier) embeddings produced in Phase 6B.2.
 *
 * The microservice:
 *   1. Re-generates + re-normalizes all embeddings from the session folder.
 *   2. Re-runs outlier detection (same OUTLIER_COSINE_THRESHOLD = 0.75).
 *   3. Computes the arithmetic mean of valid embeddings.
 *   4. L2-normalizes the mean → master embedding (dim=512, norm≈1.0).
 *   5. Validates the master embedding (dim, dtype, NaN, Inf, norm).
 *   6. Stores the master embedding in-process for Phase 6C.
 *   7. Returns ONLY a summary — the 512 float values are NEVER returned.
 *
 * Nothing is saved to the database.
 *
 * @param {string} [sessionId] - Unique enrollment session ID.
 * @returns {Promise<object>} Phase 6B.3 master embedding summary, e.g.:
 *   {
 *     success, phase, masterEmbeddingCreated, embeddingDimension,
 *     validEmbeddingsUsed, outliersExcluded, masterEmbeddingNorm,
 *     averageSimilarity, averageConfidence, averageBlurScore,
 *     averageBrightness, readyForDatabase, processingTimeMs, message
 *   }
 */
export async function generateMasterEmbedding(sessionId) {
  const url = `${AI_MICROSERVICE_BASE_URL}${GENERATE_MASTER_ENDPOINT}`;

  console.log(`${LOG_TAG} Phase 6B.3 -> POST ${url} (sessionId: ${sessionId || "none"})`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: sessionId ? JSON.stringify({ sessionId }) : undefined,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Phase 6B.3 failed:`, detail);
    throw new Error(`generateMasterEmbedding failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  console.log(`${LOG_TAG} Phase 6B.3 response received:`, data);
  return data;
}

/**
 * Phase 6 — End-to-End Enrollment Pipeline Verification.
 *
 * Runs AUTOMATICALLY after Phase 6B.3 completes. Re-executes the ENTIRE
 * enrollment pipeline — images → embeddings → normalization → outlier
 * detection → master embedding — in a SINGLE in-memory pass on the AI
 * microservice and verifies that every stage produces correct, valid results.
 *
 * The microservice:
 *   1. Counts the images captured in the session folder.
 *   2. Re-generates raw 512-d embeddings (mirrors Phase 6A logic).
 *   3. L2-normalizes every embedding (mirrors Phase 6B.1 logic).
 *   4. Detects outliers via pairwise cosine similarity (mirrors Phase 6B.2).
 *   5. Generates + validates the master embedding (mirrors Phase 6B.3).
 *   6. Prints a detailed PASS/FAIL report to the Python terminal.
 *   7. Returns ONLY the JSON summary below — the 512-d master vector is
 *      NEVER exposed to the frontend.
 *
 * Nothing is saved to the database by this endpoint.
 *
 * @param {string} [sessionId] - Unique enrollment session ID.
 * @returns {Promise<object>} Verification summary, e.g.:
 *   {
 *     success, imagesCaptured, embeddingsGenerated, embeddingsNormalized,
 *     validEmbeddings, outliers, embeddingDimension, masterEmbeddingCreated,
 *     masterEmbeddingNorm, readyForDatabase, overallStatus, processingTimeMs
 *   }
 */
export async function verifyEnrollmentPipeline(sessionId) {
  const url = `${AI_MICROSERVICE_BASE_URL}${VERIFY_PIPELINE_ENDPOINT}`;

  console.log(`${LOG_TAG} Phase 6 Verify -> POST ${url} (sessionId: ${sessionId || "none"})`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: sessionId ? JSON.stringify({ sessionId }) : undefined,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Phase 6 Verify failed:`, detail);
    throw new Error(`verifyEnrollmentPipeline failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  console.log(`${LOG_TAG} Phase 6 Verify response received:`, data);
  return data;
}

/**
 * Trigger Phase 6C — Database Storage
 * Persist the enrollment result into PostgreSQL after Phase 6B completes successfully.
 * 
 * @param {object} payload
 * @param {string} payload.sessionId
 * @param {string} payload.childId
 * @param {number} payload.imagesCaptured
 * @param {number} payload.imagesUsed
 * @param {number} payload.outliersRemoved
 */
export async function storeMasterEmbedding(payload) {
  const url = `${AI_MICROSERVICE_BASE_URL}${SAVE_TO_DATABASE_ENDPOINT}`;

  console.log(`${LOG_TAG} Phase 6C -> POST ${url}`, payload);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.error || errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Phase 6C failed:`, detail);
    throw new Error(`storeMasterEmbedding failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  console.log(`${LOG_TAG} Phase 6C response received:`, data);
  return data;
}

// ─── Phase 7A — Live Attendance Embedding Generation ─────────────────────────
// Sends ONE live attendance camera frame to the AI microservice.
// The microservice runs the SAME quality validation as /detect-face.
//   • If captureAllowed == false → returns metadata with reason.
//   • If captureAllowed == true  → generates ONE 512-d L2-normalised embedding,
//     stores it in-process only, and returns only metadata (never the vector).
//
// This function does NOT:
//   - query the database
//   - compare with stored embeddings
//   - perform recognition
//   - mark attendance
//
// @param {Blob}   imageBlob  - Single JPEG video frame from the attendance camera.
// @param {Object} [meta]     - Optional: { cameraId, frameIndex }
// @returns {Promise<object>} Phase 7A metadata response:
//   {
//     success, phase, captureAllowed, embeddingGenerated,
//     embeddingDimension?, embeddingNormalized?, readyForRecognition?,
//     frameKey?, reason?, status, nextAction?, processingTimeMs
//   }
export async function generateLiveEmbedding(imageBlob, meta = {}) {
  const url = `${AI_MICROSERVICE_BASE_URL}/attendance/generate-live-embedding`;

  const formData = new FormData();
  formData.append("image", imageBlob, "live_frame.jpg");
  if (meta.cameraId) formData.append("cameraId", meta.cameraId);
  if (meta.frameIndex !== undefined && meta.frameIndex !== null) {
    formData.append("frameIndex", String(meta.frameIndex));
  }

  console.log(`${LOG_TAG} Phase 7A -> POST ${url}`, {
    bytes: imageBlob.size,
    cameraId: meta.cameraId,
    frameIndex: meta.frameIndex,
  });

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Phase 7A failed:`, detail);
    throw new Error(`generateLiveEmbedding failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  console.log(`${LOG_TAG} Phase 7A response:`, {
    captureAllowed: data.captureAllowed,
    embeddingGenerated: data.embeddingGenerated,
    status: data.status,
    processingTimeMs: data.processingTimeMs,
  });
  return data;
}

// ─── Phase 8B — Database Embedding Loader ─────────────────────────────────────
// Triggers the AI microservice to connect to PostgreSQL, read ALL active
// FACE_RECOGNITION records, validate each embedding, and store valid ones
// in the in-process recognition cache.
//
// This function does NOT:
//   - receive embedding vectors (they stay inside the Python process)
//   - compare embeddings
//   - perform recognition
//   - mark attendance
//   - write to the database
//
// @returns {Promise<object>} Phase 8B summary:
//   {
//     success, phase, databaseConnected, childrenLoaded,
//     validEmbeddings, invalidEmbeddings, skipped,
//     readyForRecognition, processingTimeMs
//   }
export async function loadEnrolledEmbeddings(orphanageId) {
  const url = `${AI_MICROSERVICE_BASE_URL}/attendance/load-enrolled-embeddings`;

  console.log("[Phase 8B]");
  console.log("Loading Database...");

  const payload = orphanageId ? { orphanageId } : {};

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.error || errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Phase 8B failed:`, detail);
    console.log("Phase 8B FAILED");
    throw new Error(`loadEnrolledEmbeddings failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));

  if (data.databaseConnected) {
    console.log("Database Connected");
  }
  
  console.log("Loading Master Embeddings");
  console.log(`Children Loaded : ${data.childrenLoaded ?? 0}`);
  console.log(`Valid Embeddings : ${data.validEmbeddings ?? 0}`);
  
  if (data.readyForMatching) {
    console.log("Ready For Matching");
    console.log("Phase 8B PASSED");
  } else {
    console.log("Phase 8B FAILED");
  }

  return data;
}

// ─── Phase 8B — Cache Verification (Development Only) ────────────────────────
// Calls GET /attendance/verify-embedding-cache to inspect the in-process
// recognition cache without querying the database again.
//
// @returns {Promise<object>} Cache stats:
//   {
//     success, phase, databaseConnected, totalChildren,
//     totalEmbeddingsLoaded, averageEmbeddingDimension,
//     invalidRecords, cacheSize, readyForRecognition
//   }
export async function verifyEmbeddingCache() {
  const url = `${AI_MICROSERVICE_BASE_URL}/attendance/verify-embedding-cache`;

  console.log(`${LOG_TAG} Phase 8B Verify -> GET ${url}`);

  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.detail || errBody?.message || detail;
    } catch {
      /* response had no JSON body */
    }
    console.error(`${LOG_TAG} Phase 8B cache verify failed:`, detail);
    throw new Error(`verifyEmbeddingCache failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  console.log(`${LOG_TAG} Phase 8B cache verify:`, {
    totalChildren: data.totalChildren,
    totalEmbeddingsLoaded: data.totalEmbeddingsLoaded,
    averageEmbeddingDimension: data.averageEmbeddingDimension,
    cacheSize: data.cacheSize,
    readyForRecognition: data.readyForRecognition,
  });
  return data;
}

// ─── Phase 7C & 7D — Recognition & Decision Engine ──────────────────────────
// Submits a frameKey (generated by Phase 7A) to be recognized against the
// loaded master embeddings. Performs cosine similarity (7C) and 5-frame
// stability checks (7D).
//
// @returns {Promise<object>} Phase 7D summary:
//   {
//     success, phase, recognized, confirmed, childId,
//     currentChildId, similarity, threshold, stableFrames,
//     requiredFrames, status, processingTimeMs
//   }
// Phase 8C - Cosine Similarity Matching
// Phase 8C & 8D - Recognition Decision
export async function recognizeFace(frameKey) {
  const url = `${AI_MICROSERVICE_BASE_URL}/attendance/recognize-live`;

  const formData = new FormData();
  formData.append("frameKey", frameKey);

  console.log("[Phase 8C]");
  console.log("Matching Started");
  console.log("Using Cached Embeddings");

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody?.error || errBody?.detail || errBody?.message || detail;
    } catch {
      //
    }
    console.error(`${LOG_TAG} Phase 8C/8D failed:`, detail);
    console.log("Phase 8C FAILED");
    throw new Error(`recognizeFace failed: ${detail}`);
  }

  const data = await response.json().catch(() => ({}));

  console.log(`Children Compared : ${data.childrenCompared ?? 0}`);
  console.log("Similarity Calculation Finished");
  console.log(`Top Match : ${data.childId || data.bestMatch || "N/A"}`);
  console.log(`Similarity : ${data.bestSimilarity ?? 0.0}`);
  console.log(`Comparison Time : ${data.comparisonTimeMs ?? 0.0} ms`);
  console.log("Ready For Recognition");
  console.log("Phase 8C PASSED");

  console.log("");
  console.log("[Phase 8D]");
  console.log("Recognition Started");
  console.log(`Best Match : ${data.childId || data.bestMatch || "N/A"}`);
  console.log(`Similarity : ${data.bestSimilarity ?? 0.0}`);
  console.log(`Gap : ${data.similarityGap ?? 0.0}`);
  console.log(`Decision : ${data.recognitionStatus}`);
  
  if (data.recognitionStatus === "RECOGNIZED") {
    console.log(`Confidence : ${data.confidenceLevel}`);
    console.log("Ready For Attendance");
    console.log("Phase 8D PASSED");
  } else if (data.recognitionStatus === "UNKNOWN_FACE") {
    console.log("Phase 8D PASSED");
  } else if (data.recognitionStatus === "AMBIGUOUS_MATCH") {
    console.log("Phase 8D PASSED");
  }

  return data;
}
