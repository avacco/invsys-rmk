package com.invsys.shared;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.invsys.IntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/** Los errores salen en el idioma del header Accept-Language, con un código estable. */
class LocalizedErrorsIntegrationTest extends IntegrationTest {

    @Test
    void businessErrorsFollowAcceptLanguage() throws Exception {
        Cookie[] admin = loginAsAdmin();
        String body = "{\"name\":\"Idiomas\"}";
        mvc.perform(post("/api/v1/categories").cookie(admin).contentType(MediaType.APPLICATION_JSON).content(body));

        mvc.perform(post("/api/v1/categories").cookie(admin).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("error.category.duplicate"))
                .andExpect(jsonPath("$.detail").value("Ya existe una categoría con ese nombre"));

        mvc.perform(post("/api/v1/categories").cookie(admin).header(HttpHeaders.ACCEPT_LANGUAGE, "en-US,en;q=0.9")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(jsonPath("$.detail").value("A category with that name already exists"));
    }

    @Test
    void validationMessagesFollowAcceptLanguage() throws Exception {
        String bad = "{\"username\":\"\",\"password\":\"x\"}";
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(bad))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Datos inválidos"))
                .andExpect(jsonPath("$.errors.username").value("no debe estar vacío"));
        mvc.perform(post("/api/v1/auth/login").header(HttpHeaders.ACCEPT_LANGUAGE, "en")
                        .contentType(MediaType.APPLICATION_JSON).content(bad))
                .andExpect(jsonPath("$.detail").value("Invalid data"))
                .andExpect(jsonPath("$.errors.username").value("must not be blank"));
    }

    @Test
    void parameterizedMessages() throws Exception {
        mvc.perform(post("/api/v1/auth/login").header(HttpHeaders.ACCEPT_LANGUAGE, "en")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"nadie\",\"password\":\"x\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Incorrect username or password"));
    }
}
