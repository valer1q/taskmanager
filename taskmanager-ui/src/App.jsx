import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:8080"; // Spring Boot

function toInputDateTimeValue(isoString) {
    // isoString like "2026-02-10T23:59:00"
    if (!isoString) return "";
    // For input[type=datetime-local] seconds are optional; we’ll keep minutes
    return isoString.slice(0, 16);
}

function toApiDateTimeValue(inputValue) {
    // inputValue like "2026-02-10T23:59"
    if (!inputValue) return null;
    // backend expects LocalDateTime, seconds optional usually ok,
    // but to be safe add ":00"
    return inputValue.length === 16 ? `${inputValue}:00` : inputValue;
}

function Badge({ children }) {
    return (
        <span
            style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #333",
                fontSize: 12,
            }}
        >
      {children}
    </span>
    );
}

export default function App() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        title: "",
        description: "",
        status: "TODO",
        dueDate: "", // datetime-local
    });

    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState(null); // string or validation obj
    const [success, setSuccess] = useState(null);

    const isEditing = useMemo(() => editingId !== null, [editingId]);

    async function apiFetch(path, options = {}) {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
            ...options,
        });

        const contentType = res.headers.get("content-type") || "";
        const hasJson = contentType.includes("application/json");
        const body = hasJson ? await res.json().catch(() => null) : null;

        if (!res.ok) {
            // backend validation format support
            const msg =
                body?.message ||
                body?.error ||
                `Request failed: ${res.status} ${res.statusText}`;
            const err = { status: res.status, body, message: msg };
            throw err;
        }

        return body;
    }

    async function loadTasks() {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch("/tasks", { method: "GET" });
            setTasks(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTasks();
    }, []);

    function resetForm() {
        setForm({
            title: "",
            description: "",
            status: "TODO",
            dueDate: "",
        });
        setEditingId(null);
        setError(null);
    }

    function showOk(msg) {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 1800);
    }

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);

        // минимальная клиентская проверка (сервер всё равно проверит)
        if (!form.title.trim()) {
            setError({ message: "Title is required (client check)" });
            return;
        }

        const payload = {
            title: form.title.trim(),
            description: form.description?.trim() ? form.description.trim() : null,
            status: form.status,
            dueDate: toApiDateTimeValue(form.dueDate),
        };

        try {
            if (isEditing) {
                const updated = await apiFetch(`/tasks/${editingId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
                setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                showOk("Updated");
                resetForm();
            } else {
                const created = await apiFetch(`/tasks`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });

                // Spring может вернуть созданный task в body — мы его добавим
                setTasks((prev) => [created, ...prev]);
                showOk("Created");
                resetForm();
            }
        } catch (e2) {
            setError(e2);
        }
    }

    function startEdit(task) {
        setEditingId(task.id);
        setError(null);
        setForm({
            title: task.title || "",
            description: task.description || "",
            status: task.status || "TODO",
            dueDate: toInputDateTimeValue(task.dueDate),
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function removeTask(id) {
        if (!confirm("Delete this task?")) return;
        setError(null);
        try {
            await apiFetch(`/tasks/${id}`, { method: "DELETE" });
            setTasks((prev) => prev.filter((t) => t.id !== id));
            showOk("Deleted");
            if (editingId === id) resetForm();
        } catch (e) {
            setError(e);
        }
    }

    const validationErrors = error?.body?.errors;

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", padding: 18, maxWidth: 980, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 6px" }}>Task Manager UI (React)</h2>
            <div style={{ opacity: 0.75, marginBottom: 16 }}>
                Backend: <code>{API_BASE}</code>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, alignItems: "start" }}>
                {/* FORM */}
                <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <strong>{isEditing ? "Edit task" : "Create task"}</strong>
                        {isEditing && (
                            <button type="button" onClick={resetForm} style={{ padding: "6px 10px" }}>
                                Cancel
                            </button>
                        )}
                    </div>

                    <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Title *</span>
                            <input
                                value={form.title}
                                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                placeholder="e.g. Fix login bug"
                                maxLength={100}
                                style={{ padding: 8, borderRadius: 10, border: "1px solid #ccc" }}
                            />
                            <small style={{ opacity: 0.7 }}>3–100 символов (сервер проверит)</small>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Description</span>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                placeholder="optional (max 500)"
                                rows={4}
                                maxLength={500}
                                style={{ padding: 8, borderRadius: 10, border: "1px solid #ccc", resize: "vertical" }}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Status *</span>
                            <select
                                value={form.status}
                                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                                style={{ padding: 8, borderRadius: 10, border: "1px solid #ccc" }}
                            >
                                <option value="TODO">TODO</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="DONE">DONE</option>
                            </select>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Due date</span>
                            <input
                                type="datetime-local"
                                value={form.dueDate}
                                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                                style={{ padding: 8, borderRadius: 10, border: "1px solid #ccc" }}
                            />
                            <small style={{ opacity: 0.7 }}>должна быть в будущем (если указана)</small>
                        </label>

                        <button
                            type="submit"
                            style={{
                                padding: "10px 12px",
                                borderRadius: 12,
                                border: "1px solid #333",
                                background: "#111",
                                color: "white",
                                cursor: "pointer",
                            }}
                        >
                            {isEditing ? "Save" : "Create"}
                        </button>
                    </form>

                    {success && (
                        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#e9ffe9", border: "1px solid #b8e8b8" }}>
                            {success}
                        </div>
                    )}

                    {error && (
                        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#fff1f1", border: "1px solid #f0b4b4" }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>Error</div>
                            <div style={{ marginBottom: 6 }}>
                                {error.message || "Request failed"}
                                {typeof error.status === "number" ? ` (status ${error.status})` : ""}
                            </div>

                            {/* backend validation details */}
                            {Array.isArray(validationErrors) && validationErrors.length > 0 && (
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {validationErrors.map((ve, idx) => (
                                        <li key={idx}>
                                            <code>{ve.field}</code>: {ve.message}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* fallback dump */}
                            {error?.body && !Array.isArray(validationErrors) && (
                                <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                  {JSON.stringify(error.body, null, 2)}
                </pre>
                            )}
                        </div>
                    )}
                </div>

                {/* LIST */}
                <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <strong>Tasks</strong>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" onClick={loadTasks} style={{ padding: "6px 10px" }}>
                                Refresh
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: 10, opacity: 0.7 }}>Loading…</div>
                    ) : tasks.length === 0 ? (
                        <div style={{ padding: 10, opacity: 0.7 }}>No tasks yet.</div>
                    ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                            {tasks
                                .slice()
                                .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
                                .map((t) => (
                                    <div key={t.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, wordBreak: "break-word" }}>
                                                    {t.title}
                                                </div>

                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
                                                    <Badge>{t.status}</Badge>
                                                    {t.dueDate && <Badge>due: {toInputDateTimeValue(t.dueDate).replace("T", " ")}</Badge>}
                                                    {t.createdAt && (
                                                        <span style={{ opacity: 0.6, fontSize: 12 }}>
                              created: {toInputDateTimeValue(t.createdAt).replace("T", " ")}
                            </span>
                                                    )}
                                                </div>

                                                {t.description && <div style={{ opacity: 0.9, whiteSpace: "pre-wrap" }}>{t.description}</div>}

                                                <div style={{ marginTop: 8, opacity: 0.6, fontSize: 12 }}>
                                                    <code>{t.id}</code>
                                                </div>
                                            </div>

                                            <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                                                <button type="button" onClick={() => startEdit(t)} style={{ padding: "6px 10px" }}>
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTask(t.id)}
                                                    style={{ padding: "6px 10px", border: "1px solid #c33", color: "#c33" }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
                        Если запросы падают с CORS — смотри блок ниже.
                    </div>
                </div>
            </div>
        </div>
    );
}
