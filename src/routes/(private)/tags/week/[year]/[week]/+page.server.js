import { error } from "@sveltejs/kit";

import { computeTimeEntriesNav } from "$lib/shared/timeEntriesUrl.js";
import { listTagsForPeriod, nextSort, parseSort, sortHref } from "$lib/server/tags.js";

function getMonday(year, week) {
    const jan4 = new Date(year, 0, 4);
    const dow = jan4.getDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - (dow - 1));
    const monday = new Date(week1Monday);
    monday.setDate(week1Monday.getDate() + (week - 1) * 7);
    return monday;
}

function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function getISOWeek(d) {
    const isoDow = ((d.getDay() + 6) % 7) + 1;
    const thursday = new Date(d);
    thursday.setDate(d.getDate() - isoDow + 4);
    const year = thursday.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const days = (thursday - jan1) / 86400000;
    const week = Math.ceil((days + jan1.getDay() + 1) / 7);
    return { year, week };
}

function formatLabel(monday) {
    return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPeriodLabel(monday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const start = formatLabel(monday);
    const end = formatLabel(sunday);
    return `${start} – ${end}, ${monday.getFullYear()}`;
}

export async function load({ params, url }) {
    const year = Number(params.year);
    const week = Number(params.week);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        error(400, `Invalid year: ${params.year}`);
    }
    if (!Number.isInteger(week) || week < 1 || week > 53) {
        error(400, `Invalid week: ${params.week}`);
    }

    const fromDate = getMonday(year, week);
    const from = formatDate(fromDate);

    const prevMonday = new Date(fromDate);
    prevMonday.setDate(fromDate.getDate() - 7);
    const { year: prevYear, week: prevWeek } = getISOWeek(prevMonday);

    const nextMonday = new Date(fromDate);
    nextMonday.setDate(fromDate.getDate() + 7);
    const { year: nextYear, week: nextWeek } = getISOWeek(nextMonday);

    const navData = computeTimeEntriesNav("/tags", url, from);
    const sort = parseSort(url.searchParams.get("sort"));
    const q = url.searchParams.get("q") || "";
    const toDate = new Date(fromDate);
    toDate.setDate(fromDate.getDate() + 7);
    const tags = await listTagsForPeriod(from, formatDate(toDate), `${sort.column}_${sort.dir}`, q);

    return {
        ...navData,
        mode: "week",
        currentYear: year,
        currentWeek: week,
        periodLabel: `Week ${week}, ${year} — ${formatPeriodLabel(fromDate)}`,
        prevHref: sortHref(url, `${sort.column}_${sort.dir}`, `/tags/week/${prevYear}/${prevWeek}`),
        prevLabel: `W ${prevWeek}`,
        nextHref: sortHref(url, `${sort.column}_${sort.dir}`, `/tags/week/${nextYear}/${nextWeek}`),
        nextLabel: `W ${nextWeek}`,
        tags,
        sort,
        nameHref: sortHref(url, nextSort("name", sort)),
        countHref: sortHref(url, nextSort("count", sort)),
        durationHref: sortHref(url, nextSort("duration", sort)),
    };
}
