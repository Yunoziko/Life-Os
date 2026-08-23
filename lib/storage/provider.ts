export type StoredObject = {
  key: string;
  url: string;
};

export interface StorageProvider {
  upload(key: string, body: Buffer | Uint8Array, contentType: string): Promise<StoredObject>;
  remove(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  async upload(key: string): Promise<StoredObject> {
    return {
      key,
      url: `/storage/${key}`,
    };
  }

  async remove() {
    return;
  }
}

export function getStorage(): StorageProvider {
  // Swap for S3/R2 when STORAGE_DRIVER and credentials are present.
  return new LocalStorageProvider();
}
