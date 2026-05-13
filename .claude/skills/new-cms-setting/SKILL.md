---
name: new-cms-setting
description: Add a new editable site_settings field end-to-end (seed default, frontend reader, optional admin UI hint). Use when the user wants something currently hardcoded to be editable from /admin/content.
allowed-tools: Read, Edit, PowerShell
---

# New CMS setting

## Steps

1. Decide:
   - **key**: dotted, lowercase (e.g. `cta.value_props`, `hero.video_url`)
   - **type**: `TEXT`, `LONGTEXT`, `URL`, `IMAGE`, or `JSON`
   - **group**: existing group if logical, new one OK (e.g. `hero`, `footer`, `legal`)
   - **is_public**: `True` unless this is admin-only metadata
   - **default value**

2. Edit `backend/app/seed_settings.py` — add to the `DEFAULTS` array:

   ```python
   {
       "key": "<dotted.key>",
       "label": "<Human label for the admin>",
       "group": "<group>",
       "type": SettingType.<TEXT|LONGTEXT|URL|IMAGE|JSON>,
       "value": "<default value>",
       "description": "<one-sentence hint shown under the input>",
       "sort_order": <integer>,
   },
   ```

   For JSON: the `value` is a JSON-encoded string. Escape with `\\`.

3. Run the seeder (idempotent — only inserts new keys):
   ```powershell
   $env:PYTHONIOENCODING="utf-8"
   cd C:\Users\Rahul\run-for-a-cause\backend
   .\.venv\Scripts\python.exe -m app.seed_settings
   ```

4. Read in the consuming component:

   **Page (server component)** — read settings up front and pass props:
   ```tsx
   const s = await fetchPublicSettings();
   <MyComponent value={s["my.key"] || "fallback"} />
   ```

   **JSON setting**:
   ```tsx
   import { parseJsonSetting } from "@/lib/hooks/useSiteSettings";
   const items = parseJsonSetting<MyShape[]>(s["my.json.key"], []);
   ```

5. Provide a hardcoded **fallback** so the component renders before settings
   load and survives an empty/missing key:
   ```tsx
   const value = s["my.key"]?.trim() || DEFAULTS.value;
   ```

6. The `/admin/content` editor auto-discovers the new key and renders the
   appropriate input (text / longtext / url / image / json). If the key
   ends with `_url` and `value_type` is URL, it gets the URL input. JSON
   keys get the live-validated `<JsonEditor>` with pretty-print.

## Verify

- Reload `/admin/content` → tab corresponding to the group → confirm the new field is editable
- Edit and save → toast "Saved." → cache revalidates
- Reload the consuming page → new value renders

## Don't

- Hardcode the new string in the component when reading from settings — defeats the purpose
- Forget the seed step — the key won't exist in the admin UI
- Skip the fallback — empty value will crash some components (e.g. `<Image src={url}>` rejects `""`)
