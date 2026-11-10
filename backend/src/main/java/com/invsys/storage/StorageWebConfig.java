package com.invsys.storage;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Sirve los archivos guardados localmente en {@code /files/**}. */
@Configuration
public class StorageWebConfig implements WebMvcConfigurer {

    private final LocalFileStorage storage;
    private final StorageProperties properties;

    public StorageWebConfig(LocalFileStorage storage, StorageProperties properties) {
        this.storage = storage;
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler(properties.publicPath() + "/**")
                .addResourceLocations(storage.root().toUri().toString());
    }
}
