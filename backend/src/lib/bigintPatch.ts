// Global BigInt JSON serialization patch
// This overrides the native JSON.stringify behavior to safely intercept
// and serialize native BigInt primitives, which standard JSON.stringify
// rejects with a TypeError.

if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function (this: bigint) {
    const num = Number(this);
    return Number.isSafeInteger(num) ? num : this.toString();
  };
}

const originalStringify = JSON.stringify;

JSON.stringify = function (value: any, replacer?: any, space?: any): string {
  const customReplacer = (key: string, val: any) => {
    let activeVal = val;
    // Apply user-defined replacer first if provided
    if (typeof replacer === "function") {
      activeVal = replacer(key, val);
    }
    // If the value is a bigint, safely serialize it
    if (typeof activeVal === "bigint") {
      const num = Number(activeVal);
      return Number.isSafeInteger(num) ? num : activeVal.toString();
    }
    return activeVal;
  };

  // Handle array-based replacers
  if (Array.isArray(replacer)) {
    return originalStringify(
      value,
      (key: string, val: any) => {
        if (typeof val === "bigint") {
          const num = Number(val);
          return Number.isSafeInteger(num) ? num : val.toString();
        }
        return replacer.includes(key) || key === "" ? val : undefined;
      },
      space
    );
  }

  return originalStringify(value, customReplacer, space);
};
