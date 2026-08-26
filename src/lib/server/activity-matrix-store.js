import { sql } from "./pg.js";

// Returns the activity matrix categories of a user: the stored
// users.activity_matrix_categories array, or an empty array when not configured
// (NULL and [] both mean "not configured" — the charts page then shows a prompt
// linking to the profile instead of the matrix).
export async function getUserActivityMatrixCategories(userId) {
    const [row] = await sql`SELECT activity_matrix_categories FROM users WHERE id = ${userId}`;
    const categories = row?.activity_matrix_categories;
    if (!Array.isArray(categories) || categories.length === 0) {
        return [];
    }
    return categories;
}

// Idempotently replaces the user's activity matrix categories: writing the same
// array twice leaves the row unchanged. An empty array clears the configuration
// (the matrix is hidden until categories are configured again).
export async function setUserActivityMatrixCategories(userId, categories) {
    await sql`
        UPDATE users
        SET activity_matrix_categories = ${categories}, updated_at = now()
        WHERE id = ${userId}
    `;
}
