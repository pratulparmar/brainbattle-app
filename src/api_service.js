/**
 * api_service.js — BrainBattle API Service
 * ==========================================
 * Central service for all RAG API calls.
 * Add this file to brainbattle/src/
 *
 * Usage:
 *   import { askDoubt, syncProgress, getUserAnalytics } from './api_service';
 */

const RAG_URL    = "https://brainbattle-rag-production.up.railway.app";
const APP_TOKEN  = process.env.REACT_APP_API_TOKEN || "brainbattle-dev-key";

const headers = {
    "Content-Type":  "application/json",
    "X-App-Token":   APP_TOKEN,
};

// ── Doubt Solver (Streaming) ──────────────────────────────────────────────
export async function askDoubt({ question, subject, history = [] }, callbacks) {
    const { onToken, onSources, onDone, onError } = callbacks;

    const res = await fetch(`${RAG_URL}/doubt`, {
        method:  "POST",
        headers,
        body: JSON.stringify({ question, subject, history }),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
                const evt = JSON.parse(line.slice(6));
                if      (evt.type === "sources") onSources?.(evt.sources);
                else if (evt.type === "token")   onToken?.(evt.text);
                else if (evt.type === "done")    onDone?.();
                else if (evt.type === "error")   onError?.(evt.text);
            } catch (e) {}
        }
    }
}

// ── Feynman Teaching ──────────────────────────────────────────────────────
export async function teach({ topic, subject, stage, history = [], user_msg }) {
    const res = await fetch(`${RAG_URL}/teach`, {
        method:  "POST",
        headers,
        body: JSON.stringify({ topic, subject, stage, history, user_msg }),
    });
    return res.json();
}

// ── MCQ Generation ────────────────────────────────────────────────────────
export async function generateMCQs({ topic, subject, context, count = 3 }) {
    const res = await fetch(`${RAG_URL}/mcqs`, {
        method:  "POST",
        headers,
        body: JSON.stringify({ topic, subject, context, count }),
    });
    return res.json();
}

// ── Sync Progress ─────────────────────────────────────────────────────────
export async function syncProgress(records) {
    /**
     * records: array of {
     *   user_id, subject, chapter,
     *   is_correct (bool), time_spent (seconds), q_id (optional)
     * }
     */
    try {
        const res = await fetch(`${RAG_URL}/sync-progress`, {
            method:  "POST",
            headers,
            body: JSON.stringify(records),
        });
        return res.json();
    } catch (e) {
        // Fail silently — don't interrupt user experience
        console.warn("Progress sync failed:", e);
        return null;
    }
}

// ── User Analytics ────────────────────────────────────────────────────────
export async function getUserAnalytics(userId) {
    const res = await fetch(`${RAG_URL}/user-analytics/${userId}`, {
        headers,
    });
    return res.json();
}

// ── Health Check ──────────────────────────────────────────────────────────
export async function checkHealth() {
    const res = await fetch(`${RAG_URL}/health`);
    return res.json();
}
