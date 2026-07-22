<script>
    let { value: initialValue = "", onconfirm = () => {} } = $props();

    let value = $state(initialValue);
    let nativeInput;
    let error = $state(false);

    const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

    function openPicker() {
        nativeInput?.showPicker?.();
    }

    function onNativeChange(e) {
        const newDate = e.target.value;
        if (newDate !== initialValue) {
            onconfirm(newDate);
        }
    }

    function onTextInput(e) {
        value = e.target.value;
        error = !ISO_RE.test(value);
        if (!error && nativeInput) nativeInput.value = value;
    }

    function onPaste(e) {
        e.preventDefault();
        const text = e.clipboardData.getData("text").trim();
        const iso = text.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
        const eu = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
        if (iso) {
            value = `${iso[1]}-${iso[2]}-${iso[3]}`;
            if (nativeInput) nativeInput.value = value;
            error = false;
        } else if (eu) {
            value = `${eu[3]}-${eu[2]}-${eu[1]}`;
            if (nativeInput) nativeInput.value = value;
            error = false;
        } else {
            value = text;
            error = !ISO_RE.test(text);
        }
    }

    function handleKeydown(event) {
        if (event.key === "Enter" && !error && value !== initialValue) {
            onconfirm(value);
        }
    }

    function handleBlur() {
        if (!error && value !== initialValue) {
            onconfirm(value);
        }
    }
</script>

<div class="relative w-36 mx-auto">
    <div class="relative">
        <input
            type="text"
            bind:value
            oninput={onTextInput}
            onpaste={onPaste}
            onkeydown={handleKeydown}
            onblur={handleBlur}
            placeholder="yyyy-mm-dd"
            inputmode="numeric"
            aria-invalid={error}
            class="w-36 text-center border rounded pr-8 pl-3 py-1.5 bg-white {error
                ? 'border-red-500'
                : 'border-gray-300'}"
        />
        <button
            type="button"
            onclick={openPicker}
            aria-label="Open calendar"
            tabindex="-1"
            class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-none p-0.5 text-gray-500 hover:text-gray-700"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                />
                <line
                    x1="16"
                    y1="2"
                    x2="16"
                    y2="6"
                />
                <line
                    x1="8"
                    y1="2"
                    x2="8"
                    y2="6"
                />
                <line
                    x1="3"
                    y1="10"
                    x2="21"
                    y2="10"
                />
            </svg>
        </button>
    </div>
    <input
        type="date"
        bind:this={nativeInput}
        {value}
        onchange={onNativeChange}
        tabindex="-1"
        class="sr-only"
    />
</div>
