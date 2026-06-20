# NexxCloud HTTP API

This reference documents the implemented Express API mounted by
`backend/src/server.ts`. It is intended for browser integrations, command-line testing,
and contributors maintaining the frontend contract.

## Conventions

### Origins

| Environment                  | Frontend URL            | API URL                          |
| ---------------------------- | ----------------------- | -------------------------------- |
| Docker Compose from the host | `http://localhost:3000` | `http://localhost:4000/api`      |
| Frontend same-origin proxy   | `http://localhost:3000` | `http://localhost:3000/api`      |
| Manual frontend development  | `http://localhost:3000` | Defined by `NEXT_PUBLIC_API_URL` |

Examples below use:

```bash
export API_URL=http://localhost:4000/api
```

PowerShell equivalent:

```powershell
$API_URL = "http://localhost:4000/api"
```

### Authentication

Protected endpoints require an access token:

```http
Authorization: Bearer <access-token>
```

Registration and login issue an access token and a refresh token. Refresh tokens are
sent in JSON to the refresh/logout endpoints and are persisted server-side for rotation
and revocation.

### Success Envelope

Application endpoints generally return:

```json
{
  "success": true,
  "data": {}
}
```

Some listing operations also include pagination metadata appropriate to the controller.
Values stored as PostgreSQL `BigInt`, such as sizes and storage totals, are serialized
safely in JSON.

### Error Envelope

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

Common status codes:

| Code  | Meaning                                                                  |
| ----- | ------------------------------------------------------------------------ |
| `400` | Invalid request, invalid signature, incomplete chunks, or invalid state. |
| `401` | Missing, expired, or invalid authentication.                             |
| `403` | Caller does not own or may not access the requested resource.            |
| `404` | Resource or public share token not found.                                |
| `409` | Unique constraint or conflicting metadata.                               |
| `413` | Upload or chunk exceeds configured Multer limit.                         |
| `429` | Rate limit exceeded.                                                     |
| `500` | Unhandled server or storage processing failure.                          |

## Health and Administration

| Method | Endpoint        | Auth       | Purpose                                                               |
| ------ | --------------- | ---------- | --------------------------------------------------------------------- |
| `GET`  | `/health`       | None       | API process liveness response outside `/api`.                         |
| `GET`  | `/api/health`   | None       | Liveness response through the API prefix.                             |
| `GET`  | `/health/ready` | None       | Deployment readiness: PostgreSQL, Redis, and storage must be usable. |
| `GET`  | `/admin/queues` | HTTP Basic | Bull Board queue administration interface.                            |

Example:

```bash
curl http://localhost:4000/health/ready
```

## Authentication

### Endpoints

| Method | Endpoint             | Auth   | Body                            |
| ------ | -------------------- | ------ | ------------------------------- |
| `POST` | `/api/auth/register` | None   | `username`, `email`, `password` |
| `POST` | `/api/auth/login`    | None   | `email`, `password`             |
| `POST` | `/api/auth/refresh`  | None   | `refreshToken`                  |
| `POST` | `/api/auth/logout`   | Bearer | `refreshToken`                  |
| `GET`  | `/api/auth/me`       | Bearer | None                            |

### Register

```bash
curl -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"ada","email":"ada@example.test","password":"use-a-long-password"}'
```

Representative response:

```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "user": {
      "id": "<uuid>",
      "username": "ada",
      "email": "ada@example.test"
    }
  }
}
```

### Login and Refresh

```bash
curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.test","password":"use-a-long-password"}'

curl -X POST "$API_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-token>"}'
```

The refresh endpoint rotates the stored refresh token and returns a fresh token pair.

### Current User

```bash
curl "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

The user result includes storage accounting fields for the authenticated account.

## Files

All file-management endpoints require Bearer authentication.

### Listing and Metadata

| Method  | Endpoint                  | Query/body                                                                       | Purpose                                                        |
| ------- | ------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `GET`   | `/api/files`              | Query: `folderId`, `search`, `category`, `minSize`, `maxSize`, `limit`, `offset` | List active files.                                             |
| `GET`   | `/api/files/recent`       | Query: optional `limit`                                                          | Most recently modified active files.                           |
| `GET`   | `/api/files/favorites`    | None                                                                             | Favorite active files.                                         |
| `GET`   | `/api/files/trash`        | None                                                                             | Trashed files.                                                 |
| `GET`   | `/api/files/storage`      | None                                                                             | Active logical size, file count, disk metrics, and trash size. |
| `GET`   | `/api/files/:id`          | None                                                                             | One owned file record.                                         |
| `PATCH` | `/api/files/:id`          | JSON: `originalName`                                                             | Rename file metadata.                                          |
| `PATCH` | `/api/files/:id/favorite` | None                                                                             | Toggle favorite state.                                         |

Example:

```bash
curl "$API_URL/files?folderId=<folder-id>&search=design" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

File records contain user-facing metadata such as:

```json
{
  "id": "<uuid>",
  "originalName": "design-system.fig",
  "mimeType": "application/octet-stream",
  "category": "unknown",
  "size": "12582912",
  "folderId": null,
  "isFavorite": false,
  "deletedAt": null
}
```

Physical paths and blob records are server implementation details and should not be used
as client identifiers.

### Direct Upload

| Method | Endpoint                     | Multipart fields                         | Purpose                |
| ------ | ---------------------------- | ---------------------------------------- | ---------------------- |
| `POST` | `/api/files/upload`          | `file`, optional `folderId`              | Upload one file.       |
| `POST` | `/api/files/upload-multiple` | `files` (up to 100), optional `folderId` | Upload multiple files. |

```bash
curl -X POST "$API_URL/files/upload" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@./photo.png" \
  -F "folderId=<folder-id>"
```

Direct uploads are written to disk through Multer and then finalized into the blob store.
They are bounded by `MAX_FILE_SIZE`. Any extension, including custom and executable
formats, may be stored. Recognized preview formats pass binary signature validation
before final file metadata is committed; risky or unknown content is sandboxed when
served inline.

### Movement, Copies, and Bulk Work

| Method  | Endpoint                   | Body                                           | Purpose                                      |
| ------- | -------------------------- | ---------------------------------------------- | -------------------------------------------- |
| `PATCH` | `/api/files/:id/move`      | `folderId` or `null`                           | Move metadata to a folder.                   |
| `POST`  | `/api/files/:id/copy`      | `folderId` or `null`                           | Make another logical file reference.         |
| `POST`  | `/api/files/:id/duplicate` | None                                           | Duplicate within current placement.          |
| `POST`  | `/api/files/bulk`          | `action`, `fileIds`, optional `targetFolderId` | Apply `trash`, `restore`, `move`, or `copy`. |

Copy and duplicate do not copy identical bytes. They attach another file metadata row to
the existing content-addressed blob and increment its reference count.

```bash
curl -X POST "$API_URL/files/<file-id>/copy" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folderId":null}'
```

### Trash and Destruction

| Method   | Endpoint                   | Purpose                                                                                          |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| `DELETE` | `/api/files/:id`           | Soft-delete behavior routed to trash.                                                            |
| `PATCH`  | `/api/files/:id/trash`     | Move a file into trash.                                                                          |
| `PATCH`  | `/api/files/:id/restore`   | Restore a trashed file.                                                                          |
| `DELETE` | `/api/files/:id/permanent` | Delete metadata, release file/version blob references, and remove any final unreferenced object. |
| `POST`   | `/api/files/trash/empty`   | Permanently remove all of the user's trashed files.                                              |

Trash and restore recalculate `storageUsed` and `trashSize` transactionally. Permanent
deletion removes physical content only when no current file or historic version references
the blob.

### Authenticated Legacy Streams

These endpoints require a Bearer header and are suitable for programmatic retrieval:

| Method | Endpoint                   | Purpose                                                      |
| ------ | -------------------------- | ------------------------------------------------------------ |
| `GET`  | `/api/files/:id/download`  | Return attachment content for an owned file.                 |
| `GET`  | `/api/files/:id/stream`    | Stream owned content, including byte-range handling.         |
| `GET`  | `/api/files/:id/thumbnail` | Serve an owned generated thumbnail; accepts optional `size`. |

For `<img>`, `<audio>`, `<video>`, and iframe preview elements, use signed media URLs
instead of attempting to place an access token in a URL.

## Folders

Folders are metadata hierarchy nodes. Binary blobs do not move when a file changes folder.

| Method   | Endpoint                      | Body/query                  | Purpose                                         |
| -------- | ----------------------------- | --------------------------- | ----------------------------------------------- |
| `POST`   | `/api/folders`                | `name`, optional `parentId` | Create a folder.                                |
| `GET`    | `/api/folders`                | Optional `parentId`         | List active children.                           |
| `GET`    | `/api/folders/tree`           | None                        | Retrieve active folder hierarchy.               |
| `GET`    | `/api/folders/trash`          | None                        | Retrieve trashed folders.                       |
| `GET`    | `/api/folders/:id/breadcrumb` | None                        | Resolve ancestry for navigation.                |
| `PATCH`  | `/api/folders/:id`            | `name`                      | Rename.                                         |
| `PATCH`  | `/api/folders/:id/move`       | `folderId` or `null`        | Move and prevent descendant cycles.             |
| `POST`   | `/api/folders/:id/copy`       | `folderId` or `null`        | Recursively copy metadata and referenced files. |
| `PATCH`  | `/api/folders/:id/trash`      | None                        | Recursively mark folder contents trashed.       |
| `PATCH`  | `/api/folders/:id/restore`    | None                        | Recursively restore folder contents.            |
| `DELETE` | `/api/folders/:id`            | None                        | Permanent folder deletion route.                |
| `DELETE` | `/api/folders/:id/permanent`  | None                        | Explicit permanent folder deletion route.       |

Create example:

```bash
curl -X POST "$API_URL/folders" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Projects","parentId":null}'
```

Recursive trash/restore operations update storage accounting once descendant state has
changed. Recursive permanent deletion releases content references for every contained
file and version.

## Chunked Upload Sessions

Chunked uploads are intended for large or interruption-sensitive content. The current web
client selects this pipeline for files larger than 10 MiB. Session and chunk endpoints
require Bearer authentication.

### Endpoints

| Method | Endpoint                                    | Body                                                     | Purpose                                    |
| ------ | ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| `POST` | `/api/uploads/initiate`                     | `filename`, `mimeType`, `totalSize`, optional `folderId` | Create a session and expected chunk rows.  |
| `POST` | `/api/uploads/:sessionId/chunk/:chunkIndex` | Multipart `chunk`, optional `hash`                       | Upload one chunk.                          |
| `POST` | `/api/uploads/:sessionId/complete`          | None                                                     | Validate completeness and enqueue merging. |
| `POST` | `/api/uploads/:sessionId/cancel`            | None                                                     | Cancel session and clean staged parts.     |
| `GET`  | `/api/uploads/status/:sessionId`            | None                                                     | Read status/progress.                      |
| `GET`  | `/api/uploads/:sessionId/resume`            | None                                                     | Obtain pending chunk information.          |
| `GET`  | `/api/uploads/sessions`                     | None                                                     | List caller's upload sessions.             |
| `GET`  | `/api/uploads/session/:id`                  | None                                                     | Retrieve one session.                      |

### Initiate

```bash
curl -X POST "$API_URL/uploads/initiate" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"feature-film.mp4","mimeType":"video/mp4","totalSize":524288000}'
```

Representative result:

```json
{
  "success": true,
  "data": {
    "sessionId": "<uuid>",
    "filename": "feature-film.mp4",
    "totalSize": "524288000",
    "chunkSize": 8388608,
    "totalChunks": 63
  }
}
```

The server rejects non-positive sizes and values over `MAX_FILE_SIZE`. `chunkSize` is
selected by the server configuration, so clients must use the returned value. The
deployment default is 8 MiB so multipart chunks safely pass through the Next.js
same-origin application proxy.

### Upload a Chunk

```bash
curl -X POST "$API_URL/uploads/<session-id>/chunk/0" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "chunk=@./chunk-000.bin" \
  -F "hash=<sha256-of-this-chunk>"
```

Each chunk must match its expected size, except for the final shorter part. An optional
SHA-256 digest lets the server detect transmission corruption before marking a part
uploaded. The HTTP parser also rejects a part larger than `MAX_UPLOAD_CHUNK_SIZE`.

### Finalize and Poll

```bash
curl -X POST "$API_URL/uploads/<session-id>/complete" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl "$API_URL/uploads/status/<session-id>" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Completion queues an asynchronous merge. A session moves through upload/merge states and
becomes `completed` only after the merged binary has been validated, content-addressed,
and committed as file metadata. Consumers should poll status until a terminal state.

### Resume or Cancel

```bash
curl "$API_URL/uploads/<session-id>/resume" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl -X POST "$API_URL/uploads/<session-id>/cancel" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

The cleanup worker additionally removes stale staged chunks and cancels abandoned eligible
sessions after 24 hours.

## Versions

All version endpoints require Bearer authentication.

| Method   | Endpoint                                       | Purpose                                                     |
| -------- | ---------------------------------------------- | ----------------------------------------------------------- |
| `GET`    | `/api/versions/:fileId`                        | List historic versions for an owned file.                   |
| `POST`   | `/api/versions/:fileId`                        | Snapshot the current file as a version.                     |
| `POST`   | `/api/versions/:fileId/restore/:versionNumber` | Restore a version, first preserving current state.          |
| `DELETE` | `/api/versions/:fileId/:versionNumber`         | Delete one historic version and release its blob reference. |

```bash
curl -X POST "$API_URL/versions/<file-id>" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl -X POST "$API_URL/versions/<file-id>/restore/2" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Blob-backed versions reuse immutable binary objects with independent reference counts.
Version creation also triggers configured retention cleanup.

## Signed Media Access

Signed media URLs are the supported way to feed private binary content into browser media
elements without exposing a primary access JWT.

### Endpoints

| Method | Endpoint            | Auth                    | Purpose                                       |
| ------ | ------------------- | ----------------------- | --------------------------------------------- |
| `POST` | `/api/media/sign`   | Bearer                  | Create a short-lived URL for one owned file.  |
| `GET`  | `/api/media/:token` | Signed capability token | Serve stream, download, or thumbnail content. |

### Sign a Stream

```bash
curl -X POST "$API_URL/media/sign" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileId":"<file-id>","type":"stream"}'
```

Valid types:

| `type`      | Additional field                            | Output behavior                              |
| ----------- | ------------------------------------------- | -------------------------------------------- |
| `stream`    | None                                        | Inline media stream with byte range support. |
| `download`  | None                                        | Attachment response.                         |
| `thumbnail` | Optional `size`: `small`, `medium`, `large` | Derived image response when available.       |

Representative response:

```json
{
  "success": true,
  "data": {
    "url": "/api/media/<short-lived-token>",
    "expiresIn": 300
  }
}
```

The frontend resolves a relative signed path to the configured API origin as necessary.
The media token is scoped to the requested file/action and expires after five minutes.

### Range Request

```bash
curl "$API_URL/media/<signed-token>" \
  -H "Range: bytes=0-1048575" \
  --output segment.bin
```

Streaming returns partial content when the range is valid. Riskier inline document/content
types receive restrictive Content Security Policy sandboxing.

## Shares

### Authenticated Share Management

| Method   | Endpoint                   | Body                                                | Purpose                        |
| -------- | -------------------------- | --------------------------------------------------- | ------------------------------ |
| `POST`   | `/api/shares`              | `fileId`, optional `password`, optional `expiresIn` | Create public share metadata.  |
| `GET`    | `/api/shares/file/:fileId` | None                                                | List shares for an owned file. |
| `DELETE` | `/api/shares/:id`          | None                                                | Revoke a caller-owned share.   |

```bash
curl -X POST "$API_URL/shares" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileId":"<file-id>","expiresIn":86400,"password":"optional-secret"}'
```

### Public Share Retrieval

| Method | Endpoint                             | Query               | Purpose                               |
| ------ | ------------------------------------ | ------------------- | ------------------------------------- |
| `GET`  | `/api/shares/public/:token`          | Optional `password` | Share metadata and access validation. |
| `GET`  | `/api/shares/public/:token/download` | Optional `password` | Attachment download.                  |
| `GET`  | `/api/shares/public/:token/stream`   | Optional `password` | Inline/range-capable stream.          |

```bash
curl "$API_URL/shares/public/<share-token>"
```

Current security note: password-protected public-share calls transmit `password` as a
query parameter because browser media elements consume a direct URL. Avoid passwords that
are reused elsewhere, terminate HTTPS in deployment, and treat redesigning this transport
as a security hardening task.

## Network Status

| Method | Endpoint              | Auth   | Purpose                                                         |
| ------ | --------------------- | ------ | --------------------------------------------------------------- |
| `GET`  | `/api/network/status` | Bearer | Discover LAN frontend URLs, primary IP, hostname, and API port. |

```bash
curl "$API_URL/network/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

The response uses configured `HOST_LAN_IP` and `HOST_HOSTNAME` when available and includes
locally detected IPv4 addresses. Address selection prefers private Wi-Fi/Ethernet
interfaces and demotes virtual, WSL, Docker, VPN, Bluetooth, and host-only adapters such
as VirtualBox `192.168.56.*`. The frontend settings view uses this data to display
connectivity URLs and a QR representation.

## WebSocket Transport

The backend accepts HTTP upgrade requests at:

```text
ws://<api-host>:4000/ws
```

It implements connection tracking, heartbeat/presence messages, and Redis user-channel
delivery of `sync_event` frames. The event/mutation pipeline is not currently fully wired,
so consumers must not rely on file mutations automatically generating WebSocket updates.

### Authentication Status

The implemented WebSocket server includes a compatibility path that reads an access token
from the query string:

```text
ws://<api-host>:4000/ws?token=<access-token>
```

JWTs in URLs can leak through logs and diagnostics. Do not expose this handshake on an
untrusted network without first refactoring it to a verified header/subprotocol or
session-cookie approach. The attempted subprotocol branch in the current implementation
should also be tested and corrected before it is documented as a safe replacement.

### Server Message Shapes

Connection/presence and heartbeat messages follow the WebSocket implementation contract:

```json
{ "type": "presence", "data": {} }
```

```json
{ "type": "ping" }
```

```json
{ "type": "pong" }
```

When events are wired and published through Redis, clients can receive:

```json
{
  "type": "sync_event",
  "data": {
    "type": "<event-type>",
    "data": {}
  }
}
```

## Request Examples in TypeScript

### Central API Client Pattern

```ts
import axios from "axios";

const origin = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const api = axios.create({ baseURL: origin ? `${origin}/api` : "/api" });

api.interceptors.request.use((request) => {
  const accessToken = getAccessToken();
  if (accessToken) request.headers.Authorization = `Bearer ${accessToken}`;
  return request;
});
```

### Signed Preview

```ts
const response = await api.post("/media/sign", {
  fileId,
  type: "stream",
});

const previewUrl = response.data.data.url;
videoElement.src = previewUrl;
```

## Apps API

All Apps API routes require normal authentication. Docker-changing operations
also require admin access.

| Method | Route | Purpose |
| ------ | ----- | ------- |
| `GET` | `/api/apps/docker/status` | Detect Docker CLI, daemon, Compose v2, runtime mode, and setup guidance. |
| `GET` | `/api/apps/marketplace?search=nginx&filter=official` | Search Docker Hub live, returning image metadata, trust indicators, confidence, and risk. |
| `GET` | `/api/apps/marketplace/:namespace/:repository` | Fetch Docker Hub repository details and tags. Official images use `library` as the namespace. |
| `POST` | `/api/apps/marketplace/analyze` | Admin-only image analysis. Can pull and inspect an image to detect exposed ports, volumes, env, labels, entrypoint, and warnings. |
| `POST` | `/api/apps/install` | Admin-only Docker Hub install into a managed single-container Compose project. |
| `GET` | `/api/apps/installed` | List installed apps with live runtime status when Docker is reachable. |
| `GET` | `/api/apps/installed/:id/logs` | Fetch recent Compose logs for an installed app. |
| `POST` | `/api/apps/installed/:id/:action` | Admin-only `start`, `stop`, `restart`, `update`, or `remove`. |

Example install payload:

```json
{
  "image": "nginx",
  "tag": "latest",
  "name": "Nginx",
  "ports": [{ "hostPort": 8080, "containerPort": 80, "protocol": "tcp" }],
  "restartPolicy": "unless-stopped"
}
```

NexxCloud only treats Docker Hub as the marketplace. It does not fetch curated
catalogs or hardcoded app templates. Direct NexxCloud folder mounts are stored as
mapping metadata for the future materialized storage bridge because user folders
are metadata over `StorageBlob` content, not host directories.

## Implementation Notes for API Contributors

Before altering an endpoint affecting persisted content:

1. Keep physical payload ownership in `StorageBlob`, not `File.storedName`.
2. Modify reference counts inside the same transaction as metadata mutations.
3. Perform physical deletion only after a successful database commit.
4. Recalculate active and trash accounting after trash, restore, delete, copy, or
   replacement behavior changes.
5. Exercise interrupted chunk, duplicate content, same-name replacement, and final
   reference deletion behavior in tests.
6. Do not introduce access JWTs into download, preview, thumbnail, or share URLs.

For internal rationale and worker flows, see [ARCHITECTURE.md](./ARCHITECTURE.md).
