<script>
    import { page } from "$app/stores";

    let { sort = "asc" } = $props();

    function sortUrl(newSort) {
        const url = new URL($page.url);
        url.searchParams.set("sort", newSort);
        return url;
    }
</script>

<nav class="text-[13px]">
    <a
        href={sortUrl("desc")}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={sort === "desc"}
        class:text-gray-900={sort === "desc"}>↓ Newest first</a
    >
    <span class="text-gray-300">·</span>
    <a
        href={sortUrl("asc")}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={sort === "asc"}
        class:text-gray-900={sort === "asc"}>↑ Oldest first</a
    >
</nav>
