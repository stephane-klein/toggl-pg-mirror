import { modifyCurrentUrl } from "$lib/url";

function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + n);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

function lastDayOfMonth(dateStr) {
    const [y, m] = dateStr.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function getISOWeek(date) {
    const d = new Date(date);
    const isoDow = ((d.getDay() + 6) % 7) + 1;
    const thursday = new Date(d);
    thursday.setDate(d.getDate() - isoDow + 4);
    const year = thursday.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const days = (thursday - jan1) / 86400000;
    const week = Math.ceil((days + jan1.getDay() + 1) / 7);
    return { year, week };
}

export function hreffy(url, path, extra = {}) {
    const sort = url.searchParams.get("sort") || "";
    const q = url.searchParams.get("q") || "";
    const limitRaw = url.searchParams.get("limit");
    const drop = { before: null, after: null, from: null, to: null, year: null, week: null, month: null, date: null };
    const params = { sort, q, ...drop };
    if (limitRaw !== null) params.limit = limitRaw;
    return modifyCurrentUrl(url, path, { ...params, ...extra });
}

export function buildPaginationHrefs(url, prevCursor, nextCursor, sort) {
    const dir =
        sort === "asc" ? { prevParam: "after", nextParam: "before" } : { prevParam: "before", nextParam: "after" };

    const limitRaw = url.searchParams.get("limit");
    const base = {};
    if (limitRaw !== null) base.limit = limitRaw;

    return {
        prevPageHref: prevCursor ? modifyCurrentUrl(url, null, { ...base, [dir.prevParam]: prevCursor }) : null,
        nextPageHref: nextCursor ? modifyCurrentUrl(url, null, { ...base, [dir.nextParam]: nextCursor }) : null,
    };
}

export function computeTimeEntriesNav(url, referenceDate) {
    const sort = url.searchParams.get("sort") || "";
    const q = url.searchParams.get("q") || "";
    const limitRaw = url.searchParams.get("limit");

    const realToday = new Date().toISOString().split("T")[0];
    const realTodayWeek = getISOWeek(realToday + "T00:00:00");

    const refDate = referenceDate ? new Date(referenceDate + "T00:00:00") : new Date();
    const today = refDate.toISOString().split("T")[0];
    const currentMonth = today.slice(0, 7);
    const currentYearWeek = getISOWeek(refDate);

    const carryParams = {
        sort,
        q,
        from: null,
        to: null,
        year: null,
        week: null,
        month: null,
        date: null,
        before: null,
        after: null,
    };
    if (limitRaw !== null) carryParams.limit = limitRaw;

    return {
        sort,
        q,
        limit: limitRaw || "auto",
        realToday,
        today,
        currentYear: currentYearWeek.year,
        currentWeek: currentYearWeek.week,
        currentMonth,

        goToDayHref: modifyCurrentUrl(url, `/time-entries/day/${realToday}`, carryParams),
        goToWeekHref: modifyCurrentUrl(
            url,
            `/time-entries/week/${realTodayWeek.year}/${realTodayWeek.week}`,
            carryParams,
        ),
        goToMonthHref: modifyCurrentUrl(url, `/time-entries/month/${realToday.slice(0, 7)}`, carryParams),
        goToYearHref: modifyCurrentUrl(url, "/time-entries/range", {
            ...carryParams,
            from: `${realToday.slice(0, 4)}-01-01`,
            to: `${realToday.slice(0, 4)}-12-31`,
        }),

        modeDayHref: modifyCurrentUrl(url, `/time-entries/day/${today}`, carryParams),
        modeWeekHref: modifyCurrentUrl(
            url,
            `/time-entries/week/${currentYearWeek.year}/${currentYearWeek.week}`,
            carryParams,
        ),
        modeMonthHref: modifyCurrentUrl(url, `/time-entries/month/${currentMonth}`, carryParams),

        rangeFromDayHref: modifyCurrentUrl(url, "/time-entries/range", { ...carryParams, from: today, to: today }),
        rangeFromWeekHref: modifyCurrentUrl(url, "/time-entries/range", {
            ...carryParams,
            from: today,
            to: addDays(today, 6),
        }),
        rangeFromMonthHref: modifyCurrentUrl(url, "/time-entries/range", {
            ...carryParams,
            from: today,
            to: lastDayOfMonth(today),
        }),
        rangeHref: modifyCurrentUrl(url, "/time-entries/range", carryParams),
    };
}
