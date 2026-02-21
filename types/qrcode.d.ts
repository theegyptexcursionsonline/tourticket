// Type definitions for qrcode
declare module 'qrcode' {
  export function toBuffer(
    text: string,
    options?: any
  ): Promise<Buffer>;

  export function toDataURL(
    text: string,
    options?: any
  ): Promise<string>;
}

