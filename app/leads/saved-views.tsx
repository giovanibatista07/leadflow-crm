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
    <div>
      <h2>Saved views</h2>
      {views.length === 0 && <p>No saved views yet.</p>}
      <ul>
        {views.map((view) => (
          <li key={view.id}>
            <a href={`/leads${viewQueryString(view.filters) ? `?${viewQueryString(view.filters)}` : ""}`}>
              {view.name}
            </a>{" "}
            <form action={deleteViewForm} style={{ display: "inline" }}>
              <input type="hidden" name="viewId" value={view.id} />
              <button type="submit">Delete</button>
            </form>
          </li>
        ))}
      </ul>

      <form action={saveViewForm}>
        {currentQueryString &&
          Array.from(new URLSearchParams(currentQueryString).entries()).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        <input type="text" name="name" placeholder="Name this view" required />
        <button type="submit">Save current search as a view</button>
      </form>
    </div>
  );
}
