import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

const ExpoTargetsMessagesModule = requireNativeModule("ExpoTargetsMessages");

export type PresentationStyle = "compact" | "expanded";

export interface MessageLayout {
  caption: string;
  subcaption?: string;
  trailingCaption?: string;
  trailingSubcaption?: string;
  imageUrl?: string;
  mediaFileUrl?: string;
  url?: string;
}

export interface ConversationInfo {
  conversationId: string;
  remoteParticipantIds: string[];
  participantCount: number;
  hasSelectedMessage: boolean;
}

export interface SelectedMessage {
  url?: string;
  caption?: string;
  subcaption?: string;
  trailingCaption?: string;
  trailingSubcaption?: string;
}

export interface AttachmentPayload {
  /** Alternate filename shown in Messages. */
  filename?: string;
  /** UTF-8 text written to a temp file and inserted. */
  contents?: string;
}

export class Messages {
  getPresentationStyle(): PresentationStyle | null {
    if (Platform.OS !== "ios") {
      return null;
    }
    return ExpoTargetsMessagesModule.getPresentationStyle();
  }

  requestPresentationStyle(style: PresentationStyle): void {
    if (Platform.OS !== "ios") {
      return;
    }
    ExpoTargetsMessagesModule.requestPresentationStyle(style);
  }

  sendMessage(layout: MessageLayout): void {
    if (Platform.OS !== "ios") {
      return;
    }
    ExpoTargetsMessagesModule.sendMessage(layout);
  }

  sendUpdate(layout: MessageLayout, sessionId: string): void {
    if (Platform.OS !== "ios") {
      return;
    }
    ExpoTargetsMessagesModule.sendUpdate(layout, sessionId);
  }

  createSession(): string | null {
    if (Platform.OS !== "ios") {
      return null;
    }
    return ExpoTargetsMessagesModule.createSession();
  }

  insertAttachment(payload: AttachmentPayload = {}): Promise<boolean> {
    if (Platform.OS !== "ios") {
      return Promise.resolve(false);
    }
    return Promise.resolve(
      ExpoTargetsMessagesModule.insertAttachment(payload),
    ).then(Boolean);
  }

  getConversationInfo(): ConversationInfo | null {
    if (Platform.OS !== "ios") {
      return null;
    }
    return ExpoTargetsMessagesModule.getConversationInfo();
  }

  addEventListener(
    eventName: "onPresentationStyleChange",
    listener: (style: PresentationStyle) => void,
  ) {
    if (Platform.OS !== "ios") {
      return { remove: () => {} };
    }
    return ExpoTargetsMessagesModule.addListener(
      eventName,
      (event: { presentationStyle: PresentationStyle }) => {
        listener(event.presentationStyle);
      },
    );
  }
}

// Standalone functions for backwards compatibility
export const getPresentationStyle = (): PresentationStyle | null => {
  if (Platform.OS !== "ios") {
    return null;
  }
  return ExpoTargetsMessagesModule.getPresentationStyle();
};

export const requestPresentationStyle = (style: PresentationStyle): void => {
  if (Platform.OS !== "ios") {
    return;
  }
  ExpoTargetsMessagesModule.requestPresentationStyle(style);
};

export const sendMessage = (layout: MessageLayout): void => {
  if (Platform.OS !== "ios") {
    return;
  }
  ExpoTargetsMessagesModule.sendMessage(layout);
};

export const sendUpdate = (layout: MessageLayout, sessionId: string): void => {
  if (Platform.OS !== "ios") {
    return;
  }
  ExpoTargetsMessagesModule.sendUpdate(layout, sessionId);
};

export const createSession = (): string | null => {
  if (Platform.OS !== "ios") {
    return null;
  }
  return ExpoTargetsMessagesModule.createSession();
};

export const insertAttachment = (
  payload: AttachmentPayload = {},
): Promise<boolean> => {
  if (Platform.OS !== "ios") {
    return Promise.resolve(false);
  }
  return Promise.resolve(
    ExpoTargetsMessagesModule.insertAttachment(payload),
  ).then(Boolean);
};

export const getConversationInfo = (): ConversationInfo | null => {
  if (Platform.OS !== "ios") {
    return null;
  }
  return ExpoTargetsMessagesModule.getConversationInfo();
};

export const addEventListener = (
  eventName: "onPresentationStyleChange",
  listener: (style: PresentationStyle) => void,
) => {
  if (Platform.OS !== "ios") {
    return { remove: () => {} };
  }
  return ExpoTargetsMessagesModule.addListener(
    eventName,
    (event: { presentationStyle: PresentationStyle }) => {
      listener(event.presentationStyle);
    },
  );
};
