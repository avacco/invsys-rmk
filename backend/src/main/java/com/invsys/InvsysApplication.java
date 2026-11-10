package com.invsys;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class InvsysApplication {

    public static void main(String[] args) {
        SpringApplication.run(InvsysApplication.class, args);
    }
}
