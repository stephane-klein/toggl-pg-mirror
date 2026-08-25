import { boolean, email, minLength, object, optional, pipe, string } from "valibot";

import { activityMatrixCategoriesSchema } from "./activity-matrix.js";

// Field-format rules shared by the admin user create/upsert endpoints and by the
// generated OpenAPI request schemas. The required/optional branching (OIDC pair
// present or not) and the cross-field "both oidc fields together" rule are
// business logic kept in the route handlers, not encoded here.
export const userFieldsSchema = object({
    email: optional(pipe(string(), email())),
    display_name: optional(pipe(string(), minLength(1))),
    password: optional(pipe(string(), minLength(12))),
    oidc_issuer: optional(string()),
    oidc_subject: optional(string()),
    activity_matrix_categories: optional(activityMatrixCategoriesSchema),
});

// Partial update (PATCH) of a single user: every field is optional.
export const userPatchSchema = object({
    email: optional(pipe(string(), email())),
    display_name: optional(pipe(string(), minLength(1))),
    password: optional(pipe(string(), minLength(12))),
    oidc_issuer: optional(string()),
    oidc_subject: optional(string()),
    is_active: optional(boolean()),
    activity_matrix_categories: optional(activityMatrixCategoriesSchema),
});
