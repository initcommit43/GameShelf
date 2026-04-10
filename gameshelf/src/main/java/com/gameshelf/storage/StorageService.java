package com.gameshelf.storage;

/**
 * Abstraction over file storage.
 *
 * Current implementation: LocalStorageService (files on disk).
 * To switch to S3: implement S3StorageService, annotate it @Primary,
 * and remove @Primary from LocalStorageService — no other code changes needed.
 */
public interface StorageService {

    /**
     * Persist image bytes under the given filename.
     * @return the public URL callers can use to retrieve the file
     */
    String store(byte[] imageData, String filename);

    /**
     * Remove a previously stored file by its filename.
     * Silently ignores missing files.
     */
    void delete(String filename);
}
