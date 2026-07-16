import { error } from "@sveltejs/kit";

import { fetchEntries, hasEntries, nearestDayWithEntries, parseLimit } from "$lib/backend/time-entries.js";

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

function formatLabel(d) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    const toDate = new Date(fromDate);
    toDate.setDate(fromDate.getDate() + 7);

    const from = formatDate(fromDate);
    const to = formatDate(toDate);
    const limit = parseLimit(url.searchParams.get("limit"));
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");
    const sort = url.searchParams.get("sort") || "asc";

    const { entries, prevCursor, nextCursor } = await fetchEntries({ from, to, before, after, limit, sort });

    const prevMonday = new Date(fromDate);
    prevMonday.setDate(fromDate.getDate() - 7);
    const { year: prevYear, week: prevWeek } = getISOWeek(prevMonday);

    const nextMonday = new Date(fromDate);
    nextMonday.setDate(fromDate.getDate() + 7);
    const { year: nextYear, week: nextWeek } = getISOWeek(nextMonday);

    const prevWeekTo = new Date(prevMonday);
    prevWeekTo.setDate(prevMonday.getDate() + 7);
    const nextWeekTo = new Date(nextMonday);
    nextWeekTo.setDate(nextMonday.getDate() + 7);

    const [prevHasEntries, nextHasEntries] = await Promise.all([
        hasEntries(formatDate(prevMonday), formatDate(prevWeekTo)),
        hasEntries(formatDate(nextMonday), formatDate(nextWeekTo)),
    ]);

    const prevLabel = `W ${prevWeek}${prevHasEntries ? "" : " (empty)"}`;
    const nextLabel = `W ${nextWeek}${nextHasEntries ? "" : " (empty)"}`;

    let nearestNonEmptyDate = null;
    if (!prevHasEntries && !nextHasEntries) {
        nearestNonEmptyDate = await nearestDayWithEntries(formatDate(fromDate));
    }

    let nearestNonEmptyUrl = null;
    let nearestNonEmptyLabel = null;
    if (nearestNonEmptyDate) {
        const { year: nearestYear, week: nearestWeek } = getISOWeek(new Date(nearestNonEmptyDate));
        nearestNonEmptyUrl = `/time-entries/week/${nearestYear}/${nearestWeek}`;
        nearestNonEmptyLabel = `W ${nearestWeek} (first week no-empty)`;
    }

    return {
        entries,
        prevCursor,
        nextCursor,
        limit,
        sort,
        mode: "week",
        currentYear: year,
        currentWeek: week,
        periodLabel: `Week ${week}, ${year} — ${formatPeriodLabel(fromDate)}`,
        prevPeriodUrl: `/time-entries/week/${prevYear}/${prevWeek}`,
        prevPeriodLabel: prevLabel,
        nextPeriodUrl: `/time-entries/week/${nextYear}/${nextWeek}`,
        nextPeriodLabel: nextLabel,
        nearestNonEmptyUrl,
        nearestNonEmptyLabel,
    };
}
