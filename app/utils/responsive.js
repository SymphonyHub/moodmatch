export const COMPACT_WIDTH = 360;

export const isCompactWidth = (width) => Number.isFinite(width) && width <= COMPACT_WIDTH;

export const chatBubbleMaxWidth = (width, ratio) =>
  Math.min(520, Math.max(0, width) * ratio);

export const qrSizeForWidth = (width) =>
  Math.max(120, Math.min(210, width - 92));

export const scanSizeForViewport = (width, height) =>
  Math.max(160, Math.min(240, width - 64, height - 220));
