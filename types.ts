export interface GeneratedImage {
  url: string;
  mimeType: string;
}

export enum AspectRatio {
  SQUARE = "1:1",
  LANDSCAPE = "16:9",
  PORTRAIT = "9:16",
  STANDARD = "4:3",
  TALL = "3:4"
}

export interface ThumbnailOptions {
  prompt: string;
  aspectRatio: AspectRatio;
}
