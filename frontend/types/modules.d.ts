// Ambient module declarations for packages that ship without TypeScript types.
// Adding `declare module "..."` here lets TS treat the import as `any` and
// stops `tsc --noEmit` from erroring out.
//
// Cheaper than installing @types/* — and avoids npm peer-dep gymnastics on
// repos with pinned React RC versions.

declare module "canvas-confetti";
