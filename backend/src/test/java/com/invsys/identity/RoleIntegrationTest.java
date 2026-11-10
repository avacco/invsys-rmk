package com.invsys.identity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.invsys.IntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class RoleIntegrationTest extends IntegrationTest {

    @Test
    void unknownPermissionIsRejected() throws Exception {
        Cookie[] admin = loginAsAdmin();
        mvc.perform(post("/api/v1/roles").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"AUDITOR\",\"permissions\":[\"catalog:read\",\"nuclear:launch\"]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listsPermissionCatalog() throws Exception {
        mvc.perform(get("/api/v1/permissions").cookie(loginAsAdmin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].value").exists());
    }
}
