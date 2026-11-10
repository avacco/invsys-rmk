package com.invsys.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.invsys.IntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AuthIntegrationTest extends IntegrationTest {

    @Test
    void loginSetsHttpOnlyCookiesAndReturnsProfile() throws Exception {
        var response = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin1234\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.permissions").isArray())
                .andReturn().getResponse();

        Cookie access = cookie(response.getCookies(), "access_token");
        Cookie refresh = cookie(response.getCookies(), "refresh_token");
        assertThat(access.isHttpOnly()).isTrue();
        assertThat(refresh.isHttpOnly()).isTrue();
        assertThat(refresh.getPath()).isEqualTo("/api/v1/auth");
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"incorrecta\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpointsRequireSession() throws Exception {
        mvc.perform(get("/api/v1/products")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void meReturnsCurrentUser() throws Exception {
        Cookie[] cookies = loginAsAdmin();
        mvc.perform(get("/api/v1/auth/me").cookie(cookies))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"));
    }

    @Test
    void refreshRotatesTokenAndDetectsReuse() throws Exception {
        Cookie original = cookie(loginAsAdmin(), "refresh_token");

        Cookie[] rotated = mvc.perform(post("/api/v1/auth/refresh").cookie(original))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookies();
        Cookie newRefresh = cookie(rotated, "refresh_token");
        assertThat(newRefresh.getValue()).isNotEqualTo(original.getValue());

        // Reusar el token viejo se trata como robo: se rechaza y se cierran todas las sesiones del usuario.
        mvc.perform(post("/api/v1/auth/refresh").cookie(original)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(newRefresh)).andExpect(status().isUnauthorized());
    }

    @Test
    void expiredAccessCookieDoesNotBlockLogin() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .cookie(new Cookie("access_token", "token-invalido"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin1234\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        Cookie refresh = cookie(loginAsAdmin(), "refresh_token");
        mvc.perform(post("/api/v1/auth/logout").cookie(refresh)).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/refresh").cookie(refresh)).andExpect(status().isUnauthorized());
    }
}
