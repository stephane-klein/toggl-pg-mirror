<script>
    import { invalidateAll } from "$app/navigation";
    import { pendingUndo } from "./undoStore.js";
    import { undoTimeEntryEditOperation } from "./timeEntries.remote.js";

    let undoing = $state(false);
    let undoError = $state(null);
    let remaining = $state(0);

    $effect(() => {
        if (!$pendingUndo) {
            remaining = 0;
            return;
        }
        const update = () => {
            remaining = Math.max(0, Math.ceil(($pendingUndo.expiresAt - Date.now()) / 1000));
            if (remaining <= 0) pendingUndo.set(null);
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    });

    async function undo() {
        const pending = $pendingUndo;
        if (!pending || undoing) return;
        undoing = true;
        undoError = null;
        try {
            await undoTimeEntryEditOperation({ operationId: pending.operationId });
            pendingUndo.set(null);
            await invalidateAll();
        } catch (error) {
            undoError = error.message || "Undo failed";
        } finally {
            undoing = false;
        }
    }

    function dismiss() {
        pendingUndo.set(null);
    }
</script>

{#if $pendingUndo}
    <p class="border-b border-gray-200 px-2 py-1 text-center text-[12px] text-gray-500">
        {#if undoError}
            <span
                class="text-red-600"
                role="alert">{undoError}</span
            >
        {:else}
            Bulk edit applied · {$pendingUndo.count} entries
        {/if}
        ·
        <button
            type="button"
            onclick={undo}
            disabled={undoing}
            class="cursor-pointer text-blue-600 no-underline hover:underline disabled:cursor-default disabled:text-gray-400 disabled:no-underline"
        >
            {undoing ? "Undoing…" : "Undo"}
        </button>
        ·
        <button
            type="button"
            onclick={dismiss}
            class="cursor-pointer text-blue-600 no-underline hover:underline"
        >
            Dismiss
        </button>
        ·
        <span class="text-gray-400">{remaining}s left to undo</span>
    </p>
{/if}
