export function formatHumanDuration(totalSeconds) {
    const totalMinutes = Math.floor(totalSeconds / 60);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h${minutes}m`;
    if (hours > 0) return `${hours}h${minutes}m`;
    return `${minutes}m`;
}
