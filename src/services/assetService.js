import api from "../api/axios";
import { apiFetchList } from "../utils/apiFetch";

// Transform API response to Frontend format
export const toFrontend = (data) => {
    if (!data) return null;
    return {
        id: data.id,
        productName: data.product_name ?? "",
        assetNumber: data.asset_number ?? "",
        productCount: data.product_count !== null && data.product_count !== undefined ? data.product_count : "",
        productValue: data.product_value !== null && data.product_value !== undefined ? data.product_value : "",
        // Also keep snake_case aliases for direct table mapping if desired
        product_name: data.product_name ?? "",
        asset_number: data.asset_number ?? "",
        product_count: data.product_count !== null && data.product_count !== undefined ? data.product_count : "",
        product_value: data.product_value !== null && data.product_value !== undefined ? data.product_value : "",
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
};

// Transform Frontend payload to API format
export const toBackend = (data) => {
    const productName = data.productName !== undefined ? data.productName : data.product_name;
    const assetNumber = data.assetNumber !== undefined ? data.assetNumber : data.asset_number;
    const productCount = data.productCount !== undefined ? data.productCount : data.product_count;
    const productValue = data.productValue !== undefined ? data.productValue : data.product_value;

    return {
        product_name: productName !== "" && productName != null ? String(productName).trim() : null,
        asset_number: assetNumber !== "" && assetNumber != null ? String(assetNumber).trim() : null,
        product_count: productCount !== "" && productCount != null ? parseInt(productCount, 10) : null,
        product_value: productValue !== "" && productValue != null ? parseFloat(productValue) : null,
    };
};

/**
 * Fetch list of assets with optional search filter.
 * Returns { data: [], meta: null|{} } or plain array
 */
export const getAssets = async (filters = {}) => {
    const params = {};
    if (filters.search && String(filters.search).trim() !== "") {
        params.search = String(filters.search).trim();
    }
    if (filters.page) {
        params.page = filters.page;
    }
    if (filters.perPage) {
        params.per_page = filters.perPage;
    }

    const result = await apiFetchList("/assets", { params, useCache: false });
    const arr = Array.isArray(result.data) ? result.data : [];
    const data = arr.map(toFrontend);
    return { data, meta: result.meta };
};

/**
 * Fetch a single asset by ID.
 */
export const getAsset = async (id) => {
    const response = await api.get(`/assets/${id}`);
    return toFrontend(response.data);
};

/**
 * Create a new asset record.
 */
export const createAsset = async (assetData) => {
    const response = await api.post("/assets", toBackend(assetData));
    return toFrontend(response.data);
};

/**
 * Update an existing asset record.
 */
export const updateAsset = async (id, assetData) => {
    const response = await api.put(`/assets/${id}`, toBackend(assetData));
    return toFrontend(response.data);
};

/**
 * Delete an asset record.
 */
export const deleteAsset = async (id) => {
    const response = await api.delete(`/assets/${id}`);
    return response.data;
};
