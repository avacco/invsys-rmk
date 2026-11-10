package com.invsys.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("invsys.storage")
public record StorageProperties(String directory, String publicPath) {}
