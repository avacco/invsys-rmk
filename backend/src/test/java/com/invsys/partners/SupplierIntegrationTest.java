package com.invsys.partners;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.invsys.IntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

class SupplierIntegrationTest extends IntegrationTest {

    @Autowired
    ObjectMapper json;

    @Test
    void createSearchAndDelete() throws Exception {
        Cookie[] admin = loginAsAdmin();
        String body = mvc.perform(post("/api/v1/suppliers").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Proveedor Único XYZ\",\"taxId\":\"T-999\",\"email\":\"a@b.example\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.active").value(true))
                .andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();

        mvc.perform(get("/api/v1/suppliers").param("q", "t-999").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        mvc.perform(delete("/api/v1/suppliers/{id}", id).cookie(admin)).andExpect(status().isNoContent());
    }

    @Test
    void invalidEmailIsRejected() throws Exception {
        mvc.perform(post("/api/v1/suppliers").cookie(loginAsAdmin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"email\":\"no-es-un-mail\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists());
    }
}
