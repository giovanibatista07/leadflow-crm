import { deleteView, saveView } from "./actions";

async function deleteViewForm(formData: FormData) {
  "use server";
  await deleteView(formData);
}

async function saveViewForm(formData: FormData) {
  "use server";
  await saveView(formData);
}

type SavedViewRow = { id: string; name: string; filters: unknown };

/** Rebuilds a saved view's query string from its stored filters JSON. */
function viewQueryString(filters: unknown): string {
  if (typeof filters !== "object" || filters === null) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export function SavedViews({
  views,
  currentQueryString,
}: {
  views: SavedViewRow[];
  currentQueryString: string;
}) {
  return (
    <div className="card">
      <h2>Saved views</h2>
      {views.length === 0 && <p className="mt-1">No saved views yet.</p>}
      {views.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {views.map((view) => (
            <li key={view.id} className="flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-3 pr-1">
              <a
                href={`/leads${viewQueryString(view.filters) ? `?${viewQueryString(view.filters)}` : ""}`}
                className="text-xs font-medium"
              >
                {view.name}
              </a>
              <form action={deleteViewForm}>
                <input type="hidden" name="viewId" value={view.id} />
                <button
                  type="submit"
                  className="rounded-full bg-transparent px-1.5 py-0.5 text-xs font-medium text-slate-500 shadow-none hover:bg-red-100 hover:text-red-700"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={saveViewForm} className="mt-3 flex flex-wrap items-center gap-2">
        {currentQueryString &&
          Array.from(new URLSearchParams(currentQueryString).entries()).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        <input type="text" name="name" placeholder="Name this view" required className="w-auto flex-1 min-w-[160px]" />
        <button type="submit">Save current search as a view</button>
      </form>
    </div>
  );
}
