import { array, minLength, object, pipe, regex, string } from "valibot";

// One activity matrix category: a label + Toggl tag + color triple. The tag
// doubles as the category identifier (also the template key in
// ActivityMatrix.svelte), so it must be unique in the list.
// Field-format rules shared by the /api/v1/me/activity-matrix-categories
// endpoint, the profile page form action and the generated OpenAPI schema.
export const activityMatrixCategorySchema = object({
    label: pipe(string(), minLength(1)),
    tag: pipe(string(), minLength(1)),
    color: pipe(string(), regex(/^#[0-9a-fA-F]{6}$/)),
});

// The full list is replaceable as a whole; an empty list is allowed and means
// "no configuration" (the charts page then prompts to configure the matrix).
// Tag uniqueness is checked by the handlers.
export const activityMatrixCategoriesSchema = array(activityMatrixCategorySchema);

// Returns the first duplicated tag (original casing) in the list, or null.
// Comparison is case-insensitive, mirroring the SQL-side tag aggregation.
export function findDuplicateCategoryTag(categories) {
    const seen = new Map();
    for (const category of categories) {
        const normalizedTag = category.tag.toLowerCase();
        if (seen.has(normalizedTag)) return category.tag;
        seen.set(normalizedTag, category.tag);
    }
    return null;
}
