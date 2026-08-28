export const TIMELINE_EVENT_TYPES = ["milestone", "period"];

// Validates a timeline event input, mirroring the timeline_events_dates_check
// CHECK constraint: a milestone has a single date (end_date NULL or equal to
// start_date), a period is either ongoing (end_date NULL) or strictly ended
// (end_date > start_date). Pure and isomorphic so the client form and the
// server module share exactly the same rules. Dates are 'YYYY-MM-DD' strings
// (form input); null/empty means absent.
export function validateTimelineEvent({ type, title, startDate, endDate = null }) {
    const errors = {};

    if (!TIMELINE_EVENT_TYPES.includes(type)) {
        errors.type = `type must be one of ${TIMELINE_EVENT_TYPES.join(", ")}.`;
    }

    if (!title || !title.trim()) {
        errors.title = "title is required.";
    }

    if (!startDate) {
        errors.startDate = "start_date is required.";
    } else if (!isIsoDate(startDate)) {
        errors.startDate = "start_date must be a valid date (YYYY-MM-DD).";
    }

    if (endDate !== null && endDate !== "" && !isIsoDate(endDate)) {
        errors.endDate = "end_date must be a valid date (YYYY-MM-DD).";
    }

    const hasType = TIMELINE_EVENT_TYPES.includes(type);
    const end = endDate === "" || endDate === null ? null : endDate;
    if (hasType && isIsoDate(startDate) && (end === null || isIsoDate(end))) {
        if (type === "milestone" && end !== null && end !== startDate) {
            errors.endDate = "a milestone must have end_date equal to start_date (or none).";
        }
        if (type === "period" && end !== null && end <= startDate) {
            errors.endDate = "a period's end_date must be after start_date (or none).";
        }
    }

    return { ok: Object.keys(errors).length === 0, errors };
}

// Formats the date range of an event for display. A milestone shows its single
// date; an ongoing period shows "→ present". Dates are 'YYYY-MM-DD' strings.
export function formatTimelineEventDates({ type, start_date, end_date }) {
    if (type === "milestone") return start_date;
    if (!end_date) return `${start_date} → present`;
    return `${start_date} → ${end_date}`;
}

function isIsoDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
