import { getMcpAccessLogPageData } from "$lib/server/mcp-access-log.js";
import { format, startOfMonth, subDays } from "date-fns";

const PAGE_SIZE = 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function presetHref(from, to) {
    const parts = [];
    if (from) parts.push(`from=${from}`);
    if (to) parts.push(`to=${to}`);
    return parts.length ? `?${parts.join("&")}` : ".";
}

export async function load({ url }) {
    const today = format(new Date(), "yyyy-MM-dd");
    const defaultFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");

    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const from = fromParam && DATE_RE.test(fromParam) ? fromParam : defaultFrom;
    const to = toParam && DATE_RE.test(toParam) ? toParam : today;

    const pageRaw = Number(url.searchParams.get("page") || "1");
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    const data = await getMcpAccessLogPageData({ from, to, page, pageSize: PAGE_SIZE });

    const presets = [
        { label: "Today", href: presetHref(today, today) },
        {
            label: "Yesterday",
            href: presetHref(
                format(subDays(new Date(), 1), "yyyy-MM-dd"),
                format(subDays(new Date(), 1), "yyyy-MM-dd"),
            ),
        },
        { label: "Last 7 days", href: presetHref(format(subDays(new Date(), 6), "yyyy-MM-dd"), today) },
        { label: "Last 30 days", href: presetHref(defaultFrom, today) },
        { label: "This month", href: presetHref(format(startOfMonth(new Date()), "yyyy-MM-dd"), today) },
        { label: "All time", href: "." },
    ];

    return {
        rows: data.rows,
        total: data.total,
        page: data.page,
        pageCount: data.pageCount,
        from: data.from,
        to: data.to,
        presets,
        pageSize: PAGE_SIZE,
    };
}
