import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}", 
        "./components/**/*.{js,ts,jsx,tsx}"

    ],
    theme: {
        extend: {
            colors: {
                primary: "#3B82F6",
                Header: {
                    start: "#1E2937",
                    end: "#3B0764"
                }

            }
        },
    },
    plugins: [],
};
export default config;