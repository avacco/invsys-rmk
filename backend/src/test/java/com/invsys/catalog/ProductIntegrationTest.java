package com.invsys.catalog;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.invsys.IntegrationTest;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

class ProductIntegrationTest extends IntegrationTest {

    @Autowired
    ObjectMapper json;

    Cookie[] admin;
    long unitId;

    @BeforeEach
    void setUp() throws Exception {
        admin = loginAsAdmin();
        String units = mvc.perform(get("/api/v1/units").cookie(admin)).andReturn().getResponse().getContentAsString();
        unitId = json.readTree(units).get(0).get("id").asLong();
    }

    @Test
    void crudProductWithCategory() throws Exception {
        long categoryId = createCategory("Bebidas " + UUID.randomUUID());
        String sku = sku();

        JsonNode created = json.readTree(mvc.perform(post("/api/v1/products").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson(sku, "Agua mineral", categoryId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sku").value(sku))
                .andExpect(jsonPath("$.category.id").value(categoryId))
                .andExpect(jsonPath("$.audit.createdBy").value("admin"))
                .andReturn().getResponse().getContentAsString());
        long id = created.get("id").asLong();

        mvc.perform(get("/api/v1/products").param("q", sku).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[*].sku", hasItem(sku)));

        mvc.perform(put("/api/v1/products/{id}", id).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson(sku, "Agua mineral 2 l", categoryId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Agua mineral 2 l"));

        // La categoría en uso no se puede borrar
        mvc.perform(delete("/api/v1/categories/{id}", categoryId).cookie(admin)).andExpect(status().isConflict());

        mvc.perform(delete("/api/v1/products/{id}", id).cookie(admin)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/products/{id}", id).cookie(admin)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/categories/{id}", categoryId).cookie(admin)).andExpect(status().isNoContent());
    }

    @Test
    void duplicateSkuIsConflict() throws Exception {
        String sku = sku();
        mvc.perform(post("/api/v1/products").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                .content(productJson(sku, "Uno", null))).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/products").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                .content(productJson(sku.toLowerCase(), "Dos", null))).andExpect(status().isConflict());
    }

    @Test
    void invalidPayloadReturnsFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/products").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sku\":\"\",\"name\":\"\",\"costPrice\":-1,\"salePrice\":1,\"status\":\"ACTIVE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.sku").exists())
                .andExpect(jsonPath("$.errors.unitId").exists())
                .andExpect(jsonPath("$.errors.costPrice").exists());
    }

    @Test
    void viewerCanReadButNotWrite() throws Exception {
        String username = "viewer" + UUID.randomUUID().toString().substring(0, 8);
        long viewerRoleId = roleId("VIEWER");
        mvc.perform(post("/api/v1/users").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","displayName":"Lector","password":"lector1234","roleId":%d}
                                """.formatted(username, viewerRoleId)))
                .andExpect(status().isCreated());

        Cookie[] viewer = login(username, "lector1234");
        mvc.perform(get("/api/v1/products").cookie(viewer)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/products").cookie(viewer).contentType(MediaType.APPLICATION_JSON)
                .content(productJson(sku(), "No permitido", null))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/users").cookie(viewer)).andExpect(status().isForbidden());
    }

    @Test
    void uploadAndRemoveImage() throws Exception {
        long id = json.readTree(mvc.perform(post("/api/v1/products").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON).content(productJson(sku(), "Con imagen", null)))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();

        MockMultipartFile png = new MockMultipartFile("file", "foto.png", "image/png", new byte[]{(byte) 0x89, 'P', 'N', 'G'});
        mvc.perform(multipart("/api/v1/products/{id}/image", id).file(png).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageUrl", startsWith("/files/products/")));

        MockMultipartFile exe = new MockMultipartFile("file", "virus.exe", "application/octet-stream", new byte[]{1, 2});
        mvc.perform(multipart("/api/v1/products/{id}/image", id).file(exe).cookie(admin))
                .andExpect(status().isBadRequest());

        mvc.perform(delete("/api/v1/products/{id}/image", id).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageUrl").doesNotExist());
    }

    @Test
    void invalidSortIsBadRequest() throws Exception {
        mvc.perform(get("/api/v1/products").param("sort", "noExiste").cookie(admin)).andExpect(status().isBadRequest());
    }

    private long createCategory(String name) throws Exception {
        String body = mvc.perform(post("/api/v1/categories").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"%s\"}".formatted(name)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private long roleId(String name) throws Exception {
        JsonNode roles = json.readTree(mvc.perform(get("/api/v1/roles").cookie(admin))
                .andReturn().getResponse().getContentAsString());
        for (JsonNode role : roles) {
            if (role.get("name").asText().equals(name)) {
                return role.get("id").asLong();
            }
        }
        throw new AssertionError("No existe el rol " + name);
    }

    private String productJson(String sku, String name, Long categoryId) {
        return """
                {"sku":"%s","name":"%s","categoryId":%s,"unitId":%d,
                 "costPrice":10.50,"salePrice":15.00,"minStock":5,"status":"ACTIVE"}
                """.formatted(sku, name, categoryId, unitId);
    }

    private static String sku() {
        return "T-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
