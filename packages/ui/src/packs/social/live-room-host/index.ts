import { z } from "zod";
import { photo, screenId, text, type DeviceData, type HostCommands, type Values } from "../../../catalog";

export const maxRoomSpeakers = 12;
export const listenerCount = z.int().min(0);
export const roomSpeaker = z.strictObject({
  name: text(20),
  photo: photo.optional(),
  role: z.enum(["host", "cohost", "speaker"]),
  speaking: z.boolean().default(false),
  muted: z.boolean().default(false),
});

export const roomRecordKind = "social_live_rooms";
const roomSnapshot = z.strictObject({
  component: screenId,
  roomKey: screenId,
  joined: z.boolean(),
  promoted: z.boolean(),
  micOn: z.boolean(),
  isHost: z.boolean(),
  handRaised: z.boolean(),
  listenersCount: listenerCount,
  speakers: z
    .array(roomSpeaker.extend({ speakerKey: screenId.regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/) }))
    .min(1)
    .max(maxRoomSpeakers)
    .refine((rows) => new Set(rows.map(({ speakerKey }) => speakerKey)).size === rows.length),
});

export function projectLiveRoom(input: Readonly<Values>, instance: string, data: DeviceData): Values {
  const record = data[roomRecordKind]?.find(
    (row) => row && typeof row === "object" && "component" in row && row.component === instance,
  );
  const room = roomSnapshot.safeParse(record).data;
  const joined = room?.joined === true;
  const canModerate = joined && room?.isHost === true;
  const stage = input.style === "stage";
  return {
    ...(room && {
      roomKey: room.roomKey,
      listenersCount: room.listenersCount,
      speakers: room.speakers.map((row) => ({
        ...row,
        id: `r_s_${row.speakerKey}`,
        canMute: canModerate && row.role !== "host" && !row.muted,
      })),
    }),
    joined,
    canSpeak: joined && room?.promoted === true,
    canModerate,
    micOn: joined && room?.micOn === true,
    handRaised: room ? joined && room.handRaised : input.handRaised,
    ...(input.detail === "brief" || !stage ? { topic: undefined } : {}),
  };
}

const targetRoom = ({ props }: { props: Readonly<Values> }): Record<string, string> =>
  typeof props.roomKey === "string" ? { room: props.roomKey } : {};

export const liveRoomCommands = {
  identity: ({ props, row }) => {
    if (row) return typeof row.speakerKey === "string" ? `${props.roomKey}/${row.speakerKey}` : undefined;
    return typeof props.roomKey === "string" ? props.roomKey : "unconnected";
  },
  parts: {
    "connect.press": { kind: "command", name: "room.connect", input: targetRoom },
    "speak.toggle": {
      kind: "command",
      name: "room.microphone",
      input: (input) => ({ ...targetRoom(input), enabled: input.props.micOn !== true }),
    },
    "hand.toggle": {
      kind: "command",
      name: "room.hand",
      input: (input) => ({ ...targetRoom(input), raised: input.props.handRaised !== true }),
    },
    "applaud.press": {
      kind: "command",
      name: "room.react",
      input: (input) => ({ ...targetRoom(input), reaction: "applaud" }),
    },
    "heart.press": {
      kind: "command",
      name: "room.react",
      input: (input) => ({ ...targetRoom(input), reaction: "heart" }),
    },
    "leave.press": { kind: "command", name: "room.leave", input: targetRoom },
    "end.press": { kind: "command", name: "room.end", input: targetRoom },
  },
  items: {
    "mute.press": {
      kind: "command",
      name: "room.mute",
      input: (input) =>
        typeof input.row?.speakerKey === "string"
          ? { ...targetRoom(input), speaker: input.row.speakerKey }
          : undefined,
    },
  },
} satisfies HostCommands;
