import extractorSvelte from "@unocss/extractor-svelte";
import { defineConfig, presetWind4 } from "unocss";

export default defineConfig({
    presets: [presetWind4()],
    extractors: [extractorSvelte()],
    shortcuts: {
        page: "max-w-none mx-auto",
    },
});
