/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PARSE_APP_ID: string
    readonly VITE_PARSE_JS_KEY: string
    readonly VITE_PARSE_SERVER_URL: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
