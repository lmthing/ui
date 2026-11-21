import { createContext, type ComponentType, type ReactElement, type ReactNode } from "react";

export type PrivateMarkSurfaceProps = {
  address: string;
  label: string;
  children: ReactNode;
  /** Call after capturing a person's strokes and storing them locally. Pass only the opaque reference. */
  onMark: (reference: string) => void;
};

export type PrivateMarkAdapter = {
  /** Render a local mark only if it belongs to this pad and the current document version. Pure. */
  resolve: (address: string, reference: string) => ReactElement | undefined;
  /** Wrap the pad drawing at full size; the host owns input on touch, stylus and accessible controls. */
  Surface: ComponentType<PrivateMarkSurfaceProps>;
};

/** Host-only input, not device data that can be projected into Writer props or agent reads. */
export const PrivateMarkContext = createContext<PrivateMarkAdapter | undefined>(undefined);
