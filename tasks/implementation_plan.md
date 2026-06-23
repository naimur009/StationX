# Implementation Plan: Task 6 — Shared Uploads

> **Source:** `current_task.md` (Task 6), reviewed against `PRD.md`, `architecture.md`, `database.md`, `API.md`, `AI_rules.md`, `theme.md`, `decision.md`, `TEST_CASES.md`, `backlog.md`
>
> **Status:** Derived from existing `current_task.md` plan; verified against actual codebase state.

---

## Feature Overview

- **Feature name:** Shared Uploads (utility, not a standalone PRD feature)
- **Business goal:** Provide a single, reusable file-upload endpoint and frontend component that all other modules (Products, Settings, and future modules needing image uploads) use for uploading images to Cloudinary.
- **User value:** Admins can upload restaurant logos and product photos via a drag-and-drop UI instead of pasting external URLs. One consistent upload UX across the entire dashboard.

---

## Approved Scope

**In scope:**
- Backend `POST /uploads/image` endpoint — accepts `multipart/form-data`, validates MIME type + size server-side, uploads to Cloudinary, returns `{ url, publicId }`
- Backend `lib/upload.ts` — Cloudinary client wrapper living alongside existing stubs (`jwt.ts`, `pdf.ts`, `email.ts`)
- Frontend `<ImageUpload>` reusable component — drop zone, preview, upload progress, error states
- Integration of `<ImageUpload>` into `LogoSettingsSection.tsx` — replacing the current URL-input + "Note: File upload is not yet available" banner
- Cloudinary env vars in `backend/src/config/env.ts` and `backend/.env.example`
- `cloudinary`, `multer`, `@types/multer` npm packages added to backend

**Explicitly out of scope (future tasks):**
- MIME spoofing via magic byte sniffing (e.g. `file-type` package) — deferred per Design Decisions below
- Orphaned asset cleanup (uploaded image never attached to a product) — accepted v1 gap
- Integration into Products module — that's Task 7's responsibility; the component is built here, Products wires it in
- SVG uploads — rejected for v1 due to XSS risk
- Non-image file uploads (PDFs, documents) — not required by any current module

---

## Technical Analysis

### Affected Components

| Layer | Component | Change |
|---|---|---|
| **Backend — Config** | `backend/src/config/env.ts` | Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `UPLOAD_MAX_FILE_SIZE`, `UPLOAD_ALLOWED_MIME_TYPES` |
| **Backend — Lib** | `backend/src/lib/upload.ts` | Rewrite from empty stub to real Cloudinary client (`uploadToCloudinary`, `deleteFromCloudinary`) |
| **Backend — Module** | `backend/src/modules/uploads/` (new) | `uploads.routes.ts`, `uploads.controller.ts`, `uploads.service.ts`, `uploads.validation.ts` — the `POST /uploads/image` endpoint |
| **Backend — App** | `backend/src/app.ts` | Wire `uploadsRoutes` under `/api/v1` |
| **Backend — Dependencies** | `backend/package.json` | Add `cloudinary`, `multer`; add `@types/multer` to devDeps |
| **Backend — Env example** | `backend/.env.example` | Add Cloudinary vars + upload limits |
| **Frontend — Shared component** | `frontend/src/components/shared/ImageUpload.tsx` (new) | Reusable upload component with all visual states |
| **Frontend — Settings** | `frontend/src/features/settings/components/LogoSettingsSection.tsx` | Replace URL input + banner with `<ImageUpload>` |
| **Frontend — API client** | `frontend/src/lib/api-client.ts` | Add `uploadFile` helper for `multipart/form-data` (existing client hardcodes JSON Content-Type) |
| **Frontend — Types** | `frontend/src/types/index.ts` | Add `UploadResponse` type if not already present |

### Database Impact

**None.** The upload endpoint is a thin proxy — it never touches Mongo. It returns `{ url, publicId }` for the calling route to embed in the target document (Product, Settings).

### API Impact

**Contract (no change to existing endpoints):**

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| POST | `/uploads/image` | Required | None (checked by caller) | `multipart/form-data`, field `file`. MIME + size validated before Cloudinary. |

**Request:** `multipart/form-data`, field name `file`. Content-Type not JSON — this is the one endpoint that doesn't use `Content-Type: application/json`.

**Response 201:**
```json
{ "data": { "url": "https://res.cloudinary.com/...", "publicId": "uploads/product123" } }
```

**Error codes** (from `API.md` §23 — no new codes needed):
- `400 UNSUPPORTED_FILE_TYPE`
- `400 FILE_TOO_LARGE`
- `401 UNAUTHORIZED`

### Authentication & Authorization

- `authenticate` middleware is required (no unauthenticated uploads).
- `authorize` is deliberately **absent** from this endpoint per `API.md` §4 — permission is enforced by the calling route (e.g., `POST /products` with `products:create`). This endpoint is a thin utility, not a permission boundary.
- Rate limiting: Not explicitly required per `API.md` §23 (no rate-limiter entry for uploads). Adding a moderate limiter (e.g., 20 req/15min per user) is defensive but not required by any doc.

### Security Requirements

| Requirement | Implementation |
|---|---|
| **MIME validation** | Check `file.mimetype` against allowlist (`image/jpeg`, `image/png`, `image/webp`) via multer's `fileFilter`. Return `400 UNSUPPORTED_FILE_TYPE`. |
| **Size validation** | Check via multer `limits.fileSize` (default 5MB). Return `400 FILE_TOO_LARGE`. |
| **No env-var secrets in code** | Cloudinary API key/secret in env vars only, validated by Zod env schema at boot. |
| **CSP compatibility** | Helmet config in `app.ts` already allows `https://res.cloudinary.com` in `img-src` — confirmed during code review, no change needed. |

---

## Design Decisions

Every decision below was checked against `theme.md` and `AI_rules.md`. No new tokens are introduced.

| Decision | Choice | Rationale |
|---|---|---|
| **Cloudinary root folder** | `whatta-cup` (env var `CLOUDINARY_ROOT_FOLDER`, default). Sub-folders: `logos/`, `products/` | Matches project name. Configurable per environment. |
| **Allowed formats** | JPEG, PNG, WebP | Most common web image formats. SVG excluded (XSS risk). |
| **Max file size** | 5 MB (env var `UPLOAD_MAX_FILE_SIZE`, default `5242880`) | Matches `current_task.md` plan. Adjustable per deployment. |
| **MIME spoofing protection** | Postponed to v2 | `TEST_CASES.md` UPL-S-01 recommends magic-byte sniffing (`file-type` package). Deferred to keep the dependency list small; multer's MIME-from-extension check is accepted v1 risk. Flagged as an Open Question in `current_task.md` — answer accepted. |
| **Orphaned asset cleanup** | Accepted v1 gap | `TEST_CASES.md` UPL-E-01 flagged — agreed it's non-blocking. |
| **Frontend upload helper** | New `uploadFile` function in `api-client.ts` | Existing `apiClient` always sets `Content-Type: application/json`. File uploads need the browser to set `Content-Type: multipart/form-data; boundary=...` automatically. This is the only JSON-less endpoint in v1. |
| **ImageUpload aspect ratio hints** | 1:1 for products, 2:1 for logo | Visual hint via dashed overlay/label, not enforced at the API level. |

---

## Edge Cases

| Case | Expected Behavior |
|---|---|
| **No file sent** | multer's `single('file')` with no field present → passes to controller which throws `400 VALIDATION_ERROR` |
| **Empty file** | multer rejects via `limits.fileSize` (0 bytes < 5 MB? depends on multer behavior) — controller should also check if `!req.file` |
| **Non-image binary with image extension** (e.g., `.jpg` containing a renamed `.exe`) | Accepted in v1 (magic-byte sniffing deferred). multer's MIME check based on `file.mimetype` from the extension + OS type association. Not server-side verifiable beyond that. |
| **Upload succeeds but caller never embeds the returned `publicId`** (orphan) | Accepted v1 gap — Cloudinary retains the file. Manual cleanup or a future scheduled job can remove orphans. |
| **Simultaneous duplicate uploads of the same file** | Each returns its own Cloudinary asset (Cloudinary may deduplicate on its side, but we don't rely on it). |
| **Logo URL cleared in Settings** | LogoSettingsSection already handles clearing via `handleClear` → `onChange(null)` → `PUT /settings` with empty `logo` object. No change needed for this path. |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Cloudinary credentials not configured** | High (dev env) | Upload endpoint returns 500 | Env schema requires them; app fails to start if missing. Will be clear on first use. |
| **Multer buffer exhaustion** (large file held in memory before validation) | Low (5 MB limit) | OOM on constrained server | multer already streams to temp file in Node 14+; 5 MB is within safe limits. |
| **MIME spoofing passes multer** | Medium | Non-image stored in Cloudinary | Accepted v1 gap; magic-byte sniffing deferred. Low business impact (uploader is authenticated staff only). |
| **Frontend api-client.ts doesn't support multipart** | Certain (confirmed) | Build would fail at component integration | Mitigation built into this plan — `uploadFile` helper added. |

---

## Open Questions

None. The three open items from `current_task.md` were either answered by the docs or resolved as decisions above:

1. **Cloudinary account** — assumed available; credentials go in `.env`. No other option exists.
2. **MIME spoofing** — deferred to v2 per Design Decisions above.
3. **Orphaned cleanup** — accepted v1 gap per Design Decisions above.

---

## Doc Updates Required

**None.** This feature does not resolve any open item in `API.md` §25, `database.md` §8, or `AI_rules.md` §13. No upstream doc edits needed.

---

## Implementation Order

The build must be done in order because each step depends on the previous:

```
1. Backend: env.ts + .env.example — add Cloudinary vars
2. Backend: package.json — install cloudinary, multer
3. Backend: lib/upload.ts — Cloudinary client wrapper
4. Backend: uploads module — routes, controller, service, validation
5. Backend: app.ts — wire uploads routes
6. Backend: Verify with curl/ThunderClient
7. Frontend: api-client.ts — add uploadFile helper
8. Frontend: ImageUpload.tsx — reusable component
9. Frontend: LogoSettingsSection.tsx — integrate ImageUpload
10. Frontend: Verify end-to-end upload flow
11. Cleanup: remove "Note: upload not available" banner
```

---

## Task Breakdown

### Task 1: Add Cloudinary env vars to backend config

**Description:** Extend the Zod-validated env schema and `.env.example` with Cloudinary credentials and upload limits.

**Files:**
- `backend/src/config/env.ts` — add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `UPLOAD_MAX_FILE_SIZE`, `UPLOAD_ALLOWED_MIME_TYPES`
- `backend/.env.example` — add example values

**Acceptance Criteria:**
- Schema validates all new vars on boot
- `UPLOAD_MAX_FILE_SIZE` defaults to `5242880`
- `UPLOAD_ALLOWED_MIME_TYPES` defaults to `image/jpeg,image/png,image/webp`
- `CLOUDINARY_*` vars are required (fail-fast if missing)
- `tsc --noEmit` passes

### Task 2: Install cloudinary + multer dependencies

**Description:** Add production dependencies `cloudinary` and `multer`, dev dependency `@types/multer`.

**Command:** `npm install cloudinary multer && npm install -D @types/multer`

**Acceptance Criteria:**
- `package.json` lists `cloudinary`, `multer` in dependencies
- `package.json` lists `@types/multer` in devDependencies
- `npm run typecheck` passes

### Task 3: Implement lib/upload.ts — Cloudinary client wrapper

**Description:** Rewrite the existing empty stub at `backend/src/lib/upload.ts` to export a configured Cloudinary v2 client with `uploadToCloudinary` and `deleteFromCloudinary`.

**Pattern reference:** Matches existing `jwt.ts`, `pdf.ts` as utility libs — no route/controller/service separation needed here.

**Acceptance Criteria:**
- Exports `uploadToCloudinary(filePath: string, folder: string): Promise<{ url: string, publicId: string }>`
- Exports `deleteFromCloudinary(publicId: string): Promise<void>`
- Client configured from env vars at import time
- Errors thrown as `AppError` with appropriate status codes (500 on Cloudinary failure)

### Task 4: Build POST /uploads/image endpoint

**Description:** Create a new `uploads` module following the same pattern as `categories` (routes → controller → service → validation). The endpoint:
- Accepts `multipart/form-data` with a single `file` field via multer
- Validates MIME type and file size before reaching Cloudinary
- Calls `uploadToCloudinary` and returns the result
- Does NOT enforce a permission check (caller's route enforces its own)

**Files (new):**
- `backend/src/modules/uploads/uploads.routes.ts`
- `backend/src/modules/uploads/uploads.controller.ts`
- `backend/src/modules/uploads/uploads.service.ts`
- `backend/src/modules/uploads/uploads.validation.ts`

**Validation rules:**
- MIME type checked against `UPLOAD_ALLOWED_MIME_TYPES` env var
- File size checked against `UPLOAD_MAX_FILE_SIZE` env var via multer `limits.fileSize`
- If no file sent: `400 VALIDATION_ERROR`
- If file present but mimetype rejected: `400 UNSUPPORTED_FILE_TYPE`
- If file too large: `400 FILE_TOO_LARGE`

**Acceptance Criteria:**
- `POST /api/v1/uploads/image` with valid JPEG → `201 { data: { url, publicId } }`
- `POST /api/v1/uploads/image` with `.exe` → `400 UNSUPPORTED_FILE_TYPE`
- `POST /api/v1/uploads/image` with oversized file → `400 FILE_TOO_LARGE`
- `POST /api/v1/uploads/image` without auth → `401`
- `tsc --noEmit` passes

### Task 5: Wire uploads routes into app.ts

**Description:** Import and mount the uploads routes in `backend/src/app.ts` under `/api/v1`.

**Pattern reference:** Same as existing `app.use('/api/v1', categoriesRoutes)`.

**Acceptance Criteria:**
- Route registered and accessible at `/api/v1/uploads/image`
- Helmet CSP already allows Cloudinary URLs — no CSP change needed
- All existing routes still work

### Task 6: Add uploadFile helper to frontend api-client

**Description:** Add an `uploadFile` function to `frontend/src/lib/api-client.ts` that sends `multipart/form-data`. The existing `apiClient` function always sets `Content-Type: application/json`, which won't work for file uploads.

**Design:**
- Accept `(path: string, file: File, token?: string)` 
- Build `FormData` with the file under the `file` key
- Do NOT set `Content-Type` manually (browser sets it with boundary)
- Reuse the same auth token logic (read from auth store, auto-refresh on 401)
- Return `Promise<{ data: { url: string, publicId: string } }>`

**Acceptance Criteria:**
- Can be called independently and returns correct type
- Sets `Authorization` header from token
- Does NOT set `Content-Type: application/json`
- Handles 401 → refresh → retry same as `apiClient`

### Task 7: Build ImageUpload reusable component

**Description:** Create a new self-contained upload component at `frontend/src/components/shared/ImageUpload.tsx`.

**Visual states (all mapped to `theme.md` tokens, no new tokens):**

| State | Visual |
|---|---|
| **Empty** | Dashed border drop zone (`border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-6`), upload icon, "Click to browse or drag & drop" |
| **Drag-hover** | Border highlight (`border-blue-500`), background tint (`bg-blue-50/50`), "Drop here" overlay |
| **Uploading** | Spinner (`Loader2 animate-spin`), indeterminate progress bar, disable interaction |
| **Uploaded** | Thumbnail preview (`rounded-xl border border-slate-200`), replace button (ghost), remove button (icon, red X) |
| **Error** | Red error text (`text-red-500 text-sm`), retry button (secondary/small) |

**Props:**
```ts
interface ImageUploadProps {
  value?: { url: string; publicId: string } | null;
  onChange: (value: { url: string; publicId: string } | null) => void;
  folder?: string;
  accept?: string;
  maxSize?: number;
  aspectRatio?: string;
  disabled?: boolean;
}
```

**Behavior:**
- Hidden `<input type="file">` triggered by click on drop zone
- Preview image uses `object-cover` to fill the container
- Client-side MIME/size check runs before network call (instant feedback)
- On success: `onChange({ url, publicId })`
- On error: inline error message + retry button (re-selects file)
- Remove button: `onChange(null)`
- Clean up object URLs on unmount (`URL.revokeObjectURL`)
- Icons from `lucide-react`: `Upload`, `Image`, `X`, `Loader2`, `Check`

**Acceptance Criteria:**
- Renders all 5 visual states correctly
- Click opens file picker filtered to images
- Client-side MIME rejection shows before network call
- Successful upload shows thumbnail and calls `onChange`
- Replace clears current, re-opens file picker
- Remove calls `onChange(null)`
- `npm run lint && npm run typecheck` passes

### Task 8: Integrate ImageUpload into LogoSettingsSection

**Description:** Replace the current URL input + "Note: upload not available" banner with the new `<ImageUpload>` component.

**Changes to `frontend/src/features/settings/components/LogoSettingsSection.tsx`:**
- Remove the `Input` field for logo URL (lines 120-136 in current file)
- Remove the "Note: File upload is not yet available" banner (lines 138-140)
- Replace the manual preview div (lines 94-118) with `<ImageUpload>`
- Pass `folder="logos"` and `aspectRatio="2:1"`
- Wire `onChange` to `setValue('logo.url', ...)` and `setValue('logo.publicId', ...)`
- The existing `handleClear` can be simplified or removed (the component has its own remove)

**Acceptance Criteria:**
- Logo upload works end-to-end: upload image → thumbnail preview → click Save → logo persists on reload
- Remove button on ImageUpload clears the logo
- Form validation still works (logo still uses the same schema)
- "Note: upload not available" banner is gone
- `npm run lint && npm run typecheck` passes

---

## Final Approved Decisions

| ID | Decision | Source |
|---|---|---|
| D1 | MIME spoofing via magic bytes deferred to v2 | Design Decisions section |
| D2 | Orphaned asset cleanup accepted as v1 gap | Design Decisions section |
| D3 | Cloudinary root folder `whatta-cup`, sub-folders `logos/`/`products/` | Design Decisions section |
| D4 | Allowed formats: JPEG, PNG, WebP (no SVG) | Design Decisions section |
| D5 | Max file size: 5 MB, configurable via env | Design Decisions section |
| D6 | Frontend needs dedicated `uploadFile` helper (api-client.ts can't do multipart) | Risk finding |
| D7 | Uploads endpoint has no `authorize` middleware — permission checked by caller | `API.md` §4 |
| D8 | CSP already allows Cloudinary — no change needed | Code review finding |
| D9 | No new error codes needed in `API.md` §23 (UNSUPPORTED_FILE_TYPE and FILE_TOO_LARGE already exist) | Code review finding |
| D10 | No upstream doc updates needed (no open items resolved by this feature) | Doc review finding |
