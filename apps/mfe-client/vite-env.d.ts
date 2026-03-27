// apps/mfe-client/src/vite-env.d.ts

/// <reference types="vite/client" />

// Nói với TypeScript rằng: "Bất cứ file nào kết thúc bằng ?inline, hãy coi nó là một chuỗi string"
declare module '*?inline' {
  const content: string;
  export default content;
}
