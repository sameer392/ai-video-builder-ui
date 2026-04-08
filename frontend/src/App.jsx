import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

function App() {
  const [people, setPeople] = useState([]);
  const [person, setPerson] = useState("sameer");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const apiKey = import.meta.env.VITE_API_KEY;

  const requestConfig = useMemo(
    () => ({
      headers: apiKey ? { "x-api-key": apiKey } : {},
    }),
    [apiKey]
  );

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [peopleResponse, historyResponse] = await Promise.all([
          api.get("/persons", requestConfig),
          api.get("/history", requestConfig),
        ]);

        setPeople(peopleResponse.data.people || []);
        setHistory(historyResponse.data.items || []);
      } catch (loadError) {
        setError(loadError.response?.data?.error || "Unable to fetch initial data.");
      }
    }

    loadInitialData();
  }, [requestConfig]);

  async function handleGenerate(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post(
        "/generate",
        { person, script },
        requestConfig
      );

      const output = {
        id: response.data.promptId,
        url: response.data.mediaUrl,
        type: response.data.mediaType,
      };
      setResult(output);
      setHistory((prev) => [response.data.historyItem, ...prev].slice(0, 25));
    } catch (generateError) {
      setError(generateError.response?.data?.error || "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-8">
      <main className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur md:p-8">
        <h1 className="text-2xl font-semibold md:text-3xl">AI Marketing Studio</h1>
        <p className="mt-2 text-sm text-slate-300 md:text-base">
          Generate personalized marketing images/videos with ComfyUI.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleGenerate} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <label className="block text-sm font-medium">Select Person</label>
            <select
              value={person}
              onChange={(event) => setPerson(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm"
            >
              {people.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium">Prompt / Script</label>
            <textarea
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder="Write campaign script..."
              className="h-40 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </form>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-lg font-medium">Preview</h2>
            {loading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                Generation in progress...
              </div>
            )}

            {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

            {!loading && result?.url && (
              <div className="mt-4 space-y-3">
                {result.type === "video" ? (
                  <video controls className="max-h-96 w-full rounded-lg object-contain">
                    <source src={result.url} />
                  </video>
                ) : (
                  <img
                    src={result.url}
                    alt="Generated media"
                    className="max-h-96 w-full rounded-lg object-contain"
                  />
                )}
                <a
                  className="inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                  href={result.url}
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-medium">Recent Generations</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {history.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">{item.person}</p>
                <p className="mt-1 text-sm">{item.script}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-xs text-violet-300 hover:text-violet-200"
                >
                  Open output
                </a>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
