package com.invsys.catalog.web;

import com.invsys.catalog.app.CatalogDtos.ProductFilter;
import com.invsys.catalog.app.CatalogDtos.ProductRequest;
import com.invsys.catalog.app.CatalogDtos.ProductResponse;
import com.invsys.catalog.app.ProductService;
import com.invsys.catalog.domain.ProductStatus;
import com.invsys.shared.web.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('catalog:read')")
    public PageResponse<ProductResponse> list(@RequestParam(required = false) String q,
                                              @RequestParam(required = false) Long categoryId,
                                              @RequestParam(required = false) Long supplierId,
                                              @RequestParam(required = false) ProductStatus status,
                                              @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return PageResponse.of(productService.list(new ProductFilter(q, categoryId, supplierId, status), pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('catalog:read')")
    public ProductResponse get(@PathVariable Long id) {
        return productService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('catalog:write')")
    public ProductResponse create(@Valid @RequestBody ProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('catalog:write')")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('catalog:write')")
    public void delete(@PathVariable Long id) {
        productService.delete(id);
    }

    @PostMapping(path = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('catalog:write')")
    public ProductResponse uploadImage(@PathVariable Long id, @RequestPart("file") MultipartFile file) {
        return productService.replaceImage(id, file);
    }

    @DeleteMapping("/{id}/image")
    @PreAuthorize("hasAuthority('catalog:write')")
    public ProductResponse deleteImage(@PathVariable Long id) {
        return productService.removeImage(id);
    }
}
