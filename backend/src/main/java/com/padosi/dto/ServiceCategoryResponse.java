package com.padosi.dto;

import com.padosi.entity.ServiceCategory;

public record ServiceCategoryResponse(Long id, String name, String icon) {
    public static ServiceCategoryResponse from(ServiceCategory category) {
        return new ServiceCategoryResponse(category.getId(), category.getName(), category.getIcon());
    }
}
