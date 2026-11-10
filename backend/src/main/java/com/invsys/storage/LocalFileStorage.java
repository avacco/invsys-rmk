package com.invsys.storage;

import com.invsys.shared.web.BadRequestException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class LocalFileStorage implements FileStorage {

    static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;

    private static final Map<String, String> IMAGE_TYPES = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp",
            "image/gif", "gif");

    private final Path root;
    private final String publicPath;

    public LocalFileStorage(StorageProperties properties) {
        this.root = Path.of(properties.directory()).toAbsolutePath().normalize();
        this.publicPath = properties.publicPath();
    }

    @Override
    public String storeImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("error.file.empty");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new BadRequestException("error.file.tooLarge");
        }
        String extension = IMAGE_TYPES.get(file.getContentType());
        if (extension == null) {
            throw new BadRequestException("error.file.format");
        }
        if (!folder.matches("[a-z0-9-]+")) {
            throw new IllegalArgumentException("Carpeta inválida: " + folder);
        }
        String filename = UUID.randomUUID() + "." + extension;
        Path target = root.resolve(folder).resolve(filename);
        try (InputStream in = file.getInputStream()) {
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar la imagen", e);
        }
        return publicPath + "/" + folder + "/" + filename;
    }

    @Override
    public void delete(String publicUrl) {
        if (publicUrl == null || !publicUrl.startsWith(publicPath + "/")) {
            return;
        }
        Path target = root.resolve(publicUrl.substring(publicPath.length() + 1)).normalize();
        if (!target.startsWith(root)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // Un archivo huérfano no debe impedir la operación principal.
        }
    }

    Path root() {
        return root;
    }
}
