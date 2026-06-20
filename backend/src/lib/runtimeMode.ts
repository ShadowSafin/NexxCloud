export const isNativeRuntime = (): boolean =>
  process.env.NEXXCLOUD_NATIVE_RUNTIME === "true";
