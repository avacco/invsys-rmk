package com.invsys.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.invsys.IntegrationTest;
import com.invsys.inventory.app.InventoryDtos.MovementKind;
import com.invsys.inventory.app.InventoryDtos.MovementRequest;
import com.invsys.inventory.app.InventoryService;
import com.invsys.shared.web.ConflictException;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class InventoryIntegrationTest extends IntegrationTest {

    @Autowired
    ObjectMapper json;

    @Autowired
    InventoryService inventoryService;

    Cookie[] admin;
    long mainWarehouse;
    long unitU;
    long unitKg;

    @BeforeEach
    void setUp() throws Exception {
        admin = loginAsAdmin();
        for (JsonNode w : read(mvc.perform(get("/api/v1/warehouses").cookie(admin)))) {
            if (w.get("code").asText().equals("MAIN")) mainWarehouse = w.get("id").asLong();
        }
        for (JsonNode u : read(mvc.perform(get("/api/v1/units").cookie(admin)))) {
            if (u.get("code").asText().equals("u")) unitU = u.get("id").asLong();
            if (u.get("code").asText().equals("kg")) unitKg = u.get("id").asLong();
        }
    }

    @Test
    void entryAndExitUpdateBalance() throws Exception {
        long product = createProduct(unitU, 0);
        movement("IN", product, mainWarehouse, null, "10", null).andExpect(status().isCreated())
                .andExpect(jsonPath("$[0].type").value("IN"))
                .andExpect(jsonPath("$[0].balanceAfter").value(10))
                .andExpect(jsonPath("$[0].createdBy").value("admin"));
        movement("OUT", product, mainWarehouse, null, "3", "Venta").andExpect(status().isCreated())
                .andExpect(jsonPath("$[0].quantity").value(-3))
                .andExpect(jsonPath("$[0].balanceAfter").value(7));

        assertThat(totalStock(product)).isEqualByComparingTo("7");
    }

    @Test
    void exitCannotLeaveNegativeStock() throws Exception {
        long product = createProduct(unitU, 0);
        movement("IN", product, mainWarehouse, null, "2", null).andExpect(status().isCreated());
        movement("OUT", product, mainWarehouse, null, "5", null).andExpect(status().isConflict());
        assertThat(totalStock(product)).isEqualByComparingTo("2");
    }

    @Test
    void quantityMustRespectUnitDecimals() throws Exception {
        long units = createProduct(unitU, 0);
        movement("IN", units, mainWarehouse, null, "1.5", null).andExpect(status().isBadRequest());
        long kilos = createProduct(unitKg, 0);
        movement("IN", kilos, mainWarehouse, null, "1.25", null).andExpect(status().isCreated());
    }

    @Test
    void transferMovesStockBetweenWarehouses() throws Exception {
        long product = createProduct(unitU, 0);
        long second = createWarehouse();
        movement("IN", product, mainWarehouse, null, "8", null).andExpect(status().isCreated());

        movement("TRANSFER", product, mainWarehouse, second, "5", null).andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].type").value("TRANSFER_OUT"))
                .andExpect(jsonPath("$[1].type").value("TRANSFER_IN"))
                .andExpect(jsonPath("$[1].balanceAfter").value(5));

        JsonNode stock = stockOf(product);
        assertThat(stock.get("total").decimalValue()).isEqualByComparingTo("8");
        assertThat(stock.get("levels")).hasSize(2);

        movement("TRANSFER", product, mainWarehouse, mainWarehouse, "1", null).andExpect(status().isBadRequest());
    }

    @Test
    void adjustmentSetsCountedBalance() throws Exception {
        long product = createProduct(unitU, 0);
        movement("IN", product, mainWarehouse, null, "10", null).andExpect(status().isCreated());
        movement("ADJUSTMENT", product, mainWarehouse, null, "7", null).andExpect(status().isBadRequest());
        movement("ADJUSTMENT", product, mainWarehouse, null, "7", "Conteo físico").andExpect(status().isCreated())
                .andExpect(jsonPath("$[0].quantity").value(-3))
                .andExpect(jsonPath("$[0].balanceAfter").value(7));
    }

    @Test
    void lowStockFilterAndSummary() throws Exception {
        String sku = "LOW-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        long product = createProduct(unitU, 10, sku);
        movement("IN", product, mainWarehouse, null, "3", null).andExpect(status().isCreated());

        mvc.perform(get("/api/v1/inventory/stock").param("q", sku).param("lowOnly", "true").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].low").value(true));

        movement("IN", product, mainWarehouse, null, "20", null).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/inventory/stock").param("q", sku).param("lowOnly", "true").cookie(admin))
                .andExpect(jsonPath("$.totalElements").value(0));

        mvc.perform(get("/api/v1/inventory/summary").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inventoryValue").isNumber())
                .andExpect(jsonPath("$.movementsLast7Days").isNumber());
    }

    @Test
    void movementsHistoryIsFilterable() throws Exception {
        long product = createProduct(unitU, 0);
        movement("IN", product, mainWarehouse, null, "4", null).andExpect(status().isCreated());
        movement("OUT", product, mainWarehouse, null, "1", null).andExpect(status().isCreated());

        mvc.perform(get("/api/v1/inventory/movements").param("productId", String.valueOf(product)).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].type").value("OUT"));
        mvc.perform(get("/api/v1/inventory/movements").param("productId", String.valueOf(product))
                        .param("type", "IN").cookie(admin))
                .andExpect(jsonPath("$.content[*].type", hasItem("IN")))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void productAndWarehouseWithHistoryCannotBeDeleted() throws Exception {
        long product = createProduct(unitU, 0);
        long warehouse = createWarehouse();
        movement("IN", product, warehouse, null, "1", null).andExpect(status().isCreated());

        mvc.perform(delete("/api/v1/products/{id}", product).cookie(admin)).andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/warehouses/{id}", warehouse).cookie(admin)).andExpect(status().isConflict());

        long unused = createWarehouse();
        mvc.perform(delete("/api/v1/warehouses/{id}", unused).cookie(admin)).andExpect(status().isNoContent());
    }

    @Test
    void viewerCannotRegisterMovements() throws Exception {
        String username = "inv" + UUID.randomUUID().toString().substring(0, 8);
        long viewerRole = 0;
        for (JsonNode role : read(mvc.perform(get("/api/v1/roles").cookie(admin)))) {
            if (role.get("name").asText().equals("VIEWER")) viewerRole = role.get("id").asLong();
        }
        mvc.perform(post("/api/v1/users").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","displayName":"Lector","password":"lector1234","roleId":%d}
                                """.formatted(username, viewerRole)))
                .andExpect(status().isCreated());
        Cookie[] viewer = login(username, "lector1234");
        long product = createProduct(unitU, 0);

        mvc.perform(get("/api/v1/inventory/stock").cookie(viewer)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/inventory/movements").cookie(viewer).contentType(MediaType.APPLICATION_JSON)
                        .content(movementJson("IN", product, mainWarehouse, null, "1", null)))
                .andExpect(status().isForbidden());
    }

    /** Diez salidas simultáneas de 1 unidad sobre un saldo de 5: exactamente 5 deben pasar. */
    @Test
    void concurrentExitsNeverOversell() throws Exception {
        long product = createProduct(unitU, 0);
        movement("IN", product, mainWarehouse, null, "5", null).andExpect(status().isCreated());

        int attempts = 10;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        for (int i = 0; i < attempts; i++) {
            results.add(pool.submit(() -> {
                start.await();
                try {
                    inventoryService.register(new MovementRequest(MovementKind.OUT, product, mainWarehouse, null,
                            BigDecimal.ONE, "Concurrente", null));
                    return true;
                } catch (ConflictException e) {
                    return false;
                }
            }));
        }
        start.countDown();
        int succeeded = 0;
        for (Future<Boolean> result : results) {
            if (result.get()) succeeded++;
        }
        pool.shutdown();

        assertThat(succeeded).isEqualTo(5);
        assertThat(totalStock(product)).isEqualByComparingTo("0");
    }

    // --- helpers ---

    private ResultActions movement(String type, long product, long warehouse, Long target, String qty, String reason) throws Exception {
        return mvc.perform(post("/api/v1/inventory/movements").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                .content(movementJson(type, product, warehouse, target, qty, reason)));
    }

    private static String movementJson(String type, long product, long warehouse, Long target, String qty, String reason) {
        return """
                {"type":"%s","productId":%d,"warehouseId":%d,"targetWarehouseId":%s,"quantity":%s,"reason":%s}
                """.formatted(type, product, warehouse, target, qty, reason == null ? "null" : "\"" + reason + "\"");
    }

    private long createProduct(long unitId, int minStock) throws Exception {
        return createProduct(unitId, minStock, "INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    }

    private long createProduct(long unitId, int minStock, String sku) throws Exception {
        return read(mvc.perform(post("/api/v1/products").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sku":"%s","name":"Producto %s","unitId":%d,"costPrice":2,"salePrice":3,"minStock":%d,"status":"ACTIVE"}
                                """.formatted(sku, sku, unitId, minStock)))
                .andExpect(status().isCreated())).get("id").asLong();
    }

    private long createWarehouse() throws Exception {
        String code = "W" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return read(mvc.perform(post("/api/v1/warehouses").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"%s\",\"name\":\"Depósito %s\"}".formatted(code, code)))
                .andExpect(status().isCreated())).get("id").asLong();
    }

    /** Fila de stock del producto (se busca por SKU, que es único). */
    private JsonNode stockOf(long productId) throws Exception {
        String sku = read(mvc.perform(get("/api/v1/products/{id}", productId).cookie(admin))).get("sku").asText();
        JsonNode content = read(mvc.perform(get("/api/v1/inventory/stock").param("q", sku).cookie(admin))).get("content");
        assertThat(content).hasSize(1);
        return content.get(0);
    }

    private BigDecimal totalStock(long productId) throws Exception {
        return stockOf(productId).get("total").decimalValue();
    }

    private JsonNode read(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
