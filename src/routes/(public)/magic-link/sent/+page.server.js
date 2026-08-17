export function load({ url }) {
    return { email: url.searchParams.get("email") };
}
