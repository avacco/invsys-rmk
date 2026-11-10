package com.invsys.shared.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI invsysOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Invsys API")
                        .version("v1")
                        .description("API REST de Invsys. La sesión viaja en la cookie httpOnly access_token, "
                                + "que se obtiene con POST /api/v1/auth/login."))
                .components(new Components().addSecuritySchemes("cookieAuth",
                        new SecurityScheme().type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE).name("access_token")))
                .addSecurityItem(new SecurityRequirement().addList("cookieAuth"));
    }
}
