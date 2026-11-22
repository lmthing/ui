import type { SocialWords } from "..";

export const words = {
  invite: {
    copy: "Copy code",
    share: "Share invite",
    qr: "Invite QR code",
    members: "People to discover",
    joined: (count, form) => `${count} ${form === "one" ? "person" : "people"} joined`,
  },
} satisfies Pick<SocialWords, "invite">;
