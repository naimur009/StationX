# Current Task: 6. Shared Uploads

**Utility, not its own PRD feature** | `API.md` §4 | `ARCHITECTURE.md` §4 (`lib/upload.ts`) | `TEST_CASES.md` §19
**Depends on:** Users & Permissions (permission check happens at the calling route, not here)
**Used by:** Products (image), Settings (logo)

---

## Summary

Build a reusable file-upload utility and endpoint that accepts images, validates them server-side, uploads to Cloudinary, and returns `{ url, publicId }`. This endpoint is a thin proxy — it never writes to Mongo itself. Then build a reusable frontend `<ImageUpload>` component that wraps drag/drop + preview + upload, used by both Settings (logo) and Products (image).

---

## Setup / Dependencies

- [ ] `npm install cloudinary multer` — Cloudinary SDK for upload API, multer for `multipart/form-data` parsing in Express
- [ ] `npm install -D @types/multer` — multer types
- [ ] Add Cloudinary env vars to `backend/.env.example` and `backend/src/config/env.ts`:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- [ ] Add to `backend/.env.example`:
  - `UPLOAD_MAX_FILE_SIZE` (default: `5242880` → 5 MB)
  - `UPLOAD_ALLOWED_MIME_TYPES` (default: `image/jpeg,image/png,image/webp`)

---

## Backend

### `lib/upload.ts` — Cloudinary client wrapper

- [ ] Create a Cloudinary v2 client configured from env vars
- [ ] Export `uploadToCloudinary(filePath: string, folder: string): Promise<{ url: string, publicId: string }>` — uses `cloudinary.uploader.upload`
- [ ] Export `deleteFromCloudinary(publicId: string): Promise<void>` — for cleanup (used when replacing a logo or product image)
- [ ] Export `ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE` from env config

### `POST /uploads/image` — Upload endpoint

- [ ] Create `src/modules/uploads/uploads.routes.ts`, `.controller.ts`, `.service.ts`, `.validation.ts`
- [ ] Route: `POST /uploads/image` — `multer` middleware processes single file field named `file`
- [ ] Validation before Cloudinary:
  - MIME type check → `400 UNSUPPORTED_FILE_TYPE`
  - File size check (use multer's `limits.fileSize`) → `400 FILE_TOO_LARGE`
  - Optional: MIME spoofing protection via `file-type` package or magic bytes sniffing (per `TEST_CASES.md` UPL-S-01)
- [ ] Upload accepted file to Cloudinary under a folder based on caller context (default: `uploads/`)
- [ ] Return `201 { data: { url, publicId } }` per `API.md` §4
- [ ] Wire route into `src/app.ts` under `/api/v1/uploads`
- [ ] Auth: `authenticate` middleware required. Permission check is deliberately absent here — the calling route (`POST /products`, `PUT /settings`) enforces its own permission.

### Verification

- [ ] `POST /uploads/image` with valid JPEG → `201 { data: { url, publicId } }`
- [ ] `POST /uploads/image` with `.exe` → `400 UNSUPPORTED_FILE_TYPE`
- [ ] `POST /uploads/image` with oversized file → `400 FILE_TOO_LARGE`
- [ ] `POST /uploads/image` without auth → `401`
- [ ] `tsc --noEmit` passes clean
- [ ] Existing tests still pass (`npm test`)

---

## Frontend

### `components/shared/ImageUpload.tsx` — Reusable upload component

A self-contained upload component with these visual states (`API.md` §4 + Design decisions):
- **Empty:** dashed-border drop zone with upload icon + "Click to browse or drag & drop" label, accepts `image/jpeg,image/png,image/webp`
- **Drag-hover:** highlight border, show "Drop here" overlay
- **Uploading:** spinner + progress indicator (determinate if possible, indeterminate otherwise)
- **Uploaded:** thumbnail preview + replace button + remove button
- **Error:** red error message (from `400` response), retry button

Props:
```ts
interface ImageUploadProps {
  value?: { url: string; publicId: string } | null; // current value
  onChange: (value: { url: string; publicId: string } | null) => void; // called after upload completes
  folder?: string; // Cloudinary folder, e.g. 'products' | 'logos'
  accept?: string; // MIME types, default: 'image/jpeg,image/png,image/webp'
  maxSize?: number; // bytes, default: 5242880 (5 MB)
  aspectRatio?: string; // visual hint, e.g. '1:1' for products, '2:1' for logo
  disabled?: boolean;
}
```

Implementation details:
- [ ] Uses a hidden `<input type="file">` triggered by click on the drop zone
- [ ] On file select: validate MIME + size client-side first (quick feedback), then `POST /uploads/image` via `lib/api-client.ts`
- [ ] On success: call `onChange({ url, publicId })` with the response
- [ ] On error: show the error message inline, allow retry
- [ ] Remove button: calls `onChange(null)`
- [ ] Must clean up object URLs on unmount (URL.revokeObjectURL)
- [ ] Use `lucide-react` icons: `Upload`, `Image`, `X`, `Loader2`, `Check`

### Integrate into Settings (`LogoSettingsSection.tsx`)

- [ ] Replace the current URL-input + preview pattern with the new `<ImageUpload>` component
- [ ] Pass `folder="logos"` and `aspectRatio="2:1"`
- [ ] Remove the "Note: File upload is not yet available" banner
- [ ] Keep the existing form integration (logo data flows through `PUT /settings`)

### Integration into Products (future — just note it, don't build now)

- [ ] Products will use `<ImageUpload folder="products" aspectRatio="1:1" />` — the component is built here, wiring happens in Task 7.

### Verification

- [ ] `<ImageUpload>` renders all states (empty / uploading / uploaded / error)
- [ ] Click opens file picker restricted to images
- [ ] Client-side MIME rejection shows instant feedback (no network call)
- [ ] Successful upload shows thumbnail and calls `onChange`
- [ ] Replace button clears current and re-opens picker
- [ ] Remove button calls `onChange(null)`
- [ ] Settings logo section works end-to-end: upload image → save settings → logo persists on reload
- [ ] Build passes: `npm run lint && npm run typecheck` (in `frontend/`)

---

## Design decisions to make

- [ ] Decide upload component visual states (listed above) — confirm colors/spacing from `theme.md`, no new tokens
- [ ] Decide aspect ratio / crop hints: **1:1** for product photos, **2:1** for logo — communicate to user via a subtle dashed overlay or label below the drop zone
- [ ] Decide max file size: **5 MB** (default), adjustable via env var
- [ ] Decide allowed formats: **JPEG, PNG, WebP** — no SVG for v1 (security risk from SVG XSS, per `TEST_CASES.md` UPL-S-01)
- [ ] Decide Cloudinary folder naming: `whatta-cup/logos/`, `whatta-cup/products/` — prefix via env var `CLOUDINARY_ROOT_FOLDER` (default: `whatta-cup`)

---

## Open items / Questions (ask if anything needed)

- **Cloudinary account:** Do you have a Cloudinary account already? If so, please share the `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` values (or add them to `.env`). If not, we'll set one up — there's a free tier that works for development.
- **MIME spoofing protection:** The current plan uses multer + server-side MIME extension check. `TEST_CASES.md` UPL-S-01 recommends actual MIME sniffing (magic bytes). Should we add `file-type` (or similar) to read the actual file signature, or is the extension + multer check sufficient for v1? File-type adds a dependency but is more secure.
- **Orphaned asset cleanup:** `TEST_CASES.md` UPL-E-01 flags that an uploaded image may never be attached to a product (orphan). Is this an acceptable v1 gap, or should we build a cleanup job now?
- **Existing products image field:** Does the current `Product` model already have an `image` field (type `{ url: string, publicId: string }` per `DATABASE.md`)? We'll confirm when we start Task 7.
- **Any other modules that need uploads beyond Settings (logo) and Products (image)?** E.g. expense receipts, vendor documents — if so, we should design the component to handle arbitrary file types too (not just images).

---

## Test cases to verify (from `TEST_CASES.md` §19)

| ID | Case | Expected |
|---|---|---|
| UPL-H-01 | Valid JPEG/PNG under size limit | `201`, `{ url, publicId }` |
| UPL-V-01 | Unsupported file type (`.exe`, `.pdf`, `.svg`) | `400 UNSUPPORTED_FILE_TYPE` |
| UPL-V-02 | File exceeds size limit | `400 FILE_TOO_LARGE` |
| UPL-S-01 | File with image extension but non-image content | Rejected (MIME sniffing) |
| UPL-S-02 | Extremely large file (1GB) | Rejected before full buffering |

---

## Files to create / modify

### Backend
- `backend/src/lib/upload.ts` — rewrite stub to real Cloudinary client
- `backend/src/modules/uploads/uploads.routes.ts` — new
- `backend/src/modules/uploads/uploads.controller.ts` — new
- `backend/src/modules/uploads/uploads.service.ts` — new
- `backend/src/modules/uploads/uploads.validation.ts` — new (Zod schemas for file validation)
- `backend/src/app.ts` — wire `/api/v1/uploads` routes
- `backend/src/config/env.ts` — add Cloudinary env vars
- `backend/.env.example` — add Cloudinary vars + upload limits

### Frontend
- `frontend/src/components/shared/ImageUpload.tsx` — new reusable component
- `frontend/src/features/settings/components/LogoSettingsSection.tsx` — replace URL input with ImageUpload
- `frontend/src/lib/api-client.ts` — may need a `uploadFile` helper for `multipart/form-data`

---

## Definition of done

1. `POST /uploads/image` accepts an image, validates it, uploads to Cloudinary, returns `{ url, publicId }` per `API.md` §4
2. Rejected uploads return correct error codes (`400 UNSUPPORTED_FILE_TYPE`, `400 FILE_TOO_LARGE`)
3. Auth-required check works (no token → `401`)
4. `<ImageUpload>` component renders all visual states and integrates into Settings logo section
5. Settings logo section end-to-end: upload image → save → persist
6. `npm test` passes on backend
7. `npm run typecheck && npm run lint` passes on both backend and frontend
