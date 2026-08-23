import { json } from "@sveltejs/kit";
import { toJsonSchema } from "@valibot/to-json-schema";
import { userFieldsSchema, userPatchSchema } from "$lib/schemas/user.js";

// Request-body schemas are derived from the valibot schemas that actually
// validate the handlers, so the OpenAPI contract can never drift from the code.
// `$schema` is JSON-Schema-only metadata and must not appear in an OpenAPI 3.0
// component. `annotate` overlays examples/descriptions (which toJsonSchema does
// not emit) and the accurate `required` arrays on top of the derived structure.
const stripSchemaMeta = ({ $schema: _schema, ...rest }) => rest;

const annotate = (base, { required, props }) => ({
    ...base,
    required,
    properties: Object.fromEntries(
        Object.entries(base.properties).map(([name, schema]) => [
            name,
            props[name] ? { ...schema, ...props[name] } : schema,
        ]),
    ),
});

const upsertAnnotations = {
    email: { description: "User email address", example: "user@example.com" },
    display_name: { description: "Display name", example: "John Doe" },
    password: {
        description: "Optional. Users without a password sign in via magic link or reset their password",
        format: "password",
        example: "s3cur3!",
    },
    oidc_issuer: { description: "OIDC issuer URL", example: "https://auth.example.com" },
    oidc_subject: { description: "OIDC subject identifier", example: "johndoe" },
};

// The upsert paths (PUT and sync) unconditionally require email + display_name;
// the POST body also uses this schema but omits `required` because the OIDC
// branch makes those fields conditionally optional.
const userUpsertJson = annotate(stripSchemaMeta(toJsonSchema(userFieldsSchema)), {
    required: ["email", "display_name"],
    props: upsertAnnotations,
});
// POST shares the same fields as the upsert but must not mark fields required,
// because the OIDC branch accepts a user with only an OIDC pair.
const userCreateJson = { ...userUpsertJson, required: [] };
const userPatchJson = annotate(stripSchemaMeta(toJsonSchema(userPatchSchema)), {
    required: [],
    props: { ...upsertAnnotations, is_active: { description: "Whether the account is active" } },
});

export function GET() {
    return json({
        openapi: "3.0.0",
        info: {
            title: "toggl-pg-mirror API",
            version: "1.0.0",
            description: "Admin API for toggl-pg-mirror",
        },
        servers: [{ url: "" }],
        paths: {
            "/api/v1/admin/users": {
                get: {
                    summary: "List users (admin)",
                    security: [{ adminBearer: [] }],
                    parameters: [
                        { name: "cursor", in: "query", schema: { type: "string" }, description: "Pagination cursor" },
                        { name: "page_size", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
                    ],
                    responses: {
                        200: {
                            description: "List of users",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: {
                                                type: "array",
                                                items: { $ref: "#/components/schemas/AdminUser" },
                                            },
                                            next_cursor: { type: "string", nullable: true },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
                post: {
                    summary: "Create a user (admin)",
                    description:
                        "email and display_name are required; password is optional (users without one sign in via magic link or reset their password)",
                    security: [{ adminBearer: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: userCreateJson,
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: "User created",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/AdminUser" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        409: { $ref: "#/components/responses/Conflict" },
                        422: { $ref: "#/components/responses/Unprocessable" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
                put: {
                    summary: "Upsert a user (admin, idempotent)",
                    description:
                        "Creates the user if no user with this email exists, otherwise fully replaces it. The email is the natural key.",
                    security: [{ adminBearer: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AdminUserUpsert" },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "User created or updated",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/AdminUser" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        409: { $ref: "#/components/responses/Conflict" },
                        422: { $ref: "#/components/responses/Unprocessable" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
            },
            "/api/v1/admin/users/{id}": {
                get: {
                    summary: "Get a user (admin)",
                    security: [{ adminBearer: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        200: {
                            description: "User details",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/AdminUser" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        404: { $ref: "#/components/responses/NotFound" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
                patch: {
                    summary: "Update a user (admin, partial)",
                    security: [{ adminBearer: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: userPatchJson,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "User updated",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/AdminUser" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        404: { $ref: "#/components/responses/NotFound" },
                        409: { $ref: "#/components/responses/Conflict" },
                        422: { $ref: "#/components/responses/Unprocessable" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
                delete: {
                    summary: "Delete a user (admin)",
                    security: [{ adminBearer: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        204: { description: "Deleted (no content)" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        404: { $ref: "#/components/responses/NotFound" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
            },
            "/api/v1/admin/users/sync": {
                put: {
                    summary: "Bulk sync users (admin, idempotent)",
                    description:
                        "Upserts the listed users (create or fully replace by email) and deletes the listed emails, all in a single atomic transaction. Deleting a non-existent email is a no-op.",
                    security: [{ adminBearer: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        upsert: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/AdminUserUpsert" },
                                        },
                                        delete: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                required: ["email"],
                                                properties: {
                                                    email: {
                                                        type: "string",
                                                        format: "email",
                                                        example: "old@example.com",
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "Users synchronized",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/AdminUserSyncResult" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        409: { $ref: "#/components/responses/Conflict" },
                        422: { $ref: "#/components/responses/Unprocessable" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
            },
            "/api/v1/admin/send-test-mail": {
                post: {
                    summary: "Send a test email with hardcoded subject and body (admin)",
                    description:
                        "Only the recipient address can be set — subject and text are hardcoded to prevent abuse.",
                    security: [{ adminBearer: [] }],
                    requestBody: {
                        required: false,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        to: {
                                            type: "string",
                                            format: "email",
                                            example: process.env.TEST_EMAIL_TO || "user@example.com",
                                        },
                                        subject: { type: "string", example: "Test email from toggl-pg-mirror" },
                                        text: {
                                            type: "string",
                                            example: "This is a test email sent from toggl-pg-mirror.",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "Email sent",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: {
                                                type: "object",
                                                properties: {
                                                    messageId: { type: "string", example: "<abc123@localhost>" },
                                                    to: { type: "string", format: "email" },
                                                    subject: { type: "string" },
                                                },
                                            },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
            },
            "/api/v1/time-entries/import-csv": {
                post: {
                    summary: "Import time entries from a Toggl CSV export",
                    description:
                        "Uploads a Toggl CSV export (multipart/form-data, field 'file'). Authenticated either by a logged-in user (session cookie or user API token) or by the admin token.",
                    security: [{ userBearer: [] }, { adminBearer: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "multipart/form-data": {
                                schema: {
                                    type: "object",
                                    required: ["file"],
                                    properties: {
                                        file: {
                                            type: "string",
                                            format: "binary",
                                            description: "Toggl CSV export file (.csv)",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "CSV import result",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/CsvImportResult" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
            },
        },
        components: {
            schemas: {
                Links: {
                    type: "object",
                    properties: {
                        self: {
                            type: "object",
                            properties: { href: { type: "string", format: "uri" } },
                        },
                        collection: {
                            type: "object",
                            properties: { href: { type: "string", format: "uri" } },
                        },
                    },
                },
                AdminUser: {
                    type: "object",
                    properties: {
                        id: { type: "string", example: "nano-id-abc123" },
                        email: { type: "string", format: "email", example: "user@example.com" },
                        display_name: { type: "string", example: "John Doe" },
                        oidc_issuer: { type: "string", nullable: true, example: "https://auth.example.com" },
                        oidc_subject: { type: "string", nullable: true, example: "johndoe" },
                        is_active: { type: "boolean", example: true },
                        created_at: { type: "string", format: "date-time", example: "2026-07-11T09:00:00+02:00" },
                        updated_at: { type: "string", format: "date-time", example: "2026-07-11T09:00:00+02:00" },
                    },
                },
                AdminUserUpsert: {
                    ...userUpsertJson,
                },
                UserPatch: {
                    ...userPatchJson,
                },
                AdminUserSyncResult: {
                    type: "object",
                    properties: {
                        created: { type: "integer", example: 1 },
                        updated: { type: "integer", example: 0 },
                        deleted: { type: "integer", example: 0 },
                        users: {
                            type: "array",
                            items: { $ref: "#/components/schemas/AdminUser" },
                        },
                    },
                },
                CsvImportResult: {
                    type: "object",
                    properties: {
                        deleted: { type: "integer", example: 0 },
                        inserted: { type: "integer", example: 19583 },
                        dateRange: {
                            type: "object",
                            properties: {
                                min: { type: "string", format: "date-time", example: "2025-01-01T00:01:53.000Z" },
                                max: { type: "string", format: "date-time", example: "2025-12-31T20:03:28.000Z" },
                            },
                        },
                    },
                },
                ProblemDetail: {
                    type: "object",
                    properties: {
                        type: { type: "string", format: "uri", example: "about:blank" },
                        title: { type: "string" },
                        status: { type: "integer" },
                        detail: { type: "string" },
                        instance: { type: "string", format: "uri" },
                    },
                },
            },
            responses: {
                BadRequest: {
                    description: "Bad Request",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
                Unauthorized: {
                    description: "Unauthorized",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
                NotFound: {
                    description: "Not Found",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
                Conflict: {
                    description: "Conflict",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
                Unprocessable: {
                    description: "Unprocessable Entity",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
                InternalError: {
                    description: "Internal Server Error",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
            },
            securitySchemes: {
                adminBearer: {
                    type: "http",
                    scheme: "bearer",
                    description: "Admin token set via TOGGL_PG_MIRROR_ADMIN_TOKEN environment variable",
                },
                userBearer: {
                    type: "http",
                    scheme: "bearer",
                    description:
                        "User API token created via the create-api-token command (or a browser session cookie)",
                },
            },
        },
    });
}
