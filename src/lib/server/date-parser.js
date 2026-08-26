const RELATIVE_PATTERN = /^-(\d+)([smhdwMy])$/;

export function parseDate(input) {
    if (typeof input !== "string") {
        throw new Error(`Invalid date: ${input}`);
    }

    const relativeMatch = input.match(RELATIVE_PATTERN);
    if (relativeMatch !== null) {
        return parseRelativeDate(relativeMatch);
    }

    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid date: ${input}`);
    }
    return parsed;
}

function parseRelativeDate(match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];

    const now = new Date();

    switch (unit) {
        case "s":
            return new Date(now.getTime() - value * 1000);
        case "m":
            return new Date(now.getTime() - value * 60 * 1000);
        case "h":
            return new Date(now.getTime() - value * 60 * 60 * 1000);
        case "d":
            return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
        case "w":
            return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
        case "M":
            return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
        case "y":
            return new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000);
        default:
            throw new Error(`Invalid relative date unit: ${unit}`);
    }
}
