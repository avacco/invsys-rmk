package com.invsys.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.invsys.IntegrationTest;
import jakarta.servlet.http.Cookie;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class AuditAndReportsIntegrationTest extends IntegrationTest {

    @Autowired
    ObjectMapper json;

    Cookie[] admin;

    @BeforeEach
    void setUp() throws Exception {
        admin = loginAsAdmin();
    }

    @Test
    void changesAreAuditedWithActorAndEntity() throws Exception {
        String name = "Auditada " + UUID.randomUUID().toString().substring(0, 6);
        long id = read(mvc.perform(post("/api/v1/categories").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"%s\"}".formatted(name)))).get("id").asLong();
        mvc.perform(put("/api/v1/categories/{id}", id).cookie(admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"%s v2\"}".formatted(name))).andExpect(status().isOk());

        mvc.perform(get("/api/v1/audit").param("entityType", "category").param("entityId", String.valueOf(id)).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].action").value("UPDATE"))
                .andExpect(jsonPath("$.content[0].actor").value("admin"))
                .andExpect(jsonPath("$.content[0].summary").value(name + " v2"))
                .andExpect(jsonPath("$.content[1].action").value("CREATE"));
    }

    @Test
    void rejectedChangesAreNotAudited() throws Exception {
        String name = "Duplicada " + UUID.randomUUID().toString().substring(0, 6);
        mvc.perform(post("/api/v1/categories").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"%s\"}".formatted(name))).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/categories").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"%s\"}".formatted(name))).andExpect(status().isConflict());

        mvc.perform(get("/api/v1/audit").param("q", name).cookie(admin))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void failedLoginIsAudited() throws Exception {
        String username = "intruso" + UUID.randomUUID().toString().substring(0, 6);
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"%s\",\"password\":\"x\"}".formatted(username)))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/audit").param("actor", username).cookie(admin))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].action").value("LOGIN_FAILED"));
    }

    @Test
    void auditRequiresPermission() throws Exception {
        String username = "mgr" + UUID.randomUUID().toString().substring(0, 8);
        long managerRole = 0;
        for (JsonNode role : read(mvc.perform(get("/api/v1/roles").cookie(admin)))) {
            if (role.get("name").asText().equals("MANAGER")) managerRole = role.get("id").asLong();
        }
        mvc.perform(post("/api/v1/users").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"username":"%s","displayName":"Gerente","password":"gerente1234","roleId":%d}
                        """.formatted(username, managerRole))).andExpect(status().isCreated());
        Cookie[] manager = login(username, "gerente1234");
        mvc.perform(get("/api/v1/audit").cookie(manager)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/reports/valuation").cookie(manager)).andExpect(status().isOk());
    }

    @Test
    void reportsReflectMovements() throws Exception {
        long unitId = 0;
        for (JsonNode u : read(mvc.perform(get("/api/v1/units").cookie(admin)))) {
            if (u.get("code").asText().equals("u")) unitId = u.get("id").asLong();
        }
        long warehouse = read(mvc.perform(get("/api/v1/warehouses").cookie(admin))).get(0).get("id").asLong();
        String sku = "REP-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        long product = read(mvc.perform(post("/api/v1/products").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"sku":"%s","name":"Reporte %s","unitId":%d,"costPrice":1000,"salePrice":1500,"status":"ACTIVE"}
                        """.formatted(sku, sku, unitId)))).get("id").asLong();
        for (String body : new String[] {
                "{\"type\":\"IN\",\"productId\":%d,\"warehouseId\":%d,\"quantity\":10}",
                "{\"type\":\"OUT\",\"productId\":%d,\"warehouseId\":%d,\"quantity\":4}"}) {
            mvc.perform(post("/api/v1/inventory/movements").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                    .content(body.formatted(product, warehouse))).andExpect(status().isCreated());
        }

        JsonNode top = read(mvc.perform(get("/api/v1/reports/top-products").param("days", "1").param("limit", "50").cookie(admin)));
        JsonNode row = null;
        for (JsonNode r : top) if (r.get("product").get("sku").asText().equals(sku)) row = r;
        assertThat(row).isNotNull();
        assertThat(row.get("outQuantity").decimalValue()).isEqualByComparingTo("4");
        assertThat(row.get("outValue").decimalValue()).isEqualByComparingTo("4000");

        String tz = "America/Punta_Arenas";
        JsonNode activity = read(mvc.perform(get("/api/v1/reports/activity").param("days", "7").param("tz", tz).cookie(admin)));
        assertThat(activity).hasSize(7);
        JsonNode today = activity.get(6);
        assertThat(today.get("date").asText()).isEqualTo(LocalDate.now(ZoneId.of(tz)).toString());
        assertThat(today.get("inValue").decimalValue()).isGreaterThanOrEqualTo(new java.math.BigDecimal("10000"));
        assertThat(today.get("outValue").decimalValue()).isGreaterThanOrEqualTo(new java.math.BigDecimal("4000"));

        JsonNode byWarehouse = read(mvc.perform(get("/api/v1/reports/valuation").param("groupBy", "WAREHOUSE").cookie(admin)));
        assertThat(byWarehouse).isNotEmpty();
        assertThat(byWarehouse.get(0).get("costValue").decimalValue()).isGreaterThanOrEqualTo(new java.math.BigDecimal("6000"));

        mvc.perform(get("/api/v1/audit").param("entityType", "product").param("entityId", String.valueOf(product))
                        .param("action", "STOCK_MOVEMENT").cookie(admin))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].summary").value(org.hamcrest.Matchers.startsWith("OUT · -4 u")));

        mvc.perform(get("/api/v1/reports/activity").param("tz", "Marte/Olimpo").cookie(admin)).andExpect(status().isBadRequest());
    }

    private JsonNode read(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
