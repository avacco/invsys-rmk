package com.invsys.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * Almacenamiento de imágenes. La implementación por defecto usa el disco local;
 * se puede reemplazar por S3, Cloudinary, etc. sin tocar los módulos que la usan.
 */
public interface FileStorage {

    /** Guarda la imagen y devuelve la URL pública. */
    String storeImage(MultipartFile file, String folder);

    /** Borra un archivo a partir de su URL pública. Ignora URLs que no le pertenecen. */
    void delete(String publicUrl);
}
