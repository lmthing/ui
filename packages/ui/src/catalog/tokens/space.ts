export const space = { xs: 4, sm: 8, md: 12, lg: 16, gutter: 20, xl: 24, "2xl": 32, "3xl": 48 } as const;
export type SpaceToken = keyof typeof space;
