export function activityBucket() {
  const objects = new Map<string, { key: string; uploaded: Date; customMetadata: Record<string, string>; value: string }>()
  const bucket = {
    put: async (key: string, value: string, options?: { customMetadata?: Record<string, string> }) => {
      const object = { key, value, uploaded: new Date(), customMetadata: options?.customMetadata ?? {} }
      objects.set(key, object)
      return object
    },
    delete: async (key: string | string[]) => { for (const name of [key].flat()) objects.delete(name) },
    list: async ({ prefix }: { prefix: string }) => ({ objects: [...objects.values()].filter(value => value.key.startsWith(prefix)), truncated: false, delimitedPrefixes: [] }),
  } as unknown as R2Bucket
  return { bucket, objects }
}
