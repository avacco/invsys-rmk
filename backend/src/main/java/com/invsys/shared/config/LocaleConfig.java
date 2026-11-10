package com.invsys.shared.config;

import java.util.List;
import java.util.Locale;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

/** El idioma de cada respuesta sale del header Accept-Language: español (por defecto) o inglés. */
@Configuration
public class LocaleConfig {

    public static final Locale SPANISH = Locale.forLanguageTag("es");

    @Bean
    LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setSupportedLocales(List.of(SPANISH, Locale.ENGLISH));
        resolver.setDefaultLocale(SPANISH);
        return resolver;
    }
}
